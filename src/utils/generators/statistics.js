import { rand, pick } from './utils';

// ============================================================================
// UTILITAIRES MATHÉMATIQUES & LOGIQUES
// ============================================================================

/**
 * Calcule la somme d'un tableau d'entiers.
 */
const sum = (arr) => arr.reduce((a, b) => a + b, 0);

/**
 * Génère une série de valeurs dont la somme est EXACTEMENT égale à targetTotal.
 * Indispensable pour le Niveau 3 (Calcul de % mental).
 */
const generateValuesWithNiceTotal = (nbItems, targetTotal) => {
    let arr = [];
    let currentSum = 0;

    // On génère n-1 valeurs aléatoires contrôlées
    for (let i = 0; i < nbItems - 1; i++) {
        const remainingSpace = targetTotal - currentSum - (nbItems - i);
        // On évite les valeurs trop grosses qui écraseraient le graphe
        const maxVal = Math.min(remainingSpace, Math.ceil(targetTotal * 0.6));

        let val = rand(1, Math.max(2, maxVal));
        arr.push(val);
        currentSum += val;
    }

    // La dernière valeur est mathématiquement déterminée
    const lastVal = targetTotal - currentSum;

    if (lastVal <= 0) return generateValuesWithNiceTotal(nbItems, targetTotal);

    arr.push(lastVal);

    // On mélange pour que le "reste" ne soit pas toujours à la fin
    return arr.sort(() => Math.random() - 0.5);
};

// ============================================================================
// BASES DE DONNÉES (THÈMES)
// ============================================================================

const THEMES = {
    SURVEY: [
        {
            label: "Sport pratiqué",
            items: ["Football", "Tennis", "Basketball", "Judo", "Natation"],
            unit: "élèves"
        },
        {
            label: "Moyen de transport",
            items: ["Bus", "Voiture", "Vélo", "Marche", "Scooter"],
            unit: "élèves"
        },
        {
            label: "Loisir principal",
            items: ["Lecture", "Jeux Vidéo", "Cinéma", "Musique", "Sport"],
            unit: "personnes"
        },
        {
            label: "Animal de compagnie",
            items: ["Chien", "Chat", "Poisson", "Oiseau", "Hamster"],
            unit: "familles"
        }
    ],
    WEATHER: {
        label: "Températures (°C)",
        items: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
        unit: "°C"
    },
    SALES: {
        label: "Ventes mensuelles",
        items: ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin"],
        unit: "ventes"
    },
    ELECTION: {
        label: "Résultats élection",
        items: ["Pierre", "Sarah", "Mohamed", "Julie", "Thomas"],
        unit: "voix"
    }
};

// ============================================================================
// GÉNÉRATEUR 1 : DIAGRAMME EN BÂTONS (BAR CHART)
// ============================================================================

