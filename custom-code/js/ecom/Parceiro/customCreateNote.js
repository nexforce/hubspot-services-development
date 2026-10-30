const axios = require("axios");

async function createNote(partnerId, textNote, accessToken) {
  const url = "https://api.hubapi.com/crm/v3/objects/notes";

  const body = {
    properties: {
      hs_note_body: textNote,
      hs_timestamp: new Date().toISOString(),
    },
    associations: [
      {
        to: {
          id: partnerId,
        },
        types: [
          {
            associationCategory: "USER_DEFINED",
            associationTypeId: 76,
          },
        ],
      },
    ],
  };

  const { data } = await axios.post(url, body, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return data;
}

exports.main = async (event, callback) => {
  const accessToken = process.env.ACCESS_TOKEN_HUBSPOT;
  const unqualifiedId = event.inputFields["unqualifiedId"];
  const newPartnerId = event.inputFields["hs_object_id"];

  const noteText = `Novo cadastro criado a partir de CPF/CNPJ já existente na base.<br>
                    Registro anterior encontrado com status desqualificado (ID: ${unqualifiedId}).<br>
                    Novo registro gerado automaticamente pelo workflow.`;
  try {
    const response = await createNote(newPartnerId, noteText, accessToken);
    console.log("Nota criada com sucesso:", response);
    return await callback({ outputFields: { status_action: "successed" } });
  } catch (error) {
    console.error("Erro ao criar nota:", error.response?.data || error.message);
    return await callback({ outputFields: { status_action: "failed" } });
  }
};
