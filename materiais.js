import { db } from "../firebaseConfig.js";
import { isOnline } from "../auth.js";
import { ref, get, set, push, update, remove } from "firebase/database";

let currentUserRole = null;
let currentUserGlobal = null;
let isUsingLocalData = false;

export function setUserData(user, role, localFlag) {
  currentUserGlobal = user;
  currentUserRole = role;
  isUsingLocalData = localFlag || false;
}

let localData = {
  materiais: [
    {
      id: "m1",
      codigo: "PP001",
      nome: "PP Braskem",
      quantidade: 500,
      unidade: "kg",
      categoria: "Polipropileno",
      fornecedor: "Braskem",
      estado: "Bom",
      estoqueMinimo: 50,
    },
    {
      id: "m2",
      codigo: "PS001",
      nome: "PS Ungel",
      quantidade: 300,
      unidade: "kg",
      categoria: "Poliestireno",
      fornecedor: "Ungel",
      estado: "Ótimo",
      estoqueMinimo: 30,
    },
    {
      id: "m3",
      codigo: "PP002",
      nome: "PP Hanhua",
      quantidade: 400,
      unidade: "kg",
      categoria: "Polipropileno",
      fornecedor: "Hanhua",
      estado: "Bom",
      estoqueMinimo: 40,
    },
  ],
};

async function getMateriais() {
  try {
    if (isOnline && !isUsingLocalData) {
      const snapshot = await get(ref(db, "materiais"));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map((key) => ({ id: key, ...data[key] }));
      }
    }
    isUsingLocalData = true;
    return localData.materiais;
  } catch (error) {
    console.warn("Usando dados locais:", error);
    isUsingLocalData = true;
    return localData.materiais;
  }
}

async function saveMaterial(data, id = null) {
  try {
    if (isOnline && !isUsingLocalData) {
      if (id) {
        await update(ref(db, `materiais/${id}`), data);
      } else {
        const newRef = push(ref(db, "materiais"));
        await set(newRef, data);
        return newRef.key;
      }
      return id;
    }
    if (id) {
      const index = localData.materiais.findIndex((m) => m.id === id);
      if (index !== -1) localData.materiais[index] = { ...data, id };
    } else {
      const newId = "m" + Date.now();
      localData.materiais.push({ ...data, id: newId });
      return newId;
    }
    return id;
  } catch (error) {
    console.warn("Erro ao salvar:", error);
    return id;
  }
}

async function deleteMaterial(id) {
  try {
    const snapshot = await get(ref(db, `materiais/${id}`));
    let data = {};
    if (snapshot.exists()) {
      data = snapshot.val();
    }

    const lixeiraRef = ref(db, `lixeira_materiais/${id}`);
    await set(lixeiraRef, {
      ...data,
      dataExclusao: new Date().toLocaleString(),
    });

    if (isOnline && !isUsingLocalData) {
      await remove(ref(db, `materiais/${id}`));
    } else {
      localData.materiais = localData.materiais.filter((m) => m.id !== id);
    }
  } catch (error) {
    console.warn("Erro ao deletar:", error);
  }
}

