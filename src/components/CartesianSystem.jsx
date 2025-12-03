import React, { useMemo } from 'react';

const CartesianSystem = ({
    f,              // La fonction JS : x => y
    xMin = -5,
    xMax = 5,
    yMin = -5,
    yMax = 5,
    width = 400,    // Largeur SVG
    height = 400,   // Hauteur SVG
    highlightPoints = [], // Points à afficher [{x, y, label, color, dashed}]
    showGrid = true
}) => {

    // --- FONCTIONS DE MAPPING (Math -> Pixel) ---
    // X: de gauche (0) à droite (width)
    const mapX = (x) => ((x - xMin) / (xMax - xMin)) * width;
    // Y: de bas (height) en haut (0) -> Inversion car SVG y=0 est en haut
    const mapY = (y) => height - ((y - yMin) / (yMax - yMin)) * height;

    // --- GÉNÉRATION DE LA COURBE ---
    const pathData = useMemo(() => {
        if (!f) return "";
        let path = "";
        const step = (xMax - xMin) / width; // Un point par pixel horizontal pour la précision

        for (let x = xMin; x <= xMax; x += step) {
            const y = f(x);
            // On ne dessine que si on est dans le cadre (avec une petite marge)
            if (y >= yMin * 1.5 && y <= yMax * 1.5) {
                const px = mapX(x);
                const py = mapY(y);
                path += `${path ? 'L' : 'M'} ${px.toFixed(1)} ${py.toFixed(1)} `;
            }
        }
        return path;
    }, [f, xMin, xMax, yMin, yMax, width, height]);

    // --- GÉNÉRATION DE LA GRILLE ET AXES ---
    const ticksX = Array.from({ length: xMax - xMin + 1 }, (_, i) => xMin + i);
    const ticksY = Array.from({ length: yMax - yMin + 1 }, (_, i) => yMin + i);

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto bg-white rounded-lg shadow-inner select-none border border-slate-200">
            {/* 1. GRILLE */}
            {showGrid && (
                <g className="stroke-slate-200" strokeWidth="1">
                    {ticksX.map(x => (
                        <line key={`gx-${x}`} x1={mapX(x)} y1={0} x2={mapX(x)} y2={height} />
                    ))}
                    {ticksY.map(y => (
                        <line key={`gy-${y}`} x1={0} y1={mapY(y)} x2={width} y2={mapY(y)} />
                    ))}
                </g>
            )}

            {/* 2. AXES PRINCIPAUX (X et Y) */}
            <g className="stroke-slate-800" strokeWidth="2">
                {/* Axe X */}
                <line x1={0} y1={mapY(0)} x2={width} y2={mapY(0)} />
                {/* Axe Y */}
                <line x1={mapX(0)} y1={0} x2={mapX(0)} y2={height} />
            </g>

            {/* 3. GRADUATIONS (Chiffres) */}
            <g className="text-[10px] fill-slate-500 font-mono">
                {ticksX.map(x => x !== 0 && (
                    <text key={`tx-${x}`} x={mapX(x)} y={mapY(0) + 15} textAnchor="middle">{x}</text>
                ))}
                {ticksY.map(y => y !== 0 && (
                    <text key={`ty-${y}`} x={mapX(0) - 5} y={mapY(y) + 4} textAnchor="end">{y}</text>
                ))}
                <text x={mapX(0) - 5} y={mapY(0) + 15} className="font-bold fill-slate-700">0</text>
            </g>

            {/* 4. LA COURBE DE LA FONCTION */}
            <path d={pathData} fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

            {/* 5. POINTS ET LIGNES DE LECTURE (Feedback) */}
            {highlightPoints.map((pt, i) => {
                const px = mapX(pt.x);
                const py = mapY(pt.y);
                const p0x = mapX(0);
                const p0y = mapY(0);

                return (
                    <g key={i}>
                        {/* Lignes en pointillés vers les axes (Projection) */}
                        {pt.dashed && (
                            <path
                                d={`M ${px} ${py} L ${px} ${p0y} M ${px} ${py} L ${p0x} ${py}`}
                                stroke={pt.color || "#ef4444"}
                                strokeWidth="2"
                                strokeDasharray="5,5"
                            />
                        )}
                        {/* Le point */}
                        <circle cx={px} cy={py} r="5" fill={pt.color || "#ef4444"} stroke="white" strokeWidth="2" />
                    </g>
                );
            })}
        </svg>
    );
};

export default CartesianSystem;