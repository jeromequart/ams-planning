import { useState, useEffect } from 'react';
import Head from 'next/head';
import { supabase } from '../lib/supabase';
import LoginPage from '../components/LoginPage';
import AdminApp from '../components/AdminApp';
import SalarieApp from '../components/SalarieApp';

export default function Home() {
  const [session, setSession] = useState(null);
  const [mode, setMode] = useState(null); // 'admin' | 'salarie' | null
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier session existante
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) setMode('salarie');
      setLoading(false);
    });
    // Écouter les changements auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) setMode(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    setMode(null);
    setSession(null);
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#f8f6f2' }}>
      <div style={{ textAlign:'center', color:'#888' }}>
        <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
        <div>Chargement…</div>
      </div>
    </div>
  );

  // Pas connecté → page d'accueil
  if (!mode) return <LoginPage onAdmin={() => setMode('admin')} onSalarie={() => setMode('salarie')} />;

  // Connexion salarié → auth Supabase requise
  if (mode === 'salarie' && !session) return (
    <LoginPage
      onAdmin={() => setMode('admin')}
      onSalarie={() => setMode('salarie')}
      showSalarieAuth
      onAuthSuccess={(s) => setSession(s)}
      onBack={() => setMode(null)}
    />
  );

  return (
    <>
      <Head>
        <title>AMS Croix Blanche — Planning</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      {mode === 'admin'
        ? <AdminApp onLogout={() => setMode(null)} />
        : <SalarieApp session={session} onLogout={logout} />
      }
    </>
  );
}