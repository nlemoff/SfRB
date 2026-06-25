// Compact labeled status chip shared by the canvas status strip and the
// freeform HUD readouts. The value node carries a frozen id/data-testid; the
// label stays outside it because tests read the value's bare textContent.
export type StatusCell = {
  readonly cell: HTMLSpanElement;
  readonly value: HTMLElement;
};

export function createStatusCell(
  label: string,
  elementId: string,
  testId: string,
  valueTag: 'div' | 'span' = 'div',
): StatusCell {
  const cell = document.createElement('span');
  cell.className = 'sfrb-status-cell';

  const labelNode = document.createElement('span');
  labelNode.className = 'sfrb-status-cell-label';
  labelNode.textContent = label;

  const value = document.createElement(valueTag);
  value.id = elementId;
  value.dataset.testid = testId;

  cell.append(labelNode, value);
  return { cell, value };
}
