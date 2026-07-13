import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyClfUG1pRAtKU292CzywfJYvgZoMmgO6A8",
  authDomain: "projeto-plasticos.firebaseapp.com",
  projectId: "projeto-plasticos",
  storageBucket: "projeto-plasticos.firebasestorage.app",
  messagingSenderId: "923584426399",
  appId: "1:923584426399:web:41b7b16a122d68ccc88daa",
  databaseURL: "https://projeto-plasticos-default-rtdb.firebaseio.com/",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

export { auth, db };
