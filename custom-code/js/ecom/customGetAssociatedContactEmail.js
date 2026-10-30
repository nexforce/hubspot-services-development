const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
const axios = require("axios");

const hubspotToken = process.env.UNIDADE_CONSUMIDORA_TOKEN;
const baseUrl = "https://api.hubapi.com";
const customObjectTypeId = "2-28064547";

async function getAssociatedDealBy(id) {
  try {
    const headers = {
      Authorization: `Bearer ${hubspotToken}`,
    };

    const url = `${baseUrl}/crm/v4/objects/${customObjectTypeId}/${id}/associations/deals`;

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

async function getAssociatedContactBy(id) {
  try {
    const headers = {
      Authorization: `Bearer ${hubspotToken}`,
    };

    const url = `${baseUrl}/crm/v4/objects/deals/${id}/associations/contacts`;

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
      properties: "email",
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

    const associationWithUc = await getAssociatedDealBy(objectId);

    if (associationWithUc.results.length === 0) {
      throw new Error("No associated deals.");
    }

    const dealId = associationWithUc.results[0].toObjectId;
    const associationWithDeal = await getAssociatedContactBy(dealId);

    if (associationWithDeal.results.length === 0) {
      throw new Error("No associated Contacts.");
    }

    const migrationContact = associationWithDeal.results.find((result) =>
      result.associationTypes.some((type) => type.label === "Migração")
    );

    if (!migrationContact) {
      throw new Error("No associated contact with type 'Migração'.");
    }

    console.log("Contact: ", migrationContact);

    const contactId = migrationContact.toObjectId;

    const contactInformations = await getContactInfosBy(contactId);
    console.log("Contact informations: ", contactInformations);

    const { properties } = contactInformations;

    return await callback({
      outputFields: {
        hs_execution_state: "SUCCESS",
        contactEmail: properties.email,
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
      objectId: "13319947109",
    },
  },
  console.log
);
