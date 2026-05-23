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

/* ==========================================================================
   ✏️ EDITAR / RESTAURAR MENSAGENS PADRÃO
   ========================================================================== */

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

/* ==========================================================================
   ➕ MODELOS PRÉ-SALVOS PERSONALIZADOS
   ========================================================================== */

function carregarModelosPersonalizados() {
    return JSON.parse(
        localStorage.getItem("modelosWhatsappPersonalizados")
    ) || {};
}

function salvarModelosPersonalizados(modelos) {
    localStorage.setItem(
        "modelosWhatsappPersonalizados",
        JSON.stringify(modelos)
    );
}

function criarModeloPreSalvo() {
    const nome = prompt("Nome do novo modelo:");

    if (!nome) return;

    const texto = prompt("Texto da mensagem:");

    if (!texto) return;

    const chave = nome
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");

    const modelos = carregarModelosPersonalizados();

    modelos[chave] = texto;

    salvarModelosPersonalizados(modelos);

    mostrarToast("✅ Modelo pré-salvo criado.");
}

function gerarOptionsMensagensWhatsapp() {
    const editadas = carregarMensagensEditadas();
    const modelos = carregarModelosPersonalizados();

    let html = `
        <option value="">-- Selecione uma Mensagem Padrão --</option>
    `;

    Object.keys(SCRIPTS_WHATSAPP_APS).forEach(chave => {
        const editada = editadas[chave] ? " ✏️" : "";

        html += `
            <option value="${chave}">
                ${chave.replaceAll("_", " ").toUpperCase()}${editada}
            </option>
        `;
    });

    Object.keys(modelos).forEach(chave => {
        html += `
            <option value="modelo:${chave}">
                ⭐ ${chave.replaceAll("_", " ").toUpperCase()}
            </option>
        `;
    });

    html += `
        <option value="custom">✍️ Texto livre</option>
    `;

    return html;
}

function atualizarTextoMensagem(index) {
    const seletor = document.getElementById(`selectMsg_${index}`);
    const areaTexto = document.getElementById(`textMsg_${index}`);

    if (!seletor || !areaTexto) return;

    const chave = seletor.value;

    if (chave.startsWith("modelo:")) {
        const nomeModelo = chave.replace("modelo:", "");
        const modelos = carregarModelosPersonalizados();

        areaTexto.value = modelos[nomeModelo] || "";
        return;
    }

    if (chave && chave !== "custom") {
        areaTexto.value = obterMensagemPadrao(chave);
        return;
    }

    areaTexto.value = "";

    if (chave === "custom") {
        areaTexto.focus();
    }
}

/* ==========================================================================
   📞 ABRIR / FECHAR DISCADOR
   ========================================================================== */

function alternarCentralDiscagem() {
    const painel = document.getElementById("painelDiscagemContainer");

    if (!painel) {
        console.error("painelDiscagemContainer não encontrado.");
        return;
    }

    if (painel.style.display === "block") {
        painel.style.display = "none";
    } else {
        painel.style.display = "block";
        prepararDiscagemPacienteAtivo();
        escutarTecladoDiscador();
    }
}

function prepararDiscagemPacienteAtivo() {
    const displayStatus = document.getElementById("statusDiscadorPaciente");
    const nomeAtivo = document.getElementById("nomePaciente")?.value;
    const telAtivo = document.getElementById("telPaciente")?.value;

    if (!displayStatus) return;

    if (nomeAtivo && telAtivo) {
        displayStatus.innerHTML = `
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:8px;">
                <p style="margin:0; font-size:11px; color:#166534; font-weight:bold;">
                    👤 Utente Ativo no Prontuário:
                </p>

                <strong style="font-size:13px; color:#14532d; display:block;">
                    ${nomeAtivo}
                </strong>

                <span style="font-size:12px; color:#166534;">
                    📞 Contato: ${telAtivo}
                </span>
            </div>
        `;
    } else {
        displayStatus.innerHTML = `
            <em style="color:#94a3b8; font-size:12px;">
                Nenhum paciente selecionado no prontuário. Digite abaixo para pesquisar no território.
            </em>
        `;
    }
}

/* ==========================================================================
   🔎 BUSCA NO DISCADOR
   ========================================================================== */

