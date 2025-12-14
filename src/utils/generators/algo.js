import { rand, pick } from './utils';

// --- AUTO 39 - ALGORITHMIQUE (SCRATCH) ---
// Fonction utilitaire pour générer une séquence linéaire d'opérations


// --- UTILITAIRES ---


// Dictionnaire des orientations
const DIRECTIONS = {
    "90": { name: "à droite", axis: "x", sign: 1 },
    "-90": { name: "à gauche", axis: "x", sign: -1 },
    "0": { name: "vers le haut", axis: "y", sign: 1 },
    "180": { name: "vers le bas", axis: "y", sign: -1 }
};

// -------------------------------------------------------------------------
// GÉNÉRATEUR 1 : Séquences de Calcul (Mode Enrichi & Varié)
// -------------------------------------------------------------------------
const generateCalcSequence = (difficulty) => {
    // difficulty: 1 (Simple), 2 (Relatifs + Carrés/Doubles), 3 (Complexes n²+n)

    const allowNeg = difficulty > 1;
    const useLoop = difficulty !== 3 && Math.random() > 0.6;

    const vName = pick(["x", "n", "R", "score", "total", "A"]);

    let startMax = difficulty === 3 ? 5 : 10;
    let currentVal = rand(1, startMax);
    if (allowNeg && Math.random() > 0.5) currentVal = -currentVal;

    let blocks = [
        { type: "event", isHat: true, text: "quand 🏁 est cliqué" },
        { type: "var", text: `mettre ${vName} à ${currentVal}`, highlight: vName }
    ];

    let explanation = [`1️⃣ Départ : ${vName} = ${currentVal}.`];

    // --- CAS A : BOUCLE SIMPLE (Niv 1 & 2) ---
    if (useLoop) {
        const tours = rand(3, 5);
        const isComplexLoop = difficulty > 1 && Math.random() > 0.5;

        let valAjout, textOp, calcExplication;

        if (isComplexLoop) {
            const base = rand(2, 4);
            const mult = rand(2, 3);
            valAjout = base * mult;
            textOp = `ajouter ${base} * ${mult} à ${vName}`;
            calcExplication = `ajouter le ${mult === 2 ? 'double' : 'triple'} de ${base} (${valAjout})`;
        } else {
            valAjout = rand(2, 5) * (allowNeg && Math.random() > 0.5 ? -1 : 1);
            textOp = `ajouter ${valAjout} à ${vName}`;
            calcExplication = `ajouter ${valAjout}`;
        }

        blocks.push({ type: "control", text: `répéter ${tours} fois` });
        blocks.push({ type: "var", text: textOp, indent: 1, highlight: vName });

        const totalAjout = tours * valAjout;
        const oldVal = currentVal;
        currentVal += totalAjout;

        explanation.push(`2️⃣ On répète ${tours} fois "${calcExplication}".`);
        explanation.push(`   Cela revient à ajouter ${tours} × ${valAjout} = ${totalAjout}.`);
        explanation.push(`3️⃣ Calcul : ${oldVal} + (${totalAjout}) = ${currentVal}.`);
    }
    // --- CAS B : SÉQUENCE LINÉAIRE VARIÉE (Niv 1, 2, 3) ---
    else {
        const steps = difficulty === 1 ? 3 : (difficulty === 2 ? 3 : 2);

        for (let i = 0; i < steps; i++) {
            let opType = "standard";
            const r = Math.random();

            if (difficulty === 2) {
                if (r < 0.3) opType = "special_simple";
            } else if (difficulty === 3) {
                if (r < 0.4) opType = "special_simple";
                else if (r < 0.7) opType = "special_complex";
            }

            // TYPE 1 : OPÉRATIONS CLASSIQUES (+ - *)
            if (opType === "standard") {
                const subType = pick(["add", "sub", "mult"]);
                let val = rand(2, 5);

                if (subType === "mult") {
                    currentVal *= val;
                    blocks.push({ type: "var", text: `mettre ${vName} à ${vName} * ${val}`, highlight: vName });
                    explanation.push(`➡️ On multiplie par ${val} : ${currentVal / val} × ${val} = ${currentVal}.`);
                } else if (subType === "add") {
                    currentVal += val;
                    blocks.push({ type: "var", text: `ajouter ${val} à ${vName}`, highlight: vName });
                    explanation.push(`➡️ On ajoute ${val} : résultat ${currentVal}.`);
                } else {
                    currentVal -= val;
                    blocks.push({ type: "var", text: `ajouter -${val} à ${vName}`, highlight: vName });
                    explanation.push(`➡️ On soustrait ${val} : résultat ${currentVal}.`);
                }
            }

            // TYPE 2 : FONCTIONS SPÉCIALES SIMPLES (Carré, Double, Triple)
            else if (opType === "special_simple") {
                const func = pick(["carre", "double", "triple", "add_multiple"]);

                if (func === "carre" && Math.abs(currentVal) <= 12) {
                    const old = currentVal;
                    currentVal = currentVal * currentVal;

                    // --- VARIATION DU TEXTE POUR LE CARRÉ ---
                    const carreOptions = [
                        `${vName} * ${vName}`,
                        `${vName}²`,
                        `${vName} au carré`,
                        `carré de ${vName}`
                    ];
                    const txtCarre = pick(carreOptions);

                    blocks.push({ type: "var", text: `mettre ${vName} à ${txtCarre}`, highlight: vName });
                    explanation.push(`➡️ On met au carré (${old}²) : ${old} × ${old} = ${currentVal}.`);
                }
                else if (func === "double") {
                    currentVal *= 2;
                    blocks.push({ type: "var", text: `mettre ${vName} à ${vName} * 2`, highlight: vName });
                    explanation.push(`➡️ On prend le double : résultat ${currentVal}.`);
                }
                else if (func === "triple") {
                    currentVal *= 3;
                    blocks.push({ type: "var", text: `mettre ${vName} à ${vName} * 3`, highlight: vName });
                    explanation.push(`➡️ On prend le triple : résultat ${currentVal}.`);
                }
                else {
                    const base = rand(2, 5);
                    const mult = rand(2, 3);
                    const toAdd = base * mult;
                    currentVal += toAdd;
                    const vocab = mult === 2 ? "double" : "triple";
                    blocks.push({ type: "var", text: `ajouter (${base} * ${mult}) à ${vName}`, highlight: vName });
                    explanation.push(`➡️ On ajoute le ${vocab} de ${base} (${toAdd}) : résultat ${currentVal}.`);
                }
            }

            // TYPE 3 : FONCTIONS EXPERTES (Niveau 3)
            else if (opType === "special_complex") {
                const func = pick(["sq_plus_n", "sq_minus_k"]);

                if (Math.abs(currentVal) > 10) {
                    currentVal -= 5;
                    blocks.push({ type: "var", text: `ajouter -5 à ${vName}`, highlight: vName });
                    explanation.push(`➡️ On soustrait 5 : résultat ${currentVal}.`);
                }
                else if (func === "sq_plus_n") {
                    const old = currentVal;
                    currentVal = (old * old) + old;

                    const txtPart = pick([`${vName} * ${vName}`, `${vName}²`]);
                    blocks.push({ type: "var", text: `mettre ${vName} à (${txtPart}) + ${vName}`, highlight: vName });
                    explanation.push(`➡️ Calcul complexe (${vName}² + ${vName}) : ${old}² + ${old} = ${currentVal}.`);
                }
                else {
                    const k = rand(1, 5);
                    const old = currentVal;
                    currentVal = (old * old) - k;

                    const txtPart = pick([`${vName} * ${vName}`, `${vName}²`]);
                    blocks.push({ type: "var", text: `mettre ${vName} à (${txtPart}) - ${k}`, highlight: vName });
                    explanation.push(`➡️ Calcul (${vName}² - ${k}) : ${old}² - ${k} = ${currentVal}.`);
                }
            }
        }
    }

    blocks.push({ type: "looks", text: `dire ${vName}`, highlight: vName });

    // --- GÉNÉRATION INTELLIGENTE DES RÉPONSES (4 Choix garantis) ---
    const wrongSet = new Set();
    const correctVal = currentVal;

    // 1. Pièges spécifiques (Signe, Confusion Double/Carré)
    wrongSet.add(String(-correctVal)); // Erreur de signe (Classique carré)
    wrongSet.add(String(correctVal * 2)); // Erreur Double vs Carré
    wrongSet.add(String(Math.floor(correctVal / 2))); // Erreur moitié
    wrongSet.add(String(correctVal + 10)); // Erreur de calcul dizaine
    wrongSet.add(String(correctVal - 10));
    wrongSet.add(String(correctVal + 1)); // Erreur de calcul unité
    wrongSet.add(String(correctVal - 1));

    // Nettoyage : On enlève la bonne réponse si elle a été générée par un piège
    if (wrongSet.has(String(correctVal))) wrongSet.delete(String(correctVal));

    // Conversion en tableau
    let wrongOptions = Array.from(wrongSet);

    // Mélange des pièges intelligents
    wrongOptions = wrongOptions.sort(() => 0.5 - Math.random());

    // On garde les 3 premiers pièges max
    let finalWrong = wrongOptions.slice(0, 3);

    // Si on n'a pas assez de réponses (ex: résultat est 0, donc -0 est pareil), on complète
    while (finalWrong.length < 3) {
        let fake = correctVal + rand(-5, 5);
        if (fake === correctVal) fake = correctVal + 10;

        if (!finalWrong.includes(String(fake))) {
            finalWrong.push(String(fake));
        }
    }

    return {
        blocks,
        q: "Quel nombre va dire le lutin à la fin ?",
        correct: String(correctVal),
        e: explanation.join("\n"),
        wrong: finalWrong, // Toujours 3 mauvaises réponses uniques
        showAxes: false
    };
};

