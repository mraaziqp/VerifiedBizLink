import React from 'react';
import { Globe, Phone, MapPin, Mail, Building2, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { getBusinessProfile, type BusinessProfileResult } from '@/db/queries/business';
import { cn } from '@/lib/utils';

export interface BusinessContactCardProps {
  businessId?: string;
  profile?: BusinessProfileResult;
  className?: string;
}

/**
 * React Server Component: BusinessContactCard
 * Fetches the business profile via strict Drizzle ORM query.
 * Explicitly checks email, phone, website, and address.
 * If any field is null or empty, gracefully collapses that row without breaking
 * layout or leaving empty visual gaps.
 * Uses high-contrast accessible typography (zero low-contrast yellows).
 */
export async function BusinessContactCard({
  businessId,
  profile: directProfile,
  className,
}: BusinessContactCardProps) {
  let profile = directProfile;
  if (!profile && businessId) {
    profile = (await getBusinessProfile(businessId)) || undefined;
  }

  if (!profile) {
    return null;
  }

  const { website, phone, address, location, email } = profile;
  const fullAddress = address || location;

  const hasAnyContact = Boolean(website || phone || fullAddress || email);

  if (!hasAnyContact) {
    return null;
  }

  return (
    <Card className={cn('border border-slate-200 bg-white shadow-xs rounded-2xl overflow-hidden', className)}>
      <CardContent className="p-5 space-y-3.5">
        <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest flex items-center gap-1.5">
          <Building2 className="h-4 w-4 text-slate-700" />
          Verified Contact Information
        </h3>

        <div className="space-y-2.5 divide-y divide-slate-100">
          {/* Website Row - Only rendered if present */}
          {website && (
            <div className="pt-1.5 first:pt-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Official Website
              </span>
              <a
                href={website.startsWith('http') ? website : `https://${website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline font-semibold group break-all"
              >
                <Globe className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-blue-600 transition-colors" />
                <span>{website.replace(/^https?:\/\//, '')}</span>
                <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
              </a>
            </div>
          )}

          {/* Email Row - Only rendered if present */}
          {email && (
            <div className="pt-2 first:pt-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Direct Email
              </span>
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2 text-sm text-slate-800 hover:text-blue-600 hover:underline font-medium break-all"
              >
                <Mail className="h-4 w-4 shrink-0 text-slate-500" />
                <span>{email}</span>
              </a>
            </div>
          )}

          {/* Phone Row - Only rendered if present */}
          {phone && (
            <div className="pt-2 first:pt-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Telephone
              </span>
              <a
                href={`tel:${phone.replace(/\s+/g, '')}`}
                className="flex items-center gap-2 text-sm text-slate-800 hover:text-slate-900 font-medium"
              >
                <Phone className="h-4 w-4 shrink-0 text-slate-500" />
                <span>{phone}</span>
              </a>
            </div>
          )}

          {/* Address Row - Only rendered if present */}
          {fullAddress && (
            <div className="pt-2 first:pt-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Registered Address / Location
              </span>
              <div className="flex items-start gap-2 text-sm text-slate-800 font-medium">
                <MapPin className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
                <span className="leading-relaxed">{fullAddress}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
