import type { StickyEffectCommand } from '../base/schema';
import {
	isNesDeltaCounterEffect,
	isNesEnvelopeModeEffect,
	isNesLengthCounterEffect,
	isNesLinearCounterEffect,
	isNesPulseWidthCycleEffect
} from './effects';

export function nesStickyChannelEffectGroup(effect: StickyEffectCommand): string | null {
	if (isNesPulseWidthCycleEffect(effect)) return 'nes-pulse-width';
	if (isNesDeltaCounterEffect(effect)) return 'nes-delta';
	if (isNesLengthCounterEffect(effect)) return 'nes-length';
	if (isNesEnvelopeModeEffect(effect)) return 'nes-envelope-mode';
	if (isNesLinearCounterEffect(effect)) return 'nes-linear';
	return null;
}
