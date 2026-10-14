import {defineConfig} from 'vite';import react from '@vitejs/plugin-react';import tailwindcss from '@tailwindcss/vite';
export default defineConfig({build:{rollupOptions:{input:'tests/group-workspace-preview.html'}},plugins:[{name:'isolated-group-preview',enforce:'pre',transform(_code,id){
 if(id.endsWith('/src/utils/groupsService.ts'))return `export async function sendGroupMessage(groupId,user,text,type,emoji,mentions,image){window.dispatchEvent(new CustomEvent('preview-group-send',{detail:{groupId,senderUid:user.uid,senderName:user.displayName,senderAvatar:'',text,type,mentionUids:mentions,image,id:String(Date.now()),timestamp:Date.now()}}));}`;
 if(id.endsWith('/src/utils/liveGroups.ts'))return `export async function removeGroupMessage(groupId,id){window.dispatchEvent(new CustomEvent('preview-group-remove',{detail:id}));}`;
 if(id.endsWith('/src/components/ChatAllowance.tsx'))return `export function ChatAllowance(){return <p className="workspace-footnote">Preview only · messages stay in this browser</p>}`;
}},react(),tailwindcss()]});
