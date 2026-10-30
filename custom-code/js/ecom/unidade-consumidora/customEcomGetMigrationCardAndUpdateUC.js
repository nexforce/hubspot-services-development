const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
const axios = require("axios");

const customObjectId = "2-28158895";

async function getMigrationCard(id, token) {
  try {
    const url = `https://api.thunders.com.br/bpmn/v1/cards/${id}`;
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    const response = await axios({ method: "GET", url, headers });

    return response.data;
  } catch (error) {
    console.error("Error getting migration card.", error.message);
    const errorMessage =
      error.response?.data?.message || "Unkown error on thunders.";

    console.error(errorMessage);

    throw new Error(errorMessage);
  }
}

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
      error.response?.data?.message || "Unkown error on Hubspot.";

    console.error(errorMessage);

    throw new Error(errorMessage);
  }
}

function ucPropertiesMapper(migrationCard) {
  return {
    properties: {
      status_da_migracao_thunders: migrationCard.currentStage.name,
      status_da_migracao: findFieldByName(migrationCard.fields, "Status"),
      valor_dhc: findFieldByName(migrationCard.fields, "Valor DHC"),
      valor_m_usd: findFieldByName(migrationCard.fields, "Valor MUSD"),
      pagamento_de_multa: findFieldByName(
        migrationCard.fields,
        "Pagamento Multa"
      ),
      comentario_da_migracao: findFieldByName(
        migrationCard.fields,
        "Justificativa"
      ),
      data_da_validacao_concessionaria: findFieldByName(
        migrationCard.fields,
        "Data Validacao"
      ),
      codigoagenteconcessionariaunidadeconsumidora: findFieldByName(
        migrationCard.fields,
        "Codigo agente concessionaria UC"
      ),
      thunders_codigo_do_card_migracao: migrationCard.code,
      data_da_ultima_consulta_de_status_da_migracao: new Date().toISOString(),
      id_migracao_simplificada: findFieldByName(
        migrationCard.fields,
        "Id da Solicitação"
      ),
    },
  };
}

function findFieldByName(fields, name) {
  return fields.find((field) => field.name === name)?.value;
}

