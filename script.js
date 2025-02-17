document.addEventListener("DOMContentLoaded", () => {
const mainElement = document.querySelector("main");
  if (mainElement) {
      mainElement.style.backgroundColor = "rgba(229, 229, 232, 0.6)";
}      

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
const materiasContainer = document.getElementById("materiasContainer");
const materiasCheckboxes = document.getElementById("materiasCheckboxes");
const btnEnviarInscripcion = document.getElementById("btnEnviarInscripcion");


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

  function habilitarSelectAnio() {
    const selectAnio = document.getElementById("selectAnio");
    selectAnio.disabled = false; // Habilita el select
    selectAnio.focus(); // Enfoca el select

    // Simula el despliegue del select
    const event = new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true });
    selectAnio.dispatchEvent(event);
    selectAnio.style.border = "2px solid";
    
    // Agrega un mensaje visual
    const mensaje = document.createElement("p");
    mensaje.id = "mensaje-anio";
    mensaje.textContent = "Seleccione un año para continuar.";
    mensaje.style.color = "#00f";
    mensaje.style.fontWeight = "bold";
    mensaje.style.marginTop = "10px";

    // Inserta el mensaje debajo del select
    selectAnio.parentElement.appendChild(mensaje);

    // Remueve el mensaje después de 5 segundos
    setTimeout(() => {
        const mensajeExistente = document.getElementById("mensaje-anio");
        if (mensajeExistente) {
            mensajeExistente.remove();
        }
    }, 3000);
}
  const ref = database.ref("Estudiantes/" + dni);
  ref.once("value", (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      inputNombre.value = data.nombre;
      inputApellido.value = data.apellido;
      inputCorreo.value = data.correo || "";
      alert(`Bienvenido de nuevo, ${data.nombre} ${data.apellido}.`);
      habilitarSelectAnio();
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
      // inputDNI.value = "";
      // inputNombre.value = "";
      // inputApellido.value = "";
      // inputCorreo.value = "";
      habilitarSelectAnio();
      
    }
  });
});

