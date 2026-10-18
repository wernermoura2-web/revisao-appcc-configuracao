/* Representação visual, somente para impressão, das Tabelas 1, 2 e 3 APPCC.
   Não altera respostas nem classifica por conta própria: reflete o diagnóstico do editor. */
(function(){
'use strict';
const short1={
 A:'O perigo identificado é significativo?',
 B:'Existe uma medida preventiva ou de controle?',
 C:'A etapa foi concebida para controlar o perigo?',
 D:'O perigo pode chegar ao nível inaceitável?',
 E:'Há barreira posterior comprovadamente eficaz?'
};
const short2={
 F:'Controle operacional de perigo significativo?',
 G:'Higienização ou desinfecção operacional?',
 H:'Condição básica, infraestrutura ou capacitação?',
 I:'Controle específico de apoio e verificação?'
};
const short3={
 Q1:'É necessária medida de controle neste passo?',
 Q2:'As medidas já estão implementadas?',
 Q3:'A falha coloca em risco a segurança do produto?',
 Q4:'Há limite crítico e monitoramento oportuno?'
};
const v=x=>String(x??'');
const esc=x=>v(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const weight={PPHO:1,PPR:2,PC:3,PPRO:4,PCC:5};
const valid=x=>x==='S'||x==='N';
function response(q,k,active){
 if(!active)return {label:'N/A',css:'skip'};
 return q[k]==='S'?{label:'Sim',css:'yes'}:q[k]==='N'?{label:'Não',css:'no'}:{label:'—',css:'pending'};
}
function node(k,caption,q,active){
 const answer=response(q,k,active);
 return '<div class="flow-node s-'+answer.css+'"><span class="nkey">'+esc(k)+'</span><span class="ntxt">'+esc(caption)+'</span><span class="nanswer">'+answer.label+'</span></div>';
}
function pathNodes(items,q,active){
 const all=Object.entries(items);
 const used=all.filter(([k])=>!!active[k]);
 const skipped=all.filter(([k])=>!active[k]).map(([k])=>k);
 const main=used.map(([k,t],i)=>node(k,t,q,true).replace('class="flow-node ',i===used.length-1?'class="flow-node flow-last-active ':'class="flow-node ')).join('');
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
 const t1=pathNodes(short1,q,active);
 const t2=pathNodes(short2,q,active);
 const qActive=d.route==='3'?(d.eur?.active||{}):{};
 const t3=pathNodes(short3,e,qActive);
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
 const exampleForPrint=fullExample;
 const approval=d.route==='3'?ctx.aprovacao?'Aprovação técnica registrada':'Aprovação técnica pendente':ctx.conferenciaT2?'Conferência da Tabela 2 registrada':'Classificação da Tabela 2 / análise pendente';
 const end=v(ctx.justificativaAprovacao).trim();
 const review=esc(ctx.revisor||'Não informado'), date=esc(ctx.data||'Data não informada');
 const danger=esc(f.perigo||'Não registrado'), measure=esc(f.medida||'Não registrada');
 return '<article class="print-page flow-print-page" data-part="analysis">'
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
  +'<div class="flow-validation"><div class="flow-section-title">TABELA 3 · SEIS REQUISITOS DE VALIDAÇÃO <small>Resultado obtido: '+esc(d.classe||'Pendente')+' · Respostas editadas pelo revisor</small></div><div class="flow-validation-grid">'+cards+'</div></div>'
  +'<div class="flow-observation"><div class="flow-section-title">EVIDÊNCIAS, JUSTIFICATIVAS E OBSERVAÇÕES <small>Textos inseridos ou conservados no editor</small></div><div class="flow-observation-grid">'
  +note('Evidências das inspeções',f.evidencias)
  +note('Justificativa da classificação',ctx.justificativaRevisao||ctx.notaT2)
  +note('Observação / exemplo da frase',exampleForPrint)
  +note('Observações dos documentos avaliados',docs)
  +'</div></div>'
  +'<footer class="flow-footer"><span><b>'+esc(approval)+'</b>'+(end?' · '+esc(end):'')+'</span><em>Escala local APPCC: PPHO 1 · PPR 2 · PC 3 · PPRO 4 · PCC 5. Resultado da revisão; não altera o Guia oficial.</em></footer>'
  +'</div></article>';
}
window.APPCC_FLOW_PRINT={build};
})();
