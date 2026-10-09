const axios = require("axios");

const modelsMap = {
  // Super Pequeno Porte Simples
  "9": [
    "42",
    "43",
    "673",
    "41",
    "40",
    "364",
    "961",
    "150",
    "365",
    "578",
    "366",
    "44",
    "590",
    "592",
    "47",
    "709",
    "353",
    "904",
    "597",
    "1026",
    "52",
    "50",
    "184",
    "824",
    "268",
    "879",
    "1530",
    "1572",
  ],
  // Super Medio Porte Presumido/Real
  "10": [
    "322",
    "42",
    "43",
    "909",
    "996",
    "673",
    "41",
    "40",
    "364",
    "1542",
    "961",
    "150",
    "1594",
    "365",
    "842",
    "578",
    "366",
    "44",
    "590",
    "592",
    "1091",
    "196",
    "176",
    "1253",
    "47",
    "1099",
    "1313",
    "709",
    "353",
    "904",
    "644",
    "351",
    "597",
    "1026",
    "52",
    "1212",
    "158",
    "775",
    "50",
    "184",
    "1029",
    "575",
    "824",
    "268",
    "879",
    "598",
    "965",
    "1530",
    "1571",
    "1572",
  ],
  // MatCon Pequeno Porte Simples
  "11": [
    "43",
    "909",
    "41",
    "40",
    "364",
    "961",
    "150",
    "365",
    "842",
    "578",
    "212",
    "366",
    "44",
    "1028",
    "590",
    "592",
    "1091",
    "286",
    "47",
    "709",
    "353",
    "905",
    "597",
    "1026",
    "52",
    "1212",
    "158",
    "775",
    "50",
    "184",
    "849",
    "248",
    "824",
    "268",
    "879",
    "1530",
    "1572",
  ],
  // MatCon Pequeno Porte Presumido/Real
  "12": [
    "322",
    "43",
    "909",
    "867",
    "41",
    "40",
    "364",
    "961",
    "150",
    "1594",
    "365",
    "842",
    "578",
    "212",
    "289",
    "366",
    "44",
    "1028",
    "590",
    "592",
    "286",
    "47",
    "1099",
    "1313",
    "709",
    "1086",
    "353",
    "905",
    "644",
    "351",
    "597",
    "1026",
    "52",
    "377",
    "775",
    "50",
    "184",
    "849",
    "248",
    "824",
    "268",
    "879",
    "1530",
    "1571",
    "1572",
  ],
  // Super Grande Porte Lucro Real
  "13": [
    "1490",
    "1117",
    "1235",
    "322",
    "42",
    "43",
    "909",
    "867",
    "706",
    "152",
    "996",
    "673",
    "588",
    "41",
    "40",
    "874",
    "364",
    "151",
    "1542",
    "961",
    "150",
    "1594",
    "365",
    "1243",
    "1215",
    "978",
    "842",
    "578",
    "212",
    "1071",
    "289",
    "366",
    "44",
    "594",
    "590",
    "592",
    "194",
    "1091",
    "196",
    "176",
    "1253",
    "573",
    "903",
    "47",
    "1099",
    "1313",
    "873",
    "709",
    "1086",
    "353",
    "904",
    "644",
    "352",
    "954",
    "1033",
    "351",
    "597",
    "198",
    "1026",
    "52",
    "1212",
    "377",
    "158",
    "775",
    "185",
    "50",
    "184",
    "1029",
    "179",
    "216",
    "575",
    "824",
    "1088",
    "268",
    "879",
    "598",
    "595",
    "589",
    "965",
    "1150",
    "887",
    "1530",
    "1571",
    "1572",
  ],
  // MatCon Grande Porte Lucro Real
  "14": [
    "1490",
    "1117",
    "1235",
    "322",
    "43",
    "909",
    "867",
    "706",
    "152",
    "39",
    "996",
    "588",
    "41",
    "40",
    "874",
    "364",
    "151",
    "1542",
    "961",
    "150",
    "1594",
    "365",
    "1243",
    "1215",
    "842",
    "578",
    "212",
    "1032",
    "1071",
    "289",
    "366",
    "288",
    "1011",
    "1003",
    "44",
    "367",
    "594",
    "1028",
    "590",
    "592",
    "194",
    "1091",
    "286",
    "176",
    "903",
    "47",
    "1099",
    "1313",
    "873",
    "709",
    "1086",
    "353",
    "905",
    "644",
    "352",
    "954",
    "1033",
    "351",
    "597",
    "198",
    "1026",
    "52",
    "1212",
    "377",
    "158",
    "775",
    "185",
    "50",
    "184",
    "970",
    "179",
    "216",
    "1247",
    "1251",
    "900",
    "849",
    "248",
    "824",
    "1088",
    "268",
    "879",
    "598",
    "595",
    "589",
    "965",
    "1150",
    "1530",
    "1571",
    "1572",
  ],
  // Super Pequeno Porte Presumido/Real
  "17": [
    "322",
    "42",
    "43",
    "909",
    "867",
    "706",
    "996",
    "673",
    "41",
    "40",
    "364",
    "961",
    "1594",
    "365",
    "842",
    "578",
    "366",
    "44",
    "590",
    "592",
    "1091",
    "196",
    "176",
    "1253",
    "47",
    "1099",
    "1313",
    "709",
    "353",
    "904",
    "644",
    "351",
    "597",
    "52",
    "1212",
    "158",
    "50",
    "184",
    "824",
    "268",
    "879",
    "1530",
    "1571",
    "1572",
  ],
  // Proposta CISSLive Grupo CRM - Loja Própria
  "19": [
    "1083",
    "1126",
    "1127",
    "1277",
    "1182",
    "1184",
    "1236",
    "1183",
    "1169",
    "1171",
    "1299",
    "1167",
    "1462",
    "1162",
    "1164",
    "1632",
    "1160",
    "1163",
    "1161",
    "1166",
    "1170",
    "1670",
    "1165",
    "1159",
    "1168",
    "1158",
    "1573",
    "1263",
    "1173",
    "1176",
    "1174",
    "1322",
    "1283",
    "1172",
    "1175",
    "1178",
    "1179",
    "1180",
    "1177",
    "1284",
    "1520",
    "1397",
    "1278",
    "1461",
    "1188",
    "1186",
    "1185",
    "1187",
    "1496",
    "1190",
    "1189",
    "1250",
    "1328",
    "1191",
    "1495",
    "1195",
    "1193",
    "1194",
    "1192",
    "1197",
    "1198",
    "1532",
    "1199",
    "1289",
    "1202",
    "1290",
    "1200",
    "1201",
    "1337",
    "1206",
    "1232",
    "1203",
    "1204",
    "1216",
    "1217",
    "1281",
    "1295",
  ],
  // Proposta CISSLive Franquia CRM
  "20": [
    "1126",
    "1127",
    "1277",
    "1182",
    "1184",
    "1236",
    "1183",
    "1169",
    "1171",
    "1299",
    "1167",
    "1462",
    "1162",
    "1164",
    "1632",
    "1160",
    "1163",
    "1161",
    "1166",
    "1170",
    "1670",
    "1165",
    "1159",
    "1168",
    "1158",
    "1573",
    "1263",
    "1173",
    "1176",
    "1174",
    "1322",
    "1283",
    "1172",
    "1175",
    "1178",
    "1179",
    "1180",
    "1177",
    "1284",
    "1520",
    "1397",
    "1278",
    "1461",
    "1188",
    "1186",
    "1185",
    "1187",
    "1496",
    "1190",
    "1189",
    "1250",
    "1328",
    "1191",
    "1495",
    "1195",
    "1193",
    "1194",
    "1192",
    "1197",
    "1198",
    "1532",
    "1199",
    "1289",
    "1202",
    "1290",
    "1200",
    "1201",
    "1337",
    "1206",
    "1232",
    "1203",
    "1204",
    "1216",
    "1217",
    "1281",
    "1295",
  ],
  // Proposta CISSLive
  "21": [
    "1083",
    "1080",
    "1277",
    "1182",
    "1184",
    "1236",
    "1082",
    "1183",
    "1169",
    "1171",
    "1299",
    "1167",
    "1462",
    "1162",
    "1164",
    "1632",
    "1160",
    "1163",
    "1161",
    "1166",
    "1170",
    "1670",
    "1165",
    "1159",
    "1168",
    "1158",
    "1573",
    "1263",
    "1173",
    "1176",
    "1174",
    "1322",
    "1283",
    "1172",
    "1175",
    "1178",
    "1179",
    "1180",
    "1177",
    "1284",
    "1520",
    "1397",
    "1278",
    "1461",
    "1399",
    "1188",
    "1186",
    "1185",
    "1187",
    "1496",
    "1190",
    "1189",
    "1250",
    "1328",
    "1191",
    "1495",
    "1195",
    "1193",
    "1194",
    "1192",
    "1197",
    "1198",
    "1532",
    "1199",
    "1289",
    "1202",
    "1290",
    "1200",
    "1201",
    "1337",
    "1206",
    "1205",
    "1203",
    "1204",
    "1216",
    "1217",
    "1281",
    "1295",
    "1544",
  ],
  // MatCon Médio Porte Lucro Real
  "22": [
    "322",
    "42",
    "43",
    "909",
    "867",
    "706",
    "996",
    "673",
    "41",
    "40",
    "364",
    "961",
    "150",
    "1594",
    "365",
    "842",
    "578",
    "212",
    "1032",
    "1071",
    "289",
    "366",
    "1011",
    "44",
    "367",
    "1151",
    "1028",
    "590",
    "592",
    "194",
    "1091",
    "286",
    "47",
    "1099",
    "1313",
    "709",
    "1086",
    "607",
    "353",
    "905",
    "644",
    "351",
    "597",
    "1026",
    "52",
    "1212",
    "377",
    "158",
    "775",
    "185",
    "50",
    "184",
    "970",
    "1247",
    "849",
    "248",
    "378",
    "824",
    "1088",
    "268",
    "879",
    "598",
    "965",
    "1530",
    "1571",
    "1572",
  ],
  // Proposta CISSLive Gestor
  "23": [
    "1450",
    "1500",
    "1441",
    "1637",
    "1458",
    "1459",
    "1449",
    "1448",
    "1440",
    "1431",
    "1557",
    "1504",
    "1517",
    "1505",
    "1451",
    "1506",
    "1452",
    "1454",
    "1502",
    "1455",
    "1453",
    "1456",
    "1457",
    "1503",
    "1501",
    "1507",
  ],
  // CISSLive Integração CISSBox Terceiros
  "24": [
    "1080",
    "1082",
    "1169",
    "1171",
    "1299",
    "1167",
    "1462",
    "1162",
    "1164",
    "1160",
    "1163",
    "1161",
    "1166",
    "1170",
    "1165",
    "1518",
    "1159",
    "1168",
    "1158",
    "1263",
    "1173",
    "1175",
    "1197",
    "1198",
    "1532",
    "1199",
    "1362",
  ],
  // Proposta CISSLive Franquias
  "25": [
    "1488",
    "1083",
    "1080",
    "1277",
    "1182",
    "1184",
    "1236",
    "1082",
    "1183",
    "1169",
    "1171",
    "1299",
    "1167",
    "1462",
    "1162",
    "1164",
    "1160",
    "1163",
    "1161",
    "1166",
    "1170",
    "1670",
    "1165",
    "1518",
    "1159",
    "1168",
    "1158",
    "1573",
    "1263",
    "1173",
    "1176",
    "1174",
    "1322",
    "1283",
    "1172",
    "1175",
    "1178",
    "1179",
    "1180",
    "1177",
    "1284",
    "1520",
    "1397",
    "1278",
    "1461",
    "1188",
    "1186",
    "1185",
    "1187",
    "1496",
    "1190",
    "1189",
    "1250",
    "1328",
    "1191",
    "1495",
    "1195",
    "1193",
    "1194",
    "1192",
    "1197",
    "1198",
    "1532",
    "1199",
    "1362",
    "1289",
    "1202",
    "1290",
    "1200",
    "1201",
    "1337",
    "1206",
    "1205",
    "1203",
    "1204",
    "1216",
    "1217",
    "1281",
    "1295",
  ],
};

