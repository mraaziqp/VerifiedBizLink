
"use client";

import { useState } from "react";
import { Sparkles, Image as ImageIcon, Link as LinkIcon, Paperclip, Send, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { aiAssistedPostDrafting } from "@/ai/flows/ai-assisted-post-drafting";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { ImageUploader } from "@/components/media/image-uploader";

export function PostCreator({ onPostCreated }: { onPostCreated?: () => void }) {
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

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
        length: "medium"
      });
      setContent(result.draftedPost);
    } catch (error) {
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
    if (!content.trim()) return;
    if (!user) {
      toast({ title: "Please sign in to post", variant: "destructive" });
      return;
    }

    setIsPosting(true);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          ...(imageUrl && { image_url: imageUrl })
        }),
      });

      if (res.ok) {
        setContent("");
        setImageUrl(null);
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
    <Card className="p-4 shadow-sm">
      <div className="flex gap-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user?.avatarUrl || `https://picsum.photos/seed/${user?.id || 'guest'}/200/200`} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-3">
          <Textarea
            placeholder="Share an update or milestone..."
            className="min-h-[100px] bg-gray-50 border-none focus-visible:ring-1 focus-visible:ring-primary text-gray-900 resize-none rounded-xl"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
            <div className="flex gap-1 items-center">
              <ImageUploader
                onImageSelect={(url) => {
                  setImageUrl(url);
                  toast({
                    title: "Image selected",
                    description: "Your image will be uploaded with the post.",
                  });
                }}
                buttonClassName="text-gray-500 hover:text-primary hover:bg-primary/10 rounded-full p-2"
              />
              {imageUrl && (
                <div className="relative w-12 h-12 bg-gray-200 rounded-lg overflow-hidden">
                  <img
                    src={imageUrl}
                    alt="Selected"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => setImageUrl(null)}
                    className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full"
                    title="Remove image"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-500 hover:text-primary hover:bg-primary/10 rounded-full"
                onClick={() => toast({ title: "Coming Soon", description: "File attachments will be available in the next update." })}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-500 hover:text-primary hover:bg-primary/10 rounded-full"
                onClick={() => toast({ title: "Coming Soon", description: "Link previews will be available in the next update." })}
              >
                <LinkIcon className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                className="gap-2 border-primary text-primary hover:bg-primary/10 rounded-full text-xs sm:text-sm"
                onClick={handleAIDraft}
                disabled={isDrafting || !content.trim()}
              >
                {isDrafting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                <span className="hidden sm:inline">{isDrafting ? "Drafting..." : "Draft with AI"}</span>
                <span className="sm:hidden">{isDrafting ? "..." : "AI"}</span>
              </Button>
              <Button
                className="bg-primary text-gray-900 hover:bg-primary/90 rounded-full px-6 font-bold gap-2"
                disabled={!content.trim() || isPosting}
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
  );
}
