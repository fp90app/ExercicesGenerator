import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from 'react-hot-toast';
import { Icon } from './UI';

export const Login = ({ onLogin, onSound, onBack }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [loading, setLoading] = useState(false);
    const auth = getAuth();

    // Champs formulaire
    const [formData, setFormData] = useState({
        identifiant: "",
        password: "",
        nom: "", // Pour l'inscription
        confirmPassword: "" // Pour l'inscription
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // --- 1. LOGIQUE INSCRIPTION (PUBLIC / INTERNET) ---
    const handleRegister = async (e) => {
        e.preventDefault();
        onSound('CLICK');

        const { identifiant, password, confirmPassword, nom } = formData;

        // Validations
        if (!identifiant || !password || !nom) return alert("Merci de tout remplir !");
        if (password !== confirmPassword) return alert("Les mots de passe ne correspondent pas.");
        if (password.length < 6) return alert("Mot de passe trop court (min 6).");

        // PROTECTION : Email OBLIGATOIRE
        if (!identifiant.includes('@')) {
            alert("⛔️ Format incorrect !\n\nUtilise une adresse email valide (avec @) pour t'inscrire.");
            return;
        }

        setLoading(true);

        try {
            // A. Création Auth (Email/MDP)
            const userCredential = await createUserWithEmailAndPassword(auth, identifiant, password);
            const user = userCredential.user;

            // B. Création Firestore (Fiche Élève)
            await setDoc(doc(db, "eleves", user.uid), {
                nom: nom.trim(),
                identifiant: identifiant,
                email: identifiant,
                classe: "Internet",
                profId: "autonome",
                status: "free",
                xp: 0,
                createdAt: new Date().toISOString(),
                role: "student"
            });

            toast.success("Compte créé avec succès !");

        } catch (err) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') alert("Cet email est déjà utilisé.");
            else alert("Erreur inscription : " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // --- 2. LOGIQUE CONNEXION (HYBRIDE + AUTO-RÉPARATION PROFS) ---
    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        onSound('CLICK');

        const loginValue = formData.identifiant.trim();
        const passwordValue = formData.password;

        if (loginValue.includes('@')) {
            // CAS A : Email (Internet)
            setLoading(true);
            try {
                // 1. Connexion Auth
                const userCredential = await signInWithEmailAndPassword(auth, loginValue, passwordValue);
                const user = userCredential.user;

                // 2. VÉRIFICATION INTELLIGENTE (Prof OU Élève)

                // A. Est-ce un élève existant ?
                const studentRef = doc(db, "eleves", user.uid);
                const studentSnap = await getDoc(studentRef);

                if (studentSnap.exists()) {
                    toast.success("Connexion réussie !");
                    // useAuth fera le reste
                    return;
                }

                // B. Est-ce un PROF existant ? (Ton cas Admin)
                const profRef = doc(db, "profs", user.uid);
                const profSnap = await getDoc(profRef);

                if (profSnap.exists()) {
                    toast.success("Bienvenue collègue !");
                    // useAuth fera le reste
                    return;
                }

                // C. Si ni l'un ni l'autre => C'est un vrai élève perdu (Zombie)
                // SEULEMENT LÀ on crée le compte de secours
                console.log("⚠️ Compte Zombie détecté ! Réparation...");
                await setDoc(studentRef, {
                    nom: "Élève (Récupéré)",
                    identifiant: loginValue,
                    email: loginValue,
                    classe: "Internet",
                    profId: "autonome",
                    status: "free",
                    xp: 0,
                    createdAt: new Date().toISOString(),
                    role: "student"
                });
                toast.success("Profil réparé et connecté !");

            } catch (err) {
                console.error("Erreur login:", err);
                setLoading(false);
                if (err.code === 'auth/wrong-password') alert("Mot de passe incorrect.");
                else if (err.code === 'auth/user-not-found') alert("Aucun compte avec cet email.");
                else alert("Erreur connexion : " + err.message);
            }
        } else {
            // CAS B : Pseudo (Élève classe)
            onLogin(loginValue.toUpperCase(), passwordValue);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md text-center fade-in relative transition-all duration-300">

                {onBack && (
                    <button onClick={onBack} className="absolute top-4 left-4 text-slate-400 hover:text-indigo-600 transition-colors">
                        <Icon name="arrow-left" size={24} />
                    </button>
                )}

                <div className="text-6xl mb-4">{isRegistering ? '📝' : '🚀'}</div>
                <h1 className="text-2xl font-black text-slate-800 mb-1">
                    {isRegistering ? "Créer un compte" : "Connexion"}
                </h1>

                <form onSubmit={isRegistering ? handleRegister : handleLoginSubmit} className="space-y-3 mt-6">

                    {isRegistering && (
                        <input
                            type="text"
                            name="nom"
                            value={formData.nom}
                            onChange={handleChange}
                            className="w-full p-3 border-2 rounded-xl font-bold outline-none focus:border-indigo-500 bg-slate-50"
                            placeholder="Ton Prénom"
                            required
                            maxLength={20}
                        />
                    )}

                    <input
                        type="text"
                        name="identifiant"
                        value={formData.identifiant}
                        onChange={handleChange}
                        className="w-full p-3 border-2 rounded-xl font-bold text-center outline-none focus:border-indigo-500"
                        placeholder={isRegistering ? "Ton Email (Obligatoire)" : "Email ou Identifiant"}
                        required
                    />

                    <p className="text-[10px] text-slate-400 text-left pl-2 mt-1 leading-tight">
                        {isRegistering ? (
                            <span className="text-indigo-600 font-bold">
                                <Icon name="info" size={12} className="inline mr-1" />
                                Un email est requis pour sécuriser ton compte.
                            </span>
                        ) : (
                            <span>Connecte-toi pour retrouver ta progression.</span>
                        )}
                    </p>

                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full p-3 border-2 rounded-xl text-center outline-none focus:border-indigo-500"
                        placeholder="Mot de passe"
                        required
                    />

                    {isRegistering && (
                        <input
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="w-full p-3 border-2 rounded-xl text-center outline-none focus:border-indigo-500"
                            placeholder="Confirme le mot de passe"
                            required
                        />
                    )}

                    <button
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-transform hover:scale-105 disabled:opacity-50 disabled:scale-100"
                    >
                        {loading ? "Chargement..." : (isRegistering ? "S'inscrire" : "Se connecter")}
                    </button>
                </form>

                <div className="mt-6 pt-6 border-t border-slate-100">
                    <button
                        onClick={() => { setIsRegistering(!isRegistering); setFormData({ identifiant: "", password: "", nom: "", confirmPassword: "" }); }}
                        className="text-sm font-bold text-slate-500 hover:text-indigo-600 underline decoration-indigo-200 underline-offset-4"
                    >
                        {isRegistering ? "J'ai déjà un compte" : "Je n'ai pas encore de compte"}
                    </button>
                </div>
            </div>
        </div>
    );
};