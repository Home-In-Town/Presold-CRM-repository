import dotenv from 'dotenv';
import { trackingDb } from '../src/config/tracking-db.js';
import prisma from '../src/config/database.js';

dotenv.config();

async function checkPrathmeshData() {
  try {
    // Find Prathmesh user
    const user = await prisma.user.findFirst({
      where: {
        email: 'prathmeshofficial77@gmail.com'
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    console.log(`Found user: ${user.name} (${user.email})`);
    console.log(`User ID: ${user.id}\n`);

    // Check today's check-ins
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayCheckIns = await trackingDb.checkInOut.findMany({
      where: {
        userId: user.id,
        checkInTime: {
          gte: today
        }
      },
      orderBy: {
        checkInTime: 'desc'
      }
    });

    console.log(`Check-ins today: ${todayCheckIns.length}`);
    todayCheckIns.forEach(record => {
      console.log(`- Status: ${record.status}, Check-in: ${record.checkInTime}, Check-out: ${record.checkOutTime || 'N/A'}`);
    });

    // Check any CHECKED_IN status
    const currentCheckIn = await trackingDb.checkInOut.findFirst({
      where: {
        userId: user.id,
        status: 'CHECKED_IN'
      },
      orderBy: {
        checkInTime: 'desc'
      }
    });

    console.log(`\nCurrently CHECKED_IN: ${currentCheckIn ? 'YES' : 'NO'}`);
    if (currentCheckIn) {
      console.log(`Check-in time: ${currentCheckIn.checkInTime}`);
    }

    // Check location history today
    const todayLocations = await trackingDb.locationHistory.findMany({
      where: {
        userId: user.id,
        timestamp: {
          gte: today
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 10
    });

    console.log(`\nLocation points today: ${todayLocations.length}`);
    if (todayLocations.length > 0) {
      console.log('Most recent locations:');
      todayLocations.forEach((loc, i) => {
        console.log(`${i + 1}. ${loc.timestamp} - (${loc.latitude}, ${loc.longitude})`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await trackingDb.$disconnect();
    await prisma.$disconnect();
  }
}

checkPrathmeshData();
