// ======================================================
// SINTAXEHUB - REUNIAO.JS
// SUPABASE PURO
// ======================================================

let pacientesReuniao = [];

/* ======================================================
   ABRIR MÓDULO
   ====================================================== */

async function abrirModuloReuniao() {
    await carregarPacientesParaDiscussao();
    await carregarHistoricoReunioes();
}

/* ======================================================
   CARREGAR PACIENTES
   ====================================================== */

async function carregarPacientesParaDiscussao() {
    const select = document.getElementById("reuniaoPacienteCaso");
    if (!select) return;

    select.innerHTML = '<option value="">Carregando pacientes...</option>';

    const { data, error } = await supabaseClient
        .from("pacientes")
        .select("id, nome, cpf, cns, ubs, equipe")
        .order("nome", { ascending: true });

    if (error) {
        console.error("Erro ao carregar pacientes:", error);
        select.innerHTML = '<option value="">Erro ao carregar pacientes</option>';
        return;
    }

    pacientesReuniao = data || [];

    select.innerHTML = '<option value="">-- Selecione um paciente --</option>';

    pacientesReuniao.forEach(p => {
        const option = document.createElement("option");
        option.value = p.id;
        option.textContent =
            `${p.nome || "Sem nome"} - CPF: ${p.cpf || "-"} CNS: ${p.cns || "-"}`;
        select.appendChild(option);
    });
}

/* ======================================================
   PAUTAS / ENCAMINHAMENTOS
   ====================================================== */

function adicionarItemPauta() {
    const lista = document.getElementById("listaItensPauta");
    if (!lista) return;

    const item = document.createElement("div");
    item.className = "form-grid item-pauta";
    item.style.marginBottom = "10px";

    item.innerHTML = `
        <div style="grid-column: span 3;">
            <label>Tema da pauta</label>
            <input type="text" class="pauta-tema" placeholder="Ex: Busca ativa de hipertensos críticos">
        </div>

        <div>
            <label>Prioridade</label>
            <select class="pauta-prioridade">
                <option value="Baixa">Baixa</option>
                <option value="Média">Média</option>
                <option value="Alta">Alta</option>
                <option value="Crítica">Crítica</option>
            </select>
        </div>

        <div style="grid-column: span 4;">
            <label>Discussão / Observações</label>
            <textarea class="pauta-observacao" rows="2"></textarea>
        </div>
    `;

    lista.appendChild(item);
}

function adicionarEncaminhamento() {
    const lista = document.getElementById("listaEncaminhamentos");
    if (!lista) return;

    const item = document.createElement("div");
    item.className = "form-grid item-encaminhamento";
    item.style.marginBottom = "10px";

    item.innerHTML = `
        <div style="grid-column: span 2;">
            <label>Ação / Encaminhamento</label>
            <input type="text" class="enc-acao">
        </div>

        <div>
            <label>Responsável</label>
            <input type="text" class="enc-responsavel">
        </div>

        <div>
            <label>Prazo</label>
            <input type="date" class="enc-prazo">
        </div>
    `;

    lista.appendChild(item);
}

/* ======================================================
   DISCUSSÃO DE CASO → ATENDIMENTOS
   ====================================================== */

