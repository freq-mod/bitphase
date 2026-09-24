import { describe, expect, it } from 'vitest';
import { AY_CHIP_SCHEMA } from '@/lib/chips/ay/schema';
import { Effect, EffectType, Pattern, Song } from '@/lib/models/song';
import { Project } from '@/lib/models/project';
import { decodePsgFrames } from '@/lib/services/file/ay/psg-frames';
import {
	captureSongRegisterFrames,
	generateSharedPSGBuffers,
	type PsgExportModules
} from '@/lib/services/file/ay/psg-export';

async function loadModules(): Promise<PsgExportModules> {
	return {
		AyumiState: (await import('../../../../../public/ay/ayumi-state.js')).default,
		TrackerPatternProcessor: (
			await import('../../../../../public/tracker/tracker-pattern-processor.js')
		).default,
		AYAudioDriver: (await import('../../../../../public/ay/ay-audio-driver.js')).default,
		AYChipRegisterState: (await import('../../../../../public/ay/ay-chip-register-state.js'))
			.default,
		VirtualChannelMixer: (await import('../../../../../public/ay/virtual-channel-mixer.js'))
			.default
	};
}

function aySong(pattern: Pattern, initialSpeed: number): Song {
	const song = new Song(AY_CHIP_SCHEMA);
	song.chipType = 'ay';
	song.chipFrequency = 1_773_400;
	song.interruptFrequency = 50;
	song.initialSpeed = initialSpeed;
	song.patterns = [pattern];
	song.tuningTable = [...(AY_CHIP_SCHEMA.defaultTuningTable ?? [])];
	return song;
}

function projectWithSpeedOnSong(
	songWithSpeed: 0 | 1,
	initialSpeed: number,
	speed: number,
	row: number
) {
	const quiet = new Pattern(0, 2, AY_CHIP_SCHEMA);
	const changed = new Pattern(0, 2, AY_CHIP_SCHEMA);
	changed.channels[0]!.rows[row]!.effects = [new Effect(EffectType.Speed, 0, speed)];
	const songs =
		songWithSpeed === 0
			? [aySong(changed, initialSpeed), aySong(quiet, initialSpeed)]
			: [aySong(quiet, initialSpeed), aySong(changed, initialSpeed)];
	return new Project('shared speed', '', songs, 0, [0], [], {}, []);
}

describe('shared PSG speed', () => {
	it('applies a speed command from one AY chip to every PSG', async () => {
		const modules = await loadModules();
		const project = projectWithSpeedOnSong(1, 3, 1, 0);
		const [first, second] = await generateSharedPSGBuffers(project, [0, 1], { modules });
		const firstFrames = decodePsgFrames(new Uint8Array(first!));
		const secondFrames = decodePsgFrames(new Uint8Array(second!));

		expect(firstFrames).toHaveLength(2);
		expect(secondFrames).toHaveLength(2);

		const alone = await captureSongRegisterFrames(project, 0, { modules });
		expect(alone.frames).toHaveLength(6);
	});

	it('applies a later speed change from the first chip to the other PSG', async () => {
		const modules = await loadModules();
		const project = projectWithSpeedOnSong(0, 2, 5, 1);
		const buffers = await generateSharedPSGBuffers(project, [0, 1], { modules });
		const lengths = buffers.map((buffer) => decodePsgFrames(new Uint8Array(buffer)).length);

		expect(lengths).toEqual([7, 7]);
	});
});
