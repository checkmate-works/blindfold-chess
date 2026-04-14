import { type NextRequest, NextResponse } from 'next/server';

import { updateSession } from '@/lib/supabase/proxy';
import { THEME_DARK_CLASS, THEME_LIGHT_CLASS, THEME_STORAGE_KEY } from '@/lib/theme/constants';

// ---------------------------------------------------------------------------
// No-flash theme bootstrap script
// ---------------------------------------------------------------------------
//
// React 19 emits a dev-only "Encountered a script tag while rendering" warning
// for any `<script>` element (inline or with `dangerouslySetInnerHTML`) that
// goes through `completeWork`. Hoisted async external scripts suppress the
// warning but do NOT block paint, so they produce an inconsistent flash of
// the wrong theme on hard reload. The only fix that (a) runs synchronously
// before first paint and (b) keeps the `<script>` out of the React tree is
// to inject it directly into the HTML response body from the proxy.
//
// We stream-rewrite the body to insert an inline `<script>` right before the
// first `</head>`. The script reads the persisted theme (or
// `prefers-color-scheme`), applies the matching class to `<html>`, and sets
// `color-scheme`. It must stay in sync with `@/lib/theme/constants`.
const THEME_SCRIPT = `<script>(function(){try{var d=document.documentElement;var s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)});var t=s===${JSON.stringify(THEME_LIGHT_CLASS)}||s===${JSON.stringify(
  THEME_DARK_CLASS
)}?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?${JSON.stringify(
  THEME_DARK_CLASS
)}:${JSON.stringify(
  THEME_LIGHT_CLASS
)});d.classList.remove(${JSON.stringify(THEME_LIGHT_CLASS)},${JSON.stringify(
  THEME_DARK_CLASS
)});d.classList.add(t);d.style.colorScheme=t;}catch(e){}})();</script>`;

const HEAD_TAG = '</head>';
// Tail overlap kept in the rolling buffer while searching for `</head>`.
// Must exceed `HEAD_TAG.length` so a tag split across a chunk boundary is
// never missed.
const TAIL_OVERLAP = 16;

// Header used to break the self-fetch recursion. When the proxy sees this
// header on an incoming request, it short-circuits to a plain pass-through
// without rewriting (and without re-running Supabase session refresh).
const BYPASS_HEADER = 'x-theme-proxy-bypass';

function buildRewrittenBody(body: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = body.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = '';
      let injected = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          if (!injected) {
            const headEndIdx = buffer.indexOf(HEAD_TAG);
            if (headEndIdx !== -1) {
              const before = buffer.slice(0, headEndIdx);
              const after = buffer.slice(headEndIdx);
              controller.enqueue(encoder.encode(before + THEME_SCRIPT + after));
              buffer = '';
              injected = true;
            } else if (buffer.length > 8192) {
              // Flush most of the buffer, keep a small tail so a `</head>`
              // that straddles the chunk boundary isn't missed.
              controller.enqueue(encoder.encode(buffer.slice(0, buffer.length - TAIL_OVERLAP)));
              buffer = buffer.slice(buffer.length - TAIL_OVERLAP);
            }
          } else {
            controller.enqueue(encoder.encode(buffer));
            buffer = '';
          }
        }
        const tail = decoder.decode();
        if (tail) buffer += tail;
        if (buffer) controller.enqueue(encoder.encode(buffer));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

function shouldInjectThemeScript(request: NextRequest): boolean {
  // Only GET requests render HTML documents.
  if (request.method !== 'GET') return false;
  // RSC soft-navigation payloads use `text/x-component`, not HTML. Skip.
  if (request.headers.get('rsc')) return false;
  if (request.headers.get('next-router-prefetch')) return false;
  if (request.headers.get('next-router-state-tree')) return false;
  // Only rewrite when the client is actually asking for a document.
  const accept = request.headers.get('accept') || '';
  if (!accept.includes('text/html')) return false;
  return true;
}

