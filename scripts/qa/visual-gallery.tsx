import React from 'react';
import { createRoot } from 'react-dom/client';
import { VelatraMascot } from '../../components/VelatraMascot';
// Local visual fixture. Not an application route and not included in the production entrypoint.
if (!import.meta.env.DEV || !['localhost', '127.0.0.1'].includes(location.hostname)) throw new Error('Local QA only');
createRoot(document.getElementById('root')!).render(<main style={{padding:32,fontFamily:'Inter,system-ui',color:'#17251c',background:'#f7f8f2',minHeight:'100vh'}}><h1>Compagnon Velatra · échelles réelles</h1><p>Repos statique · symbole et personnage existants conservés</p><div style={{display:'flex',gap:32,alignItems:'end',flexWrap:'wrap'}}>{[54,74,82,90,112,118,190].map(size=><figure key={size} style={{margin:0,display:'grid',justifyItems:'center',gap:16}}><VelatraMascot size={size} interactive={false}/><figcaption>{size} px</figcaption></figure>)}</div></main>);
