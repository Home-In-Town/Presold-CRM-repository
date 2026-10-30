// Scheduled Tasks Service
// Handles auto checkout at 10 PM and hourly report submissions

import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { PrismaClient as TrackingPrismaClient } from '../../node_modules/.prisma/tracking-client/index.js';

const db = new PrismaClient();
const trackingDb = new TrackingPrismaClient();

// Auto checkout at 10 PM every day
const autoCheckout = cron.schedule('0 22 * * *', async () => {
  console.log('🕙 Running auto checkout at 10 PM...');
  
  try {
    const now = new Date();
    
    // Find all users still checked in (status = 'CHECKED_IN')
    const activeCheckIns = await trackingDb.checkInOut.findMany({
      where: {
        status: 'CHECKED_IN'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    console.log(`Found ${activeCheckIns.length} users still checked in`);

    // Auto checkout each user
    for (const checkIn of activeCheckIns) {
      try {
        // Update check-in record
        await trackingDb.checkInOut.update({
          where: { id: checkIn.id },
          data: {
            checkOutTime: now,
            checkOutLat: checkIn.checkInLat, // Use same location as check-in
            checkOutLng: checkIn.checkInLng,
            checkOutAddress: checkIn.checkInAddress || 'Auto checkout',
            status: 'CHECKED_OUT'
          }
        });

        // Sync to main database if AttendanceRecord exists
        const attendanceRecord = await db.attendanceRecord.findFirst({
          where: {
            userId: checkIn.userId,
            date: {
              gte: new Date(checkIn.checkInTime.setHours(0, 0, 0, 0)),
              lt: new Date(checkIn.checkInTime.setHours(23, 59, 59, 999))
            }
          }
        });

        if (attendanceRecord) {
          await db.attendanceRecord.update({
            where: { id: attendanceRecord.id },
            data: {
              checkOutTime: now,
              checkOutLat: checkIn.checkInLat,
              checkOutLng: checkIn.checkInLng,
              status: 'PRESENT'
            }
          });
        }

        console.log(`✅ Auto checked out user: ${checkIn.user.name}`);
      } catch (err) {
        console.error(`Failed to auto checkout user ${checkIn.userId}:`, err);
      }
    }

    console.log('✅ Auto checkout completed');
  } catch (error) {
    console.error('❌ Auto checkout failed:', error);
  }
}, {
  timezone: 'Asia/Kolkata' // Change to your timezone
});

// Auto report submission every hour
const autoReportSubmission = cron.schedule('0 * * * *', async () => {
  const now = new Date();
  console.log(`📊 Running auto report submission at ${now.toLocaleTimeString()}...`);
  
  try {
    // Find all users currently checked in
    const checkedInUsers = await trackingDb.checkInOut.findMany({
      where: {
        status: 'CHECKED_IN'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    console.log(`Found ${checkedInUsers.length} checked-in users`);

    const startOfHour = new Date(now);
    startOfHour.setMinutes(0, 0, 0);
    const endOfHour = new Date(startOfHour);
    endOfHour.setHours(endOfHour.getHours() + 1);

    for (const checkIn of checkedInUsers) {
      try {
        // Count activities in the last hour from TRACKING database
        const [meetings, leads, tasks] = await Promise.all([
          // Count meetings in last hour
          trackingDb.meeting.count({
            where: {
              userId: checkIn.userId,
              createdAt: {
                gte: startOfHour,
                lt: endOfHour
              }
            }
          }),
          
          // Count new leads (from MAIN database)
          db.lead.count({
            where: {
              createdById: checkIn.userId,
              createdAt: {
                gte: startOfHour,
                lt: endOfHour
              }
            }
          }),
          
          // Count tasks completed (from MAIN database)
          db.task.count({
            where: {
              ownerId: checkIn.userId,
              completed: true,
              completedAt: {
                gte: startOfHour,
                lt: endOfHour
              }
            }
          })
        ]);

        // Estimate calls from lead activities (no dedicated call model)
        const calls = 0; // Can be enhanced later

        // Create auto report in MAIN database
        const report = await db.dailyReport.create({
          data: {
            userId: checkIn.userId,
            date: now,
            meetings: meetings,
            calls: calls,
            siteVisits: 0, // Track separately if needed
            demos: 0, // Track separately if needed
            sales: 0, // Track separately if needed
            revenue: 0,
            isAutoGenerated: true,
            createdAt: now,
            updatedAt: now
          }
        });

        console.log(`✅ Auto report created for ${checkIn.user.name}: ${meetings} meetings, ${calls} calls, ${leads} leads, ${tasks} tasks`);
      } catch (err) {
        console.error(`Failed to create auto report for user ${checkIn.userId}:`, err);
      }
    }

    console.log('✅ Auto report submission completed');
  } catch (error) {
    console.error('❌ Auto report submission failed:', error);
  }
}, {
  timezone: 'Asia/Kolkata' // Change to your timezone
});

// Start all scheduled tasks
export function startScheduledTasks() {
  console.log('🚀 Starting scheduled tasks...');
  autoCheckout.start();
  autoReportSubmission.start();
  console.log('✅ Scheduled tasks started:');
  console.log('  - Auto checkout at 10 PM daily');
  console.log('  - Auto report submission every hour');
}

// Stop all scheduled tasks
export function stopScheduledTasks() {
  console.log('🛑 Stopping scheduled tasks...');
  autoCheckout.stop();
  autoReportSubmission.stop();
  console.log('✅ Scheduled tasks stopped');
}
