import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, doc, getDoc, setDoc, query, where } from 'firebase/firestore';
import { Icon } from './UI';
import { toast } from 'react-hot-toast';
import EvolutionChart from './EvolutionChart';
import MathText from './MathText';
import { GRANDES_COMPETENCES, GC_COLORS, DOMAIN_COLORS } from '../utils/constants';

const formatDateFr = (dateString) => {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateString;
};

export default function SkillsView({ user, onBack, onPlay }) {
    const [loading, setLoading] = useState(true);
    const [competences, setCompetences] = useState([]);
    const [suivi, setSuivi] = useState({});
    const [classSuivi, setClassSuivi] = useState([]);

    // Configurations
    const [ranksConfig, setRanksConfig] = useState([]);
    const [xpConfig, setXpConfig] = useState(null);
    const [chapitresDetails, setChapitresDetails] = useState({});

    // Filtres et Modes de vue
    const [viewMode, setViewMode] = useState('CHAPITRE');
    const [filterTrimestre, setFilterTrimestre] = useState('ALL');
    const [chartViewMode, setChartViewMode] = useState('GLOBAL');

    // Modale de remédiation
    const [selectedComp, setSelectedComp] = useState(null);
    const [showCorrection, setShowCorrection] = useState(false);
    const [isSavingEval, setIsSavingEval] = useState(false);

    const studentClass = user?.data?.classe || "";
    let studentLevel = "6ème";
    if (studentClass.includes("5")) studentLevel = "5ème";
    if (studentClass.includes("4")) studentLevel = "4ème";
    if (studentClass.includes("3")) studentLevel = "3ème";

    useEffect(() => {
        const fetchData = async () => {
            try {
                const configSnap = await getDoc(doc(db, "config", "skills"));
                let allowedChapters = [];
                if (configSnap.exists()) {
                    const data = configSnap.data();
                    allowedChapters = data.visibleChapters?.[studentLevel] || [];
                    setChapitresDetails(data.chapitresDetails || {});
                }

                const xpSnap = await getDoc(doc(db, "config", "xp"));
                if (xpSnap.exists()) {
                    const xpData = xpSnap.data();
                    setXpConfig(xpData);
                    setRanksConfig(xpData.ranks || []);
                }

                const compSnap = await getDocs(collection(db, "competences"));
                let comps = compSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                comps = comps.filter(c => allowedChapters.includes(c.chapitre) && (c.niveau || "6ème") === studentLevel);
                comps.sort((a, b) => a.chapitre - b.chapitre || (a.code || a.id).localeCompare(b.code || b.id));
                setCompetences(comps);

                const studentId = user?.data?.id || user?.id;
                if (studentId) {
                    const suiviSnap = await getDocs(collection(db, `eleves/${studentId}/suivi_competences`));
                    const suiviData = {};
                    suiviSnap.forEach(d => { suiviData[d.id] = d.data(); });
                    setSuivi(suiviData);
                }

                if (studentClass) {
                    const qStu = query(collection(db, "eleves"), where("classe", "==", studentClass));
                    const stuSnap = await getDocs(qStu);
                    const allClassSuivi = [];

                    await Promise.all(stuSnap.docs.map(async (s) => {
                        const sSuiviSnap = await getDocs(collection(db, `eleves/${s.id}/suivi_competences`));
                        sSuiviSnap.forEach(docSnap => {
                            allClassSuivi.push({ compId: docSnap.id, bilan: docSnap.data().bilan });
                        });
                    }));
                    setClassSuivi(allClassSuivi);
                }

            } catch (error) {
                console.error("Erreur de chargement:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, studentLevel, studentClass]);

    const filteredCompetences = competences.filter(c => {
        if (filterTrimestre === 'ALL') return true;
        const chapKey = `${studentLevel}_${c.chapitre}`;
        const chapTrimestre = String(chapitresDetails[chapKey]?.trimestre || '1');
        if (chapTrimestre === 'ALL') return true;
        return chapTrimestre === filterTrimestre;
    });

    const getPts = (note) => {
        if (note === '🟢') return Number(xpConfig?.competenceNiveau4) || 25;
        if (note === '🟩') return Number(xpConfig?.competenceNiveau3) || 15;
        if (note === '🟨') return Number(xpConfig?.competenceNiveau2) || 5;
        return 0;
    };

    let dynamicStudentScore = 0;
    let dynamicClassScore = 0;
    const filteredCompIds = new Set(filteredCompetences.map(c => c.id));

    filteredCompetences.forEach(comp => {
        const cData = suivi[comp.id];
        if (cData && cData.bilan) {
            dynamicStudentScore += getPts(cData.bilan);
        }
    });

    classSuivi.forEach(cs => {
        if (filteredCompIds.has(cs.compId)) {
            if (cs.bilan === '🟨') dynamicClassScore += 1;
            if (cs.bilan === '🟩') dynamicClassScore += 3;
            if (cs.bilan === '🟢') dynamicClassScore += 5;
        }
    });

    const getCurrentRank = () => {
        if (!ranksConfig || ranksConfig.length === 0) return null;
        const sorted = [...ranksConfig].sort((a, b) => Number(a.points) - Number(b.points));
        let currentRank = sorted[0]?.name || "Novice";
        for (const rank of sorted) {
            if (dynamicStudentScore >= Number(rank.points)) {
                currentRank = rank.name;
            }
        }
        return currentRank;
    };

    const dynamicStudentRank = getCurrentRank();

    const handleAutoEval = async () => {
        if (!selectedComp) return;
        setIsSavingEval(true);
        const studentId = user?.data?.id || user?.id;

        try {
            const docRef = doc(db, `eleves/${studentId}/suivi_competences/${selectedComp.id}`);
            await setDoc(docRef, { enAttente: true }, { merge: true });

            setSuivi(prev => ({
                ...prev,
                [selectedComp.id]: { ...(prev[selectedComp.id] || {}), enAttente: true }
            }));
            toast.success("M. PUTOD a été prévenu que tu étais prêt !");
        } catch (e) {
            toast.error("Erreur de connexion.");
        } finally {
            setIsSavingEval(false);
        }
    };

    const handleCancelAutoEval = async () => {
        if (!selectedComp) return;
        setIsSavingEval(true);
        const studentId = user?.data?.id || user?.id;

        try {
            const docRef = doc(db, `eleves/${studentId}/suivi_competences/${selectedComp.id}`);
            await setDoc(docRef, { enAttente: false }, { merge: true });

            setSuivi(prev => ({
                ...prev,
                [selectedComp.id]: { ...(prev[selectedComp.id] || {}), enAttente: false }
            }));
            toast.success("Demande d'évaluation annulée.");
        } catch (e) {
            toast.error("Erreur de connexion.");
        } finally {
            setIsSavingEval(false);
        }
    };

    const isSkillExpired = (evalData, validiteMois) => {
        if (!evalData || !evalData.derniereEval) return false;
        if (evalData.bilan === '🔴' || evalData.bilan === '⚪') return false;

        const evalDate = new Date(evalData.derniereEval);
        const now = new Date();
        const diffMonths = Math.abs(now - evalDate) / (1000 * 60 * 60 * 24 * 30.44);

        return diffMonths > (validiteMois || 3);
    };

    const generateTimeline = () => {
        const events = [];
        filteredCompetences.forEach(comp => {
            const cData = suivi[comp.id];
            if (cData && cData.evaluations) {
                cData.evaluations.forEach(ev => {
                    events.push({
                        date: ev.date,
                        compId: comp.id,
                        note: ev.note,
                        type: comp.type,
                        grandesCompetences: comp.grandesCompetences || []
                    });
                });
            }
        });

        events.sort((a, b) => new Date(a.date) - new Date(b.date));

        const timelineData = [{
            date: '1970-01-01',
            displayDate: 'Début',
            total: 0,
            tech: 0,
            conc: 0,
            socle: { Chercher: 0, Modéliser: 0, Représenter: 0, Raisonner: 0, Calculer: 0, Communiquer: 0 }
        }];

        const currentNotes = {};
        const groupedByDate = events.reduce((acc, ev) => {
            if (!acc[ev.date]) acc[ev.date] = [];
            acc[ev.date].push(ev);
            return acc;
        }, {});

        const sortedDates = Object.keys(groupedByDate).sort((a, b) => new Date(a) - new Date(b));

        let currentTotal = 0;
        let currentTech = 0;
        let currentConc = 0;
        const currentSocle = { Chercher: 0, Modéliser: 0, Représenter: 0, Raisonner: 0, Calculer: 0, Communiquer: 0 };

        sortedDates.forEach(date => {
            groupedByDate[date].forEach(ev => {
                const oldNote = currentNotes[ev.compId] || '⚪';
                const newNote = ev.note;
                currentNotes[ev.compId] = newNote;

                const diff = getPts(newNote) - getPts(oldNote);

                currentTotal += diff;
                if (ev.type === 'Technique' || ev.type === 'TECH') currentTech += diff;
                if (ev.type === 'Conceptuel' || ev.type === 'CONC') currentConc += diff;

                ev.grandesCompetences.forEach(gc => {
                    if (currentSocle[gc] !== undefined) {
                        currentSocle[gc] += diff;
                    }
                });
            });

            timelineData.push({
                date,
                displayDate: formatDateFr(date),
                total: currentTotal,
                tech: currentTech,
                conc: currentConc,
                socle: { ...currentSocle }
            });
        });

        return timelineData;
    };

    const printMyBilan = () => {
        const printWindow = window.open('', '_blank');
        const today = new Date().toLocaleDateString('fr-FR');

        const mySkills = filteredCompetences.map(comp => {
            const cData = suivi[comp.id];
            const bilan = cData?.bilan || '⚪';
            let text = "Non évalué";
            let color = "#94a3b8";

            if (bilan === '🔴') { text = "Non acquis"; color = "#ef4444"; }
            if (bilan === '🟨') { text = "En cours"; color = "#f59e0b"; }
            if (bilan === '🟩') { text = "Acquis"; color = "#10b981"; }
            if (bilan === '🟢') { text = "Dépassé"; color = "#047857"; }

            return { ...comp, bilanText: text, color };
        });

        const byDomain = {};
        mySkills.forEach(s => {
            if (!byDomain[s.domaine]) byDomain[s.domaine] = [];
            byDomain[s.domaine].push(s);
        });

        let html = `
            <html>
            <head>
                <title>Mon Bilan de Compétences - ${user.data.nom}</title>
                <style>
                    body { font-family: system-ui, sans-serif; color: #1e293b; padding: 2rem; max-width: 800px; margin: 0 auto; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    h1 { border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; color: #0f172a; margin-bottom: 0.5rem; }
                    .header { display: flex; justify-content: space-between; margin-bottom: 2rem; }
                    .domain-title { background: #f8fafc; padding: 0.5rem 1rem; margin-top: 1.5rem; font-weight: bold; border-left: 4px solid #4f46e5; font-size: 1.1rem; }
                    table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; font-size: 0.9rem; }
                    th, td { padding: 0.6rem 0.5rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
                    th { color: #64748b; font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
                    .badge { padding: 0.25rem 0.6rem; border-radius: 999px; color: white !important; font-weight: bold; font-size: 0.75rem; text-transform: uppercase; display: inline-block; text-align: center; min-width: 80px; }
                    .code { font-family: monospace; font-weight: bold; color: #475569; }
                    @media print { body { padding: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1>Bilan de Compétences</h1>
                        <h2 style="margin-top:0;">Élève : ${user.data.nom}</h2>
                    </div>
                    <div style="text-align: right; color: #475569;">
                        <p style="margin:0 0 0.5rem 0;">Édité le ${today}</p>
                        <p style="margin:0;"><strong>Niveau : ${studentLevel} ${filterTrimestre !== 'ALL' ? `(Trimestre ${filterTrimestre})` : ''}</strong></p>
                    </div>
                </div>
        `;

        Object.keys(byDomain).forEach(dom => {
            html += `<div class="domain-title">${dom}</div>`;
            html += `<table><thead><tr><th width="12%">Code</th><th width="68%">Compétence</th><th width="20%">Statut</th></tr></thead><tbody>`;

            byDomain[dom].forEach(comp => {
                const chapKey = `${studentLevel}_${comp.chapitre}`;
                const chapTitle = chapitresDetails[chapKey]?.titre || comp.chapitreNom || "";
                html += `
                    <tr>
                        <td class="code">${comp.code || comp.id}</td>
                        <td>
                            <div style="font-weight: 500; color: #334155;">${comp.intitule}</div>
                            <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 2px;">Chapitre ${comp.chapitre} - ${chapTitle}</div>
                        </td>
                        <td><span class="badge" style="background-color: ${comp.color}">${comp.bilanText}</span></td>
                    </tr>
                `;
            });
            html += `</tbody></table>`;
        });

        html += `
                <div style="margin-top: 4rem; font-size: 0.8rem; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 1rem;">
                    Document généré depuis la plateforme de mathématiques.
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
        }, 250);
    };

    const getDotColorClass = (emoji) => {
        if (emoji === '🔴') return 'bg-red-500 border-red-600';
        if (emoji === '🟨') return 'bg-amber-400 border-amber-500';
        if (emoji === '🟩') return 'bg-emerald-400 border-emerald-500';
        if (emoji === '🟢') return 'bg-emerald-700 border-emerald-800';
        return 'bg-slate-100 border-slate-300';
    };

    const getCardBgClass = (emoji, isCibled) => {
        let base = 'bg-white border-slate-200 hover:bg-slate-50';
        if (emoji === '🔴') base = 'bg-red-50/60 border-red-200';
        if (emoji === '🟨') base = 'bg-amber-50/60 border-amber-200';
        if (emoji === '🟩') base = 'bg-emerald-50/60 border-emerald-200';
        if (emoji === '🟢') base = 'bg-emerald-100/60 border-emerald-300';
        if (isCibled) base += ' ring-2 ring-inset ring-indigo-500 shadow-md';
        return base;
    };

    const renderExplications = () => {
        const expls = selectedComp.explications?.length > 0
            ? selectedComp.explications
            : (selectedComp.explication ? [selectedComp.explication] : []);

        if (expls.length === 0) return null;

        return (
            <div className="space-y-3 mb-4 relative z-10">
                {expls.map((exp, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-amber-100 text-slate-700 text-sm font-medium leading-relaxed whitespace-pre-wrap">
                        <MathText text={exp} />
                    </div>
                ))}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-slate-400 font-bold">
                <Icon name="spinner" className="animate-spin text-2xl mr-2" /> Chargement des compétences...
            </div>
        );
    }

    const visibleSortedChapters = [...new Set(filteredCompetences.map(c => c.chapitre))].sort((a, b) => a - b);

    return (
        <div className="max-w-6xl mx-auto pb-20 px-4 md:px-0 animate-in fade-in">
            {/* EN-TÊTE & RETOUR */}
            <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                <button onClick={onBack} className="bg-white text-slate-600 px-4 py-2 rounded-xl font-bold shadow-sm border border-slate-200 hover:bg-slate-50 flex items-center gap-2">
                    <Icon name="arrow-left" /> Retour
                </button>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="group relative bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-xl shadow-md flex items-center gap-3 cursor-help">
                        <Icon name="star" weight="fill" className="text-amber-100" />
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-amber-100 font-black leading-tight">
                                {dynamicStudentRank ? `Grade : ${dynamicStudentRank}` : "Score Compétences"}
                            </div>
                            <div className="text-sm font-black leading-none">{dynamicStudentScore} pts</div>
                        </div>

                        <div className="absolute top-full right-0 md:left-0 mt-2 w-72 bg-slate-800 text-white text-xs p-4 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none shadow-2xl flex flex-col gap-2 border border-slate-700">
                            <p className="font-bold border-b border-slate-600 pb-2 flex items-center gap-2">
                                <Icon name="info" /> D'où viennent ces points ?
                            </p>
                            <p className="text-slate-300">Ce score représente <strong>uniquement</strong> ton niveau de maîtrise des compétences affichées actuellement ci-dessous :</p>
                            <ul className="space-y-1.5 pt-1">
                                <li className="flex justify-between"><span>Compétence 🟨 :</span> <span className="font-bold text-amber-400">+{xpConfig?.competenceNiveau2 || 5} pts</span></li>
                                <li className="flex justify-between"><span>Compétence 🟩 :</span> <span className="font-bold text-emerald-400">+{xpConfig?.competenceNiveau3 || 15} pts</span></li>
                                <li className="flex justify-between"><span>Compétence 🟢 :</span> <span className="font-bold text-emerald-400">+{xpConfig?.competenceNiveau4 || 25} pts</span></li>
                            </ul>
                            <p className="text-[10px] text-slate-400 italic mt-1.5 leading-tight">
                                Il s'adapte au filtre que tu as sélectionné (Trimestre, etc.). Ton score global d'XP est toujours visible sur la page d'accueil.
                            </p>
                        </div>
                    </div>

                    {dynamicClassScore > 0 && (
                        <div className="group relative bg-gradient-to-r from-indigo-600 to-indigo-800 text-white px-4 py-2 rounded-xl shadow-md flex items-center gap-3 hidden sm:flex cursor-help">
                            <Icon name="users" weight="fill" className="text-indigo-200" />
                            <div>
                                <div className="text-[10px] uppercase tracking-widest text-indigo-200 font-black leading-tight">Score des {studentClass}</div>
                                <div className="text-sm font-black leading-none">{dynamicClassScore} pts</div>
                            </div>

                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-slate-800 text-white text-xs p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none shadow-2xl border border-slate-700">
                                <p className="flex items-start gap-2 leading-relaxed mb-2">
                                    <Icon name="info" className="shrink-0 mt-0.5" />
                                    C'est la somme de la maîtrise de <strong>tous les élèves</strong> de ta classe sur les compétences affichées actuellement.
                                </p>
                                <ul className="space-y-1 border-t border-slate-600 pt-2 text-slate-300">
                                    <li className="flex justify-between"><span>Une compétence 🟨 :</span> <span className="font-bold text-amber-400">+1 pt</span></li>
                                    <li className="flex justify-between"><span>Une compétence 🟩 :</span> <span className="font-bold text-emerald-400">+3 pts</span></li>
                                    <li className="flex justify-between"><span>Une compétence 🟢 :</span> <span className="font-bold text-emerald-400">+5 pts</span></li>
                                </ul>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={printMyBilan}
                        className="bg-white text-indigo-600 px-4 py-2 rounded-xl font-bold shadow-sm border border-indigo-200 hover:bg-indigo-50 flex items-center gap-2"
                    >
                        <Icon name="printer" weight="fill" />
                        <span className="hidden sm:inline">Imprimer</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm mb-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div>
                        <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3 mb-1">
                            <Icon name="target" className="text-indigo-600" weight="fill" />
                            Mes Compétences
                        </h2>
                        <div className="flex items-center gap-3 mt-2">
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Niveau : {studentLevel}</p>
                            <select
                                value={filterTrimestre}
                                onChange={e => setFilterTrimestre(e.target.value)}
                                className="p-1.5 rounded-lg border border-slate-200 text-sm font-bold bg-slate-50 text-indigo-700 outline-none focus:border-indigo-500 shadow-sm cursor-pointer"
                            >
                                <option value="ALL">Toute l'année</option>
                                <option value="1">Trimestre 1</option>
                                <option value="2">Trimestre 2</option>
                                <option value="3">Trimestre 3</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-2xl shadow-inner border border-slate-200 self-center">
                        <button onClick={() => setViewMode('CHAPITRE')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${viewMode === 'CHAPITRE' ? 'bg-white text-indigo-700 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                            <Icon name="book-open" weight={viewMode === 'CHAPITRE' ? "fill" : "regular"} /> Chapitre
                        </button>
                        <button onClick={() => setViewMode('DOMAINE')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${viewMode === 'DOMAINE' ? 'bg-white text-indigo-700 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                            <Icon name="shapes" weight={viewMode === 'DOMAINE' ? "fill" : "regular"} /> Domaine
                        </button>
                        <button onClick={() => setViewMode('GRANDE_COMP')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${viewMode === 'GRANDE_COMP' ? 'bg-white text-indigo-700 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                            <Icon name="star" weight={viewMode === 'GRANDE_COMP' ? "fill" : "regular"} /> Socle
                        </button>
                        <button onClick={() => setViewMode('URGENCE')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${viewMode === 'URGENCE' ? 'bg-white text-red-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                            <Icon name="warning" weight={viewMode === 'URGENCE' ? "fill" : "regular"} /> À retravailler
                        </button>
                        <button onClick={() => setViewMode('CIBLE')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${viewMode === 'CIBLE' ? 'bg-white text-amber-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>
                            <Icon name="target" weight={viewMode === 'CIBLE' ? "fill" : "regular"} /> Ciblées
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 md:gap-6 mt-6 pt-5 border-t border-slate-100 text-[11px] font-bold text-slate-600 uppercase tracking-wide justify-center md:justify-start">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-slate-100 border border-slate-300"></div> Non évalué</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"></div> Non acquis</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-400"></div> En cours</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-400"></div> Acquis</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-700"></div> Dépassé</div>
                    <div className="flex items-center gap-1.5 text-slate-400"><span className="w-2 h-2 rounded-full bg-slate-300"></span> À réévaluer</div>
                </div>
            </div>

            {filteredCompetences.length > 0 && (
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm mb-6 animate-in fade-in zoom-in-95">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <Icon name="chart-line-up" className="text-indigo-600" /> Évolution de tes évaluations
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 max-w-lg">
                                Ce graphique te permet de voir l'accumulation de tes points de compétences au fil du trimestre sélectionné. Il démarre à zéro et évolue à chaque évaluation.
                            </p>
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner shrink-0">
                            <button onClick={() => setChartViewMode('GLOBAL')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${chartViewMode === 'GLOBAL' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Global</button>
                            <button onClick={() => setChartViewMode('TYPE')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${chartViewMode === 'TYPE' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Types</button>
                            <button onClick={() => setChartViewMode('SOCLE')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${chartViewMode === 'SOCLE' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Socle</button>
                        </div>
                    </div>
                    <EvolutionChart timeline={generateTimeline()} mode={chartViewMode} />
                </div>
            )}

            {filteredCompetences.length === 0 ? (
                <div className="text-center p-12 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-slate-400 font-bold">
                    <Icon name="lock-key" size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="text-lg">Aucune compétence visible pour ce trimestre.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {(viewMode === 'CHAPITRE' || viewMode === 'URGENCE' || viewMode === 'CIBLE') && visibleSortedChapters.map(chapNum => {
                        let chapComps = filteredCompetences.filter(c => c.chapitre === chapNum);

                        if (viewMode === 'URGENCE') {
                            chapComps = chapComps.filter(c => {
                                const cData = suivi[c.id];
                                return cData?.bilan === '🔴' || isSkillExpired(cData, c.validiteMois);
                            });
                        }
                        if (viewMode === 'CIBLE') {
                            chapComps = chapComps.filter(c => suivi[c.id]?.cible === true);
                        }

                        if (chapComps.length === 0) return null;

                        const techs = chapComps.filter(c => c.type === 'Technique' || c.type === 'TECH');
                        const concs = chapComps.filter(c => c.type === 'Conceptuel' || c.type === 'CONC');

                        const acquisCount = chapComps.filter(c => {
                            const b = suivi[c.id]?.bilan;
                            return b === '🟩' || b === '🟢';
                        }).length;
                        const percentage = chapComps.length > 0 ? Math.round((acquisCount / chapComps.length) * 100) : 0;

                        const chapKey = `${studentLevel}_${chapNum}`;
                        const chapTitle = chapitresDetails[chapKey]?.titre || chapComps[0]?.chapitreNom || "";

                        return (
                            <div key={chapNum} className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                                <div className="mb-4">
                                    <h3 className="text-lg font-black text-slate-800 leading-tight">
                                        <span className="text-indigo-600 mr-2">Chapitre {chapNum}</span>
                                        {chapTitle ? `- ${chapTitle}` : ''}
                                    </h3>
                                    <div className="mt-2">
                                        <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                                            <span>Progression</span>
                                            <span className="text-emerald-600">{acquisCount} / {chapComps.length} acquises</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                            <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-x-6 gap-y-3">
                                    {/* TECHNIQUES */}
                                    <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5 flex items-center gap-1.5 pl-1">
                                            <Icon name="wrench" /> Compétences techniques : ce que je sais faire
                                        </h4>
                                        <div className="space-y-2">
                                            {techs.map(comp => {
                                                const cData = suivi[comp.id];
                                                const isExp = isSkillExpired(cData, comp.validiteMois);
                                                const isCibled = cData?.cible === true;
                                                const currentBilan = cData?.bilan || '⚪';
                                                const cardBg = getCardBgClass(currentBilan, isCibled);
                                                const dColor = DOMAIN_COLORS[comp.domaine] || 'slate';

                                                const evals = cData?.evaluations || [];
                                                const totalDots = Math.max(3, evals.length);
                                                const dotsArray = [];
                                                for (let i = 0; i < totalDots; i++) {
                                                    dotsArray.push({ emoji: evals[i]?.note || '⚪', date: evals[i]?.date || null });
                                                }

                                                const hasExplications = (comp.explications?.length > 0) || comp.explication;
                                                const hasResources = hasExplications || comp.lienExercice || comp.exercices?.length > 0;

                                                const compChapKey = `${studentLevel}_${comp.chapitre}`;
                                                const compChapTitle = chapitresDetails[compChapKey]?.titre || comp.chapitreNom || "";

                                                return (
                                                    <div key={comp.id} onClick={() => { setSelectedComp(comp); setShowCorrection(false); }} className={`p-2.5 rounded-xl border transition-all cursor-pointer shadow-sm hover:-translate-y-0.5 ${cardBg}`}>
                                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className={`text-[9px] font-black shrink-0 px-1.5 py-0.5 rounded text-${dColor}-700 bg-${dColor}-100`}>
                                                                    {comp.code || comp.id}
                                                                </span>
                                                                {viewMode !== 'CHAPITRE' && (
                                                                    <span className="text-[9px] font-bold text-slate-400 border border-slate-200 bg-white px-1.5 py-0.5 rounded truncate max-w-[120px] sm:max-w-[150px]" title={`Chapitre ${comp.chapitre} - ${compChapTitle}`}>
                                                                        Chap. {comp.chapitre} - {compChapTitle}
                                                                    </span>
                                                                )}
                                                                <span className="text-xs font-bold text-slate-800 truncate" title={comp.intitule}>{comp.intitule}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                {hasExplications && <Icon name="lightbulb" weight="fill" className="text-amber-500 text-sm" />}
                                                                {comp.lienExercice && <Icon name="game-controller" weight="fill" className="text-indigo-500 text-sm" />}
                                                                {comp.exercices?.length > 0 && <Icon name="files" weight="fill" className="text-emerald-500 text-sm" />}
                                                                {isCibled && <span title="Ciblée par M. PUTOD">🎯</span>}
                                                                {cData?.enAttente && <span title="En attente de validation">⏳</span>}
                                                                {isExp && <span className="text-[10px] font-medium text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded ml-1" title="À réévaluer car la dernière évaluation date d'il y a trop longtemps">À réévaluer</span>}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 pt-1 pl-1">
                                                            {dotsArray.map((dot, idx) => <div key={idx} className={`w-3.5 h-3.5 rounded-full border shadow-sm ${getDotColorClass(dot.emoji)}`} title={dot.date ? `Évalué le ${formatDateFr(dot.date)}` : `Évaluation ${idx + 1}`}></div>)}
                                                            {comp.grandesCompetences && comp.grandesCompetences.length > 0 && (
                                                                <div className="flex gap-1 ml-2">
                                                                    {comp.grandesCompetences.map(gc => (
                                                                        <span key={gc} className="text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded uppercase tracking-wide" title={gc}>
                                                                            {gc}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {hasResources && <div className="ml-auto text-[10px] font-bold text-indigo-600 bg-white border border-indigo-100 px-2 py-0.5 rounded opacity-70">Voir détails &rarr;</div>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {techs.length === 0 && <p className="text-[10px] italic text-slate-400 pl-1 py-1">Aucune.</p>}
                                        </div>
                                    </div>

                                    {/* CONCEPTUELLES */}
                                    <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5 pl-1">
                                            <Icon name="brain" /> Compétences conceptuelles : ce que j'ai compris
                                        </h4>
                                        <div className="space-y-2">
                                            {concs.map(comp => {
                                                const cData = suivi[comp.id];
                                                const isExp = isSkillExpired(cData, comp.validiteMois);
                                                const isCibled = cData?.cible === true;
                                                const currentBilan = cData?.bilan || '⚪';
                                                const cardBg = getCardBgClass(currentBilan, isCibled);
                                                const dColor = DOMAIN_COLORS[comp.domaine] || 'slate';

                                                const evals = cData?.evaluations || [];
                                                const totalDots = Math.max(3, evals.length);
                                                const dotsArray = [];
                                                for (let i = 0; i < totalDots; i++) {
                                                    dotsArray.push({ emoji: evals[i]?.note || '⚪', date: evals[i]?.date || null });
                                                }

                                                const hasExplications = (comp.explications?.length > 0) || comp.explication;
                                                const hasResources = hasExplications || comp.lienExercice || comp.exercices?.length > 0;

                                                const compChapKey = `${studentLevel}_${comp.chapitre}`;
                                                const compChapTitle = chapitresDetails[compChapKey]?.titre || comp.chapitreNom || "";

                                                return (
                                                    <div key={comp.id} onClick={() => { setSelectedComp(comp); setShowCorrection(false); }} className={`p-2.5 rounded-xl border transition-all cursor-pointer shadow-sm hover:-translate-y-0.5 ${cardBg}`}>
                                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className={`text-[9px] font-black shrink-0 px-1.5 py-0.5 rounded text-${dColor}-700 bg-${dColor}-100`}>
                                                                    {comp.code || comp.id}
                                                                </span>
                                                                {viewMode !== 'CHAPITRE' && (
                                                                    <span className="text-[9px] font-bold text-slate-400 border border-slate-200 bg-white px-1.5 py-0.5 rounded truncate max-w-[120px] sm:max-w-[150px]" title={`Chapitre ${comp.chapitre} - ${compChapTitle}`}>
                                                                        Chap. {comp.chapitre} - {compChapTitle}
                                                                    </span>
                                                                )}
                                                                <span className="text-xs font-bold text-slate-800 truncate" title={comp.intitule}>{comp.intitule}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                {hasExplications && <Icon name="lightbulb" weight="fill" className="text-amber-500 text-sm" />}
                                                                {comp.lienExercice && <Icon name="game-controller" weight="fill" className="text-indigo-500 text-sm" />}
                                                                {comp.exercices?.length > 0 && <Icon name="files" weight="fill" className="text-emerald-500 text-sm" />}
                                                                {isCibled && <span title="Ciblée par M. PUTOD">🎯</span>}
                                                                {cData?.enAttente && <span title="En attente de validation">⏳</span>}
                                                                {isExp && <span className="text-[10px] font-medium text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded ml-1" title="À réévaluer car la dernière évaluation date d'il y a trop longtemps">À réévaluer</span>}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 pt-1 pl-1">
                                                            {dotsArray.map((dot, idx) => <div key={idx} className={`w-3.5 h-3.5 rounded-full border shadow-sm ${getDotColorClass(dot.emoji)}`} title={dot.date ? `Évalué le ${formatDateFr(dot.date)}` : `Évaluation ${idx + 1}`}></div>)}
                                                            {comp.grandesCompetences && comp.grandesCompetences.length > 0 && (
                                                                <div className="flex gap-1 ml-2">
                                                                    {comp.grandesCompetences.map(gc => (
                                                                        <span key={gc} className="text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded uppercase tracking-wide" title={gc}>
                                                                            {gc}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {hasResources && <div className="ml-auto text-[10px] font-bold text-indigo-600 bg-white border border-indigo-100 px-2 py-0.5 rounded opacity-70">Voir détails &rarr;</div>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {concs.length === 0 && <p className="text-[10px] italic text-slate-400 pl-1 py-1">Aucune.</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {viewMode === 'DOMAINE' && Object.keys(DOMAIN_COLORS).map(domaine => {
                        const domComps = filteredCompetences.filter(c => c.domaine === domaine);
                        if (domComps.length === 0) return null;

                        const techs = domComps.filter(c => c.type === 'Technique' || c.type === 'TECH');
                        const concs = domComps.filter(c => c.type === 'Conceptuel' || c.type === 'CONC');
                        const dColor = DOMAIN_COLORS[domaine];

                        const acquisCount = domComps.filter(c => {
                            const b = suivi[c.id]?.bilan;
                            return b === '🟩' || b === '🟢';
                        }).length;
                        const percentage = domComps.length > 0 ? Math.round((acquisCount / domComps.length) * 100) : 0;

                        return (
                            <div key={domaine} className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                                <div className={`absolute top-0 left-0 w-1.5 h-full bg-${dColor}-500`}></div>
                                <div className="mb-4 pl-3">
                                    <h3 className={`text-lg font-black text-${dColor}-800`}>{domaine}</h3>
                                    <div className="mt-2">
                                        <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                                            <span>Progression</span>
                                            <span className="text-emerald-600">{acquisCount} / {domComps.length} acquises</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                            <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-x-6 gap-y-3 pl-3">
                                    <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5 pl-1">
                                            Compétences techniques : ce que je sais faire
                                        </h4>
                                        <div className="space-y-2">
                                            {techs.map(comp => {
                                                const cData = suivi[comp.id];
                                                const isExp = isSkillExpired(cData, comp.validiteMois);
                                                const isCibled = cData?.cible === true;
                                                const currentBilan = cData?.bilan || '⚪';
                                                const cardBg = getCardBgClass(currentBilan, isCibled);
                                                const dColor = DOMAIN_COLORS[comp.domaine] || 'slate';

                                                const evals = cData?.evaluations || [];
                                                const totalDots = Math.max(3, evals.length);
                                                const dotsArray = [];
                                                for (let i = 0; i < totalDots; i++) {
                                                    dotsArray.push({ emoji: evals[i]?.note || '⚪', date: evals[i]?.date || null });
                                                }

                                                const hasExplications = (comp.explications?.length > 0) || comp.explication;
                                                const hasResources = hasExplications || comp.lienExercice || comp.exercices?.length > 0;

                                                const compChapKey = `${studentLevel}_${comp.chapitre}`;
                                                const compChapTitle = chapitresDetails[compChapKey]?.titre || comp.chapitreNom || "";

                                                return (
                                                    <div key={comp.id} onClick={() => { setSelectedComp(comp); setShowCorrection(false); }} className={`p-2.5 rounded-xl border transition-all cursor-pointer shadow-sm hover:-translate-y-0.5 ${cardBg}`}>
                                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className={`text-[9px] font-black shrink-0 px-1.5 py-0.5 rounded text-${dColor}-700 bg-${dColor}-100`}>{comp.code || comp.id}</span>
                                                                <span className="text-[9px] font-bold text-slate-400 border border-slate-200 bg-white px-1.5 py-0.5 rounded truncate max-w-[120px] sm:max-w-[150px]" title={`Chapitre ${comp.chapitre} - ${compChapTitle}`}>
                                                                    Chap. {comp.chapitre} - {compChapTitle}
                                                                </span>
                                                                <span className="text-xs font-bold text-slate-800 truncate" title={comp.intitule}>{comp.intitule}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                {hasExplications && <Icon name="lightbulb" weight="fill" className="text-amber-500 text-sm" />}
                                                                {comp.lienExercice && <Icon name="game-controller" weight="fill" className="text-indigo-500 text-sm" />}
                                                                {comp.exercices?.length > 0 && <Icon name="files" weight="fill" className="text-emerald-500 text-sm" />}
                                                                {isCibled && <span title="Ciblée par M. PUTOD">🎯</span>}
                                                                {cData?.enAttente && <span title="En attente de validation">⏳</span>}
                                                                {isExp && <span className="text-[10px] font-medium text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded ml-1">À réévaluer</span>}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 pt-1 pl-1">
                                                            {dotsArray.map((dot, idx) => <div key={idx} className={`w-3.5 h-3.5 rounded-full border shadow-sm ${getDotColorClass(dot.emoji)}`} title={dot.date ? `Évalué le ${formatDateFr(dot.date)}` : `Évaluation ${idx + 1}`}></div>)}
                                                            {comp.grandesCompetences && comp.grandesCompetences.length > 0 && (
                                                                <div className="flex gap-1 ml-2">
                                                                    {comp.grandesCompetences.map(gc => (
                                                                        <span key={gc} className="text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded uppercase tracking-wide" title={gc}>
                                                                            {gc}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {hasResources && <div className="ml-auto text-[10px] font-bold text-indigo-600 bg-white border border-indigo-100 px-2 py-0.5 rounded opacity-70">Voir détails &rarr;</div>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {techs.length === 0 && <p className="text-[10px] italic text-slate-400 pl-1 py-1">Aucune.</p>}
                                        </div>
                                    </div>
                                    <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5 pl-1">
                                            Raisonnement et Compréhension
                                        </h4>
                                        <div className="space-y-2">
                                            {concs.map(comp => {
                                                const cData = suivi[comp.id];
                                                const isExp = isSkillExpired(cData, comp.validiteMois);
                                                const isCibled = cData?.cible === true;
                                                const currentBilan = cData?.bilan || '⚪';
                                                const cardBg = getCardBgClass(currentBilan, isCibled);
                                                const dColor = DOMAIN_COLORS[comp.domaine] || 'slate';

                                                const evals = cData?.evaluations || [];
                                                const totalDots = Math.max(3, evals.length);
                                                const dotsArray = [];
                                                for (let i = 0; i < totalDots; i++) {
                                                    dotsArray.push({ emoji: evals[i]?.note || '⚪', date: evals[i]?.date || null });
                                                }

                                                const hasExplications = (comp.explications?.length > 0) || comp.explication;
                                                const hasResources = hasExplications || comp.lienExercice || comp.exercices?.length > 0;

                                                const compChapKey = `${studentLevel}_${comp.chapitre}`;
                                                const compChapTitle = chapitresDetails[compChapKey]?.titre || comp.chapitreNom || "";

                                                return (
                                                    <div key={comp.id} onClick={() => { setSelectedComp(comp); setShowCorrection(false); }} className={`p-2.5 rounded-xl border transition-all cursor-pointer shadow-sm hover:-translate-y-0.5 ${cardBg}`}>
                                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className={`text-[9px] font-black shrink-0 px-1.5 py-0.5 rounded text-${dColor}-700 bg-${dColor}-100`}>{comp.code || comp.id}</span>
                                                                <span className="text-[9px] font-bold text-slate-400 border border-slate-200 bg-white px-1.5 py-0.5 rounded truncate max-w-[120px] sm:max-w-[150px]" title={`Chapitre ${comp.chapitre} - ${compChapTitle}`}>
                                                                    Chap. {comp.chapitre} - {compChapTitle}
                                                                </span>
                                                                <span className="text-xs font-bold text-slate-800 truncate" title={comp.intitule}>{comp.intitule}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                {hasExplications && <Icon name="lightbulb" weight="fill" className="text-amber-500 text-sm" />}
                                                                {comp.lienExercice && <Icon name="game-controller" weight="fill" className="text-indigo-500 text-sm" />}
                                                                {comp.exercices?.length > 0 && <Icon name="files" weight="fill" className="text-emerald-500 text-sm" />}
                                                                {isCibled && <span title="Ciblée par M. PUTOD">🎯</span>}
                                                                {cData?.enAttente && <span title="En attente de validation">⏳</span>}
                                                                {isExp && <span className="text-[10px] font-medium text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded ml-1" title="À réévaluer car la dernière évaluation date d'il y a trop longtemps">À réévaluer</span>}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 pt-1 pl-1">
                                                            {dotsArray.map((dot, idx) => <div key={idx} className={`w-3.5 h-3.5 rounded-full border shadow-sm ${getDotColorClass(dot.emoji)}`} title={dot.date ? `Évalué le ${formatDateFr(dot.date)}` : `Évaluation ${idx + 1}`}></div>)}
                                                            {hasResources && <div className="ml-auto text-[10px] font-bold text-indigo-600 bg-white border border-indigo-100 px-2 py-0.5 rounded opacity-70">Voir détails &rarr;</div>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {concs.length === 0 && <p className="text-[10px] italic text-slate-400 pl-1 py-1">Aucune.</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {viewMode === 'GRANDE_COMP' && GRANDES_COMPETENCES.map(grandeComp => {
                        const domComps = filteredCompetences.filter(c => c.grandesCompetences && c.grandesCompetences.includes(grandeComp));
                        if (domComps.length === 0) return null;

                        const techs = domComps.filter(c => c.type === 'Technique' || c.type === 'TECH');
                        const concs = domComps.filter(c => c.type === 'Conceptuel' || c.type === 'CONC');
                        const dColor = GC_COLORS[grandeComp] || 'slate';

                        const acquisCount = domComps.filter(c => {
                            const b = suivi[c.id]?.bilan;
                            return b === '🟩' || b === '🟢';
                        }).length;
                        const percentage = domComps.length > 0 ? Math.round((acquisCount / domComps.length) * 100) : 0;

                        return (
                            <div key={grandeComp} className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                                <div className={`absolute top-0 left-0 w-1.5 h-full bg-${dColor}-500`}></div>
                                <div className="mb-4 pl-3">
                                    <h3 className={`text-lg font-black text-${dColor}-800 uppercase tracking-widest`}>{grandeComp}</h3>
                                    <div className="mt-2">
                                        <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                                            <span>Progression Globale</span>
                                            <span className="text-emerald-600">{acquisCount} / {domComps.length} acquises</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                            <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-x-6 gap-y-3 pl-3">
                                    <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5 pl-1">
                                            Savoir-faire
                                        </h4>
                                        <div className="space-y-2">
                                            {techs.map(comp => {
                                                const cData = suivi[comp.id];
                                                const isExp = isSkillExpired(cData, comp.validiteMois);
                                                const isCibled = cData?.cible === true;
                                                const currentBilan = cData?.bilan || '⚪';
                                                const cardBg = getCardBgClass(currentBilan, isCibled);

                                                const evals = cData?.evaluations || [];
                                                const totalDots = Math.max(3, evals.length);
                                                const dotsArray = [];
                                                for (let i = 0; i < totalDots; i++) {
                                                    dotsArray.push({ emoji: evals[i]?.note || '⚪', date: evals[i]?.date || null });
                                                }

                                                const hasExplications = (comp.explications?.length > 0) || comp.explication;
                                                const hasResources = hasExplications || comp.lienExercice || comp.exercices?.length > 0;

                                                const compChapKey = `${studentLevel}_${comp.chapitre}`;
                                                const compChapTitle = chapitresDetails[compChapKey]?.titre || comp.chapitreNom || "";

                                                return (
                                                    <div key={comp.id} onClick={() => { setSelectedComp(comp); setShowCorrection(false); }} className={`p-2.5 rounded-xl border transition-all cursor-pointer shadow-sm hover:-translate-y-0.5 ${cardBg}`}>
                                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className={`text-[9px] font-black shrink-0 px-1.5 py-0.5 rounded text-${dColor}-700 bg-${dColor}-100`}>{comp.code || comp.id}</span>
                                                                <span className="text-[9px] font-bold text-slate-400 border border-slate-200 bg-white px-1.5 py-0.5 rounded truncate max-w-[120px] sm:max-w-[150px]" title={`Chapitre ${comp.chapitre} - ${compChapTitle}`}>
                                                                    Chap. {comp.chapitre} - {compChapTitle}
                                                                </span>
                                                                <span className="text-xs font-bold text-slate-800 truncate" title={comp.intitule}>{comp.intitule}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                {hasExplications && <Icon name="lightbulb" weight="fill" className="text-amber-500 text-sm" />}
                                                                {comp.lienExercice && <Icon name="game-controller" weight="fill" className="text-indigo-500 text-sm" />}
                                                                {comp.exercices?.length > 0 && <Icon name="files" weight="fill" className="text-emerald-500 text-sm" />}
                                                                {isCibled && <span title="Ciblée par M. PUTOD">🎯</span>}
                                                                {cData?.enAttente && <span title="En attente de validation">⏳</span>}
                                                                {isExp && <span className="text-[10px] font-medium text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded ml-1" title="À réévaluer car la dernière évaluation date d'il y a trop longtemps">À réévaluer</span>}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 pt-1 pl-1">
                                                            {dotsArray.map((dot, idx) => <div key={idx} className={`w-3.5 h-3.5 rounded-full border shadow-sm ${getDotColorClass(dot.emoji)}`} title={dot.date ? `Évalué le ${formatDateFr(dot.date)}` : `Évaluation ${idx + 1}`}></div>)}
                                                            {hasResources && <div className="ml-auto text-[10px] font-bold text-indigo-600 bg-white border border-indigo-100 px-2 py-0.5 rounded opacity-70">Voir détails &rarr;</div>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {techs.length === 0 && <p className="text-[10px] italic text-slate-400 pl-1 py-1">Aucune.</p>}
                                        </div>
                                    </div>
                                    <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5 pl-1">
                                            Raisonnement et Compréhension
                                        </h4>
                                        <div className="space-y-2">
                                            {concs.map(comp => {
                                                const cData = suivi[comp.id];
                                                const isExp = isSkillExpired(cData, comp.validiteMois);
                                                const isCibled = cData?.cible === true;
                                                const currentBilan = cData?.bilan || '⚪';
                                                const cardBg = getCardBgClass(currentBilan, isCibled);

                                                const evals = cData?.evaluations || [];
                                                const totalDots = Math.max(3, evals.length);
                                                const dotsArray = [];
                                                for (let i = 0; i < totalDots; i++) {
                                                    dotsArray.push({ emoji: evals[i]?.note || '⚪', date: evals[i]?.date || null });
                                                }

                                                const hasExplications = (comp.explications?.length > 0) || comp.explication;
                                                const hasResources = hasExplications || comp.lienExercice || comp.exercices?.length > 0;

                                                const compChapKey = `${studentLevel}_${comp.chapitre}`;
                                                const compChapTitle = chapitresDetails[compChapKey]?.titre || comp.chapitreNom || "";

                                                return (
                                                    <div key={comp.id} onClick={() => { setSelectedComp(comp); setShowCorrection(false); }} className={`p-2.5 rounded-xl border transition-all cursor-pointer shadow-sm hover:-translate-y-0.5 ${cardBg}`}>
                                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className={`text-[9px] font-black shrink-0 px-1.5 py-0.5 rounded text-${dColor}-700 bg-${dColor}-100`}>{comp.code || comp.id}</span>
                                                                <span className="text-[9px] font-bold text-slate-400 border border-slate-200 bg-white px-1.5 py-0.5 rounded truncate max-w-[120px] sm:max-w-[150px]" title={`Chapitre ${comp.chapitre} - ${compChapTitle}`}>
                                                                    Chap. {comp.chapitre} - {compChapTitle}
                                                                </span>
                                                                <span className="text-xs font-bold text-slate-800 truncate" title={comp.intitule}>{comp.intitule}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                {hasExplications && <Icon name="lightbulb" weight="fill" className="text-amber-500 text-sm" />}
                                                                {comp.lienExercice && <Icon name="game-controller" weight="fill" className="text-indigo-500 text-sm" />}
                                                                {comp.exercices?.length > 0 && <Icon name="files" weight="fill" className="text-emerald-500 text-sm" />}
                                                                {isCibled && <span title="Ciblée par M. PUTOD">🎯</span>}
                                                                {cData?.enAttente && <span title="En attente de validation">⏳</span>}
                                                                {isExp && <span className="text-[10px] font-medium text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded ml-1" title="À réévaluer car la dernière évaluation date d'il y a trop longtemps">À réévaluer</span>}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 pt-1 pl-1">
                                                            {dotsArray.map((dot, idx) => <div key={idx} className={`w-3.5 h-3.5 rounded-full border shadow-sm ${getDotColorClass(dot.emoji)}`} title={dot.date ? `Évalué le ${formatDateFr(dot.date)}` : `Évaluation ${idx + 1}`}></div>)}
                                                            {hasResources && <div className="ml-auto text-[10px] font-bold text-indigo-600 bg-white border border-indigo-100 px-2 py-0.5 rounded opacity-70">Voir détails &rarr;</div>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {concs.length === 0 && <p className="text-[10px] italic text-slate-400 pl-1 py-1">Aucune.</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* MODALE DE DÉTAILS / REMÉDIATION ET AUTO-ÉVAL */}
            {selectedComp && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setSelectedComp(null)}>
                    <div className="bg-slate-50 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="bg-indigo-600 p-6 text-white shrink-0 relative">
                            <button onClick={() => setSelectedComp(null)} className="absolute top-4 right-4 text-indigo-200 hover:text-white bg-indigo-700/50 p-2 rounded-full transition-colors">
                                <Icon name="x" size={20} />
                            </button>
                            <div className="flex gap-2 mb-2">
                                <span className="bg-white/20 px-2 py-1 rounded text-[10px] font-black">{selectedComp.code || selectedComp.id}</span>
                                <span className="bg-white/20 px-2 py-1 rounded text-[10px] font-bold">
                                    Chapitre {selectedComp.chapitre} - {chapitresDetails[`${studentLevel}_${selectedComp.chapitre}`]?.titre || selectedComp.chapitreNom}
                                </span>
                            </div>
                            <h3 className="text-xl font-black leading-tight pr-10">{selectedComp.intitule}</h3>
                        </div>

                        <div className="overflow-y-auto custom-scrollbar p-6 space-y-6 flex-1">
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between flex-wrap gap-4">
                                <div>
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Mon historique</h4>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {suivi[selectedComp.id]?.evaluations?.length > 0 ? (
                                            suivi[selectedComp.id].evaluations.map((ev, i) => (
                                                <div key={i} className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg">
                                                    <div className={`w-3 h-3 rounded-full shadow-sm ${getDotColorClass(ev.note)}`}></div>
                                                    <span className="text-xs font-mono text-slate-500 font-bold">{formatDateFr(ev.date)}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-sm text-slate-400 italic">Compétence non évaluée pour le moment.</div>
                                        )}
                                    </div>
                                </div>

                                {/* BOUTON AUTO-ÉVALUATION & ANNULATION */}
                                <div>
                                    {!suivi[selectedComp.id]?.enAttente ? (
                                        <button
                                            onClick={handleAutoEval}
                                            disabled={isSavingEval}
                                            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl border border-indigo-700 transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
                                        >
                                            {isSavingEval ? <Icon name="spinner" className="animate-spin" /> : <Icon name="hand-raising" weight="fill" />}
                                            Je suis prêt pour être évalué
                                        </button>
                                    ) : (
                                        <div className="flex flex-col gap-2 items-end">
                                            <div className="px-4 py-2.5 bg-emerald-100 text-emerald-800 font-bold rounded-xl border border-emerald-300 flex items-center gap-2 shadow-sm whitespace-nowrap text-sm">
                                                <Icon name="check-circle" weight="fill" className="text-emerald-600 shrink-0 text-lg" />
                                                <span>
                                                    Je suis prêt pour être évalué <br />
                                                    <span className="text-xs font-medium opacity-80">(M. PUTOD a été prévenu)</span>
                                                </span>
                                            </div>
                                            <button
                                                onClick={handleCancelAutoEval}
                                                disabled={isSavingEval}
                                                className="text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 uppercase tracking-wider bg-slate-50 hover:bg-red-50 px-3 py-1.5 rounded-lg"
                                            >
                                                {isSavingEval ? <Icon name="spinner" className="animate-spin" /> : <Icon name="x" weight="bold" />}
                                                Annuler la demande
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {((selectedComp.explications && selectedComp.explications.length > 0) || selectedComp.explication || selectedComp.lienExercice || selectedComp.exercices?.length > 0) && (
                                <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-5 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-400 rounded-full blur-[50px] opacity-20"></div>
                                    <h4 className="text-lg font-black text-amber-900 flex items-center gap-2 mb-4 relative z-10">
                                        <Icon name="first-aid" className="text-amber-500" weight="fill" /> Comment m'améliorer ?
                                    </h4>

                                    {/* APPEL DE NOTRE NOUVELLE FONCTION DE RENDU */}
                                    {renderExplications()}

                                    {selectedComp.lienExercice && (
                                        <button
                                            onClick={() => {
                                                if (onPlay) onPlay('TRAINING', selectedComp.lienExercice, 1);
                                                setSelectedComp(null);
                                            }}
                                            className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 mb-4 relative z-10"
                                        >
                                            <Icon name="game-controller" weight="fill" className="text-xl" /> S'entraîner sur l'automatisme !
                                        </button>
                                    )}

                                    {selectedComp.exercices?.length > 0 && (
                                        <div className="space-y-6 relative z-10 mt-6 pt-4 border-t border-amber-200">
                                            <h5 className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-3">Exercices de révision :</h5>

                                            {selectedComp.exercices.map((exo, idx) => (
                                                <div key={exo.id || idx} className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-amber-100">
                                                    <h6 className="font-black text-amber-800 uppercase tracking-widest text-[10px] mb-3 border-b border-amber-100 pb-2">
                                                        Exercice {idx + 1}
                                                    </h6>

                                                    {exo.enonceTexte && (
                                                        <div className="text-sm text-slate-700 font-medium mb-3 whitespace-pre-wrap leading-relaxed">
                                                            {exo.enonceTexte}
                                                        </div>
                                                    )}

                                                    {exo.enonceImages?.length > 0 && (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                                            {exo.enonceImages.map((url, i) => (
                                                                <a key={i} href={url} target="_blank" rel="noreferrer" className="block border-2 border-slate-100 rounded-xl overflow-hidden hover:border-indigo-300 transition-colors">
                                                                    <img src={url} alt={`Enoncé ${i}`} className="w-full h-auto object-contain bg-slate-50" />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {(exo.correctionTexte || exo.correctionImages?.length > 0) && (
                                                        <div className="mt-4 pt-3 border-t border-slate-100">
                                                            {!showCorrection ? (
                                                                <button
                                                                    onClick={() => setShowCorrection(true)}
                                                                    className="w-full py-3 bg-emerald-50 text-emerald-700 font-bold rounded-lg hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 text-sm border border-emerald-200"
                                                                >
                                                                    <Icon name="eye" weight="bold" /> Voir la correction
                                                                </button>
                                                            ) : (
                                                                <div className="animate-in fade-in slide-in-from-top-2 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                                                                    <h6 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-emerald-200/50 pb-2">
                                                                        <Icon name="check-circle" weight="fill" /> Correction
                                                                    </h6>
                                                                    {exo.correctionTexte && (
                                                                        <div className="text-sm text-emerald-900 font-medium mb-3 whitespace-pre-wrap leading-relaxed">
                                                                            {exo.correctionTexte}
                                                                        </div>
                                                                    )}
                                                                    {exo.correctionImages?.length > 0 && (
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                            {exo.correctionImages.map((url, i) => (
                                                                                <a key={i} href={url} target="_blank" rel="noreferrer" className="block border-2 border-emerald-200 rounded-xl overflow-hidden hover:border-emerald-400 transition-colors">
                                                                                    <img src={url} alt={`Correction ${i}`} className="w-full h-auto object-contain bg-white" />
                                                                                </a>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="bg-white p-4 border-t border-slate-200 shrink-0">
                            <button onClick={() => setSelectedComp(null)} className="w-full py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}