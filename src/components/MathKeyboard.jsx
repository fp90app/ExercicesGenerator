import React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './UI';

const MathKeyboard = ({ onKeyPress, onDelete, onClose }) => {

    // Définition des touches (Format 6 colonnes)
    const keys = [
        // Ligne 1
        { label: 'x', val: 'x', type: 'var' },
        { label: 'y', val: 'y', type: 'var' },
        { label: '7', val: '7', type: 'num' },
        { label: '8', val: '8', type: 'num' },
        { label: '9', val: '9', type: 'num' },
        { label: '÷', val: '/', type: 'op' },

        // Ligne 2
        { label: '(', val: '(', type: 'sym' },
        { label: ')', val: ')', type: 'sym' },
        { label: '4', val: '4', type: 'num' },
        { label: '5', val: '5', type: 'num' },
        { label: '6', val: '6', type: 'num' },
        { label: '×', val: '*', type: 'op' },

        // Ligne 3
        { label: 'x²', val: '²', type: 'pow' },
        { label: '√', val: 'sqrt(', type: 'pow' },
        { label: '1', val: '1', type: 'num' },
        { label: '2', val: '2', type: 'num' },
        { label: '3', val: '3', type: 'num' },
        { label: '-', val: '-', type: 'op' },

        // Ligne 4
        { label: ';', val: ';', type: 'sym' },
        { label: ',', val: '.', type: 'num' },
        { label: '0', val: '0', type: 'num' },
        { label: 'DEL', val: 'DEL', type: 'action' },
        { label: '=', val: '=', type: 'sym' },
        { label: '+', val: '+', type: 'op' },
    ];

    const keyboardContent = (
        // CONTENEUR PRINCIPAL
        // Mobile : p-1 (très peu de padding)
        // PC (md) : p-1.5
        <div className="fixed bottom-0 left-0 w-full md:w-auto md:left-1/2 md:-translate-x-1/2 md:bottom-2 md:rounded-xl bg-slate-900/95 backdrop-blur-md p-1 md:p-1.5 z-[9999] border-t md:border border-slate-700 shadow-2xl animate-in slide-in-from-bottom-10 touch-none select-none">

            {/* Barre de contrôle (Minuscule sur mobile) */}
            <div className="flex justify-between items-center mb-1 px-1">
                {/* On cache le texte "Clavier Math" sur mobile pour gagner de la place visuelle */}
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Icon name="keyboard" size={12} /> <span className="text-[9px] md:text-[10px]">Maths</span>
                </span>
                <button
                    onClick={onClose}
                    className="bg-slate-800 text-slate-400 px-4 py-0 md:px-2 md:py-0.5 rounded hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center h-6 md:h-auto"
                    title="Fermer"
                >
                    <Icon name="caret-down" weight="bold" size={14} />
                </button>
            </div>

            {/* GRILLE COMPACTE */}
            <div className="grid grid-cols-6 gap-1">
                {keys.map((k, i) => {
                    // STYLES OPTIMISÉS MOBILE
                    // Mobile (base) : h-10 (40px) -> Suffisant pour le doigt, gagne 32px au total sur 4 lignes
                    // PC (md) : h-8 (32px) -> Compact souris
                    let style = "h-10 md:h-8 md:w-12 rounded md:rounded-md font-bold text-lg md:text-sm active:scale-95 transition-all flex items-center justify-center shadow-sm border-b-2 border-black/20 ";

                    if (k.val === 'DEL') style += "bg-red-500/20 text-red-400 border-red-900/30 hover:bg-red-500 hover:text-white";
                    else if (k.type === 'num') style += "bg-slate-700 text-white hover:bg-slate-600 border-slate-900";
                    else if (k.type === 'op') style += "bg-indigo-600 text-white hover:bg-indigo-500 border-indigo-800";
                    else if (k.type === 'var') style += "bg-purple-600 text-white hover:bg-purple-500 italic font-serif border-purple-800";
                    else if (k.type === 'pow') style += "bg-slate-600 text-indigo-200 hover:bg-slate-500 border-slate-800";
                    else style += "bg-slate-800 text-slate-400 border-slate-900 hover:text-white";

                    return (
                        <button
                            key={i}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => {
                                e.stopPropagation();
                                k.val === 'DEL' ? onDelete() : onKeyPress(k.val);
                            }}
                            className={style}
                        >
                            {k.val === 'DEL' ? <Icon name="backspace" weight="bold" size={18} /> : k.label}
                        </button>
                    );
                })}
            </div>

            {/* Petit espace safe en bas pour les iPhone (barre d'accueil) */}
            <div className="h-1 md:h-0"></div>
        </div>
    );

    return createPortal(keyboardContent, document.body);
};

export default MathKeyboard;