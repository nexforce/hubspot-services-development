const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
const axios = require("axios");

async function sendAnalysisCnpj(data) {
  try {
    const params = {
      product: "express_light",
    };

    const url = `https://express-api.risk3.net.br/api/v0/analises`;

    const headers = {
      ["Venidera-AuthToken"]: data.token,
    };

    const body = {
      cnpjs: [data.document],
      rule: {
        ids: "risk3_multi_reguas_05352237000155_light_03",
        type: "Risk3_multi_reguas",
      },
      analysis_cache: 30,
    };

    const response = await axios({
      url,
      method: "POST",
      headers,
      data: body,
      timeout: 16000,
      params,
    });

    return response.data;
  } catch (error) {
    console.log("Error sending analysis:", error.message);

    // avoid retry code if err status code = 500
    if (error.response.status == 500) {
      error.statusCode = 400;
      error.response.status = 400;
    }

    throw error;
  }
}

async function sendAnalysisCpf(data) {
  try {
    const url = `https://express-api.risk3.net.br/api/v0/analises/cpf`;

    const headers = {
      ["Venidera-AuthToken"]: data.token,
    };

    const body = {
      cpfs: [data.document],
    };

    const response = await axios({
      url,
      method: "POST",
      headers,
      data: body,
      timeout: 16000,
    });

    return response.data;
  } catch (error) {
    console.log("Error sending analysis:", error.message);

    // avoid retry code if err status code = 500
    if (error.response.status == 500) {
      error.statusCode = 400;
      error.response.status = 400;
    }

    throw error;
  }
}

exports.main = async (event, callback) => {
  try {
    const { tipo_documento, risk3_token, cnpj } = event.inputFields;

    const dataTosend = {
      document: cnpj,
      token: risk3_token,
    };

    const analysisResponse =
      tipo_documento === "CNPJ"
        ? await sendAnalysisCnpj(dataTosend)
        : await sendAnalysisCpf(dataTosend);

    const analysisId = analysisResponse.data.records[0].id;

    return await callback({
      outputFields: {
        hs_execution_state: "SUCCESS",
        hs_object_id: event.object.objectId,
        analysisId,
        recomendacao_final: null,
        produto_risk3:
          tipo_documento === "CNPJ" ? "express_light" : "express_pf",
      },
    });
  } catch (err) {
    // Force retry if error is on cloudflare's side. (https://developers.hubspot.com/docs/api/error-handling#custom-code-workflow-actions)
    if (axios.isAxiosError(err) && JSON.stringify(err).includes("cloudflare")) {
      err.response.status = 500;
      throw err;
    }

    const erro_do_cnpj_risk3 =
      err.response?.data?.detail?.map((d) => d.msg).join("; ") || err.message;

    console.log("Error details:", erro_do_cnpj_risk3);

    return await callback({
      outputFields: { hs_execution_state: "FAIL_CONTINUE", erro_do_cnpj_risk3 },
    });
  }
};

// [FINAL]

exports.main(
  {
    inputFields: {
      tipo_documento: "CNPJ",
      cnpj: "44.733.049/0001-29",
      risk3_token:
        "XhOudx8INXEkzIkOTGnyJo+G37bCVKUr0KPAMzmb2sikXz+1MWoq8jiqOmLwLpskru96pP0uzybsA7fLFipgZ+jtgatFPfVYbAMO/n/4klEDynagYzEAFIEez9elJGNHrupIhHc3N60XeCUtMj78efjuvXKz49CpuuSEytUrIi7oKBQ0O0UrMq8PNU6RCy0N0IDHVhhbmaDatA0vuHlGbfuu6VO1PAr+5y/yqoWeHckyP6jomIT/UvHToIS1HXdYchniOyxzEiJ4khnFL255QrzDl5lj60P5XfoQ83nDkuPyqUKbI7YKs4Ga3Uldl14BZq2UHs1XFsbWqpQQjrscGQNGvimKbnn+obmyAxzewEHk66xD1/46QFzYiaSSyH3TnzGZWjju4eysmIrUwvrMHppxv9psXwEkdV+dnTxY04Nl/IKHssqn5LmqDdETI6j44UkiGl/vK/3BBh3E+KlGPypzJf79knNeLgQq3f9oN7JifML1owQpn1X7RBRt32iynwhxzM6G2TKvaZyreI2kbjXyf0BtIYJRmVTo7YedEQm3W8cnQAKCL4MzCBMBThVlWR1v/VCZty9phpaFiw8gTMRDOOLimXUkD6ed/mzQIi9YJ8T3zdhR2H6zBMcuSW4Jn2KSYIDbGTVWRwNOShbgSiNK7BcFy2v/a5BgkBNegfGY6QU2QGDMsTV1/nEAZvvQASf9TpHL5+4NPMMesLWZ5o8grQVGB25DonvKAnLksR0=",
    },
    object: { objectId: 12887363680 },
  },
  console.log,
);
