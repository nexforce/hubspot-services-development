const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
const axios = require("axios");

const hubspotToken = process.env.MEETING_ASSOCIATION_TOKEN;
const baseUrl = "https://api.hubapi.com";
const LEAD_OBJECT_TYPE_ID = "2-20848482";

async function getAssociatedLeadBy(contactId) {
  const headers = {
    Authorization: `Bearer ${hubspotToken}`,
  };

  const url = `${baseUrl}/crm/v4/objects/contacts/${contactId}/associations/${LEAD_OBJECT_TYPE_ID}`;
  try {
    const response = await axios({ url, method: "GET", headers });

    return response.data;
  } catch (error) {
    console.error("Error getting associated lead", error.message);
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

    return await callback({
      outputFields: {
        leadId,
      },
    });
  } catch (err) {
    await callback({
      outputFields: { hs_execution_state: "FAIL_CONTINUE" },
    });
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
      objectId: "161244274989",
    },
  },
  console.log
);
