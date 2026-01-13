import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import {
    collection, query, where, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch, serverTimestamp, setDoc, getDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { toast } from 'react-hot-toast';
import { Icon } from './UI';

const LEVELS = ["6ème", "5ème", "4ème", "3ème"];

export default function CoursesAdmin() {
    const [selectedLevel, setSelectedLevel] = useState("3ème");
    const [chapters, setChapters] = useState([]);
    const [loading, setLoading] = useState(false);

    // --- CONFIGURATION DES CLASSES ---
    const [allClassesConfig, setAllClassesConfig] = useState({});
    const [newClassInput, setNewClassInput] = useState("");
    const [showClassManager, setShowClassManager] = useState(false);

    // --- ÉTATS CHAPITRES ---
    const [editingChapter, setEditingChapter] = useState(null);
    const [newChapterTitle, setNewChapterTitle] = useState("");
    const [newChapterSection, setNewChapterSection] = useState("Chapitres");

    // --- ÉTATS DOCUMENTS ---
    const [expandedChapter, setExpandedChapter] = useState(null);
    const [docs, setDocs] = useState({});
    const [uploading, setUploading] = useState(false);

    // --- FORMULAIRE DOCUMENT ---
    const [showDocForm, setShowDocForm] = useState(null);
    const [editingDoc, setEditingDoc] = useState(null);

    // NOUVEAU : On gère une liste de fichiers au lieu d'un seul
    const [docFiles, setDocFiles] = useState([]);

    const [docTitle, setDocTitle] = useState("");
    const [docType, setDocType] = useState("FILE");
    const [docUrl, setDocUrl] = useState("");
    const [selectedClasses, setSelectedClasses] = useState([]);

    // 1. INITIALISATION
    useEffect(() => {
        fetchClassesConfig();
        fetchChapters();
        setExpandedChapter(null);
        setDocs({});
    }, [selectedLevel]);

    const fetchClassesConfig = async () => {
        try {
            const snap = await getDoc(doc(db, "config", "courses"));
            if (snap.exists()) setAllClassesConfig(snap.data());
            else setAllClassesConfig({});
        } catch (e) { console.error(e); }
    };

    const fetchChapters = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "courses_chapters"), where("level", "==", selectedLevel), orderBy("order", "asc"));
            const snapshot = await getDocs(q);
            setChapters(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error("Erreur chargement chapitres", error);
        } finally { setLoading(false); }
    };

    const fetchDocs = async (chapterId) => {
        try {
            const q = query(collection(db, "courses_docs"), where("chapterId", "==", chapterId), orderBy("order", "asc"));
            try {
                const snapshot = await getDocs(q);
                setDocs(prev => ({ ...prev, [chapterId]: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) }));
            } catch (e) {
                // Fallback sans index
                const q2 = query(collection(db, "courses_docs"), where("chapterId", "==", chapterId), orderBy("createdAt", "desc"));
                const snapshot = await getDocs(q2);
                setDocs(prev => ({ ...prev, [chapterId]: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) }));
            }
        } catch (error) { console.error(error); }
    };

    const toggleChapter = (chapterId) => {
        if (expandedChapter === chapterId) setExpandedChapter(null);
        else { setExpandedChapter(chapterId); if (!docs[chapterId]) fetchDocs(chapterId); }
    };

    // 2. GESTION DES CLASSES
    const handleAddClass = async () => {
        if (!newClassInput.trim()) return;
        const className = newClassInput.trim().toUpperCase();
        const currentClasses = allClassesConfig[selectedLevel] || [];
        if (currentClasses.includes(className)) return toast.error("Existe déjà !");

        const newConfig = { ...allClassesConfig, [selectedLevel]: [...currentClasses, className].sort() };
        try {
            await setDoc(doc(db, "config", "courses"), newConfig);
            setAllClassesConfig(newConfig);
            setNewClassInput("");
            toast.success("Classe ajoutée");
        } catch (e) { toast.error("Erreur sauvegarde config"); }
    };

    const handleDeleteClass = async (cls) => {
        if (!confirm("Supprimer cette classe ?")) return;
        const newConfig = { ...allClassesConfig, [selectedLevel]: (allClassesConfig[selectedLevel] || []).filter(c => c !== cls) };
        try {
            await setDoc(doc(db, "config", "courses"), newConfig);
            setAllClassesConfig(newConfig);
        } catch (e) { toast.error("Erreur suppression"); }
    };

    // 3. GESTION CHAPITRES
    const handleSaveChapter = async () => {
        if (!newChapterTitle.trim()) return;
        try {
            if (editingChapter) {
                await updateDoc(doc(db, "courses_chapters", editingChapter.id), {
                    title: newChapterTitle,
                    section: newChapterSection || "Chapitres"
                });
                setEditingChapter(null);
                toast.success("Chapitre modifié");
            } else {
                const nextOrder = chapters.length > 0 ? Math.max(...chapters.map(c => c.order || 0)) + 1 : 1;
                await addDoc(collection(db, "courses_chapters"), {
                    title: newChapterTitle,
                    level: selectedLevel,
                    section: newChapterSection || "Chapitres",
                    order: nextOrder,
                    published: true,
                    createdAt: serverTimestamp()
                });
                toast.success("Chapitre créé");
            }
            setNewChapterTitle("");
            setNewChapterSection("Chapitres");
            fetchChapters();
        } catch (e) { toast.error("Erreur chapitre"); }
    };

    const handleDeleteChapter = async (chapter) => {
        if (!confirm("Supprimer le chapitre et TOUS ses documents ?")) return;
        try {
            const batch = writeBatch(db);
            const docsSnap = await getDocs(query(collection(db, "courses_docs"), where("chapterId", "==", chapter.id)));
            docsSnap.forEach(d => batch.delete(d.ref));
            batch.delete(doc(db, "courses_chapters", chapter.id));
            await batch.commit();
            fetchChapters();
            toast.success("Supprimé");
        } catch (e) { toast.error("Erreur suppression"); }
    };

    const moveChapter = async (index, direction) => {
        if ((direction === -1 && index === 0) || (direction === 1 && index === chapters.length - 1)) return;
        const newChapters = [...chapters];
        const temp = newChapters[index];
        newChapters[index] = newChapters[index + direction];
        newChapters[index + direction] = temp;
        setChapters(newChapters);
        try {
            const batch = writeBatch(db);
            newChapters.forEach((c, idx) => batch.update(doc(db, "courses_chapters", c.id), { order: idx + 1 }));
            await batch.commit();
        } catch (e) { fetchChapters(); }
    };

    // 4. GESTION DOCUMENTS
    const moveDoc = async (docIndex, direction, chapterId) => {
        const currentDocs = docs[chapterId] || [];
        if ((direction === -1 && docIndex === 0) || (direction === 1 && docIndex === currentDocs.length - 1)) return;

        const newDocs = [...currentDocs];
        const temp = newDocs[docIndex];
        newDocs[docIndex] = newDocs[docIndex + direction];
        newDocs[docIndex + direction] = temp;

        setDocs(prev => ({ ...prev, [chapterId]: newDocs }));

        try {
            const batch = writeBatch(db);
            newDocs.forEach((d, idx) => {
                batch.update(doc(db, "courses_docs", d.id), { order: idx + 1 });
            });
            await batch.commit();
        } catch (e) {
            toast.error("Erreur tri (Index manquant ?)");
            fetchDocs(chapterId);
        }
    };

    const openAddForm = (chapterId) => {
        setEditingDoc(null); setDocTitle(""); setDocType("FILE"); setDocUrl("");
        setDocFiles([]); // Reset des fichiers
        setSelectedClasses([]); setShowDocForm(chapterId);
    };

    const openEditForm = (docData, chapterId) => {
        setEditingDoc(docData); setDocTitle(docData.title); setDocType(docData.type); setDocUrl(docData.url || "");
        setDocFiles([]);
        setSelectedClasses(docData.classes.filter(c => c !== 'ALL')); setShowDocForm(chapterId);
    };

    const toggleClassTag = (cls) => {
        if (selectedClasses.includes(cls)) setSelectedClasses(selectedClasses.filter(c => c !== cls));
        else setSelectedClasses([...selectedClasses, cls]);
    };

    // GESTION DES FICHIERS (MULTIPLE OU UNIQUE)
    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            // On stocke tous les fichiers
            const filesArray = Array.from(e.target.files);
            setDocFiles(filesArray);

            // Si un seul fichier, on pré-remplit le titre
            if (filesArray.length === 1) {
                const nameWithoutExt = filesArray[0].name.split('.').slice(0, -1).join('.');
                setDocTitle(nameWithoutExt);
            } else {
                // Si plusieurs, on vide le titre (il sera automatique)
                setDocTitle("");
            }
        }
    };

    const handleSaveDoc = async (chapterId) => {
        // Validation commune
        if (docType === 'LINK' && !docUrl) return toast.error("URL manquante");

        // Mode ÉDITION (Un seul doc à la fois) ou Mode LIEN
        if (editingDoc || docType === 'LINK' || (docType === 'FILE' && docFiles.length <= 1)) {
            // Logique classique (Single)
            let fileToUpload = docFiles[0];
            if (docType === 'FILE' && !fileToUpload && !editingDoc) return toast.error("Choisis un fichier");

            let finalTitle = docTitle.trim();
            if (!finalTitle && fileToUpload) finalTitle = fileToUpload.name.split('.').slice(0, -1).join('.');
            if (!finalTitle) return toast.error("Titre obligatoire");

            setUploading(true);
            try {
                let downloadUrl = docUrl;
                let storagePath = editingDoc?.storagePath || null;
                let mimeType = editingDoc?.mimeType || 'link';

                if (docType === 'FILE' && fileToUpload) {
                    if (editingDoc?.storagePath) await deleteObject(ref(storage, editingDoc.storagePath)).catch(() => { });
                    const ext = fileToUpload.name.split('.').pop();
                    const fileName = `${Date.now()}_${finalTitle.replace(/[^a-z0-9]/gi, '_')}.${ext}`;
                    const fileRef = ref(storage, `courses/${selectedLevel}/${chapterId}/${fileName}`);
                    const snapshot = await uploadBytes(fileRef, fileToUpload);
                    downloadUrl = await getDownloadURL(snapshot.ref);
                    storagePath = snapshot.ref.fullPath;
                    mimeType = fileToUpload.type;
                }

                // Ordre
                let nextOrder = 1;
                if (!editingDoc) {
                    const currentDocs = docs[chapterId] || [];
                    nextOrder = currentDocs.length > 0 ? Math.max(...currentDocs.map(d => d.order || 0)) + 1 : 1;
                }

                const docData = {
                    chapterId, title: finalTitle, type: docType, url: downloadUrl, storagePath, mimeType,
                    classes: selectedClasses.length > 0 ? selectedClasses : ['ALL'],
                    updatedAt: serverTimestamp()
                };

                if (editingDoc) {
                    await updateDoc(doc(db, "courses_docs", editingDoc.id), docData);
                    toast.success("Modifié !");
                } else {
                    await addDoc(collection(db, "courses_docs"), { ...docData, order: nextOrder, createdAt: serverTimestamp() });
                    toast.success("Ajouté !");
                }
                setShowDocForm(null); fetchDocs(chapterId);
            } catch (e) { toast.error(e.message); } finally { setUploading(false); }
        }
        // Mode UPLOAD MULTIPLE (Batch)
        else {
            setUploading(true);
            try {
                // On calcule l'ordre de départ
                const currentDocs = docs[chapterId] || [];
                let startOrder = currentDocs.length > 0 ? Math.max(...currentDocs.map(d => d.order || 0)) + 1 : 1;

                // On boucle sur tous les fichiers
                // Note : On utilise une boucle for...of pour gérer les async proprement
                for (let i = 0; i < docFiles.length; i++) {
                    const file = docFiles[i];
                    const autoTitle = file.name.split('.').slice(0, -1).join('.');

                    // Upload
                    const ext = file.name.split('.').pop();
                    const safeName = autoTitle.replace(/[^a-z0-9]/gi, '_');
                    const fileName = `${Date.now()}_${i}_${safeName}.${ext}`;
                    const fileRef = ref(storage, `courses/${selectedLevel}/${chapterId}/${fileName}`);
                    const snapshot = await uploadBytes(fileRef, file);
                    const downloadUrl = await getDownloadURL(snapshot.ref);

                    // Firestore Add
                    await addDoc(collection(db, "courses_docs"), {
                        chapterId,
                        title: autoTitle, // Titre auto
                        type: 'FILE',
                        url: downloadUrl,
                        storagePath: snapshot.ref.fullPath,
                        mimeType: file.type,
                        classes: selectedClasses.length > 0 ? selectedClasses : ['ALL'],
                        order: startOrder + i, // Incrément de l'ordre
                        createdAt: serverTimestamp()
                    });
                }

                toast.success(`${docFiles.length} documents ajoutés !`);
                setShowDocForm(null);
                fetchDocs(chapterId);

            } catch (e) {
                console.error(e);
                toast.error("Erreur lors de l'envoi multiple");
            } finally {
                setUploading(false);
            }
        }
    };

    const handleDeleteDoc = async (docData) => {
        if (!confirm("Supprimer ce document ?")) return;
        try {
            await deleteDoc(doc(db, "courses_docs", docData.id));
            if (docData.storagePath) await deleteObject(ref(storage, docData.storagePath)).catch(() => { });
            fetchDocs(docData.chapterId);
        } catch (e) { toast.error("Erreur suppression"); }
    };

    const groupedChapters = chapters.reduce((acc, chapter) => {
        const section = chapter.section || "Chapitres";
        if (!acc[section]) acc[section] = [];
        acc[section].push(chapter);
        return acc;
    }, {});

    const currentClasses = allClassesConfig[selectedLevel] || [];

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 pb-20">
            {/* HEADER */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <Icon name="books" className="text-indigo-600" /> Gestion des Cours
                </h2>
                <button onClick={() => setShowClassManager(!showClassManager)} className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 flex items-center gap-2">
                    <Icon name="gear" /> Gérer les classes
                </button>
            </div>

            {/* SELECTION NIVEAU */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {LEVELS.map(lvl => (
                    <button key={lvl} onClick={() => setSelectedLevel(lvl)} className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap ${selectedLevel === lvl ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:text-indigo-600'}`}>
                        {lvl}
                    </button>
                ))}
            </div>

            {/* MANAGER CLASSES */}
            {showClassManager && (
                <div className="mb-8 bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                    <h3 className="text-sm font-bold text-indigo-800 mb-3">Classes de {selectedLevel}</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {currentClasses.map(cls => (
                            <span key={cls} className="bg-white text-indigo-600 px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-2 border border-indigo-100">
                                {cls} <button onClick={() => handleDeleteClass(cls)} className="text-indigo-300 hover:text-red-500"><Icon name="x" size={14} /></button>
                            </span>
                        ))}
                    </div>
                    <div className="flex gap-2 max-w-xs">
                        <input placeholder="Ex: 3C" className="flex-1 p-2 rounded-lg border border-indigo-200 text-sm" value={newClassInput} onChange={e => setNewClassInput(e.target.value)} />
                        <button onClick={handleAddClass} className="bg-indigo-600 text-white px-3 rounded-lg font-bold"><Icon name="plus" /></button>
                    </div>
                </div>
            )}

            {/* CONTENU PRINCIPAL */}
            <div className="space-y-8">
                {Object.keys(groupedChapters).length === 0 && (
                    <div className="text-center p-8 bg-slate-50 rounded-xl text-slate-400 italic">
                        Aucun contenu pour ce niveau. Créez un bloc ci-dessous.
                    </div>
                )}

                {Object.entries(groupedChapters).map(([sectionName, sectionChapters]) => (
                    <div key={sectionName}>
                        <h3 className="font-black text-slate-400 uppercase tracking-wider text-sm mb-3 pl-1">{sectionName}</h3>
                        <div className="space-y-4">
                            {sectionChapters.map((chapter) => (
                                <div key={chapter.id} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                                    {/* EN-TÊTE CHAPITRE */}
                                    <div className="p-4 flex items-center gap-3 bg-white border-b border-slate-100">
                                        <div className="flex flex-col gap-1 text-slate-300">
                                            <button onClick={() => moveChapter(chapters.indexOf(chapter), -1)} className="hover:text-indigo-600"><Icon name="caret-up" weight="bold" /></button>
                                            <button onClick={() => moveChapter(chapters.indexOf(chapter), 1)} className="hover:text-indigo-600"><Icon name="caret-down" weight="bold" /></button>
                                        </div>

                                        <div className="flex-1">
                                            {editingChapter?.id === chapter.id ? (
                                                <div className="flex gap-2 flex-col md:flex-row">
                                                    <input value={newChapterTitle} onChange={e => setNewChapterTitle(e.target.value)} className="border p-1 rounded flex-1" placeholder="Titre" />
                                                    <input value={newChapterSection} onChange={e => setNewChapterSection(e.target.value)} className="border p-1 rounded md:w-32" placeholder="Rubrique" />
                                                    <div className="flex gap-2">
                                                        <button onClick={handleSaveChapter} className="text-green-600 bg-green-50 p-1 rounded"><Icon name="check" /></button>
                                                        <button onClick={() => setEditingChapter(null)} className="text-red-600 bg-red-50 p-1 rounded"><Icon name="x" /></button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div onClick={() => toggleChapter(chapter.id)} className="cursor-pointer group">
                                                    <span className="text-xs font-bold text-indigo-500 uppercase tracking-wide">Chapitre {chapter.order}</span>
                                                    <h3 className="font-bold text-slate-800 text-lg group-hover:text-indigo-600">{chapter.title}</h3>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <button onClick={() => { setEditingChapter(chapter); setNewChapterTitle(chapter.title); setNewChapterSection(chapter.section || "Chapitres"); }} className="p-2 text-slate-400 hover:text-amber-500"><Icon name="pencil" /></button>
                                            <button onClick={() => handleDeleteChapter(chapter)} className="p-2 text-slate-400 hover:text-red-500"><Icon name="trash" /></button>
                                            <button onClick={() => toggleChapter(chapter.id)} className={`p-2 transition-transform ${expandedChapter === chapter.id ? 'rotate-180' : ''}`}><Icon name="caret-down" /></button>
                                        </div>
                                    </div>

                                    {/* LISTE DES DOCUMENTS */}
                                    {expandedChapter === chapter.id && (
                                        <div className="p-4 bg-slate-50">
                                            <div className="space-y-2 mb-4">
                                                {(docs[chapter.id] || []).map((d, dIdx) => (
                                                    <div key={d.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            {/* FLÈCHES ORDRE DOCUMENTS */}
                                                            <div className="flex flex-col gap-0 text-slate-300 scale-75">
                                                                <button onClick={() => moveDoc(dIdx, -1, chapter.id)} className="hover:text-indigo-600"><Icon name="caret-up" weight="bold" /></button>
                                                                <button onClick={() => moveDoc(dIdx, 1, chapter.id)} className="hover:text-indigo-600"><Icon name="caret-down" weight="bold" /></button>
                                                            </div>
                                                            <div className={`p-2 rounded-lg shrink-0 ${d.type === 'LINK' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
                                                                <Icon name={d.type === 'LINK' ? 'link' : 'file-pdf'} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="font-bold text-slate-700 text-sm truncate">{d.title}</div>
                                                                <div className="flex gap-1 mt-1 flex-wrap">
                                                                    {d.classes && !d.classes.includes('ALL') ? d.classes.map(c => <span key={c} className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">{c}</span>) : <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Tous</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <a href={d.url} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:text-indigo-600"><Icon name="eye" /></a>
                                                            <button onClick={() => openEditForm(d, chapter.id)} className="p-1.5 text-slate-400 hover:text-amber-600"><Icon name="pencil" /></button>
                                                            <button onClick={() => handleDeleteDoc(d)} className="p-1.5 text-slate-400 hover:text-red-600"><Icon name="trash" /></button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {(docs[chapter.id] || []).length === 0 && <p className="text-center text-xs text-slate-400 italic">Aucun document</p>}
                                            </div>

                                            {/* FORMULAIRE AJOUT/EDITION */}
                                            {showDocForm === chapter.id ? (
                                                <div className="bg-white p-4 rounded-xl border-2 border-indigo-100 shadow-sm animate-in fade-in zoom-in-95">
                                                    <h4 className="font-bold text-indigo-900 mb-3 text-sm uppercase flex items-center gap-2">
                                                        {editingDoc ? "Modifier le document" : "Ajouter des documents"}
                                                    </h4>
                                                    <div className="space-y-3">
                                                        <div className="flex gap-2">
                                                            <button onClick={() => setDocType('FILE')} className={`flex-1 py-1 text-xs font-bold rounded ${docType === 'FILE' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>Fichier(s) PDF/Img</button>
                                                            <button onClick={() => setDocType('LINK')} className={`flex-1 py-1 text-xs font-bold rounded ${docType === 'LINK' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>Lien Web</button>
                                                        </div>

                                                        {docType === 'FILE' ? (
                                                            // INPUT MULTIPLE ACTIVE ICI
                                                            <input type="file" multiple onChange={handleFileSelect} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                                                        ) : (
                                                            <input placeholder="https://..." value={docUrl} onChange={e => setDocUrl(e.target.value)} className="w-full border p-2 rounded text-sm" />
                                                        )}

                                                        {/* On affiche le titre seulement si un seul fichier est sélectionné ou si c'est un lien */}
                                                        {(docType === 'LINK' || (docFiles.length <= 1)) && (
                                                            <input
                                                                placeholder="Titre du document"
                                                                className="w-full border p-2 rounded text-sm font-bold"
                                                                value={docTitle}
                                                                onChange={e => setDocTitle(e.target.value)}
                                                            />
                                                        )}

                                                        {/* INFO LISTE MULTIPLE */}
                                                        {docType === 'FILE' && docFiles.length > 1 && (
                                                            <div className="bg-indigo-50 p-2 rounded text-xs text-indigo-700 font-bold border border-indigo-100">
                                                                {docFiles.length} fichiers sélectionnés. <br />
                                                                Les titres seront automatiques (Nom du fichier).
                                                            </div>
                                                        )}

                                                        <div className="border p-3 rounded bg-slate-50">
                                                            <label className="text-xs font-bold text-slate-500 mb-2 block">Visible pour :</label>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <input type="checkbox" checked={selectedClasses.length === 0} onChange={() => setSelectedClasses([])} className="accent-indigo-600" />
                                                                <label className="text-sm font-bold">Toute la {selectedLevel}</label>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                {currentClasses.map(cls => (
                                                                    <div key={cls} className="flex items-center gap-1.5">
                                                                        <input type="checkbox" checked={selectedClasses.includes(cls)} onChange={() => toggleClassTag(cls)} className="accent-indigo-600" />
                                                                        <label className="text-xs font-bold">{cls}</label>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-100">
                                                            <button onClick={() => setShowDocForm(false)} className="px-3 py-1 text-slate-500 text-sm hover:bg-slate-100 rounded">Annuler</button>
                                                            <button onClick={() => handleSaveDoc(chapter.id)} disabled={uploading} className="px-3 py-1 bg-indigo-600 text-white text-sm font-bold rounded flex items-center gap-2">
                                                                {uploading ? <Icon name="spinner" className="animate-spin" /> : (docFiles.length > 1 ? "Tout envoyer" : "Sauvegarder")}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button onClick={() => openAddForm(chapter.id)} className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 font-bold text-sm hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2">
                                                    <Icon name="plus" /> Ajouter des documents
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {/* CREATION NOUVEAU CHAPITRE */}
                {editingChapter ? null : (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-6 shadow-sm">
                        <h4 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                            <Icon name="plus-circle" /> Nouveau bloc
                        </h4>
                        <div className="flex gap-2 flex-col md:flex-row">
                            <input
                                placeholder="Titre (ex: Théorème de Pythagore)"
                                className="flex-1 border p-3 rounded-xl shadow-sm outline-none focus:ring-2 ring-indigo-200"
                                value={newChapterTitle}
                                onChange={e => setNewChapterTitle(e.target.value)}
                            />
                            <input
                                placeholder="Rubrique (ex: Manuel)"
                                className="border p-3 rounded-xl shadow-sm outline-none md:w-48 focus:ring-2 ring-indigo-200"
                                value={newChapterSection}
                                onChange={e => setNewChapterSection(e.target.value)}
                            />
                            <button
                                onClick={handleSaveChapter}
                                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-md transition-transform active:scale-95"
                            >
                                Créer
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}