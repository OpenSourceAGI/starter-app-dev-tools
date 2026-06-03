'use client';

/**
 * Client component responsible for rendering the interactive dependency graph and fetching live npm metadata.
 */
import { useMemo, useState, useTransition, useRef, useEffect, type ReactNode } from "react";
import { Boxes, FunctionSquare, Package, Search, Share2, Settings, Cloud, Loader2, X, Download, HelpCircle } from "lucide-react";
import { MermaidClient } from "./mermaid";
import { buildChart, buildNodeTooltips, getGraphHierarchy, type FileInfo, type GraphDisplayOptions } from "./dependency-graph-shared";
import { analyzeRemoteRepository } from "../../actions";

export function DependencyGraphClient({
  files: initialFiles,
  showLegend,
  initialOptions,
  helpContent,
}: {
  files: FileInfo[];
  showLegend: boolean;
  initialOptions: GraphDisplayOptions;
  helpContent?: ReactNode;
}) {
  const [files, setFiles] = useState(initialFiles);
  const [options, setOptions] = useState(initialOptions);
  const [search, setSearch] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");
  const [isPending, startTransition] = useTransition();

  const [npmMetadata, setNpmMetadata] = useState<Record<string, any>>({});
  const requestedNpmPkgs = useRef(new Set<string>());

  useEffect(() => {
    if (!options.showNpmImports) {
      return;
    }

    const packages = new Set<string>();
    for (const f of files) {
      for (const pkg of f.analysis?.npmImports ?? []) {
        packages.add(pkg);
      }
    }

    // Workspace packages and alias-like paths that should not be fetched from npm
    const workspaceScopes = ["@grab-url/"];
    const isWorkspacePkg = (name: string) =>
      workspaceScopes.some((s) => name.startsWith(s));

    const isLikelyAliasOrPath = (name: string) =>
      name.startsWith("@/") || name.startsWith("./") || name.startsWith("../");

    const toFetch: string[] = [];

    packages.forEach((pkg) => {
      if (requestedNpmPkgs.current.has(pkg)) return;
      requestedNpmPkgs.current.add(pkg);
      if (isWorkspacePkg(pkg) || isLikelyAliasOrPath(pkg)) return;
      toFetch.push(pkg);
    });

    if (toFetch.length === 0) return;

    // mark as loading initially
    setNpmMetadata((prev) => {
      const next = { ...prev };
      for (const pkg of toFetch) {
        next[pkg] = { _loading: true };
      }
      return next;
    });

    fetch("/api/npm-meta", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ packages: toFetch }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch npm metadata: ${res.status}`);
        return res.json();
      })
      .then((data: Record<string, any>) => {
        setNpmMetadata((prev) => ({ ...prev, ...data }));
      })
      .catch((e) => {
        console.error("Failed to fetch npm metadata batch", e);
        setNpmMetadata((prev) => {
          const next = { ...prev };
          for (const pkg of toFetch) {
            next[pkg] = { _error: true };
          }
          return next;
        });
      });
  }, [files, options.showNpmImports]);

  const handleRemoteLoad = () => {
    if (!repoUrl) return;
    
    startTransition(async () => {
      const result = await analyzeRemoteRepository(repoUrl);
      if (result.success && result.files) {
        setFiles(result.files);
        setShowConfig(false);
      } else {
        alert(result.error || "Failed to analyze repository");
      }
    });
  };

  const chart = useMemo(() => {
    const c = buildChart(files, options);
    console.log("[DependencyGraphClient] files:", files.length, "| chart length:", c.length, "| chart preview:", c.substring(0, 200));
    return c;
  }, [files, options]);
  const nodeTooltips = useMemo(() => buildNodeTooltips(files, options, npmMetadata), [files, options, npmMetadata]);
  const hierarchy = useMemo(() => getGraphHierarchy(files, options), [files, options]);

  useEffect(() => {
    (window as any).__c4Hierarchy = hierarchy;
    
    (window as any).toggleCollapse = (nodeId: string) => {
      // Find the node to toggle its icon
      const node = document.querySelector(`[id*="-${nodeId}-"]`);
      if (node) {
        // Toggle the +/- icon text
        node.querySelectorAll('tspan, span, div, text').forEach((el) => {
          if (el.textContent?.endsWith(' ➕')) {
             el.textContent = el.textContent.replace(' ➕', ' ➖');
          } else if (el.textContent?.endsWith(' ➖')) {
             el.textContent = el.textContent.replace(' ➖', ' ➕');
          }
        });
      }

      const h = (window as any).__c4Hierarchy;
      if (!h || !h[nodeId]) return;

      const directChildren = h[nodeId] || [];
      if (directChildren.length === 0) return;

      // Determine collapse state from the first child
      let isCollapsed = false;
      for (const cId of directChildren) {
        const cEl = document.querySelector(`[id*="-${cId}-"]`) as HTMLElement;
        if (cEl) {
          isCollapsed = cEl.style.display !== 'none';
          break;
        }
      }

      const display = isCollapsed ? 'none' : '';
      
      const toggleDescendants = (id: string) => {
        const children = h[id] || [];
        for (const cId of children) {
          const el = document.querySelector(`[id*="-${cId}-"]`) as HTMLElement;
          if (el) el.style.display = display;
          
          // Also hide/show edges connected to this child in mermaid
          // Mermaid C4 flowchart edges don't nicely match by class/id, so we just let them disconnect.
          // Recursively toggle
          toggleDescendants(cId);
        }
      };

      toggleDescendants(nodeId);
    };
  }, [hierarchy]);


  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
            <Search size={14} className="text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search graph nodes..."
              className="w-full min-w-0 border-none bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500 sm:w-56"
            />
          </div>
          {showLegend ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfig(!showConfig);
                  setShowHelp(false);
                }}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition ${
                  showConfig
                    ? "border-amber-400 bg-amber-500/15 text-amber-200"
                    : "border-slate-700 bg-slate-950/70 text-slate-300 hover:border-slate-500 hover:text-slate-100"
                }`}
              >
                <Settings size={14} className={isPending ? "animate-spin" : ""} />
                Repo
              </button>

              {helpContent && (
                <button
                  type="button"
                  onClick={() => {
                    setShowHelp(!showHelp);
                    setShowConfig(false);
                  }}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition ${
                    showHelp
                      ? "border-sky-400 bg-sky-500/15 text-sky-200"
                      : "border-slate-700 bg-slate-950/70 text-slate-300 hover:border-slate-500 hover:text-slate-100"
                  }`}
                >
                  <HelpCircle size={14} />
                  Help
                </button>
              )}

              <div className="mx-1 h-8 w-px bg-slate-800" />

              {[
                {
                  key: "showNpmImports",
                  label: "External",
                  icon: Package,
                },
                {
                  key: "showTypes",
                  label: "Types",
                  icon: Boxes,
                },
                {
                  key: "showPrivateFunctions",
                  label: "Private",
                  icon: FunctionSquare,
                },
                {
                  key: "showExportedFunctions",
                  label: "Exported",
                  icon: Share2,
                },
              ].map((toggle) => {
                const active = options[toggle.key as keyof GraphDisplayOptions] as boolean;
                const Icon = toggle.icon;
                return (
                  <button
                    key={toggle.key}
                    type="button"
                    onClick={() => setOptions((prev) => ({ ...prev, [toggle.key]: !active }))}
                    aria-pressed={active}
                    className={
                      active
                        ? "inline-flex items-center gap-2 rounded-full border border-sky-400 bg-sky-500/15 px-3 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/20"
                        : "inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
                    }
                  >
                    <Icon size={14} />
                    {toggle.label}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      {showConfig && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-900/50 bg-amber-950/20 p-4 shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-200">
              <Cloud size={16} />
              Load Remote Repository
            </div>
            <button onClick={() => setShowConfig(false)} className="text-slate-500 hover:text-white">
              <X size={16} />
            </button>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="https://github.com/user/repo or ZIP URL"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-amber-500/50"
                onKeyDown={(e) => e.key === 'Enter' && handleRemoteLoad()}
              />
            </div>
            <button
              disabled={isPending || !repoUrl}
              onClick={handleRemoteLoad}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50"
            >
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Analyze
            </button>
          </div>
          <p className="text-xs text-slate-500">
            Enter a public GitHub repository URL or a direct link to a ZIP file. The server will download and analyze the code structure.
          </p>
        </div>
      )}

      {showHelp && helpContent && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4 shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-sky-300">
              <HelpCircle size={16} />
              Instructions & Tips
            </div>
            <button onClick={() => setShowHelp(false)} className="text-slate-500 hover:text-white">
              <X size={16} />
            </button>
          </div>
          <div className="text-sm text-slate-300">
            {helpContent}
          </div>
        </div>
      )}

      <details open>
        <summary className="cursor-pointer select-none rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:text-white">
          Code Dependency Graph
        </summary>
        <div className="relative mt-2">
          {isPending && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/50 backdrop-blur-[1px]">
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
                <Loader2 size={32} className="animate-spin text-sky-400" />
                <div className="text-sm font-medium text-slate-200">Analyzing Architecture...</div>
              </div>
            </div>
          )}
          <MermaidClient chart={chart} nodeTooltips={nodeTooltips} highlightQuery={search} />
        </div>
      </details>
    </div>
  );
}
