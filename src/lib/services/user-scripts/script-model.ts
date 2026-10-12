import type { ChipField, ChipSchema } from '../../chips/base/schema';
import { isEffectFieldKey, isChannelEffectFieldKey } from '../../chips/base/channel-effect-columns';
import { toNumber } from '../../utils/type-guards';
import type { ScriptChipInfo, ScriptEffect, ScriptGlobalRow, ScriptRowData } from './types';

export interface ScriptApiHelpLine {
	code: string;
	text: string;
}

export interface ScriptApiHelpSection {
	title: string;
	columns?: 1 | 2;
	lines: ScriptApiHelpLine[];
	pre?: string;
}

const RESERVED_ROW_KEYS = new Set([
	'rowIndex',
	'channelIndex',
	'note',
	'volume',
	'instrument',
	'table',
	'table_',
	'effect',
	'effects'
]);

export function maxForField(field: ChipField): number {
	if (field.type === 'hex') return 16 ** field.length - 1;
	if (field.type === 'dec') return 10 ** field.length - 1;
	return 0;
}

export function volumeMaxForSchema(schema: ChipSchema): number {
	const volume = schema.fields.volume;
	if (!volume) return 15;
	const max = maxForField(volume);
	return max > 0 ? max : 15;
}

export function buildChipInfo(schema: ChipSchema, channelLabels: string[]): ScriptChipInfo {
	return {
		type: schema.chipType,
		channels: channelLabels,
		volumeMax: volumeMaxForSchema(schema),
		fields: Object.keys(schema.fields).filter((key) => !isChannelEffectFieldKey(key)),
		globals: Object.keys(schema.globalFields ?? {})
	};
}

export function normalizeScriptEffect(value: unknown): ScriptEffect | null {
	if (!value || typeof value !== 'object') return null;
	const record = value as Record<string, unknown>;
	if (!('effect' in record) && !('delay' in record) && !('parameter' in record)) return null;
	const effect: ScriptEffect = {
		effect: toNumber(record.effect),
		delay: toNumber(record.delay),
		parameter: toNumber(record.parameter)
	};
	if (record.tableIndex !== undefined && record.tableIndex !== null) {
		effect.tableIndex = toNumber(record.tableIndex);
	}
	return effect;
}

export function scriptValuesEqual(left: unknown, right: unknown): boolean {
	if (Object.is(left, right)) return true;
	const leftEffect = normalizeScriptEffect(left);
	const rightEffect = normalizeScriptEffect(right);
	if (left == null && right == null) return true;
	if (!leftEffect && !rightEffect) return false;
	return effectSignature(leftEffect) === effectSignature(rightEffect);
}

function effectSignature(effect: ScriptEffect | null): string {
	if (!effect) return '';
	return `${effect.effect}:${effect.delay}:${effect.parameter}:${effect.tableIndex ?? ''}`;
}

export function coerceFieldValue(value: unknown, field: ChipField, key: string): unknown {
	if (isEffectFieldKey(key)) return normalizeScriptEffect(value);
	if (field.type === 'note') return typeof value === 'string' ? value : '---';
	if (field.type === 'text') return typeof value === 'string' ? value : '';
	return toNumber(value);
}

export function normalizeScriptRow(row: Record<string, unknown>): ScriptRowData {
	const effects = normalizeEffectList(row.effects);
	const effect = normalizeScriptEffect(row.effect);
	const normalized: ScriptRowData = {
		rowIndex: toNumber(row.rowIndex),
		channelIndex: toNumber(row.channelIndex),
		note: typeof row.note === 'string' ? row.note : '---',
		volume: toNumber(row.volume),
		instrument: toNumber(row.instrument),
		table: toNumber(row.table_ ?? row.table),
		effect,
		effects: effects ?? [effect]
	};

	for (const [key, value] of Object.entries(row)) {
		if (RESERVED_ROW_KEYS.has(key)) continue;
		normalized[key] = isEffectFieldKey(key) ? normalizeScriptEffect(value) : value;
	}

	return normalized;
}

export function normalizeScriptGlobals(value: unknown): ScriptGlobalRow[] {
	if (!Array.isArray(value)) return [];
	return value.map((entry) => {
		const record = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
		const globalRow: ScriptGlobalRow = { rowIndex: toNumber(record.rowIndex) };
		for (const [key, fieldValue] of Object.entries(record)) {
			if (key === 'rowIndex') continue;
			globalRow[key] = isEffectFieldKey(key) ? normalizeScriptEffect(fieldValue) : fieldValue;
		}
		return globalRow;
	});
}

