import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();
    if (!token || !password) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });

    const record = await prisma.verificationToken.findFirst({ where: { token } });
    if (!record || (record.expires && record.expires < new Date())) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({ where: { email: record.identifier } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const hash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hash } });
    await prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


