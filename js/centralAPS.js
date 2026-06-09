/* ==========================================================
   🎯 CENTRAL OPERACIONAL APS 3.0 — SINTAXEHUB
   Supabase-first: sem localStorage, sem IndexedDB e sem cache persistente.
   Fonte única: pacientes + atendimentos + interacoes_busca_ativa
   Pendências clínicas: calculadas em tempo real a partir do Supabase.
   ========================================================== */

let centralAPSListaRenderizada = [];
let pacienteInteracaoCentralAPS = null;

/* ==========================================================
   CARREGAMENTO PRINCIPAL
   ========================================================== */

async function carregarCentralAPS() {
    const container =
        document.getElementById("listaCentralAPS");

    if (!container) return;

    if (typeof supabaseClient === "undefined") {
        container.innerHTML =
            `<p style="color:var(--danger);">Supabase não carregado.</p>`;
        return;
    }

    container.innerHTML =
        `<p style="color:var(--text-muted);">Consultando dados atualizados no Supabase...</p>`;

    try {
        const base =
            await buscarBaseCentralAPSSupabase();

        carregarFiltrosCentralAPS(base);
        await aplicarFilaCentralAPS("CRITICOS");

    } catch (erro) {
        console.error("Erro geral Central APS:", erro);

        container.innerHTML =
            `<p style="color:var(--danger);">Falha ao carregar Central APS.</p>`;
    }
}

/* ==========================================================
   BUSCA SUPABASE — SEM CACHE PERSISTENTE
   ========================================================== */

async function buscarBaseCentralAPSSupabase() {
    const { data: pacientes, error: erroPacientes } =
        await supabaseClient
            .from("pacientes")
            .select("*")
            .limit(10000);

    if (erroPacientes) {
        console.error("Erro ao carregar pacientes:", erroPacientes);
        throw erroPacientes;
    }

    const { data: atendimentos, error: erroAtendimentos } =
        await supabaseClient
            .from("atendimentos")
            .select("*")
            .order("data_atendimento", { ascending: false })
            .limit(30000);

    if (erroAtendimentos) {
        console.error("Erro ao carregar atendimentos:", erroAtendimentos);
        throw erroAtendimentos;
    }

    return consolidarBaseCentralAPS(
        pacientes || [],
        atendimentos || []
    );
}

/* ==========================================================
   CONSOLIDAÇÃO EM MEMÓRIA TEMPORÁRIA
   Observação: não salva em cache/localStorage/IndexedDB.
   ========================================================== */

