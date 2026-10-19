const axios = require("axios");

/**
 * Grava o CPF digitado no card na propriedade `cpf` do negócio, no mesmo padrão do
 * card de Graduação (mascarado). O portal tem workflow que normaliza o CPF (remove
 * máscara) na propriedade, então ambos os formatos são aceitos na leitura.
 *
 * A gravação é feita em duas etapas: primeiro LIMPA `cpf` e `cpf_desconto_avaliado`,
 * depois grava o valor informado. Isso garante que o workflow do portal detecte a
 * alteração mesmo quando o CPF digitado é igual ao que já estava no negócio, e que
 * `cpf_desconto_avaliado` nunca fique desatualizado em relação a `cpf`.
 *
 * `cpf_desconto_avaliado` registra QUAL CPF originou a avaliação de descontos. Essa
 * propriedade trava a troca de CPF no Checkout Card e valida a matrícula: o desconto
 * só vale para o CPF que o gerou. Quando o CPF é limpo, a propriedade é limpa junto.
 *
 * Autenticação: HUBSPOT_API_KEY (secret da conta, padrão de todas as functions do app).
 */
exports.main = async (context = {}) => {
  const { dealId, cpf } = context.parameters || {};
  const digits = String(cpf || "").replace(/\D/g, "");

  if (!dealId) {
    return { status: "ERROR", origin: "SISTEMA", message: "dealId é obrigatório." };
  }
  if (digits.length !== 0 && digits.length !== 11) {
    return {
      status: "ERROR",
      origin: "SISTEMA",
      message: "CPF deve ter exatamente 11 dígitos (ou ficar vazio para limpar).",
    };
  }

  const token = process.env.HUBSPOT_API_KEY;
  if (!token) {
    return { status: "ERROR", origin: "SISTEMA", message: "HUBSPOT_API_KEY não configurada." };
  }

  const maskedCpf =
    digits.length === 11
      ? `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
      : "";

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const dealUrl = `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`;

  try {
    const currentResponse = await axios({ method: "GET", url: `${dealUrl}?properties=cpf`, headers });
    const currentDigits = String(currentResponse.data?.properties?.cpf || "").replace(/\D/g, "");
    const changed = digits !== currentDigits;

    // Etapa 1: limpa as duas propriedades.
    await axios({
      method: "PATCH",
      url: dealUrl,
      headers,
      data: { properties: { cpf: "", cpf_desconto_avaliado: "" } },
    });

    // Etapa 2: grava o valor informado (quando houver). Com o campo vazio, o CPF
    // permanece limpo e o desconto passa a ser avaliado sem histórico de matrículas.
    if (maskedCpf) {
      await axios({
        method: "PATCH",
        url: dealUrl,
        headers,
        data: { properties: { cpf: maskedCpf, cpf_desconto_avaliado: maskedCpf } },
      });
    }

    return { status: "SUCCESS", response: { cpf: maskedCpf, changed } };
  } catch (error) {
    console.error("Erro ao salvar CPF no negócio:", error.message);
    return {
      status: "ERROR",
      origin: "HUBSPOT",
      message:
        error.response?.data?.message ||
        error.message ||
        "Falha ao salvar o CPF no negócio.",
    };
  }
};
