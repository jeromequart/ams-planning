import { MISSION_TYPES, AVATAR_COLORS } from '../data/config';

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

export default function EmployeeView({ salaries, missions }) {
  const [selectedId, setSelectedId] = useState_compat(salaries[0]?.id || null);

  const salarie = salaries.find(s => s.id === selectedId);
  const mesMissions = missions
    .filter(m => m.salarieId === selectedId)
    .sort((a, b) => a.date.localeCompare(b.date));

  const now = new Date().toISOString().slice(0, 10);
  const prochaine = mesMissions.find(m => m.date >= now);
  const total = totalHeures(mesMissions);
  const passees = mesMissions.filter(m => m.date < now).length;
  const aVenir = mesMissions.filter(m => m.date >= now).length;

  if (salaries.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-2)' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>👷</div>
        <div style={{ fontSize: 15 }}>Aucun salarié enregistré.</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>L'administrateur doit d'abord créer les fiches salariés.</div>
      </div>
    );
  }

  return (
    <div>
      {/* Sélecteur */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 13, color: 'var(--text-2)', flexShrink: 0 }}>Je suis :</span>
        <select
          style={{ flex: 1, maxWidth: 280, padding: '9px 12px', border: '1px solid var(--border-med)', borderRadius: 9, fontSize: 13, background: '#fff', color: 'var(--text)' }}
          value={selectedId || ''}
          onChange={e => setSelectedId_compat(e.target.value)}
        >
          {salaries.map(s => (
            <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>
          ))}
        </select>
      </div>

      {salarie && (
        <>
          {/* Header */}
          <div style={s.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                ...s.avatar,
                background: AVATAR_COLORS[salarie.colorIdx % AVATAR_COLORS.length].bg,
                color: AVATAR_COLORS[salarie.colorIdx % AVATAR_COLORS.length].txt,
              }}>
                {initiales(salarie.prenom, salarie.nom)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{salarie.prenom} {salarie.nom}</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>{salarie.role || 'Salarié saisonnier'}</div>
              </div>
              {prochaine && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>Prochaine mission</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)' }}>
                    {DAYS[new Date(prochaine.date).getDay()]} {new Date(prochaine.date).getDate()} {MONTHS[new Date(prochaine.date).getMonth()]}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
                    {prochaine.debut} – {prochaine.fin}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div style={s.statsRow}>
            {[
              { label: 'Heures totales', value: fmtH(total), sub: 'sur la saison' },
              { label: 'Missions à venir', value: aVenir, sub: 'planifiées' },
              { label: 'Missions passées', value: passees, sub: 'réalisées' },
            ].map(({ label, value, sub }) => (
              <div key={label} style={s.statCard}>
                <div style={s.statLabel}>{label}</div>
                <div style={s.statValue}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Planning */}
          <div style={s.card}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--text-2)', textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.06em' }}>
              Mes missions — saison 2025
            </div>
            {mesMissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-3)', fontSize: 13 }}>
                Aucune mission planifiée pour le moment.
              </div>
            ) : (
              mesMissions.map(m => {
                const mt = MISSION_TYPES[m.type] || MISSION_TYPES.autre;
                const d = new Date(m.date);
                const estPassee = m.date < now;
                const dur = dureeH(m.debut, m.fin);
                return (
                  <div key={m.id} style={{ ...s.missionRow, opacity: estPassee ? 0.55 : 1 }}>
                    {/* Date */}
                    <div style={s.dateCol}>
                      <div style={s.dayName}>{DAYS[d.getDay()]}</div>
                      <div style={s.dayNum}>{d.getDate()}</div>
                      <div style={s.monthName}>{MONTHS[d.getMonth()].slice(0, 4)}.</div>
                    </div>
                    {/* Contenu */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ background: mt.bg, color: mt.color, fontSize: 11, padding: '3px 9px', borderRadius: 20, fontWeight: 500 }}>
                          {mt.icon} {mt.label}
                        </span>
                        {m.lieu && <span style={{ fontSize: 12, color: 'var(--text-2)' }}>📍 {m.lieu}</span>}
                        {estPassee && <span style={{ fontSize: 10, color: 'var(--text-3)', background: '#f1efe8', padding: '2px 7px', borderRadius: 20 }}>Passée</span>}
                      </div>
                      <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text)', marginBottom: m.note ? 4 : 0 }}>
                        🕐 {m.debut} – {m.fin} <span style={{ color: 'var(--text-3)', fontFamily: 'var(--font)' }}>({fmtH(dur)})</span>
                      </div>
                      {m.note && <div style={{ fontSize: 12, color: 'var(--text-2)', fontStyle: 'italic' }}>{m.note}</div>}
                    </div>
                    {/* Durée */}
                    <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', flexShrink: 0 }}>
                      {fmtH(dur)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Petite astuce : useState ne peut pas être appelé conditionnellement,
// donc on encapsule la logique dans un composant interne
import { useState } from 'react';

function useState_compat(init) { return useState(init)[0]; }
let setSelectedId_compat;

// On réexporte en wrappant avec le vrai useState
export default function EmployeeViewWrapper(props) {
  const [selectedId, setSelectedId] = useState(props.salaries[0]?.id || null);
  setSelectedId_compat = setSelectedId;
  return <EmployeeViewInner {...props} selectedId={selectedId} />;
}

function EmployeeViewInner({ salaries, missions, selectedId }) {
  const [sel, setSel] = useState(selectedId);

  const salarie = salaries.find(s => s.id === sel) || salaries[0];
  const mesMissions = missions
    .filter(m => m.salarieId === (salarie?.id))
    .sort((a, b) => a.date.localeCompare(b.date));

  const now = new Date().toISOString().slice(0, 10);
  const prochaine = mesMissions.find(m => m.date >= now);
  const total = totalHeures(mesMissions);
  const passees = mesMissions.filter(m => m.date < now).length;
  const aVenir = mesMissions.filter(m => m.date >= now).length;

  if (salaries.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-2)' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>👷</div>
        <div>Aucun salarié enregistré.</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 13, color: 'var(--text-2)', flexShrink: 0 }}>Je suis :</span>
        <select
          style={{ flex: 1, maxWidth: 280, padding: '9px 12px', border: '1px solid var(--border-med)', borderRadius: 9, fontSize: 13, background: '#fff', color: 'var(--text)' }}
          value={sel || ''}
          onChange={e => setSel(e.target.value)}
        >
          {salaries.map(s => (
            <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>
          ))}
        </select>
      </div>

      {salarie && (
        <>
          <div style={s.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ ...s.avatar, background: AVATAR_COLORS[salarie.colorIdx % AVATAR_COLORS.length].bg, color: AVATAR_COLORS[salarie.colorIdx % AVATAR_COLORS.length].txt }}>
                {initiales(salarie.prenom, salarie.nom)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{salarie.prenom} {salarie.nom}</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>{salarie.role || 'Salarié saisonnier'}</div>
              </div>
              {prochaine && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>Prochaine mission</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)' }}>
                    {DAYS[new Date(prochaine.date).getDay()]} {new Date(prochaine.date).getDate()} {MONTHS[new Date(prochaine.date).getMonth()]}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>{prochaine.debut} – {prochaine.fin}</div>
                </div>
              )}
            </div>
          </div>

          <div style={s.statsRow}>
            {[
              { label: 'Heures totales', value: fmtH(total), sub: 'sur la saison' },
              { label: 'Missions à venir', value: aVenir, sub: 'planifiées' },
              { label: 'Missions passées', value: passees, sub: 'réalisées' },
            ].map(({ label, value, sub }) => (
              <div key={label} style={s.statCard}>
                <div style={s.statLabel}>{label}</div>
                <div style={s.statValue}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{sub}</div>
              </div>
            ))}
          </div>

          <div style={s.card}>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 16, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Mes missions — saison 2025
            </div>
            {mesMissions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-3)', fontSize: 13 }}>Aucune mission planifiée.</div>
            ) : (
              mesMissions.map(m => {
                const mt = MISSION_TYPES[m.type] || MISSION_TYPES.autre;
                const d = new Date(m.date);
                const estPassee = m.date < now;
                return (
                  <div key={m.id} style={{ ...s.missionRow, opacity: estPassee ? 0.55 : 1 }}>
                    <div style={s.dateCol}>
                      <div style={s.dayName}>{DAYS[d.getDay()]}</div>
                      <div style={s.dayNum}>{d.getDate()}</div>
                      <div style={s.monthName}>{MONTHS[d.getMonth()].slice(0, 4)}.</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ background: mt.bg, color: mt.color, fontSize: 11, padding: '3px 9px', borderRadius: 20, fontWeight: 500 }}>
                          {mt.icon} {mt.label}
                        </span>
                        {m.lieu && <span style={{ fontSize: 12, color: 'var(--text-2)' }}>📍 {m.lieu}</span>}
                        {estPassee && <span style={{ fontSize: 10, color: 'var(--text-3)', background: '#f1efe8', padding: '2px 7px', borderRadius: 20 }}>Passée</span>}
                      </div>
                      <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text)', marginBottom: m.note ? 4 : 0 }}>
                        🕐 {m.debut} – {m.fin} <span style={{ color: 'var(--text-3)', fontFamily: 'var(--font)', fontSize: 12 }}>({fmtH(dureeH(m.debut, m.fin))})</span>
                      </div>
                      {m.note && <div style={{ fontSize: 12, color: 'var(--text-2)', fontStyle: 'italic' }}>{m.note}</div>}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-2)', flexShrink: 0 }}>
                      {fmtH(dureeH(m.debut, m.fin))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

const s = {
  card: { background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: '16px 20px', marginBottom: 14 },
  avatar: { width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, flexShrink: 0 },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 },
  statCard: { background: '#f8f6f2', borderRadius: 10, padding: '12px 14px' },
  statLabel: { fontSize: 11, color: 'var(--text-2)', marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-mono)', marginBottom: 2 },
  missionRow: { display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--border)', transition: 'opacity 0.2s' },
  dateCol: { flexShrink: 0, width: 44, textAlign: 'center' },
  dayName: { fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', fontWeight: 500 },
  dayNum: { fontSize: 24, fontWeight: 600, lineHeight: 1.1, color: 'var(--text)' },
  monthName: { fontSize: 10, color: 'var(--text-3)' },
};
