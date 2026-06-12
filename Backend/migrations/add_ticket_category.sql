-- Add category and resolution columns to tickets table
-- Run this in your Supabase SQL Editor

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolution TEXT;

-- resolution values: 'auto_sent', 'approved', 'edited_and_sent', 'rejected'
COMMENT ON COLUMN tickets.category IS 'Email classification category (e.g., billing, complaint, general_inquiry)';
COMMENT ON COLUMN tickets.resolution IS 'How the ticket was resolved: auto_sent, approved, edited_and_sent, rejected';
