import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

const parseJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

// Get all modules with scripts
router.get('/modules', authenticate, async (req, res) => {
  try {
    const { category, search } = req.query;
    const where = { deletedAt: { isSet: false } };
    if (category) where.category = category;

    const modules = await prisma.playbookModule.findMany({
      where,
      include: {
        scripts: {
          where: {
            deletedAt: { isSet: false },
            ...(search ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { copyScript: { contains: search, mode: 'insensitive' } }] } : {})
          },
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { order: 'asc' }
    });

    const completions = await prisma.playbookCompletion.findMany({
      where: { userId: req.user.id },
      select: { scriptId: true }
    });
    const completedScripts = new Set(completions.map(comp => comp.scriptId));

    const normalized = modules.map(module => ({
      ...module,
      scripts: module.scripts.map(script => ({
        ...script,
        checklist: parseJsonArray(script.checklist),
        mistakes: parseJsonArray(script.mistakes),
        kpis: parseJsonArray(script.kpis),
        completed: completedScripts.has(script.id)
      }))
    }));

    res.json(normalized);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch playbook' });
  }
});

// Get single script
router.get('/scripts/:id', authenticate, async (req, res) => {
  try {
    const script = await prisma.playbookScript.findUnique({
      where: { id: req.params.id },
      include: { module: true }
    });
    if (!script) return res.status(404).json({ error: 'Script not found' });
    res.json(script);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch script' });
  }
});

// Create module (admin only)
router.post('/modules', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { title, category, icon, order, color } = req.body;
    const module = await prisma.playbookModule.create({ data: { title, category, icon, order: order || 0, color } });
    res.status(201).json(module);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create module' });
  }
});

// Create script (admin only)
router.post('/scripts', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const script = await prisma.playbookScript.create({ data: req.body });
    res.status(201).json(script);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create script' });
  }
});

// Update script (admin only)
router.put('/scripts/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const script = await prisma.playbookScript.update({ where: { id: req.params.id }, data: req.body });
    res.json(script);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update script' });
  }
});

