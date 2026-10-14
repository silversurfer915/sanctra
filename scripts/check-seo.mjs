import {readFile} from 'node:fs/promises';

const pages=[
 ['Home','dist/index.html','https://sanctrastudy.live/'],
 ['Pomodoro','dist/pomodoro-timer/index.html','https://sanctrastudy.live/pomodoro-timer/'],
 ['Group','dist/group-study-timer/index.html','https://sanctrastudy.live/group-study-timer/'],
 ['Privacy','dist/privacy/index.html','https://sanctrastudy.live/privacy/'],
];
const failures=[];
for(const [label,file,canonical] of pages){
 const html=await readFile(file,'utf8');
 const title=html.match(/<title>(.*?)<\/title>/)?.[1]||'';
 const description=html.match(/<meta name="description" content="([^"]+)"/i)?.[1]||'';
 const canonicalFound=html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1]||'';
 const h1=(html.match(/<h1\b/g)||[]).length;
 const schemaText=html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)?.[1];
 if(title.length<25||title.length>65)failures.push(`${label}: title length ${title.length}`);
 if(description.length<70||description.length>170)failures.push(`${label}: description length ${description.length}`);
 if(canonicalFound!==canonical)failures.push(`${label}: canonical is ${canonicalFound||'missing'}`);
 if(h1!==1)failures.push(`${label}: expected one h1, found ${h1}`);
 try{JSON.parse(schemaText||'');}catch{failures.push(`${label}: invalid or missing JSON-LD`);}
 if(label!=='Home'&&(/<script type="module"/.test(html)||/rel="modulepreload"/.test(html)))failures.push(`${label}: public reading page should not boot the application bundle`);
 if(label!=='Privacy'){
  const stylePaths=[...html.matchAll(/href="(\/assets\/[^" ]+\.css)"/g)].map(match=>match[1]);
  const styles=(await Promise.all(stylePaths.map(path=>readFile(`dist${path}`,'utf8')))).join('\n');
  if(!styles.includes(label==='Home'?'.landing-renewed':'.seo-topic'))failures.push(`${label}: public surface stylesheet is missing`);
 }
}
const home=await readFile('dist/index.html','utf8');
if((home.match(/rel="preload" as="image"/g)||[]).length!==1)failures.push('Home: preload one original landing scene');
if(!home.includes('observatory-scene'))failures.push('Home: first-paint animation fallback missing');
const sitemap=await readFile('dist/sitemap.xml','utf8');
for(const [, ,canonical] of pages)if(!sitemap.includes(`<loc>${canonical}</loc>`))failures.push(`Sitemap: missing ${canonical}`);
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log(`SEO checks passed for ${pages.length} public pages.`);
