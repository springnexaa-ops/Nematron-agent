import worker, { type Env } from "./index-v2";
import { clientIp, rateLimit } from "./security";

// Lightweight user administration layer. Data is kept in Worker memory until a
// durable Cloudflare D1/KV binding is configured; this keeps the feature deployable
// without requiring new infrastructure and makes the persistence boundary explicit.
type UserStatus = "pending" | "accepted" | "rejected";
type User = { id: string; name: string; email: string; role: string; status: UserStatus; createdAt: string; updatedAt: string };
const users = new Map<string, User>();

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" } });
}
function admin(request: Request, env: Env) {
  const auth = request.headers.get("authorization") || "";
  return !!env.ADMIN_TOKEN && auth === `Bearer ${env.ADMIN_TOKEN}`;
}
function clean(v: unknown, max = 160) { return typeof v === "string" ? v.trim().slice(0, max) : ""; }
function listUsers() { return [...users.values()].sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)); }
function makeId() { return `USR-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`; }

async function handleUserApi(request: Request, env: Env, url: URL): Promise<Response | null> {
  // Public registration creates a pending account for administrator review.
  if (url.pathname === "/v1/auth/register") {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const ip = clientIp(request);
    if (!rateLimit(`register:${ip}`, 8)) return json({ error: "Too many registration attempts. Try again later." }, 429);
    const b: any = await request.json().catch(() => ({}));
    const name = clean(b.name, 100), email = clean(b.email, 160).toLowerCase(), role = clean(b.role, 60) || "User";
    if (!name || !email || !email.includes("@")) return json({ error: "Name and a valid email are required." }, 400);
    if ([...users.values()].some(u => u.email === email)) return json({ error: "A registration already exists for this email." }, 409);
    const now = new Date().toISOString();
    const user: User = { id: makeId(), name, email, role, status: "pending", createdAt: now, updatedAt: now };
    users.set(user.id, user);
    return json({ ok: true, message: "Registration submitted for administrator approval.", user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status } }, 201);
  }

  if (!url.pathname.startsWith("/v1/admin/users")) return null;
  if (!admin(request, env)) return json({ error: "Unauthorized" }, 401);

  const suffix = url.pathname.slice("/v1/admin/users".length).replace(/^\//, "");
  if (request.method === "GET" && !suffix) return json({ ok: true, persistent: false, storage: "worker-memory", users: listUsers() });

  if (request.method === "POST" && !suffix) {
    const b: any = await request.json().catch(() => ({}));
    const name = clean(b.name, 100), email = clean(b.email, 160).toLowerCase(), role = clean(b.role, 60) || "User";
    if (!name || !email || !email.includes("@")) return json({ error: "Name and a valid email are required." }, 400);
    if ([...users.values()].some(u => u.email === email)) return json({ error: "A user with this email already exists." }, 409);
    const now = new Date().toISOString();
    const user: User = { id: makeId(), name, email, role, status: "pending", createdAt: now, updatedAt: now };
    users.set(user.id, user);
    return json({ ok: true, user }, 201);
  }

  if (!suffix) return json({ error: "Method not allowed" }, 405);
  const user = users.get(suffix);
  if (!user) return json({ error: "User not found" }, 404);

  if (request.method === "PATCH") {
    const b: any = await request.json().catch(() => ({}));
    if (b.name !== undefined) user.name = clean(b.name, 100) || user.name;
    if (b.email !== undefined) {
      const email = clean(b.email, 160).toLowerCase();
      if (!email.includes("@")) return json({ error: "Invalid email." }, 400);
      if ([...users.values()].some(u => u.id !== user.id && u.email === email)) return json({ error: "A user with this email already exists." }, 409);
      user.email = email;
    }
    if (b.role !== undefined) user.role = clean(b.role, 60) || user.role;
    if (["pending", "accepted", "rejected"].includes(b.status)) user.status = b.status;
    user.updatedAt = new Date().toISOString();
    return json({ ok: true, user });
  }
  if (request.method === "DELETE") { users.delete(user.id); return json({ ok: true, deleted: user.id }); }
  return json({ error: "Method not allowed" }, 405);
}

export default { async fetch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const userResponse = await handleUserApi(request, env, url);
  if (userResponse) return userResponse;
  return worker.fetch(request, env);
} };
