"use client";

import { useId, useState } from "react";
import styles from "./Tabs.module.css";

export type TabSpec = {
  id: string;
  label: string;
  panel: React.ReactNode;
};

export function Tabs({ tabs, initial }: { tabs: TabSpec[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.id ?? "");
  const baseId = useId();

  return (
    <div className={styles.tabs}>
      <div role="tablist" aria-label="Result format" className={styles.list}>
        {tabs.map((t) => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${t.id}`}
              id={`${baseId}-tab-${t.id}`}
              tabIndex={selected ? 0 : -1}
              className={`${styles.tab} ${selected ? styles.tabActive : ""}`}
              onClick={() => setActive(t.id)}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${baseId}-panel-${t.id}`}
          aria-labelledby={`${baseId}-tab-${t.id}`}
          hidden={t.id !== active}
          className={styles.panel}
        >
          {t.panel}
        </div>
      ))}
    </div>
  );
}