function consolidarBaseCentralAPS(pacientes, atendimentos) {
    const mapa =
        new Map();

    pacientes.forEach(p => {
        const chave =
            p.cpf ||
            p.cns ||
            p.id;

        if (!chave) return;

        mapa.set(chave, {
            id: p.id || "",
            nome: p.nome || "",
            cpf: p.cpf || "",
            cns: p.cns || "",
            telefone: p.telefone || "",
            cep: p.cep || "",
            endereco: p.endereco || "",
            bairro: p.bairro || "",
            cidade: p.cidade || "",

            ubs:
                p.ubs_vinculacao ||
                p.ubs ||
                p.unidade ||
                p.unidadePaciente ||
                "Não informado",

            equipe:
                p.equipe_esf ||
                p.equipe ||
                p.equipePaciente ||
                "Não informado",

            has: "Não",
            dm: "Não",
            gestante: "Não",
            tb: "Não",
            hansen: "Não",

            hasPAS: null,
            hasPAD: null,
            dmHbA1c: null,
            gestDUM: null,
            gestIG: null,
            gestDPP: null,

            tbDataDiagnostico: null,
            tbDataBaciloscopia: null,
            tbResultadoBaciloscopia: "",
            tbFaseTratamento: "",

            hansenDataDiagnostico: null,
            hansenClassificacao: "",
            hansenGrauIncapacidade: "",
            hansenSituacaoTratamento: "",

            risco_global: "Não informado",
            risco_pontos: 0,
            prazo: null,
            ultimo_atendimento: null,
            ciap: ""
        });
    });

    atendimentos.forEach(a => {
        const chave =
            a.paciente_cpf ||
            a.cpf ||
            a.cns;

        if (!chave) return;

        const atual =
            mapa.get(chave) || {
                id: "",
                nome:
                    a.nome_paciente ||
                    a.nomePaciente ||
                    a.nome ||
                    "",
                cpf:
                    a.paciente_cpf ||
                    a.cpf ||
                    "",
                cns:
                    a.cns ||
                    "",
                telefone:
                    a.telefone ||
                    "",
                cep:
                    a.cep ||
                    "",
                endereco:
                    "",
                bairro:
                    "",
                cidade:
                    "",

                ubs:
                    a.ubs_vinculacao ||
                    a.ubs ||
                    "Não informado",

                equipe:
                    a.equipe_esf ||
                    a.equipe ||
                    "Não informado",

                has: "Não",
                dm: "Não",
                gestante: "Não",
                tb: "Não",
                hansen: "Não",

                hasPAS: null,
                hasPAD: null,
                dmHbA1c: null,
                gestDUM: null,
                gestIG: null,
                gestDPP: null,

                tbDataDiagnostico: null,
                tbDataBaciloscopia: null,
                tbResultadoBaciloscopia: "",
                tbFaseTratamento: "",

                hansenDataDiagnostico: null,
                hansenClassificacao: "",
                hansenGrauIncapacidade: "",
                hansenSituacaoTratamento: "",

                risco_global: "Não informado",
                risco_pontos: 0,
                prazo: null,
                ultimo_atendimento: null,
                ciap: ""
            };

        if (!atual.nome) {
            atual.nome =
                a.nome_paciente ||
                a.nomePaciente ||
                a.nome ||
                "";
        }

        if (!atual.telefone && a.telefone) {
            atual.telefone =
                a.telefone;
        }

        if (valorSimCentralAPS(a.has) || valorSimCentralAPS(a.hasSN)) {
            atual.has = "Sim";
        }

        if (valorSimCentralAPS(a.dm) || valorSimCentralAPS(a.dmSN)) {
            atual.dm = "Sim";
        }

        if (valorSimCentralAPS(a.gestante) || valorSimCentralAPS(a.gestanteSN)) {
            atual.gestante = "Sim";
        }

        if (valorSimCentralAPS(a.tb) || valorSimCentralAPS(a.tbSN)) {
            atual.tb = "Sim";
        }

        if (valorSimCentralAPS(a.hansen) || valorSimCentralAPS(a.hansenSN)) {
            atual.hansen = "Sim";
        }

        atual.hasPAS =
            obterPrimeiroValorCentralAPS(
                a.hasPAS,
                a.has_pas,
                a.objPAS,
                a.obj_pas,
                atual.hasPAS
            );

        atual.hasPAD =
            obterPrimeiroValorCentralAPS(
                a.hasPAD,
                a.has_pad,
                a.objPAD,
                a.obj_pad,
                atual.hasPAD
            );

        atual.dmHbA1c =
            obterPrimeiroValorCentralAPS(
                a.dmHbA1c,
                a.dm_hba1c,
                a.hba1c,
                atual.dmHbA1c
            );

        atual.gestDUM =
            obterPrimeiroValorCentralAPS(
                a.gestDUM,
                a.gest_dum,
                atual.gestDUM
            );

        atual.gestIG =
            obterPrimeiroValorCentralAPS(
                a.gestIG,
                a.gest_ig,
                atual.gestIG
            );

        atual.gestDPP =
            obterPrimeiroValorCentralAPS(
                a.gestDPP,
                a.gest_dpp,
                atual.gestDPP
            );

        atual.tbDataDiagnostico =
            obterPrimeiroValorCentralAPS(
                a.tbDataDiagnostico,
                a.tb_data_diagnostico,
                atual.tbDataDiagnostico
            );

        atual.tbDataBaciloscopia =
            obterPrimeiroValorCentralAPS(
                a.tbDataBaciloscopia,
                a.tb_data_baciloscopia,
                atual.tbDataBaciloscopia
            );

        atual.tbResultadoBaciloscopia =
            obterPrimeiroValorCentralAPS(
                a.tbResultadoBaciloscopia,
                a.tb_resultado_baciloscopia,
                atual.tbResultadoBaciloscopia
            );

        atual.tbFaseTratamento =
            obterPrimeiroValorCentralAPS(
                a.tbFaseTratamento,
                a.tb_fase_tratamento,
                atual.tbFaseTratamento
            );

        atual.hansenDataDiagnostico =
            obterPrimeiroValorCentralAPS(
                a.hansenDataDiagnostico,
                a.hansen_data_diagnostico,
                atual.hansenDataDiagnostico
            );

        atual.hansenClassificacao =
            obterPrimeiroValorCentralAPS(
                a.hansenClassificacao,
                a.hansen_classificacao,
                atual.hansenClassificacao
            );

        atual.hansenGrauIncapacidade =
            obterPrimeiroValorCentralAPS(
                a.hansenGrauIncapacidade,
                a.hansen_grau_incapacidade,
                atual.hansenGrauIncapacidade
            );

        atual.hansenSituacaoTratamento =
            obterPrimeiroValorCentralAPS(
                a.hansenSituacaoTratamento,
                a.hansen_situacao_tratamento,
                atual.hansenSituacaoTratamento
            );

        if (a.risco_global) {
            atual.risco_global =
                a.risco_global;
        }

        if (a.risco_pontos !== null && a.risco_pontos !== undefined) {
            atual.risco_pontos =
                Number(a.risco_pontos || 0);
        }

        const prazo =
            a.reavaliacaoDias ??
            a.retorno_dias ??
            a.soapReavaliacaoDias ??
            atual.prazo;

        atual.prazo =
            prazo !== null && prazo !== undefined
                ? Number(prazo)
                : atual.prazo;

        atual.ultimo_atendimento =
            a.data_atendimento ||
            a.criado_em ||
            a.created_at ||
            atual.ultimo_atendimento;

        atual.ciap =
            a.ciapSelecionado ||
            a.inputBuscaCIAPS ||
            a.ciap ||
            atual.ciap ||
            "";

        if (a.ubs_vinculacao || a.ubs) {
            atual.ubs =
                a.ubs_vinculacao ||
                a.ubs;
        }

        if (a.equipe_esf || a.equipe) {
            atual.equipe =
                a.equipe_esf ||
                a.equipe;
        }

        mapa.set(chave, atual);
    });

    return Array.from(mapa.values()).map(p => ({
        ...p,
        pendencias: identificarPendenciasClinicasCentralAPS(p)
    }));
}

