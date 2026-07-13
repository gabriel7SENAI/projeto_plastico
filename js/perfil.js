import {
  saveUserExtraInfo,
  userExtraInfo,
  currentUser,
  isOnline,
  cadastrarProfessor,
  removerUsuario,
  listarProfessores,
  listarAlunos,
  logoutUser,
} from "../auth.js";

let currentUserRole = null;
let currentUserGlobal = null;
let isUsingLocalData = false;

export function setUserData(user, role, localFlag) {
  currentUserGlobal = user;
  currentUserRole = role;
  isUsingLocalData = localFlag || false;
}

export async function renderPerfil() {
  const isProfessor = currentUserRole === "professor";
  const historicoLogins = userExtraInfo.historicoLogins || [];
  const professores = userExtraInfo.professoresVinculados || [];

  const turnoClass =
    userExtraInfo.turno === "Manhã"
      ? "manha"
      : userExtraInfo.turno === "Tarde"
        ? "tarde"
        : "noite";

  let html = `
        <div class="form-card">
            <div class="form-title"><i class="fas fa-user-circle"></i> ${isProfessor ? "Perfil do Professor" : "Perfil do Aluno"}</div>
            <div class="profile-info">
                <div class="info-item">
                    <label><i class="fas fa-user"></i> Nome</label>
                    <div class="value" id="perfilNomeDisplay">${userExtraInfo.nome || "Não definido"}</div>
                </div>
                <div class="info-item">
                    <label><i class="fas fa-envelope"></i> Email</label>
                    <div class="value">${currentUserGlobal?.email || ""}</div>
                </div>
                <div class="info-item">
                    <label><i class="fas fa-clock"></i> Turno</label>
                    <div class="value">
                        <span class="turno-badge ${turnoClass}">${userExtraInfo.turno || "Não definido"}</span>
                    </div>
                </div>
                <div class="info-item">
                    <label><i class="fas fa-tag"></i> Tipo</label>
                    <div class="value">${isProfessor ? "👨‍🏫 Professor" : "👨‍🎓 Aluno"}</div>
                </div>
                ${
                  isProfessor
                    ? `
                    <div class="info-item">
                        <label><i class="fas fa-id-badge"></i> Matrícula</label>
                        <div class="value">${userExtraInfo.matricula || "Não definida"}</div>
                    </div>
                `
                    : ""
                }
                ${
                  !isProfessor
                    ? `
                    <div class="info-item" style="grid-column: 1 / -1;">
                        <label><i class="fas fa-chalkboard-user"></i> Professores Vinculados</label>
                        <div class="value">${professores.length > 0 ? professores.join(", ") : "Nenhum professor vinculado"}</div>
                    </div>
                `
                    : ""
                }
                <div class="info-item">
                    <label><i class="fas fa-sign-in-alt"></i> Último Login</label>
                    <div class="value">${userExtraInfo.ultimoLogin || "Hoje"}</div>
                </div>
                <div class="info-item">
                    <label><i class="fas fa-wifi"></i> Status</label>
                    <div class="value">${isOnline ? "🟢 Online" : "🔴 Offline"}</div>
                </div>
            </div>
            
            <div style="margin-top:20px; padding-top:20px; border-top:1px solid #e2e8f0;">
                <div class="form-grid">
                    <div class="form-group">
                        <label><i class="fas fa-user"></i> ${isProfessor ? "Editar Nome" : "Nome"}</label>
                        <input type="text" id="editNomeInput" value="${userExtraInfo.nome || ""}" placeholder="Seu nome completo">
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-clock"></i> ${isProfessor ? "Editar Turno" : "Turno"}</label>
                        <select id="editTurnoInput">
                            <option value="Manhã" ${userExtraInfo.turno === "Manhã" ? "selected" : ""}>🌅 Manhã</option>
                            <option value="Tarde" ${userExtraInfo.turno === "Tarde" ? "selected" : ""}>☀️ Tarde</option>
                            <option value="Noite" ${userExtraInfo.turno === "Noite" ? "selected" : ""}>🌙 Noite</option>
                        </select>
                    </div>
                </div>
                <button id="btnAtualizarPerfil" class="btn-primary" style="margin-top:12px;">
                    <i class="fas fa-save"></i> ${isProfessor ? "Atualizar Perfil" : "Salvar Dados"}
                </button>
            </div>
        </div>
        
        <div class="form-card">
            <div class="form-title"><i class="fas fa-history"></i> Histórico de Logins</div>
            ${
              historicoLogins
                .slice(-7)
                .reverse()
                .map(
                  (login) => `
                <div class="log-entry">
                    <span class="log-user">${login.nome || login.email || "Usuário"}</span>
                    <span>${login.role === "professor" ? "👨‍🏫 Professor" : "👨‍🎓 Aluno"}</span>
                    <span class="log-date">${login.data || ""}</span>
                </div>
            `,
                )
                .join("") ||
              '<p style="padding:16px;color:#64748b;">Nenhum login registrado.</p>'
            }
        </div>
        
        ${
          isProfessor
            ? `
            <div class="form-card">
                <div class="form-title"><i class="fas fa-user-cog"></i> Gerenciar</div>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button id="btnGerenciarProfessores" class="btn-primary btn-small-action">
                        <i class="fas fa-users"></i> Professores
                    </button>
                    <button id="btnGerenciarAlunos" class="btn-primary btn-small-action">
                        <i class="fas fa-user-graduate"></i> Alunos
                    </button>
                </div>
            </div>
        `
            : ""
        }
    `;

  document.getElementById("tabPerfil").innerHTML = html;

  // Atualizar Perfil
  document
    .getElementById("btnAtualizarPerfil")
    ?.addEventListener("click", async () => {
      const nome = document.getElementById("editNomeInput").value;
      const turno = document.getElementById("editTurnoInput").value;

      await saveUserExtraInfo(currentUserGlobal.uid, { nome, turno });
      userExtraInfo.nome = nome;
      userExtraInfo.turno = turno;

      document.getElementById("userNameDisplay").innerText =
        nome || currentUserGlobal.email.split("@")[0];
      document.getElementById("userTurnoDisplay").innerText = turno
        ? `Turno: ${turno}`
        : "";

      alert("✅ Perfil atualizado!");
      renderPerfil();
    });

  // Gerenciar Professores
  document
    .getElementById("btnGerenciarProfessores")
    ?.addEventListener("click", async () => {
      gerenciarProfessoresModal.style.display = "block";
      await carregarListaProfessores();
    });

  // Gerenciar Alunos
  document
    .getElementById("btnGerenciarAlunos")
    ?.addEventListener("click", async () => {
      gerenciarAlunosModal.style.display = "block";
      await carregarListaAlunos();
    });
}

