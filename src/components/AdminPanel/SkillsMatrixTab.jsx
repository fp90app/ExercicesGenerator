import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, getDocs, doc, setDoc, getDoc, writeBatch, increment } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Icon } from '../UI';
import { generateSkillsPDF } from '../../utils/pdfGenerator';
import { SCHOOL_LEVELS, DOMAIN_COLORS, GRANDES_COMPETENCES } from '../../utils/constants';

// --- COMPOSANT SÉCURISÉ POUR L'ÉDITION DE LA DATE ---
const HistoryRow = ({ ev, originalIndex, getDotColorClass, handleEditHistoryDate, handleDeleteEval }) => {
    const [localDate, setLocalDate] = useState(ev.date);
    useEffect(() => { setLocalDate(ev.date); }, [ev.date]);
    return (
        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100 group">
            <input
                type="date"
                value={localDate}
                onChange={(e) => setLocalDate(e.target.value)}
                onBlur={() => { if (localDate !== ev.date) handleEditHistoryDate(originalIndex, localDate); }}
                className="text-slate-600 font-mono text-xs font-bold bg-transparent outline-none border-b border-dashed border-slate-300 focus:border-indigo-500 cursor-pointer w-[120px]"
                title="Modifier la date"
            />
            <div className="flex items-center gap-4">
                <div className={`w-3.5 h-3.5 rounded-full border shadow-sm ${getDotColorClass(ev.note)}`}></div>
                <button
                    onClick={() => handleDeleteEval(originalIndex)}
                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Supprimer cette évaluation"
                >
                    <Icon name="trash" size={14} weight="bold" />
                </button>
            </div>
        </div>
    );
};

