import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase";
import { Icon, Leaderboard } from '../UI';
import { QUESTIONS_DB, PROCEDURAL_EXOS, AUTOMATISMES_DATA, TRAINING_MODULES } from '../../utils/data';
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

const SurvivalGameLogic = ({ modeId, onFinish, onSound, user }) => {
    const [q, setQ] = useState(null);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(15);
    const [gameOver, setGameOver] = useState(false);
    const [leaders, setLeaders] = useState({ my: [], class: [], profs: [] });
    const [feedback, setFeedback] = useState(null);

    // --- CHARGEMENT CLASSEMENT (inchangé) ---
    useEffect(() => {
        if (gameOver) {
            let isMounted = true;
            const fetchOptimizedLeaderboard = async () => {
                const dbRef = db;
                const fieldName = `best_scores.${modeId}`;
                try {
                    const qEleves = query(collection(dbRef, "eleves"), orderBy(fieldName, "desc"), limit(5));
                    const qProfs = query(collection(dbRef, "profs"), orderBy(fieldName, "desc"), limit(5));
                    const [snapE, snapP] = await Promise.all([getDocs(qEleves), getDocs(qProfs)]);
                    if (!isMounted) return;

                    const formatLeaders = (snap) => {
                        return snap.docs.map(doc => ({
                            nom: doc.data().nom || "Anonyme",
                            classe: doc.data().classe || "-",
                            val: doc.data().best_scores?.[modeId] || 0,
                            isUser: doc.id === user.data.id
                        }));
                    };

                    let myRaw = user.data.survival_history?.[modeId];
                    let myArr = Array.isArray(myRaw) ? myRaw : (typeof myRaw === 'number' ? [myRaw] : []);
                    const myHistory = myArr
                        .map(x => ({ val: (typeof x === 'object' ? x.val : x), isUser: true }))
                        .sort((a, b) => b.val - a.val)
                        .slice(0, 5);

                    setLeaders({ my: myHistory, class: formatLeaders(snapE), profs: formatLeaders(snapP) });
                } catch (err) { console.error("Erreur classement:", err); }
            };
            fetchOptimizedLeaderboard();
            return () => { isMounted = false; };
        }
    }, [gameOver, modeId, user]);

    const modes = {
        EXPLORATEUR: { time: 15, level: 1 },
        AVENTURIER: { time: 15, level: 2 },
        LEGENDE: { time: 15, level: 3 }
    };

    // --- GÉNÉRATION QUESTION (inchangé) ---
    const nextQ = async () => {
        setFeedback(null); // On cache le feedback pour la nouvelle question
        const currentModeConfig = modes[modeId];
        const currentLevel = currentModeConfig.level;

        const allSources = [...AUTOMATISMES_DATA.flatMap(cat => cat.exos), ...TRAINING_MODULES];
        const allPlayableIds = allSources.map(e => e.id).filter(id => {
            if (user.allowed && !user.allowed.includes(id)) return false;
            if (PROCEDURAL_EXOS.includes(id)) return true;
            if (QUESTIONS_DB[id] && QUESTIONS_DB[id][currentLevel] && QUESTIONS_DB[id][currentLevel].length > 0) return true;
            return false;
        });

        if (allPlayableIds.length === 0) {
            alert("Aucune question disponible !");
            onFinish(score);
            return;
        }

        const randId = allPlayableIds[Math.floor(Math.random() * allPlayableIds.length)];
        let quest = null;

        if (PROCEDURAL_EXOS.includes(randId)) {
            try {
                const docRef = doc(db, "configs_exercices", randId);
                const snap = await getDoc(docRef);
                let params = { level: currentLevel };
                if (snap.exists() && snap.data()[currentLevel]) params = { ...snap.data()[currentLevel], level: currentLevel };

                if (randId === 'auto_1_ecriture_decimale_fractions') quest = generateFractionQuestion(params);
                else if (randId === 'auto_2_comparaison_calcul_decimaux') quest = generateDecimalQuestion(params);
                else if (randId === 'auto_3_fractions_calc') quest = generateFractionOpsQuestion(params);
                else if (randId === 'auto_4_fraction_nombre') quest = generateFractionOfNumberQuestion(params);
                else if (randId === 'auto_5_pourcentages') quest = generatePercentQuestion(params);
                else if (randId === 'auto_6_formes_multiples') quest = generateMultipleFormsQuestion(params);
                else if (randId === 'auto_7_ecriture_sci') quest = generateScientificNotationQuestion(params);
                else if (randId === 'auto_8_carres_3eme') quest = generateSquareQuestion(params);
            } catch (e) { console.error(e); }
        } else {
            const pool = QUESTIONS_DB[randId][currentLevel];
            quest = pool[Math.floor(Math.random() * pool.length)];
        }

        if (quest) {
            const correctTxt = quest.o[quest.c];
            const answers = [...quest.o].sort(() => 0.5 - Math.random());
            setQ({ ...quest, mixedAnswers: answers, correctTxt: correctTxt });
            setTimeLeft(currentModeConfig.time);
        } else {
            setTimeout(() => nextQ(), 500);
        }
    };

    useEffect(() => { nextQ(); }, []);

    // --- TIMER ---
    useEffect(() => {
        if (gameOver || feedback) return; // Le timer pause si feedback affiché
        const timer = setInterval(() => { setTimeLeft(t => { if (t <= 0) { clearInterval(timer); setGameOver(true); return 0; } return t - 0.1; }); }, 100);
        return () => clearInterval(timer);
    }, [q, gameOver, feedback]);


    // --- GESTION RÉPONSE (CORRIGÉE) ---
    const handleAnswer = (idx) => {
        // CORRECTION 1: 'finished' n'existe pas -> 'gameOver'
        if (feedback || gameOver) return;

        const clickedValue = q.mixedAnswers[idx];
        const isCorrect = clickedValue === q.correctTxt;

        if (isCorrect) {
            setScore(s => s + 1);
            onSound('CORRECT');
            setFeedback({ type: 'CORRECT', msg: `Bravo ! ${q.e || ""}` });

            // CORRECTION 2: 'nextQuestion' n'existe pas -> 'nextQ'
            setTimeout(() => { nextQ(); }, 1000);
        } else {
            onSound('WRONG');
            let errorMsg = q.e || "";
            if (q.detailedFeedback && q.detailedFeedback[clickedValue]) {
                errorMsg = q.detailedFeedback[clickedValue];
            }
            setFeedback({ type: 'WRONG', msg: `Oups... ${errorMsg}` });
            // Ici on n'appelle pas nextQ() automatiquement, l'utilisateur devra cliquer sur "Continuer"
        }
    };

    // --- VUE GAMEOVER (inchangée) ---
    if (gameOver) return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-indigo-800 p-8 rounded-3xl shadow-2xl text-center max-w-4xl w-full pop-in text-white border border-slate-700">
                <div className="text-6xl mb-4"><Icon name="skull" className="text-white" /></div>
                <h2 className="text-3xl font-black mb-2">Terminé !</h2>
                <div className="text-center bg-slate-900/50 p-4 rounded-xl mb-6">
                    <p className="text-slate-400 text-sm uppercase font-bold">Score final</p>
                    <div className="text-6xl font-black text-emerald-500 mt-2">{score}</div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-left mb-8">
                    <Leaderboard title="Mon Historique" data={leaders.my} unit="" />
                    <Leaderboard title="Top Élèves" data={leaders.class} unit="" />
                    <Leaderboard title="Top Profs" data={leaders.profs} unit="" />
                </div>
                <button onClick={() => onFinish(score)} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-500 transition-all transform hover:scale-105">Enregistrer & Quitter</button>
            </div>
        </div>
    );

    if (!q) return <div className="text-white text-center mt-20">Chargement...</div>;

    // --- VUE JEU ---
    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
            {!feedback && (
                <button onClick={() => onFinish(score)} className="absolute top-16 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-red-500 flex items-center justify-center transition-colors z-40">
                    <Icon name="x" className="text-xl" />
                </button>
            )}

            <div className="w-full max-w-lg mb-6">
                <div className="flex justify-between font-bold mb-2 text-xl"><span>Score : {score}</span> <span className={timeLeft < 5 ? "text-red-500" : "text-white"}>{Math.ceil(timeLeft)}s</span></div>
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden"><div className={`h-full transition-all duration-100 ${timeLeft < 5 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${(timeLeft / 15) * 100}%` }}></div></div>
            </div>

            <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-lg text-center border border-slate-700">
                <h2 className="text-2xl font-bold mb-8 leading-relaxed">{q.q}</h2>

                <div className="grid grid-cols-1 gap-3">
                    {q.mixedAnswers.map((a, i) => {
                        let btnClass = "p-4 rounded-xl font-bold transition-all text-lg border ";

                        if (feedback) {
                            // CORRECTION 3: Comparer le texte et pas l'index (car mixedAnswers est mélangé)
                            if (a === q.correctTxt) btnClass += "bg-emerald-600 border-emerald-500 text-white";
                            else if (i === i) btnClass += "bg-slate-700 border-slate-600 opacity-30"; // Les autres grisées
                        } else {
                            btnClass += "bg-slate-700 hover:bg-indigo-500 border-slate-600 hover:border-white hover:scale-105";
                        }

                        return (
                            <button
                                key={i}
                                onClick={() => handleAnswer(i)}
                                className={btnClass}
                                disabled={!!feedback}
                            >
                                {a}
                            </button>
                        );
                    })}
                </div>

                {/* CORRECTION 4: Le feedback a maintenant un bouton pour passer à la suite */}
                {feedback && (
                    <div className={`mt-6 p-4 rounded-xl border font-bold pop-in ${feedback.type === 'CORRECT' ? 'bg-emerald-900/50 border-emerald-500 text-emerald-100' : 'bg-red-900/50 border-red-500 text-red-100'}`}>
                        <div className="text-xl mb-2 flex items-center justify-center gap-2">
                            <Icon name={feedback.type === 'CORRECT' ? "check-circle" : "warning-circle"} />
                            {feedback.type === 'CORRECT' ? "Excellent !" : "Oups !"}
                        </div>
                        <div className="mb-4">{feedback.msg}</div>

                        {/* C'est CE bouton qui manquait pour débloquer le jeu en cas d'erreur */}
                        <button onClick={nextQ} className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 mx-auto">
                            Continuer <Icon name="arrow-right" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SurvivalGameLogic;