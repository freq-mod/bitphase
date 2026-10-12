import { LuaFactory } from 'wasmoon';
import { normalizeScriptGlobals, normalizeScriptRow } from './script-model';
import type { ScriptContext, ScriptResult } from './types';

let luaFactory: LuaFactory | null = null;

async function getFactory(): Promise<LuaFactory> {
	if (!luaFactory) {
		luaFactory = new LuaFactory();
	}
	return luaFactory;
}

export class LuaExecutor {
	static async execute(code: string, context: ScriptContext): Promise<ScriptResult> {
		const factory = await getFactory();
		const lua = await factory.createEngine();

		try {
			lua.global.set('rows', context.rows);
			lua.global.set('globals', context.globals);
			lua.global.set('selection', context.selection);
			lua.global.set('patternLength', context.patternLength);
			lua.global.set('channelCount', context.channelCount);
			lua.global.set('chip', context.chip);

			await lua.doString(code);

			const resultRows = lua.global.get('rows');
			const resultGlobals = lua.global.get('globals');
			const rows = Array.isArray(resultRows)
				? resultRows.map((row) => normalizeScriptRow(row))
				: [];

			return { rows, globals: normalizeScriptGlobals(resultGlobals) };
		} finally {
			lua.global.close();
		}
	}
}
