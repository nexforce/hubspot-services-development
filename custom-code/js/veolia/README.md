# Veolia - Integracao Uplog

Scripts de custom code (Node.js) para a integracao do portal Veolia com a Uplog.

## Cliente

Conta HubSpot **43565069**, plano **STANDARD**, **sem sandbox**. Por isso, a
validacao da integracao acontece em homologacao da Uplog e no proprio portal de
producao, com o workflow desligado ate a liberacao.

Direcao unica **HubSpot -> Uplog**. O HubSpot envia, a Uplog cria. Nada volta
para o HubSpot: o resultado aparece apenas como output do workflow.

O envio cria dois registros na Uplog, nesta ordem:

1. **Gerador**, a partir dos dados cadastrais do negocio.
2. **Contrato**, com o local de fatura, os locais de coleta e os residuos.

## Integracao

| Item | Valor |
| --- | --- |
| Login | `GET {baseUrl}/wp-json/jwt-auth/v1/token?username=...&password=...` |
| Autenticacao | `Authorization: Bearer <token>` nas chamadas de negocio |
| Gerador | `POST {baseUrl}/wp-json/api/v11/gerador` |
| Contrato | `POST {baseUrl}/wp-json/api/v11/contrato` |
| Sucesso | corpo com `response: true` |
| Erro | corpo com `response: false`, mais `code`, `message` e `data.status` |
| Credenciais | login unico por ambiente (hom/prod), base URL por unidade, em secrets |

A Uplog e mantida por terceiro. Mudanca de contrato (campo novo, renomeado ou
obrigatorio) depende deles.

### Por que nem todo gerador vira contrato

Se o gerador responder `response: false`, o script registra `code`, `message` e
`data.status`, devolve erro e **nao** chama o contrato. O contrato so e criado
depois de um gerador confirmado.

### Roteamento por unidade

O roteamento usa o **value interno** da propriedade `unidade_de_atendimento` do
negocio, comparado com o mapa `UNIT_MAP` definido no proprio codigo:

```
floripa: "PMA Sul"
alagoas: "Serquip"
```

Os values foram verificados na live do portal (a propriedade e uma enumeracao; a
comparacao e pelo value interno, nao pelo label). Se o mapa estiver vazio, ou o
value da propriedade nao casar com nenhuma unidade, o script para com erro claro
de `UNIT_MAP_EMPTY` ou `UNIT_NOT_RESOLVED` e nao chama a Uplog.

O `codigoCnpj` enviado ao contrato continua vindo de `codigo_da_unidade_da_veolia`,
conforme o de/para. Apenas o roteamento usa `unidade_de_atendimento`.

### Exemplo de resposta

```json
{ "response": false }
```

```json
{ "response": true, "code": "123", "message": "Operacao concluida", "data": { "status": 200 } }
```

No endpoint de contrato, confirmado em teste de homologacao, o sucesso aparece assim,
com `response` como o id numerico do registro criado na Uplog, nao o booleano `true`:

```json
{ "data": { "status": "200" }, "response": 20840 }
```

O script considera sucesso qualquer valor "truthy" de `response` (booleano `true` ou
um numero de id, por exemplo), e falha apenas quando `response` vem `false` (conforme
documentado pela Uplog) ou ausente. Checagem por igualdade estrita com `true` foi
removida porque não cobria o formato real do endpoint de contrato: o script reportava
falha (`UPLOG_CONTRACT_FAILED`) mesmo com o contrato criado de verdade na Uplog.

## De/para implementado

### Gerador

| Origem no HubSpot | Campo na Uplog | Observacao |
| --- | --- | --- |
| `cpf` (senao `cnpj`) | `cnpjCpf` | sem formatacao (so digitos, via `onlyDigits`); se os dois estiverem vazios, erro `MISSING_DOCUMENT` |
| `veo_commercialname__c` | `razaoSocial` | |
| `nome_fantasia` | `nomeFantasia` | |
| `codigo_cliente` | `codigoCliente` | mesmo valor reaproveitado no contrato |
| `status` | `status` | |

### Contrato

| Origem no HubSpot | Campo na Uplog | Observacao |
| --- | --- | --- |
| `codigo_cliente` | `codigoCliente` | mesmo valor do gerador (decisao confirmada) |
| `codigo_da_unidade_da_veolia` | `codigoCnpj` | |
| `record_type_id` | `codigoContrato` | decisao confirmada |
| contato `firstname` (senao `lastname`, senao `email`) | `nome` | contato primario do negocio |
| contato `email` | `email` | |
| contato `phone` | `telefone` | |
| `status` | `status` | |
| `observacao` | `observacao` | |