const contractTypeClassification = {
  // Licença (L)
  AB: "L",
  AC: "L",
  AF: "L",
  AG: "L",
  AL: "L",
  AM: "L",
  AZ: "L",
  D: "L",
  DB: "L",
  BZ: "L",
  CC: "L",
  CP: "L",
  FO: "L",
  H: "L",
  L: "L",
  RM: "L",
  SS: "L",
  TE: "L",
  U: "L",
  // Locação (C)
  AA: "C",
  AD: "C",
  AE: "C",
  AI: "C",
  AN: "C",
  AT: "C",
  BF: "C",
  BX: "C",
  BY: "C",
  C: "C",
  CG: "C",
  CI: "C",
  CL: "C",
  CO: "C",
  DS: "C",
  ET: "C",
  FI: "C",
  FR: "C",
  GE: "C",
  IA: "C",
  LE: "C",
  LY: "C",
  O: "C",
  OX: "C",
  PD: "C",
  PO: "C",
  QW: "C",
  RA: "C",
  RG: "C",
  RT: "C",
  SZ: "C",
  TA: "C",
  TB: "C",
  TC: "C",
  TF: "C",
  TR: "C",
  TS: "C",
  TU: "C",
  UI: "C",
  J: "C",
  // Serviço (S)
  AS: "S",
  FF: "S",
  S: "S",
  // Cancelamento (E)
  V: "E",
  VV: "E",
};

