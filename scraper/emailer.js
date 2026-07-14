// emailer.js - Sends the job digest email using Gmail SMTP (free)

import nodemailer from 'nodemailer';

/**
 * Build an HTML email digest from a list of jobs
 */
export function buildEmailHTML(jobs) {
  const jobCards = jobs
    .map(
      (j) => `
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:12px;background:#fff;">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">
        <a href="${j.url}" style="font-size:16px;font-weight:600;color:#111827;text-decoration:none;">
          ${escapeHtml(j.title)}
        </a>
        <span style="font-size:11px;color:#6b7280;background:#f3f4f6;padding:2px 8px;border-radius:999px;">
          ${j.source}
        </span>
      </div>
      <div style="font-size:14px;color:#374151;margin-bottom:6px;">
        <strong>${escapeHtml(j.company)}</strong> · ${escapeHtml(j.location)}
        ${j.salary ? ` · <span style="color:#059669;">${escapeHtml(j.salary)}</span>` : ''}
      </div>
      ${
        j.description
          ? `<div style="font-size:13px;color:#6b7280;margin-bottom:10px;line-height:1.5;">
              ${escapeHtml(j.description.slice(0, 200))}...
            </div>`
          : ''
      }
      <a href="${j.url}" style="display:inline-block;background:#111827;color:#fff;padding:6px 14px;border-radius:6px;font-size:13px;text-decoration:none;">
        View & Apply →
      </a>
    </div>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Job Digest</title>
</head>
<body style="margin:0;padding:20px;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:640px;margin:0 auto;">
    <div style="background:#111827;color:#fff;padding:24px;border-radius:8px;margin-bottom:20px;">
      <h1 style="margin:0;font-size:22px;">Your Job Digest</h1>
      <p style="margin:6px 0 0;color:#9ca3af;font-size:14px;">
        ${jobs.length} new matching ${jobs.length === 1 ? 'job' : 'jobs'} · ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
      </p>
    </div>

    ${jobCards}

    <div style="text-align:center;padding:20px;color:#9ca3af;font-size:12px;">
      Sent by your Job Alerts bot 🤖
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Send the digest email via Gmail SMTP
 */
export async function sendDigestEmail(jobs, config) {
  if (!config.gmailUser || !config.gmailAppPassword) {
    console.log('Email credentials not set - skipping send');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.gmailUser,
      pass: config.gmailAppPassword,
    },
  });

  const html = buildEmailHTML(jobs);

  const info = await transporter.sendMail({
    from: `"Job Alerts" <${config.gmailUser}>`,
    to: config.recipient || config.gmailUser,
    subject: `${jobs.length} new ${jobs.length === 1 ? 'job' : 'jobs'} for you · ${new Date().toLocaleDateString()}`,
    html,
  });

  console.log(`Email sent: ${info.messageId}`);
}
