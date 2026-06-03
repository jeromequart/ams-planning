import { useState } from 'react';
import Modal from './Modal';
import { AVATAR_COLORS } from '../data/config';

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

function initiales(p,n){return((p?.[0]||'')+(n?.[0]||'')).toUpperCase();}
function dureeH(d,f){const[dh,dm]=d.split(':').map(Number);const[fh,fm]=f.split(':').map(Number);return(fh*60+fm-(dh*60+dm))/60;}
function fmtH(h){if(h<=0)return'0h';const hh=Math.floor(h);const mm=Math.round((h-hh)*60);return mm?`${hh}h${String(mm).padStart(2,'0')}`:`${hh}h`;}
function fmtDate(ds){const d=new Date(ds);return`${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)}.`;}

const FORM_VIDE={prenom:'',nom:'',role:'',colorIdx:0};

export default function AdminView({ salaries, addSalarie, updateSalarie, removeSalarie, evenements, inscriptions, updateInscription, removeInscription, missionTypes }) {
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(FORM_VIDE);
  const [saving, setSaving] = useState(false);
  const now = new Date().toISOString().slice(0,10);

  const salarie = salaries.find(s => s.id === selected);
  const mesInscriptions = inscriptions.filter(i => i.salarieId === selected && i.statut === 'valide');
  const mesEvenements = evenements.filter(e => mesInscriptions.find(i => i.evenementId === e.id)).sort((a,b)=>a.date.localeCompare(b.date));
  const hEffectuees = mesEvenements.filter(e=>e.date<now).reduce((s,e)=>s+dureeH(e.debut,e.fin),0);
  const hAVenir = mesEvenements.filter(e=>e.date>=now).reduce((s,e)=>s+dureeH(e.debut,e.fin),0);

  function openAdd(){setForm({...FORM_VIDE,colorIdx:salaries.length%AVATAR_COLORS.length});setEditId(null);setShowModal(true);}
  function openEdit(s){setForm({prenom:s.prenom,nom:s.nom,role:s.role,colorIdx:s.colorIdx});setEditId(s.id);setShowModal(true);}

  async function save(){
    if(!form.prenom.trim()||!form.nom.trim())return;
    setSaving(true);
    try {
      if(editId){ await updateSalarie(editId, form); }
      else { const n = await addSalarie(form); setSelected(n.id); }
      setShowModal(false);
    } finally { setSaving(false); }
  }

  async function handleDelete(id){
    if(!confirm('Supprimer ce salarié ?'))return;
    await removeSalarie(id);
    if(selected===id)setSelected(null);
  }

  async function retirer(inscId){ await removeInscription(inscId); }

  const s=styles;
  return (
    <div style={s.container}>
      <div style={s.sidebar}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <span style={s.sectionLabel}>Équipe ({salaries.length})</span>
          <button style={s.btnPri} onClick={openAdd}>+ Ajouter</button>
        </div>
        {salaries.length===0&&<div style={{textAlign:'center',padding:'32px 12px',color:'var(--text-3)',fontSize:13}}><div style={{fontSize:32,marginBottom:8}}>👤</div>Aucun salarié.</div>}
        {salaries.map(sal=>{
          const c=AVATAR_COLORS[sal.colorIdx%AVATAR_COLORS.length];
          const salInsc=inscriptions.filter(i=>i.salarieId===sal.id&&i.statut==='valide');
          const salEvs=evenements.filter(e=>salInsc.find(i=>i.evenementId===e.id));
          const totalH=salEvs.reduce((s,e)=>s+dureeH(e.debut,e.fin),0);
          return(
            <div key={sal.id} onClick={()=>setSelected(sal.id)} style={{...s.staffCard,...(selected===sal.id?s.staffCardActive:{})}}>
              <div style={{...s.avatar,background:c.bg,color:c.txt}}>{initiales(sal.prenom,sal.nom)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={s.staffName}>{sal.prenom} {sal.nom}</div>
                <div style={s.staffRole}>{sal.role||'Rôle non défini'}</div>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{fontSize:12,fontWeight:600,color:'var(--red)',fontFamily:'var(--font-mono)'}}>{fmtH(totalH)}</div>
                <div style={{fontSize:10,color:'var(--text-3)'}}>{salEvs.length} mission{salEvs.length>1?'s':''}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={s.detail}>
        {!salarie?(
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:300,color:'var(--text-3)'}}>
            <div style={{fontSize:40,marginBottom:12}}>👈</div>
            <div style={{fontSize:14}}>{salaries.length===0?'Ajoutez votre premier salarié':'Sélectionnez un salarié'}</div>
          </div>
        ):(
          <>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,paddingBottom:16,borderBottom:'1px solid var(--border)'}}>
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                <div style={{...s.avatarLg,background:AVATAR_COLORS[salarie.colorIdx%AVATAR_COLORS.length].bg,color:AVATAR_COLORS[salarie.colorIdx%AVATAR_COLORS.length].txt}}>{initiales(salarie.prenom,salarie.nom)}</div>
                <div>
                  <div style={{fontSize:18,fontWeight:600}}>{salarie.prenom} {salarie.nom}</div>
                  <div style={{fontSize:13,color:'var(--text-2)',marginTop:2}}>{salarie.role||'Rôle non défini'}</div>
                </div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button style={s.btnSec} onClick={()=>openEdit(salarie)}>✏️ Modifier</button>
                <button style={{...s.btnSec,color:'var(--red)'}} onClick={()=>handleDelete(salarie.id)}>🗑 Supprimer</button>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20}}>
              {[{label:'Missions planifiées',value:mesEvenements.length},{label:'Heures effectuées',value:fmtH(hEffectuees)},{label:'Heures à venir',value:fmtH(hAVenir)}].map(({label,value})=>(
                <div key={label} style={{background:'#f8f6f2',borderRadius:10,padding:'10px 14px'}}>
                  <div style={{fontSize:11,color:'var(--text-2)',marginBottom:4}}>{label}</div>
                  <div style={{fontSize:20,fontWeight:600,fontFamily:'var(--font-mono)'}}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{background:'#fff',borderRadius:12,border:'1px solid var(--border)',overflow:'hidden'}}>
              <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)'}}>
                <span style={s.sectionLabel}>Missions assignées</span>
              </div>
              {mesEvenements.length===0?(
                <div style={{textAlign:'center',padding:'32px',color:'var(--text-3)',fontSize:13}}>
                  Aucune mission assignée.<br/><span style={{fontSize:12}}>Créez des événements dans Planning et inscrivez ce salarié.</span>
                </div>
              ):(
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                  <thead>
                    <tr>{['Événement','Date','Horaires','Type','Lieu','Durée','Statut',''].map(h=>(
                      <th key={h} style={{textAlign:'left',fontSize:11,fontWeight:500,color:'var(--text-2)',padding:'8px 10px',borderBottom:'1px solid var(--border)',background:'#fafaf8'}}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {mesEvenements.map(ev=>{
                      const mt=missionTypes[ev.type]||Object.values(missionTypes)[0]||{label:ev.type,icon:'📌',bg:'#f1efe8',color:'#5f5e5a'};
                      const insc=inscriptions.find(i=>i.evenementId===ev.id&&i.salarieId===selected);
                      const estPassee=ev.date<now;
                      return(
                        <tr key={ev.id} style={{background:estPassee?'#fafaf8':'#fff',opacity:estPassee?0.7:1}}>
                          <td style={{padding:'10px',borderBottom:'1px solid var(--border)',fontWeight:500}}>
                            {ev.nom||'—'}{ev.ref&&<span style={{display:'block',fontSize:10,color:'var(--text-3)',fontFamily:'var(--font-mono)'}}>{ev.ref}</span>}
                          </td>
                          <td style={{padding:'10px',borderBottom:'1px solid var(--border)',whiteSpace:'nowrap',color:'var(--text-2)'}}>{fmtDate(ev.date)}</td>
                          <td style={{padding:'10px',borderBottom:'1px solid var(--border)',whiteSpace:'nowrap',fontFamily:'var(--font-mono)',fontSize:12}}>{ev.debut} – {ev.fin}</td>
                          <td style={{padding:'10px',borderBottom:'1px solid var(--border)'}}>
                            <span style={{background:mt.bg,color:mt.color,fontSize:11,padding:'2px 8px',borderRadius:20,fontWeight:500,whiteSpace:'nowrap'}}>{mt.icon} {mt.label}</span>
                          </td>
                          <td style={{padding:'10px',borderBottom:'1px solid var(--border)',color:'var(--text-2)',fontSize:12}}>{ev.lieu||'—'}</td>
                          <td style={{padding:'10px',borderBottom:'1px solid var(--border)',fontFamily:'var(--font-mono)',fontSize:12}}>{fmtH(dureeH(ev.debut,ev.fin))}</td>
                          <td style={{padding:'10px',borderBottom:'1px solid var(--border)'}}>
                            {estPassee
                              ?<span style={{fontSize:11,background:'#eaf3de',color:'#3b6d11',padding:'2px 8px',borderRadius:20}}>✅ Effectuée</span>
                              :<span style={{fontSize:11,background:'#e6f1fb',color:'#185fa5',padding:'2px 8px',borderRadius:20}}>📅 À venir</span>
                            }
                          </td>
                          <td style={{padding:'10px',borderBottom:'1px solid var(--border)'}}>
                            {insc&&<button onClick={()=>retirer(insc.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',fontSize:13}} title="Retirer">✕</button>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {showModal&&(
        <Modal title={editId?'Modifier le salarié':'Nouveau salarié'} onClose={()=>setShowModal(false)}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <div><label style={s.label}>Prénom *</label><input style={s.input} value={form.prenom} onChange={e=>setForm(p=>({...p,prenom:e.target.value}))} placeholder="Prénom" autoFocus/></div>
            <div><label style={s.label}>Nom *</label><input style={s.input} value={form.nom} onChange={e=>setForm(p=>({...p,nom:e.target.value}))} placeholder="NOM"/></div>
          </div>
          <div style={{marginBottom:14}}><label style={s.label}>Rôle / Poste</label><input style={s.input} value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))} placeholder="Ex : Secouriste, Chef d'équipe…"/></div>
          <div style={{marginBottom:14}}>
            <label style={s.label}>Couleur de l'avatar</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:6}}>
              {AVATAR_COLORS.map((c,i)=>(
                <div key={i} onClick={()=>setForm(p=>({...p,colorIdx:i}))} style={{width:32,height:32,borderRadius:'50%',background:c.bg,color:c.txt,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,cursor:'pointer',border:form.colorIdx===i?`2px solid ${c.txt}`:'2px solid transparent'}}>
                  {initiales(form.prenom,form.nom)||'AB'}
                </div>
              ))}
            </div>
          </div>
          <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:20}}>
            <button style={s.btnSec} onClick={()=>setShowModal(false)}>Annuler</button>
            <button style={s.btnPri} onClick={save} disabled={saving}>{saving?'…':editId?'Enregistrer':'Créer le salarié'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const styles={
  container:{display:'grid',gridTemplateColumns:'250px 1fr',gap:16,minHeight:500},
  sidebar:{display:'flex',flexDirection:'column',gap:6},
  sectionLabel:{fontSize:11,fontWeight:600,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'0.06em'},
  staffCard:{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,border:'1px solid var(--border)',cursor:'pointer',background:'#fff',transition:'all 0.12s'},
  staffCardActive:{borderColor:'var(--red)',background:'#fff5f5'},
  avatar:{width:32,height:32,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,flexShrink:0},
  avatarLg:{width:48,height:48,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,fontWeight:600,flexShrink:0},
  staffName:{fontSize:13,fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'},
  staffRole:{fontSize:11,color:'var(--text-2)'},
  detail:{background:'#fff',borderRadius:14,border:'1px solid var(--border)',padding:20,minHeight:400},
  label:{display:'block',fontSize:12,fontWeight:500,color:'var(--text-2)',marginBottom:5},
  input:{width:'100%',padding:'8px 11px',border:'1px solid var(--border-med)',borderRadius:8,fontSize:13,fontFamily:'var(--font)'},
  btnPri:{background:'var(--red)',color:'#fff',border:'none',borderRadius:8,padding:'7px 14px',fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'var(--font)'},
  btnSec:{background:'transparent',color:'var(--text-2)',border:'1px solid var(--border-med)',borderRadius:8,padding:'7px 14px',fontSize:12,cursor:'pointer',fontFamily:'var(--font)'},
};
