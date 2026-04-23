-- Create orgs table
CREATE TABLE orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  age INTEGER,
  occupation TEXT, -- 'student' or 'job'
  org_id UUID REFERENCES orgs(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create scores table
CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE,
  raw_input TEXT,
  parsed_activities JSONB NOT NULL,
  total_score FLOAT NOT NULL,
  breakdown JSONB NOT NULL,
  suggestions JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Simple RLS Policies (can be refined later)
CREATE POLICY "Public orgs are viewable by everyone" ON orgs FOR SELECT USING (true);
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view scores in their org" ON scores FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.org_id = scores.org_id
  )
);
CREATE POLICY "Users can insert their own scores" ON scores FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create leaderboard view
CREATE OR REPLACE VIEW leaderboard_view AS
WITH weekly_scores AS (
  SELECT 
    id,
    user_id,
    org_id,
    total_score,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as entry_rank_asc,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as entry_rank_desc
  FROM scores
  WHERE created_at > NOW() - INTERVAL '7 days'
)
SELECT 
  p.id as user_id,
  p.name,
  p.org_id,
  SUM(s.total_score) as total_score,
  COUNT(s.id) as score_count,
  (
    SELECT last_s.total_score - first_s.total_score
    FROM scores last_s, scores first_s
    WHERE last_s.user_id = p.id AND first_s.user_id = p.id
    AND last_s.id = (SELECT ws_last.id FROM weekly_scores ws_last WHERE ws_last.user_id = p.id AND ws_last.entry_rank_desc = 1 LIMIT 1)
    AND first_s.id = (SELECT ws_first.id FROM weekly_scores ws_first WHERE ws_first.user_id = p.id AND ws_first.entry_rank_asc = 1 LIMIT 1)
  ) as improvement_delta
FROM profiles p
JOIN scores s ON p.id = s.user_id
WHERE s.created_at > NOW() - INTERVAL '7 days'
GROUP BY p.id, p.name, p.org_id;
