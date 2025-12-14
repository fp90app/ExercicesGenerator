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
    generateTestQuestion // Votre nouveau test
} from './mathGenerators';

// 2. On crée un Dictionnaire (ID -> Fonction)
// C'est ici que vous ajouterez vos futurs exercices !
export const EXERCISE_MAPPING = {
    // Nombres et Calculs
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

    // Calcul Littéral
    'auto_11_simplifier_litteral': generateSimplifyExpressionQuestion,
    'auto_12_valeur_expression': generateSubstitutionQuestion,
    'auto_13_dev_fact': generateDevelopFactorizeQuestion,
    'auto_facto_simple': generateFactoriseQuestion,

    // Organisation données
    'auto_31_moyenne': generateMeanQuestion,

    // Algo
    'auto_39_algo': generateAlgoQuestion,

    // VOS NOUVEAUX TESTS
    'auto_test_calcul': generateTestQuestion,
};

// Fonction utilitaire pour récupérer le générateur en sécurité
export const getGenerator = (id) => {
    return EXERCISE_MAPPING[id] || null;
};