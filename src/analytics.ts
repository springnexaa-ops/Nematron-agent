export interface AnalyticsEnv { NEXA_ANALYTICS?: { writeDataPoint: (point: { blobs?: string[]; doubles?: number[] }) => void } }

export function recordTraffic(env: AnalyticsEnv, event: string, path: string, ipHash: string, country = "unknown") {
  try {
    env.NEXA_ANALYTICS?.writeDataPoint({
      blobs: [event, path, ipHash, country],
      doubles: [1, Date.now()]
    });
  } catch {
    // Analytics must never interrupt the user request.
  }
}

export async function queryTraffic(env: { CF_ACCOUNT_ID?: string; CF_ANALYTICS_TOKEN?: string }, sql: string) {
  if (!env.CF_ACCOUNT_ID || !env.CF_ANALYTICS_TOKEN) throw new Error("analytics:not_configured");
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/analytics_engine/sql`, {
    method: "POST",
    headers: { "content-type": "text/plain", authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}` },
    body: sql
  });
  if (!r.ok) throw new Error(`analytics:${r.status}`);
  return r.json();
}

export function hashIp(ip: string) {
  // Privacy-preserving per-session identifier; the raw IP is never written to Analytics Engine.
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip)).then(b =>
    Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, "0")).join("").slice(0, 24)
  );
}
