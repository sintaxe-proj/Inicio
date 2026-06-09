// ======================================================
// SINTAXEHUB - REUNIAO.JS
// SUPABASE PURO
// pacientes = identificação
// atendimentos = registro clínico / discussões
// ======================================================

let pacientesReuniao = [];

/* ======================================================
   ABRIR MÓDULO
   ====================================================== */

async function abrirModuloReuniao() {
    await carregarPacientesParaDiscussao();
    await carregarHistoricoReunioes();
    await carregarPacientesReuniao();
}

/* ======================================================
   CARREGAR PACIENTES
   ====================================================== */

async function carregarPacientesParaDiscussao() {
    const select = document.getElementById("reuniaoPacienteCaso");
    if (!select) return;

    if (typeof supabaseClient === "undefined") {
        select.innerHTML = '<option value="">Supabase não carregado</option>';
        return;
    }

    select.innerHTML = '<option value="">Carregando pacientes...</option>';

    const { data, error } = await supabaseClient
        .from("pacientes")
        .select(`
            id,
            nome,
            cpf,
            cns,
            ubs,
            equipe,
            ubs_vinculacao,
            equipe_esf
        `)
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

        const ubs =
            p.ubs_vinculacao ||
            p.ubs ||
            "UBS não informada";

        const equipe =
            p.equipe_esf ||
            p.equipe ||
            "Equipe não informada";

        option.textContent =
            `${p.nome || "Sem nome"} - CPF: ${p.cpf || "-"} CNS: ${p.cns || "-"} | ${ubs} / ${equipe}`;

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

    const textoSubjetivo =
        "Discussão realizada em reunião de equipe.";

    const textoObjetivo =
        "Caso avaliado pela equipe multiprofissional.";

    const textoAvaliacao =
        "Discussão de caso em reunião de equipe";

    const textoPlano =
        conduta || "Conduta a definir conforme equipe.";

    const atendimento = {
        paciente_cpf: paciente.cpf || null,
        cpf: paciente.cpf || null,
        cns: paciente.cns || null,
        nome_paciente: paciente.nome || null,

        ubs_vinculacao:
            paciente.ubs_vinculacao ||
            paciente.ubs ||
            null,

        equipe_esf:
            paciente.equipe_esf ||
            paciente.equipe ||
            null,

        subjetivo: textoSubjetivo,
        objetivo: textoObjetivo,
        avaliacao: textoAvaliacao,
        plano: textoPlano,

        soapSubjetivo: textoSubjetivo,
        soapObjetivoAlterado: textoObjetivo,
        inputBuscaCIAPS: textoAvaliacao,
        soapPlanoConduta: textoPlano,

        reavaliacaoDias: null,
        retorno_dias: null,

        origem: "Reunião de Equipe",
        discussao_caso: discussao,

        criado_em: new Date().toISOString(),
        data_atendimento: new Date().toISOString(),

        usuario_id: usuario.usuario_id,
        usuario_nome: usuario.usuario_nome,
        usuario_email: usuario.usuario_email,
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

    const campoDiscussao =
        document.getElementById("reuniaoDiscussaoCaso");

    const campoConduta =
        document.getElementById("reuniaoCondutaCaso");

    if (campoDiscussao) campoDiscussao.value = "";
    if (campoConduta) campoConduta.value = "";

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

    const ubs =
        paciente.ubs_vinculacao ||
        paciente.ubs ||
        "";

    const equipe =
        paciente.equipe_esf ||
        paciente.equipe ||
        "";

    item.innerHTML = `
        <strong>${paciente.nome || "Paciente sem nome"}</strong><br>
        <small>
            CPF: ${paciente.cpf || "-"} |
            CNS: ${paciente.cns || "-"} |
            UBS: ${ubs || "-"} |
            Equipe: ${equipe || "-"}
        </small>

        <p><b>Discussão:</b> ${discussao}</p>
        <p><b>Conduta:</b> ${conduta || "-"}</p>

        <input type="hidden" class="caso-nome" value="${escaparReuniao(paciente.nome || "")}">
        <input type="hidden" class="caso-cpf" value="${escaparReuniao(paciente.cpf || "")}">
        <input type="hidden" class="caso-cns" value="${escaparReuniao(paciente.cns || "")}">
        <input type="hidden" class="caso-ubs" value="${escaparReuniao(ubs || "")}">
        <input type="hidden" class="caso-equipe" value="${escaparReuniao(equipe || "")}">
        <input type="hidden" class="caso-discussao" value="${escaparReuniao(discussao)}">
        <input type="hidden" class="caso-conduta" value="${escaparReuniao(conduta)}">
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
                ubs: item.querySelector(".caso-ubs")?.value || "",
                equipe: item.querySelector(".caso-equipe")?.value || "",
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
        usuario_email: usuario.usuario_email,
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
UBS: ${c.ubs || "-"}
Equipe: ${c.equipe || "-"}
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

    if (!janela) {
        alert("Não foi possível abrir a janela de impressão.");
        return;
    }

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
            <pre>${escaparHTMLReuniao(ata)}</pre>
        </body>
        </html>
    `);

    janela.document.close();
    janela.print();
}

