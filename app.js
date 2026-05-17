/* ============================================================
   app.js 
   Controle geral do sistema, navegação e placeholders
=========================================================== */

let pacientes = [];  // base de dados futura

/* ----------- Navegação entre telas ----------- */
function nav(view) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById("view-" + view).classList.remove("hidden");
}

/* ----------- Atualizar tela inicial ----------- */
function atualizarInicio() {
    let htmlTodos = "";
    let htmlDesac = "";

    pacientes.forEach(p => {
        htmlTodos += `
            <div class="card">
                <b>${p.nome}</b><br>
                CPF: ${p.cpf}<br><br>
                <button onclick="abrirPaciente('${p.id}')">Abrir</button>
            </div>
        `;
    });

    listaTodos.innerHTML = htmlTodos;
    listaDesac.innerHTML = htmlDesac;
}

/* ----------- Abrir prontuário (no futuro) ----------- */
function abrirPaciente(id) {
    const p = pacientes.find(x => x.id === id);
    if (!p) return;
    nav("prontuario");
}

/* ----------- Listagem no banco ----------- */
function atualizarBanco() {
    let html = "";

    pacientes.forEach(p => {
        html += `
            <div class="card">
                <b>${p.nome}</b><br>
                ${p.cpf}<br><br>
                <button onclick="abrirPaciente('${p.id}')">Abrir</button>
                <button onclick="excluirPaciente('${p.id}')">Excluir</button>
            </div>
        `;
    });

    listaBanco.innerHTML = html;
}

function excluirPaciente(id) {
    pacientes = pacientes.filter(p => p.id !== id);
    atualizarBanco();
    atualizarInicio();
}

/* ----------- Buscar paciente ----------- */
function buscarPaciente() {
    const nome = buscaNome.value.toLowerCase();
    const cpf = buscaCPF.value;

    const filtrados = pacientes.filter(p =>
        p.nome.toLowerCase().includes(nome) &&
        p.cpf.includes(cpf)
    );

    listaTodos.innerHTML = filtrados
        .map(p => `
            <div class="card">
                <b>${p.nome}</b><br>
                ${p.cpf}<br><br>
                <button onclick="abrirPaciente('${p.id}')">Abrir</button>
            </div>
        `)
        .join("");
}

buscaNome?.addEventListener("input", buscarPaciente);
buscaCPF?.addEventListener("input", buscarPaciente);

/* ----------- Inicialização do aplicativo ----------- */
function initApp() {
    // No futuro, aqui carregaremos dados reais (criptografados)

    // Exemplo de registro temporário
    pacientes = [
        { id: "p001", nome: "Maria Silva", cpf: "12345678901" },
        { id: "p002", nome: "João Souza", cpf: "98765432100" }
    ];

    atualizarInicio();
    atualizarBanco();
}
