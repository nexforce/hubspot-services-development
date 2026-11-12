// Custom code de acao de workflow baseada em negocio (deal), cliente Veolia.
// Conta HubSpot: 43565069 (plano STANDARD, sem sandbox).
// Evento: envia o negocio para a Uplog, criando primeiro o gerador e depois o
// contrato (gerador + local de fatura + locais de coleta + residuos).
// Direcao unica: HubSpot -> Uplog. O HubSpot nao recebe retorno de dados.
// Gatilho: workflow de negocio, no estagio em que o negocio deve ser enviado.
//
// Roteamento por unidade: o value interno da propriedade unidade_de_atendimento do
// negocio e comparado com o mapa UNIT_MAP definido no codigo. PMA Sul = Florianopolis,
// Serquip = Alagoas (values verificados na live do portal). O codigoCnpj enviado no
// contrato continua vindo de codigo_da_unidade_da_veolia, conforme o de/para.
// Se o mapa estiver vazio e a propriedade vier preenchida, o script para com erro
// de "unidade nao resolvida" ANTES de qualquer chamada externa.
//
// Ambiente: trocado manualmente na constante UPLOG_ENVIRONMENT logo abaixo ("hom" ou
// "prod"). Nao vem mais de variavel de ambiente do processo.
//
// Secrets usadas (nomes, valores nunca no codigo):
//   HUBSPOT_TOKEN_PRODUCAO_VEOLIA (leitura do negocio, contato, empresa e locais de coleta)
//   UPLOG_<UNIDADE>_BASE_URL_HOMOLOGACAO / _PRODUCAO
//   UPLOG_HOMOLOGACAO_USERNAME / UPLOG_HOMOLOGACAO_PASSWORD (login da Uplog, homologacao)
//   UPLOG_PROD_USERNAME / UPLOG_PROD_PASSWORD
//
// Runtime: Node 24, CommonJS. Usa fetch nativo, nunca o pacote request.
// Nao usa "type": "module" em nenhum package.json.
//
// Bloco de teste local: depois do marcador [FINAL] abaixo. Ao colar no portal,
// copie deste arquivo apenas o trecho que vai do inicio ate o marcador [FINAL].

const HUBSPOT_BASE_URL = "https://api.hubapi.com";

// Nome da secret que guarda o token do HubSpot (conta Veolia). Mantem a nomenclatura
// usada no .env do workspace: HUBSPOT_TOKEN_PRODUCAO_VEOLIA.
const HUBSPOT_TOKEN_ENV = "HUBSPOT_TOKEN_PRODUCAO_VEOLIA";

// Ambiente ativo da integracao. Alterar manualmente aqui antes de colar no portal:
// "hom" (homologacao) ou "prod" (producao). Nao vem de variavel de ambiente.
const UPLOG_ENVIRONMENT = "hom";

const DEAL_PROPERTIES = [
  "cpf",
  "cnpj",
  "veo_commercialname__c",
  "nome_fantasia",
  "codigo_cliente",
  "status",
  "utilizado_para_alimentar_o_lats_an8",
  "codigo_da_unidade_da_veolia",
  "unidade_de_atendimento",
  "hs_object_id",
  "observacao",
  "titulo",
  "e_mail_de_contato",
  "endereco",
  "logadouro",
  "numero",
  "complemento",
  "distrito",
  "bairro",
  "cidade",
  "estado_regiao",
];

const CONTACT_PROPERTIES = ["firstname", "lastname", "email", "phone"];

const COMPANY_PROPERTIES = ["billingpostalcode"];

// Objeto customizado "Locais de Coleta" (objectTypeId confirmado na live do portal).
const COLLECTION_SITE_OBJECT_TYPE_ID = "2-71880835";

// Associacao Local de Coleta -> Itens de linha, confirmada na live do portal.
const COLLECTION_SITE_LINE_ITEM_TYPE_ID = 84;

const LINE_ITEM_OBJECT_TYPE = "line_items";

// Propriedades do item de linha usadas para montar os residuos.
const LINE_ITEM_PROPERTIES = ["codigo_do_residuo", "frequencia_coleta", "name"];

