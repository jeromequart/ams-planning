import { supabase } from './supabase';

// ─── SALARIÉS ───────────────────────────────────────────
export async function getSalaries() {
  const { data, error } = await supabase.from('salaries').select('*').order('nom');
  if (error) throw error;
  return data.map(s => ({
    id: s.id, prenom: s.prenom, nom: s.nom, role: s.role || '', colorIdx: s.color_idx || 0,
    dateNaissance: s.date_naissance || '', email: s.email || '', tel: s.tel || '',
    chefEquipe: !!s.chef_equipe, pse1: !!s.pse1, pse2: !!s.pse2, bnssa: !!s.bnssa,
  }));
}
export async function addSalarie(s) {
  const { data, error } = await supabase.from('salaries').insert({
    prenom: s.prenom, nom: s.nom, role: s.role, color_idx: s.colorIdx,
    date_naissance: s.dateNaissance || null, email: s.email || null, tel: s.tel || null,
    chef_equipe: !!s.chefEquipe, pse1: !!s.pse1, pse2: !!s.pse2, bnssa: !!s.bnssa,
  }).select().single();
  if (error) throw error;
  return {
    id: data.id, prenom: data.prenom, nom: data.nom, role: data.role || '', colorIdx: data.color_idx || 0,
    dateNaissance: data.date_naissance || '', email: data.email || '', tel: data.tel || '',
    chefEquipe: !!data.chef_equipe, pse1: !!data.pse1, pse2: !!data.pse2, bnssa: !!data.bnssa,
  };
}
export async function updateSalarie(id, s) {
  const { error } = await supabase.from('salaries').update({
    prenom: s.prenom, nom: s.nom, role: s.role, color_idx: s.colorIdx,
    date_naissance: s.dateNaissance || null, email: s.email || null, tel: s.tel || null,
    chef_equipe: !!s.chefEquipe, pse1: !!s.pse1, pse2: !!s.pse2, bnssa: !!s.bnssa,
  }).eq('id', id);
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
    tenue: e.tenue || 'blanche', repas: !!e.repas,
    heureDepart: e.heure_depart?.slice(0,5) || '', arriveeSurPlace: !!e.arrivee_sur_place,
  }));
}
export async function addEvenement(e) {
  const { data, error } = await supabase.from('evenements').insert({
    nom: e.nom, ref: e.ref, date: e.date, debut: e.debut, fin: e.fin,
    type: e.type, lieu: e.lieu, note: e.note, effectif: e.effectif, ouvert: e.ouvert,
    tenue: e.tenue || 'blanche', repas: !!e.repas,
    heure_depart: e.heureDepart || null, arrivee_sur_place: !!e.arriveeSurPlace,
  }).select().single();
  if (error) throw error;
  return { ...e, id: data.id };
}
export async function updateEvenement(id, e) {
  const { error } = await supabase.from('evenements').update({
    nom: e.nom, ref: e.ref, date: e.date, debut: e.debut, fin: e.fin,
    type: e.type, lieu: e.lieu, note: e.note, effectif: e.effectif, ouvert: e.ouvert,
    tenue: e.tenue || 'blanche', repas: !!e.repas,
    heure_depart: e.heureDepart || null, arrivee_sur_place: !!e.arriveeSurPlace,
  }).eq('id', id);
  if (error) throw error;
}
export async function deleteEvenement(id) {
  const { error } = await supabase.from('evenements').delete().eq('id', id);
  if (error) throw error;
}

// ─── INSCRIPTIONS ────────────────────────────────────────
export async function getInscriptions() {
  const { data, error } = await supabase.from('inscriptions').select('*').order('created_at');
  if (error) throw error;
  return data.map(i => ({
    id: i.id, evenementId: i.evenement_id, salarieId: i.salarie_id,
    statut: i.statut, source: i.source,
    createdAt: i.created_at, updatedAt: i.updated_at, updatedBy: i.updated_by,
  }));
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
export async function retireInscription(id, by = 'admin') {
  const { error } = await supabase.from('inscriptions')
    .update({ statut: 'retire', updated_by: by })
    .eq('id', id);
  if (error) throw error;
}
export async function reactiverInscription(id, statut = 'valide', by = 'admin') {
  const { error } = await supabase.from('inscriptions')
    .update({ statut, updated_by: by })
    .eq('id', id);
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

// ─── VÉHICULES ───────────────────────────────────────────
export async function getVehicules() {
  const { data, error } = await supabase.from('vehicules').select('*').eq('actif', true).order('nom');
  if (error) throw error;
  return data;
}
export async function addVehicule(v) {
  const { data, error } = await supabase.from('vehicules').insert(v).select().single();
  if (error) throw error;
  return data;
}

// ─── AFFECTATIONS VÉHICULES ──────────────────────────────
export async function getEvenementVehicules(evenementId) {
  const { data, error } = await supabase.from('evenement_vehicules').select('*').eq('evenement_id', evenementId);
  if (error) throw error;
  return data.map(r => ({ id: r.id, evenementId: r.evenement_id, vehiculeId: r.vehicule_id, vehiculeCustom: r.vehicule_custom, conducteurId: r.conducteur_id }));
}
export async function addEvenementVehicule(ev) {
  const { data, error } = await supabase.from('evenement_vehicules').insert({
    evenement_id: ev.evenementId, vehicule_id: ev.vehiculeId || null,
    vehicule_custom: ev.vehiculeCustom || null, conducteur_id: ev.conducteurId || null,
  }).select().single();
  if (error) throw error;
  return { id: data.id, evenementId: data.evenement_id, vehiculeId: data.vehicule_id, vehiculeCustom: data.vehicule_custom, conducteurId: data.conducteur_id };
}
export async function updateEvenementVehicule(id, conducteurId) {
  const { error } = await supabase.from('evenement_vehicules').update({ conducteur_id: conducteurId }).eq('id', id);
  if (error) throw error;
}
export async function deleteEvenementVehicule(id) {
  const { error } = await supabase.from('evenement_vehicules').delete().eq('id', id);
  if (error) throw error;
}
export async function deleteAllEvenementVehicules(evenementId) {
  const { error } = await supabase.from('evenement_vehicules').delete().eq('evenement_id', evenementId);
  if (error) throw error;
}