export const MAX_VIRTUAL_CHANNELS_PER_HARDWARE_CHANNEL = 3;

export interface VirtualChannelGroup {
	hardwareChannelIndex: number;
	hardwareLabel: string;
	virtualChannelIndices: number[];
	virtualLabels: string[];
}

export function clampVirtualChannelCount(count: number | undefined): number {
	if (typeof count !== 'number' || !Number.isFinite(count)) return 1;
	const truncated = Math.trunc(count);
	if (truncated <= 1) return 1;
	return Math.min(MAX_VIRTUAL_CHANNELS_PER_HARDWARE_CHANNEL, truncated);
}

function storedVirtualChannelCount(count: number | undefined): number {
	if (typeof count !== 'number' || !Number.isFinite(count)) return 1;
	const truncated = Math.trunc(count);
	return truncated < 1 ? 1 : truncated;
}

export function normalizeVirtualChannelMap(
	virtualChannelMap: Record<number, number> | undefined,
	hwChannelCount: number
): Record<number, number> {
	const source = virtualChannelMap ?? {};
	const normalized: Record<number, number> = {};
	for (let hw = 0; hw < hwChannelCount; hw++) {
		const count = clampVirtualChannelCount(source[hw]);
		if (count > 1) normalized[hw] = count;
	}
	return normalized;
}

export function storedVirtualChannelTotal(
	hwChannelCount: number,
	virtualChannelMap: Record<number, number> | undefined
): number {
	const source = virtualChannelMap ?? {};
	let total = 0;
	for (let hw = 0; hw < hwChannelCount; hw++) {
		total += storedVirtualChannelCount(source[hw]);
	}
	return total;
}

export function selectChannelsWithinVirtualLimit<T>(
	channels: readonly T[],
	hwChannelCount: number,
	virtualChannelMap: Record<number, number> | undefined
): T[] {
	const source = virtualChannelMap ?? {};
	const selected: T[] = [];
	let offset = 0;
	for (let hw = 0; hw < hwChannelCount; hw++) {
		const storedCount = storedVirtualChannelCount(source[hw]);
		const keptCount = clampVirtualChannelCount(source[hw]);
		for (let virtual = 0; virtual < keptCount; virtual++) {
			const channel = channels[offset + virtual];
			if (channel !== undefined) selected.push(channel);
		}
		offset += storedCount;
	}
	return selected;
}

export function formatVirtualChannelLabel(hwLabel: string, virtualIndex1Based: number): string {
	if (hwLabel.length <= 2 && !/\d$/.test(hwLabel)) {
		return `${hwLabel}${virtualIndex1Based}`;
	}
	return `${hwLabel}:${virtualIndex1Based}`;
}

export function computeEffectiveChannelLabels(
	hwLabels: string[],
	virtualChannelMap: Record<number, number>
): string[] {
	const labels: string[] = [];
	for (let i = 0; i < hwLabels.length; i++) {
		const virtualCount = clampVirtualChannelCount(virtualChannelMap[i]);
		if (virtualCount <= 1) {
			labels.push(hwLabels[i]);
		} else {
			for (let v = 0; v < virtualCount; v++) {
				labels.push(formatVirtualChannelLabel(hwLabels[i], v + 1));
			}
		}
	}
	return labels;
}

export function getHardwareChannelIndex(
	virtualChannelIndex: number,
	hwLabels: string[],
	virtualChannelMap: Record<number, number>
): number {
	let offset = 0;
	for (let i = 0; i < hwLabels.length; i++) {
		const virtualCount = clampVirtualChannelCount(virtualChannelMap[i]);
		if (virtualChannelIndex < offset + virtualCount) {
			return i;
		}
		offset += virtualCount;
	}
	return hwLabels.length - 1;
}

export function getVirtualChannelGroups(
	hwLabels: string[],
	virtualChannelMap: Record<number, number>
): VirtualChannelGroup[] {
	const groups: VirtualChannelGroup[] = [];
	let offset = 0;
	for (let i = 0; i < hwLabels.length; i++) {
		const virtualCount = clampVirtualChannelCount(virtualChannelMap[i]);
		const indices: number[] = [];
		const labels: string[] = [];
		for (let v = 0; v < virtualCount; v++) {
			indices.push(offset + v);
			labels.push(
				virtualCount > 1 ? formatVirtualChannelLabel(hwLabels[i], v + 1) : hwLabels[i]
			);
		}
		groups.push({
			hardwareChannelIndex: i,
			hardwareLabel: hwLabels[i],
			virtualChannelIndices: indices,
			virtualLabels: labels
		});
		offset += virtualCount;
	}
	return groups;
}

export function getVirtualIndicesForHardwareChannel(
	hwIndex: number,
	hwLabels: string[],
	virtualChannelMap: Record<number, number>
): number[] {
	return (
		getVirtualChannelGroups(hwLabels, virtualChannelMap)[hwIndex]?.virtualChannelIndices ?? [
			hwIndex
		]
	);
}

export function getTotalVirtualChannelCount(
	hwChannelCount: number,
	virtualChannelMap: Record<number, number>
): number {
	let total = 0;
	for (let i = 0; i < hwChannelCount; i++) {
		total += clampVirtualChannelCount(virtualChannelMap[i]);
	}
	return total;
}

export function hasVirtualChannels(virtualChannelMap: Record<number, number>): boolean {
	return Object.values(virtualChannelMap).some((count) => count > 1);
}
