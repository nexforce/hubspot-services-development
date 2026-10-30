const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
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

    const url = `https://api.hubapi.com/crm/v3/objects/2-28064547/${id}`;

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

exports.main = async (event, callback) => {
  try {
    const {
      data: { token },
    } = await loginOnRisk3();

    const analysisId = event.inputFields.identificador__id_;
    const analysisResult = await getAnalysisBy(analysisId, token);

    if (analysisResult.data.status === "Concluída") {
      const infosToUpdate = ucPropertiesFormatter(
        analysisId,
        analysisResult.data
      );
      console.log(infosToUpdate);

      await updateUCBy(event.object.objectId, infosToUpdate);

      return await callback({
        outputFields: {
          hs_execution_state: "SUCCESS",
          hs_object_id: event.object.objectId,
          ...infosToUpdate.properties,
        },
      });
    }

    return await callback({
      outputFields: {
        hs_execution_state: "SUCCESS",
        hs_object_id: event.object.objectId,
        identificador__id_: analysisId,
        recomendacao_final: null,
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
      identificador__id_: "ent3801_94802",
    },
    object: { objectId: 13278618279 },
  },
  console.log
);
