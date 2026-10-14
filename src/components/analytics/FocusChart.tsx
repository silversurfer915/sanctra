import { useId } from 'react';
import { formatDurationHuman } from '../../utils/time.ts';
export function FocusChart({values,labels,title}:{values:number[];labels:string[];title:string}) {
  const id=useId().replaceAll(':','');
  const max=Math.max(600,...values)*1.15;
  const width=600,height=210,left=48,right=12,top=16,bottom=32;
  const x=(i:number)=>left+i*(width-left-right)/Math.max(1,values.length-1);
  const y=(value:number)=>height-bottom-value/max*(height-top-bottom);
  const points=values.map((v,i)=>`${x(i)},${y(v)}`).join(' ');
  return <div className="mt-5"><svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible" role="img" aria-label={title}>
    <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--sanctra-sage)" stopOpacity=".3"/><stop offset="100%" stopColor="var(--sanctra-sage)" stopOpacity=".02"/></linearGradient></defs>
    {[0,.25,.5,.75,1].map(f=><g key={f}><line x1={left} x2={width-right} y1={y(max*f)} y2={y(max*f)} stroke="currentColor" opacity=".1"/><text x={left-8} y={y(max*f)+4} textAnchor="end" fill="currentColor" fontSize="10" opacity=".8">{Math.round(max*f/60)}m</text></g>)}
    <polygon points={`${left},${height-bottom} ${points} ${x(values.length-1)},${height-bottom}`} fill={`url(#${id})`}/>
    <polyline points={points} fill="none" stroke="var(--sanctra-sage)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
    {values.map((v,i)=><g key={i}><circle cx={x(i)} cy={y(v)} r={v>0?3.5:2} fill="var(--sanctra-sage)" opacity={v>0?1:.35}><title>{`${labels[i]} · ${formatDurationHuman(Math.round(v))}`}</title></circle>{(values.length<=7||i===0||i===values.length-1||i%Math.ceil(values.length/6)===0)&&<text x={x(i)} y={height-8} textAnchor="middle" fill="currentColor" opacity=".8" fontSize="10">{labels[i]}</text>}</g>)}
  </svg>{!values.some(Boolean)&&<p className="text-xs text-slate-300 text-center mt-2">No saved focus in this range yet.</p>}</div>;
}
export function GoalRing({percent,label}:{percent:number;label:string}) {
  const fraction=Math.max(0,Math.min(100,percent));
  return <div className="goal-ring relative w-28 h-28 shrink-0"><svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" aria-hidden="true"><circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeOpacity=".08" strokeWidth="7"/>{fraction>0&&<circle cx="50" cy="50" r="42" fill="none" stroke="var(--sanctra-sage)" strokeWidth="7" strokeLinecap="round" pathLength="100" strokeDasharray={`${fraction} 100`}/>}</svg><div className="absolute inset-0 flex flex-col items-center justify-center"><strong className="text-lg">{Math.round(fraction)}%</strong><span className="text-[9px] text-slate-300">{label}</span></div></div>;
}
