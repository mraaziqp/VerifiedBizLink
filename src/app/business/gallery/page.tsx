'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { ImageUploader } from '@/components/media/image-uploader';
import { useToast } from '@/hooks/use-toast';
import { GlassBackground, glassInteractive } from '@/components/shared/glass-ui';

interface GalleryImage {
  id: string;
  image_url: string;
  title: string;
  created_at: string;
}

export default function BusinessGalleryPage() {
  const { toast } = useToast();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchGallery = useCallback(async () => {
    try {
      const res = await fetch('/api/business/gallery');
      if (res.ok) {
        const data = await res.json();
        setImages(data.images || []);
      }
    } catch {
      /* keep whatever is shown */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  const handleImageUpload = async (url: string) => {
    try {
      const res = await fetch('/api/business/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url, title: 'New Photo' }),
      });
      if (res.ok) {
        const data = await res.json();
        setImages((prev) => [data.image, ...prev]);
        toast({ title: 'Photo added' });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: 'Could not add photo', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not add photo', variant: 'destructive' });
    }
  };

  const handleRename = async (id: string, title: string) => {
    setImages((prev) => prev.map((i) => (i.id === id ? { ...i, title } : i)));
    try {
      await fetch(`/api/business/gallery/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
    } catch {
      /* title is cosmetic; a failed rename isn't worth interrupting the user */
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/business/gallery/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setImages((prev) => prev.filter((i) => i.id !== id));
        toast({ title: 'Photo removed' });
      } else {
        toast({ title: 'Could not remove photo', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not remove photo', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <GlassBackground>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link
          href="/business/dashboard"
          className={`inline-flex items-center gap-2 text-yellow-500 hover:text-yellow-400 mb-6 rounded-lg ${glassInteractive}`}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <Card className="mb-8 bg-slate-900/60 backdrop-blur-xl border-white/5 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-slate-100">Business Gallery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ImageUploader
                onImageSelect={handleImageUpload}
                label="Upload Photo"
                buttonClassName="w-full h-11 border border-dashed border-white/15 bg-slate-800/60 text-slate-300 hover:text-yellow-500 hover:border-yellow-500/40"
              />
              <p className="text-sm text-slate-400">
                Upload photos of your business, products, and services — visible on your public profile.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Gallery Grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.length === 0 ? (
              <Card className="col-span-full bg-slate-900/60 backdrop-blur-xl border-white/5 shadow-2xl">
                <CardContent className="py-12 text-center">
                  <p className="text-slate-400">No images yet. Upload your first business photo!</p>
                </CardContent>
              </Card>
            ) : (
              images.map((img) => (
                <Card
                  key={img.id}
                  className="overflow-hidden bg-slate-900/60 backdrop-blur-xl border-white/5 shadow-2xl transition-all duration-300 ease-out hover:border-yellow-500/30"
                >
                  <div className="aspect-square bg-slate-800 overflow-hidden">
                    <img src={img.image_url} alt={img.title} className="w-full h-full object-cover" />
                  </div>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center gap-2">
                      <input
                        type="text"
                        value={img.title}
                        onChange={(e) => handleRename(img.id, e.target.value)}
                        className={`text-sm font-medium border-0 bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none flex-1 rounded ${glassInteractive}`}
                        placeholder="Image title"
                      />
                      <button
                        onClick={() => handleDelete(img.id)}
                        disabled={deletingId === img.id}
                        className={`text-red-400 hover:text-red-300 shrink-0 rounded ${glassInteractive}`}
                      >
                        {deletingId === img.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </GlassBackground>
  );
}
