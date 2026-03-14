import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface Order {
  id: string;
  version: number;
  updated_at: string;
  // ... other fields
  [key: string]: any;
}

export interface SyncAction {
  id: string; // unique id for the action
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'orders' | 'inventory' | 'products'; 
  payload: any;
  created_at: string;
  retry_count: number;
  status: 'pending' | 'failed';
}

interface POSDB extends DBSchema {
  orders: {
    key: string;
    value: Order;
  };
  sync_queue: {
    key: string;
    value: SyncAction;
    indexes: { 'by-status': string };
  };
}

let dbPromise: Promise<IDBPDatabase<POSDB>> | null = null;

// Khởi tạo IndexedDB
export const getDb = () => {
  if (!dbPromise) {
    dbPromise = openDB<POSDB>('pos-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('orders')) {
          db.createObjectStore('orders', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
          syncStore.createIndex('by-status', 'status');
        }
      },
    });
  }
  return dbPromise;
};

// --- Helper methods cho Orders ---
export const saveOrderLocal = async (order: Order) => {
  const db = await getDb();
  await db.put('orders', order);
};

export const getOrderLocal = async (id: string) => {
  const db = await getDb();
  return db.get('orders', id);
};

export const getAllOrdersLocal = async () => {
  const db = await getDb();
  return db.getAll('orders');
};

// --- Helper methods cho Sync Queue ---
export const addSyncAction = async (action: Omit<SyncAction, 'retry_count' | 'status'>) => {
  const db = await getDb();
  await db.put('sync_queue', {
    ...action,
    retry_count: 0,
    status: 'pending',
  });
};
