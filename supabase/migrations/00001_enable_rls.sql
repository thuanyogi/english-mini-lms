-- Enable RLS on tables with learner data
-- Run this in Supabase Dashboard → SQL Editor after running npm run db:migrate

-- 1. learners — user_id maps directly to auth.uid()
ALTER TABLE learners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "learners_own_data" ON learners
  FOR ALL USING (auth.uid() = user_id);

-- 2. learning_sessions
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_own_data" ON learning_sessions
  FOR ALL USING (
    learner_id IN (SELECT id FROM learners WHERE user_id = auth.uid())
  );

-- 3. session_events
ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "session_events_own_data" ON session_events
  FOR ALL USING (
    learner_id IN (SELECT id FROM learners WHERE user_id = auth.uid())
  );

-- 4. drafts
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drafts_own_data" ON drafts
  FOR ALL USING (
    learner_id IN (SELECT id FROM learners WHERE user_id = auth.uid())
  );

-- 5. media_objects
ALTER TABLE media_objects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media_own_data" ON media_objects
  FOR ALL USING (
    learner_id IN (SELECT id FROM learners WHERE user_id = auth.uid())
  );

-- 6. submissions
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "submissions_own_data" ON submissions
  FOR ALL USING (
    learner_id IN (SELECT id FROM learners WHERE user_id = auth.uid())
  );

-- 7. assessments
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assessments_own_data" ON assessments
  FOR ALL USING (
    learner_id IN (SELECT id FROM learners WHERE user_id = auth.uid())
  );

-- 8. feedback_versions
ALTER TABLE feedback_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback_own_data" ON feedback_versions
  FOR ALL USING (
    learner_id IN (SELECT id FROM learners WHERE user_id = auth.uid())
  );

-- 9. error_observations
ALTER TABLE error_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "errors_own_data" ON error_observations
  FOR ALL USING (
    learner_id IN (SELECT id FROM learners WHERE user_id = auth.uid())
  );

-- 10. vocabulary_vault
ALTER TABLE vocabulary_vault ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vocab_own_data" ON vocabulary_vault
  FOR ALL USING (
    learner_id IN (SELECT id FROM learners WHERE user_id = auth.uid())
  );

-- 11. vocabulary_reviews
ALTER TABLE vocabulary_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vocab_reviews_own_data" ON vocabulary_reviews
  FOR ALL USING (
    learner_id IN (SELECT id FROM learners WHERE user_id = auth.uid())
  );

-- 12. usage_events
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usage_own_data" ON usage_events
  FOR ALL USING (
    learner_id IN (SELECT id FROM learners WHERE user_id = auth.uid())
  );

-- Content tables (sources, source_segments, activities) — no RLS needed,
-- they are public read-only content managed by seed script.
-- Access control is at the API layer.
