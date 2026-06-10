/* ==========================================================
   🏠 VISITA DOMICILIAR APS — SINTAXEHUB
   Base sociofamiliar inspirada nas dimensões EVFAM-BR:
   renda, cuidado em saúde, família e violência.
   ========================================================== */

let visitaDomiciliarAtual = {
    paciente: null,
    modo: "ACS"
};

/* ==========================================================
   ABERTURA
   ========================================================== */

function abrirModuloVisitaDomiciliarAPS(cpf = "", cns = "", modo = "ACS") {
    if (typeof navigate === "function") {
        navigate("visita-domiciliar-aps");
    }

    setTimeout(() => {
        const cpfCampo =
            document.getElementById("visitaPacienteCPF");

        const cnsCampo =
            document.getElementById("visitaPacienteCNS");

        const modoCampo =
            document.getElementById("visitaTipoVisita");

        if (cpfCampo) cpfCampo.value = cpf || window.pacienteAtual?.cpf || "";
        if (cnsCampo) cnsCampo.value = cns || window.pacienteAtual?.cns || "";
        if (modoCampo) modoCampo.value = modo || "ACS";

        alternarTipoVisitaDomiciliarAPS();
        localizarPacienteVisitaDomiciliarAPS();
    }, 300);
}

async function localizarPacienteVisitaDomiciliarAPS() {
    const cpf =
        limparDocumentoVisitaAPS(
            document.getElementById("visitaPacienteCPF")?.value ||
            ""
        );

    const cns =
        limparDocumentoVisitaAPS(
            document.getElementById("visitaPacienteCNS")?.value ||
            ""
        );

    const nome =
        document.getElementById("visitaBuscaNome")?.value?.trim() || "";

    if (!cpf && !cns && !nome) {
        mostrarStatusVisitaAPS("Informe CPF, CNS ou nome para localizar o cidadão.", "warn");
        return null;
    }

    let query =
        supabaseClient
            .from("pacientes")
            .select("*")
            .limit(1);

    if (cpf && cns) {
        query = query.or(`cpf.eq.${cpf},cns.eq.${cns}`);
    } else if (cpf) {
        query = query.eq("cpf", cpf);
    } else if (cns) {
        query = query.eq("cns", cns);
    } else {
        query = query.ilike("nome", `%${nome}%`);
    }

    const { data, error } =
        await query;

    if (error) {
        console.error("Erro ao localizar paciente para visita:", error);
        mostrarStatusVisitaAPS("Erro ao localizar paciente.", "danger");
        return null;
    }

    const paciente =
        data?.[0] || null;

    visitaDomiciliarAtual.paciente =
        paciente;

    preencherPacienteVisitaAPS(paciente);

    return paciente;
}

function preencherPacienteVisitaAPS(paciente) {
    const box =
        document.getElementById("visitaPacienteResumo");

    if (!box) return;

    if (!paciente) {
        box.innerHTML =
            `<p style="color:var(--text-muted);">Paciente não localizado.</p>`;
        return;
    }

    setValorVisitaAPS("visitaPacienteCPF", paciente.cpf || "");
    setValorVisitaAPS("visitaPacienteCNS", paciente.cns || "");

    box.innerHTML =
        `<div class="form-section" style="border-left:5px solid var(--primary);">
            <strong>${escaparVisitaAPS(paciente.nome || "Paciente")}</strong>
            <p style="color:var(--text-muted); margin:6px 0 0 0;">
                CPF: ${escaparVisitaAPS(paciente.cpf || "-")}
                · CNS: ${escaparVisitaAPS(paciente.cns || "-")}
                · Equipe: ${escaparVisitaAPS(paciente.equipe_esf || paciente.equipe || "-")}
                · UBS: ${escaparVisitaAPS(paciente.ubs_vinculacao || paciente.ubs || "-")}
            </p>
        </div>`;
}

/* ==========================================================
   TIPO DE VISITA
   ========================================================== */

function alternarTipoVisitaDomiciliarAPS() {
    const tipo =
        document.getElementById("visitaTipoVisita")?.value || "ACS";

    visitaDomiciliarAtual.modo =
        tipo;

    const blocoClinico =
        document.getElementById("blocoVisitaClinicaAPS");

    const blocoACS =
        document.getElementById("blocoVisitaACSAPS");

    if (blocoClinico) {
        blocoClinico.style.display =
            tipo === "ACS" ? "none" : "block";
    }

    if (blocoACS) {
        blocoACS.style.display =
            "block";
    }

    calcularEVFAMFormularioVisitaAPS();
}

/* ==========================================================
   EVFAM OPERACIONAL NO FORMULÁRIO
   ========================================================== */

