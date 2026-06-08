/* ==========================================================================
   📞 CENTRAL OPERACIONAL DE BUSCA ATIVA & WHATSAPP — SUPABASE PURO
   Sem dependência da view vw_prontuario_completo
   Busca direta em:
   - pacientes = identificação
   - atendimentos = dados clínicos
   ========================================================================== */

const SCRIPTS_WHATSAPP_APS = {
    has_critico:
        "Olá! Aqui é do seu Time de Saúde. Notamos que o seu monitoramento de Pressão Arterial precisa ser atualizado. Poderia nos passar sua última pressão?",

    dm_controle:
        "Olá! Tudo bem? Passando para lembrar da necessidade de trazer os seus últimos exames de HbA1c para atualizarmos seu plano de cuidados na unidade.",

    pn_rotina:
        "Olá! Estamos aguardando você para sua próxima consulta de Pré-Natal. O acompanhamento é fundamental para você e para o bebê!",

    tb_busca:
        "Olá! Aqui é do seu Time de Saúde. Precisamos atualizar seu acompanhamento de tuberculose. Poderia responder esta mensagem ou comparecer à unidade?",

    hansen_busca:
        "Olá! Aqui é do seu Time de Saúde. Precisamos atualizar seu acompanhamento de hanseníase. Poderia responder esta mensagem ou comparecer à unidade?",

    busca_ativa:
        "Olá! Tentamos contato recente para acompanhamento de saúde, mas não conseguimos. Por favor, responda esta mensagem ou passe na Unidade."
};

let timerBuscaDiscador = null;

/* ==========================================================================
   HELPERS
   ========================================================================== */

function limparNumeroWhatsapp(valor) {
    return String(valor || "").replace(/\D/g, "");
}

