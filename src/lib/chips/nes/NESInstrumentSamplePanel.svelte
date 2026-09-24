<script lang="ts">
	import IconCarbonDocumentImport from '~icons/carbon/document-import';
	import IconCarbonRenew from '~icons/carbon/renew';
	import IconCarbonTrashCan from '~icons/carbon/trash-can';
	import IconCarbonWaveform from '~icons/carbon/waveform';
	import type { Instrument } from '../../models/song';
	import { projectStore } from '../../stores/project.svelte';
	import { EmptyState } from '../../components/EmptyState';
	import type { NESInstrumentFields } from './instrument';
	import {
		NES_DPCM_BANK_BYTES,
		NES_DPCM_MAX_BYTES,
		createDpcmAssignment,
		dpcmNoteLabel,
		dpcmSpaceUsedBytes,
		formatDpcmSpaceUsage,
		encodePcm8ToDpcm,
		normalizeDpcmAssignments,
		padDpcmBytes,
		type NesDpcmAssignment,
		type NesDpcmSample
	} from './dpcm';
	import { decodeAudioSampleFile, InstrumentSampleTooLargeError } from '../../utils/audio-sample-decode';

	let {
		instrument,
		asHex = false,
		onInstrumentChange
	}: {
		instrument: Instrument & Partial<NESInstrumentFields>;
		asHex?: boolean;
		onInstrumentChange: (instrument: Instrument & Partial<NESInstrumentFields>) => void;
	} = $props();

	let fileInputEl: HTMLInputElement | null = $state(null);
	let isLoading = $state(false);
	let loadError = $state<string | null>(null);
	let octave = $state(1);

	const samples = $derived(instrument.dpcmSamples ?? []);
	const usedBytes = $derived(dpcmSpaceUsedBytes(projectStore.instruments, instrument));
	const spaceUsage = $derived(formatDpcmSpaceUsage(usedBytes));
	const assignments = $derived(
		normalizeDpcmAssignments(instrument.dpcmAssignments, samples.length)
	);
	const octaveNotes = $derived.by(() => {
		const start = (octave - 1) * 12;
		return Array.from({ length: 12 }, (_, index) => start + index);
	});

	function commit(
		nextSamples: NesDpcmSample[],
		nextAssignments: (NesDpcmAssignment | null)[]
	): void {
		onInstrumentChange({
			...instrument,
			dpcmSamples: nextSamples,
			dpcmAssignments: normalizeDpcmAssignments(nextAssignments, nextSamples.length)
		});
	}

	function updateAssignment(noteIndex: number, patch: Partial<NesDpcmAssignment> | null): void {
		const next = assignments.map((entry) => (entry ? { ...entry } : null));
		if (patch == null) {
			next[noteIndex] = null;
		} else {
			const current = next[noteIndex] ?? createDpcmAssignment(patch.sampleIndex ?? 0);
			next[noteIndex] = { ...current, ...patch };
		}
		commit(samples.map((sample) => ({ ...sample, data: [...sample.data] })), next);
	}

	function removeSample(sampleIndex: number): void {
		const nextSamples = samples.filter((_, index) => index !== sampleIndex);
		const next = assignments.map((entry) => {
			if (!entry) return null;
			if (entry.sampleIndex === sampleIndex) return null;
			if (entry.sampleIndex > sampleIndex) {
				return { ...entry, sampleIndex: entry.sampleIndex - 1 };
			}
			return { ...entry };
		});
		commit(nextSamples, next);
	}

	function openFilePicker(): void {
		fileInputEl?.click();
	}

	async function handleFileSelect(event: Event): Promise<void> {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		isLoading = true;
		loadError = null;
		try {
			const bytes = await readDpcmFile(file);
			if (bytes.length === 0 || bytes.length > NES_DPCM_MAX_BYTES) {
				loadError = `DPCM samples must be 1–${NES_DPCM_MAX_BYTES.toLocaleString()} bytes, the size $4013 can play.`;
				return;
			}
			const sample: NesDpcmSample = {
				name: file.name.replace(/\.[^.]+$/, '') || 'Sample',
				data: padDpcmBytes(Array.from(bytes))
			};
			commit([...samples, sample], assignments);
		} catch (error) {
			loadError =
				error instanceof InstrumentSampleTooLargeError
					? error.message
					: 'Could not read this sample.';
		} finally {
			isLoading = false;
		}
	}

	async function readDpcmFile(file: File): Promise<Uint8Array> {
		if (file.name.toLowerCase().endsWith('.dmc')) {
			return new Uint8Array(await file.arrayBuffer());
		}
		const decoded = await decodeAudioSampleFile(file);
		return Uint8Array.from(encodePcm8ToDpcm(decoded.data));
	}
