# Revisão APPCC — Configuração do Guia Estadual

**Aplicativo:** https://wernermoura2-web.github.io/revisao-appcc-configuracao/

Editor HTML/PWA independente para as **76 frases**, organizado por processo, item e frase. O aplicativo não altera o Guia oficial nem o Supabase.

## Módulos

- **Revisar APPCC:** Tabela 1 (A–E), Tabela 2 (F–I), Tabela 3 (Q1–Q4 e seis critérios). A Tabela 1 identifica um controle significativo a diferenciar como PCC/PPRO; a classificação final entre PCC e PPRO depende do caminho Q1–Q4 e da validação. PPHO, PPR e PC são classificados na Tabela 2. O resultado técnico não equivale à homologação do Guia.
- **Revisar configuração da frase:** quatro colunas para foco APPCC, considerando, observações, orientações, texto da frase e documentos.
- **Imprimir APPCC:** relatório gráfico em A4 horizontal, **uma frase por página**, com quadros e setas do caminho respondido, classificação antes/depois, revisor/data, perigo, medidas, critérios, evidências e observações. As perguntas não percorridas aparecem como não aplicáveis. Exemplos originais excepcionalmente longos têm resumo identificado na página gráfica; o conteúdo integral permanece na página de configuração e na exportação.
- **Imprimir configuração:** página em quatro colunas por frase, com complementos para conteúdo extenso.
- **Apêndice C:** quadro comparativo APPCC Antes/Depois, filtrável por frase, item, processo ou total.

## Consulta ao Google Gemini

Cada caixa editável de análise/configuração tem **Consultar IA Google**, **Restaurar texto anterior** e **Restaurar original** quando aplicável. A consulta abre um diálogo que prepara um pedido de redação curta e objetiva. O revisor **copia** a consulta e a leva manualmente ao Gemini; depois revê a sugestão e a aplica ao campo. **O aplicativo não faz chamada automática ao Gemini nem incorpora chave de API pública.** Evite enviar dados sigilosos a serviços externos. Resposta de IA não é evidência ou homologação técnica.

## Proteção dos dados

- Salvamento local e cópias de segurança configuráveis.
- Exportar revisão (JSON) preserva edições e histórico de textos anteriores.
- Importação JSON permite retomar a revisão.
- Exportar configuração para o Guia gera uma proposta para homologação, **não altera o Guia nem o Supabase**.
- PWA separado dos outros guias, com manifesto, ícone e modo offline.

## Alterações de 18/10/2026

1. Corrigido falso alerta de divergência quando a Tabela 1 encaminha PCC/PPRO e Q1–Q4 classifica PPRO.
2. Melhorada a apresentação dos resultados PPHO, PPR, PC, PPRO e PCC.
3. Criado relatório gráfico com perguntas realmente percorridas, setas, seis justificativas da Tabela 3, evidências, documentos e observações.
4. Adicionada consulta manual ao Gemini em cada caixa editável, com opção de restaurar texto anterior e texto-base original.
5. Acrescentada distinção entre orientação/texto-base e evidência registrada pelo revisor.
6. Atualizado cache PWA para incorporar os arquivos de impressão e consulta.

**Validações realizadas no código:** 17 caminhos de decisão APPCC (incluindo os percursos PCC/PPRO da simulação); geração de 76 páginas HTML gráficas, uma para cada frase; verificações de sintaxe dos scripts. A impressão real e o comportamento de instalação ainda devem ser conferidos no navegador/dispositivo usado pelo revisor.
