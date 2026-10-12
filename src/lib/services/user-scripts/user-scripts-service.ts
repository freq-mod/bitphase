import type { Pattern } from '../../models/song';
import type { ChipSchema } from '../../chips/base/schema';
import type { GenericPattern, GenericRow } from '../../models/song/generic';
import type { SelectionBounds } from '../pattern/selection-bounds-service';
import type { PatternConverter } from '../../chips/base/adapter';
import {
	assignEffectsToGenericRow,
	clampChannelEffectColumnCount,
	effectToGenericValue,
	genericValueToEffect,
	getChannelEffectFieldKey,
	getEffectColumnCountFromGenericChannel,
	isChannelEffectFieldKey,
	isEffectFieldKey
} from '../../chips/base/channel-effect-columns';
import { toNumber } from '../../utils/type-guards';
import { LuaExecutor } from './lua-executor';
import {
	buildChipInfo,
	coerceFieldValue,
	normalizeScriptEffect,
	scriptValuesEqual
} from './script-model';
import type {
	ScriptContext,
	ScriptEffect,
	ScriptGlobalRow,
	ScriptResult,
	ScriptRowData,
	UserScript
} from './types';

export interface ScriptExtractionContext {
	pattern: Pattern;
	bounds: SelectionBounds;
	converter: PatternConverter;
	selectedChannels: Set<number>;
	schema: ChipSchema;
}

export class UserScriptsService {
	static extractSelectionData(context: ScriptExtractionContext): {
		rows: ScriptRowData[];
		globals: ScriptGlobalRow[];
	} {
		const { pattern, bounds, converter, selectedChannels, schema } = context;
		const genericPattern = converter.toGeneric(pattern);
		const rows: ScriptRowData[] = [];
		const globals: ScriptGlobalRow[] = [];
		const seenGlobalRows = new Set<number>();

		for (let rowIndex = bounds.minRow; rowIndex <= bounds.maxRow; rowIndex++) {
			const globalRow = this.readGlobalRow(schema, genericPattern, rowIndex);
			let emittedGlobal = false;

			for (
				let channelIndex = 0;
				channelIndex < genericPattern.channels.length;
				channelIndex++
			) {
				if (!selectedChannels.has(channelIndex)) continue;

				const channel = genericPattern.channels[channelIndex];
				const genericRow = channel?.rows[rowIndex];
				if (!genericRow) continue;

				rows.push(
					this.readChannelRow(
						schema,
						genericRow,
						channel,
						rowIndex,
						channelIndex,
						globalRow
					)
				);
				if (globalRow && !emittedGlobal && !seenGlobalRows.has(rowIndex)) {
					globals.push(globalRow);
					seenGlobalRows.add(rowIndex);
					emittedGlobal = true;
				}
			}
		}

		return { rows, globals };
	}

	static createScriptContext(context: ScriptExtractionContext): ScriptContext {
		const { pattern, bounds, schema } = context;
		const { rows, globals } = this.extractSelectionData(context);

		return {
			rows,
			globals,
			selection: {
				minRow: bounds.minRow,
				maxRow: bounds.maxRow,
				minCol: bounds.minCol,
				maxCol: bounds.maxCol
			},
			patternLength: pattern.length,
			channelCount: pattern.channels.length,
			chip: buildChipInfo(
				schema,
				pattern.channels.map((channel) => channel.label)
			)
		};
	}

	static applyScriptResult(
		pattern: Pattern,
		result: ScriptResult,
		converter: PatternConverter,
		schema: ChipSchema,
		original?: ScriptContext
	): Pattern {
		const genericPattern = converter.toGeneric(pattern);
		this.applyChannelRows(genericPattern, result, schema, original);
		this.applyGlobalRows(genericPattern, result, schema, original);
		return converter.fromGeneric(genericPattern);
	}

	static async executeScript(script: UserScript, context: ScriptContext): Promise<ScriptResult> {
		return LuaExecutor.execute(script.code, context);
	}

