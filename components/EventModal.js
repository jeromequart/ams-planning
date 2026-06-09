import { useState, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import Modal from './Modal';
import { LIEUX_FREQUENTS } from '../data/config';

const FORM_VIDE = {
  nom: '', ref: '', date: '', debut: '08:00', fin: '17:00',
  type: 'dps', lieu: '', lieuCustom: '', note: '',
  effectif: 1, ouvert: true,
  tenue: 'blanche', repas: false,
  heureDepart: '', arriveeSurPlace: false,
};

function dureeH(debut, fin) {
  const [dh, dm] = debut.split(':').map(Number);
  const [fh, fm] = fin.split(':').map(Number);
  return (fh * 60 + fm - (dh * 60 + dm)) / 60;
}
function fmtH(h) {
  if (h <= 0) return '0h';
  const hh = Math.floor(h); const mm = Math.round((h - hh) * 60);
  return mm ? `${hh}h${String(mm).padStart(2, '0')}` : `${hh}h`;
}

export default function EventModal({ onClose, onSave, missionTypes, initialDate = '', editEvent = null, vehicules = [], inscrits = [], salaries = [], vehiculesAffectes = [], onSaveVehicules }) {
  const [form, setForm] = useState(editEvent ? {
    nom: editEvent.nom || '', ref: editEvent.ref || '',
    date: editEvent.date || initialDate, debut: editEvent.debut || '08:00',
    fin: editEvent.fin || '17:00', type: editEvent.type || 'dps',
    lieu: editEvent.lieu || '', lieuCustom: '',
    note: editEvent.note || '', effectif: editEvent.effectif || 1,
    ouvert: editEvent.ouvert !== undefined ? editEvent.ouvert : true,
    tenue: editEvent.tenue || 'blanche',
    repas: editEvent.repas || false,
    heureDepart: editEvent.heureDepart || '',
    arriveeSurPlace: editEvent.arriveeSurPlace || false,
  } : { ...FORM_VIDE, date: initialDate });

  // Gestion véhicules affectés
  const [vehs, setVehs] = useState(vehiculesAffectes);
  const [newVehId, setNewVehId] = useState('');
  const [newVehCustom, setNewVehCustom] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const s = styles;

  function save() {
    if (!form.date || !form.debut || !form.fin) return;
    const lieuFinal = form.lieu === '__custom__' ? form.lieuCustom : form.lieu;
    onSave({ id: editEvent?.id || uuid(), ...form, lieu: lieuFinal });
    if (onSaveVehicules) onSaveVehicules(vehs);
    onClose();
  }

  function addVeh() {
    if (showCustom) {
      if (!newVehCustom.trim()) return;
      setVehs(prev => [...prev, { id: uuid(), vehiculeId: null, vehiculeCustom: newVehCustom.trim(), conducteurId: null }]);
      setNewVehCustom(''); setShowCustom(false);
    } else {
      if (!newVehId) return;
      const exists = vehs.find(v => v.vehiculeId === newVehId);
      if (exists) return;
      setVehs(prev => [...prev, { id: uuid(), vehiculeId: newVehId, vehiculeCustom: null, conducteurId: null }]);
      setNewVehId('');
    }
  }

  function removeVeh(id) { setVehs(prev => prev.filter(v => v.id !== id)); }
  function setConducteur(vehLocalId, conducteurId) {
    setVehs(prev => prev.map(v => v.id === vehLocalId ? { ...v, conducteurId: conducteurId || null } : v));
  }

  const types = missionTypes || {};
  const inscritsSalaries = salaries.filter(s => inscrits.find(i => i.salarieId === s.id && i.statut === 'valide'));

  return (
    <Modal title={editEvent ? "Modifier l'événement" : "Nouvel événement"} onClose={onClose} width={560}>
      {/* Nom + Ref */}
      <div style={s.grid2}>
        <div style={s.fg}><label style={s.label}>Nom de l'événement</label><input style={s.input} value={form.nom} onChange={e=>setForm(p=>({...p,nom:e.target.value}))} placeholder="Ex : Bal des mamans" autoFocus/></div>
        <div style={s.fg}><label style={s.label}>Référence</label><input style={s.input} value={form.ref} onChange={e=>setForm(p=>({...p,ref:e.target.value}))} placeholder="Ex : DPS 218"/></div>
      </div>

      {/* Date + Horaires */}
      <div style={s.grid3}>
        <div style={s.fg}><label style={s.label}>Date *</label><input style={s.input} type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/></div>
        <div style={s.fg}><label style={s.label}>Début *</label><input style={s.input} type="time" value={form.debut} onChange={e=>setForm(p=>({...p,debut:e.target.value}))}/></div>
        <div style={s.fg}><label style={s.label}>Fin *</label><input style={s.input} type="time" value={form.fin} onChange={e=>setForm(p=>({...p,fin:e.target.value}))}/></div>
      </div>
      {form.debut && form.fin && <div style={{ fontSize:11, color:'var(--text-2)', marginTop:-8, marginBottom:10 }}>Durée : {fmtH(dureeH(form.debut, form.fin))}</div>}

      {/* Type + Lieu */}
      <div style={s.grid2}>
        <div style={s.fg}>
          <label style={s.label}>Type de mission</label>
          <select style={s.input} value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
            {Object.entries(types).map(([k,v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>
        </div>
        <div style={s.fg}>
          <label style={s.label}>Lieu</label>
          <select style={s.input} value={form.lieu} onChange={e=>setForm(p=>({...p,lieu:e.target.value}))}>
            <option value="">— Sélectionner —</option>
            {LIEUX_FREQUENTS.map(l=><option key={l} value={l}>{l}</option>)}
            <option value="__custom__">Autre lieu…</option>
          </select>
          {form.lieu==='__custom__' && <input style={{...s.input,marginTop:6}} value={form.lieuCustom} onChange={e=>setForm(p=>({...p,lieuCustom:e.target.value}))} placeholder="Saisir le lieu"/>}
        </div>
      </div>

      {/* Effectif + Ouvert */}
      <div style={s.grid2}>
        <div style={s.fg}><label style={s.label}>Effectif souhaité</label><input style={s.input} type="number" min="1" max="50" value={form.effectif} onChange={e=>setForm(p=>({...p,effectif:e.target.value}))}/></div>
        <div style={{...s.fg, display:'flex', flexDirection:'column', justifyContent:'flex-end'}}>
          <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13}}>
            <input type="checkbox" checked={form.ouvert} onChange={e=>setForm(p=>({...p,ouvert:e.target.checked}))} style={{width:16,height:16}}/>
            <span>Ouvert aux inscriptions salariés</span>
          </label>
        </div>
      </div>

      {/* Séparateur */}
      <div style={{ borderTop:'1px solid var(--border)', margin:'12px 0 14px', position:'relative' }}>
        <span style={{ position:'absolute', top:-9, left:0, background:'#fff', paddingRight:8, fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Infos logistiques</span>
      </div>

      {/* Tenue + Repas */}
      <div style={s.grid2}>
        <div style={s.fg}>
          <label style={s.label}>Couleur de tenue</label>
          <div style={{ display:'flex', gap:8, marginTop:4 }}>
            {[{val:'blanche',label:'Blanche',bg:'#f8f8f8',border:'#ccc',txt:'#333'},
              {val:'bleue',label:'Bleue',bg:'#e6f1fb',border:'#185FA5',txt:'#185FA5'}].map(t=>(
              <label key={t.val} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', padding:'7px 14px', borderRadius:8, border:`1.5px solid ${form.tenue===t.val?t.border:'var(--border-med)'}`, background:form.tenue===t.val?t.bg:'transparent', flex:1, justifyContent:'center' }}>
                <input type="radio" name="tenue" value={t.val} checked={form.tenue===t.val} onChange={()=>setForm(p=>({...p,tenue:t.val}))} style={{ display:'none' }}/>
                <div style={{ width:14, height:14, borderRadius:'50%', background:t.val==='blanche'?'#fff':'#185FA5', border:`2px solid ${t.border}`, flexShrink:0 }}/>
                <span style={{ fontSize:13, fontWeight:500, color:form.tenue===t.val?t.txt:'var(--text-2)' }}>{t.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div style={s.fg}>
          <label style={s.label}>Repas</label>
          <div style={{ display:'flex', gap:8, marginTop:4 }}>
            {[{val:true,label:'Pris en charge',bg:'#EAF3DE',border:'#3B6D11',txt:'#3B6D11'},
              {val:false,label:'Non pris en charge',bg:'#f8f6f2',border:'#ccc',txt:'#888'}].map(r=>(
              <label key={String(r.val)} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', padding:'7px 10px', borderRadius:8, border:`1.5px solid ${form.repas===r.val?r.border:'var(--border-med)'}`, background:form.repas===r.val?r.bg:'transparent', flex:1, justifyContent:'center' }}>
                <input type="radio" name="repas" checked={form.repas===r.val} onChange={()=>setForm(p=>({...p,repas:r.val}))} style={{ display:'none' }}/>
                <span style={{ fontSize:12, fontWeight:500, color:form.repas===r.val?r.txt:'var(--text-2)' }}>{r.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Heure départ */}
      <div style={s.grid2}>
        <div style={s.fg}>
          <label style={s.label}>Heure de départ du bureau</label>
          <input style={s.input} type="time" value={form.heureDepart} onChange={e=>setForm(p=>({...p,heureDepart:e.target.value}))} placeholder="Optionnel"/>
        </div>
        <div style={{...s.fg, display:'flex', flexDirection:'column', justifyContent:'flex-end'}}>
          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, padding:'9px 12px', borderRadius:8, border:'1px solid var(--border-med)', background:form.arriveeSurPlace?'#faeeda':'transparent' }}>
            <input type="checkbox" checked={form.arriveeSurPlace} onChange={e=>setForm(p=>({...p,arriveeSurPlace:e.target.checked}))} style={{ width:15, height:15, accentColor:'#854F0B' }}/>
            <span style={{ color:form.arriveeSurPlace?'#854F0B':'var(--text-2)', fontWeight:form.arriveeSurPlace?500:400 }}>⚠️ Arrivée sur place (prévenir le chef)</span>
          </label>
        </div>
      </div>

      {/* Véhicules */}
      <div style={{ borderTop:'1px solid var(--border)', margin:'12px 0 14px', position:'relative' }}>
        <span style={{ position:'absolute', top:-9, left:0, background:'#fff', paddingRight:8, fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Véhicules affectés</span>
      </div>

      {/* Liste véhicules affectés */}
      {vehs.length > 0 && (
        <div style={{ marginBottom:12, display:'flex', flexDirection:'column', gap:8 }}>
          {vehs.map(v => {
            const veh = vehicules.find(x => x.id === v.vehiculeId);
            const label = veh ? `${veh.nom} — ${veh.immatriculation}` : v.vehiculeCustom || '?';
            return (
              <div key={v.id} style={{ display:'flex', alignItems:'center', gap:8, background:'#f8f6f2', borderRadius:8, padding:'8px 12px' }}>
                <span style={{ fontSize:13, fontWeight:500, flex:1 }}>🚗 {label}</span>
                <select
                  style={{ fontSize:12, padding:'4px 8px', border:'1px solid var(--border-med)', borderRadius:6, fontFamily:'var(--font)', maxWidth:160 }}
                  value={v.conducteurId || ''}
                  onChange={e => setConducteur(v.id, e.target.value)}
                >
                  <option value="">Conducteur…</option>
                  {inscritsSalaries.map(s => <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>)}
                </select>
                <button onClick={() => removeVeh(v.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', fontSize:16 }}>✕</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Ajouter un véhicule */}
      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
        {!showCustom ? (
          <>
            <select style={{ ...s.input, flex:1 }} value={newVehId} onChange={e=>setNewVehId(e.target.value)}>
              <option value="">— Sélectionner un véhicule —</option>
              {vehicules.filter(v => !vehs.find(av => av.vehiculeId === v.id)).map(v => (
                <option key={v.id} value={v.id}>{v.nom} — {v.immatriculation}</option>
              ))}
              <option value="__custom__">+ Autre véhicule…</option>
            </select>
            <button onClick={() => { if (newVehId === '__custom__') { setShowCustom(true); setNewVehId(''); } else addVeh(); }}
              style={s.btnPri}>Ajouter</button>
          </>
        ) : (
          <>
            <input style={{ ...s.input, flex:1 }} value={newVehCustom} onChange={e=>setNewVehCustom(e.target.value)} placeholder="Immatriculation ou nom du véhicule" autoFocus/>
            <button onClick={addVeh} style={s.btnPri}>Ajouter</button>
            <button onClick={() => setShowCustom(false)} style={s.btnSec}>Annuler</button>
          </>
        )}
      </div>

      {/* Note */}
      <div style={{ ...s.fg, marginTop:12 }}>
        <label style={s.label}>Note / Instructions</label>
        <textarea style={{ ...s.input, minHeight:56, resize:'vertical' }} value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} placeholder="Instructions particulières…"/>
      </div>

      <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
        <button style={s.btnSec} onClick={onClose}>Annuler</button>
        <button style={s.btnPri} onClick={save}>{editEvent ? 'Enregistrer' : "Créer l'événement"}</button>
      </div>
    </Modal>
  );
}

const styles = {
  fg: { marginBottom:12 },
  grid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  grid3: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 },
  label: { display:'block', fontSize:12, fontWeight:500, color:'var(--text-2)', marginBottom:5 },
  input: { width:'100%', padding:'8px 11px', border:'1px solid var(--border-med)', borderRadius:8, fontSize:13, color:'var(--text)', background:'#fff', fontFamily:'var(--font)' },
  btnPri: { background:'#a32d2d', color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'var(--font)', flexShrink:0 },
  btnSec: { background:'transparent', color:'var(--text-2)', border:'1px solid var(--border-med)', borderRadius:8, padding:'8px 18px', fontSize:13, cursor:'pointer', fontFamily:'var(--font)', flexShrink:0 },
};
