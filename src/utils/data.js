// src/utils/data.js

export const AUTOMATISMES_DATA = [
    {
        title: "I. Nombres et Calculs",
        color: "indigo",
        exos: [

            { id: "auto_1_ecriture_decimale_fractions", title: "1. Écriture décimale" },
            { id: "auto_2_comparaison_calcul_decimaux", title: "2. Nombres décimaux - Calculs et comparaisons" },
            { id: "auto_3_fractions_calc", title: "3. Calculs fractions" },
            { id: "auto_4_fraction_nombre", title: "4. Fraction d'un nombre" },
            { id: "auto_5_pourcentages", title: "5. Pourcentages simples" },
            { id: "auto_6_formes_multiples", title: "6. Formes multiples" },
            { id: "auto_7_ecriture_sci", title: "7. Notation scientifique" },
            { id: "auto_8_carres_3eme", title: "8. Carrés parfaits" },
            { id: "auto_9_divisibilite", title: "9. Divisibilité" },
            { id: "auto_10_vocabulaire_ops", title: "10. Vocabulaire (double...)" },
            { id: "auto_11_simplifier_litteral", title: "11. Simplifier (littéral)" },
            { id: "auto_12_valeur_expression", title: "12. Substitution" },
            { id: "auto_13_dev_fact", title: "13. Développer / Factoriser" },
            { id: "auto_14_equations", title: "14. Équations simples" },
            { id: "auto_15_droite_graduee", title: "15. Droite graduée" }
        ]
    },
    {
        title: "II. Espace et Géométrie",
        color: "emerald",
        exos: [
            { id: "auto_16_coordonnees", title: "16. Coordonnées" },
            { id: "auto_17_codage_figures", title: "17. Figures & Codage" },
            { id: "auto_18_angles_vocab", title: "18. Vocabulaire angles" },
            { id: "auto_19_angles_triangle", title: "19. Angles du triangle" },
            { id: "auto_20_conversions", title: "20. Conversions" },
            { id: "auto_21_solides", title: "21. Reconnaître solides" },
            { id: "auto_22_perimetres", title: "22. Périmètres" },
            { id: "auto_23_aires", title: "23. Aires" },
            { id: "auto_24_volumes", title: "24. Volumes" },
            { id: "auto_25_pythagore", title: "25. Pythagore (situations)" },
            { id: "auto_26_thales", title: "26. Thalès (situations)" },
            { id: "auto_27_cosinus", title: "27. Cosinus (situations)" },
            { id: "auto_28_symetries", title: "28. Transformations" }
        ]
    },
    {
        title: "III. Organisation de Données",
        color: "amber",
        exos: [
            { id: "auto_29_probabilites", title: "29. Probabilités" },
            { id: "auto_30_frequence", title: "30. Fréquences" },
            { id: "auto_31_moyenne", title: "31. Moyenne" },
            { id: "auto_32_mediane", title: "32. Médiane" },
            { id: "auto_33_lecture_graphique", title: "33. Lecture de données" }
        ]
    },
    {
        title: "IV. Proportionnalité et Fonctions",
        color: "rose",
        exos: [
            { id: "auto_34_reconnaitre_prop", title: "34. Reconnaître Propor." },
            { id: "auto_35_calcul_prop", title: "35. Calculs Propor." },
            { id: "auto_36_pourcentages_evol", title: "36. Évolutions (%)" },
            { id: "auto_37_graph", title: "37. Images/antécédents sur graphique" },
            { id: "auto_38_graph2", title: "38. Tableau de valeurs et graphiques" }
        ]
    },
    {
        title: "V. Informatique",
        color: "cyan", // Nouvelle couleur pour distinguer
        exos: [
            { id: "auto_39_algo", title: "39. Algorithmique" },
            { id: "auto_40_tableur", title: "40. Tableur" }
        ]
    }
];


export const TRAINING_MODULES = [{ id: "entrainement_ch4", title: "Puissances" }];

export const PROCEDURAL_EXOS = [
    "auto_1_ecriture_decimale_fractions",
    "auto_2_comparaison_calcul_decimaux",
    "auto_3_fractions_calc",
    "auto_4_fraction_nombre",
    "auto_5_pourcentages",
    "auto_6_formes_multiples",
    "auto_7_ecriture_sci",
    "auto_8_carres_3eme",
    "auto_9_divisibilite",
    "auto_10_vocabulaire_ops",
    "auto_11_simplifier_litteral",
    "auto_12_valeur_expression",
    "auto_13_dev_fact",
    "auto_14_equations",
    "auto_15_droite_graduee",


    "auto_26_thales",

    "auto_37_graph",
    "auto_38_graph2",
    "auto_39_algo",
    "auto_40_tableur",



];




