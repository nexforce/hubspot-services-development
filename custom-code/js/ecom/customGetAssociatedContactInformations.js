const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
const axios = require("axios");
const hubspotToken = process.env.PARCEIRO_TOKEN;
const baseUrl = "https://api.hubapi.com";
const parceiroObjectId = "2-28103807";

async function getAssociatedContactsBy(parceiroId) {
  try {
    const headers = {
      Authorization: `Bearer ${hubspotToken}`,
    };

    const url = `${baseUrl}/crm/v4/objects/${parceiroObjectId}/${parceiroId}/associations/contacts`;

    const response = await axios({ url, method: "GET", headers });

    return response.data;
  } catch (error) {
    console.error("Error getting associated contact", error.message);
    const errorMessage =
      error.response?.data?.message || "Unknown error on Hubspot.";

    console.error(errorMessage);

    throw new Error(errorMessage);
  }
}

async function getContactInfosBy(id) {
  try {
    const headers = {
      Authorization: `Bearer ${hubspotToken}`,
    };

    const params = {
      properties: "firstname,lastname,cpf,phone,email",
    };

    const url = `${baseUrl}/crm/v3/objects/contacts/${id}`;

    const response = await axios({ url, method: "GET", params, headers });

    return response.data;
  } catch (error) {
    console.error("Error getting contact infos", error.message);
    const errorMessage =
      error.response?.data?.message || "Unknown error on Hubspot.";

    console.error(errorMessage);

    throw new Error(errorMessage);
  }
}

exports.main = async (event, callback) => {
  try {
    const { objectId } = event.object;

    const associations = await getAssociatedContactsBy(objectId);
    console.log("associations", associations);

    if (associations.results.length === 0) {
      throw new Error("No associated contacts.");
    }

    const contactId = associations.results[0].toObjectId;
    const contactInformations = await getContactInfosBy(contactId);
    console.log("contactInformations", contactInformations);
    const { properties } = contactInformations;

    return await callback({
      outputFields: {
        hs_execution_state: "SUCCESS",
        contactEmail: properties.email,
        contactFirstName: properties.firstname,
        contactLastName: properties.lastname || "",
        contactCpf: properties.cpf,
        contactPhone: properties.phone,
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
      objectId: "16222219567",
    },
  },
  console.log
);
