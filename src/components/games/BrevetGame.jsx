import React, { useState, useEffect } from 'react';
import { Icon } from '../UI';

const BrevetGame = ({ subject, onQuit }) => {
    // 1. APLATIR LA STRUCTURE
    // On transforme la structure complexe (Parties > Exercices) en une liste linéaire de "Slides"
    // Chaque "Slide" correspond à une image et ses questions associées.
    const [slides, setSlides] = useState([]);

    useEffect(() => {
        if (subject) {
            const flat = [];
            subject.parts.forEach(part => {
                part.exercises.forEach(exo => {
                    flat.push({
                        ...exo,
                        partTitle: part.title,
                        partDesc: part.description
                    });
                });
            });
            setSlides(flat);
        }
    }, [subject]);

    // 2. ÉTATS DU JEU
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({}); // Stocke { "q1": "valeur", "q2": "valeur" }
    const [gameState, setGameState] = useState('playing'); // 'playing' ou 'correction'

    if (!subject || slides.length === 0) return <div>Chargement du sujet...</div>;

    const currentSlide = slides[currentIndex];
    const isLastSlide = currentIndex === slides.length - 1;

    // 3. LOGIQUE
    const handleInput = (qId, val) => {
        setAnswers(prev => ({ ...prev, [qId]: val }));
    };

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            setCurrentIndex(c => c + 1);
            window.scrollTo(0, 0); // Remonte en haut (utile sur mobile)
        } else {
            setGameState('correction');
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) setCurrentIndex(c => c - 1);
    };

    // Calcul du score (uniquement sur les questions automatiques)
    const calculateScore = () => {
        let score = 0;
        let totalAuto = 0;

        slides.forEach(slide => {
            slide.questions.forEach(q => {
                if (q.type !== 'text') { // On ne note pas les questions ouvertes
                    totalAuto += q.point;
                    // Comparaison simple (string) pour gérer les nombres et textes
                    if (String(answers[q.id] || "").trim() === String(q.correct)) {
                        score += q.point;
                    }
                }
            });
        });
        return { score, total: totalAuto };
    };

    // 4. RENDU : ÉCRAN DE RÉSULTATS
    if (gameState === 'correction') {
        const { score, total } = calculateScore();
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border border-slate-100">
                    <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
                        <Icon name="medal" weight="fill" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 mb-2">Épreuve Terminée !</h2>
                    <p className="text-slate-500 mb-6">Voici ton score sur la partie "Automatismes"</p>

                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mb-8">
                        <div className="text-5xl font-black text-indigo-600 mb-1">
                            {score} <span className="text-2xl text-slate-400">/ {total}</span>
                        </div>
                        <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Points Automatiques</div>
                    </div>

                    <button onClick={() => setGameState('review')} className="w-full mb-3 bg-white border-2 border-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:border-indigo-500 hover:text-indigo-600 transition-all">
                        🔍 Revoir ma copie et la correction
                    </button>
                    <button onClick={onQuit} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-all shadow-lg">
                        Quitter
                    </button>
                </div>
            </div>
        );
    }

    // MODE "REVIEW" : On affiche le sujet comme en jeu, mais avec les réponses colorées
    const isReview = gameState === 'review';

    // 5. RENDU : INTERFACE PRINCIPALE (SPLIT SCREEN)
    // 5. RENDU : INTERFACE PRINCIPALE (SPLIT SCREEN)
    return (
        <div className="flex flex-col h-screen bg-slate-100 overflow-hidden font-sans">

            {/* HEADER FIXE */}
            <div className="bg-white h-16 border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onQuit} className="text-slate-400 hover:text-red-500 transition-colors">
                        <Icon name="x" size={24} />
                    </button>
                    <div>
                        <h1 className="font-bold text-slate-800 leading-none">{subject.title}</h1>
                        <div className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-2">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{currentSlide.partTitle}</span>
                            <span>•</span>
                            <span>Exercice {currentIndex + 1} / {slides.length}</span>
                        </div>
                    </div>
                </div>
                {isReview && <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">Mode Correction</div>}
            </div>

            {/* CONTENU : SPLIT VIEW */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">

                {/* GAUCHE : LE SUJET (IMAGE) */}
                <div className="w-full md:w-1/2 h-2/5 md:h-full bg-slate-200/50 p-4 overflow-auto flex items-center justify-center relative border-b md:border-b-0 md:border-r border-slate-200">
                    <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-200 max-w-full">
                        <img
                            src={currentSlide.image}
                            alt="Sujet"
                            className="max-w-full h-auto object-contain"
                            loading="lazy"
                        />
                    </div>
                    <div className="absolute top-4 left-4 bg-slate-800/80 backdrop-blur text-white px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm pointer-events-none">
                        Document
                    </div>
                </div>

                {/* DROITE : LA COPIE (QUESTIONS) */}
                {/* CORRECTION ICI : 'overflow-y-auto' permet le scroll, et 'pb-32' ajoute une marge interne en bas */}
                <div className="w-full md:w-1/2 h-3/5 md:h-full bg-white overflow-y-auto relative scroll-smooth pb-32">
                    <div className="p-4 md:p-8 max-w-xl mx-auto space-y-8">

                        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <Icon name="pencil-simple" weight="fill" />
                            </div>
                            <h2 className="font-bold text-xl text-slate-800">À toi de jouer</h2>
                        </div>

                        {currentSlide.questions.map((q, idx) => {
                            const val = answers[q.id] || "";

                            let statusColor = "border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50";
                            if (isReview && q.type !== 'text') {
                                const isCorrect = String(val).trim() === String(q.correct);
                                statusColor = isCorrect
                                    ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                                    : "border-red-500 bg-red-50 text-red-900";
                            }

                            return (
                                <div key={q.id} className="animate-in slide-in-from-bottom-4 fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                                    <div className="flex justify-between items-baseline mb-2">
                                        <label className="text-sm font-bold text-slate-700">{q.label}</label>
                                        <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">{q.point} pts</span>
                                    </div>

                                    <div className="text-sm text-slate-600 mb-3 font-medium">{q.question}</div>

                                    {/* INPUT : QCM */}
                                    {q.type === 'qcm' && (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                            {q.options.map(opt => {
                                                const isSelected = val === opt;
                                                let btnStyle = "bg-white border-slate-200 text-slate-600 hover:border-indigo-300";

                                                if (isReview) {
                                                    if (opt === q.correct) btnStyle = "bg-emerald-500 border-emerald-600 text-white shadow-md";
                                                    else if (isSelected) btnStyle = "bg-red-400 border-red-500 text-white opacity-50";
                                                    else btnStyle = "opacity-30 grayscale";
                                                } else if (isSelected) {
                                                    btnStyle = "bg-indigo-600 border-indigo-600 text-white shadow-md scale-[1.02]";
                                                }

                                                return (
                                                    <button
                                                        key={opt}
                                                        onClick={() => !isReview && handleInput(q.id, opt)}
                                                        disabled={isReview}
                                                        className={`p-3 rounded-xl border-2 font-bold text-sm transition-all ${btnStyle}`}
                                                    >
                                                        {opt}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {/* INPUT : NUMBER / TEXT */}
                                    {(q.type === 'number' || q.type === 'text') && (
                                        <input
                                            type={q.type === 'number' ? 'number' : 'text'}
                                            value={val}
                                            onChange={(e) => handleInput(q.id, e.target.value)}
                                            disabled={isReview}
                                            placeholder="Votre réponse..."
                                            className={`w-full p-4 rounded-xl border-2 outline-none transition-all font-mono text-lg font-bold ${statusColor}`}
                                        />
                                    )}

                                    {/* CORRECTION */}
                                    {isReview && (
                                        <div className="mt-3 p-4 bg-slate-800 text-slate-200 rounded-xl text-sm leading-relaxed shadow-sm">
                                            <div className="flex items-center gap-2 font-bold text-emerald-400 mb-1 text-xs uppercase tracking-wider">
                                                <Icon name="check-circle" /> Correction
                                            </div>
                                            {q.type !== 'text' && <div className="mb-2 font-mono text-emerald-400 font-bold">Réponse attendue : {q.correct}</div>}
                                            <div className="opacity-90">{q.correction}</div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* BARRE DE NAVIGATION FLOTTANTE (Fixée en bas à droite) */}
                <div className="absolute bottom-0 right-0 w-full md:w-1/2 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 flex justify-between items-center z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                    <button
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className="text-slate-500 font-bold disabled:opacity-20 hover:text-indigo-600 flex items-center gap-2 transition-colors"
                    >
                        <Icon name="arrow-left" weight="bold" /> <span className="hidden md:inline">Précédent</span>
                    </button>

                    <div className="flex gap-1.5">
                        {slides.map((_, i) => (
                            <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-8 bg-indigo-600' : 'w-2 bg-slate-300'}`}></div>
                        ))}
                    </div>

                    <button
                        onClick={handleNext}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        {isLastSlide ? (isReview ? "Quitter" : "Terminer") : "Suivant"}
                        <Icon name={isLastSlide ? (isReview ? "sign-out" : "check") : "arrow-right"} weight="bold" />
                    </button>
                </div>

            </div>
        </div>
    );
};


export default BrevetGame;