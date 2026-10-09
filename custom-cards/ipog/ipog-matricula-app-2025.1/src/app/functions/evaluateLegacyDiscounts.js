const axios = require("axios");

const NIVEL_POS = "Pós-graduação";
const NIVEL_CEU = "Curso de extensão universitária";
const NIVEL_GRADUACAO = "Graduação";
const MODALIDADES_POS_PRESENCIAL = ["Ao Vivo", "Remoto ao vivo", "Presencial"];
const MODALIDADES_POS_EAD = ["Removo gravado", "EAD", "Online"];
const CONVENIO_ESPECIAL = "Convênio especial";

function parseNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

const atLeast = (value, threshold) => value !== null && value >= threshold;
const equalTo = (value, expected) => value !== null && value === expected;

function maxIndicacao(values) {
  const numeric = (values || []).filter(
    (value) => value !== null && value !== undefined,
  );
  return numeric.length > 0 ? Math.max(...numeric) : null;
}

function temConvenioEspecial(tiposDeConvenio) {
  return (tiposDeConvenio || []).some((tipo) =>
    String(tipo || "").split(";").includes(CONVENIO_ESPECIAL),
  );
}

function evaluateLegacyDiscounts(ctx = {}) {
  const {
    nivelDeInteresse,
    modalidadeDeInteresse,
    matriculasFormadasPosgraduacao,
    matriculasFormadasGraduacao,
    indicacoesPosgraduacao = [],
    indicacoesCeu = [],
    tiposDeConvenio = [],
  } = ctx;
  const pos = parseNumber(matriculasFormadasPosgraduacao);
  const grad = parseNumber(matriculasFormadasGraduacao);
  const maxIndPos = maxIndicacao(indicacoesPosgraduacao);
  const maxIndCeu = maxIndicacao(indicacoesCeu);
  const convenioEspecial = temConvenioEspecial(tiposDeConvenio);
  const categories = [];
  const trace = [];
  const isPos = nivelDeInteresse === NIVEL_POS;
  const isPresencialOuAoVivo = MODALIDADES_POS_PRESENCIAL.includes(modalidadeDeInteresse);
  const isEad = MODALIDADES_POS_EAD.includes(modalidadeDeInteresse);

  if (isPos && isPresencialOuAoVivo) {
    trace.push("ramo: Pós-Grad Presencial/Ao Vivo");
    if (atLeast(pos, 1) || (atLeast(grad, 1) && equalTo(pos, 0))) {
      if (equalTo(pos, 1)) categories.push("ex_aluno_2");
      else if (atLeast(grad, 1) && equalTo(pos, 0)) categories.push("ex_aluno_2_graduacao");
      else if (equalTo(pos, 2)) categories.push("ex_aluno_3");
      else if (equalTo(pos, 3)) categories.push("ex_aluno_4");
      if (categories.length) trace.push(`categoria: ${categories[categories.length - 1]}`);
      if (atLeast(maxIndPos, 1)) {
        categories.push("aluno_diamante");
        trace.push("categoria: aluno_diamante (indicações pós >= 1)");
      }
    } else if (atLeast(maxIndPos, 5)) {
      categories.push("aluno_diamante");
      trace.push("categoria: aluno_diamante (indicações pós >= 5)");
    } else {
      const categoria = convenioEspecial ? "convenio_especial" : "convenio";
      categories.push(categoria);
      trace.push(`categoria: ${categoria} (sem matrículas formadas)`);
    }
  } else if (isPos && isEad) {
    trace.push("ramo: Pós-Grad EAD");
    if (atLeast(pos, 1) || (atLeast(grad, 1) && equalTo(pos, 0))) {
      if (equalTo(pos, 1)) categories.push("ex_aluno_2");
      else if (atLeast(grad, 1) && equalTo(pos, 0)) categories.push("ex_aluno_2_graduacao");
      else if (equalTo(pos, 2)) categories.push("ex_aluno_3");
      else if (equalTo(pos, 3)) categories.push("ex_aluno_4");
      if (categories.length) trace.push(`categoria: ${categories[categories.length - 1]}`);
      if (atLeast(maxIndPos, 1)) {
        categories.push("aluno_diamante");
        trace.push("categoria: aluno_diamante (indicações pós >= 1)");
      }
    } else if (atLeast(maxIndPos, 5)) {
      categories.push("aluno_diamante");
      trace.push("categoria: aluno_diamante (indicações pós >= 5)");
    } else {
      // Regra de negócio (2026-10-07): em Pós-EAD, sem matrículas formadas e sem
      // indicações, liberar apenas o desconto de R$50. O R$30 (ead_30) deixou de
      // ser ofertado nesta condição, divergindo do workflow v0 de propósito.
      categories.push("ead_50");
      trace.push("categoria: ead_50 (EAD sem matrículas/indicações)");
    }
  } else if (nivelDeInteresse === NIVEL_CEU) {
    trace.push("ramo: CEU");
    if (atLeast(maxIndCeu, 5)) {
      categories.push("aluno_diamante");
      trace.push("categoria: aluno_diamante (indicações CEU >= 5)");
    } else if (atLeast(grad, 1) || atLeast(pos, 1)) {
      const categoria = atLeast(pos, 2) ? "ex_aluno_ceu" : "convenio_especial_ceu";
      categories.push(categoria);
      trace.push(`categoria: ${categoria} (aluno IPOG)`);
    } else {
      categories.push("convenio_ceu");
      trace.push("categoria: convenio_ceu (sem matrículas formadas)");
    }
  } else if (nivelDeInteresse === NIVEL_GRADUACAO) {
    trace.push("ramo: Graduação");
    categories.push("graduacao_convenio");
    trace.push("categoria: graduacao_convenio");
  } else {
    trace.push("nenhum ramo correspondente (nível/modalidade fora das regras)");
  }
  return { categories, trace };
}

