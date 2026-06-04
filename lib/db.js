import { useState } from 'react';
import HistoriqueModal from './HistoriqueModal';

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

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

const AVATAR_COLORS=[
  {bg:'#FCEBEB',txt:'#A32D2D'},{bg:'#E6F1FB',txt:'#185FA5'},{bg:'#EAF3DE',txt:'#3B6D11'},
  {bg:'#FAEEDA',txt:'#854F0B'},{bg:'#EEEDFE',txt:'#534AB7'},{bg:'#E1F5EE',txt:'#0F6E56'},{bg:'#FBEAF0',txt:'#993556'},
];

export default function ValidationMensuelle({ salaries, evenements, inscriptions, addInscription, updateInscription, removeInscription, retireInscription, reactiverInscription, missionTypes }) {
  const [current, setCurrent] = useState(() => { const d=new Date(); d.setDate(1); return d; });
  const [saving, setSaving] = useState({});
  const [historique, setHistorique] = useState(null); // { salarie, evenement }
  const [showRetires, setShowRetires] = useState(false);

  const year = current.getFullYear();
  const month = current.getMonth();

  const evMois = evenements
    .filter(e => { const d=new Date(e.date); return d.getFullYear()===year && d.getMonth()===month; })
    .sort((a,b) => a.date.localeCompare(b.date));

  // Inscriptions actives (hors retirées) pour les stats
  const inscActives = inscriptions.filter(i => i.statut !== 'retire');

  const totalValides = inscActives.filter(i => {
    const ev = evenements.find(e=>e.id===i.evenementId);
    if (!ev) return false;
    const d=new Date(ev.date);
    return d.getFullYear()===year && d.getMonth()===month && i.statut==='valide';
  }).length;

  const totalAttente = inscActives.filter(i => {
    const ev = evenements.find(e=>e.id===i.evenementId);
    if (!ev) return false;
    const d=new Date(ev.date);
    return d.getFullYear()===year && d.getMonth()===month && i.statut==='en_attente';
  }).length;

  const totalRetires = inscriptions.filter(i => {
    const ev = evenements.find(e=>e.id===i.evenementId);
    if (!ev) return false;
    const d=new Date(ev.date);
    return d.getFullYear()===year && d.getMonth()===month && i.statut==='retire';
  }).length;

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

  async function handleReactiver(inscId) {
    setSaving(p=>({...p,[inscId]:true}));
    await reactiverInscription(inscId, 'valide', 'admin');
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
    // Si inscription retirée existe, la réactiver
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
    const attentes = inscriptions.filter(i => {
      const ev = evenements.find(e=>e.id===i.evenementId);
      if (!ev) return false;
      const d=new Date(ev.date);
      return d.getFullYear()===year && d.getMonth()===month && i.statut==='en_attente';
    });
    for (const i of attentes) await updateInscription(i.id, 'valide');
  }

  const s = styles;

  return (
    <div>
      {/* Toolbar */}
      <div style={s.toolbar}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button style={s.navBtn} onClick={()=>setCurrent(new Date(year,month-1,1))}>‹</button>
          <button style={s.navBtn} onClick={()=>setCurrent(new Date(year,month+1,1))}>›</button>
          <span style={{ fontSize:16, fontWeight:500, color:'var(--text)' }}>{MONTHS[month]} {year}</span>
          {totalAttente > 0 && (
            <span style={{ background:'#FAEEDA', color:'#854F0B', fontSize:11, fontWeight:500, padding:'3px 10px', borderRadius:20, border:'0.5px solid #FAC775' }}>
              ⏳ {totalAttente} en attente
            </span>
          )}
          {totalRetires > 0 && (
            <button onClick={()=>setShowRetires(p=>!p)}
              style={{ background:showRetires?'#f1efe8':'transparent', color:'var(--text-3)', border:'0.5px solid var(--border-med)', fontSize:11, padding:'3px 10px', borderRadius:20, cursor:'pointer', fontFamily:'var(--font)' }}>
              ↩ {totalRetires} retrait{totalRetires>1?'s':''}
            </button>
          )}
        </div>
        {totalAttente > 0 && (
          <button onClick={validerToutMois} style={{ background:'#EAF3DE', color:'#3B6D11', border:'0.5px solid #C0DD97', fontSize:12, fontWeight:500, padding:'7px 14px', borderRadius:8, cursor:'pointer', fontFamily:'var(--font)' }}>
            ✓ Tout valider le mois
          </button>
        )}
      </div>

      {/* Stats */}
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

      {evMois.length === 0 ? (
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid var(--border)', padding:'48px', textAlign:'center', color:'var(--text-3)' }}>
          <div style={{ fontSize:36, marginBottom:12 }}>📅</div>
          <div>Aucun événement ce mois.</div>
        </div>
      ) : (
        <div style={{ background:'#fff', borderRadius:14, border:'1px solid var(--border)', overflow:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, minWidth:500+salaries.length*90 }}>
            <thead>
              <tr style={{ background:'#fafaf8', borderBottom:'1px solid var(--border)' }}>
                <th style={{ ...s.th, textAlign:'left', paddingLeft:16, width:220, minWidth:220 }}>Événement</th>
                {salaries.map(sal => {
                  const h = heuresSalarie(sal.id);
                  const c = AVATAR_COLORS[sal.colorIdx%AVATAR_COLORS.length];
                  const warn=h>35; const danger=h>48;
                  const age = getAge(sal.dateNaissance);
                  const badges = getDiplomeBadge(sal);
                  return (
                    <th key={sal.id} style={{ ...s.th, width:100, minWidth:100 }}>
                      <div style={{ position:'relative', width:26, height:26, margin:'0 auto 3px' }}>
                        <div style={{ width:26, height:26, borderRadius:'50%', background:c.bg, color:c.txt, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:500 }}>
                          {initiales(sal.prenom,sal.nom)}
                        </div>
                        {age !== null && age < 18 && <div style={{ position:'absolute', top:-3, right:-3, background:'#A32D2D', color:'#fff', fontSize:8, borderRadius:10, padding:'0 3px', lineHeight:'14px', border:'1px solid #fff' }}>-18</div>}
                      </div>
                      <div style={{ fontSize:10, color:'var(--text-2)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{sal.prenom}</div>
                      <div style={{ fontSize:11, fontWeight:500, fontFamily:'var(--font-mono)', color:danger?'#A32D2D':warn?'#854F0B':'#3B6D11' }}>{fmtH(h)}</div>
                      <div style={{ display:'flex', gap:2, flexWrap:'wrap', justifyContent:'center', marginTop:2 }}>
                        {badges.map(b=><span key={b.label} style={{ fontSize:8, background:b.bg, color:b.color, padding:'1px 4px', borderRadius:8, fontWeight:500 }}>{b.label}</span>)}
                      </div>
                    </th>
                  );
                })}
                <th style={{ ...s.th, width:80, minWidth:80 }}>Effectif</th>
              </tr>
            </thead>
            <tbody>
              {evMois.map(ev => {
                const mt = missionTypes[ev.type]||Object.values(missionTypes)[0]||{label:ev.type,icon:'📌',bg:'#f1efe8',color:'#5f5e5a'};
                const inscritsValides = inscriptions.filter(i=>i.evenementId===ev.id&&i.statut==='valide');
                const attentes = inscriptions.filter(i=>i.evenementId===ev.id&&i.statut==='en_attente');
                const complet = inscritsValides.length >= ev.effectif;

                return (
                  <tr key={ev.id} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'10px 16px', verticalAlign:'top' }}>
                      <div style={{ fontWeight:500, color:'var(--text)', marginBottom:2 }}>
                        {ev.nom||'(sans nom)'}
                        {ev.ref&&<span style={{ fontSize:10, color:'var(--text-3)', fontFamily:'var(--font-mono)', marginLeft:6 }}>{ev.ref}</span>}
                      </div>
                      <div style={{ fontSize:11, color:'var(--text-2)', marginBottom:4 }}>
                        {new Date(ev.date).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})} · {ev.debut}–{ev.fin}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                        <span style={{ background:mt.bg, color:mt.color, fontSize:10, padding:'2px 7px', borderRadius:20, fontWeight:500 }}>{mt.icon} {mt.label}</span>
                        {attentes.length>0&&(
                          <button onClick={()=>validerTousEvenement(ev.id)}
                            style={{ fontSize:10, background:'#EAF3DE', color:'#3B6D11', border:'0.5px solid #C0DD97', borderRadius:6, padding:'2px 7px', cursor:'pointer', fontFamily:'var(--font)' }}>
                            ✓ Valider tous
                          </button>
                        )}
                      </div>
                    </td>

                    {salaries.map(sal => {
                      // Toutes les inscriptions de ce salarié pour cet événement
                      const toutesInscs = inscriptions.filter(i=>i.evenementId===ev.id&&i.salarieId===sal.id);
                      const insc = toutesInscs.find(i=>i.statut!=='retire'); // inscription active
                      const hasRetire = toutesInscs.some(i=>i.statut==='retire');
                      const hasHistorique = toutesInscs.length > 0;

                      return (
                        <td key={sal.id} style={{ padding:'8px', textAlign:'center', verticalAlign:'middle' }}>
                          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                            {!insc ? (
                              // Pas d'inscription active
                              <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                                <button onClick={()=>inscrire(ev.id,sal.id)}
                                  style={{ width:26, height:26, borderRadius:'50%', background:'#f8f6f2', border:'1px dashed #ccc', cursor:'pointer', fontSize:14, color:'#aaa', display:'inline-flex', alignItems:'center', justifyContent:'center' }}
                                  title={`Inscrire ${sal.prenom}`}>+</button>
                                {hasRetire&&showRetires&&(
                                  <span style={{ fontSize:9, color:'#888', background:'#f1efe8', padding:'1px 4px', borderRadius:4 }}>↩ retiré</span>
                                )}
                              </div>
                            ) : insc.statut==='valide' ? (
                              <button onClick={()=>handleRetirer(insc.id)} disabled={saving[insc.id]}
                                style={{ width:28, height:28, borderRadius:'50%', background:'#EAF3DE', color:'#3B6D11', border:`1.5px solid ${insc.source==='salarie'?'#3B6D11':'transparent'}`, cursor:'pointer', fontSize:14, display:'inline-flex', alignItems:'center', justifyContent:'center', position:'relative' }}
                                title={`Cliquer pour retirer\nInscrit ${insc.source==='salarie'?'par le salarié':'par l\'admin'}`}>
                                ✓
                                {insc.source==='salarie'&&<span style={{ position:'absolute', top:-2, right:-2, width:8, height:8, borderRadius:'50%', background:'#185FA5', border:'1px solid #fff' }} title="Auto-inscrit" />}
                              </button>
                            ) : insc.statut==='en_attente' ? (
                              <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                                <button onClick={()=>valider(insc.id)} disabled={saving[insc.id]}
                                  style={{ width:26, height:26, borderRadius:'50%', background:'#EAF3DE', color:'#3B6D11', border:'none', cursor:'pointer', fontSize:13, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>✓</button>
                                <button onClick={()=>refuser(insc.id)} disabled={saving[insc.id]}
                                  style={{ width:26, height:26, borderRadius:'50%', background:'#FCEBEB', color:'#A32D2D', border:'none', cursor:'pointer', fontSize:13, display:'inline-flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                              </div>
                            ) : null}

                            {/* Bouton historique */}
                            {hasHistorique&&(
                              <button onClick={()=>setHistorique({salarie:sal, evenement:ev})}
                                style={{ fontSize:9, color:'var(--text-3)', background:'none', border:'none', cursor:'pointer', padding:0, textDecoration:'underline' }}>
                                🕐 hist.
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    <td style={{ padding:'8px', textAlign:'center', fontSize:12, fontWeight:500 }}>
                      <span style={{ color:complet?'#3B6D11':inscritsValides.length===0?'#A32D2D':'#854F0B' }}>
                        {inscritsValides.length}/{ev.effectif}
                      </span>
                      {complet&&<div style={{ fontSize:10, color:'#3B6D11' }}>✓</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background:'#fafaf8', borderTop:'1px solid var(--border)' }}>
                <td style={{ padding:'10px 16px', fontSize:11, fontWeight:500, color:'var(--text-2)' }}>Total heures validées</td>
                {salaries.map(sal => {
                  const h=heuresSalarie(sal.id); const warn=h>35; const danger=h>48;
                  return (
                    <td key={sal.id} style={{ padding:'10px 8px', textAlign:'center' }}>
                      <span style={{ fontSize:13, fontWeight:500, fontFamily:'var(--font-mono)', color:danger?'#A32D2D':warn?'#854F0B':'#3B6D11' }}>
                        {fmtH(h)}{danger?' ⚠️':warn?' ⚡':''}
                      </span>
                    </td>
                  );
                })}
                <td/>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div style={{ fontSize:11, color:'var(--text-3)', marginTop:10, display:'flex', gap:16, flexWrap:'wrap' }}>
        <span>● vert bordé bleu = auto-inscription salarié</span>
        <span>⚡ alerte &gt;35h · ⚠️ dépassement légal &gt;48h</span>
        <span>🕐 hist. = voir l'historique complet</span>
      </div>

      {/* Modal historique */}
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
  th: { padding:'10px 8px', fontSize:11, fontWeight:500, color:'var(--text-2)', textAlign:'center', position:'sticky', top:0, zIndex:2 },
};