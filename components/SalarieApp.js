import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import * as db from '../lib/db';

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
const AVATAR_COLORS = [
  {bg:'#fcebeb',txt:'#a32d2d'},{bg:'#e6f1fb',txt:'#185fa5'},{bg:'#eaf3de',txt:'#3b6d11'},
  {bg:'#faeeda',txt:'#854f0b'},{bg:'#eeedfe',txt:'#534ab7'},{bg:'#e1f5ee',txt:'#0f6e56'},{bg:'#fbeaf0',txt:'#993556'},
];

function dureeH(d,f){const[dh,dm]=d.split(':').map(Number);const[fh,fm]=f.split(':').map(Number);return(fh*60+fm-(dh*60+dm))/60;}
function fmtH(h){if(h<=0)return'0h';const hh=Math.floor(h);const mm=Math.round((h-hh)*60);return mm?`${hh}h${String(mm).padStart(2,'0')}`:`${hh}h`;}
function initiales(p,n){return((p?.[0]||'')+(n?.[0]||'')).toUpperCase();}

export default function SalarieApp({ session, onLogout }) {
  const [salarie, setSalarie] = useState(null);
  const [evenements, setEvenements] = useState([]);
  const [inscriptions, setInscriptions] = useState([]);
  const [missionTypes, setMissionTypes] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('planning'); // 'planning' | 'disponibles'

  const now = new Date().toISOString().slice(0,10);

  const loadData = useCallback(async () => {
    try {
      // Trouver le salarié lié à cet email
      const email = session.user.email;
      const { data: authData } = await supabase.from('salarie_auth').select('salarie_id').eq('email', email).single();
      
      const [sals, evs, inscs, mts] = await Promise.all([db.getSalaries(), db.getEvenements(), db.getInscriptions(), db.getMissionTypes()]);
      
      setEvenements(evs);
      setInscriptions(inscs);
      setMissionTypes(mts);
      
      if (authData) {
        const sal = sals.find(s => s.id === authData.salarie_id);
        setSalarie(sal || null);
      }
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [session]);

  useEffect(() => { loadData(); }, [loadData]);

  async function sInscrire(evId) {
    if (!salarie) return;
    await db.addInscription({ evenementId: evId, salarieId: salarie.id, statut: 'en_attente', source: 'salarie' });
    const inscs = await db.getInscriptions();
    setInscriptions(inscs);
  }
  async function seDesinscrire(inscId) {
    await db.deleteInscription(inscId);
    setInscriptions(p => p.filter(i => i.id !== inscId));
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#f8f6f2' }}>
      <div style={{ textAlign:'center', color:'#888' }}><div style={{ fontSize:32, marginBottom:8 }}>⏳</div>Chargement…</div>
    </div>
  );

  if (!salarie) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#f8f6f2', padding:20 }}>
      <div style={{ background:'#fff', borderRadius:16, padding:32, maxWidth:360, textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:12 }}>⚠️</div>
        <div style={{ fontSize:16, fontWeight:600, marginBottom:8 }}>Compte non lié</div>
        <div style={{ fontSize:13, color:'#888', marginBottom:20 }}>Votre compte n'est pas encore associé à une fiche salarié. Contactez l'administrateur.</div>
        <button onClick={onLogout} style={{ padding:'9px 20px', background:'#a32d2d', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13 }}>Déconnexion</button>
      </div>
    </div>
  );

  const mesInscriptions = inscriptions.filter(i => i.salarieId === salarie.id);
  const mesEvsValides = evenements.filter(e => mesInscriptions.find(i => i.evenementId === e.id && i.statut === 'valide')).sort((a,b)=>a.date.localeCompare(b.date));
  const mesEvsEnAttente = evenements.filter(e => mesInscriptions.find(i => i.evenementId === e.id && i.statut === 'en_attente'));
  const evOuverts = evenements.filter(e => e.ouvert && e.date >= now && !mesInscriptions.find(i => i.evenementId === e.id));
  const hEffectuees = mesEvsValides.filter(e=>e.date<now).reduce((s,e)=>s+dureeH(e.debut,e.fin),0);
  const hAVenir = mesEvsValides.filter(e=>e.date>=now).reduce((s,e)=>s+dureeH(e.debut,e.fin),0);
  const prochaine = mesEvsValides.find(e=>e.date>=now);
  const c = AVATAR_COLORS[salarie.colorIdx % AVATAR_COLORS.length];

  return (
    <div style={{ minHeight:'100vh', background:'#f8f6f2', fontFamily:'var(--font)' }}>
      {/* Header mobile */}
      <header style={{ background:'#a32d2d', padding:'16px 20px', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <img src="/logo.jpg" style={{ width:32, height:32, borderRadius:'50%', objectFit:'cover', border:'1.5px solid rgba(255,255,255,0.4)' }} />
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{salarie.prenom} {salarie.nom}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.7)' }}>{salarie.role || 'Salarié saisonnier'}</div>
            </div>
          </div>
          <button onClick={onLogout} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8, padding:'6px 12px', fontSize:12, color:'#fff', cursor:'pointer' }}>
            Déconnexion
          </button>
        </div>
      </header>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, padding:'16px 16px 0' }}>
        {[
          { label:'Heures effectuées', value:fmtH(hEffectuees) },
          { label:'Heures à venir', value:fmtH(hAVenir) },
          { label:'Missions à venir', value:mesEvsValides.filter(e=>e.date>=now).length },
        ].map(({ label, value }) => (
          <div key={label} style={{ background:'#fff', borderRadius:12, padding:'12px 10px', textAlign:'center', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize:20, fontWeight:700, color:'#1a1a18' }}>{value}</div>
            <div style={{ fontSize:10, color:'#888', marginTop:2, lineHeight:1.3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Prochaine mission */}
      {prochaine && (
        <div style={{ margin:'12px 16px 0', background:'#a32d2d', borderRadius:14, padding:'14px 16px', color:'#fff' }}>
          <div style={{ fontSize:11, opacity:0.8, marginBottom:4 }}>Prochaine mission</div>
          <div style={{ fontSize:16, fontWeight:700 }}>{prochaine.nom || 'Mission planifiée'}</div>
          <div style={{ fontSize:13, opacity:0.9, marginTop:4 }}>
            {DAYS[new Date(prochaine.date).getDay()]} {new Date(prochaine.date).getDate()} {MONTHS[new Date(prochaine.date).getMonth()]} · {prochaine.debut}–{prochaine.fin}
          </div>
          {prochaine.lieu && <div style={{ fontSize:12, opacity:0.8, marginTop:2 }}>📍 {prochaine.lieu}</div>}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, margin:'16px 16px 0', background:'#fff', borderRadius:12, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
        {[
          { key:'planning', label:`📋 Mon planning (${mesEvsValides.length})` },
          { key:'disponibles', label:`🔓 S'inscrire${evOuverts.length>0?` (${evOuverts.length})`:''}` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex:1, padding:'12px 8px', border:'none', fontSize:12, fontWeight:tab===key?600:400,
            background:tab===key?'#a32d2d':'transparent',
            color:tab===key?'#fff':'#888',
            cursor:'pointer', fontFamily:'var(--font)', transition:'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {/* Contenu */}
      <div style={{ padding:'12px 16px 32px' }}>

        {/* MON PLANNING */}
        {tab === 'planning' && (
          <div>
            {/* En attente */}
            {mesEvsEnAttente.length > 0 && (
              <div style={{ background:'#fffdf7', border:'1px solid #f0d5a0', borderRadius:12, padding:'12px 14px', marginBottom:12 }}>
                <div style={{ fontSize:11, fontWeight:600, color:'#854f0b', marginBottom:8 }}>⏳ En attente de validation ({mesEvsEnAttente.length})</div>
                {mesEvsEnAttente.map(ev => {
                  const insc = mesInscriptions.find(i => i.evenementId === ev.id && i.statut === 'en_attente');
                  const mt = missionTypes[ev.type] || {};
                  return (
                    <div key={ev.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                      <div>
                        <span style={{ fontSize:13, fontWeight:500 }}>{ev.nom || mt.label}</span>
                        <span style={{ fontSize:11, color:'#888', marginLeft:8 }}>{new Date(ev.date).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}</span>
                      </div>
                      <button onClick={() => insc && seDesinscrire(insc.id)} style={{ background:'none', border:'none', color:'#888', cursor:'pointer', fontSize:12 }}>Annuler</button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Missions validées */}
            {mesEvsValides.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 20px', color:'#aaa' }}>
                <div style={{ fontSize:36, marginBottom:8 }}>📋</div>
                <div>Aucune mission planifiée</div>
              </div>
            ) : (
              mesEvsValides.map(ev => {
                const mt = missionTypes[ev.type] || Object.values(missionTypes)[0] || { label:ev.type, icon:'📌', bg:'#f1efe8', color:'#5f5e5a' };
                const estPassee = ev.date < now;
                const d = new Date(ev.date);
                return (
                  <div key={ev.id} style={{ background:'#fff', borderRadius:14, padding:'14px 16px', marginBottom:10, boxShadow:'0 1px 3px rgba(0,0,0,0.06)', opacity:estPassee?0.6:1, borderLeft:`4px solid ${mt.color}` }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                      <div style={{ flex:1 }}>
                        {ev.nom && <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>{ev.nom}</div>}
                        {ev.ref && <div style={{ fontSize:11, color:'#888', fontFamily:'var(--font-mono)', marginBottom:6 }}>{ev.ref}</div>}
                        <span style={{ background:mt.bg, color:mt.color, fontSize:11, padding:'3px 9px', borderRadius:20, fontWeight:500 }}>{mt.icon} {mt.label}</span>
                        {ev.lieu && <span style={{ fontSize:12, color:'#888', marginLeft:8 }}>📍 {ev.lieu}</span>}
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0, marginLeft:12 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:estPassee?'#aaa':'#a32d2d' }}>
                          {DAYS[d.getDay()]} {d.getDate()} {MONTHS[d.getMonth()].slice(0,3)}.
                        </div>
                        <div style={{ fontSize:12, color:'#888', fontFamily:'var(--font-mono)', marginTop:2 }}>{ev.debut}–{ev.fin}</div>
                        <div style={{ fontSize:12, fontWeight:600, color:'#888', marginTop:2 }}>{fmtH(dureeH(ev.debut,ev.fin))}</div>
                      </div>
                    </div>
                    {ev.note && <div style={{ fontSize:12, color:'#888', fontStyle:'italic', marginTop:8, paddingTop:8, borderTop:'1px solid #f0ede6' }}>💬 {ev.note}</div>}
                    {estPassee && <div style={{ fontSize:11, color:'#3b6d11', background:'#eaf3de', display:'inline-block', padding:'2px 8px', borderRadius:20, marginTop:8 }}>✅ Effectuée</div>}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ÉVÉNEMENTS DISPONIBLES */}
        {tab === 'disponibles' && (
          <div>
            {evOuverts.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 20px', color:'#aaa' }}>
                <div style={{ fontSize:36, marginBottom:8 }}>🔓</div>
                <div>Aucun événement ouvert aux inscriptions</div>
              </div>
            ) : (
              evOuverts.map(ev => {
                const mt = missionTypes[ev.type] || Object.values(missionTypes)[0] || { label:ev.type, icon:'📌', bg:'#f1efe8', color:'#5f5e5a' };
                const inscrits = inscriptions.filter(i=>i.evenementId===ev.id&&i.statut==='valide').length;
                const complet = inscrits >= ev.effectif;
                const d = new Date(ev.date);
                return (
                  <div key={ev.id} style={{ background:'#fff', borderRadius:14, padding:'14px 16px', marginBottom:10, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                      <div>
                        {ev.nom && <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>{ev.nom}</div>}
                        <span style={{ background:mt.bg, color:mt.color, fontSize:11, padding:'3px 9px', borderRadius:20, fontWeight:500 }}>{mt.icon} {mt.label}</span>
                      </div>
                      <button
                        onClick={() => !complet && sInscrire(ev.id)}
                        disabled={complet}
                        style={{ background:complet?'#f1efe8':'#a32d2d', color:complet?'#aaa':'#fff', border:'none', borderRadius:10, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:complet?'not-allowed':'pointer', flexShrink:0, fontFamily:'var(--font)' }}
                      >
                        {complet ? 'Complet' : "M'inscrire"}
                      </button>
                    </div>
                    <div style={{ fontSize:13, color:'#555', marginTop:6 }}>
                      📅 {DAYS[d.getDay()]} {d.getDate()} {MONTHS[d.getMonth()]} · {ev.debut}–{ev.fin}
                    </div>
                    {ev.lieu && <div style={{ fontSize:12, color:'#888', marginTop:3 }}>📍 {ev.lieu}</div>}
                    <div style={{ fontSize:11, color:'#aaa', marginTop:6 }}>{inscrits}/{ev.effectif} inscrits</div>
                    {ev.note && <div style={{ fontSize:12, color:'#888', fontStyle:'italic', marginTop:6 }}>💬 {ev.note}</div>}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
