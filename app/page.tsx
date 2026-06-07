"use client";

import { useState } from "react";
import styles from "./page.module.css";

type Status = "idle" | "loading" | "active" | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStart = async () => {
    // Disable button immediately
    setStatus("loading");
    setErrorMsg(null);

    try {
      // POST /api/browser/start — visible in DevTools Network tab
      const res = await fetch("/api/browser/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timestamp: Date.now() }),
      });

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}`);
      }

      const data = await res.json();

      // Save sessionId in state
      setSessionId(data.sessionId);
      setStatus("active");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setSessionId(null);
    setErrorMsg(null);
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

        {/* ── Main Button ── */}
        <button
          className={`${styles.button} ${status === "loading" ? styles.loading : ""} ${status === "active" ? styles.active : ""} ${status === "error" ? styles.error : ""}`}
          onClick={handleStart}
          disabled={status === "loading" || status === "active"}
        >
          {status === "idle" && (
            <><span className={styles.buttonIcon}>▶</span>Start Browser</>
          )}
          {status === "loading" && (
            <><span className={styles.spinner} />Initializing…</>
          )}
          {status === "active" && (
            <><span className={styles.buttonIcon}>●</span>Browser Running</>
          )}
          {status === "error" && (
            <><span className={styles.buttonIcon}>✕</span>Retry</>
          )}
        </button>

        {/* ── Session ID pill ── */}
        {status === "active" && sessionId && (
          <div className={styles.sessionBox}>
            <span className={styles.sessionLabel}>SESSION ID</span>
            <code className={styles.sessionId}>{sessionId}</code>
          </div>
        )}

        {/* ── Error message ── */}
        {status === "error" && errorMsg && (
          <p className={styles.errorMsg}>⚠ {errorMsg}</p>
        )}

        {/* ── Reset link when active ── */}
        {status === "active" && (
          <button className={styles.resetBtn} onClick={handleReset}>
            End session
          </button>
        )}
      </div>

      <p className={styles.footer}>
        {status === "active" ? "RUNNING" : "READY"}{" "}
        <span className={`${styles.dot} ${status === "active" ? styles.dotActive : ""}`} />
      </p>
    </main>
  );
}
