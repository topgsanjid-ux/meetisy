import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabase/server';
import { requireAuth, authErrorResponse } from '../../../../lib/middleware';

// In-memory whiteboard tasks store for offline/demo fallback
let whiteboardStore = [
  {
    id: 'wb-1',
    team_id: '11111111-1111-1111-1111-111111111111',
    user_id: 'usr-3',
    standup_id: null,
    title: 'Set up CI/CD pipeline for staging',
    description: 'Configure GitHub Actions workflow for automated deployments to staging environment.',
    assigned_to: 'usr-3',
    status: 'in_progress',
    priority: 'high',
    scope: 'team',
    source: 'manual',
    due_date: null,
    notes: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
  },
  {
    id: 'wb-2',
    team_id: '11111111-1111-1111-1111-111111111111',
    user_id: 'usr-1',
    standup_id: 'st-1',
    title: 'Resolve CORS issue on Supabase storage bucket',
    description: 'Fix the CORS policy misconfiguration blocking media uploads.',
    assigned_to: 'usr-1',
    status: 'todo',
    priority: 'critical',
    scope: 'team',
    source: 'ai_blocker',
    due_date: null,
    notes: null,
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 45).toISOString()
  },
  {
    id: 'wb-3',
    team_id: '11111111-1111-1111-1111-111111111111',
    user_id: 'usr-1',
    standup_id: null,
    title: 'Personal Refactoring & Unit Test Plan',
    description: 'Private tasks for organizing workload and priority list.',
    assigned_to: 'usr-1',
    status: 'in_progress',
    priority: 'medium',
    scope: 'personal',
    source: 'manual',
    due_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
    notes: 'Remember to verify mock setup in Jest.',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  }
];

/**
 * GET /api/whiteboard/tasks
 * Fetch whiteboard tasks. JWT required.
 * Query params:
 *   - scope: 'team' | 'personal' (default: all visible)
 *   - user_id: fetch personal tasks for a specific user ID
 *   - team_id: filter by team ID
 */
export async function GET(req) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);

    const scopeFilter = searchParams.get('scope'); // 'team' | 'personal'
    const targetUserId = searchParams.get('user_id') || user.id;
    const teamId = searchParams.get('team_id') || user.team_id || '11111111-1111-1111-1111-111111111111';

    // Attempt Supabase fetch
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('demo-placeholder')) {
      try {
        let query = supabaseServer.from('whiteboard_tasks').select('*');

        if (scopeFilter === 'personal' || searchParams.has('user_id')) {
          // Fetch personal tasks (owned by user OR assigned to user OR scope personal)
          query = query.or(`user_id.eq.${targetUserId},assigned_to.eq.${targetUserId}`);
          if (scopeFilter) query = query.eq('scope', scopeFilter);
        } else if (scopeFilter === 'team') {
          query = query.eq('team_id', teamId).eq('scope', 'team');
        } else {
          // All visible tasks for team or user
          query = query.or(`team_id.eq.${teamId},user_id.eq.${targetUserId},assigned_to.eq.${targetUserId}`);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data) {
          return NextResponse.json({ success: true, tasks: data });
        }
      } catch (dbErr) {
        console.warn('Supabase whiteboard fetch fallback:', dbErr.message);
      }
    }

    // In-memory fallback
    let filtered = whiteboardStore;

    if (scopeFilter === 'personal' || searchParams.has('user_id')) {
      filtered = whiteboardStore.filter(t => 
        (t.user_id === targetUserId || t.assigned_to === targetUserId || t.scope === 'personal') &&
        (!scopeFilter || t.scope === scopeFilter)
      );
    } else if (scopeFilter === 'team') {
      filtered = whiteboardStore.filter(t => t.team_id === teamId && (t.scope === 'team' || !t.scope));
    } else {
      filtered = whiteboardStore.filter(t => t.team_id === teamId || t.user_id === targetUserId || t.assigned_to === targetUserId);
    }

    return NextResponse.json({ success: true, tasks: filtered });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * POST /api/whiteboard/tasks
 * Create a new task (team or personal). JWT required.
 * Body: { title, description?, assigned_to?, priority?, scope?, due_date?, notes?, source?, standup_id? }
 */
export async function POST(req) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();

    const { title, description, assigned_to, priority, scope, due_date, notes, source, standup_id } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ success: false, error: 'title is required.' }, { status: 400 });
    }

    const validPriorities = ['low', 'medium', 'high', 'critical'];
    const validScopes = ['team', 'personal'];
    const validSources = ['manual', 'ai_blocker', 'ai_standup'];

    const taskScope = validScopes.includes(scope) ? scope : 'team';
    const teamId = user.team_id || '11111111-1111-1111-1111-111111111111';
    const userId = body.user_id || user.id;
    const now = new Date().toISOString();

    const newTask = {
      id: `wb-${Date.now()}`,
      team_id: teamId,
      user_id: userId,
      standup_id: standup_id || null,
      title: title.trim(),
      description: description || null,
      assigned_to: assigned_to || (taskScope === 'personal' ? userId : null),
      status: body.status || 'todo',
      priority: validPriorities.includes(priority) ? priority : 'medium',
      scope: taskScope,
      source: validSources.includes(source) ? source : 'manual',
      due_date: due_date || null,
      notes: notes || null,
      created_at: now,
      updated_at: now
    };

    // Store in memory
    whiteboardStore.unshift(newTask);

    // Attempt Supabase insert
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('demo-placeholder')) {
        await supabaseServer.from('whiteboard_tasks').insert([{
          team_id: newTask.team_id,
          user_id: newTask.user_id,
          standup_id: newTask.standup_id,
          title: newTask.title,
          description: newTask.description,
          assigned_to: newTask.assigned_to,
          status: newTask.status,
          priority: newTask.priority,
          scope: newTask.scope,
          source: newTask.source,
          due_date: newTask.due_date,
          notes: newTask.notes,
          created_at: newTask.created_at,
          updated_at: newTask.updated_at
        }]);
      }
    } catch (dbErr) {
      console.warn('Supabase whiteboard task insert skipped:', dbErr.message);
    }

    return NextResponse.json({ success: true, task: newTask }, { status: 201 });
  } catch (error) {
    if (error.name === 'AuthError') return authErrorResponse(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Export store for AI pipeline & PATCH/DELETE routes
export { whiteboardStore };
