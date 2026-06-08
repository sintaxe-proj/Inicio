/* ==========================================================================
   📈 MONITORAMENTO TERRITORIAL & PAINEL EPIDEMIOLÓGICO
   SUPABASE PURO
   pacientes = identificação
   atendimentos = dados clínicos

   IMPORTANTE:
   A função abrirAtendimentoExistente() pertence ao busca.js.
   Este arquivo apenas chama essa função, sem sobrescrevê-la.
   ========================================================================== */

let linhaCuidadoAtualVisualizacao = "has";

/* ==========================================================================
   🚀 ABRIR PAINEL
   ========================================================================== */

function abrirPainelEpidemiologico(linhaCuidado) {
    linhaCuidadoAtualVisualizacao = linhaCuidado;

    const modal =
        document.getElementById("painelEpidemiologicoContainer");

    if (modal) {
        modal.style.display = "flex";
    }

    const titulos = {
        has: "Monitoramento Territorial: Hipertensão Arterial Sistêmica (HAS)",
        dm: "Monitoramento Territorial: Diabetes Mellitus (DM)",
        gestante: "Monitoramento Territorial: Vigilância de Pré-Natal",
        tuberculose: "Monitoramento Epidemiológico: Tuberculose",
        hanseniase: "Monitoramento Epidemiológico: Hanseníase",
        criticos: "🚨 Central de Alertas: Prazo Expirado"
    };

    const titulo =
        document.getElementById("tituloPainelEpidemiologico");

    if (titulo) {
        titulo.innerText =
            titulos[linhaCuidado] || "Vigilância em Saúde";
    }

    carregarFiltrosModalUBS();
}

/* ==========================================================================
   ❌ FECHAR PAINEL
   ========================================================================== */

function fecharPainelEpidemiologico() {
    const modal =
        document.getElementById("painelEpidemiologicoContainer");

    if (modal) {
        modal.style.display = "none";
    }
}

/* ==========================================================================
   🏥 CARREGAR FILTROS DINÂMICOS
   ========================================================================== */

async function carregarFiltrosModalUBS() {
    const ubsSelect =
        document.getElementById("filtroUBS");

    const equipeSelect =
        document.getElementById("filtroEquipe");

    if (ubsSelect) {
        ubsSelect.innerHTML =
            `<option value="TODAS">Todas as Unidades</option>`;
    }

    if (equipeSelect) {
        equipeSelect.innerHTML =
            `<option value="TODAS">Todas as Equipes</option>`;
    }

    try {
        if (typeof supabaseClient !== "undefined") {
            const { data, error } = await supabaseClient
                .from("pacientes")
                .select(`
                    ubs,
                    equipe,
                    ubs_vinculacao,
                    equipe_esf
                `);

            if (!error && data) {
                const ubsLista =
                    [...new Set(
                        data
                            .map(p =>
                                p.ubs_vinculacao ||
                                p.ubs
                            )
                            .filter(Boolean)
                    )].sort();

                const equipes =
                    [...new Set(
                        data
                            .map(p =>
                                p.equipe_esf ||
                                p.equipe
                            )
                            .filter(Boolean)
                    )].sort();

                if (ubsSelect) {
                    ubsLista.forEach(ubs => {
                        ubsSelect.innerHTML += `
                            <option value="${ubs}">
                                ${ubs}
                            </option>
                        `;
                    });
                }

                if (equipeSelect) {
                    equipes.forEach(equipe => {
                        equipeSelect.innerHTML += `
                            <option value="${equipe}">
                                ${equipe}
                            </option>
                        `;
                    });
                }
            }
        }
    } catch (erro) {
        console.warn(
            "Não foi possível carregar filtros dinâmicos:",
            erro
        );

        carregarFiltrosModalUBSFallback();
    }

    const risco =
        document.getElementById("filtroRisco");

    if (risco) {
        risco.value = "TODOS";
    }

    aplicarFiltrosRelatorio();
}