export const QUESTIONS_TABLES = {};
export const QUESTIONS_DIVISIONS = {};
export const TABLES_LIST = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => ({ id: n, title: `Table de ${n}` }));


// Initialisation et Remplissage immédiat
[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].forEach(t => {
    QUESTIONS_TABLES[t] = [];
    // On commence à 2 pour éviter x0 et x1 comme demandé
    for (let i = 2; i <= 11; i++) {
        const res = t * i;
        // Génération de mauvaises réponses intelligentes
        let w = [
            res + t,          // Erreur de +1 fois
            res - t > 0 ? res - t : res + 2 * t, // Erreur de -1 fois
            res + (Math.random() > 0.5 ? 1 : -1) // Erreur de +/- 1 (proximité)
        ];

        // On s'assure que les mauvaises réponses sont uniques et différentes de la bonne
        w = [...new Set(w)].filter(x => x !== res);
        while (w.length < 3) w.push(res + 10 + w.length); // Fallback si pas assez de choix

        QUESTIONS_TABLES[t].push({
            q: `${t} × ${i} = ?`,
            o: [String(res), ...w.map(String)],
            c: 0,
            e: `C'est ${t} fois ${i}.`
        });
    }
});

// Remplissage des divisions
[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].forEach(t => {
    QUESTIONS_DIVISIONS[t] = [];
    // i représente le résultat de la division (donc le multiplicateur original)
    for (let i = 2; i <= 11; i++) {
        const total = t * i; // ex: 56
        // Question : 56 ÷ 7 = ? (Réponse : 8)

        // Mauvaises réponses
        let w = [
            i + 1,
            i - 1 > 1 ? i - 1 : i + 2,
            Math.floor(total / (t - 1 > 1 ? t - 1 : t + 1)) // Une division proche mais fausse
        ];

        w = [...new Set(w)].filter(x => x !== i && x > 0);
        while (w.length < 3) w.push(i + 10 + w.length);

        QUESTIONS_DIVISIONS[t].push({
            q: `${total} ÷ ${t} = ?`,
            o: [String(i), ...w.map(String)],
            c: 0,
            e: `Car ${t} × ${i} = ${total}.`
        });
    }
});

// VÉRIFICATION CONSOLE (Pour être sûr que les tables sont chargées)
console.log("Tables chargées :", QUESTIONS_TABLES);



console.log("Divisions chargées :", QUESTIONS_DIVISIONS);

export const LISTE_CLASSES = ["3A", "3B", "3C", "3D", "3E", "4A", "4B", "4C", "4D", "4E", "5A", "5B", "5C", "5D", "6A", "6B", "6C", "6D", "Sans classe"];

