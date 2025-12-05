// src/components/Calculator.jsx
import React, { useState } from 'react';
import { Icon } from './UI';

const Calculator = ({ onClose }) => {
    const [input, setInput] = useState("");
    const [result, setResult] = useState("");

    const handleClick = (val) => {
        if (val === '=') {
            try {
                // --- MOTEUR MATHÉMATIQUE AVANCÉ ---
                let evalStr = input
                    // 1. Opérateurs visuels vers JS
                    .replace(/×/g, '*')
                    .replace(/÷/g, '/')
                    .replace(/,/g, '.')

                    // 2. Gestion du Carré (x²)
                    .replace(/²/g, '**2')

                    // 3. Gestion de la Racine (√)
                    // L'astuce : Le bouton ajoute "√(", donc on remplace juste "√" par "Math.sqrt"
                    // Ça donne "Math.sqrt(...)" qui est valide en JS
                    .replace(/√/g, 'Math.sqrt')

                    // 4. Gestion de Pi (π)
                    .replace(/π/g, 'Math.PI');

                // Évaluation sécurisée
                const res = new Function('return ' + evalStr)();

                if (isNaN(res) || !isFinite(res)) {
                    setResult("Err");
                } else {
                    // Arrondi précis pour éviter les 14.0000000002
                    setResult(Math.round(res * 100) / 100);
                }
            } catch (e) {
                setResult("Err");
            }
        }
        else if (val === 'C') {
            setInput("");
            setResult("");
        }
        else if (val === 'del') {
            setInput(input.slice(0, -1));
        }
        else if (val === 'x²') {
            setInput(input + "²");
        }
        else if (val === '√') {
            // AJOUT : Ouvre automatiquement la parenthèse pour la racine
            setInput(input + "√(");
        }
        else {
            // Gestion intelligente du Reset automatique
            // Si on a un résultat affiché et qu'on tape un chiffre, on efface tout.
            // Si on tape un opérateur, on continue le calcul avec le résultat précédent.
            if (result && !['+', '-', '×', '÷', '²', ')'].includes(val)) {
                setInput(val);
                setResult("");
            } else if (result) {
                setInput(result + val);
                setResult("");
            } else {
                setInput(input + val);
            }
        }
    };

    // --- CONFIGURATION DU CLAVIER (6 Lignes) ---
    const buttons = [
        // Ligne 1 : Édition & Parenthèses
        { lbl: 'C', val: 'C', style: 'bg-red-500/20 text-red-400 hover:bg-red-500/30 font-bold' },
        { lbl: '(', val: '(', style: 'bg-slate-700 text-indigo-200 hover:bg-slate-600' },
        { lbl: ')', val: ')', style: 'bg-slate-700 text-indigo-200 hover:bg-slate-600' },
        { lbl: '⌫', val: 'del', style: 'bg-slate-700 text-slate-300 hover:bg-slate-600' },

        // Ligne 2 : Scientifique
        { lbl: 'x²', val: 'x²', style: 'bg-indigo-900/50 text-indigo-200 hover:bg-indigo-900 border border-indigo-800' },
        { lbl: '√', val: '√', style: 'bg-indigo-900/50 text-indigo-200 hover:bg-indigo-900 border border-indigo-800' },
        { lbl: 'π', val: 'π', style: 'bg-indigo-900/50 text-indigo-200 hover:bg-indigo-900 border border-indigo-800 font-serif italic' },
        { lbl: '÷', val: '÷', style: 'bg-indigo-600 text-white hover:bg-indigo-500' },

        // Ligne 3
        { lbl: '7', val: '7', style: 'bg-slate-700 text-slate-200 hover:bg-slate-600' },
        { lbl: '8', val: '8', style: 'bg-slate-700 text-slate-200 hover:bg-slate-600' },
        { lbl: '9', val: '9', style: 'bg-slate-700 text-slate-200 hover:bg-slate-600' },
        { lbl: '×', val: '×', style: 'bg-indigo-600 text-white hover:bg-indigo-500' },

        // Ligne 4
        { lbl: '4', val: '4', style: 'bg-slate-700 text-slate-200 hover:bg-slate-600' },
        { lbl: '5', val: '5', style: 'bg-slate-700 text-slate-200 hover:bg-slate-600' },
        { lbl: '6', val: '6', style: 'bg-slate-700 text-slate-200 hover:bg-slate-600' },
        { lbl: '-', val: '-', style: 'bg-indigo-600 text-white hover:bg-indigo-500' },

        // Ligne 5
        { lbl: '1', val: '1', style: 'bg-slate-700 text-slate-200 hover:bg-slate-600' },
        { lbl: '2', val: '2', style: 'bg-slate-700 text-slate-200 hover:bg-slate-600' },
        { lbl: '3', val: '3', style: 'bg-slate-700 text-slate-200 hover:bg-slate-600' },
        { lbl: '+', val: '+', style: 'bg-indigo-600 text-white hover:bg-indigo-500' },

        // Ligne 6 (Zéro et Egal)
        { lbl: '0', val: '0', style: 'bg-slate-700 text-slate-200 hover:bg-slate-600' },
        { lbl: ',', val: ',', style: 'bg-slate-700 text-slate-200 hover:bg-slate-600' },
        { lbl: '=', val: '=', style: 'bg-emerald-600 text-white hover:bg-emerald-500 col-span-2' },
    ];

    return (
        <div className="bg-slate-800 p-4 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-[320px] animate-in fade-in slide-in-from-bottom-2 z-50">
            <div className="flex justify-between items-center mb-3">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Icon name="grid" size={14} /> Calculatrice
                </span>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><Icon name="x" size={18} /></button>
            </div>

            {/* Écran */}
            <div className="bg-slate-900 p-4 rounded-xl text-right mb-4 font-mono border border-slate-700/50 shadow-inner">
                <div className="text-slate-400 text-xs h-5 overflow-x-auto whitespace-nowrap scrollbar-hide">{input || "0"}</div>
                <div className="text-white text-3xl font-bold tracking-wider overflow-hidden text-ellipsis whitespace-nowrap mt-1">
                    {result || (input ? "" : "0")}
                </div>
            </div>

            {/* Grille */}
            <div className="grid grid-cols-4 gap-2.5">
                {buttons.map((btn, i) => (
                    <button
                        key={i}
                        onClick={() => handleClick(btn.val)}
                        className={`p-3 rounded-lg font-bold text-lg transition-all active:scale-95 shadow-sm flex items-center justify-center ${btn.style}`}
                    >
                        {btn.lbl}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Calculator;