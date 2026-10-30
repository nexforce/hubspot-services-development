const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
const axios = require("axios");

const token = process.env.SERVICE_API_TOKEN;

async function associateServiceDealBy(serviceId, dealId) {
  try {
    const url = `https://api.hubapi.com/crm/v4/objects/services/${serviceId}/associations/deals/${dealId}`;
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    const data = [
      {
        associationCategory: "HUBSPOT_DEFINED",
        associationTypeId: 794,
      },
    ];

    const response = await axios({ method: "PUT", url, data, headers });

    return response.data;
  } catch (error) {
    console.error("Error associating service and deal.", error.message);
    const errorMessage =
      error.response?.data?.message || "Unknown error on Hubspot.";

    console.error(errorMessage);

    throw new Error(errorMessage);
  }
}

exports.main = async (event, callback) => {
  const { objectId } = event.object;
  const { dealId } = event.inputFields;

  try {
    console.log("Associating service with deal...");
    const response = await associateServiceDealBy(objectId, dealId);
    console.log("Association successful:", response);
    return await callback({
      outputFields: {},
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
    inputFields: { dealId: "35672423223" },
    object: { objectId: "29389277834" },
  },
  console.log
);
