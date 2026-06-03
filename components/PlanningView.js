import { useState } from 'react';
import EventModal from './EventModal';
import { AVATAR_COLORS } from '../data/config';

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6);
const DAYS_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const CELL_H = 56;
const GRID_START = 6 * 60;
const GRID_END = 23 * 60;
const GRID_TOTAL = GRID_END - GRID_START;

function getMonday(date) {
  const d = new Date(date);
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(date, n) {
  const d = new Date(date); d.setDate(d.getDate() + n); return d;
}
function toMin(t) { const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function fmtH(h) {
  if (h <= 0) return '0h';
  const hh = Math.floor(h); const mm = Math.round((h - hh) * 60);
  return mm ? `${hh}h${String(mm).padStart(2, '0')}` : `${hh}h`;
}
function exportICS(ev, salaries, inscriptions) {
  const inscrits = inscriptions.filter(i => i.evenementId === ev.id && i.statut === 'valide')
    .map(i => salaries.find(s => s.id === i.salarieId)).filter(Boolean);
  const d = ev.date.replace(/-/g, '');
  const desc = [
    ev.ref ? `Réf : ${ev.ref}` : '',
    inscrits.length ? `Équipe : ${inscrits.map(s => `${s.prenom} ${s.nom}`).join(', ')}` : '',
    ev.note || '',
  ].filter(Boolean).join('\\n');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AMS Croix Blanche//FR',
    'BEGIN:VEVENT',
    `UID:${ev.id}@ams-planning`,
    `DTSTART:${d}T${ev.debut.replace(':', '')}00`,
    `DTEND:${d}T${ev.fin.replace(':', '')}00`,
    `SUMMARY:${ev.nom || ev.type}${ev.ref ? ` [${ev.ref}]` : ''}`,
    `LOCATION:${ev.lieu || ''}`,
    `DESCRIPTION:${desc}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = `${ev.nom || 'evenement'}.ics`; a.click();
}

export default function PlanningView({ salaries, evenements, addEvenement, updateEvenement, removeEvenement, inscriptions, addInscription, updateInscription, removeInscription, missionTypes }) {
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createDate, setCreateDate] = useState('');
  const [editEv, setEditEv] = useState(null);
  const [showInscriptions, setShowInscriptions] = useState(false);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayStr = new Date().toISOString().slice(0, 10);
  const evWeek = evenements.filter(e => {
    const d = new Date(e.date);
    return d >= weekStart && d < addDays(weekStart, 7);
  });

  const weekLabel = () => {
    const end = addDays(weekStart, 6);
    if (weekStart.getMonth() === end.getMonth())
      return `${weekStart.getDate()} – ${end.getDate()} ${MONTHS[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
    return `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()].slice(0,3)}. – ${end.getDate()} ${MONTHS[end.getMonth()].slice(0,3)}. ${weekStart.getFullYear()}`;
  };

  async function handleCreateEvent(ev) {
    if (editEv) { await updateEvenement(ev.id, ev); }
    else { await addEvenement(ev); }
    setEditEv(null);
  }
  async function deleteEvent(id) {
    if (!confirm('Supprimer cet événement et toutes ses inscriptions ?')) return;
    await removeEvenement(id);
    setSelected(null);
  }

  async function inscrireSalarie(evId, salarieId) {
    const exists = inscriptions.find(i => i.evenementId === evId && i.salarieId === salarieId);
    if (exists) return;
    await addInscription({ evenementId: evId, salarieId, statut: 'valide', source: 'admin' });
  }
  async function retirerSalarie(inscId) {
    await removeInscription(inscId);
  }
  async function validerInscription(inscId) {
    await updateInscription(inscId, 'valide');
  }
  async function refuserInscription(inscId) {
    await updateInscription(inscId, 'refuse');
  }

  function clickCell(dayStr, hourY) {
    const h = Math.floor(hourY / CELL_H) + 6;
    const debut = `${String(h).padStart(2,'0')}:00`;
    const fin = `${String(h+1).padStart(2,'0')}:00`;
    setCreateDate(dayStr);
    setShowCreate(true);
  }

  const selEv = evenements.find(e => e.id === selected);
  const selInscriptions = inscriptions.filter(i => i.evenementId === selected);
  const inscritsValides = selInscriptions.filter(i => i.statut === 'valide');
  const enAttente = selInscriptions.filter(i => i.statut === 'en_attente');

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={st.navBtn} onClick={() => setWeekStart(d => addDays(d, -7))}>‹</button>
          <button style={st.navBtn} onClick={() => setWeekStart(d => addDays(d, 7))}>›</button>
          <button style={st.todayBtn} onClick={() => setWeekStart(getMonday(new Date()))}>Aujourd'hui</button>
          <span style={{ fontSize: 14, fontWeight: 600, marginLeft: 8 }}>{weekLabel()}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {enAttente.length > 0 && (
            <button style={{ ...st.todayBtn, background: '#faeeda', color: '#854f0b', border: '1px solid #f0d5a0' }}
              onClick={() => setShowInscriptions(true)}>
              ⏳ {enAttente.length} inscription{enAttente.length > 1 ? 's' : ''} en attente
            </button>
          )}
          <button style={st.createBtn} onClick={() => { setCreateDate(''); setEditEv(null); setShowCreate(true); }}>
            + Nouvel événement
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 300px' : '1fr', gap: 16 }}>
        {/* Grille */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
          {/* En-têtes */}
          <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
            <div style={{ borderRight: '1px solid var(--border)' }} />
            {weekDays.map((d, i) => {
              const ds = d.toISOString().slice(0, 10);
              const isToday = ds === todayStr;
              return (
                <div key={i} style={{ padding: '10px 4px', textAlign: 'center', borderRight: i < 6 ? '1px solid var(--border)' : 'none', background: isToday ? '#fff5f5' : 'transparent' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 500 }}>{DAYS_LABELS[i]}</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: isToday ? '#a32d2d' : 'var(--text)', width: 30, height: 30, borderRadius: '50%', background: isToday ? '#fcebeb' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '2px auto 0' }}>{d.getDate()}</div>
                </div>
              );
            })}
          </div>

          {/* Corps */}
          <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(7, 1fr)', overflowY: 'auto', maxHeight: 580 }}>
            {/* Heures */}
            <div style={{ borderRight: '1px solid var(--border)' }}>
              {HOURS.map(h => (
                <div key={h} style={{ height: CELL_H, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 6, paddingTop: 3 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{h}h</span>
                </div>
              ))}
            </div>

            {/* Colonnes jours */}
            {weekDays.map((day, di) => {
              const ds = day.toISOString().slice(0, 10);
              const isToday = ds === todayStr;
              const dayEvs = evWeek.filter(e => e.date === ds);
              return (
                <div key={di} style={{ borderRight: di < 6 ? '1px solid var(--border)' : 'none', background: isToday ? '#fffaf9' : 'transparent', position: 'relative', cursor: 'pointer' }}
                  onClick={e => { if (e.target === e.currentTarget) clickCell(ds, e.nativeEvent.offsetY); }}>
                  {HOURS.map(h => (
                    <div key={h} style={{ height: CELL_H, borderBottom: '1px solid #f0ede6' }}
                      onClick={() => clickCell(ds, (h - 6) * CELL_H)} />
                  ))}
                  {dayEvs.map(ev => {
                    const mt = missionTypes[ev.type] || Object.values(missionTypes)[0] || { label: ev.type, icon: '📌', bg: '#f1efe8', color: '#5f5e5a' };
                    const evInscrits = inscriptions.filter(i => i.evenementId === ev.id && i.statut === 'valide');
                    const top = ((toMin(ev.debut) - GRID_START) / GRID_TOTAL) * (HOURS.length * CELL_H);
                    const height = Math.max(((toMin(ev.fin) - toMin(ev.debut)) / GRID_TOTAL) * (HOURS.length * CELL_H), 28);
                    const isSelected = selected === ev.id;
                    return (
                      <div key={ev.id} onClick={e => { e.stopPropagation(); setSelected(isSelected ? null : ev.id); }}
                        style={{ position: 'absolute', left: 3, right: 3, top, height, background: mt.bg, borderLeft: `3px solid ${mt.color}`, borderRadius: 6, padding: '3px 6px', cursor: 'pointer', overflow: 'hidden', boxShadow: isSelected ? `0 0 0 2px ${mt.color}` : '0 1px 3px rgba(0,0,0,0.08)', zIndex: 1 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: mt.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ev.nom || mt.label}
                        </div>
                        {height > 32 && (
                          <div style={{ fontSize: 10, color: mt.color, opacity: 0.75, marginTop: 1 }}>
                            {ev.debut}–{ev.fin} · {evInscrits.length}/{ev.effectif} 👤
                          </div>
                        )}
                        {ev.ouvert && <div style={{ position: 'absolute', top: 3, right: 4, fontSize: 9, color: mt.color, opacity: 0.7 }}>🔓</div>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Panneau détail événement */}
        {selEv && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: 16, alignSelf: 'start', position: 'sticky', top: 80 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{selEv.nom || '(sans nom)'}</div>
                {selEv.ref && <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{selEv.ref}</div>}
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-3)' }}>✕</button>
            </div>

            {/* Infos */}
            <div style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
              <div>📅 {new Date(selEv.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
              <div>🕐 {selEv.debut} – {selEv.fin}</div>
              {selEv.lieu && <div>📍 {selEv.lieu}</div>}
              {(() => { const mt = missionTypes[selEv.type] || {}; return <div><span style={{ background: mt.bg, color: mt.color, fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>{mt.icon} {mt.label}</span></div>; })()}
              {selEv.note && <div style={{ fontStyle: 'italic' }}>💬 {selEv.note}</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>👥 Effectif : {inscritsValides.length} / {selEv.effectif}</span>
                {selEv.ouvert && <span style={{ background: '#eaf3de', color: '#3b6d11', fontSize: 10, padding: '1px 6px', borderRadius: 10 }}>🔓 Ouvert</span>}
              </div>
            </div>

            {/* Équipe inscrite */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Équipe</div>
              {inscritsValides.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>Aucun salarié inscrit</div>
              ) : (
                inscritsValides.map(insc => {
                  const sal = salaries.find(s => s.id === insc.salarieId);
                  const c = sal ? AVATAR_COLORS[sal.colorIdx % AVATAR_COLORS.length] : AVATAR_COLORS[0];
                  return sal ? (
                    <div key={insc.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: c.bg, color: c.txt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                        {(sal.prenom[0] + sal.nom[0]).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 12, flex: 1 }}>{sal.prenom} {sal.nom}</span>
                      {insc.source === 'salarie' && <span style={{ fontSize: 10, color: '#185fa5', background: '#e6f1fb', padding: '1px 5px', borderRadius: 8 }}>auto-inscrit</span>}
                      <button onClick={() => retirerSalarie(insc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 13 }} title="Retirer">✕</button>
                    </div>
                  ) : null;
                })
              )}

              {/* Ajouter un salarié */}
              {inscritsValides.length < selEv.effectif && (
                <div style={{ marginTop: 8 }}>
                  <select
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border-med)', borderRadius: 8, fontSize: 12, fontFamily: 'var(--font)', background: '#fff' }}
                    value=""
                    onChange={e => { if (e.target.value) inscrireSalarie(selEv.id, e.target.value); e.target.value = ''; }}
                  >
                    <option value="">+ Inscrire un salarié…</option>
                    {salaries
                      .filter(s => !inscritsValides.find(i => i.salarieId === s.id))
                      .map(s => <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Demandes en attente */}
            {enAttente.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#854f0b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>⏳ En attente ({enAttente.length})</div>
                {enAttente.map(insc => {
                  const sal = salaries.find(s => s.id === insc.salarieId);
                  return sal ? (
                    <div key={insc.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, flex: 1 }}>{sal.prenom} {sal.nom}</span>
                      <button onClick={() => validerInscription(insc.id)} style={{ background: '#eaf3de', color: '#3b6d11', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>✓</button>
                      <button onClick={() => refuserInscription(insc.id)} style={{ background: '#fcebeb', color: '#a32d2d', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}>✗</button>
                    </div>
                  ) : null;
                })}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <button onClick={() => exportICS(selEv, salaries, inscriptions)} style={st.btnSec}>📅 Exporter .ics (Google Agenda)</button>
              <button onClick={() => { setEditEv(selEv); setShowCreate(true); }} style={st.btnSec}>✏️ Modifier l'événement</button>
              <button onClick={() => deleteEvent(selEv.id)} style={{ ...st.btnSec, color: '#a32d2d', borderColor: '#f5c6c6' }}>🗑 Supprimer</button>
            </div>
          </div>
        )}
      </div>

      {/* Récap semaine */}
      {evWeek.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Récap semaine — {evWeek.length} événement{evWeek.length > 1 ? 's' : ''}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...evWeek].sort((a, b) => a.date.localeCompare(b.date) || a.debut.localeCompare(b.debut)).map(ev => {
              const mt = missionTypes[ev.type] || Object.values(missionTypes)[0] || { label: ev.type, icon: '📌', bg: '#f1efe8', color: '#5f5e5a' };
              const evInscrits = inscriptions.filter(i => i.evenementId === ev.id && i.statut === 'valide');
              return (
                <div key={ev.id} onClick={() => setSelected(ev.id === selected ? null : ev.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 10, border: `1px solid ${selected === ev.id ? mt.color : 'var(--border)'}`, padding: '10px 14px', cursor: 'pointer' }}>
                  <div style={{ width: 3, height: 32, borderRadius: 4, background: mt.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{ev.nom || mt.label} {ev.ref && <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{ev.ref}</span>}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)' }}>
                      {new Date(ev.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · {ev.debut}–{ev.fin} · {evInscrits.length}/{ev.effectif} salarié{evInscrits.length > 1 ? 's' : ''}
                      {ev.ouvert && <span style={{ marginLeft: 6, color: '#3b6d11' }}>🔓</span>}
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); exportICS(ev, salaries, inscriptions); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }} title="Exporter .ics">📅</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal création/édition événement */}
      {showCreate && (
        <EventModal
          onClose={() => { setShowCreate(false); setEditEv(null); }}
          onSave={handleCreateEvent}
          missionTypes={missionTypes}
          initialDate={createDate}
          editEvent={editEv}
        />
      )}
    </div>
  );
}

const st = {
  navBtn: { background: '#fff', border: '1px solid var(--border-med)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18, color: 'var(--text-2)', fontFamily: 'var(--font)' },
  todayBtn: { background: '#fff', border: '1px solid var(--border-med)', borderRadius: 8, padding: '0 12px', height: 32, cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font)' },
  createBtn: { background: '#a32d2d', color: '#fff', border: 'none', borderRadius: 8, padding: '0 16px', height: 32, cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font)' },
  btnSec: { background: '#f8f6f2', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font)', color: 'var(--text)' },
};
