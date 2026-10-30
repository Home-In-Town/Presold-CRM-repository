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

// GET /reports/admin/all — admin only, get all reports with user details
router.get('/admin/all', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    const where = {};

    // Filter by date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    } else if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      where.date = { gte: start };
    } else if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.date = { lte: end };
    }

    // Filter by user
    if (userId) {
      where.userId = userId;
    }

    const reports = await prisma.dailyReport.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { 
        user: { 
          select: { 
            id: true,
            name: true, 
            email: true,
            avatar: true,
            role: true
          } 
        } 
      }
    });

    res.json(reports);
  } catch (err) {
    console.error('Failed to fetch admin reports:', err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// GET /reports/admin/user/:userId — admin only, get specific user's reports
router.get('/admin/user/:userId', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    const where = { userId };

    // Filter by date range
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    }

    const reports = await prisma.dailyReport.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { 
        user: { 
          select: { 
            id: true,
            name: true, 
            email: true,
            avatar: true,
            role: true
          } 
        } 
      }
    });

    res.json(reports);
  } catch (err) {
    console.error('Failed to fetch user reports:', err);
    res.status(500).json({ error: 'Failed to fetch user reports' });
  }
});

// GET /reports/admin/download/:id — admin only, get formatted report for WhatsApp
router.get('/admin/download/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const report = await prisma.dailyReport.findUnique({
      where: { id },
      include: { 
        user: { 
          select: { 
            name: true, 
            email: true,
            role: true
          } 
        } 
      }
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Format date
    const dateStr = new Date(report.date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    // Format report text for WhatsApp
    const formattedText = `📊 *Daily Report - ${dateStr}*\n\n` +
      `👤 *${report.user.name}*\n` +
      `${report.user.email}\n\n` +
      `📈 *Performance Metrics*\n` +
      `📞 Calls: ${report.calls}\n` +
      `🤝 Meetings: ${report.meetings}\n` +
      `🏢 Leads: ${report.siteVisits}\n` +
      `🎯 Demos: ${report.demos}\n` +
      `💰 Sales: ${report.sales}\n` +
      `💵 Revenue: ₹${report.revenue.toLocaleString('en-IN')}\n\n` +
      (report.achievements ? `✅ *Achievements*\n${report.achievements}\n\n` : '') +
      (report.problems ? `⚠️ *Problems*\n${report.problems}\n\n` : '') +
      `${report.approved ? '✅ Approved' : '⏳ Pending Approval'}\n` +
      `\n_Generated via PreSold CRM_`;

    res.json({ 
      text: formattedText,
      report 
    });
  } catch (err) {
    console.error('Failed to download report:', err);
    res.status(500).json({ error: 'Failed to download report' });
  }
});

// GET /reports/admin/users — admin only, get all users who have submitted reports
router.get('/admin/users', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    // Get unique user IDs from daily reports
    const reports = await prisma.dailyReport.findMany({
      select: { userId: true },
      distinct: ['userId']
    });

    const userIds = reports.map(r => r.userId);

    // Get user details
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true
      },
      orderBy: { name: 'asc' }
    });

    res.json(users);
  } catch (err) {
    console.error('Failed to fetch users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
