import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../../../lib/supabase/server';
import { requireAuth, authErrorResponse } from '../../../../../lib/middleware';

/**
 * PATCH /api/whiteboard/tasks/:id
 * Update a whiteboard task (status, scope, assigned_to, title, description, priority, due_date, notes).
 * JWT required.
 * Allows moving tasks between 'personal' and 'team' scope!
 */
export async function PATCH(req, { params }) {
  try {
    const user = await requireAuth(req);
    const taskId = params.id;
    const body = await req.json();

    const validStatuses = ['todo', 'in_progress', 'done'];
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    const validScopes = ['team', 'personal'];

    const updates = {};
    if (body.title && typeof body.title === 'string') updates.title = body.title.trim();
    if (body.description !== undefined) updates.description = body.description;
    if (body.status && validStatuses.includes(body.status)) updates.status = body.status;
    if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to;
    if (body.priority && validPriorities.includes(body.priority)) updates.priority = body.priority;
    if (body.scope && validScopes.includes(body.scope)) updates.scope = body.scope;
    if (body.due_date !== undefined) updates.due_date = body.due_date;
    if (body.notes !== undefined) updates.notes = body.notes;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No valid fields to update. Provide title, description, status, scope, assigned_to, priority, due_date, or notes.'
      }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    // Attempt Supabase update
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('demo-placeholder')) {
      try {
        const { data: task, error: fetchErr } = await supabaseServer
          .from('whiteboard_tasks')
          .select('*')
          .eq('id', taskId)
          .single();

        if (fetchErr || !task) {
          return NextResponse.json({ success: false, error: 'Task not found.' }, { status: 404 });
        }

        const { data: updated, error: updateErr } = await supabaseServer
          .from('whiteboard_tasks')
          .update(updates)
          .eq('id', taskId)
          .select()
          .single();

        if (!updateErr && updated) {
          return NextResponse.json({ success: true, task: updated });
        }
      } catch (dbErr) {
        console.warn('Supabase whiteboard task update fallback:', dbErr.message);
      }
    }

    // In-memory fallback
    let store;
    try {
      const mod = await import('../../tasks/route');
      store = mod.whiteboardStore;
    } catch (_) {
      store = [];
    }

    const taskIndex = store.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      return NextResponse.json({ success: false, error: 'Task not found.' }, { status: 404 });
    }

    const task = store[taskIndex];
    store[taskIndex] = { ...task, ...updates };
    return NextResponse.json({ success: true, task: store[taskIndex] });
  } catch (error) {
    if (error.name === 'AuthError') return authErrorResponse(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/whiteboard/tasks/:id
 * Delete a whiteboard task. JWT required.
 */
export async function DELETE(req, { params }) {
  try {
    const user = await requireAuth(req);
    const taskId = params.id;

    // Attempt Supabase delete
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('demo-placeholder')) {
      try {
        const { error: deleteErr } = await supabaseServer
          .from('whiteboard_tasks')
          .delete()
          .eq('id', taskId);

        if (!deleteErr) {
          return NextResponse.json({ success: true, message: 'Task deleted successfully.' });
        }
      } catch (dbErr) {
        console.warn('Supabase whiteboard task delete fallback:', dbErr.message);
      }
    }

    // In-memory fallback
    let store;
    try {
      const mod = await import('../../tasks/route');
      store = mod.whiteboardStore;
    } catch (_) {
      store = [];
    }

    const taskIndex = store.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      return NextResponse.json({ success: false, error: 'Task not found.' }, { status: 404 });
    }

    store.splice(taskIndex, 1);
    return NextResponse.json({ success: true, message: 'Task deleted successfully.' });
  } catch (error) {
    if (error.name === 'AuthError') return authErrorResponse(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
