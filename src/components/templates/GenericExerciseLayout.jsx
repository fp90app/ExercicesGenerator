import React, { useState, useEffect } from 'react';
import GameShell from '../GameShell';
import { Icon } from '../UI';
import { areValuesEqual } from '../../utils/mathEngine';

/**
 * Layout Générique pour tous les exercices.
 */
export default function GenericExerciseLayout({
    title,
    generator,
    VisualComponent,
    InputComponent,
    options = { questionCount: 5 },
    onBack, // <--- Prop pour gérer le retour
    onQuit
}) {
    // État du jeu
    const [currentStep, setCurrentStep] = useState(0);
    const [score, setScore] = useState(0);
    const [gameState, setGameState] = useState('PLAYING'); // 'PLAYING', 'FEEDBACK', 'FINISHED'

    // État de la question courante
    const [currentData, setCurrentData] = useState(null);
    const [userAnswer, setUserAnswer] = useState('');
    const [feedback, setFeedback] = useState(null);

    // Initialisation / Changement de question
    useEffect(() => {
        if (gameState === 'PLAYING') {
            loadNewQuestion();
        }
    }, [gameState, currentStep]);

    const loadNewQuestion = () => {
        const data = generator();
        setCurrentData(data);
        setUserAnswer('');
        setFeedback(null);
    };

    const handleValidate = () => {
        if (!currentData) return;

        let isCorrect = false;

        // Gestion des boutons (choix multiples) ou input texte
        if (currentData.inputMode === 'buttons') {
            // La réponse utilisateur est déjà set via le bouton
            isCorrect = userAnswer === currentData.answer;
        } else if (typeof currentData.answer === 'number') {
            const numUser = parseFloat(userAnswer.toString().replace(',', '.'));
            isCorrect = areValuesEqual(numUser, currentData.answer);
        } else {
            isCorrect = userAnswer.toString().trim().toLowerCase() === currentData.answer.toString().trim().toLowerCase();
        }

        setFeedback({
            isCorrect,
            message: isCorrect ? "Excellent !" : (currentData.explanation || "Réponse incorrecte.")
        });

        if (isCorrect) setScore(s => s + 1);
        setGameState('FEEDBACK');
    };

    const handleNext = () => {
        if (currentStep < options.questionCount - 1) {
            setCurrentStep(s => s + 1);
            setGameState('PLAYING');
        } else {
            setGameState('FINISHED');
        }
    };

    // --- Rendu ---

    if (gameState === 'FINISHED') {
        return (
            <GameShell title={title} onBack={onBack}>
                <div className="text-center p-8 space-y-6 flex flex-col items-center justify-center h-full">
                    <h2 className="text-3xl font-bold text-slate-800">Terminé !</h2>
                    <div className="text-6xl font-black text-indigo-600">
                        {score} / {options.questionCount}
                    </div>
                    <p className="text-slate-500">
                        {score === options.questionCount ? "Un sans faute, bravo professeur !" : "Entraîne-toi encore un peu."}
                    </p>
                    <div className="flex gap-4">
                        <button
                            onClick={onBack}
                            className="bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold hover:bg-slate-300 transition"
                        >
                            Menu
                        </button>
                        <button
                            onClick={() => window.location.reload()} // Force reload pour reset complet simple
                            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition"
                        >
                            Recommencer
                        </button>
                    </div>
                </div>
            </GameShell>
        );
    }

    return (
        <GameShell
            title={title}
            score={score}
            total={options.questionCount}
            current={currentStep + 1}
            onBack={onBack} // <--- Connexion du bouton retour
        >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">

                {/* COLONNE GAUCHE : Question & Interaction */}
                <div className="flex flex-col gap-6 order-2 lg:order-1">

                    {/* Énoncé */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Question {currentStep + 1}</h3>
                        <p className="text-lg text-slate-600">
                            {currentData?.question || "Chargement..."}
                        </p>
                    </div>

                    {/* Zone de réponse */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex-grow flex flex-col justify-center">
                        {!feedback ? (
                            <div className="space-y-4">
                                {currentData?.inputMode === 'buttons' ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        {currentData.choices.map((choice, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => { setUserAnswer(choice); setTimeout(handleValidate, 0); }} // Validation immédiate un peu hacky mais efficace pour UX fluide
                                                className="bg-slate-100 hover:bg-indigo-100 text-slate-800 font-bold py-4 rounded-xl transition-colors border-2 border-transparent hover:border-indigo-500"
                                            >
                                                {choice}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <>
                                        <label className="block text-sm font-medium text-slate-400 uppercase tracking-wide">
                                            Ta réponse
                                        </label>
                                        {InputComponent ? (
                                            <InputComponent value={userAnswer} onChange={setUserAnswer} />
                                        ) : (
                                            <input
                                                type="text"
                                                value={userAnswer}
                                                onChange={(e) => setUserAnswer(e.target.value)}
                                                className="w-full text-3xl font-mono p-4 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors text-center"
                                                placeholder="..."
                                                autoFocus
                                                onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
                                            />
                                        )}
                                        <button
                                            onClick={handleValidate}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xl font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
                                        >
                                            Valider
                                        </button>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className={`space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                                <div className={`p-4 rounded-xl flex items-start gap-4 ${feedback.isCorrect ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`}>
                                    <div className={`p-2 rounded-full ${feedback.isCorrect ? 'bg-emerald-200' : 'bg-red-200'}`}>
                                        <Icon name={feedback.isCorrect ? 'check' : 'x'} size={24} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg mb-1">{feedback.isCorrect ? "Correct !" : "Oups !"}</h4>
                                        <div className="text-base opacity-90 leading-relaxed">
                                            {feedback.message}
                                        </div>
                                        {!feedback.isCorrect && currentData.correctionDetail && (
                                            <div className="mt-2 text-sm font-mono bg-white/50 p-2 rounded">
                                                {currentData.correctionDetail}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={handleNext}
                                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    <span>Continuer</span>
                                    <Icon name="arrow-right" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* COLONNE DROITE : Visuel (SVG, Graphique...) */}
                <div className="order-1 lg:order-2 bg-slate-50 rounded-3xl p-4 flex items-center justify-center min-h-[300px] border-2 border-dashed border-slate-200">
                    {currentData && VisualComponent ? (
                        <VisualComponent data={currentData.data} />
                    ) : (
                        <div className="text-slate-300 italic">Aucun visuel</div>
                    )}
                </div>

            </div>
        </GameShell>
    );
}