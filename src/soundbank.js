export class SoundBank {
  async load(context, destination, buffer) {
    const { WorkletSynthesizer } = await import('spessasynth_lib');
    if(!this.synth){
      await context.audioWorklet.addModule('/spessasynth_processor.min.js');
      this.synth=new WorkletSynthesizer(context);
      this.synth.connect(destination);
    }
    await this.synth.soundBankManager.addSoundBank(buffer,'keyfall');
    await this.synth.isReady;
    // Banks resolve asynchronously through the worklet; one event-loop turn
    // permits the accompanying preset-list event to reach the UI.
    await new Promise(resolve=>setTimeout(resolve,30));
    return this.synth.presetList;
  }
  configure(tracks) {
    if(!this.synth)return;
    this.channels=new Map();
    let next=0;
    for(const t of tracks){
      if(next%16===9)next++;
      const channel=t.percussion?9:next++;
      let count=this.synth.midiChannels.length;while(count<=channel){this.synth.addNewChannel();count++;}
      this.channels.set(t.id,channel);
      this.synth.programChange(channel,t.instrument||0);
      this.synth.controllerChange(channel,7,127);
      this.synth.controllerChange(channel,10,Math.round((t.pan??0)*63+64));
    }
    this.liveChannel=Math.max(16,next);
    if(this.liveChannel%16===9)this.liveChannel++;
    let count=this.synth.midiChannels.length;while(count<=this.liveChannel){this.synth.addNewChannel();count++;}
    this.synth.programChange(this.liveChannel,this.liveProgram||0);
  }
  note(midi,velocity,track) {
    const channel=track?this.channels?.get(track.id)??0:this.liveChannel??16;
    if(!track)this.synth.programChange(channel,this.liveProgram||0);
    this.synth.noteOn(channel,midi,Math.max(1,Math.min(127,Math.round(velocity*127))));
    return channel;
  }
  release(channel,midi){this.synth?.noteOff(channel,midi);}
  expression(event,track){if(!this.synth||!track)return;const ch=this.channels?.get(track.id)??0;if(event.type==='bend')this.synth.pitchWheel(ch,Math.max(0,Math.min(16383,Math.round((event.value+1)*8192))));else this.synth.controllerChange(ch,event.controller,Math.round(event.value*127));}
  resetExpression(){if(!this.synth)return;for(const ch of this.channels?.values()||[]){this.synth.controllerChange(ch,121,0);this.synth.controllerChange(ch,7,127);this.synth.controllerChange(ch,11,127);this.synth.pitchWheel(ch,8192);}}
  panic(){this.synth?.stopAll(true);}
}

export function soundBankStore(action, value) {
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('keyfall-soundbanks',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('banks');
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const db=request.result,tx=db.transaction('banks',action==='get'?'readonly':'readwrite'),store=tx.objectStore('banks');
      const req=action==='put'?store.put(value,'custom'):action==='delete'?store.delete('custom'):store.get('custom');
      tx.oncomplete=()=>{resolve(req.result);db.close();};tx.onerror=()=>{reject(tx.error);db.close();};
    };
  });
}
