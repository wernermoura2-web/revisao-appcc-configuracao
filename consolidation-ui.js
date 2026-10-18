/* Painel de importação, seleção por frase/item/indicador e consolidação. */
(function(){
'use strict';
const core=window.APPCC_CONSOLIDATOR,bridge=window.APPCC_GUIDE_BRIDGE;
if(!core||!bridge)return;
const HIST='guia_appcc_consolidacao_historico_v1';
const MAP='guia_appcc_correspondencias_confirmadas_v1';
const clone=x=>JSON.parse(JSON.stringify(x));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>Number(x)||0;
const storage=(k,def)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??def}catch(_){return def}};
const readStates=()=>({bpf:core.normalizeState(storage(core.keys.bpf,{})),leg:core.normalizeState(storage(core.keys.leg,{}))});
let incoming=[],originals=[],dialog,previewCounter=0;
const panel=document.createElement('section');
panel.className='panel consol-panel';
panel.innerHTML='<h2>4 · Importar e consolidar</h2>'
 +'<p class="hint">Escolha quais frases, itens ou indicadores dos arquivos preenchidos serão incorporados. Os demais registros não são substituídos.</p>'
 +'<div class="consol-start"><button id="consolImportOpen" type="button">Importar e selecionar informações</button>'
 +'<button id="consolDownloadCurrent" type="button">Baixar versão consolidada</button></div>';
