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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-20">
      {/* Navigation */}
      <div className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40 p-4">
        <Link href="/dashboard" className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Create Post */}
        <Card className="bg-slate-800 border-slate-600">
          <CardContent className="p-6">
            {!showComposer ? (
              <Button onClick={() => setShowComposer(true)} className="w-full gap-2 bg-yellow-400 text-slate-900 hover:bg-yellow-300">
                <Plus className="h-4 w-4" />
                Create New Post
              </Button>
            ) : (
              <div className="space-y-4">
                <Textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="What's on your mind?"
                  className="bg-slate-700 text-white border-slate-600 min-h-24"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    onClick={() => setShowComposer(false)}
                    variant="outline"
                    className="border-slate-600 text-slate-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePostCreate}
                    disabled={posting || !newPost.trim()}
                    className="bg-yellow-400 text-slate-900 hover:bg-yellow-300 gap-2"
                  >
                    {posting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {posting ? 'Posting…' : 'Post'}
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Tip: to attach an image, post from the <Link href="/" className="text-yellow-400 hover:underline">Home feed</Link> composer.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Posts Feed */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Your Posts ({posts.length})</h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 text-yellow-400 animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <Card className="bg-slate-800 border-slate-600">
              <CardContent className="p-8 text-center">
                <p className="text-slate-400">No posts yet. Create your first post!</p>
              </CardContent>
            </Card>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="bg-slate-800 border-slate-600 hover:border-yellow-400/30 transition-colors">
                <CardContent className="p-6 space-y-4">
                  {/* Post Content */}
                  <p className="text-white text-base leading-relaxed">{post.content}</p>

                  {post.image_url && (
                    <a
                      href={post.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-xl border border-slate-700 bg-slate-900"
                    >
                      <img
                        src={post.image_url}
                        alt="Post attachment"
                        loading="lazy"
                        className="max-h-[420px] w-full object-cover"
                        onError={(e) => {
                          (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                        }}
                      />
                    </a>
                  )}

                  {/* Post Meta */}
                  <p className="text-slate-400 text-sm">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </p>

                  {/* Engagement Stats */}
                  <div className="flex gap-4 py-3 border-y border-slate-700 text-slate-400 text-sm">
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
                      className="gap-2 text-red-400 hover:text-red-300"
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
  );
}
