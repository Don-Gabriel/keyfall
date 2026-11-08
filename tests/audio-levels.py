import json
from pathlib import Path
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    page=browser.new_page()
    page.goto('http://127.0.0.1:5189')
    page.wait_for_load_state('networkidle')
    results=page.evaluate('''async()=>{
      const {createAudioOutput}=await import('/src/engine.js');
      const samples=await(await fetch('/piano.json')).json();
      async function render(version, keys, volume=.65, boost=6, velocity=.75){
        const ctx=new OfflineAudioContext(2,44100,44100);
        let input;
        if(version==='old'){
          input=ctx.createGain();input.gain.value=volume*.45;
          const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-14;compressor.ratio.value=5;
          input.connect(compressor);compressor.connect(ctx.destination);
        }else input=createAudioOutput(ctx,volume,boost).input;
        for(const key of keys){
          const bytes=Uint8Array.from(atob(samples[key].split(',')[1]),c=>c.charCodeAt(0));
          const buffer=await ctx.decodeAudioData(bytes.buffer),source=ctx.createBufferSource(),gain=ctx.createGain();
          source.buffer=buffer;gain.gain.setValueAtTime(0,0);gain.gain.linearRampToValueAtTime(velocity*1.8,.004);
          source.connect(gain);gain.connect(input);source.start(0);
        }
        const result=await ctx.startRendering();let sum=0,peak=0,count=0;
        for(let ch=0;ch<2;ch++){const values=result.getChannelData(ch);for(let i=0;i<22050;i++){const v=values[i];peak=Math.max(peak,Math.abs(v));sum+=v*v;count++;}}
        return {peak,rms:Math.sqrt(sum/count)};
      }
      return {old:await render('old',['C4']),new:await render('new',['C4']),maximumChord:await render('new',['C2','G2','C3','E3','G3','C4','E4','G4','C5','E5'],1,12,1),muted:await render('new',['C4'],0),boostOff:await render('new',['C4'],.65,0),boost12:await render('new',['C4'],.65,12)};
    }''')
    assert results['new']['rms']>results['old']['rms']*1.8,results
    assert results['maximumChord']['peak']<.99,results
    assert results['muted']['peak']==0,results
    assert results['boost12']['rms']>results['boostOff']['rms'],results
    print(json.dumps(results,indent=2))
    Path('test-results/audio-levels.json').write_text(json.dumps(results,indent=2))
    browser.close()
