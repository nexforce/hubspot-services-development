const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
const axios = require("axios");
const hubspotToken = process.env.PARCEIRO_TOKEN;
const baseUrl = "https://api.hubapi.com";

async function getOwnerBy(ownerId) {
  try {
    const headers = {
      Authorization: `Bearer ${hubspotToken}`,
    };

    const url = `${baseUrl}/crm/v3/objects/users/search`;

    const body = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "hubspot_owner_id",
              operator: "EQ",
              value: ownerId,
            },
          ],
        },
      ],
      properties: ["hs_email", "hubspot_owner_id"],
    };

    const response = await axios({ url, method: "POST", data: body, headers });

    return response.data;
  } catch (error) {
    console.error("Error searching Owner", error.message);
    const errorMessage =
      error.response?.data?.message || "Unknown error on Hubspot.";

    console.error(errorMessage);

    throw new Error(errorMessage);
  }
}

exports.main = async (event, callback) => {
  try {
    const { hubspot_owner_id } = event.inputFields;

    const owner = await getOwnerBy(hubspot_owner_id);

    console.log(owner);

    if (owner.total === 0) {
      throw new Error("Owner not found.");
    }

    return await callback({
      outputFields: {
        hs_execution_state: "SUCCESS",
        ownerEmail: owner.results[0].properties.hs_email,
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
      hubspot_owner_id: "1684629374",
    },
    object: {},
  },
  console.log
);