function copiarAtaReuniao() {
    const campo =
        document.getElementById("ataReuniaoGerada");

    if (!campo) return;

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

    if (typeof supabaseClient === "undefined") {
        container.innerHTML =
            '<p style="color:var(--danger);">Supabase não carregado.</p>';
        return;
    }

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

    const listaPauta = document.getElementById("listaItensPauta");
    const listaEnc = document.getElementById("listaEncaminhamentos");
    const listaCasos = document.getElementById("listaCasosDiscussao");
    const ata = document.getElementById("ataReuniaoGerada");

    if (listaPauta) listaPauta.innerHTML = "";
    if (listaEnc) listaEnc.innerHTML = "";
    if (listaCasos) listaCasos.innerHTML = "";
    if (ata) ata.value = "";

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
        usuario_email: usuario.email || null,
        usuario_perfil: usuario.perfil || null
    };
}

/* ======================================================
   HELPERS
   ====================================================== */

function escaparReuniao(valor) {
    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function escaparHTMLReuniao(valor) {
    return String(valor || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/* ======================================================
   GLOBAL
   ====================================================== */

window.abrirModuloReuniao = abrirModuloReuniao;
window.carregarPacientesParaDiscussao = carregarPacientesParaDiscussao;
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

let pacientesReuniaoCache = [];

async function carregarPacientesReuniao() {

    const { data, error } =
        await supabaseClient
            .from("pacientes")
            .select(`
                cpf,
                cns,
                nome
            `)
            .order("nome");

    if (error) {
        console.error(error);
        return;
    }

    pacientesReuniaoCache =
        data || [];
}

function filtrarPacientesReuniao() {

    const termo =
        document
            .getElementById("buscaPacienteReuniao")
            .value
            .toLowerCase()
            .trim();

    const container =
        document.getElementById(
            "resultadoBuscaPacienteReuniao"
        );

    if (!container) return;

    if (!termo) {
        container.innerHTML = "";
        return;
    }

    const encontrados =
        pacientesReuniaoCache
            .filter(p =>
                (p.nome || "")
                    .toLowerCase()
                    .includes(termo)
                ||
                (p.cpf || "")
                    .includes(termo)
                ||
                (p.cns || "")
                    .includes(termo)
            )
            .slice(0, 15);

    container.innerHTML =
        encontrados.map(p => `
            <div
                class="item-paciente-reuniao"
                onclick="
                    selecionarPacienteReuniao(
                        '${p.cpf || ""}',
                        '${p.nome || ""}'
                    )
                ">

                <strong>${p.nome}</strong><br>

                CPF: ${p.cpf || "-"}
            </div>
        `).join("");
}

function selecionarPacienteReuniao(
    cpf,
    nome
) {

    document.getElementById(
        "reuniaoPacienteCaso"
    ).value = cpf;

    document.getElementById(
        "buscaPacienteReuniao"
    ).value = nome;

    document.getElementById(
        "resultadoBuscaPacienteReuniao"
    ).innerHTML = "";
}
