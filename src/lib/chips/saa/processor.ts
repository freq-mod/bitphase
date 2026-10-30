import type { Chip } from '../types';
import type { Pattern } from '../../models/song';
import type { Table } from '../../models/project';
import type { MixerWorkletSlotProcessor } from '../base/processor';
import type { PlaybackCarryState } from '../../services/audio/play-from-position';

export class SAAProcessor implements MixerWorkletSlotProcessor {
	chip: Chip;
	private audioNode: AudioWorkletNode | null = null;

	constructor(chip: Chip) {
		this.chip = chip;
	}

	bindChipIndex(_index: number): void {}

	acceptWorkletPayload(_data: unknown): void {}

	initialize(wasmBuffer: ArrayBuffer, audioNode: AudioWorkletNode): void {
		if (!wasmBuffer || wasmBuffer.byteLength === 0) {
			throw new Error('WASM buffer not available or empty');
		}
		this.audioNode = audioNode;
	}

	play(_initialSpeed?: number): void {}

	playFromRow(
		_row: number,
		_patternOrderIndex?: number,
		_speed?: number | null,
		_carry?: PlaybackCarryState | null
	): void {}

	stop(): void {}

	updateOrder(_order: number[], _loopPointId: number): void {}

	sendInitPattern(_pattern: Pattern, _patternOrderIndex: number): void {}

	sendRequestedPattern(_pattern: Pattern, _patternOrderIndex: number): void {}

	sendInitTables(_tables: Table[]): void {}

	setCallbacks(
		_onPositionUpdate: (currentRow: number, currentPatternOrderIndex?: number) => void,
		_onPatternRequest: (patternOrderIndex: number) => void
	): void {}

	isAudioNodeAvailable(): boolean {
		return this.audioNode !== null;
	}

	sendInitSpeed(_speed: number): void {}

	updateParameter(_parameter: string, _value: unknown): void {}
}
