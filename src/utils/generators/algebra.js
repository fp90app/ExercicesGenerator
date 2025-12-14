import { rand, pick, randNz, fmtSign, fmtCoef } from './utils';

// --- AUTO 10 - VOCABULAIRE DES OPÉRATIONS (VERSION DÉTAILLÉE PRO) ---
export const generateVocabularyQuestion = (config) => {
    // ✅ CORRECTION : On récupère le niveau ici
    const lvl = config.level || 1;

    const v = pick(["n", "x", "y", "a", "t"]); // Variable dynamique

    let q, correct, e;
    let wrong = new Set();

    // =================================================================
    // NIVEAU 1 : DÉFINITIONS AVEC ÉTAPES DE SIMPLIFICATION
    // =================================================================
    if (lvl === 1) {
        const mode = pick(["basique", "mots_cles"]);

        if (mode === "basique") {
            const types = [
                {
                    name: "double",
                    res: `2${v}`,
                    trap: [`${v}²`, `${v} + 2`],
                    expl: `Le **double** signifie "multiplier par 2".\nCalcul : 2 × ${v} = ${v} × 2 = 2${v}.`
                },
                {
                    name: "triple",
                    res: `3${v}`,
                    trap: [`${v}³`, `${v} + 3`],
                    expl: `Le **triple** signifie "multiplier par 3".\nCalcul : 3 × ${v} = 3${v}.`
                },
                {
                    name: "quadruple",
                    res: `4${v}`,
                    trap: [`${v}⁴`, `${v} + 4`],
                    expl: `Le **quadruple** signifie "multiplier par 4".\nCalcul : 4 × ${v} = 4${v}.`
                },
                {
                    name: "moitié",
                    res: `${v}/2`,
                    trap: [`2${v}`, `${v} - 2`],
                    expl: `La **moitié** signifie "diviser par 2".\nOn l'écrit sous forme de fraction : ${v} sur 2.`
                },
                {
                    name: "tiers",
                    res: `${v}/3`,
                    trap: [`3${v}`, `${v} - 3`],
                    expl: `Le **tiers** signifie "diviser par 3".\nOn l'écrit sous forme de fraction : ${v} sur 3.`
                },
                {
                    name: "quart",
                    res: `${v}/4`,
                    trap: [`4${v}`, `${v} - 4`],
                    expl: `Le **quart** signifie "diviser par 4".\nOn l'écrit sous forme de fraction : ${v} sur 4.`
                },
                {
                    name: "carré",
                    res: `${v}²`,
                    trap: [`2${v}`, `${v} + 2`],
                    expl: `Le **carré** correspond à la puissance 2.\nCela signifie que l'on multiplie le nombre par lui-même : ${v} × ${v} = ${v}².`
                },
                {
                    name: "cube",
                    res: `${v}³`,
                    trap: [`3${v}`, `${v} + 3`],
                    expl: `Le **cube** correspond à la puissance 3.\nCela signifie : ${v} × ${v} × ${v} = ${v}³.`
                }
            ];
            const item = pick(types);
            q = `Quelle est l'expression du "${item.name}" de ${v} ?`;
            correct = item.res;
            e = item.expl;
            item.trap.forEach(t => wrong.add(t));
        }
        else {
            const sub = pick(["pred", "succ", "opp", "inv"]);
            if (sub === "pred") {
                q = `Le "prédécesseur" de ${v} est :`;
                correct = `${v} - 1`;
                e = `Le prédécesseur est le nombre juste **avant**.\nExemple : Avant 10, c'est 9 (10 - 1).\nDonc pour ${v}, c'est ${v} - 1.`;
                wrong.add(`${v} + 1`); wrong.add(`-${v}`);
            } else if (sub === "succ") {
                q = `Le "successeur" de ${v} est :`;
                correct = `${v} + 1`;
                e = `Le successeur est le nombre juste **après**.\nExemple : Après 10, c'est 11 (10 + 1).\nDonc pour ${v}, c'est ${v} + 1.`;
                wrong.add(`${v} - 1`); wrong.add(`2${v}`);
            } else if (sub === "opp") {
                q = `L' "opposé" de ${v} s'écrit :`;
                correct = `-${v}`;
                e = `L'opposé change le signe du nombre.\nSi on a ${v}, son opposé est -${v}.\nExemple : L'opposé de 5 est -5.`;
                wrong.add(`1/${v}`); wrong.add(`${v}-1`);
            } else { // Inverse
                q = `L' "inverse" de ${v} s'écrit :`;
                correct = `1/${v}`;
                e = `L'inverse consiste à diviser 1 par le nombre.\nL'inverse de ${v} est 1 ÷ ${v}, qu'on écrit 1/${v}.`;
                wrong.add(`-${v}`); wrong.add(`${v}/1`);
            }
        }
    }

    // =================================================================
    // NIVEAU 2 : TRADUCTION AVEC RÈGLES D'ÉCRITURE
    // =================================================================
    else if (lvl === 2) {
        let k = rand(2, 10);

        const scenarios = [
            {
                txt: `La somme de ${v} et de ${k}`,
                math: `${v} + ${k}`,
                wrong: [`${k}${v}`, `${v}${k}`, `${v} - ${k}`],
                expl: `Le mot "somme" indique une addition (+).\nOn écrit simplement les deux termes avec un plus : ${v} + ${k}.`
            },
            {
                txt: `Le produit de ${v} par ${k}`,
                math: `${k}${v}`,
                wrong: [`${v} + ${k}`, `${v}/${k}`, `${v}^${k}`],
                expl: `Le mot "produit" indique une multiplication (×).\nOn écrit : ${k} × ${v}.\nEn algèbre, on supprime le signe × et on place le chiffre devant : ${k}${v}.`
            },
            {
                txt: `La différence entre ${v} et ${k}`,
                math: `${v} - ${k}`,
                wrong: [`${v} + ${k}`, `${k} - ${v}`, `${v} / ${k}`],
                expl: `Le mot "différence" indique une soustraction (-).\nOn soustrait le deuxième terme au premier : ${v} - ${k}.`
            },
            {
                txt: `Le quotient de ${v} par ${k}`,
                math: `${v}/${k}`,
                wrong: [`${k}/${v}`, `${v} - ${k}`, `${k}${v}`],
                expl: `Le mot "quotient" indique une division.\nOn l'écrit sous forme fractionnaire : ${v} au numérateur (en haut) et ${k} au dénominateur (en bas).`
            }
        ];

        if (Math.random() > 0.5) {
            // Mode Traduction
            const item = pick(scenarios);
            q = `Traduire : "${item.txt}"`;
            correct = item.math;
            e = item.expl;
            item.wrong.forEach(w => wrong.add(w));
        } else {
            // Mode Calcul numérique
            const valV = rand(2, 6);
            const isSquare = Math.random() > 0.5;

            if (isSquare) {
                q = `Si ${v} = ${valV}, combien vaut son carré (${v}²) ?`;
                correct = String(valV * valV);
                e = `Rappel : Le carré (${v}²) c'est le nombre multiplié par lui-même.\nIci ${v}=${valV}, donc on calcule :\n${valV} × ${valV} = ${correct}.`;
                wrong.add(String(valV * 2));
                wrong.add(String(valV + 2));
            } else {
                q = `Si ${v} = ${valV}, combien vaut son double (2${v}) ?`;
                correct = String(valV * 2);
                e = `Rappel : Le double (2${v}) c'est le nombre multiplié par 2.\nIci ${v}=${valV}, donc on calcule :\n2 × ${valV} = ${correct}.`;
                wrong.add(String(valV * valV));
                wrong.add(String(valV + 2));
            }
        }
    }

    // =================================================================
    // NIVEAU 3 : PRIORITÉS & DÉTAILS DE SUBSTITUTION
    // =================================================================
    else {
        let k = 0;
        while (k === 0 || k === 1 || k === -1) k = rand(-12, 12);

        const kStr = k > 0 ? String(k) : `(${k})`;

        // Scénario A : (kx)²
        const scenarioA = {
            txt: `Le carré du produit de ${v} par ${kStr}`,
            math: `(${k}${v})²`,
            dev: `${k * k}${v}²`,
            trap: [`${k}${v}²`, `${k}²${v}`, `${2 * k}${v}`],
            expl: `Le mot "Carré" s'applique à tout le produit.\nOn écrit d'abord le produit ${k}${v}, puis on met des parenthèses pour le carré : (${k}${v})².`
        };

        // Scénario B : kx²
        const scenarioB = {
            txt: `Le produit de ${kStr} par le carré de ${v}`,
            math: `${k}${v}²`,
            trap: [`(${k}${v})²`, `${k * k}${v}²`, `2${k}${v}`],
            expl: `Ici, le carré ne s'applique qu'au nombre ${v}.\nOn écrit ${v}², et on multiplie le tout par ${kStr} -> ${k}${v}².\nPas de parenthèses.`
        };

        // Scénario C : (x+k)²
        const scenarioC = {
            txt: `Le carré de la somme de ${v} et ${kStr}`,
            math: `(${v} ${fmtSign(k)})²`,
            trap: [`${v}² ${fmtSign(k)}`, `${v}² ${fmtSign(k * k)}`, `2${v} ${fmtSign(k)}`],
            expl: `Le mot "Carré" s'applique à toute la somme.\nOn écrit la somme ${v}${fmtSign(k)}, et on protège avec des parenthèses : (${v}${fmtSign(k)})².`
        };

        // Scénario D : x²+k
        const scenarioD = {
            txt: `La somme de ${kStr} et du carré de ${v}`,
            math: `${v}² ${fmtSign(k)}`,
            trap: [`(${v} ${fmtSign(k)})²`, `2${v} ${fmtSign(k)}`, `(${v}${fmtSign(k)})`],
            expl: `L'opération principale est l'addition.\nOn additionne ${kStr} avec le carré de ${v} (${v}²).\nCela donne : ${v}² ${fmtSign(k)}.`
        };

        const scenar = pick([scenarioA, scenarioB, scenarioC, scenarioD]);

        if (Math.random() > 0.4) {
            // Mode Traduction
            q = `Quelle expression correspond à : \n"${scenar.txt}" ?`;
            correct = scenar.math;
            if (scenar === scenarioA && Math.random() > 0.5) correct = scenar.dev;

            e = scenar.expl;
            scenar.trap.forEach(t => wrong.add(t));
        } else {
            // Mode Substitution (Calcul numérique détaillé)
            const valV = pick([2, 3, 5, 10]);

            q = `Calculer "${scenar.txt}" pour ${v} = ${valV}.`;

            let calcRes, detailSteps;

            if (scenar === scenarioA) { // (kx)²
                calcRes = Math.pow(k * valV, 2);
                detailSteps = `1. On remplace : (${k} × ${valV})²\n2. On calcule la parenthèse : (${k * valV})²\n3. On met au carré : ${calcRes}`;
            }
            else if (scenar === scenarioB) { // kx²
                calcRes = k * Math.pow(valV, 2);
                detailSteps = `1. On remplace : ${k} × ${valV}²\n2. Priorité au carré : ${k} × ${Math.pow(valV, 2)}\n3. On multiplie : ${calcRes}`;
            }
            else if (scenar === scenarioC) { // (x+k)²
                const sum = valV + k;
                calcRes = Math.pow(sum, 2);
                detailSteps = `1. On remplace : (${valV} ${fmtSign(k)})²\n2. On calcule la parenthèse : (${sum})²\n3. On met au carré : ${calcRes}`;
            }
            else { // x²+k
                calcRes = Math.pow(valV, 2) + k;
                detailSteps = `1. On remplace : ${valV}² ${fmtSign(k)}\n2. Priorité au carré : ${Math.pow(valV, 2)} ${fmtSign(k)}\n3. On additionne : ${calcRes}`;
            }

            correct = String(calcRes);
            e = `${scenar.expl}\n\n--- DÉTAIL DU CALCUL ---\n${detailSteps}`;

            // Génération des leurres pour ce calcul spécifique
            if (scenar === scenarioA) { wrong.add(String(k * Math.pow(valV, 2))); wrong.add(String(2 * k * valV)); }
            else if (scenar === scenarioB) { wrong.add(String(Math.pow(k * valV, 2))); }
            else if (scenar === scenarioC) { wrong.add(String(Math.pow(valV, 2) + k)); }
            else { wrong.add(String(Math.pow(valV + k, 2))); }

            wrong.add(String(calcRes + 10));
            wrong.add(String(calcRes - k));
        }
    }

    // --- FINALISATION ---
    let wrongArray = Array.from(wrong);
    while (wrongArray.length < 3) {
        if (typeof correct === 'string' && correct.includes('n')) wrongArray.push(`${v} + ${rand(10, 99)}`);
        else wrongArray.push(String(parseInt(correct || 0) + rand(1, 10)));
    }

    return { q, o: [correct, ...wrongArray], c: 0, e };
};

