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

## Apoio Gemini às perguntas Sim/Não

- Botão **Consultar Gemini sobre A–I / Q1–Q4** junto de cada pergunta atualmente aplicável nas Tabelas 1, 2 e 3.
- Consulta contextualizada com a frase, perigo, medida de controle, classificações e respostas já dadas.
- Resposta externa no formato **SIM / NÃO / INDETERMINADO**, justificativa curta e evidência necessária. A consulta é copiada e a resposta colada manualmente; não há chamada automática à API do Google.
- **Somente o revisor** escolhe e confirma Sim ou Não; não se alteram respostas automaticamente. Se faltarem evidências, ele pode deixar a pergunta sem nova marcação.
- As regras vigentes de habilitação das perguntas e de invalidação/revisão das classificações seguem sendo aplicadas pelo próprio editor. O aplicativo oferece instrução de retorno ao Android/Gemini e procura recuperar a frase após o retorno.

## Registro e impressão das justificativas por pergunta

- Campos individuais de **justificativa** e **evidência necessária/fundamentação** em todas as perguntas A–I e Q1–Q4 (por frase), preenchidos manualmente ou a partir da resposta colada do Gemini e editáveis pelo revisor.
- A consulta Gemini oferece a opção **Salvar justificativa sem marcar Sim/Não**. A resposta sugerida não marca automaticamente nenhum botão.
- Dados em `edits[n].questionNotes[k]` são mantidos no salvamento local, no JSON exportado e nos backups, inclusive se o caminho da árvore mudar; perguntas não aplicáveis ficam em modo somente leitura. Cada campo pode restaurar a versão anterior, com histórico no backup.
- Na **impressão gráfica**, o fluxograma mostra um resumo sob cada pergunta ativa que tem justificativa. Havendo registros, páginas complementares apresentam **a íntegra da justificativa e evidências**, com pergunta, decisão e indicação de conferência. Textos longos passam para novas páginas sem corte.

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

## Impressão gráfica compacta (18/10/2026)

- **Fluxograma e até seis quadros de justificativa na mesma folha A4 vertical** por frase (substitui a separação anterior entre folha do fluxograma e duas folhas de justificativas).
- Os campos de cada pergunta indicam resposta Sim/Não/N/A, justificativa, evidências necessárias e se a sugestão foi conferida.
- Para preservar a integridade dos textos, justificativas excepcionalmente longas ou em quantidade superior à capacidade da folha são encaminhadas às páginas complementares; a exportação JSON mantém o conteúdo integral.
- A configuração da frase e o Apêndice C mantêm seus formatos anteriores.