const generateBarChart = (level) => {
    const theme = pick(THEMES.SURVEY);
    // Au niveau 1/2, on limite à 3-4 barres. Au niveau 3, on peut monter à 5.
    const nbItems = level === 3 ? rand(4, 5) : rand(3, 4);
    const labels = theme.items.slice(0, nbItems);

    let values;
    let total;

    // Génération des valeurs
    if (level === 3) {
        // NIVEAU 3 : Total propre (20, 25, 50) pour calculs
        const targetTotal = pick([20, 25, 50]);
        values = generateValuesWithNiceTotal(nbItems, targetTotal);
        total = targetTotal;
    } else {
        // NIVEAU 1 & 2 : Aléatoire limité à 20 pour la grille
        values = labels.map(() => rand(2, 18));
        total = sum(values);
    }

    // Choix de la question
    let qType;
    if (level === 1) {
        qType = 'READ';
    } else if (level === 2) {
        qType = pick(['MAX', 'MIN', 'TOTAL', 'DIFF_SIMPLE']);
    } else {
        // NIVEAU 3
        qType = pick(['PERCENT_CALC', 'THRESHOLD', 'RATIO_INVERSE']);
    }

    let q, correct, explanation, options;
    const targetIdx = rand(0, nbItems - 1);
    const targetCat = labels[targetIdx];
    const targetVal = values[targetIdx];

    // Propriété spéciale pour masquer les axes si besoin (Demande utilisateur)
    let hideAxis = false;

    switch (qType) {
        case 'READ':
            q = `Quel est l'effectif pour la catégorie "${targetCat}" ?`;
            correct = targetVal;
            explanation = `Regarde la hauteur du bâton "${targetCat}" et suis la ligne vers l'axe de gauche pour lire le nombre.`;
            break;

        case 'MAX':
            const maxVal = Math.max(...values);
            const maxIndices = values.map((v, i) => v === maxVal ? i : -1).filter(i => i !== -1);
            correct = labels[maxIndices[0]];
            q = `Quelle catégorie a l'effectif le plus élevé ?`;
            options = labels;
            explanation = `C'est la colonne la plus haute (${maxVal} ${theme.unit}).`;
            break;

        case 'MIN':
            const minVal = Math.min(...values);
            const minIndices = values.map((v, i) => v === minVal ? i : -1).filter(i => i !== -1);
            correct = labels[minIndices[0]];
            q = `Quelle catégorie a l'effectif le plus faible ?`;
            options = labels;
            explanation = `C'est la colonne la plus basse (${minVal} ${theme.unit}).`;
            break;

        case 'TOTAL':
            q = `Quel est l'effectif total (somme de toutes les catégories) ?`;
            correct = total;
            explanation = `Additionne la hauteur de chaque bâton : ${values.join(' + ')} = ${total}.`;
            break;

        case 'DIFF_SIMPLE':
            const idxB = (targetIdx + 1) % nbItems;
            const catB = labels[idxB];
            const valB = values[idxB];
            const diff = Math.abs(targetVal - valB);

            q = `Quelle est la différence d'effectif entre "${targetCat}" et "${catB}" ?`;
            correct = diff;
            explanation = `Calcul : ${Math.max(targetVal, valB)} - ${Math.min(targetVal, valB)} = ${diff}.`;
            break;

        case 'PERCENT_CALC': // Niveau 3
            const pct = (targetVal / total) * 100;
            q = `Quel pourcentage du total représente la catégorie "${targetCat}" ?`;
            correct = pct;
            explanation = `L'effectif est de ${targetVal} sur un total de ${total}. Calcul : (${targetVal} ÷ ${total}) × 100 = ${pct}%.`;
            break;

        case 'THRESHOLD': // Niveau 3
            const seuil = rand(5, 12);
            const countAbove = values.filter(v => v > seuil).length;
            q = `Combien de catégories ont un effectif strictement supérieur à ${seuil} ?`;
            correct = countAbove;
            explanation = `Compte le nombre de bâtons qui dépassent la ligne horizontale n°${seuil}.`;
            break;

        case 'RATIO_INVERSE': // Niveau 3
            // ICI ON MASQUE LES AXES POUR EVITER LE CALCUL PAR SOMME
            hideAxis = true;
            const ratioPct = (targetVal / total) * 100;
            q = `Sachant que "${targetCat}" (${targetVal} ${theme.unit}) représente ${ratioPct}% du total, quel est l'effectif total ?`;
            correct = total;
            explanation = `Produit en croix : Si ${ratioPct}% = ${targetVal}, alors 100% = (${targetVal} ÷ ${ratioPct}) × 100 = ${total}.`;
            break;

        default:
            q = `Quel est l'effectif de "${targetCat}" ?`;
            correct = targetVal;
            explanation = `Lis la valeur sur l'axe vertical.`;
            break;
    }

    return {
        type: 'BAR',
        title: theme.label,
        labels: labels,
        values: values,
        q,
        correct,
        explanation,
        options,
        suffix: (qType === 'PERCENT_CALC') ? '%' : '',
        forceMaxGrid: 20,
        // Cette propriété devra être utilisée par le composant visuel pour masquer/flouter les axes
        hideAxis: hideAxis
    };
};

// ============================================================================
// GÉNÉRATEUR 2 : DIAGRAMME CIRCULAIRE (PIE CHART)
// ============================================================================

