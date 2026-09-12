import React, { useContext } from 'react';
import { Icon } from '../UI';

// NOUVEAU : Import du contexte d'administration
import { AdminContext } from '../AdminPanel';

export default function ListTab() {
    // NOUVEAU : On récupère toutes les variables et fonctions depuis le contexte
    const {
        subjects,
        fetchSubjects,
        togglePublish,
        loadSubjectIntoEditor,
        deleteSubject
    } = useContext(AdminContext);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-xl text-slate-800">Sujets ({subjects.length})</h3>
                <button
                    onClick={fetchSubjects}
                    className="text-indigo-600 hover:underline flex items-center gap-1 text-sm"
                >
                    <Icon name="arrows-clockwise" /> Rafraîchir
                </button>
            </div>
            <div className="space-y-3">
                {subjects.map(s => (
                    <div
                        key={s.id}
                        className={`flex items-center justify-between p-4 rounded-xl border-l-4 shadow-sm ${s.published ? 'bg-white border-emerald-500' : 'bg-slate-50 border-slate-300 opacity-80'}`}
                    >
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-lg text-slate-800">{s.title}</h4>
                                {s.published ? (
                                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase">
                                        Publié
                                    </span>
                                ) : (
                                    <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase">
                                        Brouillon
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-slate-400 font-mono mt-1">{s.id}</div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => togglePublish(s)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center ${s.published ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}
                                title={s.published ? "Dépublier" : "Publier"}
                            >
                                <Icon name={s.published ? "eye" : "eye-slash"} weight="bold" />
                            </button>
                            <button
                                onClick={() => loadSubjectIntoEditor(s)}
                                className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center"
                                title="Modifier"
                            >
                                <Icon name="pencil-simple" weight="bold" />
                            </button>
                            <button
                                onClick={() => deleteSubject(s.id, s.title)}
                                className="w-10 h-10 rounded-full bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center"
                                title="Supprimer"
                            >
                                <Icon name="trash" weight="bold" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}