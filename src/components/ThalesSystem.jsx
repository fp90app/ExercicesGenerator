// --- src/components/ThalesSystem.jsx ---
import React from 'react';

const ThalesSystem = ({ config }) => {
    // On récupère targetKey ici pour savoir quel segment doit être rouge
    const { type, vals, given, targetKey } = config;

    // --- DIMENSIONS & ÉCHELLE ---
    const width = 400;
    const height = 350;
    const padding = 40;

    const maxDist = Math.max(vals.AD, vals.AE, vals.AB, vals.AC);
    const visualHeightNeeded = maxDist * 0.866;
    const availableHeightPx = type === 'papillon' ? (height / 2) - padding : height - (padding * 2);
    const scale = (availableHeightPx / visualHeightNeeded) * 0.9;

    const cx = width / 2;
    const cy = type === 'papillon' ? height / 2 : padding + 20;
    const angle1 = Math.PI / 3;
    const angle2 = 2 * Math.PI / 3;

    const getPoint = (dist, angle, invert = false) => {
        const d = dist * scale;
        const x = cx + d * Math.cos(angle) * (invert ? -1 : 1);
        const y = cy + d * Math.sin(angle) * (invert ? -1 : 1);
        return { x, y };
    };

    // --- CALCUL DES POINTS ---
    let A = { x: cx, y: cy };
    let B, C, D, E;

    if (type === 'triangle') {
        B = getPoint(vals.AB, angle2);
        D = getPoint(vals.AD, angle2);
        C = getPoint(vals.AC, angle1);
        E = getPoint(vals.AE, angle1);
    } else {
        B = getPoint(vals.AB, angle2);
        D = getPoint(vals.AD, angle2, true);
        C = getPoint(vals.AC, angle1);
        E = getPoint(vals.AE, angle1, true);
    }

    // --- 🎨 LOGIQUE DE COULEUR ---
    // C'est cette fonction qui décide si un trait est rouge, noir ou gris.
    const getSegmentStyle = (segmentName) => {
        // Règle absolue : Si c'est le segment qu'on cherche -> ROUGE VIF & ÉPAIS
        if (targetKey === segmentName) {
            return { stroke: "#dc2626", strokeWidth: "4" }; // Tailwind text-red-600
        }
        // Règle 2 : Si c'est une droite parallèle (BC ou DE) -> NOIR & ÉPAIS
        if (['BC', 'DE'].includes(segmentName)) {
            return { stroke: "#1e293b", strokeWidth: "3" }; // Tailwind text-slate-800
        }
        // Règle 3 : Le reste (les côtés de base) -> GRIS STANDARD
        return { stroke: "#94a3b8", strokeWidth: "2" }; // Tailwind text-slate-400
    };

    // Petit composant utilitaire pour dessiner une ligne avec le bon style
    const DrawLine = ({ p1, p2, name }) => {
        const style = getSegmentStyle(name);
        return (
            <line
                x1={p1.x} y1={p1.y}
                x2={p2.x} y2={p2.y}
                stroke={style.stroke}
                strokeWidth={style.strokeWidth}
                strokeLinecap="round"
            />
        );
    };

    // Mappage pour retrouver facilement les points d'un segment donné
    const segmentPointsMap = {
        'AB': [A, B], 'AC': [A, C],
        'AD': [A, D], 'AE': [A, E],
        'BC': [B, C], 'DE': [D, E],
        'BD': [B, D], 'CE': [C, E] // Important pour le niveau 3
    };

    const targetPoints = segmentPointsMap[targetKey];


    // --- ÉTIQUETTES (Texte des longueurs "5cm", "?") ---
    const Label = ({ p1, p2, text, isTarget, offset = 0 }) => {
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        const dist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
        const dx = offset * (p1.y - p2.y) / dist;
        const dy = offset * (p2.x - p1.x) / dist;
        const finalX = mx + dx;
        const finalY = my + dy;

        // Si c'est la cible, l'étiquette aussi est rouge
        const isTargetStyle = isTarget ? "fill-red-600 font-bold" : "fill-slate-600 font-medium";
        const bgFill = isTarget ? "#fef2f2" : "white";
        const strokeColor = isTarget ? "#dc2626" : "#cbd5e1";

        return (
            <g className="cursor-default">
                {offset !== 0 && <line x1={mx} y1={my} x2={finalX} y2={finalY} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2,2" />}
                <circle cx={finalX} cy={finalY} r={isTarget ? 18 : 14} fill={bgFill} stroke={strokeColor} strokeWidth={isTarget ? 2 : 1} />
                <text x={finalX} y={finalY} dy="5" textAnchor="middle" className={`text-xs ${isTargetStyle}`} style={{ fontSize: isTarget ? '16px' : '12px' }}>
                    {isTarget ? "?" : text}
                </text>
            </g>
        );
    };

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto bg-white rounded-xl border border-slate-200 shadow-inner select-none">
            <defs>
                <marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10" fill="#cbd5e1" /></marker>
            </defs>

            {/* Arrière-plan : Droites pointillées et remplissage */}
            <line x1={type === 'triangle' ? A.x : D.x} y1={type === 'triangle' ? A.y : D.y} x2={type === 'triangle' ? D.x : B.x} y2={type === 'triangle' ? D.y : B.y} stroke="#e2e8f0" strokeWidth="2" strokeDasharray="5,5" />
            <line x1={type === 'triangle' ? A.x : E.x} y1={type === 'triangle' ? A.y : E.y} x2={type === 'triangle' ? E.x : C.x} y2={type === 'triangle' ? E.y : C.y} stroke="#e2e8f0" strokeWidth="2" strokeDasharray="5,5" />
            <path d={`M ${A.x} ${A.y} L ${B.x} ${B.y} L ${C.x} ${C.y} Z`} fill="rgba(99, 102, 241, 0.05)" stroke="none" />
            <path d={`M ${A.x} ${A.y} L ${D.x} ${D.y} L ${E.x} ${E.y} Z`} fill="rgba(16, 185, 129, 0.05)" stroke="none" />

            {/* --- DESSIN DES TRAITS (Ordre important pour la superposition) --- */}

            {/* 1. On dessine toutes les bases en gris/noir */}
            <DrawLine p1={A} p2={D} name="AD" />
            <DrawLine p1={A} p2={E} name="AE" />
            <DrawLine p1={A} p2={B} name="AB" />
            <DrawLine p1={A} p2={C} name="AC" />
            <DrawLine p1={B} p2={C} name="BC" />
            <DrawLine p1={D} p2={E} name="DE" />

            {/* 2. CRUCIAL : On redessine le segment CIBLE par dessus les autres pour qu'il soit bien rouge et au premier plan */}
            {targetPoints && (
                <DrawLine p1={targetPoints[0]} p2={targetPoints[1]} name={targetKey} />
            )}


            {/* Points et Lettres */}
            {[A, B, C, D, E].map((p, i) => (<circle key={i} cx={p.x} cy={p.y} r="3" fill="white" stroke="#1e293b" strokeWidth="2" />))}
            <text x={A.x} y={A.y - 12} textAnchor="middle" className="font-bold fill-slate-700 text-sm">A</text>
            <text x={B.x - 12} y={B.y} textAnchor="end" className="font-bold fill-slate-700 text-sm">B</text>
            <text x={C.x + 12} y={C.y} textAnchor="start" className="font-bold fill-slate-700 text-sm">C</text>
            <text x={D.x - 12} y={D.y} textAnchor="end" className="font-bold fill-slate-700 text-sm">D</text>
            <text x={E.x + 12} y={E.y} textAnchor="start" className="font-bold fill-slate-700 text-sm">E</text>

            {/* --- ÉTIQUETTES --- */}
            {(given.AB || targetKey === 'AB') && <Label p1={A} p2={B} text={given.AB} isTarget={targetKey === 'AB'} />}
            {(given.AD || targetKey === 'AD') && <Label p1={A} p2={D} text={given.AD} isTarget={targetKey === 'AD'} offset={type === 'triangle' ? 30 : 0} />}
            {(targetKey === 'BD') && <Label p1={B} p2={D} isTarget={true} offset={type === 'triangle' ? 10 : 0} />}
            {(given.AC || targetKey === 'AC') && <Label p1={A} p2={C} text={given.AC} isTarget={targetKey === 'AC'} />}
            {(given.AE || targetKey === 'AE') && <Label p1={A} p2={E} text={given.AE} isTarget={targetKey === 'AE'} offset={type === 'triangle' ? -30 : 0} />}
            {(targetKey === 'CE') && <Label p1={C} p2={E} isTarget={true} offset={type === 'triangle' ? -10 : 0} />}
            {(given.BC || targetKey === 'BC') && <Label p1={B} p2={C} text={given.BC} isTarget={targetKey === 'BC'} />}
            {(given.DE || targetKey === 'DE') && <Label p1={D} p2={E} text={given.DE} isTarget={targetKey === 'DE'} />}
        </svg>
    );
};

export default ThalesSystem;