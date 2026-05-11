"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./MarkdownView.module.css";

type Props = {
  source: string;
};

export function MarkdownView({ source }: Props) {
  const [mode, setMode] = useState<"rendered" | "source">("rendered");

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar} role="tablist" aria-label="Markdown view mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "rendered"}
          className={`${styles.toggle} ${mode === "rendered" ? styles.toggleActive : ""}`}
          onClick={() => setMode("rendered")}
        >
          Rendered
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "source"}
          className={`${styles.toggle} ${mode === "source" ? styles.toggleActive : ""}`}
          onClick={() => setMode("source")}
        >
          Source
        </button>
      </div>

      {mode === "rendered" ? (
        <div className={styles.rendered}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ href, children, ...rest }) => (
                <a href={href} target="_blank" rel="noreferrer noopener" {...rest}>
                  {children}
                </a>
              ),
              img: ({ src, alt, title }) => (
                <img
                  src={typeof src === "string" ? src : undefined}
                  alt={alt ?? ""}
                  title={title}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className={styles.img}
                />
              ),
            }}
          >
            {source || "*No markdown content extracted from this page.*"}
          </ReactMarkdown>
        </div>
      ) : (
        <pre className={styles.source}><code>{source}</code></pre>
      )}
    </div>
  );
}
