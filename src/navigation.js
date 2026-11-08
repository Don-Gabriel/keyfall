import './navigation.css';
import { escapeXML as esc, formatTime } from './music.js';
import { readSetting, writeSetting } from './storage.js';

export function createNavigation(api){
 const $=id=>document.getElementById(id),app=$('app');
 let view='home',trail=[],changing=false,settingsCategory='sound',practiceMode='listen',hands='both';
 const dialogs={library:'library-dialog',settings:'settings-dialog',devices:'midi-dialog',help:'help-dialog',history:'history-dialog',profiles:'profiles-dialog'};
 const shell=document.createElement('section');shell.id='entry-shell';shell.innerHTML=`
 <section id="home-screen" aria-labelledby="home-title">
  <div class="home-top"><button id="home-profile" class="profile-button"><span class="profile-mark" aria-hidden="true">♟</span><span id="profile-name"></span><span aria-hidden="true">⌄</span></button><button id="home-devices">Connect a piano</button></div>
  <div class="home-body"><div class="home-heading"><img src="/icon.svg" alt="" width="72" height="72"><h1 id="home-title" tabindex="-1">Keyfall</h1><p>A little practice. A song of your own.</p></div>
  <nav class="home-menu" aria-label="Main menu"><button id="home-songs"><span class="menu-symbol" aria-hidden="true">♫</span><span>Play a song<small>Choose your music and how to practice</small></span><span aria-hidden="true">›</span></button><button id="home-free"><span class="menu-symbol" aria-hidden="true">♮</span><span>Free play<small>Explore the piano, or record a performance</small></span><span aria-hidden="true">›</span></button><button id="home-settings"><span class="menu-symbol" aria-hidden="true">⚙</span><span>Settings<small>Sound, display, keyboard and practice</small></span><span aria-hidden="true">›</span></button></nav>
  <button id="home-continue" class="continue-button"><span>Continue at the piano</span><small id="continue-title"></small></button>
  <div class="home-secondary"><button id="home-history">My progress</button><button id="home-help">Help & shortcuts</button></div></div>
  <div class="home-bottom"><span id="home-library-count"></span><span>Keyfall 0.5.0 · Offline piano practice</span></div>
 </section>
 <section id="song-screen" hidden aria-labelledby="setup-title"><header class="page-toolbar"><button id="setup-back">‹ Back</button><span>Choose how to play</span><button id="setup-home">Main menu</button></header><div class="song-setup-content">
  <div class="setup-heading"><span class="setup-note" aria-hidden="true">♫</span><div><h1 id="setup-title" tabindex="-1"></h1><p id="setup-composer"></p><p id="setup-info"></p></div><button id="setup-favorite" aria-label="Favorite this song">☆ Favorite</button></div>
  <div class="setup-columns"><section aria-labelledby="mode-heading"><h2 id="mode-heading">How would you like to play?</h2><div class="setup-modes" role="group" aria-label="Practice method">${[
   ['listen','Watch and listen','Hear the whole song and watch the notes.'],['wait','Learn the notes','The song waits until you play the right notes.'],['rhythm','Practice the rhythm','Keep time with the music and improve your accuracy.'],['recital','Play a recital','A full-speed attempt, from beginning to end.']
  ].map(([m,title,detail])=>`<button data-setup-mode="${m}" aria-pressed="${m==='listen'}"><span class="mode-indicator" aria-hidden="true"></span><span><strong>${title}</strong><small>${detail}</small></span></button>`).join('')}</div>
  <fieldset id="setup-hands"><legend>Which hands?</legend><div>${[['left','Left hand'],['both','Both hands'],['right','Right hand']].map(([v,l])=>`<button data-setup-hands="${v}" aria-pressed="${v==='both'}">${l}</button>`).join('')}</div><p id="setup-hands-help">The other hand plays along while you practice.</p></fieldset>
  <div class="setup-actions"><button id="setup-start" class="primary">Watch and listen</button><button id="setup-parts">Hands, colors & instruments</button></div></section>
  <aside class="song-progress" aria-labelledby="song-progress-title"><h2 id="song-progress-title">Your progress</h2><div id="setup-progress"></div><button id="setup-history">View practice history</button></aside></div></div></section>`;
 app.prepend(shell);
 const profiles=document.createElement('dialog');profiles.id='profiles-dialog';profiles.innerHTML=`<div class="dialog-heading"><div><h2>Players</h2><p>Each player has their own favorites and practice history. Songs are shared.</p></div><button id="profiles-close" aria-label="Close players">×</button></div><div id="profile-list"></div><form id="profile-create"><label for="new-profile-name">Add a player</label><div><input id="new-profile-name" placeholder="Player name" maxlength="40" required><button class="primary" type="submit">Add player</button></div></form><p id="profile-message" role="status"></p>`;app.append(profiles);
 const menuButton=document.createElement('button');menuButton.id='main-menu';menuButton.textContent='‹ Back';menuButton.title='Back to song options';menuButton.setAttribute('aria-label','Back to song options');document.querySelector('.toolbar').prepend(menuButton);
 const homeButton=document.createElement('button');homeButton.id='player-home';homeButton.textContent='⌂';homeButton.title='Main menu';homeButton.setAttribute('aria-label','Main menu');document.querySelector('.toolbar-end').prepend(homeButton);
 // Group existing controls rather than maintaining a duplicate settings surface.
 const settings=$('settings-dialog'),heading=settings.querySelector('.dialog-heading');
 const layout=document.createElement('div');layout.className='settings-layout';layout.innerHTML='<nav class="settings-tabs" aria-label="Settings categories"></nav><div class="settings-panels"></div>';
 const panels=layout.querySelector('.settings-panels'),tabs=layout.querySelector('nav');
 const categories=[['sound','Sound'],['display','Display & practice'],['parts','Song parts'],['bookmarks','Bookmarks']];
 const grid=settings.querySelector('.settings-grid'),bank=settings.querySelector('details'),display=bank.nextElementSibling;
 const partNodes=[];let node=display.nextElementSibling;while(node&&node.tagName!=='DETAILS'){partNodes.push(node);node=node.nextElementSibling;}const bookmarks=node;
 for(const[id,label]of categories){const panel=document.createElement('section');panel.id=`settings-${id}`;panel.className='settings-page';panel.setAttribute('aria-label',label);panels.append(panel);const tab=document.createElement('button');tab.dataset.settingsCategory=id;tab.textContent=label;tab.onclick=()=>selectSettings(id);tabs.append(tab);}
 settings.append(layout);
 // Keep disclosure sections intact; users may collapse them inside their category.
 $('settings-sound').append(grid,bank);$('settings-display').append(display);$('settings-parts').append(...partNodes);$('settings-bookmarks').append(bookmarks);settings.append(layout);
 const connect=document.createElement('button');connect.textContent='Music devices';connect.id='settings-devices';connect.onclick=()=>go('devices');tabs.append(connect);
 const players=document.createElement('button');players.textContent='Players';players.id='settings-profiles';players.onclick=()=>go('profiles');tabs.append(players);
 const shortcuts=document.createElement('button');shortcuts.textContent='Help & shortcuts';shortcuts.onclick=()=>go('help');tabs.append(shortcuts);
 heading.querySelector('h2').textContent='Settings';heading.querySelector('p').textContent='Changes are saved as you make them.';
 function selectSettings(id){if(settingsCategory!==id)settings.scrollTop=0;settingsCategory=id;for(const panel of panels.children)panel.hidden=panel.id!==`settings-${id}`;for(const tab of tabs.querySelectorAll('[data-settings-category]'))tab.setAttribute('aria-pressed',String(tab.dataset.settingsCategory===id));}
 selectSettings('sound');
 for(const[route,id]of Object.entries(dialogs)){
  const d=$(id);d.classList.add('route-dialog');d.dataset.route=route;
  const close=d.querySelector('[data-close]')||$('profiles-close');close.textContent='‹ Back';
  close.onclick=()=>back();
  d.addEventListener('cancel',e=>{e.preventDefault();back();});
  d.addEventListener('close',()=>{if(view===route&&!d.open&&!changing)back();});
 }
 function currentResume(){const t=api.transport;return{songId:api.song().id,time:t.time,mode:t.mode,hands:t.hands};}
 function snapshot(){if(view==='player'){writeSetting('resume',currentResume());}}
 function isPlayer(){return view==='player'||view==='free';}
 function updateHome(){
  $('profile-name').textContent=api.profiles.name();$('continue-title').textContent=api.song().title;
  $('home-library-count').textContent=`${api.songs().length} songs in your library`;
 }
 function updateSetup(){
  const song=api.song(),sessions=api.history().filter(s=>s.songId===song.id),best=sessions.length?Math.max(...sessions.map(accuracy)):null;
  $('setup-title').textContent=song.title;$('setup-composer').textContent=song.composer;$('setup-info').textContent=`${formatTime(song.duration)} · ${song.notes.length.toLocaleString()} notes · ${Math.round(song.bpm)} BPM`;
  $('setup-favorite').textContent=api.favorite(song.id)?'★ Favorited':'☆ Favorite';$('setup-favorite').setAttribute('aria-pressed',String(api.favorite(song.id)));
  const count={left:0,right:0};for(const n of song.notes){const role=api.transport.role(n);if(role in count)count[role]++;}
  $('setup-progress').innerHTML=`<div class="progress-number">${best===null?'—':best+'%'}<small>${best===null?'Your first practice starts here':'Best accuracy'}</small></div><p>${sessions.length} practice session${sessions.length===1?'':'s'}</p><div class="hand-counts"><span>${count.left.toLocaleString()} left-hand notes</span><span>${count.right.toLocaleString()} right-hand notes</span></div>${progressChart(sessions)}<p class="muted">${sessions.length?'Each point is a saved practice session.':'Try learning one hand at a time, then put both hands together.'}</p>`;
  updateMode();
 }
 function updateMode(){for(const b of shell.querySelectorAll('[data-setup-mode]'))b.setAttribute('aria-pressed',String(b.dataset.setupMode===practiceMode));for(const b of shell.querySelectorAll('[data-setup-hands]'))b.setAttribute('aria-pressed',String(b.dataset.setupHands===hands));$('setup-hands').disabled=practiceMode==='listen';$('setup-hands-help').textContent=practiceMode==='listen'?'All song parts play automatically.':'The other hand plays along while you practice.';$('setup-start').textContent={listen:'Watch and listen',wait:'Start learning',rhythm:'Start rhythm practice',recital:'Start recital'}[practiceMode];}
 function renderProfiles(){
  $('profile-list').innerHTML=api.profiles.list.map(p=>`<div class="profile-row"><button data-player="${esc(p.id)}" aria-pressed="${p.id===api.profiles.active}"><span class="profile-initial">${esc(p.name[0].toUpperCase())}</span><span>${esc(p.name)}</span>${p.id===api.profiles.active?'<small>Current player</small>':''}</button><button data-rename-player="${esc(p.id)}" aria-label="Rename ${esc(p.name)}">Rename</button></div>`).join('');
 }
 async function go(next,{replace=false,fromBack=false}={}){
  if(changing)return;changing=true;
  try{
   snapshot();await api.stop();
   if(!fromBack&&!replace&&view!==next)trail.push(view);
   for(const d of document.querySelectorAll('dialog[open]'))d.close();
   if(next==='free')app.dataset.freeContext='true';else if(!dialogs[next])delete app.dataset.freeContext;
   if(next==='settings'&&app.dataset.freeContext==='true'&&['parts','bookmarks','gameplay'].includes(settingsCategory))selectSettings('sound');
   view=next;app.dataset.view=view;shell.hidden=isPlayer()||!!dialogs[view];$('home-screen').hidden=view!=='home';$('song-screen').hidden=view!=='song';
   if(view==='home'){trail=[];updateHome();$('home-title').focus();}
   if(view==='song'){updateSetup();$('setup-title').focus();}
   if(isPlayer()){
    if(view==='free')api.mode('free',hands);
    api.roll.resize();$('play').disabled=api.transport.mode==='free';(view==='free'?$('keyboard').querySelector('[data-midi="60"]'):$('play'))?.focus();
   }
   if(dialogs[view]){if(view==='library')api.renderLibrary();if(view==='history')api.renderHistory();if(view==='profiles')renderProfiles();$(dialogs[view]).showModal();}
   menuButton.textContent=view==='free'?'‹ Main menu':'‹ Song options';menuButton.setAttribute('aria-label',view==='free'?'Main menu':'Back to song options');
   document.title=view==='home'?'Keyfall':`${view==='song'||view==='player'?api.song().title:view==='free'?'Free play':{library:'Song library',settings:'Settings',devices:'Music devices',help:'Help',history:'Practice history',profiles:'Players'}[view]} · Keyfall`;
   api.update();
  }finally{changing=false;}
 }
 function back(){return go(trail.pop()||'home',{fromBack:true});}
 $('home-songs').onclick=()=>go('library');$('home-free').onclick=()=>go('free');$('home-settings').onclick=()=>{selectSettings('sound');go('settings');};$('home-help').onclick=()=>go('help');$('home-devices').onclick=()=>go('devices');$('home-history').onclick=()=>go('history');$('home-profile').onclick=()=>go('profiles');
 $('home-continue').onclick=async()=>{const resume=readSetting('resume',null);if(resume?.songId===api.song().id){api.mode(resume.mode==='free'?'listen':resume.mode,resume.hands);api.transport.seek(resume.mode==='recital'?0:resume.time);}else api.mode('listen');await go('player');};
 $('setup-back').onclick=()=>go('library',{replace:true});$('setup-home').onclick=()=>go('home');
 $('setup-favorite').onclick=()=>{api.toggleFavorite(api.song().id);updateSetup();};
 $('setup-history').onclick=()=>go('history');$('setup-parts').onclick=()=>{selectSettings('parts');go('settings');};
 $('setup-start').onclick=async()=>{api.mode(practiceMode,hands);api.transport.seek(0);await go('player');await api.play();};
 shell.querySelectorAll('[data-setup-mode]').forEach(b=>b.onclick=()=>{practiceMode=b.dataset.setupMode;updateMode();});shell.querySelectorAll('[data-setup-hands]').forEach(b=>b.onclick=()=>{hands=b.dataset.setupHands;updateMode();});
 menuButton.onclick=()=>{trail=['home'];return view==='free'?go('home'):go('song',{replace:true});};homeButton.onclick=()=>go('home');
 $('library-button').onclick=()=>go('library');$('settings-button').onclick=()=>go('settings');$('help-button').onclick=()=>go('help');$('midi-button').onclick=()=>go('devices');$('progress-button').onclick=()=>go('history');
 $('profile-create').onsubmit=e=>{e.preventDefault();try{const p=api.profiles.create($('new-profile-name').value);api.selectProfile(p.id);$('new-profile-name').value='';$('profile-message').textContent=`${p.name} is ready to play.`;renderProfiles();}catch(err){$('profile-message').textContent=err.message;}};
 $('profile-list').onclick=e=>{const player=e.target.closest('[data-player]'),rename=e.target.closest('[data-rename-player]');try{if(player){api.selectProfile(player.dataset.player);renderProfiles();$('profile-message').textContent=`Playing as ${api.profiles.name()}.`;}if(rename){const id=rename.dataset.renamePlayer,p=api.profiles.list.find(p=>p.id===id),row=rename.parentElement;row.innerHTML=`<form class="rename-player"><label>Player name <input value="${esc(p.name)}" maxlength="40" required></label><button type="submit">Save name</button><button type="button" data-cancel-rename>Cancel</button></form>`;row.querySelector('input').focus();row.querySelector('form').onsubmit=ev=>{ev.preventDefault();try{api.profiles.rename(id,row.querySelector('input').value);renderProfiles();}catch(err){$('profile-message').textContent=err.message;}};row.querySelector('[data-cancel-rename]').onclick=renderProfiles;}}catch(err){$('profile-message').textContent=err.message;}};
 document.addEventListener('keydown',e=>{if(e.code==='Escape'&&!isPlayer()&&!document.querySelector('dialog[open]')&&view!=='home'){e.preventDefault();back();}},true);
 window.addEventListener('beforeunload',snapshot);
 go('home',{replace:true});
 return{go,back,isPlayer,selected:()=>go('song',{replace:true}),view:()=>view,selectSettings,updateHome,syncMode(mode){if(isPlayer()){view=mode==='free'?'free':'player';app.dataset.view=view;menuButton.textContent=view==='free'?'‹ Main menu':'‹ Song options';menuButton.setAttribute('aria-label',view==='free'?'Main menu':'Back to song options');}}};
}

function accuracy(s){const total=s.correct+s.missed+s.wrong;return total?Math.round(100*s.correct/total):0;}
function progressChart(sessions){
 const recent=sessions.slice(0,12).reverse();if(!recent.length)return '';
 const points=recent.map((s,i)=>({x:recent.length===1?150:20+i*260/(recent.length-1),y:110-accuracy(s),score:accuracy(s)}));
 return `<svg class="progress-chart" viewBox="0 0 300 140" role="img" aria-label="Accuracy for the last ${recent.length} sessions: ${points.map(p=>p.score+' percent').join(', ')}"><path d="M20 10H280M20 60H280M20 110H280" stroke="#52606b" fill="none"/><polyline points="${points.map(p=>`${p.x},${p.y}`).join(' ')}" stroke="#8dbde8" stroke-width="3" fill="none"/>${points.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="4" fill="#a5e86b"/>`).join('')}<text x="20" y="132" fill="#c4d3dc" font-size="11">Older</text><text x="248" y="132" fill="#c4d3dc" font-size="11">Latest</text></svg>`;
}
