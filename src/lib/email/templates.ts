const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function layout(heading: string, bodyHtml: string, button?: { label: string; href: string }) {
  return `<!doctype html><html><body style="margin:0;background:#F1EFEA;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#141414">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border:2px solid #141414" cellpadding="0" cellspacing="0">
<tr><td style="padding:20px 28px;border-bottom:2px solid #141414;font-weight:800;letter-spacing:1px;font-size:14px">THE <span style="color:#E82020">LEGENDS</span> FITNESS</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 14px;font-size:22px;line-height:1.2">${esc(heading)}</h1>
${bodyHtml}
${
  button
    ? `<p style="margin:24px 0"><a href="${esc(button.href)}" style="display:inline-block;background:#E82020;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 26px;font-size:15px">${esc(button.label)}</a></p>
<p style="font-size:13px;color:#5A5852;margin:0 0 6px">Button not working? Copy this link into your browser:</p>
<p style="font-size:12px;word-break:break-all;margin:0"><a href="${esc(button.href)}" style="color:#141414">${esc(button.href)}</a></p>`
    : ""
}
</td></tr>
<tr><td style="padding:16px 28px;background:#F1EFEA;font-size:12px;color:#5A5852">The Legends Fitness · Links Road, Nyali, Mombasa</td></tr>
</table></td></tr></table></body></html>`;
}

/** Password reset. Spells out exactly what happens next. */
export function resetPasswordEmail(opts: { link: string; name?: string }) {
  const hello = opts.name ? `Hi ${opts.name.split(" ")[0]},` : "Hi,";
  const html = layout(
    "Reset your password",
    `<p style="margin:0 0 12px;line-height:1.5">${esc(hello)}</p>
<p style="margin:0 0 12px;line-height:1.5">We got a request to reset the password on your Legends Fitness account.</p>
<ol style="margin:0 0 12px;padding-left:20px;line-height:1.6">
<li>Press the button below.</li>
<li>Type a new password (at least 8 characters) and press <strong>Save</strong>.</li>
<li>Sign in with your new password.</li></ol>
<p style="margin:0;line-height:1.5;font-size:14px;color:#5A5852">The link works once and expires in about an hour. If you didn't ask for this, ignore this email: your password stays the same.</p>`,
    { label: "Choose a new password", href: opts.link }
  );
  const text = `${hello}

We got a request to reset the password on your Legends Fitness account.

1. Open this link: ${opts.link}
2. Type a new password (at least 8 characters) and press Save.
3. Sign in with your new password.

The link works once and expires in about an hour. If you didn't ask for this, ignore this email: your password stays the same.

The Legends Fitness · Links Road, Nyali, Mombasa`;
  return { subject: "Reset your password — The Legends Fitness", html, text };
}

const fmtLong = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const first = (name?: string) => (name ? name.split(" ")[0] : "");

/** Sent when an admin accepts a payment. */
export function membershipApprovedEmail(opts: { name?: string; planName: string; startsOn: string; endsOn: string; amount: number }) {
  const hello = opts.name ? `Hi ${first(opts.name)},` : "Hi,";
  const html = layout(
    "You're in. Your membership is active",
    `<p style="margin:0 0 12px;line-height:1.5">${esc(hello)}</p>
<p style="margin:0 0 12px;line-height:1.5">Thank you. We've received your payment of <strong>KES ${opts.amount.toLocaleString("en-KE")}</strong> and your <strong>${esc(opts.planName)}</strong> membership is now active.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 12px;font-size:15px">
<tr><td style="padding:3px 18px 3px 0;color:#5A5852">Starts</td><td><strong>${esc(fmtLong(opts.startsOn))}</strong></td></tr>
<tr><td style="padding:3px 18px 3px 0;color:#5A5852">Ends</td><td><strong>${esc(fmtLong(opts.endsOn))}</strong></td></tr></table>
<p style="margin:0;line-height:1.5;font-size:14px;color:#5A5852">Just come in and the front desk will check you in. You can see your days and the timetable in your member account.</p>`
  );
  const text = `${hello}

Thank you. We've received your payment of KES ${opts.amount.toLocaleString("en-KE")} and your ${opts.planName} membership is now active.

Starts: ${fmtLong(opts.startsOn)}
Ends:   ${fmtLong(opts.endsOn)}

Just come in and the front desk will check you in. You can see your days and the timetable in your member account.

The Legends Fitness · Links Road, Nyali, Mombasa`;
  return { subject: "Your membership is active — The Legends Fitness", html, text };
}

