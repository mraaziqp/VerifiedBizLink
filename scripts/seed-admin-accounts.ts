/**
 * Seed Script - Create Test Admin Accounts
 *
 * This script creates test accounts for Ramoen (admin) and Wesley (banker)
 *
 * Usage:
 * npx ts-node scripts/seed-admin-accounts.ts
 *
 * Environment variables required:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (use this for admin access)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const testAccounts = [
  {
    email: 'ramoen@verifiedbizlink.co.za',
    password: 'TestPass123!',
    fullName: 'Ramoen - Lead Admin',
    businessName: 'Ramoen Verification Co',
    role: 'admin',
  },
  {
    email: 'wesley@verifiedbizlink.co.za',
    password: 'TestPass123!',
    fullName: 'Wesley - Banking Specialist',
    businessName: 'Wesley Banking Services',
    role: 'banker',
  },
];

async function seedAccounts() {
  console.log('🌱 Starting admin account seeding...\n');

  for (const account of testAccounts) {
    try {
      console.log(`Creating account: ${account.email}`);

      // Create auth user
      const { data, error: authError } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true, // Auto-confirm email
      });

      if (authError) {
        if (authError.message.includes('already exists')) {
          console.log(`⚠️  Account already exists: ${account.email}`);
          continue;
        }
        throw authError;
      }

      const userId = data?.user?.id;
      if (!userId) {
        throw new Error('No user ID returned from auth creation');
      }

      // Create user profile in users table
      const { error: profileError } = await supabase
        .from('users')
        .insert([
          {
            id: userId,
            email: account.email,
            full_name: account.fullName,
            role: account.role,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);

      if (profileError) {
        throw profileError;
      }

      // Create business profile
      const { error: businessError } = await supabase
        .from('businesses')
        .insert([
          {
            user_id: userId,
            company_name: account.businessName,
            status: 'active',
            created_at: new Date().toISOString(),
          },
        ]);

      if (businessError) {
        console.warn(`⚠️  Business profile creation warning: ${businessError.message}`);
        // Don't fail if business profile fails - they can set it up manually
      }

      console.log(`✅ Created: ${account.email} (${account.role})\n`);
    } catch (error) {
      console.error(`❌ Error creating ${account.email}:`);
      console.error(error);
      console.log('');
    }
  }

  console.log('🎉 Seeding complete!\n');
  console.log('Test Credentials:');
  console.log('─'.repeat(50));
  testAccounts.forEach(account => {
    console.log(`Email:    ${account.email}`);
    console.log(`Password: ${account.password}`);
    console.log(`Role:     ${account.role}`);
    console.log('');
  });
}

seedAccounts().catch(console.error);
