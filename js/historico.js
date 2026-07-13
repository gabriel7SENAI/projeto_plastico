import { db } from "./firebaseConfig.js";
import { userExtraInfo, isOnline } from "./auth.js";
import { ref, get } from "firebase/database";

let currentUserRole = null;
let currentUserGlobal = null;
let isUsingLocalData = false;

export function setUserData(user, role, localFlag) {
  currentUserGlobal = user;
  currentUserRole = role;
  isUsingLocalData = localFlag || false;
}

export async function renderHistorico() {
  try {
    const historicoLogins = userExtraInfo.historicoLogins || [];

    // Filtrar últimos 8 dias
    const oitoDiasAtras = new Date();
    oitoDiasAtras.setDate(oitoDiasAtras.getDate() - 8);

    const loginsFiltrados = historicoLogins.filter((login) => {
      const dataLogin = new Date(login.data);
      return dataLogin >= oitoDiasAtras;
    });

    // Separar por tipo
    const loginsAlunos = loginsFiltrados.filter((l) => l.role === "aluno");
    const loginsProfessores = loginsFiltrados.filter(
      (l) => l.role === "professor",
    );

    let movimentacoes = [];
    try {
      if (isOnline && !isUsingLocalData) {
        const snapshot = await get(ref(db, "moinho/historico"));
        if (snapshot.exists()) {
          movimentacoes = snapshot.val() || [];
        }
      }
    } catch (error) {
      console.warn("Erro ao buscar histórico:", error);
    }

    const ultimasMovimentacoes = movimentacoes.slice(-50).reverse();

    let html = `
            <div class="form-card">
                <div class="form-title"><i class="fas fa-history"></i> Histórico do Moinho</div>
                <div class="table-container">
                    <table>
                        <thead><tr><th>Data</th><th>Ação</th><th>Material</th><th>Peso (T)</th><th>Detalhes</th></tr></thead>
                        <tbody>
                            ${
                              ultimasMovimentacoes
                                .map(
                                  (h) => `
                                <tr>
                                    <td>${h.data || new Date().toLocaleString()}</td>
                                    <td><span class="${h.tipo === "entrada" ? "text-success" : h.tipo === "saida" ? "text-danger" : "text-warning"}">${h.tipo === "entrada" ? "➕ Entrada" : h.tipo === "saida" ? "➖ Saída" : "📋 Ação"}</span></td>
                                    <td>${h.material || "-"}</td>
                                    <td>${h.peso || 0}</td>
                                    <td>${h.acao || "-"}</td>
                                </tr>
                            `,
                                )
                                .join("") ||
                              '<tr><td colspan="5">Nenhum registro no moinho</td></tr>'
                            }
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="form-card">
                <div class="form-title"><i class="fas fa-sign-in-alt"></i> Últimos 8 Dias - Logins</div>
                <div class="historico-filtros">
                    <select id="filtroLogins">
                        <option value="todos">Todos</option>
                        <option value="aluno">Alunos</option>
                        <option value="professor">Professores</option>
                    </select>
                    <button id="btnFiltrarLogins" class="btn-primary btn-small-action">Filtrar</button>
                </div>
                <div id="listaLoginsContainer">
                    ${
                      loginsFiltrados
                        .slice()
                        .reverse()
                        .map(
                          (login) => `
                        <div class="log-entry" data-role="${login.role || "aluno"}">
                            <span class="log-user">${login.nome || login.email || "Usuário"}</span>
                            <span>${login.role === "professor" ? "👨‍🏫 Professor" : "👨‍🎓 Aluno"}</span>
                            <span class="log-date">${login.data || ""}</span>
                        </div>
                    `,
                        )
                        .join("") ||
                      '<p style="padding:16px;color:#64748b;">Nenhum login nos últimos 8 dias.</p>'
                    }
                </div>
            </div>
        `;

    document.getElementById("tabHistorico").innerHTML = html;

    // Filtro de logins
    document
      .getElementById("btnFiltrarLogins")
      ?.addEventListener("click", function () {
        const filtro = document.getElementById("filtroLogins").value;
        const entries = document.querySelectorAll(
          "#listaLoginsContainer .log-entry",
        );

        entries.forEach((entry) => {
          const role = entry.dataset.role || "aluno";
          if (filtro === "todos") {
            entry.style.display = "flex";
          } else if (filtro === "aluno" && role === "aluno") {
            entry.style.display = "flex";
          } else if (filtro === "professor" && role === "professor") {
            entry.style.display = "flex";
          } else {
            entry.style.display = "none";
          }
        });
      });
  } catch (error) {
    console.error("Erro:", error);
    document.getElementById("tabHistorico").innerHTML = `
            <div class="form-card">
                <div class="form-title"><i class="fas fa-history"></i> Histórico</div>
                <p style="color:#f59e0b;">🟡 Erro ao carregar histórico</p>
                <button class="btn-primary" onclick="location.reload()"><i class="fas fa-sync"></i> Recarregar</button>
            </div>
        `;
  }
}
