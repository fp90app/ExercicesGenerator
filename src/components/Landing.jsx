import React from 'react';
import { Icon } from './UI';

const Landing = ({ onConnect }) => {
    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-indigo-200 flex flex-col">



            {/* --- HERO SECTION --- */}
            <div className="flex-1 pt-32 pb-16 px-4 md:px-6 flex flex-col justify-center">
                <div className="max-w-4xl mx-auto text-center">

                    {/* Badge Collège */}
                    <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-xs md:text-sm font-bold uppercase tracking-wider mb-8 border border-indigo-100 animate-in fade-in slide-in-from-bottom-4">
                        <Icon name="graduation-cap" weight="fill" size={18} />
                        Collège Simone SIGNORET (BELFORT)
                    </div>

                    {/* Titre principal */}
                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 leading-tight tracking-tight animate-in fade-in slide-in-from-bottom-8 duration-700">
                        Espace d'entraînement aux <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Mathématiques</span>
                    </h1>

                    {/* Sous-titre / Description */}
                    <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        Plateforme pédagogique conçue par <strong>M. PUTOD</strong>.
                    </p>

                    {/* Bouton d'action */}
                    <div className="flex justify-center animate-in fade-in zoom-in duration-1000">
                        <button
                            onClick={onConnect}
                            className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all hover:scale-105 hover:-translate-y-1 flex items-center justify-center gap-3"
                        >
                            Accéder à mon espace <Icon name="arrow-right" weight="bold" />
                        </button>
                    </div>
                </div>
            </div>

            {/* --- FEATURES GRID --- */}
            <div className="px-4 md:px-6 pb-20">
                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Carte 3 */}
                    <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl hover:border-purple-300 hover:shadow-lg transition-all group">
                        <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-6 text-purple-600 group-hover:scale-110 transition-transform border border-purple-100">
                            <Icon name="chart-line-up" weight="fill" size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Suivi des compétences</h3>
                        <p className="text-slate-500 text-sm leading-relaxed">
                            Visualisez vos points forts et les notions à retravailler grâce à un tableau de bord personnel.
                        </p>
                    </div>
                    {/* Carte 1 */}
                    <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl hover:border-indigo-300 hover:shadow-lg transition-all group">
                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-6 text-indigo-600 group-hover:scale-110 transition-transform border border-indigo-100">
                            <Icon name="lightning" weight="fill" size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Automatismes pour les 3èmes</h3>
                        <p className="text-slate-500 text-sm leading-relaxed">
                            Calcul littéral, fractions, géométrie... Des séries générées aléatoirement pour s'entraîner sans limite avec une correction détaillée.
                        </p>
                    </div>

                    {/* Carte 2 */}
                    <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl hover:border-emerald-300 hover:shadow-lg transition-all group">
                        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-6 text-emerald-600 group-hover:scale-110 transition-transform border border-emerald-100">
                            <Icon name="exam" weight="fill" size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Préparation DNB</h3>
                        <p className="text-slate-500 text-sm leading-relaxed">
                            Entraînez-vous sur de véritables annales du brevet interactives. Vos réponses sont évaluées et notées automatiquement.
                        </p>
                    </div>



                </div>
            </div>

            {/* --- FOOTER --- */}
            <footer className="bg-white border-t border-slate-200 py-8 text-center shrink-0">
                <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-slate-400 font-bold text-sm">
                        Maths Signoret © {new Date().getFullYear()}
                    </div>
                    <div className="flex gap-6 text-sm font-bold text-slate-500">
                        <span className="flex items-center gap-1.5"><Icon name="chalkboard-teacher" weight="fill" size={16} /> Fabien PUTOD - fabien.putod@ac-besancon.fr</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Landing;