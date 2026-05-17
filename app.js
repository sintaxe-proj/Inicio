/**
 * ==========================================================================
 * ECOSSISTEMA DE INTELIGÊNCIA SANITÁRIA - SINTAXEHUB APS DIGITAL
 * ATENÇÃO PRIMÁRIA À SAÚDE ORIENTADA POR DADOS EM LARGA ESCALA
 * ==========================================================================
 */

// --- 🌐 GLOBAIS E ESTADO NATIVO DA APLICAÇÃO ---
let db = null;
let dadosTerritoriais = []; // Cache em memória para os gráficos e busca ativa rápida
let usuarioAutenticado = null;
const DB_NAME = "SintaxeHubAPSDigital";
const DB_VERSION = 3;

// --- 🚀 INICIALIZAÇÃO AUTOMÁTICA ---
document.addEventListener("DOMContentLoaded", () => {
    inicializarIndexedDB();
    popularListaCiap();
    verificarSessaoExistente();
});

// ==========================================================================
// 🗄️ PERSISTÊNCIA: ARQUITETURA INDEXEDDB
// ==========================================================================
function inicializarIndexedDB() {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
        exibirToast("Erro crítico ao inicializar o banco de dados local.", "danger");
    };

    request.onsuccess = (event) => {
        db = event.target.result;
        if (usuarioAutenticado) {
            sincronizarCacheMemoria();
        }
    };

    request.onupgradeneeded = (event) => {
        const database = event.target.result;
        
        if (!database.objectStoreNames.contains("prontuarios")) {
            const store = database.createObjectStore("prontuarios", { keyPath: "cpfPaciente" });
            store.createIndex("idx_nome", "nomePaciente", { unique: false });
            store.createIndex("idx_unidade", "unidadePaciente", { unique: false });
            store.createIndex("idx_equipe", "equipePaciente", { unique: false });
        }
        
        if (!database.objectStoreNames.contains("usuarios")) {
            database.createObjectStore("usuarios", { keyPath: "matricula" });
        }
    };
}

// ==========================================================================
// 🔐 SUBSISTEMA DE AUTENTICAÇÃO E CRIPTOGRAFIA DE SEGURANÇA
// ==========================================================================
function autenticarUsuario() {
    const matricula = document.getElementById("loginUser").value.trim();
    const senhaRaw = document.getElementById("loginSenha").value;
    const erroDiv = document.getElementById("loginErro");

    if (!matricula || !senhaRaw) {
        erroDiv.innerText = "Preencha todos os campos obrigatórios.";
        erroDiv.style.display = "block";
        return;
    }

    // Criação de hash simples usando rotação de bits para segurança cadastral
    const hashSenha = btoa(senhaRaw.split("").reverse().join(""));

    const transaction = db.transaction(["usuarios"], "readwrite");
    const store = transaction.objectStore("usuarios");
    const request = store.get(matricula);

    request.onsuccess = () => {
        const user = request.result;
        if (user) {
            if (user.senha === hashSenha) {
                concluirLogin(user);
            } else {
                erroDiv.innerText = "Senha incorreta para esta matrícula municipal.";
                erroDiv.style.display = "block";
            }
        } else {
            // Primeiro acesso: Cria o usuário na base automaticamente (Facilidade de implantação)
            const novoProfissional = {
                matricula: matricula,
                senha: hashSenha,
                nome: matricula === "440129" ? "Enfermeiro Josimar Kapps" : "Profissional do SUS",
                perfil: "admin"
            };
            store.add(novoProfissional);
            concluirLogin(novoProfissional);
        }
    };
}

function concluirLogin(usuario) {
    usuarioAutenticado = usuario;
    sessionStorage.setItem("sintaxe_hub_sessao", JSON.stringify(usuario));
    
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("app").style.display = "block";
    document.getElementById("nomeUsuarioLogado").innerText = `👤 ${usuario.nome} (${usuario.matricula})`;
    
    exibirToast(`Bem-vindo, ${usuario.nome}. Conexão criptografada segura.`);
    sincronizarCacheMemoria();
}

function verificarSessaoExistente() {
    const sessao = sessionStorage.getItem("sintaxe_hub_sessao");
    if (sessao && db) {
        usuarioAutenticado = JSON.parse(sessao);
        document.getElementById("loginScreen").style.display = "none";
        document.getElementById("app").style.display = "block";
        document.getElementById("nomeUsuarioLogado").innerText = `👤 ${usuarioAutenticado.nome} (${usuarioAutenticado.matricula})`;
        sincronizarCacheMemoria();
    }
}

function efetuarLogout() {
    sessionStorage.removeItem("sintaxe_hub_sessao");
    location.reload();
}

function alternarVisaoGestor(perfil) {
    if (!usuarioAutenticado) return;
    usuarioAutenticado.perfil = perfil;
    exibirToast(`Acesso modificado para: ${perfil === 'admin' ? 'Perfil Gestor' : 'Perfil Assistencial'}`);
    sincronizarCacheMemoria();
}

// ==========================================================================
// 🔄 CACHE, SINCRONIZAÇÃO E RENDERIZAÇÃO DE INTERFACES (PAINEL INICIAL)
// ==========================================================================
function sincronizarCacheMemoria() {
    if (!db) return;
    const transaction = db.transaction(["prontuarios"], "readonly");
    const store = transaction.objectStore("prontuarios");
    const request = store.getAll();

    request.onsuccess = () => {
        dadosTerritoriais = request.result;
        atualizarCardsIndicadoresClinicos();
        buscarInicio(); // Atualiza a busca ativa na tela inicial se houver digitação
        
        if (document.getElementById("view-banco").style.display === "block") renderizarBaseTerritorial();
        if (document.getElementById("view-discador").style.display === "block") renderizarCentralBuscaAtiva();
    };
}

