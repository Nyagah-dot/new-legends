/**
 * Sends email through the BosonMail API. SERVER ONLY.
 *
 * From Bosonware's documentation:
 *  - POST {base}/send-email, "Authorization: Bearer <key>" (the key needs the `email:send` scope).
 *  - Body: to (string or array), subject, and text and/or html. `from` is optional and must equal the
 *    authenticated inbox address, so we never send it: the sender is the inbox behind the key.
 *  - Limits: 20 requests per second per key, and at most 200 recipients per message.
 *  - 200 means sent, but per-recipient results can still include failures. 502 means it failed for everyone.
 *  - 402 means the inbox is out of outbound email credits.
 *
 * Everything that sends email goes through this one function, so changing provider later means changing only this file.
 */
export const hasEmailEnv = Boolean(process.env.BOSON_MAIL_API_KEY);

export type SendFailure = { recipient: string; error: string };
export type SendResult =
  | { ok: true; failed: SendFailure[] } // failed = recipients that didn't get it (empty when all delivered)
  | { ok: false; error: string; code?: string }; // code e.g. "insufficient_credits", "send_failed", "unauthorized"

type Body = {
  success?: boolean;
  message?: string;
  code?: string;
  error?: string | { code?: string; message?: string };
  data?: { results?: { recipient: string; success: boolean; error?: string }[] };
};

const DEFAULT_API_URL = "https://webmail.bosonware.com/api/v1";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Errors come in two shapes: { error: { code, message } } and, for 402, { error: "INSUFFICIENT_CREDITS", message, code }. */
function readError(body: Body, res: Response): { error: string; code?: string } {
  const nested = body.error && typeof body.error === "object" ? body.error : null;
  const code = nested?.code ?? body.code;
  const message = nested?.message ?? body.message ?? (typeof body.error === "string" ? body.error : undefined);
  return { error: message ?? `Bosonware responded with ${res.status} ${res.statusText}`.trim(), code };
}

export async function sendEmail(input: {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
}): Promise<SendResult> {
  const key = process.env.BOSON_MAIL_API_KEY;
  if (!key) return { ok: false, error: "Email isn't configured (BOSON_MAIL_API_KEY).", code: "not_configured" };
  const base = (process.env.BOSON_MAIL_API_URL || DEFAULT_API_URL).replace(/\/+$/, "");

  for (let attempt = 1; attempt <= 2; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${base}/send-email`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          to: Array.isArray(input.to) ? input.to : [input.to],
          subject: input.subject,
          text: input.text,
          html: input.html || undefined,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(15000), // never leave a member waiting on a slow mail server
      });
    } catch (e) {
      // Network error or timeout: we can't know whether it was sent, so we don't retry (avoids duplicate emails).
      return { ok: false, error: e instanceof Error ? e.message : "Network error while sending email.", code: "network" };
    }

    const body = (await res.json().catch(() => ({}))) as Body;

    // 502 = "failed for every recipient" (upstream trouble): safe to try once more.
    if (res.status === 502 && attempt === 1) {
      await sleep(800);
      continue;
    }

    if (!res.ok || body.success === false) return { ok: false, ...readError(body, res) };

    const results = body.data?.results ?? [];
    const failed = results.filter((r) => !r.success).map((r) => ({ recipient: r.recipient, error: r.error ?? "Delivery failed" }));
    if (results.length > 0 && failed.length === results.length) {
      return { ok: false, error: failed[0].error, code: "send_failed" };
    }
    if (failed.length > 0) console.warn("[email] some recipients did not receive it:", failed);
    return { ok: true, failed };
  }
  return { ok: false, error: "Email could not be sent.", code: "send_failed" };
}
