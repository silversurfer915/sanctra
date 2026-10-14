import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeStudyRecords} from '../src/utils/mergeStudyRecords.ts';
test('saving a website record preserves concurrent Mac history and planner insertions',()=>{
 const base=[{id:'old',text:'Old'}];
 const local=[{id:'web',text:'Web'},...base];
 const remote=[{id:'mac',text:'Mac'},...base];
 assert.deepEqual(mergeStudyRecords(base,local,remote).map(item=>item.id),['web','old','mac']);
});
test('intentional removals stay removed while unchanged records follow remote edits',()=>{
 const base=[{id:'delete',text:'Remove'},{id:'edit',text:'Original'}];
 assert.deepEqual(mergeStudyRecords(base,[base[1]],[{id:'edit',text:'Remote edit'},base[0]]),[{id:'edit',text:'Remote edit'}]);
 assert.deepEqual(mergeStudyRecords(base,base,[]),[]);
});