	static async runScript(script: UserScript, context: ScriptExtractionContext): Promise<Pattern> {
		const scriptContext = this.createScriptContext(context);
		const original = structuredClone(scriptContext);
		const result = await this.executeScript(script, scriptContext);
		return this.applyScriptResult(
			context.pattern,
			result,
			context.converter,
			context.schema,
			original
		);
	}

	private static readGlobalRow(
		schema: ChipSchema,
		genericPattern: GenericPattern,
		rowIndex: number
	): ScriptGlobalRow | null {
		const globalFields = schema.globalFields;
		if (!globalFields || Object.keys(globalFields).length === 0) return null;
		const patternRow = genericPattern.patternRows[rowIndex];
		if (!patternRow) return null;

		const globalRow: ScriptGlobalRow = { rowIndex };
		for (const [key, field] of Object.entries(globalFields)) {
			globalRow[key] = coerceFieldValue(patternRow[key], field, key);
		}
		return globalRow;
	}

	private static readChannelRow(
		schema: ChipSchema,
		genericRow: GenericRow,
		channel: GenericPattern['channels'][number],
		rowIndex: number,
		channelIndex: number,
		globalRow: ScriptGlobalRow | null
	): ScriptRowData {
		const effectCount = getEffectColumnCountFromGenericChannel(channel);
		const effects: (ScriptEffect | null)[] = [];
		for (let index = 0; index < effectCount; index++) {
			effects.push(normalizeScriptEffect(genericRow[getChannelEffectFieldKey(index)]));
		}

		const scriptRow: ScriptRowData = {
			rowIndex,
			channelIndex,
			note: '---',
			volume: 0,
			instrument: 0,
			table: 0,
			effect: effects[0] ?? null,
			effects
		};

		for (const [key, field] of Object.entries(schema.fields)) {
			if (isChannelEffectFieldKey(key)) continue;
			const value = coerceFieldValue(genericRow[key], field, key);
			if (key === 'note') scriptRow.note = typeof value === 'string' ? value : '---';
			else if (key === 'volume') scriptRow.volume = toNumber(value);
			else if (key === 'instrument') scriptRow.instrument = toNumber(value);
			else if (key === 'table') scriptRow.table = toNumber(value);
			else scriptRow[key] = value;
		}

		if (globalRow) {
			for (const [key, value] of Object.entries(globalRow)) {
				if (key === 'rowIndex') continue;
				scriptRow[key] =
					typeof value === 'object' && value !== null ? structuredClone(value) : value;
			}
		}

		return scriptRow;
	}

	private static applyChannelRows(
		genericPattern: GenericPattern,
		result: ScriptResult,
		schema: ChipSchema,
		original?: ScriptContext
	): void {
		for (const rowData of result.rows) {
			const channel = genericPattern.channels[rowData.channelIndex];
			const genericRow = channel?.rows[rowData.rowIndex];
			if (!channel || !genericRow) continue;

			for (const [key, field] of Object.entries(schema.fields)) {
				if (isChannelEffectFieldKey(key)) continue;
				if (key === 'note') {
					genericRow.note = typeof rowData.note === 'string' ? rowData.note : '---';
					continue;
				}
				if (key === 'volume') {
					genericRow.volume = toNumber(rowData.volume);
					continue;
				}
				if (key === 'instrument') {
					genericRow.instrument = toNumber(rowData.instrument);
					continue;
				}
				if (key === 'table') {
					genericRow.table = toNumber(rowData.table);
					continue;
				}
				if (!(key in rowData)) continue;
				genericRow[key] = coerceFieldValue(rowData[key], field, key);
			}

			const originalRow = original?.rows.find(
				(candidate) =>
					candidate.rowIndex === rowData.rowIndex &&
					candidate.channelIndex === rowData.channelIndex
			);
			const resolved = this.resolveEffects(rowData, originalRow);
			const existingCount = getEffectColumnCountFromGenericChannel(channel);
			const count = clampChannelEffectColumnCount(Math.max(existingCount, resolved.length));
			const merged: (ScriptEffect | null)[] = [];
			for (let index = 0; index < count; index++) {
				if (index < resolved.length) merged.push(resolved[index] ?? null);
				else merged.push(normalizeScriptEffect(originalRow?.effects?.[index] ?? null));
			}
			channel.effectColumnCount = count;
			assignEffectsToGenericRow(
				genericRow,
				merged.map((effect) => genericValueToEffect(effect)),
				count
			);
		}
	}