// Mapa de "Frequencia de coleta" do HubSpot para o codigo numerico da Uplog.
// As chaves sao exatamente os internal values da propriedade frequencia_coleta
// (objeto line_items), com acento e caixa originais, sem normalizacao.
// Valores considerados por enquanto (definidos pelo consultor):
//   "Conforme solicitação" = 1
//   "Diária"               = 2
//   "Semanal"              = 3,0 (padrao; o dia da semana ainda nao e detalhado)
//   "Mensal"               = 4,0 (padrao; o dia do mes ainda nao e detalhado)
// O de/para preve tambem o codigo 5 (Sequencia), mas esse valor nao existe no enum
// atual da propriedade.
const FREQUENCY_CODE_MAP = {
  "Conforme solicitação": "1",
  "Diária": "2",
  "Semanal": "3,0",
  "Mensal": "4,0",
};

function resolveFrequencyCode(value) {
  const key = String(value || "").trim();
  const code = FREQUENCY_CODE_MAP[key];
  if (!code) {
    return { code: "", mapped: false };
  }
  return { code, mapped: true };
}

const COLLECTION_SITE_PROPERTIES = [
  "titulo",
  "nome",
  "cep",
  "logadouro",
  "numero",
  "complemento",
  "bairro",
  "cidade",
  "estado_regiao",
  "observacao",
  "status",
];

// Configuracao de credenciais por ambiente (hom/prod). Usuario e senha do login,
// sem recorte de unidade (decisao do consultor). A base URL continua por unidade.
const ENV_CONFIG = {
  hom: {
    username: process.env.UPLOG_HOMOLOGACAO_USERNAME,
    password: process.env.UPLOG_HOMOLOGACAO_PASSWORD,
  },
  prod: {
    username: process.env.UPLOG_PROD_USERNAME,
    password: process.env.UPLOG_PROD_PASSWORD,
  },
};

// Base URL por unidade e ambiente. As chaves de unidade batem com as do mapa de
// unidades UNIT_MAP logo abaixo.
const UNIT_BASE_URL = {
  floripa: {
    hom: process.env.UPLOG_FLORIPA_BASE_URL_HOMOLOGACAO,
    prod: process.env.UPLOG_FLORIPA_BASE_URL_PRODUCAO,
  },
  alagoas: {
    hom: process.env.UPLOG_ALAGOAS_BASE_URL_HOMOLOGACAO,
    prod: process.env.UPLOG_ALAGOAS_BASE_URL_PRODUCAO,
  },
};

// Mapa unidade -> value interno da propriedade unidade_de_atendimento do negocio.
// As chaves de unidade batem com as de UNIT_BASE_URL. Os values foram verificados
// na live do portal: PMA Sul = Florianopolis, Serquip = Alagoas. A comparacao e
// feita pelo value interno do enum, nao pelo label.
const ROUTING_PROPERTY = "unidade_de_atendimento";
const UNIT_MAP = {
  floripa: "PMA Sul",
  alagoas: "Serquip",
};

const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;

class UplogError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "UplogError";
    this.code = code;
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isTransientStatus(status) {
  return status === 429 || status >= 500;
}

function buildUnitMap(unitMap) {
  // Filtra entradas com valor vazio: unidade ainda nao configurada nao participa do roteamento.
  const map = {};
  Object.keys(unitMap || {}).forEach((unitKey) => {
    const unitValue = unitMap[unitKey];
    if (unitValue !== undefined && unitValue !== null && String(unitValue).trim() !== "") {
      map[unitKey] = String(unitValue).trim();
    }
  });
  return map;
}

function resolveUnit(dealUnitValue, unitMap) {
  const configuredUnits = Object.keys(unitMap);
  if (configuredUnits.length === 0) {
    throw new UplogError(
      "UNIT_MAP_EMPTY",
      "UNIT_MAP esta vazio no codigo. Preencha os values reais de unidade_de_atendimento para floripa e alagoas antes de executar.",
    );
  }
  const normalizedDealUnit = dealUnitValue ? String(dealUnitValue).trim() : "";
  const matchedUnit = configuredUnits.find(
    (unitKey) => unitMap[unitKey] === normalizedDealUnit,
  );
  if (!matchedUnit) {
    throw new UplogError(
      "UNIT_NOT_RESOLVED",
      `unidade nao resolvida para unidade_de_atendimento='${normalizedDealUnit}'. Confira o valor da propriedade e o UNIT_MAP no codigo.`,
    );
  }
  return matchedUnit;
}

