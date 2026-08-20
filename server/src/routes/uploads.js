import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import os from 'os';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';

ffmpeg.setFfmpegPath(ffmpegPath.path);

const router = Router();

const getLocalFileBuffer = async (fileUrl) => {
  if (!fileUrl) return null;
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    const res = await fetch(fileUrl);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }
  const relativePath = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl;
  const localPath = path.resolve(process.cwd(), relativePath);
  try {
    return await fsPromises.readFile(localPath);
  } catch {
    return null;
  }
};

const getBranding = async () => {
  const settings = await prisma.setting.findMany({ where: { key: { in: ['brandLogoUrl', 'brandLogoEnabled', 'brandLogoPosition'] } } });
  const map = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
  return {
    brandLogoUrl: map.brandLogoUrl || '',
    brandLogoEnabled: map.brandLogoEnabled !== 'false',
    brandLogoPosition: map.brandLogoPosition || 'bottom-right'
  };
};

const overlayPositions = {
  'top-left': { left: 20, top: 20 },
  'top-right': { right: 20, top: 20 },
  'bottom-left': { left: 20, bottom: 20 },
  'center': { left: 0, top: 0 },
  'bottom-right': { right: 20, bottom: 20 }
};

const computeOverlayCoords = ({ position, width, height, overlayWidth, overlayHeight, margin = 24 }) => {
  const pos = overlayPositions[position] || overlayPositions['bottom-right'];
  const x = pos.left !== undefined ? pos.left : width - overlayWidth - (pos.right ?? margin);
  const y = pos.top !== undefined ? pos.top : height - overlayHeight - (pos.bottom ?? margin);
  return { x: Math.max(0, x), y: Math.max(0, y) };
};

const writeTempFile = async (buffer, extension = '.png') => {
  const filePath = path.join(os.tmpdir(), `${uuidv4()}${extension}`);
  await fsPromises.writeFile(filePath, buffer);
  return filePath;
};

const processImageWithLogo = async (assetPath, logoBuffer, position) => {
  const image = sharp(assetPath).ensureAlpha();
  const metadata = await image.metadata();
  const maxLogoWidth = Math.min(Math.round((metadata.width || 800) * 0.18), 240);
  const logo = await sharp(logoBuffer).resize({ width: maxLogoWidth, fit: 'inside' }).png().toBuffer();
  const logoMeta = await sharp(logo).metadata();
  const { x, y } = computeOverlayCoords({
    position,
    width: metadata.width || 0,
    height: metadata.height || 0,
    overlayWidth: logoMeta.width || 0,
    overlayHeight: logoMeta.height || 0
  });
  return image.composite([{ input: logo, left: x, top: y }]).toBuffer();
};

const processVideoWithLogo = async (assetPath, logoBuffer, position) => {
  const tempLogoPath = await writeTempFile(logoBuffer, path.extname('.png'));
  const outputPath = path.join(os.tmpdir(), `${uuidv4()}${path.extname(assetPath)}`);
  try {
    const metadata = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(assetPath, (error, metadata) => {
        if (error) return reject(error);
        resolve(metadata);
      });
    });

    const videoStream = metadata.streams.find((stream) => stream.codec_type === 'video');
    const width = videoStream?.width || 640;
    const height = videoStream?.height || 360;
    const maxLogoWidth = Math.min(Math.round(width * 0.18), 240);

    const positions = {
      'top-left': `20:20`,
      'top-right': `main_w-overlay_w-20:20`,
      'bottom-left': `20:main_h-overlay_h-20`,
      'center': `main_w/2-overlay_w/2:main_h/2-overlay_h/2`,
      'bottom-right': `main_w-overlay_w-20:main_h-overlay_h-20`
    };

    const selectedPosition = positions[position] || positions['bottom-right'];
    await new Promise((resolve, reject) => {
      ffmpeg(assetPath)
        .input(tempLogoPath)
        .complexFilter([
          `[1]scale=${maxLogoWidth}:-1[logo]`,
          `[0][logo]overlay=${selectedPosition}:format=auto`
        ])
        .outputOptions('-c:a copy')
        .on('end', resolve)
        .on('error', reject)
        .save(outputPath);
    });

    return outputPath;
  } catch (error) {
    console.error('Video overlay failed, falling back to original video:', error);
    return assetPath;
  } finally {
    await fsPromises.unlink(tempLogoPath).catch(() => {});
  }
};

const uploadsRoot = path.resolve(process.cwd(), 'uploads');
const serverUploadsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');

const getAssetFilePath = (asset) => {
  if (!asset?.url) return null;
  const relativePath = asset.url.startsWith('/') ? asset.url.slice(1) : asset.url;
  const candidate1 = path.resolve(process.cwd(), relativePath);
  const candidate2 = path.resolve(serverUploadsRoot, path.basename(relativePath));
  return fs.existsSync(candidate1) ? candidate1 : candidate2;
};

const getAssetLogoSettings = async (asset) => {
  if (asset.logoUrl) {
    return { logoUrl: asset.logoUrl, logoPosition: asset.logoPosition || 'bottom-right' };
  }
  const branding = await getBranding();
  return branding.brandLogoEnabled && branding.brandLogoUrl
    ? { logoUrl: branding.brandLogoUrl, logoPosition: branding.brandLogoPosition }
    : { logoUrl: null, logoPosition: 'bottom-right' };
};

