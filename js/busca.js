/* ==========================================================================
   🔍 BUSCA ATIVA E ABERTURA DE PRONTUÁRIO
   ========================================================================== */

function buscarInicio() {
    const inputBusca = document.getElementById("buscaNomeInicio");

    if (!inputBusca) {
        console.error("Erro: elemento buscaNomeInicio não encontrado.");
        return;
    }

    const termoOriginal = inputBusca.value.toLowerCase().trim();
    const container = document.getElementById("resultadoInicio");

    if (!container) return;

    if (!termoOriginal) {
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
        const todosPacientes = request.result;
        const termoNumerico = termoOriginal.replace(/\D/g, "");

        const desejaCritico =
            termoOriginal.includes("critico") ||
            termoOriginal.includes("crítico");

        const desejaControlado =
            termoOriginal.includes("controlado");

        const desejaHAS =
            termoOriginal.includes("has") ||
            termoOriginal.includes("hipertens");

        const desejaDM =
            termoOriginal.includes("dm") ||
            termoOriginal.includes("diabet");

        const desejaPN =
            termoOriginal.includes("pn") ||
            termoOriginal.includes("gestant") ||
            termoOriginal.includes("natal");

        const desejaTB =
            termoOriginal.includes("tb") ||
            termoOriginal.includes("tuberculose");

        const desejaHansen =
            termoOriginal.includes("hansen");

        const resultados = todosPacientes.filter(p => {
            if (desejaHAS && p.has !== "Sim") return false;
            if (desejaDM && p.dm !== "Sim") return false;
            if (desejaPN && p.gestante !== "Sim") return false;
            if (desejaTB && p.tb !== "Sim") return false;
            if (desejaHansen && p.hansen !== "Sim") return false;

            if (desejaCritico && p.reavaliacaoDias !== 0) return false;
            if (desejaControlado && p.reavaliacaoDias <= 0) return false;

            const digitouApenasFiltros =
                desejaHAS ||
                desejaDM ||
                desejaPN ||
                desejaTB ||
                desejaHansen ||
                desejaCritico ||
                desejaControlado;

            if (!digitouApenasFiltros) {
                const nomeBate =
                    p.nome &&
                    p.nome.toLowerCase().includes(termoOriginal);

                const cpfLimpoBanco =
                    p.cpf ? p.cpf.replace(/\D/g, "") : "";

                const cpfBate =
                    termoNumerico !== "" &&
                    cpfLimpoBanco.includes(termoNumerico);

                return nomeBate || cpfBate;
            }

            return true;
        });

        if (resultados.length === 0) {
            container.innerHTML =
                `<p style="color:var(--danger); font-weight:600;">⚠️ Nenhum cidadão localizado.</p>`;
            return;
        }

        let html = `<div class="busca-ativa-grid">`;

        resultados.forEach(p => {
            let badges = "";

            if (p.has === "Sim") {
                badges += `<span class="tag-clinica" style="background:var(--danger)">HAS</span> `;
            }

            if (p.dm === "Sim") {
                badges += `<span class="tag-clinica" style="background:var(--success)">DM</span> `;
            }

            if (p.gestante === "Sim") {
                badges += `<span class="tag-clinica" style="background:var(--warning)">PN</span> `;
            }

            if (p.tb === "Sim") {
                badges += `<span class="tag-clinica" style="background:#701a75">TB</span> `;
            }

            if (p.hansen === "Sim") {
                badges += `<span class="tag-clinica" style="background:#1e3a8a">HANSEN</span> `;
            }

            if (parseInt(p.reavaliacaoDias) === 0) {
                badges += `<span class="tag-clinica" style="background:#7c2d12;">⚠️ CRÍTICO (0d)</span> `;
            } else {
                badges += `<span class="tag-clinica" style="background:#475569">⏱️ ${p.reavaliacaoDias}d</span> `;
            }

            html += `
                <div class="busca-ativa-card"
                     onclick="abrirAtendimentoExistente('${p.cpf}')"
                     style="cursor:pointer; padding:15px; margin-bottom:10px; border:1px solid #e2e8f0; border-radius:8px; background:white;">

                    <h4 style="margin:0 0 5px 0; color:#1e293b;">
                        ${p.nome}
                    </h4>

                    <p style="margin:2px 0; font-size:13px; color:#64748b;">
                        <strong>CPF:</strong> ${p.cpf}
                        |
                        <strong>Idade:</strong> ${p.idade || "-"} anos
                    </p>

                    <p style="margin:2px 0; font-size:13px; color:#64748b;">
                        <strong>UBS:</strong> ${p.ubs || "Não vinculada"}
                        |
                        ${p.equipe || "Sem equipe"}
                    </p>

                    <div style="margin-top:8px; display:flex; gap:4px; flex-wrap:wrap;">
                        ${badges}
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    };

    request.onerror = function () {
        console.error("Erro ao executar busca no IndexedDB");
    };
}

function abrirAtendimentoExistente(cpf) {
    const transaction = db.transaction(["pacientes"], "readonly");
    const store = transaction.objectStore("pacientes");
    const request = store.get(cpf);

    request.onsuccess = function() {
        const p = request.result;
        if (!p) return;

        navigate("prontuario");
        limparFormularioProntuario();

        document.getElementById("nomePaciente").value = p.nome || "";
        document.getElementById("cpfPaciente").value = p.cpf || "";
        document.getElementById("nascPaciente").value = p.nasc || "";
        document.getElementById("idadePaciente").value = p.idade || "";
        document.getElementById("telPaciente").value = p.tel || "";
        document.getElementById("CEP").value = p.cep || "";
        document.getElementById("endPaciente").value = p.endereco || "";
        document.getElementById("endNumero").value = p.numero || "";
        document.getElementById("endComplemento").value = p.complemento || "";
        document.getElementById("unidadePaciente").value = p.ubs || "";
        document.getElementById("equipePaciente").value = p.equipe || "";

        document.getElementById("objPA").value = p.objPA || "";
        document.getElementById("objFC").value = p.objFC || "";
        document.getElementById("objFR").value = p.objFR || "";
        document.getElementById("objSatO2").value = p.objSatO2 || "";
        document.getElementById("objDor").value = p.objDor || "0";

        document.getElementById("hasSN").value = p.has || "Não";
        mostrarCard("cardHAS", p.has);
        document.getElementById("hasPAS").value = p.pas || "";
        document.getElementById("hasPAD").value = p.pad || "";
        document.getElementById("hasClassif").value = p.classifHas || "";

        document.getElementById("dmSN").value = p.dm || "Não";
        mostrarCard("cardDM", p.dm);
        document.getElementById("dmHbA1c").value = p.hba1c || "";
        document.getElementById("dmClassif").value = p.classifDm || "";

        document.getElementById("gestanteSN").value = p.gestante || "Não";
        mostrarCard("cardGestante", p.gestante);
        document.getElementById("gestDUM").value = p.dum || "";
        document.getElementById("gestIG").value = p.ig || "";
        document.getElementById("gestDPP").value = p.dpp || "";

        document.getElementById("tbSN").checked = p.tb === "Sim";
        document.getElementById("hansenSN").checked = p.hansen === "Sim";
        document.getElementById("ampiPaciente").value = p.ampi || "Idoso Robusto";

        if (parseInt(p.idade) >= 60) {
            document.getElementById("ampiBloco").style.display = "block";
        }

        if (p.exameFisicoStatus === "Alterado") {
            document.querySelector('input[name="exameFisicoStatus"][value="Alterado"]').checked = true;
            document.getElementById("blocoExameAlterado").style.display = "block";
            document.getElementById("soapObjetivoAlterado").value = p.soapObjetivoAlterado || "";
        } else {
            document.querySelector('input[name="exameFisicoStatus"][value="Normal"]').checked = true;
            document.getElementById("blocoExameAlterado").style.display = "none";
        }

        if (p.historicoEvolucoes && p.historicoEvolucoes.length > 0) {
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

            document.getElementById("linhaTempoEvolucoes").innerHTML = htmlTimeline;
        }

        document.getElementById("cabecalhoNome").innerText =
            `📋 Prontuário Ativo: ${p.nome} (CPF: ${p.cpf})`;

        document.getElementById("cabecalhoProntuario").style.display = "block";
    };
}