function resolveEnvironment() {
  const environment = String(UPLOG_ENVIRONMENT).trim().toLowerCase();
  if (environment !== "hom" && environment !== "prod") {
    throw new UplogError(
      "INVALID_ENVIRONMENT",
      `UPLOG_ENVIRONMENT invalido: '${environment}'. Use 'hom' ou 'prod'.`,
    );
  }
  return environment;
}

function resolveCredentials(unit, environment) {
  const baseUrl = UNIT_BASE_URL[unit] && UNIT_BASE_URL[unit][environment];
  const login = ENV_CONFIG[environment];
  const credentials = {
    baseUrl,
    username: login && login.username,
    password: login && login.password,
  };
  const missing = ["baseUrl", "username", "password"].filter(
    (field) => !credentials[field],
  );
  if (missing.length > 0) {
    throw new UplogError(
      "MISSING_CREDENTIALS",
      `credenciais ausentes para a unidade '${unit}' no ambiente '${environment}': ${missing.join(", ")}.`,
    );
  }
  return {
    baseUrl: credentials.baseUrl.replace(/\/+$/, ""),
    username: credentials.username,
    password: credentials.password,
  };
}

// Converte estado por extenso (ex.: "Santa Catarina") para a sigla de 2 letras.
// Se ja vier uma sigla de 2 letras, devolve em maiusculo. Sem tabela, retorna o original.
const STATE_ACRONYMS = {
  acre: "AC",
  alagoas: "AL",
  amapa: "AP",
  amazonas: "AM",
  bahia: "BA",
  ceara: "CE",
  "distrito federal": "DF",
  "espirito santo": "ES",
  goias: "GO",
  maranhao: "MA",
  "mato grosso": "MT",
  "mato grosso do sul": "MS",
  "minas gerais": "MG",
  para: "PA",
  paraiba: "PB",
  parana: "PR",
  pernambuco: "PE",
  piaui: "PI",
  "rio de janeiro": "RJ",
  "rio grande do norte": "RN",
  "rio grande do sul": "RS",
  rondonia: "RO",
  roraima: "RR",
  "santa catarina": "SC",
  "sao paulo": "SP",
  sergipe: "SE",
  tocantins: "TO",
};

function toUf(value) {
  if (!value) {
    return "";
  }
  const trimmed = String(value).trim();
  if (trimmed.length === 2) {
    return trimmed.toUpperCase();
  }
  const normalized = trimmed
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return STATE_ACRONYMS[normalized] || trimmed;
}

function firstNonEmpty(...values) {
  const found = values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
  return found === undefined ? "" : String(found).trim();
}

function buildResiduos(lineItemPropertiesList) {
  // Cada residuo e um item de linha associado ao local de coleta. Um item vira um
  // elemento de residuos com o codigo do residuo e a frequencia convertida para o
  // codigo numerico da Uplog (FREQUENCY_CODE_MAP).
  const residuos = [];
  (lineItemPropertiesList || []).forEach((properties) => {
    if (!properties) {
      return;
    }
    const residueCode = properties.codigo_do_residuo;
    if (residueCode === undefined || residueCode === null || String(residueCode).trim() === "") {
      return;
    }
    const frequency = resolveFrequencyCode(properties.frequencia_coleta);
    if (!frequency.mapped) {
      console.warn(
        `[veolia][uplog][buildResiduos] frequencia_coleta sem mapeamento: '${properties.frequencia_coleta || ""}' (residuo ${residueCode})`,
      );
    }
    residuos.push({
      codigoResiduo: String(residueCode).trim(),
      frequencia: frequency.code,
    });
  });
  return residuos;
}

