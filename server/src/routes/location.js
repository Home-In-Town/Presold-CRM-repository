import express from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma, { trackingDb } from '../config/database.js';

const router = express.Router();

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  next();
};

// POST /api/location/update - Update user's location (automatic every 30 min)
router.post('/update', authenticate, async (req, res) => {
  try {
    const { latitude, longitude, accuracy, address } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Create location history entry
    const location = await trackingDb.locationHistory.create({
      data: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy ? parseFloat(accuracy) : null,
        address: address || null,
        userId: req.user.id,
        timestamp: new Date()
      }
    });

    res.json({
      success: true,
      location
    });
  } catch (error) {
    console.error('Location update error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// GET /api/location/history - Get user's own location history
router.get('/history', authenticate, async (req, res) => {
  try {
    const { date, limit = 50 } = req.query;
    
    const whereClause = {
      userId: req.user.id
    };

    // Filter by date if provided
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      whereClause.timestamp = {
        gte: startDate,
        lte: endDate
      };
    }

    const history = await trackingDb.locationHistory.findMany({
      where: whereClause,
      orderBy: {
        timestamp: 'desc'
      },
      take: parseInt(limit)
    });

    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Location history error:', error);
    res.status(500).json({ error: 'Failed to fetch location history' });
  }
});

// GET /api/location/latest - Get user's latest location
router.get('/latest', authenticate, async (req, res) => {
  try {
    const location = await trackingDb.locationHistory.findFirst({
      where: {
        userId: req.user.id
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    res.json({
      success: true,
      location: location || null
    });
  } catch (error) {
    console.error('Latest location error:', error);
    res.status(500).json({ error: 'Failed to fetch latest location' });
  }
});

// POST /api/location/check-in - Check in with location
router.post('/check-in', authenticate, async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;

    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) console.log('Check-in request:', { userId: req.user.id, latitude, longitude, address });

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Location is required to check in. Please enable location access.' });
    }

    // Check if user has an active check-in
    const activeCheckIn = await trackingDb.checkInOut.findFirst({
      where: {
        userId: req.user.id,
        status: 'CHECKED_IN'
      },
      orderBy: {
        checkInTime: 'desc'
      }
    });

    if (activeCheckIn) {
      if (isDev) console.log('User already checked in:', activeCheckIn);
      return res.status(400).json({ 
        error: 'You are already checked in. Please check out first.',
        activeCheckIn
      });
    }

    // Check if user has already checked in today (once per day limit)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayCheckIn = await trackingDb.checkInOut.findFirst({
      where: {
        userId: req.user.id,
        checkInTime: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    if (todayCheckIn) {
      if (isDev) console.log('User already checked in today:', todayCheckIn);
      return res.status(400).json({ 
        error: 'You have already checked in today. Only one check-in per day is allowed.',
        todayCheckIn
      });
    }

    // Create new check-in
    const checkIn = await trackingDb.checkInOut.create({
      data: {
        checkInTime: new Date(),
        checkInLat: parseFloat(latitude),
        checkInLng: parseFloat(longitude),
        checkInAddress: address || null,
        status: 'CHECKED_IN',
        userId: req.user.id
      }
    });

    if (isDev) console.log('Check-in successful:', checkIn);

    // Also create location history entry
    await trackingDb.locationHistory.create({
      data: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: address || null,
        userId: req.user.id,
        timestamp: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Checked in successfully',
      checkIn
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Failed to check in: ' + error.message });
  }
});

// POST /api/location/check-out - Check out with location
router.post('/check-out', authenticate, async (req, res) => {
  try {
    const { latitude, longitude, address } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Find active check-in
    const activeCheckIn = await trackingDb.checkInOut.findFirst({
      where: {
        userId: req.user.id,
        status: 'CHECKED_IN'
      },
      orderBy: {
        checkInTime: 'desc'
      }
    });

    if (!activeCheckIn) {
      return res.status(400).json({ 
        error: 'No active check-in found. Please check in first.'
      });
    }

    // Update check-in with check-out data
    const checkOut = await trackingDb.checkInOut.update({
      where: {
        id: activeCheckIn.id
      },
      data: {
        checkOutTime: new Date(),
        checkOutLat: parseFloat(latitude),
        checkOutLng: parseFloat(longitude),
        checkOutAddress: address || null,
        status: 'CHECKED_OUT'
      }
    });

    // Also create location history entry
    await trackingDb.locationHistory.create({
      data: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: address || null,
        userId: req.user.id,
        timestamp: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Checked out successfully',
      checkOut
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ error: 'Failed to check out' });
  }
});

// GET /api/location/check-in/status - Get current check-in status
router.get('/check-in/status', authenticate, async (req, res) => {
  try {
    const activeCheckIn = await trackingDb.checkInOut.findFirst({
      where: {
        userId: req.user.id,
        status: 'CHECKED_IN'
      },
      orderBy: {
        checkInTime: 'desc'
      }
    });

    res.json({
      success: true,
      isCheckedIn: !!activeCheckIn,
      checkIn: activeCheckIn || null
    });
  } catch (error) {
    console.error('Check-in status error:', error);
    res.status(500).json({ error: 'Failed to fetch check-in status' });
  }
});

// GET /api/location/check-in/today - Get today's check-in records
router.get('/check-in/today', authenticate, async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const records = await trackingDb.checkInOut.findMany({
      where: {
        userId: req.user.id,
        checkInTime: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      orderBy: {
        checkInTime: 'desc'
      }
    });

    res.json({
      success: true,
      records
    });
  } catch (error) {
    console.error('Today check-in records error:', error);
    res.status(500).json({ error: 'Failed to fetch today\'s check-in records' });
  }
});

// ADMIN ROUTES

// GET /api/location/admin/all-users - Get all users' latest locations (Admin only)
router.get('/admin/all-users', authenticate, requireAdmin, async (req, res) => {
  try {
    // Get all active users (filter deletedAt in code due to MongoDB null query bug)
    const allUsers = await prisma.user.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        deletedAt: true
      }
    });
    
    const users = allUsers.filter(u => !u.deletedAt);

    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) console.log(`Found ${users.length} active users`);

    // Get latest location for each user
    const usersWithLocations = await Promise.all(
      users.map(async (user) => {
        const latestLocation = await trackingDb.locationHistory.findFirst({
          where: {
            userId: user.id
          },
          orderBy: {
            timestamp: 'desc'
          }
        });

        const checkInStatus = await trackingDb.checkInOut.findFirst({
          where: {
            userId: user.id,
            status: 'CHECKED_IN'
          },
          orderBy: {
            checkInTime: 'desc'
          }
        });

        if (checkInStatus && isDev) {
          console.log(`User ${user.name} is checked in:`, checkInStatus);
        }

        return {
          ...user,
          latestLocation: latestLocation || null,
          isCheckedIn: !!checkInStatus,
          checkInInfo: checkInStatus || null
        };
      })
    );

    const checkedInCount = usersWithLocations.filter(u => u.isCheckedIn).length;
    if (isDev) console.log(`${checkedInCount} users are currently checked in`);

    res.json({
      success: true,
      users: usersWithLocations
    });
  } catch (error) {
    console.error('Admin all users location error:', error);
    res.status(500).json({ error: 'Failed to fetch all users locations' });
  }
});

