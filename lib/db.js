import { supabase } from './supabase';

// ─── SALARIÉS ───────────────────────────────────────────
export async function getSalaries() {
  const { data, error } = await supabase.from('salaries').select('*').order('nom');
  if (error) throw error;
  return data.map(s => ({ id: s.id, prenom: s.prenom, nom: s.nom, role: s.role || '', colorIdx: s.color_idx || 0 }));
}
export async function addSalarie(s) {
  const { data, error } = await supabase.from('salaries').insert({ prenom: s.prenom, nom: s.nom, role: s.role, color_idx: s.colorIdx }).select().single();
  if (error) throw error;
  return { id: data.id, prenom: data.prenom, nom: data.nom, role: data.role || '', colorIdx: data.color_idx || 0 };
}
export async function updateSalarie(id, s) {
  const { error } = await supabase.from('salaries').update({ prenom: s.prenom, nom: s.nom, role: s.role, color_idx: s.colorIdx }).eq('id', id);
  if (error) throw error;
}
export async function deleteSalarie(id) {
  const { error } = await supabase.from('salaries').delete().eq('id', id);
  if (error) throw error;
}

// ─── ÉVÉNEMENTS ─────────────────────────────────────────
export async function getEvenements() {
  const { data, error } = await supabase.from('evenements').select('*').order('date');
  if (error) throw error;
  return data.map(e => ({
    id: e.id, nom: e.nom || '', ref: e.ref || '',
    date: e.date, debut: e.debut?.slice(0,5), fin: e.fin?.slice(0,5),
    type: e.type, lieu: e.lieu || '', note: e.note || '',
    effectif: e.effectif || 1, ouvert: e.ouvert || false,
  }));
}
export async function addEvenement(e) {
  const { data, error } = await supabase.from('evenements').insert({
    nom: e.nom, ref: e.ref, date: e.date, debut: e.debut, fin: e.fin,
    type: e.type, lieu: e.lieu, note: e.note, effectif: e.effectif, ouvert: e.ouvert,
  }).select().single();
  if (error) throw error;
  return { ...e, id: data.id };
}
export async function updateEvenement(id, e) {
  const { error } = await supabase.from('evenements').update({
    nom: e.nom, ref: e.ref, date: e.date, debut: e.debut, fin: e.fin,
    type: e.type, lieu: e.lieu, note: e.note, effectif: e.effectif, ouvert: e.ouvert,
  }).eq('id', id);
  if (error) throw error;
}
export async function deleteEvenement(id) {
  const { error } = await supabase.from('evenements').delete().eq('id', id);
  if (error) throw error;
}

// ─── INSCRIPTIONS ────────────────────────────────────────
export async function getInscriptions() {
  const { data, error } = await supabase.from('inscriptions').select('*');
  if (error) throw error;
  return data.map(i => ({ id: i.id, evenementId: i.evenement_id, salarieId: i.salarie_id, statut: i.statut, source: i.source }));
}
export async function addInscription(i) {
  const { data, error } = await supabase.from('inscriptions').insert({
    evenement_id: i.evenementId, salarie_id: i.salarieId, statut: i.statut, source: i.source,
  }).select().single();
  if (error) throw error;
  return { ...i, id: data.id };
}
export async function updateInscription(id, statut) {
  const { error } = await supabase.from('inscriptions').update({ statut }).eq('id', id);
  if (error) throw error;
}
export async function deleteInscription(id) {
  const { error } = await supabase.from('inscriptions').delete().eq('id', id);
  if (error) throw error;
}

// ─── TYPES DE MISSIONS ───────────────────────────────────
export async function getMissionTypes() {
  const { data, error } = await supabase.from('mission_types').select('*');
  if (error) throw error;
  const result = {};
  data.forEach(mt => { result[mt.id] = { label: mt.label, icon: mt.icon, bg: mt.bg, color: mt.color }; });
  return result;
}
export async function upsertMissionType(id, mt) {
  const { error } = await supabase.from('mission_types').upsert({ id, label: mt.label, icon: mt.icon, bg: mt.bg, color: mt.color });
  if (error) throw error;
}
export async function deleteMissionType(id) {
  const { error } = await supabase.from('mission_types').delete().eq('id', id);
  if (error) throw error;
}
