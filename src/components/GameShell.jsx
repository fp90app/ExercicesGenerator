import React, { useState } from 'react';
import { Icon } from './UI';
import ContactModal from './ContactModal';

// Ce composant sert de cadre à TOUS tes exercices
export const GameShell = ({
    user,           // L'utilisateur (pour le report)
    contextData,    // Les données techniques pour le debug
    onBack,         // Fonction pour quitter
    title,          // Le titre ou la question (peut être du JSX avec MathText)
    step,           // Numéro de la question actuelle (0, 1, 2...)
    total = 10,     // Nombre total de questions
    children        // LE CONTENU SPÉCIFIQUE DE L'EXERCICE (Input, QCM, Figure...)
}) => {
    const [showReport, setShowReport] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">

            {/* 1. La Modale est gérée ICI. Plus besoin de la mettre ailleurs. */}
            {showReport && (
                <ContactModal
                    user={user}
                    contextData={contextData}
                    onClose={() => setShowReport(false)}
                />
            )}

            {/* 2. Barre de progression */}
            <div className="fixed top-0 left-0 w-full h-2 bg-slate-200 z-10">
                <div
                    className="h-full bg-indigo-600 transition-all duration-500 ease-out"
                    style={{ width: `${((step) / total) * 100}%` }}
                ></div>
            </div>

            {/* 3. La Carte Principale */}
            <div className="w-full max-w-2xl bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-200 relative animate-in fade-in zoom-in duration-300">

                {/* HEADER COMMUN : Titre + Boutons */}
                <div className="flex justify-between items-start mb-6 gap-4">
                    <div className="flex-1">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Question {step + 1} / {total}
                        </div>
                        <div className="text-2xl font-black text-slate-800 leading-tight">
                            {title}
                        </div>
                    </div>

                    {/* Zone Boutons Unifiée */}
                    <div className="flex flex-col gap-2 shrink-0">
                        <button
                            onClick={onBack}
                            className="w-10 h-10 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full flex items-center justify-center transition-colors shadow-sm"
                            title="Quitter"
                        >
                            <Icon name="x" weight="bold" />
                        </button>

                        <button
                            onClick={() => setShowReport(true)}
                            className="w-10 h-10 bg-slate-50 text-slate-300 hover:bg-amber-50 hover:text-amber-500 rounded-full flex items-center justify-center transition-colors shadow-sm"
                            title="Signaler une erreur"
                        >
                            <Icon name="flag" weight="fill" size={16} />
                        </button>
                    </div>
                </div>

                {/* 4. Le contenu de l'exercice s'insère ici */}
                <div className="mt-2">
                    {children}
                </div>

            </div>
        </div>
    );
};