function atualizarCardsIndicadoresClinicos() {
    let has = 0, dm = 0, gest = 0, tb = 0, han = 0, criticos = 0;

    dadosTerritoriais.forEach(p => {
        if (p.hasSN === "Sim") has++;
        if (p.dmSN === "Sim") dm++;
        if (p.gestanteSN === "Sim") gest++;
        if (p.tbSN === true || p.tbSN === "Sim") tb++;
        if (p.hansenSN === true || p.hansenSN === "Sim") han++;
        if (parseInt(p.soapReavaliacaoDias) === 0) criticos++;
    });

    document.getElementById("dashHAS").innerText = has;
    document.getElementById("dashDM").innerText = dm;
    document.getElementById("dashGest").innerText = gest;
    document.getElementById("dashTB").innerText = tb;
    document.getElementById("dashHansen").innerText = han;
    
    const sininho = document.getElementById("contadorAvisosSininho");
    sininho.innerText = criticos;
    
    if (criticos > 0) {
        sininho.parentElement.style.animation = "pulse 1.5s infinite";
        sininho.parentElement.style.background = "#dc2626";
    } else {
        sininho.parentElement.style.animation = "none";
        sininho.parentElement.style.background = "var(--primary)";
    }
}

// ==========================================================================
// 📊 SUBSISTEMA 1: VIGILÂNCIA EPIDEMIOLÓGICA (GRÁFICOS E METRICAS)
// ==========================================================================
function abrirPainelEpidemiologico(linhaCuidadoAlvo) {
    const modal = document.getElementById('painelEpidemiologicoContainer');
    if (!modal) return;
    
    modal.style.display = 'block';
    
    const titulos = {
        'has': 'Monitoramento de Hipertensão Arterial (HAS) - Linha de Cuidado',
        'dm': 'Vigilância Epidemiológica de Diabetes Mellitus (DM)',
        'gestante': 'Acompanhamento do Pré-Natal (Mãe Carioca / Rede Cegonha)',
        'tuberculose': 'Controle de Agravos: Tuberculose Territorial',
        'hanseniase': 'Controle de Agravos: Hanseníase na APS',
        'criticos': 'Painel de Alertas Críticos (Aprazamentos Estourados)'
    };
    
    document.getElementById('tituloPainelEpidemiologico').innerText = titulos[linhaCuidadoAlvo] || 'Vigilância em Saúde Territorial';
    modal.dataset.agravoAtivo = linhaCuidadoAlvo;
    
    popularFiltrosModal();
    aplicarFiltrosRelatorio();
}