// -------------------------------------------------------------------------
// GÉNÉRATEUR 2 : Déplacements et Orientation (inchangé sauf sécurité 4 rép)
// -------------------------------------------------------------------------
const generateMovementSequence = (difficulty) => {
    const startX = 0;
    const startY = 0;
    let currX = startX;
    let currY = startY;

    const possibleDirs = (difficulty === 1)
        ? ["90", "-90"]
        : ["90", "-90", "0", "180"];

    let dir = pick(possibleDirs);
    const dirInfo = DIRECTIONS[dir];

    let blocks = [
        { type: "event", isHat: true, text: "quand 🏁 est cliqué" },
        { type: "motion", text: `aller à x: ${startX} y: ${startY}` },
        { type: "motion", text: `s'orienter à ${dir}°` }
    ];

    let explanation = [`1️⃣ Départ à (0,0). On regarde ${dirInfo.name} (${dir}°).`];

    const useLoop = difficulty > 1 && Math.random() > 0.5;

    if (useLoop) {
        const tours = rand(3, 5);
        const pas = rand(10, 20);

        blocks.push({ type: "control", text: `répéter ${tours} fois` });
        blocks.push({ type: "motion", text: `avancer de ${pas}`, indent: 1 });

        if (dirInfo.axis === "x") currX += (pas * tours * dirInfo.sign);
        else currY += (pas * tours * dirInfo.sign);

        explanation.push(`2️⃣ On avance de ${pas}, ${tours} fois, ${dirInfo.name}.`);
        explanation.push(`   Déplacement total : ${tours} × ${pas} = ${tours * pas} pixels.`);
    } else {
        const steps = difficulty === 1 ? 2 : 3;
        for (let i = 0; i < steps; i++) {
            if (difficulty > 1 && Math.random() > 0.3) {
                dir = pick(possibleDirs);
                blocks.push({ type: "motion", text: `s'orienter à ${dir}°` });
                explanation.push(`➡️ On tourne pour regarder ${DIRECTIONS[dir].name}.`);
            }

            const pas = rand(10, 30);
            blocks.push({ type: "motion", text: `avancer de ${pas}` });

            if (DIRECTIONS[dir].axis === "x") currX += (pas * DIRECTIONS[dir].sign);
            else currY += (pas * DIRECTIONS[dir].sign);

            explanation.push(`➡️ On avance de ${pas} ${DIRECTIONS[dir].name}.`);
        }
    }

    const question = `Quelles seront les coordonnées (x; y) à la fin ?`;
    const rappel = `(Rappel : s'orienter à ${dir}° signifie regarder ${DIRECTIONS[dir].name})`;

    explanation.push(`📍 Position finale : x=${currX}, y=${currY}.`);

    const correctRep = `(${currX}; ${currY})`;

    // Génération pièges intelligents (Inversions classiques)
    let traps = [
        `(${currY}; ${currX})`,             // Inversion X/Y
        `(${-currX}; ${currY})`,            // Erreur signe X
        `(${currX}; ${-currY})`,            // Erreur signe Y
        `(${-currY}; ${-currX})`,           // Tout inversé
        `(${currX + 10}; ${currY})`,        // Erreur calcul
        `(${currX}; ${currY + 10})`
    ];

    // Nettoyage doublons
    let uniqueTraps = [...new Set(traps)].filter(t => t !== correctRep);

    // Remplissage forcé à 3 mauvaises réponses si besoin
    while (uniqueTraps.length < 3) {
        // Génération de fausses coordonnées aléatoires
        const fakeX = currX + rand(-20, 20);
        const fakeY = currY + rand(-20, 20);
        const fakeRep = `(${fakeX}; ${fakeY})`;
        if (fakeRep !== correctRep && !uniqueTraps.includes(fakeRep)) {
            uniqueTraps.push(fakeRep);
        }
    }

    return {
        blocks,
        q: question,
        correct: correctRep,
        e: `${rappel}\n` + explanation.join("\n"),
        wrong: uniqueTraps.slice(0, 3),
        showAxes: true
    };
};

