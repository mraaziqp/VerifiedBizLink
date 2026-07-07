'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, Plus, Heart, MessageCircle, Trash2,
  Loader2, Sparkles, TrendingUp, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
}

export default function BusinessPostsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [fetching, setFetching] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'business') {
      router.push('/login');
    }
  }, [user, router]);

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
      setFetching(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMyPosts();
  }, [fetchMyPosts]);

  const handleCreatePost = async () => {
    if (!newPost.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newPost.trim() }),
      });
      if (res.ok) {
        setNewPost('');
        setShowComposer(false);
        toast({ title: 'Post published!', description: 'Your update is live on the feed.' });
        fetchMyPosts();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({ title: 'Failed to publish', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Failed to publish', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const totalLikes = posts.reduce((sum, p) => sum + p.likes_count, 0);
  const totalComments = posts.reduce((sum, p) => sum + p.comments_count, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/business/dashboard">
                <button className="p-2 hover:bg-slate-700 rounded-lg transition">
                  <ArrowLeft className="h-5 w-5 text-white" />
                </button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-yellow-400" />
                  Posts Management
                </h1>
                <p className="text-sm text-slate-400 mt-1">Create and manage your business posts</p>
              </div>
            </div>
            <Button
              onClick={() => setShowComposer(true)}
              className="bg-yellow-400 text-slate-900 hover:bg-yellow-500 gap-2"
            >
              <Plus className="h-4 w-4" />
              New Post
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Performance Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-2">Total Posts</p>
                  <p className="text-3xl font-bold text-white">{posts.length}</p>
                </div>
                <div className="p-3 bg-slate-700 rounded-lg">
                  <Sparkles className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-2">Total Likes</p>
                  <p className="text-3xl font-bold text-white">{totalLikes.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-slate-700 rounded-lg">
                  <Heart className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-2">Total Comments</p>
                  <p className="text-3xl font-bold text-white">{totalComments.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-slate-700 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Post Composer */}
        {showComposer && (
          <Card className="bg-slate-800 border-yellow-400 mb-8 shadow-lg shadow-yellow-400/20">
            <CardHeader className="border-b border-slate-700">
              <CardTitle className="text-white">Create New Post</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="What's new with your business? Share updates, announcements, or engage with customers..."
                className="w-full bg-slate-700 border border-slate-600 rounded-lg p-4 text-white placeholder-slate-400 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 resize-none"
                rows={5}
              />
              <p className="text-xs text-slate-500 mt-2">
                Tip: to attach an image, post from the <Link href="/" className="text-yellow-400 hover:underline">Home feed</Link> composer.
              </p>
              <div className="flex justify-end gap-3 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowComposer(false);
                    setNewPost('');
                  }}
                  className="border-slate-600 text-white hover:bg-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePost}
                  disabled={!newPost.trim() || loading}
                  className="bg-yellow-400 text-slate-900 hover:bg-yellow-500"
                >
                  {loading ? 'Publishing...' : 'Publish Post'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Posts List */}
        {fetching ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 text-yellow-400 animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700 text-center py-16">
            <CardContent>
              <Sparkles className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Posts Yet</h3>
              <p className="text-slate-400 mb-6">Start sharing updates with your customers. Your first post could be the beginning of great engagement!</p>
              <Button
                onClick={() => setShowComposer(true)}
                className="bg-yellow-400 text-slate-900 hover:bg-yellow-500"
              >
                Create Your First Post
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Card key={post.id} className="bg-slate-800 border-slate-700 hover:border-yellow-400 transition">
                <CardContent className="p-6">
                  {/* Post Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-yellow-900 rounded-lg">
                        <Sparkles className="h-5 w-5 text-yellow-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">Business Update</p>
                        <p className="text-sm text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(post.created_at)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      disabled={deletingId === post.id}
                      className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-red-400"
                    >
                      {deletingId === post.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                    </button>
                  </div>

                  {/* Post Content */}
                  <p className="text-white mb-6 leading-relaxed">{post.content}</p>

                  {post.image_url && (
                    <a
                      href={post.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mb-6 block overflow-hidden rounded-xl border border-slate-700 bg-slate-900"
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

                  {/* Post Stats */}
                  <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-slate-700">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Heart className="h-5 w-5 text-slate-400" />
                      <span className="text-lg font-semibold text-white">{post.likes_count}</span>
                      <span className="text-sm text-slate-400">Likes</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <MessageCircle className="h-5 w-5 text-slate-400" />
                      <span className="text-lg font-semibold text-white">{post.comments_count}</span>
                      <span className="text-sm text-slate-400">Comments</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
