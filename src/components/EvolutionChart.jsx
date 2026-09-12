import React, { useState } from 'react';
import { Icon } from './UI';
import { GRANDES_COMPETENCES, GC_COLORS, HEX_COLORS } from '../utils/constants';

export default function EvolutionChart({ timeline, mode }) {
    const [visibleSocle, setVisibleSocle] = useState({
        Chercher: true, Modéliser: true, Représenter: true, Raisonner: true, Calculer: true, Communiquer: true
    });

    const W = 800;
    const H = 350;
    const padX = 60;
    const padY = 40;

    // S'il n'y a que le point de "Début" à 0, on n'affiche pas la courbe
    if (timeline.length <= 1) {
        return (
            <div className="text-slate-400 p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center gap-3">
                <Icon name="chart-line-down" size={48} className="opacity-30" />
                <span className="font-bold">Aucune évaluation sur cette période pour le moment.</span>
            </div>
        );
    }

    let lines = [];
    if (mode === 'GLOBAL') {
        lines.push({ key: 'total', name: 'Total Cumulé des Compétences', color: '#4f46e5' });
    } else if (mode === 'TYPE') {
        lines.push({ key: 'tech', name: 'Savoir-faire (Technique)', color: '#3b82f6' });
        lines.push({ key: 'conc', name: 'Raisonnement (Conceptuel)', color: '#a855f7' });
    } else if (mode === 'SOCLE') {
        GRANDES_COMPETENCES.forEach(gc => {
            // Utilisation des constantes importées
            const hex = HEX_COLORS[GC_COLORS[gc]] || '#64748b';
            lines.push({ key: gc, name: gc, color: hex, isSocle: true });
        });
    }

    const activeLines = lines.filter(l => !l.isSocle || visibleSocle[l.key]);

    let maxY = 10;
    timeline.forEach(pt => {
        activeLines.forEach(l => {
            const val = l.isSocle ? pt.socle[l.key] : pt[l.key];
            if (val > maxY) maxY = val;
        });
    });
    maxY = Math.ceil(maxY * 1.2);

    const getX = (index) => timeline.length === 1 ? W / 2 : padX + (index / (timeline.length - 1)) * (W - 2 * padX);
    const getY = (val) => H - padY - (val / maxY) * (H - 2 * padY);

    return (
        <div className="w-full overflow-x-auto custom-scrollbar pb-4 mt-6">
            <div className="min-w-[600px]">
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
                    {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
                        const y = H - padY - ratio * (H - 2 * padY);
                        return (
                            <g key={ratio}>
                                <line x1={padX} y1={y} x2={W - padX} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
                                <text x={padX - 10} y={y + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-mono font-bold">
                                    {Math.round(ratio * maxY)}
                                </text>
                            </g>
                        );
                    })}

                    {activeLines.map((line) => {
                        const pointsStr = timeline.map((pt, i) => {
                            const val = line.isSocle ? pt.socle[line.key] : pt[line.key];
                            return `${getX(i)},${getY(val)}`;
                        }).join(" ");

                        return (
                            <g key={line.key}>
                                <polyline points={pointsStr} fill="none" stroke={line.color} strokeWidth="3" strokeLinejoin="round" />
                                {timeline.map((pt, i) => {
                                    const val = line.isSocle ? pt.socle[line.key] : pt[line.key];
                                    return (
                                        <circle
                                            key={`${line.key}-${i}`}
                                            cx={getX(i)}
                                            cy={getY(val)}
                                            r="5"
                                            fill="white"
                                            stroke={line.color}
                                            strokeWidth="2"
                                            className="hover:r-6 hover:stroke-[4px] transition-all cursor-pointer drop-shadow-sm"
                                        >
                                            <title>{pt.displayDate} - {line.name} : {val} pts</title>
                                        </circle>
                                    );
                                })}
                            </g>
                        );
                    })}

                    {timeline.map((pt, i) => (
                        <text key={`label-${i}`} x={getX(i)} y={H - padY + 20} textAnchor="middle" className="text-[10px] fill-slate-500 font-bold">
                            {timeline.length > 12 ? (i % 2 === 0 ? pt.displayDate.substring(0, 5) : '') : pt.displayDate.substring(0, 5)}
                        </text>
                    ))}
                </svg>
            </div>
            <div className="flex flex-wrap gap-4 mt-6 justify-center">
                {lines.map(l => (
                    <button
                        key={l.key}
                        onClick={() => {
                            if (l.isSocle) {
                                setVisibleSocle(prev => ({ ...prev, [l.key]: !prev[l.key] }));
                            }
                        }}
                        className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg border shadow-sm transition-all ${!l.isSocle ? 'cursor-default' : 'cursor-pointer hover:bg-slate-100'} ${l.isSocle && !visibleSocle[l.key] ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-50 grayscale' : 'bg-white border-slate-200 text-slate-600'}`}
                        title={l.isSocle ? "Cliquer pour afficher ou masquer cette courbe" : ""}
                    >
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }}></span>
                        {l.name}
                    </button>
                ))}
            </div>
        </div>
    );
}