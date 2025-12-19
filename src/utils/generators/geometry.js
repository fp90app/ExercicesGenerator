import { round, rand, pick } from './utils'; // Ajuste selon les besoins

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


const rotatePoints = (points, angleDeg) => {
    const rad = angleDeg * (Math.PI / 180);
    return points.map(p => ({
        x: p.x * Math.cos(rad) - p.y * Math.sin(rad),
        y: p.x * Math.sin(rad) + p.y * Math.cos(rad)
    }));
};

// Fonction pour calculer le centre (Moyenne des diagonales)
const getCenter = (p1, p3) => ({
    x: (p1.x + p3.x) / 2,
    y: (p1.y + p3.y) / 2
});

// Formes de base (centrées en 0,0)
const SHAPES = {
    SQUARE: [{ x: -50, y: 50 }, { x: 50, y: 50 }, { x: 50, y: -50 }, { x: -50, y: -50 }],
    RECTANGLE: [{ x: -70, y: 40 }, { x: 70, y: 40 }, { x: 70, y: -40 }, { x: -70, y: -40 }],
    RHOMBUS: [{ x: 0, y: 80 }, { x: 50, y: 0 }, { x: 0, y: -80 }, { x: -50, y: 0 }],
    PARALLELOGRAM: [{ x: -60, y: 50 }, { x: 40, y: 50 }, { x: 60, y: -50 }, { x: -40, y: -50 }],
    TRIANGLE_ISO: [{ x: 0, y: 60 }, { x: -40, y: -40 }, { x: 40, y: -40 }],
    TRIANGLE_EQU: [{ x: 0, y: 50 }, { x: -43, y: -25 }, { x: 43, y: -25 }]
};

