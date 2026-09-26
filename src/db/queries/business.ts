import { eq, or } from 'drizzle-orm';
import { db } from '../index';
import { businesses, users } from '../schema';

export interface BusinessProfileResult {
  id: string;
  userId: string | null;
  companyName: string;
  industry: string | null;
  regNumber: string | null;
  vatNumber: string | null;
  status: string;
  trustScore: number;
  description: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  location: string | null;
  email: string | null;
  coverImageUrl: string | null;
  tagline: string | null;
  verifiedAt: Date | null;
  certificateSerial: string | null;
  certificateCheckCode: string | null;
  connectionsCount: number;
}

/**
 * Strict Drizzle ORM query guaranteeing email, phone, website, and address
 * are explicitly fetched without data hydration gaps.
 */
export async function getBusinessProfile(businessIdOrUserId: string): Promise<BusinessProfileResult | null> {
  if (!businessIdOrUserId) return null;

  try {
    const rows = await db
      .select({
        id: businesses.id,
        userId: businesses.userId,
        companyName: businesses.companyName,
        industry: businesses.industry,
        regNumber: businesses.regNumber,
        vatNumber: businesses.vatNumber,
        status: businesses.status,
        trustScore: businesses.trustScore,
        description: businesses.description,
        website: businesses.website,
        phone: businesses.phone,
        address: businesses.address,
        // businesses has no location/certificate/connection-count columns in
        // the live database (they exist only in this schema file), and
        // selecting them made the whole query fail — so the contact card
        // silently rendered nothing. Location comes from the owner instead;
        // certificates live in their own table (lib/certificates).
        location: users.location,
        coverImageUrl: businesses.coverImageUrl,
        tagline: businesses.tagline,
        verifiedAt: businesses.verifiedAt,
        userEmail: users.email,
      })
      .from(businesses)
      .leftJoin(users, eq(businesses.userId, users.id))
      .where(
        or(
          eq(businesses.id, businessIdOrUserId),
          eq(businesses.userId, businessIdOrUserId)
        )
      )
      .limit(1);

    if (!rows || rows.length === 0) return null;

    const b = rows[0];
    return {
      id: b.id,
      userId: b.userId,
      companyName: b.companyName,
      industry: b.industry,
      regNumber: b.regNumber,
      vatNumber: b.vatNumber,
      status: b.status || 'unregistered',
      trustScore: b.trustScore || 0,
      description: b.description,
      website: b.website?.trim() || null,
      phone: b.phone?.trim() || null,
      address: b.address?.trim() || null,
      location: b.location?.trim() || null,
      email: b.userEmail?.trim() || null,
      coverImageUrl: b.coverImageUrl,
      tagline: b.tagline,
      verifiedAt: b.verifiedAt,
      certificateSerial: null,
      certificateCheckCode: null,
      connectionsCount: 0,
    };
  } catch (error) {
    console.error('getBusinessProfile error:', error);
    return null;
  }
}
