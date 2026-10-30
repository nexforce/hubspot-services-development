const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
const axios = require("axios");

const token = process.env.SERVICE_API_TOKEN;
const ucObjectId = "2-28064547";

async function getAssociatedDealBy(ucId) {
  try {
    const url = `https://api.hubapi.com/crm/v4/objects/${ucObjectId}/${ucId}/associations/deals`;
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    const response = await axios({ method: "GET", url, headers });

    return response.data;
  } catch (error) {
    console.error("Error getting associated deal.", error.message);
    const errorMessage =
      error.response?.data?.message || "Unknown error on Hubspot.";

    console.error(errorMessage);

    throw new Error(errorMessage);
  }
}

exports.main = async (event, callback) => {
  const { ucId } = event.inputFields;
  try {
    const deal = await getAssociatedDealBy(ucId);

    if (deal?.results.length === 0) {
      console.error("No associated deal found.");
      throw new Error("No associated deal found.");
    } else if (deal?.results.length > 1) {
      console.log("Multiple associated deals found. Using the first one.");
    }

    console.log("Associated deal found:", deal);

    const dealId = deal.results[0].toObjectId;

    return await callback({
      outputFields: {
        dealId,
      },
    });
  } catch (err) {
    console.error(err);
    // Force retry if error is on cloudflare's side. (https://developers.hubspot.com/docs/api/error-handling#custom-code-workflow-actions)
    if (axios.isAxiosError(err) && JSON.stringify(err).includes("cloudflare"))
      err.response.status = 500;
    // We will automatically retry when the code fails because of a rate limiting error from the HubSpot API.
    throw err;
  }
};

// [FINAL];

exports.main(
  {
    inputFields: { ucId: "29389277834" },
    object: { objectId: "" },
  },
  console.log
);
