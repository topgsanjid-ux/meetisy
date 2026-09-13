import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase/server';
import { requireAuth, authErrorResponse } from '../../../lib/middleware';

// In-memory comments store for offline/demo fallback
let commentsStore = [
  {
    id: 'cmt-1',
    standup_id: 'st-1',
    user_id: 'usr-2',
    author_name: 'Marcus Vance',
    text: 'I fixed a similar CORS policy yesterday, I can review your bucket config!',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  }
];

/**
 * GET /api/comments?standup_id=<id>
 * Fetch comments for a specific standup. JWT required.
 */
export async function GET(req) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const standupId = searchParams.get('standup_id');

    if (!standupId) {
      return NextResponse.json({ success: false, error: 'standup_id query parameter is required.' }, { status: 400 });
    }

    // Attempt Supabase fetch
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('demo-placeholder')) {
      try {
        const { data, error } = await supabaseServer
          .from('comments')
          .select('*')
          .eq('standup_id', standupId)
          .order('created_at', { ascending: true });

        if (!error && data) {
          return NextResponse.json({ success: true, comments: data });
        }
      } catch (dbErr) {
        console.warn('Supabase comments fetch fallback:', dbErr.message);
      }
    }

    // In-memory fallback
    const filtered = commentsStore.filter(c => c.standup_id === standupId);
    return NextResponse.json({ success: true, comments: filtered });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * POST /api/comments
 * Add a comment to a standup. JWT required.
 * Body: { standup_id, comment_text }
 */
export async function POST(req) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();

    const { standup_id, comment_text } = body;
    if (!standup_id || !comment_text) {
      return NextResponse.json({ success: false, error: 'standup_id and comment_text are required.' }, { status: 400 });
    }

    const newComment = {
      id: `cmt-${Date.now()}`,
      standup_id,
      user_id: user.id,
      author_name: user.name || 'Team Member',
      text: comment_text.trim(),
      created_at: new Date().toISOString()
    };

    // Store in memory
    commentsStore.push(newComment);

    // Attempt Supabase insert
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('demo-placeholder')) {
        await supabaseServer.from('comments').insert([{
          standup_id: newComment.standup_id,
          user_id: newComment.user_id,
          author_name: newComment.author_name,
          text: newComment.text,
          created_at: newComment.created_at
        }]);
      }
    } catch (dbErr) {
      console.warn('Supabase comment insert skipped:', dbErr.message);
    }

    return NextResponse.json({ success: true, comment: newComment }, { status: 201 });
  } catch (error) {
    if (error.name === 'AuthError') return authErrorResponse(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
