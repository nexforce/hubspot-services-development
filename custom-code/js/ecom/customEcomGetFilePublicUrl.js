const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
const axios = require("axios");

async function getPdfOnHS(id) {
  try {
    const hsToken = process.env.UNIDADE_CONSUMIDORA_TOKEN;

    const headers = {
      Authorization: `Bearer ${hsToken}`,
    };

    const response = await axios({
      url: `https://api.hubapi.com/files/v3/files/${id}/signed-url`,
      method: "GET",
      headers,
    });

    return response.data.url;
  } catch (error) {
    console.error("Error getting File", error.message);
    const errorMessage =
      error.response?.data?.message || "Unknown error on Hubspot.";

    console.error(errorMessage);

    throw new Error(errorMessage);
  }
}

exports.main = async (event, callback) => {
  try {
    if (!event.inputFields.modelo_de_carta_denuncia) {
      console.log("No document to get.");
      return await callback({
        outputFields: { hs_execution_state: "FAIL_CONTINUE" },
      });
    }

    const signedUrl = await getPdfOnHS(
      event.inputFields.modelo_de_carta_denuncia
    );

    return await callback({
      outputFields: { signedUrl },
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
      modelo_de_carta_denuncia: 166800232995,
    },
    object: { objectId: 12887363680 },
  },
  console.log
);
