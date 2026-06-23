import { useState, useRef } from 'react';
import Modal from './Modal';
import { AVATAR_COLORS } from '../data/config';

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

function initiales(p,n){return((p?.[0]||'')+(n?.[0]||'')).toUpperCase();}
function dureeH(d,f){const[dh,dm]=d.split(':').map(Number);const[fh,fm]=f.split(':').map(Number);return(fh*60+fm-(dh*60+dm))/60;}
function fmtH(h){if(h<=0)return'0h';const hh=Math.floor(h);const mm=Math.round((h-hh)*60);return mm?`${hh}h${String(mm).padStart(2,'0')}`:`${hh}h`;}
function fmtDate(ds){const d=new Date(ds);return`${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0,3)}.`;}

function getAge(dateNaissance) {
  if (!dateNaissance) return null;
  const today = new Date();
  const birth = new Date(dateNaissance);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getDiplomes(sal) {
  const d = [];
  if (sal.chefEquipe) d.push({ label:'Chef équipe', color:'#534AB7', bg:'#EEEDFE' });
  if (sal.pse2) d.push({ label:'PSE 2', color:'#185FA5', bg:'#E6F1FB' });
  else if (sal.pse1) d.push({ label:'PSE 1', color:'#185FA5', bg:'#E6F1FB' });
  if (sal.bnssa) d.push({ label:'BNSSA', color:'#0F6E56', bg:'#E1F5EE' });
  return d;
}

const FORM_VIDE = { prenom:'', nom:'', role:'', colorIdx:0, dateNaissance:'', email:'', tel:'', chefEquipe:false, pse1:false, pse2:false, bnssa:false };

export default function AdminView({ salaries, addSalarie, updateSalarie, removeSalarie, evenements, inscriptions, updateInscription, removeInscription, missionTypes }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const detailRef = useRef(null);

  function selectSalarie(id) {
    setSelected(id);
    setTimeout(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }
  const [showModal, setShowModal] = useState(false);
  const [showCompte, setShowCompte] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(FORM_VIDE);
  const [saving, setSaving] = useState(false);
  const [compteForm, setCompteForm] = useState({ email:'', password:'' });
  const [compteMsg, setCompteMsg] = useState('');
  const [compteSaving, setCompteSaving] = useState(false);
  const now = (() => { const n=new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`; })();

  const salarie = salaries.find(sal => sal.id === selected);
  const mesInscriptions = inscriptions.filter(i => i.salarieId === selected && i.statut === 'valide');
  const mesEvenements = evenements.filter(e => mesInscriptions.find(i => i.evenementId === e.id)).sort((a,b)=>a.date.localeCompare(b.date));
  const hEffectuees = mesEvenements.filter(e=>e.date<now).reduce((s,e)=>s+dureeH(e.debut,e.fin),0);
  const hAVenir = mesEvenements.filter(e=>e.date>=now).reduce((s,e)=>s+dureeH(e.debut,e.fin),0);

  function openAdd(){setForm({...FORM_VIDE,colorIdx:salaries.length%AVATAR_COLORS.length});setEditId(null);setShowModal(true);}
  function openEdit(sal){setForm({prenom:sal.prenom,nom:sal.nom,role:sal.role||'',colorIdx:sal.colorIdx||0,dateNaissance:sal.dateNaissance||'',email:sal.email||'',tel:sal.tel||'',chefEquipe:!!sal.chefEquipe,pse1:!!sal.pse1,pse2:!!sal.pse2,bnssa:!!sal.bnssa});setEditId(sal.id);setShowModal(true);}

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

  async function handleCreerCompte(){
    if(!compteForm.email||!compteForm.password){setCompteMsg('Email et mot de passe obligatoires.');return;}
    if(compteForm.password.length<6){setCompteMsg('Mot de passe minimum 6 caractères.');return;}
    setCompteSaving(true);setCompteMsg('');
    try {
      const res = await fetch('/api/create-salarie',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:compteForm.email,password:compteForm.password,salarieId:selected})});
      const json = await res.json();
      if(json.error){setCompteMsg('Erreur : '+json.error);}
      else{setCompteMsg('✅ Compte créé ! Identifiants à transmettre au salarié.');}
    } catch(e){setCompteMsg('Erreur de connexion.');}
    finally{setCompteSaving(false);}
  }

  const st = styles;
  const age = salarie ? getAge(salarie.dateNaissance) : null;
  const diplomes = salarie ? getDiplomes(salarie) : [];

  return (
    <div style={st.container}>
      {/* Sidebar */}
      <div style={st.sidebar}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <span style={st.sectionLabel}>Équipe ({salaries.length})</span>
          <button style={st.btnPri} onClick={openAdd}>+ Ajouter</button>
        </div>
        {/* Barre de recherche */}
        <input
          style={{ width:'100%', padding:'8px 11px', border:'1px solid var(--border-med)', borderRadius:8, fontSize:13, fontFamily:'var(--font)', marginBottom:8, boxSizing:'border-box' }}
          placeholder="Rechercher un salarié…"
          value={search}
          onChange={e=>setSearch(e.target.value)}
        />
        {salaries.length===0&&<div style={{textAlign:'center',padding:'32px 12px',color:'var(--text-3)',fontSize:13}}><div style={{fontSize:32,marginBottom:8}}>👤</div>Aucun salarié.</div>}
        {[...salaries].filter(sal=>`${sal.prenom} ${sal.nom}`.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>a.nom.localeCompare(b.nom)||a.prenom.localeCompare(b.prenom)).map(sal=>{
          const c=AVATAR_COLORS[sal.colorIdx%AVATAR_COLORS.length];
          const salInsc=inscriptions.filter(i=>i.salarieId===sal.id&&i.statut==='valide');
          const salEvs=evenements.filter(e=>salInsc.find(i=>i.evenementId===e.id));
          const totalH=salEvs.reduce((s,e)=>s+dureeH(e.debut,e.fin),0);
          const age=getAge(sal.dateNaissance);
          const diplomes=getDiplomes(sal);
          return(
            <div key={sal.id} onClick={()=>selectSalarie(sal.id)} style={{...st.staffCard,...(selected===sal.id?st.staffCardActive:{})}}>
              <div style={{...st.avatar,background:c.bg,color:c.txt}}>{initiales(sal.prenom,sal.nom)}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={st.staffName}>{sal.prenom} {sal.nom}
                  {age!==null&&age<18&&<span style={{fontSize:9,background:'#FCEBEB',color:'#A32D2D',padding:'1px 5px',borderRadius:10,marginLeft:4,fontWeight:500}}>-18</span>}
                </div>
                <div style={{display:'flex',gap:3,flexWrap:'wrap',marginTop:2}}>
                  {diplomes.map(d=><span key={d.label} style={{fontSize:9,background:d.bg,color:d.color,padding:'1px 5px',borderRadius:10,fontWeight:500}}>{d.label}</span>)}
                </div>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{fontSize:12,fontWeight:600,color:'var(--red)',fontFamily:'var(--font-mono)'}}>{fmtH(totalH)}</div>
                <div style={{fontSize:10,color:'var(--text-3)'}}>{salEvs.length} mission{salEvs.length>1?'s':''}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Détail */}
      <div style={st.detail}>
        <div ref={detailRef} style={{ scrollMarginTop: 80 }}>
        {!salarie?(
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:300,color:'var(--text-3)'}}>
            <div style={{fontSize:40,marginBottom:12}}>👈</div>
            <div style={{fontSize:14}}>{salaries.length===0?'Ajoutez votre premier salarié':'Sélectionnez un salarié'}</div>
          </div>
        ):(
          <>
            {/* Header */}
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20,paddingBottom:16,borderBottom:'1px solid var(--border)'}}>
              <div style={{display:'flex',alignItems:'center',gap:14}}>
                <div style={{...st.avatarLg,background:AVATAR_COLORS[salarie.colorIdx%AVATAR_COLORS.length].bg,color:AVATAR_COLORS[salarie.colorIdx%AVATAR_COLORS.length].txt}}>
                  {initiales(salarie.prenom,salarie.nom)}
                </div>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <div style={{fontSize:18,fontWeight:600}}>{salarie.prenom} {salarie.nom}</div>
                    {age!==null&&age<18&&<span style={{fontSize:11,background:'#FCEBEB',color:'#A32D2D',padding:'2px 8px',borderRadius:20,fontWeight:500}}>⚠️ Mineur (-18 ans)</span>}
                  </div>
                  <div style={{fontSize:13,color:'var(--text-2)',marginTop:2}}>{salarie.role||'Rôle non défini'}</div>
                  {/* Diplômes */}
                  {diplomes.length>0&&(
                    <div style={{display:'flex',gap:4,marginTop:6,flexWrap:'wrap'}}>
                      {diplomes.map(d=><span key={d.label} style={{fontSize:11,background:d.bg,color:d.color,padding:'2px 9px',borderRadius:20,fontWeight:500}}>{d.label}</span>)}
                    </div>
                  )}
                </div>
              </div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',justifyContent:'flex-end'}}>
                <button style={st.btnSec} onClick={()=>openEdit(salarie)}>✏️ Modifier</button>
                <button style={{...st.btnSec,color:'var(--red)'}} onClick={()=>handleDelete(salarie.id)}>🗑 Supprimer</button>
                <button style={{...st.btnPri,background:'#185fa5'}} onClick={()=>{setCompteForm({email:salarie.email||'',password:''});setCompteMsg('');setShowCompte(true);}}>🔑 Créer un accès</button>
              </div>
            </div>

            {/* Infos contact */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
              {salarie.dateNaissance&&<div style={{background:'#f8f6f2',borderRadius:10,padding:'10px 14px'}}>
                <div style={{fontSize:11,color:'var(--text-2)',marginBottom:2}}>Date de naissance</div>
                <div style={{fontSize:13,fontWeight:500}}>{new Date(salarie.dateNaissance).toLocaleDateString('fr-FR')} {age!==null&&<span style={{fontSize:11,color:'var(--text-2)'}}>({age} ans)</span>}</div>
              </div>}
              {salarie.email&&<div style={{background:'#f8f6f2',borderRadius:10,padding:'10px 14px'}}>
                <div style={{fontSize:11,color:'var(--text-2)',marginBottom:2}}>Email</div>
                <div style={{fontSize:13,fontWeight:500,wordBreak:'break-all'}}>{salarie.email}</div>
              </div>}
              {salarie.tel&&<div style={{background:'#f8f6f2',borderRadius:10,padding:'10px 14px'}}>
                <div style={{fontSize:11,color:'var(--text-2)',marginBottom:2}}>Téléphone</div>
                <div style={{fontSize:13,fontWeight:500}}>{salarie.tel}</div>
              </div>}
            </div>

            {/* Stats heures */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:20}}>
              {[{label:'Missions planifiées',value:mesEvenements.length},{label:'Heures effectuées',value:fmtH(hEffectuees)},{label:'Heures à venir',value:fmtH(hAVenir)}].map(({label,value})=>(
                <div key={label} style={{background:'#f8f6f2',borderRadius:10,padding:'10px 14px'}}>
                  <div style={{fontSize:11,color:'var(--text-2)',marginBottom:4}}>{label}</div>
                  <div style={{fontSize:20,fontWeight:600,fontFamily:'var(--font-mono)'}}>{value}</div>
                </div>
              ))}
            </div>

            {/* Missions */}
            <div style={{background:'#fff',borderRadius:12,border:'1px solid var(--border)',overflow:'hidden'}}>
              <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)'}}>
                <span style={st.sectionLabel}>Missions assignées</span>
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
                            {estPassee?<span style={{fontSize:11,background:'#eaf3de',color:'#3b6d11',padding:'2px 8px',borderRadius:20}}>✅ Effectuée</span>:<span style={{fontSize:11,background:'#e6f1fb',color:'#185fa5',padding:'2px 8px',borderRadius:20}}>📅 À venir</span>}
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
      </div>
      {showModal&&(
        <Modal title={editId?'Modifier le salarié':'Nouveau salarié'} onClose={()=>setShowModal(false)} width={520}>
          {/* Prénom / Nom */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <div><label style={st.label}>Prénom *</label><input style={st.input} value={form.prenom} onChange={e=>setForm(p=>({...p,prenom:e.target.value}))} placeholder="Prénom" autoFocus/></div>
            <div><label style={st.label}>Nom *</label><input style={st.input} value={form.nom} onChange={e=>setForm(p=>({...p,nom:e.target.value}))} placeholder="NOM"/></div>
          </div>
          {/* Rôle */}
          <div style={{marginBottom:12}}><label style={st.label}>Rôle / Poste</label><input style={st.input} value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))} placeholder="Ex : Secouriste, Chef d'équipe…"/></div>
          {/* Date naissance / Email / Tel */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:12}}>
            <div>
              <label style={st.label}>Date de naissance</label>
              <input style={st.input} type="date" value={form.dateNaissance} onChange={e=>setForm(p=>({...p,dateNaissance:e.target.value}))}/>
              {form.dateNaissance&&(()=>{const age=getAge(form.dateNaissance);return age!==null&&age<18?<div style={{fontSize:11,color:'#A32D2D',marginTop:3}}>⚠️ Mineur ({age} ans)</div>:null;})()}
            </div>
            <div><label style={st.label}>Email</label><input style={st.input} type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="prenom@email.com"/></div>
            <div><label style={st.label}>Tél. portable</label><input style={st.input} type="tel" value={form.tel} onChange={e=>setForm(p=>({...p,tel:e.target.value}))} placeholder="06 00 00 00 00"/></div>
          </div>
          {/* Diplômes */}
          <div style={{marginBottom:14}}>
            <label style={st.label}>Diplômes / Fonctions</label>
            <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:6}}>
              {[
                {key:'chefEquipe',label:'Chef d\'équipe',color:'#534AB7',bg:'#EEEDFE'},
                {key:'pse1',label:'PSE 1',color:'#185FA5',bg:'#E6F1FB'},
                {key:'pse2',label:'PSE 2',color:'#185FA5',bg:'#E6F1FB'},
                {key:'bnssa',label:'BNSSA',color:'#0F6E56',bg:'#E1F5EE'},
              ].map(({key,label,color,bg})=>(
                <label key={key} style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',padding:'7px 12px',borderRadius:8,border:`1px solid ${form[key]?color:'var(--border-med)'}`,background:form[key]?bg:'transparent',transition:'all 0.12s'}}>
                  <input type="checkbox" checked={!!form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.checked}))} style={{width:15,height:15,accentColor:color}}/>
                  <span style={{fontSize:13,fontWeight:500,color:form[key]?color:'var(--text-2)'}}>{label}</span>
                </label>
              ))}
            </div>
            {form.pse1&&form.pse2&&<div style={{fontSize:11,color:'#854F0B',marginTop:6}}>ℹ️ PSE 2 coché — PSE 1 ne s'affichera pas lors des inscriptions.</div>}
          </div>
          {/* Couleur avatar */}
          <div style={{marginBottom:14}}>
            <label style={st.label}>Couleur de l'avatar</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:6}}>
              {AVATAR_COLORS.map((c,i)=>(
                <div key={i} onClick={()=>setForm(p=>({...p,colorIdx:i}))} style={{width:32,height:32,borderRadius:'50%',background:c.bg,color:c.txt,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,cursor:'pointer',border:form.colorIdx===i?`2px solid ${c.txt}`:'2px solid transparent'}}>
                  {initiales(form.prenom,form.nom)||'AB'}
                </div>
              ))}
            </div>
          </div>
          <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:20}}>
            <button style={st.btnSec} onClick={()=>setShowModal(false)}>Annuler</button>
            <button style={st.btnPri} onClick={save} disabled={saving}>{saving?'…':editId?'Enregistrer':'Créer le salarié'}</button>
          </div>
        </Modal>
      )}

      {/* Modal compte */}
      {showCompte&&salarie&&(
        <Modal title={`Accès salarié — ${salarie.prenom} ${salarie.nom}`} onClose={()=>setShowCompte(false)}>
          <div style={{marginBottom:16,padding:'12px 14px',background:'#e6f1fb',borderRadius:10,fontSize:13,color:'#185fa5'}}>
            Créez les identifiants de connexion pour ce salarié.
          </div>
          <div style={{marginBottom:12}}><label style={st.label}>Adresse email *</label><input style={st.input} type="email" value={compteForm.email} onChange={e=>setCompteForm(p=>({...p,email:e.target.value}))} placeholder="prenom.nom@email.com" autoFocus/></div>
          <div style={{marginBottom:12}}><label style={st.label}>Mot de passe *</label><input style={st.input} type="text" value={compteForm.password} onChange={e=>setCompteForm(p=>({...p,password:e.target.value}))} placeholder="Minimum 6 caractères"/></div>
          {compteMsg&&<div style={{padding:'10px 14px',borderRadius:8,marginBottom:12,fontSize:13,background:compteMsg.startsWith('✅')?'#eaf3de':'#fcebeb',color:compteMsg.startsWith('✅')?'#3b6d11':'#a32d2d'}}>{compteMsg}</div>}
          <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:16}}>
            <button style={st.btnSec} onClick={()=>setShowCompte(false)}>Fermer</button>
            <button style={{...st.btnPri,background:'#185fa5'}} onClick={handleCreerCompte} disabled={compteSaving}>{compteSaving?'Création…':'Créer le compte'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const styles = {
  container:{display:'grid',gridTemplateColumns:'260px 1fr',gap:16,minHeight:500},
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
