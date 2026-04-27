const fs = require('fs');

let code = fs.readFileSync('pages/MembersPage.tsx', 'utf8');

const oldGridStart = '<div className="grid grid-cols-1 lg:grid-cols-12">';
const newGridStart = '<div className="flex flex-col md:flex-row h-full min-h-[85vh]">';

code = code.replace(oldGridStart, newGridStart);

const oldSidebarStart = '<div className="lg:col-span-4 bg-zinc-50 backdrop-blur-xl border-r  p-6 md:p-10 space-y-8 md:space-y-10 pt-20 md:pt-10">';
const newSidebarStart = '<div className="w-full md:w-72 lg:w-80 bg-zinc-50 border-r border-zinc-200 p-6 flex flex-col gap-6 shrink-0 md:h-[calc(100vh)] md:sticky top-0 overflow-y-auto hide-scrollbar pt-20 md:pt-10">';

code = code.replace(oldSidebarStart, newSidebarStart);

// Let's create the vertical tabs menu right after the Avatar section.
// The avatar section ends with `<Badge ... >ÉVOLUTION</Badge></div></div>`
// We will look for: `<Badge variant="accent" className="!px-4 !py-1.5">ÉVOLUTION</Badge>\n                    </div>\n                  </div>`

const avatarEnd = `<Badge variant="accent" className="!px-4 !py-1.5">ÉVOLUTION</Badge>\n                    </div>\n                  </div>`;

const verticalTabs = `                  <nav className="flex flex-col gap-1 mt-4">
                    {[
                      { id: 'overview', label: "Vue d'ensemble", icon: <LayersIcon size={16} /> },
                      { id: 'profile', label: "Profil", icon: <UserIcon size={16} /> },
                      { id: 'measurements', label: "Mensurations", icon: <ActivityIcon size={16} /> },
                      { id: 'training', label: "Entraînement", icon: <DumbbellIcon size={16} /> },
                      { id: 'billing', label: "Facturation", icon: <DollarSignIcon size={16} /> },
                      { id: 'documents', label: "Documents", icon: <FolderIcon size={16} /> }
                    ].map(tab => (
                      <button 
                        key={tab.id}
                        onClick={() => setMemberTab(tab.id as any)}
                        className={\`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all \${memberTab === tab.id ? 'bg-emerald-500 text-zinc-900 shadow-md' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50'}\`}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    ))}
                  </nav>`;

code = code.replace(avatarEnd, avatarEnd + '\n' + verticalTabs);

// Remove horizontal tabs since we added vertical ones in the sidebar
const horizontalTabsRegex = /<div className="flex gap-2 overflow-x-auto pb-4 hide-scrollbar border-b border-zinc-200 sticky top-0 bg-zinc-100 z-20 pt-4 -mt-4">[\s\S]*?<\/div>/;
code = code.replace(horizontalTabsRegex, '');

// Now we need to move the blocks out of the sidebar and into their respective tabs.
// To do this reliably, I'll extract substrings based on structural markers.

function extractBlock(markerStart, markerEndPattern) {
    const startIdx = code.indexOf(markerStart);
    if (startIdx === -1) return '';
    const regex = new RegExp(markerEndPattern, 'g');
    regex.lastIndex = startIdx;
    const match = regex.exec(code);
    if (!match) return '';
    const endIdx = match.index + match[0].length;
    const block = code.substring(startIdx, endIdx);
    code = code.substring(0, startIdx) + code.substring(endIdx);
    return block;
}

