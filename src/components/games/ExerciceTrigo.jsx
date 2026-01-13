import React, { useState, useEffect } from 'react';
import { GameShell } from '../GameShell';
import { TrigoSvg } from './visuals/TrigoSvg';
import { generateTrigoQuestion } from '../../utils/generators/trigo';
import { Icon } from '../UI';
import MathText from '../MathText';
import MathKeyboard from '../MathKeyboard';
import Calculator from '../Calculator'; // <--- L'import vital pour que ça marche

export default function ExerciceTrigo({ level, onBack, onFinish, onSound }) {
    const currentLevel = level || 1;

    // --- ÉTATS DU JEU ---
    const [step, setStep] = useState(0);
    const [score, setScore] = useState(0);
    const [qData, setQData] = useState(null);
    const [userAnswer, setUserAnswer] = useState("");
    const [feedback, setFeedback] = useState(null); // 'CORRECT' | 'WRONG' | null
    const [showKeyboard, setShowKeyboard] = useState(false);
    const [showCalc, setShowCalc] = useState(false); // <--- État pour afficher la calculatrice

    // --- INITIALISATION & GÉNÉRATION ---
    useEffect(() => {
        // On génère une nouvelle question à chaque changement d'étape (step)
        const newData = generateTrigoQuestion({ difficulty: currentLevel });
        setQData(newData);

        // Reset des états pour la nouvelle question
        setFeedback(null);
        setUserAnswer("");
        setShowKeyboard(false);
        setShowCalc(false);
    }, [step, currentLevel]);

    // --- VALIDATION DE LA RÉPONSE ---
    const handleValidate = (answer = userAnswer) => {
        if (!qData || feedback) return; // Empêche le double-clic

        let isCorrect = false;

        // 1. Validation QCM (Comparaison stricte)
        if (qData.responseType === 'QCM') {
            isCorrect = (answer === qData.answer);
        }
        // 2. Validation Numérique (Avec tolérance pour les arrondis)
        else {
            // On remplace la virgule par un point (ex: "12,5" -> "12.5")
            const cleanAnswer = String(answer).replace(',', '.');
            const numUser = parseFloat(cleanAnswer);
            const numCorrect = parseFloat(qData.answer);

            if (!isNaN(numUser) && !isNaN(numCorrect)) {
                // Tolérance de 0.1 (ex: 12.5 acceptée pour 12.53 si consigne souple, ou juste erreur d'arrondi)
                isCorrect = Math.abs(numUser - numCorrect) < 0.1;

                // Si c'est un calcul d'angle, on vérifie l'arrondi entier
                if (!isCorrect && qData.data?.angleUnknown) {
                    isCorrect = Math.round(numUser) === Math.round(numCorrect);
                }
            }
        }

        // Mise à jour du score et feedback
        if (isCorrect) {
            if (onSound) onSound('CORRECT');
            setFeedback('CORRECT');
            setScore(s => s + 1);
        } else {
            if (onSound) onSound('WRONG');
            setFeedback('WRONG');
        }

        // On fige la réponse de l'utilisateur (utile pour le visuel des boutons)
        setUserAnswer(answer);
    };

    // --- PASSAGE À LA SUIVANTE ---
    const handleNext = () => {
        if (step < 9) {
            // On passe à la question suivante (0 à 9 = 10 questions)
            setStep(s => s + 1);
        } else {
            // Fin de l'exercice : on remonte le score final
            if (onFinish) onFinish(score);
        }
    };

    // Protection chargement
    if (!qData) return <div className="min-h-screen flex items-center justify-center text-slate-400">Chargement...</div>;

    return (
        <GameShell
            step={step}
            total={10}
            score={score} // <--- Affiche le score "3 / 10" dans le header
            onBack={onBack}
            title={`Trigonométrie - Niveau ${currentLevel}`}
        >
            <div className="flex flex-col md:flex-row gap-6 items-start justify-center h-full relative">

                {/* --- CALCULATRICE FLOTTANTE (Si activée) --- */}
                {showCalc && (
                    <div className="absolute top-12 right-0 md:right-12 z-[100] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <Calculator onClose={() => setShowCalc(false)} />
                    </div>
                )}

                {/* --- COLONNE GAUCHE : VISUEL SVG --- */}
                <div className="w-full md:w-1/2 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-center min-h-[300px]">
                    <div className="w-full max-w-[350px] aspect-square">
                        <TrigoSvg data={qData.data} />
                    </div>
                </div>

                {/* --- COLONNE DROITE : INTERACTION --- */}
                <div className="w-full md:w-1/2 flex flex-col gap-4">

                    {/* Énoncé de la question */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative">

                        {/* En-tête : Question + Bouton Calculatrice */}
                        <div className="flex justify-between items-start mb-4 gap-4">
                            <h2 className="text-xl font-bold text-slate-800 leading-relaxed">
                                <MathText text={qData.question} />
                            </h2>

                            {/* Le fameux bouton Calculatrice (Uniquement si ce n'est pas un QCM simple) */}
                            {qData.responseType !== 'QCM' && (
                                <button
                                    onClick={() => setShowCalc(!showCalc)}
                                    className={`p-3 rounded-xl border-2 transition-all shrink-0 ${showCalc ? 'bg-indigo-600 text-white border-indigo-600 shadow-inner' : 'bg-white text-indigo-600 border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50 shadow-sm'}`}
                                    title="Ouvrir la calculatrice scientifique"
                                >
                                    <Icon name="calculator" size={24} weight="fill" />
                                </button>
                            )}
                        </div>

                        {/* --- ZONE DE RÉPONSE --- */}
                        {qData.responseType === 'QCM' ? (
                            // MODE QCM : Boutons
                            <div className="grid grid-cols-1 gap-3">
                                {qData.options.map((opt, idx) => {
                                    const isSelected = userAnswer === opt.value;
                                    const isCorrectOpt = opt.value === qData.answer;

                                    // Calcul dynamique des classes CSS (Couleurs)
                                    let btnClass = "bg-white border-2 border-slate-200 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50";
                                    let icon = null;

                                    if (feedback) {
                                        if (isCorrectOpt) {
                                            // La bonne réponse (toujours verte à la fin)
                                            btnClass = "bg-emerald-500 border-emerald-600 text-white shadow-md scale-[1.02]";
                                            icon = <Icon name="check-circle" weight="fill" className="ml-auto text-white" />;
                                        } else if (isSelected) {
                                            // La mauvaise réponse choisie (Rouge)
                                            btnClass = "bg-red-500 border-red-600 text-white opacity-100 shadow-md";
                                            icon = <Icon name="x-circle" weight="fill" className="ml-auto text-white" />;
                                        } else {
                                            // Les autres choix (Grisés)
                                            btnClass = "opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed";
                                        }
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            disabled={feedback !== null} // Désactive après réponse
                                            onClick={() => handleValidate(opt.value)}
                                            className={`p-4 rounded-xl font-bold text-lg text-left transition-all flex items-center ${btnClass}`}
                                        >
                                            <MathText text={opt.value} />
                                            {icon}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            // MODE NUMÉRIQUE : Input + Clavier Virtuel
                            <div className="relative">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        inputMode={showKeyboard ? "none" : "decimal"}
                                        value={userAnswer}
                                        disabled={feedback !== null}
                                        onChange={(e) => setUserAnswer(e.target.value)}
                                        placeholder="Ta réponse..."
                                        className="w-full p-4 text-2xl font-bold text-center border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none disabled:bg-slate-50 transition-colors"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleValidate();
                                        }}
                                    />
                                    {/* Bouton Toggle Clavier Virtuel */}
                                    <button
                                        onClick={() => setShowKeyboard(!showKeyboard)}
                                        className={`p-3 rounded-xl border-2 transition-colors ${showKeyboard ? 'bg-indigo-100 border-indigo-300 text-indigo-600' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                        disabled={feedback !== null}
                                        title="Clavier numérique"
                                    >
                                        <Icon name="keyboard" size={28} weight={showKeyboard ? "fill" : "bold"} />
                                    </button>
                                </div>

                                {/* Clavier Mathématique Virtuel (Slide down) */}
                                {showKeyboard && !feedback && (
                                    <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                                        <MathKeyboard
                                            onKeyPress={(k) => setUserAnswer(prev => prev + k)}
                                            onDelete={() => setUserAnswer(prev => prev.slice(0, -1))}
                                            onClose={() => setShowKeyboard(false)}
                                        />
                                    </div>
                                )}

                                {/* Bouton Valider (si clavier fermé ou non utilisé) */}
                                {!feedback && (
                                    <button
                                        onClick={() => handleValidate()}
                                        disabled={!userAnswer}
                                        className="w-full mt-4 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        Valider <Icon name="check" weight="bold" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* --- FEEDBACK & CORRECTION (S'affiche après validation) --- */}
                    {feedback && (
                        <div className="animate-in fade-in slide-in-from-bottom-4">
                            {/* Bandeau Résultat */}
                            <div className={`p-4 rounded-xl text-center font-bold flex items-center justify-center gap-2 mb-4 ${feedback === 'CORRECT' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                <Icon name={feedback === 'CORRECT' ? 'check-circle' : 'warning-circle'} weight="fill" size={24} />
                                <span>{feedback === 'CORRECT' ? 'Excellent !' : 'Erreur'}</span>
                            </div>

                            {/* Explication détaillée */}
                            <div className="p-5 bg-indigo-50 rounded-xl border border-indigo-100 text-slate-700 leading-relaxed shadow-sm">
                                <div className="font-bold text-indigo-400 text-xs uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <Icon name="info" weight="fill" /> Correction
                                </div>
                                <div className="whitespace-pre-wrap">
                                    <MathText text={qData.explanation} />
                                </div>
                                {qData.correctionDetail && (
                                    <div className="mt-3 text-sm text-indigo-700 font-semibold bg-indigo-100/50 p-3 rounded-lg border border-indigo-100">
                                        💡 {qData.correctionDetail}
                                    </div>
                                )}
                            </div>

                            {/* Bouton Suivant */}
                            <button
                                onClick={handleNext}
                                className="w-full mt-4 bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-transform hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg"
                            >
                                {step < 9 ? "Question Suivante" : "Voir mon score"} <Icon name="arrow-right" weight="bold" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </GameShell>
    );
}