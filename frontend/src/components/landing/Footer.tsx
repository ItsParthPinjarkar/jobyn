import LogoMark from '../LogoMark'

const LINKS: Record<string, { label: string; href: string }[]> = {
  Product: [
    { label: 'Features', href: '#' },
    { label: 'Roadmap', href: '#' },
    { label: 'Pricing', href: '#' },
    { label: 'Changelog', href: '#' },
  ],
  Resources: [
    { label: 'Documentation', href: '/docs' },
    { label: 'API Reference', href: '#' },
    { label: 'Blog', href: '/blog' },
    { label: 'Community', href: '#' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ],
}

export default function Footer() {
  return (
    <footer style={{ position: 'relative', padding: '0 24px' }}>
      {/* Gradient divider */}
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.2), rgba(139,92,246,0.2), transparent)',
      }} />

      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '64px 0 48px',
        display: 'grid',
        gap: 48,
      }} className="footer-grid">
        {/* Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LogoMark size={22} />
            <span style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 15,
              fontWeight: 700,
              color: '#F8FAFC',
              letterSpacing: '-0.02em',
            }}>
              Jobyn
            </span>
          </div>
          <p style={{
            fontSize: 13,
            lineHeight: 1.6,
            color: '#64748B',
            maxWidth: 280,
            margin: 0,
            fontWeight: 500,
          }}>
            A career growth operating system for ambitious engineering students.
          </p>
        </div>

        {/* Link columns */}
        {Object.entries(LINKS).map(([category, links]) => (
          <div key={category}>
            <h4 style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#64748B',
              margin: '0 0 16px',
            }}>
              {category}
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {links.map(link => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#94A3B8',
                      textDecoration: 'none',
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#F8FAFC' }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#94A3B8' }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        paddingTop: 24,
        paddingBottom: 40,
        borderTop: '1px solid rgba(255,255,255,0.04)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
      }}>
        <p style={{ fontSize: 12, color: '#64748B', margin: 0, fontWeight: 500 }}>
          Built for ambitious engineers.
        </p>
        <p style={{ fontSize: 12, color: '#475569', margin: 0, fontWeight: 500 }}>
          &copy; 2026 Jobyn
        </p>
      </div>

      <style>{`
        .footer-grid {
          grid-template-columns: 1fr;
        }
        @media (min-width: 640px) {
          .footer-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (min-width: 1024px) {
          .footer-grid {
            grid-template-columns: 1.5fr repeat(3, 1fr);
          }
        }
      `}</style>
    </footer>
  )
}
