const axios = require("axios");

// Endpoint documentado pelo IPOG em 2026-10-17. Devolve a grade da turma para o
// mês de ingresso pedido e para os 11 meses seguintes, uma disciplina válida por
// mês. A primeira válida em ordem de dataInicio é a disciplina de ingresso.
const DEFAULT_BASE_URL =
  "https://ipogmais.ipog.edu.br/ipogmais/api/integracao/gestao-matricula/matricula/disciplinas";

// O dia precisa ser sempre 01. O endpoint usa o dia no cálculo: com 2026-10-17
// ele devolve novembro/2026 como primeira disciplina, com 2026-10-01 devolve
// outubro/2026. O card nunca envia outro dia.
const MES_INGRESSO_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-01$/;

// dataInicio vem no formato AAAA-MM-DD, confirmado nos testes. Data de
// calendário, então o cálculo é em UTC para o fuso do runtime não mover o dia.
function parseDataInicio(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    console.warn("dataInicio fora do formato AAAA-MM-DD:", value);
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const millis = Date.UTC(year, month - 1, day);
  const date = new Date(millis);

  const survivedRoundTrip =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return survivedRoundTrip ? millis : null;
}

function normalizeDisciplina(item) {
  return {
    codigo: String(item.codigoDisciplina),
    nome: item.nome,
    dataInicio: item.dataInicio,
    dataInicioTimestamp: parseDataInicio(item.dataInicio),
    periodo: item.periodo,
    periodoAula: item.periodoAula,
    modalidade: item.modalidade,
    substituir: item.substituir,
    possuiSubstituta: item.possuiSubstituta,
    incluir: item.incluir,
    origem: "INGRESSO",
  };
}

const fail = (message) => ({ status: "ERROR", origin: "IPOG", message });

exports.main = async (context = {}) => {
  const { parameters } = context || {};
  const identificadorTurma = String(parameters?.identificadorTurma || "").trim();
  const mesIngresso = String(parameters?.mesIngresso || "").trim();

  const token = process.env.IPOG_DISCIPLINAS_TOKEN;
  const baseUrl = (
    process.env.IPOG_DISCIPLINAS_BASE_URL || DEFAULT_BASE_URL
  ).replace(/\/+$/, "");

  console.log("Fetch Disciplinas Ingresso - Context:", {
    identificadorTurma,
    mesIngresso,
  });

  if (!token) {
    return fail("Token da API de disciplinas não configurado.");
  }

  if (!identificadorTurma) {
    return fail("Identificador da turma é obrigatório.");
  }

  // O código numérico da turma (codigoTurma) devolve HTTP 200 com [] neste
  // endpoint. Sem esta guarda o card mostraria "sem ingresso" em vez de apontar
  // o campo errado.
  if (/^\d+$/.test(identificadorTurma)) {
    return fail(
      "Use o Identificador da Turma, não o Código da Turma. O código numérico não funciona nesta API.",
    );
  }

  if (!MES_INGRESSO_PATTERN.test(mesIngresso)) {
    return fail("Mês de ingresso inválido. Use o formato AAAA-MM-01.");
  }

  const url = `${baseUrl}/turma/${encodeURIComponent(
    identificadorTurma,
  )}/mesIngresso/${mesIngresso}`;

  try {
    console.log("Fetching disciplinas de ingresso:", url);

    const response = await axios.get(url, {
      headers: {
        Accept: "application/json",
        Authorization: token,
      },
      timeout: 10000,
    });

    const raw = Array.isArray(response.data) ? response.data : [];

    const disciplinas = raw
      .map(normalizeDisciplina)
      .filter((disciplina) => disciplina.substituir === "N")
      .filter((disciplina) => disciplina.dataInicioTimestamp != null)
      .sort((a, b) => a.dataInicioTimestamp - b.dataInicioTimestamp);

    const primeira = disciplinas[0] || null;

    console.log(
      "Disciplinas de ingresso:",
      JSON.stringify({
        total: raw.length,
        validas: disciplinas.length,
        primeira: primeira
          ? `${primeira.codigo} ${primeira.periodo} ${primeira.dataInicio}`
          : null,
      }),
    );

    return {
      status: "SUCCESS",
      response: {
        identificadorTurma,
        mesIngresso,
        primeira,
        disciplinas,
      },
    };
  } catch (error) {
    const httpStatus = error.response?.status;
    console.error(
      "Error fetching disciplinas de ingresso:",
      httpStatus,
      error.message,
    );
    console.error("Detalhes:", error.response?.data);

    if (httpStatus === 401 || httpStatus === 403) {
      return fail(
        "Sem autorização na API de disciplinas do IPOG. Verifique o token de integração.",
      );
    }

    if (httpStatus === 404) {
      return fail(`Turma ${identificadorTurma} não encontrada na API do IPOG.`);
    }

    if (error.code === "ECONNABORTED" || /timeout/i.test(error.message || "")) {
      return fail("Tempo de resposta esgotado ao consultar a API do IPOG.");
    }

    return fail(
      error.response?.data?.mensagens?.[0] ||
        error.response?.data?.message ||
        "Erro ao consultar as disciplinas da turma no IPOG.",
    );
  }
};
