import React from 'react';

// --- FONCTIONS UTILITAIRES ---
const getMid = (p1, p2) => ({
    x: (Number(p1.x) + Number(p2.x)) / 2,
    y: (Number(p1.y) + Number(p2.y)) / 2
});

const getAngle = (p1, p2) => Math.atan2(
    Number(p2.y) - Number(p1.y),
    Number(p2.x) - Number(p1.x)
);

const GeometrySystem = ({ config }) => {
    // 1. Sécurité : si pas de config, on ne plante pas le site
    if (!config || !config.points) {
        return <div className="text-red-400 text-xs p-2">Config Géométrie Invalide</div>;
    }

    // 2. Récupération de TOUTES les props (y compris les optionnelles)
    const { points, codings = [], extraPoints = [], lines = [] } = config;

    // --- CONFIGURATION DE LA VUE ---
    const SIZE = 300;
    const CENTER = SIZE / 2;

    // Conversion Coordonnées Cartésiennes (Math) -> SVG (Écran)
    // Note : Y est inversé en SVG (0 est en haut)
    const toSvg = (pt) => ({
        x: CENTER + Number(pt.x),
        y: CENTER - Number(pt.y)
    });

    // Helper pour récupérer un point de manière sécurisée
    // Il cherche d'abord dans les points principaux, puis dans les extraPoints
    const getPt = (idx) => {
        if (idx < points.length) return points[idx];
        // Gestion des points supplémentaires (pour les constructions complexes)
        if (extraPoints && idx - points.length < extraPoints.length) {
            return extraPoints[idx - points.length];
        }
        return { x: 0, y: 0, label: "?" }; // Fallback anti-crash
    };

    // --- RENDU STRUCTURE (Lignes ou Polygone) ---
    const renderStructure = () => {
        // Mode A : Lignes explicites (défini dans le JSON, ex: exercice des angles)
        if (lines && lines.length > 0) {
            return lines.map((indices, i) => {
                const p1 = getPt(indices[0]);
                const p2 = getPt(indices[1]);
                const s1 = toSvg(p1);
                const s2 = toSvg(p2);
                return (
                    <line
                        key={`line-${i}`}
                        x1={s1.x} y1={s1.y}
                        x2={s2.x} y2={s2.y}
                        stroke="#1e293b"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                );
            });
        }

        // Mode B : Polygone fermé par défaut (si pas de lignes définies)
        // C'est le comportement original pour tes anciens exercices
        const pathStr = points.map((pt, i) => {
            const s = toSvg(pt);
            return `${i === 0 ? 'M' : 'L'} ${s.x} ${s.y}`;
        }).join(' ') + " Z";

        return <path d={pathStr} fill="none" stroke="#1e293b" strokeWidth="3" strokeLinejoin="round" />;
    };

    // Liste complète pour l'affichage des points (Principaux + Extras)
    const allPointsToRender = [...points, ...(extraPoints || [])];

    return (
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full select-none bg-white rounded-xl overflow-hidden">

            {/* 1. Structure (Traits Noirs) */}
            {renderStructure()}

            {/* 2. Codages (Angles, Segments) */}
            {codings.map((code, i) => {
                // Gestion masquage dynamique (ex: hide="{variable}")
                if (String(code.hide) === "true" || code.hide === true) return null;

                const indices = code.indices || [];
                // On vérifie qu'on a bien les indices nécessaires
                if (indices.length < 2) return null;

                const P1 = getPt(indices[0]);
                const P2 = getPt(indices[1]); // SOMMET (ou 2ème point du segment)
                const P3 = indices.length > 2 ? getPt(indices[2]) : null;

                // --- CODAGE SEGMENT (TICK) ---
                if (code.type === 'tick' || code.type === 'double_tick') {
                    const S1 = toSvg(P1);
                    const S2 = toSvg(P2);
                    const M = getMid(S1, S2);
                    const angleDeg = getAngle(S1, S2) * (180 / Math.PI);
                    return (
                        <g key={`tick-${i}`} transform={`translate(${M.x}, ${M.y}) rotate(${angleDeg})`}>
                            <line x1="0" y1="-6" x2="0" y2="6" stroke="#ef4444" strokeWidth="2" />
                            {code.type === 'double_tick' && <line x1="4" y1="-6" x2="4" y2="6" stroke="#ef4444" strokeWidth="2" />}
                        </g>
                    );
                }

                // --- CODAGE ANGLES ---
                if ((code.type === 'angle' || code.type === 'right_angle') && P3) {
                    const A = toSvg(P1); // Point Départ
                    const O = toSvg(P2); // Sommet
                    const B = toSvg(P3); // Point Arrivée

                    // Calcul des angles SVG (Attention Y inversé)
                    const startAngle = Math.atan2(A.y - O.y, A.x - O.x);
                    const endAngle = Math.atan2(B.y - O.y, B.x - O.x);

                    // --- CORRECTION MATHEMATIQUE (Le fix important) ---
                    // Calcul pour TOUJOURS prendre le petit angle (< 180)
                    let diff = endAngle - startAngle;

                    // Normalisation stricte entre -PI et +PI
                    while (diff <= -Math.PI) diff += 2 * Math.PI;
                    while (diff > Math.PI) diff -= 2 * Math.PI;

                    // SVG Arc flags :
                    // large-arc-flag = 0 (on veut le petit chemin)
                    // sweep-flag = 1 si angle positif, 0 sinon
                    let sweepFlag = diff > 0 ? 1 : 0;

                    // --- ANGLE DROIT (CARRÉ) ---
                    if (code.type === 'right_angle') {
                        const size = 14;
                        const distA = Math.hypot(A.x - O.x, A.y - O.y) || 1;
                        const distB = Math.hypot(B.x - O.x, B.y - O.y) || 1;

                        // Vecteurs unitaires normalisés
                        const ax = O.x + (A.x - O.x) / distA * size;
                        const ay = O.y + (A.y - O.y) / distA * size;
                        const bx = O.x + (B.x - O.x) / distB * size;
                        const by = O.y + (B.y - O.y) / distB * size;

                        // Point C (coin opposé)
                        const cx = ax + (bx - O.x);
                        const cy = ay + (by - O.y);

                        return <path key={`ang-${i}`} d={`M ${ax} ${ay} L ${cx} ${cy} L ${bx} ${by}`} stroke="#ef4444" strokeWidth="2" fill="none" />;
                    }

                    // --- ANGLE CLASSIQUE (ARC DE CERCLE) ---
                    const radius = code.size || 30;
                    const color = code.color || "#6366f1";

                    const x1 = O.x + radius * Math.cos(startAngle);
                    const y1 = O.y + radius * Math.sin(startAngle);
                    const x2 = O.x + radius * Math.cos(endAngle);
                    const y2 = O.y + radius * Math.sin(endAngle);

                    // Position Label (Milieu de l'arc)
                    const midAngle = startAngle + diff / 2;
                    const labelDist = radius + 15;
                    const lx = O.x + labelDist * Math.cos(midAngle);
                    const ly = O.y + labelDist * Math.sin(midAngle);

                    return (
                        <g key={`ang-${i}`}>
                            <path
                                d={`M ${O.x} ${O.y} L ${x1} ${y1} A ${radius} ${radius} 0 0 ${sweepFlag} ${x2} ${y2} Z`}
                                fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2"
                            />
                            {code.label && (
                                <text x={lx} y={ly} fontSize="12" fontWeight="bold" fill={color} textAnchor="middle" dominantBaseline="middle" style={{ textShadow: "0px 0px 3px white" }}>
                                    {code.label}
                                </text>
                            )}
                        </g>
                    );
                }
                return null;
            })}

            {/* 3. Labels Points */}
            {allPointsToRender.map((pt, i) => {
                const s = toSvg(pt);
                // Sécurité
                if (isNaN(s.x) || isNaN(s.y)) return null;

                const isExtra = i >= points.length;

                // Décalage intelligent (éloigner du centre O pour lisibilité)
                const dirX = s.x - CENTER;
                const dirY = s.y - CENTER;
                const dist = Math.hypot(dirX, dirY) || 1;

                // Si on est proche du centre, on décale par défaut, sinon on suit la direction
                let offsetX = (dirX / dist) * 20;
                let offsetY = (dirY / dist) * 20;

                // Fallback si point au centre exact (ex: Point O)
                if (dist < 5) { offsetX = -15; offsetY = -15; }

                return (
                    <g key={`pt-${i}`}>
                        <circle cx={s.x} cy={s.y} r="3" fill={isExtra ? "#94a3b8" : "#64748b"} />
                        <text x={s.x + offsetX} y={s.y + offsetY} className="text-sm font-bold fill-slate-700" textAnchor="middle" dominantBaseline="middle">
                            {pt.label}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};

export default GeometrySystem;