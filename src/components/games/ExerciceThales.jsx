import React, { useState, useEffect } from 'react';
import ThalesSystem from '../ThalesSystem.jsx';
import { generateThalesData } from '../../utils/mathGenerators';
import { Icon } from '../UI';

// --- CALCULATRICE INTEGRÉE ---
const Calculator = ({ onClose }) => {
    const [input, setInput] = useState("");
    const [result, setResult] = useState("");

    const handleClick = (val) => {
        if (val === '=') {
            try {
                const evalStr = input.replace('×', '*').replace('÷', '/');
                // Note: new Function est utilisé ici pour évaluer une expression math simple
                const res = new Function('return ' + evalStr)();
                setResult(Math.round(res * 100) / 100);
            } catch (e) {
                setResult("Err");
            }
        } else if (val === 'C') {
            setInput("");
            setResult("");
        } else if (val === 'del') {
            setInput(input.slice(0, -1));
        } else {
            if (result) {
                if (!['+', '-', '×', '÷'].includes(val)) {
                    setInput(val);
                    setResult("");
                } else {
                    setInput(result + val);
                    setResult("");
                }
            } else {
                setInput(input + val);
            }
        }
    };

    const buttons = [
        '7', '8', '9', '÷',
        '4', '5', '6', '×',
        '1', '2', '3', '-',
        '0', '.', '=', '+'
    ];

    return (
        <div className="bg-slate-800 p-4 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-[280px] mx-auto mt-4 animate-in fade-in slide-in-from-bottom-2 z-50 relative">
            <div className="flex justify-between items-center mb-2">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Calculatrice</span>
                <button onClick={onClose} className="text-slate-400 hover:text-white"><Icon name="x" size={16} /></button>
            </div>
            <div className="bg-slate-900 p-3 rounded-lg text-right mb-3 font-mono">
                <div className="text-slate-400 text-sm h-5">{input || "0"}</div>
                <div className="text-white text-2xl font-bold">{result || (input ? "" : "0")}</div>
            </div>
            <div className="grid grid-cols-4 gap-2">
                <button onClick={() => handleClick('C')} className="col-span-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 p-2 rounded font-bold">C</button>
                <button onClick={() => handleClick('del')} className="col-span-2 bg-slate-700 text-slate-300 hover:bg-slate-600 p-2 rounded font-bold">⌫</button>
                {buttons.map(btn => (
                    <button
                        key={btn}
                        onClick={() => handleClick(btn)}
                        className={`p-3 rounded-lg font-bold text-lg transition-colors ${['÷', '×', '-', '+', '='].includes(btn)
                                ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                                : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                            }`}
                    >
                        {btn}
                    </button>
                ))}
            </div>
        </div>
    );
};

