import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase/server';
import { getCurrentUser } from '../../../lib/auth';

// Persistent in-memory storage fallback for offline/demo operation
let standupsStore = [
  {
    id: 'st-1',
    user_id: 'usr-1',
    team_id: '11111111-1111-1111-1111-111111111111',
    user_name: 'Sarah Chen',
    user_role: 'Staff Backend Engineer',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=SarahChen',
    media_url: null,
    transcript: 'Today I refactored the auth token middleware and implemented rate limiting using Upstash Redis. Blockers: Facing a minor CORS issue on the Supabase storage bucket policy. Next steps: Complete GraphQL queries for team digest. Decision: Migrated from in-memory cache to Redis.',
    summary: {
      status: 'Refactored auth token middleware & implemented Upstash Redis rate limiting.',
      blockers: 'CORS policy misconfiguration on Supabase storage bucket.',
      next_steps: 'Complete GraphQL queries for daily team digest.',
      decisions: 'Migrated session cache to Upstash Redis for distributed multi-region support.'
    },
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    likes: 4,
    comments: [
      { id: 101, author: 'Marcus Vance', text: 'I fixed a similar CORS policy yesterday, I can review your bucket config!', time: '30m ago' }
    ]
  },
  {
    id: 'st-2',
    user_id: 'usr-2',
    team_id: '11111111-1111-1111-1111-111111111111',
    user_name: 'Marcus Vance',
    user_role: 'Tech Lead',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=MarcusVance',
    media_url: null,
    transcript: 'Conducted sprint planning and finalized the Q3 architecture roadmap for microservices. No blockers. Next steps: Sync with product team on search archive wireframes. Decision: Adopted monorepo package structure.',
    summary: {
      status: 'Conducted sprint planning & finalized Q3 microservices architecture roadmap.',
      blockers: 'None reported.',
      next_steps: 'Sync with product design team on search archive wireframes.',
      decisions: 'Adopted monorepo package structure for shared AI inference models.'
    },
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    likes: 6,
    comments: []
  },
  {
    id: 'st-3',
    user_id: 'usr-4',
    team_id: '11111111-1111-1111-1111-111111111111',
    user_name: 'Priya Patel',
    user_role: 'DevOps Lead',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=PriyaPatel',
    media_url: null,
    transcript: 'Migrated staging environment to Kubernetes v1.29 and updated CI/CD Github Actions pipeline. No blockers. Next steps: Run security audit and benchmark database indexing performance. Decision: Standardized on Helm charts.',
    summary: {
      status: 'Migrated staging cluster to Kubernetes v1.29 & updated CI/CD GitHub Actions.',
      blockers: 'None reported.',
      next_steps: 'Perform automated security audit & database indexing benchmark.',
      decisions: 'Standardized infrastructure automation on declarative Helm charts.'
    },
    created_at: new Date(Date.now() - 1000 * 60 * 210).toISOString(),
    likes: 3,
    comments: []
  }
];

export async function GET() {
  try {
    // Attempt Supabase fetch if configured
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('demo-placeholder')) {
      const { data, error } = await supabaseServer
        .from('standups')
        .select('*, users:user_id(name, user_role, avatar)')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const formatted = data.map((item) => {
          // Parse summary_json robustly (handles both object and string storage)
          let summary = item.summary_json || {};
          if (typeof summary === 'string') {
            try { summary = JSON.parse(summary); } catch (_) { summary = {}; }
          }
          // Ensure all 4 required fields exist
          summary = {
            status: summary.status || 'No status provided.',
            blockers: summary.blockers || 'None reported.',
            next_steps: summary.next_steps || 'No next steps provided.',
            decisions: summary.decisions || 'No major architectural decisions reported today.'
          };

          return {
            id: item.id,
            user_id: item.user_id,
            team_id: item.team_id,
            user_name: item.users?.name || 'Engineering Member',
            user_role: item.users?.user_role || 'Developer',
            avatar: item.users?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${item.id}`,
            media_url: item.media_url,
            transcript: item.transcript,
            summary,
            created_at: item.created_at,
            likes: item.likes || 0,
            comments: []
          };
        });
        return NextResponse.json({ success: true, standups: formatted });
      }
    }
  } catch (err) {
    console.warn('Supabase DB fetch fallback activated:', err.message);
  }

  // Return persistent store fallback
  return NextResponse.json({ success: true, standups: standupsStore });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const currentUser = await getCurrentUser();

    const userName = currentUser?.name || body.user_name || 'Sarah Chen';
    const userRole = currentUser?.user_role || body.user_role || 'Staff Backend Engineer';
    const userId = currentUser?.id || body.user_id || 'usr-1';
    const teamId = currentUser?.team_id || body.team_id || '11111111-1111-1111-1111-111111111111';

    const newStandup = {
      id: `st-${Date.now()}`,
      user_id: userId,
      team_id: teamId,
      user_name: userName,
      user_role: userRole,
      avatar: body.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userName)}`,
      media_url: body.media_url || null,
      transcript: body.transcript || 'Audio standup recorded.',
      summary: body.summary || {
        status: 'Updated daily sprint deliverables.',
        blockers: 'None reported.',
        next_steps: 'Continue feature deployment.',
        decisions: 'No major architectural decisions reported today.'
      },
      created_at: new Date().toISOString(),
      likes: 0,
      comments: []
    };

    // Store in memory
    standupsStore.unshift(newStandup);

    // Attempt Supabase insert if configured
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('demo-placeholder')) {
        await supabaseServer.from('standups').insert([{
          id: crypto.randomUUID(),
          user_id: userId,
          team_id: teamId,
          media_url: newStandup.media_url || '',
          transcript: newStandup.transcript,
          summary_json: newStandup.summary,
          created_at: newStandup.created_at
        }]);
      }
    } catch (dbErr) {
      console.warn('Supabase DB write skipped/failed:', dbErr.message);
    }

    return NextResponse.json({ success: true, standup: newStandup });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