/* ==========================================================
   FILTROS E FILAS
   ========================================================== */

function carregarFiltrosCentralAPS(base) {
    carregarSelectCentralAPS(
        "filtroCentralEquipe",
        base.map(p => p.equipe || "Não informado"),
        "Todas as equipes"
    );

    carregarSelectCentralAPS(
        "filtroCentralUBS",
        base.map(p => p.ubs || "Não informado"),
        "Todas as UBS"
    );
}

function carregarSelectCentralAPS(id, valores, rotulo) {
    const select =
        document.getElementById(id);

    if (!select) return;

    const valorAtual =
        select.value || "TODOS";

    const unicos =
        [...new Set(valores.filter(Boolean))]
            .sort();

    select.innerHTML =
        `<option value="TODOS">${rotulo}</option>`;

    unicos.forEach(valor => {
        const option =
            document.createElement("option");

        option.value =
            valor;

        option.textContent =
            valor;

        select.appendChild(option);
    });

    if (valorAtual === "TODOS" || unicos.includes(valorAtual)) {
        select.value =
            valorAtual;
    }
}

async function aplicarFilaCentralAPS(fila = null) {
    const container =
        document.getElementById("listaCentralAPS");

    if (container) {
        container.innerHTML =
            `<p style="color:var(--text-muted);">Atualizando dados no Supabase...</p>`;
    }

    const baseSupabase =
        await buscarBaseCentralAPSSupabase();

    const filaAtiva =
        fila ||
        document.getElementById("filtroFilaCentralAPS")?.value ||
        "CRITICOS";

    const seletorFila =
        document.getElementById("filtroFilaCentralAPS");

    if (seletorFila) {
        seletorFila.value =
            filaAtiva;
    }

    const equipe =
        document.getElementById("filtroCentralEquipe")?.value || "TODOS";

    const ubs =
        document.getElementById("filtroCentralUBS")?.value || "TODOS";

    const termo =
        document.getElementById("buscaCentralAPS")?.value?.trim() || "";

    let base =
        [...baseSupabase];

    if (equipe !== "TODOS") {
        base =
            base.filter(p =>
                String(p.equipe || "Não informado") === equipe
            );
    }

    if (ubs !== "TODOS") {
        base =
            base.filter(p =>
                String(p.ubs || "Não informado") === ubs
            );
    }

    if (termo) {
        const t =
            normalizarCentralAPS(termo);

        base =
            base.filter(p =>
                normalizarCentralAPS(`
                    ${p.nome}
                    ${p.cpf}
                    ${p.cns}
                    ${p.telefone}
                    ${p.ubs}
                    ${p.equipe}
                    ${p.pendencias?.join(" ")}
                `).includes(t)
            );
    }

    base =
        filtrarPorFilaCentralAPS(base, filaAtiva);

    base.sort((a, b) =>
        Number(a.prazo ?? 9999) - Number(b.prazo ?? 9999)
    );

    centralAPSListaRenderizada =
        base;

    atualizarCardsCentralAPS(baseSupabase);
    renderizarListaCentralAPS(base, filaAtiva);
}

