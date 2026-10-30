const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
const axios = require("axios");
const hubspotToken = process.env.MEETING_ASSOCIATION_TOKEN;
const baseUrl = "https://api.hubapi.com";

async function associateDealWithMeetingBy(dealId, meetingId) {
  try {
    const headers = {
      Authorization: `Bearer ${hubspotToken}`,
    };

    const body = [
      {
        associationCategory: "HUBSPOT_DEFINED",
        associationTypeId: 211,
      },
    ];

    const url = `${baseUrl}/crm/v4/objects/deal/${dealId}/associations/meeting/${meetingId}`;

    const response = await axios({ url, method: "PUT", headers, data: body });

    return response.data;
  } catch (error) {
    console.error("Error associating deal with meeting:", error.message);
    console.log(error);
    const errorMessage =
      error.response?.data?.message || "Unknown error on Hubspot.";

    console.error(errorMessage);

    throw new Error(errorMessage);
  }
}

exports.main = async (event, callback) => {
  try {
    const { dealId, meetingId } = event.inputFields;

    const association = await associateDealWithMeetingBy(dealId, meetingId);
    const { fromObjectId, toObjectId } = association;

    const message = `Associação entre o deal ${fromObjectId} e meeting ${toObjectId} foi um sucesso.`;

    console.log(message);
    return await callback({
      outputFields: {
        dealId: fromObjectId,
        meetingId: toObjectId,
        associationComplete: !!toObjectId,
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
      dealId: 20298165012,
      meetingId: 68418612627,
    },
    object: {
      objectId: "78846578226",
    },
  },
  console.log
);
