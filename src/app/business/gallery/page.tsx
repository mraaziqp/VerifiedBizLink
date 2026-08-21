'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft, Loader2, Trash2, Image as ImageIcon, Camera, Eye,
  Download, Copy, Check, ChevronLeft, ChevronRight, X, Sparkles,
  Layers, Tag, Info, Video, Film, Play
} from 'lucide-react';
import Link from 'next/link';
import { ImageUploader } from '@/components/media/image-uploader';
import { VideoUploader } from '@/components/media/video-uploader';
import { useToast } from '@/hooks/use-toast';
import { GlassBackground } from '@/components/shared/glass-ui';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface GalleryItem {
  id: string;
  image_url: string;
  title: string;
  created_at: string;
}

const CATEGORIES = [
  'All Media',
  'Videos',
  'Photos',
  'Products & Services',
  'Storefront & Workspace',
  'Team & Culture',
];

function isVideoUrl(url: string): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i.test(url) || url.includes('/videos/') || url.includes('video');
}

export default function BusinessGalleryPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All Media');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const fetchGallery = useCallback(async () => {
    try {
      const res = await fetch('/api/business/gallery');
      if (res.ok) {
        const data = await res.json();
        setItems(data.images || []);
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
  }, [lightboxIndex, items.length]);

  const handleMediaUpload = async (url: string, title?: string) => {
    try {
      const isVid = isVideoUrl(url);
      const res = await fetch('/api/business/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url, title: title || (isVid ? 'Business Showcase Video' : 'Business Photo') }),
      });
      if (res.ok) {
        const data = await res.json();
        setItems((prev) => [data.image, ...prev]);
        toast({ title: isVid ? 'Video added to your public showcase!' : 'Photo added to your public gallery!' });
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: 'Could not add media', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not add media', variant: 'destructive' });
    }
  };

  const handleRename = async (id: string, title: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, title } : i)));
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
        setItems((prev) => prev.filter((i) => i.id !== id));
        if (lightboxIndex !== null) setLightboxIndex(null);
        toast({ title: 'Item removed from gallery' });
      } else {
        toast({ title: 'Could not remove item', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not remove item', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyLink = async (url: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast({ title: 'Media link copied to clipboard!' });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: 'Could not copy link', variant: 'destructive' });
    }
  };

  const handleNextLightbox = () => {
    if (lightboxIndex === null || filteredItems.length === 0) return;
    setLightboxIndex((lightboxIndex + 1) % filteredItems.length);
  };

  const handlePrevLightbox = () => {
    if (lightboxIndex === null || filteredItems.length === 0) return;
    setLightboxIndex((lightboxIndex - 1 + filteredItems.length) % filteredItems.length);
  };

  const filteredItems = items.filter((item) => {
    const isVid = isVideoUrl(item.image_url);
    if (selectedCategory === 'Videos') return isVid;
    if (selectedCategory === 'Photos') return !isVid;
    return true;
  });

  return (
    <GlassBackground>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link
          href="/business/dashboard"
          className="inline-flex items-center gap-2 text-sm text-amber-500 hover:text-amber-400 mb-8 transition-colors font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Hero Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Camera className="h-6 w-6 text-slate-950" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  Business Media Showcase
                </h1>
                <p className="text-slate-500 text-sm sm:text-base mt-0.5">
                  Upload photos and videos of your products, walkthroughs, and facilities to build trust with customers.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <ImageUploader
              onImageSelect={handleMediaUpload}
              label="Upload Photo"
              buttonClassName="px-5 h-11 font-bold bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-md shadow-amber-400/20 rounded-xl transition-all flex items-center gap-2 text-sm"
            />
            <Button
              onClick={() => setIsVideoModalOpen(true)}
              className="px-5 h-11 font-bold bg-slate-900 text-amber-400 hover:bg-slate-800 shadow-md rounded-xl transition-all flex items-center gap-2 text-sm"
            >
              <Video className="h-4 w-4 text-amber-400" />
              Upload Video
            </Button>
          </div>
        </div>

        {/* Quality Tip Banner */}
        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {items.length >= 5 ? 'Awesome showcase! Your media gallery is comprehensive.' : `Upload ${5 - items.length > 0 ? 5 - items.length : 1} more item${5 - items.length === 1 ? '' : 's'} to boost profile score.`}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Include product demos, video showcases, team photos, and store facilities to build instant credibility.
              </p>
            </div>
          </div>
          <div className="text-xs font-bold text-amber-900 px-3 py-1.5 rounded-lg bg-amber-100 border border-amber-300 shrink-0">
            {items.length} Items Live
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
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-amber-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="h-10 w-10 text-amber-500 animate-spin" />
            <p className="text-slate-500 font-medium">Loading high-res media…</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredItems.length === 0 ? (
              <div className="col-span-full py-20 px-4 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white/70 space-y-4">
                <div className="mx-auto w-20 h-20 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shadow-xs">
                  <ImageIcon className="h-10 w-10 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">No media uploaded yet</h3>
                  <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">
                    Upload photos and video showcases of your storefront, team, or products.
                  </p>
                </div>
                <div className="flex justify-center gap-3 pt-2">
                  <ImageUploader
                    onImageSelect={handleMediaUpload}
                    label="Upload Photo"
                    buttonClassName="px-5 h-10 font-bold bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-md shadow-amber-400/20 rounded-xl transition-all text-xs"
                  />
                  <Button
                    onClick={() => setIsVideoModalOpen(true)}
                    className="px-5 h-10 font-bold bg-slate-900 text-amber-400 hover:bg-slate-800 rounded-xl transition-all text-xs flex items-center gap-1.5"
                  >
                    <Video className="h-3.5 w-3.5" /> Upload Video
                  </Button>
                </div>
              </div>
            ) : (
              filteredItems.map((item, idx) => {
                const isVid = isVideoUrl(item.image_url);
                return (
                  <Card
                    key={item.id}
                    onClick={() => setLightboxIndex(idx)}
                    className="group relative overflow-hidden bg-white border border-slate-200 hover:border-amber-400 shadow-xs hover:shadow-md transition-all duration-200 rounded-2xl flex flex-col cursor-pointer"
                  >
                    <div className="relative aspect-[4/3] bg-slate-900 overflow-hidden">
                      {isVid ? (
                        <>
                          <video
                            src={item.image_url}
                            className="w-full h-full object-cover"
                            preload="metadata"
                          />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <div className="p-3 rounded-full bg-amber-400/90 text-slate-950 shadow-lg group-hover:scale-110 transition-transform">
                              <Play className="h-6 w-6 fill-slate-950" />
                            </div>
                          </div>
                          <span className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-sm text-amber-400 text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Video className="h-3 w-3" /> VIDEO
                          </span>
                        </>
                      ) : (
                        <img
                          src={item.image_url}
                          alt={item.title || 'Business photo'}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      )}

                      {/* Top right action buttons */}
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleCopyLink(item.image_url, item.id, e)}
                          className="bg-white/90 text-slate-700 hover:text-slate-900 p-2 rounded-xl border border-slate-200 hover:bg-white shadow-xs transition-colors"
                          title="Copy link"
                        >
                          {copiedId === item.id ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>

                        <button
                          onClick={(e) => handleDelete(item.id, e)}
                          disabled={deletingId === item.id}
                          className="bg-white/90 text-red-500 hover:text-red-700 p-2 rounded-xl border border-slate-200 hover:bg-white shadow-xs transition-colors"
                          title="Delete"
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <CardContent className="p-3.5 flex flex-col gap-1 bg-white">
                      <div onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => handleRename(item.id, e.target.value)}
                          className="text-sm font-bold border-0 bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400 rounded px-1.5 -mx-1.5 py-0.5 w-full transition-all"
                          placeholder="Click to label item..."
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium px-1.5">
                        {item.created_at ? format(new Date(item.created_at), 'd MMM yyyy') : 'Live'}
                      </p>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* Video Upload Modal */}
        <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
          <DialogContent className="bg-white border-slate-200 text-slate-900 sm:max-w-md rounded-2xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                <Film className="h-5 w-5 text-amber-500" /> Add Video to Showcase
              </DialogTitle>
              <DialogDescription className="text-slate-500 text-xs">
                Upload product demonstrations, video tours, or testimonials directly to Google Cloud Storage.
              </DialogDescription>
            </DialogHeader>

            <div className="py-2">
              <VideoUploader
                userId={user?.id || 'business'}
                maxSizeMB={100}
                onUploadComplete={(url, meta) => {
                  handleMediaUpload(url, meta.name || 'Showcase Video');
                  setIsVideoModalOpen(false);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* ======================= FULLSCREEN LIGHTBOX MODAL ======================= */}
        {lightboxIndex !== null && filteredItems[lightboxIndex] && (
          <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-between p-4 sm:p-8 animate-in fade-in duration-200">
            {/* Top Bar */}
            <div className="w-full flex items-center justify-between text-slate-300 max-w-6xl">
              <div>
                <h3 className="text-base font-bold text-white">
                  {filteredItems[lightboxIndex].title || 'Showcase Item'}
                </h3>
                <p className="text-xs text-slate-400">
                  {lightboxIndex + 1} of {filteredItems.length}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={filteredItems[lightboxIndex].image_url}
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

            {/* Media Preview with Arrows */}
            <div className="relative flex-1 w-full max-w-5xl flex items-center justify-center my-4 overflow-hidden">
              <button
                onClick={handlePrevLightbox}
                className="absolute left-2 sm:left-4 z-10 p-3 rounded-full bg-slate-900/80 hover:bg-amber-400 hover:text-slate-950 text-white border border-slate-700 shadow-2xl transition-all"
                title="Previous (Left Arrow)"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              {isVideoUrl(filteredItems[lightboxIndex].image_url) ? (
                <video
                  src={filteredItems[lightboxIndex].image_url}
                  controls
                  autoPlay
                  className="max-h-[75vh] max-w-full rounded-xl shadow-2xl bg-black"
                />
              ) : (
                <img
                  src={filteredItems[lightboxIndex].image_url}
                  alt={filteredItems[lightboxIndex].title}
                  className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl animate-in zoom-in-95 duration-200"
                />
              )}

              <button
                onClick={handleNextLightbox}
                className="absolute right-2 sm:right-4 z-10 p-3 rounded-full bg-slate-900/80 hover:bg-amber-400 hover:text-slate-950 text-white border border-slate-700 shadow-2xl transition-all"
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
