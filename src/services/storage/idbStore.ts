import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ProjectData } from '../../types/project';

interface GujDubDB extends DBSchema {
  projectMeta: {
    key: string;
    value: ProjectData;
  };
  mediaBlobs: {
    key: string;
    value: {
      key: string;
      blob: Blob;
      mimeType: string;
      updatedAt: number;
    };
  };
}

const DB_NAME = 'gujarati_dub_studio_db';
const DB_VERSION = 1;

class IDBStorage {
  private dbPromise: Promise<IDBPDatabase<GujDubDB>> | null = null;

  private getDB(): Promise<IDBPDatabase<GujDubDB>> {
    if (!this.dbPromise) {
      this.dbPromise = openDB<GujDubDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('projectMeta')) {
            db.createObjectStore('projectMeta');
          }
          if (!db.objectStoreNames.contains('mediaBlobs')) {
            db.createObjectStore('mediaBlobs', { keyPath: 'key' });
          }
        },
      });
    }
    return this.dbPromise;
  }

  async saveProjectMeta(data: ProjectData): Promise<void> {
    const db = await this.getDB();
    await db.put('projectMeta', data, 'active_project');
  }

  async getProjectMeta(): Promise<ProjectData | null> {
    const db = await this.getDB();
    const meta = await db.get('projectMeta', 'active_project');
    return meta || null;
  }

  async saveBlob(key: 'video_original' | 'tts_audio' | 'video_exported', blob: Blob, mimeType: string): Promise<void> {
    const db = await this.getDB();
    await db.put('mediaBlobs', {
      key,
      blob,
      mimeType,
      updatedAt: Date.now(),
    });
  }

  async getBlob(key: 'video_original' | 'tts_audio' | 'video_exported'): Promise<Blob | null> {
    const db = await this.getDB();
    const record = await db.get('mediaBlobs', key);
    return record ? record.blob : null;
  }

  async deleteBlob(key: 'video_original' | 'tts_audio' | 'video_exported'): Promise<void> {
    const db = await this.getDB();
    await db.delete('mediaBlobs', key);
  }

  async clearAll(): Promise<void> {
    const db = await this.getDB();
    await db.clear('projectMeta');
    await db.clear('mediaBlobs');
  }
}

export const idbStore = new IDBStorage();