/** Sent when an admin can't match a payment. */
export function paymentNotConfirmedEmail(opts: { name?: string; planName: string; reason: string }) {
  const hello = opts.name ? `Hi ${first(opts.name)},` : "Hi,";
  const html = layout(
    "We couldn't confirm your payment",
    `<p style="margin:0 0 12px;line-height:1.5">${esc(hello)}</p>
<p style="margin:0 0 12px;line-height:1.5">We weren't able to confirm the payment for your <strong>${esc(opts.planName)}</strong> request.</p>
<p style="margin:0 0 12px;line-height:1.5;border-left:4px solid #E82020;padding-left:12px">${esc(opts.reason)}</p>
<p style="margin:0;line-height:1.5;font-size:14px;color:#5A5852">If you've paid, please speak to the front desk with your M-Pesa message and we'll sort it out.</p>`
  );
  const text = `${hello}

We weren't able to confirm the payment for your ${opts.planName} request.

${opts.reason}

If you've paid, please speak to the front desk with your M-Pesa message and we'll sort it out.

The Legends Fitness · Links Road, Nyali, Mombasa`;
  return { subject: "We couldn't confirm your payment — The Legends Fitness", html, text };
}

/** Sent to the gym when a member presses "I've paid". */
export function paymentClaimedAlertEmail(opts: { memberName: string; planName: string; amount: number; mpesaName: string; orderNo: string; link: string }) {
  const html = layout(
    "A payment is waiting to be checked",
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 12px;font-size:15px">
<tr><td style="padding:3px 18px 3px 0;color:#5A5852">Member</td><td><strong>${esc(opts.memberName)}</strong></td></tr>
<tr><td style="padding:3px 18px 3px 0;color:#5A5852">M-Pesa name</td><td><strong>${esc(opts.mpesaName)}</strong></td></tr>
<tr><td style="padding:3px 18px 3px 0;color:#5A5852">Plan</td><td>${esc(opts.planName)}</td></tr>
<tr><td style="padding:3px 18px 3px 0;color:#5A5852">Amount</td><td>KES ${opts.amount.toLocaleString("en-KE")}</td></tr>
<tr><td style="padding:3px 18px 3px 0;color:#5A5852">Order</td><td>${esc(opts.orderNo)}</td></tr></table>`,
    { label: "Review payments", href: opts.link }
  );
  const text = `A payment is waiting to be checked

Member: ${opts.memberName}
M-Pesa name: ${opts.mpesaName}
Plan: ${opts.planName}
Amount: KES ${opts.amount.toLocaleString("en-KE")}
Order: ${opts.orderNo}

Review: ${opts.link}`;
  return { subject: `Payment to check: ${opts.memberName} (${opts.orderNo})`, html, text };
}

/** Sign-up confirmation. Spells out what happens next. */
export function confirmSignupEmail(opts: { link: string; name?: string }) {
  const hello = opts.name ? `Hi ${opts.name.split(" ")[0]},` : "Hi,";
  const html = layout(
    "Confirm your email",
    `<p style="margin:0 0 12px;line-height:1.5">${esc(hello)}</p>
<p style="margin:0 0 12px;line-height:1.5">Welcome to The Legends Fitness. One quick step to finish creating your account:</p>
<ol style="margin:0 0 12px;padding-left:20px;line-height:1.6">
<li>Press the button below.</li>
<li>On the page that opens, press <strong>Confirm my email</strong>.</li>
<li>You're signed in and ready to go.</li></ol>
<p style="margin:0;line-height:1.5;font-size:14px;color:#5A5852">The link works once and expires after about an hour. If it has expired, just sign up again to get a new one. If you didn't create an account, ignore this email.</p>`,
    { label: "Confirm my email", href: opts.link }
  );
  const text = `${hello}

Welcome to The Legends Fitness. One quick step to finish creating your account:

1. Open this link: ${opts.link}
2. On the page that opens, press "Confirm my email".
3. You're signed in and ready to go.

The link works once and expires after about an hour. If it has expired, just sign up again to get a new one. If you didn't create an account, ignore this email.

The Legends Fitness · Links Road, Nyali, Mombasa`;
  return { subject: "Confirm your email — The Legends Fitness", html, text };
}

/** Sent when someone signs up with an email that already has an account. */
export function alreadyMemberEmail(opts: { name?: string; signInLink: string; resetLink: string }) {
  const hello = opts.name ? `Hi ${opts.name.split(" ")[0]},` : "Hi,";
  const html = layout(
    "You already have an account",
    `<p style="margin:0 0 12px;line-height:1.5">${esc(hello)}</p>
<p style="margin:0 0 12px;line-height:1.5">Someone (hopefully you) tried to create a Legends Fitness account with this email address, but you already have one.</p>
<p style="margin:0 0 12px;line-height:1.5">Forgotten your password? <a href="${esc(opts.resetLink)}" style="color:#141414">Reset it here</a>.</p>
<p style="margin:0;line-height:1.5;font-size:14px;color:#5A5852">If this wasn't you, you can ignore this email: nothing has changed.</p>`,
    { label: "Sign in", href: opts.signInLink }
  );
  const text = `${hello}

Someone (hopefully you) tried to create a Legends Fitness account with this email address, but you already have one.

Sign in: ${opts.signInLink}
Forgotten your password? ${opts.resetLink}

If this wasn't you, you can ignore this email: nothing has changed.

The Legends Fitness · Links Road, Nyali, Mombasa`;
  return { subject: "You already have an account — The Legends Fitness", html, text };
}