async function injectThemeScriptViaProxy(request: NextRequest): Promise<NextResponse> {
  const proxyHeaders = new Headers(request.headers);
  proxyHeaders.set(BYPASS_HEADER, '1');

  let upstream: Response;
  try {
    upstream = await fetch(request.nextUrl, {
      method: 'GET',
      headers: proxyHeaders,
      redirect: 'manual',
    });
  } catch {
    // If the self-fetch fails for any reason, fall back to a normal
    // pass-through so the original request still completes.
    return NextResponse.next();
  }

  const contentType = upstream.headers.get('content-type') || '';
  if (!contentType.includes('text/html') || !upstream.body) {
    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: upstream.headers,
    });
  }

  const rewritten = buildRewrittenBody(upstream.body);
  const headers = new Headers(upstream.headers);
  // The rewritten body is longer than the original; drop any stale length.
  headers.delete('content-length');

  return new NextResponse(rewritten, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

const BLOCKED_PATHS = [
  '/wp-admin',
  '/wp-login.php',
  '/wp-content',
  '/wp-includes',
  '/xmlrpc.php',
  '/wp-cron.php',
  '/.env',
  '/.git',
  '/phpinfo',
  '/phpmyadmin',
  '/administrator',
];

const AUTH_REQUIRED_PATHS = ['/mypage'];
const SIGN_IN_PATH = '/sign-in';
const ADMIN_PATH = '/admin';

function isBlockedPath(pathname: string): boolean {
  return BLOCKED_PATHS.some(
    (blocked) => pathname === blocked || pathname.startsWith(blocked + '/')
  );
}

function isAuthRequiredPath(pathname: string): boolean {
  return AUTH_REQUIRED_PATHS.some((path) => {
    const pattern = new RegExp(`^/[^/]+${path}(/.*)?$`);
    return pattern.test(pathname);
  });
}

function isAdminPath(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  return lower === ADMIN_PATH || lower.startsWith(ADMIN_PATH + '/');
}

function isSignInPath(pathname: string): boolean {
  const pattern = new RegExp(`^/[^/]+${SIGN_IN_PATH}(/.*)?$`);
  return pattern.test(pathname);
}

export async function proxy(request: NextRequest) {
  // Break self-fetch recursion from `injectThemeScriptViaProxy` below. The
  // bypass request must short-circuit BEFORE `updateSession` so we don't
  // double-refresh the Supabase session or double-run the WordPress-scan
  // blocklist on the same request.
  if (request.headers.get(BYPASS_HEADER)) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (isBlockedPath(pathname)) {
    return NextResponse.json(null, { status: 404 });
  }

  const { response, authenticated } = await updateSession(request);

  // Return 404 for unauthenticated admin access to hide admin panel existence
  if (isAdminPath(pathname) && !authenticated) {
    return new NextResponse(null, { status: 404 });
  }

  // Redirect unauthenticated users away from auth-required pages
  if (isAuthRequiredPath(pathname) && !authenticated) {
    const locale = pathname.split('/')[1] || 'en';
    const signInUrl = new URL(`/${locale}/sign-in`, request.url);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect authenticated users away from the sign-in page
  if (isSignInPath(pathname) && authenticated) {
    const locale = pathname.split('/')[1] || 'en';
    const mypageUrl = new URL(`/${locale}/mypage?toast=already_logged_in`, request.url);
    return NextResponse.redirect(mypageUrl);
  }

  // For HTML document requests, self-fetch the origin so we can stream-rewrite
  // the body and inject the no-flash theme script before `</head>`. Non-HTML
  // requests (RSC soft nav, API, assets) fall through to the plain
  // pass-through `response` from `updateSession`, so cookies and session
  // refresh still work the same way as before.
  if (shouldInjectThemeScript(request)) {
    const injected = await injectThemeScriptViaProxy(request);
    // Copy any cookies set by `updateSession` (e.g. refreshed Supabase auth
    // cookies) onto the rewritten response so the session stays in sync.
    for (const cookie of response.cookies.getAll()) {
      injected.cookies.set(cookie);
    }
    return injected;
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - icon.png, apple-icon.png (icon files)
     * - manifest.webmanifest (PWA manifest)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|icon\\.png|apple-icon\\.png|manifest\\.webmanifest).*)',
  ],
};
