import React from 'react';
import { usePremium } from '../hooks/usePremium';
import { Icon } from './UI';

const PremiumLock = ({ children, message = "Contenu réservé aux abonnés", blur = true }) => {
    const isPremium = usePremium();

    // Si Premium, on affiche le contenu normalement
    if (isPremium) {
        return children;
    }

    // Sinon, on affiche le verrou
    return (
        <div className="relative overflow-hidden rounded-xl border-2 border-slate-100 bg-slate-50 group">

            {/* Contenu flouté en arrière-plan (pour donner envie) */}
            <div className={`transition-all duration-500 ${blur ? 'blur-md opacity-40 grayscale pointer-events-none select-none' : ''}`}>
                {children}
            </div>

            {/* Le Message par-dessus */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-6 text-center animate-in fade-in zoom-in duration-300">
                <div className="bg-gradient-to-br from-amber-400 to-orange-600 text-white p-4 rounded-full shadow-lg mb-4 transform group-hover:scale-110 transition-transform">
                    <Icon name="lock-key" weight="fill" size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Version Premium</h3>
                <p className="text-sm text-slate-500 mb-6 font-medium max-w-xs mx-auto">
                    {message}
                </p>

                {/* Bouton d'action (factice pour l'instant, ou lien vers page d'achat) */}
                <button
                    onClick={() => alert("Bientôt disponible !")}
                    className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-xl hover:bg-indigo-600 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center gap-2"
                >
                    <Icon name="star" weight="fill" className="text-yellow-400" />
                    Débloquer
                </button>
            </div>
        </div>
    );
};

export default PremiumLock;