import { exec } from "child_process";
import { promisify } from "util";
import * as net from "net";

const execAsync = promisify(exec);

const DOCKER_IMAGE = "ghcr.io/browserless/chromium:latest";

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
 * Starts a Docker container running a headless Chromium browser.
 * Uses a random free host port to avoid port conflicts.
 * Returns { containerId, port }.
 */
export async function startBrowserContainer(): Promise<{ containerId: string; port: number }> {
  const port = await getFreePort();
  const containerName = `browser-session-${Date.now()}`;

  const command = [
    "docker run -d --rm",
    `-p ${port}:3000`,
    `--name ${containerName}`,
    DOCKER_IMAGE,
  ].join(" ");

  console.log("[docker] running:", command);

  const { stdout, stderr } = await execAsync(command);

  const containerId = stdout.trim();
  if (!containerId) {
    throw new Error(`Docker start failed: ${stderr.trim() || "empty container ID"}`);
  }

  console.log(`[docker] started container: ${containerId.slice(0, 12)} on port ${port}`);
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
