import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {normalizeMathMarkdown} from './mathMarkdown.ts';
import 'katex/dist/katex.min.css';
export function AiMarkdown({text}:{text:string}) {
 return <div className="ai-markdown"><Markdown skipHtml remarkPlugins={[remarkGfm,remarkMath]} rehypePlugins={[[rehypeKatex,{trust:false,strict:'ignore',throwOnError:false}]]} components={{a:({children,...props})=><a {...props} target="_blank" rel="noopener noreferrer">{children}</a>}}>{normalizeMathMarkdown(text)}</Markdown></div>;
}
