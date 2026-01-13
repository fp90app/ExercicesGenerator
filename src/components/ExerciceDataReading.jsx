import React, { useState, useEffect, useRef } from 'react';
import DataReadingSystem from './DataReadingSystem'; // Le moteur visuel créé juste avant
import { generateDataReadingQuestion } from '../utils/generators/statistics'; // Le générateur
import { Icon } from './UI';
import GameShell from './GameShell';
import useGameLogic from '../hooks/useGameLogic';

const ExerciceDataReading = ({ user, level, onFinish, onQuit, onSound }) => {

    const TOTAL_QUESTIONS = 10;

    // --- 1. INITIALISATION DU HOOK LOGIQUE ---
    const game = useGameLogic({
        generator: generateDataReadingQuestion,
        totalQuestions: TOTAL_QUESTIONS,
        initialLevel: level,
        onFinish,
        onSound
    });

    // --- 2. ÉTATS UI LOCAUX ---
    const [inputValue, setInputValue] = useState("");
    const inputRef = useRef(null);

    // Reset du champ texte quand la question change
    useEffect(() => {
        setInputValue("");
        // Focus automatique sur l'input si ce n'est pas un QCM (confort utilisateur)
        if (!game.data?.options && inputRef.current && !game.feedback) {
            setTimeout(() => inputRef.current.focus(), 100);
        }
    }, [game.data, game.feedback]);

    // --- 3. GESTIONNAIRES D'INTERFACE ---

    const handleQcmSelect = (val) => {
        if (game.feedback) return;
        game.validate(val);
    };

    const handleInputSubmit = (e) => {
        e.preventDefault();
        if (game.feedback) {
            game.nextQuestion();
            return;
        }
        if (!inputValue.trim()) return;

        // On normalise la réponse (virgule -> point) pour être sympa
        const normalized = inputValue.replace(',', '.').trim();
        game.validate(normalized);
    };

    // --- THÈME DYNAMIQUE ---
    const getTheme = (lvl) => {
        if (lvl === 1) return { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
        if (lvl === 2) return { text: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' };
        return { text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' };
    };
    const theme = getTheme(game.level);

    // =========================================================
    // ÉCRAN 1 : MENU
    // =========================================================
    if (game.gameState === 'menu') {
        return (
            <GameShell
                user={user}
                onBack={onQuit}
                title="Statistiques & Données"
                maxWidth="max-w-4xl"
            >
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 w-full relative">
                    <div className="bg-orange-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-600">
                        <Icon name="chart-pie-slice" size={40} weight="fill" />
                    </div>
                    <p className="text-slate-500 mb-8 text-center text-lg">Apprends à lire et analyser tous types de graphiques.</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button onClick={() => game.startGame(1)} className="group p-6 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left">
                            <div className="font-black text-xl text-slate-700 group-hover:text-emerald-700 mb-2">Niveau 1</div>
                            <div className="text-sm text-slate-500 font-medium">Lecture directe (Valeurs affichées)</div>
                        </button>
                        <button onClick={() => game.startGame(2)} className="group p-6 rounded-2xl border-2 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left">
                            <div className="font-black text-xl text-slate-700 group-hover:text-indigo-700 mb-2">Niveau 2</div>
                            <div className="text-sm text-slate-500 font-medium">Lecture sur axes & Comparaisons</div>
                        </button>
                        <button onClick={() => game.startGame(3)} className="group p-6 rounded-2xl border-2 border-slate-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-purple-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">EXPERT</div>
                            <div className="font-black text-xl text-slate-700 group-hover:text-purple-700 mb-2">Niveau 3</div>
                            <div className="text-sm text-slate-500 font-medium">Calculs (Différences, Totaux, %)</div>
                        </button>
                    </div>
                </div>
            </GameShell>
        );
    }

    // =========================================================
    // ÉCRAN 2 : RÉSULTATS
    // =========================================================
    if (game.gameState === 'finished') {
        return (
            <GameShell
                user={user}
                onBack={onQuit}
                title="Bilan Statistiques"
                maxWidth="max-w-2xl"
            >
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 w-full relative text-center">
                    <div className="text-6xl mb-4">{game.isSuccess ? '📊' : '📉'}</div>
                    <h2 className="text-3xl font-black text-slate-800 mb-2">Analyse Terminée !</h2>
                    <div className={`text-5xl font-black mb-8 ${game.isSuccess ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {game.score}<span className="text-xl text-slate-300">/{game.totalQuestions}</span>
                    </div>
                    <button onClick={onQuit} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2">
                        <Icon name="arrow-left" /> Retour au Dashboard
                    </button>
                </div>
            </GameShell>
        );
    }

    if (!game.data) return <div className="text-center p-10 font-bold text-slate-400">Chargement...</div>;

    // Titre dynamique
    const HeaderTitle = (
        <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Lecture de Données
            </div>
            <div className="flex items-center gap-2">
                <span className={`${theme.text} ${theme.bg} px-2 py-1 rounded-lg text-lg`}>
                    Niveau {game.level}
                </span>
            </div>
        </div>
    );

    // =========================================================
    // ÉCRAN 3 : JEU EN COURS
    // =========================================================
    return (
        <GameShell
            user={user}
            onBack={onQuit}
            title={HeaderTitle}
            step={game.step}
            total={game.totalQuestions}
            contextData={{ game: 'DataReading', level: game.level, data: game.data }}
            maxWidth="max-w-6xl"
        >
            <div className="flex flex-col md:flex-row gap-8 w-full">

                {/* GAUCHE : VISUEL (Le Graphique) */}
                <div className="w-full md:w-7/12 flex flex-col gap-4">
                    <div className="bg-white p-2 rounded-3xl shadow-lg border border-slate-100 relative overflow-hidden min-h-[400px] flex items-center justify-center">
                        {/* Composant SVG Intelligent */}
                        <DataReadingSystem config={game.data} highlight={!!game.feedback} />
                    </div>
                </div>

                {/* DROITE : INTERACTION (Question & Réponse) */}
                <div className="w-full md:w-5/12 flex flex-col gap-4">
                    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-200 h-full flex flex-col">

                        {/* EN-TÊTE QUESTION */}
                        <div className="flex justify-between items-start mb-6">
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 leading-tight">
                                <Icon name="question" className="text-slate-300" />
                                {game.data.q}
                            </h2>
                            <div className={`text-2xl font-black ${theme.text} ${theme.bg} px-3 py-1 rounded-xl shrink-0`}>
                                {game.score} pts
                            </div>
                        </div>

                        {/* ZONE DE RÉPONSE : QCM ou INPUT */}
                        {game.data.options ? (
                            // MODE QCM (Boutons)
                            <div className="grid grid-cols-1 gap-3 mb-auto">
                                {game.data.options.map((opt, i) => {
                                    let btnClass = "py-4 px-6 rounded-xl font-bold border-2 text-lg transition-all text-left flex justify-between items-center ";

                                    if (game.feedback) {
                                        if (opt === game.data.correct) btnClass += "bg-emerald-500 border-emerald-600 text-white opacity-100";
                                        else btnClass += "bg-slate-50 border-slate-100 text-slate-300 opacity-50";
                                    } else {
                                        btnClass += "bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 active:scale-[0.98]";
                                    }

                                    return (
                                        <button
                                            key={i}
                                            onClick={() => handleQcmSelect(opt)}
                                            disabled={!!game.feedback}
                                            className={btnClass}
                                        >
                                            <span>{opt}</span>
                                            {game.feedback && opt === game.data.correct && <Icon name="check" weight="bold" />}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            // MODE INPUT (Champ Texte)
                            <form onSubmit={handleInputSubmit} className="flex flex-col gap-4 mb-auto">
                                <div className="relative">
                                    <input
                                        ref={inputRef}
                                        type="number"
                                        step="any"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        disabled={!!game.feedback}
                                        placeholder="Votre réponse..."
                                        className="w-full py-4 px-6 rounded-xl bg-slate-50 border-2 border-slate-200 text-2xl font-bold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all placeholder:text-slate-300"
                                    />
                                    {game.data.suffix && (
                                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                                            {game.data.suffix}
                                        </span>
                                    )}
                                </div>
                                {!game.feedback && (
                                    <button
                                        type="submit"
                                        className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-indigo-600 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <Icon name="check" weight="bold" /> Valider
                                    </button>
                                )}
                            </form>
                        )}

                        {/* ZONE FEEDBACK */}
                        {game.feedback && (
                            <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className={`p-4 rounded-xl border-l-4 mb-4 ${game.feedback === 'correct' ? 'bg-emerald-50 border-emerald-500' : 'bg-red-50 border-red-500'}`}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <Icon name={game.feedback === 'correct' ? 'check' : 'warning'} className={game.feedback === 'correct' ? "text-emerald-600" : "text-red-600"} weight="fill" size={24} />
                                        <h3 className={`font-bold text-lg ${game.feedback === 'correct' ? 'text-emerald-800' : 'text-red-800'}`}>
                                            {game.feedback === 'correct' ? 'Excellent !' : 'Oups...'}
                                        </h3>
                                    </div>
                                    <p className="text-slate-600 text-sm leading-relaxed">
                                        {game.data.explanation}
                                    </p>
                                    {game.feedback === 'wrong' && !game.data.options && (
                                        <div className="mt-3 font-bold text-slate-700 bg-white/50 px-3 py-2 rounded-lg inline-block border border-slate-200">
                                            Réponse attendue : <span className="text-indigo-600">{game.data.correct} {game.data.suffix}</span>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={game.nextQuestion}
                                    autoFocus
                                    className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02]"
                                >
                                    Question Suivante <Icon name="arrow-right" weight="bold" />
                                </button>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </GameShell>
    );
};

export default ExerciceDataReading;