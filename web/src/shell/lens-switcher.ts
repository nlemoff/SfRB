import type { ReadyBridgePayload } from '../bridge-client';
import type { DocumentEditorEngine, EditorLens } from '../editor/engine';

const LENS_ORDER: EditorLens[] = ['text', 'tile', 'freeform'];

export type LensSwitcherController = {
  sync: (payload: ReadyBridgePayload | null) => void;
};

// Freeform becomes selectable when its surface ships; until then the switcher
// stays honest about it.
const FREEFORM_SHIPPED = false;

function describeDesignOnlyAvailability(payload: ReadyBridgePayload | null): string {
  if (!payload) {
    return 'Waiting for workspace state…';
  }
  return payload.physics === 'design' ? 'Available now in this workspace' : 'Not available in this workspace yet';
}

export function bindLensSwitcher(rootElement: HTMLElement, engine: DocumentEditorEngine): LensSwitcherController {
  const group = rootElement.querySelector('#editing-lenses');
  const optionFor = (lens: EditorLens): HTMLButtonElement | null =>
    rootElement.querySelector(`[data-lens="${lens}"]`) as HTMLButtonElement | null;

  let currentPayload: ReadyBridgePayload | null = null;

  const isLensAvailable = (lens: EditorLens): boolean => {
    if (lens === 'text') {
      return true;
    }
    if (currentPayload?.physics !== 'design') {
      return false;
    }
    return lens === 'tile' || FREEFORM_SHIPPED;
  };

  const activate = (lens: EditorLens) => {
    if (!isLensAvailable(lens)) {
      return;
    }
    engine.setActiveLens(lens);
    sync(currentPayload);
    optionFor(lens)?.focus();
  };

  for (const lens of LENS_ORDER) {
    const option = optionFor(lens);
    if (!option) {
      continue;
    }

    option.addEventListener('click', () => activate(lens));
    option.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
        return;
      }
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const available = LENS_ORDER.filter(isLensAvailable);
      const currentIndex = available.indexOf(engine.getSnapshot().activeLens);
      const next = available[(currentIndex + direction + available.length) % available.length];
      activate(next);
    });
  }

  const sync = (payload: ReadyBridgePayload | null) => {
    currentPayload = payload;
    const activeLens = engine.getSnapshot().activeLens;

    if (group instanceof HTMLElement) {
      group.dataset.activeLens = activeLens;
    }

    const tileAvailability = describeDesignOnlyAvailability(payload);
    const tileNode = rootElement.querySelector('#tile-lens-availability');
    if (tileNode) {
      tileNode.textContent = tileAvailability;
    }

    const freeformNode = rootElement.querySelector('[data-testid="lens-freeform-availability"]');
    if (freeformNode) {
      freeformNode.textContent = FREEFORM_SHIPPED ? describeDesignOnlyAvailability(payload) : 'Arriving later in this milestone';
    }

    for (const lens of LENS_ORDER) {
      const option = optionFor(lens);
      if (!option) {
        continue;
      }

      const isActive = lens === activeLens;
      const available = isLensAvailable(lens);
      option.setAttribute('aria-checked', String(isActive));
      option.disabled = !available;
      option.tabIndex = isActive ? 0 : -1;
    }
  };

  sync(null);
  return { sync };
}
