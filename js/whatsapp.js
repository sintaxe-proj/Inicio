/* ==========================================================================
   📞 CENTRAL OPERACIONAL DE BUSCA ATIVA & WHATSAPP — SUPABASE
   ========================================================================== */

const SCRIPTS_WHATSAPP_APS = {
    has_critico: "Olá! Aqui é do seu Time de Saúde. Notamos que o seu monitoramento de Pressão Arterial precisa ser atualizado. Poderia nos passar sua última pressão?",
    dm_controle: "Olá! Tudo bem? Passando para lembrar da necessidade de trazer os seus últimos exames de HbA1c para atualizarmos seu plano de cuidados na unidade.",
    pn_rotina: "Olá! Estamos aguardando você para sua próxima consulta de Pré-Natal. O acompanhamento é fundamental para você e para o bebê!",
    busca_ativa: "Olá! Tentamos contato recente para acompanhamento de saúde, mas não conseguimos. Por favor, responda esta mensagem ou passe na Unidade."
};

let timerBuscaDiscador = null;

function carregarMensagensEditadas() {
    return JSON.parse(localStorage.getItem("mensagensEditadasAPS") || "{}");
}

function obterMensagemPadrao(chave) {
    const editadas = carregarMensagensEditadas();
    return editadas[chave] || SCRIPTS_WHATSAPP_APS[chave] || "";
}

function gerarOptionsMensagensWhatsapp() {
    let html = `<option value="">-- Selecione uma Mensagem Padrão --</option>`;

    Object.keys(SCRIPTS_WHATSAPP_APS).forEach(chave => {
        html += `
            <option value="${chave}">
                ${chave.replaceAll("_", " ").toUpperCase()}
            </option>
        `;
    });

    html += `<option value="custom">✍️ Texto livre</option>`;
    return html;
}

function atualizarTextoMensagem(index) {
    const seletor = document.getElementById(`selectMsg_${index}`);
    const areaTexto = document.getElementById(`textMsg_${index}`);

    if (!seletor || !areaTexto) return;

    const chave = seletor.value;

    if (chave && chave !== "custom") {
        areaTexto.value = obterMensagemPadrao(chave);
    } else {
        areaTexto.value = "";
        areaTexto.focus();
    }
}

/* ==========================================================================
   ABRIR / FECHAR CENTRAL
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
                Digite nome, CPF, CNS ou telefone para pesquisar no território.
            </em>
        `;
    }
}

/* ==========================================================================
   BUSCA SUPABASE
   ========================================================================== */

function escutarTecladoDiscador() {
    const inputDiscador = document.getElementById("inputNumeroDiscador");

    if (!inputDiscador) return;

    inputDiscador.oninput = function () {
        clearTimeout(timerBuscaDiscador);

        timerBuscaDiscador = setTimeout(() => {
            buscarContatosSupabase(inputDiscador.value);
        }, 500);
    };
}

async function buscarContatosSupabase(termo) {
    const displayStatus = document.getElementById("statusDiscadorPaciente");

    if (!displayStatus) return;

    termo = String(termo || "").trim();

    if (!termo) {
        prepararDiscagemPacienteAtivo();
        return;
    }

    const termoNumerico = termo.replace(/\D/g, "");

    if (/^\d+$/.test(termoNumerico) && termoNumerico.length > 5 && termoNumerico.length < 11) {
        renderizarCardMensagemUnica("Usuário Manual", termoNumerico, displayStatus);
        return;
    }

    if (termo.length < 3 && termoNumerico.length < 3) {
        displayStatus.innerHTML = `
            <em style="color:#94a3b8; font-size:12px;">
                Digite pelo menos 3 caracteres.
            </em>
        `;
        return;
    }

    let query = supabaseClient
        .from("pacientes")
        .select("nome, cpf, cns, telefone, tel, endereco, unidade, ubs, equipe")
        .limit(15);

    if (termoNumerico.length >= 3) {
        query = query.or(
            `cpf.ilike.%${termoNumerico}%,cns.ilike.%${termoNumerico}%,telefone.ilike.%${termoNumerico}%,tel.ilike.%${termoNumerico}%`
        );
    } else {
        query = query.ilike("nome", `%${termo}%`);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Erro ao buscar contatos:", error);
        displayStatus.innerHTML = `
            <p style="color:var(--danger); font-size:12px;">
                Erro ao buscar contatos no Supabase.
            </p>
        `;
        return;
    }

    if (!data || data.length === 0) {
        displayStatus.innerHTML = `
            <p style="color:var(--danger); font-size:12px;">
                Nenhum contato localizado.
            </p>
        `;
        return;
    }

    renderizarContatosDiscador(data, displayStatus);
}

