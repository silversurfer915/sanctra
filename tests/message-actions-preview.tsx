import {createRoot} from 'react-dom/client';
import {GroupConversation} from '../src/components/groups/GroupConversation.tsx';
import type {AuthUser} from '../src/types/index.ts';
import '../src/index.css';
import '../src/styles-sanctra.css';
const user:AuthUser={uid:'menu-preview',displayName:'You',email:'preview@example.com',photoURL:null,isAnonymous:false};
createRoot(document.getElementById('root')!).render(<main id="sanctra-root" className="sanctra-app" style={{minHeight:'100vh',padding:24,background:'#142431'}}>
 <div style={{maxWidth:720,margin:'0 auto'}}><GroupConversation groupId="menu-preview" user={user} canModerate={false} members={[]} active messages={[
  {id:'other',groupId:'menu-preview',senderUid:'other',senderName:'Study partner',senderAvatar:'',timestamp:Date.now()-60000,text:'Starting a physics session. See you after the break.',type:'chat'},
  {id:'mine',groupId:'menu-preview',senderUid:user.uid,senderName:'You',senderAvatar:'',timestamp:Date.now(),text:'Sounds good. I’m revising chemistry.',type:'chat'},
 ]}/></div>
</main>);
