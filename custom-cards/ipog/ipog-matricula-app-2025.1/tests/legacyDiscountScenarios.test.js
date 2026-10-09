/**
 * Cenários da planilha "Cenários de Teste - Descontos IPOG" mapeados para as
 * regras do motor legado (evaluateLegacyDiscounts).
 *
 * Execução: node tests/legacyDiscountScenarios.test.js (a partir da raiz do projeto).
 * Sem dependências: usa apenas o módulo assert do Node.
 *
 * Observações de escopo:
 * - O motor devolve CATEGORIAS. O percentual/valor de cada categoria vem da MuleSoft
 *   (objeto Descontos / tabelas de desconto), não do motor.
 * - O "+10% ao vivo" da planilha é a categoria separada `acao_comercial` (etapa 2,
 *   outro motor); não entra em evaluateLegacyDiscounts.
 * - As contagens de ex-aluno (pos/graduação) vêm da busca por CPF.
 */
const assert = require("assert");
const { evaluateLegacyDiscounts } = require("../src/app/functions/evaluateLegacyDiscounts");

const POS = "Pós-graduação";
const CEU = "Curso de extensão universitária";

let passed = 0;
function scenario(id, name, ctx, expectedCategories) {
  const result = evaluateLegacyDiscounts(ctx);
  assert.deepStrictEqual(
    result.categories,
    expectedCategories,
    `[${id}] ${name}: esperado ${JSON.stringify(expectedCategories)}, recebido ${JSON.stringify(result.categories)}\ntrace: ${result.trace.join(" | ")}`,
  );
  passed += 1;
  console.log(`ok - [${id}] ${name}`);
}

// ---------------------------------------------------------------------------
// Pós-Graduação (Presencial e Ao Vivo)
// ---------------------------------------------------------------------------
scenario("2026-01-01", "Primeira Pós + graduação IPOG = ex_aluno graduação", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "Presencial",
  matriculasFormadasPosgraduacao: 0, matriculasFormadasGraduacao: 2,
}, ["ex_aluno_2_graduacao"]);

scenario("2026-02-01", "Primeira Pós + graduação IPOG (à vista)", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "Presencial",
  matriculasFormadasPosgraduacao: 0, matriculasFormadasGraduacao: 1,
}, ["ex_aluno_2_graduacao"]);

scenario("2026-03-01", "Primeira Pós sem graduação + 5 indicações = diamante", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "Presencial",
  matriculasFormadasPosgraduacao: 0, matriculasFormadasGraduacao: 0,
  indicacoesPosgraduacao: [5],
}, ["aluno_diamante"]);

scenario("2026-04-01", "Primeira Pós sem graduação + 10 indicações = diamante", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "Presencial",
  matriculasFormadasPosgraduacao: 0, matriculasFormadasGraduacao: 0,
  indicacoesPosgraduacao: [10],
}, ["aluno_diamante"]);

scenario("2026-05-01", "Primeira Pós sem graduação, sem indicações = convênio", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "Presencial",
  matriculasFormadasPosgraduacao: 0, matriculasFormadasGraduacao: 0,
  tiposDeConvenio: ["Convênio regular"],
}, ["convenio"]);

scenario("2026-06-01", "Primeira Pós sem graduação, convênio especial = convênio especial", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "Presencial",
  matriculasFormadasPosgraduacao: 0, matriculasFormadasGraduacao: 0,
  tiposDeConvenio: ["Convênio especial"],
}, ["convenio_especial"]);

scenario("2026-07-01", "Ex-aluno (2ª pós) + indicações = ex_aluno + diamante", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "Presencial",
  matriculasFormadasPosgraduacao: 1, indicacoesPosgraduacao: [1],
}, ["ex_aluno_2", "aluno_diamante"]);

scenario("2026-08-01", "Ex-aluno (2ª pós) + indicações (à vista)", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "Presencial",
  matriculasFormadasPosgraduacao: 1, indicacoesPosgraduacao: [2],
}, ["ex_aluno_2", "aluno_diamante"]);

scenario("2026-09-01", "Ex-aluno (2ª pós), sem indicações", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "Presencial",
  matriculasFormadasPosgraduacao: 1,
}, ["ex_aluno_2"]);

scenario("2026-10-01", "Ex-aluno (2ª pós), sem indicações (à vista)", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "Presencial",
  matriculasFormadasPosgraduacao: 1,
}, ["ex_aluno_2"]);

// ---------------------------------------------------------------------------
// Pós-Graduação (EAD)
// ---------------------------------------------------------------------------
scenario("2026-01-02", "EAD Primeira Pós + 5 indicações = diamante", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "EAD",
  matriculasFormadasPosgraduacao: 0, matriculasFormadasGraduacao: 0,
  indicacoesPosgraduacao: [5],
}, ["aluno_diamante"]);

