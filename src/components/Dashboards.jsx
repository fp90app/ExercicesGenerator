import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, query, where, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebase";
import { useProgram } from '../hooks/useProgram';
import ContactModal from './ContactModal';
const auth = getAuth();
import { usePremium } from '../hooks/usePremium';
import { toast } from 'react-hot-toast';
import { Icon, Leaderboard, LegendBox, SchoolHeader, XPHelpModal, LoadingScreen, PremiumModal } from './UI';
import { AUTOMATISMES_DATA, TABLES_LIST } from '../utils/data';
// --- UTILITAIRES COULEURS ---
const getLevelColor = (count) => {
    if (count >= 3) return "bg-emerald-600 text-white border-emerald-700 shadow-sm";
    if (count === 2) return "bg-emerald-300 text-emerald-900 border-emerald-400";
    if (count === 1) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    return "bg-white text-slate-700 border-slate-300 hover:border-indigo-400 hover:text-indigo-600 hover:shadow-md";
};

const NewsBanner = () => {
    const [news, setNews] = useState(null);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const docRef = doc(db, "config", "general");
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const data = snap.data();
                    // On n'affiche que s'il y a un message non vide
                    if (data.newsMessage && data.newsMessage.trim() !== "") {
                        setNews(data);
                    }
                }
            } catch (e) {
                console.error("Erreur news", e);
            }
        };
        fetchNews();
    }, []);

    if (!news) return null;

    // Mapping des couleurs (blue, emerald, amber, red, purple)
    const colorClasses = {
        blue: "bg-blue-100 text-blue-800 border-blue-200",
        emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
        amber: "bg-amber-100 text-amber-800 border-amber-200",
        red: "bg-red-100 text-red-800 border-red-200",
        purple: "bg-purple-100 text-purple-800 border-purple-200",
        rose: { bg: "bg-rose-50", border: "border-rose-100", textDark: "text-rose-800", textLight: "text-rose-600", bar: "bg-rose-500" },
        slate: { bg: "bg-slate-100", border: "border-slate-200", textDark: "text-slate-800", textLight: "text-slate-600", bar: "bg-slate-600" },
    };

    const style = colorClasses[news.newsColor] || colorClasses.blue;

    return (
        <div className={`mx-auto max-w-5xl mb-6 p-4 rounded-xl border flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top-4 ${style}`}>
            <Icon name="megaphone" weight="fill" className="text-xl shrink-0" />
            <span className="font-bold text-sm md:text-base">{news.newsMessage}</span>
        </div>
    );
};

// ============================================================================
// WIDGET QUÊTES (Inchangé)
// ============================================================================
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

