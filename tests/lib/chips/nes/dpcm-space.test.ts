import { describe, expect, it } from 'vitest';
import {
	NES_DPCM_BANK_BYTES,
	NES_DPCM_MAX_BYTES,
	dpcmSpaceUsedBytes,
	formatDpcmSpaceUsage,
	importPcm8AsDpcm
} from '@/lib/chips/nes/dpcm';

describe('DPCM sample space', () => {
	it('sums every NES instrument once, using the instrument currently being edited', () => {
		const used = dpcmSpaceUsedBytes(
			[
				{ id: '01', chipType: 'nes', dpcmSamples: [{ data: new Array(2048).fill(0) }] },
				{ id: '02', chipType: 'nes', dpcmSamples: [{ data: new Array(1024).fill(0) }] },
				{ id: '03', chipType: 'ay', dpcmSamples: [{ data: new Array(9000).fill(0) }] }
			],
			{ id: '01', dpcmSamples: [{ data: new Array(4096).fill(0) }] }
		);
		expect(used).toBe(4096 + 1024);
	});

	it('resamples a WAV to the DPCM rate and cuts it at the hardware size', () => {
		const pcm = new Uint8Array(44100).fill(128);
		const high = importPcm8AsDpcm(pcm, 44100, 15);
		const low = importPcm8AsDpcm(pcm, 44100, 0);
		expect(high.truncated).toBe(true);
		expect(high.data).toHaveLength(NES_DPCM_MAX_BYTES);
		expect(low.truncated).toBe(false);
		expect(low.data.length).toBeGreaterThan(0);
		expect(low.data.length).toBeLessThan(NES_DPCM_MAX_BYTES);
	});

	it('formats used and remaining space the way FamiTracker does', () => {
		expect(formatDpcmSpaceUsage(15 * 1024)).toBe(
			`Space used 15 kB (${(15 * 1024).toLocaleString()} bytes), left 241 kB (256 kB available)`
		);
		expect(formatDpcmSpaceUsage(NES_DPCM_BANK_BYTES + 1024)).toBe(
			`Space used 257 kB (${(NES_DPCM_BANK_BYTES + 1024).toLocaleString()} bytes), left 0 kB (256 kB available)`
		);
	});
});
