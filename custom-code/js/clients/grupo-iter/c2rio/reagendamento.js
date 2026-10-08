const axios = require("axios");

// ---------------------------------------------------------------------------
// Grupo Iter - BU C2Rio - evento reagendamento (SIG).
//
// Contexto: action de custom code em um workflow cujo trigger é webhook. O
// evento apenas atualiza o DEAL inscrito no workflow (event.object.objectId é o
// id do deal) e o CONTATO associado (resolvido pelo e-mail), com as informações
// do reagendamento. Não move o estágio do deal.
//
// O contato é resolvido pelo e-mail via API search, e o deal vem pronto em
// event.object.objectId.
//
// Cada unidade de negócio tem uma brand. O DEAL recebe a BU C2Rio (4344366 em produção)
// como valor único. O CONTATO recebe a brand da marca via APPEND (a constante
// ACTIVE.businessUnits.C2Rio é adicionada ao valor atual sem sobrescrever).
//
// Regras de conversão específicas deste evento:
//   - cf_data_visita (contato, datetime) combina cf_date_visit_expected +
//     cf_hora_visita (horário local BR, UTC-3).
//   - data_da_visita (deal, date) usa apenas cf_date_visit_expected.
//   - cf_data_visita_anterior: DD-MM-YYYY -> YYYY-MM-DD.
//   - cf_data_hora_visita (contato e deal, datetime): aceita timestamp em ms ou
//     em segundos, ISO 8601 com fuso, e data DD-MM-YYYY ou YYYY-MM-DD com
//     horário opcional. Sem horário, fixa 12:00 de Brasília (UTC-3).
//   - cf_bilhetes: string com os IDs, gravada como recebida.
//
// A propriedade payload do contato guarda o payload recebido com as datas de
// visita já legíveis ("DD/MM/YYYY HH:mm", horário de Brasília), não em timestamp.
//
// O token vem de ACTIVE.hubspotToken: secret HUBSPOT_TOKEN_SANDBOX_INTEGRACAO_SIG
// em sandbox e HUBSPOT_TOKEN_INTEGRACAO_SIG em produção, nunca hardcoded.
// ---------------------------------------------------------------------------

// Ambiente da execução. Este script já roda em produção.
const ENV = "production";

const CONFIG = {
  sandbox: {
    businessUnits: { Bondinho: "4554145", Caracol: "4554143", C2Rio: "4554144" },
    pipeline: { id: "927835212", stageWon: "1422040488", stageLost: "1422054714" },
    hubspotToken: process.env.HUBSPOT_TOKEN_SANDBOX_INTEGRACAO_SIG,
  },
  production: {
    businessUnits: { Bondinho: "4292163", Caracol: "4275397", C2Rio: "4344366" },
    pipeline: { id: "927835212", stageWon: "1422040488", stageLost: "1422054714" },
    hubspotToken: process.env.HUBSPOT_TOKEN_INTEGRACAO_SIG,
  },
};

const ACTIVE = CONFIG[ENV];

const CONTACT_FIELDS = [
  { from: "conversion_identifier", to: "conversion_identifier", type: "text" },
  { from: "traffic_medium", to: "utm_medium", type: "text" },
  { from: "traffic_source", to: "utm_source", type: "text" },
  { from: "email", to: "email", type: "text" },
  { from: "name", to: "firstname", type: "text" },
  { from: "cf_id_pedido", to: "booking", type: "text" },
  { from: "cf_date_visit_expected", to: "cf_data_visita", type: "datetime", timeField: "cf_hora_visita" },
  { from: "cf_data_visita_anterior", to: "cf_data_visita_anterior", type: "date" },
  { from: "cf_product", to: "cf_produto", type: "text" },
  { from: "cf_quantity", to: "quantidade_de_bilhetes", type: "number" },
  { from: "cf_bilhetes", to: "cf_bilhetes", type: "text" },
  { from: "cf_data_hora_visita", to: "cf_data_hora_visita", type: "visitDateTime" },
];

