// Scheduled Tasks Service
// Handles auto checkout at 10 PM and hourly report submissions

const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { PrismaClient: TrackingPrismaClient } = require('../generated/tracking-client');

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
        const [meetings, calls, leads, tasks] = await Promise.all([
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
          
          // Count calls (from lead interactions)
          trackingDb.lead.count({
            where: {
              userId: checkIn.userId,
              updatedAt: {
                gte: startOfHour,
                lt: endOfHour
              },
              source: 'PHONE_CALL'
            }
          }),
          
          // Count new leads
          trackingDb.lead.count({
            where: {
              userId: checkIn.userId,
              createdAt: {
                gte: startOfHour,
                lt: endOfHour
              }
            }
          }),
          
          // Count tasks completed
          trackingDb.task.count({
            where: {
              userId: checkIn.userId,
              status: 'COMPLETED',
              completedAt: {
                gte: startOfHour,
                lt: endOfHour
              }
            }
          })
        ]);

        // Create auto report
        const report = await db.report.create({
          data: {
            userId: checkIn.userId,
            date: now,
            meetingsCount: meetings,
            callsCount: calls,
            leadsCount: leads,
            tasksCount: tasks,
            notes: `Auto-generated report for ${startOfHour.toLocaleTimeString()} - ${endOfHour.toLocaleTimeString()}`,
            isAutoGenerated: true,
            submittedAt: now
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
function startScheduledTasks() {
  console.log('🚀 Starting scheduled tasks...');
  autoCheckout.start();
  autoReportSubmission.start();
  console.log('✅ Scheduled tasks started:');
  console.log('  - Auto checkout at 10 PM daily');
  console.log('  - Auto report submission every hour');
}

// Stop all scheduled tasks
function stopScheduledTasks() {
  console.log('🛑 Stopping scheduled tasks...');
  autoCheckout.stop();
  autoReportSubmission.stop();
  console.log('✅ Scheduled tasks stopped');
}

module.exports = {
  startScheduledTasks,
  stopScheduledTasks
};
