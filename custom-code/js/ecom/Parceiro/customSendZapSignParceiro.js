const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
const axios = require("axios");
const zapSignToken = process.env.ZAPSIGN_TOKEN;

function addSevenDaysToDate(dateString) {
  const date = new Date(+dateString);

  date.setDate(date.getUTCDate() + 6);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDocumentBy(type, document) {
  const cleanedDocument = document.toString().replace(/\D/g, "");

  if (type === "CPF") {
    if (cleanedDocument.length !== 11) {
      throw new Error("Invalid CPF. Must have 11 digits.");
    }

    return cleanedDocument.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      "$1.$2.$3-$4"
    );
  } else if (type === "CNPJ") {
    if (cleanedDocument.length !== 14) {
      throw new Error("Invalid CNPJ. Must have 14 digits.");
    }

    return cleanedDocument.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5"
    );
  } else {
    throw new Error("Invalid type. Only 'CPF' or 'CNPJ' are supported.");
  }
}

async function sendZapSignDocument(body) {
  try {
    const headers = {
      Authorization: `Bearer ${zapSignToken}`,
      "Content-type": "application/json",
    };

    const url = "https://api.zapsign.com.br/api/v1/models/create-doc/";

    const response = await axios({ url, method: "POST", data: body, headers });

    return response.data;
  } catch (error) {
    console.log("", error.message);
    throw error;
  }
}

exports.main = async (event, callback) => {
  try {
    const {
      id_do_parceiro,
      razao_social,
      cnpj,
      endereco,
      data_de_envio_do_termo_de_adesao,
      tipo_documento,
      contactEmail,
      contactFirstName,
      contactLastName,
      contactCpf,
      contactPhone,
      ownerEmail,
    } = event.inputFields;

    console.log("Documento do tipo", tipo_documento);
    const date = new Date(+data_de_envio_do_termo_de_adesao);
    const dateFormatted = `${String(date.getUTCDate()).padStart(
      2,
      "0"
    )}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;

    const signerName = contactLastName
      ? `${contactFirstName} ${contactLastName}`
      : contactFirstName;

    const body = {
      template_id:
        tipo_documento == "CNPJ"
          ? "772905c4-72b0-46ae-9de6-db4783d1e372"
          : "e31d54d8-ae64-4d42-8ca2-7b7196c4298c",
      signer_name: signerName,
      signer_email: contactEmail,
      send_automatic_email: true,
      send_automatic_whatsapp: false,
      lang: "pt-br",
      created_by: ownerEmail,
      reminder_every_n_days: 2,
      external_id: event.object.objectId,
      date_limit_to_sign: addSevenDaysToDate(data_de_envio_do_termo_de_adesao),
      data: [
        {
          de: "{{ID_DO_PARCEIRO}}",
          para: id_do_parceiro,
        },
        {
          de: "{{NOME_RAZAO_SOCIAL}}",
          para: razao_social,
        },
        {
          de: "{{CNPJ}}",
          para: formatDocumentBy(tipo_documento, cnpj),
        },
        {
          de: "{{ENDERECO_COMPLETO}}",
          para: endereco,
        },
        {
          de: "{{E-MAIL}}",
          para: contactEmail,
        },
        {
          de: "{{TELEFONE}}",
          para: contactPhone,
        },
        {
          de: "{{NOME_REPRESENTANTE_LEGAL}}",
          para: signerName,
        },
        {
          de: "{{CPF}}",
          para: formatDocumentBy("CPF", contactCpf),
        },
        {
          de: "{{DATA_ENVIO_TERMO_ADESAO}}",
          para: dateFormatted,
        },
        {
          de: "{{NOME_PESSOA_FISICA}}",
          para: signerName,
        },
      ],
    };

    console.log(body);
    const document = await sendZapSignDocument(body);

    return await callback({
      outputFields: {
        hs_execution_state: "SUCCESS",
        documentUrl: document.original_file,
        signUrl: document.signers[0].sign_url,
        token: document.token,
        url: `https://app.zapsign.com.br/conta/documentos/${document.token}`,
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
      id_do_parceiro: "16222219567",
      razao_social: "",
      cnpj: "88.056.286/0001-78",
      endereco: "",
      data_de_envio_do_termo_de_adesao: 1732147200000,
      tipo_documento: "CNPJ",
      contactEmail: "properties.email",
      contactFirstName: "Luiz Felipe",
      contactLastName: "Dias",
      contactCpf: "807.218.340-00",
      contactPhone: "properties.phone",
      ownerEmail: "",
    },
    object: { objectId: 16222219567 },
  },
  console.log
);
