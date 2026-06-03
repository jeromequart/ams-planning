import Head from 'next/head';
import { useState } from 'react';
import Logo from '../components/Logo';
import PlanningView from '../components/PlanningView';
import EmployeeView from '../components/EmployeeView';
import MissionsConfig from '../components/MissionsConfig';
import { useStorage } from '../components/useStorage';
import { INITIAL_DATA, MISSION_TYPES } from '../data/config';

// Vue salariés simplifiée (gestion des fiches)
import AdminView from '../components/AdminView';

export default function Home() {
  const [mode, setMode] = useState('planning');
  const [salaries, setSalaries, loadedS] = useStorage('ams_salaries', INITIAL_DATA.salaries);
  const [evenements, setEvenements, loadedE] = useStorage('ams_evenements', INITIAL_DATA.evenements);
  const [inscriptions, setInscriptions, loadedI] = useStorage('ams_inscriptions', INITIAL_DATA.inscriptions);
  const [missionTypes, setMissionTypes, loadedMT] = useStorage('ams_mission_types', MISSION_TYPES);
  const loaded = loadedS && loadedE && loadedI && loadedMT;

  // Compteur inscriptions en attente
  const nbAttente = inscriptions.filter(i => i.statut === 'en_attente').length;

  const tabs = [
    { key: 'planning', label: '📅 Planning' },
    { key: 'admin', label: '🛡 Salariés' },
    { key: 'missions', label: '⚙️ Types de missions' },
    { key: 'employee', label: '👤 Vue salarié' },
  ];

  return (
    <>
      <Head>
        <title>AMS Croix Blanche — Planning saisonnier</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%23a32d2d'/><rect x='13' y='4' width='6' height='24' rx='2' fill='white'/><rect x='4' y='13' width='24' height='6' rx='2' fill='white'/></svg>" />
      </Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <header style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
            <Logo size="md" />
            <nav style={{ display: 'flex', gap: 4, background: '#f8f6f2', borderRadius: 10, padding: 4 }}>
              {tabs.map(({ key, label }) => (
                <button key={key} onClick={() => setMode(key)} style={{
                  padding: '7px 14px', borderRadius: 7, border: 'none', fontSize: 13,
                  fontWeight: mode === key ? 500 : 400, cursor: 'pointer',
                  background: mode === key ? '#fff' : 'transparent',
                  color: mode === key ? 'var(--text)' : 'var(--text-2)',
                  boxShadow: mode === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s', fontFamily: 'var(--font)', position: 'relative',
                }}>
                  {label}
                  {key === 'planning' && nbAttente > 0 && (
                    <span style={{ position: 'absolute', top: 2, right: 2, background: '#a32d2d', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                      {nbAttente}
                    </span>
                  )}
                </button>
              ))}
            </nav>
            <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'right' }}>
              <div style={{ fontWeight: 500, color: 'var(--text-2)' }}>Saison 2025</div>
              <div>{salaries.length} salarié{salaries.length > 1 ? 's' : ''} · {evenements.length} événement{evenements.length > 1 ? 's' : ''}</div>
            </div>
          </div>
        </header>

        <main style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>
          {!loaded ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-3)' }}>Chargement…</div>
          ) : mode === 'planning' ? (
            <PlanningView
              salaries={salaries} evenements={evenements} setEvenements={setEvenements}
              inscriptions={inscriptions} setInscriptions={setInscriptions}
              missionTypes={missionTypes}
            />
          ) : mode === 'admin' ? (
            <AdminView
              salaries={salaries} setSalaries={setSalaries}
              missions={[]} setMissions={() => {}}
              missionTypes={missionTypes}
            />
          ) : mode === 'missions' ? (
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: 24 }}>
              <MissionsConfig missionTypes={missionTypes} setMissionTypes={setMissionTypes} />
            </div>
          ) : (
            <EmployeeView
              salaries={salaries}
              evenements={evenements}
              inscriptions={inscriptions}
              setInscriptions={setInscriptions}
              missionTypes={missionTypes}
            />
          )}
        </main>

        <footer style={{ textAlign: 'center', padding: '20px', fontSize: 11, color: 'var(--text-3)', borderTop: '1px solid var(--border)', marginTop: 40 }}>
          AMS Croix Blanche — Application de gestion des salariés saisonniers
        </footer>
      </div>
    </>
  );
}
