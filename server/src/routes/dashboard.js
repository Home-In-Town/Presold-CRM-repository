import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Reusable: non-admin users only see their own leads
function ownLeadWhere(user, extra = {}) {
  const base = { deletedAt: { isSet: false }, ...extra };
  if (user.role !== 'ADMIN' && user.role !== 'QUALIFIER') base.assignedToId = user.id;
  return base;
}

router.get('/stats', authenticate, async (req, res) => {
  try {
    const where = ownLeadWhere(req.user);

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weekAgo  = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today); monthAgo.setDate(monthAgo.getDate() - 30);

    // Activities: sales exec sees only their own; admin/manager see all
    // Activities: non-admin/non-qualifier sees only their own; admin/qualifier sees all
    const activityWhere = (req.user.role !== 'ADMIN' && req.user.role !== 'QUALIFIER')
      ? { userId: req.user.id }
      : {};

    const [
      total, todayLeads, weeklyLeads, monthlyLeads, wonDeals,
      leads, recentActivities, upcomingFollowups, tasks
    ] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.count({ where: { ...where, createdAt: { gte: today } } }),
      prisma.lead.count({ where: { ...where, createdAt: { gte: weekAgo } } }),
      prisma.lead.count({ where: { ...where, createdAt: { gte: monthAgo } } }),
      prisma.lead.count({ where: { ...where, stage: 'WON' } }),
      prisma.lead.findMany({ where, select: { stage: true, temperature: true } }),
      prisma.leadActivity.findMany({
        where: activityWhere,
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          lead: { select: { fullName: true } },
          user: { select: { name: true, avatar: true } }
        }
      }),
      prisma.lead.findMany({
        where: {
          ...where,
          nextFollowUp: { gte: today, lte: new Date(today.getTime() + 3 * 86400000) }
        },
        select: { id: true, fullName: true, phone: true, nextFollowUp: true, stage: true },
        orderBy: { nextFollowUp: 'asc' },
        take: 10
      }),
      // Tasks always scoped to the logged-in user regardless of role
      prisma.task.findMany({
        where: { userId: req.user.id, completed: false },
        orderBy: { dueDate: 'asc' },
        take: 5
      })
    ]);

    // Stage / temperature breakdown
    const stages = {};
    const temps = { HOT: 0, WARM: 0, COLD: 0 };
    leads.forEach(l => {
      stages[l.stage] = (stages[l.stage] || 0) + 1;
      if (temps[l.temperature] !== undefined) temps[l.temperature]++;
    });

    // Simple funnel rates (based on this user's own leads)
    const stageOrder = ['CONNECT','REPLY','INTEREST','TRUST','TRIAL',
      'DEMO_BOOKED','DEMO_ATTENDED','PROPOSAL_SENT','NEGOTIATION','WON'];
    const pastStage = (stage) => {
      const idx = stageOrder.indexOf(stage);
      return leads.filter(l => stageOrder.indexOf(l.stage) >= idx).length;
    };

    const funnelRates = {
      responseRate:   total > 0                    ? Math.round((pastStage('REPLY')        / total)                * 100) : 0,
      demoRate:       pastStage('REPLY') > 0        ? Math.round((pastStage('DEMO_BOOKED')  / pastStage('REPLY'))  * 100) : 0,
      showRate:       pastStage('DEMO_BOOKED') > 0  ? Math.round((pastStage('DEMO_ATTENDED')/ pastStage('DEMO_BOOKED')) * 100) : 0,
      closeRate:      pastStage('DEMO_ATTENDED') > 0 ? Math.round((pastStage('WON')         / pastStage('DEMO_ATTENDED')) * 100) : 0,
      conversionRate: total > 0                    ? Math.round((pastStage('WON')           / total)                * 100) : 0
    };

    res.json({
      total, todayLeads, weeklyLeads, monthlyLeads, wonDeals,
      stages, temperatures: temps, funnelRates,
      recentActivities, upcomingFollowups, tasks,
      hotLeads:  temps.HOT,
      coldLeads: temps.COLD
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
