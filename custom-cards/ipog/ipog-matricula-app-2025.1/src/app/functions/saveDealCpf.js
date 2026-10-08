const axios = require("axios");

/**
 * Grava o CPF digitado no card na propriedade `cpf` do negócio, no mesmo padrão do
 * card de Graduação (mascarado). A comparação de "mudou" é feita por dígitos, para
 * regravar o mesmo CPF não contar como alteração. O portal tem workflow que normaliza
 * o CPF (remove máscara) na propriedade, então ambos os formatos são aceitos na leitura.
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

    await axios({
      method: "PATCH",
      url: dealUrl,
      headers,
      data: { properties: { cpf: maskedCpf } },
    });

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
