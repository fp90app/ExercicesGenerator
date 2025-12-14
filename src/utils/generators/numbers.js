import { rand } from './utils';
const randInt = (max) => rand(1, max);



// --- AUTO 01 - CALIBRAGE DOUCEUR ---
export const generateFractionQuestion = (config) => {
    const { submodes, sens } = config;
    const modesDispo = (submodes && submodes.length > 0) ? submodes : ["demis"];
    const currentFamily = modesDispo[Math.floor(Math.random() * modesDispo.length)];

    let num, den;

    // Helper: petit nombre impair (1, 3, 5, 7)
    const smallOdd = () => [1, 3, 5, 7][Math.floor(Math.random() * 4)];



    switch (currentFamily) {
        // NIVEAU 1 (Très accessible)
        case "demis": den = 2; num = smallOdd(); break; // Max 7/2 = 3.5
        case "quarts": den = 4; num = [1, 3, 5, 7, 9][Math.floor(Math.random() * 5)]; break; // Max 2.25
        case "dixiemes": den = 10; num = randInt(19); break; // Max 1.9
        case "cinquiemes": den = 5; num = [1, 2, 3, 4, 6, 7, 8, 9][Math.floor(Math.random() * 8)]; break; // Max 1.8

        // NIVEAU 2 & 3 (Plus costaud)
        case "centiemes": den = 100; num = randInt(150); break;
        case "huitiemes": den = 8; num = [1, 3, 5, 7, 9, 11][Math.floor(Math.random() * 6)]; break;
        case "vingtiemes": den = 20; num = randInt(39); break;
        case "vingt_cinquiemes": den = 25; num = randInt(49); break;
        case "milliemes": den = 1000; num = randInt(1999); break;
        case "entiers":
            const k = randInt(5) + 1; // 2 à 6
            const base = [2, 4, 5, 10][Math.floor(Math.random() * 4)];
            den = base; num = base * k;
            break;
        default: num = 1; den = 2;
    }

    const val = num / den;
    const txtFraction = `${num}/${den}`;
    const txtDecimal = String(parseFloat(val.toFixed(3))).replace('.', ',');

    let isFtoD = true;
    if (sens === "mixte") isFtoD = Math.random() > 0.5;
    else if (sens === "d_vers_f") isFtoD = false;

    let q, correct, e, o;

    if (isFtoD) {
        q = `${txtFraction} = ?`;
        correct = txtDecimal;
        e = `${txtFraction}, c'est ${num} ÷ ${den}.`;
        // Pièges simples
        let w1 = String((val * 10).toFixed(3) / 1).replace('.', ',');
        let w2 = String((val + 0.1).toFixed(3) / 1).replace('.', ',');
        if (den === 2) w2 = String(val + 0.5).replace('.', ','); // Piège +0.5

        o = [correct, w1, w2];
    } else {
        q = `${txtDecimal} en fraction ?`;
        correct = txtFraction;
        e = `${txtDecimal} correspond à ${txtFraction}.`;
        let w1 = `${den}/${num}`;
        let w2 = `${num}/${den * 10}`;
        if (val === 0.5) { w1 = "1/5"; w2 = "5/10"; }
        o = [correct, w1, w2];
    }
    return { q: q, o: [...new Set(o)], c: 0, e: e };
};
// --- AUTO 02 - CALIBRAGE DOUCEUR ---
export const generateDecimalQuestion = (config) => {
    const { submodes } = config;
    // Liste des modes valides supportés par le switch ci-dessous
    const VALID_MODES = ["comparaison_pos", "mult_simple", "complement", "comparaison_rel", "somme_rel", "produit_rel"];

    // On s'assure que les modes demandés existent vraiment, sinon on force "comparaison_pos"
    let modes = (submodes && submodes.length > 0)
        ? submodes.filter(m => VALID_MODES.includes(m))
        : ["comparaison_pos"];

    // Sécurité ultime : si le filtrage a tout vidé, on remet une valeur par défaut
    if (modes.length === 0) modes = ["comparaison_pos"];

    const mode = modes[Math.floor(Math.random() * modes.length)];

    let q, correct, e, o = [];
    const fmt = (n) => String(parseFloat(Number(n).toFixed(4))).replace('.', ',');

    switch (mode) {
        case "comparaison_pos":
            const base = Math.floor(Math.random() * 10);
            let n1 = base + (Math.floor(Math.random() * 9) + 1) / 10;
            let n2 = n1 + (Math.random() > 0.5 ? 0.1 : -0.1);
            if (Math.random() > 0.66) n2 = base + (Math.floor(Math.random() * 90) + 10) / 100;
            if (Math.abs(n1 - n2) < 0.001) n2 += 0.1;

            const s1 = fmt(n1);
            const s2 = fmt(n2);
            q = `Qui est le plus grand : ${s1} ou ${s2} ?`;
            const winner = (n1 > n2) ? s1 : s2;
            const loser = (n1 > n2) ? s2 : s1;
            correct = winner;
            e = `Comparaison rang par rang : ${winner} est plus grand.`;
            o = [winner, loser, "Ils sont égaux"];
            break;

        case "mult_simple":
            const ops = [10, 100, 0.1, 0.5];
            const op = ops[Math.floor(Math.random() * ops.length)];
            let nBase;
            if (op === 0.5) nBase = (Math.floor(Math.random() * 20) + 1) * 2;
            else nBase = Math.floor(Math.random() * 50) + 2;

            q = `${nBase} × ${fmt(op)} = ?`;
            correct = fmt(nBase * op);
            if (op === 0.5) e = "Multiplier par 0,5 = Diviser par 2.";
            else if (op === 0.1) e = "Décale la virgule à gauche.";
            else e = "Décale la virgule à droite.";
            o = [correct, fmt(nBase * op * 10), fmt(nBase * op / 10)];
            break;

        case "complement":
            const target = Math.random() > 0.5 ? 1 : 10;
            let val;
            if (target === 1) val = (Math.floor(Math.random() * 9) + 1) / 10;
            else val = (Math.floor(Math.random() * 80) + 11) / 10;

            const res = target - val;
            q = `${fmt(val)} + ? = ${target}`;
            correct = fmt(res);
            e = `Complément pour aller à ${target}.`;
            o = [correct, fmt(res + 1), fmt(res + 0.1), fmt(res - 0.1)];
            break;

        case "comparaison_rel":
            const ra = (Math.floor(Math.random() * 50) + 1) / 10;
            const rb = ra + 1.5;
            q = `Qui est le plus grand : ${fmt(-ra)} ou ${fmt(-rb)} ?`;
            correct = fmt(-ra);
            e = `${fmt(-ra)} est plus proche de zéro (plus chaud).`;
            o = [fmt(-ra), fmt(-rb), "Ils sont égaux"];
            break;

        case "somme_rel":
            const rx = Math.floor(Math.random() * 10) + 1;
            const ry = Math.floor(Math.random() * 10) + 1;
            q = `-${rx} + ${ry} = ?`;
            correct = fmt(-rx + ry);
            e = "Bataille de signes.";
            o = [correct, fmt(rx + ry), fmt(-(rx + ry))];
            break;

        case "produit_rel":
            const m1 = Math.floor(Math.random() * 10) + 1;
            const m2 = Math.floor(Math.random() * 5) + 1;
            q = `-${m1} × (-${m2}) = ?`;
            correct = fmt(m1 * m2);
            e = "Moins par moins donne plus.";
            o = [correct, fmt(-(m1 * m2)), fmt(m1 + m2)];
            break;

        default:
            // CAS DE SECOURS INTELLIGENT (Au lieu de 1+1)
            // On génère une addition décimale simple
            const defA = (Math.floor(Math.random() * 90) + 10) / 10; // ex: 2.3
            const defB = (Math.floor(Math.random() * 90) + 10) / 10; // ex: 4.5
            q = `${fmt(defA)} + ${fmt(defB)} = ?`;
            correct = fmt(defA + defB);
            e = "Additionne les parties entières et décimales.";
            o = [correct, fmt(defA + defB + 1), fmt(defA + defB - 0.1)];
            break;
    }
    return { q, o: [...new Set(o)], c: 0, e };
};

