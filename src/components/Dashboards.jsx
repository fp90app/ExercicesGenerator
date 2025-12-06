import React, { useState, useEffect } from 'react';

import { Icon, Leaderboard, LegendBox, SchoolHeader, XPHelpModal } from './UI';
import { AUTOMATISMES_DATA, TABLES_LIST, TRAINING_MODULES, QUESTIONS_DB, PROCEDURAL_EXOS } from '../utils/data';
import { BREVET_DATA } from '../utils/brevetData';

// --- UTILITAIRES COULEURS (Mis à jour pour matcher la vue Prof) ---
const getLevelColor = (count) => {
    // 3 réussites : Terminé (Vert foncé + Blanc + Ombre)
    if (count >= 3) return "bg-emerald-600 text-white border-emerald-700 shadow-sm";
    // 2 réussites : Avancé (Vert moyen)
    if (count === 2) return "bg-emerald-300 text-emerald-900 border-emerald-400";
    // 1 réussite : Débuté (Vert très clair)
    if (count === 1) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    // 0 réussite : Pas fait (Gris standard)
    return "bg-slate-100 text-slate-300 border-slate-200 hover:border-indigo-300 hover:text-indigo-400";
};

// --- WIDGET QUÊTES ---
export const DailyQuestsWidget = ({ daily, onPlay, onGoToAuto }) => {
    if (!daily || !daily.q1) return null;
    const allFinished = daily.completed;
    const containerStyle = allFinished ? "bg-gradient-to-br from-purple-50 to-white border-2 border-purple-200 shadow-md" : "bg-white border-2 border-slate-100 shadow-sm";
    return (
        <div className={`rounded-2xl p-6 mb-8 relative overflow-hidden pop-in transition-all ${containerStyle}`}>
            <div className="flex justify-between items-center mb-6 relative z-10">
                <h3 className={`font-black text-xl flex items-center gap-2 ${allFinished ? 'text-purple-700' : 'text-slate-800'}`}>
                    <Icon name={allFinished ? "trophy-fill" : "calendar-check"} className={allFinished ? "text-purple-500" : "text-amber-500"} />
                    {allFinished ? "Quêtes terminées !" : "Quêtes du jour"}
                </h3>
                <div className="flex flex-col items-center px-3 py-1.5 rounded-xl transition-transform hover:scale-105 bg-orange-50 text-orange-500 border border-orange-100">
                    <div className="flex items-center gap-1"><Icon name="fire" weight="fill" className={`text-xl ${allFinished ? 'animate-bounce' : 'animate-pulse'}`} /><span className="font-black text-lg leading-none mt-0.5">{daily.streak}</span></div>
                </div>
            </div>
            <div className="space-y-4 relative z-10">
                <div className={`p-4 rounded-xl border ${daily.q1.done ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between items-center mb-3">
                        <span className={`font-bold text-sm flex items-center gap-2 ${daily.q1.done ? 'text-purple-800' : 'text-slate-700'}`}><Icon name="grid-four" /> Objectifs Tables</span>
                        {!daily.q1.done && <span className="text-[10px] font-bold bg-white border border-slate-200 text-slate-500 px-2 py-1 rounded uppercase tracking-wide shadow-sm">+10xp</span>}
                    </div>
                    <div className="flex gap-3">
                        {daily.q1.targets.map((target, idx) => {
                            const targetId = `${target.type}_${target.val}`;
                            const isDone = daily.q1.progress.includes(targetId);
                            const btnClass = isDone ? "bg-purple-200 text-purple-800 shadow-sm scale-105 ring-1 ring-purple-300 border-purple-200" : "bg-white text-slate-600 border-2 border-slate-200 hover:border-indigo-300 hover:text-indigo-600";
                            const label = target.type === 'TABLES' ? `Table de ${target.val}` : `Div. par ${target.val}`;
                            const icon = target.type === 'TABLES' ? "x" : "divide";
                            return (
                                <button key={idx} onClick={() => onPlay(target.type, target.val)} className={`relative flex-1 text-center py-3 rounded-xl text-sm font-bold transition-all active:scale-95 overflow-visible flex flex-col items-center justify-center gap-1 ${btnClass}`}>
                                    {isDone && (<div className="absolute -top-3 -right-2 text-purple-600 bg-white rounded-full drop-shadow-sm z-30"><Icon name="check-circle" weight="fill" className="text-2xl" /></div>)}
                                    <div className="text-lg mb-0.5"><Icon name={icon} weight="bold" /></div>
                                    <div className="leading-tight">{label}</div>
                                </button>
                            )
                        })}
                    </div>
                </div>
                <div onClick={onGoToAuto} className={`p-4 rounded-xl border transition-all relative cursor-pointer group flex items-center justify-between shadow-sm ${daily.q2.done ? "bg-purple-50 border-purple-200" : "bg-slate-50 border-slate-200 hover:border-indigo-300 hover:bg-white"}`}>
                    <div className="flex flex-col relative z-10">
                        <span className={`font-bold text-sm flex items-center gap-2 ${daily.q2.done ? 'text-purple-800' : 'text-slate-700'}`}><Icon name="lightning" weight={daily.q2.done ? "fill" : "regular"} className={daily.q2.done ? "text-purple-600" : "text-slate-400"} /> Fais un automatisme</span>
                        <span className={`text-xs mt-1 ${daily.q2.done ? 'text-purple-600' : 'text-slate-400'}`}>Valide n'importe quel exercice.</span>
                    </div>
                    {daily.q2.done ? (<div className="bg-purple-500 text-white p-2 rounded-full shadow-md"><Icon name="check" weight="bold" className="text-xl" /></div>) : (<div className="w-8 h-8 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center text-slate-300 group-hover:border-indigo-300 group-hover:text-indigo-500 transition-colors"><Icon name="caret-right" weight="bold" /></div>)}
                </div>
            </div>
        </div>
    );
};

// --- SURVIVAL VIEW ---
export const SurvivalView = ({ user, onPlay, onBack }) => {
    const getMyHistory = (mode) => {
        let myRaw = user.data.survival_history?.[mode];
        let myArr = Array.isArray(myRaw) ? myRaw : (typeof myRaw === 'number' ? [myRaw] : []);
        return myArr
            .map(x => ({
                val: (typeof x === 'object' && x.val !== undefined) ? x.val : x,
                date: (typeof x === 'object' && x.date) ? x.date : null,
                isUser: true
            }))
            .sort((a, b) => b.val - a.val)
            .slice(0, 5);
    };

    const modeCards = [
        { id: "EXPLORATEUR", icon: "compass", desc: "Niveau 1", label: "Explorateur", classes: "border-b-emerald-500", iconBg: "bg-emerald-100 text-emerald-600" },
        { id: "AVENTURIER", icon: "flag", desc: "Niveau 2", label: "Aventurier", classes: "border-b-amber-500", iconBg: "bg-amber-100 text-amber-600" },
        { id: "LEGENDE", icon: "skull", desc: "Tous niveaux", label: "Légende", classes: "border-b-red-500", iconBg: "bg-red-100 text-red-600" }
    ];

    return (
        <div className="fade-in pb-12">
            <button onClick={onBack} className="mb-4 text-sm text-slate-400 flex items-center gap-1 hover:text-indigo-600"><Icon name="arrow-left" /> Retour</button>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Mode Survie</h2>
            <LegendBox icon="trophy" color="red" text="Mode Défi : Battes ton propre record !" />
            <div className="grid md:grid-cols-3 gap-6">
                {modeCards.map(m => (
                    <div key={m.id} className="flex flex-col gap-4">
                        <button onClick={() => onPlay('SURVIVAL_PLAY', m.id)} className={`bg-white p-6 rounded-2xl text-center border-2 border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group border-b-4 ${m.classes}`}>
                            <div className={`w-14 h-14 mx-auto rounded-xl flex items-center justify-center text-3xl mb-3 group-hover:scale-110 transition-transform ${m.iconBg}`}><Icon name={m.icon} /></div>
                            <h3 className="text-lg font-bold text-slate-800">{m.label}</h3>
                            <p className="text-slate-400 text-xs">{m.desc}</p>
                        </button>
                        <Leaderboard title="Mon Historique" data={getMyHistory(m.id)} unit="" />
                        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                            <Icon name="users" className="text-slate-300 text-xl mb-1 mx-auto" />
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Classement global en maintenance</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- LOGIN ---
export const Login = ({ onLogin, onSound }) => {
    const [id, setId] = useState("");
    const [pwd, setPwd] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md text-center fade-in">
                <div className="text-6xl mb-4">🚀</div>
                <h1 className="text-3xl font-black text-slate-800 mb-6">Maths Signoret</h1>
                <form onSubmit={e => { e.preventDefault(); onSound('CLICK'); onLogin(id, pwd); }} className="space-y-4">
                    <input type="text" autoFocus value={id} onChange={e => setId(e.target.value)} className="w-full p-3 border-2 rounded-xl font-bold text-center uppercase outline-none focus:border-indigo-500" placeholder="Identifiant" />
                    <div className="relative">
                        <input type={showPwd ? "text" : "password"} className="w-full p-2 border rounded text-center" placeholder="Mot de passe (optionnel)" value={pwd} onChange={e => setPwd(e.target.value)} />
                        <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600"><Icon name={showPwd ? "eye-slash" : "eye"} /></button>
                    </div>
                    <button className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-transform hover:scale-105">Connexion</button>
                </form>
            </div>
        </div>
    );
};

// --- VUE TABLES ---
export const TablesView = ({ user, onPlay, onBack, onSound }) => {
    const [selected, setSelected] = useState([]);
    const [ops, setOps] = useState({ mul: true, div: true });

    const myHistory = (user.data.grand_slam_history || [])
        .map(h => ({
            val: parseFloat((typeof h === 'object' && h.val) ? h.val : h),
            date: (typeof h === 'object' && h.date) ? h.date : null,
            isUser: true
        }))
        .filter(x => !isNaN(x.val))
        .sort((a, b) => a.val - b.val)
        .slice(0, 5)
        .map(x => ({ ...x, val: x.val.toFixed(2) }));

    const toggle = (id) => { setSelected(prev => { const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]; onSound('CLICK'); return next; }); };
    const isDailyDone = (key) => user.data.daily?.[key] === new Date().toDateString();

    return (
        <div className="fade-in pb-12">
            <button onClick={onBack} className="mb-4 text-sm text-slate-400 flex items-center gap-1 hover:text-indigo-600"><Icon name="arrow-left" /> Retour</button>
            <div className="grid lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm col-span-1 lg:col-span-2">
                    <h3 className="font-bold text-slate-800 uppercase text-sm mb-4 flex items-center gap-2"><Icon name="grid-four" className="text-amber-500" /> I. Entrainement Ciblé</h3>
                    <LegendBox icon="infinity" color="purple" text="20 points chaque jour pour les tables et les mélanges de divisions" />
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                        <button onClick={() => onPlay('TABLES_ALL', null)} className={`p-4 rounded-xl border-2 flex justify-between items-center transition-all group text-left ${isDailyDone('allTablesDate') ? 'bg-purple-50 border-purple-200 text-purple-900' : 'bg-white border-purple-100 hover:border-purple-400 hover:shadow-md'}`}>
                            <div><div className="font-bold text-lg">Toutes les tables (×)</div><div className="text-xs opacity-70">Mélange 2 à 12 • 20 XP</div></div>
                            {isDailyDone('allTablesDate') ? <Icon name="check-circle" className="text-2xl text-purple-600" /> : <Icon name="play-circle" className="text-2xl text-purple-300 group-hover:text-purple-600" />}
                        </button>
                        <button onClick={() => onPlay('DIVISIONS_ALL', [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])} className={`p-4 rounded-xl border-2 flex justify-between items-center transition-all group text-left ${isDailyDone('allDivisionsDate') ? 'bg-cyan-50 border-cyan-200 text-cyan-900' : 'bg-white border-cyan-100 hover:border-cyan-400 hover:shadow-md'}`}>
                            <div><div className="font-bold text-lg">Manipuler (÷)</div><div className="text-xs opacity-70">Inverses 2 à 12 • 20 XP</div></div>
                            {isDailyDone('allDivisionsDate') ? <Icon name="check-circle" className="text-2xl text-cyan-600" /> : <Icon name="play-circle" className="text-2xl text-cyan-300 group-hover:text-cyan-600" />}
                        </button>
                    </div>
                    <LegendBox icon="star" color="amber" text="Gagne 10 XP par table ou division validée (max 3 fois chacune)" />

                    <h4 className="font-bold text-slate-400 text-xs uppercase mb-3 border-b pb-2 mt-6">Multiplications</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
                        {TABLES_LIST.map(t => {
                            const wins = user.data.tables ? (user.data.tables[t.id] || 0) : 0;
                            return (
                                <button key={'mul' + t.id} onClick={() => onPlay('TABLES', t.id)} className="bg-slate-50 border border-slate-200 rounded-xl p-3 hover:border-amber-400 hover:bg-amber-50 transition-all text-center group">
                                    <div className="font-bold text-slate-700 mb-1">Table de {t.id}</div>
                                    <div className="flex justify-center gap-1">{[1, 2, 3].map(i => <div key={i} className={`w-2 h-2 rounded-full ${wins >= i ? 'bg-amber-500' : 'bg-slate-200'}`}></div>)}</div>
                                </button>
                            )
                        })}
                    </div>
                    <h4 className="font-bold text-slate-400 text-xs uppercase mb-3 border-b pb-2">Divisions</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {TABLES_LIST.map(t => {
                            const wins = user.data.divisions ? (user.data.divisions[t.id] || 0) : 0;
                            return (
                                <button key={'div' + t.id} onClick={() => onPlay('DIVISIONS', t.id)} className="bg-slate-50 border border-slate-200 rounded-xl p-3 hover:border-cyan-400 hover:bg-cyan-50 transition-all text-center group">
                                    <div className="font-bold text-slate-700 mb-1">Division par {t.id}</div>
                                    <div className="flex justify-center gap-1">{[1, 2, 3].map(i => <div key={i} className={`w-2 h-2 rounded-full ${wins >= i ? 'bg-cyan-500' : 'bg-slate-200'}`}></div>)}</div>
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="space-y-6 col-span-1">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 uppercase text-sm mb-4 flex items-center gap-2"><Icon name="shuffle" className="text-indigo-500" /> 2. Choix Libre</h3>
                        <div className="text-xs text-slate-500 mb-4 bg-slate-50 p-2 rounded">Sélectionne les tables et le type d'opération. (Pas d'XP ici).</div>
                        <div className="grid grid-cols-5 gap-2 mb-6">
                            {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (<button key={n} onClick={() => toggle(n)} className={`h-10 rounded-lg font-bold border-2 transition-all text-sm ${selected.includes(n) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-300'}`}>{n}</button>))}
                        </div>
                        <div className="flex gap-2 mb-4">
                            <button onClick={() => setOps(prev => ({ ...prev, mul: !prev.mul }))} className={`flex-1 py-2 rounded-lg font-bold text-sm border-2 flex items-center justify-center gap-2 transition-all ${ops.mul ? 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-slate-50 border-slate-100 text-slate-300 grayscale'}`}><Icon name="x" weight="bold" /> Multiplier</button>
                            <button onClick={() => setOps(prev => ({ ...prev, div: !prev.div }))} className={`flex-1 py-2 rounded-lg font-bold text-sm border-2 flex items-center justify-center gap-2 transition-all ${ops.div ? 'bg-cyan-50 border-cyan-400 text-cyan-700' : 'bg-slate-50 border-slate-100 text-slate-300 grayscale'}`}><Icon name="divide" weight="bold" /> Diviser</button>
                        </div>
                        <button onClick={() => { if (selected.length === 0) return alert("Choisis au moins une table !"); if (!ops.mul && !ops.div) return alert("Choisis au moins un mode !"); onPlay('FREE_MIX', { tables: selected, modes: ops }); }} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg transform active:scale-95">Lancer l'entraînement</button>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 uppercase text-sm mb-4 flex items-center gap-2"><Icon name="stopwatch" className="text-orange-500" /> 3. La Totale (Chrono)</h3>
                        <div className="text-xs text-slate-500 mb-4 bg-slate-50 p-2 rounded">Le Grand Chelem : 20 questions (× et ÷ mélangés). Vise le meilleur temps !</div>
                        <button onClick={() => onPlay('CHRONO', null)} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black py-4 rounded-xl shadow-lg hover:scale-105 transition-all flex items-center justify-center gap-3 mb-6">LANCER LE CHRONO</button>
                        <div className="space-y-2">
                            <Leaderboard title="Mon Historique" data={myHistory} unit="s" />
                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-center">
                                <Icon name="users" className="text-slate-300 text-xl mb-1 mx-auto" />
                                <p className="text-[10px] text-slate-400 uppercase font-bold">Classement global en maintenance</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- VUE LISTE DES SUJETS DE BREVET --- //
// Modification: Ajout de la prop 'user' pour récupérer l'historique
// --- VUE LISTE DES SUJETS DE BREVET --- //
const BrevetList = ({ onPlay, onBack, user }) => {
    return (
        <div className="fade-in pb-12">
            {/* Bouton Retour */}
            <button onClick={onBack} className="mb-6 text-sm text-slate-400 flex items-center gap-1 hover:text-indigo-600 transition-colors">
                <Icon name="arrow-left" /> Retour au menu
            </button>

            <div className="mb-8">
                <h2 className="text-3xl font-black text-slate-800 mb-2 flex items-center gap-3">
                    <span className="bg-emerald-100 text-emerald-600 p-2 rounded-xl text-2xl"><Icon name="graduation-cap" /></span>
                    Annales du Brevet
                </h2>
                <p className="text-slate-500 max-w-2xl">
                    Entraîne-toi sur des sujets réels. Prends le temps de bien lire les énoncés.
                    La calculatrice est autorisée pour la partie problèmes.
                </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {BREVET_DATA.map(subject => {
                    // --- 1. RÉCUPÉRATION DU SCORE ---
                    const userHistory = user.data?.brevet_history?.[subject.id];
                    const bestScore = userHistory ? userHistory.markOver20 : null;

                    return (
                        <div key={subject.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col relative">

                            {/* En-tête visuel */}
                            <div className="h-28 bg-slate-50 border-b border-slate-100 flex items-center justify-center relative overflow-hidden group-hover:bg-indigo-50 transition-colors">
                                {/* Motif de fond léger */}
                                <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]"></div>

                                {/* MODIFICATION ICI : Icône plus grosse, plus claire et changée pour "graduation-cap" */}
                                <Icon name="graduation-cap" className="text-7xl text-slate-200 group-hover:text-indigo-200 transition-colors duration-500 transform group-hover:scale-110" />

                                {/* MODIFICATION ICI : Le badge "18 pts" a été supprimé */}

                                {/* Badge Score (reste affiché s'il existe) */}
                                {bestScore && (
                                    <div className={`absolute top-3 left-3 px-3 py-1 rounded-lg text-xs font-bold shadow-sm border ${parseFloat(bestScore) >= 12
                                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                        : 'bg-orange-100 text-orange-700 border-orange-200'
                                        }`}>
                                        Note : {bestScore}/20
                                    </div>
                                )}
                            </div>

                            <div className="p-6 flex-1 flex flex-col">
                                <div className="mb-4">
                                    <h3 className="text-xl font-bold text-slate-800 mb-1">{subject.title}</h3>
                                    <p className="text-sm text-slate-500 leading-snug">{subject.description}</p>
                                </div>

                                {/* Détails du contenu */}
                                <div className="flex gap-2 mb-6">
                                    {subject.parts.map((part, i) => (
                                        <span key={i} className="text-[10px] uppercase font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded">
                                            {part.title.split(':')[0]}
                                        </span>
                                    ))}
                                </div>

                                <div className="mt-auto">
                                    <button
                                        onClick={() => onPlay('BREVET', subject.id)}
                                        className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 shadow-lg"
                                    >
                                        <Icon name="play" weight="fill" /> {bestScore ? "Recommencer" : "Commencer"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Carte "Bientôt" pour remplir si vide */}
                <div className="border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-400 min-h-[300px]">
                    <Icon name="clock" size={32} className="mb-2 opacity-50" />
                    <span className="font-bold text-sm">D'autres sujets arrivent...</span>
                </div>
            </div>
        </div>
    );
};


// =========================================================
// 4. STUDENT DASHBOARD (MAIN) - VERSION COMPACTE & ALIGNÉE
// =========================================================
export const StudentDashboard = ({ user, onPlay, onLogout, activeTab, setActiveTab, loading, onAdmin, onSound, onResetTraining }) => {
    const [showXPInfo, setShowXPInfo] = useState(false);

    const menuStyles = {
        amber: { container: "border-b-amber-100 hover:border-amber-500", iconBox: "bg-amber-100 text-amber-600", footer: "text-amber-600" },
        indigo: { container: "border-b-indigo-100 hover:border-indigo-500", iconBox: "bg-indigo-100 text-indigo-600", footer: "text-indigo-600" },
        emerald: { container: "border-b-emerald-100 hover:border-emerald-500", iconBox: "bg-emerald-100 text-emerald-600", footer: "text-emerald-600" },
        red: { container: "border-b-red-100 hover:border-red-500", iconBox: "bg-red-100 text-red-600", footer: "text-red-600" },
    };

    const MenuCard = ({ icon, title, desc, color, onClick, footer }) => {
        const style = menuStyles[color] || menuStyles.amber;
        return (
            <button onClick={() => { onSound('CLICK'); onClick(); }} className={`p-5 rounded-2xl bg-white border-2 border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left group border-b-4 relative overflow-hidden w-full flex flex-col ${style.container}`}>
                <div className="flex-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 group-hover:scale-110 transition-transform ${style.iconBox}`}><Icon name={icon} /></div>
                    <h3 className="text-lg font-bold text-slate-800 mb-0.5 leading-tight">{title}</h3>
                    <p className="text-xs text-slate-400 mb-2 leading-snug">{desc}</p>
                </div>
                {footer && <div className={`mt-2 pt-2 border-t border-slate-100 text-[10px] font-bold flex items-center gap-1 w-full ${style.footer}`}><Icon name="trophy" className="text-sm shrink-0" /><div className="w-full truncate">{typeof footer === 'function' ? footer() : footer}</div></div>}
            </button>
        );
    };

    const getStatus = (id, lvl) => {
        if (user.role !== 'teacher' && user.allowed && !user.allowed.includes(id)) return 'LOCKED';
        const isProcedural = PROCEDURAL_EXOS.includes(id);
        const isStaticValid = QUESTIONS_DB[id] && QUESTIONS_DB[id][lvl] && QUESTIONS_DB[id][lvl].length >= 10;
        if (!isProcedural && !isStaticValid) return 'EMPTY';
        if (lvl === 1) return 'OPEN';
        const prev = user.data.training[id]?.[lvl - 1] || 0;
        return prev > 0 ? 'OPEN' : 'LOCKED';
    };

    const handleClick = (id, lvl) => {
        onSound('CLICK');
        const status = getStatus(id, lvl);
        if (status === 'EMPTY') alert("En construction");
        else if (status === 'LOCKED') alert(`🔒 Finis d'abord le niveau ${lvl - 1} !`);
        else onPlay('TRAINING', id, lvl);
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-8 md:pb-12">
            {showXPInfo && <XPHelpModal onClose={() => setShowXPInfo(false)} />}

            <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
                <div className="max-w-5xl mx-auto px-4 h-14 md:h-16 flex justify-between items-center">
                    <div className="flex items-center gap-2 md:gap-3 cursor-pointer" onClick={() => setActiveTab('HOME')}>
                        <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">{user.data.nom[0]}</div>
                        <div className="leading-none"><div className="font-bold text-sm md:text-base">{user.data.nom}</div><div className="text-[10px] text-slate-400">{user.data.identifiant}</div></div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        {user.role === 'teacher' && <button onClick={onAdmin} className="bg-slate-800 text-white w-8 h-8 md:w-auto md:px-3 md:py-1 rounded-full text-xs font-bold flex items-center justify-center gap-1 hover:bg-slate-700"><Icon name="crown" /><span className="hidden md:inline">Profs</span></button>}
                        <button onClick={() => { onSound('CLICK'); setShowXPInfo(true); }} className="bg-amber-50 text-amber-700 px-2 py-1 md:px-3 rounded-full text-xs md:text-sm font-bold border border-amber-100 flex items-center gap-1 hover:bg-amber-100 hover:scale-105 transition-all cursor-pointer"><Icon name="star-fill" /> {user.data.xp}</button>
                        <button onClick={onLogout} className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100"><Icon name="sign-out" /></button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-3 md:p-4 py-4 md:py-8">
                {activeTab === 'HOME' && <SchoolHeader />}
                {activeTab === 'HOME' && user.data.daily && <DailyQuestsWidget daily={user.data.daily} onPlay={onPlay} onGoToAuto={() => setActiveTab('AUTOMATISMES')} />}

                {activeTab === 'HOME' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 fade-in">
                        <MenuCard icon="grid-four" title="Tables" desc="Multiplications et divisions." color="amber" onClick={() => setActiveTab('TABLES')} footer={user.data.best_grand_slam && user.data.best_grand_slam < 999 ? `Record : ${parseFloat(user.data.best_grand_slam).toFixed(2)}s` : "Pas de chrono"} />
                        <MenuCard icon="lightning" title="Automatismes" desc="Les 40 thèmes du brevet." color="indigo" onClick={() => setActiveTab('AUTOMATISMES')} footer={() => { const count = user.data.training ? Object.keys(user.data.training).length : 0; const label = count > 1 ? "notions" : "notion"; return count > 0 ? `${count} ${label}` : "Aucun exercice"; }} />
                        <MenuCard
                            icon="graduation-cap" // Changement d'icône
                            title="Brevet" // Changement de titre
                            desc="Sujets complets"
                            color="emerald" // On garde le vert ou on change
                            onClick={() => setActiveTab('BREVET')} // Nouvelle clé pour l'onglet
                            footer={`${BREVET_DATA.length} sujet${BREVET_DATA.length > 1 ? 's' : ''} disponible${BREVET_DATA.length > 1 ? 's' : ''}`}
                        />
                        <MenuCard icon="fire" title="Survie" desc="Défis chronométrés." color="red" onClick={() => setActiveTab('SURVIVAL')} footer={() => { const h = user.data.survival_history || {}; const getBest = (k) => Math.max(0, ...(h[k]?.map(x => (typeof x === 'object' ? x.val : x)) || [])); const s1 = getBest('EXPLORATEUR'); if (s1 === 0) return "Aucun record"; return `Record Expl. : ${s1}`; }} />
                    </div>
                )}

                {activeTab === 'TABLES' && <TablesView user={user} onPlay={onPlay} onBack={() => setActiveTab('HOME')} onSound={onSound} />}

                {activeTab === 'AUTOMATISMES' && (
                    <div className="fade-in space-y-4">
                        <button onClick={() => setActiveTab('HOME')} className="mb-2 text-sm text-slate-400 flex items-center gap-1 hover:text-indigo-600"><Icon name="arrow-left" /> Retour</button>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            {AUTOMATISMES_DATA.map((cat, i) => (
                                <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col h-full">
                                    {/* Header Compact */}
                                    <div className={`bg-${cat.color}-50 px-3 py-2 border-b border-${cat.color}-100 flex justify-between items-center`}>
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1.5 rounded-lg bg-white text-${cat.color}-600 shadow-sm`}>
                                                <Icon name="lightning" weight="fill" className="text-sm" />
                                            </div>
                                            <div>
                                                <h3 className={`font-black text-${cat.color}-800 text-sm md:text-base leading-none`}>{cat.title.replace(/^[IVX]+\.\s*/, '')}</h3>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-bold text-${cat.color}-600 bg-white/50 px-2 py-0.5 rounded-full`}>{cat.exos.length}</span>
                                    </div>

                                    {/* Liste Exercices */}
                                    <div className="bg-white">
                                        {cat.exos.map(exo => {
                                            const statusGlobal = getStatus(exo.id, 1);
                                            const isLocked = statusGlobal === 'LOCKED' || statusGlobal === 'EMPTY';
                                            const progress = user.data.training?.[exo.id] || {};
                                            const hasProgress = progress && Object.keys(progress).length > 0;

                                            // Classes communes pour l'alignement
                                            const rowBase = "flex justify-between items-center px-2 py-1.5 md:px-3 md:py-2 border-b border-slate-100 last:border-0 min-h-[40px]";

                                            if (isLocked) {
                                                return (
                                                    <div key={exo.id} className={`${rowBase} bg-slate-50/50 opacity-50`}>
                                                        <div className="flex items-center gap-2 overflow-hidden flex-1">
                                                            {/* Placeholder Icon Slot pour alignement */}
                                                            <div className="w-5 flex justify-center shrink-0 text-slate-400"><Icon name="lock-key" size={12} /></div>
                                                            <span className="text-xs font-bold text-slate-400 truncate">{exo.title}</span>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div key={exo.id} className={`${rowBase} hover:bg-slate-50 group transition-colors`}>
                                                    <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                                                        {/* Slot Icône Gauche (Alignement Garanti) */}
                                                        <div className="w-5 flex justify-center shrink-0">
                                                            {hasProgress ? (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); if (confirm("Remettre à zéro ?")) { onResetTraining(exo.id); onSound('CLICK'); } }}
                                                                    className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                                    title="Réinitialiser"
                                                                >
                                                                    <Icon name="arrow-counter-clockwise" size={14} />
                                                                </button>
                                                            ) : (
                                                                // Point discret pour marquer la ligne ou vide mais avec width
                                                                <div className="w-1 h-1 rounded-full bg-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                            )}
                                                        </div>

                                                        {/* Titre */}
                                                        <span className="text-xs md:text-sm font-bold text-slate-700 truncate leading-tight cursor-default" title={exo.title}>{exo.title}</span>
                                                    </div>

                                                    {/* Boutons Niveaux */}
                                                    <div className="flex gap-1 shrink-0">
                                                        {[1, 2, 3].map(lvl => {
                                                            const st = getStatus(exo.id, lvl);
                                                            const isLvlLocked = st === 'LOCKED';
                                                            const count = progress[lvl] || 0;
                                                            const btnSize = "w-6 h-6 md:w-7 md:h-7 text-[10px] md:text-xs"; // Compact

                                                            if (isLvlLocked) {
                                                                return (
                                                                    <div key={lvl} className={`${btnSize} rounded border bg-slate-50 border-slate-100 flex items-center justify-center text-slate-200 cursor-not-allowed`}>
                                                                        <Icon name="lock-key" size={10} weight="fill" />
                                                                    </div>
                                                                );
                                                            }

                                                            return (
                                                                <button
                                                                    key={lvl}
                                                                    onClick={(e) => { e.stopPropagation(); handleClick(exo.id, lvl); }}
                                                                    className={`${btnSize} rounded border flex items-center justify-center font-bold transition-all active:scale-95 ${getLevelColor(count)}`}
                                                                >
                                                                    {count >= 3 ? <Icon name="check" size={12} weight="bold" /> : lvl}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'BREVET' && (
                    <BrevetList
                        user={user} // <--- AJOUTER CETTE PROP
                        onPlay={onPlay}
                        onBack={() => setActiveTab('HOME')}
                    />
                )}

                {activeTab === 'SURVIVAL' && <SurvivalView user={user} onPlay={onPlay} onBack={() => setActiveTab('HOME')} />}
            </main>
        </div>
    );
};