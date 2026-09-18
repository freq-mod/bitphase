<script lang="ts">
	import IconCarbonCheckmark from '~icons/carbon/checkmark';
	import IconCarbonClose from '~icons/carbon/close';
	import IconCarbonEdit from '~icons/carbon/edit';
	import IconCarbonChartWinLoss from '~icons/carbon/chart-win-loss';
	import IconCarbonSettingsAdjust from '~icons/carbon/settings-adjust';
	import IconCarbonArrowUp from '~icons/carbon/arrow-up';
	import IconCarbonArrowDown from '~icons/carbon/arrow-down';
	import IconCarbonChevronUp from '~icons/carbon/chevron-up';
	import IconCarbonChevronDown from '~icons/carbon/chevron-down';
	import { fly } from 'svelte/transition';
	import {
		instrumentMacroAccentColor,
		type InstrumentMacroField,
		type InstrumentMacroValue
	} from '../../chips/base/instrument-macros';
	import {
		instrumentMacroEnumIsActive,
		instrumentMacroEnumOption,
		instrumentMacroEnumLabel,
		instrumentMacroUsesBarChart,
		integerMacroBarStyle,
		macroBarOverflowDirection,
		macroBarZeroNormalized,
		macroIconClass,
		MACRO_BAR_INSET,
		defaultMacroBarViewMin
	} from './instrument-macro-ui';

	let {
		field,
		values,
		stepWidthPx,
		rowHeight,
		viewMin = defaultMacroBarViewMin(field),
		isExpanded = false,
		onPaintStart,
		onStepClick,
		isStepEnabled
	}: {
		field: InstrumentMacroField;
		values: InstrumentMacroValue[];
		stepWidthPx: number;
		rowHeight: number;
		viewMin?: number;
		isExpanded?: boolean;
		onPaintStart: (index: number, event: PointerEvent, fromY: boolean) => void;
		onStepClick?: (fieldId: string, index: number) => void;
		isStepEnabled?: (fieldId: string, index: number) => boolean;
	} = $props();

	const accent = $derived(instrumentMacroAccentColor(field.accent));
	const gateIconClass = $derived(macroIconClass(isExpanded));
	const sequenceWidth = $derived(stepWidthPx * values.length);
	const usesBarChart = $derived(instrumentMacroUsesBarChart(field));
	const zeroNorm = $derived(macroBarZeroNormalized(field, viewMin));
	const plotId = $derived(`macro-bar-${field.id}`);
</script>

<div
	id={plotId}
	class="relative flex shrink-0"
	style="width: {sequenceWidth}px; height: {rowHeight}px"
	data-shared-row={field.id}>
	{#if usesBarChart && zeroNorm !== null}
		<div
			class="pointer-events-none absolute right-0 left-0 z-[1] h-px bg-[var(--color-app-text-muted)]/35"
			style="bottom: calc({MACRO_BAR_INSET}px + (100% - {MACRO_BAR_INSET * 2}px) * {zeroNorm})">
		</div>
	{/if}
	{#each values as value, index (index)}
		{#if usesBarChart}
			{@const overflow = macroBarOverflowDirection(field, value, viewMin)}
			<button
				type="button"
				class="relative cursor-crosshair border-0 border-r border-[var(--color-app-border)]/60 bg-[var(--color-app-surface-secondary)] p-0 last:border-r-0"
				style="width: {stepWidthPx}px; height: {rowHeight}px"
				aria-label={field.kind === 'enum'
					? `${field.label} ${instrumentMacroEnumLabel(field, value)} step ${index}`
					: `${field.label} step ${index}`}
				onpointerdown={(event) => onPaintStart(index, event, true)}>
				{#if overflow}
					<span
						class={[
							'pointer-events-none absolute z-[1] flex w-full justify-center',
							overflow === 'up' ? 'top-0' : 'bottom-0'
						]}
						style="color: {accent}"
						transition:fly={{ y: overflow === 'up' ? -4 : 4, duration: 140 }}>
						<span class="absolute right-0 left-0 h-px" style="background: {accent}"></span>
						{#if overflow === 'up'}
							<IconCarbonChevronUp class="relative h-2.5 w-2.5" />
						{:else}
							<IconCarbonChevronDown class="relative h-2.5 w-2.5" />
						{/if}
					</span>
				{:else}
					<div
						class="absolute rounded-sm"
						style={integerMacroBarStyle(field, value, accent, viewMin)}>
					</div>
				{/if}
			</button>
		{:else if field.kind === 'enum'}
			{@const option = instrumentMacroEnumOption(field, value)}
			{@const optionLabel = option?.label ?? ''}
			{@const active = instrumentMacroEnumIsActive(field, value)}
			<button
				type="button"
				class="flex cursor-pointer items-center justify-center border-r border-[var(--color-app-border)]/60 text-[0.7rem] font-medium last:border-r-0"
				style="width: {stepWidthPx}px; height: {rowHeight}px; background: {active
					? accent
					: 'var(--color-app-surface-secondary)'}; color: {active
					? 'var(--color-app-surface)'
					: 'var(--color-app-text-muted)'}"
				aria-label="{field.label} {optionLabel || 'Off'} step {index}"
				title={optionLabel || 'Off'}
				onpointerdown={(event) => onPaintStart(index, event, false)}>
				{#if option?.icon === 'period'}
					<IconCarbonSettingsAdjust class={gateIconClass} />
				{:else if option?.icon === 'semitone'}
					<IconCarbonChartWinLoss class={gateIconClass} />
				{:else if option?.icon === 'close' || (!option?.icon && !optionLabel)}
					<IconCarbonClose class={gateIconClass} />
				{:else if option?.icon === 'up'}
					<IconCarbonArrowUp class={gateIconClass} />
				{:else if option?.icon === 'down'}
					<IconCarbonArrowDown class={gateIconClass} />
				{:else}
					{optionLabel}
				{/if}
			</button>
		{:else if field.kind === 'waveform'}
			{@const waveformEnabled = isStepEnabled?.(field.id, index) ?? true}
			<button
				type="button"
				class="flex items-center justify-center border-r border-[var(--color-app-border)]/60 bg-[var(--color-app-surface-secondary)] last:border-r-0 {waveformEnabled
					? 'cursor-pointer text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)]'
					: 'cursor-default text-[var(--color-app-border)]'}"
				style="width: {stepWidthPx}px; height: {rowHeight}px;"
				aria-label="{field.label} step {index}"
				aria-disabled={!waveformEnabled}
				onclick={() => waveformEnabled && onStepClick?.(field.id, index)}>
				<IconCarbonEdit class={gateIconClass} />
			</button>
		{:else}
			<button
				type="button"
				class="flex cursor-pointer items-center justify-center border-r border-[var(--color-app-border)]/60 last:border-r-0"
				style="width: {stepWidthPx}px; height: {rowHeight}px; background: {value
					? accent
					: 'var(--color-app-surface-secondary)'}; color: {value
					? 'var(--color-app-surface)'
					: 'var(--color-app-text-muted)'}"
				aria-label="{field.label} step {index}"
				aria-pressed={Boolean(value)}
				onpointerdown={(event) => onPaintStart(index, event, false)}
				onclick={() => onStepClick?.(field.id, index)}>
				{#if value}
					<IconCarbonCheckmark class={gateIconClass} />
				{:else}
					<IconCarbonClose class={gateIconClass} />
				{/if}
			</button>
		{/if}
	{/each}
</div>
