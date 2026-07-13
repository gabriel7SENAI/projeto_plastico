import {
  loginProfessor,
  loginAluno,
  cadastrarAluno,
  cadastrarProfessor,
  redefinirSenha,
  removerUsuario,
  listarProfessores,
  listarAlunos,
  logoutUser,
  onAuthStateChange,
  saveUserExtraInfo,
  userExtraInfo,
  userRole,
  isOnline,
} from "./auth.js";
import {
  renderDashboard,
  setUserData as setDashboardData,
} from "./dashboard.js";
import { renderPerfil, setUserData as setPerfilData } from "./models/perfil.js";
import {
  renderMateriais,
  setUserData as setMateriaisData,
} from "./models/materiais.js";
import { renderMoinho, setUserData as setMoinhoData } from "./models/moinho.js";
import {
  renderHistorico,
  setUserData as setHistoricoData,
} from "./models/historico.js";

let currentUser = null;
let currentUserRole = null;
let isUsingLocalData = false;

// ========== DOM ELEMENTS ==========
const loginContainer = document.getElementById("loginContainer");
const appContainer = document.getElementById("appContainer");
const loginProfBtn = document.getElementById("doLoginProfBtn");
const loginAlunoBtn = document.getElementById("doLoginAlunoBtn");
const logoutBtn = document.getElementById("logoutBtnGlobal");
const userNameSpan = document.getElementById("userNameDisplay");
const userRoleBadge = document.getElementById("userRoleBadge");
const userTurnoDisplay = document.getElementById("userTurnoDisplay");

// ========== MODAIS ==========
const modal = document.getElementById("editModal");
const removeModal = document.getElementById("removeModal");
const primeiroAcessoModal = document.getElementById("primeiroAcessoModal");
const esqueciSenhaModal = document.getElementById("esqueciSenhaModal");
const gerenciarProfessoresModal = document.getElementById(
  "gerenciarProfessoresModal",
);
const gerenciarAlunosModal = document.getElementById("gerenciarAlunosModal");

// ========== INDICADOR DE CONEXÃO ==========
function showConnectionStatus() {
  const status = document.createElement("div");
  status.id = "connectionStatus";
  if (isOnline && !isUsingLocalData) {
    status.style.background = "#10b981";
    status.style.color = "white";
    status.innerHTML = "🟢 Online";
  } else if (isOnline && isUsingLocalData) {
    status.style.background = "#f59e0b";
    status.style.color = "white";
    status.innerHTML = "🟡 Dados Locais";
  } else {
    status.style.background = "#ef4444";
    status.style.color = "white";
    status.innerHTML = "🔴 Offline";
  }
  document.body.appendChild(status);
}

// ========== TABS LOGIN ==========
document.querySelectorAll(".login-tab").forEach((tab) => {
  tab.addEventListener("click", function () {
    document
      .querySelectorAll(".login-tab")
      .forEach((t) => t.classList.remove("active"));
    this.classList.add("active");
    const target = this.dataset.tab;
    document
      .querySelectorAll(".login-form")
      .forEach((f) => f.classList.remove("active"));
    document
      .getElementById(
        `login${target.charAt(0).toUpperCase() + target.slice(1)}`,
      )
      .classList.add("active");
  });
});

// ========== ESQUECI SENHA ==========
document.getElementById("esqueciSenhaProfBtn").addEventListener("click", () => {
  document.getElementById("resetEmailInput").placeholder =
    "professor@senai.com";
  esqueciSenhaModal.style.display = "block";
});

document
  .getElementById("esqueciSenhaAlunoBtn")
  .addEventListener("click", () => {
    document.getElementById("resetEmailInput").placeholder = "aluno@email.com";
    esqueciSenhaModal.style.display = "block";
  });

document.querySelector(".close-esqueci-senha").addEventListener("click", () => {
  esqueciSenhaModal.style.display = "none";
});

document
  .getElementById("btnResetarSenha")
  .addEventListener("click", async () => {
    const email = document.getElementById("resetEmailInput").value;
    const novaSenha = document.getElementById("resetNovaSenha").value;
    const confirmarSenha = document.getElementById("resetConfirmarSenha").value;

    if (!email) {
      alert("⚠️ Digite seu email!");
      return;
    }

    if (!novaSenha || !confirmarSenha) {
      alert("⚠️ Preencha a nova senha e a confirmação!");
      return;
    }

    const result = await redefinirSenha(email, novaSenha, confirmarSenha);
    if (result.success) {
      alert(result.message || "✅ Senha redefinida com sucesso!");
      esqueciSenhaModal.style.display = "none";
      document.getElementById("resetNovaSenha").value = "";
      document.getElementById("resetConfirmarSenha").value = "";
      document.getElementById("resetEmailInput").value = "";
    } else {
      alert("❌ Erro: " + result.error);
    }
  });

// ========== PRIMEIRO ACESSO ==========
document.getElementById("primeiroAcessoBtn").addEventListener("click", () => {
  primeiroAcessoModal.style.display = "block";
});

document
  .querySelector(".close-primeiro-acesso")
  .addEventListener("click", () => {
    primeiroAcessoModal.style.display = "none";
  });

