import jsPDF from 'jspdf';
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
  let pageNumber = 1;

  for (let dIndex = 0; dIndex < program.days.length; dIndex++) {
    const day = program.days[dIndex];
    if (dIndex > 0) doc.addPage();
    let y = 0;

    // --- DAY HEADER (Black Box at top) ---
    doc.setFillColor(15, 15, 15);
    doc.rect(0, 0, 210, 80, 'F');
    
    // Add an image for the header if we have one from the first exercise
    let headerImageBase64 = null;
    const firstExEntry = day.exercises && day.exercises[0];
    if (firstExEntry) {
      const firstEx = exercises.find(e => e.id === firstExEntry.exId);
      if (firstEx && firstEx.photo) {
         if (firstEx.photo.startsWith('http')) {
           headerImageBase64 = await getBase64ImageFromUrl(firstEx.photo);
         } else if (firstEx.photo.startsWith('data:image')) {
           headerImageBase64 = firstEx.photo;
         }
      }
    }
    
    y = 35; // Top alignment for title within the black box
    const startXOffset = headerImageBase64 ? 90 : 14;

    if (headerImageBase64) {
      // Draw image on left side spanning part of the header
      // Keep ratio 16:9 approx
      doc.addImage(headerImageBase64, 'JPEG', 0, 0, 80, 80);
    }
    
    // Day title e.g., SEANCE 1 : PECTORAUX
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont('', 'bold');
    const dayTitle = `SÉANCE ${dIndex + 1} : ${day.name ? day.name.toUpperCase() : 'ENTRAÎNEMENT'}`;
    doc.text(dayTitle, startXOffset, y);

    // Green underline for title
    y += 4;
    doc.setFillColor(132, 204, 22); // Lime/emerald green typical of Velatra? Or matching the image #84cc16 approx
    doc.rect(startXOffset, y, 60, 1.5, 'F');
    
    // Warmup text placeholder (or get from notes/day.duration if we had)
    y += 10;
    doc.setFontSize(10);
    doc.setTextColor(132, 204, 22); // Green
    doc.setFont('', 'bold');
    doc.text(`ÉCHAUFFEMENT : 5 MIN DE CARDIO`.toUpperCase(), startXOffset, y);
    y += 6;
    doc.text(`2 MIN ENTRE CHAQUE EXERCICE`.toUpperCase(), startXOffset, y);
    
    y = 80;

    // --- INSTRUCTIONS ---
    doc.setFillColor(15, 15, 15); // Continuing black background for a bit
    doc.rect(0, 80, 210, 30, 'F');
    
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFont('', 'normal');
    const introText = "Avant de commencer votre séance, veillez à regarder la vidéo de l'exercice en cliquant\nsur l'image pour visualiser les mouvements ou les techniques d'intensification.\n\nBonne séance";
    doc.text(introText, 14, y + 10);
    
    y += 35;

    // Set white background for the rest
    if (day.exercises && day.exercises.length > 0) {
      for (let eIndex = 0; eIndex < day.exercises.length; eIndex++) {
        const exEntry = day.exercises[eIndex];
        const exDef = exercises.find(e => e.id === exEntry.exId);
        
        // Page break logic inside a day if many exercises
        if (y > 270) {
          doc.addPage();
          y = 20;
        }

        const orderText = eIndex === 0 ? "1ER" : `${eIndex + 1}ÈME`;
        const startX = 14;
        
        const imageWidth = 25;
        const imageHeight = 15;
        const imageStartX = startX;
        const orderStartX = startX + imageWidth + 6;
        
        // 1. Exercise image (if available)
        if (exDef && exDef.photo) {
           let b64 = null;
           if (exDef.photo.startsWith('http')) {
             b64 = await getBase64ImageFromUrl(exDef.photo);
           } else if (exDef.photo.startsWith('data:image')) {
             b64 = exDef.photo;
           }
           
           if (b64) {
             doc.addImage(b64, 'JPEG', imageStartX, y, imageWidth, imageHeight);
           }
        }
        
        // 2. Order bar and text
        doc.setFillColor(100, 116, 139); // slate gray for the small top bar
        doc.rect(orderStartX + 1, y, 12, 1.5, 'F');
        doc.setFontSize(12);
        doc.setTextColor(100, 116, 139);
        doc.setFont('', 'bold');
        doc.text(orderText, orderStartX, y + 10);
        
        const detailsStartX = orderStartX + 16;
        
        // 3. Exercise Name
        doc.setFontSize(11);
        doc.setTextColor(71, 85, 105); // slate-600
        doc.setFont('', 'bold');
        let exName = exDef?.name || 'Exercice inconnu';
        if (exEntry.notes) exName += " (TECHNIQUE)";
        doc.text(exName.toUpperCase(), detailsStartX, y + 4);
        
        // 4. Notes/Technique specs
        let notesY = y + 8;
        if (exEntry.notes) {
          doc.setFontSize(9);
          doc.setTextColor(148, 163, 184); // slate-400
          doc.setFont('', 'italic');
          doc.text(exEntry.notes, detailsStartX, notesY);
          notesY += 4;
        }
        
        // 5. Sets | Reps | Rest structure
        // E.g., "3 séries | 15 réps | 1min30 de repos"
        doc.setFontSize(9.5);
        doc.setTextColor(15, 15, 15);
        doc.setFont('', 'bold');
        
        let detailsText = '';
        if (exEntry.sets) detailsText += `${exEntry.sets} séries`;
        if (exEntry.reps) detailsText += (detailsText ? ' | ' : '') + `${exEntry.reps} réps`;
        if (exEntry.rest) detailsText += (detailsText ? ' | ' : '') + `${exEntry.rest} de repos`;
        
        if (!detailsText) detailsText = '-';
        doc.text(detailsText, detailsStartX, notesY + 1);

        // Thin separator line
        y += 22; // Next item y
        doc.setDrawColor(132, 204, 22); // Greenish line
        doc.line(detailsStartX, y - 4, 196, y - 4);
      }
    } else {
      doc.setFontSize(12);
      doc.setTextColor(150, 150, 150);
      doc.text("Jour de repos", 14, y + 20);
    }
  }

  // Footer for all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(0, 0, 0); // Black bottom bar
    doc.rect(0, 287, 210, 10, 'F');
    doc.setFontSize(6);
    doc.setTextColor(255, 255, 255);
    doc.setFont('', 'normal');
    doc.text("Tous droits réservés. Toute reproduction est interdite sans l'autorisation de l'auteur", 105, 292, { align: 'center' });
  }

  doc.save(`Programme-${program.name.replace(/\s+/g, '_')}.pdf`);
};

