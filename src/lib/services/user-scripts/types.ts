export interface ScriptEffect {
	effect: number;
	delay: number;
	parameter: number;
	tableIndex?: number;
}

export interface ScriptRowData {
	rowIndex: number;
	channelIndex: number;
	note: string;
	volume: number;
	instrument: number;
	table: number;
	effect: ScriptEffect | null;
	effects: (ScriptEffect | null)[];
	[field: string]: unknown;
}

export interface ScriptGlobalRow {
	rowIndex: number;
	[field: string]: unknown;
}

export interface ScriptChipInfo {
	type: string;
	channels: string[];
	volumeMax: number;
	fields: string[];
	globals: string[];
}

export interface ScriptContext {
	rows: ScriptRowData[];
	globals: ScriptGlobalRow[];
	selection: {
		minRow: number;
		maxRow: number;
		minCol: number;
		maxCol: number;
	};
	patternLength: number;
	channelCount: number;
	chip: ScriptChipInfo;
}

export interface ScriptResult {
	rows: ScriptRowData[];
	globals: ScriptGlobalRow[];
}

export type UserScriptFunction = (context: ScriptContext) => ScriptResult;

export interface UserScript {
	id: string;
	name: string;
	description: string;
	code: string;
}
