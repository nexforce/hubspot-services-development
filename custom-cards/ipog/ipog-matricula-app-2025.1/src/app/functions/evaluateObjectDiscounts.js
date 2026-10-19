const axios = require("axios");

/**
 * Motor de elegibilidade dos descontos cadastrados no objeto HubSpot "Descontos".
 *
 * Papel deste motor: decidir SE a categoria de um desconto pode ser oferecida para o
 * negócio. O tipo e o valor do benefício continuam vindo da MuleSoft, pelo
 * `categoria_sei` (chamada existente `fetchDiscount`).
 *
 * Regras confirmadas com o consultor (2026-10-07):
 * - Campo vazio não restringe; multisseleção casa por qualquer opção (OR); campos
 *   diferentes combinam com E.
 * - A opção "Todas as opções" em qualquer critério de elegibilidade funciona como
 *   curinga: aquele critério deixa de restringir (2026-10-15).
 * - Status Ativo e vigência válida são obrigatórios.
 * - `forma_pagamento` vem da seleção do card (Tipo de Pagamento), não da propriedade
 *   do negócio. `condicao_parcelas` NÃO bloqueia mais a elegibilidade: o desconto é
 *   liberado e o critério de parcelas é devolvido em `condicaoParcelas` para o card
 *   bloquear os planos financeiros incompatíveis (2026-10-15).
 * - `forma_pagamento` usa o mesmo vocabulário de `tipopagamento` do negócio
 *   (PIX, A_VISTA, PARCELADO, RECORRENTE, BOLETO), sem tradução no card (2026-10-15).
 * - `prioridade` menor vence quando o mesmo `categoria_sei` aparece em mais de uma regra.
 * - Acumulação é verificada apenas entre descontos do objeto; desconto novo sempre pode
 *   acumular com desconto legado (pendente de validação com o cliente).
 *
 * Módulo autocontido de propósito: o empacotador do HubSpot não inclui arquivos
 * auxiliares importados por caminho relativo (lição dos builds #38/#39).
 */

