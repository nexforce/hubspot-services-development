const axios = require("axios");

/**
 * Grava as categorias de desconto selecionadas no negócio (propriedade categoriacondicao).
 * Usado pelo card para limpar a seleção quando o conjunto elegível muda (ex.: troca de
 * convênio normal -> especial), evitando que a seleção antiga continue liberando o
 * desconto errado. Idempotente: só grava quando o valor muda.
 *
 * Autenticação: HUBSPOT_API_KEY (secret da conta, padrão das functions do app).
 */
exports.main = async (context = {}) => {
  const { dealId, categories } = context.parameters || {};

  if (!dealId) {
    return { status: "ERROR", origin: "SISTEMA", message: "dealId é obrigatório." };
  }

  const token = process.env.HUBSPOT_API_KEY;
  if (!token) {
    return { status: "ERROR", origin: "SISTEMA", message: "HUBSPOT_API_KEY não configurada." };
  }

  const value = String(categories || "");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const dealUrl = `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`;

  try {
    const currentResponse = await axios({
      method: "GET",
      url: `${dealUrl}?properties=categoriacondicao`,
      headers,
    });
    const currentValue = currentResponse.data?.properties?.categoriacondicao || "";
    if (currentValue === value) {
      return { status: "SUCCESS", response: { categories: value, changed: false } };
    }

    await axios({
      method: "PATCH",
      url: dealUrl,
      headers,
      data: { properties: { categoriacondicao: value } },
    });
    return { status: "SUCCESS", response: { categories: value, changed: true } };
  } catch (error) {
    console.error("Erro ao salvar as categorias do desconto:", error.message);
    return {
      status: "ERROR",
      origin: "HUBSPOT",
      message:
        error.response?.data?.message ||
        error.message ||
        "Falha ao salvar as categorias do desconto.",
    };
  }
};
