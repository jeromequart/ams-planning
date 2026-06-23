import { useState, useMemo, useEffect, useRef } from 'react';
import HistoriqueModal from './HistoriqueModal';

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS_SHORT = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

function getAge(dn) {
  if (!dn) return null;
  const t = new Date(), b = new Date(dn);
  let a = t.getFullYear() - b.getFullYear();
  if (t.getMonth() - b.getMonth() < 0 || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
  return a;
}
function getDiplomes(sal) {
  const d = [];
  if (sal.chefEquipe) d.push({ label:'Chef éq.', color:'#534AB7', bg:'#EEEDFE' });
  if (sal.pse2) d.push({ label:'PSE 2', color:'#185FA5', bg:'#E6F1FB' });
  else if (sal.pse1) d.push({ label:'PSE 1', color:'#185FA5', bg:'#E6F1FB' });
  if (sal.bnssa) d.push({ label:'BNSSA', color:'#0F6E56', bg:'#E1F5EE' });
  return d;
}
function dureeH(d,f) { const[dh,dm]=d.split(':').map(Number);const[fh,fm]=f.split(':').map(Number);return(fh*60+fm-(dh*60+dm))/60; }
function fmtH(h) { if(h<=0)return'0h';const hh=Math.floor(h);const mm=Math.round((h-hh)*60);return mm?`${hh}h${String(mm).padStart(2,'0')}`:`${hh}h`; }
function ini(p,n) { return((p?.[0]||'')+(n?.[0]||'')).toUpperCase(); }
function fmtDate(ds) { const d=new Date(ds+'T12:00:00'); const mois=['Jan','Fév','Mars','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc']; return`${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${mois[d.getMonth()]}`; }
function localDateStr(d) { return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

const AVATAR_COLORS=[
  {bg:'#FCEBEB',txt:'#A32D2D'},{bg:'#E6F1FB',txt:'#185FA5'},{bg:'#EAF3DE',txt:'#3B6D11'},
  {bg:'#FAEEDA',txt:'#854F0B'},{bg:'#EEEDFE',txt:'#534AB7'},{bg:'#E1F5EE',txt:'#0F6E56'},{bg:'#FBEAF0',txt:'#993556'},
];

function chargeColor(n) {
  if (n === 0) return { bg:'#f8f6f2', txt:'#aaa' };
  if (n <= 2) return { bg:'#EAF3DE', txt:'#3B6D11' };
  if (n <= 5) return { bg:'#FAEEDA', txt:'#854F0B' };
  return { bg:'#FCEBEB', txt:'#A32D2D' };
}

export default function ValidationMensuelle({ salaries, evenements, inscriptions, addInscription, updateInscription, removeInscription, retireInscription, reactiverInscription, missionTypes }) {
  const [current, setCurrent] = useState(() => { const d=new Date(); d.setDate(1); return d; });
  const listRef = useRef(null);
  const [selectedEvId, setSelectedEvId] = useState(null);
  const [saving, setSaving] = useState({});
  const [historique, setHistorique] = useState(null);
  const [searchEv, setSearchEv] = useState('');
  const [subTab, setSubTab] = useState('planning'); // 'planning' | 'attente' | 'salarie'
  const [searchSal, setSearchSal] = useState('');
  const [selectedSalId, setSelectedSalId] = useState(null);

  // Sélectionner automatiquement le prochain événement à venir
  useEffect(() => {
    if (evMois.length === 0) return;
    const now2 = localDateStr(new Date());
    const prochain = evMois.find(e => e.date >= now2) || evMois[evMois.length - 1];
    if (prochain && !selectedEvId) {
      setSelectedEvId(prochain.id);
      // Scroller jusqu'à cet événement dans la liste
      setTimeout(() => {
        const el = document.getElementById('ev-' + prochain.id);
        if (el) el.scrollIntoView({ behavior:'smooth', block:'nearest' });
      }, 150);
    }
  }, [evMois]);

  const year = current.getFullYear();
  const month = current.getMonth();
  const now = localDateStr(new Date());

  // Événements du mois triés par date
  const evMois = useMemo(() => evenements
    .filter(e => { const d=new Date(e.date+'T12:00:00'); return d.getFullYear()===year&&d.getMonth()===month; })
    .sort((a,b)=>a.date.localeCompare(b.date)), [evenements, year, month]);

  // Inscriptions actives (hors retirées)
  const inscActives = useMemo(() => inscriptions.filter(i=>i.statut!=='retire'), [inscriptions]);

  // Nb missions validées par salarié sur le mois
  const missionsPar = useMemo(() => {
    const map = {};
    salaries.forEach(s => { map[s.id] = 0; });
    evMois.forEach(ev => {
      inscActives.filter(i=>i.evenementId===ev.id&&i.statut==='valide').forEach(i => {
        if (map[i.salarieId] !== undefined) map[i.salarieId]++;
      });
    });
    return map;
  }, [inscActives, evMois, salaries]);

  // Stats globales
  const totalAttente = useMemo(() => inscriptions.filter(i => {
    const ev=evenements.find(e=>e.id===i.evenementId);
    if(!ev) return false;
    const d=new Date(ev.date+'T12:00:00');
    return d.getFullYear()===year&&d.getMonth()===month&&i.statut==='en_attente';
  }).length, [inscriptions, evenements, year, month]);

  const totalValides = useMemo(() => inscActives.filter(i => {
    const ev=evenements.find(e=>e.id===i.evenementId);
    if(!ev) return false;
    const d=new Date(ev.date+'T12:00:00');
    return d.getFullYear()===year&&d.getMonth()===month&&i.statut==='valide';
  }).length, [inscActives, evenements, year, month]);

  const selectedEv = evenements.find(e=>e.id===selectedEvId);
  const selectedSal = salaries.find(s=>s.id===selectedSalId);

  // Données de l'événement sélectionné
  const evInscrits = useMemo(() => selectedEvId
    ? inscActives.filter(i=>i.evenementId===selectedEvId&&i.statut==='valide')
      .map(i=>({...i, sal:salaries.find(s=>s.id===i.salarieId)}))
      .filter(i=>i.sal)
      .sort((a,b)=>(missionsPar[b.sal.id]||0)-(missionsPar[a.sal.id]||0))
    : [], [selectedEvId, inscActives, salaries, missionsPar]);

  const evAttentes = useMemo(() => selectedEvId
    ? inscriptions.filter(i=>i.evenementId===selectedEvId&&i.statut==='en_attente')
      .map(i=>({...i, sal:salaries.find(s=>s.id===i.salarieId)}))
      .filter(i=>i.sal)
      .sort((a,b)=>(missionsPar[a.sal.id]||0)-(missionsPar[b.sal.id]||0))
    : [], [selectedEvId, inscriptions, salaries, missionsPar]);

  // Salariés non inscrits, triés par nb missions croissant (les moins chargés en premier)
  const salDispo = useMemo(() => selectedEvId
    ? [...salaries]
        .filter(s => !inscriptions.find(i=>i.evenementId===selectedEvId&&i.salarieId===s.id&&i.statut!=='retire'))
        .sort((a,b) => (missionsPar[a.id]||0)-(missionsPar[b.id]||0))
    : [], [selectedEvId, salaries, inscriptions, missionsPar]);

  async function valider(inscId) {
    setSaving(p=>({...p,[inscId]:true}));
    await updateInscription(inscId,'valide');
    setSaving(p=>({...p,[inscId]:false}));
  }
  async function refuser(inscId) {
    setSaving(p=>({...p,[inscId]:true}));
    await retireInscription(inscId,'admin');
    setSaving(p=>({...p,[inscId]:false}));
  }
  async function retirer(inscId) {
    setSaving(p=>({...p,[inscId]:true}));
    await retireInscription(inscId,'admin');
    setSaving(p=>({...p,[inscId]:false}));
  }
  async function validerTousEv() {
    if(!selectedEvId) return;
    for(const i of evAttentes) await updateInscription(i.id,'valide');
  }
  async function inscrire(salarieId) {
    if(!selectedEvId) return;
    const retire=inscriptions.find(i=>i.evenementId===selectedEvId&&i.salarieId===salarieId&&i.statut==='retire');
    if(retire){ await reactiverInscription(retire.id,'valide','admin'); return; }
    await addInscription({evenementId:selectedEvId, salarieId, statut:'valide', source:'admin'});
  }
  async function validerToutMois() {
    if(!confirm(`Valider TOUTES les demandes en attente de ${MONTHS[month]} ?`)) return;
    const attentes = inscriptions.filter(i=>{
      const ev=evenements.find(e=>e.id===i.evenementId);
      if(!ev) return false;
      const d=new Date(ev.date+'T12:00:00');
      return d.getFullYear()===year&&d.getMonth()===month&&i.statut==='en_attente';
    });
    for(const i of attentes) await updateInscription(i.id,'valide');
  }

  const s = styles;
  const evFiltres = evMois.filter(ev=>(ev.nom||'').toLowerCase().includes(searchEv.toLowerCase())||(ev.ref||'').toLowerCase().includes(searchEv.toLowerCase()));

  // Onglet par salarié
  const salFiltres = [...salaries]
    .filter(s=>`${s.prenom} ${s.nom}`.toLowerCase().includes(searchSal.toLowerCase()))
    .sort((a,b)=>a.nom.localeCompare(b.nom)||a.prenom.localeCompare(b.prenom));

  const salMois = selectedSal ? evMois.filter(ev=>inscActives.find(i=>i.evenementId===ev.id&&i.salarieId===selectedSal.id&&i.statut==='valide')) : [];
  const salAttentesMois = selectedSal ? evMois.filter(ev=>inscriptions.find(i=>i.evenementId===ev.id&&i.salarieId===selectedSal.id&&i.statut==='en_attente')) : [];
  const salHeures = salMois.reduce((acc,ev)=>acc+dureeH(ev.debut,ev.fin),0);

  const subTabs = [
    { key:'planning', label:'📅 Gestion planning', badge: 0 },
    { key:'attente',  label:'⏳ Toutes les attentes', badge: totalAttente },
    { key:'salarie',  label:'👤 Par salarié', badge: 0 },
  ];

  return (
    <div>
      {/* Toolbar mois */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button style={s.navBtn} onClick={()=>{ setCurrent(new Date(year,month-1,1)); setSelectedEvId(null); }}>‹</button>
          <button style={s.navBtn} onClick={()=>{ setCurrent(new Date(year,month+1,1)); setSelectedEvId(null); }}>›</button>
          <span style={{ fontSize:16, fontWeight:600 }}>{MONTHS[month]} {year}</span>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {totalAttente > 0 && (
            <span style={{ background:'#FAEEDA', color:'#854F0B', fontSize:12, fontWeight:600, padding:'5px 12px', borderRadius:20 }}>
              ⏳ {totalAttente} en attente
            </span>
          )}
          {totalAttente > 0 && (
            <button onClick={validerToutMois} style={{ background:'#EAF3DE', color:'#3B6D11', border:'1px solid #C0DD97', fontSize:12, fontWeight:500, padding:'6px 14px', borderRadius:8, cursor:'pointer', fontFamily:'var(--font)' }}>
              ✓ Tout valider
            </button>
          )}
        </div>
      </div>

      {/* Stats rapides */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
        {[
          { label:'Événements ce mois', value:evMois.length, color:'var(--text)' },
          { label:'Inscriptions validées', value:totalValides, color:'#3B6D11' },
          { label:'Demandes en attente', value:totalAttente, color:totalAttente>0?'#854F0B':'var(--text)' },
        ].map(({label,value,color})=>(
          <div key={label} style={{ background:'#f8f6f2', borderRadius:10, padding:'10px 14px' }}>
            <div style={{ fontSize:11, color:'var(--text-2)', marginBottom:3 }}>{label}</div>
            <div style={{ fontSize:22, fontWeight:700, fontFamily:'var(--font-mono)', color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Sous-onglets */}
      <div style={{ display:'flex', gap:4, background:'#f8f6f2', borderRadius:10, padding:4, marginBottom:14, width:'fit-content' }}>
        {subTabs.map(({key,label,badge})=>(
          <button key={key} onClick={()=>setSubTab(key)} style={{
            padding:'7px 14px', borderRadius:7, border:'none', fontSize:12, display:'flex', alignItems:'center', gap:6,
            fontWeight:subTab===key?600:400, cursor:'pointer',
            background:subTab===key?'#fff':'transparent',
            color:subTab===key?'var(--text)':'var(--text-2)',
            boxShadow:subTab===key?'0 1px 3px rgba(0,0,0,0.08)':'none',
            fontFamily:'var(--font)',
          }}>
            {label}
            {badge>0&&<span style={{ background:'#a32d2d', color:'#fff', borderRadius:10, fontSize:10, padding:'1px 6px', fontWeight:700 }}>{badge}</span>}
          </button>
        ))}
      </div>

      {/* ═══════ ONGLET GESTION PLANNING ═══════ */}
      {subTab==='planning' && (
        <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:16, alignItems:'start' }}>

          {/* ─── COLONNE GAUCHE : liste événements ─── */}
          <div>
            <input
              style={{ width:'100%', padding:'8px 12px', border:'1px solid var(--border-med)', borderRadius:8, fontSize:13, marginBottom:8, fontFamily:'var(--font)', boxSizing:'border-box' }}
              placeholder="Rechercher…"
              value={searchEv}
              onChange={e=>setSearchEv(e.target.value)}
            />
            <div style={{ display:'flex', flexDirection:'column', gap:5, maxHeight:680, overflowY:'auto' }}>
              {evFiltres.map(ev=>{
                const mt=missionTypes[ev.type]||Object.values(missionTypes)[0]||{label:ev.type,icon:'📌',color:'#5f5e5a'};
                const valides=inscActives.filter(i=>i.evenementId===ev.id&&i.statut==='valide').length;
                const attentes=inscriptions.filter(i=>i.evenementId===ev.id&&i.statut==='en_attente').length;
                const isSel=selectedEvId===ev.id;
                const isPast=ev.date<now;
                return (
                  <div key={ev.id} id={'ev-'+ev.id} onClick={()=>setSelectedEvId(ev.id)}
                    style={{ background:isSel?'#fff5f5':'#fff', borderRadius:10,
                      border:`1.5px solid ${isSel?'#a32d2d':'var(--border)'}`,
                      padding:'10px 12px', cursor:'pointer', opacity:isPast?0.65:1,
                      transition:'all 0.1s' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                      <span style={{ fontSize:12 }}>{mt.icon}</span>
                      <span style={{ fontSize:13, fontWeight:600, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.nom}</span>
                    </div>
                    {ev.ref&&<div style={{ fontSize:10, color:'var(--text-3)', fontFamily:'var(--font-mono)', marginBottom:3 }}>{ev.ref}</div>}
                    <div style={{ fontSize:11, color:'var(--text-2)', marginBottom:5 }}>{fmtDate(ev.date)} · {ev.debut}–{ev.fin}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontSize:11, fontWeight:600, color:valides>=ev.effectif?'#3B6D11':'#854F0B' }}>
                        👥 {valides}/{ev.effectif}
                      </span>
                      {attentes>0&&<span style={{ background:'#FAEEDA', color:'#854F0B', fontSize:10, padding:'1px 7px', borderRadius:10, fontWeight:600 }}>⏳ {attentes}</span>}
                      {valides>=ev.effectif&&<span style={{ background:'#EAF3DE', color:'#3B6D11', fontSize:10, padding:'1px 7px', borderRadius:10 }}>✓ Complet</span>}
                    </div>
                  </div>
                );
              })}
              {evFiltres.length===0&&<div style={{ textAlign:'center', padding:24, color:'var(--text-3)', fontSize:13 }}>Aucun événement</div>}
            </div>
          </div>

          {/* ─── COLONNE DROITE : fiche événement ─── */}
          {!selectedEv ? (
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid var(--border)', padding:'60px 20px', textAlign:'center', color:'var(--text-3)' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>👈</div>
              <div style={{ fontSize:14 }}>Sélectionnez un événement pour gérer son équipe</div>
            </div>
          ) : (()=>{
            const mt=missionTypes[selectedEv.type]||Object.values(missionTypes)[0]||{label:selectedEv.type,icon:'📌',bg:'#f1efe8',color:'#5f5e5a'};
            return (
              <div style={{ background:'#fff', borderRadius:14, border:'1px solid var(--border)', overflow:'hidden' }}>
                {/* Header événement */}
                <div style={{ background:mt.color, padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ fontSize:16, fontWeight:700, color:'#fff' }}>{selectedEv.nom}</div>
                    <div style={{ fontSize:12, color:'rgba(255,255,255,0.8)', marginTop:2 }}>
                      {fmtDate(selectedEv.date)} · {selectedEv.debut}–{selectedEv.fin}
                      {selectedEv.lieu&&` · 📍 ${selectedEv.lieu}`}
                      {selectedEv.ref&&<span style={{ fontFamily:'var(--font-mono)', marginLeft:8, opacity:0.7 }}>[{selectedEv.ref}]</span>}
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ background:'rgba(255,255,255,0.2)', color:'#fff', fontSize:13, fontWeight:700, padding:'4px 12px', borderRadius:20 }}>
                      {evInscrits.length}/{selectedEv.effectif} 👥
                    </span>
                  </div>
                </div>

                <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:20 }}>

                  {/* ── DEMANDES EN ATTENTE ── */}
                  {evAttentes.length>0&&(
                    <div>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:'#854F0B', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                          ⏳ Demandes en attente ({evAttentes.length})
                        </div>
                        <button onClick={validerTousEv} style={{ background:'#EAF3DE', color:'#3B6D11', border:'none', borderRadius:7, padding:'5px 12px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>
                          ✓ Tout valider
                        </button>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                        {evAttentes.map(insc=>{
                          const sal=insc.sal;
                          const c=AVATAR_COLORS[sal.colorIdx%AVATAR_COLORS.length];
                          const nb=missionsPar[sal.id]||0;
                          const ch=chargeColor(nb);
                          const age=getAge(sal.dateNaissance);
                          const diplomes=getDiplomes(sal);
                          return (
                            <div key={insc.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'#fffdf7', borderRadius:10, border:'1px solid #f0d5a0' }}>
                              <div style={{ width:34, height:34, borderRadius:'50%', background:c.bg, color:c.txt, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:600, flexShrink:0, position:'relative' }}>
                                {ini(sal.prenom,sal.nom)}
                                {age!==null&&age<18&&<span style={{ position:'absolute', top:-3, right:-3, background:'#A32D2D', color:'#fff', fontSize:7, borderRadius:8, padding:'0 3px' }}>-18</span>}
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:13, fontWeight:600 }}>{sal.prenom} {sal.nom}</div>
                                <div style={{ display:'flex', gap:3, flexWrap:'wrap', marginTop:2 }}>
                                  {diplomes.map(d=><span key={d.label} style={{ fontSize:9, background:d.bg, color:d.color, padding:'1px 5px', borderRadius:8 }}>{d.label}</span>)}
                                </div>
                              </div>
                              {/* Badge charge */}
                              <div style={{ background:ch.bg, color:ch.txt, borderRadius:8, padding:'4px 10px', textAlign:'center', flexShrink:0 }}>
                                <div style={{ fontSize:14, fontWeight:700, fontFamily:'var(--font-mono)' }}>{nb}</div>
                                <div style={{ fontSize:9, fontWeight:500 }}>mission{nb>1?'s':''}</div>
                              </div>
                              {/* Actions */}
                              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                                <button onClick={()=>valider(insc.id)} disabled={saving[insc.id]}
                                  style={{ width:34, height:34, borderRadius:8, background:'#EAF3DE', color:'#3B6D11', border:'none', cursor:'pointer', fontSize:16, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>✓</button>
                                <button onClick={()=>refuser(insc.id)} disabled={saving[insc.id]}
                                  style={{ width:34, height:34, borderRadius:8, background:'#FCEBEB', color:'#A32D2D', border:'none', cursor:'pointer', fontSize:16, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                                <button onClick={()=>setHistorique({salarie:sal, evenement:selectedEv})}
                                  style={{ width:34, height:34, borderRadius:8, background:'#f8f6f2', color:'var(--text-3)', border:'1px solid var(--border)', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }} title="Historique">🕐</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── ÉQUIPE VALIDÉE ── */}
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:'#3B6D11', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>
                      ✅ Équipe validée ({evInscrits.length}/{selectedEv.effectif})
                    </div>
                    {evInscrits.length===0?(
                      <div style={{ fontSize:13, color:'var(--text-3)', fontStyle:'italic', padding:'10px 0' }}>Aucun salarié validé pour cet événement.</div>
                    ):(
                      <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                        {evInscrits.map(insc=>{
                          const sal=insc.sal;
                          const c=AVATAR_COLORS[sal.colorIdx%AVATAR_COLORS.length];
                          const nb=missionsPar[sal.id]||0;
                          const ch=chargeColor(nb);
                          const diplomes=getDiplomes(sal);
                          const age=getAge(sal.dateNaissance);
                          return (
                            <div key={insc.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:'#f8fbf5', borderRadius:10, border:'1px solid #c8e6c9' }}>
                              <div style={{ width:32, height:32, borderRadius:'50%', background:c.bg, color:c.txt, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, flexShrink:0, position:'relative' }}>
                                {ini(sal.prenom,sal.nom)}
                                {age!==null&&age<18&&<span style={{ position:'absolute', top:-3, right:-3, background:'#A32D2D', color:'#fff', fontSize:7, borderRadius:8, padding:'0 3px' }}>-18</span>}
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontSize:13, fontWeight:500 }}>{sal.prenom} {sal.nom}</div>
                                <div style={{ display:'flex', gap:3, flexWrap:'wrap', marginTop:2 }}>
                                  {diplomes.map(d=><span key={d.label} style={{ fontSize:9, background:d.bg, color:d.color, padding:'1px 5px', borderRadius:8 }}>{d.label}</span>)}
                                </div>
                              </div>
                              <div style={{ background:ch.bg, color:ch.txt, borderRadius:8, padding:'3px 8px', textAlign:'center', flexShrink:0 }}>
                                <div style={{ fontSize:13, fontWeight:700, fontFamily:'var(--font-mono)' }}>{nb}</div>
                                <div style={{ fontSize:9 }}>mission{nb>1?'s':''}</div>
                              </div>
                              <button onClick={()=>retirer(insc.id)} disabled={saving[insc.id]}
                                title="Retirer de la mission"
                                style={{ width:28, height:28, borderRadius:6, background:'none', color:'var(--text-3)', border:'1px solid var(--border)', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                              <button onClick={()=>setHistorique({salarie:sal, evenement:selectedEv})}
                                style={{ width:28, height:28, borderRadius:6, background:'none', color:'var(--text-3)', border:'1px solid var(--border)', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center' }}>🕐</button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* ── AJOUTER UN SALARIÉ ── */}
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>
                      ➕ Ajouter un salarié — triés par disponibilité
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:6, maxHeight:240, overflowY:'auto' }}>
                      {salDispo.map(sal=>{
                        const c=AVATAR_COLORS[sal.colorIdx%AVATAR_COLORS.length];
                        const nb=missionsPar[sal.id]||0;
                        const ch=chargeColor(nb);
                        const diplomes=getDiplomes(sal);
                        return (
                          <button key={sal.id} onClick={()=>inscrire(sal.id)}
                            style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', background:'#fff', border:'1px solid var(--border)', borderRadius:8, cursor:'pointer', fontFamily:'var(--font)', textAlign:'left', transition:'all 0.1s' }}
                            onMouseEnter={e=>e.currentTarget.style.borderColor='#a32d2d'}
                            onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
                            <div style={{ width:28, height:28, borderRadius:'50%', background:c.bg, color:c.txt, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600, flexShrink:0 }}>{ini(sal.prenom,sal.nom)}</div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:12, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sal.prenom} {sal.nom}</div>
                              <div style={{ display:'flex', gap:2, marginTop:1 }}>
                                {diplomes.slice(0,2).map(d=><span key={d.label} style={{ fontSize:8, background:d.bg, color:d.color, padding:'0 4px', borderRadius:6 }}>{d.label}</span>)}
                              </div>
                            </div>
                            <div style={{ background:ch.bg, color:ch.txt, borderRadius:6, padding:'2px 6px', fontSize:11, fontWeight:700, flexShrink:0 }}>{nb}</div>
                          </button>
                        );
                      })}
                      {salDispo.length===0&&<div style={{ fontSize:12, color:'var(--text-3)', fontStyle:'italic', gridColumn:'1/-1' }}>Tous les salariés sont déjà inscrits.</div>}
                    </div>
                  </div>

                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ═══════ ONGLET TOUTES LES ATTENTES ═══════ */}
      {subTab==='attente' && (()=>{
        const toutesAttentes = inscriptions
          .filter(i=>{
            const ev=evenements.find(e=>e.id===i.evenementId);
            if(!ev) return false;
            const d=new Date(ev.date+'T12:00:00');
            return d.getFullYear()===year&&d.getMonth()===month&&i.statut==='en_attente';
          })
          .map(i=>({...i, ev:evenements.find(e=>e.id===i.evenementId), sal:salaries.find(s=>s.id===i.salarieId)}))
          .filter(i=>i.ev&&i.sal)
          .sort((a,b)=>a.ev.date.localeCompare(b.ev.date)||(missionsPar[a.sal.id]||0)-(missionsPar[b.sal.id]||0));
        return (
          <div style={{ background:'#fff', borderRadius:14, border:'1px solid var(--border)', overflow:'hidden' }}>
            {toutesAttentes.length===0?(
              <div style={{ textAlign:'center', padding:'48px', color:'var(--text-3)' }}>
                <div style={{ fontSize:36, marginBottom:12 }}>✅</div>
                <div>Aucune demande en attente ce mois-ci.</div>
              </div>
            ):(
              toutesAttentes.map((insc,idx)=>{
                const {ev,sal}=insc;
                const mt=missionTypes[ev.type]||{icon:'📌',label:ev.type,bg:'#f1efe8',color:'#5f5e5a'};
                const c=AVATAR_COLORS[sal.colorIdx%AVATAR_COLORS.length];
                const nb=missionsPar[sal.id]||0;
                const ch=chargeColor(nb);
                const age=getAge(sal.dateNaissance);
                const diplomes=getDiplomes(sal);
                return (
                  <div key={insc.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 18px', borderBottom:idx<toutesAttentes.length-1?'1px solid var(--border)':'none' }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:c.bg, color:c.txt, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:600, flexShrink:0, position:'relative' }}>
                      {ini(sal.prenom,sal.nom)}
                      {age!==null&&age<18&&<span style={{ position:'absolute', top:-3, right:-3, background:'#A32D2D', color:'#fff', fontSize:7, borderRadius:8, padding:'0 3px' }}>-18</span>}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600 }}>{sal.prenom} {sal.nom}
                        <span style={{ marginLeft:8 }}>{diplomes.map(d=><span key={d.label} style={{ fontSize:9, background:d.bg, color:d.color, padding:'1px 5px', borderRadius:8, marginRight:2 }}>{d.label}</span>)}</span>
                      </div>
                      <div style={{ fontSize:12, color:'var(--text-2)', marginTop:2 }}>
                        <span style={{ background:mt.bg, color:mt.color, fontSize:10, padding:'1px 6px', borderRadius:10, marginRight:6 }}>{mt.icon} {mt.label}</span>
                        {ev.nom} · {fmtDate(ev.date)} · {ev.debut}–{ev.fin}
                      </div>
                    </div>
                    <div style={{ background:ch.bg, color:ch.txt, borderRadius:8, padding:'4px 10px', textAlign:'center', flexShrink:0 }}>
                      <div style={{ fontSize:14, fontWeight:700, fontFamily:'var(--font-mono)' }}>{nb}</div>
                      <div style={{ fontSize:9 }}>mission{nb>1?'s':''}</div>
                    </div>
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      <button onClick={()=>valider(insc.id)} disabled={saving[insc.id]}
                        style={{ width:34, height:34, borderRadius:8, background:'#EAF3DE', color:'#3B6D11', border:'none', cursor:'pointer', fontSize:16, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>✓</button>
                      <button onClick={()=>refuser(insc.id)} disabled={saving[insc.id]}
                        style={{ width:34, height:34, borderRadius:8, background:'#FCEBEB', color:'#A32D2D', border:'none', cursor:'pointer', fontSize:16, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );
      })()}

      {/* ═══════ ONGLET PAR SALARIÉ ═══════ */}
      {subTab==='salarie' && (
        <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:16 }}>
          <div>
            <input
              style={{ width:'100%', padding:'8px 12px', border:'1px solid var(--border-med)', borderRadius:8, fontSize:13, marginBottom:8, fontFamily:'var(--font)', boxSizing:'border-box' }}
              placeholder="Rechercher un salarié…"
              value={searchSal}
              onChange={e=>setSearchSal(e.target.value)}
            />
            <div style={{ display:'flex', flexDirection:'column', gap:5, maxHeight:640, overflowY:'auto' }}>
              {salFiltres.map(sal=>{
                const c=AVATAR_COLORS[sal.colorIdx%AVATAR_COLORS.length];
                const nb=missionsPar[sal.id]||0;
                const ch=chargeColor(nb);
                const isSel=selectedSalId===sal.id;
                return (
                  <div key={sal.id} onClick={()=>setSelectedSalId(sal.id)}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:isSel?'#fff5f5':'#fff', borderRadius:10, border:`1.5px solid ${isSel?'#a32d2d':'var(--border)'}`, cursor:'pointer' }}>
                    <div style={{ width:30, height:30, borderRadius:'50%', background:c.bg, color:c.txt, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:600, flexShrink:0 }}>{ini(sal.prenom,sal.nom)}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sal.prenom} {sal.nom}</div>
                    </div>
                    <div style={{ background:ch.bg, color:ch.txt, borderRadius:7, padding:'2px 8px', fontSize:12, fontWeight:700, flexShrink:0 }}>{nb}</div>
                  </div>
                );
              })}
            </div>
          </div>
          {selectedSal ? (()=>{
            const c=AVATAR_COLORS[selectedSal.colorIdx%AVATAR_COLORS.length];
            const nb=missionsPar[selectedSal.id]||0;
            const diplomes=getDiplomes(selectedSal);
            return (
              <div style={{ background:'#fff', borderRadius:14, border:'1px solid var(--border)', padding:18 }}>
                <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:18, paddingBottom:14, borderBottom:'1px solid var(--border)' }}>
                  <div style={{ width:48, height:48, borderRadius:'50%', background:c.bg, color:c.txt, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700 }}>{ini(selectedSal.prenom,selectedSal.nom)}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:17, fontWeight:700 }}>{selectedSal.prenom} {selectedSal.nom}</div>
                    <div style={{ display:'flex', gap:4, marginTop:4 }}>{diplomes.map(d=><span key={d.label} style={{ fontSize:11, background:d.bg, color:d.color, padding:'2px 8px', borderRadius:20 }}>{d.label}</span>)}</div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:10, color:'var(--text-3)', marginBottom:2 }}>Missions ce mois</div>
                    <div style={{ fontSize:24, fontWeight:700, fontFamily:'var(--font-mono)', color:nb>5?'#A32D2D':nb>2?'#854F0B':'#3B6D11' }}>{nb}</div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:10, color:'var(--text-3)', marginBottom:2 }}>Heures</div>
                    <div style={{ fontSize:24, fontWeight:700, fontFamily:'var(--font-mono)', color:'var(--text)' }}>{fmtH(salHeures)}</div>
                  </div>
                </div>
                {salAttentesMois.length>0&&(
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'#854F0B', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>⏳ Demandes en attente</div>
                    {salAttentesMois.map(ev=>{
                      const insc=inscriptions.find(i=>i.evenementId===ev.id&&i.salarieId===selectedSal.id&&i.statut==='en_attente');
                      const mt=missionTypes[ev.type]||{icon:'📌',label:ev.type,bg:'#f1efe8',color:'#5f5e5a'};
                      return (
                        <div key={ev.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                          <span style={{ background:mt.bg, color:mt.color, fontSize:10, padding:'2px 7px', borderRadius:10 }}>{mt.icon} {mt.label}</span>
                          <span style={{ fontSize:13, flex:1 }}>{ev.nom} — {fmtDate(ev.date)}</span>
                          <button onClick={()=>valider(insc.id)} style={{ background:'#EAF3DE', color:'#3B6D11', border:'none', borderRadius:7, padding:'5px 12px', fontSize:12, cursor:'pointer', fontWeight:600 }}>✓</button>
                          <button onClick={()=>refuser(insc.id)} style={{ background:'#FCEBEB', color:'#A32D2D', border:'none', borderRadius:7, padding:'5px 12px', fontSize:12, cursor:'pointer', fontWeight:600 }}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ fontSize:11, fontWeight:700, color:'#3B6D11', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>✅ Planning du mois</div>
                {salMois.length===0?<div style={{ fontSize:13, color:'var(--text-3)', fontStyle:'italic' }}>Aucune mission validée ce mois.</div>:(
                  salMois.map(ev=>{
                    const mt=missionTypes[ev.type]||{icon:'📌',label:ev.type,bg:'#f1efe8',color:'#5f5e5a'};
                    return (
                      <div key={ev.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                        <span style={{ background:mt.bg, color:mt.color, fontSize:10, padding:'2px 7px', borderRadius:10 }}>{mt.icon} {mt.label}</span>
                        <span style={{ fontSize:13, flex:1 }}>{ev.nom} — {fmtDate(ev.date)} · {ev.debut}–{ev.fin}</span>
                        <span style={{ fontSize:12, fontFamily:'var(--font-mono)', color:'var(--text-2)' }}>{fmtH(dureeH(ev.debut,ev.fin))}</span>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })():(
            <div style={{ background:'#fff', borderRadius:14, border:'1px solid var(--border)', padding:'60px 20px', textAlign:'center', color:'var(--text-3)' }}>
              <div style={{ fontSize:36, marginBottom:12 }}>👈</div>
              <div>Sélectionnez un salarié</div>
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
  navBtn: { width:30, height:30, borderRadius:8, border:'1px solid var(--border-med)', background:'#fff', cursor:'pointer', fontSize:16, color:'var(--text-2)', fontFamily:'var(--font)', display:'flex', alignItems:'center', justifyContent:'center' },
};
