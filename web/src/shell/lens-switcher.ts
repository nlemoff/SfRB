import type { ReadyBridgePayload } from '../bridge-client';
import type { DocumentEditorEngine, EditorLens } from '../editor/engine';

const LENS_ORDER: EditorLens[] = ['text', 'tile', 'freeform'];

export type LensSwitcherController = {
  sync: (payload: ReadyBridgePayload | null) => void;
};

const FREEFORM_SHIPPED = true;

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
    // A deferred switch means the reconciliation dialog now owns focus.
    if (engine.getSnapshot().pendingLensExit === null) {
      optionFor(engine.getSnapshot().activeLens)?.focus();
    }
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

  // Availability strings are part of the test contract and must stay in the
  // DOM verbatim; "Available now…" states are visually hidden so the pill
  // reads as just the lens name, while unavailable states surface the reason.
  const setAvailabilityText = (node: Element | null, text: string) => {
    if (!(node instanceof HTMLElement)) {
      return;
    }
    node.textContent = text;
    node.classList.toggle('sfrb-visually-hidden', text.startsWith('Available now'));
  };

  const sync = (payload: ReadyBridgePayload | null) => {
    currentPayload = payload;
    const activeLens = engine.getSnapshot().activeLens;

    if (group instanceof HTMLElement) {
      group.dataset.activeLens = activeLens;
    }

    setAvailabilityText(rootElement.querySelector('[data-testid="lens-text-availability"]'), 'Available now');
    setAvailabilityText(rootElement.querySelector('#tile-lens-availability'), describeDesignOnlyAvailability(payload));
    setAvailabilityText(
      rootElement.querySelector('[data-testid="lens-freeform-availability"]'),
      FREEFORM_SHIPPED ? describeDesignOnlyAvailability(payload) : 'Arriving later in this milestone',
    );

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
