const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
// Script: envia uma nova análise ao Risk3 (CPF ou CNPJ) e atualiza o registro de Unidade Consumidora (UC) com o resultado.
// Cliente: ecom | Contexto: workflow action de custom code do HubSpot, primeira tentativa de envio da análise.
// Secrets usadas: RISK_USER, RISK_PASSWORD (login no Risk3), UNIDADE_CONSUMIDORA_TOKEN (atualização do objeto UC no HubSpot).
const axios = require("axios");

async function loginOnRisk3() {
  try {
    const user = process.env.RISK_USER;
    const password = process.env.RISK_PASSWORD;

    const url = `https://express-api.risk3.live/api/v0/login?username=${user}&password=${password}`;

    const response = await axios({ url, method: "POST" });

    return response.data;
  } catch (error) {
    console.log("Error loggin on Risk3:", error.message);
    throw error;
  }
}

async function sendAnalysis(data) {
  try {
    let url;
    if (data.documentType == "cpf") {
      url = "https://express-api.risk3.live/api/v0/analises/cpf";
    } else {
      url = `https://express-api.risk3.live/api/v0/analises?product=${data.product}`;
    }

    const headers = {
      ["Venidera-AuthToken"]: data.token,
    };

    const body = {
      [`${data.documentType}s`]: [data.document],
    };

    const response = await axios({
      url,
      method: "POST",
      headers,
      data: body,
      timeout: 8000,
    });

    return response.data;
  } catch (error) {
    console.log("Error sending analysis:", error.message);
    throw error;
  }
}

async function getAnalysisBy(id, token) {
  try {
    let url = `https://express-api.risk3.live/api/v0/analises/id/${id}`;

    const headers = {
      ["Venidera-AuthToken"]: token,
    };

    const response = await axios({ url, method: "GET", headers });

    return response.data;
  } catch (error) {
    console.log("Error getting analysis:", error.message);
    throw error;
  }
}

async function updateUCBy(id, data) {
  try {
    const hsToken = process.env.UNIDADE_CONSUMIDORA_TOKEN;

    const url = `https://api.hubapi.com/crm/v3/objects/2-28158895/${id}`;

    const headers = {
      Authorization: `Bearer ${hsToken}`,
    };

    const uc = await axios({ url, method: "PATCH", headers, data });

    return uc.data;
  } catch (error) {
    console.log("Error updating UC.");
    throw error;
  }
}

function ucPropertiesFormatter(analysisId, data) {
  const productMapper = {
    ["Xpress Full"]: "express_full",
    ["Xpress Light"]: "express_light",
    ["Xpress Pessoa Física"]: "express_pf",
  };

  return {
    properties: {
      identificador__id_: analysisId,
      data_da_solicitacao: new Date(data.data_da_solicitação).setUTCHours(
        0,
        0,
        0,
        0
      ),
      data_da_finalizacao: new Date(data.data_da_finalização).setUTCHours(
        0,
        0,
        0,
        0
      ),
      data_de_validade: new Date(data.data_de_validade).setUTCHours(0, 0, 0, 0),
      produto_risk3: productMapper[data.produto],
      recomendacao_final: data.analise.classificacao,
      alerta_de_restricao: data.analise.resultado_da_analise.alerta,
      score: data.analise.calculos.score_final.toFixed(2),
      score_alerta_de_restricao: data.analise.calculos.fator_de_alerta,
      nivel_de_aprovacao:
        productMapper[data.produto] == "express_full" ? "Nivel 2" : "Nivel 1",
    },
  };
}

function getDocumentType(document) {
  document = document.replace(/\D/g, "");

  const options = [
    {
      documentType: "cpf",
      length: 11,
    },
    {
      documentType: "cnpj",
      length: 14,
    },
  ];

  for (const option of options) {
    if (document.length == option.length) {
      return option.documentType;
    }
  }

  return "Invalid document type";
}

exports.main = async (event, callback) => {
  try {
    const start = new Date();

    const {
      data: { token },
    } = await loginOnRisk3();
    console.log("LOGOU");

    const documentType = getDocumentType(event.inputFields.cnpj);
    console.log("BUSCOU O TIPO DE DOCUMENTO");

    let analysisId;
    let dataTosend;
    let analysisResponse;

    switch (documentType) {
      case "cpf":
        dataTosend = {
          documentType,
          document: event.inputFields.cnpj,
          token,
        };

        analysisResponse = await sendAnalysis(dataTosend);

        analysisId = analysisResponse.data.records[0].id;
        break;

      case "cnpj":
        dataTosend = {
          documentType,
          document: event.inputFields.cnpj,
          token,
          product: "express_light",
        };

        console.log("ENVIANDO ANÁLISE CNPJ");

        analysisResponse = await sendAnalysis(dataTosend);

        console.log("ANÁLISE CNPJ ENVIADA");

        analysisId = analysisResponse?.data.records[0].id;
        break;

      default:
        console.log(documentType);
        break;
    }

    const analysisResult = await getAnalysisBy(analysisId, token);

    console.log("BUSCOU A ANÁLISE");

    if (analysisResult.data.status === "Concluída") {
      const infosToUpdate = ucPropertiesFormatter(
        analysisId,
        analysisResult.data
      );

      await updateUCBy(event.object.objectId, infosToUpdate);

      return await callback({
        outputFields: {
          hs_execution_state: "SUCCESS",
          hs_object_id: event.object.objectId,
          ...infosToUpdate.properties,
        },
      });
    }

    await updateUCBy(event.object.objectId, {
      properties: {
        identificador__id_: analysisId,
        produto_risk3: dataTosend.product || "express_pf",
        recomendacao_final: null,
      },
    });

    const end = new Date();
    const time = (end - start) / 1000;

    console.log(`Tempo de execução: ${time} segundos`);

    return await callback({
      outputFields: {
        hs_execution_state: "SUCCESS",
        hs_object_id: event.object.objectId,
        identificador__id_: analysisId,
        recomendacao_final: null,
        produto_risk3: dataTosend.product || "express_pf",
      },
    });
  } catch (err) {
    await callback({
      outputFields: { hs_execution_state: "FAIL_CONTINUE" },
    });
    console.error(err);
    // Force retry if error is on cloudflare's side. (https://developers.hubspot.com/docs/api/error-handling#custom-code-workflow-actions)
    if (axios.isAxiosError(err) && JSON.stringify(err).includes("cloudflare"))
      err.response.status = 500;
    // We will automatically retry when the code fails because of a rate limiting error from the HubSpot API.
    throw err;
  }
};

// [FINAL]

exports.main(
  {
    inputFields: {
      cnpj: "31.274.296/0001-62",
    },
    object: { objectId: 15448542571 },
  },
  console.log
);
