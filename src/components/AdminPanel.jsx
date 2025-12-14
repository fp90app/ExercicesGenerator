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

// NOTE : On retire l'import de AUTOMATISMES_DATA car on passe en mode Dynamique !
import { AUTOMATISMES_DATA } from '../utils/data'; // Gardé uniquement pour la migration de secours

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
    const [imageFile, setImageFile] = useState(null);
    const [uploadedUrl, setUploadedUrl] = useState("");
    const [galleryImages, setGalleryImages] = useState([]);

    // --- CHARGEMENT INITIAL ---
    useEffect(() => {
        fetchConfig();
        if (activeTab === 'LIST') fetchSubjects();
        if (activeTab === 'EDITOR') fetchGallery();

        // MODIFICATION : On charge le programme dynamique pour l'onglet CONTENT
        if (activeTab === 'CONTENT') {
            fetchContentRules();
            fetchSubjects();
            fetchProgram(); // <--- NOUVEAU
        }
    }, [activeTab]);

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

        // Nouvel objet exercice
        const newExo = {
            id,
            title,
            type: 'GENERATOR', // Par défaut
            isPremium: false
        };

        const updatedExos = [...currentExos, newExo];

        try {
            await updateDoc(doc(db, "structure_automatismes", catId), { exos: updatedExos });
            toast.success("Exercice ajouté !");
            fetchProgram(); // On rafraîchit la liste
        } catch (e) { toast.error(e.message); }
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
                    <TabButton id="EDITOR" label="Éditeur" icon="code" />
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
                                            <select className="flex-1 p-3 border-2 border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500" value={targetTeacher} onChange={e => setTargetTeacher(e.target.value)}>
                                                <option value="">-- Choisir un Prof VIP --</option>
                                                <option value="autonome">Autonome (Inscrits seuls)</option>
                                                {config.vipTeacherIds?.map(id => (<option key={id} value={id}>{vipDetails[id] || id}</option>))}
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

                            {/* COLONNE DROITE : GESTION VIP */}
                            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 h-fit">
                                <h3 className="font-bold text-lg text-amber-800 mb-2 flex items-center gap-2"><Icon name="star" weight="fill" /> Profs Partenaires (VIP)</h3>
                                <p className="text-sm text-amber-700 mb-6">Ajoute ici les IDs des collègues. Leurs élèves seront automatiquement Premium.</p>
                                <div className="flex gap-2 mb-4">
                                    <input id="vipInput" type="text" placeholder="ID Prof..." className="flex-1 p-2 rounded-lg border border-amber-200 text-sm outline-none focus:border-amber-500" />
                                    <button onClick={() => { const val = document.getElementById('vipInput').value; handleAddVip(val); document.getElementById('vipInput').value = ""; }} className="bg-amber-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-amber-700">Ajouter</button>
                                </div>
                                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                    {(config.vipTeacherIds || []).map(id => (
                                        <div key={id} className="flex justify-between items-center bg-white p-2 px-3 rounded-lg border border-amber-100 shadow-sm">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm text-slate-800">{vipDetails[id] || "Chargement..."}</span>
                                                <span className="font-mono text-[10px] text-slate-400">{id}</span>
                                            </div>
                                            <button onClick={() => handleRemoveVip(id)} className="text-red-400 hover:text-red-600"><Icon name="trash" size={16} /></button>
                                        </div>
                                    ))}
                                </div>
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
                        <div className="grid lg:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                    <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2"><Icon name="upload-simple" /> Upload Rapide</h3>
                                    <div className="flex gap-2">
                                        <input type="file" onChange={e => setImageFile(e.target.files[0])} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                                        <button onClick={handleUpload} disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50">{loading ? "..." : "Envoyer"}</button>
                                    </div>
                                    {uploadedUrl && (
                                        <div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs break-all font-mono cursor-pointer hover:bg-emerald-100" onClick={() => navigator.clipboard.writeText(uploadedUrl)}>
                                            <span className="font-bold text-emerald-700">Lien :</span><br />{uploadedUrl}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><Icon name="images" /> Galerie Récente</h3>
                                    <div className="grid grid-cols-4 gap-2">
                                        {galleryImages.map((img, i) => (
                                            <div key={i} className="aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:ring-2 ring-indigo-500 group relative" onClick={() => { navigator.clipboard.writeText(img.url); alert("Lien copié !"); }}>
                                                <img src={img.url} className="w-full h-full object-cover" alt="asset" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col h-full">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-bold text-indigo-900"><Icon name="code" /> JSON du Sujet</h3>
                                    <button onClick={() => setJsonInput("")} className="text-xs text-red-500 font-bold border border-red-200 px-2 py-1 rounded hover:bg-red-50">Effacer</button>
                                </div>
                                <textarea className="flex-1 w-full p-4 font-mono text-xs border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none bg-slate-50 min-h-[400px]" value={jsonInput} onChange={e => setJsonInput(e.target.value)} placeholder='{ "id": "...", "published": false, ... }'></textarea>
                                <button onClick={saveSubject} className="mt-4 w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-md flex justify-center items-center gap-2">
                                    <Icon name="floppy-disk" weight="bold" /> Enregistrer le Sujet
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default AdminPanel;