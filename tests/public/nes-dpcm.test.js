import { describe, expect, it } from 'vitest';
import NesAudioDriver from '../../public/nes/nes-audio-driver.js';
import NesChipRegisterState from '../../public/nes/nes-chip-register-state.js';
import { dpcmLengthRegister, resolveNesDpcmAssignment } from '../../public/nes/nes-dpcm.js';

function dpcmState() {
	return {
		channelMuted: [false, false, false, false, false],
		channelSoundEnabled: [false, false, false, false, true],
		channelInstruments: [-1, -1, -1, -1, 0],
		instruments: [
			{
				dpcmSamples: [{ name: 'kick', data: [0xaa, 0x55] }],
				dpcmAssignments: [{ sampleIndex: 0, pitch: 15, loop: true, delta: 48 }]
			}
		],
		instrumentPositions: [0, 0, 0, 0, 0],
		channelPatternVolumes: [15, 15, 15, 15, 15],
		channelCurrentNotes: [0, 0, 0, 0, 0],
		channelKeyOn: [false, false, false, false, true],
		channelToneAccumulator: [0, 0, 0, 0, 0],
		channelOnOffCounter: [0, 0, 0, 0, 0],
		channelOnDuration: [0, 0, 0, 0, 0],
		channelOffDuration: [0, 0, 0, 0, 0]
	};
}

describe('NES DPCM assignment', () => {
	it('pads sample length to the hardware (n << 4) + 1 size', () => {
		expect(dpcmLengthRegister(1)).toBe(0);
		expect(dpcmLengthRegister(2)).toBe(1);
		expect(dpcmLengthRegister(17)).toBe(1);
		expect(dpcmLengthRegister(18)).toBe(2);
	});

	it('binds a key to that instrument sample, rate, loop, and delta', () => {
		const assignment = resolveNesDpcmAssignment(
			{
				dpcmSamples: [{ data: [1, 2, 3] }],
				dpcmAssignments: [null, { sampleIndex: 0, pitch: 4, loop: false, delta: 90 }]
			},
			1
		);
		expect(assignment).toMatchObject({ pitch: 4, loop: false, delta: 90, lengthReg: 1 });
		expect(resolveNesDpcmAssignment({ dpcmSamples: [], dpcmAssignments: [] }, 0)).toBeNull();
	});

	it('arms the DPCM channel from the note assignment and retriggers only on key-on', () => {
		const driver = new NesAudioDriver();
		const registerState = new NesChipRegisterState();
		const state = dpcmState();

		driver.processInstruments(state, registerState);

		expect(registerState.channels[4].enabled).toBe(true);
		expect(registerState.channels[4].dpcmPitch).toBe(15);
		expect(registerState.channels[4].dpcmLoop).toBe(true);
		expect(registerState.channels[4].dpcmDelta).toBe(48);
		expect(registerState.channels[4].retrigger).toBe(true);
		expect(registerState.channels[4].dpcmBytes).toEqual([0xaa, 0x55]);

		state.channelKeyOn[4] = false;
		driver.processInstruments(state, registerState);
		expect(registerState.channels[4].enabled).toBe(true);
		expect(registerState.channels[4].retrigger).toBe(false);
	});

	it('leaves the delta counter unset when D-counter is off', () => {
		const driver = new NesAudioDriver();
		const registerState = new NesChipRegisterState();
		const state = dpcmState();
		state.instruments[0].dpcmAssignments[0].delta = null;

		driver.processInstruments(state, registerState);

		expect(registerState.channels[4].enabled).toBe(true);
		expect(registerState.channels[4].dpcmDelta).toBeNull();
	});

	it('silences a key that has no sample', () => {
		const driver = new NesAudioDriver();
		const registerState = new NesChipRegisterState();
		const state = dpcmState();
		state.channelCurrentNotes[4] = 3;

		driver.processInstruments(state, registerState);

		expect(registerState.channels[4].enabled).toBe(false);
		expect(registerState.channels[4].dpcmBytes).toBeNull();
	});
});
