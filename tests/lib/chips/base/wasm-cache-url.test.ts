import { describe, expect, it } from 'vitest';
import { withWasmCacheKey } from '@/lib/chips/base/resource-loader';

describe('withWasmCacheKey', () => {
	it('appends the build hash to a wasm path', () => {
		expect(withWasmCacheKey('nes/nes_apu.wasm', 'abc123')).toBe('nes/nes_apu.wasm?v=abc123');
	});

	it('does not add a second cache key', () => {
		expect(withWasmCacheKey('ay/ayumi.wasm?v=abc', 'def')).toBe('ay/ayumi.wasm?v=abc');
	});

	it('leaves the path unchanged when the build hash is missing', () => {
		expect(withWasmCacheKey('nes/nes_apu.wasm', 'unknown')).toBe('nes/nes_apu.wasm');
		expect(withWasmCacheKey('nes/nes_apu.wasm', '')).toBe('nes/nes_apu.wasm');
	});
});
