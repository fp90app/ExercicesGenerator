import React, { useState, useEffect, useMemo } from 'react';

const PythagoreSystem = ({ config, highlight = false }) => {
    // On utilise useMemo pour que les coordonnées ne soient recalculées que si la config change
    const { coords, labels, values, showSquare } = useMemo(() => {
        if (!config) return {};
        const { points, given, targetKey, qType } = config;

        // --- 1. CONFIGURATION DU CANVAS ---
        const VIEWBOX_SIZE = 360;
        const CENTER = VIEWBOX_SIZE / 2;
        const BASE_SIZE = 180; // Légèrement réduit pour laisser de la place aux étiquettes

        // --- 2. CALCUL DES COORDONNÉES ---
        // Position de l'angle droit avant rotation
        const startX = CENTER - (BASE_SIZE / 3);
        const startY = CENTER + (BASE_SIZE / 3);

        const rightCoord = { x: startX, y: startY };

        // Longueurs
        let abLen = config.vals[points.Right + points.Top] || 3;
        let acLen = config.vals[points.Right + points.Bottom] || 4;

        // Normalisation pour le dessin
        const maxLen = Math.max(abLen, acLen);
        const scale = BASE_SIZE / (maxLen || 1);

        const scaledAB = abLen * scale;
        const scaledAC = acLen * scale;

        // Coordonnées
        const topCoord = { x: rightCoord.x, y: rightCoord.y - scaledAB };
        const bottomCoord = { x: rightCoord.x + scaledAC, y: rightCoord.y };

        // --- 3. ÉTIQUETTES DES SOMMETS (A, B, C) ---
        // On utilise la même logique vectorielle pour les sommets : on s'éloigne du centre
        const getVertexPos = (pt, centerPt) => {
            const dx = pt.x - centerPt.x;
            const dy = pt.y - centerPt.y;
            // On normalise (longueur 1)
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            // On pousse de 25px vers l'extérieur
            return { x: pt.x + (dx / len) * 25, y: pt.y + (dy / len) * 25 };
        };

        // Barycentre approximatif pour pousser les lettres vers l'extérieur
        const barycenter = {
            x: (rightCoord.x + topCoord.x + bottomCoord.x) / 3,
            y: (rightCoord.y + topCoord.y + bottomCoord.y) / 3
        };

        const labelsData = [
            { txt: points.Right, ...getVertexPos(rightCoord, barycenter) },
            { txt: points.Top, ...getVertexPos(topCoord, barycenter) },
            { txt: points.Bottom, ...getVertexPos(bottomCoord, barycenter) },
        ];

        // --- 4. VALEURS DES CÔTÉS (Positionnement Amélioré) ---
        const valuesData = [];

        // Fonction qui place l'étiquette à une distance FIXE du milieu du segment, vers l'extérieur
        const addValueLabel = (p1, p2, oppositePoint, key) => {
            // Milieu du segment
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;

            // Vecteur allant du point opposé vers le milieu (direction "vers l'extérieur")
            const vecX = midX - oppositePoint.x;
            const vecY = midY - oppositePoint.y;

            // Longueur de ce vecteur
            const len = Math.sqrt(vecX * vecX + vecY * vecY) || 1;

            // Vecteur unitaire (direction pure)
            const unitX = vecX / len;
            const unitY = vecY / len;

            // DISTANCE FIXE : On pousse l'étiquette de 35px, peu importe la taille du triangle
            const DISTANCE = 35;

            const finalX = midX + unitX * DISTANCE;
            const finalY = midY + unitY * DISTANCE;

            let text = "?";
            let isTarget = (key === targetKey);

            if (given && given[key]) {
                text = `${given[key].val} ${given[key].unit}`;
            }

            if (qType === 'EQUALITY') return;

            valuesData.push({ x: finalX, y: finalY, text, isTarget });
        };

        // On passe le 3ème point (le point opposé) pour calculer la direction "extérieure"
        addValueLabel(rightCoord, topCoord, bottomCoord, points.Right + points.Top);
        addValueLabel(rightCoord, bottomCoord, topCoord, points.Right + points.Bottom);
        addValueLabel(topCoord, bottomCoord, rightCoord, points.Top + points.Bottom);

        return {
            coords: { right: rightCoord, top: topCoord, bottom: bottomCoord },
            labels: labelsData,
            values: valuesData,
            showSquare: { x: rightCoord.x, y: rightCoord.y, size: 20 }
        };
    }, [config]);

    // --- GESTION DE LA ROTATION ---
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        if (config) {
            // Rotation aléatoire propre (0, 90, 180, 270)
            const randomAngle = Math.floor(Math.random() * 4) * 90;
            setRotation(randomAngle);
        }
    }, [config]);

    if (!config || !coords) return null;

    const PIVOT = '180px 180px';

    return (
        <svg viewBox="0 0 360 360" className="w-full h-full max-w-[360px] select-none border border-slate-100 rounded-xl bg-slate-50/30">
            <g style={{
                transform: `rotate(${rotation}deg)`,
                transformOrigin: PIVOT,
                transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>

                {/* Triangle */}
                <polygon
                    points={`${coords.right.x},${coords.right.y} ${coords.top.x},${coords.top.y} ${coords.bottom.x},${coords.bottom.y}`}
                    className={`fill-white stroke-[4px] stroke-slate-800 line-join-round transition-colors duration-300 ${highlight ? 'stroke-emerald-500 fill-emerald-50' : ''}`}
                />

                {/* Angle droit (Carré simple, SANS le rond au milieu) */}
                <path
                    d={`
                        M ${coords.right.x} ${coords.right.y - showSquare.size} 
                        L ${coords.right.x + showSquare.size} ${coords.right.y - showSquare.size} 
                        L ${coords.right.x + showSquare.size} ${coords.right.y}
                    `}
                    fill="none"
                    className="stroke-[3px] stroke-red-500"
                />

                {/* Lettres des sommets */}
                {labels.map((l, i) => (
                    <text
                        key={i}
                        x={l.x}
                        y={l.y}
                        style={{
                            transform: `rotate(${-rotation}deg)`,
                            transformOrigin: `${l.x}px ${l.y}px`,
                            transition: 'transform 0.6s'
                        }}
                        className="font-black text-xl fill-indigo-900 font-sans text-anchor-middle dominant-baseline-middle"
                    >
                        {l.txt}
                    </text>
                ))}

                {/* Valeurs sur les côtés */}
                {values.map((v, i) => (
                    <g key={i} transform={`translate(${v.x}, ${v.y})`}>
                        <g style={{
                            transform: `rotate(${-rotation}deg)`,
                            transformOrigin: `0px 0px`,
                            transition: 'transform 0.6s'
                        }}>
                            {/* Fond blanc pour lisibilité */}
                            <rect x="-35" y="-16" width="70" height="32" rx="8"
                                className={`stroke-[2px] shadow-sm ${v.isTarget ? 'fill-red-50 stroke-red-200' : 'fill-white stroke-slate-200'}`} />

                            <text y="5" textAnchor="middle" className={`text-sm font-bold ${v.isTarget ? 'fill-red-600 font-black' : 'fill-slate-600'}`}>
                                {v.text}
                            </text>
                        </g>
                    </g>
                ))}
            </g>
        </svg>
    );
};

export default PythagoreSystem;