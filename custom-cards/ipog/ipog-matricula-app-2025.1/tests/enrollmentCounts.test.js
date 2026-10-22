/**
 * Testes do núcleo de contagem de matrículas por CPF (etapa 3).
 * Execução: node tests/enrollmentCounts.test.js (a partir da raiz do projeto do card).
 * Sem dependências: usa apenas o módulo assert do Node.
 *
 * Dados reais de exemplo fornecidos pelo consultor (2026-10-08).
 */
const assert = require("assert");
const { summarizeEnrollments, classifyLevel } = require("../src/app/functions/countEnrollmentsByCpf");

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`ok - ${name}`);
}

// Exemplo 1: MARIA (1 matrícula, Pós-Graduação, AT)
const maria = [
  { matricula: "00390000000CTF0451", nomeCurso: "MBA Contabilidade Tributária", nivelEducacional: "Pós-Graduação", siglaNivelEducacional: "PO", situacaoMatricula: "AT", identificadorTurma: "DZCTFMAN006", unidadeEnsino: "MANAUS - IPOG" },
];

// Exemplo 2: RANIELY (19 matrículas com status AT/FO/TI/CA e níveis PO/EX/SU/GT)
const raniely = [
  { matricula: "00190000000MES0291", nomeCurso: "Docência e Metodologias", nivelEducacional: "Pós-Graduação", siglaNivelEducacional: "PO", situacaoMatricula: "FO" },
  { matricula: "00270000000AVA000288", nomeCurso: "CEU: Academia de Vendas", nivelEducacional: "CEU", siglaNivelEducacional: "EX", situacaoMatricula: "AT" },
  { matricula: "00270000000GCE0134", nomeCurso: "MBA Gestão Comercial", nivelEducacional: "Pós-Graduação", siglaNivelEducacional: "PO", situacaoMatricula: "AT" },
  { matricula: "00270000000GPM0019", nomeCurso: "MBA Gestão de Projetos", nivelEducacional: "Pós-Graduação", siglaNivelEducacional: "PO", situacaoMatricula: "AT" },
  { matricula: "00270000000GPP1149", nomeCurso: "MBA Gestão de Projetos e Processos", nivelEducacional: "Pós-Graduação", siglaNivelEducacional: "PO", situacaoMatricula: "TI" },
  { matricula: "00270000000IAF000001", nomeCurso: "CEU: IA na Prática", nivelEducacional: "CEU", siglaNivelEducacional: "EX", situacaoMatricula: "FO" },
  { matricula: "00270000000NCI0092", nomeCurso: "Neuropsicopedagogia", nivelEducacional: "Pós-Graduação", siglaNivelEducacional: "PO", situacaoMatricula: "CA" },
  { matricula: "002700000CAPEX001808", nomeCurso: "CEU: Excel Completo", nivelEducacional: "CEU", siglaNivelEducacional: "EX", situacaoMatricula: "FO" },
  { matricula: "00270000CAPFLE001606", nomeCurso: "CEU: Formação em Liderança", nivelEducacional: "CEU", siglaNivelEducacional: "EX", situacaoMatricula: "AT" },
  { matricula: "00270000CAPOIA001360", nomeCurso: "CEU: Oratória", nivelEducacional: "CEU", siglaNivelEducacional: "EX", situacaoMatricula: "CA" },
  { matricula: "00270000CEUIAN000204", nomeCurso: "CEU: Imersão em IA", nivelEducacional: "CEU", siglaNivelEducacional: "EX", situacaoMatricula: "TI" },
  { matricula: "00273840000CAA000140", nomeCurso: "CEU: ABA", nivelEducacional: "CEU", siglaNivelEducacional: "EX", situacaoMatricula: "CA" },
  { matricula: "00274280000MAG000398", nomeCurso: "CEU: Métodos Ágeis", nivelEducacional: "CEU", siglaNivelEducacional: "EX", situacaoMatricula: "AT" },
  { matricula: "00274290000APN000694", nomeCurso: "CEU: Equipes de Alta Performance", nivelEducacional: "CEU", siglaNivelEducacional: "EX", situacaoMatricula: "AT" },
  { matricula: "00274390000CEC000236", nomeCurso: "CEU: Governança Corporativa", nivelEducacional: "CEU", siglaNivelEducacional: "EX", situacaoMatricula: "AT" },
  { matricula: "002747400CAPGT000855", nomeCurso: "CEU: Gestão do Tempo", nivelEducacional: "CEU", siglaNivelEducacional: "EX", situacaoMatricula: "AT" },
  { matricula: "0029925CAPLIB000027", nomeCurso: "EXT: Língua Inglesa", nivelEducacional: "CEU", siglaNivelEducacional: "EX", situacaoMatricula: "FO" },
  { matricula: "029021000ADM000227", nomeCurso: "ADMINISTRAÇÃO", nivelEducacional: "Graduação", siglaNivelEducacional: "SU", situacaoMatricula: "CA" },
  { matricula: "02999800TADS000804", nomeCurso: "ANÁLISE E DESENVOLVIMENTO DE SISTEMAS", nivelEducacional: "Graduação Tecnólogo", siglaNivelEducacional: "GT", situacaoMatricula: "AT" },
];

