import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Program, NutritionPlan, Exercise, ClubInfo } from '../types';

const getBase64ImageFromUrl = async (imageUrl: string): Promise<string | null> => {
  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    return null;
  }
};

export const exportProgramToPDF = async (program: Program, exercises: Exercise[], club?: ClubInfo | null, memberName?: string) => {
  const doc = new jsPDF();
  let y = 20;

  // Modern Header Box
  doc.setFillColor(20, 20, 20); // Dark sleek background
  doc.rect(0, 0, 210, 45, 'F');
  
  doc.setFontSize(26);
  doc.setTextColor(255, 255, 255);
  doc.text(club?.name?.toUpperCase() || 'VELATRA', 14, 25);
  
  doc.setFontSize(14);
  doc.setTextColor(16, 185, 129); // emerald-500 accents
  doc.text(`PROGRAMME D'ENTRAÎNEMENT`, 14, 35);
  
  y = 60;

  doc.setFontSize(20);
  doc.setTextColor(20, 20, 20);
  doc.text(program.name.toUpperCase(), 14, y);
  
  if (memberName) {
     y += 8;
     doc.setFontSize(12);
     doc.setTextColor(100, 100, 100);
     doc.text(`Athlète: ${memberName}`, 14, y);
  }

  y += 15;

  program.days.forEach((day, index) => {
    // Check if we need a new page
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    // Day Header
    doc.setFillColor(245, 245, 245);
    doc.rect(14, y - 6, 182, 12, 'F');
    doc.setFontSize(12);
    doc.setTextColor(16, 185, 129);
    doc.setFont('', 'bold');
    doc.text((day.name || `Jour ${index + 1}`).toUpperCase(), 16, y+2);
    doc.setFont('', 'normal');
    y += 15;

    if (day.exercises && day.exercises.length > 0) {
      const tableData = day.exercises.map(ex => {
        const exerciseDef = exercises.find(e => e.id === ex.exId);
        return [
          exerciseDef?.name || 'Exercice inconnu',
          ex.sets ? `${ex.sets}` : '-',
          ex.reps ? `${ex.reps}` : '-',
          ex.rest ? `${ex.rest}s` : '-',
          ex.notes || '-'
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [['EXERCICE', 'SÉRIES', 'RÉPÉTITIONS', 'REPOS', 'NOTES']],
        body: tableData,
        theme: 'plain',
        headStyles: { fillColor: [255, 255, 255], textColor: [100,100,100], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { textColor: [40,40,40], fontSize: 10 },
        alternateRowStyles: { fillColor: [250,250,250] },
        margin: { top: 10, left: 14, right: 14 },
      });
      
      // Update Y Position after table
      y = (doc as any).lastAutoTable.finalY + 20;
    } else {
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text("Jour de repos", 16, y);
      y += 20;
    }
  });

  // Unique Exercises Appendix
  const usedExerciseIds = [
    ...new Set(
      program.days.flatMap(day => (day.exercises || []).map(ex => ex.exId))
    )
  ];
  const usedExercises = usedExerciseIds.map(id => exercises.find(e => e.id === id)).filter(Boolean) as Exercise[];

  if (usedExercises.length > 0) {
    doc.addPage();
    y = 20;
    
    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('DÉTAIL DES EXERCICES & CONSEILS', 14, 20);
    
    y = 40;

    for (const ex of usedExercises) {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }
      
      const relatedEntries = program.days.flatMap(d => d.exercises || []).filter(e => e.exId === ex.id);
      const allNotes = [...new Set(relatedEntries.map(e => e.notes).filter(Boolean))];

      doc.setFontSize(14);
      doc.setTextColor(16, 185, 129);
      doc.setFont('', 'bold');
      doc.text(ex.name.toUpperCase(), 14, y);
      doc.setFont('', 'normal');
      y += 6;

      if (ex.photo && ex.photo.startsWith('http')) {
        const base64 = await getBase64ImageFromUrl(ex.photo);
        if (base64) {
          doc.addImage(base64, 'JPEG', 14, y, 40, 40);
        }
      }
      
      let textX = 60;
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      doc.text(`Catégorie : ${ex.cat}`, textX, y + 4);
      doc.text(`Équipement : ${ex.equip}`, textX, y + 10);
      
      if (allNotes.length > 0) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("Conseils du coach :", textX, y + 20);
        doc.setTextColor(40, 40, 40);
        doc.setFont('', 'italic');
        
        let noteY = y + 25;
        for (const note of allNotes) {
           const splitNote = doc.splitTextToSize(`• ${note}`, 130);
           doc.text(splitNote, textX, noteY);
           noteY += splitNote.length * 5;
        }
        doc.setFont('', 'normal');
      }

      y += 50; 
      doc.setDrawColor(230, 230, 230);
      doc.line(14, y - 5, 196, y - 5);
    }
  }

  doc.save(`Programme-${program.name.replace(/\s+/g, '_')}.pdf`);
};