// --- AUTO 03 - VERSION CORRIGÉE (Feedback Simplification & /0) ---
export const generateFractionOpsQuestion = (config) => {
    const lvl = config.level || 1;

    const getPgcd = (a, b) => b === 0 ? a : getPgcd(b, a % b);

    // Helper : Crée un objet fraction avec toutes les formes nécessaires
    const toFrac = (n, d) => {
        // Cas division par zéro (Piège Q3)
        if (d === 0) return {
            val: `${n}/0`,
            rawVal: `${n}/0`,
            isZeroDiv: true,
            isSimplifiable: false
        };

        const sign = (n * d < 0) ? "-" : "";
        const absN = Math.abs(n);
        const absD = Math.abs(d);
        const div = getPgcd(absN, absD);

        return {
            val: (absD / div === 1) ? `${sign}${absN / div}` : `${sign}${absN / div}/${absD / div}`, // Forme Simplifiée (ex: 5/2)
            rawVal: `${sign}${absN}/${absD}`, // Forme Brute (ex: 15/6)
            num: (absN / div) * (sign === "-" ? -1 : 1),
            den: absD / div,
            isSimplifiable: div > 1 // Vrai si on peut simplifier
        };
    };

    let mode;
    if (lvl === 1) mode = "somme_simple";
    else if (lvl === 2) mode = "somme_multiple";
    else mode = "division";

    let q, correctData, genericExpl;

    // Dictionnaire pour stocker les feedbacks spécifiques
    // Clé = Le texte affiché sur le bouton, Valeur = Le message d'aide
    let feedbacks = {};
    let optionsSet = new Set();

    // Fonction pour ajouter une réponse et son aide
    const addOption = (valueAsString, helpMessage) => {
        if (!optionsSet.has(valueAsString)) {
            optionsSet.add(valueAsString);
            feedbacks[valueAsString] = helpMessage;
        }
    };

    // =================================================================
    // NIVEAU 1 : MÊME DÉNOMINATEUR (ADDITION & SOUSTRACTION)
    // =================================================================
    if (mode === "somme_simple") {
        const d = rand(3, 12);
        // On force des nombres qui donnent souvent lieu à simplification (pairs, multiples de 3)
        const n1 = rand(2, 9);
        const n2 = rand(2, 9);
        const isSub = Math.random() > 0.5;

        let a = Math.max(n1, n2);
        let b = Math.min(n1, n2);

        const opSign = isSub ? '-' : '+';
        const opName = isSub ? 'soustrait' : 'additionne';

        q = `Calculer et simplifier : ${a}/${d} ${opSign} ${b}/${d} = ?`;

        const resNum = isSub ? a - b : a + b;
        correctData = toFrac(resNum, d);

        // Explication générique (si l'élève clique sur une réponse "au hasard")
        genericExpl = `Règle : On garde le dénominateur commun (${d}) et on ${opName} les numérateurs.`;

        // 1. AJOUT DE LA BONNE RÉPONSE (Toujours simplifiée)
        // Note: On ne met pas de feedback spécifique pour la bonne réponse ici, c'est géré par le composant Game
        optionsSet.add(correctData.val);

        // 2. PIÈGE OBLIGATOIRE : RÉSULTAT NON SIMPLIFIÉ (ex: 15/6)
        if (correctData.isSimplifiable) {
            // On ajoute explicitement la version brute
            addOption(correctData.rawVal,
                `C'est le bon résultat du calcul (${correctData.rawVal}), mais tu as oublié de simplifier la fraction ! La réponse attendue est ${correctData.val}.`
            );
        }

        // 3. PIÈGE OBLIGATOIRE : ERREUR SUR LES DÉNOMINATEURS
        if (isSub) {
            // Soustraction : d - d = 0 (ex: 3/0)
            const zeroTrap = `${resNum}/0`;
            addOption(zeroTrap,
                `Impossible ! Tu as soustrait les dénominateurs (${d} - ${d} = 0). On ne touche JAMAIS au dénominateur commun, on le garde tel quel.`
            );
        } else {
            // Addition : d + d (ex: 6/12 au lieu de 6/6)
            const wAddDenom = toFrac(resNum, d + d);
            addOption(wAddDenom.rawVal,
                `Faux ! Tu as additionné les nombres du bas (${d}+${d}). Le dénominateur doit rester le même (${d}).`
            );
        }

        // 4. PIÈGE : ERREUR DE CALCUL (Opération inverse)
        const fakeNum = isSub ? (a + b) : Math.abs(a - b);
        const wOp = toFrac(fakeNum, d);
        addOption(wOp.val,
            `Erreur de calcul : tu as fait une ${isSub ? 'addition' : 'soustraction'} au lieu d'une ${isSub ? 'soustraction' : 'addition'} sur les numérateurs.`
        );
    }

    // =================================================================
    // NIVEAU 2 : DÉNOMINATEURS MULTIPLES
    // =================================================================
    else if (mode === "somme_multiple") {
        const d1 = [2, 3, 4, 5, 10][rand(0, 4)];
        const k = rand(2, 4);
        const d2 = d1 * k;
        const n1 = rand(1, d1 - 1) || 1;
        const n2 = rand(1, d2 - 1) || 1;

        const isSub = Math.random() > 0.4 && ((n1 * k) > n2);
        const opSign = isSub ? '-' : '+';

        q = `Calculer et simplifier : ${n1}/${d1} ${opSign} ${n2}/${d2} = ?`;

        const n1_scaled = n1 * k;
        const resNum = isSub ? (n1_scaled - n2) : (n1_scaled + n2);
        correctData = toFrac(resNum, d2);

        genericExpl = `Il faut d'abord mettre au même dénominateur (${d2}) en faisant ×${k} sur la première fraction.`;

        // 1. BONNE RÉPONSE
        optionsSet.add(correctData.val);

        // 2. PIÈGE : NON SIMPLIFIÉ
        if (correctData.isSimplifiable) {
            addOption(correctData.rawVal,
                `Calcul correct (${correctData.rawVal}), mais incomplet ! Tu dois simplifier la fraction pour trouver ${correctData.val}.`
            );
        }

        // 3. PIÈGE : OUBLI DE MISE À L'ÉCHELLE (ex: 3/5 + 2/15 -> 5/15)
        const wForgotScale = toFrac(isSub ? n1 - n2 : n1 + n2, d2);
        // On affiche la forme brute (5/15) car c'est celle que l'élève a en tête
        addOption(wForgotScale.rawVal,
            `Tu as gardé le dénominateur ${d2}, mais tu as oublié de multiplier le numérateur de la première fraction par ${k} !`
        );

        // 4. PIÈGE : ADDITION DÉNOMINATEURS
        const wFatal = toFrac(resNum, d1 + d2);
        addOption(wFatal.rawVal,
            "Non ! On n'additionne jamais les dénominateurs. Trouve le multiple commun."
        );
    }

    // =================================================================
    // NIVEAU 3 : DIVISION
    // =================================================================
    else {
        const n1 = rand(1, 6), d1 = rand(2, 7);
        const n2 = rand(1, 6), d2 = rand(2, 7);

        q = `Calculer et simplifier : ${n1}/${d1} ÷ ${n2}/${d2} = ?`;
        correctData = toFrac(n1 * d2, d1 * n2);
        genericExpl = `Règle : Pour diviser par une fraction, on multiplie par son inverse (× ${d2}/${n2}).`;

        optionsSet.add(correctData.val);

        // PIÈGE : NON SIMPLIFIÉ
        if (correctData.isSimplifiable) {
            addOption(correctData.rawVal, "C'est le bon résultat, mais tu dois le simplifier (réduire la fraction).");
        }

        // PIÈGE : Multiplication directe
        const wMult = toFrac(n1 * n2, d1 * d2);
        addOption(wMult.val, "Non, tu as multiplié en ligne. Pour diviser, il faut inverser la DEUXIÈME fraction.");

        // PIÈGE : Inverse la mauvaise
        const wInv1 = toFrac(d1 * n2, n1 * d2);
        addOption(wInv1.val, "Tu as inversé la première fraction. C'est toujours la DEUXIÈME qu'il faut inverser.");
    }

    // --- REMPLISSAGE FINAL (Si on n'a pas 4 options) ---
    // On comble avec des réponses au hasard mais crédibles (bon dénominateur)
    let attempts = 0;
    while (optionsSet.size < 4 && attempts < 50) {
        attempts++;
        let fakeNum = correctData.num + rand(1, 5) * (Math.random() > 0.5 ? 1 : -1);
        if (fakeNum <= 0) fakeNum = 1;

        const fake = toFrac(fakeNum, correctData.den);

        // On n'ajoute que si ce n'est pas déjà dans la liste
        if (!optionsSet.has(fake.val) && fake.val !== correctData.val) {
            addOption(fake.val, genericExpl);
        }
    }

    // Conversion Set -> Array pour l'affichage
    const finalOptions = Array.from(optionsSet);

    // Note : On s'assure que la bonne réponse est dedans (déjà fait au début)
    // Le mélange se fait dans le composant Game

    return {
        q: q,
        o: finalOptions,
        c: 0, // Inutile ici car Game utilise mixedAnswers et cherche la string correcte
        e: genericExpl,
        detailedFeedback: feedbacks
    };
};
// --- AUTO 04 - CALIBRAGE DOUCEUR ---
export const generateFractionOfNumberQuestion = (config) => {
    const { submodes } = config;

    // 1. Liste des modes valides
    const VALID_MODES = ["vocab_simple", "classique_entier", "grands_nombres", "temps"];

    // 2. Sécurité : Si pas de config ou config invalide, on prend des modes par défaut
    let modes = (submodes && submodes.length > 0)
        ? submodes.filter(m => VALID_MODES.includes(m))
        : ["vocab_simple", "classique_entier"]; // Par défaut : mélange vocabulaire et calcul simple

    // Ultime sécurité
    if (modes.length === 0) modes = ["vocab_simple"];

    const mode = modes[Math.floor(Math.random() * modes.length)];

    let q, correct, e, o = [];
    const fmt = (n) => String(parseFloat(Number(n).toFixed(4))).replace('.', ',');

    const getVocab = (den, n) => {
        if (n === 1 && den === 2) return "La moitié de";
        if (n === 1 && den === 3) return "Le tiers de";
        if (n === 1 && den === 4) return "Le quart de";
        if (n === 3 && den === 4) return "Les trois quarts de";
        if (n === 1 && den === 10) return "Le dixième de";
        if (n === 1 && den === 5) return "Le cinquième de";
        return `${n}/${den} de`;
    };

    switch (mode) {
        case "vocab_simple":
            // Dénominateurs ultra classiques
            const d1 = [2, 3, 4, 5, 10][Math.floor(Math.random() * 5)];
            // On prend un multiple simple (ex: table de 2, 3, 4...)
            const k1 = Math.floor(Math.random() * 10) + 1; // 1 à 10
            const target1 = k1 * d1;

            q = `${getVocab(d1, 1)} ${target1} ?`;
            correct = k1;
            e = `${target1} ÷ ${d1} = ${correct}.`;
            o = [fmt(correct), fmt(correct * 2), fmt(target1 / 2)];
            break;

        case "classique_entier":
            // Ex: 2/3 de 15. Dénominateur < 10
            const d2 = [3, 4, 5, 6, 8, 10][Math.floor(Math.random() * 6)];
            let n2 = 1;
            if (d2 > 2) n2 = Math.floor(Math.random() * (d2 - 1)) + 1;

            const k2 = Math.floor(Math.random() * 10) + 1;
            const target2 = d2 * k2;

            // Une fois sur deux on affiche "2/3" ou "Deux tiers" si dispo
            const phrase = Math.random() > 0.5 ? getVocab(d2, n2) : `${n2}/${d2} de`;
            q = `Calculer ${phrase} ${target2}`;

            correct = (target2 / d2) * n2;
            e = `${target2} ÷ ${d2} = ${k2}. Puis ${k2} × ${n2} = ${correct}.`;
            o = [fmt(correct), fmt(k2), fmt(correct + d2)];
            break;

        case "grands_nombres": // Niveau 2
            const d3 = [10, 100, 1000][Math.floor(Math.random() * 3)];
            const n3 = Math.floor(Math.random() * 5) + 1;
            const target3 = d3 * (Math.floor(Math.random() * 9) + 1);
            q = `${n3}/${d3} de ${target3} ?`;
            correct = (target3 / d3) * n3;
            e = `Divise par ${d3} puis fois ${n3}.`;
            o = [fmt(correct), fmt(correct * 10), fmt(correct / 10)];
            break;

        case "temps": // Niveau 3
            const times = [
                { n: 1, d: 4, t: 60 }, { n: 3, d: 4, t: 60 }, { n: 1, d: 2, t: 60 }, // Minutes
                { n: 1, d: 3, t: 60 }, { n: 2, d: 3, t: 60 }, { n: 1, d: 10, t: 60 },
                { n: 1, d: 4, t: 24 }, { n: 1, d: 2, t: 24 } // Heures dans un jour
            ];
            const item = times[Math.floor(Math.random() * times.length)];
            const unit = item.t === 60 ? "d'heure en min" : "de jour en h";

            q = `${item.n}/${item.d} ${unit} ?`;
            correct = (item.t / item.d) * item.n;
            e = `${item.t} ÷ ${item.d} × ${item.n} = ${correct}`;
            o = [fmt(correct), fmt(correct * 2), fmt(correct + 10)];
            break;

        default:
            // CAS DE SECOURS GÉNÉRIQUE (Au lieu de Moitié de 10)
            // On génère une moitié simple aléatoire
            const rNum = (Math.floor(Math.random() * 20) + 1) * 2; // Nombre pair entre 2 et 40
            q = `Moitié de ${rNum} ?`;
            correct = rNum / 2;
            o = [correct, correct * 2, correct + 2];
            e = `${rNum} ÷ 2 = ${correct}`;
    }
    return { q, o: [...new Set(o.map(x => String(x)))], c: 0, e };
};