const generatePieChart = (level) => {
    const theme = Math.random() > 0.5 ? pick(THEMES.SURVEY) : THEMES.ELECTION;
    const nbItems = 3;
    const labels = theme.items.slice(0, nbItems);

    // Pourcentages propres (multiples de 5 ou 10)
    let p1 = rand(2, 10) * 5;
    let remaining = 100 - p1;
    let p2 = rand(1, Math.floor((remaining - 5) / 5)) * 5;
    let p3 = 100 - p1 - p2;

    const percentages = [p1, p2, p3];

    // Calcul de l'effectif total
    const possibleTotals = level === 1 ? [100] : [40, 50, 60, 80, 200, 300];
    const totalEffectif = pick(possibleTotals);

    const realValues = percentages.map(p => (p / 100) * totalEffectif);

    // Choix de la question & MODE D'AFFICHAGE
    let qType;
    if (level === 1) qType = 'READ_PERCENT';
    else if (level === 2) qType = 'FIND_VALUE';
    else qType = Math.random() > 0.5 ? 'FIND_PERCENT' : 'FIND_TOTAL';

    const targetIdx = rand(0, 2);
    const targetLabel = labels[targetIdx];
    const targetPct = percentages[targetIdx];
    const targetVal = realValues[targetIdx];

    let q, correct, explanation, suffix, displayValues;

    switch (qType) {
        case 'READ_PERCENT': // Niveau 1
            // Affichage : POURCENTAGES
            displayValues = percentages.map(p => p + '%');
            q = `Quel pourcentage des choix représente "${targetLabel}" ?`;
            correct = targetPct;
            suffix = '%';
            explanation = `Repère la couleur de "${targetLabel}" et lis le pourcentage affiché.`;
            break;

        case 'FIND_VALUE': // Niveau 2
            // Affichage : POURCENTAGES (pour calculer la valeur)
            displayValues = percentages.map(p => p + '%');
            q = `Sur un total de ${totalEffectif} personnes, quel est l'effectif de "${targetLabel}" ?`;
            correct = targetVal;
            suffix = '';
            explanation = `Calcul : ${targetPct}% de ${totalEffectif} = (${targetPct} × ${totalEffectif}) ÷ 100 = ${correct}.`;
            break;

        case 'FIND_PERCENT': // Niveau 3
            // Affichage : VALEURS (pour calculer le %) -- MODIFICATION DEMANDÉE
            displayValues = realValues.map(v => v);
            q = `Sachant que le total est de ${totalEffectif} personnes, quel pourcentage représente "${targetLabel}" (${targetVal} personnes) ?`;
            correct = targetPct;
            suffix = '%';
            explanation = `Calcul : (Partie ÷ Total) × 100. Soit (${targetVal} ÷ ${totalEffectif}) × 100 = ${targetPct}%.`;
            break;

        case 'FIND_TOTAL': // Niveau 3
            // Affichage : POURCENTAGES (pour retrouver le total)
            displayValues = percentages.map(p => p + '%');
            q = `Les votes pour "${targetLabel}" (${targetVal} voix) représentent ${targetPct}% du total. Combien de personnes ont voté au total ?`;
            correct = totalEffectif;
            suffix = '';
            explanation = `Produit en croix : Si ${targetPct}% = ${targetVal}, alors 100% = (${targetVal} × 100) ÷ ${targetPct} = ${totalEffectif}.`;
            break;

        default: break;
    }

    return {
        type: 'PIE',
        title: theme.label,
        labels: labels,
        values: percentages, // Le moteur graphique utilise toujours les % pour les angles
        displayValues: displayValues, // Ce qui est écrit sur les parts (soit %, soit entier)
        q,
        correct,
        explanation,
        suffix
    };
};

// ============================================================================
// GÉNÉRATEUR 3 : GRAPHIQUE CARTÉSIEN (LINE CHART - COURBES)
// ============================================================================

