'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft, Loader2, Trash2, Image as ImageIcon, Camera, Eye,
  Download, Copy, Check, ChevronLeft, ChevronRight, X, Sparkles,
  Layers, Tag, Info
} from 'lucide-react';
import Link from 'next/link';
import { ImageUploader } from '@/components/media/image-uploader';
import { useToast } from '@/hooks/use-toast';
import { GlassBackground } from '@/components/shared/glass-ui';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

interface GalleryImage {
  id: string;
  image_url: string;
  title: string;
  created_at: string;
}

const CATEGORIES = [
  'All Photos',
  'Products & Services',
  'Storefront & Workspace',
  'Team & Culture',
  'Certificates & Badges',
];

export default function BusinessGalleryPage() {
  const { toast } = useToast();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All Photos');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') handleNextLightbox();
      if (e.key === 'ArrowLeft') handlePrevLightbox();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, images.length]);

  const handleImageUpload = async (url: string) => {
    try {
      const res = await fetch('/api/business/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url, title: 'Business Photo' }),
      });
      if (res.ok) {
        const data = await res.json();
        setImages((prev) => [data.image, ...prev]);
        toast({ title: 'Photo added to your public gallery!' });
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
      /* title is cosmetic */
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeletingId(id);
    try {
      const res = await fetch(`/api/business/gallery/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setImages((prev) => prev.filter((i) => i.id !== id));
        if (lightboxIndex !== null) setLightboxIndex(null);
        toast({ title: 'Photo removed from gallery' });
      } else {
        toast({ title: 'Could not remove photo', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not remove photo', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyLink = async (url: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast({ title: 'Image link copied to clipboard!' });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: 'Could not copy link', variant: 'destructive' });
    }
  };

  const handleNextLightbox = () => {
    if (lightboxIndex === null || images.length === 0) return;
    setLightboxIndex((lightboxIndex + 1) % images.length);
  };

  const handlePrevLightbox = () => {
    if (lightboxIndex === null || images.length === 0) return;
    setLightboxIndex((lightboxIndex - 1 + images.length) % images.length);
  };

  return (
    <GlassBackground>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link
          href="/business/dashboard"
          className="inline-flex items-center gap-2 text-sm text-yellow-500 hover:text-yellow-400 mb-8 transition-colors font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Hero Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/20">
                <Camera className="h-6 w-6 text-slate-950" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-50 tracking-tight">
                  Business Showcase &amp; Gallery
                </h1>
                <p className="text-slate-400 text-sm sm:text-base mt-0.5">
                  High-quality visuals increase customer inquiry rates by up to 300%.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <ImageUploader
              onImageSelect={handleImageUpload}
              label="Upload Photo"
              buttonClassName="px-6 h-12 font-bold bg-yellow-400 text-slate-950 hover:bg-yellow-300 shadow-lg shadow-yellow-400/20 rounded-xl transition-all flex items-center gap-2"
            />
          </div>
        </div>

        {/* Quality Tip Banner */}
        <div className="mb-8 rounded-2xl border border-yellow-400/20 bg-gradient-to-r from-yellow-950/30 via-slate-900/60 to-slate-900/60 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-200">
                {images.length >= 5 ? 'Awesome showcase! Your gallery is comprehensive.' : `Upload ${5 - images.length > 0 ? 5 - images.length : 1} more photo${5 - images.length === 1 ? '' : 's'} to achieve 100% profile score.`}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Include your store frontage, team members, awards, and products to build instant credibility with visitors.
              </p>
            </div>
          </div>
          <div className="text-xs font-bold text-yellow-400 px-3 py-1.5 rounded-lg bg-yellow-400/10 border border-yellow-400/30 shrink-0">
            {images.length} Photos Live
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/20'
                  : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="h-10 w-10 text-yellow-400 animate-spin" />
            <p className="text-slate-400 font-medium">Loading high-res photos…</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {images.length === 0 ? (
              <div className="col-span-full py-20 px-4 text-center border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/30 space-y-4">
                <div className="mx-auto w-20 h-20 rounded-2xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center shadow-inner">
                  <ImageIcon className="h-10 w-10 text-slate-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-200">No photos uploaded yet</h3>
                  <p className="text-slate-400 text-sm max-w-sm mx-auto mt-1">
                    Upload photos of your storefront, team, or best work to attract more customers.
                  </p>
                </div>
                <ImageUploader
                  onImageSelect={handleImageUpload}
                  label="Upload Your First Photo"
                  buttonClassName="px-6 h-11 font-bold bg-yellow-400 text-slate-950 hover:bg-yellow-300 shadow-md shadow-yellow-400/20 rounded-xl transition-all"
                />
              </div>
            ) : (
              images.map((img, idx) => (
                <Card
                  key={img.id}
                  onClick={() => setLightboxIndex(idx)}
                  className="group relative overflow-hidden bg-slate-900/80 backdrop-blur-xl border border-slate-800 hover:border-yellow-400/60 shadow-xl transition-all duration-300 rounded-2xl flex flex-col cursor-pointer"
                >
                  <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.image_url}
                      alt={img.title || 'Business photo'}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
                      loading="lazy"
                    />

                    {/* Dark gradient on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Top right action buttons */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleCopyLink(img.image_url, img.id, e)}
                        className="bg-slate-900/90 text-slate-300 hover:text-white p-2 rounded-xl border border-slate-700 hover:bg-slate-800 transition-colors"
                        title="Copy image link"
                      >
                        {copiedId === img.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>

                      <button
                        onClick={(e) => handleDelete(img.id, e)}
                        disabled={deletingId === img.id}
                        className="bg-slate-900/90 text-red-400 hover:text-red-300 p-2 rounded-xl border border-slate-700 hover:bg-slate-800 transition-colors"
                        title="Delete photo"
                      >
                        {deletingId === img.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Fullscreen icon indicator in center on hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="p-3 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 text-yellow-400 shadow-xl">
                        <Eye className="h-5 w-5" />
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-3.5 flex flex-col gap-1 bg-slate-900/90">
                    <div onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={img.title}
                        onChange={(e) => handleRename(img.id, e.target.value)}
                        className="text-sm font-bold border-0 bg-transparent text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-yellow-400/60 rounded px-1.5 -mx-1.5 py-0.5 w-full transition-all"
                        placeholder="Click to label photo..."
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium px-1.5">
                      {img.created_at ? format(new Date(img.created_at), 'd MMM yyyy') : 'Live'}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* ======================= FULLSCREEN LIGHTBOX MODAL ======================= */}
        {lightboxIndex !== null && images[lightboxIndex] && (
          <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-between p-4 sm:p-8 animate-in fade-in duration-200">
            {/* Top Bar */}
            <div className="w-full flex items-center justify-between text-slate-300 max-w-6xl">
              <div>
                <h3 className="text-base font-bold text-white">
                  {images[lightboxIndex].title || 'Business Photo'}
                </h3>
                <p className="text-xs text-slate-400">
                  {lightboxIndex + 1} of {images.length}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={images[lightboxIndex].image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200"
                  title="Open original"
                >
                  <Download className="h-5 w-5" />
                </a>
                <button
                  onClick={() => setLightboxIndex(null)}
                  className="p-2 rounded-xl bg-slate-800/80 hover:bg-red-500/20 text-slate-200 hover:text-red-400 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Image Preview with Arrows */}
            <div className="relative flex-1 w-full max-w-5xl flex items-center justify-center my-4 overflow-hidden">
              <button
                onClick={handlePrevLightbox}
                className="absolute left-2 sm:left-4 z-10 p-3 rounded-full bg-slate-900/80 hover:bg-yellow-400 hover:text-slate-950 text-white border border-slate-700 shadow-2xl transition-all"
                title="Previous (Left Arrow)"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[lightboxIndex].image_url}
                alt={images[lightboxIndex].title}
                className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-200"
              />

              <button
                onClick={handleNextLightbox}
                className="absolute right-2 sm:right-4 z-10 p-3 rounded-full bg-slate-900/80 hover:bg-yellow-400 hover:text-slate-950 text-white border border-slate-700 shadow-2xl transition-all"
                title="Next (Right Arrow)"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>

            {/* Bottom Caption & Controls */}
            <div className="text-center text-xs text-slate-500">
              Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">←</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">→</kbd> to browse, <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">ESC</kbd> to close.
            </div>
          </div>
        )}
      </div>
    </GlassBackground>
  );
}
