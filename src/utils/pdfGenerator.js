import { toast } from 'react-hot-toast';

const getStudentHTML = (studentObj, compsToPrint, layout, matrixData, chapitresDetails, selectedLevel) => {
    let totalAcquis = 0;
    let totalCount = 0;

    const studentSkills = compsToPrint.map(comp => {
        const cData = matrixData[studentObj.id]?.[comp.id];
        const bilan = cData?.bilan || '⚪';
        let text = "Non évalué";
        let color = "#94a3b8";
        let bgLight = "#f1f5f9";

        if (bilan === '🔴') { text = "Non acquis"; color = "#ef4444"; bgLight = "#fef2f2"; totalCount++; }
        if (bilan === '🟡') { text = "En cours d'acquisition"; color = "#f59e0b"; bgLight = "#fffbeb"; totalCount++; }
        if (bilan === '🟢') { text = "Acquis"; color = "#10b981"; bgLight = "#ecfdf5"; totalCount++; totalAcquis++; }
        if (bilan === '🟩') { text = "Niveau dépassé"; color = "#047857"; bgLight = "#d1fae5"; totalCount++; totalAcquis++; }

        return { ...comp, bilanText: text, color, bgLight };
    });

    const progressPercent = totalCount === 0 ? 0 : Math.round((totalAcquis / totalCount) * 100);
    const today = new Date().toLocaleDateString('fr-FR');
    const groups = {};

    studentSkills.forEach(s => {
        const key = layout === 'DOMAIN' ? s.domaine : s.chapitre;
        if (!groups[key]) {
            const chapTitle = chapitresDetails[s.chapitre]?.titre || s.chapitreNom || "";
            groups[key] = {
                title: layout === 'DOMAIN' ? s.domaine : `Chapitre ${s.chapitre} - ${chapTitle}`,
                items: []
            };
        }
        groups[key].items.push(s);
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => {
        if (layout === 'CHAPTER') return Number(a) - Number(b);
        return a.localeCompare(b);
    });

    let html = `
        <div class="header">
            <div>
                <h1>Bilan de Compétences</h1>
                <h2>Élève : ${studentObj.nom}</h2>
            </div>
            <div class="header-info">
                <p>Édité le <strong>${today}</strong></p>
                <p>Classe : <strong>${studentObj.classe || selectedLevel}</strong></p>
            </div>
        </div>
        <div class="summary-box">
            <div>
                <div class="summary-title">Taux de réussite</div>
                <div style="font-size: 24px; font-weight: 800; color: #0f172a;">${progressPercent}%</div>
                <div style="font-size: 13px; color: #64748b; margin-top: 2px;">Compétences acquises ou dépassées</div>
            </div>
            <div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${progressPercent}%"></div>
                </div>
            </div>
        </div>
    `;

    sortedKeys.forEach(k => {
        html += `<div class="group-title">${groups[k].title}</div>`;
        html += `<table><thead><tr><th width="15%">Code</th><th width="55%">Compétence</th><th width="30%">Statut d'acquisition</th></tr></thead><tbody>`;
        groups[k].items.forEach(comp => {
            html += `
                <tr>
                    <td><span class="code">${comp.code || comp.id}</span></td>
                    <td style="color: #334155; font-weight: 500;">${comp.intitule}</td>
                    <td>
                        <span class="badge" style="background-color: ${comp.bgLight}; color: ${comp.color}; border-color: ${comp.color};">
                            ${comp.bilanText}
                        </span>
                    </td>
                </tr>
            `;
        });
        html += `</tbody></table>`;
    });

    html += `<div class="footer">Document généré automatiquement le ${today} depuis l'espace enseignant.</div>`;
    return html;
};

const getMatrixHTML = (studentsList, compsToPrint, matrixData, selectedLevel) => {
    const today = new Date().toLocaleDateString('fr-FR');
    let html = `
        <div class="header" style="border-bottom:none; margin-bottom:1rem;">
            <div>
                <h1>Grille de Compétences</h1>
                <h2>Niveau : ${selectedLevel}</h2>
            </div>
            <div class="header-info">
                <p>Édité le <strong>${today}</strong></p>
                <p>Élèves : <strong>${studentsList.length}</strong> | Compétences : <strong>${compsToPrint.length}</strong></p>
            </div>
        </div>
        <table class="matrix-table">
            <thead>
                <tr>
                    <th class="matrix-stu-header">Élèves</th>
    `;

    compsToPrint.forEach(c => {
        html += `<th class="matrix-col-header"><div class="vertical-text">${c.code || c.id}</div></th>`;
    });

    html += `</tr></thead><tbody>`;

    studentsList.forEach(stu => {
        html += `<tr><td class="matrix-stu-name">${stu.nom}</td>`;
        compsToPrint.forEach(comp => {
            const cData = matrixData[stu.id]?.[comp.id];
            const bilan = cData?.bilan || '⚪';
            let color = "#f1f5f9";
            if (bilan === '🔴') color = "#ef4444";
            if (bilan === '🟡') color = "#f59e0b";
            if (bilan === '🟢') color = "#10b981";
            if (bilan === '🟩') color = "#047857";
            html += `<td style="background-color: ${color}; border: 1px solid #cbd5e1; width: 22px; height: 22px; padding: 0;"></td>`;
        });
        html += `</tr>`;
    });

    html += `</tbody></table>`;
    html += `
        <div style="margin-top: 20px; display: flex; gap: 15px; font-size: 12px; font-weight: bold; color: #475569; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 5px;"><div style="width:12px; height:12px; background: #f1f5f9; border: 1px solid #cbd5e1;"></div> Non évalué</div>
            <div style="display: flex; align-items: center; gap: 5px;"><div style="width:12px; height:12px; background: #ef4444;"></div> Non acquis</div>
            <div style="display: flex; align-items: center; gap: 5px;"><div style="width:12px; height:12px; background: #f59e0b;"></div> En cours d'acquisition</div>
            <div style="display: flex; align-items: center; gap: 5px;"><div style="width:12px; height:12px; background: #10b981;"></div> Acquis</div>
            <div style="display: flex; align-items: center; gap: 5px;"><div style="width:12px; height:12px; background: #047857;"></div> Niveau dépassé</div>
        </div>
    `;
    return html;
};

export const generateSkillsPDF = ({
    printConfig,
    levelComps,
    visibleStudents,
    matrixData,
    chapitresDetails,
    selectedLevel
}) => {
    if (!printConfig || printConfig.selectedChapters.length === 0) {
        toast.error("Sélectionnez au moins un chapitre à imprimer.");
        return false;
    }

    const { mode, student, layout, selectedChapters } = printConfig;
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
        toast.error("Veuillez autoriser les pop-ups pour pouvoir imprimer.");
        return false;
    }

    const compsToPrint = levelComps.filter(c => selectedChapters.includes(c.chapitre));

    let fullHtml = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <title>Bilan de Compétences</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
                body { font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.5; padding: 2rem; max-width: 900px; margin: 0 auto; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .page-break { page-break-after: always; break-after: page; }
                .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #4f46e5; padding-bottom: 1rem; margin-bottom: 2rem; }
                .header h1 { margin: 0; font-size: 28px; color: #0f172a; font-weight: 800; text-transform: uppercase; letter-spacing: -0.02em; }
                .header h2 { margin: 5px 0 0 0; color: #4f46e5; font-size: 22px; font-weight: 800; }
                .header-info { text-align: right; color: #64748b; font-size: 14px; }
                .header-info p { margin: 2px 0; }
                .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; display: flex; align-items: center; justify-content: space-between;}
                .summary-title { font-weight: 600; font-size: 14px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 5px; }
                .progress-bar-bg { background: #e2e8f0; height: 12px; border-radius: 6px; width: 300px; overflow: hidden; }
                .progress-bar-fill { background: #10b981; height: 100%; border-radius: 6px; }
                .group-title { margin-top: 2rem; margin-bottom: 1rem; font-size: 18px; font-weight: 800; color: #1e293b; padding-left: 10px; border-left: 4px solid #4f46e5; }
                table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 1rem; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
                th, td { padding: 12px 15px; text-align: left; }
                th { background-color: #f8fafc; color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; }
                td { border-bottom: 1px solid #f1f5f9; font-size: 14px; }
                tr:last-child td { border-bottom: none; }
                .code { font-family: ui-monospace, monospace; font-weight: bold; color: #4f46e5; background: #e0e7ff; padding: 3px 6px; border-radius: 4px; font-size: 12px; }
                .badge { padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 12px; display: inline-block; border: 1px solid rgba(0,0,0,0.1); }
                .footer { margin-top: 3rem; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 1rem; }
                .matrix-table { width: auto; max-width: 100%; border-collapse: collapse; margin-top: 1rem; border: 1px solid #cbd5e1; border-radius: 0;}
                .matrix-table th, .matrix-table td { padding: 4px; text-align: center; border: 1px solid #cbd5e1; border-radius: 0; }
                .matrix-stu-header { text-align: left !important; vertical-align: bottom; padding: 10px !important; background: #f8fafc; }
                .matrix-stu-name { text-align: left !important; font-size: 12px; font-weight: 600; white-space: nowrap; padding: 5px 10px !important; }
                .vertical-text { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 10px; max-height: 120px; text-align: left; padding: 5px; font-weight: 800; color: #4f46e5;}
                .matrix-col-header { vertical-align: bottom; width: 25px; background: #f8fafc; border-bottom: 2px solid #cbd5e1 !important; }
                @media print { 
                    body { padding: 0; } 
                    .summary-box { border: 1px solid #cbd5e1; }
                    table { border: 1px solid #cbd5e1; }
                    th { border-bottom: 1px solid #cbd5e1; }
                }
            </style>
        </head>
        <body>
    `;

    if (mode === 'INDIVIDUAL') {
        fullHtml += getStudentHTML(student, compsToPrint, layout, matrixData, chapitresDetails, selectedLevel);
    } else if (mode === 'CLASS') {
        visibleStudents.forEach((stu, idx) => {
            fullHtml += getStudentHTML(stu, compsToPrint, layout, matrixData, chapitresDetails, selectedLevel);
            if (idx < visibleStudents.length - 1) fullHtml += `<div class="page-break"></div>`;
        });
    } else if (mode === 'MATRIX') {
        fullHtml += getMatrixHTML(visibleStudents, compsToPrint, matrixData, selectedLevel);
    }

    fullHtml += `</body></html>`;

    printWindow.document.write(fullHtml);
    printWindow.document.close();

    setTimeout(() => {
        printWindow.print();
    }, 300);

    return true; // Retourne "true" si tout s'est bien passé
};