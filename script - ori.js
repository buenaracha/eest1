// Importar las funciones necesarias de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getDatabase, ref, set, push, onValue } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD6Z66i478edcXZra7cgWHCFgLffShH_KY",
  authDomain: "eest1-9bfc8.firebaseapp.com",
  projectId: "eest1-9bfc8",
  storageBucket: "eest1-9bfc8.firebasestorage.app",
  messagingSenderId: "977356073513",
  appId: "1:977356073513:web:6ede2dd9ce3f7000568a38"
};

// Inicializar Firebase y la base de datos
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Referencias HTML (asegúrate de que los IDs coincidan en el HTML)
const inputDNI = document.getElementById("inputDNI");
const inputNombre = document.getElementById("inputNombre");
const inputApellido = document.getElementById("inputApellido");
const inputCorreo = document.getElementById("inputCorreo");
const btnRegistrar = document.getElementById("btnRegistrar");
const btnConsultar = document.getElementById("btnConsultar");

// Referencia a la colección "estudiantes" en Firebase
const estudiantesRef = ref(database, "estudiantes");

// Array local para almacenar datos de Firebase temporalmente
let estudiantes = [];

// Función para registrar un estudiante (con validación de correo)
btnRegistrar.addEventListener("click", (event) => {
  event.preventDefault(); // Evitar que el formulario recargue la página

  const dni = inputDNI.value.trim();
  const nombre = inputNombre.value.trim();
  const apellido = inputApellido.value.trim();
  const correo = inputCorreo.value.trim();

  // Validaciones
  if (!dni || !nombre || !apellido || !correo) {
    alert("Por favor, complete todos los campos.");
    return;
  }
  if (isNaN(dni) || dni.length < 7 || dni.length > 8) {
    alert("El DNI debe contener entre 7 y 8 dígitos numéricos.");
    return;
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) {
    alert("Por favor, ingrese un correo válido.");
    return;
  }

  // Crear un nuevo registro con correo incluido
  const nuevoEstudiante = {
    dni,
    nombre,
    apellido,
    correo
  };

  // Guardar en Firebase
  push(estudiantesRef, nuevoEstudiante)
    .then(() => {
      alert(`Estudiante registrado: ${nombre} ${apellido}`);
      inputDNI.value = "";
      inputNombre.value = "";
      inputApellido.value = "";
      inputCorreo.value = "";
      inputDNI.focus(); // Enfocar el campo DNI
    })
    .catch((error) => {
      alert("Error al registrar el estudiante: " + error.message);
    });
});

// Función para consultar un estudiante por DNI
btnConsultar.addEventListener("click", (event) => {
  event.preventDefault(); // Evitar comportamiento predeterminado del botón

  const dni = inputDNI.value.trim();
  if (!dni) {
    alert("Por favor, ingrese un DNI.");
    inputDNI.focus();
    return;
  }

  const estudiante = estudiantes.find((e) => e.dni === dni);
  if (estudiante) {
    alert(`Bienvenido, ${estudiante.nombre} ${estudiante.apellido}`);
    inputNombre.value = estudiante.nombre;
    inputApellido.value = estudiante.apellido;
    inputCorreo.value = estudiante.correo;
  } else {
    alert("El DNI ingresado no está registrado. Por favor, complete los datos.");
    inputNombre.value = "";
    inputApellido.value = "";
    inputCorreo.value = "";
    inputNombre.focus();
  }
});

// Leer datos desde Firebase y sincronizar el array local
onValue(estudiantesRef, (snapshot) => {
  const data = snapshot.val();
  estudiantes = data ? Object.values(data) : [];
  console.log("Datos actuales de Firebase:", estudiantes);
});
