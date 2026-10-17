import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { trackingDb } from '../config/database.js';

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

export default router;
