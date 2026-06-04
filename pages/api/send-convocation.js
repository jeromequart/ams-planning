export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { evenement, salaries, vehicules } = req.body;
  if (!evenement || !salaries?.length) return res.status(400).json({ error: 'Données manquantes' });

  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return res.status(500).json({ error: 'Clé Resend non configurée' });

  const MONTHS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const DAYS = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];

  function fmtDate(ds) {
    const d = new Date(ds);
    return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  const ev = evenement;
  const dateStr = fmtDate(ev.date);
  const tenueCouleur = ev.tenue === 'bleue' ? '🔵 Tenue bleue' : '⚪ Tenue blanche';
  const repasStr = ev.repas ? '✅ Repas pris en charge' : '❌ Repas non pris en charge';

  const vehLines = vehicules?.length
    ? vehicules.map(v => {
        const conducteur = v.conducteurNom ? ` — Conducteur : ${v.conducteurNom}` : '';
        return `<li style="margin:4px 0">${v.label}${conducteur}</li>`;
      }).join('')
    : '<li>Aucun véhicule affecté</li>';

  const results = [];

  for (const sal of salaries) {
    if (!sal.email) { results.push({ nom: `${sal.prenom} ${sal.nom}`, statut: 'pas_email' }); continue; }

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f6f2;font-family:Arial,sans-serif">
  <div style="max-width:580px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
    <!-- Header -->
    <div style="background:#00529B;padding:24px 32px;text-align:center">
      <div style="color:#fff;font-size:22px;font-weight:bold;letter-spacing:-0.5px">AMS Croix Blanche</div>
      <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:4px">Convocation — ${ev.nom || 'Mission'}</div>
    </div>
    <!-- Corps -->
    <div style="padding:28px 32px">
      <p style="font-size:15px;color:#1a1a18;margin:0 0 8px">Bonjour <strong>${sal.prenom}</strong>,</p>
      <p style="font-size:14px;color:#5f5e5a;margin:0 0 24px">Vous êtes convoqué(e) pour la mission suivante :</p>

      <!-- Bloc mission -->
      <div style="background:#f0f5fb;border-left:4px solid #00529B;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:20px">
        <div style="font-size:18px;font-weight:bold;color:#1a1a18;margin-bottom:4px">${ev.nom || 'Mission'}${ev.ref ? ` <span style="font-size:12px;color:#888;font-weight:normal">[${ev.ref}]</span>` : ''}</div>
        <div style="font-size:14px;color:#5f5e5a;margin-top:8px">
          📅 ${dateStr}<br>
          🕐 ${ev.debut} – ${ev.fin}<br>
          ${ev.lieu ? `📍 ${ev.lieu}<br>` : ''}
        </div>
      </div>

      <!-- Infos logistiques -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr>
          <td style="padding:10px 14px;background:#f8f6f2;border-radius:8px 0 0 8px;font-size:13px;color:#5f5e5a;width:50%">👕 Tenue</td>
          <td style="padding:10px 14px;background:#f8f6f2;border-radius:0 8px 8px 0;font-size:13px;font-weight:500;color:#1a1a18">${tenueCouleur}</td>
        </tr>
        <tr><td colspan="2" style="padding:4px"></td></tr>
        <tr>
          <td style="padding:10px 14px;background:#f8f6f2;border-radius:8px 0 0 8px;font-size:13px;color:#5f5e5a">🍽️ Repas</td>
          <td style="padding:10px 14px;background:#f8f6f2;border-radius:0 8px 8px 0;font-size:13px;font-weight:500;color:#1a1a18">${repasStr}</td>
        </tr>
        ${ev.heureDepart ? `
        <tr><td colspan="2" style="padding:4px"></td></tr>
        <tr>
          <td style="padding:10px 14px;background:${ev.arriveeSurPlace?'#faeeda':'#f8f6f2'};border-radius:8px 0 0 8px;font-size:13px;color:${ev.arriveeSurPlace?'#854F0B':'#5f5e5a'}">🚗 ${ev.arriveeSurPlace?'Heure d\'arrivée sur place':'Heure de départ du bureau'}</td>
          <td style="padding:10px 14px;background:${ev.arriveeSurPlace?'#faeeda':'#f8f6f2'};border-radius:0 8px 8px 0;font-size:13px;font-weight:500;color:${ev.arriveeSurPlace?'#854F0B':'#1a1a18'}">${ev.heureDepart}${ev.arriveeSurPlace?' ⚠️ Prévenir le chef d\'équipe':''}</td>
        </tr>` : ''}
      </table>

      <!-- Véhicules -->
      ${vehicules?.length ? `
      <div style="margin-bottom:20px">
        <div style="font-size:13px;font-weight:600;color:#5f5e5a;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">🚐 Véhicules affectés</div>
        <ul style="margin:0;padding-left:20px;color:#1a1a18;font-size:13px">${vehLines}</ul>
      </div>` : ''}

      ${ev.note ? `
      <div style="background:#fffdf7;border:1px solid #f0d5a0;border-radius:8px;padding:14px 16px;margin-bottom:20px">
        <div style="font-size:12px;font-weight:600;color:#854F0B;margin-bottom:4px">💬 Instructions</div>
        <div style="font-size:13px;color:#5f5e5a">${ev.note}</div>
      </div>` : ''}

      <p style="font-size:13px;color:#888;margin:24px 0 0;padding-top:16px;border-top:1px solid #f0ede6">
        En cas d'empêchement, contactez immédiatement votre responsable.<br>
        <strong>AMS Croix Blanche — Marseille</strong>
      </p>
    </div>
  </div>
</body>
</html>`;

    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'AMS Croix Blanche <planning@ams-croixblanche.fr>',
          to: [sal.email],
          subject: `Convocation — ${ev.nom || 'Mission'} — ${dateStr}`,
          html,
        }),
      });
      const data = await r.json();
      if (r.ok) results.push({ nom: `${sal.prenom} ${sal.nom}`, statut: 'envoyé' });
      else results.push({ nom: `${sal.prenom} ${sal.nom}`, statut: 'erreur', detail: data.message });
    } catch(e) {
      results.push({ nom: `${sal.prenom} ${sal.nom}`, statut: 'erreur', detail: e.message });
    }
  }

  return res.status(200).json({ results });
}
