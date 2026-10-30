const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
const axios = require("axios");
const customObjectId = "2-28064547";

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
      error.response?.data?.message || "Unknown error on Hubspot.";

    console.error(errorMessage);

    throw new Error(errorMessage);
  }
}

function ucPropertiesFormatter(inputFields) {
  const stateMapper = {
    AC: "Acre",
    AL: "Alagoas",
    AP: "Amapá",
    AM: "Amazonas",
    BA: "Bahia",
    CE: "Ceará",
    DF: "Distrito Federal",
    ES: "Espírito Santo",
    GO: "Goiás",
    MA: "Maranhão",
    MT: "Mato Grosso",
    MS: "Mato Grosso do Sul",
    MG: "Minas Gerais",
    PA: "Pará",
    PB: "Paraíba",
    PR: "Paraná",
    PE: "Pernambuco",
    PI: "Piauí",
    RJ: "Rio de Janeiro",
    RN: "Rio Grande do Norte",
    RS: "Rio Grande do Sul",
    RO: "Rondônia",
    RR: "Roraima",
    SC: "Santa Catarina",
    SP: "São Paulo",
    SE: "Sergipe",
    TO: "Tocantins",
  };

  const tariffModalityMapper = {
    VERDE: "Verde",
    AZUL: "Azul",
    CONVENCIONAL: "Convencional",
    BRANCA: "Branca",
  };

  const dueDateFormatted = inputFields.duedate
    .replaceAll("/", "-")
    .split("-")
    .reverse()
    .join("-");

  return {
    properties: {
      razao_social: inputFields.customername,
      logradouro: inputFields.customeraddressstreetandnumber,
      bairro: inputFields.customeraddressdistrict,
      cep: inputFields.customeraddresszipcode.replaceAll("-", ""),
      cidade: inputFields.customeraddresscity,
      estado: stateMapper[inputFields.customeraddressstate],
      distribuidora: inputFields.providername,
      cnpj_da_distribuidora: inputFields.providercnpj,
      id_leitura_de_fatura: inputFields.transactionid,
      demanda_contratada_p_kw: inputFields.demand,
      demanda_contratada_fp_kw: inputFields.demand,
      consumo_pico: inputFields.peak,
      consumo_fora_pico: inputFields.offpeak,
      modalidade_tarifaria:
        tariffModalityMapper[inputFields.tariffmodality] || "",
      subgrupo_tarifario: inputFields.subgroup,
      data_de_vencimento_da_fatura: new Date(dueDateFormatted).getTime(),
      leitura_de_fatura___quantidade_de_dias_de_leitura:
        inputFields.readingdays,
      leitura_de_fatura___tem_demanda_contratado_excedida_na_fatura_:
        !!+inputFields.exceededdemand,
      leitura_de_fatura___quantidade_de_demanda_excedida_em_kwh:
        inputFields.exceededdemandquantity,
      leitura_de_fatura___tem_debitos_anteriores_identificados_na_fatura_:
        inputFields.hasdebts,
      leitura_de_fatura___insights_da_ia: inputFields.transactionnotes,
      valor: inputFields.totalcharges,
      consumo_total_em_kwh: inputFields.total,
      leitura_de_fatura___score_de_confianca_da_ia:
        inputFields.transactionreliability,
      leitura_de_fatura___flag_de_confianca: String(
        inputFields.transactiontrust
      ).toUpperCase(),
      tem_energia_injetada: inputFields.hasinjectedenergy,
      leitura_de_fatura___quantidade_de_energia_injetada_em_kwh:
        inputFields.injected,
      leitura_da_fatura_automatica: inputFields.customername ? true : false,
      faixa_de_valor_mensal_da_conta_de_luz: totalChargesMapper(
        inputFields.totalcharges
      ),
    },
  };
}

function totalChargesMapper(totalCharges) {
  const ranges = [
    { range: "Menor que R$ 2 mil", limit: 2000 },
    { range: "De R$ 2 a 5 Mil", limit: 5000 },
    { range: "De R$ 5 a 10 Mil", limit: 10000 },
    { range: "De R$ 10 a 20 Mil", limit: 20000 },
    { range: "De R$ 20 a 50 mil", limit: 50000 },
    { range: "De R$ 50 a 100 Mil", limit: 100000 },
  ];

  for (const object of ranges) {
    if (totalCharges < object.limit) {
      return object.range;
    }
  }

  return "Mais de R$ 100 Mil";
}

exports.main = async (event, callback) => {
  try {
    const { objectId } = event.object;
    const { inputFields } = event;

    const dataForUpdate = ucPropertiesFormatter(inputFields);
    console.log(dataForUpdate);

    await updateUCBy(objectId, dataForUpdate);

    console.log("UC updated successfully.");
    return await callback({
      outputFields: {
        hs_execution_state: "SUCCESS",
        hs_object_id: event.object.objectId,
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

// [FINAL]

exports.main(
  {
    inputFields: {
      customername: "Luiz Felipe Dias",
      customeraddressstreetandnumber: "Rua das Laranjeiras, 123",
      customeraddressdistrict: "Centro",
      customeraddresszipcode: "12345-678",
      customeraddresscity: "São Paulo",
      customeraddressstate: "SP",
      providername: "AMAZONAS",
      providercnpj: "33050196000188",
      transactionid: "TX123456789",
      demand: 120,
      peak: 80,
      offpeak: 40,
      tariffmodality: "CONVENCIONAL",
      subgroup: "B1",
      duedate: "24/07/2024",
      readingdays: 30,
      exceededdemand: "0",
      exceededdemandquantity: 15,
      hasdebts: false,
      transactionnotes: "Leitura realizada com sucesso.",
      totalcharges: 523.78,
      total: 230,
      transactionreliability: 0.95,
      transactiontrust: true,
      hasinjectedenergy: true,
      injected: 12.5,
    },
    object: { objectId: 13771662909 },
  },
  console.log
);
