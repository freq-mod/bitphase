<script lang="ts">
	import type { Instrument } from '../../models/song';
	import IconCarbonRepeat from '~icons/carbon/repeat';
	import IconCarbonChartWinLoss from '~icons/carbon/chart-win-loss';
	import IconCarbonArrowsVertical from '~icons/carbon/arrows-vertical';
	import IconCarbonWaveform from '~icons/carbon/waveform';
	import IconCarbonVolumeUp from '~icons/carbon/volume-up';
	import IconCarbonActivity from '~icons/carbon/activity';
	import IconCarbonMusic from '~icons/carbon/music';
	import IconCarbonRenew from '~icons/carbon/renew';
	import IconCarbonSettingsAdjust from '~icons/carbon/settings-adjust';
	import IconCarbonTime from '~icons/carbon/time';
	import InstrumentEditorIdentity from '../../components/Instruments/InstrumentEditorIdentity.svelte';
	import type { NESInstrumentFields } from './instrument';
	import PillTabs, { type PillTab } from '../../components/PillTabs/PillTabs.svelte';
	import NESInstrumentSamplePanel from './NESInstrumentSamplePanel.svelte';
	import { NES_APU_MACRO_FIELDS } from './apu-macros';
	import InstrumentMacrosEditor from '../../components/Instruments/InstrumentMacrosEditor.svelte';

	type InstrumentTab = 'apu' | 'dpcm';

	let {
		instrument,
		asHex = false,
		isExpanded = false,
		onInstrumentChange
	}: {
		instrument: Instrument;
		asHex: boolean;
		isExpanded: boolean;
		onInstrumentChange: (instrument: Instrument) => void;
	} = $props();

	let activeTab = $state<InstrumentTab>('apu');

	const extendedInstrument = $derived(instrument as Instrument & Partial<NESInstrumentFields>);

	const instrumentTabs = $derived.by((): PillTab[] => [
		{ id: 'apu', label: 'APU', icon: IconCarbonVolumeUp },
		{ id: 'dpcm', label: 'DPCM', icon: IconCarbonWaveform }
	]);

	const apuIcons = {
		volumeOrRate: IconCarbonVolumeUp,
		envelope: IconCarbonActivity,
		retrigger: IconCarbonRepeat,
		pulseWidth: IconCarbonChartWinLoss,
		toneAdd: IconCarbonMusic,
		toneAccumulation: IconCarbonRenew,
		sweep: IconCarbonSettingsAdjust,
		sweepRate: IconCarbonTime,
		sweepShift: IconCarbonArrowsVertical,
		soundLength: IconCarbonTime
	};

</script>

<div
	class={[
		'w-full max-w-full min-w-0 outline-none focus:outline-none',
		activeTab === 'dpcm' ? 'flex h-full min-h-0 flex-col overflow-hidden' : 'overflow-x-auto'
	]}
	tabindex="-1">
	<InstrumentEditorIdentity {instrument} {onInstrumentChange} />

	<PillTabs
		class="mt-3 ml-2 shrink-0"
		bind:activeTabId={activeTab}
		tabs={instrumentTabs}
		onSelect={(tabId) => {
			activeTab = tabId as InstrumentTab;
		}} />

	{#if activeTab === 'dpcm'}
		<div class="mt-3 mr-2 ml-2 box-border flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
			<NESInstrumentSamplePanel instrument={extendedInstrument} {asHex} {onInstrumentChange} />
		</div>
	{:else}
		<InstrumentMacrosEditor
			{instrument}
			fields={NES_APU_MACRO_FIELDS}
			{asHex}
			{isExpanded}
			icons={apuIcons}
			{onInstrumentChange} />
	{/if}
</div>
