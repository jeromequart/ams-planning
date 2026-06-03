import Head from 'next/head';
import { useState, useEffect, useCallback } from 'react';
import Logo from '../components/Logo';
import PlanningView from '../components/PlanningView';
import EmployeeView from '../components/EmployeeView';
import MissionsConfig from '../components/MissionsConfig';
import AdminView from '../components/AdminView';
import { MISSION_TYPES } from '../data/config';
import * as db from '../lib/db';

export default function Home() {
  const [mode, setMode] = useState('planning');
  const [salaries, setSalaries] = useState([]);
  const [evenements, setEvenementsState] = useState([]);
  const [inscriptions, setInscriptionsState] = useState([]);
  const [missionTypes, setMissionTypesState] = useState(MISSION_TYPES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Chargement initial
  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [s, e, i, mt] = await Promise.all([
        db.getSalaries(), db.getEvenements(), db.getInscriptions(), db.getMissionTypes()
      ]);
      setSalaries(s);
      setEvenementsState(e);
      setInscriptionsState(i);
      setMissionTypesState(Object.keys(mt).length > 0 ? mt : MISSION_TYPES);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Erreur de connexion à la base de données.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ─── SALARIÉS ───────────────────────────────────────────
  async function addSalarie(s) {
    const nouveau = await db.addSalarie(s);
    setSalaries(prev => [...prev, nouveau]);
    return nouveau;
  }
  async function updateSalarie(id, s) {
    await db.updateSalarie(id, s);
    setSalaries(prev => prev.map(x => x.id === id ? { ...x, ...s } : x));
  }
  async function removeSalarie(id) {
    await db.deleteSalarie(id);
    setSalaries(prev => prev.filter(x => x.id !== id));
    setInscriptionsState(prev => prev.filter(i => i.salarieId !== id));
  }

  // ─── ÉVÉNEMENTS ─────────────────────────────────────────
  async function addEvenement(e) {
    const nouveau = await db.addEvenement(e);
    setEvenementsState(prev => [...prev, nouveau]);
    return nouveau;
  }
  async function updateEvenement(id, e) {
    await db.updateEvenement(id, e);
    setEvenementsState(prev => prev.map(x => x.id === id ? { ...x, ...e } : x));
  }
  async function removeEvenement(id) {
    await db.deleteEvenement(id);
    setEvenementsState(prev => prev.filter(x => x.id !== id));
    setInscriptionsState(prev => prev.filter(i => i.evenementId !== id));
  }

  // ─── INSCRIPTIONS ────────────────────────────────────────
  async function addInscription(i) {
    const nouvelle = await db.addInscription(i);
    setInscriptionsState(prev => [...prev, nouvelle]);
  }
  async function updateInscription(id, statut) {
    await db.updateInscription(id, statut);
    setInscriptionsState(prev => prev.map(x => x.id === id ? { ...x, statut } : x));
  }
  async function removeInscription(id) {
    await db.deleteInscription(id);
    setInscriptionsState(prev => prev.filter(x => x.id !== id));
  }

  // ─── TYPES DE MISSIONS ───────────────────────────────────
  async function saveMissionType(id, mt) {
    await db.upsertMissionType(id, mt);
    setMissionTypesState(prev => ({ ...prev, [id]: mt }));
  }
  async function removeMissionType(id) {
    await db.deleteMissionType(id);
    setMissionTypesState(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

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
          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-3)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
              <div>Connexion à la base de données…</div>
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '80px', color: '#a32d2d' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
              <div>{error}</div>
              <button onClick={loadAll} style={{ marginTop: 16, padding: '8px 20px', background: '#a32d2d', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
                Réessayer
              </button>
            </div>
          ) : mode === 'planning' ? (
            <PlanningView
              salaries={salaries} evenements={evenements}
              addEvenement={addEvenement} updateEvenement={updateEvenement} removeEvenement={removeEvenement}
              inscriptions={inscriptions} addInscription={addInscription}
              updateInscription={updateInscription} removeInscription={removeInscription}
              missionTypes={missionTypes}
            />
          ) : mode === 'admin' ? (
            <AdminView
              salaries={salaries} addSalarie={addSalarie} updateSalarie={updateSalarie} removeSalarie={removeSalarie}
              evenements={evenements} inscriptions={inscriptions}
              updateInscription={updateInscription} removeInscription={removeInscription}
              missionTypes={missionTypes}
            />
          ) : mode === 'missions' ? (
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: 24 }}>
              <MissionsConfig missionTypes={missionTypes} saveMissionType={saveMissionType} removeMissionType={removeMissionType} />
            </div>
          ) : (
            <EmployeeView
              salaries={salaries} evenements={evenements}
              inscriptions={inscriptions} addInscription={addInscription} removeInscription={removeInscription}
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
