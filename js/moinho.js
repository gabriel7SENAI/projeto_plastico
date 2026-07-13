import { db } from "./firebaseConfig.js";
import { isOnline } from "./auth.js";
import { ref, get, set, update, push, remove } from "firebase/database";

let currentUserRole = null;
let currentUserGlobal = null;
let isUsingLocalData = false;

export function setUserData(user, role, localFlag) {
  currentUserGlobal = user;
  currentUserRole = role;
  isUsingLocalData = localFlag || false;
}

let localData = {
  moinho: {
    materiais: [
      {
        id: "mo1",
        codigo: "R001",
        material: "PP Moído Reciclado",
        peso: 0.15,
        fornecedor: "Braskem",
        data: new Date().toLocaleString(),
      },
    ],
    capacidadeMax: 900,
    historico: [],
  },
};

async function getMoinho() {
  try {
    if (isOnline && !isUsingLocalData) {
      const snapshot = await get(ref(db, "moinho"));
      if (snapshot.exists()) {
        return snapshot.val();
      }
    }
    isUsingLocalData = true;
    return localData.moinho;
  } catch (error) {
    console.warn("Usando dados locais:", error);
    isUsingLocalData = true;
    return localData.moinho;
  }
}

async function saveMoinho(data) {
  try {
    if (isOnline && !isUsingLocalData) {
      await set(ref(db, "moinho"), data);
    }
    localData.moinho = data;
  } catch (error) {
    console.warn("Erro ao salvar:", error);
    localData.moinho = data;
  }
}

