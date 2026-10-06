const axios = require("axios");

// Validação de status é centralizada na API do IPOG: se a matrícula não estiver
// elegível (ex.: status "AT"), a API responde 4xx com o motivo em `message`, e
// este envelope repassa o texto original para o modal do card, sem reescrever.
exports.main = async (context = {}) => {
  const { matricula } = context.parameters;

  if (!matricula || String(matricula).trim() === "") {
    return {
      status: "ERROR",
      origin: "SISTEMA",
      message: "ID da matrícula é obrigatório.",
    };
  }

  // Reutiliza o secret MULESOFT_BASE_URL já configurado na conta. Premissa
  // registrada pelo consultor: na sandbox, esse secret aponta para homologação.
  const baseUrl = process.env.MULESOFT_BASE_URL;
  if (!baseUrl) {
    return {
      status: "ERROR",
      origin: "SISTEMA",
      message:
        "MULESOFT_BASE_URL não configurada. Verifique os secrets do projeto.",
    };
  }

  // Mesma autenticação Basic dos demais endpoints /matricula/v1/ da MuleSoft.
  // Se o cancelarPreMatricula não exigir, o header é ignorado pelo gateway.
  const username = process.env.MULESOFT_USERNAME;
  const password = process.env.MULESOFT_PASSWORD;
  if (!username || !password) {
    return {
      status: "ERROR",
      origin: "SISTEMA",
      message: "MuleSoft credentials are not set in environment variables.",
    };
  }

  const headers = {
    Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString(
      "base64",
    )}`,
  };

  const codigoMatricula = encodeURIComponent(String(matricula).trim());
  const url = `${baseUrl.replace(/\/+$/, "")}/matricula/v1/cancelarPreMatricula?matricula=${codigoMatricula}`;

  console.log("Cancelando pré-matrícula:", url);

  try {
    const response = await axios({
      method: "POST",
      url,
      headers,
    });

    console.log("Resposta do cancelamento:", response.status, response.data);

    const data = response.data || {};
    return {
      status: "SUCCESS",
      message: data.message || "Pré-matrícula cancelada com sucesso.",
      response: data,
    };
  } catch (error) {
    const httpStatus = error.response?.status;
    const data = error.response?.data || {};
    console.error(
      "Erro ao cancelar pré-matrícula:",
      httpStatus,
      error.message,
    );
    console.error("Detalhes:", data);

    return {
      status: "ERROR",
      origin: "IPOG_API",
      httpStatus,
      // O texto de `message` da API é o que o modal deve exibir ao consultor.
      message:
        data.message ||
        data.error ||
        "Não foi possível cancelar a pré-matrícula. Tente novamente.",
      correlationId: data.correlationId,
      // Status atual da matrícula (ex.: "AT"), para o modal explicar o bloqueio.
      statusMatricula: data.statusMatricula,
    };
  }
};
