import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabase/server';
import { requireAuth, authErrorResponse } from '../../../../lib/middleware';

/**
 * GET /api/comments/:standup_id
 * Fetch comments for a specific standup by ID. JWT required.
 */
export async function GET(req, { params }) {
  try {
    const user = await requireAuth(req);
    const standupId = params.standup_id;

    if (!standupId) {
      return NextResponse.json({ success: false, error: 'standup_id parameter is required.' }, { status: 400 });
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
    try {
      const mod = await import('../route');
      const commentsStore = mod.commentsStore || [];
      const filtered = commentsStore.filter(c => c.standup_id === standupId);
      return NextResponse.json({ success: true, comments: filtered });
    } catch (_) {
      return NextResponse.json({ success: true, comments: [] });
    }
  } catch (error) {
    if (error.name === 'AuthError') return authErrorResponse(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
