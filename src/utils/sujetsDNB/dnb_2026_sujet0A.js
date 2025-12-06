export const SUJET_2026_0A = {
    id: "dnb_2026_sujet0A",
    title: "Sujet 0A - DNB 2026",
    description: "Série Générale - Épreuve Mathématiques (2h)",
    totalPoints: 18, // Total calculé hors points de rédaction
    redactionPoints: 2, // 2 points non évalués pour le soin et la qualité de la rédaction
    parts: [
        {
            id: "part1_auto",
            title: "Partie 1 : Automatismes",
            description: "Calculatrice interdite - 6 points",
            exercises: [
                {
                    id: "auto_bloc_1",
                    image: "/assets/brevet/sujet0A/DNB2026_Sujet_0A_2.webp",
                    questions: [
                        {
                            id: "q1",
                            label: "Q1. Tiers",
                            question: "Quel est le tiers de 18 ?",
                            type: "number",
                            point: 0.5,
                            correct: 6,
                            correction: "18 ÷ 3 = 6."
                        },
                        {
                            id: "q2",
                            label: "Q2. Durée",
                            question: "Un film dure 240 min. Durée en heures ?",
                            type: "number",
                            point: 0.5,
                            correct: 4,
                            correction: "240 ÷ 60 = 4 heures."
                        },
                        {
                            id: "q3",
                            label: "Q3. Médiane",
                            question: "Quelle est la médiane : 8 ; 12 ; 6 ; 19 ; 15 ?",
                            type: "number",
                            point: 1,
                            correct: 12,
                            correction: "Série ordonnée : 6 ; 8 ; 12 ; 15 ; 19."
                        },
                        {
                            id: "q4",
                            label: "Q4. Axe",
                            question: "Abscisse du point E ?",
                            type: "qcm",
                            point: 0.5,
                            options: ["5/4", "3/2", "7/4"],
                            correct: "7/4",
                            correction: "7ème graduation (quarts)."
                        },
                        {
                            id: "q5",
                            label: "Q5. Angles",
                            question: "Triangle rectangle en B, Â = 35°. Calculer Ĉ en °.",
                            type: "number",
                            point: 0.5,
                            correct: 55,
                            correction: "180 - 90 - 35 = 55°."
                        }
                    ]
                },
                {
                    id: "auto_bloc_2",
                    image: "/assets/brevet/sujet0A/DNB2026_Sujet_0A_3.webp",
                    questions: [
                        {
                            id: "q6",
                            label: "Q6. Trigo",
                            question: "Formule du cosinus de l'angle ABC ?",
                            type: "qcm",
                            point: 0.5,
                            options: ["AB/BC", "BC/AB", "AC/BC"],
                            correct: "AB/BC",
                            correction: "Adj / Hyp = AB / BC."
                        },
                        {
                            id: "q7",
                            label: "Q7. Thalès",
                            question: "Longueur AD en cm.",
                            type: "number",
                            point: 1,
                            correct: 14,
                            correction: "Coeff = 3.5. AD = 4 × 3.5 = 14."
                        },
                        {
                            id: "q8",
                            label: "Q8. Pourcentage",
                            question: "Combien d'élèves NE participent PAS ?",
                            type: "number",
                            point: 1,
                            correct: 225,
                            correction: "75% de 300 = 225."
                        },
                        {
                            id: "q9_1",
                            label: "Q9. Boucle",
                            question: "Répéter combien de fois ?",
                            type: "number",
                            point: 0.25,
                            correct: 4,
                            correction: "4 côtés."
                        },
                        {
                            id: "q9_2",
                            label: "Q9. Angle",
                            question: "Tourner de combien de degrés ?",
                            type: "number",
                            point: 0.25,
                            correct: 90,
                            correction: "Angle droit."
                        }
                    ]
                }
            ]
        },
        {
            id: "part2_pb",
            title: "Partie 2 : Problèmes",
            description: "12 points (hors rédaction)",
            exercises: [
                {
                    id: "exo1_stat",
                    title: "Ex 1 : Gaspillage (3 pts)",
                    image: "/assets/brevet/sujet0A/DNB2026_Sujet_0A_4.webp",
                    questions: [
                        {
                            id: "e1_q1_moy",
                            label: "1. Moyenne",
                            question: "Moyenne des déchets (arrondir à l'entier le plus proche) ?",
                            type: "number",
                            point: 1,
                            correct: 64,
                            correction: "450/7 ≈ 64 kg."
                        },
                        {
                            id: "e1_q1_obj",
                            label: "1. Objectif",
                            question: "L'objectif est-il atteint ?",
                            type: "qcm",
                            point: 0.5,
                            options: ["Oui", "Non"],
                            correct: "Oui",
                            correction: "64 < 65."
                        },
                        {
                            id: "e1_q2a_val",
                            label: "2.a. Effectif",
                            question: "Effectif total d'élèves ?",
                            type: "number",
                            point: 0.5,
                            correct: 257,
                            correction: "Somme des barres = 257."
                        },
                        {
                            id: "e1_q2b_val",
                            label: "2.b. Taux",
                            question: "% élèves parcourant ≥ 5 km (entier) ?",
                            type: "number",
                            point: 0.5,
                            correct: 33,
                            correction: "86/257 ≈ 33%."
                        },
                        {
                            id: "e1_q2b_vrai",
                            label: "2.b. Affirmation",
                            question: "L'affirmation 'Plus de 30%' est-elle vraie ?",
                            type: "qcm",
                            point: 0.5,
                            options: ["Oui", "Non"],
                            correct: "Oui",
                            correction: "33% > 30%."
                        }
                    ]
                },
                {
                    id: "exo2_algo",
                    title: "Ex 2 : Calcul (3 pts)",
                    image: "/assets/brevet/sujet0A/DNB2026_Sujet_0A_5.webp",
                    questions: [
                        {
                            id: "e2_q1",
                            label: "1. Test",
                            question: "Résultat avec 4 au départ ?",
                            type: "number",
                            point: 1,
                            correct: 55,
                            correction: "(4×2)² - 9 = 55."
                        },
                        {
                            id: "e2_q2a",
                            label: "2.a. Expression",
                            question: "Expression en fonction de x ?",
                            type: "text",
                            point: 1,
                            correct: ["55", "4x^2-9", "4x²-9", "(2x)^2-9", "(2x)²-9"],
                            correction: "(2x)² - 9 = 4x² - 9."
                        },
                        {
                            id: "e2_q2b",
                            label: "2.b. Forme",
                            question: "Quelle est la forme factorisée ?",
                            type: "qcm",
                            point: 1,
                            options: ["55", "(2x+3)²", "(2x-3)(2x+3)"],
                            correct: "(2x-3)(2x+3)",
                            correction: "Identité a²-b²."
                        }
                    ]
                },
                {
                    id: "exo3_fonctions",
                    title: "Ex 3 : Fonctions (3 pts)",
                    image: "/assets/brevet/sujet0A/DNB2026_Sujet_0A_6.webp",
                    questions: [
                        {
                            id: "e3_q1",
                            label: "1. Proportionnalité",
                            question: "Quelle fonction correspond à une situation de proportionnalité ?",
                            type: "qcm",
                            point: 0.25,
                            options: ["f", "g"],
                            correct: "g",
                            correction: "g(x)=6x est linéaire."
                        },
                        {
                            id: "e3_q2",
                            label: "2. Image",
                            question: "Image de 0 par g ?",
                            type: "number",
                            point: 0.25,
                            correct: 0,
                            correction: "g(0) = 0."
                        },
                        {
                            id: "e3_q3",
                            label: "3. Antécédent",
                            question: "Antécédent de 0 par f ?",
                            type: "number",
                            point: 0.5,
                            correct: -0.75,
                            correction: "4x+3=0 -> x=-0.75."
                        },
                        {
                            id: "e3_q4_d1",
                            label: "4. Droite (d1)",
                            question: "Fonction pour (d1) ?",
                            type: "qcm",
                            point: 0.25,
                            options: ["f", "g"],
                            correct: "g",
                            correction: "Elle passe par 0 et g(0) = 0."
                        },
                        {
                            id: "e3_q4_d2",
                            label: "4. Droite (d2)",
                            question: "Fonction pour (d2) ?",
                            type: "qcm",
                            point: 0.25,
                            options: ["f", "g"],
                            correct: "f",
                            correction: "(d2) ne passe pas par 0."
                        },
                        {
                            id: "e3_q5_x",
                            label: "5. Intersec X",
                            question: "Abscisse intersection ?",
                            type: "number",
                            point: 0.75,
                            correct: 1.5,
                            correction: "Lecture sur l'axe horizontal."
                        },
                        {
                            id: "e3_q5_y",
                            label: "5. Intersec Y",
                            question: "Ordonnée intersection ?",
                            type: "number",
                            point: 0.75,
                            correct: 9,
                            correction: "Lecture sur l'axe vertical."
                        }
                    ]
                },
                {
                    id: "exo4_geo",
                    title: "Ex 4 : Géométrie (3 pts)",
                    image: "/assets/brevet/sujet0A/DNB2026_Sujet_0A_7.webp",
                    questions: [
                        {
                            id: "e4_q1a_IJ",
                            label: "1.a. IJ",
                            question: "Longueur IJ (cm) ?",
                            type: "number",
                            point: 0.25,
                            correct: 3,
                            correction: "9 ÷ 3 = 3."
                        },
                        {
                            id: "e4_q1a_IP",
                            label: "1.a. IP",
                            question: "Longueur IP (arrondir 0,1) ?",
                            type: "number",
                            point: 0.5,
                            correct: 4.2,
                            correction: "√(3²+3²) ≈ 4,2."
                        },
                        {
                            id: "e4_q1a_VF",
                            label: "1.a. Régulier",
                            question: "Polygone régulier ?",
                            type: "qcm",
                            point: 0.25,
                            options: ["Oui", "Non"],
                            correct: "Non",
                            correction: "Côtés inégaux."
                        },
                        {
                            id: "e4_q1b",
                            label: "1.b. Aire Poly",
                            question: "Aire polygone (cm²) ?",
                            type: "number",
                            point: 0.5,
                            correct: 63,
                            correction: "81 - 18 = 63."
                        },
                        {
                            id: "e4_q2a",
                            label: "2.a. Aire Disq",
                            question: "Aire disque (cm²) ?",
                            type: "number",
                            point: 0.5,
                            correct: 64,
                            correction: "π×4,5² ≈ 64."
                        },
                        {
                            id: "e4_q2b",
                            label: "2.b. Diff %",
                            question: "% différence (arrondir 0,01) ?",
                            type: "number",
                            point: 0.5,
                            correct: 1,
                            correction: "~1%."
                        },
                        {
                            id: "e4_q2b_VF",
                            label: "2.b. Conclusion",
                            question: "La différence entre les deux aires est-elle bien inférieure à 2% ?",
                            type: "qcm",
                            point: 0.5,
                            options: ["Oui", "Non"],
                            correct: "Oui",
                            correction: "1% < 2%."
                        }
                    ]
                }
            ]
        }
    ]
};