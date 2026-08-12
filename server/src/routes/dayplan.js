import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// GET /dayplan — get all days (filtered by user's role)
router.get('/', authenticate, async (req, res) => {
  try {
    const userRole = req.user.role;
    // Content team and admin see all; others see only their role + ALL
    const where = (userRole === 'CONTENT_CREATION' || userRole === 'ADMIN')
      ? {}
      : { OR: [{ targetRole: userRole }, { targetRole: 'ALL' }] };

    const contents = await prisma.dayPlanContent.findMany({
      where,
      orderBy: { day: 'asc' }
    });
    res.json(contents);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch day plan' });
  }
});

// POST /dayplan/:day — content team uploads image + text for a specific day and role
router.post('/:day', authenticate, authorize('CONTENT_CREATION', 'ADMIN'), (req, res) => {
  upload.single('file')(req, res, async (err) => {
    try {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ error: err.message || 'File upload error' });
      }

      const day = parseInt(req.params.day);
      if (day < 1 || day > 90) return res.status(400).json({ error: 'Day must be between 1 and 90' });

      const { title, description, whatsappText, targetRole } = req.body;
      const role = targetRole || 'ALL';
      const data = {
        day,
        targetRole: role,
        title: title || `Day ${day}`,
        description: description || null,
        whatsappText: whatsappText || null,
        uploadedById: req.user.id
      };

      if (req.file) {
        data.imageUrl = `/uploads/${req.file.filename}`;
        data.imageName = req.file.originalname;
      }

      const content = await prisma.dayPlanContent.upsert({
        where: { day_targetRole: { day, targetRole: role } },
        update: data,
        create: data
      });

      res.json(content);
    } catch (err) {
      console.error('Day plan upload error:', err);
      res.status(500).json({ error: 'Failed to upload day plan content' });
    }
  });
});

// DELETE /dayplan/:day — content team or admin removes content for a day
router.delete('/:day', authenticate, authorize('CONTENT_CREATION', 'ADMIN'), async (req, res) => {
  try {
    const day = parseInt(req.params.day);
    const { targetRole } = req.query;
    const role = targetRole || 'ALL';
    await prisma.dayPlanContent.delete({ where: { day_targetRole: { day, targetRole: role } } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// GET /dayplan/completions — get user's completed days
router.get('/completions', authenticate, async (req, res) => {
  try {
    const completions = await prisma.dayPlanCompletion.findMany({
      where: { userId: req.user.id },
      select: { day: true, createdAt: true }
    });
    res.json(completions.map(c => c.day));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch completions' });
  }
});

// POST /dayplan/complete/:day — user marks a day as completed
router.post('/complete/:day', authenticate, async (req, res) => {
  try {
    const day = parseInt(req.params.day);
    if (day < 1 || day > 90) return res.status(400).json({ error: 'Invalid day' });

    const existing = await prisma.dayPlanCompletion.findUnique({
      where: { day_userId: { day, userId: req.user.id } }
    });

    if (existing) {
      // Uncomplete
      await prisma.dayPlanCompletion.delete({ where: { id: existing.id } });
      return res.json({ completed: false, day });
    }

    // Complete — check previous day is done (except day 1)
    if (day > 1) {
      const prevDone = await prisma.dayPlanCompletion.findUnique({
        where: { day_userId: { day: day - 1, userId: req.user.id } }
      });
      if (!prevDone) return res.status(403).json({ error: 'Complete the previous day first' });
    }

    await prisma.dayPlanCompletion.create({ data: { day, userId: req.user.id } });
    // Award XP
    await prisma.leaderboard.upsert({
      where: { userId: req.user.id },
      update: { xp: { increment: 5 }, monthlyXp: { increment: 5 } },
      create: { userId: req.user.id, xp: 5, monthlyXp: 5, quarterlyXp: 5, streak: 0 }
    });
    res.json({ completed: true, day, xpGain: 5 });
  } catch (err) {
    console.error('Day completion error:', err);
    res.status(500).json({ error: 'Failed to update completion' });
  }
});

export default router;
