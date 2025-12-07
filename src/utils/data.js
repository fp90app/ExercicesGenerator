// src/utils/data.js

export const AUTOMATISMES_DATA = [
    {
        title: "Nombres et Calculs",
        color: "indigo",
        exos: [
            { id: "auto_1_ecriture_decimale_fractions", title: "Écriture décimale" },
            { id: "auto_2_comparaison_calcul_decimaux", title: "Nombres décimaux - Calculs" },
            { id: "auto_3_fractions_calc", title: "Calculs fractions" },
            { id: "auto_4_fraction_nombre", title: "Fraction d'un nombre" },
            { id: "auto_5_pourcentages", title: "Pourcentages simples" },
            { id: "auto_6_formes_multiples", title: "Formes multiples" },
            { id: "auto_7_ecriture_sci", title: "Notation scientifique" },
            { id: "auto_8_carres_3eme", title: "Carrés parfaits" },
            { id: "auto_9_divisibilite", title: "Divisibilité" },
            { id: "auto_10_vocabulaire_ops", title: "Vocabulaire (double...)" },
            // J'ai laissé la droite graduée ici, c'est plus logique qu'en calcul littéral
            { id: "auto_15_droite_graduee", title: "Droite graduée" }
        ]
    },
    {
        title: "Calcul Littéral",
        color: "purple", // Nouvelle section violette
        exos: [
            { id: "auto_11_simplifier_litteral", title: "Simplifier (littéral)" },
            { id: "auto_12_valeur_expression", title: "Substitution" },

            // --- Cœur du calcul littéral ---
            { id: "auto_13_dev_fact", title: "Développements k(a+b)" },
            { id: "auto_facto_simple", title: "Factorisations k(a+b)" },
            { id: "auto_dvlpt_double", title: "Développements doubles (a+b)(c+d)" },
            { id: "auto_facto_complexe", title: "Factorisations complexes" },

            // --- Identités Remarquables ---
            { id: "auto_ir_3_dev", title: "IR (a+b)(a-b) : Développement" },
            { id: "auto_ir_3_fact", title: "IR a²-b² : Factorisation" },
            { id: "auto_ir_1_2_dev", title: "IR Carrés (a±b)² : Développement" },
            { id: "auto_ir_1_2_fact", title: "IR Carrés a²±2ab+b² : Factorisation" },

            // --- Équations ---
            { id: "auto_14_equations", title: "Équations simples" },
        ]
    },
    {
        title: "Espace et Géométrie",
        color: "emerald",
        exos: [
            { id: "auto_16_coordonnees", title: "Coordonnées" },
            { id: "auto_17_codage_figures", title: "Figures & Codage" },
            { id: "auto_18_angles_vocab", title: "Vocabulaire angles" },
            { id: "auto_19_angles_triangle", title: "Angles du triangle" },
            { id: "auto_20_conversions", title: "Conversions" },
            { id: "auto_21_solides", title: "Reconnaître solides" },
            { id: "auto_22_perimetres", title: "Périmètres" },
            { id: "auto_23_aires", title: "Aires" },
            { id: "auto_24_volumes", title: "Volumes" },
            { id: "auto_25_pythagore", title: "Pythagore" },
            { id: "auto_26_thales", title: "Thalès" },
            { id: "auto_27_trigo", title: "Trigonométrie" },
            { id: "auto_28_symetries", title: "Transformations" }
        ]
    },
    {
        title: "Organisation de Données",
        color: "amber",
        exos: [
            { id: "auto_29_probabilites", title: "Probabilités" },
            { id: "auto_30_frequence", title: "Fréquences" },
            { id: "auto_31_moyenne", title: "Moyenne" },
            { id: "auto_32_mediane", title: "Médiane" },
            { id: "auto_33_lecture_graphique", title: "Lecture de données" }
        ]
    },
    {
        title: "Proportionnalité et Fonctions",
        color: "rose",
        exos: [
            { id: "auto_34_reconnaitre_prop", title: "Reconnaître Propor." },
            { id: "auto_35_calcul_prop", title: "Calculs Propor." },
            { id: "auto_36_pourcentages_evol", title: "Évolutions (%)" },
            { id: "auto_37_graph", title: "Images/antécédents sur graphique" },
            { id: "auto_38_graph2", title: "Tableau de valeurs et graphiques" }
        ]
    },
    {
        title: "Informatique",
        color: "cyan",
        exos: [
            { id: "auto_39_algo", title: "Algorithmique" },
            { id: "auto_40_tableur", title: "Tableur" }
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
    "auto_facto_simple",





    "auto_14_equations",
    "auto_15_droite_graduee",
    "auto_25_pythagore",
    "auto_26_thales",
    "auto_31_moyenne",
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
    for (let i = 2; i <= 11; i++) {
        const res = t * i;
        let w = [
            res + t,
            res - t > 0 ? res - t : res + 2 * t,
            res + (Math.random() > 0.5 ? 1 : -1)
        ];
        w = [...new Set(w)].filter(x => x !== res);
        while (w.length < 3) w.push(res + 10 + w.length);

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
    for (let i = 2; i <= 11; i++) {
        const total = t * i;
        let w = [
            i + 1,
            i - 1 > 1 ? i - 1 : i + 2,
            Math.floor(total / (t - 1 > 1 ? t - 1 : t + 1))
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

export const LISTE_CLASSES = ["3A", "3B", "3C", "3D", "3E", "4A", "4B", "4C", "4D", "4E", "5A", "5B", "5C", "5D", "6A", "6B", "6C", "6D", "Sans classe"];

// Données statiques de secours
export const QUESTIONS_DB = {
    "auto_fractions": {
        1: [
            { q: "1/2 en décimal ?", o: ["0,5", "0,2", "1,2"], c: 0, e: "La moitié de 1." },
            { q: "1/4 en décimal ?", o: ["0,25", "0,4", "2,5"], c: 0, e: "0,25" },
            { q: "1/10 en décimal ?", o: ["0,1", "0,01", "10"], c: 0, e: "0,1" },
            { q: "3/4 en décimal ?", o: ["0,75", "3,4", "0,34"], c: 0, e: "0,75" },
            { q: "1/5 en décimal ?", o: ["0,2", "0,5", "1,5"], c: 0, e: "0,2" },
            { q: "3/10 en décimal ?", o: ["0,3", "3,0", "0,03"], c: 0, e: "Trois dixièmes." },
            { q: "1/100 en décimal ?", o: ["0,01", "0,1", "100"], c: 0, e: "Un centième." },
            { q: "1/1 en entier ?", o: ["1", "0,1", "10"], c: 0, e: "Une unité complète." },
            { q: "4/5 en décimal ?", o: ["0,8", "0,45", "4,5"], c: 0, e: "C'est 0,2 x 4." },
            { q: "2/4 simplifié ?", o: ["1/2", "1/4", "2/2"], c: 0, e: "La moitié." },
            { q: "1,5 en fraction ?", o: ["3/2", "1/5", "2/3"], c: 0, e: "Trois demis." },
            { q: "0,5 en fraction ?", o: ["1/2", "1/5", "5/10"], c: 0, e: "Un demi." }
        ],
        2: [
            { q: "1/2 en décimal ?", o: ["0,5", "0,2", "1,2"], c: 0, e: "La moitié de 1." },
            { q: "1/4 en décimal ?", o: ["0,25", "0,4", "2,5"], c: 0, e: "0,25" },
            { q: "1/10 en décimal ?", o: ["0,1", "0,01", "10"], c: 0, e: "0,1" },
            { q: "3/4 en décimal ?", o: ["0,75", "3,4", "0,34"], c: 0, e: "0,75" },
            { q: "1/5 en décimal ?", o: ["0,2", "0,5", "1,5"], c: 0, e: "0,2" },
            { q: "3/10 en décimal ?", o: ["0,3", "3,0", "0,03"], c: 0, e: "Trois dixièmes." },
            { q: "1/100 en décimal ?", o: ["0,01", "0,1", "100"], c: 0, e: "Un centième." },
            { q: "1/1 en entier ?", o: ["1", "0,1", "10"], c: 0, e: "Une unité complète." },
            { q: "4/5 en décimal ?", o: ["0,8", "0,45", "4,5"], c: 0, e: "C'est 0,2 x 4." },
            { q: "2/4 simplifié ?", o: ["1/2", "1/4", "2/2"], c: 0, e: "La moitié." },
            { q: "1,5 en fraction ?", o: ["3/2", "1/5", "2/3"], c: 0, e: "Trois demis." },
            { q: "0,5 en fraction ?", o: ["1/2", "1/5", "5/10"], c: 0, e: "Un demi." }
        ],
        3: [
            { q: "1/2 en décimal ?", o: ["0,5", "0,2", "1,2"], c: 0, e: "La moitié de 1." },
            { q: "1/4 en décimal ?", o: ["0,25", "0,4", "2,5"], c: 0, e: "0,25" },
            { q: "1/10 en décimal ?", o: ["0,1", "0,01", "10"], c: 0, e: "0,1" },
            { q: "3/4 en décimal ?", o: ["0,75", "3,4", "0,34"], c: 0, e: "0,75" },
            { q: "1/5 en décimal ?", o: ["0,2", "0,5", "1,5"], c: 0, e: "0,2" },
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