import { useState, useEffect } from 'react';
import {
    collection, query, where, getDocs, getDoc, doc, updateDoc, increment
} from "firebase/firestore";
// Imports nécessaires pour l'authentification Firebase (Email)
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { db } from '../firebase';
import { AUTOMATISMES_DATA } from '../utils/data';

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const auth = getAuth();

    // ====================================================================================
    // 0. HELPER : GESTION DES DROITS (Restriction par Prof)
    // ====================================================================================
    const calculateAllowedIds = async (userData) => {
        // Liste complète par défaut (Tout est autorisé si pas de restriction)
        const ALL_EXOS = AUTOMATISMES_DATA.flatMap(cat => cat.exos.map(e => e.id));

        // Si l'élève n'a pas de prof ou est en mode autonome -> Tout ouvert
        if (!userData.profId || userData.profId === 'autonome') {
            return ALL_EXOS;
        }

        try {
            const profSnap = await getDoc(doc(db, 'profs', userData.profId));

            if (profSnap.exists()) {
                const profData = profSnap.data();

                // Si le prof n'a jamais configuré aucune classe -> Tout ouvert
                if (!profData.classSettings) return ALL_EXOS;

                // --- NETTOYAGE DU NOM DE CLASSE (Correctif "3A" vs "3a") ---
                const studentClassClean = (userData.classe || "").trim();

                // 1. Essai correspondance exacte
                if (profData.classSettings[studentClassClean]) {
                    return profData.classSettings[studentClassClean];
                }

                // 2. Essai correspondance insensible à la casse (Majuscules/Minuscules)
                const configKey = Object.keys(profData.classSettings).find(
                    key => key.trim().toUpperCase() === studentClassClean.toUpperCase()
                );

                if (configKey) {
                    // Si on trouve une config (même vide = tout bloqué), on l'applique
                    return profData.classSettings[configKey] || [];
                } else {
                    // Le prof a des configs, mais PAS pour cette classe précise.
                    // Par défaut, on laisse tout ouvert pour ne pas bloquer l'élève par erreur.
                    // (Vous pouvez changer cela en renvoyant [] si vous préférez tout bloquer par défaut)
                    console.log(`Aucune config trouvée pour la classe "${studentClassClean}"`);
                    return ALL_EXOS;
                }
            }
        } catch (e) {
            console.error("Erreur récupération droits prof", e);
        }

        // En cas d'erreur technique (réseau...), on laisse ouvert
        return ALL_EXOS;
    };

    // ====================================================================================
    // 1. HELPER : GÉNÉRATION DES QUÊTES JOURNALIÈRES
    // ====================================================================================
    const checkAndGenerateQuests = async (currentUser) => {
        const today = new Date().toDateString();
        const userData = currentUser.data;
        const daily = userData.daily || {};

        // Vérification sommaire de la validité des données existantes
        const isDataValid = daily.q1 && daily.q1.targets && daily.q1.targets.length > 0 && typeof daily.q1.targets[0] === 'object';

        // Si les quêtes sont déjà générées pour aujourd'hui, on ne touche à rien
        if (daily.date === today && isDataValid) return currentUser;

        // Gestion de la "Flamme" (Streak)
        let newStreak = daily.streak || 0;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        // Si on a raté hier, la flamme retombe à 0 (sauf si c'est aujourd'hui)
        if (daily.date !== yesterday.toDateString() && daily.date !== today && daily.date) {
            newStreak = 0;
        }

        // Génération des cibles aléatoires (Tables / Divisions)
        const allTables = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        const randomTargets = [];

        while (randomTargets.length < 3) {
            const val = allTables[Math.floor(Math.random() * allTables.length)];
            const type = Math.random() > 0.5 ? 'TABLES' : 'DIVISIONS';
            // On évite les doublons
            const exists = randomTargets.some(t => t.val === val && t.type === type);
            if (!exists) randomTargets.push({ val, type });
        }

        const newDaily = {
            date: today,
            streak: newStreak,
            completed: false,
            q1: { targets: randomTargets, progress: [], done: false }, // Quête Tables
            q2: { done: false } // Quête Automatisme
        };

        // Sauvegarde dans Firestore
        const col = currentUser.role === 'teacher' ? 'profs' : 'eleves';
        try {
            await updateDoc(doc(db, col, currentUser.data.id), { daily: newDaily });
        } catch (e) {
            console.error("Erreur génération quêtes daily:", e);
        }

        return { ...currentUser, data: { ...userData, daily: newDaily } };
    };

    // ====================================================================================
    // 2. ÉCOUTEUR AUTHENTIFICATION (CORRECTIF ZOMBIE + DETECTION PROF)
    // ====================================================================================
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // L'utilisateur est connecté via Email (Firebase Auth)
                try {
                    const uid = firebaseUser.uid;

                    // A. On cherche d'abord si c'est un ÉLÈVE
                    let docRef = doc(db, 'eleves', uid);
                    let snap = await getDoc(docRef);
                    let role = 'student';

                    // B. Si pas élève, on cherche si c'est un PROF (Correctif Admin)
                    if (!snap.exists()) {
                        docRef = doc(db, 'profs', uid);
                        snap = await getDoc(docRef);
                        if (snap.exists()) {
                            role = 'teacher';
                        }
                    }

                    if (snap.exists()) {
                        const d = snap.data();

                        let currentUser = {
                            role: role,
                            data: { ...d, id: uid }, // L'ID est l'UID Auth
                            allowed: []
                        };

                        // Calcul des droits (seulement pour élèves)
                        if (role === 'student') {
                            currentUser.allowed = await calculateAllowedIds(d);
                        } else {
                            // Les profs ont accès à tout par défaut pour tester
                            currentUser.allowed = AUTOMATISMES_DATA.flatMap(cat => cat.exos.map(e => e.id));
                        }

                        // On génère les quêtes
                        currentUser = await checkAndGenerateQuests(currentUser);

                        // Mise à jour de l'état global
                        setUser(currentUser);
                    } else {
                        // Cas Zombie : Utilisateur Auth connecté mais aucune fiche Firestore trouvée.
                        // On laisse Dashboards.jsx gérer la création du compte de secours si besoin.
                        console.warn("Auth OK mais pas de fiche Firestore trouvée.");
                    }
                } catch (e) {
                    console.error("Erreur lors de la récupération du profil Auth :", e);
                }
            } else {
                // Pas d'utilisateur Auth connecté.
                // On ne force pas le logout ici pour permettre la connexion "Classe" (Pseudo).
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // ====================================================================================
    // 3. LOGIN MANUEL (PSEUDO / CLASSE)
    // ====================================================================================
    const login = async (identifiant, password) => {
        setLoading(true);
        const cleanId = identifiant.trim().toUpperCase();
        try {
            // A. Cas PROFESSEUR (Pseudo)
            const qProf = query(collection(db, 'profs'), where("identifiant", "==", cleanId));
            const snapProf = await getDocs(qProf);

            if (!snapProf.empty) {
                const d = snapProf.docs[0].data();
                if (d.password === password) {
                    let currentUser = {
                        role: 'teacher',
                        data: {
                            ...d,
                            id: snapProf.docs[0].id,
                            // On assure des valeurs par défaut
                            xp: d.xp || 0,
                            tables: d.tables || {},
                            training: d.training || {},
                            daily: d.daily || {}
                        }
                    };
                    currentUser = await checkAndGenerateQuests(currentUser);
                    setUser(currentUser);
                    setLoading(false);
                    return;
                }
            }

            // B. Cas ÉLÈVE CLASSE (Pseudo)
            const snapEleves = await getDocs(collection(db, 'eleves'));
            let found = null;
            snapEleves.forEach(docSnap => {
                const d = docSnap.data();
                // On cherche par identifiant/code, en ignorant les comptes Email
                if ((d.identifiant || d.code || "").toUpperCase() === cleanId && !d.email) {
                    if (d.password === password || !d.password) {
                        found = {
                            ...d,
                            id: docSnap.id,
                            nom: d.nom || "Élève",
                            xp: d.xp || 0
                        };
                    }
                }
            });

            if (found) {
                const allowed = await calculateAllowedIds(found);
                let currentUser = { role: 'student', data: found, allowed: allowed };
                currentUser = await checkAndGenerateQuests(currentUser);
                setUser(currentUser);
            } else {
                alert("Identifiant ou mot de passe incorrect.");
            }
        } catch (e) { alert("Erreur: " + e.message); }
        setLoading(false);
    };

    // ====================================================================================
    // 4. LOGOUT (UNIFIÉ)
    // ====================================================================================
    const logout = async () => {
        try {
            await signOut(auth); // Déconnecte la session Firebase (Email)
        } catch (e) { console.error("Erreur logout firebase", e); }
        setUser(null); // Déconnecte la session locale (Classe)
    };

    // ====================================================================================
    // 5. REFRESH STUDENT (Mise à jour des données après action)
    // ====================================================================================
    const refreshStudent = async () => {
        if (user) {
            const col = user.role === 'teacher' ? 'profs' : 'eleves';
            const snap = await getDoc(doc(db, col, user.data.id));

            if (snap.exists()) {
                const d = snap.data();
                const allowed = user.role === 'student' ? await calculateAllowedIds(d) : user.allowed;
                let updatedUser = { ...user, data: { ...d, id: user.data.id }, allowed: allowed };
                updatedUser = await checkAndGenerateQuests(updatedUser);
                setUser(updatedUser);
            }
        }
    };

    // ====================================================================================
    // 6. SAVE PROGRESS (LA FONCTION COMPLÈTE DE JEU)
    // ====================================================================================
    const saveProgress = async (type, id, level, score, extraData) => {
        if (!user) return;
        const col = user.role === 'teacher' ? 'profs' : 'eleves';
        const docRef = doc(db, col, user.data.id);

        let updates = {};
        // On copie les données actuelles pour l'UI optimiste
        let newData = JSON.parse(JSON.stringify(user.data));

        let xpGain = 0;
        let xpDetails = { exo: 0, quest: 0, bonus: 0 };
        let questCompletedNow = false;

        // On prépare l'objet daily
        let dailyUpdate = newData.daily ? newData.daily : {};
        const todayStr = new Date().toDateString();

        // ---------------------------------------------------------
        // CAS 1 : MODE CHRONO (GRAND CHELEM)
        // ---------------------------------------------------------
        if (type === 'CHRONO') {
            const timeInSec = extraData / 1000;

            // Mise à jour du record personnel
            if (!newData.best_grand_slam || timeInSec < newData.best_grand_slam) {
                updates.best_grand_slam = timeInSec;
                newData.best_grand_slam = timeInSec;
            }

            // Historique (Garde les 5 meilleurs temps)
            let currentHistory = newData.grand_slam_history || [];
            currentHistory = currentHistory.map(x => (typeof x === 'object' && x.val !== undefined) ? x : { val: x, date: null });

            const newEntry = { val: timeInSec, date: Date.now() };
            // Tri croissant (temps)
            const newHistory = [...currentHistory, newEntry].sort((a, b) => a.val - b.val).slice(0, 5);

            updates.grand_slam_history = newHistory;
            newData.grand_slam_history = newHistory;
        }

        // ---------------------------------------------------------
        // CAS 2 : MODE SURVIE
        // ---------------------------------------------------------
        else if (type === 'SURVIVAL') {
            // 1. Gestion de l'historique
            let currentHistory = newData.survival_history?.[id] || [];
            currentHistory = currentHistory.map(x => (typeof x === 'object' && x.val !== undefined) ? x : { val: x, date: null });

            const newEntry = { val: score, date: Date.now() };
            // Tri décroissant (score)
            const newHistory = [...currentHistory, newEntry].sort((a, b) => b.val - a.val).slice(0, 5);

            updates[`survival_history.${id}`] = newHistory;
            if (!newData.survival_history) newData.survival_history = {};
            newData.survival_history[id] = newHistory;

            // 2. Mise à jour des meilleurs scores globaux
            const currentBest = newData.best_scores?.[id] || 0;
            if (score > currentBest) {
                updates[`best_scores.${id}`] = score;
                if (!newData.best_scores) newData.best_scores = {};
                newData.best_scores[id] = score;
            }
        }

        // ---------------------------------------------------------
        // CAS 3 : EXERCICES CLASSIQUES & QUÊTES
        // ---------------------------------------------------------
        else {
            // Seuil de réussite (9/10 pour tables, 8/10 pour le reste)
            const threshold = (type.includes('TABLES') || type.includes('DIVISIONS')) ? 9 : 8;

            // Pour le mode Mix Libre, l'ID peut être un objet, on évite de sauvegarder des stats précises qui planteraient
            if (type === 'FREE_MIX') {
                // On ne fait rien de spécial pour l'instant en terme de stats persistantes pour le free mix
                // Sauf si vous aviez une logique spécifique XP ici
            }
            else if (score >= threshold) {
                // --- A. BONUS SPÉCIAUX (TOUTES LES TABLES) ---
                if (type === 'TABLES_ALL') {
                    if (dailyUpdate.allTablesDate !== todayStr) {
                        xpGain += 20; xpDetails.bonus = 20;
                        dailyUpdate.allTablesDate = todayStr;
                        questCompletedNow = true;
                    }
                }
                else if (type === 'DIVISIONS_ALL') {
                    if (dailyUpdate.allDivisionsDate !== todayStr) {
                        xpGain += 20; xpDetails.bonus = 20;
                        dailyUpdate.allDivisionsDate = todayStr;
                        questCompletedNow = true;
                    }
                }

                // --- B. TABLES & DIVISIONS INDIVIDUELLES ---
                else if (type === 'TABLES' || type === 'DIVISIONS') {
                    const collectionKey = type === 'TABLES' ? 'tables' : 'divisions';
                    const currentCount = newData[collectionKey]?.[id] || 0;

                    updates[`${collectionKey}.${id}`] = increment(1);
                    if (!newData[collectionKey]) newData[collectionKey] = {};
                    newData[collectionKey][id] = currentCount + 1;

                    // XP limité aux 3 premiers succès pour éviter le farm
                    if (currentCount < 3) {
                        xpGain += 10;
                        xpDetails.exo = 10;
                    }

                    // Gestion Quête Q1 (Liste de tables à faire)
                    if (dailyUpdate.date === todayStr && !dailyUpdate.q1.done) {
                        const doneTargetId = `${type}_${id}`;
                        const isTarget = dailyUpdate.q1.targets.some(t => `${t.type}_${t.val}` === doneTargetId);

                        if (isTarget && !dailyUpdate.q1.progress.includes(doneTargetId)) {
                            dailyUpdate.q1.progress.push(doneTargetId);
                            xpGain += 10;
                            xpDetails.quest = 10;

                            if (dailyUpdate.q1.progress.length >= 3) {
                                dailyUpdate.q1.done = true;
                                xpGain += 10;
                                xpDetails.bonus = 10;
                                questCompletedNow = true;
                            }
                        }
                    }
                }

                // --- C. ENTRAÎNEMENT (TRAINING / AUTOMATISMES) ---
                else {
                    const safeLevel = parseInt(level);
                    // Sécurité : si id est un objet (bug), on ignore
                    if (typeof id === 'string') {
                        if (!newData.training) newData.training = {};
                        if (!newData.training[id]) newData.training[id] = { 1: 0, 2: 0, 3: 0 };

                        // Mise à jour compteur visuel
                        updates[`training.${id}.${safeLevel}`] = increment(1);
                        newData.training[id][safeLevel] = (newData.training[id][safeLevel] || 0) + 1;

                        // Logique XP Caps (Pour limiter l'XP à 3 fois par niveau, mémorisé à part)
                        const countVisuel = newData.training[id][safeLevel];
                        const countMemoire = newData.xp_caps?.[id]?.[safeLevel] || 0;
                        const oldMax = Math.max(countVisuel - 1, countMemoire);

                        if (oldMax < 3) {
                            const gain = safeLevel * 10;
                            xpGain += gain;
                            xpDetails.exo = gain;

                            updates[`xp_caps.${id}.${safeLevel}`] = oldMax + 1;
                            if (!newData.xp_caps) newData.xp_caps = {};
                            if (!newData.xp_caps[id]) newData.xp_caps[id] = {};
                            newData.xp_caps[id][safeLevel] = oldMax + 1;
                        }

                        // Gestion Quête Q2 (Faire un automatisme)
                        if (dailyUpdate.date === todayStr && type === 'TRAINING' && !dailyUpdate.q2.done) {
                            dailyUpdate.q2.done = true;
                            questCompletedNow = true;

                            // Bonus de quête seulement si on n'a pas déjà farmé ce niveau à fond
                            if (oldMax < 3) {
                                let bonusQ = safeLevel === 3 ? 50 : (safeLevel === 2 ? 30 : 20);
                                xpGain += bonusQ;
                                xpDetails.quest = bonusQ;
                            }
                        }
                    }
                }

                // --- D. VÉRIFICATION FINALE DES QUÊTES (STREAK) ---
                if (dailyUpdate.date === todayStr) {
                    // Si Q1 et Q2 sont finis et que ce n'était pas encore validé
                    if (!dailyUpdate.completed && dailyUpdate.q1.done && dailyUpdate.q2.done) {
                        dailyUpdate.completed = true;
                        dailyUpdate.streak = (dailyUpdate.streak || 0) + 1;
                        xpGain += 20;
                        xpDetails.bonus += 20;
                    }
                    // On applique les mises à jour daily
                    updates.daily = dailyUpdate;
                    newData.daily = dailyUpdate;
                }
            }
        }

        // =========================================================
        // MISE À JOUR FINALE
        // =========================================================
        if (xpGain > 0) {
            updates.xp = increment(xpGain);
            newData.xp = (newData.xp || 0) + xpGain;
        }

        const now = Date.now();
        updates.last_activity = now;
        newData.last_activity = now;

        await updateDoc(docRef, updates);

        // Mise à jour du state local pour réactivité immédiate
        setUser({ ...user, data: newData });

        return { questCompletedNow, xpGainTotal: xpGain, details: xpDetails };
    };

    // ====================================================================================
    // 7. UTILS (RESET & MAINTENANCE)
    // ====================================================================================

    // Remettre à zéro le compte prof (pour tests)
    const resetTeacherAccount = async () => {
        if (user.role !== 'teacher') return;
        const docRef = doc(db, 'profs', user.data.id);
        const emptyData = { xp: 0, tables: {}, training: {} };
        await updateDoc(docRef, emptyData);
        setUser({ ...user, data: { ...user.data, ...emptyData } });
    };

    // Réinitialiser un exercice spécifique
    const resetTraining = async (id) => {
        if (!user) return;
        const t = user.data.training?.[id] || {};
        const c = user.data.xp_caps?.[id] || {};
        const getVal = (obj, key) => (obj && obj[key] !== undefined) ? obj[key] : 0;

        // On conserve les "caps" (mémoire XP) pour ne pas permettre de regagner de l'XP en boucle
        const newCaps = {
            1: Math.max(getVal(t, 1), getVal(c, 1)),
            2: Math.max(getVal(t, 2), getVal(c, 2)),
            3: Math.max(getVal(t, 3), getVal(c, 3))
        };

        const col = user.role === 'teacher' ? 'profs' : 'eleves';
        const updates = {
            [`training.${id}`]: { 1: 0, 2: 0, 3: 0 },
            [`xp_caps.${id}`]: newCaps
        };

        await updateDoc(doc(db, col, user.data.id), updates);

        const newData = { ...user.data };
        newData.training = { ...newData.training, [id]: { 1: 0, 2: 0, 3: 0 } };
        newData.xp_caps = { ...newData.xp_caps, [id]: newCaps };

        setUser({ ...user, data: newData });
    };

    return {
        user,
        loading,
        login,
        logout,
        setUser,
        saveProgress,
        refreshStudent,
        resetTeacherAccount,
        resetTraining
    };
};