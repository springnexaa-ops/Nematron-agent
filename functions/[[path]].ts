import worker, { type Env } from "../src/index";

/** Nexa AI Cloudflare Pages adapter. */
export const onRequest = async (context: any) => {
  const url = new URL(context.request.url);
  const isApi = url.pathname === "/health" || url.pathname.startsWith("/v1/");
  if (!isApi) return context.next();
  return worker.fetch(context.request, context.env as Env);
};
