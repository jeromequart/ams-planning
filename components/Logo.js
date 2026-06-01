export default function Logo({ size = 'md' }) {
  const sizes = {
    sm: { badge: 28, font: 11, cross: 14 },
    md: { badge: 38, font: 14, cross: 18 },
    lg: { badge: 56, font: 20, cross: 26 },
  };
  const s = sizes[size];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* Croix rouge stylisée */}
      <div style={{
        width: s.badge, height: s.badge,
        background: 'var(--red)',
        borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <svg width={s.cross} height={s.cross} viewBox="0 0 18 18" fill="none">
          <rect x="6" y="1" width="6" height="16" rx="1.5" fill="white"/>
          <rect x="1" y="6" width="16" height="6" rx="1.5" fill="white"/>
        </svg>
      </div>
      <div>
        <div style={{ fontSize: s.font + 2, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          AMS Croix Blanche
        </div>
        <div style={{ fontSize: s.font - 1, color: 'var(--text-2)', marginTop: 1 }}>
          Planning saisonnier
        </div>
      </div>
    </div>
  );
}
