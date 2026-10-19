/**
 * Testes do motor de descontos do objeto (etapa 2).
 * Execução: node tests/objectDiscountRules.test.js (a partir da raiz do projeto do card).
 * Sem dependências: usa apenas o módulo assert do Node.
 */
const assert = require("assert");
const { evaluateObjectDiscounts } = require("../src/app/functions/evaluateObjectDiscounts");

const REFERENCIA = "2026-10-07";

const baseRule = (overrides = {}) => ({
  nome_do_desconto: "Regra teste",
  codigo_desconto: "T1",
  categoria_sei: "CAT_TESTE",
  status: "Ativo",
  prioridade: "1",
  permite_acumulacao: "false",
  data_inicio_vigencia: "2026-01-01",
  data_fim_vigencia: "",
  unidade_ensino: "",
  nivel_interesse: "",
  modalidade_ensino: "",
  forma_pagamento: "",
  equipe: "",
  turma: "",
  condicao_parcelas_operador: "",
  condicao_parcelas_valor: "",
  condicao_parcelas_valor_2: "",
  ...overrides,
});

let passed = 0;
function run(name, ctx, assertFn, { checkTrace = true } = {}) {
  const result = evaluateObjectDiscounts({ referencia: REFERENCIA, ...ctx });
  assertFn(result);
  if (checkTrace) {
    assert.ok(result.trace.length > 0, `${name}: trace vazio`);
  }
  passed += 1;
  console.log(`ok - ${name}`);
}

const values = (result) => result.categories.map((item) => item.value);

// 1. Sem critérios, apenas status e vigência
run("regra sem critérios é elegível", { rules: [baseRule()] }, (r) => {
  assert.deepStrictEqual(values(r), ["CAT_TESTE"]);
});

// 2. Unidade
run("unidade casa", { rules: [baseRule({ unidade_ensino: "Goiânia" })], unidade: "Goiânia" }, (r) => {
  assert.deepStrictEqual(values(r), ["CAT_TESTE"]);
});
run("unidade não casa", { rules: [baseRule({ unidade_ensino: "Goiânia" })], unidade: "Recife" }, (r) => {
  assert.deepStrictEqual(values(r), []);
});
run(
  "unidade multisseleção casa por qualquer opção",
  { rules: [baseRule({ unidade_ensino: "Goiânia;Belém;Manaus" })], unidade: "Belém" },
  (r) => assert.deepStrictEqual(values(r), ["CAT_TESTE"]),
);

// 3. Campo vazio não restringe
run(
  "equipe vazia não restringe",
  { rules: [baseRule({ equipe: "" })], equipeTime: "3.1.1.1.3. Goiânia" },
  (r) => assert.deepStrictEqual(values(r), ["CAT_TESTE"]),
);

// 4. OR dentro do campo, AND entre campos
run(
  "nível multisseleção casa por qualquer opção",
  {
    rules: [baseRule({ nivel_interesse: "Pós-graduação;Graduação" })],
    nivelDeInteresse: "Graduação",
  },
  (r) => assert.deepStrictEqual(values(r), ["CAT_TESTE"]),
);
run(
  "campos diferentes combinam com E",
  {
    rules: [baseRule({ unidade_ensino: "Goiânia", modalidade_ensino: "Presencial" })],
    unidade: "Goiânia",
    modalidadeDeInteresse: "EAD",
  },
  (r) => assert.deepStrictEqual(values(r), []),
);

// 5. Status e vigência
run("status inativo é ignorado", { rules: [baseRule({ status: "Inativo" })] }, (r) => {
  assert.deepStrictEqual(values(r), []);
});
run(
  "vigência futura é ignorada",
  { rules: [baseRule({ data_inicio_vigencia: "2027-01-01" })] },
  (r) => assert.deepStrictEqual(values(r), []),
);
run(
  "vigência encerrada é ignorada",
  { rules: [baseRule({ data_fim_vigencia: "2026-01-01" })] },
  (r) => assert.deepStrictEqual(values(r), []),
);
run(
  "dentro da vigência é elegível",
  { rules: [baseRule({ data_inicio_vigencia: "2026-01-01", data_fim_vigencia: "2026-12-31" })] },
  (r) => assert.deepStrictEqual(values(r), ["CAT_TESTE"]),
);

