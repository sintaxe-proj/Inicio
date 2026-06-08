/* ==========================================================================
   🔍 BUSCA ATIVA E ABERTURA DE PRONTUÁRIO — SUPABASE PURO
   Sem IndexedDB
   ========================================================================== */

/* ==========================================================================
   HELPERS
   ========================================================================== */

function escaparTexto(valor) {
    return String(valor || "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, "&quot;");
}

function normalizarTexto(valor) {
    return String(valor || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function somenteNumeros(valor) {
    return String(valor || "").replace(/\D/g, "");
}

function valorSim(valor) {
    const v = normalizarTexto(valor);

    return (
        valor === true ||
        valor === 1 ||
        v === "sim" ||
        v === "s" ||
        v === "true" ||
        v === "1" ||
        v === "ativo" ||
        v === "positiva" ||
        v === "positivo" ||
        v === "presente"
    );
}

function pegarCPF(p) {
    return (
        p?.paciente_cpf ||
        p?.cpf ||
        ""
    );
}

function pegarCNS(p) {
    return (
        p?.paciente_cns ||
        p?.cns ||
        ""
    );
}

function pegarNome(p) {
    return (
        p?.nome ||
        p?.nome_paciente ||
        "Sem nome"
    );
}

function pegarUBS(p) {
    return (
        p?.ubs_vinculacao ||
        p?.ubs ||
        p?.unidade ||
        "Não vinculada"
    );
}

function pegarEquipe(p) {
    return (
        p?.equipe_esf ||
        p?.equipe ||
        "Sem equipe"
    );
}

function campoLinhaSim(p, nomes) {
    return nomes.some(nome => valorSim(p?.[nome]));
}

/* ==========================================================================
   BUSCA NA TELA INICIAL — SUPABASE
   ========================================================================== */

async function buscarInicio() {
    const inputBusca =
        document.getElementById("buscaNomeInicio");

    const container =
        document.getElementById("resultadoInicio");

    if (!inputBusca) {
        console.error("Erro: elemento buscaNomeInicio não encontrado.");
        return;
    }

    if (!container) return;

    const termoOriginal =
        inputBusca.value.trim();

    const termoBusca =
        normalizarTexto(termoOriginal);

    const termoNumerico =
        somenteNumeros(termoOriginal);

    if (!termoBusca) {
        container.innerHTML =
            `<em style="color:#94a3b8;">Introduza um critério acima para pesquisar.</em>`;
        return;
    }

    if (typeof supabaseClient === "undefined") {
        container.innerHTML =
            `<p style="color:var(--danger);">⚠️ Supabase não conectado.</p>`;
        return;
    }

    container.innerHTML =
        `<p style="color:var(--text-muted);">🔎 Buscando no Supabase...</p>`;

    try {
        const desejaCritico =
            termoBusca.includes("critico") ||
            termoBusca.includes("crítico") ||
            termoBusca.includes("urgente") ||
            termoBusca.includes("vencido");

        const desejaControlado =
            termoBusca.includes("controlado") ||
            termoBusca.includes("monitorado");

        const desejaHAS =
            termoBusca.includes("has") ||
            termoBusca.includes("hipertens");

        const desejaDM =
            termoBusca.includes("dm") ||
            termoBusca.includes("diabet");

        const desejaPN =
            termoBusca.includes("pn") ||
            termoBusca.includes("gestant") ||
            termoBusca.includes("natal") ||
            termoBusca.includes("pre natal") ||
            termoBusca.includes("prenatal");

        const desejaTB =
            termoBusca.includes("tb") ||
            termoBusca.includes("tuberculose");

        const desejaHansen =
            termoBusca.includes("hansen") ||
            termoBusca.includes("hanseniase") ||
            termoBusca.includes("hanseníase");

        const usouFiltros =
            desejaHAS ||
            desejaDM ||
            desejaPN ||
            desejaTB ||
            desejaHansen ||
            desejaCritico ||
            desejaControlado;

        let atendQuery = supabaseClient
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
                soapSubjetivo,
                soapObjetivoAlterado,
                inputBuscaCIAPS,
                soapPlanoConduta,
                subjetivo,
                objetivo,
                avaliacao,
                plano,
                criado_em,
                data_atendimento
            `)
            .order("criado_em", { ascending: false })
            .limit(500);

        if (desejaHAS) {
            atendQuery = atendQuery.eq("has", "Sim");
        }

        if (desejaDM) {
            atendQuery = atendQuery.eq("dm", "Sim");
        }

        if (desejaPN) {
            atendQuery = atendQuery.eq("gestante", "Sim");
        }

        if (desejaTB) {
            atendQuery = atendQuery.eq("tb", "Sim");
        }

        if (desejaHansen) {
            atendQuery = atendQuery.eq("hansen", "Sim");
        }

        if (desejaCritico) {
            atendQuery = atendQuery.eq("reavaliacaoDias", 0);
        }

        if (desejaControlado) {
            atendQuery = atendQuery.gt("reavaliacaoDias", 0);
        }

        const { data: atendimentos, error: erroAtendimentos } =
            await atendQuery;

        if (erroAtendimentos) {
            console.error("Erro ao buscar atendimentos:", erroAtendimentos);
            container.innerHTML =
                `<p style="color:var(--danger); font-weight:600;">⚠️ Erro ao buscar atendimentos.</p>`;
            return;
        }

        let pacientesBase = [];

        if (!usouFiltros) {
            let pacQuery = supabaseClient
                .from("pacientes")
                .select(`
                    id,
                    nome,
                    cpf,
                    cns,
                    telefone,
                    endereco,
                    cep,
                    numero,
                    complemento,
                    ubs,
                    equipe,
                    ubs_vinculacao,
                    equipe_esf
                `)
                .limit(100);

            if (termoNumerico) {
                pacQuery = pacQuery.or(
                    `cpf.ilike.%${termoNumerico}%,cns.ilike.%${termoNumerico}%`
                );
            } else {
                pacQuery = pacQuery.ilike(
                    "nome",
                    `%${termoOriginal}%`
                );
            }

            const { data: pacientes, error: erroPacientes } =
                await pacQuery;

            if (erroPacientes) {
                console.error("Erro ao buscar pacientes:", erroPacientes);
            } else {
                pacientesBase = pacientes || [];
            }
        }

        const lista =
            await montarListaBuscaSupabase(
                pacientesBase,
                atendimentos || [],
                {
                    termoBusca,
                    termoNumerico,
                    usouFiltros
                }
            );

        renderizarResultadosBusca(lista, container);

    } catch (erro) {
        console.error("Erro geral na busca Supabase:", erro);

        container.innerHTML =
            `<p style="color:var(--danger); font-weight:600;">⚠️ Erro ao executar busca.</p>`;
    }
}

/* ==========================================================================
   UNIR PACIENTES + ÚLTIMO ATENDIMENTO
   ========================================================================== */

async function montarListaBuscaSupabase(pacientesBase, atendimentos, contexto) {
    const mapa = new Map();

    pacientesBase.forEach(p => {
        const chave =
            p.cpf ||
            p.cns ||
            p.id;

        if (!chave) return;

        mapa.set(chave, {
            ...p,
            origem: "pacientes"
        });
    });

    atendimentos.forEach(a => {
        const cpf =
            a.paciente_cpf ||
            a.cpf ||
            "";

        const chave =
            cpf ||
            a.cns ||
            a.id;

        if (!chave) return;

        if (!mapa.has(chave)) {
            mapa.set(chave, {
                cpf,
                cns: a.cns,
                nome: a.nome_paciente,
                origem: "atendimentos"
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

    const cpfsParaEnriquecer =
        [...new Set(
            Array.from(mapa.values())
                .map(p => p.paciente_cpf || p.cpf)
                .filter(Boolean)
        )];

    if (cpfsParaEnriquecer.length) {
        const { data: pacientes, error } =
            await supabaseClient
                .from("pacientes")
                .select(`
                    nome,
                    cpf,
                    cns,
                    telefone,
                    endereco,
                    cep,
                    numero,
                    complemento,
                    ubs,
                    equipe,
                    ubs_vinculacao,
                    equipe_esf
                `)
                .in("cpf", cpfsParaEnriquecer);

        if (!error && pacientes) {
            pacientes.forEach(p => {
                const chave = p.cpf;

                const atual =
                    mapa.get(chave) ||
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

    let lista =
        Array.from(mapa.values());

    if (!contexto.usouFiltros) {
        lista = lista.filter(p => {
            const texto =
                normalizarTexto([
                    pegarNome(p),
                    p.nome_paciente,
                    pegarCPF(p),
                    pegarCNS(p),
                    p.telefone,
                    pegarUBS(p),
                    pegarEquipe(p),
                    p.endereco,
                    p.soapSubjetivo,
                    p.soapPlanoConduta
                ].join(" "));

            const numero =
                somenteNumeros([
                    pegarCPF(p),
                    pegarCNS(p),
                    p.telefone
                ].join(" "));

            return (
                texto.includes(contexto.termoBusca) ||
                (
                    contexto.termoNumerico &&
                    numero.includes(contexto.termoNumerico)
                )
            );
        });
    }

    return lista;
}

/* ==========================================================================
   RENDERIZAÇÃO DOS RESULTADOS
   ========================================================================== */

function renderizarResultadosBusca(resultados, container) {
    if (!resultados || resultados.length === 0) {
        container.innerHTML =
            `<p style="color:var(--danger); font-weight:600;">⚠️ Nenhum cidadão localizado.</p>`;
        return;
    }

    let html = `<div class="busca-ativa-grid">`;

    resultados.forEach(p => {
        const cpf =
            pegarCPF(p);

        const cns =
            pegarCNS(p);

        const cpfSeguro =
            escaparTexto(cpf);

        const cnsSeguro =
            escaparTexto(cns);

        const reavaliacao =
            parseInt(
                p.reavaliacaoDias ??
                p.retorno_dias ??
                0
            );

        let badges = "";

        if (campoLinhaSim(p, ["has"])) {
            badges += `<span class="tag-clinica" style="background:var(--danger)">HAS</span>`;
        }

        if (campoLinhaSim(p, ["dm"])) {
            badges += `<span class="tag-clinica" style="background:var(--success)">DM</span>`;
        }

        if (campoLinhaSim(p, ["gestante"])) {
            badges += `<span class="tag-clinica" style="background:var(--warning)">PN</span>`;
        }

        if (campoLinhaSim(p, ["tb"])) {
            badges += `<span class="tag-clinica" style="background:#701a75">TB</span>`;
        }

        if (campoLinhaSim(p, ["hansen"])) {
            badges += `<span class="tag-clinica" style="background:#1e3a8a">HANSEN</span>`;
        }

        if (reavaliacao === 0) {
            badges += `
                <span class="tag-clinica" style="background:#7c2d12;">
                    ⚠️ CRÍTICO (0d)
                </span>
            `;
        } else {
            badges += `
                <span class="tag-clinica" style="background:#475569;">
                    ⏱️ ${reavaliacao}d
                </span>
            `;
        }

        const ultimoMonitoramento =
            p.soapPlanoConduta ||
            p.plano ||
            p.soapSubjetivo ||
            p.subjetivo ||
            "Sem registros";

        const notaIcone =
            p.nota_monitoramento
                ? `
                    <span
                        title="${escaparTexto(p.nota_monitoramento)}"
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
            <div class="busca-ativa-card"
                 onclick="abrirAtendimentoExistente('${cpfSeguro}', '${cnsSeguro}')"
                 style="
                    cursor:pointer;
                    padding:15px;
                    margin-bottom:12px;
                    border:1px solid var(--border);
                    border-radius:10px;
                    background:var(--bg-card);
                    box-shadow:0 2px 4px rgba(0,0,0,0.15);
                 ">

                <h4 style="margin:0 0 6px 0; color:var(--text-main);">
                    ${pegarNome(p)}
                    ${notaIcone}
                </h4>

                <p style="margin:2px 0; font-size:13px; color:var(--text-muted);">
                    <strong>CPF:</strong> ${cpf || "-"}
                    |
                    <strong>CNS:</strong> ${cns || "-"}
                </p>

                <p style="margin:2px 0; font-size:13px; color:var(--text-muted);">
                    <strong>UBS:</strong> ${pegarUBS(p)}
                    |
                    ${pegarEquipe(p)}
                </p>

                <p style="
                    margin-top:8px;
                    font-size:12px;
                    color:var(--text-main);
                    font-weight:600;
                ">
                    ⏱️ Revisão:
                    ${
                        reavaliacao === 0
                        ? `<span style="color:#f87171;">URGENTE HOJE</span>`
                        : `${reavaliacao} dias`
                    }
                </p>

                <p style="
                    margin-top:4px;
                    font-size:12px;
                    color:var(--text-muted);
                ">
                    📅 Último monitoramento:
                    ${ultimoMonitoramento}
                </p>

                <div style="
                    margin-top:10px;
                    display:flex;
                    gap:4px;
                    flex-wrap:wrap;
                ">
                    ${badges}
                </div>

                <div style="
                    margin-top:14px;
                    display:flex;
                    gap:8px;
                    flex-wrap:wrap;
                ">

                    <button
                        onclick="event.stopPropagation(); abrirAtendimentoExistente('${cpfSeguro}', '${cnsSeguro}')"
                        style="
                            background:#2563eb;
                            color:white;
                            border:none;
                            padding:8px 12px;
                            border-radius:6px;
                            font-size:12px;
                            font-weight:bold;
                            cursor:pointer;
                        ">
                        📋 Abrir Prontuário
                    </button>

                    <button
                        onclick="event.stopPropagation(); abrirDiscadorParaPaciente('${cpfSeguro}', '${cnsSeguro}')"
                        style="
                            background:#25d366;
                            color:white;
                            border:none;
                            padding:8px 12px;
                            border-radius:6px;
                            font-size:12px;
                            font-weight:bold;
                            cursor:pointer;
                        ">
                        💬 WhatsApp
                    </button>

                </div>
            </div>
        `;
    });

    html += `</div>`;

    container.innerHTML = html;
}

/* ==========================================================================
   📋 ABRIR PRONTUÁRIO — SUPABASE
   ========================================================================== */

async function abrirAtendimentoExistente(cpf, cns) {
    try {
        if (typeof supabaseClient === "undefined") {
            mostrarToast?.("⚠️ Supabase não conectado.");
            return;
        }

        const cpfLimpo =
            somenteNumeros(cpf);

        const cnsLimpo =
            somenteNumeros(cns);

        if (!cpfLimpo && !cnsLimpo) {
            mostrarToast?.("⚠️ CPF ou CNS não informado.");
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

        const { data: paciente, error } =
            await query.maybeSingle();

        if (error) {
            console.error("Erro ao buscar paciente:", error);
            mostrarToast?.("⚠️ Erro ao buscar paciente no Supabase.");
            return;
        }

        if (!paciente) {
            mostrarToast?.("⚠️ Paciente não encontrado na base territorial.");
            return;
        }

        if (typeof navigate === "function") {
            navigate("prontuario");
        }

        if (typeof limparFormularioProntuario === "function") {
            limparFormularioProntuario();
        }

        preencherCampo("nomePaciente", paciente.nome);
        preencherCampo("cpfPaciente", paciente.cpf);
        preencherCampo("cnsPaciente", paciente.cns);
        preencherCampo("telPaciente", paciente.telefone);
        preencherCampo("CEP", paciente.cep);
        preencherCampo("endPaciente", paciente.endereco);
        preencherCampo("endNumero", paciente.numero);
        preencherCampo("endComplemento", paciente.complemento);
        preencherCampo("unidadePaciente", pegarUBS(paciente));
        preencherCampo("equipePaciente", pegarEquipe(paciente));

        const cabecalhoNome =
            document.getElementById("cabecalhoNome");

        if (cabecalhoNome) {
            cabecalhoNome.innerText =
                `📋 Prontuário Ativo: ${paciente.nome || "-"} (CPF: ${paciente.cpf || "-"})`;
        }

        const cabecalhoProntuario =
            document.getElementById("cabecalhoProntuario");

        if (cabecalhoProntuario) {
            cabecalhoProntuario.style.display = "flex";
        }

        window.pacienteAtual =
            paciente;

        window.pacienteSelecionado =
            paciente;

        if (
            typeof carregarHistoricoClinicoPaciente === "function"
        ) {
            await carregarHistoricoClinicoPaciente(
                paciente.cpf,
                paciente.cns
            );
        }

        mostrarToast?.("📋 Prontuário aberto.");

    } catch (erro) {
        console.error("Erro ao abrir prontuário:", erro);
        mostrarToast?.("⚠️ Erro ao abrir prontuário.");
    }
}

/* ==========================================================================
   AUXILIAR PREENCHER CAMPO
   ========================================================================== */

function preencherCampo(id, valor) {
    const campo =
        document.getElementById(id);

    if (campo) {
        campo.value = valor || "";
    }
}

/* ==========================================================================
   💬 ABRIR WHATSAPP RÁPIDO — SUPABASE
   ========================================================================== */

async function abrirDiscadorParaPaciente(cpf, cns) {
    try {
        if (typeof supabaseClient === "undefined") {
            mostrarToast?.("⚠️ Supabase não conectado.");
            return;
        }

        const cpfLimpo =
            somenteNumeros(cpf);

        const cnsLimpo =
            somenteNumeros(cns);

        if (!cpfLimpo && !cnsLimpo) {
            mostrarToast?.("⚠️ CPF ou CNS não informado.");
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

        const { data: paciente, error } =
            await query.maybeSingle();

        if (error) {
            console.error("Erro ao localizar paciente:", error);
            mostrarToast?.("⚠️ Erro ao localizar paciente.");
            return;
        }

        if (!paciente || !paciente.telefone) {
            mostrarToast?.("⚠️ Paciente sem telefone cadastrado.");
            return;
        }

        if (typeof navigate === "function") {
            navigate("prontuario");
        }

        setTimeout(() => {
            alternarCentralDiscagem?.();

            const input =
                document.getElementById("inputNumeroDiscador");

            if (input) {
                input.value =
                    paciente.nome ||
                    paciente.telefone;

                input.dispatchEvent(
                    new Event("input")
                );
            }
        }, 300);

    } catch (erro) {
        console.error("Erro ao abrir WhatsApp:", erro);
        mostrarToast?.("⚠️ Erro ao abrir WhatsApp.");
    }
}

/* ==========================================================================
   GLOBAL
   ========================================================================== */

window.buscarInicio =
    buscarInicio;

window.renderizarResultadosBusca =
    renderizarResultadosBusca;

window.abrirAtendimentoExistente =
    abrirAtendimentoExistente;

window.abrirDiscadorParaPaciente =
    abrirDiscadorParaPaciente;

window.preencherCampo =
    preencherCampo;
