-- Supabase database schema for dance attendance app
-- Run this in your Supabase SQL editor
--
-- NOTE: Skip any lines that cause permission errors (like ALTER DATABASE)
-- Supabase handles most of this automatically

-- Enable Row Level Security

-- Classes table
CREATE TABLE classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  synced BOOLEAN DEFAULT true,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Students table
CREATE TABLE students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "joinedAtISO" TEXT NOT NULL,
  archived BOOLEAN DEFAULT false,
  synced BOOLEAN DEFAULT true,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table (attendance registers)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  "classId" TEXT NOT NULL,
  "startedAtISO" TEXT NOT NULL,
  "closedAtISO" TEXT,
  marks JSONB DEFAULT '{}',
  synced BOOLEAN DEFAULT true,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Points table (rewards/points system)
CREATE TABLE points (
  id TEXT PRIMARY KEY,
  "studentId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  reason TEXT NOT NULL,
  points INTEGER NOT NULL,
  "createdAtISO" TEXT NOT NULL,
  "sessionId" TEXT,
  synced BOOLEAN DEFAULT true,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Awards table (achievements)
CREATE TABLE awards (
  id TEXT PRIMARY KEY,
  "awardId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "periodType" TEXT NOT NULL CHECK ("periodType" IN ('MONTH', 'YEAR', 'CUSTOM')),
  "periodKey" TEXT NOT NULL,
  "unlockedAtISO" TEXT NOT NULL,
  "decidedBy" TEXT NOT NULL CHECK ("decidedBy" IN ('SYSTEM', 'TEACHER')),
  synced BOOLEAN DEFAULT true,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_students_class_id ON students("classId");
CREATE INDEX idx_sessions_class_id ON sessions("classId");
CREATE INDEX idx_sessions_started_at ON sessions("startedAtISO");
CREATE INDEX idx_points_student_id ON points("studentId");
CREATE INDEX idx_points_class_id ON points("classId");
CREATE INDEX idx_points_created_at ON points("createdAtISO");
CREATE INDEX idx_awards_student_id ON awards("studentId");
CREATE INDEX idx_awards_class_id ON awards("classId");
CREATE INDEX idx_awards_period ON awards("periodType", "periodKey");

-- Row Level Security (RLS) policies
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE points ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (adjust as needed for your auth setup)
-- For now, allow all operations (you may want to restrict based on user roles later)
CREATE POLICY "Allow all operations on classes" ON classes FOR ALL USING (true);
CREATE POLICY "Allow all operations on students" ON students FOR ALL USING (true);
CREATE POLICY "Allow all operations on sessions" ON sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations on points" ON points FOR ALL USING (true);
CREATE POLICY "Allow all operations on awards" ON awards FOR ALL USING (true);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to all tables
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_points_updated_at BEFORE UPDATE ON points FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_awards_updated_at BEFORE UPDATE ON awards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
