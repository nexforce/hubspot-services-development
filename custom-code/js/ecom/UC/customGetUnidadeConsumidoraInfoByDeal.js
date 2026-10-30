const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
const axios = require("axios");

const hubspotToken = process.env.UNIDADE_CONSUMIDORA_TOKEN;
const baseUrl = "https://api.hubapi.com";
const UNIDADE_CONSUMIDORA_OBJECT_TYPE_ID = "2-28064547";

async function getAssociatedUnidadeConsumidoraBy(dealId) {
  const headers = {
    Authorization: `Bearer ${hubspotToken}`,
  };

  const url = `${baseUrl}/crm/v4/objects/deals/${dealId}/associations/${UNIDADE_CONSUMIDORA_OBJECT_TYPE_ID}`;
  try {
    const response = await axios({ url, method: "GET", headers });

    return response.data;
  } catch (error) {
    console.error(
      "Error getting associated unidade consumidora: ",
      error.message
    );
    const errorMessage =
      error.response?.data?.message || "Unknown error on Hubspot.";

    console.error(errorMessage);

    throw new Error(errorMessage);
  }
}

async function getUnidadeConsumidoraInfo(unidadeConsumidoraId) {
  const headers = {
    Authorization: `Bearer ${hubspotToken}`,
  };
  const params = {
    properties: [
      "cnpj",
      "razao_social",
      "consumo_total_em_kwh",
      "logradouro",
      "bairro",
      "cep",
      "cidade",
      "estado",
      "codigo_uc",
      "tipo_documento",
    ].join(","),
  };

  const url = `${baseUrl}/crm/v3/objects/${UNIDADE_CONSUMIDORA_OBJECT_TYPE_ID}/${unidadeConsumidoraId}`;
  try {
    const response = await axios({ url, method: "GET", headers, params });

    return response.data;
  } catch (error) {
    console.error("Error getting unidade consumidora info: ", error.message);
    const errorMessage =
      error.response?.data?.message || "Unknown error on Hubspot.";

    console.error(errorMessage);

    throw new Error(errorMessage);
  }
}

exports.main = async (event, callback) => {
  try {
    const { objectId } = event.object;

    const associations = await getAssociatedUnidadeConsumidoraBy(objectId);

    if (associations.results.length === 0) {
      throw new Error("No associated unidade consumidora.");
    }

    const unidadeConsumidoraId = associations.results[0].toObjectId;
    const unidadeConsumidoraInfo = await getUnidadeConsumidoraInfo(
      unidadeConsumidoraId
    );

    console.log("Unidade Consumidora Info: ", unidadeConsumidoraInfo);

    return await callback({
      outputFields: {
        cnpj: unidadeConsumidoraInfo.properties.cnpj || "",
        companyName: unidadeConsumidoraInfo.properties.razao_social || "",
        totalConsumptionKwh:
          unidadeConsumidoraInfo.properties.consumo_total_em_kwh || "",
        street: unidadeConsumidoraInfo.properties.logradouro || "",
        neighborhood: unidadeConsumidoraInfo.properties.bairro || "",
        zipCode: unidadeConsumidoraInfo.properties.cep || "",
        city: unidadeConsumidoraInfo.properties.cidade || "",
        state: unidadeConsumidoraInfo.properties.estado || "",
        consumerUnitCode: unidadeConsumidoraInfo.properties.codigo_uc || "",
        documentType: unidadeConsumidoraInfo.properties.tipo_documento || "",
      },
    });
  } catch (err) {
    console.error(err);
    if (axios.isAxiosError(err) && JSON.stringify(err).includes("cloudflare"))
      err.response.status = 500;
    throw err;
  }
};

// [FINAL]

exports.main(
  {
    inputFields: {},
    object: {
      objectId: "49069942550",
    },
  },
  console.log
);