// ============================================================================
// SURVIVAL VIEW (Inchangé)
// ============================================================================
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
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================================================
// TABLES VIEW (Inchangé)
// ============================================================================
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
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// [MISE À JOUR] BREVET LIST : CONNECTÉE FIREBASE + FILTRE BROUILLON
// ============================================================================
// ============================================================================
// [MISE À JOUR] BREVET LIST : GESTION DES ACCÈS (CMS)
// ============================================================================
const BrevetList = ({ onPlay, onBack, user, setShowPremiumModal }) => {
    const [sujets, setSujets] = useState([]);
    const [contentRules, setContentRules] = useState({});
    const [loading, setLoading] = useState(true);

    // Vérifie si l'utilisateur est un prof ou admin (pour voir les brouillons et les contenus bloqués)
    const isAdmin = user.role === 'teacher' || user.data?.role === 'teacher' || user.data?.isAdmin;

    // On vérifie le statut Premium de l'élève (via le hook ou les props, ici on recalcul simple)
    // Note: Idéalement on devrait passer isPremium en prop, mais on peut le redéduire ici si user est à jour
    // Pour être sûr, on utilise usePremium si possible, ou on se base sur user.data.status
    // Simplification : On regarde user.data.status + VIP (si tu as passé user à jour)
    const isPremium = user.data?.status === 'premium' || (user.data?.profId && user.data.profId !== 'autonome' && user.data.profId.length > 5);
    // ^ Attention: Cette détection simplifiée suppose que tous les profs sont VIP. 
    // Si tu veux la vraie détection, passe 'isPremium' en prop depuis StudentDashboard.

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Charger les Règles de Contenu
                const rulesSnap = await getDoc(doc(db, "config", "content"));
                if (rulesSnap.exists()) setContentRules(rulesSnap.data());

                // 2. Charger les Sujets
                const querySnapshot = await getDocs(collection(db, "annales"));
                const list = querySnapshot.docs.map(doc => doc.data());

                // Filtrage initial (Brouillons)
                const filteredList = list.filter(sujet => {
                    if (sujet.published !== false) return true; // Publié
                    return isAdmin; // Brouillon visible seulement par admin
                });

                filteredList.sort((a, b) => (b.id || "").localeCompare(a.id || ""));
                setSujets(filteredList);
            } catch (error) {
                console.error("Erreur chargement:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isAdmin]);

    if (loading) return <div className="p-10 text-center font-bold text-slate-400 animate-pulse">Chargement des sujets...</div>;

    if (sujets.length === 0) return (
        <div className="p-10 text-center">
            <p className="text-slate-500 mb-4">Aucun sujet disponible.</p>
            <button onClick={onBack} className="text-indigo-600 font-bold hover:underline">Retour</button>
        </div>
    );

    return (
        <div className="fade-in pb-12">
            <button onClick={onBack} className="mb-6 text-sm text-slate-400 flex items-center gap-1 hover:text-indigo-600 transition-colors">
                <Icon name="arrow-left" /> Retour au menu
            </button>

            <div className="mb-8">
                <h2 className="text-3xl font-black text-slate-800 mb-2 flex items-center gap-3">
                    <span className="bg-emerald-100 text-emerald-600 p-2 rounded-xl text-2xl"><Icon name="graduation-cap" /></span>
                    Annales du Brevet
                </h2>
                {isAdmin && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg text-sm inline-flex items-center gap-2 mb-2">
                        <Icon name="eye" /> Mode Prof : Vous voyez tout (Brouillons & Bloqués).
                    </div>
                )}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sujets.map(subject => {
                    const userHistory = user.data?.brevet_history?.[subject.id];
                    const bestScore = userHistory ? userHistory.markOver20 : null;
                    const isDraft = subject.published === false;

                    // --- LOGIQUE D'ACCÈS ---
                    const ruleKey = `brevet_${subject.id}`;
                    // Par défaut, les brevets sont PREMIUM sauf si spécifié autrement
                    const rule = contentRules[ruleKey] || 'PREMIUM';

                    const isLocked = rule === 'LOCKED';
                    const isPremiumContent = rule === 'PREMIUM';

                    // L'élève a-t-il le droit d'entrer ?
                    // 1. Si LOCKED : Personne ne rentre (sauf Admin)
                    // 2. Si PREMIUM : Il faut être Premium (sauf Admin)
                    const accessDenied = !isAdmin && (isLocked || (isPremiumContent && !isPremium));

                    // Si c'est verrouillé, on l'affiche différemment
                    if (isLocked && !isAdmin) return null; // Option A : On cache totalement les sujets bloqués aux élèves

                    return (
                        <div key={subject.id} className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col relative ${isDraft || isLocked ? 'border-dashed border-slate-300 opacity-90' : 'border-slate-200'}`}>

                            {/* BANDEAUX */}
                            <div className="absolute top-0 right-0 z-20 flex flex-col items-end">
                                {isDraft && <div className="bg-slate-800 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl mb-1">BROUILLON</div>}
                                {isLocked && <div className="bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl mb-1">FERMÉ</div>}
                                {!isAdmin && isPremiumContent && !isPremium && <div className="bg-amber-400 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm flex items-center gap-1"><Icon name="crown" weight="fill" /> PREMIUM</div>}
                            </div>

                            <div className="h-28 bg-slate-50 border-b border-slate-100 flex items-center justify-center relative overflow-hidden group-hover:bg-indigo-50 transition-colors">
                                <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]"></div>
                                <Icon name="graduation-cap" className={`text-7xl transition-colors duration-500 transform group-hover:scale-110 ${isDraft || isLocked ? 'text-slate-300' : 'text-slate-200 group-hover:text-indigo-200'}`} />

                                {bestScore && !accessDenied && (
                                    <div className={`absolute top-3 left-3 px-3 py-1 rounded-lg text-xs font-bold shadow-sm border ${parseFloat(bestScore) >= 12 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-orange-100 text-orange-700 border-orange-200'}`}>
                                        Note : {bestScore}/20
                                    </div>
                                )}
                            </div>

                            <div className="p-6 flex-1 flex flex-col">
                                <div className="mb-4">
                                    <h3 className="text-xl font-bold text-slate-800 mb-1">{subject.title}</h3>
                                    <p className="text-sm text-slate-500 leading-snug">{subject.description || "Sujet complet"}</p>
                                </div>

                                <div className="mt-auto">
                                    <button
                                        onClick={() => {
                                            if (accessDenied) {
                                                if (isPremiumContent && !isPremium) {
                                                    // Si c'est juste une question d'argent, on ouvre la modale
                                                    setShowPremiumModal(true);
                                                } else {
                                                    // Si c'est LOCKED
                                                    toast.error("Ce sujet est temporairement indisponible.");
                                                }
                                            } else {
                                                onPlay('BREVET', subject.id);
                                            }
                                        }}
                                        className={`w-full text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg 
                                            ${accessDenied
                                                ? (isPremiumContent ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-400 cursor-not-allowed')
                                                : (isDraft ? 'bg-slate-500 hover:bg-slate-600' : 'bg-slate-900 hover:bg-indigo-600')
                                            }`}
                                    >
                                        {accessDenied ? (
                                            isPremiumContent ? <><Icon name="crown" weight="fill" /> Débloquer</> : <><Icon name="lock-key" /> Indisponible</>
                                        ) : (
                                            <><Icon name={isDraft ? "wrench" : "play"} weight="fill" /> {bestScore ? "Recommencer" : "Commencer"}</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
// ============================================================================
// STUDENT DASHBOARD (MAIN)
// ============================================================================
export const StudentDashboard = ({ user, onPlay, onLogout, activeTab, setActiveTab, loading: globalLoading, onAdmin, onSound, onResetTraining }) => {
    const [showXPInfo, setShowXPInfo] = useState(false);
    const [contentRules, setContentRules] = useState({});
    const { program, loading: programLoading } = useProgram();
    const [showContact, setShowContact] = useState(false);

    useEffect(() => {
        // On charge la config de contenu
        const loadRules = async () => {
            try {
                const snap = await getDoc(doc(db, "config", "content"));
                if (snap.exists()) setContentRules(snap.data());
            } catch (e) { console.error(e); }
        };
        loadRules();
    }, []);
    // On récupère aussi le 'loading' du hook premium
    // NOUVEAU : On passe 'user' en paramètre
    const { isPremium, loading: premiumLoading } = usePremium(user);

    const [showPremiumModal, setShowPremiumModal] = useState(false);

    // SÉCURITÉ : Si on charge les données globales OU le statut premium, on affiche le loader
    if (globalLoading || premiumLoading) {
        return <LoadingScreen message="Vérification de ton compte..." />;
    }
    const menuStyles = {
        amber: { container: "border-b-amber-100 hover:border-amber-500", iconBox: "bg-amber-100 text-amber-600", footer: "text-amber-600" },
        indigo: { container: "border-b-indigo-100 hover:border-indigo-500", iconBox: "bg-indigo-100 text-indigo-600", footer: "text-indigo-600" },
        emerald: { container: "border-b-emerald-100 hover:border-emerald-500", iconBox: "bg-emerald-100 text-emerald-600", footer: "text-emerald-600" },
        red: { container: "border-b-red-100 hover:border-red-500", iconBox: "bg-red-100 text-red-600", footer: "text-red-600" },
        // --- AJOUTS NÉCESSAIRES ---
        purple: { container: "border-b-purple-100 hover:border-purple-500", iconBox: "bg-purple-100 text-purple-600", footer: "text-purple-600" },
        cyan: { container: "border-b-cyan-100 hover:border-cyan-500", iconBox: "bg-cyan-100 text-cyan-600", footer: "text-cyan-600" },
        rose: { container: "border-b-rose-100 hover:border-rose-500", iconBox: "bg-rose-100 text-rose-600", footer: "text-rose-600" },

        // TA NOUVELLE SECTION (Expert)
        slate: { container: "border-b-slate-300 hover:border-slate-800", iconBox: "bg-slate-800 text-white", footer: "text-slate-800" },
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
        // 1. Détection : L'élève a-t-il un prof ?
        // On vérifie profId. S'il existe et n'est pas 'autonome', c'est un élève de classe.
        const hasTeacher = user.data?.profId && user.data.profId !== 'autonome';

        // 2. FILTRAGE PROF (Priorité Absolue)
        if (hasTeacher) {
            // Si l'objet 'allowed' n'existe pas (bug de chargement), on bloque par sécurité.
            // OU Si l'exercice n'est pas dans la liste des autorisés.
            if (!user.allowed || !user.allowed.includes(id)) {
                return 'LOCKED';
            }
        }

        // 3. PROGRESSION PÉDAGOGIQUE (Si l'exercice est autorisé)

        // Le niveau 1 est toujours ouvert pédagogiquement
        if (lvl === 1) return 'OPEN';

        // Pour 2 et 3, on regarde si le niveau d'avant est validé
        const prev = user.data.training?.[id]?.[lvl - 1] || 0;
        return prev > 0 ? 'OPEN' : 'LOCKED';
    };

    const handleClick = (id, lvl) => {
        onSound('CLICK');
        const status = getStatus(id, lvl);

        if (status === 'LOCKED') {
            // Toast d'erreur avec animation "secousse"
            toast.error(`🔒 Finis d'abord le niveau ${lvl - 1} !`, {
                style: { animation: 'shake 0.5s' } // Petit effet bonus si tu as défini keyframes shake
            });
        } else {
            onPlay('TRAINING', id, lvl);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-8 md:pb-12">
            {showXPInfo && <XPHelpModal onClose={() => setShowXPInfo(false)} />}
            {showContact && (
                <ContactModal
                    user={user}
                    onClose={() => setShowContact(false)}
                />
            )}

            <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
                <div className="max-w-5xl mx-auto px-4 h-14 md:h-16 flex justify-between items-center">
                    <div className="flex items-center gap-2 md:gap-3 cursor-pointer" onClick={() => setActiveTab('HOME')}>
                        <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">{user.data.nom[0]}</div>
                        <div className="leading-none"><div className="font-bold text-sm md:text-base">{user.data.nom}</div><div className="text-[10px] text-slate-400">{user.data.identifiant}</div></div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        {user.role === 'teacher' && <button onClick={onAdmin} className="bg-slate-800 text-white w-8 h-8 md:w-auto md:px-3 md:py-1 rounded-full text-xs font-bold flex items-center justify-center gap-1 hover:bg-slate-700"><Icon name="crown" /><span className="hidden md:inline">Profs</span></button>}
                        <button onClick={() => { onSound('CLICK'); setShowXPInfo(true); }} className="bg-amber-50 text-amber-700 px-2 py-1 md:px-3 rounded-full text-xs md:text-sm font-bold border border-amber-100 flex items-center gap-1 hover:bg-amber-100 hover:scale-105 transition-all cursor-pointer"><Icon name="star-fill" /> {user.data.xp}</button>
                        {/* Si l'élève n'est PAS premium, on affiche le bouton d'appel à l'action */}
                        {!isPremium && (
                            <button
                                onClick={() => { onSound('CLICK'); setShowPremiumModal(true); }}
                                className="bg-gradient-to-r from-amber-300 to-yellow-400 text-yellow-900 px-3 py-1 md:px-4 rounded-full text-xs md:text-sm font-black border border-yellow-500/30 flex items-center gap-1 hover:scale-105 transition-transform shadow-sm animate-pulse"
                            >
                                <Icon name="crown" weight="fill" />
                                <span className="hidden md:inline">PREMIUM</span>
                            </button>
                        )}
                        <button onClick={onLogout} className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100"><Icon name="sign-out" /></button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-3 md:p-4 py-4 md:py-8">

                {/* --- [NOUVEAU] : NEWS BANNER --- */}
                {activeTab === 'HOME' && <NewsBanner />}

                {activeTab === 'HOME' && <SchoolHeader />}
                {activeTab === 'HOME' && user.data.daily && <DailyQuestsWidget daily={user.data.daily} onPlay={onPlay} onGoToAuto={() => setActiveTab('AUTOMATISMES')} />}

                {activeTab === 'HOME' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 fade-in">

                        <MenuCard icon="lightning" title="Automatismes" desc="Les 40 thèmes du brevet." color="indigo" onClick={() => setActiveTab('AUTOMATISMES')} footer={() => { const count = user.data.training ? Object.keys(user.data.training).length : 0; const label = count > 1 ? "notions" : "notion"; return count > 0 ? `${count} ${label}` : "Aucun exercice"; }} />
                        <MenuCard icon="graduation-cap" title="Brevet" desc="Sujets complets" color="emerald" onClick={() => setActiveTab('BREVET')} footer="Annales officielles" />
                        <MenuCard icon="grid-four" title="Tables" desc="Multiplications et divisions." color="amber" onClick={() => setActiveTab('TABLES')} footer={user.data.best_grand_slam && user.data.best_grand_slam < 999 ? `Record : ${parseFloat(user.data.best_grand_slam).toFixed(2)}s` : "Pas de chrono"} />
                        <MenuCard icon="fire" title="Survie" desc="Défis chronométrés." color="red" onClick={() => setActiveTab('SURVIVAL')} footer={() => { const h = user.data.survival_history || {}; const getBest = (k) => Math.max(0, ...(h[k]?.map(x => (typeof x === 'object' ? x.val : x)) || [])); const s1 = getBest('EXPLORATEUR'); if (s1 === 0) return "Aucun record"; return `Record Expl. : ${s1}`; }} />
                    </div>
                )}

                {activeTab === 'TABLES' && <TablesView user={user} onPlay={onPlay} onBack={() => setActiveTab('HOME')} onSound={onSound} />}

                {activeTab === 'AUTOMATISMES' && (
                    <div className="fade-in space-y-4">
                        <button onClick={() => setActiveTab('HOME')} className="mb-2 text-sm text-slate-400 flex items-center gap-1 hover:text-indigo-600"><Icon name="arrow-left" /> Retour</button>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            {program.map((cat, i) => {

                                // --- CALCUL DE LA PROGRESSION ---
                                // Chaque exercice vaut 9 points (3 niveaux x 3 étoiles max)
                                let maxPoints = cat.exos.length * 9;
                                let currentPoints = 0;

                                cat.exos.forEach(exo => {
                                    const exoData = user.data.training?.[exo.id] || {};
                                    // On additionne les réussites (max 3 par niveau)
                                    [1, 2, 3].forEach(lvl => {
                                        currentPoints += Math.min(exoData[lvl] || 0, 3);
                                    });
                                });

                                const progressPct = maxPoints === 0 ? 0 : Math.round((currentPoints / maxPoints) * 100);

                                return (
                                    <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col h-full">

                                        {/* HEADER AVEC BARRE DE PROGRESSION */}
                                        <div className={`bg-${cat.color}-50 px-3 py-2 border-b border-${cat.color}-100 flex justify-between items-center relative`}>

                                            {/* Contenu Header */}
                                            <div className="flex items-center gap-2 relative z-10">
                                                <div className={`p-1.5 rounded-lg bg-white text-${cat.color}-600 shadow-sm`}>
                                                    <Icon name="lightning" weight="fill" className="text-sm" />
                                                </div>
                                                <div>
                                                    <h3 className={`font-black text-${cat.color}-800 text-sm md:text-base leading-none`}>
                                                        {cat.title.replace(/^[IVX]+\.\s*/, '')}
                                                    </h3>
                                                    {/* Petit texte de pourcentage */}
                                                    <div className={`text-[10px] font-bold text-${cat.color}-600/70 mt-0.5`}>
                                                        {progressPct}% complété
                                                    </div>
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-bold text-${cat.color}-600 bg-white/50 px-2 py-0.5 rounded-full relative z-10`}>
                                                {cat.exos.length} exos
                                            </span>

                                            {/* --- LA BARRE DE PROGRESSION --- */}
                                            <div className="absolute bottom-0 left-0 w-full h-1 bg-white/50">
                                                <div
                                                    className={`h-full bg-${cat.color}-500 transition-all duration-1000 ease-out`}
                                                    style={{ width: `${progressPct}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div className="bg-white">
                                            {cat.exos.map(exo => {
                                                const statusGlobal = getStatus(exo.id, 1);
                                                const isLocked = statusGlobal === 'LOCKED';
                                                const progress = user.data.training?.[exo.id] || {};
                                                const hasProgress = progress && Object.keys(progress).length > 0;
                                                const rowBase = "flex justify-between items-center px-2 py-1.5 md:px-3 md:py-2 border-b border-slate-100 last:border-0 min-h-[40px]";

                                                if (isLocked) {
                                                    return (
                                                        <div key={exo.id} className={`${rowBase} bg-slate-50/50 opacity-50`}>
                                                            <div className="flex items-center gap-2 overflow-hidden flex-1">
                                                                <div className="w-5 flex justify-center shrink-0 text-slate-400"><Icon name="lock-key" size={12} /></div>
                                                                <span className="text-xs font-bold text-slate-400 truncate">{exo.title}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div key={exo.id} className={`${rowBase} hover:bg-slate-50 group transition-colors`}>
                                                        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                                                            <div className="w-5 flex justify-center shrink-0">
                                                                {hasProgress ? (
                                                                    <button onClick={(e) => { e.stopPropagation(); if (confirm("Remettre à zéro ?")) { onResetTraining(exo.id); onSound('CLICK'); } }} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100" title="Réinitialiser">
                                                                        <Icon name="arrow-counter-clockwise" size={14} />
                                                                    </button>
                                                                ) : <div className="w-1 h-1 rounded-full bg-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"></div>}
                                                            </div>
                                                            <span className="text-xs md:text-sm font-bold text-slate-700 truncate leading-tight cursor-default" title={exo.title}>{exo.title}</span>
                                                        </div>

                                                        <div className="flex gap-1 shrink-0">
                                                            {[1, 2, 3].map(lvl => {
                                                                // --- 1. RÈGLES DE CONTENU (CMS) ---
                                                                const ruleKey = `${exo.id}_lvl${lvl}`;
                                                                const defaultRule = lvl === 1 ? 'FREE' : 'PREMIUM';
                                                                const rule = contentRules[ruleKey] || defaultRule;

                                                                // BLOQUÉ PAR ADMIN
                                                                if (rule === 'LOCKED') {
                                                                    return (
                                                                        <div key={lvl} className="w-6 h-6 md:w-7 md:h-7 rounded border bg-red-50 border-red-200 flex items-center justify-center text-red-400 cursor-not-allowed" title="Ce niveau est temporairement indisponible.">
                                                                            <Icon name="prohibit" size={12} weight="bold" />
                                                                        </div>
                                                                    );
                                                                }

                                                                // BLOQUÉ PREMIUM
                                                                if (rule === 'PREMIUM' && !isPremium) {
                                                                    return (
                                                                        <div key={lvl}
                                                                            onClick={(e) => { e.stopPropagation(); setShowPremiumModal(true); }}
                                                                            className="w-6 h-6 md:w-7 md:h-7 rounded border bg-amber-50 border-amber-300 text-amber-700 font-bold flex items-center justify-center relative cursor-pointer hover:bg-amber-100 transition-colors shadow-sm"
                                                                            title="💎 Réservé aux membres Premium. Clique pour débloquer !"
                                                                        >
                                                                            {lvl}
                                                                            <div className="absolute -top-1.5 -right-1.5 bg-white text-amber-500 rounded-full p-0.5 border border-amber-200 shadow-sm">
                                                                                <Icon name="crown" size={8} weight="fill" />
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }

                                                                // --- 2. PROGRESSION PÉDAGOGIQUE ---
                                                                const st = getStatus(exo.id, lvl);
                                                                const isLvlLocked = st === 'LOCKED';
                                                                const count = progress[lvl] || 0;
                                                                const btnSize = "w-6 h-6 md:w-7 md:h-7 text-[10px] md:text-xs";

                                                                if (isLvlLocked) {
                                                                    return (
                                                                        <div key={lvl}
                                                                            className={`${btnSize} rounded border bg-slate-100 border-slate-200 flex items-center justify-center text-slate-400 cursor-not-allowed`}
                                                                            title={`🔒 Termine le niveau ${lvl - 1} pour débloquer`}
                                                                        >
                                                                            <Icon name="lock" size={10} weight="bold" />
                                                                        </div>
                                                                    );
                                                                }

                                                                // --- 3. ACCÈS LIBRE ---
                                                                return (
                                                                    <button
                                                                        key={lvl}
                                                                        onClick={(e) => { e.stopPropagation(); handleClick(exo.id, lvl); }}
                                                                        className={`${btnSize} rounded border flex items-center justify-center font-bold transition-all active:scale-95 ${getLevelColor(count)}`}
                                                                        title={count >= 3 ? "Niveau maîtrisé !" : "Jouer ce niveau"}
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
                                )
                            })}
                        </div>
                    </div>
                )}

                {activeTab === 'BREVET' && (
                    <BrevetList
                        user={user}
                        onPlay={onPlay}
                        onBack={() => setActiveTab('HOME')}
                        setShowPremiumModal={setShowPremiumModal}
                    />
                )}

                {activeTab === 'SURVIVAL' && <SurvivalView user={user} onPlay={onPlay} onBack={() => setActiveTab('HOME')} setShowPremiumModal={setShowPremiumModal} />}
            </main>
            {showPremiumModal && (
                <PremiumModal
                    onClose={() => setShowPremiumModal(false)}
                    onSubscribe={() => {
                        // 1. Récupération de l'ID Élève
                        const userId = user.data?.id || user.id;

                        if (!userId) {
                            toast.error("Erreur d'identifiant. Déconnecte-toi et réessaie.");
                            return;
                        }

                        // 2. Lien Stripe (Remplacez par votre VRAI lien "Buy Button" Stripe)
                        // ex: https://buy.stripe.com/test_...
                        const stripeUrl = "https://buy.stripe.com/test_3cIfZa04G4u538Ccy657W00";

                        // 3. Construction de l'URL avec le paramètre magique
                        // 'client_reference_id' est le champ officiel de Stripe pour stocker un ID externe
                        const separator = stripeUrl.includes('?') ? '&' : '?';
                        const finalUrl = `${stripeUrl}${separator}client_reference_id=${userId}`;

                        // 4. Ouverture
                        window.open(finalUrl, "_blank");
                    }}
                />
            )}
            <button
                onClick={() => setShowContact(true)}
                className="fixed bottom-6 right-6 bg-white text-indigo-600 p-4 rounded-full shadow-xl border border-indigo-100 hover:scale-110 hover:bg-indigo-600 hover:text-white transition-all z-40 group"
                title="Nous contacter"
            >
                <Icon name="chat-circle-dots" weight="fill" size={32} />
                <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Besoin d'aide ?
                </span>
            </button>

        </div>

    );
};