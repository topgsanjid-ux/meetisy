import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase/server';
import { requireAuth, authErrorResponse } from '../../../lib/middleware';

// In-memory automation rules store for offline/demo fallback
let automationStore = [];

/**
 * GET /api/automation
 * Fetch automation rules for the user's team. JWT required.
 */
export async function GET(req) {
  try {
    const user = await requireAuth(req);
    const teamId = user.team_id || '11111111-1111-1111-1111-111111111111';

    // Attempt Supabase fetch
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('demo-placeholder')) {
      try {
        const { data, error } = await supabaseServer
          .from('automation_rules')
          .select('*')
          .eq('team_id', teamId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          return NextResponse.json({ success: true, rules: data });
        }
      } catch (dbErr) {
        console.warn('Supabase automation fetch fallback:', dbErr.message);
      }
    }

    // In-memory fallback
    const filtered = automationStore.filter(r => r.team_id === teamId);
    return NextResponse.json({ success: true, rules: filtered });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * POST /api/automation
 * Save a new automation/reminder rule. JWT required.
 * Body: { rule_type, cron_expression, recipient_emails: string[], message_template? }
 */
export async function POST(req) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();

    const validRuleTypes = ['standup_reminder', 'blocker_followup', 'digest'];
    const { rule_type, cron_expression, recipient_emails, message_template } = body;

    if (!rule_type || !validRuleTypes.includes(rule_type)) {
      return NextResponse.json({
        success: false,
        error: `Invalid rule_type. Must be one of: ${validRuleTypes.join(', ')}`
      }, { status: 400 });
    }

    if (!cron_expression || typeof cron_expression !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'cron_expression is required (e.g., "0 9 * * 1-5" for weekdays at 9 AM).'
      }, { status: 400 });
    }

    // Validate cron expression format (basic 5-field check)
    const cronParts = cron_expression.trim().split(/\s+/);
    if (cronParts.length < 5 || cronParts.length > 6) {
      return NextResponse.json({
        success: false,
        error: 'Invalid cron expression. Must be a standard 5-field cron (e.g., "0 9 * * 1-5").'
      }, { status: 400 });
    }

    if (!recipient_emails || !Array.isArray(recipient_emails) || recipient_emails.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'recipient_emails array is required and must not be empty.'
      }, { status: 400 });
    }

    const teamId = user.team_id || '11111111-1111-1111-1111-111111111111';
    const now = new Date().toISOString();

    const newRule = {
      id: `rule-${Date.now()}`,
      team_id: teamId,
      created_by: user.id,
      rule_type,
      cron_expression: cron_expression.trim(),
      recipient_emails,
      message_template: message_template || getDefaultTemplate(rule_type),
      is_active: true,
      last_triggered_at: null,
      created_at: now
    };

    // Store in memory
    automationStore.push(newRule);

    // Attempt Supabase insert
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('demo-placeholder')) {
        await supabaseServer.from('automation_rules').insert([{
          team_id: newRule.team_id,
          created_by: newRule.created_by,
          rule_type: newRule.rule_type,
          cron_expression: newRule.cron_expression,
          recipient_emails: newRule.recipient_emails,
          message_template: newRule.message_template,
          is_active: newRule.is_active,
          created_at: newRule.created_at
        }]);
      }
    } catch (dbErr) {
      console.warn('Supabase automation rule insert skipped:', dbErr.message);
    }

    return NextResponse.json({ success: true, rule: newRule }, { status: 201 });
  } catch (error) {
    if (error.name === 'AuthError') return authErrorResponse(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function getDefaultTemplate(ruleType) {
  switch (ruleType) {
    case 'standup_reminder':
      return '📣 Reminder: Please submit your daily standup update. Your team is waiting to hear from you!';
    case 'blocker_followup':
      return '🚨 Blocker Follow-up: You have unresolved blockers from your last standup. Please provide an update.';
    case 'digest':
      return '📊 Your daily team digest is ready. Check the latest standup summaries from your team.';
    default:
      return '🚨 mvp_PRO Reminder: Action required.';
  }
}

// Export the store for the cron job
export { automationStore };
