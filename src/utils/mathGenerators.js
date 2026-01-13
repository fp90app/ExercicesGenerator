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
export * from './generators/statistics';

import * as math from 'mathjs';
import { randomInt, roundTo } from './mathEngine';

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

export const generateSpreadsheetQuestion = ({ level }) => {

    // --- 1. UTILITAIRES INTERNES ---

    // Génère un entier aléatoire entre min et max (inclus)
    const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    // Convertit index 0->A, 1->B...
    const getColLetter = (i) => String.fromCharCode(65 + i);

    // Génère toutes les permutations d'un tableau
    // Indispensable pour valider =A+B+C, =A+C+B, =B+A+C...
    const permutator = (inputArr) => {
        let result = [];
        const permute = (arr, m = []) => {
            if (arr.length === 0) {
                result.push(m);
            } else {
                for (let i = 0; i < arr.length; i++) {
                    let curr = arr.slice();
                    let next = curr.splice(i, 1);
                    permute(curr.slice(), m.concat(next));
                }
            }
        };
        permute(inputArr);
        return result;
    };

    // --- 2. LOGIQUE NIVEAU 1 & 2 (Tableaux Dynamiques) ---
    if (level == 1 || level == 2) {

        // --- A. CONFIGURATION DU SCÉNARIO ---
        const isSum = Math.random() > 0.5; // Somme ou Moyenne ?
        const funcName = isSum ? 'SOMME' : 'MOYENNE';
        const label = isSum ? 'Total' : 'Moy.';

        // Orientation du tableau (Horizontal ou Vertical)
        const isHorizontal = Math.random() > 0.5;

        // Décalages visuels (Offsets) pour ne pas toujours commencer en A1
        // Cela change les coordonnées des cellules cibles (ex: B2, C5, F3...)
        const colOffset = randomInt(0, 2); // 0 à 2 colonnes vides à gauche
        const rowOffset = randomInt(0, 3); // 0 à 3 lignes vides en haut

        const padCol = () => new Array(colOffset).fill('');
        let rows = [];

        // Variables pour stocker la logique de réponse
        let targetCellRef = "";  // ex: "C8"
        let dataRangeRef = "";   // ex: "C5:C7"
        let dataCellsList = [];  // ex: ["C5", "C6", "C7"] -> CRUCIAL pour les permutations

        // --- B. CONSTRUCTION VISUELLE DU TABLEAU ---

        // 1. Calcul des dimensions pour l'alignement
        // Horizontal : Offset + (Nom + 3 notes + Resultat) = Offset + 5
        // Vertical : Offset + (Objet + Prix) = Offset + 2
        const contentWidth = isHorizontal ? 5 : 2;
        const totalCols = colOffset + contentWidth;

        // Fonction pour remplir les cases vides à droite
        const alignRow = (rowArray) => {
            while (rowArray.length < totalCols) rowArray.push('');
            return rowArray;
        };

        // 2. Ajout des lignes vides du haut (Offset Ligne)
        for (let k = 0; k < rowOffset; k++) {
            rows.push(new Array(totalCols).fill(''));
        }

        // 3. Remplissage des données selon l'orientation
        if (isHorizontal) {
            // --- MODE HORIZONTAL (ex: Notes d'élève) ---
            const headersRow = [...padCol(), 'Élève', 'Note 1', 'Note 2', 'Note 3', label];
            rows.push(alignRow(headersRow));

            // On génère des notes
            const vals = [randomInt(10, 15), randomInt(10, 15), randomInt(10, 15)];
            const studentRow = [...padCol(), 'Léa', ...vals, '?'];
            rows.push(alignRow(studentRow));

            // CALCUL DES COORDONNÉES
            const dataRowIndex = rowOffset + 2; // +1 header, +1 index 1-based

            // Colonnes : Offset + 1 (Nom) + 1 (Note1)...
            const startColIdx = colOffset + 1;
            const endColIdx = colOffset + 3;
            const targetColIdx = colOffset + 4;

            // Références Excel
            const startColChar = getColLetter(startColIdx);
            const endColChar = getColLetter(endColIdx);
            const targetColChar = getColLetter(targetColIdx);

            targetCellRef = `${targetColChar}${dataRowIndex}`; // ex: E2
            dataRangeRef = `${startColChar}${dataRowIndex}:${endColChar}${dataRowIndex}`; // ex: B2:D2

            // Liste des cellules pour les permutations (ex: B2, C2, D2)
            for (let i = startColIdx; i <= endColIdx; i++) {
                dataCellsList.push(`${getColLetter(i)}${dataRowIndex}`);
            }

        } else {
            // --- MODE VERTICAL (ex: Ticket de caisse) ---
            const headersRow = [...padCol(), 'Objet', 'Prix'];
            rows.push(alignRow(headersRow));

            const itemsCount = 3; // On fixe à 3 pour simplifier les permutations complexes
            for (let i = 0; i < itemsCount; i++) {
                rows.push(alignRow([...padCol(), `Art. ${i + 1}`, randomInt(5, 20)]));
            }

            const labelRow = [...padCol(), label, '?'];
            rows.push(alignRow(labelRow));

            // CALCUL DES COORDONNÉES
            const priceColIdx = colOffset + 1; // La colonne des prix
            const priceColChar = getColLetter(priceColIdx);

            const startRowIdx = rowOffset + 2; // Première ligne de données
            const endRowIdx = rowOffset + 1 + itemsCount; // Dernière ligne de données
            const targetRowIdx = endRowIdx + 1; // Ligne du résultat

            targetCellRef = `${priceColChar}${targetRowIdx}`; // ex: B6
            dataRangeRef = `${priceColChar}${startRowIdx}:${priceColChar}${endRowIdx}`; // ex: B2:B5

            // Liste des cellules pour les permutations (ex: B2, B3, B4)
            for (let i = startRowIdx; i <= endRowIdx; i++) {
                dataCellsList.push(`${priceColChar}${i}`);
            }
        }

        // --- C. GÉNÉRATION DES RÉPONSES (SELON LE NIVEAU) ---

        const canonicalCorrect = `=${funcName}(${dataRangeRef})`; // ex: =SOMME(B2:B4)

        // Headers Visuels pour le composant d'affichage (A, B, C...)
        const headersVisual = Array.from({ length: totalCols }, (_, i) => getColLetter(i));

        // ------------------------------------
        // NIVEAU 1 : QCM (IDENTIFICATION)
        // ------------------------------------
        if (level == 1) {
            // Distracteurs logiques
            const distractors = [
                `${funcName}(${dataRangeRef})`,                    // Oubli du =
                `=${funcName}(${dataRangeRef.replace(':', ';')})`,  // Erreur de séparateur
                `=${isSum ? 'MOYENNE' : 'SOMME'}(${dataRangeRef})`, // Mauvaise fonction
                `=CALCUL(${dataRangeRef})`                          // Fonction inexistante
            ];

            return {
                visualEngine: "GENERIC",
                response_type: "QCM", // FORCE LE MODE QCM
                xp_reward: 5,
                // ÉNONCÉ PRÉCIS : On demande explicitement la fonction
                question: `Quelle formule utilisant la fonction ${funcName} faut-il saisir en ${targetCellRef} pour calculer ${label === 'Total' ? 'le total' : 'la moyenne'} ?`,
                correct: canonicalCorrect,
                // EXPLICATION PÉDAGOGIQUE
                explanation: `Pour être efficace, il faut utiliser la fonction =${funcName}(début:fin).`,
                table_data: { headers: headersVisual, rows: rows },
                options: [canonicalCorrect, ...distractors].sort(() => 0.5 - Math.random())
            };
        }

        // ------------------------------------
        // NIVEAU 2 : SAISIE LIBRE (PERMUTATIONS)
        // ------------------------------------
        else {
            // Scénario A : FACTURE (Multiplication simple)
            // Scénario B : SOMME/MOYENNE (Utilisation de fonction vs Addition manuelle)
            const scenario = Math.random();
            const isFacture = scenario < 0.3; // 30% de chance d'avoir une facture (Multiplication)

            if (isFacture) {
                // CAS FACTURE (On ne force pas "SOMME" ici car c'est une multiplication)
                const headers = ['Article', 'Prix U.', 'Qté', 'Total'];
                // On regénère un petit tableau spécifique pour la facture (plus simple)
                // Pour éviter de casser la logique d'offset, on recrée un tableau simple centré
                // ou on utilise la logique précédente. Simplifions pour ce cas précis :
                const rowDataIndex = randomInt(2, 4); // Ligne variable
                const prix = randomInt(5, 25);
                const qte = randomInt(2, 12);

                const factureRows = [];
                // Remplissage vide avant
                for (let i = 1; i < rowDataIndex; i++) factureRows.push(['', '', '', '']);
                factureRows.push(headers);
                factureRows.push(['Cahier', prix, qte, '?']);

                // Cellules impliquées (B_ROW et C_ROW)
                const currentRow = rowDataIndex + 1; // Index visuel (1-based)
                const correctFacture = `=B${currentRow}*C${currentRow}`;

                return {
                    visualEngine: "GENERIC",
                    response_type: "TEXT",
                    xp_reward: 10,
                    question: `Quelle formule saisir en D${currentRow} pour calculer le montant total (Prix x Quantité) ?`,
                    correct: correctFacture,
                    explanation: "Le total s'obtient en multipliant le Prix (colonne B) par la Quantité (colonne C).",
                    table_data: { headers: ['A', 'B', 'C', 'D'], rows: factureRows },
                    accepted_answers: [
                        `=B${currentRow}*C${currentRow}`, `=C${currentRow}*B${currentRow}`,
                        `B${currentRow}*C${currentRow}`, `C${currentRow}*B${currentRow}`
                    ]
                };
            }
            else {
                // CAS SOMME / MOYENNE (Le cas principal généré plus haut)
                let accepted = [];

                // 1. Les écritures "Fonction" (La réponse attendue)
                accepted.push(`=${funcName}(${dataRangeRef})`);
                accepted.push(`${funcName}(${dataRangeRef})`); // Tolérance oubli =
                accepted.push(`=${funcName}(${dataCellsList.join(';')})`); // Syntaxe point-virgule

                const enFunc = isSum ? 'SUM' : 'AVERAGE';
                accepted.push(`=${enFunc}(${dataRangeRef})`);

                // 2. Les écritures "Manuelles" (Acceptées mais déconseillées)
                const allPermutations = permutator(dataCellsList);

                allPermutations.forEach(perm => {
                    const sumString = perm.join('+'); // ex: "C5+C6+C7"
                    if (isSum) {
                        accepted.push(`=${sumString}`);
                        accepted.push(sumString);
                        accepted.push(`=(${sumString})`);
                    } else {
                        const count = dataCellsList.length;
                        accepted.push(`=(${sumString})/${count}`);
                        accepted.push(`(${sumString})/${count}`);
                    }
                });

                return {
                    visualEngine: "GENERIC",
                    response_type: "TEXT", // Input clavier
                    xp_reward: 10,
                    // ÉNONCÉ PRÉCIS
                    question: `Quelle formule utilisant une fonction (ex: ${funcName}) faut-il saisir en ${targetCellRef} pour calculer ${label === 'Total' ? 'le total' : 'la moyenne'} ?`,
                    correct: canonicalCorrect,
                    // EXPLICATION PÉDAGOGIQUE
                    explanation: `La réponse idéale est ${canonicalCorrect}. On peut aussi additionner manuellement (${isSum ? '=' + dataCellsList[0] + '+' + dataCellsList[1] + '...' : '.../3'}), mais cette méthode devient impossible à gérer s'il y a 100 lignes à calculer.`,
                    table_data: { headers: headersVisual, rows: rows },
                    accepted_answers: accepted // Toutes les variantes fonctionnent
                };
            }
        }
    }

    // --- 3. NIVEAU 3 : RECOPIE & DOLLARS ($) ---
    else {
        const isConversion = Math.random() > 0.5;
        let rows, startFormula, correct, explanation, headersBase;

        const alignRowLv3 = (arr) => {
            while (arr.length < 3) arr.push('');
            return arr;
        };

        if (isConversion) {
            headersBase = ['A', 'B', 'C'];
            rows = [
                alignRowLv3(['Taux :', '1.1', '']),
                alignRowLv3(['Euros', 'Dollars', '']),
                alignRowLv3(['10', '?', '']),
                alignRowLv3(['20', '...', ''])
            ];
            startFormula = `=A3*$B$1`;
            correct = `=A4*$B$1`;
            explanation = `Le symbole $ bloque la cellule B1 (le taux). En descendant, A3 devient A4, mais $B$1 ne change pas.`;

            return {
                visualEngine: "GENERIC",
                question: `En B3, on a saisi "${startFormula}". On étire vers le bas en B4.\nQuelle sera la formule en B4 ?`,
                correct: correct,
                table_data: { headers: headersBase, rows: rows },
                response_type: "QCM",
                xp_reward: 15,
                explanation: explanation,
                options: [correct, `=A4*B2`, `=A3*$B$1`, `=A4*B1`].sort(() => 0.5 - Math.random())
            };
        } else {
            headersBase = ['A', 'B', 'C'];
            rows = [
                alignRowLv3(['Réduction', '0.8', '']),
                alignRowLv3(['Article', 'Prix', 'Soldé']),
                alignRowLv3(['Pantalon', '50', '?']),
                alignRowLv3(['Chemise', '30', '...'])
            ];
            startFormula = `=B3*$B$1`;
            correct = `=B4*$B$1`;
            explanation = `Le coefficient est fixe en B1 ($B$1). Le prix (B3) descend en B4.`;

            return {
                visualEngine: "GENERIC",
                question: `En C3, on a la formule "${startFormula}". On l'étire vers le bas en C4.\nQuelle formule obtient-on ?`,
                correct: correct,
                table_data: { headers: headersBase, rows: rows },
                response_type: "QCM",
                xp_reward: 15,
                explanation: explanation,
                options: [correct, `=B4*B2`, `=B3*$B$1`, `=B4*B1`].sort(() => 0.5 - Math.random())
            };
        }
    }
};