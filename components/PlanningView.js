import { useState } from 'react';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6h à 21h
const DAYS_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function fmtH(h) {
  if (h <= 0) return '0h';
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return mm ? `${hh}h${String(mm).padStart(2, '0')}` : `${hh}h`;
}

function dureeH(debut, fin) {
  return (timeToMinutes(fin) - timeToMinutes(debut)) / 60;
}

function exportICS(mission, salarie) {
  const d = mission.date.replace(/-/g, '');
  const dstart = `${d}T${mission.debut.replace(':', '')}00`;
  const dend = `${d}T${mission.fin.replace(':', '')}00`;
  const nom = mission.nom ? `${mission.nom}` : mission.type;
  const ref = mission.ref ? ` [${mission.ref}]` : '';
  const lieu = mission.lieu || '';
  const desc = [
    salarie ? `Salarié : ${salarie.prenom} ${salarie.nom}` : '',
    mission.note ? `Note : ${mission.note}` : '',
  ].filter(Boolean).join('\\n');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AMS Croix Blanche//Planning//FR',
    'BEGIN:VEVENT',
    `UID:${mission.id}@ams-planning`,
    `DTSTART:${dstart}`,
    `DTEND:${dend}`,
    `SUMMARY:${nom}${ref}`,
    `LOCATION:${lieu}`,
    `DESCRIPTION:${desc}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mission-${mission.id}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

const AVATAR_COLORS = [
  { bg: '#fcebeb', txt: '#a32d2d' },
  { bg: '#e6f1fb', txt: '#185fa5' },
  { bg: '#eaf3de', txt: '#3b6d11' },
  { bg: '#faeeda', txt: '#854f0b' },
  { bg: '#eeedfe', txt: '#534ab7' },
  { bg: '#e1f5ee', txt: '#0f6e56' },
  { bg: '#fbeaf0', txt: '#993556' },
];

export default function PlanningView({ salaries, missions, missionTypes }) {
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [tooltip, setTooltip] = useState(null);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Missions de la semaine
  const missionsWeek = missions.filter(m => {
    const d = new Date(m.date);
    return d >= weekStart && d < addDays(weekStart, 7);
  });

  const prevWeek = () => setWeekStart(d => addDays(d, -7));
  const nextWeek = () => setWeekStart(d => addDays(d, 7));
  const today = () => setWeekStart(getMonday(new Date()));

  const weekLabel = () => {
    const end = addDays(weekStart, 6);
    if (weekStart.getMonth() === end.getMonth()) {
      return `${weekStart.getDate()} – ${end.getDate()} ${MONTHS[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
    }
    return `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()].slice(0,3)}. – ${end.getDate()} ${MONTHS[end.getMonth()].slice(0,3)}. ${weekStart.getFullYear()}`;
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const GRID_START = 6 * 60; // 6h00
  const GRID_END = 22 * 60;  // 22h00
  const GRID_TOTAL = GRID_END - GRID_START;

  return (
    <div>
      {/* Header navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={st.navBtn} onClick={prevWeek}>‹</button>
          <button style={st.navBtn} onClick={nextWeek}>›</button>
          <button style={st.todayBtn} onClick={today}>Aujourd'hui</button>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginLeft: 8 }}>{weekLabel()}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
          {missionsWeek.length} mission{missionsWeek.length > 1 ? 's' : ''} cette semaine
        </div>
      </div>

      {/* Grille calendrier */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
        {/* En-têtes jours */}
        <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ borderRight: '1px solid var(--border)' }} />
          {weekDays.map((d, i) => {
            const ds = d.toISOString().slice(0, 10);
            const isToday = ds === todayStr;
            return (
              <div key={i} style={{
                padding: '10px 6px', textAlign: 'center',
                borderRight: i < 6 ? '1px solid var(--border)' : 'none',
                background: isToday ? '#fff5f5' : 'transparent',
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 500 }}>{DAYS_LABELS[i]}</div>
                <div style={{
                  fontSize: 18, fontWeight: 600,
                  color: isToday ? 'var(--red)' : 'var(--text)',
                  width: 30, height: 30, borderRadius: '50%',
                  background: isToday ? '#fcebeb' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '2px auto 0',
                }}>{d.getDate()}</div>
              </div>
            );
          })}
        </div>

        {/* Corps grille */}
        <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(7, 1fr)', position: 'relative', overflowY: 'auto', maxHeight: 600 }}>
          {/* Colonne heures */}
          <div style={{ borderRight: '1px solid var(--border)' }}>
            {HOURS.map(h => (
              <div key={h} style={{ height: 56, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 6, paddingTop: 3 }}>
                <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{h}h</span>
              </div>
            ))}
          </div>

          {/* Colonnes jours */}
          {weekDays.map((day, dayIdx) => {
            const ds = day.toISOString().slice(0, 10);
            const isToday = ds === todayStr;
            const dayMissions = missionsWeek.filter(m => m.date === ds);

            return (
              <div key={dayIdx} style={{
                borderRight: dayIdx < 6 ? '1px solid var(--border)' : 'none',
                background: isToday ? '#fffaf9' : 'transparent',
                position: 'relative',
              }}>
                {/* Lignes heures */}
                {HOURS.map(h => (
                  <div key={h} style={{ height: 56, borderBottom: '1px solid #f0ede6' }} />
                ))}

                {/* Missions */}
                {dayMissions.map(m => {
                  const mt = missionTypes[m.type] || Object.values(missionTypes)[0] || { label: m.type, icon: '📌', bg: '#f1efe8', color: '#5f5e5a' };
                  const sal = salaries.find(s => s.id === m.salarieId);
                  const c = sal ? AVATAR_COLORS[sal.colorIdx % AVATAR_COLORS.length] : AVATAR_COLORS[0];
                  const startMin = timeToMinutes(m.debut) - GRID_START;
                  const durMin = timeToMinutes(m.fin) - timeToMinutes(m.debut);
                  const top = (startMin / GRID_TOTAL) * (HOURS.length * 56);
                  const height = Math.max((durMin / GRID_TOTAL) * (HOURS.length * 56), 24);

                  return (
                    <div
                      key={m.id}
                      onClick={() => setTooltip(tooltip?.id === m.id ? null : { ...m, _sal: sal, _mt: mt })}
                      style={{
                        position: 'absolute', left: 3, right: 3,
                        top: top, height: height,
                        background: mt.bg, borderLeft: `3px solid ${mt.color}`,
                        borderRadius: 6, padding: '3px 6px',
                        cursor: 'pointer', overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        zIndex: 1,
                      }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 600, color: mt.color, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.nom || mt.label}
                      </div>
                      {height > 32 && (
                        <div style={{ fontSize: 10, color: mt.color, opacity: 0.8, marginTop: 1 }}>
                          {m.debut}–{m.fin} · {sal ? `${sal.prenom} ${sal.nom[0]}.` : ''}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tooltip mission */}
      {tooltip && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 200,
          background: '#fff', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          padding: 20, maxWidth: 320, border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{tooltip.nom || tooltip._mt.label}</div>
              {tooltip.ref && <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{tooltip.ref}</div>}
            </div>
            <button onClick={() => setTooltip(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-3)' }}>✕</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
            <div><span style={{ color: 'var(--text-2)' }}>📅</span> {new Date(tooltip.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            <div><span style={{ color: 'var(--text-2)' }}>🕐</span> {tooltip.debut} – {tooltip.fin} <span style={{ color: 'var(--text-3)' }}>({fmtH(dureeH(tooltip.debut, tooltip.fin))})</span></div>
            {tooltip._sal && <div><span style={{ color: 'var(--text-2)' }}>👤</span> {tooltip._sal.prenom} {tooltip._sal.nom}</div>}
            {tooltip.lieu && <div><span style={{ color: 'var(--text-2)' }}>📍</span> {tooltip.lieu}</div>}
            <div>
              <span style={{ background: tooltip._mt.bg, color: tooltip._mt.color, fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>
                {tooltip._mt.icon} {tooltip._mt.label}
              </span>
            </div>
            {tooltip.note && <div style={{ fontStyle: 'italic', color: 'var(--text-2)', fontSize: 12 }}>{tooltip.note}</div>}
          </div>
          <button
            onClick={() => exportICS(tooltip, tooltip._sal)}
            style={{ marginTop: 14, width: '100%', padding: '8px', borderRadius: 8, border: '1px solid var(--border-med)', background: '#f8f6f2', fontSize: 12, cursor: 'pointer', color: 'var(--text-2)', fontFamily: 'var(--font)' }}
          >
            📅 Exporter vers Google Agenda (.ics)
          </button>
        </div>
      )}

      {/* Liste missions semaine */}
      {missionsWeek.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-3)', fontSize: 13, marginTop: 12 }}>
          Aucune mission cette semaine.
        </div>
      ) : (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Récap semaine
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...missionsWeek].sort((a, b) => a.date.localeCompare(b.date) || a.debut.localeCompare(b.debut)).map(m => {
              const mt = missionTypes[m.type] || Object.values(missionTypes)[0] || { label: m.type, icon: '📌', bg: '#f1efe8', color: '#5f5e5a' };
              const sal = salaries.find(s => s.id === m.salarieId);
              const dur = dureeH(m.debut, m.fin);
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 10, border: '1px solid var(--border)', padding: '10px 14px' }}>
                  <div style={{ width: 3, height: 32, borderRadius: 4, background: mt.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{m.nom || mt.label} {m.ref && <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{m.ref}</span>}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)' }}>
                      {new Date(m.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · {m.debut}–{m.fin} · {sal ? `${sal.prenom} ${sal.nom}` : '—'}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{fmtH(dur)}</div>
                  <button onClick={() => exportICS(m, sal)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4 }} title="Exporter .ics">📅</button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const st = {
  navBtn: { background: '#fff', border: '1px solid var(--border-med)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18, color: 'var(--text-2)', fontFamily: 'var(--font)' },
  todayBtn: { background: '#fff', border: '1px solid var(--border-med)', borderRadius: 8, padding: '0 12px', height: 32, cursor: 'pointer', fontSize: 12, color: 'var(--text)', fontFamily: 'var(--font)' },
};
