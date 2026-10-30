const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
const axios = require("axios");

const hubspotToken = process.env.UNIDADE_CONSUMIDORA_TOKEN;
const baseUrl = "https://api.hubapi.com";

const LEAD_OBJECT_TYPE_ID = "2-20848482";


async function getAssociatedLeadBy(dealId) {
  const headers = {
    Authorization: `Bearer ${hubspotToken}`,
  };

  const url = `${baseUrl}/crm/v4/objects/deals/${dealId}/associations/${LEAD_OBJECT_TYPE_ID}`;
  try {
    const response = await axios({ url, method: "GET", headers });

    return response.data;
  } catch (error) {
    console.error("Error getting associated lead: ", error.message);
    const errorMessage =
      error.response?.data?.message || "Unknown error on Hubspot.";

    console.error(errorMessage);

    throw new Error(errorMessage);
  }
}

async function getLeadInfo(leadId) {
  const headers = {
    Authorization: `Bearer ${hubspotToken}`,
  };
  const params = {

    properties: ["desconto_gd"].join(","),

  };

  const url = `${baseUrl}/crm/v3/objects/${LEAD_OBJECT_TYPE_ID}/${leadId}`;
  try {
    const response = await axios({ url, method: "GET", headers, params });

    return response.data;
  } catch (error) {
    console.error("Error getting lead info: ", error.message);
    const errorMessage =
      error.response?.data?.message || "Unknown error on Hubspot.";

    console.error(errorMessage);

    throw new Error(errorMessage);
  }
}

exports.main = async (event, callback) => {
  try {
    const { objectId } = event.object;

    const associations = await getAssociatedLeadBy(objectId);

    if (associations.results.length === 0) {
      throw new Error("No associated leads.");
    }

    const leadId = associations.results[0].toObjectId;
    const leadInfo = await getLeadInfo(leadId);

    console.log("Lead Info: ", leadInfo);

    return await callback({
      outputFields: {

        discount: leadInfo.properties.desconto_gd || "",

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
