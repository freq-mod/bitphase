export interface ResourceLoader {
	loadWasm(url: string): Promise<ArrayBuffer>;
	loadModule<T = Record<string, unknown>>(url: string): Promise<T>;
}

export function withWasmCacheKey(
	url: string,
	hash: string | undefined = import.meta.env.VITE_COMMIT_HASH
): string {
	if (!hash || hash === 'unknown' || /[?&]v=/.test(url)) return url;
	return `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(hash)}`;
}

export class BrowserResourceLoader implements ResourceLoader {
	private baseUrl: string;

	constructor(baseUrl = import.meta.env.BASE_URL || '/') {
		this.baseUrl = baseUrl;
	}

	async loadWasm(url: string): Promise<ArrayBuffer> {
		const response = await fetch(this.baseUrl + withWasmCacheKey(url));
		return response.arrayBuffer();
	}

	async loadModule<T = Record<string, unknown>>(url: string): Promise<T> {
		return import(/* @vite-ignore */ this.baseUrl + url) as Promise<T>;
	}
}
