
"use client";

import { useState, useEffect, useCallback } from "react";
import { ThumbsUp, MessageSquare, Share2, MoreHorizontal, Loader2, Send, Flag } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { GoldCheckmark } from "@/components/ui/gold-checkmark";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

interface Post {
  id: string;
  user_id: string;
  content: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author_name: string;
  author_avatar: string;
  author_headline: string;
  company_name: string | null;
  business_status: string | null;
  trust_score: number | null;
}

export function ActivityFeed({ refreshTrigger = 0 }: { refreshTrigger?: number }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [openCommentId, setOpenCommentId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/posts');
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts, refreshTrigger]);

  const handleLike = async (postId: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
      if (res.ok) {
        const { liked } = await res.json();
        setLikedPosts(prev => {
          const next = new Set(prev);
          if (liked) next.add(postId); else next.delete(postId);
          return next;
        });
        setPosts(prev => prev.map(p =>
          p.id === postId
            ? { ...p, likes_count: liked ? p.likes_count + 1 : p.likes_count - 1 }
            : p
        ));
      }
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  const handleShare = (postId: string) => {
    const url = `${window.location.origin}/?post=${postId}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Link copied!", description: "Post link copied to clipboard." });
    }).catch(() => {
      toast({ title: "Could not copy link", variant: "destructive" });
    });
  };

  const handleToggleComment = (postId: string) => {
    setOpenCommentId(prev => (prev === postId ? null : postId));
    setCommentText("");
  };

  const handleSubmitComment = async (postId: string) => {
    if (!commentText.trim() || !user) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      if (res.ok) {
        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
        ));
        setCommentText("");
        setOpenCommentId(null);
        toast({ title: "Comment posted!" });
      } else {
        toast({ title: "Failed to post comment", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to post comment", variant: "destructive" });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReport = async (post: Post) => {
    try {
      await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportedUserId: post.user_id,
          reportType: 'inappropriate_content',
          riskLevel: 'medium',
          description: `Post reported by user. Post ID: ${post.id}`,
        }),
      });
    } catch {
      // fail silently — user still gets feedback
    }
    toast({ title: "Post reported", description: "Our team will review this content shortly." });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className="shadow-sm border-none p-12 text-center">
        <p className="text-gray-500 font-medium">No posts yet. Be the first to share an update!</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {posts.map((post) => {
        const isLiked = likedPosts.has(post.id);
        const initials = post.author_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });

        return (
          <Card key={post.id} className="shadow-sm border-none overflow-hidden hover:shadow-md transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-12 w-12 ring-2 ring-primary/10 shrink-0">
                  <AvatarImage src={post.author_avatar || `https://picsum.photos/seed/${post.id}/200/200`} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-gray-900">{post.author_name}</span>
                    {post.business_status === 'verified' && <GoldCheckmark />}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                    {post.company_name && <span>{post.company_name}</span>}
                    {post.company_name && <span className="text-gray-300">•</span>}
                    <span>{timeAgo}</span>
                    {post.business_status === 'verified' && (
                      <Badge className="bg-green-50 text-green-700 text-[10px] px-1.5 py-0 border-green-100 h-4">Verified</Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-gray-400 rounded-full hover:bg-gray-100">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <span><MoreHorizontal className="h-5 w-5" /></span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="gap-2 text-red-600 cursor-pointer" onClick={() => handleReport(post)}>
                      <Flag className="h-4 w-4" />
                      Report Post
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Button>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-gray-700 leading-relaxed text-[15px]">{post.content}</p>
            </CardContent>
            <CardFooter className="flex flex-col pt-0">
              <div className="flex items-center justify-between w-full pb-3 text-xs text-gray-500 font-medium px-1">
                <div
                  className="flex items-center gap-1 hover:text-primary cursor-pointer transition-colors"
                  onClick={() => handleLike(post.id)}
                >
                  <div className={`p-1 rounded-full ${isLiked ? 'bg-primary/20' : 'bg-primary/10'}`}>
                    <ThumbsUp className={`h-3 w-3 ${isLiked ? 'text-primary fill-primary' : 'text-primary'}`} />
                  </div>
                  <span>{post.likes_count} {post.likes_count === 1 ? 'Like' : 'Likes'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hover:text-primary cursor-pointer">{post.comments_count} Comments</span>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-3 gap-1 pt-2">
                <Button
                  variant="ghost"
                  className={`gap-2 transition-all ${isLiked ? 'text-primary bg-primary/5' : 'text-gray-600 hover:text-primary hover:bg-primary/5'}`}
                  onClick={() => handleLike(post.id)}
                >
                  <ThumbsUp className={`h-4 w-4 ${isLiked ? 'fill-primary' : ''}`} />
                  <span>{isLiked ? 'Liked' : 'Like'}</span>
                </Button>
                <Button
                  variant="ghost"
                  className={`gap-2 transition-all ${openCommentId === post.id ? 'text-primary bg-primary/5' : 'text-gray-600 hover:text-primary hover:bg-primary/5'}`}
                  onClick={() => handleToggleComment(post.id)}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Comment</span>
                </Button>
                <Button
                  variant="ghost"
                  className="gap-2 text-gray-600 hover:text-primary hover:bg-primary/5 transition-all"
                  onClick={() => handleShare(post.id)}
                >
                  <Share2 className="h-4 w-4" />
                  <span>Share</span>
                </Button>
              </div>
              {openCommentId === post.id && (
                <div className="pt-3 pb-1 flex gap-3 items-start border-t mt-2">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={user?.avatarUrl || `https://picsum.photos/seed/${user?.id || 'me'}/100/100`} />
                    <AvatarFallback>{user?.fullName?.[0] || 'M'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex gap-2">
                    <Textarea
                      placeholder="Write a comment..."
                      className="min-h-[70px] text-sm rounded-xl resize-none bg-gray-50 border-gray-200 focus-visible:ring-primary flex-1"
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                    />
                    <Button
                      size="icon"
                      className="h-9 w-9 rounded-xl bg-primary text-gray-900 hover:bg-yellow-400 shrink-0 self-end"
                      onClick={() => handleSubmitComment(post.id)}
                      disabled={!commentText.trim() || submittingComment}
                    >
                      {submittingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
