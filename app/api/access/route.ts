import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ACCESS_COOKIE = 'klyvora_access';
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function POST(request: NextRequest) {
  const expected = process.env.SITE_ACCESS_KEY;

  if (!expected) {
    return NextResponse.json(
      { error: 'SITE_ACCESS_KEY não configurada no servidor. Defina essa variável de ambiente na Vercel.' },
      { status: 500 }
    );
  }

  let key = '';
  try {
    const body = await request.json();
    key = (body?.key || '').trim();
  } catch {
    // corpo vazio/ inválido
  }

  if (!key || key !== expected) {
    return NextResponse.json({ error: 'Chave de acesso inválida.' }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(ACCESS_COOKIE, '1', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: ONE_YEAR,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(ACCESS_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