/* Fallback caso a busca dinâmica falhe */
function carregarFiltrosModalUBSFallback() {
    const ubsSelect =
        document.getElementById("filtroUBS");

    const equipeSelect =
        document.getElementById("filtroEquipe");

    if (ubsSelect && ubsSelect.children.length <= 1) {
        ubsSelect.innerHTML = `
            <option value="TODAS">Todas as Unidades</option>
            <option value="UBS Centro Médico">UBS Centro Médico</option>
            <option value="UBS Vila Nova">UBS Vila Nova</option>
            <option value="Clínica da Família Zona Sul">Clínica da Família Zona Sul</option>
            <option value="UBS Integrada Norte">UBS Integrada Norte</option>
        `;
    }

    if (equipeSelect && equipeSelect.children.length <= 1) {
        equipeSelect.innerHTML = `
            <option value="TODAS">Todas as Equipes</option>
            <option value="Equipe Verde">Equipe Verde</option>
            <option value="Equipe Azul">Equipe Azul</option>
            <option value="Equipe Esmeralda">Equipe Esmeralda</option>
            <option value="Equipe Rubi">Equipe Rubi</option>
        `;
    }
}

/* ==========================================================================
   🔍 APLICAR FILTROS
   ========================================================================== */

async function aplicarFiltrosRelatorio() {
    if (typeof supabaseClient === "undefined") {
        mostrarToast?.("❌ Supabase não carregado.");
        return;
    }

    const ubs =
        document.getElementById("filtroUBS")?.value || "TODAS";

    const equipe =
        document.getElementById("filtroEquipe")?.value || "TODAS";

    const risco =
        document.getElementById("filtroRisco")?.value || "TODOS";

    let query = supabaseClient
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
        });

    if (linhaCuidadoAtualVisualizacao === "has") {
        query = query.eq("has", "Sim");
    } else if (linhaCuidadoAtualVisualizacao === "dm") {
        query = query.eq("dm", "Sim");
    } else if (linhaCuidadoAtualVisualizacao === "gestante") {
        query = query.eq("gestante", "Sim");
    } else if (linhaCuidadoAtualVisualizacao === "tuberculose") {
        query = query.eq("tb", "Sim");
    } else if (linhaCuidadoAtualVisualizacao === "hanseniase") {
        query = query.eq("hansen", "Sim");
    } else if (linhaCuidadoAtualVisualizacao === "criticos") {
        query = query.or(
            "reavaliacaoDias.eq.0,retorno_dias.eq.0"
        );
    }

    if (risco === "CRITICO") {
        query = query.or(
            "reavaliacaoDias.eq.0,retorno_dias.eq.0"
        );
    } else if (risco === "ATENCAO") {
        query = query
            .gt("reavaliacaoDias", 0)
            .lte("reavaliacaoDias", 30);
    } else if (risco === "CONTROLADO") {
        query = query.gt("reavaliacaoDias", 30);
    }

    const { data: atendimentos, error } = await query;

    if (error) {
        console.error("Erro monitoramento:", error);
        mostrarToast?.("❌ Erro ao carregar monitoramento.");
        return;
    }

    const lista =
        await enriquecerAtendimentosComPacientes(
            atendimentos || []
        );

    let filtrados = lista;

    if (ubs !== "TODAS") {
        filtrados =
            filtrados.filter(p =>
                p.ubs === ubs
            );
    }

    if (equipe !== "TODAS") {
        filtrados =
            filtrados.filter(p =>
                p.equipe === equipe
            );
    }

    renderizarGraficosModal(filtrados);
    renderizarTabelaMonitoramento(filtrados);
}

/* ==========================================================================
   🔗 BUSCAR IDENTIFICAÇÃO DOS PACIENTES
   ========================================================================== */

