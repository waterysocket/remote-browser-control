"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./page.module.css";

type Status = "idle" | "loading" | "active" | "stopping" | "error";

const VIEWPORT_W = 1280;
const VIEWPORT_H = 800;

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [containerId, setContainerId] = useState<string | null>(null);
  const [port, setPort] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState("https://www.google.com");
  const [fps, setFps] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const evtSourceRef = useRef<EventSource | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fpsCounterRef = useRef({ count: 0, last: Date.now() });

  // ── Start session ──────────────────────────────────────────────
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
        throw new Error(body.error ?? `Server error ${res.status}`);
      }

      const data = await res.json();
      setSessionId(data.sessionId);
      setContainerId(data.containerId);
      setPort(data.port);
      setStatus("active");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  };

  // ── Stop session ───────────────────────────────────────────────
  const handleStop = async () => {
    if (!sessionId) return;
    evtSourceRef.current?.close();
    evtSourceRef.current = null;
    setStatus("stopping");

    try {
      const res = await fetch("/api/browser/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Stop failed ${res.status}`);
      }
      setSessionId(null);
      setContainerId(null);
      setPort(null);
      setStatus("idle");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  };

  // ── Start SSE stream when session is active ────────────────────
  useEffect(() => {
    if (status !== "active" || !sessionId) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    imgRef.current = img;

    const es = new EventSource(`/api/session/stream?sessionId=${sessionId}`);
    evtSourceRef.current = es;

    es.onmessage = (e) => {
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = `data:image/jpeg;base64,${e.data}`;
      // FPS tracking
      const fc = fpsCounterRef.current;
      fc.count++;
      const now = Date.now();
      if (now - fc.last >= 1000) {
        setFps(fc.count);
        fc.count = 0;
        fc.last = now;
      }
    };

    es.addEventListener("error", (e) => {
      console.error("[sse] stream error", e);
    });

    return () => {
      es.close();
    };
  }, [status, sessionId]);

  // ── Interact helpers ───────────────────────────────────────────
  const interact = useCallback(
    (payload: object) => {
      if (!sessionId) return;
      fetch("/api/session/interact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, ...payload }),
      }).catch(console.error);
    },
    [sessionId]
  );

  // Scale click coords from canvas CSS size → 1280×800 viewport
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = VIEWPORT_W / rect.width;
      const scaleY = VIEWPORT_H / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      interact({ type: "click", x, y });
    },
    [interact]
  );

  const handleCanvasScroll = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = VIEWPORT_W / rect.width;
      const scaleY = VIEWPORT_H / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      interact({ type: "scroll", x, y, deltaY: e.deltaY });
    },
    [interact]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      e.preventDefault();
      interact({ type: "key", key: e.key });
    },
    [interact]
  );

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    interact({ type: "navigate", url: currentUrl });
  };

  // ── Render ─────────────────────────────────────────────────────
  if (status === "idle" || status === "loading" || status === "error") {
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
          <p className={styles.subtitle}>Initialize a new browser session to begin your workflow.</p>

          <button
            className={`${styles.button} ${status === "loading" ? styles.loading : ""} ${status === "error" ? styles.error : ""}`}
            onClick={handleStart}
            disabled={status === "loading"}
          >
            {status === "idle"    && <><span className={styles.buttonIcon}>▶</span>Start Browser</>}
            {status === "loading" && <><span className={styles.spinner} />Starting Container…</>}
            {status === "error"   && <><span className={styles.buttonIcon}>✕</span>Retry</>}
          </button>

          {status === "error" && errorMsg && <p className={styles.errorMsg}>⚠ {errorMsg}</p>}
        </div>
        <p className={styles.footer}>READY <span className={styles.dot} /></p>
      </main>
    );
  }

  // ── Browser viewer ─────────────────────────────────────────────
  return (
    <main className={styles.viewerMain}>
      {/* Top bar */}
      <div className={styles.toolbar}>
        {/* Navigation buttons */}
        <div className={styles.navButtons}>
          <button
            className={styles.navBtn}
            onClick={() => interact({ type: "back" })}
            title="Go back"
          >
            ←
          </button>
          <button
            className={styles.navBtn}
            onClick={() => interact({ type: "forward" })}
            title="Go forward"
          >
            →
          </button>
          <button
            className={styles.navBtn}
            onClick={() => interact({ type: "reload" })}
            title="Reload"
          >
            ↻
          </button>
        </div>

        <div className={styles.sessionPill}>
          <span className={styles.dot} style={{ background: "var(--accent)" }} />
          <span>{containerId}</span>
          <span style={{ color: "var(--text-muted)" }}>:{port}</span>
        </div>

        <form className={styles.urlBar} onSubmit={handleNavigate}>
          <input
            className={styles.urlInput}
            value={currentUrl}
            onChange={(e) => setCurrentUrl(e.target.value)}
            placeholder="https://..."
            spellCheck={false}
          />
          <button type="submit" className={styles.goBtn}>Go</button>
        </form>

        {/* FPS indicator */}
        <div className={styles.fpsPill}>
          <span className={`${styles.dot} ${styles.dotActive}`} />
          <span>{fps} fps</span>
        </div>

        <button
          className={styles.stopBtnSmall}
          onClick={handleStop}
          disabled={status === "stopping"}
        >
          {status === "stopping" ? <span className={styles.spinner} /> : "■ Stop"}
        </button>
      </div>

      {/* Canvas viewport */}
      <div className={styles.canvasWrap} ref={containerRef}>
        <canvas
          ref={canvasRef}
          width={VIEWPORT_W}
          height={VIEWPORT_H}
          className={styles.browserCanvas}
          onClick={handleCanvasClick}
          onWheel={handleCanvasScroll}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        />
      </div>
    </main>
  );
}
