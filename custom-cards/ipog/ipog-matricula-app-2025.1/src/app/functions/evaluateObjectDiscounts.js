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
  "equipe_comercial",
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
    turma = null,
    formaPagamento = null,
    qtdeParcelas = null,
    referencia = null,
  } = ctx;

  const referenceDate = toReferenceDate(referencia);
  const trace = [];
  const eligible = [];

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
      ["equipe", matchMultiValues(rule.equipe, equipe)],
      ["turma", matchTextValue(rule.turma, turma)],
      ["forma_pagamento", matchMultiValues(rule.forma_pagamento, formaPagamento)],
    ];
    const failed = checks.filter(([, result]) => result.applies && !result.matched);
    if (failed.length > 0) {
      trace.push(`ignorada (${failed.map(([field]) => field).join(", ")}): ${nome}`);
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

    const result = evaluateObjectDiscounts({
      rules,
      unidade: dealProps.unidade,
      nivelDeInteresse: dealProps.nivel_de_interesse,
      modalidadeDeInteresse: dealProps.modalidade_de_interesse,
      equipe: dealProps.equipe_comercial,
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
