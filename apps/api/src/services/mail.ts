import type { Env } from "../types";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * 通過 Resend 發送郵件。未配置 API key 時靜默跳過。
 * 單條失敗不中斷，僅 log 錯誤。
 */
export async function sendEmail(
  env: Env,
  { to, subject, html }: SendEmailParams,
): Promise<void> {
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) return;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      console.error(
        "[mail] Resend send failed:",
        res.status,
        await res.text().catch(() => ""),
      );
    }
  } catch (err) {
    console.error("[mail] send error:", err);
  }
}