document
  .getElementById("btnCadastrarAluno")
  .addEventListener("click", async () => {
    const nome = document.getElementById("novoAlunoNome").value;
    const email = document.getElementById("novoAlunoEmail").value;
    const senha = document.getElementById("novoAlunoSenha").value;
    const turno = document.getElementById("novoAlunoTurno").value;

    const checkboxes = document.querySelectorAll(
      '#professoresCheckboxes input[type="checkbox"]:checked',
    );
    const professores = Array.from(checkboxes).map((cb) => cb.value);

    if (!nome || !email || !senha) {
      alert("⚠️ Preencha todos os campos obrigatórios!");
      return;
    }

    const result = await cadastrarAluno(nome, email, senha, turno, professores);

    if (result.success) {
      alert("✅ Aluno cadastrado com sucesso! Faça login.");
      primeiroAcessoModal.style.display = "none";
      document.getElementById("loginAlunoEmail").value = email;
      document.getElementById("loginAlunoPassword").value = senha;
      document.querySelector('.login-tab[data-tab="aluno"]').click();
    } else {
      alert("❌ Erro ao cadastrar: " + result.error);
    }
  });

// ========== LOGIN PROFESSOR ==========
loginProfBtn.addEventListener("click", async () => {
  const email = document.getElementById("loginProfEmail").value;
  const pass = document.getElementById("loginProfPassword").value;
  const result = await loginProfessor(email, pass);

  if (result.success) {
    initializeApp(result.user, "professor");
  } else {
    alert("❌ Erro: " + result.error);
  }
});

// ========== LOGIN ALUNO ==========
loginAlunoBtn.addEventListener("click", async () => {
  const email = document.getElementById("loginAlunoEmail").value;
  const pass = document.getElementById("loginAlunoPassword").value;
  const result = await loginAluno(email, pass);

  if (result.success) {
    initializeApp(result.user, "aluno");
  } else {
    alert("❌ Erro: " + result.error);
  }
});

// ========== LOGOUT ==========
logoutBtn.addEventListener("click", async () => {
  await logoutUser();
  loginContainer.style.display = "block";
  appContainer.style.display = "none";
  location.reload();
});

// ========== NAVEGAÇÃO MENU HORIZONTAL ==========
function setupNavigation() {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", function () {
      document
        .querySelectorAll(".nav-item")
        .forEach((i) => i.classList.remove("active"));
      this.classList.add("active");

      const tabId = this.dataset.tab;
      document
        .querySelectorAll(".tab-content")
        .forEach((t) => t.classList.remove("active"));

      const target = document.getElementById(
        `tab${tabId.charAt(0).toUpperCase() + tabId.slice(1)}`,
      );
      if (target) {
        target.classList.add("active");
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

// ========== INICIALIZAÇÃO ==========
async function initializeApp(user, role) {
  currentUser = user;
  currentUserRole = role;

  setDashboardData(user, role, isUsingLocalData);
  setPerfilData(user, role, isUsingLocalData);
  setMateriaisData(user, role, isUsingLocalData);
  setMoinhoData(user, role, isUsingLocalData);
  setHistoricoData(user, role, isUsingLocalData);

  userNameSpan.innerText = userExtraInfo.nome || user.email.split("@")[0];
  userRoleBadge.innerHTML = role === "professor" ? "👨‍🏫 Professor" : "👨‍🎓 Aluno";
  userTurnoDisplay.innerText = userExtraInfo.turno
    ? `Turno: ${userExtraInfo.turno}`
    : "";

  loginContainer.style.display = "none";
  appContainer.style.display = "block";
  showConnectionStatus();

  await renderDashboard();
  await renderPerfil();
  await renderMateriais();
  await renderMoinho();
  await renderHistorico();

  setupNavigation();
}

// ========== MODAL EVENTOS ==========
document
  .querySelectorAll(
    ".close-modal, .close-remove-modal, .close-gerenciar-profs, .close-gerenciar-alunos",
  )
  .forEach((el) => {
    el.addEventListener("click", () => {
      modal.style.display = "none";
      removeModal.style.display = "none";
      gerenciarProfessoresModal.style.display = "none";
      gerenciarAlunosModal.style.display = "none";
    });
  });

document
  .getElementById("cancelModalBtn")
  ?.addEventListener("click", () => (modal.style.display = "none"));
document
  .getElementById("cancelRemoveModal")
  ?.addEventListener("click", () => (removeModal.style.display = "none"));

window.addEventListener("click", (e) => {
  if (e.target === modal) modal.style.display = "none";
  if (e.target === removeModal) removeModal.style.display = "none";
  if (e.target === primeiroAcessoModal)
    primeiroAcessoModal.style.display = "none";
  if (e.target === esqueciSenhaModal) esqueciSenhaModal.style.display = "none";
  if (e.target === gerenciarProfessoresModal)
    gerenciarProfessoresModal.style.display = "none";
  if (e.target === gerenciarAlunosModal)
    gerenciarAlunosModal.style.display = "none";
});

// ========== OBSERVADOR ==========
onAuthStateChange(async (state) => {
  if (state.isLoggedIn) {
    currentUser = state.user;
    currentUserRole = state.role;
    userExtraInfo.nome = state.extraInfo?.nome || "";
    userExtraInfo.turno = state.extraInfo?.turno || "";
    userExtraInfo.professoresVinculados =
      state.extraInfo?.professoresVinculados || [];
    userExtraInfo.historicoLogins = state.extraInfo?.historicoLogins || [];
    await initializeApp(state.user, state.role);
  }
});

console.log("✅ SENAI Plásticos - Sistema de Gestão v3.0");
console.log(`📡 Status: ${isOnline ? "Online" : "Offline"}`);
