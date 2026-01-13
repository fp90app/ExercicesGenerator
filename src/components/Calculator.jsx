import React, { useState } from 'react';
import { Icon } from './UI';
import { evaluate } from 'mathjs';

const Calculator = ({ onClose }) => {
    const [input, setInput] = useState("");
    const [result, setResult] = useState("");
    const [shift, setShift] = useState(false); // Pour basculer entre sin/asin

    // --- 1. FONCTION UTILITAIRE (A placer en dehors du composant ou dans un fichier utils) ---

    /**
     * Prépare la chaîne de caractères pour l'évaluation par mathjs.
     * Gère le nettoyage, les symboles et la conversion Trigo Degrés <-> Radians.
     */
    const prepareExpression = (expression) => {
        let evalStr = expression
            // A. Nettoyage basique et symboles mathjs
            .replace(/×/g, '*')
            .replace(/÷/g, '/')
            .replace(/,/g, '.')
            .replace(/²/g, '^2')    // mathjs utilise ^2
            .replace(/√/g, 'sqrt')  // mathjs utilise sqrt()
            .replace(/π/g, 'pi');   // mathjs utilise pi

        // B. GESTION TRIGONOMÉTRIE (Protection des inverses)
        // On remplace d'abord acos/asin/atan par des tokens temporaires
        // pour éviter qu'ils ne soient modifiés par le remplacement de cos/sin.
        evalStr = evalStr
            .replace(/acos\(/g, '__ACOS__(')
            .replace(/asin\(/g, '__ASIN__(')
            .replace(/atan\(/g, '__ATAN__(');

        // C. Conversion des fonctions normales (Degrés -> Radians pour mathjs)
        // mathjs attend des radians, donc on convertit l'entrée : cos(X) -> cos(X deg)
        // Note : on injecte le facteur de conversion directement.
        evalStr = evalStr
            .replace(/cos\(/g, 'cos((pi/180)*')
            .replace(/sin\(/g, 'sin((pi/180)*')
            .replace(/tan\(/g, 'tan((pi/180)*');

        // D. Rétablissement et conversion des inverses (Radians -> Degrés en sortie)
        // mathjs renvoie des radians, on reconvertit en degrés : acos(X) -> acos(X) * (180/pi)
        evalStr = evalStr
            .replace(/__ACOS__\(/g, '(180/pi)*acos(')
            .replace(/__ASIN__\(/g, '(180/pi)*asin(')
            .replace(/__ATAN__\(/g, '(180/pi)*atan(');

        return evalStr;
    };


    // --- 2. VOTRE COMPOSANT (Partie handleClick) ---

    const handleClick = (val) => {
        // Liste des opérateurs qui permettent de continuer un calcul sur le résultat précédent
        const CONTINUATION_OPERATORS = ['+', '-', '×', '÷', '²', ')'];

        // Liste des fonctions qui nécessitent une parenthèse automatique
        const FUNCTIONS_WITH_PARENTHESIS = ['cos', 'sin', 'tan', 'acos', 'asin', 'atan', '√'];

        // CAS 1 : CALCUL (=)
        if (val === '=') {
            if (!input) return; // Sécurité si input vide

            try {
                // 1. Préparation de la chaîne (Appel de la fonction factorisée)
                const evalStr = prepareExpression(input);

                // 2. Évaluation sécurisée via mathjs
                const res = evaluate(evalStr);

                // 3. Gestion du résultat
                if (isNaN(res) || !isFinite(res)) {
                    setResult("Err");
                } else {
                    // Arrondi à 3 décimales (ex: 1.99999 -> 2)
                    setResult(Math.round(res * 1000) / 1000);
                }
            } catch (e) {
                console.error("Erreur calcul:", e);
                setResult("Err");
            }
        }

        // CAS 2 : RESET (C)
        else if (val === 'C') {
            setInput("");
            setResult("");
        }

        // CAS 3 : DELETE (del)
        else if (val === 'del') {
            setInput(input.slice(0, -1));
        }

        // CAS 4 : SHIFT
        else if (val === 'shift') {
            setShift(!shift);
        }

        // CAS 5 : FONCTIONS SPÉCIALES (avec parenthèse)
        else if (FUNCTIONS_WITH_PARENTHESIS.includes(val)) {
            setInput(input + val + "(");
        }

        // CAS 6 : CARRÉ (x²)
        else if (val === 'x²') {
            setInput(input + "²");
        }

        // CAS 7 : SAISIE STANDARD (Chiffres et Opérateurs)
        else {
            // Logique "Smart Reset"
            if (result) {
                // Si on a un résultat affiché...
                if (CONTINUATION_OPERATORS.includes(val)) {
                    // ...et qu'on tape un opérateur (+, -, etc.), on continue avec le résultat
                    setInput(result + val);
                } else {
                    // ...et qu'on tape un chiffre/nombre, on recommence à zéro
                    setInput(val);
                }
                // Dans tous les cas, on vide le résultat visuel car il passe dans l'input
                setResult("");
            } else {
                // Sinon, on ajoute simplement à la suite
                setInput(input + val);
            }
        }
    };

    // --- CONFIGURATION DU CLAVIER ---
    // Note : 'lbl' est ce qu'on voit sur le bouton, 'val' est ce qui est ajouté au calcul
    const buttons = [
        // Ligne 0 : Trigo (Dynamique avec Shift)
        // On affiche cos⁻¹ mais on insère 'acos' pour que le moteur JS comprenne
        { lbl: shift ? 'cos⁻¹' : 'cos', val: shift ? 'acos' : 'cos', style: 'bg-indigo-800 text-indigo-100 font-bold text-sm border border-indigo-700' },
        { lbl: shift ? 'sin⁻¹' : 'sin', val: shift ? 'asin' : 'sin', style: 'bg-indigo-800 text-indigo-100 font-bold text-sm border border-indigo-700' },
        { lbl: shift ? 'tan⁻¹' : 'tan', val: shift ? 'atan' : 'tan', style: 'bg-indigo-800 text-indigo-100 font-bold text-sm border border-indigo-700' },
        { lbl: shift ? '2nd' : '2nd', val: 'shift', style: shift ? 'bg-amber-500 text-white shadow-inner' : 'bg-slate-600 text-amber-300 font-bold' },

        // Ligne 1 : Édition & Parenthèses
        { lbl: 'C', val: 'C', style: 'bg-red-500/20 text-red-400 hover:bg-red-500/30 font-bold' },
        { lbl: '(', val: '(', style: 'bg-slate-700 text-indigo-200 hover:bg-slate-600' },
        { lbl: ')', val: ')', style: 'bg-slate-700 text-indigo-200 hover:bg-slate-600' },
        { lbl: '⌫', val: 'del', style: 'bg-slate-700 text-slate-300 hover:bg-slate-600' },

        // Ligne 2 : Scientifique
        { lbl: 'x²', val: 'x²', style: 'bg-indigo-900/50 text-indigo-200 hover:bg-indigo-900 border border-indigo-800' },
        { lbl: '√', val: '√', style: 'bg-indigo-900/50 text-indigo-200 hover:bg-indigo-900 border border-indigo-800' },
        { lbl: 'π', val: 'π', style: 'bg-indigo-900/50 text-indigo-200 hover:bg-indigo-900 border border-indigo-800 font-serif italic' },
        { lbl: '÷', val: '÷', style: 'bg-indigo-600 text-white hover:bg-indigo-500 font-bold text-lg' },

        // Ligne 3 : Chiffres 7-9 & Fois
        { lbl: '7', val: '7', style: 'bg-slate-700 text-slate-200 hover:bg-slate-600 font-bold text-lg' },
        { lbl: '8', val: '8', style: 'bg-slate-700 text-slate-200 hover:bg-slate-600 font-bold text-lg' },
        { lbl: '9', val: '9', style: 'bg-slate-700 text-slate-200 hover:bg-slate-600 font-bold text-lg' },
        { lbl: '×', val: '×', style: 'bg-indigo-600 text-white hover:bg-indigo-500 font-bold text-lg' },

        // Ligne 4 : Chiffres 4-6 & Moins
        { lbl: '4', val: '4', style: 'bg-slate-700 text-slate-200 hover:bg-slate-600 font-bold text-lg' },
        { lbl: '5', val: '5', style: 'bg-slate-700 text-slate-200 hover:bg-slate-600 font-bold text-lg' },
        { lbl: '6', val: '6', style: 'bg-slate-700 text-slate-200 hover:bg-slate-600 font-bold text-lg' },
        { lbl: '-', val: '-', style: 'bg-indigo-600 text-white hover:bg-indigo-500 font-bold text-lg' },

        // Ligne 5 : Chiffres 1-3 & Plus
        { lbl: '1', val: '1', style: 'bg-slate-700 text-slate-200 hover:bg-slate-600 font-bold text-lg' },
        { lbl: '2', val: '2', style: 'bg-slate-700 text-slate-200 hover:bg-slate-600 font-bold text-lg' },
        { lbl: '3', val: '3', style: 'bg-slate-700 text-slate-200 hover:bg-slate-600 font-bold text-lg' },
        { lbl: '+', val: '+', style: 'bg-indigo-600 text-white hover:bg-indigo-500 font-bold text-lg' },

        // Ligne 6 : Zéro, Virgule & Egal
        { lbl: '0', val: '0', style: 'bg-slate-700 text-slate-200 hover:bg-slate-600 font-bold text-lg' },
        { lbl: ',', val: ',', style: 'bg-slate-700 text-slate-200 hover:bg-slate-600 font-bold text-lg' },
        { lbl: '=', val: '=', style: 'bg-emerald-600 text-white hover:bg-emerald-500 col-span-2 font-bold text-xl shadow-lg' },
    ];

    return (
        <div className="bg-slate-800 p-4 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-[340px] z-50 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-3">
                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Icon name="calculator" size={14} weight="fill" /> Calculatrice
                </span>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-slate-700">
                    <Icon name="x" size={18} weight="bold" />
                </button>
            </div>

            {/* Écran */}
            <div className="bg-slate-900 p-4 rounded-xl text-right mb-4 font-mono border border-slate-700/50 shadow-inner">
                <div className="text-slate-400 text-xs h-5 overflow-x-auto whitespace-nowrap scrollbar-hide flex justify-end items-center">
                    {input || "0"}
                </div>
                <div className="text-white text-3xl font-bold tracking-wider overflow-hidden text-ellipsis whitespace-nowrap mt-1">
                    {result || (input ? "" : "0")}
                </div>
            </div>

            {/* Grille */}
            <div className="grid grid-cols-4 gap-2">
                {buttons.map((btn, i) => (
                    <button
                        key={i}
                        onClick={() => handleClick(btn.val)}
                        className={`p-3 rounded-lg transition-all active:scale-95 shadow-sm flex items-center justify-center ${btn.style}`}
                    >
                        {btn.lbl}
                    </button>
                ))}
            </div>

            <div className="mt-3 text-[10px] text-center text-slate-500 font-medium">
                Mode degrés (deg) activé par défaut.
            </div>
        </div>
    );
};

export default Calculator;