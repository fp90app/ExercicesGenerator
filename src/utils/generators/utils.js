// src/utils/generators/utils.js

export const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Génère un entier relatif non nul (utile pour l'algèbre)
export const randNz = (limit) => {
    let n = 0;
    while (n === 0) n = rand(-limit, limit);
    return n;
};

export const round = (val, precision = 2) => {
    return Math.round(val * Math.pow(10, precision)) / Math.pow(10, precision);
};

export const cleanNumber = (num) => Number(Number(num).toFixed(2));

// Helpers de formatage pour l'algèbre (utilisés souvent)
export const fmtSign = (n) => n >= 0 ? `+ ${n}` : `- ${Math.abs(n)}`;
export const fmtCoef = (n, v) => {
    if (n === 0) return "0";
    if (n === 1) return v;
    if (n === -1) return `-${v}`;
    return `${n}${v}`;
};

// Fonctions date/temps (venant du début de ton ancien fichier)
export const formatDate = (ts) => {
    if (!ts) return "Ancien score";
    try {
        const d = new Date(ts);
        if (isNaN(d.getTime())) return "Date inconnue";
        const now = new Date();
        if (d.toDateString() === now.toDateString()) {
            return "Auj. à " + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        }
        return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' }) + " - " + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return "Date erreur";
    }
};

export const timeAgo = (date) => {
    if (!date) return "Jamais";
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " an(s)";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " mois";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " j";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " min";
    return "À l'instant";
};