### Local de fatura

| Origem no HubSpot | Campo na Uplog | Observacao |
| --- | --- | --- |
| `endereco` | `codigoLocal` | |
| `titulo` | `titulo` | |
| `e_mail_de_contato` | `email` | |
| Empresa `billingpostalcode` | `cep` | decisao confirmada: CEP da empresa associada |
| `logadouro` | `logradouro` | nomes diferentes de proposito: o payload usa `logradouro` |
| `numero` | `numero` | |
| `complemento` | `complemento` | |
| `distrito` | `distrito` | |
| `bairro` | `bairro` | |
| `cidade` | `cidade` | |
| `estado_regiao` | `uf` | convertido para 2 letras maiusculas quando vier por extenso |
| `observacao` | `observacao` | |

### Local de coleta (objeto `2-71880835`)

| Origem no HubSpot | Campo na Uplog | Observacao |
| --- | --- | --- |
| `hs_object_id` | `codigoLocal` | |
| `titulo` | `titulo` | |
| contato do negocio `email` | `email` | premissa: nesta fase reaproveita o contato do negocio |
| `cep` | `cep` | |
| `distrito` | `distrito` | |
| `logadouro` | `logradouro` | |
| `numero` | `numero` | |
| `complemento` | `complemento` | |
| `bairro` | `bairro` | |
| `cidade` | `cidade` | |
| `estado_regiao` | `uf` | via `toUf` |
| `observacao` | `observacao` | |
| `status` | `status` | |

### Residuos (itens de linha do local de coleta)

Cada residuo e um item de linha (`line_items`) associado ao local de coleta
(`2-71880835`), pela associacao de typeId `84`. Um item de linha vira um elemento
de `residuos`.

| Origem no HubSpot (item de linha) | Campo na Uplog | Observacao |
| --- | --- | --- |
| `codigo_do_residuo` | `residuos[].codigoResiduo` | itens sem codigo sao ignorados |
| `frequencia_coleta` | `residuos[].frequencia` | convertida para o codigo numerico da Uplog via `FREQUENCY_CODE_MAP` |

#### Mapeamento de frequencia (`FREQUENCY_CODE_MAP`)

O valor interno de `frequencia_coleta` no HubSpot nao esta no padrao da Uplog, entao
e convertido para o codigo numerico. As chaves do mapa sao **exatamente** os internal
values da propriedade `frequencia_coleta` (`line_items`), com acento e caixa originais,
comparadas por igualdade exata (sem normalizacao):

| Internal value no HubSpot | Codigo Uplog | Significado |
| --- | --- | --- |
| `Conforme solicitação` | `1` | coleta somente por agendamento |
| `Diária` | `2` | coleta todos os dias |
| `Semanal` | `3,0` | semanal (padrao; dia da semana ainda nao detalhado) |
| `Mensal` | `4,0` | mensal (padrao; dia do mes ainda nao detalhado) |

Valores considerados por enquanto, definidos pelo consultor: `2` diario, `3,0`
semanal, `4,0` mensal. O de/para preve tambem o codigo `5` (Sequencia), mas esse
valor nao existe no enum atual da propriedade, por isso nao esta no mapa. Os demais
valores do HubSpot sem equivalente (`Quinzenal`, `Bimestral`, `Trimestral`,
`Semestral`, `Anual`, `Eventual`, `2 X ao Mes`, `Única`, `2x na semana`,
`3x na semana`, `Emergencial`) ficam sem codigo (`""`) e sao registrados como
"sem mapeamento" no log.

## Ambiente

O ambiente (`hom` ou `prod`) e uma constante no codigo, `UPLOG_ENVIRONMENT`, no
topo de `veoliaUplogSync.js`. Ele **nao** vem de variavel de ambiente: a troca
entre homologacao e producao e feita manualmente no codigo, antes de colar o
trecho no portal.

## Secrets

Todas em `process.env`. Nenhum valor fica no codigo. O login e o **mesmo** para as
duas unidades, por isso usuario e senha nao tem recorte de unidade.

