'use client';

import { Trophy, Star, Award, TrendingUp, Shield, Users, Zap } from 'lucide-react';

export type BadgeType =
  | 'verified'
  | 'trusted'
  | 'rising-star'
  | 'network-leader'
  | 'quality-champion'
  | 'response-king'
  | 'community-hero';

interface BadgeInfo {
  id: BadgeType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  level: number;
  requirement: string;
}

const BADGES: Record<BadgeType, BadgeInfo> = {
  verified: {
    id: 'verified',
    label: 'Verified Business',
    description: 'Verified through CIPC & SARS',
    icon: <Shield className="h-4 w-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    level: 5,
    requirement: 'CIPC & SARS verification'
  },
  trusted: {
    id: 'trusted',
    label: 'Trusted Partner',
    description: 'High trust score (80+)',
    icon: <Award className="h-4 w-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    level: 4,
    requirement: 'Trust score 80+'
  },
  'rising-star': {
    id: 'rising-star',
    label: 'Rising Star',
    description: 'Rapidly gaining connections',
    icon: <Star className="h-4 w-4" />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    level: 3,
    requirement: '50+ connections in 30 days'
  },
  'network-leader': {
    id: 'network-leader',
    label: 'Network Leader',
    description: 'Strong network influence',
    icon: <Users className="h-4 w-4" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    level: 4,
    requirement: '500+ connections'
  },
  'quality-champion': {
    id: 'quality-champion',
    label: 'Quality Champion',
    description: 'Excellent marketplace rating',
    icon: <Trophy className="h-4 w-4" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    level: 4,
    requirement: '4.8+ stars on 50+ reviews'
  },
  'response-king': {
    id: 'response-king',
    label: 'Response King',
    description: 'Quick and active responder',
    icon: <Zap className="h-4 w-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    level: 3,
    requirement: '<2 hour avg response time'
  },
  'community-hero': {
    id: 'community-hero',
    label: 'Community Hero',
    description: 'Active platform contributor',
    icon: <TrendingUp className="h-4 w-4" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    level: 5,
    requirement: '100+ posts + high engagement'
  }
};

interface BadgeDisplayProps {
  badges: BadgeType[];
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
}

export function BadgeDisplay({ badges, size = 'md', showLabels = true }: BadgeDisplayProps) {
  const sizeMap = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map(badgeId => {
        const badge = BADGES[badgeId];
        return (
          <div key={badge.id} title={badge.description} className={`flex items-center gap-1.5 ${badge.bgColor} ${badge.color} px-2.5 py-1.5 rounded-full border border-current/20`}>
            <div className={sizeMap[size]}>{badge.icon}</div>
            {showLabels && <span className="text-xs font-semibold">{badge.label}</span>}
          </div>
        );
      })}
    </div>
  );
}

interface BadgeGridProps {
  earnedBadges: BadgeType[];
}

export function BadgeGrid({ earnedBadges }: BadgeGridProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Your Badges</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(BADGES).map(([_, badge]) => {
            const isEarned = earnedBadges.includes(badge.id);
            return (
              <div
                key={badge.id}
                className={`rounded-lg p-4 border-2 transition-all ${
                  isEarned
                    ? `${badge.bgColor} border-current/30`
                    : 'bg-gray-50 border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`text-2xl ${isEarned ? badge.color : 'text-gray-400'}`}>
                    {badge.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-semibold ${isEarned ? badge.color : 'text-gray-500'}`}>
                      {badge.label}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">{badge.description}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      <strong>Requirement:</strong> {badge.requirement}
                    </p>
                    {isEarned && (
                      <div className="mt-3">
                        <span className="inline-block bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                          ✓ Earned
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface TrustScoreDisplayProps {
  score: number;
  verified: boolean;
}

export function TrustScoreDisplay({ score, verified }: TrustScoreDisplayProps) {
  const getScoreColor = (s: number) => {
    if (s >= 90) return 'text-green-600';
    if (s >= 70) return 'text-blue-600';
    if (s >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (s: number) => {
    if (s >= 90) return 'Excellent';
    if (s >= 70) return 'Good';
    if (s >= 50) return 'Fair';
    return 'Low';
  };

  return (
    <div className="flex items-center gap-4">
      <div>
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}</span>
          <span className="text-gray-500 text-sm">/100</span>
        </div>
        <p className={`text-sm font-medium ${getScoreColor(score)}`}>
          {getScoreLabel(score)} Trust Score
        </p>
      </div>
      {verified && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-200">
          <Shield className="h-5 w-5 text-green-600" />
          <span className="text-sm font-semibold text-green-600">Verified</span>
        </div>
      )}
    </div>
  );
}