// --- AUTO 11 - SIMPLIFIER LITTÉRAL ---
export const generateSimplifyExpressionQuestion = (config) => {
    // ✅ CORRECTION : On récupère le niveau ici
    const lvl = config.level || 1;

    // Affiche le début d'une expression
    const fmtStart = (n, variable) => {
        if (n === 1) return variable;
        if (n === -1) return `-${variable}`;
        return `${n}${variable}`;
    };

    const v = pick(["x", "y", "a", "t", "n", "b"]);

    let q, correct, e;
    let wrong = new Set();

    // =================================================================
    // NIVEAU 1 : BASES & CONVENTIONS
    // =================================================================
    if (lvl === 1) {
        const mode = pick(["suppression_mul", "identite", "addition_simple"]);

        if (mode === "suppression_mul") {
            const a = rand(2, 9);
            const isOrderDirect = Math.random() > 0.5;

            if (isOrderDirect) {
                q = `Simplifier : ${a} × ${v}`;
                correct = `${a}${v}`;
                e = `Convention : On supprime le signe "×" et on colle le nombre au début.\n${a} × ${v} s'écrit ${a}${v}.`;
            } else {
                q = `Simplifier : ${v} × ${a}`;
                correct = `${a}${v}`;
                e = `Convention : Le nombre se place toujours DEVANT la lettre.\nOn remet dans l'ordre : ${v} × ${a} = ${a}${v}.`;
            }
            wrong.add(`${v}${a}`);
            wrong.add(`${a} + ${v}`);
        }
        else if (mode === "identite") {
            const sub = pick(["un", "zero", "carre"]);
            if (sub === "un") {
                q = `Simplifier : 1 × ${v}`;
                correct = `${v}`;
                e = `Multiplier par 1 est neutre.\n"Une fois ${v}", c'est juste "${v}".\n(Écrire 1${v} est correct mais lourd, on préfère ${v}).`;
                wrong.add(`1${v}`); wrong.add(`1`);
            } else if (sub === "zero") {
                q = `Simplifier : 0 × ${v}`;
                correct = `0`;
                e = `Zéro fois n'importe quoi donne toujours ZÉRO.\n0 × ${v} = 0.`;
                wrong.add(`${v}`); wrong.add(`0${v}`);
            } else {
                q = `Simplifier : ${v} × ${v}`;
                correct = `${v}²`;
                e = `Un nombre multiplié par lui-même est au CARRÉ.\n${v} × ${v} = ${v}².`;
                wrong.add(`2${v}`);
            }
        }
        else {
            const a = rand(2, 6);
            let b = rand(2, 6);
            q = `Réduire : ${a}${v} + ${b}${v}`;
            correct = `${a + b}${v}`;
            e = `On additionne les coefficients : ${a} + ${b} = ${a + b}.\nCela donne ${a + b}${v}.`;
            wrong.add(`${a + b}${v}²`);
            wrong.add(`${a * b}${v}`);
        }
    }

    // =================================================================
    // NIVEAU 2 : RELATIFS (ADDITIONS & PRODUITS SIMPLES)
    // =================================================================
    else if (lvl === 2) {
        const mode = Math.random() > 0.4 ? "reduction_relatifs" : "produit_relatif";

        if (mode === "reduction_relatifs") {
            const a = randNz(9);
            let b = randNz(9);
            if (a + b === 0) b += 1; // Évite résultat 0 pour l'instant

            q = `Réduire : ${fmtStart(a, v)} ${fmtSign(b)}${v}`;

            const res = a + b;
            correct = fmtStart(res, v);

            e = `On regroupe les termes en ${v}.\nCalcul des coefficients : ${a} ${b >= 0 ? '+ ' + b : b}.\n\n`;

            if (a > 0 && b < 0) e += `C'est une soustraction : ${a} - ${Math.abs(b)} = ${res}.`;
            else if (a < 0 && b > 0) e += `On part de -${Math.abs(a)} et on remonte de ${b}.`;
            else if (a < 0 && b < 0) e += `On additionne deux nombres négatifs, le résultat reste NÉGATIF.`;
            else e += `${a} + ${b} = ${res}.`;

            e += `\nRésultat final : ${correct}.`;

            wrong.add(`${res}${v}²`);
            wrong.add(`${a * b}${v}`);
            wrong.add(fmtStart(a - b, v));
        }
        else {
            // Produit
            const a = randNz(8);
            let b = randNz(8);
            if (a > 0 && b > 0) b = -b; // Force un négatif

            if (Math.random() > 0.5) {
                let bStr = b < 0 ? `(${fmtCoef(b, v)})` : fmtCoef(b, v);
                q = `Simplifier : ${a} × ${bStr}`;
            } else {
                let bStr = b < 0 ? `(${b})` : b;
                q = `Simplifier : ${fmtCoef(a, v)} × ${bStr}`;
            }

            const resCoef = a * b;
            correct = fmtCoef(resCoef, v);

            e = `C'est une MULTIPLICATION.\n1. Règle des signes : ${a < 0 ? 'Négatif' : 'Positif'} × ${b < 0 ? 'Négatif' : 'Positif'} donne ${resCoef < 0 ? 'NÉGATIF' : 'POSITIF'}.\n2. Calcul : ${a} × ${b} = ${resCoef}.\n\nRésultat : ${correct}.`;

            wrong.add(fmtCoef(Math.abs(resCoef), v));
            wrong.add(fmtCoef(a + b, v));
        }
    }

    // =================================================================
    // NIVEAU 3 : RELATIFS COMPLEXES & CARRÉS
    // =================================================================
    else {
        const mode = pick(["produit_xx_relatif", "reduction_carres_relatif", "distributivite_simple"]);

        if (mode === "produit_xx_relatif") {
            const a = randNz(9);
            let b = randNz(9);

            let bStr = b < 0 ? `(${fmtCoef(b, v)})` : fmtCoef(b, v);
            q = `Simplifier : ${fmtCoef(a, v)} × ${bStr}`;

            const res = a * b;
            correct = `${res}${v}²`;
            if (res === -1) correct = `-${v}²`;
            if (res === 1) correct = `${v}²`;

            e = `Multiplication de deux termes en ${v} :\n1. Signes : ${a} × ${b} = ${res}.\n2. Lettres : ${v} × ${v} = ${v}² (au carré).\n\nRésultat : ${correct}.`;

            wrong.add(`${Math.abs(res)}${v}²`);
            wrong.add(`${res}${v}`);
            wrong.add(`${a + b}${v}²`);
        }
        else if (mode === "reduction_carres_relatif") {
            const a = randNz(9);
            let b = randNz(9);
            const c = randNz(9);
            const d = randNz(9);

            q = `Réduire : ${fmtStart(a, v)}² ${fmtSign(c)}${v} ${fmtSign(b)}${v}² ${fmtSign(d)}${v}`;

            const resCarre = a + b;
            const resX = c + d;

            let partCarre = "";
            if (resCarre !== 0) {
                if (resCarre === 1) partCarre = `${v}²`;
                else if (resCarre === -1) partCarre = `-${v}²`;
                else partCarre = `${resCarre}${v}²`;
            }

            let partX = "";
            if (resX !== 0) {
                if (partCarre !== "") {
                    partX = ` ${fmtSign(resX)}${v}`;
                    partX = partX.replace("+ 1" + v, "+ " + v).replace("- 1" + v, "- " + v);
                } else {
                    partX = fmtStart(resX, v);
                }
            }

            correct = (partCarre + partX).trim();
            if (correct === "") correct = "0";

            e = `On regroupe par famille :\n\n1. Les Carrés (${v}²) :\n   ${a} ${b >= 0 ? '+ ' + b : b} = ${resCarre} -> ${resCarre === 0 ? '0' : resCarre + v + '²'}\n\n2. Les simples (${v}) :\n   ${c} ${d >= 0 ? '+ ' + d : d} = ${resX} -> ${resX === 0 ? '0' : resX + v}\n\nOn écrit le tout côte à côte.`;

            wrong.add(`${resCarre + resX}${v}²`);
            wrong.add(`${resCarre}${v}² + ${resX}`);
        }
        else {
            const k = randNz(5) * (Math.random() > 0.5 ? 1 : -1);
            const a = randNz(5);
            let b = randNz(9);

            q = `Développer : ${k}(${fmtStart(a, v)} ${fmtSign(b)})`;

            const resA = k * a;
            const resB = k * b;

            correct = `${fmtStart(resA, v)} ${fmtSign(resB)}`;

            e = `On distribue le ${k} sur chaque terme :\n\n1. ${k} × ${a}${v} = ${resA}${v}\n2. ${k} × (${b}) = ${resB}\n\nRésultat : ${correct}`;

            wrong.add(`${fmtStart(resA, v)} ${fmtSign(b)}`);
            wrong.add(`${fmtStart(k + a, v)} ${fmtSign(k + b)}`);
            wrong.add(`${fmtStart(Math.abs(resA), v)} ${fmtSign(Math.abs(resB))}`);
        }
    }

    let wrongArray = Array.from(wrong);
    while (wrongArray.length < 3) {
        wrongArray.push(`${rand(-10, 10)}${v}`);
    }

    return { q, o: [correct, ...wrongArray], c: 0, e };
};

