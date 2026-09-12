import React, { createContext } from 'react';
import { Icon } from './UI';
import { useAdminPanel } from '../hooks/admin/useAdminPanel';

// Import des sous-onglets
import EditorTab from './AdminPanel/EditorTab';
import UsersTab from './AdminPanel/UsersTab';
import MessagesTab from './AdminPanel/MessagesTab';
import ContentTab from './AdminPanel/ContentTab';
import ConfigTab from './AdminPanel/ConfigTab';
import ListTab from './AdminPanel/ListTab';

// Import de la gestion des cours
import CoursesAdmin from './CoursesAdmin/index.jsx';

// Imports pour la gestion des compétences et de l'XP
import SkillsMatrixTab from './AdminPanel/SkillsMatrixTab';
import SkillsEditorTab from './AdminPanel/SkillsEditorTab';
import XPSettingsTab from './AdminPanel/XPSettingsTab';

// NOUVEAU : Création et export du contexte global d'administration
export const AdminContext = createContext(null);

export default function AdminPanel({ user, onBack }) {
    // 🔒 SÉCURITÉ
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

    // 🚀 LOGIQUE ET ÉTATS VIA LE HOOK
    const admin = useAdminPanel();

    const TabButton = ({ id, label, icon }) => (
        <button
            onClick={() => admin.setActiveTab(id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold transition-colors whitespace-nowrap ${admin.activeTab === id ? 'bg-white text-indigo-600 border-t-4 border-indigo-600 shadow-sm' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
        >
            <Icon name={icon} /> {label}
        </button>
    );

    return (
        // NOUVEAU : On enveloppe tout le panel avec le Provider
        <AdminContext.Provider value={admin}>
            <div className="min-h-screen bg-slate-100 font-sans text-slate-800 pb-20 relative">
                {/* HEADER */}
                <div className="bg-slate-900 text-white p-6 pt-8 shadow-lg mb-8">
                    <div className="max-w-6xl mx-auto flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <button onClick={onBack} className="bg-slate-700 hover:bg-slate-600 p-2 rounded-lg transition-colors">
                                <Icon name="arrow-left" />
                            </button>
                            <h1 className="text-2xl font-black flex items-center gap-3">
                                <Icon name="crown" className="text-amber-400" /> Super-Admin
                            </h1>
                        </div>
                        <div className="text-xs font-mono bg-slate-800 px-3 py-1 rounded border border-slate-700">v3.1 • Modular</div>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto px-4">
                    {/* NAVIGATION DES ONGLETS */}
                    <div className="flex gap-2 border-b border-slate-300 overflow-x-auto custom-scrollbar pb-1">
                        <TabButton id="USERS" label="Utilisateurs" icon="users" />

                        {/* ONGLETS : Compétences */}
                        <TabButton id="SKILLS" label="Compétences" icon="target" />
                        <TabButton id="SKILLS_EDITOR" label="Éditeur Compétences" icon="sliders" />

                        {/* ONGLET : Paramètres XP */}
                        <TabButton id="XP_SETTINGS" label="Réglages XP" icon="star" />

                        <TabButton id="CONTENT" label="Contenu & Accès" icon="lock-key-open" />
                        <TabButton id="CONFIG" label="Config" icon="gear" />
                        <TabButton id="LIST" label="Brevets" icon="list-dashes" />

                        <button
                            onClick={() => admin.setActiveTab('COURSES')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold transition-colors whitespace-nowrap ${admin.activeTab === 'COURSES' ? 'bg-white text-indigo-600 border-t-4 border-indigo-600 shadow-sm' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                        >
                            <Icon name="books" /> Gestion des Cours
                        </button>
                        <button
                            onClick={() => admin.setActiveTab('MESSAGES')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold transition-colors whitespace-nowrap ${admin.activeTab === 'MESSAGES' ? 'bg-white text-indigo-600 border-t-4 border-indigo-600 shadow-sm' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                        >
                            <Icon name="envelope-open" /> Messages
                        </button>
                        <button
                            onClick={() => admin.setActiveTab('EDITOR')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold transition-colors whitespace-nowrap ${admin.activeTab === 'EDITOR' ? 'bg-white text-indigo-600 border-t-4 border-indigo-600 shadow-sm' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                        >
                            <Icon name="code" /> Éditeur JSON
                        </button>
                    </div>

                    {/* CONTENU DE L'ONGLET ACTIF */}
                    <div className="bg-white p-6 rounded-b-3xl rounded-tr-3xl shadow-sm min-h-[500px]">
                        {/* UsersTab n'a plus besoin de props ! */}
                        {admin.activeTab === 'USERS' && <UsersTab />}

                        {admin.activeTab === 'SKILLS' && <SkillsMatrixTab />}
                        {admin.activeTab === 'SKILLS_EDITOR' && <SkillsEditorTab />}
                        {admin.activeTab === 'XP_SETTINGS' && <XPSettingsTab />}

                        {/* Les autres ont temporairement {...admin} le temps qu'on les nettoie */}
                        {admin.activeTab === 'CONTENT' && <ContentTab {...admin} />}
                        {admin.activeTab === 'CONFIG' && <ConfigTab {...admin} />}
                        {admin.activeTab === 'LIST' && <ListTab {...admin} />}
                        {admin.activeTab === 'COURSES' && <CoursesAdmin />}
                        {admin.activeTab === 'MESSAGES' && <MessagesTab {...admin} />}
                        {admin.activeTab === 'EDITOR' && <EditorTab {...admin} />}
                    </div>
                </div>

                {/* --- MODALE DE CONFIRMATION GLOBALE DU PANEL ADMIN --- */}
                {admin.confirmDialog?.isOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => admin.setConfirmDialog({ isOpen: false, message: '', onConfirm: null })}>
                        <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                            <div className="p-6 text-center">
                                <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Icon name="warning" className="text-3xl text-amber-600" weight="fill" />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 mb-2">Confirmation</h3>
                                <p className="text-sm font-medium text-slate-500 whitespace-pre-wrap">{admin.confirmDialog.message}</p>
                            </div>
                            <div className="bg-slate-50 p-4 flex justify-center gap-3 border-t border-slate-200">
                                <button
                                    onClick={() => admin.setConfirmDialog({ isOpen: false, message: '', onConfirm: null })}
                                    className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors w-full"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={admin.confirmDialog.onConfirm}
                                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 w-full"
                                >
                                    <Icon name="check" weight="bold" /> Confirmer
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminContext.Provider>
    );
};