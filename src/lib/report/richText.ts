import type { RichTextBlock, RichTextSpan } from "@/types/report";

// Only allow safe URL schemes; reject javascript:/data:/vbscript: etc.
export function safeHref(href: string | null | undefined): string | undefined {
  if (!href) return undefined;
  const trimmed = href.trim();
  if (!trimmed) return undefined;
  // Relative URLs, anchors, mailto, tel are safe.
  if (/^(\/|\.|#|mailto:|tel:)/i.test(trimmed)) return trimmed;
  // Absolute URLs: only http/https.
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Anything else (javascript:, data:, vbscript:, unknown scheme) is rejected.
  return undefined;
}

interface ActiveMarks {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  href?: string;
}

function collectSpans(node: Node, marks: ActiveMarks, out: RichTextSpan[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || "";
    if (text) out.push({ text, ...marks });
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const next: ActiveMarks = { ...marks };
  if (tag === "strong" || tag === "b") next.bold = true;
  if (tag === "em" || tag === "i") next.italic = true;
  if (tag === "u") next.underline = true;
  if (tag === "a") next.href = safeHref(el.getAttribute("href"));
  el.childNodes.forEach((child) => collectSpans(child, next, out));
}

function spansFor(el: HTMLElement): RichTextSpan[] {
  const spans: RichTextSpan[] = [];
  el.childNodes.forEach((child) => collectSpans(child, {}, spans));
  return spans.filter((s) => s.text.trim().length > 0 || s.text === " ");
}

export function parseRichText(html: string | null | undefined): RichTextBlock[] {
  if (!html || !html.trim()) return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocks: RichTextBlock[] = [];

  const walk = (parent: ParentNode) => {
    Array.from(parent.children).forEach((child) => {
      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();
      if (tag === "ul" || tag === "ol") {
        const type = tag === "ul" ? "bullet" : "number";
        Array.from(el.children).forEach((li) => {
          if ((li as HTMLElement).tagName.toLowerCase() === "li") {
            blocks.push({ type, spans: spansFor(li as HTMLElement) });
          }
        });
      } else if (tag === "p" || /^h[1-6]$/.test(tag) || tag === "div") {
        const spans = spansFor(el);
        if (spans.length) blocks.push({ type: "paragraph", spans });
      } else {
        const spans = spansFor(el);
        if (spans.length) blocks.push({ type: "paragraph", spans });
      }
    });
  };

  walk(doc.body);

  // Fallback: plain string with no block elements.
  if (blocks.length === 0) {
    const text = doc.body.textContent || "";
    if (text.trim()) blocks.push({ type: "paragraph", spans: [{ text }] });
  }
  return blocks;
}

export function richTextToPlainText(html: string | null | undefined): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").trim();
}
