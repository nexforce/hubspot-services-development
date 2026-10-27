/**
 * Regressão do erro "Cannot access 'discountCodes' before initialization".
 * O description dos line items usa discountCodes como fallback, então a
 * declaração precisa vir antes do primeiro uso; caso contrário o bundle
 * lança ReferenceError (TDZ) em deals de CEU, que têm line item.
 * Execução: node tests/discountCodesDeclarationOrder.test.js
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(
  path.join(__dirname, "..", "src", "app", "functions", "updateDealProperties.js"),
  "utf8",
);

const lines = source.split(/\r?\n/);
const declarationLines = [];

lines.forEach((line, index) => {
  if (/\bconst\s+discountCodes\s*=/.test(line)) declarationLines.push(index + 1);
});

assert.strictEqual(
  declarationLines.length,
  1,
  `esperava uma única declaração de discountCodes, encontrou ${declarationLines.length}`,
);

const declarationLine = declarationLines[0];
const firstUsageAfterDeclaration = lines
  .map((line, index) => ({ line, number: index + 1 }))
  .filter(({ line }) => /\bdiscountCodes\b/.test(line) && !/\bconst\s+discountCodes\s*=/.test(line));

assert.ok(firstUsageAfterDeclaration.length > 0, "discountCodes deveria ser usado no arquivo");

const beforeDeclaration = firstUsageAfterDeclaration.filter(({ number }) => number < declarationLine);
assert.deepStrictEqual(
  beforeDeclaration.map(({ number, line }) => `${number}: ${line.trim()}`),
  [],
  "uso de discountCodes antes da declaração gera TDZ",
);

console.log("OK: discountCodes declarado na linha", declarationLine);
