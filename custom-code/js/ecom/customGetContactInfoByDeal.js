const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
const axios = require("axios");

const hubspotToken = process.env.UNIDADE_CONSUMIDORA_TOKEN;
const baseUrl = "https://api.hubapi.com";

async function getAssociatedContactBy(dealId) {
  const headers = {
    Authorization: `Bearer ${hubspotToken}`,
  };

  const url = `${baseUrl}/crm/v4/objects/deals/${dealId}/associations/contacts`;
  try {
    const response = await axios({ url, method: "GET", headers });

    return response.data;
  } catch (error) {
    console.error("Error getting associated contact: ", error.message);
    const errorMessage =
      error.response?.data?.message || "Unknown error on Hubspot.";

    console.error(errorMessage);

    throw new Error(errorMessage);
  }
}

async function getContactsInfos(contactIds) {
  const headers = {
    Authorization: `Bearer ${hubspotToken}`,
  };
  const payload = {
    inputs: contactIds.map((id) => ({ id: id })),
    properties: [
      "email",
      "phone",
      "cpf",
      "firstname",
      "lastname",
      "tipo_de_contato",
    ],
  };

  const url = `${baseUrl}/crm/v3/objects/contacts/batch/read`;
  try {
    const response = await axios({
      url,
      method: "POST",
      headers,
      data: payload,
    });

    return response.data;
  } catch (error) {
    console.error("Error getting contact info: ", error.message);
    const errorMessage =
      error.response?.data?.message || "Unknown error on Hubspot.";

    console.error(errorMessage);

    throw new Error(errorMessage);
  }
}

exports.main = async (event, callback) => {
  try {
    const { objectId } = event.object;
    const { tipo_de_documento } = event.inputFields;

    const associations = await getAssociatedContactBy(objectId);

    if (associations.results.length === 0) {
      throw new Error("No associated contacts.");
    }

    const contactIds = associations.results.map((result) => result.toObjectId);

    const contactInfo = await getContactsInfos(contactIds);
    console.log("contactInfo", contactInfo);

    const decisorContacts = contactInfo.results.filter((contact) => {
      return contact.properties.tipo_de_contato === "Decisor";
    });
    console.log("decisorContacts", decisorContacts);

    const decisorContactsProperties = decisorContacts.map((contact) => ({
      email: contact.properties.email,
      phone: contact.properties.phone,
      cpf: contact.properties.cpf,
      firstName: contact.properties.firstname,
      lastName: contact.properties.lastname,
    }));

    const uniquePersonContactPropertie = [
      {
        email: contactInfo.results[0].properties.email,
        phone: contactInfo.results[0].properties.phone,
        cpf: contactInfo.results[0].properties.cpf,
        firstName: contactInfo.results[0].properties.firstname,
        lastName: contactInfo.results[0].properties.lastname,
      },
    ];
    const outputFields =
      tipo_de_documento === "CNPJ"
        ? { decisorContacts: JSON.stringify(decisorContactsProperties) }
        : { uniquePerson: JSON.stringify(uniquePersonContactPropertie) };

    return await callback({
      outputFields,
    });
  } catch (err) {
    console.error(err);
    if (axios.isAxiosError(err) && JSON.stringify(err).includes("cloudflare"))
      err.response.status = 500;
    throw err;
  }
};
