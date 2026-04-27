const fs = require('fs');

const file = 'pages/MembersPage.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const aboStart = 2333 - 1;
const aboEnd = 2485 - 1;

const evoStart = 2487 - 1;
const evoEnd = 2563 - 1;

const planStart = 2565 - 1;
const planEnd = 2635 - 1;

const scanStart = 2637 - 1;
const scanEnd = 2649 - 1;

const blockAbo = lines.slice(aboStart, aboEnd + 1).join('\n');
const blockEvo = lines.slice(evoStart, evoEnd + 1).join('\n');
const blockPlan = lines.slice(planStart, planEnd + 1).join('\n');
const blockScan = lines.slice(scanStart, scanEnd + 1).join('\n');

// We will blank out lines 2333 to 2649
for (let i = aboStart; i <= scanEnd; i++) {
    lines[i] = "----TO_DELETE----";
}

let code = lines.join('\n');
code = code.replace(/(----TO_DELETE----\n)+/g, "");

const fideliteEndStr = `<div className="text-xl font-black text-emerald-500">{stats.totalSpent}€</div>
                      </div>
                    </div>
                  </div>`;
if (code.includes(fideliteEndStr)) {
    code = code.replace(fideliteEndStr, fideliteEndStr + "\n    " + blockAbo);
    console.log("Injected Abonnement!");
} else {
    console.log("Could not inject Abonnement - Fidelite string not found!");
}

const measurementsStr = `{memberTab === 'measurements' && (
<section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
  <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">Suivi & Mensurations</h3>
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">`;

if (code.includes(measurementsStr)) {
    code = code.replace(measurementsStr, measurementsStr + "\n    " + blockScan + "\n    " + blockEvo);
    console.log("Injected Scan and Evo!");
} else {
    console.log("Could not inject Scan/Evo!");
}

const trainingStr = `{memberTab === 'training' && (
                  <section className="space-y-8">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500"><CalendarIcon size={24} /></div>
                       <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">Historique des Séances</h3>
                    </div>`;

const newTrainingStr = `{memberTab === 'training' && (
                  <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                      ${blockPlan}
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500"><CalendarIcon size={24} /></div>
                       <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">Historique des Séances</h3>
                    </div>`;

if (code.includes(trainingStr)) {
    code = code.replace(trainingStr, newTrainingStr);
    console.log("Injected Plan!");
} else {
    console.log("Could not inject Plan!");
}

fs.writeFileSync('pages/MembersPage.tsx', code);
console.log("Done.");
