const axios = require("axios");

/**
 * Regras legadas de elegibilidade de descontos, no mesmo arquivo da função.
 *
 * Uma app function não pode importar outro arquivo local do projeto: só
 * dependências de NPM declaradas em package.json são empacotadas. Um
 * `require("./legacyDiscountRules")` quebra no carregamento do módulo, antes de
 * `exports.main` rodar, e o card recebe uma falha sem mensagem própria.
 *
 * Réplica 1:1 da árvore de decisão do workflow HubSpot "v0 - Processos de descontos"
 * (ID 1813708885 na homologação 51406295), conforme baseline canônico extraído da
 * API /automation/v4/flows em 2026-10-06 (Decisão A: paridade total, incluindo a
 * limpeza de `categorias_aprovadas` executada antes de gravar).
 *
 * Semântica de paridade preservada:
 * - Propriedade numérica vazia ("" ou null) NÃO satisfaz IS_EQUAL_TO 0 nem
 *   comparações numéricas no HubSpot; `null` permanece distinto de 0.
 * - Filtros de associação casam se QUALQUER registro associado satisfizer a
 *   condição (contatos para indicações; convênios para tipo_de_convenio).
 * - Deal sem convênio associado cai no ramo DEFAULT do workflow ("convenio").
 * - Ramo EAD sem indicações: append "ead_30;ead_50" = duas categorias.
 */

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
    String(tipo || "")
      .split(";")
      .includes(CONVENIO_ESPECIAL),
  );
}

