import React, { useState, useEffect } from 'react';
// Import du système de dessin
import PythagoreSystem from '../PythagoreSystem.jsx';
// Import du générateur
import { generatePythagoreData } from '../../utils/mathGenerators';
// Import de l'UI
import { Icon } from '../UI';
// Import de la Calculatrice
import Calculator from '../Calculator';

const ExercicePythagore = ({ user, level, onFinish, onQuit, onSound }) => {

    const TOTAL_QUESTIONS = 10;

    const [gameState, setGameState] = useState(level ? 'playing' : 'menu');
    const [selectedLevel, setSelectedLevel] = useState(level || 1);
    const [data, setData] = useState(() => level ? generatePythagoreData(level) : null);

    const [currentStep, setCurrentStep] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [showCalc, setShowCalc] = useState(false);

    useEffect(() => {
        if (level && gameState === 'menu') startGame(level);
    }, [level]);

    const startGame = (lvl) => {
        setSelectedLevel(lvl);
        setGameState('playing');
        setScore(0);
        setCurrentStep(0);
        loadQuestion(lvl);
        if (onSound) onSound('CLICK');
    };

    const loadQuestion = (lvl) => {
        setData(generatePythagoreData(lvl));
        setSelectedOption(null);
        setFeedback(null);
        setShowCalc(false);
    };

    const handleNext = () => {
        if (currentStep < TOTAL_QUESTIONS - 1) {
            setCurrentStep(c => c + 1);
            loadQuestion(selectedLevel);
        } else {
            setGameState('finished');
            if (score >= TOTAL_QUESTIONS * 0.8 && onSound) onSound('WIN');
            if (onFinish) onFinish(score);
        }
    };

    const handleValidate = () => {
        if (!selectedOption) return;
        const isCorrect = selectedOption === data.correct;
        setFeedback(isCorrect ? 'correct' : 'wrong');
        if (isCorrect) {
            setScore(s => s + 1);
            if (onSound) onSound('CORRECT');
        } else {
            if (onSound) onSound('WRONG');
        }
    };

    // --- RENDU TEXTE ---
    const renderOptionText = (text) => {
        const str = String(text);
        if (str.includes('²')) {
            const parts = str.split('²');
            return (
                <span className="font-bold font-serif text-slate-800">
                    {parts.map((part, i) => (
                        <React.Fragment key={i}>
                            {part}
                            {i < parts.length - 1 && <sup className="text-sm ml-0.5">2</sup>}
                        </React.Fragment>
                    ))}
                </span>
            );
        }
        return <span className="font-bold font-serif text-slate-800">{str}</span>;
    };

    // --- CORRECTION ---
    const Sq = () => <sup className="text-xs font-semibold text-indigo-500 relative -top-1">2</sup>;
    const Root = ({ children }) => <span className="whitespace-nowrap font-bold text-emerald-700">√<span className="overline decoration-2 decoration-emerald-700">{children}</span></span>;

    const getCorrectionExplanation = () => {
        if (!data) return null;
        const { points, vals, targetKey, targetType, correct, mainUnit, qType, conversionNeeded } = data;

        const hypName = points.Top + points.Bottom; // BC
        const side1Name = points.Right + points.Top; // AB
        const side2Name = points.Right + points.Bottom; // AC

        if (qType === 'EQUALITY') {
            const isHyp = targetType === 'formula_hyp';
            return (
                <div className="text-sm text-slate-600 space-y-3 mt-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                    <p className="font-bold text-slate-800 border-b pb-2 mb-2 flex items-center gap-2">
                        <Icon name="info" className="text-indigo-500" /> Rappel du cours :
                    </p>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                        <li>L'angle droit est en <strong>{points.Right}</strong>.</li>
                        <li>L'hypoténuse est <strong>[{hypName}]</strong>.</li>
                        <li>Formule de base : <span className="font-serif font-bold">{hypName}<Sq /> = {side1Name}<Sq /> + {side2Name}<Sq /></span></li>
                    </ul>
                    {!isHyp && (
                        <p className="mt-2 text-indigo-700 bg-indigo-50 p-2 rounded border border-indigo-100">
                            Pour un petit côté, on transforme en soustraction.
                        </p>
                    )}
                    <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl text-center font-bold border border-emerald-100 mt-2 text-lg">
                        {renderOptionText(correct)}
                    </div>
                </div>
            );
        }

        const hypVal = vals[hypName];
        const side1Val = vals[side1Name];
        const side2Val = vals[side2Name];

        const ConversionAlert = () => (
            <div className="bg-amber-50 border-l-4 border-amber-400 p-2 mb-3 text-amber-800 text-xs font-bold rounded-r">
                ⚠️ Attention aux unités ! Convertis tout en {mainUnit}.
            </div>
        );

        if (targetType === 'hypotenuse') {
            return (
                <div className="text-sm text-slate-600 space-y-3 mt-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                    {conversionNeeded && <ConversionAlert />}
                    <p className="text-slate-800 font-bold border-b border-slate-100 pb-2">
                        On cherche l'hypoténuse (le plus grand côté).
                    </p>
                    <div className="text-center text-lg text-slate-800 font-serif py-1">
                        {hypName}<Sq /> = {side1Name}<Sq /> + {side2Name}<Sq />
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center font-mono text-base">
                        <p>{hypName}<Sq /> = {side1Val}<Sq /> + {side2Val}<Sq /></p>
                        <p className="mt-1 font-bold text-indigo-600">
                            {hypName}<Sq /> = {Math.round(hypVal * hypVal * 100) / 100}
                        </p>
                    </div>
                    <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl text-center font-bold border border-emerald-100 shadow-sm">
                        {hypName} = <Root>{Math.round(hypVal * hypVal * 100) / 100}</Root> = {correct} {mainUnit}
                    </div>
                </div>
            );
        } else {
            return (
                <div className="text-sm text-slate-600 space-y-3 mt-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                    {conversionNeeded && <ConversionAlert />}
                    <p className="text-slate-800 font-bold border-b border-slate-100 pb-2 text-amber-600 flex items-center gap-2">
                        <Icon name="arrow-down" size={16} /> On cherche un côté : SOUSTRACTION !
                    </p>
                    <div className="text-center text-lg text-slate-800 font-serif py-1">
                        {targetKey}<Sq /> = {hypName}<Sq /> - {vals[targetKey.includes(points.Top) ? side2Name : side1Name] ? (targetKey.includes(points.Top) ? side1Name : side2Name) : '...'}<Sq />
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center font-mono text-base">
                        <p>{targetKey}<Sq /> = {hypVal}<Sq /> - {vals[targetKey === side1Name ? side2Name : side1Name]}<Sq /></p>
                        <p className="mt-1 font-bold text-indigo-600">
                            {targetKey}<Sq /> = {Math.round(correct * correct * 100) / 100}
                        </p>
                    </div>
                    <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl text-center font-bold border border-emerald-100 shadow-sm">
                        {targetKey} = <Root>{Math.round(correct * correct * 100) / 100}</Root> = {correct} {mainUnit}
                    </div>
                </div>
            );
        }
    };

    if (gameState === 'finished') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in slide-in-from-bottom-8">
                <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-md w-full border border-slate-100">
                    <div className="text-6xl mb-4">{score >= TOTAL_QUESTIONS * 0.8 ? '🏆' : '💪'}</div>
                    <h2 className="text-3xl font-black text-slate-800 mb-2">Série Terminée !</h2>
                    <div className="text-5xl font-black mb-8 text-indigo-600">{score}<span className="text-xl text-slate-300">/{TOTAL_QUESTIONS}</span></div>
                    <button onClick={onQuit} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2">
                        <Icon name="arrow-left" /> Retour au Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (!data) return <div className="text-center p-10 font-bold text-slate-400 animate-pulse">Chargement...</div>;

    return (
        <div className="flex flex-col md:flex-row gap-6 max-w-6xl mx-auto w-full p-4 font-sans text-slate-800">
            {/* GAUCHE : VISUEL */}
            <div className="w-full md:w-5/12 flex flex-col gap-4">
                <div className="bg-white p-4 rounded-3xl shadow-lg border border-slate-100">
                    <div className="flex justify-between items-center mb-2 px-2">
                        <span className="font-bold text-slate-400 text-sm tracking-wider uppercase">Niveau {selectedLevel}</span>
                        <div className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-500">Q {currentStep + 1} / {TOTAL_QUESTIONS}</div>
                    </div>
                    <div className="p-2 flex items-center justify-center min-h-[320px]">
                        <PythagoreSystem config={data} highlight={!!feedback} />
                    </div>
                </div>
            </div>

            {/* DROITE : QUESTIONS */}
            <div className="w-full md:w-7/12 flex flex-col">
                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-200 relative h-full flex flex-col">

                    {/* BOUTON QUITTER (RETABLI) */}
                    <button onClick={onQuit} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition-colors z-10">
                        <Icon name="x" size={24} />
                    </button>

                    <div className="flex justify-between items-start mb-6 pr-8">
                        <div>
                            {data.qType === 'EQUALITY' ? (
                                <h2 className="text-2xl font-black text-slate-800 mb-1">Quelle est la bonne égalité ?</h2>
                            ) : (
                                <>
                                    <h2 className="text-3xl font-black text-slate-800 mb-1">
                                        Calcule <span className="text-indigo-600 px-2 bg-indigo-50 rounded-lg">{data.targetKey}</span>
                                    </h2>
                                    <p className="text-slate-500 font-medium text-sm mt-1">
                                        Résultat attendu en <b>{data.mainUnit}</b>.
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Bouton Calculatrice */}
                        {!showCalc && !feedback && (
                            data.allowCalc ? (
                                <button onClick={() => setShowCalc(true)} className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-indigo-100 transition-colors border border-indigo-100 shadow-sm">
                                    <Icon name="grid" size={18} /> Calculatrice
                                </button>
                            ) : (
                                <div className="text-xs font-bold text-red-400 bg-red-50 px-3 py-1 rounded-full border border-red-100 flex items-center gap-1">
                                    <Icon name="lock-key" size={12} /> Sans Calculatrice
                                </div>
                            )
                        )}
                    </div>

                    {showCalc && (
                        <div className="absolute z-50 top-20 right-6 shadow-2xl">
                            <Calculator onClose={() => setShowCalc(false)} />
                        </div>
                    )}

                    {/* GRILLE REPONSES (AVEC UNITÉS) */}
                    <div className={`grid ${data.qType === 'EQUALITY' ? 'grid-cols-1' : 'grid-cols-2'} gap-4 mb-auto`}>
                        {data.options.map((opt, i) => {
                            const isSelected = selectedOption === opt;
                            let btnClass = "bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-600 shadow-sm";

                            if (feedback) {
                                if (opt === data.correct) btnClass = "bg-emerald-500 border-emerald-600 text-white opacity-100 shadow-md scale-[1.02]";
                                else if (isSelected) btnClass = "bg-red-400 border-red-500 text-white opacity-50";
                                else btnClass = "opacity-30 grayscale blur-[1px]";
                            } else if (isSelected) {
                                btnClass = "bg-indigo-600 border-indigo-700 text-white shadow-xl scale-[1.03] ring-4 ring-indigo-100";
                            }

                            const txtSize = data.qType === 'EQUALITY' ? 'text-lg md:text-xl py-4' : 'text-2xl py-6';

                            return (
                                <button key={i} onClick={() => setSelectedOption(opt)} disabled={!!feedback} className={`${txtSize} px-4 rounded-2xl border-b-4 transition-all duration-200 ${btnClass} flex items-center justify-center gap-1`}>
                                    {renderOptionText(opt)}
                                    {/* AJOUT DES UNITÉS SI C'EST UN CALCUL */}
                                    {data.qType === 'CALC' && (
                                        <span className="text-base font-normal opacity-70 mt-1">{data.mainUnit}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-8 min-h-[100px]">
                        {!feedback ? (
                            <button onClick={handleValidate} disabled={!selectedOption} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 active:translate-y-0">
                                Valider <Icon name="check" size={20} weight="bold" />
                            </button>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className={`flex items-center gap-2 mb-2 font-bold text-xl ${feedback === 'correct' ? 'text-emerald-600' : 'text-red-500'}`}>
                                    <div className={`p-2 rounded-full ${feedback === 'correct' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                                        <Icon name={feedback === 'correct' ? 'check' : 'warning'} weight="bold" />
                                    </div>
                                    {feedback === 'correct' ? 'Excellent !' : 'Aïe, pas tout à fait...'}
                                </div>
                                {getCorrectionExplanation()}
                                <button onClick={handleNext} className="w-full mt-6 bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02]">
                                    {currentStep < TOTAL_QUESTIONS - 1 ? "Question Suivante" : "Voir les résultats"}
                                    <Icon name="arrow-right" size={20} weight="bold" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExercicePythagore;