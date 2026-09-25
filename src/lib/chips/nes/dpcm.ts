import { NES_NTSC_CPU_FREQUENCY } from './schema';

export const NES_DPCM_NOTE_COUNT = 96;
export const NES_DPCM_RATE_COUNT = 16;
export const NES_DPCM_MAX_BYTES = (0xff << 4) + 1;
export const NES_DPCM_BANK_BYTES = 256 * 1024;
export const NES_DPCM_NTSC_PERIODS = [
	428, 380, 340, 320, 286, 254, 226, 214, 190, 160, 142, 128, 106, 84, 72, 54
] as const;

export const NES_DPCM_NOTE_NAMES = [
	'C-',
	'C#',
	'D-',
	'D#',
	'E-',
	'F-',
	'F#',
	'G-',
	'G#',
	'A-',
	'A#',
	'B-'
] as const;

export type NesDpcmSample = {
	name: string;
	data: number[];
};

export type NesDpcmAssignment = {
	sampleIndex: number;
	pitch: number;
	loop: boolean;
	delta: number | null;
};

export function dpcmPlayedByteLength(byteLength: number): number {
	if (!(byteLength > 0)) return 0;
	const played = (Math.ceil((byteLength - 1) / 16) << 4) + 1;
	return Math.min(NES_DPCM_MAX_BYTES, played);
}

export function padDpcmBytes(data: number[]): number[] {
	const played = dpcmPlayedByteLength(data.length);
	const out = new Array<number>(played).fill(0);
	const count = Math.min(data.length, played);
	for (let i = 0; i < count; i++) {
		out[i] = data[i] & 0xff;
	}
	return out;
}

export function createDpcmAssignment(sampleIndex: number): NesDpcmAssignment {
	return { sampleIndex, pitch: 15, loop: false, delta: null };
}

export function dpcmNoteLabel(noteIndex: number): string {
	const octave = Math.floor(noteIndex / 12) + 1;
	return `${NES_DPCM_NOTE_NAMES[noteIndex % 12]}${octave}`;
}

export function dpcmSampleBytes(samples: { data?: unknown[] }[] | undefined): number {
	if (!samples) return 0;
	let total = 0;
	for (const sample of samples) total += sample.data?.length ?? 0;
	return total;
}

export function dpcmSpaceUsedBytes(
	instruments: { id: string; chipType?: string; dpcmSamples?: { data?: unknown[] }[] }[],
	current: { id: string; dpcmSamples?: { data?: unknown[] }[] }
): number {
	let total = 0;
	let seenCurrent = false;
	for (const instrument of instruments) {
		if (instrument.id === current.id) {
			seenCurrent = true;
			total += dpcmSampleBytes(current.dpcmSamples);
			continue;
		}
		if (instrument.chipType !== 'nes') continue;
		total += dpcmSampleBytes(instrument.dpcmSamples);
	}
	if (!seenCurrent) total += dpcmSampleBytes(current.dpcmSamples);
	return total;
}

export function formatDpcmSpaceUsage(
	usedBytes: number,
	availableBytes = NES_DPCM_BANK_BYTES
): string {
	const used = Math.max(0, usedBytes);
	const left = Math.max(0, availableBytes - used);
	const usedKb = Math.floor(used / 1024);
	const leftKb = Math.floor(left / 1024);
	const availableKb = Math.floor(availableBytes / 1024);
	return `Space used ${usedKb} kB (${used.toLocaleString()} bytes), left ${leftKb} kB (${availableKb} kB available)`;
}

export function instrumentHasDpcm(
	source: { dpcmSamples?: { data?: unknown[] }[] } | null | undefined
): boolean {
	return Boolean(source?.dpcmSamples?.some((sample) => (sample.data?.length ?? 0) > 0));
}

export function encodePcm8ToDpcm(pcm: Uint8Array): number[] {
	let level = 64;
	const bytes: number[] = [];
	let current = 0;
	let bit = 0;
	const limit = NES_DPCM_MAX_BYTES * 8;
	const count = Math.min(pcm.length, limit);
	for (let i = 0; i < count; i++) {
		const target = pcm[i] >> 1;
		const up = target >= level;
		if (up) {
			if (level < 127) level++;
			current |= 1 << bit;
		} else if (level > 0) {
			level--;
		}
		bit++;
		if (bit === 8) {
			bytes.push(current);
			current = 0;
			bit = 0;
		}
	}
	if (bit > 0) bytes.push(current);
	return padDpcmBytes(bytes);
}