export const exportNutritionToPDF = (plan: NutritionPlan, club?: ClubInfo | null) => {
  const doc = new jsPDF();
  let y = 0;

  // --- NUTRITION HEADER (Black Box at top) ---
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 0, 210, 80, 'F');
  
  y = 35; // Top alignment for title within the black box
  const startXOffset = 14;

  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.setFont('', 'bold');
  const planTitle = `PLAN ALIMENTAIRE`;
  doc.text(planTitle, startXOffset, y);

  // Green underline for title
  y += 4;
  doc.setFillColor(132, 204, 22);
  doc.rect(startXOffset, y, 60, 1.5, 'F');
  
  // Macros text
  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(132, 204, 22);
  doc.setFont('', 'bold');
  doc.text(`OBJECTIF : ${plan.goal.toUpperCase()}`, startXOffset, y);
  y += 6;
  doc.text(`${plan.targetCalories} KCAL | PROT: ${plan.protein}g | GLU: ${plan.carbs}g | LIP: ${plan.fat}g`, startXOffset, y);
  
  y = 80;

  // --- INSTRUCTIONS ---
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 80, 210, 30, 'F');
  
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.setFont('', 'normal');
  const introText = "Veuillez respecter les quantités indiquées. Vous pouvez intervertir l'ordre des repas\nsi besoin, mais essayez de garder la répartition des macronutriments sur la journée.\n\nBon appétit";
  doc.text(introText, 14, y + 10);
  
  y += 35;

  if (plan.meals && plan.meals.length > 0) {
    for (let mIndex = 0; mIndex < plan.meals.length; mIndex++) {
      const meal = plan.meals[mIndex];
      
      // Page break logic
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      const orderText = `REPAS ${mIndex + 1}`;
      const startX = 14;
      
      // 1. Order bar and text
      doc.setFillColor(100, 116, 139); // slate gray for the small top bar
      doc.rect(startX + 1, y, 12, 1.5, 'F');
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139);
      doc.setFont('', 'bold');
      doc.text(orderText, startX, y + 10);
      
      const detailsStartX = startX + 24; // Align without image
      
      // 2. Meal Name
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.setFont('', 'bold');
      doc.text(meal.name.toUpperCase(), detailsStartX, y + 4);
      
      // 3. Macros specs
      let notesY = y + 8;
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.setFont('', 'italic');
      doc.text(`${meal.calories || 0} kcal | P: ${meal.protein || 0}g | G: ${meal.carbs || 0}g | L: ${meal.fat || 0}g`, detailsStartX, notesY);
      notesY += 4;
      
      // 4. Description
      doc.setFontSize(9.5);
      doc.setTextColor(15, 15, 15);
      doc.setFont('', 'bold');
      
      if (meal.description) {
         const splitText = doc.splitTextToSize(meal.description, 160);
         doc.text(splitText, detailsStartX, notesY + 1);
         notesY += splitText.length * 4;
      } else {
         doc.text("-", detailsStartX, notesY + 1);
      }

      // Thin separator line
      y = notesY + 12; 
      doc.setDrawColor(132, 204, 22); // Greenish line
      doc.line(detailsStartX, y - 4, 196, y - 4);
    }
  }

  // Shopping List
  if (plan.liste_courses && plan.liste_courses.length > 0) {
    if (y > 220) {
      doc.addPage();
      y = 20;
    } else {
      y += 10;
    }
    
    // Header
    doc.setFillColor(132, 204, 22);
    doc.rect(14, y, 182, 8, 'F');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.setFont('', 'bold');
    doc.text('LISTE DE COURSES', 18, y + 6);
    doc.setFont('', 'normal');
    
    y += 16;
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    
    for (const item of plan.liste_courses) {
       if (y > 280) {
          doc.addPage();
          y = 20;
       }
       doc.text(`• ${item.name}`, 18, y);
       y += 6;
    }
  }

  // Footer for all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(0, 0, 0); // Black bottom bar
    doc.rect(0, 287, 210, 10, 'F');
    doc.setFontSize(6);
    doc.setTextColor(255, 255, 255);
    doc.setFont('', 'normal');
    doc.text("Tous droits réservés. Toute reproduction est interdite sans l'autorisation de l'auteur", 105, 292, { align: 'center' });
  }

  doc.save(`Nutrition-${plan.goal.replace(/\s+/g, '_')}.pdf`);
};
