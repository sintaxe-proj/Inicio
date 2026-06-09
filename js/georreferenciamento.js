/* ==========================================================
   🌎 GEORREFERENCIAMENTO APS — SINTAXEHUB
   Leaflet + Supabase
   Fonte: pacientes + atendimentos
   ========================================================== */

let mapaGeorreferenciamentoAPS = null;
let camadaMarcadoresGeoAPS = null;
let baseGeorreferenciamentoAPS = [];
let baseGeorreferenciamentoFiltradaAPS = [];

/* ==========================================================
   CARREGAMENTO PRINCIPAL
   ========================================================== */

async function carregarGeorreferenciamentoAPS() {
    const mapaContainer =
        document.getElementById("mapaGeorreferenciamentoAPS");

    const tabelaContainer =
        document.getElementById("tabelaGeorreferenciamentoAPS");

    if (!mapaContainer || !tabelaContainer) {
        console.warn("Containers do georreferenciamento não encontrados.");
        return;
    }

    if (typeof supabaseClient === "undefined") {
        tabelaContainer.innerHTML =
            `<p style="color:var(--danger);">Supabase não carregado.</p>`;
        return;
    }

    if (typeof L === "undefined") {
        tabelaContainer.innerHTML =
            `<p style="color:var(--danger);">Leaflet não carregado. Verifique os imports no index.html.</p>`;
        return;
    }

    tabelaContainer.innerHTML =
        `<p style="color:var(--text-muted);">Carregando base territorial georreferenciada...</p>`;

    try {
        const { data: pacientes, error: erroPacientes } =
            await supabaseClient
                .from("pacientes")
                .select(`
                    id,
                    nome,
                    cpf,
                    cns,
                    telefone,
                    cep,
                    endereco,
                    bairro,
                    cidade,
                    ubs,
                    equipe,
                    ubs_vinculacao,
                    equipe_esf
                `)
                .limit(10000);

        if (erroPacientes) {
            console.error("Erro ao carregar pacientes geo:", erroPacientes);
            tabelaContainer.innerHTML =
                `<p style="color:var(--danger);">Erro ao carregar pacientes.</p>`;
            return;
        }

        const { data: atendimentos, error: erroAtendimentos } =
            await supabaseClient
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
                    risco_global,
                    risco_pontos,
                    reavaliacaoDias,
                    retorno_dias,
                    data_atendimento,
                    criado_em,
                    ubs_vinculacao,
                    equipe_esf
                `)
                .order("data_atendimento", { ascending: false })
                .limit(20000);

        if (erroAtendimentos) {
            console.error("Erro ao carregar atendimentos geo:", erroAtendimentos);
            tabelaContainer.innerHTML =
                `<p style="color:var(--danger);">Erro ao carregar atendimentos.</p>`;
            return;
        }

        baseGeorreferenciamentoAPS =
            consolidarBaseGeorreferenciamentoAPS(
                pacientes || [],
                atendimentos || []
            );

        carregarFiltrosGeorreferenciamentoAPS(baseGeorreferenciamentoAPS);
        aplicarFiltrosGeorreferenciamentoAPS();

    } catch (erro) {
        console.error("Erro geral georreferenciamento:", erro);
        tabelaContainer.innerHTML =
            `<p style="color:var(--danger);">Falha ao carregar georreferenciamento.</p>`;
    }
}

/* ==========================================================
   CONSOLIDAÇÃO
   ========================================================== */

function consolidarBaseGeorreferenciamentoAPS(pacientes, atendimentos) {
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
            cep: limparCEPGeoAPS(p.cep || ""),
            endereco: p.endereco || "",
            bairro: p.bairro || "Bairro não informado",
            cidade: p.cidade || "",
            ubs: p.ubs_vinculacao || p.ubs || "UBS não informada",
            equipe: p.equipe_esf || p.equipe || "Equipe não informada",

            has: "Não",
            dm: "Não",
            gestante: "Não",
            tb: "Não",
            hansen: "Não",

            risco_global: "Não informado",
            risco_pontos: 0,
            prazo: null,
            ultimo_atendimento: null
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
                nome: a.nome_paciente || "",
                cpf: a.paciente_cpf || a.cpf || "",
                cns: a.cns || "",
                telefone: "",
                cep: "",
                endereco: "",
                bairro: "Bairro não informado",
                cidade: "",
                ubs: a.ubs_vinculacao || "UBS não informada",
                equipe: a.equipe_esf || "Equipe não informada",

                has: "Não",
                dm: "Não",
                gestante: "Não",
                tb: "Não",
                hansen: "Não",

                risco_global: "Não informado",
                risco_pontos: 0,
                prazo: null,
                ultimo_atendimento: null
            };

        if (!atual.nome && a.nome_paciente) {
            atual.nome =
                a.nome_paciente;
        }

        if (valorSimGeoAPS(a.has)) atual.has = "Sim";
        if (valorSimGeoAPS(a.dm)) atual.dm = "Sim";
        if (valorSimGeoAPS(a.gestante)) atual.gestante = "Sim";
        if (valorSimGeoAPS(a.tb)) atual.tb = "Sim";
        if (valorSimGeoAPS(a.hansen)) atual.hansen = "Sim";

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
            atual.prazo;

        atual.prazo =
            prazo !== null && prazo !== undefined
                ? Number(prazo)
                : atual.prazo;

        atual.ultimo_atendimento =
            a.data_atendimento ||
            a.criado_em ||
            atual.ultimo_atendimento;

        if (a.ubs_vinculacao) atual.ubs = a.ubs_vinculacao;
        if (a.equipe_esf) atual.equipe = a.equipe_esf;

        mapa.set(chave, atual);
    });

    return Array.from(mapa.values());
}

/* ==========================================================
   FILTROS
   ========================================================== */

function carregarFiltrosGeorreferenciamentoAPS(base) {
    carregarSelectGeoAPS(
        "geoFiltroEquipe",
        base.map(p => p.equipe || "Equipe não informada"),
        "Todas as equipes"
    );

    carregarSelectGeoAPS(
        "geoFiltroUBS",
        base.map(p => p.ubs || "UBS não informada"),
        "Todas as UBS"
    );

    carregarSelectGeoAPS(
        "geoFiltroBairro",
        base.map(p => p.bairro || "Bairro não informado"),
        "Todos os bairros"
    );
}

function carregarSelectGeoAPS(id, valores, rotulo) {
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

function aplicarFiltrosGeorreferenciamentoAPS() {
    const equipe =
        document.getElementById("geoFiltroEquipe")?.value || "TODOS";

    const ubs =
        document.getElementById("geoFiltroUBS")?.value || "TODOS";

    const bairro =
        document.getElementById("geoFiltroBairro")?.value || "TODOS";

    const linha =
        document.getElementById("geoFiltroLinha")?.value || "TODAS";

    const risco =
        document.getElementById("geoFiltroRisco")?.value || "TODOS";

    const termo =
        document.getElementById("geoFiltroBusca")?.value?.trim() || "";

    let base =
        [...baseGeorreferenciamentoAPS];

    if (equipe !== "TODOS") {
        base =
            base.filter(p => String(p.equipe || "") === equipe);
    }

    if (ubs !== "TODOS") {
        base =
            base.filter(p => String(p.ubs || "") === ubs);
    }

    if (bairro !== "TODOS") {
        base =
            base.filter(p => String(p.bairro || "") === bairro);
    }

    if (linha !== "TODAS") {
        base =
            base.filter(p => {
                if (linha === "HAS") return valorSimGeoAPS(p.has);
                if (linha === "DM") return valorSimGeoAPS(p.dm);
                if (linha === "GESTANTE") return valorSimGeoAPS(p.gestante);
                if (linha === "TB") return valorSimGeoAPS(p.tb);
                if (linha === "HANSEN") return valorSimGeoAPS(p.hansen);
                return true;
            });
    }

    if (risco !== "TODOS") {
        if (risco === "CRITICO") {
            base =
                base.filter(p =>
                    Number(p.prazo) === 0 ||
                    normalizarGeoAPS(p.risco_global).includes("alto") ||
                    Number(p.risco_pontos || 0) >= 6
                );
        }

        if (risco === "ALTO") {
            base =
                base.filter(p =>
                    normalizarGeoAPS(p.risco_global).includes("alto") ||
                    Number(p.risco_pontos || 0) >= 6
                );
        }

        if (risco === "MODERADO") {
            base =
                base.filter(p =>
                    normalizarGeoAPS(p.risco_global).includes("moderado") ||
                    normalizarGeoAPS(p.risco_global).includes("medio")
                );
        }
    }

    if (termo) {
        const t =
            normalizarGeoAPS(termo);

        base =
            base.filter(p =>
                normalizarGeoAPS(`
                    ${p.nome}
                    ${p.cpf}
                    ${p.cns}
                    ${p.telefone}
                    ${p.cep}
                    ${p.bairro}
                    ${p.equipe}
                    ${p.ubs}
                `).includes(t)
            );
    }

    baseGeorreferenciamentoFiltradaAPS =
        base;

    atualizarCardsGeorreferenciamentoAPS(base);
    renderizarMapaGeorreferenciamentoAPS(base);
    renderizarTabelaGeorreferenciamentoAPS(base);
    renderizarRankingsGeorreferenciamentoAPS(base);
}

/* ==========================================================
   CARDS
   ========================================================== */

function atualizarCardsGeorreferenciamentoAPS(base) {
    setTextoGeoAPS("geoTotalPopulacao", base.length);
    setTextoGeoAPS("geoTotalHAS", base.filter(p => valorSimGeoAPS(p.has)).length);
    setTextoGeoAPS("geoTotalDM", base.filter(p => valorSimGeoAPS(p.dm)).length);
    setTextoGeoAPS("geoTotalGestantes", base.filter(p => valorSimGeoAPS(p.gestante)).length);

    setTextoGeoAPS(
        "geoTotalCriticos",
        base.filter(p =>
            Number(p.prazo) === 0 ||
            normalizarGeoAPS(p.risco_global).includes("alto") ||
            Number(p.risco_pontos || 0) >= 6
        ).length
    );

    setTextoGeoAPS(
        "geoTotalTerritorios",
        agruparGeoAPS(base).length
    );
}

/* ==========================================================
   MAPA
   ========================================================== */

function renderizarMapaGeorreferenciamentoAPS(base) {
    const container =
        document.getElementById("mapaGeorreferenciamentoAPS");

    if (!container) return;

    if (typeof L === "undefined") {
        container.innerHTML =
            `<p style="color:var(--danger);">Leaflet não carregado.</p>`;
        return;
    }

    if (!mapaGeorreferenciamentoAPS) {
        mapaGeorreferenciamentoAPS =
            L.map("mapaGeorreferenciamentoAPS")
                .setView([-14.2350, -51.9253], 4);

        L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                attribution:
                    '&copy; OpenStreetMap contributors'
            }
        ).addTo(mapaGeorreferenciamentoAPS);
    }

    if (camadaMarcadoresGeoAPS) {
        camadaMarcadoresGeoAPS.clearLayers();
    } else {
        camadaMarcadoresGeoAPS =
            L.layerGroup()
                .addTo(mapaGeorreferenciamentoAPS);
    }

    const agrupados =
        agruparGeoAPS(base);

    if (!agrupados.length) {
        return;
    }

    const bounds = [];

    agrupados.forEach((grupo, index) => {
        const coordenada =
            obterCoordenadaGrupoGeoAPS(grupo, index);

        bounds.push(coordenada);

        const cor =
            obterCorRiscoGeoAPS(grupo);

        const raio =
            Math.min(
                28,
                Math.max(8, 6 + Math.sqrt(grupo.total) * 3)
            );

        const marcador =
            L.circleMarker(
                coordenada,
                {
                    radius: raio,
                    color: cor,
                    fillColor: cor,
                    fillOpacity: 0.55,
                    weight: 2
                }
            );

        marcador.bindPopup(`
            <div style="min-width:220px;">
                <strong>${escaparGeoAPS(grupo.rotulo)}</strong><br>
                <small>${escaparGeoAPS(grupo.tipo)}</small>
                <hr>
                Pessoas: <strong>${grupo.total}</strong><br>
                HAS: ${grupo.has}<br>
                DM: ${grupo.dm}<br>
                Gestantes: ${grupo.gestantes}<br>
                Críticos/alto risco: <strong>${grupo.criticos}</strong><br>
                Escore territorial: ${grupo.escore}
            </div>
        `);

        marcador.addTo(camadaMarcadoresGeoAPS);
    });

    if (bounds.length) {
        mapaGeorreferenciamentoAPS.fitBounds(bounds, {
            padding: [30, 30]
        });
    }

    setTimeout(() => {
        mapaGeorreferenciamentoAPS.invalidateSize();
    }, 250);
}

function agruparGeoAPS(base) {
    const modo =
        document.getElementById("geoAgrupamento")?.value || "CEP";

    const grupos = {};

    base.forEach(p => {
        let chave = "";
        let tipo = "";

        if (modo === "BAIRRO") {
            chave =
                p.bairro ||
                "Bairro não informado";

            tipo =
                "Bairro";
        } else if (modo === "EQUIPE") {
            chave =
                p.equipe ||
                "Equipe não informada";

            tipo =
                "Equipe";
        } else if (modo === "UBS") {
            chave =
                p.ubs ||
                "UBS não informada";

            tipo =
                "UBS";
        } else {
            chave =
                p.cep ||
                "Sem CEP";

            tipo =
                "CEP";
        }

        if (!grupos[chave]) {
            grupos[chave] = {
                chave,
                rotulo: chave,
                tipo,
                total: 0,
                has: 0,
                dm: 0,
                gestantes: 0,
                tb: 0,
                hansen: 0,
                criticos: 0,
                escore: 0,
                pacientes: []
            };
        }

        const g =
            grupos[chave];

        g.total += 1;

        if (valorSimGeoAPS(p.has)) g.has += 1;
        if (valorSimGeoAPS(p.dm)) g.dm += 1;
        if (valorSimGeoAPS(p.gestante)) g.gestantes += 1;
        if (valorSimGeoAPS(p.tb)) g.tb += 1;
        if (valorSimGeoAPS(p.hansen)) g.hansen += 1;

        const critico =
            Number(p.prazo) === 0 ||
            normalizarGeoAPS(p.risco_global).includes("alto") ||
            Number(p.risco_pontos || 0) >= 6;

        if (critico) {
            g.criticos += 1;
        }

        g.escore += calcularEscorePacienteGeoAPS(p);
        g.pacientes.push(p);
    });

    return Object.values(grupos)
        .sort((a, b) =>
            b.criticos - a.criticos ||
            b.escore - a.escore ||
            b.total - a.total
        );
}

function obterCoordenadaGrupoGeoAPS(grupo, index) {
    /*
      Versão 1.0 sem API paga:
      - gera coordenadas determinísticas aproximadas a partir do CEP/bairro/equipe.
      - quando você criar tabela geolocalizacao_pacientes com latitude/longitude,
        esta função pode ser trocada para coordenadas reais.
    */

    const seed =
        gerarSeedGeoAPS(grupo.chave || grupo.rotulo || String(index));

    const centrosBrasil = [
        [-23.5505, -46.6333], // São Paulo
        [-22.9068, -43.1729], // Rio de Janeiro
        [-19.9167, -43.9345], // Belo Horizonte
        [-15.7939, -47.8828], // Brasília
        [-12.9777, -38.5016], // Salvador
        [-8.0476, -34.8770],  // Recife
        [-3.7319, -38.5267],  // Fortaleza
        [-25.4284, -49.2733], // Curitiba
        [-30.0346, -51.2177], // Porto Alegre
        [-1.4558, -48.4902]   // Belém
    ];

    const centro =
        centrosBrasil[seed % centrosBrasil.length];

    const deslocLat =
        ((seed % 100) - 50) / 1000;

    const deslocLng =
        (((seed * 7) % 100) - 50) / 1000;

    return [
        centro[0] + deslocLat,
        centro[1] + deslocLng
    ];
}

/* ==========================================================
   TABELAS / RANKINGS
   ========================================================== */

function renderizarTabelaGeorreferenciamentoAPS(base) {
    const container =
        document.getElementById("tabelaGeorreferenciamentoAPS");

    if (!container) return;

    const grupos =
        agruparGeoAPS(base);

    if (!grupos.length) {
        container.innerHTML =
            `<p style="color:var(--text-muted);">Nenhum território encontrado.</p>`;
        return;
    }

    container.innerHTML = `
        <table class="table-sintaxe">
            <thead>
                <tr>
                    <th>Território</th>
                    <th>Pessoas</th>
                    <th>Linhas de cuidado</th>
                    <th>Críticos</th>
                    <th>Escore</th>
                    <th>Classificação</th>
                </tr>
            </thead>

            <tbody>
                ${grupos.map(g => `
                    <tr>
                        <td>
                            <strong>${escaparGeoAPS(g.rotulo)}</strong>
                            <small>${escaparGeoAPS(g.tipo)}</small>
                        </td>

                        <td>${g.total}</td>

                        <td>
                            HAS ${g.has} |
                            DM ${g.dm} |
                            Gest. ${g.gestantes} |
                            TB ${g.tb} |
                            Hansen ${g.hansen}
                        </td>

                        <td>
                            <strong>${g.criticos}</strong>
                        </td>

                        <td>${g.escore}</td>

                        <td>${badgeClassificacaoGeoAPS(g)}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function renderizarRankingsGeorreferenciamentoAPS(base) {
    const container =
        document.getElementById("rankingGeorreferenciamentoAPS");

    if (!container) return;

    const grupos =
        agruparGeoAPS(base)
            .slice(0, 10);

    if (!grupos.length) {
        container.innerHTML =
            `<p style="color:var(--text-muted);">Sem ranking disponível.</p>`;
        return;
    }

    container.innerHTML = `
        <div class="form-section" style="background:#111c2e;">
            <h3 style="margin-top:0;">🔥 Top territórios prioritários</h3>

            <table class="table-sintaxe">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Território</th>
                        <th>Críticos</th>
                        <th>Escore</th>
                        <th>Pessoas</th>
                    </tr>
                </thead>

                <tbody>
                    ${grupos.map((g, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>
                                <strong>${escaparGeoAPS(g.rotulo)}</strong>
                                <small>${escaparGeoAPS(g.tipo)}</small>
                            </td>
                            <td>${g.criticos}</td>
                            <td>${g.escore}</td>
                            <td>${g.total}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

/* ==========================================================
   EXPORTAÇÃO
   ========================================================== */

function exportarGeorreferenciamentoCSV() {
    const grupos =
        agruparGeoAPS(baseGeorreferenciamentoFiltradaAPS || []);

    if (!grupos.length) {
        mostrarToast?.("⚠️ Nenhum dado para exportar.");
        return;
    }

    const linhas = [
        [
            "territorio",
            "tipo",
            "pessoas",
            "has",
            "dm",
            "gestantes",
            "tb",
            "hansen",
            "criticos",
            "escore"
        ]
    ];

    grupos.forEach(g => {
        linhas.push([
            g.rotulo,
            g.tipo,
            g.total,
            g.has,
            g.dm,
            g.gestantes,
            g.tb,
            g.hansen,
            g.criticos,
            g.escore
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
        `georreferenciamento_aps_${new Date().toISOString().slice(0, 10)}.csv`;

    a.click();

    URL.revokeObjectURL(url);
}

/* ==========================================================
   HELPERS
   ========================================================== */

function calcularEscorePacienteGeoAPS(p) {
    let escore = 0;

    if (valorSimGeoAPS(p.has)) escore += 1;
    if (valorSimGeoAPS(p.dm)) escore += 1;
    if (valorSimGeoAPS(p.gestante)) escore += 2;
    if (valorSimGeoAPS(p.tb)) escore += 3;
    if (valorSimGeoAPS(p.hansen)) escore += 3;

    if (Number(p.prazo) === 0) escore += 5;

    if (
        normalizarGeoAPS(p.risco_global).includes("alto") ||
        Number(p.risco_pontos || 0) >= 6
    ) {
        escore += 5;
    }

    if (
        normalizarGeoAPS(p.risco_global).includes("moderado") ||
        normalizarGeoAPS(p.risco_global).includes("medio")
    ) {
        escore += 3;
    }

    escore += Number(p.risco_pontos || 0);

    return escore;
}

function obterCorRiscoGeoAPS(grupo) {
    if (grupo.criticos > 0 || grupo.escore >= 60) {
        return "#ef4444";
    }

    if (grupo.escore >= 25) {
        return "#f59e0b";
    }

    return "#22c55e";
}

function badgeClassificacaoGeoAPS(grupo) {
    if (grupo.criticos > 0 || grupo.escore >= 60) {
        return `<span class="status-badge status-danger">Prioritário</span>`;
    }

    if (grupo.escore >= 25) {
        return `<span class="status-badge status-warning">Atenção</span>`;
    }

    return `<span class="status-badge status-success">Estável</span>`;
}

function valorSimGeoAPS(valor) {
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

function normalizarGeoAPS(valor) {
    return String(valor || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function limparCEPGeoAPS(valor) {
    return String(valor || "")
        .replace(/\D/g, "")
        .replace(/^(\d{5})(\d{3})$/, "$1-$2");
}

function gerarSeedGeoAPS(texto) {
    const str =
        String(texto || "sem-territorio");

    let hash = 0;

    for (let i = 0; i < str.length; i++) {
        hash =
            ((hash << 5) - hash) +
            str.charCodeAt(i);

        hash =
            hash & hash;
    }

    return Math.abs(hash);
}

function setTextoGeoAPS(id, valor) {
    const el =
        document.getElementById(id);

    if (el) {
        el.innerText =
            valor;
    }
}

function escaparGeoAPS(valor) {
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

window.carregarGeorreferenciamentoAPS = carregarGeorreferenciamentoAPS;
window.aplicarFiltrosGeorreferenciamentoAPS = aplicarFiltrosGeorreferenciamentoAPS;
window.exportarGeorreferenciamentoCSV = exportarGeorreferenciamentoCSV;