export const exportNutritionToPDF = (plan: NutritionPlan, club?: ClubInfo | null) => {
  const doc = new jsPDF();
  let y = 20;

  // Modern Header Box
  doc.setFillColor(20, 20, 20);
  doc.rect(0, 0, 210, 45, 'F');
  
  doc.setFontSize(26);
  doc.setTextColor(255, 255, 255);
  doc.text(club?.name?.toUpperCase() || 'VELATRA', 14, 25);
  
  doc.setFontSize(14);
  doc.setTextColor(16, 185, 129);
  doc.text(`PLAN ALIMENTAIRE`, 14, 35);
  
  y = 60;

  // Summary Metrics Board
  doc.setFillColor(245, 245, 245);
  doc.rect(14, y, 182, 35, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("OBJECTIF", 20, y + 10);
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.setFont('', 'bold');
  doc.text(plan.goal.toUpperCase(), 20, y + 18);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('', 'normal');
  doc.text("CALORIES", 70, y + 10);
  doc.setFontSize(18);
  doc.setTextColor(16, 185, 129);
  doc.setFont('', 'bold');
  doc.text(`${plan.targetCalories} kcal`, 70, y + 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('', 'normal');
  doc.text("MACROS (P / G / L)", 130, y + 10);
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.setFont('', 'bold');
  doc.text(`${plan.protein}g / ${plan.carbs}g / ${plan.fat}g`, 130, y + 18);
  
  doc.setFont('', 'normal');
  y += 55;

  if (plan.meals && plan.meals.length > 0) {
    plan.meals.forEach((meal) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(20, 20, 20);
      doc.setFont('', 'bold');
      doc.text(meal.name.toUpperCase(), 14, y);
      
      const metricsText = `${meal.calories || 0} kcal | P: ${meal.protein || 0}g | G: ${meal.carbs || 0}g | L: ${meal.fat || 0}g`;
      doc.setFontSize(10);
      doc.setTextColor(16, 185, 129);
      doc.text(metricsText, 14, y + 6);
      doc.setFont('', 'normal');
      
      y += 12;

      if (meal.description) {
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        const splitText = doc.splitTextToSize(meal.description, 182);
        doc.text(splitText, 14, y);
        y += (splitText.length * 5) + 12;
      } else {
        y += 6;
      }
    });
  }

  // Shopping List
  if (plan.liste_courses && plan.liste_courses.length > 0) {
    if (y > 200) {
      doc.addPage();
      y = 30;
    } else {
      y += 15;
    }
    
    // Day Header
    doc.setFillColor(16, 185, 129);
    doc.rect(14, y - 6, 182, 10, 'F');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.setFont('', 'bold');
    doc.text('LISTE DE COURSES', 16, y + 1);
    doc.setFont('', 'normal');
    
    y += 10;

    const listData = plan.liste_courses.map(item => [`• ${item.name}`]);
    autoTable(doc, {
      startY: y,
      body: listData,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2, textColor: [80, 80, 80] },
      margin: { left: 14 }
    });
  }

  doc.save(`Nutrition-${plan.goal.replace(/\s+/g, '_')}.pdf`);
};
