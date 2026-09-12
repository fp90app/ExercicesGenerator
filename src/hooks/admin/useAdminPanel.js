import { useState, useEffect } from 'react';
import { db, storage } from '../../firebase';
import {
    doc, setDoc, deleteDoc, updateDoc, collection, getDocs, getDoc,
    query, where, limit, orderBy, arrayUnion, arrayRemove, writeBatch
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, listAll } from "firebase/storage";
import { toast } from 'react-hot-toast';
import * as math from 'mathjs';
import { parseAndValidateExercise } from '../../utils/validators';
import { AUTOMATISMES_DATA } from '../../utils/data';

// ============================================================================
// UTILITAIRE : GÉNÉRATEUR D'APERÇU DYNAMIQUE
// ============================================================================
export const generatePreviewData = (jsonConfig, level = 1) => {
    let config;
    try { config = JSON.parse(jsonConfig); } catch (e) { return { error: "JSON Invalide" }; }

    try {
        const lvlKey = String(level);
        let levelBase = config.levels ? (config.levels[lvlKey] || config.levels["1"]) : config;
        if (!levelBase) throw new Error(`Niveau ${level} non trouvé.`);

        let activeData = { ...levelBase };

        if (activeData.variations && Array.isArray(activeData.variations) && activeData.variations.length > 0) {
            const variant = activeData.variations[Math.floor(Math.random() * activeData.variations.length)];
            activeData = {
                ...activeData,
                ...variant,
                variables: { ...(activeData.variables || {}), ...(variant.variables || {}) },
                calculations: { ...(activeData.calculations || {}), ...(variant.calculations || {}) },
                visual_config_override: { ...(activeData.visual_config_override || {}), ...(variant.visual_config_override || {}) }
            };
        }

        let scope = {};
        let toEvaluate = { ...activeData.variables, ...activeData.calculations };
        let remainingKeys = Object.keys(toEvaluate);

        for (let pass = 0; pass < 5; pass++) {
            let nextRemaining = [];
            remainingKeys.forEach(key => {
                try {
                    let expr = toEvaluate[key];
                    if (typeof expr === 'string' && !expr.match(/[+\-*/^()\[\]]/) && !expr.includes('random')) {
                        scope[key] = expr;
                    } else {
                        scope[key] = math.evaluate(String(expr), scope);
                    }
                } catch (e) {
                    nextRemaining.push(key);
                }
            });
            remainingKeys = nextRemaining;
            if (remainingKeys.length === 0) break;
        }

        remainingKeys.forEach(k => scope[k] = "ERR");

        const replaceVars = (text) => {
            if (typeof text !== 'string') return text;
            return text.replace(/\{(\w+)\}/g, (_, key) => {
                const val = scope[key];
                if (val === undefined) return `{${key}}`;
                return (typeof val === 'number' && !Number.isInteger(val)) ? Math.round(val * 100) / 100 : val;
            });
        };

        let qText = replaceVars(activeData.question_template || "Question ?");
        let expText = replaceVars(activeData.explanation_template || "");

        let correct = activeData.correct_answer;
        if (correct && typeof correct === 'string') {
            correct = replaceVars(correct);
            try { if (isNaN(Number(correct))) correct = math.evaluate(correct, scope); } catch (e) { }
        }

        let visualData = null;
        const rawVisual = { ...(config.common_config?.visual_config_template || {}), ...(activeData.visual_config_override || {}) };
        if (Object.keys(rawVisual).length > 0) {
            visualData = JSON.parse(replaceVars(JSON.stringify(rawVisual)));
        }

        return {
            question: qText,
            explanation: expText,
            correct,
            visualConfig: visualData,
            visualEngine: config.visual_engine,
            responseType: activeData.response_type || "NUMERIC",
            scope
        };
    } catch (e) { return { error: e.message }; }
};

