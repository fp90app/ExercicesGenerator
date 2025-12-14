import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from '../firebase';
// On garde le fichier local comme "Plan B" (Failover) en cas de panne réseau
import { AUTOMATISMES_DATA as LOCAL_BACKUP } from '../utils/data';

// --- CACHE GLOBAL (Hors du composant) ---
// Cette variable conserve les données tant que l'application est ouverte
// Si l'utilisateur change de page (Menu -> Jeu -> Menu), on réutilise cette variable.
let memoryCache = null;

export const useProgram = () => {
    // Si le cache existe, on l'utilise immédiatement
    const [program, setProgram] = useState(memoryCache || []);
    // Si cache existe, pas de chargement. Sinon, chargement true.
    const [loading, setLoading] = useState(!memoryCache);
    const [error, setError] = useState(null);

    useEffect(() => {
        // 1. Si on a déjà les données en mémoire, ON S'ARRÊTE LÀ.
        // Zéro lecture Firestore. Économie maximale.
        if (memoryCache) {
            setLoading(false);
            return;
        }

        const fetchProgram = async () => {
            try {
                // On récupère les catégories triées par ordre
                const q = query(collection(db, "structure_automatismes"), orderBy("order"));
                const snap = await getDocs(q);

                if (!snap.empty) {
                    const data = snap.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                    // SUCCÈS : On remplit le cache et l'état local
                    memoryCache = data;
                    setProgram(data);
                } else {
                    console.warn("Firestore vide ou structure introuvable, fallback local.");
                    setProgram(LOCAL_BACKUP);
                }
            } catch (err) {
                console.error("Erreur chargement programme:", err);
                setError(err);
                // En cas d'erreur (ex: quota dépassé ou hors ligne), on bascule sur le fichier local
                setProgram(LOCAL_BACKUP);
            } finally {
                setLoading(false);
            }
        };

        fetchProgram();
    }, []);

    return { program, loading, error };
};