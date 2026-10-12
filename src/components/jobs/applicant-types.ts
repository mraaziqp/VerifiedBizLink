import type { ApplicationStatus, PortfolioLink } from '@/lib/talent';

/** One application as the employer's applicant manager lists it. */
export interface Applicant {
  id: string;
  status: ApplicationStatus;
  coverNote: string | null;
  matchScore: number | null;
  createdAt: string;
  statusNote: string | null;
  statusChangedAt: string | null;
  employerNotes: string;
  unreadMessages: number;
  /** As they were when the application was sent. */
  headline: string | null;
  skills: string[];
  cvUrl: string | null;
  cvFileName: string | null;
  cvPreview: 'pdf' | 'image' | null;
  applicant: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    location: string | null;
  };
}

/** The candidate's profile as it stands today; loaded when their drawer opens. */
export interface ApplicantProfile {
  summary: string | null;
  yearsExperience: number | null;
  openToWork: boolean;
  portfolioLinks: PortfolioLink[];
  workHistory: { title?: string; company?: string; period?: string; description?: string }[];
  education: { qualification?: string; institution?: string; year?: string }[];
}

export interface ApplicationEvent {
  id: string;
  kind: 'applied' | 'status' | 'withdrawn';
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus | null;
  detail: string | null;
  hasMessage: boolean;
  createdAt: string;
  byMe: boolean;
  actorName: string | null;
}