// --- AUTO 05 - POURCENTAGES SIMPLES ---
export const generatePercentQuestion = (config) => {
    const lvl = config.level || 1;

    const fmt = (n) => String(parseFloat(Number(n).toFixed(3))).replace('.', ',');

    let rate, target, mode;

    // --- STRATÉGIE PAR NIVEAU ---

    if (lvl === 1) {
        // BASES : 50%, 10%, 100% sur des nombres "ronds"
        const modes = ["50", "10", "100"];
        mode = modes[rand(0, modes.length - 1)];

        if (mode === "50") { // Moitié
            target = rand(1, 20) * 2; // Nombres pairs jusqu'à 40 + dizaines
            if (Math.random() > 0.5) target = rand(1, 9) * 10;
        }
        else if (mode === "10") { // Diviser par 10
            target = rand(1, 20) * 10; // 10, 20... 200
        }
        else { // 100%
            target = rand(1, 100);
        }
        rate = parseInt(mode);
    }
    else if (lvl === 2) {
        // INTERMÉDIAIRE : 25%, 20%, 200%, et 10% sur décimaux
        const modes = ["25", "20", "200", "10_dec"];
        mode = modes[rand(0, modes.length - 1)];

        if (mode === "25") { // Quart
            target = rand(1, 10) * 4; // Multiples de 4
            if (Math.random() > 0.5) target = rand(1, 5) * 100; // 100, 200...
        }
        else if (mode === "20") { // 2 x 10%
            target = rand(1, 10) * 10; // 10, 20... 100
        }
        else if (mode === "200") { // Double
            target = rand(1, 20);
            if (Math.random() > 0.5) target = (rand(1, 9) / 10); // 0.5...
        }
        else { // 10% dur (décimaux)
            mode = "10"; rate = 10;
            target = rand(1, 99); // ex: 42 -> 4,2
        }

        if (mode !== "10_dec") rate = parseInt(mode);
    }
    else {
        // EXPERT : 75%, 1%, 30%/40%, et calculs composés
        const modes = ["75", "1", "30_40", "50_dec"];
        mode = modes[rand(0, modes.length - 1)];

        if (mode === "75") { // 3/4
            target = rand(1, 10) * 4; // Multiples de 4 pour tomber juste
        }
        else if (mode === "1") { // Diviser par 100
            target = rand(1, 9) * 100; // 300 -> 3
            if (Math.random() > 0.5) target = rand(1, 100); // 42 -> 0,42
        }
        else if (mode === "30_40") { // Multiples de 10%
            rate = [30, 40, 60][rand(0, 2)];
            target = rand(1, 10) * 10; // 20, 30...
        }
        else { // 50% sur nombres impairs ou décimaux
            mode = "50"; rate = 50;
            target = rand(1, 19); // 7 -> 3,5
            if (Math.random() > 0.5) target = target / 10; // 0,7 -> 0,35
        }

        if (mode !== "30_40" && mode !== "50") rate = parseInt(mode);
    }

    // --- CALCUL ET EXPLICATION ---
    const result = (target * rate) / 100;
    const q = `${rate}% de ${fmt(target)} ?`;
    let e = "";

    if (rate === 50) e = `50% d'une quantité, c'est la moitié. Ici, c'est donc la moitié de ${fmt(target)}.`;
    else if (rate === 100) e = "100% d'une quantité = l'ensemble de cette quantité. 100% de 15 = 15 !";
    else if (rate === 200) e = `200% d'une quantité, c'est le double. Ici c'est donc le double de ${fmt(target)}.`;
    else if (rate === 10) e = "10% c'est l'équivalent d'une division par 10 car il y a 10 fois 10% dans 100%.";
    else if (rate === 1) e = "1% c'est l'équivalent d'une division par 100 car il y a 100 fois 1% dans 100%.";
    else if (rate === 25) e = `C'est le quart (la moitié de la moitié) car il y a 4 fois 25% dans 100%.`;
    else if (rate === 20) e = `Calcule 10% (${fmt(target / 10)}) et double-le.`;
    else if (rate === 75) e = `75% c'est 3 fois 25%, soit 3 fois le quart (quart=${fmt(target / 4)}).`;
    else if (rate % 10 === 0) e = `Calcule 10% (${fmt(target / 10)}) et multiplie par ${rate / 10}.`;

    // --- GÉNÉRATION DES RÉPONSES ---
    const correct = fmt(result);
    let o = [correct];

    // Pièges intelligents
    o.push(fmt(result * 10)); // Erreur de virgule
    o.push(fmt(result / 10)); // Erreur de virgule

    if (rate === 50) o.push(fmt(target * 2)); // Double au lieu de moitié
    else if (rate === 25) o.push(fmt(target / 2)); // Moitié au lieu de quart
    else if (rate === 10) o.push(fmt(target - 10)); // Soustraction au lieu de %
    else o.push(fmt(result * 2)); // Random plausible

    return { q: q, o: [...new Set(o)], c: 0, e: e };
};