const chunk = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size),
  );

// Line items are deduplicated by SKU alone; a re-run updates the matching
// item (overwriting tipo_de_contrato and its values) instead of duplicating it.
const makeKey = (sku) => String(sku ?? "").trim();

const searchProductsBySkus = async (skus, apiClient) => {
  const results = {};
  const chunks = chunk(skus, 100);

  for (const chunkSkus of chunks) {
    const { data } = await apiClient.post("/crm/v3/objects/products/search", {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "hs_sku",
              operator: "IN",
              values: chunkSkus,
            },
          ],
        },
      ],
      properties: [
        "name",
        "hs_sku",
        "tipo_emissao",
        "valor_glt",
        "valor_licenca",
        "valor_locacao",
        "valor_treinamento",
        "horas_treinamento",
      ],
      limit: 100,
    });
    (data.results || []).forEach((p) => {
      results[p.properties.hs_sku] = p;
    });
  }

  return results;
};

const createLineItemsBatch = async (inputs, apiClient) => {
  try {
    const chunks = chunk(inputs, 100);
    const results = [];
    for (const chunkItems of chunks) {
      const { data } = await apiClient.post(
        "/crm/v3/objects/line_items/batch/create",
        { inputs: chunkItems },
      );
      results.push(...(data.results || []));
    }
    return results;
  } catch (error) {
    throw new Error(`Falha ao criar itens de linha em lote: ${error.message}`);
  }
};