// -------------------------------------------------------------------------
// GÉNÉRATEUR 3 : Boucles Imbriquées (Garantie 4 rép)
// -------------------------------------------------------------------------
const generateNestedLoop = () => {
    const vName = "compteur";
    let total = 0;
    const loop1 = rand(2, 4);
    const loop2 = rand(2, 3);
    const valAjout = rand(1, 3);

    const blocks = [
        { type: "event", isHat: true, text: "quand 🏁 est cliqué" },
        { type: "var", text: `mettre ${vName} à 0`, highlight: vName },
        { type: "control", text: `répéter ${loop1} fois` },
        { type: "control", text: `répéter ${loop2} fois`, indent: 1 },
        { type: "var", text: `ajouter ${valAjout} à ${vName}`, indent: 2, highlight: vName },
        { type: "looks", text: `dire ${vName}`, highlight: vName }
    ];

    total = loop1 * loop2 * valAjout;
    const explanation = `C'est une boucle imbriquée.\nCalcul : ${loop1} × ${loop2} × ${valAjout} = ${total}.`;

    // Anti-doublon et remplissage
    const wrongSet = new Set();

    // Pièges logiques
    wrongSet.add(String(loop1 * valAjout + loop2)); // Addition
    wrongSet.add(String((loop1 + loop2) * valAjout)); // Somme des boucles
    wrongSet.add(String(total - valAjout)); // Une étape en moins
    wrongSet.add(String(total + valAjout)); // Une étape en trop
    wrongSet.add(String(loop1 * loop2)); // Juste le nombre de tours

    if (wrongSet.has(String(total))) wrongSet.delete(String(total));

    // Conversion en tableau et remplissage si < 3
    let wrongArr = Array.from(wrongSet);
    while (wrongArr.length < 3) {
        let fake = total + rand(-5, 5);
        if (fake !== total && !wrongArr.includes(String(fake))) {
            wrongArr.push(String(fake));
        }
    }

    return {
        blocks,
        q: "Que va dire le lutin à la fin ?",
        correct: String(total),
        e: explanation,
        wrong: wrongArr.slice(0, 3), // Exactement 3 mauvaises
        showAxes: false
    };
};