exports.main = async (event, callback) => {
  try {
    const { token, id_migracao } = event.inputFields;

    const migrationCard = await getMigrationCard(id_migracao, token);
    console.log("Migration Card:", migrationCard);

    if (!migrationCard) {
      throw new Error("Migration card not found.");
    }

    const payloadToUpdateUC = ucPropertiesMapper(migrationCard);
    console.log("Payload to update UC:", payloadToUpdateUC);

    //await updateUCBy(event.object.objectId, payloadToUpdateUC);
    console.log("UC updated successfully.");

    return await callback({
      outputFields: {},
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
    inputFields: {
      token:
        "eyJhbGciOiJSUzI1NiIsImtpZCI6IjY1NzQyNTVBRjlDNkNBM0ExRjgzM0ZFQ0E5NkI2QzlDIiwidHlwIjoiYXQrand0In0.eyJuYmYiOjE3NjEwNDY5OTAsImV4cCI6MTc2MTA1Nzc5MCwiaXNzIjoiaHR0cHM6Ly9hdXRoLnRodW5kZXJzLmNvbS5iciIsImF1ZCI6WyJhcGkiLCJUaHVuZGVycyIsIlRodW5kZXJzLkFjck9wZXJhdGlvbnMiLCJUaHVuZGVycy5BY3JPcGVyYXRpb25zLkNCUiIsIlRodW5kZXJzLkFjck9wZXJhdGlvbnMuRW5lcmd5QmFsYW5jZSIsIlRodW5kZXJzLkFDck9wZXJhdGlvbnNDQlIiLCJUaHVuZGVycy5BZGRpdGlvbmFsRW50cnkiLCJUaHVuZGVycy5BcGlHYXRld2F5IiwiVGh1bmRlcnMuQmFja09mZmljZUFjbCIsIlRodW5kZXJzLkJiY2UiLCJUaHVuZGVycy5CSSIsIlRodW5kZXJzLkNhbGN1bGF0aW9uUHJlbWlzZXMiLCJUaHVuZGVycy5DYWxjdWxhdG9yIiwiVGh1bmRlcnMuQ29tbXVuaWNhdGlvbnMiLCJUaHVuZGVycy5DUk0iLCJUaHVuZGVycy5DdXN0b21lckludm9pY2UiLCJUaHVuZGVycy5DdXN0b21lckludm9pY2VTZXJ2aWNlIiwiVGh1bmRlcnMuRGlzdHJpYnV0aW9uIiwiVGh1bmRlcnMuRGlzdHJpYnV0aW9uLkFjci5DY2VhcmMiLCJUaHVuZGVycy5EaXN0cmlidXRpb24uQWNyLkNjZWFyZCIsIlRodW5kZXJzLkRpc3RyaWJ1dGlvbi5BY3IuUXVvdGEiLCJUaHVuZGVycy5FbmVyZ3lQZW5hbHRpZXMiLCJUaHVuZGVycy5Gb3VyRXllcyIsIlRodW5kZXJzLkdlbmVyYXRpb24uUGh5c0d1YXJhbnRlZSIsIlRodW5kZXJzLkd1YXJhbnRlZSIsIlRodW5kZXJzLkd1YXJhbnRlZWRTYXZpbmdzIiwiVGh1bmRlcnMuSWRlbnRpdHlTZXJ2ZXIiLCJUaHVuZGVycy5JbnRlZ3JhdGlvbiIsIlRodW5kZXJzLkludGVncmF0aW9uSGFuZGxlciIsIlRodW5kZXJzLkludGVncmF0aW9ucy5DY2VlIiwiVGh1bmRlcnMuSW50ZWdyYXRpb25zLkNjZWUuSW1wb3J0cyIsIlRodW5kZXJzLkludGVncmF0aW9ucy5Gb2N1cy5FbmR1c2VyIiwiVGh1bmRlcnMuSW50ZWdyYXRpb25zLldheTIiLCJUaHVuZGVycy5MZWdhbCIsIlRodW5kZXJzLk1hcmtldEluZm8iLCJUaHVuZGVycy5NZWFzdXJlbWVudCIsIlRodW5kZXJzLk1SRSIsIlRodW5kZXJzLk9wZXJhdGlvbnMiLCJUaHVuZGVycy5Qb3J0Zm9saW8iLCJUaHVuZGVycy5Qb3N0bWFuIiwiVGh1bmRlcnMuUG9zdG1hbi5FbWFpbENvbW11bmljYXRpb25zIiwiVGh1bmRlcnMuUHJvcG9zYWxzIiwiVGh1bmRlcnMuUmlza0VuZ2luZSIsIlRodW5kZXJzLlNjZW5hcmlvcyIsIlRodW5kZXJzLlNlYXNvbmFsaXR5IiwiVGh1bmRlcnMuU2VydmljZVJlcG9ydHMiLCJUaHVuZGVycy5TZXJ2aWNlcy5TaW11bGF0aW9uIiwiVGh1bmRlcnMuU2VydmljZXNCb29rIiwiVGh1bmRlcnMuU2VydmljZXNDYWxjdWxhdG9yIiwiVGh1bmRlcnMuU25hcHNob3QiLCJUaHVuZGVycy5TdXJ2ZXkiLCJUaHVuZGVycy5TeXN0ZW1NYW5hZ2VtZW50IiwiVGh1bmRlcnMuVHVzZCJdLCJjbGllbnRfaWQiOiJlY29tX2JwbW4iLCJ0aHVuZGVycy10ZW5hbnRpZCI6IjQ2MGY3MGQ4LTI1OTktNDEwMC05ZmI5LTkxZTQ1NDJmOTRmZCIsImlhdCI6MTc2MTA0Njk5MCwic2NvcGUiOlsiYXBpIiwiVGh1bmRlcnMiLCJUaHVuZGVycy5BY3JPcGVyYXRpb25zIiwiVGh1bmRlcnMuQWNyT3BlcmF0aW9ucy5DQlIiLCJUaHVuZGVycy5BY3JPcGVyYXRpb25zLkVuZXJneUJhbGFuY2UiLCJUaHVuZGVycy5BQ3JPcGVyYXRpb25zQ0JSIiwiVGh1bmRlcnMuQWRkaXRpb25hbEVudHJ5IiwiVGh1bmRlcnMuQXBpR2F0ZXdheSIsIlRodW5kZXJzLkJhY2tPZmZpY2VBY2wiLCJUaHVuZGVycy5CYmNlIiwiVGh1bmRlcnMuQkkiLCJUaHVuZGVycy5DYWxjdWxhdGlvblByZW1pc2VzIiwiVGh1bmRlcnMuQ2FsY3VsYXRvciIsIlRodW5kZXJzLkNvbW11bmljYXRpb25zIiwiVGh1bmRlcnMuQ1JNIiwiVGh1bmRlcnMuQ3VzdG9tZXJJbnZvaWNlIiwiVGh1bmRlcnMuQ3VzdG9tZXJJbnZvaWNlU2VydmljZSIsIlRodW5kZXJzLkRpc3RyaWJ1dGlvbiIsIlRodW5kZXJzLkRpc3RyaWJ1dGlvbi5BY3IuQ2NlYXJjIiwiVGh1bmRlcnMuRGlzdHJpYnV0aW9uLkFjci5DY2VhcmQiLCJUaHVuZGVycy5EaXN0cmlidXRpb24uQWNyLlF1b3RhIiwiVGh1bmRlcnMuRW5lcmd5UGVuYWx0aWVzIiwiVGh1bmRlcnMuRm91ckV5ZXMiLCJUaHVuZGVycy5HZW5lcmF0aW9uLlBoeXNHdWFyYW50ZWUiLCJUaHVuZGVycy5HdWFyYW50ZWUiLCJUaHVuZGVycy5HdWFyYW50ZWVkU2F2aW5ncyIsIlRodW5kZXJzLklkZW50aXR5U2VydmVyIiwiVGh1bmRlcnMuSW50ZWdyYXRpb24iLCJUaHVuZGVycy5JbnRlZ3JhdGlvbkhhbmRsZXIiLCJUaHVuZGVycy5JbnRlZ3JhdGlvbnMuQ2NlZSIsIlRodW5kZXJzLkludGVncmF0aW9ucy5DY2VlLkltcG9ydHMiLCJUaHVuZGVycy5JbnRlZ3JhdGlvbnMuRm9jdXMuRW5kdXNlciIsIlRodW5kZXJzLkludGVncmF0aW9ucy5XYXkyIiwiVGh1bmRlcnMuTGVnYWwiLCJUaHVuZGVycy5NYXJrZXRJbmZvIiwiVGh1bmRlcnMuTWVhc3VyZW1lbnQiLCJUaHVuZGVycy5NUkUiLCJUaHVuZGVycy5PcGVyYXRpb25zIiwiVGh1bmRlcnMuUG9ydGZvbGlvIiwiVGh1bmRlcnMuUG9zdG1hbiIsIlRodW5kZXJzLlBvc3RtYW4uRW1haWxDb21tdW5pY2F0aW9ucyIsIlRodW5kZXJzLlByb3Bvc2FscyIsIlRodW5kZXJzLlJpc2tFbmdpbmUiLCJUaHVuZGVycy5TY2VuYXJpb3MiLCJUaHVuZGVycy5TZWFzb25hbGl0eSIsIlRodW5kZXJzLlNlcnZpY2VSZXBvcnRzIiwiVGh1bmRlcnMuU2VydmljZXMuU2ltdWxhdGlvbiIsIlRodW5kZXJzLlNlcnZpY2VzQm9vayIsIlRodW5kZXJzLlNlcnZpY2VzQ2FsY3VsYXRvciIsIlRodW5kZXJzLlNuYXBzaG90IiwiVGh1bmRlcnMuU3VydmV5IiwiVGh1bmRlcnMuU3lzdGVtTWFuYWdlbWVudCIsIlRodW5kZXJzLlR1c2QiXX0.ZBjpmA_Vv9GcdwCWFLGYxx3AC71efTepmYIi9Y2AbrwastedPw1GNMJYyUsnlNUsJgooSRLEq4_K-CBfKz8syl8LimDOi_OnCWUHsv1f9O0UOalqV2S-sUAiKLmDCGTTBWqEH3ru2RFU9gWLGAmtKkxqCgchrihYC1oNc2tLPDjyxUwB4bVrZrAWaW3tll4rr2Zwk5qFzfg365AOwCUJO1KNuswAY0xCy1PqoZPeVa7qRD4NKRfsJAnTypeUss94LkbWqRN8Ig4Q80GLliniqfb-M-mQ4yvcNb6pREKuuCX8CNhFUQ923gYQJU-XPZBtIrjGKDx22JCFrGWbFRyHwg",
      id_migracao: "41c98639-1037-4949-be6c-1715fe89ee41",
    },
    object: { objectId: "27592678952" },
  },
  console.log
);
