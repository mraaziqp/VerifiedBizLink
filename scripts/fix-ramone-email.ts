#!/usr/bin/env tsx

import db from '@/lib/db';

async function fixRamoneEmail() {
  try {
    console.log('Updating Ramoen to Ramone...');

    const result = await db`
      UPDATE users
      SET email = 'ramone@verifiedbizlink.co.za',
          full_name = 'Ramone - Lead Admin'
      WHERE email = 'ramoen@verifiedbizlink.co.za'
      RETURNING id, email, full_name, role
    `;

    if (result.length === 0) {
      console.log('No user found with email ramoen@verifiedbizlink.co.za');
      return;
    }

    console.log('✅ Email updated successfully!');
    console.log(result[0]);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixRamoneEmail();