function filtrarPorFilaCentralAPS(base, fila) {
    if (fila === "CRITICOS") {
        return base.filter(p =>
            Number(p.prazo) === 0 ||
            normalizarCentralAPS(p.risco_global).includes("alto") ||
            Number(p.risco_pontos || 0) >= 6
        );
    }

    if (fila === "HAS") {
        return base.filter(p => valorSimCentralAPS(p.has));
    }

    if (fila === "DM") {
        return base.filter(p => valorSimCentralAPS(p.dm));
    }

    if (fila === "GESTANTES") {
        return base.filter(p => valorSimCentralAPS(p.gestante));
    }

    if (fila === "TB") {
        return base.filter(p => valorSimCentralAPS(p.tb));
    }

    if (fila === "HANSEN") {
        return base.filter(p => valorSimCentralAPS(p.hansen));
    }

    if (fila === "PENDENCIAS") {
        return base.filter(p =>
            identificarPendenciasClinicasCentralAPS(p).length > 0
        );
    }

    if (fila === "HAS_SEM_PA") {
        return base.filter(p =>
            identificarPendenciasClinicasCentralAPS(p)
                .includes("HAS sem PA registrada")
        );
    }

    if (fila === "DM_SEM_HBA1C") {
        return base.filter(p =>
            identificarPendenciasClinicasCentralAPS(p)
                .includes("DM sem HbA1c registrada")
        );
    }

    if (fila === "GESTANTE_ATRASADA") {
        return base.filter(p =>
            identificarPendenciasClinicasCentralAPS(p)
                .includes("Gestante sem consulta recente")
        );
    }

    if (fila === "TB_SEM_ACOMPANHAMENTO") {
        return base.filter(p =>
            identificarPendenciasClinicasCentralAPS(p)
                .includes("TB sem acompanhamento recente")
        );
    }

    if (fila === "HANSEN_SEM_AVALIACAO") {
        return base.filter(p =>
            identificarPendenciasClinicasCentralAPS(p)
                .includes("Hanseníase sem avaliação recente")
        );
    }

    if (fila === "RETORNO_VENCIDO") {
        return base.filter(p =>
            identificarPendenciasClinicasCentralAPS(p)
                .includes("Retorno vencido")
        );
    }

    return base;
}

/* ==========================================================
   PENDÊNCIAS CLÍNICAS DINÂMICAS
   ========================================================== */

