import React, { useState, useEffect } from 'react';
import { db, storage } from '../../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { Icon } from '../UI';

export default function AutoBankTab() {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    // --- FORMULAIRE D'AJOUT ---
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [themeInput, setThemeInput] = useState("");

    // --- FILTRE ---
    const [filterTheme, setFilterTheme] = useState("ALL");

    useEffect(() => {
        fetchQuestions();
    }, []);

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "auto_questions"), orderBy("createdAt", "desc"));
            const snap = await getDocs(q);
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setQuestions(list);
        } catch (error) {
            console.error("Erreur de chargement des questions :", error);
            toast.error("Impossible de charger la banque de questions.");
        } finally {
            setLoading(false);
        }
    };

    // Obtenir la liste unique des thèmes déjà utilisés pour les suggestions
    const availableThemes = [...new Set(questions.map(q => q.theme))].sort();

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) return toast.error("Choisis une image d'abord !");

        const themeToSave = themeInput.trim().toUpperCase();
        if (!themeToSave) return toast.error("Indique un thème (ex: PYTHAGORE).");

        setUploading(true);
        const toastId = toast.loading("Envoi de la question...");

        try {
            // 1. Upload de l'image dans Firebase Storage
            const ext = selectedFile.name.split('.').pop();
            const fileName = `flash_questions/${Date.now()}_${themeToSave.replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`;
            const fileRef = ref(storage, fileName);

            await uploadBytes(fileRef, selectedFile);
            const url = await getDownloadURL(fileRef);

            // 2. Enregistrement dans Firestore
            const newQuestion = {
                theme: themeToSave,
                imageUrl: url,
                storagePath: fileName,
                createdAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, "auto_questions"), newQuestion);

            // 3. Mise à jour de l'affichage
            setQuestions([{ id: docRef.id, ...newQuestion, createdAt: new Date() }, ...questions]);

            // 4. Reset du formulaire
            setSelectedFile(null);
            setPreviewUrl(null);
            // On ne reset pas le thème pour permettre d'enchaîner l'upload de plusieurs images du même thème !

            toast.success("Question ajoutée à la banque !", { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors de l'envoi de l'image.", { id: toastId });
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (questionId, storagePath) => {
        if (!window.confirm("Supprimer définitivement cette question de la banque ?")) return;

        try {
            // 1. Supprimer l'image du stockage
            if (storagePath) {
                await deleteObject(ref(storage, storagePath)).catch(e => console.log("L'image n'était peut-être plus dans le stockage", e));
            }
            // 2. Supprimer la référence en base de données
            await deleteDoc(doc(db, "auto_questions", questionId));

            // 3. Mise à jour de l'affichage
            setQuestions(questions.filter(q => q.id !== questionId));
            toast.success("Question supprimée.");
        } catch (error) {
            console.error(error);
            toast.error("Erreur lors de la suppression.");
        }
    };

    const filteredQuestions = filterTheme === "ALL"
        ? questions
        : questions.filter(q => q.theme === filterTheme);

    if (loading) return <div className="p-10 text-center font-bold text-slate-400"><Icon name="spinner" className="animate-spin" /> Chargement de la banque...</div>;

    return (
        <div className="space-y-8 animate-in fade-in pb-12">

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <Icon name="images" className="text-indigo-600" /> Banque d'Automatismes
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Stockez ici les images de vos questions flashs. Elles seront utilisées plus tard par le générateur de PDF pour créer des évaluations sur-mesure.
                    </p>
                </div>
            </div>

            {/* ZONE D'AJOUT */}
            <div className="bg-indigo-50/50 p-6 md:p-8 rounded-3xl border-2 border-indigo-100 shadow-sm flex flex-col md:flex-row gap-8 items-start">

                {/* APERÇU IMAGE */}
                <div className="w-full md:w-1/3 flex flex-col gap-2">
                    <label className="text-xs font-bold text-indigo-800 uppercase tracking-widest">Aperçu de la question</label>
                    <label className={`w-full aspect-video border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden ${previewUrl ? 'border-indigo-400 bg-white' : 'border-indigo-200 hover:border-indigo-400 bg-indigo-50/50'}`}>
                        {previewUrl ? (
                            <img src={previewUrl} alt="Aperçu" className="w-full h-full object-contain" />
                        ) : (
                            <div className="text-indigo-400 flex flex-col items-center gap-2">
                                <Icon name="upload-simple" size={32} />
                                <span className="text-sm font-bold">Cliquer pour choisir une image</span>
                            </div>
                        )}
                        <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                    </label>
                    {previewUrl && (
                        <button onClick={() => { setSelectedFile(null); setPreviewUrl(null); }} className="text-xs text-red-500 font-bold hover:underline self-end">
                            Retirer l'image
                        </button>
                    )}
                </div>

                {/* FORMULAIRE */}
                <form onSubmit={handleUpload} className="w-full md:w-2/3 flex flex-col gap-6">
                    <div>
                        <label className="block text-xs font-bold text-indigo-800 uppercase tracking-widest mb-2">Thème de la question</label>
                        <input
                            type="text"
                            list="theme-suggestions"
                            value={themeInput}
                            onChange={e => setThemeInput(e.target.value.toUpperCase())}
                            className="w-full p-4 border-2 border-indigo-200 rounded-xl font-black text-lg text-indigo-900 outline-none focus:border-indigo-500 bg-white shadow-sm placeholder:font-normal placeholder:text-slate-300"
                            placeholder="Ex: PYTHAGORE, RELATIFS, THALÈS..."
                            required
                        />
                        <datalist id="theme-suggestions">
                            {availableThemes.map(t => <option key={t} value={t} />)}
                        </datalist>
                        <p className="text-xs text-slate-500 mt-2 italic">Astuce : Le thème ne s'efface pas après l'envoi, ce qui vous permet d'ajouter 10 questions sur Pythagore à la suite très rapidement !</p>
                    </div>

                    <button
                        type="submit"
                        disabled={uploading || !selectedFile}
                        className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold shadow-md hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100 transition-transform active:scale-95 text-lg"
                    >
                        {uploading ? <Icon name="spinner" className="animate-spin" /> : <Icon name="floppy-disk" weight="fill" />}
                        Enregistrer dans la banque
                    </button>
                </form>
            </div>

            {/* GALERIE EXISTANTE */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-100 pb-4">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <Icon name="files" /> Questions disponibles ({filteredQuestions.length})
                    </h3>

                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200 shrink-0">
                        <Icon name="funnel" className="text-slate-500 ml-1" />
                        <select
                            value={filterTheme}
                            onChange={e => setFilterTheme(e.target.value)}
                            className="bg-transparent text-sm font-bold text-indigo-700 outline-none cursor-pointer"
                        >
                            <option value="ALL">Tous les thèmes</option>
                            {availableThemes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                {filteredQuestions.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 italic bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        Aucune image pour ce thème.
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {filteredQuestions.map(q => (
                            <div key={q.id} className="group relative bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-300 transition-all">
                                <div className="aspect-square bg-white flex items-center justify-center p-2 relative">
                                    <img src={q.imageUrl} alt="Question flash" className="max-w-full max-h-full object-contain" loading="lazy" />
                                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button
                                            onClick={() => handleDelete(q.id, q.storagePath)}
                                            className="bg-red-500 text-white p-3 rounded-full hover:bg-red-600 transition-transform hover:scale-110 shadow-lg"
                                            title="Supprimer la question"
                                        >
                                            <Icon name="trash" weight="fill" />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-2 bg-slate-100 border-t border-slate-200 text-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 bg-white px-2 py-0.5 rounded shadow-sm">
                                        {q.theme}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}