async function registrarDiscussaoCasoNoProntuario() {
    const pacienteId =
        document.getElementById("reuniaoPacienteCaso")?.value;

    const discussao =
        document.getElementById("reuniaoDiscussaoCaso")?.value || "";

    const conduta =
        document.getElementById("reuniaoCondutaCaso")?.value || "";

    if (!pacienteId) {
        alert("Selecione um paciente.");
        return;
    }

    if (!discussao.trim()) {
        alert("Descreva a discussão do caso.");
        return;
    }

    const paciente =
        pacientesReuniao.find(p => String(p.id) === String(pacienteId));

    if (!paciente) {
        alert("Paciente não encontrado.");
        return;
    }

    const usuario = getUsuarioReuniao();

    const atendimento = {
        cpf: paciente.cpf || null,
        cns: paciente.cns || null,
        nome_paciente: paciente.nome || null,

        soapSubjetivo: "Discussão realizada em reunião de equipe.",
        soapObjetivoAlterado: "Caso avaliado pela equipe multiprofissional.",
        inputBuscaCIAPS: "Discussão de caso em reunião de equipe",
        soapPlanoConduta: conduta || "Conduta a definir conforme equipe.",
        reavaliacaoDias: null,

        origem: "Reunião de Equipe",
        discussao_caso: discussao,

        usuario_id: usuario.usuario_id,
        usuario_nome: usuario.usuario_nome,
        usuario_perfil: usuario.usuario_perfil
    };

    const { error } = await supabaseClient
        .from("atendimentos")
        .insert(atendimento);

    if (error) {
        console.error("Erro ao registrar discussão:", error);
        mostrarToast?.("❌ Erro ao registrar discussão.");
        return;
    }

    adicionarCasoNaAta(paciente, discussao, conduta);

    document.getElementById("reuniaoDiscussaoCaso").value = "";
    document.getElementById("reuniaoCondutaCaso").value = "";

    mostrarToast?.("✅ Discussão registrada no prontuário.");
}

function adicionarCasoNaAta(paciente, discussao, conduta) {
    const lista = document.getElementById("listaCasosDiscussao");
    if (!lista) return;

    const item = document.createElement("div");
    item.className = "item-caso-discutido";
    item.style.background = "#111c2e";
    item.style.border = "1px solid var(--border)";
    item.style.borderRadius = "6px";
    item.style.padding = "10px";
    item.style.marginBottom = "10px";

    item.innerHTML = `
        <strong>${paciente.nome || "Paciente sem nome"}</strong><br>
        <small>CPF: ${paciente.cpf || "-"} | CNS: ${paciente.cns || "-"}</small>
        <p><b>Discussão:</b> ${discussao}</p>
        <p><b>Conduta:</b> ${conduta || "-"}</p>

        <input type="hidden" class="caso-nome" value="${paciente.nome || ""}">
        <input type="hidden" class="caso-cpf" value="${paciente.cpf || ""}">
        <input type="hidden" class="caso-cns" value="${paciente.cns || ""}">
        <input type="hidden" class="caso-discussao" value="${discussao}">
        <input type="hidden" class="caso-conduta" value="${conduta}">
    `;

    lista.appendChild(item);
}

/* ======================================================
   COLETAR DADOS
   ====================================================== */

function coletarDadosReuniao() {
    const pautas =
        Array.from(document.querySelectorAll(".item-pauta"))
            .map(item => ({
                tema: item.querySelector(".pauta-tema")?.value || "",
                prioridade: item.querySelector(".pauta-prioridade")?.value || "",
                observacao: item.querySelector(".pauta-observacao")?.value || ""
            }))
            .filter(p => p.tema.trim() !== "");

    const encaminhamentos =
        Array.from(document.querySelectorAll(".item-encaminhamento"))
            .map(item => ({
                acao: item.querySelector(".enc-acao")?.value || "",
                responsavel: item.querySelector(".enc-responsavel")?.value || "",
                prazo: item.querySelector(".enc-prazo")?.value || ""
            }))
            .filter(e => e.acao.trim() !== "");

    const casos =
        Array.from(document.querySelectorAll(".item-caso-discutido"))
            .map(item => ({
                nome: item.querySelector(".caso-nome")?.value || "",
                cpf: item.querySelector(".caso-cpf")?.value || "",
                cns: item.querySelector(".caso-cns")?.value || "",
                discussao: item.querySelector(".caso-discussao")?.value || "",
                conduta: item.querySelector(".caso-conduta")?.value || ""
            }));

    return {
        data_reuniao: document.getElementById("reuniaoData")?.value || null,
        horario: document.getElementById("reuniaoHorario")?.value || null,
        local: document.getElementById("reuniaoLocal")?.value || null,
        coordenador: document.getElementById("reuniaoCoordenador")?.value || null,
        participantes: document.getElementById("reuniaoParticipantes")?.value || null,
        informes: document.getElementById("reuniaoInformes")?.value || null,
        pautas,
        casos,
        encaminhamentos,
        consideracoes: document.getElementById("reuniaoConsideracoes")?.value || null,
        criado_em: new Date().toISOString()
    };
}

