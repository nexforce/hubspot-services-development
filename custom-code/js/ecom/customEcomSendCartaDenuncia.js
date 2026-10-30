const dotenv = require("dotenv");

// Utiliza o arquivo .env para obter o accessToken (Importante: nunca mandar o accessToken para o repositório!)
dotenv.config();

// Ao mandar pro custom code do fluxo, copiar a partir desta linha até o comentário [FINAL]
const axios = require("axios");
const zapSignToken = process.env.ZAPSIGN_TOKEN;

async function sendCartaDenuncia(data) {
  try {
    const headers = {
      Authorization: `Bearer ${zapSignToken}`,
      "Content-type": "application/json",
    };

    const payload = {
      name: `CARTA DENÚNCIA - ${data.codigo_uc} - ${data.razao_social}`,
      url_pdf: data.signedUrl,
      external_id: data.objectId,
      signers: [
        {
          name: data.nome_do_assinante_da_procuracao,
          email: data.email_do_assinante_da_procuracao,
          auth_mode: "assinaturaTela",
          send_automatic_email: true,
        },
      ],
      lang: "pt-br",
      disable_signer_emails: false,
      signature_order_active: false,
      created_by: data.ownerEmail,
      reminder_every_n_days: 1,
      allow_refuse_signature: false,
      disable_signers_get_original_file: false,
      folder_path: "/Carta Denuncia",
    };

    console.log(payload);

    const response = await axios({
      method: "POST",
      url: "https://api.zapsign.com.br/api/v1/docs",
      data: payload,
      headers,
    });

    return response.data;
  } catch (error) {
    console.error("Error sending Carta denúncia.", error.message);

    throw new Error(error.message);
  }
}

exports.main = async (event, callback) => {
  try {
    const data = Object.assign(event.inputFields, event.object);

    const response = await sendCartaDenuncia(data);
    console.log(response);

    return await callback({
      outputFields: {
        documentUrl: response.original_file,
        signUrl: response.signers[0].sign_url,
        token: response.token,
        url: `https://app.zapsign.com.br/conta/documentos/${response.token}`,
      },
    });
  } catch (err) {
    console.error(err);
    // Force retry if error is on cloudflare's side. (https://developers.hubspot.com/docs/api/error-handling#custom-code-workflow-actions)
    if (axios.isAxiosError(err) && JSON.stringify(err).includes("cloudflare"))
      err.response.status = 500;
    // We will automatically retry when the code fails because of a rate limiting error from the HubSpot API.
    throw err;
  }
};

// [FINAL]

exports.main(
  {
    inputFields: {
      signedUrl:
        "https://44189480.cdnp1.hubspotusercontent-na1.net/hubfs/44189480/crm-properties-file-values/1317880-1.pdf?Expires=1746723792&Signature=RYOWbfcS7EKIOL14h7xqeHl4e13IeNYf3pwRv-1JEFshjtaTSuIIBpqdpFCpOrV9ehxrwEYhuljVbNGaWEeX6TYdNqdQtyPPxQ~TNvnVbq-wDPC8hIKFjjU8EZ1XD~Ssfusy-EwloBc35teOiNWkBEoIqj3t5nDmeaEcEw8P3lFIdIs0tjBTP-ZgvNRvitK8Cz8oREgmhvqi~NXmD~Xdsmcbc0X3YVHRDfVWag13SrgrMXdtD7wfkTWNMM5vU20kGgOXu4ouR4rUiu6towTIA4T9hyRg~SXi0GqN2x5KjhdCGrKoBE-CEmfOOOwbMVTqnIPO0S-fzDGnxcu3j~EeBw__&Key-Pair-Id=APKAJDNICOKANPHVCSBQ",
      ownerEmail: "luiz.dias@nexforce.co",
      codigo_uc: "123321",
      razao_social: "Testando envio",
      e_mail_do_representante_legal: "lf-representante@teste.com",
      nome_do_assinante_da_procuracao: "teste",
      email_do_assinante_da_procuracao: "teste@email.com",
    },
    object: { objectId: 12887363680 },
  },
  console.log
);
