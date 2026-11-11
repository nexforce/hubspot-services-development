const axios = require("axios");

function formatDateISO(milisegundos) {
  if (!milisegundos) return null;
  return new Date(Number(milisegundos)).toISOString();
}

function concatValues(arr) {
  const result = {};

  arr.forEach((item) => {
    const fullName = `${item.firstName} ${item.lastName}`.trim();

    if (!result.name) {
      result.name = fullName;
    } else {
      result.name += "," + fullName;
    }

    Object.entries(item).forEach(([key, value]) => {
      if (key === "firstName" || key === "lastName") return;

      if (!result[key]) {
        result[key] = value;
      } else {
        result[key] += "," + value;
      }
    });
  });

  return result;
}

function templateIdMaper(contractType, instrumentoJuridico) {
  const associacoes = [
    "ASSOCIACAO ECOM SOLAR MG",
    "ASSOCIACAO ECOM SOLAR SAO PAULO",
    "ASSOCIACAO ECOM SOLAR PARAPUA",
    "ASSOCIACAO PETROM ECOM ENERGIA TÉRMICA",
  ];
  const consorcio = ["Consórcio Ecom"];
  const map = {
    associacoes: {
      cnpj: "ca6a9afa-fbfb-4e20-9cda-16be1ba55b69",
      cpf: "1bcea86d-f8fe-47c3-b7cb-a96163929e94",
    },
    consorcio: {
      cnpj: "649cb084-a47e-4794-8ec0-ae5ef4bcbebe",
      cpf: "8d1b9b99-4b10-49ab-94d2-6310e2e35a48",
    },
  };
  if (associacoes.includes(instrumentoJuridico)) {
    return map.associacoes[contractType.toLowerCase()];
  } else if (consorcio.includes(instrumentoJuridico)) {
    return map.consorcio[contractType.toLowerCase()];
  } else {
    throw new Error("Instrumento jurídico inválido para mapeamento.");
  }
}

function validateArrayData(arr) {
  const missingVars = [];

  for (const item of arr) {
    if (!item.para || item.para === "") {
      missingVars.push(item.de);
    }
  }

  if (missingVars.length > 0) {
    return missingVars;
  }
}

