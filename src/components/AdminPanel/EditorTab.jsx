import React, { useContext } from 'react';
import Editor from "@monaco-editor/react";
import { toast } from 'react-hot-toast';
import { Icon } from '../UI';
import MathText from '../MathText';
import { parseAndValidateExercise } from '../../utils/validators';
import { generatePreviewData } from '../../hooks/admin/useAdminPanel';

// NOUVEAU : Import du contexte d'administration
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

export default function EditorTab() {
    // NOUVEAU : On récupère toutes les variables et fonctions depuis le contexte
    const {
        jsonInput, setJsonInput,
        previewLevel, setPreviewLevel,
        previewData, setPreviewData,
        program,
        loadExerciseIntoEditor,
        handleSave
    } = useContext(AdminContext);

    const PreviewEngine = previewData && previewData.visualEngine ? ENGINE_REGISTRY[previewData.visualEngine] : null;

    return (
        <div className="h-full flex flex-col">
            {/* BARRE D'OUTILS */}
            <div className="mb-4 flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex gap-2 items-center">
                    <Icon name="code" className="text-indigo-600" />
                    <span className="font-bold text-slate-700">Éditeur JSON</span>

                    {/* Sélecteur d'exercice existant */}
                    <select
                        className="ml-4 p-2 rounded border border-slate-300 text-sm font-bold max-w-[300px]"
                        onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;

                            // CAS SPÉCIAL : DÉMO
                            if (val === "auto_pythagore_demo") {
                                const demoJson = {
                                    "id": "auto_pythagore_demo",
                                    "visual_engine": "ENGINE_PYTHAGORE",
                                    "common_config": {
                                        "visual_config_template": {
                                            "points": { "Right": "A", "Top": "B", "Bottom": "C" },
                                            "showSquare": { "size": 20 }
                                        }
                                    },
                                    "levels": {
                                        "1": {
                                            "variables": { "k": "randomInt(1, 5)", "base_a": 3, "base_b": 4 },
                                            "question_template": "Le triangle est rectangle en A. $AB={c1}$, $AC={c2}$. Calculer $BC$.",
                                            "calculations": {
                                                "c1": "base_a * k",
                                                "c2": "base_b * k",
                                                "hyp_carre": "c1^2 + c2^2",
                                                "hyp": "sqrt(hyp_carre)"
                                            },
                                            "correct_answer": "{hyp}",
                                            "explanation_template": "On utilise Pythagore : $$BC^2 = AB^2 + AC^2$$ $$BC^2 = {c1}^2 + {c2}^2 = {hyp_carre}$$ Donc $BC = \\sqrt{{hyp_carre}} = {hyp}$",
                                            "visual_config_override": {
                                                "vals": { "AB": "{c1}", "AC": "{c2}" },
                                                "given": {
                                                    "AB": { "val": "{c1}", "unit": "" },
                                                    "AC": { "val": "{c2}", "unit": "" }
                                                }
                                            }
                                        }
                                    }
                                };
                                setJsonInput(JSON.stringify(demoJson, null, 2));
                                toast.success("Démo chargée !");
                                setTimeout(() => setPreviewData(generatePreviewData(JSON.stringify(demoJson), 1)), 100);
                            }
                            // CAS STANDARD : CHARGEMENT DEPUIS LA DB
                            else {
                                loadExerciseIntoEditor(val);
                            }
                        }}
                    >
                        <option value="">-- Charger un exercice --</option>
                        <option value="auto_pythagore_demo" className="font-bold text-indigo-600 bg-indigo-50">
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
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            const preview = generatePreviewData(jsonInput, previewLevel);
                            if (preview && !preview.error) {
                                setPreviewData(preview);
                                toast.success("Aperçu généré !");
                            } else {
                                toast.error(preview?.error || "Erreur JSON. Vérifiez la syntaxe.");
                            }
                        }}
                        className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg font-bold hover:bg-indigo-200 flex items-center gap-2"
                    >
                        <Icon name="play" weight="fill" /> Aperçu
                    </button>
                    <button
                        onClick={handleSave}
                        className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700 flex items-center gap-2 shadow-lg"
                    >
                        <Icon name="floppy-disk" weight="fill" /> Sauvegarder
                    </button>
                </div>
            </div>

            {/* ZONE DE TRAVAIL (SPLIT SCREEN) */}
            <div className="grid lg:grid-cols-2 gap-6 flex-1 min-h-[600px]">
                {/* COLONNE GAUCHE : CODE */}
                <div className="flex flex-col">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Configuration JSON</label>
                    <div className="h-[600px] border-2 border-slate-700 rounded-xl overflow-hidden">
                        <Editor
                            height="100%"
                            defaultLanguage="json"
                            value={jsonInput}
                            onChange={(value) => setJsonInput(value)}
                            theme="vs-dark"
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                formatOnPaste: true,
                                formatOnType: true
                            }}
                        />
                        {/* ZONE DE FEEDBACK DE VALIDATION */}
                        <div className="mt-2 text-xs">
                            {(() => {
                                const check = parseAndValidateExercise(jsonInput);
                                if (check.success) {
                                    return (
                                        <div className="flex items-center gap-2 text-emerald-500 font-bold bg-emerald-50 p-2 rounded border border-emerald-200">
                                            <Icon name="check-circle" /> Structure Valide • ID: {check.data.id}
                                        </div>
                                    );
                                } else {
                                    return (
                                        <div className="flex items-start gap-2 text-red-500 font-mono bg-red-50 p-2 rounded border border-red-200 whitespace-pre-wrap">
                                            <Icon name="warning" className="mt-1 shrink-0" />
                                            <span>{check.error}</span>
                                        </div>
                                    );
                                }
                            })()}
                        </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-400 flex justify-between">
                        <span>Syntaxe stricte : guillemets doubles " obligatoires pour les clés.</span>
                        <button onClick={() => setJsonInput(JSON.stringify(JSON.parse(jsonInput), null, 2))} className="text-indigo-600 hover:underline">Formater</button>
                    </div>
                </div>

                {/* COLONNE DROITE : RENDU VISUEL */}
                <div className="bg-slate-100 rounded-xl border-2 border-slate-200 p-6 flex flex-col relative overflow-hidden min-h-[600px]">
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

                    <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#64748b_1px,transparent_1px)] [background-size:16px_16px]"></div>

                    {previewData && !previewData.error ? (
                        <div className="flex-1 flex flex-col items-center justify-start z-10 gap-6 animate-in fade-in slide-in-from-bottom-4 overflow-y-auto">
                            {PreviewEngine ? (
                                <div className="bg-white p-4 rounded-3xl shadow-lg border border-slate-200 transform scale-90 origin-top">
                                    <PreviewEngine config={previewData.visualConfig} />
                                </div>
                            ) : (
                                previewData.visualEngine !== 'NONE' && (
                                    <div className="text-xs text-red-400">Moteur {previewData.visualEngine} introuvable</div>
                                )
                            )}

                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full">
                                <div className="text-sm font-bold text-slate-400 uppercase mb-1">Question (Niveau {previewLevel})</div>
                                <div className="text-xl font-black text-slate-800 mb-4">
                                    <MathText text={previewData.question} />
                                </div>

                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Mode de réponse :</span>
                                    <span className={`text-xs font-bold px-2 py-1 rounded border ${previewData.responseType === 'GRAPH_POINT' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                        previewData.responseType === 'QCM' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                            'bg-blue-100 text-blue-700 border-blue-200'
                                        }`}>
                                        {previewData.responseType === 'GRAPH_POINT' && <Icon name="hand-pointing" className="inline mr-1" />}
                                        {previewData.responseType === 'NUMERIC' && <Icon name="numpad" className="inline mr-1" />}
                                        {previewData.responseType}
                                    </span>
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
        </div>
    );
}