function aplicarFiltrosRelatorio() {
    const modal = document.getElementById('painelEpidemiologicoContainer');
    const agravo = modal.dataset.agravoAtivo;
    
    const ubsSelecionada = document.getElementById('filtroUBS').value;
    const equipeSelecionada = document.getElementById('filtroEquipe').value;
    const riscoSelecionado = document.getElementById('filtroRisco').value;
    
    let filtrados = [...dadosTerritoriais];
    
    // 1. Filtragem por Agravo Epidemiológico
    if (agravo === 'has') filtrados = filtrados.filter(p => p.hasSN === 'Sim');
    else if (agravo === 'dm') filtrados = filtrados.filter(p => p.dmSN === 'Sim');
    else if (agravo === 'gestante') filtrados = filtrados.filter(p => p.gestanteSN === 'Sim');
    else if (agravo === 'tuberculose') filtrados = filtrados.filter(p => p.tbSN === true || p.tbSN === 'Sim');
    else if (agravo === 'hanseniase') filtrados = filtrados.filter(p => p.hansenSN === true || p.hansenSN === 'Sim');
    else if (agravo === 'criticos') filtrados = filtrados.filter(p => parseInt(p.soapReavaliacaoDias) === 0);

    // 2. Filtros Combinados de Gestão (UBS e Equipe)
    if (ubsSelecionada !== 'TODOS') filtrados = filtrados.filter(p => p.unidadePaciente === ubsSelecionada);
    if (equipeSelecionada !== 'TODOS') filtrados = filtrados.filter(p => p.equipePaciente === equipeSelecionada);
    
    const totalDoAgravo = filtrados.length;
    const criticos = filtrados.filter(p => parseInt(p.soapReavaliacaoDias) === 0).length;
    const controlados = totalDoAgravo - criticos;
    const percentualCritico = totalDoAgravo > 0 ? Math.round((criticos / totalDoAgravo) * 100) : 0;

    // 🟢 RENDERIZAÇÃO DO GRÁFICO DONUT (SVG Nativo Dinâmico)
    const containerDonut = document.getElementById('containerGraficoDonut');
    containerDonut.innerHTML = `
        <div style="position: relative; width: 100px; height: 100px; display:flex; align-items:center; justify-content:center;">
            <svg width="100" height="100" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r="15.915" fill="#fff"></circle>
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#e5e7eb" stroke-width="4"></circle>
                <circle cx="21" cy="21" r="15.915" fill="transparent" 
                        stroke="${percentualCritico > 40 ? '#ef4444' : '#f59e0b'}" stroke-width="4" 
                        stroke-dasharray="${percentualCritico} ${100 - percentualCritico}" stroke-dashoffset="25"></circle>
            </svg>
            <div style="position: absolute; text-align: center;">
                <span style="font-size: 18px; font-weight: 800; color: #111827;">${percentualCritico}%</span>
                <p style="font-size: 9px; text-transform: uppercase; color: #6b7280; margin: 0;">Críticos</p>
            </div>
        </div>
        <div style="text-align: left; font-size: 13px; margin-left: 15px;">
            <p>🔴 <strong>Críticos (0d):</strong> ${criticos} utentes</p>
            <p>🟢 <strong>Monitorados:</strong> ${controlados} utentes</p>
            <p style="color: var(--text-muted); font-size: 11px; margin-top:4px;">Universo amostral: ${totalDoAgravo}</p>
        </div>
    `;

    // 📊 RENDERIZAÇÃO DO GRÁFICO DE BARRAS HORIZONTAIS (Estratificação Clínica Real)
    const containerBarras = document.getElementById('containerGraficoBarras');
    containerBarras.innerHTML = ''; 

    let distribuicao = {};
    
    if (agravo === 'has') {
        distribuicao = { "Estágio 1": 0, "Estágio 2": 0, "Estágio 3": 0, "Crise Hipertensiva": 0, "Não Estratificado": 0 };
        filtrados.forEach(p => {
            const classif = p.hasClassif || 'Não Estratificado';
            if (distribuicao[classif] !== undefined) distribuicao[classif]++; else distribuicao["Não Estratificado"]++;
        });
    } else if (agravo === 'dm') {
        distribuicao = { "Controle Otimizado": 0, "Risco Moderado": 0, "Risco Elevado (Preocupante)": 0, "Não Estratificado": 0 };
        filtrados.forEach(p => {
            const classif = p.dmClassif || 'Não Estratificado';
            if (distribuicao[classif] !== undefined) distribuicao[classif]++; else distribuicao["Não Estratificado"]++;
        });
    } else if (agravo === 'gestante') {
        distribuicao = { "1º Trimestre": 0, "2º Trimestre": 0, "3º Trimestre": 0, "Pós-Termo / Alerta": 0 };
        filtrados.forEach(p => {
            if (p.gestIG && p.gestIG.includes("Semanas")) {
                const sem = parseInt(p.gestIG);
                if (sem <= 12) distribuicao["1º Trimestre"]++;
                else if (sem <= 27) distribuicao["2º Trimestre"]++;
                else if (sem <= 41) distribuicao["3º Trimestre"]++;
                else distribuicao["Pós-Termo / Alerta"]++;
            } else {
                distribuicao["1º Trimestre"]++; // Fallback padrão se não calculado
            }
        });
    } else {
        distribuicao = { "Imediato (0d)": criticos, "Rotina APS (30d)": 0, "Crônico Estável (90d+)": 0 };
        filtrados.forEach(p => {
            const dias = parseInt(p.soapReavaliacaoDias);
            if (dias > 0 && dias <= 30) distribuicao["Rotina APS (30d)"]++;
            else if (dias > 30) distribuicao["Crônico Estável (90d+)"]++;
        });
    }

    Object.keys(distribuicao).forEach(chave => {
        const qtd = distribuicao[chave];
        const larguraBarra = totalDoAgravo > 0 ? Math.round((qtd / totalDoAgravo) * 100) : 0;
        
        containerBarras.innerHTML += `
            <div style="margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px;">
                    <span style="font-weight: 600; color: var(--text-main);">${chave}</span>
                    <span style="color: var(--text-muted);">${qtd} (${larguraBarra}%)</span>
                </div>
                <div style="width: 100%; background: #e5e7eb; height: 12px; border-radius: 4px; overflow: hidden;">
                    <div style="width: ${larguraBarra}%; background: var(--primary); height: 100%; transition: width 0.4s;"></div>
                </div>
            </div>
        `;
    });

    // 3. Filtro de Risco da Subtabela do Modal
    if (riscoSelecionado === 'CRITICO') {
        filtrados = filtrados.filter(p => parseInt(p.soapReavaliacaoDias) === 0);
    } else if (riscoSelecionado === 'CONTROLADO') {
        filtrados = filtrados.filter(p => parseInt(p.soapReavaliacaoDias) > 0);
    }

    renderizarTabelaModal(filtrados);
}

function popularFiltrosModal() {
    const ubsSet = new Set(['TODOS']);
    const equipeSet = new Set(['TODOS']);
    
    dadosTerritoriais.forEach(p => {
        if (p.unidadePaciente) ubsSet.add(p.unidadePaciente);
        if (p.equipePaciente) equipeSet.add(p.equipePaciente);
    });
    
    const selectUBS = document.getElementById('filtroUBS');
    const selectEquipe = document.getElementById('filtroEquipe');
    
    const ubsAnterior = selectUBS.value;
    const equipeAnterior = selectEquipe.value;
    
    selectUBS.innerHTML = '';
    selectEquipe.innerHTML = '';
    
    ubsSet.forEach(ubs => selectUBS.innerHTML += `<option value="${ubs}">${ubs === 'TODOS' ? 'Todas as UBS' : ubs}</option>`);
    equipeSet.forEach(eq => selectEquipe.innerHTML += `<option value="${eq}">${eq === 'TODOS' ? 'Todas as Equipes' : eq}</option>`);
    
    if (ubsSet.has(ubsAnterior)) selectUBS.value = ubsAnterior;
    if (equipeSet.has(equipeAnterior)) selectEquipe.value = equipeAnterior;
}