function identificarPendenciasClinicasCentralAPS(p) {
    const pendencias = [];

    if (
        valorSimCentralAPS(p.has) &&
        (!temValorCentralAPS(p.hasPAS) || !temValorCentralAPS(p.hasPAD))
    ) {
        pendencias.push("HAS sem PA registrada");
    }

    if (
        valorSimCentralAPS(p.dm) &&
        !temValorCentralAPS(p.dmHbA1c)
    ) {
        pendencias.push("DM sem HbA1c registrada");
    }

    if (
        valorSimCentralAPS(p.gestante) &&
        diasDesdeDataCentralAPS(p.ultimo_atendimento) > 30
    ) {
        pendencias.push("Gestante sem consulta recente");
    }

    if (
        valorSimCentralAPS(p.tb) &&
        diasDesdeDataCentralAPS(p.ultimo_atendimento) > 30
    ) {
        pendencias.push("TB sem acompanhamento recente");
    }

    if (
        valorSimCentralAPS(p.hansen) &&
        diasDesdeDataCentralAPS(p.ultimo_atendimento) > 60
    ) {
        pendencias.push("Hanseníase sem avaliação recente");
    }

    if (
        Number(p.prazo) === 0
    ) {
        pendencias.push("Retorno vencido");
    }

    if (
        normalizarCentralAPS(p.risco_global).includes("alto") ||
        Number(p.risco_pontos || 0) >= 6
    ) {
        pendencias.push("Alto risco clínico/territorial");
    }

    return [...new Set(pendencias)];
}

/* ==========================================================
   CARDS
   ========================================================== */

function atualizarCardsCentralAPS(base = []) {
    setTextoCentralAPS(
        "centralTotalCriticos",
        base.filter(p =>
            Number(p.prazo) === 0 ||
            normalizarCentralAPS(p.risco_global).includes("alto") ||
            Number(p.risco_pontos || 0) >= 6
        ).length
    );

    setTextoCentralAPS(
        "centralTotalHAS",
        base.filter(p => valorSimCentralAPS(p.has)).length
    );

    setTextoCentralAPS(
        "centralTotalDM",
        base.filter(p => valorSimCentralAPS(p.dm)).length
    );

    setTextoCentralAPS(
        "centralTotalGestantes",
        base.filter(p => valorSimCentralAPS(p.gestante)).length
    );

    setTextoCentralAPS(
        "centralTotalTB",
        base.filter(p => valorSimCentralAPS(p.tb)).length
    );

    setTextoCentralAPS(
        "centralTotalHansen",
        base.filter(p => valorSimCentralAPS(p.hansen)).length
    );

    setTextoCentralAPS(
        "centralTotalPendencias",
        base.filter(p =>
            identificarPendenciasClinicasCentralAPS(p).length > 0
        ).length
    );

    setTextoCentralAPS(
        "centralTotalRetornoVencido",
        base.filter(p =>
            identificarPendenciasClinicasCentralAPS(p)
                .includes("Retorno vencido")
        ).length
    );
}

/* ==========================================================
   TABELA OPERACIONAL
   ========================================================== */

