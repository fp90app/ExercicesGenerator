import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, addDoc, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Icon } from './UI';
import { timeAgo } from '../utils/mathGenerators';
import { AUTOMATISMES_DATA } from '../utils/data';



const LISTE_CLASSES = ["3A", "3B", "3C", "3D", "3E", "4A", "4B", "4C", "4D", "4E", "5A", "5B", "5C", "5D", "6A", "6B", "6C", "6D", "Sans classe"];

// --- UTILITAIRES STATS (Centralisés) ---
const calculateStats = (s) => {
    // 1. Tables (Max 22)
    let tablesCount = 0;
    if (s.tables) Object.values(s.tables).forEach(v => { if (v >= 3) tablesCount++; });
    if (s.divisions) Object.values(s.divisions).forEach(v => { if (v >= 3) tablesCount++; });

    // 2. Exos (Nb chapitres entamés)
    let skillsCount = 0;
    if (s.training) {
        skillsCount = Object.values(s.training).filter(t => (t[1] > 0 || t[2] > 0 || t[3] > 0)).length;
    }

    // 3. Survie (Max score tous modes)
    let maxSurvival = 0;
    if (s.survival_history) {
        const flat = Object.values(s.survival_history).flat();
        const vals = flat.map(x => (typeof x === 'object' ? Number(x.val) : Number(x)));
        if (vals.length > 0) maxSurvival = Math.max(...vals);
    }

    // 4. Chrono (Meilleur temps)
    let bestChrono = null;
    if (s.grand_slam_history && Array.isArray(s.grand_slam_history)) {
        const times = s.grand_slam_history.map(x => (typeof x === 'object' ? Number(x.val) : Number(x))).filter(t => t > 0);
        if (times.length > 0) bestChrono = Math.min(...times);
    }

    // 5. Détails XP pour la modale
    let xpDetails = { tables: 0, div: 0, auto: 0, quest: 0 };
    if (s.tables) Object.values(s.tables).forEach(c => xpDetails.tables += Math.min(c, 3) * 10);
    if (s.divisions) Object.values(s.divisions).forEach(c => xpDetails.div += Math.min(c, 3) * 10);
    if (s.xp_caps) Object.values(s.xp_caps).forEach(l => {
        if (l[1]) xpDetails.auto += 10;
        if (l[2]) xpDetails.auto += 20;
        if (l[3]) xpDetails.auto += 30;
    });
    xpDetails.quest = Math.max(0, (s.xp || 0) - (xpDetails.tables + xpDetails.div + xpDetails.auto));

    return { tablesCount, skillsCount, maxSurvival, bestChrono, xpDetails };
};

