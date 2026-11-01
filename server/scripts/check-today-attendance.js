import dotenv from 'dotenv';
import { trackingDb } from '../src/config/tracking-db.js';
import prisma from '../src/config/database.js';

dotenv.config();

async function checkTodayAttendance() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log('Checking attendance records for today (after midnight)...\n');

    const records = await trackingDb.checkInOut.findMany({
      where: {
        checkInTime: {
          gte: today
        }
      },
      orderBy: {
        checkInTime: 'desc'
      }
    });

    console.log(`Found ${records.length} check-in records for today:\n`);
    
    // Fetch user details for each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const user = await prisma.user.findUnique({
        where: { id: record.userId },
        select: { id: true, name: true, email: true }
      });
      
      console.log(`${i + 1}. ${user ? user.name : 'Unknown User'} (${user ? user.email : 'N/A'})`);
      console.log(`   User ID: ${record.userId}`);
      console.log(`   Status: ${record.status}`);
      console.log(`   Check-in: ${record.checkInTime}`);
      console.log(`   Check-out: ${record.checkOutTime || 'Still checked in'}`);
      console.log(`   Location: ${record.checkInAddress || `${record.checkInLat}, ${record.checkInLng}`}`);
      console.log('');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await trackingDb.$disconnect();
    await prisma.$disconnect();
  }
}

checkTodayAttendance();
