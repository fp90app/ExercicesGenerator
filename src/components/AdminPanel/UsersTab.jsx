import React, { useContext } from 'react';
import { Icon } from '../UI';
import MathText from '../MathText';
import { generatePreviewData } from '../../hooks/admin/useAdminPanel';

// Imports Firebase pour la suppression en masse
import { db } from '../../firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { toast } from 'react-hot-toast';

// Import du contexte depuis le composant parent
import { AdminContext } from '../AdminPanel';

// Moteurs visuels
import PythagoreSystem from '../PythagoreSystem';
import NumberLineSystem from '../NumberLineSystem';
import CartesianSystem from '../CartesianSystem';
import GeometrySystem from '../GeometrySystem';
import AnglesSystem from '../AnglesSystem';

const ENGINE_REGISTRY = {
    'ENGINE_PYTHAGORE': PythagoreSystem,
    'ENGINE_NUMBER_LINE': NumberLineSystem,
    'ENGINE_CARTESIAN': CartesianSystem,
    'ENGINE_GEOMETRY': GeometrySystem,
    'ENGINE_ANGLES': AnglesSystem,
};

export default function UsersTab() {
    const {
        filterMode, setFilterMode,
        userSearch, setUserSearch,
        handleFilter, loading,
        foundUsers, vipDetails,
        togglePremiumUser, handleDeleteUser,
        program, loadExerciseIntoEditor,
        previewLevel, setPreviewLevel,
        jsonInput, previewData, setPreviewData,
        setConfirmDialog // Ajout de la modale de confirmation du contexte
    } = useContext(AdminContext);

    // Détermination du moteur visuel
    const PreviewEngine = previewData && previewData.visualEngine ? ENGINE_REGISTRY[previewData.visualEngine] : null;

    // --- FONCTION DE PURGE GLOBALE ---
    const handleBulkDelete = () => {
        setConfirmDialog({
            isOpen: true,
            message: `⚠️ ATTENTION ⚠️\n\nTu vas supprimer DÉFINITIVEMENT les ${foundUsers.length} élèves actuellement affichés.\n\nCette action est irréversible et supprimera tout leur historique. Continuer ?`,
            onConfirm: async () => {
                setConfirmDialog({ isOpen: false, message: '', onConfirm: null });
                const toastId = toast.loading("Suppression en masse en cours...");

                try {
                    const batch = writeBatch(db);

                    foundUsers.forEach(u => {
                        const userRef = doc(db, "eleves", u.id);
                        batch.delete(userRef);
                    });

                    await batch.commit();
                    toast.success(`${foundUsers.length} élèves ont été supprimés avec succès.`, { id: toastId });

                    // On rafraîchit la liste pour vider l'écran
                    handleFilter();
                } catch (error) {
                    console.error(error);
                    toast.error("Erreur lors de la suppression : " + error.message, { id: toastId });
                }
            }
        });
    };

    return (
        <div className="grid lg:grid-cols-3 gap-8">
            {/* COLONNE GAUCHE (LARGE) : FILTRES ET RÉSULTATS */}
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <Icon name="funnel" /> Filtrer les élèves
                    </h3>

                    {/* Boutons de Choix */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {[
                            { id: 'SEARCH_ID', label: 'Par ID', icon: 'magnifying-glass' },
                            { id: 'AUTONOMOUS', label: 'Autonomes', icon: 'robot' },
                            { id: 'PREMIUM', label: 'Premium', icon: 'crown' },
                            { id: 'TEACHER', label: 'Par Prof', icon: 'chalkboard-teacher' },
                            { id: 'RECENT', label: '50 Récents', icon: 'clock' },
                        ].map(m => (
                            <button
                                key={m.id}
                                onClick={() => setFilterMode(m.id)}
                                className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all ${filterMode === m.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'}`}
                            >
                                <Icon name={m.icon} /> {m.label}
                            </button>
                        ))}
                    </div>

                    {/* Zone de saisie dynamique */}
                    <div className="flex gap-2">
                        {filterMode === 'SEARCH_ID' && (
                            <input
                                type="text"
                                className="flex-1 p-3 border-2 border-slate-200 rounded-xl font-bold uppercase outline-none focus:border-indigo-500"
                                placeholder="Identifiant exact (ex: TOMA90)..."
                                value={userSearch}
                                onChange={e => setUserSearch(e.target.value)}
                            />
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
                                <option value="auto_pythagore_demo" className="font-bold text-indigo-600">
                                    ✨ Pythagore Demo (Test)
                                </option>
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
                    {/* BANDEAU RÉSULTATS ET BOUTON DE PURGE */}
                    {foundUsers.length > 0 && (
                        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm mb-4 animate-in fade-in">
                            <span className="text-sm font-bold text-slate-600">
                                <span className="text-indigo-600">{foundUsers.length}</span> élève(s) trouvé(s)
                            </span>
                            <button
                                onClick={handleBulkDelete}
                                className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 hover:border-red-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
                                title="Supprimer définitivement tous les élèves de cette liste"
                            >
                                <Icon name="warning" weight="fill" /> Purger la sélection
                            </button>
                        </div>
                    )}

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
    );
}