"use client";

import { useState, useRef } from "react";
import { Sparkles, Link as LinkIcon, Paperclip, Send, Loader2, X, Video, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { aiAssistedPostDrafting } from "@/ai/flows/ai-assisted-post-drafting";
import { compressImage, fetchWithTimeout } from "@/lib/image-compress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { ImageUploader } from "@/components/media/image-uploader";
import { VideoUploader } from "@/components/media/video-uploader";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function PostCreator({ onPostCreated }: { onPostCreated?: () => void }) {
  const [content, setContent] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoMeta, setVideoMeta] = useState<{ name: string; size: number } | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const uploadFiles = async (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast({
        title: "Invalid file",
        description: "Please upload image files (JPEG, PNG, WebP, GIF).",
        variant: "destructive",
      });
      return;
    }

    const remainingSlots = Math.max(0, 4 - imageUrls.length);
    if (remainingSlots === 0) {
      toast({
        title: "Limit reached",
        description: "You can attach up to 4 photos per post.",
        variant: "destructive",
      });
      return;
    }

    setIsAttaching(true);
    try {
      const toUpload = imageFiles.slice(0, remainingSlots);
      const uploaded: string[] = [];

      for (const file of toUpload) {
        if (file.size > 10 * 1024 * 1024) continue;
        const compressed = await compressImage(file, { maxDim: 1600, quality: 0.82 });
        const formData = new FormData();
        formData.append("file", compressed);
        formData.append("bucket", "posts");
        const res = await fetchWithTimeout("/api/media/upload", { method: "POST", body: formData }, 45000);
        const data = await res.json();
        if (res.ok && data.success && data.url) {
          uploaded.push(data.url);
        }
      }

      if (uploaded.length > 0) {
        setImageUrls((prev) => [...prev, ...uploaded].slice(0, 4));
        toast({
          title: `${uploaded.length} photo${uploaded.length === 1 ? "" : "s"} attached`,
          description: "Will be included in your post collage.",
        });
      } else {
        throw new Error("Could not upload selected files");
      }
    } catch (err) {
      toast({
        title: "Attachment failed",
        description: err instanceof Error ? err.message : "Could not upload file.",
        variant: "destructive",
      });
    } finally {
      setIsAttaching(false);
    }
  };

  const handleAttachFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (e.target) e.target.value = "";
    if (files.length === 0) return;
    await uploadFiles(files);
  };

  const handleInsertLink = () => {
    const url = window.prompt("Paste a link to add to your post:");
    if (!url) return;
    const trimmed = url.trim();
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    setContent((c) => (c ? `${c}\n${normalized}` : normalized));
  };

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'ME';

  const handleAIDraft = async () => {
    if (!content || content.length < 5) {
      toast({
        title: "Context Needed",
        description: "Please type a few words about what you'd like to post.",
        variant: "destructive",
      });
      return;
    }

    setIsDrafting(true);
    try {
      const result = await aiAssistedPostDrafting({
        topic: content,
        tone: "professional",
        length: "medium",
      });
      setContent(result.draftedPost);
    } catch {
      toast({
        title: "AI Drafting Failed",
        description: "Could not generate draft at this time.",
        variant: "destructive",
      });
    } finally {
      setIsDrafting(false);
    }
  };

  const handlePost = async () => {
    if (!content.trim() && imageUrls.length === 0 && !videoUrl) return;
    if (!user) {
      toast({ title: "Please sign in to post", variant: "destructive" });
      return;
    }

    setIsPosting(true);
    try {
      const imagePayload = imageUrls.length === 0
        ? undefined
        : imageUrls.length === 1
          ? imageUrls[0]
          : JSON.stringify(imageUrls);

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim() || (videoUrl ? 'Shared a video update' : 'Shared photos'),
          ...(imagePayload && { image_url: imagePayload }),
          ...(videoUrl && { video_url: videoUrl }),
        }),
      });

      if (res.ok) {
        setContent("");
        setImageUrls([]);
        setVideoUrl(null);
        setVideoMeta(null);
        toast({ title: "Post published!", description: "Your update has been shared with your network." });
        onPostCreated?.();
      } else {
        const data = await res.json();
        toast({ title: "Failed to post", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to post", variant: "destructive" });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <>
      <Card
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDraggingOver(false);
        }}
        onDrop={async (e) => {
          e.preventDefault();
          setIsDraggingOver(false);
          const droppedFiles = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
          if (droppedFiles.length > 0) {
            await uploadFiles(droppedFiles);
          }
        }}
        className={cn(
          "relative p-4 sm:p-5 shadow-sm border bg-white/95 backdrop-blur-md rounded-2xl transition-all",
          isDraggingOver
            ? "border-amber-400 ring-2 ring-amber-400/30 bg-amber-50/40"
            : "border-slate-200/90"
        )}
      >
        {isDraggingOver && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-2xl bg-amber-50/90 backdrop-blur-xs border-2 border-dashed border-amber-400 pointer-events-none">
            <Paperclip className="h-8 w-8 text-amber-600 animate-bounce mb-2" />
            <p className="text-sm font-bold text-amber-950">Drop photos here to attach</p>
            <p className="text-xs text-amber-800">Attach up to 4 photos per post</p>
          </div>
        )}
        <div className="flex gap-3.5">
          <Avatar className="h-10 w-10 border-2 border-amber-300 shadow-xs shrink-0 mt-0.5">
            <AvatarImage src={user?.avatarUrl || undefined} />
            <AvatarFallback className="bg-amber-100 text-amber-900 font-bold text-sm">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 relative flex flex-col gap-3 min-w-0">
            {/* Attached Images Preview Grid */}
            {imageUrls.length > 0 && !videoUrl && (
              <div className="space-y-1.5">
                <div className={cn(
                  "grid gap-2 w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 p-2",
                  imageUrls.length === 1 ? "grid-cols-1" : imageUrls.length === 2 ? "grid-cols-2" : "grid-cols-3 sm:grid-cols-4"
                )}>
                  {imageUrls.map((url, idx) => (
                    <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group">
                      <img
                        src={url}
                        alt={`Attachment ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      <button
                        type="button"
                        onClick={() => setImageUrls((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-rose-600 text-white p-1 rounded-full shadow-md transition-colors"
                        title="Remove photo"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between px-1 text-[11px] font-bold text-slate-500">
                  <span>{imageUrls.length} of 4 photos attached</span>
                  <button
                    type="button"
                    onClick={() => setImageUrls([])}
                    className="text-rose-600 hover:underline"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}

            {/* Attached Video Preview */}
            {videoUrl && (
              <div className="relative w-full rounded-xl overflow-hidden border border-amber-200 bg-amber-50/50 p-2.5">
                <video src={videoUrl} controls className="w-full max-h-56 rounded-lg bg-black object-contain shadow-xs" />
                <div className="flex items-center justify-between mt-2 px-1 text-xs text-slate-600">
                  <span className="truncate max-w-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Video className="h-3.5 w-3.5 text-amber-700" />
                    {videoMeta?.name || 'Attached Video'}
                  </span>
                  <button
                    onClick={() => {
                      setVideoUrl(null);
                      setVideoMeta(null);
                    }}
                    className="text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 text-xs"
                  >
                    <X size={14} /> Remove Video
                  </button>
                </div>
              </div>
            )}

            <Textarea
              placeholder="Share a business update, video demonstration, or milestone..."
              className="min-h-[96px] bg-slate-50/80 border border-slate-200 focus-visible:ring-2 focus-visible:ring-amber-400 text-slate-900 placeholder:text-slate-400 resize-none rounded-xl p-3.5 text-sm transition-all focus:bg-white"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />

            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
              <div className="flex gap-1 items-center">
                {/* Photo uploader */}
                <ImageUploader
                  multiple={true}
                  onImagesSelect={(urls) => {
                    setImageUrls((prev) => [...prev, ...urls].slice(0, 4));
                    toast({
                      title: `${urls.length} photo${urls.length === 1 ? '' : 's'} attached`,
                      description: "Photos will be displayed in your post collage.",
                    });
                  }}
                  buttonClassName="text-slate-500 hover:text-amber-800 hover:bg-amber-100/60 rounded-xl p-2 transition-colors"
                />

                {/* Video Uploader Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-500 hover:text-amber-800 hover:bg-amber-100/60 rounded-xl"
                  onClick={() => setIsVideoModalOpen(true)}
                  title="Upload Video (Firebase Cloud Storage)"
                >
                  <Video className="h-5 w-5" />
                </Button>

                <input
                  ref={attachInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAttachFile}
                  aria-label="Attach a file"
                />

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-500 hover:text-amber-800 hover:bg-amber-100/60 rounded-xl"
                  onClick={() => attachInputRef.current?.click()}
                  disabled={isAttaching}
                  title="Attach file"
                >
                  {isAttaching ? <Loader2 className="h-5 w-5 animate-spin text-amber-700" /> : <Paperclip className="h-5 w-5" />}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-500 hover:text-amber-800 hover:bg-amber-100/60 rounded-xl"
                  onClick={handleInsertLink}
                  title="Insert link"
                >
                  <LinkIcon className="h-5 w-5" />
                </Button>
              </div>

              <div className="flex gap-2 ml-auto">
                <Button
                  variant="outline"
                  className="gap-2 border-amber-300/80 bg-amber-50/60 text-amber-900 hover:bg-amber-100/80 hover:text-amber-950 font-bold rounded-xl text-xs sm:text-sm h-10 transition-all"
                  onClick={handleAIDraft}
                  disabled={isDrafting || !content.trim()}
                >
                  {isDrafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-amber-700" />}
                  <span className="hidden sm:inline">{isDrafting ? "Drafting..." : "Draft with AI"}</span>
                  <span className="sm:hidden">{isDrafting ? "..." : "AI"}</span>
                </Button>
                <Button
                  className="bg-amber-400 text-slate-950 hover:bg-amber-500 rounded-xl px-6 font-bold gap-2 shadow-md shadow-amber-400/25 h-10 transition-all active:scale-[0.98]"
                  disabled={(!content.trim() && imageUrls.length === 0 && !videoUrl) || isPosting}
                  onClick={handlePost}
                >
                  {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isPosting ? "Posting..." : "Post"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Video Upload Modal */}
      <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-900 sm:max-w-md rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 font-bold text-lg">
              <Film className="h-5 w-5 text-amber-500" /> Upload High-Res Video
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Upload product demos, customer walkthroughs, or business showcases directly to Firebase Storage.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <VideoUploader
              userId={user?.id || 'guest'}
              maxSizeMB={100}
              onUploadComplete={(url, meta) => {
                setVideoUrl(url);
                setVideoMeta(meta);
                if (meta.thumbnailUrl) setImageUrls([meta.thumbnailUrl]);
                setIsVideoModalOpen(false);
                toast({ title: 'Video attached successfully!' });
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
