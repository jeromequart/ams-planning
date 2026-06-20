import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import * as db from '../lib/db';

const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const DAYS = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
const AVATAR_COLORS = [
  {bg:'#fcebeb',txt:'#a32d2d'},{bg:'#e6f1fb',txt:'#185fa5'},{bg:'#eaf3de',txt:'#3b6d11'},
  {bg:'#faeeda',txt:'#854f0b'},{bg:'#eeedfe',txt:'#534ab7'},{bg:'#e1f5ee',txt:'#0f6e56'},{bg:'#fbeaf0',txt:'#993556'},
];


function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function localNow() { return localDateStr(new Date()); }

function dureeH(d,f){const[dh,dm]=d.split(':').map(Number);const[fh,fm]=f.split(':').map(Number);return(fh*60+fm-(dh*60+dm))/60;}
function fmtH(h){if(h<=0)return'0h';const hh=Math.floor(h);const mm=Math.round((h-hh)*60);return mm?`${hh}h${String(mm).padStart(2,'0')}`:`${hh}h`;}
function initiales(p,n){return((p?.[0]||'')+(n?.[0]||'')).toUpperCase();}

export default function SalarieApp({ session, onLogout }) {
  const [salarie, setSalarie] = useState(null);
  const [evenements, setEvenements] = useState([]);
  const [inscriptions, setInscriptions] = useState([]);
  const [missionTypes, setMissionTypes] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('planning');
  const [calView, setCalView] = useState('semaine');
  const [currentDay, setCurrentDay] = useState(() => new Date());
  const [weekStart, setWeekStart] = useState(() => { const d=new Date(); const diff=d.getDay()===0?-6:1-d.getDay(); d.setDate(d.getDate()+diff); d.setHours(0,0,0,0); return d; });
  const [currentMonth, setCurrentMonth] = useState(() => { const d=new Date(); d.setDate(1); return d; });
  const [selectedEv, setSelectedEv] = useState(null);
  const detailRef = useRef(null);

  function selectEvent(ev) {
    setSelectedEv(prev => {
      const newVal = prev?.id === ev.id ? null : ev;
      if (newVal) {
        setTimeout(() => { detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
      }
      return newVal;
    });
  }

  const now = localNow();

  const loadData = useCallback(async () => {
    try {
      // Trouver le salarié lié à cet email
      const email = session.user.email;
      const { data: authData } = await supabase.from('salarie_auth').select('salarie_id').eq('email', email).single();
      
      const [sals, evs, inscs, mts] = await Promise.all([db.getSalaries(), db.getEvenements(), db.getInscriptions(), db.getMissionTypes()]);
      
      setEvenements(evs);
      setInscriptions(inscs);
      setMissionTypes(mts);
      
      if (authData) {
        const sal = sals.find(s => s.id === authData.salarie_id);
        setSalarie(sal || null);
      }
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [session]);

  useEffect(() => { loadData(); }, [loadData]);

  async function sInscrire(evId) {
    if (!salarie) return;
    await db.addInscription({ evenementId: evId, salarieId: salarie.id, statut: 'en_attente', source: 'salarie' });
    const inscs = await db.getInscriptions();
    setInscriptions(inscs);
  }
  async function seDesinscrire(inscId) {
    await db.deleteInscription(inscId);
    setInscriptions(p => p.filter(i => i.id !== inscId));
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#f8f6f2' }}>
      <div style={{ textAlign:'center', color:'#888' }}><div style={{ fontSize:32, marginBottom:8 }}>⏳</div>Chargement…</div>
    </div>
  );

  if (!salarie) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#f8f6f2', padding:20 }}>
      <div style={{ background:'#fff', borderRadius:16, padding:32, maxWidth:360, textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:12 }}>⚠️</div>
        <div style={{ fontSize:16, fontWeight:600, marginBottom:8 }}>Compte non lié</div>
        <div style={{ fontSize:13, color:'#888', marginBottom:20 }}>Votre compte n'est pas encore associé à une fiche salarié. Contactez l'administrateur.</div>
        <button onClick={onLogout} style={{ padding:'9px 20px', background:'#a32d2d', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13 }}>Déconnexion</button>
      </div>
    </div>
  );

  const mesInscriptions = inscriptions.filter(i => i.salarieId === salarie.id);
  const mesEvsValides = evenements.filter(e => mesInscriptions.find(i => i.evenementId === e.id && i.statut === 'valide')).sort((a,b)=>a.date.localeCompare(b.date));
  const mesEvsEnAttente = evenements.filter(e => mesInscriptions.find(i => i.evenementId === e.id && i.statut === 'en_attente'));
  const evOuverts = evenements.filter(e => e.date >= now && !mesInscriptions.find(i => i.evenementId === e.id));
  const hEffectuees = mesEvsValides.filter(e=>e.date<now).reduce((s,e)=>s+dureeH(e.debut,e.fin),0);
  const hAVenir = mesEvsValides.filter(e=>e.date>=now).reduce((s,e)=>s+dureeH(e.debut,e.fin),0);
  const prochaine = mesEvsValides.find(e=>e.date>=now);
  const c = AVATAR_COLORS[salarie.colorIdx % AVATAR_COLORS.length];

  return (
    <div style={{ minHeight:'100vh', background:'#f8f6f2', fontFamily:'var(--font)' }}>
      {/* Header mobile */}
      <header style={{ background:'#a32d2d', padding:'16px 20px', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <img src="/logo.jpg" style={{ width:32, height:32, borderRadius:'50%', objectFit:'cover', border:'1.5px solid rgba(255,255,255,0.4)' }} />
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'#fff' }}>{salarie.prenom} {salarie.nom}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.7)' }}>{salarie.role || 'Salarié saisonnier'}</div>
            </div>
          </div>
          <button onClick={onLogout} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8, padding:'6px 12px', fontSize:12, color:'#fff', cursor:'pointer' }}>
            Déconnexion
          </button>
        </div>
      </header>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, padding:'16px 16px 0' }}>
        {[
          { label:'Heures effectuées', value:fmtH(hEffectuees) },
          { label:'Heures à venir', value:fmtH(hAVenir) },
          { label:'Missions à venir', value:mesEvsValides.filter(e=>e.date>=now).length },
        ].map(({ label, value }) => (
          <div key={label} style={{ background:'#fff', borderRadius:12, padding:'12px 10px', textAlign:'center', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize:20, fontWeight:700, color:'#1a1a18' }}>{value}</div>
            <div style={{ fontSize:10, color:'#888', marginTop:2, lineHeight:1.3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Prochaine mission */}
      {prochaine && (
        <div style={{ margin:'12px 16px 0', background:'#a32d2d', borderRadius:14, padding:'14px 16px', color:'#fff' }}>
          <div style={{ fontSize:11, opacity:0.8, marginBottom:4 }}>Prochaine mission</div>
          <div style={{ fontSize:16, fontWeight:700 }}>{prochaine.nom || 'Mission planifiée'}</div>
          <div style={{ fontSize:13, opacity:0.9, marginTop:4 }}>
            {DAYS[new Date(prochaine.date + 'T12:00:00').getDay()]} {new Date(prochaine.date + 'T12:00:00').getDate()} {MONTHS[new Date(prochaine.date + 'T12:00:00').getMonth()]} · {prochaine.debut}–{prochaine.fin}
          </div>
          {prochaine.lieu && <div style={{ fontSize:12, opacity:0.8, marginTop:2 }}>📍 {prochaine.lieu}</div>}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, margin:'16px 16px 0', background:'#fff', borderRadius:12, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
        {[
          { key:'planning', label:`📋 Mon planning` },
          { key:'calendrier', label:'📅 Calendrier' },
          { key:'disponibles', label:`🔓 S'inscrire${evOuverts.length>0?` (${evOuverts.length})`:''}` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex:1, padding:'12px 8px', border:'none', fontSize:12, fontWeight:tab===key?600:400,
            background:tab===key?'#a32d2d':'transparent',
            color:tab===key?'#fff':'#888',
            cursor:'pointer', fontFamily:'var(--font)', transition:'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {/* Contenu */}
      <div style={{ padding:'12px 16px 32px' }}>


        {/* CALENDRIER */}
        {tab === 'calendrier' && (() => {
          const MONTHS_C = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
          const DAYS_C = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
          const todayS = localNow();
          const addD = (date,n) => { const d=new Date(date); d.setDate(d.getDate()+n); return d; };
          const toM = t => { const [h,m]=t.split(':').map(Number); return h*60+m; };
          const CELL = 44;
          const wDays = Array.from({length:7},(_,i)=>addD(weekStart,i));
          const wLabel = () => {
            const end=addD(weekStart,6);
            if(weekStart.getMonth()===end.getMonth()) return `${weekStart.getDate()} – ${end.getDate()} ${MONTHS_C[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
            return `${weekStart.getDate()} ${MONTHS_C[weekStart.getMonth()].slice(0,3)}. – ${end.getDate()} ${MONTHS_C[end.getMonth()].slice(0,3)}. ${weekStart.getFullYear()}`;
          };
          return (
            <div>
              {/* Toggle + nav */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ display:'flex', gap:3, background:'#f8f6f2', borderRadius:8, padding:3 }}>
                  {[{k:'jour',l:'Jour'},{k:'semaine',l:'Semaine'},{k:'mois',l:'Mois'}].map(({k,l})=>( 
                    <button key={k} onClick={()=>setCalView(k)} style={{ padding:'5px 12px', borderRadius:6, border:'none', fontSize:12, fontWeight:calView===k?600:400, background:calView===k?'#fff':'transparent', color:calView===k?'#1a1a18':'#888', cursor:'pointer' }}>{l}</button>
                  ))}
                </div>
                {calView==='semaine' && (
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <button onClick={()=>setWeekStart(d=>addD(d,-7))} style={{ background:'#fff', border:'1px solid #ddd', borderRadius:7, width:28, height:28, cursor:'pointer', fontSize:16 }}>‹</button>
                    <span style={{ fontSize:12, fontWeight:600 }}>{wLabel()}</span>
                    <button onClick={()=>setWeekStart(d=>addD(d,7))} style={{ background:'#fff', border:'1px solid #ddd', borderRadius:7, width:28, height:28, cursor:'pointer', fontSize:16 }}>›</button>
                  </div>
                )}
                {calView==='jour' && (
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <button onClick={()=>setCurrentDay(d=>{const n=new Date(d);n.setDate(n.getDate()-1);return n;})} style={{ background:'#fff', border:'1px solid #ddd', borderRadius:7, width:28, height:28, cursor:'pointer', fontSize:16 }}>‹</button>
                    <button onClick={()=>setCurrentDay(new Date())} style={{ background:'#fff', border:'1px solid #ddd', borderRadius:8, padding:'0 10px', height:28, cursor:'pointer', fontSize:11 }}>Auj.</button>
                    <span style={{ fontSize:13, fontWeight:600 }}>{['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'][(currentDay.getDay()+6)%7]} {currentDay.getDate()} {['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'][currentDay.getMonth()]} {currentDay.getFullYear()}</span>
                    <button onClick={()=>setCurrentDay(d=>{const n=new Date(d);n.setDate(n.getDate()+1);return n;})} style={{ background:'#fff', border:'1px solid #ddd', borderRadius:7, width:28, height:28, cursor:'pointer', fontSize:16 }}>›</button>
                  </div>
                )}
                {calView==='mois' && (
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <button onClick={()=>setCurrentMonth(new Date(currentMonth.getFullYear(),currentMonth.getMonth()-1,1))} style={{ background:'#fff', border:'1px solid #ddd', borderRadius:7, width:28, height:28, cursor:'pointer', fontSize:16 }}>‹</button>
                    <span style={{ fontSize:12, fontWeight:600 }}>{MONTHS_C[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
                    <button onClick={()=>setCurrentMonth(new Date(currentMonth.getFullYear(),currentMonth.getMonth()+1,1))} style={{ background:'#fff', border:'1px solid #ddd', borderRadius:7, width:28, height:28, cursor:'pointer', fontSize:16 }}>›</button>
                  </div>
                )}
              </div>

              {/* Jour */}
              {calView==='jour' && (() => {
                const todayS2 = localNow();
                const ds = localDateStr(currentDay);
                const isToday = ds === todayS2;
                const HOURS_DAY = Array.from({length:18},(_,i)=>i+6);
                const CELL_D = 56;
                const GSTART_D = 6*60;
                const GTOTAL_D = (24-6)*60;
                const toM2 = t => { const [h,m]=t.split(':').map(Number); return h*60+m; };
                const dayEvs = evenements.filter(e => e.date === ds).sort((a,b)=>a.debut.localeCompare(b.debut));
                const isMine2 = (ev) => !!mesEvsValides.find(e=>e.id===ev.id);
                return (
                  <>
                  <div style={{ background:'#fff', borderRadius:12, border:'1px solid #eee', overflow:'hidden' }}>
                    {/* Header jour */}
                    <div style={{ padding:'12px 16px', borderBottom:'1px solid #eee', display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:36, height:36, borderRadius:'50%', background:isToday?'#a32d2d':'#f8f6f2', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:700, color:isToday?'#fff':'#1a1a18' }}>
                        {currentDay.getDate()}
                      </div>
                      <div>
                        <div style={{ fontSize:14, fontWeight:600, color:'#1a1a18' }}>
                          {['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'][(currentDay.getDay()+6)%7]}
                        </div>
                        <div style={{ fontSize:12, color:'#888' }}>{dayEvs.length} événement{dayEvs.length>1?'s':''}</div>
                      </div>
                    </div>
                    {dayEvs.length === 0 ? (
                      <div style={{ textAlign:'center', padding:'48px 20px', color:'#bbb' }}>
                        <div style={{ fontSize:32, marginBottom:8 }}>📅</div>
                        <div style={{ fontSize:13 }}>Aucun événement ce jour</div>
                      </div>
                    ) : (
                      <div style={{ display:'grid', gridTemplateColumns:'44px 1fr', overflowY:'auto', maxHeight:520 }}>
                        {/* Heures */}
                        <div style={{ borderRight:'1px solid #eee' }}>
                          {HOURS_DAY.map(h=>(
                            <div key={h} style={{ height:CELL_D, borderBottom:'1px solid #f5f5f5', display:'flex', alignItems:'flex-start', justifyContent:'flex-end', paddingRight:6, paddingTop:3 }}>
                              <span style={{ fontSize:10, color:'#bbb' }}>{h}h</span>
                            </div>
                          ))}
                        </div>
                        {/* Colonne events */}
                        <div style={{ position:'relative' }}>
                          {HOURS_DAY.map(h=><div key={h} style={{ height:CELL_D, borderBottom:'1px solid #f8f6f2' }}/>)}
                          {dayEvs.map((ev, evIdx) => {
                            const mt = missionTypes[ev.type]||Object.values(missionTypes)[0]||{label:ev.type,icon:'📌',bg:'#f1efe8',color:'#5f5e5a'};
                            const top = ((toM2(ev.debut)-GSTART_D)/GTOTAL_D)*(HOURS_DAY.length*CELL_D);
                            const h = Math.max(((toM2(ev.fin)-toM2(ev.debut))/GTOTAL_D)*(HOURS_DAY.length*CELL_D), 40);
                            const isMine = isMine2(ev);
                            const overlap = dayEvs.slice(0,evIdx).filter(prev => {
                              const pt = ((toM2(prev.debut)-GSTART_D)/GTOTAL_D)*(HOURS_DAY.length*CELL_D);
                              const ph = Math.max(((toM2(prev.fin)-toM2(prev.debut))/GTOTAL_D)*(HOURS_DAY.length*CELL_D),40);
                              return top < pt+ph && top+h > pt;
                            }).length;
                            const colCount = overlap + 1;
                            const colWidth = `${Math.floor(98/colCount)}%`;
                            const colLeft = `${overlap * Math.floor(98/colCount)}%`;
                            return (
                              <div key={ev.id} onClick={()=>selectEvent(ev)}
                                style={{ position:'absolute', left:colLeft, width:colWidth, top, height:h,
                                  background:'#fff', borderLeft:`4px solid ${mt.color}`,
                                  borderRadius:6, padding:'5px 8px', cursor:'pointer',
                                  boxShadow:'0 1px 4px rgba(0,0,0,0.1)',
                                  opacity: isMine?1:0.75, zIndex:1+evIdx,
                                  borderTop:`1px solid ${mt.color}22`,
                                  borderRight:`1px solid ${mt.color}22`,
                                  borderBottom:`1px solid ${mt.color}22`,
                                }}>
                                <div style={{ fontSize:11, fontWeight:700, color:mt.color, marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.nom||mt.label}</div>
                                <div style={{ fontSize:11, color:'#555' }}>{ev.debut} – {ev.fin}</div>
                                {h>60 && ev.lieu && <div style={{ fontSize:10, color:'#888', marginTop:2 }}>📍 {ev.lieu}</div>}
                                {h>80 && ev.note && <div style={{ fontSize:10, color:'#888', fontStyle:'italic', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>💬 {ev.note}</div>}
                                {isMine && <div style={{ position:'absolute', top:4, right:6, fontSize:9, background:mt.color, color:'#fff', borderRadius:10, padding:'1px 5px' }}>✓ inscrit</div>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Liste du jour sous le calendrier */}
                  {dayEvs.length > 0 && (
                    <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:8 }}>
                      <div style={{ fontSize:11, fontWeight:600, color:'#aaa', textTransform:'uppercase', letterSpacing:'0.05em', padding:'0 2px' }}>
                        Programme du jour
                      </div>
                      {dayEvs.map(ev => {
                        const mt = missionTypes[ev.type]||Object.values(missionTypes)[0]||{label:ev.type,icon:'📌',bg:'#f1efe8',color:'#5f5e5a'};
                        const isMine = isMine2(ev);
                        const isEnAttente = !!mesInscriptions.find(i=>i.evenementId===ev.id&&i.statut==='en_attente');
                        return (
                          <div key={ev.id} onClick={()=>selectEvent(ev)}
                            style={{ display:'flex', alignItems:'stretch', background:'#fff', borderRadius:10, border:`1px solid ${selectedEv?.id===ev.id?mt.color:'#eee'}`, cursor:'pointer', overflow:'hidden', boxShadow: selectedEv?.id===ev.id ? `0 0 0 2px ${mt.color}33` : '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <div style={{ width:64, flexShrink:0, background:'#fafaf8', borderRight:`3px solid ${mt.color}`, padding:'10px 6px', textAlign:'center', display:'flex', flexDirection:'column', justifyContent:'center' }}>
                              <div style={{ fontSize:13, fontWeight:700 }}>{ev.debut}</div>
                              <div style={{ fontSize:10, color:'#bbb' }}>↓</div>
                              <div style={{ fontSize:12, color:'#888' }}>{ev.fin}</div>
                            </div>
                            <div style={{ flex:1, padding:'10px 12px', minWidth:0 }}>
                              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
                                <div style={{ fontSize:13, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ev.nom||mt.label}</div>
                                {isMine && <span style={{ fontSize:9, background:mt.color, color:'#fff', borderRadius:10, padding:'2px 7px', flexShrink:0, fontWeight:600 }}>✓ inscrit</span>}
                                {!isMine && isEnAttente && <span style={{ fontSize:9, background:'#FAEEDA', color:'#854F0B', borderRadius:10, padding:'2px 7px', flexShrink:0, fontWeight:600 }}>⏳</span>}
                              </div>
                              <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginTop:5 }}>
                                <span style={{ background:mt.bg, color:mt.color, fontSize:10, padding:'2px 7px', borderRadius:20, fontWeight:600 }}>{mt.icon} {mt.label}</span>
                                {ev.lieu && <span style={{ fontSize:11, color:'#888' }}>📍 {ev.lieu}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}


              {/* Semaine */}
              {calView==='semaine' && (
                <div style={{ background:'#fff', borderRadius:12, border:'1px solid #eee', overflow:'hidden' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'36px repeat(7,1fr)', borderBottom:'1px solid #eee' }}>
                    <div/>
                    {wDays.map((d,i)=>{
                      const ds=localDateStr(d); const isT=ds===todayS;
                      return <div key={i} style={{ padding:'7px 2px', textAlign:'center', borderRight:i<6?'1px solid #eee':'none', background:isT?'#fff5f5':'transparent' }}>
                        <div style={{ fontSize:9, color:'#bbb', textTransform:'uppercase', fontWeight:500 }}>{DAYS_C[i]}</div>
                        <div style={{ fontSize:14, fontWeight:600, color:isT?'#a32d2d':'#1a1a18', width:22, height:22, borderRadius:'50%', background:isT?'#fcebeb':'transparent', display:'flex', alignItems:'center', justifyContent:'center', margin:'2px auto 0' }}>{d.getDate()}</div>
                      </div>;
                    })}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'36px repeat(7,1fr)', overflowY:'auto', maxHeight:400 }}>
                    <div style={{ borderRight:'1px solid #eee' }}>
                      {Array.from({length:16},(_,i)=>i+6).map(h=>(
                        <div key={h} style={{ height:CELL, borderBottom:'1px solid #f5f5f5', display:'flex', alignItems:'flex-start', justifyContent:'flex-end', paddingRight:3, paddingTop:2 }}>
                          <span style={{ fontSize:9, color:'#ccc' }}>{h}h</span>
                        </div>
                      ))}
                    </div>
                    {wDays.map((day,di)=>{
                      const ds=localDateStr(day); const isT=ds===todayS;
                      const dayEvs=evenements.filter(e=>e.date===ds);
                      return <div key={di} style={{ borderRight:di<6?'1px solid #eee':'none', background:isT?'#fffaf9':'transparent', position:'relative' }}>
                        {Array.from({length:16},(_,i)=>i+6).map(h=><div key={h} style={{ height:CELL, borderBottom:'1px solid #f8f6f2' }}/>)}
                        {dayEvs.map((ev,evIdx)=>{
                          const mt=missionTypes[ev.type]||Object.values(missionTypes)[0]||{label:ev.type,icon:'📌',bg:'#f1efe8',color:'#5f5e5a'};
                          const GSTART=6*60; const GTOTAL=(22-6)*60;
                          const top=((toM(ev.debut)-GSTART)/GTOTAL)*(16*CELL);
                          const height=Math.max(((toM(ev.fin)-toM(ev.debut))/GTOTAL)*(16*CELL),20);
                          const isMine=!!mesEvsValides.find(e=>e.id===ev.id);
                          return <div key={ev.id} onClick={()=>selectEvent(ev)}
                            style={{ position:'absolute', left: 2 + (evIdx % 3) * 8, right: 2, top: top + (evIdx % 3) * 2, height, background:'#fff', borderLeft:`3px solid ${mt.color}`, borderRadius:4, padding:'2px 5px', cursor:'pointer', overflow:'hidden', opacity:isMine?1:0.85, zIndex: 1 + evIdx, boxShadow:'0 1px 3px rgba(0,0,0,0.12)' }}>
                            <div style={{ fontSize:9, fontWeight:700, color:mt.color, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontWeight:700 }}>{ev.nom||mt.label}</div>
                            {height>26&&<div style={{ fontSize:9, color:'#555' }}>{ev.debut}–{ev.fin}</div>}
                          </div>;
                        })}
                      </div>;
                    })}
                  </div>
                </div>
              )}

              {/* Mois */}
              {calView==='mois' && (() => {
                const yr=currentMonth.getFullYear(); const mo=currentMonth.getMonth();
                const first=new Date(yr,mo,1); const last=new Date(yr,mo+1,0);
                const offset=(first.getDay()+6)%7;
                const total=Math.ceil((offset+last.getDate())/7)*7;
                const cells=Array.from({length:total},(_,i)=>new Date(yr,mo,i-offset+1));
                const evMo=evenements.filter(e=>{const d=new Date(e.date);return d.getFullYear()===yr&&d.getMonth()===mo;});
                return <div style={{ background:'#fff', borderRadius:12, border:'1px solid #eee', overflow:'hidden' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid #eee' }}>
                    {DAYS_C.map(d=><div key={d} style={{ padding:'7px 0', textAlign:'center', fontSize:9, fontWeight:600, color:'#bbb', textTransform:'uppercase' }}>{d}</div>)}
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
                    {cells.map((d,i)=>{
                      const ds=localDateStr(d);
                      const isCur=d.getMonth()===mo; const isT=ds===todayS;
                      const dayEvs=evMo.filter(e=>e.date===ds);
                      return <div key={i} style={{ minHeight:72, padding:'3px 2px', borderRight:i%7<6?'1px solid #eee':'none', borderBottom:i<total-7?'1px solid #eee':'none', background:isT?'#fffaf9':!isCur?'#fafaf8':'#fff' }}>
                        <div style={{ width:20, height:20, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:isT?700:400, background:isT?'#a32d2d':'transparent', color:isT?'#fff':!isCur?'#ccc':'#1a1a18', marginBottom:2 }}>{d.getDate()}</div>
                        {dayEvs.slice(0,2).map(ev=>{
                          const mt=missionTypes[ev.type]||Object.values(missionTypes)[0]||{label:ev.type,icon:'📌',bg:'#f1efe8',color:'#5f5e5a'};
                          const isMine=!!mesEvsValides.find(e=>e.id===ev.id);
                          return <div key={ev.id} onClick={()=>selectEvent(ev)}
                            style={{ background:'#fff', borderLeft:`3px solid ${mt.color}`, borderRadius:3, padding:'1px 3px', marginBottom:2, cursor:'pointer', opacity:isMine?1:0.75 }}>
                            <div style={{ fontSize:9, fontWeight:600, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontWeight:700 }}>{ev.debut?.slice(0,5)} {ev.nom||mt.label}</div>
                          </div>;
                        })}
                        {dayEvs.length>2&&<div style={{ fontSize:9, color:'#bbb' }}>+{dayEvs.length-2}</div>}
                      </div>;
                    })}
                  </div>
                </div>;
              })()}

              {/* Détail événement */}
              {selectedEv && (() => {
                const mt = missionTypes[selectedEv.type]||Object.values(missionTypes)[0]||{label:selectedEv.type,icon:'📌',bg:'#f1efe8',color:'#5f5e5a'};
                const isMine = !!mesEvsValides.find(e=>e.id===selectedEv.id);
                const isEnAttente = !!mesInscriptions.find(i=>i.evenementId===selectedEv.id&&i.statut==='en_attente');
                return (
                  <div ref={detailRef} style={{ background:'#fff', borderRadius:14, border:`2px solid ${mt.color}33`, marginTop:12, overflow:'hidden', boxShadow:'0 4px 20px rgba(0,0,0,0.1)', scrollMarginTop:80 }}>
                    <div style={{ background:mt.color, padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ fontSize:24 }}>{mt.icon}</span>
                        <div>
                          <div style={{ fontSize:16, fontWeight:700, color:'#fff' }}>{selectedEv.nom||'(sans nom)'}</div>
                          {selectedEv.ref&&<div style={{ fontSize:11, color:'rgba(255,255,255,0.75)', fontFamily:'monospace' }}>{selectedEv.ref}</div>}
                        </div>
                      </div>
                      <button onClick={()=>setSelectedEv(null)} style={{ background:'rgba(255,255,255,0.2)', border:'none', borderRadius:8, width:30, height:30, cursor:'pointer', fontSize:18, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                    </div>
                    <div style={{ padding:'14px 16px' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                        <div style={{ background:'#f8f8f8', borderRadius:8, padding:'10px 12px' }}>
                          <div style={{ fontSize:10, color:'#aaa', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.04em' }}>Date</div>
                          <div style={{ fontSize:13, fontWeight:600 }}>{new Date(selectedEv.date+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</div>
                        </div>
                        <div style={{ background:'#f8f8f8', borderRadius:8, padding:'10px 12px' }}>
                          <div style={{ fontSize:10, color:'#aaa', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.04em' }}>Horaires</div>
                          <div style={{ fontSize:13, fontWeight:600 }}>{selectedEv.debut} – {selectedEv.fin} <span style={{ fontSize:11, color:'#888', fontWeight:400 }}>({fmtH(dureeH(selectedEv.debut,selectedEv.fin))})</span></div>
                        </div>
                        {selectedEv.lieu&&<div style={{ background:'#f8f8f8', borderRadius:8, padding:'10px 12px', gridColumn:'span 2' }}>
                          <div style={{ fontSize:10, color:'#aaa', marginBottom:3, textTransform:'uppercase', letterSpacing:'0.04em' }}>Lieu</div>
                          <div style={{ fontSize:13, fontWeight:600 }}>📍 {selectedEv.lieu}</div>
                        </div>}
                      </div>
                      {(selectedEv.tenue||selectedEv.repas!==undefined||selectedEv.heureDepart)&&(
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                          {selectedEv.tenue&&<span style={{ fontSize:11, padding:'4px 10px', borderRadius:20, background:selectedEv.tenue==='bleue'?'#e6f1fb':'#f0f0f0', color:selectedEv.tenue==='bleue'?'#185fa5':'#555', fontWeight:500 }}>👕 Tenue {selectedEv.tenue}</span>}
                          {selectedEv.repas?<span style={{ fontSize:11, padding:'4px 10px', borderRadius:20, background:'#eaf3de', color:'#3b6d11', fontWeight:500 }}>🍽️ Repas pris en charge</span>:<span style={{ fontSize:11, padding:'4px 10px', borderRadius:20, background:'#f0f0f0', color:'#888', fontWeight:500 }}>🍽️ Repas non inclus</span>}
                          {selectedEv.heureDepart&&<span style={{ fontSize:11, padding:'4px 10px', borderRadius:20, background:selectedEv.arriveeSurPlace?'#faeeda':'#f0f0f0', color:selectedEv.arriveeSurPlace?'#854f0b':'#555', fontWeight:500 }}>🕐 {selectedEv.arriveeSurPlace?'Arrivée sur place':'Départ bureau'} : {selectedEv.heureDepart}{selectedEv.arriveeSurPlace?' ⚠️':''}</span>}
                        </div>
                      )}
                      {selectedEv.note&&<div style={{ background:'#fffdf7', border:'1px solid #f0d5a0', borderRadius:8, padding:'10px 12px', marginBottom:12, fontSize:13, color:'#555', fontStyle:'italic' }}>💬 {selectedEv.note}</div>}
                      <div>
                        {isMine?(
                          <div style={{ background:'#eaf3de', color:'#3b6d11', fontSize:13, fontWeight:600, padding:'12px 16px', borderRadius:10, textAlign:'center' }}>✅ Tu es inscrit à cette mission</div>
                        ):isEnAttente?(
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#fffdf7', border:'1px solid #f0d5a0', padding:'12px 16px', borderRadius:10 }}>
                            <span style={{ fontSize:13, color:'#854f0b', fontWeight:500 }}>⏳ Demande en attente de validation</span>
                            <button onClick={()=>{const i=mesInscriptions.find(i=>i.evenementId===selectedEv.id&&i.statut==='en_attente');if(i)seDesinscrire(i.id);}} style={{ fontSize:11, color:'#888', background:'none', border:'1px solid #ddd', borderRadius:6, padding:'4px 10px', cursor:'pointer' }}>Annuler</button>
                          </div>
                        ):(
                          <button onClick={()=>sInscrire(selectedEv.id)}
                            style={{ width:'100%', background:mt.color, color:'#fff', border:'none', borderRadius:10, padding:'14px', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                            ✋ M'inscrire à cette mission
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* MON PLANNING */}
        {tab === 'planning' && (
          <div>
            {/* En attente */}
            {mesEvsEnAttente.length > 0 && (
              <div style={{ background:'#fffdf7', border:'1px solid #f0d5a0', borderRadius:12, padding:'12px 14px', marginBottom:12 }}>
                <div style={{ fontSize:11, fontWeight:600, color:'#854f0b', marginBottom:8 }}>⏳ En attente de validation ({mesEvsEnAttente.length})</div>
                {mesEvsEnAttente.map(ev => {
                  const insc = mesInscriptions.find(i => i.evenementId === ev.id && i.statut === 'en_attente');
                  const mt = missionTypes[ev.type] || {};
                  return (
                    <div key={ev.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                      <div>
                        <span style={{ fontSize:13, fontWeight:500 }}>{ev.nom || mt.label}</span>
                        <span style={{ fontSize:11, color:'#888', marginLeft:8 }}>{new Date(ev.date + 'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}</span>
                      </div>
                      <button onClick={() => insc && seDesinscrire(insc.id)} style={{ background:'none', border:'none', color:'#888', cursor:'pointer', fontSize:12 }}>Annuler</button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Missions validées */}
            {mesEvsValides.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 20px', color:'#aaa' }}>
                <div style={{ fontSize:36, marginBottom:8 }}>📋</div>
                <div>Aucune mission planifiée</div>
              </div>
            ) : (
              mesEvsValides.map(ev => {
                const mt = missionTypes[ev.type] || Object.values(missionTypes)[0] || { label:ev.type, icon:'📌', bg:'#f1efe8', color:'#5f5e5a' };
                const estPassee = ev.date < now;
                const d = new Date(ev.date);
                return (
                  <div key={ev.id} style={{ background:'#fff', borderRadius:14, padding:'14px 16px', marginBottom:10, boxShadow:'0 1px 3px rgba(0,0,0,0.06)', opacity:estPassee?0.6:1, borderLeft:`4px solid ${mt.color}` }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                      <div style={{ flex:1 }}>
                        {ev.nom && <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>{ev.nom}</div>}
                        {ev.ref && <div style={{ fontSize:11, color:'#888', fontFamily:'var(--font-mono)', marginBottom:6 }}>{ev.ref}</div>}
                        <span style={{ background:mt.color, color:'#fff', fontSize:11, padding:'3px 9px', borderRadius:20, fontWeight:600 }}>{mt.icon} {mt.label}</span>
                        {ev.lieu && <span style={{ fontSize:12, color:'#888', marginLeft:8 }}>📍 {ev.lieu}</span>}
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0, marginLeft:12 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:estPassee?'#aaa':'#a32d2d' }}>
                          {DAYS[d.getDay()]} {d.getDate()} {MONTHS[d.getMonth()].slice(0,3)}.
                        </div>
                        <div style={{ fontSize:12, color:'#888', fontFamily:'var(--font-mono)', marginTop:2 }}>{ev.debut}–{ev.fin}</div>
                        <div style={{ fontSize:12, fontWeight:600, color:'#888', marginTop:2 }}>{fmtH(dureeH(ev.debut,ev.fin))}</div>
                      </div>
                    </div>
                    {ev.note && <div style={{ fontSize:12, color:'#888', fontStyle:'italic', marginTop:8, paddingTop:8, borderTop:'1px solid #f0ede6' }}>💬 {ev.note}</div>}
                    {estPassee && <div style={{ fontSize:11, color:'#3b6d11', background:'#eaf3de', display:'inline-block', padding:'2px 8px', borderRadius:20, marginTop:8 }}>✅ Effectuée</div>}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ÉVÉNEMENTS DISPONIBLES */}
        {tab === 'disponibles' && (
          <div>
            {evOuverts.length === 0 ? (
              <div style={{ textAlign:'center', padding:'40px 20px', color:'#aaa' }}>
                <div style={{ fontSize:36, marginBottom:8 }}>🔓</div>
                <div>Aucun événement ouvert aux inscriptions</div>
              </div>
            ) : (
              evOuverts.map(ev => {
                const mt = missionTypes[ev.type] || Object.values(missionTypes)[0] || { label:ev.type, icon:'📌', bg:'#f1efe8', color:'#5f5e5a' };
                const inscrits = inscriptions.filter(i=>i.evenementId===ev.id&&i.statut==='valide').length;
                const complet = inscrits >= ev.effectif;
                const d = new Date(ev.date);
                return (
                  <div key={ev.id} style={{ background:'#fff', borderRadius:14, padding:'14px 16px', marginBottom:10, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                      <div>
                        {ev.nom && <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>{ev.nom}</div>}
                        <span style={{ background:mt.color, color:'#fff', fontSize:11, padding:'3px 9px', borderRadius:20, fontWeight:600 }}>{mt.icon} {mt.label}</span>
                      </div>
                      <button
                        onClick={() => sInscrire(ev.id)}
                        
                        style={{ background:complet?'#f1efe8':'#a32d2d', color:complet?'#aaa':'#fff', border:'none', borderRadius:10, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer', flexShrink:0, fontFamily:'var(--font)' }}
                      >
                        "M'inscrire"
                      </button>
                    </div>
                    <div style={{ fontSize:13, color:'#555', marginTop:6 }}>
                      📅 {DAYS[d.getDay()]} {d.getDate()} {MONTHS[d.getMonth()]} · {ev.debut}–{ev.fin}
                    </div>
                    {ev.lieu && <div style={{ fontSize:12, color:'#888', marginTop:3 }}>📍 {ev.lieu}</div>}
                    <div style={{ fontSize:11, color:'#aaa', marginTop:6 }}>{inscrits}/{ev.effectif} inscrits</div>
                    {ev.note && <div style={{ fontSize:12, color:'#888', fontStyle:'italic', marginTop:6 }}>💬 {ev.note}</div>}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