// --- AUTO 12 - SUBSTITUTION ---
export const generateSubstitutionQuestion = (config) => {
    // ✅ CORRECTION : On récupère le niveau ici
    const lvl = config.level || 1;

    // 1. Parenthèses pour calculs négatifs : -3 -> (-3)
    const p = (n) => n < 0 ? `(${n})` : n;

    // 4. Coefficient de milieu (avec espaces) : + 1x -> + x, - 1x -> - x
    const fmtMidCoef = (n, variable) => {
        if (n === 0) return "";
        if (n === 1) return `+ ${variable}`;
        if (n === -1) return `- ${variable}`;
        return `${n >= 0 ? '+ ' + n : '- ' + Math.abs(n)}${variable}`;
    };

    // 5. Facteur devant parenthèse : 1(..) -> (..), -1(..) -> -(..)
    const fmtFactor = (n) => {
        if (n === 1) return "";
        if (n === -1) return "-";
        return String(n);
    };

    const v = pick(["x", "y", "a", "t", "n"]); // Variable dynamique

    let q, correct, e;
    let wrong = new Set();

    // =================================================================
    // NIVEAU 1 : BASES POSITIVES & MÉCANISMES
    // =================================================================
    if (lvl === 1) {
        const valX = rand(2, 9);
        const mode = pick(["simple_mul", "add_mul", "sub_var"]);

        if (mode === "simple_mul") {
            // Ex: 4x pour x=3
            const a = rand(3, 9);
            q = `Calculer la valeur de ${fmtCoef(a, v)} pour ${v} = ${valX}`;
            const res = a * valX;
            correct = String(res);

            e = `Il y a une multiplication cachée : "${fmtCoef(a, v)}" signifie "${a} × ${v}".\n\nCalcul : ${a} × ${valX} = ${res}.`;

            wrong.add(String(parseInt(`${a}${valX}`))); // Piège 43
            wrong.add(String(a + valX)); // Piège 7
            wrong.add(String(res + 10));
        }
        else if (mode === "add_mul") {
            // Ex: 3x + 2 pour x=4
            const a = rand(2, 5);
            let b = rand(1, 10);
            q = `Calculer ${fmtCoef(a, v)} + ${b} pour ${v} = ${valX}`;
            const res = a * valX + b;
            correct = String(res);

            e = `1. On remplace ${v} par ${valX} : ${a} × ${valX} + ${b}\n2. Priorité à la multiplication : ${a * valX} + ${b}\n3. Résultat : ${res}.`;

            wrong.add(String((a + b) * valX)); // Erreur priorité (3+2)*4
            wrong.add(String(parseInt(`${a}${valX}`) + b)); // 34 + 2
            wrong.add(String(a + valX + b)); // Tout additionner
        }
        else {
            // Ex: 20 - x pour x=5
            const start = rand(10, 20);
            q = `Calculer ${start} - ${v} pour ${v} = ${valX}`;
            const res = start - valX;
            correct = String(res);
            e = `On remplace ${v} par sa valeur.\n${start} - ${valX} = ${res}.`;
            wrong.add(String(start + valX));
            wrong.add(String(valX - start));
        }
    }

    // =================================================================
    // NIVEAU 2 : RELATIFS & CARRÉS (PIÈGES SIGNES)
    // =================================================================
    else if (lvl === 2) {
        const valX = randNz(5);
        const valXStr = p(valX); // (-3) ou 3

        const mode = pick(["linear_neg", "simple_square", "coeff_square"]);

        if (mode === "linear_neg") {
            // Ex: -3x + 4 pour x = -2
            const a = randNz(5);
            let b = randNz(9);

            q = `Calculer ${fmtCoef(a, v)} ${fmtSign(b)} pour ${v} = ${valX}`;
            const res = a * valX + b;
            correct = String(res);

            e = `Attention aux signes !\n1. On remplace : ${a} × ${valXStr} ${fmtSign(b)}\n2. Multiplication : ${a * valX} ${fmtSign(b)}\n3. Résultat : ${res}.`;

            wrong.add(String(Math.abs(a * valX) + b)); // Erreur signe produit
            wrong.add(String(a * valX - b)); // Erreur signe constante
            wrong.add(String(a + valX + b)); // Tout additionner
        }
        else if (mode === "simple_square") {
            // Ex: x² pour x = -3 (LE PIÈGE)
            let b = rand(0, 5);
            const expr = b === 0 ? `${v}²` : `${v}² + ${b}`;
            q = `Calculer ${expr} pour ${v} = ${valX}`;

            const res = valX * valX + b;
            correct = String(res);

            if (valX < 0) {
                e = `Rappel : Le carré d'un nombre négatif est POSITIF.\n${v}² = (${valX}) × (${valX}) = ${valX * valX}.\n(Moins par moins donne plus).\n\nRésultat : ${res}.`;
                wrong.add(String(-Math.abs(valX * valX) + b)); // Piège -9
            } else {
                e = `On calcule le carré : ${valX} × ${valX} = ${valX * valX}.\nPuis on ajoute ${b} : ${res}.`;
            }

            wrong.add(String(valX * 2 + b)); // x*2 au lieu de x²
            wrong.add(String(valX + b));
        }
        else {
            // Ex: -2x² pour x = 3
            const a = -1 * rand(2, 5); // Toujours négatif pour tester la priorité
            q = `Calculer ${fmtCoef(a, v)}² pour ${v} = ${valX}`;
            const res = a * (valX * valX);
            correct = String(res);

            e = `Priorité aux puissances !\n1. D'abord le carré : ${valXStr}² = ${valX * valX}\n2. Ensuite on multiplie par ${a} : ${a} × ${valX * valX}\n\nRésultat : ${res}.`;

            wrong.add(String((a * valX) * (a * valX))); // (ax)²
            wrong.add(String(a * valX * 2)); // x*2
            wrong.add(String(Math.abs(res))); // Oubli du signe
        }
    }

    // =================================================================
    // NIVEAU 3 : TECHNIQUE (PARENTHÈSES, 2 VARIABLES, POLYNÔMES)
    // =================================================================
    else {
        const mode = pick(["two_vars", "parentheses_distrib", "complex_square"]);

        if (mode === "two_vars") {
            // Ex: 3x - 2y pour x=2 et y=-3
            const valX = randNz(4);
            const valY = randNz(4);
            const a = rand(2, 5);
            let b = rand(2, 5); // b positif ici, pour l'écriture a*x - b*y

            q = `Calculer ${fmtCoef(a, "x")} - ${fmtCoef(b, "y")} pour x = ${valX} et y = ${valY}`;
            const res = (a * valX) - (b * valY);
            correct = String(res);

            e = `On remplace séparément :\n1. ${fmtCoef(a, "x")} -> ${a} × ${p(valX)} = ${a * valX}\n2. -${fmtCoef(b, "y")} -> -${b} × ${p(valY)} = ${-b * valY}\n\nTotal : ${a * valX} + (${-b * valY}) = ${res}.`;

            wrong.add(String(a * valX + b * valY)); // Erreur de signe central
            wrong.add(String((a - b) * (valX - valY)));
            wrong.add(String(res * -1));
        }
        else if (mode === "parentheses_distrib") {
            // Ex: -2(x + 3) pour x = -5
            const valX = randNz(5);
            const k = randNz(4);
            const offset = randNz(5);

            // Formatage parfait du facteur k : -1(..) devient -(..)
            q = `Calculer ${fmtFactor(k)}(${v} ${fmtSign(offset)}) pour ${v} = ${valX}`;
            const res = k * (valX + offset);
            correct = String(res);

            const sum = valX + offset;
            e = `Priorité aux parenthèses :\n1. Intérieur : ${p(valX)} ${fmtSign(offset)} = ${sum}\n2. Multiplication : ${k} × ${p(sum)}\n\nRésultat : ${res}.`;

            wrong.add(String(k * valX + offset)); // Oubli de distribuer
            wrong.add(String(k * valX * offset)); // Mult au lieu d'add
            wrong.add(String(Math.abs(res)));
        }
        else {
            // Ex: x² - 3x + 1 pour x = -2
            const valX = randNz(4);
            let b = randNz(5);
            const c = randNz(10);

            // Formatage parfait du terme central : -1x devient - x
            q = `Calculer ${v}² ${fmtMidCoef(b, v)} ${fmtSign(c)} pour ${v} = ${valX}`;

            const term1 = valX * valX;
            const term2 = b * valX;
            const res = term1 + term2 + c;

            correct = String(res);

            e = `Calculons étape par étape avec ${v} = ${valX} :\n1. ${v}² = ${p(valX)} × ${p(valX)} = ${term1}\n2. ${fmtMidCoef(b, v)} = ${b} × ${p(valX)} = ${term2}\n3. Total : ${term1} ${fmtSign(term2)} ${fmtSign(c)} = ${res}.`;

            wrong.add(String(term1 - term2 + c)); // Erreur signe central
            wrong.add(String(-term1 + term2 + c)); // Erreur signe carré
            wrong.add(String(term1 + term2 - c)); // Erreur signe constante
        }
    }

    // --- FINALISATION ---

    // 1. Suppression de la bonne réponse dans les leurres (si elle y est)
    if (wrong.has(correct)) wrong.delete(correct);

    // 2. Conversion en tableau
    let wrongArray = Array.from(wrong);

    // 3. Boucle de sécurité pour avoir 3 mauvaises réponses uniques
    let attempts = 0;
    while (wrongArray.length < 3 && attempts < 100) {
        // Génère un nombre proche de la réponse (ex: res+1, res-5)
        let fake = parseInt(correct) + randNz(10);
        // Vérifie qu'il n'est ni la bonne réponse, ni déjà présent
        if (String(fake) !== correct && !wrongArray.includes(String(fake))) {
            wrongArray.push(String(fake));
        }
        attempts++;
    }

    return { q, o: [correct, ...wrongArray], c: 0, e };
};

