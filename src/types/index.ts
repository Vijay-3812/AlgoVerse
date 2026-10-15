export type * from './trace';
export type * from './algorithm';
export type * from './visual';
export { EMPTY_HIGHLIGHT, ZERO_METRICS } from './trace';
export { defineModule } from './algorithm';

/** Playback transport states. */
export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'completed';

export type Theme = 'dark' | 'light' | 'cyberpunk';

export type RightPanelTab = 'pseudocode' | 'code' | 'explain' | 'complexity' | 'learn';