export function nesDpcmSampleRate(quality: number): number {
	const pitch = Math.max(0, Math.min(NES_DPCM_RATE_COUNT - 1, Math.round(quality)));
	return NES_NTSC_CPU_FREQUENCY / NES_DPCM_NTSC_PERIODS[pitch];
}

export function resamplePcm8ToDpcmRate(
	pcm: Uint8Array,
	sourceRate: number,
	quality: number
): { pcm: Uint8Array; truncated: boolean } {
	const maxSamples = NES_DPCM_MAX_BYTES * 8;
	if (pcm.length === 0 || !(sourceRate > 0)) {
		return { pcm: new Uint8Array(0), truncated: false };
	}
	const targetRate = nesDpcmSampleRate(quality);
	const fullLength = Math.max(0, Math.round((pcm.length * targetRate) / sourceRate));
	const truncated = fullLength > maxSamples;
	const length = Math.min(fullLength, maxSamples);
	const out = new Uint8Array(length);
	const step = sourceRate / targetRate;
	const last = pcm.length - 1;
	for (let i = 0; i < length; i++) {
		const position = i * step;
		const index = Math.min(last, Math.floor(position));
		const next = Math.min(last, index + 1);
		const fraction = position - index;
		out[i] = Math.round(pcm[index] + (pcm[next] - pcm[index]) * fraction);
	}
	return { pcm: out, truncated };
}

export function importPcm8AsDpcm(
	pcm: Uint8Array,
	sourceRate: number,
	quality: number
): { data: number[]; truncated: boolean } {
	const resampled = resamplePcm8ToDpcmRate(pcm, sourceRate, quality);
	return { data: encodePcm8ToDpcm(resampled.pcm), truncated: resampled.truncated };
}

export function normalizeDpcmSamples(value: unknown): NesDpcmSample[] {
	if (!Array.isArray(value)) return [];
	const samples: NesDpcmSample[] = [];
	for (const entry of value) {
		if (!entry || typeof entry !== 'object') continue;
		const record = entry as { name?: unknown; data?: unknown };
		if (!Array.isArray(record.data) || record.data.length === 0) continue;
		const raw = record.data
			.filter((byte) => typeof byte === 'number' && Number.isFinite(byte))
			.map((byte) => (byte as number) & 0xff);
		if (raw.length === 0 || raw.length > NES_DPCM_MAX_BYTES) continue;
		samples.push({
			name: typeof record.name === 'string' && record.name.length > 0 ? record.name : 'Sample',
			data: padDpcmBytes(raw)
		});
	}
	return samples;
}

export function normalizeDpcmDelta(value: unknown): number | null {
	if (value == null || value === '') return null;
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed < 0) return null;
	return Math.max(0, Math.min(127, Math.round(parsed)));
}

export function normalizeDpcmAssignments(
	value: unknown,
	sampleCount: number
): (NesDpcmAssignment | null)[] {
	const assignments: (NesDpcmAssignment | null)[] = Array.from(
		{ length: NES_DPCM_NOTE_COUNT },
		() => null
	);
	if (!Array.isArray(value)) return assignments;
	const count = Math.min(value.length, NES_DPCM_NOTE_COUNT);
	for (let i = 0; i < count; i++) {
		const entry = value[i];
		if (!entry || typeof entry !== 'object') continue;
		const record = entry as {
			sampleIndex?: unknown;
			pitch?: unknown;
			loop?: unknown;
			delta?: unknown;
		};
		const sampleIndex = Number(record.sampleIndex);
		if (!Number.isInteger(sampleIndex) || sampleIndex < 0 || sampleIndex >= sampleCount) continue;
		const pitch = Number(record.pitch);
		assignments[i] = {
			sampleIndex,
			pitch: Number.isFinite(pitch) ? Math.max(0, Math.min(15, Math.round(pitch))) : 15,
			loop: Boolean(record.loop),
			delta: normalizeDpcmDelta(record.delta)
		};
	}
	return assignments;
}

export function copyNesDpcmFields(
	source: { dpcmSamples?: NesDpcmSample[]; dpcmAssignments?: unknown },
	target: { dpcmSamples?: NesDpcmSample[]; dpcmAssignments?: (NesDpcmAssignment | null)[] }
): void {
	if (!source.dpcmSamples?.length) {
		delete target.dpcmSamples;
		delete target.dpcmAssignments;
		return;
	}
	target.dpcmSamples = source.dpcmSamples.map((sample) => ({
		name: sample.name,
		data: sample.data.map((value) => value & 0xff)
	}));
	target.dpcmAssignments = normalizeDpcmAssignments(
		source.dpcmAssignments,
		target.dpcmSamples.length
	);
}
