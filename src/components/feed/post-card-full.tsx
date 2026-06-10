'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageSquare, Share2, Image as ImageIcon, X, Trash2 } from 'lucide-react';
import { uploadImage } from '@/lib/media-upload';
import { useAuth } from '@/contexts/auth-context';

interface Comment {
  id: string;
  content: string;
  image_url?: string;
  user: { id: string; full_name: string; avatar_url: string };
  created_at: string;
  likes_count: number;
}

interface PostCardFullProps {
  postId: string;
  content: string;
  imageUrl?: string;
  authorName: string;
  authorAvatar: string;
  likes: number;
  commentsCount: number;
}

export function PostCardFull({
  postId,
  content,
  imageUrl,
  authorName,
  authorAvatar,
  likes,
  commentsCount,
}: PostCardFullProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentImage, setCommentImage] = useState<File | null>(null);
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCommentImage(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setCommentImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const loadComments = async () => {
    if (loadingComments || showComments) return;
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/dashboard/comments?postId=${postId}`);
      const data = await res.json();
      setComments(data.comments || []);
      setShowComments(true);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    try {
      let imageUrl = null;

      // Upload image if selected
      if (commentImage) {
        const { url, error } = await uploadImage(user?.id || '', commentImage, 'post-media');
        if (error) {
          throw new Error(error);
        }
        imageUrl = url;
      }

      // Create comment
      const res = await fetch('/api/dashboard/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          content: commentText,
          imageUrl,
        }),
      });

      if (!res.ok) throw new Error('Failed to create comment');

      const data = await res.json();
      setComments([data.comment, ...comments]);
      setCommentText('');
      setCommentImage(null);
      setCommentImagePreview(null);
    } catch (err) {
      console.error('Error submitting comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;

    try {
      const res = await fetch('/api/dashboard/comments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, postId }),
      });

      if (!res.ok) throw new Error('Failed to delete comment');

      setComments(comments.filter(c => c.id !== commentId));
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700 overflow-hidden">
      {/* Post Header */}
      <CardContent className="pt-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={authorAvatar} alt={authorName} />
            <AvatarFallback>{authorName[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-white">{authorName}</h3>
            <p className="text-xs text-gray-400">2 hours ago</p>
          </div>
        </div>

        {/* Post Content */}
        <p className="text-white mb-4">{content}</p>

        {/* Post Image */}
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Post"
            className="w-full rounded-lg mb-4 max-h-96 object-cover"
          />
        )}
      </CardContent>

      {/* Post Actions */}
      <CardFooter className="flex justify-between border-t border-gray-700 pt-3">
        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-primary">
          <Heart className="h-4 w-4 mr-2" />
          {likes} Likes
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-primary"
          onClick={loadComments}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          {commentsCount} Comments
        </Button>
        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-primary">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </CardFooter>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-gray-700 p-4 space-y-4 bg-gray-900/50">
          {/* Comment Input */}
          <div className="space-y-3">
            <Textarea
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white resize-none"
              rows={3}
            />

            {/* Image Preview */}
            {commentImagePreview && (
              <div className="relative w-full max-w-xs">
                <img
                  src={commentImagePreview}
                  alt="Preview"
                  className="w-full rounded-lg max-h-48 object-cover"
                />
                <button
                  onClick={() => {
                    setCommentImage(null);
                    setCommentImagePreview(null);
                  }}
                  className="absolute top-2 right-2 bg-red-500 rounded-full p-1 hover:bg-red-600"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            )}

            {/* Image Upload & Submit */}
            <div className="flex gap-2">
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-white cursor-pointer transition">
                <ImageIcon className="h-4 w-4" />
                <span>Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
              <Button
                onClick={handleSubmitComment}
                disabled={!commentText.trim() || submittingComment}
                className="flex-1"
              >
                {submittingComment ? 'Posting...' : 'Comment'}
              </Button>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 p-3 bg-gray-800/30 rounded-lg">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarImage src={comment.user.avatar_url} alt={comment.user.full_name} />
                  <AvatarFallback>{comment.user.full_name[0]}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold text-sm text-white truncate">
                      {comment.user.full_name}
                    </h4>
                    {user?.id === comment.user.id && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="p-1 text-red-400 hover:bg-red-500/20 rounded transition"
                        title="Delete comment"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <p className="text-sm text-gray-300 mt-1">{comment.content}</p>

                  {/* Comment Image */}
                  {comment.image_url && (
                    <img
                      src={comment.image_url}
                      alt="Comment"
                      className="mt-2 rounded max-w-xs max-h-32 object-cover"
                    />
                  )}

                  <div className="flex gap-2 text-xs text-gray-400 mt-2">
                    <button className="hover:text-gray-300">Like</button>
                    <span>•</span>
                    <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}

            {comments.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-4">No comments yet. Be the first!</p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
