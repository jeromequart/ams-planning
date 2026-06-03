import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  'https://kctgwnvifmoendwmtipr.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { email, password, salarieId } = req.body;
  if (!email || !password || !salarieId) return res.status(400).json({ error: 'Données manquantes' });
  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (authError) return res.status(400).json({ error: authError.message });
    const { error: linkError } = await supabaseAdmin.from('salarie_auth').upsert({ email, salarie_id: salarieId });
    if (linkError) return res.status(400).json({ error: linkError.message });
    return res.status(200).json({ data: authData });
  } catch(e) { return res.status(500).json({ error: e.message }); }
}
