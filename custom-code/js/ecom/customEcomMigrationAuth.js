const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
const axios = require("axios");

const clientId = process.env.MIGRATION_ECOM_CLIENT_ID || "";
const clientSecret = process.env.MIGRATION_ECOM_CLIENT_SECRET || "";

async function auth() {
  try {
    const url = "https://auth.qa.thunders.com.br/connect/token";

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
    params.append("grant_type", "client_credentials");

    const response = await axios.post(url, params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    return response.data.access_token;
  } catch (error) {
    console.error("Error trying to authenticate", error.response);
    const errorMessage = error.response.message || "Unknown error on CCEE.";

    console.error(errorMessage);

    throw new Error(errorMessage);
  }
}

exports.main = async (event, callback) => {
  try {
    const response = await auth(event.object.objectId);

    const token = response;
    return await callback({
      outputFields: {
        token,
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
    inputFields: {},
    object: { objectId: "" },
  },
  console.log
);
