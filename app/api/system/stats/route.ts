import { NextResponse } from "next/server";
import * as os from "os";

export const dynamic = "force-dynamic";

/** Reads CPU idle/total times across all cores for two snapshots. */
function cpuSnapshot() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    for (const type of Object.values(cpu.times)) {
      total += type;
    }
    idle += cpu.times.idle;
  }
  return { idle, total };
}

// We keep the previous snapshot between requests to compute a delta.
let prevSnapshot = cpuSnapshot();
let prevTime = Date.now();

export async function GET() {
  // ── CPU ──────────────────────────────────────────────────────────
  const now = Date.now();
  const curr = cpuSnapshot();

  const idleDelta  = curr.idle  - prevSnapshot.idle;
  const totalDelta = curr.total - prevSnapshot.total;
  const cpuPct = totalDelta > 0
    ? Math.round((1 - idleDelta / totalDelta) * 100)
    : 0;

  prevSnapshot = curr;
  prevTime     = now;

  // ── RAM ──────────────────────────────────────────────────────────
  const totalMem = os.totalmem();
  const freeMem  = os.freemem();
  const usedMem  = totalMem - freeMem;

  const ramUsedGB  = +(usedMem  / 1024 ** 3).toFixed(1);
  const ramTotalGB = +(totalMem / 1024 ** 3).toFixed(1);
  const ramPct     = Math.round((usedMem / totalMem) * 100);

  return NextResponse.json({
    cpu:  { pct: cpuPct },
    ram:  { usedGB: ramUsedGB, totalGB: ramTotalGB, pct: ramPct },
  });
}
