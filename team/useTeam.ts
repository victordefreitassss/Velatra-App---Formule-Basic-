import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../firebase';
import type { AppState } from '../types';
import type { TeamResult } from './teamModel';
export function useTeam(state: AppState, allowed: boolean) {
  const scope=JSON.stringify([state.user?.firebaseUid,state.user?.role,state.user?.clubId,state.currentClub?.id,state.currentClub?.accountType,state.currentClub?.ownerId,state.currentClub?.isActive,allowed]);
  const [view,setView]=useState<{scope:string;result:TeamResult|null;loading:boolean;error:string|null}>({scope:'',result:null,loading:true,error:null});
  const generation=useRef(0), controller=useRef<AbortController|null>(null);
  const refresh=useCallback(async()=>{
    const current=++generation.current;controller.current?.abort();
    setView({scope,result:null,loading:allowed,error:null});
    if(!allowed)return;
    controller.current=new AbortController();
    try {
      const response=await apiFetch('/api/team',{signal:controller.current.signal});
      const result=await response.json();
      if(!response.ok)throw Error(result.error||'L’équipe est indisponible.');
      if(result.clubId!==state.user?.clubId || !Array.isArray(result.coaches) || !Array.isArray(result.members) || result.scope!==(state.user?.role==='coach'?'self':'tenant'))throw Error('Les données de cette équipe ne sont pas disponibles.');
      if(current===generation.current)setView({scope,result,loading:false,error:null});
    } catch(error:unknown){if(current===generation.current&&(error as Error).name!=='AbortError')setView({scope,result:null,loading:false,error:(error as Error).message});}
  },[scope]);
  useEffect(()=>{void refresh();const onFocus=()=>void refresh(),timer=window.setInterval(onFocus,60000);window.addEventListener('focus',onFocus);return()=>{generation.current++;controller.current?.abort();clearInterval(timer);window.removeEventListener('focus',onFocus);};},[refresh]);
  const source=useRef({scope,users:state.users});
  useEffect(()=>{const previous=source.current;source.current={scope,users:state.users};if(previous.scope!==scope||previous.users===state.users)return;const timer=setTimeout(()=>void refresh(),400);return()=>clearTimeout(timer);},[state.users,refresh]);
  return {...(view.scope===scope?view:{result:null,loading:allowed,error:null}),refresh};
}
