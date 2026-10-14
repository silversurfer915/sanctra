import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import React from 'react';
import {renderToString} from 'react-dom/server';
import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';

// Generate the same public components for crawlers and people with JavaScript disabled.
// No user state, Firebase access or browser storage is evaluated during this build.
const origin='https://sanctrastudy.live';
const escapeJson=value=>JSON.stringify(value).replaceAll('<','\\u003c');
const makeStatic=html=>html
 .replace(/\s*<script type="module"[^>]*><\/script>/g,'')
 .replace(/\s*<link rel="modulepreload"[^>]*>/g,'');
const setMeta=(shell,{path,title,description,schema,image='/backgrounds/illustrated-study-desk.v2.webp'})=>{
 const url=`${origin}${path}`;
 return shell
  .replace(/<link rel="canonical" href="[^"]+" \/>/,`<link rel="canonical" href="${url}" />`)
  .replace(/<meta property="og:url" content="[^"]+" \/>/,`<meta property="og:url" content="${url}" />`)
  .replace(/<meta property="og:title" content="[^"]+" \/>/,`<meta property="og:title" content="${title}" />`)
  .replace(/<meta property="og:description" content="[^"]+" \/>/,`<meta property="og:description" content="${description}" />`)
  .replace(/<meta property="og:image" content="[^"]+" \/>/,`<meta property="og:image" content="${origin}${image}" />`)
  .replace(/<meta name="twitter:title" content="[^"]+" \/>/,`<meta name="twitter:title" content="${title}" />`)
  .replace(/<meta name="twitter:description" content="[^"]+" \/>/,`<meta name="twitter:description" content="${description}" />`)
  .replace(/<meta name="twitter:image" content="[^"]+" \/>/,`<meta name="twitter:image" content="${origin}${image}" />`)
  .replace(/<meta name="description" content="[^"]+" \/>/,`<meta name="description" content="${description}" />`)
  .replace(/<script type="application\/ld\+json">.*?<\/script>/,`<script type="application/ld+json">${escapeJson(schema)}</script>`)
  .replace(/<title>.*?<\/title>/,`<title>${title}</title>`);
};

const server=await createServer({configFile:false,plugins:[react()],server:{middlewareMode:true},appType:'custom'});
try {
 const shell=await readFile('dist/index.html','utf8');
 const cssFiles=(await readdir('dist/assets')).filter(name=>name.endsWith('.css'));
 const styles=(await Promise.all(cssFiles.map(async name=>{
  const css=await readFile(`dist/assets/${name}`,'utf8');
  return css.includes('.landing-renewed')||css.includes('.seo-topic')?name:null;
 }))).filter(Boolean);
 if(!styles.length)throw new Error('Public landing stylesheet is missing from the build');
 const styleLinks=styles.map(name=>`<link rel="stylesheet" href="/assets/${name}" />`).join('');
 const {LandingView}=await server.ssrLoadModule('/src/components/views/LandingView.tsx');
 const noop=()=>{};
 const markup=renderToString(React.createElement(LandingView,{onStartStudying:noop,onOpenGroups:noop,onOpenAuth:noop})).replace(/<link rel="preload" as="image"[^>]*\/>/g,'');
 let html=shell.replace('</head>',`${styleLinks}<link rel="preload" as="image" href="/backgrounds/landing-screen-poster.jpg" type="image/jpeg" fetchpriority="high" /></head>`);
 html=html.replace(/<div id="root"[^>]*><\/div>/,`<div id="root">${markup}</div>`);
 // React discovers every scenic image during SSR. Only the actual first-paint image belongs in the head.
 html=html.replace('</body>','<noscript><p style="padding:24px;text-align:center">Enable JavaScript to start a timer, sign in and use the interactive study desk. You can still read about Sanctra above.</p></noscript></body>');
 if(!html.includes('<h1')||!html.includes('A little calm.'))throw new Error('Landing prerender missing');
 await writeFile('dist/index.html',html);

 const {SeoTopicView}=await server.ssrLoadModule('/src/components/views/SeoTopicView.tsx');
 const topics=[
  {kind:'pomodoro',slug:'pomodoro-timer',title:'Online Pomodoro Timer for Students | Sanctra',description:'Use a calm online Pomodoro timer with custom focus and break lengths, study tasks, subjects, focus audio and saved session history.',image:'/backgrounds/landing-sunlit-sanctuary-v1.webp'},
  {kind:'group',slug:'group-study-timer',title:'Group Study Timer for Friends | Sanctra',description:'Study with friends in public or private groups with personal timers, live focus presence, group chat, mentions and study-time leaderboards.',image:'/backgrounds/landing-starlit-observatory-v1.webp'},
 ];
 for(const topic of topics){
  const topicPath=`/${topic.slug}/`,url=`${origin}${topicPath}`;
  const topicMarkup=renderToString(React.createElement(SeoTopicView,{topic:topic.kind})).replace(/<link rel="preload" as="image"[^>]*\/>/g,'');
  const schema={'@context':'https://schema.org','@graph':[
   {'@type':'WebPage','@id':`${url}#webpage`,url,name:topic.title,description:topic.description,isPartOf:{'@id':`${origin}/#website`},about:{'@id':`${origin}/#app`}},
   {'@type':'BreadcrumbList',itemListElement:[
    {'@type':'ListItem',position:1,name:'Sanctra',item:`${origin}/`},
    {'@type':'ListItem',position:2,name:topic.kind==='pomodoro'?'Pomodoro timer':'Group study timer',item:url},
   ]},
  ]};
  let page=setMeta(shell,{path:topicPath,title:topic.title,description:topic.description,schema,image:topic.image});
  page=page.replace('</head>',`${styleLinks}<link rel="preload" as="image" href="${topic.image}" fetchpriority="high" /></head>`);
  page=page.replace(/<div id="root"[^>]*><\/div>/,`<div id="root">${topicMarkup}</div>`);
  if(!page.includes('<h1')||!page.includes(topic.kind==='pomodoro'?'online Pomodoro timer':'group study timer'))throw new Error(`${topic.slug} prerender missing`);
  await mkdir(`dist/${topic.slug}`,{recursive:true});
  await writeFile(`dist/${topic.slug}/index.html`,makeStatic(page));
 }

 const {LegalView}=await server.ssrLoadModule('/src/components/views/LegalView.tsx');
 const legal=renderToString(React.createElement(LegalView,{kind:'privacy'}));
 const privacyTitle='Sanctra Privacy Policy | Data & Account Privacy';
 const privacyDescription='Read how Sanctra handles account, study, timer, group, support and AI feature data.';
 const privacySchema={'@context':'https://schema.org','@type':'WebPage',url:`${origin}/privacy/`,name:privacyTitle,description:privacyDescription,isPartOf:{'@id':`${origin}/#website`}};
 const privacy=setMeta(shell,{path:'/privacy/',title:privacyTitle,description:privacyDescription,schema:privacySchema}).replace(/<div id="root"[^>]*><\/div>/,`<div id="root">${legal}</div>`);
 await mkdir('dist/privacy',{recursive:true});
 await writeFile('dist/privacy/index.html',makeStatic(privacy));
 console.log('Prerendered public landing, search entry pages and privacy page');
} finally {await server.close();}