const generateLineChart = (level) => {
    const theme = THEMES.WEATHER;
    const nbDays = level === 1 ? 5 : 7;
    const labels = theme.items.slice(0, nbDays);

    let currentTemp = rand(10, 20);
    const values = labels.map(() => {
        const change = rand(-4, 4);
        currentTemp += change;
        return currentTemp;
    });

    let qType;
    if (level === 1) qType = 'READ';
    else if (level === 2) qType = pick(['EVOLUTION_QUALITATIVE', 'COMPARE_DAYS']);
    else qType = pick(['EVOLUTION_QUANTITATIVE', 'PERCENT_THRESHOLD', 'MAX_AMPLITUDE']);

    let q, correct, explanation, options;
    const idx = rand(1, nbDays - 1);

    switch (qType) {
        case 'READ':
            q = `Quelle température faisait-il ${labels[idx]} ?`;
            correct = values[idx];
            explanation = `Repère "${labels[idx]}" sur l'axe du bas, monte jusqu'au point bleu et regarde la valeur à gauche.`;
            break;

        case 'EVOLUTION_QUALITATIVE':
            const diffQual = values[idx] - values[idx - 1];
            q = `La température a-t-elle augmenté ou baissé entre ${labels[idx - 1]} et ${labels[idx]} ?`;
            options = ["Augmenté", "Baissé", "Stable"];

            if (diffQual > 0) correct = "Augmenté";
            else if (diffQual < 0) correct = "Baissé";
            else correct = "Stable";

            explanation = `Elle est passée de ${values[idx - 1]}° à ${values[idx]}°.`;
            break;

        case 'COMPARE_DAYS':
            const maxTemp = Math.max(...values);
            const maxIdx = values.indexOf(maxTemp);
            q = `Quel jour a été le plus chaud de la période affichée ?`;
            correct = labels[maxIdx];
            options = labels;
            explanation = `C'est le point le plus haut de la courbe (${maxTemp}°).`;
            break;

        case 'EVOLUTION_QUANTITATIVE': // Niveau 3
            const startDay = labels[idx - 1];
            const endDay = labels[idx];
            const valStart = values[idx - 1];
            const valEnd = values[idx];
            const evolution = valEnd - valStart;

            q = `De combien de degrés la température a-t-elle varié entre ${startDay} et ${endDay} ? (Note : utilise le signe - si c'est une baisse)`;
            correct = evolution;
            explanation = `Température Arrivée (${valEnd}) - Température Départ (${valStart}) = ${evolution}.`;
            break;

        case 'PERCENT_THRESHOLD': // Niveau 3
            const seuil = rand(12, 18);
            const daysAbove = values.filter(v => v > seuil).length;
            q = `Combien de jours la température a-t-elle été strictement supérieure à ${seuil}°C ?`;
            correct = daysAbove;
            explanation = `Compte les points qui sont situés au-dessus de la ligne des ${seuil}°.`;
            break;

        case 'MAX_AMPLITUDE': // Niveau 3
            const minT = Math.min(...values);
            const maxT = Math.max(...values);
            correct = maxT - minT;
            q = `Quelle est l'amplitude thermique (écart entre le max et le min) sur cette période ?`;
            explanation = `Max (${maxT}) - Min (${minT}) = ${correct}.`;
            break;

        default:
            q = `Quelle température faisait-il ${labels[idx]} ?`;
            correct = values[idx];
            explanation = `Lecture simple.`;
            break;
    }

    return {
        type: 'LINE',
        title: `Météo : ${theme.label}`,
        labels: labels,
        values: values,
        q,
        correct,
        explanation,
        options,
        suffix: (typeof correct === 'number' && qType !== 'PERCENT_THRESHOLD' && qType !== 'EVOLUTION_QUANTITATIVE') ? '°C' : ''
    };
};

// ============================================================================
// ROUTEUR PRINCIPAL (EXPORT)
// ============================================================================

export const generateDataReadingQuestion = (config) => {
    const level = config.level || 1;
    const r = Math.random();

    // Distribution des exercices
    if (level === 3) {
        if (r < 0.33) return generateBarChart(level);
        if (r < 0.66) return generatePieChart(level);
        return generateLineChart(level);
    }

    if (r < 0.45) return generateBarChart(level);
    if (r < 0.75) return generatePieChart(level);
    return generateLineChart(level);
};