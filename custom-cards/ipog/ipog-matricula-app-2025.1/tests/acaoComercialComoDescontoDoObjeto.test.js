/**
 * Regressão da migração do desconto à vista (Ação Comercial) do card para o
 * objeto Descontos e da remoção do desconto de antecipação de CEU.
 * Execução: node tests/acaoComercialComoDescontoDoObjeto.test.js
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "src", "app", "cards", "MatriculaAppCard.jsx"),
  "utf8",
);

const proibidos = [
  ["avistaCategoria", "categoria interna de ação comercial ainda declarada"],
  ["pagamentoAVista", "campo de pagamento à vista ainda no card"],
  [
    'discountsByCategory["acao_comercial"]',
    "seção ou seleção interna de ação comercial ainda no card",
  ],
  [
    "Selecione o desconto de pagamento à vista",
    "validação obrigatória de ação comercial ainda no card",
  ],
  ["totalValue - 20", "desconto de antecipação de CEU (matrícula 150) ainda no card"],
  ["totalValue - 50", "desconto de antecipação de CEU (matrícula 250) ainda no card"],
];

for (const [trecho, motivo] of proibidos) {
  assert.ok(!source.includes(trecho), `${motivo}: ${trecho}`);
}

assert.ok(
  source.includes("VALOR_DESCONTO_ANTECIPACAO"),
  "regra de antecipação por flag sumiu",
);
assert.ok(
  source.includes("totalValue - 30"),
  "regra de antecipação de Pós presencial sumiu",
);
assert.ok(
  source.includes("totalValue - 15"),
  "regra de antecipação de ex_aluno_4 sumiu",
);

console.log("OK: ação comercial fora do card e antecipação de CEU removida");