function calcularEVFAMFormularioVisitaAPS() {
    const renda =
        pontuarDimensaoVisitaAPS([
            ["rendaInsuficiente", 2],
            ["insegurancaAlimentar", 3],
            ["moradiaInadequada", 2],
            ["saneamentoInadequado", 2]
        ]);

    const cuidado =
        pontuarDimensaoVisitaAPS([
            ["acamado", 4],
            ["restricaoMobilidade", 3],
            ["dificuldadeAcessoUBS", 2],
            ["usoInadequadoMedicamentos", 3],
            ["abandonoTratamento", 3],
            ["riscoQueda", 2],
            ["necessidadeCurativo", 2]
        ]);

    const familia =
        pontuarDimensaoVisitaAPS([
            ["ausenciaCuidador", 4],
            ["cuidadorSobrecarregado", 2],
            ["idosoSozinho", 3],
            ["criancaSemResponsavel", 3],
            ["conflitoFamiliar", 3]
        ]);

    const violencia =
        pontuarDimensaoVisitaAPS([
            ["suspeitaViolencia", 5],
            ["violenciaDomestica", 5],
            ["negligencia", 4],
            ["usoAbusivoSubstancias", 3],
            ["riscoAutonegligencia", 4]
        ]);

    const total =
        renda + cuidado + familia + violencia;

    setTextoVisitaAPS("evfamRendaValor", renda);
    setTextoVisitaAPS("evfamCuidadoValor", cuidado);
    setTextoVisitaAPS("evfamFamiliaValor", familia);
    setTextoVisitaAPS("evfamViolenciaValor", violencia);
    setTextoVisitaAPS("evfamTotalValor", total);
    setTextoVisitaAPS("evfamClassificacaoValor", classificarEVFAMVisitaAPS(total));

    return {
        renda,
        cuidadoSaude: cuidado,
        familia,
        violencia,
        total,
        classificacao:
            classificarEVFAMVisitaAPS(total)
    };
}

function pontuarDimensaoVisitaAPS(itens) {
    return itens.reduce((total, [id, pontos]) => {
        const el =
            document.getElementById(id);

        return total + (el?.checked ? pontos : 0);
    }, 0);
}

function classificarEVFAMVisitaAPS(total) {
    if (total >= 18) return "Vulnerabilidade muito alta";
    if (total >= 12) return "Vulnerabilidade alta";
    if (total >= 6) return "Vulnerabilidade moderada";
    if (total > 0) return "Vulnerabilidade baixa";
    return "Sem vulnerabilidade registrada";
}

/* ==========================================================
   SALVAMENTO
   ========================================================== */