exports.main = async (event, callback) => {
  const inputs = event.inputFields;
  const deal_id = event.object.objectId;
  const documentType = inputs.tipo_de_documento;
  const decisorContacts = inputs.decisorContacts;

  const unicPerson = inputs.unicPerson;
  const individualPersonProperties = JSON.parse(unicPerson || "[]");
  const decisorContactsProperties = JSON.parse(decisorContacts || "[]");
  const decisorContactsConcatenated = concatValues(decisorContactsProperties);
  if (
    documentType === "CNPJ" &&
    (!Array.isArray(decisorContactsProperties) ||
      decisorContactsProperties.length === 0)
  ) {
    throw new Error(
      "É necessário informar pelo menos um contato decisor para documentos do tipo CNPJ."
    );
  }
  const token = process.env.ZAPSIGN_TOKEN;

  const fullAddress = `${inputs.street || ""}, ${
    inputs.neighborhood || ""
  }, CEP: ${inputs.zipCode || ""}, ${inputs.city || ""} - ${
    inputs.state || ""
  }`;

  const dataWhenIndividual = [
    {
      de: "{{VARIÁVEL Nº}}",
      para: deal_id || Error("Deal ID não encontrado"),
    },
    {
      de: "{{VARIAVEL ASSOCIACAO ECOM SOLAR SS}}",
      para: inputs.instrumento_juridico || "",
    },
    {
      de: "{{HUBSPOT_NEGOCIO_RECORD_ID}}",
      para: `${deal_id}` || "",
    },
    {
      de: "{{HUBSPOT_RAZAO_SOCIAL}}",
      para: inputs.companyName || "",
    },
    {
      de: "{{HUBSPOT_DOCUMENTO}}",
      para: inputs.cnpj || "",
    },
    {
      de: "{{EMAIL}}",
      para: individualPersonProperties[0]?.email || "",
    },
    {
      de: "{{CELULAR}}",
      para: individualPersonProperties[0]?.phone || "",
    },
    {
      de: "{{HUBSPOT_ENDERECO}}",
      para: fullAddress || "",
    },
    {
      de: "{{HUBSPOT_UNID_CONSUMIDORA}}",
      para: inputs.consumerUnitCode || "",
    },
    {
      de: "{{HUBSPOT_CONSUMO_MEDIO}}",
      para: inputs.totalConsumptionKwh || "",
    },
    {
      de: "{{DESCONTO_GD}}",
      para: inputs.discount || "",
    },
  ];
  const dataWhenCompany = [
    {
      de: "{{VARIÁVEL Nº}}",
      para: deal_id || " ",
    },
    {
      de: "{{VARIAVEL ASSOCIACAO ECOM SOLAR SS}}",
      para: inputs.instrumento_juridico || " ",
    },
    {
      de: "{{HUBSPOT_NEGOCIO_RECORD_ID}}",
      para: `${deal_id}` || "",
    },
    {
      de: "{{HUBSPOT_RAZAO_SOCIAL}}",
      para: inputs.companyName || "",
    },
    {
      de: "{{HUBSPOT_DOCUMENTO}}",
      para: inputs.cnpj || "",
    },
    {
      de: "{{EMAIL}}",
      para: decisorContactsConcatenated.email || "",
    },
    {
      de: "{{CELULAR}}",
      para: decisorContactsConcatenated.phone || "",
    },
    {
      de: "{{HUBSPOT_ENDERECO}}",
      para: fullAddress || "",
    },
    {
      de: "{{HUBSPOT_UNID_CONSUMIDORA}}",
      para: inputs.consumerUnitCode || "",
    },
    {
      de: "{{HUBSPOT_CONSUMO_MEDIO}}",
      para: inputs.totalConsumptionKwh || "",
    },
    {
      de: "{{DESCONTO_GD}}",
      para: inputs.discount || "",
    },
    {
      de: "{{NOME_REPRESENT_LEGAL}}",
      para: decisorContactsConcatenated.name || "",
    },
    {
      de: "{{CPF_REPRESENT_LEGAL}}",
      para: decisorContactsConcatenated.cpf || "",
    },
    {
      de: "{{CELULAR_REPRESENT_LEGAL}}",
      para: decisorContactsConcatenated.phone || "",
    },
    {
      de: "{{EMAIL_REPRESENT_LEGAL}}",
      para: decisorContactsConcatenated.email || "",
    },
  ];

  const missingVars = validateArrayData(
    documentType === "CNPJ" ? dataWhenCompany : dataWhenIndividual
  );
  console.log(
    JSON.stringify(
      documentType === "CNPJ" ? dataWhenCompany : dataWhenIndividual,
      null,
      2
    )
  );

  if (missingVars && missingVars.length > 0) {
    console.log("Variáveis faltando:", missingVars.length);
    return await callback({
      outputFields: {
        missingVars: `${missingVars.join(", ")}`,
        originalFile: "",
        success: false,
      },
    });
  }

  const signerOnCreateContract =
    documentType === "CNPJ"
      ? decisorContactsProperties[0]
      : individualPersonProperties[0];
  console.log("Signer on create contract:", signerOnCreateContract);
  const remainingSignatories = decisorContactsProperties.slice(1);
  console.log("Remaining signatories:", remainingSignatories);

  const templateId = templateIdMaper(documentType, inputs.instrumento_juridico);
  const data = {
    template_id: templateId,
    signer_name:
      `${signerOnCreateContract.firstName} ${signerOnCreateContract.lastName}` ||
      "",
    signer_email: signerOnCreateContract.email || "",
    send_automatic_email: true,
    send_automatic_whatsapp: inputs.send_automatic_whatsapp || false,
    lang: "pt-br",
    created_by: inputs.created_by || "",
    reminder_every_n_days: inputs.reminder_every_n_days || 2,
    external_id: deal_id || "",
    date_limit_to_sign: formatDateISO(inputs.date_limit_to_sign),
    data: documentType === "CNPJ" ? dataWhenCompany : dataWhenIndividual,
  };

  try {
    const response = await axios.post(
      "https://api.zapsign.com.br/api/v1/models/create-doc/",
      data,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("Documento criado com sucesso:", response.data);

    return await callback({
      outputFields: {
        originalFile: response.data.original_file,
        success: true,
        remainingSignatories: remainingSignatories,
        tokenDoc: response.data.token,
        remainingSignatoriesBollean:
          remainingSignatories.length > 0 ? true : false,
      },
    });
  } catch (e) {
    console.error("Erro na integração ZapSign:");

    if (e.response) {
      console.error(JSON.stringify(e.response.data));
      throw new Error(`Erro API ZapSign: ${JSON.stringify(e.response.data)}`);
    } else {
      console.error(e.message);
      throw new Error(e.message);
    }
  }
};
