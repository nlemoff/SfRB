export type ReconciliationDialogController = {
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
  setNote: (message: string) => void;
};

// Leaving freeform with unreconciled placements opens this explicit decision
// point: rejoin layout, keep the freeform placement, or cancel the switch.
export function createReconciliationDialog(
  rootElement: HTMLElement,
  handlers: {
    onRejoin: () => void;
    onKeep: () => void;
    onCancel: () => void;
  },
): ReconciliationDialogController {
  const dialog = rootElement.querySelector('#reconciliation-dialog');
  const rejoinButton = rootElement.querySelector('#reconcile-rejoin');
  const keepButton = rootElement.querySelector('#reconcile-keep');
  const cancelButton = rootElement.querySelector('#reconcile-cancel');
  const note = rootElement.querySelector('#reconciliation-dialog-note');

  let previouslyFocused: HTMLElement | null = null;

  const focusables = (): HTMLElement[] =>
    [rejoinButton, keepButton, cancelButton].filter((element): element is HTMLElement => element instanceof HTMLElement);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handlers.onCancel();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const order = focusables();
    if (order.length === 0) {
      return;
    }

    const currentIndex = order.indexOf(document.activeElement as HTMLElement);
    event.preventDefault();
    const direction = event.shiftKey ? -1 : 1;
    const next = order[(currentIndex + direction + order.length) % order.length];
    next.focus();
  };

  if (rejoinButton instanceof HTMLElement) {
    rejoinButton.addEventListener('click', handlers.onRejoin);
  }
  if (keepButton instanceof HTMLElement) {
    keepButton.addEventListener('click', handlers.onKeep);
  }
  if (cancelButton instanceof HTMLElement) {
    cancelButton.addEventListener('click', handlers.onCancel);
  }

  return {
    open: () => {
      if (!(dialog instanceof HTMLElement) || !dialog.hidden) {
        return;
      }
      previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.hidden = false;
      dialog.addEventListener('keydown', onKeyDown);
      if (note instanceof HTMLElement) {
        note.textContent = 'Your freeform placements are saved. Decide how they should behave outside the freeform lens.';
      }
      (rejoinButton instanceof HTMLElement ? rejoinButton : null)?.focus();
    },
    close: () => {
      if (!(dialog instanceof HTMLElement) || dialog.hidden) {
        return;
      }
      dialog.hidden = true;
      dialog.removeEventListener('keydown', onKeyDown);
      const fallback = rootElement.querySelector('#editing-lenses [aria-checked="true"]');
      (previouslyFocused ?? (fallback instanceof HTMLElement ? fallback : null))?.focus();
      previouslyFocused = null;
    },
    isOpen: () => dialog instanceof HTMLElement && !dialog.hidden,
    setNote: (message) => {
      if (note instanceof HTMLElement) {
        note.textContent = message;
      }
    },
  };
}
