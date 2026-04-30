// Lightweight event bus for diagram-level actions triggered outside DiagramView
// (e.g. CommandPalette, sidebar buttons). Keeps DiagramView decoupled from App
// without passing imperative refs through the React tree.

export type DiagramAction =
  | 'auto-layout'
  | 'reset-layout'
  | 'refresh-metrics'
  | 'fit-view'
  | 'export-image'
  | 'focus-next'
  | 'focus-prev'
  | 'open-selected';

const EVENT_NAME = 'diagram:action';

export function dispatchDiagramAction(action: DiagramAction): void {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { action } }));
}

export function subscribeDiagramAction(handler: (action: DiagramAction) => void): () => void {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<{ action: DiagramAction }>).detail;
    if (detail?.action) handler(detail.action);
  };
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
