// ======================================================
// NAVEGAÇÃO
// ======================================================

function navigate(view) {

    // verifica permissões
    if (
        typeof podeAcessar === 'function' &&
        !podeAcessar(view)
    ) {
        alert('Você não possui permissão para acessar esta área.');
        return;
    }

    // esconde views
    document.querySelectorAll('.view').forEach(v => {
        v.style.display = 'none';
    });

    // remove ativo menu
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // abre view
    const tela = document.getElementById('view-' + view);

    if (!tela) {
        console.error('Tela não encontrada:', 'view-' + view);
        return;
    }

    tela.style.display = 'block';

    // ativa menu
    const menu = Array.from(
        document.querySelectorAll('.nav-link')
    ).find(link =>
        link.getAttribute('onclick')?.includes(view)
    );

    if (menu) {
        menu.classList.add('active');
    }

    // ==================================================
    // MÓDULOS
    // ==================================================

    if (
        view === 'banco' &&
        typeof carregarTabelaBanco === 'function'
    ) {
        carregarTabelaBanco();
    }

    if (
        view === 'reuniao' &&
        typeof abrirModuloReuniao === 'function'
    ) {
        abrirModuloReuniao();
    }

    if (
        view === 'prontuario' &&
        typeof carregarDatalistCIAP === 'function'
    ) {
        carregarDatalistCIAP();
    }

    if (view === 'config') {

        console.log('Configurações & Carga aberta.');

        if (
            typeof listarUsuariosSistema === 'function'
        ) {
            listarUsuariosSistema();
        }
    }
}

function autenticarUsuario() {
    const usuario = document.getElementById("loginUser").value.trim();
    const senha = document.getElementById("loginSenha").value.trim();
    const erro = document.getElementById("loginErro");

    if (!usuario || !senha) {
        erro.style.display = "block";
        erro.innerText = "Informe usuário e senha.";
        return;
    }

    localStorage.setItem("usuarioLogado", JSON.stringify({
        usuario: usuario,
        nome: usuario,
        nivel: "admin",
        logadoEm: new Date().toISOString()
    }));

    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("app").style.display = "block";

    const nomeUsuario = document.getElementById("nomeUsuarioLogado");
    if (nomeUsuario) {
        nomeUsuario.innerText = "Usuário: " + usuario;
    }
}

function verificarLoginSalvo() {
    const sessao = localStorage.getItem("usuarioLogado");

    if (sessao) {
        const dados = JSON.parse(sessao);

        document.getElementById("loginScreen").style.display = "none";
        document.getElementById("app").style.display = "block";

        const nomeUsuario = document.getElementById("nomeUsuarioLogado");
        if (nomeUsuario) {
            nomeUsuario.innerText = "Usuário: " + dados.usuario;
        }
    } else {
        document.getElementById("loginScreen").style.display = "flex";
        document.getElementById("app").style.display = "none";
    }
}

function efetuarLogout() {
    localStorage.removeItem("usuarioLogado");

    document.getElementById("loginScreen").style.display = "flex";
    document.getElementById("app").style.display = "none";
}

document.addEventListener("DOMContentLoaded", verificarLoginSalvo);

window.navigate = navigate;
