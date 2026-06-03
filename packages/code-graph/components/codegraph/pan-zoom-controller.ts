/**
 * Widens Mermaid cluster labels and parses SVG metadata for svg-toolbelt.
 */

const CLUSTER_LABEL_EXTRA_WIDTH = 96;

/** Parsed SVG data needed by svg-toolbelt. */
export type ParsedSvg = {
  innerHtml: string;
  width: number;
  height: number;
};

/**
 * Widens the bounding rects of Mermaid cluster labels so long directory
 * names are not clipped by the auto-sized SVG foreignObject boxes.
 */
export function widenClusterLabels(container: HTMLElement) {
  container.querySelectorAll('g.cluster').forEach((cluster) => {
    const clusterElement = cluster as SVGGElement;
    const rect = clusterElement.querySelector('rect');
    if (rect instanceof SVGRectElement) {
      const currentWidth = rect.width.baseVal.value;
      const currentX = rect.x.baseVal.value;
      rect.width.baseVal.value = currentWidth + CLUSTER_LABEL_EXTRA_WIDTH;
      rect.x.baseVal.value = currentX - CLUSTER_LABEL_EXTRA_WIDTH / 2;
    }

    const foreignObject = clusterElement.querySelector('foreignObject');
    if (foreignObject instanceof SVGForeignObjectElement) {
      const currentWidth = foreignObject.width.baseVal.value;
      const currentX = foreignObject.x.baseVal.value;
      foreignObject.width.baseVal.value = currentWidth + CLUSTER_LABEL_EXTRA_WIDTH;
      foreignObject.x.baseVal.value = currentX - CLUSTER_LABEL_EXTRA_WIDTH / 2;
      foreignObject.style.overflow = 'visible';
    }
  });
}

/**
 * Parses a rendered Mermaid SVG string to extract the inner content and
 * dimensions needed by svg-toolbelt.
 */
export function parseMermaidSvg(svgString: string): ParsedSvg {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) return { innerHtml: '', width: 1200, height: 600 };

  const viewBox = svg.getAttribute('viewBox');
  let width = 1200;
  let height = 600;

  if (viewBox) {
    const parts = viewBox.split(/\s+/).map(Number);
    if (parts.length === 4) {
      width = parts[2];
      height = parts[3];
    }
  } else {
    width = parseFloat(svg.getAttribute('width') || '1200');
    height = parseFloat(svg.getAttribute('height') || '600');
  }

  return { innerHtml: svg.innerHTML, width, height };
}