</script>

<input
	bind:this={fileInputEl}
	type="file"
	accept=".dmc,.wav,audio/*"
	class="hidden"
	onchange={handleFileSelect} />

<div class="box-border flex w-full min-w-0 flex-col gap-3 py-1">
	<div class="flex flex-wrap items-center gap-2">
		<button
			type="button"
			class="flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--color-app-border)] bg-[var(--color-app-surface-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--color-app-text-secondary)] transition-colors hover:border-[var(--color-app-primary)]/40 hover:bg-[var(--color-app-surface-hover)] hover:text-[var(--color-app-text-primary)] disabled:pointer-events-none disabled:opacity-60"
			disabled={isLoading}
			onclick={openFilePicker}>
			{#if isLoading}
				<IconCarbonRenew class="h-3.5 w-3.5 shrink-0 animate-spin" />
				Loading…
			{:else}
				<IconCarbonDocumentImport class="h-3.5 w-3.5 shrink-0" />
				Load sample
			{/if}
		</button>
		<label class="flex items-center gap-2 text-xs text-[var(--color-app-text-secondary)]">
			Octave
			<select
				class="rounded-md border border-[var(--color-app-border)] bg-[var(--color-app-surface-secondary)] px-2 py-1 font-mono text-xs text-[var(--color-app-text-primary)]"
				value={octave}
				onchange={(event) => {
					octave = Number((event.currentTarget as HTMLSelectElement).value);
				}}>
				{#each Array.from({ length: 8 }, (_, index) => index + 1) as octaveNumber (octaveNumber)}
					<option value={octaveNumber}>{octaveNumber}</option>
				{/each}
			</select>
		</label>
	</div>

	{#if loadError}
		<p class="text-xs text-[var(--color-pattern-note-off)]">{loadError}</p>
	{/if}

	{#if samples.length === 0}
		<EmptyState
			icon={IconCarbonWaveform}
			message="Load a DPCM sample, then bind it to keys"
			hint=".dmc bytes, or a short 8-bit WAV converted to 1-bit deltas. Hardware plays at most {NES_DPCM_MAX_BYTES.toLocaleString()} bytes."
			class="min-w-0" />
	{:else}
		<ul class="flex flex-col gap-1">
			{#each samples as sample, sampleIndex (sampleIndex)}
				<li
					class="flex items-center justify-between gap-2 rounded-md border border-[var(--color-app-border)] bg-[var(--color-app-surface-secondary)]/80 px-3 py-1.5">
					<span class="truncate font-mono text-xs text-[var(--color-app-text-primary)]">
						{sampleIndex.toString(16).toUpperCase().padStart(2, '0')} {sample.name}
						<span class="text-[var(--color-app-text-muted)]">({sample.data.length} bytes)</span>
					</span>
					<button
						type="button"
						class="cursor-pointer border-0 bg-transparent p-1 text-[var(--color-app-text-tertiary)] hover:text-[var(--color-pattern-note-off)]"
						onclick={() => removeSample(sampleIndex)}
						aria-label="Remove sample">
						<IconCarbonTrashCan class="h-3.5 w-3.5" />
					</button>
				</li>
			{/each}
		</ul>
		<p
			class={[
				'text-[11px]',
				usedBytes > NES_DPCM_BANK_BYTES
					? 'text-[var(--color-pattern-note-off)]'
					: 'text-[var(--color-app-text-muted)]'
			]}>
			{spaceUsage}
		</p>

		<div class="min-w-0 text-xs">
			<div
				class="grid grid-cols-[minmax(0,2.75rem)_minmax(0,1fr)_minmax(0,3.25rem)_minmax(0,2.25rem)_minmax(0,3.25rem)] items-center gap-x-1.5 px-1 py-1 text-[var(--color-app-text-tertiary)]">
				<span>Key</span>
				<span>Sample</span>
				<span>Pitch</span>
				<span>Loop</span>
				<span>Delta</span>
			</div>
			{#each octaveNotes as noteIndex (noteIndex)}
				{@const assignment = assignments[noteIndex]}
				<div
					class="grid grid-cols-[minmax(0,2.75rem)_minmax(0,1fr)_minmax(0,3.25rem)_minmax(0,2.25rem)_minmax(0,3.25rem)] items-center gap-x-1.5 border-t border-[var(--color-app-border)] px-1 py-1">
					<span class="font-mono text-[var(--color-app-text-primary)]">{dpcmNoteLabel(noteIndex)}</span>
					<div class="min-w-0 overflow-hidden">
					<select
						class="w-full min-w-0 rounded-md border border-[var(--color-app-border)] bg-[var(--color-app-surface-secondary)] px-1.5 py-1 font-mono text-xs"
						value={assignment ? String(assignment.sampleIndex) : ''}
						onchange={(event) => {
							const value = (event.currentTarget as HTMLSelectElement).value;
							if (value === '') {
								updateAssignment(noteIndex, null);
								return;
							}
							updateAssignment(noteIndex, { sampleIndex: Number(value) });
						}}>
						<option value="">—</option>
						{#each samples as sample, sampleIndex (sampleIndex)}
							<option value={String(sampleIndex)}>
								{sampleIndex.toString(16).toUpperCase().padStart(2, '0')} {sample.name}
							</option>
						{/each}
					</select>
					</div>
					<div class="min-w-0 overflow-hidden">
					<select
						class="w-full min-w-0 rounded-md border border-[var(--color-app-border)] bg-[var(--color-app-surface-secondary)] px-1 py-1 font-mono text-xs disabled:opacity-40"
						disabled={!assignment}
						value={assignment?.pitch ?? 15}
						onchange={(event) => {
							updateAssignment(noteIndex, {
								pitch: Number((event.currentTarget as HTMLSelectElement).value)
							});
						}}>
						{#each Array.from({ length: 16 }, (_, pitch) => pitch) as pitch (pitch)}
							<option value={pitch}>
								{asHex ? pitch.toString(16).toUpperCase() : String(pitch)}
							</option>
						{/each}
					</select>
					</div>
					<input
						type="checkbox"
						class="justify-self-start"
						disabled={!assignment}
						checked={assignment?.loop ?? false}
						onchange={(event) => {
							updateAssignment(noteIndex, {
								loop: (event.currentTarget as HTMLInputElement).checked
							});
						}} />
					<div class="min-w-0 overflow-hidden">
					<select
						class="w-full min-w-0 rounded-md border border-[var(--color-app-border)] bg-[var(--color-app-surface-secondary)] px-1 py-1 font-mono text-xs disabled:opacity-40"
						disabled={!assignment}
						value={assignment?.delta == null ? '' : String(assignment.delta)}
						onchange={(event) => {
							const value = (event.currentTarget as HTMLSelectElement).value;
							updateAssignment(noteIndex, {
								delta: value === '' ? null : Number(value)
							});
						}}>
						<option value="">Off</option>
						{#each Array.from({ length: 128 }, (_, delta) => delta) as delta (delta)}
							<option value={delta}>
								{asHex ? delta.toString(16).toUpperCase().padStart(2, '0') : String(delta)}
							</option>
						{/each}
					</select>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
