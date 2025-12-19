import { createClient } from 'redis';
import { RoomStateType } from 'vtt-shared';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const ROOM_TTL = 24 * 60 * 60;

export class RedisStore {
    private client: any; // Type as any to avoid strict redis type issues if not fully installed types
    private memoryStore: Map<string, { data: RoomStateType, expires: number }> = new Map();
    private useMemory = false;

    constructor() {
        this.client = createClient({ url: REDIS_URL });
        this.client.on('error', (err: any) => {
            // Suppress initial connection errors if we expect them
            if (!this.useMemory) {
                console.warn('Redis Client Error (Will fall back to memory if connect fails)', err.message);
            }
        });
    }

    async connect() {
        try {
            await this.client.connect();
            console.log('Connected to Redis');
        } catch (e) {
            console.warn('Failed to connect to Redis, switching to In-Memory Store');
            this.useMemory = true;
        }
    }

    private getKey(roomId: string) {
        return `room:${roomId}`;
    }

    async getRoom(roomId: string): Promise<RoomStateType | null> {
        if (this.useMemory || !this.client.isReady) {
            const entry = this.memoryStore.get(roomId);
            if (!entry) return null;
            if (Date.now() > entry.expires) {
                this.memoryStore.delete(roomId);
                return null;
            }
            return entry.data;
        }

        try {
            const data = await this.client.get(this.getKey(roomId));
            if (!data) return null;
            return JSON.parse(data) as RoomStateType;
        } catch (e) {
            return null;
        }
    }

    async saveRoom(roomId: string, state: RoomStateType) {
        // Fallback if explicitly using memory OR if redis isn't ready yet (avoid queuing loop)
        if (this.useMemory || !this.client.isReady) {
            this.memoryStore.set(roomId, {
                data: state,
                expires: Date.now() + (ROOM_TTL * 1000)
            });
            return;
        }

        try {
            const key = this.getKey(roomId);
            await this.client.set(key, JSON.stringify(state));
            await this.client.expire(key, ROOM_TTL);
        } catch (e) {
            console.error('Failed to save to Redis', e);
        }
    }

    async roomExists(roomId: string): Promise<boolean> {
        if (this.useMemory || !this.client.isReady) {
            return this.memoryStore.has(roomId);
        }
        try {
            const exists = await this.client.exists(this.getKey(roomId));
            return exists === 1;
        } catch (e) {
            return false;
        }
    }
}

export const store = new RedisStore();
