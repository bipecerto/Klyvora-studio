import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ACCESS_COOKIE = 'klyvora_access';

// Rotas que não exigem a chave de acesso.
const PUBLIC_PAGE_PATHS = ['/access'];
const PUBLIC_API_PATHS = ['/api/access', '/api/health'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPage = PUBLIC_PAGE_PATHS.some((p) => pathname === p);
  const isPublicApi = PUBLIC_API_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isPublicPage || isPublicApi) {
    return NextResponse.next();
  }

  const hasAccess = request.cookies.get(ACCESS_COOKIE)?.value === '1';

  if (hasAccess) {
    return NextResponse.next();
  }

  // Rotas de API: nunca redireciona (quebraria o fetch/JSON no cliente) — só nega.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Acesso não autorizado. Informe a chave de acesso.' }, { status: 401 });
  }

  // Páginas: manda pra tela de chave, guardando pra onde voltar depois.
  const url = request.nextUrl.clone();
  url.pathname = '/access';
  url.searchParams.set('from', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)'],
};
