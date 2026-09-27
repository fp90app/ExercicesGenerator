import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, doc, setDoc, addDoc, deleteDoc, query, where, writeBatch, getDoc, orderBy } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Icon } from '../UI';
import { SCHOOL_LEVELS } from '../../utils/constants';

// Correspondance des touches rapides vers le résultat visuel
const RESULT_MAP = { '1': '🔴', '2': '🟢' };

export default function FlashTestsTab() {
    const [view, setView] = useState('LIST'); // 'LIST', 'CREATE', 'GRADE'
    const [loading, setLoading] = useState(true);

    const [flashTests, setFlashTests] = useState([]);
    const [availableThemes, setAvailableThemes] = useState([]);
    const [classesList, setClassesList] = useState([]);

    // --- FORMULAIRE CRÉATION ---
    const [formData, setFormData] = useState({
        title: "", date: new Date().toISOString().split('T')[0],
        classes: [], themes: []
    });

    // --- SAISIE DES RÉSULTATS ---
    const [currentTest, setCurrentTest] = useState(null);
    const [evalStudents, setEvalStudents] = useState([]);
    const [results, setResults] = useState({}); // { studentId: { themeName: "1" } }
    const [savingResults, setSavingResults] = useState(false);

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

            // 2. Charger les thèmes disponibles depuis la banque d'images
            const bankSnap = await getDocs(collection(db, "auto_questions"));
            const themesSet = new Set();
            bankSnap.forEach(d => themesSet.add(d.data().theme));
            setAvailableThemes([...themesSet].sort());

            // 3. Charger les flash-tests créés
            const testsSnap = await getDocs(collection(db, "flash_tests"));
            const tests = testsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            tests.sort((a, b) => new Date(b.date) - new Date(a.date));
            setFlashTests(tests);

        } catch (e) {
            toast.error("Erreur de chargement");
            console.error(e);
        }
        setLoading(false);
    };

    // --- LOGIQUE DE CRÉATION ---
    const toggleFormClass = (cls) => {
        setFormData(prev => ({
            ...prev,
            classes: prev.classes.includes(cls) ? prev.classes.filter(c => c !== cls) : [...prev.classes, cls]
        }));
    };

    const toggleFormTheme = (theme) => {
        setFormData(prev => ({
            ...prev,
            themes: prev.themes.includes(theme) ? prev.themes.filter(t => t !== theme) : [...prev.themes, theme]
        }));
    };

    const moveTheme = (index, direction) => {
        if ((direction === -1 && index === 0) || (direction === 1 && index === formData.themes.length - 1)) return;
        const newThemes = [...formData.themes];
        const temp = newThemes[index];
        newThemes[index] = newThemes[index + direction];
        newThemes[index + direction] = temp;
        setFormData(prev => ({ ...prev, themes: newThemes }));
    };

    const handleCreateTest = async (e) => {
        e.preventDefault();
        if (formData.classes.length === 0) return toast.error("Choisis au moins une classe !");
        if (formData.themes.length === 0) return toast.error("Choisis au moins un thème !");

        const toastId = toast.loading("Création du Flash-Test...");
        try {
            const newTest = {
                title: formData.title,
                date: formData.date,
                classes: formData.classes,
                themes: formData.themes,
                results: {} // Structure vide pour les résultats
            };
            const docRef = await addDoc(collection(db, "flash_tests"), newTest);

            setFlashTests([{ id: docRef.id, ...newTest }, ...flashTests]);
            toast.success("Flash-Test créé !", { id: toastId });
            setView('LIST');

            // Reset form
            setFormData({ title: "", date: new Date().toISOString().split('T')[0], classes: [], themes: [] });
        } catch (error) {
            toast.error("Erreur de création", { id: toastId });
        }
    };

    const handleDeleteTest = async (testId) => {
        if (!window.confirm("Supprimer ce Flash-Test ? Les statistiques globales des élèves ne seront pas effacées.")) return;
        try {
            await deleteDoc(doc(db, "flash_tests", testId));
            setFlashTests(flashTests.filter(t => t.id !== testId));
            toast.success("Flash-Test supprimé");
        } catch (e) { toast.error("Erreur de suppression"); }
    };

    // --- LOGIQUE DE SAISIE (GRILLE) ---
    const openGrading = async (test) => {
        setCurrentTest(test);
        setResults(test.results || {});
        setView('GRADE');
        setLoading(true);

        try {
            let allStuds = [];
            for (const cls of test.classes) {
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

    const handleResultChange = (studentId, theme, val) => {
        // Filtrer pour n'accepter que 1 ou 2
        const cleanVal = val.replace(/[^1-2]/g, '').slice(-1);
        setResults(prev => ({
            ...prev,
            [studentId]: {
                ...(prev[studentId] || {}),
                [theme]: cleanVal
            }
        }));
    };

    const getDotStyle = (val) => {
        if (val === '1') return 'bg-red-500 text-white border-red-600 shadow-inner scale-110';
        if (val === '2') return 'bg-emerald-500 text-white border-emerald-600 shadow-inner scale-110';
        return 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100';
    };

    const saveResults = async () => {
        setSavingResults(true);
        const toastId = toast.loading("Sauvegarde et calcul des pourcentages...");

        try {
            const batch = writeBatch(db);

            // 1. Sauvegarder la grille dans le document du flash-test
            const testRef = doc(db, "flash_tests", currentTest.id);
            batch.update(testRef, { results: results });

            // 2. Mettre à jour l'historique d'automatismes de chaque élève
            for (const student of evalStudents) {
                const studentResults = results[student.id];
                if (!studentResults) continue;

                for (const theme of currentTest.themes) {
                    const typedVal = studentResults[theme];
                    if (!typedVal) continue; // Pas évalué sur ce thème cette fois

                    const themeRef = doc(db, `eleves/${student.id}/suivi_automatismes/${theme}`);
                    const themeSnap = await getDoc(themeRef);

                    let evals = [];
                    if (themeSnap.exists()) {
                        evals = themeSnap.data().evaluations || [];
                    }

                    // Chercher si cette date existe déjà pour l'écraser, sinon l'ajouter
                    const existingIndex = evals.findIndex(e => e.date === currentTest.date);
                    const newEvalObj = { date: currentTest.date, result: typedVal }; // '1' ou '2'

                    if (existingIndex >= 0) evals[existingIndex] = newEvalObj;
                    else evals.push(newEvalObj);

                    // Trier par date
                    evals.sort((a, b) => new Date(a.date) - new Date(b.date));

                    // Calcul du pourcentage de réussite (nombre de '2' / nombre total d'évals)
                    const successCount = evals.filter(e => e.result === '2').length;
                    const percentage = Math.round((successCount / evals.length) * 100);

                    batch.set(themeRef, {
                        theme: theme,
                        evaluations: evals,
                        pourcentage: percentage,
                        derniereEval: evals[evals.length - 1].date
                    }, { merge: true });
                }
            }

            await batch.commit();

            // Mettre à jour l'état local
            setFlashTests(prev => prev.map(t => t.id === currentTest.id ? { ...t, results } : t));

            toast.success("Résultats synchronisés avec succès !", { id: toastId });
            setView('LIST');

        } catch (error) {
            console.error(error);
            toast.error("Erreur de sauvegarde", { id: toastId });
        }
        setSavingResults(false);
    };

    if (loading) return <div className="p-10 text-center font-bold text-slate-400"><Icon name="spinner" className="animate-spin" /> Chargement...</div>;

    // ========================================================================
    // VUE 1 : LISTE DES FLASH-TESTS
    // ========================================================================
    if (view === 'LIST') {
        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                            <Icon name="lightning" className="text-indigo-600" /> Flash-Tests (Automatismes)
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Saisie ultra-rapide des questions flash pour cibler les besoins des élèves.</p>
                    </div>
                    <button onClick={() => setView('CREATE')} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md flex items-center gap-2">
                        <Icon name="plus" weight="bold" /> Nouveau Flash-Test
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {flashTests.map(test => {
                        const gradedCount = Object.keys(test.results || {}).length;
                        return (
                            <div key={test.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold font-mono">
                                        {test.date.split('-').reverse().join('/')}
                                    </div>
                                </div>

                                <h3 className="text-lg font-black text-slate-800 mb-2">{test.title}</h3>

                                <div className="flex flex-wrap gap-1 mb-4">
                                    {test.classes.map(c => <span key={c} className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-100">{c}</span>)}
                                </div>

                                <div className="text-xs text-slate-500 mb-6 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    <span className="font-bold text-slate-700">{test.themes.length}</span> thèmes évalués
                                </div>

                                <div className="mt-auto flex gap-2">
                                    <button onClick={() => openGrading(test)} className="flex-1 bg-indigo-50 text-indigo-700 font-bold py-2 rounded-xl hover:bg-indigo-600 hover:text-white transition-colors flex items-center justify-center gap-2">
                                        <Icon name="pencil-simple" weight="bold" /> Saisir ({gradedCount})
                                    </button>
                                    <button onClick={() => handleDeleteTest(test.id)} className="w-10 bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 rounded-xl flex items-center justify-center transition-colors">
                                        <Icon name="trash" weight="bold" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {flashTests.length === 0 && (
                        <div className="col-span-full p-12 text-center text-slate-400 italic bg-white rounded-2xl border-2 border-dashed border-slate-200">
                            Aucun Flash-Test pour le moment.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ========================================================================
    // VUE 2 : CRÉATION DU FLASH-TEST
    // ========================================================================
    if (view === 'CREATE') {
        return (
            <form onSubmit={handleCreateTest} className="space-y-6 animate-in fade-in pb-12">
                <div className="flex justify-between items-center">
                    <button type="button" onClick={() => setView('LIST')} className="text-slate-500 font-bold flex items-center gap-1 hover:text-indigo-600">
                        <Icon name="arrow-left" /> Retour
                    </button>
                    <button type="submit" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-indigo-700 flex items-center gap-2">
                        <Icon name="check" weight="bold" /> Enregistrer le Flash-Test
                    </button>
                </div>

                <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                    {/* Infos de base */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Titre du Flash-Test</label>
                            <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-lg outline-none focus:border-indigo-500" placeholder="Ex: Questions Flash n°4" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Date</label>
                            <input required type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-lg outline-none focus:border-indigo-500" />
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

                    {/* Thèmes abordés */}
                    <div className="border-t border-slate-100 pt-6">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Questions abordées (Thèmes des images)</label>
                        <div className="grid md:grid-cols-2 gap-6">

                            {/* Catalogue des Thèmes */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <h4 className="text-sm font-bold text-slate-700 mb-3">Thèmes disponibles dans la banque</h4>
                                <div className="flex flex-wrap gap-2">
                                    {availableThemes.map(theme => {
                                        const isSelected = formData.themes.includes(theme);
                                        return (
                                            <button
                                                key={theme}
                                                type="button"
                                                onClick={() => !isSelected && setFormData(prev => ({ ...prev, themes: [...prev.themes, theme] }))}
                                                disabled={isSelected}
                                                className={`px-3 py-1.5 rounded-lg font-bold text-xs border transition-colors ${isSelected ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed' : 'bg-white text-indigo-700 border-indigo-200 hover:border-indigo-500 shadow-sm'}`}
                                            >
                                                {theme} {isSelected ? '' : '+'}
                                            </button>
                                        );
                                    })}
                                    {availableThemes.length === 0 && <span className="text-xs text-slate-400 italic">Aucun thème n'existe encore dans la Banque d'Images.</span>}
                                </div>
                            </div>

                            {/* Sélection et Ordre */}
                            <div className="bg-indigo-50/50 p-4 rounded-xl border-2 border-indigo-200">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-sm font-bold text-slate-700">Questions de l'évaluation</h4>
                                    <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{formData.themes.length} sél.</span>
                                </div>
                                <div className="space-y-2">
                                    {formData.themes.length === 0 ? (
                                        <div className="text-center p-6 text-slate-400 italic text-sm border-2 border-dashed border-indigo-200 rounded-xl">Cliquez sur un thème à gauche.</div>
                                    ) : (
                                        formData.themes.map((theme, idx) => (
                                            <div key={theme} className="p-2 bg-white rounded-lg border border-indigo-200 shadow-sm flex items-center justify-between gap-3 group">
                                                <div className="flex flex-col gap-0.5 shrink-0 bg-slate-50 rounded p-0.5 border border-slate-100">
                                                    <button type="button" onClick={() => moveTheme(idx, -1)} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><Icon name="caret-up" size={14} weight="bold" /></button>
                                                    <button type="button" onClick={() => moveTheme(idx, 1)} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"><Icon name="caret-down" size={14} weight="bold" /></button>
                                                </div>
                                                <div className="flex-1 min-w-0 font-bold text-sm text-slate-700 truncate">
                                                    <span className="text-slate-400 mr-2">Q{idx + 1}.</span> {theme}
                                                </div>
                                                <button type="button" onClick={() => toggleFormTheme(theme)} className="shrink-0 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                                                    <Icon name="x" weight="bold" size={14} />
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
    // VUE 3 : GRILLE DE SAISIE (TABLEUR FLASH)
    // ========================================================================
    return (
        <div className="space-y-6 animate-in fade-in pb-12">
            <div className="flex justify-between items-center">
                <button onClick={() => setView('LIST')} className="text-slate-500 font-bold flex items-center gap-1 hover:text-indigo-600">
                    <Icon name="arrow-left" /> Retour
                </button>
                <button onClick={saveResults} disabled={savingResults} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-md hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50">
                    {savingResults ? <Icon name="spinner" className="animate-spin" /> : <Icon name="floppy-disk" weight="fill" />}
                    Enregistrer les résultats
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[82vh]">

                {/* Header d'info */}
                <div className="bg-slate-900 p-4 text-white shrink-0 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-black">{currentTest.title}</h2>
                        <div className="text-xs text-slate-400 font-mono mt-1">Classes : {currentTest.classes.join(', ')} • Date : {currentTest.date.split('-').reverse().join('/')}</div>
                    </div>
                    <div className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-4">
                        <span className="flex items-center gap-1.5"><kbd className="bg-slate-700 px-1.5 py-0.5 rounded font-mono text-xs shadow text-white">1</kbd> 🔴 Faux</span>
                        <span className="flex items-center gap-1.5"><kbd className="bg-slate-700 px-1.5 py-0.5 rounded font-mono text-xs shadow text-white">2</kbd> 🟢 Juste</span>
                        <span className="border-l border-slate-600 pl-4 flex items-center gap-1.5 text-indigo-300"><kbd className="bg-slate-700 px-1.5 py-0.5 rounded font-mono text-xs shadow text-white">Tab ↹</kbd> Suivant</span>
                    </div>
                </div>

                {/* Le Tableau Compact */}
                <div className="overflow-auto flex-1 custom-scrollbar bg-slate-50">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th className="p-2 px-3 border-b-2 border-r border-slate-200 font-black text-slate-700 min-w-[150px] sticky left-0 bg-white z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] text-xs">
                                    Élève ({evalStudents.length})
                                </th>
                                {currentTest.themes.map((theme, idx) => (
                                    <th key={theme} className="p-2 border-b-2 border-r border-slate-200 text-center min-w-[100px] max-w-[120px]">
                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Question {idx + 1}</div>
                                        <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded inline-block truncate max-w-full" title={theme}>{theme}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {evalStudents.map((student, sIdx) => {
                                const stData = results[student.id] || {};
                                return (
                                    <tr key={student.id} className="border-b border-slate-100 hover:bg-indigo-50/30 transition-colors">
                                        <td className="py-1.5 px-3 border-r border-slate-200 font-bold text-slate-800 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] text-xs">
                                            <div className="truncate max-w-[150px]" title={student.nom}>{student.nom}</div>
                                        </td>

                                        {currentTest.themes.map((theme, cIdx) => {
                                            const val = stData[theme] || "";
                                            return (
                                                <td key={theme} className="p-1 border-r border-slate-200 text-center relative group">
                                                    <input
                                                        type="text"
                                                        value={val}
                                                        onChange={e => handleResultChange(student.id, theme, e.target.value)}
                                                        className={`w-6 h-6 rounded-full text-center font-bold text-xs outline-none transition-all cursor-pointer focus:ring-4 focus:ring-indigo-200 border-2 mx-auto block caret-transparent ${getDotStyle(val)}`}
                                                        placeholder="·"
                                                        tabIndex={sIdx * 100 + cIdx + 1}
                                                    />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                            {evalStudents.length === 0 && (
                                <tr>
                                    <td colSpan={currentTest.themes.length + 1} className="p-8 text-center text-slate-400 italic">
                                        Aucun élève trouvé pour ces classes.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <p className="text-center text-xs text-slate-400 font-medium">Les pourcentages de réussite par élève et par thème se calculeront automatiquement à l'enregistrement.</p>
        </div>
    );
}