async function hubspotRequest(path, token) {
  if (!token) {
    throw new UplogError(
      "MISSING_HUBSPOT_TOKEN",
      `${HUBSPOT_TOKEN_ENV} ausente. Configure a secret com o token do HubSpot da conta Veolia.`,
    );
  }
  const response = await fetch(`${HUBSPOT_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new UplogError(
      "HUBSPOT_READ_FAILED",
      `falha ao ler o HubSpot (HTTP ${response.status}): ${errorBody.slice(0, 300)}`,
    );
  }
  return response.json();
}

async function hubspotPost(path, token, body) {
  if (!token) {
    throw new UplogError(
      "MISSING_HUBSPOT_TOKEN",
      `${HUBSPOT_TOKEN_ENV} ausente. Configure a secret com o token do HubSpot da conta Veolia.`,
    );
  }
  const response = await fetch(`${HUBSPOT_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    throw new UplogError(
      "HUBSPOT_READ_FAILED",
      `falha ao ler o HubSpot (HTTP ${response.status}): ${errorBody.slice(0, 300)}`,
    );
  }
  return response.json();
}

async function fetchDeal(dealId, token) {
  const query = new URLSearchParams({ properties: DEAL_PROPERTIES.join(",") });
  const deal = await hubspotRequest(`/crm/v3/objects/deals/${dealId}?${query}`, token);
  return deal.properties || {};
}

async function fetchPrimaryContact(dealId, token) {
  const associations = await hubspotRequest(
    `/crm/v3/objects/deals/${dealId}/associations/contacts`,
    token,
  );
  const results = (associations && associations.results) || [];
  if (results.length === 0) {
    return {};
  }
  // Prefere o contato marcado como primario; senao, o primeiro da lista.
  const primary = results.find((association) => {
    const labels = association.associationTypes || association.labels || [];
    const typeIds = association.associationTypeId !== undefined ? [association.associationTypeId] : [];
    return [...labels, ...typeIds].some((label) => {
      const text = typeof label === "string" ? label : JSON.stringify(label || {});
      return text.toLowerCase().includes("primary");
    });
  });
  const contactId = (primary || results[0]).toObjectId || (primary || results[0]).id;
  if (!contactId) {
    return {};
  }
  const query = new URLSearchParams({ properties: CONTACT_PROPERTIES.join(",") });
  const contact = await hubspotRequest(
    `/crm/v3/objects/contacts/${contactId}?${query}`,
    token,
  );
  return contact.properties || {};
}

async function fetchCompanyPostalCode(dealId, token) {
  const associations = await hubspotRequest(
    `/crm/v3/objects/deals/${dealId}/associations/companies`,
    token,
  );
  const results = (associations && associations.results) || [];
  if (results.length === 0) {
    return "";
  }
  const companyId = results[0].toObjectId || results[0].id;
  const query = new URLSearchParams({ properties: COMPANY_PROPERTIES.join(",") });
  const company = await hubspotRequest(
    `/crm/v3/objects/companies/${companyId}?${query}`,
    token,
  );
  return (company.properties && company.properties.billingpostalcode) || "";
}

async function fetchLineItemIdsForSite(siteId, token) {
  const associations = await hubspotRequest(
    `/crm/v4/objects/${COLLECTION_SITE_OBJECT_TYPE_ID}/${siteId}/associations/${LINE_ITEM_OBJECT_TYPE}`,
    token,
  );
  const results = (associations && associations.results) || [];
  return results
    .filter((association) => {
      const types = association.associationTypes || [];
      if (types.length === 0) {
        return true;
      }
      return types.some(
        (type) => Number(type.typeId) === COLLECTION_SITE_LINE_ITEM_TYPE_ID,
      );
    })
    .map((association) => association.toObjectId)
    .filter(Boolean);
}

async function fetchLineItemsByIds(ids, token) {
  if (ids.length === 0) {
    return {};
  }
  const body = {
    inputs: ids.map((id) => ({ id: String(id) })),
    properties: LINE_ITEM_PROPERTIES,
  };
  const result = await hubspotPost(
    `/crm/v3/objects/${LINE_ITEM_OBJECT_TYPE}/batch/read`,
    token,
    body,
  );
  const byId = {};
  ((result && result.results) || []).forEach((item) => {
    byId[String(item.id)] = item.properties || {};
  });
  return byId;
}

async function fetchCollectionSites(dealId, token) {
  const associations = await hubspotRequest(
    `/crm/v3/objects/deals/${dealId}/associations/${COLLECTION_SITE_OBJECT_TYPE_ID}`,
    token,
  );
  const results = (associations && associations.results) || [];
  if (results.length === 0) {
    return [];
  }
  const query = new URLSearchParams({ properties: COLLECTION_SITE_PROPERTIES.join(",") });
  const sites = await Promise.all(
    results.map(async (association) => {
      const siteId = association.toObjectId || association.id;
      const site = await hubspotRequest(
        `/crm/v3/objects/${COLLECTION_SITE_OBJECT_TYPE_ID}/${siteId}?${query}`,
        token,
      );
      const lineItemIds = await fetchLineItemIdsForSite(siteId, token);
      return { id: String(siteId), properties: site.properties || {}, lineItemIds };
    }),
  );

  // Uma unica leitura em lote cobre os itens de linha de todos os locais de coleta.
  const allLineItemIds = [
    ...new Set(sites.flatMap((site) => site.lineItemIds.map((id) => String(id)))),
  ];
  const lineItemsById = await fetchLineItemsByIds(allLineItemIds, token);

  return sites.map((site) => ({
    id: site.id,
    properties: site.properties,
    lineItems: site.lineItemIds
      .map((id) => lineItemsById[String(id)])
      .filter(Boolean),
  }));
}

async function loginToUplog(credentials) {
  // Login e POST com JSON { username, password } no corpo. GET com query string
  // retorna 404 na API real, por isso nao e usado.
  const endpoint = `${credentials.baseUrl}/wp-json/jwt-auth/v1/token`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: credentials.username,
      password: credentials.password,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) {
    throw new UplogError(
      "UPLOG_LOGIN_FAILED",
      `credencial da Uplog recusada (HTTP ${response.status}): ${body.code || ""} ${body.message || ""}`.trim(),
    );
  }
  if (!response.ok || !body.token) {
    throw new UplogError(
      "UPLOG_LOGIN_FAILED",
      `login na Uplog falhou (HTTP ${response.status}): ${body.code || ""} ${body.message || ""}`.trim(),
    );
  }
  return body.token;
}

