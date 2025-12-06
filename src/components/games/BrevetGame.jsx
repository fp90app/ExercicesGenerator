import React, { useState, useEffect } from 'react';
import { Icon } from '../UI';
import Calculator from '../Calculator';

const BrevetGame = ({ subject, onQuit, onFinish }) => {

    // --- 1. INITIALISATION DES ÉTATS (HOOKS) ---
    // En React, TOUS les hooks doivent être déclarés AVANT le moindre "return" conditionnel.

    const [slides, setSlides] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [gameState, setGameState] = useState('playing');
    const [showCalc, setShowCalc] = useState(false);

    // États d'interface
    const [mobileTab, setMobileTab] = useState('doc');
    const [isImageZoomed, setIsImageZoomed] = useState(false);

    // --- 6. MOTEUR DE CORRECTION ---
    const calculateDetails = () => {
        let totalUser = 0;
        let totalMax = 0;

        const report = subject.parts.map(part => {
            let partScore = 0;
            let partMax = 0;

            const exercisesDetails = part.exercises.map(exo => {
                let exoScore = 0;
                let exoMax = 0;

                exo.questions.forEach(q => {
                    if (q.type === 'info') return;

                    exoMax += q.point;

                    // Normalisation réponse
                    const userVal = String(answers[q.id] || "").trim().toLowerCase().replace(',', '.');
                    let isCorrect = false;

                    // Gestion réponses multiples (Array) ou simple
                    if (Array.isArray(q.correct)) {
                        isCorrect = q.correct.some(opt => String(opt).trim().toLowerCase() === userVal);
                    } else {
                        isCorrect = userVal === String(q.correct).trim().toLowerCase();
                    }

                    if (isCorrect) exoScore += q.point;
                });

                partScore += exoScore;
                partMax += exoMax;

                return { title: exo.title || "Exercice", score: exoScore, max: exoMax };
            });

            totalUser += partScore;
            totalMax += partMax;

            return {
                id: part.id,
                title: part.title,
                score: partScore,
                max: partMax,
                exercises: exercisesDetails
            };
        });

        const markOver20 = totalMax > 0 ? ((totalUser / totalMax) * 20).toFixed(1) : 0;

        return { totalUser, totalMax, markOver20, report };
    };


    // --- 2. LES EFFETS (USE EFFECT) ---

    // Effet 1 : Aplatir la structure du sujet
    useEffect(() => {
        if (subject) {
            const flat = [];
            subject.parts.forEach(part => {
                part.exercises.forEach(exo => {
                    flat.push({
                        ...exo,
                        partId: part.id,
                        partTitle: part.title,
                        partDesc: part.description
                    });
                });
            });
            setSlides(flat);
        }
    }, [subject]);

    // Effet 2 : Sécurité Calculatrice
    useEffect(() => {
        if (slides.length > 0 && slides[currentIndex]) {
            const currentPartId = slides[currentIndex].partId;
            if (currentPartId !== 'part2_pb') {
                setShowCalc(false);
            }
        }
    }, [currentIndex, slides]);

    // Effet 3 : SAUVEGARDE (CORRIGÉ)
    // On déclenche la sauvegarde UNIQUEMENT quand on passe en mode 'correction'
    useEffect(() => {
        if (gameState === 'correction') {
            // C'est ici qu'on appelle la fonction pour obtenir les résultats
            const { markOver20, totalUser, totalMax } = calculateDetails();

            const resultData = {
                markOver20: markOver20,
                score: totalUser,
                total: totalMax,
                date: new Date().toISOString(),
                title: subject ? subject.title : "Exercice"
            };

            if (onFinish) {
                onFinish(resultData);
            }
        }
    }, [gameState]); // On surveille le changement d'état du jeu


    // --- 3. CHARGEMENT (EARLY RETURN) ---
    // C'est SEULEMENT maintenant qu'on peut arrêter le rendu si c'est vide
    if (!subject || slides.length === 0) return <div className="p-10 text-center">Chargement du sujet...</div>;


    // --- 4. VARIABLES DÉRIVÉES (Sûres d'exister ici) ---
    const currentSlide = slides[currentIndex];
    // On redéfinit cette variable ici pour l'utiliser dans l'affichage (bouton header)
    const isCalcAllowed = currentSlide.partId === 'part2_pb';
    const isLastSlide = currentIndex === slides.length - 1;
    const isReview = gameState === 'review';


    // --- 5. LOGIQUE DE JEU (HANDLERS) ---
    const handleInput = (qId, val) => {
        setAnswers(prev => ({ ...prev, [qId]: val }));
    };

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            setCurrentIndex(c => c + 1);
            window.scrollTo(0, 0);
        } else {
            setGameState('correction');
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) setCurrentIndex(c => c - 1);
    };


    // --- 7. RENDU : ÉCRAN DE CORRECTION ---
    if (gameState === 'correction') {
        const { totalUser, totalMax, markOver20, report } = calculateDetails();

        // -------------------------------------------------------------

        return (
            <div className="min-h-screen bg-slate-50 p-4 md:p-8 animate-in fade-in overflow-y-auto font-sans">
                <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">

                    {/* EN-TÊTE SCORE */}
                    <div className="bg-slate-900 text-white p-8 text-center relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="uppercase tracking-widest text-xs font-bold text-slate-400 mb-2">Résultat Final</div>
                            <div className="text-6xl font-black mb-2 text-indigo-400">
                                {markOver20} <span className="text-2xl text-slate-500">/ 20</span>
                            </div>
                            <div className="inline-block bg-slate-800 rounded-full px-4 py-1 text-sm font-medium border border-slate-700">
                                Score brut : {totalUser} / {totalMax} points
                            </div>
                        </div>
                        <div className="absolute top-0 left-0 w-full h-full bg-indigo-600/10 mix-blend-overlay"></div>
                    </div>

                    {/* ALERTE RÉDACTION (Si configurée) */}
                    {subject.redactionPoints > 0 && (
                        <div className="mx-6 mb-6 bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg flex gap-3 items-start mt-6">

                            <div className="text-sm text-amber-800">
                                Le total des exercices est de <span className="font-bold">{subject.totalPoints} points</span> car les points réservés à la rédaction et au soin ne peuvent pas être évalués ici. Une règle de 3 a été utilisée pour donner la note sur 20 correspondant.
                            </div>
                        </div>
                    )}

                    {/* DÉTAIL PAR PARTIE */}
                    <div className="p-6 space-y-6 pt-0">
                        {report.map((part, idx) => (
                            <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                {/* Header Partie */}
                                <div className={`p-4 flex justify-between items-center ${part.id === 'part1_auto' ? 'bg-indigo-50/50' : 'bg-slate-50 border-b border-slate-200'}`}>
                                    <h3 className="font-bold text-slate-700">{part.title}</h3>
                                    <span className={`font-mono font-bold px-3 py-1 rounded border shadow-sm min-w-[80px] text-center ${part.score === part.max ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-white text-slate-900 border-slate-200'}`}>
                                        {part.score} / {part.max}
                                    </span>
                                </div>

                                {/* Liste Exercices (Sauf pour automatismes) */}
                                {part.id !== 'part1_auto' && (
                                    <div className="divide-y divide-slate-100 bg-white">
                                        {part.exercises.map((exo, i) => (
                                            <div key={i} className="p-3 flex justify-between items-center text-sm hover:bg-slate-50 transition-colors pl-8">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                                    {exo.title}
                                                </div>
                                                <span className={`font-bold ${exo.score === exo.max ? 'text-emerald-600' : (exo.score === 0 ? 'text-red-400' : 'text-slate-500')}`}>
                                                    {exo.score} / {exo.max}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* BOUTONS FINAUX */}
                    <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row gap-3">
                        <button onClick={() => setGameState('review')} className="flex-1 bg-white border-2 border-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm flex items-center justify-center gap-2">
                            <Icon name="magnifying-glass" /> Revoir ma copie
                        </button>
                        <button onClick={onQuit} className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2">
                            Quitter <Icon name="sign-out" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- 8. RENDU : INTERFACE JEU (PLAYING / REVIEW) ---
    return (
        <div className="flex flex-col h-screen bg-slate-100 overflow-hidden font-sans">

            {/* HEADER */}
            <div className="bg-white h-16 border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onQuit} className="text-slate-400 hover:text-red-500 transition-colors">
                        <Icon name="x" size={24} />
                    </button>
                    <div>
                        <h1 className="font-bold text-slate-800 leading-none hidden md:block">{subject.title}</h1>
                        <h1 className="font-bold text-slate-800 leading-none md:hidden text-sm">
                            Exercice {currentIndex + 1} <span className="text-slate-400">/ {slides.length}</span>
                        </h1>
                        <div className="text-xs text-slate-500 font-medium mt-1">
                            <span className="hidden md:inline">{currentSlide.partTitle} • </span>
                            <span className="text-indigo-600 font-bold">{currentSlide.title}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* BOUTON CALCULATRICE */}
                    {isCalcAllowed && (
                        <button
                            onClick={() => setShowCalc(!showCalc)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${showCalc
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-100'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                                }`}
                        >
                            <Icon name="calculator" weight={showCalc ? "fill" : "bold"} />
                            <span className="hidden md:inline">Calculatrice</span>
                        </button>
                    )}
                    {/* BADGE CORRECTION */}
                    {isReview && <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">Mode Correction</div>}
                </div>
            </div>

            {/* NAV MOBILE (ONGLETS) */}
            <div className="md:hidden flex border-b border-slate-200 bg-white shrink-0">
                <button onClick={() => setMobileTab('doc')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${mobileTab === 'doc' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'}`}>📄 Sujet</button>
                <button onClick={() => setMobileTab('questions')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${mobileTab === 'questions' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'}`}>✏️ Réponses</button>
            </div>

            {/* CONTENU PRINCIPAL (SPLIT SCREEN) */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">

                {/* --- GAUCHE : SUJET --- */}
                <div className={`w-full md:w-1/2 h-full bg-slate-200/50 p-4 overflow-auto flex items-start justify-center relative border-r border-slate-200 ${mobileTab === 'doc' ? 'flex' : 'hidden md:flex'}`}>
                    <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-200 max-w-full relative group">
                        <img
                            src={currentSlide.image}
                            alt="Sujet"
                            className="max-w-full w-full h-auto object-contain"
                            loading="lazy"
                        />
                        <button onClick={() => setIsImageZoomed(true)} className="absolute bottom-2 right-2 bg-white/90 p-2 rounded-full shadow text-indigo-600 hover:bg-indigo-50 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <Icon name="magnifying-glass-plus" size={24} />
                        </button>
                    </div>
                    <div className="absolute top-4 left-4 bg-slate-800/80 backdrop-blur text-white px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm pointer-events-none">Document</div>
                </div>

                {/* --- DROITE : QUESTIONS --- */}
                <div className={`w-full md:w-1/2 h-full bg-white overflow-y-auto relative scroll-smooth pb-32 ${mobileTab === 'questions' ? 'block' : 'hidden md:block'}`}>
                    <div className="p-4 md:p-8 max-w-xl mx-auto space-y-8">
                        {currentSlide.questions.map((q, idx) => {
                            const val = answers[q.id] || "";

                            // Style Correction
                            let statusColor = "border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50";
                            if (isReview && q.type !== 'text') {
                                const userValClean = String(val).trim().toLowerCase().replace(',', '.');
                                let isCorrect = false;
                                if (Array.isArray(q.correct)) isCorrect = q.correct.some(opt => String(opt).trim().toLowerCase() === userValClean);
                                else isCorrect = userValClean === String(q.correct).trim().toLowerCase();

                                statusColor = isCorrect ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "border-red-500 bg-red-50 text-red-900";
                            }

                            return (
                                <div key={q.id} className="animate-in slide-in-from-bottom-4 fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                                    <div className="flex justify-between items-baseline mb-2">
                                        <label className="text-sm font-bold text-slate-700">{q.label}</label>
                                        <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">{q.point} pts</span>
                                    </div>
                                    <div className="text-sm text-slate-600 mb-3 font-medium leading-relaxed">{q.question}</div>

                                    {/* Inputs */}
                                    {q.type === 'qcm' ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            {q.options.map(opt => {
                                                const isSelected = val === opt;
                                                let btnClass = "bg-white border-slate-200 text-slate-600 hover:border-indigo-300";
                                                if (isReview) {
                                                    if (opt === q.correct) {
                                                        // C'est la bonne réponse
                                                        if (isSelected) {
                                                            // CAS 1 : L'élève a trouvé -> VERT PLEIN (Succès)
                                                            btnClass = "bg-emerald-500 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300 font-black scale-105";
                                                        } else {
                                                            // CAS 2 : L'élève n'a pas trouvé -> BORDURE VERTE (Indication de la solution)
                                                            btnClass = "bg-white text-emerald-600 border-2 border-emerald-500 opacity-100 ring-1 ring-emerald-200 relative overflow-hidden";
                                                            // On peut même ajouter un petit style hachuré ou un texte pour dire "C'était ça"
                                                        }
                                                    } else if (isSelected) {
                                                        // CAS 3 : L'élève s'est trompé -> ROUGE
                                                        btnClass = "bg-red-400 text-white border-red-500 opacity-50 line-through decoration-2";
                                                    } else {
                                                        // CAS 4 : Autres options -> GRISÉ
                                                        btnClass = "opacity-30 grayscale border-transparent";
                                                    }
                                                }
                                                // --- LOGIQUE DE JEU (Pas de changement) ---
                                                else if (isSelected) {
                                                    btnClass = "bg-indigo-600 border-indigo-600 text-white shadow-md scale-[1.02]";
                                                }

                                                return (
                                                    <button
                                                        key={opt}
                                                        onClick={() => !isReview && handleInput(q.id, opt)}
                                                        disabled={isReview}
                                                        className={`p-3 rounded-xl border-2 font-bold text-sm transition-all text-left relative ${btnClass}`}
                                                    >
                                                        {opt}

                                                        {/* OPTIONNEL : Indicateur textuel explicite */}
                                                        {isReview && opt === q.correct && !isSelected && (
                                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                                                                Pas de réponse
                                                            </span>
                                                        )}
                                                        {isReview && isSelected && opt !== q.correct && (
                                                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                                                                Erreur
                                                            </span>
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <input
                                            type={q.type === 'number' ? 'number' : 'text'}
                                            // On s'assure que val est une chaîne vide si undefined
                                            value={val}
                                            onChange={(e) => handleInput(q.id, e.target.value)}
                                            disabled={isReview}
                                            className={`w-full p-4 rounded-xl border-2 outline-none transition-all font-mono text-lg font-bold ${isReview
                                                ? (
                                                    // LOGIQUE DE CORRECTION
                                                    // On recalcule la justesse ici pour déterminer la couleur
                                                    (() => {
                                                        const userValClean = String(val).trim().toLowerCase().replace(',', '.');
                                                        const correctValClean = String(q.correct).trim().toLowerCase();

                                                        let isCorrect = false;
                                                        if (Array.isArray(q.correct)) {
                                                            isCorrect = q.correct.some(opt => String(opt).trim().toLowerCase() === userValClean);
                                                        } else {
                                                            isCorrect = userValClean === correctValClean;
                                                        }

                                                        // SI CORRECT -> Vert
                                                        if (isCorrect) return "border-emerald-500 bg-emerald-50 text-emerald-900";

                                                        // SI VIDE (et donc Faux) -> Rouge (C'est ce qui manquait !)                         if (val === "") return "border-red-400 bg-red-50 text-red-900 placeholder-red-300";

                                                        // SI FAUX (et rempli) -> Rouge
                                                        return "border-red-500 bg-red-50 text-red-900";
                                                    })()
                                                )
                                                : "border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                                                }`}
                                            placeholder={isReview ? (val === "" ? "Pas de réponse" : "") : "Votre réponse..."}
                                        />
                                    )}

                                    {/* Correction */}
                                    {isReview && (
                                        <div className="mt-3 p-3 bg-slate-800 text-slate-200 rounded-xl text-sm leading-relaxed shadow-sm">
                                            <div className="flex items-center gap-2 font-bold text-emerald-400 mb-1 text-xs uppercase tracking-wider"><Icon name="check-circle" weight="fill" /> Correction</div>
                                            {q.type !== 'text' && <div className="mb-2 font-mono text-emerald-400 border-b border-slate-600 pb-2">Réponse : <span className="font-bold">{Array.isArray(q.correct) ? q.correct[0] : q.correct}</span></div>}
                                            <div className="opacity-90 italic">{q.correction}</div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* FOOTER */}
                <div className="absolute bottom-0 right-0 w-full md:w-1/2 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 flex justify-between items-center z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                    <button onClick={handlePrev} disabled={currentIndex === 0} className="text-slate-500 font-bold disabled:opacity-20 hover:text-indigo-600 flex items-center gap-2 transition-colors">
                        <Icon name="arrow-left" weight="bold" /> <span className="hidden md:inline">Précédent</span>
                    </button>
                    <div className="flex gap-1.5">
                        {slides.map((_, i) => (
                            <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-8 bg-indigo-600' : 'w-2 bg-slate-300'}`}></div>
                        ))}
                    </div>
                    <button onClick={handleNext} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 flex items-center gap-2">
                        {isLastSlide ? (isReview ? "Quitter" : "Voir ma note") : "Suivant"}
                        <Icon name={isLastSlide ? (isReview ? "sign-out" : "medal") : "arrow-right"} weight="bold" />
                    </button>
                </div>
            </div>

            {/* MODALE CALCULATRICE */}
            {showCalc && isCalcAllowed && (
                <div className="fixed bottom-20 left-4 z-40 md:top-24 md:left-auto md:right-4 md:bottom-auto animate-in zoom-in-95 duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden w-[300px]">
                        <div className="bg-slate-800 text-white px-4 py-2 flex justify-between items-center cursor-move select-none">
                            <span className="text-xs font-bold uppercase tracking-wider">Casio Collège</span>
                            <button onClick={() => setShowCalc(false)} className="hover:text-red-300"><Icon name="x" size={16} /></button>
                        </div>
                        <div className="bg-slate-100"><Calculator /></div>
                    </div>
                </div>
            )}

            {/* MODALE ZOOM IMAGE */}
            {isImageZoomed && (
                <div className="fixed inset-0 z-50 bg-slate-900/95 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsImageZoomed(false)}>
                    <img src={currentSlide.image} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl scale-100" alt="Zoom Sujet" onClick={(e) => e.stopPropagation()} />
                    <button className="absolute top-4 right-4 text-white p-2 hover:bg-white/20 rounded-full transition-colors"><Icon name="x" size={32} /></button>
                    <div className="absolute bottom-4 text-white text-sm opacity-50">Appuyez n'importe où pour fermer</div>
                </div>
            )}
        </div>
    );
};

export default BrevetGame;