// Mapa id -> nome dos times HubSpot do portal IPOG (51406295).
// Embutido de proposito: o empacotador do HubSpot nao inclui arquivos auxiliares
// importados por caminho relativo (licao dos builds #38/#39).
const HUBSPOT_TEAMS = {
  "83111740": "9. Financeiro",
  "83111741": "9.1. Líderes",
  "83111742": "9.1.1 Colaboradores",
  "83111743": "9.1.1.13 Squad Alteração no Parâmetro de Vencimento Pos e CEU",
  "83111744": "11. Central de Atendimento",
  "83111745": "11.1 Líderes",
  "83111749": "11.1.2 Colaboradores",
  "83111751": "11.1.2.11 Squad Inscrição em Módulo de Pós-graduação Grad",
  "83111753": "4. Relacionamento com Alunos",
  "83111755": "4.1. Relacionamento - Líderes",
  "83111756": "4.1.1. Relacionamento - Analistas",
  "83111757": "4.1.1.4 Squad Cancelamento de Contrato Pos e CEU",
  "83111758": "03. Sales",
  "83111759": "3.1. B2C - Diretoria",
  "83111760": "3.1.3. CEU",
  "83111761": "3.1.3.1. CEU - Ao Vivo",
  "83111763": "3.1.3.1.1. CEU Ao Vivo - Gestor",
  "83111764": "3. Marketing - Gestão",
  "83111765": "3.1. Marketing Growth",
  "83111766": "3.3. Convênios - Colaborador",
  "83111767": "3.1.2. Graduação",
  "83111768": "3.1.2.2. Graduação - EAD",
  "83111769": "3.1.2.2.1. Grad EAD - Gestor",
  "83111770": "3.1.2.2.1. Grad EAD",
  "83111771": "9.1.1.5 Squad Reativação de Matrícula Trancada Grad",
  "83111772": "11.1.2.5 Squad Entrega do TCC Grad",
  "83111773": "9.1.1.12 Squad Alteração de Responsável Financeiro",
  "83111774": "4.1.1.1 Squad Solicitação de Remoção de Dados",
  "83111775": "6. Graduação",
  "83111776": "3.1.3.2. CEU - Presencial",
  "83111777": "3.1.3.2.1. CEU Presencial - Gestor",
  "83111778": "3.1.3.2.1. CEU Presencial",
  "83111779": "3.1.1. Pós-Graduação",
  "83111780": "3.1.1.1. Pós-Graduação - Presencial",
  "83111781": "3.1.1.1.3. Goiânia - Gestor",
  "83111782": "3.1.1.3. Pós-Graduação - EAD",
  "83111783": "3.1.4.2. Pos EAD B - Gestor",
  "83111784": "3.1.4.2. Pos EAD B",
  "83111785": "2. Gerência",
  "83111786": "3.1.1.2. Pós-Graduação - Ao Vivo",
  "83111787": "3.1.1.1.2. Acelera B - Gestor",
  "83111788": "3.1.1.1.1. Acelera A - Gestor",
  "83111789": "11.1.2.10 Squad PréMatrícula (Renovação)ForaDoPrazo 2° C Grad",
  "83111790": "8. Secretaria",
  "83111791": "8.1 Líderes",
  "83111792": "8.1.1. Colaboradores",
  "83111793": "8.1.1.2 Squad Aproveitamento de Módulos Internos Pós.Grad",
  "83111794": "3.2. Marketing - Eventos e Conteúdo",
  "83111795": "1. Marketing",
  "83111796": "Marketing - Design",
  "83111797": "8.1.1.5 Squad Exclusão de Aproveitamento de Disciplinas Grad",
  "83111798": "7. Coordenação do Curso",
  "83111799": "7.1. Líderes",
  "83111800": "7.1.1. Colaboradores",
  "83111801": "8.1.1.31 Squad Afastamento de Matrícula Grad",
  "83111802": "8.1.1.13 Squad Declaração de Matrícula Grad",
  "83111803": "6.1. Graduação - Líderes",
  "83111805": "6.1.1. Graduação - Analistas",
  "83111806": "11.1.2.1 Squad Assinatura do estágio não obrigatório Grad",
  "83111807": "8.1.1.10 Squad Declaração de Ementas Pos.Grad",
  "83111808": "2.1 - Liderança",
  "83111809": "3.1.1.1.4. Maceió/Teresina - Gestor",
  "83111810": "3.1.1.1.7. Teresina",
  "83111811": "4.1.1.2 Squad Transferência de Matrícula Pos e CEU",
  "83111812": "3.1.2.1. Graduação - Presencial",
  "83111813": "8.1.1.32 Squad Reativação de Matrícula Trancada Grad",
  "83111814": "10. Coordenação Pedagógica",
  "83111815": "10.1 Líderes",
  "83111816": "11.1.2.2 Squad Solicitação de 2a Ch. (Presencial e EaD) Grad",
  "83111817": "3.1.4.1. Pos EAD A - Gestor",
  "83111818": "3.1.4.1. Pós EAD A",
  "83111819": "3.1.1.1.7. Teresina - Gestor",
  "83111820": "4.1.1.3 Squad Cancelamento de Matrícula Pos e CEU",
  "83111821": "8.1.1.33 Squad Reingresso por Abandono/ Cancelamento Grad",
  "83111822": "8.1.1.16 Squad Histórico Acadêmico Grad",
  "83111823": "3.1.1.1.1. Belém - Gestor",
  "83111825": "3.1.1.1.1. Belém",
  "83111826": "3.1.1.1.3. Acelera C - Gestor",
  "83111827": "3.1.1.1.3. Acelera C",
  "83111828": "3.1.1.1.5. Manaus - Gestor",
  "83111829": "3.1.1.1.5. Manaus",
  "83111830": "8.1.1.21 Squad Revisão de Frequência e Notas Pos e CEU",
  "83111831": "9.1.1.2 Squad Exclusão de Aproveitamento de Disciplinas Grad",
  "83111832": "8.1.1.25 Squad Atualização Cadastral de Nome e Estado Civil",
  "83111833": "5. EAD",
  "83111834": "5.1. EAD - Líderes",
  "83111835": "9.1.1.11 Squad InclusãoDisciplinasAcompanhament PresenEEaD Grad",
  "83111836": "8.1.1.11 Squad Declaração de Frequência Grad",
  "83111837": "5.1.2. EAD - Gerência",
  "83111838": "5.1.2.3 Colaboradores",
  "83111839": "5.1.2.3.3 Alteracao data de ingresso na turma Pos.Grad",
  "83111840": "8.1.1.15 Squad Declaração de Módulos Cursados Pos.Grad",
  "83111841": "3.1.1.1.2. Florianópolis - Gestor",
  "83111842": "3.1.1.1.2. Florianópolis",
  "83111843": "8.1.1.22 Squad Cancelamento de Reposição Pos e CEU",
  "83111844": "8.1.1.9 Squad Declaração de Conclusão Pos.Grad",
  "83111845": "11.1.2.14 Squad Solicitação para ser Aluno Ouvinte Grad",
  "83111846": "3.2. Inteligência Comercial - Liderança",
  "83111847": "3.2.1. - Colaborador IC",
  "83111848": "8.1.1.19 Squad Certificado Digital (conclusão curso) Pos.Grad",
  "83111849": "3.1.1.1.6. São Luis - Gestor",
  "83111850": "3.1.1.1.6. São Luis",
  "83111851": "11.1.2.4 Squad Revisão de Frequência e Notas Grad",
  "83111852": "1.4 - Gerência Regional OPs",
  "83111853": "9.1.1.1 Squad Registro de aproveitamento Grad",
  "83111854": "3.1.1.1.3. Goiânia",
  "83111855": "8.1.1.17 Squad Histórico Acadêmico Pos.Grad",
  "83111856": "3.4. Enterprise - Gestão",
  "83111857": "9.1.1.10 Squad Inclusão/Exclusão Discip Presencial e EaD Grad",
  "83111858": "11.1.2.3 Squad Insc em Cursos de Extensão e Nivelamento Grad",
  "83111859": "8.1.1.30 Squad Entrega do TCC Grad",
  "83111860": "3.1.1.1.4. Maceió",
  "83111861": "8.1.1.12 Squad Declaração de Frequência Pos e CEU",
  "83111862": "3.1.2.1.1. Grad Presencial - Gestor",
  "83111863": "9.1.1.8 Squad PréMatrícula(Renovação)ForadoPrazo- 2° Ciclo Grad",
  "83111864": "3.4.2. Enterprise - Vendas",
  "83111865": "3.1.1.1.2. Acelera A",
  "83111866": "8.1.1.35 Squad PréMatrícula(Renovação)Fora do Prazo2°Ciclo Grad",
  "83111867": "8.1.1.18 Squad Emissão do Certificado Extensão CEU",
  "83111869": "9.1.1.9 Squad Inscrição em Módulo de Pós-graduação Grad",
  "83111870": "8.1.1.8 Squad Declaração de Conclusão Apos Grad",
  "83111871": "3.4.1 Enterprise - Pré-Vendas",
  "83111872": "1.2 - Gerência Regional Matriz",
  "83111873": "9.1.1.6 Squad Reingresso por Abandono/ Cancelamento Grad",
  "83111874": "2.1.1 - Colaboradores",
  "83111875": "8.1.1.29 Squad Transferência de Matrícula",
  "83111876": "8.1.1.4 Squad Exclusão de Aproveitamento de Módulos Pos.Grad",
  "83111877": "9.1.1.7 Squad Pré-Matrícula (Renovação) - Fora do Prazo Grad",
  "83111878": "1.3 - Gerência Regional UPs",
  "83111879": "8.1.1.28 Squad Correção de TCC Pos.Grad",
  "83111880": "1.2.1 - Liderança",
  "83111881": "3.1.1.1.2. Acelera B",
  "83111882": "4.1.2. Relacionamento - Assistentes",
  "83111883": "11.1.2.8 Squad Reingresso por Abandono/ Cancelamento Grad",
  "83111884": "9.1.1.4 Squad Afastamento de Matrícula Grad",
  "83111885": "8.1.1.7 Squad Declaração de Conclusão Provisória Antes Grad",
  "83111886": "8.1.1.34 Squad Pré-Matrícula (Renovação) - Fora do Prazo Grad",
  "83111887": "11.1.2.13 Squad InclusãoDisciplinaAcomp Presencial e EaD Grad",
  "83111888": "8.1.1.26 Squad Assinatura do contrato de estágio Pos.Grad",
  "83111889": "11.1.2.6 Squad Afastamento de Matrícula Grad",
  "83111890": "5.1.2.3.1 Prorrogação de Atividade Prévia Pos.Grad",
  "83111891": "1.3.1 - Liderança",
  "83111892": "8.1.1.3 Squad AproveitamentoMódulosOutras Instituições Pós.Grad",
  "83111893": "5.1.2.3.4 Squad Solicitação para ser Aluno Ouvinte Grad",
  "83111894": "8.1.1.14 Squad Declaração de Matrícula Pos e CEU",
  "83111895": "1.4.1 - Liderança",
  "83111896": "8.1.1.27 Squad Entrega de documentação de estagio Grad",
  "83111897": "5.1.2.3.2 Suporte técnico ao AVA",
  "83111898": "3.1.3.1.1. CEU Ao Vivo",
  "83111899": "3.1.2.1.1. Grad Presencial",
  "83111900": "9.1.1.3 Squad Transferência de Matrícula Pos E CEU",
  "83111901": "8.1.1.23 Squad Reposição de Aula Pos e CEU",
  "83111902": "11.1.2.9 Squad Pré-Matrícula (Renovação) - Fora do Prazo Grad",
  "83111903": "8.1.1.36 Squad Inscrição em Módulo de Pós-graduação Grad",
  "83111904": "12. Nexforce",
  "83111905": "3.4.3. Enterprise - Locação de espaços",
  "83111906": "11.1.2.7 Squad Reativação de Matrícula Trancada Grad",
  "83111907": "8.1.1.6 Squad Registro de aproveitamento Grad",
  "83111908": "11.1.2.12 Squad Inclusão/ExclusãoDisc Presencial e EaD Grad",
  "83111909": "8.1.1.20 Squad Certificado Impresso (conclusão curso) Pos.Grad",
  "83111910": "9.1.1.14 Squad Alteração de Plano Financeiro Pos E CEU",
  "95217560": "15. Ipog Hub",

};