// --- AUTO 06 - FORMES MULTIPLES (Smart Feedback) ---
export const generateMultipleFormsQuestion = (config) => {
    const lvl = config.level || 1;


    // Base de données des valeurs clés du collège
    // lvl: niveau d'apparition
    const DATA = [
        // DEMIS
        { val: 0.5, dec: "0,5", frac: "1/2", pct: "50%", traps: ["1/5", "1,2", "5/100"], lvl: 1 },
        { val: 1.5, dec: "1,5", frac: "3/2", pct: "150%", traps: ["1/5", "3,2", "15/100"], lvl: 2 },
        { val: 2.5, dec: "2,5", frac: "5/2", pct: "250%", traps: ["2/5", "5,2", "1/4"], lvl: 2 },

        // QUARTS
        { val: 0.25, dec: "0,25", frac: "1/4", pct: "25%", traps: ["1/25", "2,5", "4/1"], lvl: 1 },
        { val: 0.75, dec: "0,75", frac: "3/4", pct: "75%", traps: ["3,4", "7,5", "4/3"], lvl: 2 },

        // DIXIÈMES
        { val: 0.1, dec: "0,1", frac: "1/10", pct: "10%", traps: ["0,01", "1/100", "1"], lvl: 1 },
        { val: 0.2, dec: "0,2", frac: "1/5", pct: "20%", traps: ["1/2", "2/100", "5/1"], lvl: 1 }, // Piège 1/5 vs 0.5
        { val: 0.3, dec: "0,3", frac: "3/10", pct: "30%", traps: ["1/3", "3/100", "3"], lvl: 1 },

        // CINQUIÈMES (Complémentaires)
        { val: 0.4, dec: "0,4", frac: "2/5", pct: "40%", traps: ["1/4", "4/100", "4,5"], lvl: 2 },
        { val: 0.6, dec: "0,6", frac: "3/5", pct: "60%", traps: ["1/6", "3,5", "6/100"], lvl: 2 },
        { val: 0.8, dec: "0,8", frac: "4/5", pct: "80%", traps: ["4,5", "8/100", "0,08"], lvl: 2 },

        // CENTIÈMES & AVANCÉS
        { val: 0.01, dec: "0,01", frac: "1/100", pct: "1%", traps: ["0,1", "1/10", "10%"], lvl: 2 },
        { val: 0.05, dec: "0,05", frac: "1/20", pct: "5%", traps: ["0,5", "1/5", "50%"], lvl: 3 },
        { val: 0.125, dec: "0,125", frac: "1/8", pct: "12,5%", traps: ["1,8", "125%", "8/1"], lvl: 3 },

        // ENTIERS (Niv 1 pour la confiance)
        { val: 1, dec: "1", frac: "10/10", pct: "100%", traps: ["0,1", "10", "1/100"], lvl: 1 },
    ];

    // Filtrer les items disponibles pour ce niveau
    // Niveau 1 : Items lvl 1
    // Niveau 2 : Items lvl 1 + 2
    // Niveau 3 : Tout
    const pool = DATA.filter(d => d.lvl <= lvl);
    const item = pool[rand(0, pool.length - 1)];

    // Choisir le mode de question
    // 1. Dec -> Frac
    // 2. Dec -> Pct
    // 3. Frac -> Dec
    // 4. Frac -> Pct
    const modes = ["dec_to_frac", "dec_to_pct", "frac_to_dec", "frac_to_pct"];
    // Au niveau 3, on ajoute un mode "Trouve l'intrus" ou "Décomposition"
    if (lvl === 3) modes.push("decomposition");

    const mode = modes[rand(0, modes.length - 1)];

    let q, correct, genericExpl;
    let answersMap = new Map(); // Map pour feedback unique

    // Helper pour ajouter une option avec feedback
    const addOption = (val, fb) => {
        if (val !== correct && !answersMap.has(val)) {
            answersMap.set(val, fb);
        }
    };

    // --- GÉNÉRATION DE LA QUESTION ---

    if (mode === "dec_to_frac") {
        q = `Quelle fraction est égale à ${item.dec} ?`;
        correct = item.frac;
        genericExpl = `${item.dec} se lit "${item.dec.split(',')[1] || 0} ...ièmes" ou correspond à la division ${item.frac}.`;

        // Piège spécifique 0.2 -> 1/2
        if (item.val === 0.2) addOption("1/2", "Non ! 1/2 c'est la moitié (0,5). Ici on a 0,2 (un cinquième).");
        // Piège spécifique 0.5 -> 1/5
        if (item.val === 0.5) addOption("1/5", "Non ! 1/5 c'est 0,2. La moitié (0,5) c'est 1/2.");

        // Piège visuel (ex: 0.75 -> 3/4 mais piège 7/5)
        if (item.val === 0.75) addOption("7/5", "Erreur visuelle. 0,75 c'est trois quarts (3/4).");
    }

    else if (mode === "dec_to_pct") {
        q = `${item.dec} en pourcentage ?`;
        correct = item.pct;
        genericExpl = `Pour passer en %, on multiplie par 100. ${item.dec} × 100 = ${item.val * 100}.`;

        // Piège x10 au lieu de x100 (ex: 0.5 -> 5%)
        addOption(`${(item.val * 10).toString().replace('.', ',')}%`, "Tu as multiplié par 10. Pour un pourcentage, c'est ×100.");

        // Piège "Virgule" (ex: 0.125 -> 125%)
        addOption(`${(item.val * 1000).toString().replace('.', ',')}%`, "Trop grand ! Vérifie ta virgule.");
    }

    else if (mode === "frac_to_dec") {
        q = `Écriture décimale de ${item.frac} ?`;
        correct = item.dec;
        genericExpl = `${item.frac}, c'est ${item.val}.`;

        // Piège juxtaposition (ex: 3/4 -> 3,4)
        const juxt = item.frac.replace('/', ',');
        addOption(juxt, `Non ! La barre de fraction n'est pas une virgule. ${item.frac} n'est pas ${juxt}.`);

        // Piège 1/3 (ex: 0.33)
        if (item.val === 1 / 3) addOption("0,33", "0,33 est une valeur approchée, pas la valeur exacte.");
    }

    else if (mode === "frac_to_pct") {
        q = `${item.frac} correspond à quel pourcentage ?`;
        correct = item.pct;
        genericExpl = `La fraction ${item.frac} vaut ${item.dec}, donc ${item.val * 100}%.`;

        // Piège basique
        addOption("10%", "Faux. 10% c'est 1/10.");
    }

    else if (mode === "decomposition" && lvl === 3) {
        // Mode Expert : 1,2 = 1 + 1/5
        // On génère une décomposition
        const ent = Math.floor(item.val);
        const decPart = item.val - ent;

        // On ne fait ça que si le nombre a une partie décimale
        if (decPart > 0) {
            // Retrouver la fraction de la partie décimale (ex: 0.2 -> 1/5)
            // On cherche dans DATA un item qui a cette val
            const subItem = DATA.find(d => Math.abs(d.val - decPart) < 0.001);
            if (subItem) {
                q = `Décomposer ${item.dec} sous la forme d'un entier + une fraction :`;
                correct = `${ent} + ${subItem.frac}`;
                genericExpl = `${item.dec} c'est ${ent} unité et ${subItem.dec} (${subItem.frac}).`;

                // Piège : 1 + 0.2 (Pas une fraction) ou Mauvaise fraction
                addOption(`${ent} + ${subItem.dec}`, "On cherche une décomposition avec une fraction.");
                addOption(`${ent} + 1/${Math.round(1 / decPart) + 1}`, "Mauvaise fraction pour la partie décimale.");
            } else {
                // Fallback
                q = `${item.frac} = ?`;
                correct = item.dec;
                genericExpl = "";
            }
        } else {
            // Fallback pour entiers
            q = `${item.dec} = ?`;
            correct = item.pct;
            genericExpl = "C'est un entier = 100%.";
        }
    }

    // --- AJOUT DES LEURRES GÉNÉRIQUES (De la BDD) ---
    if (item.traps) {
        item.traps.forEach(trap => {
            let msg = "Erreur fréquente.";
            if (trap.includes(',')) msg = "Attention à ne pas confondre fraction et nombre décimal.";
            if (trap === "1/5" && item.val === 0.5) msg = "1/5 = 0,2. La moitié c'est 1/2.";
            if (trap === "1/2" && item.val === 0.2) msg = "1/2 = 0,5. Le cinquième c'est 1/5.";

            addOption(trap, msg);
        });
    }

    // --- REMPLISSAGE FINAL CORRIGÉ ---
    // Le moteur de jeu (Game) attend OBLIGATOIREMENT la bonne réponse à l'index 0 du tableau 'o'.

    answersMap.set(correct, "CORRECT"); // On s'assure que la bonne réponse est enregistrée pour le feedback

    // 1. On initialise le tableau avec la BONNE réponse en premier
    let options = [correct];

    // 2. On ajoute les mauvaises réponses qui sont dans la map
    for (const [key, val] of answersMap) {
        if (key !== correct) {
            options.push(key);
        }
    }

    // 3. Si pas assez d'options (moins de 4), on remplit avec du random
    while (options.length < 4) {
        const fake = rand(1, 100) + (Math.random() > 0.5 ? "%" : "");
        if (!options.includes(String(fake))) {
            options.push(String(fake));
            // On n'a pas besoin de l'ajouter à answersMap car le feedback par défaut suffira
        }
    }

    // Création de l'objet feedback pour le jeu
    const detailedFeedback = {};
    options.forEach(opt => {
        if (opt !== correct) {
            // Si on a un message précis en banque on le prend, sinon message par défaut
            detailedFeedback[opt] = answersMap.get(opt) || "Réponse incorrecte.";
        }
    });

    return {
        q: q,
        o: options, // options[0] est maintenant bien la réponse correcte
        c: 0,
        e: genericExpl || "Regarde bien les équivalences fractions / décimaux.",
        detailedFeedback: detailedFeedback
    };
};
// --- AUTO 07 - NOTATION SCIENTIFIQUE ---
export const generateScientificNotationQuestion = (config) => {
    const lvl = config.level || 1;


    // Convertit un nombre en exposant joli (ex: -3 -> ⁻³)
    const toSup = (num) => {
        const map = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
        return String(num).split('').map(c => map[c] || c).join('');
    };

    // Formate en notation scientifique string : a × 10ⁿ
    const toSci = (a, n) => `${String(a).replace('.', ',')} × 10${toSup(n)}`;

    let q, correct, e, o = [];
    let mode;

    // --- STRATÉGIE PAR NIVEAU ---
    if (lvl === 1) {
        // NIV 1 : Reconnaissance et conversions simples (puissances positives)
        mode = Math.random() > 0.4 ? "dec_to_sci_pos" : "reconnaissance";
    } else if (lvl === 2) {
        // NIV 2 : Petits nombres (puissances négatives) et nombres à virgule
        mode = Math.random() > 0.5 ? "dec_to_sci_neg" : "sci_to_dec";
    } else {
        // NIV 3 : Normalisation (30 x 10^2) et Calculs simples
        mode = Math.random() > 0.5 ? "normalisation" : "calcul";
    }

    // --- MODE 1 : RECONNAISSANCE ---
    if (mode === "reconnaissance") {
        const a = rand(1, 9) + (Math.random() > 0.5 ? 0.5 : 0); // 1.5 ou 4
        const n = rand(2, 5);
        const good = toSci(a, n);

        q = "Lequel est en notation scientifique ?";
        correct = good;
        e = `Le premier nombre doit être compris entre 1 inclus et 10 exclu.`;

        o = [
            correct,
            toSci(a * 10, n - 1), // 15 x 10^... (Trop grand)
            toSci(a / 10, n + 1), // 0,15 x 10^... (Trop petit)
            toSci(a, n).replace('×', '+') // Piège signe
        ];
    }

    // --- MODE 2 : DÉCIMAL -> SCI (POSITIF) ---
    else if (mode === "dec_to_sci_pos") {
        const head = rand(1, 9);
        const zeros = rand(2, 6);
        const val = head * Math.pow(10, zeros); // ex: 30000

        q = `Écriture scientifique de ${val.toLocaleString('fr-FR')} ?`;
        correct = toSci(head, zeros);
        e = `${val} = ${head} × ${Math.pow(10, zeros)}.`;

        o = [
            correct,
            toSci(head, zeros - 1),
            toSci(head * 10, zeros - 1), // 30 x 10^...
            toSci(head, zeros + 1)
        ];
    }

    // --- MODE 3 : DÉCIMAL -> SCI (NÉGATIF / PRÉCIS) ---
    else if (mode === "dec_to_sci_neg") {
        // Génère 0,004 ou 0,0045
        const head = rand(1, 9);
        const decimal = Math.random() > 0.5 ? rand(1, 9) : 0;
        const zeroes = rand(2, 5); // Nombre de zéros total (ex: 0,004 -> 2 zéros après virgule + 1 avant)

        // Construction manuelle de la string pour éviter les bugs de float JS
        let strVal = "0," + "0".repeat(zeroes - 1) + head + (decimal ? decimal : "");

        // Exposant : c'est -zeroes
        const mantisse = decimal ? `${head},${decimal}` : `${head}`;

        q = `Écriture scientifique de ${strVal} ?`;
        correct = toSci(mantisse, -zeroes);
        e = `Le premier chiffre non nul (${head}) est en ${zeroes}ème position après la virgule.`;

        o = [
            correct,
            toSci(mantisse, -(zeroes - 1)), // Erreur de comptage
            toSci(mantisse, zeroes), // Oubli du signe moins
            toSci("0," + head, -(zeroes - 1)) // Pas scientifique
        ];
    }

    // --- MODE 4 : SCI -> DÉCIMAL ---
    else if (mode === "sci_to_dec") {
        const head = rand(1, 9);
        const exp = rand(1, 4) * (Math.random() > 0.5 ? 1 : -1);

        q = `Écriture décimale de ${toSci(head, exp)} ?`;

        if (exp > 0) {
            correct = String(head * Math.pow(10, exp));
            e = "Décale la virgule vers la droite.";
        } else {
            // Gestion manuelle des petits nombres
            let z = Math.abs(exp);
            correct = "0," + "0".repeat(z - 1) + head;
            e = "Décale la virgule vers la gauche.";
        }

        o = [correct];
        // Pièges
        if (exp > 0) {
            o.push(String(head * Math.pow(10, exp - 1)));
            o.push("0," + "0".repeat(exp - 1) + head); // Confusion sens
        } else {
            o.push(String(head * Math.pow(10, Math.abs(exp)))); // Confusion sens
            o.push("0," + "0".repeat(Math.abs(exp)) + head); // Trop de zéros
        }
    }

    // --- MODE 5 : NORMALISATION (30 x 10^2) ---
    else if (mode === "normalisation") {
        const head = rand(1, 9);
        const extraZero = rand(1, 2); // 10 ou 100
        const fakeMantisse = head * Math.pow(10, extraZero); // ex: 30 ou 300
        const expInit = rand(2, 5);

        q = `Mettre en scientifique : ${fakeMantisse} × 10${toSup(expInit)}`;

        // Si j'ai 300 (3x10^2) * 10^3 -> 3 * 10^5
        const finalExp = expInit + extraZero;
        correct = toSci(head, finalExp);
        e = `${fakeMantisse} = ${head} × 10${toSup(extraZero)}. On ajoute les exposants.`;

        o = [
            correct,
            toSci(head, expInit), // On oublie de changer l'exposant
            toSci(fakeMantisse, finalExp), // Pas scientifique
            toSci(head, expInit - extraZero) // On soustrait au lieu d'ajouter
        ];
    }

    // --- MODE 6 : CALCULS SIMPLES ---
    else {
        // (a * 10^n) * (b * 10^m)
        const a = rand(1, 4);
        const b = rand(1, 2); // Petits nombres pour que a*b < 10
        const n = rand(2, 5);
        const m = rand(2, 5) * (Math.random() > 0.5 ? 1 : -1);

        q = `Calculer (${toSci(a, n)}) × (${toSci(b, m)})`;

        const finalHead = a * b;
        const finalExp = n + m;

        correct = toSci(finalHead, finalExp);
        e = `Multiplie les nombres (${a}×${b}=${finalHead}) et ajoute les exposants (${n}+${m}=${finalExp}).`;

        o = [
            correct,
            toSci(finalHead, n * m), // Multiplie les exposants
            toSci(finalHead + 2, finalExp), // Random
            toSci(finalHead, finalExp > 0 ? finalExp - 2 : finalExp + 2)
        ];
    }

    // Nettoyage et mélange
    const cleanO = [...new Set(o)];
    while (cleanO.length < 3) cleanO.push(toSci(rand(1, 9), rand(1, 5))); // Fallback

    return { q: q, o: cleanO, c: 0, e: e };
};

