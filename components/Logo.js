export default function Logo({ size = 'md' }) {
  const sizes = {
    sm: { img: 28, font: 11, sub: 10 },
    md: { img: 40, font: 14, sub: 11 },
    lg: { img: 56, font: 18, sub: 13 },
  };
  const s = sizes[size];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <img
        src="/logo.jpg"
        alt="Logo AMS Croix Blanche"
        style={{ width: s.img, height: s.img, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1.5px solid #e0e0e0' }}
      />
      <div>
        <div style={{ fontSize: s.font, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          AMS Croix Blanche
        </div>
        <div style={{ fontSize: s.sub, color: 'var(--text-2)', marginTop: 1 }}>
          Planning saisonnier
        </div>
      </div>
    </div>
  );
}
