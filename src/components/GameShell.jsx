import React, { useState } from 'react';
import { Icon } from './UI';
import ContactModal from './ContactModal';

/**
 * GameShell - Le conteneur universel pour tous les exercices.
 * Gère : Header, Boutons (Quitter/Signaler), Modale, Progression et Layout Responsive.
 */
export const GameShell = ({
    // Données utilisateur & Contexte
    user,
    contextData,

    // Contenu de l'en-tête
    title,          // Peut être une String ou un Composant React (ex: Titre + Badge Niveau)

    // Progression (Optionnel)
    step = 0,       // Question actuelle (0-indexé ou 1-indexé selon ta logique, ici c'est pour la barre visuelle)
    total = 0,      // Nombre total de questions

    // --- NOUVEAU : Score (Optionnel) ---
    score = null,   // Si on passe un nombre, il s'affichera. Sinon, rien.

    // Actions
    onBack,         // Fonction appelée au clic sur la Croix (Quitter/Sauvegarder)

    // Layout & Style
    maxWidth = "max-w-2xl", // Largeur par défaut (Calcul mental). Pour la géométrie, passer "max-w-4xl" ou "max-w-6xl"
    children        // Le contenu spécifique de l'exercice
}) => {
    const [showReport, setShowReport] = useState(false);

    // Calcul sécurisé du pourcentage de progression
    const progressPercent = total > 0 ? ((step) / total) * 100 : 0;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans relative">

            {/* 1. BARRE DE PROGRESSION (Fixe tout en haut) */}
            {total > 0 && (
                <div className="fixed top-0 left-0 w-full h-1.5 bg-slate-200 z-50">
                    <div
                        className="h-full bg-indigo-600 transition-all duration-500 ease-out"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            )}

            {/* 2. MODALE DE SIGNALEMENT (Sécurisée) */}
            {showReport && (
                <ContactModal
                    user={user || {}} // Protection contre le crash si user est undefined
                    contextData={contextData}
                    onClose={() => setShowReport(false)}
                />
            )}

            {/* 3. CONTENEUR PRINCIPAL */}
            {/* - z-0 : Reste sous la barre de progression et les modales
               - w-full : Prend toute la largeur sur mobile
               - maxWidth : Contraint la largeur sur grand écran (paramétrable)
            */}
            <div className={`w-full ${maxWidth} relative z-0 flex flex-col gap-6`}>

                {/* --- HEADER UNIFIÉ --- */}
                {/* Utilisation de flex-row pour garder les boutons alignés avec le titre même sur mobile */}
                <div className="flex flex-row justify-between items-start gap-4">

                    {/* Zone Titre : Grow pour prendre l'espace disponible */}
                    <div className="flex-grow min-w-0 pt-1">
                        {typeof title === 'string' ? (
                            <h2 className="text-2xl font-black text-slate-800 leading-tight truncate">
                                {title}
                            </h2>
                        ) : (
                            // Si c'est un composant (ex: Titre + Badge), on l'affiche tel quel
                            title
                        )}
                    </div>

                    {/* Zone Boutons : Shrink-0 pour ne jamais être écrasés */}
                    <div className="flex gap-2 shrink-0 items-center">

                        {/* --- NOUVELLE FONCTIONNALITÉ : BADGE SCORE --- */}
                        {/* On ne l'affiche que si un score valide est fourni */}
                        {typeof score === 'number' && (
                            <div className="bg-slate-800 text-white px-3 py-1.5 rounded-full font-bold text-sm shadow-sm flex items-center gap-2 mr-2 animate-in fade-in slide-in-from-top-2">
                                <Icon name="trophy" size={14} weight="fill" className="text-amber-400" />
                                <span>{score} / {step}</span>
                            </div>
                        )}

                        <button
                            onClick={() => setShowReport(true)}
                            className="w-10 h-10 bg-white text-slate-300 hover:bg-amber-50 hover:text-amber-500 rounded-full flex items-center justify-center transition-colors shadow-sm border border-slate-100"
                            title="Signaler une erreur"
                            aria-label="Signaler une erreur"
                        >
                            <Icon name="flag" weight="fill" size={16} />
                        </button>

                        <button
                            onClick={onBack}
                            className="w-10 h-10 bg-white text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-full flex items-center justify-center transition-colors shadow-sm border border-slate-100"
                            title="Quitter et Sauvegarder"
                            aria-label="Quitter l'exercice"
                        >
                            <Icon name="x" weight="bold" />
                        </button>
                    </div>
                </div>

                {/* --- CONTENU DE L'EXERCICE --- */}
                {/* Fade-in léger pour fluidifier l'arrivée du contenu */}
                <div className="w-full animate-in fade-in duration-300">
                    {children}
                </div>

            </div>
        </div>
    );
};

export default GameShell;