'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Heart, MessageCircle, Share2, Plus, Trash2, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface Post {
  id: string;
  content: string;
  likes: number;
  comments: number;
  createdAt: string;
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([
    {
      id: '1',
      content: 'Just launched my new business profile on VerifiedBizLink! 🚀',
      likes: 45,
      comments: 12,
      createdAt: '2 days ago',
    },
    {
      id: '2',
      content: 'Excited to connect with verified businesses in my area',
      likes: 32,
      comments: 8,
      createdAt: '1 week ago',
    },
  ]);

  const [newPost, setNewPost] = useState('');
  const [showComposer, setShowComposer] = useState(false);

  const handlePostCreate = () => {
    if (newPost.trim()) {
      const post: Post = {
        id: Date.now().toString(),
        content: newPost,
        likes: 0,
        comments: 0,
        createdAt: 'just now',
      };
      setPosts([post, ...posts]);
      setNewPost('');
      setShowComposer(false);
    }
  };

  const handleDelete = (id: string) => {
    setPosts(posts.filter(p => p.id !== id));
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
                    className="bg-yellow-400 text-slate-900 hover:bg-yellow-300"
                  >
                    Post
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Posts Feed */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Your Posts ({posts.length})</h2>

          {posts.length === 0 ? (
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

                  {/* Post Meta */}
                  <p className="text-slate-400 text-sm">{post.createdAt}</p>

                  {/* Engagement Stats */}
                  <div className="flex gap-4 py-3 border-y border-slate-700 text-slate-400 text-sm">
                    <span>{post.likes} likes</span>
                    <span>{post.comments} comments</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 justify-between pt-2">
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" className="gap-2 text-slate-400 hover:text-yellow-400">
                        <Heart className="h-4 w-4" />
                        Like
                      </Button>
                      <Button size="sm" variant="ghost" className="gap-2 text-slate-400 hover:text-yellow-400">
                        <MessageCircle className="h-4 w-4" />
                        Comment
                      </Button>
                      <Button size="sm" variant="ghost" className="gap-2 text-slate-400 hover:text-yellow-400">
                        <Share2 className="h-4 w-4" />
                        Share
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(post.id)}
                      className="gap-2 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
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
