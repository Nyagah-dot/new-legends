import BosonMailClient from "@bosonware-ent/bosonmail";

/**
 * Sends email through the official BosonMail SDK. SERVER ONLY.
 *
 * Everything that sends email goes through this one function, so changing provider later means changing only this file.
 *  - The key comes from BOSONMAIL_API_KEY (the older name BOSON_MAIL_API_KEY still works, so nothing needs renaming in Railway).
 *  - The sender is the inbox behind the key. We never set "from".
 *  - 402 means the inbox is out of outbound email credits.
 *  - A network error or timeout is not retried, because we can't know if the email left (avoids duplicate emails).
 */
const apiKey = () => process.env.BOSONMAIL_API_KEY || process.env.BOSON_MAIL_API_KEY || "";
export const hasEmailEnv = Boolean(apiKey());

export type SendFailure = { recipient: string; error: string };
export type SendResult =
  | { ok: true; failed: SendFailure[]; messageId?: string; status?: string } // failed stays empty: the new API reports one result per message
  | { ok: false; error: string; code?: string }; // code e.g. "insufficient_credits", "unauthorized", "send_failed", "network", "not_configured"

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function codeFor(status: number | undefined): string {
  if (status === 402) return "insufficient_credits";
  if (status === 401 || status === 403) return "unauthorized";
  if (status === undefined) return "network";
  return "send_failed";
}

export async function sendEmail(input: { to: string | string[]; subject: string; html: string; text: string }): Promise<SendResult> {
  const key = apiKey();
  if (!key) return { ok: false, error: "Email isn't configured (BOSONMAIL_API_KEY).", code: "not_configured" };

  const client = new BosonMailClient({
    apiKey: key,
    baseUrl: process.env.BOSONMAIL_BASE_URL || undefined, // normally unset: the SDK default is right
    timeoutMs: 15_000, // never leave a member waiting on a slow mail server
  });
  const to = Array.isArray(input.to) ? input.to : [input.to];

  for (let attempt = 1; attempt <= 2; attempt++) {
    const r = await client.sendEmail(to, input.subject, { text: input.text, html: input.html || undefined });
    if (r.success) return { ok: true, failed: [], messageId: r.messageId ?? r.id, status: r.status };
    // 502 = upstream trouble before anything was sent: safe to try once more.
    if (r.statusCode === 502 && attempt === 1) {
      await sleep(800);
      continue;
    }
    return { ok: false, error: r.errorMessage ?? "Email could not be sent.", code: codeFor(r.statusCode) };
  }
  return { ok: false, error: "Email could not be sent.", code: "send_failed" };
}
