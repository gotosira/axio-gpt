import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { resetPasswordEmailHtml } from "@/lib/emailTemplates";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ ok: true });

    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) return NextResponse.json({ ok: true });

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 30); // 30 min

    await prisma.verificationToken.upsert({
      where: { token: token },
      update: { identifier: email, expires },
      create: { identifier: email, token, expires },
    });

    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset?token=${token}`;

    // Send email if RESEND_API_KEY is configured
    try {
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey) {
        const { Resend } = await import('resend');
        const resend = new Resend(apiKey);
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'AXIO <no-reply@axio.local>',
          to: email,
          subject: 'Reset your AXIO password',
          html: resetPasswordEmailHtml(resetUrl)
        });
      } else {
        console.log("Password reset URL:", resetUrl);
      }
    } catch (err) {
      console.log("Failed to send via Resend; fallback log:", resetUrl, err);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: true });
  }
}


