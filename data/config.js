export const MISSION_TYPES = {
  dps: { label: 'Poste de secours', color: '#a32d2d', bg: '#fcebeb', icon: '🚑' },
  admin: { label: 'Administratif', color: '#185fa5', bg: '#e6f1fb', icon: '📋' },
  materiel: { label: 'Matériel', color: '#3b6d11', bg: '#eaf3de', icon: '🔧' },
  nettoyage: { label: 'Nettoyage / Rangement', color: '#854f0b', bg: '#faeeda', icon: '🧹' },
  formation: { label: 'Formation', color: '#534ab7', bg: '#eeedfe', icon: '📚' },
  autre: { label: 'Autre', color: '#5f5e5a', bg: '#f1efe8', icon: '📌' },
};

export const LIEUX_FREQUENTS = [
  'Vélodrome', 'Palais Omnisports', 'Plage du Prado',
  'Siège AMS', 'Entrepôt', 'Festival Marseille', 'Stade Delort',
];

export const AVATAR_COLORS = [
  { bg: '#fcebeb', txt: '#a32d2d' },
  { bg: '#e6f1fb', txt: '#185fa5' },
  { bg: '#eaf3de', txt: '#3b6d11' },
  { bg: '#faeeda', txt: '#854f0b' },
  { bg: '#eeedfe', txt: '#534ab7' },
  { bg: '#e1f5ee', txt: '#0f6e56' },
  { bg: '#fbeaf0', txt: '#993556' },
];

// Données initiales vides
export const INITIAL_DATA = {
  salaries: [],
  evenements: [],      // remplace missions
  inscriptions: [],    // { id, evenementId, salarieId, statut: 'en_attente'|'valide'|'refuse', source: 'admin'|'salarie' }
};
