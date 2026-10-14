import {useEffect} from 'react';
/** Include sibling dialogs and portals, which cannot inherit the desk container's tokens. */
export function useGlassClarity(value?:number) {
 useEffect(()=>{
  const style=document.documentElement.style;
  const previous=style.getPropertyValue('--sanctra-panel-blur');
  const blur=Math.max(0,Math.min(24,Number.isFinite(value)?value!:12));
  style.setProperty('--sanctra-panel-blur',`${blur}px`);
  return()=>{if(previous)style.setProperty('--sanctra-panel-blur',previous);else style.removeProperty('--sanctra-panel-blur');};
 },[value]);
}