async function restaurarMaterialHandler(id) {
  try {
    const lixeiraRef = ref(db, `lixeira_materiais/${id}`);
    const snapshot = await get(lixeiraRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      delete data.dataExclusao;

      if (isOnline && !isUsingLocalData) {
        await set(ref(db, `materiais/${id}`), data);
        await remove(lixeiraRef);
      } else {
        localData.materiais.push({ ...data, id });
      }
      return { success: true };
    }
    return { success: false, error: "Material não encontrado na lixeira" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function listarLixeira() {
  try {
    if (isOnline && !isUsingLocalData) {
      const snapshot = await get(ref(db, "lixeira_materiais"));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map((key) => ({ id: key, ...data[key] }));
      }
    }
    return [];
  } catch (error) {
    console.warn("Erro ao listar lixeira:", error);
    return [];
  }
}

export async function renderMateriais() {
  const isProfessor = currentUserRole === "professor";

  try {
    let materiaisList = await getMateriais();
    let lixeiraList = await listarLixeira();

    let html = `
            ${
              isProfessor
                ? `
                <div class="form-card">
                    <div class="form-title"><i class="fas fa-plus-circle"></i> Cadastrar Material</div>
                    <div class="form-grid">
                        <div class="form-group">
                            <label><i class="fas fa-tag"></i> Código</label>
                            <input type="text" id="newMaterialCodigo" placeholder="Ex: PP001">
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-box"></i> Nome</label>
                            <input type="text" id="newMaterialNome" placeholder="Nome do material">
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-weight"></i> Quantidade (kg)</label>
                            <input type="number" id="newMaterialQuantidade" step="any" placeholder="0">
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-tags"></i> Categoria</label>
                            <input type="text" id="newMaterialCategoria" placeholder="Digite a categoria">
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-truck"></i> Fornecedor</label>
                            <input type="text" id="newMaterialFornecedor" placeholder="Digite o fornecedor">
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-clipboard-check"></i> Estado</label>
                            <select id="newMaterialEstado">
                                <option value="Ótimo">Ótimo</option>
                                <option value="Bom" selected>Bom</option>
                                <option value="Regular">Regular</option>
                                <option value="Ruim">Ruim</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-flag"></i> Estoque Mínimo (kg)</label>
                            <input type="number" id="newMaterialEstoqueMinimo" step="any" placeholder="0">
                        </div>
                    </div>
                    <button id="btnAddMaterial" class="btn-primary"><i class="fas fa-save"></i> Cadastrar Material</button>
                </div>
            `
                : '<p style="color:#64748b; margin-bottom:16px;">🔍 Visualização de materiais disponíveis.</p>'
            }
            
            <div class="form-card">
                <div class="form-title"><i class="fas fa-search"></i> Filtros</div>
                <div class="filter-bar">
                    <input type="text" id="searchMaterialInput" placeholder="🔍 Buscar por nome, código ou fornecedor...">
                    <input type="text" id="filterCategoriaInput" placeholder="Filtrar por categoria...">
                    <button id="clearFiltersBtn" class="btn-warning" style="width:auto; padding:8px 16px;">
                        <i class="fas fa-times"></i> Limpar
                    </button>
                </div>
            </div>
            
            <div class="form-card">
                <div class="form-title"><i class="fas fa-list"></i> Materiais (${materiaisList.length})</div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Nome</th>
                                <th>Qtd (kg)</th>
                                <th>Categoria</th>
                                <th>Fornecedor</th>
                                <th>Estado</th>
                                <th>Est. Mín</th>
                                ${isProfessor ? "<th>Ações</th>" : ""}
                            </tr>
                        </thead>
                        <tbody id="materiaisTableBody">
                            ${
                              materiaisList
                                .map((m) => {
                                  const estadoColors = {
                                    Ótimo: "#10b981",
                                    Bom: "#3b82f6",
                                    Regular: "#f59e0b",
                                    Ruim: "#ef4444",
                                  };
                                  const isLow =
                                    m.quantidade <= (m.estoqueMinimo || 0);
                                  return `
                                    <tr style="${isLow ? "background:#fef2f2;" : ""}" 
                                        data-nome="${(m.nome || "").toLowerCase()}" 
                                        data-codigo="${(m.codigo || "").toLowerCase()}" 
                                        data-fornecedor="${(m.fornecedor || "").toLowerCase()}"
                                        data-categoria="${(m.categoria || "").toLowerCase()}">
                                        <td><strong>${m.codigo}</strong></td>
                                        <td>${m.nome}</td>
                                        <td style="font-weight:600;">${m.quantidade}</td>
                                        <td>${m.categoria || "-"}</td>
                                        <td>${m.fornecedor || "-"}</td>
                                        <td><span style="background:${estadoColors[m.estado] || "#94a3b8"}20; color:${estadoColors[m.estado] || "#64748b"}; padding:2px 12px; border-radius:20px; font-size:11px; font-weight:600;">${m.estado || "Bom"}</span></td>
                                        <td>${m.estoqueMinimo || "-"}</td>
                                        ${
                                          isProfessor
                                            ? `
                                            <td>
                                                <div class="btn-actions">
                                                    <button class="btn-edit edit-material" data-id="${m.id}" data-nome="${m.nome}" data-codigo="${m.codigo}" data-quantidade="${m.quantidade}" data-categoria="${m.categoria || ""}" data-fornecedor="${m.fornecedor || ""}" data-estado="${m.estado || "Bom"}" data-estoqueminimo="${m.estoqueMinimo || 0}">
                                                        <i class="fas fa-edit"></i>
                                                    </button>
                                                    <button class="btn-danger remove-material" data-id="${m.id}" data-nome="${m.nome}">
                                                        <i class="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        `
                                            : ""
                                        }
                                    </tr>
                                `;
                                })
                                .join("") ||
                              '<tr><td colspan="8">Nenhum material cadastrado</td></tr>'
                            }
                        </tbody>
                    </table>
                </div>
            </div>
            
            ${
              isProfessor && lixeiraList.length > 0
                ? `
                <div class="form-card">
                    <div class="form-title"><i class="fas fa-trash"></i> Lixeira (${lixeiraList.length})</div>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Nome</th>
                                    <th>Qtd (kg)</th>
                                    <th>Categoria</th>
                                    <th>Fornecedor</th>
                                    <th>Data Exclusão</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${lixeiraList
                                  .map(
                                    (m) => `
                                    <tr>
                                        <td><strong>${m.codigo}</strong></td>
                                        <td>${m.nome}</td>
                                        <td>${m.quantidade}</td>
                                        <td>${m.categoria || "-"}</td>
                                        <td>${m.fornecedor || "-"}</td>
                                        <td>${m.dataExclusao || "-"}</td>
                                        <td>
                                            <button class="btn-success btn-small-action restaurar-material" data-id="${m.id}" data-nome="${m.nome}">
                                                <i class="fas fa-undo"></i> Restaurar
                                            </button>
                                        </td>
                                    </tr>
                                `,
                                  )
                                  .join("")}
                            </tbody>
                        </table>
                    </div>
                </div>
            `
                : ""
            }
        `;

    document.getElementById("tabMateriais").innerHTML = html;

    // Filtros
    document
      .getElementById("searchMaterialInput")
      ?.addEventListener("input", aplicarFiltros);
    document
      .getElementById("filterCategoriaInput")
      ?.addEventListener("input", aplicarFiltros);
    document
      .getElementById("clearFiltersBtn")
      ?.addEventListener("click", () => {
        document.getElementById("searchMaterialInput").value = "";
        document.getElementById("filterCategoriaInput").value = "";
        aplicarFiltros();
      });

    function aplicarFiltros() {
      const search =
        document.getElementById("searchMaterialInput")?.value.toLowerCase() ||
        "";
      const categoria =
        document.getElementById("filterCategoriaInput")?.value.toLowerCase() ||
        "";
      const rows = document.querySelectorAll("#materiaisTableBody tr");

      rows.forEach((row) => {
        const nome = row.dataset.nome || "";
        const codigo = row.dataset.codigo || "";
        const fornecedor = row.dataset.fornecedor || "";
        const rowCategoria = row.dataset.categoria || "";

        const matchSearch =
          nome.includes(search) ||
          codigo.includes(search) ||
          fornecedor.includes(search);
        const matchCategoria = !categoria || rowCategoria.includes(categoria);

        row.style.display = matchSearch && matchCategoria ? "" : "none";
      });
    }

    if (isProfessor) {
      document
        .getElementById("btnAddMaterial")
        ?.addEventListener("click", addMaterial);

      document.querySelectorAll(".edit-material").forEach((btn) => {
        btn.addEventListener("click", () => {
          openEditMaterialModal(
            btn.dataset.id,
            btn.dataset.nome,
            btn.dataset.codigo,
            btn.dataset.quantidade,
            btn.dataset.categoria,
            btn.dataset.fornecedor,
            btn.dataset.estado,
            btn.dataset.estoqueminimo,
          );
        });
      });

      document.querySelectorAll(".remove-material").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (confirm(`Remover "${btn.dataset.nome}"?`)) {
            deleteMaterial(btn.dataset.id);
            renderMateriais();
          }
        });
      });

      document.querySelectorAll(".restaurar-material").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.dataset.id;
          const nome = btn.dataset.nome;
          if (confirm(`Restaurar "${nome}"?`)) {
            const result = await restaurarMaterialHandler(id);
            if (result.success) {
              alert(`✅ "${nome}" restaurado!`);
              renderMateriais();
            } else {
              alert("❌ Erro ao restaurar: " + result.error);
            }
          }
        });
      });
    }
  } catch (error) {
    console.error("Erro:", error);
  }
}

