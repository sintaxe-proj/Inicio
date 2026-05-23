// ======================================================
// SINTAXEHUB - USUARIOS.JS
// PERFIS: admin, assistencial, recepcao
// ======================================================

const USUARIOS_KEY = 'sintaxehub_usuarios';
const SESSAO_KEY = 'sintaxehub_usuario_logado';

function inicializarUsuariosPadrao() {
    let usuarios = JSON.parse(localStorage.getItem(USUARIOS_KEY) || '[]');

    if (usuarios.length === 0) {
        usuarios = [
            {
                id: Date.now(),
                nome: 'Administrador',
                usuario: 'admin',
                senha: 'admin123',
                perfil: 'admin',
                ativo: true
            }
        ];

        localStorage.setItem(USUARIOS_KEY, JSON.stringify(usuarios));
    }
}

function autenticarUsuario() {
    inicializarUsuariosPadrao();

    const usuario = document.getElementById('loginUser')?.value.trim();
    const senha = document.getElementById('loginSenha')?.value.trim();
    const erro = document.getElementById('loginErro');

    const usuarios = JSON.parse(localStorage.getItem(USUARIOS_KEY) || '[]');

    const encontrado = usuarios.find(u =>
        u.usuario === usuario &&
        u.senha === senha &&
        u.ativo
    );

    if (!encontrado) {
        if (erro) {
            erro.innerText = 'Usuário ou senha inválidos.';
            erro.style.display = 'block';
        }
        return;
    }

    localStorage.setItem(SESSAO_KEY, JSON.stringify(encontrado));

    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('app').style.display = 'block';

    aplicarPermissoesUsuario();

    if (typeof navigate === 'function') {
        navigate('inicio');
    }
}

function obterUsuarioLogado() {
    return JSON.parse(localStorage.getItem(SESSAO_KEY) || 'null');
}

function aplicarPermissoesUsuario() {
    const usuario = obterUsuarioLogado();
    if (!usuario) return;

    const nome = document.getElementById('nomeUsuarioLogado');
    if (nome) {
        nome.innerText = `${usuario.nome} • ${usuario.perfil}`;
    }

    const btnConfig = document.getElementById('btnAuditoria');

    if (btnConfig) {
        btnConfig.style.display = usuario.perfil === 'admin' ? 'inline-block' : 'none';
    }

    if (usuario.perfil === 'recepcao') {
        ocultarInformacoesClinicasRecepcao();
    }
}

function ocultarInformacoesClinicasRecepcao() {
    const idsClinicos = [
        'view-prontuario',
        'cardHAS',
        'cardDM',
        'cardGestante',
        'ampiBloco',
        'painelRiscoClinico',
        'linhaTempoEvolucoes'
    ];

    idsClinicos.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    document.querySelectorAll('.dash-card').forEach(card => {
        card.style.display = 'none';
    });
}

function podeAcessar(view) {
    const usuario = obterUsuarioLogado();

    if (!usuario) return false;

    if (usuario.perfil === 'admin') {
        return true;
    }

    if (usuario.perfil === 'assistencial') {
        return view !== 'config';
    }

    if (usuario.perfil === 'recepcao') {
        return ['inicio', 'banco'].includes(view);
    }

    return false;
}

function salvarNovoUsuario() {
    const nome = document.getElementById('novoUsuarioNome')?.value.trim();
    const usuario = document.getElementById('novoUsuarioLogin')?.value.trim();
    const senha = document.getElementById('novoUsuarioSenha')?.value.trim();
    const perfil = document.getElementById('novoUsuarioPerfil')?.value;

    if (!nome || !usuario || !senha || !perfil) {
        alert('Preencha todos os campos.');
        return;
    }

    let usuarios = JSON.parse(localStorage.getItem(USUARIOS_KEY) || '[]');

    if (usuarios.some(u => u.usuario === usuario)) {
        alert('Já existe um usuário com esse login.');
        return;
    }

    usuarios.push({
        id: Date.now(),
        nome,
        usuario,
        senha,
        perfil,
        ativo: true
    });

    localStorage.setItem(USUARIOS_KEY, JSON.stringify(usuarios));

    limparFormularioUsuario();
    listarUsuariosSistema();

    if (typeof mostrarToast === 'function') {
        mostrarToast('Usuário criado com sucesso.');
    }
}

function listarUsuariosSistema() {
    const container = document.getElementById('listaUsuariosSistema');
    if (!container) return;

    const usuarios = JSON.parse(localStorage.getItem(USUARIOS_KEY) || '[]');

    if (usuarios.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);">Nenhum usuário cadastrado.</p>';
        return;
    }

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Nome</th>
                    <th>Usuário</th>
                    <th>Perfil</th>
                    <th>Status</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${usuarios.map(u => `
                    <tr>
                        <td>${u.nome}</td>
                        <td>${u.usuario}</td>
                        <td>${u.perfil}</td>
                        <td>${u.ativo ? 'Ativo' : 'Inativo'}</td>
                        <td>
                            <button class="btn-table-action btn-edit" onclick="alternarStatusUsuario(${u.id})">
                                ${u.ativo ? 'Bloquear' : 'Ativar'}
                            </button>
                            <button class="btn-table-action btn-del" onclick="excluirUsuarioSistema(${u.id})">
                                Excluir
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function alternarStatusUsuario(id) {
    let usuarios = JSON.parse(localStorage.getItem(USUARIOS_KEY) || '[]');

    usuarios = usuarios.map(u => {
        if (u.id === id) {
            u.ativo = !u.ativo;
        }
        return u;
    });

    localStorage.setItem(USUARIOS_KEY, JSON.stringify(usuarios));
    listarUsuariosSistema();
}

function excluirUsuarioSistema(id) {
    if (!confirm('Deseja excluir este usuário?')) return;

    let usuarios = JSON.parse(localStorage.getItem(USUARIOS_KEY) || '[]');
    usuarios = usuarios.filter(u => u.id !== id);

    localStorage.setItem(USUARIOS_KEY, JSON.stringify(usuarios));
    listarUsuariosSistema();
}

function limparFormularioUsuario() {
    document.getElementById('novoUsuarioNome').value = '';
    document.getElementById('novoUsuarioLogin').value = '';
    document.getElementById('novoUsuarioSenha').value = '';
    document.getElementById('novoUsuarioPerfil').value = 'assistencial';
}

function efetuarLogout() {
    localStorage.removeItem(SESSAO_KEY);

    document.getElementById('app').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
    inicializarUsuariosPadrao();
    listarUsuariosSistema();
});

window.autenticarUsuario = autenticarUsuario;
window.aplicarPermissoesUsuario = aplicarPermissoesUsuario;
window.obterUsuarioLogado = obterUsuarioLogado;
window.podeAcessar = podeAcessar;
window.salvarNovoUsuario = salvarNovoUsuario;
window.listarUsuariosSistema = listarUsuariosSistema;
window.alternarStatusUsuario = alternarStatusUsuario;
window.excluirUsuarioSistema = excluirUsuarioSistema;
window.efetuarLogout = efetuarLogout;