// 6. Turma (texto, comparação exata normalizada)
run(
  "turma casa ignorando caixa",
  { rules: [baseRule({ turma: "ADM11262M" })], turma: "adm11262m" },
  (r) => assert.deepStrictEqual(values(r), ["CAT_TESTE"]),
);
run(
  "turma diferente não casa",
  { rules: [baseRule({ turma: "ADM11262M" })], turma: "OUTRA" },
  (r) => assert.deepStrictEqual(values(r), []),
);

// 7. Forma de pagamento (vem do card)
run(
  "forma de pagamento Pix casa",
  { rules: [baseRule({ forma_pagamento: "Pix" })], formaPagamento: "Pix" },
  (r) => assert.deepStrictEqual(values(r), ["CAT_TESTE"]),
);
run(
  "forma de pagamento diferente não casa",
  { rules: [baseRule({ forma_pagamento: "Pix" })], formaPagamento: "Cartão de crédito" },
  (r) => assert.deepStrictEqual(values(r), []),
);
run(
  "forma de pagamento exigida e não informada não casa",
  { rules: [baseRule({ forma_pagamento: "Pix" })], formaPagamento: null },
  (r) => assert.deepStrictEqual(values(r), []),
);

// 8. Parcelas: a condição NÃO bloqueia mais a elegibilidade; o critério é devolvido
// em condicaoParcelas para o card bloquear os planos incompatíveis.
run(
  "regra com parcelas é liberada sem quantidade informada e devolve o critério",
  { rules: [baseRule({ condicao_parcelas_operador: "menor_que", condicao_parcelas_valor: "5" })] },
  (r) => {
    assert.deepStrictEqual(values(r), ["CAT_TESTE"]);
    assert.deepStrictEqual(r.categories[0].condicaoParcelas, {
      operador: "menor_que",
      valor: 5,
      valor2: null,
    });
  },
);
run(
  "regra sem parcelas devolve condicaoParcelas null",
  { rules: [baseRule()] },
  (r) => assert.strictEqual(r.categories[0].condicaoParcelas, null),
);
run(
  "parcelas menor que 5 casa com 3",
  {
    rules: [baseRule({ condicao_parcelas_operador: "menor_que", condicao_parcelas_valor: "5" })],
    qtdeParcelas: 3,
  },
  (r) => assert.deepStrictEqual(values(r), ["CAT_TESTE"]),
);
run(
  "parcelas menor que 5 não casa com 6",
  {
    rules: [baseRule({ condicao_parcelas_operador: "menor_que", condicao_parcelas_valor: "5" })],
    qtdeParcelas: 6,
  },
  (r) => assert.deepStrictEqual(values(r), []),
);
run(
  "parcelas entre 6 e 12 casa com 8",
  {
    rules: [
      baseRule({
        condicao_parcelas_operador: "entre",
        condicao_parcelas_valor: "6",
        condicao_parcelas_valor_2: "12",
      }),
    ],
    qtdeParcelas: 8,
  },
  (r) => assert.deepStrictEqual(values(r), ["CAT_TESTE"]),
);
run(
  "parcelas entre 6 e 12 não casa com 13",
  {
    rules: [
      baseRule({
        condicao_parcelas_operador: "entre",
        condicao_parcelas_valor: "6",
        condicao_parcelas_valor_2: "12",
      }),
    ],
    qtdeParcelas: 13,
  },
  (r) => assert.deepStrictEqual(values(r), []),
);

