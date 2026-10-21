import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { trackingDb } from '../config/database.js';
import { runManualCleanup } from '../jobs/monthlyCleanup.js';

const router = express.Router();

// GET /api/attendance/status - Check current check-in status
router.get('/status', authenticate, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find today's check-in record
    const checkIn = await trackingDb.checkInOut.findFirst({
      where: {
        userId: req.user.id,
        checkInTime: {
          gte: today,
          lt: tomorrow
        },
        status: 'CHECKED_IN'
      },
      orderBy: {
        checkInTime: 'desc'
      }
    });

    if (checkIn) {
      res.json({
        isCheckedIn: true,
        checkInTime: checkIn.checkInTime,
        checkInLat: checkIn.checkInLat,
        checkInLng: checkIn.checkInLng,
        checkInAddress: checkIn.checkInAddress
      });
    } else {
      res.json({ isCheckedIn: false });
    }
  } catch (err) {
    console.error('Check status error:', err);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

// POST /api/attendance/check-in - Check in with location
router.post('/check-in', authenticate, async (req, res) => {
  try {
    const { latitude, longitude, accuracy } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Location is required' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if already checked in today
    const existingCheckIn = await trackingDb.checkInOut.findFirst({
      where: {
        userId: req.user.id,
        checkInTime: {
          gte: today,
          lt: tomorrow
        },
        status: 'CHECKED_IN'
      }
    });

    if (existingCheckIn) {
      return res.status(400).json({ error: 'Already checked in today' });
    }

    // Get address from coordinates (optional - can add reverse geocoding later)
    const address = `${latitude}, ${longitude}`;

    // Create check-in record
    const checkIn = await trackingDb.checkInOut.create({
      data: {
        userId: req.user.id,
        checkInTime: new Date(),
        checkInLat: parseFloat(latitude),
        checkInLng: parseFloat(longitude),
        checkInAddress: address,
        status: 'CHECKED_IN'
      }
    });

    // Also create initial location history entry
    await trackingDb.locationHistory.create({
      data: {
        userId: req.user.id,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy ? parseFloat(accuracy) : null,
        address,
        timestamp: new Date()
      }
    });

    res.json({
      success: true,
      checkIn: {
        id: checkIn.id,
        checkInTime: checkIn.checkInTime,
        checkInLat: checkIn.checkInLat,
        checkInLng: checkIn.checkInLng
      }
    });
  } catch (err) {
    console.error('Check-in error:', err);
    res.status(500).json({ error: 'Failed to check in' });
  }
});

// POST /api/attendance/check-out - Check out with location
router.post('/check-out', authenticate, async (req, res) => {
  try {
    const { latitude, longitude, accuracy } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Location is required' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find today's check-in record
    const checkIn = await trackingDb.checkInOut.findFirst({
      where: {
        userId: req.user.id,
        checkInTime: {
          gte: today,
          lt: tomorrow
        },
        status: 'CHECKED_IN'
      },
      orderBy: {
        checkInTime: 'desc'
      }
    });

    if (!checkIn) {
      return res.status(400).json({ error: 'No check-in record found for today' });
    }

    const address = `${latitude}, ${longitude}`;

    // Update check-in record with check-out info
    const updated = await trackingDb.checkInOut.update({
      where: { id: checkIn.id },
      data: {
        checkOutTime: new Date(),
        checkOutLat: parseFloat(latitude),
        checkOutLng: parseFloat(longitude),
        checkOutAddress: address,
        status: 'CHECKED_OUT'
      }
    });

    // Also create final location history entry
    await trackingDb.locationHistory.create({
      data: {
        userId: req.user.id,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy ? parseFloat(accuracy) : null,
        address,
        timestamp: new Date()
      }
    });

    res.json({
      success: true,
      checkOut: {
        id: updated.id,
        checkOutTime: updated.checkOutTime,
        checkOutLat: updated.checkOutLat,
        checkOutLng: updated.checkOutLng
      }
    });
  } catch (err) {
    console.error('Check-out error:', err);
    res.status(500).json({ error: 'Failed to check out' });
  }
});

// POST /api/attendance/location-ping - Store location ping while checked in
router.post('/location-ping', authenticate, async (req, res) => {
  try {
    const { latitude, longitude, accuracy } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Location is required' });
    }

    const address = `${latitude}, ${longitude}`;

    // Create location history entry
    await trackingDb.locationHistory.create({
      data: {
        userId: req.user.id,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy ? parseFloat(accuracy) : null,
        address,
        timestamp: new Date()
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Location ping error:', err);
    res.status(500).json({ error: 'Failed to store location' });
  }
});

// GET /api/attendance/history - Get user's attendance history
router.get('/history', authenticate, async (req, res) => {
  try {
    const { month, year } = req.query;
    
    let startDate, endDate;
    if (month && year) {
      startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
    } else {
      // Default to current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    const records = await trackingDb.checkInOut.findMany({
      where: {
        userId: req.user.id,
        checkInTime: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        checkInTime: 'desc'
      }
    });

    res.json({ records });
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// GET /api/attendance/route-history - Get location history for today's route
router.get('/route-history', authenticate, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find today's check-in
    const checkIn = await trackingDb.checkInOut.findFirst({
      where: {
        userId: req.user.id,
        checkInTime: {
          gte: today,
          lt: tomorrow
        }
      },
      orderBy: {
        checkInTime: 'desc'
      }
    });

    if (!checkIn) {
      return res.json({ locations: [] });
    }

    // Get location history from check-in time
    const locations = await trackingDb.locationHistory.findMany({
      where: {
        userId: req.user.id,
        timestamp: {
          gte: checkIn.checkInTime,
          ...(checkIn.checkOutTime && { lte: checkIn.checkOutTime })
        }
      },
      orderBy: {
        timestamp: 'asc'
      }
    });

    res.json({ locations });
  } catch (err) {
    console.error('Route history error:', err);
    res.status(500).json({ error: 'Failed to fetch route history' });
  }
});

// GET /api/attendance/admin/monthly-report - Admin only: Get monthly attendance report for all users
router.get('/admin/monthly-report', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { month, year } = req.query;
    
    let startDate, endDate;
    if (month && year) {
      startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
    } else {
      // Default to current month
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    // Get all check-ins for the selected month
    const checkIns = await trackingDb.checkInOut.findMany({
      where: {
        checkInTime: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        checkInTime: 'desc'
      }
    });

    // Import prisma from main database to get user info
    const { default: prisma } = await import('../config/database.js');
    
    // For each check-in, get user info
    const recordsWithUserInfo = await Promise.all(
      checkIns.map(async (checkIn) => {
        // Get user from main database
        const user = await prisma.user.findUnique({
          where: { id: checkIn.userId },
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        });

        return {
          userId: checkIn.userId,
          userName: user?.name || 'Unknown',
          userEmail: user?.email || '',
          status: checkIn.status,
          checkInTime: checkIn.checkInTime,
          checkOutTime: checkIn.checkOutTime,
          checkIn: {
            time: checkIn.checkInTime,
            lat: checkIn.checkInLat,
            lng: checkIn.checkInLng,
            address: checkIn.checkInAddress
          },
          checkOut: checkIn.checkOutTime ? {
            time: checkIn.checkOutTime,
            lat: checkIn.checkOutLat,
            lng: checkIn.checkOutLng,
            address: checkIn.checkOutAddress
          } : null
        };
      })
    );

    res.json({ records: recordsWithUserInfo });
  } catch (err) {
    console.error('Monthly report error:', err);
    res.status(500).json({ error: 'Failed to fetch monthly report' });
  }
});

// GET /api/attendance/admin/all-locations - Admin only: Get all users' current locations and routes
router.get('/admin/all-locations', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all check-ins for today
    const checkIns = await trackingDb.checkInOut.findMany({
      where: {
        checkInTime: {
          gte: today,
          lt: tomorrow
        }
      },
      orderBy: {
        checkInTime: 'desc'
      }
    });

    // Import prisma from main database to get user info
    const { default: prisma } = await import('../config/database.js');
    
    // For each check-in, get user info and location history
    const usersWithLocations = await Promise.all(
      checkIns.map(async (checkIn) => {
        // Get user from main database
        const user = await prisma.user.findUnique({
          where: { id: checkIn.userId },
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        });

        // Get location history
        const locationHistory = await trackingDb.locationHistory.findMany({
          where: {
            userId: checkIn.userId,
            timestamp: {
              gte: checkIn.checkInTime,
              ...(checkIn.checkOutTime && { lte: checkIn.checkOutTime })
            }
          },
          orderBy: {
            timestamp: 'asc'
          }
        });

        return {
          userId: checkIn.userId,
          userName: user?.name || 'Unknown',
          userEmail: user?.email || '',
          status: checkIn.status,
          checkIn: {
            time: checkIn.checkInTime,
            lat: checkIn.checkInLat,
            lng: checkIn.checkInLng,
            address: checkIn.checkInAddress
          },
          checkOut: checkIn.checkOutTime ? {
            time: checkIn.checkOutTime,
            lat: checkIn.checkOutLat,
            lng: checkIn.checkOutLng,
            address: checkIn.checkOutAddress
          } : null,
          locationHistory: locationHistory.map(loc => ({
            lat: loc.latitude,
            lng: loc.longitude,
            timestamp: loc.timestamp,
            accuracy: loc.accuracy,
            address: loc.address
          }))
        };
      })
    );

    res.json({ users: usersWithLocations });
  } catch (err) {
    console.error('Admin all locations error:', err);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// GET /api/attendance/admin/monthly-tracking - Admin only: Get monthly tracking for a specific user or all users
router.get('/admin/monthly-tracking', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId, year, month } = req.query;

    // Parse year and month (default to current month)
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth(); // JS months are 0-indexed

    // Calculate date range for the month
    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

    console.log(`Fetching monthly tracking: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    if (userId) console.log(`Filtering for user: ${userId}`);

    // Build where clause
    const whereClause = {
      checkInTime: {
        gte: startDate,
        lte: endDate
      }
    };

    if (userId) {
      whereClause.userId = userId;
    }

    // Get all check-ins for the month
    const checkIns = await trackingDb.checkInOut.findMany({
      where: whereClause,
      orderBy: {
        checkInTime: 'desc'
      }
    });

    console.log(`Found ${checkIns.length} check-ins for the month`);

    // Import prisma from main database to get user info
    const { default: prisma } = await import('../config/database.js');
    
    // For each check-in, get user info and location history
    const trackingData = await Promise.all(
      checkIns.map(async (checkIn) => {
        // Get user from main database
        const user = await prisma.user.findUnique({
          where: { id: checkIn.userId },
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        });

        // Get location history for this check-in session
        const locationHistory = await trackingDb.locationHistory.findMany({
          where: {
            userId: checkIn.userId,
            timestamp: {
              gte: checkIn.checkInTime,
              ...(checkIn.checkOutTime && { lte: checkIn.checkOutTime })
            }
          },
          orderBy: {
            timestamp: 'asc'
          }
        });

        // Calculate total distance traveled (approximate)
        let totalDistance = 0;
        if (locationHistory.length > 1) {
          for (let i = 1; i < locationHistory.length; i++) {
            const prev = locationHistory[i - 1];
            const curr = locationHistory[i];
            totalDistance += calculateDistance(
              prev.latitude, prev.longitude,
              curr.latitude, curr.longitude
            );
          }
        }

        // Calculate work duration
        const checkInTime = new Date(checkIn.checkInTime);
        const checkOutTime = checkIn.checkOutTime ? new Date(checkIn.checkOutTime) : new Date();
        const durationMs = checkOutTime - checkInTime;
        const durationHours = (durationMs / (1000 * 60 * 60)).toFixed(2);

        return {
          date: checkIn.checkInTime,
          userId: checkIn.userId,
          userName: user?.name || 'Unknown',
          userEmail: user?.email || '',
          status: checkIn.status,
          checkIn: {
            time: checkIn.checkInTime,
            lat: checkIn.checkInLat,
            lng: checkIn.checkInLng,
            address: checkIn.checkInAddress
          },
          checkOut: checkIn.checkOutTime ? {
            time: checkIn.checkOutTime,
            lat: checkIn.checkOutLat,
            lng: checkIn.checkOutLng,
            address: checkIn.checkOutAddress
          } : null,
          locationHistory: locationHistory.map(loc => ({
            lat: loc.latitude,
            lng: loc.longitude,
            timestamp: loc.timestamp,
            accuracy: loc.accuracy,
            address: loc.address
          })),
          stats: {
            totalLocationPings: locationHistory.length,
            totalDistanceKm: totalDistance.toFixed(2),
            durationHours: durationHours
          }
        };
      })
    );

    // Group by user if fetching all users
    let response;
    if (userId) {
      response = {
        userId,
        userName: trackingData[0]?.userName,
        month: `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`,
        totalDays: trackingData.length,
        sessions: trackingData
      };
    } else {
      // Group by user
      const userGroups = {};
      trackingData.forEach(session => {
        if (!userGroups[session.userId]) {
          userGroups[session.userId] = {
            userId: session.userId,
            userName: session.userName,
            userEmail: session.userEmail,
            sessions: []
          };
        }
        userGroups[session.userId].sessions.push(session);
      });

      response = {
        month: `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`,
        totalUsers: Object.keys(userGroups).length,
        users: Object.values(userGroups).map(user => ({
          ...user,
          totalDays: user.sessions.length,
          totalHours: user.sessions.reduce((sum, s) => sum + parseFloat(s.stats.durationHours), 0).toFixed(2),
          totalDistanceKm: user.sessions.reduce((sum, s) => sum + parseFloat(s.stats.totalDistanceKm), 0).toFixed(2)
        }))
      };
    }

    res.json(response);
  } catch (err) {
    console.error('Monthly tracking error:', err);
    res.status(500).json({ error: 'Failed to fetch monthly tracking data' });
  }
});

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

// POST /api/attendance/admin/cleanup - Admin only: Manually trigger cleanup of old location data
router.post('/admin/cleanup', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { monthsToKeep } = req.body;
    const result = await runManualCleanup(monthsToKeep || 2);
    
    res.json({
      success: true,
      message: 'Cleanup completed successfully',
      ...result
    });
  } catch (err) {
    console.error('Manual cleanup error:', err);
    res.status(500).json({ error: 'Failed to run cleanup' });
  }
});

export default router;