async function salvarVisitaDomiciliarAPS() {
    if (typeof supabaseClient === "undefined") {
        mostrarStatusVisitaAPS("Supabase não carregado.", "danger");
        return null;
    }

    let paciente =
        visitaDomiciliarAtual.paciente;

    if (!paciente) {
        paciente =
            await localizarPacienteVisitaDomiciliarAPS();
    }

    if (!paciente) {
        mostrarStatusVisitaAPS("Localize o paciente antes de salvar.", "warn");
        return null;
    }

    const evfam =
        calcularEVFAMFormularioVisitaAPS();

    const payload = {
        paciente_id:
            paciente.id || null,

        paciente_cpf:
            limparDocumentoVisitaAPS(
                document.getElementById("visitaPacienteCPF")?.value ||
                paciente.cpf ||
                ""
            ),

        paciente_cns:
            limparDocumentoVisitaAPS(
                document.getElementById("visitaPacienteCNS")?.value ||
                paciente.cns ||
                ""
            ),

        paciente_nome:
            paciente.nome || "",

        data_visita:
            document.getElementById("visitaData")?.value
                ? new Date(document.getElementById("visitaData").value).toISOString()
                : new Date().toISOString(),

        tipo_visita:
            document.getElementById("visitaTipoVisita")?.value || "ACS",

        tipo_profissional:
            document.getElementById("visitaTipoProfissional")?.value || "",

        responsavel:
            document.getElementById("visitaResponsavel")?.value || "",

        ubs:
            paciente.ubs_vinculacao || paciente.ubs || "",

        equipe:
            paciente.equipe_esf || paciente.equipe || "",

        microarea:
            document.getElementById("visitaMicroarea")?.value || paciente.microarea || "",

        evfam_renda:
            evfam.renda,

        evfam_cuidado_saude:
            evfam.cuidadoSaude,

        evfam_familia:
            evfam.familia,

        evfam_violencia:
            evfam.violencia,

        evfam_total:
            evfam.total,

        evfam_classificacao:
            evfam.classificacao,

        renda_insuficiente:
            checkedVisitaAPS("rendaInsuficiente"),

        inseguranca_alimentar:
            checkedVisitaAPS("insegurancaAlimentar"),

        moradia_inadequada:
            checkedVisitaAPS("moradiaInadequada"),

        saneamento_inadequado:
            checkedVisitaAPS("saneamentoInadequado"),

        acamado:
            checkedVisitaAPS("acamado"),

        restricao_mobilidade:
            checkedVisitaAPS("restricaoMobilidade"),

        dificuldade_acesso_ubs:
            checkedVisitaAPS("dificuldadeAcessoUBS"),

        uso_inadequado_medicamentos:
            checkedVisitaAPS("usoInadequadoMedicamentos"),

        abandono_tratamento:
            checkedVisitaAPS("abandonoTratamento"),

        risco_queda:
            checkedVisitaAPS("riscoQueda"),

        necessidade_curativo:
            checkedVisitaAPS("necessidadeCurativo"),

        ausencia_cuidador:
            checkedVisitaAPS("ausenciaCuidador"),

        cuidador_sobrecarregado:
            checkedVisitaAPS("cuidadorSobrecarregado"),

        idoso_sozinho:
            checkedVisitaAPS("idosoSozinho"),

        crianca_sem_responsavel:
            checkedVisitaAPS("criancaSemResponsavel"),

        conflito_familiar:
            checkedVisitaAPS("conflitoFamiliar"),

        suspeita_violencia:
            checkedVisitaAPS("suspeitaViolencia"),

        violencia_domestica:
            checkedVisitaAPS("violenciaDomestica"),

        negligencia:
            checkedVisitaAPS("negligencia"),

        uso_abusivo_substancias:
            checkedVisitaAPS("usoAbusivoSubstancias"),

        risco_autonegligencia:
            checkedVisitaAPS("riscoAutonegligencia"),

        morador_ausente:
            checkedVisitaAPS("moradorAusente"),

        mudou_endereco:
            checkedVisitaAPS("mudouEndereco"),

        necessita_retorno:
            checkedVisitaAPS("necessitaRetorno"),

        encaminhar_enfermagem:
            checkedVisitaAPS("encaminharEnfermagem"),

        encaminhar_medico:
            checkedVisitaAPS("encaminharMedico"),

        encaminhar_servico_social:
            checkedVisitaAPS("encaminharServicoSocial"),

        acionar_rede_protecao:
            checkedVisitaAPS("acionarRedeProtecao"),

        observacoes:
            document.getElementById("visitaObservacoes")?.value || "",

        conduta:
            document.getElementById("visitaConduta")?.value || "",

        criado_por:
            window.usuarioLogado?.email ||
            document.getElementById("nomeUsuarioLogado")?.innerText ||
            ""
    };

    const { data, error } =
        await supabaseClient
            .from("visitas_domiciliares")
            .insert([payload])
            .select()
            .single();

    if (error) {
        console.error("Erro ao salvar visita domiciliar:", error);
        mostrarStatusVisitaAPS("Erro ao salvar visita: " + error.message, "danger");
        return null;
    }

    try {
        if (
            payload.paciente_cpf &&
            typeof atualizarTerritorioInteligente === "function"
        ) {
            await atualizarTerritorioInteligente(payload.paciente_cpf);
        }
    } catch (erroTI) {
        console.warn("Visita salva, mas Território Inteligente não atualizou:", erroTI);
    }

    mostrarStatusVisitaAPS("🏠 Visita domiciliar salva e Território Inteligente atualizado.", "success");
    mostrarToast?.("🏠 Visita domiciliar salva.");

    limparFormularioVisitaDomiciliarAPS(false);

    return data;
}

/* ==========================================================
   LISTAGEM
   ========================================================== */