function escutarTecladoDiscador() {
    const inputDiscador = document.getElementById("inputNumeroDiscador");

    if (!inputDiscador) return;

    inputDiscador.oninput = function () {
        const termo = inputDiscador.value.toLowerCase().trim();
        const displayStatus = document.getElementById("statusDiscadorPaciente");

        if (!displayStatus) return;

        if (!termo) {
            prepararDiscagemPacienteAtivo();
            return;
        }

        if (/^\d+$/.test(termo) && termo.length > 5) {
            renderizarCardMensagemUnica(
                "Usuário Manual",
                termo,
                displayStatus
            );
            return;
        }

        if (!db) {
            displayStatus.innerHTML = `
                <p style="color:var(--danger); font-size:12px;">
                    Banco local não conectado.
                </p>
            `;
            return;
        }

        const transaction = db.transaction(["pacientes"], "readonly");
        const store = transaction.objectStore("pacientes");
        const request = store.getAll();

        request.onsuccess = function () {
            const todosPacientes = request.result;
            const termoNumerico = termo.replace(/\D/g, "");

            const desejaCritico =
                termo.includes("critico") ||
                termo.includes("crítico");

            const desejaHAS =
                termo.includes("has") ||
                termo.includes("hipertens");

            const desejaDM =
                termo.includes("dm") ||
                termo.includes("diabet");

            const desejaPN =
                termo.includes("pn") ||
                termo.includes("gestant");

            const filtrados = todosPacientes.filter(p => {
                if (desejaHAS && p.has !== "Sim") return false;
                if (desejaDM && p.dm !== "Sim") return false;
                if (desejaPN && p.gestante !== "Sim") return false;
                if (desejaCritico && parseInt(p.reavaliacaoDias) !== 0) return false;

                const temFiltroClinico =
                    desejaHAS ||
                    desejaDM ||
                    desejaPN ||
                    desejaCritico;

                if (!temFiltroClinico) {
                    const nomeBate =
                        p.nome &&
                        p.nome.toLowerCase().includes(termo);

                    const cpfLimpo =
                        p.cpf ? p.cpf.replace(/\D/g, "") : "";

                    const cpfBate =
                        termoNumerico !== "" &&
                        cpfLimpo.includes(termoNumerico);

                    return nomeBate || cpfBate;
                }

                return true;
            });

            if (filtrados.length === 0) {
                displayStatus.innerHTML = `
                    <p style="color:var(--danger); font-size:12px;">
                        Nenhum contato localizado.
                    </p>
                `;
                return;
            }

            let htmlContatos = `
                <div style="
                    max-height:250px;
                    overflow-y:auto;
                    display:flex;
                    flex-direction:column;
                    gap:12px;
                    padding-right:4px;
                ">
            `;

            filtrados.forEach((p, index) => {
                const foneLimpo =
                    p.tel ? p.tel.replace(/\D/g, "") : "";

                const prazoTexto =
                    parseInt(p.reavaliacaoDias) === 0
                        ? "⚠️ CRÍTICO"
                        : `⏱️ ${p.reavaliacaoDias}d`;

                const corStatus =
                    parseInt(p.reavaliacaoDias) === 0
                        ? "#b91c1c"
                        : "#475569";

                htmlContatos += `
                    <div style="
                        background:#f8fafc;
                        border:1px solid #e2e8f0;
                        border-radius:8px;
                        padding:10px;
                        display:flex;
                        flex-direction:column;
                        gap:6px;
                        text-align:left;
                    ">

                        <div style="
                            display:flex;
                            justify-content:space-between;
                            align-items:flex-start;
                        ">

                            <div>
                                <strong style="font-size:13px; color:#1e293b; display:block;">
                                    ${p.nome}
                                </strong>

                                <span style="font-size:11px; color:#64748b;">
                                    📞 Tel: ${p.tel || "Não cadastrado"}
                                </span>
                            </div>

                            <span style="
                                font-size:10px;
                                font-weight:bold;
                                background:${corStatus};
                                color:white;
                                padding:2px 6px;
                                border-radius:4px;
                            ">
                                ${prazoTexto}
                            </span>
                        </div>

                        ${
                            p.tel
                                ? `
                                    <select id="selectMsg_${index}"
                                            onchange="atualizarTextoMensagem(${index})"
                                            style="
                                                width:100%;
                                                font-size:11px;
                                                padding:4px;
                                                border:1px solid #cbd5e1;
                                                border-radius:4px;
                                                background:white;
                                                color:#334155;
                                            ">
                                        ${gerarOptionsMensagensWhatsapp()}
                                    </select>

                                    <textarea id="textMsg_${index}"
                                              placeholder="Selecione um padrão ou escreva uma mensagem personalizada..."
                                              style="
                                                width:100%;
                                                height:55px;
                                                font-size:11px;
                                                padding:5px;
                                                border:1px solid #cbd5e1;
                                                border-radius:4px;
                                                resize:none;
                                            "></textarea>

                                    <button onclick="enviarWhatsAppTerritorial('${foneLimpo}', ${index})"
                                            style="
                                                background:#25d366;
                                                color:white;
                                                border:none;
                                                padding:6px;
                                                border-radius:4px;
                                                font-size:12px;
                                                font-weight:bold;
                                                cursor:pointer;
                                            ">
                                        💬 Enviar via WhatsApp
                                    </button>
                                `
                                : `
                                    <span style="font-size:11px; color:var(--danger); font-weight:500;">
                                        🚫 Sem telefone no prontuário.
                                    </span>
                                `
                        }
                    </div>
                `;
            });

            htmlContatos += `</div>`;
            displayStatus.innerHTML = htmlContatos;
        };
    };
}

