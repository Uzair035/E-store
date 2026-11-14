import fs from 'fs';
import os from 'os';
import path from 'path';
import type { StoreState, StoredUser } from './seed.ts';
import { createInitialStoreState } from './seed.ts';
import type { UserProfile } from '../types/ecommerce.ts';

function resolveDataDir(): string {
  // Vercel and read-only serverless runtimes only permit writes under /tmp
  if (process.env.VERCEL === '1' || process.env.VERCEL_ENV) {
    return path.join(os.tmpdir(), 'kova-data');
  }
  return path.resolve(process.cwd(), '.data');
}

const DATA_DIR = resolveDataDir();
const STORE_PATH = path.join(DATA_DIR, 'kova-store.json');

class StoreRepository {
  private state: StoreState;

  constructor() {
    this.state = this.loadFromDisk();
  }

  private loadFromDisk(): StoreState {
    try {
      if (fs.existsSync(STORE_PATH)) {
        const raw = fs.readFileSync(STORE_PATH, 'utf8');
        const parsed = JSON.parse(raw) as StoreState;
        if (parsed && Array.isArray(parsed.products) && Array.isArray(parsed.users)) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Could not load existing store file, initializing fresh seed:', err);
    }
    const fresh = createInitialStoreState();
    this.persist(fresh);
    return fresh;
  }

  private persist(nextState: StoreState) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STORE_PATH, JSON.stringify(nextState, null, 2), 'utf8');
    } catch (err) {
      console.warn('Store persistence skipped (read-only filesystem):', err);
    }
  }

  public getState(): StoreState {
    return this.state;
  }

  public save() {
    this.persist(this.state);
  }

  public sanitizeUser(user: StoredUser): UserProfile {
    const { passwordHash: _ph, resetCode: _rc, resetExpiresAt: _re, ...publicUser } = user;
    return publicUser;
  }
}

export const store = new StoreRepository();
