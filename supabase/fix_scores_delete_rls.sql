-- Run this once in the Supabase Dashboard → SQL → New query
-- Fixes "delete log" returning 404: PostgREST only deletes rows visible under SELECT RLS,
-- and requires an explicit DELETE policy.

DROP POLICY IF EXISTS "Users can view their own score rows" ON scores;
CREATE POLICY "Users can view their own score rows" ON scores FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own scores" ON scores;
CREATE POLICY "Users can delete their own scores" ON scores FOR DELETE USING (auth.uid() = user_id);
