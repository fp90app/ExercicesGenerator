import React, { useState, useEffect } from 'react';
import CartesianSystem from './CartesianSystem';
import { generateGraphQuestion } from '../utils/mathGenerators';
import { Icon } from './UI';
import GameShell from './GameShell';

const ExerciceLectureGraphique = ({ user, level, onFinish, onQuit, onSound }) => {

    // --- CONFIGURATION ---
    const TOTAL_QUESTIONS = 10;
    const currentLevel = level || 1;

    // --- THÈME (Couleurs dynamiques selon niveau) ---
    const getThemeColors = (lvl) => {
        switch (lvl) {
            case 3: return {
                main: 'bg-purple-600', hover: 'hover:bg-purple-700',
                light: 'bg-purple-50', text: 'text-purple-600',
                border: 'border-purple-200', gradient: 'from-purple-400 to-purple-600'
            };
            case 2: return {
                main: 'bg-indigo-600', hover: 'hover:bg-indigo-700',
                light: 'bg-indigo-50', text: 'text-indigo-600',
                border: 'border-indigo-200', gradient: 'from-indigo-400 to-indigo-600'
            };
            default: return { // Niveau 1
                main: 'bg-emerald-600', hover: 'hover:bg-emerald-700',
                light: 'bg-emerald-50', text: 'text-emerald-600',
                border: 'border-emerald-200', gradient: 'from-emerald-400 to-emerald-600'
            };
        }
    };
    const theme = getThemeColors(currentLevel);

    // --- ÉTATS ---
    const [gameState, setGameState] = useState('playing');
    const [currentStep, setCurrentStep] = useState(0);
    const [score, setScore] = useState(0);

    const [questionData, setQuestionData] = useState(null);
    const [selectedOptions, setSelectedOptions] = useState([]);
    const [feedback, setFeedback] = useState(null);
    const [points, setPoints] = useState([]);

    useEffect(() => { loadQuestion(); }, [currentLevel]);

    const loadQuestion = () => {
        const data = generateGraphQuestion({ level: currentLevel });
        setQuestionData(data);
        setSelectedOptions([]);
        setFeedback(null);
        setPoints([]);
    };

    const handleNext = () => {
        if (currentStep < TOTAL_QUESTIONS - 1) {
            setCurrentStep(c => c + 1);
            loadQuestion();
        } else {
            setGameState('finished');
            if (score >= TOTAL_QUESTIONS * 0.8 && onSound) onSound('WIN');
            // Sauvegarde via le parent
            if (onFinish) onFinish(score);
        }
    };

    const toggleOption = (val) => {
        if (feedback) return;
        if (val === "Aucun") {
            setSelectedOptions(prev => prev.includes("Aucun") ? [] : ["Aucun"]);
        } else {
            setSelectedOptions(prev => {
                let newSelection = prev.filter(v => v !== "Aucun");
                return newSelection.includes(val) ? newSelection.filter(v => v !== val) : [...newSelection, val];
            });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (feedback) { handleNext(); return; }
        if (selectedOptions.length === 0) return;

        const correctStr = questionData.correct.map(String).sort();
        const selectedStr = selectedOptions.map(String).sort();
        const isCorrect = JSON.stringify(correctStr) === JSON.stringify(selectedStr);

        // --- CALCUL DES POINTS À AFFICHER (Feedback visuel sur le graph) ---
        const getFeedbackPoints = (color) => {
            return questionData.correct.map(val => {
                if (val === "Aucun") return null;
                const numVal = parseFloat(val);
                if (isNaN(numVal)) return null;

                if (questionData.type === 'image') {
                    // On cherche l'image de X, donc le point est (X, réponse)
                    return {
                        x: questionData.inputX,
                        y: numVal,
                        color: color,
                        dashed: true
                    };
                } else {
                    // On cherche l'antécédent de Y, donc le point est (réponse, Y)
                    return {
                        x: numVal,
                        y: questionData.targetY,
                        color: color,
                        dashed: true
                    };
                }
            }).filter(p => p !== null);
        };

        if (isCorrect) {
            setScore(s => s + 1);
            setFeedback('correct');
            if (onSound) onSound('CORRECT');
            setPoints(getFeedbackPoints('#10b981')); // Vert
        } else {
            setFeedback('wrong');
            if (onSound) onSound('WRONG');
            setPoints(getFeedbackPoints('#ef4444')); // Rouge
        }
    };

    // --- ÉCRAN DE FIN ---
    if (gameState === 'finished') {
        const isSuccess = score >= TOTAL_QUESTIONS * 0.8;
        return (
            <GameShell
                user={user}
                onBack={onQuit}
                title="Résultats"
                contextData={{ game: 'LectureGraphique', screen: 'finished' }}
                maxWidth="max-w-2xl"
            >
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 w-full text-center">
                    <div className="text-6xl mb-4">{isSuccess ? '🎉' : '🎓'}</div>
                    <h2 className="text-3xl font-black text-slate-800 mb-2">Série Terminée !</h2>
                    <div className="text-lg text-slate-500 mb-6">Niveau {currentLevel} complété</div>
                    <div className={`text-5xl font-black mb-8 ${isSuccess ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {score}<span className="text-xl text-slate-300">/{TOTAL_QUESTIONS}</span>
                    </div>
                    <div className="flex flex-col gap-3 w-full">
                        <button onClick={onQuit} className="w-full bg-white border-2 border-slate-200 text-slate-700 font-bold py-4 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                            <Icon name="grid" size={20} /> Retour au Dashboard
                        </button>
                    </div>
                </div>
            </GameShell>
        );
    }

    if (!questionData) return <div className="text-center p-10 font-bold text-slate-400">Chargement...</div>;

    // Titre dynamique pour le GameShell
    const HeaderTitle = (
        <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Lecture Graphique
            </div>
            <div className="flex items-center gap-2">
                <span className={`${theme.light} ${theme.text} px-2 py-1 rounded-lg text-lg`}>
                    Niveau {currentLevel}
                </span>
            </div>
        </div>
    );

    // --- ÉCRAN DE JEU ---
    return (
        <GameShell
            user={user}
            onBack={onQuit}
            title={HeaderTitle}
            step={currentStep}
            total={TOTAL_QUESTIONS}
            contextData={{ game: 'LectureGraphique', level: currentLevel, data: questionData }}
            maxWidth="max-w-6xl"
        >
            <div className="flex flex-col md:flex-row gap-8 items-start justify-center w-full">

                {/* GAUCHE : GRAPHIQUE */}
                <div className="w-full md:w-7/12 flex flex-col gap-4">
                    <div className="bg-white rounded-3xl shadow-lg border border-slate-100 relative overflow-hidden pb-4">
                        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${theme.gradient}`}></div>

                        <div className="relative p-2 flex justify-center pt-8">
                            <div className={`absolute top-4 right-6 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold ${theme.text} z-10 shadow-sm border border-slate-100`}>
                                y = f(x)
                            </div>

                            <CartesianSystem
                                f={questionData.f}
                                highlightPoints={points}
                                xMin={-7} xMax={7}
                                yMin={-7} yMax={7}
                                width={500}
                                height={500}
                            />
                        </div>
                    </div>
                </div>

                {/* DROITE : INTERACTION */}
                <div className="w-full md:w-5/12 flex flex-col gap-4">

                    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <Icon name="question" size={24} className="text-slate-300" />
                                Question
                            </h2>
                            <div className={`text-2xl font-black ${theme.text} ${theme.light} px-4 py-2 rounded-xl`}>{score} pts</div>
                        </div>

                        <p className={`text-lg font-medium text-slate-700 mb-6 leading-relaxed border-l-4 pl-4 ${theme.border}`}>
                            {questionData.q}
                            <br />
                            <span className="text-sm text-slate-400 font-normal italic mt-1 block">(Plusieurs réponses possibles)</span>
                        </p>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-3 mb-2">
                                {questionData.options.map((opt, i) => {
                                    const isSelected = selectedOptions.includes(opt);
                                    const isCorrectAnswer = questionData.correct.includes(opt);

                                    let btnClass = "py-4 px-2 rounded-xl font-bold border-2 transition-all active:scale-95 text-lg ";

                                    if (feedback) {
                                        if (isCorrectAnswer) btnClass += "bg-emerald-500 border-emerald-600 text-white opacity-100";
                                        else if (isSelected && !isCorrectAnswer) btnClass += "bg-red-400 border-red-500 text-white opacity-50";
                                        else btnClass += "bg-slate-50 border-slate-100 text-slate-300 opacity-50";
                                    } else {
                                        if (isSelected) btnClass += `${theme.main} border-transparent text-white shadow-lg transform scale-[1.02]`;
                                        else btnClass += "bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-slate-50";
                                    }

                                    return (
                                        <button key={i} type="button" onClick={() => toggleOption(opt)} disabled={!!feedback} className={btnClass}>
                                            {opt}
                                        </button>
                                    );
                                })}
                            </div>

                            {feedback === null ? (
                                <button type="submit" className="w-full py-4 bg-slate-900 hover:bg-black text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg text-lg mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" disabled={selectedOptions.length === 0}>
                                    <Icon name="check" size={20} /> Valider
                                </button>
                            ) : (
                                <div className="animate-in fade-in slide-in-from-bottom-4">
                                    <div className={`p-4 rounded-xl border-l-4 mb-4 ${feedback === 'correct' ? 'bg-emerald-50 border-emerald-500' : 'bg-red-50 border-red-500'}`}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <Icon name={feedback === 'correct' ? 'check' : 'alert-circle'} className={feedback === 'correct' ? "text-emerald-600" : "text-red-600"} />
                                            <h3 className={`font-bold text-lg ${feedback === 'correct' ? 'text-emerald-800' : 'text-red-800'}`}>
                                                {feedback === 'correct' ? 'C\'est parfait !' : 'Oups...'}
                                            </h3>
                                        </div>
                                        <p className="text-slate-600 text-sm">{questionData.e}</p>
                                        {feedback === 'wrong' && (
                                            <div className="mt-2 font-bold text-slate-700 bg-white/50 px-2 py-1 rounded inline-block">
                                                Réponse : {questionData.correct.join(' et ')}
                                            </div>
                                        )}
                                    </div>
                                    <button type="submit" autoFocus className={`w-full py-4 text-white font-bold rounded-xl transition-transform active:scale-95 text-lg mt-2 flex items-center justify-center gap-2 ${feedback === 'correct' ? theme.main + ' ' + theme.hover : 'bg-slate-800 hover:bg-slate-900'}`}>
                                        <span>Question Suivante</span> <Icon name="arrow-right" />
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </GameShell>
    );
};

export default ExerciceLectureGraphique;