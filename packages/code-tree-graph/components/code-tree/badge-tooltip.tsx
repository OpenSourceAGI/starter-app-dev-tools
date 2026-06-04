"use client";

/**
 * Reusable badge component with an interactive tooltip for displaying rich metadata.
 */
import { useRef, useState, useCallback, useEffect } from "react";
import { Package, FunctionSquare, Braces, FileOutput, FileInput, Box, Blocks, Info } from "lucide-react";
import type { TypeProperty } from "../../lib";
import styles from "./badge-tooltip.module.css";
import { Markdown } from "../typography/markdown";

const PRIMITIVE_TYPES = new Set([
  "string", "number", "boolean", "void", "null", "undefined",
  "any", "never", "unknown", "object", "symbol", "bigint",
]);
const SIG_KEYWORDS = new Set(["=>", "extends", "keyof", "typeof", "infer", "readonly", "new"]);

function lookAheadColon(tokens: string[], i: number): boolean {
  if (tokens[i] === ":") return true;
  if (tokens[i] === "?" && i + 1 < tokens.length && tokens[i + 1] === ":") return true;
  return false;
}

/** Tokenize a TS signature string into syntax-colored spans */
function ColorizedSignature({ text }: { text: string }) {
  const tokens = text.match(/=>|\.\.\.|\w+|[^a-zA-Z0-9\s]|\s+/g);
  if (!tokens) return <>{text}</>;

  const spans: React.ReactNode[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (SIG_KEYWORDS.has(tok)) {
      spans.push(<span key={i} className={styles.sigKw}>{tok}</span>);
    } else if (PRIMITIVE_TYPES.has(tok)) {
      spans.push(<span key={i} className={styles.sigTy}>{tok}</span>);
    } else if (/^[A-Z]/.test(tok)) {
      spans.push(<span key={i} className={styles.sigTy}>{tok}</span>);
    } else if (/^[a-z_$]/i.test(tok) && i + 1 < tokens.length && lookAheadColon(tokens, i + 1)) {
      spans.push(<span key={i} className={styles.sigParam}>{tok}</span>);
    } else if (/^[(){}[\]:,;|&<>?=]$/.test(tok) || tok === "...") {
      spans.push(<span key={i} className={styles.sigPunc}>{tok}</span>);
    } else {
      spans.push(<span key={i}>{tok}</span>);
    }
  }
  return <>{spans}</>;
}

const icons = {
  package: Package,
  function: FunctionSquare,
  braces: Braces,
  export: FileOutput,
  import: FileInput,
  constant: Box,
  class: Blocks,
} as const;

export type BadgeIconName = keyof typeof icons;

export interface BadgeTooltipSectionItem {
  name: string;
  signature?: string;
  icon?: BadgeIconName;
}

export interface BadgeTooltipSection {
  label: string;
  colorClassName: string;
  items: BadgeTooltipSectionItem[];
}

