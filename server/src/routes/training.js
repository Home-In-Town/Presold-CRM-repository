import express from 'express';
import { authenticate } from '../middleware/auth.js';
import prisma from '../config/database.js';
import multer from 'multer';
import { GridFSBucket } from 'mongodb';
import { Readable } from 'stream';
import mongoose from 'mongoose';

const router = express.Router();

// Configure multer for video upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

// Helper: Upload video to GridFS
async function uploadVideoToGridFS(file) {
  const db = mongoose.connection.db;
  const bucket = new GridFSBucket(db, { bucketName: 'training_videos' });
  
  const uploadStream = bucket.openUploadStream(file.originalname, {
    contentType: file.mimetype,
    metadata: {
      uploadedAt: new Date()
    }
  });

  const readableStream = Readable.from(file.buffer);
  readableStream.pipe(uploadStream);

  return new Promise((resolve, reject) => {
    uploadStream.on('finish', () => {
      resolve({
        fileId: uploadStream.id.toString(),
        filename: file.originalname
      });
    });
    uploadStream.on('error', reject);
  });
}

// Helper: Get video stream from GridFS
async function getVideoStream(fileId) {
  const db = mongoose.connection.db;
  const bucket = new GridFSBucket(db, { bucketName: 'training_videos' });
  
  const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
  return downloadStream;
}

// Admin: Create training module with video and MCQ
router.post('/modules', authenticate, upload.single('video'), async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { topicName, description, scheduledDate, scheduledTime, questions } = req.body;

    if (!topicName || !scheduledDate || !scheduledTime) {
      return res.status(400).json({ error: 'Topic name, date, and time are required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Video file is required' });
    }

    // Parse questions JSON
    const parsedQuestions = JSON.parse(questions);
    
    if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
      return res.status(400).json({ error: 'At least one question is required' });
    }

    // Upload video to GridFS
    console.log('📤 Uploading video to GridFS...');
    const { fileId, filename } = await uploadVideoToGridFS(req.file);
    console.log('✅ Video uploaded:', fileId);

    // Create training module
    const module = await prisma.trainingModule.create({
      data: {
        topicName,
        description: description || '',
        videoUrl: `/api/training/videos/${fileId}`,
        videoFileId: fileId,
        scheduledDate: new Date(scheduledDate),
        scheduledTime,
        createdById: req.user.id,
        questions: {
          create: parsedQuestions.map((q, index) => ({
            questionText: q.questionText,
            options: q.options,
            correctAnswer: q.correctAnswer,
            orderIndex: index
          }))
        }
      },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    console.log('✅ Training module created:', module.id);
    res.json({ 
      success: true, 
      module: {
        ...module,
        questionCount: module.questions.length
      }
    });

  } catch (err) {
    console.error('Training module creation error:', err);
    res.status(500).json({ error: err.message || 'Failed to create training module' });
  }
});

// Get video stream (for playback)
router.get('/videos/:fileId', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const db = mongoose.connection.db;
    const bucket = new GridFSBucket(db, { bucketName: 'training_videos' });
    
    // Get file info
    const files = await bucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
    if (files.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    const file = files[0];
    
    // Handle range requests for video streaming
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : file.length - 1;
      const chunksize = (end - start) + 1;
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${file.length}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': file.contentType
      });
      
      const downloadStream = bucket.openDownloadStream(file._id, { start, end: end + 1 });
      downloadStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': file.length,
        'Content-Type': file.contentType
      });
      
      const downloadStream = bucket.openDownloadStream(file._id);
      downloadStream.pipe(res);
    }
    
  } catch (err) {
    console.error('Video stream error:', err);
    res.status(500).json({ error: 'Failed to stream video' });
  }
});

// Admin: Get all training modules
router.get('/modules', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const modules = await prisma.trainingModule.findMany({
      include: {
        questions: {
          select: {
            id: true,
            questionText: true,
            options: true,
            correctAnswer: true,
            orderIndex: true
          },
          orderBy: { orderIndex: 'asc' }
        },
        completions: {
          select: {
            userId: true,
            quizCompleted: true,
            score: true,
            percentage: true
          }
        }
      },
      orderBy: { scheduledDate: 'desc' }
    });

    res.json({ modules });
  } catch (err) {
    console.error('Get modules error:', err);
    res.status(500).json({ error: 'Failed to fetch training modules' });
  }
});

