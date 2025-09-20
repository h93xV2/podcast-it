import { createExecutionContext, ProvidedEnv, waitOnExecutionContext } from "cloudflare:test";
import worker from "../src";

export async function call(
  env: ProvidedEnv,
  method: string,
  url: string,
  body?: unknown,
  headers: HeadersInit = {},
) {
  const ctx = createExecutionContext();
  const req = new Request(url, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const res = await worker.fetch(req, env, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}
