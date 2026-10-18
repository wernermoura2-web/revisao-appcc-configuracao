/* Transferência assistida entre Guia APPCC/BPF e Guia APPCC Legislação.
   Usa apenas armazenamento local no navegador, com confirmação de cada destino. */
(function(){
'use strict';
const api=window.APPCC_GUIDE_BRIDGE;
if(!api)return;
const isLeg=api.guide==='leg';
const targetGuide=isLeg?'bpf':'leg';
const targetData=(isLeg?window.INITIAL_DATA:window.LEGISLATION_APPCC_DATA)?.frases||[];
const targetStorage=targetGuide==='leg'?'guia_appcc_legislacao_revisao_local_v1':'guia_appcc_rev6_revisao_local_v1';
const targetBackup=targetGuide==='leg'?'guia_appcc_legislacao_backups_v1':'guia_appcc_rev6_backups_v1';
const guideURL=targetGuide==='leg'?'?guide=leg':'?guide=bpf';
const groupLabels={cap:'Captação',cond:'Condução',res:'Reservatórios',rec_ret:'Recepção retornáveis',rec_desc:'Recepção descartáveis',rec_rot:'Rótulos',rec_san:'Saneantes',h_ret:'Higienização retornáveis',h_desc:'Higienização descartáveis',t_ret:'Tampas retornáveis',t_desc:'Tampas descartáveis',e_ret:'Envase retornáveis',e_desc:'Envase descartáveis',cq:'Controle da qualidade',resp:'Responsabilidade'};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const tokens=s=>new Set(norm(s).replace(/[^a-z0-9 ]+/g,' ').split(/\s+/).filter(t=>t.length>=4&&!/^(deve|devem|para|pela|pelas|pelo|pelos|como|sobre|quando|sendo|entre|outros|todas|todos|agua|mineral|natural|esta|esse|serao|realizados|realizadas)$/.test(t)));
const ref=f=>String(f.item||'').match(/4\.\d+\.\d+/)?.[0]||'';
function similarity(a,b){
 const aa=tokens(a),bb=tokens(b);
 if(!aa.size||!bb.size)return 0;
 let common=0;for(const t of aa)if(bb.has(t))common++;
 return 2*common/(aa.size+bb.size);
}
function rank(a,b){
 const sim=similarity(a.frase,b.frase);
 const match=ref(a)&&ref(a)===ref(b);
 const proc=ref(a).split('.').slice(0,2).join('.')===ref(b).split('.').slice(0,2).join('.');
 return sim*80+(match?48:0)+(proc?6:0)+(String(a.indice)===String(b.indice)&&match?4:0);
}
function options(a){
 return targetData.map(t=>({t,score:rank(a,t)})).sort((x,y)=>y.score-x.score||x.t.n-y.t.n);
}
const active=document.createElement('section');
active.className='panel transfer-panel';
active.innerHTML='<h2>3 · Transferir revisão</h2><p class="hint">Copiar para o outro guia, com indicador e frase de destino confirmados. A revisão de destino continua pendente de conferência.</p><div class="transfer-buttons"><button type="button" id="transferPhrase">Exportar frase atual →</button><button type="button" id="transferItem">Exportar item inteiro →</button></div>';
const selection=document.querySelector('#phraseSelect')?.closest('.panel');
if(selection)selection.insertAdjacentElement('afterend',active);
const guideLinks=[document.getElementById('guideBpf'),document.getElementById('guideLeg')];
guideLinks.forEach((a,i)=>{if(!a)return;const chosen=(i===0?'bpf':'leg')===api.guide;a.classList.toggle('selected',chosen);a.setAttribute('aria-current',chosen?'page':'false');a.onclick=()=>{api.save();};});
const appHeader=document.querySelector('.app-header .brand p');
if(appHeader)appHeader.textContent=isLeg?'Guia APPCC — Revisão legislativa · CP 1.365/2025 · indicadores e frases':'Guia Estadual APPCC/BPF · Rev.6 / V82.55 · probabilidades por frase';
let rows=[],dialog;
function createDialog(){
 if(dialog)return dialog;
 dialog=document.createElement('dialog');dialog.id='guideTransferDialog';dialog.className='transfer-dialog';
 dialog.innerHTML=[
 '<h2>Exportar revisão para o outro guia</h2>',
 '<p class="transfer-desc">O indicador de destino é pré-selecionado por correspondência normativa e semelhança do texto. <b>Confirme cada linha antes de exportar.</b></p>',
 '<div class="transfer-warning">Não altera o Guia original, nem substitui o texto legislativo. Aprovações técnicas não são copiadas. As alterações são salvas localmente e será feita cópia de segurança do destino.</div>',
 '<div id="transferRows" class="transfer-rows"></div>',
 '<label class="transfer-check"><input type="checkbox" id="transferProb"> Substituir a probabilidade de destino pela probabilidade da origem (padrão: manter a probabilidade histórica do indicador)</label>',
 '<label class="transfer-check"><input type="checkbox" id="transferOverwrite"> Autorizo substituir dados de revisão já existentes nos destinos selecionados</label>',
 '<div id="transferResult" role="status" class="transfer-result"></div>',
 '<div class="transfer-actions"><button type="button" id="transferCommit" class="transfer-commit">Confirmar e exportar</button><button type="button" id="transferCancel">Cancelar</button></div>'
 ].join('');
 document.body.appendChild(dialog);
 dialog.querySelector('#transferCancel').onclick=()=>dialog.close();
 dialog.querySelector('#transferCommit').onclick=commit;
 return dialog;
}
function targetLabel(f){
 return (f.indicador?'Indicador '+f.indicador+' · ':'')+f.item+' · Frase '+f.indice+' — '+f.frase.slice(0,105);
}
function show(sourceIndexes){
 if(!targetData.length){alert('Não foi possível carregar o conjunto de indicadores do outro guia. Atualize a página.');return;}
 api.save();
 rows=sourceIndexes.map(i=>{
 const src=api.phraseAt(i),choice=options(src.phrase);
 const highest=choice[0];
 return {src,choice,selected:highest?.score>=35?String(highest.t.n):''};
 });
 const dia=createDialog();
 dia.querySelector('#transferOverwrite').checked=false;
 dia.querySelector('#transferProb').checked=false;
 dia.querySelector('#transferResult').textContent='';
 dia.querySelector('#transferRows').innerHTML=rows.map((r,i)=>{
 const p=r.src.phrase, first=r.choice[0],suggest=first?.score>=90?'Alta':first?.score>=60?'Média':'Baixa';
 return '<div class="transfer-row" data-transfer-row="'+i+'">'
 +'<b>Origem: '+esc(p.item)+' · Frase '+p.indice+'</b>'
 +'<p class="transfer-source">'+esc(p.frase)+'</p>'
 +'<label>Indicador e frase de destino <select data-destination="'+i+'"><option value="">— Escolha e confirme o destino —</option>'
 +r.choice.map(x=>'<option value="'+x.t.n+'" '+(String(x.t.n)===r.selected?'selected':'')+'>'+esc(targetLabel(x.t))+'</option>').join('')
 +'</select></label>'
 +'<p class="transfer-confidence">Sugestão automática: '+suggest+' confiança (comparar os textos antes da confirmação)</p>'
 +'<p class="transfer-target" data-target-description="'+i+'"></p>'
 +'<label class="transfer-check"><input type="checkbox" data-verified="'+i+'"> Conferi a correspondência deste indicador e desta frase</label>'
 +'</div>';
 }).join('');
 dia.querySelectorAll('[data-destination]').forEach(sel=>{
  const k=Number(sel.dataset.destination);
  sel.onchange=()=>{rows[k].selected=sel.value;const check=dia.querySelector('[data-verified="'+k+'"]');if(check)check.checked=false;paint(k)};
  paint(k);
 });
 dia.showModal();
}
function paint(i){
 const r=rows[i],dest=targetData.find(x=>String(x.n)===r.selected);
 const p=dialog.querySelector('[data-target-description="'+i+'"]');
 if(p)p.innerHTML=dest?'<b>Texto de destino:</b> '+esc(dest.frase)+'<br><b>Probabilidade já disponível:</b> '+esc(dest.probabilidade_24??'Pendente')+' (1–5). <b>APPCC do destino:</b> '+esc(dest.appcc_proposto||'Pendente'):'Selecione o indicador e a frase a serem confirmados.';
}
function clone(x){return JSON.parse(JSON.stringify(x));}
function read(key,def){try{return JSON.parse(localStorage.getItem(key)||'null')||def}catch(_){return def;}}
function commit(){
 const dests=rows.map((r,i)=>({r,i,d:targetData.find(x=>String(x.n)===r.selected)}));
 if(dests.some(x=>!x.d||!dialog.querySelector('[data-verified="'+x.i+'"]')?.checked)){
   dialog.querySelector('#transferResult').textContent='Confirme o indicador e a frase de destino em todas as linhas antes de continuar.';return;
 }
 if(new Set(dests.map(x=>x.d.n)).size!==dests.length){
   dialog.querySelector('#transferResult').textContent='Duas frases apontam para o mesmo destino. Escolha destinos diferentes ou exporte as frases individualmente.';return;
 }
 const saved=read(targetStorage,{version:1,reviewer:'',date:'',edits:{},aiHistory:{},backupInterval:5});
 if(!saved.edits||typeof saved.edits!=='object')saved.edits={};
 const conflict=dests.filter(x=>Object.keys(saved.edits[x.d.n]||{}).length>0);
 if(conflict.length&&!dialog.querySelector('#transferOverwrite').checked){
   dialog.querySelector('#transferResult').textContent='Existem '+conflict.length+' destino(s) com revisão salva. Marque a autorização de substituição para prosseguir.';return;
 }
 if(!confirm('Exportar '+dests.length+' frase(s) para o Guia APPCC '+(targetGuide==='leg'?'Legislação':'/BPF')+'? Será feito um backup dos destinos e a aprovação técnica deverá ser refeita.'))return;
 const before=clone(saved);
 const includeProb=dialog.querySelector('#transferProb').checked;
 const transferable=['foco','perigo','medida','evidencias','orientacao_frase','exemplo_frase','considerando','documentos','passo3_textos','questions','eurestQuestions','criteria','criteriaText','questionNotes','justificativa_revisao','notaAprovacao','t2Nota'];
 for(const {r,d} of dests){
   const src=r.src,phrase=src.phrase,current=saved.edits[d.n]||{},next={...current};
   for(const field of transferable)if(phrase[field]!==undefined&&phrase[field]!==null){
      // Texto legal e identidade do indicador não são campos transferíveis.
      next[field]=clone(phrase[field]);
   }
   const computed=src.diagnostic?.classe,approved=['conferido','confirmado','classificado'].includes(src.diagnostic?.estado);
   next.appcc_proposto=approved&&computed?computed:phrase.appcc_proposto||d.appcc_proposto;
   if(includeProb&&Number.isInteger(+phrase.probabilidade_24)&&+phrase.probabilidade_24>=1&&+phrase.probabilidade_24<=5)next.probabilidade_24=+phrase.probabilidade_24;
   next.aprovacao=false;next.t2Aprovacao=false;next.t2Classe='';next.t2Revisor='';next.t2Data='';
   next.transferencia={origem:api.guide,item:phrase.item,frase:phrase.indice,numero:phrase.n,data:new Date().toISOString(),probabilidadeTransferida:includeProb,confirmacaoDestino:true};
   saved.edits[d.n]=next;
 }
 if(!saved.reviewer)saved.reviewer=document.getElementById('reviewer')?.value||'';
 if(!saved.date)saved.date=document.getElementById('reviewDate')?.value||'';
 saved.updatedAt=new Date().toISOString();
 try{
   const backups=read(targetBackup,[]);
   backups.unshift({date:new Date().toISOString(),reviewer:before.reviewer||'',changes:before.edits||{},aiHistory:before.aiHistory||{},reviewDate:before.date||'',note:'Antes da transferência cruzada de indicadores'});
   localStorage.setItem(targetBackup,JSON.stringify(backups.slice(0,12)));
   localStorage.setItem(targetStorage,JSON.stringify(saved));
 }catch(e){
   dialog.querySelector('#transferResult').textContent='Falha ao salvar (possível limite de espaço local). Nenhuma aprovação foi aplicada: '+e.message;return;
 }
 const url=new URL(location.href);
 url.searchParams.set('guide',targetGuide);
 url.searchParams.set('phrase',String(dests[0].d.n));
 dialog.querySelector('#transferResult').innerHTML='<b>Transferência salva:</b> '+dests.length+' frase(s). <a href="'+esc(url.href)+'" id="openTransferred">Abrir o indicador de destino para conferir os dados →</a>';
 dialog.querySelector('#openTransferred')?.addEventListener('click',()=>api.save());
}
active.querySelector('#transferPhrase').onclick=()=>show([api.current().index]);
active.querySelector('#transferItem').onclick=()=>show(api.itemIndexes());
window.APPCC_TRANSFER_REVIEW={suggest:phrase=>options(phrase).slice(0,5).map(x=>({dest:x.t.n,item:x.t.item,indice:x.t.indice,score:x.score})),targetCount:targetData.length};
})();