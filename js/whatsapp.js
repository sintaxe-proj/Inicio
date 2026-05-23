/* ==========================================================================
   📞 CENTRAL OPERACIONAL DE BUSCA ATIVA & WHATSAPP
   ========================================================================== */

const SCRIPTS_WHATSAPP_APS = {
    has_critico:
        "Olá! Aqui é da sua Equipe de Saúde da Família. Notamos que o seu monitoramento de Pressão Arterial precisa ser atualizado. Poderia comparecer à UBS esta semana para aferição e avaliação?",

    dm_controle:
        "Olá! Tudo bem? Passando para lembrar da necessidade de trazer os seus últimos exames de HbA1c (Glicada) para atualizarmos o seu plano de cuidados na unidade.",

    pn_rotina:
        "Olá, mamãe! Estamos aguardando você para a sua próxima consulta programada de Pré-Natal. Não falte, o acompanhamento é fundamental para você e para o bebê!",

    busca_ativa:
        "Olá! Tentamos contato recente para acompanhamento de saúde, mas não conseguimos. Por favor, responda a esta mensagem ou passe na UBS para podermos atualizar o seu cadastro municipal."
};

function alternarCentralDiscagem() {
    const painel = document.getElementById("painelDiscagemContainer");

    if (!painel) return;

    if (painel.style.display === "block") {
        painel.style.display = "none";
    } else {
        painel.style.display = "block";
        prepararDiscagemPacienteAtivo();
        escutarTecladoDiscador();
    }
}

function prepararDiscagemPacienteAtivo() {
    const displayStatus =
        document.getElementById("statusDiscadorPaciente");

    const nomeAtivo =
        document.getElementById("nomePaciente")?.value;

    const telAtivo =
        document.getElementById("telPaciente")?.value;

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
        displayStatus.innerHTML =
            `<em style="color:#94a3b8; font-size:12px;">
                Nenhum paciente selecionado. Digite abaixo para pesquisar.
            </em>`;
    }
}

function escutarTecladoDiscador() {
    const inputDiscador =
        document.getElementById("inputNumeroDiscador");

    if (!inputDiscador) return;

    inputDiscador.oninput = function() {
        const termo =
            inputDiscador.value.toLowerCase().trim();

        const displayStatus =
            document.getElementById("statusDiscadorPaciente");

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
            displayStatus.innerHTML =
                `<p style="color:var(--danger); font-size:12px;">
                    Banco local não conectado.
                </p>`;
            return;
        }

        const transaction =
            db.transaction(["pacientes"], "readonly");

        const store =
            transaction.objectStore("pacientes");

        const request =
            store.getAll();

        request.onsuccess = function() {
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

            const filtrados =
                todosPacientes.filter(p => {
                    if (desejaHAS && p.has !== "Sim") return false;
                    if (desejaDM && p.dm !== "Sim") return false;
                    if (desejaPN && p.gestante !== "Sim") return false;
                    if (desejaCritico && p.reavaliacaoDias !== 0) return false;

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
                displayStatus.innerHTML =
                    `<p style="color:var(--danger); font-size:12px;">
                        Nenhum contato localizado.
                    </p>`;
                return;
            }

            let htmlContatos =
                `<div style="max-height:250px; overflow-y:auto; display:flex; flex-direction:column; gap:12px;">`;

            filtrados.forEach((p, index) => {
                const foneLimpo =
                    p.tel ? p.tel.replace(/\D/g, "") : "";

                const prazoTexto =
                    p.reavaliacaoDias === 0
                        ? "⚠️ CRÍTICO"
                        : `⏱️ ${p.reavaliacaoDias}d`;

                const corStatus =
                    p.reavaliacaoDias === 0
                        ? "#b91c1c"
                        : "#475569";

                htmlContatos += `
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px; display:flex; flex-direction:column; gap:6px; text-align:left;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <div>
                                <strong style="font-size:13px; color:#1e293b; display:block;">
                                    ${p.nome}
                                </strong>
                                <span style="font-size:11px; color:#64748b;">
                                    📞 Tel: ${p.tel || "Não cadastrado"}
                                </span>
                            </div>

                            <span style="font-size:10px; font-weight:bold; background:${corStatus}; color:white; padding:2px 6px; border-radius:4px;">
                                ${prazoTexto}
                            </span>
                        </div>

                        ${
                            p.tel
                                ? `
                                    <select id="selectMsg_${index}" onchange="atualizarTextoMensagem(${index})" style="width:100%; font-size:11px; padding:4px; border:1px solid #cbd5e1; border-radius:4px; background:white; color:#334155;">
                                        <option value="">-- Selecione uma Mensagem Padrão --</option>
                                        <option value="has_critico">🚨 Alerta de HAS Crítico</option>
                                        <option value="dm_controle">🩺 Solicitação de Exames DM</option>
                                        <option value="pn_rotina">🤰 Agendamento de Pré-Natal</option>
                                        <option value="busca_ativa">🏃 Busca Ativa Geral</option>
                                        <option value="custom">✍️ Criar Nova Mensagem</option>
                                    </select>

                                    <textarea id="textMsg_${index}" placeholder="Selecione um padrão ou escreva uma mensagem..." style="width:100%; height:50px; font-size:11px; padding:5px; border:1px solid #cbd5e1; border-radius:4px; resize:none;"></textarea>

                                    <button onclick="enviarWhatsAppTerritorial('${foneLimpo}', ${index})" style="background:#25d366; color:white; border:none; padding:6px; border-radius:4px; font-size:12px; font-weight:bold; cursor:pointer;">
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

function atualizarTextoMensagem(index) {
    const seletor =
        document.getElementById(`selectMsg_${index}`);

    const areaTexto =
        document.getElementById(`textMsg_${index}`);

    if (!seletor || !areaTexto) return;

    const chave = seletor.value;

    if (chave && chave !== "custom") {
        areaTexto.value =
            SCRIPTS_WHATSAPP_APS[chave];
    } else {
        areaTexto.value = "";

        if (chave === "custom") {
            areaTexto.focus();
        }
    }
}

function enviarWhatsAppTerritorial(telefonePuro, index) {
    const areaTexto =
        document.getElementById(`textMsg_${index}`);

    if (!areaTexto) return;

    const texto = areaTexto.value.trim();

    if (!texto) {
        mostrarToast("⚠️ Insira uma mensagem válida.");
        return;
    }

    let telefoneFinal =
        telefonePuro.replace(/\D/g, "");

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
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px; display:flex; flex-direction:column; gap:6px; text-align:left;">
            <strong style="font-size:12px; color:#1e293b;">
                📞 Discagem Manual Externa
            </strong>

            <span style="font-size:11px; color:#64748b;">
                Número: ${telefone}
            </span>

            <textarea id="textMsg_manual"
                      placeholder="Escreva a mensagem personalizada..."
                      style="width:100%; height:50px; font-size:11px; padding:5px; border:1px solid #cbd5e1; border-radius:4px; resize:none;">
            </textarea>

            <button onclick="enviarWhatsAppTerritorial('${telefone}', 'manual')"
                    style="background:#25d366; color:white; border:none; padding:6px; border-radius:4px; font-size:12px; font-weight:bold; cursor:pointer; width:100%;">
                💬 Enviar para Número Avulso
            </button>
        </div>
    `;
}
