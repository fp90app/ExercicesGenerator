import React, { useState, useEffect } from 'react';
// Chrono utilise généralement collection/query pour le leaderboard, mais pas doc/getDoc pour les exos procéduraux
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase";
import { Icon, Leaderboard } from '../UI';
// Chrono n'a besoin que des tables et divisions normalement
import { QUESTIONS_TABLES, QUESTIONS_DIVISIONS } from '../../utils/data';


const ChronoGame = ({ user, onFinish, onBack, onSound }) => {
    const [questions, setQuestions] = useState([]);
    const [current, setCurrent] = useState(0);
    const [startTime, setStartTime] = useState(null);
    const [now, setNow] = useState(null);
    const [finished, setFinished] = useState(false);
    const [penalty, setPenalty] = useState(0);
    const [shake, setShake] = useState(false);
    const [leaders, setLeaders] = useState({ my: [], class: [], profs: [] });

    useEffect(() => {
        const fetchChronoLeaderboard = async () => {
            const dbRef = db;

            try {
                // Champ créé dans saveProgress : 'best_grand_slam'
                // Attention : 'asc' ici car le meilleur temps est le plus petit
                const qEleves = query(collection(dbRef, "eleves"), orderBy("best_grand_slam", "asc"), limit(5));
                const qProfs = query(collection(dbRef, "profs"), orderBy("best_grand_slam", "asc"), limit(5));

                const [snapE, snapP] = await Promise.all([getDocs(qEleves), getDocs(qProfs)]);

                const formatLeaders = (snap) => snap.docs.map(d => ({
                    nom: d.data().nom,
                    val: (d.data().best_grand_slam || 999).toFixed(2), // Formatage 2 décimales
                    isUser: d.id === user.data.id
                }));

                // Mon historique local
                const myRaw = user.data.grand_slam_history || [];
                const myHistory = myRaw
                    .map(h => ({ val: parseFloat((typeof h === 'object' && h.val) ? h.val : h), isUser: true }))
                    .sort((a, b) => a.val - b.val)
                    .slice(0, 5)
                    .map(x => ({ ...x, val: x.val.toFixed(2) }));

                setLeaders({ my: myHistory, class: formatLeaders(snapE), profs: formatLeaders(snapP) });

            } catch (err) {
                console.error("Erreur classement Chrono (Index ?):", err);
            }
        };

        fetchChronoLeaderboard();

        // --- GÉNÉRATION DES QUESTIONS MIXTES ---
        let pool = [];
        // 1. Ajouter toutes les multiplications
        Object.values(QUESTIONS_TABLES).forEach(arr => pool.push(...arr));
        // 2. Ajouter toutes les divisions
        Object.values(QUESTIONS_DIVISIONS).forEach(arr => pool.push(...arr));

        // 3. Mélanger et en prendre 20
        // Copie du tableau pour éviter de muter l'original si nécessaire, puis tri
        // Note: Sort aléatoire simple suffisant ici
        const mixedPool = [...pool].sort(() => 0.5 - Math.random());
        const selection = mixedPool.slice(0, 20);

        // 4. Formater pour le jeu
        const qList = selection.map(q => {
            const answers = [...q.o];
            const correctTxt = answers[0];
            const mixed = answers.sort(() => 0.5 - Math.random());
            return { ...q, mixedAnswers: mixed, correctIndex: mixed.indexOf(correctTxt), correctTxt };
        });

        setQuestions(qList);
        setStartTime(Date.now());
    }, []); // Dépendances vides pour ne lancer qu'au montage

    useEffect(() => {
        if (!startTime || finished) return;
        const interval = setInterval(() => setNow(Date.now()), 30);
        return () => clearInterval(interval);
    }, [startTime, finished]);

    // DANS ChronoGame (Vers la ligne 390 environ)
    const handleAnswer = (idx) => {
        // Si le jeu est fini, on ne fait rien
        if (finished) return;

        // On vérifie si c'est le bon index (ChronoGame utilise questions[current].correctIndex)
        if (idx === questions[current].correctIndex) {
            onSound('CORRECT');
            // On passe direct à la suite
            if (current < questions.length - 1) setCurrent(c => c + 1);
            else { setFinished(true); onSound('WIN'); }
        } else {
            onSound('WRONG');
            // PÉNALITÉ DE TEMPS (Spécifique au Chrono)
            setPenalty(p => p + 5);
            // EFFET DE SECOUSSE (Spécifique au Chrono)
            setShake(true);
            setTimeout(() => setShake(false), 500);

            // Dans le chrono, on passe quand même à la suite même si c'est faux
            if (current < questions.length - 1) setCurrent(c => c + 1);
            else { setFinished(true); onSound('WIN'); }
        }
    };

    if (!questions.length) return <div className="text-white text-center mt-20 font-bold">Chargement du Grand Chelem...</div>;

    if (finished) {
        const rawTime = (Date.now() - startTime) / 1000;
        const finalTime = rawTime + penalty;
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-4xl w-full pop-in text-slate-800">
                    {/* ICONE VOITURE DE COURSE ou STOPWATCH */}
                    <div className="text-6xl mb-4 text-orange-500"><Icon name="stopwatch" /></div>
                    <h2 className="text-3xl font-black text-slate-800 mb-2">Terminé !</h2>
                    <div className="text-center bg-slate-50 p-4 rounded-xl mb-6 text-sm">
                        <div className="flex justify-center gap-4 text-lg">
                            <span>Temps : <b>{rawTime.toFixed(2)}s</b></span>
                            <span className="text-red-500">Pénalité : <b>+{penalty}s</b></span>
                        </div>
                        <div className="border-t pt-2 mt-2 font-black text-4xl text-indigo-600">{finalTime.toFixed(2)}s</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-left">
                        <Leaderboard title="Mon Historique" data={leaders.my} unit="s" />
                        <Leaderboard title="Top Élèves" data={leaders.class} unit="s" />
                        <Leaderboard title="Top Profs" data={leaders.profs} unit="s" />
                    </div>
                    <button onClick={() => onFinish(finalTime * 1000)} className="mt-8 w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:scale-105 transition-transform">Enregistrer</button>
                </div>
            </div>
        );
    }

    const displayTime = ((Date.now() - startTime) / 1000).toFixed(2);
    return (
        <div className={`min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 ${shake ? 'animate-pulse bg-red-900' : ''}`}>
            {/* BOUTON FERMER (CROIX) */}
            <button onClick={onBack} className="absolute top-16 right-4 text-slate-500 hover:text-white transition-colors">
                <Icon name="x" className="text-2xl" />
            </button>

            <div className="text-5xl font-mono font-black mb-2 text-yellow-400">{displayTime}s</div>
            {penalty > 0 && <div className="text-red-500 font-bold mb-6 text-xl">+ {penalty}s pénalité</div>}

            <div className="w-full max-w-lg">
                <div className="text-center mb-4 text-slate-400 font-bold tracking-widest uppercase text-xs">Question {current + 1} / 20</div>
                <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-700 text-center">
                    <h2 className="text-4xl font-bold mb-8">{questions[current].q}</h2>
                    <div className="grid grid-cols-2 gap-4">
                        {questions[current].mixedAnswers.map((a, i) => (
                            <button
                                key={i}
                                onClick={() => handleAnswer(i)}
                                className="p-6 bg-slate-700 hover:bg-indigo-600 rounded-xl font-bold text-2xl transition-all border border-slate-600 hover:border-indigo-400 hover:shadow-lg active:scale-95"
                            >
                                {a}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
export default ChronoGame;