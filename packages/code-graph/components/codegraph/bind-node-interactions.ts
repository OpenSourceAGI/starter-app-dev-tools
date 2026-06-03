/**
 * Post-render DOM mutations applied to each `g.node` inside the Mermaid SVG.
 *
 * Handles three concerns that are all driven by iterating the same node set:
 *  1. Attaching hover tooltip data so the parent component can show a rich popup.
 *  2. Highlighting nodes whose text matches a search query.
 *  3. Intercepting `#file-*` anchor clicks so they smooth-scroll to file-tree rows.
 */

import type { MermaidTooltipData } from './dependency-graph-shared';

/** The tooltip state object surfaced to the React component via setState. */
export type ActiveTooltip = MermaidTooltipData & { x: number; y: number };

/**
 * Binds hover-tooltip listeners to every graph node that has a matching entry
 * in `nodeTooltips`. A native `<title>` element is also injected as a
 * fallback for accessibility / screen-readers.
 */
export function bindNodeTooltips(
  container: HTMLElement | Element,
  nodeTooltips: Record<string, MermaidTooltipData>,
  setTooltip: (value: ActiveTooltip | null | ((prev: ActiveTooltip | null) => ActiveTooltip | null)) => void,
) {
  container.querySelectorAll('g.node').forEach((node) => {
    if (!(node instanceof SVGGElement)) return;
    const tooltipData = nodeTooltips[node.id];
    if (!tooltipData) return;

    const existingTitle = node.querySelector('title');
    if (existingTitle) existingTitle.remove();
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    const exportSummary = tooltipData.exports?.length
      ? `Exports: ${tooltipData.exports.join(', ')}`
      : '';
    title.textContent = [tooltipData.title, tooltipData.description, exportSummary]
      .filter(Boolean)
      .join('\n');
    node.prepend(title);

    node.addEventListener('mouseenter', (event) => {
      const source = event.currentTarget;
      if (!(source instanceof SVGGElement)) return;
      const rect = source.getBoundingClientRect();
      setTooltip({
        ...tooltipData,
        x: rect.left + rect.width / 2,
        y: rect.top - 12,
      });
    });

    node.addEventListener('mousemove', (event) => {
      setTooltip((current: ActiveTooltip | null) =>
        current ? { ...current, x: event.clientX, y: event.clientY - 16 } : current,
      );
    });

    node.addEventListener('mouseleave', () => {
      setTooltip(null);
    });
  });
}

/**
 * Applies a yellow stroke highlight and bold text to every graph node whose
 * visible text includes the search `query` (case-insensitive).
 */
export function highlightMatchingNodes(container: HTMLElement | Element, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return;

  container.querySelectorAll('g.node').forEach((node) => {
    if (!(node instanceof SVGGElement)) return;
    if (!node.textContent?.toLowerCase().includes(normalizedQuery)) return;

    node.querySelectorAll('rect, polygon, path').forEach((shape) => {
      const element = shape as SVGElement;
      element.setAttribute('stroke', '#facc15');
      element.setAttribute('stroke-width', '4');
      element.setAttribute('filter', 'drop-shadow(0 0 10px rgba(250,204,21,0.35))');
    });

    node.querySelectorAll('span, tspan, text').forEach((textNode) => {
      if (textNode instanceof SVGTextElement || textNode instanceof SVGTSpanElement) {
        textNode.setAttribute('fill', '#fef08a');
        textNode.setAttribute('font-weight', '800');
      }
    });
  });
}

/**
 * Intercepts clicks on `<a href="#file-…">` links inside the rendered SVG so
 * they smooth-scroll to the corresponding file-tree row and briefly highlight it.
 */
export function interceptFiletreeAnchorClicks(container: HTMLElement | Element) {
  container.querySelectorAll('a[href^="#file-"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const href = a.getAttribute('href');
      if (!href) return;
      const target = document.querySelector(href);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (target instanceof HTMLElement) {
        target.style.outline = '2px solid rgb(59,130,246)';
        target.style.outlineOffset = '-2px';
        setTimeout(() => {
          target.style.outline = '';
          target.style.outlineOffset = '';
        }, 1500);
      }
    });
  });
}
