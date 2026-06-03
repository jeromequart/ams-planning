import { useState } from 'react';
import { supabase } from '../lib/supabase';

const ADMIN_PIN = '2025AMS';

export default function LoginPage({ onAdmin, onSalarie, showSalarieAuth, onAuthSuccess, onBack }) {
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);

  function checkPin() {
    if (pin === ADMIN_PIN) { onAdmin(); }
    else { setPinError('Code incorrect.'); setPin(''); }
  }

  async function loginSalarie() {
    if (!email || !password) return;
    setLoading(true); setAuthError('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setAuthError('Email ou mot de passe incorrect.'); }
    else { onAuthSuccess(data.session); }
  }

  // Page d'accueil principale
  if (!showSalarieAuth) return (
    <div style={s.page}>
      <div style={s.card}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <img src="/logo.jpg" alt="Logo AMS" style={{ width:80, height:80, borderRadius:'50%', border:'2px solid #e0e0e0', objectFit:'cover' }} />
          <div style={{ fontSize:20, fontWeight:700, marginTop:12, color:'#1a1a18' }}>AMS Croix Blanche</div>
          <div style={{ fontSize:13, color:'#888', marginTop:4 }}>Planning saisonnier</div>
        </div>

        {/* Boutons */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <button style={s.btnSalarie} onClick={onSalarie}>
            <span style={{ fontSize:24 }}>👤</span>
            <div>
              <div style={{ fontWeight:600, fontSize:15 }}>Espace Salarié</div>
              <div style={{ fontSize:12, opacity:0.8, marginTop:2 }}>Voir mon planning et mes missions</div>
            </div>
          </button>

          <div style={{ position:'relative' }}>
            <button style={s.btnAdmin} onClick={() => { setPinError(''); document.getElementById('pin-input')?.focus(); }}>
              <span style={{ fontSize:24 }}>🛡</span>
              <div>
                <div style={{ fontWeight:600, fontSize:15 }}>Espace Administrateur</div>
                <div style={{ fontSize:12, opacity:0.7, marginTop:2 }}>Gérer les salariés et le planning</div>
              </div>
            </button>
            {/* PIN inline */}
            <div style={{ marginTop:10, display:'flex', gap:8 }}>
              <input
                id="pin-input"
                type="password"
                placeholder="Code administrateur"
                value={pin}
                onChange={e => { setPin(e.target.value); setPinError(''); }}
                onKeyDown={e => e.key === 'Enter' && checkPin()}
                style={{ flex:1, padding:'9px 12px', border:`1px solid ${pinError?'#a32d2d':'#ddd'}`, borderRadius:8, fontSize:13, fontFamily:'var(--font)' }}
              />
              <button onClick={checkPin} style={{ padding:'9px 16px', background:'#1a1a18', color:'#fff', border:'none', borderRadius:8, fontSize:13, cursor:'pointer' }}>
                Entrer
              </button>
            </div>
            {pinError && <div style={{ fontSize:12, color:'#a32d2d', marginTop:4 }}>{pinError}</div>}
          </div>
        </div>

        <div style={{ fontSize:11, color:'#aaa', textAlign:'center', marginTop:24 }}>
          AMS Croix Blanche — Marseille
        </div>
      </div>
    </div>
  );

  // Formulaire connexion salarié
  return (
    <div style={s.page}>
      <div style={s.card}>
        <button onClick={onBack} style={{ background:'none', border:'none', cursor:'pointer', color:'#888', fontSize:13, marginBottom:16, padding:0, fontFamily:'var(--font)' }}>
          ← Retour
        </button>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <img src="/logo.jpg" alt="Logo AMS" style={{ width:56, height:56, borderRadius:'50%', border:'2px solid #e0e0e0', objectFit:'cover' }} />
          <div style={{ fontSize:16, fontWeight:700, marginTop:10 }}>Connexion salarié</div>
        </div>

        <div style={{ marginBottom:12 }}>
          <label style={s.label}>Adresse email</label>
          <input style={s.input} type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="prenom.nom@email.com" autoFocus />
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={s.label}>Mot de passe</label>
          <input style={s.input} type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && loginSalarie()}
            placeholder="••••••••" />
        </div>

        {authError && <div style={{ fontSize:13, color:'#a32d2d', marginBottom:12, textAlign:'center' }}>{authError}</div>}

        <button onClick={loginSalarie} disabled={loading} style={{ ...s.btnSalarie, justifyContent:'center' }}>
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight:'100vh', background:'#f8f6f2', display:'flex', alignItems:'center', justifyContent:'center', padding:16 },
  card: { background:'#fff', borderRadius:20, padding:32, width:'100%', maxWidth:380, boxShadow:'0 4px 24px rgba(0,0,0,0.08)' },
  btnSalarie: { display:'flex', alignItems:'center', gap:16, width:'100%', padding:'16px 20px', background:'#a32d2d', color:'#fff', border:'none', borderRadius:12, cursor:'pointer', fontFamily:'var(--font)', textAlign:'left' },
  btnAdmin: { display:'flex', alignItems:'center', gap:16, width:'100%', padding:'16px 20px', background:'#f8f6f2', color:'#1a1a18', border:'1px solid #e0e0e0', borderRadius:12, cursor:'pointer', fontFamily:'var(--font)', textAlign:'left' },
  label: { display:'block', fontSize:12, fontWeight:500, color:'#666', marginBottom:5 },
  input: { width:'100%', padding:'10px 12px', border:'1px solid #ddd', borderRadius:8, fontSize:14, fontFamily:'var(--font)', boxSizing:'border-box' },
};
