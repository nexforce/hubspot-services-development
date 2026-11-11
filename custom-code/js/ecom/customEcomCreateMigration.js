const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
const axios = require("axios");

async function createMigration(data, token) {
  try {
    const url = "https://api.qa.thunders.com.br/bpmn/v1/cards";

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    const response = await axios({ method: "POST", url, data, headers });

    return response.data;
  } catch (error) {
    console.error("Error on create migration: ", error.message);
    console.log(error.response.data);
    const errorMessage = error.response?.data?.title || "";

    console.error(errorMessage);

    throw new Error(errorMessage);
  }
}

function payloadMapper(inputFields) {
  return {
    cardFields: [
      {
        fieldId: "76c77c66-91fc-4015-86d5-a91d000243c8",
        selectValue: inputFields.codigo_ecom_varejista,
      },
      {
        fieldId: "55872464-9f75-4fec-bcfc-f582fc338479",
        textValue: inputFields.codigo_uc,
      },
      {
        fieldId: "3b38f5e3-bc75-4889-875f-62e4c059ae69",
        textValue: inputFields.pseudonimo,
      },
      {
        fieldId: "343f62ca-c2c0-4f88-b1c7-314734097417",
        numericValue: inputFields.codigo_do_perfil_de_energia,
      },
      {
        fieldId: "9ca6739a-c3af-4770-8c7d-46502c09e569",
        selectValue: inputFields.codigo_da_concessionaria,
      },
      {
        fieldId: "87856760-3b8a-487d-ba50-f0979743c72c",
        selectValue: inputFields.tipo_documento,
      },
      {
        fieldId: "b5d44191-2bd0-444f-a6fb-1847e7086ddf",
        textValue: inputFields.cnpj.replace(/[^\d]/g, ""),
      },
      {
        fieldId: "ccc51028-ecb9-4f61-baa8-4b54c129b573",
        dateValue: new Date(+inputFields.data_de_aprovacao_da_denuncia),
      },
      {
        fieldId: "3053b5dc-0a22-4fea-8cb3-d61b0ad87177",
        dateValue: toFirstDayOfMonthIso(+inputFields.data_de_referencia),
      },
      {
        fieldId: "da594d1f-fe3a-4323-9004-542635b4fa73",
        textValue: inputFields.razao_social,
      },
      {
        fieldId: "41d09466-9ee5-4154-add4-68c6f0d45efe",
        textValue: inputFields.comentario_da_migracao,
      },
      {
        fieldId: "30099de5-9ee5-44fb-9d83-b76db42f30d7",
        textValue: inputFields.contactEmail,
      },
    ],
    flowId: "abf32de8-409f-4b3e-bd23-fbc5fc70c1aa", // Valor fixo
  };
}

function toFirstDayOfMonthIso(timestamp) {
  const date = new Date(timestamp);
  date.setUTCDate(1);
  return date.toISOString();
}

