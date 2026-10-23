# Bilheteria Digital

Contexto resumido do cliente para quem for trabalhar nos scripts desta pasta.

## Cliente

Bilheteria Digital é uma plataforma de venda de ingressos. Os produtores de eventos são clientes da plataforma e são gerenciados no **painel próprio** da Bilheteria Digital (sistema interno deles, fora do HubSpot).

O HubSpot é usado pelo time comercial. O negócio (deal) concentra os dados cadastrais do produtor, e um workflow envia esses dados ao painel para criar o produtor lá.

## Integração com o painel

| Item | Valor |
| --- | --- |
| Endpoint | `POST https://ms.bilheteriadigital.net/hubspot-integration/v1/producers` |
| Autenticação | header `x-api-key` com o secret `BD_SERVICE_KEY` |
| Token HubSpot | secret `BD_HUBSPOT_TOKEN` (private app, leitura de deals) |
| Retorno esperado | `produtor_id` no corpo da resposta |
| Erro | mensagem em `error` ou `message` no corpo da resposta |

A API de produtores é mantida pela Bilheteria Digital. Mudança de contrato (campos novos, renomeados ou obrigatórios) depende deles.

## Scripts

### `painel/createProducerOnPainel.js`

Custom code de **ação de workflow baseado em negócio**.

Fluxo:

1. Lê os dados do produtor dos `inputFields` do workflow.
2. Busca o `hubspot_owner_id` do deal via API do HubSpot e envia como `comercial_id`.
3. Envia `hubspot_id` = ID do deal, para o painel guardar a referência.
4. Normaliza o telefone com `onlyDigits` (remove não dígitos e o prefixo `55`).
5. Remove do corpo os campos `undefined` e faz o POST.
6. Devolve os output fields: `hs_execution_state`, `producerId`, `comercialId`, `error`, `errorStatus`, `errorCode`, `errorMessage`.

Erros da API (`{ "error": <código>, "message": "<texto>" }`). O script prioriza a `message` da API e usa a descrição abaixo quando ela não vem:

| HTTP | Código | Significado |
| --- | --- | --- |
| 401 | 1001 | x-api-key ausente ou inválida |
| 400 | 1002 | corpo ausente ou JSON malformado |
| 400 | 1003 | campo obrigatório ausente ou em formato inválido |
| 404 | 2002 | comercial_id não encontrado |
| 404 | 2004 | cidade/estado não cadastrados |
| 404 | 2005 | praca_id não existe ou está inativo |
| 500 | 9001 | falha inesperada |

Timeout, falha de rede ou falha ao buscar o owner no HubSpot: `errorStatus` e `errorCode` saem `null`, com a mensagem em `errorMessage`.

Mapeamento de campos (input do workflow para o corpo da API):

| Input do workflow | Campo na API |
| --- | --- |
| `tipo_de_produtor` | `tipo_produtor` |
| `cpf` | `cpf_produtor` |
| `cnpj` | `cnpj_produtor` |
| `nome_do_produtor` | `nome_produtor` |
| `nome_fantasia` | `nome_fantasia_produtor` |
| `inscricao_estadual` | `inscricao_estadual_produtor` |
| `contribuinte_import` | `contribuinte` |
| `numero_de_telefone` | `telefone` |
| `estado`, `cidade`, `email`, `estado_civil`, `profissao`, `cep`, `logradouro`, `numero`, `complemento`, `bairro`, `razao_social`, `praca_id`, `hubspot_owner_id`, `banco`, `agencia`, `tipoconta`, `nome_do_dealer` | mesmo nome |
| `conta` (sem o dígito) | `conta` |
| `conta` (dígito, separado do número pelo `-`) | `digitoConta` |
| (owner do deal, via API) | `comercial_id` |
| (ID do deal) | `hubspot_id` |

O input `conta` chega com o dígito verificador junto ao número, separado por `-` (ex.:
`12345-6`). O script separa os dois com uma regex antes de montar o corpo da API: o
número vai em `conta` e o dígito em `digitoConta`. Se o valor não tiver `-`, o script
envia o que recebeu em `conta` e deixa `digitoConta` vazio, sem quebrar.

### `painel/createProducerOnHubspot.js`

Custom code de **ação de workflow baseado em negócio**. Roda depois do
`painel/createProducerOnPainel.js`, no mesmo workflow, e cria o registro de produtor
no HubSpot (objeto customizado `2-55743372`), associado ao negócio, à empresa e ao
contato do negócio.

Fluxo:

1. Lê os dados do produtor dos `inputFields` do workflow, incluindo `id_do_produtor`
   (retornado pelo script anterior) e `comercialId`.
2. Busca as empresas e os contatos associados ao negócio via API do HubSpot.
3. Monta as associações do novo registro de produtor com o negócio, as empresas e os
   contatos encontrados.
4. Cria o registro de produtor com `POST` no objeto customizado.
5. Devolve os output fields: `hs_execution_state`, `error`, `errorMessage`.

Diferente do `createProducerOnPainel.js`, o campo `conta` aqui **não** é separado do
dígito: vai para a propriedade `conta` como chega do input field, dígito junto.

Mapeamento de campos (input do workflow para propriedade do objeto de produtor no
HubSpot): mesmo nome em `tipo_de_produtor`, `cpf`, `cnpj`, `nome_do_produtor`, `estado`,
`cidade`, `nome_fantasia`, `inscricao_estadual`, `estado_civil`, `profissao`,
`numero_de_telefone`, `bairro`, `complemento`, `cep`, `numero`, `logradouro`,
`razao_social`, `praca_id`, `banco`, `agencia`, `tipoconta`, `nome_do_dealer`, `conta`;
`contribuinte_import` vai para `contribuinte`, e `comercialId` vai para
`id_do_comercial`.

### `painel/proposalNotification.js`

Custom code de **ação de workflow baseado em negócio**. Cria a proposta no painel via `POST https://ms.bilheteriadigital.net/hubspot-integration/v1/create-proposal`.

Fluxo:

1. Lê `id_do_produtor` e `praca_id` dos `inputFields`.
2. Busca o `hubspot_owner_id` do deal e envia como `comercial_id`, com `hubspot_id` = ID do deal.
3. Devolve os output fields: `hs_execution_state`, `error`, `errorStatus`, `errorCode`, `errorMessage`, no mesmo formato de `createProducerOnPainel.js`.

Erros da API, com o mesmo fallback do script de produtor:

| HTTP | Código | Significado |
| --- | --- | --- |
| 401 | 1001 | x-api-key ausente ou inválida |
| 400 | 1002 | corpo ausente ou JSON malformado |
| 400 | 1003 | produtor_id, hubspot_id, comercial_id ou praca_id ausente |
| 404 | 2001 | produtor_id não encontrado |
| 404 | 2002 | comercial_id não encontrado |
| 404 | 2005 | praca_id não existe ou está inativo |
| 500 | 9001 | falha inesperada |

Falha ao buscar o owner no HubSpot ou de rede: `errorStatus` e `errorCode` saem `null`, com a mensagem em `errorMessage`.

## Pontos de atenção no script atual

Levantados na leitura do código em 2026-10-02, ainda não corrigidos:

- **Prefixo 55 no telefone:** `onlyDigits` remove `55` do início sempre. Um número sem código de país com DDD 55 (região de Santa Maria, RS) perde o DDD.
- **Owner duplicado:** o owner chega duas vezes, como `hubspot_owner_id` (input) e `comercial_id` (buscado na API). Falta confirmar com o cliente qual dos dois o painel usa.
- **Log com dados pessoais:** `console.log(bodyFiltered)` grava CPF, e-mail e telefone nos logs do workflow.