// --- AUTO 08 ---
export const generateSquareQuestion = (config) => {
    const { min, max, mode, submodes } = config;
    let currentMode = mode;

    if (mode === 'mixte' && submodes && submodes.length > 0) {
        currentMode = submodes[Math.floor(Math.random() * submodes.length)];
    }

    // Sécurité si config manquante
    if (!currentMode) currentMode = 'direct';

    const n = Math.floor(Math.random() * (max - min + 1)) + min;
    const square = n * n;

    let q, o, e, correct;

    // --- NIVEAU 1 ---
    if (currentMode === 'direct') {
        q = `${n}² = ?`; correct = square; e = `${n} × ${n}`; o = [correct, n * 2, square + 10];
    }
    else if (currentMode === 'racine') {
        q = `√${square} = ?`; correct = n; e = `${n}² = ${square}`; o = [correct, square / 2, n + 2];
    }
    // --- NIVEAU 2 ---
    else if (currentMode === 'geometrie') {
        if (Math.random() > 0.5) { q = `Aire carré côté ${n} ?`; correct = square; e = `${n} × ${n}`; }
        else { q = `Côté carré d'aire ${square} ?`; correct = n; e = `Racine de ${square}`; }
        o = [correct, n * 2, square];
    }
    else if (currentMode === 'signe_parentheses') {
        q = `(-${n})² = ?`; correct = square; e = `Toujours positif.`; o = [correct, -square, -n * 2];
    }
    else if (currentMode === 'signe_sans_parentheses') {
        q = `-${n}² = ?`; correct = -square; e = `Le moins reste devant.`; o = [correct, square, -n * 2];
    }
    // --- NIVEAU 3 (C'est ici que le bug se trouvait) ---
    else if (currentMode === 'priorite_mult') {
        const k = [2, 3, 10, 0.1][Math.floor(Math.random() * 4)];
        q = `${k} × ${n}² = ?`;
        correct = k * square;
        e = `D'abord le carré (${square}), puis × ${k}`;

        // CORRECTION : On garde des NOMBRES ici. Pas de string, pas de replace.
        o = [
            correct,
            Number((k * n).toFixed(2)) ** 2, // Piège priorité : (k*n)²
            correct + k
        ];
    }
    else if (currentMode === 'priorite_add') {
        const k = Math.floor(Math.random() * 10) + 1;
        q = `${n}² + ${k} = ?`;
        correct = square + k;
        e = `${square} + ${k}`;
        o = [correct, (n + k) ** 2, correct + 10];
    }
    else if (currentMode === 'substitution') {
        const k = [2, 3, 5][Math.floor(Math.random() * 3)];
        q = `${k}x² pour x=${n}`;
        correct = k * square;
        e = `${k} × ${square}`;
        o = [correct, (k * n) ** 2, k * n * 2];
    }
    else { q = `${n}² = ?`; correct = square; e = ""; o = [square, 0]; }

    // C'est CETTE ligne qui fait le formatage final pour tout le monde
    // Elle attend des nombres, donc maintenant ça va marcher.
    const cleanO = o.map(v => String(parseFloat(Number(v).toFixed(2))).replace('.', ','));

    return { q: q, o: cleanO, c: 0, e: e };

};