// 9. Prioridade por categoria
run(
  "menor prioridade vence a mesma categoria",
  {
    rules: [
      baseRule({ nome_do_desconto: "Perdedora", categoria_sei: "MESMA", prioridade: "2" }),
      baseRule({ nome_do_desconto: "Vencedora", categoria_sei: "MESMA", prioridade: "1" }),
    ],
  },
  (r) => assert.deepStrictEqual(r.categories.map((item) => item.label), ["Vencedora"]),
);

// 10. Acumulação entre descontos do objeto
run(
  "sem acumulação entre objetos mantém apenas a maior prioridade",
  {
    rules: [
      baseRule({ nome_do_desconto: "A", categoria_sei: "A", prioridade: "1", permite_acumulacao: "true" }),
      baseRule({ nome_do_desconto: "B", categoria_sei: "B", prioridade: "2", permite_acumulacao: "false" }),
    ],
  },
  (r) => assert.deepStrictEqual(values(r), ["A"]),
);
run(
  "com acumulação mantém as duas",
  {
    rules: [
      baseRule({ nome_do_desconto: "A", categoria_sei: "A", prioridade: "1", permite_acumulacao: "true" }),
      baseRule({ nome_do_desconto: "B", categoria_sei: "B", prioridade: "2", permite_acumulacao: "true" }),
    ],
  },
  (r) => assert.deepStrictEqual(values(r).sort(), ["A", "B"]),
);
run(
  "regra de maior prioridade sem acumulação bloqueia as demais",
  {
    rules: [
      baseRule({ nome_do_desconto: "A", categoria_sei: "A", prioridade: "1", permite_acumulacao: "false" }),
      baseRule({ nome_do_desconto: "B", categoria_sei: "B", prioridade: "2", permite_acumulacao: "true" }),
    ],
  },
  (r) => assert.deepStrictEqual(values(r), ["A"]),
);

// 11. Categoria obrigatória e nenhuma regra
run("categoria_sei vazia é ignorada", { rules: [baseRule({ categoria_sei: "" })] }, (r) => {
  assert.deepStrictEqual(values(r), []);
});
run("sem regras não retorna nada", { rules: [] }, (r) => {
  assert.deepStrictEqual(values(r), []);
}, { checkTrace: false });

// 12. "Todas as opções" como curinga nos critérios de elegibilidade
run(
  "unidade 'Todas as opções' casa com qualquer unidade",
  { rules: [baseRule({ unidade_ensino: "Todas as opções" })], unidade: "Recife" },
  (r) => assert.deepStrictEqual(values(r), ["CAT_TESTE"]),
);
run(
  "nível 'Todas as opções' casa com qualquer nível",
  { rules: [baseRule({ nivel_interesse: "Todas as opções" })], nivelDeInteresse: "Graduação" },
  (r) => assert.deepStrictEqual(values(r), ["CAT_TESTE"]),
);
run(
  "modalidade 'Todas as opções' casa com qualquer modalidade",
  { rules: [baseRule({ modalidade_ensino: "Todas as opções" })], modalidadeDeInteresse: "EAD" },
  (r) => assert.deepStrictEqual(values(r), ["CAT_TESTE"]),
);
run(
  "forma de pagamento 'Todas as opções' casa com qualquer forma",
  { rules: [baseRule({ forma_pagamento: "Todas as opções" })], formaPagamento: "BOLETO" },
  (r) => assert.deepStrictEqual(values(r), ["CAT_TESTE"]),
);
run(
  "equipe 'Todas as opções' casa com qualquer equipe",
  { rules: [baseRule({ equipe: "Todas as opções" })], equipeTime: "3.1.4.1. Pós EAD A" },
  (r) => assert.deepStrictEqual(values(r), ["CAT_TESTE"]),
);
run(
  "turma 'Todas as opções' casa com qualquer turma",
  { rules: [baseRule({ turma: "Todas as opções" })], turma: "ADM11262M" },
  (r) => assert.deepStrictEqual(values(r), ["CAT_TESTE"]),
);
run(
  "curinga junto de valor concreto continua não restringindo",
  { rules: [baseRule({ unidade_ensino: "Todas as opções;Goiânia" })], unidade: "Recife" },
  (r) => assert.deepStrictEqual(values(r), ["CAT_TESTE"]),
);
run(
  "curinga em um campo não afeta o E entre campos distintos",
  {
    rules: [baseRule({ unidade_ensino: "Todas as opções", modalidade_ensino: "Presencial" })],
    unidade: "Recife",
    modalidadeDeInteresse: "EAD",
  },
  (r) => assert.deepStrictEqual(values(r), []),
);
run(
  "forma de pagamento concreta ainda restringe (sem curinga)",
  { rules: [baseRule({ forma_pagamento: "PIX" })], formaPagamento: "BOLETO" },
  (r) => assert.deepStrictEqual(values(r), []),
);

