"use client";

import { memo, useMemo, useState } from "react";
import styles from "./JsonView.module.css";

// ---------------------------------------------------------------------------
// A small, restrained JSON tree view.
//
// • Collapsible objects/arrays with caret + count summary.
// • Long strings collapse past `longStringThreshold`.
// • Keys at the top level listed in `collapseKeys` start collapsed
//   (used for html/markdown/text — they're huge and noisy).
// • Palette is intentionally quiet — three hues only. No rainbow.
// ---------------------------------------------------------------------------

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

type Props = {
  data: unknown;
  collapseKeys?: string[];
  longStringThreshold?: number;
  defaultOpenDepth?: number;
};

export function JsonView({
  data,
  collapseKeys = ["html", "markdown", "text"],
  longStringThreshold = 240,
  defaultOpenDepth = 2,
}: Props) {
  return (
    <div className={styles.root}>
      <Node
        value={data as Json}
        depth={0}
        path=""
        collapseKeys={collapseKeys}
        longStringThreshold={longStringThreshold}
        defaultOpenDepth={defaultOpenDepth}
        isLast
      />
    </div>
  );
}

type NodeProps = {
  value: Json;
  depth: number;
  path: string; //  the parent key, used to look up collapseKeys
  keyName?: string;
  isLast: boolean;
  collapseKeys: string[];
  longStringThreshold: number;
  defaultOpenDepth: number;
};

const Node = memo(function Node(props: NodeProps) {
  const { value, depth, keyName, isLast, collapseKeys, longStringThreshold, defaultOpenDepth } = props;

  const initialOpen = useMemo(() => {
    if (keyName && collapseKeys.includes(keyName)) return false;
    return depth < defaultOpenDepth;
  }, [keyName, depth, collapseKeys, defaultOpenDepth]);

  const [open, setOpen] = useState(initialOpen);

  if (value === null) return <Line keyName={keyName} depth={depth} isLast={isLast}><Null /></Line>;

  if (typeof value === "string") {
    return (
      <Line keyName={keyName} depth={depth} isLast={isLast}>
        <StringValue value={value} threshold={longStringThreshold} />
      </Line>
    );
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return (
      <Line keyName={keyName} depth={depth} isLast={isLast}>
        <span className={typeof value === "number" ? styles.num : styles.bool}>{String(value)}</span>
      </Line>
    );
  }

  if (Array.isArray(value)) {
    const count = value.length;
    if (count === 0) {
      return (
        <Line keyName={keyName} depth={depth} isLast={isLast}>
          <span className={styles.punct}>[]</span>
        </Line>
      );
    }
    return (
      <div className={styles.container}>
        <div className={styles.row} style={{ paddingLeft: indent(depth) }}>
          <Caret open={open} onClick={() => setOpen((o) => !o)} />
          {keyName !== undefined && <KeyToken k={keyName} />}
          <span className={styles.punct}>[</span>
          {!open && (
            <>
              <button className={styles.summary} onClick={() => setOpen(true)}>
                {count} {count === 1 ? "item" : "items"}
              </button>
              <span className={styles.punct}>]{isLast ? "" : ","}</span>
            </>
          )}
        </div>
        {open && (
          <>
            {value.map((v, i) => (
              <Node
                key={i}
                value={v}
                depth={depth + 1}
                path={keyName ?? ""}
                isLast={i === count - 1}
                collapseKeys={collapseKeys}
                longStringThreshold={longStringThreshold}
                defaultOpenDepth={defaultOpenDepth}
              />
            ))}
            <div className={styles.row} style={{ paddingLeft: indent(depth) }}>
              <span className={styles.caretSpacer} />
              <span className={styles.punct}>]{isLast ? "" : ","}</span>
            </div>
          </>
        )}
      </div>
    );
  }

  // Object
  const entries = Object.entries(value);
  const count = entries.length;
  if (count === 0) {
    return (
      <Line keyName={keyName} depth={depth} isLast={isLast}>
        <span className={styles.punct}>{"{}"}</span>
      </Line>
    );
  }
  return (
    <div className={styles.container}>
      <div className={styles.row} style={{ paddingLeft: indent(depth) }}>
        <Caret open={open} onClick={() => setOpen((o) => !o)} />
        {keyName !== undefined && <KeyToken k={keyName} />}
        <span className={styles.punct}>{"{"}</span>
        {!open && (
          <>
            <button className={styles.summary} onClick={() => setOpen(true)}>
              {count} {count === 1 ? "key" : "keys"}
            </button>
            <span className={styles.punct}>{"}"}{isLast ? "" : ","}</span>
          </>
        )}
      </div>
      {open && (
        <>
          {entries.map(([k, v], i) => (
            <Node
              key={k}
              keyName={k}
              value={v as Json}
              depth={depth + 1}
              path={k}
              isLast={i === count - 1}
              collapseKeys={collapseKeys}
              longStringThreshold={longStringThreshold}
              defaultOpenDepth={defaultOpenDepth}
            />
          ))}
          <div className={styles.row} style={{ paddingLeft: indent(depth) }}>
            <span className={styles.caretSpacer} />
            <span className={styles.punct}>{"}"}{isLast ? "" : ","}</span>
          </div>
        </>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function indent(depth: number): string {
  return `${depth * 16}px`;
}

function Line({
  keyName,
  depth,
  isLast,
  children,
}: {
  keyName?: string;
  depth: number;
  isLast: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.row} style={{ paddingLeft: indent(depth) }}>
      <span className={styles.caretSpacer} />
      {keyName !== undefined && <KeyToken k={keyName} />}
      {children}
      <span className={styles.punct}>{isLast ? "" : ","}</span>
    </div>
  );
}

function KeyToken({ k }: { k: string }) {
  return (
    <>
      <span className={styles.key}>"{k}"</span>
      <span className={styles.punct}>:</span>
      <span className={styles.gap} />
    </>
  );
}

function Caret({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`${styles.caret} ${open ? styles.caretOpen : ""}`}
      onClick={onClick}
      aria-label={open ? "Collapse" : "Expand"}
      aria-expanded={open}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3.5 2.5L6.5 5L3.5 7.5" />
      </svg>
    </button>
  );
}

function Null() {
  return <span className={styles.nullVal}>null</span>;
}

function StringValue({ value, threshold }: { value: string; threshold: number }) {
  const tooLong = value.length > threshold;
  const [expanded, setExpanded] = useState(false);

  if (!tooLong || expanded) {
    return (
      <>
        <span className={styles.str}>
          "{escapeString(value)}"
        </span>
        {tooLong && (
          <button className={styles.collapseInline} onClick={() => setExpanded(false)}>
            collapse
          </button>
        )}
      </>
    );
  }
  const head = value.slice(0, threshold);
  const remaining = value.length - threshold;
  return (
    <>
      <span className={styles.str}>
        "{escapeString(head)}…"
      </span>
      <button className={styles.expandInline} onClick={() => setExpanded(true)}>
        +{remaining.toLocaleString()} chars
      </button>
    </>
  );
}

function escapeString(s: string): string {
  // For display only — show newlines as ↵ glyphs, tabs as · spaces.
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\t/g, "\\t");
}