const DEAL_FIELDS = [
  { from: "conversion_identifier", to: "conversion_identifier", type: "text" },
  { from: "traffic_medium", to: "utm_medium", type: "text" },
  { from: "traffic_source", to: "utm_source", type: "text" },
  { from: "email", to: "email_do_contato_principal", type: "text" },
  { from: "cf_id_pedido", to: "dealname", type: "text", fallbackFrom: "name" },
  { from: "cf_id_pedido", to: "booking", type: "text" },
  { from: "cf_date_visit_expected", to: "data_da_visita", type: "date" },
  { from: "cf_data_visita_anterior", to: "cf_data_visita_anterior", type: "date" },
  { from: "cf_bilhetes", to: "cf_bilhetes", type: "text" },
  { from: "cf_data_hora_visita", to: "cf_data_hora_visita", type: "visitDateTime" },
];

const toNumber = (valor) => {
  if (valor == null || valor === "") return null;
  const numericValue = Number(String(valor).replace(",", "."));
  return Number.isFinite(numericValue) ? numericValue : null;
};

const padNumber = (number) => String(number).padStart(2, "0");

// Fuso de Brasília em ms. O Brasil não tem horário de verão desde 2019, então o
// deslocamento é fixo em UTC-3 o ano inteiro.
const BRASILIA_OFFSET_MS = 3 * 60 * 60 * 1000;