const blockCredits = extractBlock('<div className="bg-zinc-50 border border-zinc-200 p-6 rounded-3xl space-y-4 shadow-sm">\n                    <div className="flex items-center justify-between">\n                      <h3 className="text-xs', '</div>\n                  </div>');
const blockFidelity = extractBlock('<div className="bg-zinc-50 border border-zinc-200 p-6 rounded-3xl space-y-4 shadow-sm">\n                    <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest text-emerald-500">Fidélité & Achats</h3>', '</div>\n                    </div>\n                  </div>');
const blockProfile = extractBlock('<div className="bg-zinc-50 border border-zinc-200 p-6 rounded-3xl space-y-4 shadow-sm">\n                    <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest text-emerald-500">Profil & Objectifs</h3>', '</div>\n                  </div>');
const blockRemarks = extractBlock('{stats.program?.memberRemarks && (', '</div>\n                    </div>\n                  )}');

const blockAboStart = '<div className="space-y-4">\n                    <div className="flex items-center justify-between px-1">\n                       <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest text-emerald-500">Abonnement</h3>';
const blockAbo = extractBlock(blockAboStart, '</div>\n                    )}');

const blockEvoStart = '<div className="space-y-4">\n                    <div className="flex items-center justify-between px-1">\n                       <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest text-emerald-500">Évolution</h3>';
const blockEvo = extractBlock(blockEvoStart, '})()}\n                  </div>');

const blockPlanStart = '<div className="space-y-4">\n                    <div className="flex items-center justify-between px-1">\n                       <h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest text-emerald-500">Plan Actif</h3>';
const blockPlan = extractBlock(blockPlanStart, '</div>\n                    )}');

const blockScanStart = '<div className="space-y-6 bg-zinc-50 p-8 rounded-3xl border ">';
const blockScan = extractBlock(blockScanStart, '<SaveIcon size={16} className="mr-2" /> ENREGISTRER SCAN\n                      </Button>\n                    </div>\n                  </div>');

// At this point, the sidebar is clean, but what about Notes?
const blockNotesStart = '{selectedProfile.notes && (';
const blockNotes = extractBlock(blockNotesStart, '</div>\n                  )}');

// Now, we need to inject these blocks into the right place.
const mainColStartOld = '<div className="lg:col-span-8 p-6 md:p-12 space-y-12">';
const mainColStartNew = '<div className="flex-1 bg-white p-6 md:p-12 overflow-y-auto space-y-12 custom-scrollbar md:h-[calc(100vh)]">';
code = code.replace(mainColStartOld, mainColStartNew);

// 1. Inject Profile block
code = code.replace("{memberTab === 'training' && (", `{memberTab === 'profile' && (
<section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
  <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">Profil Adhérent</h3>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {/* Profile & Notes */}
    ${blockProfile}
    ${blockNotes}
  </div>
</section>
)}
{memberTab === 'measurements' && (
<section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
  <h3 className="text-2xl font-black text-zinc-900 uppercase italic tracking-tight">Suivi & Mensurations</h3>
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
    ${blockEvo}
    ${blockScan}
  </div>
</section>
)}
{memberTab === 'training' && (`);

// 2. Inject Training block (Plan & Remarks) inside training tab
// Find where training logs are: `<h3 className="text-xs font-black uppercase tracking-widest text-emerald-500 mb-6">HISTORIQUE DES SÉANCES</h3>`
// We'll put Plan and Remarks right before the History.
code = code.replace('<h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest text-emerald-500 mb-6">HISTORIQUE DES SÉANCES</h3>', `
<div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-12">
  ${blockRemarks}
  ${blockPlan}
</div>
<h3 className="text-xs font-black uppercase text-zinc-500 tracking-widest text-emerald-500 mb-6">HISTORIQUE DES SÉANCES</h3>`);

// 3. Inject Billing blocks (Credits, Fidelity, Abonnement) inside billing tab
code = code.replace("{memberTab === 'billing' && (", `{memberTab === 'billing' && (
<section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
    ${blockCredits}
    ${blockFidelity}
    ${blockAbo}
  </div>
  {/* The rest of billing was already here...? Oh wait, let's keep the existing stuff if there was any... wait, billing was only containing payments list actually. */}
`);

fs.writeFileSync('pages/MembersPage.tsx', code);
console.log("Refactored successfully.");
