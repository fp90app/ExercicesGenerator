import { rand, pick as choice, cleanNumber } from './utils';



/**
 * Génère une question de lecture graphique selon le niveau.
 * @param {object} config - { level: 1 | 2 | 3 }
 */
export const generateGraphQuestion = ({ level }) => {
    let f, type;

    // --- 1. CHOIX DE LA FONCTION SELON LE NIVEAU ---

    if (level === 1) {
        // --- NIVEAU 1 : FONCTIONS AFFINES (Droites) ---
        const a = choice([-2, -1, 1, 2, 0.5, -0.5]);
        const b = rand(-3, 3);
        f = (x) => a * x + b;
        type = 'affine';

    } else if (level === 2) {
        // --- NIVEAU 2 : FONCTIONS PARABOLIQUES (Paraboles) ---
        const a = choice([-1, -0.5, 0.5, 1]);
        const alpha = rand(-2, 2);
        const beta = rand(-4, 4);
        f = (x) => a * Math.pow(x - alpha, 2) + beta;
        type = 'parabole';

    } else {
        // --- NIVEAU 3 : FONCTIONS CUBIQUES / COMPLEXES ---
        const mode = Math.random() > 0.5 ? 'cubic' : 'complex_quad';
        if (mode === 'cubic') {
            const a = choice([0.1, 0.15, -0.1]);
            const c = choice([-1, -1.5, -2]);
            const d = rand(-2, 2);
            f = (x) => a * Math.pow(x, 3) + c * x + d;
        } else {
            f = (x) => 0.1 * Math.pow(x, 3) - 1.5 * x + 1;
        }
        type = 'complexe';
    }

    // --- 2. CHOIX DU TYPE DE QUESTION ---
    const askImage = level === 1 ? Math.random() < 0.6 : Math.random() < 0.4;
    let questionText, explanation, correctAnswers, options;
    const range = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];

    if (askImage) {
        // === QUESTION : CHERCHER L'IMAGE (On donne X, trouver Y) ===
        const xVal = choice(range);
        const yVal = cleanNumber(f(xVal)); // Arrondi propre

        // Si hors cadre, on relance
        if (Math.abs(yVal) > 6.5) return generateGraphQuestion({ level });

        questionText = `Quelle est l'image de ${xVal} par la fonction f ?`;
        correctAnswers = [yVal.toString()];

        const distractors = new Set();
        distractors.add(cleanNumber(yVal + 1).toString());
        distractors.add(cleanNumber(yVal - 1).toString());
        distractors.add(cleanNumber(-yVal).toString());
        distractors.add(cleanNumber(f(xVal + 1)).toString());

        options = Array.from(distractors).slice(0, 3);
        options.push(yVal.toString());

        explanation = `Pour trouver l'image de ${xVal}, on part de ${xVal} sur l'axe horizontal (abscisses), on rejoint la courbe, puis on lit la valeur sur l'axe vertical. Ici f(${xVal}) = ${yVal}.`;

        return {
            f,
            q: questionText,
            e: explanation,
            options: options.sort(() => Math.random() - 0.5),
            correct: correctAnswers,
            // Pour l'image, on stocke inputX pour savoir d'où partir pour le trait pointillé
            inputX: xVal,
            type: 'image'
        };

    } else {
        // === QUESTION : CHERCHER LES ANTÉCÉDENTS (On donne Y, trouver X) ===
        const xTarget = choice(range);
        const yVal = cleanNumber(f(xTarget)); // On part d'un point "propre"

        // Scan pour trouver les solutions
        const solutions = [];
        const step = 0.05;
        for (let x = -7; x <= 7; x += step) {
            const yCurrent = f(x);
            const yNext = f(x + step);
            if ((yCurrent - yVal) * (yNext - yVal) <= 0) {
                const exactX = x + (yVal - yCurrent) / (yNext - yCurrent) * step;
                // Arrondi à 0.1 près pour lecture graphique, puis clean
                const roundedX = cleanNumber(Math.round(exactX * 10) / 10);
                if (!solutions.includes(roundedX.toString())) {
                    solutions.push(roundedX.toString());
                }
            }
        }

        if (Math.abs(yVal) > 6 || solutions.length === 0) return generateGraphQuestion({ level });

        questionText = `Quels sont les antécédents de ${yVal} par la fonction f ?`;
        correctAnswers = solutions.sort();

        const distractors = new Set();
        distractors.add("0");
        distractors.add(yVal.toString());
        if (solutions.length > 0) distractors.add(cleanNumber(-parseFloat(solutions[0])).toString());
        distractors.add("Aucun");

        options = Array.from(distractors).slice(0, 3);
        solutions.forEach(sol => { if (!options.includes(sol)) options.push(sol); });
        while (options.length < 4) options.push(cleanNumber(rand(-5, 5)).toString());

        explanation = `On trace une ligne horizontale à la hauteur y = ${yVal}. On regarde pour quelles valeurs de x la courbe coupe cette ligne.`;

        return {
            f,
            q: questionText,
            e: explanation,
            options: Array.from(new Set(options)).sort((a, b) => parseFloat(a) - parseFloat(b)),
            correct: correctAnswers,
            // Pour les antécédents, on a besoin de la hauteur cible pour tracer le trait horizontal
            targetY: yVal,
            type: 'antecedent'
        };
    }
};

