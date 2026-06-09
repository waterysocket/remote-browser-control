"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./page.module.css";

type Status = "idle" | "loading" | "active" | "stopping" | "error";

const VIEWPORT_W = 1280;
const VIEWPORT_H = 800;

interface FpsOption {
  label: string;
  tag: string;
  value: number;
}

const FPS_OPTIONS: FpsOption[] = [
  { value: 5,  tag: "Necessary",  label: "5 fps  — Necessary"  },
  { value: 10, tag: "Sufficient", label: "10 fps — Sufficient" },
  { value: 20, tag: "Ideal",      label: "20 fps — Ideal"      },
  { value: 30, tag: "Smooth",     label: "30 fps — Smooth"     },
  { value: 60, tag: "Too Much",   label: "60 fps — Too Much"   },
];

interface SystemStats {
  cpu:  { pct: number };
  ram:  { usedGB: number; totalGB: number; pct: number };
}

export default function Home() {
  const [status,      setStatus]      = useState<Status>("idle");
  const [sessionId,   setSessionId]   = useState<string | null>(null);
  const [containerId, setContainerId] = useState<string | null>(null);
  const [port,        setPort]        = useState<number | null>(null);
  const [errorMsg,    setErrorMsg]    = useState<string | null>(null);
  const [currentUrl,  setCurrentUrl]  = useState("https://www.google.com");
  const [selectedFps, setSelectedFps] = useState<FpsOption>(FPS_OPTIONS[2]); // default: Ideal
  const [fps,         setFps]         = useState(0);
  const [sysStats,    setSysStats]    = useState<SystemStats | null>(null);

  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const imgRef         = useRef<HTMLImageElement | null>(null);
  const evtSourceRef   = useRef<EventSource | null>(null);
  const containerRef   = useRef<HTMLDivElement>(null);
  const fpsCounterRef  = useRef({ count: 0, last: Date.now() });
  const statsTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch system stats ─────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res  = await fetch("/api/system/stats");
      if (!res.ok) return;
      const data = await res.json() as SystemStats;
      setSysStats(data);
    } catch { /* silently ignore */ }
  }, []);

  // Poll stats every 2 s while a session is active
  useEffect(() => {
    if (status === "active") {
      fetchStats();
      statsTimerRef.current = setInterval(fetchStats, 2000);
    } else {
      if (statsTimerRef.current) {
        clearInterval(statsTimerRef.current);
        statsTimerRef.current = null;
      }
      setSysStats(null);
    }
    return () => {
      if (statsTimerRef.current) clearInterval(statsTimerRef.current);
    };
  }, [status, fetchStats]);

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
        throw new Error((body as { error?: string }).error ?? `Server error ${res.status}`);
      }

      const data = await res.json() as { sessionId: string; containerId: string; port: number };
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
        throw new Error((body as { error?: string }).error ?? `Stop failed ${res.status}`);
      }
      setSessionId(null);
      setContainerId(null);
      setPort(null);
      setFps(0);
      setStatus("idle");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  };

  // ── Start SSE stream when session becomes active ───────────────
  useEffect(() => {
    if (status !== "active" || !sessionId) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    imgRef.current = img;

    // Pass the chosen FPS to the stream endpoint
    const es = new EventSource(
      `/api/session/stream?sessionId=${sessionId}&fps=${selectedFps.value}`
    );
    evtSourceRef.current = es;

    // Reset FPS counter
    fpsCounterRef.current = { count: 0, last: Date.now() };

    es.onmessage = (e) => {
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = `data:image/jpeg;base64,${e.data}`;

      // Track actual received FPS
      const fc = fpsCounterRef.current;
      fc.count++;
      const now = Date.now();
      if (now - fc.last >= 1000) {
        setFps(fc.count);
        fc.count = 0;
        fc.last  = now;
      }
    };

    es.addEventListener("error", (e) => {
      console.error("[sse] stream error", e);
    });

    return () => {
      es.close();
    };
  }, [status, sessionId, selectedFps]);

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

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect   = canvas.getBoundingClientRect();
      const scaleX = VIEWPORT_W / rect.width;
      const scaleY = VIEWPORT_H / rect.height;
      interact({ type: "click", x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY });
    },
    [interact]
  );

  const handleCanvasScroll = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect   = canvas.getBoundingClientRect();
      const scaleX = VIEWPORT_W / rect.width;
      const scaleY = VIEWPORT_H / rect.height;
      interact({ type: "scroll", x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY, deltaY: e.deltaY });
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

  // ── Helper: colour ramp for % values ──────────────────────────
  const pctColor = (pct: number) =>
    pct >= 85 ? "#ff6b6b" : pct >= 60 ? "#f5a623" : "var(--accent)";

  // ── Idle / loading / error screen ─────────────────────────────
  if (status === "idle" || status === "loading" || status === "error") {
    return (
      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.badge}>v1.0.0</div>
          <div className={styles.icon} aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="16" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="18" cy="18" r="6"  stroke="currentColor" strokeWidth="1.5" />
              <line x1="18" y1="2"  x2="18" y2="12" stroke="currentColor" strokeWidth="1.5" />
              <line x1="18" y1="24" x2="18" y2="34" stroke="currentColor" strokeWidth="1.5" />
              <line x1="2"  y1="18" x2="12" y2="18" stroke="currentColor" strokeWidth="1.5" />
              <line x1="24" y1="18" x2="34" y2="18" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
          <h1 className={styles.title}>Browser Session</h1>
          <p className={styles.subtitle}>Initialize a new browser session to begin your workflow.</p>

          {/* FPS selector */}
          <div className={styles.fpsSelector}>
            <label className={styles.fpsLabel}>STREAM QUALITY</label>
            <div className={styles.fpsOptions}>
              {FPS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`${styles.fpsOption} ${selectedFps.value === opt.value ? styles.fpsOptionActive : ""}`}
                  onClick={() => setSelectedFps(opt)}
                  type="button"
                >
                  <span className={styles.fpsTag}>{opt.tag}</span>
                  <span className={styles.fpsValue}>{opt.value} fps</span>
                </button>
              ))}
            </div>
          </div>

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

      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>

        {/* Navigation buttons */}
        <div className={styles.navButtons}>
          <button className={styles.navBtn} onClick={() => interact({ type: "back" })}    title="Go back">←</button>
          <button className={styles.navBtn} onClick={() => interact({ type: "forward" })} title="Go forward">→</button>
          <button className={styles.navBtn} onClick={() => interact({ type: "reload" })}  title="Reload">↻</button>
        </div>

        {/* Session pill */}
        <div className={styles.sessionPill}>
          <span className={styles.dot} style={{ background: "var(--accent)" }} />
          <span>{containerId}</span>
          <span style={{ color: "var(--text-muted)" }}>:{port}</span>
        </div>

        {/* URL bar */}
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
          <span className={styles.fpsPillTag}>{selectedFps.tag}</span>
        </div>

        {/* System stats */}
        {sysStats && (
          <div className={styles.statsPill}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>CPU</span>
              <span className={styles.statValue} style={{ color: pctColor(sysStats.cpu.pct) }}>
                {sysStats.cpu.pct}%
              </span>
              <div className={styles.statBar}>
                <div
                  className={styles.statBarFill}
                  style={{ width: `${sysStats.cpu.pct}%`, background: pctColor(sysStats.cpu.pct) }}
                />
              </div>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statLabel}>RAM</span>
              <span className={styles.statValue} style={{ color: pctColor(sysStats.ram.pct) }}>
                {sysStats.ram.usedGB}&thinsp;/&thinsp;{sysStats.ram.totalGB} GB
              </span>
              <div className={styles.statBar}>
                <div
                  className={styles.statBarFill}
                  style={{ width: `${sysStats.ram.pct}%`, background: pctColor(sysStats.ram.pct) }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Stop button */}
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
