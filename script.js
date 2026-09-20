const translations=window.EVERROOT_CONTENT||{};
const supportedLanguages=['en','pl','uk','ru'];
const languageCodes={en:'en',pl:'pl',uk:'ua',ru:'ru'};
const langButtons=document.querySelectorAll('.lang');

function setLang(requested){
  const lang=supportedLanguages.includes(requested)?requested:'en';
  const copy=translations[lang]||translations.en||{};
  document.documentElement.lang=lang;
  document.querySelectorAll('[data-i18n]').forEach(el=>{const value=copy[el.dataset.i18n];if(value!==undefined)el.innerHTML=value;});
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{const value=copy[el.dataset.i18nPlaceholder];if(value!==undefined)el.placeholder=value;});
  const status=document.getElementById('formStatus');
  if(status?.dataset.messageKey&&copy[status.dataset.messageKey])status.textContent=copy[status.dataset.messageKey];
  langButtons.forEach(button=>button.classList.toggle('active',button.dataset.lang===lang));
  localStorage.setItem('everroot-lang',lang);
}

langButtons.forEach(button=>button.addEventListener('click',()=>setLang(button.dataset.lang)));
setLang(localStorage.getItem('everroot-lang')||'en');

const nav=document.getElementById('siteNav');
const menu=document.querySelector('.menu-toggle');
function closeMenu(){nav?.classList.remove('mobile-open');menu?.setAttribute('aria-expanded','false');}
menu?.addEventListener('click',()=>{const open=nav?.classList.toggle('mobile-open')||false;menu.setAttribute('aria-expanded',String(open));});
nav?.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMenu));
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu();});

const accessForm=document.getElementById('accessForm');
const accessSubmit=document.getElementById('accessSubmit');
const formStatus=document.getElementById('formStatus');
const FORM_TIMEOUT_MS=15000;
let requestInFlight=false;
function formMessage(key){return translations[document.documentElement.lang]?.[key]||translations.en?.[key]||'';}
function setFormStatus(key,state){formStatus.dataset.messageKey=key;formStatus.dataset.state=state;formStatus.textContent=formMessage(key);}
function configuredEndpoint(){
  const endpoint=window.EVERROOT_DECK_API_URL?.trim()||'';
  if(!endpoint)return '';
  try{const url=new URL(endpoint);return url.protocol==='https:'?url.href:'';}catch{return '';}
}

accessForm?.addEventListener('submit',async event=>{
  event.preventDefault();
  if(requestInFlight)return;
  if(!accessForm.checkValidity()){accessForm.reportValidity();return;}
  const endpoint=configuredEndpoint();
  if(!endpoint){setFormStatus('form.configError','error');return;}
  requestInFlight=true;accessSubmit.disabled=true;accessSubmit.setAttribute('aria-busy','true');accessSubmit.textContent=formMessage('form.sending');setFormStatus('form.sending','sending');
  const data=new FormData(accessForm);
  const payload={name:data.get('name'),email:data.get('email'),company:data.get('company'),message:data.get('message'),website:data.get('website'),language:languageCodes[document.documentElement.lang]||'en'};
  const controller=new AbortController();const timeoutId=setTimeout(()=>controller.abort(),FORM_TIMEOUT_MS);
  try{
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
    const result=await response.json().catch(()=>null);
    if(!response.ok||result?.ok!==true)throw new Error('request-failed');
    accessForm.reset();setFormStatus('form.success','success');
  }catch(error){setFormStatus(error?.name==='AbortError'?'form.timeout':'form.error','error');}
  finally{clearTimeout(timeoutId);requestInFlight=false;accessSubmit.disabled=false;accessSubmit.removeAttribute('aria-busy');accessSubmit.innerHTML=formMessage('form.button');}
});

