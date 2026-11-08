import test from 'node:test';
import assert from 'node:assert/strict';
import {Profiles} from '../src/profiles.js';
test('profiles migrate existing progress, isolate new players and retain active names',()=>{
 const values=new Map([['keyfall:history',JSON.stringify([{correct:12}])],['keyfall:favorites','["ode"]']]);globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 const p=new Profiles();assert.equal(p.name(),'Player 1');assert.equal(p.read('history',[])[0].correct,12);const other=p.create(' Second Player ');p.select(other.id);assert.deepEqual(p.read('history',[]),[]);assert.deepEqual(p.read('favorites',[]),[]);p.write('history',[{correct:3}]);p.rename(other.id,'Learner');const restored=new Profiles();assert.equal(restored.name(),'Learner');assert.equal(restored.read('history',[])[0].correct,3);restored.select('default');assert.equal(restored.read('history',[])[0].correct,12);assert.deepEqual(restored.read('favorites',[]),['ode']);
});
test('profiles validate empty names and report storage failure without changing player',()=>{
 globalThis.localStorage={getItem:()=>null,setItem(){throw new Error('quota');}};const p=new Profiles();assert.throws(()=>p.create(' '),/name/);assert.throws(()=>p.create('New'),/save/);assert.equal(p.list.length,1);assert.throws(()=>p.rename('default','Other'),/save/);assert.equal(p.name(),'Player 1');
});
