import { describe, expect, it } from 'vitest';
import { Instrument } from '@/lib/models/song';
import {
	filterInstrumentsForActiveChipTypes,
	filterInstrumentsForChip,
	getOrderedProjectChipTypes,
	resolveInstrumentChipType,
	resolveInstrumentPreviewChip,
	resolvePaletteChipType,
	shouldSyncSelectedChipToActiveEditor
} from '@/lib/services/instrument/instrument-filter';

describe('instrument-filter', () => {
	it('defaults missing chipType to ay', () => {
		const instrument = new Instrument('01');
		expect(resolveInstrumentChipType(instrument)).toBe('ay');
	});

	it('filters instruments by chip type', () => {
		const instruments = [
			new Instrument('01', 'AY', 'ay'),
			new Instrument('02', 'NES', 'nes')
		];

		expect(filterInstrumentsForChip(instruments, 'ay').map((inst) => inst.id)).toEqual(['01']);
		expect(filterInstrumentsForChip(instruments, 'nes').map((inst) => inst.id)).toEqual(['02']);
	});

	it('returns ordered chip types from active songs only', () => {
		const chipProcessors = [{ chip: { type: 'ay' } }, { chip: { type: 'nes' } }];

		expect(getOrderedProjectChipTypes(chipProcessors)).toEqual(['ay', 'nes']);
		expect(getOrderedProjectChipTypes([{ chip: { type: 'nes' } }])).toEqual(['nes']);
	});

	it('resolves preview chip from the instruments tab over the active song chip', () => {
		const ay = { type: 'ay' };
		const nes = { type: 'nes' };

		expect(resolveInstrumentPreviewChip([ay, nes], 'nes', ay)).toBe(nes);
		expect(resolveInstrumentPreviewChip([ay, nes], '', ay)).toBe(ay);
		expect(resolveInstrumentPreviewChip([ay, nes], 'sid', ay)).toBe(ay);
	});

	it('keeps the picker on the selected chip instead of defaulting to ay', () => {
		expect(resolvePaletteChipType('nes', 'ay', ['ay', 'nes'])).toBe('nes');
		expect(resolvePaletteChipType('', 'nes', ['ay', 'nes'])).toBe('nes');
		expect(resolvePaletteChipType('', undefined, ['nes'])).toBe('nes');
		expect(resolvePaletteChipType('', undefined, ['ay', 'nes'])).toBe('ay');
		expect(resolvePaletteChipType('sid', 'nes', ['ay', 'nes'])).toBe('nes');
	});

	it('syncs the instrument chip only after the active editor actually changes', () => {
		expect(shouldSyncSelectedChipToActiveEditor(-1, 0)).toBe(false);
		expect(shouldSyncSelectedChipToActiveEditor(0, 0)).toBe(false);
		expect(shouldSyncSelectedChipToActiveEditor(0, 1)).toBe(true);
	});

	it('removes instruments only when no songs remain for that chip type', () => {
		const instruments = [
			new Instrument('01', 'AY', 'ay'),
			new Instrument('02', 'NES', 'nes')
		];
		const songsAfterRemovingLastAy = [{ chipType: 'nes' } as import('@/lib/models/song').Song];
		const songsWithRemainingAy = [
			{ chipType: 'ay' } as import('@/lib/models/song').Song,
			{ chipType: 'nes' } as import('@/lib/models/song').Song
		];

		expect(
			filterInstrumentsForActiveChipTypes(songsAfterRemovingLastAy, instruments).map((inst) => inst.id)
		).toEqual(['02']);
		expect(
			filterInstrumentsForActiveChipTypes(songsWithRemainingAy, instruments).map((inst) => inst.id)
		).toEqual(['01', '02']);
	});
});