// Admin: Get completion stats for a module
router.get('/modules/:moduleId/stats', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { moduleId } = req.params;

    const completions = await prisma.trainingCompletion.findMany({
      where: { moduleId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { quizCompletedAt: 'desc' }
    });

    const stats = {
      totalUsers: await prisma.user.count({ where: { role: { not: 'ADMIN' }, isActive: true } }),
      completed: completions.filter(c => c.quizCompleted).length,
      pending: completions.filter(c => !c.quizCompleted).length,
      averageScore: completions.filter(c => c.percentage !== null).reduce((sum, c) => sum + c.percentage, 0) / completions.filter(c => c.percentage !== null).length || 0,
      completions: completions.map(c => ({
        userId: c.userId,
        userName: c.user.name,
        userEmail: c.user.email,
        videoWatched: c.videoWatched,
        quizCompleted: c.quizCompleted,
        score: c.score,
        totalQuestions: c.totalQuestions,
        percentage: c.percentage,
        completedAt: c.quizCompletedAt
      }))
    };

    res.json({ stats });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// User: Get available/scheduled training modules
router.get('/my-modules', authenticate, async (req, res) => {
  try {
    const now = new Date();
    
    // Get modules scheduled for today or past
    const modules = await prisma.trainingModule.findMany({
      where: {
        isActive: true,
        scheduledDate: {
          lte: now
        }
      },
      include: {
        questions: {
          select: {
            id: true,
            questionText: true,
            options: true,
            orderIndex: true
            // Don't include correctAnswer for users
          },
          orderBy: { orderIndex: 'asc' }
        },
        completions: {
          where: { userId: req.user.id },
          select: {
            videoWatched: true,
            quizCompleted: true,
            score: true,
            totalQuestions: true,
            percentage: true,
            quizCompletedAt: true
          }
        }
      },
      orderBy: { scheduledDate: 'desc' }
    });

    // Format response
    const formattedModules = modules.map(module => ({
      id: module.id,
      topicName: module.topicName,
      description: module.description,
      videoUrl: module.videoUrl,
      scheduledDate: module.scheduledDate,
      scheduledTime: module.scheduledTime,
      questionCount: module.questions.length,
      questions: module.questions,
      completion: module.completions[0] || null
    }));

    res.json({ modules: formattedModules });
  } catch (err) {
    console.error('Get my modules error:', err);
    res.status(500).json({ error: 'Failed to fetch training modules' });
  }
});

// User: Mark video as watched
router.post('/modules/:moduleId/watch', authenticate, async (req, res) => {
  try {
    const { moduleId } = req.params;

    const completion = await prisma.trainingCompletion.upsert({
      where: {
        moduleId_userId: {
          moduleId,
          userId: req.user.id
        }
      },
      update: {
        videoWatched: true,
        videoWatchedAt: new Date()
      },
      create: {
        moduleId,
        userId: req.user.id,
        videoWatched: true,
        videoWatchedAt: new Date()
      }
    });

    res.json({ success: true, completion });
  } catch (err) {
    console.error('Mark video watched error:', err);
    res.status(500).json({ error: 'Failed to mark video as watched' });
  }
});

// User: Submit quiz answers
router.post('/modules/:moduleId/submit-quiz', authenticate, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { answers } = req.body; // answers: { questionId: selectedOptionIndex }

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'Answers are required' });
    }

    // Get module with questions
    const module = await prisma.trainingModule.findUnique({
      where: { id: moduleId },
      include: {
        questions: true
      }
    });

    if (!module) {
      return res.status(404).json({ error: 'Training module not found' });
    }

    // Calculate score
    let correctCount = 0;
    const totalQuestions = module.questions.length;

    module.questions.forEach(question => {
      const userAnswer = answers[question.id];
      if (userAnswer === question.correctAnswer) {
        correctCount++;
      }
    });

    const percentage = (correctCount / totalQuestions) * 100;

    // Save completion
    const completion = await prisma.trainingCompletion.upsert({
      where: {
        moduleId_userId: {
          moduleId,
          userId: req.user.id
        }
      },
      update: {
        quizCompleted: true,
        quizCompletedAt: new Date(),
        score: correctCount,
        totalQuestions,
        percentage,
        answers
      },
      create: {
        moduleId,
        userId: req.user.id,
        videoWatched: true,
        videoWatchedAt: new Date(),
        quizCompleted: true,
        quizCompletedAt: new Date(),
        score: correctCount,
        totalQuestions,
        percentage,
        answers
      }
    });

    res.json({
      success: true,
      score: correctCount,
      totalQuestions,
      percentage: Math.round(percentage),
      completion
    });

  } catch (err) {
    console.error('Submit quiz error:', err);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

// Admin: Delete training module
router.delete('/modules/:moduleId', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { moduleId } = req.params;

    // Get module to get video file ID
    const module = await prisma.trainingModule.findUnique({
      where: { id: moduleId }
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    // Delete video from GridFS
    if (module.videoFileId) {
      const db = mongoose.connection.db;
      const bucket = new GridFSBucket(db, { bucketName: 'training_videos' });
      await bucket.delete(new mongoose.Types.ObjectId(module.videoFileId));
    }

    // Delete module (cascade will delete questions and completions)
    await prisma.trainingModule.delete({
      where: { id: moduleId }
    });

    res.json({ success: true, message: 'Training module deleted' });
  } catch (err) {
    console.error('Delete module error:', err);
    res.status(500).json({ error: 'Failed to delete training module' });
  }
});

export default router;