async function addMaterial() {
  const codigo = document.getElementById("newMaterialCodigo").value;
  const nome = document.getElementById("newMaterialNome").value;
  const quantidade = parseFloat(
    document.getElementById("newMaterialQuantidade").value,
  );
  const categoria = document.getElementById("newMaterialCategoria").value;
  const fornecedor = document.getElementById("newMaterialFornecedor").value;
  const estado = document.getElementById("newMaterialEstado").value;
  const estoqueMinimo =
    parseFloat(document.getElementById("newMaterialEstoqueMinimo").value) || 0;

  if (!codigo || !nome || isNaN(quantidade)) {
    alert("⚠️ Preencha código, nome e quantidade!");
    return;
  }

  await saveMaterial({
    codigo,
    nome,
    quantidade,
    categoria,
    fornecedor,
    estado,
    estoqueMinimo,
  });
  alert("✅ Material cadastrado!");
  renderMateriais();
}

function openEditMaterialModal(
  id,
  nome,
  codigo,
  quantidade,
  categoria,
  fornecedor,
  estado,
  estoqueMinimo,
) {
  document.getElementById("modalTitle").innerHTML =
    '<i class="fas fa-edit"></i> Editar Material';
  document.getElementById("modalBody").innerHTML = `
        <div class="form-group">
            <label><i class="fas fa-tag"></i> Código</label>
            <input type="text" id="editMaterialCodigo" value="${codigo}">
        </div>
        <div class="form-group">
            <label><i class="fas fa-box"></i> Nome</label>
            <input type="text" id="editMaterialNome" value="${nome}">
        </div>
        <div class="form-group">
            <label><i class="fas fa-weight"></i> Quantidade (kg)</label>
            <input type="number" id="editMaterialQuantidade" value="${quantidade}" step="any">
        </div>
        <div class="form-group">
            <label><i class="fas fa-tags"></i> Categoria</label>
            <input type="text" id="editMaterialCategoria" value="${categoria || ""}">
        </div>
        <div class="form-group">
            <label><i class="fas fa-truck"></i> Fornecedor</label>
            <input type="text" id="editMaterialFornecedor" value="${fornecedor || ""}">
        </div>
        <div class="form-group">
            <label><i class="fas fa-clipboard-check"></i> Estado</label>
            <select id="editMaterialEstado">
                <option value="Ótimo" ${estado === "Ótimo" ? "selected" : ""}>Ótimo</option>
                <option value="Bom" ${estado === "Bom" ? "selected" : ""}>Bom</option>
                <option value="Regular" ${estado === "Regular" ? "selected" : ""}>Regular</option>
                <option value="Ruim" ${estado === "Ruim" ? "selected" : ""}>Ruim</option>
            </select>
        </div>
        <div class="form-group">
            <label><i class="fas fa-flag"></i> Estoque Mínimo (kg)</label>
            <input type="number" id="editMaterialEstoqueMinimo" value="${estoqueMinimo || 0}" step="any">
        </div>
    `;
  document.getElementById("editModal").style.display = "block";

  document.getElementById("saveModalBtn").onclick = async () => {
    const data = {
      codigo: document.getElementById("editMaterialCodigo").value,
      nome: document.getElementById("editMaterialNome").value,
      quantidade: parseFloat(
        document.getElementById("editMaterialQuantidade").value,
      ),
      categoria: document.getElementById("editMaterialCategoria").value,
      fornecedor: document.getElementById("editMaterialFornecedor").value,
      estado: document.getElementById("editMaterialEstado").value,
      estoqueMinimo:
        parseFloat(
          document.getElementById("editMaterialEstoqueMinimo").value,
        ) || 0,
    };
    await saveMaterial(data, id);
    alert("✅ Material atualizado!");
    document.getElementById("editModal").style.display = "none";
    renderMateriais();
  };
}
