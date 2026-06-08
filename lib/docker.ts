import { exec } from "child_process";
import { promisify } from "util";
import * as net from "net";
import * as http from "http";

const execAsync = promisify(exec);

const DOCKER_IMAGE = "ghcr.io/browserless/chromium:latest";

// A fixed token is required by Browserless — the same value must be passed
// in the WebSocket URL when Playwright connects.
// Override via BROWSERLESS_TOKEN env var in production.
export const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN ?? "local";

/** Finds a free TCP port on the host */
function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : null;
      srv.close(() => {
        if (port) resolve(port);
        else reject(new Error("Could not get free port"));
      });
    });
  });
}

/**
 * Polls the Browserless /json/version endpoint until it responds with 200,
 * meaning Chromium is ready to accept CDP connections.
 */
export function waitForBrowserReady(
  port: number,
  timeout = 30_000,
  interval = 500
): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout;

    function attempt() {
      const req = http.get(
        { hostname: "localhost", port, path: "/json/version", timeout: 2000 },
        (res) => {
          if (res.statusCode === 200) {
            console.log(`[docker] browser ready on port ${port}`);
            resolve();
          } else {
            retry();
          }
        }
      );
      req.on("error", retry);
      req.on("timeout", () => {
        req.destroy();
        retry();
      });
    }

    function retry() {
      if (Date.now() >= deadline) {
        reject(
          new Error(
            `Browser container on port ${port} did not become ready within ${timeout}ms`
          )
        );
      } else {
        setTimeout(attempt, interval);
      }
    }

    attempt();
  });
}

/**
 * Starts a Docker container running a headless Chromium browser.
 * Returns { containerId, port }.
 */
export async function startBrowserContainer(): Promise<{
  containerId: string;
  port: number;
}> {
  const port = await getFreePort();
  const containerName = `browser-session-${Date.now()}`;

  const command = [
    "docker run -d --rm",
    `-p ${port}:3000`,
    `--name ${containerName}`,
    // Keep the session alive for up to 10 minutes of total time,
    // and allow unlimited inactivity (no idle disconnect).
    `-e TIMEOUT=600000`,
    `-e IDLE_TIMEOUT=0`,
    // Token must match what Playwright passes in the WebSocket URL.
    `-e TOKEN=${BROWSERLESS_TOKEN}`,
    // Only one session per container (1:1 model).
    `-e CONCURRENT=1`,
    DOCKER_IMAGE,
  ].join(" ");

  console.log("[docker] running:", command);

  const { stdout, stderr } = await execAsync(command);

  const containerId = stdout.trim();
  if (!containerId) {
    throw new Error(
      `Docker start failed: ${stderr.trim() || "empty container ID"}`
    );
  }

  console.log(
    `[docker] started container: ${containerId.slice(0, 12)} on port ${port}`
  );
  return { containerId, port };
}

/**
 * Stops a running container by its full or short ID.
 */
export async function stopBrowserContainer(containerId: string): Promise<void> {
  const shortId = containerId.slice(0, 12);
  console.log("[docker] stopping container:", shortId);
  const { stdout, stderr } = await execAsync(`docker stop ${shortId}`);
  console.log("[docker] stop stdout:", stdout.trim());
  if (stderr) console.warn("[docker] stop stderr:", stderr.trim());
}