function interpretUplogResponse(body) {
  const responseFlag = body && body.response === true;
  const statusCode = body && body.data && body.data.status !== undefined ? body.data.status : null;
  return {
    ok: responseFlag,
    code: body && body.code !== undefined ? String(body.code) : "",
    message: body && body.message !== undefined ? String(body.message) : "",
    status: statusCode,
  };
}

// Executa um POST de negocio na Uplog. Reautentica UMA vez em 401, aplica backoff
// em 429/5xx com no maximo 3 tentativas, e para sem loop em response:false.
async function postUplog(credentials, path, payload, getToken) {
  let token = await getToken();
  let reauthenticated = false;
  let attempt = 0;

  while (attempt < MAX_ATTEMPTS) {
    attempt += 1;
    const response = await fetch(`${credentials.baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 401 && !reauthenticated) {
      reauthenticated = true;
      token = await getToken(true);
      attempt = 0;
      continue;
    }

    if (isTransientStatus(response.status)) {
      if (attempt < MAX_ATTEMPTS) {
        await delay(RETRY_BASE_DELAY_MS * attempt);
        continue;
      }
      const errorText = await response.text();
      throw new UplogError(
        "UPLOG_TRANSIENT_EXHAUSTED",
        `Uplog respondeu HTTP ${response.status} apos ${MAX_ATTEMPTS} tentativas: ${errorText.slice(0, 300)}`,
      );
    }

    const body = await response.json().catch(() => ({}));

    if (response.status === 401) {
      throw new UplogError(
        "UPLOG_UNAUTHORIZED",
        `Uplog rejeitou a autenticacao (HTTP 401) apos reautenticar: ${body.code || ""} ${body.message || ""}`.trim(),
      );
    }

    const interpreted = interpretUplogResponse(body);
    if (interpreted.status !== null && isTransientStatus(Number(interpreted.status)) && attempt < MAX_ATTEMPTS) {
      await delay(RETRY_BASE_DELAY_MS * attempt);
      continue;
    }

    return { httpStatus: response.status, interpreted };
  }

  throw new UplogError("UPLOG_UNEXPECTED", "fluxo de POST na Uplog terminou sem resposta.");
}

exports.main = async (event) => {
  let unit = "";
  let generatorOk = false;
  let contractOk = false;

  try {
    if (!process.env[HUBSPOT_TOKEN_ENV]) {
      throw new UplogError(
        "MISSING_HUBSPOT_TOKEN",
        `${HUBSPOT_TOKEN_ENV} ausente. Configure a secret com o token do HubSpot da conta Veolia.`,
      );
    }

    const dealId =
      (event && event.object && event.object.objectId) ||
      (event && event.objectId) ||
      (event && event.object && event.object.id);
    if (!dealId) {
      throw new UplogError("MISSING_DEAL_ID", "nao foi possivel identificar o negocio no evento.");
    }

    const token = process.env[HUBSPOT_TOKEN_ENV];

    // Ambiente (constante no codigo) e mapa de unidades sao validados antes de qualquer
    // chamada externa.
    const environment = resolveEnvironment();
    const unitMap = buildUnitMap(UNIT_MAP);

    // Se o evento ja trouxer a propriedade de roteamento, resolve a unidade aqui,
    // antes da primeira leitura no HubSpot. Se nao trouxer, a unidade e resolvida logo
    // apos a leitura do negocio e sempre antes de qualquer chamada para a Uplog.
    const eventUnitCode =
      event &&
      event.inputFields &&
      event.inputFields[ROUTING_PROPERTY];
    if (eventUnitCode) {
      unit = resolveUnit(eventUnitCode, unitMap);
      resolveCredentials(unit, environment);
    }

    const deal = await fetchDeal(dealId, token);
    const contact = await fetchPrimaryContact(dealId, token);
    const companyPostalCode = await fetchCompanyPostalCode(dealId, token);
    const collectionSites = await fetchCollectionSites(dealId, token);

    // Unidade confirmada pelo value interno de unidade_de_atendimento lido do negocio.
    // Se nao casar com o mapa, para aqui, antes de qualquer chamada para a Uplog.
    unit = resolveUnit(deal[ROUTING_PROPERTY], unitMap);
    const credentials = resolveCredentials(unit, environment);

    // Cache do token JWT apenas durante esta execucao, para reutilizar entre as duas etapas.
    let cachedToken = null;
    const getToken = async (forceRefresh) => {
      if (forceRefresh || !cachedToken) {
        cachedToken = await loginToUplog(credentials);
      }
      return cachedToken;
    };

    // Etapa 1, gerador.
    const cnpjCpf = firstNonEmpty(deal.cpf, deal.cnpj);
    if (!cnpjCpf) {
      throw new UplogError(
        "MISSING_DOCUMENT",
        "negocio sem cpf nem cnpj. Preencha um dos dois antes de enviar para a Uplog.",
      );
    }
    const generatorPayload = {
      cnpjCpf,
      razaoSocial: deal.veo_commercialname__c || "",
      nomeFantasia: deal.nome_fantasia || "",
      codigoCliente: deal.codigo_cliente || "",
      status: deal.status || "",
    };
    const generatorResult = await postUplog(
      credentials,
      "/wp-json/api/v11/gerador",
      generatorPayload,
      getToken,
    );
    if (!generatorResult.interpreted.ok) {
      throw new UplogError(
        "UPLOG_GENERATOR_FAILED",
        `gerador nao confirmado (HTTP ${generatorResult.httpStatus}, code ${generatorResult.interpreted.code || "-"}, message ${generatorResult.interpreted.message || "-"}, data.status ${generatorResult.interpreted.status ?? "-"}).`,
      );
    }
    generatorOk = true;

    // Etapa 2, contrato. codigoCliente reutiliza o mesmo valor do gerador (decisao confirmada).
    const contactName = firstNonEmpty(contact.firstname, contact.lastname, contact.email);
    const contractPayload = {
      codigoCliente: generatorPayload.codigoCliente,
      codigoCnpj: deal.codigo_da_unidade_da_veolia || "",
      codigoContrato: deal.hs_object_id || "",
      nome: contactName,
      email: contact.email || "",
      telefone: contact.phone || "",
      status: deal.status || "",
      observacao: deal.observacao || "",
      localFatura: {
        codigoLocal: deal.endereco || "",
        titulo: deal.titulo || "",
        email: deal.e_mail_de_contato || "",
        cep: companyPostalCode || "",
        logradouro: deal.logadouro || "",
        numero: deal.numero || "",
        complemento: deal.complemento || "",
        distrito: deal.distrito || "",
        bairro: deal.bairro || "",
        cidade: deal.cidade || "",
        uf: toUf(deal.estado_regiao),
        observacao: deal.observacao || "",
      },
      locaisDeColeta: collectionSites.map((site) => ({
        codigoLocal: String(site.id),
        titulo: site.properties.titulo || "",
        // Premissa: nesta fase o local de coleta reaproveita o e-mail do contato do negocio.
        email: contact.email || "",
        cep: site.properties.cep || "",
        logradouro: site.properties.logadouro || "",
        numero: site.properties.numero || "",
        complemento: site.properties.complemento || "",
        bairro: site.properties.bairro || "",
        cidade: site.properties.cidade || "",
        uf: toUf(site.properties.estado_regiao),
        observacao: site.properties.observacao || "",
        status: site.properties.status || "",
        residuos: buildResiduos(site.lineItems),
      })),
    };
    const contractResult = await postUplog(
      credentials,
      "/wp-json/api/v11/contrato",
      contractPayload,
      getToken,
    );
    if (!contractResult.interpreted.ok) {
      throw new UplogError(
        "UPLOG_CONTRACT_FAILED",
        `contrato nao confirmado (HTTP ${contractResult.httpStatus}, code ${contractResult.interpreted.code || "-"}, message ${contractResult.interpreted.message || "-"}, data.status ${contractResult.interpreted.status ?? "-"}).`,
      );
    }
    contractOk = true;

    console.log(
      `[veolia][uplog][main] Uplog OK. unidade=${unit} gerador=${generatorOk} contrato=${contractOk} locais=${contractPayload.locaisDeColeta.length}`,
    );

    return {
      uplog_status: "SUCCESS",
      uplog_unidade: unit,
      uplog_gerador_ok: String(generatorOk),
      uplog_contrato_ok: String(contractOk),
      uplog_erro_code: "",
      uplog_erro_message: "",
    };
  } catch (error) {
    const code = error && error.code ? error.code : "UNEXPECTED_ERROR";
    const message = error && error.message ? error.message : String(error);
    // Log sem dados sensiveis: apenas codigo, mensagem e status retornados.
    console.error(`[veolia][uplog][main] Uplog erro [${code}]: ${message}`);
    return {
      uplog_status: "ERROR",
      uplog_unidade: unit,
      uplog_gerador_ok: String(generatorOk),
      uplog_contrato_ok: String(contractOk),
      uplog_erro_code: String(code),
      uplog_erro_message: String(message).slice(0, 500),
    };
  }
};

// [FINAL]

// ===== Bloco de teste local. NAO colar no portal. =====
// Uso: node custom-code/js/veolia/veoliaUplogSync.js <dealId>
// As variaveis de ambiente devem estar exportadas no shell antes de rodar.
const dotenv = require("dotenv");
dotenv.config();

async function runLocalTest() {
  const dealId = process.argv[2];
  if (!dealId) {
    console.error("Informe o id do negocio: node veoliaUplogSync.js <dealId>");
    process.exitCode = 1;
    return;
  }
  const output = await exports.main({ object: { objectId: dealId } });
  console.log("OutputFields:", JSON.stringify(output, null, 2));
}

if (require.main === module) {
  runLocalTest();
}
