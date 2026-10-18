/* Assistente de redação: acesso explícito ao Google Gemini (sem API ou chave pública).
   O conteúdo só sai do editor se o revisor copiar o prompt e colá-lo no site do Google.
   Toda aplicação requer confirmação consciente e admite restauração anterior/original. */
(function(){
'use strict';
const fieldRoot='#analysisView textarea,#configView textarea,#approvalNote';
const criteriaKeys=['eficacia','limite','monitoramento','correcao','produto','registros'];
const prepared=new WeakSet(), applying=new WeakSet();
let modal=null,activeTarget=null,activeKey='',activeName='';
const bridge=()=>window.APPCC_EDITOR_BRIDGE;
function context(){return bridge()?.context?.()||{};}
function signature(control){
 const c=context(),f=c.phrase||{};
 if(!f.n)return null;
 if(control.dataset.field)return f.n+':frase:'+control.dataset.field;
 if(control.dataset.criterionText)return f.n+':criterio:'+control.dataset.criterionText;
 if(control.dataset.docField){
   const card=control.closest('.doc-card');
   const idx=Number(card?.dataset.doc);
   const doc=c.docs?.[idx];
   return f.n+':documento:'+(doc?.uid||'novo_'+idx)+':'+control.dataset.docField;
 }
 if(control.id==='approvalNote'||control.id==='table2Note')return f.n+':controle:'+control.id;
 return null;
}
function original(control){
 const c=context(),f=c.base||{};
 if(control.dataset.field)return {defined:Object.prototype.hasOwnProperty.call(f,control.dataset.field),value:f[control.dataset.field]??''};
 if(control.dataset.criterionText){
   const idx=criteriaKeys.indexOf(control.dataset.criterionText);
   return {defined:idx>=0,value:idx>=0?f.passo3_textos?.[idx]??'':''};
 }
 if(control.dataset.docField){
   const idx=Number(control.closest('.doc-card')?.dataset.doc),doc=c.docs?.[idx];
   const first=f.documentos?.find(x=>x.uid&&x.uid===doc?.uid)||(f.documentos?.[idx]?.uid===doc?.uid?f.documentos[idx]:null);
   return {defined:!!first,value:first?.[control.dataset.docField]??''};
 }
 if(['approvalNote','table2Note'].includes(control.id))return {defined:true,value:''};
 return {defined:false,value:''};
}
function fieldName(control){
 const prior=control.previousElementSibling;
 if(prior&&prior.tagName==='LABEL')return prior.textContent.trim();
 const card=control.closest('.criterion,.field-box,.doc-card,.config-column,.evidence,.approval-row');
 const labels=Array.from(card?.querySelectorAll('label')||[]);
 const match=labels.find(x=>x.control===control||x.nextElementSibling===control);
 return (match||labels[0])?.textContent.trim()||control.dataset.field||control.dataset.docField||control.dataset.criterionText||control.id||'Campo de revisão';
}
function getStore(){const v=bridge()?.getHistory?.();return v&&typeof v==='object'?v:{};}
function writeStore(hist){bridge()?.setHistory?.(hist);}
function pushHistory(key,text){
 if(!key)return;
 const hist=getStore(),stack=Array.isArray(hist[key])?[...hist[key]]:[];
 if(stack[stack.length-1]!==text)stack.push(text);
 hist[key]=stack.slice(-6);writeStore(hist);
}
function popHistory(key,current){
 const hist=getStore(),stack=Array.isArray(hist[key])?[...hist[key]]:[];
 while(stack.length&&stack[stack.length-1]===current)stack.pop();
 if(!stack.length)return undefined;
 const previous=stack.pop();
 hist[key]=stack;writeStore(hist);
 return previous;
}
function setText(control,text){
 applying.add(control);
 control.value=String(text??'');
 control.dispatchEvent(new Event('input',{bubbles:true}));
 control.dispatchEvent(new Event('change',{bubbles:true}));
 applying.delete(control);
 control.focus();
}
function restorePrevious(control){
 const key=signature(control);
 if(!key)return;
 const old=popHistory(key,control.value);
 if(old===undefined){alert('Não existe versão anterior gravada para este campo.');return;}
 setText(control,old);
}
function restoreOriginal(control){
 const origin=original(control);
 if(!origin.defined){alert('Este campo foi adicionado na revisão e não possui um texto-base original. Use “Restaurar anterior”.');return;}
 if(String(control.value)===String(origin.value))return;
 if(!confirm('Restaurar o texto-base original deste campo? O texto atual ficará disponível em “Restaurar anterior”.'))return;
 pushHistory(signature(control),control.value);
 setText(control,origin.value);
}
function promptFor(control){
 const c=context(),f=c.phrase||{},field=fieldName(control);
 const base=[
  'Você está auxiliando um revisor técnico do Guia Estadual de Avaliação do Risco Sanitário de envasadoras de água mineral natural/água natural, na revisão APPCC.',
  'OBJETIVO: redigir uma sugestão CURTA, OBJETIVA e tecnicamente precisa para o campo indicado, em português do Brasil.',
  'Produza de uma a três frases, preferencialmente até 330 caracteres, em texto corrido, sem saudações nem comentários introdutórios.',
  'Não invente legislação, limites críticos, resultados, frequência de monitoramento, documentos, análises, evidências ou validações.',
  'Se faltarem dados para afirmar eficácia, conformidade, perigo significativo ou PCC/PPRO confirmado, escreva a ressalva objetivamente.',
  'Não altere o conteúdo obrigatório do texto normativo; para textos normativos, sugira somente ajuste editorial sem ampliar ou reduzir requisitos.',
  'Não atribua automaticamente PCC ou PPRO: respeite o fluxo de decisões e a necessidade de comprovação.',
  'Processo: '+(f.processo||'Não informado'),
  'Item: '+(f.item||'Não informado')+'; frase: '+(f.indice??'?'),
  'Texto da frase: '+(f.frase||'Não disponível'),
  'Perigo identificado: '+(f.perigo||'Não informado'),
  'Medida preventiva/de controle: '+(f.medida||'Não informada'),
  'Campo a revisar: '+field,
  'Texto atual do campo:\n'+(control.value||'[Sem texto informado]'),
  'Responda apenas com a sugestão pronta para o campo.'
 ];
 return base.join('\n');
}
function ensureDialog(){
 if(modal)return modal;
 modal=document.createElement('dialog');modal.id='geminiAssistDialog';modal.className='ai-dialog';
 modal.innerHTML='<h2>Consultar IA Google · Gemini</h2>'
 +'<p class="ai-hint">O Gemini é um serviço externo. <b>Nada é enviado automaticamente.</b> Confira e retire nomes, dados pessoais ou informações sigilosas antes de copiar. A resposta da IA é uma sugestão e <b>não constitui evidência técnica nem validação sanitária</b>.</p>'
 +'<label for="geminiPrompt">Consulta preparada (editável)</label><textarea id="geminiPrompt"></textarea>'
 +'<div class="ai-dialog-actions"><button type="button" id="geminiCopy">1 · Copiar consulta</button><button type="button" id="geminiOpen" class="ai-open-google">2 · Abrir Gemini ↗</button></div>'
 +'<label for="geminiSuggestion">3 · Cole abaixo a sugestão recebida no Gemini</label><textarea id="geminiSuggestion" placeholder="Cole aqui a redação sugerida. Revise antes de aplicar."></textarea>'
 +'<div class="ai-dialog-actions"><button type="button" id="geminiApply">Aplicar ao campo</button><button type="button" id="geminiClose">Cancelar / Fechar</button></div>'
 +'<p id="geminiMessage" aria-live="polite" class="ai-hint">As respostas não são transferidas automaticamente do Gemini. Você escolhe quando aplicar.</p>';
 document.body.appendChild(modal);
 modal.querySelector('#geminiClose').onclick=()=>modal.close();
 modal.querySelector('#geminiCopy').onclick=async()=>{
  const text=modal.querySelector('#geminiPrompt').value;
  try{await navigator.clipboard.writeText(text);say('Consulta copiada. Abra o Gemini e cole a pergunta.');}
  catch(_){const box=modal.querySelector('#geminiPrompt');box.focus();box.select();const done=document.execCommand?.('copy');say(done?'Consulta copiada.':'Selecione e copie o texto manualmente.');}
 };
 modal.querySelector('#geminiOpen').onclick=()=>{
  const link=document.createElement('a');
  link.href='https://gemini.google.com/app';
  link.target='_blank';link.rel='noopener noreferrer';
  document.body.appendChild(link);link.click();link.remove();
  say('O Gemini será aberto em nova aba. Cole a consulta copiada e, depois, a resposta no campo 3.');
 };
 modal.querySelector('#geminiApply').onclick=()=>{
  if(!activeTarget||!document.contains(activeTarget)){say('O campo de origem mudou. Feche a consulta e abra o campo novamente.');return;}
  const key=signature(activeTarget);
  if(key!==activeKey){say('Você selecionou outra frase. Retorne à frase original antes de aplicar.');return;}
  const suggestion=modal.querySelector('#geminiSuggestion').value.trim();
  if(!suggestion){say('Cole primeiro a sugestão do Gemini, depois revise e aplique.');return;}
  if(activeTarget.value!==suggestion){pushHistory(key,activeTarget.value);setText(activeTarget,suggestion);}
  modal.close();
 };
 return modal;
}
function say(message){const info=modal?.querySelector('#geminiMessage');if(info)info.textContent=message;}
function openConsult(control){
 activeTarget=control;activeKey=signature(control);activeName=fieldName(control);
 if(!activeKey)return;
 pushHistory(activeKey,control.value);
 const dialog=ensureDialog();
 dialog.querySelector('#geminiPrompt').value=promptFor(control);
 dialog.querySelector('#geminiSuggestion').value='';
 say('Campo selecionado: '+activeName+'. Você controla o que será copiado e aplicado.');
 if(!dialog.open)dialog.showModal();
}
function enhance(control){
 if(prepared.has(control)||control.readOnly)return;
 prepared.add(control);
 const tools=document.createElement('div');tools.className='ai-field-tools';tools.setAttribute('role','group');tools.setAttribute('aria-label','Assistência e restauração do campo');
 const consult=document.createElement('button');consult.className='ai-open-google';consult.type='button';consult.textContent='✦ Consultar IA Google';consult.title='Preparar consulta curta ao Gemini';
 const prev=document.createElement('button');prev.type='button';prev.textContent='↶ Restaurar anterior';prev.title='Recuperar o texto anterior deste campo';
 const orig=document.createElement('button');orig.type='button';orig.textContent='↺ Restaurar original';orig.className='ai-original';orig.title='Recuperar o texto-base original do Guia';
 tools.append(consult,prev,orig);control.insertAdjacentElement('afterend',tools);
 consult.onclick=()=>openConsult(control);
 prev.onclick=()=>restorePrevious(control);
 orig.onclick=()=>restoreOriginal(control);
 control.addEventListener('focus',()=>{control.__aiInitial=control.value;control.__aiCaptureKey=signature(control);control.__aiCaptured=false;});
 control.addEventListener('input',()=>{
   if(applying.has(control))return;
   const key=signature(control);
   if(!key)return;
   if(control.__aiCaptureKey!==key){control.__aiInitial=control.defaultValue||'';control.__aiCaptured=false;control.__aiCaptureKey=key;}
   if(!control.__aiCaptured&&control.value!==control.__aiInitial){
      pushHistory(key,control.__aiInitial);
      control.__aiCaptured=true;
   }
 });
 control.addEventListener('blur',()=>{control.__aiCaptured=false;});
}
let queued=false;
function enhanceAll(){
 queued=false;
 document.querySelectorAll(fieldRoot).forEach(enhance);
}
function schedule(){
 if(queued)return;queued=true;queueMicrotask(enhanceAll);
}
function init(){
 enhanceAll();
 for(const name of ['analysisView','configView']){
   const root=document.getElementById(name);
   if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
