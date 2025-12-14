import React, { useState, useEffect } from 'react';
import { doc, getDoc } from "firebase/firestore"; // J'ai retiré les imports inutiles
import { db } from "../../firebase";

import { Icon } from '../UI';
import { QUESTIONS_DB } from '../../utils/data'; // Fallback statique
import { QUESTIONS_TABLES, QUESTIONS_DIVISIONS } from '../../utils/data';

// --- NOUVEL IMPORT ---
import { getGenerator } from '../../utils/exerciseMapping';

// --- IMPORTS COMPOSANTS SPÉCIAUX ---
import ExerciceLectureGraphique from '../ExerciceLectureGraphique';
import ExerciceThales from './ExerciceThales';
import ExerciceTableauValeursCourbe from './ExerciceTableauValeursCourbe';
import ExercicePythagore from './ExercicePythagore';
import ScratchScript from './ScratchBlock';

const StandardGame = ({ user, config, onFinish, onBack, onSound }) => {
    const [questions, setQuestions] = useState([]);
    const [current, setCurrent] = useState(0);
    const [score, setScore] = useState(0);
    const [finished, setFinished] = useState(false);
    const [selected, setSelected] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [showConfetti, setShowConfetti] = useState(false);

    // =========================================================
    // 0. ROUTAGE VERS COMPOSANTS SPÉCIAUX (VISUELS)
    // =========================================================
    if (config.id === 'auto_25_pythagore') {
        return <div className="min-h-screen bg-slate-50 relative pt-10"><ExercicePythagore user={user} level={config.level} onFinish={onFinish} onQuit={onBack} onSound={onSound} /></div>;
    }
    if (config.id === 'auto_26_thales') {
        return <div className="min-h-screen bg-slate-50 relative pt-10"><ExerciceThales user={user} level={config.level} onFinish={onFinish} onQuit={onBack} onSound={onSound} /></div>;
    }
    if (config.id === 'auto_37_graph') {
        return <div className="min-h-screen bg-slate-50 relative pt-10"><ExerciceLectureGraphique user={user} level={config.level} onFinish={onFinish} onQuit={onBack} onSound={onSound} /></div>;
    }
    if (config.id === 'auto_38_graph2') {
        return <div className="min-h-screen bg-slate-50 relative pt-10"><ExerciceTableauValeursCourbe user={user} level={config.level} onFinish={(s) => onFinish(s)} onQuit={onBack} onSound={onSound} /></div>;
    }

    // =========================================================
    // INITIALISATION DU JEU STANDARD
    // =========================================================
    useEffect(() => {
        const initGame = async () => {
            let pool = [];
            const generatorFunc = getGenerator(config.id); // On cherche dans le mapping

            // --- CAS 1 : C'est un exercice mappé (Standard) ---
            if (generatorFunc) {
                // On essaie de récupérer des paramètres spécifiques depuis Firebase si nécessaire
                // (Optionnel, pour l'instant on passe juste le niveau)
                const params = { level: config.level };

                try {
                    // Petite astuce : Si on veut surcharger les paramètres depuis Firebase pour un ID précis
                    // On peut le faire ici, mais pour l'instant on reste simple.
                    for (let i = 0; i < 10; i++) {
                        pool.push(generatorFunc(params));
                    }
                } catch (e) {
                    console.error("Erreur générateur pour " + config.id, e);
                }
            }

            // --- CAS 2 : Mode Tables / Divisions ---
            else if (config.mode === 'FREE_MIX') {
                const { tables, modes } = config.id;
                if (modes.mul) tables.forEach(t => { if (QUESTIONS_TABLES[t]) pool = [...pool, ...QUESTIONS_TABLES[t]]; });
                if (modes.div) tables.forEach(t => { if (QUESTIONS_DIVISIONS[t]) pool = [...pool, ...QUESTIONS_DIVISIONS[t]]; });
            }
            else if (config.mode.includes('TABLES') || config.mode.includes('DIVISIONS')) {
                const SOURCE = config.mode.includes('DIVISIONS') ? QUESTIONS_DIVISIONS : QUESTIONS_TABLES;
                if (Array.isArray(config.id)) {
                    config.id.forEach(tId => { if (SOURCE[tId]) pool = [...pool, ...SOURCE[tId]]; });
                } else {
                    if (SOURCE[config.id]) pool = [...SOURCE[config.id]];
                }
            }

            // --- CAS 3 : Fallback (Ancien système procédural ou statique) ---
            else if (pool.length === 0) {
                // On regarde si c'est dans la DB statique
                pool = QUESTIONS_DB[config.id]?.[config.level] || [];
            }

            // --- PRÉPARATION DES QUESTIONS ---
            if (pool && pool.length > 0) {
                const qList = [...pool]
                    .sort(() => 0.5 - Math.random()) // Mélange des questions
                    .slice(0, 10) // On en prend 10
                    .map(q => {
                        const answers = [...q.o];
                        const correct = answers[0]; // La convention est : la 1ère option est la bonne
                        return {
                            ...q,
                            mixedAnswers: answers.sort(() => 0.5 - Math.random()), // Mélange des réponses
                            correctIndex: -1,
                            correctTxt: correct
                        };
                    });

                // On retrouve l'index de la bonne réponse après mélange
                qList.forEach(q => q.correctIndex = q.mixedAnswers.indexOf(q.correctTxt));
                setQuestions(qList);
            } else {
                setQuestions([]);
            }
        };
        initGame();
    }, [config]);

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