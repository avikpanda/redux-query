export enum CacheEvictionStrategy {
  LFU = "LFU",
  LRU = "LRU",
}

export interface CacheHandlerInitializer {
  evictionStrategy?: CacheEvictionStrategy;
  useServiceWorker?: boolean;
  maxCacheSize?: number; // in bytes
  cacheEvictionThreshold?: number;
}

const CACHE_NAME = "api-cache";

export class CacheHandler {
  private static instance: CacheHandler | null = null;

  private evictionStrategy: CacheEvictionStrategy = CacheEvictionStrategy.LFU;
  private useServiceWorker = false;
  private maxCacheSize = 51200; // in bytes
  private cacheEvictionThreshold = 0.8;

  private cacheName: string = CACHE_NAME;
  private cache: Cache | null = null;
  private lruCache: Map<RequestInfo, number> = new Map<RequestInfo, number>();
  private lfuCache: Map<RequestInfo, number> = new Map<RequestInfo, number>();

  private totalCacheSize = 0;

  public constructor({
    evictionStrategy,
    useServiceWorker,
    maxCacheSize,
    cacheEvictionThreshold,
  }: CacheHandlerInitializer) {
    if (!CacheHandler.instance) {
      this.reset();
      if (evictionStrategy) this.evictionStrategy = evictionStrategy;
      if (useServiceWorker) this.useServiceWorker = useServiceWorker;
      if (maxCacheSize) this.maxCacheSize = maxCacheSize;
      if (cacheEvictionThreshold)
        this.cacheEvictionThreshold = cacheEvictionThreshold;
      CacheHandler.instance = this;
      return this;
    }
    return CacheHandler.instance as CacheHandler;
  }

  public static getInstance() {
    if (!this.instance) {
      return new CacheHandler({});
    }
    return this.instance;
  }

  private updateLRUCache(key: RequestInfo): void {
    this.lruCache.delete(key);
    this.lruCache.set(key, Date.now());
  }

  private evictLRUEntry(): void {
    let oldestKey: RequestInfo | null = null;
    let oldestTimestamp: number = Number.MAX_SAFE_INTEGER;

    for (const [key, timestamp] of this.lruCache.entries()) {
      if (timestamp < oldestTimestamp) {
        oldestTimestamp = timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.remove(oldestKey);
      console.log(`Evicted LRU entry with key '${oldestKey}' from the cache.`);
    }
  }

  private updateLFUCache(key: RequestInfo): void {
    if (!this.lfuCache.has(key)) {
      this.lfuCache.set(key, 0);
    }
    this.lfuCache.set(key, this.lfuCache.get(key) ?? 0 + 1);
  }

  private evictLFUEntry(): void {
    let leastFrequentKey: RequestInfo | null = null;
    let leastFrequentCount: number = Number.MAX_SAFE_INTEGER;

    for (const [key, count] of this.lfuCache.entries()) {
      if (count < leastFrequentCount) {
        leastFrequentCount = count;
        leastFrequentKey = key;
      }
    }

    if (leastFrequentKey) {
      this.remove(leastFrequentKey);
      console.log(
        `Evicted LFU entry with key '${leastFrequentKey}' from the cache.`
      );
    }
  }

  public async init(): Promise<void> {
    if (this.cache) {
      console.log("Cache already initialized");
    } else if (this.useServiceWorker && "serviceWorker" in navigator) {
      console.log("Trying to register Service Worker");
      await navigator.serviceWorker.register("service-worker.js");
      this.cache = await caches.open(this.cacheName);
      await this.cache.addAll(["/index.html", "/styles.css", "/script.js"]);
      console.log("Service Worker registered and cache initialized.");
    } else {
      this.cache = await caches.open(this.cacheName);
      console.log("Using normal cache.");
    }
  }

  private async updateCacheSize(): Promise<void> {
    const cacheKeys = await this.cache!.keys();
    let newTotalSize = 0;

    for (const key of cacheKeys) {
      const response = await this.cache!.match(key);
      if (response) {
        const responseSize = response.headers.get("content-length");
        if (responseSize) {
          newTotalSize += parseInt(responseSize);
        }
      }
    }

    this.totalCacheSize = newTotalSize;
    console.log(`Updated cache size: ${this.totalCacheSize} bytes`);

    if (this.totalCacheSize > this.maxCacheSize * this.cacheEvictionThreshold) {
      this.performEviction();
    }
  }

  private async performEviction(): Promise<void> {
    while (
      this.totalCacheSize >
      this.maxCacheSize * this.cacheEvictionThreshold
    ) {
      if (this.evictionStrategy === CacheEvictionStrategy.LRU) {
        this.evictLRUEntry();
      } else if (this.evictionStrategy === CacheEvictionStrategy.LFU) {
        this.evictLFUEntry();
      }
    }
  }

  public async add(key: RequestInfo, value: Response | string): Promise<void> {
    if (!this.cache) {
      console.log("Cache is not initialized.");
      return;
    }

    const response = value instanceof Response ? value : new Response(value);
    await this.cache.put(key, response);

    if (this.evictionStrategy === CacheEvictionStrategy.LRU) {
      this.updateLRUCache(key);
    } else if (this.evictionStrategy === CacheEvictionStrategy.LFU) {
      this.updateLFUCache(key);
    }

    await this.updateCacheSize();

    console.log(`Added key ${key} to the cache.`);
  }

  public async remove(key: RequestInfo): Promise<void> {
    if (!this.cache) {
      console.log("Cache is not initialized.");
      return;
    }

    await this.cache.delete(key);
    this.lruCache.delete(key);
    this.lfuCache.delete(key);
    await this.updateCacheSize();

    console.log(`Removed key ${key} from the cache.`);
  }

  public async search(key: RequestInfo): Promise<string | null> {
    let value = null;
    if (!this.cache) {
      console.log("Cache is not initialized.");
      return value;
    }

    const response = await this.cache.match(key);
    if (response) {
      value = await response.text();
      console.log(`Found value '${value}' for key '${key}' in the cache.`);

      if (this.evictionStrategy === CacheEvictionStrategy.LRU) {
        this.updateLRUCache(key);
      } else if (this.evictionStrategy === CacheEvictionStrategy.LFU) {
        this.updateLFUCache(key);
      }
    } else {
      console.log(`No value found for key '${key}' in the cache.`);
    }
    return value;
  }

  public async addBatch(
    items: { key: RequestInfo; value: Response | string }[]
  ): Promise<void> {
    if (!this.cache) {
      console.log("Cache is not initialized.");
      return;
    }

    const responses: Promise<void>[] = [];
    for (const item of items) {
      const response =
        item.value instanceof Response ? item.value : new Response(item.value);
      responses.push(this.cache.put(item.key, response));

      if (this.evictionStrategy === CacheEvictionStrategy.LRU) {
        this.updateLRUCache(item.key);
      } else if (this.evictionStrategy === CacheEvictionStrategy.LFU) {
        this.updateLFUCache(item.key);
      }
    }

    await Promise.all(responses);
    await this.updateCacheSize();

    console.log(`Added ${items.length} items to the cache.`);
  }

  public reset(): void {
    caches.delete(CACHE_NAME);
    this.cache = null;
    this.totalCacheSize = 0;
  }
}
