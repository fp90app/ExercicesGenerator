// src/utils/mathGenerators.js

// 1. Ré-exporter les utilitaires (formatDate, timeAgo...)
// car ils sont utilisés par TeacherTools.jsx et Dashboards.jsx
export * from './generators/utils';

// 2. Ré-exporter les générateurs thématiques
export * from './generators/numbers';
export * from './generators/algebra';
export * from './generators/geometry';
export * from './generators/functions';
export * from './generators/algo';

import * as math from 'mathjs';

/**
 * LE CERVEAU UNIQUE : Transforme le JSON brut (avec variations) en données jouables
 * Utilisé par : AdminPanel (Aperçu) ET Game (Jeu réel)
 */
export const processLevelData = (levelConfig, levelIndex = 1) => {
    try {
        // 1. GESTION DES VARIATIONS (Scénarios)
        // On clone pour ne pas modifier l'original
        let activeData = { ...levelConfig };

        // Si le niveau a des variations, on en pioche une et on l'écrase sur la base
        if (activeData.variations && Array.isArray(activeData.variations) && activeData.variations.length > 0) {
            const variant = activeData.variations[Math.floor(Math.random() * activeData.variations.length)];

            // Fusion intelligente : La variation écrase les valeurs de base
            activeData = {
                ...activeData, // Garde les defaults (xp, timer...)
                ...variant,    // Écrase question_template, correct_answer, etc.
                // On fusionne les variables et calculs pour ne rien perdre
                variables: { ...(activeData.variables || {}), ...(variant.variables || {}) },
                calculations: { ...(activeData.calculations || {}), ...(variant.calculations || {}) },
                visual_config_override: { ...(activeData.visual_config_override || {}), ...(variant.visual_config_override || {}) }
            };
        }

        // 2. ÉVALUATION DES VARIABLES MATHÉMATIQUES
        let scope = {};

        // On combine variables et calculs pour l'évaluation
        let toEvaluate = { ...activeData.variables, ...activeData.calculations };
        let remainingKeys = Object.keys(toEvaluate);

        // Boucle de résolution (max 7 passes pour résoudre les dépendances imbriquées)
        for (let pass = 0; pass < 7; pass++) {
            let nextRemaining = [];
            let progress = false;

            remainingKeys.forEach(key => {
                try {
                    let expr = toEvaluate[key];

                    // Si c'est déjà un nombre, on garde
                    if (typeof expr === 'number') {
                        scope[key] = expr;
                        progress = true;
                        return;
                    }

                    // Si c'est une chaîne simple sans maths, on garde le texte (évite les erreurs MathJS sur du texte)
                    if (typeof expr === 'string' && !expr.match(/[+\-*/^()\[\]]/) && !expr.includes('random')) {
                        scope[key] = expr;
                        progress = true;
                    } else {
                        // Sinon on évalue avec mathjs
                        const res = math.evaluate(String(expr), scope);
                        if (res !== undefined && res !== null) {
                            scope[key] = res;
                            progress = true;
                        } else {
                            nextRemaining.push(key);
                        }
                    }
                } catch (e) {
                    // Si ça rate (dépendance manquante), on réessaie au prochain tour
                    nextRemaining.push(key);
                }
            });

            remainingKeys = nextRemaining;
            if (remainingKeys.length === 0) break; // Tout est résolu
            if (!progress && pass > 1) break; // Blocage détecté
        }

        // 3. REMPLACEMENT DANS LES TEXTES ({variable} -> valeur)
        const replaceVars = (text) => {
            if (typeof text !== 'string') return text;
            return text.replace(/\{(\w+)\}/g, (_, key) => {
                const val = scope[key];
                if (val === undefined) return `{${key}}`; // Si pas trouvé, on laisse {var}
                // Si c'est un nombre à virgule, on arrondit joliment pour l'affichage
                return (typeof val === 'number' && !Number.isInteger(val)) ? Math.round(val * 1000) / 1000 : val;
            });
        };

        // Construction des textes finaux
        let qText = replaceVars(activeData.question_template || "Question ?");
        let expText = replaceVars(activeData.explanation_template || "");
        let correct = activeData.correct_answer;

        // Traitement de la réponse correcte
        if (correct && typeof correct === 'string') {
            correct = replaceVars(correct);
            // Note : On ne force pas le calcul ici si c'est une fraction comme "3/4"
            // StandardGame se chargera de comparer "3/4" (texte) ou 0.75 (maths)
        }




        // 4. CONFIG VISUELLE (Si moteur visuel utilisé)
        let visualConfig = null;
        const rawVisual = { ...(levelConfig.common_config?.visual_config_template || {}), ...(activeData.visual_config_override || {}) };
        if (Object.keys(rawVisual).length > 0) {
            visualConfig = JSON.parse(replaceVars(JSON.stringify(rawVisual)));
        }

        // --- 5. GESTION DES OPTIONS QCM (C'est ce qui manque !) ---
        let qcmOptions = [];
        // On regarde si des options existent dans la config active (après fusion variation)
        if (activeData.options && Array.isArray(activeData.options)) {
            // 1. On remplace les variables dans chaque option (ex: "{k2}" devient "100")
            qcmOptions = activeData.options.map(opt => replaceVars(opt));

            // 2. On mélange les options pour que la réponse A ne soit pas toujours la bonne
            // (Algorithme de Fisher-Yates simple)
            for (let i = qcmOptions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [qcmOptions[i], qcmOptions[j]] = [qcmOptions[j], qcmOptions[i]];
            }
        }

        // --- RÉCUPÉRATION DU CLAVIER ---
        const keyboard = activeData.custom_keyboard || levelConfig.custom_keyboard || levelConfig.common_config?.custom_keyboard;

        return {
            question: qText,
            explanation: expText,
            correctAnswer: String(correct),
            visualConfig: visualData,
            visualEngine: levelConfig.visual_engine || "NONE",
            responseType: activeData.response_type || "NUMERIC",
            xp_reward: activeData.xp_reward || 5,

            options: qcmOptions, // <--- C'EST LA CLÉ MANQUANTE

            custom_keyboard: keyboard,
            scope,
            activeData
        };

    } catch (e) {
        console.error("Erreur générateur:", e);
        return { error: e.message };
    }
};

// Fonction utilitaire indispensable pour les dates (TeacherTools)
export const timeAgo = (date) => {
    if (!date) return "Jamais";
    // Gestion compatibilité Firestore Timestamp vs Date JS standard
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);

    const seconds = Math.floor((new Date() - d) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " an(s)";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " mois";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "j";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m";
    return "À l'instant";
};