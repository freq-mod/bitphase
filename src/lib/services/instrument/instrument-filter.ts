import type { Instrument, Song } from '../../models/song';
import { CHIP_TYPES } from '../../chips/chip-registration';

export function resolveInstrumentChipType(instrument: Instrument): string {
	return instrument.chipType ?? 'ay';
}

export function filterInstrumentsForChip(
	instruments: Instrument[],
	chipType: string
): Instrument[] {
	return instruments.filter((instrument) => resolveInstrumentChipType(instrument) === chipType);
}

export function getActiveChipTypes(songs: Song[]): Set<string> {
	const types = new Set<string>();
	for (const song of songs) {
		if (song.chipType) {
			types.add(song.chipType);
		}
	}
	return types;
}

export function filterInstrumentsForActiveChipTypes(
	songs: Song[],
	instruments: Instrument[]
): Instrument[] {
	const activeChipTypes = getActiveChipTypes(songs);
	return instruments.filter((instrument) =>
		activeChipTypes.has(resolveInstrumentChipType(instrument))
	);
}

export function getOrderedProjectChipTypes(
	chipProcessors: { chip: { type: string } }[]
): string[] {
	const types = new Set<string>();
	for (const processor of chipProcessors) {
		types.add(processor.chip.type);
	}
	return CHIP_TYPES.filter((type) => types.has(type));
}

export function resolveInstrumentPreviewChip<T extends { type: string }>(
	chips: T[],
	selectedInstrumentChipType: string | undefined,
	activeChip: T | undefined
): T | undefined {
	const chipType = selectedInstrumentChipType || activeChip?.type;
	if (!chipType) return activeChip;
	return chips.find((chip) => chip.type === chipType) ?? activeChip;
}
