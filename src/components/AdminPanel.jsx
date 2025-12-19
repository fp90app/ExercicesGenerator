import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
// On regroupe tous les imports Firestore ici
import {
    doc, setDoc, deleteDoc, updateDoc, collection, getDocs, getDoc,
    query, where, limit, orderBy, arrayUnion, arrayRemove, writeBatch
} from "firebase/firestore";

// Imports Storage
import { ref, uploadBytes, getDownloadURL, listAll } from "firebase/storage";
import { Icon } from './UI';
import { toast } from 'react-hot-toast';
import MathText from './MathText';
import Editor from "@monaco-editor/react";
import { parseAndValidateExercise } from '../utils/validators';

// NOTE : On retire l'import de AUTOMATISMES_DATA car on passe en mode Dynamique !
import { AUTOMATISMES_DATA } from '../utils/data'; // Gardé uniquement pour la migration de secours

// Ajoutez mathjs pour calculer l'aperçu en direct
import * as math from 'mathjs';
import { processLevelData } from '../utils/mathGenerators';

// Importez vos moteurs visuels pour l'aperçu
import PythagoreSystem from './PythagoreSystem';
import NumberLineSystem from './NumberLineSystem';
import CartesianSystem from './CartesianSystem';
import GeometrySystem from './GeometrySystem';

// (Vous pourrez ajouter ThalesSystem ici plus tard)

const ENGINE_REGISTRY = {
    'ENGINE_PYTHAGORE': PythagoreSystem,
    'ENGINE_NUMBER_LINE': NumberLineSystem,
    'ENGINE_CARTESIAN': CartesianSystem,
    'ENGINE_GEOMETRY': GeometrySystem,
    // Quand tu auras Thalès, décommente juste la ligne dessous :
    // 'ENGINE_THALES': ThalesSystem,
};

// --- UTILITAIRE : GÉNÉRATEUR D'APERÇU (Simule useMathGenerator) ---
// Remplace ta fonction generatePreviewData actuelle par celle-ci

