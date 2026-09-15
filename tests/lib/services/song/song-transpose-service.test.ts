import { describe, expect, it } from 'vitest';
import { Note, NoteName, Pattern } from '@/lib/models/song';
import { SongTransposeService } from '@/lib/services/song/song-transpose-service';
import { AY_CHIP } from '@/lib/chips/ay/core';
import { NES_CHIP } from '@/lib/chips/nes/core';
import { AY_CHIP_SCHEMA } from '@/lib/chips/ay/schema';
import { NES_CHIP_SCHEMA, NES_DEFAULT_TUNING_TABLE } from '@/lib/chips/nes/schema';
import { PT3TuneTables } from '@/lib/models/pt3/tuning-tables';
import { noteToEnvelopePeriod } from '@/lib/utils/envelope-note-conversion';
import { TUNING_TABLE_NOTE_COUNT, tuningTableIndexToNote } from '@/lib/utils/note-utils';

const ayTuningTable = PT3TuneTables[2];

function noteIndex(noteName: NoteName, octave: number): number {
	return (octave - 1) * 12 + (noteName - NoteName.C);
}

describe('SongTransposeService', () => {
	it('transposes notes in every pattern of an AY song', () => {
		const first = new Pattern(0, 4, AY_CHIP_SCHEMA);
		first.channels[0].rows[0].note = new Note(NoteName.C, 4);
		first.channels[1].rows[1].note = new Note(NoteName.E, 3);

		const second = new Pattern(1, 4, AY_CHIP_SCHEMA);
		second.channels[2].rows[0].note = new Note(NoteName.G, 4);

		const [outFirst, outSecond] = SongTransposeService.transposePatterns(
			[first, second],
			2,
			AY_CHIP,
			ayTuningTable
		);

		expect(outFirst.channels[0].rows[0].note).toMatchObject({
			name: NoteName.D,
			octave: 4
		});
		expect(outFirst.channels[1].rows[1].note).toMatchObject({
			name: NoteName.FSharp,
			octave: 3
		});
		expect(outSecond.channels[2].rows[0].note).toMatchObject({
			name: NoteName.A,
			octave: 4
		});
	});

	it('transposes AY envelope periods and leaves empty envelopes unchanged', () => {
		const pattern = new Pattern(0, 4, AY_CHIP_SCHEMA);
		pattern.channels[0].rows[0].note = new Note(NoteName.C, 4);
		pattern.patternRows[0].envelopeValue = noteToEnvelopePeriod(
			noteIndex(NoteName.C, 4),
			ayTuningTable
		);
		pattern.patternRows[1].envelopeValue = 0;
		pattern.channels[0].rows[0].envelopeShape = 8;
		pattern.patternRows[0].noiseValue = 0x1f;

		const [out] = SongTransposeService.transposePatterns([pattern], 2, AY_CHIP, ayTuningTable);

		expect(out.channels[0].rows[0].note).toMatchObject({
			name: NoteName.D,
			octave: 4
		});
		expect(out.patternRows[0].envelopeValue).toBe(
			noteToEnvelopePeriod(noteIndex(NoteName.D, 4), ayTuningTable)
		);
		expect(out.patternRows[1].envelopeValue).toBe(0);
		expect(out.channels[0].rows[0].envelopeShape).toBe(8);
		expect(out.patternRows[0].noiseValue).toBe(0x1f);
	});

	it('skips empty and OFF notes', () => {
		const pattern = new Pattern(0, 4, AY_CHIP_SCHEMA);
		pattern.channels[0].rows[1].note = new Note(NoteName.Off, 0);
		pattern.channels[1].rows[0].note = new Note(NoteName.C, 4);

		const [out] = SongTransposeService.transposePatterns([pattern], 1, AY_CHIP, ayTuningTable);

		expect(out.channels[0].rows[0].note).toMatchObject({
			name: NoteName.None,
			octave: 0
		});
		expect(out.channels[0].rows[1].note).toMatchObject({
			name: NoteName.Off,
			octave: 0
		});
		expect(out.channels[1].rows[0].note).toMatchObject({
			name: NoteName.CSharp,
			octave: 4
		});
	});

	it('transposes NES notes only', () => {
		const pattern = new Pattern(0, 4, NES_CHIP_SCHEMA);
		pattern.channels[0].rows[0].note = new Note(NoteName.C, 4);
		pattern.channels[1].rows[0].note = new Note(NoteName.Off, 0);

		const [out] = SongTransposeService.transposePatterns(
			[pattern],
			2,
			NES_CHIP,
			NES_DEFAULT_TUNING_TABLE
		);

		expect(NES_CHIP.transposeAdditionalPitch).toBeUndefined();
		expect(out.channels[0].rows[0].note).toMatchObject({
			name: NoteName.D,
			octave: 4
		});
		expect(out.channels[1].rows[0].note).toMatchObject({
			name: NoteName.Off,
			octave: 0
		});
	});

	it('clamps notes at tuning table edges', () => {
		const pattern = new Pattern(0, 4, AY_CHIP_SCHEMA);
		pattern.channels[0].rows[0].note = new Note(NoteName.C, 1);
		const highest = tuningTableIndexToNote(TUNING_TABLE_NOTE_COUNT - 1);
		expect(highest).not.toBeNull();
		pattern.channels[0].rows[1].note = new Note(highest!.noteName, highest!.octave);

		const [down] = SongTransposeService.transposePatterns(
			[pattern],
			-1,
			AY_CHIP,
			ayTuningTable
		);
		expect(down.channels[0].rows[0].note).toMatchObject({
			name: NoteName.C,
			octave: 1
		});

		const [up] = SongTransposeService.transposePatterns([pattern], 1, AY_CHIP, ayTuningTable);
		expect(up.channels[0].rows[1].note).toMatchObject({
			name: highest!.noteName,
			octave: highest!.octave
		});
	});

	it('clamps AY envelope periods at tuning table edges', () => {
		const pattern = new Pattern(0, 4, AY_CHIP_SCHEMA);
		const lastIndex = ayTuningTable.length - 1;
		pattern.patternRows[0].envelopeValue = noteToEnvelopePeriod(0, ayTuningTable);
		pattern.patternRows[1].envelopeValue = noteToEnvelopePeriod(lastIndex, ayTuningTable);

		const [down] = SongTransposeService.transposePatterns(
			[pattern],
			-12,
			AY_CHIP,
			ayTuningTable
		);
		expect(down.patternRows[0].envelopeValue).toBe(noteToEnvelopePeriod(0, ayTuningTable));

		const [up] = SongTransposeService.transposePatterns([pattern], 12, AY_CHIP, ayTuningTable);
		expect(up.patternRows[1].envelopeValue).toBe(
			noteToEnvelopePeriod(lastIndex, ayTuningTable)
		);
	});

	it('returns the original patterns when semitones is 0', () => {
		const pattern = new Pattern(0, 4, AY_CHIP_SCHEMA);
		pattern.channels[0].rows[0].note = new Note(NoteName.C, 4);
		const patterns = [pattern];

		expect(SongTransposeService.transposePatterns(patterns, 0, AY_CHIP, ayTuningTable)).toBe(
			patterns
		);
	});
});
