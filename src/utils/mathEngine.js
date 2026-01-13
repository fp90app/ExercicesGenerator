import { evaluate } from 'mathjs';

/**
 * Moteur mathématique centralisé.
 * Garantit la sécurité des évaluations et la précision des comparaisons.
 */
// Seuil de tolérance pour les comparaisons de flottants
const EPSILON = 0.000001;

/**
 * Évalue une expression mathématique en toute sécurité avec mathjs.
 * @param {string} expression - L'expression à calculer (ex: "3*x + 2")
 * @param {object} scope - Les variables (ex: { x: 5 })
 */
export const safeEvaluate = (expression, scope = {}) => {
    if (!expression) return 0;

    try {
        // 1. Nettoyage basique (mathjs n'aime pas les virgules françaises)
        // On convertit en string pour être sûr
        const cleanExpr = String(expression).replace(/,/g, '.');

        // 2. Évaluation sécurisée via mathjs
        // mathjs gère directement le "scope" (remplacement des x, y, etc.)
        return evaluate(cleanExpr, scope);

    } catch (e) {
        // On ne loggue l'erreur que si ce n'est pas une saisie vide en cours
        if (expression.length > 1) {
            console.warn("Erreur de calcul mathjs :", e.message);
        }
        return NaN;
    }
};


/**
 * Compare deux nombres avec une tolérance pour les erreurs de flottants.
 * Indispensable pour valider les réponses des élèves.
 * @param {number} a - Valeur attendue
 * @param {number} b - Valeur fournie par l'élève
 * @param {number} precision - (Optionnel) tolérance personnalisée
 */
export const areValuesEqual = (a, b, precision = EPSILON) => {
    if (typeof a !== 'number' || typeof b !== 'number') return false;
    return Math.abs(a - b) < precision;
};

/**
 * Génère un nombre aléatoire entier entre min et max (inclus).
 * Utilitaire pour les générateurs d'exercices.
 */
export const randomInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Génère un nombre décimal "propre" (pas de 3.00000004).
 * @param {number} val - La valeur brute
 * @param {number} decimals - Nombre de décimales souhaitées
 */
export const roundTo = (val, decimals = 2) => {
    const factor = Math.pow(10, decimals);
    return Math.round(val * factor) / factor;
};

/**
 * Génère une liste de mauvaises réponses uniques (pour les QCM).
 * Remplace les boucles while(true) infinies.
 * @param {number} correctAnswer - La bonne réponse
 * @param {Function} generatorFn - Fonction qui génère une valeur aléatoire
 * @param {number} count - Nombre de leurres voulus
 */
export const generateDistractors = (correctAnswer, generatorFn, count = 3) => {
    const distractors = new Set();
    let attempts = 0;
    const MAX_ATTEMPTS = 50;

    while (distractors.size < count && attempts < MAX_ATTEMPTS) {
        const val = generatorFn();
        // On utilise notre comparateur robuste
        if (!areValuesEqual(val, correctAnswer) && ![...distractors].some(d => areValuesEqual(d, val))) {
            distractors.add(val);
        }
        attempts++;
    }

    // Fallback si on ne trouve pas assez de valeurs uniques (pour éviter de planter)
    // On ajoute des valeurs triviales décalées
    while (distractors.size < count) {
        distractors.add(correctAnswer + (distractors.size + 1));
    }

    return Array.from(distractors);
};