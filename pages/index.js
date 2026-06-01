import Head from 'next/head';
import { useState } from 'react';
import Logo from '../components/Logo';
import AdminView from '../components/AdminView';
import EmployeeViewWrapper from '../components/EmployeeView';
import { useStorage } from '../components/useStorage';
import { INITIAL_DATA } from '../data/config';

export default function Home() {
  const [mode, setMode] = useState('admin');
  const [salaries, setSalaries, loadedS] = useStorage('ams_salaries', INITIAL_DATA.salaries);
  const [missions, setMissions, loadedM] = useStorage('ams_missions', INITIAL_DATA.missions);

  const loaded = loadedS && loadedM;

  return (
    <>
      <Head>
        <title>AMS Croix Blanche — Planning saisonnier</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%23a32d2d'/><rect x='13' y='4' width='6' height='24' rx='2' fill='white'/><rect x='4' y='13' width='24' height='6' rx='2' fill='white'/></svg>" />
      </Head>

      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        {/* Header */}
        <header style={{
          background: '#fff',
          borderBottom: '1px solid var(--border)',
          padding: '0 24px',
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
            <Logo size="md" />

            {/* Navigation */}
            <nav style={{ display: 'flex', gap: 4, background: '#f8f6f2', borderRadius: 10, padding: 4 }}>
              {[
                { key: 'admin', label: '🛡 Administration', desc: 'Gérer les salariés et plannings' },
                { key: 'employee', label: '👤 Vue salarié', desc: 'Voir son propre planning' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: 7,
                    border: 'none',
                    fontSize: 13,
                    fontWeight: mode === key ? 500 : 400,
                    cursor: 'pointer',
                    background: mode === key ? '#fff' : 'transparent',
                    color: mode === key ? 'var(--text)' : 'var(--text-2)',
                    boxShadow: mode === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s',
                    fontFamily: 'var(--font)',
                  }}
                >
                  {label}
                </button>
              ))}
            </nav>

            {/* Indicateur saison */}
            <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'right' }}>
              <div style={{ fontWeight: 500, color: 'var(--text-2)' }}>Saison 2025</div>
              <div>{salaries.length} salarié{salaries.length > 1 ? 's' : ''} · {missions.length} mission{missions.length > 1 ? 's' : ''}</div>
            </div>
          </div>
        </header>

        {/* Contenu */}
        <main style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
          {!loaded ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-3)' }}>Chargement…</div>
          ) : mode === 'admin' ? (
            <AdminView
              salaries={salaries}
              setSalaries={setSalaries}
              missions={missions}
              setMissions={setMissions}
            />
          ) : (
            <EmployeeViewWrapper
              salaries={salaries}
              missions={missions}
            />
          )}
        </main>

        {/* Footer */}
        <footer style={{ textAlign: 'center', padding: '20px', fontSize: 11, color: 'var(--text-3)', borderTop: '1px solid var(--border)', marginTop: 40 }}>
          AMS Croix Blanche — Application de gestion des salariés saisonniers
        </footer>
      </div>
    </>
  );
}
