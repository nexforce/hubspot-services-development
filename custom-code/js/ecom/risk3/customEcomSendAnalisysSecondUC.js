const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter as credenciais (Importante: nunca mandar nenhuma credencial para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
/* ==========================================================================
   [08] ANÁLISE EXPRESS FULL: envia análise nova e consulta o resultado
   Cliente: ecom | Contexto: workflow action de custom code do HubSpot, segunda
   tentativa de envio da análise (reenvio do fluxo de análise de CNPJ, produto
   Xpress Full).
   Secrets usadas: RISK_USER, RISK_PASSWORD (login no Risk3),
   UNIDADE_CONSUMIDORA_TOKEN (leitura/gravação do objeto UC no HubSpot).
   Só opera CNPJ (14 dígitos). CPF cai em payload_invalido.
   Saídas: hs_execution_state + risk3_resultado (apenas).
   SUCCESS só quando a análise está concluída E gravada na UC.
   Todo o resto é FAIL_CONTINUE (cai no atraso).
   ========================================================================== */
const axios = require("axios");

const RISK3_BASE = "https://express-api.risk3.net.br/api/v0";
const UC_URL = "https://api.hubapi.com/crm/v3/objects/2-28158895";

// STEP 0: login
async function loginOnRisk3() {
  const username = process.env.RISK_USER;
  const rawPassword = process.env.RISK_PASSWORD;

  if (!username || !rawPassword) {
    throw new Error("Segredos RISK_USER/RISK_PASSWORD não configurados.");
  }

  let password = rawPassword;
  if (rawPassword.includes("%")) {
    try {
      password = decodeURIComponent(rawPassword);
    } catch (e) {
      console.warn("[08][login] '%' inválido na senha. Usando valor original.");
    }
  }

  const response = await axios({
    method: "POST",
    url: `${RISK3_BASE}/login`,
    headers: { "Content-Type": "application/json" },
    data: { username, password },
    timeout: 10000,
  });

  const token = response.data?.data?.token;
  if (!token) throw new Error("Risk3 não retornou token.");
  return token;
}

// STEP 0: envio de análise CNPJ com produto express_full
async function sendAnalysis(document, token) {
  const response = await axios({
    url: `${RISK3_BASE}/analises?product=express_full`,
    method: "POST",
    headers: { "Venidera-AuthToken": token },
    data: { cnpjs: [document] },
    timeout: 15000,
  });
  return response.data;
}

// STEP 0: consulta por ID
async function getAnalysisBy(id, token) {
  const response = await axios({
    url: `${RISK3_BASE}/analises/id/${id}`,
    method: "GET",
    headers: { "Venidera-AuthToken": token },
    timeout: 10000,
  });
  return response.data;
}

// STEP 0: PATCH na UC
async function updateUCBy(id, properties) {
  const response = await axios({
    url: `${UC_URL}/${id}`,
    method: "PATCH",
    headers: { Authorization: `Bearer ${process.env.UNIDADE_CONSUMIDORA_TOKEN}` },
    data: { properties },
    timeout: 8000,
  });
  return response.data;
}

const toDate = (v) => (v ? new Date(v).setUTCHours(0, 0, 0, 0) : "");

// STEP 0: valida só os campos que gravamos
function extractProperties(analysisId, data) {
  const classificacao = data?.analise?.classificacao;
  const scoreFinal = data?.analise?.calculos?.score_final;

  if (!classificacao || scoreFinal == null) return null;

  return {
    identificador__id_: analysisId,
    data_da_solicitacao: toDate(data.data_da_solicitacao ?? data["data_da_solicitação"]),
    data_da_finalizacao: toDate(data.data_da_finalizacao ?? data["data_da_finalização"]),
    data_de_validade: toDate(data.data_de_validade),
    produto_risk3: "express_full",
    recomendacao_final: classificacao,
    alerta_de_restricao: data?.analise?.resultado_da_analise?.alerta ?? "",
    score: Number(scoreFinal).toFixed(2),
    score_alerta_de_restricao: data?.analise?.calculos?.fator_de_alerta ?? "",
    nivel_de_aprovacao: "Nivel 2",
  };
}

exports.main = async (event, callback) => {
  // STEP 1: inputs lidos com optional chaining, nunca presumindo que o evento vem completo.
  const objectId = event?.object?.objectId;
  const cnpjRaw = event?.inputFields?.cnpj;
  const cnpjDigits = (cnpjRaw || "").replace(/\D/g, "");
  const tentativas = Number(event?.inputFields?.risk3_tentativas || 0) + 1;

  // STEP 1: retorno único no padrão callback(payload), igual aos demais scripts da pasta risk3.
  const respond = async (state, resultado) => {
    const cleanState = String(state ?? "");
    const cleanResultado = String(resultado ?? "");

    console.log(`[08][OUT] hs_execution_state=${cleanState} | risk3_resultado=${cleanResultado}`);

    const resultPayload = {
      outputFields: {
        hs_execution_state: cleanState,
        risk3_resultado: cleanResultado,
      },
    };

    return await callback(resultPayload);
  };

  // STEP 1: grava estado na UC (best effort)
  const saveState = async (resultado, extra = {}) => {
    try {
      await updateUCBy(objectId, {
        risk3_resultado: resultado,
        risk3_tentativas: tentativas,
        ...extra,
      });
    } catch (e) {
      console.warn("[08][saveState] Falha ao gravar estado:", e.message);
    }
  };

  try {
    // STEP 1b: sem objectId não há onde gravar nada, encerra sem tentar saveState.
    if (!objectId) {
      console.error("[08][STEP 1b] Evento sem object.objectId.");
      return await respond("FAIL_CONTINUE", "erro");
    }

    // STEP 2: este fluxo só opera CNPJ (14 dígitos)
    if (cnpjDigits.length !== 14) {
      console.error(
        `[08][STEP 2] Documento não é CNPJ (${cnpjDigits.length} dígitos): "${cnpjRaw}"`
      );
      await saveState("payload_invalido", { risk3_payload_invalido: true });
      return await respond("FAIL_CONTINUE", "payload_invalido");
    }

    // STEP 3: autenticar
    const token = await loginOnRisk3();

    // STEP 4: enviar análise nova (Express Full)
    const sendResponse = await sendAnalysis(cnpjRaw, token);
    const analysisId = sendResponse?.data?.records?.[0]?.id;

    if (!analysisId) {
      console.error(
        "[08][STEP 4] Risk3 não retornou ID da análise:",
        JSON.stringify(sendResponse)
      );
      await saveState("erro");
      return await respond("FAIL_CONTINUE", "erro");
    }

    console.log(`[08][STEP 4] Análise Express Full criada: ${analysisId}.`);

    // STEP 5: gravar ID e estado pendente imediatamente
    // (garante rastreabilidade mesmo se a consulta falhar abaixo)
    await saveState("pendente", {
      identificador__id_: analysisId,
      produto_risk3: "express_full",
      risk3_payload_invalido: false,
    });

    // STEP 6: consultar o resultado
    const analysis = await getAnalysisBy(analysisId, token);
    const data = analysis?.data;

    if (!data || typeof data !== "object") {
      console.error(`[08][STEP 6] Risk3 devolveu payload vazio para ${analysisId}.`);
      await saveState("erro", { identificador__id_: analysisId });
      return await respond("FAIL_CONTINUE", "erro");
    }

    // STEP 7: ainda não concluída -> pendente + atraso
    if (data.status !== "Concluída") {
      console.log(
        `[08][STEP 7] Análise ${analysisId} não concluída (status: ${data.status}).`
      );
      await saveState("pendente", { identificador__id_: analysisId });
      return await respond("FAIL_CONTINUE", "pendente");
    }

    // STEP 8: concluída -> extrair e validar
    const properties = extractProperties(analysisId, data);

    if (!properties) {
      console.warn(
        `[08][STEP 8] Análise ${analysisId} concluída sem classificação/score.`,
        JSON.stringify(data?.analise || {})
      );
      await saveState("payload_invalido", {
        identificador__id_: analysisId,
        risk3_payload_invalido: true,
      });
      return await respond("FAIL_CONTINUE", "payload_invalido");
    }

    // STEP 9: gravar resultado + estado concluida
    await updateUCBy(objectId, {
      ...properties,
      risk3_payload_invalido: false,
      risk3_resultado: "concluida",
      risk3_tentativas: tentativas,
    });

    console.log(
      `[08][STEP 9] UC ${objectId} concluída: ${properties.recomendacao_final} / score ${properties.score}.`
    );

    return await respond("SUCCESS", "concluida");
  } catch (err) {
    // STEP 10: erro inesperado -> erro + atraso
    const status = err.response?.status;
    console.error(
      `[08][STEP 10] Erro [${status || "NO_RESPONSE"}]:`,
      err.response?.data || err.message
    );

    await saveState("erro");
    return await respond("FAIL_CONTINUE", "erro");
  }
};