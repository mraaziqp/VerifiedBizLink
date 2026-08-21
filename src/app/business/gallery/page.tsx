'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2, Trash2, Image as ImageIcon, Camera } from 'lucide-react';
import Link from 'next/link';
import { ImageUploader } from '@/components/media/image-uploader';
import { useToast } from '@/hooks/use-toast';
import { GlassBackground, glassInteractive } from '@/components/shared/glass-ui';
import { format } from 'date-fns';

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
        toast({ title: 'Photo added successfully' });
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
          className="inline-flex items-center gap-2 text-sm text-yellow-500 hover:text-yellow-400 mb-8 transition-colors font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-50 tracking-tight flex items-center gap-3">
              <Camera className="h-8 w-8 text-yellow-400" />
              Business Gallery
            </h1>
            <p className="text-slate-400 mt-2 max-w-xl text-lg">
              Showcase your products, services, and workspace. High-quality photos build trust with potential customers.
            </p>
          </div>
          
          <div className="shrink-0">
            <ImageUploader
              onImageSelect={handleImageUpload}
              label="Upload New Photo"
              buttonClassName="w-full sm:w-auto px-6 h-12 font-bold bg-yellow-400 text-slate-950 hover:bg-yellow-300 shadow-lg shadow-yellow-400/20 rounded-xl transition-all"
            />
          </div>
        </div>

        {/* Gallery Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="h-10 w-10 text-yellow-500 animate-spin" />
            <p className="text-slate-400 animate-pulse font-medium">Loading your gallery...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {images.length === 0 ? (
              <div className="col-span-full py-20 px-4 text-center border-2 border-dashed border-slate-700/50 rounded-3xl bg-slate-900/30">
                <div className="mx-auto w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mb-6 shadow-inner">
                  <ImageIcon className="h-10 w-10 text-slate-500" />
                </div>
                <h3 className="text-2xl font-bold text-slate-200 mb-2">No photos yet</h3>
                <p className="text-slate-400 max-w-md mx-auto mb-8">
                  Your gallery is empty. Upload pictures of your storefront, team, or best work to attract more customers.
                </p>
                <ImageUploader
                  onImageSelect={handleImageUpload}
                  label="Upload Your First Photo"
                  buttonClassName="px-8 h-12 font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-600 rounded-xl transition-all"
                />
              </div>
            ) : (
              images.map((img) => (
                <Card
                  key={img.id}
                  className="group relative overflow-hidden bg-slate-900/80 backdrop-blur-xl border border-slate-800 hover:border-yellow-500/50 shadow-xl transition-all duration-300 rounded-2xl flex flex-col"
                >
                  <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={img.image_url} 
                      alt={img.title || 'Business photo'} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      loading="lazy"
                    />
                    
                    {/* Delete button overlay */}
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDelete(img.id)}
                        disabled={deletingId === img.id}
                        className="bg-slate-900/80 backdrop-blur-md text-red-400 hover:text-red-300 p-2 rounded-full hover:bg-slate-800 transition-colors shadow-lg border border-white/10"
                        title="Delete photo"
                      >
                        {deletingId === img.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <CardContent className="p-4 flex flex-col gap-1">
                    <input
                      type="text"
                      value={img.title}
                      onChange={(e) => handleRename(img.id, e.target.value)}
                      className="text-base font-semibold border-0 bg-transparent text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-yellow-500/50 rounded px-1 -mx-1 transition-all"
                      placeholder="Add a title..."
                    />
                    <p className="text-xs text-slate-500 font-medium px-1">
                      {img.created_at ? format(new Date(img.created_at), 'MMM d, yyyy') : 'Recently uploaded'}
                    </p>
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
