"use client";

import { useEffect, useState } from "react";
import styles from "./AgentEntryModal.module.css";
import { CopyIcon, ExternalIcon } from "./icons/ScraplingMark";

const STORAGE_KEY = "scrappling-entry-mode-v1";
const FALLBACK_GUIDE = `# Scrappling Agents

Use POST /api/scrape with JSON:

{
  "url": "https://example.com"
}

Check result.ok. Prefer result.markdown for agent context.

Read /llms.txt and /llms-full.txt for the full machine-readable guide.`;

type Step = "choice" | "agent";

export function AgentEntryModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>("choice");
  const [guide, setGuide] = useState(FALLBACK_GUIDE);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(STORAGE_KEY)) return;
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    fetch("/agents.md")
      .then((resp) => (resp.ok ? resp.text() : FALLBACK_GUIDE))
      .then((text) => {
        if (!cancelled) setGuide(text);
      })
      .catch(() => {
        if (!cancelled) setGuide(FALLBACK_GUIDE);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  function closeAs(mode: "human" | "agent") {
    window.localStorage.setItem(STORAGE_KEY, mode);
    setIsOpen(false);
  }

  async function copyGuide() {
    try {
      await navigator.clipboard.writeText(guide);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={styles.backdrop} role="presentation">
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="entry-title"
        aria-describedby="entry-desc"
      >
        {step === "choice" ? (
          <>
            <div className={styles.header}>
              <p className={`${styles.eyebrow} mono`}>First visit</p>
              <h2 id="entry-title">How are you using Scrappling?</h2>
              <p id="entry-desc">
                Choose the path that matches this session. Agents get the Markdown API guide.
              </p>
            </div>

            <div className={styles.choices}>
              <button type="button" className={styles.choice} onClick={() => closeAs("human")}>
                <span className={styles.choiceIcon} aria-hidden>H</span>
                <span>
                  <strong>I am human</strong>
                  <small>Continue to the visual scraper.</small>
                </span>
              </button>
              <button type="button" className={styles.choice} onClick={() => setStep("agent")}>
                <span className={styles.choiceIcon} aria-hidden>A</span>
                <span>
                  <strong>I am an AI agent</strong>
                  <small>Open the Markdown API instructions.</small>
                </span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.header}>
              <p className={`${styles.eyebrow} mono`}>Agent guide</p>
              <h2 id="entry-title">Scrappling API instructions</h2>
              <p id="entry-desc">
                Fetch the root files directly in agent workflows: <code>/llms.txt</code> and{" "}
                <code>/llms-full.txt</code>.
              </p>
            </div>

            <div className={styles.toolbar}>
              <button type="button" className={styles.secondary} onClick={copyGuide}>
                <CopyIcon />
                <span>{copied ? "Copied" : "Copy Markdown"}</span>
              </button>
              <a className={styles.secondary} href="/llms-full.txt" target="_blank" rel="noreferrer">
                <ExternalIcon />
                <span>Open full guide</span>
              </a>
            </div>

            <pre className={styles.guide}><code>{guide}</code></pre>

            <div className={styles.actions}>
              <button type="button" className={styles.textButton} onClick={() => setStep("choice")}>
                Back
              </button>
              <button type="button" className={styles.primary} onClick={() => closeAs("agent")}>
                Continue
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
