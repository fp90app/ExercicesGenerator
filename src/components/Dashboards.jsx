import React, { useState, useEffect } from 'react';
import { collection, getDocs } from "firebase/firestore";
import { db } from '../firebase';
import { Icon, Leaderboard, LegendBox, SchoolHeader, XPHelpModal } from './UI';
import { AUTOMATISMES_DATA, TABLES_LIST, TRAINING_MODULES, QUESTIONS_DB, PROCEDURAL_EXOS } from '../utils/data';

// ... (DailyQuestsWidget, SurvivalView, Login sont inchangés, tu peux garder ceux que tu as ou reprendre ceux d'avant)
// Pour gagner de la place ici, je te remets uniquement TablesView qui posait problème et StudentDashboard qui l'appelle.

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
    const [topScores, setTopScores] = useState({});
    useEffect(() => {
        let isMounted = true;
        const fetchAll = async () => {
            const dbRef = window.db || db;
            const collectionFn = window.dbFn?.collection || collection;
            const getDocsFn = window.dbFn?.getDocs || getDocs;
            const snapE = await getDocsFn(collectionFn(dbRef, "eleves"));
            const snapP = await getDocsFn(collectionFn(dbRef, "profs"));
            if (!isMounted) return;
            const stats = {};
            ['EXPLORATEUR', 'AVENTURIER', 'LEGENDE'].forEach(m => {
                let allScoresE = [], allScoresP = [];
                const processHistory = (docData, listToPush) => {
                    const raw = docData.survival_history?.[m];
                    let hist = Array.isArray(raw) ? raw : (typeof raw === 'number' ? [raw] : []);
                    hist.forEach(h => {
                        let val = (typeof h === 'object' && h.val !== undefined) ? h.val : h;
                        const date = (typeof h === 'object' && h.date) ? h.date : null;
                        listToPush.push({ nom: docData.nom, classe: docData.classe || "-", val: val, date: date, isUser: docData.id === user.data.id });
                    });
                };
                snapE.forEach(d => processHistory({ ...d.data(), id: d.id }, allScoresE));
                snapP.forEach(d => processHistory({ ...d.data(), id: d.id }, allScoresP));
                let myRaw = user.data.survival_history?.[m];
                let myArr = Array.isArray(myRaw) ? myRaw : (typeof myRaw === 'number' ? [myRaw] : []);
                const myHistory = myArr.map(x => ({ val: (typeof x === 'object' && x.val !== undefined) ? x.val : x, date: null, isUser: true })).sort((a, b) => b.val - a.val).slice(0, 5);
                stats[m] = { my: myHistory, class: allScoresE.sort((a, b) => b.val - a.val).slice(0, 5), profs: allScoresP.sort((a, b) => b.val - a.val).slice(0, 5) };
            });
            if (isMounted) setTopScores(stats);
        };
        fetchAll();
        return () => { isMounted = false; };
    }, []);
    const modeCards = [
        { id: "EXPLORATEUR", icon: "compass", desc: "Niveau 1", label: "Explorateur", classes: "border-b-emerald-500", iconBg: "bg-emerald-100 text-emerald-600" },
        { id: "AVENTURIER", icon: "flag", desc: "Niveau 2", label: "Aventurier", classes: "border-b-amber-500", iconBg: "bg-amber-100 text-amber-600" },
        { id: "LEGENDE", icon: "skull", desc: "Tous niveaux", label: "Légende", classes: "border-b-red-500", iconBg: "bg-red-100 text-red-600" }
    ];
    return (
        <div className="fade-in pb-12">
            <button onClick={onBack} className="mb-4 text-sm text-slate-400 flex items-center gap-1 hover:text-indigo-600"><Icon name="arrow-left" /> Retour</button>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Mode Survie</h2>
            <LegendBox icon="trophy" color="red" text="Mode Compétition : Pas d'XP à gagner ici, juste la gloire du classement !" />
            <div className="grid md:grid-cols-3 gap-6">
                {modeCards.map(m => (
                    <div key={m.id} className="flex flex-col gap-4">
                        <button onClick={() => onPlay('SURVIVAL_PLAY', m.id)} className={`bg-white p-6 rounded-2xl text-center border-2 border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group border-b-4 ${m.classes}`}>
                            <div className={`w-14 h-14 mx-auto rounded-xl flex items-center justify-center text-3xl mb-3 group-hover:scale-110 transition-transform ${m.iconBg}`}><Icon name={m.icon} /></div>
                            <h3 className="text-lg font-bold text-slate-800">{m.label}</h3>
                            <p className="text-slate-400 text-xs">{m.desc}</p>
                        </button>
                        <Leaderboard title="Mon Historique" data={topScores[m.id]?.my || []} unit="" />
                        <Leaderboard title="Top Élèves" data={topScores[m.id]?.class || []} unit="" />
                        <Leaderboard title="Top Profs" data={topScores[m.id]?.profs || []} unit="" />
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

// =========================================================
// 3. VUE TABLES (CORRIGÉE : AJOUT COLONNE DROITE)
// =========================================================
export const TablesView = ({ user, onPlay, onBack, onSound }) => {
    const [selected, setSelected] = useState([]);
    const [ops, setOps] = useState({ mul: true, div: true });
    const [leaders, setLeaders] = useState({ my: [], class: [], profs: [] });

    // --- CHARGEMENT DU LEADERBOARD POUR LE CHRONO ---
    useEffect(() => {
        const fetchL = async () => {
            const dbRef = window.db || db;
            const collectionFn = window.dbFn?.collection || collection;
            const getDocsFn = window.dbFn?.getDocs || getDocs;
            const snapE = await getDocsFn(collectionFn(dbRef, "eleves"));
            const snapP = await getDocsFn(collectionFn(dbRef, "profs"));
            let allScoresE = [], allScoresP = [];
            const extract = (d, arr) => {
                const data = d.data();
                (data.grand_slam_history || []).forEach(h => {
                    const val = (typeof h === 'object' && h.val) ? h.val : h;
                    if (!isNaN(val)) arr.push({ nom: data.nom, val: parseFloat(val), isUser: d.id === user.data.id });
                });
            };
            snapE.forEach(d => extract(d, allScoresE));
            snapP.forEach(d => extract(d, allScoresP));
            const myRaw = user.data.grand_slam_history || [];
            const myHist = myRaw.map(h => ({ val: parseFloat((typeof h === 'object' && h.val) ? h.val : h), isUser: true })).sort((a, b) => a.val - b.val).slice(0, 5).map(x => ({ ...x, val: x.val.toFixed(2) }));
            const fmt = l => l.sort((a, b) => a.val - b.val).slice(0, 5).map(x => ({ ...x, val: x.val.toFixed(2) }));
            setLeaders({ my: myHist, class: fmt(allScoresE), profs: fmt(allScoresP) });
        };
        fetchL();
    }, [user]);

    const toggle = (id) => { setSelected(prev => { const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]; onSound('CLICK'); return next; }); };
    const isDailyDone = (key) => user.data.daily?.[key] === new Date().toDateString();

    return (
        <div className="fade-in pb-12">
            <button onClick={onBack} className="mb-4 text-sm text-slate-400 flex items-center gap-1 hover:text-indigo-600"><Icon name="arrow-left" /> Retour</button>
            <div className="grid lg:grid-cols-3 gap-6">

                {/* COLONNE GAUCHE : ENTRAINEMENT CIBLÉ */}
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

                {/* COLONNE DROITE : CHOIX LIBRE & CHRONO (C'est ce qui manquait !) */}
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
                            <Leaderboard title="Mon Historique" data={leaders.my} unit="s" />
                            <Leaderboard title="Top Élèves" data={leaders.class} unit="s" />
                            <Leaderboard title="Top Profs" data={leaders.profs} unit="s" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// =========================================================
// 4. STUDENT DASHBOARD (MAIN)
// =========================================================
export const StudentDashboard = ({ user, onPlay, onLogout, activeTab, setActiveTab, loading, onAdmin, onSound, onResetTraining }) => {
    const [legend, setLegend] = useState(false);
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
            <button onClick={() => { onSound('CLICK'); onClick(); }} className={`p-6 rounded-2xl bg-white border-2 border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left group border-b-4 relative overflow-hidden w-full flex flex-col ${style.container}`}>
                <div className="flex-1">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform ${style.iconBox}`}><Icon name={icon} /></div>
                    <h3 className="text-xl font-bold text-slate-800 mb-1">{title}</h3>
                    <p className="text-sm text-slate-400 mb-4">{desc}</p>
                </div>
                {footer && <div className={`mt-2 pt-3 border-t border-slate-100 text-xs font-bold flex items-center gap-1 w-full ${style.footer}`}><Icon name="trophy" className="text-lg shrink-0" /><div className="w-full">{typeof footer === 'function' ? footer() : footer}</div></div>}
            </button>
        );
    };

    const autoStyles = {
        emerald: { bgHeader: "bg-emerald-50", textHeader: "text-emerald-800" },
        blue: { bgHeader: "bg-blue-50", textHeader: "text-blue-800" },
        purple: { bgHeader: "bg-purple-50", textHeader: "text-purple-800" },
        amber: { bgHeader: "bg-amber-50", textHeader: "text-amber-800" },
    };

    const getStatus = (id, lvl) => {
        // Si l'utilisateur est un PROF ('teacher'), on ne vérifie pas la liste 'allowed'.
        // On laisse passer tout le monde, sauf si l'exercice est vide/incomplet.
        if (user.role !== 'teacher' && user.allowed && !user.allowed.includes(id)) return 'LOCKED';

        // ... (le reste de la fonction reste identique)
        const isProcedural = PROCEDURAL_EXOS.includes(id);
        const isStaticValid = QUESTIONS_DB[id] && QUESTIONS_DB[id][lvl] && QUESTIONS_DB[id][lvl].length >= 10;

        if (!isProcedural && !isStaticValid) return 'EMPTY';
        if (lvl === 1) return 'OPEN';

        const prev = user.data.training[id]?.[lvl - 1] || 0;
        return prev > 0 ? 'OPEN' : 'LOCKED';
    };
    const getColor = (id, lvl) => {
        const n = user.data.training[id]?.[lvl] || 0;
        if (n >= 3) return "bg-emerald-600 border-emerald-700 text-white shadow-md";
        if (n === 2) return "bg-emerald-300 border-emerald-400 text-emerald-900";
        if (n === 1) return "bg-emerald-50 border-emerald-200 text-emerald-700";
        return "bg-white border-slate-200 text-slate-500 hover:border-indigo-300";
    };
    const handleClick = (id, lvl) => {
        onSound('CLICK');
        const status = getStatus(id, lvl);
        if (status === 'EMPTY') alert("En construction");
        else if (status === 'LOCKED') alert(`🔒 Bloqué`);
        else onPlay('TRAINING', id, lvl);
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-12">
            {showXPInfo && <XPHelpModal onClose={() => setShowXPInfo(false)} />}

            <header className="bg-white border-b border-slate-100 sticky top-0 z-20">
                <div className="max-w-5xl mx-auto px-4 h-16 flex justify-between items-center">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('HOME')}>
                        <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">{user.data.nom[0]}</div>
                        <div className="leading-none"><div className="font-bold">{user.data.nom}</div><div className="text-[10px] text-slate-400">{user.data.identifiant}</div></div>
                    </div>
                    <div className="flex items-center gap-3">
                        {user.role === 'teacher' && <button onClick={onAdmin} className="bg-slate-800 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-slate-700"><Icon name="crown" /> Espace profs</button>}
                        <button onClick={() => { onSound('CLICK'); setShowXPInfo(true); }} className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-sm font-bold border border-amber-100 flex items-center gap-1 hover:bg-amber-100 hover:scale-105 transition-all cursor-pointer"><Icon name="star-fill" /> {user.data.xp}</button>
                        <button onClick={onLogout} className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100"><Icon name="sign-out" /></button>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto p-4 py-8">
                {activeTab === 'HOME' && <SchoolHeader />}
                {activeTab === 'HOME' && user.data.daily && <DailyQuestsWidget daily={user.data.daily} onPlay={onPlay} onGoToAuto={() => setActiveTab('AUTOMATISMES')} />}

                {activeTab === 'HOME' && (
                    <div className="grid md:grid-cols-2 gap-4 fade-in">
                        <MenuCard icon="grid-four" title="Tables" desc="Multiplications et divisions." color="amber" onClick={() => setActiveTab('TABLES')} footer={user.data.best_grand_slam && user.data.best_grand_slam < 999 ? `Mon Record Chrono : ${parseFloat(user.data.best_grand_slam).toFixed(2)}s` : "Pas encore de chrono"} />
                        <MenuCard icon="lightning" title="Automatismes" desc="Les 38 thèmes du brevet." color="indigo" onClick={() => setActiveTab('AUTOMATISMES')} footer={() => { const count = user.data.training ? Object.keys(user.data.training).length : 0; const label = count > 1 ? "notions travaillées" : "notion travaillée"; return count > 0 ? `${count} ${label}` : "Aucun exercice fait"; }} />
                        <MenuCard icon="barbell" title="Entrainement" desc="Chapitres de cours." color="emerald" onClick={() => setActiveTab('TRAINING')} footer="Accès aux chapitres" />
                        <MenuCard icon="fire" title="Survie" desc="Défis chronométrés." color="red" onClick={() => setActiveTab('SURVIVAL')} footer={() => { const h = user.data.survival_history || {}; const getBest = (k) => Math.max(0, ...(h[k]?.map(x => (typeof x === 'object' ? x.val : x)) || [])); const s1 = getBest('EXPLORATEUR'); const s2 = getBest('AVENTURIER'); const s3 = getBest('LEGENDE'); if (s1 === 0 && s2 === 0 && s3 === 0) return "Aucun record"; return (<div className="flex justify-between w-full text-[10px]"><span>Explorateur : <b>{s1}</b></span><span>Aventurier : <b>{s2}</b></span><span>Légende: <b>{s3}</b></span></div>); }} />
                    </div>
                )}

                {activeTab === 'TABLES' && <TablesView user={user} onPlay={onPlay} onBack={() => setActiveTab('HOME')} onSound={onSound} />}

                {activeTab === 'AUTOMATISMES' && (
                    <div className="fade-in space-y-6">
                        <button onClick={() => setActiveTab('HOME')} className="mb-4 text-sm text-slate-400 flex items-center gap-1"><Icon name="arrow-left" /> Retour</button>
                        {AUTOMATISMES_DATA.map((cat, i) => {
                            const style = autoStyles[cat.color] || { bgHeader: "bg-slate-100", textHeader: "text-slate-800" };
                            return (
                                <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                    <div className={`${style.bgHeader} px-4 py-2 font-bold ${style.textHeader} text-sm uppercase`}>{cat.title}</div>
                                    <div className="p-3 space-y-2">
                                        {cat.exos.map(exo => (
                                            <div key={exo.id} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-lg group">
                                                <span className={`text-sm font-bold ${(QUESTIONS_DB[exo.id] || PROCEDURAL_EXOS.includes(exo.id)) ? 'text-slate-900' : 'text-slate-300'}`}>{exo.title}</span>
                                                <div className="flex items-center gap-3">
                                                    {user.data.training && user.data.training[exo.id] && Object.keys(user.data.training[exo.id]).length > 0 && (
                                                        <button onClick={(e) => { e.stopPropagation(); if (confirm("Remettre à zéro ?")) { onResetTraining(exo.id); onSound('CLICK'); } }} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1"><Icon name="arrow-counter-clockwise" className="text-lg" /></button>
                                                    )}
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3].map(lvl => {
                                                            const st = getStatus(exo.id, lvl);
                                                            const count = user.data.training[exo.id]?.[lvl] || 0;
                                                            return (
                                                                <button key={lvl} onClick={() => handleClick(exo.id, lvl)} className={`w-8 h-8 rounded border flex items-center justify-center text-sm font-bold transition-all active:scale-90 relative ${st === 'LOCKED' || st === 'EMPTY' ? 'bg-slate-100 text-slate-300' : getColor(exo.id, lvl)}`}>
                                                                    {st === 'LOCKED' ? <Icon name="lock-key" /> : lvl}
                                                                    {count >= 3 && <div className="check-badge"><Icon name="check" /></div>}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {activeTab === 'TRAINING' && (
                    <div className="fade-in space-y-6">
                        <button onClick={() => setActiveTab('HOME')} className="mb-4 text-sm text-slate-400 flex items-center gap-1"><Icon name="arrow-left" /> Retour</button>
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center">
                            <h3 className="font-bold text-lg text-emerald-600 mb-4">Chapitres en cours</h3>
                            {TRAINING_MODULES.map(mod => (<div key={mod.id} className="p-4 border rounded-xl mb-2 text-left hover:bg-slate-50 cursor-pointer font-bold" onClick={() => alert("Bientôt !")}>{mod.title}</div>))}
                        </div>
                    </div>
                )}

                {activeTab === 'SURVIVAL' && <SurvivalView user={user} onPlay={onPlay} onBack={() => setActiveTab('HOME')} />}
            </main>
        </div>
    );
};