import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { trackingDb } from '../config/database.js';

const router = express.Router();

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

// POST /api/projects - Create new project (Admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
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

    const project = await trackingDb.project.create({
      data: {
        projectName,
        category,
        city,
        projectStatus,
        startingPrice: startingPrice ? parseFloat(startingPrice) : null,
        currentValue: currentValue ? parseFloat(currentValue) : null,
        soldValue: soldValue ? parseFloat(soldValue) : null,
        imageUrls: imageUrls || [],
        description,
        amenities,
        configuration,
        address,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        uploadedById: req.user.id,
      },
    });

    res.status(201).json(project);
  } catch (err) {
    console.error('Failed to create project:', err);
    res.status(500).json({ error: 'Failed to create project' });
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
