const axios = require("axios");

async function searchPartner(cpfCnpj, accessToken) {
  const objectTypeId = "2-28091991";
  const url = `https://api.hubapi.com/crm/v3/objects/${objectTypeId}/search`;
  const stageFilters = [
    {
      propertyName: "hs_pipeline_stage",
      operator: "NOT_IN",
      values: ["1311273992", "1311271536"],
    },
  ];

  const body = {
    filterGroups: [
      {
        filters: [
          {
            propertyName: "cpf_ou_cnpj_do_parceiro_",
            operator: "EQ",
            value: cpfCnpj,
          },
          ...stageFilters,
        ],
      },
      {
        filters: [
          {
            propertyName: "cnpj",
            operator: "EQ",
            value: cpfCnpj,
          },
          ...stageFilters,
        ],
      },
    ],
    properties: ["cpf_ou_cnpj_do_parceiro_", "hs_pipeline_stage"],
    limit: 10,
  };

  try {
    const response = await axios.post(url, body, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    return response.data.results;
  } catch (error) {
    console.error(
      "Erro ao buscar parceiro:",
      error.response ? error.response.data : error.message,
    );
    throw error;
  }
}

exports.main = async (event, callback) => {
  const documentValue = event.inputFields.cpf_ou_cnpj_do_parceiro;
  const accessToken = process.env.ACCESS_TOKEN_HUBSPOT;
  let documentType = "";
  if (!documentValue) {
    console.log("Documento inválido");
    return;
  }
  if (documentValue.length === 14) {
    documentType = "CNPJ";
  } else {
    documentType = "CPF";
  }

  let isActivePartner = false;
  try {
    const parceiros = await searchPartner(documentValue, accessToken);
    if (parceiros.length > 0) {
      console.log("Parceiro encontrado:", parceiros[0]);
      isActivePartner = true;
    } else {
      console.log(
        "Nenhum parceiro encontrado para o documento:",
        documentValue,
      );
    }
  } catch (error) {
    console.error("Erro ao buscar parceiro:", error);
  }
  callback({
    outputFields: {
      documentType: documentType,
      isActivePartner: isActivePartner,
    },
  });
};
