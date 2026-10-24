/* Representação visual, somente para impressão, das Tabelas 1, 2 e 3 APPCC.
   Não altera respostas nem classifica por conta própria: reflete o diagnóstico do editor. */
(function(){
'use strict';
const short1={
    A:'O perigo identificado é significativo? Considere gravidade e probabilidade de ocorrência.',
    B:'Existe uma medida preventiva ou de controle nesta etapa ou em outra?',
    C:'Esta etapa foi especialmente desenvolvida para eliminar ou reduzir o perigo a nível aceitável?',
    D:'O perigo pode ocorrer ou aumentar nesta etapa até nível inaceitável?',
    E:'Existe uma etapa posterior comprovadamente eficaz para eliminar ou reduzir o perigo?'
};
const short2={
    F:'É uma medida operacional para controlar perigo significativo, com monitoramento e critérios definidos, a avaliar como PPRO candidato (ou PCC, conforme Q1–Q4 da Tabela 3)?',
    G:'É uma rotina direta de limpeza ou desinfecção, sem enquadramento como PCC/PPRO?',
    H:'É condição básica ou suporte (estrutura, materiais, capacitação, gestão)?',
    I:'É um controle específico de apoio (recepção, inspeção, operação ou verificação)?'
};
const short3={
    Q1:'É necessário aplicar medidas de controle neste passo?',
    Q2:'As medidas de controle já se encontram implementadas?',
    Q3:'Se existir alguma falha na medida de controle, é colocada em risco a segurança do produto?',
    Q4:'É viável estabelecer limites críticos mensuráveis e uma monitorização que permita detectar oportunamente e corrigir as falhas?'
};
const v=x=>String(x??'');
const esc=x=>v(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const weight={PPHO:1,PPR:2,PC:3,PPRO:4,PCC:5};
const valid=x=>x==='S'||x==='N';
function response(q,k,active){
 if(!active)return {label:'N/A',css:'skip'};
 return q[k]==='S'?{label:'Sim',css:'yes'}:q[k]==='N'?{label:'Não',css:'no'}:{label:'—',css:'pending'};
}
function node(k,caption,q,active,notes){
 const answer=response(q,k,active);
 const n=notes?.[k]||{},just=v(n.justification).trim();
 const evidence=v(n.evidence).trim();
 const source=n.reviewed?'Conferida pelo revisor'+(n.reviewedBy?' · '+n.reviewedBy:''):n.source==='gemini'?'Sugestão IA — conferir':'Conferência pendente';
 const detail='<span class="flow-node-just"><b>Justificativa:</b> '+(just?esc(just):'Não registrada')+'</span>'
  +'<span class="flow-node-evidence"><b>Evidência necessária:</b> '+(evidence?esc(evidence):'Não informada')+'</span>'
  +'<span class="flow-node-review">'+esc(source)+'</span>';
 return '<div class="flow-node s-'+answer.css+'"><span class="nkey">'+esc(k)+'</span><span class="ntxt">'+esc(caption)+'</span><span class="nanswer">'+answer.label+'</span>'+detail+'</div>';
}
function pathNodes(items,q,active,notes){
 const all=Object.entries(items);
 const used=all.filter(([k])=>!!active[k]);
 const skipped=all.filter(([k])=>!active[k]).map(([k])=>k);
 const main=used.map(([k,t],i)=>node(k,t,q,true,notes).replace('class="flow-node ',i===used.length-1?'class="flow-node flow-last-active ':'class="flow-node ')).join('');
 const path=main||'<div class="flow-inactive">Etapa não percorrida neste caminho</div>';
 const note=skipped.length?'<div class="flow-unused">Não aplicável: '+skipped.map(esc).join(' · ')+'</div>':'';
 return path+note;
}
function stage(num,name,nodes,result,skip){
 const title=result?.classe?(result.classe+(result.estado==='confirmado'?' confirmado':result.estado==='classificado'?' classificado':result.estado==='conferido'?' conferido':' candidato')):(skip?'Não aplicável':'Decisão pendente');
 const desc=result?.texto||'';
 const tone=['confirmado','classificado','conferido'].includes(result?.estado)?'is-confirmed':skip||result?.estado==='nao_aplicavel'?'':'is-pending';
 return '<section class="flow-panel '+(skip?'flow-skipped':'')+'"><div class="flow-panel-head"><b>'+num+' · '+esc(name)+'</b><small>Sim / Não →</small></div><div class="flow-nodes">'+nodes+'</div><div class="flow-conclusion '+tone+'"><strong>'+esc(title)+'</strong>'+esc(desc)+'</div></section>';
}
function note(title,text){
 text=v(text).trim();
 const density=text.length>320?'very-dense':text.length>185?'dense':'';
 return '<div class="flow-note '+density+'"><strong>'+esc(title)+'</strong>'+(text?esc(text):'<span class="flow-sheet-missing">Não registrado</span>')+'</div>';
}
function criterion(key,label,text,status,active,isBase){
 const answer=active?status==='S'?'Sim':status==='N'?'Não':'Pendente':'N/A';
 const signal=active?status==='S'?'yes':status==='N'?'no':'pending':'skip';
 const content=v(text).trim();
 
 return '<div class="flow-criterion'+(isBase?' flow-criterion-base':'')+'"><div class="ctop"><span>'+esc(label)+'</span><span class="csignal '+signal+'">'+answer+'</span></div>'
   +(content?'<span class="flow-criterion-source">'+(isBase?'Texto-base de orientação (não comprovado): ':'Justificativa registrada: ')+'</span>'+esc(content):'<span class="flow-sheet-missing">Sem justificativa registrada</span>')+'</div>';
}
function build(ctx){
 const f=ctx.frase||{}, d=ctx.diagnostico||{}, q=ctx.respostas||{}, e=ctx.q3||{}, active=ctx.aplicabilidade||{};
 const criteria=ctx.criterios||{},ct=ctx.textosCriterios||{},labels=ctx.rotulosCriterios||{},defaults=f.passo3_textos||{};
 const before=f.appcc_inicial||'—', after=ctx.depois||f.appcc_proposto||'—', p=f.probabilidade_24, n=weight[after];
 const notes=ctx.justificativasPerguntas||{};
 const t1=pathNodes(short1,q,active,notes);
 const t2=pathNodes(short2,q,active,notes);
 const qActive=d.route==='3'?(d.eur?.active||{}):{};
 const t3=pathNodes(short3,e,qActive,notes);
 const t3Summary=Object.assign({},d.t3||{});
 if(d.route==='3'&&!d.classe) t3Summary.texto=(d.eur?.caminho||'Aguardando Q1–Q4')+'. '+(d.t3?.texto||'');
 const cards=Object.entries(labels).map(([key,title],i)=>{
   const edited=Object.prototype.hasOwnProperty.call(ct,key) && v(ct[key]).trim().length>0;
   return criterion(key,
     key==='limite'&&d.classe==='PPRO'?'Critério de ação (PPRO)':key==='limite'&&d.classe==='PCC'?'Limite crítico (PCC)':title,
     edited?ct[key]:defaults[i]??'',criteria[key],d.route==='3'&&['PCC','PPRO'].includes(d.classe),!edited);
 }).join('');
 const docs=(ctx.documentos||[]).filter(o=>v(o.observacao).trim()).map(o=>v(o.name)+': '+v(o.observacao)).join('\n');
 const fullExample=v(f.exemplo_frase).trim();
 const originalExample=v(ctx.fraseBase?.exemplo_frase).trim();
 const isUneditedBase=fullExample===originalExample;
 const tooLongBase=isUneditedBase&&fullExample.length>410;
 const exampleForPrint=tooLongBase
  ?fullExample.slice(0,268).replace(/\s+\S*$/, '')+'…\n[Texto-base original extenso: leia o texto integral na página de configuração da frase ou no JSON exportado.]'
  :fullExample;
 const approval=d.route==='3'?ctx.aprovacao?'Aprovação técnica registrada':'Aprovação técnica pendente':ctx.conferenciaT2?'Conferência da Tabela 2 registrada':'Classificação da Tabela 2 / análise pendente';
 const end=v(ctx.justificativaAprovacao).trim();
 const review=esc(ctx.revisor||'Não informado'), date=esc(ctx.data||'Data não informada');
 const danger=esc(f.perigo||'Não registrado'), measure=esc(f.medida||'Não registrada');
 const notesCards=collectNoteCards(ctx);
 const extra=notesCards.filter(c=>!c.active);
 const details= '<div class="flow-validation"><div class="flow-section-title">TABELA 3 · SEIS REQUISITOS DE VALIDAÇÃO <small>Resultado obtido: '+esc(d.classe||'Pendente')+' · Respostas editadas pelo revisor</small></div><div class="flow-validation-grid">'+cards+'</div></div>'
  +'<div class="flow-observation"><div class="flow-section-title">EVIDÊNCIAS, JUSTIFICATIVAS E OBSERVAÇÕES <small>Textos inseridos ou conservados no editor</small></div><div class="flow-observation-grid">'
  +note('Evidências das inspeções',f.evidencias)
  +note('Justificativa da classificação',ctx.justificativaRevisao||ctx.notaT2)
  +note('Observação / exemplo da frase'+(isUneditedBase?' · texto-base':' · texto revisado'),exampleForPrint)
  +note('Observações dos documentos avaliados',docs)
  +'</div></div>';
 const graphic='<article class="print-page flow-print-page flow-with-justifications flow-expanded flow-no-notes" data-part="analysis">'
  +'<header class="flow-header"><b>GUIA ESTADUAL · REVISÃO APPCC — FLUXO DA FRASE</b><span class="flow-revisor">Item '+esc(f.item)+' · Frase '+esc(f.indice)+' · '+esc(f.processo)+'<br>Revisor: '+review+' · '+date+'</span></header>'
  +'<div class="flow-body">'
  +'<div class="flow-identity">'
  +'<div class="flow-badge"><span class="key">PROCESSO / ITEM</span><strong>'+esc(f.item)+' · FRASE '+esc(f.indice)+'</strong><br><span>'+esc(f.processo)+'</span></div>'
  +'<div class="flow-badge"><span class="key">APPCC ANTES</span><strong>'+esc(before)+' ('+(weight[before]??'—')+')</strong></div>'
  +'<div class="flow-badge flow-last"><span class="key">APPCC DEPOIS</span><strong>'+esc(after)+' ('+(n??'—')+')</strong></div>'
  +'<div class="flow-badge"><span class="key">NC × P24 / ESTADO</span><strong>'+(n!=null&&p!=null?n*p:'—')+'</strong><br>'+esc(d.estado||'pendente')+'</div>'
  +'</div>'
  +'<div class="flow-phrase"><strong>'+esc(f.item)+' — Frase '+esc(f.indice)+':</strong> '+esc(f.frase||'Texto da frase não informado')+'</div>'
  +'<div class="flow-facts"><div class="flow-fact"><strong>PERIGO IDENTIFICADO</strong> '+danger+'</div><div class="flow-fact"><strong>MEDIDA DE CONTROLE</strong> '+measure+'</div></div>'
  +'<div class="flow-decision-row '+(d.route==='3'&&d.t2?.estado==='nao_aplicavel'?'route-direct':d.route==='2'?'route-base':'')+'">'
  +stage('1','TRIAGEM (A–E)',t1,d.t1,false)
  +stage('2','TIPO DE CONTROLE (F–I)',t2,d.t2,d.t2?.estado==='nao_aplicavel')
  +stage('3','DECISÃO Q1–Q4',t3,t3Summary,d.route!=='3')
  +'</div>'
  +'<footer class="flow-footer"><span><b>'+esc(approval)+'</b>'+(end?' · '+esc(end):'')+'</span><em>Escala local APPCC: PPHO 1 · PPR 2 · PC 3 · PPRO 4 · PCC 5. Resultado da revisão; não altera o Guia oficial.</em></footer>'
  +'</div></article>';
 return graphic+'<article class="print-page flow-details-page" data-part="analysis-details">'
  +'<header class="flow-jheader"><b>APPCC · VALIDAÇÃO E EVIDÊNCIAS</b><span>'+esc(f.item)+' · Frase '+esc(f.indice)+' · '+esc(f.processo)+'</span></header>'
  +'<div class="flow-details-content">'+details+'</div></article>'+printJustificationPages(ctx,extra);
}
function safeParts(value,limit){
 const str=v(value).trim();
 if(!str)return [];
 const chunks=[];let rest=str;
 while(rest.length>limit){
  let cut=rest.lastIndexOf(' ',limit);
  if(cut<limit*.5)cut=limit;
  chunks.push(rest.slice(0,cut).trim());rest=rest.slice(cut).trimStart();
 }
 if(rest)chunks.push(rest);
 return chunks;
}

function collectNoteCards(ctx){
 const f=ctx.frase||{},notes=ctx.justificativasPerguntas||{};
 const all={...short1,...short2,...short3};
 const q=ctx.respostas||{},e=ctx.q3||{},app=ctx.aplicabilidade||{};
 const qapp=ctx.diagnostico?.route==='3'?ctx.diagnostico?.eur?.active||{}:{};
 const cards=[];
 for(const [k,label] of Object.entries(all)){
  const n=notes[k]||{},why=v(n.justification).trim(),evidence=v(n.evidence).trim();
  if(!why&&!evidence)continue;
  const active=k.startsWith('Q')?!!qapp[k]:!!app[k];
  const resp=k.startsWith('Q')?e[k]:q[k];
  const val=active?resp==='S'?'SIM':resp==='N'?'NÃO':'PENDENTE':'NÃO APLICÁVEL';
  const review=n.reviewed?'Conferida pelo revisor'+(n.reviewedBy?' · '+n.reviewedBy:'')
    :n.source==='gemini'?'Sugestão Gemini — conferir':'Conferência pendente';
  // Uma pergunta corresponde a um único quadro, sem títulos ou partes repetidos.
  cards.push({k,label,val,review,part:1,total:1,why,evidence,active});
 }
 return cards;
}
function cardHTML(c,compact=false){
 return '<section class="'+(compact?'flow-inline-card':'flow-jcard')+'">'
  +'<div class="flow-jcard-head"><b>'+esc(c.k)+' · '+esc(c.val)+'</b><span>'+esc(c.review)+'</span></div>'
  +'<div class="flow-jquestion">'+esc(c.label)+(c.total>1?' · '+c.part+'/'+c.total:'')+'</div>'
  +'<div class="flow-jcontent"><b>Justificativa:</b> '+(c.why?esc(c.why):'<i>Não registrada</i>')+'</div>'
  +'<div class="flow-jcontent"><b>Evidência necessária:</b> '+(c.evidence?esc(c.evidence):'<i>Não informada</i>')+'</div>'
  +'</section>';
}
function inlineJustifications(cards){
 if(!cards.length)return '';
 const count=cards.length;
 return '<section class="flow-inline-notes" aria-label="Justificativas das perguntas APPCC">'
  +'<div class="flow-section-title">JUSTIFICATIVAS A–I / Q1–Q4'
  +'<small>'+count+' registro(s) · conteúdo integral · conferência do revisor</small></div>'
  +'<div class="flow-inline-grid">'+cards.map(c=>cardHTML(c,true)).join('')+'</div>'
  +'</section>';
}
function printJustificationPages(ctx,cards){
 if(!cards.length)return '';
 const f=ctx.frase||{};
 let html='';
 // Apenas conteúdo que excedeu os seis quadros da folha principal.
 for(let p=0;p<cards.length;p+=6){
  const group=cards.slice(p,p+6);
  const number=1+Math.floor(p/6);
  html+='<article class="print-page flow-justifications-page" data-part="analysis-justifications">'
   +'<header class="flow-jheader"><b>APPCC · CONTINUAÇÃO DAS JUSTIFICATIVAS</b>'
   +'<span>'+esc(f.processo)+' · '+esc(f.item)+' · Frase '+esc(f.indice)+' · Complemento '+number+'</span></header>'
   +'<div class="flow-jintro"><b>Frase analisada:</b> '+esc(f.frase||'')+'<br><b>Revisor:</b> '+esc(ctx.revisor||'Não informado')+' · '+esc(ctx.data||'Data não informada')+'</div>'
   +'<div class="flow-jgrid">'+group.map(c=>cardHTML(c)).join('')+'</div>'
   +'<footer class="flow-jfoot">Justificativas de IA dependem de conferência técnica. Textos integrais preservados também no JSON.</footer>'
   +'</article>';
 }
 return html;
}
window.APPCC_FLOW_PRINT={build};
})();
