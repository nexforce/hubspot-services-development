// Custom code de ação de workflow baseado em negócio (deal), cliente Bilheteria Digital.
// Evento: criação do produtor no painel próprio da Bilheteria Digital, a partir dos
// dados cadastrais preenchidos no negócio. Gatilho: workflow de negócio no estágio em
// que o produtor deve ser cadastrado no painel.
// Secrets usadas: BD_SERVICE_KEY (x-api-key da API do painel) e BD_HUBSPOT_TOKEN
// (private app do HubSpot, leitura do owner do negócio).
const axios = require("axios");

// Códigos de erro da API de produtores do painel, usados quando a resposta vem sem "message"
const PAINEL_ERRORS = {
  1001: { status: 401, message: "x-api-key ausente ou inválida" },
  1002: { status: 400, message: "corpo ausente ou JSON malformado" },
  1003: { status: 400, message: "campo obrigatório ausente ou em formato inválido" },
  2002: { status: 404, message: "comercial_id não encontrado" },
  2004: { status: 404, message: "cidade/estado não cadastrados" },
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

function onlyDigits(value) {
  return value ? value.replace(/\D/g, "").replace(/^55/, "") : value;
}

// A conta chega do input field com o dígito verificador junto, separado por "-"
// (ex.: "12345-6"). O painel espera o número da conta e o dígito em campos separados.
function splitContaDigito(conta) {
  if (!conta) {
    return { conta: undefined, digitoConta: undefined };
  }

  const match = /^(.+)-(\w+)$/.exec(String(conta).trim());
  if (!match) {
    // Sem "-" no valor: envia a conta como veio e deixa o dígito vazio
    return { conta: conta, digitoConta: undefined };
  }

  return { conta: match[1], digitoConta: match[2] };
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
    tipo_de_produtor,
    cpf,
    cnpj,
    nome_do_produtor,
    estado,
    cidade,
    nome_fantasia,
    inscricao_estadual,
    contribuinte_import,
    email,
    estado_civil,
    profissao,
    numero_de_telefone,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    razao_social,
    praca_id,
    hubspot_owner_id,
    banco,
    agencia,
    tipoconta,
    nome_do_dealer,
    conta
  } = event.inputFields;
  const apiKey = process.env.BD_SERVICE_KEY;
  const accessToken = process.env.BD_HUBSPOT_TOKEN;
  const dealId = event.object.objectId;

  const url =
    "https://ms.bilheteriadigital.net/hubspot-integration/v1/producers";
  const headers = {
    "x-api-key": apiKey,
  };

  try {
    // Dentro do try para que a falha no HubSpot também saia nos output fields de erro
    const ownerId = await getOwnerId(accessToken, dealId);
    const { conta: contaSemDigito, digitoConta } = splitContaDigito(conta);

    const body = {
      tipo_produtor: tipo_de_produtor,
      cpf_produtor: cpf,
      cnpj_produtor: cnpj,
      comercial_id: ownerId,
      hubspot_id: dealId,
      nome_produtor: nome_do_produtor,
      estado: estado,
      cidade: cidade,
      nome_fantasia_produtor: nome_fantasia,
      inscricao_estadual_produtor: inscricao_estadual,
      contribuinte: contribuinte_import,
      email,
      estado_civil,
      profissao,
      telefone: onlyDigits(numero_de_telefone),
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      razao_social,
      praca_id,
      hubspot_owner_id,
      banco,
      agencia,
      tipoconta,
      nome_do_dealer,
      conta: contaSemDigito,
      digitoConta
    };

    const bodyFiltered = Object.fromEntries(
      Object.entries(body).filter(([_, value]) => value !== undefined),
    );
    console.log(bodyFiltered);
    const response = await axios.post(url, bodyFiltered, { headers });
    const producerId = response.data.produtor_id;
    console.log("Produtor criado com sucesso:", response.data);

    return callback({
      outputFields: {
        hs_execution_state: "SUCCESS",
        producerId: producerId,
        comercialId: ownerId,
        error: false,
        errorStatus: null,
        errorCode: null,
        errorMessage: "",
      },
    });
  } catch (error) {
    const { errorStatus, errorCode, errorMessage } = parseApiError(error);
    console.error(
      `Erro ao criar produtor no painel [${errorStatus}/${errorCode}]:`,
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
