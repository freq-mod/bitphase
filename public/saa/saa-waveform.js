import { SAA_CHANNEL_COUNT } from './saa-constants.js';

export const SAA_WAVEFORM_FRAME = 512;

export class SaaWaveformCapture {
	constructor(channelCount = SAA_CHANNEL_COUNT) {
		this.channelCount = channelCount;
		this.buffers = Array.from({ length: channelCount }, () => new Float32Array(SAA_WAVEFORM_FRAME));
		this.writeIndex = 0;
	}

	reset() {
		for (const buffer of this.buffers) buffer.fill(0);
		this.writeIndex = 0;
	}

	writeSample(sampleIndex, channelSamples, muted) {
		const index = this.writeIndex;
		for (let channel = 0; channel < this.buffers.length; channel++) {
			const sample = muted?.[channel] ? 0 : (channelSamples?.[channel] ?? 0);
			this.buffers[channel][(index + sampleIndex) % SAA_WAVEFORM_FRAME] = sample;
		}
	}

	advance(numSamples) {
		this.writeIndex = (this.writeIndex + numSamples) % SAA_WAVEFORM_FRAME;
	}

	snapshot() {
		const index = this.writeIndex;
		return this.buffers.map((buffer) => {
			const out = new Float32Array(SAA_WAVEFORM_FRAME);
			for (let i = 0; i < SAA_WAVEFORM_FRAME; i++) {
				out[i] = buffer[(index + i) % SAA_WAVEFORM_FRAME];
			}
			return out;
		});
	}
}
