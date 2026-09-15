import type { GenericPattern } from '../../models/song/generic';
import { toNumber } from '../../utils/type-guards';
import { envelopePeriodToNote, noteToEnvelopePeriod } from '../../utils/envelope-note-conversion';

export function transposeAyAdditionalPitch(
	generic: GenericPattern,
	semitones: number,
	tuningTable: number[]
): void {
	if (semitones === 0 || tuningTable.length === 0) return;

	for (const patternRow of generic.patternRows) {
		const period = toNumber(patternRow.envelopeValue);
		if (period === 0) continue;

		const noteIndex = envelopePeriodToNote(period, tuningTable);
		if (noteIndex === null) continue;

		const newNoteIndex = Math.max(0, Math.min(tuningTable.length - 1, noteIndex + semitones));
		patternRow.envelopeValue = noteToEnvelopePeriod(newNoteIndex, tuningTable);
	}
}
