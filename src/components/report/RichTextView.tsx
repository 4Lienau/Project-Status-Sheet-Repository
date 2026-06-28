import React from "react";
import type { RichTextBlock, RichTextSpan } from "@/types/report";
import { safeHref } from "@/lib/report/richText";

const Span: React.FC<{ s: RichTextSpan }> = ({ s }) => {
  let node: React.ReactNode = s.text;
  if (s.bold) node = <strong>{node}</strong>;
  if (s.italic) node = <em>{node}</em>;
  if (s.underline) node = <u>{node}</u>;
  const href = safeHref(s.href);
  if (href) node = <a href={href} className="text-blue-700 underline">{node}</a>;
  return <>{node}</>;
};

const RichTextView: React.FC<{ blocks: RichTextBlock[] }> = ({ blocks }) => {
  if (!blocks.length) return <p className="text-sm text-gray-400 italic">None recorded</p>;
  return (
    <div className="space-y-1 text-sm text-gray-800">
      {blocks.map((b, i) => {
        const content = b.spans.map((s, j) => <Span key={j} s={s} />);
        if (b.type === "bullet")
          return <div key={i} className="flex gap-2 pl-2"><span>•</span><span>{content}</span></div>;
        if (b.type === "number")
          return <div key={i} className="flex gap-2 pl-2"><span>{i + 1}.</span><span>{content}</span></div>;
        return <p key={i}>{content}</p>;
      })}
    </div>
  );
};

export default RichTextView;