function renderizarContatosDiscador(contatos, container) {
    let html = `
        <div style="
            max-height:250px;
            overflow-y:auto;
            display:flex;
            flex-direction:column;
            gap:12px;
            padding-right:4px;
        ">
    `;

    contatos.forEach((p, index) => {
        const telefone = p.telefone || p.tel || "";
        const foneLimpo = telefone.replace(/\D/g, "");

        html += `
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
                <strong style="font-size:13px; color:#1e293b;">
                    ${p.nome || "Sem nome"}
                </strong>

                <span style="font-size:11px; color:#64748b;">
                    CPF: ${p.cpf || "-"} | CNS: ${p.cns || "-"}
                </span>

                <span style="font-size:11px; color:#64748b;">
                    UBS: ${p.unidade || p.ubs || "-"} | Equipe: ${p.equipe || "-"}
                </span>

                <span style="font-size:11px; color:#64748b;">
                    📞 Tel: ${telefone || "Não cadastrado"}
                </span>

                ${
                    telefone
                    ? `
                        <select id="selectMsg_${index}"
                                onchange="atualizarTextoMensagem(${index})"
                                style="width:100%; font-size:11px; padding:4px;">
                            ${gerarOptionsMensagensWhatsapp()}
                        </select>

                        <textarea id="textMsg_${index}"
                                  placeholder="Selecione um padrão ou escreva uma mensagem..."
                                  style="width:100%; height:55px; font-size:11px; padding:5px;"></textarea>

                        <button onclick="enviarWhatsAppTerritorial('${foneLimpo}', ${index})"
                                style="background:#25d366; color:white; border:none; padding:6px; border-radius:4px; font-size:12px; font-weight:bold; cursor:pointer;">
                            💬 Enviar via WhatsApp
                        </button>
                    `
                    : `
                        <span style="font-size:11px; color:var(--danger); font-weight:500;">
                            🚫 Sem telefone cadastrado.
                        </span>
                    `
                }

                <button onclick="abrirAtendimentoExistente('${p.cpf || ""}', '${p.cns || ""}')"
                        style="background:#2563eb; color:white; border:none; padding:6px; border-radius:4px; font-size:12px; font-weight:bold; cursor:pointer;">
                    📋 Abrir prontuário
                </button>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

/* ==========================================================================
   ENVIO
   ========================================================================== */

function enviarWhatsAppTerritorial(telefonePuro, index) {
    const areaTexto = document.getElementById(`textMsg_${index}`);

    if (!areaTexto) return;

    const texto = areaTexto.value.trim();

    if (!texto) {
        mostrarToast?.("⚠️ Insira uma mensagem válida antes de enviar.");
        return;
    }

    let telefoneFinal = telefonePuro.replace(/\D/g, "");

    if (telefoneFinal.length === 10 || telefoneFinal.length === 11) {
        telefoneFinal = "55" + telefoneFinal;
    }

    const url =
        `https://api.whatsapp.com/send?phone=${telefoneFinal}&text=${encodeURIComponent(texto)}`;

    window.open(url, "_blank");
}

function renderizarCardMensagemUnica(nome, telefone, container) {
    container.innerHTML = `
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px; display:flex; flex-direction:column; gap:6px; text-align:left;">
            <strong style="font-size:12px; color:#1e293b;">
                📞 Discagem Manual Externa
            </strong>

            <span style="font-size:11px; color:#64748b;">
                Número: ${telefone}
            </span>

            <select id="selectMsg_manual"
                    onchange="atualizarTextoMensagem('manual')"
                    style="width:100%; font-size:11px; padding:4px;">
                ${gerarOptionsMensagensWhatsapp()}
            </select>

            <textarea id="textMsg_manual"
                      placeholder="Escreva a mensagem personalizada..."
                      style="width:100%; height:55px; font-size:11px; padding:5px;"></textarea>

            <button onclick="enviarWhatsAppTerritorial('${telefone}', 'manual')"
                    style="background:#25d366; color:white; border:none; padding:6px; border-radius:4px; font-size:12px; font-weight:bold; cursor:pointer; width:100%;">
                💬 Enviar para número avulso
            </button>
        </div>
    `;
}

/* ==========================================================================
   WHATSAPP DIRETO DO MONITORAMENTO — SUPABASE
   ========================================================================== */

async function abrirWhatsAppMonitoramento(cpf, cns, linha) {
    const filtros = [];

    if (cpf) filtros.push(`cpf.eq.${cpf}`);
    if (cns) filtros.push(`cns.eq.${cns}`);

    if (filtros.length === 0) {
        mostrarToast?.("⚠️ Paciente sem CPF/CNS.");
        return;
    }

    const { data, error } = await supabaseClient
        .from("pacientes")
        .select("nome, telefone, tel")
        .or(filtros.join(","))
        .limit(1);

    if (error || !data || data.length === 0) {
        console.error("Erro ao buscar paciente:", error);
        mostrarToast?.("⚠️ Paciente não encontrado.");
        return;
    }

    const p = data[0];
    const telefone = p.telefone || p.tel || "";

    if (!telefone) {
        mostrarToast?.("⚠️ Paciente sem telefone cadastrado.");
        return;
    }

    let chaveMensagem = "busca_ativa";

    if (linha === "has") chaveMensagem = "has_critico";
    if (linha === "dm") chaveMensagem = "dm_controle";
    if (linha === "gestante") chaveMensagem = "pn_rotina";

    let telefoneFinal = telefone.replace(/\D/g, "");

    if (telefoneFinal.length === 10 || telefoneFinal.length === 11) {
        telefoneFinal = "55" + telefoneFinal;
    }

    const mensagem = obterMensagemPadrao(chaveMensagem);

    const url =
        `https://api.whatsapp.com/send?phone=${telefoneFinal}&text=${encodeURIComponent(mensagem)}`;

    window.open(url, "_blank");
}

/* ==========================================================================
   GLOBAL
   ========================================================================== */

window.alternarCentralDiscagem = alternarCentralDiscagem;
window.buscarContatosSupabase = buscarContatosSupabase;
window.enviarWhatsAppTerritorial = enviarWhatsAppTerritorial;
window.abrirWhatsAppMonitoramento = abrirWhatsAppMonitoramento;
window.atualizarTextoMensagem = atualizarTextoMensagem;
