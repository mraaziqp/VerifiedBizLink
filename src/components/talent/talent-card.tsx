import type { ReactNode } from 'react';
import { FileText, Link2, MapPin } from 'lucide-react';
import { PersonAvatar } from '@/components/talent/person-avatar';
import type { PortfolioLink } from '@/lib/talent';
import { cn } from '@/lib/utils';

export interface TalentCardData {
  userId?: string;
  name: string;
  avatarUrl?: string | null;
  headline: string;
  summary?: string | null;
  location?: string | null;
  skills: string[];
  yearsExperience?: number | null;
  openToWork: boolean;
  portfolioLinks?: PortfolioLink[];
  hasCv?: boolean;
}

/**
 * How a person appears to verified employers: in the talent directory, and
 * as the live preview while they are building their profile — the same card
 * in both places, so what they see while editing is what gets seen.
 */
export function TalentCard({
  profile, footer, className, maxSkills = 8,
}: { profile: TalentCardData; footer?: ReactNode; className?: string; maxSkills?: number }) {
  const links = profile.portfolioLinks ?? [];
  return (
    <div className={cn('flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5', className)}>
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <PersonAvatar name={profile.name} src={profile.avatarUrl} size={56} />
          {profile.openToWork && (
            <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-slate-900">{profile.name}</p>
          <p className="line-clamp-2 text-sm text-slate-700">
            {profile.headline || <span className="italic text-slate-400">Your headline goes here</span>}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {profile.openToWork && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Open to work
          </span>
        )}
        {profile.location && (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            <MapPin className="h-3 w-3" /> {profile.location}
          </span>
        )}
        {typeof profile.yearsExperience === 'number' && (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            {profile.yearsExperience === 0 ? 'Starting out' : `${profile.yearsExperience} yr${profile.yearsExperience === 1 ? '' : 's'} experience`}
          </span>
        )}
        {profile.hasCv && (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            <FileText className="h-3 w-3" /> CV on file
          </span>
        )}
      </div>

      {profile.summary && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{profile.summary}</p>}

      {profile.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {profile.skills.slice(0, maxSkills).map((s) => (
            <span key={s} className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white">{s}</span>
          ))}
          {profile.skills.length > maxSkills && (
            <span className="px-1 text-xs text-slate-400">+{profile.skills.length - maxSkills} more</span>
          )}
        </div>
      )}

      {links.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
          {links.slice(0, 4).map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 underline underline-offset-2 hover:text-slate-900"
            >
              <Link2 className="h-3 w-3" /> {link.label}
            </a>
          ))}
        </div>
      )}

      {footer && <div className="mt-auto pt-4">{footer}</div>}
    </div>
  );
}
