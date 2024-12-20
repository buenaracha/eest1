document.addEventListener("DOMContentLoaded", () => {
// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD6Z66i478edcXZra7cgWHCFgLffShH_KY",
  authDomain: "eest1-9bfc8.firebaseapp.com",
  databaseURL: "https://eest1-9bfc8-default-rtdb.firebaseio.com/",
  projectId: "eest1-9bfc8",
  storageBucket: "eest1-9bfc8.appspot.com",
  messagingSenderId: "977356073513",
  appId: "1:977356073513:web:6ede2dd9ce3f7000568a38",
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Referencia a los elementos del DOM
const inputDNI = document.getElementById("inputDNI");
const inputNombre = document.getElementById("inputNombre");
const inputApellido = document.getElementById("apellido");
const inputCorreo = document.getElementById("inputCorreo");
const btnConsultar = document.getElementById("btnConsultar");
const btnRegistrar = document.getElementById("btnRegistrar");
const btnReset = document.getElementById("btnReset");
const selectAnio = document.getElementById("selectAnio");
const selectDivision = document.getElementById("selectDivision");

// Funcion para Habilita/deshabilita campos de datos personales
function cambiaVista(disabled) {
  inputNombre.disabled = disabled;
  inputApellido.disabled = disabled;
  inputCorreo.disabled = disabled;
}

// Al cargar la página, deshabilitar los campos de datos personales
cambiaVista(true);
btnRegistrar.style.display= 'none' ;
btnReset.style.display= 'none';

// Verifica el DNI
btnConsultar.addEventListener("click", (e) => {
  e.preventDefault();
  const dni = inputDNI.value.trim();

  if (dni.length < 7 || dni.length > 8 || isNaN(dni)) {
    alert("Por favor, ingrese un DNI válido (7 u 8 dígitos numéricos).");
    inputDNI.focus();
    return;
  }

  const ref = database.ref("Estudiantes/" + dni);
  ref.once("value", (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      inputNombre.value = data.nombre;
      inputApellido.value = data.apellido;
      inputCorreo.value = data.correo || "";
      alert(`Bienvenido de nuevo, ${data.nombre} ${data.apellido}.`);
    } else {
      alert("DNI no encontrado. Puede registrar un nuevo estudiante.");
      cambiaVista(false); // Activar lso campos para ser completados
      btnRegistrar.style.display= 'inline';
      btnReset.style.display= 'inline';
    }
  });
});

// Registra los datos
btnRegistrar.addEventListener("click", (e) => {
  e.preventDefault();

  const dni = inputDNI.value.trim();
  const nombre = inputNombre.value.trim();
  const apellido = inputApellido.value.trim();
  const correo = inputCorreo.value.trim();

  if (!dni || !nombre || !apellido || !correo) {
    alert("Por favor, complete todos los campos.");
    return;
  }

  const ref = database.ref("Estudiantes/" + dni);
  ref.set({ nombre, apellido, correo }, (error) => {
    if (error) {
      alert("Hubo un error al registrar los datos. Inténtelo nuevamente.");
    } else {
      alert("Datos registrados correctamente.");
      inputDNI.value = "";
      inputNombre.value = "";
      inputApellido.value = "";
      inputCorreo.value = "";
      inputDNI.focus();
    }
  });
});

// Objeto para definir las divisiones disponibles por año
const divisionesPorAnio = {
  1: ["Primera", "Segunda", "Tercera", "Cuarta", "Quinta"],
  2: ["Primera", "Segunda", "Tercera", "Cuarta", "Quinta", "Sexta"],
  3: ["Primera", "Segunda", "Tercera", "Cuarta", "Quinta"],
  4: ["Primera", "Segunda", "Tercera", "Cuarta", "Quinta", "Sexta", "Septima", "Octava", "Novena"],
  5: ["Primera", "Segunda", "Tercera", "Cuarta", "Quinta", "Sexta"],
  6: ["Primera", "Segunda", "Tercera", "Cuarta", "Quinta", "Sexta"],
  7: ["Primera", "Segunda", "Tercera", "Cuarta", "Quinta"]
};

// Evento para actualizar divisiones según el año seleccionado
selectAnio.addEventListener("change", () => {
  const anioSeleccionado = selectAnio.value;

  // Limpia las opciones previas de divisiones
  selectDivision.innerHTML = '<option value="" selected disabled>Seleccione una división</option>';

  if (anioSeleccionado) {
      // Habilita el select de divisiones
      selectDivision.disabled = false;

      // Agrega las divisiones correspondientes al año seleccionado
      divisionesPorAnio[anioSeleccionado].forEach((division) => {
          const option = document.createElement("option");
          option.value = division;
          option.textContent = division;
          selectDivision.appendChild(option);
      });
  } else {
      // Deshabilita el select si no hay un año seleccionado
      selectDivision.disabled = true;
  }
});
});