/**
 * tcl-email.ts
 * All transactional email templates and the shared sendEmail() helper.
 * Runs server-side only (Cloudflare Workers via Resend API).
 */

// ─── Shared send helper ───────────────────────────────────────────────────────

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resendApiKey = process.env.RESEND_API_KEY ?? "";
  const emailFrom = process.env.EMAIL_FROM ?? "TCL Babcock <no-reply@tclbabcock.com>";

  if (!resendApiKey) {
    console.warn("RESEND_API_KEY not set — skipping email");
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("Resend error:", res.status, body);
      return { ok: false, error: `Email API error ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("sendEmail network error:", err);
    return { ok: false, error: "Network error sending email" };
  }
}

// ─── Shared layout wrapper ────────────────────────────────────────────────────

function emailLayout(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#0b0b10;font-family:'Segoe UI',Arial,sans-serif;color:#e0e0e0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b10;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#13131a;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:28px 32px;text-align:center;">
            <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:10px;padding:8px 18px;font-size:22px;font-weight:800;letter-spacing:3px;color:#fff;">TCL</div>
            <p style="margin:10px 0 0;color:rgba(255,255,255,0.8);font-size:12px;letter-spacing:1px;text-transform:uppercase;">The Campus Lifestyle · Babcock University</p>
          </td>
        </tr>

        <!-- Body -->
        <tr><td style="padding:32px;">${bodyHtml}</td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:14px 32px;background:rgba(0,0,0,0.25);text-align:center;">
            <p style="margin:0;font-size:11px;color:#444;">TCL Babcock · Babcock University, Ilishan-Remo, Ogun State, Nigeria</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Template 1: Application approved ────────────────────────────────────────

export function buildApprovalEmail(opts: {
  toName: string;
  committeeName: string;
  waGcLink: string;
}): { subject: string; html: string; text: string } {
  const firstName = opts.toName.split(" ")[0];
  const subject = `🎉 You've been accepted to TCL Babcock — ${opts.committeeName}`;

  const html = emailLayout(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;">🎉 You're in, ${firstName}!</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#b0b0c0;">
      Your application to the <strong style="color:#a855f7;">${opts.committeeName}</strong> has been reviewed and
      <strong style="color:#4ade80;">approved</strong>. Welcome to The Campus Lifestyle —
      Babcock's premier creative community.
    </p>

    <div style="background:rgba(168,85,247,0.08);border:1px solid rgba(168,85,247,0.25);border-radius:12px;padding:24px;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:12px;color:#a855f7;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Next step</p>
      <p style="margin:0 0 18px;font-size:14px;color:#d0d0e0;line-height:1.6;">
        Join the TCL Babcock WhatsApp community — this is where announcements,
        committee channels and member opportunities live.
      </p>
      <a href="${opts.waGcLink}"
         style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:13px 28px;border-radius:10px;">
        Join the Community Group →
      </a>
    </div>

    <p style="margin:0 0 6px;font-size:13px;color:#666;">If the button doesn't open, paste this link into your browser:</p>
    <p style="margin:0 0 24px;font-size:13px;word-break:break-all;">
      <a href="${opts.waGcLink}" style="color:#a855f7;">${opts.waGcLink}</a>
    </p>

    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0 0 20px;" />
    <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">
      Questions? Reply to this email or reach out to the TCL admin team on WhatsApp.<br />— The TCL Babcock Team
    </p>
  `);

  const text = [
    `Hi ${firstName},`,
    ``,
    `Great news — your application to the ${opts.committeeName} at TCL Babcock has been approved!`,
    ``,
    `Join the TCL Babcock WhatsApp community group here:`,
    opts.waGcLink,
    ``,
    `Questions? Reply to this email or reach out to the TCL admin team.`,
    `— The TCL Babcock Team`,
  ].join("\n");

  return { subject, html, text };
}

// ─── Template 2: Application declined ────────────────────────────────────────

export function buildDeclinedEmail(opts: {
  toName: string;
  committeeName: string;
}): { subject: string; html: string; text: string } {
  const firstName = opts.toName.split(" ")[0];
  const subject = `Your TCL Babcock application — ${opts.committeeName}`;

  const html = emailLayout(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;">Hi ${firstName},</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#b0b0c0;">
      Thank you for applying to the <strong style="color:#a855f7;">${opts.committeeName}</strong> at TCL Babcock.
      After careful review, we are not moving forward with your application at this time.
    </p>

    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:14px;color:#d0d0e0;line-height:1.6;">
        We receive many talented applicants and competition is tough. This decision doesn't reflect on your
        abilities — we encourage you to keep creating, growing, and applying again in a future cycle.
      </p>
      <p style="margin:0;font-size:14px;color:#d0d0e0;line-height:1.6;">
        Watch out for the next TCL open application season and come back stronger. 💜
      </p>
    </div>

    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0 0 20px;" />
    <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">
      If you have questions, reply to this email.<br />— The TCL Babcock Team
    </p>
  `);

  const text = [
    `Hi ${firstName},`,
    ``,
    `Thank you for applying to the ${opts.committeeName} at TCL Babcock.`,
    `After careful review, we are not moving forward with your application at this time.`,
    ``,
    `This decision doesn't reflect on your abilities. We encourage you to keep creating and apply again in a future cycle.`,
    ``,
    `Questions? Reply to this email.`,
    `— The TCL Babcock Team`,
  ].join("\n");

  return { subject, html, text };
}

// ─── Template 3: Booking confirmed ───────────────────────────────────────────

export function buildBookingConfirmedEmail(opts: {
  toName: string;
  packageName: string;
  bookingDate: string;
  timeSlot: string;
  adminWhatsapp: string;
}): { subject: string; html: string; text: string } {
  const firstName = opts.toName.split(" ")[0];
  const subject = `✅ Studio booking confirmed — ${opts.bookingDate}`;
  const waLink = opts.adminWhatsapp
    ? `https://wa.me/${opts.adminWhatsapp.replace(/\D/g, "")}`
    : "";

  const html = emailLayout(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;">✅ You're booked, ${firstName}!</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#b0b0c0;">
      Your TCL Studios 25 session has been <strong style="color:#4ade80;">confirmed</strong>.
      We can't wait to help you create something great.
    </p>

    <div style="background:rgba(74,222,128,0.06);border:1px solid rgba(74,222,128,0.2);border-radius:12px;padding:24px;margin-bottom:24px;">
      <p style="margin:0 0 12px;font-size:12px;color:#4ade80;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Booking details</p>
      <table cellpadding="0" cellspacing="0" style="width:100%">
        ${[
          ["Package", opts.packageName],
          ["Date", new Date(opts.bookingDate + "T00:00:00").toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })],
          ["Time", opts.timeSlot],
        ].map(([label, value]) => `
        <tr>
          <td style="padding:5px 0;font-size:13px;color:#888;width:40%">${label}</td>
          <td style="padding:5px 0;font-size:14px;color:#fff;font-weight:600">${value}</td>
        </tr>`).join("")}
      </table>
    </div>

    <p style="margin:0 0 16px;font-size:14px;color:#b0b0c0;line-height:1.6;">
      Please arrive 10 minutes before your session. If you need to reschedule or have any questions,
      reach out to us on WhatsApp before your session date.
    </p>

    ${waLink ? `
    <a href="${waLink}"
       style="display:inline-block;background:rgba(37,211,102,0.15);border:1px solid rgba(37,211,102,0.3);color:#25d366;font-weight:600;font-size:14px;text-decoration:none;padding:11px 24px;border-radius:10px;margin-bottom:24px;">
      📱 Message us on WhatsApp
    </a>` : ""}

    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:${waLink ? "0" : "24px"} 0 20px;" />
    <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">
      See you in the studio!<br />— TCL Studios 25
    </p>
  `);

  const text = [
    `Hi ${firstName},`,
    ``,
    `Your TCL Studios 25 booking has been confirmed!`,
    ``,
    `Package: ${opts.packageName}`,
    `Date: ${opts.bookingDate}`,
    `Time: ${opts.timeSlot}`,
    ``,
    `Please arrive 10 minutes early. To reschedule, message us on WhatsApp.`,
    waLink ? `WhatsApp: ${waLink}` : "",
    ``,
    `See you in the studio!`,
    `— TCL Studios 25`,
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}

// ─── Template 4: Booking declined ────────────────────────────────────────────

export function buildBookingDeclinedEmail(opts: {
  toName: string;
  packageName: string;
  bookingDate: string;
  timeSlot: string;
  adminWhatsapp: string;
}): { subject: string; html: string; text: string } {
  const firstName = opts.toName.split(" ")[0];
  const subject = `Your TCL Studios 25 booking — ${opts.bookingDate}`;
  const waLink = opts.adminWhatsapp
    ? `https://wa.me/${opts.adminWhatsapp.replace(/\D/g, "")}`
    : "";

  const html = emailLayout(`
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;">Hi ${firstName},</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#b0b0c0;">
      Unfortunately your Studios 25 booking for <strong style="color:#a855f7;">${opts.packageName}</strong>
      on <strong style="color:#fff;">${opts.bookingDate}</strong> (${opts.timeSlot}) could not be confirmed.
    </p>

    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:14px;color:#d0d0e0;line-height:1.6;">
        This may be due to a scheduling conflict or studio availability. We're sorry for the inconvenience.
      </p>
      <p style="margin:0;font-size:14px;color:#d0d0e0;line-height:1.6;">
        Please visit the booking page to select a new date and time, or reach out to us on WhatsApp to find a slot that works for you.
      </p>
    </div>

    ${waLink ? `
    <a href="${waLink}"
       style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;font-weight:700;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:10px;margin-bottom:24px;">
      📱 Contact us to rebook
    </a>` : ""}

    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:${waLink ? "0" : "20px"} 0 20px;" />
    <p style="margin:0;font-size:13px;color:#555;line-height:1.6;">
      We hope to host your session soon.<br />— TCL Studios 25
    </p>
  `);

  const text = [
    `Hi ${firstName},`,
    ``,
    `Unfortunately your Studios 25 booking for ${opts.packageName} on ${opts.bookingDate} (${opts.timeSlot}) could not be confirmed.`,
    ``,
    `Please visit the booking page to select another date, or contact us on WhatsApp.`,
    waLink ? `WhatsApp: ${waLink}` : "",
    ``,
    `We hope to host your session soon.`,
    `— TCL Studios 25`,
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}