// Objeto para definir las divisiones disponibles por año
const divisionesPorAnio = {
  1: ["Primera", "Segunda", "Tercera", "Cuarta", "Quinta", "Sexta", "Septima"],
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

    // Datos de materias según año y división
    // Lista común de materias para ciertos años o divisiones
const materias1Basico = ["Ciencias Naturales", "Ciencias Sociales", "Educación Artística", "Educación Física", "Inglés", "Matemática", "Prácticas del Lenguaje", "Construcción Ciudadana", "Procedimientos Técnicos", "Lenguajes Tecnológicos", "Sistemas Tecnológicos"];
const materias23Basico = ["Biología", "Construcción Ciudadana", "Educación Artística", "Físico Química", "Geografía", "Historia", "Inglés", "Educación Física", "Matemática", "Prácticas del Lenguaje", "Procedimientos Técnicos", "Lenguajes Tecnológicos", "Sistemas Tecnológicos"];
const materias4Quimica = ["Matemática", "Física", "Química", "Historia", "Inglés"];
const materias4EleTron = ["Matemática", "Física", "Química", "Historia", "Inglés", "Literatura", "Educación Física", "Salud y Adolescencia", "Geografía", "Fundamento de los Mod. Circuitales", "Dispositivos Electrónicos", "Electrónica Analógica I", "Electrónica Digital I", "Producción Electrónica I"];
const materias4EleMec = ["Matemática", "Física", "Química", "Historia", "Inglés"];
const materias5Quimica = ["Matemática", "Física", "Química", "Historia", "Inglés"];
const materias5EleTron = ["Análisis Matemático", "Historia", "Inglés", "Literatura", "Educación Física", "Política y Ciudadanía", "Geografía", "Diseño Circuital", "Lenguaje de Programación", "Electrónica Analógica II", "Electrónica Digital II", "Producción Electrónica II", "Energías Alternativas"];
const materias5EleMec = ["Matemática", "Física", "Química", "Historia", "Inglés"];
const materias6Quimica = ["Matemática", "Física", "Química", "Historia", "Inglés"];
const materias6EleTron = ["Literatura", "Inglés", "Educación Física", "Filosifía", "Arte", "Matemática Aplicada", "Comunicaciones Electrónicas I", "Nano Electrónica", "Derechos del Trabajo", "Control y Op. Eléctrica.", "Laboratorio de Programación", "Producción Electrónica III", "Instrumentos y Control", "Automatismo Electrónico"];
const materias6EleMec = ["Matemática", "Física", "Química", "Historia", "Inglés"];
const materias7Quimica = ["Prácticas Profecionalizantes", "Matemática", "Física", "Química", "Historia", "Inglés"];
const materias7EleTron = ["Prácticas Profecionalizantes", "Emprendimientos e innov. Productiva", "Control y Op. Electrónica.", "Comunicaciones Electrónicas II", "Seguridad, Higiene y Prot. Ambiental", "Proyecto Integrador", "Domótica", "Control Industrial"];
const materias7EleMec = ["Prácticas Profecionalizantes", "Matemática", "Física", "Química", "Historia", "Inglés"];

const materiasPorAnioDivision = {
    "1": {
        "Primera": materias1Basico,
        "Segunda": materias1Basico,
        "Tercera": materias1Basico,
        "Cuarta": materias1Basico,
        "Quinta": materias1Basico,
        "Sexta": materias1Basico,
        "Septima": materias1Basico,
    },
    "2": {
        "Primera": materias23Basico,
        "Segunda": materias23Basico,
        "Tercera": materias23Basico,
        "Cuarta": materias23Basico,
        "Quinta": materias23Basico,
        "Sexta": materias23Basico,
        "Septima": materias23Basico,
    },
    "3": {
      "Primera": materias23Basico,
      "Segunda": materias23Basico,
      "Tercera": materias23Basico,
      "Cuarta": materias23Basico,
      "Quinta": materias23Basico,
      "Sexta": materias23Basico,
      "Septima": materias23Basico,
    },
    "4": {
        "Primera": materias4EleMec,
        "Segunda": materias4EleMec,
        "Tercera": materias4Quimica,
        "Cuarta": materias4EleTron,
        "Quinta": materias4EleTron,
        "Sexta": materias4EleTron,
        "Septima": materias4EleTron,
        "Ocatava":materias4EleTron,
        "Novena":materias4EleMec,
    },
    "5": {
        "Primera": materias5EleMec,
        "Segunda": materias5EleMec,
        "Tercera": materias5Quimica,
        "Cuarta": materias5EleTron,
        "Quinta": materias5EleTron,
        "Sexta": materias5EleTron,
        "Septima": materias5EleTron,
        "Ocatava":materias5EleTron,
        "Novena":materias5EleMec,
    },
    "6": {
        "Primera": materias6EleMec,
        "Segunda": materias6EleMec,
        "Tercera": materias6Quimica,
        "Cuarta": materias6EleTron,
        "Quinta": materias6EleTron,
        "Sexta": materias6EleTron,
        "Septima": materias6EleTron,
        "Ocatava":materias6EleTron,
        "Novena":materias6EleMec,
    },
    "7": {
        "Primera": materias7EleMec,
        "Segunda": materias7EleMec,
        "Tercera": materias7Quimica,
        "Cuarta": materias7EleTron,
        "Quinta": materias7EleMec,
    }
};


  // Habilitar divisiones según el año
  selectAnio.addEventListener("change", () => {
      const anioSeleccionado = selectAnio.value;
      selectDivision.innerHTML = '<option value="" selected disabled>Seleccione una división</option>';

      if (anioSeleccionado) {
          selectDivision.disabled = false;
          const divisiones = Object.keys(materiasPorAnioDivision[anioSeleccionado]);
          divisiones.forEach(division => {
              const option = document.createElement("option");
              option.value = division;
              option.textContent = division;
              selectDivision.appendChild(option);
          });
      } else {
          selectDivision.disabled = true;
      }
  });

  // Mostrar materias según el año y la división seleccionados
  selectDivision.addEventListener("change", () => {
      const anioSeleccionado = selectAnio.value;
      const divisionSeleccionada = selectDivision.value;

      if (anioSeleccionado && divisionSeleccionada) {
          materiasCheckboxes.innerHTML = ""; // Limpia materias previas
          const materias = materiasPorAnioDivision[anioSeleccionado][divisionSeleccionada];

          materias.forEach(materia => {
              const label = document.createElement("label");
              const checkbox = document.createElement("input");
              checkbox.type = "checkbox";
              checkbox.value = materia;
              label.textContent = materia;
              label.prepend(checkbox);
              materiasCheckboxes.appendChild(label);
              materiasCheckboxes.appendChild(document.createElement("br"));
          });

          materiasContainer.style.display = "block";

          // Habilita el botón de inscripción si hay materias seleccionadas
          materiasCheckboxes.addEventListener("change", () => {
              const seleccionadas = materiasCheckboxes.querySelectorAll("input[type='checkbox']:checked");
              btnEnviarInscripcion.disabled = seleccionadas.length === 0;
          });
      }
  });

  // Enviar inscripción a Firebase
  btnEnviarInscripcion.addEventListener("click", () => {
      const dni = document.getElementById("inputDNI").value; // DNI ingresado
      const anioSeleccionado = selectAnio.value;
      const divisionSeleccionada = selectDivision.value;
      const materiasSeleccionadas = Array.from(
          materiasCheckboxes.querySelectorAll("input[type='checkbox']:checked")
      ).map(checkbox => checkbox.value);

      // Referencia a la base de datos
      const inscripcionesRef = firebase.database().ref("Inscripciones");

      // Datos a guardar
      const datosInscripcion = {
          anio: anioSeleccionado,
          division: divisionSeleccionada,
          materias: materiasSeleccionadas
      };

      // Guarda la inscripción bajo el DNI
      inscripcionesRef.child(dni).set(datosInscripcion, error => {
          if (error) {
              console.error("Error al guardar la inscripción:", error);
          } else {
              alert("¡Inscripción guardada con éxito!");
              materiasContainer.style.display = "none"; // Oculta el formulario
          }
      });
  });

  
});
