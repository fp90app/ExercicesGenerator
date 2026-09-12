import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Icon } from '../UI';

export default function XPSettingsTab() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Valeurs par défaut avec l'ajout des grades (ranks)
    const [xpConfig, setXpConfig] = useState({
        automatisme: 2,
        queteComplete: 10,
        competenceNiveau2: 5,   // 🟡 En cours
        competenceNiveau3: 15,  // 🟢 Acquis
        competenceNiveau4: 25,  // 🟩 Dépassé
        ranks: [
            { name: "Débutant", points: 0 },
            { name: "Initié", points: 100 },
            { name: "Expert", points: 250 },
            { name: "Maître", points: 500 }
        ]
    });

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const docRef = doc(db, "config", "xp");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setXpConfig(prev => ({
                        ...prev,
                        ...data,
                        // Assure qu'on a un tableau par défaut si ça n'existait pas encore en base
                        ranks: data.ranks || prev.ranks
                    }));
                }
            } catch (error) {
                console.error("Erreur lors du chargement de la configuration XP:", error);
                toast.error("Impossible de charger la configuration.");
            } finally {
                setLoading(false);
            }
        };

        fetchConfig();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        const toastId = toast.loading("Sauvegarde de la configuration...");

        try {
            // Tri des grades par ordre de points croissant avant la sauvegarde
            const sortedRanks = [...(xpConfig.ranks || [])].sort((a, b) => Number(a.points) - Number(b.points));

            const cleanConfig = {
                automatisme: Number(xpConfig.automatisme) || 0,
                queteComplete: Number(xpConfig.queteComplete) || 0,
                competenceNiveau2: Number(xpConfig.competenceNiveau2) || 0,
                competenceNiveau3: Number(xpConfig.competenceNiveau3) || 0,
                competenceNiveau4: Number(xpConfig.competenceNiveau4) || 0,
                ranks: sortedRanks
            };

            await setDoc(doc(db, "config", "xp"), cleanConfig);
            setXpConfig(cleanConfig);

            toast.success("Configuration des points et grades mise à jour !", { id: toastId });
        } catch (error) {
            console.error("Erreur lors de la sauvegarde :", error);
            toast.error("Erreur lors de la sauvegarde.", { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field, value) => {
        setXpConfig(prev => ({ ...prev, [field]: value }));
    };

    // --- GESTION DES GRADES / PALIERS ---
    const handleAddRank = () => {
        setXpConfig(prev => ({
            ...prev,
            ranks: [...(prev.ranks || []), { name: "Nouveau grade", points: 0 }]
        }));
    };

    const handleUpdateRank = (index, field, value) => {
        const newRanks = [...(xpConfig.ranks || [])];
        newRanks[index] = { ...newRanks[index], [field]: value };
        setXpConfig(prev => ({ ...prev, ranks: newRanks }));
    };

    const handleRemoveRank = (index) => {
        const newRanks = [...(xpConfig.ranks || [])];
        newRanks.splice(index, 1);
        setXpConfig(prev => ({ ...prev, ranks: newRanks }));
    };

    if (loading) {
        return (
            <div className="p-12 text-center text-slate-400 font-bold">
                <Icon name="spinner" className="animate-spin text-2xl mb-2" /> Chargement des paramètres de points...
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in pb-20">
            {/* EN-TÊTE */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
                <Icon name="star" weight="fill" className="absolute -right-4 -bottom-4 text-9xl opacity-20" />
                <h2 className="text-2xl font-black mb-2 flex items-center gap-3 relative z-10">
                    <Icon name="sliders" /> Paramétrage des Points et Grades
                </h2>
                <p className="text-amber-100 font-medium max-w-2xl relative z-10">
                    Ajuste ici les points gagnés par tes élèves. Tu peux également créer des grades (paliers) qu'ils débloqueront en accumulant ces points, afin de les motiver tout au long de l'année.
                </p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">

                {/* 1. GRADES ET PALIERS */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            <Icon name="medal" className="text-amber-500" weight="fill" /> Paliers / Grades
                        </h3>
                        <button
                            type="button"
                            onClick={handleAddRank}
                            className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-amber-200 transition-colors"
                        >
                            <Icon name="plus" /> Ajouter un grade
                        </button>
                    </div>

                    <p className="text-sm text-slate-500 mb-4">
                        Définis les titres que tes élèves obtiendront en fonction de leur nombre de points. Le premier grade doit commencer à 0 point. Ils seront automatiquement triés du plus petit au plus grand à la sauvegarde.
                    </p>

                    <div className="space-y-3">
                        {(xpConfig.ranks || []).map((rank, index) => (
                            <div key={index} className="flex flex-col md:flex-row gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200 group">
                                <div className="flex-1 flex gap-3 w-full">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Nom du grade</label>
                                        <input
                                            type="text"
                                            value={rank.name}
                                            onChange={(e) => handleUpdateRank(index, 'name', e.target.value)}
                                            className="w-full p-2.5 rounded-lg border-2 border-slate-200 font-bold text-slate-700 outline-none focus:border-amber-400"
                                            placeholder="Ex: Apprenti"
                                            required
                                        />
                                    </div>
                                    <div className="w-32">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Points requis</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={rank.points}
                                            onChange={(e) => handleUpdateRank(index, 'points', e.target.value)}
                                            className="w-full p-2.5 rounded-lg border-2 border-slate-200 font-bold text-amber-600 outline-none focus:border-amber-400"
                                            required
                                        />
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveRank(index)}
                                    className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all md:opacity-0 md:group-hover:opacity-100 self-end md:self-auto"
                                    title="Supprimer ce grade"
                                >
                                    <Icon name="trash" weight="bold" />
                                </button>
                            </div>
                        ))}
                        {(xpConfig.ranks || []).length === 0 && (
                            <div className="text-center italic text-slate-400 text-sm py-4">
                                Aucun grade défini.
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. AUTOMATISMES ET QUÊTES */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                        <Icon name="game-controller" className="text-indigo-500" weight="fill" /> Entraînement & Quêtes
                    </h3>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <label className="block text-sm font-bold text-slate-700 mb-1">Automatismes (par réussite)</label>
                            <p className="text-xs text-slate-500 mb-3">Points gagnés à chaque fois qu'un élève termine un exercice interactif.</p>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    min="0"
                                    value={xpConfig.automatisme}
                                    onChange={(e) => handleChange('automatisme', e.target.value)}
                                    className="w-24 p-3 rounded-lg border-2 border-slate-200 text-lg font-black text-center text-indigo-700 outline-none focus:border-indigo-500"
                                />
                                <span className="font-bold text-slate-400">Pts</span>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <label className="block text-sm font-bold text-slate-700 mb-1">Quête Journalière Complète</label>
                            <p className="text-xs text-slate-500 mb-3">Points bonus attribués lorsque toutes les quêtes du jour sont validées.</p>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    min="0"
                                    value={xpConfig.queteComplete}
                                    onChange={(e) => handleChange('queteComplete', e.target.value)}
                                    className="w-24 p-3 rounded-lg border-2 border-slate-200 text-lg font-black text-center text-indigo-700 outline-none focus:border-indigo-500"
                                />
                                <span className="font-bold text-slate-400">Pts</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. COMPÉTENCES */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                        <Icon name="target" className="text-emerald-500" weight="fill" /> Évaluation des Compétences
                    </h3>
                    <p className="text-sm text-slate-500 mb-6">
                        Ces points seront distribués automatiquement lorsqu'une compétence est évaluée à ces niveaux. Un élève rétrogradé perdra la différence. Le niveau "Non Acquis" 🔴 ne rapporte aucun point.
                    </p>

                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Niveau 2 */}
                        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 flex flex-col items-center text-center transition-transform hover:scale-105">
                            <div className="w-8 h-8 rounded-full bg-amber-400 border-2 border-amber-500 shadow-sm mb-3"></div>
                            <label className="block text-sm font-black text-amber-800 mb-1 uppercase tracking-widest">En cours</label>
                            <div className="flex items-center justify-center gap-2 mt-2">
                                <input
                                    type="number"
                                    min="0"
                                    value={xpConfig.competenceNiveau2}
                                    onChange={(e) => handleChange('competenceNiveau2', e.target.value)}
                                    className="w-20 p-2 rounded-lg border-2 border-amber-200 text-base font-black text-center text-amber-700 outline-none focus:border-amber-400 bg-white"
                                />
                                <span className="font-bold text-amber-600/70 text-xs">Pts</span>
                            </div>
                        </div>

                        {/* Niveau 3 */}
                        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex flex-col items-center text-center transition-transform hover:scale-105">
                            <div className="w-8 h-8 rounded-full bg-emerald-400 border-2 border-emerald-500 shadow-sm mb-3"></div>
                            <label className="block text-sm font-black text-emerald-800 mb-1 uppercase tracking-widest">Acquis</label>
                            <div className="flex items-center justify-center gap-2 mt-2">
                                <input
                                    type="number"
                                    min="0"
                                    value={xpConfig.competenceNiveau3}
                                    onChange={(e) => handleChange('competenceNiveau3', e.target.value)}
                                    className="w-20 p-2 rounded-lg border-2 border-emerald-200 text-base font-black text-center text-emerald-700 outline-none focus:border-emerald-400 bg-white"
                                />
                                <span className="font-bold text-emerald-600/70 text-xs">Pts</span>
                            </div>
                        </div>

                        {/* Niveau 4 */}
                        <div className="bg-emerald-100/50 p-4 rounded-xl border border-emerald-200 flex flex-col items-center text-center transition-transform hover:scale-105">
                            <div className="w-8 h-8 rounded-full bg-emerald-700 border-2 border-emerald-800 shadow-sm mb-3"></div>
                            <label className="block text-sm font-black text-emerald-900 mb-1 uppercase tracking-widest">Dépassé</label>
                            <div className="flex items-center justify-center gap-2 mt-2">
                                <input
                                    type="number"
                                    min="0"
                                    value={xpConfig.competenceNiveau4}
                                    onChange={(e) => handleChange('competenceNiveau4', e.target.value)}
                                    className="w-20 p-2 rounded-lg border-2 border-emerald-300 text-base font-black text-center text-emerald-800 outline-none focus:border-emerald-500 bg-white"
                                />
                                <span className="font-bold text-emerald-700/70 text-xs">Pts</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ACTIONS */}
                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl shadow-lg transition-transform hover:-translate-y-1 flex items-center gap-2 disabled:opacity-50 disabled:transform-none"
                    >
                        {saving ? <Icon name="spinner" className="animate-spin" /> : <Icon name="floppy-disk" weight="fill" />}
                        Sauvegarder les réglages
                    </button>
                </div>
            </form>
        </div>
    );
}