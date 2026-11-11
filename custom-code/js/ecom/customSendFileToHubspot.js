const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
const axios = require("axios");
const fs = require("fs").promises;
const { createReadStream } = require("fs");
const os = require("os");
const path = require("path");

const hubspotToken = process.env.PARCEIRO_TOKEN;
const folderId = 185139031344;

async function getDocumentFile(url) {
  try {
    const response = await axios({
      method: "GET",
      url,
      responseType: "arraybuffer",
    });

    return response.data;
  } catch (error) {
    console.error(`Error getting file: ${error.message}`);

    throw new Error(error.message);
  }
}

async function sendFileToHubspot(data) {
  try {
    const url = `https://api.hubapi.com/files/v3/files`;

    const headers = {
      Authorization: `Bearer ${hubspotToken}`,
      "Content-Type": "multipart/form-data",
    };

    const response = await axios({ url, method: "POST", headers, data });

    return response.data;
  } catch (error) {
    console.error("Error sending document do Hubspot: ", error.message);

    const errorMessage =
      error.response?.data?.message || "Unknown error on Hubspot.";

    console.error(errorMessage);

    throw new Error(errorMessage);
  }
}

exports.main = async (event, callback) => {
  try {
    const { signedfileurl } = event.inputFields;

    if (!signedfileurl) {
      console.log("No signed file on webhook event.");
      return await callback({
        outputFields: {
          fileId: null,
          hasSignedFileUrl: false,
        },
      });
    }

    const { objectId } = event.object;

    const document = await getDocumentFile(signedfileurl);

    const appPrefix = "signed-file";
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), appPrefix));

    const documentPath = `${tmpDir}/${objectId}-signed.pdf`;
    await fs.writeFile(documentPath, document);

    const data = {
      file: createReadStream(documentPath),
      folderId,
      options: JSON.stringify({ access: "PUBLIC_NOT_INDEXABLE" }),
    };

    const file = await sendFileToHubspot(data);

    await fs.rm(documentPath);
    await fs.rmdir(tmpDir);

    return await callback({
      outputFields: {
        fileId: file.id,
        hasSignedFileUrl: true,
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
      signedfileurl:
        "https://zapsign.s3.amazonaws.com/2024/3/pdf/5e4e14e4-3b4f-4a2c-95a1-002a2095a860/98c70f6e-a466-49af-b029-454550b6ee18.pdf?AWSAccessKeyId=AKIASUFZJ7JCTI2ZRGWX&Signature=Lo7uAmbpmFsOodfo%2B9ceVatJGm8%3D&Expires=1737380376",
    },
    object: { objectId: 1233221122 },
  },
  console.log
);
