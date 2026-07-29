'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { PostImage } from '@/components/feed/post-image';
import { GlassBackground } from '@/components/shared/glass-ui';

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

export default function PostsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMyPosts = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/posts?limit=100');
      if (res.ok) {
        const data = await res.json();
        setPosts((data.posts || []).filter((p: Post) => p.user_id === user.id));
      }
    } catch {
      /* keep whatever is shown */
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMyPosts();
  }, [fetchMyPosts]);

  const handlePostCreate = async () => {
    if (!newPost.trim()) return;
    setPosting(true);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newPost.trim() }),
      });
      if (res.ok) {
        setNewPost('');
        setShowComposer(false);
        toast({ title: 'Post published!' });
        fetchMyPosts();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: 'Failed to post', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Failed to post', variant: 'destructive' });
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
        toast({ title: 'Post deleted' });
      } else {
        toast({ title: 'Could not delete post', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Could not delete post', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <GlassBackground>
      <div className="pb-20">
        {/* Navigation */}
        <div className="bg-white/80 border-b border-gray-200 sticky top-0 z-40 p-4 backdrop-blur-xl">
          <Link href="/dashboard" className="flex items-center gap-2 text-yellow-600 hover:text-yellow-700">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        <div className="max-w-2xl mx-auto p-4 space-y-6">
          {/* Create Post */}
          <Card className="bg-white border-gray-200">
            <CardContent className="p-6">
              {!showComposer ? (
                <Button onClick={() => setShowComposer(true)} className="w-full gap-2 bg-yellow-400 text-gray-900 hover:bg-yellow-300">
                  <Plus className="h-4 w-4" />
                  Create New Post
                </Button>
              ) : (
                <div className="space-y-4">
                  <Textarea
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder="What's on your mind?"
                    className="bg-gray-100 text-gray-900 border-gray-300 min-h-24"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      onClick={() => setShowComposer(false)}
                      variant="outline"
                      className="border-gray-300 text-gray-600"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handlePostCreate}
                      disabled={posting || !newPost.trim()}
                      className="bg-yellow-400 text-gray-900 hover:bg-yellow-300 gap-2"
                    >
                      {posting && <Loader2 className="h-4 w-4 animate-spin" />}
                      {posting ? 'Posting…' : 'Post'}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Tip: to attach an image, post from the <Link href="/" className="text-yellow-600 hover:underline">Home feed</Link> composer.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Posts Feed */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">Your Posts ({posts.length})</h2>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 text-yellow-400 animate-spin" />
              </div>
            ) : posts.length === 0 ? (
              <Card className="bg-white border-gray-200">
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">No posts yet. Create your first post!</p>
                </CardContent>
              </Card>
            ) : (
              posts.map((post) => (
                <Card key={post.id} className="bg-white border-gray-200 hover:border-yellow-400/50 transition-colors">
                  <CardContent className="p-6 space-y-4">
                    {/* Post Content */}
                    <p className="text-gray-900 text-base leading-relaxed">{post.content}</p>

                    {post.image_url && (
                      <PostImage url={post.image_url} className="border-gray-200 bg-gray-100" />
                    )}

                    {/* Post Meta */}
                    <p className="text-gray-500 text-sm">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </p>

                    {/* Engagement Stats */}
                    <div className="flex gap-4 py-3 border-y border-gray-200 text-gray-500 text-sm">
                      <span>{post.likes_count} likes</span>
                      <span>{post.comments_count} comments</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end pt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(post.id)}
                        disabled={deletingId === post.id}
                        className="gap-2 text-red-400 hover:text-red-700"
                      >
                        {deletingId === post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        {deletingId === post.id ? 'Deleting…' : 'Delete'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </GlassBackground>
  );
}
