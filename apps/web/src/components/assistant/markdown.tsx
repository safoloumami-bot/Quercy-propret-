"use client";

import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  a({ href, children }) {
    if (href?.startsWith("/") && !href.startsWith("//"))
      return (
        <Link href={href} className="font-medium text-primary underline-offset-4 hover:underline">
          {children}
        </Link>
      );
    if (href && /^https?:\/\//.test(href))
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {children}
        </a>
      );
    return <span>{children}</span>;
  },
  table({ children }) {
    return (
      <div className="my-2 overflow-x-auto rounded-md border border-border">
        <table className="w-full text-xs">{children}</table>
      </div>
    );
  },
  th({ children }) {
    return (
      <th className="border-b border-border bg-muted/50 px-2 py-1 text-left font-medium">
        {children}
      </th>
    );
  },
  td({ children }) {
    return (
      <td className="border-b border-border px-2 py-1 tabular-nums last:border-b-0">{children}</td>
    );
  },
  img() {
    // Les images distantes ne sont jamais chargées depuis une réponse.
    return null;
  },
};

/** Réponse de l'assistant (Markdown), liens internes en navigation directe. */
export function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed break-words [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:text-xs [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-2 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
        {text}
      </ReactMarkdown>
    </div>
  );
}
