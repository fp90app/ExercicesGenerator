import React, { useState, useEffect } from 'react';
import { db, storage } from '../../firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { Icon } from '../UI';
import { useProgram } from '../../hooks/useProgram';
import { SCHOOL_LEVELS, SKILL_DOMAINS, GRANDES_COMPETENCES } from '../../utils/constants';

export default function SkillsEditorTab() {
    const [competences, setCompetences] = useState([]);
    const [loading, setLoading] = useState(true);
    const { program } = useProgram();

    const [filterNiveau, setFilterNiveau] = useState('ALL');
    const [filterChapitre, setFilterChapitre] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    const [editingComp, setEditingComp] = useState(null);
    const [uploading, setUploading] = useState(false);

    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        message: '',
        onConfirm: null
    });

    useEffect(() => {
        fetchCompetences();
    }, []);

    const fetchCompetences = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(collection(db, "competences"));
            let list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            list.sort((a, b) => {
                const nivA = a.niveau || SCHOOL_LEVELS[0];
                const nivB = b.niveau || SCHOOL_LEVELS[0];
                if (nivA !== nivB) return nivB.localeCompare(nivA);
                return a.chapitre - b.chapitre || (a.code || a.id).localeCompare(b.code || b.id);
            });
            setCompetences(list);
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors du chargement des compétences.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!editingComp || !editingComp.code) return toast.error("Le code est obligatoire.");

        try {
            let systemId = editingComp.id;
            if (editingComp.isNew) {
                const prefix = (editingComp.niveau || SCHOOL_LEVELS[0]).replace('ème', 'EME').toUpperCase();
                systemId = `${prefix}-${editingComp.code}`;
            }

            // Nettoyage des blocs d'explication vides avant sauvegarde
            const cleanExplications = (editingComp.explications || []).filter(e => e.trim() !== "");

            const docRef = doc(db, "competences", systemId);
            await setDoc(docRef, {
                id: systemId,
                code: editingComp.code,
                niveau: editingComp.niveau || SCHOOL_LEVELS[0],
                chapitre: Number(editingComp.chapitre) || 1,
                chapitreNom: editingComp.chapitreNom || "",
                domaine: editingComp.domaine || SKILL_DOMAINS[0],
                type: editingComp.type || "Technique",
                grandesCompetences: editingComp.grandesCompetences || [],
                intitule: editingComp.intitule || "",
                validiteMois: Number(editingComp.validiteMois) || 3,
                explications: cleanExplications, // NOUVEAU : Sauvegarde en tableau
                explication: "", // On vide l'ancien champ texte pour forcer la migration
                lienExercice: editingComp.lienExercice || "",
                exercices: editingComp.exercices || []
            }, { merge: true });

            toast.success("Compétence enregistrée avec succès !");
            setEditingComp(null);
            fetchCompetences();
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors de la sauvegarde.");
        }
    };

    const handleDelete = (compId) => {
        setConfirmDialog({
            isOpen: true,
            message: `⚠️ Supprimer définitivement la compétence ${compId} ?\nAttention : cela supprimera aussi l'historique de cette compétence pour les élèves.`,
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, "competences", compId));
                    toast.success("Compétence supprimée.");
                    fetchCompetences();
                } catch (error) {
                    toast.error("Erreur lors de la suppression.");
                }
                setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
            }
        });
    };

    // --- GESTION DES EXPLICATIONS (BLOCS DYNAMIQUES) ---
    const addExplication = () => {
        setEditingComp(prev => ({ ...prev, explications: [...(prev.explications || []), ""] }));
    };

    const removeExplication = (index) => {
        setEditingComp(prev => {
            const arr = [...(prev.explications || [])];
            arr.splice(index, 1);
            return { ...prev, explications: arr };
        });
    };

    const updateExplication = (index, value) => {
        setEditingComp(prev => {
            const arr = [...(prev.explications || [])];
            arr[index] = value;
            return { ...prev, explications: arr };
        });
    };

    // --- GESTION DES EXERCICES STATIQUES ---
    const addExercice = () => {
        setEditingComp(prev => ({
            ...prev,
            exercices: [
                ...(prev.exercices || []),
                { id: Date.now().toString(), enonceTexte: "", enonceImages: [], correctionTexte: "", correctionImages: [] }
            ]
        }));
    };

    const removeExercice = (index) => {
        setConfirmDialog({
            isOpen: true,
            message: "Supprimer cet exercice de la compétence ?",
            onConfirm: () => {
                setEditingComp(prev => {
                    const newExos = [...(prev.exercices || [])];
                    newExos.splice(index, 1);
                    return { ...prev, exercices: newExos };
                });
                setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
            }
        });
    };

    const updateExerciceText = (index, field, value) => {
        setEditingComp(prev => {
            const newExos = [...(prev.exercices || [])];
            newExos[index] = { ...newExos[index], [field]: value };
            return { ...prev, exercices: newExos };
        });
    };

    const handleExerciceImageUpload = async (e, index, field) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setUploading(true);
        const toastId = toast.loading("Envoi des images...");

        try {
            const newUrls = [];
            for (const file of files) {
                const compIdFolder = editingComp.id || 'nouvelle_comp';
                const fileRef = ref(storage, `competences_images/${compIdFolder}/exo_${index}_${Date.now()}_${file.name}`);
                await uploadBytes(fileRef, file);
                const url = await getDownloadURL(fileRef);
                newUrls.push(url);
            }
            setEditingComp(prev => {
                const newExos = [...(prev.exercices || [])];
                const currentUrls = newExos[index][field] || [];
                newExos[index] = { ...newExos[index], [field]: [...currentUrls, ...newUrls] };
                return { ...prev, exercices: newExos };
            });
            toast.success(`${files.length} image(s) ajoutée(s) !`, { id: toastId });
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Erreur lors de l'envoi des images.", { id: toastId });
        } finally {
            setUploading(false);
            e.target.value = null;
        }
    };

    const handleRemoveExerciceImage = (exoIndex, field, imgIndex) => {
        setConfirmDialog({
            isOpen: true,
            message: "Retirer cette image ?",
            onConfirm: () => {
                setEditingComp(prev => {
                    const newExos = [...(prev.exercices || [])];
                    const newArr = [...(newExos[exoIndex][field] || [])];
                    newArr.splice(imgIndex, 1);
                    newExos[exoIndex] = { ...newExos[exoIndex], [field]: newArr };
                    return { ...prev, exercices: newExos };
                });
                setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
            }
        });
    };

    const toggleGrandeComp = (compName) => {
        setEditingComp(prev => {
            const current = prev.grandesCompetences || [];
            if (current.includes(compName)) {
                return { ...prev, grandesCompetences: current.filter(c => c !== compName) };
            } else {
                return { ...prev, grandesCompetences: [...current, compName] };
            }
        });
    };

    const filteredComps = competences.filter(c => {
        const cNiv = c.niveau || SCHOOL_LEVELS[0];
        if (filterNiveau !== 'ALL' && cNiv !== filterNiveau) return false;
        if (filterChapitre !== 'ALL' && String(c.chapitre) !== filterChapitre) return false;
        if (searchQuery.trim() !== '') {
            const q = searchQuery.toLowerCase();
            const matchCode = (c.code || c.id).toLowerCase().includes(q);
            const matchIntitule = c.intitule.toLowerCase().includes(q);
            const matchChap = c.chapitreNom?.toLowerCase().includes(q);
            if (!matchCode && !matchIntitule && !matchChap) return false;
        }
        return true;
    });

    const chapitresDispos = [...new Set(competences.map(c => c.chapitre))].sort((a, b) => a - b);

    if (loading) {
        return (
            <div className="p-12 text-center text-slate-400 font-bold">
                <Icon name="spinner" className="animate-spin text-2xl mb-2" /> Chargement de la base compétences...
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in relative">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 text-indigo-700 p-2.5 rounded-xl">
                        <Icon name="database" size={20} weight="fill" />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-800 text-lg">Base de données</h3>
                        <p className="text-xs text-slate-500">{filteredComps.length} compétences affichées</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <input
                        type="text"
                        placeholder="Rechercher (ex: NT1...)"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="p-2.5 rounded-xl border border-slate-300 text-sm font-medium bg-white outline-none focus:border-indigo-500 flex-1 md:w-48"
                    />
                    <select
                        value={filterNiveau}
                        onChange={e => setFilterNiveau(e.target.value)}
                        className="p-2.5 rounded-xl border border-slate-300 text-sm font-bold bg-white text-slate-700 outline-none focus:border-indigo-500"
                    >
                        <option value="ALL">Tous les niveaux</option>
                        {SCHOOL_LEVELS.map(lvl => (
                            <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                    </select>
                    <select
                        value={filterChapitre}
                        onChange={e => setFilterChapitre(e.target.value)}
                        className="p-2.5 rounded-xl border border-slate-300 text-sm font-bold bg-white text-slate-700 outline-none focus:border-indigo-500"
                    >
                        <option value="ALL">Tous les chapitres</option>
                        {chapitresDispos.map(ch => (
                            <option key={ch} value={ch}>Chapitre {ch}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setEditingComp({
                            isNew: true,
                            id: "",
                            code: "",
                            niveau: filterNiveau !== 'ALL' ? filterNiveau : SCHOOL_LEVELS[0],
                            chapitre: 1,
                            chapitreNom: "",
                            domaine: SKILL_DOMAINS[0],
                            type: "Technique",
                            grandesCompetences: [],
                            intitule: "",
                            validiteMois: 3,
                            explications: [""], // Initialisation d'un bloc vide
                            lienExercice: "",
                            exercices: []
                        })}
                        className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-md shrink-0"
                    >
                        <Icon name="plus" weight="bold" /> Nouvelle
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-100 text-slate-600 uppercase text-xs tracking-wider">
                            <tr>
                                <th className="p-4">Niveau / Code</th>
                                <th className="p-4">Chapitre</th>
                                <th className="p-4">Domaine & Type</th>
                                <th className="p-4">Intitulé</th>
                                <th className="p-4 text-center">Ressources</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredComps.map(comp => {
                                // Rétro-compatibilité pour déterminer si une explication existe
                                const hasExplications = (comp.explications && comp.explications.length > 0) || comp.explication;

                                return (
                                    <tr key={comp.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="p-4 whitespace-nowrap">
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{comp.niveau || SCHOOL_LEVELS[0]}</div>
                                            <div className="font-black font-mono text-indigo-600 text-lg">{comp.code || comp.id}</div>
                                            <div className="text-[9px] text-slate-300 font-mono mt-1" title="Identifiant Système Firebase">ID: {comp.id}</div>
                                        </td>
                                        <td className="p-4 font-bold text-slate-700">
                                            <div className="text-xs text-indigo-500">Chapitre {comp.chapitre}</div>
                                            <div className="truncate max-w-[150px]" title={comp.chapitreNom}>{comp.chapitreNom}</div>
                                        </td>
                                        <td className="p-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1.5 items-start">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                    {comp.domaine}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${comp.type === 'Technique' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                    {comp.type}
                                                </span>
                                                {comp.grandesCompetences && comp.grandesCompetences.length > 0 && (
                                                    <div className="flex gap-1 flex-wrap mt-1">
                                                        {comp.grandesCompetences.map(gc => (
                                                            <span key={gc} className="px-1.5 py-0.5 rounded text-[9px] font-black bg-slate-800 text-white uppercase tracking-widest">
                                                                {gc}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 font-medium text-slate-800 max-w-sm leading-tight">
                                            {comp.intitule}
                                        </td>
                                        <td className="p-4 text-center whitespace-nowrap">
                                            <div className="flex items-center justify-center gap-2">
                                                {hasExplications ? <Icon name="lightbulb" weight="fill" className="text-amber-500 text-lg" title="Explication présente" /> : <Icon name="lightbulb" className="text-slate-200" />}
                                                {comp.lienExercice ? <Icon name="game-controller" weight="fill" className="text-indigo-500 text-lg" title="Exercice interactif lié" /> : <Icon name="game-controller" className="text-slate-200" />}
                                                {comp.exercices?.length > 0 ? <Icon name="files" weight="fill" className="text-emerald-500 text-lg" title={`${comp.exercices.length} exercice(s) lié(s)`} /> : <Icon name="files" className="text-slate-200" />}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setEditingComp({
                                                        ...comp,
                                                        isNew: false,
                                                        // Rétrocompatibilité magique au chargement : on transforme le texte en tableau si besoin
                                                        explications: comp.explications?.length > 0 ? comp.explications : (comp.explication ? [comp.explication] : [""])
                                                    })}
                                                    className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                                                    title="Modifier / Ajouter Ressources"
                                                >
                                                    <Icon name="pencil-simple" weight="bold" size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(comp.id)}
                                                    className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                                                    title="Supprimer"
                                                >
                                                    <Icon name="trash" weight="bold" size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {filteredComps.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-400 italic font-bold">
                                        Aucune compétence ne correspond à ta recherche.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingComp && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => !uploading && setEditingComp(null)}>
                    <div className="bg-slate-50 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
                        <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0">
                            <h3 className="text-xl font-black flex items-center gap-2">
                                <Icon name="pencil-simple" /> {editingComp.isNew ? "Nouvelle Compétence" : `Modifier ${editingComp.code || editingComp.id}`}
                            </h3>
                            <button disabled={uploading} onClick={() => setEditingComp(null)} className="text-slate-400 hover:text-white transition-colors disabled:opacity-50">
                                <Icon name="x" size={20} />
                            </button>
                        </div>

                        <div className="overflow-y-auto custom-scrollbar p-6 flex-1">
                            <form id="skillForm" onSubmit={handleSave} className="space-y-8">
                                {/* SECTION 1 : INFOS DE BASE */}
                                <div>
                                    <h4 className="font-black text-slate-800 border-b border-slate-200 pb-2 mb-4 flex items-center gap-2">
                                        <Icon name="info" className="text-indigo-600" /> Informations générales
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Code d'affichage</label>
                                            <input
                                                type="text"
                                                required
                                                disabled={!editingComp.isNew}
                                                value={editingComp.code || ''}
                                                onChange={e => setEditingComp({ ...editingComp, code: e.target.value.toUpperCase() })}
                                                className="w-full p-2 border-2 border-slate-200 rounded-lg font-mono font-bold uppercase outline-none focus:border-indigo-500 disabled:opacity-50 disabled:bg-slate-100"
                                                placeholder="ex: NT1"
                                            />
                                            {!editingComp.isNew && <span className="text-[9px] text-amber-600 mt-1 leading-tight block">Verrouillé pour protéger l'historique élève.</span>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Niveau</label>
                                            <select
                                                disabled={!editingComp.isNew}
                                                value={editingComp.niveau || SCHOOL_LEVELS[0]}
                                                onChange={e => setEditingComp({ ...editingComp, niveau: e.target.value })}
                                                className="w-full p-2 border-2 border-slate-200 rounded-lg font-bold bg-white outline-none focus:border-indigo-500 disabled:opacity-50 disabled:bg-slate-100"
                                            >
                                                {SCHOOL_LEVELS.map(lvl => (
                                                    <option key={lvl} value={lvl}>{lvl}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Chapitre (N°)</label>
                                            <input type="number" min="1" required value={editingComp.chapitre} onChange={e => setEditingComp({ ...editingComp, chapitre: e.target.value })} className="w-full p-2 border-2 border-slate-200 rounded-lg font-bold outline-none focus:border-indigo-500" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Validité (Mois)</label>
                                            <input type="number" min="1" required value={editingComp.validiteMois} onChange={e => setEditingComp({ ...editingComp, validiteMois: e.target.value })} className="w-full p-2 border-2 border-slate-200 rounded-lg font-bold outline-none focus:border-indigo-500" />
                                        </div>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Domaine</label>
                                            <select value={editingComp.domaine} onChange={e => setEditingComp({ ...editingComp, domaine: e.target.value })} className="w-full p-2 border-2 border-slate-200 rounded-lg font-bold bg-white outline-none focus:border-indigo-500">
                                                {SKILL_DOMAINS.map(dom => (
                                                    <option key={dom} value={dom}>{dom}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                                            <select value={editingComp.type} onChange={e => setEditingComp({ ...editingComp, type: e.target.value })} className="w-full p-2 border-2 border-slate-200 rounded-lg font-bold bg-white outline-none focus:border-indigo-500">
                                                <option value="Technique">Technique (Savoir-faire)</option>
                                                <option value="Conceptuel">Conceptuel (Raisonnement)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Grandes compétences sollicitées</label>
                                        <div className="flex flex-wrap gap-3">
                                            {GRANDES_COMPETENCES.map(gc => (
                                                <label key={gc} className="flex items-center gap-2 cursor-pointer bg-white border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={(editingComp.grandesCompetences || []).includes(gc)}
                                                        onChange={() => toggleGrandeComp(gc)}
                                                        className="accent-indigo-600 w-4 h-4 cursor-pointer"
                                                    />
                                                    <span className="text-sm font-bold text-slate-700">{gc}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom du Chapitre</label>
                                        <input type="text" placeholder="ex: Nombres entiers..." value={editingComp.chapitreNom} onChange={e => setEditingComp({ ...editingComp, chapitreNom: e.target.value })} className="w-full p-2 border-2 border-slate-200 rounded-lg font-medium outline-none focus:border-indigo-500 text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Intitulé de la compétence</label>
                                        <textarea rows="2" required placeholder="ex: Je sais décomposer un nombre..." value={editingComp.intitule} onChange={e => setEditingComp({ ...editingComp, intitule: e.target.value })} className="w-full p-3 border-2 border-slate-200 rounded-xl font-medium outline-none focus:border-indigo-500 text-sm resize-none" />
                                    </div>
                                </div>

                                {/* SECTION 2 : EXPLICATIONS ET JEU LIÉ */}
                                <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100">
                                    <h4 className="font-black text-amber-900 border-b border-amber-200 pb-2 mb-4 flex items-center gap-2">
                                        <Icon name="lightbulb" className="text-amber-500" weight="fill" /> Astuce et Interactivité
                                    </h4>

                                    {/* BLOCS D'EXPLICATION DYNAMIQUES */}
                                    <div className="mb-5">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-xs font-bold text-amber-700 uppercase">
                                                Détail explicatif (Fiche de révision)
                                            </label>
                                            <button
                                                type="button"
                                                onClick={addExplication}
                                                className="text-[10px] bg-amber-200 text-amber-800 px-2 py-1 rounded font-bold hover:bg-amber-300 transition-colors"
                                            >
                                                + Ajouter un bloc
                                            </button>
                                        </div>
                                        {(editingComp.explications || []).map((exp, idx) => (
                                            <div key={idx} className="relative mb-3 group">
                                                <textarea
                                                    rows="2"
                                                    placeholder="Astuce, aide ou formule mathématique $...$ pour les élèves"
                                                    value={exp}
                                                    onChange={e => updateExplication(idx, e.target.value)}
                                                    className="w-full p-3 pr-10 border-2 border-amber-200 rounded-xl font-medium outline-none focus:border-amber-400 text-sm resize-none bg-white"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeExplication(idx)}
                                                    className="absolute right-2 top-2 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Supprimer ce bloc"
                                                >
                                                    <Icon name="trash" weight="bold" />
                                                </button>
                                            </div>
                                        ))}
                                        {(editingComp.explications || []).length === 0 && (
                                            <div className="text-center text-amber-600/50 text-xs italic py-2">
                                                Aucune explication.
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-indigo-700 uppercase mb-1 flex items-center gap-1">
                                            <Icon name="game-controller" /> Lier un exercice interactif existant
                                        </label>
                                        <select
                                            value={editingComp.lienExercice || ""}
                                            onChange={e => setEditingComp({ ...editingComp, lienExercice: e.target.value })}
                                            className="w-full p-3 border-2 border-indigo-200 rounded-xl font-bold bg-white text-slate-700 outline-none focus:border-indigo-500 shadow-sm"
                                        >
                                            <option value="">-- Aucun exercice interactif lié --</option>
                                            {program && program.map(cat => (
                                                <optgroup key={cat.id} label={cat.title}>
                                                    {cat.exos.map(exo => (
                                                        <option key={exo.id} value={exo.id}>{exo.title}</option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* SECTION 3 : EXERCICES D'ENTRAÎNEMENT STATIQUES */}
                                <div className="bg-emerald-50/30 p-5 rounded-2xl border border-emerald-100">
                                    <div className="flex justify-between items-center border-b border-emerald-200 pb-2 mb-4">
                                        <h4 className="font-black text-emerald-900 flex items-center gap-2">
                                            <Icon name="files" className="text-emerald-600" weight="fill" /> Exercices d'entraînement
                                        </h4>
                                        <button type="button" onClick={addExercice} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-emerald-700 transition-colors">
                                            <Icon name="plus" /> Ajouter un exercice
                                        </button>
                                    </div>
                                    <div className="space-y-6">
                                        {(editingComp.exercices || []).map((exo, index) => (
                                            <div key={exo.id} className="bg-white border-2 border-emerald-100 rounded-xl p-4 relative shadow-sm">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h5 className="font-black text-emerald-800 uppercase tracking-widest text-xs">Exercice {index + 1}</h5>
                                                    <button type="button" onClick={() => removeExercice(index)} className="text-red-400 hover:text-red-600 bg-red-50 p-1.5 rounded-lg transition-colors">
                                                        <Icon name="trash" weight="bold" />
                                                    </button>
                                                </div>
                                                <div className="grid md:grid-cols-2 gap-6">
                                                    <div className="border-r border-slate-100 pr-6">
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Énoncé (Texte)</label>
                                                        <textarea
                                                            rows="2"
                                                            placeholder="Consigne de l'exercice..."
                                                            value={exo.enonceTexte || ""}
                                                            onChange={e => updateExerciceText(index, 'enonceTexte', e.target.value)}
                                                            className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-emerald-500 mb-3 resize-none"
                                                        />
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Énoncé (Images)</label>
                                                        <input
                                                            type="file"
                                                            multiple
                                                            accept="image/*"
                                                            disabled={uploading}
                                                            onChange={(e) => handleExerciceImageUpload(e, index, 'enonceImages')}
                                                            className="w-full text-xs mb-3 text-slate-500 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:font-bold hover:file:bg-slate-200 disabled:opacity-50"
                                                        />
                                                        <div className="flex flex-wrap gap-2">
                                                            {(exo.enonceImages || []).map((url, imgIdx) => (
                                                                <div key={imgIdx} className="relative group border border-slate-200 rounded-lg overflow-hidden">
                                                                    <img src={url} alt={`Enoncé ${imgIdx}`} className="h-16 w-16 object-cover" />
                                                                    <button type="button" onClick={() => handleRemoveExerciceImage(index, 'enonceImages', imgIdx)} className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                                        <Icon name="trash" weight="bold" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-emerald-600 uppercase mb-2">Correction (Texte)</label>
                                                        <textarea
                                                            rows="2"
                                                            placeholder="Explication de la réponse..."
                                                            value={exo.correctionTexte || ""}
                                                            onChange={e => updateExerciceText(index, 'correctionTexte', e.target.value)}
                                                            className="w-full p-2 border border-emerald-200 bg-emerald-50/30 rounded-lg text-sm outline-none focus:border-emerald-500 mb-3 resize-none"
                                                        />
                                                        <label className="block text-xs font-bold text-emerald-600 uppercase mb-2">Correction (Images)</label>
                                                        <input
                                                            type="file"
                                                            multiple
                                                            accept="image/*"
                                                            disabled={uploading}
                                                            onChange={(e) => handleExerciceImageUpload(e, index, 'correctionImages')}
                                                            className="w-full text-xs mb-3 text-slate-500 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:text-emerald-700 file:font-bold hover:file:bg-emerald-200 disabled:opacity-50"
                                                        />
                                                        <div className="flex flex-wrap gap-2">
                                                            {(exo.correctionImages || []).map((url, imgIdx) => (
                                                                <div key={imgIdx} className="relative group border border-slate-200 rounded-lg overflow-hidden">
                                                                    <img src={url} alt={`Correction ${imgIdx}`} className="h-16 w-16 object-cover" />
                                                                    <button type="button" onClick={() => handleRemoveExerciceImage(index, 'correctionImages', imgIdx)} className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                                        <Icon name="trash" weight="bold" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {(editingComp.exercices || []).length === 0 && (
                                            <div className="text-center text-slate-400 italic text-sm">
                                                Aucun exercice ajouté pour le moment.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div className="bg-white p-4 flex justify-end gap-3 border-t border-slate-200 shrink-0">
                            <button type="button" disabled={uploading} onClick={() => setEditingComp(null)} className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50">
                                Annuler
                            </button>
                            <button type="submit" form="skillForm" disabled={uploading} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:scale-100">
                                {uploading ? <Icon name="spinner" className="animate-spin" /> : <Icon name="floppy-disk" weight="fill" />}
                                Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {confirmDialog.isOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setConfirmDialog({ isOpen: false, message: '', onConfirm: null })}>
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="p-6 text-center">
                            <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Icon name="warning" className="text-3xl text-amber-600" weight="fill" />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 mb-2">Confirmation</h3>
                            <p className="text-sm font-medium text-slate-500 whitespace-pre-wrap">{confirmDialog.message}</p>
                        </div>
                        <div className="bg-slate-50 p-4 flex justify-center gap-3 border-t border-slate-200">
                            <button
                                onClick={() => setConfirmDialog({ isOpen: false, message: '', onConfirm: null })}
                                className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors w-full"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={confirmDialog.onConfirm}
                                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 w-full"
                            >
                                <Icon name="trash" weight="bold" /> Confirmer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}