/* ======================================================
   SALVAR REUNIÃO
   ====================================================== */

async function salvarReuniaoEquipe() {
    const reuniao = coletarDadosReuniao();

    if (!reuniao.data_reuniao) {
        alert("Informe a data da reunião.");
        return;
    }

    const usuario = getUsuarioReuniao();

    const payload = {
        ...reuniao,
        usuario_id: usuario.usuario_id,
        usuario_nome: usuario.usuario_nome,
        usuario_perfil: usuario.usuario_perfil
    };

    const { data, error } = await supabaseClient
        .from("reunioes")
        .insert(payload)
        .select()
        .single();

    if (error) {
        console.error("Erro ao salvar reunião:", error);
        mostrarToast?.("❌ Erro ao salvar reunião.");
        return;
    }

    gerarAtaReuniao(data);
    await carregarHistoricoReunioes();

    mostrarToast?.("✅ Reunião salva no Supabase.");
}

/* ======================================================
   ATA
   ====================================================== */

function gerarAtaReuniao(reuniao = null) {
    if (!reuniao) reuniao = coletarDadosReuniao();

    const pautas = Array.isArray(reuniao.pautas) ? reuniao.pautas : [];
    const casos = Array.isArray(reuniao.casos) ? reuniao.casos : [];
    const encaminhamentos = Array.isArray(reuniao.encaminhamentos) ? reuniao.encaminhamentos : [];

    const ata = `
ATA / PAUTA DE REUNIÃO DE EQUIPE

Data: ${reuniao.data_reuniao || reuniao.data || "-"}
Horário: ${reuniao.horario || "-"}
Local: ${reuniao.local || "-"}
Coordenação: ${reuniao.coordenador || "-"}

PARTICIPANTES:
${reuniao.participantes || "-"}

INFORMES GERAIS:
${reuniao.informes || "-"}

PAUTAS DISCUTIDAS:
${pautas.length ? pautas.map((p, i) => `
${i + 1}. ${p.tema}
Prioridade: ${p.prioridade}
Observações: ${p.observacao || "-"}
`).join("\n") : "-"}

DISCUSSÃO DE CASOS:
${casos.length ? casos.map((c, i) => `
${i + 1}. ${c.nome}
CPF: ${c.cpf || "-"}
CNS: ${c.cns || "-"}
Discussão: ${c.discussao}
Conduta: ${c.conduta || "-"}
`).join("\n") : "-"}

ENCAMINHAMENTOS:
${encaminhamentos.length ? encaminhamentos.map((e, i) => `
${i + 1}. ${e.acao}
Responsável: ${e.responsavel || "-"}
Prazo: ${e.prazo || "-"}
`).join("\n") : "-"}

CONSIDERAÇÕES FINAIS:
${reuniao.consideracoes || "-"}
    `.trim();

    const saida = document.getElementById("ataReuniaoGerada");
    if (saida) saida.value = ata;
}

function imprimirAtaReuniao() {
    gerarAtaReuniao();

    const ata =
        document.getElementById("ataReuniaoGerada")?.value || "";

    const janela =
        window.open("", "_blank");

    janela.document.write(`
        <html>
        <head>
            <title>Ata de Reunião de Equipe</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 30px;
                    line-height: 1.5;
                    color: #111;
                }
                h1 {
                    text-align: center;
                    font-size: 20px;
                }
                pre {
                    white-space: pre-wrap;
                    font-family: Arial, sans-serif;
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            <h1>Ata de Reunião de Equipe</h1>
            <pre>${ata}</pre>
        </body>
        </html>
    `);

    janela.document.close();
    janela.print();
}

function copiarAtaReuniao() {
    const campo =
        document.getElementById("ataReuniaoGerada");

    if (!campo.value.trim()) {
        gerarAtaReuniao();
    }

    campo.select();
    document.execCommand("copy");

    mostrarToast?.("Ata copiada.");
}

/* ======================================================
   HISTÓRICO SUPABASE
   ====================================================== */