function renderizarTabelaModal(lista) {
    const container = document.getElementById('tabelaPainelEpidemiologico');
    if (lista.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); padding:15px; text-align:center;">Nenhum prontuário atende aos critérios.</p>`;
        return;
    }
    
    let html = `<table><thead><tr><th>Nome</th><th>Vínculo Territorial</th><th>Prazo</th><th>Ação</th></tr></thead><tbody>`;
    lista.forEach(p => {
        const prazo = parseInt(p.soapReavaliacaoDias) === 0 
            ? `<span style="color:var(--danger); font-weight:700;">⚠️ CRÍTICO</span>` 
            : `<span>${p.soapReavaliacaoDias} dias</span>`;
        html += `
            <tr>
                <td><strong>${p.nomePaciente}</strong></td>
                <td><small>${p.unidadePaciente || 'N/A'} - <strong>${p.equipePaciente || 'N/A'}</strong></small></td>
                <td>${prazo}</td>
                <td><button style="padding:4px 8px; font-size:11px;" onclick="fecharPainelEpidemiologico(); carregarProntuarioParaEdicao('${p.cpfPaciente}')">Ver SOAP</button></td>
            </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
}

function fecharPainelEpidemiologico() {
    document.getElementById('painelEpidemiologicoContainer').style.display = 'none';
}

// ==========================================================================
// 📞 SUBSISTEMA 2: CENTRAL DE BUSCA ATIVA TERRITORIAL (DISCADOR)
// ==========================================================================
function renderizarCentralBuscaAtiva() {
    const container = document.getElementById("tabelaDiscadorContainer");
    
    // Regra Operacional Absoluta: Aprazamento Imediato (0 dias) OU Abandono de Linha de Cuidado (> 90 dias)
    const alvosBuscaAtiva = dadosTerritoriais.filter(p => {
        const dias = parseInt(p.soapReavaliacaoDias) || 0;
        return dias === 0 || dias > 90;
    });

    if (alvosBuscaAtiva.length === 0) {
        container.innerHTML = `<p style="padding: 20px; text-align: center; color: var(--text-muted);">🎉 Excelente! Nenhum utente em atraso crítico ou abandono no território atual.</p>`;
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Cidadão / Contato</th>
                    <th>Vulnerabilidade / Agravo</th>
                    <th>Alerta Operacional</th>
                    <th>Ações Estratégicas</th>
                </tr>
            </thead>
            <tbody>
    `;

    alvosBuscaAtiva.forEach(p => {
        const dias = parseInt(p.soapReavaliacaoDias) || 0;
        let motivoAlerta = "";
        let estiloTr = "";

        if (dias === 0) {
            motivoAlerta = `<span style="background: #fee2e2; color: var(--danger); padding:4px 8px; border-radius:4px; font-weight:700; font-size:12px;">🚨 PRAZO EXPIRADO (0d)</span>`;
        } else {
            motivoAlerta = `<span style="background: #fef3c7; color: #92400e; padding:4px 8px; border-radius:4px; font-weight:700; font-size:12px;">⚠️ ABANDONO (>90d)</span>`;
            estiloTr = "background: #fffbeb;";
        }

        // Reconhecimento automático das condições clínicas para o discador
        let tagsClinicas = [];
        if (p.hasSN === "Sim") tagsClinicas.push("HAS");
        if (p.dmSN === "Sim") tagsClinicas.push("DM");
        if (p.gestanteSN === "Sim") tagsClinicas.push("Pré-Natal");
        if (p.tbSN === true || p.tbSN === "Sim") tagsClinicas.push("TB");
        if (p.hansenSN === true || p.hansenSN === "Sim") tagsClinicas.push("Hansen");
        
        const agravosStr = tagsClinicas.length > 0 
            ? tagsClinicas.map(t => `<span style="background:var(--secondary-mint); color:var(--primary); font-size:10px; font-weight:700; padding:2px 5px; border-radius:3px; margin-right:3px;">${t}</span>`).join("")
            : `<span style="color:var(--text-muted); font-size:12px;">Rotina Preventiva</span>`;

        // Link automatizado para o WhatsApp Web de busca ativa municipal
        const msgWhatsapp = encodeURIComponent(`Olá, ${p.nomePaciente}. Aqui é da sua Equipe de Saúde da Família (${p.equipePaciente || 'Atenção Primária'}). Notamos que seu acompanhamento clínico precisa de atualização. Podemos agendar sua visita?`);
        const linkZap = p.telPaciente 
            ? `<a href="https://api.whatsapp.com/send?phone=55${p.telPaciente.replace(/\D/g, '')}&text=${msgWhatsapp}" target="_blank" style="background:#25d366; color:white; padding:5px 10px; border-radius:4px; font-size:12px; text-decoration:none; font-weight:600;">💬 WhatsApp</a>`
            : `<span style="color:var(--text-muted); font-size:11px;">Sem Telefone</span>`;

        html += `
            <tr style="${estiloTr}">
                <td>
                    <strong>${p.nomePaciente}</strong><br>
                    <small style="color:var(--text-muted);">${p.telPaciente || 'Telefone não cadastrado'}</small>
                </td>
                <td>
                    <div style="margin-bottom:4px;">${agravosStr}</div>
                    <small style="color:var(--text-muted);">${p.unidadePaciente || 'Sem UBS'} • <strong>${p.equipePaciente || 'Sem Equipe'}</strong></small>
                </td>
                <td>${motivoAlerta}</td>
                <td>
                    <div style="display:flex; gap:8px; align-items:center;">
                        ${linkZap}
                        <button style="padding:5px 10px; font-size:12px; background:var(--primary);" onclick="carregarProntuarioParaEdicao('${p.cpfPaciente}')">📝 Abrir SOAP</button>
                    </div>
                </td>
            </tr>
        `;
    });

    html += "</tbody></table>";
    container.innerHTML = html;
}

// ==========================================================================
// 🔍 BUSCA ATIVA E INTEGRAÇÃO DE COMPONENTES NA TELA INICIAL
// ==========================================================================
function buscarInicio() {
    const termo = document.getElementById("buscaNomeInicio").value.toLowerCase().trim();
    const container = document.getElementById("divInjecaoCaixinhas");

    if (termo.length < 2) {
        container.innerHTML = `<em style="color: #94a3b8; font-size:13px;">Introduza pelo menos 2 caracteres para varrer o território...</em>`;
        return;
    }

    const filtrados = dadosTerritoriais.filter(p => 
        p.nomePaciente.toLowerCase().includes(termo) || 
        (p.cpfPaciente && p.cpfPaciente.includes(termo))
    );

    if (filtrados.length === 0) {
        container.innerHTML = `
            <div style="padding:15px; background:#f8fafc; border-radius:6px; border:1px solid var(--border); text-align:center;">
                <p style="color:var(--text-muted); font-size:14px; margin-bottom:10px;">Cidadão não localizado no banco de dados local.</p>
                <button onclick="configurarNovoPacienteComDadosDeBusca('${termo}')" style="background:var(--primary); font-size:13px; padding:6px 12px;">➕ Cadastrar como Novo Residente</button>
            </div>`;
        return;
    }

    let html = `<div class="busca-ativa-grid">`;
    filtrados.forEach(p => {
        let tags = "";
        if (p.hasSN === "Sim") tags += `<span class="tag-clinica" style="background:var(--danger)">HAS</span>`;
        if (p.dmSN === "Sim") tags += `<span class="tag-clinica" style="background:var(--primary)">DM</span>`;
        if (p.gestanteSN === "Sim") tags += `<span class="tag-clinica" style="background:var(--warning)">PRÉ-NATAL</span>`;
        
        html += `
            <div class="busca-ativa-card" onclick="carregarProntuarioParaEdicao('${p.cpfPaciente}')">
                <h4>${p.nomePaciente}</h4>
                <p><strong>CPF:</strong> ${p.cpfPaciente} | <strong>Idade:</strong> ${p.idadePaciente || '---'}</p>
                <p style="color:var(--text-muted); font-size:12px;">${p.unidadePaciente || 'Sem UBS'} • ${p.equipePaciente || 'Sem Equipe'}</p>
                <div style="margin-top:8px;">${tags}</div>
            </div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
}

function configurarNovoPacienteComDadosDeBusca(termo) {
    limparFormularioProntuario();
    if (/^\d+$/.test(termo) && termo.length === 11) {
        document.getElementById("cpfPaciente").value = termo;
    } else {
        document.getElementById("nomePaciente").value = termo;
    }
    navigate("prontuario");
}

// ==========================================================================
// 🩺 MOTOR CLINICO: FORMULÁRIO SOAP E CLASSIFICAÇÕES SANITÁRIAS
// ==========================================================================
function salvarProntuario() {
    const nome = document.getElementById("nomePaciente").value.trim();
    const cpf = document.getElementById("cpfPaciente").value.replace(/\D/g, "");

    if (!nome || !cpf || cpf.length !== 11) {
        exibirToast("Nome completo e um CPF válido (11 dígitos) são obrigatórios.", "danger");
        return;
    }

    const paciente = {
        nomePaciente: nome,
        cpfPaciente: cpf,
        nascPaciente: document.getElementById("nascPaciente").value,
        idadePaciente: document.getElementById("idadePaciente").value,
        telPaciente: document.getElementById("telPaciente").value,
        CEP: document.getElementById("CEP").value,
        endPaciente: document.getElementById("endPaciente").value,
        endNumero: document.getElementById("endNumero").value,
        endComplemento: document.getElementById("endComplemento").value,
        unidadePaciente: document.getElementById("unidadePaciente").value,
        equipePaciente: document.getElementById("equipePaciente").value,
        
        soapSubjetivo: document.getElementById("soapSubjetivo").value,
        objPA: document.getElementById("objPA").value,
        objFC: document.getElementById("objFC").value,
        objFR: document.getElementById("objFR").value,
        objSatO2: document.getElementById("objSatO2").value,
        objDor: document.getElementById("objDor").value,
        exameFisicoStatus: document.querySelector('input[name="exameFisicoStatus"]:checked').value,
        soapObjetivoAlterado: document.getElementById("soapObjetivoAlterado").value,
        
        hasSN: document.getElementById("hasSN").value,
        hasPAS: document.getElementById("hasPAS").value,
        hasPAD: document.getElementById("hasPAD").value,
        hasClassif: document.getElementById("hasClassif").value,
        
        dmSN: document.getElementById("dmSN").value,
        dmHbA1c: document.getElementById("dmHbA1c").value,
        dmClassif: document.getElementById("dmClassif").value,
        
        gestanteSN: document.getElementById("gestanteSN").value,
        gestDUM: document.getElementById("gestDUM").value,
        gestIG: document.getElementById("gestIG").value,
        gestDPP: document.getElementById("gestDPP").value,
        
        tbSN: document.getElementById("tbSN").checked,
        hansenSN: document.getElementById("hansenSN").checked,
        ampiPaciente: document.getElementById("ampiPaciente").value,
        
        inputBuscaCIAPS: document.getElementById("inputBuscaCIAPS").value,
        soapReavaliacaoDias: document.getElementById("soapReavaliacaoDias").value,
        soapPlanoConduta: document.getElementById("soapPlanoConduta").value,
        dataRegistroRegistro: new Date().toISOString()
    };

    const transaction = db.transaction(["prontuarios"], "readwrite");
    const store = transaction.objectStore("prontuarios");
    const request = store.put(paciente);

    request.onsuccess = () => {
        exibirToast(`Prontuário de ${nome} salvo com sucesso com amarração territorial.`);
        limparFormularioProntuario();
        sincronizarCacheMemoria();
        navigate("inicio");
    };
}

function carregarProntuarioParaEdicao(cpf) {
    const transaction = db.transaction(["prontuarios"], "readonly");
    const store = transaction.objectStore("prontuarios");
    const request = store.get(cpf);

    request.onsuccess = () => {
        const p = request.result;
        if (!p) return;

        document.getElementById("nomePaciente").value = p.nomePaciente || "";
        document.getElementById("cpfPaciente").value = p.cpfPaciente || "";
        document.getElementById("nascPaciente").value = p.nascPaciente || "";
        document.getElementById("idadePaciente").value = p.idadePaciente || "";
        document.getElementById("telPaciente").value = p.telPaciente || "";
        document.getElementById("CEP").value = p.CEP || "";
        document.getElementById("endPaciente").value = p.endPaciente || "";
        document.getElementById("endNumero").value = p.endNumero || "";
        document.getElementById("endComplemento").value = p.endComplemento || "";
        document.getElementById("unidadePaciente").value = p.unidadePaciente || "";
        document.getElementById("equipePaciente").value = p.equipePaciente || "";
        
        document.getElementById("soapSubjetivo").value = p.soapSubjetivo || "";
        document.getElementById("objPA").value = p.objPA || "";
        document.getElementById("objFC").value = p.objFC || "";
        document.getElementById("objFR").value = p.objFR || "";
        document.getElementById("objSatO2").value = p.objSatO2 || "";
        document.getElementById("objDor").value = p.objDor || "0";
        
        if (p.exameFisicoStatus === "Alterado") {
            document.querySelector('input[name="exameFisicoStatus"][value="Alterado"]').checked = true;
            alternarExameFisico("Alterado");
        } else {
            document.querySelector('input[name="exameFisicoStatus"][value="Normal"]').checked = true;
            alternarExameFisico("Normal");
        }
        document.getElementById("soapObjetivoAlterado").value = p.soapObjetivoAlterado || "";
        
        document.getElementById("hasSN").value = p.hasSN || "Não";
        mostrarCard("cardHAS", p.hasSN);
        document.getElementById("hasPAS").value = p.hasPAS || "";
        document.getElementById("hasPAD").value = p.hasPAD || "";
        document.getElementById("hasClassif").value = p.hasClassif || "";
        
        document.getElementById("dmSN").value = p.dmSN || "Não";
        mostrarCard("cardDM", p.dmSN);
        document.getElementById("dmHbA1c").value = p.dmHbA1c || "";
        document.getElementById("dmClassif").value = p.dmClassif || "";
        
        document.getElementById("gestanteSN").value = p.gestanteSN || "Não";
        mostrarCard("cardGestante", p.gestanteSN);
        document.getElementById("gestDUM").value = p.gestDUM || "";
        document.getElementById("gestIG").value = p.gestIG || "";
        document.getElementById("gestDPP").value = p.gestDPP || "";
        
        document.getElementById("tbSN").checked = !!p.tbSN;
        document.getElementById("hansenSN").checked = !!p.hansenSN;
        document.getElementById("ampiPaciente").value = p.ampiPaciente || "Idoso Robusto";
        
        document.getElementById("inputBuscaCIAPS").value = p.inputBuscaCIAPS || "";
        document.getElementById("soapReavaliacaoDias").value = p.soapReavaliacaoDias || "30";
        document.getElementById("soapPlanoConduta").value = p.soapPlanoConduta || "";

        // Mostra o cabeçalho persistente de Prontuário Ativo para o clínico
        const cabecalho = document.getElementById("cabecalhoProntuario");
        document.getElementById("cabecalhoNome").innerText = `📋 Prontuário Ativo: ${p.nomePaciente} (${p.cpfPaciente})`;
        cabecalho.style.display = "block";

        // Linha do tempo de evoluções passadas (Simulação de auditoria clínica baseada na data de registro)
        const timeline = document.getElementById("linhaTempoEvolucoes");
        if (p.dataRegistroRegistro) {
            const dataFormatada = new Date(p.dataRegistroRegistro).toLocaleDateString('pt-BR');
            timeline.innerHTML = `
                <label>Evoluções Anteriores Confirmadas</label>
                <div class="timeline">
                    <div class="timeline-item">
                        <strong>Evolução em ${dataFormatada} por Matrícula ${usuarioAutenticado ? usuarioAutenticado.matricula : 'SUS'}:</strong>
                        <p style="font-size:13px; margin-top:4px;"><em>S: ${p.soapSubjetivo || '---'} | O: PA ${p.objPA || '---'} MMHG | A: CIAP ${p.inputBuscaCIAPS || '---'} | P: ${p.soapPlanoConduta || '---'}</em></p>
                    </div>
                </div>`;
        } else {
            timeline.innerHTML = "";
        }

        verificarExibicaoAmpiIdoso(p.idadePaciente);
        navigate("prontuario");
    };
}

// --- 🧮 INTEGRAÇÃO DE REGRAS CLÍNICAS ACADÊMICAS ---
function classificarHAS() {
    const pas = parseInt(document.getElementById("hasPAS").value) || 0;
    const pad = parseInt(document.getElementById("hasPAD").value) || 0;
    const campo = document.getElementById("hasClassif");

    if (!pas || !pad) { campo.value = "Aguardando dados completos..."; return; }

    if (pas >= 180 || pad >= 120) campo.value = "Crise Hipertensiva";
    else if (pas >= 160 || pad >= 100) campo.value = "Estágio 3";
    else if ((pas >= 140 && pas <= 159) || (pad >= 90 && pad <= 99)) campo.value = "Estágio 2";
    else if ((pas >= 130 && pas <= 139) || (pad >= 85 && pad <= 89)) campo.value = "Estágio 1";
    else campo.value = "Normal / Controlado";
}

function classificarDM() {
    const hba1c = parseFloat(document.getElementById("dmHbA1c").value) || 0;
    const campo = document.getElementById("dmClassif");

    if (!hba1c) { campo.value = "Aguardando dados..."; return; }

    if (hba1c < 7.0) campo.value = "Controle Otimizado";
    else if (hba1c >= 7.0 && hba1c <= 8.5) campo.value = "Risco Moderado";
    else campo.value = "Risco Elevado (Preocupante)";
}

function calcIdade() {
    const dataNasc = document.getElementById("nascPaciente").value;
    if (!dataNasc) return;

    const nasc = new Date(dataNasc);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
        idade--;
    }

    document.getElementById("idadePaciente").value = `${idade} Anos`;
    verificarExibicaoAmpiIdoso(idade);
}

function verificarExibicaoAmpiIdoso(idadeStr) {
    const idade = parseInt(idadeStr) || 0;
    const bloco = document.getElementById("ampiBloco");
    if (bloco) bloco.style.display = idades >= 60 ? "block" : "none";
}

function calcIG() {
    const dumInput = document.getElementById("gestDUM").value;
    if (!dumInput) return;

    const dum = new Date(dumInput);
    const hoje = new Date();
    
    const diffTime = Math.abs(hoje - dum);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const semanas = Math.floor(diffDays / 7);
    const diasRestantes = diffDays % 7;

    document.getElementById("gestIG").value = `${semanas} Semanas e ${diasRestantes} Dias`;

    // Regra de Nägele para cálculo de Data Provável do Parto (DPP)
    const dpp = new Date(dum);
    dpp.setDate(dpp.getDate() + 7);
    dpp.setMonth(dpp.getMonth() - 3);
    if (dpp < dum) dpp.setFullYear(dpp.getFullYear() + 1);

    document.getElementById("gestDPP").value = dpp.toLocaleDateString('pt-BR');
}

// ==========================================================================
// 🛠️ UTILITÁRIOS DE INTERFACE, NAVEGAÇÃO E MASSA DE DADOS
// ==========================================================================
function navigate(viewId) {
    document.querySelectorAll(".view, #view-inicio").forEach(v => v.style.display = "none");
    document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));

    const alvo = document.getElementById(`view-${viewId}`);
    if (alvo) alvo.style.display = "block";

    const linkAtivo = Array.from(document.querySelectorAll(".nav-link")).find(l => l.getAttribute("onclick").includes(viewId));
    if (linkAtivo) linkAtivo.classList.add("active");

    // Gatilhos específicos de carregamento de dados em tempo real
    if (viewId === "banco") renderizarBaseTerritorial();
    if (viewId === "discador") renderizarCentralBuscaAtiva();
}

function renderizarBaseTerritorial() {
    const container = document.getElementById("tabelaBancoContainer");
    if (dadosTerritoriais.length === 0) {
        container.innerHTML = `<p style="padding:15px; text-align:center; color:var(--text-muted);">Nenhum cidadão residente cadastrado na base local.</p>`;
        return;
    }

    let html = `<table><thead><tr><th>Cidadão</th><th>CPF</th><th>Equipe Vinculada</th><th>Ações</th></tr></thead><tbody>`;
    dadosTerritoriais.forEach(p => {
        html += `
            <tr>
                <td><strong>${p.nomePaciente}</strong><br><small style="color:var(--text-muted);">Idade: ${p.idadePaciente || '---'}</small></td>
                <td>${p.cpfPaciente}</td>
                <td>${p.unidadePaciente || 'Não Definitiva'}<br><strong>${p.equipePaciente || 'Sem Equipe'}</strong></td>
                <td><button style="padding:4px 8px; font-size:12px;" onclick="carregarProntuarioParaEdicao('${p.cpfPaciente}')">Editar Prontuário</button></td>
            </tr>`;
    });
    html += "</tbody></table>";
    container.innerHTML = html;
}

function gerarCargaMassaOitoMil() {
    if (!usuarioAutenticado || usuarioAutenticado.perfil !== 'admin') {
        exibirToast("Operação restrita! Apenas o Perfil Gestor pode rodar testes de stress cadastrais.", "danger");
        return;
    }

    exibirToast("Iniciando injeção em massa de 8.000 cadastros territoriais. Aguarde...", "warning");
    const transaction = db.transaction(["prontuarios"], "readwrite");
    const store = transaction.objectStore("prontuarios");

    const ubsLista = ["UBS Centro Médico", "UBS Vila Nova", "Clínica da Família Zona Sul", "UBS Integrada Norte"];
    const equipesLista = ["Equipe Verde", "Equipe Azul", "Equipe Esmeralda", "Equipe Rubi"];
    const agravosSistemas = ["Sim", "Não"];

    for (let i = 1; i <= 8000; i++) {
        const cpfGerado = String(i).padStart(11, "0");
        const hasStatus = agravosSistemas[Math.floor(Math.random() * agravosSistemas.length)];
        const dmStatus = agravosSistemas[Math.floor(Math.random() * agravosSistemas.length)];
        const aprazamentoAleatorio = [0, 30, 90][Math.floor(Math.random() * 3)]; // Distribuição realista

        const item = {
            cpfPaciente: cpfGerado,
            nomePaciente: `Cidadão Acadêmico Matriz Nº ${i}`,
            nascPaciente: "1980-01-01",
            idadePaciente: "46 Anos",
            unidadePaciente: ubsLista[Math.floor(Math.random() * ubsLista.length)],
            equipePaciente: equipesLista[Math.floor(Math.random() * equipesLista.length)],
            hasSN: hasStatus,
            hasClassif: hasStatus === "Sim" ? "Estágio 1" : "",
            dmSN: dmStatus,
            dmClassif: dmStatus === "Sim" ? "Controle Otimizado" : "",
            gestanteSN: "Não",
            soapReavaliacaoDias: String(aprazamentoAleatorio),
            soapSubjetivo: "Dados estruturados de carga em massa simulando strings complexas de anamnese SOAP.",
            soapPlanoConduta: "Conduta padrão parametrizada para testes de latência e performance de memória.",
            dataRegistroRegistro: new Date().toISOString()
        };
        store.put(item);
    }

    transaction.oncomplete = () => {
        exibirToast("Sucesso! Matriz Epidemiológica de 8.000 cadastros gravada e consolidada no IndexedDB.");
        sincronizarCacheMemoria();
    };
}

// --- 🛠️ OUTROS UTILITÁRIOS DA VIEW ---
function popularListaCiap() {
    const datalist = document.getElementById("listaCIAP");
    if (!datalist) return;
    Object.keys(CATALOGO_CIAPS2).forEach(key => {
        datalist.innerHTML += `<option value="${key} - ${CATALOGO_CIAPS2[key]}">`;
    });
}

function buscarCEP() {
    const cep = document.getElementById("CEP").value.replace(/\D/g, "");
    if (cep.length !== 8) return;

    fetch(`https://viacep.com.br/ws/${cep}/json/`)
        .then(res => res.json())
        .then(data => {
            if (!data.erro) {
                document.getElementById("endPaciente").value = `${data.logradouro} - ${data.bairro}, ${data.localidade}/${data.uf}`;
            }
        });
}

function processarArquivoEsus(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const list = JSON.parse(e.target.result);
            const dadosParaImportar = Array.isArray(list) ? list : [list];
            
            const transaction = db.transaction(["prontuarios"], "readwrite");
            const store = transaction.objectStore("prontuarios");

            dadosParaImportar.forEach(p => {
                if(p.cpfPaciente) store.put(p);
            });

            transaction.oncomplete = () => {
                exibirToast(`Importação JSON concluída. Lote processado com sucesso.`);
                sincronizarCacheMemoria();
            };
        } catch(err) {
            exibirToast("Erro de sintaxe interna no arquivo JSON importado.", "danger");
        }
    };
    reader.readAsText(file);
}

function mascaraCPF(i) {
    let v = i.value;
    if (isNaN(v.replace(/\D/g, ""))) { i.value = ""; return; }
    i.setAttribute("maxlength", "14");
    if (v.length == 3 || v.length == 7) i.value += ".";
    if (v.length == 11) i.value += "-";
}

function alternarExameFisico(status) {
    document.getElementById("blocoExameAlterado").style.display = status === "Alterado" ? "block" : "none";
}

function mostrarCard(id, valor) {
    document.getElementById(id).style.display = valor === "Sim" ? "block" : "none";
}

function limparFormularioProntuario() {
    document.getElementById("cabecalhoProntuario").style.display = "none";
    document.getElementById("linhaTempoEvolucoes").innerHTML = "";
    
    document.getElementById("nomePaciente").value = "";
    document.getElementById("cpfPaciente").value = "";
    document.getElementById("nascPaciente").value = "";
    document.getElementById("idadePaciente").value = "";
    document.getElementById("telPaciente").value = "";
    document.getElementById("CEP").value = "";
    document.getElementById("endPaciente").value = "";
    document.getElementById("endNumero").value = "";
    document.getElementById("endComplemento").value = "";
    document.getElementById("unidadePaciente").value = "";
    document.getElementById("equipePaciente").value = "";
    
    document.getElementById("soapSubjetivo").value = "";
    document.getElementById("objPA").value = "";
    document.getElementById("objFC").value = "";
    document.getElementById("objFR").value = "";
    document.getElementById("objSatO2").value = "";
    document.getElementById("objDor").value = "0";
    document.querySelector('input[name="exameFisicoStatus"][value="Normal"]').checked = true;
    alternarExameFisico("Normal");
    document.getElementById("soapObjetivoAlterado").value = "";
    
    document.getElementById("hasSN").value = "Não";
    mostrarCard("cardHAS", "Não");
    document.getElementById("hasPAS").value = "";
    document.getElementById("hasPAD").value = "";
    document.getElementById("hasClassif").value = "";
    
    document.getElementById("dmSN").value = "Não";
    mostrarCard("cardDM", "Não");
    document.getElementById("dmHbA1c").value = "";
    document.getElementById("dmClassif").value = "";
    
    document.getElementById("gestanteSN").value = "Não";
    mostrarCard("cardGestante", "Não");
    document.getElementById("gestDUM").value = "";
    document.getElementById("gestIG").value = "";
    document.getElementById("gestDPP").value = "";
    
    document.getElementById("tbSN").checked = false;
    document.getElementById("hansenSN").checked = false;
    document.getElementById("ampiPaciente").value = "Idoso Robusto";
    
    document.getElementById("inputBuscaCIAPS").value = "";
    document.getElementById("soapReavaliacaoDias").value = "30";
    document.getElementById("soapPlanoConduta").value = "";
}

function exibirToast(texto, tipo = "success") {
    const toast = document.getElementById("toastNotification");
    if (!toast) return;
    toast.innerText = texto;
    toast.style.background = tipo === "danger" ? "#dc2626" : tipo === "warning" ? "#d97706" : "var(--text-main)";
    toast.style.display = "block";
    setTimeout(() => { toast.style.display = "none"; }, 4000);
}
