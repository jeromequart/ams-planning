import Modal from './Modal';

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} à ${String(d.getHours()).padStart(2,'0')}h${String(d.getMinutes()).padStart(2,'0')}`;
}

const STATUT_LABELS = {
  'en_attente': { label:'Demande envoyée', color:'#854F0B', bg:'#FAEEDA', icon:'⏳' },
  'valide':     { label:'Validé', color:'#3B6D11', bg:'#EAF3DE', icon:'✅' },
  'refuse':     { label:'Refusé', color:'#A32D2D', bg:'#FCEBEB', icon:'✗' },
  'retire':     { label:'Retiré', color:'#5F5E5A', bg:'#F1EFE8', icon:'↩' },
};

const SOURCE_LABELS = {
  'admin':   'par l\'administrateur',
  'salarie': 'par le salarié',
};

export default function HistoriqueModal({ onClose, salarie, evenement, inscriptions }) {
  // Toutes les inscriptions de ce salarié pour cet événement, triées par date
  const historique = inscriptions
    .filter(i => i.salarieId === salarie?.id && i.evenementId === evenement?.id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const derniere = historique[historique.length - 1];

  return (
    <Modal
      title={`Historique — ${salarie?.prenom} ${salarie?.nom}`}
      onClose={onClose}
      width={460}
    >
      {/* Événement */}
      <div style={{ background:'#f8f6f2', borderRadius:10, padding:'10px 14px', marginBottom:20 }}>
        <div style={{ fontSize:13, fontWeight:500 }}>{evenement?.nom || '(sans nom)'}</div>
        <div style={{ fontSize:11, color:'var(--text-2)', marginTop:2 }}>
          {evenement?.date && new Date(evenement.date).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}
          {evenement?.debut && ` · ${evenement.debut}–${evenement.fin}`}
        </div>
      </div>

      {/* Statut actuel */}
      {derniere && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>
            Statut actuel
          </div>
          {(() => {
            const st = STATUT_LABELS[derniere.statut] || { label:derniere.statut, color:'#888', bg:'#f1efe8', icon:'•' };
            return (
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:st.bg, borderRadius:10 }}>
                <span style={{ fontSize:20 }}>{st.icon}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:500, color:st.color }}>{st.label}</div>
                  <div style={{ fontSize:11, color:'var(--text-2)', marginTop:2 }}>
                    {fmtDate(derniere.updatedAt || derniere.createdAt)} {derniere.updatedBy ? SOURCE_LABELS[derniere.updatedBy] || '' : ''}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Timeline historique */}
      <div style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:12 }}>
        Historique complet
      </div>

      {historique.length === 0 ? (
        <div style={{ textAlign:'center', padding:'24px', color:'var(--text-3)', fontSize:13 }}>
          Aucun historique disponible.
        </div>
      ) : (
        <div style={{ position:'relative' }}>
          {/* Ligne verticale */}
          <div style={{ position:'absolute', left:14, top:8, bottom:8, width:1, background:'var(--border)', zIndex:0 }} />

          {historique.map((insc, idx) => {
            const st = STATUT_LABELS[insc.statut] || { label:insc.statut, color:'#888', bg:'#f1efe8', icon:'•' };
            const isFirst = idx === 0;
            const dateAffichee = idx === 0 ? insc.createdAt : (insc.updatedAt || insc.createdAt);
            return (
              <div key={insc.id + idx} style={{ display:'flex', gap:14, marginBottom:16, position:'relative', zIndex:1 }}>
                {/* Point timeline */}
                <div style={{ width:28, height:28, borderRadius:'50%', background:st.bg, border:`2px solid ${st.color}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>
                  {st.icon}
                </div>
                {/* Contenu */}
                <div style={{ flex:1, paddingTop:4 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:st.color }}>{st.label}</div>
                  <div style={{ fontSize:11, color:'var(--text-2)', marginTop:2 }}>
                    {isFirst
                      ? `Inscription créée ${SOURCE_LABELS[insc.source] || ''}`
                      : `Modifié ${insc.updatedBy ? SOURCE_LABELS[insc.updatedBy] : ''}`
                    }
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-3)', marginTop:1, fontFamily:'var(--font-mono)' }}>
                    {fmtDate(dateAffichee)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:20, borderTop:'1px solid var(--border)', paddingTop:16 }}>
        <button onClick={onClose} style={{ background:'var(--red)', color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', fontSize:13, cursor:'pointer', fontFamily:'var(--font)' }}>
          Fermer
        </button>
      </div>
    </Modal>
  );
}