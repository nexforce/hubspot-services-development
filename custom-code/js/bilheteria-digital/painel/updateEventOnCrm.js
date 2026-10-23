/**
 * Cliente: Bilheteria Digital
 *
 * O que faz: atualiza o registro de evento no CRM do HubSpot com os dados que vêm
 * do painel da Bilheteria Digital (nome, datas, faturamento, saques e responsável).
 *
 * Onde roda: ação de custom code em workflow baseado no objeto customizado de
 * evento (2-55755755). Os valores chegam pelos inputFields do workflow e o
 * registro atualizado é o próprio objeto que disparou o workflow.
 *
 * Secret: BD_HUBSPOT_TOKEN (private app com permissão de escrita no objeto de evento).
 */

const axios = require("axios");

const EVENT_OBJECT_ID = "2-55755755";

// As datas chegam em horário de Brasília (UTC-3) e o HubSpot grava em UTC.
// Somar 3 horas evita que a data caia no dia anterior no registro.
const BRASILIA_OFFSET_MS = 3 * 60 * 60 * 1000;

function formatDateToMillis(date) {
  if (!date) return undefined;

  const baseMillis =
    typeof date === "number"
      ? date
      : date instanceof Date
        ? date.getTime()
        : Date.parse(String(date).trim());

  if (Number.isNaN(baseMillis)) return undefined;

  return baseMillis + BRASILIA_OFFSET_MS;
}

// Devolve undefined quando o valor não é um número válido, para o campo ser
// removido do corpo da requisição. Sem isso, Number("") vira NaN, o filtro de
// campos indefinidos não pega, o NaN chega ao HubSpot como null e apaga o valor
// que já estava gravado no registro.
function parseNumber(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return undefined;
  }

  const parsedNumber = Number(value);
  return Number.isFinite(parsedNumber) ? parsedNumber : undefined;
}

exports.main = async (event, callback) => {
  const {
    ultimo_saque_id,
    data_abertura_vendas,
    data_ultimo_saque,
    evento_id,
    faturamento_atual,
    motivo_cancelamento_evento,
    responsavel_ultimo_saque,
    status_ultimo_saque,
    valor_total_saque,
    valor_ultimo_saque,
    nome,
    data_evento,
    responsavel_id,
  } = event.inputFields;
  const eventId = event.object.objectId;
  const accessToken = process.env.BD_HUBSPOT_TOKEN;

  if (!accessToken) {
    throw new Error(
      "Secret BD_HUBSPOT_TOKEN não configurada na ação de custom code do workflow.",
    );
  }

  const url = `https://api.hubapi.com/crm/v3/objects/${EVENT_OBJECT_ID}/${eventId}`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  const body = {
    properties: {
      nome_do_evento: nome,
      id_do_saque: ultimo_saque_id,
      data_de_abertura_das_vendas: formatDateToMillis(data_abertura_vendas),
      data_do_ultimo_saque: formatDateToMillis(data_ultimo_saque),
      id_do_evento: evento_id,
      faturamento_atual: parseNumber(faturamento_atual),
      motivo_do_cancelamento: motivo_cancelamento_evento,
      responsavel_pelo_ultimo_saque: responsavel_ultimo_saque,
      status_do_saque: status_ultimo_saque,
      valor_total_de_saque: parseNumber(valor_total_saque),
      valor_do_ultimo_saque: parseNumber(valor_ultimo_saque),
      hubspot_owner_id: responsavel_id,
      data_do_evento: formatDateToMillis(data_evento),
    },
  };

  const definedProperties = Object.fromEntries(
    Object.entries(body.properties).filter(([_, value]) => value !== undefined),
  );
  body.properties = definedProperties;

  try {
    const response = await axios.patch(url, body, { headers });
    console.log("Evento atualizado com sucesso:", response.data);

    return callback({
      outputFields: { hs_execution_state: "SUCCESS" },
    });
  } catch (error) {
    // Bloqueio da Cloudflare antes de chegar na API: tratado como erro de
    // servidor para o workflow tentar de novo. O teste de error.response é
    // obrigatório: em timeout ou queda de rede não existe resposta, e escrever
    // o status direto estoura um TypeError que esconde o erro de verdade.
    if (
      axios.isAxiosError(error) &&
      error.response &&
      JSON.stringify(error).includes("cloudflare")
    ) {
      error.response.status = 500;
    }

    console.log(JSON.stringify(error.response?.data, null, 2));
    throw error;
  }
};
