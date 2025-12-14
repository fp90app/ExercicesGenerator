import { useState, useEffect } from 'react';
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

// MODIFICATION : On accepte 'user' comme argument
export const usePremium = (user) => {
    const [isPremium, setIsPremium] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkPremiumStatus = async () => {
            // 1. Si pas d'utilisateur, pas premium
            if (!user || !user.data) {
                setIsPremium(false);
                setLoading(false);
                return;
            }

            // 2. Vérifications synchrones (Immédiates)
            // Si c'est un PROFESSEUR ou un élève ayant PAYÉ
            if (user.role === 'teacher' || user.data.role === 'teacher' || user.data.status === 'premium') {
                setIsPremium(true);
                setLoading(false);
                return;
            }

            // 3. Vérification asynchrone (Liste VIP dans Firebase)
            try {
                const docRef = doc(db, "config", "general");
                const snap = await getDoc(docRef);

                if (snap.exists()) {
                    const data = snap.data();
                    const vipList = data.vipTeacherIds || [];

                    if (vipList.includes(user.data.profId)) {
                        setIsPremium(true);
                    } else {
                        setIsPremium(false);
                    }
                } else {
                    setIsPremium(false);
                }
            } catch (error) {
                console.error("Erreur vérification Premium VIP:", error);
                setIsPremium(false);
            } finally {
                setLoading(false);
            }
        };

        checkPremiumStatus();
    }, [user]); // Le hook re-vérifie dès que 'user' change

    return { isPremium, loading };
};