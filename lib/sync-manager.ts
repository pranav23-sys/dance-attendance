// Legacy location - moved to src/lib/sync-manager.ts
// Re-exporting from the new location for backward compatibility

export * from "../src/lib/sync-manager";

// Types for our data models
export interface DanceClass {
  id: string;
  name: string;
  color: string;
  synced?: boolean;
  updatedAt?: string;
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  joinedAtISO: string;
  archived?: boolean;
  synced?: boolean;
  updatedAt?: string;
}

export interface RegisterSession {
  id: string;
  classId: string;
  startedAtISO: string;
  closedAtISO?: string;
  marks: Record<string, "PRESENT" | "LATE" | "ABSENT" | "EXCUSED">;
  synced?: boolean;
  updatedAt?: string;
}

export interface PointEvent {
  id: string;
  studentId: string;
  classId: string;
  reason: string;
  points: number;
  createdAtISO: string;
  sessionId?: string;
  synced?: boolean;
  updatedAt?: string;
}

export interface AwardUnlock {
  id: string;
  awardId: string;
  studentId: string;
  classId: string;
  periodType: "RANGE" | "ACADEMIC_YEAR";
  periodKey: string;
  unlockedAtISO: string;
  decidedBy: "SYSTEM" | "TEACHER";
  synced?: boolean;
  updatedAt?: string;
}

// Storage keys
const STORAGE_KEYS = {
  classes: "bb_classes",
  students: "bb_students",
  sessions: "bb_sessions",
  points: "bb_points",
  awards: "bb_awards",
  lastSync: "bb_last_sync",
} as const;

// Database table names
const TABLES = {
  classes: "classes",
  students: "students",
  sessions: "sessions",
  points: "points",
  awards: "awards",
} as const;

