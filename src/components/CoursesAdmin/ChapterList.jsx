import React, { useContext } from 'react';
import { Icon } from '../UI';
import DocumentForm from './DocumentForm';
import { CoursesAdminContext } from './index';

export default function ChapterList() {
    // 1. On "poche" ce dont on a besoin directement dans le Contexte
    const {
        chapters, groupedChapters, expandedChapter, docs,
        editingChapter, setEditingChapter,
        newChapterTitle, setNewChapterTitle,
        newChapterSection, setNewChapterSection,
        showDocForm, setShowDocForm,
        editingDoc, setEditingDoc,
        docType, setDocType,
        docFiles, setDocFiles,
        docUrl, setDocUrl,
        docTitle, setDocTitle,
        selectedClasses, setSelectedClasses,
        currentClasses, selectedLevel, uploading,
        moveChapter, handleSaveChapter, toggleChapter,
        handleDeleteChapter, moveDoc, openEditForm,
        handleDeleteDoc, openAddForm, handleFileSelect,
        toggleClassTag, handleSaveDoc
    } = useContext(CoursesAdminContext);

    return (
        <div className="space-y-8">
            {Object.keys(groupedChapters).length === 0 && (
                <div className="text-center p-8 bg-slate-50 rounded-xl text-slate-400 italic">
                    Aucun contenu pour ce niveau. Créez un bloc ci-dessous.
                </div>
            )}

            {Object.entries(groupedChapters).map(([sectionName, sectionChapters]) => (
                <div key={sectionName}>
                    <h3 className="font-black text-slate-400 uppercase tracking-wider text-sm mb-3 pl-1">{sectionName}</h3>
                    <div className="space-y-4">
                        {sectionChapters.map((chapter) => (
                            <div key={chapter.id} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                                {/* EN-TÊTE CHAPITRE */}
                                <div className="p-4 flex items-center gap-3 bg-white border-b border-slate-100">
                                    <div className="flex flex-col gap-1 text-slate-300">
                                        <button onClick={() => moveChapter(chapters.indexOf(chapter), -1)} className="hover:text-indigo-600"><Icon name="caret-up" weight="bold" /></button>
                                        <button onClick={() => moveChapter(chapters.indexOf(chapter), 1)} className="hover:text-indigo-600"><Icon name="caret-down" weight="bold" /></button>
                                    </div>
                                    <div className="flex-1">
                                        {editingChapter?.id === chapter.id ? (
                                            <div className="flex gap-2 flex-col md:flex-row">
                                                <input value={newChapterTitle} onChange={e => setNewChapterTitle(e.target.value)} className="border p-1 rounded flex-1" placeholder="Titre" />
                                                <input value={newChapterSection} onChange={e => setNewChapterSection(e.target.value)} className="border p-1 rounded md:w-32" placeholder="Rubrique" />
                                                <div className="flex gap-2">
                                                    <button onClick={handleSaveChapter} className="text-green-600 bg-green-50 p-1 rounded"><Icon name="check" /></button>
                                                    <button onClick={() => setEditingChapter(null)} className="text-red-600 bg-red-50 p-1 rounded"><Icon name="x" /></button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div onClick={() => toggleChapter(chapter.id)} className="cursor-pointer group">
                                                <span className="text-xs font-bold text-indigo-500 uppercase tracking-wide">Chapitre {chapter.order}</span>
                                                <h3 className="font-bold text-slate-800 text-lg group-hover:text-indigo-600">{chapter.title}</h3>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => { setEditingChapter(chapter); setNewChapterTitle(chapter.title); setNewChapterSection(chapter.section || "Chapitres"); }} className="p-2 text-slate-400 hover:text-amber-500"><Icon name="pencil" /></button>
                                        <button onClick={() => handleDeleteChapter(chapter)} className="p-2 text-slate-400 hover:text-red-500"><Icon name="trash" /></button>
                                        <button onClick={() => toggleChapter(chapter.id)} className={`p-2 transition-transform ${expandedChapter === chapter.id ? 'rotate-180' : ''}`}><Icon name="caret-down" /></button>
                                    </div>
                                </div>

                                {/* LISTE DES DOCUMENTS */}
                                {expandedChapter === chapter.id && (
                                    <div className="p-4 bg-slate-50">
                                        <div className="space-y-2 mb-4">
                                            {(docs[chapter.id] || []).map((d, dIdx) => (
                                                <div key={d.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="flex flex-col gap-0 text-slate-300 scale-75">
                                                            <button onClick={() => moveDoc(dIdx, -1, chapter.id)} className="hover:text-indigo-600"><Icon name="caret-up" weight="bold" /></button>
                                                            <button onClick={() => moveDoc(dIdx, 1, chapter.id)} className="hover:text-indigo-600"><Icon name="caret-down" weight="bold" /></button>
                                                        </div>
                                                        <div className={`p-2 rounded-lg shrink-0 ${d.type === 'LINK' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
                                                            <Icon name={d.type === 'LINK' ? 'link' : 'file-pdf'} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-slate-700 text-sm truncate">{d.title}</div>
                                                            <div className="flex gap-1 mt-1 flex-wrap">
                                                                {d.classes && !d.classes.includes('ALL') ? d.classes.map(c => <span key={c} className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">{c}</span>) : <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Tous</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <a href={d.url} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 hover:text-indigo-600"><Icon name="eye" /></a>
                                                        <button onClick={() => openEditForm(d, chapter.id)} className="p-1.5 text-slate-400 hover:text-amber-600"><Icon name="pencil" /></button>
                                                        <button onClick={() => handleDeleteDoc(d)} className="p-1.5 text-slate-400 hover:text-red-600"><Icon name="trash" /></button>
                                                    </div>
                                                </div>
                                            ))}
                                            {(docs[chapter.id] || []).length === 0 && <p className="text-center text-xs text-slate-400 italic">Aucun document</p>}
                                        </div>

                                        {/* FORMULAIRE AJOUT/EDITION VIA LE SOUS-COMPOSANT */}
                                        {showDocForm === chapter.id ? (
                                            <DocumentForm
                                                chapterId={chapter.id}
                                                editingDoc={editingDoc}
                                                docType={docType} setDocType={setDocType}
                                                docFiles={docFiles} handleFileSelect={handleFileSelect}
                                                docUrl={docUrl} setDocUrl={setDocUrl}
                                                docTitle={docTitle} setDocTitle={setDocTitle}
                                                selectedClasses={selectedClasses} setSelectedClasses={setSelectedClasses}
                                                toggleClassTag={toggleClassTag}
                                                currentClasses={currentClasses} selectedLevel={selectedLevel}
                                                setShowDocForm={setShowDocForm} handleSaveDoc={handleSaveDoc}
                                                uploading={uploading}
                                            />
                                        ) : (
                                            <button onClick={() => openAddForm(chapter.id)} className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-400 font-bold text-sm hover:border-indigo-400 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2">
                                                <Icon name="plus" /> Ajouter des documents
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* CREATION NOUVEAU CHAPITRE */}
            {editingChapter ? null : (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-6 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                        <Icon name="plus-circle" /> Nouveau bloc
                    </h4>
                    <div className="flex gap-2 flex-col md:flex-row">
                        <input
                            placeholder="Titre (ex: Théorème de Pythagore)"
                            className="flex-1 border p-3 rounded-xl shadow-sm outline-none focus:ring-2 ring-indigo-200"
                            value={newChapterTitle}
                            onChange={e => setNewChapterTitle(e.target.value)}
                        />
                        <input
                            placeholder="Rubrique (ex: Manuel)"
                            className="border p-3 rounded-xl shadow-sm outline-none md:w-48 focus:ring-2 ring-indigo-200"
                            value={newChapterSection}
                            onChange={e => setNewChapterSection(e.target.value)}
                        />
                        <button
                            onClick={handleSaveChapter}
                            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-md transition-transform active:scale-95"
                        >
                            Créer
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}