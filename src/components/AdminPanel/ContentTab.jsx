import React, { useState, useContext } from 'react';
import { Icon } from '../UI';

// NOUVEAU : Import des niveaux par défaut
import { SCHOOL_LEVELS } from '../../utils/constants';
import { AdminContext } from '../AdminPanel';

export default function ContentTab() {
    const {
        program,
        subjects,
        handleAddExo,
        handleDeleteExo,
        cycleRule,
        getCurrentStatus,
        handleUpdateVisibility // NOUVEAU : Récupération de la fonction de mise à jour
    } = useContext(AdminContext);

    // --- ÉTAT DE LA MODALE DE VISIBILITÉ ---
    const [visModal, setVisModal] = useState({
        isOpen: false, catId: null, currentExos: [], exoId: null, exoTitle: '', tags: []
    });
    const [customTag, setCustomTag] = useState("");

    // Ouvre la modale
    const openVisibility = (catId, currentExos, exo) => {
        setVisModal({
            isOpen: true,
            catId,
            currentExos,
            exoId: exo.id,
            exoTitle: exo.title,
            // S'il n'y a pas encore de tags, on met "3ème" par défaut pour ne rien casser
            tags: exo.visibleFor || ["3ème"]
        });
        setCustomTag("");
    };

    // Gestion des tags de niveaux (Checkboxes)
    const toggleLevel = (lvl) => {
        setVisModal(prev => ({
            ...prev,
            tags: prev.tags.includes(lvl) ? prev.tags.filter(t => t !== lvl) : [...prev.tags, lvl]
        }));
    };

    // Ajout d'un tag manuel (ex: "4A")
    const handleAddCustomTag = (e) => {
        e.preventDefault();
        const tag = customTag.trim().toUpperCase();
        if (tag && !visModal.tags.includes(tag)) {
            setVisModal(prev => ({ ...prev, tags: [...prev.tags, tag] }));
        }
        setCustomTag("");
    };

    // Suppression d'un tag manuel
    const removeTag = (tagToRemove) => {
        setVisModal(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));
    };

    // Sauvegarde en base de données
    const handleSaveVisibility = () => {
        handleUpdateVisibility(visModal.catId, visModal.currentExos, visModal.exoId, visModal.tags);
        setVisModal({ isOpen: false, catId: null, currentExos: [], exoId: null, exoTitle: '', tags: [] });
    };

    return (
        <div className="space-y-8 animate-in fade-in relative">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-blue-800 text-sm flex flex-col md:flex-row gap-3 items-center shadow-sm">
                <div className="bg-white p-2 rounded-full text-blue-600">
                    <Icon name="info" className="text-xl" />
                </div>
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
                <h3 className="font-black text-xl text-slate-800 mb-4 flex items-center gap-2">
                    <Icon name="lightning" /> Automatismes
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                    {program.map(cat => (
                        <div key={cat.id} className="bg-white border-2 border-slate-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                            {/* HEADER CATÉGORIE */}
                            <div className={`bg-${cat.color}-50 p-3 font-bold text-${cat.color}-800 border-b border-${cat.color}-100 flex items-center justify-between`}>
                                <span className="uppercase text-xs tracking-wider">{cat.title}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] bg-white/50 px-2 py-0.5 rounded-full">{cat.exos.length}</span>
                                    {/* BOUTON AJOUTER EXERCICE */}
                                    <button
                                        onClick={() => handleAddExo(cat.id, cat.exos)}
                                        className={`bg-${cat.color}-200 text-${cat.color}-800 w-6 h-6 rounded flex items-center justify-center hover:scale-110 transition-transform`}
                                    >
                                        <Icon name="plus" weight="bold" size={12} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-1 space-y-0.5 max-h-[400px] overflow-y-auto">
                                {cat.exos.map(exo => (
                                    <div key={exo.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded group border border-transparent hover:border-slate-200">
                                        <div className="flex-1 min-w-0 pr-2">
                                            <div className="text-sm font-bold text-slate-700 truncate" title={exo.title}>{exo.title}</div>
                                            <div className="text-[9px] font-mono text-slate-400 truncate flex items-center gap-2 mt-0.5">
                                                <span>{exo.id}</span>
                                                {/* NOUVEAU : Affichage des tags de visibilité actuels */}
                                                {exo.visibleFor && exo.visibleFor.length > 0 ? (
                                                    <span className="bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded border border-indigo-100 font-bold">
                                                        👁️ {exo.visibleFor.join(', ')}
                                                    </span>
                                                ) : (
                                                    <span className="bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded border border-slate-300 font-bold">
                                                        🙈 Caché
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-1 items-center">
                                            {/* NOUVEAU : Bouton pour gérer la visibilité */}
                                            <button
                                                onClick={() => openVisibility(cat.id, cat.exos, exo)}
                                                className="w-7 h-7 mr-2 rounded border bg-white text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 flex items-center justify-center transition-all shadow-sm"
                                                title="Gérer la visibilité (Niveaux / Classes)"
                                            >
                                                <Icon name="eye" weight="bold" size={14} />
                                            </button>

                                            {/* BADGES NIVEAUX (GRATUIT/PREMIUM) */}
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
                                            className="ml-2 w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100 shrink-0"
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
                <h3 className="font-black text-xl text-slate-800 mb-4 flex items-center gap-2">
                    <Icon name="graduation-cap" /> Sujets de Brevet
                </h3>
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

            {/* --- MODALE DE GESTION DE LA VISIBILITÉ --- */}
            {visModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setVisModal(prev => ({ ...prev, isOpen: false }))}>
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>

                        <div className="bg-indigo-600 p-6 text-white flex items-start justify-between">
                            <div>
                                <h3 className="text-xl font-black mb-1 flex items-center gap-2">
                                    <Icon name="eye" weight="fill" /> Visibilité
                                </h3>
                                <p className="text-indigo-200 text-sm font-medium leading-tight">
                                    {visModal.exoTitle}
                                </p>
                            </div>
                            <button onClick={() => setVisModal(prev => ({ ...prev, isOpen: false }))} className="text-indigo-200 hover:text-white transition-colors">
                                <Icon name="x" size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Niveaux principaux */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                                    Niveaux autorisés
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {SCHOOL_LEVELS.map(lvl => {
                                        const isChecked = visModal.tags.includes(lvl);
                                        return (
                                            <label
                                                key={lvl}
                                                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${isChecked ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-300'}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => toggleLevel(lvl)}
                                                    className="w-4 h-4 accent-indigo-600"
                                                />
                                                <span className="font-bold">{lvl}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Classes spécifiques manuelles */}
                            <div className="pt-4 border-t border-slate-100">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                                    Classes spécifiques
                                </label>
                                <form onSubmit={handleAddCustomTag} className="flex gap-2 mb-3">
                                    <input
                                        type="text"
                                        value={customTag}
                                        onChange={e => setCustomTag(e.target.value)}
                                        placeholder="Ex: 4A, 3B..."
                                        className="flex-1 p-2.5 border-2 border-slate-200 rounded-lg text-sm font-bold uppercase outline-none focus:border-indigo-500"
                                    />
                                    <button type="submit" disabled={!customTag.trim()} className="bg-slate-800 text-white px-4 rounded-lg font-bold hover:bg-black disabled:opacity-50 transition-colors">
                                        Ajouter
                                    </button>
                                </form>

                                <div className="flex flex-wrap gap-2">
                                    {/* On affiche uniquement les tags qui ne sont PAS dans SCHOOL_LEVELS (donc les classes) */}
                                    {visModal.tags.filter(t => !SCHOOL_LEVELS.includes(t)).map(tag => (
                                        <span key={tag} className="bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2">
                                            {tag}
                                            <button type="button" onClick={() => removeTag(tag)} className="text-amber-500 hover:text-red-500">
                                                <Icon name="x" weight="bold" size={14} />
                                            </button>
                                        </span>
                                    ))}
                                    {visModal.tags.filter(t => !SCHOOL_LEVELS.includes(t)).length === 0 && (
                                        <span className="text-xs text-slate-400 italic">Aucune classe spécifique ajoutée.</span>
                                    )}
                                </div>
                            </div>

                            {/* Message d'aide */}
                            <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-xs font-medium border border-blue-100">
                                💡 Si vous décochez tout, cet exercice sera <strong>complètement invisible</strong> pour les élèves. Pratique pour les cacher avant un chapitre !
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 flex justify-end gap-3 border-t border-slate-200">
                            <button
                                onClick={() => setVisModal(prev => ({ ...prev, isOpen: false }))}
                                className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSaveVisibility}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-transform hover:scale-105 flex items-center justify-center gap-2"
                            >
                                <Icon name="check" weight="bold" /> Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}