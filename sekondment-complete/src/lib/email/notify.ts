import 'server-only';

/* ============================================================================
   Email notifications via Resend.
   - No-ops safely if RESEND_API_KEY is unset (dev), logging instead of throwing.
   - Branded HTML template (royal blue / gold) shared across all notifications.
   - Never throws into a server action: a failed email must not fail the action.
   ========================================================================== */

const FROM = 'Sekondment <notifications@sekondment.com>';
const BLUE = '#1d4ed8';
const GOLD = '#c8a24a';
const INK = '#0f1419';
const MUTED = '#5b6573';

type SendArgs = { to: string; subject: string; heading: string; body: string; ctaLabel?: string; ctaUrl?: string };

export async function sendEmail({ to, subject, heading, body, ctaLabel, ctaUrl }: SendArgs): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const html = renderTemplate({ heading, body, ctaLabel, ctaUrl });

  // Dev / unconfigured: log and return. The app must keep working without email.
  if (!key) {
    console.log(`[email:skipped no RESEND_API_KEY] to=${to} subject="${subject}"`);
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (!res.ok) console.error(`[email:failed] ${res.status} ${await res.text()}`);
  } catch (e) {
    console.error('[email:error]', (e as Error).message);
  }
}

function renderTemplate({ heading, body, ctaLabel, ctaUrl }: { heading: string; body: string; ctaLabel?: string; ctaUrl?: string }) {
  const cta = ctaLabel && ctaUrl
    ? `<a href="${ctaUrl}" style="display:inline-block;background:${BLUE};color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 24px;border-radius:12px;margin-top:8px">${ctaLabel}</a>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#f7f8fa;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:32px 20px">
    <div style="display:flex;align-items:center;gap:9px;margin-bottom:24px">
      <span style="display:inline-block;width:26px;height:26px;border-radius:7px;background:${BLUE};position:relative">
        <span style="position:absolute;top:6px;right:6px;width:8px;height:8px;border-radius:2px;background:${GOLD}"></span>
      </span>
      <span style="font-weight:700;font-size:18px;color:${INK}">Sekondment</span>
    </div>
    <div style="background:#fff;border:1px solid rgba(15,20,25,.1);border-radius:16px;padding:28px">
      <h1 style="font-size:20px;color:${INK};margin:0 0 12px">${heading}</h1>
      <p style="font-size:15px;color:${MUTED};line-height:1.55;margin:0 0 20px">${body}</p>
      ${cta}
    </div>
    <p style="font-size:12px;color:${MUTED};text-align:center;margin-top:20px">
      Deploy expertise, not headcount. · You're receiving this because you have a Sekondment account.
    </p>
  </div></body></html>`;
}

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://sekondment.com';

/* ── Typed event helpers — call these from server actions ─────────────────── */
export const notify = {
  proposalReceived: (to: string, oppTitle: string, oppId: string) =>
    sendEmail({
      to, subject: `New proposal on "${oppTitle}"`,
      heading: 'You have a new proposal',
      body: `An expert has submitted a proposal for your opportunity "${oppTitle}". Review their price, timeline and message to decide next steps.`,
      ctaLabel: 'View proposal', ctaUrl: `${SITE}/opportunities/${oppId}`,
    }),
  proposalAccepted: (to: string, oppTitle: string, engId: string) =>
    sendEmail({
      to, subject: `Your proposal was accepted`,
      heading: 'Your proposal was accepted 🎉',
      body: `Your proposal for "${oppTitle}" has been accepted and an engagement has been created. Funding into escrow begins the work.`,
      ctaLabel: 'Open engagement', ctaUrl: `${SITE}/engagements/${engId}`,
    }),
  milestoneFunded: (to: string, title: string, engId: string) =>
    sendEmail({
      to, subject: `A milestone was funded`,
      heading: 'Funds are in escrow',
      body: `The milestone "${title}" has been funded into escrow. You can begin work — funds release once your submission is approved.`,
      ctaLabel: 'View engagement', ctaUrl: `${SITE}/engagements/${engId}`,
    }),
  workSubmitted: (to: string, title: string, engId: string) =>
    sendEmail({
      to, subject: `Work submitted for review`,
      heading: 'Work has been submitted',
      body: `Work for the milestone "${title}" has been submitted and is awaiting your approval. Approve to release the escrowed funds.`,
      ctaLabel: 'Review & approve', ctaUrl: `${SITE}/engagements/${engId}`,
    }),
  fundsReleased: (to: string, title: string, engId: string) =>
    sendEmail({
      to, subject: `Funds released`,
      heading: 'Funds released',
      body: `The milestone "${title}" was approved and the escrowed funds have been released to the payee.`,
      ctaLabel: 'View engagement', ctaUrl: `${SITE}/engagements/${engId}`,
    }),
  disputeRaised: (to: string, engId: string) =>
    sendEmail({
      to, subject: `A dispute was raised`,
      heading: 'A dispute needs your attention',
      body: `A dispute has been raised on one of your engagements. Please review and respond so it can be resolved fairly.`,
      ctaLabel: 'View dispute', ctaUrl: `${SITE}/engagements/${engId}`,
    }),
};
