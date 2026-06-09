import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  'https://kctgwnvifmoendwmtipr.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { salaries } = req.body;
  if (!salaries?.length) return res.status(400).json({ error: 'Données manquantes' });

  const results = { comptes: 0, lies: 0, erreurs: [] };

  for (const s of salaries) {
    if (!s.email) continue;
    try {
      // 1. Créer le compte auth
      const { error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: s.email,
        password: 'Ams2026!',
        email_confirm: true,
      });

      if (authErr && !authErr.message?.includes('already registered')) {
        results.erreurs.push(`${s.prenom} ${s.nom} : ${authErr.message}`);
        continue;
      }
      if (!authErr) results.comptes++;

      // 2. Trouver la fiche salarié existante par email
      const { data: sal } = await supabaseAdmin
        .from('salaries')
        .select('id')
        .ilike('email', s.email)
        .single();

      if (sal) {
        // 3. Lier email ↔ salarié
        await supabaseAdmin.from('salarie_auth').upsert({
          email: s.email.toLowerCase(),
          salarie_id: sal.id,
        });
        results.lies++;
      }
    } catch(e) {
      results.erreurs.push(`${s.prenom} ${s.nom} : ${e.message}`);
    }
  }

  return res.status(200).json(results);
}