/**
 * @param {Object} ctx
 * @param {string} ctx.nivelDeInteresse
 * @param {string} ctx.modalidadeDeInteresse
 * @param {number|null} ctx.matriculasFormadasPosgraduacao
 * @param {number|null} ctx.matriculasFormadasGraduacao
 * @param {Array<number|null>} [ctx.indicacoesPosgraduacao] valor do contato associado
 * @param {Array<number|null>} [ctx.indicacoesCeu]
 * @param {Array<string>} [ctx.tiposDeConvenio] tipo_de_convenio de cada convênio associado
 * @returns {{categories: string[], trace: string[]}}
 */
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
  const isPresencialOuAoVivo =
    MODALIDADES_POS_PRESENCIAL.includes(modalidadeDeInteresse);
  const isEad = MODALIDADES_POS_EAD.includes(modalidadeDeInteresse);

  if (isPos && isPresencialOuAoVivo) {
    trace.push("ramo: Pós-Grad Presencial/Ao Vivo");
    if (atLeast(pos, 1) || (atLeast(grad, 1) && equalTo(pos, 0))) {
      // Ordem de avaliação dos ramos preservada do workflow (decisão 3 do fluxo).
      if (equalTo(pos, 1)) {
        categories.push("ex_aluno_2");
        trace.push("categoria: ex_aluno_2 (IPOG+ 2° pós)");
      } else if (atLeast(grad, 1) && equalTo(pos, 0)) {
        categories.push("ex_aluno_2_graduacao");
        trace.push("categoria: ex_aluno_2_graduacao (Egresso Graduação)");
      } else if (equalTo(pos, 2)) {
        categories.push("ex_aluno_3");
        trace.push("categoria: ex_aluno_3 (IPOG+ 3° pós)");
      } else if (equalTo(pos, 3)) {
        categories.push("ex_aluno_4");
        trace.push("categoria: ex_aluno_4 (IPOG+ 4° pós)");
      } else {
        trace.push("sem categoria de titulação (pos fora de 0-3)");
      }
      // Todas as titulações convergem na checagem de indicações >= 1.
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
      if (equalTo(pos, 1)) {
        categories.push("ex_aluno_2");
        trace.push("categoria: ex_aluno_2 (IPOG+ 2° pós)");
      } else if (atLeast(grad, 1) && equalTo(pos, 0)) {
        categories.push("ex_aluno_2_graduacao");
        trace.push("categoria: ex_aluno_2_graduacao (Egresso Graduação)");
      } else if (equalTo(pos, 2)) {
        categories.push("ex_aluno_3");
        trace.push("categoria: ex_aluno_3 (IPOG+ 3° pós)");
      } else if (equalTo(pos, 3)) {
        categories.push("ex_aluno_4");
        trace.push("categoria: ex_aluno_4 (IPOG+ 4° pós)");
      } else {
        trace.push("sem categoria de titulação (pos fora de 0-3)");
      }
      if (atLeast(maxIndPos, 1)) {
        categories.push("aluno_diamante");
        trace.push("categoria: aluno_diamante (indicações pós >= 1)");
      }
    } else if (atLeast(maxIndPos, 5)) {
      categories.push("aluno_diamante");
      trace.push("categoria: aluno_diamante (indicações pós >= 5)");
    } else {
      categories.push("ead_30");
      categories.push("ead_50");
      trace.push("categorias: ead_30;ead_50 (EAD sem matrículas/indicações)");
    }
  } else if (nivelDeInteresse === NIVEL_CEU) {
    trace.push("ramo: CEU");
    if (atLeast(maxIndCeu, 5)) {
      categories.push("aluno_diamante");
      trace.push("categoria: aluno_diamante (indicações CEU >= 5)");
    } else if (atLeast(grad, 1) || atLeast(pos, 1)) {
      if (equalTo(pos, 2)) {
        categories.push("ex_aluno_ceu");
        trace.push("categoria: ex_aluno_ceu (aluno IPOG com 2° pós)");
      } else {
        categories.push("convenio_especial_ceu");
        trace.push("categoria: convenio_especial_ceu (aluno IPOG)");
      }
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
exports.main = async (context = {}) => {
  const { parameters = {} } = context;
  const { dealId, convenioObjectId } = parameters;

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
    return (response.data.results || []).map(
      (association) => association.toObjectId,
    );
  };

  try {
    // 1) Propriedades do deal (inclui categorias_aprovadas para evitar escrita redundante).
    const dealResponse = await axios({
      method: "GET",
      url: `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`,
      headers,
      params: {
        properties:
          "nivel_de_interesse,modalidade_de_interesse,matriculas_formadas_posgraduacao,matriculas_formadas_graduacao,categorias_aprovadas",
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
        // Sem `properties`, o batch/read devolve só as propriedades padrão do
        // contato, e as indicações chegariam sempre vazias.
        data: {
          properties: [
            "indicacoes_disponiveis_para_resgate__posgraduacao",
            "indicacoes_disponiveis_para_resgate__ceu",
          ],
          inputs: contactIds.slice(0, 100).map((id) => ({ id: String(id) })),
        },
      });
      const contacts = batchResponse.data.results || [];
      indicacoesPosgraduacao = contacts.map((contact) =>
        parseNumber(
          contact.properties?.indicacoes_disponiveis_para_resgate__posgraduacao,
        ),
      );
      indicacoesCeu = contacts.map((contact) =>
        parseNumber(contact.properties?.indicacoes_disponiveis_para_resgate__ceu),
      );
    }

    // 3) Convênios associados (tipo_de_convenio; ausência de associação = ramo default).
    let tiposDeConvenio = [];
    if (convenioObjectId) {
      const convenioIds = await listAssociatedIds(
        `deals/${dealId}/associations/${convenioObjectId}`,
      );
      if (convenioIds.length > 0) {
        const batchResponse = await axios({
          method: "POST",
          url: `https://api.hubapi.com/crm/v3/objects/${convenioObjectId}/batch/read`,
          headers,
          // Mesmo motivo do batch de contatos: sem `properties`,
          // tipo_de_convenio não volta e "Convênio especial" nunca casaria.
          data: {
            properties: ["tipo_de_convenio"],
            inputs: convenioIds.slice(0, 100).map((id) => ({ id: String(id) })),
          },
        });
        tiposDeConvenio = (batchResponse.data.results || []).map(
          (convenio) => convenio.properties?.tipo_de_convenio,
        );
      }
    }

    // 4) Avaliação das regras legadas (árvore 1:1 do workflow v0).
    const result = evaluateLegacyDiscounts({
      nivelDeInteresse: dealProps.nivel_de_interesse,
      modalidadeDeInteresse: dealProps.modalidade_de_interesse,
      matriculasFormadasPosgraduacao: dealProps.matriculas_formadas_posgraduacao,
      matriculasFormadasGraduacao: dealProps.matriculas_formadas_graduacao,
      indicacoesPosgraduacao,
      indicacoesCeu,
      tiposDeConvenio,
    });

    // 5) Gravação com paridade: o workflow limpa e anexa; o resultado líquido é o SET
    // do valor final. Escrita pulada quando o valor já está igual (menos ruído de histórico).
    const targetValue = result.categories.join(";");
    const currentValue = dealProps.categorias_aprovadas || "";
    let updated = false;
    if (targetValue !== currentValue) {
      await axios({
        method: "PATCH",
        url: `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`,
        headers,
        data: { properties: { categorias_aprovadas: targetValue } },
      });
      updated = true;
    }

    return {
      status: "SUCCESS",
      response: {
        categories: result.categories,
        trace: result.trace,
        updated,
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