export function Badge({
  bg,
  color,
  icon,
  label,
  tooltip,
  signature,
  properties,
  href,
  sections,
}: {
  bg: string;
  color: string;
  icon: BadgeIconName;
  label: string;
  tooltip?: string;
  signature?: string;
  href?: string;
  properties?: TypeProperty[];
  sections?: BadgeTooltipSection[];
}) {
  const Icon = icons[icon];
  const hasSections = Boolean(sections && sections.length > 0);
  const hasPopover = tooltip || signature || (properties && properties.length > 0) || hasSections;
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [pinned, setPinned] = useState(false);

  const calcPos = useCallback(() => {
    if (!wrapperRef.current) return null;
    const rect = wrapperRef.current.getBoundingClientRect();
    return { top: rect.top - 8, left: rect.left + rect.width / 2 };
  }, []);

  const showTooltip = useCallback(() => {
    if (pinned) return;
    setPos(calcPos());
  }, [pinned, calcPos]);

  const hideTooltip = useCallback(() => {
    if (pinned) return;
    setPos(null);
  }, [pinned]);

  const togglePin = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (pinned) {
      setPinned(false);
      setPos(null);
    } else {
      setPinned(true);
      setPos(calcPos());
    }
  }, [pinned, calcPos]);

  const openSource = useCallback(() => {
    if (!href) return;
    window.open(href, "_blank", "noopener,noreferrer");
  }, [href]);

  // Close on outside click
  useEffect(() => {
    if (!pinned) return;
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current?.contains(e.target as Node) ||
        tooltipRef.current?.contains(e.target as Node)
      ) return;
      setPinned(false);
      setPos(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pinned]);

  if (!hasPopover) {
    const inner = (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.2rem",
          padding: "0.1rem 0.4rem",
          borderRadius: "0.375rem",
          fontSize: "0.78rem",
          fontWeight: 500,
          lineHeight: "1.4",
          backgroundColor: bg,
          color,
        }}
      >
        <Icon size={12} /> {label}
      </span>
    );
    if (href) {
      return <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>{inner}</a>;
    }
    return inner;
  }

  return (
    <span
      ref={wrapperRef}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.2rem",
        padding: "0.1rem 0.4rem",
        borderRadius: "0.375rem",
        fontSize: "0.78rem",
        fontWeight: 500,
        lineHeight: "1.4",
        backgroundColor: bg,
        color,
        cursor: href ? "pointer" : "default",
        position: "relative",
      }}
    >
      <button
        type="button"
        onClick={togglePin}
        aria-label={`${pinned ? "Unpin" : "Pin"} tooltip for ${label}`}
        className={styles.iconPinButton}
      >
        <Icon size={12} />
      </button>
      <span onClick={href ? openSource : undefined}>{label}</span>
      <button
        type="button"
        onClick={togglePin}
        aria-label={`${pinned ? "Hide" : "Show"} info for ${label}`}
        className={styles.mobileInfoButton}
      >
        <Info size={11} />
      </button>
      {pos && (
        <div
          ref={tooltipRef}
          className={styles.tooltip}
          style={{
            position: "fixed",
            bottom: "auto",
            top: pos.top,
            left: pos.left,
            transform: "translate(-50%, -100%)",
            visibility: "visible",
            opacity: 1,
          }}
        >
          {tooltip && (
            <div className={styles.tooltipHeader}>
              <Markdown text={tooltip} className={styles.desc} />
            </div>
          )}
          {hasSections ? (
            <div className={styles.sectionList}>
              {sections?.map((section) => (
                <div key={section.label} className={styles.sectionGroup}>
                  <div className={styles.sectionTitle}>{section.label}</div>
                  <div className={styles.sectionChips}>
                    {section.items.map((item) => {
                      const ItemIcon = item.icon ? icons[item.icon] : undefined;
                      return (
                        <span key={`${section.label}-${item.name}`} className={`${styles.sectionChip} ${section.colorClassName}`}>
                          {ItemIcon && <ItemIcon size={11} style={{ flexShrink: 0 }} />}
                          <span className={styles.sectionChipName}>{item.name}</span>
                          {item.signature && (
                            <span className={styles.sectionChipSig}><ColorizedSignature text={item.signature} /></span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : properties && properties.length > 0 ? (
            <div className={styles.propList}>
              {properties.map((p) => (
                <div key={p.name} className={styles.propItem}>
                  <div className={styles.propHeader}>
                    <code className={styles.ttPropName}>
                      {p.name}{!p.required && <span className={styles.ttOptional}>?</span>}
                    </code>
                    <code className={styles.propType}>{p.type}</code>
                  </div>
                  {p.description && (
                    <Markdown text={p.description} className={styles.propDesc} />
                  )}
                </div>
              ))}
            </div>
          ) : signature ? (
            <span className={styles.sig}>
              <span className={styles.sigKeyword}>{label}</span>
              <span className={styles.sigType}>{signature}</span>
            </span>
          ) : null}
        </div>
      )}
    </span>
  );
}

/* ── Npm package badge with lazy-fetched tooltip ── */

interface NpmPackageInfo {
  version: string;
  description: string;
  downloads: number;
  license: string;
  homepage?: string;
  gzipSize?: number;
  depCount: number;
  lastUpdated?: string;
}

const npmCache = new Map<string, NpmPackageInfo | null>();

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} kB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

async function fetchNpmInfo(pkg: string): Promise<NpmPackageInfo | null> {
  if (npmCache.has(pkg)) return npmCache.get(pkg)!;
  try {
    const encoded = encodeURIComponent(pkg);
    const [metaRes, dlRes, sizeRes] = await Promise.allSettled([
      fetch(`https://registry.npmjs.org/${encoded}/latest`),
      fetch(`https://api.npmjs.org/downloads/point/last-week/${encoded}`),
      fetch(`https://bundlephobia.com/api/size?package=${encoded}`),
    ]);
    const meta = metaRes.status === "fulfilled" ? await metaRes.value.json() : null;
    if (!meta) { npmCache.set(pkg, null); return null; }
    const dl = dlRes.status === "fulfilled" ? await dlRes.value.json() : null;
    const size = sizeRes.status === "fulfilled" && sizeRes.value.ok ? await sizeRes.value.json() : null;

    const depCount = meta.dependencies ? Object.keys(meta.dependencies).length : 0;

    const info: NpmPackageInfo = {
      version: meta.version ?? "?",
      description: meta.description ?? "",
      downloads: dl?.downloads ?? 0,
      license: meta.license ?? "Unknown",
      homepage: meta.homepage,
      gzipSize: size?.gzip,
      depCount,
      lastUpdated: meta.time?.[meta.version] ?? meta._time,
    };
    npmCache.set(pkg, info);
    return info;
  } catch {
    npmCache.set(pkg, null);
    return null;
  }
}

export function NpmBadge({ pkg, href }: { pkg: string; href?: string }) {
  const [info, setInfo] = useState<NpmPackageInfo | null | undefined>(
    npmCache.has(pkg) ? npmCache.get(pkg) : undefined,
  );

  const onHover = useCallback(() => {
    if (info !== undefined) return;
    fetchNpmInfo(pkg).then(setInfo);
  }, [pkg, info]);

  const tooltip = info ? `${info.description}` : undefined;

  const sections: BadgeTooltipSection[] | undefined = info
    ? [
        {
          label: "Package",
          colorClassName: styles.sectionNpm,
          items: [
            { name: `v${info.version}` },
            { name: info.license },
            { name: `${info.downloads.toLocaleString()}/wk` },
            ...(info.gzipSize ? [{ name: `${formatBytes(info.gzipSize)} gzip` }] : []),
            { name: `${info.depCount} dep${info.depCount !== 1 ? "s" : ""}` },
            ...(info.lastUpdated ? [{ name: timeAgo(info.lastUpdated) }] : []),
          ],
        },
      ]
    : undefined;

  return (
    <span onMouseEnter={onHover}>
      <Badge
        bg="rgba(59,130,246,0.15)"
        color="rgb(59,130,246)"
        icon="package"
        label={pkg}
        href={href}
        tooltip={tooltip}
        sections={sections}
      />
    </span>
  );
}