async function carregarHistoricoReunioes() {
    const container =
        document.getElementById("historicoReunioes");

    if (!container) return;

    const { data, error } = await supabaseClient
        .from("reunioes")
        .select("*")
        .order("data_reuniao", { ascending: false });

    if (error) {
        console.error("Erro ao carregar reuniões:", error);
        container.innerHTML =
            '<p style="color:var(--danger);">Erro ao carregar reuniões.</p>';
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML =
            '<p style="color:var(--text-muted);">Nenhuma reunião registrada ainda.</p>';
        return;
    }

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Horário</th>
                    <th>Local</th>
                    <th>Coordenação</th>
                    <th>Registrado por</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${data.map(r => `
                    <tr>
                        <td>${r.data_reuniao || "-"}</td>
                        <td>${r.horario || "-"}</td>
                        <td>${r.local || "-"}</td>
                        <td>${r.coordenador || "-"}</td>
                        <td>${r.usuario_nome || "-"}</td>
                        <td>
                            <button class="btn-table-action btn-edit" onclick="visualizarReuniao('${r.id}')">Ver ata</button>
                            <button class="btn-table-action btn-edit" onclick="imprimirAtaHistorico('${r.id}')">Imprimir</button>
                            <button class="btn-table-action btn-del" onclick="excluirReuniao('${r.id}')">Excluir</button>
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

async function visualizarReuniao(id) {
    const { data, error } = await supabaseClient
        .from("reunioes")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        console.error("Erro ao abrir reunião:", error);
        mostrarToast?.("❌ Erro ao abrir ata.");
        return;
    }

    gerarAtaReuniao(data);
}

async function imprimirAtaHistorico(id) {
    await visualizarReuniao(id);
    imprimirAtaReuniao();
}

async function excluirReuniao(id) {
    if (!confirm("Deseja excluir esta reunião?")) return;

    const { error } = await supabaseClient
        .from("reunioes")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Erro ao excluir reunião:", error);
        mostrarToast?.("❌ Erro ao excluir reunião.");
        return;
    }

    await carregarHistoricoReunioes();
    mostrarToast?.("🗑️ Reunião excluída.");
}

/* ======================================================
   LIMPAR
   ====================================================== */

function limparFormularioReuniao() {
    document
        .querySelectorAll("#view-reuniao input, #view-reuniao textarea")
        .forEach(el => {
            el.value = "";
        });

    document.getElementById("listaItensPauta").innerHTML = "";
    document.getElementById("listaEncaminhamentos").innerHTML = "";
    document.getElementById("listaCasosDiscussao").innerHTML = "";
    document.getElementById("ataReuniaoGerada").value = "";

    adicionarItemPauta();
    adicionarEncaminhamento();
}

/* ======================================================
   AUDITORIA
   ====================================================== */

function getUsuarioReuniao() {
    const usuario =
        window.usuarioLogado || {};

    return {
        usuario_id: usuario.id || null,
        usuario_nome: usuario.nome || usuario.email || null,
        usuario_perfil: usuario.perfil || null
    };
}

/* ======================================================
   GLOBAL
   ====================================================== */

window.abrirModuloReuniao = abrirModuloReuniao;
window.adicionarItemPauta = adicionarItemPauta;
window.adicionarEncaminhamento = adicionarEncaminhamento;
window.registrarDiscussaoCasoNoProntuario = registrarDiscussaoCasoNoProntuario;
window.salvarReuniaoEquipe = salvarReuniaoEquipe;
window.gerarAtaReuniao = gerarAtaReuniao;
window.imprimirAtaReuniao = imprimirAtaReuniao;
window.copiarAtaReuniao = copiarAtaReuniao;
window.limparFormularioReuniao = limparFormularioReuniao;
window.visualizarReuniao = visualizarReuniao;
window.imprimirAtaHistorico = imprimirAtaHistorico;
window.excluirReuniao = excluirReuniao;

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("listaItensPauta")) adicionarItemPauta();
    if (document.getElementById("listaEncaminhamentos")) adicionarEncaminhamento();
});