| Secret | Uso |
| --- | --- |
| `HUBSPOT_TOKEN_PRODUCAO_VEOLIA` | leitura do negocio, contato, empresa e locais de coleta |
| `UPLOG_HOMOLOGACAO_USERNAME` | usuario da Uplog, homologacao (as duas unidades) |
| `UPLOG_HOMOLOGACAO_PASSWORD` | senha da Uplog, homologacao (as duas unidades) |
| `UPLOG_PROD_USERNAME` | usuario da Uplog, producao (as duas unidades) |
| `UPLOG_PROD_PASSWORD` | senha da Uplog, producao (as duas unidades) |
| `UPLOG_FLORIPA_BASE_URL_HOMOLOGACAO` | base URL da Uplog, Floripa, homologacao |
| `UPLOG_FLORIPA_BASE_URL_PRODUCAO` | base URL da Uplog, Floripa, producao |
| `UPLOG_ALAGOAS_BASE_URL_HOMOLOGACAO` | base URL da Uplog, Alagoas, homologacao |
| `UPLOG_ALAGOAS_BASE_URL_PRODUCAO` | base URL da Uplog, Alagoas, producao |

As secrets de producao (`UPLOG_PROD_USERNAME`, `UPLOG_PROD_PASSWORD`,
`UPLOG_FLORIPA_BASE_URL_PRODUCAO`, `UPLOG_ALAGOAS_BASE_URL_PRODUCAO`) ficam como
placeholder ate o consultor receber as credenciais de producao da Uplog. Enquanto
`UPLOG_ENVIRONMENT = "hom"` no codigo, elas nao sao usadas.

## Retorno do workflow

`veoliaUplogSync.js` devolve output fields (todos string) e nao grava nada no
negocio:

| Campo | Conteudo |
| --- | --- |
| `uplog_status` | sempre `SUCCESS` (em erro a action falha, ver abaixo) |
| `uplog_unidade` | unidade resolvida (`floripa`, `alagoas`) |
| `uplog_gerador_ok` | `true` |
| `uplog_contrato_ok` | `true` |

### Quando a Uplog (ou uma etapa anterior) rejeita o envio

A action falha de verdade: o script lanca uma excecao e o HubSpot registra a
execucao como falha no historico do workflow, sem gravar nenhum output field.
Antes, a action sempre aparecia como "concluida com exito" e so o campo
`uplog_status` indicava erro, o que escondia a falha de quem olhasse apenas o
resultado da action (decisao corrigida a pedido do operador).

A mensagem de erro, visivel no painel de falha da action, vem neste formato:

```
unidade=<floripa|alagoas|-> gerador=<true|false> contrato=<true|false> [<codigo>] <mensagem>
```

`gerador=true` com `contrato=false` e uma falha parcial: o gerador ja foi criado na
Uplog, mas o contrato nao. Esse caso precisa de acompanhamento manual, porque este
de/para nao tem endpoint de cancelamento do gerador.

Para reagir a uma falha (criar tarefa, enviar aviso), configure o workflow pela
propria ramificacao de falha da action, e nao mais por uma condicao sobre
`uplog_status`.

## Tratamento de erro

Qualquer um dos codigos abaixo faz a action falhar (lanca excecao), nao apenas
devolve um status de erro nos campos de saida.

| Codigo | Quando acontece | Retry |
| --- | --- | --- |
| `MISSING_HUBSPOT_TOKEN` | `HUBSPOT_TOKEN_PRODUCAO_VEOLIA` ausente | nao |
| `MISSING_DEAL_ID` | evento sem id de negocio | nao |
| `HUBSPOT_READ_FAILED` | falha ao ler o negocio, contato, empresa ou locais | nao |
| `UNIT_MAP_EMPTY` | `UNIT_MAP` no codigo esta vazio | nao |
| `UNIT_NOT_RESOLVED` | codigo do negocio nao casa com o mapa | nao |
| `INVALID_ENVIRONMENT` | `UPLOG_ENVIRONMENT` (constante no codigo) diferente de `hom` ou `prod` | nao |
| `MISSING_CREDENTIALS` | credencial faltando para a unidade e ambiente | nao |
| `MISSING_DOCUMENT` | negocio sem `cpf` e sem `cnpj` | nao |
| `UPLOG_LOGIN_FAILED` | login recusado (401/403) | nao, erro de credencial |
| `UPLOG_UNAUTHORIZED` | 401 nas chamadas de negocio depois de reautenticar | reautentica uma vez |
| `UPLOG_TRANSIENT_EXHAUSTED` | 429 ou 5xx apos 3 tentativas | 3 tentativas com backoff |
| `UPLOG_GENERATOR_FAILED` | gerador retornou `response` falsy (`false` ou ausente) | nao, sem loop |
| `UPLOG_CONTRACT_FAILED` | contrato retornou `response` falsy (`false` ou ausente) | nao, sem loop |