function renderizarListaCentralAPS(base, fila) {
    const container =
        document.getElementById("listaCentralAPS");

    if (!container) return;

    if (!base.length) {
        container.innerHTML =
            `<p style="color:var(--text-muted);">Nenhum paciente encontrado nesta fila.</p>`;
        return;
    }

    container.innerHTML = `
        <table class="table-sintaxe">
            <thead>
                <tr>
                    <th>Paciente</th>
                    <th>Equipe</th>
                    <th>Linhas</th>
                    <th>Pendências</th>
                    <th>Risco</th>
                    <th>Prazo</th>
                    <th>Ações</th>
                </tr>
            </thead>

            <tbody>
                ${base.slice(0, 500).map(p => {
                    const pendencias =
                        identificarPendenciasClinicasCentralAPS(p);

                    return `
                        <tr>
                            <td>
                                <strong>${escaparCentralAPS(p.nome || "Sem nome")}</strong>
                                <small>CPF: ${escaparCentralAPS(p.cpf || "-")} | CNS: ${escaparCentralAPS(p.cns || "-")}</small>
                                <small>📞 ${escaparCentralAPS(p.telefone || "-")}</small>
                            </td>

                            <td>
                                ${escaparCentralAPS(p.equipe || "-")}
                                <small>${escaparCentralAPS(p.ubs || "-")}</small>
                            </td>

                            <td>${badgesLinhasCentralAPS(p)}</td>

                            <td>${badgesPendenciasCentralAPS(pendencias)}</td>

                            <td>${badgeRiscoCentralAPS(p)}</td>

                            <td>${badgePrazoCentralAPS(p.prazo)}</td>

                            <td>
                                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                    <button
                                        class="btn-table-action btn-edit"
                                        onclick="abrirAtendimentoExistente('${escaparCentralAPS(p.cpf || "")}', '${escaparCentralAPS(p.cns || "")}')">
                                        Prontuário
                                    </button>

                                    <button
                                        class="btn-table-action btn-ok"
                                        onclick="abrirWhatsAppCentralAPS('${escaparCentralAPS(p.telefone || "")}', '${escaparCentralAPS(p.nome || "")}')">
                                        WhatsApp
                                    </button>

                                    <button
                                        class="btn-table-action btn-warn"
                                        onclick="abrirModalInteracaoCentralAPS('${escaparCentralAPS(p.cpf || "")}', '${escaparCentralAPS(p.cns || "")}')">
                                        Interação
                                    </button>

                                    <button
                                        class="btn-table-action btn-danger"
                                        onclick="abrirDetalhesPendenciasCentralAPS('${escaparCentralAPS(p.cpf || "")}', '${escaparCentralAPS(p.cns || "")}')">
                                        Pendências
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join("")}
            </tbody>
        </table>

        ${
            base.length > 500
                ? `<p style="color:var(--text-muted); margin-top:10px;">
                    Exibindo 500 de ${base.length} registros.
                   </p>`
                : ""
        }
    `;
}

/* ==========================================================
   DETALHES DE PENDÊNCIAS
   ========================================================== */

async function abrirDetalhesPendenciasCentralAPS(cpf, cns) {
    const base =
        await buscarBaseCentralAPSSupabase();

    const paciente =
        base.find(p =>
            String(p.cpf || "") === String(cpf || "") ||
            String(p.cns || "") === String(cns || "")
        );

    if (!paciente) {
        mostrarToast?.("⚠️ Paciente não localizado no Supabase.");
        return;
    }

    const pendencias =
        identificarPendenciasClinicasCentralAPS(paciente);

    if (!pendencias.length) {
        alert(`Paciente ${paciente.nome || ""} sem pendências clínicas identificadas.`);
        return;
    }

    alert(
        `Pendências clínicas — ${paciente.nome || "Paciente"}\n\n` +
        pendencias.map((p, i) => `${i + 1}. ${p}`).join("\n")
    );
}

/* ==========================================================
   INTERAÇÃO / BUSCA ATIVA — GRAVA NO SUPABASE
   ========================================================== */

async function abrirModalInteracaoCentralAPS(cpf, cns) {
    const base =
        await buscarBaseCentralAPSSupabase();

    pacienteInteracaoCentralAPS =
        base.find(p =>
            String(p.cpf || "") === String(cpf || "") ||
            String(p.cns || "") === String(cns || "")
        ) || null;

    if (!pacienteInteracaoCentralAPS) {
        mostrarToast?.("⚠️ Paciente não localizado no Supabase.");
        return;
    }

    const modal =
        document.getElementById("modalInteracaoCentralAPS");

    if (modal) {
        modal.style.display =
            "flex";
    }

    setTextoCentralAPS(
        "interacaoPacienteNome",
        pacienteInteracaoCentralAPS.nome || "-"
    );

    setTextoCentralAPS(
        "interacaoPacienteDocumento",
        `CPF: ${pacienteInteracaoCentralAPS.cpf || "-"} | CNS: ${pacienteInteracaoCentralAPS.cns || "-"}`
    );

    const obs =
        document.getElementById("interacaoObservacao");

    if (obs) {
        const pendencias =
            identificarPendenciasClinicasCentralAPS(pacienteInteracaoCentralAPS);

        obs.value =
            pendencias.length
                ? `Pendências identificadas: ${pendencias.join("; ")}. `
                : "";
    }
}

function fecharModalInteracaoCentralAPS() {
    const modal =
        document.getElementById("modalInteracaoCentralAPS");

    if (modal) {
        modal.style.display =
            "none";
    }

    pacienteInteracaoCentralAPS =
        null;
}

async function salvarInteracaoCentralAPS() {
    if (!pacienteInteracaoCentralAPS) {
        mostrarToast?.("⚠️ Nenhum paciente selecionado.");
        return;
    }

    if (typeof supabaseClient === "undefined") {
        mostrarToast?.("❌ Supabase não carregado.");
        return;
    }

    const usuario =
        window.usuarioLogado || {};

    const pendencias =
        identificarPendenciasClinicasCentralAPS(pacienteInteracaoCentralAPS);

    const observacaoDigitada =
        document.getElementById("interacaoObservacao")?.value || null;

    const payload = {
        paciente_cpf: pacienteInteracaoCentralAPS.cpf || null,
        paciente_cns: pacienteInteracaoCentralAPS.cns || null,
        paciente_nome: pacienteInteracaoCentralAPS.nome || null,

        tipo_contato: document.getElementById("interacaoTipoContato")?.value || "Ligação",
        resultado: document.getElementById("interacaoResultado")?.value || "Atendido",

        observacao:
            observacaoDigitada ||
            (
                pendencias.length
                    ? `Pendências: ${pendencias.join("; ")}`
                    : null
            ),

        equipe: pacienteInteracaoCentralAPS.equipe || null,
        ubs: pacienteInteracaoCentralAPS.ubs || null,

        usuario_id: usuario.id || null,
        usuario_nome: usuario.nome || usuario.email || null,
        usuario_email: usuario.email || null,

        criado_em: new Date().toISOString()
    };

    const { error } =
        await supabaseClient
            .from("interacoes_busca_ativa")
            .insert(payload);

    if (error) {
        console.error("Erro ao salvar interação:", error);
        mostrarToast?.("❌ Erro ao salvar interação. Verifique a tabela interacoes_busca_ativa.");
        return;
    }

    mostrarToast?.("✅ Interação registrada no Supabase.");
    fecharModalInteracaoCentralAPS();

    await aplicarFilaCentralAPS();
}

/* ==========================================================
   WHATSAPP / EXPORTAÇÃO
   ========================================================== */

function abrirWhatsAppCentralAPS(telefone, nome) {
    const numero =
        String(telefone || "").replace(/\D/g, "");

    if (!numero) {
        mostrarToast?.("⚠️ Telefone não informado.");
        return;
    }

    const mensagem =
        encodeURIComponent(
            `Olá, ${nome || ""}. Aqui é da equipe de saúde. Estamos entrando em contato para acompanhamento pela Unidade de Saúde.`
        );

    window.open(
        `https://wa.me/55${numero}?text=${mensagem}`,
        "_blank"
    );
}