const transferPanel=document.querySelector('.transfer-panel');
if(transferPanel)transferPanel.insertAdjacentElement('afterend',panel);
else document.querySelector('#phraseSelect')?.closest('.panel')?.insertAdjacentElement('afterend',panel);
function download(data){
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='APPCC_Consolidado_'+new Date().toISOString().slice(0,10)+'.json';
 document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(url);a.remove()},1500);
}
function currentBundle(){
 bridge.save();
 return core.packageBundle(readStates(),storage(HIST,[]).slice(-300),
   originals.flatMap(x=>x.legacyInspection||[]));
}
function exportCurrent(){download(currentBundle());note('Versão única exportada, com as duas revisões e histórico de consolidação.');}
function note(message,kind='info'){
 const el=dialog?.querySelector('#consolStatus');
 if(el){el.textContent=message;el.dataset.kind=kind;}
}
function create(){
 if(dialog)return dialog;
 dialog=document.createElement('dialog');dialog.id='appccConsolidationDialog';dialog.className='consol-dialog';
 dialog.innerHTML=[
 '<h2>Importar e consolidar revisões APPCC</h2>',
 '<p class="consol-desc">Escolha os arquivos preenchidos, marque apenas as frases, os itens ou os indicadores desejados e confirme o destino. Um arquivo consolidado reunirá as duas revisões, mantendo seus registros separados por guia.</p>',
 '<label class="consol-file-label">1 · Adicionar arquivos JSON preenchidos',
 '<input id="consolFiles" type="file" accept=".json,application/json" multiple></label>',
 '<div class="consol-actions"><button id="consolLocal" type="button">Incluir revisões salvas neste navegador</button>'
 +'<button id="consolClear" type="button">Limpar seleção</button></div>',
 '<div id="consolFileInfo" class="consol-files" aria-live="polite"></div>',
 '<div class="consol-settings"><label>2 · Guia que receberá os dados'
 +'<select id="consolTarget"><option value="leg">Guia APPCC Legislação</option><option value="bpf">Guia APPCC/BPF</option></select></label>'
 +'<label>Filtrar origem<select id="consolOrigin"><option value="all">Todos os arquivos</option><option value="leg">Guia APPCC Legislação</option><option value="bpf">Guia APPCC/BPF</option></select></label></div>',
 '<p class="consol-hint">3 · Selecione uma ou mais frases, ou marque o item/indicador inteiro. Abra cada grupo para conferir as frases. Por segurança, nenhum registro vem marcado.</p>',
 '<div id="consolGroups" class="consol-groups"></div>',
 '<div id="consolSummary" class="consol-summary"></div>',
 '<div id="consolStatus" class="consol-status" role="status"></div>',
 '<div class="consol-actions consol-bottom"><button id="consolSave" type="button" class="consol-primary">4 · Consolidar seleção e baixar JSON</button>'
 +'<button id="consolExport" type="button">Baixar consolidação atual</button>'
 +'<button id="consolClose" type="button">Fechar</button></div>'
 ].join('');
 document.body.append(dialog);
 dialog.querySelector('#consolClose').onclick=()=>dialog.close();
 dialog.querySelector('#consolSave').onclick=apply;
 dialog.querySelector('#consolExport').onclick=exportCurrent;
 dialog.querySelector('#consolFiles').onchange=onFiles;
 dialog.querySelector('#consolLocal').onclick=addCurrent;
 dialog.querySelector('#consolClear').onclick=()=>{incoming=[];originals=[];dialog.querySelector('#consolFileInfo').textContent='';render();note('Seleção limpa.');};
 dialog.querySelector('#consolTarget').onchange=()=>{incoming.forEach(r=>{r.target='';r.verified=false;});render();};
 dialog.querySelector('#consolOrigin').onchange=render;
 return dialog;
}
function addParsed(file,source){
 originals.push(file);
 for(const row of file.rows){
  const id='import-'+incoming.length+'-'+Date.now();
  incoming.push({id,row,selected:false,target:'',verified:false,strategy:'blank',importText:false,importProbability:false,file:source});
 }
}
async function onFiles(){
 const el=dialog.querySelector('#consolFiles');
 const files=[...el.files||[]];
 if(files.length>12){note('Escolha até 12 arquivos por vez.','error');return;}
 const ok=[],fail=[];
 for(const f of files){
  if(f.size>30*1024*1024){fail.push(f.name+': arquivo excede 30 MB');continue;}
  try{
   const payload=JSON.parse(await f.text()),parsed=core.parse(payload,f.name);
   addParsed(parsed,f.name);
   ok.push(f.name+' ('+parsed.rows.length+' frases preenchidas)');
  }catch(e){fail.push(f.name+': '+e.message);}
 }
 el.value='';
 filesList();
 render();
 note(ok.length+' arquivo(s) carregado(s). '+(fail.length?'Problemas: '+fail.join('; '):'Selecione os registros a incorporar.'),fail.length?'warning':'info');
}
function addCurrent(){
 bridge.save();
 const states=readStates(),already=new Set(originals.filter(f=>f.local).map(f=>f.sourceGuide));
 let count=0;
 for(const g of ['bpf','leg']){
  if(already.has(g))continue;
  const parsed=core.parse({...states[g],guide:g,format:g==='leg'?'APPCC-LEG-161F':'APPCC-REV6-24EN-76F'},'Revisão local '+g.toUpperCase());
  parsed.local=true;parsed.sourceGuide=g;
  addParsed(parsed,parsed.filename);count+=parsed.rows.length;
 }
 filesList();render();note('Foram adicionadas '+count+' frases preenchidas das revisões locais. Marque somente as que deseja consolidar.');
}
function filesList(){
 const el=dialog.querySelector('#consolFileInfo');
 el.innerHTML=originals.length?originals.map((f,i)=>'<div class="consol-file"><b>'+esc(f.filename)+'</b> · '+f.rows.length+' frase(s) com dados · '+esc(f.format)+'</div>').join(''):'Nenhum arquivo carregado.';
}
function displayName(f,guide){
 return (guide==='leg'?'Indicador '+(f.indicador||'?')+' · ':'')+f.item+' · Frase '+f.indice;
}
function shown(){
 const filter=dialog.querySelector('#consolOrigin').value;
 return incoming.filter(r=>filter==='all'||r.row.sourceGuide===filter);
}
function labelGroup(r){
 const f=r.row.sourcePhrase;
 return r.row.sourceGuide==='leg'?'Indicador '+f.indicador+' · '+f.grupo_legislativo+' · '+String(f.item).split(' · ')[0]:String(f.item);
}
function groupByRows(){
 const m=new Map();
 for(const x of shown()){
  const k=x.file+'|'+x.row.sourceGuide+'|'+labelGroup(x);
  if(!m.has(k))m.set(k,{key:k,file:x.file,guide:x.row.sourceGuide,label:labelGroup(x),rows:[]});
  m.get(k).rows.push(x);
 }
 return [...m.values()];
}
function render(){
 if(!dialog)return;
 const el=dialog.querySelector('#consolGroups');
 const groups=groupByRows(),total=shown().length;
 const previews=groups.map((g,i)=>'<details class="consol-group" data-cgroup="'+i+'"><summary>'
  +'<span>'+esc(g.label)+' <small>('+g.rows.length+' frase(s))</small><small> · '+esc(g.file)+'</small></span></summary>'
  +'<div class="consol-group-tools"><label><input type="checkbox" data-allgroup="'+i+'"> Selecionar todas as frases deste '+(g.guide==='leg'?'indicador':'item')+'</label></div>'
  +g.rows.map(x=>'<div class="consol-row" data-crow="'+esc(x.id)+'">'
   +'<label class="consol-row-label"><input type="checkbox" data-pick="'+esc(x.id)+'" '+(x.selected?'checked':'')+'>'
   +'<span><b>'+esc(displayName(x.row.sourcePhrase,x.row.sourceGuide))+'</b><span>'+esc(x.row.sourcePhrase.frase)+'</span></span></label>'
   +'<div class="consol-row-choices" data-cchoices="'+esc(x.id)+'"></div></div>').join('')
  +'</details>');
 el.innerHTML=previews.join('')||'<p class="consol-empty">'+(incoming.length?'Nenhuma frase para o filtro selecionado.':'Adicione um JSON ou inclua as revisões locais para escolher os dados.')+'</p>';
 for(let i=0;i<groups.length;i++){
  const g=groups[i],details=el.querySelector('[data-cgroup="'+i+'"]');
  details.open=g.rows.some(x=>x.selected);
  const all=details.querySelector('[data-allgroup]');
  all.checked=g.rows.every(x=>x.selected);
  all.onchange=()=>{for(const x of g.rows){x.selected=all.checked;x.verified=false;}render();};
 }
 for(const input of el.querySelectorAll('[data-pick]')){
  input.onchange=()=>{const x=incoming.find(r=>r.id===input.dataset.pick);if(!x)return;x.selected=input.checked;x.verified=false;render();};
 }
 for(const row of shown().filter(x=>x.selected))buildOptions(row);
 updateSummary();
}
function buildOptions(x){
 const parent=dialog.querySelector('[data-cchoices="'+x.id+'"]');
 if(!parent)return;
 const destination=dialog.querySelector('#consolTarget').value;
 const approved=storage(MAP,{});
 const ranked=core.suggestions(x.row.sourcePhrase,destination,approved);
 const primary=ranked[0];
 if(!x.target&&primary&&(primary.confirmed||primary.score>=70))x.target=String(primary.phrase.n);
 const srcFields=Object.keys(x.row.data);
 const chosen=core.catalogs[destination].find(f=>String(f.n)===String(x.target));
 const current=core.normalizeState(storage(core.keys[destination],{})).edits[chosen?.n]||{};
 const opts={strategy:x.strategy,probability:x.importProbability,text:x.importText};
 const diff=core.diff(current,x.row.data,opts);
 const willCopy=Object.keys(diff.updates);
 const collisions=diff.conflicts;
 parent.innerHTML=
  '<label>Destino sugerido (pode alterar)<select data-target="'+esc(x.id)+'"><option value="">— Escolha o destino —</option>'
  +ranked.map(o=>'<option value="'+o.phrase.n+'" '+(String(o.phrase.n)===x.target?'selected':'')+'>'
    +esc(displayName(o.phrase,destination)+' — '+o.phrase.frase.slice(0,64))+'</option>').join('')+'</select></label>'
  +'<div class="consol-recommendation">Correspondência: '+(primary?.confirmed?'confirmada anteriormente':primary?.score>=90?'alta':primary?.score>=60?'média':'verifique manualmente')
  +' · Campos preenchidos na origem: '+esc(srcFields.join(', '))+'</div>'
  +(chosen?'<div class="consol-dest-text"><b>Texto do destino:</b> '+esc(chosen.frase)+'<br><b>Probabilidade histórica:</b> '+esc(chosen.probabilidade_24??'pendente')+'/5</div>':'')
  +'<label class="consol-compare">Tratamento de conflitos<select data-policy="'+esc(x.id)+'">'
  +'<option value="blank" '+(x.strategy==='blank'?'selected':'')+'>Preencher só os campos vazios (padrão)</option>'
  +'<option value="replace" '+(x.strategy==='replace'?'selected':'')+'>Substituir os campos diferentes deste destino</option>'
  +'<option value="keep" '+(x.strategy==='keep'?'selected':'')+'>Manter o destino; não copiar esta frase</option>'
  +'</select></label>'
  +'<label class="consol-small-check"><input type="checkbox" data-copy-text="'+esc(x.id)+'" '+(x.importText?'checked':'')+'> Importar também texto alterado da frase (não substitui automaticamente legislação)</label>'
  +'<label class="consol-small-check"><input type="checkbox" data-copy-prob="'+esc(x.id)+'" '+(x.importProbability?'checked':'')+'> Importar probabilidade da origem (padrão: preservar a do destino)</label>'
  +'<div class="consol-diff"><b>Prévia:</b> '+willCopy.length+' campo(s) a incorporar; '+collisions.length+' conflito(s) detectado(s).'
  +(collisions.length?'<details><summary>Conferir campos diferentes</summary>'+collisions.map(v=>'<p><b>'+esc(v.key)+':</b> atual: '+esc(JSON.stringify(v.previous).slice(0,230))+' · importado: '+esc(JSON.stringify(v.incoming).slice(0,230))+'</p>').join('')+'</details>':'')+'</div>'
  +'<label class="consol-small-check consol-verify"><input type="checkbox" data-verify="'+esc(x.id)+'" '+(x.verified?'checked':'')+'> Conferi o indicador/item, a frase e o destino desta importação</label>';
 parent.querySelector('[data-target]').onchange=e=>{x.target=e.target.value;x.verified=false;buildOptions(x);updateSummary();};
 parent.querySelector('[data-policy]').onchange=e=>{x.strategy=e.target.value;buildOptions(x);updateSummary();};
 parent.querySelector('[data-copy-text]').onchange=e=>{x.importText=e.target.checked;x.verified=false;buildOptions(x);};
 parent.querySelector('[data-copy-prob]').onchange=e=>{x.importProbability=e.target.checked;x.verified=false;buildOptions(x);};
 parent.querySelector('[data-verify]').onchange=e=>{x.verified=e.target.checked;updateSummary();};
}
function updateSummary(){
 if(!dialog)return;
 const picked=incoming.filter(x=>x.selected),verified=picked.filter(x=>x.verified&&x.target).length;
 dialog.querySelector('#consolSummary').textContent=picked.length+' frase(s) selecionada(s) · '+verified+' destino(s) confirmados · '+originals.length+' arquivo(s) de origem';
}
function apply(){
 const picked=incoming.filter(x=>x.selected);
 if(!picked.length){note('Selecione pelo menos uma frase ou marque um item/indicador.','warning');return;}
 if(picked.some(x=>!x.target||!x.verified)){note('Antes de consolidar, confirme o destino de CADA frase marcada.','error');return;}
 const targetGuide=dialog.querySelector('#consolTarget').value;
 const states=readStates(),before=clone(states[targetGuide]);
 const history=storage(HIST,[]),audit=[],summary={updates:0,conflicts:0,skipped:0};
 const seen=new Set();
 for(const item of picked){
  const target=core.catalogs[targetGuide].find(f=>String(f.n)===String(item.target));
  if(!target){note('Existe uma frase de destino inválida.','error');return;}
  const dest=states[targetGuide].edits[target.n]||{},strategy=item.strategy;
  const compare=core.diff(dest,item.row.data,{strategy,probability:item.importProbability,text:item.importText});
  const count=Object.keys(compare.updates).length;
  summary.conflicts+=compare.conflicts.length;summary.updates+=count;
  if(strategy==='keep'||!count){summary.skipped++;continue;}
  const updated={...dest,...compare.updates,aprovacao:false,t2Aprovacao:false,t2Classe:'',t2Revisor:'',t2Data:''};
  updated.consolidationHistory=Array.isArray(dest.consolidationHistory)?clone(dest.consolidationHistory):[];
  const proof={originFile:item.file,originGuide:item.row.sourceGuide,originItem:item.row.sourcePhrase.item,
    originPhrase:item.row.sourcePhrase.indice,originNumber:item.row.sourcePhrase.n,targetGuide,
    targetNumber:target.n,fields:Object.keys(compare.updates),strategy,at:new Date().toISOString(),
    verified:true,conflicts:compare.conflicts.map(c=>c.key)};
  updated.consolidationHistory.push(proof);
  states[targetGuide].edits[target.n]=updated;
  audit.push(proof);
  seen.add(target.n);
 }
 if(!audit.length){
  note('Nenhum dado novo a aplicar. Confira os destinos e as opções de conflito. Você ainda pode baixar a versão atual.','warning');return;
 }
 if(!confirm('Consolidar '+audit.length+' transferência(s) em '+seen.size+' frase(s) do '+(targetGuide==='leg'?'Guia APPCC Legislação':'Guia APPCC/BPF')+'? '+summary.conflicts+' conflito(s) identificado(s). Um backup será criado antes de salvar.'))return;
 const now=new Date().toISOString();
 states[targetGuide].updatedAt=now;
 const oldBackups=storage(core.backups[targetGuide],[]);
 oldBackups.unshift({date:now,reviewer:before.reviewer,reviewDate:before.date,
   changes:before.edits,aiHistory:before.aiHistory,note:'Anterior à importação seletiva e consolidação'});
 try{
  localStorage.setItem(core.backups[targetGuide],JSON.stringify(oldBackups.slice(0,12)));
  localStorage.setItem(core.keys[targetGuide],JSON.stringify(states[targetGuide]));
  history.push({at:now,guide:targetGuide,updated:seen.size,copiedFields:summary.updates,conflicts:summary.conflicts,
    sources:[...new Set(audit.map(x=>x.originFile))],records:audit});
  localStorage.setItem(HIST,JSON.stringify(history.slice(-300)));
  if(targetGuide===bridge.guide)bridge.adoptLocalState?.(states[targetGuide]);
 }catch(e){
  note('Não foi possível gravar no dispositivo: '+e.message+'. Guarde seus arquivos originais.','error');return;
 }
 const approved=storage(MAP,{});
 for(const a of audit){
  approved[a.originGuide+':'+a.originNumber]=a.targetNumber;
  approved[a.targetGuide+':'+a.targetNumber]=a.originNumber;
 }
 try{localStorage.setItem(MAP,JSON.stringify(approved));}catch(_){}
 download(core.packageBundle(states,history,originals.flatMap(f=>f.legacyInspection||[])));
 note('Concluído: '+seen.size+' frase(s) atualizada(s) e '+summary.updates+' campo(s) incorporados. Backup criado e JSON único gerado. Reabra o guia de destino para visualizar as alterações.','success');
 incoming.forEach(x=>{x.selected=false;x.verified=false;});
 render();
}
panel.querySelector('#consolImportOpen').onclick=()=>{create().showModal();note('Adicione JSONs preenchidos ou escolha as revisões locais.');};
panel.querySelector('#consolDownloadCurrent').onclick=exportCurrent;
window.APPCC_CONSOLIDATION_UI={open:()=>create().showModal(),selectedCount:()=>incoming.filter(x=>x.selected).length};
})();
