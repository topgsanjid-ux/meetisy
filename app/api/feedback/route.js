import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase/server';
import { requireAuth, authErrorResponse } from '../../../lib/middleware';

// In-memory feedback store for offline/demo fallback
let feedbackStore = [];

/**
 * GET /api/feedback?standup_id=<id>
 * Fetch feedback/scores for a specific standup. JWT required.
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
          .from('feedback')
          .select('*')
          .eq('standup_id', standupId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const avgScore = data.length > 0
            ? (data.reduce((sum, f) => sum + (f.score || 0), 0) / data.length).toFixed(1)
            : null;

          return NextResponse.json({
            success: true,
            feedback: data,
            stats: {
              total_reviews: data.length,
              average_score: avgScore ? parseFloat(avgScore) : null
            }
          });
        }
      } catch (dbErr) {
        console.warn('Supabase feedback fetch fallback:', dbErr.message);
      }
    }

    // In-memory fallback
    const filtered = feedbackStore.filter(f => f.standup_id === standupId);
    const avgScore = filtered.length > 0
      ? (filtered.reduce((sum, f) => sum + (f.score || 0), 0) / filtered.length).toFixed(1)
      : null;

    return NextResponse.json({
      success: true,
      feedback: filtered,
      stats: {
        total_reviews: filtered.length,
        average_score: avgScore ? parseFloat(avgScore) : null
      }
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * POST /api/feedback
 * Submit a score (1-10) and optional comment for a standup. JWT required.
 * Body: { standup_id, score, comment? }
 */
export async function POST(req) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();

    const { standup_id, score, comment } = body;

    if (!standup_id) {
      return NextResponse.json({ success: false, error: 'standup_id is required.' }, { status: 400 });
    }

    if (!score || typeof score !== 'number' || score < 1 || score > 10) {
      return NextResponse.json({ success: false, error: 'score is required and must be an integer between 1 and 10.' }, { status: 400 });
    }

    const newFeedback = {
      id: `fb-${Date.now()}`,
      standup_id,
      user_id: user.id,
      score: Math.round(score),
      comment: comment ? comment.trim() : null,
      created_at: new Date().toISOString()
    };

    // Store in memory
    feedbackStore.push(newFeedback);

    // Attempt Supabase insert
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('demo-placeholder')) {
        await supabaseServer.from('feedback').insert([{
          standup_id: newFeedback.standup_id,
          user_id: newFeedback.user_id,
          score: newFeedback.score,
          comment: newFeedback.comment,
          created_at: newFeedback.created_at
        }]);
      }
    } catch (dbErr) {
      console.warn('Supabase feedback insert skipped:', dbErr.message);
    }

    return NextResponse.json({ success: true, feedback: newFeedback }, { status: 201 });
  } catch (error) {
    if (error.name === 'AuthError') return authErrorResponse(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Export the store for the summary endpoint
export { feedbackStore };
