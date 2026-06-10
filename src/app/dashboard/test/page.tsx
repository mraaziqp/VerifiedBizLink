'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/auth-context';
import { uploadImage } from '@/lib/media-upload';
import { Upload, X, Trash2 } from 'lucide-react';

interface TestPost {
  id: string;
  content: string;
  imageUrl: string;
  comments: TestComment[];
}

interface TestComment {
  id: string;
  content: string;
  imageUrl?: string;
  author: string;
  createdAt: string;
}

export default function TestPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<TestPost[]>([]);
  const [postContent, setPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [commentImages, setCommentImages] = useState<{ [key: string]: File | null }>({});
  const [commentImagePreviews, setCommentImagePreviews] = useState<{ [key: string]: string | null }>({});

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = async () => {
    if (!postContent.trim()) return;

    setUploading(true);
    try {
      let imageUrl = null;

      if (selectedImage) {
        const { url, error } = await uploadImage(user?.id || 'test-user', selectedImage, 'post-media');
        if (error) throw new Error(error);
        imageUrl = url;
      }

      const newPost: TestPost = {
        id: Date.now().toString(),
        content: postContent,
        imageUrl: imageUrl || '',
        comments: [],
      };

      setPosts([newPost, ...posts]);
      setPostContent('');
      setSelectedImage(null);
      setImagePreview(null);
    } catch (err) {
      console.error('Error creating post:', err);
      alert('Failed to create post');
    } finally {
      setUploading(false);
    }
  };

  const handleCommentImageSelect = (postId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCommentImages({ ...commentImages, [postId]: file });
      const reader = new FileReader();
      reader.onload = (event) => {
        setCommentImagePreviews({
          ...commentImagePreviews,
          [postId]: event.target?.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = commentText[postId] || '';
    if (!text.trim()) return;

    try {
      let imageUrl = null;

      if (commentImages[postId]) {
        const { url, error } = await uploadImage(
          user?.id || 'test-user',
          commentImages[postId]!,
          'post-media'
        );
        if (error) throw new Error(error);
        imageUrl = url;
      }

      const newComment: TestComment = {
        id: Date.now().toString(),
        content: text,
        imageUrl: imageUrl || undefined,
        author: user?.fullName || 'Anonymous',
        createdAt: new Date().toLocaleString(),
      };

      setPosts(
        posts.map((post) =>
          post.id === postId ? { ...post, comments: [newComment, ...post.comments] } : post
        )
      );

      setCommentText({ ...commentText, [postId]: '' });
      setCommentImages({ ...commentImages, [postId]: null });
      setCommentImagePreviews({ ...commentImagePreviews, [postId]: null });
    } catch (err) {
      console.error('Error adding comment:', err);
      alert('Failed to add comment');
    }
  };

  const handleDeleteComment = (postId: string, commentId: string) => {
    setPosts(
      posts.map((post) =>
        post.id === postId
          ? { ...post, comments: post.comments.filter((c) => c.id !== commentId) }
          : post
      )
    );
  };

  const handleDeletePost = (postId: string) => {
    setPosts(posts.filter((p) => p.id !== postId));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">📸 Image Upload & Comment Test</h1>
          <p className="text-gray-400">Test uploading images and managing comments</p>
        </div>

        {/* Create Post Section */}
        <Card className="bg-gray-800/50 border-gray-700 mb-8">
          <CardHeader>
            <h2 className="text-xl font-bold text-white">Create Test Post</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="What's on your mind?"
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              className="bg-gray-900 border-gray-700 text-white"
              rows={4}
            />

            {/* Image Preview */}
            {imagePreview && (
              <div className="relative w-full max-w-sm">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full rounded-lg max-h-64 object-cover"
                />
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setImagePreview(null);
                  }}
                  className="absolute top-2 right-2 bg-red-500 rounded-full p-1 hover:bg-red-600"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            )}

            {/* Upload & Post Buttons */}
            <div className="flex gap-2">
              <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-400 hover:text-white cursor-pointer transition">
                <Upload className="h-4 w-4" />
                Upload Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
              <Button
                onClick={handleCreatePost}
                disabled={!postContent.trim() || uploading}
                className="flex-1"
              >
                {uploading ? 'Posting...' : 'Post'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Posts List */}
        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg">No posts yet. Create one to get started! 👆</p>
            </div>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="bg-gray-800/50 border-gray-700">
                {/* Post Content */}
                <CardContent className="pt-6 pb-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-white">{user?.fullName || 'Anonymous'}</h3>
                      <p className="text-xs text-gray-400">Just now</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePost(post.id)}
                      className="text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <p className="text-white mb-4">{post.content}</p>

                  {/* Post Image */}
                  {post.imageUrl && (
                    <img
                      src={post.imageUrl}
                      alt="Post"
                      className="w-full rounded-lg mb-4 max-h-96 object-cover"
                    />
                  )}
                </CardContent>

                {/* Add Comment */}
                <div className="border-t border-gray-700 p-4 space-y-4">
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Add a comment..."
                      value={commentText[post.id] || ''}
                      onChange={(e) => setCommentText({ ...commentText, [post.id]: e.target.value })}
                      className="bg-gray-900 border-gray-700 text-white resize-none"
                      rows={2}
                    />

                    {/* Comment Image Preview */}
                    {commentImagePreviews[post.id] && (
                      <div className="relative w-full max-w-xs">
                        <img
                          src={commentImagePreviews[post.id]!}
                          alt="Comment preview"
                          className="w-full rounded-lg max-h-40 object-cover"
                        />
                        <button
                          onClick={() => {
                            setCommentImages({ ...commentImages, [post.id]: null });
                            setCommentImagePreviews({ ...commentImagePreviews, [post.id]: null });
                          }}
                          className="absolute top-2 right-2 bg-red-500 rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    )}

                    {/* Comment Image Upload & Submit */}
                    <div className="flex gap-2">
                      <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-400 hover:text-white cursor-pointer transition">
                        <Upload className="h-4 w-4" />
                        <span className="text-sm">Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleCommentImageSelect(post.id, e)}
                          className="hidden"
                        />
                      </label>
                      <Button
                        onClick={() => handleAddComment(post.id)}
                        disabled={!(commentText[post.id] || '').trim()}
                        size="sm"
                        className="flex-1"
                      >
                        Comment
                      </Button>
                    </div>
                  </div>

                  {/* Comments List */}
                  {post.comments.length > 0 && (
                    <div className="space-y-3 border-t border-gray-700 pt-4">
                      <p className="text-sm font-semibold text-gray-400">
                        {post.comments.length} comment{post.comments.length !== 1 ? 's' : ''}
                      </p>

                      {post.comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="bg-gray-900/50 rounded-lg p-3 space-y-2"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-sm font-semibold text-white">{comment.author}</h4>
                              <p className="text-xs text-gray-400">{comment.createdAt}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteComment(post.id, comment.id)}
                              className="text-red-400 hover:bg-red-500/20"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>

                          <p className="text-sm text-gray-200">{comment.content}</p>

                          {/* Comment Image */}
                          {comment.imageUrl && (
                            <img
                              src={comment.imageUrl}
                              alt="Comment"
                              className="rounded max-w-xs max-h-32 object-cover"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
