import React from 'react';
import { getFunctions, httpsCallable } from "firebase/functions";
import { toast } from 'react-hot-toast';

// On importe TOUTES les icônes d'un coup
import * as PhosphorIcons from '@phosphor-icons/react';

// Fonction utilitaire pour convertir "grid-four" en "GridFour" (Format React)
const toPascalCase = (str) => {
    if (!str) return "";
    return str
        .toLowerCase()
        .replace(/(^\w|-\w)/g, (text) => text.replace(/-/, "").toUpperCase());
};

// Ton nouveau composant Icon intelligent
export const Icon = ({ name, className = "", size = 24 }) => {
    if (!name) return null;

    // 1. Gestion du poids (Fill, Bold, etc.)
    // Par défaut, ton ancien code utilisait "ph-fill", donc on met weight="fill" par défaut
    let weight = "fill";
    let iconName = name;

    // Si tu avais mis des noms comme "trophy-fill", on nettoie le nom
    if (iconName.includes("-fill")) {
        iconName = iconName.replace("-fill", "");
        weight = "fill";
    }

    // 2. Conversion du nom (ex: "arrow-left" devient "ArrowLeft")
    const pascalName = toPascalCase(iconName);

    // 3. Récupération dynamique de l'icône dans la librairie
    const IconComponent = PhosphorIcons[pascalName];

    // Si l'icône n'existe pas, on renvoie rien (évite le crash)
    if (!IconComponent) {
        console.warn(`Icône introuvable : ${name} (Cherché: ${pascalName})`);
        return null;
    }

    // 4. Affichage
    return <IconComponent size={size} weight={weight} className={className} />;
};

// --- Les autres composants UI ---

export const MuteButton = ({ muted, toggle }) => (
    <button onClick={toggle} className="fixed top-4 right-4 z-50 w-10 h-10 bg-slate-800 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform border-2 border-slate-600">
        <Icon name={muted ? "speaker-slash" : "speaker-high"} size={20} />
    </button>
);

