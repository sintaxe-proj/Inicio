// ======================================================
// SINTAXEHUB - DATABASE.JS
// BANCO LOCAL INDEXEDDB
// ======================================================

var db = null;
window.db = null;

const DB_NAME = 'SintaxeHubDB';
const DB_VERSION = 1;
const STORE_PACIENTES = 'pacientes';

function abrirBanco() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = function(event) {
            console.error('Erro ao abrir IndexedDB:', event.target.error);
            reject(event.target.error);
        };

        request.onupgradeneeded = function(event) {
            const banco = event.target.result;

            if (!banco.objectStoreNames.contains(STORE_PACIENTES)) {
                banco.createObjectStore(STORE_PACIENTES, {
                    keyPath: 'id',
                    autoIncrement: true
                });
            }
        };

        request.onsuccess = function(event) {
            db = event.target.result;
            window.db = db;

            console.log('🗄️ IndexedDB conectado.');

            resolve(db);
        };
    });
}

async function garantirBanco() {
    if (window.db) {
        return window.db;
    }

    return await abrirBanco();
}

async function salvarPaciente(paciente) {
    const banco = await garantirBanco();

    return new Promise((resolve, reject) => {
        const tx = banco.transaction([STORE_PACIENTES], 'readwrite');
        const store = tx.objectStore(STORE_PACIENTES);

        if (!paciente.id) {
            paciente.id = Date.now();
        }

        const request = store.put(paciente);

        request.onsuccess = function() {
            resolve(paciente);
        };

        request.onerror = function(event) {
            reject(event.target.error);
        };
    });
}

async function listarPacientes() {
    const banco = await garantirBanco();

    return new Promise((resolve, reject) => {
        const tx = banco.transaction([STORE_PACIENTES], 'readonly');
        const store = tx.objectStore(STORE_PACIENTES);
        const request = store.getAll();

        request.onsuccess = function() {
            resolve(request.result || []);
        };

        request.onerror = function(event) {
            reject(event.target.error);
        };
    });
}

async function excluirPacienteBanco(id) {
    const banco = await garantirBanco();

    return new Promise((resolve, reject) => {
        const tx = banco.transaction([STORE_PACIENTES], 'readwrite');
        const store = tx.objectStore(STORE_PACIENTES);
        const request = store.delete(Number(id));

        request.onsuccess = function() {
            resolve(true);
        };

        request.onerror = function(event) {
            reject(event.target.error);
        };
    });
}

// Compatibilidade com outros módulos
async function listarTodosPacientes() {
    return await listarPacientes();
}

async function buscarTodosPacientes() {
    return await listarPacientes();
}

async function listarTodosProntuarios() {
    return await listarPacientes();
}

// Expõe funções globalmente
window.abrirBanco = abrirBanco;
window.garantirBanco = garantirBanco;
window.salvarPaciente = salvarPaciente;
window.listarPacientes = listarPacientes;
window.listarTodosPacientes = listarTodosPacientes;
window.buscarTodosPacientes = buscarTodosPacientes;
window.listarTodosProntuarios = listarTodosProntuarios;
window.excluirPacienteBanco = excluirPacienteBanco;

// Inicializa automaticamente
document.addEventListener('DOMContentLoaded', () => {
    abrirBanco().catch(console.error);
});
