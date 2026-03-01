import Link from 'next/link';

export default function NotFound() {
  return (
    // lang="en" as fallback: root-level not-found has no access to the user's locale
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          backgroundColor: '#f8f9fa',
          color: '#1a1a2e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ fontSize: '4rem', fontWeight: 300, margin: '0 0 0.5rem' }}>404</h1>
          <p style={{ fontSize: '1.125rem', color: '#6b7280', margin: '0 0 2rem' }}>
            Page not found
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              padding: '0.5rem 1.5rem',
              backgroundColor: '#1a1a2e',
              color: '#ffffff',
              borderRadius: '0.375rem',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            Go to Home
          </Link>
        </div>
      </body>
    </html>
  );
}
