import { useState, useEffect } from 'react';
import { db, storage } from '../../firebase';
import {
    collection, query, where, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, writeBatch, serverTimestamp, setDoc, getDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { toast } from 'react-hot-toast';

export const useCoursesAdmin = () => {
    const [selectedLevel, setSelectedLevel] = useState("3ème");
    const [chapters, setChapters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [allClassesConfig, setAllClassesConfig] = useState({});

    // --- NOUVEAU : État pour la modale de confirmation ---
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });

    // États UI et formulaires
    const [newClassInput, setNewClassInput] = useState("");
    const [showClassManager, setShowClassManager] = useState(false);
    const [editingChapter, setEditingChapter] = useState(null);
    const [newChapterTitle, setNewChapterTitle] = useState("");
    const [newChapterSection, setNewChapterSection] = useState("Chapitres");
    const [expandedChapter, setExpandedChapter] = useState(null);
    const [docs, setDocs] = useState({});
    const [uploading, setUploading] = useState(false);
    const [showDocForm, setShowDocForm] = useState(null);
    const [editingDoc, setEditingDoc] = useState(null);
    const [docFiles, setDocFiles] = useState([]);
    const [docTitle, setDocTitle] = useState("");
    const [docType, setDocType] = useState("FILE");
    const [docUrl, setDocUrl] = useState("");
    const [selectedClasses, setSelectedClasses] = useState([]);

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

    // --- MODIFIÉ : Utilise la modale custom ---
    const handleDeleteClass = (cls) => {
        setConfirmDialog({
            isOpen: true,
            message: `Supprimer cette classe (${cls}) ?`,
            onConfirm: async () => {
                const newConfig = { ...allClassesConfig, [selectedLevel]: (allClassesConfig[selectedLevel] || []).filter(c => c !== cls) };
                try {
                    await setDoc(doc(db, "config", "courses"), newConfig);
                    setAllClassesConfig(newConfig);
                } catch (e) { toast.error("Erreur suppression"); }
                setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
            }
        });
    };

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

    // --- MODIFIÉ : Utilise la modale custom ---
    const handleDeleteChapter = (chapter) => {
        setConfirmDialog({
            isOpen: true,
            message: `Supprimer le chapitre "${chapter.title}" et TOUS ses documents ?\nCette action est irréversible.`,
            onConfirm: async () => {
                try {
                    const batch = writeBatch(db);
                    const docsSnap = await getDocs(query(collection(db, "courses_docs"), where("chapterId", "==", chapter.id)));
                    docsSnap.forEach(d => batch.delete(d.ref));
                    batch.delete(doc(db, "courses_chapters", chapter.id));
                    await batch.commit();
                    fetchChapters();
                    toast.success("Supprimé");
                } catch (e) { toast.error("Erreur suppression"); }
                setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
            }
        });
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
        setDocFiles([]);
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

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const filesArray = Array.from(e.target.files);
            setDocFiles(filesArray);
            if (filesArray.length === 1) {
                const nameWithoutExt = filesArray[0].name.split('.').slice(0, -1).join('.');
                setDocTitle(nameWithoutExt);
            } else {
                setDocTitle("");
            }
        }
    };

    const handleSaveDoc = async (chapterId) => {
        if (docType === 'LINK' && !docUrl) return toast.error("URL manquante");

        if (editingDoc || docType === 'LINK' || (docType === 'FILE' && docFiles.length <= 1)) {
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
        } else {
            setUploading(true);
            try {
                const currentDocs = docs[chapterId] || [];
                let startOrder = currentDocs.length > 0 ? Math.max(...currentDocs.map(d => d.order || 0)) + 1 : 1;

                for (let i = 0; i < docFiles.length; i++) {
                    const file = docFiles[i];
                    const autoTitle = file.name.split('.').slice(0, -1).join('.');
                    const ext = file.name.split('.').pop();
                    const safeName = autoTitle.replace(/[^a-z0-9]/gi, '_');
                    const fileName = `${Date.now()}_${i}_${safeName}.${ext}`;

                    const fileRef = ref(storage, `courses/${selectedLevel}/${chapterId}/${fileName}`);
                    const snapshot = await uploadBytes(fileRef, file);
                    const downloadUrl = await getDownloadURL(snapshot.ref);

                    await addDoc(collection(db, "courses_docs"), {
                        chapterId,
                        title: autoTitle,
                        type: 'FILE',
                        url: downloadUrl,
                        storagePath: snapshot.ref.fullPath,
                        mimeType: file.type,
                        classes: selectedClasses.length > 0 ? selectedClasses : ['ALL'],
                        order: startOrder + i,
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

    // --- MODIFIÉ : Utilise la modale custom ---
    const handleDeleteDoc = (docData) => {
        setConfirmDialog({
            isOpen: true,
            message: `Supprimer le document "${docData.title}" ?`,
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, "courses_docs", docData.id));
                    if (docData.storagePath) await deleteObject(ref(storage, docData.storagePath)).catch(() => { });
                    fetchDocs(docData.chapterId);
                } catch (e) { toast.error("Erreur suppression"); }
                setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
            }
        });
    };

    const groupedChapters = chapters.reduce((acc, chapter) => {
        const section = chapter.section || "Chapitres";
        if (!acc[section]) acc[section] = [];
        acc[section].push(chapter);
        return acc;
    }, {});

    const currentClasses = allClassesConfig[selectedLevel] || [];

    return {
        selectedLevel, setSelectedLevel,
        chapters, setChapters,
        loading, setLoading,
        allClassesConfig, setAllClassesConfig,
        newClassInput, setNewClassInput,
        showClassManager, setShowClassManager,
        editingChapter, setEditingChapter,
        newChapterTitle, setNewChapterTitle,
        newChapterSection, setNewChapterSection,
        expandedChapter, setExpandedChapter,
        docs, setDocs,
        uploading, setUploading,
        showDocForm, setShowDocForm,
        editingDoc, setEditingDoc,
        docFiles, setDocFiles,
        docTitle, setDocTitle,
        docType, setDocType,
        docUrl, setDocUrl,
        selectedClasses, setSelectedClasses,

        // --- NOUVEAU : Exporter les états de la modale ---
        confirmDialog, setConfirmDialog,

        groupedChapters, currentClasses,
        fetchClassesConfig, fetchChapters, fetchDocs, toggleChapter,
        handleAddClass, handleDeleteClass, handleSaveChapter, handleDeleteChapter,
        moveChapter, moveDoc, openAddForm, openEditForm, toggleClassTag,
        handleFileSelect, handleSaveDoc, handleDeleteDoc
    };
};