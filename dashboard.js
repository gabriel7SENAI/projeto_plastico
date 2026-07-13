import { db } from "./firebaseConfig.js";
import { userExtraInfo, currentUser, userRole, isOnline } from "./auth.js";
import { ref, get } from "firebase/database";

let currentUserGlobal = null;
let currentUserRole = null;
let isUsingLocalData = false;

export function setUserData(user, role, localFlag) {
  currentUserGlobal = user;
  currentUserRole = role;
  isUsingLocalData = localFlag || false;
}

async function getData(collectionName) {
  try {
    if (isOnline && !isUsingLocalData) {
      const dataRef = ref(db, collectionName);
      const snapshot = await get(dataRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (collectionName === "materiais") {
          return Object.keys(data).map((key) => ({ id: key, ...data[key] }));
        }
        return data;
      }
    }
    return [];
  } catch (error) {
    console.warn("Erro ao buscar dados:", error);
    return [];
  }
}

export async function renderDashboard() {
  try {
    const materiais = await getData("materiais");
    const moinhoData = await getData("moinho");

    const totalMateriais = materiais.length;
    const totalQuantidade = materiais.reduce(
      (acc, m) => acc + (m.quantidade || 0),
      0,
    );
    const itensMoinho = moinhoData?.materiais?.length || 0;
    const pesoMoinho =
      moinhoData?.materiais?.reduce((acc, m) => acc + (m.peso || 0), 0) || 0;

    const html = `
            <div class="dashboard-grid">
                <div class="dash-card">
                    <div class="dash-icon"><i class="fas fa-cubes"></i></div>
                    <div class="dash-number">${totalMateriais}</div>
                    <div class="dash-label">Total de Materiais</div>
                    <div class="dash-status good">${totalQuantidade} kg</div>
                </div>
                <div class="dash-card">
                    <div class="dash-icon"><i class="fas fa-recycle"></i></div>
                    <div class="dash-number">${itensMoinho}</div>
                    <div class="dash-label">Itens no Moinho</div>
                    <div class="dash-status good">${pesoMoinho} T</div>
                </div>
                <div class="dash-card">
                    <div class="dash-icon"><i class="fas fa-user"></i></div>
                    <div class="dash-number" style="font-size:20px;">${currentUserGlobal?.email || "Usuário"}</div>
                    <div class="dash-label">Último Login</div>
                    <div class="dash-status good">${userExtraInfo.ultimoLogin || "Hoje"}</div>
                </div>
                <div class="dash-card">
                    <div class="dash-icon"><i class="fas fa-clock"></i></div>
                    <div class="dash-number" style="font-size:20px;">${userExtraInfo.turno || "Não definido"}</div>
                    <div class="dash-label">Turno</div>
                    <div class="dash-status">${currentUserRole === "professor" ? "👨‍🏫 Professor" : "👨‍🎓 Aluno"}</div>
                </div>
            </div>
            
            <div class="form-card">
                <div class="form-title"><i class="fas fa-info-circle"></i> Resumo</div>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px;">
                    <div style="background:#f8fafc; padding:14px; border-radius:12px; border:1px solid #e2e8f0;">
                        <div style="font-size:12px; color:#64748b;">Materiais</div>
                        <div style="font-size:22px; font-weight:700; color:#0f172a;">${totalMateriais}</div>
                    </div>
                    <div style="background:#f8fafc; padding:14px; border-radius:12px; border:1px solid #e2e8f0;">
                        <div style="font-size:12px; color:#64748b;">Moinho (T)</div>
                        <div style="font-size:22px; font-weight:700; color:#0f172a;">${pesoMoinho}</div>
                    </div>
                    <div style="background:#f8fafc; padding:14px; border-radius:12px; border:1px solid #e2e8f0;">
                        <div style="font-size:12px; color:#64748b;">Itens no Moinho</div>
                        <div style="font-size:22px; font-weight:700; color:#0f172a;">${itensMoinho}</div>
                    </div>
                </div>
            </div>
        `;

    document.getElementById("tabDashboard").innerHTML = html;
  } catch (error) {
    console.error("Erro no dashboard:", error);
    document.getElementById("tabDashboard").innerHTML = `
            <div class="form-card">
                <div class="form-title"><i class="fas fa-chart-pie"></i> Dashboard</div>
                <p style="color:#ef4444;">⚠️ Erro ao carregar dashboard</p>
                <button class="btn-primary" onclick="location.reload()"><i class="fas fa-sync"></i> Recarregar</button>
            </div>
        `;
  }
}
