const axios = require("axios");

async function addSignerToDocument(token_doc, signerData, api_token) {
  const data = {
    email: signerData.email,
    name: `${signerData.firstName} ${signerData.lastName}` || "",
    send_automatic_email: true,
  };
  const url = `https://api.zapsign.com.br/api/v1/docs/${token_doc}/add-signer/`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${api_token}`,
  };
  console.log("Data:", data);
  try {
    const response = await axios.post(url, data, { headers });
    console.log(
      `Assinante ${signerData.email} adicionado com sucesso:`,
      response.data
    );
    return response.data;
  } catch (error) {
    console.error(
      "Erro ao adicionar assinante:",
      error.response ? error.response.data : error.message
    );
    throw new Error(
      `Erro ao adicionar assinante: ${
        error.response ? JSON.stringify(error.response.data) : error.message
      }`
    );
  }
}

exports.main = async (event, callback) => {
  const { tokenDoc, remainingSignatories } = event.inputFields;
  const cleanToken = tokenDoc.trim().replace(/"/g, "");
  console.log("Token do documento:", cleanToken);

  const remainingSignatoriesParsed = JSON.parse(remainingSignatories);
  console.log("Signatários parseados:", remainingSignatoriesParsed);

  const apiToken = process.env.ZAPSIGN_TOKEN;

  try {
    for (const signer of remainingSignatoriesParsed) {
      console.log("Processando signatário:", signer.email);

      const responsePayload = await addSignerToDocument(
        cleanToken,
        signer,
        apiToken
      );
      console.log("Payload de resposta da ZapSign:", responsePayload);
    }

    console.log("Todos os signatários foram adicionados.");
    callback({
      success: true,
      message: "Signatários adicionados com sucesso.",
    });
  } catch (error) {
    console.error("Erro geral ao adicionar signatários:", error.message);
  }
};