// --- MODALE IMPORT MASSE ---
const MassImportModal = ({ onClose, classesList, onImport, results }) => {
    const [text, setText] = useState("");
    const [classe, setClasse] = useState(classesList[0]);

    const copyToClipboard = () => {
        const csv = results.map(r => `${r.nom}\t${r.id}\t${r.mdp}`).join('\n');
        navigator.clipboard.writeText(csv);
        alert("Tableau copié !");
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl pop-in flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="bg-indigo-600 p-6 text-white shrink-0">
                    <h2 className="text-2xl font-black flex items-center gap-2"><Icon name="users-three" /> Création de Classe</h2>
                    <p className="opacity-80 text-sm">Ajoute une liste d'élèves (NOM Prénom).</p>
                </div>

                <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
                    {results ? (
                        <div className="space-y-4">
                            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-800 text-center">
                                <div className="text-3xl mb-2">🎉</div>
                                <div className="font-bold text-lg">{results.length} élèves créés !</div>
                                <div className="text-sm">Copie ces identifiants maintenant.</div>
                            </div>
                            <div className="max-h-60 overflow-y-auto border rounded-lg bg-white">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                                        <tr><th className="p-3">Nom</th><th className="p-3">ID</th><th className="p-3">MDP</th></tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {results.map((r, i) => (
                                            <tr key={i}>
                                                <td className="p-3">{r.nom}</td>
                                                <td className="p-3 font-mono text-indigo-600 font-bold">{r.id}</td>
                                                <td className="p-3 font-mono bg-slate-50">{r.mdp}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <button onClick={copyToClipboard} className="w-full py-4 bg-indigo-100 text-indigo-700 font-bold rounded-xl hover:bg-indigo-200 flex items-center justify-center gap-2">
                                <Icon name="copy" /> Copier pour Excel
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block font-bold text-slate-700 mb-2">Classe</label>
                                <select value={classe} onChange={e => setClasse(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-slate-700 outline-none bg-white">
                                    {classesList.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block font-bold text-slate-700 mb-2">Liste (NOM Prénom)</label>
                                <textarea className="w-full h-40 p-4 border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none font-mono text-sm" placeholder="DUPONT Charles&#10;DURAND Nathalie..." value={text} onChange={e => setText(e.target.value)}></textarea>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-white border-t flex justify-end gap-3 shrink-0">
                    {results ? (
                        <button onClick={onClose} className="px-6 py-2 bg-slate-800 text-white rounded-xl font-bold">Terminer</button>
                    ) : (
                        <>
                            <button onClick={onClose} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">Annuler</button>
                            <button onClick={() => onImport(text, classe)} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">Générer</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- MODALE LISTE GLOBALE ---
const GlobalStudentListModal = ({ onClose, onLink, currentTeacherId }) => {
    const [allStudents, setAllStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterClasse, setFilterClasse] = useState("Toutes");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchAll = async () => {
            try {
                // CORRECTION : window.db -> db
                const snap = await getDocs(collection(db, "eleves"));
                const list = [];
                snap.forEach(doc => list.push({ ...doc.data(), id: doc.id }));
                list.sort((a, b) => a.nom.localeCompare(b.nom));
                setAllStudents(list);
            } catch (e) { console.error(e); }
            setLoading(false);
        };
        fetchAll();
    }, []);

    const filtered = allStudents.filter(s => {
        if (filterClasse !== "Toutes" && s.classe !== filterClasse) return false;
        if (searchTerm && !s.nom.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    const availableClasses = [...new Set(allStudents.map(s => s.classe).filter(c => c && c !== "-"))].sort();

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl pop-in" onClick={e => e.stopPropagation()}>
                <div className="bg-orange-500 p-6 text-white shrink-0 rounded-t-3xl">
                    <h2 className="text-2xl font-black flex items-center gap-2"><Icon name="link" /> Récupérer des élèves</h2>
                </div>
                <div className="p-4 bg-slate-50 border-b flex gap-4 items-center flex-wrap shrink-0">
                    <select value={filterClasse} onChange={e => setFilterClasse(e.target.value)} className="p-2 rounded-lg border font-bold text-slate-700">
                        <option value="Toutes">Toutes</option>
                        {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="text" placeholder="Rechercher..." className="flex-1 p-2 rounded-lg border outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <button onClick={onClose} className="w-8 h-8 bg-slate-200 rounded-full hover:text-red-500"><Icon name="x" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    {loading ? <div className="text-center text-slate-400">Chargement...</div> : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {filtered.map(s => {
                                const alreadyLinked = s.profId === currentTeacherId || (s.sharedWith && s.sharedWith.includes(currentTeacherId));
                                return (
                                    <div key={s.id} className={`p-3 rounded-xl border flex justify-between items-center ${alreadyLinked ? 'bg-slate-100 opacity-60' : 'bg-white shadow-sm'}`}>
                                        <div>
                                            <div className="font-bold text-slate-800">{s.nom}</div>
                                            <div className="text-xs text-slate-500">{s.classe} • {s.identifiant}</div>
                                        </div>
                                        {alreadyLinked ? <span className="text-xs font-bold text-emerald-600"><Icon name="check" /> Déjà là</span> : (
                                            <button onClick={() => onLink(s)} className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-orange-500 hover:text-white transition-colors"><Icon name="plus" /> Récupérer des élèves</button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Dans TeacherTools.jsx

// 1. On ajoute user, setUser et onSound dans les paramètres
// DANS src/components/TeacherTools.jsx

const ProgressionModal = ({ onClose, user, setUser, onSound }) => {
    const [selectedClass, setSelectedClass] = useState(LISTE_CLASSES[0]);
    const [activeIds, setActiveIds] = useState([]);
    const [loadingConfig, setLoadingConfig] = useState(false);

    // Chargement initial des données
    useEffect(() => {
        if (user.data.classSettings && user.data.classSettings[selectedClass]) {
            setActiveIds(user.data.classSettings[selectedClass]);
        } else {
            const allIds = AUTOMATISMES_DATA.flatMap(cat => cat.exos.map(e => e.id));
            setActiveIds(allIds);
        }
    }, [selectedClass]); // On retire 'user.data' des dépendances pour éviter les boucles

    const toggleExo = (id) => {
        if (activeIds.includes(id)) setActiveIds(prev => prev.filter(x => x !== id));
        else setActiveIds(prev => [...prev, id]);
    };

    const toggleAll = (activate) => {
        if (activate) setActiveIds(AUTOMATISMES_DATA.flatMap(cat => cat.exos.map(e => e.id)));
        else setActiveIds([]);
    };

    const saveConfig = async () => {
        setLoadingConfig(true);
        try {
            const profRef = doc(db, 'profs', user.data.id);

            // 1. Sauvegarde dans Firebase (C'est le plus important)
            await updateDoc(profRef, { [`classSettings.${selectedClass}`]: activeIds });

            // 2. Mise à jour de l'objet user local
            // ATTENTION : C'est souvent cette partie qui force le rechargement de la page.
            // Je commente cette mise à jour globale pour empêcher la fenêtre de se fermer.
            // Les données sont sauvées dans Firebase, c'est l'essentiel.

            /* const newData = { ...user.data };
            if (!newData.classSettings) newData.classSettings = {};
            newData.classSettings[selectedClass] = activeIds;
            setUser({ ...user, data: newData }); 
            */

            // On met à jour l'objet user en mémoire SEULEMENT dans ce composant si nécessaire,
            // mais ici on a juste besoin que ça ne crash pas.
            // Si vous avez besoin que la modale reflète le changement immédiatement si on change de classe,
            // on modifie directement user.data sans passer par setUser (astuce temporaire)
            if (!user.data.classSettings) user.data.classSettings = {};
            user.data.classSettings[selectedClass] = activeIds;

            onSound('WIN');
            // Pas de onClose() !

            // Feedback visuel temporaire sur le bouton ou alerte
            alert(`✅ Progression enregistrée pour la ${selectedClass} !`);

        } catch (e) {
            console.error(e);
            alert("Erreur : " + e.message);
        }
        setLoadingConfig(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl pop-in" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-3xl">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Icon name="sliders-horizontal" className="text-indigo-600" /> Progression</h2>
                    <div className="flex gap-4 items-center">
                        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-2 border-2 border-indigo-100 rounded-lg font-bold text-indigo-900 outline-none">{LISTE_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
                        <button onClick={onClose} className="w-8 h-8 bg-slate-200 rounded-full hover:bg-red-100 hover:text-red-500"><Icon name="x" /></button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    <div className="flex gap-2 mb-4">
                        <button onClick={() => toggleAll(true)} className="text-xs font-bold bg-emerald-100 text-emerald-700 px-3 py-1 rounded">Tout Activer</button>
                        <button onClick={() => toggleAll(false)} className="text-xs font-bold bg-red-100 text-red-700 px-3 py-1 rounded">Tout Désactiver</button>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {AUTOMATISMES_DATA.map((cat, i) => (
                            <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <h4 className={`font-bold text-${cat.color}-600 uppercase text-xs mb-3 pb-2 border-b`}>{cat.title}</h4>
                                <div className="space-y-2">
                                    {cat.exos.map(exo => (
                                        <label key={exo.id} className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${activeIds.includes(exo.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300'}`}>{activeIds.includes(exo.id) && <Icon name="check" size={12} weight="bold" />}</div>
                                            <input type="checkbox" className="hidden" checked={activeIds.includes(exo.id)} onChange={() => toggleExo(exo.id)} />
                                            <span className={`text-sm ${activeIds.includes(exo.id) ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>{exo.title}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-4 border-t bg-white rounded-b-3xl flex justify-end">
                    <button onClick={saveConfig} disabled={loadingConfig} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform">{loadingConfig ? "..." : "Enregistrer"}</button>
                </div>
            </div>
        </div>
    );
};





// --- MODALE DÉTAIL ÉLÈVE (UNIQUE ET COMPLÈTE) ---
const StudentDetailModal = ({ s, onClose, classesList, onEdit, onShare, onDelete, onUnshare, colleagues }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ nom: "", identifiant: "", password: "", classe: "", groupe: "" });
    const [shareInput, setShareInput] = useState("");

    useEffect(() => {
        if (s) {
            setEditData({
                nom: s.nom,
                identifiant: s.identifiant,
                password: s.password || "",
                classe: (s.classe && s.classe !== "-") ? s.classe : classesList[0],
                groupe: s.groupe || ""
            });
            setIsEditing(false);
            setShareInput("");
        }
    }, [s]);

    if (!s) return null;

    const handleSave = () => { onEdit(s.id, editData); setIsEditing(false); };
    const stats = calculateStats(s);

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl pop-in flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="bg-indigo-600 p-6 text-white flex justify-between items-start shrink-0">
                    {isEditing ? (
                        <input type="text" value={editData.nom} onChange={e => setEditData({ ...editData, nom: e.target.value })} className="w-full bg-indigo-700 text-white font-black text-xl p-2 rounded border border-indigo-400" />
                    ) : (
                        <div>
                            <h2 className="text-2xl font-black">{s.nom}</h2>
                            <p className="opacity-80 font-mono text-sm mb-2">{s.identifiant} • {s.classe} {s.groupe && <span className="bg-indigo-500 px-2 py-0.5 rounded text-[10px] uppercase">{s.groupe}</span>}</p>
                            <div className="inline-flex items-center gap-2 bg-indigo-800/50 px-3 py-1 rounded-full border border-indigo-400/30 text-xs font-bold">Actif : {timeAgo(s.last_activity)}</div>
                        </div>
                    )}
                    {!isEditing && (
                        <div className="text-right">
                            <div className="text-3xl font-black">{s.xp} <span className="text-sm font-normal opacity-70">XP</span></div>
                            <div className="text-[10px] text-indigo-100 flex flex-col items-end">
                                <span>Tables: <b>{stats.xpDetails.tables}</b> | Div: <b>{stats.xpDetails.div}</b></span>
                                <span>Auto: <b>{stats.xpDetails.auto}</b> | Quêtes: <b>{stats.xpDetails.quest}</b></span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 overflow-y-auto flex-1 bg-slate-50 space-y-6">
                    {isEditing ? (
                        <div className="space-y-4 bg-white p-4 rounded-xl border">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">Classe</label><select className="w-full p-2 border rounded" value={editData.classe} onChange={e => setEditData({ ...editData, classe: e.target.value })}>{classesList.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">Groupe</label><input type="text" className="w-full p-2 border rounded" value={editData.groupe} onChange={e => setEditData({ ...editData, groupe: e.target.value })} /></div>
                            </div>
                            <div><label className="block text-xs font-bold text-slate-500 mb-1">Identifiant</label><input type="text" className="w-full p-2 border rounded uppercase" value={editData.identifiant} onChange={e => setEditData({ ...editData, identifiant: e.target.value.toUpperCase() })} /></div>
                            <div><label className="block text-xs font-bold text-slate-500 mb-1">Mot de passe</label><input type="text" className="w-full p-2 border rounded" value={editData.password} onChange={e => setEditData({ ...editData, password: e.target.value })} /></div>
                        </div>
                    ) : (
                        <>
                            {/* RECORDS */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl text-center">
                                    <div className="text-[10px] font-bold text-indigo-400 uppercase mb-1"><Icon name="stopwatch" /> Chrono</div>
                                    <div className="font-black text-indigo-700 text-lg">{stats.bestChrono ? stats.bestChrono.toFixed(2) + 's' : '-'}</div>
                                </div>
                                <div className="bg-slate-100 border border-slate-200 p-3 rounded-xl text-center col-span-3 flex justify-around items-center">
                                    <div><div className="text-[10px] font-bold text-slate-400 uppercase">Tables</div><div className="font-black text-slate-700 text-lg">{stats.tablesCount}/22</div></div>
                                    <div><div className="text-[10px] font-bold text-slate-400 uppercase">Exos</div><div className="font-black text-slate-700 text-lg">{stats.skillsCount}</div></div>
                                    <div><div className="text-[10px] font-bold text-slate-400 uppercase">Survie</div><div className="font-black text-slate-700 text-lg">{stats.maxSurvival || '-'}</div></div>
                                </div>
                            </div>

                            {/* PARTAGE */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="font-bold text-purple-800 text-sm mb-3 flex items-center gap-2"><Icon name="share-network" /> Partage Collègues</h3>
                                {s.sharedWith && s.sharedWith.map((profId, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-purple-50 p-2 rounded border border-purple-100 text-sm mb-2">
                                        <span className="font-mono text-xs text-slate-500">{profId}</span>
                                        <button onClick={() => onUnshare(s.id, profId)} className="text-red-400 hover:text-red-600"><Icon name="trash" /></button>
                                    </div>
                                ))}
                                <div className="flex gap-2">
                                    <input type="text" className="flex-1 text-sm p-2 border border-slate-200 rounded uppercase" placeholder="ID Prof" value={shareInput} onChange={(e) => setShareInput(e.target.value)} />
                                    <button onClick={() => { onShare(s.id, shareInput); setShareInput(""); }} className="bg-purple-600 text-white px-3 py-1 rounded text-sm font-bold">Ajouter</button>
                                </div>
                                {colleagues && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {colleagues.filter(p => !s.sharedWith?.includes(p.id)).map(p => (
                                            <button key={p.id} onClick={() => setShareInput(p.identifiant)} className="text-xs bg-white border border-purple-200 text-purple-700 px-2 py-1 rounded-lg hover:bg-purple-50"><Icon name="user" /> {p.nom}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="p-4 bg-white border-t flex justify-between items-center shrink-0">
                    {isEditing ? (
                        <><button onClick={() => setIsEditing(false)} className="text-slate-500 font-bold px-4">Annuler</button><button onClick={handleSave} className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold">Enregistrer</button></>
                    ) : (
                        <><div className="flex gap-2"><button onClick={() => setIsEditing(true)} className="text-indigo-600 px-4 py-2 hover:bg-indigo-50 rounded-lg font-bold flex items-center gap-2"><Icon name="pencil-simple" /> Modifier</button><button onClick={() => onDelete(s.id, s.nom)} className="text-red-500 px-4 py-2 hover:bg-red-50 rounded-lg font-bold flex items-center gap-2"><Icon name="trash" /> Supprimer</button></div><button onClick={onClose} className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold">Fermer</button></>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- COMPOSANT PRINCIPAL ---
export const TeacherDashboard = ({ user, onLogout, onBackToGame, onSound, setUser }) => {
    const [students, setStudents] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [filterClasse, setFilterClasse] = useState("Toutes");
    const [filterGroupe, setFilterGroupe] = useState("Tous");
    const [allProfs, setAllProfs] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: 'nom', direction: 'asc' });
    const [showProgression, setShowProgression] = useState(false);

    // Modales
    const [showMassImport, setShowMassImport] = useState(false);
    const [importResults, setImportResults] = useState(null);
    const [showGlobalList, setShowGlobalList] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);

    // CHARGEMENT INITIAL
    useEffect(() => {
        const fetchProfs = async () => {
            // CORRECTION : window.db -> db
            const snap = await getDocs(collection(db, 'profs'));
            const list = [];
            snap.forEach(doc => { if (doc.id !== user.data.id) list.push({ id: doc.id, ...doc.data() }); });
            setAllProfs(list);
        };
        fetchProfs();
        loadStudents();
    }, []);

    const loadStudents = async () => {
        setLoading(true);
        try {
            // CORRECTION : window.db -> db et imports directs
            const q1 = query(collection(db, "eleves"), where("profId", "==", user.data.id));
            const q2 = query(collection(db, "eleves"), where("sharedWith", "array-contains", user.data.id));
            const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

            const studentsMap = new Map();
            const processDoc = (doc, isShared) => {
                const d = doc.data();
                studentsMap.set(doc.id, {
                    ...d,
                    id: doc.id,
                    identifiant: d.identifiant || "INCONNU",
                    nom: d.nom || "Sans Nom",
                    classe: d.classe || "-",
                    groupe: d.groupe || "",
                    isShared: isShared,
                    stats: calculateStats(d)
                });
            };
            snap1.forEach(d => processDoc(d, false));
            snap2.forEach(d => processDoc(d, true));
            setStudents(Array.from(studentsMap.values()));
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    // ACTIONS
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const handleDeleteStudent = async (studentId, studentName) => {
        if (confirm(`Supprimer définitivement ${studentName} ?`)) {
            try {
                // CORRECTION : window.db -> db
                await deleteDoc(doc(db, "eleves", studentId));
                setStudents(prev => prev.filter(s => s.id !== studentId));
                setSelectedStudent(null);
                onSound('WRONG');
            } catch (e) { alert(e.message); }
        }
    };

    const handleEditStudent = async (studentId, updatedData) => {
        try {
            // CORRECTION : window.db -> db
            await updateDoc(doc(db, "eleves", studentId), updatedData);
            setStudents(prev => prev.map(s => s.id === studentId ? { ...s, ...updatedData } : s));
            setSelectedStudent(prev => ({ ...prev, ...updatedData }));
            onSound('WIN');
        } catch (e) { alert(e.message); }
    };

    const handleMassCreate = async (namesList, targetClass) => {
        if (!namesList.trim()) return;
        setLoading(true);
        const names = namesList.split('\n').filter(n => n.trim() !== "");
        const results = [];

        // CORRECTION : window.db -> db
        const allStudentsSnap = await getDocs(collection(db, "eleves"));
        const existingIds = new Set();
        allStudentsSnap.forEach(doc => existingIds.add(doc.data().identifiant));

        for (let rawName of names) {
            const parts = rawName.trim().split(/\s+/);
            if (parts.length >= 1) {
                let nom = parts[0];
                let prenom = parts.length > 1 ? parts.slice(1).join(" ") : nom;
                const cleanPrenom = prenom.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z]/g, "").toUpperCase();
                const cleanNomInitiale = nom[0].normalize("NFD").toUpperCase();

                let uniqueId = cleanPrenom + cleanNomInitiale;
                let counter = 2;
                while (existingIds.has(uniqueId)) { uniqueId = cleanPrenom + cleanNomInitiale + counter; counter++; }
                existingIds.add(uniqueId);

                const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
                let password = "";
                for (let k = 0; k < 6; k++) password += chars.charAt(Math.floor(Math.random() * chars.length));

                // CORRECTION : window.db -> db
                await addDoc(collection(db, "eleves"), {
                    nom: `${nom} ${prenom}`,
                    identifiant: uniqueId,
                    password: password,
                    classe: targetClass,
                    groupe: "",
                    profId: user.data.id,
                    sharedWith: [],
                    xp: 0
                });
                results.push({ nom: `${nom} ${prenom}`, id: uniqueId, mdp: password });
            }
        }
        setImportResults(results);
        setLoading(false);
        loadStudents();
    };

    // FILTRAGE ET TRI
    const filtered = students.filter(s => {
        const matchesSearch = (s.identifiant.includes(search.toUpperCase())) || (s.nom.toLowerCase().includes(search.toLowerCase()));
        const matchesClasse = filterClasse === "Toutes" || s.classe === filterClasse;
        const matchesGroupe = filterGroupe === "Tous" || (s.groupe || "") === filterGroupe;
        return matchesSearch && matchesClasse && matchesGroupe;
    }).sort((a, b) => {
        let aVal = a[sortConfig.key], bVal = b[sortConfig.key];

        if (['tablesCount', 'skillsCount', 'maxSurvival', 'bestChrono'].includes(sortConfig.key)) {
            aVal = a.stats[sortConfig.key] || 0;
            bVal = b.stats[sortConfig.key] || 0;
            if (sortConfig.key === 'bestChrono') {
                if (!aVal) aVal = Infinity;
                if (!bVal) bVal = Infinity;
            }
        } else if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const classes = [...new Set([...LISTE_CLASSES, ...students.map(s => s.classe)])].sort().filter(c => c !== "-");
    const groupes = [...new Set(students.map(s => s.groupe).filter(g => g))].sort();



    const handleGlobalExport = async () => {
        if (filtered.length === 0) {
            alert("Aucun élève à exporter dans la liste actuelle.");
            return;
        }

        const header = "Classe\tGroupe\tNom\tIdentifiant\tMot de Passe\n";
        const rows = filtered.map(s => {
            const mdp = s.password || "-";
            return `${s.classe}\t${s.groupe || ""}\t${s.nom}\t${s.identifiant}\t${mdp}`;
        }).join('\n');

        const csvContent = header + rows;

        try {
            await navigator.clipboard.writeText(csvContent);
            alert("📋 Liste copiée dans le presse-papier !");
        } catch (err) {
            // Fallback si le presse-papier est bloqué
            console.error("Erreur copie : ", err);
            prompt("Le copier-coller automatique a échoué. Copiez le texte ci-dessous :", csvContent);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 p-6">
            <StudentDetailModal
                user={user} s={selectedStudent} onClose={() => setSelectedStudent(null)}
                classesList={LISTE_CLASSES} onEdit={handleEditStudent} onDelete={handleDeleteStudent}
                onShare={() => { }} // A implémenter si besoin
                onUnshare={() => { }} // A implémenter si besoin
                colleagues={allProfs}
            />
            {showMassImport && <MassImportModal onClose={() => setShowMassImport(false)} classesList={LISTE_CLASSES} onImport={handleMassCreate} results={importResults} />}
            {showGlobalList && <GlobalStudentListModal onClose={() => setShowGlobalList(false)} currentTeacherId={user.data.id} onLink={() => { }} />}
            {showProgression && (
                <ProgressionModal
                    onClose={() => setShowProgression(false)}
                    user={user}
                    setUser={setUser}
                    onSound={onSound}
                />
            )}

            <div className="max-w-7xl mx-auto">
                {/* HEADER */}
                <header className="flex flex-wrap gap-4 justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm">
                    <div>
                        <h1 className="text-2xl font-black text-indigo-900">Gestion de Classe</h1>
                        <p className="text-slate-500">Connecté en tant que <span className="font-bold">{user.data.nom}</span></p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button onClick={onBackToGame} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-700"><Icon name="game-controller" /> Accéder aux exercices</button>
                        <button onClick={() => { setImportResults(null); setShowMassImport(true); }} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-purple-700"><Icon name="users-three" /> Ajouter des élèves</button>
                        <button onClick={() => setShowGlobalList(true)} className="bg-orange-100 text-orange-700 border border-orange-200 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-orange-200"><Icon name="link" /> Récupérer des élèves</button>

                        {/* Bouton Exporter */}
                        <button onClick={handleGlobalExport} className="bg-slate-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-600">
                            <Icon name="export" /> Identifiants
                        </button>
                        {/* Bouton Progression */}
                        <button onClick={() => setShowProgression(true)} className="bg-amber-100 text-amber-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-amber-200">
                            <Icon name="sliders-horizontal" /> Progression
                        </button>




                        <button onClick={onLogout} className="bg-slate-200 text-slate-600 px-4 py-2 rounded-lg font-bold hover:bg-slate-300">Déconnexion</button>
                    </div>


                </header>

                {/* TABLEAU */}
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-200">
                    {/* BARRE OUTILS TABLEAU */}
                    <div className="p-4 border-b flex gap-4 items-center bg-slate-50 flex-wrap">
                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200 flex-1 min-w-[200px]">
                            <Icon name="magnifying-glass" className="text-slate-400" />
                            <input type="text" placeholder="Rechercher..." className="bg-transparent outline-none w-full text-sm font-bold text-slate-700" value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <select className="bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none font-bold text-slate-700 text-sm" value={filterClasse} onChange={e => setFilterClasse(e.target.value)}>
                            <option value="Toutes">Toutes les classes</option>
                            {classes.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select className="bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none font-bold text-slate-700 text-sm" value={filterGroupe} onChange={e => setFilterGroupe(e.target.value)}>
                            <option value="Tous">Tous les groupes</option>
                            {groupes.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>

                    {/* TABLE DATA */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-100 text-slate-500 uppercase font-bold text-xs">
                                <tr>
                                    {[
                                        { k: 'classe', l: 'Classe' },
                                        { k: 'nom', l: 'Nom' },
                                        { k: 'identifiant', l: 'ID' },
                                        { k: 'xp', l: 'XP' },
                                        { k: 'tablesCount', l: 'Tables' },
                                        { k: 'skillsCount', l: 'Exos' }
                                    ].map(col => (
                                        <th key={col.k} className="p-4 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleSort(col.k)}>
                                            <div className="flex items-center gap-1">{col.l} {sortConfig.key === col.k && <Icon name={sortConfig.direction === 'asc' ? 'caret-up' : 'caret-down'} weight="fill" />}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan="6" className="p-8 text-center text-slate-400 font-bold">Chargement...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan="6" className="p-8 text-center text-slate-400 italic">Aucun élève trouvé.</td></tr>
                                ) : (
                                    filtered.map(s => (
                                        <tr key={s.id} onClick={() => setSelectedStudent(s)} className="hover:bg-slate-50 cursor-pointer transition-colors group">
                                            <td className="p-4 font-bold text-slate-400 w-24 bg-slate-50/50 group-hover:bg-slate-50">{s.classe}</td>
                                            <td className="p-4">
                                                <div className="font-bold text-slate-800 text-base">{s.nom}</div>
                                                {s.groupe && <span className="inline-block mt-1 bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border border-pink-200">{s.groupe}</span>}
                                            </td>
                                            <td className="p-4 font-mono font-bold text-indigo-500 text-xs">{s.identifiant}</td>
                                            <td className="p-4"><span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-bold text-xs border border-amber-200">{s.xp}</span></td>
                                            <td className="p-4 text-center w-24">
                                                <span className={`font-bold ${s.stats.tablesCount >= 22 ? 'text-emerald-600' : 'text-slate-400'}`}>{s.stats.tablesCount}</span><span className="text-slate-300 text-xs">/22</span>
                                            </td>
                                            <td className="p-4 text-indigo-600 font-bold w-24 text-center">{s.stats.skillsCount}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};