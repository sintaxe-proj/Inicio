/* ==========================================================================
   📞 CENTRAL OPERACIONAL DE BUSCA ATIVA & WHATSAPP
   Permite criar, editar e excluir mensagens pré-definidas
   Sem alterar design / sem alterar index.html
   ========================================================================== */

window.SCRIPTS_WHATSAPP_APS = window.SCRIPTS_WHATSAPP_APS || {
    has_critico:
        "Olá, {nome}! Aqui é da sua Equipe de Saúde da Família. Notamos que o seu monitoramento de Pressão Arterial precisa ser atualizado. Poderia comparecer à UBS para aferição e avaliação?",

    dm_controle:
        "Olá, {nome}! Tudo bem? Passando para lembrar da necessidade de trazer seus últimos exames, especialmente HbA1c, para atualizarmos seu plano de cuidados na unidade.",

    pn_rotina:
        "Olá, {nome}! Estamos aguardando você para sua próxima consulta de Pré-Natal. O acompanhamento é fundamental para você e para o bebê.",

    busca_ativa:
        "Olá, {nome}! Tentamos contato para acompanhamento de saúde. Por favor, responda esta mensagem ou procure a UBS para atualizarmos seu cadastro e monitoramento."
};

window.CONTATOS_RENDERIZADOS_WPP = {};

/* ==========================================================================
   STORAGE
   ========================================================================== */

function carregarMensagensEditadas() {
    return JSON.parse(
        localStorage.getItem("mensagensEditadasAPS")
    ) || {};
}

function salvarMensagensEditadas(mensagens) {
    localStorage.setItem(
        "mensagensEditadasAPS",
        JSON.stringify(mensagens)
    );
}

function carregarMensagensPersonalizadas() {
    return JSON.parse(
        localStorage.getItem("mensagensPreDefinidasAPS")
    ) || {};
}

function salvarMensagensPersonalizadas(mensagens) {
    localStorage.setItem(
        "mensagensPreDefinidasAPS",
        JSON.stringify(mensagens)
    );
}

/* ==========================================================================
   UTILITÁRIOS
   ========================================================================== */

function normalizarChaveMensagem(nome) {
    return nome
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
}

function aplicarVariaveisMensagem(texto, paciente, linha) {
    const dias = paciente?.reavaliacaoDias ?? "";
    const nome = paciente?.nome || "";
    const ubs = paciente?.ubs || "";
    const equipe = paciente?.equipe || "";

    return texto
        .replaceAll("{nome}", nome)
        .replaceAll("{ubs}", ubs)
        .replaceAll("{equipe}", equipe)
        .replaceAll("{dias}", dias)
        .replaceAll("{linha}", linha || "");
}

/* ==========================================================================
   MENSAGENS PADRÃO FIXAS
   ========================================================================== */

function obterMensagemPadrao(chave) {
    const editadas = carregarMensagensEditadas();

    if (editadas[chave]) {
        return editadas[chave];
    }

    return window.SCRIPTS_WHATSAPP_APS[chave] || "";
}

function editarMensagemPadrao() {
    const fixas = Object.keys(window.SCRIPTS_WHATSAPP_APS);
    const personalizadas = carregarMensagensPersonalizadas();

    const listaFixas = fixas
        .map((chave, index) => `${index + 1} - ${chave} [PADRÃO]`)
        .join("\n");

    const offset = fixas.length;

    const listaPersonalizadas = Object.keys(personalizadas)
        .map((chave, index) => `${offset + index + 1} - ${personalizadas[chave].nome} [CRIADA]`)
        .join("\n");

    const lista = [listaFixas, listaPersonalizadas]
        .filter(Boolean)
        .join("\n");

    const escolha = prompt(
        "Qual mensagem deseja editar?\n\n" + lista
    );

    if (!escolha) return;

    const numero = parseInt(escolha);

    if (isNaN(numero)) {
        mostrarToast?.("⚠️ Opção inválida.");
        return;
    }

    if (numero <= fixas.length) {
        const chave = fixas[numero - 1];

        const textoAtual = obterMensagemPadrao(chave);

        const novoTexto = prompt(
            `Editando mensagem padrão: ${chave}\n\nUse variáveis:\n{nome}\n{ubs}\n{equipe}\n{dias}\n{linha}`,
            textoAtual
        );

        if (!novoTexto) return;

        const editadas = carregarMensagensEditadas();
        editadas[ch]()
