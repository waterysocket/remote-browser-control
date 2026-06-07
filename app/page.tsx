"use client";

import { useState } from "react";
import styles from "./page.module.css";

type Status = "idle" | "loading" | "active" | "stopping" | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [containerId, setContainerId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStart = async () => {
    setStatus("loading");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/browser/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timestamp: Date.now() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server responded with ${res.status}`);
      }

      const data = await res.json();
      setSessionId(data.sessionId);
      setContainerId(data.containerId);
      setStatus("active");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  };

  const handleStop = async () => {
    if (!sessionId) return;
    setStatus("stopping");

    try {
      const res = await fetch("/api/browser/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Stop failed with ${res.status}`);
      }

      setSessionId(null);
      setContainerId(null);
      setStatus("idle");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
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
          className={`${styles.button} ${status === "loading" ? styles.loading : ""} ${status === "active" ? styles.active : ""} ${status === "error" ? styles.error : ""} ${status === "stopping" ? styles.loading : ""}`}
          onClick={status === "idle" || status === "error" ? handleStart : undefined}
          disabled={status === "loading" || status === "active" || status === "stopping"}
        >
          {status === "idle"     && <><span className={styles.buttonIcon}>▶</span>Start Browser</>}
          {status === "loading"  && <><span className={styles.spinner} />Starting Container…</>}
          {status === "active"   && <><span className={styles.buttonIcon}>●</span>Browser Running</>}
          {status === "stopping" && <><span className={styles.spinner} />Stopping…</>}
          {status === "error"    && <><span className={styles.buttonIcon}>✕</span>Retry</>}
        </button>

        {/* ── Session + Container info ── */}
        {status === "active" && sessionId && (
          <div className={styles.sessionBox}>
            <div className={styles.sessionRow}>
              <span className={styles.sessionLabel}>SESSION ID</span>
              <code className={styles.sessionId}>{sessionId}</code>
            </div>
            {containerId && (
              <div className={styles.sessionRow}>
                <span className={styles.sessionLabel}>CONTAINER ID</span>
                <code className={styles.sessionId}>{containerId}</code>
              </div>
            )}
          </div>
        )}

        {/* ── Error message ── */}
        {status === "error" && errorMsg && (
          <p className={styles.errorMsg}>⚠ {errorMsg}</p>
        )}

        {/* ── Stop button when active ── */}
        {status === "active" && (
          <button className={styles.stopBtn} onClick={handleStop}>
            ■ Stop &amp; Kill Container
          </button>
        )}
      </div>

      <p className={styles.footer}>
        {status === "active" ? "RUNNING" : status === "stopping" ? "STOPPING" : "READY"}{" "}
        <span className={`${styles.dot} ${status === "active" ? styles.dotActive : ""}`} />
      </p>
    </main>
  );
}
