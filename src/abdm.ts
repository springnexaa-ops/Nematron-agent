export interface AbdmEnv {
  ABDM_BASE_URL?: string;
  ABDM_CLIENT_ID?: string;
  ABDM_CLIENT_SECRET?: string;
  ABDM_ACCESS_TOKEN?: string;
  ABDM_HPR_SEARCH_PATH?: string;
  ABDM_HFR_SEARCH_PATH?: string;
}

export type AbdmSearch = {
  q?: string;
  state?: string;
  district?: string;
  specialty?: string;
  page?: number;
  size?: number;
};

function authHeaders(env: AbdmEnv): Headers {
  const h = new Headers({ accept: "application/json", "content-type": "application/json" });
  if (env.ABDM_ACCESS_TOKEN) h.set("authorization", `Bearer ${env.ABDM_ACCESS_TOKEN}`);
  return h;
}

function configured(env: AbdmEnv): boolean {
  return Boolean(env.ABDM_BASE_URL && (env.ABDM_ACCESS_TOKEN || (env.ABDM_CLIENT_ID && env.ABDM_CLIENT_SECRET)));
}

async function searchRegistry(env: AbdmEnv, path: string, search: AbdmSearch): Promise<unknown> {
  if (!configured(env)) return { configured: false, records: [], message: "ABDM integration is not configured. Add official ABDM Sandbox/production credentials and approved registry endpoint paths." };
  const base = env.ABDM_BASE_URL!.replace(/\/$/, "");
  const url = new URL(`${base}/${path.replace(/^\//, "")}`);
  for (const [key, value] of Object.entries(search)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  const r = await fetch(url.toString(), { method: "GET", headers: authHeaders(env), signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error(`ABDM registry request failed: ${r.status}`);
  return r.json();
}

export async function searchHpr(env: AbdmEnv, search: AbdmSearch): Promise<unknown> {
  return searchRegistry(env, env.ABDM_HPR_SEARCH_PATH || "hpr/search", search);
}

export async function searchHfr(env: AbdmEnv, search: AbdmSearch): Promise<unknown> {
  return searchRegistry(env, env.ABDM_HFR_SEARCH_PATH || "hfr/search", search);
}

export function abdmStatus(env: AbdmEnv) {
  return {
    configured: configured(env),
    source: "Ayushman Bharat Digital Mission",
    registries: ["Healthcare Professionals Registry (HPR)", "Health Facility Registry (HFR)"],
    note: "Endpoint paths and credentials must come from the official ABDM Sandbox/production onboarding; no undocumented endpoint is assumed.",
  };
}
