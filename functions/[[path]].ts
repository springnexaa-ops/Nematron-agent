import worker, { type Env } from "../src/index";

/** Nexa AI Cloudflare Pages adapter. API routes use the existing backend; HTML gets the functional tab module. */
export const onRequest = async (context: any) => {
  const url = new URL(context.request.url);
  const isApi = url.pathname === "/health" || url.pathname.startsWith("/v1/");
  if (isApi) return worker.fetch(context.request, context.env as Env);

  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  const html = await response.text();
  const injected = html.includes('/tabs.js')
    ? html
    : html.replace('</body>', '<script src="/tabs.js"></script></body>');
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(injected, { status: response.status, statusText: response.statusText, headers });
};