export const Leaderboard = ({ title, data, unit }) => {
    // Fonction utilitaire pour formater la date
    const formatDate = (ts) => {
        if (!ts) return "Ancien score";
        try {
            const d = new Date(ts);
            if (isNaN(d.getTime())) return "Date inconnue";
            const now = new Date();
            if (d.toDateString() === now.toDateString()) {
                return "Auj. à " + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            }
            return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' }) + " - " + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        } catch (e) { return "Date erreur"; }
    };

    return (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 w-full">
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 border-b border-slate-700 pb-2">{title}</h4>
            <div className="space-y-2">
                {data.length > 0 ? data.map((s, i) => (
                    <div key={i} className={`flex justify-between items-center text-sm ${s.isUser ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
                        <div className="flex items-center gap-2">
                            <span>#{i + 1}</span>
                            <span>{title === "Mon Historique" ? formatDate(s.date) : s.nom}</span>
                            {s.classe && s.classe !== "-" && title !== "Mon Historique" && (
                                <span className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded border border-slate-600 font-mono">
                                    {s.classe}
                                </span>
                            )}
                        </div>
                        <span className="font-mono">{s.val}{unit}</span>
                    </div>
                )) : <span className="text-xs text-slate-600 italic">Aucun score</span>}
            </div>
        </div>
    );
};

export const LegendBox = ({ icon, color, text }) => (
    <div className={`flex items-center gap-3 p-3 rounded-xl bg-${color}-50 border border-${color}-200 text-${color}-800 text-sm mb-6`}>
        <Icon name={icon} className="text-xl" />
        <span className="font-bold">{text}</span>
    </div>
);

// --- NOUVELLE EN-TÊTE ÉPURÉE ET PROFESSIONNELLE ---
export const SchoolHeader = () => (
    <div className="bg-white rounded-2xl p-6 md:p-8 mb-8 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-200 shrink-0">
            <Icon name="calculator" className="text-3xl text-slate-700" weight="fill" />
        </div>
        <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-800 mb-2">
                Cours de Mathématiques
            </h1>
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-slate-600 font-medium text-sm md:text-base">
                <span className="flex items-center justify-center md:justify-start gap-1.5">
                    <Icon name="graduation-cap" weight="fill" className="text-slate-400" />
                    Collège Simone SIGNORET (BELFORT)
                </span>
                <span className="hidden md:inline text-slate-300">|</span>
                <span className="flex items-center justify-center md:justify-start gap-1.5">
                    <Icon name="chalkboard-teacher" weight="fill" className="text-slate-400" />
                    Professeur : M. PUTOD
                </span>
            </div>
        </div>
    </div>
);

export const XPHelpModal = ({ onClose }) => (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl pop-in" onClick={e => e.stopPropagation()}>
            <div className="bg-amber-500 p-6 text-white text-center">
                <Icon name="star-fill" className="text-5xl mb-2 animate-pulse" />
                <h2 className="text-2xl font-black uppercase">Comment gagner des XP ?</h2>
                <p className="opacity-90 text-sm">Deviens le maître des maths !</p>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* TABLES */}
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="w-10 h-10 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center text-xl font-bold"><Icon name="grid-four" /></div>
                        <div>
                            <div className="font-bold text-slate-800">Tables de multiplication / division</div>
                            <div className="font-bold text-amber-600">+10 XP <span className="text-slate-400 font-normal">/ validation</span></div>
                        </div>
                    </div>
                    <div className="text-xs text-slate-500 mb-2">
                        Tu gagnes des points jusqu'à 3 réussites <b>lors de la première validation</b> (pas par jour).
                    </div>
                </div>

                {/* NOUVEAU : DÉFI TOUTES LES TABLES */}
                <div className="flex items-center gap-4 p-3 bg-purple-50 rounded-xl border border-purple-100">
                    <div className="w-10 h-10 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center text-xl font-bold"><Icon name="infinity" /></div>
                    <div>
                        <div className="font-bold text-slate-800">Défi "Toutes les tables"</div>
                        <div className="font-bold text-purple-600 mt-1">+20 XP <span className="text-[16px] font-normal text-slate-400">(1 fois par jour)</span></div>
                    </div>
                </div>

                {/* AUTOMATISMES */}
                <div className="flex items-center gap-4 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                    <div className="w-10 h-10 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center text-xl font-bold"><Icon name="lightning" /></div>
                    <div>
                        <div className="font-bold text-slate-800">Automatismes</div>
                        <div className="font-bold text-indigo-600 mt-1 flex flex-col text-xs">
                            <span>Niveau 1 : +10 XP (×3)</span>
                            <span>Niveau 2 : +20 XP (×3)</span>
                            <span>Niveau 3 : +30 XP (×3)</span>
                        </div>
                    </div>
                    {/* VISUEL DES ÉTATS */}
                    <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-8 h-8 rounded border bg-slate-50 border-slate-200 text-slate-300 flex items-center justify-center font-bold text-xs">1</div>
                            <span className="text-[9px] uppercase font-bold text-slate-400">0 Fois</span>
                        </div>
                        <Icon name="arrow-right" className="text-slate-300 text-xs" />
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-8 h-8 rounded border bg-emerald-50 border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-xs">1</div>
                            <span className="text-[9px] uppercase font-bold text-emerald-600">1 Fois</span>
                        </div>
                        <Icon name="arrow-right" className="text-slate-300 text-xs" />
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-8 h-8 rounded border bg-emerald-300 border-emerald-400 text-emerald-900 flex items-center justify-center font-bold text-xs">1</div>
                            <span className="text-[9px] uppercase font-bold text-emerald-600">2 Fois</span>
                        </div>
                        <Icon name="arrow-right" className="text-slate-300 text-xs" />
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-8 h-8 rounded border bg-emerald-600 border-emerald-700 text-white flex items-center justify-center font-bold text-xs relative">
                                1
                                <div className="check-badge"><Icon name="check" /></div>
                            </div>
                            <span className="text-[9px] uppercase font-bold text-emerald-600">Max</span>
                        </div>
                    </div>
                </div>

                {/* QUÊTES */}
                <div className="flex items-center gap-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <div className="w-10 h-10 rounded-full bg-emerald-200 text-emerald-700 flex items-center justify-center text-xl font-bold"><Icon name="trophy" /></div>
                    <div>
                        <div className="font-bold text-slate-800">Quêtes Journalières</div>
                        <div className="font-bold text-emerald-600 mt-1 flex flex-col text-xs">
                            <span>Tables quête du jour : +10 XP</span>
                            <span>Série complète (Flamme) : +20 XP</span>
                            <span>Automatisme du jour (au choix) : +20 / +30 / +50 XP en fonction du niveau choisi.</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 border-t bg-slate-50 text-center">
                <button onClick={onClose} className="bg-slate-800 text-white px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform">Compris !</button>
            </div>
        </div>
    </div>
);

export const LoadingScreen = ({ message = "Chargement..." }) => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans z-50 fixed inset-0">
        <div className="relative">
            {/* Cercle animé extérieur */}
            <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            {/* Icône centrale statique ou pulsante */}
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center animate-pulse">
                <Icon name="lightning" weight="fill" className="text-indigo-600 text-xl" />
            </div>
        </div>
        <h2 className="mt-6 text-slate-800 font-bold text-lg tracking-tight animate-pulse">
            {message}
        </h2>
        <p className="text-slate-400 text-sm mt-1 font-medium">Récupération des données...</p>
    </div>
);

export const PremiumModal = ({ onClose, onSubscribe }) => {
    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
                {/* Header Gold */}
                <div className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 p-6 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                    <div className="relative z-10">
                        <Icon name="crown" weight="fill" className="text-5xl text-white drop-shadow-md mb-2 mx-auto animate-bounce" />
                        <h2 className="text-3xl font-black text-white drop-shadow-sm uppercase tracking-wider">Devenir Premium</h2>
                        <p className="text-amber-900 font-bold text-sm opacity-90">Débloque ton plein potentiel pour le Brevet</p>
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-all rounded-full hover:bg-black/10 flex items-center justify-center z-20"
                    >
                        <Icon name="x" size={24} weight="bold" />
                    </button>
                </div>

                {/* Corps de l'offre */}
                <div className="p-6 md:p-8 bg-white">
                    {/* Comparatif */}
                    <div className="space-y-4 mb-8">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <span className="text-slate-500 font-medium">Accès aux exercices de base</span>
                            <div className="flex gap-4 text-sm font-bold">
                                <span className="text-slate-400">Gratuit</span>
                                <span className="text-amber-500">Premium</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-700 font-bold flex items-center gap-2"><Icon name="infinity" className="text-indigo-500" /> Accès illimité (Brevets)</span>
                            <div className="flex gap-8">
                                <Icon name="x" className="text-slate-200" weight="bold" />
                                <Icon name="check" className="text-emerald-500" weight="bold" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-700 font-bold flex items-center gap-2"><Icon name="chart-line-up" className="text-blue-500" /> Statistiques avancées</span>
                            <div className="flex gap-8">
                                <Icon name="x" className="text-slate-200" weight="bold" />
                                <Icon name="check" className="text-emerald-500" weight="bold" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-700 font-bold flex items-center gap-2"><Icon name="medal" className="text-purple-500" /> Mode Survie & Classements</span>
                            <div className="flex gap-8">
                                <Icon name="x" className="text-slate-200" weight="bold" />
                                <Icon name="check" className="text-emerald-500" weight="bold" />
                            </div>
                        </div>
                    </div>

                    {/* Prix et Bouton */}
                    <div className="text-center">
                        <div className="mb-6">
                            <span className="text-4xl font-black text-slate-800">29€</span>
                            <span className="text-slate-400 font-bold"> / an</span>
                            <p className="text-xs text-green-600 font-bold mt-1 bg-green-50 inline-block px-2 py-1 rounded">Paiement unique • Valable jusqu'en Juillet</p>
                        </div>

                        <button
                            onClick={onSubscribe}
                            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg shadow-xl shadow-slate-200 hover:bg-indigo-600 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                        >
                            <span>Débloquer maintenant</span>
                            <Icon name="credit-card" />
                        </button>
                        <p className="text-[10px] text-slate-400 mt-4">Paiement sécurisé via Stripe. Satisfait ou remboursé sous 14 jours.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};