import type { DocumentEditorEngine, DocumentEditorSnapshot } from '../engine';

export type TextEditingController = {
  renderBlockText: (blockId: string) => void;
  syncEditingDom: (snapshot: DocumentEditorSnapshot) => void;
  endEditingDom: () => void;
};

export function lineClampText(value: string): string {
  return value.length > 0 ? value : 'Empty block';
}

export function createTextEditingController(deps: {
  engine: DocumentEditorEngine;
  getBlockHost: (blockId: string) => HTMLElement | null;
}): TextEditingController {
  const { engine, getBlockHost } = deps;
  let activeTextarea: HTMLTextAreaElement | null = null;
  let activeBlockBody: HTMLElement | null = null;

  const focusTextarea = () => {
    if (!activeTextarea) {
      return;
    }
    const caret = activeTextarea.value.length;
    activeTextarea.focus();
    activeTextarea.setSelectionRange(caret, caret);
  };

  const renderBlockText = (blockId: string) => {
    const blockElement = getBlockHost(blockId);
    if (!blockElement) {
      return;
    }

    const body = blockElement.querySelector<HTMLElement>('[data-role="block-body"]');
    if (!body) {
      return;
    }

    if (engine.getSnapshot().editingBlockId === blockId) {
      return;
    }

    body.textContent = lineClampText(engine.getDisplayText(blockId) ?? engine.getBlockText(blockId) ?? '');
  };

  const beginEditingDom = (blockId: string) => {
    const blockElement = getBlockHost(blockId);
    if (!blockElement) {
      return;
    }

    const body = blockElement.querySelector<HTMLElement>('[data-role="block-body"]');
    if (!body) {
      return;
    }

    if (activeTextarea && activeTextarea.dataset.blockId === blockId) {
      focusTextarea();
      return;
    }

    if (activeTextarea && activeBlockBody) {
      activeBlockBody.replaceChildren(
        document.createTextNode(lineClampText(engine.getDisplayText(activeTextarea.dataset.blockId ?? '') ?? '')),
      );
      activeTextarea = null;
      activeBlockBody = null;
    }

    const textarea = document.createElement('textarea');
    textarea.id = 'editor-active-textarea';
    textarea.dataset.testid = 'editor-active-textarea';
    textarea.dataset.blockId = blockId;
    textarea.setAttribute('aria-label', 'Edit block text');
    textarea.value = engine.getDisplayText(blockId) ?? engine.getBlockText(blockId) ?? '';
    textarea.rows = Math.max(3, textarea.value.split('\n').length + 1);
    textarea.style.cssText = [
      'width: 100%',
      'min-height: 110px',
      'height: 100%',
      'resize: vertical',
      'border: none',
      'outline: none',
      'background: transparent',
      'font: inherit',
      'line-height: 1.65',
      'color: #0f172a',
      'padding: 0',
      'margin: 0',
      'box-sizing: border-box',
    ].join('; ');

    textarea.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
    });

    textarea.addEventListener('input', () => {
      engine.updateDraft(textarea.value);
      textarea.rows = Math.max(3, textarea.value.split('\n').length + 1);
      engine.scheduleCommit();
    });

    textarea.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void engine.commitActive('enter').then(() => {
          textarea.blur();
        });
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        textarea.blur();
      }
    });

    textarea.addEventListener('blur', () => {
      void engine.commitActive('blur').finally(() => {
        engine.endEditing();
      });
    });

    body.replaceChildren(textarea);
    activeTextarea = textarea;
    activeBlockBody = body;
    focusTextarea();
  };

  const endEditingDom = () => {
    if (!activeTextarea || !activeBlockBody) {
      return;
    }

    const previousBlockId = activeTextarea.dataset.blockId ?? '';
    activeBlockBody.replaceChildren(
      document.createTextNode(lineClampText(engine.getDisplayText(previousBlockId) ?? engine.getBlockText(previousBlockId) ?? '')),
    );
    activeTextarea = null;
    activeBlockBody = null;
  };

  const syncEditingDom = (snapshot: DocumentEditorSnapshot) => {
    if (snapshot.editingBlockId) {
      beginEditingDom(snapshot.editingBlockId);
      if (activeTextarea && snapshot.draftText !== null && activeTextarea.value !== snapshot.draftText) {
        const selectionStart = activeTextarea.selectionStart;
        const selectionEnd = activeTextarea.selectionEnd;
        activeTextarea.value = snapshot.draftText;
        activeTextarea.setSelectionRange(selectionStart, selectionEnd);
      }
      return;
    }

    endEditingDom();
  };

  return { renderBlockText, syncEditingDom, endEditingDom };
}
