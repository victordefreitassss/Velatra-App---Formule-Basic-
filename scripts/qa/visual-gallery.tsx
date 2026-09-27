import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { VelatraMascot, type VelatraMascotState } from '../../components/VelatraMascot';
// Local fixture only: neither an application route nor a production build entrypoint.
if (!import.meta.env.DEV || !['localhost', '127.0.0.1'].includes(location.hostname)) throw new Error('Local QA only');
const states: VelatraMascotState[] = ['idle', 'wave', 'thinking', 'success', 'error'];
const sizes = [54, 74, 90, 112, 150, 190];
function Gallery() {
  const [dark, setDark] = useState(false);
  const [replay, setReplay] = useState(0);
  return <main style={{padding:24,fontFamily:'Inter,system-ui',color:dark?'#fff':'#17251c',background:dark?'#173f2e':'#f7f8f2',minHeight:'100vh'}}>
    <h1>Compagnon Velatra · pack officiel v2</h1>
    <p>Images originales transparentes · object-contain · aucun recadrage</p>
    <div style={{display:'flex',gap:16,margin:'24px 0',flexWrap:'wrap'}}>
      <button onClick={()=>setDark(!dark)} style={{padding:12,border:'1px solid',borderRadius:8}}>Fond {dark?'clair':'sombre'}</button>
      <button onClick={()=>setReplay(replay+1)} style={{padding:12,border:'1px solid',borderRadius:8}}>Rejouer les animations</button>
    </div>
    {states.map(state=><section key={`${state}-${replay}`} style={{marginBottom:36}}>
      <h2 style={{fontWeight:700,marginBottom:16}}>{state}</h2>
      <div style={{display:'flex',gap:28,alignItems:'end',flexWrap:'wrap'}}>{sizes.map(size=><figure key={size} style={{margin:0,display:'grid',justifyItems:'center',gap:12}}>
        <VelatraMascot state={state} size={size} interactive={false}/><figcaption>{size} px</figcaption>
      </figure>)}</div>
    </section>)}
    <section><h2>Interaction clavier / souris</h2><VelatraMascot size={112} interactive ariaLabel="Saluer le compagnon Velatra"/></section>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Gallery/>);
