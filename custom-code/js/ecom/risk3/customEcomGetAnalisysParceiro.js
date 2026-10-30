const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
// Script: busca o resultado de uma análise já existente no Risk3 e atualiza o registro de Parceiro.
// Cliente: ecom | Contexto: workflow action de custom code do HubSpot, acionado com o identificador da análise (identificador__id_) e o tipo de documento.
// Secrets usadas: RISK_USER, RISK_PASSWORD (login no Risk3), PARCEIRO_TOKEN (atualização do objeto Parceiro no HubSpot), UNIDADE_CONSUMIDORA_TOKEN (flag de payload inválido na UC).
const axios = require("axios");

async function loginOnRisk3() {
  try {
    const user = process.env.RISK_USER;
    const password = process.env.RISK_PASSWORD;

    const url = `https://express-api.risk3.net.br/api/v0/login?username=${user}&password=${password}`;

    const response = await axios({ url, method: "POST" });

    return response.data;
  } catch (error) {
    console.log("Error loggin on Risk3:", error.message);
    throw error;
  }
}

async function getAnalysisBy(id, token) {
  try {
    let url = `https://express-api.risk3.net.br/api/v0/analises/id/${id}`;

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

async function updateParceiroBy(id, data) {
  try {
    const hsToken = process.env.PARCEIRO_TOKEN;

    const url = `https://api.hubapi.com/crm/v3/objects/2-28091991/${id}`;

    const headers = {
      Authorization: `Bearer ${hsToken}`,
    };

    const parceiro = await axios({ url, method: "PATCH", headers, data });

    return parceiro.data;
  } catch (error) {
    console.log("Error updating UC.");
    throw error;
  }
}

function formatDate(date) {
  return new Date(date).setUTCHours(0, 0, 0, 0);
}

function formatPhoneNumber(phone) {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("55")) {
    return "+" + digits;
  }

  return "+55" + digits;
}

function parceiroPropertiesFormatter(analysisId, data, documentType) {
  return {
    properties: {
      identificador__id_: analysisId,
      razao_social: data.empresa.razao_social,
      endereco: data.empresa.endereco,
      atividade_principal: data.empresa.atividade_principal,
      data_da_solicitacao: formatDate(data.data_da_solicitação),
      data_da_finalizacao: formatDate(data.data_da_finalização),
      data_de_validade: new Date(data.data_de_validade).setUTCHours(0, 0, 0, 0),
      produto_risk3: documentType === "CNPJ" ? "express_light" : "express_pf",
      analise_de_credito:
        data.analise.classificacao === "vermelho" ||
        data.analise.classificacao === "roxo"
          ? "Reprovado"
          : "Aprovado",
      alerta_de_restricao: data.analise.resultado_da_analise.alerta,
      score: data.analise.calculos.score_final.toFixed(2),
      score_alerta_de_restricao: data.analise.calculos.fator_de_alerta,
      cnpj: data.empresa.cnpj,
      ramo_da_atividade: data.empresa.ramo_da_atividade,
      codigo_cnae: data.empresa.codigo_cnae,
      tipo_empresa: data.empresa.tipo_de_empresa,
      nome_fantasia: data.empresa.nome_fantasia,
      data_da_fundacao: data.empresa.data_da_fundacao
        ? formatDate(
            data.empresa.data_da_fundacao.split("/").reverse().join("-")
          )
        : "",
      natureza: data.empresa.natureza_juridica
        .replace("(", "")
        .replace(")", ""),
      codigo_natureza: data.empresa.codigo_natureza_juridica,
      setor_econonimo: data.empresa.setor_economico,
      situacao_cadastral: data.empresa.situacao_cadastral_cnpj,
      situacao_especial: data.empresa.situacao_especial_cnpj,
      inscricao_estadual: data.empresa.inscricao_estadual,
      numero_de_filiais: data.empresa.numero_de_filiais,
      numero_de_funcionarios: data.empresa.numero_de_funcionarios,
      telefone_da_empresa: formatPhoneNumber(data.empresa.telefone_da_empresa),
      email_da_empresa: data.empresa.email_da_empresa,
    },
  };
}

async function changeUCPayloadInvalidProperty(objectId, value) {
  const ucObjectTypeID = "2-28158895";
  const hsToken = process.env.UNIDADE_CONSUMIDORA_TOKEN;
  const url = `https://api.hubapi.com/crm/v3/objects/${ucObjectTypeID}/${objectId}`;
  const headers = {
    Authorization: `Bearer ${hsToken}`,
  };

  try {
    const response = await axios({
      url,
      method: "PATCH",
      headers,
      data: {
        properties: {
          risk3_payload_invalido: value,
        },
      },
    });
    return response.data;
  } catch (error) {
    console.log(
      "Error updating risk3_payload_invalido property.",
      error.message
    );
  }
}

function hasInvalidValues(obj) {
  return Object.values(obj).some((value) => {
    if (value === null || value === undefined || value === "") {
      return true;
    }
    if (typeof value === "object" && value !== null) {
      return hasInvalidValues(value);
    }
    return false;
  });
}

exports.main = async (event, callback) => {
  try {
    const {
      data: { token },
    } = await loginOnRisk3();

    const { identificador__id_, tipo_documento } = event.inputFields;

    const analysisResult = await getAnalysisBy(identificador__id_, token);

    if (analysisResult.data === null || hasInvalidValues(analysisResult.data)) {
      await changeUCPayloadInvalidProperty(event.object.objectId, true);
      console.log("Analysis data is invalid or incomplete.");
    }

    if (analysisResult.data.status === "Concluída") {
      const infosToUpdate = parceiroPropertiesFormatter(
        identificador__id_,
        analysisResult.data,
        tipo_documento
      );
      console.log("infosToUpdate", infosToUpdate);

      await updateParceiroBy(event.object.objectId, infosToUpdate);

      return await callback({
        outputFields: {
          hs_execution_state: "SUCCESS",
          hs_object_id: event.object.objectId,
          analysisId: identificador__id_,
        },
      });
    }

    return await callback({
      outputFields: {
        hs_execution_state: "SUCCESS",
        hs_object_id: event.object.objectId,
        analysisId: identificador__id_,
        analise_de_credito: null,
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
      identificador__id_: "ent4991_95111",
      tipo_documento: "CNPJ",
    },
    object: { objectId: 16222219567 },
  },
  console.log
);
