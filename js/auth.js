import { auth, db } from ".firebaseConfig.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updatePassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { ref, get, set, update, push, remove } from "firebase/database";

let currentUser = null;
let userRole = null;
let userExtraInfo = {
  nome: "",
  turno: "",
  professoresVinculados: [],
  dataHoraLogin: null,
  historicoLogins: [],
};

let isOnline = navigator.onLine;

// Professores pré-cadastrados
const PROFESSORES_PRE_CADASTRADOS = [
  {
    nome: "Tramontina",
    email: "tramontina@senai.com",
    senha: "123456",
    matricula: "35354",
  },
  {
    nome: "Signorati",
    email: "signorati@senai.com",
    senha: "123456",
    matricula: "35117",
  },
  {
    nome: "Wesley",
    email: "wesley@senai.com",
    senha: "123456",
    matricula: "XXXXX",
  },
];

// Alunos pré-cadastrados para teste
const ALUNOS_PRE_CADASTRADOS = [
  {
    nome: "João Silva",
    email: "joao@email.com",
    senha: "123456",
    turno: "Manhã",
  },
  {
    nome: "Maria Santos",
    email: "maria@email.com",
    senha: "123456",
    turno: "Tarde",
  },
  {
    nome: "Pedro Costa",
    email: "pedro@email.com",
    senha: "123456",
    turno: "Noite",
  },
];

// ========== INICIALIZAR PROFESSORES ==========
async function inicializarProfessores() {
  try {
    for (const prof of PROFESSORES_PRE_CADASTRADOS) {
      try {
        const snapshot = await get(ref(db, `professores/${prof.email}`));
        if (!snapshot.exists()) {
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            prof.email,
            prof.senha,
          );
          const user = userCredential.user;

          await set(ref(db, `professores/${prof.email}`), {
            nome: prof.nome,
            email: prof.email,
            matricula: prof.matricula,
            role: "professor",
            dataCriacao: new Date().toLocaleString(),
          });

          await set(ref(db, `usuarios/${user.uid}`), {
            nome: prof.nome,
            email: prof.email,
            role: "professor",
            matricula: prof.matricula,
            dataCriacao: new Date().toLocaleString(),
          });

          console.log(`✅ Professor ${prof.nome} cadastrado!`);
        }
      } catch (e) {
        if (e.code !== "auth/email-already-in-use") {
          console.warn(`Erro ao cadastrar ${prof.nome}:`, e.message);
        }
      }
    }
  } catch (error) {
    console.warn("Erro ao inicializar professores:", error);
  }
}

// ========== INICIALIZAR ALUNOS ==========
async function inicializarAlunos() {
  try {
    for (const aluno of ALUNOS_PRE_CADASTRADOS) {
      try {
        const snapshot = await get(ref(db, `alunos/${aluno.email}`));
        if (!snapshot.exists()) {
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            aluno.email,
            aluno.senha,
          );
          const user = userCredential.user;

          await set(ref(db, `alunos/${aluno.email}`), {
            nome: aluno.nome,
            email: aluno.email,
            turno: aluno.turno,
            role: "aluno",
            dataCriacao: new Date().toLocaleString(),
          });

          await set(ref(db, `usuarios/${user.uid}`), {
            nome: aluno.nome,
            email: aluno.email,
            role: "aluno",
            turno: aluno.turno,
            dataCriacao: new Date().toLocaleString(),
          });

          console.log(`✅ Aluno ${aluno.nome} cadastrado!`);
        }
      } catch (e) {
        if (e.code !== "auth/email-already-in-use") {
          console.warn(`Erro ao cadastrar ${aluno.nome}:`, e.message);
        }
      }
    }
  } catch (error) {
    console.warn("Erro ao inicializar alunos:", error);
  }
}

// ========== INICIALIZAR DADOS ==========
async function inicializarDados() {
  await inicializarProfessores();
  await inicializarAlunos();
}