/** Sent when an admin accepts the payment for a visitor's single-class booking. */
export function visitorBookingConfirmedEmail(opts: {
  name?: string; className: string; date: string; startsAt: string; endsAt: string;
  coach?: string | null; ladiesOnly?: boolean; bookingNo: string; amount: number; siteUrl: string;
}) {
  const hello = opts.name ? `Hi ${first(opts.name)},` : "Hi,";
  const when = `${fmtLong(opts.date)}, ${opts.startsAt}–${opts.endsAt}`;
  const html = layout(
    "You're booked in",
    `<p style="margin:0 0 12px;line-height:1.5">${esc(hello)}</p>
<p style="margin:0 0 12px;line-height:1.5">Thank you. We've received your payment of <strong>KES ${opts.amount.toLocaleString("en-KE")}</strong> and your spot is confirmed.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 12px;font-size:15px">
<tr><td style="padding:3px 18px 3px 0;color:#5A5852">Class</td><td><strong>${esc(opts.className)}${opts.ladiesOnly ? " (Ladies only)" : ""}</strong></td></tr>
<tr><td style="padding:3px 18px 3px 0;color:#5A5852">When</td><td><strong>${esc(when)}</strong></td></tr>${
      opts.coach ? `\n<tr><td style="padding:3px 18px 3px 0;color:#5A5852">Coach</td><td>${esc(opts.coach)}</td></tr>` : ""
    }
<tr><td style="padding:3px 18px 3px 0;color:#5A5852">Booking</td><td>${esc(opts.bookingNo)}</td></tr></table>
<ul style="margin:0 0 12px;padding-left:20px;line-height:1.6;font-size:14px">
<li>Arrive about 15 minutes early and tell the front desk your name.</li>
<li>Bring water, a towel and training shoes.</li>
<li>Can't make it? Please tell the front desk before the class.</li></ul>
<p style="margin:0;line-height:1.5;font-size:14px;color:#5A5852">The Legends Fitness is at Links Road, Nyali, Mombasa.</p>`,
    { label: "View my booking", href: opts.siteUrl }
  );
  const text = `${hello}

Thank you. We've received your payment of KES ${opts.amount.toLocaleString("en-KE")} and your spot is confirmed.

Class:   ${opts.className}${opts.ladiesOnly ? " (Ladies only)" : ""}
When:    ${when}${opts.coach ? `\nCoach:   ${opts.coach}` : ""}
Booking: ${opts.bookingNo}

- Arrive about 15 minutes early and tell the front desk your name.
- Bring water, a towel and training shoes.
- Can't make it? Please tell the front desk before the class.

View your booking: ${opts.siteUrl}

The Legends Fitness · Links Road, Nyali, Mombasa`;
  return { subject: `You're booked: ${opts.className} — The Legends Fitness`, html, text };
}

/** Sent 7 days and 1 day before a membership ends. */
export function membershipExpiringEmail(opts: { name?: string; planName: string; endsOn: string; daysLeft: number; renewUrl: string }) {
  const hello = opts.name ? `Hi ${first(opts.name)},` : "Hi,";
  const when = opts.daysLeft === 1 ? "tomorrow" : `in ${opts.daysLeft} days`;
  const html = layout(
    `Your membership ends ${when}`,
    `<p style="margin:0 0 12px;line-height:1.5">${esc(hello)}</p>
<p style="margin:0 0 12px;line-height:1.5">Your <strong>${esc(opts.planName)}</strong> membership at The Legends Fitness ends on <strong>${esc(fmtLong(opts.endsOn))}</strong>.</p>
<p style="margin:0;line-height:1.5;font-size:14px;color:#5A5852">Renew now and your next period starts the day after this one ends, so you lose no days.</p>`,
    { label: "Renew my membership", href: opts.renewUrl }
  );
  const text = `${hello}

Your ${opts.planName} membership at The Legends Fitness ends on ${fmtLong(opts.endsOn)}.

Renew now and your next period starts the day after this one ends, so you lose no days.

Renew: ${opts.renewUrl}

The Legends Fitness · Links Road, Nyali, Mombasa`;
  return { subject: `Your membership ends ${when} — The Legends Fitness`, html, text };
}
