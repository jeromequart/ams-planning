import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import Modal from './Modal';
import { LIEUX_FREQUENTS } from '../data/config';

const FORM_VIDE = {
  nom: '', ref: '', date: '', debut: '08:00', fin: '17:00',
  type: 'dps', lieu: '', lieuCustom: '', note: '',
  effectif: 1, ouvert: false,
};

function dureeH(debut, fin) {
  const [dh, dm] = debut.split(':').map(Number);
  const [fh, fm] = fin.split(':').map(Number);
  return (fh * 60 + fm - (dh * 60 + dm)) / 60;
}
function fmtH(h) {
  if (h <= 0) return '0h';
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return mm ? `${hh}h${String(mm).padStart(2, '0')}` : `${hh}h`;
}

export default function EventModal({ onClose, onSave, missionTypes, initialDate = '', editEvent = null }) {
  const [form, setForm] = useState(editEvent ? {
    nom: editEvent.nom || '', ref: editEvent.ref || '',
    date: editEvent.date || initialDate, debut: editEvent.debut || '08:00',
    fin: editEvent.fin || '17:00', type: editEvent.type || 'dps',
    lieu: editEvent.lieu || '', lieuCustom: '',
    note: editEvent.note || '', effectif: editEvent.effectif || 1,
    ouvert: editEvent.ouvert || false,
  } : { ...FORM_VIDE, date: initialDate });

  const s = styles;

  function save() {
    if (!form.date || !form.debut || !form.fin) return;
    const lieuFinal = form.lieu === '__custom__' ? form.lieuCustom : form.lieu;
    onSave({
      id: editEvent?.id || uuid(),
      nom: form.nom, ref: form.ref, date: form.date,
      debut: form.debut, fin: form.fin, type: form.type,
      lieu: lieuFinal, note: form.note,
      effectif: Number(form.effectif) || 1,
      ouvert: form.ouvert,
    });
    onClose();
  }

  const types = missionTypes || {};

  return (
    <Modal title={editEvent ? "Modifier l'événement" : "Nouvel événement"} onClose={onClose} width={500}>
      {/* Nom + Ref */}
      <div style={s.grid2}>
        <div style={s.fg}>
          <label style={s.label}>Nom de l'événement</label>
          <input style={s.input} value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} placeholder="Ex : Bal des mamans" autoFocus />
        </div>
        <div style={s.fg}>
          <label style={s.label}>Référence</label>
          <input style={s.input} value={form.ref} onChange={e => setForm(p => ({ ...p, ref: e.target.value }))} placeholder="Ex : DPS 218" />
        </div>
      </div>

      {/* Date */}
      <div style={s.fg}>
        <label style={s.label}>Date *</label>
        <input style={s.input} type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
      </div>

      {/* Horaires */}
      <div style={s.grid2}>
        <div style={s.fg}>
          <label style={s.label}>Heure début *</label>
          <input style={s.input} type="time" value={form.debut} onChange={e => setForm(p => ({ ...p, debut: e.target.value }))} />
        </div>
        <div style={s.fg}>
          <label style={s.label}>Heure fin *</label>
          <input style={s.input} type="time" value={form.fin} onChange={e => setForm(p => ({ ...p, fin: e.target.value }))} />
        </div>
      </div>
      {form.debut && form.fin && (
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: -6, marginBottom: 10 }}>
          Durée : {fmtH(dureeH(form.debut, form.fin))}
        </div>
      )}

      {/* Type */}
      <div style={s.fg}>
        <label style={s.label}>Type de mission</label>
        <select style={s.input} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
          {Object.entries(types).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
      </div>

      {/* Lieu */}
      <div style={s.fg}>
        <label style={s.label}>Lieu</label>
        <select style={s.input} value={form.lieu} onChange={e => setForm(p => ({ ...p, lieu: e.target.value }))}>
          <option value="">— Sélectionner —</option>
          {LIEUX_FREQUENTS.map(l => <option key={l} value={l}>{l}</option>)}
          <option value="__custom__">Autre lieu…</option>
        </select>
        {form.lieu === '__custom__' && (
          <input style={{ ...s.input, marginTop: 6 }} value={form.lieuCustom}
            onChange={e => setForm(p => ({ ...p, lieuCustom: e.target.value }))} placeholder="Saisir le lieu" />
        )}
      </div>

      {/* Effectif + ouvert */}
      <div style={s.grid2}>
        <div style={s.fg}>
          <label style={s.label}>Effectif souhaité</label>
          <input style={s.input} type="number" min="1" max="50" value={form.effectif}
            onChange={e => setForm(p => ({ ...p, effectif: e.target.value }))} />
        </div>
        <div style={{ ...s.fg, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={form.ouvert}
              onChange={e => setForm(p => ({ ...p, ouvert: e.target.checked }))}
              style={{ width: 16, height: 16 }} />
            <span>Ouvert aux inscriptions salariés</span>
          </label>
        </div>
      </div>

      {/* Note */}
      <div style={s.fg}>
        <label style={s.label}>Note / Instructions</label>
        <textarea style={{ ...s.input, minHeight: 64, resize: 'vertical' }}
          value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
          placeholder="Instructions particulières, zone de déploiement…" />
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
        <button style={s.btnSec} onClick={onClose}>Annuler</button>
        <button style={s.btnPri} onClick={save}>
          {editEvent ? 'Enregistrer' : 'Créer l\'événement'}
        </button>
      </div>
    </Modal>
  );
}

const styles = {
  fg: { marginBottom: 12 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 4 },
  input: { width: '100%', padding: '8px 11px', border: '1px solid var(--border-med)', borderRadius: 8, fontSize: 13, color: 'var(--text)', background: '#fff', fontFamily: 'var(--font)' },
  btnPri: { background: '#a32d2d', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font)' },
  btnSec: { background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--border-med)', borderRadius: 8, padding: '8px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' },
};
