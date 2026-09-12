import React, { useContext } from 'react';
import { Icon } from '../UI';
import { CoursesAdminContext } from './index';

export default function DocumentForm({ chapterId }) {
    const {
        editingDoc,
        docType, setDocType,
        docFiles, handleFileSelect,
        docUrl, setDocUrl,
        docTitle, setDocTitle,
        selectedClasses, setSelectedClasses, toggleClassTag,
        currentClasses, selectedLevel,
        setShowDocForm, handleSaveDoc, uploading
    } = useContext(CoursesAdminContext);

    return (
        <div className="bg-white p-4 rounded-xl border-2 border-indigo-100 shadow-sm animate-in fade-in zoom-in-95">
            <h4 className="font-bold text-indigo-900 mb-3 text-sm uppercase flex items-center gap-2">
                {editingDoc ? "Modifier le document" : "Ajouter des documents"}
            </h4>
            <div className="space-y-3">
                <div className="flex gap-2">
                    <button onClick={() => setDocType('FILE')} className={`flex-1 py-1 text-xs font-bold rounded ${docType === 'FILE' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>Fichier(s) PDF/Img</button>
                    <button onClick={() => setDocType('LINK')} className={`flex-1 py-1 text-xs font-bold rounded ${docType === 'LINK' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>Lien Web</button>
                </div>
                {docType === 'FILE' ? (
                    <input type="file" multiple onChange={handleFileSelect} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                ) : (
                    <input placeholder="https://..." value={docUrl} onChange={e => setDocUrl(e.target.value)} className="w-full border p-2 rounded text-sm" />
                )}
                {(docType === 'LINK' || (docFiles.length <= 1)) && (
                    <input
                        placeholder="Titre du document"
                        className="w-full border p-2 rounded text-sm font-bold"
                        value={docTitle}
                        onChange={e => setDocTitle(e.target.value)}
                    />
                )}
                {docType === 'FILE' && docFiles.length > 1 && (
                    <div className="bg-indigo-50 p-2 rounded text-xs text-indigo-700 font-bold border border-indigo-100">
                        {docFiles.length} fichiers sélectionnés. <br />
                        Les titres seront automatiques (Nom du fichier).
                    </div>
                )}
                <div className="border p-3 rounded bg-slate-50">
                    <label className="text-xs font-bold text-slate-500 mb-2 block">Visible pour :</label>
                    <div className="flex items-center gap-2 mb-2">
                        <input type="checkbox" checked={selectedClasses.length === 0} onChange={() => setSelectedClasses([])} className="accent-indigo-600" />
                        <label className="text-sm font-bold">Toute la {selectedLevel}</label>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {currentClasses.map(cls => (
                            <div key={cls} className="flex items-center gap-1.5">
                                <input type="checkbox" checked={selectedClasses.includes(cls)} onChange={() => toggleClassTag(cls)} className="accent-indigo-600" />
                                <label className="text-xs font-bold">{cls}</label>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-slate-100">
                    <button onClick={() => setShowDocForm(false)} className="px-3 py-1 text-slate-500 text-sm hover:bg-slate-100 rounded">Annuler</button>
                    <button onClick={() => handleSaveDoc(chapterId)} disabled={uploading} className="px-3 py-1 bg-indigo-600 text-white text-sm font-bold rounded flex items-center gap-2">
                        {uploading ? <Icon name="spinner" className="animate-spin" /> : (docFiles.length > 1 ? "Tout envoyer" : "Sauvegarder")}
                    </button>
                </div>
            </div>
        </div>
    );
}