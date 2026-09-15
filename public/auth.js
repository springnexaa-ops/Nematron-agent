const TOKEN_KEY = "nexa.user.session";
const $ = (id) => document.getElementById(id);

function token() { return sessionStorage.getItem(TOKEN_KEY) || ""; }
function saveToken(v) { sessionStorage.setItem(TOKEN_KEY, v); }
function clearToken() { sessionStorage.removeItem(TOKEN_KEY); }
function setMessage(text, ok = false) { const e = $("message"); e.textContent = text || ""; e.className = "message " + (ok ? "ok" : ""); }
function escapeHtml(v) { return String(v ?? "").replace(/[&<>\"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m])); }

async function api(path, options = {}) {
  const headers = { "content-type": "application/json", ...(options.headers || {}) };
  if (token()) headers.authorization = `Bearer ${token()}`;
  return fetch(path, { ...options, headers, cache: "no-store" });
}

function show(mode) {
  const login = mode === "login";
  $("loginPanel").classList.toggle("hidden", !login);
  $("registerPanel").classList.toggle("hidden", login);
  $("loginTab").classList.toggle("active", login);
  $("registerTab").classList.toggle("active", !login);
  setMessage("");
}

async function register(e) {
  e.preventDefault();
  const name = $("regName").value.trim();
  const email = $("regEmail").value.trim();
  const password = $("regPassword").value;
  const role = $("regRole").value;
  if (password.length < 8) { setMessage("Password must contain at least 8 characters."); return; }
  setMessage("Submitting registration…");
  try {
    const r = await api("/v1/auth/register", { method: "POST", body: JSON.stringify({ name, email, password, role }) });
    const d = await r.json();
    if (!r.ok) { setMessage(d.error || "Registration failed."); return; }
    $("registerForm").reset();
    setMessage("Registration submitted. Your account must be accepted by the Nexa AI administrator before you can sign in.", true);
    setTimeout(() => show("login"), 1200);
  } catch { setMessage("Unable to reach Nexa AI."); }
}

async function login(e) {
  e.preventDefault();
  setMessage("Signing in…");
  try {
    const r = await api("/v1/auth/login", { method: "POST", body: JSON.stringify({ email: $("loginEmail").value.trim(), password: $("loginPassword").value }) });
    const d = await r.json();
    if (!r.ok) { setMessage(d.error || "Sign in failed."); return; }
    saveToken(d.token);
    location.href = "/";
  } catch { setMessage("Unable to reach Nexa AI."); }
}

async function boot() {
  if (!token()) return;
  try {
    const r = await api("/v1/auth/me");
    if (r.ok) {
      const d = await r.json();
      $("accountState").innerHTML = `<div class="signed"><strong>${escapeHtml(d.user.name)}</strong><span>${escapeHtml(d.user.email)}</span><button id="logout" class="ghost">Sign out</button></div>`;
      $("logout").onclick = async () => { try { await api("/v1/auth/logout", { method: "POST" }); } finally { clearToken(); location.reload(); } };
    } else clearToken();
  } catch {}
}

$("loginTab").onclick = () => show("login");
$("registerTab").onclick = () => show("register");
$("loginForm").onsubmit = login;
$("registerForm").onsubmit = register;
boot();