// DD-MM-YYYY -> YYYY-MM-DD.
const toDateString = (raw) => {
  const match = /^\s*(\d{1,2})-(\d{1,2})-(\d{4})/.exec(String(raw || ""));
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${padNumber(month)}-${padNumber(day)}`;
};

// Combina uma data DD-MM-YYYY com um horário "HH:mm" (horário local BR, UTC-3)
// e devolve timestamp em ms (UTC), para a propriedade datetime do contato.
const toDateTimeMs = (rawDate, rawTime) => {
  const match = /^\s*(\d{1,2})-(\d{1,2})-(\d{4})/.exec(String(rawDate || ""));
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const timeMatch = /^\s*(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/.exec(String(rawTime || ""));
  const hour = timeMatch ? Number(timeMatch[1]) : 12;
  const minute = timeMatch ? Number(timeMatch[2]) : 0;
  const second = timeMatch && timeMatch[3] ? Number(timeMatch[3]) : 0;
  if (hour > 23 || minute > 59 || second > 59) return null;

  return Date.UTC(year, month - 1, day, hour, minute, second) + BRASILIA_OFFSET_MS;
};

// cf_data_hora_visita (datetime, contato e deal). Aceita os quatro formatos que
// o SIG já enviou neste evento:
//   - timestamp em milissegundos ("1792144800000") ou em segundos
//     ("1792144800"), que já é um instante absoluto e entra sem ajuste de fuso;
//   - ISO 8601 com fuso explícito ("2026-10-16T10:00:00Z"), usado como veio;
//   - YYYY-MM-DD ou DD-MM-YYYY (hífen ou barra), com horário opcional
//     HH:mm[:ss], lido como horário de Brasília (UTC-3).
// Sem horário, fixa 12:00 de Brasília, evitando mudança de dia na exibição.
// Valor ilegível retorna null (não grava).
const toVisitDateTimeMs = (raw) => {
  if (raw == null || raw === "") return null;
  const text = String(raw).trim();
  const epochMatch = /^\d{10}(\d{3})?$/.exec(text);
  if (epochMatch) {
    const epochValue = Number(text);
    return epochMatch[1] ? epochValue : epochValue * 1000;
  }
  if (/[T\s]\d{1,2}:\d{2}.*(Z|[+-]\d{2}:?\d{2})$/i.test(text)) {
    const timestamp = Date.parse(text.replace(" ", "T"));
    return Number.isFinite(timestamp) ? timestamp : null;
  }
  const isoDateMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(text);
  const brDateMatch = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/.exec(text);
  if (!isoDateMatch && !brDateMatch) return null;
  const year = Number(isoDateMatch ? isoDateMatch[1] : brDateMatch[3]);
  const month = Number(isoDateMatch ? isoDateMatch[2] : brDateMatch[2]);
  const day = Number(isoDateMatch ? isoDateMatch[3] : brDateMatch[1]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const timeMatch = /[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(text);
  const hour = timeMatch ? Number(timeMatch[1]) : 12;
  const minute = timeMatch ? Number(timeMatch[2]) : 0;
  const second = timeMatch && timeMatch[3] ? Number(timeMatch[3]) : 0;
  if (hour > 23 || minute > 59 || second > 59) return null;
  return Date.UTC(year, month - 1, day, hour, minute, second) + BRASILIA_OFFSET_MS;
};

// Campos de data e hora de visita que vão legíveis para a propriedade payload
// do contato, no lugar do valor cru recebido do SIG.
const VISIT_DATETIME_PAYLOAD_FIELDS = ["cf_data_hora_visita", "cf_data_hora_visita_anterior"];

// Timestamp em ms -> "DD/MM/YYYY HH:mm" em horário de Brasília.
const toReadableDateTime = (timestampMs) => {
  const brasiliaDate = new Date(timestampMs - BRASILIA_OFFSET_MS);
  const day = padNumber(brasiliaDate.getUTCDate());
  const month = padNumber(brasiliaDate.getUTCMonth() + 1);
  const year = brasiliaDate.getUTCFullYear();
  const hour = padNumber(brasiliaDate.getUTCHours());
  const minute = padNumber(brasiliaDate.getUTCMinutes());
  return `${day}/${month}/${year} ${hour}:${minute}`;
};

// Cópia do payload com as datas de visita já legíveis, para a propriedade
// payload do contato. Não altera o objeto recebido, que continua sendo a fonte
// das conversões. Campo ilegível fica como veio, para o diagnóstico não perder
// o valor original.
const buildReadablePayload = (payload) => {
  const readablePayload = { ...payload };
  for (const field of VISIT_DATETIME_PAYLOAD_FIELDS) {
    const timestamp = toVisitDateTimeMs(readablePayload[field]);
    if (timestamp != null) readablePayload[field] = toReadableDateTime(timestamp);
  }
  return readablePayload;
};

const convertField = (field, payload) => {
  let valor = payload[field.from];
  if ((valor == null || valor === "") && field.fallbackFrom) {
    valor = payload[field.fallbackFrom];
  }

  switch (field.type) {
    case "number":
      return toNumber(valor);
    case "date":
      return toDateString(valor);
    case "datetime":
      return toDateTimeMs(valor, payload[field.timeField]);
    case "visitDateTime":
      return toVisitDateTimeMs(valor);
    default:
      return valor == null || valor === "" ? null : String(valor);
  }
};

// Monta as propriedades do CONTATO sem a business unit: ela é resolvida no
// fluxo principal por append, para que o contato acumule as BUs das marcas.
const buildContactProperties = (fields, payload) => {
  const properties = {};
  for (const field of fields) {
    const converted = convertField(field, payload);
    if (converted != null) properties[field.to] = converted;
  }
  return properties;
};

// Monta as propriedades do DEAL com a business unit da marca como valor único.
const buildDealProperties = (fields, payload) => {
  const properties = {};
  for (const field of fields) {
    const converted = convertField(field, payload);
    if (converted != null) properties[field.to] = converted;
  }
  properties["hs_all_assigned_business_unit_ids"] = ACTIVE.businessUnits.C2Rio;
  return properties;
};

// Faz merge da brand da marca no valor atual de BUs do contato (string separada
// por ';'), sem duplicar e sem manter entradas vazias.
const mergeBusinessUnitIds = (currentValue, businessUnitId) => {
  const units = new Set(
    String(currentValue || "")
      .split(";")
      .map((unit) => unit.trim())
      .filter((unit) => unit !== ""),
  );
  units.add(businessUnitId);
  return Array.from(units).join(";");
};

// Lê o valor atual de hs_all_assigned_business_unit_ids do contato.
const getContactBusinessUnits = async (contactId, hubspotClient) => {
  const { data } = await hubspotClient.get(
    `/crm/v3/objects/contacts/${contactId}?properties=hs_all_assigned_business_unit_ids`,
  );
  return data?.properties?.hs_all_assigned_business_unit_ids || "";
};

exports.main = async (event, callback) => {
  const respond = (payload) =>
    callback({
      outputFields: {
        status: "erro",
        contact_id: "",
        deal_id: "",
        erro: "",
        ...payload,
      },
    });

  if (!ACTIVE.hubspotToken) {
    throw new Error("Secret HUBSPOT_TOKEN_INTEGRACAO_SIG ausente na action de custom code.");
  }

  const payload = event.inputFields || {};

  // No reagendamento, o objeto inscrito no workflow é o DEAL, não o contato.
  const dealId = String(event.object?.objectId || "");
  if (!dealId) {
    throw new Error("Record id do deal ausente no evento (event.object.objectId).");
  }

  const email = String(payload.email || "").trim().toLowerCase();
  if (!email) {
    throw new Error("Campo email ausente ou vazio no payload. Não é possível resolver o contato.");
  }

  console.log(
    `[c2rioReagendamento] deal ${dealId} | email ${email}`,
  );

  const hubspotClient = axios.create({
    baseURL: "https://api.hubapi.com",
    headers: {
      Authorization: `Bearer ${ACTIVE.hubspotToken}`,
      "Content-Type": "application/json",
    },
    timeout: 18000,
  });

  const contactProperties = buildContactProperties(CONTACT_FIELDS, payload);
  contactProperties["payload"] = JSON.stringify(buildReadablePayload(payload), null, 2);
  contactProperties["reagendado"] = true;
  const dealProperties = buildDealProperties(DEAL_FIELDS, payload);
  dealProperties["reagendado"] = true;

  try {
    const contactId = await withStep("resolverContato", () =>
      findContactByEmail(email, hubspotClient),
    );

    if (!contactId) {
      throw new Error(`Contato ${email} não encontrado no portal.`);
    }

    const currentBusinessUnits = await withStep("lerContatoBU", () =>
      getContactBusinessUnits(contactId, hubspotClient),
    );
    contactProperties["hs_all_assigned_business_unit_ids"] = mergeBusinessUnitIds(
      currentBusinessUnits,
      ACTIVE.businessUnits.C2Rio,
    );

    await withStep("atualizarDeal", () =>
      hubspotClient.patch(`/crm/v3/objects/deals/${dealId}`, {
        properties: dealProperties,
      }),
    );

    await withStep("atualizarContato", () =>
      hubspotClient.patch(`/crm/v3/objects/contacts/${contactId}`, {
        properties: contactProperties,
      }),
    );

    await withStep("associarContatoDeal", () =>
      associateContactDeal(contactId, dealId, hubspotClient),
    );

    console.log(
      `[c2rioReagendamento] deal ${dealId} e contato ${contactId} atualizados`,
    );

    return respond({
      status: "atualizado",
      contact_id: contactId,
      deal_id: dealId,
    });
  } catch (error) {
    // Grava etapa, status e resposta da API na própria mensagem do erro, para a
    // falha da action no histórico do workflow já mostrar a causa. O erro
    // original é relançado (mantém status e response) para o HubSpot aplicar
    // as novas tentativas em 429 e 5xx.
    error.message = buildErrorMessage(error);
    console.error("[c2rioReagendamento] error:", error.message);
    throw error;
  }
};

// --- helpers de HubSpot -----------------------------------------------------

const findContactByEmail = async (email, hubspotClient) => {
  const { data } = await hubspotClient.post("/crm/v3/objects/contacts/search", {
    filterGroups: [
      { filters: [{ propertyName: "email", operator: "EQ", value: email }] },
    ],
    properties: ["email"],
    limit: 1,
  });
  const contact = (data.results || [])[0];
  return contact ? contact.id : null;
};

const associateContactDeal = async (contactId, dealId, hubspotClient) => {
  await hubspotClient.put(
    `/crm/v3/objects/deals/${dealId}/associations/contacts/${contactId}/deal_to_contact`,
  );
};

// --- helpers ---------------------------------------------------------------

const withStep = async (step, fn) => {
  try {
    return await fn();
  } catch (err) {
    err.step = step;
    throw err;
  }
};

const buildErrorMessage = (error) => {
  const prefix = error.step ? `[${error.step}] ` : "";
  const detail = error.response?.data;
  const detailStr = detail
    ? " - " + (typeof detail === "string" ? detail : JSON.stringify(detail))
    : "";
  return `${prefix}${error.message}${detailStr}`;
};
