import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { uploadToGridFS, streamFromGridFS, deleteFromGridFS } from '../config/gridfs.js';
import multer from 'multer';
import { trackingDb } from '../config/database.js';

const router = express.Router();

// Multer configuration for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max for audio files
  }
});

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  next();
};

// POST /api/meetings - Create a new meeting
router.post('/', authenticate, upload.fields([
  { name: 'selfie', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
  { name: 'visitingCard', maxCount: 1 }
]), async (req, res) => {
  try {
    const {
      meetingDateTime,
      latitude,
      longitude,
      locationAddress,
      officeName,
      officeAddress,
      placeNote,
      conversation,
      audioDuration,
      role,
      personName,
      personContact,
      leadId,  // Add leadId field
      status
    } = req.body;

    // Validate required fields
    if (!officeName || !officeAddress || !role || !personName || !personContact) {
      return res.status(400).json({ 
        error: 'Required fields: officeName, officeAddress, role, personName, personContact' 
      });
    }

    // Validate role
    if (!['OWNER', 'PO', 'BROKER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be OWNER, PO, or BROKER' });
    }

    let selfieUrl = null, selfieFileId = null;
    let audioUrl = null, audioFileId = null;
    let visitingCardUrl = null, visitingCardFileId = null;

    // Upload selfie to GridFS
    if (req.files?.selfie && req.files.selfie[0]) {
      const selfieFile = req.files.selfie[0];
      const result = await uploadToGridFS(selfieFile.buffer, selfieFile.originalname, selfieFile.mimetype);
      selfieFileId = result.fileId;
      selfieUrl = result.url;
    }

    // Upload audio to GridFS
    if (req.files?.audio && req.files.audio[0]) {
      const audioFile = req.files.audio[0];
      const result = await uploadToGridFS(audioFile.buffer, audioFile.originalname, audioFile.mimetype);
      audioFileId = result.fileId;
      audioUrl = result.url;
    }

    // Upload visiting card to GridFS
    if (req.files?.visitingCard && req.files.visitingCard[0]) {
      const cardFile = req.files.visitingCard[0];
      const result = await uploadToGridFS(cardFile.buffer, cardFile.originalname, cardFile.mimetype);
      visitingCardFileId = result.fileId;
      visitingCardUrl = result.url;
    }

    // Create meeting
    const meeting = await trackingDb.meeting.create({
      data: {
        selfieUrl,
        selfieFileId,
        meetingDateTime: meetingDateTime ? new Date(meetingDateTime) : new Date(),
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        locationAddress: locationAddress || null,
        officeName,
        officeAddress,
        placeNote: placeNote || null,
        conversation: conversation || null,
        audioUrl,
        audioFileId,
        audioDuration: audioDuration ? parseInt(audioDuration) : null,
        role,
        personName,
        personContact,
        visitingCardUrl,
        visitingCardFileId,
        leadId: leadId || null,  // Link to lead
        status: status || 'COMPLETED',
        userId: req.user.id
      }
    });

    res.json({
      success: true,
      meeting
    });
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

// ADMIN ROUTES (must come BEFORE /:id route to prevent route matching issues)

// GET /api/meetings/admin/all - Get all meetings (Admin only)
router.get('/admin/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId, startDate, endDate, status, limit = 50, offset = 0 } = req.query;

    const whereClause = {};

    if (userId) {
      whereClause.userId = userId;
    }

    if (status) {
      whereClause.status = status;
    }

    if (startDate && endDate) {
      whereClause.meetingDateTime = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // Fetch meetings and filter out null userId in JavaScript
    const allMeetings = await trackingDb.meeting.findMany({
      where: whereClause,
      orderBy: {
        meetingDateTime: 'desc'
      }
    });

    // Filter out meetings with null or undefined userId
    const validMeetings = allMeetings.filter(m => m.userId);
    
    // Apply pagination after filtering
    const meetings = validMeetings.slice(parseInt(offset), parseInt(offset) + parseInt(limit));
    const total = validMeetings.length;

    res.json({
      success: true,
      meetings,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get all meetings error:', error);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// GET /api/meetings/admin/stats - Get meeting statistics (Admin only)
router.get('/admin/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalMeetings,
      todayMeetings,
      completedMeetings,
      draftMeetings,
      meetingsByRole
    ] = await Promise.all([
      trackingDb.meeting.count(),
      trackingDb.meeting.count({
        where: {
          meetingDateTime: {
            gte: today
          }
        }
      }),
      trackingDb.meeting.count({
        where: {
          status: 'COMPLETED'
        }
      }),
      trackingDb.meeting.count({
        where: {
          status: 'DRAFT'
        }
      }),
      trackingDb.meeting.groupBy({
        by: ['role'],
        _count: true
      })
    ]);

    res.json({
      success: true,
      stats: {
        totalMeetings,
        todayMeetings,
        completedMeetings,
        draftMeetings,
        meetingsByRole
      }
    });
  } catch (error) {
    console.error('Get meeting stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GET /api/meetings - Get user's meetings
router.get('/', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, status, limit = 50, offset = 0 } = req.query;

    const whereClause = {
      userId: req.user.id
    };

    if (status) {
      whereClause.status = status;
    }

    if (startDate && endDate) {
      whereClause.meetingDateTime = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const [meetings, total] = await Promise.all([
      trackingDb.meeting.findMany({
        where: whereClause,
        orderBy: {
          meetingDateTime: 'desc'
        },
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      trackingDb.meeting.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      meetings,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// GET /api/meetings/:id - Get specific meeting
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const meeting = await trackingDb.meeting.findUnique({
      where: { id }
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Check if user has permission to view this meeting
    if (meeting.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      meeting
    });
  } catch (error) {
    console.error('Get meeting error:', error);
    res.status(500).json({ error: 'Failed to fetch meeting' });
  }
});

// PUT /api/meetings/:id - Update meeting
router.put('/:id', authenticate, upload.fields([
  { name: 'selfie', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
  { name: 'visitingCard', maxCount: 1 }
]), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      meetingDateTime,
      latitude,
      longitude,
      locationAddress,
      officeName,
      officeAddress,
      placeNote,
      conversation,
      audioDuration,
      role,
      personName,
      personContact,
      status
    } = req.body;

    // Check if meeting exists and user has permission
    const existingMeeting = await trackingDb.meeting.findUnique({
      where: { id }
    });

    if (!existingMeeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    if (existingMeeting.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updateData = {};

    if (meetingDateTime) updateData.meetingDateTime = new Date(meetingDateTime);
    if (latitude !== undefined) updateData.latitude = parseFloat(latitude);
    if (longitude !== undefined) updateData.longitude = parseFloat(longitude);
    if (locationAddress !== undefined) updateData.locationAddress = locationAddress;
    if (officeName) updateData.officeName = officeName;
    if (officeAddress) updateData.officeAddress = officeAddress;
    if (placeNote !== undefined) updateData.placeNote = placeNote;
    if (conversation !== undefined) updateData.conversation = conversation;
    if (audioDuration !== undefined) updateData.audioDuration = parseInt(audioDuration);
    if (role) updateData.role = role;
    if (personName) updateData.personName = personName;
    if (personContact) updateData.personContact = personContact;
    if (status) updateData.status = status;

    // Handle file uploads
    if (req.files?.selfie && req.files.selfie[0]) {
      // Delete old selfie if exists
      if (existingMeeting.selfieFileId) {
        await deleteFromGridFS(existingMeeting.selfieFileId);
      }
      const selfieFile = req.files.selfie[0];
      const result = await uploadToGridFS(selfieFile.buffer, selfieFile.originalname, selfieFile.mimetype);
      updateData.selfieUrl = result.url;
      updateData.selfieFileId = result.fileId;
    }

    if (req.files?.audio && req.files.audio[0]) {
      // Delete old audio if exists
      if (existingMeeting.audioFileId) {
        await deleteFromGridFS(existingMeeting.audioFileId);
      }
      const audioFile = req.files.audio[0];
      const result = await uploadToGridFS(audioFile.buffer, audioFile.originalname, audioFile.mimetype);
      updateData.audioUrl = result.url;
      updateData.audioFileId = result.fileId;
    }

    if (req.files?.visitingCard && req.files.visitingCard[0]) {
      // Delete old visiting card if exists
      if (existingMeeting.visitingCardFileId) {
        await deleteFromGridFS(existingMeeting.visitingCardFileId);
      }
      const cardFile = req.files.visitingCard[0];
      const result = await uploadToGridFS(cardFile.buffer, cardFile.originalname, cardFile.mimetype);
      updateData.visitingCardUrl = result.url;
      updateData.visitingCardFileId = result.fileId;
    }

    const meeting = await trackingDb.meeting.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      meeting
    });
  } catch (error) {
    console.error('Update meeting error:', error);
    res.status(500).json({ error: 'Failed to update meeting' });
  }
});

// DELETE /api/meetings/:id - Delete meeting
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const meeting = await trackingDb.meeting.findUnique({
      where: { id }
    });

    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    if (meeting.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete associated files from GridFS
    if (meeting.selfieFileId) {
      await deleteFromGridFS(meeting.selfieFileId);
    }
    if (meeting.audioFileId) {
      await deleteFromGridFS(meeting.audioFileId);
    }
    if (meeting.visitingCardFileId) {
      await deleteFromGridFS(meeting.visitingCardFileId);
    }

    await trackingDb.meeting.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Meeting deleted successfully'
    });
  } catch (error) {
    console.error('Delete meeting error:', error);
    res.status(500).json({ error: 'Failed to delete meeting' });
  }
});

export default router;
