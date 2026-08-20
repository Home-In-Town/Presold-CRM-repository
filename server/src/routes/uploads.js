import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { uploadToCloudinary } from '../config/cloudinaryUpload.js';

const router = Router();

// ─── Helper: detect file type from mimetype ─────────────────────────────────
const getFileType = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'IMAGE';
  if (mimetype.startsWith('video/')) return 'VIDEO';
  if (mimetype.startsWith('audio/')) return 'VOICE';
  return 'DOCUMENT';
};

const getCloudinaryResourceType = (type) => {
  if (type === 'VIDEO' || type === 'VOICE') return 'video';
  if (type === 'IMAGE') return 'image';
  return 'auto';
};

// ─── Upload file for a lead ──────────────────────────────────────────────────
router.post('/lead/:leadId', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const type = getFileType(req.file.mimetype);
    const resourceType = getCloudinaryResourceType(type);

    const { url, publicId } = await uploadToCloudinary(req.file.buffer, {
      folder: 'presold-crm/leads',
      resource_type: resourceType
    });

    const file = await prisma.leadFile.create({
      data: {
        name: publicId,
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
    const resourceType = getCloudinaryResourceType(type);
    const cloudFolder = folder
      ? `presold-crm/library/${folder}`
      : 'presold-crm/library';

    let parsedTags = [];
    try { parsedTags = tags ? JSON.parse(tags) : []; } catch { parsedTags = []; }

    const { url, publicId } = await uploadToCloudinary(req.file.buffer, {
      folder: cloudFolder,
      resource_type: resourceType
    });

    const asset = await prisma.asset.create({
      data: {
        name: publicId,
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
    console.error('Cover update error:', err);
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
    await prisma.asset.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    res.json({ message: 'Asset deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

// ─── Download asset — redirect to Cloudinary URL ─────────────────────────────
// Since files are now on Cloudinary, we redirect to the CDN URL directly.
// This also supports the legacy disk-based URLs gracefully.
router.get('/assets/:id/download', authenticate, async (req, res) => {
  try {
    const asset = await prisma.asset.findUnique({ where: { id: req.params.id } });
    if (!asset || asset.deletedAt) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    if (!asset.url) {
      return res.status(404).json({ error: 'No file URL found for this asset' });
    }

    // If the URL is a Cloudinary URL, redirect to it with fl_attachment for forced download
    if (asset.url.startsWith('https://res.cloudinary.com')) {
      // Insert fl_attachment into the Cloudinary URL to force download
      const downloadUrl = asset.url.replace('/upload/', `/upload/fl_attachment:${encodeURIComponent(asset.originalName || 'file')}/`);
      return res.redirect(downloadUrl);
    }

    // Fallback: redirect to the URL directly
    return res.redirect(asset.url);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: err.message || 'Failed to download asset' });
  }
});

export default router;
