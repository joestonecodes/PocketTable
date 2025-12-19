import { openDB, DBSchema } from 'idb';

export interface Asset {
    id: string;
    name: string;
    type: 'CHARACTER' | 'PROP' | 'MOUNT' | 'ATTACHMENT';
    blob: Blob;
    url: string; // Transient URL created with URL.createObjectURL
    description?: string;
    timestamp: number;
}

interface VTTDB extends DBSchema {
    assets: {
        key: string;
        value: Omit<Asset, 'url'>;
        indexes: { 'by-type': string };
    };
}

const DB_NAME = 'vtt-assets-db';

export async function initDB() {
    return openDB<VTTDB>(DB_NAME, 1, {
        upgrade(db) {
            const store = db.createObjectStore('assets', { keyPath: 'id' });
            store.createIndex('by-type', 'type');
        },
    });
}

export async function addAsset(asset: Omit<Asset, 'url'>) {
    const db = await initDB();
    await db.put('assets', asset);
}

export async function getAssets(): Promise<Asset[]> {
    const db = await initDB();
    const raw = await db.getAll('assets');
    return raw.map(a => ({
        ...a,
        url: URL.createObjectURL(a.blob)
    }));
}

export async function deleteAsset(id: string) {
    const db = await initDB();
    await db.delete('assets', id);
}
