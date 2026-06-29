# Controle Financeiro — Design

## Contexto e objetivo

App pessoal/familiar de controle financeiro. Usuários: Wagner e esposa (2 contas).
Objetivo: centralizar categorização de gastos de cartão de crédito e extrato bancário,
dividir gastos por pessoa, fechar meses, ver relatórios e acompanhar investimentos.

## Stack

- Next.js (App Router), hospedado na Vercel (plano Hobby, gratuito).
- Postgres via Neon (Vercel Marketplace, tier gratuito).
- Auth simples: email + senha, 2 contas fixas (Wagner, esposa).

## Modelo de dados

- **users**: contas de login (Wagner, esposa).
- **people**: pessoas para divisão de gastos (pode incluir pessoas sem login, ex. filho).
- **categories**: nome + regra de divisão fixa (% por `person`), soma deve ser 100%.
- **cards**: cartões de crédito (nome, últimos 4 dígitos, banco).
- **bank_accounts**: contas bancárias.
- **statement_imports**: registro de cada upload (tipo `fatura`/`extrato`, mês de referência, card/account associado, arquivo origem).
- **transactions**: descrição, valor, data, categoria (FK, nullable até categorizar), origem (card ou bank_account), parcela atual/total (nullable), `installment_group_id` (nullable), tag de categoria sugerida pelo banco (texto livre), `statement_import_id`.
- **months**: mês/ano com status `aberto`/`fechado` (flag visual apenas — não bloqueia edição de transações).
- **investments**: tipo de ativo, descrição, valor do aporte, data, saldo atual (atualizado manualmente).

## Fluxo: import de fatura de cartão (PDF)

Referência: faturas Itaú (formato real analisado).

**Parsing**:
- Extrair texto do PDF (lib de extração de texto, ex. `pdf-parse` ou similar).
- Identificar seções: "Lançamentos: compras e saques" (por titular/dependente — texto bruto identifica nome do titular antes do bloco, mas todos os lançamentos do cartão entram juntos sem distinção de pessoa), "Lançamentos internacionais", "Lançamentos: produtos e serviços" (anuidade, taxas).
- Por linha de lançamento: data (DD/MM), estabelecimento, parcela atual/total se presente no formato `NN/NN` junto à descrição, valor em R$, e a linha seguinte com tag sugerida (ex. "saúde SAO PAULO") — separar tag de categoria (primeira palavra) da cidade.
- Cartão identificado pelos últimos 4 dígitos do número mascarado no cabeçalho do PDF, associado ao registro `cards` correspondente.
- Suporta múltiplos PDFs de fatura no mesmo mês (um por cartão).
- Valores negativos (reembolsos/estornos) são lançamentos normais com valor negativo.

**Categorização**:
- Cada transação nova exibe a tag sugerida pelo banco mapeada para uma categoria do usuário (mapeamento simples tag→categoria, editável/configurável), pré-selecionada no formulário de categorização. Usuário confirma ou troca.
- Parcelamento: ao categorizar a parcela N/T pela primeira vez, grava a categoria associada à chave (descrição normalizada + total de parcelas T). Ao importar a fatura do mês seguinte, se encontrar lançamento com a mesma chave e parcela N+1/T, aplica a categoria automaticamente (com opção de revisar/alterar).
- Sem pré-criação de parcelas futuras a partir da seção "Compras parceladas - próximas faturas" — cada mês só recebe transações quando a fatura daquele mês é de fato importada.

## Fluxo: import de extrato bancário (PDF)

- Extrair texto do PDF, tabela com data (DD/MM/AAAA), descrição, valor — ignorar linhas "SALDO DO DIA" (são saldo acumulado, não transação).
- Como o período do extrato cobre múltiplos meses corridos (não fecha no mês calendário), o usuário seleciona o **mês de referência** no momento do import; o sistema filtra e cria apenas transações cuja data cai dentro daquele mês calendário.
- Deduplicação: ao importar, ignora linhas cuja combinação (data + descrição + valor) já existe em uma transação importada anteriormente da mesma conta — evita duplicar lançamentos quando dois extratos se sobrepõem em datas.
- Categorização manual (sem lógica de parcelamento — extrato bancário não tem parcelas).
- Suporta apenas formato PDF (não há necessidade de suportar Excel no momento).

## Fechamento mensal

- Ação de "fechar mês" marca o registro `months` correspondente como `fechado`.
- É apenas um flag visual/organizacional — transações continuam editáveis livremente depois do fechamento.

## Relatórios

- Aba com gastos totais por categoria (tabela + gráfico), filtrável por mês ou período.
- Divisão por pessoa: aplica o % fixo de cada categoria sobre os valores das transações daquela categoria, somando por pessoa.

## Investimentos

- Aba de registro manual: tipo de ativo, valor do aporte, data, saldo atual.
- Gráfico de evolução do total investido ao longo do tempo (soma de saldo atual por mês/data de registro).
- Sem integração automática com corretora/banco.

## Fora de escopo (explicitamente)

- Múltiplos usuários/famílias além das 2 contas fixas.
- App mobile nativo ou PWA — só web app responsivo.
- Parser de extrato em Excel.
- Pré-criação automática de parcelas futuras antes da fatura do mês chegar.
- Integração automática com corretoras/bancos para investimentos.
- Trava de edição de transações em meses fechados.