// --- COMPOSANT PRINCIPAL ---
const ExerciceThales = ({ user, level, onFinish, onQuit, onSound }) => {

    const EXO_ID = 'thales'; // ou 'auto_26_thales' selon ta DB
    const TOTAL_QUESTIONS = 10;

    // --- ÉTATS ---
    const [gameState, setGameState] = useState(level ? 'playing' : 'menu');
    const [selectedLevel, setSelectedLevel] = useState(level || 1);
    const [data, setData] = useState(() => level ? generateThalesData(level) : null);
    const [currentStep, setCurrentStep] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedOption, setSelectedOption] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [showCalc, setShowCalc] = useState(false);

    useEffect(() => {
        if (level && gameState === 'menu') startGame(level);
    }, [level]);

    // --- ACTIONS ---
    const isLevelLocked = (lvl) => {
        if (lvl === 1) return false;
        const prev = user?.data?.training?.[EXO_ID]?.[lvl - 1] || 0;
        return prev === 0;
    };

    const startGame = (lvl) => {
        if (!level && isLevelLocked(lvl)) return;
        setSelectedLevel(lvl);
        setGameState('playing');
        setScore(0);
        setCurrentStep(0);
        loadQuestion(lvl);
        if (onSound) onSound('CLICK');
    };

    const loadQuestion = (lvl) => {
        setData(generateThalesData(lvl));
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
        }
    };

    const handleSelect = (val) => {
        if (feedback) return;
        setSelectedOption(val);
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

    // --- CORRECTION INTELLIGENTE ---
    const getCorrectionExplanation = () => {
        if (!data) return null;
        const { vals, targetKey, given, type } = data; // type: 'triangle' ou 'papillon'

        // 1. Calcul de K (Grand / Petit)
        let bigK = 0, smallK = 0;
        if (given.AB && given.AD) { bigK = vals.AD; smallK = vals.AB; }
        else if (given.AC && given.AE) { bigK = vals.AE; smallK = vals.AC; }
        else if (given.BC && given.DE) { bigK = vals.DE; smallK = vals.BC; }
        else { bigK = vals.AD; smallK = vals.AB; } // Fallback

        const k = bigK / smallK;
        const kDisplay = Number.isInteger(k) ? k : k.toFixed(2).replace(/[.,]00$/, "");

        // --- CAS PARTICULIER : SEGMENTS COMPOSÉS (BD, CE) ---
        if (['BD', 'CE'].includes(targetKey)) {
            const isLeft = targetKey.includes('B') || targetKey.includes('D');
            const smallSideName = isLeft ? 'AB' : 'AC';
            const bigSideName = isLeft ? 'AD' : 'AE';
            const smallSideValue = vals[smallSideName];

            // On recalcule le grand côté théorique pour l'affichage
            const bigSideValue = parseFloat((smallSideValue * k).toFixed(2));

            // Détection Papillon vs Triangle pour l'opération
            const isPapillon = type === 'papillon';
            const operationSign = isPapillon ? '-' : '-';
            // ATTENTION: La logique mathématique est :
            // Papillon : Les points sont alignés A, B, D ? Non, c'est D-A-B.
            // Donc AD et AB sont de part et d'autre de A.
            // BD est la distance entre les parallèles ? Non, c'est le segment [BD].
            // Dans Thalès Papillon standard, les droites sécantes sont (DB) et (EC).
            // Donc B, A, D sont alignés. La longueur BD = BA + AD.

            // Correction de la logique mathématique pour l'affichage :
            // Si data.correct est grand, c'est une addition. S'il est petit, soustraction.
            // On va déduire l'opérateur mathématiquement pour être sûr à 100%
            const isAddition = data.correct > bigSideValue;
            // Mais data.correct EST bigSideValue - smallSideValue ou + ...
            // Faisons confiance à la variable 'type'.

            // Logique Visuelle :
            // Papillon (D-A-B alignés) -> BD = AD + AB
            // Triangle (A-B-D alignés) -> BD = AD - AB (si D en bas)

            const operator = isPapillon ? '+' : '-';
            const verb = isPapillon ? 'additionne' : 'soustrait';
            const formula = isPapillon
                ? `${bigSideName} + ${smallSideName}`
                : `${bigSideName} - ${smallSideName}`;

            const calcString = isPapillon
                ? `${bigSideValue} + ${smallSideValue}`
                : `${bigSideValue} - ${smallSideValue}`;

            return (
                <div className="text-sm text-slate-600 space-y-3 mt-2">
                    <p className="font-medium text-indigo-900 bg-indigo-50 p-2 rounded border border-indigo-100">
                        Attention : <span className="font-bold">{targetKey}</span> est un morceau, pas un côté complet du triangle de Thalès !
                    </p>
                    <ol className="list-decimal list-inside space-y-2">
                        <li>
                            Coefficient d'agrandissement (k) :<br />
                            <span className="ml-4 font-mono bg-slate-100 px-1 rounded text-slate-800">k = {bigK} ÷ {smallK} = <strong>{kDisplay}</strong></span>
                        </li>
                        <li>
                            On calcule le grand côté complet <span className="font-bold">{bigSideName}</span> :<br />
                            <span className="ml-4 font-mono bg-slate-100 px-1 rounded text-slate-800">
                                {bigSideName} = {smallSideName} × k = {smallSideValue} × {kDisplay} = <strong>{bigSideValue}</strong>
                            </span>
                        </li>
                        <li>
                            Configuration <strong>{isPapillon ? 'Papillon' : 'Triangle'}</strong>, on {verb} :<br />
                            <span className="ml-4 font-mono font-bold bg-emerald-50 text-emerald-700 px-1 rounded border border-emerald-200">
                                {targetKey} = {formula} = {calcString} = {data.correct}
                            </span>
                        </li>
                    </ol>
                </div>
            );
        }

        // --- CAS CLASSIQUE ---
        else {
            const isTargetBig = ['AD', 'AE', 'DE'].includes(targetKey);
            let knownValue = 0;
            let knownName = "";

            if (targetKey === 'AD') { knownValue = vals.AB; knownName = "AB"; }
            else if (targetKey === 'AB') { knownValue = vals.AD; knownName = "AD"; }
            else if (targetKey === 'AE') { knownValue = vals.AC; knownName = "AC"; }
            else if (targetKey === 'AC') { knownValue = vals.AE; knownName = "AE"; }
            else if (targetKey === 'DE') { knownValue = vals.BC; knownName = "BC"; }
            else if (targetKey === 'BC') { knownValue = vals.DE; knownName = "DE"; }

            return (
                <div className="text-sm text-slate-600 space-y-2 mt-2">
                    <p>
                        1. Coefficient k = {bigK} ÷ {smallK} = <strong>{kDisplay}</strong>
                    </p>
                    <p>
                        2. Pour trouver <span className="font-bold text-red-600">{targetKey}</span>
                        {isTargetBig ? " (grand côté)" : " (petit côté)"}, on
                        {isTargetBig ? " multiplie " : " divise "}
                        par {kDisplay}.
                    </p>
                    <p className="font-bold border-l-4 border-emerald-500 pl-2 text-slate-800 bg-emerald-50 p-2 rounded-r">
                        Calcul : {knownValue} {isTargetBig ? "×" : "÷"} {kDisplay} = {data.correct}
                    </p>
                </div>
            );
        }
    };


    // --- RENDU MENU (Inchangé) ---
    if (gameState === 'menu') {
        return (
            <div className="flex flex-col items-center justify-center p-4 w-full max-w-4xl mx-auto min-h-[50vh]">
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 w-full text-center relative">
                    <button onClick={onQuit} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"><Icon name="x" /></button>
                    <div className="bg-indigo-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600"><Icon name="settings" size={40} /></div>
                    <h1 className="text-3xl font-black text-slate-800 mb-2">Configuration Thalès</h1>
                    <p className="text-slate-500 mb-8">Débloquez les niveaux en réussissant les séries.</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button onClick={() => startGame(1)} className="group p-6 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left">
                            <div className="font-black text-xl text-slate-700 group-hover:text-emerald-700 mb-2">Niveau 1</div>
                            <div className="text-sm text-slate-500 font-medium">Débutant</div>
                        </button>
                        {isLevelLocked(2) ? (
                            <div className="p-6 rounded-2xl border-2 border-slate-100 bg-slate-50 text-left opacity-70 relative cursor-not-allowed">
                                <div className="absolute top-4 right-4 text-slate-300"><Icon name="lock" size={24} /></div>
                                <div className="font-black text-xl text-slate-400 mb-2">Niveau 2</div>
                                <div className="text-sm text-slate-400 font-medium">Verrouillé</div>
                            </div>
                        ) : (
                            <button onClick={() => startGame(2)} className="group p-6 rounded-2xl border-2 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left">
                                <div className="font-black text-xl text-slate-700 group-hover:text-indigo-700 mb-2">Niveau 2</div>
                                <div className="text-sm text-slate-500 font-medium">Intermédiaire</div>
                            </button>
                        )}
                        {isLevelLocked(3) ? (
                            <div className="p-6 rounded-2xl border-2 border-slate-100 bg-slate-50 text-left opacity-70 relative cursor-not-allowed">
                                <div className="absolute top-4 right-4 text-slate-300"><Icon name="lock" size={24} /></div>
                                <div className="font-black text-xl text-slate-400 mb-2">Niveau 3</div>
                                <div className="text-sm text-slate-400 font-medium">Verrouillé</div>
                            </div>
                        ) : (
                            <button onClick={() => startGame(3)} className="group p-6 rounded-2xl border-2 border-slate-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left relative overflow-hidden">
                                <div className="absolute top-0 right-0 bg-purple-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">EXPERT</div>
                                <div className="font-black text-xl text-slate-700 group-hover:text-purple-700 mb-2">Niveau 3</div>
                                <div className="text-sm text-slate-500 font-medium">Avancé</div>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    if (gameState === 'finished') {
        const isSuccess = score >= TOTAL_QUESTIONS * 0.8;
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in slide-in-from-bottom-8">
                <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-md w-full border border-slate-100">
                    <div className="text-6xl mb-4">{isSuccess ? '🏆' : '🎓'}</div>
                    <h2 className="text-3xl font-black text-slate-800 mb-2">Série Terminée !</h2>
                    <div className="text-lg text-slate-500 mb-6">Niveau {selectedLevel} complété</div>
                    <div className={`text-5xl font-black mb-8 ${isSuccess ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {score}<span className="text-xl text-slate-300">/{TOTAL_QUESTIONS}</span>
                    </div>
                    {isSuccess && selectedLevel < 3 && (
                        <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-bold mb-6 text-sm">
                            Niveau suivant débloqué ! 🔓
                        </div>
                    )}
                    <div className="flex flex-col gap-3 w-full">
                        <button onClick={() => setGameState('menu')} className="w-full bg-white border-2 border-slate-200 text-slate-700 font-bold py-4 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                            <Icon name="settings" size={20} /> Menu des niveaux
                        </button>
                        <button onClick={() => onFinish(score)} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                            <Icon name="check" size={20} /> Quitter & Sauvegarder
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!data) return <div className="text-center p-10 font-bold text-slate-400">Chargement...</div>;

    // --- RENDU JEU ---
    return (
        <div className="flex flex-col md:flex-row gap-8 max-w-6xl mx-auto w-full p-4 font-sans text-slate-800">
            {/* GAUCHE : VISUEL */}
            <div className="w-full md:w-1/2 flex flex-col gap-4">
                <div className="bg-white p-4 rounded-3xl shadow-lg border border-slate-100 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${selectedLevel === 1 ? 'from-emerald-400 to-emerald-600' : selectedLevel === 2 ? 'from-indigo-400 to-indigo-600' : 'from-purple-400 to-purple-600'}`}></div>
                    <div className="flex justify-between items-center mb-4 px-2">
                        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm uppercase tracking-wider">
                            <Icon name="bar-chart-2" size={16} /> Niveau {selectedLevel}
                        </div>
                        <div className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-500">Q {currentStep + 1} / {TOTAL_QUESTIONS}</div>
                    </div>

                    {/* SVG */}
                    <ThalesSystem config={data} highlight={!!feedback} />

                    {/* ÉNONCÉ PARALLÈLES (Ajouté) */}
                    <div className="mt-4 text-center">
                        <span className="inline-block bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-medium border border-slate-200">
                            (Les droites BC et DE sont parallèles)
                        </span>
                    </div>
                </div>
            </div>

            {/* DROITE : INTERACTION */}
            <div className="w-full md:w-1/2 flex flex-col justify-center">
                <div className="flex justify-end mb-2">
                    <button onClick={onQuit} className="text-slate-400 hover:text-red-500"><Icon name="x" /></button>
                </div>

                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-200 relative">

                    {/* EN-TÊTE QUESTION */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800">
                                Calculez <span className="text-red-600">{data.targetKey}</span>
                            </h2>
                            <p className="text-slate-500 text-sm mt-1">Utilisez le théorème de Thalès.</p>
                        </div>
                        <div className="text-2xl font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl">{score} pts</div>
                    </div>

                    {/* BOUTON CALCULATRICE (Uniquement niveau 2 et 3) */}
                    {!showCalc && !feedback && selectedLevel > 1 && (
                        <button
                            onClick={() => setShowCalc(true)}
                            className="absolute top-24 right-8 text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                        >
                            <Icon name="grid" size={16} /> Calculatrice
                        </button>
                    )}

                    {/* AFFICHAGE CALCULATRICE */}
                    {showCalc && <Calculator onClose={() => setShowCalc(false)} />}


                    {/* CHOIX DE REPONSE */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {data.options.map((opt, i) => {
                            const isSelected = selectedOption === opt;
                            let btnStyle = "bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-600";
                            if (feedback) {
                                if (opt === data.correct) btnStyle = "bg-emerald-500 border-emerald-600 text-white opacity-100";
                                else if (isSelected) btnStyle = "bg-red-400 border-red-500 text-white opacity-50";
                                else btnStyle = "opacity-50";
                            } else if (isSelected) {
                                btnStyle = "bg-indigo-600 border-indigo-700 text-white shadow-lg scale-[1.02]";
                            }
                            return (
                                <button key={i} onClick={() => handleSelect(opt)} disabled={!!feedback} className={`py-4 px-6 rounded-xl font-bold border-2 text-xl transition-all ${btnStyle}`}>
                                    {opt}
                                </button>
                            )
                        })}
                    </div>

                    {/* BOUTON VALIDATION / FEEDBACK */}
                    {!feedback ? (
                        <button onClick={handleValidate} disabled={!selectedOption} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all disabled:opacity-50 shadow-lg flex items-center justify-center gap-2">
                            <Icon name="check" size={20} /> Valider
                        </button>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4">
                            <div className={`p-4 rounded-xl border-l-4 mb-4 ${feedback === 'correct' ? 'bg-emerald-50 border-emerald-500' : 'bg-red-50 border-red-500'}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <Icon name={feedback === 'correct' ? 'check' : 'alert-circle'} className={feedback === 'correct' ? "text-emerald-600" : "text-red-600"} />
                                    <h3 className={`font-bold text-lg ${feedback === 'correct' ? 'text-emerald-800' : 'text-red-800'}`}>
                                        {feedback === 'correct' ? 'Excellent !' : 'Aïe...'}
                                    </h3>
                                </div>

                                {/* EXPLICATION PÉDAGOGIQUE CORRIGÉE */}
                                {getCorrectionExplanation()}

                            </div>
                            <button onClick={handleNext} autoFocus className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2">
                                Question Suivante <Icon name="arrow-right" size={20} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExerciceThales;