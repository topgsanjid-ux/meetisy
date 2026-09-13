import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabase/server';
import { requireAuth, authErrorResponse } from '../../../../lib/middleware';

// Reference the in-memory blockers store
// In a real app this would be a DB query; here we import for demo fallback
let localBlockersRef = null;
async function getBlockersStore() {
  if (!localBlockersRef) {
    try {
      const mod = await import('../../blockers/route');
      localBlockersRef = mod.blockersStore;
    } catch (_) {
      localBlockersRef = [];
    }
  }
  return localBlockersRef;
}

/**
 * PATCH /api/blockers/:id
 * Update blocker status. JWT required. Validates user belongs to same team.
 * Body: { status } — one of: 'open', 'working_on', 'resolved', 'threaded'
 */
export async function PATCH(req, { params }) {
  try {
    const user = await requireAuth(req);
    const blockerId = params.id;
    const body = await req.json();

    const validStatuses = ['open', 'working_on', 'resolved', 'threaded'];
    const newStatus = body.status;

    if (!newStatus || !validStatuses.includes(newStatus)) {
      return NextResponse.json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Attempt Supabase update
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('demo-placeholder')) {
      try {
        // Verify blocker exists and user belongs to same team
        const { data: blocker, error: fetchErr } = await supabaseServer
          .from('blockers')
          .select('*')
          .eq('id', blockerId)
          .single();

        if (fetchErr || !blocker) {
          return NextResponse.json({ success: false, error: 'Blocker not found.' }, { status: 404 });
        }

        if (blocker.team_id !== user.team_id) {
          return NextResponse.json({ success: false, error: 'Unauthorized: You do not belong to this team.' }, { status: 403 });
        }

        const { data: updated, error: updateErr } = await supabaseServer
          .from('blockers')
          .update({ status: newStatus, updated_at: now })
          .eq('id', blockerId)
          .select()
          .single();

        if (!updateErr && updated) {
          return NextResponse.json({ success: true, blocker: updated });
        }
      } catch (dbErr) {
        console.warn('Supabase blocker update fallback:', dbErr.message);
      }
    }

    // In-memory fallback
    const store = await getBlockersStore();
    const blockerIndex = store.findIndex(b => b.id === blockerId);
    if (blockerIndex === -1) {
      return NextResponse.json({ success: false, error: 'Blocker not found.' }, { status: 404 });
    }

    const blocker = store[blockerIndex];

    // Validate user belongs to same team
    if (blocker.team_id !== user.team_id && user.team_id) {
      return NextResponse.json({ success: false, error: 'Unauthorized: You do not belong to this team.' }, { status: 403 });
    }

    store[blockerIndex] = { ...blocker, status: newStatus, updated_at: now };
    return NextResponse.json({ success: true, blocker: store[blockerIndex] });
  } catch (error) {
    if (error.name === 'AuthError') return authErrorResponse(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
