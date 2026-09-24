export const NES_DPCM_NOTE_COUNT = 96;
export const NES_DPCM_RATE_COUNT = 16;
export const NES_DPCM_WINDOW_SIZE = 0x4000;
export const NES_DPCM_MAX_BYTES = (0xff << 4) + 1;

export function dpcmPlayedByteLength(byteLength) {
	if (!(byteLength > 0)) return 0;
	const played = (Math.ceil((byteLength - 1) / 16) << 4) + 1;
	return Math.min(NES_DPCM_MAX_BYTES, played);
}

export function dpcmLengthRegister(byteLength) {
	const played = dpcmPlayedByteLength(byteLength);
	if (!(played > 0)) return 0;
	return (played - 1) >> 4;
}

export function resolveNesDpcmAssignment(instrument, noteIndex) {
	if (!instrument || noteIndex < 0 || noteIndex >= NES_DPCM_NOTE_COUNT) return null;
	const assignment = instrument.dpcmAssignments?.[noteIndex];
	if (!assignment || !(assignment.sampleIndex >= 0)) return null;
	const sample = instrument.dpcmSamples?.[assignment.sampleIndex];
	if (!sample?.data?.length) return null;
	const pitch = Math.max(0, Math.min(NES_DPCM_RATE_COUNT - 1, assignment.pitch | 0));
	const delta =
		assignment.delta == null || assignment.delta < 0
			? null
			: Math.max(0, Math.min(127, assignment.delta | 0));
	return {
		pitch,
		loop: Boolean(assignment.loop),
		delta,
		lengthReg: dpcmLengthRegister(sample.data.length),
		data: sample.data
	};
}