function normalizeEffectList(value: unknown): (ScriptEffect | null)[] | null {
	if (Array.isArray(value)) return value.map((entry) => normalizeScriptEffect(entry));
	if (!value || typeof value !== 'object') return null;
	const record = value as Record<string, unknown>;
	const indexes = Object.keys(record)
		.filter((key) => /^\d+$/.test(key))
		.map((key) => Number(key))
		.sort((left, right) => left - right);
	if (indexes.length === 0) return [];
	const base = indexes[0] === 1 ? 1 : 0;
	const effects: (ScriptEffect | null)[] = [];
	for (const index of indexes) {
		effects[index - base] = normalizeScriptEffect(record[String(index)]);
	}
	return effects;
}

function describeField(key: string, field: ChipField, schema: ChipSchema): string {
	if (key === 'note') return '"C-4", "---", "OFF", "==="';
	if (key === 'volume') return describeVolume(field, volumeMaxForSchema(schema));
	if (key === 'instrument' || key === 'table') return 'number';
	if (isEffectFieldKey(key)) return 'nil or effect table';
	const max = maxForField(field);
	if (max > 0) return `0-${max}`;
	return field.type;
}

function describeVolume(field: ChipField, max: number): string {
	if (field.allowZeroValue) {
		return `empty is 0 (.), mute is -1 (0), levels 1-${max}`;
	}
	return `0-${max}`;
}

function channelIndexText(labels: string[]): string {
	if (labels.length === 0) return '0-based channel index';
	const last = labels.length - 1;
	return `0-${last} (${labels.join(', ')})`;
}

export function describeScriptApi(
	schema?: ChipSchema,
	channelLabels?: string[]
): ScriptApiHelpSection[] {
	const labels = channelLabels ?? schema?.channelLabels ?? [];
	const sections: ScriptApiHelpSection[] = [
		{
			title: 'Available variables',
			lines: [
				{ code: 'rows', text: 'channel cells in the selection' },
				{
					code: 'globals',
					text: 'one entry per pattern row. Shared columns live here. Empty when the chip has none'
				},
				{ code: 'selection', text: 'minRow, maxRow, minCol, maxCol' },
				{ code: 'patternLength', text: 'total rows in the pattern' },
				{ code: 'channelCount', text: 'number of channels' },
				{ code: 'chip', text: 'type, channels, volumeMax, fields, globals' }
			]
		}
	];

	if (!schema) return sections;

	const rowLines: ScriptApiHelpLine[] = [
		{ code: 'row.rowIndex', text: 'position (0-based)' },
		{ code: 'row.channelIndex', text: channelIndexText(labels) }
	];
	for (const [key, field] of Object.entries(schema.fields)) {
		if (isChannelEffectFieldKey(key)) continue;
		rowLines.push({ code: `row.${key}`, text: describeField(key, field, schema) });
	}
	if (schema.fields.effect) {
		rowLines.push({ code: 'row.effect', text: 'first effect column, or nil' });
		rowLines.push({
			code: 'row.effects',
			text: 'every effect column. Lua index 1 is the first column'
		});
	}

	sections.push({
		title: 'Row properties',
		columns: 2,
		lines: rowLines
	});

	if (schema.fields.effect) {
		sections.push({
			title: 'Effect table (if not nil)',
			lines: [
				{ code: 'effect.effect', text: 'command' },
				{ code: 'effect.delay', text: 'delay' },
				{ code: 'effect.parameter', text: 'parameter' }
			]
		});
	}

	const globalFields = schema.globalFields ?? {};
	const globalKeys = Object.keys(globalFields);
	if (globalKeys.length > 0) {
		sections.push({
			title: 'Shared pattern-row columns',
			lines: [
				{
					code: 'globals[i]',
					text: 'edit these, or the same names on row. The row value wins if both change'
				},
				...globalKeys.map((key) => ({
					code: `row.${key}`,
					text: describeField(key, globalFields[key]!, schema)
				}))
			]
		});
	}

	sections.push({
		title: 'Example (Fade In)',
		lines: [],
		pre: `local minRow = selection.minRow
local maxRow = selection.maxRow
local totalRows = maxRow - minRow + 1

for i, row in ipairs(rows) do
    local relativeRow = row.rowIndex - minRow
    local progress = 1
    if totalRows > 1 then
        progress = relativeRow / (totalRows - 1)
    end
    row.volume = math.floor(progress * chip.volumeMax + 0.5)
end`
	});

	return sections;
}
