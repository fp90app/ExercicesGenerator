import React, { useState, useEffect, useMemo } from 'react';
import { doc, getDoc } from "firebase/firestore"; // J'ai retiré les imports inutiles
import { db } from "../../firebase";
import * as math from 'mathjs';
import { processLevelData } from '../../utils/mathGenerators';





import { Icon } from '../UI';
import { QUESTIONS_DB } from '../../utils/data'; // Fallback statique
import { QUESTIONS_TABLES, QUESTIONS_DIVISIONS } from '../../utils/data';

// --- NOUVEL IMPORT ---
import { getGenerator } from '../../utils/exerciseMapping';
import { useMathGenerator } from '../../hooks/useMathGenerator';
import MathText from '../MathText';

// --- IMPORTS COMPOSANTS SPÉCIAUX ---
import ExerciceLectureGraphique from '../ExerciceLectureGraphique';
import ExerciceThales from './ExerciceThales';
import ExerciceTableauValeursCourbe from './ExerciceTableauValeursCourbe';
import ExercicePythagore from './ExercicePythagore';
import ScratchScript from './ScratchBlock';

// =========================================================
// 1. NOUVEAU SYSTÈME (Wrapper)
// =========================================================
import PythagoreSystem from '../PythagoreSystem';
import NumberLineSystem from '../NumberLineSystem';
import CartesianSystem from '../CartesianSystem';

