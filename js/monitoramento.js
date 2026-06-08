/* ==========================================================================
   📈 MONITORAMENTO TERRITORIAL & PAINEL EPIDEMIOLÓGICO
   SUPABASE PURO
   pacientes = identificação
   atendimentos = dados clínicos
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
   🏥 CARREGAR FILTROS
   ========================================================================== */

function carregarFiltrosModalUBS() {
    const ubsSelect =
        document.getElementById("filtroUBS");

    const equipeSelect =
        document.getElementById("filtroEquipe");

    if (ubsSelect) {
        ubsSelect.innerHTML = `
            <option value="TODAS">Todas as Unidades</option>
            <option value="UBS Centro Médico">UBS Centro Médico</option>
            <option value="UBS Vila Nova">UBS Vila Nova</option>
            <option value="Clínica da Família Zona Sul">Clínica da Família Zona Sul</option>
            <option value="UBS Integrada Norte">UBS Integrada Norte</option>
        `;
    }

    if (equipeSelect) {
        equipeSelect.innerHTML = `
            <option value="TODAS">Todas as Equipes</option>
            <option value="Equipe Verde">Equipe Verde</option>
            <option value="Equipe Azul">Equipe Azul</option>
            <option value="Equipe Esmeralda">Equipe Esmeralda</option>
            <option value="Equipe Rubi">Equipe Rubi</option>
        `;
    }

    const risco =
        document.getElementById("filtroRisco");

    if (risco) {
        risco.value = "TODOS";
    }

    aplicarFiltrosRelatorio();
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
            cpf,
            cns,
            nome_paciente,
            has,
            dm,
            gestante,
            tb,
            hansen,
            "reavaliacaoDias",
            nota_monitoramento,
            data_atendimento
        `)
        .order("data_atendimento", { ascending: false });

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
        query = query.eq("reavaliacaoDias", 0);
    }

    if (risco === "CRITICO") {
        query = query.eq("reavaliacaoDias", 0);
    } else if (risco === "ATENCAO") {
        query = query.gt("reavaliacaoDias", 0).lte("reavaliacaoDias", 30);
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
        await enriquecerAtendimentosComPacientes(atendimentos || []);

    let filtrados = lista;

    if (ubs !== "TODAS") {
        filtrados = filtrados.filter(p => p.ubs === ubs);
    }

    if (equipe !== "TODAS") {
        filtrados = filtrados.filter(p => p.equipe === equipe);
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
                .map(a => a.cpf)
                .filter(Boolean)
        )];

    const cnss =
        [...new Set(
            atendimentos
                .map(a => a.cns)
                .filter(Boolean)
        )];

    let query = supabaseClient
        .from("pacientes")
        .select("cpf, cns, nome, ubs, equipe");

    if (cpfs.length && cnss.length) {
        query = query.or(
            `cpf.in.(${cpfs.join(",")}),cns.in.(${cnss.join(",")})`
        );
    } else if (cpfs.length) {
        query = query.in("cpf", cpfs);
    } else if (cnss.length) {
        query = query.in("cns", cnss);
    }

    const { data: pacientes, error } = await query;

    if (error) {
        console.error("Erro ao buscar pacientes:", error);
        return atendimentos.map(a => ({
            ...a,
            nome: a.nome_paciente,
            ubs: "Pendente",
            equipe: "Pendente"
        }));
    }

    return atendimentos.map(a => {
        const paciente =
            pacientes.find(p =>
                (a.cpf && p.cpf === a.cpf) ||
                (a.cns && p.cns === a.cns)
            );

        return {
            ...a,
            nome: paciente?.nome || a.nome_paciente || "Sem nome",
            ubs: paciente?.ubs || "Pendente",
            equipe: paciente?.equipe || "Pendente"
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
                    <th>Monitoramento</th>
                </tr>
            </thead>
            <tbody>
    `;

    filtrados.forEach(p => {
        const dias =
            parseInt(p.reavaliacaoDias ?? 0);

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
            p.cpf || p.cns || "";

        const notaIcone =
            p.nota_monitoramento
                ? `
                    <span
                        title="${p.nota_monitoramento}"
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
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        <span>${statusMonitoramento}</span>

                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            <button
                                onclick="abrirAtendimentoExistente('${p.cpf || ""}', '${p.cns || ""}')"
                                style="background:#2563eb; color:white; border:none; padding:5px 8px; border-radius:5px; font-size:11px; font-weight:bold; cursor:pointer;">
                                📋 Abrir
                            </button>

                            <button
                                onclick="abrirWhatsAppMonitoramento('${p.cpf || ""}', '${p.cns || ""}', '${linhaCuidadoAtualVisualizacao}')"
                                style="background:#25d366; color:white; border:none; padding:5px 8px; border-radius:5px; font-size:11px; font-weight:bold; cursor:pointer;">
                                💬 WhatsApp
                            </button>
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
            parseInt(p.reavaliacaoDias ?? 0) === 0
        ).length;

    const atencao =
        lista.filter(p => {
            const dias =
                parseInt(p.reavaliacaoDias ?? 0);

            return dias > 0 && dias <= 30;
        }).length;

    const controlados =
        lista.filter(p => {
            const dias =
                parseInt(p.reavaliacaoDias ?? 0);

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
   📋 ABRIR PRONTUÁRIO PELO MONITORAMENTO
   ========================================================================== */

async function abrirAtendimentoExistente(cpf, cns) {
    try {
        const cpfLimpo = String(cpf || "").replace(/\D/g, "");
        const cnsLimpo = String(cns || "").replace(/\D/g, "");

        if (!cpfLimpo && !cnsLimpo) {
            alert("CPF ou CNS não informado para abrir o prontuário.");
            return;
        }

        let query = supabaseClient
            .from("pacientes")
            .select("*");

        if (cpfLimpo) {
            query = query.eq("cpf", cpfLimpo);
        } else {
            query = query.eq("cns", cnsLimpo);
        }

        const { data: paciente, error } = await query.maybeSingle();

        if (error) {
            console.error("Erro ao buscar paciente:", error);
            alert("Erro ao buscar paciente no Supabase.");
            return;
        }

        if (!paciente) {
            alert("Paciente não encontrado na base territorial.");
            return;
        }

        if (typeof navigate === "function") {
            navigate("prontuario");
        }

        document.getElementById("nomePaciente").value =
            paciente.nome || "";

        document.getElementById("cpfPaciente").value =
            paciente.cpf || "";

        document.getElementById("cnsPaciente").value =
            paciente.cns || "";

        document.getElementById("telPaciente").value =
            paciente.telefone || "";

        document.getElementById("endPaciente").value =
            paciente.endereco || "";

        document.getElementById("unidadePaciente").value =
            paciente.ubs || paciente.unidade || "";

        document.getElementById("equipePaciente").value =
            paciente.equipe || "";

        const modal =
            document.getElementById("painelEpidemiologicoContainer");

        if (modal) {
            modal.style.display = "none";
        }

        const cabecalho =
            document.getElementById("cabecalhoProntuario");

        const cabecalhoNome =
            document.getElementById("cabecalhoNome");

        if (cabecalho) {
            cabecalho.style.display = "block";
        }

        if (cabecalhoNome) {
            cabecalhoNome.innerText =
                `📋 Prontuário Ativo: ${paciente.nome || "Paciente"} (CPF: ${paciente.cpf || "-"})`;
        }

        window.pacienteAtual = paciente;
        window.pacienteSelecionado = paciente;

    } catch (erro) {
        console.error("Erro ao abrir prontuário:", erro);
        alert("Erro ao abrir prontuário.");
    }
}

window.abrirAtendimentoExistente =
    abrirAtendimentoExistente;

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
