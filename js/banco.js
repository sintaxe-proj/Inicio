/* ==========================================================================
   🗂️ BASE TERRITORIAL OPERACIONAL 2.1
   Supabase puro
   pacientes + atendimentos
   Arquivo: js/banco.js
   ========================================================================== */

let baseTerritorialCache = [];

/* ==========================================================================
   CARREGAMENTO PRINCIPAL
   ========================================================================== */

async function carregarTabelaBanco() {
    const container =
        document.getElementById("tabelaBancoContainer");

    if (!container) return;

    if (typeof supabaseClient === "undefined") {
        container.innerHTML = `
            <p style="color:var(--danger);">
                Supabase não carregado.
            </p>
        `;
        return;
    }

    container.innerHTML = `
        <p style="color:var(--text-muted);">
            Carregando dados do Supabase...
        </p>
    `;

    try {
        const { data: pacientes, error: erroPacientes } =
            await supabaseClient
                .from("pacientes")
                .select("*")
                .order("nome", { ascending: true })
                .limit(5000);

        if (erroPacientes) {
            console.error("Erro ao carregar pacientes:", erroPacientes);
            container.innerHTML = `
                <p style="color:var(--danger);">
                    Erro ao carregar pacientes: ${erroPacientes.message || "verifique colunas/permissões no Supabase"}.
                </p>
            `;
            return;
        }

        const { data: atendimentos, error: erroAtendimentos } =
            await supabaseClient
                .from("atendimentos")
                .select("*")
                .order("data_atendimento", { ascending: false, nullsFirst: false })
                .limit(10000);

        if (erroAtendimentos) {
            console.error("Erro ao carregar atendimentos:", erroAtendimentos);
            container.innerHTML = `
                <p style="color:var(--danger);">
                    Erro ao carregar atendimentos: ${erroAtendimentos.message || "verifique colunas/permissões no Supabase"}.
                </p>
            `;
            return;
        }

        const territorio =
            await carregarTerritorioInteligenteBaseTerritorial();

        baseTerritorialCache =
            consolidarBaseTerritorial(
                pacientes || [],
                atendimentos || []
            );

        enriquecerBaseTerritorialComOperacaoAPS(
            baseTerritorialCache,
            territorio || []
        );

        carregarFiltrosBaseTerritorial(baseTerritorialCache);
        aplicarFiltrosBaseTerritorial();

    } catch (erro) {
        console.error("Erro geral Base Territorial:", erro);

        container.innerHTML = `
            <p style="color:var(--danger);">
                Falha ao carregar Base Territorial.
            </p>
        `;
    }
}


async function carregarTerritorioInteligenteBaseTerritorial() {
    if (typeof supabaseClient === "undefined") {
        return [];
    }

    try {
        const { data, error } =
            await supabaseClient
                .from("territorio_inteligente")
                .select("*")
                .limit(50000);

        if (error) {
            console.warn("Base Territorial: territorio_inteligente indisponível.", error.message || error);
            return [];
        }

        return data || [];

    } catch (erro) {
        console.warn("Base Territorial: erro opcional ao carregar Território Inteligente.", erro);
        return [];
    }
}

function enriquecerBaseTerritorialComOperacaoAPS(base, territorio) {
    const mapa =
        new Map();

    (territorio || []).forEach(t => {
        const chave =
            limparDocumentoBase(t.cpf || "") ||
            limparDocumentoBase(t.paciente_cpf || "") ||
            String(t.cns || "").trim();

        if (chave) {
            mapa.set(chave, t);
        }
    });

    (base || []).forEach(p => {
        const chave =
            limparDocumentoBase(p.cpf || "") ||
            String(p.cns || "").trim();

        const ti =
            mapa.get(chave);

        p.score_territorial_global =
            Number(
                ti?.score_territorial_global ??
                ti?.score_geral ??
                p.score_territorial_global ??
                0
            );

        p.nivel_prioridade =
            ti?.nivel_prioridade ||
            ti?.prioridade ||
            classificarPrioridadeBaseTerritorial(p.score_territorial_global);

        p.evfam_total =
            Number(ti?.evfam_total || 0);

        p.evfam_classificacao =
            ti?.evfam_classificacao || "";

        p.score_clinico =
            Number(ti?.score_clinico || 0);

        p.score_social =
            Number(ti?.score_social || 0);

        p.score_assistencial =
            Number(ti?.score_assistencial || 0);

        p.score_domiciliar =
            Number(ti?.score_domiciliar || 0);

        p.acao_recomendada =
            ti?.acao_recomendada ||
            ti?.recomendacao_ia ||
            definirAcaoRecomendadaBaseTerritorial(p);

        p.visita_domiciliar_indicada =
            ti?.visita_domiciliar_indicada ||
            false;

        p.tipo_visita_sugerida =
            ti?.tipo_visita_sugerida || "";

        p.pendencias =
            Array.isArray(ti?.pendencias)
                ? ti.pendencias
                : identificarPendenciasBaseTerritorial(p);
    });
}

