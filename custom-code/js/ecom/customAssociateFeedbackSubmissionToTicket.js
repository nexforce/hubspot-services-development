const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
const axios = require("axios");

const HUBSPOT_API_BASE = "https://api.hubapi.com";

async function searchLatestTicketByContact(contactId, headers) {
  try {
    const url = `${HUBSPOT_API_BASE}/crm/v3/objects/tickets/search`;

    const body = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "associations.contact",
              operator: "EQ",
              value: contactId,
            },
            {
              propertyName: "hs_pipeline_stage",
              operator: "IN",
              values: ["152722289"], // Encerrado
            },
          ],
        },
      ],
      properties: [],
      sorts: [
        {
          propertyName: "hs_lastmodifieddate",
          direction: "DESCENDING",
        },
      ],
    };

    const response = await axios.post(url, body, { headers });

    return response.data;
  } catch (error) {
    console.error("Error associating search result to ticket:", error.message);
    const errorMessage =
      error.response?.data?.message || "Unknown error on Hubspot.";

    console.error(errorMessage);

    throw new Error(errorMessage);
  }
}

async function associateFeedbackToTicket(
  feedbackSubmissionId,
  ticketId,
  headers,
) {
  try {
    const url = `${HUBSPOT_API_BASE}/crm/v4/objects/ticket/${ticketId}/associations/feedback_submissions/${feedbackSubmissionId}`;

    const body = [
      {
        associationCategory: "HUBSPOT_DEFINED",
        associationTypeId: 99,
      },
    ];
    const response = await axios.put(url, body, { headers });

    return response.data;
  } catch (error) {
    console.error("Error associating Feedback to Ticket:", error.message);
    const errorMessage =
      error.response?.data?.message || "Unknown error on Hubspot.";

    console.error(errorMessage);

    throw new Error(errorMessage);
  }
}

exports.main = async (event, callback) => {
  const token = process.env.HUBSPOT_FEEDBACK_SUBMISSION_TO_TICKET_TOKEN;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const contactId = event.inputFields.hs_contact_id;
  const feedbackSubmissionId = event.object.objectId;

  console.log(
    `[START] Associação Feedback→Ticket | Contact: ${contactId} | Feedback Submission: ${feedbackSubmissionId}`,
  );

  try {
    if (!contactId) {
      console.error("[ERROR] hs_contact_id não informado. Encerrando.");
      return callback({
        outputFields: { error: true },
      });
    }

    const searchResult = await searchLatestTicketByContact(contactId, headers);

    if (!searchResult.total || !searchResult.results.length) {
      console.warn(
        `[WARN] Nenhum Ticket encontrado para o Contato ${contactId}. Encerrando...`,
      );
      return callback({
        outputFields: { error: true },
      });
    }

    const ticket = searchResult.results[0];
    console.log(
      `[INFO] Ticket localizado: ${ticket.id} (criado em ${ticket.properties.createdate})`,
    );

    await associateFeedbackToTicket(feedbackSubmissionId, ticket.id, headers);

    console.log(
      `[SUCCESS] Feedback Submission ${feedbackSubmissionId} associado ao Ticket ${ticket.id}`,
    );

    return callback({
      outputFields: {
        error: false,
      },
    });
  } catch (err) {
    console.error("[ERROR]", err.message);
    const errorMessage =
      err.response?.data?.message || "Unknown error on HubSpot.";
    console.error("[ERROR DETAIL]", errorMessage);

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
      hs_contact_id: "200669282155",
    },
    object: { objectId: "530656622888" },
  },
  console.log,
);