// GET /api/location/admin/user/:userId/history - Get specific user's location history (Admin only)
router.get('/admin/user/:userId/history', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { date, limit = 100 } = req.query;

    const whereClause = {
      userId
    };

    // Filter by date if provided
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      whereClause.timestamp = {
        gte: startDate,
        lte: endDate
      };
    }

    const history = await trackingDb.locationHistory.findMany({
      where: whereClause,
      orderBy: {
        timestamp: 'desc'
      },
      take: parseInt(limit),
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

    res.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Admin user history error:', error);
    res.status(500).json({ error: 'Failed to fetch user location history' });
  }
});

// GET /api/location/admin/user/:userId/check-ins - Get specific user's check-in records (Admin only)
router.get('/admin/user/:userId/check-ins', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, limit = 50 } = req.query;

    const whereClause = {
      userId
    };

    if (startDate && endDate) {
      whereClause.checkInTime = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const checkIns = await trackingDb.checkInOut.findMany({
      where: whereClause,
      orderBy: {
        checkInTime: 'desc'
      },
      take: parseInt(limit),
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

    res.json({
      success: true,
      checkIns
    });
  } catch (error) {
    console.error('Admin user check-ins error:', error);
    res.status(500).json({ error: 'Failed to fetch user check-in records' });
  }
});

// GET /api/location/admin/stats - Get location tracking statistics (Admin only)
router.get('/admin/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      allActiveUsers,
      checkedInUsers,
      todayLocations,
      todayCheckIns
    ] = await Promise.all([
      prisma.user.findMany({
        where: {
          isActive: true
        },
        select: {
          deletedAt: true
        }
      }),
      trackingDb.checkInOut.count({
        where: {
          status: 'CHECKED_IN'
        }
      }),
      trackingDb.locationHistory.count({
        where: {
          timestamp: {
            gte: today
          }
        }
      }),
      trackingDb.checkInOut.count({
        where: {
          checkInTime: {
            gte: today
          }
        }
      })
    ]);
    
    // Filter deletedAt in code (MongoDB null query bug)
    const totalActiveUsers = allActiveUsers.filter(u => !u.deletedAt).length;

    res.json({
      success: true,
      stats: {
        totalActiveUsers,
        checkedInUsers,
        todayLocations,
        todayCheckIns
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
