"use client";

import { useState } from "react";
import styles from "./page.module.css";

export default function Home() {
  const [status, setStatus] = useState<"idle" | "loading" | "active">("idle");

  const handleStart = () => {
    setStatus("loading");
    setTimeout(() => setStatus("active"), 1800);
  };

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <div className={styles.badge}>v1.0.0</div>

        <div className={styles.icon} aria-hidden="true">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="16" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="18" cy="18" r="6" stroke="currentColor" strokeWidth="1.5" />
            <line x1="18" y1="2" x2="18" y2="12" stroke="currentColor" strokeWidth="1.5" />
            <line x1="18" y1="24" x2="18" y2="34" stroke="currentColor" strokeWidth="1.5" />
            <line x1="2" y1="18" x2="12" y2="18" stroke="currentColor" strokeWidth="1.5" />
            <line x1="24" y1="18" x2="34" y2="18" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>

        <h1 className={styles.title}>Browser Session</h1>
        <p className={styles.subtitle}>
          Initialize a new browser session to begin your workflow.
        </p>

        <button
          className={`${styles.button} ${status === "loading" ? styles.loading : ""} ${status === "active" ? styles.active : ""}`}
          onClick={handleStart}
          disabled={status !== "idle"}
        >
          {status === "idle" && (
            <>
              <span className={styles.buttonIcon}>▶</span>
              Start Browser
            </>
          )}
          {status === "loading" && (
            <>
              <span className={styles.spinner} />
              Initializing…
            </>
          )}
          {status === "active" && (
            <>
              <span className={styles.buttonIcon}>●</span>
              Session Active
            </>
          )}
        </button>

        {status === "active" && (
          <p className={styles.hint}>
            Browser session is running. Close the tab to end it.
          </p>
        )}
      </div>

      <p className={styles.footer}>
        READY <span className={styles.dot} />
      </p>
    </main>
  );
}