function classificarPrioridadeBaseTerritorial(score) {
    const s =
        Number(score || 0);

    if (s >= 85) return "CRITICO";
    if (s >= 65) return "ALTO";
    if (s >= 40) return "MODERADO";
    return "BAIXO";
}

function definirAcaoRecomendadaBaseTerritorial(p) {
    if (Number(p.score_territorial_global || 0) >= 85) {
        return "Priorizar avaliação da equipe e possível visita domiciliar.";
    }

    if (Number(p.prazo) === 0) {
        return "Realizar busca ativa por retorno vencido.";
    }

    if ((p.pendencias || []).length) {
        return "Revisar pendências clínicas e programar contato.";
    }

    return "Manter acompanhamento conforme rotina da equipe.";
}

function identificarPendenciasBaseTerritorial(p) {
    const pendencias = [];

    if (valorSimBase(p.has) && (!temValorBase(p.hasPAS) || !temValorBase(p.hasPAD))) {
        pendencias.push("HAS sem PA");
    }

    if (valorSimBase(p.dm) && !temValorBase(p.dmHbA1c)) {
        pendencias.push("DM sem HbA1c");
    }

    if (valorSimBase(p.gestante) && diasDesdeBase(p.ultimo_atendimento) > 30) {
        pendencias.push("Gestante sem consulta recente");
    }

    if (valorSimBase(p.tb) && diasDesdeBase(p.ultimo_atendimento) > 30) {
        pendencias.push("TB sem acompanhamento recente");
    }

    if (valorSimBase(p.hansen) && diasDesdeBase(p.ultimo_atendimento) > 60) {
        pendencias.push("Hanseníase sem avaliação recente");
    }

    if (Number(p.prazo) === 0) {
        pendencias.push("Retorno vencido");
    }

    if (diasDesdeBase(p.ultimo_atendimento) > 180) {
        pendencias.push("Sem atendimento >180 dias");
    }

    return [...new Set(pendencias)];
}

function temValorBase(valor) {
    return (
        valor !== null &&
        valor !== undefined &&
        String(valor).trim() !== ""
    );
}

function primeiroValorBase(...valores) {
    for (const valor of valores) {
        if (temValorBase(valor)) {
            return valor;
        }
    }

    return null;
}

function diasDesdeBase(data) {
    if (!data) return 9999;

    const d =
        new Date(data);

    if (Number.isNaN(d.getTime())) {
        return 9999;
    }

    return Math.floor(
        (Date.now() - d.getTime()) /
        (1000 * 60 * 60 * 24)
    );
}


/* ==========================================================================
   CONSOLIDAÇÃO
   ========================================================================== */

