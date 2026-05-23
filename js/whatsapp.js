/* ==========================================================================
   📞 CENTRAL OPERACIONAL DE BUSCA ATIVA & WHATSAPP
   ========================================================================== */

const SCRIPTS_WHATSAPP_APS = {
    has_critico:
        "Olá! Aqui é do seu Time de Saúde. Notamos que o seu monitoramento de Pressão Arterial precisa ser atualizado. Poderia nos passar sua última pressão?",

    dm_controle:
        "Olá! Tudo bem? Passando para lembrar da necessidade de trazer os seus últimos exames de HbA1c (Glicada) para atualizarmos o seu plano de cuidados na unidade.",

    pn_rotina:
        "Olá! Estamos aguardando você para a sua próxima consulta programada de Pré-Natal. Não falte, o acompanhamento é fundamental para você e para o bebê!",

    busca_ativa:
        "Olá! Tentamos contato recente para acompanhamento de saúde, mas não conseguimos. Por favor, responda a esta mensagem ou passe na Unidade para podermos atualizar o seu cadastro."
};

function carregarMensagensEditadas() {
    return JSON.parse(
        localStorage.getItem("mensagensEditadasAPS")
    ) || {};
}

function obterMensagemPadrao(chave) {
    const editadas = carregarMensagensEditadas();

    if (editadas[chave]) {
        return editadas[chave];
    }

    return SCRIPTS_WHATSAPP_APS[chave] || "";
}

function editarMensagemPadrao() {
    const chaves = Object.keys(SCRIPTS_WHATSAPP_APS);

    const lista = chaves
        .map((chave, index) => `${index + 1} - ${chave}`)
        .join("\n");

    const escolha = prompt(
        "Qual mensagem deseja editar?\n\n" + lista
    );

    if (!escolha) return;

    const index = parseInt(escolha) - 1;
    const chave = chaves[index];

    if (!chave) {
        mostrarToast("⚠️ Opção inválida.");
        return;
    }

    const textoAtual = obterMensagemPadrao(chave);

    const novoTexto = prompt(
        `Editando: ${chave}\n\nTexto atual:`,
        textoAtual
    );

    if (!novoTexto) return;

    const editadas = carregarMensagensEditadas();

    editadas[chave] = novoTexto;

    localStorage.setItem(
        "mensagensEditadasAPS",
        JSON.stringify(editadas)
    );

    mostrarToast("✅ Mensagem padrão atualizada.");
}

function restaurarMensagemPadrao() {
    const chaves = Object.keys(SCRIPTS_WHATSAPP_APS);

    const lista = chaves
        .map((chave, index) => `${index + 1} - ${chave}`)
        .join("\n");

    const escolha = prompt(
        "Qual mensagem deseja restaurar ao texto original?\n\n" + lista
    );

    if (!escolha) return;

    const index = parseInt(escolha) - 1;
    const chave = chaves[index];

    if (!chave) {
        mostrarToast("⚠️ Opção inválida.");
        return;
    }

    const editadas = carregarMensagensEditadas();

    delete editadas[chave];

    localStorage.setItem(
        "mensagensEditadasAPS",
        JSON.stringify(editadas)
    );

    mostrarToast("🔄 Mensagem restaurada ao padrão original.");
}

function atualizarTextoMensagem(index) {
    const seletor = document.getElementById(`selectMsg_${index}`);
    const areaTexto = document.getElementById(`textMsg_${index}`);

    if (!seletor || !areaTexto) return;

    const chave = seletor.value;

    if (chave && chave !== "custom") {
        areaTexto.value = obterMensagemPadrao(chave);
        return;
    }

    areaTexto.value = "";

    if (chave === "custom") {
        areaTexto.focus();
    }
}
