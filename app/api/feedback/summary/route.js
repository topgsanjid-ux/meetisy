import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../../lib/supabase/server';
import { requireAuth, authErrorResponse } from '../../../../lib/middleware';

/**
 * GET /api/feedback/summary
 * Returns aggregated scoring data across all standups for the user's team.
 * Includes: overall average, total reviews, per-standup breakdown, feature summary.
 * JWT required.
 */
export async function GET(req) {
  try {
    const user = await requireAuth(req);
    const teamId = user.team_id || '11111111-1111-1111-1111-111111111111';

    let allFeedback = [];
    let standups = [];

    // Attempt Supabase fetch
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('demo-placeholder')) {
      try {
        const [feedbackRes, standupsRes] = await Promise.all([
          supabaseServer.from('feedback').select('*').order('created_at', { ascending: false }),
          supabaseServer.from('standups').select('id, user_id, summary_json, created_at').eq('team_id', teamId).order('created_at', { ascending: false })
        ]);

        if (!feedbackRes.error && feedbackRes.data) allFeedback = feedbackRes.data;
        if (!standupsRes.error && standupsRes.data) standups = standupsRes.data;
      } catch (dbErr) {
        console.warn('Supabase feedback summary fallback:', dbErr.message);
      }
    }

    // Fallback: try in-memory stores
    if (allFeedback.length === 0) {
      try {
        const mod = await import('../route');
        allFeedback = mod.feedbackStore || [];
      } catch (_) {}
    }

    // Calculate overall statistics
    const totalReviews = allFeedback.length;
    const overallAvg = totalReviews > 0
      ? parseFloat((allFeedback.reduce((sum, f) => sum + (f.score || 0), 0) / totalReviews).toFixed(1))
      : null;

    // Per-standup breakdown
    const standupMap = {};
    for (const fb of allFeedback) {
      if (!standupMap[fb.standup_id]) {
        standupMap[fb.standup_id] = { scores: [], comments: [] };
      }
      standupMap[fb.standup_id].scores.push(fb.score);
      if (fb.comment) standupMap[fb.standup_id].comments.push(fb.comment);
    }

    const perStandup = Object.entries(standupMap).map(([standupId, data]) => ({
      standup_id: standupId,
      review_count: data.scores.length,
      average_score: parseFloat((data.scores.reduce((a, b) => a + b, 0) / data.scores.length).toFixed(1)),
      min_score: Math.min(...data.scores),
      max_score: Math.max(...data.scores),
      comments: data.comments
    }));

    // Score distribution (1-10)
    const distribution = {};
    for (let i = 1; i <= 10; i++) distribution[i] = 0;
    for (const fb of allFeedback) {
      if (fb.score >= 1 && fb.score <= 10) distribution[fb.score]++;
    }

    // Feature summary
    const featureSummary = {
      audio_transcription: { name: 'Audio Transcription (Groq Whisper)', status: 'active' },
      ai_summarization: { name: 'AI Summarization (Groq Mixtral)', status: 'active' },
      comments: { name: 'Catch Up Comments', status: 'active' },
      blockers: { name: 'Urgent Blockers Tracking', status: 'active' },
      whiteboard: { name: 'Collaborative Whiteboard', status: 'active' },
      automation: { name: 'Automation Rules & Scheduler', status: 'active' },
      nudge: { name: 'Team Nudge Reminders', status: 'active' },
      digest: { name: 'Daily Email Digest', status: 'active' },
      scoring: { name: 'Preview & Scoring', status: 'active' },
      ai_assignment: { name: 'AI Task Assignment', status: 'active' }
    };

    return NextResponse.json({
      success: true,
      summary: {
        overall_average_score: overallAvg,
        total_reviews: totalReviews,
        total_standups_reviewed: Object.keys(standupMap).length,
        score_distribution: distribution,
        per_standup: perStandup,
        features: featureSummary
      }
    });
  } catch (error) {
    if (error.name === 'AuthError') return authErrorResponse(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
