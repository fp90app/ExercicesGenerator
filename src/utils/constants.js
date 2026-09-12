/**
 * Constantes globales de l'application
 * Centralise les données réutilisées pour éviter les erreurs de frappe (DRY)
 */

// Niveaux scolaires gérés par la plateforme
export const SCHOOL_LEVELS = ["6ème", "5ème", "4ème", "3ème"];

// Domaines mathématiques principaux
export const SKILL_DOMAINS = [
    "Numération",
    "Géométrie",
    "Grandeurs et Mesures",
    "Gestion de données"
];

// Couleurs Tailwind associées aux domaines
export const DOMAIN_COLORS = {
    'Numération': 'blue',
    'Géométrie': 'emerald',
    'Grandeurs et Mesures': 'purple',
    'Gestion de données': 'orange'
};

// Les 6 grandes compétences du socle commun
export const GRANDES_COMPETENCES = [
    "Chercher",
    "Modéliser",
    "Représenter",
    "Raisonner",
    "Calculer",
    "Communiquer"
];

// Couleurs Tailwind associées aux grandes compétences
export const GC_COLORS = {
    'Chercher': 'blue',
    'Modéliser': 'emerald',
    'Représenter': 'purple',
    'Raisonner': 'amber',
    'Calculer': 'red',
    'Communiquer': 'indigo'
};

// Correspondance Hexadécimale pour les tracés SVG (ex: Graphiques d'évolution)
export const HEX_COLORS = {
    blue: '#3b82f6',
    emerald: '#10b981',
    purple: '#a855f7',
    amber: '#f59e0b',
    red: '#ef4444',
    indigo: '#6366f1',
    slate: '#64748b'
};

// Statuts d'évaluation (Pastilles)
export const EVALUATION_STATUS = {
    NON_EVALUE: '⚪',
    NON_ACQUIS: '🔴',
    EN_COURS: '🟡',
    ACQUIS: '🟢',
    DEPASSE: '🟩'
};