// Bookmark
router.post('/bookmark/:scriptId', authenticate, async (req, res) => {
  try {
    const { scriptId } = req.params;
    const existing = await prisma.bookmark.findUnique({
      where: { userId_scriptId: { userId: req.user.id, scriptId } }
    });
    if (existing) {
      await prisma.bookmark.delete({ where: { id: existing.id } });
      res.json({ bookmarked: false });
    } else {
      await prisma.bookmark.create({ data: { userId: req.user.id, scriptId } });
      res.json({ bookmarked: true });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle bookmark' });
  }
});

// Toggle completion for a script (per user)
router.post('/complete/:scriptId', authenticate, async (req, res) => {
  try {
    const { scriptId } = req.params;
    const existing = await prisma.playbookCompletion.findUnique({
      where: { userId_scriptId: { userId: req.user.id, scriptId } }
    });
    if (existing) {
      await prisma.playbookCompletion.delete({ where: { id: existing.id } });
      res.json({ completed: false });
    } else {
      await prisma.playbookCompletion.create({
        data: { userId: req.user.id, scriptId, completedAt: new Date() }
      });
      // Award XP for completing a playbook item
      await prisma.leaderboard.upsert({
        where: { userId: req.user.id },
        update: { xp: { increment: 2 }, monthlyXp: { increment: 2 }, quarterlyXp: { increment: 2 } },
        create: { userId: req.user.id, xp: 2, monthlyXp: 2, quarterlyXp: 2, streak: 0 }
      });
      res.json({ completed: true, xpGain: 2 });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle completion' });
  }
});

// Get all user completions (just script IDs)
router.get('/completions', authenticate, async (req, res) => {
  try {
    const completions = await prisma.playbookCompletion.findMany({
      where: { userId: req.user.id },
      select: { scriptId: true, completedAt: true }
    });
    res.json(completions);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch completions' });
  }
});

// Get user bookmarks
router.get('/bookmarks', authenticate, async (req, res) => {
  try {
    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: req.user.id },
      include: { script: { include: { module: true } } }
    });
    res.json(bookmarks);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

// ── Content Creator Playbook chapter progress ─────────────────────────────────

router.get('/content-progress', authenticate, authorize('CONTENT_CREATION', 'ADMIN'), async (req, res) => {
  try {
    const completions = await prisma.playbookCompletion.findMany({
      where: { userId: req.user.id, scriptId: { startsWith: 'content-ch-' } },
      select: { scriptId: true, completedAt: true }
    });
    res.json(completions.map(c => ({ chapterId: c.scriptId, completedAt: c.completedAt })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch content progress' });
  }
});

router.post('/content-complete/:chapterId', authenticate, authorize('CONTENT_CREATION', 'ADMIN'), async (req, res) => {
  try {
    const scriptId = `content-ch-${req.params.chapterId}`;
    const existing = await prisma.playbookCompletion.findUnique({
      where: { userId_scriptId: { userId: req.user.id, scriptId } }
    });
    if (existing) {
      await prisma.playbookCompletion.delete({ where: { id: existing.id } });
      await prisma.leaderboard.upsert({
        where: { userId: req.user.id },
        update: { xp: { decrement: 15 }, monthlyXp: { decrement: 15 }, quarterlyXp: { decrement: 15 } },
        create: { userId: req.user.id, xp: 0, monthlyXp: 0, quarterlyXp: 0, streak: 0 }
      });
      return res.json({ completed: false, xpChange: -15 });
    }
    await prisma.playbookCompletion.create({ data: { userId: req.user.id, scriptId, completedAt: new Date() } });
    await prisma.leaderboard.upsert({
      where: { userId: req.user.id },
      update: { xp: { increment: 15 }, monthlyXp: { increment: 15 }, quarterlyXp: { increment: 15 } },
      create: { userId: req.user.id, xp: 15, monthlyXp: 15, quarterlyXp: 15, streak: 0 }
    });
    res.json({ completed: true, xpChange: 15 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update content progress' });
  }
});

// ── DMA White Label Playbook chapter progress ─────────────────────────────────

// GET /playbook/dma-progress
router.get('/dma-progress', authenticate, authorize('DMA_WHITE_LABEL', 'ADMIN'), async (req, res) => {
  try {
    const completions = await prisma.playbookCompletion.findMany({
      where: { userId: req.user.id, scriptId: { startsWith: 'dma-ch-' } },
      select: { scriptId: true, completedAt: true }
    });
    res.json(completions.map(c => ({ chapterId: c.scriptId, completedAt: c.completedAt })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch DMA progress' });
  }
});

// POST /playbook/dma-complete/:chapterId
router.post('/dma-complete/:chapterId', authenticate, authorize('DMA_WHITE_LABEL', 'ADMIN'), async (req, res) => {
  try {
    const scriptId = `dma-ch-${req.params.chapterId}`;
    const existing = await prisma.playbookCompletion.findUnique({
      where: { userId_scriptId: { userId: req.user.id, scriptId } }
    });
    if (existing) {
      await prisma.playbookCompletion.delete({ where: { id: existing.id } });
      await prisma.leaderboard.upsert({
        where: { userId: req.user.id },
        update: { xp: { decrement: 15 }, monthlyXp: { decrement: 15 }, quarterlyXp: { decrement: 15 } },
        create: { userId: req.user.id, xp: 0, monthlyXp: 0, quarterlyXp: 0, streak: 0 }
      });
      return res.json({ completed: false, xpChange: -15 });
    }
    await prisma.playbookCompletion.create({ data: { userId: req.user.id, scriptId, completedAt: new Date() } });
    await prisma.leaderboard.upsert({
      where: { userId: req.user.id },
      update: { xp: { increment: 15 }, monthlyXp: { increment: 15 }, quarterlyXp: { increment: 15 } },
      create: { userId: req.user.id, xp: 15, monthlyXp: 15, quarterlyXp: 15, streak: 0 }
    });
    res.json({ completed: true, xpChange: 15 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update DMA progress' });
  }
});

// ── B2B Playbook chapter progress ──────────────────────────────────────────────

// GET /playbook/b2b-progress — returns completed chapter numbers for B2B_SALES user
router.get('/b2b-progress', authenticate, authorize('B2B_SALES', 'ADMIN'), async (req, res) => {
  try {
    const completions = await prisma.playbookCompletion.findMany({
      where: { userId: req.user.id, scriptId: { startsWith: 'b2b-ch-' } },
      select: { scriptId: true, completedAt: true }
    });
    res.json(completions.map(c => ({ chapterId: c.scriptId, completedAt: c.completedAt })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch B2B progress' });
  }
});

// POST /playbook/b2b-complete/:chapterId — toggle chapter, award 15 XP
router.post('/b2b-complete/:chapterId', authenticate, authorize('B2B_SALES', 'ADMIN'), async (req, res) => {
  try {
    const scriptId = `b2b-ch-${req.params.chapterId}`;
    const existing = await prisma.playbookCompletion.findUnique({
      where: { userId_scriptId: { userId: req.user.id, scriptId } }
    });
    if (existing) {
      await prisma.playbookCompletion.delete({ where: { id: existing.id } });
      await prisma.leaderboard.upsert({
        where: { userId: req.user.id },
        update: { xp: { decrement: 15 }, monthlyXp: { decrement: 15 }, quarterlyXp: { decrement: 15 } },
        create: { userId: req.user.id, xp: 0, monthlyXp: 0, quarterlyXp: 0, streak: 0 }
      });
      return res.json({ completed: false, xpChange: -15 });
    }
    await prisma.playbookCompletion.create({ data: { userId: req.user.id, scriptId, completedAt: new Date() } });
    await prisma.leaderboard.upsert({
      where: { userId: req.user.id },
      update: { xp: { increment: 15 }, monthlyXp: { increment: 15 }, quarterlyXp: { increment: 15 } },
      create: { userId: req.user.id, xp: 15, monthlyXp: 15, quarterlyXp: 15, streak: 0 }
    });
    res.json({ completed: true, xpChange: 15 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update B2B progress' });
  }
});

// ── Builder Playbook chapter progress (stored in PlaybookCompletion with scriptId = chapterId string) ──

// GET /playbook/builder-progress — returns array of completed chapter numbers for this user
router.get('/builder-progress', authenticate, async (req, res) => {
  try {
    const completions = await prisma.playbookCompletion.findMany({
      where: { userId: req.user.id, scriptId: { startsWith: 'builder-ch-' } },
      select: { scriptId: true, completedAt: true }
    });
    const chapters = completions.map(c => ({
      chapterId: c.scriptId,
      completedAt: c.completedAt
    }));
    res.json(chapters);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch builder progress' });
  }
});

// POST /playbook/builder-complete/:chapterId — toggle chapter read/unread, award 15 XP on read
router.post('/builder-complete/:chapterId', authenticate, async (req, res) => {
  try {
    const scriptId = `builder-ch-${req.params.chapterId}`;
    const existing = await prisma.playbookCompletion.findUnique({
      where: { userId_scriptId: { userId: req.user.id, scriptId } }
    });

    if (existing) {
      // Unmark — remove completion, deduct XP
      await prisma.playbookCompletion.delete({ where: { id: existing.id } });
      await prisma.leaderboard.upsert({
        where: { userId: req.user.id },
        update: { xp: { decrement: 15 }, monthlyXp: { decrement: 15 }, quarterlyXp: { decrement: 15 } },
        create: { userId: req.user.id, xp: 0, monthlyXp: 0, quarterlyXp: 0, streak: 0 }
      });
      return res.json({ completed: false, xpChange: -15 });
    }

    // Mark complete — award 15 XP
    await prisma.playbookCompletion.create({
      data: { userId: req.user.id, scriptId, completedAt: new Date() }
    });
    await prisma.leaderboard.upsert({
      where: { userId: req.user.id },
      update: { xp: { increment: 15 }, monthlyXp: { increment: 15 }, quarterlyXp: { increment: 15 } },
      create: { userId: req.user.id, xp: 15, monthlyXp: 15, quarterlyXp: 15, streak: 0 }
    });
    res.json({ completed: true, xpChange: 15 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update builder progress' });
  }
});

export default router;
