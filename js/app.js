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

window.navigate = navigate;
