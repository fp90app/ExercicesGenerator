// src/utils/validators.js
import { z } from "zod";

// --- UTILITAIRES DE TRANSFORMATION ---

// Transforme "42" (string) en 42 (number).
// Accepte les variables de template comme "{x}" ou "{min}" sans planter.
const stringToNumber = z.union([
    z.number(),
    z.string()
]).transform((val) => {
    // Cas 1 : C'est déjà un nombre
    if (typeof val === 'number') return val;

    // Cas 2 : C'est une variable de template (commence par '{')
    // On la laisse telle quelle, MathJS s'en chargera
    if (val.trim().startsWith('{')) return val;

    // Cas 3 : On essaie de convertir une chaîne numérique ("10.5")
    const parsed = parseFloat(val);

    // Si échec (ex: texte vide ou invalide), on renvoie undefined
    return isNaN(parsed) ? undefined : parsed;
});

// --- 1. SCHÉMAS DE CONFIGURATION PAR MOTEUR VISUEL ---

const PythagoreConfigSchema = z.object({
    points: z.object({
        Right: z.string(),
        Top: z.string(),
        Bottom: z.string()
    }),
    // "given" définit quelles valeurs sont affichées (ex: AB, AC)
    given: z.record(z.string(), z.object({
        value: z.union([z.number(), z.string()]),
        label: z.string().optional() // ex: "x" ou "?"
    }))
});

const NumberLineConfigSchema = z.object({
    min: stringToNumber,
    max: stringToNumber,
    step: stringToNumber.optional(),
    points: z.array(z.object({
        value: stringToNumber, // Position (ex: 3.5)
        label: z.string().optional(), // Label sous l'axe
        color: z.string().optional(),
        draggable: z.boolean().optional() // Si c'est le point à placer
    })).optional(),
    intervals: z.array(z.object({
        start: stringToNumber,
        end: stringToNumber,
        color: z.string().optional(),
        brackets: z.enum(["[]", "][", "[ [", "] ]", "[", "]"]).optional() // Pour inéquations
    })).optional()
});

const CartesianConfigSchema = z.object({
    xRange: z.array(stringToNumber), // [min, max]
    yRange: z.array(stringToNumber),
    step: stringToNumber.optional(),
    points: z.array(z.object({
        x: stringToNumber,
        y: stringToNumber,
        label: z.string().optional(),
        color: z.string().optional()
    })).optional(),
    functions: z.array(z.object({
        fn: z.string(), // ex: "x^2 + 1"
        color: z.string().optional()
    })).optional()
});

// --- SCHEMA GEOMETRIE CORRIGÉ ---
const GeometryConfigSchema = z.object({
    // On valide les points (obligatoire)
    points: z.array(z.object({
        x: stringToNumber,
        y: stringToNumber,
        label: z.string().optional()
    }).passthrough()),

    // ✅ CORRECTION 1 : On autorise explicitement les lignes
    lines: z.array(z.array(z.number())).optional(),

    // On valide les points extra (optionnel)
    extraPoints: z.array(z.object({
        x: stringToNumber,
        y: stringToNumber,
        label: z.string().optional()
    }).passthrough()).optional(),

    // On valide les codages
    codings: z.array(z.object({
        type: z.string(),
        indices: z.array(z.number()),
        label: z.string().optional(),
        color: z.string().optional(),
        hide: z.union([z.boolean(), z.string()]).optional(),
        size: z.number().optional()
    }).passthrough()).optional()

}).passthrough();



const AnglesConfigSchema = z.object({
    mode: z.string(), // "OPPOSES", "COMPLEMENTAIRES"...
    angle: stringToNumber.optional(),
    labels: z.record(z.string()).optional(),
    colors: z.record(z.string()).optional(),
    hideBlue: z.boolean().optional(),
    hideRed: z.boolean().optional()
}).passthrough();


// --- 2. SCHÉMA GLOBAL DE LA COUCHE VISUELLE ---

const VisualLayerSchema = z.object({
    visual_engine: z.enum([
        "NONE",
        "ENGINE_PYTHAGORE",
        "ENGINE_NUMBER_LINE",
        "ENGINE_CARTESIAN",
        "ENGINE_GEOMETRY",
        "ENGINE_ANGLES",
        // Ajouter ici les futurs moteurs (Thalès...)
    ]),

    // Config commune (Template)
    common_config: z.object({
        visual_config_template: z.union([
            PythagoreConfigSchema,
            NumberLineConfigSchema,
            CartesianConfigSchema,
            GeometryConfigSchema,
            AnglesConfigSchema,
            z.record(z.any()) // Fallback pour éviter les blocages
        ]).optional()
    }).optional(),

    // Config par niveau (Override)
    levels: z.record(z.string(), z.object({
        visual_config_override: z.union([
            PythagoreConfigSchema,
            NumberLineConfigSchema,
            CartesianConfigSchema,
            GeometryConfigSchema,
            z.record(z.any())
        ]).optional()
        // Note: Le reste (variables, question_template...) est géré par BaseExerciseSchema
    }))
});

// --- 3. SCHÉMA DES VARIABLES MATHÉMATIQUES ---

const VariablesSchema = z.record(z.string(), z.string()); // "a": "randomInt(1, 10)"

// --- 4. SCHÉMA DE L'EXERCICE DE BASE (SANS VISUEL) ---

const LevelSchema = z.object({
    variables: VariablesSchema.optional(),
    question_template: z.string(), // "Calcule {a} + {b}"
    explanation_template: z.string().optional(),
    response_type: z.enum(["NUMERIC", "QCM", "TEXT", "MATH_KEYBOARD"]).optional(),
    correct_answer: z.string(), // Formule MathJS ou texte

    // ✅ CORRECTION 2 : On accepte soit des Strings (ancien format), soit des Objets (nouveau format avec isCorrect)
    qcm_options: z.array(
        z.union([
            z.string(),
            z.object({
                value: z.string(),
                isCorrect: z.union([z.boolean(), z.string()]).optional()
            }).passthrough()
        ])
    ).optional(),

    xp_reward: z.number().optional().default(5)
});

const BaseExerciseSchema = z.object({
    id: z.string(),
    levels: z.record(z.string(), LevelSchema).refine((levels) => Object.keys(levels).length > 0, {
        message: "Il faut au moins un niveau (ex: '1')"
    })
});

// --- 6. FUSION FINALE (INTERSECTION) ---
// Un exercice valide = Propriétés de base ET (Moteur Visuel + Sa Config Spécifique)
export const ExerciseSchema = z.intersection(BaseExerciseSchema, VisualLayerSchema);

/**
 * Fonction principale de validation
 * @param {string} jsonString - Le JSON brut de l'éditeur
 * @returns { { success: true, data: object } | { success: false, error: string } }
 */
export const parseAndValidateExercise = (jsonString) => {
    try {
        if (!jsonString || jsonString.trim() === "") {
            return { success: false, error: "Le JSON est vide" };
        }

        // 1. Parsing JSON basique
        const rawData = JSON.parse(jsonString);

        // 2. Validation Zod stricte
        const cleanData = ExerciseSchema.parse(rawData);

        return { success: true, data: cleanData };
    } catch (e) {
        // Gestion des erreurs
        if (e instanceof SyntaxError) {
            return { success: false, error: "Erreur de syntaxe JSON (virgule manquante ? accolade ?)" };
        }
        if (e.errors) {
            // Formattage lisible des erreurs Zod
            const msg = e.errors.map(err => {
                const path = err.path.join('.');
                return `[${path}] : ${err.message}`;
            }).join('\n');
            return { success: false, error: msg };
        }
        return { success: false, error: e.message };
    }
};