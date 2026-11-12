const axios = require("axios");

// O card não pode chamar URL externa direto, então esta função faz o proxy da
// lista de países do IBGE. É o mesmo catálogo oficial usado pelos sistemas do
// governo brasileiro para país de nascimento: cada país vem com o código M49,
// que é o valor que o cadastro do aluno recebe em codigoIBGENaturalidade.
const IBGE_COUNTRIES_URL =
  "https://servicodados.ibge.gov.br/api/v1/localidades/paises";

exports.main = async () => {
  try {
    const response = await axios.get(IBGE_COUNTRIES_URL);

    if (!Array.isArray(response.data)) {
      return {
        status: "ERROR",
        origin: "IBGE",
        message: "Lista de países em formato inesperado.",
      };
    }

    const countries = response.data
      .map((country) => ({
        label: country.nome || "",
        // O M49 é numérico; a string evita que o Select trate o código como
        // número e perca zeros à esquerda.
        value: String(country.id?.["M49"] ?? ""),
      }))
      .filter((country) => country.value && country.label)
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

    return {
      status: "SUCCESS",
      response: { countries },
    };
  } catch (error) {
    console.error("Error fetching countries:", error);

    return {
      status: "ERROR",
      origin: "IBGE",
      message: "Erro ao buscar a lista de países. Tente novamente.",
    };
  }
};
