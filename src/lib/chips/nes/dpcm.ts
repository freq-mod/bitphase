export const NES_DPCM_NOTE_COUNT = 96;
export const NES_DPCM_RATE_COUNT = 16;
export const NES_DPCM_MAX_BYTES = (0xff << 4) + 1;
export const NES_DPCM_BANK_BYTES = 256 * 1024;

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
	const usedKb = Math.floor(Math.max(0, usedBytes) / 1024);
	const leftKb = Math.max(0, Math.floor((availableBytes - usedBytes) / 1024));
	const availableKb = Math.floor(availableBytes / 1024);
	return `Space used ${usedKb} kB, left ${leftKb} kB (${availableKb} kB available)`;
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