/* ==========================================================================
   💬 ENVIO PARA WHATSAPP
   ========================================================================== */

function enviarWhatsAppTerritorial(telefonePuro, index) {
    const areaTexto = document.getElementById(`textMsg_${index}`);

    if (!areaTexto) return;

    const texto = areaTexto.value.trim();

    if (!texto) {
        mostrarToast("⚠️ Insira uma mensagem válida antes de enviar.");
        return;
    }

    let telefoneFinal = telefonePuro.replace(/\D/g, "");

    if (
        telefoneFinal.length === 10 ||
        telefoneFinal.length === 11
    ) {
        telefoneFinal = "55" + telefoneFinal;
    }

    const url =
        `https://api.whatsapp.com/send?phone=${telefoneFinal}&text=${encodeURIComponent(texto)}`;

    window.open(url, "_blank");
}

function renderizarCardMensagemUnica(nome, telefone, container) {
    container.innerHTML = `
        <div style="
            background:#f8fafc;
            border:1px solid #e2e8f0;
            border-radius:8px;
            padding:10px;
            display:flex;
            flex-direction:column;
            gap:6px;
            text-align:left;
        ">

            <strong style="font-size:12px; color:#1e293b;">
                📞 Discagem Manual Externa
            </strong>

            <span style="font-size:11px; color:#64748b;">
                Número: ${telefone}
            </span>

            <select id="selectMsg_manual"
                    onchange="atualizarTextoMensagem('manual')"
                    style="
                        width:100%;
                        font-size:11px;
                        padding:4px;
                        border:1px solid #cbd5e1;
                        border-radius:4px;
                        background:white;
                        color:#334155;
                    ">
                ${gerarOptionsMensagensWhatsapp()}
            </select>

            <textarea id="textMsg_manual"
                      placeholder="Escreva a mensagem personalizada..."
                      style="
                        width:100%;
                        height:55px;
                        font-size:11px;
                        padding:5px;
                        border:1px solid #cbd5e1;
                        border-radius:4px;
                        resize:none;
                    "></textarea>

            <button onclick="enviarWhatsAppTerritorial('${telefone}', 'manual')"
                    style="
                        background:#25d366;
                        color:white;
                        border:none;
                        padding:6px;
                        border-radius:4px;
                        font-size:12px;
                        font-weight:bold;
                        cursor:pointer;
                        width:100%;
                    ">
                💬 Enviar para número avulso
            </button>
        </div>
    `;
}

/* ==========================================================================
   💬 WHATSAPP DIRETO DO MONITORAMENTO
   ========================================================================== */

function abrirWhatsAppMonitoramento(cpf, linha) {
    if (!db) {
        mostrarToast("⚠️ Banco local não conectado.");
        return;
    }

    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.get(cpf);

    request.onsuccess = function () {
        const p = request.result;

        if (!p) {
            mostrarToast("⚠️ Paciente não encontrado.");
            return;
        }

        if (!p.tel) {
            mostrarToast("⚠️ Paciente sem telefone cadastrado.");
            return;
        }

        let chaveMensagem = "busca_ativa";

        if (linha === "has") {
            chaveMensagem = "has_critico";
        }

        if (linha === "dm") {
            chaveMensagem = "dm_controle";
        }

        if (linha === "gestante") {
            chaveMensagem = "pn_rotina";
        }

        if (linha === "tuberculose") {
            chaveMensagem = "busca_ativa";
        }

        if (linha === "hanseniase") {
            chaveMensagem = "busca_ativa";
        }

        let telefone = p.tel.replace(/\D/g, "");

        if (
            telefone.length === 10 ||
            telefone.length === 11
        ) {
            telefone = "55" + telefone;
        }

        const mensagem = obterMensagemPadrao(chaveMensagem);

        const url =
            `https://api.whatsapp.com/send?phone=${telefone}&text=${encodeURIComponent(mensagem)}`;

        window.open(url, "_blank");
    };
}