// src/utils/mathGenerators.js

export const generateDivisibilityQuestion = (config) => {
    const lvl = config.level || 1;
    // Outils internes

    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const sumDigits = (n) => String(n).split('').reduce((a, b) => a + Number(b), 0);

    let q, correct, e, o = [];
    let mode;

    // =================================================================
    // NIVEAU 1 : Règles de base (2, 5, 10) -> Le dernier chiffre
    // =================================================================
    if (lvl === 1) {
        mode = pick(["check_2", "check_5", "check_10", "find_multiple"]);
        const base = rand(10, 999);

        if (mode === "check_2") {
            q = `${base} est-il divisible par 2 ?`;
            const isEven = base % 2 === 0;
            correct = isEven ? "Oui" : "Non";
            e = `Regarde le dernier chiffre (${String(base).slice(-1)}). ${isEven ? "C'est pair (0,2,4,6,8)." : "Ce n'est pas pair."}`;
            o = ["Oui", "Non"];
        }
        else if (mode === "check_5") {
            q = `${base} est-il divisible par 5 ?`;
            const ends5or0 = base % 5 === 0;
            correct = ends5or0 ? "Oui" : "Non";
            e = `Pour être divisible par 5, le nombre doit finir par 0 ou 5. Ici il finit par ${String(base).slice(-1)}.`;
            o = ["Oui", "Non"];
        }
        else if (mode === "check_10") {
            q = `${base} est-il divisible par 10 ?`;
            const ends0 = base % 10 === 0;
            correct = ends0 ? "Oui" : "Non";
            e = `Pour être divisible par 10, le nombre doit finir par 0. Ici il finit par ${String(base).slice(-1)}.`;
            o = ["Oui", "Non"];
        }
        else {
            // Mode inverse : "Lequel est divisible par X ?"
            const div = pick([2, 5, 10]);
            q = `Lequel de ces nombres est divisible par ${div} ?`;

            // Générer la bonne réponse
            let good = rand(10, 100) * div;

            // Générer 3 pièges (nombre aléatoire qui n'est PAS divisible par div)
            const makeBad = () => {
                let n = rand(10, 900);
                // Si par malchance on tombe sur un multiple, on ajoute 1 pour le casser
                if (n % div === 0) n += 1;
                return n;
            };

            correct = String(good);
            o = [correct, String(makeBad()), String(makeBad()), String(makeBad())];

            if (div === 2) e = `La bonne réponse est le nombre nombre pair (c'est à dire qui finit par 0 ; 2 ; 4 ; 6 ou 8).`;
            if (div === 5) e = `Un nombre entier est divisible par 5 si et seulement si il finit par 0 ou 5.`;
            if (div === 10) e = `Un nombre entier est divisible par 10 si et seulement si il finit par 0.`;
        }
    }

    // =================================================================
    // NIVEAU 2 : Règles calculées (3, 9) et règle de 4
    // =================================================================
    else if (lvl === 2) {
        mode = pick(["rule_3", "rule_9", "rule_4"]);

        if (mode === "rule_3") {
            const n = rand(100, 999);
            q = `${n} est-il divisible par 3 ?`;
            const s = sumDigits(n);
            const isDiv = s % 3 === 0;
            correct = isDiv ? "Oui" : "Non";
            e = `Additionne les chiffres : ${String(n).split('').join('+')} = ${s}. ${isDiv ? "C'est" : "Ce n'est pas"} dans la table de 3.`;
            o = ["Oui", "Non"];
        }
        else if (mode === "rule_9") {
            const n = rand(100, 9999); // Nombres plus grands
            q = `${n} est-il divisible par 9 ?`;
            const s = sumDigits(n);
            const isDiv = s % 9 === 0;
            correct = isDiv ? "Oui" : "Non";
            e = `Additionne les chiffres : somme = ${s}. ${isDiv ? "Le résultat est dans la table de 9 donc c'est un multiple de 9." : "Le résultat n'est pas dans la table de 9 donc ce n'est pas un multiple de 9."}`;
            o = ["Oui", "Non"];
        }
        else { // Règle de 4
            // On piège avec des nombres impairs ou des nombres pairs non divisibles par 4 (ex: 14)
            const head = rand(1, 99);
            const tail = rand(10, 99);
            const n = parseInt(`${head}${tail}`); // ex: 1324

            q = `${n} est-il divisible par 4 ?`;
            const isDiv = tail % 4 === 0;
            correct = isDiv ? "Oui" : "Non";
            e = `Un nombre entier est dans la table de 4 si et seulement si ses deux derniers chiffres sont dans la table de 4. Les deux derniers chiffres sont (${tail}). ${tail} ${isDiv ? "est" : "n'est pas"} dans la table de 4.`;
            o = ["Oui", "Non"];
        }
    }

    // =================================================================
    // NIVEAU 3 : Logique, Chiffres manquants, Règles combinées (6)
    // =================================================================
    else {
        mode = pick(["missing_digit", "logic_statements", "combined_6"]);

        if (mode === "missing_digit") {
            // Ex: Par quel chiffre remplacer ? pour que 15? soit divisible par 9
            const div = pick([3, 9]);
            const head = rand(1, 9);
            const mid = rand(0, 9);

            // On cherche le chiffre manquant "target"
            const currentSum = head + mid;
            let target = 0;
            while ((currentSum + target) % div !== 0) {
                target++;
            }

            q = `Par quel chiffre remplacer le ? pour que ${head}${mid}? soit divisible par ${div} ?`;
            correct = String(target);

            // Pièges : target+1, target-1, etc.
            o = [correct, String((target + 1) % 10), String((target + 2) % 10), String((target + 4) % 10)];

            e = `La somme des chiffres doit être un multiple de ${div}. ${head}+${mid}+${target} = ${head + mid + target}.`;
        }
        else if (mode === "combined_6") {
            // Divisible par 6 si divisible par 2 ET 3
            const makeNum = (mod2, mod3) => {
                let n = rand(100, 500);
                while ((n % 2 === 0) !== mod2 || (n % 3 === 0) !== mod3) {
                    n++;
                }
                return n;
            };

            const good = makeNum(true, true);
            const bad2 = makeNum(true, false); // Pair mais pas 3
            const bad3 = makeNum(false, true); // Impair mais 3
            const badNone = makeNum(false, false);

            q = "Lequel de ces nombres est divisible par 6 ?";
            correct = String(good);
            o = [String(good), String(bad2), String(bad3), String(badNone)];
            e = `Pour être divisible par 6, il faut être pair ET divisible par 3 car 6=2×3.`;
        }
        else {
            // Vrai ou Faux logique
            const statements = [
                { s: "Tout nombre divisible par 10 est divisible par 5.", ans: "Vrai", expl: "10 est un multiple de 5 donc un multiple de 10 s'écrit 10x un nombre entier = 5×2× un nombre entier donc c'est aussi un multiple de 5." },
                { s: "Tout nombre divisible par 5 est divisible par 10.", ans: "Faux", expl: "Contre-exemple : 15 (finit par 5)." },
                { s: "Tout nombre divisible par 9 est divisible par 3.", ans: "Vrai", expl: "9 est un multiple de 3 donc un multiple de 9 s'écrit 9×un nombre entier = 3×3×un nombre entier donc c'est aussi un multiple de 3." },
                { s: "Tout nombre divisible par 3 est divisible par 9.", ans: "Faux", expl: "Contre-exemple : 6." },
                { s: "Si un nombre finit par 4, il est divisible par 4.", ans: "Faux", expl: "Contre-exemple : 14." }
            ];
            const item = pick(statements);
            q = `Vrai ou Faux : ${item.s}`;
            correct = item.ans;
            o = ["Vrai", "Faux"];
            e = item.expl;
        }
    }

    // --- CORRECTION CRITIQUE : FORCER LA BONNE RÉPONSE EN PREMIER ---
    // 1. On nettoie les doublons éventuels
    const uniqueO = [...new Set(o)];

    // 2. On reconstruit le tableau : [BONNE_RÉPONSE, ...MAUVAISES_RÉPONSES]
    // Le moteur de jeu s'attend à ce que l'index 0 soit la bonne réponse avant de mélanger
    const finalO = [correct, ...uniqueO.filter(x => x !== correct)];

    return { q, o: finalO, c: 0, e };
};


// --- GÉNÉRATEUR TEST (ADDITIONS SIMPLES) ---
export const generateTestQuestion = (level = 1) => {
    // Niveau 1 : Petits nombres (1-10)
    // Niveau 2 : Moyens nombres (10-50)
    // Niveau 3 : Grands nombres (50-100)
    const max = level === 1 ? 10 : level === 2 ? 50 : 100;

    const a = Math.floor(Math.random() * max) + 1;
    const b = Math.floor(Math.random() * max) + 1;
    const correct = a + b;

    // Génération des mauvaises réponses (pièges)
    const wrong1 = correct + 1;
    const wrong2 = correct - 1;
    const wrong3 = correct + 10;

    return {
        q: `Combien font ${a} + ${b} ?`, // La question
        o: [correct, wrong1, wrong2, wrong3], // Les options (la 1ère est toujours la bonne ici, le jeu mélange après)
        e: `C'est une simple addition : ${a} + ${b} = ${correct}.` // L'explication si erreur
    };
};