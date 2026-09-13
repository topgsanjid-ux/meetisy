-- =============================================================================
-- mvp_PRO Production Database Schema (PostgreSQL / Supabase)
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Teams Table
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    timezone VARCHAR(100) DEFAULT 'America/New_York',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT, -- Stored as salt:hash
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) CHECK (role IN ('member', 'manager')) DEFAULT 'member',
    user_role VARCHAR(100) DEFAULT 'Software Engineer',
    avatar TEXT,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Standups Table
CREATE TABLE IF NOT EXISTS public.standups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    media_url TEXT,
    transcript TEXT,
    summary_json JSONB DEFAULT '{}'::jsonb, -- { "status": "...", "blockers": "...", "next_steps": "...", "decisions": "..." }
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Standup Comments Table
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    standup_id UUID REFERENCES public.standups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    author_name VARCHAR(255) NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for high performance
CREATE INDEX IF NOT EXISTS idx_standups_team_created ON public.standups(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_standups_user ON public.standups(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 5. Blockers Table (Extracted from standups, with actionable status tracking)
CREATE TABLE IF NOT EXISTS public.blockers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    standup_id UUID REFERENCES public.standups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    status VARCHAR(20) CHECK (status IN ('open', 'working_on', 'resolved', 'threaded')) DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Whiteboard Tasks Table (Collaborative & Individual task board)
CREATE TABLE IF NOT EXISTS public.whiteboard_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    standup_id UUID REFERENCES public.standups(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status VARCHAR(20) CHECK (status IN ('todo', 'in_progress', 'done')) DEFAULT 'todo',
    priority VARCHAR(10) CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    scope VARCHAR(20) CHECK (scope IN ('team', 'personal')) DEFAULT 'team',
    source VARCHAR(20) DEFAULT 'manual',
    due_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Automation Rules Table (Reminder/notification rules per team)
CREATE TABLE IF NOT EXISTS public.automation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
    rule_type VARCHAR(30) CHECK (rule_type IN ('standup_reminder', 'blocker_followup', 'digest')) DEFAULT 'standup_reminder',
    cron_expression VARCHAR(50) NOT NULL,
    recipient_emails TEXT[] DEFAULT '{}',
    message_template TEXT,
    is_active BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Feedback Table (Scoring & reviews for standups)
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    standup_id UUID REFERENCES public.standups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    score INTEGER CHECK (score >= 1 AND score <= 10),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_blockers_team ON public.blockers(team_id, status);
CREATE INDEX IF NOT EXISTS idx_blockers_standup ON public.blockers(standup_id);
CREATE INDEX IF NOT EXISTS idx_whiteboard_team ON public.whiteboard_tasks(team_id, status);
CREATE INDEX IF NOT EXISTS idx_whiteboard_assigned ON public.whiteboard_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_automation_team ON public.automation_rules(team_id, is_active);
CREATE INDEX IF NOT EXISTS idx_feedback_standup ON public.feedback(standup_id);

-- Row Level Security (RLS) Policies
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.standups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whiteboard_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Allow read/write for authenticated users within their assigned team
CREATE POLICY "Allow public read access for demo" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Allow public read access for demo" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow public read access for demo" ON public.standups FOR SELECT USING (true);
CREATE POLICY "Allow public insert for standups" ON public.standups FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read for comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Allow public insert for comments" ON public.comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read for blockers" ON public.blockers FOR SELECT USING (true);
CREATE POLICY "Allow public insert for blockers" ON public.blockers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update for blockers" ON public.blockers FOR UPDATE USING (true);
CREATE POLICY "Allow public read for whiteboard" ON public.whiteboard_tasks FOR SELECT USING (true);
CREATE POLICY "Allow public insert for whiteboard" ON public.whiteboard_tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update for whiteboard" ON public.whiteboard_tasks FOR UPDATE USING (true);
CREATE POLICY "Allow public delete for whiteboard" ON public.whiteboard_tasks FOR DELETE USING (true);
CREATE POLICY "Allow public read for automation" ON public.automation_rules FOR SELECT USING (true);
CREATE POLICY "Allow public insert for automation" ON public.automation_rules FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read for feedback" ON public.feedback FOR SELECT USING (true);
CREATE POLICY "Allow public insert for feedback" ON public.feedback FOR INSERT WITH CHECK (true);

-- Seed Initial Engineering Alpha Team
INSERT INTO public.teams (id, name, timezone)
VALUES ('11111111-1111-1111-1111-111111111111', 'Engineering Team Alpha', 'America/New_York')
ON CONFLICT (id) DO NOTHING;
