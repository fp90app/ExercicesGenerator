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
        val: z.any(),
        unit: z.string().optional()
    })),
    targetKey: z.string().optional(),
    qType: z.enum(["CALC", "EQUALITY"]).optional()
});

const CartesianConfigSchema = z.object({
    min: stringToNumber.optional(),
    max: stringToNumber.optional(),
    step: stringToNumber.optional(),
    gridSize: stringToNumber.optional(),
    f: z.string().optional(), // ex: "x^2 + 1"
    showGrid: z.boolean().optional(),
    // Points spécifiques à afficher
    points: z.array(z.object({
        x: z.any(),
        y: z.any(),
        label: z.string().optional(),
        color: z.string().optional(),
        shape: z.string().optional()
    })).optional()
});

const NumberLineConfigSchema = z.object({
    min: stringToNumber.optional(),
    max: stringToNumber.optional(),
    step: stringToNumber.optional(),
    points: z.array(z.object({
        val: z.any(),
        label: z.string().optional(),
        color: z.string().optional()
    })).optional()
});

// --- 2. SCHÉMA GÉNÉRIQUE (Pour les overrides dans les niveaux) ---
// On garde une version souple pour "visual_config_override" à l'intérieur des niveaux
const GenericVisualConfigSchema = z.object({
    min: stringToNumber.optional(),
    max: stringToNumber.optional(),
    f: z.string().optional(),
    points: z.any().optional(),
    given: z.any().optional(),
    vals: z.any().optional() // Souvent utilisé pour injecter les valeurs calculées
}).passthrough(); // .passthrough() accepte d'autres clés non définies ici

// --- 3. SCHÉMA D'UN NIVEAU (LEVEL) ---

const LevelSchema = z.object({
    // Type de réponse attendue
    response_type: z.enum(["QCM", "NUMERIC", "TEXT", "GRAPH_POINT"]).default("NUMERIC"),

    // Variables (Expressions MathJS ou valeurs fixes)
    variables: z.record(z.string(), z.union([z.string(), z.number()])).optional(),

    // Calculs intermédiaires
    calculations: z.record(z.string(), z.string()).optional(),

    // Textes
    question_template: z.string({ required_error: "La question est obligatoire" }),
    explanation_template: z.string().optional(),

    // La réponse correcte (formule ou valeur)
    correct_answer: z.string({ required_error: "La réponse correcte est obligatoire" }),

    // Surcharge de la config visuelle pour ce niveau
    visual_config_override: GenericVisualConfigSchema.optional(),

    // Récompense
    xp_reward: stringToNumber.optional().default(5)
});

// --- 4. LE "SWITCH" POLYMORPHE (MOTEUR + CONFIG) ---

const VisualLayerSchema = z.discriminatedUnion("visual_engine", [
    // Cas 1 : Pas de moteur visuel (Juste du texte)
    z.object({
        visual_engine: z.literal("NONE"),
        common_config: z.object({}).optional()
    }),
    // Cas 2 : Moteur Pythagore
    z.object({
        visual_engine: z.literal("ENGINE_PYTHAGORE"),
        common_config: z.object({
            visual_config_template: PythagoreConfigSchema
        }).optional()
    }),
    // Cas 3 : Moteur Cartésien (Fonctions, Repère)
    z.object({
        visual_engine: z.literal("ENGINE_CARTESIAN"),
        common_config: z.object({
            visual_config_template: CartesianConfigSchema
        }).optional()
    }),
    // Cas 4 : Droite Graduée
    z.object({
        visual_engine: z.literal("ENGINE_NUMBER_LINE"),
        common_config: z.object({
            visual_config_template: NumberLineConfigSchema
        }).optional()
    }),
    // Cas 5 : Moteur Thalès (Prévu pour le futur)
    z.object({
        visual_engine: z.literal("ENGINE_THALES"),
        // CORRECTION ICI : .passthrough() AVANT .optional()
        common_config: z.object({}).passthrough().optional()
    })
]);

// --- 5. SCHÉMA DE BASE DE L'EXERCICE ---

const BaseExerciseSchema = z.object({
    id: z.string().min(3, "L'ID doit faire au moins 3 caractères"),
    title: z.string().optional(),
    published: z.boolean().optional(),

    // Dictionnaire des niveaux ("1", "2", "3"...)
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
                return `• ${path}: ${err.message}`;
            }).join('\n');
            return { success: false, error: msg };
        }
        return { success: false, error: e.message };
    }
};