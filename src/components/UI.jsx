import React from 'react';
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

// --- Les autres composants UI (inchangés mais inclus pour être complet) ---

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

export const SchoolHeader = () => (
    <div className="relative bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-6 mb-8 shadow-sm overflow-hidden border border-purple-100">
        <div className="absolute inset-0 pointer-events-none font-serif italic text-purple-200 select-none z-0 opacity-30">
            <span className="absolute top-4 left-16 text-3xl">√x</span>
            <span className="absolute bottom-10 left-28 text-4xl">≈</span>
            <span className="absolute top-1/4 left-1/3 text-2xl">Δ</span>
            <span className="absolute bottom-6 right-[30%] text-2xl">α</span>
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-purple-100 shadow-sm shrink-0">
                    <Icon name="graduation-cap" className="text-4xl text-purple-600" />
                </div>
                <div className="text-center md:text-left">
                    <div className="text-xs font-bold text-purple-400 tracking-widest uppercase mb-1 flex items-center justify-center md:justify-start gap-1">
                        <Icon name="map-pin" weight="fill" size={12} /> Belfort
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-800 leading-none">
                        COLLÈGE <span className="text-purple-600">SIMONE SIGNORET</span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 font-medium">Espace d'entraînement aux mathématiques</p>
                </div>
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