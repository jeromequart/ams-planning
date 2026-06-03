import { useState } from 'react';
import Modal from './Modal';

const ICONES_DISPO = [
  { val: '🚑', label: 'Ambulance' },
  { val: '⛑️', label: 'Casque secours' },
  { val: '🏥', label: 'Hôpital' },
  { val: '📋', label: 'Presse-papier' },
  { val: '📁', label: 'Dossier' },
  { val: '💼', label: 'Mallette' },
  { val: '🔧', label: 'Outil' },
  { val: '🧰', label: 'Boîte outils' },
  { val: '📦', label: 'Carton' },
  { val: '🧹', label: 'Balai' },
  { val: '🧽', label: 'Éponge' },
  { val: '🚿', label: 'Douche' },
  { val: '📚', label: 'Livres' },
  { val: '🎓', label: 'Diplôme' },
  { val: '📌', label: 'Punaise' },
  { val: '🚗', label: 'Voiture' },
  { val: '🚐', label: 'Minibus' },
  { val: '📡', label: 'Antenne' },
];

const COULEURS_DISPO = [
  { bg: '#fcebeb', color: '#a32d2d', label: 'Rouge' },
  { bg: '#e6f1fb', color: '#185fa5', label: 'Bleu' },
  { bg: '#eaf3de', color: '#3b6d11', label: 'Vert' },
  { bg: '#faeeda', color: '#854f0b', label: 'Orange' },
  { bg: '#eeedfe', color: '#534ab7', label: 'Violet' },
  { bg: '#e1f5ee', color: '#0f6e56', label: 'Turquoise' },
  { bg: '#fbeaf0', color: '#993556', label: 'Rose' },
  { bg: '#f1efe8', color: '#5f5e5a', label: 'Gris' },
];

const FORM_VIDE = { id: '', label: '', icon: '📌', bg: '#f1efe8', color: '#5f5e5a' };

export default function MissionsConfig({ missionTypes, saveMissionType, removeMissionType }) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(FORM_VIDE);
  const [editId, setEditId] = useState(null);
  const [erreur, setErreur] = useState('');

  function genId(label) {
    return label.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  function ouvrir(type = null) {
    if (type) {
      setForm({ id: type.id, label: type.label, icon: type.icon, bg: type.bg, color: type.color });
      setEditId(type.id);
    } else {
      setForm(FORM_VIDE);
      setEditId(null);
    }
    setErreur('');
    setShowModal(true);
  }

  async function sauvegarder() {
    if (!form.label.trim()) { setErreur('Le nom est obligatoire.'); return; }
    const id = editId || genId(form.label);
    if (!editId && missionTypes[id]) { setErreur('Ce nom existe déjà.'); return; }

    await saveMissionType(id, { label: form.label.trim(), icon: form.icon, bg: form.bg, color: form.color });
    setShowModal(false);
  }

  async function supprimer(id) {
    if (!confirm(`Supprimer le type "${missionTypes[id].label}" ?`)) return;
    await removeMissionType(id);
  }

  const couleurSelectionnee = COULEURS_DISPO.find(c => c.bg === form.bg) || COULEURS_DISPO[7];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Types de missions</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>Personnalisez les catégories de missions disponibles</div>
        </div>
        <button style={st.btnPrimary} onClick={() => ouvrir()}>+ Nouveau type</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
        {Object.entries(missionTypes).map(([id, m]) => (
          <div key={id} style={st.typeCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
              <span style={{ ...st.badge, background: m.bg, color: m.color }}>
                {m.icon} {m.label}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button style={st.iconBtn} onClick={() => ouvrir({ id, ...m })} title="Modifier">✏️</button>
              <button style={{ ...st.iconBtn, color: '#a32d2d' }} onClick={() => supprimer(id)} title="Supprimer">🗑</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <Modal title={editId ? 'Modifier le type' : 'Nouveau type de mission'} onClose={() => setShowModal(false)} width={440}>
          {/* Prévisualisation */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <span style={{ ...st.badge, background: form.bg, color: form.color, fontSize: 14, padding: '6px 16px' }}>
              {form.icon} {form.label || 'Aperçu'}
            </span>
          </div>

          {/* Nom */}
          <div style={st.formGroup}>
            <label style={st.label}>Nom de la mission *</label>
            <input
              style={st.input}
              value={form.label}
              onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
              placeholder="Ex : Transport matériel, Ronde sécurité…"
              autoFocus
            />
            {erreur && <div style={{ color: '#a32d2d', fontSize: 12, marginTop: 4 }}>{erreur}</div>}
          </div>

          {/* Icône */}
          <div style={st.formGroup}>
            <label style={st.label}>Icône</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {ICONES_DISPO.map(ic => (
                <button
                  key={ic.val}
                  onClick={() => setForm(p => ({ ...p, icon: ic.val }))}
                  title={ic.label}
                  style={{
                    width: 36, height: 36, borderRadius: 8, fontSize: 18,
                    border: form.icon === ic.val ? '2px solid #a32d2d' : '1px solid var(--border-med)',
                    background: form.icon === ic.val ? '#fff5f5' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  {ic.val}
                </button>
              ))}
            </div>
          </div>

          {/* Couleur */}
          <div style={st.formGroup}>
            <label style={st.label}>Couleur</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              {COULEURS_DISPO.map(c => (
                <button
                  key={c.bg}
                  onClick={() => setForm(p => ({ ...p, bg: c.bg, color: c.color }))}
                  title={c.label}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: c.bg,
                    border: form.bg === c.bg ? `3px solid ${c.color}` : '2px solid transparent',
                    cursor: 'pointer', outline: 'none',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
            <button style={st.btnSecondary} onClick={() => setShowModal(false)}>Annuler</button>
            <button style={st.btnPrimary} onClick={sauvegarder}>
              {editId ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const st = {
  typeCard: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: '#fff', gap: 8 },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '4px 10px', borderRadius: 20, fontWeight: 500 },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 4px', borderRadius: 6 },
  formGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 5 },
  input: { width: '100%', padding: '9px 12px', border: '1px solid var(--border-med)', borderRadius: 8, fontSize: 13, color: 'var(--text)', background: '#fff' },
  btnPrimary: { background: '#a32d2d', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' },
  btnSecondary: { background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--border-med)', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' },
};
