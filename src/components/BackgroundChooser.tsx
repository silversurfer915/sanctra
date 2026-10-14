import {useState} from 'react';
import {Check,Lock,Search,Film} from 'lucide-react';
import type {UserSettings,WallpaperPreset} from '../types/index.ts';
import {WALLPAPER_PRESETS,resolveWallpaperId} from '../utils/storage.ts';
import {getThemeName,THEME_PALETTES} from '../utils/wallpaperTheme.ts';

const categories=['All','Free','Scenery','Abstract','Video','Weather'] as const;
type Category=typeof categories[number];
export function BackgroundChooser({settings,isPlus,onSelect,onLocked}:{settings:UserSettings;isPlus:boolean;onSelect:(preset:WallpaperPreset)=>void;onLocked:(name:string)=>void}) {
 const [category,setCategory]=useState<Category>('All');
 const [query,setQuery]=useState('');
 const [pending,setPending]=useState<WallpaperPreset|null>(null);
 const selected=WALLPAPER_PRESETS.find(p=>p.id===resolveWallpaperId(settings.activeWallpaperId));
 const palette=THEME_PALETTES[getThemeName(settings.activeWallpaperId)];
 const filtered=WALLPAPER_PRESETS.filter(p=>{
  const matches=category==='All'||(category==='Free'&&!p.isPlusOnly)||(category==='Abstract'&&p.category.includes('Abstract'))||(category==='Video'&&p.type==='motion')||(category==='Weather'&&p.type==='weather')||(category==='Scenery'&&p.type==='scenic'&&!p.category.includes('Abstract'));
  return matches&&`${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase().trim());
 });
 return <section className="background-browser" aria-labelledby="background-browser-title">
  <div className="background-current"><img src={settings.customWallpaperUrl||selected?.thumbnail} alt="Current background"/><div><h3 id="background-browser-title">Background library</h3><p>{settings.customWallpaperUrl?'Custom image':selected?.name}</p><span className="background-palette"><i style={{background:palette.accent}}/> Neutral glass · {getThemeName(settings.activeWallpaperId)} accent</span></div></div>
  <label className="background-search"><Search size={16}/><input type="search" aria-label="Search backgrounds" placeholder="Find a background…" value={query} onChange={e=>setQuery(e.target.value)}/></label>
  <div className="background-filters" aria-label="Background categories">{categories.map(c=><button key={c} type="button" aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}</button>)}</div>
  <p className="background-result-count">{filtered.length} backgrounds{!isPlus?' · Locked scenes require Plus+':''}</p>
  {pending&&<div className="background-preview" aria-label="Background preview">
   <img src={pending.url} alt={`${pending.name} preview`}/>
   <div><strong>{pending.name}</strong><p>Preview only. Apply when you’re ready.</p><div className="background-preview-actions"><button type="button" className="workspace-primary" onClick={()=>{onSelect(pending);setPending(null);}}>Apply background</button><button type="button" className="analytics-button" onClick={()=>setPending(null)}>Cancel preview</button></div></div>
  </div>}
  <div className="background-choice-grid">{filtered.map(p=>{
   const active=!settings.customWallpaperUrl&&selected?.id===p.id,locked=!!p.isPlusOnly&&!isPlus;
   return <button key={p.id} type="button" className="background-tile" aria-label={`${p.name}${locked?' · Plus+ required':''}`} aria-pressed={active} onClick={()=>locked?onLocked(p.name):setPending(p)}>
    <span className="background-tile-image"><img src={p.thumbnail} alt="" loading="lazy" decoding="async"/>{(active||locked||p.type==='motion')&&<span className="background-tile-state">{active?<Check size={15}/>:locked?<Lock size={14}/>:<Film size={14}/>}</span>}</span>
    <span className="background-tile-copy"><strong>{p.name}</strong><span>{p.type==='motion'?'Video':p.type==='weather'?'Weather':p.category.includes('Abstract')?'Abstract':'Scenery'}{p.isPlusOnly?' · Plus+':''}</span></span>
   </button>;
  })}</div>
  {!filtered.length&&<p className="background-empty">No backgrounds match. Try another name or category.</p>}
 </section>;
}