function normalizarTextoWhatsapp(valor) {
    return String(valor || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function valorSimWhatsapp(valor) {
    const v = normalizarTextoWhatsapp(valor);

    return (
        valor === true ||
        valor === 1 ||
        v === "sim" ||
        v === "s" ||
        v === "true" ||
        v === "1" ||
        v === "positivo" ||
        v === "presente" ||
        v === "ativo"
    );
}

function escaparWhatsapp(valor) {
    return String(valor || "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function obterDocumentoWhatsapp(p) {
    return (
        p.paciente_cpf ||
        p.cpf ||
        p.cns ||
        ""
    );
}

function obterNomeWhatsapp(p) {
    return (
        p.nome ||
        p.nome_paciente ||
        "Sem nome"
    );
}

function obterUBSWhatsapp(p) {
    return (
        p.ubs_vinculacao ||
        p.ubs ||
        p.unidade ||
        "Pendente"
    );
}

function obterEquipeWhatsapp(p) {
    return (
        p.equipe_esf ||
        p.equipe ||
        "Pendente"
    );
}

function obterDiasWhatsapp(p) {
    const valor =
        p.reavaliacaoDias ??
        p.retorno_dias ??
        999;

    const dias = parseInt(valor);

    return Number.isNaN(dias) ? 999 : dias;
}

/* ==========================================================================
   MENSAGENS
   ========================================================================== */

function carregarMensagensEditadas() {
    return JSON.parse(
        localStorage.getItem("mensagensEditadasAPS") || "{}"
    );
}

function salvarMensagensEditadas(mensagens) {
    localStorage.setItem(
        "mensagensEditadasAPS",
        JSON.stringify(mensagens || {})
    );
}

function obterMensagemPadrao(chave) {
    const editadas = carregarMensagensEditadas();

    return editadas[chave] ||
        SCRIPTS_WHATSAPP_APS[chave] ||
        "";
}

function gerarOptionsMensagensWhatsapp() {
    let html = `
        <option value="">-- Selecione uma Mensagem Padrão --</option>
    `;

    Object.keys(SCRIPTS_WHATSAPP_APS).forEach(chave => {
        html += `
            <option value="${chave}">
                ${chave.replaceAll("_", " ").toUpperCase()}
            </option>
        `;
    });

    html += `
        <option value="custom">✍️ Texto livre</option>
    `;

    return html;
}

function atualizarTextoMensagem(index) {
    const seletor =
        document.getElementById(`selectMsg_${index}`);

    const areaTexto =
        document.getElementById(`textMsg_${index}`);

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
    const painel =
        document.getElementById("painelDiscagemContainer");

    if (!painel) {
        console.error("painelDiscagemContainer não encontrado.");
        return;
    }

    if (painel.style.display === "block") {
        painel.style.display = "none";
        return;
    }

    painel.style.display = "block";

    prepararDiscagemPacienteAtivo();
    escutarTecladoDiscador();
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
            <div style="
                background:#f0fdf4;
                border:1px solid #bbf7d0;
                border-radius:6px;
                padding:8px;
            ">
                <p style="
                    margin:0;
                    font-size:11px;
                    color:#166534;
                    font-weight:bold;
                ">
                    👤 Utente Ativo no Prontuário:
                </p>

                <strong style="
                    font-size:13px;
                    color:#14532d;
                    display:block;
                ">
                    ${nomeAtivo}
                </strong>

                <span style="font-size:12px; color:#166534;">
                    📞 Contato: ${telAtivo}
                </span>

                <button
                    onclick="prepararWhatsAppPacienteAtivo()"
                    style="
                        margin-top:8px;
                        background:#25d366;
                        color:white;
                        border:none;
                        padding:6px 8px;
                        border-radius:5px;
                        font-size:12px;
                        font-weight:bold;
                        cursor:pointer;
                    ">
                    💬 Preparar mensagem
                </button>
            </div>
        `;
    } else {
        displayStatus.innerHTML = `
            <em style="color:#94a3b8; font-size:12px;">
                Digite nome, CPF, CNS, telefone ou filtro: HAS, hipertensão, DM, diabetes, gestante, TB, hanseníase, crítico.
            </em>
        `;
    }
}

function prepararWhatsAppPacienteAtivo() {
    const telefone =
        document.getElementById("telPaciente")?.value || "";

    const nome =
        document.getElementById("nomePaciente")?.value || "Paciente";

    if (!telefone) {
        mostrarToast?.("⚠️ Paciente ativo sem telefone.");
        return;
    }

    const container =
        document.getElementById("statusDiscadorPaciente");

    if (!container) return;

    renderizarContatosDiscador(
        [
            {
                nome,
                cpf: document.getElementById("cpfPaciente")?.value || "",
                cns: document.getElementById("cnsPaciente")?.value || "",
                telefone,
                ubs: document.getElementById("unidadePaciente")?.value || "Prontuário ativo",
                equipe: document.getElementById("equipePaciente")?.value || "-"
            }
        ],
        container
    );
}

/* ==========================================================================
   BUSCA
   ========================================================================== */

function escutarTecladoDiscador() {
    const inputDiscador =
        document.getElementById("inputNumeroDiscador");

    if (!inputDiscador) return;

    inputDiscador.oninput = function () {
        clearTimeout(timerBuscaDiscador);

        timerBuscaDiscador = setTimeout(() => {
            buscarContatosSupabase(inputDiscador.value);
        }, 500);
    };
}

async function buscarContatosSupabase(termo) {
    const displayStatus =
        document.getElementById("statusDiscadorPaciente");

    if (!displayStatus) return;

    termo = String(termo || "").trim();

    if (!termo) {
        prepararDiscagemPacienteAtivo();
        return;
    }

    if (typeof supabaseClient === "undefined") {
        displayStatus.innerHTML = `
            <p style="color:var(--danger); font-size:12px;">
                Supabase não carregado.
            </p>
        `;
        return;
    }

    const termoNumerico =
        limparNumeroWhatsapp(termo);

    const termoLower =
        normalizarTextoWhatsapp(termo);

    const desejaHAS =
        termoLower.includes("has") ||
        termoLower.includes("hipertens");

    const desejaDM =
        termoLower.includes("dm") ||
        termoLower.includes("diabet");

    const desejaGestante =
        termoLower.includes("gest") ||
        termoLower.includes("prenatal") ||
        termoLower.includes("pre natal");

    const desejaTB =
        termoLower.includes("tb") ||
        termoLower.includes("tubercul");

    const desejaHansen =
        termoLower.includes("hansen") ||
        termoLower.includes("hanseniase");

    const desejaCritico =
        termoLower.includes("critico") ||
        termoLower.includes("urgente") ||
        termoLower.includes("vencido");

    const temFiltroClinico =
        desejaHAS ||
        desejaDM ||
        desejaGestante ||
        desejaTB ||
        desejaHansen ||
        desejaCritico;

    /* ======================================================
       DISCAGEM EXTERNA / MANUAL
       ====================================================== */

    if (
        !temFiltroClinico &&
        /^\d+$/.test(termoNumerico) &&
        termoNumerico.length >= 8 &&
        termoNumerico.length <= 13
    ) {
        renderizarContatosDiscador(
            [
                {
                    externo: true,
                    nome: "Contato Externo",
                    cpf: "",
                    cns: "",
                    telefone: termoNumerico,
                    ubs: "Discagem Externa",
                    equipe: "-"
                }
            ],
            displayStatus
        );

        return;
    }

    if (
        termo.length < 3 &&
        termoNumerico.length < 3
    ) {
        displayStatus.innerHTML = `
            <em style="color:#94a3b8; font-size:12px;">
                Digite pelo menos 3 caracteres.
            </em>
        `;
        return;
    }

    displayStatus.innerHTML = `
        <em style="color:#94a3b8; font-size:12px;">
            🔎 Buscando contatos no Supabase...
        </em>
    `;

    try {
        let pacientesBase = [];
        let atendimentosBase = [];

        /* ==================================================
           BUSCA CLÍNICA EM ATENDIMENTOS
           ================================================== */

        if (temFiltroClinico) {
            let queryAtendimentos = supabaseClient
                .from("atendimentos")
                .select(`
                    id,
                    paciente_cpf,
                    cpf,
                    cns,
                    nome_paciente,
                    has,
                    dm,
                    gestante,
                    tb,
                    hansen,
                    reavaliacaoDias,
                    retorno_dias,
                    nota_monitoramento,
                    risco_global,
                    risco_pontos,
                    data_atendimento,
                    criado_em
                `)
                .order("data_atendimento", {
                    ascending: false,
                    nullsFirst: false
                })
                .limit(200);

            if (desejaHAS) {
                queryAtendimentos = queryAtendimentos.eq("has", "Sim");
            } else if (desejaDM) {
                queryAtendimentos = queryAtendimentos.eq("dm", "Sim");
            } else if (desejaGestante) {
                queryAtendimentos = queryAtendimentos.eq("gestante", "Sim");
            } else if (desejaTB) {
                queryAtendimentos = queryAtendimentos.eq("tb", "Sim");
            } else if (desejaHansen) {
                queryAtendimentos = queryAtendimentos.eq("hansen", "Sim");
            } else if (desejaCritico) {
                queryAtendimentos = queryAtendimentos.or(
                    "reavaliacaoDias.eq.0,retorno_dias.eq.0"
                );
            }

            const { data, error } = await queryAtendimentos;

            if (error) {
                throw error;
            }

            atendimentosBase = data || [];

        } else {
            /* ==================================================
               BUSCA TERRITORIAL EM PACIENTES
               ================================================== */

            let queryPacientes = supabaseClient
                .from("pacientes")
                .select(`
                    id,
                    nome,
                    cpf,
                    cns,
                    telefone,
                    endereco,
                    cep,
                    ubs,
                    equipe,
                    ubs_vinculacao,
                    equipe_esf
                `)
                .limit(50);

            if (termoNumerico.length >= 3) {
                queryPacientes = queryPacientes.or(
                    `cpf.ilike.%${termoNumerico}%,cns.ilike.%${termoNumerico}%,telefone.ilike.%${termoNumerico}%`
                );
            } else {
                queryPacientes = queryPacientes.ilike(
                    "nome",
                    `%${termo}%`
                );
            }

            const { data, error } = await queryPacientes;

            if (error) {
                throw error;
            }

            pacientesBase = data || [];

            /* também tenta localizar em atendimentos pelo nome_paciente */
            let queryAtendimentosNome = supabaseClient
                .from("atendimentos")
                .select(`
                    id,
                    paciente_cpf,
                    cpf,
                    cns,
                    nome_paciente,
                    has,
                    dm,
                    gestante,
                    tb,
                    hansen,
                    reavaliacaoDias,
                    retorno_dias,
                    nota_monitoramento,
                    data_atendimento,
                    criado_em
                `)
                .ilike("nome_paciente", `%${termo}%`)
                .order("data_atendimento", {
                    ascending: false,
                    nullsFirst: false
                })
                .limit(50);

            const { data: atendNome, error: erroAtendNome } =
                await queryAtendimentosNome;

            if (!erroAtendNome) {
                atendimentosBase = atendNome || [];
            }
        }

        const contatos =
            await montarContatosWhatsapp(
                pacientesBase,
                atendimentosBase
            );

        if (!contatos.length) {
            if (
                !temFiltroClinico &&
                termoNumerico.length >= 8
            ) {
                renderizarContatosDiscador(
                    [
                        {
                            externo: true,
                            nome: "Contato Externo",
                            cpf: "",
                            cns: "",
                            telefone: termoNumerico,
                            ubs: "Discagem Externa",
                            equipe: "-"
                        }
                    ],
                    displayStatus
                );

                return;
            }

            displayStatus.innerHTML = `
                <p style="color:var(--danger); font-size:12px;">
                    Nenhum contato localizado.
                </p>
            `;

            return;
        }

        renderizarContatosDiscador(
            contatos,
            displayStatus
        );

    } catch (error) {
        console.error("Erro ao buscar contatos:", error);

        displayStatus.innerHTML = `
            <p style="color:var(--danger); font-size:12px;">
                Erro ao buscar contatos no Supabase.
            </p>
        `;
    }
}

/* ==========================================================================
   MONTAR CONTATOS — PACIENTES + ATENDIMENTOS
   ========================================================================== */

async function montarContatosWhatsapp(pacientesBase, atendimentosBase) {
    const mapa = new Map();

    pacientesBase.forEach(p => {
        const chave =
            p.cpf ||
            p.cns ||
            p.telefone ||
            p.nome;

        if (!chave) return;

        mapa.set(chave, {
            ...p
        });
    });

    atendimentosBase.forEach(a => {
        const cpf =
            a.paciente_cpf ||
            a.cpf ||
            "";

        const chave =
            cpf ||
            a.cns ||
            a.nome_paciente ||
            a.id;

        if (!chave) return;

        if (!mapa.has(chave)) {
            mapa.set(chave, {
                cpf,
                cns: a.cns,
                nome: a.nome_paciente,
                nome_paciente: a.nome_paciente
            });
        }

        const atual =
            mapa.get(chave);

        mapa.set(chave, {
            ...atual,
            ...a,
            cpf:
                atual.cpf ||
                cpf,
            cns:
                atual.cns ||
                a.cns,
            nome:
                atual.nome ||
                a.nome_paciente,
            ultimo_atendimento:
                a
        });
    });

    const cpfs =
        [...new Set(
            Array.from(mapa.values())
                .map(p => p.paciente_cpf || p.cpf)
                .filter(Boolean)
        )];

    const cnss =
        [...new Set(
            Array.from(mapa.values())
                .map(p => p.cns)
                .filter(Boolean)
        )];

    if (cpfs.length || cnss.length) {
        let query = supabaseClient
            .from("pacientes")
            .select(`
                nome,
                cpf,
                cns,
                telefone,
                endereco,
                ubs,
                equipe,
                ubs_vinculacao,
                equipe_esf
            `);

        if (cpfs.length && cnss.length) {
            query = query.or(
                `cpf.in.(${cpfs.join(",")}),cns.in.(${cnss.join(",")})`
            );
        } else if (cpfs.length) {
            query = query.in("cpf", cpfs);
        } else {
            query = query.in("cns", cnss);
        }

        const { data, error } = await query;

        if (!error && data) {
            data.forEach(p => {
                const chave =
                    p.cpf ||
                    p.cns;

                const atual =
                    mapa.get(p.cpf) ||
                    mapa.get(p.cns) ||
                    {};

                mapa.set(chave, {
                    ...atual,
                    ...p,
                    nome:
                        p.nome ||
                        atual.nome ||
                        atual.nome_paciente,
                    cpf:
                        p.cpf ||
                        atual.cpf ||
                        atual.paciente_cpf,
                    cns:
                        p.cns ||
                        atual.cns
                });
            });
        }
    }

    return removerDuplicadosPorDocumento(
        Array.from(mapa.values())
    );
}

function removerDuplicadosPorDocumento(lista) {
    const mapa = new Map();

    lista.forEach(p => {
        const chave =
            p.cpf ||
            p.paciente_cpf ||
            p.cns ||
            p.telefone ||
            p.nome;

        if (!mapa.has(chave)) {
            mapa.set(chave, p);
        }
    });

    return Array.from(mapa.values());
}

/* ==========================================================================
   RENDERIZAR CONTATOS
   ========================================================================== */

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
        const telefone =
            p.telefone || "";

        const foneLimpo =
            limparNumeroWhatsapp(telefone);

        const externo =
            p.externo === true;

        const dias =
            obterDiasWhatsapp(p);

        const status =
            dias === 0
                ? "🚨 CRÍTICO"
                : dias <= 30
                    ? `⚠️ ${dias} dias`
                    : "";

        const cpfSeguro =
            escaparWhatsapp(p.paciente_cpf || p.cpf || "");

        const cnsSeguro =
            escaparWhatsapp(p.cns || "");

        const nota =
            p.nota_monitoramento
                ? `
                    <span
                        title="${escaparWhatsapp(p.nota_monitoramento)}"
                        style="
                            color:#0284c7;
                            cursor:help;
                            font-size:12px;
                            font-weight:bold;
                        ">
                        ℹ️ Nota
                    </span>
                `
                : "";

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
                    ${obterNomeWhatsapp(p)}
                </strong>

                ${
                    status
                    ? `
                        <span style="
                            font-size:10px;
                            font-weight:bold;
                            color:#b91c1c;
                        ">
                            ${status}
                        </span>
                    `
                    : ""
                }

                ${nota}

                ${
                    externo
                    ? `
                        <span style="font-size:11px; color:#64748b;">
                            📞 Contato externo/manual
                        </span>
                    `
                    : `
                        <span style="font-size:11px; color:#64748b;">
                            CPF: ${p.paciente_cpf || p.cpf || "-"} | CNS: ${p.cns || "-"}
                        </span>

                        <span style="font-size:11px; color:#64748b;">
                            UBS: ${obterUBSWhatsapp(p)} | Equipe: ${obterEquipeWhatsapp(p)}
                        </span>
                    `
                }

                <span style="font-size:11px; color:#64748b;">
                    📞 Tel: ${telefone || "Não cadastrado"}
                </span>

                ${
                    telefone
                    ? `
                        <select
                            id="selectMsg_${index}"
                            onchange="atualizarTextoMensagem(${index})"
                            style="
                                width:100%;
                                font-size:11px;
                                padding:4px;
                            ">
                            ${gerarOptionsMensagensWhatsapp()}
                        </select>

                        <textarea
                            id="textMsg_${index}"
                            placeholder="Selecione um padrão ou escreva uma mensagem..."
                            style="
                                width:100%;
                                height:55px;
                                font-size:11px;
                                padding:5px;
                            "></textarea>

                        <button
                            onclick="enviarWhatsAppTerritorial('${foneLimpo}', ${index})"
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
                        <span style="
                            font-size:11px;
                            color:var(--danger);
                            font-weight:500;
                        ">
                            🚫 Sem telefone cadastrado.
                        </span>
                    `
                }

                ${
                    !externo
                    ? `
                        <button
                            onclick="abrirAtendimentoExistente('${cpfSeguro}', '${cnsSeguro}')"
                            style="
                                background:#2563eb;
                                color:white;
                                border:none;
                                padding:6px;
                                border-radius:4px;
                                font-size:12px;
                                font-weight:bold;
                                cursor:pointer;
                            ">
                            📋 Abrir prontuário
                        </button>
                    `
                    : ""
                }
            </div>
        `;
    });

    html += `</div>`;

    container.innerHTML = html;
}

/* ==========================================================================
   ENVIO WHATSAPP
   ========================================================================== */

function enviarWhatsAppTerritorial(telefonePuro, index) {
    const areaTexto =
        document.getElementById(`textMsg_${index}`);

    if (!areaTexto) return;

    const texto =
        areaTexto.value.trim();

    if (!texto) {
        mostrarToast?.(
            "⚠️ Insira uma mensagem válida antes de enviar."
        );
        return;
    }

    let telefoneFinal =
        limparNumeroWhatsapp(telefonePuro);

    if (
        telefoneFinal.length === 10 ||
        telefoneFinal.length === 11
    ) {
        telefoneFinal =
            "55" + telefoneFinal;
    }

    if (telefoneFinal.length < 12) {
        mostrarToast?.("⚠️ Telefone inválido.");
        return;
    }

    const url =
        `https://api.whatsapp.com/send?phone=${telefoneFinal}&text=${encodeURIComponent(texto)}`;

    window.open(url, "_blank");
}

/* ==========================================================================
   WHATSAPP DIRETO DO MONITORAMENTO
   ========================================================================== */

async function abrirWhatsAppMonitoramento(cpf, cns, linha) {
    try {
        const cpfLimpo =
            limparNumeroWhatsapp(cpf);

        const cnsLimpo =
            limparNumeroWhatsapp(cns);

        if (!cpfLimpo && !cnsLimpo) {
            mostrarToast?.(
                "⚠️ Paciente sem CPF/CNS."
            );
            return;
        }

        let query = supabaseClient
            .from("pacientes")
            .select("nome, cpf, cns, telefone")
            .limit(1);

        if (cpfLimpo) {
            query = query.eq("cpf", cpfLimpo);
        } else {
            query = query.eq("cns", cnsLimpo);
        }

        const {
            data,
            error
        } = await query;

        if (
            error ||
            !data ||
            data.length === 0
        ) {
            console.error(
                "Erro ao buscar paciente:",
                error
            );

            mostrarToast?.(
                "⚠️ Paciente não encontrado."
            );

            return;
        }

        const p = data[0];

        const telefone =
            p.telefone || "";

        if (!telefone) {
            mostrarToast?.(
                "⚠️ Paciente sem telefone cadastrado."
            );
            return;
        }

        let chaveMensagem =
            "busca_ativa";

        if (linha === "has") {
            chaveMensagem =
                "has_critico";
        }

        if (linha === "dm") {
            chaveMensagem =
                "dm_controle";
        }

        if (linha === "gestante") {
            chaveMensagem =
                "pn_rotina";
        }

        if (linha === "tuberculose") {
            chaveMensagem =
                "tb_busca";
        }

        if (linha === "hanseniase") {
            chaveMensagem =
                "hansen_busca";
        }

        let telefoneFinal =
            limparNumeroWhatsapp(telefone);

        if (
            telefoneFinal.length === 10 ||
            telefoneFinal.length === 11
        ) {
            telefoneFinal =
                "55" + telefoneFinal;
        }

        if (telefoneFinal.length < 12) {
            mostrarToast?.("⚠️ Telefone inválido.");
            return;
        }

        const mensagem =
            obterMensagemPadrao(
                chaveMensagem
            );

        const url =
            `https://api.whatsapp.com/send?phone=${telefoneFinal}&text=${encodeURIComponent(mensagem)}`;

        window.open(
            url,
            "_blank"
        );

    } catch (erro) {
        console.error("Erro WhatsApp monitoramento:", erro);
        mostrarToast?.("⚠️ Erro ao abrir WhatsApp.");
    }
}

/* ==========================================================================
   GLOBAL
   ========================================================================== */

window.alternarCentralDiscagem =
    alternarCentralDiscagem;

window.buscarContatosSupabase =
    buscarContatosSupabase;

window.enviarWhatsAppTerritorial =
    enviarWhatsAppTerritorial;

window.abrirWhatsAppMonitoramento =
    abrirWhatsAppMonitoramento;

window.atualizarTextoMensagem =
    atualizarTextoMensagem;

window.prepararWhatsAppPacienteAtivo =
    prepararWhatsAppPacienteAtivo;

window.obterMensagemPadrao =
    obterMensagemPadrao;

window.SCRIPTS_WHATSAPP_APS =
    SCRIPTS_WHATSAPP_APS;