// 12b. Equipe por time HubSpot do negócio, comparação por CONTER
run(
  "equipe casa por conter no nome do time HubSpot",
  { rules: [baseRule({ equipe: "Teresina" })], equipeTime: "3.1.1.1.7. Teresina" },
  (r) => assert.deepStrictEqual(values(r), ["CAT_TESTE"]),
);
run(
  "equipe casa com time de gestor (sem filtro de gestor)",
  { rules: [baseRule({ equipe: "Acelera A" })], equipeTime: "3.1.1.1.1. Acelera A - Gestor" },
  (r) => assert.deepStrictEqual(values(r), ["CAT_TESTE"]),
);
run(
  "equipe não casa quando o time não contém o nome",
  { rules: [baseRule({ equipe: "Teresina" })], equipeTime: "3.1.1.1.3. Goiânia" },
  (r) => assert.deepStrictEqual(values(r), []),
);
run(
  "equipe não casa quando o negócio não tem time",
  { rules: [baseRule({ equipe: "Teresina" })], equipeTime: null },
  (r) => assert.deepStrictEqual(values(r), []),
);
run(
  "equipe multisseleção casa por qualquer opção no nome do time",
  { rules: [baseRule({ equipe: "Goiânia;Teresina" })], equipeTime: "3.1.1.1.7. Teresina" },
  (r) => assert.deepStrictEqual(values(r), ["CAT_TESTE"]),
);

// 13. Helper evaluateInstallments (usado pelo card para bloquear planos)
const { evaluateInstallments } = require("../src/app/functions/evaluateObjectDiscounts");
run("evaluateInstallments: sem operador devolve null", {}, (r) => {
  assert.strictEqual(evaluateInstallments("", "5", "", 3), null);
}, { checkTrace: false });
run("evaluateInstallments: sem quantidade devolve undefined", {}, (r) => {
  assert.strictEqual(evaluateInstallments("menor_ou_igual", "6", "", null), undefined);
}, { checkTrace: false });
run("evaluateInstallments: menor_ou_igual 6 com 6 = true", {}, (r) => {
  assert.strictEqual(evaluateInstallments("menor_ou_igual", "6", "", 6), true);
}, { checkTrace: false });
run("evaluateInstallments: menor_ou_igual 6 com 7 = false", {}, (r) => {
  assert.strictEqual(evaluateInstallments("menor_ou_igual", "6", "", 7), false);
}, { checkTrace: false });
run("evaluateInstallments: entre 3 e 6 com 4 = true", {}, (r) => {
  assert.strictEqual(evaluateInstallments("entre", "3", "6", 4), true);
}, { checkTrace: false });
run("evaluateInstallments: entre 3 e 6 com 7 = false", {}, (r) => {
  assert.strictEqual(evaluateInstallments("entre", "3", "6", 7), false);
}, { checkTrace: false });

console.log(`\n${passed} testes do motor de descontos do objeto passaram.`);