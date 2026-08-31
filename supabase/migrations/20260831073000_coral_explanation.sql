-- Add coral_explanation column to pronunciation_drills
-- Stores Kyle's teaching notes for the Práctica Coral sentence
-- Written by the seed-story.ts parser from the "Kyle's Notes:" section
ALTER TABLE pronunciation_drills ADD COLUMN IF NOT EXISTS coral_explanation text;