const generatePreviewData = (jsonConfig, level = 1) => {
    let config;
    try { config = JSON.parse(jsonConfig); } catch (e) { return { error: "JSON Invalide" }; }

    try {
        const lvlKey = String(level);
        // On récupère la config de base du niveau
        let levelBase = config.levels ? (config.levels[lvlKey] || config.levels["1"]) : config;
        if (!levelBase) throw new Error(`Niveau ${level} non trouvé.`);

        // --- CHANGEMENT DRASTIQUE : GESTION DES VARIATIONS ---
        // Si le niveau contient une liste "variations", on en choisit une et on l'écrase sur la base
        let activeData = { ...levelBase };

        if (activeData.variations && Array.isArray(activeData.variations) && activeData.variations.length > 0) {
            // 1. Choix aléatoire d'une variation
            const variant = activeData.variations[Math.floor(Math.random() * activeData.variations.length)];

            // 2. Fusion intelligente : La variation GAGNE sur la base
            activeData = {
                ...activeData,            // On garde les defaults (ex: xp_reward)
                ...variant,               // On écrase avec la variante (ex: question_template)
                // On fusionne les variables et calculations au lieu de les remplacer totalement
                variables: { ...(activeData.variables || {}), ...(variant.variables || {}) },
                calculations: { ...(activeData.calculations || {}), ...(variant.calculations || {}) },
                visual_config_override: { ...(activeData.visual_config_override || {}), ...(variant.visual_config_override || {}) }
            };
        }

        // --- SUITE CLASSIQUE (MathJS) ---
        let scope = {};
        let toEvaluate = { ...activeData.variables, ...activeData.calculations };
        let remainingKeys = Object.keys(toEvaluate);

        // Boucle de résolution (5 passes max)
        for (let pass = 0; pass < 5; pass++) {
            let nextRemaining = [];
            remainingKeys.forEach(key => {
                try {
                    // On évalue seulement si c'est nécessaire
                    let expr = toEvaluate[key];
                    // Si c'est une chaîne simple sans maths, on la garde telle quelle (évite les bugs de texte)
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

        // Remplacement Variables dans les Textes
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

        // Config Visuelle
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


const AdminPanel = ({ user, onBack }) => {

    // ========================================================================
    // 🔒 SÉCURITÉ RENFORCÉE
    // ========================================================================
    const userRole = user?.role || user?.data?.role;
    const isAdmin = user?.data?.isAdmin === true;


    if (userRole !== 'teacher' || !isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100 font-sans p-4">
                <div className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-md border border-red-100 w-full">
                    <div className="text-6xl mb-4">⛔</div>
                    <h1 className="text-2xl font-black text-red-600 mb-2">Accès Refusé</h1>
                    <p className="text-slate-600 mb-6">Zone réservée aux supers-administrateurs.</p>
                    <button onClick={onBack} className="px-6 py-2 rounded-xl font-bold bg-slate-800 text-white">Retour</button>
                </div>
            </div>
        );
    }

    // ========================================================================
    // 🚀 APPLICATION ADMIN
    // ========================================================================

    const [activeTab, setActiveTab] = useState('USERS'); // USERS, CONTENT, CONFIG, LIST, EDITOR
    const [loading, setLoading] = useState(false);

    // --- DONNÉES CMS (NOUVEAU) ---
    const [program, setProgram] = useState([]); // Le programme chargé depuis Firestore

    // Données Globales existantes
    const [subjects, setSubjects] = useState([]);
    const [config, setConfig] = useState({ newsMessage: "", newsColor: "blue", maintenance: false, vipTeacherIds: [] });
    const [contentRules, setContentRules] = useState({});

    // Gestion Utilisateurs & Filtres
    const [foundUsers, setFoundUsers] = useState([]);
    const [vipDetails, setVipDetails] = useState({});
    const [filterMode, setFilterMode] = useState('SEARCH_ID');
    const [userSearch, setUserSearch] = useState("");
    const [targetTeacher, setTargetTeacher] = useState("");

    // Inputs Éditeur
    const [jsonInput, setJsonInput] = useState("");
    const [isValidJson, setIsValidJson] = useState(true);
    const [imageFile, setImageFile] = useState(null);
    const [uploadedUrl, setUploadedUrl] = useState("");
    const [galleryImages, setGalleryImages] = useState([]);


    const [previewData, setPreviewData] = useState(null);
    const [previewLevel, setPreviewLevel] = useState(1);
    const [currentDocId, setCurrentDocId] = useState("");

    const PreviewEngine = previewData && previewData.visualEngine
        ? ENGINE_REGISTRY[previewData.visualEngine]
        : null;

    // --- CHARGEMENT INITIAL ---
    useEffect(() => {
        fetchConfig();
        if (activeTab === 'LIST') fetchSubjects();

        // CORRECTION : On charge aussi le programme quand on va dans l'éditeur
        if (activeTab === 'EDITOR') {
            fetchGallery();
            fetchProgram();
        }

        if (activeTab === 'CONTENT') {
            fetchContentRules();
            fetchSubjects();
            fetchProgram();
        }
    }, [activeTab]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (jsonInput.trim()) setPreviewData(generatePreviewData(jsonInput, previewLevel));
        }, 800);
        return () => clearTimeout(timer);
    }, [jsonInput, previewLevel]);

    const loadExerciseIntoEditor = async (id) => {
        try {
            const docRef = doc(db, "structure_automatismes", id);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                const jsonString = JSON.stringify(data, null, 2);
                setJsonInput(jsonString);
                setCurrentDocId(id);
                // ON FORCE LA MISE A JOUR DE L'APERÇU ICI
                setPreviewData(generatePreviewData(jsonString, 1));
                toast.success("Exercice chargé !");
            } else { toast.error("Introuvable"); }
        } catch (e) { toast.error(e.message); }
    };

    const handleSave = async () => {
        // 1. Validation stricte
        const validation = parseAndValidateExercise(jsonInput);

        if (!validation.success) {
            // Affiche l'erreur précise à l'utilisateur
            toast.error("Erreur de validation :\n" + validation.error, {
                duration: 5000,
                style: { border: '2px solid red' }
            });
            return;
        }

        const data = validation.data;

        try {
            // 2. Sauvegarde des données NETTOYÉES
            await setDoc(doc(db, "structure_automatismes", data.id), data);
            toast.success(`Exercice "${data.id}" sauvegardé et validé !`);

            // Rafraîchir
            fetchProgram();
        } catch (e) {
            toast.error("Erreur Firestore : " + e.message);
        }
    };

    const forcePreview = () => {
        if (jsonInput.trim()) {
            setPreviewData(generatePreviewData(jsonInput, previewLevel));
            toast.success("Données régénérées");
        }
    };

    // ========================================================================
    // 1. GESTION DU PROGRAMME DYNAMIQUE (CMS) - NOUVELLES FONCTIONS
    // ========================================================================

    const fetchProgram = async () => {
        try {
            // On récupère les documents de la collection 'structure_automatismes' triés par 'order'
            const q = query(collection(db, "structure_automatismes"), orderBy("order"));
            const snap = await getDocs(q);
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (list.length === 0) {
                toast("Aucun programme trouvé dans Firestore.", { icon: 'ℹ️' });
            }
            setProgram(list);
        } catch (e) {
            console.error("Erreur programme:", e);
            toast.error("Impossible de charger le programme.");
        }
    };

    const handleAddExo = async (catId, currentExos) => {
        const title = prompt("Titre du nouvel exercice ?");
        if (!title) return;

        // Suggestion d'ID automatique propre (ex: "auto_calcul_mental")
        const suggestId = "auto_" + title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '_');
        const id = prompt("Identifiant unique (ID) ?", suggestId);
        if (!id) return;

        // Vérification doublon ID localement
        if (currentExos.some(e => e.id === id)) return alert("Cet ID existe déjà dans cette catégorie !");

        // Nouvel objet pour le MENU (liste de gauche)
        const newExo = {
            id,
            title,
            type: 'GENERATOR',
            isPremium: false
        };

        const updatedExos = [...currentExos, newExo];

        // --- NOUVEAU : Structure par défaut du document (pour l'éditeur) ---
        const defaultStructure = {
            id: id,
            visual_engine: "NONE", // Pas de moteur visuel par défaut
            levels: {
                "1": {
                    "variables": { "x": "randomInt(1, 10)", "y": "randomInt(1, 10)" },
                    "question_template": "Calculer $ {x} + {y} $.",
                    "correct_answer": "x + y",
                    "calculations": {}, // Pas de calculs complexes pour l'exemple
                    "explanation_template": "C'est une simple addition : $ {x} + {y} = ... $",
                    "xp_reward": 5
                }
            }
        };

        try {
            // On utilise un BATCH pour faire les 2 opérations en même temps
            // (Mise à jour du menu + Création du fichier)
            const batch = writeBatch(db);

            // 1. Mise à jour du Menu (Catégorie)
            const catRef = doc(db, "structure_automatismes", catId);
            batch.update(catRef, { exos: updatedExos });

            // 2. Création du Document de l'exercice
            const exoRef = doc(db, "structure_automatismes", id);
            batch.set(exoRef, defaultStructure);

            await batch.commit();

            toast.success("Exercice créé et initialisé !");
            fetchProgram(); // On rafraîchit la liste pour voir le changement
        } catch (e) {
            console.error(e);
            toast.error(e.message);
        }
    };

    const handleDeleteExo = async (catId, currentExos, exoId) => {
        if (!confirm("⚠️ Supprimer cet exercice du menu ?\n\n(Note : Les scores des élèves ne seront pas effacés de leur profil, mais ils ne verront plus l'accès.)")) return;

        const updatedExos = currentExos.filter(e => e.id !== exoId);
        try {
            await updateDoc(doc(db, "structure_automatismes", catId), { exos: updatedExos });
            toast.success("Exercice retiré.");
            fetchProgram();
        } catch (e) { toast.error(e.message); }
    };

    // ========================================================================
    // 2. GESTION CONFIG & VIP (EXISTANT)
    // ========================================================================
    const fetchConfig = async () => {
        try {
            const snap = await getDoc(doc(db, "config", "general"));
            if (snap.exists()) setConfig(snap.data());
        } catch (e) { console.error("Erreur config:", e); }
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
                } else {
                    details[profId] = "Prof introuvable";
                }
            } catch (e) { details[profId] = "Erreur"; }
        }));
        setVipDetails(details);
    };

    useEffect(() => {
        if (config.vipTeacherIds && config.vipTeacherIds.length > 0) {
            fetchVipNames(config.vipTeacherIds);
        }
    }, [config.vipTeacherIds]);

    const handleAddVip = async (idToAdd) => {
        if (!idToAdd) return;
        try {
            await updateDoc(doc(db, "config", "general"), { vipTeacherIds: arrayUnion(idToAdd.trim()) });
            setConfig(prev => ({ ...prev, vipTeacherIds: [...(prev.vipTeacherIds || []), idToAdd.trim()] }));
            toast.success(`Prof ${idToAdd} ajouté aux VIPs !`);
        } catch (e) { toast.error(e.message); }
    };

    const handleRemoveVip = async (idToRemove) => {
        if (!confirm("Retirer ce prof des VIP ? Ses élèves perdront le premium.")) return;
        try {
            await updateDoc(doc(db, "config", "general"), { vipTeacherIds: arrayRemove(idToRemove) });
            setConfig(prev => ({ ...prev, vipTeacherIds: prev.vipTeacherIds.filter(id => id !== idToRemove) }));
            toast.success("Prof retiré des VIPs.");
        } catch (e) { toast.error(e.message); }
    };

    // ========================================================================
    // 3. GESTION UTILISATEURS (EXISTANT)
    // ========================================================================
    const handleFilter = async () => {
        setLoading(true);
        setFoundUsers([]);
        try {
            let q;
            const usersRef = collection(db, "eleves");

            switch (filterMode) {
                case 'SEARCH_ID':
                    if (!userSearch.trim()) { toast.error("Entrez un identifiant."); setLoading(false); return; }
                    q = query(usersRef, where("identifiant", "==", userSearch.trim().toUpperCase()));
                    break;
                case 'AUTONOMOUS':
                    q = query(usersRef, where("profId", "==", "autonome"), limit(50));
                    break;
                case 'PREMIUM':
                    q = query(usersRef, where("status", "==", "premium"), limit(50));
                    break;
                case 'TEACHER':
                    if (!targetTeacher.trim()) { toast.error("Choisis un prof."); setLoading(false); return; }
                    q = query(usersRef, where("profId", "==", targetTeacher.trim()), limit(50));
                    break;
                case 'RECENT':
                default:
                    q = query(usersRef, limit(50));
                    break;
            }

            const snap = await getDocs(q);
            const list = [];
            snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
            list.sort((a, b) => (a.nom || "").localeCompare(b.nom || ""));

            setFoundUsers(list);
            if (list.length === 0) toast("Aucun élève trouvé.", { icon: '🤷‍♂️' });
            else toast.success(`${list.length} élèves trouvés.`);

        } catch (e) {
            console.error(e);
            toast.error("Erreur recherche : " + e.message);
        }
        setLoading(false);
    };

    const handleDeleteUser = async (u) => {
        if (!confirm(`⚠️ ATTENTION ⚠️\n\nTu vas supprimer définitivement "${u.nom}".\n\nContinuer ?`)) return;
        try {
            await deleteDoc(doc(db, "eleves", u.id));
            setFoundUsers(prev => prev.filter(user => user.id !== u.id));
            toast.success("Compte supprimé.");
        } catch (e) { toast.error("Erreur suppression : " + e.message); }
    };

    const togglePremiumUser = async (u) => {
        const newStatus = u.status === 'premium' ? 'free' : 'premium';
        if (!confirm(`Passer ${u.nom} en ${newStatus.toUpperCase()} ?`)) return;
        try {
            await updateDoc(doc(db, "eleves", u.id), { status: newStatus });
            setFoundUsers(prev => prev.map(user => user.id === u.id ? { ...user, status: newStatus } : user));
            toast.success(`Statut changé : ${newStatus}`);
        } catch (e) { toast.error(e.message); }
    };

    // ========================================================================
    // 4. GESTION DU CONTENU & RÈGLES (MODIFIÉ POUR CMS)
    // ========================================================================
    const fetchContentRules = async () => {
        try {
            const snap = await getDoc(doc(db, "config", "content"));
            if (snap.exists()) setContentRules(snap.data());
        } catch (e) { console.error(e); }
    };

    const cycleRule = async (key, currentStatus) => {
        const nextStatus = { 'FREE': 'PREMIUM', 'PREMIUM': 'LOCKED', 'LOCKED': 'FREE' };
        const next = nextStatus[currentStatus] || 'PREMIUM';
        const newRules = { ...contentRules, [key]: next };
        setContentRules(newRules);

        try {
            await setDoc(doc(db, "config", "content"), { [key]: next }, { merge: true });
            toast.success("Règle mise à jour !");
        } catch (e) {
            toast.error("Erreur sauvegarde règle");
            fetchContentRules();
        }
    };

    const getCurrentStatus = (key, defaultState = 'PREMIUM') => {
        return contentRules[key] || defaultState;
    };

    // ========================================================================
    // 5. GESTION SUJETS & STORAGE (EXISTANT)
    // ========================================================================
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

    const saveSubject = async () => {
        if (!jsonInput.trim()) return;
        try {
            const data = JSON.parse(jsonInput);
            if (!data.id) return toast.error("ID manquant !");
            if (data.published === undefined) data.published = false;
            await setDoc(doc(db, "annales", data.id), data);
            toast.success(`Sujet "${data.title}" sauvegardé !`);
            setJsonInput("");
            fetchSubjects();
        } catch (e) { toast.error("Erreur JSON : " + e.message); }
    };

    const togglePublish = async (sujet) => {
        try {
            const newVal = !sujet.published;
            await updateDoc(doc(db, "annales", sujet.id), { published: newVal });
            setSubjects(prev => prev.map(s => s.id === sujet.id ? { ...s, published: newVal } : s));
            toast.success(newVal ? "Sujet publié !" : "Sujet dépublié.");
        } catch (e) { toast.error(e.message); }
    };

    const deleteSubject = async (id, title) => {
        if (confirm(`Supprimer DÉFINITIVEMENT "${title}" ?`)) {
            await deleteDoc(doc(db, "annales", id));
            fetchSubjects();
            toast.success("Sujet supprimé.");
        }
    };

    const loadSubjectIntoEditor = (sujet) => {
        setJsonInput(JSON.stringify(sujet, null, 2));
        setActiveTab('EDITOR');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // --- MIGRATION ROBUSTE (BATCH) ---
    const migrateDataToFirestore = async () => {
        const confirmMsg = "⚠️ ACTION IRRÉVERSIBLE ⚠️\n\nCela va écraser la structure dans Firestore avec celle de data.js.\nUtilisez ceci uniquement pour l'initialisation ou une remise à zéro majeure.\n\nContinuer ?";
        if (!confirm(confirmMsg)) return;

        setLoading(true);
        try {
            const batch = writeBatch(db);
            AUTOMATISMES_DATA.forEach((cat, index) => {
                const cleanTitle = cat.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
                const docId = `${String(index + 1).padStart(2, '0')}_${cleanTitle}`;
                const docRef = doc(db, "structure_automatismes", docId);
                const categoryData = {
                    title: cat.title,
                    color: cat.color,
                    order: index + 1,
                    published: true,
                    exos: cat.exos.map(e => ({
                        ...e,
                        isPremium: false,
                        type: 'GENERATOR',
                    }))
                };
                batch.set(docRef, categoryData);
            });
            await batch.commit();
            toast.success("✅ Migration réussie ! Base de données structurée.");
            if (activeTab === 'CONTENT') fetchProgram();
        } catch (e) {
            console.error("Erreur migration Batch:", e);
            toast.error("❌ Échec : " + e.message);
        } finally {
            setLoading(false);
        }
    };

    // --- UI COMPOSANTS ---
    const TabButton = ({ id, label, icon }) => (
        <button onClick={() => setActiveTab(id)} className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold transition-colors ${activeTab === id ? 'bg-white text-indigo-600 border-t-4 border-indigo-600 shadow-sm' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}>
            <Icon name={icon} /> {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-slate-100 font-sans text-slate-800 pb-20">
            {/* HEADER */}
            <div className="bg-slate-900 text-white p-6 pt-8 shadow-lg mb-8">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="bg-slate-700 hover:bg-slate-600 p-2 rounded-lg"><Icon name="arrow-left" /></button>
                        <h1 className="text-2xl font-black flex items-center gap-3"><Icon name="crown" className="text-amber-400" /> Super-Admin</h1>
                    </div>
                    <div className="text-xs font-mono bg-slate-800 px-3 py-1 rounded border border-slate-700">v3.0 • CMS Ready</div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4">
                <div className="flex gap-2 border-b border-slate-300 overflow-x-auto">
                    <TabButton id="USERS" label="Utilisateurs" icon="users" />
                    <TabButton id="CONTENT" label="Contenu & Accès" icon="lock-key-open" />
                    <TabButton id="CONFIG" label="Config" icon="gear" />
                    <TabButton id="LIST" label="Brevets" icon="list-dashes" />
                    <button onClick={() => setActiveTab('EDITOR')} className={`px-4 py-2 font-bold rounded-t-xl transition-colors ${activeTab === 'EDITOR' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500'}`}>Éditeur JSON</button>
                </div>

                <div className="bg-white p-6 rounded-b-3xl rounded-tr-3xl shadow-sm min-h-[500px]">

                    {/* --- TAB: GESTION UTILISATEURS --- */}
                    {activeTab === 'USERS' && (
                        <div className="grid lg:grid-cols-3 gap-8">
                            {/* COLONNE GAUCHE (LARGE) : FILTRES ET RÉSULTATS */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Icon name="funnel" /> Filtrer les élèves</h3>

                                    {/* Boutons de Choix */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {[
                                            { id: 'SEARCH_ID', label: 'Par ID', icon: 'magnifying-glass' },
                                            { id: 'AUTONOMOUS', label: 'Autonomes', icon: 'robot' },
                                            { id: 'PREMIUM', label: 'Premium', icon: 'crown' },
                                            { id: 'TEACHER', label: 'Par Prof', icon: 'chalkboard-teacher' },
                                            { id: 'RECENT', label: '50 Récents', icon: 'clock' },
                                        ].map(m => (
                                            <button key={m.id} onClick={() => setFilterMode(m.id)} className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all ${filterMode === m.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'}`}>
                                                <Icon name={m.icon} /> {m.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Zone de saisie dynamique */}
                                    <div className="flex gap-2">
                                        {filterMode === 'SEARCH_ID' && (
                                            <input type="text" className="flex-1 p-3 border-2 border-slate-200 rounded-xl font-bold uppercase outline-none focus:border-indigo-500" placeholder="Identifiant exact (ex: TOMA90)..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                                        )}
                                        {filterMode === 'TEACHER' && (
                                            <select
                                                className="ml-4 p-2 rounded border border-slate-300 text-sm font-bold text-slate-700 max-w-[250px]"
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        loadExerciseIntoEditor(e.target.value);
                                                    }
                                                }}
                                                defaultValue=""
                                            >
                                                <option value="">-- Charger un exercice --</option>

                                                {/* OPTION DE SECOURS (Test) */}
                                                <option value="auto_pythagore_demo" className="font-bold text-indigo-600">
                                                    ✨ Pythagore Demo (Test)
                                                </option>

                                                {/* LISTE DYNAMIQUE (Base de données) */}
                                                {program.map(cat => (
                                                    <optgroup key={cat.id} label={cat.title}>
                                                        {cat.exos.map(e => (
                                                            <option key={e.id} value={e.id}>
                                                                {e.title}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                ))}
                                            </select>
                                        )}
                                        <button onClick={handleFilter} className="bg-slate-800 text-white px-6 rounded-xl font-bold hover:bg-black shadow-lg flex items-center gap-2">
                                            {loading ? "..." : <span><Icon name="arrows-clockwise" /> Charger</span>}
                                        </button>
                                    </div>
                                </div>

                                {/* LISTE RÉSULTATS */}
                                <div className="space-y-3">
                                    {foundUsers.map(u => (
                                        <div key={u.id} className="p-4 rounded-xl border flex justify-between items-center bg-white shadow-sm hover:shadow-md transition-all">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-lg text-slate-800">{u.nom || "Sans Nom"}</span>
                                                    {u.status === 'premium' && <span className="bg-amber-100 text-amber-700 text-[10px] px-2 rounded-full font-bold border border-amber-200 flex items-center gap-1"><Icon name="crown" weight="fill" size={10} /> Premium</span>}
                                                </div>
                                                <div className="text-xs text-slate-500 font-mono mt-1">
                                                    ID: <span className="font-bold select-all">{u.identifiant}</span> •
                                                    Prof: {u.profId === 'autonome' ? <span className="text-orange-500 font-bold">Autonome</span> : <span className="text-indigo-600">{vipDetails[u.profId] || u.profId}</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => togglePremiumUser(u)} className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all ${u.status === 'premium' ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-slate-100 hover:text-slate-400' : 'bg-slate-50 text-slate-300 border-slate-200 hover:bg-amber-50 hover:text-amber-500'}`} title={u.status === 'premium' ? "Désactiver Premium" : "Activer Premium"}>
                                                    <Icon name="crown" weight="fill" />
                                                </button>
                                                <button onClick={() => handleDeleteUser(u)} className="w-10 h-10 flex items-center justify-center bg-white text-red-400 border border-slate-200 rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors" title="Supprimer ce compte">
                                                    <Icon name="trash" weight="bold" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {foundUsers.length === 0 && !loading && (
                                        <div className="text-slate-400 text-sm italic text-center p-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                            <Icon name="users" className="text-4xl mb-2 opacity-20 mx-auto" />
                                            <p>Sélectionne un filtre et clique sur "Charger".</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* COLONNE DROITE : RENDU VISUEL */}
                            <div className="bg-slate-100 rounded-xl border-2 border-slate-200 p-6 flex flex-col relative overflow-hidden min-h-[600px]">

                                {/* Header avec boutons de niveau */}
                                <div className="flex justify-between items-center mb-4 z-10 relative">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Aperçu en direct</label>

                                    <div className="flex gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                                        {[1, 2, 3].map(lvl => (
                                            <button
                                                key={lvl}
                                                onClick={() => {
                                                    setPreviewLevel(lvl);
                                                    // On régénère immédiatement l'aperçu quand on change de niveau
                                                    if (jsonInput) setPreviewData(generatePreviewData(jsonInput, lvl));
                                                }}
                                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${previewLevel === lvl ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                                            >
                                                Niv {lvl}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Fond "Cahier" */}
                                <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#64748b_1px,transparent_1px)] [background-size:16px_16px]"></div>

                                {/* AFFICHAGE DE L'APERÇU (Basé sur previewData) */}
                                {previewData && !previewData.error ? (
                                    <div className="flex-1 flex flex-col items-center justify-start z-10 gap-6 animate-in fade-in slide-in-from-bottom-4 overflow-y-auto">

                                        {/* 1. LE MOTEUR VISUEL DYNAMIQUE */}
                                        {PreviewEngine ? (
                                            <div className="bg-white p-4 rounded-3xl shadow-lg border border-slate-200 transform scale-90 origin-top">
                                                <PreviewEngine config={previewData.visualConfig} />
                                            </div>
                                        ) : (
                                            // Message discret si pas de moteur
                                            previewData.visualEngine !== 'NONE' && (
                                                <div className="text-xs text-red-400">Moteur {previewData.visualEngine} introuvable</div>
                                            )
                                        )}

                                        {/* 2. LA QUESTION */}
                                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full">
                                            <div className="text-sm font-bold text-slate-400 uppercase mb-1">Question (Niveau {previewLevel})</div>
                                            <div className="text-xl font-black text-slate-800 mb-4">
                                                <MathText text={previewData.question} />
                                            </div>

                                            <div className="text-sm font-bold text-slate-400 uppercase mb-1">Réponse Attendue</div>
                                            <div className="text-lg font-bold text-emerald-600 mb-4 bg-emerald-50 p-2 rounded border border-emerald-100">
                                                {previewData.correct}
                                            </div>

                                            <div className="text-sm font-bold text-slate-400 uppercase mb-1">Correction & Variables</div>
                                            <div className="bg-slate-50 p-3 rounded-lg text-xs font-mono text-slate-600 border border-slate-100">
                                                <div className="mb-2">
                                                    <MathText text={previewData.explanation || "Pas d'explication définie."} />
                                                </div>
                                                <div className="mt-2 pt-2 border-t border-slate-200 text-indigo-600 whitespace-pre-wrap">
                                                    {JSON.stringify(previewData.scope, null, 2)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 z-10">
                                        {previewData?.error ? (
                                            <div className="text-red-500 bg-red-50 p-4 rounded-xl border border-red-200 max-w-xs text-center">
                                                <Icon name="warning" className="text-2xl mb-2 mx-auto" />
                                                <p className="font-bold text-sm">Erreur JSON</p>
                                                <p className="text-xs mt-1">{previewData.error}</p>
                                            </div>
                                        ) : (
                                            <>
                                                <Icon name="paint-brush-broad" className="text-4xl mb-2 opacity-50" />
                                                <p>Modifiez le JSON pour voir l'aperçu.</p>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* --- TAB: GESTION DU CONTENU (CMS ACTIF) --- */}
                    {activeTab === 'CONTENT' && (
                        <div className="space-y-8 animate-in fade-in">
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-blue-800 text-sm flex flex-col md:flex-row gap-3 items-center shadow-sm">
                                <div className="bg-white p-2 rounded-full text-blue-600"><Icon name="info" className="text-xl" /></div>
                                <div className="flex-1">
                                    <strong>CMS Actif :</strong> Ajoutez des exercices dynamiquement. Cliquez sur "+" pour créer.
                                    <div className="flex gap-3 mt-1 font-bold text-xs">
                                        <span className="text-emerald-600 flex items-center gap-1"><Icon name="lock-open" /> GRATUIT</span>
                                        <span className="text-amber-600 flex items-center gap-1"><Icon name="crown" /> PREMIUM</span>
                                        <span className="text-red-600 flex items-center gap-1"><Icon name="lock-key" /> FERMÉ</span>
                                    </div>
                                </div>
                            </div>

                            {/* 1. AUTOMATISMES (DYNAMIQUE) */}
                            <div>
                                <h3 className="font-black text-xl text-slate-800 mb-4 flex items-center gap-2"><Icon name="lightning" /> Automatismes</h3>
                                <div className="grid md:grid-cols-2 gap-6">
                                    {program.map(cat => (
                                        <div key={cat.id} className="bg-white border-2 border-slate-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">

                                            {/* HEADER CATÉGORIE */}
                                            <div className={`bg-${cat.color}-50 p-3 font-bold text-${cat.color}-800 border-b border-${cat.color}-100 flex items-center justify-between`}>
                                                <span className="uppercase text-xs tracking-wider">{cat.title}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] bg-white/50 px-2 py-0.5 rounded-full">{cat.exos.length}</span>
                                                    {/* BOUTON AJOUTER EXERCICE */}
                                                    <button onClick={() => handleAddExo(cat.id, cat.exos)} className={`bg-${cat.color}-200 text-${cat.color}-800 w-6 h-6 rounded flex items-center justify-center hover:scale-110 transition-transform`}>
                                                        <Icon name="plus" weight="bold" size={12} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="p-1 space-y-0.5 max-h-[400px] overflow-y-auto">
                                                {cat.exos.map(exo => (
                                                    <div key={exo.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded group">
                                                        <div className="flex-1 min-w-0 pr-2">
                                                            <div className="text-sm font-bold text-slate-700 truncate" title={exo.title}>{exo.title}</div>
                                                            <div className="text-[9px] font-mono text-slate-400 truncate">{exo.id}</div>
                                                        </div>

                                                        {/* BADGES NIVEAUX */}
                                                        <div className="flex gap-1">
                                                            {[1, 2, 3].map(lvl => {
                                                                const key = `${exo.id}_lvl${lvl}`;
                                                                const def = lvl === 1 ? 'FREE' : 'PREMIUM';
                                                                const status = getCurrentStatus(key, def);

                                                                let badgeClass = "";
                                                                let icon = "";
                                                                if (status === 'FREE') { badgeClass = "bg-emerald-100 text-emerald-700 border-emerald-200"; icon = "lock-open"; }
                                                                if (status === 'PREMIUM') { badgeClass = "bg-amber-100 text-amber-700 border-amber-200"; icon = "crown"; }
                                                                if (status === 'LOCKED') { badgeClass = "bg-red-100 text-red-700 border-red-200"; icon = "lock-key"; }

                                                                return (
                                                                    <button
                                                                        key={lvl}
                                                                        onClick={() => cycleRule(key, status)}
                                                                        className={`w-7 h-7 rounded border flex items-center justify-center transition-all hover:scale-110 shadow-sm ${badgeClass}`}
                                                                        title={`Niveau ${lvl} : ${status}`}
                                                                    >
                                                                        <Icon name={icon} weight="fill" size={12} />
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>

                                                        {/* BOUTON SUPPRIMER */}
                                                        <button
                                                            onClick={() => handleDeleteExo(cat.id, cat.exos, exo.id)}
                                                            className="ml-2 w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100"
                                                            title="Supprimer cet exercice"
                                                        >
                                                            <Icon name="trash" size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                                {cat.exos.length === 0 && <div className="p-4 text-center text-xs text-slate-400 italic">Aucun exercice</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 2. SUJETS DE BREVET */}
                            <div>
                                <h3 className="font-black text-xl text-slate-800 mb-4 flex items-center gap-2"><Icon name="graduation-cap" /> Sujets de Brevet</h3>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {subjects.map(s => {
                                        const key = `brevet_${s.id}`;
                                        const status = getCurrentStatus(key, 'PREMIUM');

                                        let style = "";
                                        let statusText = "";
                                        let statusIcon = "";

                                        if (status === 'FREE') { style = "border-emerald-500 bg-emerald-50/50"; statusText = "GRATUIT"; statusIcon = "lock-open"; }
                                        if (status === 'PREMIUM') { style = "border-amber-500 bg-amber-50/50"; statusText = "PREMIUM"; statusIcon = "crown"; }
                                        if (status === 'LOCKED') { style = "border-red-500 bg-red-50/50"; statusText = "FERMÉ"; statusIcon = "lock-key"; }

                                        return (
                                            <div key={s.id} onClick={() => cycleRule(key, status)} className={`p-4 rounded-xl border-l-4 shadow-sm cursor-pointer hover:shadow-md transition-all flex justify-between items-center ${style} bg-white`}>
                                                <div className="font-bold text-slate-700 text-sm truncate flex-1 pr-2">{s.title}</div>
                                                <div className={`font-bold text-[10px] px-2 py-1 rounded bg-white border shadow-sm flex items-center gap-1 min-w-[80px] justify-center ${status === 'FREE' ? 'text-emerald-700 border-emerald-200' : status === 'PREMIUM' ? 'text-amber-700 border-amber-200' : 'text-red-700 border-red-200'}`}>
                                                    <Icon name={statusIcon} weight="fill" /> {statusText}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- AUTRES TABS (CONFIG, LIST, EDITOR) --- */}
                    {activeTab === 'CONFIG' && (
                        <div className="max-w-xl mx-auto space-y-6">
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mt-6">
                                <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                                    <Icon name="database" /> Initialisation Données (Système)
                                </h3>
                                <p className="text-xs text-slate-500 mb-4">
                                    Envoie la structure locale vers Firestore. À n'utiliser qu'une seule fois pour initialiser le CMS.
                                </p>
                                <button
                                    onClick={migrateDataToFirestore}
                                    disabled={loading}
                                    className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-black transition-all"
                                >
                                    {loading ? "Traitement en cours..." : "Exécuter la Migration"}
                                </button>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Icon name="megaphone" /> Bannière d'annonce</h3>
                                <input type="text" value={config.newsMessage || ""} onChange={e => setConfig({ ...config, newsMessage: e.target.value })} className="w-full p-3 rounded-lg border mb-4" placeholder="Message..." />
                                <div className="flex gap-2">
                                    {['blue', 'emerald', 'amber', 'red', 'purple'].map(c => (
                                        <button key={c} onClick={() => setConfig({ ...config, newsColor: c })} className={`w-8 h-8 rounded-full border-2 ${config.newsColor === c ? 'border-slate-800 scale-110' : 'border-transparent opacity-50'} bg-${c}-500`}></button>
                                    ))}
                                </div>
                            </div>
                            <div className={`p-6 rounded-2xl border flex justify-between items-center ${config.maintenance ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                                <div><h3 className="font-bold text-red-600 flex items-center gap-2"><Icon name="warning-circle" /> Mode Maintenance</h3><p className="text-xs text-slate-500">Bloque l'accès aux élèves.</p></div>
                                <button onClick={() => setConfig({ ...config, maintenance: !config.maintenance })} className={`px-4 py-2 rounded-lg font-bold text-sm ${config.maintenance ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{config.maintenance ? "ACTIVÉ" : "DÉSACTIVÉ"}</button>
                            </div>
                            <button onClick={saveConfig} className="w-full py-4 bg-slate-800 text-white font-bold rounded-xl">Enregistrer Config</button>
                        </div>
                    )}

                    {activeTab === 'LIST' && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-xl text-slate-800">Sujets ({subjects.length})</h3>
                                <button onClick={fetchSubjects} className="text-indigo-600 hover:underline flex items-center gap-1 text-sm"><Icon name="arrows-clockwise" /> Rafraîchir</button>
                            </div>
                            <div className="space-y-3">
                                {subjects.map(s => (
                                    <div key={s.id} className={`flex items-center justify-between p-4 rounded-xl border-l-4 shadow-sm ${s.published ? 'bg-white border-emerald-500' : 'bg-slate-50 border-slate-300 opacity-80'}`}>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-lg text-slate-800">{s.title}</h4>
                                                {s.published ? <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase">Publié</span> : <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase">Brouillon</span>}
                                            </div>
                                            <div className="text-xs text-slate-400 font-mono mt-1">{s.id}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => togglePublish(s)} className={`w-10 h-10 rounded-full flex items-center justify-center ${s.published ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`} title={s.published ? "Dépublier" : "Publier"}><Icon name={s.published ? "eye" : "eye-slash"} weight="bold" /></button>
                                            <button onClick={() => loadSubjectIntoEditor(s)} className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center"><Icon name="pencil-simple" weight="bold" /></button>
                                            <button onClick={() => deleteSubject(s.id, s.title)} className="w-10 h-10 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center"><Icon name="trash" weight="bold" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'EDITOR' && (
                        <div className="h-full flex flex-col">
                            {/* BARRE D'OUTILS */}
                            <div className="mb-4 flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <div className="flex gap-2 items-center">
                                    <Icon name="code" className="text-indigo-600" />
                                    <span className="font-bold text-slate-700">Éditeur JSON</span>

                                    {/* Sélecteur d'exercice existant */}
                                    <select
                                        className="ml-4 p-2 rounded border border-slate-300 text-sm font-bold max-w-[300px]"
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (!val) return;

                                            // 1. CAS SPÉCIAL : DÉMO (Injection directe du JSON pour tester sans DB)
                                            if (val === "auto_pythagore_demo") {
                                                const demoJson = {
                                                    "id": "auto_pythagore_demo",
                                                    "visual_engine": "ENGINE_PYTHAGORE",
                                                    "common_config": {
                                                        "visual_config_template": {
                                                            "points": { "Right": "A", "Top": "B", "Bottom": "C" },
                                                            "showSquare": { "size": 20 }
                                                        }
                                                    },
                                                    "levels": {
                                                        "1": {
                                                            "variables": { "k": "randomInt(1, 5)", "base_a": 3, "base_b": 4 },
                                                            "question_template": "Le triangle est rectangle en A. $AB={c1}$, $AC={c2}$. Calculer $BC$.",
                                                            "calculations": {
                                                                "c1": "base_a * k",
                                                                "c2": "base_b * k",
                                                                "hyp_carre": "c1^2 + c2^2",
                                                                "hyp": "sqrt(hyp_carre)"
                                                            },
                                                            "correct_answer": "{hyp}",
                                                            "explanation_template": "On utilise Pythagore : $$BC^2 = AB^2 + AC^2$$ $$BC^2 = {c1}^2 + {c2}^2 = {hyp_carre}$$ Donc $BC = \\sqrt{{hyp_carre}} = {hyp}$",
                                                            "visual_config_override": {
                                                                "vals": { "AB": "{c1}", "AC": "{c2}" },
                                                                "given": {
                                                                    "AB": { "val": "{c1}", "unit": "" },
                                                                    "AC": { "val": "{c2}", "unit": "" }
                                                                }
                                                            }
                                                        }
                                                    }
                                                };
                                                setJsonInput(JSON.stringify(demoJson, null, 2));
                                                toast.success("Démo chargée !");
                                                setTimeout(() => setPreviewData(generatePreviewData(JSON.stringify(demoJson), 1)), 100);
                                            }
                                            // 2. CAS STANDARD : CHARGEMENT DEPUIS LA BASE DE DONNÉES (C'est ce qui manquait !)
                                            else {
                                                loadExerciseIntoEditor(val);
                                            }
                                        }}
                                    >
                                        <option value="">-- Charger un exercice --</option>

                                        {/* Option de test rapide */}
                                        <option value="auto_pythagore_demo" className="font-bold text-indigo-600 bg-indigo-50">
                                            ✨ Pythagore Demo (Test)
                                        </option>

                                        {/* LISTE DYNAMIQUE (Depuis ton programme) */}
                                        {program.map(cat => (
                                            <optgroup key={cat.id} label={cat.title}>
                                                {cat.exos.map(e => (
                                                    <option key={e.id} value={e.id}>
                                                        {e.title}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            // CORRECTION 1 : On utilise 'previewLevel' (l'onglet sélectionné) au lieu de 1
                                            const preview = generatePreviewData(jsonInput, previewLevel);

                                            if (preview && !preview.error) {
                                                // CORRECTION 2 : On met à jour la BONNE variable d'état
                                                setPreviewData(preview);
                                                toast.success("Aperçu généré !");
                                            } else {
                                                toast.error(preview?.error || "Erreur JSON. Vérifiez la syntaxe.");
                                            }
                                        }}
                                        className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg font-bold hover:bg-indigo-200 flex items-center gap-2"
                                    >
                                        <Icon name="play" weight="fill" /> Aperçu
                                    </button>

                                    <button
                                        onClick={async () => {
                                            try {
                                                const data = JSON.parse(jsonInput);
                                                if (!data.id) throw new Error("L'objet doit avoir un 'id'.");

                                                // Sauvegarde dans Firestore
                                                await setDoc(doc(db, "structure_automatismes", data.id), data);
                                                toast.success(`Exercice "${data.id}" sauvegardé !`);

                                                // Mettre à jour le programme local si c'est un nouvel exo
                                                fetchProgram();
                                            } catch (e) {
                                                toast.error("Erreur : " + e.message);
                                            }
                                        }}
                                        className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700 flex items-center gap-2 shadow-lg"
                                    >
                                        <Icon name="floppy-disk" weight="fill" /> Sauvegarder
                                    </button>
                                </div>
                            </div>

                            {/* ZONE DE TRAVAIL (SPLIT SCREEN) */}
                            <div className="grid lg:grid-cols-2 gap-6 flex-1 min-h-[600px]">

                                {/* COLONNE GAUCHE : CODE */}
                                <div className="flex flex-col">
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Configuration JSON</label>
                                    <div className="h-[600px] border-2 border-slate-700 rounded-xl overflow-hidden">
                                        <Editor
                                            height="100%"
                                            defaultLanguage="json"
                                            value={jsonInput}
                                            onChange={(value) => setJsonInput(value)}
                                            theme="vs-dark"
                                            options={{
                                                minimap: { enabled: false },
                                                fontSize: 14,
                                                formatOnPaste: true,
                                                formatOnType: true
                                            }}
                                        />
                                        {/* ZONE DE FEEDBACK DE VALIDATION */}
                                        <div className="mt-2 text-xs">
                                            {(() => {
                                                // On valide à la volée pour l'affichage (sans parser MathJS, juste structure)
                                                const check = parseAndValidateExercise(jsonInput);
                                                if (check.success) {
                                                    return (
                                                        <div className="flex items-center gap-2 text-emerald-500 font-bold bg-emerald-50 p-2 rounded border border-emerald-200">
                                                            <Icon name="check-circle" /> Structure Valide • ID: {check.data.id}
                                                        </div>
                                                    );
                                                } else {
                                                    return (
                                                        <div className="flex items-start gap-2 text-red-500 font-mono bg-red-50 p-2 rounded border border-red-200 whitespace-pre-wrap">
                                                            <Icon name="warning" className="mt-1 shrink-0" />
                                                            <span>{check.error}</span>
                                                        </div>
                                                    );
                                                }
                                            })()}
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs text-slate-400 flex justify-between">
                                        <span>Syntaxe stricte : guillemets doubles " obligatoires pour les clés.</span>
                                        <button onClick={() => setJsonInput(JSON.stringify(JSON.parse(jsonInput), null, 2))} className="text-indigo-600 hover:underline">Formater</button>
                                    </div>
                                </div>

                                {/* COLONNE DROITE : RENDU VISUEL */}
                                <div className="bg-slate-100 rounded-xl border-2 border-slate-200 p-6 flex flex-col relative overflow-hidden min-h-[600px]">

                                    {/* Header avec boutons de niveau */}
                                    <div className="flex justify-between items-center mb-4 z-10 relative">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Aperçu en direct</label>

                                        <div className="flex gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                                            {[1, 2, 3].map(lvl => (
                                                <button
                                                    key={lvl}
                                                    onClick={() => {
                                                        setPreviewLevel(lvl);
                                                        // On régénère immédiatement l'aperçu quand on change de niveau
                                                        if (jsonInput) setPreviewData(generatePreviewData(jsonInput, lvl));
                                                    }}
                                                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${previewLevel === lvl ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                                                >
                                                    Niv {lvl}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Fond "Cahier" */}
                                    <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#64748b_1px,transparent_1px)] [background-size:16px_16px]"></div>

                                    {/* AFFICHAGE DE L'APERÇU (Basé sur previewData) */}
                                    {previewData && !previewData.error ? (
                                        <div className="flex-1 flex flex-col items-center justify-start z-10 gap-6 animate-in fade-in slide-in-from-bottom-4 overflow-y-auto">

                                            {/* 1. LE MOTEUR VISUEL DYNAMIQUE */}
                                            {PreviewEngine ? (
                                                <div className="bg-white p-4 rounded-3xl shadow-lg border border-slate-200 transform scale-90 origin-top">
                                                    <PreviewEngine config={previewData.visualConfig} />
                                                </div>
                                            ) : (
                                                // Message discret si pas de moteur
                                                previewData.visualEngine !== 'NONE' && (
                                                    <div className="text-xs text-red-400">Moteur {previewData.visualEngine} introuvable</div>
                                                )
                                            )}

                                            {/* 2. LA QUESTION */}
                                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full">
                                                <div className="text-sm font-bold text-slate-400 uppercase mb-1">Question (Niveau {previewLevel})</div>
                                                <div className="text-xl font-black text-slate-800 mb-4">
                                                    <MathText text={previewData.question} />
                                                </div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Mode de réponse :</span>
                                                    <span className={`text-xs font-bold px-2 py-1 rounded border ${previewData.responseType === 'GRAPH_POINT' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                                        previewData.responseType === 'QCM' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                                            'bg-blue-100 text-blue-700 border-blue-200'
                                                        }`}>
                                                        {previewData.responseType === 'GRAPH_POINT' && <Icon name="hand-pointing" className="inline mr-1" />}
                                                        {previewData.responseType === 'NUMERIC' && <Icon name="numpad" className="inline mr-1" />}
                                                        {previewData.responseType}
                                                    </span>
                                                </div>

                                                <div className="text-sm font-bold text-slate-400 uppercase mb-1">Réponse Attendue</div>
                                                <div className="text-lg font-bold text-emerald-600 mb-4 bg-emerald-50 p-2 rounded border border-emerald-100">
                                                    {previewData.correct}
                                                </div>

                                                <div className="text-sm font-bold text-slate-400 uppercase mb-1">Correction & Variables</div>
                                                <div className="bg-slate-50 p-3 rounded-lg text-xs font-mono text-slate-600 border border-slate-100">
                                                    <div className="mb-2">
                                                        <MathText text={previewData.explanation || "Pas d'explication définie."} />
                                                    </div>
                                                    <div className="mt-2 pt-2 border-t border-slate-200 text-indigo-600 whitespace-pre-wrap">
                                                        {JSON.stringify(previewData.scope, null, 2)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 z-10">
                                            {previewData?.error ? (
                                                <div className="text-red-500 bg-red-50 p-4 rounded-xl border border-red-200 max-w-xs text-center">
                                                    <Icon name="warning" className="text-2xl mb-2 mx-auto" />
                                                    <p className="font-bold text-sm">Erreur JSON</p>
                                                    <p className="text-xs mt-1">{previewData.error}</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <Icon name="paint-brush-broad" className="text-4xl mb-2 opacity-50" />
                                                    <p>Modifiez le JSON pour voir l'aperçu.</p>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default AdminPanel;