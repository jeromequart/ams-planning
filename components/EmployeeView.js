import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import { AVATAR_COLORS } from '../data/config';

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

function initiales(p, n) { return ((p?.[0]||'')+(n?.[0]||'')).toUpperCase(); }
function dureeH(debut, fin) {
  const [dh,dm]=debut.split(':').map(Number); const [fh,fm]=fin.split(':').map(Number);
  return (fh*60+fm-(dh*60+dm))/60;
}
function fmtH(h) {
  if(h<=0)return'0h'; const hh=Math.floor(h); const mm=Math.round((h-hh)*60);
  return mm?`${hh}h${String(mm).padStart(2,'0')}`:`${hh}h`;
}

export default function EmployeeView({ salaries, evenements, inscriptions, setInscriptions, missionTypes }) {
  const [sel, setSel] = useState(salaries[0]?.id || null);
  const salarie = salaries.find(s => s.id === sel) || salaries[0];
  const now = new Date().toISOString().slice(0,10);

  if (!salarie) return (
    <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text-2)' }}>
      <div style={{ fontSize:48, marginBottom:12 }}>👷</div>
      <div>Aucun salarié enregistré.</div>
    </div>
  );

  const mesInscriptions = inscriptions.filter(i => i.salarieId === salarie.id);
  const mesEvenementsIds = new Set(mesInscriptions.filter(i => i.statut === 'valide').map(i => i.evenementId));
  const mesEvenements = evenements.filter(e => mesEvenementsIds.has(e.id)).sort((a,b) => a.date.localeCompare(b.date));

  const hEffectuees = mesEvenements.filter(e => e.date < now).reduce((s,e) => s + dureeH(e.debut,e.fin), 0);
  const hAVenir = mesEvenements.filter(e => e.date >= now).reduce((s,e) => s + dureeH(e.debut,e.fin), 0);
  const prochaine = mesEvenements.find(e => e.date >= now);

  // Événements ouverts auxquels le salarié n'est pas encore inscrit
  const evOuverts = evenements.filter(e =>
    e.ouvert && e.date >= now &&
    !inscriptions.find(i => i.salarieId === salarie.id && i.evenementId === e.id)
  );

  function sInscrire(evId) {
    setInscriptions(prev => [...prev, { id: uuid(), evenementId: evId, salarieId: salarie.id, statut: 'en_attente', source: 'salarie' }]);
  }
  function seDesinscrire(inscId) {
    setInscriptions(prev => prev.filter(i => i.id !== inscId));
  }

  const c = AVATAR_COLORS[salarie.colorIdx % AVATAR_COLORS.length];
  const s = styles;

  return (
    <div>
      {/* Sélecteur */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <span style={{ fontSize:13, color:'var(--text-2)', flexShrink:0 }}>Je suis :</span>
        <select style={{ flex:1, maxWidth:280, padding:'9px 12px', border:'1px solid var(--border-med)', borderRadius:9, fontSize:13, background:'#fff', fontFamily:'var(--font)' }}
          value={sel||''} onChange={e => setSel(e.target.value)}>
          {salaries.map(s => <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>)}
        </select>
      </div>

      {/* Header */}
      <div style={s.card}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ ...s.avatar, background:c.bg, color:c.txt }}>{initiales(salarie.prenom, salarie.nom)}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:18, fontWeight:600 }}>{salarie.prenom} {salarie.nom}</div>
            <div style={{ fontSize:13, color:'var(--text-2)', marginTop:2 }}>{salarie.role || 'Salarié saisonnier'}</div>
          </div>
          {prochaine && (
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:2 }}>Prochaine mission</div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--red)' }}>
                {DAYS[new Date(prochaine.date).getDay()]} {new Date(prochaine.date).getDate()} {MONTHS[new Date(prochaine.date).getMonth()]}
              </div>
              <div style={{ fontSize:12, color:'var(--text-2)', fontFamily:'var(--font-mono)' }}>{prochaine.debut} – {prochaine.fin}</div>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={s.statsRow}>
        {[
          { label:'Heures effectuées', value:fmtH(hEffectuees), sub:'réalisées' },
          { label:'Heures à venir', value:fmtH(hAVenir), sub:'planifiées' },
          { label:'Missions à venir', value:mesEvenements.filter(e=>e.date>=now).length, sub:'planifiées' },
        ].map(({ label, value, sub }) => (
          <div key={label} style={s.statCard}>
            <div style={s.statLabel}>{label}</div>
            <div style={s.statValue}>{value}</div>
            <div style={{ fontSize:11, color:'var(--text-3)' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Mes missions */}
      <div style={s.card}>
        <div style={{ fontSize:11, fontWeight:600, marginBottom:16, color:'var(--text-2)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
          Mes missions
        </div>
        {mesEvenements.length === 0 ? (
          <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-3)', fontSize:13 }}>Aucune mission planifiée.</div>
        ) : (
          mesEvenements.map(e => {
            const mt = missionTypes[e.type] || Object.values(missionTypes)[0] || { label:e.type, icon:'📌', bg:'#f1efe8', color:'#5f5e5a' };
            const estPassee = e.date < now;
            const insc = inscriptions.find(i => i.evenementId === e.id && i.salarieId === salarie.id);
            const d = new Date(e.date);
            return (
              <div key={e.id} style={{ ...s.missionRow, opacity:estPassee ? 0.55 : 1 }}>
                <div style={s.dateCol}>
                  <div style={s.dayName}>{DAYS[d.getDay()]}</div>
                  <div style={s.dayNum}>{d.getDate()}</div>
                  <div style={s.monthName}>{MONTHS[d.getMonth()].slice(0,4)}.</div>
                </div>
                <div style={{ flex:1 }}>
                  {(e.nom||e.ref) && (
                    <div style={{ marginBottom:4 }}>
                      {e.nom && <span style={{ fontSize:13, fontWeight:600 }}>{e.nom}</span>}
                      {e.ref && <span style={{ fontSize:11, color:'var(--text-3)', marginLeft:8, fontFamily:'var(--font-mono)' }}>{e.ref}</span>}
                    </div>
                  )}
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                    <span style={{ background:mt.bg, color:mt.color, fontSize:11, padding:'3px 9px', borderRadius:20, fontWeight:500 }}>{mt.icon} {mt.label}</span>
                    {e.lieu && <span style={{ fontSize:12, color:'var(--text-2)' }}>📍 {e.lieu}</span>}
                    {estPassee && <span style={{ fontSize:10, color:'var(--text-3)', background:'#f1efe8', padding:'2px 7px', borderRadius:20 }}>Passée</span>}
                  </div>
                  <div style={{ fontSize:13, fontFamily:'var(--font-mono)', color:'var(--text)', marginBottom:e.note?4:0 }}>
                    🕐 {e.debut} – {e.fin} <span style={{ color:'var(--text-3)', fontFamily:'var(--font)', fontSize:12 }}>({fmtH(dureeH(e.debut,e.fin))})</span>
                  </div>
                  {e.note && <div style={{ fontSize:12, color:'var(--text-2)', fontStyle:'italic' }}>{e.note}</div>}
                </div>
                <div style={{ fontSize:14, fontWeight:600, fontFamily:'var(--font-mono)', color:'var(--text-2)', flexShrink:0 }}>
                  {fmtH(dureeH(e.debut,e.fin))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Inscriptions en attente */}
      {mesInscriptions.filter(i=>i.statut==='en_attente').length > 0 && (
        <div style={{ ...s.card, borderColor:'#f0d5a0', background:'#fffdf7' }}>
          <div style={{ fontSize:11, fontWeight:600, marginBottom:12, color:'#854f0b', textTransform:'uppercase', letterSpacing:'0.06em' }}>
            ⏳ En attente de validation
          </div>
          {mesInscriptions.filter(i=>i.statut==='en_attente').map(insc => {
            const ev = evenements.find(e => e.id === insc.evenementId);
            if (!ev) return null;
            const mt = missionTypes[ev.type] || {};
            return (
              <div key={insc.id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <span style={{ background:mt.bg, color:mt.color, fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500 }}>{mt.icon} {mt.label}</span>
                <span style={{ fontSize:13, flex:1 }}>{ev.nom || mt.label} — {new Date(ev.date).toLocaleDateString('fr-FR', {day:'numeric',month:'long'})}</span>
                <button onClick={() => seDesinscrire(insc.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', fontSize:12 }}>Annuler</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Événements ouverts */}
      {evOuverts.length > 0 && (
        <div style={s.card}>
          <div style={{ fontSize:11, fontWeight:600, marginBottom:12, color:'#3b6d11', textTransform:'uppercase', letterSpacing:'0.06em' }}>
            🔓 Événements ouverts aux inscriptions
          </div>
          {evOuverts.map(ev => {
            const mt = missionTypes[ev.type] || Object.values(missionTypes)[0] || { label:ev.type, icon:'📌', bg:'#f1efe8', color:'#5f5e5a' };
            const evInscrits = inscriptions.filter(i => i.evenementId === ev.id && i.statut === 'valide').length;
            const complet = evInscrits >= ev.effectif;
            return (
              <div key={ev.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500 }}>{ev.nom || mt.label} {ev.ref && <span style={{ fontSize:11, color:'var(--text-3)' }}>{ev.ref}</span>}</div>
                  <div style={{ fontSize:11, color:'var(--text-2)', marginTop:2 }}>
                    {new Date(ev.date).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})} · {ev.debut}–{ev.fin} · {evInscrits}/{ev.effectif} inscrits
                  </div>
                </div>
                <button
                  onClick={() => !complet && sInscrire(ev.id)}
                  disabled={complet}
                  style={{ background: complet ? '#f1efe8' : '#eaf3de', color: complet ? 'var(--text-3)' : '#3b6d11', border:'none', borderRadius:8, padding:'6px 12px', fontSize:12, cursor: complet ? 'not-allowed' : 'pointer', fontFamily:'var(--font)' }}
                >
                  {complet ? 'Complet' : "M'inscrire"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  card: { background:'#fff', borderRadius:14, border:'1px solid var(--border)', padding:'16px 20px', marginBottom:14 },
  avatar: { width:48, height:48, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:600, flexShrink:0 },
  statsRow: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 },
  statCard: { background:'#f8f6f2', borderRadius:10, padding:'12px 14px' },
  statLabel: { fontSize:11, color:'var(--text-2)', marginBottom:4 },
  statValue: { fontSize:22, fontWeight:600, fontFamily:'var(--font-mono)', marginBottom:2 },
  missionRow: { display:'flex', alignItems:'flex-start', gap:14, padding:'12px 0', borderBottom:'1px solid var(--border)' },
  dateCol: { flexShrink:0, width:44, textAlign:'center' },
  dayName: { fontSize:10, color:'var(--text-3)', textTransform:'uppercase', fontWeight:500 },
  dayNum: { fontSize:24, fontWeight:600, lineHeight:1.1, color:'var(--text)' },
  monthName: { fontSize:10, color:'var(--text-3)' },
};