// Données statiques de secours
export const QUESTIONS_DB = {
    "auto_fractions": {
        1: [
            // Tes 5 questions d'origine
            { q: "1/2 en décimal ?", o: ["0,5", "0,2", "1,2"], c: 0, e: "La moitié de 1." },
            { q: "1/4 en décimal ?", o: ["0,25", "0,4", "2,5"], c: 0, e: "0,25" },
            { q: "1/10 en décimal ?", o: ["0,1", "0,01", "10"], c: 0, e: "0,1" },
            { q: "3/4 en décimal ?", o: ["0,75", "3,4", "0,34"], c: 0, e: "0,75" },
            { q: "1/5 en décimal ?", o: ["0,2", "0,5", "1,5"], c: 0, e: "0,2" },
            // Nouvelles questions ajoutées pour pouvoir gagner
            { q: "3/10 en décimal ?", o: ["0,3", "3,0", "0,03"], c: 0, e: "Trois dixièmes." },
            { q: "1/100 en décimal ?", o: ["0,01", "0,1", "100"], c: 0, e: "Un centième." },
            { q: "1/1 en entier ?", o: ["1", "0,1", "10"], c: 0, e: "Une unité complète." },
            { q: "4/5 en décimal ?", o: ["0,8", "0,45", "4,5"], c: 0, e: "C'est 0,2 x 4." },
            { q: "2/4 simplifié ?", o: ["1/2", "1/4", "2/2"], c: 0, e: "La moitié." },
            { q: "1,5 en fraction ?", o: ["3/2", "1/5", "2/3"], c: 0, e: "Trois demis." },
            { q: "0,5 en fraction ?", o: ["1/2", "1/5", "5/10"], c: 0, e: "Un demi." }
        ],
        2: [
            // Tes 5 questions d'origine
            { q: "1/2 en décimal ?", o: ["0,5", "0,2", "1,2"], c: 0, e: "La moitié de 1." },
            { q: "1/4 en décimal ?", o: ["0,25", "0,4", "2,5"], c: 0, e: "0,25" },
            { q: "1/10 en décimal ?", o: ["0,1", "0,01", "10"], c: 0, e: "0,1" },
            { q: "3/4 en décimal ?", o: ["0,75", "3,4", "0,34"], c: 0, e: "0,75" },
            { q: "1/5 en décimal ?", o: ["0,2", "0,5", "1,5"], c: 0, e: "0,2" },
            // Nouvelles questions ajoutées pour pouvoir gagner
            { q: "3/10 en décimal ?", o: ["0,3", "3,0", "0,03"], c: 0, e: "Trois dixièmes." },
            { q: "1/100 en décimal ?", o: ["0,01", "0,1", "100"], c: 0, e: "Un centième." },
            { q: "1/1 en entier ?", o: ["1", "0,1", "10"], c: 0, e: "Une unité complète." },
            { q: "4/5 en décimal ?", o: ["0,8", "0,45", "4,5"], c: 0, e: "C'est 0,2 x 4." },
            { q: "2/4 simplifié ?", o: ["1/2", "1/4", "2/2"], c: 0, e: "La moitié." },
            { q: "1,5 en fraction ?", o: ["3/2", "1/5", "2/3"], c: 0, e: "Trois demis." },
            { q: "0,5 en fraction ?", o: ["1/2", "1/5", "5/10"], c: 0, e: "Un demi." }
        ],

        3: [
            // Tes 5 questions d'origine
            { q: "1/2 en décimal ?", o: ["0,5", "0,2", "1,2"], c: 0, e: "La moitié de 1." },
            { q: "1/4 en décimal ?", o: ["0,25", "0,4", "2,5"], c: 0, e: "0,25" },
            { q: "1/10 en décimal ?", o: ["0,1", "0,01", "10"], c: 0, e: "0,1" },
            { q: "3/4 en décimal ?", o: ["0,75", "3,4", "0,34"], c: 0, e: "0,75" },
            { q: "1/5 en décimal ?", o: ["0,2", "0,5", "1,5"], c: 0, e: "0,2" },
            // Nouvelles questions ajoutées pour pouvoir gagner
            { q: "3/10 en décimal ?", o: ["0,3", "3,0", "0,03"], c: 0, e: "Trois dixièmes." },
            { q: "1/100 en décimal ?", o: ["0,01", "0,1", "100"], c: 0, e: "Un centième." },
            { q: "1/1 en entier ?", o: ["1", "0,1", "10"], c: 0, e: "Une unité complète." },
            { q: "4/5 en décimal ?", o: ["0,8", "0,45", "4,5"], c: 0, e: "C'est 0,2 x 4." },
            { q: "2/4 simplifié ?", o: ["1/2", "1/4", "2/2"], c: 0, e: "La moitié." },
            { q: "1,5 en fraction ?", o: ["3/2", "1/5", "2/3"], c: 0, e: "Trois demis." },
            { q: "0,5 en fraction ?", o: ["1/2", "1/5", "5/10"], c: 0, e: "Un demi." }
        ],
    },
    "auto_decimaux": {
        1: [{ q: "12,5 + 3,2 ?", o: ["15,7", "15,5", "16,7"], c: 0, e: "On aligne les virgules." }, { q: "10 - 0,5 ?", o: ["9,5", "9,05", "10,5"], c: 0, e: "9,5" }, { q: "5 × 0,1 ?", o: ["0,5", "50", "0,05"], c: 0, e: "0,5" }],
        2: [{ q: "0,2 × 0,3 ?", o: ["0,06", "0,6", "0,5"], c: 0, e: "2x3=6, 2 chiffres après virgule." }],
        3: [{ q: "1,5 ÷ 0,5 ?", o: ["3", "30", "0,3"], c: 0, e: "Combien de moitiés dans 1,5 ?" }]
    },
    "auto_puissances": {
        1: [{ q: "5² ?", o: ["25", "10", "7"], c: 0, e: "25" }, { q: "10³ ?", o: ["1000", "30", "100"], c: 0, e: "1000" }, { q: "3² ?", o: ["9", "6", "3"], c: 0, e: "9" }],
        2: [{ q: "300 en sci ?", o: ["3 × 10²", "300", "0,3 × 10³"], c: 0, e: "3x100" }, { q: "12 × 10 ?", o: ["1,2 × 10²", "120", "12"], c: 0, e: "120" }],
        3: [{ q: "10⁻² × 10⁻³ ?", o: ["10⁻⁵", "10⁻¹", "10⁶"], c: 0, e: "10^-5" }]
    },
    "auto_litteral": { 1: [{ q: "2x+x?", o: ["3x", "2x²"], c: 0, e: "3x" }] },
    "auto_arithmetique": { 1: [] }, "auto_conversion": { 1: [] }, "auto_solides": { 1: [] },
    "auto_theoremes": { 1: [] }, "auto_proba": { 1: [] }, "auto_stat": { 1: [] }, "auto_prop": { 1: [] }, "auto_graph": { 1: [] }
};
