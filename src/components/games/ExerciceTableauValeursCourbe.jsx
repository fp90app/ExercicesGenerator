import React, { useState, useEffect } from 'react';
import CartesianSystem from '../CartesianSystem';
import { Icon } from '../UI';
import { generateTableQuestion } from '../../utils/mathGenerators';
import GameShell from '../GameShell';

const ExerciceTableauValeursCourbe = ({ user, level, onFinish, onQuit, onSound }) => {

    const TOTAL_QUESTIONS = 10;
    const currentLevel = level || 1;

    // --- ÉTATS ---
    const [gameState, setGameState] = useState('playing');
    const [step, setStep] = useState(0);
    const [score, setScore] = useState(0);
    const [data, setData] = useState(null);

    // Réponses utilisateur
    const [inputs, setInputs] = useState({}); // { "idx_col_row": valeur }
    const [placedPoints, setPlacedPoints] = useState([]); // [{x, y}, ...]

    const [feedback, setFeedback] = useState(null); // null, 'correct', 'wrong'

    // Chargement initial
    useEffect(() => {
        loadQuestion();
    }, [level]);

    const loadQuestion = () => {
        const newData = generateTableQuestion({ level: currentLevel });
        setData(newData);
        setInputs({});
        setPlacedPoints([]);
        setFeedback(null);
    };

    // --- GESTION DES ENTRÉES (TABLEAU) ---
    const handleInputChange = (idx, axis, value) => {
        if (feedback) return;
        setInputs(prev => ({
            ...prev,
            [`${idx}_${axis}`]: value
        }));
    };

    // --- GESTION DES CLICS (GRAPHIQUE) ---
    const handleGraphClick = (coords) => {
        if (feedback) return;
        if (data.mode === 'READ_TABLE') return; // Pas de clic en mode lecture

        // Snap au 0.5 le plus proche
        const x = Math.round(coords.x * 2) / 2;
        const y = Math.round(coords.y * 2) / 2;

        setPlacedPoints(prev => {
            // Si le point existe déjà, on le supprime (toggle)
            const exists = prev.find(p => p.x === x && p.y === y);
            if (exists) return prev.filter(p => p !== exists);

            // Sinon on l'ajoute (limite au nombre de colonnes)
            if (prev.length >= data.table.length) {
                // On remplace le dernier (optionnel, ou on bloque)
                return [...prev.slice(1), { x, y }];
            }
            return [...prev, { x, y }];
        });
    };

    const handleReset = () => {
        if (feedback) return;
        setPlacedPoints([]);
    };

    // --- VALIDATION ---
    const validate = () => {
        if (feedback) {
            // Passage question suivante
            if (step < TOTAL_QUESTIONS - 1) {
                setStep(s => s + 1);
                loadQuestion();
            } else {
                setGameState('finished');
                if (score >= TOTAL_QUESTIONS * 0.8 && onSound) onSound('WIN');
                // Sauvegarde via le parent
                if (onFinish) onFinish(score);
            }
            return;
        }

        let isCorrect = true;

        if (data.mode === 'READ_TABLE') {
            // Vérification des inputs
            data.table.forEach((col, idx) => {
                // Vérif X
                if (col.typeX === 'hole') {
                    const val = parseFloat(inputs[`${idx}_x`]);
                    if (Math.abs(val - col.x) > 0.1 || isNaN(val)) isCorrect = false;
                }
                // Vérif Y
                if (col.typeY === 'hole') {
                    const val = parseFloat(inputs[`${idx}_y`]);
                    if (Math.abs(val - col.y) > 0.1 || isNaN(val)) isCorrect = false;
                }
            });
        } else {
            // Vérification des points placés
            // Pour chaque colonne du tableau, il doit y avoir un point correspondant sur le graph
            const pointsFound = data.table.every(target => {
                return placedPoints.some(p => Math.abs(p.x - target.x) < 0.1 && Math.abs(p.y - target.y) < 0.1);
            });
            if (!pointsFound || placedPoints.length !== data.table.length) isCorrect = false;
        }

        setFeedback(isCorrect ? 'correct' : 'wrong');
        if (isCorrect) {
            setScore(s => s + 1);
            if (onSound) onSound('CORRECT');
        } else {
            if (onSound) onSound('WRONG');
        }
    };

    // Définition du thème pour cohérence visuelle
    const theme = currentLevel === 1 ? { text: 'text-emerald-600', bg: 'bg-emerald-50' } :
        currentLevel === 2 ? { text: 'text-indigo-600', bg: 'bg-indigo-50' } :
            { text: 'text-purple-600', bg: 'bg-purple-50' };

    // --- ECRAN DE FIN ---
    if (gameState === 'finished') {
        const isSuccess = score >= TOTAL_QUESTIONS * 0.8;
        return (
            <GameShell
                user={user}
                onBack={onQuit}
                title="Résultats"
                contextData={{ game: 'TableauValeurs', screen: 'finished' }}
                maxWidth="max-w-2xl"
            >
                <div className="bg-white rounded-3xl p-8 shadow-xl w-full text-center border border-slate-200">
                    <div className="text-6xl mb-4">{isSuccess ? '📊' : '📉'}</div>
                    <h2 className="text-2xl font-black text-slate-800">Terminé !</h2>
                    <div className={`text-4xl font-black my-6 ${isSuccess ? 'text-emerald-500' : 'text-slate-300'}`}>
                        {score} <span className="text-xl text-slate-400">/ {TOTAL_QUESTIONS}</span>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button onClick={onQuit} className="w-full bg-white border-2 border-slate-200 text-slate-500 py-3 rounded-xl font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                            <Icon name="grid" /> Retour au menu
                        </button>
                    </div>
                </div>
            </GameShell>
        );
    }

    if (!data) return <div className="p-10 text-center font-bold text-slate-400">Chargement...</div>;

    // --- PREPARATION AFFICHAGE ---

    // Points à afficher sur le graphe
    const pointsToDisplay = [];

    // 1. Points placés par l'utilisateur (Bleu)
    placedPoints.forEach(p => pointsToDisplay.push({ x: p.x, y: p.y, color: '#3b82f6', shape: 'cross' }));

    // 2. Correction (Vert ou Rouge)
    if (feedback) {
        data.table.forEach(p => {
            // Les vrais points de la courbe
            pointsToDisplay.push({
                x: p.x,
                y: p.y,
                color: feedback === 'correct' ? '#22c55e' : '#ef4444', // Vert ou Rouge
                dashed: false
            });
        });
    }

    // Titre dynamique pour GameShell
    const HeaderTitle = (
        <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Fonctions & Tableaux
            </div>
            <div className="flex items-center gap-2">
                <span className={`${theme.text} bg-slate-50 px-2 py-1 rounded-lg text-lg`}>
                    Niveau {currentLevel}
                </span>
            </div>
        </div>
    );

    // --- RENDU JEU ---
    return (
        <GameShell
            user={user}
            onBack={onQuit}
            title={HeaderTitle}
            step={step}
            total={TOTAL_QUESTIONS}
            contextData={{ game: 'TableauValeurs', level: currentLevel, data: data }}
            maxWidth="max-w-6xl"
        >
            <div className="flex flex-col md:flex-row gap-6 w-full">

                {/* GAUCHE : GRAPHIQUE */}
                <div className="w-full md:w-1/2 flex flex-col gap-4">
                    <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden relative">

                        {/* Barre d'outils Graphique */}
                        <div className="bg-slate-50 border-b border-slate-100 p-3 flex justify-between items-center">
                            <span className="font-bold text-slate-500 uppercase text-xs tracking-wider flex items-center gap-2">
                                <Icon name="chart-line" /> Repère
                            </span>

                            {data.mode === 'PLOT_GRAPH' && !feedback && placedPoints.length > 0 && (
                                <button
                                    onClick={handleReset}
                                    className="bg-red-50 text-red-500 hover:bg-red-100 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors"
                                    title="Tout effacer"
                                >
                                    <Icon name="trash" size={14} /> Effacer
                                </button>
                            )}
                        </div>

                        <div className="p-2 cursor-crosshair relative flex justify-center min-h-[400px]">
                            {/* Consigne flottante sur le graph */}
                            {data.mode === 'PLOT_GRAPH' && !feedback && (
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-600/90 text-white px-4 py-1 rounded-full text-sm font-bold shadow-md z-10 pointer-events-none animate-bounce">
                                    Clique pour placer les points
                                </div>
                            )}

                            <CartesianSystem
                                xMin={-7} xMax={7}
                                yMin={-7} yMax={7}
                                width={500} height={400}
                                // On affiche la fonction SI mode Lecture OU SI correction active
                                f={(data.mode === 'READ_TABLE' || feedback) ? data.f : null}
                                highlightPoints={pointsToDisplay}
                                onClick={handleGraphClick}
                            />
                        </div>
                    </div>
                </div>

                {/* DROITE : TABLEAU ET QUESTION */}
                <div className="w-full md:w-1/2 flex flex-col gap-4">

                    {/* Bloc Principal */}
                    <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-200">

                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <Icon name="table" size={24} className="text-slate-300" />
                                Tableau de valeurs
                            </h2>
                            <div className="text-2xl font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl">
                                {score} pts
                            </div>
                        </div>

                        {/* TABLEAU INTERACTIF */}
                        <div className="overflow-x-auto rounded-xl border-2 border-slate-200 mb-6 shadow-sm">
                            <table className="w-full text-center border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 border-b-2 border-slate-200">
                                        <th className="p-3 font-black text-slate-600 border-r border-slate-200 w-16">x</th>
                                        {data.table.map((col, i) => (
                                            <th key={i} className="p-1 border-r border-slate-200 min-w-[60px]">
                                                {/* Cellule X */}
                                                {col.typeX === 'given' ? (
                                                    <span className="font-bold text-slate-700">{col.x}</span>
                                                ) : (
                                                    <input
                                                        type="number"
                                                        value={inputs[`${i}_x`] || ''}
                                                        onChange={(e) => handleInputChange(i, 'x', e.target.value)}
                                                        disabled={!!feedback}
                                                        placeholder="?"
                                                        className={`w-full h-10 text-center font-bold bg-indigo-50 text-indigo-700 rounded focus:ring-2 ring-indigo-300 outline-none ${feedback === 'wrong' ? 'bg-red-50 text-red-600' : ''}`}
                                                    />
                                                )}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="bg-white">
                                        <th className="p-3 font-bold italic text-slate-500 border-r border-slate-200 font-serif">f(x)</th>
                                        {data.table.map((col, i) => (
                                            <td key={i} className="p-1 border-r border-slate-200">
                                                {/* Cellule Y */}
                                                {col.typeY === 'given' ? (
                                                    <span className="font-medium text-slate-600">{col.y}</span>
                                                ) : (
                                                    <input
                                                        type="number"
                                                        value={inputs[`${i}_y`] || ''}
                                                        onChange={(e) => handleInputChange(i, 'y', e.target.value)}
                                                        disabled={!!feedback}
                                                        placeholder="?"
                                                        className={`w-full h-10 text-center font-bold bg-indigo-50 text-indigo-700 rounded focus:ring-2 ring-indigo-300 outline-none ${feedback === 'wrong' ? 'bg-red-50 text-red-600' : ''}`}
                                                    />
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* FEEDBACK */}
                        {feedback && (
                            <div className={`p-4 rounded-xl mb-4 text-sm flex items-start gap-3 ${feedback === 'correct' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                                <Icon name={feedback === 'correct' ? 'check-circle' : 'warning'} className="text-xl shrink-0" />
                                <div>
                                    <div className="font-bold mb-1">{feedback === 'correct' ? 'Excellent !' : 'Oups...'}</div>
                                    {feedback === 'wrong' && (
                                        <div className="opacity-90">
                                            Regarde la correction en <span className="font-bold text-red-600">rouge</span> sur le graphique ou le tableau.
                                            La fonction était : <span className="font-mono bg-white/50 px-1 rounded">{data.fStr}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={validate}
                            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${feedback === 'correct' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' :
                                feedback === 'wrong' ? 'bg-slate-800 hover:bg-slate-900 text-white' :
                                    'bg-indigo-600 hover:bg-indigo-700 text-white'
                                }`}
                        >
                            {feedback ? <span>Suivant <Icon name="arrow-right" /></span> : <span>Valider <Icon name="check" /></span>}
                        </button>

                    </div>

                    {/* NOTE PÉDAGOGIQUE */}
                    {data.mode === 'READ_TABLE' && !feedback && (
                        <div className="bg-blue-50 text-blue-700 p-4 rounded-2xl text-sm border border-blue-100 flex gap-2 items-center">
                            <Icon name="info" />
                            <span>Astuce : Pour trouver f(x), pars de x sur l'axe horizontal et rejoins la courbe.</span>
                        </div>
                    )}
                </div>
            </div>
        </GameShell>
    );
};

export default ExerciceTableauValeursCourbe;