const updateLineItemsBatch = async (inputs, apiClient) => {
  try {
    const chunks = chunk(inputs, 100);
    const results = [];
    for (const chunkItems of chunks) {
      const { data } = await apiClient.post(
        "/crm/v3/objects/line_items/batch/update",
        { inputs: chunkItems },
      );
      results.push(...(data.results || []));
    }
    return results;
  } catch (error) {
    throw new Error(
      `Falha ao atualizar itens de linha em lote: ${error.message}`,
    );
  }
};

// SKUs (sistema Cissmart) cuja quantity vem de `n_de_acessos` do deal em vez
// da contagem de emissão. A regra escreve APENAS quantity — nunca price/valores.
const ACCESS_QUANTITY_SKUS = new Set(["1006", "791"]);

// SKUs cuja quantity vem de `quantidade_de_acessos_datacenter` do deal,
// independentemente do tipo_emissao do produto. Escreve APENAS quantity.
const DATACENTER_ACCESS_QUANTITY_SKUS = new Set(["1587", "697"]);

// Estado de desconto (app discount-card) zerado ao RE-LANÇAR um item que já
// existe: o re-lançamento reescreve os valores base com os do catálogo, ou
// seja, redefine a linha de base comercial — o desconto anterior deixa de
// valer e precisa ser renegociado sobre o novo valor.
//
// Sem esta limpeza o snapshot `*_original` fica obsoleto e continua sendo a
// referência imutável lida pelo discount-card: com catálogo mais caro o card
// mostra líquido acima do bruto (e descarta o desconto digitado), com catálogo
// mais barato aparece um desconto fantasma que ninguém aplicou.
//
// Só as categorias cujo valor base é reescrito aqui. Desenvolvimento/DBA e
// Consultoria não são tocados pelo lançamento — limpar os snapshots deles
// destruiria o bruto original de um desconto ainda vigente.
const DISCOUNT_STATE_TO_RESET = [
  "valor_mensalidade_original",
  "glt_descontado",
  "valor_glt_descontado",
  "valor_licenca_original",
  "licenca_descontado",
  "valor_licenca_descontado",
  "valor_locacao_original",
  "locacao_descontado",
  "valor_locacao_descontado",
  // Treinamento é categoria hora×valor: só tem snapshot, sem satélites de %.
  "valor_treinamento_original",
];

