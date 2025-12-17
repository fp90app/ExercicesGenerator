import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import * as math from 'mathjs';

const memoryCache = {};

export const useMathGenerator = (exerciseId, level = 1) => {
    const [questionData, setQuestionData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // On utilise une ref pour stocker la config et éviter des re-renders
    const configRef = useRef(null);

    // 1. CHARGEMENT CONFIG
    useEffect(() => {
        if (!exerciseId || typeof exerciseId !== 'string') return;

        if (memoryCache[exerciseId]) {
            configRef.current = memoryCache[exerciseId];
            generate();
            return;
        }

        const fetchConfig = async () => {
            setLoading(true);
            try {
                const docRef = doc(db, "structure_automatismes", exerciseId);
                const snap = await getDoc(docRef);

                if (snap.exists()) {
                    const data = snap.data();
                    memoryCache[exerciseId] = data;
                    configRef.current = data;
                    generate();
                }
            } catch (err) {
                console.error("Erreur Firestore:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchConfig();
    }, [exerciseId]);

    // 2. GÉNÉRATEUR MATHÉMATIQUE
    const generate = useCallback(() => {
        const config = configRef.current;
        if (!config) return;

        try {
            const lvlKey = String(level);
            // 1. On récupère la base du niveau
            let levelBase = config.levels ? (config.levels[lvlKey] || config.levels["1"]) : config;
            if (!levelBase) return;

            // --- GESTION DES VARIATIONS ---
            let levelData = { ...levelBase };

            if (levelData.variations && Array.isArray(levelData.variations) && levelData.variations.length > 0) {
                const variant = levelData.variations[Math.floor(Math.random() * levelData.variations.length)];
                levelData = {
                    ...levelData,
                    ...variant,
                    variables: { ...(levelData.variables || {}), ...(variant.variables || {}) },
                    calculations: { ...(levelData.calculations || {}), ...(variant.calculations || {}) },
                    visual_config_override: { ...(levelData.visual_config_override || {}), ...(variant.visual_config_override || {}) }
                };
            }

            let scope = {};

            // A. VARIABLES
            if (levelData.variables) {
                Object.keys(levelData.variables).forEach(key => {
                    try {
                        let expr = levelData.variables[key];
                        // Si c'est une chaîne simple sans maths, on garde le texte (évite erreur MathJS)
                        if (typeof expr === 'string' && !expr.match(/[+\-*/^()\[\]]/) && !expr.includes('random')) {
                            scope[key] = expr;
                        } else {
                            scope[key] = math.evaluate(String(expr), scope);
                        }
                    } catch (e) {
                        console.error(`Variable Error [${key}]:`, e.message);
                        scope[key] = 0;
                    }
                });
            }

            // B. CALCULS
            if (levelData.calculations) {
                let toCalculate = Object.keys(levelData.calculations);
                let pass = 0;
                while (toCalculate.length > 0 && pass < 5) {
                    const nextBatch = [];
                    toCalculate.forEach(key => {
                        try {
                            const formula = String(levelData.calculations[key]);
                            scope[key] = math.evaluate(formula, scope);
                        } catch (e) {
                            nextBatch.push(key);
                        }
                    });
                    if (nextBatch.length === toCalculate.length) break; // Blocage
                    toCalculate = nextBatch;
                    pass++;
                }
            }

            // FONCTION DE REMPLACEMENT (Reusability)
            const replaceVars = (text) => {
                if (!text) return "";
                const keys = Object.keys(scope).sort((a, b) => b.length - a.length);
                let res = String(text);
                keys.forEach(key => {
                    const regex = new RegExp(`{${key}}`, 'g');
                    let val = scope[key];
                    if (typeof val === 'number' && !Number.isInteger(val)) {
                        val = Math.round(val * 1000) / 1000;
                    }
                    res = res.replace(regex, val);
                });
                return res;
            };

            // C. TEXTES
            let qText = replaceVars(levelData.question_template || config.question_template || "Calculer :");
            let expText = replaceVars(levelData.explanation_template || config.explanation_template || "");

            // D. RÉPONSE CORRECTE
            let correct = levelData.correct_answer || config.correct_answer;
            if (typeof correct === 'string') {
                correct = replaceVars(correct);
            }

            // --- E. GESTION DES OPTIONS QCM (METHODE ROBUSTE) ---
            let qcmOptions = [];
            if (levelData.options && Array.isArray(levelData.options)) {

                // 1. On prépare une fonction de nettoyage pour la comparaison interne
                // (On retire espaces et $ pour être sûr de trouver la bonne réponse même si mal formatée dans le JSON)
                const normalize = (str) => String(str).replace(/[\s$]/g, '').trim();
                const cleanCorrect = normalize(correct);

                // 2. On construit les objets options
                qcmOptions = levelData.options.map(opt => {
                    const finalValue = replaceVars(opt); // Le texte affiché (ex: "$x^2 - 16$")
                    const cleanValue = normalize(finalValue);

                    return {
                        value: finalValue,      // Ce qu'on affiche
                        isCorrect: cleanValue === cleanCorrect // LE DRAME EST RÉSOLU ICI
                    };
                });

                // 3. On mélange les OBJETS (Fisher-Yates)
                // Comme le flag 'isCorrect' est attaché à l'objet, on ne perd pas l'info !
                for (let i = qcmOptions.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [qcmOptions[i], qcmOptions[j]] = [qcmOptions[j], qcmOptions[i]];
                }
            }

            // F. CONFIG VISUELLE
            let visualData = null;
            const rawVisual = {
                ...(config.common_config?.visual_config_template || {}),
                ...(levelData.visual_config_override || {})
            };
            if (Object.keys(rawVisual).length > 0) {
                try { visualData = JSON.parse(replaceVars(JSON.stringify(rawVisual))); } catch (e) { }
            }

            const customKeyboard = levelData.custom_keyboard || config.common_config?.custom_keyboard;
            const responseType = levelData.response_type || config.response_type || "NUMERIC";

            setQuestionData({
                question: qText,
                explanation: expText,
                correct: correct,
                scope: scope,
                visualConfig: visualData,
                visualEngine: config.visual_engine || "NONE",
                xp_reward: levelData.xp_reward || 5,
                custom_keyboard: customKeyboard,
                responseType: responseType,
                options: qcmOptions // <--- ON ENVOIE ENFIN LES OPTIONS !
            });

        } catch (e) {
            console.error("Erreur génération:", e);
            setError(e.message);
        }
    }, [level]);

    useEffect(() => {
        if (configRef.current) generate();
    }, [generate]);

    return { questionData, regenerate: generate, loading, error };
};