// --- AUTO 13 - DÉVELOPPER (PROGRESSION PÉDAGOGIQUE FINE) ---
export const generateDevelopFactorizeQuestion = (config) => {
    // ✅ CORRECTION : On récupère le niveau ici
    const lvl = config.level || 1;

    // 2. Début d'expression (ex: "x", "-x", "2x")
    const fmtStart = (n, v) => {
        if (n === 0) return "0";
        if (n === 1) return v;
        if (n === -1) return `-${v}`;
        return `${n}${v}`;
    };

    // 3. Milieu d'expression (ex: "+ x", "- x", "+ 2x")
    const fmtMiddle = (n, v) => {
        if (n === 0) return "";
        if (n === 1) return `+ ${v}`;
        if (n === -1) return `- ${v}`;
        return n > 0 ? `+ ${n}${v}` : `- ${Math.abs(n)}${v}`;
    };

    // 4. Terme au carré (ex: "x²", "-x²", "2x²")
    const fmtSquare = (n, v) => {
        if (n === 0) return "0";
        if (n === 1) return `${v}²`;
        if (n === -1) return `-${v}²`;
        return `${n}${v}²`;
    };

    const v = pick(["x", "y", "a", "t"]); // Variable aléatoire
    let q, correct, e;
    let wrong = new Set();

    // =================================================================
    // NIVEAU 1 : BASIQUE
    // Contraintes : k positif, pas de coeff devant x (1x), (x+b)
    // Variantes : 3(x+5) OU (x+5)×3
    // =================================================================
    if (lvl === 1) {
        const k = rand(2, 9); // Facteur positif
        let b = rand(1, 9); // Constante
        const isMinus = Math.random() > 0.5; // + ou - dans la parenthèse
        const isPostMult = Math.random() > 0.4; // 40% de chance d'avoir (x+5)×3

        const signStr = isMinus ? "-" : "+";
        let bVal = isMinus ? -b : b;

        // Construction de la question
        if (isPostMult) {
            q = `Développer : (${v} ${signStr} ${b}) × ${k}`;
        } else {
            q = `Développer : ${k}(${v} ${signStr} ${b})`;
        }

        // Calculs (rappel : coeff de x est 1)
        const resA = k * 1;    // Coeff devant x
        const resB = k * bVal; // Constante

        correct = `${fmtStart(resA, v)} ${fmtSign(resB)}`;

        e = `On distribue le facteur ${k} sur chaque terme :\n`;
        e += `• ${k} × ${v} = ${fmtCoef(resA, v)}\n`;
        e += `• ${k} × (${bVal}) = ${resB}`;

        // --- PIÈGES N1 ---
        // 1. Erreur de signe (ex: 3x + 15 au lieu de 3x - 15)
        wrong.add(`${fmtStart(resA, v)} ${fmtSign(-resB)}`);

        // 2. Oubli de distribuer au 2ème terme (ex: 3x - 5)
        wrong.add(`${v} ${signStr} ${b}`); // On garde juste v car coeff 1
        wrong.add(`${fmtStart(resA, v)} ${signStr} ${b}`); // Si élève met 3x - 5

        // 3. Regroupement interdit (ex: 3x + 15 -> 18x)
        const forbiddenSum = resA + resB;
        if (forbiddenSum !== 0) wrong.add(`${fmtCoef(forbiddenSum, v)}`);
        else wrong.add(`${resA + Math.abs(resB)}${v}`); // Fallback

        // 4. Addition au lieu de multiplication (ex: 3 + x + 5)
        wrong.add(`${v} ${fmtSign(k + bVal)}`);
    }

    // =================================================================
    // NIVEAU 2 : INTERMÉDIAIRE
    // On introduit UNE difficulté : Coeff, Négatif ou Lettre
    // =================================================================
    else if (lvl === 2) {
        const mode = pick(["coeff_inside", "negative_factor", "letter_factor"]);

        if (mode === "coeff_inside") {
            // Cas : 3(5a + 2) -> Coeff dans la parenthèse
            const k = rand(2, 6);
            const a = rand(2, 5); // Coeff > 1
            let b = randNz(9);

            q = `Développer : ${k}(${fmtStart(a, v)} ${fmtSign(b)})`;

            const resA = k * a;
            const resB = k * b;
            correct = `${fmtStart(resA, v)} ${fmtSign(resB)}`;

            e = `On multiplie le facteur par le coefficient de ${v} :\n• ${k} × ${fmtCoef(a, v)} = ${fmtCoef(resA, v)}\n• ${k} × (${b}) = ${resB}`;

            // Piège : Oubli de multiplier le coeff (ex: 3(5x+2) -> 5x + 6)
            wrong.add(`${fmtStart(a, v)} ${fmtSign(resB)}`);
            // Piège : Additionner k et a (ex: 8x + 6)
            wrong.add(`${fmtStart(k + a, v)} ${fmtSign(resB)}`);
        }
        else if (mode === "negative_factor") {
            // Cas : -2(3x - 5) -> Facteur négatif entier
            let k = rand(2, 6);
            k = -k;

            const a = rand(1, 5); // Peut avoir un coeff ou pas
            let b = randNz(9);

            q = `Développer : ${k}(${fmtStart(a, v)} ${fmtSign(b)})`;

            const resA = k * a;
            const resB = k * b;
            correct = `${fmtStart(resA, v)} ${fmtSign(resB)}`;

            e = `Attention au signe du facteur (${k}) !\n• ${k} × ${fmtStart(a, v)} = ${fmtCoef(resA, v)}\n• ${k} × (${b}) = ${resB}`;

            // Piège : Erreur de signe sur le 2eme (très fréquent)
            wrong.add(`${fmtStart(resA, v)} ${fmtSign(-resB)}`);
            // Piège : Oubli du signe sur le 1er
            wrong.add(`${fmtStart(Math.abs(resA), v)} ${fmtSign(resB)}`);
        }
        else {
            // Cas : x(x + 7) -> Lettre en facteur (positif simple)
            const kName = v; // Juste "x"
            const a = 1;     // On reste simple pour le coeff intérieur
            let b = randNz(9);

            q = `Développer : ${kName}(${v} ${fmtSign(b)})`;

            const resSquare = 1; // 1x²
            const resLin = b;    // bx

            correct = `${v}² ${fmtMiddle(resLin, v)}`;
            correct = correct.replace(/\s+/g, ' ').trim();

            e = `On distribue la lettre ${v} (Rappel : ${v}×${v} = ${v}²) :\n• ${v} × ${v} = ${v}²\n• ${v} × ${b} = ${fmtCoef(b, v)}`;

            // Piège : Oubli du carré (x+7x)
            wrong.add(`${v} ${fmtMiddle(resLin, v)}`);
            // Piège : x*x = 2x
            wrong.add(`2${v} ${fmtMiddle(resLin, v)}`);
            // Piège : Oubli de distribuer la lettre au 2eme (x² + 7)
            wrong.add(`${v}² ${fmtSign(b)}`);
        }

        // Piège commun N2 : Regroupement interdit
        // Pour générer ça, on calcule la "somme" des chiffres visibles
        // C'est approximatif mais suffisant pour un distractor
        wrong.add(`${rand(10, 25)}${v}`);
    }

    // =================================================================
    // NIVEAU 3 : EXPERT ("LA SAUCE")
    // Mélange : Négatif + Lettre + Coeff + Ordre inversé
    // =================================================================
    else {
        // Ex: -3x(2 - 5x)

        const c = randNz(4); // Coeff du facteur (ex: -3)
        const kName = fmtStart(c, v); // "-3x"

        const a = randNz(5); // Coeff x intérieur
        let b = randNz(9); // Constante intérieure

        const isOrderSwapped = Math.random() > 0.5; // (2 - 5x) ou (5x - 2)

        if (isOrderSwapped) {
            // k(b + ax) -> ex: -2x(5 - 3x)
            q = `Développer : ${kName}(${b} ${fmtMiddle(a, v)})`;

            // Calculs
            // Terme linéaire : (cx * b)
            const resLin = c * b;
            // Terme carré : (cx * ax)
            const resSquare = c * a;

            // On présente le résultat dans l'ordre canonique (Carré puis Linéaire)
            // ou dans l'ordre de calcul ? 
            // Pour le niveau expert, l'ordre canonique est préférable, mais l'ordre de calcul est plus naturel.
            // On va donner l'ordre canonique pour habituer au standard mathématique.
            correct = `${fmtSquare(resSquare, v)} ${fmtMiddle(resLin, v)}`;

            e = `On distribue ${kName} sur chaque terme :\n• ${kName} × ${b} = ${fmtCoef(resLin, v)}\n• ${kName} × ${fmtCoef(a, v)} = ${fmtSquare(resSquare, v)}`;
        }
        else {
            // k(ax + b) -> ex: -2x(-3x + 5)
            q = `Développer : ${kName}(${fmtStart(a, v)} ${fmtSign(b)})`;

            const resSquare = c * a;
            const resLin = c * b;

            correct = `${fmtSquare(resSquare, v)} ${fmtMiddle(resLin, v)}`;

            e = `On distribue ${kName} :\n• ${kName} × ${fmtCoef(a, v)} = ${fmtSquare(resSquare, v)}\n• ${kName} × ${b} = ${fmtCoef(resLin, v)}`;
        }

        correct = correct.replace(/\s+/g, ' ').trim();

        // --- PIÈGES N3 ---
        const trueSq = isOrderSwapped ? c * a : c * a;
        const trueLin = isOrderSwapped ? c * b : c * b;

        // 1. Erreur de signe (inversion complète)
        wrong.add(`${fmtSquare(-trueSq, v)} ${fmtMiddle(-trueLin, v)}`.replace(/\s+/g, ' ').trim());

        // 2. Oubli du carré (ex: -6x - 10x)
        wrong.add(`${fmtCoef(trueSq, v)} ${fmtMiddle(trueLin, v)}`.replace(/\s+/g, ' ').trim());

        // 3. Regroupement absurde (ex: -16x²)
        wrong.add(`${fmtSquare(trueSq + trueLin, v)}`);

        // 4. Inversion x et x² (ex: -10x² - 6x si c'était l'inverse)
        wrong.add(`${fmtSquare(trueLin, v)} ${fmtMiddle(trueSq, v)}`.replace(/\s+/g, ' ').trim());
    }

    // --- FINALISATION ---
    if (wrong.has(correct)) wrong.delete(correct);
    let wrongArray = Array.from(wrong);

    // Remplissage Filler
    let attempts = 0;
    while (wrongArray.length < 3 && attempts < 50) {
        let filler = "";

        if (correct.includes("²")) {
            // Filler quadratique
            const fA = randNz(10);
            const fB = randNz(10);
            filler = `${fmtSquare(fA, v)} ${fmtMiddle(fB, v)}`;
        } else {
            // Filler linéaire
            const fA = randNz(20);
            const fB = randNz(20);
            filler = `${fmtStart(fA, v)} ${fmtSign(fB)}`;
        }

        filler = filler.replace(/\s+/g, ' ').trim();

        if (filler !== correct && !wrongArray.includes(filler)) {
            wrongArray.push(filler);
        }
        attempts++;
    }

    return { q, o: [correct, ...wrongArray], c: 0, e };
};

