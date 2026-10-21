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
    
    // Don't filter deletedAt in the database query for MongoDB - filter in code instead
    const where = {};
    
    if (category) where.category = category;
    if (projectStatus) where.projectStatus = projectStatus;
    if (city) where.city = city;
    if (search) {
      where.OR = [
        { projectName: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const allProjects = await trackingDb.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Filter out deleted projects in code (MongoDB null query issue)
    const projects = allProjects.filter(p => !p.deletedAt);

    res.json({ projects });
  } catch (err) {
    console.error('Failed to fetch projects:', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/projects/stats - Get project statistics (Admin only)
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const allProjects = await trackingDb.project.findMany();
    const activeProjects = allProjects.filter(p => !p.deletedAt);
    
    const totalProjects = activeProjects.length;

    const byStatus = {};
    const byCategory = {};
    
    activeProjects.forEach(p => {
      byStatus[p.projectStatus] = (byStatus[p.projectStatus] || 0) + 1;
      byCategory[p.category] = (byCategory[p.category] || 0) + 1;
    });

    res.json({
      totalProjects,
      byStatus: Object.entries(byStatus).map(([projectStatus, count]) => ({ projectStatus, _count: count })),
      byCategory: Object.entries(byCategory).map(([category, count]) => ({ category, _count: count })),
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

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if deleted (MongoDB null query bug workaround)
    if (project.deletedAt) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project }); // Wrap in object to match frontend expectation
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
  console.log('🔵 POST /api/projects endpoint hit');
  console.log('User:', req.user?.id, req.user?.email);
  try {
    console.log('📝 Creating project - received data');
    console.log('Files:', Object.keys(req.files || {}));
    console.log('Body keys:', Object.keys(req.body));
    
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
      console.log('❌ Validation failed - missing required fields');
      console.log({ projectName, category, propertyType, city, locationArea, projectStatus });
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
      console.log('📤 Uploading cover image...');
      const file = req.files.coverImage[0];
      const result = await uploadToTrackingGridFS(file.buffer, file.originalname, file.mimetype);
      coverImageFileId = result.fileId;
      coverImageUrl = result.url;
      console.log('✅ Cover image uploaded:', coverImageUrl);
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
    console.log('💾 Creating project in database...');
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

    console.log('✅ Project created successfully:', project.id);
    res.status(201).json({
      success: true,
      project
    });
  } catch (err) {
    console.error('❌ Failed to create project:', err);
    console.error('Error stack:', err.stack);
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