check("Maria: 1 matrícula ativa de Pós-Graduação", () => {
  const r = summarizeEnrollments(maria);
  assert.deepStrictEqual(r.counts, { pos: 1, graduacao: 0, ceu: 0 });
  assert.strictEqual(r.total, 1);
  assert.deepStrictEqual(r.groups.map((g) => g.label), ["Pós-graduação"]);
  assert.strictEqual(r.groups[0].matriculas[0].statusLabel, "Ativo");
});

check("Raniely: contagem por nível (AT+FO), ignorando TI e CA", () => {
  const r = summarizeEnrollments(raniely);
  assert.deepStrictEqual(r.counts, { pos: 3, graduacao: 1, ceu: 9 });
  assert.strictEqual(r.total, 13);
});

check("Raniely: grupos exibem os três níveis", () => {
  const r = summarizeEnrollments(raniely);
  assert.deepStrictEqual(r.groups.map((g) => g.key), ["pos", "graduacao", "ceu"]);
  const pos = r.groups.find((g) => g.key === "pos");
  assert.strictEqual(pos.total, 3);
  const labels = pos.matriculas.map((m) => m.statusLabel);
  assert.ok(labels.includes("Formado") && labels.includes("Ativo"), "status mistos devem aparecer");
});

check("status TI e CA não aparecem em nenhum grupo", () => {
  const r = summarizeEnrollments(raniely);
  const ids = r.groups.flatMap((g) => g.matriculas.map((m) => m.id));
  for (const excluded of ["00270000000GPP1149", "00270000000NCI0092", "00270000CAPOIA001360", "00273840000CAA000140", "00270000CEUIAN000204", "029021000ADM000227"]) {
    assert.ok(!ids.includes(excluded), `não deveria conter ${excluded}`);
  }
});

check("classificação: Graduação Tecnólogo conta como Graduação", () => {
  assert.strictEqual(classifyLevel("Graduação Tecnólogo", "GT"), "graduacao");
  assert.strictEqual(classifyLevel("Graduação", "SU"), "graduacao");
  assert.strictEqual(classifyLevel("Pós-Graduação", "PO"), "pos");
  assert.strictEqual(classifyLevel("CEU", "EX"), "ceu");
  assert.strictEqual(classifyLevel("Mestrado", "ME"), "outros");
});

check("lista vazia retorna zeros", () => {
  const r = summarizeEnrollments([]);
  assert.deepStrictEqual(r.counts, { pos: 0, graduacao: 0, ceu: 0 });
  assert.strictEqual(r.total, 0);
  assert.deepStrictEqual(r.groups, []);
});

check("grupos exibem formadas antes das ativas", () => {
  const list = [
    { matricula: "A1", nomeCurso: "Curso 1", nivelEducacional: "Pós-Graduação", siglaNivelEducacional: "PO", situacaoMatricula: "AT" },
    { matricula: "F1", nomeCurso: "Curso 2", nivelEducacional: "Pós-Graduação", siglaNivelEducacional: "PO", situacaoMatricula: "FO" },
    { matricula: "A2", nomeCurso: "Curso 3", nivelEducacional: "Pós-Graduação", siglaNivelEducacional: "PO", situacaoMatricula: "AT" },
    { matricula: "F2", nomeCurso: "Curso 4", nivelEducacional: "Pós-Graduação", siglaNivelEducacional: "PO", situacaoMatricula: "FO" },
  ];
  const r = summarizeEnrollments(list);
  assert.deepStrictEqual(
    r.groups[0].matriculas.map((m) => m.id),
    ["F1", "F2", "A1", "A2"],
  );
});

console.log(`\n${passed} testes de contagem de matrículas passaram.`);
