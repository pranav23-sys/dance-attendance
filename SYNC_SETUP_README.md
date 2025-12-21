# Supabase Sync Setup Guide

This guide will help you set up **optional** cloud synchronization for your Bollywood Beatz dance attendance app using Supabase.

## 🎯 **Overview**

Your app is now **offline-first** - it works completely without Supabase! When you're ready, you can add cloud sync for multi-device support. This means:

- ✅ **Offline-first**: Data stored locally first, works without internet
- ✅ **Cloud sync ready**: Optional Supabase integration for multi-device sync
- ✅ **No setup required**: App works immediately without Supabase
- ✅ **Gradual adoption**: Add cloud sync when ready
- ✅ **Conflict resolution**: Automatic merging when syncing

## 📋 **Prerequisites**

**For offline-only use:** None! The app works immediately.

**For cloud sync (optional):**
1. A Supabase account and project
2. Your Supabase URL and anon key
3. Database tables created (see schema below)

## 🗄️ **Step 1: Set Up Supabase Database**

### **Create Tables**

Run this SQL in your Supabase SQL Editor:

```sql
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
  "periodType" TEXT NOT NULL CHECK ("periodType" IN ('RANGE', 'ACADEMIC_YEAR')),
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

-- Allow all operations for authenticated users
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
```

> **⚠️ Important:** If you get a permission error like "permission denied to set parameter 'app.jwt_secret'", just skip that line - it's not needed for Supabase and will cause errors.

### **Alternative: Use the Schema File**

You can also run the pre-written schema file:

1. Go to your Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `supabase-schema.sql`
3. Click "Run"

## 🔧 **Step 2: Configure Environment Variables**

Update your `.env.local` file with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase Dashboard → Settings → API.

**Step-by-step:**
1. Go to [supabase.com](https://supabase.com) and sign in
2. Select your project from the dashboard
3. Click **"Settings"** (gear icon) in the left sidebar
4. Click **"API"** in the settings menu
5. You'll see:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon/public key**: A long JWT token starting with `eyJ...`

## 🚀 **Step 3: Test the App**

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Test offline functionality (works immediately!):**
   - Open the app in your browser at `http://localhost:3000`
   - Add classes, students, take attendance
   - Give points, view awards and leaderboards
   - **Everything works without any Supabase setup!**

3. **Test persistence:**
   - Refresh the page - your data is still there
   - Close and reopen browser - data persists
   - Turn off internet - app still works perfectly

4. **Add cloud sync later (when ready):**
   - Set up Supabase account and project
   - Add environment variables
   - Run the database schema
   - Your data will sync across devices automatically

## 📱 **How It Works**

### **Offline-First Architecture**

```
User Action → Store in localStorage First (immediate & reliable)
                     ↓
     If Online: Sync to Supabase in background (optional)
```

### **Optional Cloud Synchronization**

- **Default**: Works completely offline with localStorage
- **When Supabase is configured**: Background sync when online
- **Multi-device**: Manual sync pulls latest changes from cloud
- **No blocking**: App works even if Supabase is down

### **Data Flow**

1. **Create/Update Data**: Saved to localStorage immediately (fast!)
2. **Read Data**: Always from localStorage (instant & reliable)
3. **Optional Sync**: When online, syncs to/from Supabase in background
4. **Multi-device**: Manual sync merges changes from other devices

## 🔄 **Conflict Resolution**

- **Last Write Wins**: Supabase data takes precedence
- **Timestamp-based**: Uses `updatedAt` field for conflict resolution
- **Merge Strategy**: Remote data + local changes = final dataset

## 🛠️ **Troubleshooting**

### **Sync Not Working**

1. Check your Supabase credentials in `.env.local`
2. Verify tables exist in your Supabase database
3. Check browser console for error messages
4. Ensure RLS policies allow your operations

### **Data Not Appearing**

1. Try refreshing the page (triggers sync)
2. Check if you're online
3. Verify data exists in Supabase dashboard
4. Check localStorage for fallback data

### **Performance Issues**

- The sync manager batches operations for efficiency
- Large datasets may take time to sync initially
- Consider pagination for very large student lists

## 📊 **Monitoring Sync Status**

The app includes sync status indicators:

- **Green indicator**: Fully synced
- **Yellow indicator**: Syncing in progress
- **Red indicator**: Sync failed (offline mode)

You can check sync status programmatically:

```typescript
import { syncManager } from './lib/sync-manager';

// Check if online and synced
const isSynced = syncManager.isSynced();
const lastSync = syncManager.getLastSyncTime();

// Force a full sync
await syncManager.performFullSync();
```

## 🔐 **Security Considerations**

- **RLS Policies**: Currently set to allow all operations (for development)
- **API Keys**: Never commit anon keys to version control
- **Authentication**: Consider adding user authentication for production
- **Data Validation**: Client-side validation is in place, but add server-side validation

## 🚀 **Next Steps**

1. **Add Authentication**: Implement user login for multi-user support
2. **Real-time Updates**: Use Supabase real-time subscriptions
3. **Data Backup**: Set up automated backups
4. **Analytics**: Track sync success/failure rates
5. **Progressive Sync**: Sync only changed data instead of full datasets

## 📞 **Support**

If you encounter issues:

1. Check the browser console for error messages
2. Verify your Supabase configuration
3. Test with a fresh database (drop and recreate tables)
4. Ensure your network allows Supabase connections

---

**🎉 Your app now supports seamless multi-device synchronization while maintaining full offline functionality!**
