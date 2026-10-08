const axios = require("axios");

/**
 * Consulta as matrículas do aluno pelo CPF na API IPOG (MuleSoft) e resume por nível
 * educacional. Fonte única de verdade para os descontos de ex-aluno (sem fallback para
 * propriedades de contagem do HubSpot, por decisão do consultor em 2026-10-08).
 *
 * Contrato da API (/academico/v1/matriculasCpf?cpf=): objeto do aluno com
 * `matriculas[]`, cada uma com `matricula`, `nomeCurso`, `identificadorTurma`,
 * `nivelEducacional`, `siglaNivelEducacional` e `situacaoMatricula`.
 *
 * Somente os status AT (Ativo) e FO (Formado) contam e são renderizados.
 */

const STATUS_CONTAM = ["AT", "FO"];
const STATUS_LABELS = { AT: "Ativo", FO: "Formado" };
const LEVEL_ORDER = ["pos", "graduacao", "ceu", "outros"];
const LEVEL_LABELS = {
  pos: "Pós-graduação",
  graduacao: "Graduação",
  ceu: "CEU",
  outros: "Outros",
};

function normalizeText(value) {
  return String(value === null || value === undefined ? "" : value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/** Classifica o nível educacional da matrícula nos três níveis usados pelas regras. */
function classifyLevel(nivelRaw, siglaRaw) {
  const nivel = normalizeText(nivelRaw);
  const sigla = normalizeText(siglaRaw);
  if (sigla === "po" || nivel.startsWith("pos")) return "pos";
  if (sigla === "ex" || nivel === "ceu" || nivel.includes("extensao")) return "ceu";
  if (sigla === "su" || sigla === "gt" || nivel.includes("graduacao")) return "graduacao";
  return "outros";
}

/** Extrai a lista de matrículas tolerando variações do payload. */
function extractEnrollmentList(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.matriculas)) return payload.matriculas;
    for (const key of ["enrollments", "results", "data", "items", "content"]) {
      if (Array.isArray(payload[key])) return payload[key];
    }
  }
  return [];
}

/**
 * Núcleo puro: filtra por status, agrupa por nível e monta o resumo para o card.
 * @returns {{counts: {pos:number, graduacao:number, ceu:number}, groups: Array, total: number}}
 */
function summarizeEnrollments(matriculas) {
  const counts = { pos: 0, graduacao: 0, ceu: 0 };
  const buckets = {};
  let total = 0;

  for (const item of matriculas || []) {
    if (!item || typeof item !== "object") continue;
    const status = String(item.situacaoMatricula || "").trim().toUpperCase();
    if (!STATUS_CONTAM.includes(status)) continue;

    const key = classifyLevel(item.nivelEducacional, item.siglaNivelEducacional);
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push({
      id: String(item.matricula || ""),
      statusCode: status,
      statusLabel: STATUS_LABELS[status] || status,
      curso: item.nomeCurso || "",
      turma: item.identificadorTurma || "",
      unidade: item.unidadeEnsino || "",
    });
    if (key in counts) counts[key] += 1;
    total += 1;
  }

  const groups = LEVEL_ORDER.filter((key) => (buckets[key] || []).length > 0).map((key) => ({
    key,
    label: LEVEL_LABELS[key],
    total: buckets[key].length,
    matriculas: buckets[key],
  }));

  return { counts, groups, total };
}

exports.summarizeEnrollments = summarizeEnrollments;
exports.classifyLevel = classifyLevel;

/**
 * Ponto de entrada serverless.
 * Parâmetros: { cpf } (dígitos; máscara é ignorada).
 */
exports.main = async (context = {}) => {
  const { cpf } = context.parameters || {};
  const digits = String(cpf || "").replace(/\D/g, "");

  if (digits.length !== 11) {
    return { status: "ERROR", message: "CPF deve ter exatamente 11 dígitos." };
  }

  const baseUrl = process.env.MULESOFT_BASE_URL;
  const username = process.env.MULESOFT_USERNAME;
  const password = process.env.MULESOFT_PASSWORD;

  if (!baseUrl || !username || !password) {
    return {
      status: "ERROR",
      message:
        "Secrets da API IPOG não configuradas (MULESOFT_BASE_URL, MULESOFT_USERNAME, MULESOFT_PASSWORD).",
    };
  }

  const basicToken = Buffer.from(`${username}:${password}`).toString("base64");
  const headers = { Authorization: `Basic ${basicToken}`, Accept: "application/json" };
  const url = `${String(baseUrl).replace(/\/+$/, "")}/academico/v1/matriculasCpf?cpf=${encodeURIComponent(digits)}`;

  try {
    const response = await axios({ method: "GET", url, headers });
    const payload = response.data || {};
    const matriculas = extractEnrollmentList(payload);
    const summary = summarizeEnrollments(matriculas);

    console.log(
      "Resumo de matrículas por CPF:",
      JSON.stringify({ total: summary.total, counts: summary.counts }),
    );

    return {
      status: "SUCCESS",
      response: {
        cpf: digits,
        nomeAluno: payload.nomeAluno || "",
        counts: summary.counts,
        groups: summary.groups,
        total: summary.total,
      },
    };
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      if (status === 404) {
        return {
          status: "NOT_FOUND",
          message: "O CPF não possui matrículas cadastradas na base da IPOG.",
          response: {
            cpf: digits,
            counts: { pos: 0, graduacao: 0, ceu: 0 },
            groups: [],
            total: 0,
          },
        };
      }
      console.error("Erro na API de matrículas IPOG:", status, error.response.data);
      return {
        status: "ERROR",
        origin: "MULESOFT",
        message:
          status === 401 || status === 403
            ? `Autenticação recusada pela API de matrículas (HTTP ${status}).`
            : `A API de matrículas retornou HTTP ${status}.`,
      };
    }
    console.error("Erro inesperado na consulta de matrículas:", error.message);
    return {
      status: "ERROR",
      origin: "MULESOFT",
      message: "Erro inesperado ao consultar as matrículas.",
    };
  }
};