async function carregarHistoricoVisitasDomiciliaresAPS() {
    const cpf =
        limparDocumentoVisitaAPS(
            document.getElementById("visitaPacienteCPF")?.value ||
            window.pacienteAtual?.cpf ||
            ""
        );

    const cns =
        limparDocumentoVisitaAPS(
            document.getElementById("visitaPacienteCNS")?.value ||
            window.pacienteAtual?.cns ||
            ""
        );

    const container =
        document.getElementById("historicoVisitasDomiciliaresAPS");

    if (!container) return;

    if (!cpf && !cns) {
        container.innerHTML =
            `<p style="color:var(--text-muted);">Informe CPF ou CNS para carregar histórico.</p>`;
        return;
    }

    const filtros = [];

    if (cpf) filtros.push(`paciente_cpf.eq.${cpf}`);
    if (cns) filtros.push(`paciente_cns.eq.${cns}`);

    const { data, error } =
        await supabaseClient
            .from("visitas_domiciliares")
            .select("*")
            .or(filtros.join(","))
            .order("data_visita", { ascending: false })
            .limit(50);

    if (error) {
        console.error("Erro ao carregar visitas:", error);
        container.innerHTML =
            `<p style="color:var(--danger);">Erro ao carregar visitas.</p>`;
        return;
    }

    const visitas =
        data || [];

    if (!visitas.length) {
        container.innerHTML =
            `<p style="color:var(--text-muted);">Nenhuma visita registrada.</p>`;
        return;
    }

    container.innerHTML =
        `<table class="table-sintaxe">
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>EVFAM</th>
                    <th>Conduta</th>
                </tr>
            </thead>
            <tbody>
                ${visitas.map(v => `
                    <tr>
                        <td>${formatarDataVisitaAPS(v.data_visita || v.created_at)}</td>
                        <td>
                            <strong>${escaparVisitaAPS(v.tipo_visita || "-")}</strong>
                            <small>${escaparVisitaAPS(v.responsavel || "")}</small>
                        </td>
                        <td>
                            <strong>${Number(v.evfam_total || 0)}</strong>
                            <small>${escaparVisitaAPS(v.evfam_classificacao || "")}</small>
                        </td>
                        <td>
                            <small>${escaparVisitaAPS(v.conduta || v.observacoes || "-")}</small>
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>`;
}

/* ==========================================================
   HELPERS
   ========================================================== */

function limparFormularioVisitaDomiciliarAPS(manterPaciente = true) {
    const cpf =
        document.getElementById("visitaPacienteCPF")?.value || "";

    const cns =
        document.getElementById("visitaPacienteCNS")?.value || "";

    document
        .querySelectorAll("#view-visita-domiciliar-aps input, #view-visita-domiciliar-aps textarea, #view-visita-domiciliar-aps select")
        .forEach(el => {
            if (el.type === "checkbox") {
                el.checked = false;
            } else if (!manterPaciente || !["visitaPacienteCPF", "visitaPacienteCNS"].includes(el.id)) {
                el.value = "";
            }
        });

    if (manterPaciente) {
        setValorVisitaAPS("visitaPacienteCPF", cpf);
        setValorVisitaAPS("visitaPacienteCNS", cns);
    }

    setValorVisitaAPS("visitaTipoVisita", "ACS");
    calcularEVFAMFormularioVisitaAPS();
}

function checkedVisitaAPS(id) {
    return !!document.getElementById(id)?.checked;
}

function setTextoVisitaAPS(id, valor) {
    const el =
        document.getElementById(id);

    if (el) {
        el.innerText =
            valor ?? "";
    }
}

function setValorVisitaAPS(id, valor) {
    const el =
        document.getElementById(id);

    if (el) {
        el.value =
            valor ?? "";
    }
}

function limparDocumentoVisitaAPS(valor) {
    return String(valor || "")
        .replace(/\D/g, "");
}

function formatarDataVisitaAPS(valor) {
    if (!valor) return "-";

    const d =
        new Date(valor);

    if (Number.isNaN(d.getTime())) return "-";

    return d.toLocaleString("pt-BR");
}

function mostrarStatusVisitaAPS(msg, tipo = "info") {
    const el =
        document.getElementById("statusVisitaDomiciliarAPS");

    if (!el) {
        mostrarToast?.(msg);
        return;
    }

    const cor =
        tipo === "danger"
            ? "var(--danger)"
            : tipo === "success"
                ? "var(--success)"
                : tipo === "warn"
                    ? "var(--warning)"
                    : "var(--text-muted)";

    el.innerHTML =
        `<p style="color:${cor}; margin:8px 0 0 0;">${escaparVisitaAPS(msg)}</p>`;
}

function escaparVisitaAPS(valor) {
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

window.abrirModuloVisitaDomiciliarAPS = abrirModuloVisitaDomiciliarAPS;
window.localizarPacienteVisitaDomiciliarAPS = localizarPacienteVisitaDomiciliarAPS;
window.alternarTipoVisitaDomiciliarAPS = alternarTipoVisitaDomiciliarAPS;
window.calcularEVFAMFormularioVisitaAPS = calcularEVFAMFormularioVisitaAPS;
window.salvarVisitaDomiciliarAPS = salvarVisitaDomiciliarAPS;
window.carregarHistoricoVisitasDomiciliaresAPS = carregarHistoricoVisitasDomiciliaresAPS;
window.limparFormularioVisitaDomiciliarAPS = limparFormularioVisitaDomiciliarAPS;