export default function SkillsMatrixTab() {
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [competences, setCompetences] = useState([]);
    const [matrixData, setMatrixData] = useState({});

    // --- CONFIGURATION XP ---
    const [xpConfig, setXpConfig] = useState({
        competenceNiveau2: 5,
        competenceNiveau3: 15,
        competenceNiveau4: 25
    });

    // --- GESTION DES NIVEAUX ET CONFIG CHAPITRES ---
    const [selectedLevel, setSelectedLevel] = useState('6ème');
    const [visibilityConfig, setVisibilityConfig] = useState({});
    const [chapitresDetails, setChapitresDetails] = useState({});

    // --- FILTRES DE LA GRILLE ---
    const [filterTrimestre, setFilterTrimestre] = useState('ALL');
    const [filterChapitre, setFilterChapitre] = useState('ALL');
    const [filterType, setFilterType] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterGrandeComp, setFilterGrandeComp] = useState('ALL');
    const [hiddenStudents, setHiddenStudents] = useState([]);

    // --- SLIDER POINTS CRITIQUES ---
    const [criticalThreshold, setCriticalThreshold] = useState(50);

    // --- DATE PAR DÉFAUT (Clic Gauche) ---
    const [defaultDate, setDefaultDate] = useState(new Date().toISOString().split('T')[0]);

    // --- MODALES ---
    const [selectedCell, setSelectedCell] = useState(null);
    const [evalDate, setEvalDate] = useState(new Date().toISOString().split('T')[0]);
    const [bulkEditSkill, setBulkEditSkill] = useState(null);
    const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0]);
    const [bulkSelectedStudents, setBulkSelectedStudents] = useState([]);

    // --- MODALE D'IMPRESSION ---
    const [printConfig, setPrintConfig] = useState(null);

    // --- 1. CHARGEMENT DES DONNÉES ---
    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const configSnap = await getDoc(doc(db, "config", "skills"));
            if (configSnap.exists()) {
                const data = configSnap.data();
                setVisibilityConfig(data.visibleChapters || {});
                setChapitresDetails(data.chapitresDetails || {});
            }

            const configXpSnap = await getDoc(doc(db, "config", "xp"));
            if (configXpSnap.exists()) {
                setXpConfig(prev => ({ ...prev, ...configXpSnap.data() }));
            }

            const compSnap = await getDocs(collection(db, "competences"));
            let comps = compSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            comps.sort((a, b) => a.chapitre - b.chapitre || (a.code || a.id).localeCompare(b.code || b.id));
            setCompetences(comps);

            const stuSnap = await getDocs(collection(db, "eleves"));
            let stus = stuSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            stus.sort((a, b) => (a.nom || "").localeCompare(b.nom || ""));
            setStudents(stus);

            const newMatrix = {};
            await Promise.all(stus.map(async (student) => {
                const studentData = {};
                const evalSnap = await getDocs(collection(db, `eleves/${student.id}/suivi_competences`));
                evalSnap.forEach(d => {
                    studentData[d.id] = d.data();
                });
                newMatrix[student.id] = studentData;
            }));
            setMatrixData(newMatrix);
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors du chargement des données.");
        } finally {
            setLoading(false);
        }
    };

    // --- 2. LOGIQUE D'EXPÉRIENCE (XP) ---
    const getXpValue = (bilan) => {
        if (bilan === '🟢') return Number(xpConfig.competenceNiveau4) || 25;
        if (bilan === '🟩') return Number(xpConfig.competenceNiveau3) || 15;
        if (bilan === '🟨') return Number(xpConfig.competenceNiveau2) || 5;
        return 0;
    };

    const updateStudentExp = async (studentId, xpDiff) => {
        if (xpDiff === 0) return;
        try {
            const stuRef = doc(db, 'eleves', studentId);
            await setDoc(stuRef, { exp: increment(xpDiff) }, { merge: true });
        } catch (e) {
            console.error("Erreur de mise à jour XP", e);
        }
    };

    // --- 3. LOGIQUE DE PÉREMPTION DOUCE ---
    const isSkillExpired = (evalData, validiteMois) => {
        if (!evalData || !evalData.derniereEval) return false;
        if (evalData.bilan === '🔴' || evalData.bilan === '⚪') return false;
        const evalDateObj = new Date(evalData.derniereEval);
        const now = new Date();
        const diffMonths = Math.abs(now - evalDateObj) / (1000 * 60 * 60 * 24 * 30.44);
        return diffMonths > (validiteMois || 3);
    };

    // --- 4. GESTION DE LA VISIBILITÉ ET TRIMESTRES ---
    const toggleChapterVisibility = async (chapNum) => {
        const currentLvlVisible = visibilityConfig[selectedLevel] || [];
        let newLvlVisible;
        if (currentLvlVisible.includes(chapNum)) {
            newLvlVisible = currentLvlVisible.filter(c => c !== chapNum);
        } else {
            newLvlVisible = [...currentLvlVisible, chapNum];
        }
        const newConfig = { ...visibilityConfig, [selectedLevel]: newLvlVisible };
        setVisibilityConfig(newConfig);
        try {
            await setDoc(doc(db, "config", "skills"), { visibleChapters: newConfig }, { merge: true });
            toast.success(`Visibilité mise à jour`);
        } catch (e) {
            toast.error("Erreur de sauvegarde");
        }
    };

    const updateChapterTrimestre = async (chapNum, newTrim) => {
        const chapKey = `${selectedLevel}_${chapNum}`;
        const newDetails = {
            ...chapitresDetails,
            [chapKey]: {
                ...(chapitresDetails[chapKey] || {}),
                trimestre: newTrim
            }
        };
        setChapitresDetails(newDetails);
        try {
            await setDoc(doc(db, "config", "skills"), { chapitresDetails: newDetails }, { merge: true });
            toast.success(`Chapitre assigné au Trimestre ${newTrim === 'ALL' ? 'Toute l\'année' : newTrim}`);
        } catch (e) {
            toast.error("Erreur de sauvegarde");
        }
    };

    const toggleStudent = (stuId) => {
        if (hiddenStudents.includes(stuId)) setHiddenStudents(hiddenStudents.filter(id => id !== stuId));
        else setHiddenStudents([...hiddenStudents, stuId]);
    };

    // --- 5. CLICS SUR LES POINTS ---
    const recalculateBilan = (evals) => {
        const validEvals = evals.filter(e => e.note !== '⚪');
        if (validEvals.length === 0) return { bilan: '⚪', derniereEval: null };
        validEvals.sort((a, b) => new Date(a.date) - new Date(b.date));
        const latest = validEvals[validEvals.length - 1];
        return { bilan: latest.note, derniereEval: latest.date };
    };

    const handleDotClick = async (e, studentId, compId, index, currentData) => {
        e.stopPropagation();
        const sequence = ['⚪', '🔴', '🟨', '🟩', '🟢'];
        let evals = [...(currentData?.evaluations || [])];
        const oldBilan = currentData?.bilan || '⚪';

        if (index < evals.length) {
            const curr = evals[index].note;
            evals[index].note = sequence[(sequence.indexOf(curr) + 1) % sequence.length];
            if (!evals[index].date) evals[index].date = defaultDate;
        } else {
            for (let i = evals.length; i <= index; i++) {
                evals.push({ date: defaultDate, note: i === index ? '🔴' : '⚪' });
            }
        }

        const { bilan, derniereEval } = recalculateBilan(evals);
        const xpDiff = getXpValue(bilan) - getXpValue(oldBilan);

        const newData = {
            competenceId: compId,
            bilan,
            derniereEval,
            evaluations: evals,
            cible: false,
            enAttente: false
        };

        saveDataToFirebase(studentId, compId, newData, false);
        if (xpDiff !== 0) updateStudentExp(studentId, xpDiff);
    };

    const handleDotRightClick = async (e, studentId, compId, currentData, comp) => {
        e.preventDefault();
        e.stopPropagation();
        let initDate = defaultDate;
        if (currentData?.evaluations && currentData.evaluations.length > 0) {
            const lastEv = currentData.evaluations[currentData.evaluations.length - 1];
            if (lastEv.date) initDate = lastEv.date;
        }
        setEvalDate(initDate);
        setSelectedCell({ student: students.find(s => s.id === studentId), comp, currentData });
    };

    // --- 6. MODALE INDIVIDUELLE ---
    const handleSaveEvaluation = async (noteEmoji) => {
        if (!selectedCell) return;
        const { student, comp, currentData } = selectedCell;
        const oldBilan = currentData?.bilan || '⚪';
        const newEval = { date: evalDate, note: noteEmoji };
        let allEvals = [...(currentData?.evaluations || [])];

        const existingIndex = allEvals.findIndex(e => e.date === evalDate);
        if (existingIndex >= 0) allEvals[existingIndex] = newEval;
        else allEvals.push(newEval);

        allEvals.sort((a, b) => new Date(a.date) - new Date(b.date));
        const latest = allEvals[allEvals.length - 1];
        const newBilan = latest.note;
        const xpDiff = getXpValue(newBilan) - getXpValue(oldBilan);

        const newData = {
            competenceId: comp.id,
            bilan: newBilan,
            derniereEval: latest.date,
            evaluations: allEvals,
            cible: false,
            enAttente: false
        };

        saveDataToFirebase(student.id, comp.id, newData, true);
        if (xpDiff !== 0) updateStudentExp(student.id, xpDiff);
        setSelectedCell(null);
    };

    const handleEditHistoryDate = async (indexToEdit, newDate) => {
        if (!newDate) return;
        const { student, comp, currentData } = selectedCell;
        const oldBilan = currentData?.bilan || '⚪';
        let allEvals = [...(currentData.evaluations || [])];
        if (allEvals[indexToEdit].date === newDate) return;

        allEvals[indexToEdit].date = newDate;
        allEvals.sort((a, b) => new Date(a.date) - new Date(b.date));

        const latest = allEvals[allEvals.length - 1];
        const newBilan = latest.note;
        const xpDiff = getXpValue(newBilan) - getXpValue(oldBilan);

        const newData = {
            ...currentData,
            competenceId: comp.id,
            bilan: newBilan,
            derniereEval: latest.date,
            evaluations: allEvals
        };

        saveDataToFirebase(student.id, comp.id, newData, false);
        if (xpDiff !== 0) updateStudentExp(student.id, xpDiff);
        setSelectedCell({ ...selectedCell, currentData: newData });
    };

    const handleDeleteEval = async (indexToDelete) => {
        const { student, comp, currentData } = selectedCell;
        const oldBilan = currentData?.bilan || '⚪';
        let allEvals = [...currentData.evaluations];
        allEvals.splice(indexToDelete, 1);

        let newData = {
            ...currentData,
            competenceId: comp.id,
            evaluations: allEvals
        };

        if (allEvals.length > 0) {
            const latest = allEvals[allEvals.length - 1];
            newData.bilan = latest.note;
            newData.derniereEval = latest.date;
        } else {
            newData.bilan = '⚪';
            newData.derniereEval = null;
        }

        const xpDiff = getXpValue(newData.bilan) - getXpValue(oldBilan);
        saveDataToFirebase(student.id, comp.id, newData, true);
        if (xpDiff !== 0) updateStudentExp(student.id, xpDiff);
        setSelectedCell({ ...selectedCell, currentData: newData });
    };

    const toggleCible = () => {
        const { student, comp, currentData } = selectedCell;
        const isCurrentlyCibled = currentData?.cible === true;
        const newData = {
            ...(currentData || {}),
            competenceId: comp.id,
            cible: !isCurrentlyCibled
        };
        saveDataToFirebase(student.id, comp.id, newData, false);
        setSelectedCell({ ...selectedCell, currentData: newData });
        toast.success(isCurrentlyCibled ? "Ciblage retiré" : "Compétence ciblée !");
    };

    const saveDataToFirebase = async (studentId, compId, newData, showToast = false) => {
        try {
            await setDoc(doc(db, `eleves/${studentId}/suivi_competences/${compId}`), newData);
            setMatrixData(prev => ({
                ...prev,
                [studentId]: { ...prev[studentId], [compId]: newData }
            }));
            if (showToast) toast.success(`Mise à jour effectuée`);
        } catch (error) {
            toast.error("Erreur de sauvegarde");
        }
    };

    // --- 7. ÉDITION PAR LOTS (BULK EDIT AVEC XP) ---
    const openBulkEdit = (comp) => {
        setBulkEditSkill(comp);
        setBulkDate(defaultDate);
        setBulkSelectedStudents([]);
    };

    const toggleBulkStudent = (studentId) => {
        if (bulkSelectedStudents.includes(studentId)) {
            setBulkSelectedStudents(bulkSelectedStudents.filter(id => id !== studentId));
        } else {
            setBulkSelectedStudents([...bulkSelectedStudents, studentId]);
        }
    };

    const selectAllBulkStudents = () => {
        const levelDigit = selectedLevel.charAt(0);
        const studs = students.filter(s => {
            const matchLevel = s.niveau ? s.niveau === selectedLevel : (s.classe && s.classe.includes(levelDigit));
            return matchLevel && !hiddenStudents.includes(s.id);
        });
        setBulkSelectedStudents(studs.map(s => s.id));
    };

    const handleBulkSave = async (noteEmoji) => {
        if (bulkSelectedStudents.length === 0) return toast.error("Sélectionnez au moins un élève.");
        const loadingToast = toast.loading("Évaluation en cours...");

        try {
            const batch = writeBatch(db);
            const newMatrixCopy = { ...matrixData };

            for (const studentId of bulkSelectedStudents) {
                const currentData = matrixData[studentId]?.[bulkEditSkill.id] || {};
                const oldBilan = currentData.bilan || '⚪';
                const newEval = { date: bulkDate, note: noteEmoji };

                let allEvals = [...(currentData.evaluations || [])];
                const existingIndex = allEvals.findIndex(e => e.date === bulkDate);
                if (existingIndex >= 0) allEvals[existingIndex] = newEval;
                else allEvals.push(newEval);

                allEvals.sort((a, b) => new Date(a.date) - new Date(b.date));
                const latest = allEvals[allEvals.length - 1];
                const newBilan = latest.note;
                const xpDiff = getXpValue(newBilan) - getXpValue(oldBilan);

                const newData = {
                    competenceId: bulkEditSkill.id,
                    bilan: newBilan,
                    derniereEval: latest.date,
                    evaluations: allEvals,
                    cible: false,
                    enAttente: false
                };

                const docRef = doc(db, `eleves/${studentId}/suivi_competences/${bulkEditSkill.id}`);
                batch.set(docRef, newData);

                if (xpDiff !== 0) {
                    const stuRef = doc(db, `eleves/${studentId}`);
                    batch.set(stuRef, { exp: increment(xpDiff) }, { merge: true });
                }

                newMatrixCopy[studentId] = { ...newMatrixCopy[studentId], [bulkEditSkill.id]: newData };
            }

            await batch.commit();
            setMatrixData(newMatrixCopy);
            toast.success(`${bulkSelectedStudents.length} élèves évalués !`, { id: loadingToast });
            setBulkEditSkill(null);
        } catch (error) {
            toast.error("Erreur lors de l'évaluation par lots", { id: loadingToast });
        }
    };

    // --- 8. CODES COULEURS ET RENDU ---
    const getDotColorClass = (emoji) => {
        if (emoji === '🔴') return 'bg-red-500 border-red-600';
        if (emoji === '🟨') return 'bg-amber-400 border-amber-500';
        if (emoji === '🟩') return 'bg-emerald-400 border-emerald-500';
        if (emoji === '🟢') return 'bg-emerald-700 border-emerald-800';
        return 'bg-white border-slate-300';
    };

    const getCellBgClass = (emoji, isCibled, isWaiting) => {
        let base = 'bg-slate-50/50 hover:bg-slate-100';
        if (emoji === '🔴') base = 'bg-red-50 hover:bg-red-100';
        if (emoji === '🟨') base = 'bg-amber-50 hover:bg-amber-100';
        if (emoji === '🟩') base = 'bg-emerald-50 hover:bg-emerald-100';
        if (emoji === '🟢') base = 'bg-emerald-100 hover:bg-emerald-200';

        if (isCibled) base += ' ring-2 ring-inset ring-indigo-500';
        else if (isWaiting) base += ' ring-2 ring-inset ring-amber-500';

        return base;
    };

    // --- 9. FILTRAGE ET STATISTIQUES ---
    const levelDigit = selectedLevel.charAt(0);
    const filteredStudents = students.filter(s => {
        if (s.niveau) return s.niveau === selectedLevel;
        return s.classe && s.classe.includes(levelDigit);
    });

    const visibleStudents = filteredStudents.filter(s => !hiddenStudents.includes(s.id));
    const levelComps = competences.filter(c => (c.niveau || '6ème') === selectedLevel);
    const allChapitresDispos = [...new Set(levelComps.map(c => c.chapitre))].sort((a, b) => a - b);

    const finalComps = levelComps.filter(c => {
        if (filterTrimestre !== 'ALL') {
            const chapKey = `${selectedLevel}_${c.chapitre}`;
            const chapTrimestre = String(chapitresDetails[chapKey]?.trimestre || '1');
            if (chapTrimestre !== 'ALL' && chapTrimestre !== String(filterTrimestre)) return false;
        }
        if (filterChapitre !== 'ALL' && String(c.chapitre) !== filterChapitre) return false;
        if (filterType !== 'ALL' && c.type !== filterType) return false;
        if (filterGrandeComp !== 'ALL') {
            if (!c.grandesCompetences || !c.grandesCompetences.includes(filterGrandeComp)) return false;
        }
        return true;
    });

    const filteredChapitresDispos = [...new Set(finalComps.map(c => c.chapitre))].sort((a, b) => a - b);

    let classScore = 0;
    const criticalSkills = [];

    if (visibleStudents.length > 0) {
        finalComps.forEach(comp => {
            let redCount = 0;
            visibleStudents.forEach(stu => {
                const cData = matrixData[stu.id]?.[comp.id];
                const bilan = cData?.bilan || '⚪';
                if (bilan === '🟨') classScore += 1;
                if (bilan === '🟩') classScore += 3;
                if (bilan === '🟢') classScore += 5;
                if (bilan === '🔴') redCount++;
            });

            if (redCount > 0 && (redCount / visibleStudents.length) >= (criticalThreshold / 100)) {
                criticalSkills.push(comp);
            }
        });
    }

    // --- 10. IMPRESSION (INDIVIDUELLE, CLASSE, GRILLE) ---
    const openPrintModal = (mode, student = null) => {
        setPrintConfig({
            mode,
            student,
            layout: 'DOMAIN',
            selectedChapters: [...filteredChapitresDispos]
        });
    };

    const togglePrintChapter = (ch) => {
        setPrintConfig(prev => {
            const newChapters = prev.selectedChapters.includes(ch)
                ? prev.selectedChapters.filter(x => x !== ch)
                : [...prev.selectedChapters, ch];
            return { ...prev, selectedChapters: newChapters };
        });
    };

    const toggleAllPrintChapters = (activate) => {
        setPrintConfig(prev => ({
            ...prev,
            selectedChapters: activate ? [...filteredChapitresDispos] : []
        }));
    };

    // Fait appel à notre fonction externe de génération de PDF
    const handleGeneratePDF = () => {
        const success = generateSkillsPDF({
            printConfig,
            levelComps,
            visibleStudents,
            matrixData,
            chapitresDetails,
            selectedLevel
        });

        if (success) {
            setPrintConfig(null);
        }
    };

    if (loading) return <div className="p-10 text-center text-slate-400 font-bold"><Icon name="spinner" className="animate-spin text-2xl mb-2" /> Chargement de la matrice...</div>;

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* SÉLECTEUR DE NIVEAU */}
            <div className="flex gap-2 border-b border-slate-200 pb-4">
                {SCHOOL_LEVELS.map(lvl => (
                    <button
                        key={lvl}
                        onClick={() => setSelectedLevel(lvl)}
                        className={`px-6 py-2.5 rounded-lg font-bold transition-all ${selectedLevel === lvl ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                    >
                        {lvl}
                    </button>
                ))}
            </div>

            {/* RADAR DE LA CLASSE */}
            <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                    <Icon name="users" className="absolute -right-4 -bottom-4 text-9xl opacity-10" weight="fill" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-indigo-200 mb-1">Coopération</h3>
                    <div className="text-3xl font-black">{classScore} pts</div>
                    <p className="text-xs text-indigo-100 font-medium mt-1">
                        Score global de la classe. Incitez-les à s'entraider pour le faire monter ! (🟨=1, 🟩=3, 🟢=5)
                    </p>
                </div>

                {/* BLOC POINTS CRITIQUES DYNAMIQUE */}
                <div className="bg-white border border-red-200 rounded-2xl p-5 shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-2 gap-4">
                        <h3 className="text-sm font-black uppercase tracking-widest text-red-500 flex items-center gap-2 mt-1">
                            <Icon name="warning" weight="fill" /> Points Critiques
                        </h3>
                        <div className="flex flex-col items-end shrink-0">
                            <span className="text-[10px] font-bold text-slate-500 mb-1">Seuil : &gt; {criticalThreshold}% de la classe</span>
                            <input
                                type="range"
                                min="5" max="100" step="5"
                                value={criticalThreshold}
                                onChange={e => setCriticalThreshold(Number(e.target.value))}
                                className="w-24 accent-red-500 cursor-pointer"
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-auto">
                        {criticalSkills.length > 0 ? (
                            criticalSkills.map(c => (
                                <span key={c.id} className="text-xs font-bold bg-red-50 text-red-700 border border-red-200 px-2 py-1 rounded-lg">
                                    {c.code || c.id} (Ch. {c.chapitre})
                                </span>
                            ))
                        ) : (
                            <span className="text-sm font-medium text-slate-400 italic">Aucune alerte rouge globale.</span>
                        )}
                    </div>
                </div>
            </div>

            {/* BARRE DE CONTRÔLES (Date, Filtres) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200 shrink-0">
                        <Icon name="calendar" className="text-slate-500 ml-1" />
                        <span className="text-xs font-bold text-slate-500">Date clics :</span>
                        <input
                            type="date"
                            value={defaultDate}
                            onChange={e => setDefaultDate(e.target.value)}
                            className="bg-transparent text-sm font-bold text-indigo-700 outline-none cursor-pointer"
                        />
                    </div>

                    <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
                    <Icon name="funnel" className="text-slate-400" />

                    {/* Filtre Trimestre */}
                    <select value={filterTrimestre} onChange={e => setFilterTrimestre(e.target.value)} className="p-2 rounded-lg border border-slate-200 text-sm font-bold bg-white text-slate-700 outline-none focus:border-indigo-500 shadow-sm cursor-pointer">
                        <option value="ALL">Tous les trimestres</option>
                        <option value="1">Trimestre 1</option>
                        <option value="2">Trimestre 2</option>
                        <option value="3">Trimestre 3</option>
                    </select>

                    {/* Filtre Chapitre */}
                    <select value={filterChapitre} onChange={e => setFilterChapitre(e.target.value)} className="max-w-[280px] truncate p-2 rounded-lg border border-slate-200 text-sm font-bold bg-white text-slate-700 outline-none focus:border-indigo-500 shadow-sm cursor-pointer">
                        <option value="ALL">Tous chapitres</option>
                        {allChapitresDispos.map(ch => {
                            const chapKey = `${selectedLevel}_${ch}`;
                            const title = chapitresDetails[chapKey]?.titre || levelComps.find(c => c.chapitre === ch)?.chapitreNom || "";
                            return <option key={ch} value={ch}>Chapitre {ch}{title ? ` - ${title}` : ''}</option>;
                        })}
                    </select>

                    {/* Filtre Type */}
                    <select value={filterType} onChange={e => setFilterType(e.target.value)} className="p-2 rounded-lg border border-slate-200 text-sm font-bold bg-white text-slate-700 outline-none focus:border-indigo-500 shadow-sm cursor-pointer">
                        <option value="ALL">Tous types</option>
                        <option value="Technique">Technique</option>
                        <option value="Conceptuel">Conceptuel</option>
                    </select>

                    {/* Filtre Grandes Compétences */}
                    <select value={filterGrandeComp} onChange={e => setFilterGrandeComp(e.target.value)} className="p-2 rounded-lg border border-slate-200 text-sm font-bold bg-white text-slate-700 outline-none focus:border-indigo-500 shadow-sm cursor-pointer">
                        <option value="ALL">Toutes</option>
                        {GRANDES_COMPETENCES.map(gc => (
                            <option key={gc} value={gc}>{gc}</option>
                        ))}
                    </select>

                    {/* Filtre Statut */}
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="p-2 rounded-lg border border-slate-200 text-sm font-bold bg-white text-slate-700 outline-none focus:border-indigo-500 shadow-sm cursor-pointer">
                        <option value="ALL">Statut : Tous</option>
                        <option value="DANGER">Dans le rouge 🔴</option>
                        <option value="REVISE">À réévaluer ⚠️</option>
                        <option value="WAITING">En attente auto-éval ⏳</option>
                        <option value="TARGETED">Compétences ciblées 🎯</option>
                    </select>
                </div>

                {/* VISIBILITÉ ET CONFIGURATION PAR CHAPITRE */}
                <div className="pt-4 border-t border-slate-100 flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Configuration des chapitres (Visibilité & Trimestre) :</span>
                        <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                            {allChapitresDispos.map(ch => {
                                const isVis = (visibilityConfig[selectedLevel] || []).includes(ch);
                                const chapKey = `${selectedLevel}_${ch}`;
                                const trim = chapitresDetails[chapKey]?.trimestre || '1';
                                const title = chapitresDetails[chapKey]?.titre || levelComps.find(c => c.chapitre === ch)?.chapitreNom || "";

                                return (
                                    <div key={ch} className="flex flex-col border border-slate-200 rounded-lg p-2 min-w-[150px] max-w-[200px] bg-white shadow-sm shrink-0">
                                        <div className="text-[10px] font-black text-slate-700 truncate mb-2" title={`Chapitre ${ch}${title ? ` - ${title}` : ''}`}>
                                            Chap. {ch}{title ? ` - ${title}` : ''}
                                        </div>
                                        <div className="flex justify-between items-center gap-2">
                                            <button
                                                onClick={() => toggleChapterVisibility(ch)}
                                                className={`flex-1 py-1 rounded text-[10px] font-bold border transition-all flex items-center justify-center gap-1 ${isVis ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-400'}`}
                                                title={isVis ? "Masquer aux élèves" : "Afficher aux élèves"}
                                            >
                                                <Icon name={isVis ? "eye" : "eye-slash"} weight={isVis ? "bold" : "regular"} /> {isVis ? 'Visible' : 'Caché'}
                                            </button>
                                            <select
                                                value={trim}
                                                onChange={(e) => updateChapterTrimestre(ch, e.target.value)}
                                                className="text-[10px] font-bold bg-slate-50 border border-slate-200 rounded p-1 outline-none focus:border-indigo-500 cursor-pointer"
                                                title="Assigner à un trimestre"
                                            >
                                                <option value="1">T1</option>
                                                <option value="2">T2</option>
                                                <option value="3">T3</option>
                                                <option value="ALL">Année</option>
                                            </select>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">Élèves affichés :</span>
                        <button onClick={() => setHiddenStudents([])} className="px-2 py-1 text-[10px] font-bold bg-slate-800 text-white rounded">Tous les élèves</button>
                        {filteredStudents.map(s => {
                            const isHidden = hiddenStudents.includes(s.id);
                            return (
                                <button key={s.id} onClick={() => toggleStudent(s.id)} className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${isHidden ? 'bg-white text-slate-300 border-slate-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                                    {s.nom}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="text-xs text-slate-500 font-medium bg-slate-100 p-2 rounded-xl border border-slate-200 text-center">
                <span className="font-bold text-slate-700">CLIC GAUCHE :</span> Couleur (Cyclique) | <span className="font-bold text-slate-700">CLIC DROIT (Ou Long) :</span> Modale Détails & Historique Éditable
            </div>

            {/* LA GRILLE (MATRICE EN TABLEAU) */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto max-h-[700px] custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-slate-600 sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th className="p-3 font-black uppercase tracking-wider sticky left-0 bg-slate-100 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[170px]">
                                    <div className="flex items-center justify-between">
                                        <span>Élèves ({visibleStudents.length})</span>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => openPrintModal('CLASS')}
                                                className="p-1.5 bg-white rounded text-indigo-600 shadow-sm border border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                                                title="Imprimer les bilans de toute la classe"
                                            >
                                                <Icon name="files" weight="fill" />
                                            </button>
                                            <button
                                                onClick={() => openPrintModal('MATRIX')}
                                                className="p-1.5 bg-white rounded text-emerald-600 shadow-sm border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                                                title="Imprimer la grille globale pour le prof"
                                            >
                                                <Icon name="grid-four" weight="fill" />
                                            </button>
                                        </div>
                                    </div>
                                </th>
                                {finalComps.map(comp => {
                                    const cColor = DOMAIN_COLORS[comp.domaine] || 'slate';
                                    const chapKey = `${selectedLevel}_${comp.chapitre}`;
                                    const chapTitle = chapitresDetails[chapKey]?.titre || comp.chapitreNom || "";

                                    return (
                                        <th key={comp.id} className="p-3 border-l border-slate-200 min-w-[280px] max-w-[350px] align-top bg-slate-50 group">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <div className={`text-[10px] font-black text-${cColor}-700 bg-${cColor}-100 border border-${cColor}-200 rounded px-1.5 py-0.5`}>
                                                        {comp.code || comp.id}
                                                    </div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[180px]" title={`Chapitre ${comp.chapitre}${chapTitle ? ` - ${chapTitle}` : ''}`}>
                                                        Chap. {comp.chapitre}{chapTitle ? ` - ${chapTitle}` : ''}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => openBulkEdit(comp)}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                                    title="Évaluer tous les élèves pour cette compétence"
                                                >
                                                    <Icon name="magic-wand" weight="bold" />
                                                </button>
                                            </div>
                                            <div className="text-xs font-bold text-slate-700 leading-tight">
                                                {comp.intitule}
                                                {comp.grandesCompetences && comp.grandesCompetences.length > 0 && (
                                                    <div className="flex gap-1 flex-wrap mt-1">
                                                        {comp.grandesCompetences.map(gc => (
                                                            <span key={gc} title={gc} className="px-1.5 py-0.5 rounded text-[9px] font-black bg-slate-200 text-slate-600 uppercase tracking-widest">
                                                                {gc}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {visibleStudents.map((student, idx) => (
                                <tr key={student.id} className="border-t border-slate-100 group hover:bg-slate-50">
                                    <td className={`p-3 font-bold text-slate-800 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] bg-white group-hover:bg-slate-50`}>
                                        <div className="flex items-center justify-between">
                                            <span className="truncate max-w-[130px]" title={student.nom}>{student.nom}</span>
                                            <button
                                                onClick={() => openPrintModal('INDIVIDUAL', student)}
                                                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 p-1 bg-slate-100 hover:bg-indigo-50 rounded transition-all"
                                                title="Imprimer le bilan de cet élève"
                                            >
                                                <Icon name="printer" weight="fill" />
                                            </button>
                                        </div>
                                    </td>
                                    {finalComps.map(comp => {
                                        const cData = matrixData[student.id]?.[comp.id];
                                        const isExp = isSkillExpired(cData, comp.validiteMois);
                                        const isCibled = cData?.cible === true;
                                        const isWaiting = cData?.enAttente === true;
                                        const currentBilan = cData?.bilan || '⚪';

                                        let isFaded = false;
                                        if (filterStatus === 'DANGER' && currentBilan !== '🔴') isFaded = true;
                                        if (filterStatus === 'REVISE' && !isExp) isFaded = true;
                                        if (filterStatus === 'WAITING' && !isWaiting) isFaded = true;
                                        if (filterStatus === 'TARGETED' && !isCibled) isFaded = true;

                                        const cellBg = getCellBgClass(currentBilan, isCibled, isWaiting);
                                        const evals = cData?.evaluations || [];
                                        const totalDots = Math.max(3, evals.length + (evals.length > 0 && evals[evals.length - 1].note !== '⚪' ? 1 : 0));

                                        const dotsArray = [];
                                        for (let i = 0; i < totalDots; i++) {
                                            dotsArray.push({ note: evals[i]?.note || '⚪', date: evals[i]?.date || null });
                                        }

                                        return (
                                            <td
                                                key={comp.id}
                                                className={`border-l border-slate-200 p-3 relative align-middle transition-all cursor-pointer ${cellBg} ${isFaded ? 'opacity-20 grayscale' : 'opacity-100'}`}
                                                onContextMenu={(e) => handleDotRightClick(e, student.id, comp.id, cData, comp)}
                                            >
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {dotsArray.map((dot, i) => (
                                                            <button
                                                                key={i}
                                                                onClick={(e) => handleDotClick(e, student.id, comp.id, i, cData)}
                                                                className={`w-4 h-4 rounded-full border shadow-sm transition-transform hover:scale-125 focus:outline-none ${getDotColorClass(dot.note)}`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {isExp && <span className="text-[10px] font-bold text-slate-400 bg-white/60 border border-slate-200 px-1 py-0.5 rounded shadow-sm" title="À réévaluer">À réévaluer</span>}
                                                        {isWaiting && <span className="text-sm" title="Élève en attente de validation">⏳</span>}
                                                        {isCibled && <span className="text-sm" title="Compétence ciblée par vous">🎯</span>}
                                                    </div>
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                            {visibleStudents.length === 0 && (
                                <tr>
                                    <td colSpan={finalComps.length + 1} className="p-8 text-center text-slate-400 italic">
                                        Aucun élève à afficher.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- MODALE DE CONFIGURATION IMPRESSION --- */}
            {printConfig && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setPrintConfig(null)}>
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="bg-indigo-600 p-6 text-white shrink-0 relative">
                            <h3 className="text-xl font-black flex items-center gap-2 mb-1">
                                <Icon name="printer" weight="fill" />
                                {printConfig.mode === 'INDIVIDUAL' && "Impression Bilan Élève"}
                                {printConfig.mode === 'CLASS' && "Impression Bilans Classe"}
                                {printConfig.mode === 'MATRIX' && "Impression Grille Professeur"}
                            </h3>
                            <div className="text-sm font-bold text-indigo-200 leading-tight">
                                {printConfig.mode === 'INDIVIDUAL' && `Élève : ${printConfig.student.nom}`}
                                {printConfig.mode === 'CLASS' && `${visibleStudents.length} élèves sélectionnés`}
                                {printConfig.mode === 'MATRIX' && `Vue d'ensemble de la classe`}
                            </div>
                        </div>

                        <div className="p-6">
                            {/* Choix de la disposition (Uniquement pour les bilans) */}
                            {printConfig.mode !== 'MATRIX' && (
                                <div className="mb-6">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Mise en page</label>
                                    <div className="flex gap-3">
                                        <label className={`flex-1 p-3 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition-all ${printConfig.layout === 'DOMAIN' ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}>
                                            <input type="radio" name="layout" className="hidden" checked={printConfig.layout === 'DOMAIN'} onChange={() => setPrintConfig({ ...printConfig, layout: 'DOMAIN' })} />
                                            <Icon name="shapes" className="text-xl" weight={printConfig.layout === 'DOMAIN' ? "fill" : "regular"} />
                                            <span className="font-bold text-sm">Classé par Domaine</span>
                                        </label>
                                        <label className={`flex-1 p-3 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition-all ${printConfig.layout === 'CHAPTER' ? 'border-indigo-500 bg-indigo-50 text-indigo-800' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}>
                                            <input type="radio" name="layout" className="hidden" checked={printConfig.layout === 'CHAPTER'} onChange={() => setPrintConfig({ ...printConfig, layout: 'CHAPTER' })} />
                                            <Icon name="book-open" className="text-xl" weight={printConfig.layout === 'CHAPTER' ? "fill" : "regular"} />
                                            <span className="font-bold text-sm">Classé par Chapitre</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Choix des chapitres */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Chapitres à inclure</label>
                                    <div className="flex gap-2">
                                        <button onClick={() => toggleAllPrintChapters(true)} className="text-[10px] font-bold text-indigo-600 hover:underline">Tout cocher</button>
                                        <button onClick={() => toggleAllPrintChapters(false)} className="text-[10px] font-bold text-slate-400 hover:underline">Tout décocher</button>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-48 overflow-y-auto grid grid-cols-2 gap-2">
                                    {filteredChapitresDispos.map(ch => {
                                        const chapKey = `${selectedLevel}_${ch}`;
                                        const title = chapitresDetails[chapKey]?.titre || levelComps.find(c => c.chapitre === ch)?.chapitreNom || "";
                                        return (
                                            <label key={ch} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-slate-100 rounded" title={`Chap. ${ch}${title ? ` - ${title}` : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                                                    checked={printConfig.selectedChapters.includes(ch)}
                                                    onChange={() => togglePrintChapter(ch)}
                                                />
                                                <span className="text-sm font-bold text-slate-700 truncate">Chap. {ch}{title ? ` - ${title}` : ''}</span>
                                            </label>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-100 p-4 border-t border-slate-200 flex justify-end gap-3 shrink-0">
                            <button onClick={() => setPrintConfig(null)} className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors">
                                Annuler
                            </button>
                            <button onClick={handleGeneratePDF} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:scale-105 transition-transform flex items-center gap-2 shadow-md">
                                <Icon name="check-circle" weight="fill" /> Générer PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODALE D'ÉVALUATION PAR LOTS (BULK EDIT) --- */}
            {bulkEditSkill && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setBulkEditSkill(null)}>
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="bg-indigo-600 p-6 text-white shrink-0 relative">
                            <h3 className="text-xl font-black flex items-center gap-2 mb-2">
                                <Icon name="magic-wand" /> Évaluation par lots
                            </h3>
                            <div className="text-sm font-bold text-indigo-200 leading-tight">
                                {bulkEditSkill.code || bulkEditSkill.id} - {bulkEditSkill.intitule}
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-3">1. Sélectionner les élèves :</p>
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-40 overflow-y-auto mb-6">
                                <button onClick={selectAllBulkStudents} className="text-xs font-bold text-indigo-600 mb-2 hover:underline">
                                    Tout cocher
                                </button>
                                <div className="grid grid-cols-2 gap-2">
                                    {visibleStudents.map(stu => (
                                        <label key={stu.id} className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer hover:bg-slate-100 p-1 rounded">
                                            <input
                                                type="checkbox"
                                                checked={bulkSelectedStudents.includes(stu.id)}
                                                onChange={() => toggleBulkStudent(stu.id)}
                                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                            />
                                            <span className="truncate">{stu.nom}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <p className="text-xs font-bold text-slate-500 uppercase mb-3">2. Choisir la date :</p>
                            <input
                                type="date"
                                value={bulkDate}
                                onChange={e => setBulkDate(e.target.value)}
                                className="w-full p-3 mb-6 border-2 border-slate-200 rounded-xl font-bold text-indigo-700 outline-none focus:border-indigo-500"
                            />

                            <p className="text-xs font-bold text-slate-500 uppercase mb-3">3. Appliquer la note à tous :</p>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => handleBulkSave('🔴')} className="p-3 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 transition-colors flex items-center justify-center gap-2 font-bold text-red-800 text-sm">
                                    <div className="w-4 h-4 rounded-full bg-red-500"></div> Non acquis
                                </button>
                                <button onClick={() => handleBulkSave('🟨')} className="p-3 rounded-xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors flex items-center justify-center gap-2 font-bold text-amber-800 text-sm">
                                    <div className="w-4 h-4 rounded-full bg-amber-400"></div> En cours d'acquisition
                                </button>
                                <button onClick={() => handleBulkSave('🟩')} className="p-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 font-bold text-emerald-800 text-sm">
                                    <div className="w-4 h-4 rounded-full bg-emerald-400"></div> Acquis
                                </button>
                                <button onClick={() => handleBulkSave('🟢')} className="p-3 rounded-xl border-2 border-emerald-600 bg-emerald-100 hover:bg-emerald-200 transition-colors flex items-center justify-center gap-2 font-bold text-emerald-900 text-sm">
                                    <div className="w-4 h-4 rounded-full bg-emerald-700"></div> Niveau dépassé
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-100 p-4 shrink-0 flex justify-end">
                            <button onClick={() => setBulkEditSkill(null)} className="px-5 py-2 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors">
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL D'ÉVALUATION INDIVIDUELLE --- */}
            {selectedCell && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setSelectedCell(null)}>
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

                        <div className="bg-slate-900 p-6 text-white relative">
                            <button onClick={() => setSelectedCell(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                                <Icon name="x" size={20} />
                            </button>
                            <div className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-1">{selectedCell.student.nom}</div>
                            <h3 className="text-lg font-black leading-tight">{selectedCell.comp.intitule}</h3>
                            <div className="flex gap-2 mt-3">
                                <span className="bg-white/20 px-2 py-1 rounded text-[10px] font-black">{selectedCell.comp.code || selectedCell.comp.id}</span>
                                <span className="bg-white/20 px-2 py-1 rounded text-[10px] font-bold">{selectedCell.comp.type}</span>
                            </div>
                        </div>

                        <div className="p-6">
                            {/* BOUTON CIBLAGE */}
                            <button
                                onClick={toggleCible}
                                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 mb-6 border-2 transition-all ${selectedCell.currentData?.cible ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-500'}`}
                            >
                                <Icon name="target" weight={selectedCell.currentData?.cible ? "fill" : "regular"} className="text-lg" />
                                {selectedCell.currentData?.cible ? "Compétence actuellement ciblée" : "Cibler cette compétence pour cet élève"}
                            </button>

                            <div className="flex justify-between items-center mb-4">
                                <label className="text-xs font-bold text-slate-500 uppercase">Nouvelle évaluation</label>
                                <input
                                    type="date"
                                    value={evalDate}
                                    onChange={e => setEvalDate(e.target.value)}
                                    className="p-2 border-2 border-slate-200 rounded-lg text-sm font-bold text-indigo-700 outline-none focus:border-indigo-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <button onClick={() => handleSaveEvaluation('🔴')} className="p-3 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 hover:scale-105 transition-all flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full bg-red-500 border border-red-600 shadow-sm shrink-0"></div>
                                    <span className="font-bold text-red-800 text-xs">Non acquis</span>
                                </button>
                                <button onClick={() => handleSaveEvaluation('🟨')} className="p-3 rounded-xl border-2 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:scale-105 transition-all flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full bg-amber-400 border border-amber-500 shadow-sm shrink-0"></div>
                                    <span className="font-bold text-amber-800 text-xs">En cours d'acquisition</span>
                                </button>
                                <button onClick={() => handleSaveEvaluation('🟩')} className="p-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:scale-105 transition-all flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full bg-emerald-400 border border-emerald-500 shadow-sm shrink-0"></div>
                                    <span className="font-bold text-emerald-800 text-xs">Acquis</span>
                                </button>
                                <button onClick={() => handleSaveEvaluation('🟢')} className="p-3 rounded-xl border-2 border-emerald-600 bg-emerald-100 hover:bg-emerald-200 hover:scale-105 transition-all flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full bg-emerald-700 border border-emerald-800 shadow-sm shrink-0"></div>
                                    <span className="font-bold text-emerald-900 text-xs">Niveau dépassé</span>
                                </button>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Historique des évaluations</p>
                                <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                    {selectedCell.currentData?.evaluations && selectedCell.currentData.evaluations.length > 0 ? (
                                        [...selectedCell.currentData.evaluations].reverse().map((ev, i) => {
                                            const originalIndex = selectedCell.currentData.evaluations.length - 1 - i;
                                            return (
                                                <HistoryRow
                                                    key={originalIndex}
                                                    ev={ev}
                                                    originalIndex={originalIndex}
                                                    getDotColorClass={getDotColorClass}
                                                    handleEditHistoryDate={handleEditHistoryDate}
                                                    handleDeleteEval={handleDeleteEval}
                                                />
                                            );
                                        })
                                    ) : (
                                        <div className="text-xs text-slate-400 italic text-center py-2">Aucune évaluation.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}