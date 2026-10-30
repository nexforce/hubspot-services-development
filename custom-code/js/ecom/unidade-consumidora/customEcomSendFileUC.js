const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
const axios = require("axios");
const fs = require("fs").promises;
const { createReadStream } = require("fs");
const os = require("os");
const path = require("path");

async function getPdfOnHS(id) {
  try {
    const hsToken = process.env.UNIDADE_CONSUMIDORA_TOKEN;

    const headers = {
      Authorization: `Bearer ${hsToken}`,
    };

    const {
      data: { url, extension },
    } = await axios({
      url: `https://api.hubapi.com/files/v3/files/${id}/signed-url`,
      method: "GET",
      headers,
    });

    const pdf = await axios({
      url,
      method: "GET",
      headers,
      responseType: "arraybuffer",
    });

    return { data: pdf.data, extension };
  } catch (error) {
    console.error("Error getting file.", error.message);
    const errorMessage =
      error.response?.data?.message || "Unknown error on Hubspot.";

    console.error(errorMessage);

    throw new Error(errorMessage);
  }
}

async function getDocumentInformations(data) {
  try {
    const url =
      "https://qyxzg784z9.execute-api.us-east-1.amazonaws.com/prd/v2/energy-account/parse/";

    const token = process.env.IA_ECOM_EXTRACTOR_TOKEN;

    const headers = {
      authorization: `${token}`,
      "Content-Type": "multipart/form-data",
    };

    const docInformations = await axios({ url, method: "POST", headers, data });

    return docInformations.data;
  } catch (error) {
    console.log("Error getting document informations.");
    throw error;
  }
}

exports.main = async (event, callback) => {
  try {
    const { objectId } = event.object;
    if (!event.inputFields.fatura) {
      console.log("No document to send.");
      return await callback({
        outputFields: { hs_execution_state: "FAIL_CONTINUE" },
      });
    }

    const { data: file, extension } = await getPdfOnHS(
      event.inputFields.fatura
    );
    console.log(extension);

    let tmpDir;
    const appPrefix = "IA-ECOM-hs";

    try {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), appPrefix));
      console.log(tmpDir);

      await fs.writeFile(`${tmpDir}/${objectId}.${extension}`, file);

      const data = {
        file_field: createReadStream(`${tmpDir}/${objectId}.${extension}`),
        file_name: `${objectId}.${extension}`,
        start_workflow: "true",
        webhook_url:
          "https://webhook.site/a9d4996c-0a7f-40ca-ae5b-f41e77c65098",
      };

      const documentInformation = await getDocumentInformations(data);

      console.log(documentInformation);

      return await callback({
        outputFields: {
          transactionId: documentInformation.transaction_id,
          functionId: documentInformation.step_function_execution_arn,
        },
      });
    } catch (error) {
      console.log(error);
      return await callback({
        outputFields: { hs_execution_state: "FAIL_CONTINUE" },
      });
    } finally {
      try {
        if (tmpDir) {
          fs.rm(tmpDir, { recursive: true });
        }
      } catch (e) {
        console.error(
          `An error has occurred while removing the temp folder at ${tmpDir}. Please remove it manually. Error: ${e}`
        );
      }
    }
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
      fatura: 189514375351,
    },
    object: { objectId: 12887363680 },
  },
  console.log
);
