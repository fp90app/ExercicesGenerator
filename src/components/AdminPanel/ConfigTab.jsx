import React, { useContext } from 'react';
import { Icon } from '../UI';

// NOUVEAU : Import du contexte d'administration
import { AdminContext } from '../AdminPanel';

export default function ConfigTab() {
    // NOUVEAU : On récupère toutes les variables et fonctions depuis le contexte
    const {
        config,
        setConfig,
        saveConfig,
        loading,
        migrateDataToFirestore
    } = useContext(AdminContext);

    return (
        <div className="max-w-xl mx-auto space-y-6">
            {/* MIGRATION SYSTEME */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mt-6">
                <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <Icon name="database" /> Initialisation Données (Système)
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                    Envoie la structure locale vers Firestore. À n'utiliser qu'une seule fois pour initialiser le CMS.
                </p>
                <button
                    onClick={migrateDataToFirestore}
                    disabled={loading}
                    className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-black transition-all"
                >
                    {loading ? "Traitement en cours..." : "Exécuter la Migration"}
                </button>
            </div>

            {/* MESSAGE ANNONCE */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Icon name="megaphone" /> Bannière d'annonce
                </h3>
                <input
                    type="text"
                    value={config.newsMessage || ""}
                    onChange={e => setConfig({ ...config, newsMessage: e.target.value })}
                    className="w-full p-3 rounded-lg border mb-4"
                    placeholder="Message..."
                />
                <div className="flex gap-2">
                    {['blue', 'emerald', 'amber', 'red', 'purple'].map(c => (
                        <button
                            key={c}
                            onClick={() => setConfig({ ...config, newsColor: c })}
                            className={`w-8 h-8 rounded-full border-2 ${config.newsColor === c ? 'border-slate-800 scale-110' : 'border-transparent opacity-50'} bg-${c}-500`}
                        />
                    ))}
                </div>
            </div>

            {/* MAINTENANCE */}
            <div className={`p-6 rounded-2xl border flex justify-between items-center ${config.maintenance ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                <div>
                    <h3 className="font-bold text-red-600 flex items-center gap-2">
                        <Icon name="warning-circle" /> Mode Maintenance
                    </h3>
                    <p className="text-xs text-slate-500">Bloque l'accès aux élèves.</p>
                </div>
                <button
                    onClick={() => setConfig({ ...config, maintenance: !config.maintenance })}
                    className={`px-4 py-2 rounded-lg font-bold text-sm ${config.maintenance ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-500'}`}
                >
                    {config.maintenance ? "ACTIVÉ" : "DÉSACTIVÉ"}
                </button>
            </div>

            {/* SAUVEGARDE */}
            <button
                onClick={saveConfig}
                className="w-full py-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-black transition-colors"
            >
                Enregistrer Config
            </button>
        </div>
    );
}