const STATUS_ATIVO = "Ativo";

// Valor de regra que funciona como curinga: quando presente em um critério de
// elegibilidade, aquele critério deixa de restringir (casa com qualquer valor do
// negócio). Vale para unidade_ensino, nivel_interesse, modalidade_ensino,
// forma_pagamento e equipe.
const TODAS_AS_OPCOES = "todas as opções";

const DEAL_PROPERTIES = [
  "unidade",
  "nivel_de_interesse",
  "modalidade_de_interesse",
  "hubspot_team_id",
  "turma",
];

const DISCOUNT_PROPERTIES = [
  "nome_do_desconto",
  "codigo_desconto",
  "categoria_sei",
  "status",
  "prioridade",
  "permite_acumulacao",
  "data_inicio_vigencia",
  "data_fim_vigencia",
  "unidade_ensino",
  "nivel_interesse",
  "modalidade_ensino",
  "forma_pagamento",
  "equipe",
  "turma",
  "condicao_parcelas_operador",
  "condicao_parcelas_valor",
  "condicao_parcelas_valor_2",
];

function parseNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalize(value) {
  return String(value === null || value === undefined ? "" : value)
    .trim()
    .toLowerCase();
}

function splitValues(raw) {
  if (raw === null || raw === undefined || raw === "") return [];
  return String(raw)
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}