const clearedDiscountState = () =>
  Object.fromEntries(DISCOUNT_STATE_TO_RESET.map((prop) => [prop, ""]));

const buildLineItem = (product, lanc, dealId, rule, dealProperties) => {
  const p = product.properties;

  const campoQtd = rule[(p.tipo_emissao || "").toUpperCase()];

  if (campoQtd === undefined) {
    console.warn(
      `tipo_emissao desconhecido para SKU ${p.hs_sku}: "${p.tipo_emissao}".`,
    );
  }

  // Contagem de emissão (piso 1). Vira a `quantity` do line item — a
  // multiplicação deixa de ser aplicada aos valores financeiros.
  const emissionCount = campoQtd ? Math.max(Number(lanc[campoQtd]) || 1, 1) : 1;

  const calc = (v) => Number(v || 0);

  const classification =
    contractTypeClassification[lanc.tipo_de_contrato] ?? null;

  let valor_glt = 0;
  let valor_licenca = 0;
  let valor_locacao = 0;
  let valor_treinamento = 0;
  let horas_treinamento = 0;
  let quantity = emissionCount; // por padrão, a emissão define a quantidade

  if (classification === "L") {
    // Licença: valores unitários; a emissão entra via `quantity`
    valor_licenca = calc(p.valor_licenca);
    valor_glt = calc(p.valor_glt);
    horas_treinamento = calc(p.horas_treinamento); // UNITÁRIO — nunca multiplicado
    valor_treinamento = calc(p.valor_treinamento);
  } else if (classification === "C") {
    // Locação: valores unitários; a emissão entra via `quantity`
    valor_locacao = calc(p.valor_locacao);
    horas_treinamento = calc(p.horas_treinamento);
    valor_treinamento = calc(p.valor_treinamento);
  } else if (classification === "S" || classification === "T") {
    // Serviço/Treinamento: valores unitários; a emissão entra via `quantity`
    horas_treinamento = calc(p.horas_treinamento);
    valor_treinamento = calc(p.valor_treinamento);
  } else if (classification === "E") {
    // Cancelamento: values come from deal properties, not from product,
    // and are never multiplied — quantity fica fixa em 1.
    valor_glt = calc(dealProperties.valor_cancelamento_contrato_glt);
    valor_licenca = calc(dealProperties.valor_cancelamento_contrato_licenca);
    valor_locacao = calc(dealProperties.valor_cancelamento_contrato_locacao);
    valor_treinamento = calc(
      dealProperties.valor_cancelamento_contrato_treinamento,
    );
    quantity = 1;
  } else {
    console.warn(
      `Classification not found for tipo_de_contrato "${lanc.tipo_de_contrato}". Falling back to all product values.`,
    );
    valor_glt = calc(p.valor_glt);
    valor_licenca = calc(p.valor_licenca);
    valor_locacao = calc(p.valor_locacao);
    horas_treinamento = calc(p.horas_treinamento);
    valor_treinamento = calc(p.valor_treinamento);
  }

  // n_de_acessos define a quantity dos SKUs de acesso; vazio/0 mantém a regra
  // de emissão, e cancelamento (E) continua fixo em 1.
  const nDeAcessos = Number(dealProperties.n_de_acessos);
  if (
    ACCESS_QUANTITY_SKUS.has(makeKey(p.hs_sku)) &&
    classification !== "E" &&
    Number.isFinite(nDeAcessos) &&
    nDeAcessos > 0
  ) {
    quantity = nDeAcessos;
  }

  // SKUs 1587/697: quantity = quantidade_de_acessos_datacenter do deal,
  // independentemente do tipo_emissao. Vazio/0/não numérico mantém a regra de
  // emissão já calculada, e cancelamento (E) continua fixo em 1.
  if (
    DATACENTER_ACCESS_QUANTITY_SKUS.has(makeKey(p.hs_sku)) &&
    classification !== "E"
  ) {
    const acessosDatacenter = Number(
      dealProperties.quantidade_de_acessos_datacenter,
    );
    if (Number.isFinite(acessosDatacenter) && acessosDatacenter > 0) {
      quantity = acessosDatacenter;
    }
  }

  // price = soma dos valores UNITÁRIOS; a multiplicação acontece via quantity
  const price = valor_glt + valor_licenca + valor_locacao + valor_treinamento;

  return {
    associations: [
      {
        to: { id: dealId },
        types: [
          { associationCategory: "HUBSPOT_DEFINED", associationTypeId: 20 },
        ],
      },
    ],
    properties: {
      hs_sku: p.hs_sku,
      hs_product_id: product.id,
      name: p.name,
      quantity,
      price,
      valor_glt,
      valor_licenca,
      valor_locacao,
      horas_treinamento,
      valor_treinamento,
      tipo_de_contrato: lanc.tipo_de_contrato,
      classificacao_do_contrato: classification,
    },
  };
};

