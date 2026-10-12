<script lang="ts">
	import Button from '../Button/Button.svelte';
	import FormField from '../FormField/FormField.svelte';
	import Input from '../Input/Input.svelte';
	import { ModalPanel } from '../ModalPanel';
	import { AlertBanner } from '../AlertBanner';
	import type { ChipSchema } from '../../chips/base/schema';
	import type { UserScript } from '../../services/user-scripts/types';
	import { describeScriptApi } from '../../services/user-scripts/script-model';
	import { settingsStore } from '../../stores/settings.svelte';

	let {
		script,
		isNew = false,
		schema,
		channelLabels,
		resolve,
		dismiss
	} = $props<{
		script?: UserScript;
		isNew?: boolean;
		schema?: ChipSchema;
		channelLabels?: string[];
		resolve?: (script?: UserScript) => void;
		dismiss?: () => void;
	}>();

	let name = $state(script?.name ?? '');
	let description = $state(script?.description ?? '');
	let code = $state(script?.code ?? '');
	let error = $state('');

	function generateId(name: string): string {
		return (
			name
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-|-$/g, '') +
			'-' +
			Date.now()
		);
	}

	function handleSave() {
		if (!name.trim()) {
			error = 'Name is required';
			return;
		}
		if (!code.trim()) {
			error = 'Code is required';
			return;
		}

		const savedScript: UserScript = {
			id: script?.id ?? generateId(name),
			name: name.trim(),
			description: description.trim(),
			code: code
		};

		resolve?.(savedScript);
	}

	function handleCancel() {
		resolve?.(undefined);
	}

	const monoFont = $derived(settingsStore.patternEditorFontFamily || 'monospace');
	const helpSections = $derived(describeScriptApi(schema, channelLabels));
	const secondaryTextareaClass =
		'w-full resize-none rounded border border-[var(--color-app-border)] bg-[var(--color-app-surface-secondary)] px-2 py-1.5 text-xs text-[var(--color-app-text-primary)] placeholder-[var(--color-app-text-tertiary)] focus:border-[var(--color-app-accent)] focus:outline-none';
</script>

<ModalPanel
	title={isNew ? 'New Script' : 'Edit Script'}
	width="w-[700px]"
	bodyClass="min-h-0 flex-1 overflow-y-auto">
	{#snippet children()}
		<div class="flex flex-col gap-3 p-4">
			{#if error}
				<AlertBanner variant="error-inline">
					{error}
				</AlertBanner>
			{/if}

			<FormField id="script-name" label="Name">
				<Input
					id="script-name"
					type="text"
					bind:value={name}
					variant="secondary"
					placeholder="Script name"
					class="w-full py-1.5 text-xs" />
			</FormField>

			<FormField id="script-description" label="Description">
				<Input
					id="script-description"
					type="text"
					bind:value={description}
					variant="secondary"
					placeholder="What does this script do?"
					class="w-full py-1.5 text-xs" />
			</FormField>

			<FormField id="script-code" label="Code">
				<textarea
					id="script-code"
					bind:value={code}
					placeholder="-- Your Lua script here"
					rows="12"
					style="font-family: {monoFont}, monospace;"
					class={secondaryTextareaClass}></textarea>
			</FormField>

			<div
				class="max-h-48 overflow-y-auto rounded bg-[var(--color-app-surface-secondary)] p-3 text-xs text-[var(--color-app-text-tertiary)]">
				<div class="mb-2 font-medium">Lua scripting</div>
				{#each helpSections as section, index (section.title)}
					<div class="mb-2 font-medium" class:mt-3={index > 0}>{section.title}</div>
					{#if section.lines.length > 0}
						<div
							class={section.columns === 2
								? 'grid grid-cols-2 gap-x-4 gap-y-1'
								: 'space-y-1'}>
							{#each section.lines as line (line.code)}
								<div>
									<code class="text-[var(--color-app-text-secondary)]"
										>{line.code}</code>
									- {line.text}
								</div>
							{/each}
						</div>
					{/if}
					{#if section.pre}
						<pre
							style="font-family: {monoFont}, monospace;"
							class="overflow-x-auto rounded bg-[var(--color-app-surface)] p-2 text-[10px] whitespace-pre">{section.pre}</pre>
					{/if}
				{/each}
			</div>
		</div>
	{/snippet}

	{#snippet footer()}
		<Button variant="secondary" onclick={handleCancel}>Cancel</Button>
		<Button variant="primary" onclick={handleSave}>Save</Button>
	{/snippet}
</ModalPanel>
