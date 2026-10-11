import type { Song, Instrument } from './song';

export const DEFAULT_INITIAL_SPEED = 3;

export function normalizeInitialSpeed(value: unknown): number {
	const speed = Number(value);
	if (!Number.isFinite(speed) || speed < 1 || speed > 255) return DEFAULT_INITIAL_SPEED;
	return Math.floor(speed);
}

export function normalizeTempo(value: unknown): number {
	const tempo = Number(value);
	if (!Number.isFinite(tempo) || tempo < 0 || tempo > 255) return 0;
	return Math.floor(tempo);
}

class Project {
	constructor(
		public name: string = '',
		public author: string = '',
		public songs: Song[] = [],
		public loopPointId: number = 0,
		public patternOrder: number[] = [0],
		public tables: Table[] = [new Table(0, [], 0, 'Table 1')],
		public patternOrderColors: Record<number, string> = {},
		public instruments: Instrument[] = [],
		public initialSpeed: number = DEFAULT_INITIAL_SPEED,
		public tempo: number = 0
	) {}
}

class Table {
	id: number;
	rows: number[];
	loop: number;
	name: string;
	additive: boolean;

	constructor(
		id: number,
		rows: number[],
		loop: number,
		name: string = `Table ${(id + 1).toString(36).toUpperCase()}`,
		additive: boolean = false
	) {
		this.id = id;
		this.rows = rows;
		this.loop = loop;
		this.name = name;
		this.additive = additive;
	}
}

export { Project, Table };
