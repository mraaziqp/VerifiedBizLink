import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET comments for a post
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json(
        { error: 'postId is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('post_comments')
      .select(`
        id,
        content,
        image_url,
        likes_count,
        created_at,
        users (id, full_name, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ comments: data });
  } catch (err) {
    console.error('Get comments error:', err);
    return NextResponse.json(
      { error: 'Failed to get comments' },
      { status: 500 }
    );
  }
}

// POST create comment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { postId, content, imageUrl } = body;

    // Get user ID from session
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('post_comments')
      .insert([
        {
          post_id: postId,
          user_id: session.user.id,
          content,
          image_url: imageUrl,
        },
      ])
      .select();

    if (error) throw error;

    // Update post comments count
    await supabase.rpc('increment_post_comments', { post_id: postId });

    // Create notification for post owner
    const { data: post } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (post?.user_id && post.user_id !== session.user.id) {
      await supabase
        .from('user_notifications')
        .insert([
          {
            user_id: post.user_id,
            type: 'comment',
            title: 'New comment on your post',
            message: `Someone commented: "${content.substring(0, 50)}..."`,
            related_user_id: session.user.id,
            related_post_id: postId,
          },
        ]);
    }

    return NextResponse.json({ comment: data[0] });
  } catch (err) {
    console.error('Create comment error:', err);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}

// DELETE comment
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { commentId, postId } = body;

    // Get user ID from session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user owns the comment
    const { data: comment } = await supabase
      .from('post_comments')
      .select('user_id')
      .eq('id', commentId)
      .single();

    if (comment?.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own comments' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('post_comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;

    // Update post comments count
    await supabase.rpc('decrement_post_comments', { post_id: postId });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete comment error:', err);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
