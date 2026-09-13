import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase/server';
import { requireAuth, authErrorResponse } from '../../../lib/middleware';

// In-memory blockers store for offline/demo fallback
let blockersStore = [
  {
    id: 'blk-1',
    standup_id: 'st-1',
    user_id: 'usr-1',
    team_id: '11111111-1111-1111-1111-111111111111',
    description: 'CORS policy misconfiguration on Supabase storage bucket.',
    status: 'open',
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 45).toISOString()
  }
];

/**
 * GET /api/blockers?team_id=<id>
 * Fetch all blockers for a team. JWT required.
 */
export async function GET(req) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get('team_id') || user.team_id;

    if (!teamId) {
      return NextResponse.json({ success: false, error: 'team_id is required.' }, { status: 400 });
    }

    // Attempt Supabase fetch
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('demo-placeholder')) {
      try {
        const { data, error } = await supabaseServer
          .from('blockers')
          .select('*')
          .eq('team_id', teamId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          return NextResponse.json({ success: true, blockers: data });
        }
      } catch (dbErr) {
        console.warn('Supabase blockers fetch fallback:', dbErr.message);
      }
    }

    // In-memory fallback
    const filtered = blockersStore.filter(b => b.team_id === teamId);
    return NextResponse.json({ success: true, blockers: filtered });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * POST /api/blockers
 * Create a new blocker. JWT required.
 * Body: { standup_id, description, team_id? }
 */
export async function POST(req) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();

    const { standup_id, description } = body;
    if (!description) {
      return NextResponse.json({ success: false, error: 'description is required.' }, { status: 400 });
    }

    const teamId = body.team_id || user.team_id || '11111111-1111-1111-1111-111111111111';
    const now = new Date().toISOString();

    const newBlocker = {
      id: `blk-${Date.now()}`,
      standup_id: standup_id || null,
      user_id: user.id,
      team_id: teamId,
      description: description.trim(),
      status: 'open',
      created_at: now,
      updated_at: now
    };

    // Store in memory
    blockersStore.unshift(newBlocker);

    // Attempt Supabase insert
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('demo-placeholder')) {
        await supabaseServer.from('blockers').insert([{
          standup_id: newBlocker.standup_id,
          user_id: newBlocker.user_id,
          team_id: newBlocker.team_id,
          description: newBlocker.description,
          status: newBlocker.status,
          created_at: newBlocker.created_at,
          updated_at: newBlocker.updated_at
        }]);
      }
    } catch (dbErr) {
      console.warn('Supabase blocker insert skipped:', dbErr.message);
    }

    return NextResponse.json({ success: true, blocker: newBlocker }, { status: 201 });
  } catch (error) {
    if (error.name === 'AuthError') return authErrorResponse(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Export the store so the transcribe integration can push AI-extracted blockers
export { blockersStore };
