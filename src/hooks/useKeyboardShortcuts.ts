import { useEffect } from 'react';
import { usePlaybackStore } from '@/store/playbackStore';
import { useUiStore } from '@/store/uiStore';

export interface ShortcutHandlers {
  /** Extra handler for keys the host page wants (e.g. Enter to re-run). */
  readonly onCustom?: (event: KeyboardEvent) => boolean | void;
  readonly enabled?: boolean;
}

const EDITABLE = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return EDITABLE.has(target.tagName) || target.isContentEditable;
}

/**
 * Global transport shortcuts.
 *
 *   Space        play / pause
 *   ← / →        step back / forward
 *   Shift+← / →  jump 10 steps
 *   Home / End   first / last step
 *   R            reset
 *   + / −        speed up / slow down
 *   L            toggle loop
 *   K            command palette (⌘K also works)
 *   Shift+E      copy a shareable link to the current frame
 *   ?            open the guided tour
 *   [ / ]        collapse / expand the sidebar
 */
export function useKeyboardShortcuts({ onCustom, enabled = true }: ShortcutHandlers = {}): void {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent): void => {
      if (isEditable(event.target)) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        useUiStore.getState().setCommandPaletteOpen(!useUiStore.getState().commandPaletteOpen);
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (onCustom?.(event)) return;

      const store = usePlaybackStore.getState();

      switch (event.key) {
        case ' ':
        case 'Spacebar':
          event.preventDefault();
          store.toggle();
          return;
        case 'ArrowRight':
          event.preventDefault();
          if (event.shiftKey) store.seek(store.playback.cursor + 10);
          else store.stepBy(1);
          return;
        case 'ArrowLeft':
          event.preventDefault();
          if (event.shiftKey) store.seek(store.playback.cursor - 10);
          else store.stepBy(-1);
          return;
        case 'Home':
          event.preventDefault();
          store.jumpTo('start');
          return;
        case 'End':
          event.preventDefault();
          store.jumpTo('end');
          return;
        case 'r':
        case 'R':
          event.preventDefault();
          store.reset();
          return;
        case '+':
        case '=':
          event.preventDefault();
          store.nudgeSpeed(1);
          return;
        case '-':
        case '_':
          event.preventDefault();
          store.nudgeSpeed(-1);
          return;
        case 'l':
        case 'L':
          event.preventDefault();
          store.setLoop(!store.playback.loop);
          return;
        case 'k':
        case 'K':
          event.preventDefault();
          useUiStore.getState().setCommandPaletteOpen(true);
          return;
        case 'E':
          if (!event.shiftKey) return;
          // Copying is owned by the page (it holds the session URL hook), so
          // the shortcut announces itself rather than reaching across layers.
          event.preventDefault();
          window.dispatchEvent(new CustomEvent('algoverse:copy-link'));
          return;
        case '?':
          event.preventDefault();
          window.dispatchEvent(new CustomEvent('algoverse:start-tour'));
          return;
        case '[':
          event.preventDefault();
          useUiStore.getState().setSidebarCollapsed(true);
          return;
        case ']':
          event.preventDefault();
          useUiStore.getState().setSidebarCollapsed(false);
          return;
        default:
          return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, onCustom]);
}
