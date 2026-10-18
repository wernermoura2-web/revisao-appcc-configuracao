/* Gemini para decisões A-I e Q1-Q4. Apoio assistido: a IA não decide ou altera o fluxo automaticamente. */
(function(){
'use strict';
const GROUPS=['questions1','questions2','questionsEurest'];
const RETURN_KEY='appccGeminiQuestionReturn_v1';
const prepared=new WeakSet();
let dialog=null,active=null,queued=false;
const byId=id=>document.getElementById(id);
const context=()=>window.APPCC_EDITOR_BRIDGE?.context?.()||{};
const nameOf=code=>String(code||'').trim();
const questionRow=(group,code)=>[...(byId(group)?.querySelectorAll('.question')||[])]
  .find(row=>nameOf(row.querySelector('strong')?.textContent)===code);
const isActive=row=>!!row&&!row.classList.contains('disabled')&&!!row.querySelector('input[type="radio"]:not(:disabled)');
const rowAnswer=row=>row?.querySelector('input[type="radio"]:checked')?.value||'';
const answerText=value=>value==='S'?'SIM':value==='N'?'NÃO':'NÃO RESPONDIDA';
function allAnswers(){
 const entries=[];
 for(const group of GROUPS){
  const stage=group==='questions1'?'Tabela 1':group==='questions2'?'Tabela 2':'Tabela 3';
  for(const row of byId(group)?.querySelectorAll('.question')||[]){
   const code=nameOf(row.querySelector('strong')?.textContent);
   if(isActive(row)&&code)entries.push(stage+' '+code+': '+answerText(rowAnswer(row)));
  }
 }
 return entries.length?entries.join('; '):'Nenhuma pergunta aplicável respondida.';
}
function promptFor(row,group,code){
 const ctx=context(),f=ctx.phrase||{},d=ctx.classificacao||{};
 const question=row.querySelector('.question-title')?.textContent?.trim()||'Pergunta não identificada';
 const evid=byId('analysisView')?.querySelector('[data-field="evidencias"]')?.value||'';
 const just=byId('analysisView')?.querySelector('[data-field="justificativa_revisao"]')?.value||'';
 const stage=group==='questions1'?'Tabela 1':group==='questions2'?'Tabela 2':'Tabela 3 (árvore Q1–Q4)';
 return [
 'Atue como consultor técnico em APPCC aplicado ao Guia Estadual de Avaliação do Risco Sanitário de envasadoras de água mineral natural/água natural.',
 'Analise UMA pergunta da árvore de decisão. Não decida outras perguntas. Explique de forma curta e objetiva.',
 'Responda SIM ou NÃO somente se o contexto informado permitir a conclusão técnica. Caso faltem informações, responda INDETERMINADO.',
 'Diferencie descrição normativa, exemplos e hipóteses da comprovação de implementação na unidade inspecionada. Não presuma que um controle foi implantado ou validado porque consta do guia.',
 'Para Q2, peça comprovação da implantação real; para Q4, avalie viabilidade de limite crítico mensurável e monitoramento oportuno. PCC ou PPRO não são homologados por IA.',
 'Não invente legislação, resultado de análise, evidência de inspeção, limite crítico ou validação. Nunca afirme conformidade sem documento/observação verificável.',
 'Considere a matriz vigente: PPHO=1, PPR=2, PC=3, PPRO=4, PCC=5; probabilidade de 1 a 5. Use apenas se for realmente relevante à pergunta.',
 'Dados da frase do GUIA (não equivalem a evidência da unidade):',
 'Processo: '+(f.processo||'Não informado'),
 'Item: '+(f.item||'Não informado')+'; frase: '+(f.indice??'?'),
 'Descritor: '+(f.frase||'Não informado'),
 'Perigo identificado: '+(f.perigo||'Não informado'),
 'Medida preventiva/de controle: '+(f.medida||'Não informada'),
 'Classificação calculada até aqui: '+(d.classe||'Pendente')+' ('+(d.estado||'em análise')+').',
 'Respostas atuais de perguntas aplicáveis: '+allAnswers(),
 'Textos registrados no campo de evidências (CONFIRMAR se são efetivas evidências ou apenas exemplos): '+(evid||'Não informado'),
 'Justificativa atual do revisor: '+(just||'Não informada'),
 'PERGUNTA ESPECÍFICA: '+stage+' — '+code+': '+question,
 'Responda EXATAMENTE em três linhas:',
 'RESPOSTA: SIM, NÃO ou INDETERMINADO',
 'JUSTIFICATIVA: uma frase curta, até 240 caracteres',
 'EVIDÊNCIA NECESSÁRIA: o que verificar para confirmar a resposta, até 180 caracteres'
 ].join('\n').slice(0,12000);
}
function parsedAnswer(text){
 const match=String(text||'').match(/^\s*(?:\*{0,2})?RESPOSTA(?:\*{0,2})?\s*:\s*(SIM|N[ÃA]O|INDETERMINADO)\b/im);
 if(!match)return '';
 return match[1].toUpperCase()==='SIM'?'S':/^N[ÃA]O$/i.test(match[1])?'N':'I';
}
function msg(text){
 const node=dialog?.querySelector('#qaiMessage');
 if(node)node.textContent=text;
}
function ensureDialog(){
 if(dialog)return dialog;
 dialog=document.createElement('dialog');
 dialog.className='qai-dialog';
 dialog.id='appccQuestionGeminiDialog';
 dialog.innerHTML=[
 '<h2>Consultar Gemini · Pergunta APPCC</h2>',
 '<p class="qai-hint">O Gemini é externo: a consulta e a resposta são copiadas manualmente. <b>A decisão é do revisor.</b> Não envie dados pessoais ou sigilosos.</p>',
 '<p class="qai-subject" id="qaiSubject"></p>',
 '<label for="qaiPrompt">Consulta preparada para o Gemini</label><textarea id="qaiPrompt" rows="7"></textarea>',
 '<div class="qai-actions"><button type="button" id="qaiCopyPrompt">1 · Copiar consulta</button><button type="button" id="qaiOpenGemini">2 · Abrir Gemini ↗</button><button type="button" id="qaiOpenTab">Abrir em outra aba</button></div>',
 '<p class="qai-return"><b>Para voltar:</b> copie a resposta no Gemini e use a seta Voltar do Android. Se o Gemini abrir como aplicativo, use Aplicativos recentes e selecione Revisão APPCC. Depois cole a resposta aqui.</p>',
 '<label for="qaiReply">3 · Resposta do Gemini (cole aqui)</label><textarea id="qaiReply" rows="5" placeholder="RESPOSTA: INDETERMINADO\nJUSTIFICATIVA: ...\nEVIDÊNCIA NECESSÁRIA: ..."></textarea>',
 '<div class="qai-actions"><button type="button" id="qaiPaste">Colar resposta copiada</button></div>',
 '<label for="qaiJustification">Justificativa gerada — revise ou edite antes de salvar</label><textarea id="qaiJustification" rows="3" placeholder="Justificativa específica desta pergunta"></textarea>',
 '<label for="qaiEvidence">Evidência necessária — revise ou complemente</label><textarea id="qaiEvidence" rows="2" placeholder="Documento, registro ou verificação necessária"></textarea>',
 '<div class="qai-actions"><button type="button" id="qaiSaveNotes">Salvar justificativa sem marcar Sim/Não</button></div>',
 '<p class="qai-extracted" id="qaiExtracted">A sugestão aparecerá aqui. Examine a justificativa antes de marcar Sim ou Não.</p>',
 '<fieldset class="qai-review"><legend>4 · Decisão do revisor (obrigatória para alterar a resposta)</legend>',
 '<label><input type="radio" name="qaiChoice" value="S"> Confirmar SIM</label>',
 '<label><input type="radio" name="qaiChoice" value="N"> Confirmar NÃO</label>',
 '<label><input type="radio" name="qaiChoice" value="I"> Sem resposta: faltam evidências</label></fieldset>',
 '<div class="qai-actions"><button type="button" id="qaiApply" class="qai-apply">Aplicar decisão revisada</button><button type="button" id="qaiClose">Fechar sem alterar</button></div>',
 '<p class="qai-hint" id="qaiMessage" role="status">Uma sugestão não substitui inspeção, documentos ou aprovação técnica.</p>'
 ].join('');
 document.body.appendChild(dialog);
 dialog.querySelector('#qaiClose').onclick=()=>dialog.close();
 dialog.querySelector('#qaiCopyPrompt').onclick=async()=>{
  const area=dialog.querySelector('#qaiPrompt');
  try{await navigator.clipboard.writeText(area.value);msg('Consulta copiada. Cole no Gemini e envie.');}
  catch(_){area.focus();area.select();msg('Selecione e copie a consulta manualmente.');}
 };
 dialog.querySelector('#qaiOpenGemini').onclick=()=>{
  rememberReturn();
  // A navegação pela mesma janela permite tentar retornar com o botão Voltar do Android.
  window.location.assign('https://gemini.google.com/app');
 };
 dialog.querySelector('#qaiOpenTab').onclick=()=>{
  rememberReturn();
  window.open('https://gemini.google.com/app','_blank','noopener,noreferrer');
  msg('Gemini aberto. Use Aplicativos recentes ou Abas para retornar ao Guia APPCC.');
 };
 dialog.querySelector('#qaiPaste').onclick=async()=>{
  try{const value=await navigator.clipboard.readText();if(value){dialog.querySelector('#qaiReply').value=value;updateParsed();}else msg('A área de transferência está vazia. Cole a resposta manualmente.');}
  catch(_){msg('O navegador bloqueou a leitura automática. Toque no campo de resposta e escolha Colar.');}
 };
 dialog.querySelector('#qaiReply').addEventListener('input',updateParsed);
 dialog.querySelector('#qaiSaveNotes').onclick=()=>saveNotes(false);
 dialog.querySelector('#qaiApply').onclick=applyDecision;
 return dialog;
}
function extractFields(reply){
 const lines=String(reply||'').split(/\r?\n/),sections={justification:'',evidence:''};
 let current='';
 for(const line of lines){
  const match=line.match(/^\s*\*{0,2}(JUSTIFICATIVA|EVID[EÊ]NCIA\s+NECESS[AÁ]RIA)\*{0,2}\s*:\s*(.*)$/i);
  if(match){current=/^JUSTIFICATIVA/i.test(match[1])?'justification':'evidence';sections[current]+=(sections[current]?'\n':'')+match[2].trim();}
  else if(current&&line.trim())sections[current]+='\n'+line.trim();
 }
 return sections;
}
function saveNotes(reviewed){
 if(!active||String(context().phrase?.n)!==String(active.phraseId)){msg('Mudança de frase detectada: volte à pergunta original antes de salvar.');return false;}
 const justification=dialog.querySelector('#qaiJustification').value.trim();
 const evidence=dialog.querySelector('#qaiEvidence').value.trim();
 if(!justification&&!evidence){msg('Registre ou cole uma justificativa ou evidência antes de salvar.');return false;}
 const old=window.APPCC_EDITOR_BRIDGE?.getQuestionNote?.(active.code)||{};
 const note={justification,evidence,source:'gemini',reviewed:!!reviewed,reviewedBy:reviewed?context().revisor||'Revisor não identificado':'',reviewedAt:reviewed?new Date().toISOString():'',suggestedAnswer:parsedAnswer(dialog.querySelector('#qaiReply').value)||old.suggestedAnswer||''};
 window.APPCC_EDITOR_BRIDGE?.setQuestionNote?.(active.code,note);
 const row=questionRow(active.group,active.code);
 const j=row?.querySelector('[data-question-justification]');
 const e=row?.querySelector('[data-question-evidence]');
 if(j)j.value=justification;
 if(e)e.value=evidence;
 const status=row?.querySelector('.question-note-status');
 if(status)status.textContent=reviewed?'Conferida pelo revisor':'Sugestão Gemini — pendente de revisão';
 msg(reviewed?'Justificativa e decisão registradas.':'Justificativa registrada; resposta Sim/Não não foi alterada.');
 return true;
}
function updateParsed(){
 const result=parsedAnswer(dialog.querySelector('#qaiReply').value);
 const desc=result==='S'?'SIM':result==='N'?'NÃO':result==='I'?'INDETERMINADO':'não identificada no formato esperado';
 dialog.querySelector('#qaiExtracted').textContent='Sugestão extraída do Gemini: '+desc+'. Confira e edite os campos antes de salvar; nenhuma resposta é marcada automaticamente.';
 const parts=extractFields(dialog.querySelector('#qaiReply').value);
 dialog.querySelector('#qaiJustification').value=parts.justification;
 dialog.querySelector('#qaiEvidence').value=parts.evidence;
}
function openQuestion(row,group,code){
 if(!isActive(row))return;
 const phrase=context().phrase||{};
 if(!phrase.n)return;
 active={group,code,phraseId:phrase.n};
 const pop=ensureDialog();
 pop.querySelector('#qaiSubject').textContent=code+' — '+(row.querySelector('.question-title')?.textContent||'');
 pop.querySelector('#qaiPrompt').value=promptFor(row,group,code);
 pop.querySelector('#qaiReply').value='';
 const note=window.APPCC_EDITOR_BRIDGE?.getQuestionNote?.(code)||{};
 pop.querySelector('#qaiJustification').value=note.justification||'';
 pop.querySelector('#qaiEvidence').value=note.evidence||'';
 pop.querySelectorAll('[name="qaiChoice"]').forEach(r=>r.checked=false);
 pop.querySelector('#qaiExtracted').textContent='A sugestão aparecerá aqui. Examine a justificativa antes de marcar Sim ou Não.';
 msg('Pergunta '+code+' selecionada. Somente sua confirmação altera o Guia.');
 if(!pop.open)pop.showModal();
}
function applyDecision(){
 if(!active)return;
 const choice=dialog.querySelector('[name="qaiChoice"]:checked')?.value;
 if(!choice){msg('Selecione sua decisão: Confirmar SIM, Confirmar NÃO ou Sem resposta.');return;}
 const ctx=context().phrase||{};
 const row=questionRow(active.group,active.code);
 if(String(ctx.n)!==String(active.phraseId)||!isActive(row)){
  msg('A frase ou o caminho mudou. Retorne à pergunta aplicável antes de confirmar.');return;
 }
 const current=rowAnswer(row);
 if(choice==='I'){
  if(dialog.querySelector('#qaiJustification').value.trim()||dialog.querySelector('#qaiEvidence').value.trim())saveNotes(false);
  if(current){
   if(!confirm('A pergunta '+active.code+' já está marcada como '+answerText(current)+'. Limpar a marcação por falta de evidências? O fluxo e as validações serão recalculados.'))return;
   const clear=row.querySelector('[data-clear]');
   if(!clear||clear.disabled){msg('Não foi possível limpar a resposta neste caminho.');return;}
   clear.click();
  }
  dialog.close();return;
 }
 const radio=[...row.querySelectorAll('input[type="radio"]')].find(r=>r.value===choice&&!r.disabled);
 if(!radio){msg('Esta pergunta não está disponível no caminho atual.');return;}
 if(current===choice){if(dialog.querySelector('#qaiJustification').value.trim()||dialog.querySelector('#qaiEvidence').value.trim())saveNotes(true);dialog.close();return;}
 const warning=current?'A resposta anterior ('+answerText(current)+') será substituída. ':'';
 if(!confirm(warning+'Confirmar '+answerText(choice)+' em '+active.code+'? O fluxo APPCC será recalculado e as validações anteriores poderão ser invalidadas.'))return;
 radio.checked=true;
 radio.dispatchEvent(new Event('change',{bubbles:true}));
 if(dialog.querySelector('#qaiJustification').value.trim()||dialog.querySelector('#qaiEvidence').value.trim())saveNotes(true);
 dialog.close();
}
function enhanceQuestions(){
 for(const group of GROUPS){
  for(const row of byId(group)?.querySelectorAll('.question')||[]){
   if(prepared.has(row))continue;
   const code=nameOf(row.querySelector('strong')?.textContent);
   if(!/^(?:[A-I]|Q[1-4])$/.test(code))continue;
   prepared.add(row);
   const tools=document.createElement('div');
   tools.className='qai-question-tools';
   const button=document.createElement('button');
   button.type='button';
   button.className='qai-question-button';
   button.textContent='✦ Consultar Gemini sobre '+code;
   button.disabled=!isActive(row);
   button.setAttribute('aria-label','Pedir ajuda do Gemini para responder Sim ou Não à pergunta '+code);
   button.onclick=()=>openQuestion(row,group,code);
   tools.appendChild(button);
   row.appendChild(tools);
  }
 }
}
function scheduleEnhance(){
 if(queued)return;
 queued=true;
 queueMicrotask(()=>{queued=false;enhanceQuestions();});
}
function rememberReturn(){
 if(!active)return;
 const read=id=>byId(id)?.value||'';
 const data={process:read('processSelect'),item:read('itemSelect'),phrase:read('phraseSelect'),
   group:active.group,code:active.code,phraseId:active.phraseId};
 try{sessionStorage.setItem(RETURN_KEY,JSON.stringify(data));}
 catch(_){msg('Retorne pela lista Aplicativos recentes do Android.');}
}
function resumeReturn(){
 let data;
 try{data=JSON.parse(sessionStorage.getItem(RETURN_KEY)||'null');}catch(_){return;}
 if(!data)return;
 if(dialog?.open&&active?.phraseId===data.phraseId&&active?.code===data.code){
  sessionStorage.removeItem(RETURN_KEY);
  msg('De volta ao Guia APPCC. Cole a resposta do Gemini e confirme sua escolha.');
  return;
 }
 const select=(id,value)=>{
  const control=byId(id);
  if(control&&value&&[...control.options].some(o=>o.value===value)){
   control.value=value;control.dispatchEvent(new Event('change',{bubbles:true}));
  }
 };
 select('processSelect',data.process);
 select('itemSelect',data.item);
 select('phraseSelect',data.phrase);
 byId('modeAppcc')?.click();
 const row=questionRow(data.group,data.code);
 if(isActive(row)&&String(context().phrase?.n)===String(data.phraseId)){
  sessionStorage.removeItem(RETURN_KEY);
  openQuestion(row,data.group,data.code);
  msg('Você voltou à pergunta '+data.code+'. Cole a resposta e escolha Sim ou Não após a revisão.');
 }
}
function init(){
 enhanceQuestions();
 const view=byId('analysisView');
 if(view)new MutationObserver(scheduleEnhance).observe(view,{subtree:true,childList:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.addEventListener('pageshow',()=>requestAnimationFrame(resumeReturn));
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&dialog?.open)resumeReturn();});
})();