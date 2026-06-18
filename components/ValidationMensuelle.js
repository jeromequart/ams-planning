import { useState } from 'react';
import HistoriqueModal from './HistoriqueModal';

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

function getAge(dateNaissance) {
  if (!dateNaissance) return null;
  const today = new Date(); const birth = new Date(dateNaissance);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}
function getDiplomeBadge(sal) {
  const badges = [];
  if (sal.chefEquipe) badges.push({ label:'Chef éq.', color:'#534AB7', bg:'#EEEDFE' });
  if (sal.pse2) badges.push({ label:'PSE 2', color:'#185FA5', bg:'#E6F1FB' });
  else if (sal.pse1) badges.push({ label:'PSE 1', color:'#185FA5', bg:'#E6F1FB' });
  if (sal.bnssa) badges.push({ label:'BNSSA', color:'#0F6E56', bg:'#E1F5EE' });
  return badges;
}
function dureeH(d,f){const[dh,dm]=d.split(':').map(Number);const[fh,fm]=f.split(':').map(Number);return(fh*60+fm-(dh*60+dm))/60;}
function fmtH(h){if(h<=0)return'0h';const hh=Math.floor(h);const mm=Math.round((h-hh)*60);return mm?`${hh}h${String(mm).padStart(2,'0')}`:`${hh}h`;}
function initiales(p,n){return((p?.[0]||'')+(n?.[0]||'')).toUpperCase();}
function localDateStr(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function fmtDate(ds){const d=new Date(ds+'T12:00:00');return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)}.`;}

const AVATAR_COLORS=[
  {bg:'#FCEBEB',txt:'#A32D2D'},{bg:'#E6F1FB',txt:'#185FA5'},{bg:'#EAF3DE',txt:'#3B6D11'},
  {bg:'#FAEEDA',txt:'#854F0B'},{bg:'#EEEDFE',txt:'#534AB7'},{bg:'#E1F5EE',txt:'#0F6E56'},{bg:'#FBEAF0',txt:'#993556'},
];

export default function ValidationMensuelle({ salaries, evenements, inscriptions, addInscription, updateInscription, removeInscription, retireInscription, reactiverInscription, missionTypes }) {
  const [current, setCurrent] = useState(() => { const d=new Date(); d.setDate(1); return d; });
  const [subTab, setSubTab] = useState('attente'); // 'attente' | 'evenement' | 'salarie' | 'tableau'
  const [saving, setSaving] = useState({});
  const [historique, setHistorique] = useState(null);
  const [selectedEvId, setSelectedEvId] = useState(null);
  const [selectedSalId, setSelectedSalId] = useState(null);
  const [searchEv, setSearchEv] = useState('');
  const [searchSal, setSearchSal] = useState('');
  const [showRetires, setShowRetires] = useState(false);

  const year = current.getFullYear();
  const month = current.getMonth();
  const now = localDateStr(new Date());

  const evMois = evenements
    .filter(e => { const d=new Date(e.date+'T12:00:00'); return d.getFullYear()===year && d.getMonth()===month; })
    .sort((a,b) => a.date.localeCompare(b.date));

  const inscActives = inscriptions.filter(i => i.statut !== 'retire');

  // Toutes les demandes en attente, tous événements confondus (mois en cours seulement par défaut)
  const toutesAttentes = inscActives
    .filter(i => i.statut === 'en_attente')
    .map(i => ({ ...i, evenement: evenements.find(e => e.id === i.evenementId), salarie: salaries.find(s => s.id === i.salarieId) }))
    .filter(i => i.evenement && i.salarie)
    .sort((a,b) => a.evenement.date.localeCompare(b.evenement.date));

  const totalValides = inscActives.filter(i => {
    const ev = evenements.find(e=>e.id===i.evenementId);
    if (!ev) return false;
    const d=new Date(ev.date+'T12:00:00');
    return d.getFullYear()===year && d.getMonth()===month && i.statut==='valide';
  }).length;

  const totalAttente = toutesAttentes.length;

  const postsNonPourvus = evMois.reduce((acc, ev) => {
    const valides = inscActives.filter(i=>i.evenementId===ev.id&&i.statut==='valide').length;
    return acc + Math.max(0, ev.effectif - valides);
  }, 0);

  function heuresSalarie(salarieId) {
    return evMois.reduce((acc, ev) => {
      const insc = inscActives.find(i=>i.evenementId===ev.id&&i.salarieId===salarieId&&i.statut==='valide');
      return acc + (insc ? dureeH(ev.debut, ev.fin) : 0);
    }, 0);
  }

  async function valider(inscId) {
    setSaving(p=>({...p,[inscId]:true}));
    await updateInscription(inscId, 'valide');
    setSaving(p=>({...p,[inscId]:false}));
  }
  async function handleRetirer(inscId) {
    setSaving(p=>({...p,[inscId]:true}));
    await retireInscription(inscId, 'admin');
    setSaving(p=>({...p,[inscId]:false}));
  }
  async function refuser(inscId) {
    setSaving(p=>({...p,[inscId]:true}));
    await retireInscription(inscId, 'admin');
    setSaving(p=>({...p,[inscId]:false}));
  }
  async function inscrire(evId, salarieId) {
    const exists = inscriptions.find(i=>i.evenementId===evId&&i.salarieId===salarieId&&i.statut!=='retire');
    if (exists) return;
    const retire = inscriptions.find(i=>i.evenementId===evId&&i.salarieId===salarieId&&i.statut==='retire');
    if (retire) { await reactiverInscription(retire.id, 'valide', 'admin'); return; }
    await addInscription({ evenementId:evId, salarieId, statut:'valide', source:'admin' });
  }
  async function validerTousEvenement(evId) {
    const attentes = inscriptions.filter(i=>i.evenementId===evId&&i.statut==='en_attente');
    for (const i of attentes) await updateInscription(i.id, 'valide');
  }
  async function validerToutMois() {
    if (!confirm(`Valider toutes les demandes en attente de ${MONTHS[month]} ?`)) return;
    for (const i of toutesAttentes) await updateInscription(i.id, 'valide');
  }

  const s = styles;
  const selectedEv = evenements.find(e => e.id === selectedEvId);
  const selectedSal = salaries.find(s => s.id === selectedSalId);

  const subTabs = [
    { key:'attente', label:`⏳ Demandes en attente`, badge: totalAttente },
    { key:'evenement', label:'📅 Par événement' },
    { key:'salarie', label:'👤 Par salarié' },
    { key:'tableau', label:"📊 Vue d'ensemble" },
  ];

  return (
    <div>
      {/* Toolbar mois */}
      <div style={s.toolbar}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button style={s.navBtn} onClick={()=>setCurrent(new Date(year,month-1,1))}>‹</button>
          <button style={s.navBtn} onClick={()=>setCurrent(new Date(year,month+1,1))}>›</button>
          <span style={{ fontSize:16, fontWeight:500, color:'var(--text)' }}>{MONTHS[month]} {year}</span>
        </div>
        {totalAttente > 0 && (
          <button onClick={validerToutMois} style={{ background:'#EAF3DE', color:'#3B6D11', border:'0.5px solid #C0DD97', fontSize:12, fontWeight:500, padding:'7px 14px', borderRadius:8, cursor:'pointer', fontFamily:'var(--font)' }}>
            ✓ Tout valider le mois
          </button>
        )}
      </div>

      {/* Stats globales */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
        {[
          { label:'Événements', value:evMois.length },
          { label:'Inscriptions validées', value:totalValides },
          { label:'En attente', value:totalAttente, warn:totalAttente>0 },
          { label:'Postes non pourvus', value:postsNonPourvus, danger:postsNonPourvus>0 },
        ].map(({ label, value, warn, danger }) => (
          <div key={label} style={{ background:'#f8f6f2', borderRadius:10, padding:'10px 14px' }}>
            <div style={{ fontSize:11, color:'var(--text-2)', marginBottom:4 }}>{label}</div>
            <div style={{ fontSize:22, fontWeight:500, fontFamily:'var(--font-mono)', color:danger?'#A32D2D':warn?'#854F0B':'var(--text)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Sous-onglets */}
      <div style={{ display:'flex', gap:4, background:'#f8f6f2', borderRadius:10, padding:4, marginBottom:16, width:'fit-content' }}>
        {subTabs.map(({ key, label, badge }) => (
          <button key={key} onClick={()=>setSubTab(key)} style={{
            padding:'7px 14px', borderRadius:7, border:'none', fontSize:12,
            fontWeight: subTab===key ? 600 : 400, cursor:'pointer',
            background: subTab===key ? '#fff' : 'transparent',
            color: subTab===key ? 'var(--text)' : 'var(--text-2)',
            boxShadow: subTab===key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            fontFamily:'var(--font)', position:'relative', display:'flex', alignItems:'center', gap:6,
          }}>
            {label}
            {badge > 0 && <span style={{ background:'#a32d2d', color:'#fff', borderRadius:10, fontSize:10, padding:'1px 6px', fontWeight:700 }}>{badge}</span>}
          </button>
        ))}
      </div>

      {/* ═══════ ONGLET DEMANDES EN ATTENTE ═══════ */}
      {subTab === 'attente' && (
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid var(--border)', overflow:'hidden' }}>
          {toutesAttentes.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px', color:'var(--text-3)' }}>
              <div style={{ fontSize:36, marginBottom:12 }}>✅</div>
              <div>Aucune demande en attente ce mois-ci.</div>
            </div>
          ) : (
            <div>
              {toutesAttentes.map((insc, idx) => {
                const ev = insc.evenement, sal = insc.salarie;
                const mt = missionTypes[ev.type] || Object.values(missionTypes)[0] || { label:ev.type, icon:'📌', bg:'#f1efe8', color:'#5f5e5a' };
                const c = AVATAR_COLORS[sal.colorIdx % AVATAR_COLORS.length];
                const diplomes = getDiplomeBadge(sal);
                const age = getAge(sal.dateNaissance);
                const inscritsCount = inscActives.filter(i=>i.evenementId===ev.id&&i.statut==='valide').length;
                return (
                  <div key={insc.id} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderBottom: idx<toutesAttentes.length-1?'1px solid var(--border)':'none' }}>
                    {/* Avatar salarié */}
                    <div style={{ width:38, height:38, borderRadius:'50%', background:c.bg, color:c.txt, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:600, flexShrink:0, position:'relative' }}>
                      {initiales(sal.prenom, sal.nom)}
                      {age !== null && age < 18 && <span style={{ position:'absolute', top:-4, right:-4, background:'#A32D2D', color:'#fff', fontSize:8, borderRadius:8, padding:'0 4px' }}>-18</span>}
                    </div>
                    {/* Infos */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:600 }}>{sal.prenom} {sal.nom}
                        {diplomes.length > 0 && <span style={{ marginLeft:8 }}>{diplomes.map(d => <span key={d.label} style={{ fontSize:10, background:d.bg, color:d.color, padding:'1px 6px', borderRadius:10, marginRight:3 }}>{d.label}</span>)}</span>}
                      </div>
                      <div style={{ fontSize:12, color:'var(--text-2)', marginTop:3 }}>
                        souhaite s'inscrire à <strong>{ev.nom || mt.label}</strong>
                        {ev.ref && <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-3)' }}> [{ev.ref}]</span>}
                      </div>
                      <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>
                        {fmtDate(ev.date)} · {ev.debut}–{ev.fin} · {inscritsCount}/{ev.effectif} places
                      </div>
                    </div>
                    {/* Type badge */}
                    <span style={{ background:mt.bg, color:mt.color, fontSize:11, padding:'3px 9px', borderRadius:20, fontWeight:500, flexShrink:0 }}>{mt.icon} {mt.label}</span>
                    {/* Actions */}
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      <button onClick={()=>valider(insc.id)} disabled={saving[insc.id]}
                        style={{ background:'#EAF3DE', color:'#3B6D11', border:'none', borderRadius:8, padding:'8px 14px', fontSize:12, fontWeight:600, cursor:'pointer' }}>✓ Valider</button>
                      <button onClick={()=>refuser(insc.id)} disabled={saving[insc.id]}
                        style={{ background:'#FCEBEB', color:'#A32D2D', border:'none', borderRadius:8, padding:'8px 14px', fontSize:12, fontWeight:600, cursor:'pointer' }}>✕ Refuser</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════ ONGLET PAR ÉVÉNEMENT ═══════ */}
      {subTab === 'evenement' && (
        <div style={{ display:'grid', gridTemplateColumns: selectedEv ? '280px 1fr' : '1fr', gap:16 }}>
          {/* Liste événements */}
          <div>
            <input
              style={{ width:'100%', padding:'8px 12px', border:'1px solid var(--border-med)', borderRadius:8, fontSize:13, marginBottom:10, fontFamily:'var(--font)' }}
              placeholder="Rechercher un événement…"
              value={searchEv}
              onChange={e=>setSearchEv(e.target.value)}
            />
            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight: selectedEv ? 600 : 'none', overflowY: selectedEv ? 'auto' : 'visible' }}>
              {evMois.filter(ev => (ev.nom||'').toLowerCase().includes(searchEv.toLowerCase()) || (ev.ref||'').toLowerCase().includes(searchEv.toLowerCase())).map(ev => {
                const mt = missionTypes[ev.type] || Object.values(missionTypes)[0] || { label:ev.type, icon:'📌', bg:'#f1efe8', color:'#5f5e5a' };
                const inscritsCount = inscActives.filter(i=>i.evenementId===ev.id&&i.statut==='valide').length;
                const attentesCount = inscriptions.filter(i=>i.evenementId===ev.id&&i.statut==='en_attente').length;
                const isSel = selectedEvId === ev.id;
                return (
                  <div key={ev.id} onClick={()=>setSelectedEvId(ev.id)}
                    style={{ background:'#fff', borderRadius:10, border:`1px solid ${isSel?mt.color:'var(--border)'}`, padding:'12px 14px', cursor:'pointer' }}>
                    <div style={{ fontSize:13, fontWeight:600 }}>{ev.nom || mt.label}</div>
                    <div style={{ fontSize:11, color:'var(--text-2)', marginTop:3 }}>{fmtDate(ev.date)} · {ev.debut}–{ev.fin}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6 }}>
                      <span style={{ fontSize:11, color: inscritsCount>=ev.effectif?'#3B6D11':'#854F0B', fontWeight:600 }}>{inscritsCount}/{ev.effectif}</span>
                      {attentesCount > 0 && <span style={{ background:'#FAEEDA', color:'#854F0B', fontSize:10, padding:'1px 6px', borderRadius:10 }}>⏳ {attentesCount}</span>}
                    </div>
                  </div>
                );
              })}
              {evMois.length === 0 && <div style={{ textAlign:'center', padding:24, color:'var(--text-3)', fontSize:13 }}>Aucun événement ce mois.</div>}
            </div>
          </div>

          {/* Détail événement sélectionné */}
          {selectedEv && (() => {
            const mt = missionTypes[selectedEv.type] || Object.values(missionTypes)[0] || { label:selectedEv.type, icon:'📌', bg:'#f1efe8', color:'#5f5e5a' };
            const inscritsValides = inscActives.filter(i=>i.evenementId===selectedEv.id&&i.statut==='valide');
            const attentes = inscriptions.filter(i=>i.evenementId===selectedEv.id&&i.statut==='en_attente');
            const dispoSalaries = salaries.filter(s => !inscriptions.find(i=>i.evenementId===selectedEv.id&&i.salarieId===s.id&&i.statut!=='retire'));
            return (
              <div style={{ background:'#fff', borderRadius:14, border:'1px solid var(--border)', padding:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                  <div>
                    <div style={{ fontSize:17, fontWeight:700 }}>{selectedEv.nom || mt.label}</div>
                    {selectedEv.ref && <div style={{ fontSize:12, color:'var(--text-3)', fontFamily:'var(--font-mono)' }}>{selectedEv.ref}</div>}
                    <div style={{ fontSize:13, color:'var(--text-2)', marginTop:6 }}>{fmtDate(selectedEv.date)} · {selectedEv.debut}–{selectedEv.fin}{selectedEv.lieu && ` · 📍 ${selectedEv.lieu}`}</div>
                  </div>
                  <span style={{ background:mt.bg, color:mt.color, fontSize:12, padding:'4px 12px', borderRadius:20, fontWeight:500 }}>{mt.icon} {mt.label}</span>
                </div>

                {/* Demandes en attente pour cet event */}
                {attentes.length > 0 && (
                  <div style={{ marginBottom:18 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:'#854F0B', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>⏳ Demandes en attente ({attentes.length})</div>
                    {attentes.map(insc => {
                      const sal = salaries.find(s=>s.id===insc.salarieId);
                      if (!sal) return null;
                      const c = AVATAR_COLORS[sal.colorIdx%AVATAR_COLORS.length];
                      return (
                        <div key={insc.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                          <div style={{ width:30, height:30, borderRadius:'50%', background:c.bg, color:c.txt, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600 }}>{initiales(sal.prenom,sal.nom)}</div>
                          <span style={{ fontSize:13, flex:1 }}>{sal.prenom} {sal.nom}</span>
                          <button onClick={()=>valider(insc.id)} style={{ background:'#EAF3DE', color:'#3B6D11', border:'none', borderRadius:7, padding:'5px 12px', fontSize:12, cursor:'pointer', fontWeight:600 }}>✓</button>
                          <button onClick={()=>refuser(insc.id)} style={{ background:'#FCEBEB', color:'#A32D2D', border:'none', borderRadius:7, padding:'5px 12px', fontSize:12, cursor:'pointer', fontWeight:600 }}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Équipe validée */}
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>
                    Équipe ({inscritsValides.length}/{selectedEv.effectif})
                  </div>
                  {inscritsValides.length === 0 ? (
                    <div style={{ fontSize:13, color:'var(--text-3)', fontStyle:'italic' }}>Aucun salarié inscrit</div>
                  ) : (
                    inscritsValides.map(insc => {
                      const sal = salaries.find(s=>s.id===insc.salarieId);
                      if (!sal) return null;
                      const c = AVATAR_COLORS[sal.colorIdx%AVATAR_COLORS.length];
                      const diplomes = getDiplomeBadge(sal);
                      return (
                        <div key={insc.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                          <div style={{ width:30, height:30, borderRadius:'50%', background:c.bg, color:c.txt, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600 }}>{initiales(sal.prenom,sal.nom)}</div>
                          <span style={{ fontSize:13, flex:1 }}>{sal.prenom} {sal.nom}</span>
                          {diplomes.map(d=><span key={d.label} style={{ fontSize:10, background:d.bg, color:d.color, padding:'1px 6px', borderRadius:10, marginRight:3 }}>{d.label}</span>)}
                          <button onClick={()=>handleRetirer(insc.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', fontSize:14 }}>✕</button>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Ajouter un salarié */}
                <select
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--border-med)', borderRadius:8, fontSize:13, fontFamily:'var(--font)' }}
                  value="" onChange={e=>{ if(e.target.value) inscrire(selectedEv.id, e.target.value); e.target.value=''; }}
                >
                  <option value="">+ Inscrire un salarié…</option>
                  {dispoSalaries.map(s=><option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>)}
                </select>
              </div>
            );
          })()}
        </div>
      )}

      {/* ═══════ ONGLET PAR SALARIÉ ═══════ */}
      {subTab === 'salarie' && (
        <div style={{ display:'grid', gridTemplateColumns: selectedSal ? '280px 1fr' : '1fr', gap:16 }}>
          {/* Liste salariés */}
          <div>
            <input
              style={{ width:'100%', padding:'8px 12px', border:'1px solid var(--border-med)', borderRadius:8, fontSize:13, marginBottom:10, fontFamily:'var(--font)' }}
              placeholder="Rechercher un salarié…"
              value={searchSal}
              onChange={e=>setSearchSal(e.target.value)}
            />
            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight: selectedSal ? 600 : 'none', overflowY: selectedSal ? 'auto' : 'visible' }}>
              {salaries.filter(sal => `${sal.prenom} ${sal.nom}`.toLowerCase().includes(searchSal.toLowerCase())).map(sal => {
                const c = AVATAR_COLORS[sal.colorIdx%AVATAR_COLORS.length];
                const h = heuresSalarie(sal.id);
                const isSel = selectedSalId === sal.id;
                const nbMissions = evMois.filter(ev => inscActives.find(i=>i.evenementId===ev.id&&i.salarieId===sal.id&&i.statut==='valide')).length;
                return (
                  <div key={sal.id} onClick={()=>setSelectedSalId(sal.id)}
                    style={{ display:'flex', alignItems:'center', gap:10, background:'#fff', borderRadius:10, border:`1px solid ${isSel?'var(--red)':'var(--border)'}`, padding:'10px 12px', cursor:'pointer' }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', background:c.bg, color:c.txt, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, flexShrink:0 }}>{initiales(sal.prenom,sal.nom)}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{sal.prenom} {sal.nom}</div>
                      <div style={{ fontSize:11, color:'var(--text-2)' }}>{nbMissions} mission{nbMissions>1?'s':''}</div>
                    </div>
                    <div style={{ fontSize:12, fontWeight:600, fontFamily:'var(--font-mono)', color: h>48?'#A32D2D':h>35?'#854F0B':'#3B6D11' }}>{fmtH(h)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Détail salarié sélectionné */}
          {selectedSal && (() => {
            const c = AVATAR_COLORS[selectedSal.colorIdx%AVATAR_COLORS.length];
            const diplomes = getDiplomeBadge(selectedSal);
            const evsSal = evMois.filter(ev => inscActives.find(i=>i.evenementId===ev.id&&i.salarieId===selectedSal.id&&i.statut==='valide'));
            const attentesSal = evMois.filter(ev => inscriptions.find(i=>i.evenementId===ev.id&&i.salarieId===selectedSal.id&&i.statut==='en_attente'));
            const h = heuresSalarie(selectedSal.id);
            return (
              <div style={{ background:'#fff', borderRadius:14, border:'1px solid var(--border)', padding:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
                  <div style={{ width:48, height:48, borderRadius:'50%', background:c.bg, color:c.txt, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:600 }}>{initiales(selectedSal.prenom,selectedSal.nom)}</div>
                  <div>
                    <div style={{ fontSize:17, fontWeight:700 }}>{selectedSal.prenom} {selectedSal.nom}</div>
                    <div style={{ display:'flex', gap:4, marginTop:4 }}>{diplomes.map(d=><span key={d.label} style={{ fontSize:11, background:d.bg, color:d.color, padding:'2px 8px', borderRadius:20 }}>{d.label}</span>)}</div>
                  </div>
                  <div style={{ marginLeft:'auto', textAlign:'right' }}>
                    <div style={{ fontSize:11, color:'var(--text-3)' }}>Heures ce mois</div>
                    <div style={{ fontSize:20, fontWeight:700, fontFamily:'var(--font-mono)', color: h>48?'#A32D2D':h>35?'#854F0B':'#3B6D11' }}>{fmtH(h)}</div>
                  </div>
                </div>

                {attentesSal.length > 0 && (
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:'#854F0B', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>⏳ Demandes en attente</div>
                    {attentesSal.map(ev => {
                      const insc = inscriptions.find(i=>i.evenementId===ev.id&&i.salarieId===selectedSal.id&&i.statut==='en_attente');
                      const mt = missionTypes[ev.type]||{};
                      return (
                        <div key={ev.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                          <span style={{ background:mt.bg, color:mt.color, fontSize:11, padding:'2px 8px', borderRadius:20 }}>{mt.icon} {mt.label}</span>
                          <span style={{ fontSize:13, flex:1 }}>{ev.nom} — {fmtDate(ev.date)}</span>
                          <button onClick={()=>valider(insc.id)} style={{ background:'#EAF3DE', color:'#3B6D11', border:'none', borderRadius:7, padding:'5px 12px', fontSize:12, cursor:'pointer' }}>✓</button>
                          <button onClick={()=>refuser(insc.id)} style={{ background:'#FCEBEB', color:'#A32D2D', border:'none', borderRadius:7, padding:'5px 12px', fontSize:12, cursor:'pointer' }}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>Planning du mois</div>
                {evsSal.length === 0 ? (
                  <div style={{ fontSize:13, color:'var(--text-3)', fontStyle:'italic' }}>Aucune mission ce mois.</div>
                ) : (
                  evsSal.map(ev => {
                    const mt = missionTypes[ev.type]||{};
                    return (
                      <div key={ev.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                        <span style={{ background:mt.bg, color:mt.color, fontSize:11, padding:'2px 8px', borderRadius:20 }}>{mt.icon} {mt.label}</span>
                        <span style={{ fontSize:13, flex:1 }}>{ev.nom} — {fmtDate(ev.date)} · {ev.debut}–{ev.fin}</span>
                        <span style={{ fontSize:12, fontFamily:'var(--font-mono)', color:'var(--text-2)' }}>{fmtH(dureeH(ev.debut,ev.fin))}</span>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ═══════ ONGLET TABLEAU CROISÉ (gardé pour petites équipes) ═══════ */}
      {subTab === 'tableau' && (
        <div>
          {salaries.length > 15 && (
            <div style={{ background:'#faeeda', border:'1px solid #f0d5a0', borderRadius:10, padding:'12px 16px', marginBottom:14, fontSize:13, color:'#854F0B' }}>
              ⚠️ Cette vue tableau devient difficile à lire au-delà de 15 salariés. Utilisez plutôt les onglets "Par événement" ou "Par salarié" pour une équipe nombreuse.
            </div>
          )}
          {evMois.length === 0 ? (
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid var(--border)', padding:'48px', textAlign:'center', color:'var(--text-3)' }}>Aucun événement ce mois.</div>
          ) : (
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid var(--border)', overflow:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, minWidth:500+salaries.length*90 }}>
                <thead>
                  <tr style={{ background:'#fafaf8', borderBottom:'1px solid var(--border)' }}>
                    <th style={{ ...s.th, textAlign:'left', paddingLeft:16, width:220, minWidth:220, position:'sticky', left:0, zIndex:3, background:'#fafaf8' }}>Événement</th>
                    {salaries.map(sal => {
                      const h = heuresSalarie(sal.id);
                      const c = AVATAR_COLORS[sal.colorIdx%AVATAR_COLORS.length];
                      return (
                        <th key={sal.id} style={{ ...s.th, width:90, minWidth:90 }}>
                          <div style={{ width:26, height:26, borderRadius:'50%', background:c.bg, color:c.txt, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:500, margin:'0 auto 3px' }}>{initiales(sal.prenom,sal.nom)}</div>
                          <div style={{ fontSize:10, color:'var(--text-2)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{sal.prenom}</div>
                          <div style={{ fontSize:11, fontWeight:500, fontFamily:'var(--font-mono)' }}>{fmtH(h)}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {evMois.map(ev => {
                    const mt = missionTypes[ev.type]||{};
                    return (
                      <tr key={ev.id} style={{ borderBottom:'1px solid var(--border)' }}>
                        <td style={{ padding:'10px 16px', position:'sticky', left:0, zIndex:1, background:'#fff', borderRight:'1px solid var(--border)', fontWeight:500 }}>{ev.nom}</td>
                        {salaries.map(sal => {
                          const insc = inscriptions.find(i=>i.evenementId===ev.id&&i.salarieId===sal.id&&i.statut!=='retire');
                          return (
                            <td key={sal.id} style={{ padding:'8px', textAlign:'center' }}>
                              {!insc ? <button onClick={()=>inscrire(ev.id,sal.id)} style={{ width:24, height:24, borderRadius:'50%', background:'#f8f6f2', border:'1px dashed #ccc', cursor:'pointer', fontSize:13, color:'#aaa' }}>+</button>
                                : insc.statut==='valide' ? <button onClick={()=>handleRetirer(insc.id)} style={{ width:26, height:26, borderRadius:'50%', background:'#EAF3DE', color:'#3B6D11', border:'none', cursor:'pointer', fontSize:13 }}>✓</button>
                                : <div style={{ display:'flex', gap:3, justifyContent:'center' }}>
                                    <button onClick={()=>valider(insc.id)} style={{ width:22, height:22, borderRadius:'50%', background:'#EAF3DE', color:'#3B6D11', border:'none', cursor:'pointer', fontSize:11 }}>✓</button>
                                    <button onClick={()=>refuser(insc.id)} style={{ width:22, height:22, borderRadius:'50%', background:'#FCEBEB', color:'#A32D2D', border:'none', cursor:'pointer', fontSize:11 }}>✕</button>
                                  </div>
                              }
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {historique && (
        <HistoriqueModal
          onClose={()=>setHistorique(null)}
          salarie={historique.salarie}
          evenement={historique.evenement}
          inscriptions={inscriptions.filter(i=>i.salarieId===historique.salarie.id&&i.evenementId===historique.evenement.id)}
        />
      )}
    </div>
  );
}

const styles = {
  toolbar: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 },
  navBtn: { width:30, height:30, borderRadius:8, border:'1px solid var(--border-med)', background:'#fff', cursor:'pointer', fontSize:16, color:'var(--text-2)', fontFamily:'var(--font)', display:'flex', alignItems:'center', justifyContent:'center' },
  th: { padding:'10px 8px', fontSize:11, fontWeight:500, color:'var(--text-2)', textAlign:'center', position:'sticky', top:0, zIndex:2, background:'#fafaf8' },
};