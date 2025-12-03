import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase";
import { Icon, Leaderboard } from '../UI';
import { QUESTIONS_DB, PROCEDURAL_EXOS, AUTOMATISMES_DATA, TRAINING_MODULES } from '../../utils/data';
import { QUESTIONS_TABLES, QUESTIONS_DIVISIONS } from '../../utils/data';
import {
    generateFractionQuestion,
    generateDecimalQuestion,
    generateFractionOpsQuestion,
    generateFractionOfNumberQuestion,
    generatePercentQuestion,
    generateMultipleFormsQuestion,
    generateScientificNotationQuestion,
    generateSquareQuestion
} from '../../utils/mathGenerators';
import ExerciceLectureGraphique from '../ExerciceLectureGraphique';
import ExerciceThales from './ExerciceThales';




const StandardGame = ({ user, config, onFinish, onBack, onSound }) => {
    const [questions, setQuestions] = useState([]);
    const [current, setCurrent] = useState(0);
    const [score, setScore] = useState(0);
    const [finished, setFinished] = useState(false);
    const [selected, setSelected] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [showConfetti, setShowConfetti] = useState(false);



    if (config.id === 'auto_26_thales') {

        return (
            <div className="min-h-screen bg-slate-50 relative pt-10">
                <ExerciceThales
                    user={user}
                    onFinish={onFinish}


                    onQuit={onBack}


                    onSound={onSound}
                />
            </div>
        );
    }

    if (config.id === 'auto_37_graph') {

        return (
            <div className="min-h-screen bg-slate-50 relative pt-10">
                <ExerciceLectureGraphique
                    user={user}
                    onFinish={onFinish}


                    onQuit={onBack}


                    onSound={onSound}
                />
            </div>
        );
    }



    useEffect(() => {
        const initGame = async () => {
            let pool = [];

            // =========================================================
            // 1. MODES DE TABLES (Simple, Mixte, Division)
            // =========================================================

            // CAS SPÉCIAL : LE NOUVEAU CHOIX LIBRE (MIXTE)
            if (config.mode === 'FREE_MIX') {
                const { tables, modes } = config.id;
                if (modes.mul) {
                    tables.forEach(t => {
                        if (QUESTIONS_TABLES[t]) pool = [...pool, ...QUESTIONS_TABLES[t]];
                    });
                }
                if (modes.div) {
                    tables.forEach(t => {
                        if (QUESTIONS_DIVISIONS[t]) pool = [...pool, ...QUESTIONS_DIVISIONS[t]];
                    });
                }
            }
            // CAS CLASSIQUE (Tables ou Divisions)
            else if (config.mode.includes('TABLES') || config.mode.includes('DIVISIONS')) {
                const SOURCE = config.mode.includes('DIVISIONS') ? QUESTIONS_DIVISIONS : QUESTIONS_TABLES;
                if (Array.isArray(config.id)) {
                    config.id.forEach(tId => { if (SOURCE[tId]) pool = [...pool, ...SOURCE[tId]]; });
                } else {
                    if (SOURCE[config.id]) pool = [...SOURCE[config.id]];
                }
            }
            // =========================================================
            // 2. EXERCICES (PROCÉDURAUX OU STATIQUES)
            // =========================================================
            else {
                // Utilisation des fonctions Firebase importées (standard React)
                const docRef = doc(db, "configs_exercices", config.id);

                try {
                    const snap = await getDoc(docRef);

                    if (snap.exists() && snap.data()[config.level]) {
                        const params = snap.data()[config.level];

                        if (config.id === 'auto_1_ecriture_decimale_fractions') {
                            for (let i = 0; i < 10; i++) pool.push(generateFractionQuestion(params));
                        }
                        else if (config.id === 'auto_2_comparaison_calcul_decimaux') {
                            for (let i = 0; i < 10; i++) pool.push(generateDecimalQuestion(params));
                        }
                        else if (config.id === 'auto_3_fractions_calc') {
                            for (let i = 0; i < 10; i++) pool.push(generateFractionOpsQuestion(params));
                        }
                        else if (config.id === 'auto_4_fraction_nombre') {
                            for (let i = 0; i < 10; i++) pool.push(generateFractionOfNumberQuestion(params));
                        }
                        else if (config.id === 'auto_5_pourcentages') {
                            for (let i = 0; i < 10; i++) pool.push(generatePercentQuestion(params));
                        }
                        else if (config.id === 'auto_6_formes_multiples') {
                            for (let i = 0; i < 10; i++) pool.push(generateMultipleFormsQuestion(params));
                        }
                        else if (config.id === 'auto_7_ecriture_sci') {
                            for (let i = 0; i < 10; i++) pool.push(generateScientificNotationQuestion(params));
                        }
                        else if (config.id === 'auto_8_carres_3eme') {
                            for (let i = 0; i < 10; i++) pool.push(generateSquareQuestion(params));
                        }

                    }
                    else {
                        // Fallback : Base de données statique
                        pool = QUESTIONS_DB[config.id]?.[config.level] || [];
                    }
                } catch (err) {
                    console.error("Erreur config / Fallback", err);
                    pool = QUESTIONS_DB[config.id]?.[config.level] || [];
                }
            }

            // =========================================================
            // 3. PRÉPARATION DU JEU
            // =========================================================
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
    }, [config]);

    const handleAnswer = (idx) => {
        if (feedback) return;

        const clickedValue = q.mixedAnswers[idx];
        const isCorrect = clickedValue === q.correctTxt;

        if (isCorrect) {
            setScore(s => s + 1);
            onSound('CORRECT');
            setFeedback({
                type: 'CORRECT',
                msg: `Bravo ! ${q.e || ""}`
            });
            setTimeout(nextQuestion, 1000);
        } else {
            onSound('WRONG');
            let errorMsg = q.e || "";
            if (q.detailedFeedback && q.detailedFeedback[clickedValue]) {
                errorMsg = q.detailedFeedback[clickedValue];
            }
            setFeedback({
                type: 'WRONG',
                msg: `Perdu... ${errorMsg}`
            });

            // On ne met RIEN ici, l'élève cliquera sur le bouton "Suivant"
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
                        <div className="grid gap-3">{q.mixedAnswers.map((ans, idx) => {
                            let style = "p-4 rounded-xl font-bold text-lg border-2 text-left transition-all ";
                            if (selected === null) style += "bg-white border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 text-slate-600";
                            else {
                                if (idx === q.correctIndex) style += "bg-emerald-100 border-emerald-500 text-emerald-800";
                                else if (idx === selected) style += "bg-red-50 border-red-200 text-red-400 opacity-50";
                                else style += "bg-slate-50 border-slate-100 text-slate-300";
                            }
                            return <button key={`${current}-${idx}`} onClick={() => handleAnswer(idx)} disabled={selected !== null} className={style}>{ans}</button>
                        })}</div>
                        {feedback && (
                            <div className="mt-6 fade-in">
                                <div className={`p-4 rounded-xl border shadow-sm mb-4 ${feedback.type === 'CORRECT'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : 'bg-red-50 border-red-200 text-red-800'
                                    } text-center font-bold text-lg`}>
                                    {feedback.msg}
                                </div>

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