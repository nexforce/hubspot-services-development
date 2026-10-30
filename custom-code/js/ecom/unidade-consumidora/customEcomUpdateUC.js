const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// When sending to the custom code workflow, copy from this line to the comment [FINAL]
const axios = require("axios");
const customObjectId = "2-28064547";

async function updateUCBy(id, data) {
  try {
    const hsToken = process.env.UNIDADE_CONSUMIDORA_TOKEN;

    const url = `https://api.hubapi.com/crm/v3/objects/${customObjectId}/${id}`;

    const headers = {
      Authorization: `Bearer ${hsToken}`,
    };

    const uc = await axios({ url, method: "PATCH", headers, data });

    return uc.data;
  } catch (error) {
    console.error("Error updating UC", error.message);
    const errorMessage =
      error.response?.data?.message || "Unknown error on Hubspot.";

    console.error(errorMessage);

    throw new Error(errorMessage);
  }
}

exports.main = async (event, callback) => {
  try {
    const { objectId } = event.object;
    const { distributorName, concessionaireCode, codCce, thundersId } =
      event.inputFields;

    console.log("Distributor name: ", distributorName);
    console.log("Concessionaire code: ", concessionaireCode);
    console.log("Cod CCE: ", codCce);
    console.log("Thunders ID: ", thundersId);

    const dataForUpdate = {
      properties: {
        distribuidora_da_unidade: distributorName,
        codigo_da_concessionaria: codCce,
        thunders_id_da_distribuidora: thundersId,
      },
    };

    console.log("Updating UC...");
    await updateUCBy(objectId, dataForUpdate);
    console.log("UC updated successfully.");

    return await callback({
      outputFields: {
        hs_execution_state: "SUCCESS",
        hs_object_id: event.object.objectId,
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

// [FINAL]

exports.main(
  {
    inputFields: {
      distributorName: "AMAZONAS",
      concessionaireCode: 2,
    },
    object: { objectId: 27592678952 },
  },
  console.log
);