/**
 * Avalia os descontos legados do deal via custom code, replicando o workflow
 * "v0 - Processos de descontos" (1813708885) e gravando `categorias_aprovadas`
 * (paridade 1:1, Decisão A: limpa e grava o resultado final da árvore).
 *
 * Parâmetros (via runServerless):
 *  - dealId: ID do deal no CRM
 *  - convenioObjectId: objectTypeId do objeto Convênios no portal atual
 *    (sandbox 2-61647970 / produção 2-42538986, enviado pelo card via CONFIG)
 */
exports.evaluateLegacyDiscounts = evaluateLegacyDiscounts;
exports.parseNumber = parseNumber;

exports.main = async (context = {}) => {
  const { parameters = {} } = context;
  const { dealId, convenioObjectId, counts } = parameters;

  const apiKey = process.env.HUBSPOT_API_KEY;
  if (!apiKey) {
    return {
      status: "ERROR",
      origin: "SISTEMA",
      message: "HUBSPOT_API_KEY não configurada.",
    };
  }

  if (!dealId) {
    return {
      status: "ERROR",
      origin: "SISTEMA",
      message: "dealId é obrigatório.",
    };
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const listAssociatedIds = async (path) => {
    const response = await axios({
      method: "GET",
      url: `https://api.hubapi.com/crm/v4/objects/${path}`,
      headers,
    });
    return (response.data.results || []).map((r) => r.toObjectId);
  };

  try {
    // 1) Propriedades do deal (inclui categorias_aprovadas para evitar escrita redundante).
    const dealResponse = await axios({
      method: "GET",
      url: `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`,
      headers,
      params: {
        properties:
          "nivel_de_interesse,modalidade_de_interesse,categorias_aprovadas",
      },
    });
    const dealProps = dealResponse.data.properties || {};

    // 2) Indicações dos contatos associados (filtro ASSOCIATION casa com QUALQUER contato).
    const contactIds = await listAssociatedIds(`deals/${dealId}/associations/0-1`);
    let indicacoesPosgraduacao = [];
    let indicacoesCeu = [];
    if (contactIds.length > 0) {
      const batchResponse = await axios({
        method: "POST",
        url: "https://api.hubapi.com/crm/v3/objects/contacts/batch/read",
        headers,
        data: {
          properties: [
            "indicacoes_disponiveis_para_resgate__posgraduacao",
            "indicacoes_disponiveis_para_resgate__ceu",
          ],
          inputs: contactIds.slice(0, 100).map((id) => ({ id: String(id) })),
        },
      });
      const contacts = batchResponse.data.results || [];
      indicacoesPosgraduacao = contacts.map((c) =>
        parseNumber(c.properties?.indicacoes_disponiveis_para_resgate__posgraduacao),
      );
      indicacoesCeu = contacts.map((c) =>
        parseNumber(c.properties?.indicacoes_disponiveis_para_resgate__ceu),
      );
    }

    // 3) Convênios associados (tipo_de_convenio; ausência de associação = ramo default).
    // Falha na leitura de convênios NÃO derruba a avaliação (best-effort + registro).
    let tiposDeConvenio = [];
    let convenioReadError = null;
    if (convenioObjectId) {
      try {
        const convenioIds = await listAssociatedIds(
          `deals/${dealId}/associations/${convenioObjectId}`,
        );
        if (convenioIds.length > 0) {
          const batchResponse = await axios({
            method: "POST",
            url: `https://api.hubapi.com/crm/v3/objects/${convenioObjectId}/batch/read`,
            headers,
            data: {
              inputs: convenioIds.slice(0, 100).map((id) => ({ id: String(id) })),
            },
          });
          tiposDeConvenio = (batchResponse.data.results || []).map(
            (r) => r.properties?.tipo_de_convenio,
          );
        }
      } catch (error) {
        convenioReadError =
          error.response?.data?.message || error.message || "Falha ao ler convênios.";
        console.error("Falha ao ler convênios associados:", convenioReadError);
      }
    }

    // 4) Avaliação das regras legadas. As contagens de matrículas vêm SOMENTE da API
    // de matrículas por CPF (decisão de 2026-10-08). Sem consulta feita (counts
    // ausente), o deal é tratado como aluno SEM matrículas (semântica do workflow v0:
    // propriedade vazia = cai nos ramos de fallback: convênio, ead_50, convenio_ceu).
    const result = evaluateLegacyDiscounts({
      nivelDeInteresse: dealProps.nivel_de_interesse,
      modalidadeDeInteresse: dealProps.modalidade_de_interesse,
      matriculasFormadasPosgraduacao: counts ? counts.pos : null,
      matriculasFormadasGraduacao: counts ? counts.graduacao : null,
      indicacoesPosgraduacao,
      indicacoesCeu,
      tiposDeConvenio,
    });
    console.log(
      "Avaliação de descontos legados:",
      JSON.stringify({
        categories: result.categories,
        trace: result.trace,
        convenioObjectId,
        convenioCount: tiposDeConvenio.length,
        tiposDeConvenio,
      }),
    );

    // 5) Gravação idempotente: só grava quando o valor muda. Falha de escrita NÃO
    // derruba a avaliação: o card usa a resposta e a categoria deixa de ficar presa.
    const targetValue = result.categories.join(";");
    const currentValue = dealProps.categorias_aprovadas || "";
    let updated = false;
    let writeError = null;
    if (targetValue !== currentValue) {
      try {
        await axios({
          method: "PATCH",
          url: `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`,
          headers,
          data: { properties: { categorias_aprovadas: targetValue } },
        });
        updated = true;
      } catch (error) {
        writeError =
          error.response?.data?.message || error.message || "Falha ao gravar categorias_aprovadas.";
        console.error("Falha ao gravar categorias_aprovadas:", writeError);
      }
    }

    return {
      status: "SUCCESS",
      response: {
        categories: result.categories,
        trace: result.trace,
        updated,
        convenioObjectId: convenioObjectId || null,
        convenioCount: tiposDeConvenio.length,
        convenioReadError,
        writeError,
      },
    };
  } catch (error) {
    console.error("Erro ao avaliar descontos legados:", error.message);
    if (error.response) {
      console.error("Detalhes do erro:", error.response.data);
    }
    return {
      status: "ERROR",
      origin: "HUBSPOT",
      message:
        error.response?.data?.message ||
        error.message ||
        "Erro ao avaliar descontos legados.",
    };
  }
};