scenario("2026-02-02", "EAD Primeira Pós + 10 indicações = diamante", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "Online",
  matriculasFormadasPosgraduacao: 0, matriculasFormadasGraduacao: 0,
  indicacoesPosgraduacao: [10],
}, ["aluno_diamante"]);

// Divergência conhecida: a planilha espera "R$30 ou R$50"; o código libera só ead_50
// (decisão 9eb76b1, 2026-10-07). O caso registra o comportamento atual do motor.
scenario("2026-03-02", "EAD Primeira Pós sem indicações = ead_50 (planilha: R$30 ou R$50)", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "EAD",
  matriculasFormadasPosgraduacao: 0, matriculasFormadasGraduacao: 0,
}, ["ead_50"]);

scenario("2026-04-02", "EAD Primeira Pós sem indicações (à vista) = ead_50", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "EAD",
  matriculasFormadasPosgraduacao: 0, matriculasFormadasGraduacao: 0,
}, ["ead_50"]);

scenario("2026-05-02", "EAD ex-aluno + indicações = ex_aluno + diamante", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "EAD",
  matriculasFormadasPosgraduacao: 1, indicacoesPosgraduacao: [1],
}, ["ex_aluno_2", "aluno_diamante"]);

scenario("2026-06-02", "EAD ex-aluno + indicações (à vista)", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "EAD",
  matriculasFormadasPosgraduacao: 2, indicacoesPosgraduacao: [3],
}, ["ex_aluno_3", "aluno_diamante"]);

scenario("2026-07-02", "EAD ex-aluno sem indicações", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "EAD",
  matriculasFormadasPosgraduacao: 1,
}, ["ex_aluno_2"]);

scenario("2026-08-02", "EAD ex-aluno sem indicações (à vista)", {
  nivelDeInteresse: POS, modalidadeDeInteresse: "EAD",
  matriculasFormadasPosgraduacao: 1,
}, ["ex_aluno_2"]);

// ---------------------------------------------------------------------------
// CEU
// ---------------------------------------------------------------------------
scenario("2026-01-03", "CEU + 5 indicações = diamante", {
  nivelDeInteresse: CEU, modalidadeDeInteresse: "Presencial",
  indicacoesCeu: [5],
}, ["aluno_diamante"]);

scenario("2026-02-03", "CEU + 10 indicações = diamante", {
  nivelDeInteresse: CEU, modalidadeDeInteresse: "Presencial",
  indicacoesCeu: [10],
}, ["aluno_diamante"]);

scenario("2026-03-03", "CEU não IPOG, sem indicações = convenio_ceu", {
  nivelDeInteresse: CEU, modalidadeDeInteresse: "Presencial",
  matriculasFormadasPosgraduacao: 0, matriculasFormadasGraduacao: 0,
}, ["convenio_ceu"]);

scenario("2026-04-03", "CEU não IPOG, sem indicações (à vista) = convenio_ceu", {
  nivelDeInteresse: CEU, modalidadeDeInteresse: "Presencial",
  matriculasFormadasPosgraduacao: 0, matriculasFormadasGraduacao: 0,
}, ["convenio_ceu"]);

scenario("2026-05-03", "CEU aluno IPOG com 1 pós = convenio_especial_ceu", {
  nivelDeInteresse: CEU, modalidadeDeInteresse: "Presencial",
  matriculasFormadasPosgraduacao: 1,
}, ["convenio_especial_ceu"]);

scenario("2026-06-03", "CEU aluno IPOG com 1 pós (à vista)", {
  nivelDeInteresse: CEU, modalidadeDeInteresse: "Presencial",
  matriculasFormadasPosgraduacao: 1,
}, ["convenio_especial_ceu"]);

// "2+ pós": o código reconhece ex_aluno_ceu apenas com pos == 2 exato.
scenario("2026-07-03", "CEU aluno IPOG com 2 pós = ex_aluno_ceu", {
  nivelDeInteresse: CEU, modalidadeDeInteresse: "Presencial",
  matriculasFormadasPosgraduacao: 2,
}, ["ex_aluno_ceu"]);

scenario("2026-08-03", "CEU aluno IPOG com 2 pós (à vista) = ex_aluno_ceu", {
  nivelDeInteresse: CEU, modalidadeDeInteresse: "Presencial",
  matriculasFormadasPosgraduacao: 2,
}, ["ex_aluno_ceu"]);

console.log(`\n${passed} cenários da planilha passaram.`);