// --- AUTO - FACTORISATIONS k(a+b) - VERSION PÉDAGOGIQUE CORRIGÉE ---
export const generateFactoriseQuestion = (config) => {
    // ✅ CORRECTION : On récupère le niveau ici
    const lvl = config.level || 1;

    // PGCD pour garantir la factorisation maximale
    const pgcd = (a, b) => {
        a = Math.abs(a);
        b = Math.abs(b);
        return b === 0 ? a : pgcd(b, a % b);
    };

    // --- UTILITAIRES DE FORMATAGE ---
    const v = pick(["x", "y", "a", "t"]); // Variable dynamique

    // Affiche "+ 3" ou "- 3"
    const fmtSign = (n) => n >= 0 ? `+ ${n}` : `- ${Math.abs(n)}`;

    // Pour l'affichage dans l'explication : met des parenthèses si négatif dans une multiplication
    const fmtMult = (n) => n < 0 ? `(${n})` : n;

    // COEFF PROPRE : Transforme "1t" en "t", "-1t" en "-t", "0t" en "0"
    const fmtCoeff = (n, suffix = "") => {
        if (n === 0) return "0";
        if (n === 1) return suffix;
        if (n === -1) return `-${suffix}`;
        return `${n}${suffix}`;
    };

    // Fonction pour colorer le facteur commun
    const h = (text) => `<span class="text-rose-500 font-black text-xl">${text}</span>`;

    let q, correct, e;
    let wrong = new Set();
    let detailedFeedback = {};

    const addWrong = (option, feedbackMsg) => {
        wrong.add(option);
        if (feedbackMsg) detailedFeedback[option] = feedbackMsg;
    };

    // =================================================================
    // NIVEAU 1 : INITIATION VISUELLE
    // Énoncé explicite (4 × a + 4 × 3) pour bien voir le facteur
    // =================================================================
    if (lvl === 1) {
        const k = rand(2, 9); // Facteur commun
        let b = rand(2, 9); // Deuxième nombre (le premier terme est la variable)

        const opStr = Math.random() > 0.5 ? "+" : "-";

        // Énoncé : 5 × y + 5 × 3
        q = `Factoriser : ${k} × ${v} ${opStr} ${k} × ${b}`;

        correct = `${k}(${v} ${opStr} ${b})`;

        // Explication détaillée (style récupéré de la bonne version)
        e = `Le facteur commun est ${h(k)}.\n`;
        e += `On regroupe ce qui est multiplié par ${h(k)} :\n\n`;
        e += `${h(k)} × ${v} ${opStr} ${h(k)} × ${b}\n`;
        e += `= ${h(k)} × (${v} ${opStr} ${b})\n`; // Étape intermédiaire importante
        e += `= ${h(k)}(${v} ${opStr} ${b})`;

        // Pièges
        const trapUnsimplified = `${k} × (${v} ${opStr} ${b})`;
        addWrong(trapUnsimplified, "C'est juste, mais enlève le signe × devant la parenthèse pour simplifier l'écriture.");
        addWrong(`${v}(${k} ${opStr} ${b})`); // Mauvais facteur
        addWrong(`${k}(${v} ${opStr === '+' ? '-' : '+'} ${b})`); // Erreur signe
    }

    // =================================================================
    // NIVEAU 2 : INTERMÉDIAIRE (Variable simple OU Nombre PGCD)
    // On calcule l'expression (ex: 12x + 8)
    // =================================================================
    else if (lvl === 2) {
        const mode = Math.random() > 0.5 ? "variable_simple" : "pgcd_nombre";

        if (mode === "variable_simple") {
            // Ex: x² + 5x -> x(x + 5)
            let b = randNz(9);

            // fmtCoeff(1, v+"²") donne x² ou t²
            q = `Factoriser au maximum : ${v}² ${fmtSign(b)}${v}`;

            correct = `${v}(${v} ${fmtSign(b)})`;

            e = `Le facteur commun est la lettre ${h(v)}.\n\n`;
            e += `${v}² ${fmtSign(b)}${v}\n`;
            e += `= ${h(v)} × ${v} ${b > 0 ? '+' : '-'} ${Math.abs(b)} × ${h(v)}\n`;
            e += `= ${h(v)}(${v} ${fmtSign(b)})`;

            addWrong(`${v}(${v} ${fmtSign(b * 2)})`);
            addWrong(`${v}(1 ${fmtSign(b)})`);
        }
        else {
            // Ex: 12x + 8 -> 4(3x + 2)
            const k = pick([2, 3, 4, 5, 6, 8, 10]); // Facteur commun
            let a = rand(2, 5);
            let b = randNz(5);

            // On s'assure que k est le facteur MAXIMAL (a et b premiers entre eux)
            const div = pgcd(a, b);
            a = a / div;
            b = b / div;

            const term1 = k * a;
            const term2 = k * b;

            q = `Factoriser au maximum : ${term1}${v} ${fmtSign(term2)}`;
            correct = `${k}(${fmtCoeff(a, v)} ${fmtSign(b)})`;

            e = `Le plus grand diviseur commun à ${term1} et ${Math.abs(term2)} est ${h(k)}.\n\n`;
            e += `${term1}${v} ${fmtSign(term2)}\n`;
            e += `= ${h(k)} × ${a}${v} ${b > 0 ? '+' : '-'} ${h(k)} × ${Math.abs(b)}\n`;
            e += `= ${h(k)}(${fmtCoeff(a, v)} ${fmtSign(b)})`;

            // Piège : Factorisation partielle
            if (k % 2 === 0 && k > 2) {
                const partialK = k / 2;
                const partialA = a * 2;
                const partialB = b * 2;
                addWrong(`${partialK}(${fmtCoeff(partialA, v)} ${fmtSign(partialB)})`, "Ce n'est pas faux, mais ce n'est pas le maximum ! Tu peux encore factoriser par 2.");
            }
            addWrong(`${term1}(${v} ${fmtSign(b)})`);
            addWrong(`${k}(${fmtCoeff(a, v)} ${fmtSign(b + 1)})`);
        }
    }

    // =================================================================
    // NIVEAU 3 : EXPERT (Facteur 4x, Problèmes de signes)
    // CORRECTION : "1t" -> "t", variable dynamique, et explications rétablies
    // =================================================================
    else {
        const mode = Math.random() > 0.5 ? "total_factor" : "negative";

        if (mode === "total_factor") {
            // 1. Contenu de la parenthèse (ex: 2x + 3)
            // On veut s'assurer qu'ils sont premiers entre eux pour que la factorisation soit totale
            let remCoeff = rand(1, 4); // coeff devant la variable (ex: 2)
            let remConst = randNz(5);  // constante (ex: 3)

            const div = pgcd(remCoeff, remConst);
            remCoeff = remCoeff / div;
            remConst = remConst / div;

            // 2. Facteur commun (ex: 4x)
            const kNum = rand(2, 6);
            const factorCommon = `${fmtCoeff(kNum, v)}`; // "4x" ou "2t" (jamais "1t" grâce à rand 2+)

            // 3. Construction de l'énoncé
            // (4x * 2x) + (4x * 3) = 8x² + 12x
            const term1 = kNum * remCoeff;
            const term2 = kNum * remConst;

            // Énoncé : 8t² + 12t
            q = `Factoriser au maximum : ${fmtCoeff(term1, v)}² ${fmtSign(term2)}${v}`;

            // Réponse correcte propre (pas de 1x)
            // Ex: 4x(2x + 3)
            const inside = `${fmtCoeff(remCoeff, v)} ${fmtSign(remConst)}`;
            correct = `${factorCommon}(${inside})`;

            // Explication détaillée (RÉTABLIE)
            e = `On cherche le facteur commun maximal :\n`;
            e += `- Nombres : PGCD de ${term1} et ${Math.abs(term2)} est ${kNum}.\n`;
            e += `- Lettres : ${v} est commun.\n`;
            e += `On factorise donc par ${h(factorCommon)}.\n\n`;

            // Décomposition visuelle
            e += `${fmtCoeff(term1, v)}² ${fmtSign(term2)}${v}\n`;
            // Ligne de décomposition : 4x * 2x + 4x * 3
            e += `= ${h(factorCommon)} × ${fmtCoeff(remCoeff, v)} ${remConst > 0 ? '+' : '-'} ${h(factorCommon)} × ${Math.abs(remConst)}\n`;
            e += `= ${h(factorCommon)}(${inside})`;

            // --- PIÈGES CORRIGÉS ---

            // 1. Oubli du nombre (factorise juste par x) -> x(8x + 12)
            addWrong(`${v}(${fmtCoeff(term1, v)} ${fmtSign(term2)})`, "Incomplet : tu as oublié de factoriser le nombre !");

            // 2. Oubli de la lettre (factorise juste par 4) -> 4(2x² + 3x)
            // Attention au formatage ici : remCoeff*v²
            // On veut afficher 4(2x² + 3x)
            let badInsideNum = `${fmtCoeff(remCoeff, v)}² ${fmtSign(remConst)}${v}`;
            addWrong(`${kNum}(${badInsideNum})`, `Incomplet : tu as oublié de factoriser la lettre (${v}) qui est partout !`);

            // 3. Factorisation partielle (si k est pair)
            if (kNum % 2 === 0) {
                const halfK = kNum / 2;
                let badFactor = fmtCoeff(halfK, v);
                let badRemA = remCoeff * 2;
                let badRemB = remConst * 2;
                let badInside = `${fmtCoeff(badRemA, v)} ${fmtSign(badRemB)}`;
                addWrong(`${badFactor}(${badInside})`, `Pas mal, mais tu peux faire mieux. ${badFactor} n'est pas le facteur maximal.`);
            } else {
                // Piège random signe
                addWrong(`${factorCommon}(${fmtCoeff(remCoeff, v)} ${fmtSign(-remConst)})`);
            }
        }
        else {
            // Mode Négatif : -5x - 15 -> -5(x + 3)
            const k = -rand(2, 9);
            const target = randNz(5);

            const term1 = k;
            const term2 = k * target;

            // Formatage propre : -5x (et pas -51x si k=-51)
            q = `Factoriser au maximum : ${fmtCoeff(term1, v)} ${fmtSign(term2)}`;

            // Correct : -5(x + 3)
            correct = `${k}(${v} ${fmtSign(target)})`;

            e = `Le premier terme est négatif, on factorise par ${h(k)}.\n`;
            e += `Attention aux signes lors de la division par un négatif !\n\n`;
            // Décomposition pour les signes
            e += `• ${fmtCoeff(term1, v)} = ${h(k)} × ${v}\n`;
            e += `• ${term2 > 0 ? '+' : ''}${term2} = ${h(k)} × ${fmtMult(target)}\n\n`;
            e += `Résultat : ${h(k)}(${v} ${fmtSign(target)})`;

            // Erreur signe
            addWrong(`${k}(${v} ${fmtSign(-target)})`, "Erreur de signe !");
            // Oubli du moins
            addWrong(`${Math.abs(k)}(-${v} ${fmtSign(target)})`);
            // Recopie
            addWrong(`${k}(${v} ${fmtSign(term2)})`);
        }
    }

    // --- FINALISATION ---
    // Remplissage si pas assez de choix
    let wrongArray = Array.from(wrong);
    while (wrongArray.length < 3) {
        // Génère des faux crédibles proprement formattés
        wrongArray.push(`${rand(2, 9)}(${v} ${fmtSign(randNz(5))})`);
    }

    return { q, o: [correct, ...wrongArray], c: 0, e: e, detailedFeedback: detailedFeedback };
};