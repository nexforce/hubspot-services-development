const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
const axios = require("axios");

async function loginOnRisk3() {
  try {
    const user = process.env.RISK_USER;
    const password = process.env.RISK_PASSWORD;

    const url = `https://express-api.risk3.net.br/api/v0/login?username=${user}&password=${password}`;

    const response = await axios({ url, method: "POST" });

    return response.data;
  } catch (error) {
    console.log("Error loggin on Risk3:", error.message);
    throw error;
  }
}

exports.main = async (event, callback) => {
  try {
    const {
      data: { token },
    } = await loginOnRisk3();

    return await callback({
      outputFields: {
        hs_execution_state: "SUCCESS",
        risk3_token: token,
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
      cnpj: "13873870657",
    },
    object: { objectId: 12887363680 },
  },
  console.log
);
