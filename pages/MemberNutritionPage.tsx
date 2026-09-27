import React from 'react';
import { AppState } from '../types';
import { MemberNutritionView } from '../components/MemberNutritionView';
import { AppleIcon } from '../components/Icons';
export const MemberNutritionPage: React.FC<{state:AppState;showToast:(msg:string,type?:'success'|'error')=>void;setState:React.Dispatch<React.SetStateAction<AppState>>}>=({state,showToast,setState})=>{
 const hasPlan=state.nutritionPlans.some(plan=>Number(plan.memberId)===Number(state.user?.id));
 return hasPlan?<MemberNutritionView state={state} showToast={showToast}/>:<div className="va-member-page"><header><h1>Ma nutrition</h1><p>Un accompagnement adapté à votre quotidien.</p></header><section className="va-member-empty"><AppleIcon/><h2>Votre plan se prépare avec votre coach</h2><p>Aucun plan n’a encore été partagé. Parlez de vos habitudes à votre coach pour préparer la suite.</p><button className="va-member-primary" onClick={()=>setState(p=>({...p,page:'messages'}))}>Écrire à mon coach</button></section><button className="va-member-text-link" onClick={()=>setState(p=>({...p,page:'home'}))}>Retrouver mon suivi du jour →</button></div>;
};
