'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, businesses } from '@/db/schema';
import { createSession, setSessionCookie, getSession } from '@/lib/auth';

const BasicUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  userType: z.enum(['job_seeker', 'customer']).default('customer'),
});

export type RegisterBasicUserInput = z.infer<typeof BasicUserSchema>;

/**
 * Frictionless Server Action to register "Job Seeker" or "Shopper/Customer" users.
 * Strictly requires only firstName, lastName, email, and password.
 * Bypasses mandatory email verification gates (email_verified: true, requires_verification: false).
 */
export async function registerBasicUser(formData: FormData | RegisterBasicUserInput) {
  const rawData = formData instanceof FormData
    ? {
        firstName: formData.get('firstName') as string,
        lastName: formData.get('lastName') as string,
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        userType: (formData.get('userType') as string) || 'customer',
      }
    : formData;

  const parsed = BasicUserSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || 'Validation failed',
    };
  }

  const { firstName, lastName, email, password, userType } = parsed.data;

  try {
    // Check if user already exists
    const existing = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return {
        success: false,
        error: 'An account with this email already exists',
      };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    // Insert user into Drizzle ORM
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName,
        role: 'customer',
        userType, // 'job_seeker' or 'customer'
        requiresVerification: false, // Bypass verification gate
        emailVerified: true,         // Immediately verified
        onboardingCompleted: true,
      })
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        userType: users.userType,
      });

    // Create session and set cookie
    const token = await createSession({
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName || fullName,
      role: newUser.role || 'customer',
      avatarUrl: '',
      headline: userType === 'job_seeker' ? 'Job Seeker' : 'Shopper / Member',
      emailVerified: true,
    });

    await setSessionCookie(token);

    return {
      success: true,
      user: newUser,
      message: 'Account created successfully',
    };
  } catch (error) {
    console.error('registerBasicUser server action error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed',
    };
  }
}

const BusinessProfileSchema = z.object({
  companyName: z.string().min(2, 'Company name is required').max(255),
  industry: z.string().optional().default(''),
  regNumber: z.string().optional().default(''),
  vatNumber: z.string().optional().default(''),
  description: z.string().optional().default(''),
  website: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  address: z.string().optional().default(''),
  location: z.string().optional().default(''),
});

/**
 * Next.js Server Action for Business Profile Creation.
 * Upon successful database insertion, automatically triggers redirect('/pricing')
 * to seamlessly route the user to view subscription tiers.
 */
export async function createBusinessProfile(formData: FormData) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const rawData = {
    companyName: formData.get('companyName') as string,
    industry: (formData.get('industry') as string) || '',
    regNumber: (formData.get('regNumber') as string) || '',
    vatNumber: (formData.get('vatNumber') as string) || '',
    description: (formData.get('description') as string) || '',
    website: (formData.get('website') as string) || '',
    phone: (formData.get('phone') as string) || '',
    address: (formData.get('address') as string) || '',
    location: (formData.get('location') as string) || '',
  };

  const parsed = BusinessProfileSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || 'Invalid form data',
    };
  }

  try {
    // Insert business profile
    await db.insert(businesses).values({
      userId: session.id,
      companyName: parsed.data.companyName.trim(),
      industry: parsed.data.industry.trim(),
      regNumber: parsed.data.regNumber.trim(),
      vatNumber: parsed.data.vatNumber.trim(),
      description: parsed.data.description.trim(),
      website: parsed.data.website.trim(),
      phone: parsed.data.phone.trim(),
      address: parsed.data.address.trim(),
      location: parsed.data.location.trim(),
      status: 'pending',
      trustScore: 20,
    });

    // Update user role to business
    await db
      .update(users)
      .set({
        role: 'business',
        userType: 'business',
        requiresVerification: true,
      })
      .where(eq(users.id, session.id));
  } catch (error) {
    console.error('createBusinessProfile error:', error);
    return {
      success: false,
      error: 'Failed to save business profile',
    };
  }

  // Automated routing: redirect to /pricing upon successful creation
  redirect('/pricing');
}
