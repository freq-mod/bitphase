import {
	getChannelEffectFieldKey,
	getChannelEffectSlotIndex,
	isChannelEffectFieldKey,
	isEffectFieldKey
} from '../../chips/base/channel-effect-columns';

export function clipboardFieldsAreCompatible(sourceKey: string, targetKey: string): boolean {
	if (sourceKey === targetKey) return true;
	return isEffectFieldKey(sourceKey) && isEffectFieldKey(targetKey);
}

export function clipboardAllowsNoteEnvelopeConversion(fieldKeys: string[]): boolean {
	const keys = new Set(fieldKeys);
	if (keys.size !== 1) return false;
	const [key] = keys;
	return key === 'envelopeValue' || key === 'note';
}

export function resolveClipboardDestChannelIndex(
	sourceChannelIndex: number | undefined,
	originChannelIndex: number,
	minSourceChannelIndex: number
): number {
	if (sourceChannelIndex !== undefined && sourceChannelIndex < 0) {
		return -1;
	}
	const sourceChannel = sourceChannelIndex ?? originChannelIndex;
	if (sourceChannel < 0) {
		return originChannelIndex;
	}
	if (originChannelIndex < 0) {
		return sourceChannel;
	}
	return originChannelIndex + (sourceChannel - minSourceChannelIndex);
}

export function minClipboardChannelIndex(
	channelIndices: Array<number | undefined>
): number {
	const channels = channelIndices.filter(
		(index): index is number => index !== undefined && index >= 0
	);
	return channels.length > 0 ? Math.min(...channels) : 0;
}

export function resolveClipboardDestFieldKey(
	sourceKey: string,
	originFieldKey: string | undefined,
	sourceFieldKeys: string[]
): string {
	if (!isChannelEffectFieldKey(sourceKey)) {
		return sourceKey;
	}
	const sourceSlot = getChannelEffectSlotIndex(sourceKey) ?? 0;
	const originSlot =
		originFieldKey && isChannelEffectFieldKey(originFieldKey)
			? (getChannelEffectSlotIndex(originFieldKey) ?? 0)
			: null;
	if (originSlot === null) {
		return getChannelEffectFieldKey(sourceSlot);
	}
	const sourceSlots = sourceFieldKeys
		.map((key) => getChannelEffectSlotIndex(key))
		.filter((slot): slot is number => slot !== null);
	const minSourceSlot = sourceSlots.length > 0 ? Math.min(...sourceSlots) : sourceSlot;
	return getChannelEffectFieldKey(originSlot + (sourceSlot - minSourceSlot));
}

export function clipboardNoteEnvelopeConversionTarget(sourceKey: string): string | null {
	if (sourceKey === 'envelopeValue') return 'note';
	if (sourceKey === 'note') return 'envelopeValue';
	return null;
}
