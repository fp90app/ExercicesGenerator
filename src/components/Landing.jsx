import React from 'react';
import { Icon } from './UI';

const Landing = ({ onConnect }) => {
    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-indigo-200">

            {/* --- NAV BAR --- */}
            <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <span className="font-serif italic font-bold text-xl">f(x)</span>
                        </div>
                        <span className="text-xl font-black tracking-tight text-slate-800 hidden md:block">
                            Maths Signoret
                        </span>
                    </div>
                    <button
                        onClick={onConnect}
                        className="bg-slate-900 text-white px-6 py-2.5 rounded-full font-bold hover:bg-indigo-600 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <Icon name="sign-in" weight="bold" />
                        Se connecter
                    </button>
                </div>
            </nav>

            {/* --- HERO SECTION --- */}
            <div className="pt-32 pb-20 px-6">
                <div className="max-w-6xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-8 animate-in fade-in slide-in-from-bottom-4">
                        <Icon name="star" weight="fill" /> Nouveau Brevet 2026
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-6 leading-tight tracking-tight animate-in fade-in slide-in-from-bottom-8 duration-700">
                        Maîtrise les maths.<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Sans t'ennuyer.</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        L'application ultime pour les 3ème. Automatismes, sujets de brevet interactifs et progression gamifiée pour viser l'excellence.
                    </p>
                    <div className="flex flex-col md:flex-row justify-center gap-4 animate-in fade-in zoom-in duration-1000">
                        <button onClick={onConnect} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all hover:scale-105 flex items-center justify-center gap-3">
                            Commencer l'entraînement <Icon name="rocket-launch" weight="fill" />
                        </button>
                        <button className="px-8 py-4 bg-white text-slate-700 border-2 border-slate-200 rounded-2xl font-bold text-lg hover:border-indigo-200 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                            Voir le programme <Icon name="caret-down" weight="bold" />
                        </button>
                    </div>
                </div>
            </div>

            {/* --- FEATURES GRID (BENTO STYLE) --- */}
            <div className="px-6 pb-24">
                <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* CARTE 1: AUTOMATISMES (Grande) */}
                    <div className="md:col-span-2 bg-slate-900 text-white p-8 rounded-3xl relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[80px] opacity-30 group-hover:opacity-50 transition-opacity"></div>
                        <div className="relative z-10">
                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6 text-2xl backdrop-blur-sm">
                                <Icon name="lightning" weight="fill" className="text-amber-400" />
                            </div>
                            <h3 className="text-2xl font-bold mb-2">Automatismes & Calcul Mental</h3>
                            <p className="text-slate-300 mb-6 max-w-md">
                                Prépare-toi à la nouvelle épreuve du Brevet 2026. Des centaines de questions générées aléatoirement pour ne jamais refaire le même exercice.
                            </p>
                            <div className="inline-flex gap-2">
                                <span className="bg-white/10 px-3 py-1 rounded-lg text-xs font-bold">Calcul littéral</span>
                                <span className="bg-white/10 px-3 py-1 rounded-lg text-xs font-bold">Fractions</span>
                                <span className="bg-white/10 px-3 py-1 rounded-lg text-xs font-bold">Puissances</span>
                            </div>
                        </div>
                    </div>

                    {/* CARTE 2: GAMIFICATION */}
                    <div className="bg-white border-2 border-slate-100 p-8 rounded-3xl hover:border-purple-200 hover:shadow-xl transition-all group">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6 text-2xl group-hover:scale-110 transition-transform">
                            <Icon name="trophy" weight="fill" className="text-purple-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Gagne de l'XP</h3>
                        <p className="text-slate-500 text-sm">
                            Chaque bonne réponse te rapporte des points. Monte de niveau, débloque des succès et bats ton record en mode Survie.
                        </p>
                    </div>

                    {/* CARTE 3: BREVET */}
                    <div className="bg-white border-2 border-slate-100 p-8 rounded-3xl hover:border-emerald-200 hover:shadow-xl transition-all group">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-6 text-2xl group-hover:scale-110 transition-transform">
                            <Icon name="graduation-cap" weight="fill" className="text-emerald-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Sujets Complets</h3>
                        <p className="text-slate-500 text-sm">
                            Entraîne-toi sur de vraies annales de Brevet interactives. Correction détaillée immédiate et notation automatique.
                        </p>
                    </div>

                    {/* CARTE 4: PROFS (Large) */}
                    <div className="md:col-span-2 bg-gradient-to-br from-indigo-50 to-white border-2 border-indigo-100 p-8 rounded-3xl relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold text-indigo-900 mb-2 flex items-center gap-2">
                                <Icon name="chalkboard-teacher" weight="fill" /> Pour les Profs aussi
                            </h3>
                            <p className="text-indigo-700/80 text-sm max-w-lg">
                                Créez votre classe, suivez la progression de vos élèves en temps réel et débloquez-leur l'accès Premium automatiquement.
                            </p>
                        </div>
                        <div className="absolute right-[-20px] bottom-[-20px] opacity-10 rotate-12">
                            <Icon name="chart-bar" size={150} weight="fill" />
                        </div>
                    </div>

                </div>
            </div>

            {/* --- FOOTER --- */}
            <footer className="bg-slate-50 border-t border-slate-200 py-12 text-center">
                <p className="text-slate-400 font-bold mb-2">Maths Signoret © 2025</p>
                <div className="flex justify-center gap-4 text-sm text-indigo-600 font-bold">
                    <button onClick={onConnect} className="hover:underline">Connexion Élève</button>
                    <button onClick={onConnect} className="hover:underline">Espace Prof</button>
                    <span>•</span>
                    <a href="#" className="text-slate-400 hover:text-slate-600">Mentions Légales</a>
                </div>
            </footer>
        </div>
    );
};

export default Landing;