// ========== CARREGAR LISTA PROFESSORES ==========
async function carregarListaProfessores() {
  const container = document.getElementById("listaProfessoresContainer");
  const professores = await listarProfessores();

  if (professores.length === 0) {
    container.innerHTML =
      '<p style="color:#64748b;">Nenhum professor cadastrado.</p>';
    return;
  }

  let html = "";
  professores.forEach((prof) => {
    html += `
            <div class="user-list-item">
                <div class="user-info">
                    <span class="name">${prof.nome || "Sem nome"}</span>
                    <span class="email">${prof.email || "Sem email"} ${prof.matricula ? "- Mat: " + prof.matricula : ""}</span>
                </div>
                <div class="user-actions">
                    <button class="btn-danger btn-small-action remover-professor" data-uid="${prof.id}" data-nome="${prof.nome}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
  });
  container.innerHTML = html;

  document.querySelectorAll(".remover-professor").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const nome = btn.dataset.nome;
      if (confirm(`Remover o professor "${nome}"?`)) {
        await removerUsuario(btn.dataset.uid);
        alert(`✅ Professor "${nome}" removido!`);
        await carregarListaProfessores();
      }
    });
  });

  document
    .getElementById("btnCadastrarNovoProfessor")
    ?.addEventListener("click", async () => {
      const nome = document.getElementById("novoProfNome").value;
      const email = document.getElementById("novoProfEmail").value;
      const senha = document.getElementById("novoProfSenha").value;
      const matricula = document.getElementById("novoProfMatricula").value;

      if (!nome || !email || !senha) {
        alert("⚠️ Preencha todos os campos!");
        return;
      }

      const result = await cadastrarProfessor(nome, email, senha, matricula);
      if (result.success) {
        alert(`✅ Professor "${nome}" cadastrado!`);
        document.getElementById("novoProfNome").value = "";
        document.getElementById("novoProfEmail").value = "";
        document.getElementById("novoProfSenha").value = "";
        document.getElementById("novoProfMatricula").value = "";
        await carregarListaProfessores();
      } else {
        alert("❌ Erro: " + result.error);
      }
    });
}

// ========== CARREGAR LISTA ALUNOS ==========
async function carregarListaAlunos() {
  const container = document.getElementById("listaAlunosContainer");
  const alunos = await listarAlunos();

  if (alunos.length === 0) {
    container.innerHTML =
      '<p style="color:#64748b;">Nenhum aluno cadastrado.</p>';
    return;
  }

  let html = "";
  alunos.forEach((aluno) => {
    html += `
            <div class="user-list-item">
                <div class="user-info">
                    <span class="name">${aluno.nome || "Sem nome"}</span>
                    <span class="email">${aluno.email || "Sem email"} ${aluno.turno ? "- Turno: " + aluno.turno : ""}</span>
                </div>
                <div class="user-actions">
                    <button class="btn-danger btn-small-action remover-aluno" data-uid="${aluno.id}" data-nome="${aluno.nome}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
  });
  container.innerHTML = html;

  document.querySelectorAll(".remover-aluno").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const nome = btn.dataset.nome;
      if (confirm(`Remover o aluno "${nome}"?`)) {
        await removerUsuario(btn.dataset.uid);
        alert(`✅ Aluno "${nome}" removido!`);
        await carregarListaAlunos();
      }
    });
  });
}
