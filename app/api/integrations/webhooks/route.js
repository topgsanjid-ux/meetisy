import { NextResponse } from 'next/server';
import { sendSlackWebhook, sendTeamsWebhook, dispatchUrgentBlockerAlert } from '../../../../lib/integrations/webhooks';

// Store in-memory webhooks configuration for zero-config local dev
let WEBHOOK_CONFIG = {
  slack_webhook_url: process.env.SLACK_WEBHOOK_URL || '',
  teams_webhook_url: process.env.TEAMS_WEBHOOK_URL || '',
  is_active: true
};

export async function GET() {
  return NextResponse.json({
    success: true,
    config: WEBHOOK_CONFIG
  });
}

export async function POST(req) {
  try {
    const body = await req.json();

    if (body.action === 'save_config') {
      WEBHOOK_CONFIG.slack_webhook_url = body.slack_webhook_url || WEBHOOK_CONFIG.slack_webhook_url;
      WEBHOOK_CONFIG.teams_webhook_url = body.teams_webhook_url || WEBHOOK_CONFIG.teams_webhook_url;
      WEBHOOK_CONFIG.is_active = body.is_active !== undefined ? body.is_active : WEBHOOK_CONFIG.is_active;

      return NextResponse.json({
        success: true,
        message: 'Webhook configuration saved successfully.',
        config: WEBHOOK_CONFIG
      });
    }

    if (body.action === 'test_webhook') {
      const type = body.type || 'slack';
      const targetUrl = type === 'slack' ? body.url || WEBHOOK_CONFIG.slack_webhook_url : body.url || WEBHOOK_CONFIG.teams_webhook_url;

      if (!targetUrl) {
        return NextResponse.json({ success: false, error: `No ${type} webhook URL provided` }, { status: 400 });
      }

      const dummyStandup = { author_name: 'Sarah Chen (Test)' };
      const dummySummary = {
        status: 'Testing mvp_PRO webhook integration pipeline.',
        blockers: 'None reported.',
        next_steps: 'Verify message rendering in Slack/Teams channel.',
        decisions: 'Adopted Webhook Broadcast Engine.'
      };

      const result = type === 'slack' 
        ? await sendSlackWebhook(targetUrl, dummyStandup, dummySummary)
        : await sendTeamsWebhook(targetUrl, dummyStandup, dummySummary);

      return NextResponse.json({
        success: result.success,
        type,
        message: result.success ? `${type.toUpperCase()} test message dispatched!` : `Webhook dispatch failed: ${result.error || result.reason}`
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
