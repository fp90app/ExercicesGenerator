import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, doc, addDoc, deleteDoc, query, where, writeBatch, increment, getDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Icon } from '../UI';
import { SCHOOL_LEVELS } from '../../utils/constants';

// Correspondance des touches rapides vers les pastilles
const EMOJI_MAP = { '1': '🔴', '2': '🟨', '3': '🟩', '4': '🟢' };

export default function EvaluationsTab() {
    const [view, setView] = useState('LIST'); // 'LIST', 'CREATE', 'GRADE'
    const [loading, setLoading] = useState(true);

    const [evaluations, setEvaluations] = useState([]);
    const [competences, setCompetences] = useState([]);
    const [classesList, setClassesList] = useState([]);
    const [xpConfig, setXpConfig] = useState({});

    // --- FORMULAIRE CRÉATION ---
    const [formData, setFormData] = useState({
        title: "", date: new Date().toISOString().split('T')[0],
        maxScore: 20, coefficient: 1, classes: [], comps: []
    });

    // --- FILTRES DE RECHERCHE ---
    const [filterLevel, setFilterLevel] = useState('ALL');
    const [filterChapter, setFilterChapter] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    // --- SAISIE DES NOTES ---
    const [currentEval, setCurrentEval] = useState(null);
    const [evalStudents, setEvalStudents] = useState([]);
    const [grades, setGrades] = useState({});
    const [savingGrades, setSavingGrades] = useState(false);

    // Initialisation
    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // 1. Charger les classes existantes
            const configSnap = await getDoc(doc(db, "config", "courses"));
            let allCls = [];
            if (configSnap.exists()) {
                const data = configSnap.data();
                SCHOOL_LEVELS.forEach(lvl => { if (data[lvl]) allCls.push(...data[lvl]); });
            }
            setClassesList(allCls.sort());

            // 2. Charger les compétences
            const compSnap = await getDocs(collection(db, "competences"));
            const comps = compSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            comps.sort((a, b) => a.chapitre - b.chapitre || (a.code || a.id).localeCompare(b.code || b.id));
            setCompetences(comps);

            // 3. Charger les évaluations
            const evalsSnap = await getDocs(collection(db, "evaluations"));
            const evals = evalsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            evals.sort((a, b) => new Date(b.date) - new Date(a.date));
            setEvaluations(evals);

            // 4. Charger la config XP
            const xpSnap = await getDoc(doc(db, "config", "xp"));
            if (xpSnap.exists()) setXpConfig(xpSnap.data());

        } catch (e) {
            toast.error("Erreur de chargement");
            console.error(e);
        }
        setLoading(false);
    };

    // --- LOGIQUE DE CRÉATION & FILTRAGE ---

    // Récupérer la liste des niveaux et chapitres disponibles pour les filtres
    const availableLevels = [...new Set(competences.map(c => c.niveau || '6ème'))].sort();
    const availableChapters = [...new Set(
        competences.filter(c => filterLevel === 'ALL' || (c.niveau || '6ème') === filterLevel)
            .map(c => c.chapitre)
    )].sort((a, b) => a - b);

    // Filtrer le catalogue selon les 3 critères
    const filteredComps = competences.filter(c => {
        if (filterLevel !== 'ALL' && (c.niveau || '6ème') !== filterLevel) return false;
        if (filterChapter !== 'ALL' && String(c.chapitre) !== String(filterChapter)) return false;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const codeMatch = (c.code || c.id).toLowerCase().includes(term);
            const titleMatch = c.intitule.toLowerCase().includes(term);
            const chapMatch = c.chapitreNom?.toLowerCase().includes(term);
            if (!codeMatch && !titleMatch && !chapMatch) return false;
        }
        return true;
    });

    const toggleFormClass = (cls) => {
        setFormData(prev => ({
            ...prev,
            classes: prev.classes.includes(cls) ? prev.classes.filter(c => c !== cls) : [...prev.classes, cls]
        }));
    };

    // Ajouter une compétence (sans toggle, on l'ajoute juste à la fin)
    const addFormComp = (comp) => {
        setFormData(prev => ({
            ...prev,
            comps: [...prev.comps, { id: comp.id, code: comp.code || comp.id, intitule: comp.intitule, chapitre: comp.chapitre }]
        }));
    };

    // Retirer de la sélection
    const removeFormComp = (compId) => {
        setFormData(prev => ({ ...prev, comps: prev.comps.filter(c => c.id !== compId) }));
    };

    // Déplacer vers le haut ou vers le bas dans la sélection
    const moveComp = (index, direction) => {
        if ((direction === -1 && index === 0) || (direction === 1 && index === formData.comps.length - 1)) return;
        const newComps = [...formData.comps];
        const temp = newComps[index];
        newComps[index] = newComps[index + direction];
        newComps[index + direction] = temp;
        setFormData(prev => ({ ...prev, comps: newComps }));
    };

    const handleCreateEval = async (e) => {
        e.preventDefault();
        if (formData.classes.length === 0) return toast.error("Choisis au moins une classe !");
        if (formData.comps.length === 0) return toast.error("Choisis au moins une compétence !");

        const toastId = toast.loading("Création de l'évaluation...");
        try {
            const newEval = {
                title: formData.title,
                date: formData.date,
                maxScore: Number(formData.maxScore),
                coefficient: Number(formData.coefficient),
                classes: formData.classes,
                competences: formData.comps, // L'ordre du tableau JSON est préservé par Firestore !
                grades: {}
            };
            const docRef = await addDoc(collection(db, "evaluations"), newEval);

            setEvaluations([{ id: docRef.id, ...newEval }, ...evaluations]);
            toast.success("Évaluation créée !", { id: toastId });
            setView('LIST');

            // Reset form & filtres
            setFormData({ title: "", date: new Date().toISOString().split('T')[0], maxScore: 20, coefficient: 1, classes: [], comps: [] });
            setSearchTerm("");
            setFilterChapter("ALL");
        } catch (error) {
            toast.error("Erreur de création", { id: toastId });
        }
    };

    const handleDeleteEval = async (evalId) => {
        if (!window.confirm("Supprimer cette évaluation et toutes ses notes ? L'historique des compétences des élèves ne sera pas effacé.")) return;
        try {
            await deleteDoc(doc(db, "evaluations", evalId));
            setEvaluations(evaluations.filter(e => e.id !== evalId));
            toast.success("Évaluation supprimée");
        } catch (e) { toast.error("Erreur de suppression"); }
    };

    // --- LOGIQUE DE SAISIE (GRILLE) ---
    const openGrading = async (evaluation) => {
        setCurrentEval(evaluation);
        setGrades(evaluation.grades || {});
        setView('GRADE');
        setLoading(true);

        try {
            let allStuds = [];
            for (const cls of evaluation.classes) {
                const q = query(collection(db, "eleves"), where("classe", "==", cls));
                const snap = await getDocs(q);
                snap.forEach(d => allStuds.push({ id: d.id, ...d.data() }));
            }
            allStuds.sort((a, b) => a.nom.localeCompare(b.nom));
            setEvalStudents(allStuds);
        } catch (e) {
            toast.error("Erreur récupération élèves");
        }
        setLoading(false);
    };

    const handleNoteChange = (studentId, val) => {
        setGrades(prev => ({
            ...prev,
            [studentId]: { ...(prev[studentId] || {}), note: val }
        }));
    };

    const handleCompChange = (studentId, compId, val) => {
        const cleanVal = val.replace(/[^1-4]/g, '').slice(-1);
        setGrades(prev => ({
            ...prev,
            [studentId]: {
                ...(prev[studentId] || {}),
                comps: {
                    ...(prev[studentId]?.comps || {}),
                    [compId]: cleanVal
                }
            }
        }));
    };

    const getDotStyle = (val) => {
        if (val === '1') return 'bg-red-500 text-white border-red-600 shadow-inner scale-110';
        if (val === '2') return 'bg-amber-400 text-white border-amber-500 shadow-inner scale-110';
        if (val === '3') return 'bg-emerald-400 text-white border-emerald-500 shadow-inner scale-110';
        if (val === '4') return 'bg-emerald-700 text-white border-emerald-800 shadow-inner scale-110';
        return 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100';
    };

    const getXpValue = (bilan) => {
        if (bilan === '🟢') return Number(xpConfig.competenceNiveau4) || 25;
        if (bilan === '🟩') return Number(xpConfig.competenceNiveau3) || 15;
        if (bilan === '🟨') return Number(xpConfig.competenceNiveau2) || 5;
        return 0;
    };

    const saveGrades = async () => {
        setSavingGrades(true);
        const toastId = toast.loading("Sauvegarde et mise à jour des compétences...");

        try {
            const batch = writeBatch(db);

            const evalRef = doc(db, "evaluations", currentEval.id);
            batch.update(evalRef, { grades: grades });

            for (const student of evalStudents) {
                const studentGrades = grades[student.id];
                if (!studentGrades || !studentGrades.comps) continue;

                let xpTotalDiff = 0;

                for (const comp of currentEval.competences) {
                    const typedVal = studentGrades.comps[comp.id];
                    if (!typedVal) continue;

                    const newEmoji = EMOJI_MAP[typedVal];
                    const compRef = doc(db, `eleves/${student.id}/suivi_competences/${comp.id}`);

                    const compSnap = await getDoc(compRef);
                    let evals = [];
                    let oldBilan = '⚪';

                    if (compSnap.exists()) {
                        evals = compSnap.data().evaluations || [];
                        oldBilan = compSnap.data().bilan || '⚪';
                    }

                    const existingIndex = evals.findIndex(e => e.date === currentEval.date);
                    const newEvalObj = { date: currentEval.date, note: newEmoji };
                    if (existingIndex >= 0) evals[existingIndex] = newEvalObj;
                    else evals.push(newEvalObj);

                    evals.sort((a, b) => new Date(a.date) - new Date(b.date));
                    const latest = evals[evals.length - 1];
                    const newBilan = latest.note;

                    xpTotalDiff += getXpValue(newBilan) - getXpValue(oldBilan);

                    batch.set(compRef, {
                        competenceId: comp.id,
                        bilan: newBilan,
                        derniereEval: latest.date,
                        evaluations: evals,
                        cible: false,
                        enAttente: false
                    }, { merge: true });
                }

                if (xpTotalDiff !== 0) {
                    const stuRef = doc(db, "eleves", student.id);
                    batch.update(stuRef, { exp: increment(xpTotalDiff) });
                }
            }

            await batch.commit();
            setEvaluations(prev => prev.map(e => e.id === currentEval.id ? { ...e, grades } : e));
            toast.success("Toutes les notes et compétences ont été synchronisées !", { id: toastId });
            setView('LIST');

        } catch (error) {
            console.error(error);
            toast.error("Erreur de sauvegarde", { id: toastId });
        }
        setSavingGrades(false);
    };

    if (loading) return <div className="p-10 text-center font-bold text-slate-400"><Icon name="spinner" className="animate-spin" /> Chargement...</div>;

    // ========================================================================
    // VUE 1 : LISTE DES ÉVALUATIONS
    // ========================================================================
    if (view === 'LIST') {
        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                            <Icon name="exam" className="text-indigo-600" /> Évaluations & Contrôles
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Crée des devoirs, note-les rapidement, et synchronise les compétences.</p>
                    </div>
                    <button onClick={() => setView('CREATE')} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md flex items-center gap-2">
                        <Icon name="plus" weight="bold" /> Nouvelle évaluation
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {evaluations.map(ev => {
                        const gradedCount = Object.keys(ev.grades || {}).length;
                        return (
                            <div key={ev.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold font-mono">
                                        {ev.date.split('-').reverse().join('/')}
                                    </div>
                                    <div className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                        Coeff. {ev.coefficient}
                                    </div>
                                </div>

                                <h3 className="text-lg font-black text-slate-800 mb-2">{ev.title}</h3>

                                <div className="flex flex-wrap gap-1 mb-4">
                                    {ev.classes.map(c => <span key={c} className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-100">{c}</span>)}
                                </div>

                                <div className="text-xs text-slate-500 mb-6 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    <span className="font-bold text-slate-700">{ev.competences.length}</span> compétences ciblées
                                </div>

                                <div className="mt-auto flex gap-2">
                                    <button onClick={() => openGrading(ev)} className="flex-1 bg-indigo-50 text-indigo-700 font-bold py-2 rounded-xl hover:bg-indigo-600 hover:text-white transition-colors flex items-center justify-center gap-2">
                                        <Icon name="pencil-simple" weight="bold" /> Saisir notes ({gradedCount})
                                    </button>
                                    <button onClick={() => handleDeleteEval(ev.id)} className="w-10 bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 rounded-xl flex items-center justify-center transition-colors">
                                        <Icon name="trash" weight="bold" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {evaluations.length === 0 && (
                        <div className="col-span-full p-12 text-center text-slate-400 italic bg-white rounded-2xl border-2 border-dashed border-slate-200">
                            Aucune évaluation pour le moment.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ========================================================================
    // VUE 2 : CRÉATION D'ÉVALUATION (AVEC FILTRES ET TRI)
    // ========================================================================
    if (view === 'CREATE') {
        return (
            <form onSubmit={handleCreateEval} className="space-y-6 animate-in fade-in pb-12">
                <div className="flex justify-between items-center">
                    <button type="button" onClick={() => setView('LIST')} className="text-slate-500 font-bold flex items-center gap-1 hover:text-indigo-600">
                        <Icon name="arrow-left" /> Retour
                    </button>
                    <button type="submit" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-indigo-700 flex items-center gap-2">
                        <Icon name="check" weight="bold" /> Enregistrer
                    </button>
                </div>

                <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                    {/* Infos de base */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Titre du devoir</label>
                            <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-lg outline-none focus:border-indigo-500" placeholder="Ex: Contrôle Thalès" />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Note sur</label>
                                <input required type="number" min="1" value={formData.maxScore} onChange={e => setFormData({ ...formData, maxScore: e.target.value })} className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-lg outline-none focus:border-indigo-500 text-center" />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Coeff.</label>
                                <input required type="number" min="0.5" step="0.5" value={formData.coefficient} onChange={e => setFormData({ ...formData, coefficient: e.target.value })} className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-lg outline-none focus:border-indigo-500 text-center" />
                            </div>
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Date</label>
                                <input required type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500" />
                            </div>
                        </div>
                    </div>

                    {/* Classes */}
                    <div className="border-t border-slate-100 pt-6">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Classes concernées</label>
                        <div className="flex flex-wrap gap-2">
                            {classesList.map(cls => (
                                <button key={cls} type="button" onClick={() => toggleFormClass(cls)} className={`px-4 py-2 rounded-xl font-bold text-sm border-2 transition-colors ${formData.classes.includes(cls) ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'}`}>
                                    {cls}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sélection des Compétences (Double Colonne) */}
                    <div className="border-t border-slate-100 pt-6">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Icon name="target" /> Sélection et ordre des compétences
                        </label>

                        {/* Barre de Filtres */}
                        <div className="flex flex-col md:flex-row gap-3 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-2 text-slate-400 shrink-0"><Icon name="funnel" /></div>
                            <select value={filterLevel} onChange={e => { setFilterLevel(e.target.value); setFilterChapter('ALL'); }} className="p-2 border-2 border-slate-200 rounded-xl outline-none font-bold text-slate-700 bg-white min-w-[140px]">
                                <option value="ALL">Tous Niveaux</option>
                                {availableLevels.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                            <select value={filterChapter} onChange={e => setFilterChapter(e.target.value)} className="p-2 border-2 border-slate-200 rounded-xl outline-none font-bold text-slate-700 bg-white min-w-[160px]">
                                <option value="ALL">Tous Chapitres</option>
                                {availableChapters.map(c => <option key={c} value={c}>Chapitre {c}</option>)}
                            </select>
                            <input type="text" placeholder="Recherche (ex: NT1, fraction...)" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 p-2 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium" />
                        </div>

                        <div className="grid md:grid-cols-2 gap-6 h-[400px]">
                            {/* Colonne Gauche : Catalogue Filtré */}
                            <div className="flex flex-col h-full">
                                <h4 className="text-sm font-bold text-slate-700 mb-2">Catalogue ({filteredComps.length})</h4>
                                <div className="overflow-y-auto bg-slate-50 p-2 rounded-xl border border-slate-200 custom-scrollbar flex-1 space-y-2">
                                    {filteredComps.map(comp => {
                                        const isSelected = formData.comps.some(c => c.id === comp.id);
                                        return (
                                            <div
                                                key={comp.id}
                                                onClick={() => !isSelected && addFormComp(comp)}
                                                className={`p-3 rounded-xl border-2 transition-all flex items-start gap-3 ${isSelected ? 'bg-slate-200 border-slate-300 opacity-50 cursor-not-allowed' : 'bg-white border-slate-200 hover:border-indigo-300 cursor-pointer shadow-sm'}`}
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{comp.code || comp.id}</span>
                                                        <span className="text-[10px] font-bold text-slate-400">Chap. {comp.chapitre}</span>
                                                    </div>
                                                    <div className="text-xs font-bold leading-tight text-slate-700">{comp.intitule}</div>
                                                </div>
                                                {!isSelected && <Icon name="plus-circle" className="text-indigo-400 mt-1 shrink-0" weight="fill" />}
                                            </div>
                                        )
                                    })}
                                    {filteredComps.length === 0 && <div className="text-center p-6 text-slate-400 italic text-sm">Aucune compétence trouvée.</div>}
                                </div>
                            </div>

                            {/* Colonne Droite : Sélection & Ordre */}
                            <div className="flex flex-col h-full">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-sm font-bold text-slate-700">Ordre d'affichage (sur la copie)</h4>
                                    <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{formData.comps.length} sél.</span>
                                </div>
                                <div className="overflow-y-auto bg-indigo-50/50 p-2 rounded-xl border-2 border-indigo-200 custom-scrollbar flex-1 space-y-2">
                                    {formData.comps.length === 0 ? (
                                        <div className="text-center p-6 text-slate-400 italic text-sm">Cliquez sur les compétences à gauche pour les ajouter.</div>
                                    ) : (
                                        formData.comps.map((comp, idx) => (
                                            <div key={comp.id} className="p-3 bg-white rounded-xl border border-indigo-200 shadow-sm flex items-center justify-between gap-3 group">
                                                {/* Boutons d'ordre */}
                                                <div className="flex flex-col gap-0.5 shrink-0 bg-slate-50 rounded-lg p-0.5 border border-slate-100">
                                                    <button type="button" onClick={() => moveComp(idx, -1)} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded p-0.5"><Icon name="caret-up" size={16} weight="bold" /></button>
                                                    <button type="button" onClick={() => moveComp(idx, 1)} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded p-0.5"><Icon name="caret-down" size={16} weight="bold" /></button>
                                                </div>

                                                <div className="flex-1 min-w-0 leading-tight">
                                                    <div className="text-[10px] font-black text-indigo-600 mb-0.5 flex items-center gap-2">
                                                        {comp.code}
                                                        <span className="text-slate-400 font-medium">| Chap. {comp.chapitre}</span>
                                                    </div>
                                                    <div className="text-xs font-bold text-slate-700 truncate">{comp.intitule}</div>
                                                </div>

                                                {/* Supprimer */}
                                                <button type="button" onClick={() => removeFormComp(comp.id)} className="shrink-0 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Icon name="x" weight="bold" size={16} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        );
    }

    // ========================================================================
    // VUE 3 : GRILLE DE SAISIE (TABLEUR)
    // ========================================================================
    return (
        <div className="space-y-6 animate-in fade-in pb-12">
            <div className="flex justify-between items-center">
                <button onClick={() => setView('LIST')} className="text-slate-500 font-bold flex items-center gap-1 hover:text-indigo-600">
                    <Icon name="arrow-left" /> Retour
                </button>
                <button onClick={saveGrades} disabled={savingGrades} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50">
                    {savingGrades ? <Icon name="spinner" className="animate-spin" /> : <Icon name="floppy-disk" weight="fill" />}
                    Enregistrer et Diffuser
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[75vh]">

                {/* Header d'info */}
                <div className="bg-slate-900 p-4 text-white shrink-0 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-black">{currentEval.title}</h2>
                        <div className="text-xs text-slate-400 font-mono mt-1">Classes : {currentEval.classes.join(', ')} • Date : {currentEval.date.split('-').reverse().join('/')}</div>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-4">
                        <span className="flex items-center gap-1.5"><kbd className="bg-slate-700 px-1.5 py-0.5 rounded font-mono text-xs shadow text-white">1</kbd> 🔴</span>
                        <span className="flex items-center gap-1.5"><kbd className="bg-slate-700 px-1.5 py-0.5 rounded font-mono text-xs shadow text-white">2</kbd> 🟨</span>
                        <span className="flex items-center gap-1.5"><kbd className="bg-slate-700 px-1.5 py-0.5 rounded font-mono text-xs shadow text-white">3</kbd> 🟩</span>
                        <span className="flex items-center gap-1.5"><kbd className="bg-slate-700 px-1.5 py-0.5 rounded font-mono text-xs shadow text-white">4</kbd> 🟢</span>
                        <span className="border-l border-slate-600 pl-4 flex items-center gap-1.5 text-indigo-300"><kbd className="bg-slate-700 px-1.5 py-0.5 rounded font-mono text-xs shadow text-white">Tab ↹</kbd> Suivant</span>
                    </div>
                </div>

                {/* Le Tableau */}
                <div className="overflow-auto flex-1 custom-scrollbar bg-slate-50">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th className="p-3 border-b-2 border-r border-slate-200 font-black text-slate-700 min-w-[200px] sticky left-0 bg-white z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                    Élève ({evalStudents.length})
                                </th>
                                <th className="p-3 border-b-2 border-r border-slate-200 font-black text-slate-700 text-center w-32 bg-slate-50">
                                    Note / {currentEval.maxScore}
                                </th>
                                {/* Les colonnes respectent parfaitement l'ordre défini dans currentEval.competences */}
                                {currentEval.competences.map(comp => (
                                    <th key={comp.id} className="p-3 border-b-2 border-r border-slate-200 text-center min-w-[100px]" title={comp.intitule}>
                                        <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded inline-block">{comp.code || comp.id}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {evalStudents.map((student, sIdx) => {
                                const stData = grades[student.id] || {};
                                return (
                                    <tr key={student.id} className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors">
                                        {/* Nom Élève */}
                                        <td className="p-3 border-r border-slate-200 font-bold text-slate-800 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                            {student.nom}
                                            <span className="text-[10px] text-slate-400 font-mono ml-2 block sm:inline">{student.classe}</span>
                                        </td>

                                        {/* Note Prof */}
                                        <td className="p-2 border-r border-slate-200 bg-slate-50/50">
                                            <input
                                                type="text"
                                                value={stData.note || ""}
                                                onChange={e => handleNoteChange(student.id, e.target.value)}
                                                className="w-full text-center font-black text-lg bg-transparent border-b-2 border-transparent focus:border-indigo-500 outline-none text-slate-700"
                                                placeholder="-"
                                                tabIndex={sIdx * 100} // Indexation pour la tabulation verticale
                                            />
                                        </td>

                                        {/* Compétences (Pastilles au clavier) respectant l'ordre */}
                                        {currentEval.competences.map((comp, cIdx) => {
                                            const val = stData.comps?.[comp.id] || "";
                                            return (
                                                <td key={comp.id} className="p-2 border-r border-slate-200 text-center relative group">
                                                    <input
                                                        type="text"
                                                        value={val}
                                                        onChange={e => handleCompChange(student.id, comp.id, e.target.value)}
                                                        className={`w-8 h-8 rounded-full text-center font-bold text-sm outline-none transition-all cursor-pointer focus:ring-4 focus:ring-indigo-200 border-2 mx-auto block caret-transparent ${getDotStyle(val)}`}
                                                        placeholder="·"
                                                        tabIndex={sIdx * 100 + cIdx + 1}
                                                    />
                                                    {/* Tooltip indication au survol si vide */}
                                                    {!val && (
                                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 text-[10px] text-slate-300 font-bold">1-4</div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                            {evalStudents.length === 0 && (
                                <tr>
                                    <td colSpan={currentEval.competences.length + 2} className="p-8 text-center text-slate-400 italic">
                                        Aucun élève trouvé pour ces classes.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <p className="text-center text-xs text-slate-400 font-medium">Les notes chiffrées sont privées. Seules les pastilles de couleurs mettront à jour les graphiques des élèves.</p>
        </div>
    );
}