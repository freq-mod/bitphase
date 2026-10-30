import { describe, expect, it } from 'vitest';
import { SaaWaveformCapture } from '../../public/saa/saa-waveform.js';

describe('SAA oscilloscope capture', () => {
	it('records the chip channel samples and clears a muted channel', () => {
		const capture = new SaaWaveformCapture(2);
		capture.writeSample(0, new Float32Array([0.2, -0.4]), [false, false]);
		capture.writeSample(1, new Float32Array([0.2, -0.4]), [true, false]);
		expect(capture.buffers[0][0]).toBeCloseTo(0.2);
		expect(capture.buffers[0][1]).toBe(0);
		expect(capture.buffers[1][1]).toBeCloseTo(-0.4);
	});

	it('posts one frame per channel', () => {
		const capture = new SaaWaveformCapture(6);
		capture.writeSample(0, new Float32Array([0.1, 0, 0.3, 0, 0, -0.2]));
		capture.advance(1);
		const frames = capture.snapshot();
		expect(frames).toHaveLength(6);
		expect(frames[0][frames[0].length - 1]).toBeCloseTo(0.1);
		expect(frames[2][frames[2].length - 1]).toBeCloseTo(0.3);
		expect(frames[1].every((sample) => sample === 0)).toBe(true);
	});
});