exports.main = async (event, callback) => {
  const { inputFields } = event;
  const payload = payloadMapper(inputFields);
  console.log("Payload to be sent:", payload);
  stop;
  const migration = await createMigration(payload, inputFields.token);

  console.log("Migration created:", migration);

  try {
    return await callback({
      outputFields: {
        migrationId: migration.id,
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
    inputFields: {
      codigo_ecom_varejista: "a290303d-dd89-41c6-8aa5-7e29eb34945a",
      codigo_do_perfil_de_energia: 200100,
      codigo_da_concessionaria: "73",
      codigo_uc: "MTE91992917",
      razao_social: "Mercado HEITOR",
      pseudonimo: "LOJA 4 - MARINS",
      cnpj: "11.287.750/0001-02",
      tipo_documento: "CNPJ",
      data_de_aprovacao_da_denuncia: "1752369087730",
      data_de_referencia: "1752369087730",
      comentario_da_migracao: "Comentário de teste",
      contactEmail: "lf@teste.com",
      token:
        "eyJhbGciOiJSUzI1NiIsImtpZCI6IjY1NzQyNTVBRjlDNkNBM0ExRjgzM0ZFQ0E5NkI2QzlDIiwidHlwIjoiYXQrand0In0.eyJuYmYiOjE3NDk1NjQzNDQsImV4cCI6MTc0OTU3NTE0NCwiaXNzIjoiaHR0cHM6Ly9hdXRoLnFhLnRodW5kZXJzLmNvbS5iciIsImF1ZCI6WyJhcGkiLCJUaHVuZGVycyIsIlRodW5kZXJzLkFjck9wZXJhdGlvbnMiLCJUaHVuZGVycy5BY3JPcGVyYXRpb25zLkNCUiIsIlRodW5kZXJzLkFjck9wZXJhdGlvbnMuRW5lcmd5QmFsYW5jZSIsIlRodW5kZXJzLkFDck9wZXJhdGlvbnNDQlIiLCJUaHVuZGVycy5BZGRpdGlvbmFsRW50cnkiLCJUaHVuZGVycy5BcGlHYXRld2F5IiwiVGh1bmRlcnMuQmFja09mZmljZUFjbCIsIlRodW5kZXJzLkJiY2UiLCJUaHVuZGVycy5CSSIsIlRodW5kZXJzLkNhbGN1bGF0aW9uUHJlbWlzZXMiLCJUaHVuZGVycy5DYWxjdWxhdG9yIiwiVGh1bmRlcnMuQ29tbXVuaWNhdGlvbnMiLCJUaHVuZGVycy5DUk0iLCJUaHVuZGVycy5DdXN0b21lckludm9pY2UiLCJUaHVuZGVycy5DdXN0b21lckludm9pY2VTZXJ2aWNlIiwiVGh1bmRlcnMuRGlzdHJpYnV0aW9uIiwiVGh1bmRlcnMuRGlzdHJpYnV0aW9uLkFjci5DY2VhcmMiLCJUaHVuZGVycy5EaXN0cmlidXRpb24uQWNyLkNjZWFyZCIsIlRodW5kZXJzLkRpc3RyaWJ1dGlvbi5BY3IuUXVvdGEiLCJUaHVuZGVycy5FbmVyZ3lQZW5hbHRpZXMiLCJUaHVuZGVycy5Gb3VyRXllcyIsIlRodW5kZXJzLkdlbmVyYXRpb24uUGh5c0d1YXJhbnRlZSIsIlRodW5kZXJzLkd1YXJhbnRlZSIsIlRodW5kZXJzLkd1YXJhbnRlZWRTYXZpbmdzIiwiVGh1bmRlcnMuSWRlbnRpdHlTZXJ2ZXIiLCJUaHVuZGVycy5JbnRlZ3JhdGlvbkhhbmRsZXIiLCJUaHVuZGVycy5JbnRlZ3JhdGlvbnMuQ2NlZSIsIlRodW5kZXJzLkludGVncmF0aW9ucy5DY2VlLkltcG9ydHMiLCJUaHVuZGVycy5JbnRlZ3JhdGlvbnMuRm9jdXMuRW5kdXNlciIsIlRodW5kZXJzLkludGVncmF0aW9ucy5XYXkyIiwiVGh1bmRlcnMuTGVnYWwiLCJUaHVuZGVycy5NYXJrZXRJbmZvIiwiVGh1bmRlcnMuTWVhc3VyZW1lbnQiLCJUaHVuZGVycy5NUkUiLCJUaHVuZGVycy5PcGVyYXRpb25zIiwiVGh1bmRlcnMuUG9ydGZvbGlvIiwiVGh1bmRlcnMuUG9zdG1hbiIsIlRodW5kZXJzLlBvc3RtYW4uRW1haWxDb21tdW5pY2F0aW9ucyIsIlRodW5kZXJzLlByb3Bvc2FscyIsIlRodW5kZXJzLlJpc2tFbmdpbmUiLCJUaHVuZGVycy5TY2VuYXJpb3MiLCJUaHVuZGVycy5TZWFzb25hbGl0eSIsIlRodW5kZXJzLlNlcnZpY2VSZXBvcnRzIiwiVGh1bmRlcnMuU2VydmljZXMuU2ltdWxhdGlvbiIsIlRodW5kZXJzLlNlcnZpY2VzQm9vayIsIlRodW5kZXJzLlNlcnZpY2VzQ2FsY3VsYXRvciIsIlRodW5kZXJzLlNuYXBzaG90IiwiVGh1bmRlcnMuU3VydmV5IiwiVGh1bmRlcnMuU3lzdGVtTWFuYWdlbWVudCIsIlRodW5kZXJzLlR1c2QiXSwiY2xpZW50X2lkIjoiZWNvbXFhX2JwbW4iLCJ0aHVuZGVycy10ZW5hbnRpZCI6IjQ2MGY3MGQ4LTI1OTktNDEwMC05ZmI5LTkxZTQ1NDJmOTRmZCIsImlhdCI6MTc0OTU2NDM0NCwic2NvcGUiOlsiYXBpIiwiVGh1bmRlcnMiLCJUaHVuZGVycy5BY3JPcGVyYXRpb25zIiwiVGh1bmRlcnMuQWNyT3BlcmF0aW9ucy5DQlIiLCJUaHVuZGVycy5BY3JPcGVyYXRpb25zLkVuZXJneUJhbGFuY2UiLCJUaHVuZGVycy5BQ3JPcGVyYXRpb25zQ0JSIiwiVGh1bmRlcnMuQWRkaXRpb25hbEVudHJ5IiwiVGh1bmRlcnMuQXBpR2F0ZXdheSIsIlRodW5kZXJzLkJhY2tPZmZpY2VBY2wiLCJUaHVuZGVycy5CYmNlIiwiVGh1bmRlcnMuQkkiLCJUaHVuZGVycy5DYWxjdWxhdGlvblByZW1pc2VzIiwiVGh1bmRlcnMuQ2FsY3VsYXRvciIsIlRodW5kZXJzLkNvbW11bmljYXRpb25zIiwiVGh1bmRlcnMuQ1JNIiwiVGh1bmRlcnMuQ3VzdG9tZXJJbnZvaWNlIiwiVGh1bmRlcnMuQ3VzdG9tZXJJbnZvaWNlU2VydmljZSIsIlRodW5kZXJzLkRpc3RyaWJ1dGlvbiIsIlRodW5kZXJzLkRpc3RyaWJ1dGlvbi5BY3IuQ2NlYXJjIiwiVGh1bmRlcnMuRGlzdHJpYnV0aW9uLkFjci5DY2VhcmQiLCJUaHVuZGVycy5EaXN0cmlidXRpb24uQWNyLlF1b3RhIiwiVGh1bmRlcnMuRW5lcmd5UGVuYWx0aWVzIiwiVGh1bmRlcnMuRm91ckV5ZXMiLCJUaHVuZGVycy5HZW5lcmF0aW9uLlBoeXNHdWFyYW50ZWUiLCJUaHVuZGVycy5HdWFyYW50ZWUiLCJUaHVuZGVycy5HdWFyYW50ZWVkU2F2aW5ncyIsIlRodW5kZXJzLklkZW50aXR5U2VydmVyIiwiVGh1bmRlcnMuSW50ZWdyYXRpb25IYW5kbGVyIiwiVGh1bmRlcnMuSW50ZWdyYXRpb25zLkNjZWUiLCJUaHVuZGVycy5JbnRlZ3JhdGlvbnMuQ2NlZS5JbXBvcnRzIiwiVGh1bmRlcnMuSW50ZWdyYXRpb25zLkZvY3VzLkVuZHVzZXIiLCJUaHVuZGVycy5JbnRlZ3JhdGlvbnMuV2F5MiIsIlRodW5kZXJzLkxlZ2FsIiwiVGh1bmRlcnMuTWFya2V0SW5mbyIsIlRodW5kZXJzLk1lYXN1cmVtZW50IiwiVGh1bmRlcnMuTVJFIiwiVGh1bmRlcnMuT3BlcmF0aW9ucyIsIlRodW5kZXJzLlBvcnRmb2xpbyIsIlRodW5kZXJzLlBvc3RtYW4iLCJUaHVuZGVycy5Qb3N0bWFuLkVtYWlsQ29tbXVuaWNhdGlvbnMiLCJUaHVuZGVycy5Qcm9wb3NhbHMiLCJUaHVuZGVycy5SaXNrRW5naW5lIiwiVGh1bmRlcnMuU2NlbmFyaW9zIiwiVGh1bmRlcnMuU2Vhc29uYWxpdHkiLCJUaHVuZGVycy5TZXJ2aWNlUmVwb3J0cyIsIlRodW5kZXJzLlNlcnZpY2VzLlNpbXVsYXRpb24iLCJUaHVuZGVycy5TZXJ2aWNlc0Jvb2siLCJUaHVuZGVycy5TZXJ2aWNlc0NhbGN1bGF0b3IiLCJUaHVuZGVycy5TbmFwc2hvdCIsIlRodW5kZXJzLlN1cnZleSIsIlRodW5kZXJzLlN5c3RlbU1hbmFnZW1lbnQiLCJUaHVuZGVycy5UdXNkIl19.OTLLO25lVAjdGJLsK9VYaoUo3mxg31WDOeOSKcGDyRPXz0AGKSxtxAglwBDvF5JHFytQqOxqA3fZLFHJPbblkNSmKKv-gSw4ybj4xK4-A3XUOrb3hhOv9-Vet6jHGtwhLBW0ig3gz30UuIM8T8zOZT23E9SBhYa2TK4RSJ_Ejca0cLLgF9QwEY57RjORDjc2ZZtEMgW9FZrdf9jmorxXrZGZK4LbD1ThpdAC8V5RQOMFbbOuZZSjWMTXnyHy8IwCMKF1bUjaPYH6KK2pv24g9_5oVnTKCP_FPUDsPqQZGYAXQJ1E5cGta_hz2DIMjoudk9lHq_vay59OemxeDzjxkQ", // token de autenticação
    },
    object: { objectId: "" },
  },
  console.log
);
