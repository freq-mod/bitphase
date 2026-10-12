// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { AYConverter } from '../../../../src/lib/chips/ay/adapter';
import { AY_CHIP_SCHEMA } from '../../../../src/lib/chips/ay/schema';
import { NESConverter } from '../../../../src/lib/chips/nes/adapter';
import { NES_CHIP_SCHEMA } from '../../../../src/lib/chips/nes/schema';
import { Effect, Note, NoteName, Pattern } from '../../../../src/lib/models/song';
import { defaultUserScripts } from '../../../../src/lib/config/user-scripts';
import { describeScriptApi } from '../../../../src/lib/services/user-scripts/script-model';
import { UserScriptsService } from '../../../../src/lib/services/user-scripts/user-scripts-service';
import type { UserScript } from '../../../../src/lib/services/user-scripts/types';

const bounds = { minRow: 0, maxRow: 1, minCol: 0, maxCol: 20 };

function script(code: string): UserScript {
	return { id: 'test', name: 'test', description: '', code };
}

describe('UserScriptsService', () => {
	it('projects AY channel fields, effect columns, and shared globals', () => {
		const pattern = new Pattern(0, 4, AY_CHIP_SCHEMA);
		pattern.channels[0].effectColumnCount = 2;
		pattern.channels[0].rows[0].note = new Note(NoteName.C, 4);
		pattern.channels[0].rows[0].volume = 8;
		pattern.channels[0].rows[0].envelopeShape = 12;
		pattern.channels[0].rows[0].effects = [new Effect(1, 2, 3), new Effect(4, 5, 6)];
		pattern.patternRows[0].envelopeValue = 100;
		pattern.patternRows[0].noiseValue = 7;
		pattern.patternRows[0].envelopeEffect = new Effect(9, 0, 1);

		const context = UserScriptsService.createScriptContext({
			pattern,
			bounds,
			converter: new AYConverter(),
			selectedChannels: new Set([0]),
			schema: AY_CHIP_SCHEMA
		});

		expect(context.chip).toMatchObject({
			type: 'ay',
			volumeMax: 15,
			channels: ['A', 'B', 'C']
		});
		expect(context.chip.fields).toContain('envelopeShape');
		expect(context.chip.globals).toEqual(['envelopeValue', 'envelopeEffect', 'noiseValue']);
		expect(context.rows[0]).toMatchObject({
			note: 'C-4',
			volume: 8,
			envelopeShape: 12,
			envelopeValue: 100,
			noiseValue: 7,
			effect: { effect: 1, delay: 2, parameter: 3 },
			effects: [
				{ effect: 1, delay: 2, parameter: 3 },
				{ effect: 4, delay: 5, parameter: 6 }
			]
		});
		expect(context.globals[0]).toMatchObject({
			rowIndex: 0,
			envelopeValue: 100,
			noiseValue: 7,
			envelopeEffect: { effect: 9, delay: 0, parameter: 1 }
		});
		expect(context.rows[0].envelopeEffect).not.toBe(context.globals[0].envelopeEffect);
	});

	it('omits AY-only columns from NES rows', () => {
		const pattern = new Pattern(0, 4, NES_CHIP_SCHEMA);
		pattern.channels[0].rows[0].note = new Note(NoteName.A, 3);
		pattern.channels[0].rows[0].volume = 4;

		const context = UserScriptsService.createScriptContext({
			pattern,
			bounds,
			converter: new NESConverter(),
			selectedChannels: new Set([0, 2]),
			schema: NES_CHIP_SCHEMA
		});

		expect(context.chip.type).toBe('nes');
		expect(context.chip.channels).toEqual(['Pulse 1', 'Pulse 2', 'Triangle', 'Noise', 'DPCM']);
		expect(context.chip.volumeMax).toBe(15);
		expect(context.chip.globals).toEqual([]);
		expect(context.chip.fields).not.toContain('envelopeShape');
		expect(context.globals).toEqual([]);
		expect(context.rows.map((row) => row.channelIndex)).toEqual([0, 2, 0, 2]);
		expect(context.rows[0]).toMatchObject({ note: 'A-3', volume: 4 });
		expect(context.rows[0]).not.toHaveProperty('envelopeShape');
		expect(context.rows[0]).not.toHaveProperty('envelopeValue');
		expect(context.rows[0]).not.toHaveProperty('envelopeEffect');
	});

	it('writes an edited AY row alias when globals are unchanged', () => {
		const pattern = new Pattern(0, 4, AY_CHIP_SCHEMA);
		pattern.patternRows[0].envelopeValue = 10;
		const extracted = UserScriptsService.createScriptContext({
			pattern,
			bounds,
			converter: new AYConverter(),
			selectedChannels: new Set([0, 1]),
			schema: AY_CHIP_SCHEMA
		});
		const result = structuredClone(extracted);
		result.rows[0].envelopeValue = 77;

		const updated = UserScriptsService.applyScriptResult(
			pattern,
			result,
			new AYConverter(),
			AY_CHIP_SCHEMA,
			extracted
		);

		expect(updated.patternRows[0].envelopeValue).toBe(77);
	});

	it('writes edited globals when row aliases are unchanged', () => {
		const pattern = new Pattern(0, 4, AY_CHIP_SCHEMA);
		pattern.patternRows[0].noiseValue = 1;
		const extracted = UserScriptsService.createScriptContext({
			pattern,
			bounds,
			converter: new AYConverter(),
			selectedChannels: new Set([0]),
			schema: AY_CHIP_SCHEMA
		});
		const result = structuredClone(extracted);
		result.globals[0].noiseValue = 12;

		const updated = UserScriptsService.applyScriptResult(
			pattern,
			result,
			new AYConverter(),
			AY_CHIP_SCHEMA,
			extracted
		);

		expect(updated.patternRows[0].noiseValue).toBe(12);
	});

	it('lets the row alias win when it and globals both change', () => {
		const pattern = new Pattern(0, 4, AY_CHIP_SCHEMA);
		pattern.patternRows[1].envelopeValue = 3;
		const extracted = UserScriptsService.createScriptContext({
			pattern,
			bounds,
			converter: new AYConverter(),
			selectedChannels: new Set([0]),
			schema: AY_CHIP_SCHEMA
		});
		const result = structuredClone(extracted);
		const row = result.rows.find((entry) => entry.rowIndex === 1);
		const globalRow = result.globals.find((entry) => entry.rowIndex === 1);
		row!.envelopeValue = 20;
		globalRow!.envelopeValue = 40;

		const updated = UserScriptsService.applyScriptResult(
			pattern,
			result,
			new AYConverter(),
			AY_CHIP_SCHEMA,
			extracted
		);

		expect(updated.patternRows[1].envelopeValue).toBe(20);
	});

	it('keeps the effect alias and extra effect columns', () => {
		const pattern = new Pattern(0, 4, NES_CHIP_SCHEMA);
		pattern.channels[1].effectColumnCount = 2;
		pattern.channels[1].rows[0].effects = [new Effect(1, 0, 2), new Effect(3, 0, 4)];
		const extracted = UserScriptsService.createScriptContext({
			pattern,
			bounds: { ...bounds, maxRow: 0 },
			converter: new NESConverter(),
			selectedChannels: new Set([1]),
			schema: NES_CHIP_SCHEMA
		});
		const result = structuredClone(extracted);
		result.rows[0].effect = { effect: 8, delay: 1, parameter: 1 };
		result.rows[0].effects[1] = { effect: 9, delay: 0, parameter: 6 };

		const updated = UserScriptsService.applyScriptResult(
			pattern,
			result,
			new NESConverter(),
			NES_CHIP_SCHEMA,
			extracted
		);

		expect(updated.channels[1].rows[0].effects[0]).toMatchObject({
			effect: 8,
			delay: 1,
			parameter: 1
		});
		expect(updated.channels[1].rows[0].effects[1]).toMatchObject({
			effect: 9,
			delay: 0,
			parameter: 6
		});
		expect(updated.channels[1].effectColumnCount).toBe(2);
	});

	it('does not stamp envelope fields onto a NES pattern', () => {
		const pattern = new Pattern(0, 2, NES_CHIP_SCHEMA);
		pattern.channels[0].rows[0].volume = 3;
		const extracted = UserScriptsService.createScriptContext({
			pattern,
			bounds: { ...bounds, maxRow: 0 },
			converter: new NESConverter(),
			selectedChannels: new Set([0]),
			schema: NES_CHIP_SCHEMA
		});
		const result = structuredClone(extracted);
		result.rows[0].volume = 9;
		result.rows[0].envelopeShape = 12;
		result.rows[0].envelopeValue = 400;

		const updated = UserScriptsService.applyScriptResult(
			pattern,
			result,
			new NESConverter(),
			NES_CHIP_SCHEMA,
			extracted
		);

		expect(updated.channels[0].rows[0].volume).toBe(9);
		expect(updated.channels[0].rows[0]).not.toHaveProperty('envelopeShape');
		expect(updated.patternRows[0]).not.toHaveProperty('envelopeValue');
		expect(updated.patternRows[0]).not.toHaveProperty('envelopeEffect');
	});

	it('runs a volume script against NES without inventing AY columns', async () => {
		const pattern = new Pattern(0, 4, NES_CHIP_SCHEMA);
		pattern.channels[0].rows[0].note = new Note(NoteName.C, 4);
		pattern.channels[0].rows[0].table = 2;

		const updated = await UserScriptsService.runScript(
			script('for i, row in ipairs(rows) do row.volume = chip.volumeMax end'),
			{
				pattern,
				bounds,
				converter: new NESConverter(),
				selectedChannels: new Set([0]),
				schema: NES_CHIP_SCHEMA
			}
		);

		expect(updated.channels[0].rows[0].volume).toBe(15);
		expect(updated.channels[0].rows[1].volume).toBe(15);
		expect(updated.channels[0].rows[0].table).toBe(2);
		expect(updated.channels[0].rows[2].volume).toBe(0);
		expect(updated.channels[0].rows[0]).not.toHaveProperty('envelopeShape');
		expect(updated.patternRows[0]).not.toHaveProperty('envelopeValue');
	});

	it('keeps AY envelope fields through Lua and applies either edit path', async () => {
		const pattern = new Pattern(0, 2, AY_CHIP_SCHEMA);
		pattern.channels[0].rows[0].envelopeShape = 10;
		pattern.channels[0].rows[0].table = 4;
		pattern.patternRows[0].envelopeValue = 15;
		pattern.patternRows[0].envelopeEffect = new Effect(2, 1, 3);

		const preserved = await UserScriptsService.runScript(script('-- keep'), {
			pattern,
			bounds: { ...bounds, maxRow: 0 },
			converter: new AYConverter(),
			selectedChannels: new Set([0]),
			schema: AY_CHIP_SCHEMA
		});
		expect(preserved.channels[0].rows[0].envelopeShape).toBe(10);
		expect(preserved.channels[0].rows[0].table).toBe(4);
		expect(preserved.patternRows[0].envelopeValue).toBe(15);
		expect(preserved.patternRows[0].envelopeEffect).toMatchObject({
			effect: 2,
			delay: 1,
			parameter: 3
		});

		const fromRow = await UserScriptsService.runScript(script('rows[1].envelopeValue = 90'), {
			pattern,
			bounds: { ...bounds, maxRow: 0 },
			converter: new AYConverter(),
			selectedChannels: new Set([0]),
			schema: AY_CHIP_SCHEMA
		});
		expect(fromRow.patternRows[0].envelopeValue).toBe(90);

		const fromGlobals = await UserScriptsService.runScript(
			script('globals[1].noiseValue = 6'),
			{
				pattern,
				bounds: { ...bounds, maxRow: 0 },
				converter: new AYConverter(),
				selectedChannels: new Set([0]),
				schema: AY_CHIP_SCHEMA
			}
		);
		expect(fromGlobals.patternRows[0].noiseValue).toBe(6);
	});

	it('fades with the chip volume maximum', async () => {
		const fadeIn = defaultUserScripts.find((entry) => entry.id === 'fade-in');
		const pattern = new Pattern(0, 4, NES_CHIP_SCHEMA);
		const updated = await UserScriptsService.runScript(fadeIn!, {
			pattern,
			bounds: { minRow: 0, maxRow: 3, minCol: 0, maxCol: 10 },
			converter: new NESConverter(),
			selectedChannels: new Set([0]),
			schema: NES_CHIP_SCHEMA
		});

		expect(updated.channels[0].rows.map((row) => row.volume)).toEqual([0, 5, 10, 15]);
	});
});

describe('describeScriptApi', () => {
	it('lists NES channels and skips envelope columns', () => {
		const help = describeScriptApi(NES_CHIP_SCHEMA).flatMap((section) =>
			section.lines.map((line) => line.code)
		);
		expect(help).toContain('chip');
		expect(help).toContain('row.volume');
		expect(help).toContain('row.effects');
		expect(help).not.toContain('row.envelopeShape');
		expect(help).not.toContain('row.envelopeValue');
		const channelLine = describeScriptApi(NES_CHIP_SCHEMA)
			.flatMap((section) => section.lines)
			.find((line) => line.code === 'row.channelIndex');
		expect(channelLine?.text).toContain('Pulse 1');
		expect(channelLine?.text).toContain('DPCM');
	});

	it('lists AY envelope columns and shared globals', () => {
		const codes = describeScriptApi(AY_CHIP_SCHEMA, ['A', 'B', 'C']).flatMap((section) =>
			section.lines.map((line) => line.code)
		);
		expect(codes).toContain('row.envelopeShape');
		expect(codes).toContain('row.envelopeValue');
		expect(codes).toContain('globals[i]');
	});
});
