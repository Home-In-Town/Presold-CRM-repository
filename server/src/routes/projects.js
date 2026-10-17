import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { trackingDb } from '../config/database.js';
import multer from 'multer';
import { uploadToTrackingGridFS, deleteFromTrackingGridFS } from '../config/gridfs.js';

const router = express.Router();

// Multer configuration for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB per file
  }
});

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  next();
};

// GET /api/projects - Get all projects with filters
router.get('/', authenticate, async (req, res) => {
  try {
    const { category, projectStatus, city, search } = req.query;
    
    const where = { deletedAt: { isSet: false } };
    
    if (category) where.category = category;
    if (projectStatus) where.projectStatus = projectStatus;
    if (city) where.city = city;
    if (search) {
      where.OR = [
        { projectName: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const projects = await trackingDb.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ projects });
  } catch (err) {
    console.error('Failed to fetch projects:', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/projects/stats - Get project statistics (Admin only)
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const totalProjects = await trackingDb.project.count({
      where: { deletedAt: { isSet: false } }
    });

    const byStatus = await trackingDb.project.groupBy({
      by: ['projectStatus'],
      where: { deletedAt: { isSet: false } },
      _count: true,
    });

    const byCategory = await trackingDb.project.groupBy({
      by: ['category'],
      where: { deletedAt: { isSet: false } },
      _count: true,
    });

    res.json({
      totalProjects,
      byStatus,
      byCategory,
    });
  } catch (err) {
    console.error('Failed to fetch project stats:', err);
    res.status(500).json({ error: 'Failed to fetch project statistics' });
  }
});

// GET /api/projects/:id - Get single project
router.get('/:id', authenticate, async (req, res) => {
  try {
    const project = await trackingDb.project.findUnique({
      where: { id: req.params.id },
    });

    if (!project || project.deletedAt) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (err) {
    console.error('Failed to fetch project:', err);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// POST /api/projects - Create new project
router.post('/', authenticate, upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'galleryImages', maxCount: 20 },
  { name: 'videos', maxCount: 5 },
  { name: 'layoutImage', maxCount: 1 },
  { name: 'brochure', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      projectName,
      projectType,
      category,
      propertyType,
      city,
      locationArea,
      locationAddress,
      latitude,
      longitude,
      googleMapLink,
      reraApproved,
      reraNumber,
      projectStatus,
      startingPrice,
      pricePerSqFt,
      totalPriceRange,
      paymentPlan,
      bankLoanAvailable,
      bhkOptions,
      carpetAreaRange,
      floorRange,
      facingOptions,
      gatedCommunity,
      amenities
    } = req.body;

    // Validate required fields
    if (!projectName || !category || !propertyType || !city || !locationArea || !projectStatus) {
      return res.status(400).json({ 
        error: 'Required fields: projectName, category, propertyType, city, locationArea, projectStatus' 
      });
    }

    // Validate cover image is uploaded
    if (!req.files?.coverImage || req.files.coverImage.length === 0) {
      return res.status(400).json({ error: 'Cover image is required' });
    }

    let coverImageUrl = null, coverImageFileId = null;
    let layoutImageUrl = null, layoutImageFileId = null;
    let brochureUrl = null, brochureFileId = null;
    const galleryImageUrls = [];
    const galleryImageFileIds = [];
    const videoUrls = [];
    const videoFileIds = [];

    // Upload cover image
    if (req.files.coverImage && req.files.coverImage[0]) {
      const file = req.files.coverImage[0];
      const result = await uploadToTrackingGridFS(file.buffer, file.originalname, file.mimetype);
      coverImageFileId = result.fileId;
      coverImageUrl = result.url;
    }

    // Upload gallery images
    if (req.files.galleryImages) {
      for (const file of req.files.galleryImages) {
        const result = await uploadToTrackingGridFS(file.buffer, file.originalname, file.mimetype);
        galleryImageFileIds.push(result.fileId);
        galleryImageUrls.push(result.url);
      }
    }

    // Upload videos
    if (req.files.videos) {
      for (const file of req.files.videos) {
        const result = await uploadToTrackingGridFS(file.buffer, file.originalname, file.mimetype);
        videoFileIds.push(result.fileId);
        videoUrls.push(result.url);
      }
    }

    // Upload layout image
    if (req.files.layoutImage && req.files.layoutImage[0]) {
      const file = req.files.layoutImage[0];
      const result = await uploadToTrackingGridFS(file.buffer, file.originalname, file.mimetype);
      layoutImageFileId = result.fileId;
      layoutImageUrl = result.url;
    }

    // Upload brochure
    if (req.files.brochure && req.files.brochure[0]) {
      const file = req.files.brochure[0];
      const result = await uploadToTrackingGridFS(file.buffer, file.originalname, file.mimetype);
      brochureFileId = result.fileId;
      brochureUrl = result.url;
    }

    // Parse JSON fields
    const configurationsArray = bhkOptions ? JSON.parse(bhkOptions) : [];
    const facingArray = facingOptions ? JSON.parse(facingOptions) : [];
    const amenitiesArray = amenities ? JSON.parse(amenities) : [];

    // Create project
    const project = await trackingDb.project.create({
      data: {
        projectName,
        projectType: projectType || 'RESIDENTIAL',
        category,
        propertyType,
        city,
        locationArea,
        locationAddress: locationAddress || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        googleMapLink: googleMapLink || null,
        reraApproved: reraApproved === 'true' || reraApproved === true,
        reraNumber: reraNumber || null,
        projectStatus,
        startingPrice: startingPrice || null,
        pricePerSqFt: pricePerSqFt || null,
        totalPriceRange: totalPriceRange || null,
        paymentPlan: paymentPlan || null,
        bankLoanAvailable: bankLoanAvailable === 'true' || bankLoanAvailable === true,
        configurations: JSON.stringify(configurationsArray),
        carpetAreaRange: carpetAreaRange || null,
        floorRange: floorRange || null,
        facingOptions: JSON.stringify(facingArray),
        gatedCommunity: gatedCommunity === 'true' || gatedCommunity === true,
        amenities: JSON.stringify(amenitiesArray),
        coverImage: coverImageFileId,
        coverImageUrl,
        galleryImages: JSON.stringify(galleryImageFileIds),
        galleryImageUrls: JSON.stringify(galleryImageUrls),
        layoutImage: layoutImageFileId || null,
        layoutImageUrl: layoutImageUrl || null,
        brochure: brochureFileId || null,
        brochureUrl: brochureUrl || null,
        uploadedById: req.user.id
      }
    });

    res.status(201).json({
      success: true,
      project
    });
  } catch (err) {
    console.error('Failed to create project:', err);
    res.status(500).json({ error: 'Failed to create project', details: err.message });
  }
});

// PUT /api/projects/:id - Update project (Admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      projectName,
      category,
      city,
      projectStatus,
      startingPrice,
      currentValue,
      soldValue,
      imageUrls,
      description,
      amenities,
      configuration,
      address,
      latitude,
      longitude,
    } = req.body;

    const project = await trackingDb.project.update({
      where: { id: req.params.id },
      data: {
        projectName,
        category,
        city,
        projectStatus,
        startingPrice: startingPrice ? parseFloat(startingPrice) : null,
        currentValue: currentValue ? parseFloat(currentValue) : null,
        soldValue: soldValue ? parseFloat(soldValue) : null,
        imageUrls,
        description,
        amenities,
        configuration,
        address,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      },
    });

    res.json(project);
  } catch (err) {
    console.error('Failed to update project:', err);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /api/projects/:id - Soft delete project (Admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await trackingDb.project.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });

    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    console.error('Failed to delete project:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