function consolidarBaseTerritorial(pacientes, atendimentos) {
    const mapa = new Map();

    pacientes.forEach(p => {
        const chave =
            limparDocumentoBase(p.cpf || "") ||
            String(p.cns || "").trim() ||
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
            numero: p.numero || "",
            complemento: p.complemento || "",
            ubs: p.ubs_vinculacao || p.unidade || p.ubs || "Não informado",
            equipe: p.equipe_esf || p.equipe || "Não informado",

            has: "Não",
            dm: "Não",
            gestante: "Não",
            tb: "Não",
            hansen: "Não",

            risco_global: "Não informado",
            risco_pontos: 0,
            prazo: null,

            ciap: "",
            ultimo_atendimento: null,
            hasPAS: null,
            hasPAD: null,
            dmHbA1c: null,
            score_territorial_global: 0,
            nivel_prioridade: "BAIXO",
            evfam_total: 0,
            evfam_classificacao: "",
            pendencias: [],
            acao_recomendada: ""
        });
    });

    atendimentos.forEach(a => {
        const chave =
            limparDocumentoBase(a.paciente_cpf || a.cpf || "") ||
            String(a.cns || "").trim();

        if (!chave) return;

        const atual =
            mapa.get(chave) || {
                id: "",
                nome: a.nome_paciente || "",
                cpf: a.paciente_cpf || a.cpf || "",
                cns: a.cns || "",
                telefone: "",
                cep: "",
                endereco: "",
                numero: "",
                complemento: "",
                ubs: a.ubs_vinculacao || a.unidade || a.ubs || "Não informado",
                equipe: a.equipe_esf || a.equipe || "Não informado",

                has: "Não",
                dm: "Não",
                gestante: "Não",
                tb: "Não",
                hansen: "Não",

                risco_global: "Não informado",
                risco_pontos: 0,
                prazo: null,

                ciap: "",
                ultimo_atendimento: null,
                hasPAS: null,
                hasPAD: null,
                dmHbA1c: null,
                score_territorial_global: 0,
                nivel_prioridade: "BAIXO",
                evfam_total: 0,
                evfam_classificacao: "",
                pendencias: [],
                acao_recomendada: ""
            };

        if (!atual.nome && a.nome_paciente) {
            atual.nome = a.nome_paciente;
        }

        if (valorSimBase(a.has)) atual.has = "Sim";
        if (valorSimBase(a.dm)) atual.dm = "Sim";
        if (valorSimBase(a.gestante)) atual.gestante = "Sim";
        if (valorSimBase(a.tb)) atual.tb = "Sim";
        if (valorSimBase(a.hansen)) atual.hansen = "Sim";

        if (a.risco_global) {
            atual.risco_global = a.risco_global;
        }

        if (a.risco_pontos !== null && a.risco_pontos !== undefined) {
            atual.risco_pontos = a.risco_pontos;
        }

        const prazo =
            a.reavaliacaoDias ??
            a.retorno_dias ??
            atual.prazo;

        atual.prazo =
            prazo !== null && prazo !== undefined
                ? Number(prazo)
                : atual.prazo;

        atual.ciap =
            a.inputBuscaCIAPS ||
            a.ciap ||
            atual.ciap ||
            "";

        atual.ultimo_atendimento =
            a.data_atendimento ||
            a.criado_em ||
            atual.ultimo_atendimento;

        atual.hasPAS =
            primeiroValorBase(a.hasPAS, a.has_pas, a.objPAS, a.obj_pas, atual.hasPAS);

        atual.hasPAD =
            primeiroValorBase(a.hasPAD, a.has_pad, a.objPAD, a.obj_pad, atual.hasPAD);

        atual.dmHbA1c =
            primeiroValorBase(a.dmHbA1c, a.dm_hba1c, a.hba1c, atual.dmHbA1c);

        if (a.ubs_vinculacao || a.unidade || a.ubs) atual.ubs = a.ubs_vinculacao || a.unidade || a.ubs;
        if (a.equipe_esf || a.equipe) atual.equipe = a.equipe_esf || a.equipe;

        mapa.set(chave, atual);
    });

    return Array.from(mapa.values());
}


function limparDocumentoBase(valor) {
    return String(valor || "")
        .replace(/\D/g, "");
}

