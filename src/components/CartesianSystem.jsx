import React, { useMemo } from 'react';

const CartesianSystem = ({
    f,
    xMin = -5,
    xMax = 5,
    yMin = -5,
    yMax = 5,
    width = 400,
    height = 400,
    highlightPoints = [],
    showGrid = true,
    onClick = null
}) => {

    // --- 1. FONCTIONS DE MAPPING ---
    // Math -> SVG (Affichage)
    const mapX = (x) => ((x - xMin) / (xMax - xMin)) * width;
    const mapY = (y) => height - ((y - yMin) / (yMax - yMin)) * height;

    // SVG -> Math (Clic)
    const invMapX = (px) => xMin + (px / width) * (xMax - xMin);
    const invMapY = (py) => yMin + ((height - py) / height) * (yMax - yMin);

    // --- 2. GESTION DU CLIC (CORRIGÉE) ---
    const handleSvgClick = (e) => {
        if (!onClick) return;

        // 1. Récupérer la taille réelle affichée sur l'écran
        const rect = e.currentTarget.getBoundingClientRect();

        // 2. Calculer la position de la souris dans le carré de l'élément (en pixels écran)
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // 3. ✨ MAGIE ✨ : Appliquer le ratio d'échelle (ViewBox / Taille Écran)
        // Si l'image est affichée en 300px mais que le SVG fait 400px interne, il faut multiplier par 400/300
        const scaleX = width / rect.width;
        const scaleY = height / rect.height;

        const svgX = clickX * scaleX;
        const svgY = clickY * scaleY;

        // 4. Convertir en maths
        const mathX = invMapX(svgX);
        const mathY = invMapY(svgY);

        onClick({ x: mathX, y: mathY });
    };

    // --- 3. GÉNÉRATION COURBE ---
    const pathData = useMemo(() => {
        if (!f) return "";
        let path = "";
        const step = (xMax - xMin) / (width / 2);
        let penDown = false;

        for (let x = xMin; x <= xMax; x += step) {
            const y = f(x);
            // On gère les discontinuités ou les sorties de cadre
            if (y >= yMin * 2 && y <= yMax * 2) {
                const px = mapX(x);
                const py = mapY(y);
                path += `${penDown ? 'L' : 'M'} ${px.toFixed(1)} ${py.toFixed(1)} `;
                penDown = true;
            } else {
                penDown = false; // On lève le crayon si hors cadre
            }
        }
        return path;
    }, [f, xMin, xMax, yMin, yMax, width, height]);

    // --- RENDU ---
    const ticksX = Array.from({ length: xMax - xMin + 1 }, (_, i) => xMin + i);
    const ticksY = Array.from({ length: yMax - yMin + 1 }, (_, i) => yMin + i);

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            className={`w-full h-auto bg-white rounded-lg shadow-inner select-none border border-slate-200 ${onClick ? 'cursor-crosshair' : ''}`}
            onClick={handleSvgClick}
        >
            {showGrid && (
                <g className="stroke-slate-200" strokeWidth="1">
                    {ticksX.map(x => <line key={`gx-${x}`} x1={mapX(x)} y1={0} x2={mapX(x)} y2={height} vectorEffect="non-scaling-stroke" />)}
                    {ticksY.map(y => <line key={`gy-${y}`} x1={0} y1={mapY(y)} x2={width} y2={mapY(y)} vectorEffect="non-scaling-stroke" />)}
                </g>
            )}

            <g className="stroke-slate-800" strokeWidth="2">
                <line x1={0} y1={mapY(0)} x2={width} y2={mapY(0)} />
                <line x1={mapX(0)} y1={0} x2={mapX(0)} y2={height} />
            </g>

            <g className="text-[10px] fill-slate-500 font-mono pointer-events-none">
                {ticksX.map(x => x !== 0 && <text key={`tx-${x}`} x={mapX(x)} y={mapY(0) + 15} textAnchor="middle">{x}</text>)}
                {ticksY.map(y => y !== 0 && <text key={`ty-${y}`} x={mapX(0) - 5} y={mapY(y) + 4} textAnchor="end">{y}</text>)}
                <text x={mapX(0) - 5} y={mapY(0) + 15} className="font-bold fill-slate-700">0</text>
            </g>

            <path d={pathData} fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none" />

            {highlightPoints.map((pt, i) => {
                const px = mapX(pt.x);
                const py = mapY(pt.y);
                const color = pt.color || "#ef4444";
                return (
                    <g key={i} className="pointer-events-none">
                        {(pt.dashed) && (
                            <path d={`M ${px} ${py} L ${px} ${mapY(0)} M ${px} ${py} L ${mapX(0)} ${py}`} stroke={color} strokeWidth="1" strokeDasharray="4,2" opacity="0.6" />
                        )}
                        {pt.shape === 'cross' ? (
                            <g stroke={color} strokeWidth="3" strokeLinecap="round">
                                <line x1={px - 4} y1={py - 4} x2={px + 4} y2={py + 4} />
                                <line x1={px - 4} y1={py + 4} x2={px + 4} y2={py - 4} />
                            </g>
                        ) : (
                            <circle cx={px} cy={py} r="5" fill={color} stroke="white" strokeWidth="2" />
                        )}
                    </g>
                );
            })}
        </svg>
    );
};

export default CartesianSystem;