const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
const axios = require("axios");

const hubspotToken = process.env.MEETING_ASSOCIATION_TOKEN;
const baseUrl = "https://api.hubapi.com";
const LEAD_OBJECT_TYPE_ID = "2-20848482";

async function associateLeadWithMeetingBy(leadId, meetingId) {
  const headers = {
    Authorization: `Bearer ${hubspotToken}`,
    "Content-Type": "application/json",
  };

  const body = [
    {
      associationCategory: "USER_DEFINED",
      associationTypeId: 5,
    },
  ];

  const url = `${baseUrl}/crm/v4/objects/${LEAD_OBJECT_TYPE_ID}/${leadId}/associations/meetings/${meetingId}`;
  try {
    const response = await axios({ url, method: "PUT", headers, data: body });

    return response.data;
  } catch (error) {
    console.error("Error associating lead with meeting:", error.message);
    const errorMessage =
      error.response?.data?.message || "Unknown error on Hubspot.";

    console.error(errorMessage);
    throw new Error(errorMessage);
  }
}

exports.main = async (event, callback) => {
  const { leadId, meetingId } = event.inputFields;
  try {
    const association = await associateLeadWithMeetingBy(leadId, meetingId);
    console.log(association);

    const { fromObjectId, toObjectId } = association;

    console.log(
      `Associação entre o lead ${fromObjectId} e meeting ${toObjectId} foi um sucesso.`
    );

    return await callback({
      outputFields: {},
    });
  } catch (err) {
    console.error(err);

    if (axios.isAxiosError(err) && JSON.stringify(err).includes("cloudflare"))
      err.response.status = 500;

    throw err;
  }
};

// [FINAL]

exports.main(
  {
    inputFields: {
      leadId: 20298165012,
      meetingId: 68418612627,
    },
    object: {
      objectId: "78846578226",
    },
  },
  console.log
);