export async function renderMoinho() {
  const isProfessor = currentUserRole === "professor";

  try {
    let moinhoData = await getMoinho();
    const materiais = moinhoData.materiais || [];
    const capacidadeMax = moinhoData.capacidadeMax || 900;
    const totalPeso = materiais.reduce((acc, m) => acc + (m.peso || 0), 0);
    const percent = Math.min((totalPeso / capacidadeMax) * 100, 100);

    let materiaisDisponiveis = [];
    try {
      const materiaisRef = ref(db, "materiais");
      const snapshot = await get(materiaisRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        materiaisDisponiveis = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
      }
    } catch (e) {
      console.warn("Erro ao buscar materiais:", e);
    }

    const acoesPredefinidas = [
      "Moagem",
      "Separação",
      "Lavagem",
      "Secagem",
      "Extrusão",
      "Granulação",
      "Prensagem",
      "Injeção",
      "Reciclagem",
      "Outro",
    ];

    let html = `
            <div class="form-card">
                <div class="form-title"><i class="fas fa-recycle"></i> Status do Moinho</div>
                <div style="background: ${percent >= 90 ? "#fef2f2" : percent >= 70 ? "#fffbeb" : "#ecfdf5"}; padding:20px; border-radius:16px; margin-bottom:20px; border:2px solid ${percent >= 90 ? "#ef4444" : percent >= 70 ? "#f59e0b" : "#10b981"};">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap;">
                        <div>
                            <div style="font-size:36px; font-weight:800;">${totalPeso} T</div>
                            <div style="color:#64748b; font-size:13px;">Capacidade: ${capacidadeMax} T</div>
                            <div style="color:#64748b; font-size:13px;">Itens: ${materiais.length}</div>
                        </div>
                        <div>
                            <span style="font-size:13px; font-weight:600; color:${percent >= 90 ? "#dc2626" : percent >= 70 ? "#d97706" : "#059669"};">
                                ${percent >= 90 ? "⚠️ QUASE CHEIO" : percent >= 70 ? "⚠️ ATENÇÃO" : "✅ NORMAL"}
                            </span>
                        </div>
                    </div>
                    <div style="width:100%; background:#e2e8f0; border-radius:8px; margin-top:12px; overflow:hidden; height:8px;">
                        <div style="width:${Math.min(percent, 100)}%; background:${percent >= 90 ? "#dc2626" : percent >= 70 ? "#f59e0b" : "#10b981"}; height:100%; transition:width 0.5s;"></div>
                    </div>
                </div>
                
                ${
                  isProfessor
                    ? `
                    <div class="moinho-acoes-grid">
                        <div>
                            <div class="form-title" style="font-size:14px;"><i class="fas fa-plus-circle"></i> Adicionar ao Moinho</div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label><i class="fas fa-tag"></i> Código</label>
                                    <input type="text" id="newMoinhoCodigo" placeholder="Ex: R001">
                                </div>
                                <div class="form-group">
                                    <label><i class="fas fa-box"></i> Material</label>
                                    <input type="text" id="newMoinhoMaterial" placeholder="Nome do material">
                                </div>
                                <div class="form-group">
                                    <label><i class="fas fa-weight"></i> Peso (T)</label>
                                    <input type="number" id="newMoinhoPeso" step="0.001" placeholder="0.000">
                                </div>
                                <div class="form-group">
                                    <label><i class="fas fa-truck"></i> Fornecedor</label>
                                    <input type="text" id="newMoinhoFornecedor" placeholder="Digite o fornecedor">
                                </div>
                            </div>
                            <button id="btnAddMoinho" class="btn-primary" style="width:100%;"><i class="fas fa-plus"></i> Adicionar</button>
                        </div>
                        <div>
                            <div class="form-title" style="font-size:14px;"><i class="fas fa-undo"></i> Devolver Material</div>
                            <div class="form-grid">
                                <div class="form-group">
                                    <label><i class="fas fa-search"></i> Filtrar</label>
                                    <input type="text" id="filterMoinhoMaterial" placeholder="Buscar por nome, código ou fornecedor...">
                                </div>
                                <div class="form-group">
                                    <label><i class="fas fa-box"></i> Material</label>
                                    <select id="devolverMaterialSelect">
                                        <option value="">Selecione...</option>
                                        ${materiaisDisponiveis
                                          .filter((m) => m.quantidade > 0)
                                          .map(
                                            (m) => `
                                            <option value="${m.id}" data-nome="${m.nome}" data-fornecedor="${m.fornecedor || ""}" data-qtd="${m.quantidade}" data-codigo="${m.codigo}">
                                                ${m.codigo} - ${m.nome} (${m.quantidade} kg)
                                            </option>
                                        `,
                                          )
                                          .join("")}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label><i class="fas fa-weight"></i> Quantidade (T)</label>
                                    <input type="number" id="devolverQuantidade" step="0.001" placeholder="0.000">
                                </div>
                            </div>
                            <button id="btnDevolverMoinho" class="btn-primary" style="width:100%;"><i class="fas fa-undo"></i> Devolver</button>
                        </div>
                    </div>
                    
                    <div style="margin-top:16px;">
                        <div class="form-title" style="font-size:14px;"><i class="fas fa-tasks"></i> Ações do Moinho</div>
                        <div class="form-grid">
                            <div class="form-group">
                                <label><i class="fas fa-pen"></i> Escrever Ação</label>
                                <input type="text" id="acaoMoinhoInput" placeholder="Digite a ação realizada...">
                            </div>
                            <div class="form-group">
                                <label><i class="fas fa-list"></i> Ou Selecionar</label>
                                <select id="acaoMoinhoSelect">
                                    <option value="">Selecione uma ação...</option>
                                    ${acoesPredefinidas.map((acao) => `<option value="${acao}">${acao}</option>`).join("")}
                                </select>
                            </div>
                        </div>
                        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
                            <button id="btnProcessarMoinho" class="btn-warning"><i class="fas fa-industry"></i> Processar Todos</button>
                            <button id="btnLimparMoinho" class="btn-danger"><i class="fas fa-trash"></i> Limpar Moinho</button>
                            <button id="btnRegistrarAcao" class="btn-primary"><i class="fas fa-check"></i> Registrar Ação</button>
                        </div>
                    </div>
                `
                    : '<p style="color:#64748b;">Visualização do moinho.</p>'
                }
            </div>
            
            <div class="form-card">
                <div class="form-title"><i class="fas fa-list"></i> Materiais no Moinho (${materiais.length})</div>
                <div class="table-container">
                    <table>
                        <thead><tr><th>Código</th><th>Material</th><th>Peso (T)</th><th>Fornecedor</th><th>Data</th><th>Ações</th></tr></thead>
                        <tbody id="moinhoTableBody">
                            ${
                              materiais
                                .map(
                                  (m, index) => `
                                <tr data-material="${(m.material || "").toLowerCase()}" 
                                    data-codigo="${(m.codigo || "").toLowerCase()}" 
                                    data-fornecedor="${(m.fornecedor || "").toLowerCase()}">
                                    <td><strong>${m.codigo || "-"}</strong></td>
                                    <td>${m.material}</td>
                                    <td>${m.peso}</td>
                                    <td>${m.fornecedor || "-"}</td>
                                    <td>${m.data || "-"}</td>
                                    <td>
                                        <button class="btn-danger remove-moinho-item" data-index="${index}" data-nome="${m.material}">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `,
                                )
                                .join("") ||
                              '<tr><td colspan="6">Nenhum material no moinho</td></tr>'
                            }
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="form-card">
                <div class="form-title"><i class="fas fa-history"></i> Histórico do Moinho</div>
                <div class="table-container">
                    <table>
                        <thead><tr><th>Data</th><th>Ação</th><th>Material</th><th>Peso (T)</th><th>Detalhes</th></tr></thead>
                        <tbody>
                            ${
                              (moinhoData.historico || [])
                                .slice(-50)
                                .reverse()
                                .map(
                                  (h) => `
                                <tr>
                                    <td>${h.data || new Date().toLocaleString()}</td>
                                    <td><span class="${h.tipo === "entrada" ? "text-success" : h.tipo === "saida" ? "text-danger" : "text-warning"}">${h.tipo === "entrada" ? "➕ Entrada" : h.tipo === "saida" ? "➖ Saída" : "📋 Ação"}</span></td>
                                    <td>${h.material}</td>
                                    <td>${h.peso}</td>
                                    <td>${h.acao || "-"}</td>
                                </tr>
                            `,
                                )
                                .join("") ||
                              '<tr><td colspan="5">Nenhum registro</td></tr>'
                            }
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="form-card">
                <div class="form-title"><i class="fas fa-boxes"></i> Materiais Disponíveis para Devolução</div>
                <div class="filter-bar" style="margin-bottom:12px;">
                    <input type="text" id="filterDisponiveis" placeholder="🔍 Buscar por nome, código ou fornecedor...">
                </div>
                <div class="table-container">
                    <table>
                        <thead><tr><th>Código</th><th>Nome</th><th>Quantidade (kg)</th><th>Fornecedor</th><th>Categoria</th><th>Disponível</th></tr></thead>
                        <tbody id="disponiveisTableBody">
                            ${
                              materiaisDisponiveis
                                .map(
                                  (m) => `
                                <tr data-nome="${(m.nome || "").toLowerCase()}" 
                                    data-codigo="${(m.codigo || "").toLowerCase()}" 
                                    data-fornecedor="${(m.fornecedor || "").toLowerCase()}">
                                    <td><strong>${m.codigo}</strong></td>
                                    <td>${m.nome}</td>
                                    <td>${m.quantidade}</td>
                                    <td>${m.fornecedor || "-"}</td>
                                    <td>${m.categoria || "-"}</td>
                                    <td><span class="${m.quantidade > 0 ? "text-success" : "text-danger"}">${m.quantidade > 0 ? "✅ Disponível" : "❌ Indisponível"}</span></td>
                                </tr>
                            `,
                                )
                                .join("") ||
                              '<tr><td colspan="6">Nenhum material cadastrado</td></tr>'
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        `;

    document.getElementById("tabMoinho").innerHTML = html;

    // Sincronizar input e select de ações
    document
      .getElementById("acaoMoinhoInput")
      ?.addEventListener("input", function () {
        const select = document.getElementById("acaoMoinhoSelect");
        if (this.value) {
          select.value = "";
        }
      });

    document
      .getElementById("acaoMoinhoSelect")
      ?.addEventListener("change", function () {
        const input = document.getElementById("acaoMoinhoInput");
        if (this.value) {
          input.value = this.value;
        }
      });

    // Filtros
    document
      .getElementById("filterMoinhoMaterial")
      ?.addEventListener("input", function () {
        const search = this.value.toLowerCase();
        const rows = document.querySelectorAll("#moinhoTableBody tr");
        rows.forEach((row) => {
          const material = row.dataset.material || "";
          const codigo = row.dataset.codigo || "";
          const fornecedor = row.dataset.fornecedor || "";
          row.style.display =
            material.includes(search) ||
            codigo.includes(search) ||
            fornecedor.includes(search)
              ? ""
              : "none";
        });
      });

    document
      .getElementById("filterDisponiveis")
      ?.addEventListener("input", function () {
        const search = this.value.toLowerCase();
        const rows = document.querySelectorAll("#disponiveisTableBody tr");
        rows.forEach((row) => {
          const nome = row.dataset.nome || "";
          const codigo = row.dataset.codigo || "";
          const fornecedor = row.dataset.fornecedor || "";
          row.style.display =
            nome.includes(search) ||
            codigo.includes(search) ||
            fornecedor.includes(search)
              ? ""
              : "none";
        });
      });

    if (isProfessor) {
      // Adicionar ao Moinho
      document
        .getElementById("btnAddMoinho")
        ?.addEventListener("click", async () => {
          const codigo = document.getElementById("newMoinhoCodigo").value;
          const material = document.getElementById("newMoinhoMaterial").value;
          const peso = parseFloat(
            document.getElementById("newMoinhoPeso").value,
          );
          const fornecedor = document.getElementById(
            "newMoinhoFornecedor",
          ).value;

          if (!material || isNaN(peso) || peso <= 0) {
            alert("⚠️ Preencha material e peso válido!");
            return;
          }

          if (totalPeso + peso > capacidadeMax) {
            alert(
              `⚠️ Capacidade máxima excedida! Disponível: ${capacidadeMax - totalPeso} T`,
            );
            return;
          }

          const acao =
            document.getElementById("acaoMoinhoInput").value || "Adição manual";

          const novoItem = {
            codigo,
            material,
            peso,
            fornecedor,
            data: new Date().toLocaleString(),
          };
          const novosMateriais = [...materiais, novoItem];
          const novoHistorico = [
            ...(moinhoData.historico || []),
            {
              tipo: "entrada",
              material,
              peso,
              data: new Date().toLocaleString(),
              acao: acao,
            },
          ];

          await saveMoinho({
            materiais: novosMateriais,
            capacidadeMax,
            historico: novoHistorico,
          });

          alert("✅ Material adicionado ao moinho!");
          renderMoinho();
        });

      // Registrar Ação
      document
        .getElementById("btnRegistrarAcao")
        ?.addEventListener("click", async () => {
          const acao = document.getElementById("acaoMoinhoInput").value;
          if (!acao) {
            alert("⚠️ Digite ou selecione uma ação!");
            return;
          }

          if (materiais.length === 0) {
            alert("⚠️ Moinho vazio!");
            return;
          }

          const novoHistorico = [...(moinhoData.historico || [])];
          materiais.forEach((m) => {
            novoHistorico.push({
              tipo: "acao",
              material: m.material,
              peso: m.peso,
              data: new Date().toLocaleString(),
              acao: acao,
            });
          });

          await saveMoinho({
            materiais: materiais,
            capacidadeMax,
            historico: novoHistorico,
          });

          alert(`✅ Ação "${acao}" registrada para ${materiais.length} itens!`);
          document.getElementById("acaoMoinhoInput").value = "";
          document.getElementById("acaoMoinhoSelect").value = "";
          renderMoinho();
        });

      // Processar Moinho
      document
        .getElementById("btnProcessarMoinho")
        ?.addEventListener("click", async () => {
          if (materiais.length === 0) {
            alert("⚠️ Moinho vazio!");
            return;
          }

          const acao =
            document.getElementById("acaoMoinhoInput").value || "Processamento";

          if (
            confirm(`Processar ${materiais.length} itens (${totalPeso} T)?`)
          ) {
            const novoHistorico = [...(moinhoData.historico || [])];
            materiais.forEach((m) => {
              novoHistorico.push({
                tipo: "saida",
                material: m.material,
                peso: m.peso,
                data: new Date().toLocaleString(),
                acao: acao,
              });
            });

            await saveMoinho({
              materiais: [],
              capacidadeMax,
              historico: novoHistorico,
            });

            alert("✅ Moinho processado com sucesso!");
            renderMoinho();
          }
        });

      // Limpar Moinho
      document
        .getElementById("btnLimparMoinho")
        ?.addEventListener("click", async () => {
          if (materiais.length === 0) {
            alert("⚠️ Moinho já está vazio!");
            return;
          }

          if (confirm(`Limpar ${materiais.length} itens do moinho?`)) {
            await saveMoinho({
              materiais: [],
              capacidadeMax,
              historico: moinhoData.historico || [],
            });
            alert("✅ Moinho limpo!");
            renderMoinho();
          }
        });

      // Devolver Material ao Moinho
      document
        .getElementById("btnDevolverMoinho")
        ?.addEventListener("click", async () => {
          const select = document.getElementById("devolverMaterialSelect");
          const quantidade = parseFloat(
            document.getElementById("devolverQuantidade").value,
          );

          if (!select.value || !quantidade || quantidade <= 0) {
            alert("⚠️ Selecione um material e informe a quantidade!");
            return;
          }

          const selectedOption = select.options[select.selectedIndex];
          const nome = selectedOption.dataset.nome;
          const fornecedor = selectedOption.dataset.fornecedor;
          const qtdDisponivel = parseFloat(selectedOption.dataset.qtd);

          if (quantidade > qtdDisponivel) {
            alert(
              `⚠️ Quantidade indisponível! Disponível: ${qtdDisponivel} kg`,
            );
            return;
          }

          if (totalPeso + quantidade > capacidadeMax) {
            alert(
              `⚠️ Capacidade máxima excedida! Disponível: ${capacidadeMax - totalPeso} T`,
            );
            return;
          }

          const acao =
            document.getElementById("acaoMoinhoInput").value || "Devolução";

          const materialRef = ref(db, `materiais/${select.value}`);
          const snapshot = await get(materialRef);
          if (snapshot.exists()) {
            const data = snapshot.val();
            await update(materialRef, {
              quantidade: data.quantidade - quantidade,
            });
          }

          const novoItem = {
            codigo: select.value,
            material: nome,
            peso: quantidade,
            fornecedor: fornecedor,
            data: new Date().toLocaleString(),
          };
          const novosMateriais = [...materiais, novoItem];
          const novoHistorico = [
            ...(moinhoData.historico || []),
            {
              tipo: "entrada",
              material: nome,
              peso: quantidade,
              data: new Date().toLocaleString(),
              acao: acao,
            },
          ];

          await saveMoinho({
            materiais: novosMateriais,
            capacidadeMax,
            historico: novoHistorico,
          });

          alert("✅ Material devolvido ao moinho!");
          renderMoinho();
        });

      // Remover item individual
      document.querySelectorAll(".remove-moinho-item").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const index = parseInt(btn.dataset.index);
          const nome = btn.dataset.nome;
          if (confirm(`Remover "${nome}" do moinho?`)) {
            const novosMateriais = materiais.filter((_, i) => i !== index);
            await saveMoinho({
              materiais: novosMateriais,
              capacidadeMax,
              historico: moinhoData.historico || [],
            });
            renderMoinho();
          }
        });
      });
    }
  } catch (error) {
    console.error("Erro:", error);
  }
}