const getAssociatedLineItemIds = async (dealId, apiClient) => {
  const { data } = await apiClient.post(
    "/crm/v4/associations/deals/line_items/batch/read",
    { inputs: [{ id: String(dealId) }] },
  );

  return (data.results?.[0]?.to || []).map((item) =>
    String(item.toObjectId ?? item.id),
  );
};

const getExistingLineItems = async (dealId, apiClient) => {
  const lineItemIds = await getAssociatedLineItemIds(dealId, apiClient);
  if (!lineItemIds.length) return {};

  const existing = {};
  const chunks = chunk(lineItemIds, 100);
  await Promise.all(
    chunks.map(async (chunkIds) => {
      const { data } = await apiClient.post(
        "/crm/v3/objects/line_items/batch/read",
        {
          inputs: chunkIds.map((id) => ({ id })),
          properties: ["hs_sku"],
        },
      );
      (data.results || []).forEach((li) => {
        const sku = li.properties?.hs_sku;
        if (!sku) return;
        existing[makeKey(sku)] = li.id;
      });
    }),
  );

  return existing;
};

const getAllLineItems = async (dealId, apiClient) => {
  const lineItemIds = await getAssociatedLineItemIds(dealId, apiClient);
  if (!lineItemIds.length) return [];

  const lineItems = [];

  const chunks = chunk(lineItemIds, 100);
  await Promise.all(
    chunks.map(async (chunkIds) => {
      const { data: batchData } = await apiClient.post(
        "/crm/v3/objects/line_items/batch/read",
        {
          inputs: chunkIds.map((id) => ({ id })),
          properties: ["price", "quantity"],
        },
      );
      (batchData.results || []).forEach((li) => {
        lineItems.push({
          price: Number(li.properties?.price) || 0,
          quantity: Number(li.properties?.quantity) || 0,
        });
      });
    }),
  );

  return lineItems;
};

const getDealProperties = async (dealId, apiClient) => {
  const { data } = await apiClient.get(`/crm/v3/objects/deals/${dealId}`, {
    params: {
      properties: [
        "valor_cancelamento_contrato_glt",
        "valor_cancelamento_contrato_licenca",
        "valor_cancelamento_contrato_locacao",
        "valor_cancelamento_contrato_treinamento",
        "n_de_acessos",
        "quantidade_de_acessos_datacenter",
      ].join(","),
    },
  });
  return data.properties || {};
};

