// Custom code de ação de workflow baseado em negócio (deal), cliente Bilheteria Digital.
// Evento: criação do registro de produtor no HubSpot (objeto customizado 2-55743372),
// executado depois que o produtor já foi criado no painel da Bilheteria Digital.
// Gatilho: workflow de negócio, na sequência do createProducerOnPainel.js.
// Secret usada: BD_HUBSPOT_TOKEN (private app do HubSpot, leitura de associações do
// negócio e escrita do objeto de produtor).
const axios = require("axios");

async function getAssociatedObjectIds(fromObject, toObject, fromId, headers) {
  const url = `https://api.hubapi.com/crm/v3/objects/${fromObject}/${fromId}/associations/${toObject}`;
  const response = await axios.get(url, { headers });
  return response.data.results.map((r) => r.id);
}

exports.main = async (event, callback) => {
  const {
    tipo_de_produtor,
    cpf,
    cnpj,
    comercialId,
    nome_do_produtor,
    estado,
    cidade,
    nome_fantasia,
    inscricao_estadual,
    id_do_produtor,
    bairro,
    complemento,
    numero,
    logradouro,
    cep,
    numero_de_telefone,
    profissao,
    estado_civil,
    razao_social,
    contribuinte_import,
    praca_id,
    banco,
    agencia,
    tipoconta,
    nome_do_dealer,
    conta,
  } = event.inputFields;
  const dealId = event.object.objectId;
  const accessToken = process.env.BD_HUBSPOT_TOKEN;
  const PRODUTOR_OBJECT_ID = "2-55743372";
  console.log("contribuinte import", contribuinte_import);

  const url = `https://api.hubapi.com/crm/v3/objects/${PRODUTOR_OBJECT_ID}`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  try {
    // Dentro do try para que uma falha ao buscar as associações do negócio também
    // saia nos output fields de erro, em vez de deixar o workflow sem resposta
    const [companyIds, contactIds] = await Promise.all([
      getAssociatedObjectIds("deals", "companies", dealId, headers),
      getAssociatedObjectIds("deals", "contacts", dealId, headers),
    ]);

    const companyAssociations = companyIds.map((id) => ({
      to: { id },
      types: [{ associationCategory: "USER_DEFINED", associationTypeId: 19 }],
    }));

    const contactAssociations = contactIds.map((id) => ({
      to: { id },
      types: [{ associationCategory: "USER_DEFINED", associationTypeId: 17 }],
    }));

    const body = {
      associations: [
        {
          to: { id: dealId },
          types: [
            {
              associationCategory: "USER_DEFINED",
              associationTypeId: 61,
            },
          ],
        },
        ...companyAssociations,
        ...contactAssociations,
      ],
      properties: {
        id_do_produtor,
        tipo_de_produtor,
        cpf,
        cnpj,
        id_do_comercial: comercialId,
        nome_do_produtor,
        estado,
        cidade,
        nome_fantasia,
        inscricao_estadual,
        contribuinte: contribuinte_import,
        estado_civil,
        profissao,
        numero_de_telefone,
        bairro,
        complemento,
        cep,
        numero,
        logradouro,
        razao_social,
        praca_id,
        banco,
        agencia,
        tipoconta,
        nome_do_dealer,
        conta,
      },
    };
    console.log(body);
    const response = await axios.post(url, body, { headers });
    console.log("Produtor criado com sucesso:", response.data);

    return callback({
      outputFields: {
        hs_execution_state: "SUCCESS",
        error: false,
        errorMessage: "",
      },
    });
  } catch (error) {
    const errorData = error.response?.data;
    const mainMessage = errorData?.message || error.message;
    const details = errorData?.errors?.map((e) => e.message).join("; ") ?? "";
    const errorMessage = details ? `${mainMessage}: ${details}` : mainMessage;

    console.error("Erro ao criar registro de produtor no HubSpot:", errorMessage);
    return callback({
      outputFields: {
        hs_execution_state: "ERROR",
        error: true,
        errorMessage: "Erro ao criar produtor no HubSpot: " + errorMessage,
      },
    });
  }
};
