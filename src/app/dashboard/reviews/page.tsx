'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Star, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { GlassBackground, GlassCard, GlassPageHeader } from '@/components/shared/glass-ui';

export default function ReviewsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'customer') {
      router.replace('/dashboard');
      return;
    }
    
    // Attempt to fetch, fallback if endpoint not fully ready
    fetch('/api/businesses/reviews?mine=true')
      .then(res => res.ok ? res.json() : { reviews: [] })
      .then(data => setReviews(data.reviews || []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [authLoading, user, router]);

  if (authLoading || loading) {
    return (
      <GlassBackground>
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </GlassBackground>
    );
  }

  return (
    <GlassBackground>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        
        <GlassPageHeader title="My Reviews" subtitle="Reviews you've shared about businesses." />
        
        <div className="mt-8 space-y-4">
          {reviews.length === 0 ? (
            <GlassCard className="text-center py-16">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900">No reviews yet</h3>
              <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                When you review a business, it will appear here. Reviews help the community make informed decisions.
              </p>
            </GlassCard>
          ) : (
            reviews.map((review) => (
              <GlassCard key={review.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">{review.businessName || 'Business'}</h3>
                    <div className="flex gap-0.5 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`h-4 w-4 ${star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} 
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-3 text-sm text-gray-700">{review.content}</p>
              </GlassCard>
            ))
          )}
        </div>
      </div>
    </GlassBackground>
  );
}
