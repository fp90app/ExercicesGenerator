import React, { useContext } from 'react';
import { Icon } from '../UI';
import { toast } from 'react-hot-toast';

// NOUVEAU : Import du contexte d'administration
import { AdminContext } from '../AdminPanel';

export default function MessagesTab() {
    // NOUVEAU : On récupère toutes les variables et fonctions depuis le contexte
    const {
        tickets,
        fetchTickets,
        handleDeleteTicket
    } = useContext(AdminContext);

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-slate-800">Boîte de réception</h2>
                <button onClick={fetchTickets} className="p-2 bg-white rounded-full shadow hover:rotate-180 transition-transform">
                    <Icon name="arrows-clockwise" />
                </button>
            </div>

            {tickets.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                    <Icon name="tray" size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Aucun message pour le moment.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {tickets.map(ticket => (
                        <div key={ticket.id} className={`bg-white p-6 rounded-2xl shadow-sm border-l-8 ${ticket.type === 'BUG' ? 'border-red-500' : 'border-indigo-500'} relative group`}>
                            {/* En-tête du message */}
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider text-white ${ticket.type === 'BUG' ? 'bg-red-500' : 'bg-indigo-500'}`}>
                                        {ticket.type}
                                    </span>
                                    <span className="font-bold text-slate-700 text-sm">
                                        {ticket.userContact || ticket.userEmail || "Anonyme"}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {new Date(ticket.createdAt).toLocaleString()}
                                    </span>
                                </div>
                                <button
                                    onClick={() => handleDeleteTicket(ticket.id)}
                                    className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                    title="Supprimer"
                                >
                                    <Icon name="trash" weight="bold" />
                                </button>
                            </div>

                            <span className="font-bold text-slate-700 text-sm">
                                {ticket.userContact || "Anonyme"}
                                {/* Afficher l'email de réponse s'il existe */}
                                {ticket.replyEmail && (
                                    <span className="ml-2 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 font-mono text-xs">
                                        ✉️ {ticket.replyEmail}
                                    </span>
                                )}
                            </span>

                            {/* Corps du message */}
                            <p className="text-slate-800 font-medium whitespace-pre-wrap mb-4 pl-1">
                                {ticket.message}
                            </p>

                            {/* ZONE TECHNIQUE (Si Bug) */}
                            {ticket.technicalContext && (
                                <div className="bg-slate-900 rounded-xl p-4 mt-4 overflow-hidden">
                                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 border-b border-slate-700 pb-2">
                                        <Icon name="code" /> Données Techniques (Debug)
                                    </div>
                                    <pre className="font-mono text-[10px] text-green-400 overflow-x-auto whitespace-pre-wrap break-all">
                                        {ticket.technicalContext}
                                    </pre>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(ticket.technicalContext);
                                            toast.success("Copié !");
                                        }}
                                        className="mt-2 text-xs bg-slate-800 text-slate-300 px-3 py-1 rounded hover:bg-slate-700 transition-colors"
                                    >
                                        Copier le JSON
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}