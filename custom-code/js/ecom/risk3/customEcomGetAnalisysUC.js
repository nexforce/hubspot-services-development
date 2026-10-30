const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter as credenciais (Importante: nunca mandar nenhuma credencial para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
/* ==========================================================================
   [07] CONSULTA DO RESULTADO DA ANÁLISE NA RISK3
   Cliente: ecom | Contexto: workflow action de custom code do HubSpot, acionada
   no fluxo que consulta o resultado de uma análise já enviada à Risk3, usando o
   identificador__id_ gravado na Unidade Consumidora (UC) pelo fluxo anterior (06).
   Secrets usadas: RISK_USER, RISK_PASSWORD (login no Risk3),
   UNIDADE_CONSUMIDORA_TOKEN (leitura/gravação do objeto UC no HubSpot).
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
      console.warn("[07][login] '%' inválido na senha. Usando valor original.");
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

// STEP 0: consulta da análise
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

const PRODUCT_MAPPER = {
  "Xpress Full": "express_full",
  "Xpress Light": "express_light",
  "Xpress Pessoa Física": "express_pf",
};

// STEP 0: valida só os campos que gravamos
function extractProperties(analysisId, data, produtoFallback) {
  const classificacao = data?.analise?.classificacao;
  const scoreFinal = data?.analise?.calculos?.score_final;

  if (!classificacao || scoreFinal == null) return null;

  const produto = PRODUCT_MAPPER[data?.produto] || produtoFallback || "express_light";

  return {
    identificador__id_: analysisId,
    data_da_solicitacao: toDate(data.data_da_solicitacao ?? data["data_da_solicitação"]),
    data_da_finalizacao: toDate(data.data_da_finalizacao ?? data["data_da_finalização"]),
    data_de_validade: toDate(data.data_de_validade),
    produto_risk3: produto,
    recomendacao_final: classificacao,
    alerta_de_restricao: data?.analise?.resultado_da_analise?.alerta ?? "",
    score: Number(scoreFinal).toFixed(2),
    score_alerta_de_restricao: data?.analise?.calculos?.fator_de_alerta ?? "",
    nivel_de_aprovacao: produto === "express_full" ? "Nivel 2" : "Nivel 1",
  };
}

exports.main = async (event, callback) => {
  // STEP 1: inputs lidos com optional chaining, nunca presumindo que o evento vem completo.
  // Isso nunca estoura exceção, então pode ficar fora do try com segurança.
  const objectId = event?.object?.objectId;
  const analysisId = event?.inputFields?.identificador__id_;
  const tentativas = Number(event?.inputFields?.risk3_tentativas || 0) + 1;

  // STEP 1: retorno único no padrão callback(payload), sem erro-first e sem null na frente,
  // igual ao padrão já usado nos demais scripts da pasta risk3.
  const respond = async (state, resultado) => {
    const cleanState = String(state ?? "");
    const cleanResultado = String(resultado ?? "");

    console.log(`[07][OUT] hs_execution_state=${cleanState} | risk3_resultado=${cleanResultado}`);

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
      console.warn("[07][saveState] Falha ao gravar estado:", e.message);
    }
  };

  try {
    // STEP 1b: sem objectId não há onde gravar nada, encerra sem tentar saveState.
    if (!objectId) {
      console.error("[07][STEP 1b] Evento sem object.objectId.");
      return await respond("FAIL_CONTINUE", "erro");
    }

    // STEP 2: exigir o ID da análise
    if (!analysisId) {
      console.error("[07][STEP 2] UC sem identificador__id_: análise não enviada no fluxo 06.");
      await saveState("erro");
      return await respond("FAIL_CONTINUE", "erro");
    }

    // STEP 3: autenticar
    const token = await loginOnRisk3();

    // STEP 4: consultar
    const analysis = await getAnalysisBy(analysisId, token);
    const data = analysis?.data;

    // STEP 5: payload vazio -> erro
    if (!data || typeof data !== "object") {
      console.error(`[07][STEP 5] Risk3 devolveu payload vazio para ${analysisId}.`);
      await saveState("erro");
      return await respond("FAIL_CONTINUE", "erro");
    }

    // STEP 6: ainda não concluída -> pendente + atraso
    if (data.status !== "Concluída") {
      console.log(`[07][STEP 6] Análise ${analysisId} não concluída (status: ${data.status}).`);
      await saveState("pendente");
      return await respond("FAIL_CONTINUE", "pendente");
    }

    // STEP 7: concluída -> extrair e validar
    const properties = extractProperties(analysisId, data, event.inputFields.produto_risk3);

    if (!properties) {
      console.warn(
        `[07][STEP 7] Análise ${analysisId} concluída sem classificação/score.`,
        JSON.stringify(data?.analise || {})
      );
      await saveState("payload_invalido", { risk3_payload_invalido: true });
      return await respond("FAIL_CONTINUE", "payload_invalido");
    }

    // STEP 8: gravar resultado + estado concluida
    await updateUCBy(objectId, {
      ...properties,
      risk3_payload_invalido: false,
      risk3_resultado: "concluida",
      risk3_tentativas: tentativas,
    });

    console.log(
      `[07][STEP 8] UC ${objectId} concluída: ${properties.recomendacao_final} / score ${properties.score}.`
    );

    return await respond("SUCCESS", "concluida");
  } catch (err) {
    // STEP 9: erro inesperado -> erro + atraso
    const status = err.response?.status;
    console.error(
      `[07][STEP 9] Erro [${status || "NO_RESPONSE"}]:`,
      err.response?.data || err.message
    );

    await saveState("erro");
    return await respond("FAIL_CONTINUE", "erro");
  }
};
