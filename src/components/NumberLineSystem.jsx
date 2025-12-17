import React, { useMemo } from 'react';

// 1. UTILITAIRE DE SIMPLIFICATION (PGCD)
const getPgcd = (a, b) => (b === 0 ? a : getPgcd(b, a % b));

const NumberLineSystem = ({ config, highlight = false }) => {

    const { viewBox, ticks, pointsToDraw, mainAxisY, error } = useMemo(() => {
        const safeNum = (val, def) => {
            if (val === null || val === undefined) return def;
            const num = parseFloat(val);
            return isNaN(num) || !isFinite(num) ? def : num;
        };

        const round = (num) => Math.round(num * 10000) / 10000;

        if (!config) return { error: "Config manquante" };

        const min = safeNum(config.min, 0);
        const max = safeNum(config.max, 10);
        let step = safeNum(config.step, 1);
        let subStep = safeNum(config.subStep, step / 2);

        // --- 2. FORMATAGE AVEC SIMPLIFICATION ---
        const formatLabel = (val) => {
            // Cas A : C'est un entier (ou très proche) -> on renvoie l'entier
            if (Math.abs(val - Math.round(val)) < 0.0001) return String(Math.round(val));

            // Cas B : Mode Fraction activé
            if (config.denominator) {
                const den = parseInt(config.denominator, 10);
                const num = Math.round(val * den);

                // SIMPLIFICATION ICI
                const div = getPgcd(Math.abs(num), den);
                if (div > 1) {
                    return `${num / div}/${den / div}`; // Ex: 2/4 -> 1/2
                }

                return `${num}/${den}`;
            }

            // Cas C : Décimal classique
            return String(round(val)).replace('.', ',');
        };

        // --- CONFIGURATION ---
        let fixedLabels = [];
        if (config.fixedLabels) {
            fixedLabels = Array.isArray(config.fixedLabels)
                ? config.fixedLabels
                : String(config.fixedLabels).split(',').map(Number);
        } else {
            fixedLabels = [min, max];
        }

        // SÉCURITÉS
        if (step <= 0.0001) step = 1;
        if (subStep <= 0.0001) subStep = 0.5;
        const range = max - min;
        if (range <= 0.00001) return { error: "Min >= Max" };

        // DIMENSIONS
        const width = 650;
        const height = 200;
        const padding = 50;
        const usefulWidth = width - (padding * 2);

        const toX = (val) => padding + ((val - min) / range) * usefulWidth;

        // --- POINTS (Calculés avant pour identifier les cibles) ---
        const pointsData = (config.points || []).map(p => {
            const val = safeNum(p.val, min);
            return {
                x: toX(val),
                val: val,
                label: p.label || "?",
                color: p.color || 'indigo',
                formattedVal: formatLabel(val) // Pré-calcul du label simplifié
            };
        });

        // --- DENSITÉ ---
        const totalTicks = Math.floor(range / subStep);
        const pixelsPerTick = usefulWidth / totalTicks;
        // On utilise la limite définie dans le JSON ou 30px par défaut
        const densityLimit = config.densityLimit || 30;
        const isCrowded = pixelsPerTick < densityLimit;

        // --- GÉNÉRATION DES TICKS ---
        const ticksData = [];
        for (let i = 0; i <= totalTicks + 1; i++) {
            const current = round(min + (i * subStep));
            if (current > max + 0.0001) break;

            const remainder = Math.abs(current % step);
            const isMain = remainder < 0.001 || Math.abs(remainder - step) < 0.001;
            const isFixed = fixedLabels.some(lbl => Math.abs(lbl - current) < 0.001);

            // Est-ce que ce tick correspond exactement à un point réponse ?
            const isTarget = pointsData.some(p => Math.abs(p.val - current) < 0.001);

            let showLabel = false;
            let isCorrectionLabel = false;

            if (highlight) {
                // MODE CORRECTION
                if (isFixed || isTarget) {
                    // On force l'affichage si c'est une réponse ou un label fixe
                    showLabel = true;
                    if (isTarget) isCorrectionLabel = true;
                } else if (!isCrowded) {
                    // Si on a la place, on affiche tout
                    showLabel = true;
                    isCorrectionLabel = true;
                } else if (isMain) {
                    // Sinon juste les principaux
                    showLabel = true;
                    isCorrectionLabel = true;
                }
            } else {
                // MODE QUESTION
                if (isFixed) showLabel = true;
            }

            ticksData.push({
                x: toX(current),
                h: isMain ? 25 : 12,
                label: showLabel ? formatLabel(current) : null,
                isCorrection: isCorrectionLabel
            });
        }

        return {
            viewBox: `0 0 ${width} ${height}`,
            ticks: ticksData,
            pointsToDraw: pointsData,
            mainAxisY: height / 2 + 30
        };
    }, [config, highlight]);

    if (error || !ticks) return <div className="p-4 text-center text-red-400 text-xs">{error}</div>;

    return (
        <svg viewBox={viewBox} className="w-full h-full select-none bg-white rounded-xl border border-slate-100">
            <line x1="20" y1={mainAxisY} x2="630" y2={mainAxisY} stroke="#334155" strokeWidth="3" markerEnd="url(#arrow)" />
            <defs>
                <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
                    <path d="M0,0 L0,6 L9,3 z" fill="#334155" />
                </marker>
            </defs>

            {ticks.map((t, i) => (
                <g key={i} transform={`translate(${t.x}, ${mainAxisY})`}>
                    <line y1={-t.h} y2={0} stroke={t.label !== null ? "#1e293b" : "#94a3b8"} strokeWidth={t.label !== null ? 2 : 1.5} />
                    {t.label !== null && (
                        <text
                            y="35"
                            textAnchor="middle"
                            className={`font-mono font-bold transition-all duration-500 ${t.isCorrection ? 'fill-indigo-500 text-xs' : 'fill-slate-800 text-sm'
                                }`}
                        >
                            {t.label}
                        </text>
                    )}
                </g>
            ))}

            {pointsToDraw.map((p, i) => (
                <g key={i} transform={`translate(${p.x}, ${mainAxisY})`}>
                    <line x1="-5" y1="-5" x2="5" y2="5" stroke={highlight ? "#10b981" : "#ef4444"} strokeWidth="4" />
                    <line x1="-5" y1="5" x2="5" y2="-5" stroke={highlight ? "#10b981" : "#ef4444"} strokeWidth="4" />
                    <g transform="translate(0, -45)">
                        <line x1="0" y1="12" x2="0" y2="45" stroke={highlight ? "#10b981" : "#ef4444"} strokeWidth="2" strokeDasharray="4 4" />
                        <rect x="-24" y="-30" width="48" height="34" rx="8" fill={highlight ? "#ecfdf5" : "#fff1f2"} stroke={highlight ? "#10b981" : "#ef4444"} strokeWidth="2" />
                        <text y="-12" textAnchor="middle" dominantBaseline="middle" className={`font-black ${highlight ? "fill-emerald-600" : "fill-red-600"} ${String(highlight ? p.formattedVal : p.label).length > 3 ? 'text-xs' : 'text-lg'}`}>
                            {highlight ? p.formattedVal : p.label}
                        </text>
                    </g>
                </g>
            ))}
        </svg>
    );
};

export default NumberLineSystem;