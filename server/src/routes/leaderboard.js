import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Get leaderboard
router.get('/', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'SALES_EXECUTIVE') {
      const entry = await prisma.leaderboard.findUnique({
        where: { userId: req.user.id },
        include: { user: { select: { id: true, name: true, avatar: true, role: true } } }
      });
      return res.json(entry ? [entry] : []);
    }

    const { period = 'all' } = req.query;
    let orderBy = { xp: 'desc' };
    if (period === 'monthly') orderBy = { monthlyXp: 'desc' };
    if (period === 'quarterly') orderBy = { quarterlyXp: 'desc' };

    const leaderboard = await prisma.leaderboard.findMany({
      orderBy, take: 50,
      include: { user: { select: { id: true, name: true, avatar: true, role: true } } }
    });
    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get user rank
router.get('/me', authenticate, async (req, res) => {
  try {
    const mine = await prisma.leaderboard.findUnique({ where: { userId: req.user.id } });
    if (!mine) return res.json({ rank: 0, xp: 0, level: 1, streak: 0 });

    const rank = await prisma.leaderboard.count({ where: { xp: { gt: mine.xp } } });
    res.json({ ...mine, rank: rank + 1 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rank' });
  }
});

// Add XP (internal use, also used by other routes)
router.post('/xp', authenticate, async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const updated = await prisma.leaderboard.update({
      where: { userId: req.user.id },
      data: { xp: { increment: amount }, monthlyXp: { increment: amount }, quarterlyXp: { increment: amount } }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add XP' });
  }
});

export default router;