export const generateGeometryQuestion = (config) => {
    const level = config.level || 1;
    const rotation = rand(0, 360);

    let qText, options, correct, codings = [], points = [], responseType = "QCM";
    let explanation = "";
    let extraPoints = []; // Pour ajouter le point O sans casser le tracé du polygone

    // ========================================================================
    // NIVEAU 1 : IDENTIFICATION (Vocabulaire & Nature)
    // ========================================================================
    if (level === 1) {
        const type = pick(['carré', 'rectangle', 'losange', 'triangle_iso', 'triangle_equ']);

        if (type === 'carré') {
            points = rotatePoints(SHAPES.SQUARE, rotation);
            qText = "Quelle est la nature de ce quadrilatère ?";
            correct = "Un carré";
            options = ["Un losange", "Un rectangle", "Un carré", "Un trapèze"];
            codings = [
                { type: 'tick', indices: [0, 1] }, { type: 'tick', indices: [1, 2] },
                { type: 'tick', indices: [2, 3] }, { type: 'tick', indices: [3, 0] },
                { type: 'right_angle', indices: [0, 1, 2] }
            ];
            explanation = "Il possède 4 côtés de même longueur et un angle droit.";
        }
        else if (type === 'rectangle') {
            points = rotatePoints(SHAPES.RECTANGLE, rotation);
            qText = "Quelle est la nature de ce quadrilatère ?";
            correct = "Un rectangle";
            options = ["Un carré", "Un losange", "Un rectangle", "Un parallélogramme"];
            codings = [
                { type: 'tick', indices: [0, 1] }, { type: 'tick', indices: [2, 3] },
                { type: 'double_tick', indices: [1, 2] }, { type: 'double_tick', indices: [3, 0] },
                { type: 'right_angle', indices: [3, 0, 1] }
            ];
            explanation = "C'est un quadrilatère avec 3 angles droits (ou côtés opposés égaux et un angle droit).";
        }
        else if (type === 'losange') {
            points = rotatePoints(SHAPES.RHOMBUS, rotation);
            qText = "Quelle est la nature de ce quadrilatère ?";
            correct = "Un losange";
            options = ["Un carré", "Un losange", "Un rectangle", "Un cerf-volant"];
            codings = [
                { type: 'double_tick', indices: [0, 1] }, { type: 'double_tick', indices: [1, 2] },
                { type: 'double_tick', indices: [2, 3] }, { type: 'double_tick', indices: [3, 0] }
            ];
            explanation = "Il a ses 4 côtés de même longueur, mais pas d'angle droit marqué.";
        }
        else if (type === 'triangle_iso') {
            points = rotatePoints(SHAPES.TRIANGLE_ISO, rotation);
            qText = "Quelle est la nature de ce triangle ?";
            correct = "Isocèle";
            options = ["Isocèle", "Équilatéral", "Rectangle", "Quelconque"];
            codings = [{ type: 'tick', indices: [0, 1] }, { type: 'tick', indices: [0, 2] }];
            explanation = "Il a deux côtés de même longueur.";
        }
        else { // Equilatéral
            points = rotatePoints(SHAPES.TRIANGLE_EQU, rotation);
            qText = "Quelle est la nature de ce triangle ?";
            correct = "Équilatéral";
            options = ["Isocèle", "Équilatéral", "Rectangle", "Rectangle isocèle"];
            codings = [
                { type: 'tick', indices: [0, 1] }, { type: 'tick', indices: [1, 2] }, { type: 'tick', indices: [2, 0] }
            ];
            explanation = "Il a ses 3 côtés de même longueur.";
        }
    }

    // ========================================================================
    // NIVEAU 2 : CALCULS (Périmètres, Aires, Diagonales)
    // ========================================================================
    else if (level === 2) {
        responseType = "NUMERIC";
        // On introduit des demis (ex: 5.5)
        const hasHalf = Math.random() > 0.5;
        const baseVal = rand(4, 12);
        const val1 = hasHalf ? baseVal + 0.5 : baseVal;

        const mode = pick(['perim_carre', 'aire_carre', 'aire_rect', 'diag_rect']);

        if (mode === 'perim_carre') {
            points = rotatePoints(SHAPES.SQUARE, rotation);
            qText = `Ceci est un carré de côté ${val1} cm. Quel est son périmètre (en cm) ?`;
            correct = String(val1 * 4).replace('.', ','); // Format français
            // Pas d'options en mode numérique
            codings = [
                { type: 'tick', indices: [0, 1] }, { type: 'tick', indices: [1, 2] },
                { type: 'tick', indices: [2, 3] }, { type: 'tick', indices: [3, 0] },
                { type: 'right_angle', indices: [0, 1, 2] }
            ];
            explanation = `P = 4 × côté = 4 × ${val1} = ${val1 * 4} cm.`;
        }
        else if (mode === 'aire_carre') {
            points = rotatePoints(SHAPES.SQUARE, rotation);
            qText = `Ceci est un carré de côté ${val1} cm. Quelle est son AIRE (en cm²) ?`;
            correct = String(val1 * val1).replace('.', ',');
            codings = [
                { type: 'tick', indices: [0, 1] }, { type: 'tick', indices: [1, 2] },
                { type: 'tick', indices: [2, 3] }, { type: 'tick', indices: [3, 0] },
                { type: 'right_angle', indices: [0, 1, 2] }
            ];
            explanation = `Aire = côté × côté = ${val1} × ${val1} = ${val1 * val1} cm².`;
        }
        else if (mode === 'aire_rect') {
            points = rotatePoints(SHAPES.RECTANGLE, rotation);
            const val2 = hasHalf ? rand(2, baseVal - 1) : rand(2, baseVal - 1) + 0.5; // L'autre dimension
            qText = `C'est un rectangle. Longueur = ${Math.max(val1, val2)} cm, Largeur = ${Math.min(val1, val2)} cm. Calculer l'AIRE (cm²).`;
            correct = String(val1 * val2).replace('.', ',');
            codings = [
                { type: 'tick', indices: [0, 1] }, { type: 'tick', indices: [2, 3] },
                { type: 'double_tick', indices: [1, 2] }, { type: 'double_tick', indices: [3, 0] },
                { type: 'right_angle', indices: [0, 1, 2] }
            ];
            explanation = `Aire = L × l = ${val1} × ${val2} = ${val1 * val2} cm².`;
        }
        else { // Diagonales rectangle avec Point O
            points = rotatePoints(SHAPES.RECTANGLE, rotation);
            // Ajout du point O (Centre)
            const center = getCenter(points[0], points[2]);
            extraPoints = [{ x: center.x, y: center.y, label: 'O' }];

            qText = `Rectangle de centre O. Si OA = ${val1} cm, combien mesure la diagonale entière AC ?`;
            correct = String(val1 * 2).replace('.', ',');
            codings = [
                { type: 'right_angle', indices: [0, 1, 2] },
                { type: 'right_angle', indices: [1, 2, 3] },
                { type: 'right_angle', indices: [2, 3, 0] }
            ];
            explanation = `Les diagonales d'un rectangle ont la même longueur et se coupent en leur milieu. AC = 2 × OA = ${val1 * 2} cm.`;
        }
    }

    // ========================================================================
    // NIVEAU 3 : PROPRIÉTÉS & DÉDUCTIONS (QCM avec pièges)
    // ========================================================================
    else {
        responseType = "QCM";
        // On varie les scénarios pour éviter la répétition "Est-ce un carré ?"
        const scenario = pick(['false_square', 'prop_diag_losange', 'prop_diag_rect', 'reverse_perim', 'def_parallelo']);

        if (scenario === 'false_square') {
            // Le piège classique : Visuellement un carré, codé comme losange
            points = rotatePoints(SHAPES.SQUARE, rotation);
            qText = "D'après les codages SEULS, peut-on affirmer que c'est un carré ?";
            correct = "Non";
            options = ["Oui", "Non", "On ne peut pas savoir", "C'est un rectangle"];
            // Piège : Pas d'angle droit !
            codings = [
                { type: 'tick', indices: [0, 1] }, { type: 'tick', indices: [1, 2] },
                { type: 'tick', indices: [2, 3] }, { type: 'tick', indices: [3, 0] }
            ];
            explanation = "Les codages indiquent 4 côtés de même longueur (Losange). Sans angle droit codé, ce n'est pas forcément un carré.";
        }
        else if (scenario === 'prop_diag_losange') {
            // Propriété des diagonales du losange
            points = rotatePoints(SHAPES.RHOMBUS, rotation);
            const center = getCenter(points[0], points[2]);
            extraPoints = [{ x: center.x, y: center.y, label: 'O' }];

            qText = "ABCD est un losange de centre O. Quelle propriété est VRAIE ?";
            correct = "(AC) et (BD) sont perpendiculaires";
            options = [
                "(AC) et (BD) sont perpendiculaires",
                "[AC] et [BD] ont la même longueur",
                "OA = AB",
                "Les diagonales ne se coupent pas"
            ];
            codings = [
                { type: 'double_tick', indices: [0, 1] }, { type: 'double_tick', indices: [1, 2] },
                { type: 'double_tick', indices: [2, 3] }, { type: 'double_tick', indices: [3, 0] }
            ];
            explanation = "Dans un losange, les diagonales sont perpendiculaires et se coupent en leur milieu.";
        }
        else if (scenario === 'prop_diag_rect') {
            // Propriété des diagonales du rectangle
            points = rotatePoints(SHAPES.RECTANGLE, rotation);
            qText = "Quelle affirmation sur les diagonales de cette figure est vraie ?";
            correct = "Elles ont la même longueur";
            options = [
                "Elles sont perpendiculaires",
                "Elles ont la même longueur",
                "Elles sont parallèles",
                "Elles sont égales aux côtés"
            ];
            codings = [
                { type: 'right_angle', indices: [0, 1, 2] },
                { type: 'right_angle', indices: [1, 2, 3] },
                { type: 'right_angle', indices: [2, 3, 0] }
            ];
            explanation = "C'est un rectangle (3 angles droits). Ses diagonales ont la même longueur.";
        }
        else if (scenario === 'reverse_perim') {
            // Logique inverse : Trouver le côté à partir du périmètre
            points = rotatePoints(SHAPES.SQUARE, rotation);
            const side = rand(3, 9);
            const perim = side * 4;
            qText = `Le périmètre de ce carré est de ${perim} cm. Combien mesure un côté ?`;
            correct = String(side);
            options = [String(side), String(perim / 2), String(perim / 4 + 2), String(side * side)];
            codings = [
                { type: 'tick', indices: [0, 1] }, { type: 'tick', indices: [1, 2] },
                { type: 'tick', indices: [2, 3] }, { type: 'tick', indices: [3, 0] },
                { type: 'right_angle', indices: [0, 1, 2] }
            ];
            explanation = `Côté = Périmètre ÷ 4 = ${perim} ÷ 4 = ${side} cm.`;
        }
        else { // def_parallelo
            points = rotatePoints(SHAPES.PARALLELOGRAM, rotation);
            qText = "Si un quadrilatère a ses diagonales qui se coupent en leur milieu, alors c'est forcément un...";
            correct = "Parallélogramme";
            options = ["Carré", "Rectangle", "Losange", "Parallélogramme"];
            codings = []; // Pas de codage, question théorique sur la forme
            explanation = "C'est la définition générale. Carré, Rectangle et Losange sont des cas particuliers, mais 'Parallélogramme' est la réponse toujours vraie.";
        }
    }

    return {
        question: qText,
        options: responseType === "QCM" ? options.map(o => ({ value: o, isCorrect: o === correct })) : null,
        correct: correct,
        explanation: explanation,
        responseType: responseType,
        visualEngine: 'ENGINE_GEOMETRY',
        visualConfig: {
            points: points,
            extraPoints: extraPoints, // Pour afficher le centre O
            codings: codings
        }
    };
};