import { useState, useEffect, useCallback } from 'react';
import Logo from './Logo';
import PlanningView from './PlanningView';
import EmployeeView from './EmployeeView';
import MissionsConfig from './MissionsConfig';
import AdminView from './AdminView';
import ValidationMensuelle from './ValidationMensuelle';
import ListeSalaries from './ListeSalaries';
import ImportSalaries from './ImportSalaries';
import { MISSION_TYPES } from '../data/config';
import * as db from '../lib/db';
import { getVehicules, getEvenementVehicules, addEvenementVehicule, deleteAllEvenementVehicules } from '../lib/db';
import { retireInscription as dbRetire, reactiverInscription as dbReactiver } from '../lib/db';

export default function AdminApp({ onLogout }) {
  const [mode, setMode] = useState('planning');
  const [salaries, setSalaries] = useState([]);
  const [evenements, setEvenements] = useState([]);
  const [inscriptions, setInscriptions] = useState([]);
  const [missionTypes, setMissionTypes] = useState(MISSION_TYPES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [s, e, i, mt] = await Promise.all([db.getSalaries(), db.getEvenements(), db.getInscriptions(), db.getMissionTypes()]);
      setSalaries(s); setEvenements(e); setInscriptions(i);
      const vehs = await getVehicules();
      setVehicules(vehs);
      setMissionTypes(Object.keys(mt).length > 0 ? mt : MISSION_TYPES);
      setError(null);
    } catch(err) { setError('Erreur de connexion.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Salariés
  async function addSalarie(s) { const n = await db.addSalarie(s); setSalaries(p => [...p, n]); return n; }
  async function updateSalarie(id, s) { await db.updateSalarie(id, s); setSalaries(p => p.map(x => x.id===id?{...x,...s}:x)); }
  async function removeSalarie(id) { await db.deleteSalarie(id); setSalaries(p => p.filter(x=>x.id!==id)); setInscriptions(p=>p.filter(i=>i.salarieId!==id)); }

  // Événements
  async function addEvenement(e) { const n = await db.addEvenement(e); setEvenements(p => [...p, n]); return n; }
  async function updateEvenement(id, e) { await db.updateEvenement(id, e); setEvenements(p => p.map(x=>x.id===id?{...x,...e}:x)); }
  async function removeEvenement(id) { await db.deleteEvenement(id); setEvenements(p=>p.filter(x=>x.id!==id)); setInscriptions(p=>p.filter(i=>i.evenementId!==id)); }

  // Inscriptions
  async function addInscription(i) { const n = await db.addInscription(i); setInscriptions(p=>[...p,n]); }
  async function updateInscription(id, statut) { await db.updateInscription(id,statut); setInscriptions(p=>p.map(x=>x.id===id?{...x,statut}:x)); }
  async function removeInscription(id) { await db.deleteInscription(id); setInscriptions(p=>p.filter(x=>x.id!==id)); }
  async function retireInscriptionFn(id, by='admin') {
    await dbRetire(id, by);
    setInscriptions(p=>p.map(x=>x.id===id?{...x,statut:'retire',updatedBy:by,updatedAt:new Date().toISOString()}:x));
  }
  async function reactiverInscriptionFn(id, statut='valide', by='admin') {
    await dbReactiver(id, statut, by);
    setInscriptions(p=>p.map(x=>x.id===id?{...x,statut,updatedBy:by,updatedAt:new Date().toISOString()}:x));
  }

  // Types missions
  async function saveEvenementVehicules(evenementId, vehs) {
    await deleteAllEvenementVehicules(evenementId);
    const saved = [];
    for (const v of vehs) {
      const s = await addEvenementVehicule({ ...v, evenementId });
      saved.push(s);
    }
    setEvenementVehicules(prev => ({ ...prev, [evenementId]: saved }));
  }

  async function loadEvenementVehicules(evenementId) {
    if (evenementVehicules[evenementId]) return evenementVehicules[evenementId];
    const vehs = await getEvenementVehicules(evenementId);
    setEvenementVehicules(prev => ({ ...prev, [evenementId]: vehs }));
    return vehs;
  }

  async function envoyerConvocations(evenementId) {
    const ev = evenements.find(e => e.id === evenementId);
    if (!ev) return;
    const inscritsValides = inscriptions.filter(i => i.evenementId === evenementId && i.statut === 'valide');
    const sals = salaries.filter(sal => inscritsValides.find(i => i.salarieId === sal.id));
    const vehs = evenementVehicules[evenementId] || await loadEvenementVehicules(evenementId);
    const vehsAvecLabel = vehs.map(v => {
      const veh = vehicules.find(x => x.id === v.vehiculeId);
      const conducteur = salaries.find(sal => sal.id === v.conducteurId);
      return {
        label: veh ? `${veh.nom} — ${veh.immatriculation}` : v.vehiculeCustom || '?',
        conducteurNom: conducteur ? `${conducteur.prenom} ${conducteur.nom}` : null,
      };
    });
    const res = await fetch('/api/send-convocation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evenement: ev, salaries: sals, vehicules: vehsAvecLabel }),
    });
    const data = await res.json();
    return data.results;
  }

  async function saveMissionType(id, mt) { await db.upsertMissionType(id,mt); setMissionTypes(p=>({...p,[id]:mt})); }
  async function removeMissionType(id) { await db.deleteMissionType(id); setMissionTypes(p=>{const n={...p};delete n[id];return n;}); }

  // Créer compte salarié
  async function creerCompteSalarie(email, password, salarieId) {
    const { data, error } = await fetch('/api/create-salarie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, salarieId }),
    }).then(r => r.json());
    if (error) throw new Error(error);
    return data;
  }

  const [showListe, setShowListe] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [vehicules, setVehicules] = useState([]);
  const [evenementVehicules, setEvenementVehicules] = useState({});
  const nbAttente = inscriptions.filter(i=>i.statut==='en_attente').length;

  const tabs = [
    { key:'planning', label:'📅 Planning' },
    { key:'validation', label:'✓ Validation mensuelle' },
    { key:'admin', label:'🛡 Salariés' },
    { key:'missions', label:'⚙️ Missions' },
  ];

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <header style={{ background:'#fff', borderBottom:'1px solid var(--border)', padding:'0 24px', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ maxWidth:1200, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', height:64 }}>
          <Logo size="md" />
          <nav style={{ display:'flex', gap:4, background:'#f8f6f2', borderRadius:10, padding:4 }}>
            {tabs.map(({ key, label }) => (
              <button key={key} onClick={() => setMode(key)} style={{
                padding:'7px 14px', borderRadius:7, border:'none', fontSize:13,
                fontWeight:mode===key?500:400, cursor:'pointer',
                background:mode===key?'#fff':'transparent',
                color:mode===key?'var(--text)':'var(--text-2)',
                boxShadow:mode===key?'0 1px 3px rgba(0,0,0,0.08)':'none',
                fontFamily:'var(--font)', position:'relative',
              }}>
                {label}
                {key==='planning'&&nbAttente>0&&(
                  <span style={{ position:'absolute', top:2, right:2, background:'#a32d2d', color:'#fff', borderRadius:'50%', width:16, height:16, fontSize:9, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>{nbAttente}</span>
                )}
                {key==='validation'&&nbAttente>0&&(
                  <span style={{ position:'absolute', top:2, right:2, background:'#854f0b', color:'#fff', borderRadius:'50%', width:16, height:16, fontSize:9, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>{nbAttente}</span>
                )}
              </button>
            ))}
          </nav>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ fontSize:12, color:'var(--text-3)', textAlign:'right' }}>
              <div style={{ fontWeight:500, color:'var(--text-2)' }}>Administration</div>
              <div>{salaries.length} salarié{salaries.length>1?'s':''} · {evenements.length} événement{evenements.length>1?'s':''}</div>
            </div>
            <button onClick={() => setShowListe(true)} style={{ background:'#f8f6f2', border:'1px solid var(--border)', borderRadius:8, padding:'6px 12px', fontSize:12, cursor:'pointer', fontFamily:'var(--font)', color:'var(--text-2)' }}>
              👥 Liste salariés
            </button>
            <button onClick={() => setShowImport(true)} style={{ background:'#eaf3de', border:'1px solid #c0dd97', borderRadius:8, padding:'6px 12px', fontSize:12, cursor:'pointer', fontFamily:'var(--font)', color:'#3b6d11', fontWeight:500 }}>
              📥 Importer salariés
            </button>
            <button onClick={onLogout} style={{ background:'#f8f6f2', border:'1px solid var(--border)', borderRadius:8, padding:'6px 12px', fontSize:12, cursor:'pointer', fontFamily:'var(--font)', color:'var(--text-2)' }}>
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth:1200, margin:'0 auto', padding:'28px 24px' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:'80px', color:'var(--text-3)' }}><div style={{ fontSize:32, marginBottom:12 }}>⏳</div><div>Chargement…</div></div>
        ) : error ? (
          <div style={{ textAlign:'center', padding:'80px', color:'#a32d2d' }}><div>{error}</div><button onClick={loadAll} style={{ marginTop:16, padding:'8px 20px', background:'#a32d2d', color:'#fff', border:'none', borderRadius:8, cursor:'pointer' }}>Réessayer</button></div>
        ) : mode==='planning' ? (
          <PlanningView salaries={salaries} evenements={evenements} addEvenement={addEvenement} updateEvenement={updateEvenement} removeEvenement={removeEvenement} inscriptions={inscriptions} addInscription={addInscription} updateInscription={updateInscription} removeInscription={removeInscription} missionTypes={missionTypes} vehicules={vehicules} evenementVehicules={evenementVehicules} loadEvenementVehicules={loadEvenementVehicules} saveEvenementVehicules={saveEvenementVehicules} envoyerConvocations={envoyerConvocations} />
        ) : mode==='validation' ? (
          <ValidationMensuelle
            salaries={salaries} evenements={evenements}
            inscriptions={inscriptions} addInscription={addInscription}
            updateInscription={updateInscription} removeInscription={removeInscription}
            retireInscription={retireInscriptionFn} reactiverInscription={reactiverInscriptionFn}
            missionTypes={missionTypes}
          />
        ) : mode==='admin' ? (
          <AdminView salaries={salaries} addSalarie={addSalarie} updateSalarie={updateSalarie} removeSalarie={removeSalarie} evenements={evenements} inscriptions={inscriptions} updateInscription={updateInscription} removeInscription={removeInscription} missionTypes={missionTypes} creerCompte={creerCompteSalarie} />
        ) : (
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid var(--border)', padding:24 }}>
            <MissionsConfig missionTypes={missionTypes} saveMissionType={saveMissionType} removeMissionType={removeMissionType} />
          </div>
        )}
      </main>
      {showListe && <ListeSalaries salaries={salaries} onClose={() => setShowListe(false)} />}
      {showImport && <ImportSalaries onClose={() => setShowImport(false)} onImported={loadAll} />}
    </div>
  );
}
