import './button-choices.css';

// Native select elements remain as the value/event boundary. All user input is
// through real buttons, with searchable choices for long instrument lists.
export function installButtonChoices(){
 const controls=new Map();let sequence=0;
 function enhance(select){
  if(controls.has(select)||select.id==='hands')return;
  const wrapper=document.createElement('span');wrapper.className='button-choice';select.before(wrapper);wrapper.append(select);select.hidden=true;select.tabIndex=-1;select.setAttribute('aria-hidden','true');
  const trigger=document.createElement('button');trigger.type='button';trigger.className='choice-trigger';trigger.dataset.choiceFor=select.id||select.getAttribute('aria-label');
  const popup=document.createElement('div');popup.className='choice-popup';popup.id=`choice-popup-${++sequence}`;popup.setAttribute('popover','auto');popup.setAttribute('role','group');
  trigger.setAttribute('popovertarget',popup.id);trigger.setAttribute('aria-expanded','false');wrapper.append(trigger,popup);
  const control={select,wrapper,trigger,popup,last:''};controls.set(select,control);
  function restoreFocus(){queueMicrotask(()=>{scan();const target=select.isConnected?select:[...controls.keys()].find(s=>select.id?s.id===select.id:select.dataset.track?s.dataset.track===select.dataset.track&&s.dataset.field===select.dataset.field:s.getAttribute('aria-label')===select.getAttribute('aria-label'));controls.get(target)?.trigger.focus({preventScroll:true});});}
  function label(){return select.getAttribute('aria-label')||select.closest('label')?.childNodes[0]?.textContent?.trim()||'Choose option';}
  function position(){const r=trigger.getBoundingClientRect();popup.style.width=`${Math.min(innerWidth-24,Math.max(r.width,240))}px`;popup.style.left=`${Math.max(12,Math.min(r.left,innerWidth-popup.offsetWidth-12))}px`;const below=innerHeight-r.bottom-12;popup.style.maxHeight=`${Math.min(380,Math.max(140,below>=180?below:r.top-12))}px`;popup.style.top=below>=180?`${r.bottom+5}px`:`${Math.max(12,r.top-popup.offsetHeight-5)}px`;}
  function render(){
   popup.replaceChildren();const title=document.createElement('div');title.className='choice-title';title.textContent=label();popup.append(title);popup.setAttribute('aria-label',label());
   const list=document.createElement('div');list.className='choice-list';
   const empty=document.createElement('p');empty.className='choice-empty';empty.textContent='No matching options';empty.setAttribute('role','status');empty.hidden=true;
   if(select.options.length>12){const search=document.createElement('input');search.type='search';search.placeholder='Find an option';search.setAttribute('aria-label',`Search ${label()}`);popup.append(search);search.oninput=()=>{const q=search.value.toLowerCase();for(const b of list.children)b.hidden=!b.textContent.toLowerCase().includes(q);empty.hidden=[...list.children].some(b=>!b.hidden);};}
   for(const option of select.options){const button=document.createElement('button');button.type='button';button.textContent=option.textContent;button.dataset.choiceValue=option.value;button.setAttribute('aria-pressed',String(option.value===select.value));button.disabled=option.disabled;button.onclick=()=>{select.value=option.value;popup.hidePopover();select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));refresh();restoreFocus();};list.append(button);}
   popup.append(list,empty);
  }
  popup.addEventListener('beforetoggle',e=>{if(e.newState==='open'){render();trigger.setAttribute('aria-expanded','true');}else trigger.setAttribute('aria-expanded','false');});
  popup.addEventListener('toggle',e=>{if(e.newState==='open'){position();(popup.querySelector('input')||popup.querySelector('[aria-pressed=true]')||popup.querySelector('button'))?.focus();}});
  popup.addEventListener('keydown',e=>{if(e.code==='Escape'){e.preventDefault();e.stopPropagation();popup.hidePopover();trigger.focus();return;}const options=[...popup.querySelectorAll('.choice-list button')].filter(b=>!b.hidden&&!b.disabled);if(e.target.tagName==='INPUT'&&['ArrowDown','ArrowUp','Enter'].includes(e.code)){e.preventDefault();e.stopPropagation();if(e.code==='Enter')options[0]?.click();else options[e.code==='ArrowUp'?options.length-1:0]?.focus();return;}if(['ArrowDown','ArrowUp','Home','End'].includes(e.code)&&e.target.tagName==='BUTTON'){e.preventDefault();const i=options.indexOf(document.activeElement);options[e.code==='Home'?0:e.code==='End'?options.length-1:(i+(e.code==='ArrowDown'?1:-1)+options.length)%options.length]?.focus();}});
  popup.addEventListener('focusout',e=>{if(popup.contains(e.relatedTarget)||e.relatedTarget===trigger)return;setTimeout(()=>{if(popup.matches(':popover-open')&&!popup.contains(document.activeElement)&&document.activeElement!==trigger)popup.hidePopover();},0);});
  select.addEventListener('change',()=>refresh());
 }
 function scan(){for(const select of document.querySelectorAll('select'))enhance(select);for(const[select]of controls)if(!select.isConnected)controls.delete(select);refresh();}
 function refresh(){for(const{select,trigger}of controls.values()){const text=select.selectedOptions[0]?.textContent||'Choose';if(trigger.textContent!==text+' ▾')trigger.textContent=text+' ▾';trigger.disabled=select.disabled;const name=select.getAttribute('aria-label')||select.closest('label')?.childNodes[0]?.textContent?.trim()||'Choose option';trigger.setAttribute('aria-label',`${name}: ${text}`);}}
 const observer=new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches('select')||n.querySelector('select')))))scan();});observer.observe(document.getElementById('app'),{subtree:true,childList:true});scan();
 window.addEventListener('resize',()=>{for(const {popup}of controls.values())if(popup.matches(':popover-open'))popup.hidePopover();});
 document.addEventListener('scroll',e=>{for(const {popup}of controls.values())if(popup.matches(':popover-open')&&!popup.contains(e.target)){popup.hidePopover();}},true);
 return{refresh};
}
