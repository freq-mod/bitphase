import { SAA_CHIP as SAA_CHIP_CORE } from './core';
import SAAInstrumentEditor from './SAAInstrumentEditor.svelte';
import SAAPreviewRow from './SAAPreviewRow.svelte';

export const SAA_CHIP = {
	...SAA_CHIP_CORE,
	instrumentEditor: SAAInstrumentEditor,
	previewRow: SAAPreviewRow
} as const;

export { SAAProcessor } from './processor';
export { SAAConverter } from './adapter';
export { SAAFormatter } from './formatter';
export { SAAChipRenderer } from './renderer';
export { SAAInstrumentEditor, SAAPreviewRow };
export { SAA_CHIP_SCHEMA } from './schema';
