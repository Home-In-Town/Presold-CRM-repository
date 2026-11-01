import dotenv from 'dotenv';
import { trackingDb } from '../src/config/tracking-db.js';
import prisma from '../src/config/database.js';

dotenv.config();

async function checkAllCheckIns() {
  try {
    console.log('Checking ALL check-in records in database...\n');

    const allRecords = await trackingDb.checkInOut.findMany({
      orderBy: {
        checkInTime: 'desc'
      },
      take: 20  // Last 20 records
    });

    console.log(`Found ${allRecords.length} most recent check-in records:\n`);
    
    // Fetch user details for each record
    for (let i = 0; i < allRecords.length; i++) {
      const record = allRecords[i];
      const user = await prisma.user.findUnique({
        where: { id: record.userId },
        select: { id: true, name: true, email: true }
      });
      
      console.log(`${i + 1}. ${user ? user.name : 'Unknown User'} (${user ? user.email : 'N/A'})`);
      console.log(`   Status: ${record.status}`);
      console.log(`   Check-in: ${record.checkInTime}`);
      console.log(`   Check-out: ${record.checkOutTime || 'Still checked in'}`);
      console.log('');
    }

    // Check count by status
    const checkedInCount = await trackingDb.checkInOut.count({
      where: { status: 'CHECKED_IN' }
    });
    
    console.log(`\nCurrently CHECKED_IN: ${checkedInCount} users`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await trackingDb.$disconnect();
    await prisma.$disconnect();
  }
}

checkAllCheckIns();
