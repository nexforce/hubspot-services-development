const axios = require("axios");

// Códigos de erro do endpoint create-proposal, usados quando a resposta vem sem "message"
const PAINEL_ERRORS = {
  1001: { status: 401, message: "x-api-key ausente ou inválida" },
  1002: { status: 400, message: "corpo ausente ou JSON malformado" },
  1003: { status: 400, message: "produtor_id, hubspot_id, comercial_id ou praca_id ausente" },
  2001: { status: 404, message: "produtor_id não encontrado" },
  2002: { status: 404, message: "comercial_id não encontrado" },
  2005: { status: 404, message: "praca_id não existe ou está inativo" },
  9001: { status: 500, message: "falha inesperada" },
};

function parseApiError(error) {
  const data = error.response?.data;
  const errorCode = typeof data?.error === "number" ? data.error : null;
  const known = PAINEL_ERRORS[errorCode];

  // Sem response: timeout ou falha de rede, nunca chegou ao painel
  const errorStatus = error.response?.status ?? known?.status ?? null;
  const errorMessage =
    data?.message || known?.message || error.message || "erro desconhecido";

  return { errorStatus, errorCode, errorMessage };
}

async function getOwnerId(accessToken, dealId) {
  const url = `https://api.hubapi.com/crm/v3/objects/deals/${dealId}?properties=hubspot_owner_id`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  try {
    const response = await axios.get(url, { headers });
    const ownerId = response.data.properties.hubspot_owner_id;
    return ownerId;
  } catch (error) {
    console.error("Erro ao obter o ID do proprietário:", error.message);
    throw new Error("Erro ao obter o ID do proprietário: " + error.message);
  }
}

exports.main = async (event, callback) => {
  const {
    id_do_produtor,praca_id
  } = event.inputFields;
  const apiKey = process.env.BD_SERVICE_KEY;
  const accessToken = process.env.BD_HUBSPOT_TOKEN;
  const dealId = event.object.objectId;

  const url =
    "https://ms.bilheteriadigital.net/hubspot-integration/v1/create-proposal";
  const headers = {
    "x-api-key": apiKey,
  };

  try {
    // Dentro do try para que a falha no HubSpot também saia nos output fields de erro
    const ownerId = await getOwnerId(accessToken, dealId);

    const body = {
      produtor_id: id_do_produtor,
      comercial_id: ownerId,
      hubspot_id: dealId,
      praca_id
    };

    console.log(body);
    const response = await axios.post(url, body, { headers });
    console.log("Proposta criada com sucesso:", response.data);

    return callback({
      outputFields: {
        hs_execution_state: "SUCCESS",
        error: false,
        errorStatus: null,
        errorCode: null,
        errorMessage: "",
      },
    });
  } catch (error) {
    const { errorStatus, errorCode, errorMessage } = parseApiError(error);
    console.error(
      `Erro ao criar proposta no painel [${errorStatus}/${errorCode}]:`,
      errorMessage,
    );
    return callback({
      outputFields: {
        hs_execution_state: "ERROR",
        error: true,
        errorStatus,
        errorCode,
        errorMessage,
      },
    });
  }
};
