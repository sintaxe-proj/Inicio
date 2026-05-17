/* ============================================================
   📦 BANCO DE DADOS (LOCALSTORAGE) & VARIÁVEIS GERAIS
============================================================ */
let pacientes = JSON.parse(localStorage.getItem("bancoPacientes")) || [
    { id: "p001", nome: "Maria Silva", cpf: "123.456.789-01", nascimento: "1975-05-10", idade: "51 anos", condicoes: { has: "Sim", dm: "Não", gestante: "Não", hanseniase: "Não",外 tuberculose: "Não" } },
    { id: "p002", nome: "João Souza", cpf: "987.654.321-00", nascimento: "1950-02-20", idade: "76 anos", condicoes: { has: "Não", dm: "Sim", gestante: "Não", hanseniase: "Não", tuberculose: "Não" } }
];
let reunioesClinicas = JSON.parse(localStorage.getItem("reunioesClinicas")) || [];
let auditoriaLogs = JSON.parse(localStorage.getItem("auditoriaLogs")) || [];

let pacienteAtualId = null; // Controla se estamos editando um paciente existente ou criando um novo
let paginaAuditoriaAtual = 1;
const logsPorPagina = 10;

/* ============================================================
   🧭 NAVEGAÇÃO ENTRE TELAS (SPA)
============================================================ */
function navigate(view) {
    // Oculta todas as views usando display: none ou classes hidden
    document.querySelectorAll(".view").forEach(v => {
        v.style.display = "none";
        v.classList.add("hidden");
    });
    
    // Mostra a view alvo
    const target = document.getElementById("view-" + view);
    if (target) {
        target.style.display = "block";
        target.classList.remove("hidden");
    }

    // Gatilhos específicos ao abrir cada aba
    if (view === "inicio") {
        atualizarInicio();
        verificarAlertas();
    } else if (view === "banco") {
        listarBanco();
    } else if (view === "reunioes") {
        listarReunioes();
    } else if (view === "linhas") {
        renderizarGraficosLinhas(document.getElementById("linhaSelect").value);
    } else if (view === "auditoria") {
        listarAuditoria();
    }

    // Fecha o modal lateral (drawer) se mudar de aba
    fecharDrawer();
}

