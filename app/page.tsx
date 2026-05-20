"use client";

import { useState } from "react";
import { Footer } from "@/components/Footer";
import { AgentEntryModal } from "@/components/AgentEntryModal";
import { Hero } from "@/components/Hero";
import { ResultPanel } from "@/components/ResultPanel";
import { ScrapeForm } from "@/components/ScrapeForm";
import { TopBar } from "@/components/TopBar";
import type { ScrapeResult } from "@/lib/types";
import { normalizeUrl } from "@/lib/validate-url";

type UiState = "empty" | "loading" | "populated" | "error";

export default function Page() {
  const [state, setState] = useState<UiState>("empty");
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [lastSubmittedUrl, setLastSubmittedUrl] = useState<string | null>(null);

  async function handleSubmit(rawUrl: string) {
    const url = normalizeUrl(rawUrl);
    if (!url) {
      setValidationError("Paste a full URL starting with http:// or https://.");
      return;
    }
    setValidationError(null);
    setLastSubmittedUrl(url);
    setState("loading");
    setResult(null);

    try {
      const resp = await fetch("/api/scrape", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await resp.json()) as ScrapeResult;
      setResult(data);
      setState(data.ok ? "populated" : "error");
    } catch (err) {
      setResult({
        ok: false,
        code: "UNKNOWN",
        message: "Couldn't reach the scraper. Check your connection and try again.",
        detail: err instanceof Error ? err.message : String(err),
      });
      setState("error");
    }
  }

  return (
    <>
      <AgentEntryModal />
      <TopBar />
      <main>
        <Hero />
        <ScrapeForm
          onSubmit={handleSubmit}
          isLoading={state === "loading"}
          validationError={validationError}
          clearValidation={() => setValidationError(null)}
        />
        <ResultPanel state={state} result={result} lastSubmittedUrl={lastSubmittedUrl} />
      </main>
      <Footer />
    </>
  );
}
