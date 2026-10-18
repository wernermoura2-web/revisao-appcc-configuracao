/* Extensões: relatório gráfico APPCC; consulta Gemini assistida; versões de texto. */
(function(){
'use strict';
const escape=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const answer=v=>v==='S'?'SIM':v==='N'?'NÃO':'—';
const names1={A:'Perigo significativo?',B:'Medida preventiva disponível?',C:'Etapa criada para controlar?',D:'Pode atingir nível inaceitável?',E:'Barreira eficaz posterior?'};
const names2={F:'Controle operacional significativo?',G:'Limpeza/desinfecção direta?',H:'Condição básica ou suporte?',I:'Controle específico de apoio?'};
const names3={Q1:'Medida necessária nesta etapa?',Q2:'Medida já implementada?',Q3:'Falha ameaça segurança?',Q4:'Limite crítico mensurável?'};
const namesCriteria={eficacia:'Eficácia comprovada',limite:'Limite crítico / critério de ação',monitoramento:'Monitoramento oportuno',correcao:'Correções e ações corretivas',produto:'Tratamento do produto',registros:'Registros e verificação'};
const weights={PPHO:1,PPR:2,PC:3,PPRO:4,PCC:5};
const stateType=v=>v==='S'?'vf-yes':v==='N'?'vf-no':'vf-blank';
const stat=d=>d.classe?d.classe+(d.estado==='confirmado'?' CONFIRMADO':d.estado==='classificado'?' CLASSIFICADO':d.estado==='conferido'?' CONFERIDO':' CANDIDATO'):'PENDENTE';
const box=(title,value)=>'<div class="vf-textbox"><b>'+escape(title)+'</b><div class="vf-content">'+escape(value||'—')+'</div></div>';
function stepNode(key,title,val,isActive,last){
  return '<div class="vf-node '+(!isActive?'vf-off':stateType(val))+(last?'':' vf-next')+'"><div class="vf-node-line"><b>'+escape(key)+'</b><span>'+escape(isActive?answer(val):'N/A')+'</span></div>'
    +'<div class="vf-node-title">'+escape(title)+'</div></div>';
}
function stage(no,title,subtitle,names,values,applicable,result,skip){
  const keys=Object.keys(names);
  return '<section class="vf-stage'+(skip?' vf-skipped':'')+'"><header><strong class="vf-num">'+no+'</strong><div><b>'+escape(title)+'</b><small>'+escape(subtitle)+'</small></div></header>'
    +'<div class="vf-nodes">'+keys.map((key,i)=>stepNode(key,names[key],values[key],!!applicable[key],i===keys.length-1)).join('')+'</div>'
    +'<div class="vf-outcome">'+escape(result)+'</div></section>';
}
function visualReport(c){
  const f=c.f,q=c.q,d=c.dd,ed=c.ed,criterionTexts=c.criterionTexts||{},criteria=c.criteria||{},eur=c.eurQ||{},active=c.applicable||{};
  const ec=d.route==='3'?d.eur.active||{}:{};
  const confirmed=['confirmado','conferido','classificado'].includes(d.estado);
  const after=c.after||f.appcc_proposto||'';
  const nc=weights[after]||0;
  const label=(v)=>escape(v==null?'—':v);
  const p24=f.probabilidade_24;
  const value=(labelName,value)=>'<div><small>'+escape(labelName)+'</small><strong>'+label(value)+'</strong></div>';
  const summary='<div class="vf-summary">'
    +value('APPCC antes',f.appcc_inicial||'—')+value('APPCC depois*',after)
    +value('NC',nc?nc+'/5':'—')+value('P24',p24==null?'—':p24+'/5')
    +value('NC × P24',nc&&p24!=null?nc*p24:'—')
    +'<div class="vf-result '+(confirmed?'vf-complete':'')+'"><small>Resultado</small><strong>'+escape(stat(d))+'</strong></div></div>';
  const stage1=d.t1?.classe?d.t1.classe+' candidato':d.t1?.estado==='encaminhar'?'Encaminhar à Tabela 2':'Em avaliação';
  const stage2=d.t2?.classe?d.t2.classe+(d.t2.estado==='candidato'?' candidato':' classificado'):d.t2?.estado==='nao_aplicavel'?'Não aplicável':'Em avaliação';
  const stage3=d.route==='3'?(d.classe?stat(d):'PCC/PPRO a definir'):'Não aplicável';
  const criterion=Object.keys(namesCriteria).map(key=>
    '<div class="vf-criterion '+stateType(criteria[key])+'"><div><b>'+escape(namesCriteria[key])+'</b><span>'+answer(criteria[key])+'</span></div>'
     +'<p>'+escape(criterionTexts[key]||'Sem justificativa preenchida.')+'</p></div>').join('');
  const approval=d.route==='3'?(ed.aprovacao?'Aprovação técnica registrada':'Aprovação técnica pendente')
    :d.estado==='conferido'?'Conferência do revisor registrada':'Tabela 3 não exigida';
  return '<article class="print-page vf-report" data-part="analysis">'
    +'<div class="vf-head"><div><small>GUIA ESTADUAL • REVISÃO APPCC • REV.6 / V82.55</small><h2>Fluxograma da decisão sanitária</h2><p>'+escape(f.processo)+' · Item '+escape(f.item)+' · Frase '+escape(f.indice)+'</p></div><div class="vf-person"><b>Revisor: '+escape(c.reviewer||'Não informado')+'</b><span>'+escape(c.date||'Data não informada')+'</span></div></div>'
    +summary
    +'<div class="vf-phrase"><b>Frase avaliada</b><span>'+escape(f.frase)+'</span></div>'
    +'<div class="vf-context">'+box('Perigo identificado',f.perigo)+box('Medida de controle',f.medida)+'</div>'
    +'<div class="vf-path"><b>PASSO A PASSO</b><span>'+escape(d.origem||'Tabela 1 / Tabela 2')+' → '+(d.route==='3'?'Árvore Q1–Q4':'Controle de base')+' → '+escape(stat(d))+'</span></div>'
    +'<div class="vf-stages">'
    +stage('1','TABELA 1','Identificação do perigo',names1,q,active,stage1,false)
    +stage('2','TABELA 2','Controle de base / PPRO',names2,q,active,stage2,d.route==='3'&&d.origem?.startsWith('Tabela 1'))
    +stage('3','TABELA 3','Q1 → Q2 → Q3 → Q4',names3,eur,ec,stage3,d.route!=='3')
    +'</div>'
    +'<div class="vf-validation"><div class="vf-validation-title"><b>SEIS CRITÉRIOS DE VALIDAÇÃO DA TABELA 3</b><span>'+escape(approval)+'</span></div>'
    +'<div class="vf-criteria">'+criterion+'</div></div>'
    +'<div class="vf-notes">'+box('Evidências da inspeção',f.evidencias)
    +box('Observações / justificativa da revisão',ed.justificativa_revisao)
    +box('Fundamentação da aprovação',d.route==='3'?ed.notaAprovacao:ed.t2Nota)+'</div>'
    +'<div class="vf-foot"><span>* Antes da homologação, o resultado é proposta da revisão. Textos orientadores não são evidências comprovadas.</span><span>COOVFA · uma frase por página</span></div></article>';
}
function fitVisual(){
  for(const root of document.querySelectorAll('#printArea .vf-report')){
    let scale=1;
    for(let i=0;i<10;i++){
      root.style.setProperty('--vf-scale',String(scale));
      const blocks=[...root.querySelectorAll('.vf-content,.vf-criterion p,.vf-phrase span')];
      if(root.scrollHeight<=root.clientHeight+2 && blocks.every(n=>n.scrollHeight<=n.clientHeight+1))break;
      scale-=.04;
    }
    if(root.scrollHeight>root.clientHeight+3)root.setAttribute('data-overflow','1');
  }
}
let host=null,activeField=null,activeKey='',modal=null,restoring=false;
const focusStart=new WeakMap();
const identify=t=>t.dataset.field?'field:'+t.dataset.field
  :t.dataset.criterionText?'criterion:'+t.dataset.criterionText
  :t.dataset.docField?'doc:'+(t.closest('[data-doc]')?.dataset.doc||'0')+':'+t.dataset.docField
  :['approvalNote','table2Note'].includes(t.id)?'field:'+t.id:null;
function fieldLabel(t){
  const p=t.closest('.criterion,.doc-card,.field-box,.config-column,.evidence');
  return (t.previousElementSibling?.matches('label')?t.previousElementSibling:p?.querySelector('label'))?.textContent?.trim()
    ||t.dataset.field||t.dataset.criterionText||t.id||'Campo de revisão';
}
function notification(msg){
  let n=document.getElementById('geminiToolsNotice');
  if(!n){n=document.createElement('div');n.id='geminiToolsNotice';document.body.append(n)}
  n.textContent=msg;n.hidden=false;clearTimeout(notification.timer);
  notification.timer=setTimeout(()=>n.hidden=true,4500);
}
function makePrompt(t){
  const ctx=host.current();
  const answers=[...document.querySelectorAll('#analysisView .question:not(.disabled)')]
    .map(q=>{const name=q.querySelector('strong')?.textContent?.trim();
       const v=q.querySelector('input[type=radio]:checked')?.value;
       return v?name+'='+answer(v):''}).filter(Boolean).join(', ');
  return [
    'Atue como revisor técnico de um guia estadual APPCC para envasadoras de água mineral natural.',
    'Proponha somente texto curto e objetivo (até 60 palavras) para o campo indicado.',
    'Não invente evidências, laudos, datas ou não conformidades; quando faltarem dados, diga o que deve ser verificado.',
    'Não confirme PCC ou PPRO automaticamente; preserve os limites entre classificação preliminar e validação.',
    'Processo: '+ctx.processo+'; Item: '+ctx.item+'; Frase: '+ctx.indice,
    'Descritor: '+ctx.frase,
    'Classificação APPCC: '+ctx.status,
    'Respostas disponíveis: '+(answers||'Ainda não preenchidas'),
    'Campo: '+fieldLabel(t),
    'Texto atual (rascunho): '+(t.value||'(vazio)'),
    'Responda em português brasileiro apenas com a sugestão, sem prefácio.'
  ].join('\n\n').slice(0,9000);
}
function showDialog(){
  if(modal)return modal;
  modal=document.createElement('dialog');modal.className='gemini-tool-dialog';
  modal.innerHTML='<form method="dialog"><h2>Consultar IA Google — Gemini</h2>'
    +'<p>A consulta é preparada aqui. Nenhum dado é enviado automaticamente. Confira e retire informações sigilosas.</p>'
    +'<label>Consulta preparada</label><textarea id="geminiPromptText" rows="8"></textarea>'
    +'<div class="gemini-dialog-actions"><button type="button" id="geminiCopyPrompt">Copiar consulta</button><button type="button" id="geminiOpenPage">Abrir Gemini ↗</button></div>'
    +'<label>Resposta sugerida — cole aqui para conferir</label><textarea id="geminiProposedAnswer" rows="5" placeholder="Cole o texto gerado e revise antes de aplicar..."></textarea>'
    +'<div class="gemini-dialog-actions"><button type="button" id="geminiApplyText">Aplicar resposta</button><button type="submit" class="btn-outline">Fechar</button></div></form>';
  document.body.append(modal);
  modal.querySelector('#geminiCopyPrompt').onclick=async()=>{
    const content=modal.querySelector('#geminiPromptText').value;
    try{await navigator.clipboard.writeText(content);notification('Consulta copiada.');}
    catch{const t=modal.querySelector('#geminiPromptText');t.focus();t.select();notification('Selecione e copie a consulta.');}
  };
  modal.querySelector('#geminiOpenPage').onclick=()=>{
    window.open('https://gemini.google.com/app','_blank','noopener,noreferrer');
    notification('Cole a consulta no Gemini; depois revise a resposta.');
  };
  modal.querySelector('#geminiApplyText').onclick=()=>{
    const val=modal.querySelector('#geminiProposedAnswer').value.trim();
    if(!val){notification('Cole e confira a resposta antes de aplicar.');return;}
    if(!activeField?.isConnected){notification('O campo mudou. Abra uma nova consulta.');return;}
    if(!confirm('Aplicar esta sugestão no campo? O texto anterior poderá ser restaurado.'))return;
    host.snapshot(activeKey,activeField.value);
    restoring=true;activeField.value=val;activeField.dispatchEvent(new Event('input',{bubbles:true}));restoring=false;
    modal.close();notification('Sugestão aplicada ao campo; confira a exatidão técnica.');
  };
  return modal;
}
function enhance(){
  for(const t of document.querySelectorAll('.workspace textarea')){
    const key=identify(t);if(!key||t.dataset.geminiToolReady)continue;
    t.dataset.geminiToolReady='1';
    const bar=document.createElement('div');bar.className='gemini-tools';
    bar.innerHTML='<button type="button" data-action="gemini">✧ Consultar IA Google</button><button type="button" data-action="restore">↶ Restaurar texto anterior</button>';
    t.insertAdjacentElement('afterend',bar);
    t.addEventListener('focus',()=>focusStart.set(t,{key,value:t.value,saved:false}));
    t.addEventListener('input',()=>{
      if(restoring)return;
      const entry=focusStart.get(t);if(!entry||entry.saved||entry.value===t.value)return;
      host.snapshot(entry.key,entry.value);entry.saved=true;
    },true);
    t.addEventListener('blur',()=>focusStart.delete(t));
    bar.querySelector('[data-action=gemini]').onclick=()=>{
      activeField=t;activeKey=key;
      const dialog=showDialog();
      dialog.querySelector('#geminiPromptText').value=makePrompt(t);
      dialog.querySelector('#geminiProposedAnswer').value='';
      dialog.showModal();
    };
    bar.querySelector('[data-action=restore]').onclick=()=>{
      const previous=host.peek(key);
      const initial=host.original(key);
      const value=previous!==undefined?previous:initial;
      if(value===undefined||String(value)===t.value){notification('Não foi encontrado texto anterior diferente.');return;}
      if(!confirm('Restaurar '+(previous!==undefined?'texto anterior salvo':'texto-base original')+' neste campo?'))return;
      if(previous!==undefined)host.pop(key);
      restoring=true;t.value=String(value);t.dispatchEvent(new Event('input',{bubbles:true}));restoring=false;
      notification('Texto anterior restaurado.');t.focus();
    };
  }
}
function initEditor(delegates){
  host=delegates;enhance();
  const container=document.querySelector('.workspace');
  if(container)new MutationObserver(()=>enhance()).observe(container,{subtree:true,childList:true});
}
window.APPCC_Extras={visualReport,fitVisual,initEditor};
window.addEventListener('beforeprint',fitVisual);
})();