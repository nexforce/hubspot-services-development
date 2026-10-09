/**
 * Testes da ordenação das indicações diamante por expiração mais próxima.
 * Execução: node tests/diamanteExpirationSort.test.js (a partir da raiz do projeto do card).
 * Sem dependências: usa apenas o módulo assert do Node.
 */
const assert = require("assert");
const {
  expirationTime,
  sortByExpirationAscending,
} = require("../src/app/functions/fetchDiamanteIndications");

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

check("expiração mais próxima primeiro (ISO)", () => {
  const list = [
    { id: "a", data_de_expiracao: "2027-05-01" },
    { id: "b", data_de_expiracao: "2026-11-01" },
    { id: "c", data_de_expiracao: "2027-01-15" },
  ];
  const sorted = sortByExpirationAscending(list).map((d) => d.id);
  assert.deepStrictEqual(sorted, ["b", "c", "a"]);
});

check("indicação sem data vai para o fim", () => {
  const list = [
    { id: "sem-data", data_de_expiracao: "" },
    { id: "expira", data_de_expiracao: "2026-12-01" },
    { id: "nula", data_de_expiracao: null },
  ];
  const sorted = sortByExpirationAscending(list).map((d) => d.id);
  assert.strictEqual(sorted[0], "expira");
  assert.deepStrictEqual(sorted.slice(1).sort(), ["nula", "sem-data"]);
});

check("aceita epoch em milissegundos (string numérica)", () => {
  const list = [
    { id: "depois", data_de_expiracao: "1798761600000" }, // 2027-01-01
    { id: "antes", data_de_expiracao: "1764547200000" }, // 2025-12-01
  ];
  const sorted = sortByExpirationAscending(list).map((d) => d.id);
  assert.deepStrictEqual(sorted, ["antes", "depois"]);
});

check("data inválida vai para o fim", () => {
  const list = [
    { id: "invalida", data_de_expiracao: "31/12/2026" },
    { id: "valida", data_de_expiracao: "2026-12-01" },
  ];
  const sorted = sortByExpirationAscending(list).map((d) => d.id);
  assert.deepStrictEqual(sorted, ["valida", "invalida"]);
});

check("não muta a lista original", () => {
  const list = [
    { id: "a", data_de_expiracao: "2027-05-01" },
    { id: "b", data_de_expiracao: "2026-11-01" },
  ];
  sortByExpirationAscending(list);
  assert.deepStrictEqual(list.map((d) => d.id), ["a", "b"]);
});

check("expirationTime: vazio/inválido = Infinity", () => {
  assert.strictEqual(expirationTime(""), Number.POSITIVE_INFINITY);
  assert.strictEqual(expirationTime(null), Number.POSITIVE_INFINITY);
  assert.strictEqual(expirationTime("31/12/2026"), Number.POSITIVE_INFINITY);
});

console.log(`\n${passed} testes de ordenação de indicações passaram.`);
