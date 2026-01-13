import { randomInt, roundTo } from '../mathEngine';

/**
 * Générateur d'exercices de Trigonométrie.
 * CORRECTION : Fix du bug de remplacement (A vs Angle) + Notation [AB]
 */
export const generateTrigoQuestion = (options = { difficulty: 1 }) => {
    // 1. Configuration Géométrique & Coordonnées
    const angleA = randomInt(25, 65);
    const angleB = 90 - angleA;
    const hypAB = randomInt(6, 15);

    const radA = (angleA * Math.PI) / 180;
    const sideAC = roundTo(hypAB * Math.cos(radA), 2); // Côté adjacent à A
    const sideBC = roundTo(hypAB * Math.sin(radA), 2); // Côté opposé à A

    const coords = {
        C: { x: 0, y: 0 },
        A: { x: 0, y: sideAC * 10 },
        B: { x: sideBC * 10, y: 0 }
    };

    const geometryData = {
        points: { A: 'A', B: 'B', C: 'C' },
        coordinates: coords,
        values: { AB: hypAB, AC: sideAC, BC: sideBC },
        angles: { A: angleA, B: angleB },
        rightAngle: 'C'
    };

    // Helper pour mélanger les objets options (affichage)
    const shuffle = (array) => {
        const newArr = [...array];
        for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
        }
        return newArr;
    };

    // ========================================================================
    // NIVEAU 1 : RASSURANCE (Vocabulaire & Formules)
    // ========================================================================
    if (options.difficulty === 1) {
        const type = Math.random() > 0.5 ? 'VOCAB' : 'FORMULA';

        if (type === 'VOCAB') {
            const focusAngle = Math.random() > 0.5 ? 'A' : 'B';
            const targetType = Math.random() > 0.5 ? 'ADJ' : 'OPP';
            const askHyp = Math.random() < 0.2;

            let answerValue, explanation, qText;

            // --- CAS 1 : HYPOTÉNUSE ---
            if (askHyp) {
                qText = `Quelle est l'hypoténuse du triangle rectangle ABC ?`;
                answerValue = "[AB]";
                explanation = `RAPPEL :\nL'hypoténuse est toujours le côté le plus long, situé en face de l'angle droit (C).\n\n👉 Ici, c'est le côté [AB].`;
            }
            // --- CAS 2 : ADJACENT / OPPOSÉ ---
            else {
                const angleName = focusAngle === 'A' ? 'Â' : 'B'; // Pour l'affichage propre
                qText = `Quel est le côté ${targetType === 'ADJ' ? 'adjacent' : 'opposé'} à l'angle ${angleName} ?`;

                if (focusAngle === 'A') {
                    answerValue = targetType === 'ADJ' ? "[AC]" : "[BC]";
                } else {
                    answerValue = targetType === 'ADJ' ? "[BC]" : "[AC]";
                }

                const visualSide = targetType === 'ADJ' ? "touche l'angle (sans être l'hypoténuse)" : "est en face de l'angle";
                explanation = `Pour l'angle ${angleName} :\n` +
                    `1. Repère l'angle droit (C) et l'hypoténuse [AB].\n` +
                    `2. Le côté ${targetType === 'ADJ' ? 'ADJACENT' : 'OPPOSÉ'} est celui qui ${visualSide}.\n\n` +
                    `👉 C'est donc ${answerValue}.`;
            }

            const rawChoices = ['[AB]', '[AC]', '[BC]'];
            const correctChoice = answerValue;
            const wrongChoices = rawChoices.filter(c => c !== correctChoice);

            const orderedChoices = [correctChoice, ...wrongChoices]; // Pour la logique interne
            const optionsObjs = shuffle(rawChoices.map(val => ({
                value: val,
                isCorrect: val === answerValue
            })));

            return {
                question: qText,
                answer: answerValue,
                explanation: explanation,
                data: { ...geometryData, highlightAngle: askHyp ? null : focusAngle, showSides: false, showLabels: true },
                responseType: 'QCM',
                inputMode: 'buttons',
                choices: orderedChoices,
                options: optionsObjs
            };

        } else {
            // --- TYPE FORMULA ---
            const trigFn = ['cos', 'sin', 'tan'][randomInt(0, 2)];
            const angle = Math.random() > 0.5 ? 'A' : 'B';

            let num, den, mnemonic;

            if (trigFn === 'cos') {
                den = 'AB';
                num = angle === 'A' ? 'AC' : 'BC';
                mnemonic = "CAH (Cos = Adj / Hyp)";
            } else if (trigFn === 'sin') {
                den = 'AB';
                num = angle === 'A' ? 'BC' : 'AC';
                mnemonic = "SOH (Sin = Opp / Hyp)";
            } else {
                if (angle === 'A') { num = 'BC'; den = 'AC'; }
                else { num = 'AC'; den = 'BC'; }
                mnemonic = "TOA (Tan = Opp / Adj)";
            }

            const correctAnswer = `${num}/${den}`;
            const wrong1 = `${den}/${num}`;
            const wrong2 = trigFn === 'tan' ? `AB/${num}` : `${num === 'AB' ? 'AC' : 'AB'}/${den}`;

            const orderedChoices = [correctAnswer, wrong1, wrong2];
            const optionsObjs = shuffle(orderedChoices.map(val => ({
                value: val,
                isCorrect: val === correctAnswer
            })));

            return {
                question: `Complète la formule : ${trigFn}(${angle}) = ?`,
                answer: correctAnswer,
                explanation: `Utilise le moyen mnémotechnique SOH-CAH-TOA.\n` +
                    `Ici on cherche le ${trigFn.toUpperCase()} -> on utilise ${mnemonic}.\n\n` +
                    `👉 ${trigFn}(${angle}) = ${correctAnswer}.`,
                data: { ...geometryData, highlightAngle: angle, showSides: false },
                responseType: 'QCM',
                inputMode: 'buttons',
                choices: orderedChoices,
                options: optionsObjs
            };
        }
    }

    // ========================================================================
    // LOGIQUE DE CALCUL (Niveau 2 et 3)
    // ========================================================================

    const generateLengthQuestion = () => {
        const knownAngle = 'A';
        const method = ['COS', 'SIN', 'TAN'][randomInt(0, 2)];
        let knownSide, unknownSide, valKnown, valUnknown, rawFormula, stepStr;

        // On utilise {angle} comme placeholder SÛR pour éviter de remplacer le 'A' de [AB] ou [AC]
        if (method === 'COS') {
            if (Math.random() > 0.5) { // Cherche Hyp (AB)
                knownSide = 'AC'; valKnown = sideAC;
                unknownSide = 'AB'; valUnknown = hypAB;
                rawFormula = `AB = AC ÷ cos({angle})`;
                stepStr = `On sait que cos(Â) = Adj/Hyp = AC/AB.\nDonc AB = AC ÷ cos(Â).`;
            } else { // Cherche Adj (AC)
                knownSide = 'AB'; valKnown = hypAB;
                unknownSide = 'AC'; valUnknown = sideAC;
                rawFormula = `AC = AB × cos({angle})`;
                stepStr = `On sait que cos(Â) = Adj/Hyp = AC/AB.\nDonc AC = AB × cos(Â).`;
            }
        } else if (method === 'SIN') {
            if (Math.random() > 0.5) {
                knownSide = 'BC'; valKnown = sideBC;
                unknownSide = 'AB'; valUnknown = hypAB;
                rawFormula = `AB = BC ÷ sin({angle})`;
                stepStr = `On sait que sin(Â) = Opp/Hyp = BC/AB.\nDonc AB = BC ÷ sin(Â).`;
            } else {
                knownSide = 'AB'; valKnown = hypAB;
                unknownSide = 'BC'; valUnknown = sideBC;
                rawFormula = `BC = AB × sin({angle})`;
                stepStr = `On sait que sin(Â) = Opp/Hyp = BC/AB.\nDonc BC = AB × sin(Â).`;
            }
        } else {
            if (Math.random() > 0.5) {
                knownSide = 'AC'; valKnown = sideAC;
                unknownSide = 'BC'; valUnknown = sideBC;
                rawFormula = `BC = AC × tan({angle})`;
                stepStr = `On sait que tan(Â) = Opp/Adj = BC/AC.\nDonc BC = AC × tan(Â).`;
            } else {
                knownSide = 'BC'; valKnown = sideBC;
                unknownSide = 'AC'; valUnknown = sideAC;
                rawFormula = `AC = BC ÷ tan({angle})`;
                stepStr = `On sait que tan(Â) = Opp/Adj = BC/AC.\nDonc AC = BC ÷ tan(Â).`;
            }
        }

        // Remplacement SÛR : on ne remplace que le token {angle}
        const calcStr = rawFormula.replace('{angle}', angleA + '°').replace(knownSide, valKnown);

        return {
            question: `Calculer la longueur ${unknownSide} (arrondir au centième).`,
            answer: valUnknown,
            responseType: 'NUMERIC',
            explanation: `1. On identifie les côtés : on a [${knownSide}] et on cherche [${unknownSide}].\n` +
                `2. On choisit la formule : ${method} (SOH-CAH-TOA).\n` +
                `3. ${stepStr}\n` +
                `4. Calcul : ${calcStr}.\n\n` +
                `👉 Résultat : ${valUnknown}.`,
            data: {
                ...geometryData,
                coordinates: coords,
                highlightAngle: 'A',
                showValues: { [knownSide]: valKnown, [unknownSide]: '?' }
            },
            correctionDetail: "Vérifie que ta calculatrice est bien en mode Degrés (deg).",
            choices: [],
            options: []
        };
    };

    const generateAngleQuestion = () => {
        const method = ['COS', 'SIN', 'TAN'][randomInt(0, 2)];
        let s1, s2, val1, val2, formulaName, typeSides;

        if (method === 'COS') {
            s1 = 'AC'; val1 = sideAC;
            s2 = 'AB'; val2 = hypAB;
            formulaName = 'Arccos';
            typeSides = "l'Adjacent [AC] et l'Hypoténuse [AB]";
        } else if (method === 'SIN') {
            s1 = 'BC'; val1 = sideBC;
            s2 = 'AB'; val2 = hypAB;
            formulaName = 'Arcsin';
            typeSides = "l'Opposé [BC] et l'Hypoténuse [AB]";
        } else {
            s1 = 'BC'; val1 = sideBC;
            s2 = 'AC'; val2 = sideAC;
            formulaName = 'Arctan';
            typeSides = "l'Opposé [BC] et l'Adjacent [AC]";
        }

        return {
            question: `Calculer la mesure de l'angle Â (arrondir au degré près).`,
            answer: angleA,
            responseType: 'NUMERIC',
            explanation: `1. On connaît les longueurs de ${typeSides}.\n` +
                `2. On utilise donc ${method}.\n` +
                `3. On pose : ${method}(Â) = ${val1}/${val2}.\n` +
                `4. À la calculatrice : Â = ${formulaName}(${val1} ÷ ${val2}).\n\n` +
                `👉 Résultat : ${angleA}°.`,
            data: {
                ...geometryData,
                coordinates: coords,
                highlightAngle: 'A',
                showValues: { [s1]: val1, [s2]: val2 },
                angleUnknown: true
            },
            correctionDetail: "Utilise les touches Arccos, Arcsin ou Arctan (parfois Shift + Cos...).",
            choices: [],
            options: []
        };
    };

    if (options.difficulty === 2) return generateLengthQuestion();
    if (options.difficulty === 3) {
        return Math.random() > 0.5 ? generateAngleQuestion() : generateLengthQuestion();
    }
};