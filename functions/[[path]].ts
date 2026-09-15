import worker, { type Env } from "../src/index";

/**
 * Cloudflare Pages adapter for the existing Nexa AI Worker API.
 * Pages serves everything under /public; this function handles only API routes.
 */
export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const isApi = url.pathname === "/health" || url.pathname.startsWith("/v1/");
  if (!isApi) return context.next();

  // Pages exposes Worker bindings through context.env, so the existing
  // Nexa AI backend can run without a separate Worker deployment.
  return worker.fetch(context.request, context.env as unknown as Env);
};