	private static applyGlobalRows(
		genericPattern: GenericPattern,
		result: ScriptResult,
		schema: ChipSchema,
		original?: ScriptContext
	): void {
		const globalFields = schema.globalFields;
		if (!globalFields || Object.keys(globalFields).length === 0) return;

		const rowIndexes = new Set<number>();
		for (const row of result.rows) rowIndexes.add(row.rowIndex);
		for (const globalRow of result.globals) rowIndexes.add(globalRow.rowIndex);

		for (const rowIndex of rowIndexes) {
			const patternRow = genericPattern.patternRows[rowIndex];
			if (!patternRow) continue;
			for (const [key, field] of Object.entries(globalFields)) {
				const value = this.resolveGlobalField(key, rowIndex, result, original);
				if (value === undefined) continue;
				const coerced = coerceFieldValue(value, field, key);
				patternRow[key] = isEffectFieldKey(key)
					? effectToGenericValue(genericValueToEffect(coerced))
					: coerced;
			}
		}
	}

	private static resolveGlobalField(
		key: string,
		rowIndex: number,
		result: ScriptResult,
		original?: ScriptContext
	): unknown {
		const resultRows = result.rows.filter((row) => row.rowIndex === rowIndex);
		const originalRows = original?.rows.filter((row) => row.rowIndex === rowIndex) ?? [];
		const resultGlobal = result.globals.find((row) => row.rowIndex === rowIndex);
		const originalGlobal = original?.globals.find((row) => row.rowIndex === rowIndex);

		if (original) {
			let changedValue: unknown;
			let changed = false;
			for (const row of resultRows) {
				if (!(key in row)) continue;
				const originalRow = originalRows.find(
					(candidate) => candidate.channelIndex === row.channelIndex
				);
				const originalValue =
					originalRow && key in originalRow ? originalRow[key] : undefined;
				if (!scriptValuesEqual(row[key], originalValue)) {
					changed = true;
					changedValue = row[key];
				}
			}
			if (changed) return changedValue;

			if (resultGlobal && key in resultGlobal) return resultGlobal[key];
			const first = resultRows.find((row) => key in row);
			return first ? first[key] : undefined;
		}

		if (resultGlobal && key in resultGlobal) return resultGlobal[key];
		for (let index = resultRows.length - 1; index >= 0; index--) {
			const row = resultRows[index];
			if (row && key in row) return row[key];
		}
		return undefined;
	}

	private static resolveEffects(
		row: ScriptRowData,
		original?: ScriptRowData
	): (ScriptEffect | null)[] {
		const fromArray = Array.isArray(row.effects)
			? row.effects.map((entry) => normalizeScriptEffect(entry))
			: [];
		const alias = normalizeScriptEffect(row.effect);
		if (!original) {
			if (fromArray.length === 0) return [alias];
			const next = [...fromArray];
			if (!scriptValuesEqual(alias, next[0] ?? null)) next[0] = alias;
			return next;
		}

		const originalAlias = normalizeScriptEffect(original.effect);
		const originalArray = (original.effects ?? []).map((entry) => normalizeScriptEffect(entry));
		if (fromArray.length === 0) return [alias];
		const next = [...fromArray];
		const aliasChanged = !scriptValuesEqual(alias, originalAlias);
		const slot0Changed = !scriptValuesEqual(next[0] ?? null, originalArray[0] ?? null);
		if (aliasChanged && (!slot0Changed || !scriptValuesEqual(alias, next[0] ?? null))) {
			next[0] = alias;
		}
		return next;
	}
}
