import { readSetting, writeSetting } from './storage.js';

// Existing libraries stay shared. Only practice history and favorites vary by player.
export class Profiles {
  constructor(){
    this.list=readSetting('profiles',[{id:'default',name:'Player 1'}]);
    if(!Array.isArray(this.list)||!this.list.length)this.list=[{id:'default',name:'Player 1'}];
    this.active=readSetting('activeProfile','default');
    if(!this.list.some(p=>p.id===this.active))this.active=this.list[0].id;
  }
  key(kind){return this.active==='default'?kind:`profile:${this.active}:${kind}`;}
  read(kind,fallback){return readSetting(this.key(kind),fallback);}
  write(kind,value){return writeSetting(this.key(kind),value);}
  save(){return writeSetting('profiles',this.list)&&writeSetting('activeProfile',this.active);}
  name(){return this.list.find(p=>p.id===this.active)?.name||'Player';}
  create(name){name=name.trim().slice(0,40);if(!name)throw new Error('Enter a player name.');if(this.list.length>=20)throw new Error('Up to 20 players can be saved on this computer.');const profile={id:crypto.randomUUID(),name};this.list.push(profile);if(!this.save()){this.list.pop();throw new Error('Could not save this player. Browser storage is unavailable.');}return profile;}
  rename(id,name){name=name.trim().slice(0,40);if(!name)throw new Error('Enter a player name.');const p=this.list.find(p=>p.id===id);if(p){const before=p.name;p.name=name;if(!this.save()){p.name=before;throw new Error('Could not save this name.');}}}
  select(id){if(!this.list.some(p=>p.id===id))return false;const previous=this.active;this.active=id;if(!this.save()){this.active=previous;throw new Error('Could not switch players.');}return true;}
}