// Sync manager class
class SyncManager {
  private isOnline = navigator.onLine;
  private syncInProgress = false;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.performFullSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Generic data operations - offline-first
  private async getFromSupabase<T>(table: string): Promise<T[] | null> {
    if (!this.isOnline) return null;

    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('updatedAt', { ascending: false });

      if (error) {
        console.error(`Error fetching from ${table}:`, error);
        return null;
      }

      return data || [];
    } catch (error) {
      console.error(`Network error fetching from ${table}:`, error);
      return null;
    }
  }

  private async saveToSupabase<T extends { id: string; synced?: boolean; updatedAt?: string }>(
    table: string,
    items: T[]
  ): Promise<void> {
    if (!this.isOnline || items.length === 0) return;

    try {
      const unsynced = items.filter(item => !item.synced);
      if (unsynced.length === 0) return;

      // Prepare items for upsert with updatedAt timestamp
      const itemsToUpsert = unsynced.map(item => ({
        ...item,
        synced: true,
        updatedAt: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from(table)
        .upsert(itemsToUpsert, { onConflict: 'id' });

      if (error) {
        console.error(`Error syncing to ${table}:`, error);
        throw error;
      }
    } catch (error) {
      console.error(`Failed to sync ${table}:`, error);
      throw error;
    }
  }

  private getFromLocalStorage<T>(key: string): T[] {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  }

  private saveToLocalStorage<T>(key: string, items: T[]): void {
    localStorage.setItem(key, JSON.stringify(items));
  }

  // Merge data with conflict resolution (Supabase takes precedence)
  private mergeData<T extends { id: string; updatedAt?: string }>(
    localData: T[],
    remoteData: T[] | null
  ): T[] {
    if (!remoteData) return localData;

    const merged = new Map<string, T>();

    // Add all remote data first (takes precedence)
    remoteData.forEach(item => {
      merged.set(item.id, { ...item, synced: true });
    });

    // Add local data only if it doesn't exist in remote or is newer
    localData.forEach(item => {
      const remoteItem = merged.get(item.id);
      if (!remoteItem) {
        merged.set(item.id, { ...item, synced: false });
      } else if (item.updatedAt && remoteItem.updatedAt &&
                 new Date(item.updatedAt) > new Date(remoteItem.updatedAt)) {
        // Local item is newer, keep it but mark for sync
        merged.set(item.id, { ...item, synced: false });
      }
    });

    return Array.from(merged.values());
  }

  // Public API methods for each data type - OFFLINE FIRST
  async getClasses(): Promise<DanceClass[]> {
    // Return local data immediately
    const localData = this.getFromLocalStorage<DanceClass>(STORAGE_KEYS.classes);

    // Sync with remote in background if online
    if (this.isOnline) {
      try {
        const remoteData = await this.getFromSupabase<DanceClass>(TABLES.classes);
        if (remoteData) {
          const merged = this.mergeData(localData, remoteData);
          // Update local storage with merged data
          this.saveToLocalStorage(STORAGE_KEYS.classes, merged);
          return merged;
        }
      } catch (error) {
        console.warn('Background sync failed for classes:', error);
      }
    }

    return localData;
  }

  async saveClasses(classes: DanceClass[]): Promise<void> {
    // Save to local storage immediately (offline-first)
    const classesWithTimestamps = classes.map(cls => ({
      ...cls,
      synced: false,
      updatedAt: new Date().toISOString(),
    }));
    this.saveToLocalStorage(STORAGE_KEYS.classes, classesWithTimestamps);

    // Sync to Supabase in background if online
    if (this.isOnline) {
      try {
        await this.saveToSupabase(TABLES.classes, classesWithTimestamps);
        // Mark as synced locally
        const syncedClasses = classesWithTimestamps.map(cls => ({ ...cls, synced: true }));
        this.saveToLocalStorage(STORAGE_KEYS.classes, syncedClasses);
      } catch (error) {
        console.warn('Background sync failed for classes:', error);
        // Items remain marked as unsynced for later sync
      }
    }
  }

  async getStudents(): Promise<Student[]> {
    // Return local data immediately
    const localData = this.getFromLocalStorage<Student>(STORAGE_KEYS.students);

    // Sync with remote in background if online
    if (this.isOnline) {
      try {
        const remoteData = await this.getFromSupabase<Student>(TABLES.students);
        if (remoteData) {
          const merged = this.mergeData(localData, remoteData);
          this.saveToLocalStorage(STORAGE_KEYS.students, merged);
          return merged;
        }
      } catch (error) {
        console.warn('Background sync failed for students:', error);
      }
    }

    return localData;
  }

  async saveStudents(students: Student[]): Promise<void> {
    // Save to local storage immediately (offline-first)
    const studentsWithTimestamps = students.map(student => ({
      ...student,
      synced: false,
      updatedAt: new Date().toISOString(),
    }));
    this.saveToLocalStorage(STORAGE_KEYS.students, studentsWithTimestamps);

    // Sync to Supabase in background if online
    if (this.isOnline) {
      try {
        await this.saveToSupabase(TABLES.students, studentsWithTimestamps);
        const syncedStudents = studentsWithTimestamps.map(student => ({ ...student, synced: true }));
        this.saveToLocalStorage(STORAGE_KEYS.students, syncedStudents);
      } catch (error) {
        console.warn('Background sync failed for students:', error);
      }
    }
  }

  async getSessions(): Promise<RegisterSession[]> {
    const localData = this.getFromLocalStorage<RegisterSession>(STORAGE_KEYS.sessions);

    if (this.isOnline) {
      try {
        const remoteData = await this.getFromSupabase<RegisterSession>(TABLES.sessions);
        if (remoteData) {
          const merged = this.mergeData(localData, remoteData);
          this.saveToLocalStorage(STORAGE_KEYS.sessions, merged);
          return merged;
        }
      } catch (error) {
        console.warn('Background sync failed for sessions:', error);
      }
    }

    return localData;
  }

  async saveSessions(sessions: RegisterSession[]): Promise<void> {
    const sessionsWithTimestamps = sessions.map(session => ({
      ...session,
      synced: false,
      updatedAt: new Date().toISOString(),
    }));
    this.saveToLocalStorage(STORAGE_KEYS.sessions, sessionsWithTimestamps);

    if (this.isOnline) {
      try {
        await this.saveToSupabase(TABLES.sessions, sessionsWithTimestamps);
        const syncedSessions = sessionsWithTimestamps.map(session => ({ ...session, synced: true }));
        this.saveToLocalStorage(STORAGE_KEYS.sessions, syncedSessions);
      } catch (error) {
        console.warn('Background sync failed for sessions:', error);
      }
    }
  }

  async getPoints(): Promise<PointEvent[]> {
    const localData = this.getFromLocalStorage<PointEvent>(STORAGE_KEYS.points);

    if (this.isOnline) {
      try {
        const remoteData = await this.getFromSupabase<PointEvent>(TABLES.points);
        if (remoteData) {
          const merged = this.mergeData(localData, remoteData);
          this.saveToLocalStorage(STORAGE_KEYS.points, merged);
          return merged;
        }
      } catch (error) {
        console.warn('Background sync failed for points:', error);
      }
    }

    return localData;
  }

  async savePoints(points: PointEvent[]): Promise<void> {
    const pointsWithTimestamps = points.map(point => ({
      ...point,
      synced: false,
      updatedAt: new Date().toISOString(),
    }));
    this.saveToLocalStorage(STORAGE_KEYS.points, pointsWithTimestamps);

    if (this.isOnline) {
      try {
        await this.saveToSupabase(TABLES.points, pointsWithTimestamps);
        const syncedPoints = pointsWithTimestamps.map(point => ({ ...point, synced: true }));
        this.saveToLocalStorage(STORAGE_KEYS.points, syncedPoints);
      } catch (error) {
        console.warn('Background sync failed for points:', error);
      }
    }
  }

  async getAwards(): Promise<AwardUnlock[]> {
    const localData = this.getFromLocalStorage<AwardUnlock>(STORAGE_KEYS.awards);

    if (this.isOnline) {
      try {
        const remoteData = await this.getFromSupabase<AwardUnlock>(TABLES.awards);
        if (remoteData) {
          const merged = this.mergeData(localData, remoteData);
          this.saveToLocalStorage(STORAGE_KEYS.awards, merged);
          return merged;
        }
      } catch (error) {
        console.warn('Background sync failed for awards:', error);
      }
    }

    return localData;
  }

  async saveAwards(awards: AwardUnlock[]): Promise<void> {
    const awardsWithTimestamps = awards.map(award => ({
      ...award,
      synced: false,
      updatedAt: new Date().toISOString(),
    }));
    this.saveToLocalStorage(STORAGE_KEYS.awards, awardsWithTimestamps);

    if (this.isOnline) {
      try {
        await this.saveToSupabase(TABLES.awards, awardsWithTimestamps);
        const syncedAwards = awardsWithTimestamps.map(award => ({ ...award, synced: true }));
        this.saveToLocalStorage(STORAGE_KEYS.awards, syncedAwards);
      } catch (error) {
        console.warn('Background sync failed for awards:', error);
      }
    }
  }

  // Sync unsynced data to Supabase (offline-first)
  async syncToCloud(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;

    this.syncInProgress = true;

    try {
      console.log('Starting cloud sync...');

      // Get all local data
      const classes = this.getFromLocalStorage<DanceClass>(STORAGE_KEYS.classes);
      const students = this.getFromLocalStorage<Student>(STORAGE_KEYS.students);
      const sessions = this.getFromLocalStorage<RegisterSession>(STORAGE_KEYS.sessions);
      const points = this.getFromLocalStorage<PointEvent>(STORAGE_KEYS.points);
      const awards = this.getFromLocalStorage<AwardUnlock>(STORAGE_KEYS.awards);

      // Sync unsynced items
      await Promise.all([
        this.saveToSupabase(TABLES.classes, classes.filter(c => !c.synced)),
        this.saveToSupabase(TABLES.students, students.filter(s => !s.synced)),
        this.saveToSupabase(TABLES.sessions, sessions.filter(s => !s.synced)),
        this.saveToSupabase(TABLES.points, points.filter(p => !p.synced)),
        this.saveToSupabase(TABLES.awards, awards.filter(a => !a.synced)),
      ]);

      // Mark all as synced locally
      const markSynced = <T extends { synced?: boolean }>(items: T[]) =>
        items.map(item => ({ ...item, synced: true }));

      this.saveToLocalStorage(STORAGE_KEYS.classes, markSynced(classes));
      this.saveToLocalStorage(STORAGE_KEYS.students, markSynced(students));
      this.saveToLocalStorage(STORAGE_KEYS.sessions, markSynced(sessions));
      this.saveToLocalStorage(STORAGE_KEYS.points, markSynced(points));
      this.saveToLocalStorage(STORAGE_KEYS.awards, markSynced(awards));

      localStorage.setItem(STORAGE_KEYS.lastSync, new Date().toISOString());
      console.log('Cloud sync completed successfully');
    } catch (error) {
      console.error('Cloud sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Pull latest data from cloud and merge (for when you want to refresh from remote)
  async syncFromCloud(): Promise<void> {
    if (!this.isOnline) return;

    try {
      console.log('Syncing from cloud...');

      const [classes, students, sessions, points, awards] = await Promise.all([
        this.getClasses(),
        this.getStudents(),
        this.getSessions(),
        this.getPoints(),
        this.getAwards(),
      ]);

      console.log('Cloud sync from completed');
    } catch (error) {
      console.error('Cloud sync from failed:', error);
    }
  }

  // Check if data is synced
  isSynced(): boolean {
    return this.isOnline;
  }

  // Get last sync time
  getLastSyncTime(): Date | null {
    const lastSync = localStorage.getItem(STORAGE_KEYS.lastSync);
    return lastSync ? new Date(lastSync) : null;
  }
}

// Export singleton instance
export const syncManager = new SyncManager();

// Helper hook for React components
export function useSyncData() {
  return {
    // Data operations (offline-first)
    getClasses: syncManager.getClasses.bind(syncManager),
    saveClasses: syncManager.saveClasses.bind(syncManager),
    getStudents: syncManager.getStudents.bind(syncManager),
    saveStudents: syncManager.saveStudents.bind(syncManager),
    getSessions: syncManager.getSessions.bind(syncManager),
    saveSessions: syncManager.saveSessions.bind(syncManager),
    getPoints: syncManager.getPoints.bind(syncManager),
    savePoints: syncManager.savePoints.bind(syncManager),
    getAwards: syncManager.getAwards.bind(syncManager),
    saveAwards: syncManager.saveAwards.bind(syncManager),

    // Sync operations (when Supabase is set up)
    syncToCloud: syncManager.syncToCloud.bind(syncManager),
    syncFromCloud: syncManager.syncFromCloud.bind(syncManager),

    // Status
    isOnline: () => syncManager.isOnline,
    isSynced: syncManager.isSynced.bind(syncManager),
    getLastSyncTime: syncManager.getLastSyncTime.bind(syncManager),
  };
}
