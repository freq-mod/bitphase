export const CHIP_TYPES = ['ay', 'nes', 'saa'] as const;
export type ChipType = (typeof CHIP_TYPES)[number];
