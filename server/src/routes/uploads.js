import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { uploadToGridFS, streamFromGridFS, deleteFromGridFS } from '../config/gridfs.js';

const router = Router();

// ─── Helper: detect file type from mimetype ─────────────────────────────────
const getFileType = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'IMAGE';
  if (mimetype.startsWith('video/')) return 'VIDEO';
  if (mimetype.startsWith('audio/')) return 'VOICE';
  return 'DOCUMENT';
};

// ─── Upload file for a lead ──────────────────────────────────────────────────
router.post('/lead/:leadId', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const type = getFileType(req.file.mimetype);
    const { url, fileId } = await uploadToGridFS(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    const file = await prisma.leadFile.create({
      data: {
        name: fileId,
        originalName: req.file.originalname,
        url,
        type,
        size: req.file.size,
        mimeType: req.file.mimetype,
        leadId: req.params.leadId
      }
    });

    await prisma.leadActivity.create({
      data: {
        type: 'FILE_UPLOADED',
        title: `Uploaded: ${req.file.originalname}`,
        leadId: req.params.leadId,
        userId: req.user.id
      }
    });

    res.status(201).json(file);
  } catch (err) {
    console.error('Lead upload error:', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// ─── Upload asset to library ─────────────────────────────────────────────────
router.post('/assets', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { folder, tags, coverPhoto, logoUrl, logoPosition } = req.body;
    const type = getFileType(req.file.mimetype);

    let parsedTags = [];
    try { parsedTags = tags ? JSON.parse(tags) : []; } catch { parsedTags = []; }

    const { url, fileId } = await uploadToGridFS(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    const asset = await prisma.asset.create({
      data: {
        name: fileId,
        originalName: req.file.originalname,
        url,
        type,
        size: req.file.size,
        mimeType: req.file.mimetype,
        folder: folder || 'general',
        tags: JSON.stringify(parsedTags),
        coverPhoto: Boolean(coverPhoto),
        logoUrl: logoUrl || null,
        logoPosition: logoPosition || 'bottom-right',
        uploadedById: req.user.id
      }
    });

    if (Boolean(coverPhoto)) {
      await prisma.asset.updateMany({ where: { coverPhoto: true }, data: { coverPhoto: false } });
      await prisma.asset.update({ where: { id: asset.id }, data: { coverPhoto: true } });
    }

    res.status(201).json(asset);
  } catch (err) {
    console.error('Asset upload error:', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// ─── Set cover photo ─────────────────────────────────────────────────────────
router.put('/assets/:id/cover', authenticate, async (req, res) => {
  try {
    await prisma.asset.updateMany({ where: { coverPhoto: true }, data: { coverPhoto: false } });
    const asset = await prisma.asset.update({
      where: { id: req.params.id },
      data: { coverPhoto: true }
    });
    res.json(asset);
  } catch (err) {
    res.status(500).json({ error: 'Unable to update cover photo' });
  }
});

// ─── Get assets ──────────────────────────────────────────────────────────────
router.get('/assets', authenticate, async (req, res) => {
  try {
    const { folder, type, search } = req.query;
    const where = { deletedAt: { isSet: false } };
    if (folder) where.folder = folder;
    if (type) where.type = type;
    if (search) where.originalName = { contains: search, mode: 'insensitive' };

    const assets = await prisma.asset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { uploadedBy: { select: { name: true, avatar: true } } }
    });
    res.json(assets);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// ─── Delete asset ────────────────────────────────────────────────────────────
router.delete('/assets/:id', authenticate, async (req, res) => {
  try {
    const asset = await prisma.asset.findUnique({ where: { id: req.params.id } });
    if (asset?.name) await deleteFromGridFS(asset.name);
    await prisma.asset.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    res.json({ message: 'Asset deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

// ─── Download asset (redirect to serve endpoint) ─────────────────────────────
router.get('/assets/:id/download', authenticate, async (req, res) => {
  try {
    const asset = await prisma.asset.findUnique({ where: { id: req.params.id } });
    if (!asset || asset.deletedAt) return res.status(404).json({ error: 'Asset not found' });

    // If it's a GridFS URL, stream with download header
    if (asset.url?.startsWith('/api/files/')) {
      const fileId = asset.url.replace('/api/files/', '');
      res.setHeader('Content-Disposition', `attachment; filename="${asset.originalName}"`);
      await streamFromGridFS(fileId, res);
      return;
    }

    // Fallback for legacy URLs
    res.redirect(asset.url);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Failed to download asset' });
  }
});

export default router;
