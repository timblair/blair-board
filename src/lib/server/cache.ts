interface CacheEntry<T> {
	data: T;
	fetchedAt: number;
	ttlMs: number;
}

export class TTLCache<T> {
	private store = new Map<string, CacheEntry<T>>();

	get(key: string): T | null {
		const entry = this.store.get(key);
		if (!entry) return null;
		if (Date.now() - entry.fetchedAt > entry.ttlMs) {
			this.store.delete(key);
			return null;
		}
		return entry.data;
	}

	set(key: string, data: T, ttlMs: number): void {
		this.store.set(key, { data, fetchedAt: Date.now(), ttlMs });
	}

	invalidate(key?: string): void {
		if (key) {
			this.store.delete(key);
		} else {
			this.store.clear();
		}
	}
}