async function enriquecerAtendimentosComPacientes(atendimentos) {
    if (!atendimentos.length) return [];

    const cpfs =
        [...new Set(
            atendimentos
                .map(a => a.paciente_cpf || a.cpf)
                .filter(Boolean)
        )];

    const cnss =
        [...new Set(
            atendimentos
                .map(a => a.cns)
                .filter(Boolean)
        )];

    const pacientes = [];
    const tamanhoLote = 100;

    async function buscarPacientesPorCampo(campo, valores) {
        for (let i = 0; i < valores.length; i += tamanhoLote) {
            const lote = valores.slice(i, i + tamanhoLote);

            const { data, error } = await supabaseClient
                .from("pacientes")
                .select(`
                    cpf,
                    cns,
                    nome,
                    telefone,
                    ubs,
                    equipe,
                    ubs_vinculacao,
                    equipe_esf
                `)
                .in(campo, lote);

            if (error) {
                console.error(`Erro ao buscar pacientes por ${campo}:`, error);
                continue;
            }

            pacientes.push(...(data || []));
        }
    }

    if (cpfs.length) {
        await buscarPacientesPorCampo("cpf", cpfs);
    }

    if (cnss.length) {
        await buscarPacientesPorCampo("cns", cnss);
    }

    const mapaPorCpf = new Map();
    const mapaPorCns = new Map();

    pacientes.forEach(p => {
        if (p.cpf) mapaPorCpf.set(p.cpf, p);
        if (p.cns) mapaPorCns.set(p.cns, p);
    });

    return atendimentos.map(a => {
        const cpfAtendimento =
            a.paciente_cpf || a.cpf || "";

        const paciente =
            mapaPorCpf.get(cpfAtendimento) ||
            mapaPorCns.get(a.cns) ||
            null;

        return {
            ...a,

            cpf: cpfAtendimento,

            telefone:
                paciente?.telefone || "",

            nome:
                paciente?.nome ||
                a.nome_paciente ||
                "Sem nome",

            ubs:
                paciente?.ubs_vinculacao ||
                paciente?.ubs ||
                a.ubs_vinculacao ||
                "Pendente",

            equipe:
                paciente?.equipe_esf ||
                paciente?.equipe ||
                a.equipe_esf ||
                "Pendente"
        };
    });
}

/* ==========================================================================
   📋 TABELA DE MONITORAMENTO
   ========================================================================== */

