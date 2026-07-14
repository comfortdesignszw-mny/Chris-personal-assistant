import Dexie, { type EntityTable } from 'dexie';

interface Interaction {
  id?: number;
  timestamp: number;
  input: string;
  output: string;
  syncStatus: 'synced' | 'pending';
}

interface Reminder {
  id?: number;
  title: string;
  dueTime: number;
  completed: boolean;
}

interface LocalFile {
  id?: number;
  fileName: string;
  fileType: string;
  content: string;
  createdAt: number;
}

interface CachedWeather {
  id?: number;
  date: number;
  forecastData: any;
}

const db = new Dexie('ChrisDatabase') as Dexie & {
  interactions: EntityTable<Interaction, 'id'>;
  reminders: EntityTable<Reminder, 'id'>;
  localFiles: EntityTable<LocalFile, 'id'>;
  cachedWeather: EntityTable<CachedWeather, 'id'>;
};

// Schema declaration
db.version(3).stores({
  interactions: '++id, timestamp, syncStatus',
  reminders: '++id, dueTime, completed',
  localFiles: '++id, fileName',
  cachedWeather: '++id, date'
});

db.on('ready', function () {
  console.log("Dexie ready");
});

db.open().catch(err => {
  console.error("Dexie open error:", err);
});

export { db };
export type { Interaction, Reminder, LocalFile, CachedWeather };
