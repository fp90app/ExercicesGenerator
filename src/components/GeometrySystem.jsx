import React from 'react';

// Fonction utilitaire pour le milieu d'un segment
const getMid = (p1, p2) => ({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 });
// Fonction pour l'angle d'un segment
const getAngle = (p1, p2) => Math.atan2(p2.y - p1.y, p2.x - p1.x);

const GeometrySystem = ({ config }) => {
    // Config attendue : { points: [{x,y}...], codings: [{type, p1, p2}...] }
    const { points, codings = [], extraPoints = [] } = config || {};

    if (!points || points.length < 3) return null;

    // Viewbox fixe centrée (on suppose que le générateur envoie des coords entre -100 et 100)
    const SIZE = 300;
    const CENTER = SIZE / 2;
    // Fonction pour convertir les coords mathématiques en coords SVG
    const toSvg = (pt) => ({ x: CENTER + pt.x, y: CENTER - pt.y });

    // Construction du path du polygone (uniquement avec les points principaux)
    const pathStr = points.map((pt, i) => {
        const s = toSvg(pt);
        return `${i === 0 ? 'M' : 'L'} ${s.x} ${s.y}`;
    }).join(' ') + ' Z';

    // FUSION DES POINTS : On combine les sommets + les points extra (comme O)
    const allPointsToRender = [...points, ...extraPoints];

    return (
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full select-none">
            {/* 1. La Forme Géométrique */}
            <path d={pathStr} fill="#f8fafc" stroke="#1e293b" strokeWidth="3" strokeLinejoin="round" />

            {/* 2. Les Codages */}
            {codings.map((code, i) => {
                const A = toSvg(points[code.indices[0]]);
                const B = toSvg(points[code.indices[1]]);

                // CODAGE SEGMENT (Traits)
                if (code.type === 'tick' || code.type === 'double_tick') {
                    const M = getMid(A, B);
                    const angle = getAngle(A, B) * (180 / Math.PI);
                    return (
                        <g key={i} transform={`translate(${M.x}, ${M.y}) rotate(${angle})`}>
                            {/* Simple trait */}
                            <line x1="0" y1="-6" x2="0" y2="6" stroke="#ef4444" strokeWidth="2" />
                            {/* Double trait */}
                            {code.type === 'double_tick' && (
                                <line x1="4" y1="-6" x2="4" y2="6" stroke="#ef4444" strokeWidth="2" />
                            )}
                        </g>
                    );
                }

                // CODAGE ANGLE DROIT
                if (code.type === 'right_angle') {
                    const P1 = toSvg(points[code.indices[0]]);
                    const Summit = toSvg(points[code.indices[1]]);
                    const P3 = toSvg(points[code.indices[2]]);

                    const vector1 = { x: P1.x - Summit.x, y: P1.y - Summit.y };
                    const vector2 = { x: P3.x - Summit.x, y: P3.y - Summit.y };

                    const len1 = Math.hypot(vector1.x, vector1.y);
                    const len2 = Math.hypot(vector2.x, vector2.y);
                    const size = 15;

                    const p1x = Summit.x + (vector1.x / len1) * size;
                    const p1y = Summit.y + (vector1.y / len1) * size;
                    const p2x = Summit.x + (vector2.x / len2) * size;
                    const p2y = Summit.y + (vector2.y / len2) * size;

                    const pMix = { x: p1x + (p2x - Summit.x), y: p1y + (p2y - Summit.y) };

                    return (
                        <path
                            key={i}
                            d={`M ${p1x} ${p1y} L ${pMix.x} ${pMix.y} L ${p2x} ${p2y}`}
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="2"
                        />
                    );
                }
                return null;
            })}

            {/* 3. Les Labels (A, B, C...) ET les Points Extra (O) */}
            {allPointsToRender.map((pt, i) => {
                const s = toSvg(pt);

                // C'est ici qu'on définit isExtra !
                // Si l'index 'i' est plus grand que la liste des points de base, c'est un point ajouté.
                const isExtra = i >= points.length;

                // On décale un peu le texte du centre pour qu'il soit extérieur
                const angle = Math.atan2(pt.y, pt.x);
                const dist = 20;
                const txtX = s.x + Math.cos(angle) * dist;
                const txtY = s.y - Math.sin(angle) * dist;

                return (
                    <g key={i}>
                        {/* Si c'est un point extra (comme O), on dessine un petit point gris */}
                        {isExtra && <circle cx={s.x} cy={s.y} r="3" fill="#64748b" />}

                        <text x={txtX} y={txtY} className="text-sm font-bold fill-slate-600" textAnchor="middle" dominantBaseline="middle">
                            {pt.label || String.fromCharCode(65 + i)}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};

export default GeometrySystem;