function renderizarTabelaMonitoramento(filtrados) {
    const tabela =
        document.getElementById("tabelaPainelEpidemiologico");

    if (!tabela) return;

    if (!filtrados.length) {
        tabela.innerHTML = `
            <p style="color:#64748b; padding:10px;">
                Nenhum utente localizado.
            </p>
        `;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Nome</th>
                    <th>CPF/CNS</th>
                    <th>UBS</th>
                    <th>Equipe</th>
                    <th>Risco</th>
                    <th>Monitoramento</th>
                </tr>
            </thead>
            <tbody>
    `;

    filtrados.forEach(p => {
        const dias =
            parseInt(
                p.reavaliacaoDias ??
                p.retorno_dias ??
                0
            );

        let statusMonitoramento = "";

        if (dias === 0) {
            statusMonitoramento =
                "🚨 Reavaliação Urgente";
        } else if (dias > 0 && dias <= 30) {
            statusMonitoramento =
                `⚠️ Vence em ${dias} dias`;
        } else {
            statusMonitoramento =
                `✅ Monitoramento em ${dias} dias`;
        }

        const documento =
            p.paciente_cpf ||
            p.cpf ||
            p.cns ||
            "";

        const notaIcone =
            p.nota_monitoramento
                ? `
                    <span
                        title="${escaparMonitoramento(p.nota_monitoramento)}"
                        style="
                            color:#38bdf8;
                            cursor:help;
                            font-size:14px;
                            font-weight:bold;
                            margin-left:6px;
                        ">
                        ℹ️
                    </span>
                `
                : "";

        const riscoTexto =
            p.risco_global ||
            "-";

        const riscoPontos =
            p.risco_pontos !== null &&
            p.risco_pontos !== undefined
                ? ` (${p.risco_pontos} pts)`
                : "";

        const botaoWhatsApp =
            typeof abrirWhatsAppMonitoramento === "function"
                ? `
                    <button
                        onclick="abrirWhatsAppMonitoramento('${p.paciente_cpf || p.cpf || ""}', '${p.cns || ""}', '${linhaCuidadoAtualVisualizacao}')"
                        style="background:#25d366; color:white; border:none; padding:5px 8px; border-radius:5px; font-size:11px; font-weight:bold; cursor:pointer;">
                        💬 WhatsApp
                    </button>
                `
                : "";

        html += `
            <tr>
                <td>
                    <b>${p.nome || p.nome_paciente || "-"}</b>
                    ${notaIcone}
                </td>

                <td>${documento || "-"}</td>

                <td>${p.ubs || "Pendente"}</td>

                <td>${p.equipe || "Pendente"}</td>

                <td>
                    <span style="font-size:12px;">
                        ${riscoTexto}${riscoPontos}
                    </span>
                </td>

                <td>
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        <span>${statusMonitoramento}</span>

                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            <button
                                onclick="abrirAtendimentoExistente('${p.paciente_cpf || p.cpf || ""}', '${p.cns || ""}')"
                                style="background:#2563eb; color:white; border:none; padding:5px 8px; border-radius:5px; font-size:11px; font-weight:bold; cursor:pointer;">
                                📋 Abrir
                            </button>

                            ${botaoWhatsApp}
                        </div>
                    </div>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    tabela.innerHTML = html;
}

/* ==========================================================================
   📊 GRÁFICOS
   ========================================================================== */

function renderizarGraficosModal(lista) {
    const total = lista.length;

    const criticos =
        lista.filter(p =>
            parseInt(
                p.reavaliacaoDias ??
                p.retorno_dias ??
                0
            ) === 0
        ).length;

    const atencao =
        lista.filter(p => {
            const dias =
                parseInt(
                    p.reavaliacaoDias ??
                    p.retorno_dias ??
                    0
                );

            return dias > 0 && dias <= 30;
        }).length;

    const controlados =
        lista.filter(p => {
            const dias =
                parseInt(
                    p.reavaliacaoDias ??
                    p.retorno_dias ??
                    0
                );

            return dias > 30;
        }).length;

    const pctCritico =
        total > 0
            ? Math.round((criticos / total) * 100)
            : 0;

    const pctAtencao =
        total > 0
            ? Math.round((atencao / total) * 100)
            : 0;

    const pctControlado =
        total > 0
            ? Math.max(0, 100 - pctCritico - pctAtencao)
            : 0;

    const donut =
        document.getElementById("containerGraficoDonut");

    const barras =
        document.getElementById("containerGraficoBarras");

    if (donut) {
        donut.innerHTML = `
            <div class="donut-wrapper">
                <svg width="100%" height="100%" viewBox="0 0 42 42" class="donut-svg">
                    <circle class="donut-bg" cx="21" cy="21" r="15.915"></circle>

                    <circle class="donut-segment"
                            cx="21"
                            cy="21"
                            r="15.915"
                            stroke="var(--danger)"
                            stroke-dasharray="${pctCritico} ${100 - pctCritico}"
                            stroke-dashoffset="0">
                    </circle>
                </svg>

                <div class="donut-center-text">
                    <span class="donut-number">${pctCritico}%</span>
                    <span class="donut-label">Críticos</span>
                </div>
            </div>
        `;
    }

    if (barras) {
        barras.innerHTML = `
            <div class="bar-chart-container">

                <div class="bar-row">
                    <div class="bar-label">
                        <span>🚨 Críticos / Vencidos</span>
                        <span>${criticos} Utentes</span>
                    </div>
                    <div class="bar-track">
                        <div class="bar-fill"
                             style="width:${pctCritico}%; background:var(--danger);">
                        </div>
                    </div>
                </div>

                <div class="bar-row" style="margin-top:10px;">
                    <div class="bar-label">
                        <span>⚠️ Atenção / Próximos 30 dias</span>
                        <span>${atencao} Utentes</span>
                    </div>
                    <div class="bar-track">
                        <div class="bar-fill"
                             style="width:${pctAtencao}%; background:var(--warning);">
                        </div>
                    </div>
                </div>

                <div class="bar-row" style="margin-top:10px;">
                    <div class="bar-label">
                        <span>✅ Controlados</span>
                        <span>${controlados} Utentes</span>
                    </div>
                    <div class="bar-track">
                        <div class="bar-fill"
                             style="width:${pctControlado}%; background:var(--success);">
                        </div>
                    </div>
                </div>

            </div>
        `;
    }
}

/* ==========================================================================
   HELPERS
   ========================================================================== */

function escaparMonitoramento(valor) {
    return String(valor || "")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/* ==========================================================================
   GLOBAL
   ========================================================================== */

window.abrirPainelEpidemiologico =
    abrirPainelEpidemiologico;

window.fecharPainelEpidemiologico =
    fecharPainelEpidemiologico;

window.carregarFiltrosModalUBS =
    carregarFiltrosModalUBS;

window.aplicarFiltrosRelatorio =
    aplicarFiltrosRelatorio;

window.enriquecerAtendimentosComPacientes =
    enriquecerAtendimentosComPacientes;

window.renderizarTabelaMonitoramento =
    renderizarTabelaMonitoramento;

window.renderizarGraficosModal =
    renderizarGraficosModal;
