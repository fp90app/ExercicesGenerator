import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { Icon } from './UI';

const LEVELS = ["6ème", "5ème", "4ème", "3ème"];

export default function CoursesView({ userClass }) {
    // --- ÉTATS ---
    const [selectedLevel, setSelectedLevel] = useState("3ème");
    const [availableClasses, setAvailableClasses] = useState([]); // ex: ["3A", "3B"]
    const [selectedClass, setSelectedClass] = useState(null);

    // --- CONTENU ---
    const [chapters, setChapters] = useState([]);
    const [docs, setDocs] = useState({});
    const [expandedChapter, setExpandedChapter] = useState(null);
    const [loading, setLoading] = useState(false);
    const [configLoaded, setConfigLoaded] = useState(false);

    // 1. Charger la configuration des classes (pour afficher les boutons 3A, 3B...)
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const docRef = doc(db, "config", "courses");
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const data = snap.data();
                    setAvailableClasses(data[selectedLevel] || []);
                } else {
                    setAvailableClasses([]);
                }
            } catch (e) {
                console.error("Erreur config:", e);
            } finally {
                setConfigLoaded(true);
            }
        };
        fetchConfig();

        // Reset quand on change de niveau
        setSelectedClass(null);
        setChapters([]);
    }, [selectedLevel]);

    // 2. Pré-sélectionner la classe de l'élève si elle existe
    useEffect(() => {
        if (userClass && availableClasses.includes(userClass)) {
            setSelectedClass(userClass);
        }
    }, [availableClasses, userClass]);

    // 3. Charger les chapitres (UNIQUEMENT si une classe est choisie)
    useEffect(() => {
        if (!selectedClass) return;

        const fetchChapters = async () => {
            setLoading(true);
            setExpandedChapter(null);
            setDocs({});
            try {
                // On trie par 'order' pour respecter ton rangement dans l'admin
                const q = query(
                    collection(db, "courses_chapters"),
                    where("level", "==", selectedLevel),
                    orderBy("order", "asc")
                );
                const snapshot = await getDocs(q);
                setChapters(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (error) { console.error("Erreur chapitres:", error); } finally { setLoading(false); }
        };
        fetchChapters();
    }, [selectedLevel, selectedClass]);

    // 4. Charger les documents d'un chapitre
    const handleToggleChapter = async (chapterId) => {
        if (expandedChapter === chapterId) {
            setExpandedChapter(null);
            return;
        }
        setExpandedChapter(chapterId);
        if (docs[chapterId]) return;

        try {
            // Essaie de trier par 'order' (ton classement manuel avec les flèches)
            let q = query(collection(db, "courses_docs"), where("chapterId", "==", chapterId), orderBy("order", "asc"));
            try {
                const snapshot = await getDocs(q);
                setDocs(prev => ({ ...prev, [chapterId]: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) }));
            } catch (e) {
                // Fallback si l'index n'existe pas encore ou vieux documents sans 'order'
                q = query(collection(db, "courses_docs"), where("chapterId", "==", chapterId), orderBy("createdAt", "desc"));
                const snapshot = await getDocs(q);
                setDocs(prev => ({ ...prev, [chapterId]: snapshot.docs.map(d => ({ id: d.id, ...d.data() })) }));
            }
        } catch (error) { console.error("Erreur docs:", error); }
    };

    const getVisibleDocs = (chapterId) => {
        const chapterDocs = docs[chapterId] || [];
        return chapterDocs.filter(d => d.classes.includes('ALL') || d.classes.includes(selectedClass));
    };

    // 5. REGROUPEMENT PAR RUBRIQUE (SECTION)
    const groupedChapters = chapters.reduce((acc, chapter) => {
        const section = chapter.section || "Chapitres"; // Rubrique par défaut
        if (!acc[section]) acc[section] = [];
        acc[section].push(chapter);
        return acc;
    }, {});

    return (
        <div className="max-w-4xl mx-auto pb-12 px-4 md:px-0 animate-in fade-in">

            {/* HEADER : SÉLECTION NIVEAU */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-6">
                <h2 className="text-2xl font-black text-slate-800 mb-4 flex items-center gap-2">
                    <Icon name="books" className="text-emerald-600" /> Mes Cours
                </h2>

                {/* ONGLETS NIVEAUX */}
                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                    {LEVELS.map(lvl => (
                        <button
                            key={lvl}
                            onClick={() => setSelectedLevel(lvl)}
                            className={`flex-1 min-w-[80px] py-3 px-4 rounded-xl font-bold text-sm transition-all border-b-4 ${selectedLevel === lvl
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-500 shadow-sm'
                                    : 'bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100'
                                }`}
                        >
                            {lvl}
                        </button>
                    ))}
                </div>

                {/* BOUTONS CLASSES */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-3">Choisis ta classe :</p>

                    {!configLoaded ? (
                        <div className="text-slate-400 italic text-sm">Chargement des classes...</div>
                    ) : availableClasses.length === 0 ? (
                        <div className="bg-orange-50 text-orange-600 p-3 rounded-lg text-sm border border-orange-200 flex items-center gap-2">
                            <Icon name="warning" />
                            <span>Aucune classe configurée. (Le prof doit les ajouter dans l'admin)</span>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {availableClasses.map(cls => (
                                <button
                                    key={cls}
                                    onClick={() => setSelectedClass(cls)}
                                    className={`px-6 py-2 rounded-lg font-bold transition-all border-2 ${selectedClass === cls
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg scale-105'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                                        }`}
                                >
                                    {cls}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* CONTENU PRINCIPAL */}
            {!selectedClass ? (
                <div className="text-center p-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
                    <Icon name="hand-pointing" className="text-4xl mb-2 mx-auto opacity-50" />
                    <p className="font-bold">Sélectionne ta classe ci-dessus pour voir les documents.</p>
                </div>
            ) : loading ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
                    <Icon name="spinner" className="animate-spin text-2xl" />
                    <span>Chargement des chapitres...</span>
                </div>
            ) : (
                <div className="space-y-10">
                    {Object.keys(groupedChapters).length === 0 && (
                        <div className="text-center p-10 bg-slate-50 rounded-2xl text-slate-400">
                            Aucun chapitre publié pour les {selectedLevel}.
                        </div>
                    )}

                    {/* BOUCLE SUR LES RUBRIQUES (Manuels, Chapitres...) */}
                    {Object.entries(groupedChapters).map(([sectionName, sectionChapters]) => (
                        <div key={sectionName} className="animate-in slide-in-from-bottom-4 duration-500">

                            {/* TITRE DE LA RUBRIQUE */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-px bg-slate-200 flex-1"></div>
                                <h3 className="font-black text-slate-400 uppercase tracking-widest text-sm">
                                    {sectionName}
                                </h3>
                                <div className="h-px bg-slate-200 flex-1"></div>
                            </div>

                            <div className="space-y-4">
                                {sectionChapters.map((chapter) => {
                                    const isOpen = expandedChapter === chapter.id;
                                    const visibleDocs = getVisibleDocs(chapter.id);

                                    return (
                                        <div key={chapter.id} className={`bg-white rounded-xl border transition-all duration-300 overflow-hidden ${isOpen ? 'border-emerald-200 shadow-md ring-1 ring-emerald-100' : 'border-slate-200 hover:border-emerald-300'}`}>
                                            <button onClick={() => handleToggleChapter(chapter.id)} className="w-full text-left p-4 md:p-5 flex items-center gap-4 bg-white hover:bg-slate-50 transition-colors">

                                                {/* Numéro du Chapitre */}
                                                <div className="flex flex-col items-center justify-center w-14 shrink-0">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg transition-colors ${isOpen ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                        {chapter.order}
                                                    </div>
                                                </div>

                                                <div className="flex-1">
                                                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">
                                                        CHAPITRE {chapter.order}
                                                    </span>
                                                    <h3 className={`font-bold text-lg leading-tight ${isOpen ? 'text-emerald-900' : 'text-slate-700'}`}>
                                                        {chapter.title}
                                                    </h3>
                                                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                                                        {isOpen ? <span>{visibleDocs.length} document(s)</span> : <span>Clique pour voir</span>}
                                                    </div>
                                                </div>
                                                <Icon name="caret-down" className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-emerald-500' : ''}`} />
                                            </button>

                                            {/* LISTE DES DOCUMENTS */}
                                            {isOpen && (
                                                <div className="border-t border-slate-100 bg-slate-50/50 p-2 md:p-4 grid gap-2 animate-in slide-in-from-top-2">
                                                    {visibleDocs.length === 0 ? (
                                                        <div className="text-sm text-slate-400 italic text-center py-4">Aucun document pour {selectedClass}.</div>
                                                    ) : (
                                                        visibleDocs.map(doc => (
                                                            <a key={doc.id} href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-400 hover:shadow-md hover:-translate-y-0.5 transition-all group relative overflow-hidden">
                                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${doc.type === 'LINK' ? 'bg-orange-400' : 'bg-red-500'}`}></div>
                                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${doc.type === 'LINK' ? 'bg-orange-50 text-orange-500' : 'bg-red-50 text-red-500'}`}>
                                                                    <Icon name={doc.type === 'LINK' ? 'youtube-logo' : 'file-pdf'} weight="fill" className="text-2xl" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-bold text-slate-700 group-hover:text-emerald-700 truncate">{doc.title}</div>
                                                                    <div className="text-[10px] text-slate-400 flex gap-2 mt-0.5">
                                                                        {doc.type === 'LINK' ? 'Lien Web' : 'Fichier PDF'}
                                                                        {!doc.classes.includes('ALL') && <span className="text-emerald-600 font-bold bg-emerald-100 px-1 rounded">Spécial {doc.classes.join(', ')}</span>}
                                                                    </div>
                                                                </div>
                                                                <div className="text-slate-300 group-hover:text-emerald-500 px-2"><Icon name="download-simple" weight="bold" /></div>
                                                            </a>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}