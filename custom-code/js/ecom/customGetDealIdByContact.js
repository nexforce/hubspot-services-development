const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
const axios = require("axios");
const hubspotToken = process.env.MEETING_ASSOCIATION_TOKEN;
const baseUrl = "https://api.hubapi.com";

async function getAssociatedDealBy(contactId) {
  try {
    const headers = {
      Authorization: `Bearer ${hubspotToken}`,
    };

    const url = `${baseUrl}/crm/v4/objects/contacts/${contactId}/associations/deals`;

    const response = await axios({ url, method: "GET", headers });

    return response.data;
  } catch (error) {
    console.error("Error getting associated deal", error.message);
    const errorMessage =
      error.response?.data?.message || "Unknown error on Hubspot.";

    console.error(errorMessage);

    throw new Error(errorMessage);
  }
}

exports.main = async (event, callback) => {
  try {
    const { objectId } = event.object;

    const associations = await getAssociatedDealBy(objectId);

    if (associations.results.length === 0) {
      throw new Error("No associated deals.");
    }

    const dealId = associations.results[0].toObjectId;

    return await callback({
      outputFields: {
        dealId,
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
    inputFields: {},
    object: {
      objectId: "78846578226",
    },
  },
  console.log
);