function valorSimBase(valor) {
    const v = String(valor || "")
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

/* ==========================================================================
   FILTROS
   ========================================================================== */

function carregarFiltrosBaseTerritorial(base) {
    carregarSelectBase(
        "filtroEquipeBase",
        base.map(p => p.equipe || "Não informado"),
        "Todas as equipes"
    );

    carregarSelectBase(
        "filtroUBSBase",
        base.map(p => p.ubs || "Não informado"),
        "Todas as UBS"
    );
}

function carregarSelectBase(id, valores, rotuloTodos) {
    const select =
        document.getElementById(id);

    if (!select) return;

    const valorAtual =
        select.value || "TODOS";

    const unicos =
        [...new Set(valores.filter(Boolean))]
            .sort();

    select.innerHTML =
        `<option value="TODOS">${rotuloTodos}</option>`;

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
        select.value = valorAtual;
    }
}

function aplicarFiltrosBaseTerritorial() {
    const termo =
        document.getElementById("buscaBaseTerritorial")?.value?.trim() || "";

    const equipe =
        document.getElementById("filtroEquipeBase")?.value || "TODOS";

    const ubs =
        document.getElementById("filtroUBSBase")?.value || "TODOS";

    const linha =
        document.getElementById("filtroLinhaCuidadoBase")?.value || "TODAS";

    const risco =
        document.getElementById("filtroRiscoBase")?.value || "TODOS";

    const filaOperacional =
        document.getElementById("filtroFilaOperacionalAPS")?.value || "TODOS";

    const filtroEVFAM =
        document.getElementById("filtroPontuacaoEVFAMBase")?.value || "TODOS";

    const termoNormalizado =
        normalizarTextoBase(termo);

    let base =
        [...baseTerritorialCache];

    if (termoNormalizado) {
        base =
            base.filter(p => {
                const alvo =
                    normalizarTextoBase(`
                        ${p.nome}
                        ${p.cpf}
                        ${p.cns}
                        ${p.telefone}
                        ${p.ubs}
                        ${p.equipe}
                        ${p.ciap}
                    `);

                return alvo.includes(termoNormalizado);
            });
    }

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

    if (linha !== "TODAS") {
        base =
            base.filter(p => {
                if (linha === "HAS") return valorSimBase(p.has);
                if (linha === "DM") return valorSimBase(p.dm);
                if (linha === "GESTANTE") return valorSimBase(p.gestante);
                if (linha === "TB") return valorSimBase(p.tb);
                if (linha === "HANSEN") return valorSimBase(p.hansen);
                return true;
            });
    }

    if (risco !== "TODOS") {
        if (risco === "CRITICO") {
            base =
                base.filter(p => Number(p.prazo) === 0);
        }

        if (risco === "SEM_PRAZO") {
            base =
                base.filter(p =>
                    p.prazo === null ||
                    p.prazo === undefined ||
                    Number.isNaN(Number(p.prazo))
                );
        }

        if (risco === "ALTO") {
            base =
                base.filter(p =>
                    normalizarTextoBase(p.risco_global).includes("alto") ||
                    Number(p.risco_pontos || 0) >= 6
                );
        }
    }

    base =
        filtrarFilaOperacionalAPS(
            base,
            filaOperacional
        );

    base =
        filtrarPontuacaoEVFAMBaseTerritorial(
            base,
            filtroEVFAM
        );

    atualizarIndicadoresBaseTerritorial(base);
    renderizarTabelaBaseTerritorial(base);
}

