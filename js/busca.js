/* ==========================================================================
   🔍 BUSCA ATIVA E ABERTURA DE PRONTUÁRIO
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

/* ==========================================================================
   BUSCA NA TELA INICIAL
   ========================================================================== */

function buscarInicio() {
    const inputBusca = document.getElementById("buscaNomeInicio");
    const container = document.getElementById("resultadoInicio");

    if (!inputBusca) {
        console.error("Erro: elemento buscaNomeInicio não encontrado.");
        return;
    }

    if (!container) return;

    const termoOriginal = inputBusca.value.trim();
    const termoBusca = normalizarTexto(termoOriginal);
    const termoNumerico = somenteNumeros(termoOriginal);

    if (!termoBusca) {
        container.innerHTML =
            `<em style="color:#94a3b8;">Introduza um critério acima para pesquisar.</em>`;
        return;
    }

    if (!db) {
        container.innerHTML =
            `<p style="color:var(--danger);">⚠️ Banco de dados local não conectado.</p>`;
        return;
    }

    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.getAll();

    request.onsuccess = function () {
        const todosPacientes = request.result || [];

        const desejaCritico =
            termoBusca.includes("critico");

        const desejaControlado =
            termoBusca.includes("controlado");

        const desejaHAS =
            termoBusca.includes("has") ||
            termoBusca.includes("hipertens");

        const desejaDM =
            termoBusca.includes("dm") ||
            termoBusca.includes("diabet");

        const desejaPN =
            termoBusca.includes("pn") ||
            termoBusca.includes("gestant") ||
            termoBusca.includes("natal");

        const desejaTB =
            termoBusca.includes("tb") ||
            termoBusca.includes("tuberculose");

        const desejaHansen =
            termoBusca.includes("hansen");

        const usouFiltros =
            desejaHAS ||
            desejaDM ||
            desejaPN ||
            desejaTB ||
            desejaHansen ||
            desejaCritico ||
            desejaControlado;

        const resultados = todosPacientes.filter(p => {
            const reavaliacao =
                parseInt(p.reavaliacaoDias || 0);

            if (desejaHAS && p.has !== "Sim") return false;
            if (desejaDM && p.dm !== "Sim") return false;
            if (desejaPN && p.gestante !== "Sim") return false;
            if (desejaTB && p.tb !== "Sim") return false;
            if (desejaHansen && p.hansen !== "Sim") return false;

            if (desejaCritico && reavaliacao !== 0) return false;
            if (desejaControlado && reavaliacao <= 0) return false;

            if (!usouFiltros) {
                const nomeBate =
                    normalizarTexto(p.nome).includes(termoBusca);

                const cpfBate =
                    termoNumerico !== "" &&
                    somenteNumeros(p.cpf).includes(termoNumerico);

                const cnsBate =
                    termoNumerico !== "" &&
                    somenteNumeros(p.cns).includes(termoNumerico);

                return nomeBate || cpfBate || cnsBate;
            }

            return true;
        });

        renderizarResultadosBusca(resultados, container);
    };

    request.onerror = function () {
        console.error("Erro ao executar busca no IndexedDB");

        container.innerHTML =
            `<p style="color:var(--danger); font-weight:600;">⚠️ Erro ao executar busca.</p>`;
    };
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
        const cpfSeguro = escaparTexto(p.cpf);
        const reavaliacao = parseInt(p.reavaliacaoDias || 0);

        let badges = "";

        if (p.has === "Sim") {
            badges += `<span class="tag-clinica" style="background:var(--danger)">HAS</span>`;
        }

        if (p.dm === "Sim") {
            badges += `<span class="tag-clinica" style="background:var(--success)">DM</span>`;
        }

        if (p.gestante === "Sim") {
            badges += `<span class="tag-clinica" style="background:var(--warning)">PN</span>`;
        }

        if (p.tb === "Sim") {
            badges += `<span class="tag-clinica" style="background:#701a75">TB</span>`;
        }

        if (p.hansen === "Sim") {
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
            p.historicoEvolucoes &&
            p.historicoEvolucoes.length > 0
                ? String(p.historicoEvolucoes[0])
                    .split("\n")[0]
                    .replace("--- ", "")
                : "Sem registros";

        html += `
            <div class="busca-ativa-card"
                 onclick="abrirAtendimentoExistente('${cpfSeguro}')"
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
                    ${p.nome || "Sem nome"}
                </h4>

                <p style="margin:2px 0; font-size:13px; color:var(--text-muted);">
                    <strong>CPF:</strong> ${p.cpf || "-"}
                    |
                    <strong>CNS:</strong> ${p.cns || "-"}
                    |
                    <strong>Idade:</strong> ${p.idade || "-"} anos
                </p>

                <p style="margin:2px 0; font-size:13px; color:var(--text-muted);">
                    <strong>UBS:</strong> ${p.ubs || "Não vinculada"}
                    |
                    ${p.equipe || "Sem equipe"}
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
                        onclick="event.stopPropagation(); abrirAtendimentoExistente('${cpfSeguro}')"
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
                        onclick="event.stopPropagation(); abrirDiscadorParaPaciente('${cpfSeguro}')"
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
   📋 ABRIR PRONTUÁRIO
   ========================================================================== */

function abrirAtendimentoExistente(cpf) {
    if (!db) {
        mostrarToast?.("⚠️ Banco local não conectado.");
        return;
    }

    const cpfLimpo = String(cpf || "");

    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.get(cpfLimpo);

    request.onsuccess = function () {
        const p = request.result;

        if (!p) {
            mostrarToast?.("⚠️ Paciente não encontrado.");
            return;
        }

        navigate("prontuario");

        if (typeof limparFormularioProntuario === "function") {
            limparFormularioProntuario();
        }

        preencherCampo("nomePaciente", p.nome);
        preencherCampo("cpfPaciente", p.cpf);
        preencherCampo("nascPaciente", p.nasc);
        preencherCampo("idadePaciente", p.idade);
        preencherCampo("telPaciente", p.tel);
        preencherCampo("CEP", p.cep);
        preencherCampo("endPaciente", p.endereco);
        preencherCampo("endNumero", p.numero);
        preencherCampo("endComplemento", p.complemento);
        preencherCampo("unidadePaciente", p.ubs);
        preencherCampo("equipePaciente", p.equipe);

        preencherCampo("objPA", p.objPA);
        preencherCampo("objFC", p.objFC);
        preencherCampo("objFR", p.objFR);
        preencherCampo("objSatO2", p.objSatO2);
        preencherCampo("objDor", p.objDor || "0");

        preencherCampo("objpeso", p.objpeso);
        preencherCampo("objaltura", p.objaltura);
        preencherCampo("objIMC", p.objIMC);

        preencherCampo("hasSN", p.has || "Não");
        mostrarCard?.("cardHAS", p.has || "Não");

        preencherCampo("dmSN", p.dm || "Não");
        mostrarCard?.("cardDM", p.dm || "Não");

        preencherCampo("gestanteSN", p.gestante || "Não");
        mostrarCard?.("cardGestante", p.gestante || "Não");

        const tbSN = document.getElementById("tbSN");
        if (tbSN) tbSN.checked = p.tb === "Sim";

        const hansenSN = document.getElementById("hansenSN");
        if (hansenSN) hansenSN.checked = p.hansen === "Sim";

        renderizarHistoricoEvolucoes(p);

        const cabecalhoNome =
            document.getElementById("cabecalhoNome");

        if (cabecalhoNome) {
            cabecalhoNome.innerText =
                `📋 Prontuário Ativo: ${p.nome || "-"} (CPF: ${p.cpf || "-"})`;
        }

        const cabecalhoProntuario =
            document.getElementById("cabecalhoProntuario");

        if (cabecalhoProntuario) {
            cabecalhoProntuario.style.display = "block";
        }
    };

    request.onerror = function () {
        mostrarToast?.("⚠️ Erro ao abrir prontuário.");
        console.error("Erro ao abrir paciente:", request.error);
    };
}

/* ==========================================================================
   AUXILIAR PREENCHER CAMPO
   ========================================================================== */

function preencherCampo(id, valor) {
    const campo = document.getElementById(id);

    if (campo) {
        campo.value = valor || "";
    }
}

/* ==========================================================================
   HISTÓRICO
   ========================================================================== */

function renderizarHistoricoEvolucoes(p) {
    const container =
        document.getElementById("linhaTempoEvolucoes");

    if (!container) return;

    if (!p.historicoEvolucoes || p.historicoEvolucoes.length === 0) {
        container.innerHTML = "";
        return;
    }

    let htmlTimeline = `
        <label style="font-weight:700;">
            ⏳ Histórico Clínico Digital:
        </label>
        <div class="timeline">
    `;

    p.historicoEvolucoes.forEach(evo => {
        htmlTimeline += `
            <div class="timeline-item">
                <div class="timeline-body">${evo}</div>
            </div>
        `;
    });

    htmlTimeline += `</div>`;

    container.innerHTML = htmlTimeline;
}

/* ==========================================================================
   💬 ABRIR WHATSAPP RÁPIDO
   ========================================================================== */

function abrirDiscadorParaPaciente(cpf) {
    if (!db) {
        mostrarToast?.("⚠️ Banco local não conectado.");
        return;
    }

    const cpfLimpo = String(cpf || "");

    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.get(cpfLimpo);

    request.onsuccess = function () {
        const p = request.result;

        if (!p || !p.tel) {
            mostrarToast?.("⚠️ Paciente sem telefone cadastrado.");
            return;
        }

        navigate("prontuario");

        setTimeout(() => {
            alternarCentralDiscagem?.();

            const input =
                document.getElementById("inputNumeroDiscador");

            if (input) {
                input.value = p.nome || p.tel;

                input.dispatchEvent(
                    new Event("input")
                );
            }
        }, 300);
    };

    request.onerror = function () {
        mostrarToast?.("⚠️ Erro ao abrir WhatsApp.");
        console.error("Erro ao localizar paciente:", request.error);
    };
}
