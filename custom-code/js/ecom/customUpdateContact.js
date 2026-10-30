const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
const axios = require("axios");

const hubspotToken = process.env.JORNADA_ONLINE_TOKEN;

async function updateContactBy(id, data) {
  try {
    const url = `https://api.hubapi.com/crm/v3/objects/contacts/${id}`;

    const headers = {
      Authorization: `Bearer ${hubspotToken}`,
    };

    const response = await axios({ url, method: "PATCH", headers, data });

    return response.data;
  } catch (error) {
    console.error("Error updating Contact: ", error.message);

    const errorMessage =
      error.response?.data?.message || "Unknown error on Hubspot.";

    console.error(errorMessage);

    throw new Error(errorMessage);
  }
}

exports.main = async (event, callback) => {
  try {
    const { contactId } = event.inputFields;

    const updatedContact = await updateContactBy(contactId, {
      // adicionar propriedades que deseja modificar
      properties: {},
    });

    console.log(`Contact with id:${updatedContact.id} updated successfully!`);
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
    inputFields: { contactId: "" },
    object: {},
  },
  console.log
);
