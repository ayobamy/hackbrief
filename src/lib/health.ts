export type DatabaseHealth =
  | { status: "ok"; latencyMs: number }
  | { status: "down"; reason: "error" | "timeout" };

// Long enough for a fresh TLS connection to a Neon database that is waking from scale-to-zero, so
// that a 503 means the database failed rather than started slowly. Measured on 2 November 2026
// over a link with 240 ms round trips to Neon in us-east-1: 2.3 s for the first query, 0.24 s
// for the next.
export const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Runs `ping` against the database and reports whether it answered within `timeoutMs`.
 * Failures come back as a reason, never as the driver's message, which can name hosts and users.
 */
export async function checkDatabase(
  ping: () => Promise<unknown>,
  { timeoutMs = DEFAULT_TIMEOUT_MS, now = () => performance.now() } = {},
): Promise<DatabaseHealth> {
  const started = now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), timeoutMs);
  });

  try {
    const outcome = await Promise.race([
      ping().then(() => "ok" as const),
      timeout,
    ]);
    if (outcome === "timeout") {
      return { status: "down", reason: "timeout" };
    }
    return {
      status: "ok",
      latencyMs: Math.max(0, Math.round(now() - started)),
    };
  } catch (error) {
    console.error("Database health check failed", error);
    return { status: "down", reason: "error" };
  } finally {
    clearTimeout(timer);
  }
}
