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

    // 1. CHARGEMENT CONFIG (Identique à avant)
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

    // 2. GÉNÉRATEUR MATHÉMATIQUE (AMÉLIORÉ MULTI-PASSES)
    const generate = useCallback(() => {
        const config = configRef.current;
        if (!config) return;

        try {
            const lvlKey = String(level);
            const levelData = config.levels ? (config.levels[lvlKey] || config.levels["1"]) : config;
            if (!levelData) return;

            let scope = {};

            // A. VARIABLES (Pas de dépendances, on calcule direct)
            if (levelData.variables) {
                Object.keys(levelData.variables).forEach(key => {
                    try {
                        scope[key] = math.evaluate(String(levelData.variables[key]));
                    } catch (e) {
                        console.error(`Variable Error [${key}]:`, e.message);
                        scope[key] = 0;
                    }
                });
            }

            // B. CALCULS (AVEC RÉSOLUTION DE DÉPENDANCES)
            if (levelData.calculations) {
                let toCalculate = Object.keys(levelData.calculations);
                let pass = 0;
                let maxPasses = 5; // Sécurité pour éviter boucle infinie

                // On boucle tant qu'il reste des calculs et qu'on n'a pas dépassé la limite
                while (toCalculate.length > 0 && pass < maxPasses) {
                    const nextBatch = []; // Ceux qui échoueront iront ici pour la prochaine passe

                    toCalculate.forEach(key => {
                        try {
                            // On tente de calculer
                            const formula = String(levelData.calculations[key]);
                            scope[key] = math.evaluate(formula, scope);
                        } catch (e) {
                            // Si ça plante (ex: variable manquante), on garde pour la prochaine passe
                            nextBatch.push(key);
                        }
                    });

                    // Si on n'a rien réussi à résoudre de plus dans cette passe, on arrête pour éviter de boucler
                    if (nextBatch.length === toCalculate.length) {
                        console.warn("Dépendances circulaires ou manquantes pour :", nextBatch);
                        // On force des 0 pour éviter le crash total
                        nextBatch.forEach(k => scope[k] = 0);
                        break;
                    }

                    toCalculate = nextBatch;
                    pass++;
                }
            }

            // C. REMPLACEMENT TEXTE & EXPLICATION
            let qText = levelData.question_template || config.question_template || "Calculer :";
            let expText = levelData.explanation_template || config.explanation_template || "";

            // On trie les clés par longueur décroissante pour éviter de remplacer "{c1}" par "{12}" et casser "{c10}"
            const keys = Object.keys(scope).sort((a, b) => b.length - a.length);

            keys.forEach(key => {
                const regex = new RegExp(`{${key}}`, 'g');
                // On arrondit l'affichage si c'est un nombre à virgule trop long
                let val = scope[key];
                if (typeof val === 'number' && !Number.isInteger(val)) {
                    val = Math.round(val * 100) / 100; // Arrondi affichage 2 décimales
                }

                qText = qText.replace(regex, val);
                if (expText) expText = expText.replace(regex, val);
            });

            // D. RÉPONSE (VERSION CORRIGÉE)
            let correct = levelData.correct_answer || config.correct_answer;

            // Si c'est du texte, on remplace toutes les variables {x}, {sum}, etc. par leur valeur
            if (typeof correct === 'string') {
                // 1. On récupère toutes les variables disponibles (x, sum, prod, v...)
                // 2. On trie par longueur décroissante (IMPORTANT : pour ne pas remplacer {xy} par {x}y par erreur)
                const keys = Object.keys(scope).sort((a, b) => b.length - a.length);

                // 3. On remplace chaque {variable} par sa valeur
                keys.forEach(key => {
                    // Crée une "recherche globale" pour remplacer toutes les occurrences
                    const regex = new RegExp(`{${key}}`, 'g');
                    correct = correct.replace(regex, scope[key]);
                });
            }

            // E. CONFIG VISUELLE
            let visualData = null;
            const rawVisual = {
                ...(config.common_config?.visual_config_template || {}),
                ...(levelData.visual_config_override || {})
            };

            if (Object.keys(rawVisual).length > 0) {
                const strConfig = JSON.stringify(rawVisual);
                // Remplacement intelligent
                let injectedStr = strConfig;
                keys.forEach(key => {
                    const regex = new RegExp(`{${key}}`, 'g');
                    injectedStr = injectedStr.replace(regex, scope[key]);
                });

                try {
                    visualData = JSON.parse(injectedStr);
                } catch (e) {
                    console.error("Erreur JSON Visuel", e);
                }
            }

            setQuestionData({
                question: qText,
                explanation: expText,
                correct: correct,
                scope: scope,
                visualConfig: visualData,
                visualEngine: config.visual_engine
            });

        } catch (e) {
            console.error("Erreur génération:", e);
        }
    }, [level]);

    useEffect(() => {
        if (configRef.current) generate();
    }, [generate]);

    return { questionData, regenerate: generate, loading, error };
};