function toReferenceDate(value) {
  const iso = value && String(value).slice(0, 10);
  const parsed = iso ? new Date(`${iso}T00:00:00Z`) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function toDate(value) {
  if (!value) return null;
  const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Multisseleção: vazio não restringe; "Todas as opções" é curinga; casa se QUALQUER opção da regra existir no negócio. */
function matchMultiValues(ruleRaw, dealValue) {
  const ruleValues = splitValues(ruleRaw);
  if (ruleValues.length === 0) return { applies: false, matched: true };
  if (ruleValues.some((ruleValue) => normalize(ruleValue) === TODAS_AS_OPCOES)) {
    return { applies: false, matched: true };
  }
  const dealValues = splitValues(dealValue);
  if (dealValues.length === 0) return { applies: true, matched: false };
  const matched = ruleValues.some((ruleValue) =>
    dealValues.some((dealItem) => normalize(ruleValue) === normalize(dealItem)),
  );
  return { applies: true, matched };
}

/**
 * Equipe: compara o nome da equipe da regra com o nome do time HubSpot do negócio
 * (`hubspot_team_id`) por CONTER, não por igualdade. O nome do time no HubSpot carrega
 * prefixo hierárquico e sufixo ("3.1.1.1.7. Teresina", "3.1.1.1.1. Acelera A - Gestor"),
 * então igualdade exata nunca casaria com "Teresina" ou "Acelera A".
 * Vazio e "Todas as opções" não restringem. Sem time no negócio, não casa.
 * O nome do time é resolvido por `resolveTeamName` a partir do mapa estático HUBSPOT_TEAMS.
 */
function matchTeam(ruleRaw, teamName) {
  const ruleValues = splitValues(ruleRaw);
  if (ruleValues.length === 0) return { applies: false, matched: true };
  if (ruleValues.some((ruleValue) => normalize(ruleValue) === TODAS_AS_OPCOES)) {
    return { applies: false, matched: true };
  }
  const team = normalize(teamName);
  if (!team) return { applies: true, matched: false };
  const matched = ruleValues.some((ruleValue) => team.includes(normalize(ruleValue)));
  return { applies: true, matched };
}

/** Texto simples (turma): comparação exata normalizada; vazio e "Todas as opções" não restringem. */
function matchTextValue(ruleRaw, dealValue) {
  const ruleValue = normalize(ruleRaw);
  if (!ruleValue) return { applies: false, matched: true };
  if (ruleValue === TODAS_AS_OPCOES) return { applies: false, matched: true };
  const deal = normalize(dealValue);
  return { applies: true, matched: deal !== "" && deal === ruleValue };
}

/**
 * Avalia uma quantidade de parcelas contra um critério (operador, valor, valor2).
 * Retorna `null` quando não há critério (a regra não restringe parcelas).
 * Retorna `true`/`false` quando há critério e a quantidade é conhecida.
 * Retorna `undefined` quando há critério mas a quantidade não foi informada
 * (o card decide o que fazer; o motor não bloqueia mais por isso).
 */
function evaluateInstallments(operator, value, value2, installments) {
  const op = String(operator || "").trim();
  if (!op) return null;
  const actual = parseNumber(installments);
  if (actual === null) return undefined;
  const expected = parseNumber(value);
  const expected2 = parseNumber(value2);
  switch (op) {
    case "igual_a":
      return expected !== null && actual === expected;
    case "diferente_de":
      return expected !== null && actual !== expected;
    case "menor_que":
      return expected !== null && actual < expected;
    case "menor_ou_igual":
      return expected !== null && actual <= expected;
    case "maior_que":
      return expected !== null && actual > expected;
    case "maior_ou_igual":
      return expected !== null && actual >= expected;
    case "entre":
      return expected !== null && expected2 !== null && actual >= expected && actual <= expected2;
    default:
      return false;
  }
}

/** Extrai o critério de parcelas de uma regra, ou null quando não há. */
function extractInstallmentCriteria(rule) {
  const operador = String(rule.condicao_parcelas_operador || "").trim();
  if (!operador) return null;
  return {
    operador,
    valor: parseNumber(rule.condicao_parcelas_valor),
    valor2: parseNumber(rule.condicao_parcelas_valor_2),
  };
}

/**
 * Resolve o nome do time HubSpot a partir do id (`hubspot_team_id` do negócio).
 *
 * Não usa API: `hubspot_team_id` é `externalOptions: true` e `readOnlyDefinition: true`,
 * então a API de propriedades devolve `options: []` e nunca o label. O endpoint
 * `GET /settings/v3/users/teams` expõe o nome, mas exige o escopo
 * `settings.users.teams.read`, que o token do app card não tem (403).
 * O mapa estático em `hubspotTeams.js` é a fonte. Time novo exige regenerar o mapa.
 */
/**
 * Resolve o nome do time HubSpot a partir do id (hubspot_team_id do negocio).
 * Le do mapa estatico HUBSPOT_TEAMS embutido no topo deste arquivo.
 */
function resolveTeamName(teamId) {
  const id = String(teamId || "").trim();
  if (!id) return null;
  const name = HUBSPOT_TEAMS[id];
  if (!name) {
    console.error(`Time ${id} nao esta no mapa estatico de times.`);
    return null;
  }
  return name;
}
function isWithinValidity(startRaw, endRaw, referenceDate) {
  const start = toDate(startRaw);
  const end = toDate(endRaw);
  if (start && referenceDate < start) return false;
  if (end && referenceDate > end) return false;
  return true;
}

/**
 * Núcleo puro: recebe as regras do objeto e o contexto do negócio, devolve as
 * categorias elegíveis. Sem HTTP, para ser testável isoladamente.
 */
function evaluateObjectDiscounts(ctx = {}) {
  const {
    rules = [],
    unidade = null,
    nivelDeInteresse = null,
    modalidadeDeInteresse = null,
    equipe = null,
    equipeTime = null,
    turma = null,
    formaPagamento = null,
    qtdeParcelas = null,
    referencia = null,
  } = ctx;

  const referenceDate = toReferenceDate(referencia);
  const trace = [];
  const eligible = [];

  // Diagnóstico: o card exibe este bloco para explicar por que uma regra caiu.
  trace.push(`contexto: time=[${equipeTime || "sem time"}] unidade=[${unidade || "-"}] nivel=[${nivelDeInteresse || "-"}] modalidade=[${modalidadeDeInteresse || "-"}] forma=[${formaPagamento || "-"}] turma=[${turma || "-"}]`);

  for (const rule of rules) {
    const nome = rule.nome_do_desconto || rule.codigo_desconto || "(sem nome)";
    const categoria = String(rule.categoria_sei || "").trim();

    if (normalize(rule.status) !== normalize(STATUS_ATIVO)) {
      trace.push(`ignorada (status): ${nome}`);
      continue;
    }
    if (!isWithinValidity(rule.data_inicio_vigencia, rule.data_fim_vigencia, referenceDate)) {
      trace.push(`ignorada (vigência): ${nome}`);
      continue;
    }
    if (!categoria) {
      trace.push(`ignorada (categoria_sei vazia): ${nome}`);
      continue;
    }

    const checks = [
      ["unidade_ensino", matchMultiValues(rule.unidade_ensino, unidade)],
      ["nivel_interesse", matchMultiValues(rule.nivel_interesse, nivelDeInteresse)],
      ["modalidade_ensino", matchMultiValues(rule.modalidade_ensino, modalidadeDeInteresse)],
      ["equipe", matchTeam(rule.equipe, equipeTime)],
      ["turma", matchTextValue(rule.turma, turma)],
      ["forma_pagamento", matchMultiValues(rule.forma_pagamento, formaPagamento)],
    ];
    const failed = checks.filter(([, result]) => result.applies && !result.matched);
    if (failed.length > 0) {
      const detalhe = failed
        .map(([field]) => {
          const ruleValue = field === "equipe" ? rule.equipe : rule[field];
          return `${field}=[${ruleValue || "-"}]`;
        })
        .join(", ");
      trace.push(`ignorada (${failed.map(([field]) => field).join(", ")}): ${nome} | ${detalhe}`);
      continue;
    }

    // A condição de parcelas NÃO bloqueia mais a elegibilidade: o desconto é liberado
    // e o critério é devolvido para o card filtrar os planos financeiros. Quando a
    // quantidade de parcelas é informada (avaliação por plano), o critério é aplicado
    // aqui também, para o resultado refletir o plano escolhido.
    const condicaoParcelas = extractInstallmentCriteria(rule);
    const installments = evaluateInstallments(
      rule.condicao_parcelas_operador,
      rule.condicao_parcelas_valor,
      rule.condicao_parcelas_valor_2,
      qtdeParcelas,
    );
    if (installments === false) {
      trace.push(`ignorada (parcelas): ${nome}`);
      continue;
    }

    eligible.push({
      value: categoria,
      label: nome,
      codigoDesconto: rule.codigo_desconto || "",
      prioridade: parseNumber(rule.prioridade),
      permiteAcumulacao: normalize(rule.permite_acumulacao) === "true",
      condicaoParcelas,
    });
    trace.push(`elegível: ${nome} → ${categoria}`);
  }

  // Mesma categoria em regras diferentes: menor prioridade (número) vence.
  const byCategory = new Map();
  for (const item of eligible) {
    const key = normalize(item.value);
    const current = byCategory.get(key);
    const priority = item.prioridade === null ? Number.POSITIVE_INFINITY : item.prioridade;
    if (!current || priority < current.prioridade) {
      byCategory.set(key, { ...item, prioridade: priority });
    } else {
      trace.push(`categoria duplicada descartada por prioridade: ${item.label}`);
    }
  }

  // Acumulação apenas entre descontos do objeto (novo + legado fica de fora por decisão).
  const ordered = [...byCategory.values()].sort((a, b) => a.prioridade - b.prioridade);
  const categories = [];
  let allAccumulate = true;
  for (const item of ordered) {
    if (categories.length > 0 && (!allAccumulate || !item.permiteAcumulacao)) {
      trace.push(`descartado (não acumula): ${item.label}`);
      continue;
    }
    categories.push(item);
    allAccumulate = allAccumulate && item.permiteAcumulacao;
  }

  return { categories, trace };
}

exports.evaluateObjectDiscounts = evaluateObjectDiscounts;
exports.parseNumber = parseNumber;
exports.evaluateInstallments = evaluateInstallments;

/**
 * Ponto de entrada serverless.
 * Parâmetros (via runServerless):
 *  - dealId (obrigatório)
 *  - discountsObjectId: objectTypeId do objeto Descontos no portal atual
 *  - formaPagamento: valor de `tipopagamento` do negócio (PIX, A_VISTA, PARCELADO, RECORRENTE, BOLETO), enviado pelo card sem tradução
 *  - qtdeParcelas: quantidade de parcelas da condição escolhida (opcional)
 *  - referencia: data de referência YYYY-MM-DD (opcional; padrão hoje UTC)
 */
exports.main = async (context = {}) => {
  const { parameters = {} } = context;
  const { dealId, discountsObjectId, formaPagamento, qtdeParcelas, referencia } = parameters;

  const apiKey = process.env.HUBSPOT_API_KEY;
  if (!apiKey) {
    return { status: "ERROR", origin: "SISTEMA", message: "HUBSPOT_API_KEY não configurada." };
  }
  if (!dealId) {
    return { status: "ERROR", origin: "SISTEMA", message: "dealId é obrigatório." };
  }
  if (!discountsObjectId) {
    return { status: "ERROR", origin: "SISTEMA", message: "discountsObjectId é obrigatório." };
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  try {
    const dealResponse = await axios({
      method: "GET",
      url: `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`,
      headers,
      params: { properties: DEAL_PROPERTIES.join(",") },
    });
    const dealProps = dealResponse.data.properties || {};

    const rules = [];
    let after;
    do {
      const searchResponse = await axios({
        method: "POST",
        url: `https://api.hubapi.com/crm/v3/objects/${discountsObjectId}/search`,
        headers,
        data: {
          filterGroups: [
            { filters: [{ propertyName: "status", operator: "EQ", value: STATUS_ATIVO }] },
          ],
          properties: DISCOUNT_PROPERTIES,
          limit: 100,
          ...(after ? { after } : {}),
        },
      });
      rules.push(...(searchResponse.data.results || []).map((record) => record.properties || {}));
      after = searchResponse.data.paging?.next?.after;
    } while (after);

    const equipeTime = resolveTeamName(dealProps.hubspot_team_id);
    console.log(
      "Time do negócio:",
      JSON.stringify({ hubspot_team_id: dealProps.hubspot_team_id, nome: equipeTime }),
    );

    const result = evaluateObjectDiscounts({
      rules,
      unidade: dealProps.unidade,
      nivelDeInteresse: dealProps.nivel_de_interesse,
      modalidadeDeInteresse: dealProps.modalidade_de_interesse,
      equipeTime,
      turma: dealProps.turma,
      formaPagamento: formaPagamento || null,
      qtdeParcelas: parseNumber(qtdeParcelas),
      referencia: referencia || null,
    });

    console.log(
      "Avaliação de descontos do objeto:",
      JSON.stringify({
        regras: rules.length,
        categorias: result.categories.map((item) => item.value),
      }),
    );

    return {
      status: "SUCCESS",
      response: {
        categories: result.categories,
        trace: result.trace,
        rulesEvaluated: rules.length,
      },
    };
  } catch (error) {
    console.error("Erro ao avaliar descontos do objeto:", error.message);
    if (error.response) {
      console.error("Detalhes do erro:", error.response.data);
    }
    return {
      status: "ERROR",
      origin: "HUBSPOT",
      message:
        error.response?.data?.message ||
        error.message ||
        "Erro ao avaliar descontos do objeto.",
    };
  }
};