Politica completa: 401 no login para na hora; 401 nas chamadas de negocio
reautentica uma unica vez e repete; 429 e 5xx entram em backoff simples com no
maximo 3 tentativas; `response: false` registra e para a etapa, sem loop. Erro de
validacao de payload nao tem retry.

O log nunca imprime token nem senha. So aparecem `code`, `message` e `status`
retornados pela Uplog.

## Normalizacao de CPF/CNPJ

As propriedades `cpf` e `cnpj` do negocio podem vir formatadas no HubSpot (pontos,
traco, barra). Antes de montar `cnpjCpf` para o gerador, o script remove toda
formatacao com `onlyDigits`, deixando so os digitos, porque e esse o formato que a
Uplog espera. A escolha entre `cpf` e `cnpj` (o primeiro preenchido) acontece depois
da limpeza, entao um campo com so caracteres de formatacao conta como vazio.

## Premissas e pendencias

- **Roteamento por `unidade_de_atendimento`.** O value interno da propriedade
  decide a unidade: `PMA Sul` = Florianopolis, `Serquip` = Alagoas. Se a Veolia
  adicionar ou renomear values no enum, o `UNIT_MAP` no codigo precisa acompanhar.
- **Residuos vem de itens de linha.** Cada residuo e um item de linha (`line_items`)
  associado ao local de coleta (`2-71880835`) pelo typeId `84`. `codigo_do_residuo`
  vira `codigoResiduo` e `frequencia_coleta` vira `frequencia`, por item. A montagem
  esta isolada em `buildResiduos(lineItems)`.
- **Local de coleta usa o contato do negocio.** Nesta fase o `email` do local de
  coleta reaproveita o e-mail do contato do negocio. Se a Veolia passar a usar um
  contato proprio por local, isso precisa mudar.
- **`record_type_id` como `codigoContrato`.** Decisao confirmada com o consultor.
- **Idempotencia na Uplog.** O HubSpot nao grava marcador de "ja enviado". Se o
  workflow rodar duas vezes para o mesmo negocio, a Uplog e quem trata a
  duplicidade. Decisao do consultor.
- **Sem sandbox no portal.** A conta 43565069 e STANDARD sem sandbox, entao o
  teste e feito em homologacao da Uplog e no portal de producao com o workflow
  desligado.

## Como testar em homologacao

O arquivo tem dois blocos: o trecho que vai do inicio ate o marcador `[FINAL]`
(esse e o que se cola no custom code do workflow) e o bloco de teste local, que
fica depois do marcador e nao deve ser colado.

Importante: as variaveis de ambiente precisam estar carregadas **antes** de o
modulo ser importado, porque as credenciais sao lidas no carregamento. Por isso,
exporte as variaveis no shell (ou use um `.env`) antes de rodar. O ambiente nao e
variavel de ambiente: para testar homologacao, `UPLOG_ENVIRONMENT` ja esta `"hom"`
no codigo.

```bash
# 1. Variaveis de ambiente (exemplo com valores ficticios)
export HUBSPOT_TOKEN_PRODUCAO_VEOLIA="<token do HubSpot da conta Veolia>"
export UPLOG_HOMOLOGACAO_USERNAME="<usuario-hom>"
export UPLOG_HOMOLOGACAO_PASSWORD="<senha-hom>"
export UPLOG_FLORIPA_BASE_URL_HOMOLOGACAO="https://<host-uplog-hom>"

# 2. Executar com o id do negocio de teste
node custom-code/js/veolia/veoliaUplogSync.js <dealId>
```

O que esperar:

- `OutputFields:` com `uplog_status: "SUCCESS"`, `uplog_unidade: "floripa"`,
  `uplog_gerador_ok: "true"` e `uplog_contrato_ok: "true"`.
- No painel da Uplog, um gerador e um contrato novos para o negocio testado.
- Se faltar alguma secret ou o mapa estiver vazio, o teste local imprime
  `Action falhou:` com a mensagem de erro (`unidade=... gerador=... contrato=...
  [codigo] mensagem`) e termina com codigo de saida 1; no portal, a action aparece
  como falha no historico do workflow.

Antes de ligar em producao, conferir: a constante `UPLOG_ENVIRONMENT` trocada
para `"prod"` no codigo, as secrets de producao preenchidas e o `UNIT_MAP` com os
valores finais.
