import { describe, expect, it } from 'vitest';
import {
	clipboardAllowsNoteEnvelopeConversion,
	minClipboardChannelIndex,
	resolveClipboardDestChannelIndex,
	resolveClipboardDestFieldKey
} from '@/lib/services/pattern/clipboard-field-mapping';

describe('clipboard field mapping', () => {
	it('converts envelope and note only for a single-field clipboard', () => {
		expect(clipboardAllowsNoteEnvelopeConversion(['envelopeValue'])).toBe(true);
		expect(clipboardAllowsNoteEnvelopeConversion(['note'])).toBe(true);
		expect(clipboardAllowsNoteEnvelopeConversion(['envelopeValue', 'envelopeValue'])).toBe(
			true
		);
		expect(clipboardAllowsNoteEnvelopeConversion(['note', 'volume'])).toBe(false);
	});

	it('maps source channels relative to the paste origin channel', () => {
		expect(resolveClipboardDestChannelIndex(0, 1, 0)).toBe(1);
		expect(resolveClipboardDestChannelIndex(1, 1, 0)).toBe(2);
		expect(resolveClipboardDestChannelIndex(1, 0, 1)).toBe(0);
		expect(resolveClipboardDestChannelIndex(-1, 0, 0)).toBe(-1);
	});

	it('keeps unique fields on their own key', () => {
		expect(resolveClipboardDestFieldKey('volume', 'note', ['volume'])).toBe('volume');
		expect(resolveClipboardDestFieldKey('table', 'effect', ['table', 'volume'])).toBe('table');
	});

	it('shifts effect slots relative to the paste cursor', () => {
		expect(resolveClipboardDestFieldKey('effect', 'effect1', ['effect'])).toBe('effect1');
		expect(resolveClipboardDestFieldKey('effect', 'effect1', ['effect', 'effect1'])).toBe(
			'effect1'
		);
		expect(resolveClipboardDestFieldKey('effect1', 'effect1', ['effect', 'effect1'])).toBe(
			'effect2'
		);
		expect(resolveClipboardDestFieldKey('effect', 'note', ['effect'])).toBe('effect');
	});

	it('ignores global fields when finding the first source channel', () => {
		expect(minClipboardChannelIndex([-1, 2, 1])).toBe(1);
		expect(minClipboardChannelIndex([undefined, -1])).toBe(0);
	});
});
