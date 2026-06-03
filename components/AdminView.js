import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import Modal from './Modal';
import { LIEUX_FREQUENTS, AVATAR_COLORS } from '../data/config';

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

function initiales(prenom, nom) {
  return ((prenom?.[0] || '') + (nom?.[0] || '')).toUpperCase();
}
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
function totalHeures(missions) {
  return missions.reduce((s, m) => s + dureeH(m.debut, m.fin), 0);
}
function heuresEffectuees(missions) {
  const now = new Date().toISOString().slice(0, 10);
  return missions.filter(m => m.date < now || m.validated).reduce((s, m) => s + dureeH(m.debut, m.fin), 0);
}
function heuresAVenir(missions) {
  const now = new Date().toISOString().slice(0, 10);
  return missions.filter(m => m.date >= now && !m.validated).reduce((s, m) => s + dureeH(m.debut, m.fin), 0);
}
function fmtDate(ds) {
  const d = new Date(ds);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}.`;
}

export default function AdminView({ salaries, setSalaries, missions, setMissions, missionTypes }) {
  const [selected, setSelected] = useState(null);
  const [showAddSalarie, setShowAddSalarie] = useState(false);
  const [showAddMission, setShowAddMission] = useState(false);
  const [editSalarie, setEditSalarie] = useState(null);
  const [formS, setFormS] = useState({ prenom: '', nom: '', role: '', colorIdx: 0 });
  const [formM, setFormM] = useState({ nom: '', ref: '', date: '', debut: '08:00', fin: '17:00', type: 'dps', lieu: '', lieuCustom: '', note: '' });

  const salarie = salaries.find(s => s.id === selected);
  const missionsSalarie = missions
    .filter(m => m.salarieId === selected)
    .sort((a, b) => a.date.localeCompare(b.date));

  // --- Salarié ---
  function openAddSalarie() {
    setFormS({ prenom: '', nom: '', role: '', colorIdx: salaries.length % AVATAR_COLORS.length });
    setEditSalarie(null);
    setShowAddSalarie(true);
  }
  function openEditSalarie(s) {
    setFormS({ prenom: s.prenom, nom: s.nom, role: s.role, colorIdx: s.colorIdx });
    setEditSalarie(s.id);
    setShowAddSalarie(true);
  }
  function saveSalarie() {
    if (!formS.prenom.trim() || !formS.nom.trim()) return;
    if (editSalarie) {
      setSalaries(prev => prev.map(s => s.id === editSalarie ? { ...s, ...formS } : s));
    } else {
      const nouveau = { id: uuid(), ...formS };
      setSalaries(prev => [...prev, nouveau]);
      setSelected(nouveau.id);
    }
    setShowAddSalarie(false);
  }
  function deleteSalarie(id) {
    if (!confirm('Supprimer ce salarié et toutes ses missions ?')) return;
    setSalaries(prev => prev.filter(s => s.id !== id));
    setMissions(prev => prev.filter(m => m.salarieId !== id));
    if (selected === id) setSelected(null);
  }

  // --- Mission ---
  function openAddMission() {
    setFormM({ nom: '', ref: '', date: '', debut: '08:00', fin: '17:00', type: 'dps', lieu: '', lieuCustom: '', note: '' });
    setShowAddMission(true);
  }
  function saveMission() {
    if (!formM.date || !formM.debut || !formM.fin) return;
    const lieuFinal = formM.lieu === '__custom__' ? formM.lieuCustom : formM.lieu;
    setMissions(prev => [...prev, {
      id: uuid(),
      salarieId: selected,
      nom: formM.nom,
      ref: formM.ref,
      date: formM.date,
      debut: formM.debut,
      fin: formM.fin,
      type: formM.type,
      lieu: lieuFinal,
      note: formM.note,
    }]);
    setShowAddMission(false);
  }
  function deleteMission(id) {
    setMissions(prev => prev.filter(m => m.id !== id));
  }

  const s = styles;

  return (
    <div style={s.container}>
      {/* Liste salariés */}
      <div style={s.sidebar}>
        <div style={s.sidebarHeader}>
          <span style={s.sectionLabel}>Équipe</span>
          <button style={s.btnPrimary} onClick={openAddSalarie}>+ Ajouter</button>
        </div>
        {salaries.length === 0 && (
          <div style={s.emptyState}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>👤</div>
            <div style={{ color: 'var(--text-2)', fontSize: 13, textAlign: 'center' }}>
              Aucun salarié.<br />Commencez par en ajouter un.
            </div>
          </div>
        )}
        {salaries.map((sal, i) => {
          const c = AVATAR_COLORS[sal.colorIdx % AVATAR_COLORS.length];
          const h = totalHeures(missions.filter(m => m.salarieId === sal.id));
          return (
            <div
              key={sal.id}
              style={{ ...s.staffCard, ...(selected === sal.id ? s.staffCardActive : {}) }}
              onClick={() => setSelected(sal.id)}
            >
              <div style={{ ...s.avatar, background: c.bg, color: c.txt }}>
                {initiales(sal.prenom, sal.nom)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={s.staffName}>{sal.prenom} {sal.nom}</div>
                <div style={s.staffRole}>{sal.role || 'Rôle non défini'}</div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
                {fmtH(h)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Détail salarié */}
      <div style={s.detail}>
        {!salarie ? (
          <div style={s.emptyState}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ color: 'var(--text-2)', fontSize: 14 }}>
              {salaries.length === 0 ? 'Ajoutez votre premier salarié' : 'Sélectionnez un salarié'}
            </div>
          </div>
        ) : (
          <>
            {/* Header salarié */}
            <div style={s.detailHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  ...s.avatarLg,
                  background: AVATAR_COLORS[salarie.colorIdx % AVATAR_COLORS.length].bg,
                  color: AVATAR_COLORS[salarie.colorIdx % AVATAR_COLORS.length].txt,
                }}>
                  {initiales(salarie.prenom, salarie.nom)}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{salarie.prenom} {salarie.nom}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>{salarie.role || 'Rôle non défini'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={s.btnSecondary} onClick={() => openEditSalarie(salarie)}>✏️ Modifier</button>
                <button style={{ ...s.btnSecondary, color: 'var(--red)' }} onClick={() => deleteSalarie(salarie.id)}>🗑 Supprimer</button>
              </div>
            </div>

            {/* Stats */}
            <div style={s.statsRow}>
              {[
                { label: 'Missions planifiées', value: missionsSalarie.length },
                { label: 'Heures effectuées', value: fmtH(heuresEffectuees(missionsSalarie)) },
                { label: 'Heures à venir', value: fmtH(heuresAVenir(missionsSalarie)) },
              ].map(({ label, value }) => (
                <div key={label} style={s.statCard}>
                  <div style={s.statLabel}>{label}</div>
                  <div style={s.statValue}>{value}</div>
                </div>
              ))}
            </div>

            {/* Missions */}
            <div style={s.card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={s.sectionLabel}>Missions</span>
                <button style={s.btnPrimary} onClick={openAddMission}>+ Ajouter une mission</button>
              </div>
              {missionsSalarie.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: 13 }}>
                  Aucune mission planifiée pour ce salarié.
                </div>
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr>
                      {['Événement', 'Réf.', 'Date', 'Horaires', 'Type', 'Lieu', 'Durée', 'Note', ''].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {missionsSalarie.map(m => {
                      const mt = missionTypes[m.type] || missionTypes.autre || Object.values(missionTypes)[0];
                      return (
                        <tr key={m.id}>
                          <td style={s.td}><strong>{m.nom || '—'}</strong></td>
                          <td style={{ ...s.td, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)' }}>{m.ref || '—'}</td>
                          <td style={s.td}>{fmtDate(m.date)}</td>
                          <td style={{ ...s.td, fontFamily: 'var(--font-mono)', fontSize: 12, whiteSpace: 'nowrap' }}>{m.debut} – {m.fin}</td>
                          <td style={s.td}>
                            <span style={{ background: mt.bg, color: mt.color, fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 500, whiteSpace: 'nowrap' }}>
                              {mt.icon} {mt.label}
                            </span>
                          </td>
                          <td style={s.td}>{m.lieu}</td>
                          <td style={{ ...s.td, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmtH(dureeH(m.debut, m.fin))}</td>
                          <td style={{ ...s.td, color: 'var(--text-2)', fontStyle: 'italic', maxWidth: 180 }}>{m.note}</td>
                          <td style={s.td}>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                onClick={() => setMissions(prev => prev.map(x => x.id === m.id ? { ...x, validated: !x.validated } : x))}
                                style={{ background: m.validated ? '#eaf3de' : '#f8f6f2', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontSize: 12, padding: '3px 8px', color: m.validated ? '#3b6d11' : 'var(--text-3)', fontFamily: 'var(--font)' }}
                                title={m.validated ? 'Annuler validation' : 'Valider les heures'}
                              >{m.validated ? '✅ Validé' : '○ Valider'}</button>
                              <button
                                onClick={() => deleteMission(m.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 14 }}
                                title="Supprimer"
                              >🗑</button>
                            </div>
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

      {/* Modal ajout/édition salarié */}
      {showAddSalarie && (
        <Modal title={editSalarie ? 'Modifier le salarié' : 'Nouveau salarié'} onClose={() => setShowAddSalarie(false)}>
          <div style={s.formGrid}>
            <div style={s.formGroup}>
              <label style={s.label}>Prénom *</label>
              <input style={s.input} value={formS.prenom} onChange={e => setFormS(p => ({ ...p, prenom: e.target.value }))} placeholder="Prénom" />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Nom *</label>
              <input style={s.input} value={formS.nom} onChange={e => setFormS(p => ({ ...p, nom: e.target.value }))} placeholder="NOM" />
            </div>
          </div>
          <div style={s.formGroup}>
            <label style={s.label}>Rôle / Poste</label>
            <input style={s.input} value={formS.role} onChange={e => setFormS(p => ({ ...p, role: e.target.value }))} placeholder="Ex : Secouriste, Chef d'équipe, Administratif…" />
          </div>
          <div style={s.formGroup}>
            <label style={s.label}>Couleur de l'avatar</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {AVATAR_COLORS.map((c, i) => (
                <div
                  key={i}
                  onClick={() => setFormS(p => ({ ...p, colorIdx: i }))}
                  style={{
                    width: 32, height: 32, borderRadius: '50%', background: c.bg,
                    color: c.txt, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    border: formS.colorIdx === i ? `2px solid ${c.txt}` : '2px solid transparent',
                  }}
                >
                  {initiales(formS.prenom, formS.nom) || 'AB'}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button style={s.btnSecondary} onClick={() => setShowAddSalarie(false)}>Annuler</button>
            <button style={s.btnPrimary} onClick={saveSalarie}>
              {editSalarie ? 'Enregistrer' : 'Créer le salarié'}
            </button>
          </div>
        </Modal>
      )}

      {/* Modal ajout mission */}
      {showAddMission && salarie && (
        <Modal title={`Nouvelle mission — ${salarie.prenom} ${salarie.nom}`} onClose={() => setShowAddMission(false)}>
          <div style={s.formGrid}>
            <div style={s.formGroup}>
              <label style={s.label}>Nom de l&apos;événement</label>
              <input style={s.input} value={formM.nom} onChange={e => setFormM(p => ({ ...p, nom: e.target.value }))} placeholder="Ex : Bal des mamans" autoFocus />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Référence</label>
              <input style={s.input} value={formM.ref} onChange={e => setFormM(p => ({ ...p, ref: e.target.value }))} placeholder="Ex : DPS 218" />
            </div>
          </div>
          <div style={s.formGroup}>
            <label style={s.label}>Date *</label>
            <input style={s.input} type="date" value={formM.date} onChange={e => setFormM(p => ({ ...p, date: e.target.value }))} />
          </div>
          <div style={s.formGrid}>
            <div style={s.formGroup}>
              <label style={s.label}>Heure début *</label>
              <input style={s.input} type="time" value={formM.debut} onChange={e => setFormM(p => ({ ...p, debut: e.target.value }))} />
            </div>
            <div style={s.formGroup}>
              <label style={s.label}>Heure fin *</label>
              <input style={s.input} type="time" value={formM.fin} onChange={e => setFormM(p => ({ ...p, fin: e.target.value }))} />
            </div>
          </div>
          {formM.debut && formM.fin && (
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: -8, marginBottom: 8 }}>
              Durée : {fmtH(dureeH(formM.debut, formM.fin))}
            </div>
          )}
          <div style={s.formGroup}>
            <label style={s.label}>Type de mission</label>
            <select style={s.input} value={formM.type} onChange={e => setFormM(p => ({ ...p, type: e.target.value }))}>
              {Object.entries(missionTypes || {}).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </div>
          <div style={s.formGroup}>
            <label style={s.label}>Lieu</label>
            <select style={s.input} value={formM.lieu} onChange={e => setFormM(p => ({ ...p, lieu: e.target.value }))}>
              <option value="">— Sélectionner —</option>
              {LIEUX_FREQUENTS.map(l => <option key={l} value={l}>{l}</option>)}
              <option value="__custom__">Autre lieu…</option>
            </select>
            {formM.lieu === '__custom__' && (
              <input style={{ ...s.input, marginTop: 8 }} value={formM.lieuCustom} onChange={e => setFormM(p => ({ ...p, lieuCustom: e.target.value }))} placeholder="Saisir le lieu" />
            )}
          </div>
          <div style={s.formGroup}>
            <label style={s.label}>Note / Commentaire</label>
            <textarea
              style={{ ...s.input, minHeight: 72, resize: 'vertical' }}
              value={formM.note}
              onChange={e => setFormM(p => ({ ...p, note: e.target.value }))}
              placeholder="Instructions particulières, zone de déploiement…"
            />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
            <button style={s.btnSecondary} onClick={() => setShowAddMission(false)}>Annuler</button>
            <button style={s.btnPrimary} onClick={saveMission}>Ajouter la mission</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const styles = {
  container: { display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16, minHeight: 500 },
  sidebar: { display: 'flex', flexDirection: 'column', gap: 6 },
  sidebarHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  sectionLabel: { fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  staffCard: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
    borderRadius: 10, border: '1px solid var(--border)', cursor: 'pointer',
    background: '#fff', transition: 'all 0.12s',
  },
  staffCardActive: { borderColor: 'var(--red)', background: '#fff5f5' },
  avatar: { width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 },
  avatarLg: { width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, flexShrink: 0 },
  staffName: { fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  staffRole: { fontSize: 11, color: 'var(--text-2)' },
  detail: { background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: 20, minHeight: 400 },
  detailHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 },
  statCard: { background: '#f8f6f2', borderRadius: 10, padding: '10px 14px' },
  statLabel: { fontSize: 11, color: 'var(--text-2)', marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: 600, fontFamily: 'var(--font-mono)' },
  card: { background: '#fff', borderRadius: 12, border: '1px solid var(--border)', padding: 16 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--text-2)', padding: '6px 8px', borderBottom: '1px solid var(--border)' },
  td: { padding: '10px 8px', borderBottom: '1px solid var(--border)', color: 'var(--text)', verticalAlign: 'middle' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  formGroup: { marginBottom: 14 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 0 },
  label: { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 5 },
  input: { width: '100%', padding: '8px 11px', border: '1px solid var(--border-med)', borderRadius: 8, fontSize: 13, color: 'var(--text)', background: '#fff' },
  btnPrimary: { background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer' },
  btnSecondary: { background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--border-med)', borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer' },
};