function normalizarTextoBase(valor) {
    return String(valor || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}


function filtrarFilaOperacionalAPS(base, fila) {
    if (fila === "TODOS") {
        return base;
    }

    if (fila === "CRITICOS") {
        return base.filter(p =>
            Number(p.score_territorial_global || 0) >= 85 ||
            String(p.nivel_prioridade || "").toUpperCase().includes("CRIT") ||
            Number(p.prazo) === 0
        );
    }

    if (fila === "ALTO") {
        return base.filter(p => {
            const score =
                Number(p.score_territorial_global || 0);

            return (
                score >= 65 ||
                String(p.nivel_prioridade || "").toUpperCase().includes("ALTO") ||
                normalizarTextoBase(p.risco_global).includes("alto") ||
                Number(p.risco_pontos || 0) >= 6
            );
        });
    }

    if (fila === "MODERADO") {
        return base.filter(p => {
            const score =
                Number(p.score_territorial_global || 0);

            return score >= 40 && score < 65;
        });
    }

    if (fila === "BUSCA_ATIVA") {
        return base.filter(p =>
            Number(p.prazo) === 0 ||
            (p.pendencias?.length || 0) > 0 ||
            normalizarTextoBase(p.acao_recomendada).includes("busca") ||
            normalizarTextoBase(p.acao_recomendada).includes("contato")
        );
    }

    if (fila === "VISITA") {
        return base.filter(p =>
            p.visita_domiciliar_indicada === true ||
            normalizarTextoBase(p.tipo_visita_sugerida).includes("visita") ||
            normalizarTextoBase(p.acao_recomendada).includes("visita") ||
            Number(p.score_domiciliar || 0) > 0
        );
    }

    if (fila === "HAS_SEM_PA") {
        return base.filter(p =>
            valorSimBase(p.has) &&
            (
                !temValorBase(p.hasPAS) ||
                !temValorBase(p.hasPAD)
            )
        );
    }

    if (fila === "DM_SEM_HBA1C") {
        return base.filter(p =>
            valorSimBase(p.dm) &&
            !temValorBase(p.dmHbA1c)
        );
    }

    if (fila === "GESTANTES") {
        return base.filter(p =>
            valorSimBase(p.gestante)
        );
    }

    if (fila === "RETORNO_VENCIDO") {
        return base.filter(p =>
            Number(p.prazo) === 0
        );
    }

    if (fila === "EVFAM_ALTO") {
        return base.filter(p =>
            Number(p.evfam_total || 0) >= 15 ||
            normalizarTextoBase(p.evfam_classificacao).includes("alto")
        );
    }

    if (fila === "ACAMADOS") {
        return base.filter(p =>
            p.acamado === true ||
            valorSimBase(p.acamado) ||
            normalizarTextoBase(p.acao_recomendada).includes("acam")
        );
    }

    if (fila === "DOMICILIADOS") {
        return base.filter(p =>
            p.domiciliado === true ||
            valorSimBase(p.domiciliado) ||
            normalizarTextoBase(p.tipo_visita_sugerida).includes("domic") ||
            normalizarTextoBase(p.acao_recomendada).includes("domic")
        );
    }

    if (fila === "PENDENCIAS") {
        return base.filter(p =>
            (p.pendencias?.length || 0) > 0
        );
    }

    return base;
}



function filtrarPontuacaoEVFAMBaseTerritorial(base, filtro) {
    if (filtro === "TODOS") {
        return base;
    }

    return (base || []).filter(p => {
        const evfam =
            Number(p.evfam_total || 0);

        const classificacao =
            normalizarTextoBase(p.evfam_classificacao || "");

        if (filtro === "SEM_EVFAM") {
            return !evfam;
        }

        if (filtro === "EVFAM_BAIXO") {
            return (
                (evfam >= 1 && evfam <= 7) ||
                classificacao.includes("baixo")
            );
        }

        if (filtro === "EVFAM_MODERADO") {
            return (
                (evfam >= 8 && evfam <= 14) ||
                classificacao.includes("moderado")
            );
        }

        if (filtro === "EVFAM_ALTO") {
            return (
                evfam >= 15 ||
                classificacao.includes("alto")
            );
        }

        return true;
    });
}


/* ==========================================================================
   INDICADORES
   ========================================================================== */

function atualizarIndicadoresBaseTerritorial(base) {
    setTextoBase("baseTotalPacientes", base.length);
    setTextoBase("baseHAS", base.filter(p => valorSimBase(p.has)).length);
    setTextoBase("baseDM", base.filter(p => valorSimBase(p.dm)).length);
    setTextoBase("baseGestantes", base.filter(p => valorSimBase(p.gestante)).length);
    setTextoBase("baseTB", base.filter(p => valorSimBase(p.tb)).length);
    setTextoBase("baseHansen", base.filter(p => valorSimBase(p.hansen)).length);
    setTextoBase("baseCriticos", base.filter(p => Number(p.prazo) === 0).length);
}

function setTextoBase(id, valor) {
    const el =
        document.getElementById(id);

    if (el) {
        el.innerText =
            valor;
    }
}

/* ==========================================================================
   TABELA
   ========================================================================== */

function renderizarTabelaBaseTerritorial(base) {
    const container =
        document.getElementById("tabelaBancoContainer");

    if (!container) return;

    if (!base.length) {
        container.innerHTML = `
            <p style="color:var(--text-muted);">
                Nenhum cidadão encontrado com os filtros selecionados.
            </p>
        `;
        return;
    }

    const registros =
        base.slice(0, 1000);

    container.innerHTML = `
        <table class="table-sintaxe">
            <thead>
                <tr>
                    <th>Cidadão</th>
                    <th>CPF / CNS</th>
                    <th>Equipe</th>
                    <th>Linhas / EVFAM</th>
                    <th>Prioridade</th>
                    <th>Pendências</th>
                    <th>Ação recomendada</th>
                    <th>Último atendimento</th>
                    <th>Ações</th>
                </tr>
            </thead>

            <tbody>
                ${registros.map(p => `
                    <tr>
                        <td>
                            <strong>${escaparBase(p.nome || "Sem nome")}</strong>
                            <small>${escaparBase(p.telefone || "-")}</small>
                        </td>

                        <td>
                            ${escaparBase(p.cpf || "-")}
                            <small>CNS: ${escaparBase(p.cns || "-")}</small>
                        </td>

                        <td>
                            ${escaparBase(p.equipe || "-")}
                            <small>${escaparBase(p.ubs || "-")}</small>
                        </td>

                        <td>
                            ${renderizarBadgesLinhasBase(p)}
                            ${renderizarEVFAMBase(p)}
                        </td>

                        <td>
                            ${renderizarPrioridadeOperacionalBase(p)}
                            <small>Score: ${Number(p.score_territorial_global || 0)}</small>
                        </td>

                        <td>
                            ${renderizarPendenciasBase(p)}
                        </td>

                        <td>
                            <small>${escaparBase(p.acao_recomendada || definirAcaoRecomendadaBaseTerritorial(p))}</small>
                        </td>

                        <td>
                            ${formatarDataBase(p.ultimo_atendimento)}
                            <small>${renderizarPrazoBase(p.prazo)}</small>
                        </td>

                        <td>
                            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                <button
                                    class="btn-table-action btn-edit"
                                    onclick="abrirAtendimentoExistente('${escaparBase(p.cpf || "")}', '${escaparBase(p.cns || "")}')">
                                    📋 Prontuário
                                </button>

                                <button
                                    class="btn-table-action btn-warn"
                                    onclick="abrirModuloVisitaDomiciliarAPS?.('${escaparBase(p.cpf || "")}', '${escaparBase(p.cns || "")}', 'ACS')">
                                    🏠 Visita
                                </button>

                                <button
                                    class="btn-table-action btn-info"
                                    onclick="abrirFallbackTentativaLigacaoBase('${escaparBase(p.cpf || "")}', '${escaparBase(p.cns || "")}', '${escaparBase(p.nome || "")}', '${escaparBase(p.telefone || "")}')">
                                    📞 Tentativa
                                </button>

                                <button
                                    class="btn-table-action btn-ok"
                                    onclick="abrirBaseTerritorialOperacionalApp?.('PENDENCIAS') || aplicarFiltrosBaseTerritorial()">
                                    🧭 Pendências
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>

        ${
            base.length > registros.length
                ? `<p style="color:var(--text-muted); margin-top:10px;">
                    Exibindo ${registros.length} de ${base.length} registros filtrados.
                   </p>`
                : ""
        }
    `;

    console.log(
        `✅ Base Territorial 2.0 carregada: ${base.length} registros filtrados`
    );
}

function renderizarBadgesLinhasBase(p) {
    const badges = [];

    if (valorSimBase(p.has)) {
        badges.push(`<span class="status-badge status-danger">HAS</span>`);
    }

    if (valorSimBase(p.dm)) {
        badges.push(`<span class="status-badge status-success">DM</span>`);
    }

    if (valorSimBase(p.gestante)) {
        badges.push(`<span class="status-badge status-warning">Gestante</span>`);
    }

    if (valorSimBase(p.tb)) {
        badges.push(`<span class="status-badge status-info">TB</span>`);
    }

    if (valorSimBase(p.hansen)) {
        badges.push(`<span class="status-badge status-info">Hanseníase</span>`);
    }

    return badges.length
        ? `<div style="display:flex; gap:6px; flex-wrap:wrap;">${badges.join("")}</div>`
        : `<span style="color:var(--text-muted);">-</span>`;
}


function renderizarEVFAMBase(p) {
    const evfam =
        Number(p.evfam_total || 0);

    if (!evfam) {
        return `<small style="color:var(--text-muted);">EVFAM: -</small>`;
    }

    const classe =
        evfam >= 15
            ? "status-danger"
            : evfam >= 8
                ? "status-warning"
                : "status-info";

    return `
        <div style="margin-top:6px;">
            <span class="status-badge ${classe}">
                EVFAM ${evfam}
            </span>
            ${
                p.evfam_classificacao
                    ? `<small>${escaparBase(p.evfam_classificacao)}</small>`
                    : ""
            }
        </div>
    `;
}

function renderizarPrioridadeOperacionalBase(p) {
    const nivel =
        String(p.nivel_prioridade || classificarPrioridadeBaseTerritorial(p.score_territorial_global))
            .toUpperCase();

    if (nivel.includes("CRIT")) {
        return `<span class="status-badge status-danger">🔴 CRÍTICO</span>`;
    }

    if (nivel.includes("ALTO") || nivel.includes("ALTA")) {
        return `<span class="status-badge status-warning">🟠 ALTO</span>`;
    }

    if (nivel.includes("MOD")) {
        return `<span class="status-badge status-info">🟡 MODERADO</span>`;
    }

    return `<span class="status-badge status-success">🟢 BAIXO</span>`;
}

function renderizarPendenciasBase(p) {
    const pendencias =
        p.pendencias?.length
            ? p.pendencias
            : identificarPendenciasBaseTerritorial(p);

    if (!pendencias.length) {
        return `<span style="color:var(--text-muted);">-</span>`;
    }

    return pendencias
        .slice(0, 4)
        .map(item =>
            `<span class="status-badge status-warning">${escaparBase(item)}</span>`
        )
        .join(" ");
}


function renderizarBadgeRiscoBase(p) {
    const risco =
        p.risco_global || "Não informado";

    const r =
        normalizarTextoBase(risco);

    if (r.includes("alto") || Number(p.risco_pontos || 0) >= 6) {
        return `<span class="status-badge status-danger">${escaparBase(risco)}</span>`;
    }

    if (r.includes("moderado") || r.includes("medio")) {
        return `<span class="status-badge status-warning">${escaparBase(risco)}</span>`;
    }

    if (r.includes("baixo")) {
        return `<span class="status-badge status-success">${escaparBase(risco)}</span>`;
    }

    return `<span class="status-badge status-info">${escaparBase(risco)}</span>`;
}

function renderizarPrazoBase(prazo) {
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

/* ==========================================================================
   EXPORTAR CSV
   ========================================================================== */

function exportarBaseTerritorialCSV() {
    const base =
        baseTerritorialCache || [];

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
            "score_territorial_global",
            "nivel_prioridade",
            "evfam_total",
            "evfam_classificacao",
            "pendencias",
            "acao_recomendada",
            "prazo",
            "ultimo_atendimento"
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
            p.score_territorial_global || 0,
            p.nivel_prioridade || "",
            p.evfam_total || 0,
            p.evfam_classificacao || "",
            (p.pendencias || []).join(" | "),
            p.acao_recomendada || "",
            p.prazo,
            p.ultimo_atendimento
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
        `base_territorial_${new Date().toISOString().slice(0,10)}.csv`;

    a.click();

    URL.revokeObjectURL(url);
}


async function abrirFallbackTentativaLigacaoBase(cpf, cns, nome, telefone) {
    const resultado =
        prompt(
            `Registrar tentativa de ligação para ${nome || "paciente"} (${telefone || "sem telefone"}):\n\nDigite:\n1 = Sucesso\n2 = Sem sucesso\n3 = Não atende\n4 = Telefone incorreto\n5 = Reagendado`,
            "1"
        );

    if (resultado === null) return;

    const mapaResultado = {
        "1": "SUCESSO",
        "2": "SEM_SUCESSO",
        "3": "NAO_ATENDE",
        "4": "TELEFONE_INCORRETO",
        "5": "REAGENDADO"
    };

    const status =
        mapaResultado[String(resultado).trim()] ||
        String(resultado || "TENTATIVA").toUpperCase();

    const observacao =
        prompt("Observação da tentativa:", "") || "";

    if (typeof supabaseClient === "undefined") {
        mostrarToast?.("Supabase não carregado para registrar tentativa.");
        return;
    }

    const payloadCompleto = {
        paciente_cpf: limparDocumentoBase(cpf || ""),
        paciente_cns: cns || "",
        paciente_nome: nome || "",
        telefone: telefone || "",
        tipo_contato: "TELEFONE",
        resultado: status,
        observacao,
        origem: "base_territorial",
        criado_em: new Date().toISOString()
    };

    try {
        let { error } =
            await supabaseClient
                .from("interacoes_busca_ativa")
                .insert(payloadCompleto);

        if (error) {
            console.warn("Tentativa completa falhou. Tentando payload mínimo.", error.message || error);

            const minimo = {
                paciente_cpf: limparDocumentoBase(cpf || ""),
                resultado: status,
                observacao
            };

            const retry =
                await supabaseClient
                    .from("interacoes_busca_ativa")
                    .insert(minimo);

            error =
                retry.error;
        }

        if (error) {
            console.error("Erro ao registrar tentativa:", error);
            mostrarToast?.(`⚠️ Não foi possível registrar tentativa: ${error.message || "verifique colunas da tabela"}`);
            return;
        }

        mostrarToast?.(`📞 Tentativa registrada: ${status}`);

        if (typeof carregarTabelaBanco === "function") {
            carregarTabelaBanco();
        }

    } catch (erro) {
        console.error("Erro geral ao registrar tentativa:", erro);
        mostrarToast?.("Erro ao registrar tentativa de ligação.");
    }
}


/* ==========================================================================
   HELPERS
   ========================================================================== */

function limparBuscaBaseTerritorial() {
    const campo =
        document.getElementById("buscaBaseTerritorial");

    if (campo) {
        campo.value = "";
    }

    aplicarFiltrosBaseTerritorial();
}

function formatarDataBase(valor) {
    if (!valor) return "-";

    try {
        return new Date(valor).toLocaleDateString("pt-BR");
    } catch {
        return "-";
    }
}

function escaparBase(valor) {
    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/* ==========================================================================
   START
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    const busca =
        document.getElementById("buscaBaseTerritorial");

    if (busca) {
        busca.addEventListener("keyup", () => {
            clearTimeout(window.timerBuscaBase);

            window.timerBuscaBase =
                setTimeout(
                    aplicarFiltrosBaseTerritorial,
                    250
                );
        });
    }
});

/* ==========================================================================
   GLOBAL
   ========================================================================== */

window.carregarTabelaBanco = carregarTabelaBanco;
window.limparBuscaBaseTerritorial = limparBuscaBaseTerritorial;
window.aplicarFiltrosBaseTerritorial = aplicarFiltrosBaseTerritorial;
window.filtrarFilaOperacionalAPS = filtrarFilaOperacionalAPS;
window.filtrarPontuacaoEVFAMBaseTerritorial = filtrarPontuacaoEVFAMBaseTerritorial;
window.carregarFiltrosBaseTerritorial = carregarFiltrosBaseTerritorial;
window.exportarBaseTerritorialCSV = exportarBaseTerritorialCSV;
window.abrirFallbackTentativaLigacaoBase = abrirFallbackTentativaLigacaoBase;

window.baseTerritorialCache = baseTerritorialCache;
