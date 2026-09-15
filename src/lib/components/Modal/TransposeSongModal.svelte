<script lang="ts">
	import Button from '../Button/Button.svelte';
	import FormField from '../FormField/FormField.svelte';
	import Input from '../Input/Input.svelte';
	import { ModalPanel } from '../ModalPanel';

	const MIN_SEMITONES = -96;
	const MAX_SEMITONES = 96;

	let { resolve }: { resolve?: (value?: number) => void; dismiss?: (error?: unknown) => void } =
		$props();

	const uid = $props.id();
	let semitones = $state(0);

	const parsedSemitones = $derived.by(() => {
		const value = Number(semitones);
		if (!Number.isFinite(value)) return null;
		const truncated = Math.trunc(value);
		if (truncated === 0) return null;
		return Math.max(MIN_SEMITONES, Math.min(MAX_SEMITONES, truncated));
	});

	function handleConfirm() {
		if (parsedSemitones === null) return;
		resolve?.(parsedSemitones);
	}

	function handleCancel() {
		resolve?.(undefined);
	}

	function handleInputKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			handleConfirm();
		}
	}
</script>

<ModalPanel title="Transpose Song" width="w-96" compact>
	<FormField
		id="{uid}-semitones"
		label="Semitones"
		description="Transposes every note in the current song.">
		<Input
			id="{uid}-semitones"
			type="number"
			min={MIN_SEMITONES}
			max={MAX_SEMITONES}
			step={1}
			bind:value={semitones}
			class="h-6 w-20 text-xs"
			autofocus
			onkeydown={handleInputKeyDown} />
	</FormField>

	{#snippet footer()}
		<Button variant="secondary" onclick={handleCancel}>Cancel</Button>
		<Button variant="primary" disabled={parsedSemitones === null} onclick={handleConfirm}
			>Transpose</Button>
	{/snippet}
</ModalPanel>
