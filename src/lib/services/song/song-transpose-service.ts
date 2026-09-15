import type { Pattern } from '../../models/song';
import type { Chip } from '../../chips/types';
import type { ChipField, ChipSchema } from '../../chips/base/schema';
import type { PatternConverter } from '../../chips/base/adapter';
import type { GenericPattern } from '../../models/song/generic';
import { PatternValueUpdates } from '../pattern/editing/pattern-value-updates';
import { getChipByType } from '../../chips/registry';
import { projectStore } from '../../stores/project.svelte';
import { isString } from '../../utils/type-guards';

function fieldKeysOfType(
	fields: Record<string, ChipField> | undefined,
	type: ChipField['type']
): string[] {
	if (!fields) return [];
	return Object.keys(fields).filter((key) => fields[key].type === type);
}

function noteFieldKeys(schema: ChipSchema): { channel: string[]; global: string[] } {
	return {
		channel: fieldKeysOfType(schema.fields, 'note'),
		global: fieldKeysOfType(schema.globalFields, 'note')
	};
}

function transposeNoteFields(
	generic: GenericPattern,
	semitones: number,
	keys: { channel: string[]; global: string[] }
): void {
	for (const patternRow of generic.patternRows) {
		for (const key of keys.global) {
			const current = patternRow[key];
			if (!isString(current)) continue;
			patternRow[key] = PatternValueUpdates.incrementNoteValue(current, semitones);
		}
	}

	for (const channel of generic.channels) {
		for (const row of channel.rows) {
			for (const key of keys.channel) {
				const current = row[key];
				if (!isString(current)) continue;
				row[key] = PatternValueUpdates.incrementNoteValue(current, semitones);
			}
		}
	}
}

export class SongTransposeService {
	static transposePattern(
		pattern: Pattern,
		semitones: number,
		chip: Chip,
		tuningTable: number[],
		converter?: PatternConverter,
		keys?: { channel: string[]; global: string[] }
	): Pattern {
		if (semitones === 0) return pattern;

		const patternConverter = converter ?? chip.createConverter();
		const noteKeys = keys ?? noteFieldKeys(chip.schema);
		const generic = patternConverter.toGeneric(pattern);
		transposeNoteFields(generic, semitones, noteKeys);
		chip.transposeAdditionalPitch?.(generic, semitones, tuningTable);
		return patternConverter.fromGeneric(generic);
	}

	static transposePatterns(
		patterns: Pattern[],
		semitones: number,
		chip: Chip,
		tuningTable: number[]
	): Pattern[] {
		if (semitones === 0) return patterns;

		const converter = chip.createConverter();
		const keys = noteFieldKeys(chip.schema);
		return patterns.map((pattern) =>
			SongTransposeService.transposePattern(
				pattern,
				semitones,
				chip,
				tuningTable,
				converter,
				keys
			)
		);
	}

	static applyToSong(songIndex: number, semitones: number): boolean {
		if (semitones === 0) return false;

		const song = projectStore.songs[songIndex];
		if (!song) return false;

		const chip = getChipByType(song.chipType ?? 'ay');
		if (!chip) return false;

		const originalPatterns = projectStore.patterns[songIndex] ?? [];
		if (originalPatterns.length === 0) return false;

		const transposed = SongTransposeService.transposePatterns(
			originalPatterns,
			semitones,
			chip,
			song.tuningTable
		);
		const diffs = originalPatterns.map((before, patternIndex) =>
			projectStore.createSetDiff(
				['patterns', songIndex, patternIndex],
				before,
				transposed[patternIndex]
			)
		);

		projectStore.recordHistory(
			{
				type: 'song.transpose',
				label: `Transpose song by ${semitones}`,
				affectedDomains: ['patterns']
			},
			diffs
		);
		projectStore.updatePatterns(songIndex, transposed);
		return true;
	}
}
