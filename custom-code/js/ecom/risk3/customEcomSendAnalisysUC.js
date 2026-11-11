const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
// Script: envia uma nova análise ao Risk3 (CPF ou CNPJ) a partir de um risk3_token já obtido previamente e grava o
// identificador da análise direto na Unidade Consumidora (UC), sem depender de uma ação separada de busca do resultado.
// Cliente: ecom | Contexto: workflow action de custom code do HubSpot.
// Secrets usadas: UNIDADE_CONSUMIDORA_TOKEN (atualização do objeto UC no HubSpot). O risk3_token chega pronto via inputFields, gerado por customEcomLoginOnRisk3.js.
const axios = require("axios");

const UC_URL = "https://api.hubapi.com/crm/v3/objects/2-28158895";

async function sendAnalysis(data) {
  let url;
  if (data.documentType === "cpf") {
    url = "https://express-api.risk3.net.br/api/v0/analises/cpf";
  } else {
    url = `https://express-api.risk3.net.br/api/v0/analises?product=${data.product}`;
  }
  const response = await axios({
    url,
    method: "POST",
    headers: { "Venidera-AuthToken": data.risk3_token },
    data: { [`${data.documentType}s`]: [data.document] },
    timeout: 8000,
  });
  return response.data;
}

function getDocumentType(document) {
  const digits = document.replace(/\D/g, "");
  if (digits.length === 11) return "cpf";
  if (digits.length === 14) return "cnpj";
  return null;
}

async function updateUC(objectId, properties) {
  await axios({
    url: `${UC_URL}/${objectId}`,
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${process.env.UNIDADE_CONSUMIDORA_TOKEN}`,
      "Content-Type": "application/json",
    },
    data: { properties },
    timeout: 8000,
  });
}

exports.main = async (event, callback) => {
  try {
    const objectId = event.object.objectId;
    const { risk3_token, cnpj } = event.inputFields;
    const documentType = getDocumentType(cnpj);
    if (!documentType) {
      console.error(`Invalid document: ${cnpj}`);
      return await callback({
        outputFields: { hs_execution_state: "FAIL_CONTINUE" },
      });
    }
    const dataTosend = {
      documentType,
      document: cnpj,
      risk3_token,
      ...(documentType === "cnpj" && { product: "express_light" }),
    };

    const analysisResponse = await sendAnalysis(dataTosend);
    console.log("Risk3 response:", JSON.stringify(analysisResponse));

    const analysisId = analysisResponse.data?.records?.[0]?.id;
    console.log("analysisId:", analysisId);

    if (!analysisId) {
      console.error("Risk3 não devolveu analysisId");
      return await callback({
        outputFields: { hs_execution_state: "FAIL_CONTINUE" },
      });
    }

    // Grava direto na UC, sem depender da ação 5
    await updateUC(objectId, {
      identificador__id_: analysisId,
      produto_risk3: dataTosend.product || "express_pf",
    });

    console.log(`UC ${objectId} atualizada | identificador__id_=${analysisId}`);

    return await callback({
      outputFields: {
        hs_execution_state: "SUCCESS",
        identificador__id_: analysisId,
        produto_risk3: dataTosend.product || "express_pf",
      },
    });
  } catch (err) {
    const status = err.response?.status;
    const detail = err.response?.data || err.message;
    console.error(`Error [${status || "NO_RESPONSE"}]:`, detail);
    await callback({ outputFields: { hs_execution_state: "FAIL_CONTINUE" } });
    // Force retry if error is on cloudflare's side. (https://developers.hubspot.com/docs/api/error-handling#custom-code-workflow-actions)
    if (axios.isAxiosError(err) && JSON.stringify(err).includes("cloudflare"))
      err.response.status = 500;
    throw err;
  }
};

// [FINAL]

exports.main(
  {
    inputFields: {
      risk3_token: "SEU_TOKEN_DE_TESTE_AQUI",
      cnpj: "44.733.049/0001-29",
    },
    object: { objectId: 12887363680 },
  },
  console.log
);