// --- AUTO 38 - FONCTIONS - TABLEAU <-> GRAPHIQUE ---
// Fonction utilitaire pour générer une séquence linéaire d'opérations
// src/utils/mathGenerators.js
// src/utils/mathGenerators.js

export const generateTableQuestion = (config) => {
    // 1. Extraction sécurisée du niveau
    // Si on reçoit un nombre par erreur, on gère le cas, sinon on prend l'objet
    const lvl = (typeof config === 'number') ? config : (config.level || 1);
    const clean = cleanNumber;

    // --- OUTILS ---


    // Mode : Lecture (remplir tableau) ou Tracé (placer points)
    // Au niveau 3, on fait plus souvent de la lecture (calcul inverse plus dur)
    const mode = Math.random() > (lvl === 3 ? 0.3 : 0.4) ? 'READ_TABLE' : 'PLOT_GRAPH';

    let f, fStr, points = [];

    // --- GÉNÉRATION DES FONCTIONS PAR NIVEAU ---

    if (lvl === 1) {
        // === NIVEAU 1 : Fonctions Affines Simples (Entiers) ===
        // f(x) = ax + b
        const a = choice([-2, -1, 1, 2]);
        const b = rand(-3, 3);
        f = (x) => a * x + b;

        const aStr = a === 1 ? '' : (a === -1 ? '-' : a);
        const bStr = b === 0 ? '' : (b > 0 ? `+ ${b}` : `- ${Math.abs(b)}`);
        fStr = `f(x) = ${aStr}x ${bStr}`;

        // Points entiers simples
        [-3, -2, -1, 0, 1, 2, 3].forEach(x => {
            const y = f(x);
            if (Math.abs(y) <= 6) points.push({ x, y: clean(y) });
        });

    } else if (lvl === 2) {
        // === NIVEAU 2 : Mélange Affines à virgule & Paraboles simples ===
        const type = Math.random() > 0.5 ? 'affine_dec' : 'parabole_simple';

        if (type === 'affine_dec') {
            // f(x) = 0.5x + b ou -1.5x ...
            const a = choice([0.5, -0.5, 1.5, -1.5]);
            const b = rand(-2, 2);
            f = (x) => a * x + b;
            fStr = `f(x) = ${a.toString().replace('.', ',')}x ${b >= 0 ? '+' : '-'} ${Math.abs(b)}`;
        } else {
            // f(x) = ax² + c (Symétrique par rapport à l'axe Y)
            const a = choice([-1, 1]); // Pas de coeff devant x² pour l'instant
            const c = rand(-4, 3);
            f = (x) => a * x * x + c;
            const aStr = a === 1 ? '' : '-';
            fStr = `f(x) = ${aStr}x² ${c === 0 ? '' : (c > 0 ? `+ ${c}` : c)}`;
        }

        // On scanne pour trouver des points qui tombent "juste" (entiers ou .5)
        for (let x = -5; x <= 5; x += 1) {
            const y = f(x);
            if (Math.abs(y) <= 6.5) points.push({ x, y: clean(y) });
        }

    } else {
        // === NIVEAU 3 : Paraboles décalées & Fonctions complexes ===
        // Forme canonique : a(x-alpha)² + beta
        // Cela crée des paraboles dont le sommet n'est pas sur l'axe Y -> Plus dur à lire
        const a = choice([0.5, -0.5, 1, -1]);
        const alpha = choice([-2, -1, 1, 2]); // Décalage horizontal
        const beta = rand(-3, 2); // Décalage vertical

        f = (x) => a * Math.pow(x - alpha, 2) + beta;

        // Construction string jolie
        const aPart = Math.abs(a) === 1 ? (a < 0 ? '-' : '') : a.toString().replace('.', ',');
        const signAlpha = alpha < 0 ? '+' : '-';
        fStr = `f(x) = ${aPart}(x ${signAlpha} ${Math.abs(alpha)})² ${beta >= 0 ? '+' : '-'} ${Math.abs(beta)}`;

        // Scan large
        for (let x = -6; x <= 6; x++) {
            const y = f(x);
            // On accepte les .5 pour le graphe
            if (Math.abs(y) <= 6.5 && (y * 2) % 1 === 0) {
                points.push({ x, y: clean(y) });
            }
        }
    }

    // --- SÉLECTION DES POINTS ---
    // On mélange et on en prend 3 (niv 1) ou 4/5 (niv 2/3)
    const nbPoints = lvl === 1 ? 3 : 5;
    points = points.sort(() => Math.random() - 0.5).slice(0, nbPoints).sort((a, b) => a.x - b.x);

    // --- CRÉATION DES TROUS (HOLES) ---
    const tableData = points.map(p => {
        if (mode === 'PLOT_GRAPH') {
            // Si on doit tracer, on donne tout
            return { ...p, typeX: 'given', typeY: 'given' };
        } else {
            // Si on doit remplir le tableau (Lecture Graphique)

            // Niv 1 : On donne X, trouver Y (Image) -> Facile
            // Niv 2 : Parfois on donne Y, trouver X (Antécédent)
            // Niv 3 : Souvent trouver X

            let hideX = false;
            if (lvl === 2) hideX = Math.random() > 0.7; // 30% de chance de chercher X
            if (lvl === 3) hideX = Math.random() > 0.5; // 50% de chance

            // Attention : chercher X n'est possible que si la fonction est injective sur ce point
            // ou si l'élève peut deviner visuellement. Pour une parabole, il peut y avoir 2 x pour un y.
            // Pour simplifier l'exercice et éviter la confusion, si c'est une parabole (lvl > 1),
            // on évite de demander X sauf si c'est le sommet, sinon c'est trop dur à remplir dans une seule case input.
            // On va rester simple : Principalement cacher Y, mais cacher X sur les droites.

            if (hideX && lvl === 2 && fStr.includes('x²')) hideX = false; // Sécurité pour parabole niv 2

            if (hideX) {
                return { ...p, typeX: 'hole', typeY: 'given' };
            } else {
                return { ...p, typeX: 'given', typeY: 'hole' };
            }
        }
    });

    return {
        mode,
        f,
        fStr,
        table: tableData,
        q: mode === 'READ_TABLE'
            ? (lvl === 1 ? "Complète le tableau grâce au graphique." : "Trouve les valeurs manquantes en lisant le graphique.")
            : "Place les points indiqués dans le tableau sur le graphique.",
    };
};















