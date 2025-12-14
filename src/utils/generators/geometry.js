import { round, rand } from './utils'; // Ajuste selon les besoins

// PYTHAGORE //


// --- TRIPLETS NIVEAU 1 (Calcul Mental Strict) ---
// On ne dépasse jamais 12 au carré (144).
// Le triplet 5-12-13 est risqué pour le calcul de côté (13²=169), on le réserve pour l'hypoténuse ou on l'évite.
// Ici on reste sur du très sûr : tables de 3, 4, 5, 6, 8, 10.
const LEVEL1_TRIPLES = [
    [3, 4, 5],   // Carrés : 9, 16, 25
    [6, 8, 10]   // Carrés : 36, 64, 100
];

// --- TRIPLETS NIVEAU 2 (Intermédiaire) ---
const LEVEL2_TRIPLES = [
    [5, 12, 13], // 25 + 144 = 169
    [9, 12, 15], // 81 + 144 = 225
    [8, 15, 17], // 64 + 225 = 289
    [12, 16, 20] // 144 + 256 = 400
];

export const generatePythagoreData = (level) => {
    // 1. Géométrie
    const labels = [['A', 'B', 'C'], ['I', 'J', 'K'], ['R', 'S', 'T'], ['E', 'F', 'G'], ['L', 'M', 'N'], ['X', 'Y', 'Z']];
    const [A, B, C] = labels[Math.floor(Math.random() * labels.length)];
    // Convention : Angle droit en A (premier point)

    // Configs
    const units = ['cm', 'm', 'mm', 'dm'];
    let mainUnit = units[Math.floor(Math.random() * (level === 3 ? 4 : 2))];
    let unitAB = mainUnit, unitAC = mainUnit, unitBC = mainUnit;
    let conversionNeeded = false;
    let qType = 'CALC';
    let allowCalc = false;

    let ab, ac, bc;
    let targetType; // 'hypotenuse', 'side', 'formula_hyp', 'formula_side'
    let targetKey;
    let correct;
    let choices = new Set(); // Set gère l'unicité, mais on sécurisera à la fin

    // ========================================================================
    // NIVEAU 1 : MENTAL STRICT (Max 12²) & COURS
    // ========================================================================
    if (level === 1) {
        allowCalc = true; // Calculatrice autorisée (selon votre demande précédente "On inclut la calculatrice")

        // 50% Question de Cours (Formules)
        if (Math.random() < 0.5) {
            qType = 'EQUALITY';

            // Valeurs fictives pour l'affichage du triangle
            ab = 3; ac = 4; bc = 5;

            const askHypotenuse = Math.random() > 0.5;

            if (askHypotenuse) {
                // Formule de l'hypoténuse (Addition)
                targetType = 'formula_hyp';
                correct = `${B}${C}² = ${A}${B}² + ${A}${C}²`;

                choices.add(correct);
                choices.add(`${A}${B}² = ${A}${C}² + ${B}${C}²`); // Fausse hypoténuse
                choices.add(`${B}${C}² = ${A}${B}² - ${A}${C}²`); // Erreur signe
                choices.add(`${B}${C} = ${A}${B} + ${A}${C}`);    // Pas de carrés
            } else {
                // Formule d'un côté (Soustraction)
                targetType = 'formula_side';
                const targetSide = Math.random() > 0.5 ? `${A}${B}` : `${A}${C}`;
                const otherSide = targetSide === `${A}${B}` ? `${A}${C}` : `${A}${B}`;

                correct = `${targetSide}² = ${B}${C}² - ${otherSide}²`;

                choices.add(correct);
                choices.add(`${targetSide}² = ${B}${C}² + ${otherSide}²`); // Erreur signe (+)
                choices.add(`${targetSide}² = ${otherSide}² - ${B}${C}²`); // Petit - Grand
                choices.add(`${B}${C}² = ${targetSide}² - ${otherSide}²`); // Faux sens
            }
        }
        else {
            // 50% Calcul Mental Simple (Triplets [3,4,5] et [6,8,10] uniquement)
            qType = 'CALC';
            const triple = LEVEL1_TRIPLES[Math.floor(Math.random() * LEVEL1_TRIPLES.length)];
            ab = triple[0]; ac = triple[1]; bc = triple[2];

            targetType = Math.random() > 0.5 ? 'hypotenuse' : 'side';

            if (targetType === 'hypotenuse') {
                targetKey = B + C;
                correct = bc;
                choices.add(ab + ac); // Erreur addition simple
                choices.add(ab * ab + ac * ac); // Oubli racine
                choices.add(Math.abs(ac - ab));
            } else {
                targetKey = Math.random() > 0.5 ? A + B : A + C;
                const knownSide = (targetKey === A + B) ? ac : ab;
                correct = (targetKey === A + B) ? ab : ac;
                choices.add(bc + knownSide);
                choices.add(bc - knownSide);
                choices.add(bc * bc + knownSide * knownSide); // Addition des carrés
            }
        }
    }

    // ========================================================================
    // NIVEAU 2 : INTERMÉDIAIRE (SANS CALC)
    // ========================================================================
    else if (level === 2) {
        allowCalc = false; // Interdite
        qType = 'CALC';
        targetType = Math.random() > 0.5 ? 'hypotenuse' : 'side';

        const triple = LEVEL2_TRIPLES[Math.floor(Math.random() * LEVEL2_TRIPLES.length)];
        ab = triple[0]; ac = triple[1]; bc = triple[2];

        if (targetType === 'hypotenuse') targetKey = B + C;
        else targetKey = Math.random() > 0.5 ? A + B : A + C;

        correct = (targetKey === B + C) ? bc : (targetKey === A + B ? ab : ac);

        choices.add(correct);
        if (targetType === 'hypotenuse') {
            choices.add(ab + ac);
            choices.add(ab * ab + ac * ac);
        } else {
            const knownSide = (targetKey === A + B) ? ac : ab;
            choices.add(bc - knownSide);
            choices.add(bc * bc - knownSide * knownSide);
        }
    }

    // ========================================================================
    // NIVEAU 3 : EXPERT (AVEC CALC & UNITÉS)
    // ========================================================================
    else {
        allowCalc = true;
        qType = 'CALC';
        targetType = Math.random() > 0.5 ? 'hypotenuse' : 'side';

        if (Math.random() < 0.3) {
            conversionNeeded = true;
            mainUnit = 'cm';
            // Valeurs qui tombent juste
            let valInM = (rand(1, 30) / 10);
            let valInCm = rand(10, 90);
            ab = Math.round(valInM * 100);
            unitAB = 'm';
            ac = valInCm;
            unitAC = 'cm';
            bc = Math.sqrt(ab * ab + ac * ac);
        } else {
            ab = round(Math.random() * 15 + 3);
            ac = round(Math.random() * 15 + 3);
            bc = Math.sqrt(ab * ab + ac * ac);
        }

        const realBC = Math.sqrt(ab * ab + ac * ac);
        const vals = { [A + B]: ab, [A + C]: ac, [B + C]: round(realBC) };

        if (targetType === 'hypotenuse') targetKey = B + C;
        else targetKey = Math.random() > 0.5 ? A + B : A + C;

        correct = vals[targetKey];
        choices.add(correct);

        // Distracteurs proches
        choices.add(round(correct * 1.1));
        choices.add(round(correct * 0.9));
        choices.add(round(correct + 10));
    }

    // --- SÉCURISATION DES CHOIX ---
    // Remplissage si pas assez de choix
    let attempts = 0;
    while (choices.size < 4 && attempts < 50) {
        attempts++;
        if (qType === 'EQUALITY') break; // Les 4 formules sont déjà définies
        let noise = Math.floor(Math.random() * 10) + 1;
        let fake = round(correct + (Math.random() > 0.5 ? 1 : -1) * noise);
        if (fake > 0 && fake !== correct) choices.add(fake);
    }

    // Conversion en tableau
    let options = Array.from(choices);

    // CRUCIAL : On vérifie que la bonne réponse est dedans. Si non (rare), on la force.
    if (!options.includes(correct)) {
        options[0] = correct;
    }

    // Mélange ou Tri
    if (qType === 'CALC') {
        options.sort((a, b) => a - b);
    } else {
        options.sort(() => Math.random() - 0.5);
    }

    // --- CONSTRUCTION DES DONNÉES D'AFFICHAGE ---
    const given = {};
    if (qType === 'CALC') {
        const vals = { [A + B]: ab, [A + C]: ac, [B + C]: bc ? round(bc) : null };
        const formatGiven = (val, unit) => {
            if (conversionNeeded && unit === 'm' && mainUnit === 'cm') return val / 100;
            return val;
        };
        if (targetKey !== A + B) given[A + B] = { val: formatGiven(vals[A + B], unitAB), unit: unitAB };
        if (targetKey !== A + C) given[A + C] = { val: formatGiven(vals[A + C], unitAC), unit: unitAC };
        if (targetKey !== B + C) given[B + C] = { val: formatGiven(vals[B + C], unitBC), unit: unitBC };
    }
    // Note: Pour 'EQUALITY', 'given' reste vide, mais 'vals' contient les coordonnées pour dessiner le triangle

    return {
        points: { Right: A, Top: B, Bottom: C },
        vals: { [A + B]: ab, [A + C]: ac, [B + C]: bc ? round(bc) : null },
        given,
        targetKey,
        targetType,
        correct,
        options,
        level,
        mainUnit,
        conversionNeeded,
        qType,
        allowCalc
    };
};