async function exportarCentralAPSCSV() {
    const base =
        centralAPSListaRenderizada?.length
            ? centralAPSListaRenderizada
            : await buscarBaseCentralAPSSupabase();

    if (!base.length) {
        mostrarToast?.("⚠️ Nenhum dado para exportar.");
        return;
    }

    const linhas = [
        [
            "nome",
            "cpf",
            "cns",
            "telefone",
            "ubs",
            "equipe",
            "has",
            "dm",
            "gestante",
            "tb",
            "hansen",
            "risco_global",
            "prazo",
            "pendencias"
        ]
    ];

    base.forEach(p => {
        linhas.push([
            p.nome,
            p.cpf,
            p.cns,
            p.telefone,
            p.ubs,
            p.equipe,
            p.has,
            p.dm,
            p.gestante,
            p.tb,
            p.hansen,
            p.risco_global,
            p.prazo,
            identificarPendenciasClinicasCentralAPS(p).join(" | ")
        ]);
    });

    const csv =
        linhas
            .map(linha =>
                linha
                    .map(campo =>
                        `"${String(campo ?? "").replace(/"/g, '""')}"`
                    )
                    .join(";")
            )
            .join("\n");

    const blob =
        new Blob(
            [csv],
            {
                type: "text/csv;charset=utf-8;"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement("a");

    a.href =
        url;

    a.download =
        `central_aps_${new Date().toISOString().slice(0,10)}.csv`;

    a.click();

    URL.revokeObjectURL(url);
}

/* ==========================================================
   HELPERS
   ========================================================== */

function valorSimCentralAPS(valor) {
    const v =
        String(valor || "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

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

function temValorCentralAPS(valor) {
    return (
        valor !== null &&
        valor !== undefined &&
        String(valor).trim() !== ""
    );
}

function obterPrimeiroValorCentralAPS(...valores) {
    for (const valor of valores) {
        if (temValorCentralAPS(valor)) {
            return valor;
        }
    }

    return null;
}

function diasDesdeDataCentralAPS(data) {
    if (!data) return 9999;

    const dataRef =
        new Date(data);

    if (Number.isNaN(dataRef.getTime())) {
        return 9999;
    }

    const hoje =
        new Date();

    return Math.floor(
        (hoje.getTime() - dataRef.getTime()) /
        (1000 * 60 * 60 * 24)
    );
}

function normalizarCentralAPS(valor) {
    return String(valor || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function setTextoCentralAPS(id, valor) {
    const el =
        document.getElementById(id);

    if (el) {
        el.innerText =
            valor;
    }
}

function badgesLinhasCentralAPS(p) {
    const badges = [];

    if (valorSimCentralAPS(p.has)) badges.push(`<span class="status-badge status-danger">HAS</span>`);
    if (valorSimCentralAPS(p.dm)) badges.push(`<span class="status-badge status-success">DM</span>`);
    if (valorSimCentralAPS(p.gestante)) badges.push(`<span class="status-badge status-warning">Gestante</span>`);
    if (valorSimCentralAPS(p.tb)) badges.push(`<span class="status-badge status-info">TB</span>`);
    if (valorSimCentralAPS(p.hansen)) badges.push(`<span class="status-badge status-info">Hanseníase</span>`);

    return badges.length
        ? `<div style="display:flex; gap:6px; flex-wrap:wrap;">${badges.join("")}</div>`
        : `<span style="color:var(--text-muted);">-</span>`;
}

function badgesPendenciasCentralAPS(pendencias) {
    if (!pendencias || !pendencias.length) {
        return `<span style="color:var(--text-muted);">-</span>`;
    }

    return `
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
            ${pendencias.map(item =>
                `<span class="status-badge status-warning">${escaparCentralAPS(item)}</span>`
            ).join("")}
        </div>
    `;
}

function badgeRiscoCentralAPS(p) {
    const risco =
        p.risco_global || "Não informado";

    const r =
        normalizarCentralAPS(risco);

    if (r.includes("alto") || Number(p.risco_pontos || 0) >= 6) {
        return `<span class="status-badge status-danger">${escaparCentralAPS(risco)}</span>`;
    }

    if (r.includes("moderado") || r.includes("medio")) {
        return `<span class="status-badge status-warning">${escaparCentralAPS(risco)}</span>`;
    }

    return `<span class="status-badge status-info">${escaparCentralAPS(risco)}</span>`;
}

function badgePrazoCentralAPS(prazo) {
    if (prazo === null || prazo === undefined || Number.isNaN(Number(prazo))) {
        return `<span style="color:var(--text-muted);">Sem prazo</span>`;
    }

    const dias =
        Number(prazo);

    if (dias === 0) {
        return `<span class="status-badge status-danger">Crítico</span>`;
    }

    if (dias <= 30) {
        return `<span class="status-badge status-warning">${dias} dias</span>`;
    }

    return `<span class="status-badge status-success">${dias} dias</span>`;
}

function escaparCentralAPS(valor) {
    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/* ==========================================================
   GLOBAL
   ========================================================== */

window.carregarCentralAPS = carregarCentralAPS;
window.buscarBaseCentralAPSSupabase = buscarBaseCentralAPSSupabase;
window.aplicarFilaCentralAPS = aplicarFilaCentralAPS;
window.identificarPendenciasClinicasCentralAPS = identificarPendenciasClinicasCentralAPS;
window.abrirDetalhesPendenciasCentralAPS = abrirDetalhesPendenciasCentralAPS;
window.abrirModalInteracaoCentralAPS = abrirModalInteracaoCentralAPS;
window.fecharModalInteracaoCentralAPS = fecharModalInteracaoCentralAPS;
window.salvarInteracaoCentralAPS = salvarInteracaoCentralAPS;
window.abrirWhatsAppCentralAPS = abrirWhatsAppCentralAPS;
window.exportarCentralAPSCSV = exportarCentralAPSCSV;
