import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabase/server';
import { requireAuth, authErrorResponse } from '../../../../lib/middleware';

// In-memory teams store fallback
let teamsStore = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Engineering Team Alpha',
    timezone: 'America/New_York',
    created_at: new Date().toISOString()
  }
];

/**
 * PATCH /api/teams/:id
 * Update team settings (name, timezone). JWT required — manager role only.
 * Body: { name?, timezone? }
 */
export async function PATCH(req, { params }) {
  try {
    const user = await requireAuth(req);
    const teamId = params.id;
    const body = await req.json();

    // Validate manager role
    if (user.role !== 'manager') {
      return NextResponse.json({
        success: false,
        error: 'Forbidden: Only team managers can update team settings.'
      }, { status: 403 });
    }

    // Validate user belongs to this team
    if (user.team_id && user.team_id !== teamId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized: You do not belong to this team.'
      }, { status: 403 });
    }

    const updates = {};
    if (body.name && typeof body.name === 'string') updates.name = body.name.trim();
    if (body.timezone && typeof body.timezone === 'string') updates.timezone = body.timezone.trim();

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid fields to update. Provide name and/or timezone.'
      }, { status: 400 });
    }

    // Attempt Supabase update
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('demo-placeholder')) {
      try {
        const { data: updated, error: updateErr } = await supabaseServer
          .from('teams')
          .update(updates)
          .eq('id', teamId)
          .select()
          .single();

        if (!updateErr && updated) {
          return NextResponse.json({ success: true, team: updated });
        }
      } catch (dbErr) {
        console.warn('Supabase team update fallback:', dbErr.message);
      }
    }

    // In-memory fallback
    const teamIndex = teamsStore.findIndex(t => t.id === teamId);
    if (teamIndex === -1) {
      return NextResponse.json({ success: false, error: 'Team not found.' }, { status: 404 });
    }

    teamsStore[teamIndex] = { ...teamsStore[teamIndex], ...updates };
    return NextResponse.json({ success: true, team: teamsStore[teamIndex] });
  } catch (error) {
    if (error.name === 'AuthError') return authErrorResponse(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