/* ============================================================
   📊 MOTO DE BUSCA E VISÃO GERAL (ABA INÍCIO)
============================================================ */
function atualizarInicio() {
    atualizarDashboardInicio();
    
    const nome = document.getElementById("buscaNomeInicio")?.value.toLowerCase() || "";
    const cpf = document.getElementById("buscaCPFInicio")?.value.replace(/\D/g, "") || "";
    const container = document.getElementById("resultadoInicio");

    if (!container) return;

    if (nome.length < 2 && cpf.length < 3) {
        container.innerHTML = `<em>Digite um nome ou CPF para iniciar a busca. Clique nos Cards abaixo para puxar os relatórios da linha de cuidados.</em>`;
        return;
    }

    const filtrados = pacientes.filter(p => {
        const bateNome = nome !== "" && p.nome.toLowerCase().includes(nome);
        const bateCPF = cpf !== "" && p.cpf.replace(/\D/g, "").includes(cpf);
        return bateNome || bateCPF;
    });

    if (filtrados.length === 0) {
        container.innerHTML = `<span style="color:#ef4444; font-weight:bold;">Nenhum paciente encontrado com estes critérios.</span>`;
        return;
    }

    let html = `<table><thead><tr><th>Nome</th><th>CPF</th><th>Idade</th><th>Ações</th></tr></thead><tbody>`;
    filtrados.forEach(p => {
        html += `
            <tr>
                <td><strong>${escapeHTML(p.nome)}</strong></td>
                <td>${escapeHTML(p.cpf)}</td>
                <td>${escapeHTML(p.idade || "Não informada")}</td>
                <td>
                    <button class="btn-primary" style="padding:4px 8px; font-size:12px;" onclick="carregarPacienteNoProntuario('${p.id}')">Editar / Ver</button>
                    <button class="btn-primary" style="padding:4px 8px; font-size:12px; background:#10b981;" onclick="abrirDrawer('${p.id}')">Evoluções</button>
                </td>
            </tr>
        `;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

function buscarInicio() {
    atualizarInicio();
}

function atualizarDashboardInicio() {
    let has = 0, dm = 0, gest = 0, tb = 0, han = 0;

    pacientes.forEach(p => {
        if (p.condicoes?.has === "Sim") has++;
        if (p.condicoes?.dm === "Sim") dm++;
        if (p.condicoes?.gestante === "Sim") gest++;
        if (p.condicoes?.tuberculose === "Sim") tb++;
        if (p.condicoes?.hanseniase === "Sim") han++;
    });

    if (document.getElementById("dashHAS")) document.getElementById("dashHAS").innerText = has;
    if (document.getElementById("dashDM")) document.getElementById("dashDM").innerText = dm;
    if (document.getElementById("dashGest")) document.getElementById("dashGest").innerText = gest;
    if (document.getElementById("dashTB")) document.getElementById("dashTB").innerText = tb;
    if (document.getElementById("dashHansen")) document.getElementById("dashHansen").innerText = han;
}

function filtrarPorCondicao(condicao) {
    navigate("banco");
    const select = document.getElementById("filtroCondicaoBanco");
    if (select) {
        select.value = condicao;
        listarBanco();
    }
}

/* ============================================================
   🩺 CADASTRO E GERENCIAMENTO DE PRONTUÁRIOS
============================================================ */
function mostrarCard(idCard, valor) {
    const card = document.getElementById(idCard);
    if (card) card.style.display = valor === "Sim" ? "block" : "none";
}

function salvarProntuario() {
    const nomeInput = document.getElementById("nomePaciente");
    if (!nomeInput || !nomeInput.value.trim()) {
        alert("O nome completo do paciente é obrigatório!");
        return;
    }

    // Estrutura de dados unificada baseada no index.html completo
    const dadosPaciente = {
        id: pacienteAtualId || "p_" + Date.now(),
        nome: nomeInput.value.trim(),
        cpf: document.getElementById("cpfPaciente").value,
        nascimento: document.getElementById("nascPaciente").value,
        idade: document.getElementById("idadePaciente").value,
        endereco: document.getElementById("endPaciente").value,
        cep: document.getElementById("CEP").value,
        telefone: document.getElementById("telPaciente").value,
        unidade: document.getElementById("unidadePaciente").value,
        equipe: document.getElementById("equipePaciente").value,
        obs: document.getElementById("obsPaciente").value,
        
        ampi: {
            data: document.getElementById("ampiData")?.value || "",
            classificacao: document.getElementById("ampiPaciente")?.value || "",
            obs: document.getElementById("ampiObs")?.value || "",
            violencia: document.getElementById("ampiViolencia")?.checked || false
        },
        condicoes: {
            has: document.getElementById("hasSN").value,
            dm: document.getElementById("dmSN").value,
            gestante: document.getElementById("gestanteSN").value,
            hanseniase: document.getElementById("hansenSN").value,
            tuberculose: document.getElementById("tbSN").value
        },
        hasDados: {
            pas: document.getElementById("hasPAS")?.value || "",
            pad: document.getElementById("hasPAD")?.value || "",
            classif: document.getElementById("hasClassif")?.value || "",
            ultimaConsulta: document.getElementById("hasUltimaConsulta")?.value || "",
            fundoOD: document.getElementById("hasFundoOD")?.value || "",
            fundoOE: document.getElementById("hasFundoOE")?.value || ""
        },
        dmDados: {
            hba1c: document.getElementById("dmHbA1c")?.value || "",
            classif: document.getElementById("dmClassif")?.value || "",
            micro: document.getElementById("dmMicro")?.value || "",
            cat: document.getElementById("dmMicroCat")?.value || "",
            peDir: document.getElementById("dmPeDir")?.value || "",
            peEsq: document.getElementById("dmPeEsq")?.value || "",
            peObs: document.getElementById("dmPeObs")?.value || "",
            ampMID: document.getElementById("dmAmpMID")?.checked || false,
            ampMIE: document.getElementById("dmAmpMIE")?.checked || false,
            fundoOD: document.getElementById("dmFundoOD")?.value || "",
            fundoOE: document.getElementById("dmFundoOE")?.value || "",
            fundoData: document.getElementById("dmFundoData")?.value || "",
            ultimaConsulta: document.getElementById("dmUltimaConsulta")?.value || ""
        },
        gestanteDados: {
            g: document.getElementById("gestG")?.value || "",
            p: document.getElementById("gestP")?.value || "",
            a: document.getElementById("gestA")?.value || "",
            dum: document.getElementById("gestDUM")?.value || "",
            ig: document.getElementById("gestIG")?.value || "",
            dpp: document.getElementById("gestDPP")?.value || "",
            primeira: document.getElementById("gestPrimeiraConsulta")?.value || "",
            tr1: document.getElementById("gestTR1")?.value || "",
            tr2: document.getElementById("gestTR2")?.value || "",
            tr3: document.getElementById("gestTR3")?.value || "",
            ex1: document.getElementById("gestEX1")?.value || "",
            ex2: document.getElementById("gestEX2")?.value || "",
            ex3: document.getElementById("gestEX3")?.value || "",
            usg1: document.getElementById("gestUSG1")?.value || "",
            usgMorf: document.getElementById("gestUSGMorf")?.value || "",
            usg3: document.getElementById("gestUSG3")?.value || "",
            ultima: document.getElementById("gestUltimaConsulta")?.value || ""
        },
        evolucoes: []
    };

    // Preserva evoluções caso seja edição
    if (pacienteAtualId) {
        const antigo = pacientes.find(x => x.id === pacienteAtualId);
        if (antigo && antigo.evolucoes) dadosPaciente.evolucoes = antigo.evolucoes;
        
        const idx = pacientes.findIndex(x => x.id === pacienteAtualId);
        pacientes[idx] = dadosPaciente;
        registrarLog("Editar Prontuário", `Prontuário de ${dadosPaciente.nome} modificado.`);
    } else {
        pacientes.push(dadosPaciente);
        registrarLog("Criar Prontuário", `Novo prontuário para ${dadosPaciente.nome} inserido.`);
    }

    localStorage.setItem("bancoPacientes", JSON.stringify(pacientes));
    alert("Prontuário salvo com sucesso!");
    limparFormularioProntuario();
    navigate("inicio");
}

function carregarPacienteNoProntuario(id) {
    const p = pacientes.find(x => x.id === id);
    if (!p) return;

    pacienteAtualId = p.id;

    // Identificação básica
    document.getElementById("nomePaciente").value = p.nome || "";
    document.getElementById("cpfPaciente").value = p.cpf || "";
    document.getElementById("nascPaciente").value = p.nascimento || "";
    document.getElementById("idadePaciente").value = p.idade || "";
    document.getElementById("endPaciente").value = p.endereco || "";
    document.getElementById("CEP").value = p.cep || "";
    document.getElementById("telPaciente").value = p.telefone || "";
    document.getElementById("unidadePaciente").value = p.unidade || "";
    document.getElementById("equipePaciente").value = p.equipe || "";
    document.getElementById("obsPaciente").value = p.obs || "";

    // AMPI
    if (p.ampi) {
        document.getElementById("ampiData").value = p.ampi.data || "";
        document.getElementById("ampiPaciente").value = p.ampi.classificacao || "";
        document.getElementById("ampiObs").value = p.ampi.obs || "";
        document.getElementById("ampiViolencia").checked = p.ampi.violencia || false;
    }
    calcIdade();

    // Condições Gatilhos
    document.getElementById("hasSN").value = p.condicoes?.has || "Não";
    document.getElementById("dmSN").value = p.condicoes?.dm || "Não";
    document.getElementById("gestanteSN").value = p.condicoes?.gestante || "Não";
    document.getElementById("hansenSN").value = p.condicoes?.hanseniase || "Não";
    document.getElementById("tbSN").value = p.condicoes?.tuberculose || "Não";

    mostrarCard("cardHAS", p.condicoes?.has);
    mostrarCard("cardDM", p.condicoes?.dm);
    mostrarCard("cardGestante", p.condicoes?.gestante);
    mostrarCard("cardHanseniase", p.condicoes?.hanseniase);
    mostrarCard("cardTB", p.condicoes?.tuberculose);

    // Dados HAS
    if (p.hasDados) {
        document.getElementById("hasPAS").value = p.hasDados.pas || "";
        document.getElementById("hasPAD").value = p.hasDados.pad || "";
        document.getElementById("hasClassif").value = p.hasDados.classif || "";
        document.getElementById("hasUltimaConsulta").value = p.hasDados.ultimaConsulta || "";
        document.getElementById("hasFundoOD").value = p.hasDados.fundoOD || "";
        document.getElementById("hasFundoOE").value = p.hasDados.fundoOE || "";
        classificarHAS();
    }

    // Dados DM
    if (p.dmDados) {
        document.getElementById("dmHbA1c").value = p.dmDados.hba1c || "";
        document.getElementById("dmClassif").value = p.dmDados.classif || "";
        document.getElementById("dmMicro").value = p.dmDados.micro || "";
        document.getElementById("dmMicroCat").value = p.dmDados.cat || "";
        document.getElementById("dmPeDir").value = p.dmDados.peDir || "";
        document.getElementById("dmPeEsq").value = p.dmDados.peEsq || "";
        document.getElementById("dmPeObs").value = p.dmDados.peObs || "";
        document.getElementById("dmAmpMID").checked = p.dmDados.ampMID || false;
        document.getElementById("dmAmpMIE").checked = p.dmDados.ampMIE || false;
        document.getElementById("dmFundoOD").value = p.dmDados.fundoOD || "";
        document.getElementById("dmFundoOE").value = p.dmDados.fundoOE || "";
        document.getElementById("dmFundoData").value = p.dmDados.fundoData || "";
        document.getElementById("dmUltimaConsulta").value = p.dmDados.ultimaConsulta || "";
        classificarDM();
    }

    // Cabeçalho volante de edição ativa
    document.getElementById("cabecalhoNome").innerText = `Editando: ${p.nome}`;
    document.getElementById("cabecalhoNascimento").innerText = ` (Nascimento: ${p.nascimento})`;
    document.getElementById("cabecalhoProntuario").style.display = "block";

    renderizarHistoricoEvolucoes(p);
    navigate("prontuario");
}

function excluirPaciente(id) {
    const p = pacientes.find(x => x.id === id);
    if (!p) return;

    if (confirm(`Tem certeza absoluta que deseja excluir o prontuário de ${p.nome}?`)) {
        pacientes = pacientes.filter(x => x.id !== id);
        localStorage.setItem("bancoPacientes", JSON.stringify(pacientes));
        registrarLog("Excluir Prontuário", `Prontuário de ${p.nome} removido do sistema.`);
        listarBanco();
        atualizarInicio();
    }
}

function limparFormularioProntuario() {
    pacienteAtualId = null;
    document.getElementById("cabecalhoProntuario").style.display = "none";
    const section = document.getElementById("view-prontuario");
    if (!section) return;

    section.querySelectorAll("input").forEach(i => i.type === "checkbox" ? i.checked = false : i.value = "");
    section.querySelectorAll("textarea").forEach(t => t.value = "");
    section.querySelectorAll("select").forEach(s => s.selectedIndex = 0);

    mostrarCard("cardHAS", "Não");
    mostrarCard("cardDM", "Não");
    mostrarCard("cardGestante", "Não");
    mostrarCard("cardHanseniase", "Não");
    mostrarCard("cardTB", "Não");
}

/* ============================================================
   📝 SEÇÃO DE EVOLUÇÕES INTEGRADA (CID / CIPESC)
============================================================ */
function adicionarEvolucao() {
    if (!pacienteAtualId) {
        alert("Salve ou carregue o prontuário de um paciente antes de registrar evoluções isoladas.");
        return;
    }

    const data = document.getElementById("evoData").value || new Date().toISOString().split("T")[0];
    const texto = document.getElementById("evoTexto").value.trim();
    const cid = document.getElementById("evoCID").value;
    const cipesc = document.getElementById("evoCIPESC").value;

    if (!texto) {
        alert("Preencha o campo de evolução clínica.");
        return;
    }

    const p = pacientes.find(x => x.id === pacienteAtualId);
    if (!p.evolucoes) p.evolucoes = [];

    p.evolucoes.unshift({ data, texto, cid, cipesc });
    localStorage.setItem("bancoPacientes", JSON.stringify(pacientes));

    document.getElementById("evoTexto").value = "";
    document.getElementById("evoCID").value = "";
    document.getElementById("evoCIPESC").value = "";

    renderizarHistoricoEvolucoes(p);
    registrarLog("Adicionar Evolução", `Nova evolução clínica anexada para ${p.nome}.`);
}

function renderizarHistoricoEvolucoes(paciente) {
    const container = document.getElementById("historicoEvolucoes");
    if (!container) return;

    if (!paciente.evolucoes || paciente.evolucoes.length === 0) {
        container.innerHTML = "<em>Nenhuma evolução clínica cadastrada.</em>";
        return;
    }

    let html = "<h4>Linha do Tempo de Evoluções</h4>";
    paciente.evolucoes.forEach(e => {
        html += `
            <div style="background:#fff; border-left:4px solid #10b981; padding:10px; margin-bottom:8px; border-radius:4px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <small><b>Data:</b> ${e.data}</small><br>
                <p style="margin:5px 0;">${escapeHTML(e.texto)}</p>
                ${e.cid ? `<span class="badge" style="background:#3b82f6; color:#fff; font-size:11px; padding:2px 6px; margin-right:5px;">CID: ${e.cid}</span>` : ""}
                ${e.cipesc ? `<span class="badge" style="background:#6366f1; color:#fff; font-size:11px; padding:2px 6px;">CIPESC: ${e.cipesc}</span>` : ""}
            </div>
        `;
    });
    container.innerHTML = html;
}

/* ============================================================
   🤖 CALCULADORES AUTOMÁTICOS E PROTOCOLOS DE ALERTA
============================================================ */
function calcIdade() {
    const nascInput = document.getElementById("nascPaciente").value;
    const idadeInput = document.getElementById("idadePaciente");
    const ampiBloco = document.getElementById("ampiBloco");

    if (!nascInput) return;

    const nasc = new Date(nascInput);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    if (hoje.getMonth() < nasc.getMonth() || (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())) {
        idade--;
    }

    idadeInput.value = `${idade} anos`;
    if (ampiBloco) ampiBloco.style.display = idade >= 60 ? "block" : "none";
}

function calcIG() {
    const dumInput = document.getElementById("gestDUM").value;
    const igOutput = document.getElementById("gestIG");
    const dppOutput = document.getElementById("gestDPP");

    if (!dumInput) return;

    const dum = new Date(dumInput);
    const hoje = new Date();
    const diffTime = Math.abs(hoje - dum);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const semanas = Math.floor(diffDays / 7);
    const dias = diffDays % 7;

    if (igOutput) igOutput.value = `${semanas} semanas e ${dias} dias`;

    // Regra de Nagele (DPP)
    let dpp = new Date(dum);
    dpp.setDate(dpp.getDate() + 7);
    dpp.setMonth(dpp.getMonth() + 9);
    if (dppOutput) dppOutput.value = dpp.toISOString().split("T")[0];
}

function classificarHAS() {
    const pas = parseInt(document.getElementById("hasPAS")?.value);
    const pad = parseInt(document.getElementById("hasPAD")?.value);
    const output = document.getElementById("hasClassif");

    if (!pas || !pad || !output) return;

    if (pas < 120 && pad < 80) output.value = "Ótima";
    else if (pas <= 130 && pad <= 85) output.value = "Normal";
    else if (pas <= 139 || pad <= 89) output.value = "Pré-Hipertensão";
    else if (pas <= 159 || pad <= 99) output.value = "Estágio 1";
    else output.value = "Estágio Avançado / Crise";
}

function classificarDM() {
    const hba1c = parseFloat(document.getElementById("dmHbA1c")?.value);
    const output = document.getElementById("dmClassif");

    if (!hba1c || !output) return;

    if (hba1c < 5.7) output.value = "Normal";
    else if (hba1c <= 6.4) output.value = "Pré-Diabetes";
    else output.value = "Diabetes Estabelecido";
}

function verificarAlertas() {
    const painel = document.getElementById("alertasPainel");
    const sino = document.getElementById("alertBell");
    if (!painel) return;

    let alertas = [];
    const hoje = new Date();

    pacientes.forEach(p => {
        if (p.condicoes?.has === "Sim" && p.hasDados?.ultimaConsulta) {
            const meses = (hoje.getFullYear() - new Date(p.hasDados.ultimaConsulta).getFullYear()) * 12 + (hoje.getMonth() - new Date(p.hasDados.ultimaConsulta).getMonth());
            if (meses >= 6) alertas.push(`<b>HAS em Atraso:</b> ${p.nome} (${meses} meses sem consulta)`);
        }
        if (p.ampi?.violencia) {
            alertas.push(`⚠️ <b>Risco Crítico:</b> Sinalização de violência doméstica no idoso(a) ${p.nome}.`);
        }
    });

    if (alertas.length > 0) {
        sino.style.display = "inline-block";
        painel.innerHTML = `<h3>🚨 Notificações Ativas</h3>` + alertas.map(a => `<div class="alerta-item" style="padding:8px; border-bottom:1px solid #fee2e2; color:#b91c1c;">${a}</div>`).join("");
    } else {
        sino.style.display = "none";
        painel.style.display = "none";
    }
}

function toggleAlertas() {
    const painel = document.getElementById("alertasPainel");
    if (painel) painel.style.display = painel.style.display === "none" ? "block" : "none";
}

/* ============================================================
   🗄️ CONSOLIDAÇÃO DA VISÃO GERAL (ABA BANCO DE DADOS)
============================================================ */
function listarBanco() {
    const container = document.getElementById("tabelaBancoContainer");
    if (!container) return;

    let html = `<table><thead><tr><th>Nome</th><th>CPF / Idade</th><th>Condições</th><th>Ações</th></tr></thead><tbody>`;
    pacientes.forEach(p => {
        let badges = [];
        if (p.condicoes?.has === "Sim") badges.push(`<span class='badge' style='background:#2563eb; color:#fff;'>HAS</span>`);
        if (p.condicoes?.dm === "Sim") badges.push(`<span class='badge' style='background:#16a34a; color:#fff;'>DM</span>`);
        if (p.condicoes?.gestante === "Sim") badges.push(`<span class='badge' style='background:#ec4899; color:#fff;'>Gest</span>`);

        html += `
            <tr>
                <td><strong>${escapeHTML(p.nome)}</strong></td>
                <td>${escapeHTML(p.cpf)}<br><small>${escapeHTML(p.idade)}</small></td>
                <td>${badges.join(" ")}</td>
                <td>
                    <button class="btn-primary" style="padding:4px 8px; font-size:12px;" onclick="carregarPacienteNoProntuario('${p.id}')">Editar</button>
                    <button class="btn-primary" style="padding:4px 8px; font-size:12px; background:#dc2626;" onclick="excluirPaciente('${p.id}')">Excluir</button>
                </td>
            </tr>
        `;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
}

/* ============================================================
   🤝 ATAS DE REUNIÕES CLÍNICAS (PTS COLETIVO)
============================================================ */
function salvarReuniao() {
    const pauta = document.getElementById("rPauta")?.value.trim();
    const data = document.getElementById("rData")?.value || new Date().toISOString().split("T")[0];

    if (!pauta) {
        alert("O preenchimento da pauta é obrigatório para registrar a Ata.");
        return;
    }

    const novaAta = {
        id: "r_" + Date.now(),
        data,
        pauta,
        casos: document.getElementById("rCasos").value,
        acoes: document.getElementById("rAcoes").value
    };

    reunioesClinicas.push(novaAta);
    localStorage.setItem("reunioesClinicas", JSON.stringify(reunioesClinicas));
    registrarLog("Registrar Ata", `Ata de Reunião com a pauta "${pauta}" gravada.`);

    document.getElementById("rPauta").value = "";
    document.getElementById("rCasos").value = "";
    document.getElementById("rAcoes").value = "";

    listarReunioes();
    alert("Ata de Reunião documentada com sucesso!");
}

function listarReunioes() {
    const container = document.getElementById("listaReunioesContainer");
    if (!container) return;

    if (reunioesClinicas.length === 0) {
        container.innerHTML = "<em>Nenhuma ata de reunião registrada no sistema.</em>";
        return;
    }

    container.innerHTML = reunioesClinicas.map(r => `
        <div class="card" style="border-left: 5px solid #0b6efd; margin-bottom:10px;">
            <h4>Data: ${r.data} — Pauta: ${escapeHTML(r.pauta)}</h4>
            <p><b>Casos Discutidos:</b> ${escapeHTML(r.casos || "Nenhum")}</p>
            <p><b>Deliberações:</b> ${escapeHTML(r.acoes || "Nenhuma")}</p>
        </div>
    `).join("");
}

/* ============================================================
   🛡️ SISTEMA DE LOGS E AUDITORIA COMPLETO
============================================================ */
function registrarLog(acao, detalhe) {
    const log = {
        data: new Date().toLocaleString("pt-BR"),
        usuario: "Profissional Logado",
        acao,
        detalhe
    };
    auditoriaLogs.unshift(log);
    localStorage.setItem("auditoriaLogs", JSON.stringify(auditoriaLogs));
}

function listarAuditoria() {
    const container = document.getElementById("logAuditoriaContainer");
    if (!container) return;

    if (auditoriaLogs.length === 0) {
        container.innerHTML = "<em>Nenhum log no banco de auditoria.</em>";
        return;
    }

    let html = "<table><thead><tr><th>Data</th><th>Ação</th><th>Detalhes</th></tr></thead><tbody>";
    auditoriaLogs.forEach(l => {
        html += `<tr><td><small>${l.data}</small></td><td><b>${l.acao}</b></td><td><small>${escapeHTML(l.detalhe)}</small></td></tr>`;
    });
    html += "</tbody></table>";
    container.innerHTML = html;
}

function limparAuditoria() {
    if (confirm("Deseja expurgar todos os registros de auditoria definitivamente?")) {
        auditoriaLogs = [];
        localStorage.removeItem("auditoriaLogs");
        listarAuditoria();
    }
}

/* ============================================================
   📈 INTEGRAÇÃO COM GRÁFICOS (CHART.JS) PARA LINHAS DE CUIDADO
============================================================ */
let instanceChart = null;

function renderizarGraficosLinhas(linha) {
    const container = document.getElementById("graficosLinhasContainer");
    if (!container) return;

    container.innerHTML = `<canvas id="canvasLinhas" style="max-height: 280px;"></canvas>`;
    const ctx = document.getElementById("canvasLinhas").getContext("2d");

    let sim = 0, nao = 0;
    pacientes.forEach(p => {
        if (linha === "HAS" && p.condicoes?.has === "Sim") sim++;
        if (linha === "DM" && p.condicoes?.dm === "Sim") sim++;
        if (linha === "GEST" && p.condicoes?.gestante === "Sim") sim++;
    });
    nao = pacientes.length - sim;

    if (instanceChart) instanceChart.destroy();

    instanceChart = new Chart(ctx, {
        type: "pie",
        data: {
            labels: ["Pacientes Vinculados", "Sem Vínculo"],
            datasets: [{
                data: [sim, nao],
                backgroundColor: ["#0b6efd", "#cbd5e1"]
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

/* ============================================================
   🗂️ BACKUP JSON & EXPORTAÇÕES DE SEGURANÇA
============================================================ */
function exportarBackupJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(pacientes));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `SintaxeHub_Backup_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    registrarLog("Backup", "Cópia de segurança JSON exportada pelo operador.");
}

function importarBackupJSON(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importado = JSON.parse(e.target.result);
            if (Array.isArray(importado)) {
                pacientes = importado;
                localStorage.setItem("bancoPacientes", JSON.stringify(pacientes));
                alert("Backup restaurado e sincronizado com êxito!");
                atualizarInicio();
                listarBanco();
            }
        } catch (err) {
            alert("Ficheiro JSON inválido ou corrompido.");
        }
    };
    reader.readAsText(file);
}

/* ============================================================
   🚪 MODAL LATERAL (DRAWER DE VISUALIZAÇÃO DE DETALHES)
============================================================ */
function abrirDrawer(id) {
    const p = pacientes.find(x => x.id === id);
    if (!p) return;

    document.getElementById("drawerTitulo").innerText = p.nome;
    const conteudo = document.getElementById("drawerConteudo");
    
    let htmlEvolucoes = "<h4>Evoluções Registradas:</h4>";
    if (p.evolucoes && p.evolucoes.length > 0) {
        p.evolucoes.forEach(e => {
            htmlEvolucoes += `<p><small>${e.data}:</small> ${escapeHTML(e.texto)}</p>`;
        });
    } else {
        htmlEvolucoes += "<p>Nenhuma evolução anexada.</p>";
    }

    conteudo.innerHTML = `
        <p><b>CPF:</b> ${p.cpf}</p>
        <p><b>Data de Nascimento:</b> ${p.nascimento} (${p.idade})</p>
        <p><b>Equipe / Unidade:</b> ${p.equipe} / ${p.unidade}</p>
        <hr>
        ${htmlEvolucoes}
    `;

    document.getElementById("drawer").style.display = "block";
    document.getElementById("drawerOverlay").style.display = "block";
}

function fecharDrawer() {
    if (document.getElementById("drawer")) document.getElementById("drawer").style.display = "none";
    if (document.getElementById("drawerOverlay")) document.getElementById("drawerOverlay").style.display = "none";
}

/* ============================================================
   🔒 MÁSCARAS E HIGIENIZAÇÃO DE ENTRADAS (ANTI-XSS)
============================================================ */
function mascaraCPF(el) {
    let v = el.value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    el.value = v;
}

function escapeHTML(text) {
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* ============================================================
   🚀 INICIALIZAÇÃO AUTOMÁTICA DO ECOSSISTEMA
============================================================ */
function initApp() {
    atualizarInicio();
    verificarAlertas();
    
    // Vincula listeners de pesquisa dinâmica aos campos da tela inicial
    document.getElementById("buscaNomeInicio")?.addEventListener("input", buscarInicio);
    document.getElementById("buscaCPFInicio")?.addEventListener("input", buscarInicio);
}

window.onload = initApp;
