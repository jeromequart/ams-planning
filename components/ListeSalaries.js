import { useState } from 'react';

function getAge(dateNaissance) {
  if (!dateNaissance) return null;
  const today = new Date();
  const birth = new Date(dateNaissance);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getDiplomes(sal) {
  const d = [];
  if (sal.chefEquipe) d.push('Chef équipe');
  if (sal.pse2) d.push('PSE 2');
  else if (sal.pse1) d.push('PSE 1');
  if (sal.bnssa) d.push('BNSSA');
  return d;
}

function initiales(p, n) { return ((p?.[0]||'')+(n?.[0]||'')).toUpperCase(); }

const AVATAR_COLORS = [
  {bg:'#FCEBEB',txt:'#A32D2D'},{bg:'#E6F1FB',txt:'#185FA5'},{bg:'#EAF3DE',txt:'#3B6D11'},
  {bg:'#FAEEDA',txt:'#854F0B'},{bg:'#EEEDFE',txt:'#534AB7'},{bg:'#E1F5EE',txt:'#0F6E56'},{bg:'#FBEAF0',txt:'#993556'},
];

export default function ListeSalaries({ salaries, onClose }) {
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = salaries.filter(s =>
    `${s.prenom} ${s.nom} ${s.email} ${s.tel}`.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => a.nom.localeCompare(b.nom));

  async function exportPDF() {
    setGenerating(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      const RED = [163, 45, 45];
      const GRAY = [95, 94, 90];
      const LIGHT = [248, 246, 242];
      const now = new Date().toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });

      // Header
      doc.setFillColor(...RED);
      doc.rect(0, 0, 297, 32, 'F');
      // Logo croix blanche simulé
      doc.setFillColor(255, 255, 255);
      doc.rect(14, 8, 10, 10, 'F');
      doc.setFillColor(...RED);
      doc.rect(17.5, 8, 3, 10, 'F');
      doc.rect(14, 11.5, 10, 3, 'F');
      doc.setFillColor(255, 255, 255);
      doc.rect(17.5, 8.5, 3, 9, 'F');
      doc.rect(14.5, 11.5, 9, 3, 'F');
      // Texte
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text('AMS Croix Blanche', 27, 15);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Liste des salariés saisonniers', 27, 22);
      doc.text(`Édité le ${now}`, 283, 22, { align: 'right' });

      // Sous-titre
      doc.setTextColor(...GRAY);
      doc.setFontSize(9);
      doc.text(`${salaries.length} salarié${salaries.length > 1 ? 's' : ''} enregistré${salaries.length > 1 ? 's' : ''} — Document confidentiel`, 14, 40);

      // En-têtes tableau
      const headers = ['Nom', 'Prénom', 'Téléphone', 'Email', 'Diplômes', 'Âge'];
      const colWidths = [50, 40, 42, 70, 48, 20];
      const colX = [14];
      for (let i = 0; i < colWidths.length - 1; i++) colX.push(colX[i] + colWidths[i]);

      let y = 46;
      // Fond header tableau
      doc.setFillColor(...LIGHT);
      doc.rect(14, y, 269, 7, 'F');
      doc.setTextColor(...GRAY);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      headers.forEach((h, i) => doc.text(h, colX[i] + 1, y + 5));
      y += 9;

      // Lignes
      doc.setFont('helvetica', 'normal');
      salaries.sort((a, b) => a.nom.localeCompare(b.nom)).forEach((sal, idx) => {
        if (y > 185) {
          doc.addPage();
          y = 20;
          // Re-header
          doc.setFillColor(...LIGHT);
          doc.rect(14, y, 269, 7, 'F');
          doc.setTextColor(...GRAY);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          headers.forEach((h, i) => doc.text(h, colX[i] + 1, y + 5));
          y += 9;
          doc.setFont('helvetica', 'normal');
        }

        // Alternance lignes
        if (idx % 2 === 0) {
          doc.setFillColor(252, 252, 250);
          doc.rect(14, y - 1, 269, 8, 'F');
        }

        const age = getAge(sal.dateNaissance);
        const diplomes = getDiplomes(sal);
        const isMineur = age !== null && age < 18;

        doc.setTextColor(26, 26, 24);
        doc.setFontSize(8.5);

        // NOM en gras
        doc.setFont('helvetica', 'bold');
        doc.text(sal.nom.toUpperCase(), colX[0] + 1, y + 5);
        doc.setFont('helvetica', 'normal');
        doc.text(sal.prenom, colX[1] + 1, y + 5);
        doc.text(sal.tel || '—', colX[2] + 1, y + 5);

        const email = sal.email || '—';
        doc.setFontSize(8);
        doc.text(email.length > 34 ? email.slice(0, 32) + '…' : email, colX[3] + 1, y + 5);
        doc.setFontSize(8.5);

        doc.text(diplomes.join(', ') || '—', colX[4] + 1, y + 5);

        // Âge
        doc.setFontSize(8.5);
        if (age !== null) {
          if (isMineur) {
            doc.setTextColor(...RED);
            doc.text(`${age} ans`, colX[5] + 1, y + 4);
            doc.setFontSize(7);
            doc.text('(-18)', colX[5] + 1, y + 8);
            doc.setTextColor(26, 26, 24);
          } else {
            doc.text(`${age} ans`, colX[5] + 1, y + 5);
          }
        } else {
          doc.setTextColor(...GRAY);
          doc.text('—', colX[5] + 1, y + 5);
          doc.setTextColor(26, 26, 24);
        }

        // Ligne séparatrice légère
        doc.setDrawColor(220, 218, 212);
        doc.line(14, y + 7, 283, y + 7);
        y += 9;
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(...GRAY);
        doc.text(`AMS Croix Blanche — Document confidentiel — Page ${i}/${pageCount}`, 148, 205, { align: 'center' });
      }

      doc.save(`salaries-ams-${new Date().toISOString().slice(0,10)}.pdf`);
    } catch(e) {
      console.error(e);
      alert('Erreur lors de la génération du PDF.');
    } finally {
      setGenerating(false);
    }
  }

  const s = styles;

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.panel} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <div style={{ fontSize:16, fontWeight:600 }}>Liste des salariés</div>
            <div style={{ fontSize:12, color:'var(--text-2)', marginTop:2 }}>{salaries.length} salarié{salaries.length>1?'s':''}</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={exportPDF} disabled={generating} style={s.btnPDF}>
              {generating ? '⏳ Génération…' : '📄 Exporter PDF'}
            </button>
            <button onClick={onClose} style={s.btnClose}>✕</button>
          </div>
        </div>

        {/* Recherche */}
        <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--border)' }}>
          <input
            style={{ width:'100%', padding:'8px 12px', border:'1px solid var(--border-med)', borderRadius:8, fontSize:13, fontFamily:'var(--font)' }}
            placeholder="Rechercher par nom, email, téléphone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Tableau */}
        <div style={{ overflowY:'auto', flex:1 }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead style={{ position:'sticky', top:0, zIndex:1 }}>
              <tr style={{ background:'#fafaf8', borderBottom:'1px solid var(--border)' }}>
                {['Nom / Prénom', 'Téléphone', 'Email', 'Diplômes', 'Âge'].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:600, color:'var(--text-2)', textTransform:'uppercase', letterSpacing:'0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ padding:'32px', textAlign:'center', color:'var(--text-3)' }}>Aucun résultat</td></tr>
              ) : filtered.map((sal, idx) => {
                const c = AVATAR_COLORS[sal.colorIdx % AVATAR_COLORS.length];
                const age = getAge(sal.dateNaissance);
                const diplomes = getDiplomes(sal);
                const isMineur = age !== null && age < 18;
                return (
                  <tr key={sal.id} style={{ borderBottom:'1px solid var(--border)', background: idx%2===0?'#fff':'#fafaf8' }}>
                    {/* Nom / Prénom */}
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:32, height:32, borderRadius:'50%', background:c.bg, color:c.txt, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:600, flexShrink:0 }}>
                          {initiales(sal.prenom, sal.nom)}
                        </div>
                        <div>
                          <div style={{ fontWeight:600, color:'var(--text)' }}>{sal.nom.toUpperCase()} {sal.prenom}</div>
                          <div style={{ fontSize:11, color:'var(--text-2)' }}>{sal.role || '—'}</div>
                        </div>
                      </div>
                    </td>
                    {/* Tel */}
                    <td style={{ padding:'12px 14px', color: sal.tel ? 'var(--text)' : 'var(--text-3)' }}>
                      {sal.tel || '—'}
                    </td>
                    {/* Email */}
                    <td style={{ padding:'12px 14px', color: sal.email ? 'var(--text)' : 'var(--text-3)' }}>
                      {sal.email ? <a href={`mailto:${sal.email}`} style={{ color:'#185FA5', textDecoration:'none' }}>{sal.email}</a> : '—'}
                    </td>
                    {/* Diplômes */}
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                        {diplomes.length === 0
                          ? <span style={{ color:'var(--text-3)' }}>—</span>
                          : diplomes.map(d => {
                              const colors = {
                                'Chef équipe': { bg:'#EEEDFE', color:'#534AB7' },
                                'PSE 1': { bg:'#E6F1FB', color:'#185FA5' },
                                'PSE 2': { bg:'#E6F1FB', color:'#185FA5' },
                                'BNSSA': { bg:'#E1F5EE', color:'#0F6E56' },
                              }[d] || { bg:'#f1efe8', color:'#888' };
                              return <span key={d} style={{ fontSize:11, background:colors.bg, color:colors.color, padding:'2px 8px', borderRadius:20, fontWeight:500 }}>{d}</span>;
                            })
                        }
                      </div>
                    </td>
                    {/* Âge */}
                    <td style={{ padding:'12px 14px' }}>
                      {age !== null
                        ? <span style={{ color: isMineur ? '#A32D2D' : 'var(--text)', fontWeight: isMineur ? 600 : 400 }}>
                            {age} ans {isMineur && <span style={{ fontSize:10, background:'#FCEBEB', color:'#A32D2D', padding:'1px 6px', borderRadius:10 }}>-18</span>}
                          </span>
                        : <span style={{ color:'var(--text-3)' }}>—</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 },
  panel: { background:'#fff', borderRadius:16, width:'100%', maxWidth:900, maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.2)', overflow:'hidden' },
  header: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--border)' },
  btnPDF: { background:'#a32d2d', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'var(--font)' },
  btnClose: { background:'#f8f6f2', border:'1px solid var(--border-med)', borderRadius:8, padding:'8px 12px', fontSize:16, cursor:'pointer', color:'var(--text-2)' },
};