// =========================================================
// 1. COMPOSANT PRINCIPAL (Le "Routeur" Intelligent)
// =========================================================
const StandardGame = (props) => {
    const { user, config, onFinish, onBack, onSound } = props;

    // --- A. HOOK DYNAMIQUE ---
    const { questionData, regenerate } = useMathGenerator(config.id, config.level);

    // --- B. ÉTATS DU JEU (Cycle de 10 questions) ---
    const [step, setStep] = useState(0);
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState('playing'); // 'playing' | 'finished'
    const [userAnswer, setUserAnswer] = useState("");
    const [feedback, setFeedback] = useState(null);
    const [showCalc, setShowCalc] = useState(false);

    const [graphPoint, setGraphPoint] = useState(null); // Stocke le point placé par l'élève

    // Reset quand la question change
    useEffect(() => {
        setFeedback(null);
        setUserAnswer("");
        setGraphPoint(null); // On remet à zéro
    }, [questionData]);

    useEffect(() => {
        let timer;
        if (feedback === 'CORRECT' && step < 9) { // On ne le fait pas à la dernière question (pour voir le score)
            timer = setTimeout(() => {
                handleNext();
            }, 1500); // 1500ms = 1.5 secondes d'attente
        }
        return () => clearTimeout(timer); // Nettoyage si on quitte vite
    }, [feedback, step]);

    // Réinitialiser le jeu si on change d'exercice
    useEffect(() => {
        setStep(0);
        setScore(0);
        setGameState('playing');
        setFeedback(null);
        setUserAnswer("");
    }, [config.id]);

    // ... tes useState et useEffect sont ici ...

    // --- CORRECTION : ON PLACE LE useMemo ICI (EN DEHORS DES IF) ---
    const activeVisualConfig = useMemo(() => {
        // Si les données ne sont pas prêtes ou si ce n'est pas le bon moteur, on ne fait rien
        if (!questionData || questionData.visualEngine !== 'ENGINE_CARTESIAN') return null;

        const isGraphMode = questionData.responseType === 'GRAPH_POINT';

        // 1. Points de base (du JSON)
        let pointsToShow = [...(questionData.visualConfig?.points || [])];

        // 2. Point placé par l'élève (Bleu)
        if (graphPoint) {
            pointsToShow.push({
                x: graphPoint.x,
                y: graphPoint.y,
                color: '#3b82f6',
                label: '?',
                shape: 'cross'
            });
        }

        // 3. Correction (Vert) - Uniquement si c'est FAUX et qu'on est en mode graphique
        if (feedback === 'WRONG' && isGraphMode) {
            try {
                const clean = questionData.correct.replace(/[()]/g, '');
                const [cx, cy] = clean.split(';').map(Number);
                if (!isNaN(cx) && !isNaN(cy)) {
                    pointsToShow.push({
                        x: cx,
                        y: cy,
                        color: '#10b981',
                        label: 'Ok',
                        showCorrection: true
                    });
                }
            } catch (e) { }
        }
        return { ...questionData.visualConfig, points: pointsToShow };
    }, [questionData, graphPoint, feedback]);



    // --- ACTIONS ---
    const handleValidate = () => {
        if (!questionData) return;

        // --- 1. FONCTION DE NETTOYAGE ---
        const normalize = (str) => {
            if (!str) return "";
            return String(str)
                .replace(/²/g, '^2')       // Transforme le petit ²
                .replace(/,/g, '.')        // Virgule -> Point
                .replace(/÷/g, '/')        // Signe division
                .replace(/:/g, '/')        // Deux points -> Division
                .replace(/×/g, '*')        // Signe multiplication visuel
                .trim();
        };

        const rawUser = normalize(userAnswer);
        const rawCorrect = normalize(questionData.correct);

        // Version sans espaces pour la comparaison textuelle stricte
        const cleanUserText = rawUser.replace(/\s+/g, '').toLowerCase();
        const cleanCorrectText = rawCorrect.replace(/\s+/g, '').toLowerCase();

        console.log(`Validation : "${cleanUserText}" vs "${cleanCorrectText}"`);

        let isCorrect = false;

        // --- 2. VALIDATION TEXTUELLE (Prioritaire & Rapide) ---
        // Si l'élève a écrit exactement ce qu'on attendait (ex: "x+1")
        if (cleanUserText === cleanCorrectText) {
            isCorrect = true;
        }

        // --- 3. VALIDATION MATHÉMATIQUE (Algèbre & Fractions) ---
        // Gère l'ordre (x+1 = 1+x) et les calculs (5/2 = 2.5)
        else {
            try {
                // Portée élargie pour couvrir toutes les lettres possibles dans tes exos
                const scope = {
                    x: 11.123, y: 11.123, z: 11.123,
                    a: 11.123, b: 11.123, c: 11.123,
                    k: 11.123, n: 11.123, m: 11.123,
                    t: 11.123, u: 11.123, v: 11.123
                };

                // On évalue les deux expressions mathématiquement
                // Cela transforme "5/2" en 2.5 et "x+x" en 22.246
                const valUser = math.evaluate(rawUser, scope);
                const valCorrect = math.evaluate(rawCorrect, scope);

                // Comparaison avec tolérance (0.0001) pour les flottants
                if (Math.abs(valUser - valCorrect) < 0.0001) {
                    isCorrect = true;
                    console.log("Validation mathématique réussie !");
                }
            } catch (e) {
                // Si l'élève écrit une syntaxe invalide (ex: "x++2" ou "3..5")
                // math.evaluate plante, on ignore et isCorrect reste false.
                console.log("Syntaxe mathématique invalide :", e.message);
            }
        }

        // --- 4. GESTION DU RÉSULTAT ---
        if (isCorrect) {
            if (onSound) onSound('CORRECT');
            setFeedback('CORRECT');
            setScore(s => s + 1);
        } else {
            if (onSound) onSound('WRONG');
            setFeedback('WRONG');
        }
    };

    const handleNext = () => {
        setFeedback(null);
        setUserAnswer("");

        if (step < 9) { // 0 à 9 = 10 questions
            setStep(s => s + 1);
            regenerate(); // Nouvelle question
        } else {
            setGameState('finished');
            if (score >= 8 && onSound) onSound('WIN');
            // On envoie aussi la récompense définie dans le JSON
            if (onFinish) onFinish(score, { xp_reward: questionData.xp_reward }); // Sauvegarde
        }
    };


    // --- FONCTION MANQUANTE : GESTION DU CLIC SUR LE GRAPHIQUE ---
    const handleGraphClick = (coords) => {
        if (feedback) return; // On bloque si déjà validé

        // Snap (Arrondi) au 0.5 le plus proche pour éviter les décimales infinies
        const x = Math.round(coords.x * 2) / 2;
        const y = Math.round(coords.y * 2) / 2;

        setGraphPoint({ x, y });

        // Astuce : On remplit automatiquement la réponse texte "(x;y)"
        // Cela permet à ton système de validation existant (handleValidate) de fonctionner sans changement !
        setUserAnswer(`(${x};${y})`);
    };

    // --- C. AFFICHAGE DYNAMIQUE ---
    // --- C. AFFICHAGE DYNAMIQUE ---
    if (questionData) {

        // 1. ÉCRAN DE FIN
        if (gameState === 'finished') {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 animate-in fade-in">
                    <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md w-full border border-slate-200">
                        <div className="text-6xl mb-4">{score >= 8 ? '🏆' : '🎓'}</div>
                        <h2 className="text-3xl font-black text-slate-800 mb-2">Terminé !</h2>
                        <div className={`text-5xl font-black mb-8 ${score >= 8 ? 'text-emerald-500' : 'text-slate-400'}`}>
                            {score}<span className="text-xl text-slate-300">/10</span>
                        </div>
                        <button onClick={onBack} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                            <Icon name="arrow-left" /> Retour
                        </button>
                    </div>
                </div>
            );
        }

        // 2. MOTEUR VISUEL : PYTHAGORE
        if (questionData.visualEngine === 'ENGINE_PYTHAGORE') {
            // ... (Ton code Pythagore existant, ne change rien ici) ...
            return (
                <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row gap-6 items-center justify-center p-4">
                    {/* ... tout le contenu de Pythagore ... */}
                    {/* Je ne le remets pas pour raccourcir, mais GARDE-LE ! */}
                    <div className="w-full md:w-1/2 max-w-md bg-white p-4 rounded-3xl shadow-lg border border-slate-100 flex flex-col min-h-[350px] relative">
                        <div className="flex justify-between items-center px-2 mb-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Question {step + 1} / 10</span>
                            <div className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded text-xs font-bold">Niveau {config.level}</div>
                        </div>
                        <div className="flex-1 flex items-center justify-center">
                            <PythagoreSystem config={questionData.visualConfig} highlight={feedback !== null} />
                        </div>
                    </div>

                    {/* COLONNE DROITE (Copie de ton code actuel) */}
                    <div className="w-full md:w-1/2 max-w-md bg-white p-8 rounded-3xl shadow-xl border border-slate-200 relative">
                        {/* ... Le reste de ton interface Pythagore ... */}
                        {/* Header Question */}
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-xl font-black text-slate-800 leading-tight flex-1">
                                <MathText text={questionData.question} />
                            </h2>
                            <div className="flex gap-2">
                                <button onClick={() => setShowCalc(!showCalc)} className={`p-2 rounded-lg transition-colors ${showCalc ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-500'}`}><Icon name="calculator" weight="fill" /></button>
                                <button onClick={onBack} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Icon name="x" size={24} /></button>
                            </div>
                        </div>
                        {showCalc && <div className="absolute top-20 right-4 z-50 shadow-2xl"><Calculator onClose={() => setShowCalc(false)} /></div>}

                        <div className="mb-6">
                            <input type="number" value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} disabled={feedback !== null} placeholder="Ta réponse..." className={`w-full p-4 text-2xl font-bold text-center rounded-xl border-2 outline-none transition-all ${feedback === 'CORRECT' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : feedback === 'WRONG' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50'}`} onKeyDown={(e) => e.key === 'Enter' && !feedback && userAnswer && handleValidate()} />
                        </div>

                        {feedback && (
                            <div className="animate-in fade-in slide-in-from-bottom-2">
                                <div className={`mb-4 p-4 rounded-xl text-center font-bold flex items-center justify-center gap-2 ${feedback === 'CORRECT' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                    <Icon name={feedback === 'CORRECT' ? 'check-circle' : 'warning-circle'} weight="fill" />
                                    {feedback === 'CORRECT' ? 'Excellent !' : 'Aïe...'}
                                </div>
                                {questionData.explanation && (
                                    <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-sm leading-relaxed">
                                        <div className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-2 flex items-center gap-1"><Icon name="info" weight="fill" /> Correction</div>
                                        <MathText text={questionData.explanation} />
                                    </div>
                                )}
                            </div>
                        )}

                        {!feedback ? (
                            <button onClick={handleValidate} disabled={!userAnswer} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"><Icon name="check" weight="bold" /> Valider</button>
                        ) : (
                            <button onClick={handleNext} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2">{step < 9 ? "Question Suivante" : "Voir mon score"} <Icon name="arrow-right" weight="bold" /></button>
                        )}
                    </div>
                </div>
            );
        }


        else if (questionData.visualEngine === 'ENGINE_NUMBER_LINE') {
            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl bg-white p-6 rounded-3xl shadow-xl border border-slate-200 relative">

                        {/* --- MODIFICATION ICI : Header avec le bouton Fermer intégré --- */}
                        <div className="flex justify-between items-start mb-6 gap-4">
                            <h2 className="text-xl font-black text-slate-800">
                                <MathText text={questionData.question} />
                            </h2>

                            <div className="flex items-center gap-2">
                                {/* Badge Numéro Question */}
                                <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                                    Q{step + 1}/10
                                </div>

                                {/* BOUTON FERMER (Déplacé ici pour ne plus gêner le son) */}
                                <button
                                    onClick={onBack}
                                    className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                >
                                    <Icon name="x" weight="bold" />
                                </button>
                            </div>
                        </div>
                        {/* --------------------------------------------------------- */}

                        {/* VISUEL DROITE GRADUÉE */}
                        <div className="mb-8 h-40">
                            <NumberLineSystem config={questionData.visualConfig} highlight={feedback !== null} />
                        </div>

                        {/* INPUT RÉPONSE */}
                        <div className="flex gap-4 items-center mb-6">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={userAnswer}
                                    onChange={(e) => setUserAnswer(e.target.value)}
                                    disabled={feedback !== null}
                                    autoFocus
                                    placeholder="Abscisse..."
                                    className={`w-full p-4 text-2xl font-bold text-center rounded-xl border-2 outline-none transition-all ${feedback === 'CORRECT' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' :
                                        feedback === 'WRONG' ? 'border-red-500 bg-red-50 text-red-700' :
                                            'border-slate-200 focus:border-indigo-500'
                                        }`}
                                    onKeyDown={(e) => e.key === 'Enter' && !feedback && userAnswer && handleValidate()}
                                />
                            </div>

                            {!feedback ? (
                                <button onClick={handleValidate} disabled={!userAnswer} className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-black transition-all shadow-lg flex items-center gap-2">
                                    <Icon name="check" /> Valider
                                </button>
                            ) : (
                                <button onClick={handleNext} className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2">
                                    Suivant <Icon name="arrow-right" />
                                </button>
                            )}
                        </div>

                        {/* FEEDBACK */}
                        {feedback && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-600">
                                <div className="font-bold mb-1 flex items-center gap-2">
                                    <Icon name="info" /> Correction
                                </div>
                                <MathText text={questionData.explanation} />
                            </div>
                        )}

                        {/* J'AI SUPPRIMÉ L'ANCIEN BOUTON "ABSOLUTE" QUI ÉTAIT ICI */}
                    </div>
                </div>
            );
        }




        else if (questionData.visualEngine === 'ENGINE_CARTESIAN') {

            const isGraphMode = questionData.responseType === 'GRAPH_POINT';

            // On utilise la config calculée tout en haut du fichier !
            // (Plus de useMemo ici, donc plus d'erreur)

            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl bg-white p-6 rounded-3xl shadow-xl border border-slate-200 relative">

                        {/* EN-TÊTE */}
                        <div className="flex justify-between items-start mb-6 gap-4">
                            <div>
                                {isGraphMode && <div className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">Interactif</div>}
                                <h2 className="text-xl font-black text-slate-800"><MathText text={questionData.question} /></h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">Q{step + 1}/10</div>
                                <button onClick={onBack} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 rounded-full"><Icon name="x" weight="bold" /></button>
                            </div>
                        </div>

                        {/* GRAPHIQUE */}
                        <div className="mb-6 flex justify-center relative">
                            <div className="w-full max-w-[400px]">
                                <CartesianSystem
                                    config={activeVisualConfig}
                                    onClick={isGraphMode ? handleGraphClick : null}
                                />
                            </div>
                            {isGraphMode && !graphPoint && !feedback && (
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600/90 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg animate-bounce pointer-events-none">
                                    Clique sur le repère
                                </div>
                            )}
                        </div>

                        {/* ZONE DE RÉPONSE */}
                        {isGraphMode ? (
                            <div className="mb-6">
                                <p className="text-center text-sm text-slate-500 mb-4 font-bold h-6 transition-all">
                                    {graphPoint ? (
                                        <span className="text-indigo-600 flex items-center justify-center gap-2">
                                            <Icon name="map-pin" weight="fill" /> Point placé !
                                        </span>
                                    ) : (
                                        <span className="opacity-50">Clique sur le graphique pour placer le point</span>
                                    )}
                                </p>
                                {!feedback ? (
                                    <button onClick={handleValidate} disabled={!graphPoint} className="w-full bg-slate-900 text-white px-6 py-4 rounded-xl font-bold hover:bg-black flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                                        <Icon name="check" weight="bold" /> Valider
                                    </button>
                                ) : (
                                    <button onClick={handleNext} className="w-full bg-indigo-600 text-white px-6 py-4 rounded-xl font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-lg">
                                        Suivant <Icon name="arrow-right" weight="bold" />
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="flex gap-4 items-center mb-6">
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        value={userAnswer}
                                        onChange={(e) => setUserAnswer(e.target.value)}
                                        disabled={feedback !== null}
                                        autoFocus
                                        placeholder="Ex: (2;-3)"
                                        className={`w-full p-4 text-2xl font-bold text-center rounded-xl border-2 outline-none transition-all shadow-sm ${feedback === 'CORRECT' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' :
                                            feedback === 'WRONG' ? 'border-red-500 bg-red-50 text-red-700' :
                                                'border-slate-300 bg-slate-50 text-slate-800 focus:border-indigo-600'
                                            }`}
                                        onKeyDown={(e) => e.key === 'Enter' && !feedback && userAnswer && handleValidate()}
                                    />
                                </div>
                                {!feedback ? (
                                    <button onClick={handleValidate} disabled={!userAnswer} className="bg-slate-900 text-white px-6 py-4 rounded-xl font-bold hover:bg-black flex items-center gap-2 shadow-lg"><Icon name="check" /></button>
                                ) : (
                                    <button onClick={handleNext} className="bg-indigo-600 text-white px-6 py-4 rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-lg"><Icon name="arrow-right" /></button>
                                )}
                            </div>
                        )}

                        {/* FEEDBACK */}
                        {feedback && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-600">
                                <div className={`font-bold mb-1 flex items-center gap-2 ${feedback === 'CORRECT' ? 'text-emerald-600' : 'text-red-500'}`}>
                                    <Icon name={feedback === 'CORRECT' ? 'check-circle' : 'warning'} weight="fill" />
                                    {feedback === 'CORRECT' ? 'Bonne réponse !' : 'Erreur...'}
                                </div>
                                <MathText text={questionData.explanation} />
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        // 3. [NOUVEAU] MOTEUR GÉNÉRIQUE (Pour Carrés Parfaits et les autres)
        // C'est ce bloc qui va empêcher le crash !
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">

                {/* BARRE DE PROGRESSION */}
                <div className="fixed top-0 left-0 w-full h-2 bg-slate-200">
                    <div className="h-full bg-indigo-600 transition-all" style={{ width: `${(step / 10) * 100}%` }}></div>
                </div>

                <div className="w-full max-w-lg bg-white p-8 rounded-3xl shadow-xl border border-slate-200 relative">

                    {/* EN-TÊTE */}
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Question {step + 1} / 10</div>

                            {/* --- MODIFICATION 1 : AJOUT DE 'whitespace-pre-line' POUR LE RETOUR À LA LIGNE --- */}
                            <h2 className="text-2xl font-black text-slate-800 leading-tight whitespace-pre-line">
                                <MathText text={questionData.question} />
                            </h2>
                        </div>
                        <button onClick={onBack} className="w-10 h-10 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full flex items-center justify-center transition-colors">
                            <Icon name="x" weight="bold" />
                        </button>
                    </div>

                    {questionData.responseType === 'QCM' ? (
                        // --- MODE QCM (Validation par Booléen) ---
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
                            {questionData.options?.map((optionObj, idx) => {
                                // ATTENTION : optionObj est maintenant un objet { value: "...", isCorrect: true/false }

                                const isCorrect = optionObj.isCorrect;
                                // On compare simplement si l'utilisateur a cliqué sur CE bouton précis
                                const isSelected = userAnswer === optionObj.value;

                                let btnClass = "bg-white border-2 border-slate-200 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-md hover:-translate-y-0.5";
                                let icon = null;

                                if (feedback) {
                                    if (isCorrect) {
                                        // C'est le bouton gagnant -> VERT
                                        btnClass = "bg-emerald-500 border-emerald-600 text-white shadow-md scale-[1.02]";
                                        icon = <Icon name="check-circle" weight="fill" className="text-white ml-2" />;
                                    } else if (isSelected) {
                                        // J'ai cliqué ici mais c'était pas ça (puisque sinon je serais dans le if du dessus) -> ROUGE
                                        btnClass = "bg-red-500 border-red-600 text-white shadow-md opacity-100";
                                        icon = <Icon name="x-circle" weight="fill" className="text-white ml-2" />;
                                    } else {
                                        btnClass = "opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed";
                                    }
                                }

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            if (!feedback) {
                                                setUserAnswer(optionObj.value); // On garde le texte pour l'affichage éventuel

                                                // VALIDATION ULTRA SIMPLE
                                                if (isCorrect) {
                                                    if (onSound) onSound('CORRECT');
                                                    setFeedback('CORRECT');
                                                    setScore(s => s + 1);
                                                } else {
                                                    if (onSound) onSound('WRONG');
                                                    setFeedback('WRONG');
                                                }
                                            }
                                        }}
                                        disabled={feedback !== null}
                                        className={`p-4 rounded-xl font-bold text-base md:text-lg transition-all flex items-center justify-between group text-left ${btnClass}`}
                                    >
                                        {/* On affiche la valeur contenue dans l'objet */}
                                        <div className="w-full flex items-center justify-center md:justify-start">
                                            <MathText text={optionObj.value} />
                                        </div>
                                        <div className="flex-shrink-0 ml-2">
                                            {icon}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        // --- MODE CLAVIER VIRTUEL (Pour les autres exos) ---
                        <>
                            <div className="mt-4 mb-2 animate-in slide-in-from-bottom-4 fade-in duration-500 w-full max-w-4xl mx-auto">
                                <div className="flex flex-col md:flex-row gap-3">
                                    {/* ZONE 1 : CHIFFRES */}
                                    <div className="grid grid-cols-4 gap-1.5 p-2 bg-slate-100 rounded-xl border border-slate-200 shadow-sm md:w-1/2">
                                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '(', ')'].map(num => (
                                            <button
                                                key={num}
                                                onClick={() => setUserAnswer(prev => prev + num)}
                                                disabled={feedback !== null}
                                                className="h-12 bg-white rounded-lg shadow-sm border-b-2 border-slate-200 font-black text-slate-700 text-xl active:border-b-0 active:translate-y-[2px] transition-all hover:bg-slate-50 disabled:opacity-50"
                                            >
                                                {num}
                                            </button>
                                        ))}
                                    </div>

                                    {/* ZONE 2 : ALGÈBRE */}
                                    <div className="flex-1 p-2 bg-indigo-50 rounded-xl border border-indigo-100 shadow-sm md:w-1/2">
                                        <div className="grid grid-cols-5 gap-1">
                                            {((config?.common_config?.custom_keyboard) || (questionData?.custom_keyboard) || ['x', 'y', 'a', 'b', 't', '+', '-', '/', '*', '²', '^']).map(char => (
                                                <button
                                                    key={char}
                                                    onClick={() => setUserAnswer(prev => prev + char)}
                                                    disabled={feedback !== null}
                                                    className="h-12 bg-white rounded-lg shadow-sm border-b-2 border-indigo-200 font-bold text-indigo-600 text-lg active:border-b-0 active:translate-y-[2px] transition-all hover:bg-indigo-50 disabled:opacity-50"
                                                >
                                                    {char}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => setUserAnswer(prev => prev.slice(0, -1))}
                                                disabled={feedback !== null}
                                                className="h-12 bg-red-100 rounded-lg shadow-sm border-b-2 border-red-200 text-red-500 active:border-b-0 active:translate-y-[2px] transition-all hover:bg-red-200 flex items-center justify-center disabled:opacity-50 col-span-1"
                                            >
                                                <Icon name="backspace" weight="bold" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-8">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={userAnswer}
                                    onChange={(e) => setUserAnswer(e.target.value)}
                                    disabled={feedback !== null}
                                    autoFocus
                                    placeholder="Votre réponse..."
                                    className={`w-full p-5 text-3xl font-bold text-center rounded-2xl border-2 outline-none transition-all shadow-sm ${feedback === 'CORRECT' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : feedback === 'WRONG' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 text-slate-700'}`}
                                    onKeyDown={(e) => e.key === 'Enter' && !feedback && userAnswer && handleValidate()}
                                />
                            </div>
                        </>
                    )}

                    {/* FEEDBACK & CORRECTION */}
                    {feedback && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 mb-6">
                            <div className={`p-4 rounded-xl text-center font-bold flex items-center justify-center gap-2 mb-4 ${feedback === 'CORRECT' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                <Icon name={feedback === 'CORRECT' ? 'check-circle' : 'warning-circle'} weight="fill" size={24} />
                                <span className="text-lg">{feedback === 'CORRECT' ? 'Excellent !' : 'Aïe...'}</span>
                            </div>

                            {questionData.explanation && (
                                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed text-left">
                                    <div className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <Icon name="info" weight="fill" /> Correction
                                    </div>
                                    <div className="text-sm md:text-base">
                                        <MathText text={questionData.explanation} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* BOUTON D'ACTION (SUIVANT SEULEMENT) */}
                    {/* On cache le bouton Valider si on est en QCM car c'est automatique */}
                    {(!feedback && questionData.responseType !== 'QCM') ? (
                        <button
                            onClick={handleValidate}
                            disabled={!userAnswer}
                            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-black transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            <Icon name="check" weight="bold" /> Valider
                        </button>
                    ) : (
                        // Bouton SUIVANT (s'affiche si feedback existe OU si on a fini)
                        feedback && (
                            <button
                                onClick={handleNext}
                                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 hover:-translate-y-1 flex items-center justify-center gap-2"
                            >
                                {step < 9 ? "Question Suivante" : "Voir mon score"} <Icon name="arrow-right" weight="bold" />
                            </button>
                        )
                    )}
                </div>
            </div>
        );
    }

    // D. SINON, ON LANCE L'ANCIEN SYSTÈME (Legacy)
    return <LegacyStandardGame {...props} />;
};

// =========================================================
// 2. VOTRE ANCIEN CODE (Juste renommé)
// =========================================================

const LegacyStandardGame = ({ user, config, onFinish, onBack, onSound }) => {

    const { questionData, regenerate } = useMathGenerator(config.id, config.level);

    // Si le hook a réussi à générer une question, on affiche l'interface DYNAMIQUE
    if (questionData) {

        // C'est ici qu'on redirigera plus tard vers vos vrais composants visuels (PythagoreSystem)
        // Pour l'instant, on affiche un écran de DEBUG pour vérifier que les calculs sont bons.
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full border-2 border-indigo-100">
                    <h1 className="text-2xl font-black text-indigo-600 mb-6 flex items-center gap-2">
                        <Icon name="lightning" weight="fill" /> Moteur Dynamique
                    </h1>

                    <div className="space-y-4 mb-6">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Question générée</div>
                            <div className="text-lg font-bold text-slate-800">{questionData.question}</div>
                        </div>

                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                            <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Réponse attendue</div>
                            <div className="text-xl font-black text-emerald-800">{questionData.correct}</div>
                        </div>

                        {/* Ce bloc montre les données qui seront envoyées à votre composant PythagoreSystem */}
                        <div className="bg-slate-900 p-4 rounded-xl text-xs font-mono text-green-400 overflow-auto">
                            <div>// Config Visuelle calculée :</div>
                            {JSON.stringify(questionData.visualConfig, null, 2)}
                        </div>
                    </div>

                    <button
                        onClick={regenerate}
                        className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 hover:-translate-y-1 mb-3"
                    >
                        Générer une variante
                    </button>

                    <button onClick={onBack} className="w-full text-slate-400 font-bold hover:text-slate-600 py-2">
                        Retour au menu
                    </button>
                </div>
            </div>
        );
    }
    // 1. On récupère la configuration depuis le mapping
    const mappedConfig = getGenerator(config.id);

    // =========================================================
    // A. ROUTAGE VERS MOTEURS SPÉCIAUX (VISUELS)
    // =========================================================
    // Si le mapping renvoie une "String", c'est un moteur spécial
    if (mappedConfig === 'ENGINE_PYTHAGORE') {
        return <div className="min-h-screen bg-slate-50 relative pt-10"><ExercicePythagore user={user} level={config.level} onFinish={onFinish} onQuit={onBack} onSound={onSound} /></div>;
    }
    if (mappedConfig === 'ENGINE_THALES') {
        return <div className="min-h-screen bg-slate-50 relative pt-10"><ExerciceThales user={user} level={config.level} onFinish={onFinish} onQuit={onBack} onSound={onSound} /></div>;
    }
    if (mappedConfig === 'ENGINE_GRAPH_READING') {
        return <div className="min-h-screen bg-slate-50 relative pt-10"><ExerciceLectureGraphique user={user} level={config.level} onFinish={onFinish} onQuit={onBack} onSound={onSound} /></div>;
    }
    if (mappedConfig === 'ENGINE_TABLE_CURVE') {
        return <div className="min-h-screen bg-slate-50 relative pt-10"><ExerciceTableauValeursCourbe user={user} level={config.level} onFinish={(s) => onFinish(s)} onQuit={onBack} onSound={onSound} /></div>;
    }

    // =========================================================
    // B. JEU STANDARD (GÉNÉRATEURS & SCRATCH)
    // =========================================================
    const [questions, setQuestions] = useState([]);
    const [current, setCurrent] = useState(0);
    const [score, setScore] = useState(0);
    const [finished, setFinished] = useState(false);
    const [selected, setSelected] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        const initGame = async () => {
            let pool = [];

            // CAS 1 : C'est un générateur (Fonction)
            if (typeof mappedConfig === 'function') {
                try {
                    const params = { level: config.level };
                    for (let i = 0; i < 10; i++) {
                        pool.push(mappedConfig(params));
                    }
                } catch (e) {
                    console.error("Erreur générateur pour " + config.id, e);
                }
            }

            // CAS 2 : Mode Tables / Divisions (Legacy)
            else if (config.mode === 'FREE_MIX') {
                const { tables, modes } = config.id;
                if (modes.mul) tables.forEach(t => { if (QUESTIONS_TABLES[t]) pool = [...pool, ...QUESTIONS_TABLES[t]]; });
                if (modes.div) tables.forEach(t => { if (QUESTIONS_DIVISIONS[t]) pool = [...pool, ...QUESTIONS_DIVISIONS[t]]; });
            }
            else if (config.mode && (config.mode.includes('TABLES') || config.mode.includes('DIVISIONS'))) {
                const SOURCE = config.mode.includes('DIVISIONS') ? QUESTIONS_DIVISIONS : QUESTIONS_TABLES;
                if (Array.isArray(config.id)) {
                    config.id.forEach(tId => { if (SOURCE[tId]) pool = [...pool, ...SOURCE[tId]]; });
                } else {
                    if (SOURCE[config.id]) pool = [...SOURCE[config.id]];
                }
            }

            // CAS 3 : Fallback (Base de données statique)
            else if (pool.length === 0) {
                pool = QUESTIONS_DB[config.id]?.[config.level] || [];
            }

            // PRÉPARATION DES QUESTIONS
            if (pool && pool.length > 0) {
                const qList = [...pool]
                    .sort(() => 0.5 - Math.random())
                    .slice(0, 10)
                    .map(q => {
                        const answers = [...q.o];
                        const correct = answers[0];
                        return {
                            ...q,
                            mixedAnswers: answers.sort(() => 0.5 - Math.random()),
                            correctIndex: -1,
                            correctTxt: correct
                        };
                    });

                qList.forEach(q => q.correctIndex = q.mixedAnswers.indexOf(q.correctTxt));
                setQuestions(qList);
            } else {
                setQuestions([]);
            }
        };
        initGame();
    }, [config, mappedConfig]);

    const handleAnswer = (idx) => {
        if (feedback) return;
        setSelected(idx);

        const clickedValue = q.mixedAnswers[idx];
        const isCorrect = clickedValue === q.correctTxt;

        if (isCorrect) {
            setScore(s => s + 1);
            onSound('CORRECT');
            setFeedback({
                type: 'CORRECT',
                msg: `Bravo ! ${q.e || ""}`
            });
            setTimeout(nextQuestion, 1000); // Un peu plus de temps pour lire si besoin
        } else {
            onSound('WRONG');
            let errorMsg = q.e || "";
            // Si une explication spécifique existe pour ce piège (défini dans mathGenerators)
            if (q.detailedFeedback && q.detailedFeedback[clickedValue]) {
                errorMsg = q.detailedFeedback[clickedValue];
            }

            // --- C'EST ICI QUE CA SE JOUE ---
            // On ajoute explicitement la bonne réponse dans le message
            setFeedback({
                type: 'WRONG',
                msg: `Perdu... La bonne réponse était : ${q.correctTxt}\n\n${errorMsg}`
            });
        }
    };
    const nextQuestion = () => {
        if (current < questions.length - 1) { setCurrent(c => c + 1); setSelected(null); setFeedback(null); }
        else {
            setFinished(true);
            const threshold = (config.mode.includes('TABLES') || config.mode.includes('DIVISIONS')) ? 9 : 8;
            if (score + (selected === questions[current]?.correctIndex ? 1 : 0) >= threshold) {
                setShowConfetti(true);
                onSound('WIN');
            }
        }
    };

    if (questions.length === 0) return <div className="p-8 text-center font-bold text-slate-500">Chargement ou exercice vide... <button onClick={onBack} className="block mt-4 mx-auto text-indigo-600">Retour</button></div>;

    if (finished) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 relative overflow-hidden">
                {showConfetti && <div className="absolute inset-0 pointer-events-none flex justify-center">{Array(20).fill(0).map((_, i) => <div key={i} className="confetti" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random()}s`, backgroundColor: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'][Math.floor(Math.random() * 4)] }}></div>)}</div>}
                <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-md w-full pop-in z-10">
                    <div className="text-6xl mb-4">{score >= 8 ? '🎉' : '😕'}</div>
                    <h2 className="text-3xl font-black text-slate-800 mb-2">Terminé !</h2>
                    <div className={`text-5xl font-black mb-8 ${score >= 8 ? 'text-emerald-500' : 'text-slate-300'}`}>{score}<span className="text-xl text-slate-300">/10</span></div>
                    <button onClick={() => onFinish(score)} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-transform hover:scale-105">Continuer</button>
                </div>
            </div>
        );
    }

    const q = questions[current];
    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <div className="w-full h-2 bg-slate-200"><div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${((current + (selected !== null ? 1 : 0)) / questions.length) * 100}%` }}></div></div>
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="max-w-lg w-full">
                    <div className="flex justify-between mb-6 px-2">
                        <span className="font-bold text-slate-400 text-sm">Q {current + 1} / 10</span>
                        <button onClick={onBack} className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-red-500">
                            {/* ICONE CROIX (Phosphor: "x") */}
                            <Icon name="x" />
                        </button>
                    </div>
                    <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-lg border border-slate-100">
                        <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center leading-relaxed">{q.q}</h2>

                        {/* --- AJOUT POUR LE MODULE MOYENNES (Tableaux) --- */}
                        {q.tableData && (
                            <div className="flex justify-center mb-8">
                                <div className="overflow-hidden border-2 border-slate-200 rounded-xl shadow-sm">
                                    <table className="text-sm md:text-base bg-white">
                                        <thead className="bg-indigo-50 text-indigo-900 border-b border-indigo-100">
                                            <tr>
                                                {q.tableData.headers.map((h, i) => (
                                                    <th key={i} className={`p-3 md:p-4 font-bold ${i === 0 ? 'border-r border-indigo-100' : ''}`}>
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {q.tableData.rows.map((row, i) => (
                                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                    {row.map((cell, j) => (
                                                        <td key={j} className={`p-3 md:p-4 text-center font-mono font-bold text-slate-700 ${j === 0 ? 'border-r border-slate-100' : ''}`}>
                                                            {cell}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* --- FIN AJOUT --- */}
                        {/* AJOUT : Affichage Scratch si disponible */}
                        {/* NOUVEAU BLOC : AFFICHAGE SCRATCH + AIDE LATÉRALE */}
                        {q.scratchBlocks && (
                            // Conteneur principal : Si showAxes est vrai, on passe en mode "row" (horizontal) avec un espace (gap-8)
                            // Sinon, on reste centré normalement.
                            <div className={`flex ${q.showAxes ? 'flex-col md:flex-row gap-8 items-center md:items-start justify-center' : 'justify-center'} mb-8`}>

                                {/* COLONNE GAUCHE : Les blocs Scratch */}
                                {/* Si aide affichée, on pousse les blocs vers la droite (justify-end) pour les coller à l'aide */}
                                <div className={q.showAxes ? 'flex-none md:flex-1 flex justify-center md:justify-end' : ''}>
                                    <ScratchScript blocks={q.scratchBlocks} />
                                </div>

                                {/* COLONNE DROITE : Aide visuelle (seulement si showAxes est true) */}
                                {q.showAxes && (
                                    <div className="flex-none md:flex-1 flex justify-center md:justify-start pt-4">
                                        {/* SVG de la Rose des vents */}
                                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center">
                                            <p className="text-xs text-slate-500 font-bold mb-3 uppercase tracking-wider">Orientation</p>
                                            <svg width="140" height="140" viewBox="0 0 140 140" className="overflow-visible">
                                                <defs>
                                                    <marker id="arrowGray" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                                                        <path d="M0,0 L0,6 L9,3 z" fill="#94a3b8" />
                                                    </marker>
                                                </defs>

                                                {/* Cercle central */}
                                                <circle cx="70" cy="70" r="60" stroke="#e2e8f0" strokeWidth="1" fill="none" opacity="0.5" />
                                                <circle cx="70" cy="70" r="4" fill="#64748b" />

                                                {/* HAUT (0°) - Bleu */}
                                                <line x1="70" y1="70" x2="70" y2="20" stroke="#3b82f6" strokeWidth="3" markerEnd="url(#arrowGray)" />
                                                <text x="70" y="12" fill="#3b82f6" fontSize="12" fontWeight="bold" textAnchor="middle">0° (Haut)</text>

                                                {/* BAS (180°) - Bleu */}
                                                <line x1="70" y1="70" x2="70" y2="120" stroke="#3b82f6" strokeWidth="3" markerEnd="url(#arrowGray)" />
                                                <text x="70" y="135" fill="#3b82f6" fontSize="12" fontWeight="bold" textAnchor="middle">180° (Bas)</text>

                                                {/* DROITE (90°) - Rouge */}
                                                <line x1="70" y1="70" x2="120" y2="70" stroke="#ef4444" strokeWidth="3" markerEnd="url(#arrowGray)" />
                                                <text x="138" y="74" fill="#ef4444" fontSize="12" fontWeight="bold" textAnchor="start">90°</text>
                                                <text x="138" y="86" fill="#ef4444" fontSize="10" textAnchor="start">(Droite)</text>

                                                {/* GAUCHE (-90°) - Rouge */}
                                                <line x1="70" y1="70" x2="20" y2="70" stroke="#ef4444" strokeWidth="3" markerEnd="url(#arrowGray)" />
                                                <text x="2" y="74" fill="#ef4444" fontSize="12" fontWeight="bold" textAnchor="end">-90°</text>
                                                <text x="2" y="86" fill="#ef4444" fontSize="10" textAnchor="end">(Gauche)</text>
                                            </svg>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {/* FIN DU NOUVEAU BLOC */}
                        {/* --- DÉBUT DU NOUVEAU BLOC BOUTONS --- */}
                        <div className="grid grid-cols-1 gap-4">
                            {q.mixedAnswers.map((answerTxt, idx) => {
                                // ETATS LOGIQUES
                                const hasAnswered = feedback !== null; // A-t-on fini de répondre ?
                                const isCorrectBtn = idx === q.correctIndex; // Est-ce le bouton VRAI ?
                                const isSelectedBtn = idx === selected; // Est-ce le bouton CLIQUÉ ?

                                // STYLE DE BASE (Neutre)
                                let baseStyle = "w-full p-4 text-lg font-bold rounded-xl border-2 transition-all duration-200 shadow-sm flex items-center justify-between text-left relative overflow-hidden";
                                let dynamicStyle = "";

                                if (hasAnswered) {
                                    // --- MODE RÉSULTAT (Après clic) ---
                                    if (isCorrectBtn) {
                                        // C'est la bonne réponse (qu'on l'ait trouvée ou non) -> VERT
                                        dynamicStyle = "bg-emerald-500 border-emerald-600 text-white scale-[1.02] shadow-md z-10";
                                    }
                                    else if (isSelectedBtn && !isCorrectBtn) {
                                        // C'est ma réponse et elle est fausse -> ROUGE
                                        dynamicStyle = "bg-red-500 border-red-600 text-white opacity-100 shadow-md";
                                    }
                                    else {
                                        // Les autres réponses fausses -> GRISÉES
                                        dynamicStyle = "bg-slate-50 border-slate-100 text-slate-300 opacity-50 cursor-not-allowed";
                                    }
                                } else {
                                    // --- MODE JEU (Avant clic) ---
                                    // Blanc, devient bleu clair au survol
                                    dynamicStyle = "bg-white border-slate-100 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]";
                                }

                                return (
                                    <button
                                        key={`${current}-${idx}`}
                                        className={`${baseStyle} ${dynamicStyle}`}
                                        onClick={() => handleAnswer(idx)}
                                        disabled={hasAnswered} // On désactive les clics après la réponse
                                    >
                                        {/* TEXTE DE LA RÉPONSE (Gère le HTML simple comme les exposants si besoin) */}
                                        <span dangerouslySetInnerHTML={{ __html: answerTxt }}></span>

                                        {/* ICÔNES DE FEEDBACK (S'affichent uniquement à la fin) */}
                                        {hasAnswered && isCorrectBtn && (
                                            <span className="bg-white text-emerald-500 rounded-full p-1 ml-3 animate-bounce">
                                                <Icon name="check" weight="bold" />
                                            </span>
                                        )}
                                        {hasAnswered && isSelectedBtn && !isCorrectBtn && (
                                            <span className="bg-white text-red-500 rounded-full p-1 ml-3 animate-pulse">
                                                <Icon name="x" weight="bold" />
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        {/* --- FIN DU NOUVEAU BLOC BOUTONS --- */}
                        {feedback && (
                            <div className="mt-6 fade-in">
                                <div
                                    className={`p-4 rounded-xl border shadow-sm mb-4 ${feedback.type === 'CORRECT'
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                        : 'bg-red-50 border-red-200 text-red-800'
                                        } text-center font-bold text-lg`}

                                    // C'est cette ligne qui permet d'interpréter le <span> et la couleur
                                    dangerouslySetInnerHTML={{ __html: feedback.msg.replace(/\n/g, '<br/>') }}
                                />
                                {/* VISUEL D'AIDE POUR LES AXES */}
                                {q.showAxes && feedback.type === 'WRONG' && (
                                    <div className="mb-6 p-4 bg-white rounded-xl border border-slate-200 flex flex-col items-center">
                                        <p className="text-sm text-slate-500 font-bold mb-2">Rappel du repère (x; y)</p>
                                        {/* J'ai agrandi le viewBox pour avoir la place pour 1, 2 et 3 */}
                                        <svg width="260" height="200" viewBox="0 0 260 200" className="overflow-visible">
                                            <defs>
                                                <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                                                    <path d="M0,0 L0,6 L9,3 z" fill="#475569" />
                                                </marker>
                                            </defs>

                                            {/* Grille légère de fond (Centre à 130, 100) */}
                                            <path d="M 130 0 L 130 200 M 0 100 L 260 100" stroke="#f1f5f9" strokeWidth="1" />

                                            {/* --- AXE X (Horizontal) --- */}
                                            <line x1="10" y1="100" x2="250" y2="100" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrow)" />
                                            <text x="255" y="104" fill="#ef4444" fontSize="14" fontWeight="bold">x</text>

                                            {/* Graduations X (Pas de 30px) */}
                                            {/* Positifs */}
                                            <line x1="160" y1="97" x2="160" y2="103" stroke="#ef4444" strokeWidth="2" />
                                            <text x="157" y="115" fill="#ef4444" fontSize="10" fontWeight="bold">1</text>
                                            <line x1="190" y1="97" x2="190" y2="103" stroke="#ef4444" strokeWidth="1" opacity="0.5" />
                                            <text x="187" y="115" fill="#ef4444" fontSize="10" opacity="0.7">2</text>
                                            <line x1="220" y1="97" x2="220" y2="103" stroke="#ef4444" strokeWidth="1" opacity="0.5" />
                                            <text x="217" y="115" fill="#ef4444" fontSize="10" opacity="0.7">3</text>

                                            {/* Négatifs */}
                                            <line x1="100" y1="97" x2="100" y2="103" stroke="#ef4444" strokeWidth="2" />
                                            <text x="94" y="115" fill="#ef4444" fontSize="10" fontWeight="bold">-1</text>
                                            <line x1="70" y1="97" x2="70" y2="103" stroke="#ef4444" strokeWidth="1" opacity="0.5" />
                                            <text x="64" y="115" fill="#ef4444" fontSize="10" opacity="0.7">-2</text>
                                            <line x1="40" y1="97" x2="40" y2="103" stroke="#ef4444" strokeWidth="1" opacity="0.5" />
                                            <text x="34" y="115" fill="#ef4444" fontSize="10" opacity="0.7">-3</text>


                                            {/* --- AXE Y (Vertical) --- */}
                                            <line x1="130" y1="190" x2="130" y2="10" stroke="#3b82f6" strokeWidth="2" markerEnd="url(#arrow)" />
                                            <text x="135" y="15" fill="#3b82f6" fontSize="14" fontWeight="bold">y</text>

                                            {/* Graduations Y (Pas de 30px) */}
                                            {/* Positifs (Vers le haut) */}
                                            <line x1="127" y1="70" x2="133" y2="70" stroke="#3b82f6" strokeWidth="2" />
                                            <text x="115" y="74" fill="#3b82f6" fontSize="10" fontWeight="bold">1</text>
                                            <line x1="127" y1="40" x2="133" y2="40" stroke="#3b82f6" strokeWidth="1" opacity="0.5" />
                                            <text x="115" y="44" fill="#3b82f6" fontSize="10" opacity="0.7">2</text>
                                            <line x1="127" y1="10" x2="133" y2="10" stroke="#3b82f6" strokeWidth="1" opacity="0.5" />
                                            <text x="115" y="14" fill="#3b82f6" fontSize="10" opacity="0.7">3</text>

                                            {/* Négatifs (Vers le bas) */}
                                            <line x1="127" y1="130" x2="133" y2="130" stroke="#3b82f6" strokeWidth="2" />
                                            <text x="110" y="134" fill="#3b82f6" fontSize="10" fontWeight="bold">-1</text>
                                            <line x1="127" y1="160" x2="133" y2="160" stroke="#3b82f6" strokeWidth="1" opacity="0.5" />
                                            <text x="110" y="164" fill="#3b82f6" fontSize="10" opacity="0.7">-2</text>
                                            <line x1="127" y1="190" x2="133" y2="190" stroke="#3b82f6" strokeWidth="1" opacity="0.5" />
                                            <text x="110" y="194" fill="#3b82f6" fontSize="10" opacity="0.7">-3</text>

                                            {/* Zéro (Origine) */}
                                            <text x="135" y="115" fill="#94a3b8" fontSize="10">0</text>
                                        </svg>
                                        <p className="text-xs text-slate-400 mt-2 text-center italic">
                                            La flèche indique le sens positif.<br />
                                            Exemple : x=3 est 3 pas à droite, x=-3 est 3 pas à gauche.
                                        </p>
                                    </div>
                                )}
                                {/* On affiche le bouton SUIVANT si c'est FAUX (pour laisser le temps de lire) 
            OU si c'est la dernière question pour finir proprement */}
                                {(feedback.type === 'WRONG' || current === questions.length - 1) && (
                                    <button
                                        onClick={nextQuestion}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                                    >
                                        <span>{current === questions.length - 1 ? "Voir les résultats" : "Question suivante"}</span>
                                        <Icon name="arrow-right" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StandardGame;