inicializarDados();

// ========== LOGIN PROFESSOR ==========
async function loginProfessor(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;

    await loadUserExtraInfo(user.uid);

    if (userExtraInfo.role !== "professor") {
      await signOut(auth);
      return {
        success: false,
        error: 'Esta conta não é de um professor. Use a aba "Aluno".',
      };
    }

    userRole = "professor";

    const loginData = {
      data: new Date().toLocaleString(),
      email: user.email,
      role: "professor",
      nome: userExtraInfo.nome || user.email.split("@")[0],
    };

    userExtraInfo.historicoLogins = userExtraInfo.historicoLogins || [];
    userExtraInfo.historicoLogins.push(loginData);
    userExtraInfo.dataHoraLogin = new Date().toLocaleString();

    if (isOnline) {
      await saveUserExtraInfo(user.uid, {
        ultimoLogin: userExtraInfo.dataHoraLogin,
        historicoLogins: userExtraInfo.historicoLogins,
        role: "professor",
        email: user.email,
        nome: userExtraInfo.nome || user.email.split("@")[0],
      });
    }

    return { success: true, user, role: "professor" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ========== LOGIN ALUNO ==========
async function loginAluno(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;

    await loadUserExtraInfo(user.uid);

    if (userExtraInfo.role !== "aluno") {
      await signOut(auth);
      return {
        success: false,
        error: 'Esta conta não é de um aluno. Use a aba "Professor".',
      };
    }

    userRole = "aluno";

    const loginData = {
      data: new Date().toLocaleString(),
      email: user.email,
      role: "aluno",
      nome: userExtraInfo.nome || user.email.split("@")[0],
    };

    userExtraInfo.historicoLogins = userExtraInfo.historicoLogins || [];
    userExtraInfo.historicoLogins.push(loginData);
    userExtraInfo.dataHoraLogin = new Date().toLocaleString();

    if (isOnline) {
      await saveUserExtraInfo(user.uid, {
        ultimoLogin: userExtraInfo.dataHoraLogin,
        historicoLogins: userExtraInfo.historicoLogins,
        role: "aluno",
        email: user.email,
        nome: userExtraInfo.nome || user.email.split("@")[0],
      });
    }

    return { success: true, user, role: "aluno" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ========== PRIMEIRO ACESSO ==========
async function cadastrarAluno(nome, email, senha, turno, professores) {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      senha,
    );
    const user = userCredential.user;

    const userData = {
      nome: nome,
      email: email,
      role: "aluno",
      turno: turno,
      professoresVinculados: professores || [],
      dataCriacao: new Date().toLocaleString(),
      historicoLogins: [],
    };

    if (isOnline) {
      await set(ref(db, `usuarios/${user.uid}`), userData);
      await set(ref(db, `alunos/${email}`), userData);
    }

    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ========== CADASTRAR PROFESSOR ==========
async function cadastrarProfessor(nome, email, senha, matricula) {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      senha,
    );
    const user = userCredential.user;

    const userData = {
      nome: nome,
      email: email,
      role: "professor",
      matricula: matricula || "",
      dataCriacao: new Date().toLocaleString(),
      historicoLogins: [],
    };

    if (isOnline) {
      await set(ref(db, `usuarios/${user.uid}`), userData);
      await set(ref(db, `professores/${email}`), userData);
    }

    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ========== REDEFINIR SENHA ==========
async function redefinirSenha(email, novaSenha, confirmarSenha) {
  try {
    if (novaSenha !== confirmarSenha) {
      return { success: false, error: "As senhas não coincidem!" };
    }

    if (novaSenha.length < 6) {
      return {
        success: false,
        error: "A senha deve ter pelo menos 6 caracteres!",
      };
    }

    let uidEncontrado = null;

    const usuariosSnapshot = await get(ref(db, "usuarios"));
    if (usuariosSnapshot.exists()) {
      const usuarios = usuariosSnapshot.val();
      for (const [uid, data] of Object.entries(usuarios)) {
        if (data.email === email) {
          uidEncontrado = uid;
          break;
        }
      }
    }

    if (!uidEncontrado) {
      const profSnapshot = await get(ref(db, "professores"));
      if (profSnapshot.exists()) {
        const profs = profSnapshot.val();
        for (const [uid, data] of Object.entries(profs)) {
          if (data.email === email) {
            uidEncontrado = uid;
            break;
          }
        }
      }
    }

    if (!uidEncontrado) {
      return { success: false, error: "Usuário não encontrado!" };
    }

    const user = auth.currentUser;
    if (user && user.uid === uidEncontrado) {
      await updatePassword(user, novaSenha);
    } else {
      try {
        await sendPasswordResetEmail(auth, email);
        return { success: true, message: "Email de redefinição enviado!" };
      } catch (error) {
        return { success: false, error: "Erro ao enviar email." };
      }
    }

    await update(ref(db, `usuarios/${uidEncontrado}`), {
      senhaAtualizada: true,
      ultimaAlteracaoSenha: new Date().toLocaleString(),
    });

    return { success: true, message: "Senha redefinida!" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ========== REMOVER USUÁRIO ==========
async function removerUsuario(uid) {
  try {
    const userSnapshot = await get(ref(db, `usuarios/${uid}`));
    let userData = {};
    if (userSnapshot.exists()) {
      userData = userSnapshot.val();
    }

    await remove(ref(db, `usuarios/${uid}`));

    if (userData.role === "professor" && userData.email) {
      await remove(ref(db, `professores/${userData.email}`));
    }

    if (userData.role === "aluno" && userData.email) {
      await remove(ref(db, `alunos/${userData.email}`));
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ========== LISTAR PROFESSORES ==========
async function listarProfessores() {
  try {
    const snapshot = await get(ref(db, "professores"));
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.keys(data).map((key) => ({ id: key, ...data[key] }));
    }
    return [];
  } catch (error) {
    console.warn("Erro ao listar professores:", error);
    return [];
  }
}

// ========== LISTAR ALUNOS ==========
async function listarAlunos() {
  try {
    const snapshot = await get(ref(db, "alunos"));
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.keys(data).map((key) => ({ id: key, ...data[key] }));
    }
    return [];
  } catch (error) {
    console.warn("Erro ao listar alunos:", error);
    return [];
  }
}

// ========== LOGOUT ==========
async function logoutUser() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ========== CARREGAR INFORMAÇÕES ==========
async function loadUserExtraInfo(uid) {
  try {
    if (isOnline) {
      const userRef = ref(db, `usuarios/${uid}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        userExtraInfo = { ...userExtraInfo, ...snapshot.val() };
        return userExtraInfo;
      }
    }
    return userExtraInfo;
  } catch (error) {
    return userExtraInfo;
  }
}

// ========== SALVAR INFORMAÇÕES ==========
async function saveUserExtraInfo(uid, data) {
  try {
    if (isOnline) {
      await update(ref(db, `usuarios/${uid}`), data);
    }
    userExtraInfo = { ...userExtraInfo, ...data };
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ========== OBSERVADOR ==========
function onAuthStateChange(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await loadUserExtraInfo(user.uid);
      userRole = userExtraInfo.role || "aluno";
      callback({
        isLoggedIn: true,
        user,
        role: userRole,
        extraInfo: userExtraInfo,
      });
    } else {
      currentUser = null;
      userRole = null;
      callback({ isLoggedIn: false, user: null });
    }
  });
}

export {
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
  loadUserExtraInfo,
  saveUserExtraInfo,
  currentUser,
  userRole,
  userExtraInfo,
  isOnline,
  PROFESSORES_PRE_CADASTRADOS,
  ALUNOS_PRE_CADASTRADOS,
};
