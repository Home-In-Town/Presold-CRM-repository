import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

// POST /reports/daily — submit own report
router.post('/daily', authenticate, async (req, res) => {
  try {
    const { calls, meetings, siteVisits, demos, sales, revenue, problems, achievements } = req.body;
    const report = await prisma.dailyReport.create({
      data: {
        calls: calls || 0, meetings: meetings || 0, siteVisits: siteVisits || 0,
        demos: demos || 0, sales: sales || 0, revenue: revenue || 0,
        problems, achievements,
        userId: req.user.id   // always own report
      }
    });
    await prisma.leaderboard.update({
      where: { userId: req.user.id },
      data: { xp: { increment: 5 }, monthlyXp: { increment: 5 } }
    });
    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

// GET /reports/daily
// Sales exec: only their own reports
// Admin: all reports, can filter by userId
router.get('/daily', authenticate, async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    const where = {};
    if (req.user.role === 'SALES_EXECUTIVE') {
      where.userId = req.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (startDate) where.date = { gte: new Date(startDate) };
    if (endDate)   where.date = { ...(where.date || {}), lte: new Date(endDate) };

    const reports = await prisma.dailyReport.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 100,
      include: { user: { select: { name: true, avatar: true } } }
    });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// PUT /reports/daily/:id/approve — admin only
router.put('/daily/:id/approve', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const report = await prisma.dailyReport.update({
      where: { id: req.params.id },
      data: { approved: true, approvedAt: new Date() }
    });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve report' });
  }
});

// GET /reports/analytics — admin only
router.get('/analytics', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(period));

    const [leadsBySource, leadsByStage, revenueByUser, activitiesByType] = await Promise.all([
      prisma.lead.groupBy({
        by: ['source'], _count: true,
        where: { createdAt: { gte: since }, deletedAt: { isSet: false } }
      }),
      prisma.lead.groupBy({
        by: ['stage'], _count: true,
        where: { deletedAt: { isSet: false } }
      }),
      prisma.dailyReport.groupBy({
        by: ['userId'], _sum: { revenue: true },
        where: { date: { gte: since } }
      }),
      prisma.leadActivity.groupBy({
        by: ['type'], _count: true,
        where: { createdAt: { gte: since } }
      })
    ]);

    res.json({ leadsBySource, leadsByStage, revenueByUser, activitiesByType });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
