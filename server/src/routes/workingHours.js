// Working Hours API Routes
import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { PrismaClient as TrackingPrismaClient } from '../../node_modules/.prisma/tracking-client/index.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const trackingDb = new TrackingPrismaClient();
const db = new PrismaClient();

// GET /api/working-hours/:userId - Get working hours for a specific user
router.get('/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    // Verify access - user can only see their own hours unless admin
    if (req.user.id !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized to view these working hours' });
    }

    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1)); // First day of current month
    const end = endDate ? new Date(endDate) : new Date(); // Today

    // Get all check-ins for the date range
    const checkIns = await trackingDb.checkInOut.findMany({
      where: {
        userId,
        checkInTime: {
          gte: start,
          lte: end
        }
      },
      orderBy: {
        checkInTime: 'desc'
      }
    });

    // Calculate working hours for each day
    const workingHours = checkIns.map(checkIn => {
      const checkInTime = new Date(checkIn.checkInTime);
      const checkOutTime = checkIn.checkOutTime ? new Date(checkIn.checkOutTime) : new Date();
      
      // Calculate hours worked
      const hoursWorked = (checkOutTime - checkInTime) / (1000 * 60 * 60);
      
      // Determine if still active
      const isActive = checkIn.status === 'CHECKED_IN';
      
      return {
        id: checkIn.id,
        date: checkInTime.toISOString().split('T')[0],
        checkInTime: checkInTime.toISOString(),
        checkOutTime: checkIn.checkOutTime ? checkIn.checkOutTime.toISOString() : null,
        hoursWorked: parseFloat(hoursWorked.toFixed(2)),
        isActive,
        checkInAddress: checkIn.checkInAddress,
        checkOutAddress: checkIn.checkOutAddress
      };
    });

    // Calculate summary statistics
    const totalHours = workingHours.reduce((sum, day) => sum + day.hoursWorked, 0);
    const avgHoursPerDay = workingHours.length > 0 ? totalHours / workingHours.length : 0;
    const daysWorked = workingHours.length;

    // Get user info
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    res.json({
      success: true,
      user,
      workingHours,
      summary: {
        totalHours: parseFloat(totalHours.toFixed(2)),
        avgHoursPerDay: parseFloat(avgHoursPerDay.toFixed(2)),
        daysWorked,
        periodStart: start.toISOString(),
        periodEnd: end.toISOString()
      }
    });
  } catch (error) {
    console.error('Working hours error:', error);
    res.status(500).json({ error: 'Failed to fetch working hours' });
  }
});

// GET /api/working-hours/team/summary - Get working hours summary for all team members (Admin only)
router.get('/team/summary', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();

    // Get all users
    const users = await db.user.findMany({
      where: {
        isActive: true,
        role: {
          not: 'ADMIN'
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    // Get check-ins for all users
    const allCheckIns = await trackingDb.checkInOut.findMany({
      where: {
        checkInTime: {
          gte: start,
          lte: end
        }
      }
    });

    // Group by user and calculate hours
    const userSummaries = users.map(user => {
      const userCheckIns = allCheckIns.filter(ci => ci.userId === user.id);
      
      const totalHours = userCheckIns.reduce((sum, checkIn) => {
        const checkInTime = new Date(checkIn.checkInTime);
        const checkOutTime = checkIn.checkOutTime ? new Date(checkIn.checkOutTime) : new Date();
        const hours = (checkOutTime - checkInTime) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);

      const daysWorked = userCheckIns.length;
      const avgHoursPerDay = daysWorked > 0 ? totalHours / daysWorked : 0;

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        totalHours: parseFloat(totalHours.toFixed(2)),
        avgHoursPerDay: parseFloat(avgHoursPerDay.toFixed(2)),
        daysWorked
      };
    });

    // Sort by total hours descending
    userSummaries.sort((a, b) => b.totalHours - a.totalHours);

    res.json({
      success: true,
      period: {
        start: start.toISOString(),
        end: end.toISOString()
      },
      users: userSummaries
    });
  } catch (error) {
    console.error('Team working hours error:', error);
    res.status(500).json({ error: 'Failed to fetch team working hours' });
  }
});

export default router;
