document.addEventListener('DOMContentLoaded', () => {
    carregarDatalistCIAP();
    aguardarBancoEIniciar();
});

function aguardarBancoEIniciar(tentativas = 0) {
    const bancoPronto =
        (typeof db !== 'undefined' && db) ||
        (typeof window.db !== 'undefined' && window.db);

    if (bancoPronto) {
        console.log('✅ Banco pronto. Iniciando aplicação.');

        if (typeof atualizarIndicatorsDashboard === 'function') {
            atualizarIndicatorsDashboard();
        }

        if (typeof atualizarCentralAvisosSininho === 'function') {
            atualizarCentralAvisosSininho();
        }

        return;
    }

    if (tentativas >= 30) {
        console.warn('⚠️ Banco ainda não conectou após aguardar.');
        return;
    }

    setTimeout(() => {
        aguardarBancoEIniciar(tentativas + 1);
    }, 300);
}loginScreen').style.display = 'flex';
}
