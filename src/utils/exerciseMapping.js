// src/utils/exerciseMapping.js

// 1. On importe tous vos générateurs existants
import {
    generateFractionQuestion,
    generateDecimalQuestion,
    generateFractionOpsQuestion,
    generateFractionOfNumberQuestion,
    generatePercentQuestion,
    generateMultipleFormsQuestion,
    generateScientificNotationQuestion,
    generateSquareQuestion,
    generateDivisibilityQuestion,
    generateVocabularyQuestion,
    generateSimplifyExpressionQuestion,
    generateSubstitutionQuestion,
    generateDevelopFactorizeQuestion,
    generateFactoriseQuestion,
    generateMeanQuestion,
    generateAlgoQuestion,
    generateGraphQuestion, // Assurez-vous d'importer celui-ci si vous l'avez
    generateTestQuestion
} from './mathGenerators';

// 2. On crée un Dictionnaire
export const EXERCISE_MAPPING = {
    // --- Nombres et Calculs ---
    'auto_1_ecriture_decimale_fractions': generateFractionQuestion,
    'auto_2_comparaison_calcul_decimaux': generateDecimalQuestion,
    'auto_3_fractions_calc': generateFractionOpsQuestion,
    'auto_4_fraction_nombre': generateFractionOfNumberQuestion,
    'auto_5_pourcentages': generatePercentQuestion,
    'auto_6_formes_multiples': generateMultipleFormsQuestion,
    'auto_7_ecriture_sci': generateScientificNotationQuestion,
    'auto_8_carres_3eme': generateSquareQuestion,
    'auto_9_divisibilite': generateDivisibilityQuestion,
    'auto_10_vocabulaire_ops': generateVocabularyQuestion,

    // --- Calcul Littéral ---
    'auto_11_simplifier_litteral': generateSimplifyExpressionQuestion,
    'auto_12_valeur_expression': generateSubstitutionQuestion,
    'auto_13_dev_fact': generateDevelopFactorizeQuestion,
    'auto_facto_simple': generateFactoriseQuestion,

    // --- Organisation données ---
    'auto_31_moyenne': generateMeanQuestion,

    // --- Algorithmique (Scratch) ---
    // Scratch fonctionne comme un générateur standard (il renvoie du JSON), donc on le mappe directement
    'auto_39_algo': generateAlgoQuestion,

    // --- EXERCICES VISUELS (Moteurs Spéciaux) ---
    // Au lieu d'une fonction, on met une "Clé" (String) que StandardGame va reconnaître
    'auto_25_pythagore': 'ENGINE_PYTHAGORE',
    'auto_26_thales': 'ENGINE_THALES',
    'auto_37_graph': 'ENGINE_GRAPH_READING',
    'auto_38_graph2': 'ENGINE_TABLE_CURVE',

    // --- TESTS ---
    'auto_test_calcul': generateTestQuestion,
};

// Fonction utilitaire
export const getGenerator = (id) => {
    return EXERCISE_MAPPING[id] || null;
};