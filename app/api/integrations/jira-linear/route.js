import { NextResponse } from 'next/server';
import { syncTaskToJira, syncTaskToLinear } from '../../../../lib/integrations/jira-linear';

export async function POST(req) {
  try {
    const body = await req.json();
    const task = body.task || {
      title: body.title || 'Resolve standup blocker',
      description: body.description || 'Blocker automatically captured from voice update.',
      priority: body.priority || 'high',
      source: 'ai_blocker'
    };

    const platform = body.platform || 'jira';
    const result = platform === 'linear' 
      ? await syncTaskToLinear(task)
      : await syncTaskToJira(task);

    return NextResponse.json({
      success: true,
      platform,
      result
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