// -------------------------------------------------------------------------
// GÉNÉRATEUR 4 : Conditions (Explications améliorées)
// -------------------------------------------------------------------------
const generateConditional = (difficulty) => {
    const seuil = rand(10, 50);
    const testVal = seuil + (Math.random() > 0.5 ? rand(1, 10) : -rand(1, 10));
    const vName = "score";
    const resVrai = rand(1, 10);
    const resFaux = rand(20, 30);
    const isComplex = difficulty === 3;
    const multiplicateur = isComplex ? 2 : 1;
    const conditionMet = (testVal * multiplicateur) > seuil;
    const result = conditionMet ? resVrai : resFaux;

    let conditionText = isComplex
        ? `si (${vName} * ${multiplicateur} > ${seuil}) alors`
        : `si (${vName} > ${seuil}) alors`;

    const blocks = [
        { type: "var", text: `mettre ${vName} à ${testVal}`, highlight: vName },
        { type: "control", text: conditionText, highlight: vName },
        { type: "looks", text: `dire ${resVrai}`, indent: 1 },
        { type: "control", text: `sinon` },
        { type: "looks", text: `dire ${resFaux}`, indent: 1 },
    ];

    // --- CONSTRUCTION DE L'EXPLICATION CLAIRE ---
    let explanationSteps = [];

    // Étape 1 : Le calcul du test
    const valCompare = testVal * multiplicateur;
    if (isComplex) {
        explanationSteps.push(`1️⃣ Calcul du test : ${testVal} × ${multiplicateur} = ${valCompare}.`);
        explanationSteps.push(`   Est-ce que ${valCompare} > ${seuil} ?`);
    } else {
        explanationSteps.push(`1️⃣ Test : Est-ce que ${testVal} > ${seuil} ?`);
    }

    // Étape 2 : Le verdict et la conclusion
    if (conditionMet) {
        explanationSteps.push(`2️⃣ 👉 OUI, c'est VRAI.`);
        explanationSteps.push(`3️⃣ Donc on exécute le bloc "alors" (le premier).`);
        explanationSteps.push(`✅ Le lutin dit : ${result}.`);
    } else {
        explanationSteps.push(`2️⃣ 👉 NON, c'est FAUX.`);
        explanationSteps.push(`3️⃣ Donc on exécute le bloc "sinon" (le deuxième).`);
        explanationSteps.push(`✅ Le lutin dit : ${result}.`);
    }

    const explanation = explanationSteps.join("\n");

    // Pièges intelligents
    let wrongSet = new Set();
    wrongSet.add(String(conditionMet ? resFaux : resVrai)); // L'autre réponse possible (erreur de branche)
    wrongSet.add(String(testVal)); // La valeur de la variable (confusion variable/sortie)
    wrongSet.add(String(seuil)); // Le seuil du test
    wrongSet.add("Rien");

    if (wrongSet.has(String(result))) wrongSet.delete(String(result));

    // S'assurer d'avoir 3 mauvaises réponses
    let wrongArr = Array.from(wrongSet);
    while (wrongArr.length < 3) {
        wrongArr.push(String(result + rand(1, 10)));
    }

    return {
        blocks,
        q: "Que va dire le lutin ?",
        correct: String(result),
        e: explanation,
        wrong: wrongArr.slice(0, 3),
        showAxes: false
    };
};

// --- ROUTEUR PRINCIPAL ---
export const generateAlgoQuestion = (config) => {
    const level = config.level || 1;
    let scenarioData;
    const r = Math.random();

    if (level === 1) {
        if (r < 0.4) scenarioData = generateCalcSequence(1);
        else scenarioData = generateMovementSequence(1);
    }
    else if (level === 2) {
        if (r < 0.4) scenarioData = generateCalcSequence(2);
        else if (r < 0.7) scenarioData = generateMovementSequence(2);
        else scenarioData = generateConditional(2);
    }
    else {
        if (r < 0.3) scenarioData = generateNestedLoop();
        else if (r < 0.5) scenarioData = generateConditional(3);
        else scenarioData = generateCalcSequence(3);
    }

    return {
        q: scenarioData.q,
        o: [scenarioData.correct, ...scenarioData.wrong],
        c: 0,
        e: scenarioData.e,
        scratchBlocks: scenarioData.blocks,
        showAxes: scenarioData.showAxes
    };
};
