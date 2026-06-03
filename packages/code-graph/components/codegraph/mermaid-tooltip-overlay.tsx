/**
 * Rich tooltip popup that appears when hovering over a graph node.
 * Displays the node title, description (rendered as Markdown), and
 * categorised lists of exports, functions, and types.
 */

// @ts-nocheck - Radix UI types incompatible with React 19 children prop
'use client';

import { ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Markdown } from '../typography/markdown';
import type { ActiveTooltip } from './bind-node-interactions';

export function MermaidTooltipOverlay({ tooltip }: { tooltip: ActiveTooltip | null }) {
  return (
    <Tooltip open={!!tooltip}>
      <TooltipTrigger asChild>
        <span
          aria-hidden="true"
          className="fixed pointer-events-none"
          style={{
            left: tooltip?.x ?? -9999,
            top: (tooltip?.y ?? -9999) - 8,
            width: 1,
            height: 1,
          }}
        />
      </TooltipTrigger>
      <TooltipContent className="w-80 p-3">
        {tooltip && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="font-semibold text-white">{tooltip.title}</div>
              {tooltip.href && (
                <span className="inline-flex items-center gap-1 text-xs text-sky-300">
                  <ExternalLink size={12} />
                  npm
                </span>
              )}
            </div>
            {tooltip.description && (
              <div className="mt-2 text-[13px] leading-5 text-slate-300">
                <Markdown text={tooltip.description} />
              </div>
            )}
            {tooltip.exports && tooltip.exports.length > 0 && (
              <div className="mt-3">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Exports</div>
                <div className="flex flex-wrap gap-1.5">
                  {tooltip.exports.map((item) => (
                    <span key={item} className="rounded-md border border-cyan-900/60 bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-200">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {tooltip.functions && tooltip.functions.length > 0 && (
              <div className="mt-3">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Functions</div>
                <div className="flex flex-wrap gap-1.5">
                  {tooltip.functions.map((item) => (
                    <span key={item} className="rounded-md border border-emerald-900/60 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-200">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {tooltip.types && tooltip.types.length > 0 && (
              <div className="mt-3">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Types</div>
                <div className="flex flex-wrap gap-1.5">
                  {tooltip.types.map((item) => (
                    <span key={item} className="rounded-md border border-violet-900/60 bg-violet-500/10 px-2 py-0.5 text-xs text-violet-200">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
