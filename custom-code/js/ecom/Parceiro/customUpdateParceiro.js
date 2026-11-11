const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
const axios = require("axios");

const hubspotToken = process.env.PARCEIRO_TOKEN;
const parceiroObjectId = "2-28103807";

async function updateParceiroBy(id, data) {
  try {
    const url = `https://api.hubapi.com/crm/v3/objects/${parceiroObjectId}/${id}`;

    const headers = {
      Authorization: `Bearer ${hubspotToken}`,
    };

    const response = await axios({ url, method: "PATCH", headers, data });

    return response.data;
  } catch (error) {
    console.error("Error updating Parceiro: ", error.message);

    const errorMessage =
      error.response?.data?.message || "Unknown error on Hubspot.";

    console.error(errorMessage);

    throw new Error(errorMessage);
  }
}

exports.main = async (event, callback) => {
  try {
    const { fileId } = event.inputFields;
    const { objectId } = event.object;

    const updatedParceiro = await updateParceiroBy(objectId, {
      properties: {
        contrato_assinado: fileId,
      },
    });

    return await callback({
      outputFields: {
        parceiroId: updatedParceiro.id,
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
    inputFields: { fileId: "" },
    object: { objectId: 16222219567 },
  },
  console.log
);
