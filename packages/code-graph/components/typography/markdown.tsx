"use client";

/**
 * Component to safely render Markdown content, supporting keyword highlighting and external links.
 */
import { marked } from "marked";
import styles from "../code-tree/filetree-table.module.css";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function Markdown({ text, query, className }: { text: string; query?: string; className?: string }) {
  if (!text) return null;

  const renderer = new marked.Renderer();

  renderer.link = ({ href, title, text }) => {
    const safeHref = href ? escapeHtml(href) : "#";
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
    return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer"${titleAttr} style="color:rgb(59,130,246);text-decoration:underline">${text}</a>`;
  };

  renderer.image = ({ href, title, text }) => {
    const safeSrc = href ? escapeHtml(href) : "";
    const safeAlt = escapeHtml(text || "");
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
    return `<img src="${safeSrc}" alt="${safeAlt}"${titleAttr} loading="lazy" style="display:block;max-width:100%;height:auto;border-radius:0.5rem;margin:0.5rem 0;" />`;
  };

  renderer.paragraph = ({ text }) => `<p style="margin:0.35rem 0;">${text}</p>`;
  renderer.code = ({ text }) => `<pre class="bg-slate-900 p-2 rounded my-2 overflow-x-auto"><code>${escapeHtml(text)}</code></pre>`;

  let processed = marked.parse(text, {
    async: false,
    breaks: true,
    gfm: true,
    renderer,
  }) as string;

  processed = processed
    .replace(/<ul>/g, '<ul class="list-disc ml-4 my-2">')
    .replace(/<ol>/g, '<ol class="list-decimal ml-4 my-2">');

  if (query) {
    const safeQuery = escapeRegExp(query);
    processed = processed.replace(
      new RegExp(`(${safeQuery})`, "gi"),
      `<mark class="${styles.highlight}">$1</mark>`,
    );
  }

  const hasBlockContent = /<(p|ul|ol|pre|img|h[1-6]|blockquote|table)\b/i.test(processed);
  const Tag = hasBlockContent ? "div" : "span";

  return (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{ __html: processed }}
    />
  );
}
