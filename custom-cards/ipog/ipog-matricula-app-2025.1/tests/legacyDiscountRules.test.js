/**
 * Testes de paridade das regras legadas (workflow v0 - Processos de descontos, 1813708885).
 * Execução: node tests/legacyDiscountRules.test.js (a partir da raiz do projeto do card).
 * Sem dependências: usa apenas o módulo assert do Node.
 */
const assert = require("assert");
const { evaluateLegacyDiscounts } = require("../src/app/functions/evaluateLegacyDiscounts");

const POS = "Pós-graduação";
const CEU = "Curso de extensão universitária";
const GRADUACAO = "Graduação";

let passed = 0;
function check(name, ctx, expectedCategories) {
  const result = evaluateLegacyDiscounts(ctx);
  assert.deepStrictEqual(
    result.categories,
    expectedCategories,
    `${name}: esperado ${JSON.stringify(expectedCategories)}, recebido ${JSON.stringify(result.categories)}\ntrace: ${result.trace.join(" | ")}`,
  );
  assert.ok(result.trace.length > 0, `${name}: trace vazio`);
  passed += 1;
  console.log(`ok - ${name}`);
}

// Pós-Graduação Presencial/Ao Vivo
check("2ª pós sem indicações", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "Presencial",
  matriculasFormadasPosgraduacao: "1", matriculasFormadasGraduacao: null,
}, ["ex_aluno_2"]);

check("2ª pós com indicação >= 1 ganha diamante", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "Ao Vivo",
  matriculasFormadasPosgraduacao: 1, matriculasFormadasGraduacao: 0,
  indicacoesPosgraduacao: [1],
}, ["ex_aluno_2", "aluno_diamante"]);

check("3ª pós", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "Presencial",
  matriculasFormadasPosgraduacao: 2,
}, ["ex_aluno_3"]);

check("4ª pós", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "Remoto ao vivo",
  matriculasFormadasPosgraduacao: 3,
}, ["ex_aluno_4"]);

check("pos >= 3 vira ex_aluno_4 (com diamante por indicações)", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "Presencial",
  matriculasFormadasPosgraduacao: 5, indicacoesPosgraduacao: [2],
}, ["ex_aluno_4", "aluno_diamante"]);

check("pós sem matrículas com indicações >= 5 = diamante", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "Presencial",
  matriculasFormadasPosgraduacao: null, matriculasFormadasGraduacao: null,
  indicacoesPosgraduacao: [7],
}, ["aluno_diamante"]);

check("pós sem matrículas, convênio comum", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "Presencial",
  matriculasFormadasPosgraduacao: null, matriculasFormadasGraduacao: null,
  tiposDeConvenio: ["Convênio regular"],
}, ["convenio"]);

check("pós sem matrículas, convênio especial", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "Presencial",
  matriculasFormadasPosgraduacao: null, matriculasFormadasGraduacao: null,
  tiposDeConvenio: ["Convênio especial;Outro"],
}, ["convenio_especial"]);

// Paridade null vs 0: pos vazio NÃO satisfaz == 0 (comportamento do workflow).
check("grad formada com pos vazio cai no convênio (paridade null vs 0)", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "Presencial",
  matriculasFormadasPosgraduacao: null, matriculasFormadasGraduacao: 1,
}, ["convenio"]);

// Egresso Graduação exige pos == 0 explícito.
check("egresso graduação (grad >= 1 e pos == 0), sem indicação", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "Presencial",
  matriculasFormadasPosgraduacao: 0, matriculasFormadasGraduacao: 2,
  indicacoesPosgraduacao: [0],
}, ["ex_aluno_2_graduacao"]);

check("egresso graduação com indicação >= 1 ganha diamante", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "Presencial",
  matriculasFormadasPosgraduacao: 0, matriculasFormadasGraduacao: 1,
  indicacoesPosgraduacao: [3],
}, ["ex_aluno_2_graduacao", "aluno_diamante"]);

// Pós-Graduação EAD
check("EAD sem matrículas e sem indicações = apenas ead_50", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "EAD",
  matriculasFormadasPosgraduacao: null, matriculasFormadasGraduacao: null,
}, ["ead_50"]);

check("EAD com indicações >= 5 = diamante (sem ead_30/ead_50)", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "Online",
  matriculasFormadasPosgraduacao: null, matriculasFormadasGraduacao: null,
  indicacoesPosgraduacao: [5],
}, ["aluno_diamante"]);

check("EAD 2ª pós", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "EAD",
  matriculasFormadasPosgraduacao: 1,
}, ["ex_aluno_2"]);

// CEU (indicações usam a propriedade __ceu)
check("CEU com indicações >= 5 = diamante", {
  nivelDeInteresse: CEU, modalidadeDeInteresse: "Presencial",
  indicacoesCeu: [5],
}, ["aluno_diamante"]);

check("CEU aluno IPOG com 2ª pós = ex_aluno_ceu", {
  nivelDeInteresse: CEU, modalidadeDeInteresse: "Presencial",
  matriculasFormadasPosgraduacao: 2, matriculasFormadasGraduacao: 1,
  indicacoesCeu: [1],
}, ["ex_aluno_ceu"]);

check("CEU aluno IPOG sem 2ª pós = convenio_especial_ceu", {
  nivelDeInteresse: CEU, modalidadeDeInteresse: "Ao Vivo",
  matriculasFormadasPosgraduacao: 0, matriculasFormadasGraduacao: 1,
}, ["convenio_especial_ceu"]);

check("CEU sem matrículas = convenio_ceu", {
  nivelDeInteresse: CEU, modalidadeDeInteresse: "Presencial",
  matriculasFormadasPosgraduacao: null, matriculasFormadasGraduacao: null,
}, ["convenio_ceu"]);

// Graduação
check("graduação = graduacao_convenio", {
  nivelDeInteresse: GRADUACAO, modalidadeDeInteresse: "Presencial",
}, ["graduacao_convenio"]);

// Nível fora das regras: nenhuma categoria
check("nível desconhecido não gera categoria", {
  nivelDeInteresse: "Mestrado", modalidadeDeInteresse: "Presencial",
}, []);

// Sem consulta de matrículas por CPF: o deal é tratado como aluno SEM matrículas
// (semântica do workflow v0: propriedade vazia = ramos de fallback).
check("sem CPF: Pós presencial cai no convênio", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "Presencial",
}, ["convenio"]);

check("sem CPF: Pós presencial com indicações >= 5 = diamante", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "Presencial",
  indicacoesPosgraduacao: [6],
}, ["aluno_diamante"]);

check("sem CPF: Pós EAD = ead_50", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "EAD",
}, ["ead_50"]);

check("sem CPF: CEU com indicações >= 5 mantém aluno_diamante", {
  nivelDeInteresse: CEU, modalidadeDeInteresse: "Presencial",
  indicacoesCeu: [5],
}, ["aluno_diamante"]);

check("sem CPF: CEU sem indicações = convenio_ceu", {
  nivelDeInteresse: CEU, modalidadeDeInteresse: "Presencial",
}, ["convenio_ceu"]);

check("sem CPF: Graduação mantém graduacao_convenio", {
  nivelDeInteresse: GRADUACAO, modalidadeDeInteresse: "Presencial",
}, ["graduacao_convenio"]);

console.log(`\n${passed} testes de paridade passaram.`);
