"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ScrapeForm.module.css";
import { ArrowRight, Spinner } from "./icons/ScraplingMark";

type Props = {
  onSubmit: (url: string) => void;
  isLoading: boolean;
  validationError: string | null;
  clearValidation: () => void;
};

export function ScrapeForm({ onSubmit, isLoading, validationError, clearValidation }: Props) {
  const [url, setUrl] = useState("");
  const [showLongRunning, setShowLongRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 15-second "taking longer than expected" message during loading.
  useEffect(() => {
    if (!isLoading) {
      setShowLongRunning(false);
      return;
    }
    const t = setTimeout(() => setShowLongRunning(true), 15_000);
    return () => clearTimeout(t);
  }, [isLoading]);

  // ⌘/Ctrl-K focuses the input — keyboard-shortcut hint matches this.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLoading) return;
    onSubmit(url);
  }

  const isInvalid = !!validationError;

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={`${styles.pill} ${isInvalid ? styles.pillInvalid : ""}`} data-loading={isLoading}>
        <input
          ref={inputRef}
          className={styles.input}
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="https://"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (isInvalid) clearValidation();
          }}
          aria-label="URL to scrape"
          aria-invalid={isInvalid}
          aria-describedby="scrape-hint"
          disabled={isLoading}
        />
        <button
          type="submit"
          className={styles.submit}
          disabled={isLoading || url.trim().length === 0}
          aria-label={isLoading ? "Scraping" : "Scrape"}
        >
          <span className={styles.submitLabel}>{isLoading ? "Scraping" : "Scrape"}</span>
          <span className={styles.submitCircle} aria-hidden>
            {isLoading ? <Spinner /> : <ArrowRight />}
          </span>
        </button>
      </div>

      <div id="scrape-hint" className={styles.hint} role="status">
        {isInvalid ? (
          <span className={styles.hintError}>{validationError}</span>
        ) : isLoading && showLongRunning ? (
          <span>Taking longer than usual. Heavy pages can take 20–30s with stealth on.</span>
        ) : isLoading ? (
          <span>Rendering the page with a stealth browser…</span>
        ) : (
          <span className={styles.hintShortcut}>
            <kbd className={styles.kbd}>⌘ K</kbd>
            <span>focuses the URL field</span>
          </span>
        )}
      </div>
    </form>
  );
}