const updateDealAmount = async (dealId, apiClient) => {
  const lineItems = await getAllLineItems(dealId, apiClient);
  const amount = lineItems.reduce((acc, li) => acc + li.price * li.quantity, 0);
  await apiClient.patch(`/crm/v3/objects/deals/${dealId}`, {
    properties: {
      amount,
      // Limpa o rascunho de desconto: um re-lançamento invalida os valores
      // editados pelo operador (as bases foram reescritas com o catálogo).
      discount_draft: "",
    },
  });
  console.log("Amount do deal atualizado:", amount);
};
exports.main = async (event) => {
  const apiClient = axios.create({
    baseURL: "https://api.hubapi.com",
    headers: {
      Authorization: `Bearer ${process.env.PRIVATE_APP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  });

  const { dealId, lancamentos } = event.parameters;

  if (!lancamentos?.length) {
    return { sucesso: false, erro: "Nenhum lançamento informado." };
  }

  const rule = {
    T: "quantos_televendas",
    F: "quantos_pdvs",
    L: "quantos_cnpjs",
    R: "quantas_retaguardas",
    N: null,
  };

  try {
    const lancamentosComSkus = lancamentos.flatMap((lanc) => {
      const skus = lanc.modelo_de_vendas
        ? (modelsMap[lanc.modelo_de_vendas] || []).map((s) => String(s).trim())
        : (lanc.item_modulo || "")
            .split(";")
            .map((s) => s.trim())
            .filter(Boolean);

      return skus.map((sku) => ({ ...lanc, item_modulo: sku }));
    });

    const allSkus = [...new Set(lancamentosComSkus.map((l) => l.item_modulo))];

    console.log("SKUs únicos a buscar:", allSkus);

    const [productsPerSku, dealProperties, existingLineItems] =
      await Promise.all([
        searchProductsBySkus(allSkus, apiClient),
        getDealProperties(dealId, apiClient),
        getExistingLineItems(dealId, apiClient),
      ]);

    const builtItems = lancamentosComSkus.map((lanc) => {
      const product = productsPerSku[lanc.item_modulo];
      if (!product) {
        throw new Error(
          `Produto não encontrado para o SKU: ${lanc.item_modulo}`,
        );
      }
      return buildLineItem(product, lanc, dealId, rule, dealProperties);
    });

    if (!builtItems.length) {
      return {
        sucesso: false,
        erro: "Nenhum produto encontrado para os SKUs informados.",
      };
    }

    const desiredByKey = new Map();
    for (const item of builtItems) {
      const key = makeKey(item.properties.hs_sku);
      desiredByKey.set(key, item);
    }

    const toCreate = [];
    const toUpdate = [];
    for (const [key, item] of desiredByKey) {
      const existingId = existingLineItems[key];
      if (existingId) {
        // O item volta ao valor de catálogo, então o desconto anterior é
        // descartado junto (ver DISCOUNT_STATE_TO_RESET). Itens fora deste
        // lançamento não são tocados e mantêm o desconto deles.
        const properties = { ...item.properties, ...clearedDiscountState() };
        delete properties.hs_product_id;
        toUpdate.push({ id: existingId, properties });
      } else {
        toCreate.push(item);
      }
    }

    console.log(
      `A criar: ${toCreate.length} | A atualizar: ${toUpdate.length}`,
    );

    const [created, updated] = await Promise.all([
      toCreate.length ? createLineItemsBatch(toCreate, apiClient) : [],
      toUpdate.length ? updateLineItemsBatch(toUpdate, apiClient) : [],
    ]);

    console.log(
      "IDs criados:",
      created.map((i) => i.id),
      "| IDs atualizados:",
      updated.map((i) => i.id),
    );

    await updateDealAmount(dealId, apiClient);

    return {
      sucesso: true,
      itens_criados: created.length,
      itens_atualizados: updated.length,
      itens_processados: created.length + updated.length,
    };
  } catch (error) {
    console.error("ERRO:", error.message);
    console.error("STATUS:", error.response?.status);
    console.error("DATA:", JSON.stringify(error.response?.data));
    return { sucesso: false, erro: error.message };
  }
};
