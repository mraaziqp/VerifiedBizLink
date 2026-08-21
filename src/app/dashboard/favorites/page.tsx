'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Compass } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { GlassBackground, GlassCard, GlassPageHeader } from '@/components/shared/glass-ui';
import { Button } from '@/components/ui/button';

export default function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<any[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'customer') {
      router.replace('/dashboard');
      return;
    }
    
    // Simulate fetching for now as requested
    setLoading(false);
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
        
        <GlassPageHeader title="My Favorites" subtitle="Businesses you've saved for later." />
        
        <div className="mt-8">
          {favorites.length === 0 ? (
            <GlassCard className="text-center py-16">
              <Compass className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900">No favorites yet</h3>
              <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                Explore the directory to find and save verified businesses you want to remember.
              </p>
              <Button asChild className="mt-6 bg-yellow-400 text-gray-900 hover:bg-yellow-300">
                <Link href="/explore">Explore Businesses</Link>
              </Button>
            </GlassCard>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Render favorites here when endpoint is ready */}
            </div>
          )}
        </div>
      </div>
    </GlassBackground>
  );
}
