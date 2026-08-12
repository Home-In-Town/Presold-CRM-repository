import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = Router();

// Also update the teams GET — SALES_EXECUTIVE blocked, everyone else (ADMIN) can access
router.get('/', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not allowed' });
    }

    const teams = await prisma.team.findMany({
      where: { deletedAt: { isSet: false } },
      include: { members: { select: { id: true, name: true, email: true, role: true, avatar: true, isActive: true } }, _count: { select: { leads: true } } }
    });
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get all users (admin)
router.get('/users', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: { isSet: false } },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        isActive: true,
        pendingApproval: true,
        teamId: true,
        createdAt: true,
        lastLogin: true,
        team: { select: { name: true } },
        attendanceRecords: {
          orderBy: { checkedInAt: 'desc' },
          take: 1,
          select: { checkedInAt: true, checkedOutAt: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const payload = users.map(user => {
      const latest = user.attendanceRecords[0] || null;
      return {
        ...user,
        attendance: latest ? {
          checkedInAt: latest.checkedInAt,
          checkedOutAt: latest.checkedOutAt,
          status: latest.checkedOutAt ? 'Checked out' : 'Checked in'
        } : null
      };
    });

    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /teams/attendance/me — sales exec fetches their own today's attendance
router.get('/attendance/me', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const record = await prisma.attendanceRecord.findFirst({
      where: {
        userId: req.user.id,
        checkedInAt: { gte: start, lte: end }
      },
      orderBy: { checkedInAt: 'desc' }
    });

    if (!record) return res.json({ attendance: null });

    res.json({
      attendance: {
        checkedInAt: record.checkedInAt,
        checkedOutAt: record.checkedOutAt,
        status: record.checkedOutAt ? 'Checked out' : 'Checked in'
      }
    });
  } catch (err) {
    console.error('Attendance fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

router.post('/attendance/toggle', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'SALES_EXECUTIVE') {
      return res.status(403).json({ error: 'Only sales executives can check in/out' });
    }

    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const openAttendance = await prisma.attendanceRecord.findFirst({
      where: {
        userId: req.user.id,
        checkedInAt: { gte: start, lte: end },
        checkedOutAt: null
      },
      orderBy: { checkedInAt: 'desc' }
    });

    if (openAttendance) {
      const updated = await prisma.attendanceRecord.update({
        where: { id: openAttendance.id },
        data: { checkedOutAt: now }
      });
      return res.json({ status: 'checked_out', attendance: updated });
    }

    const created = await prisma.attendanceRecord.create({
      data: { userId: req.user.id, checkedInAt: now }
    });

    res.json({ status: 'checked_in', attendance: created });
  } catch (err) {
    console.error('Attendance toggle error:', err);
    res.status(500).json({ error: 'Failed to update attendance' });
  }
});

router.get('/activity', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: { isSet: false }, role: 'SALES_EXECUTIVE' },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        lastLogin: true,
        team: { select: { name: true } },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
            createdAt: true,
            lead: { select: { id: true, fullName: true } }
          }
        },
        leads: {
          where: { deletedAt: { isSet: false } },
          select: { id: true, stage: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const payload = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      team: user.team?.name || 'Unassigned',
      lastLogin: user.lastLogin,
      totalLeads: user.leads.length,
      activityCount: user.activities.length,
      recentActivities: user.activities.map(activity => ({
        id: activity.id,
        type: activity.type,
        title: activity.title,
        description: activity.description,
        leadName: activity.lead?.fullName || 'General',
        createdAt: activity.createdAt
      }))
    }));

    res.json(payload);
  } catch (err) {
    console.error('Sales activity fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch salesperson activity' });
  }
});

// Create team
router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { name, color } = req.body;
    const team = await prisma.team.create({ data: { name, color } });
    res.status(201).json(team);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Add user to team
router.put('/assign', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { userId, teamId } = req.body;
    const user = await prisma.user.update({ where: { id: userId }, data: { teamId } });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign user' });
  }
});

// Suspend user
router.put('/suspend/:userId', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: { isActive: false }
    });
    res.json({ message: 'User suspended' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to suspend user' });
  }
});

// Activate user
router.put('/activate/:userId', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.user.update({ where: { id: req.params.userId }, data: { isActive: true, pendingApproval: false } });
    res.json({ message: 'User activated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to activate user' });
  }
});

router.put('/reject/:userId', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.user.update({ where: { id: req.params.userId }, data: { isActive: false, pendingApproval: false } });
    res.json({ message: 'User rejected' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject user' });
  }
});

// Reset user password (admin)
router.put('/reset-password/:userId', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { newPassword } = req.body;
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.params.userId }, data: { password: hashed } });
    res.json({ message: 'Password reset' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Change user role
router.put('/role/:userId', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { role } = req.body;
    await prisma.user.update({ where: { id: req.params.userId }, data: { role } });
    res.json({ message: 'Role updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Transfer leads
router.post('/transfer-leads', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { fromUserId, toUserId } = req.body;
    const result = await prisma.lead.updateMany({
      where: { assignedToId: fromUserId, deletedAt: { isSet: false } },
      data: { assignedToId: toUserId }
    });
    res.json({ message: `${result.count} leads transferred` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to transfer leads' });
  }
});

export default router;