export const generateMeanQuestion = (config) => {
    const lvl = config.level || 1;
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const clean = cleanNumber;

    // Helper HTML pour surligner (Texte GROS et visible)
    const h = (text, color = "indigo") => `<span class="font-black text-${color}-600 text-lg leading-none">${text}</span>`;

    // Message d'erreur : marges et padding réduits au minimum
    const err = (text) => `<div class="mb-0.5 text-red-500 font-bold text-sm flex items-center gap-2 bg-red-50 p-1 rounded-lg border border-red-100 leading-tight"><i class="ph-fill ph-warning text-lg"></i> <span>${text}</span></div>`;

    // Boite d'astuces : padding-top réduit (pt-1)
    const tipBox = (list) => {
        if (!list || list.length === 0) return "";
        return `
        <div class="mt-0 pt-1 border-t border-slate-200 text-sm text-slate-600 flex flex-col gap-0 leading-tight">
             ${list.map(t => `<div class="flex gap-2 items-center"><span class="text-amber-500 text-base shrink-0">💡</span><span>${t}</span></div>`).join("")}
        </div>`;
    };

    let q, correct, e, tableData = null;
    let wrong = new Set();
    let tipsList = [];
    let detailedFeedback = {};

    // --- NIVEAU 1 : MOYENNE SIMPLE ---
    if (lvl === 1) {
        const count = rand(3, 4);
        let vals = [];

        if (count === 4 && Math.random() > 0.3) {
            const targetPair = rand(2, 4) * 10;
            const a = rand(5, targetPair / 2 - 1);
            const b = targetPair - a;
            const c = rand(5, 15);
            const d = rand(5, 15);
            vals = [a, b, c, d];
            tipsList.push(`Regroupe intelligemment : <b>${a} + ${b} = ${targetPair}</b>.`);
            vals = vals.sort(() => 0.5 - Math.random());
        } else {
            vals = Array.from({ length: count }, () => rand(5, 18));
        }

        const sum = vals.reduce((a, b) => a + b, 0);
        const mean = sum / count;

        if (mean % 0.5 !== 0) return generateMeanQuestion({ level: 1 });

        q = `Notes : ${vals.join(" ; ")}. Calculer la moyenne.`;
        correct = clean(mean);

        // --- CORRECTION ---
        // Modifications : py-0.5 (2px de hauteur) et leading-none
        e = `<div class="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm mt-0">
            <div class="flex items-center justify-between px-2 py-0.5 border-b border-slate-100 bg-slate-50">
                <span class="font-bold text-slate-500 uppercase w-20 text-sm leading-none">Somme</span>
                <span class="font-mono text-slate-700 truncate flex-1 text-center mx-2 text-base leading-none">${vals.join("+")}</span>
                <span class="font-black text-slate-800 text-lg leading-none">= ${sum}</span>
            </div>
            <div class="flex items-center justify-between px-2 py-0.5 bg-indigo-50">
                <span class="font-bold text-indigo-500 uppercase w-20 text-sm leading-none">Moyenne</span>
                <span class="font-mono font-bold text-indigo-700 flex-1 text-center text-base leading-none">${sum} ÷ ${count}</span>
                <span class="font-bold text-indigo-700 leading-none">= ${h(correct)}</span>
            </div>
        </div>`;

        if (count === 4) {
            const half = sum / 2;
            tipsList.push(`<b>Diviser par 4 = Moitié de la moitié.</b><br/>Calcul : ${sum} ÷ 2 = <b>${half}</b>, puis ${half} ÷ 2 = <b>${clean(mean)}</b>.`);
        }
        e += tipBox(tipsList);

        const priorityTrapVal = clean(vals.slice(0, count - 1).reduce((a, b) => a + b, 0) + (vals[count - 1] / count));
        wrong.add(String(priorityTrapVal));
        detailedFeedback[String(priorityTrapVal)] = err("Attention aux priorités opératoires (la multiplication est prioritaire sur l'addition). Fais la somme avant de diviser (en mettant des parenthèses si tu le fais à la calculatrice).") + e;

        wrong.add(clean(sum / (count - 1)));
        wrong.add(clean(mean + rand(1, 3)));
    }

    // --- NIVEAU 2 : MOYENNE PONDÉRÉE ---
    else if (lvl === 2) {
        const CONTEXTS = [
            { label: "Note", unit: "", q: "Moyenne des notes ?", min: 0, max: 20 },
            { label: "Temp.", unit: "°C", q: "Température moyenne ?", min: -5, max: 35 },
            { label: "Prix", unit: "€", q: "Prix moyen ?", min: 5, max: 50 },
            { label: "Taille", unit: "cm", q: "Taille moyenne ?", min: 140, max: 195 }
        ];
        const ctx = CONTEXTS[Math.floor(Math.random() * CONTEXTS.length)];

        const colCount = rand(3, 4);
        let cols = [];
        let totalEff = 0;
        let totalProd = 0;
        let minVal = 1000, maxVal = -1000;

        for (let i = 0; i < colCount; i++) {
            const val = rand(ctx.min, ctx.max);
            const eff = rand(1, 5);
            cols.push({ val, eff });
            totalEff += eff;
            totalProd += val * eff;
            if (val < minVal) minVal = val;
            if (val > maxVal) maxVal = val;
        }

        const mean = totalProd / totalEff;
        if (Math.abs(mean * 10 - Math.round(mean * 10)) > 0.001) return generateMeanQuestion({ level: 2 });

        correct = clean(mean);
        q = ctx.q;

        const isHorizontal = Math.random() > 0.5;
        const headerVal = ctx.unit ? `${ctx.label} (${ctx.unit})` : ctx.label;

        if (isHorizontal) {
            tableData = {
                orientation: 'horizontal',
                headers: [],
                rows: [
                    [headerVal, ...cols.map(c => c.val)],
                    ["Effectif", ...cols.map(c => c.eff)]
                ]
            };
        } else {
            tableData = {
                orientation: 'vertical',
                headers: [headerVal, "Effectif"],
                rows: cols.map(c => [c.val, c.eff])
            };
        }

        const productsStr = cols.map(c => `${c.val}×${c.eff}`).join(" + ");
        const effsStr = cols.map(c => c.eff).join(" + ");

        // --- CORRECTION COMPACTE ---
        // py-0.5, px-2, leading-none
        e = `<div class="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm mt-0">
            <div class="flex items-center px-2 py-0.5 border-b border-slate-100 bg-slate-50">
                <div class="w-20 font-bold text-slate-500 uppercase text-right mr-2 shrink-0 text-sm leading-none">Total</div>
                <div class="font-mono text-slate-700 truncate flex-1 text-sm md:text-base leading-none" title="${productsStr}">${productsStr}</div>
                <div class="font-black text-slate-800 ml-1 text-lg whitespace-nowrap leading-none">= ${totalProd}</div>
            </div>

            <div class="flex items-center px-2 py-0.5 border-b border-slate-100 bg-slate-50">
                <div class="w-20 font-bold text-slate-500 uppercase text-right mr-2 shrink-0 text-sm leading-none">Effectif</div>
                <div class="font-mono text-slate-700 truncate flex-1 text-sm md:text-base leading-none">${effsStr}</div>
                <div class="font-black text-slate-800 ml-1 text-lg whitespace-nowrap leading-none">= ${totalEff}</div>
            </div>

            <div class="flex items-center justify-between px-2 py-0.5 bg-indigo-50">
                <span class="font-bold text-indigo-500 uppercase w-20 text-right mr-2 text-sm leading-none">Moyenne</span>
                <span class="font-mono font-bold text-indigo-700 flex-1 text-center text-lg leading-none">${totalProd} ÷ ${totalEff}</span>
                <span class="font-black text-indigo-700 text-lg whitespace-nowrap leading-none">= ${h(correct)} ${ctx.unit}</span>
            </div>
        </div>`;

        tipsList.push("Moyenne = (Somme des Produits) ÷ (Total Effectif).");
        e += tipBox(tipsList);

        const impossibleVal = Math.random() > 0.5 ? minVal - rand(2, 10) : maxVal + rand(2, 10);
        wrong.add(String(impossibleVal));
        detailedFeedback[String(impossibleVal)] = err("Impossible ! Le résultat doit être entre la plus petite et la plus grande valeur.") + e;

        let sumValues = cols.reduce((acc, c) => acc + c.val, 0);
        const simpleMean = clean(sumValues / colCount);
        wrong.add(String(simpleMean));
        detailedFeedback[String(simpleMean)] = err("Erreur : Il faut multiplier par les effectifs !") + e;

        wrong.add(clean(totalProd / (totalEff - 1)));
    }

    // --- NIVEAU 3 : PROBLÈMES INVERSES ---
    else {
        const mode = Math.random() > 0.5 ? "missing_note" : "correction";

        if (mode === "missing_note") {
            const n = 3;
            const currentVals = [rand(8, 14), rand(8, 14), rand(8, 14)];
            const currentSum = currentVals.reduce((a, b) => a + b, 0);
            const targetMean = rand(12, 16);
            const totalNotes = n + 1;
            const targetVal = (targetMean * totalNotes) - currentSum;

            if (targetVal < 0 || targetVal > 20) return generateMeanQuestion({ level: 3 });

            q = `Notes de Léo : ${currentVals.join("; ")}. Quelle note faut-il pour avoir ${targetMean} de moyenne ?`;
            correct = String(targetVal);

            e = `<div class="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm mt-0">
                <div class="flex justify-between items-center px-2 py-0.5 border-b border-slate-100 bg-slate-50">
                    <span class="text-slate-500 w-28 font-bold uppercase text-sm leading-none">Points Visés</span>
                    <span class="font-mono text-slate-700 flex-1 text-center text-base leading-none">${targetMean} × ${totalNotes} notes</span>
                    <span class="font-black text-slate-800 text-lg leading-none">= ${targetMean * totalNotes}</span>
                </div>
                <div class="flex justify-between items-center px-2 py-0.5 border-b border-slate-100 bg-slate-50">
                    <span class="text-slate-500 w-28 font-bold uppercase text-sm leading-none">Points Actuels</span>
                    <span class="font-mono text-slate-700 flex-1 text-center text-base leading-none">${currentVals.join("+")}</span>
                    <span class="font-black text-slate-800 text-lg leading-none">= ${currentSum}</span>
                </div>
                <div class="flex justify-between items-center px-2 py-0.5 bg-indigo-50 font-bold text-indigo-700">
                    <span class="uppercase w-28 text-sm leading-none">Manquant</span>
                    <span class="flex-1 text-center font-mono text-lg leading-none">${targetMean * totalNotes} - ${currentSum}</span>
                    <span class="text-lg leading-none">= ${h(targetVal)}</span>
                </div>
            </div>`;

            tipsList.push(`Calcul : Total Visé (${targetMean * totalNotes}) - Total Actuel (${currentSum}).`);
            e += tipBox(tipsList);

            wrong.add(String(targetMean));
            wrong.add(String(targetVal + 2));
            wrong.add(String(targetVal - 2));
        }
        else {
            const nbEleves = 9;
            const oldMean = rand(10, 14);
            const forgottenNote = rand(5, 18);
            const oldSum = oldMean * nbEleves;
            const newSum = oldSum + forgottenNote;
            const newMean = newSum / (nbEleves + 1);

            if (Math.abs(newMean * 10 - Math.round(newMean * 10)) > 0.001) return generateMeanQuestion({ level: 3 });

            q = `Moyenne de ${nbEleves} élèves : ${oldMean}/20. On ajoute Thomas qui a eu ${forgottenNote}. Nouvelle moyenne ?`;
            correct = clean(newMean);

            e = `<div class="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-sm mt-0">
                <div class="flex justify-between px-2 py-0.5 border-b border-slate-100 bg-slate-50">
                    <span class="text-slate-500 text-sm uppercase font-bold w-28 leading-none">Ancien Total</span>
                    <span class="font-mono text-slate-700 text-base flex-1 text-center leading-none">${nbEleves} × ${oldMean}</span>
                    <span class="font-black text-slate-800 text-lg leading-none">= ${oldSum}</span>
                </div>
                <div class="flex justify-between px-2 py-0.5 border-b border-slate-100 bg-slate-50">
                    <span class="text-slate-500 text-sm uppercase font-bold w-28 leading-none">Nouveau Total</span>
                    <span class="font-mono text-slate-700 text-base flex-1 text-center leading-none">${oldSum} + ${forgottenNote}</span>
                    <span class="font-black text-slate-800 text-lg leading-none">= ${newSum}</span>
                </div>
                <div class="flex justify-between items-center px-2 py-0.5 bg-indigo-50">
                    <span class="text-indigo-500 font-bold text-sm uppercase w-28 leading-none">Nouvelle Moyenne</span>
                    <span class="font-mono font-bold text-indigo-700 flex-1 text-center text-lg leading-none">${newSum} ÷ ${nbEleves + 1}</span>
                    <span class="font-bold text-indigo-700 text-lg leading-none">= ${h(correct)}</span>
                </div>
            </div>`;

            wrong.add(clean((oldMean + forgottenNote) / 2));
            wrong.add(clean(oldMean));

            const badDiv = clean(newSum / nbEleves);
            wrong.add(String(badDiv));
            detailedFeedback[String(badDiv)] = err(`Divise par ${nbEleves + 1} (il y a un élève en plus) !`) + e;
        }
    }

    // --- FINALISATION DES RÉPONSES ---
    if (wrong.has(correct)) wrong.delete(correct);
    if (wrong.has(String(correct))) wrong.delete(String(correct));

    let o = Array.from(wrong).map(String);
    let attempts = 0;
    while (o.length < 3 && attempts < 50) {
        attempts++;
        let fake = clean(parseFloat(correct) + rand(-3, 3) + (Math.random() > 0.5 ? 0.5 : 0));
        if (String(fake) !== String(correct) && !o.includes(String(fake))) o.push(String(fake));
    }

    return {
        q,
        o: [String(correct), ...o],
        c: 0,
        e,
        tableData: tableData,
        detailedFeedback: detailedFeedback,
        allowCalc: lvl > 1
    };
};