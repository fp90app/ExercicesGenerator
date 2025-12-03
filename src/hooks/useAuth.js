import { useState } from 'react';
import {
    collection, query, where, getDocs, getDoc, doc, updateDoc, increment
} from "firebase/firestore";
import { db } from '../firebase';
import { AUTOMATISMES_DATA } from '../utils/data';

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);

    // --- 1. GÉNÉRATION DES QUÊTES ---
    const checkAndGenerateQuests = async (currentUser) => {
        const today = new Date().toDateString();
        const userData = currentUser.data;
        const daily = userData.daily || {};

        const isDataValid = daily.q1 && daily.q1.targets && daily.q1.targets.length > 0 && typeof daily.q1.targets[0] === 'object';

        if (daily.date === today && isDataValid) return currentUser;

        let newStreak = daily.streak || 0;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (daily.date !== yesterday.toDateString() && daily.date !== today && daily.date) {
            newStreak = 0;
        }

        const allTables = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        const randomTargets = [];

        while (randomTargets.length < 3) {
            const val = allTables[Math.floor(Math.random() * allTables.length)];
            const type = Math.random() > 0.5 ? 'TABLES' : 'DIVISIONS';
            const exists = randomTargets.some(t => t.val === val && t.type === type);
            if (!exists) randomTargets.push({ val, type });
        }

        const newDaily = {
            date: today,
            streak: newStreak,
            completed: false,
            q1: { targets: randomTargets, progress: [], done: false },
            q2: { done: false }
        };

        const col = currentUser.role === 'teacher' ? 'profs' : 'eleves';
        await updateDoc(doc(db, col, currentUser.data.id), { daily: newDaily });

        return { ...currentUser, data: { ...userData, daily: newDaily } };
    };

    // --- 2. CONNEXION ---
    const login = async (identifiant, password) => {
        setLoading(true);
        const cleanId = identifiant.trim().toUpperCase();
        try {
            // PROF
            const qProf = query(collection(db, 'profs'), where("identifiant", "==", cleanId));
            const snapProf = await getDocs(qProf);
            if (!snapProf.empty) {
                const d = snapProf.docs[0].data();
                if (d.password === password) {
                    let currentUser = {
                        role: 'teacher',
                        data: { ...d, id: snapProf.docs[0].id, xp: d.xp || 0, tables: d.tables || {}, training: d.training || {}, survival_history: d.survival_history || {}, grand_slam_history: d.grand_slam_history || [], best_grand_slam: d.best_grand_slam || 999 }
                    };
                    currentUser = await checkAndGenerateQuests(currentUser);
                    setUser(currentUser);
                    setLoading(false);
                    return;
                }
            }
            // ELEVE
            const snapEleves = await getDocs(collection(db, 'eleves'));
            let found = null;
            snapEleves.forEach(docSnap => {
                const d = docSnap.data();
                if ((d.identifiant || d.code || "").toUpperCase() === cleanId) {
                    if (d.password === password || !d.password) {
                        found = { ...d, id: docSnap.id, nom: d.nom || "Élève", xp: d.xp || 0, tables: d.tables || {}, training: d.training || {}, survival_history: d.survival_history || {}, grand_slam_history: d.grand_slam_history || [], best_grand_slam: d.best_grand_slam || 999 };
                    }
                }
            });

            if (found) {
                let allowedIds = [];
                if (found.profId) {
                    const profSnap = await getDoc(doc(db, 'profs', found.profId));
                    if (profSnap.exists()) {
                        const profData = profSnap.data();
                        const classeClean = found.classe ? found.classe.trim() : "";
                        if (profData.classSettings && profData.classSettings[classeClean]) {
                            allowedIds = profData.classSettings[classeClean];
                        } else {
                            allowedIds = AUTOMATISMES_DATA.flatMap(cat => cat.exos.map(e => e.id));
                        }
                    }
                } else {
                    allowedIds = AUTOMATISMES_DATA.flatMap(cat => cat.exos.map(e => e.id));
                }

                let currentUser = { role: 'student', data: found, allowed: allowedIds };
                currentUser = await checkAndGenerateQuests(currentUser);
                setUser(currentUser);
            } else {
                alert("Identifiant ou mot de passe incorrect.");
            }
        } catch (e) { alert("Erreur: " + e.message); }
        setLoading(false);
    };

    // --- 3. REFRESH STUDENT ---
    const refreshStudent = async () => {
        if (user) {
            setLoading(true);
            const col = user.role === 'teacher' ? 'profs' : 'eleves';
            const snap = await getDoc(doc(db, col, user.data.id));

            if (snap.exists()) {
                const d = snap.data();
                let allowedIds = [];

                if (d.profId) {
                    const profSnap = await getDoc(doc(db, 'profs', d.profId));
                    if (profSnap.exists()) {
                        const pd = profSnap.data();
                        const classeClean = d.classe ? d.classe.trim() : "";
                        if (pd.classSettings && pd.classSettings[classeClean]) {
                            allowedIds = pd.classSettings[classeClean];
                        } else {
                            allowedIds = AUTOMATISMES_DATA.flatMap(cat => cat.exos.map(e => e.id));
                        }
                    }
                } else {
                    allowedIds = AUTOMATISMES_DATA.flatMap(cat => cat.exos.map(e => e.id));
                }

                let updatedUser = { ...user, data: { ...d, id: user.data.id }, allowed: allowedIds };
                updatedUser = await checkAndGenerateQuests(updatedUser);
                setUser(updatedUser);
            }
            setLoading(false);
        }
    };

    // --- 4. SAUVEGARDE PROGRESSION ---
    const saveProgress = async (type, id, level, score, extraData) => {
        if (!user) return;
        const col = user.role === 'teacher' ? 'profs' : 'eleves';
        const docRef = doc(db, col, user.data.id);

        let updates = {};
        // On copie les données actuelles pour mettre à jour l'interface sans recharger
        let newData = JSON.parse(JSON.stringify(user.data));

        let xpGain = 0;
        let xpDetails = { exo: 0, quest: 0, bonus: 0 };
        let questCompletedNow = false;

        // On prépare l'objet daily (avec sécurité s'il n'existe pas)
        let dailyUpdate = newData.daily ? newData.daily : {};
        const todayStr = new Date().toDateString();

        // =========================================================
        // CAS 1 : MODE CHRONO (GRAND CHELEM)
        // =========================================================
        if (type === 'CHRONO') {
            const timeInSec = extraData / 1000;

            // Mise à jour du record personnel (Pour le classement Chrono)
            if (!newData.best_grand_slam || timeInSec < newData.best_grand_slam) {
                updates.best_grand_slam = timeInSec;
                newData.best_grand_slam = timeInSec;
            }

            // Historique (Garde les 5 meilleurs temps)
            let currentHistory = newData.grand_slam_history || [];
            // Normalisation des anciennes données si nécessaire
            currentHistory = currentHistory.map(x => (typeof x === 'object' && x.val !== undefined) ? x : { val: x, date: null });

            const newEntry = { val: timeInSec, date: Date.now() };
            const newHistory = [...currentHistory, newEntry].sort((a, b) => a.val - b.val).slice(0, 5); // Tri croissant (temps)

            updates.grand_slam_history = newHistory;
            newData.grand_slam_history = newHistory;
        }

        // =========================================================
        // CAS 2 : MODE SURVIE (L'OPTIMISATION EST ICI !)
        // =========================================================
        else if (type === 'SURVIVAL') {
            // 1. Gestion de l'historique classique
            let currentHistory = newData.survival_history?.[id] || [];
            currentHistory = currentHistory.map(x => (typeof x === 'object' && x.val !== undefined) ? x : { val: x, date: null });

            const newEntry = { val: score, date: Date.now() };
            // Tri décroissant (score)
            const newHistory = [...currentHistory, newEntry].sort((a, b) => b.val - a.val).slice(0, 5);

            updates[`survival_history.${id}`] = newHistory;
            if (!newData.survival_history) newData.survival_history = {};
            newData.survival_history[id] = newHistory;

            // 2. 🔥 OPTIMISATION CLASSEMENT (Nouveau !)
            // On sauvegarde le meilleur score "à plat" pour faciliter le tri Firestore
            const currentBest = newData.best_scores?.[id] || 0;
            if (score > currentBest) {
                updates[`best_scores.${id}`] = score;
                if (!newData.best_scores) newData.best_scores = {};
                newData.best_scores[id] = score;
            }
        }

        // =========================================================
        // CAS 3 : EXERCICES CLASSIQUES & QUÊTES
        // =========================================================
        else {
            const threshold = (type.includes('TABLES') || type.includes('DIVISIONS')) ? 9 : 8;

            if (score >= threshold) {
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

                    // Gestion Quête Q1
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

                // --- C. ENTRAÎNEMENT (TRAINING) ---
                else {
                    const safeLevel = parseInt(level);
                    if (!newData.training) newData.training = {};
                    if (!newData.training[id]) newData.training[id] = { 1: 0, 2: 0, 3: 0 };

                    // Mise à jour compteur
                    updates[`training.${id}.${safeLevel}`] = increment(1);
                    newData.training[id][safeLevel] = (newData.training[id][safeLevel] || 0) + 1;

                    // Logique XP Caps (Visuel vs Mémoire)
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

                    // Gestion Quête Q2
                    if (dailyUpdate.date === todayStr && type === 'TRAINING' && !dailyUpdate.q2.done) {
                        dailyUpdate.q2.done = true;
                        questCompletedNow = true;

                        // Bonus seulement si on n'a pas déjà farmé ce niveau
                        if (oldMax < 3) {
                            let bonusQ = safeLevel === 3 ? 50 : (safeLevel === 2 ? 30 : 20);
                            xpGain += bonusQ;
                            xpDetails.quest = bonusQ;
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

    // --- 5. RESET PROF ---
    const resetTeacherAccount = async () => {
        if (user.role !== 'teacher') return;
        const docRef = doc(db, 'profs', user.data.id);
        const emptyData = { xp: 0, tables: {}, training: {} };
        await updateDoc(docRef, emptyData);
        setUser({ ...user, data: { ...user.data, ...emptyData } });
    };

    // --- 6. RESET TRAINING ---
    const resetTraining = async (id) => {
        if (!user) return;
        const t = user.data.training?.[id] || {};
        const c = user.data.xp_caps?.[id] || {};
        const getVal = (obj, key) => (obj && obj[key] !== undefined) ? obj[key] : 0;

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

    return { user, loading, login, setUser, saveProgress, refreshStudent, resetTeacherAccount, resetTraining };
};