const getAssetDownloadResponse = async (asset) => {
  const assetPath = getAssetFilePath(asset);
  const { logoUrl, logoPosition } = await getAssetLogoSettings(asset);
  if (!logoUrl) return { source: assetPath, type: 'raw' };

  const logoBuffer = await getLocalFileBuffer(logoUrl);
  if (!logoBuffer) return { source: assetPath, type: 'raw' };

  if (asset.type === 'IMAGE') {
    try {
      const buffer = await processImageWithLogo(assetPath, logoBuffer, logoPosition);
      const tempFilePath = path.join(os.tmpdir(), `${uuidv4()}${path.extname(assetPath)}`);
      await fsPromises.writeFile(tempFilePath, buffer);
      return { source: tempFilePath, type: 'temp' };
    } catch (err) {
      console.error('Image overlay failed, falling back to original image:', err);
      return { source: assetPath, type: 'raw' };
    }
  }

  if (asset.type === 'VIDEO') {
    // Video download is served raw to avoid ffmpeg overlay issues for now.
    return { source: assetPath, type: 'raw' };
  }

  return { source: assetPath, type: 'raw' };
};

// Upload file for a lead
router.post('/lead/:leadId', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    let type = 'OTHER';
    if (req.file.mimetype.startsWith('image/')) type = 'IMAGE';
    else if (req.file.mimetype.startsWith('video/')) type = 'VIDEO';
    else if (req.file.mimetype.startsWith('audio/')) type = 'VOICE';
    else if (req.file.mimetype.includes('pdf') || req.file.mimetype.includes('document')) type = 'DOCUMENT';

    // Upload buffer to Cloudinary
    const { uploadToCloudinary } = await import('../config/cloudinaryUpload.js');
    const resourceType = type === 'VIDEO' ? 'video' : type === 'VOICE' ? 'video' : 'auto';
    const { url, publicId } = await uploadToCloudinary(req.file.buffer, {
      folder: 'presold-crm/leads',
      resource_type: resourceType,
      public_id: `lead_${req.params.leadId}_${Date.now()}`
    });

    const file = await prisma.leadFile.create({
      data: {
        name: publicId,
        originalName: req.file.originalname,
        url,
        type, size: req.file.size, mimeType: req.file.mimetype,
        leadId: req.params.leadId
      }
    });

    await prisma.leadActivity.create({
      data: { type: 'FILE_UPLOADED', title: `Uploaded: ${req.file.originalname}`, leadId: req.params.leadId, userId: req.user.id }
    });

    res.status(201).json(file);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Upload asset to library
router.post('/assets', authenticate, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    try {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File is too large. Maximum size is 100MB.' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ error: 'Unexpected file field.' });
        }
        return res.status(400).json({ error: err.message || 'File upload rejected.' });
      }

      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const { folder, tags, coverPhoto, logoUrl, logoPosition } = req.body;

      let type = 'OTHER';
      if (req.file.mimetype.startsWith('image/')) type = 'IMAGE';
      else if (req.file.mimetype.startsWith('video/')) type = 'VIDEO';
      else if (req.file.mimetype.startsWith('audio/')) type = 'VOICE';
      else type = 'DOCUMENT';

      let parsedTags = [];
      if (tags) {
        try {
          const parsed = JSON.parse(tags);
          parsedTags = Array.isArray(parsed) ? parsed : [];
        } catch {
          parsedTags = [];
        }
      }

      // Upload buffer to Cloudinary
      const { uploadToCloudinary } = await import('../config/cloudinaryUpload.js');
      const resourceType = type === 'VIDEO' ? 'video' : type === 'VOICE' ? 'video' : 'auto';
      const cloudFolder = folder ? `presold-crm/library/${folder}` : 'presold-crm/library';
      const { url: cloudUrl, publicId } = await uploadToCloudinary(req.file.buffer, {
        folder: cloudFolder,
        resource_type: resourceType
      });

      const asset = await prisma.asset.create({
        data: {
          name: publicId,
          originalName: req.file.originalname,
          url: cloudUrl,
          type, size: req.file.size, mimeType: req.file.mimetype,
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
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: error.message || 'Upload failed' });
    }
  });
});

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

// Get assets
router.get('/assets', authenticate, async (req, res) => {
  try {
    const { folder, type, search } = req.query;
    const where = { deletedAt: { isSet: false } };
    if (folder) where.folder = folder;
    if (type) where.type = type;
    if (search) where.originalName = { contains: search, mode: 'insensitive' };

    const assets = await prisma.asset.findMany({
      where, orderBy: { createdAt: 'desc' },
      include: { uploadedBy: { select: { name: true, avatar: true } } }
    });
    res.json(assets);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// Delete asset
router.delete('/assets/:id', authenticate, async (req, res) => {
  try {
    await prisma.asset.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    res.json({ message: 'Asset deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

router.get('/assets/:id/download', authenticate, async (req, res) => {
  try {
    const asset = await prisma.asset.findUnique({ where: { id: req.params.id } });
    if (!asset || asset.deletedAt) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    const filePath = getAssetFilePath(asset);
    if (!filePath) {
      return res.status(404).json({ error: 'Invalid asset file path' });
    }

    const exists = await fsPromises.access(filePath).then(() => true).catch(() => false);
    if (!exists) {
      return res.status(404).json({ error: `File not found at ${filePath}` });
    }

    const downloadResponse = await getAssetDownloadResponse(asset);
    if (!downloadResponse?.source) {
      return res.status(500).json({ error: 'Asset download source could not be prepared' });
    }

    const contentType = asset.mimeType || 'application/octet-stream';
    const filename = asset.originalName.replace(/"/g, '');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.sendFile(downloadResponse.source, (sendErr) => {
      if (sendErr) {
        console.error('Download sendFile error:', sendErr);
        if (!res.headersSent) {
          res.status(500).json({ error: sendErr.message || 'Failed to download asset' });
        }
      }
      if (downloadResponse.type === 'temp') {
        fsPromises.unlink(downloadResponse.source).catch(() => {});
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message || 'Failed to download asset' });
  }
});

export default router;
