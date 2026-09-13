import { NextResponse } from 'next/server';
import { transcribeAudio, summarizeStandup, extractBlockers, assignTaskRandomly } from '../../../lib/ai';
import { supabaseServer } from '../../../lib/supabase/server';
import { DEMO_USERS } from '../../../lib/auth';
import { sendSlackWebhook, sendTeamsWebhook, dispatchUrgentBlockerAlert } from '../../../lib/integrations/webhooks';
import { syncTaskToJira } from '../../../lib/integrations/jira-linear';

export async function POST(req) {
  try {
    const body = await req.json();
    let transcript = '';

    if (body.audioBase64) {
      const buffer = Buffer.from(body.audioBase64, 'base64');
      transcript = await transcribeAudio(buffer, body.mimeType || 'audio/webm');
    } else if (body.text) {
      transcript = body.text;
    } else {
      return NextResponse.json({ success: false, error: 'No audio or text input provided' }, { status: 400 });
    }

    // 1. Summarize the standup transcript
    const summary = await summarizeStandup(transcript);

    // 2. Extract blockers from the transcript via Groq AI
    const extractedBlockers = await extractBlockers(transcript);

    // 3. Get team members for AI task assignment
    let teamMembers = DEMO_USERS.map(u => ({
      id: u.id,
      name: u.name,
      user_role: u.user_role,
      role: u.role
    }));

    // Attempt to fetch real team members from Supabase
    const teamId = body.team_id || '11111111-1111-1111-1111-111111111111';
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('demo-placeholder')) {
      try {
        const { data: members, error } = await supabaseServer
          .from('users')
          .select('id, name, user_role, role')
          .eq('team_id', teamId);

        if (!error && members && members.length > 0) {
          teamMembers = members;
        }
      } catch (_) {}
    }

    // 4. Create whiteboard tasks from extracted blockers with AI assignment
    const createdTasks = [];
    const createdBlockers = [];
    const userId = body.user_id || 'usr-1';
    const standupId = body.standup_id || null;

    for (const blocker of extractedBlockers) {
      // Create blocker record
      const blockerRecord = {
        id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        standup_id: standupId,
        user_id: userId,
        team_id: teamId,
        description: blocker.description,
        status: 'open',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      createdBlockers.push(blockerRecord);

      // AI-assign a team member to the blocker task
      const assignment = await assignTaskRandomly(
        teamMembers,
        `Resolve: ${blocker.description}`,
        `Blocker extracted from standup. Severity: ${blocker.severity}`
      );

      const task = {
        id: `wb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        team_id: teamId,
        user_id: userId,
        standup_id: standupId,
        title: `Resolve: ${blocker.description}`,
        description: `Auto-generated from standup blocker (severity: ${blocker.severity}). ${assignment.reasoning}`,
        assigned_to: assignment.assigned_to_id,
        assigned_to_name: assignment.assigned_to_name,
        status: 'todo',
        priority: blocker.severity === 'critical' ? 'critical' : blocker.severity === 'high' ? 'high' : 'medium',
        scope: 'team',
        source: 'ai_blocker',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      createdTasks.push(task);

      // Persist to Supabase if configured
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('demo-placeholder')) {
        try {
          await Promise.all([
            supabaseServer.from('blockers').insert([{
              standup_id: blockerRecord.standup_id,
              user_id: blockerRecord.user_id,
              team_id: blockerRecord.team_id,
              description: blockerRecord.description,
              status: blockerRecord.status,
              created_at: blockerRecord.created_at,
              updated_at: blockerRecord.updated_at
            }]),
            supabaseServer.from('whiteboard_tasks').insert([{
              team_id: task.team_id,
              user_id: task.user_id,
              standup_id: task.standup_id,
              title: task.title,
              description: task.description,
              assigned_to: task.assigned_to,
              status: task.status,
              priority: task.priority,
              scope: task.scope,
              source: task.source,
              created_at: task.created_at,
              updated_at: task.updated_at
            }])
          ]);
        } catch (dbErr) {
          console.warn('Supabase blocker/task persistence skipped:', dbErr.message);
        }
      }
    }

    // 5. Enterprise Webhook Broadcast & Urgent Blocker Escalation Engine
    const slackUrl = process.env.SLACK_WEBHOOK_URL;
    const teamsUrl = process.env.TEAMS_WEBHOOK_URL;
    const authorUser = teamMembers.find(m => m.id === userId) || { name: 'Sarah Chen' };
    const dummyStandupObj = { author_name: authorUser.name, users: authorUser };

    let webhookStatus = { slack: false, teams: false, urgent_alert_sent: false };

    if (slackUrl) {
      const slackRes = await sendSlackWebhook(slackUrl, dummyStandupObj, summary, createdBlockers);
      webhookStatus.slack = slackRes.success;
    }
    if (teamsUrl) {
      const teamsRes = await sendTeamsWebhook(teamsUrl, dummyStandupObj, summary, createdBlockers);
      webhookStatus.teams = teamsRes.success;
    }

    // Trigger urgent blocker escalation if critical blockers detected
    const criticalBlocker = createdBlockers.find(b => b.severity === 'critical' || b.severity === 'high');
    if (criticalBlocker && (slackUrl || teamsUrl)) {
      await dispatchUrgentBlockerAlert(slackUrl || teamsUrl, criticalBlocker, authorUser);
      webhookStatus.urgent_alert_sent = true;
    }

    // 6. Jira Voice-to-Action Execution (Generate Jira issue payloads)
    const jiraIssuesSynced = [];
    for (const task of createdTasks) {
      const jiraSync = await syncTaskToJira(task);
      jiraIssuesSynced.push({
        task_id: task.id,
        jira_key: jiraSync.issue_key,
        jira_url: jiraSync.url,
        simulated: jiraSync.simulated || false
      });
    }

    return NextResponse.json({
      success: true,
      transcript,
      summary,
      blockers_extracted: createdBlockers,
      whiteboard_tasks_created: createdTasks,
      jira_issues_synced: jiraIssuesSynced,
      webhook_broadcast: webhookStatus,
      ai_pipeline: {
        blockers_found: extractedBlockers.length,
        tasks_created: createdTasks.length,
        jira_tickets_generated: jiraIssuesSynced.length,
        assignments: createdTasks.map(t => ({
          task: t.title,
          assigned_to: t.assigned_to_name,
          priority: t.priority
        }))
      }
    });
  } catch (error) {
    console.error('Transcribe API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