// ============================================================================
// HOOK PRINCIPAL : LOGIQUE ADMIN
// ============================================================================
export const useAdminPanel = () => {
    const [activeTab, setActiveTab] = useState('USERS');
    const [loading, setLoading] = useState(false);
    const [tickets, setTickets] = useState([]);
    const [program, setProgram] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [config, setConfig] = useState({ newsMessage: "", newsColor: "blue", maintenance: false, vipTeacherIds: [] });
    const [contentRules, setContentRules] = useState({});
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, message: '', onConfirm: null });

    // Utilisateurs
    const [foundUsers, setFoundUsers] = useState([]);
    const [vipDetails, setVipDetails] = useState({});
    const [filterMode, setFilterMode] = useState('SEARCH_ID');
    const [userSearch, setUserSearch] = useState("");
    const [targetTeacher, setTargetTeacher] = useState("");

    // Éditeur
    const [jsonInput, setJsonInput] = useState("");
    const [isValidJson, setIsValidJson] = useState(true);
    const [imageFile, setImageFile] = useState(null);
    const [uploadedUrl, setUploadedUrl] = useState("");
    const [galleryImages, setGalleryImages] = useState([]);
    const [previewData, setPreviewData] = useState(null);
    const [previewLevel, setPreviewLevel] = useState(1);
    const [currentDocId, setCurrentDocId] = useState("");

    const fetchConfig = async () => {
        try {
            const snap = await getDoc(doc(db, "config", "general"));
            if (snap.exists()) setConfig(snap.data());
        } catch (e) { console.error("Erreur config:", e); }
    };

    const fetchProgram = async () => {
        try {
            const q = query(collection(db, "structure_automatismes"), orderBy("order"));
            const snap = await getDocs(q);
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (list.length === 0) toast("Aucun programme trouvé.", { icon: 'ℹ️' });
            setProgram(list);
        } catch (e) { toast.error("Impossible de charger le programme."); }
    };

    const fetchContentRules = async () => {
        try {
            const snap = await getDoc(doc(db, "config", "content"));
            if (snap.exists()) setContentRules(snap.data());
        } catch (e) { console.error(e); }
    };

    const fetchSubjects = async () => {
        try {
            const snap = await getDocs(collection(db, "annales"));
            const list = snap.docs.map(d => d.data());
            list.sort((a, b) => (b.id || "").localeCompare(a.id || ""));
            setSubjects(list);
        } catch (e) { console.error(e); }
    };

    const fetchGallery = async () => {
        try {
            const listRef = ref(storage, 'brevet_assets');
            const res = await listAll(listRef);
            const urls = await Promise.all(res.items.slice(0, 12).map(async (item) => ({ name: item.name, url: await getDownloadURL(item) })));
            setGalleryImages(urls);
        } catch (e) { console.error(e); }
    };

    const fetchTickets = async () => {
        try {
            const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"), limit(50));
            const snap = await getDocs(q);
            setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { toast.error("Impossible de charger les messages"); }
    };

    const fetchVipNames = async (ids) => {
        if (!ids || ids.length === 0) return;
        const details = {};
        await Promise.all(ids.map(async (profId) => {
            try {
                const docRef = doc(db, "profs", profId);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const d = snap.data();
                    const prenomInitial = d.prenom ? d.prenom.charAt(0).toUpperCase() + "." : "";
                    details[profId] = `${d.nom.toUpperCase()} ${prenomInitial}`;
                } else { details[profId] = "Prof introuvable"; }
            } catch (e) { details[profId] = "Erreur"; }
        }));
        setVipDetails(details);
    };

    useEffect(() => {
        fetchConfig();
        if (activeTab === 'LIST') fetchSubjects();
        if (activeTab === 'EDITOR') { fetchGallery(); fetchProgram(); }
        if (activeTab === 'CONTENT') { fetchContentRules(); fetchSubjects(); fetchProgram(); }
        if (activeTab === 'MESSAGES') { fetchTickets(); }
    }, [activeTab]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (jsonInput.trim()) setPreviewData(generatePreviewData(jsonInput, previewLevel));
        }, 800);
        return () => clearTimeout(timer);
    }, [jsonInput, previewLevel]);

    useEffect(() => {
        if (config.vipTeacherIds && config.vipTeacherIds.length > 0) fetchVipNames(config.vipTeacherIds);
    }, [config.vipTeacherIds]);

    const handleDeleteTicket = (id) => {
        setConfirmDialog({
            isOpen: true,
            message: "Supprimer ce message de la boîte de réception ?",
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, "tickets", id));
                    setTickets(prev => prev.filter(t => t.id !== id));
                    toast.success("Message supprimé");
                } catch (e) { toast.error("Erreur suppression"); }
                setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
            }
        });
    };

    const loadExerciseIntoEditor = async (id) => {
        try {
            const docRef = doc(db, "structure_automatismes", id);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                const jsonString = JSON.stringify(data, null, 2);
                setJsonInput(jsonString);
                setCurrentDocId(id);
                setPreviewData(generatePreviewData(jsonString, 1));
                toast.success("Exercice chargé !");
            } else { toast.error("Introuvable"); }
        } catch (e) { toast.error(e.message); }
    };

    const handleSave = async () => {
        const validation = parseAndValidateExercise(jsonInput);
        if (!validation.success) {
            toast.error("Erreur de validation :\n" + validation.error, { duration: 5000, style: { border: '2px solid red' } });
            return;
        }
        try {
            await setDoc(doc(db, "structure_automatismes", validation.data.id), validation.data);
            toast.success(`Exercice "${validation.data.id}" sauvegardé et validé !`);
            fetchProgram();
        } catch (e) { toast.error("Erreur Firestore : " + e.message); }
    };

    const handleAddExo = async (catId, currentExos) => {
        const title = prompt("Titre du nouvel exercice ?");
        if (!title) return;
        const suggestId = "auto_" + title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '_');
        const id = prompt("Identifiant unique (ID) ?", suggestId);
        if (!id) return;

        if (currentExos.some(e => e.id === id)) return toast.error("Cet ID existe déjà !");

        // NOUVEAU : On intègre visibleFor: ["3ème"] par défaut
        const newExo = { id, title, type: 'GENERATOR', isPremium: false, visibleFor: ["3ème"] };

        const defaultStructure = {
            id: id, visual_engine: "NONE",
            levels: {
                "1": {
                    "variables": { "x": "randomInt(1, 10)", "y": "randomInt(1, 10)" },
                    "question_template": "Calculer $ {x} + {y} $.",
                    "correct_answer": "x + y",
                    "calculations": {},
                    "explanation_template": "C'est une simple addition : $ {x} + {y} = ... $",
                    "xp_reward": 5
                }
            }
        };

        try {
            const batch = writeBatch(db);
            batch.update(doc(db, "structure_automatismes", catId), { exos: [...currentExos, newExo] });
            batch.set(doc(db, "structure_automatismes", id), defaultStructure);
            await batch.commit();
            toast.success("Exercice créé et initialisé !");
            fetchProgram();
        } catch (e) { toast.error(e.message); }
    };

    const handleDeleteExo = (catId, currentExos, exoId) => {
        setConfirmDialog({
            isOpen: true,
            message: "⚠️ Supprimer cet exercice du menu ?",
            onConfirm: async () => {
                try {
                    await updateDoc(doc(db, "structure_automatismes", catId), { exos: currentExos.filter(e => e.id !== exoId) });
                    toast.success("Exercice retiré.");
                    fetchProgram();
                } catch (e) { toast.error(e.message); }
                setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
            }
        });
    };

    // NOUVEAU : Fonction pour mettre à jour la visibilité d'un exercice
    const handleUpdateVisibility = async (catId, currentExos, exoId, visibleForArray) => {
        try {
            const updatedExos = currentExos.map(e =>
                e.id === exoId ? { ...e, visibleFor: visibleForArray } : e
            );
            await updateDoc(doc(db, "structure_automatismes", catId), { exos: updatedExos });
            toast.success("Visibilité mise à jour !");
            fetchProgram();
        } catch (e) {
            toast.error("Erreur de mise à jour : " + e.message);
        }
    };

    const handleFilter = async () => {
        setLoading(true); setFoundUsers([]);
        try {
            let qQuery;
            const usersRef = collection(db, "eleves");
            switch (filterMode) {
                case 'SEARCH_ID':
                    if (!userSearch.trim()) { toast.error("Entrez un identifiant."); setLoading(false); return; }
                    qQuery = query(usersRef, where("identifiant", "==", userSearch.trim().toUpperCase()));
                    break;
                case 'AUTONOMOUS': qQuery = query(usersRef, where("profId", "==", "autonome"), limit(50)); break;
                case 'PREMIUM': qQuery = query(usersRef, where("status", "==", "premium"), limit(50)); break;
                case 'TEACHER':
                    if (!targetTeacher.trim()) { toast.error("Choisis un prof."); setLoading(false); return; }
                    qQuery = query(usersRef, where("profId", "==", targetTeacher.trim()), limit(50));
                    break;
                case 'RECENT': default: qQuery = query(usersRef, limit(50)); break;
            }
            const snap = await getDocs(qQuery);
            const list = [];
            snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
            list.sort((a, b) => (a.nom || "").localeCompare(b.nom || ""));
            setFoundUsers(list);
            if (list.length === 0) toast("Aucun élève trouvé.", { icon: '🤷‍♂️' });
            else toast.success(`${list.length} élèves trouvés.`);
        } catch (e) { toast.error("Erreur recherche : " + e.message); }
        setLoading(false);
    };

    const handleDeleteUser = (u) => {
        setConfirmDialog({
            isOpen: true,
            message: `⚠️ ATTENTION ⚠️\n\nTu vas supprimer définitivement le compte de "${u.nom}".\n\nContinuer ?`,
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, "eleves", u.id));
                    setFoundUsers(prev => prev.filter(user => user.id !== u.id));
                    toast.success("Compte supprimé.");
                } catch (e) { toast.error(e.message); }
                setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
            }
        });
    };

    const togglePremiumUser = (u) => {
        const newStatus = u.status === 'premium' ? 'free' : 'premium';
        setConfirmDialog({
            isOpen: true,
            message: `Passer ${u.nom} en ${newStatus.toUpperCase()} ?`,
            onConfirm: async () => {
                try {
                    await updateDoc(doc(db, "eleves", u.id), { status: newStatus });
                    setFoundUsers(prev => prev.map(user => user.id === u.id ? { ...user, status: newStatus } : user));
                    toast.success(`Statut changé : ${newStatus}`);
                } catch (e) { toast.error(e.message); }
                setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
            }
        });
    };

    const saveConfig = async () => {
        try {
            await updateDoc(doc(db, "config", "general"), {
                newsMessage: config.newsMessage || "",
                newsColor: config.newsColor || "blue",
                maintenance: config.maintenance || false
            });
            toast.success("⚙️ Configuration mise à jour !");
        } catch (e) { toast.error(e.message); }
    };

    const cycleRule = async (key, currentStatus) => {
        const nextStatus = { 'FREE': 'PREMIUM', 'PREMIUM': 'LOCKED', 'LOCKED': 'FREE' };
        const next = nextStatus[currentStatus] || 'PREMIUM';
        setContentRules({ ...contentRules, [key]: next });
        try {
            await setDoc(doc(db, "config", "content"), { [key]: next }, { merge: true });
            toast.success("Règle mise à jour !");
        } catch (e) { toast.error("Erreur"); fetchContentRules(); }
    };

    const getCurrentStatus = (key, defaultState = 'PREMIUM') => contentRules[key] || defaultState;

    const handleUpload = async () => {
        if (!imageFile) return;
        setLoading(true);
        try {
            const storageRef = ref(storage, `brevet_assets/${Date.now()}_${imageFile.name}`);
            const snap = await uploadBytes(storageRef, imageFile);
            const url = await getDownloadURL(snap.ref);
            setUploadedUrl(url);
            fetchGallery();
            toast.success("Image uploadée !");
        } catch (e) { toast.error(e.message); }
        setLoading(false);
    };

    const togglePublish = async (sujet) => {
        try {
            const newVal = !sujet.published;
            await updateDoc(doc(db, "annales", sujet.id), { published: newVal });
            setSubjects(prev => prev.map(s => s.id === sujet.id ? { ...s, published: newVal } : s));
            toast.success(newVal ? "Sujet publié !" : "Sujet dépublié.");
        } catch (e) { toast.error(e.message); }
    };

    const deleteSubject = (id, title) => {
        setConfirmDialog({
            isOpen: true,
            message: `Supprimer DÉFINITIVEMENT le sujet "${title}" ?`,
            onConfirm: async () => {
                await deleteDoc(doc(db, "annales", id));
                fetchSubjects();
                toast.success("Sujet supprimé.");
                setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
            }
        });
    };

    const loadSubjectIntoEditor = (sujet) => {
        setJsonInput(JSON.stringify(sujet, null, 2));
        setActiveTab('EDITOR');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const migrateDataToFirestore = () => {
        setConfirmDialog({
            isOpen: true,
            message: "⚠️ ACTION IRRÉVERSIBLE ⚠️\nÉcraser la structure dans Firestore avec data.js ?",
            onConfirm: async () => {
                setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
                setLoading(true);
                try {
                    const batch = writeBatch(db);
                    AUTOMATISMES_DATA.forEach((cat, index) => {
                        const cleanTitle = cat.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
                        const docId = `${String(index + 1).padStart(2, '0')}_${cleanTitle}`;
                        const docRef = doc(db, "structure_automatismes", docId);
                        batch.set(docRef, {
                            title: cat.title, color: cat.color, order: index + 1, published: true,
                            exos: cat.exos.map(e => ({ ...e, isPremium: false, type: 'GENERATOR', visibleFor: ["3ème"] }))
                        });
                    });
                    await batch.commit();
                    toast.success("✅ Migration réussie !");
                    if (activeTab === 'CONTENT') fetchProgram();
                } catch (e) { toast.error("❌ Échec : " + e.message); }
                finally { setLoading(false); }
            }
        });
    };

    return {
        activeTab, setActiveTab, loading, tickets, program, subjects, config, setConfig,
        contentRules, foundUsers, vipDetails, filterMode, setFilterMode, userSearch, setUserSearch,
        targetTeacher, setTargetTeacher, jsonInput, setJsonInput, isValidJson, imageFile, setImageFile,
        uploadedUrl, galleryImages, previewData, setPreviewData, previewLevel, setPreviewLevel,
        currentDocId, confirmDialog, setConfirmDialog,
        fetchTickets, handleDeleteTicket, loadExerciseIntoEditor, handleSave, handleAddExo,
        handleDeleteExo, handleFilter, handleDeleteUser, togglePremiumUser, saveConfig,
        cycleRule, getCurrentStatus, handleUpload, togglePublish, deleteSubject, loadSubjectIntoEditor, migrateDataToFirestore,
        handleUpdateVisibility // NOUVEAU
    };
};