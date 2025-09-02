-- Add member nickname and fake online count columns to hubs table
ALTER TABLE hubs
ADD COLUMN member_nickname_plural TEXT NULL,
ADD COLUMN fake_online_count SMALLINT NULL CHECK (fake_online_count >= 1 AND fake_online_count <= 150);