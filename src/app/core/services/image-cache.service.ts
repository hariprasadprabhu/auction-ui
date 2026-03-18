import { Injectable } from '@angular/core';

/**
 * Image Cache Service
 * Provides in-memory and IndexedDB caching for images to improve performance
 * Detects hard refreshes using sessionStorage and clears cache accordingly
 */
@Injectable({
  providedIn: 'root',
})
export class ImageCacheService {
  private readonly DB_NAME = 'AuctionImageCache';
  private readonly STORE_NAME = 'images';
  private readonly SESSION_KEY = 'auction_session_id';
  private readonly MEMORY_CACHE = new Map<string, { blob: Blob; timestamp: number }>();
  private readonly MAX_CACHE_SIZE = 100; // Max images in memory
  private readonly MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours in IndexedDB
  private db: IDBDatabase | null = null;
  private isHardRefresh = false;

  constructor() {
    this.initializeCache();
  }

  /**
   * Initialize cache: detect hard refresh and setup IndexedDB
   */
  private initializeCache(): void {
    this.detectHardRefresh();
    this.initializeIndexedDB();
  }

  /**
   * Detect if this is a hard refresh (F5, Ctrl+R, etc.)
   * SessionStorage persists during normal navigation but clears on hard refresh
   */
  private detectHardRefresh(): void {
    const currentSessionId = sessionStorage.getItem(this.SESSION_KEY);
    const newSessionId = Math.random().toString(36).substring(2, 11);

    if (!currentSessionId) {
      // First load or hard refresh detected
      sessionStorage.setItem(this.SESSION_KEY, newSessionId);
      this.isHardRefresh = true;
      // Clear in-memory cache on hard refresh
      this.MEMORY_CACHE.clear();
    } else {
      // Normal navigation - keep cache
      this.isHardRefresh = false;
    }
  }

  /**
   * Initialize IndexedDB for persistent image storage
   */
  private initializeIndexedDB(): void {
    const request = indexedDB.open(this.DB_NAME, 1);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(this.STORE_NAME)) {
        db.createObjectStore(this.STORE_NAME);
      }
    };

    request.onsuccess = (event: Event) => {
      this.db = (event.target as IDBOpenDBRequest).result;
      if (this.isHardRefresh) {
        this.clearIndexedDBCache();
      }
    };

    request.onerror = () => {
      console.warn('IndexedDB initialization failed, memory cache only');
    };
  }

  /**
   * Get image from cache (memory → IndexedDB)
   */
  async getImageFromCache(url: string): Promise<Blob | null> {
    // Check memory cache first
    const cached = this.MEMORY_CACHE.get(url);
    if (cached) {
      return cached.blob;
    }

    // Check IndexedDB
    if (this.db) {
      return this.getFromIndexedDB(url);
    }

    return null;
  }

  /**
   * Store image in cache (memory + IndexedDB)
   */
  async cacheImage(url: string, blob: Blob): Promise<void> {
    // Store in memory cache (with eviction if needed)
    if (this.MEMORY_CACHE.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.MEMORY_CACHE.keys().next().value;
      if (firstKey) {
        this.MEMORY_CACHE.delete(firstKey);
      }
    }
    this.MEMORY_CACHE.set(url, { blob, timestamp: Date.now() });

    // Also store in IndexedDB
    if (this.db) {
      this.saveToIndexedDB(url, blob);
    }
  }

  /**
   * Get image from IndexedDB
   */
  private getFromIndexedDB(url: string): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve(null);
        return;
      }

      try {
        const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.get(url);

        request.onsuccess = () => {
          const result = request.result;
          if (result && result.blob && result.timestamp) {
            // Check if cache entry is still valid (not expired)
            if (Date.now() - result.timestamp < this.MAX_AGE_MS) {
              // Update memory cache for faster future access
              this.MEMORY_CACHE.set(url, {
                blob: result.blob,
                timestamp: result.timestamp,
              });
              resolve(result.blob);
            } else {
              // Cache expired, delete it
              this.deleteFromIndexedDB(url);
              resolve(null);
            }
          } else {
            resolve(null);
          }
        };

        request.onerror = () => {
          resolve(null);
        };
      } catch {
        resolve(null);
      }
    });
  }

  /**
   * Save image to IndexedDB
   */
  private saveToIndexedDB(url: string, blob: Blob): void {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      store.put(
        {
          blob,
          timestamp: Date.now(),
        },
        url,
      );
    } catch {
      // Silently fail if IndexedDB operation fails
    }
  }

  /**
   * Delete specific image from IndexedDB
   */
  private deleteFromIndexedDB(url: string): void {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      store.delete(url);
    } catch {
      // Silently fail
    }
  }

  /**
   * Clear all IndexedDB cache (called on hard refresh)
   */
  private clearIndexedDBCache(): void {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      store.clear();
    } catch {
      // Silently fail
    }
  }

  /**
   * Clear all caches (both memory and IndexedDB)
   */
  clearAllCache(): void {
    this.MEMORY_CACHE.clear();
    this.clearIndexedDBCache();
  }

  /**
   * Get cache statistics (for debugging)
   */
  getCacheStats(): { memoryCacheSize: number; hardRefreshDetected: boolean } {
    return {
      memoryCacheSize: this.MEMORY_CACHE.size,
      hardRefreshDetected: this.isHardRefresh,
    };
  }
}