export const generateThalesData = (level = 1) => {
    // 1. CONFIGURATION
    let type = 'triangle';
    if (level > 1) {
        type = Math.random() > 0.5 ? 'triangle' : 'papillon';
    }

    // 2. COEFFICIENT K
    let k;
    if (level === 1) {
        const kInt = [2, 3, 4];
        k = kInt[Math.floor(Math.random() * kInt.length)];
    } else {
        const kDec = [1.5, 2.5, 0.4, 0.6, 0.8, 1.2, 2.4];
        k = kDec[Math.floor(Math.random() * kDec.length)];
    }

    // 3. LONGUEURS DE BASE
    const baseAB = Math.floor(Math.random() * 4) + 4;
    const baseAC = Math.floor(Math.random() * 4) + 4;
    const baseBC = Math.floor(Math.random() * 5) + 5;

    const round = (n) => Math.round(n * 10) / 10;

    // Calcul des "grandes" longueurs
    const vals = {
        AB: baseAB,
        AD: round(baseAB * k),
        AC: baseAC,
        AE: round(baseAC * k),
        BC: baseBC,
        DE: round(baseBC * k)
    };

    // --- CORRECTION MAJEURE ICI ---
    // On utilise Math.abs() pour éviter les longueurs négatives en cas de réduction (k < 1)
    if (type === 'triangle') {
        vals.BD = round(Math.abs(vals.AD - vals.AB));
        vals.CE = round(Math.abs(vals.AE - vals.AC));
    } else {
        vals.BD = round(vals.AD + vals.AB);
        vals.CE = round(vals.AE + vals.AC);
    }

    // 4. CHOIX DE L'INCONNUE
    let keys;
    if (level === 3) {
        if (Math.random() < 0.6) {
            keys = ['BD', 'CE'];
        } else {
            keys = ['AD', 'AE', 'DE'];
        }
    } else {
        keys = ['AD', 'AE', 'DE', 'AB', 'AC', 'BC'];
    }

    // Filtre des valeurs invalides (NaN ou 0)
    keys = keys.filter(key => vals[key] > 0.1);

    // Fallback si le filtre a tout vidé (très rare avec la correction Math.abs)
    if (keys.length === 0) keys = ['AD'];

    const targetKey = keys[Math.floor(Math.random() * keys.length)];
    const correctAnswer = vals[targetKey];

    // 5. ÉNONCÉ (Données fournies)
    let given = {};

    if (targetKey === 'BD') {
        given['AB'] = vals.AB;
        if (Math.random() > 0.5) { given['AC'] = vals.AC; given['AE'] = vals.AE; }
        else { given['BC'] = vals.BC; given['DE'] = vals.DE; }
    }
    else if (targetKey === 'CE') {
        given['AC'] = vals.AC;
        if (Math.random() > 0.5) { given['AB'] = vals.AB; given['AD'] = vals.AD; }
        else { given['BC'] = vals.BC; given['DE'] = vals.DE; }
    }
    else if (['AB', 'AD'].includes(targetKey)) {
        given[targetKey === 'AB' ? 'AD' : 'AB'] = vals[targetKey === 'AB' ? 'AD' : 'AB'];
        if (Math.random() > 0.5) { given['AC'] = vals.AC; given['AE'] = vals.AE; }
        else { given['BC'] = vals.BC; given['DE'] = vals.DE; }
    }
    else if (['AC', 'AE'].includes(targetKey)) {
        given[targetKey === 'AC' ? 'AE' : 'AC'] = vals[targetKey === 'AC' ? 'AE' : 'AC'];
        if (Math.random() > 0.5) { given['AB'] = vals.AB; given['AD'] = vals.AD; }
        else { given['BC'] = vals.BC; given['DE'] = vals.DE; }
    }
    else {
        given[targetKey === 'BC' ? 'DE' : 'BC'] = vals[targetKey === 'BC' ? 'DE' : 'BC'];
        if (Math.random() > 0.5) { given['AB'] = vals.AB; given['AD'] = vals.AD; }
        else { given['AC'] = vals.AC; given['AE'] = vals.AE; }
    }

    // 6. GÉNÉRATION QCM SÉCURISÉE
    let options = new Set();
    options.add(correctAnswer);

    if (targetKey === 'BD' && type === 'triangle') options.add(vals.AD);
    if (targetKey === 'CE' && type === 'triangle') options.add(vals.AE);

    if (k !== 1 && k !== 0) options.add(round(correctAnswer * k)); // Sécurité division par zero
    if (k !== 0) options.add(round(correctAnswer / k));

    options.add(round(correctAnswer + 1));
    options.add(round(Math.abs(correctAnswer - 0.5))); // Math.abs par sécurité

    // --- CORRECTION BOUCLE INFINIE ---
    // Ajout d'un compteur de sécurité 'attempts'
    let attempts = 0;
    while (options.size < 4 && attempts < 50) { // <-- STOP APRÈS 50 ESSAIS
        attempts++;
        const fake = round(correctAnswer + (Math.random() * 10 - 5));
        if (fake > 0 && !options.has(fake)) options.add(fake);
    }

    // Si on n'a toujours pas 4 options (très improbable), on remplit brutalement
    while (options.size < 4) {
        options.add(round(correctAnswer + options.size + 10));
    }

    return {
        level,
        type,
        vals,
        given,
        targetKey,
        correct: correctAnswer,
        options: Array.from(options).sort((a, b) => a - b).slice(0, 4),
    };
};
