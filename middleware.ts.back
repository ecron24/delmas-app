// delmas-app/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Liste des emails autorisés
 */
const ALLOWED_EMAILS = [
  'oppsyste@gmail.com',
  'stephanedelmas69@gmail.com',
  'christophemenoire@gmail.com'
];

function isAuthorizedUser(email: string | undefined): boolean {
  if (!email) return false;
  return ALLOWED_EMAILS.includes(email.toLowerCase());
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = request.nextUrl.pathname;

  // Pages publiques
  const publicPaths = ['/login', '/unauthorized'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // ✅ Si pas de session et route protégée → redirect login
  if (!session && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // ✅ Si session mais utilisateur non autorisé → redirect unauthorized
  if (session && !isAuthorizedUser(session.user.email)) {
    // Déconnecter l'utilisateur non autorisé
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  // ✅ Si session autorisée et sur login → redirect dashboard
  if (session && isAuthorizedUser(session.user.email) && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
