import React, { createContext } from 'react';
import { Icon } from '../UI';
import { useCoursesAdmin } from '../../hooks/admin/useCoursesAdmin';
import LevelSelector from './LevelSelector';
import ClassManager from './ClassManager';
import ChapterList from './ChapterList';

export const CoursesAdminContext = createContext(null);

export default function CoursesAdmin() {
    const adminData = useCoursesAdmin();

    const {
        showClassManager,
        setShowClassManager,
        confirmDialog,
        setConfirmDialog
    } = adminData;

    return (
        <CoursesAdminContext.Provider value={adminData}>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 pb-20 relative">
                {/* HEADER */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <Icon name="books" className="text-indigo-600" /> Gestion des Cours
                    </h2>
                    <button
                        onClick={() => setShowClassManager(!showClassManager)}
                        className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 flex items-center gap-2"
                    >
                        <Icon name="gear" /> Gérer les classes
                    </button>
                </div>

                <LevelSelector />

                {/* GESTIONNAIRE DE CLASSES (Conditionnel) */}
                {showClassManager && (
                    <ClassManager />
                )}

                {/* LISTE DES CHAPITRES ET DOCUMENTS */}
                <ChapterList />

                {/* --- MODALE DE CONFIRMATION GLOBALE --- */}
                {confirmDialog.isOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setConfirmDialog({ isOpen: false, message: '', onConfirm: null })}>
                        <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                            <div className="p-6 text-center">
                                <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Icon name="warning" className="text-3xl text-amber-600" weight="fill" />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 mb-2">Confirmation</h3>
                                <p className="text-sm font-medium text-slate-500 whitespace-pre-wrap">{confirmDialog.message}</p>
                            </div>
                            <div className="bg-slate-50 p-4 flex justify-center gap-3 border-t border-slate-200">
                                <button
                                    onClick={() => setConfirmDialog({ isOpen: false, message: '', onConfirm: null })}
                                    className="px-5 py-2.5 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors w-full"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={confirmDialog.onConfirm}
                                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 w-full"
                                >
                                    <Icon name="trash" weight="bold" /> Confirmer
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </CoursesAdminContext.Provider>
    );
}