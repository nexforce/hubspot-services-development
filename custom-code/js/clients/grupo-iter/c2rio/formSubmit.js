const axios = require("axios");

// ---------------------------------------------------------------------------
// Grupo Iter - BU C2Rio - evento form-submit (SIG).
//
// Contexto: action de custom code dentro de um workflow cujo trigger é um
// webhook. A chave de inscrição do workflow é o e-mail. O evento atualiza o
// CONTATO inscrito no workflow, aplicando as conversões de tipo. Não cria deal.
// A propriedade data_do_ultimo_formsubmit (datetime) recebe o instante da
// execução do script, em timestamp em milissegundos (UTC).
//
// O mesmo evento chega em dois formatos: passeio com horário (payload
// completo, com nome, CEP, cidade, estado e país) e passeio sem horário
// (payload reduzido, sem esses campos). Campo ausente ou vazio não é gravado,
// então o valor já existente no contato é mantido.
//
// O contato inscrito no workflow já fornece o record id em event.object.objectId
// e é atualizado via PATCH na API v3 de contacts. A brand da marca (C2Rio) é
// gravada no contato via APPEND da constante ACTIVE.businessUnits.C2Rio, sem
// sobrescrever BUs já existentes.
//
// Regras de conversão específicas deste evento:
//   - cf_data_hora_visita (datetime): ISO com fuso (ex.: 2026-10-12T09:00:00-03:00)
//     é gravado como o instante recebido, em timestamp ms.
//   - cf_data_visita não é gravado: a data já vai por cf_data_hora_visita e o
//     valor original fica no campo payload.
//   - cf_order_payment_amount -> cf_valor_pedido (number).
//
// O token vem de ACTIVE.hubspotToken: secret HUBSPOT_TOKEN_SANDBOX_INTEGRACAO_SIG
// em sandbox e HUBSPOT_TOKEN_INTEGRACAO_SIG em produção, nunca hardcoded.
// ---------------------------------------------------------------------------

// Ambiente da execução. Trocar manualmente para "production" no deploy.
const ENV = "sandbox";

const CONFIG = {
  sandbox: {
    businessUnits: { Bondinho: "4554145", Caracol: "4554143", C2Rio: "4554144" },
    hubspotToken: process.env.HUBSPOT_TOKEN_SANDBOX_INTEGRACAO_SIG,
  },
  production: {
    businessUnits: { Bondinho: "4292163", Caracol: "4275397", C2Rio: "4344366" },
    hubspotToken: process.env.HUBSPOT_TOKEN_INTEGRACAO_SIG,
  },
};

const ACTIVE = CONFIG[ENV];

// Mapeamento (payload -> propriedade do contato na HubSpot) com a conversão de
// tipo correspondente.
const CONTACT_FIELDS = [
  { from: "conversion_identifier", to: "conversion_identifier", type: "text" },
  { from: "traffic_medium", to: "utm_medium", type: "text" },
  { from: "traffic_source", to: "utm_source", type: "text" },
  { from: "email", to: "email", type: "text" },
  { from: "name", to: "firstname", type: "text" },
  { from: "cf_cep", to: "zip", type: "text" },
  { from: "city", to: "city", type: "text" },
  { from: "state", to: "state", type: "text" },
  { from: "country", to: "country", type: "text" },
  { from: "cf_data_hora_visita", to: "cf_data_hora_visita", type: "visitDateTime" },
  { from: "cf_produto", to: "cf_produto", type: "text" },
  { from: "cf_order_payment_amount", to: "cf_valor_pedido", type: "number" },
  { from: "cf_category", to: "cf_category", type: "text" },
  { from: "cf_lingua", to: "idioma_cloned", type: "idioma" },
  { from: "cf_quantity", to: "quantidade_de_bilhetes", type: "number" },
];

const toNumber = (valor) => {
  if (valor == null || valor === "") return null;
  const numericValue = Number(String(valor).replace(",", "."));
  return Number.isFinite(numericValue) ? numericValue : null;
};

// cf_data_hora_visita (datetime). Aceita YYYY-MM-DD ou DD-MM-YYYY (hífen ou
// barra), com horário opcional HH:mm[:ss]. Com fuso explícito (Z ou ±HH:mm),
// usa o instante como veio; sem fuso, o horário é o de Brasília (UTC-3). Sem
// horário, fixa 12:00 de Brasília, evitando mudança de dia na exibição. Valor
// ilegível retorna null (não grava).
const toVisitDateTimeMs = (raw) => {
  if (raw == null || raw === "") return null;
  const text = String(raw).trim();
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
  return Date.UTC(year, month - 1, day, hour, minute, second) + 3 * 60 * 60 * 1000;
};

