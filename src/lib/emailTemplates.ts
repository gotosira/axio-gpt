const BASE_URL = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const colors = {
  bg: "#f3f6fb",
  card: "#ffffff",
  border: "#e5eaf1",
  text: "#344054",
  muted: "#667085",
  primary: "#074E9F",
  primaryHover: "#0A6EE1",
  success: "#22AB67",
};

const logoUrl = `${BASE_URL}/favicon.jpg`;

function wrapEmail(bodyHtml: string, title = "AXIO") {
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1"/>
      <title>${title}</title>
      <style>
        @media (prefers-color-scheme: dark) {
          .card { background: #0f172a !important; color: #e5e7eb !important; }
        }
        a { color: ${colors.primary}; }
        .btn { background:${colors.primary}; color:#F2F9FF; text-decoration:none; padding:12px 18px; border-radius:8px; display:inline-block; font-weight:600 }
        .btn:hover { background:${colors.primaryHover}; }
      </style>
    </head>
    <body style="margin:0; padding:24px; background:${colors.bg}; font-family:'IBM Plex Sans Thai', system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color:${colors.text}">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;margin:0 auto;">
        <tr>
          <td style="text-align:center; padding:12px 0 20px 0;">
            <img src="${logoUrl}" alt="AXIO" width="48" height="48" style="border-radius:12px;border:1px solid ${colors.border};object-fit:cover"/>
          </td>
        </tr>
        <tr>
          <td class="card" style="background:${colors.card}; border:1px solid ${colors.border}; border-radius:12px; padding:24px;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="text-align:center; color:${colors.muted}; font-size:12px; padding:16px 6px;">©${new Date().getFullYear()} AXONS. All Rights Reserved.</td>
        </tr>
      </table>
    </body>
  </html>`;
}

export function welcomeEmailHtml(name?: string) {
  const app = process.env.NEXT_PUBLIC_APP_NAME || "AXIO";
  const body = `
    <h1 style="margin:0 0 8px 0; font-size:22px;">ยินดีต้อนรับสู่ ${app}</h1>
    <p style="margin:0 0 16px 0; color:${colors.muted};">Hi ${name || "there"}, your accountถูกสร้างเรียบร้อยแล้ว 🎉</p>
    <p style="margin:0 0 16px 0;">เริ่มต้นใช้งานได้ทันทีโดยไปที่ลิงก์ด้านล่าง</p>
    <p style="margin:0 0 24px 0; text-align:center;"><a href="${BASE_URL}" class="btn">Open ${app}</a></p>
  `;
  return wrapEmail(body, `Welcome to ${app}`);
}

export function resetPasswordEmailHtml(resetUrl: string) {
  const app = process.env.NEXT_PUBLIC_APP_NAME || "AXIO";
  const body = `
    <h1 style="margin:0 0 8px 0; font-size:22px;">รีเซ็ตรหัสผ่าน</h1>
    <p style="margin:0 0 16px 0; color:${colors.muted};">เราได้รับคำขอให้รีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ</p>
    <p style="margin:0 0 24px 0; text-align:center;"><a href="${resetUrl}" class="btn">ตั้งรหัสผ่านใหม่</a></p>
    <p style="margin:0; color:${colors.muted}; font-size:13px;">ลิงก์นี้จะหมดอายุภายใน 30 นาที หากคุณไม่ได้ร้องขอ โปรดเพิกเฉยอีเมลฉบับนี้</p>
  `;
  return wrapEmail(body, `${app} – Reset password`);
}


