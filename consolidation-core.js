/* Consolidação seletiva — dados locais, sem alterar textos de referência automaticamente. */
(function(global){
'use strict';
const FORMAT='APPCC-CONSOLIDADO-V1';
const keys={
 bpf:'guia_appcc_rev6_revisao_local_v1',
 leg:'guia_appcc_legislacao_revisao_local_v1'
};
const backups={
 bpf:'guia_appcc_rev6_backups_v1',
 leg:'guia_appcc_legislacao_backups_v1'
};
const catalogs={
 bpf:global.INITIAL_DATA?.frases||[],
 leg:global.LEGISLATION_APPCC_DATA?.frases||[]
};
const blocked=new Set(['n','item','indice','processo','indicador','grupo_legislativo','referencia_normativa',
 'texto_item','frase','probabilidade_24','severidade','appcc_inicial','fonte_rev6',
 'aprovacao','t2Aprovacao','t2Classe','t2Revisor','t2Data','t2Nota','notaAprovacao']);
const allowed=new Set(['foco','perigo','medida','evidencias','orientacao_frase','exemplo_frase',
 'considerando','documentos','passo3_textos','questions','eurestQuestions','criteria',
 'criteriaText','questionNotes','justificativa_revisao','appcc_proposto','inspecao_legislativa',
 'referencia_revisada','revisao_legislativa','frase','probabilidade_24','severidade',
 'orientacao_item','exemplo_item','observacoes']);
const clone=x=>JSON.parse(JSON.stringify(x));
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const filled=x=>Array.isArray(x)?x.some(filled):obj(x)?Object.values(x).some(filled):x!==undefined&&x!==null&&x!=='';
const ref=x=>String(x.item||'').match(/\b4\.\d+\.\d+\b/)?.[0]||'';
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const words=x=>new Set(norm(x).replace(/[^a-z0-9]+/g,' ').split(/\s+/).filter(v=>v.length>3&&!/^(para|com|pelo|pela|devem|deve|sendo|pode|esta|este|esse|essa|todos|todas|agua|natural|mineral|item|frase|outros|serao|quando|operacoes)$/.test(v)));
function similarity(a,b){const aa=words(a),bb=words(b);if(!aa.size||!bb.size)return 0;let common=0;for(const word of aa)if(bb.has(word))common++;return 2*common/(aa.size+bb.size);}
function rank(a,b){
 if(a.n===b.n&&a.guide===b.guide)return 250;
 if(a.guide==='leg'&&b.guide==='leg'&&a.codigo_legado&&a.codigo_legado===b.codigo_legado&&a.indice===b.indice)return 230;
 const rr=ref(a),tr=ref(b),match=!!rr&&rr===tr;
 const proc=rr.split('.').slice(0,2).join('.')===tr.split('.').slice(0,2).join('.');
 return Math.round(similarity(a.frase,b.frase)*80+(match?48:0)+(proc?6:0)+(match&&a.indice===b.indice?4:0));
}
function suggestions(source,guide,confirmed={}){
 const a={...source,guide:source.guide};
 const options=catalogs[guide].map(f=>({phrase:f,score:rank(a,{...f,guide})}));
 options.sort((a,b)=>b.score-a.score||a.phrase.n-b.phrase.n);
 const key=source.guide+':'+source.n,prefer=confirmed[key];
 const idx=prefer?options.findIndex(o=>String(o.phrase.n)===String(prefer)):-1;
 if(idx>0){const matched=options.splice(idx,1)[0];matched.confirmed=true;options.unshift(matched);}
 return options;
}
function normalizeState(s){
 const state=obj(s)?clone(s):{};
 return {version:1,reviewer:typeof state.reviewer==='string'?state.reviewer:'',
 date:typeof state.date==='string'?state.date:'',
 edits:obj(state.edits)?state.edits:{},aiHistory:obj(state.aiHistory)?state.aiHistory:{},
 backupInterval:[0,1,5,10,30,60].includes(+state.backupInterval)?+state.backupInterval:5,
 updatedAt:state.updatedAt||null};
}
function guideOf(p){
 if(p.guide==='leg'||p.format==='APPCC-LEG-161F')return 'leg';
 if(p.guide==='bpf'||p.format==='APPCC-REV6-24EN-76F')return 'bpf';
 throw Error('Não foi possível identificar o guia de origem do arquivo.');
}
function fromReview(p,filename){
 const g=guideOf(p),cat=catalogs[g],state=normalizeState(p);
 const rows=[];
 for(const [key,edit] of Object.entries(state.edits)){
  const phrase=cat.find(f=>String(f.n)===String(key));
  if(!phrase||!obj(edit))continue;
  const data={};
  for(const [k,v] of Object.entries(edit)){
   if((allowed.has(k)||k==='frase'||k==='probabilidade_24')&&filled(v))data[k]=clone(v);
  }
  if(!Object.keys(data).length)continue;
  rows.push({sourceGuide:g,sourceType:'revisao',filename,sourcePhrase:{...phrase,guide:g},
   data,sourceKey:key,originVersion:p.format||'revisao-local'});
 }
 return rows;
}
function legacyRows(payload,filename){
 const s=obj(payload.state)?payload.state:payload;
 if(!obj(s)||!obj(s.phraseAPPCC)&&!obj(s.phraseText)&&!obj(s.u))throw Error('Estrutura do Guia APPCC legislativo incompatível.');
 const inspections=[];
 for(const units of Object.values(s.u||{})){
  if(!Array.isArray(units))continue;
  for(const u of units){
   if(!obj(u)||!obj(u.i))continue;
   for(const [code,answers] of Object.entries(u.i)){
    if(!obj(answers))continue;
    const anyResponse=Array.isArray(answers.phr)&&answers.phr.some(filled);
    const anyObs=filled(answers.phraseObservations)||filled(answers.o)||filled(answers.a);
    if(!anyResponse&&!anyObs)continue;
    inspections.push({code,unit:u.name||u.code||u.id||'',unitId:u.id||'',results:answers.phr||[],
     observations:answers.phraseObservations||[],comment:answers.o||'',action:answers.a||''});
   }
  }
 }
 const rows=[];
 for(const f of catalogs.leg){
  const key=f.codigo_legado,j=f.indice_legado;
  if(!key||!Number.isInteger(j))continue;
  const data={};
  const cls=s.phraseAPPCC?.[key]?.[j];
  if(cls&&['PPHO','PPR','PC','PPRO','PCC'].includes(cls))data.appcc_proposto=cls;
  const editedText=s.phraseText?.[key]?.[j];
  if(typeof editedText==='string'&&editedText.trim()&&editedText!==f.frase)data.frase=editedText;
  const updatedReference=s.phraseRefs?.[key]?.[j];
  if(typeof updatedReference==='string'&&updatedReference.trim()&&updatedReference!==f.referencia_normativa)data.referencia_revisada=updatedReference;
  const ins=inspections.filter(x=>x.code===key).map(x=>({
   unidade:x.unit,unidadeId:x.unitId,resposta:x.results[j]||'',
   observacao:Array.isArray(x.observations)?x.observations[j]||'':'',
   observacaoItem:x.comment,acaoItem:x.action
  })).filter(x=>filled(x.resposta)||filled(x.observacao)||filled(x.observacaoItem)||filled(x.acaoItem));
  if(ins.length)data.inspecao_legislativa=ins;
  if(!Object.keys(data).length)continue;
  rows.push({sourceGuide:'leg',sourceType:'legacy',filename,sourcePhrase:{...f,guide:'leg'},sourceKey:String(f.n),data,
   originVersion:'guia-appcc-desenvolvimento'});
 }
 return rows;
}
function parse(payload,filename){
 if(!obj(payload))throw Error('Formato JSON inválido.');
 if(payload.format===FORMAT&&obj(payload.states)){
  const rows=[];
  for(const guide of ['bpf','leg']){
   if(!obj(payload.states[guide]))continue;
   rows.push(...fromReview({...payload.states[guide],format:guide==='bpf'?'APPCC-REV6-24EN-76F':'APPCC-LEG-161F',guide},filename));
  }
  return {format:FORMAT,filename,rows,importedBundle:true,legacyInspection:Array.isArray(payload.legacyInspection)?payload.legacyInspection:[]};
 }
 if(payload.format==='guia-appcc-desenvolvimento'||obj(payload.state)&&obj(payload.state.u)){
  return {format:'guia-appcc-desenvolvimento',filename,rows:legacyRows(payload,filename),legacyInspection:[{file:filename,original:clone(payload)}]};
 }
 if(obj(payload.edits)&&(payload.guide||payload.format)){
  return {format:payload.format||'revisao',filename,rows:fromReview(payload,filename),legacyInspection:[]};
 }
 throw Error('Formato não reconhecido. Exporte JSON do Guia APPCC/BPF, do Guia APPCC Legislação ou do consolidado.');
}
function mergeValue(old,value,path,strategy,conflicts){
 if(!filled(value))return {value:old,changed:false};
 if(!filled(old))return {value:clone(value),changed:true};
 if(JSON.stringify(old)===JSON.stringify(value))return {value:old,changed:false};
 if(obj(old)&&obj(value)){
  const merged=clone(old);let changed=false;
  for(const [k,incoming] of Object.entries(value)){
   const node=mergeValue(old[k],incoming,path+'.'+k,strategy,conflicts);
   if(node.changed){merged[k]=node.value;changed=true;}
  }
  return {value:merged,changed};
 }
 conflicts.push({key:path,previous:old,incoming:value});
 return strategy==='replace'?{value:clone(value),changed:true}:{value:old,changed:false};
}
function diff(dest,source,opts){
 const strategy=opts?.strategy||'blank',overProb=!!opts?.probability,overText=!!opts?.text;
 const updates={},conflicts=[];
 for(const [key,value] of Object.entries(source||{})){
  if(!filled(value))continue;
  if(blocked.has(key)&&!(key==='probabilidade_24'&&overProb||key==='frase'&&overText))continue;
  if(!allowed.has(key)&&key!=='frase'&&key!=='probabilidade_24')continue;
  const node=mergeValue(dest?.[key],value,key,strategy,conflicts);
  if(node.changed)updates[key]=node.value;
 }
 return {updates,conflicts};
}
function packageBundle(states,history=[],legacyInspection=[]){
 return {
  format:FORMAT,schemaVersion:1,generatedAt:new Date().toISOString(),
  description:'Consolidação das revisões APPCC/BPF e APPCC Legislação, sem alterar os textos-base dos guias.',
  states:{bpf:normalizeState(states.bpf),leg:normalizeState(states.leg)},
  history:clone(history),legacyInspection:clone(legacyInspection)
 };
}
global.APPCC_CONSOLIDATOR={FORMAT,catalogs,keys,backups,parse,normalizeState,suggestions,diff,packageBundle,filled};
})(window);