// cf_lingua -> idioma (dropdown ingles/portugues/espanhol). Desconhecido ou
// vazio retorna null (não grava).
const toIdioma = (valor) => {
  if (valor == null || valor === "") return null;
  const normalizedValue = String(valor)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (normalizedValue === "br") return "portugues";
  if (normalizedValue === "en") return "ingles";
  if (normalizedValue === "es") return "espanhol";
  return null;
};

const convertField = (field, payload) => {
  let valor = payload[field.from];
  if (field.type === "idioma") {
    valor = payload.cf_language || payload.cf_lingua;
  }

  switch (field.type) {
    case "number":
      return toNumber(valor);
    case "visitDateTime":
      return toVisitDateTimeMs(valor);
    case "idioma":
      return toIdioma(valor);
    default:
      return valor == null || valor === "" ? null : String(valor).trim();
  }
};

// Monta as propriedades do CONTATO sem a business unit: ela é resolvida no
// fluxo principal por append, para que o contato acumule as BUs das marcas.
// Campos vazios ou ausentes ficam de fora, para não sobrescrever o contato.
const buildContactProperties = (fields, payload) => {
  const properties = {};
  for (const field of fields) {
    const converted = convertField(field, payload);
    if (converted != null) properties[field.to] = converted;
  }
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
        erro: "",
        propriedades_gravadas: 0,
        ...payload,
      },
    });

  // As propriedades recebidas do webhook são expostas como input fields do
  // workflow e chegam em event.inputFields.
  const payload = event.inputFields || {};

  if (!ACTIVE.hubspotToken) {
    throw new Error(`Secret do token ausente no portal (ambiente ${ENV}).`);
  }

  // O contato inscrito no workflow já está resolvido; o record id vem direto do
  // evento, sem necessidade de busca por e-mail.
  const contactId = String(event.object?.objectId || "");
  if (!contactId) {
    throw new Error("Record id do contato ausente no evento (event.object.objectId).");
  }

  console.log(`[c2rioFormSubmit] processando contato ${contactId}`);

  const contactProperties = buildContactProperties(CONTACT_FIELDS, payload);
  if (!Object.keys(contactProperties).length) {
    throw new Error("Nenhuma propriedade a mapear no payload.");
  }

  contactProperties["payload"] = JSON.stringify(payload, null, 2);

  // Data do último form-submit: instante da execução do script, em ms UTC.
  contactProperties["data_do_ultimo_formsubmit"] = Date.now();

  const hubspotClient = axios.create({
    baseURL: "https://api.hubapi.com",
    headers: {
      Authorization: `Bearer ${ACTIVE.hubspotToken}`,
      "Content-Type": "application/json",
    },
    timeout: 18000,
  });

  try {
    // Lê a BU atual do contato e faz append da brand da marca.
    const currentBusinessUnits = await withStep("lerContatoBU", () =>
      getContactBusinessUnits(contactId, hubspotClient),
    );
    contactProperties["hs_all_assigned_business_unit_ids"] = mergeBusinessUnitIds(
      currentBusinessUnits,
      ACTIVE.businessUnits.C2Rio,
    );

    await withStep("atualizarContato", () =>
      hubspotClient.patch(`/crm/v3/objects/contacts/${contactId}`, {
        properties: contactProperties,
      }),
    );

    const writtenCount = Object.keys(contactProperties).length;
    console.log(
      `[c2rioFormSubmit] contato ${contactId} atualizado com ${writtenCount} propriedades`,
    );

    return respond({
      status: "atualizado",
      contact_id: contactId,
      propriedades_gravadas: writtenCount,
    });
  } catch (error) {
    // Grava etapa, status e resposta da API na própria mensagem do erro, para a
    // falha da action no histórico do workflow já mostrar a causa. O erro
    // original é relançado (mantém status e response) para o HubSpot aplicar
    // as novas tentativas em 429 e 5xx.
    error.message = buildErrorMessage(error);
    console.error("[c2rioFormSubmit] error:", error.message);
    throw error;
  }
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
