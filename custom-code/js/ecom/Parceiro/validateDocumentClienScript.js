(function () {
  "use strict";

  // ─── CNPJ ────────────────────────────────────────────────────────────────

  function maskCNPJ(value) {
    value = value.replace(/\D/g, "");
    value = value.substring(0, 14);
    if (value.length <= 2) {
      return value;
    } else if (value.length <= 5) {
      return value.replace(/(\d{2})(\d{0,3})/, "$1.$2");
    } else if (value.length <= 8) {
      return value.replace(/(\d{2})(\d{3})(\d{0,3})/, "$1.$2.$3");
    } else if (value.length <= 12) {
      return value.replace(/(\d{2})(\d{3})(\d{3})(\d{0,4})/, "$1.$2.$3/$4");
    } else {
      return value.replace(
        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/,
        "$1.$2.$3/$4-$5",
      );
    }
  }

  function validateCNPJ(cnpj) {
    cnpj = cnpj.replace(/\D/g, "");
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1+$/.test(cnpj)) return false;
    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
      soma += numeros.charAt(tamanho - i) * pos--;
      if (pos < 2) pos = 9;
    }
    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado != digitos.charAt(0)) return false;
    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
      soma += numeros.charAt(tamanho - i) * pos--;
      if (pos < 2) pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado != digitos.charAt(1)) return false;
    return true;
  }

  // ─── CPF ─────────────────────────────────────────────────────────────────

  function maskCPF(value) {
    value = value.replace(/\D/g, "");
    value = value.substring(0, 11);
    if (value.length <= 3) {
      return value;
    } else if (value.length <= 6) {
      return value.replace(/(\d{3})(\d{0,3})/, "$1.$2");
    } else if (value.length <= 9) {
      return value.replace(/(\d{3})(\d{3})(\d{0,3})/, "$1.$2.$3");
    } else {
      return value.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, "$1.$2.$3-$4");
    }
  }

  function validateCPF(cpf) {
    cpf = cpf.replace(/\D/g, "");
    if (cpf.length !== 11) return false;
    if (/^(\d)\1+$/.test(cpf)) return false;

    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(9))) return false;

    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(10))) return false;

    return true;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  function showFieldError(input, message) {
    clearFieldError(input);
    input.classList.add("invalid", "error");
    const errorMsg = document.createElement("ul");
    errorMsg.className = "hs-error-msgs inputs-list cnpj-error-msg";
    errorMsg.setAttribute("role", "alert");
    errorMsg.innerHTML = `<li><label class="hs-error-msg">${message}</label></li>`;
    input.parentElement.appendChild(errorMsg);
  }

  function clearFieldError(input) {
    input.classList.remove("invalid", "error");
    const existing = input.parentElement.querySelector(".cnpj-error-msg");
    if (existing) existing.remove();
  }

  async function fetchCNPJData(cnpjNumber) {
    const cnpj = cnpjNumber.replace(/\D/g, "");
    console.log("Consultando o CNPJ ", cnpj);
    try {
      const response = await fetch(
        `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
      );
      if (response.status === 404) {
        return { erro: "nao_encontrado" };
      }
      if (!response.ok) {
        console.warn("Erro inesperado:", response.status);
        return null;
      }
      const data = await response.json();
      console.log("Dados do CNPJ:", data);
      return data;
    } catch (error) {
      console.error("Erro ao consultar BrasilAPI:", error);
      return null;
    }
  }

  function fillFormFields(data, cnpjInput) {
    const form = cnpjInput.closest("form");

    const fullName = data.qsa && data.qsa[0] ? data.qsa[0].nome_socio : null;
    let firstName = null;
    let lastName = null;

    if (fullName) {
      const nameParts = fullName.trim().split(" ");
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(" ");
    }

    const fields = [
      { selector: 'input[name="firstname"]', value: firstName },
      { selector: 'input[name="lastname"]', value: lastName },
      { selector: 'input[name="email"]', value: data.email },
      { selector: 'input[name="mobilephone"]', value: data.ddd_telefone_1 },
      {
        selector: 'input[name="agente__qual_sua_area_de_atuacao_"]',
        value: data.cnae_fiscal_descricao,
      },
      { selector: 'input[name="razao_social"]', value: data.razao_social },
    ];

    fields.forEach(function (field) {
      if (
        field.value === null ||
        field.value === undefined ||
        field.value === ""
      )
        return;
      const input = form.querySelector(field.selector);
      if (input) {
        input.value = field.value;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  }

  function toggleSubmitBtn(submitBtn, disabled) {
    submitBtn.disabled = disabled;
    if (disabled) {
      submitBtn.classList.add("btn-disabled");
    } else {
      submitBtn.classList.remove("btn-disabled");
    }
  }

  // ─── Init CNPJ ───────────────────────────────────────────────────────────

  function initCNPJMask() {
    const checkFormInterval = setInterval(function () {
      const cnpjInput = document.querySelector(
        'input[type="text"][name*="cnpj" i]',
      );

      if (cnpjInput) {
        clearInterval(checkFormInterval);

        const form = cnpjInput.closest("form");
        const submitBtn = form.querySelector('input[type="submit"]');

        cnpjInput.addEventListener("input", function (e) {
          const cursorPosition = e.target.selectionStart;
          const oldValue = e.target.value;
          const newValue = maskCNPJ(oldValue);
          e.target.value = newValue;
          const diff = newValue.length - oldValue.length;
          e.target.setSelectionRange(
            cursorPosition + diff,
            cursorPosition + diff,
          );
        });

        cnpjInput.addEventListener("blur", async function (e) {
          const cnpj = e.target.value;

          if (cnpj && !validateCNPJ(cnpj)) {
            showFieldError(e.target, "CNPJ inválido");
          } else {
            clearFieldError(e.target);

            if (cnpj) {
              toggleSubmitBtn(submitBtn, true);

              const data = await fetchCNPJData(cnpj);

              if (data && data.erro === "nao_encontrado") {
                showFieldError(
                  e.target,
                  "CNPJ não encontrado na Receita Federal",
                );
                toggleSubmitBtn(submitBtn, true);
              } else if (data) {
                toggleSubmitBtn(submitBtn, false);
                fillFormFields(data, cnpjInput);
              } else {
                toggleSubmitBtn(submitBtn, false);
              }
            }
          }
        });

        console.log("Máscara de CNPJ aplicada com sucesso!");
      }
    }, 100);

    setTimeout(function () {
      clearInterval(checkFormInterval);
    }, 10000);
  }

  // ─── Init CPF ────────────────────────────────────────────────────────────

  function initCPFMask() {
    const checkFormInterval = setInterval(function () {
      const cpfInput = document.querySelector('input[name="cpf"]');

      if (cpfInput) {
        clearInterval(checkFormInterval);

        cpfInput.addEventListener("input", function (e) {
          const cursorPosition = e.target.selectionStart;
          const oldValue = e.target.value;
          const newValue = maskCPF(oldValue);
          e.target.value = newValue;
          const diff = newValue.length - oldValue.length;
          e.target.setSelectionRange(
            cursorPosition + diff,
            cursorPosition + diff,
          );
        });

        cpfInput.addEventListener("blur", function (e) {
          const cpf = e.target.value;

          if (cpf && !validateCPF(cpf)) {
            showFieldError(e.target, "CPF inválido");
          } else {
            clearFieldError(e.target);
          }
        });

        console.log("Máscara de CPF aplicada com sucesso!");
      }
    }, 100);

    setTimeout(function () {
      clearInterval(checkFormInterval);
    }, 10000);
  }

  // ─── Bootstrap ───────────────────────────────────────────────────────────

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initCNPJMask();
      initCPFMask();
    });
  } else {
    initCNPJMask();
    initCPFMask();
  }
})();
