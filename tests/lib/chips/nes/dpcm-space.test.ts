import { describe, expect, it } from 'vitest';
import {
	NES_DPCM_BANK_BYTES,
	dpcmSpaceUsedBytes,
	formatDpcmSpaceUsage
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

	it('formats used and remaining space the way FamiTracker does', () => {
		expect(formatDpcmSpaceUsage(15 * 1024)).toBe(
			'Space used 15 kB, left 241 kB (256 kB available)'
		);
		expect(formatDpcmSpaceUsage(NES_DPCM_BANK_BYTES + 1024)).toBe(
			'Space used 257 kB, left 0 kB (256 kB available)'
		);
	});
});
