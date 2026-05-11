"use client";

import { useState } from "react";
import styles from "./ResultPanel.module.css";
import { CopyIcon, ExternalIcon } from "./icons/ScraplingMark";
import { Tabs } from "./Tabs";
import type { ScrapeResult } from "@/lib/types";

type Props = {
  state: "empty" | "loading" | "populated" | "error";
  result: ScrapeResult | null;
  lastSubmittedUrl: string | null;
};

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={styles.copy}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          /* swallow — clipboard can fail on http or in iframes */
        }
      }}
    >
      <CopyIcon />
      <span>{copied ? "Copied" : label}</span>
    </button>
  );
}

function truncateUrl(u: string, max = 64): string {
  if (u.length <= max) return u;
  return u.slice(0, max - 1) + "…";
}

export function ResultPanel({ state, result, lastSubmittedUrl }: Props) {
  if (state === "empty") {
    return (
      <section aria-live="polite" className={styles.region}>
        <div className={styles.empty}>
          <h2 className={styles.emptyHead}>Nothing scraped yet.</h2>
          <p className={styles.emptyBody}>
            Paste any public URL above. You'll get back a structured JSON payload
            and a clean Markdown render — side by side.
          </p>
          <p className={`${styles.tip} mono`}>tip · works on JS-heavy and Cloudflare-fronted pages</p>
        </div>
      </section>
    );
  }

  if (state === "loading") {
    return (
      <section aria-live="polite" aria-busy="true" className={styles.region}>
        <div className={styles.loading}>
          <div className={styles.loadingBars}>
            <span /><span /><span />
          </div>
          <p className={styles.loadingText}>
            {lastSubmittedUrl ? truncateUrl(lastSubmittedUrl) : "Working…"}
          </p>
        </div>
      </section>
    );
  }

  if (state === "error" && result && result.ok === false) {
    return (
      <section aria-live="polite" className={styles.region}>
        <div className={styles.error}>
          <p className={styles.errorCode}>{result.code.replace(/_/g, " ")}</p>
          <h2 className={styles.errorHead}>{result.message}</h2>
          {lastSubmittedUrl && (
            <p className={styles.errorUrl}>
              <span className="mono">URL</span>
              <code>{truncateUrl(lastSubmittedUrl, 96)}</code>
            </p>
          )}
          {result.detail && (
            <details className={styles.errorDetail}>
              <summary>Developer detail</summary>
              <pre>{result.detail}</pre>
            </details>
          )}
        </div>
      </section>
    );
  }

  if (state === "populated" && result && result.ok === true) {
    const jsonStr = JSON.stringify(result, null, 2);
    return (
      <section aria-live="polite" className={styles.region}>
        <div className={styles.status}>
          <div className={styles.statusRow}>
            <span className={styles.statusKey}>URL</span>
            <a
              href={result.finalUrl}
              target="_blank"
              rel="noreferrer noopener"
              className={styles.statusUrl}
              title={result.finalUrl}
            >
              <span>{truncateUrl(result.finalUrl, 80)}</span>
              <ExternalIcon />
            </a>
          </div>
          <div className={styles.statusRow}>
            <span className={styles.statusKey}>Status</span>
            <span className={`${styles.statusVal} mono`}>{result.status}</span>
          </div>
          <div className={styles.statusRow}>
            <span className={styles.statusKey}>Fetcher</span>
            <span className={`${styles.statusVal} mono`}>{result.fetcher}</span>
          </div>
          <div className={styles.statusRow}>
            <span className={styles.statusKey}>Title</span>
            <span className={styles.statusVal} title={result.title ?? ""}>
              {result.title ? truncateUrl(result.title, 80) : "—"}
            </span>
          </div>
        </div>

        <Tabs
          initial="json"
          tabs={[
            {
              id: "json",
              label: "JSON",
              panel: (
                <div className={styles.codeBlockWrap}>
                  <div className={styles.codeToolbar}>
                    <span className={`${styles.codeMeta} mono`}>
                      {jsonStr.length.toLocaleString()} chars
                    </span>
                    <CopyButton text={jsonStr} />
                  </div>
                  <pre className={styles.codeBlock}><code>{jsonStr}</code></pre>
                </div>
              ),
            },
            {
              id: "markdown",
              label: "Markdown",
              panel: (
                <div className={styles.codeBlockWrap}>
                  <div className={styles.codeToolbar}>
                    <span className={`${styles.codeMeta} mono`}>
                      {result.markdown.length.toLocaleString()} chars
                    </span>
                    <CopyButton text={result.markdown} />
                  </div>
                  <pre className={styles.codeBlock}><code>{result.markdown}</code></pre>
                </div>
              ),
            },
          ]}
        />
      </section>
    );
  }

  return null;
}
