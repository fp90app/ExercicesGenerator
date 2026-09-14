import React, { useContext } from 'react';
import { Icon } from '../UI';
import DocumentForm from './DocumentForm';
import { CoursesAdminContext } from './index';

export default function ChapterList() {
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
        toggleClassTag, handleSaveDoc,
        toggleSectionNumbering // <--- IMPORT DE LA NOUVELLE FONCTION
    } = useContext(CoursesAdminContext);

    return (
        <div className="space-y-8 animate-in fade-in">
            {groupedChapters.length === 0 && (
                <div className="text-center p-8 bg-slate-50 rounded-xl text-slate-400 italic border border-slate-200">
                    Aucun contenu pour ce niveau. Créez un bloc ci-dessous.
                </div>
            )}

            {/* BOUCLE SUR LE NOUVEAU FORMAT DE GROUPES */}
            {groupedChapters.map((group, groupIndex) => (
                <div key={`group-${groupIndex}`}>

                    {/* EN-TÊTE DE LA CATÉGORIE AVEC LE BOUTON DE NUMÉROTATION */}
                    <div className="flex justify-between items-center mb-3 pl-1 pr-2">
                        <h3 className="font-black text-slate-400 uppercase tracking-wider text-sm">
                            {group.sectionName}
                        </h3>
                        <button
                            onClick={() => toggleSectionNumbering(group.sectionName)}
                            className={`text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm ${group.isNumbered ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'}`}
                            title={group.isNumbered ? "Désactiver la numérotation automatique" : "Activer la numérotation automatique"}
                        >
                            <Icon name={group.isNumbered ? "list-numbers" : "minus"} size={14} weight="bold" />
                            {group.isNumbered ? "Numéroté" : "Non numéroté"}
                        </button>
                    </div>

                    <div className="space-y-4">
                        {group.items.map((chapter) => (
                            <div key={chapter.id} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-sm">
                                {/* EN-TÊTE CHAPITRE / BLOC */}
                                <div className="p-4 flex items-center gap-3 bg-white border-b border-slate-100">
                                    <div className="flex flex-col gap-1 text-slate-300 shrink-0">
                                        <button onClick={() => moveChapter(chapter.originalIndex, -1)} className="hover:text-indigo-600 transition-colors"><Icon name="caret-up" weight="bold" /></button>
                                        <button onClick={() => moveChapter(chapter.originalIndex, 1)} className="hover:text-indigo-600 transition-colors"><Icon name="caret-down" weight="bold" /></button>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {editingChapter?.id === chapter.id ? (
                                            <div className="flex gap-2 flex-col md:flex-row">
                                                <input
                                                    value={newChapterTitle}
                                                    onChange={e => setNewChapterTitle(e.target.value)}
                                                    className="border-2 border-slate-200 p-2 rounded-lg flex-1 outline-none focus:border-indigo-500 font-medium"
                                                    placeholder="Titre"
                                                />
                                                <input
                                                    list="section-suggestions"
                                                    value={newChapterSection}
                                                    onChange={e => setNewChapterSection(e.target.value)}
                                                    className="border-2 border-slate-200 p-2 rounded-lg md:w-40 outline-none focus:border-indigo-500 font-medium"
                                                    placeholder="Rubrique"
                                                />
                                                <div className="flex gap-2 shrink-0">
                                                    <button onClick={handleSaveChapter} className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100 p-2 rounded-lg transition-colors"><Icon name="check" weight="bold" /></button>
                                                    <button onClick={() => setEditingChapter(null)} className="text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors"><Icon name="x" weight="bold" /></button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div onClick={() => toggleChapter(chapter.id)} className="cursor-pointer group flex flex-col items-start">
                                                {/* AFFICHAGE CONDITIONNEL DU NUMÉRO */}
                                                {chapter.displayNumber !== null ? (
                                                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-full mb-1 inline-block border border-indigo-100">
                                                        Chapitre {chapter.displayNumber}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-full mb-1 inline-flex items-center gap-1 border border-slate-200">
                                                        <Icon name="bookmark-simple" size={10} weight="bold" /> Document
                                                    </span>
                                                )}
                                                <h3 className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors truncate w-full">{chapter.title}</h3>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button onClick={() => { setEditingChapter(chapter); setNewChapterTitle(chapter.title); setNewChapterSection(chapter.section || "Chapitres"); }} className="p-2 text-slate-400 hover:text-amber-500 transition-colors bg-white hover:bg-amber-50 rounded-lg"><Icon name="pencil" weight="bold" /></button>
                                        <button onClick={() => handleDeleteChapter(chapter)} className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-white hover:bg-red-50 rounded-lg"><Icon name="trash" weight="bold" /></button>
                                        <button onClick={() => toggleChapter(chapter.id)} className={`p-2 text-slate-500 hover:text-indigo-600 transition-transform ${expandedChapter === chapter.id ? 'rotate-180' : ''}`}><Icon name="caret-down" weight="bold" /></button>
                                    </div>
                                </div>

                                {/* LISTE DES DOCUMENTS */}
                                {expandedChapter === chapter.id && (
                                    <div className="p-4 bg-slate-50/50">
                                        <div className="space-y-2 mb-4">
                                            {(docs[chapter.id] || []).map((d, dIdx) => (
                                                <div key={d.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="flex flex-col gap-0 text-slate-300 scale-75 shrink-0">
                                                            <button onClick={() => moveDoc(dIdx, -1, chapter.id)} className="hover:text-indigo-600 transition-colors"><Icon name="caret-up" weight="bold" /></button>
                                                            <button onClick={() => moveDoc(dIdx, 1, chapter.id)} className="hover:text-indigo-600 transition-colors"><Icon name="caret-down" weight="bold" /></button>
                                                        </div>
                                                        <div className={`p-2.5 rounded-lg shrink-0 ${d.type === 'LINK' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
                                                            <Icon name={d.type === 'LINK' ? 'link' : 'file-pdf'} weight="fill" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-slate-700 text-sm truncate" title={d.title}>{d.title}</div>
                                                            <div className="flex gap-1 mt-1 flex-wrap">
                                                                {d.classes && !d.classes.includes('ALL') ? d.classes.map(c => <span key={c} className="text-[10px] bg-indigo-100 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded font-bold">{c}</span>) : <span className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded font-bold">Tous</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <a href={d.url} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg transition-colors"><Icon name="eye" weight="bold" /></a>
                                                        <button onClick={() => openEditForm(d, chapter.id)} className="p-2 text-slate-400 hover:text-amber-600 bg-slate-50 hover:bg-amber-50 rounded-lg transition-colors"><Icon name="pencil" weight="bold" /></button>
                                                        <button onClick={() => handleDeleteDoc(d)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-lg transition-colors"><Icon name="trash" weight="bold" /></button>
                                                    </div>
                                                </div>
                                            ))}
                                            {(docs[chapter.id] || []).length === 0 && <p className="text-center text-xs text-slate-400 italic py-4">Aucun document dans ce bloc.</p>}
                                        </div>

                                        {/* FORMULAIRE AJOUT/EDITION VIA LE SOUS-COMPOSANT */}
                                        {showDocForm === chapter.id ? (
                                            <DocumentForm
                                                chapterId={chapter.id}
                                            />
                                        ) : (
                                            <button onClick={() => openAddForm(chapter.id)} className="w-full py-3 border-2 border-dashed border-slate-300 bg-white rounded-xl text-slate-500 font-bold text-sm hover:border-indigo-400 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 shadow-sm">
                                                <Icon name="plus" weight="bold" /> Ajouter des documents
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* CREATION NOUVEAU BLOC */}
            {editingChapter ? null : (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 mt-6 shadow-sm">
                    <h4 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Icon name="plus-circle" className="text-indigo-600" /> Ajouter un nouveau bloc
                    </h4>
                    <div className="flex gap-3 flex-col md:flex-row">
                        <input
                            placeholder="Titre (ex: Théorème de Pythagore)"
                            className="flex-1 border-2 border-slate-200 p-3 rounded-xl outline-none focus:border-indigo-500 font-medium"
                            value={newChapterTitle}
                            onChange={e => setNewChapterTitle(e.target.value)}
                        />

                        <input
                            list="section-suggestions"
                            placeholder="Rubrique (ex: Chapitres)"
                            className="border-2 border-slate-200 p-3 rounded-xl outline-none focus:border-indigo-500 md:w-56 font-medium"
                            value={newChapterSection}
                            onChange={e => setNewChapterSection(e.target.value)}
                        />

                        {/* DATALIST POUR LES SUGGESTIONS */}
                        <datalist id="section-suggestions">
                            <option value="Manuels" />
                            <option value="Chapitres" />
                            <option value="Évaluations" />
                            <option value="Devoirs Maison" />
                            <option value="Fiches Méthode" />
                            <option value="Corrections" />
                        </datalist>

                        <button
                            onClick={handleSaveChapter}
                            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Icon name="check" weight="bold" /> Créer
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-3 italic">
                        💡 Astuce : Tapez un nouveau nom de rubrique ou choisissez parmi les suggestions. Vous pourrez ensuite déplacer le bloc avec les flèches haut/bas pour l'intercaler n'importe où.
                    </p>
                </div>
            )}
        </div>
    );
}