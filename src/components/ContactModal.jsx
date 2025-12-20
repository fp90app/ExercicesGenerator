import React, { useState } from 'react';
import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";
import { Icon } from './UI';
import { toast } from 'react-hot-toast';

const ContactModal = ({ user, contextData = null, onClose }) => {
    const [message, setMessage] = useState("");
    const [email, setEmail] = useState(""); // State pour l'email de réponse
    const [loading, setLoading] = useState(false);

    // Si on a des données contextuelles, c'est un BUG, sinon c'est du CONTACT
    const type = contextData ? "BUG" : "CONTACT";

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim()) return toast.error("Le message est vide.");

        setLoading(true);
        try {
            await addDoc(collection(db, "tickets"), {
                userId: user?.data?.id || "anonyme",
                // On essaie de récupérer l'email ou l'identifiant du compte
                userEmail: user?.data?.email || user?.data?.identifiant || "inconnu",
                // On ajoute l'email manuel s'il a été saisi
                replyEmail: email,
                type: type,
                message: message,
                status: "OPEN",
                createdAt: new Date().toISOString(),
                // Si c'est un bug, on attache le contexte technique
                technicalContext: contextData ? JSON.stringify(contextData) : null
            });
            toast.success("Message envoyé ! Merci.");
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors de l'envoi.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl pop-in" onClick={e => e.stopPropagation()}>

                {/* En-tête avec tes couleurs modifiées (Slate) */}
                <div className={`${contextData ? 'bg-slate-700' : 'bg-indigo-600'} p-6 text-white`}>
                    <h2 className="text-2xl font-black flex items-center gap-2">
                        <Icon name={contextData ? "bug" : "envelope"} />
                        {contextData ? "Signaler une erreur" : "Nous contacter"}
                    </h2>
                    <p className="opacity-90 text-sm mt-1">
                        {contextData
                            ? "Une erreur dans l'exercice ? Décris-le problème ci-dessous."
                            : "Une question, une suggestion ou un problème de compte ?"}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {!contextData && (
                        <div className="bg-blue-50 text-blue-800 p-3 rounded-xl text-sm border border-blue-100 flex gap-2">
                            <Icon name="info" className="shrink-0 mt-0.5" />
                            <span>Si tu attends une réponse, assure-toi d'avoir mis un email valide.</span>
                        </div>
                    )}

                    {/* Zone de debug visible uniquement si c'est un bug */}
                    {contextData && (
                        <div className="bg-slate-100 p-2 rounded text-[10px] font-mono text-slate-500 truncate border border-slate-200">
                            <span className="font-bold">Info Debug :</span> {contextData.exerciseId} (Niv {contextData.level})
                        </div>
                    )}

                    {/* Zone de texte Message */}
                    <textarea
                        className="w-full p-4 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 min-h-[120px] resize-none font-medium text-slate-700"
                        placeholder={contextData ? "Ex: La réponse devrait être 42 mais ça me dit faux..." : "Bonjour, je voudrais savoir..."}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                    />

                    {/* Champ Email Optionnel */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 ml-1 uppercase flex justify-between">
                            <span>Email de contact</span>
                            <span className="text-slate-400 font-normal normal-case italic">(Optionnel)</span>
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <Icon name="at" size={20} />
                            </div>
                            <input
                                type="email"
                                className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-slate-700 font-bold bg-slate-50 focus:bg-white transition-colors"
                                placeholder="Pour vous répondre..."
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Boutons d'action */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Annuler</button>
                        <button
                            disabled={loading}
                            // Application de tes couleurs Slate pour le bouton aussi
                            className={`px-6 py-2.5 text-white rounded-xl font-bold shadow-lg transition-transform hover:scale-105 flex items-center gap-2 ${contextData ? 'bg-slate-700 hover:bg-slate-800' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                        >
                            {loading ? "Envoi..." : "Envoyer"} <Icon name="paper-plane-right" weight="fill" />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ContactModal;