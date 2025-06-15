import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import spline from "./spline.js";
import splinePrincipale from "./splinePrincipale.js";
import { modelsGroup, getFocusedModel, getIsResetting, setLoadingManager, loadAndPlaceModels,getClickableModels,RuotaModels,focusModelOnCamera,updateFocusedModel, createFadeCone } from "./models.js";
import { Text } from 'troika-three-text';

//GESTIRE IL LOADER DELLA PAGINAAAA
const loadingScreen = document.getElementById("loading-screen");

const manager = new THREE.LoadingManager();

manager.onStart = (url, itemsLoaded, itemsTotal) => {
  console.log(`INIZIO: Sto caricando ${url}. ${itemsLoaded}/${itemsTotal}`);
};

manager.onProgress = (url, itemsLoaded, itemsTotal) => {
  console.log(`PROGRESSO: Caricato ${url}. ${itemsLoaded}/${itemsTotal}`);
};

// Quando tutto è caricato
manager.onLoad = () => {
  console.log("Tutte le risorse sono state caricate.");
  loadingScreen.style.opacity = "0";
  setTimeout(() => {
    loadingScreen.style.display = "none";
  }, 1000); // matcha con il transition
};

manager.onError = (url) => {
  console.error(`❌ Errore nel caricamento di ${url}`);
};

setLoadingManager(manager);

//INIZIALIZZA IL RAYCASTER PER POTER CLICCARE SUGLI OGGETTI
const raycaster = new THREE.Raycaster();//per rendere gli oggetti cliccabili
const mouse = new THREE.Vector2();

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x000000, 0, 100); // se voglio attivare fog nel tunnel devo mettere nel materiale del cilindro e tutti gli oggetti con il paramentro fog: false come ho fatto per il piano della faccia


const camera = new THREE.PerspectiveCamera(
  40,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

camera.position.set(0, 0, 0); // Posizione iniziale della camera
camera.lookAt(-1, 0, 0); // La camera guarda verso il centro del cilindro
loadAndPlaceModels(scene, camera); //per mettere i modelli 3D da models.js


//LUCI
const light = new THREE.AmbientLight(0xffffff, 0.3); // soft white light
scene.add(light);

// 2. Hemisphere light
const hemi = new THREE.HemisphereLight(0xffffff, 0x111122, 3.5);
scene.add(hemi);

// 3. Directional cinematic
const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
keyLight.position.set(5, 10, 5);
keyLight.castShadow = true;
scene.add(keyLight);

// 4. Rim light soft
const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
rimLight.position.set(-3, 2, -5);
scene.add(rimLight);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

//creazione dello skybox con la texture delle linee
const loader = new THREE.CubeTextureLoader(manager);
const skyboxTexture = loader.load([
  '/white.jpg', // px
  '/white.jpg', // nx
  '/white.jpg', // py
  '/white.jpg', // ny
  '/white.jpg', // pz
  '/white.jpg',  // nz
]);
scene.background = skyboxTexture; // opzionale, se vuoi vedere lo sfondo
scene.environment = skyboxTexture; // importante per riflessi PBR
scene.background = null;
scene.environment = skyboxTexture;

//controlli per la camera
const controls = new OrbitControls(camera, renderer.domElement);
controls.enabled = true;
controls.target.set(-0.000001, 0, 0); // molto importante
    controls.enablePan = false;
    controls.enableZoom = false;

    controls.minPolarAngle = Math.PI / 2;
    controls.maxPolarAngle = Math.PI / 2;
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = -0.3; //ho messo il meno per invertire il senso di rotazione



// Creazione del cilindro wireframe segmentato
const cylinderRadius = 4;
const cylinderHeight = 4;
const radialSegments = 50;
const heightSegments = 13;

// Creazione del cilindro principale con segmenti verticali
const cylinderGeo = new THREE.CylinderGeometry(
  cylinderRadius,
  cylinderRadius,
  cylinderHeight,
  radialSegments,
  heightSegments,
  true
);

// Estrazione dei bordi del cilindro
const cylinderEdges = new THREE.EdgesGeometry(cylinderGeo);
const cylinderLines = new THREE.LineSegments(
  cylinderEdges,
  new THREE.LineBasicMaterial({ color: 0xffffff })
);
scene.add(cylinderLines);

// Aggiunta delle linee orizzontali
for (let i = 0; i <= heightSegments; i++) {
  const y = (i / heightSegments - 0.5) * cylinderHeight - 0.1; // -0.1 sposta le righe sull'asse Y
  const ringGeo = new THREE.CircleGeometry(cylinderRadius, radialSegments);
  ringGeo.rotateX(Math.PI / 2);
  const ringEdges = new THREE.EdgesGeometry(ringGeo);
  const ringLines = new THREE.LineSegments(
    ringEdges,
    new THREE.LineBasicMaterial({ color: 0xffffff })
  );
  ringLines.position.y = y;
  scene.add(ringLines);
}

// Geometria del cerchio (raggio 4, 64 segmenti per una forma liscia)
const circleCount = 50;
const baseY = -1.95; // punto più basso del cilindro
const stepY = 0.008; // distanza verticale tra i cerchi
const radius = 4.2;

for (let i = 0; i < circleCount; i++) {
  const opacity = (i / circleCount) * 0.11; // più in alto = meno opaco
  const circleGeo = new THREE.CircleGeometry(radius, 16);
  const circleMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: opacity,
    depthWrite: false // evita artefatti visivi
  });

  const circle = new THREE.Mesh(circleGeo, circleMat);
  circle.rotation.x = -Math.PI / 2;
  circle.position.y = baseY + i * stepY;
  scene.add(circle);
}


// Creazione del cilindro PIENO PER NON VEDERE IL TUNNEL
const cylinderPIENO = new THREE.CylinderGeometry(4.1,4.1,4,64,1,true);
const materialPIENO = new THREE.MeshBasicMaterial({ color: 0x000000,transparent: false, opacity: 1,side: THREE.BackSide});
const CILINDROPIENO = new THREE.Mesh(cylinderPIENO, materialPIENO);
scene.add(CILINDROPIENO);



//variabili per sistemare errore nel drag che attiva anche gli oggetti cliccabili passandoci sopra
let mouseDownPos = new THREE.Vector2();
let isDragging = false;

// Gestione del mouse per il drag per evitare che il click attivi anche gli oggetti cliccabili quando si fa drag
window.addEventListener("mousedown", (event) => {
  mouseDownPos.set(event.clientX, event.clientY);
  isDragging = false;
});

window.addEventListener("mousemove", (event) => {
  const dx = event.clientX - mouseDownPos.x;
  const dy = event.clientY - mouseDownPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > 5) {
    isDragging = true;
  }
});


//RENDE OGGETTI CLICCABILI
window.addEventListener("click", (event) => {

  if (isDragging) {
    mouse.clicked = false;
    return; // blocca il click se era un drag, aggiunto per evitare che il click attivi anche gli oggetti cliccabili quando si fa drag
  }

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Click su modelli 3D cliccabili
  const intersects = raycaster.intersectObjects(getClickableModels(), true);
  if (intersects.length > 0) {
    let selected = intersects[0].object;
    while (selected.parent && !getClickableModels().includes(selected)) {
      selected = selected.parent;
    }
    

    // Reset scala prima del focus. in modo tale che l'hover che ingrandisce non interferisca con il cambio di scala della funzione focusModelOnCamera
    if (selected.userData.originalScale) {
      selected.scale.setScalar(selected.userData.originalScale);
    }
    focusModelOnCamera(selected);
    mouse.clicked = true;
  }
  
   // Click su testi della navbar
  const intersectsNav = raycaster.intersectObjects(clickableNavs, true);
  if (intersectsNav.length > 0) {
    let selected = intersectsNav[0].object;
    while (selected.parent && !clickableNavs.includes(selected)) {
      selected = selected.parent;
    }

  const link = selected.userData.link; // questo pezzo fa la transizione al nero e mi porta al nuovo link
    if (link) {
    fadeToBlackAndRedirect(link);
  }
  }
});



//CAMBIA POINTER SU OGGETTO CLICCCABILE
window.addEventListener("mousemove", (event) => {
  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
});

let isHoveringClickable = false;
let hoveredModel = null;
const nameDiv = document.getElementById("model-name"); // creata una variabile del div per mostrare il nome del modello

//funzione che gestisce il cursore quando si passa sopra i modelli cliccabili
function updateCursorOnHover() {
  if (getIsResetting()) return; // Se stai resettando, non fare nulla


  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(getClickableModels(), true);

  if (intersects.length > 0) {
    let selected = intersects[0].object;
    while (selected.parent && !getClickableModels().includes(selected)) {
      selected = selected.parent;
    }

    document.body.style.cursor = "pointer";
    isHoveringClickable = true;

    // Mostra il nome del modello
    nameDiv.textContent = selected.userData.name || "Untitled";
    nameDiv.style.opacity = "1";

    if (hoveredModel !== selected && selected !== getFocusedModel()) {
      // Reset al target scale di tutti
      getClickableModels().forEach((model, i) => {
        const original = modelsGroup.children[i];
        const originalScale = original.userData.originalScale || original.scale.x;
        model.userData.originalScale = originalScale;
        model.userData.targetScale = originalScale;
      });

      // Imposta la nuova scala target solo sul selezionato
      const base = selected.userData.originalScale || selected.scale.x;
      selected.userData.originalScale = base;
      selected.userData.targetScale = base * 1.15; // Ingrandisce il modello quando hoverato

      hoveredModel = selected;
    }

  } else {
    if (isHoveringClickable) {
      document.body.style.cursor = "default";
      isHoveringClickable = false;
    }

    // Nasconde il nome se non c'è hover
    nameDiv.style.opacity = "0";
    nameDiv.textContent = "";

    // Reset della scala target se non stai hoverando nulla
    getClickableModels().forEach((model, i) => {
      const original = modelsGroup.children[i];
      const originalScale = original.userData.originalScale || original.scale.x;
      model.userData.originalScale = originalScale;
      model.userData.targetScale = originalScale;
    });

    hoveredModel = null;
  }
}



function updateHoveredScales() {
  getClickableModels().forEach((model) => {
  if (model === getFocusedModel()) return; //  Salta lerp su modello cliccato
    if (model.userData.targetScale !== undefined) {
      const current = model.scale.x;
      const target = model.userData.targetScale;
      const newScale = THREE.MathUtils.lerp(current, target, 0.1);
      model.scale.set(newScale, newScale, newScale);
    }
  });
}

createFadeCone(scene); // Crea il cono inizialmente invisibile che oscura i modelli cliccabili dopo averne cliccato uno



//fading quando si clicca un link della navbar
function fadeToBlackAndRedirect(url) {
  const fadeDiv = document.getElementById("black-fade");
  fadeDiv.style.pointerEvents = "auto";
  fadeDiv.style.opacity = "1";

  // Dopo il tempo della transizione, fai il redirect
  setTimeout(() => {
    window.top.location.href = url;
  }, 1000); // deve combaciare con la transition nel CSS
}



//TESTI NAVBAR
const navLabels = []; // salva tutti i gruppi per l'animazione
const clickableNavs = []; // oggetti cliccabili
const labelRadius = 3.3;

// Definisci le etichette con angolo e link
const labelsData = [//questi dati non modificano nulla, perché le modifiche vanno fatte nella parte responsive
  { text: 'ABOUT', angle: Math.PI * 0.1, y: -0.97, link: '/about' }, // basso
  { text: 'FLATFADE', angle: -Math.PI * 0.1, y: -0.97, link: 'https://wddc-groupieml.webflow.io/psiche' }, // basso
  { text: 'PSICHE', angle: -Math.PI * 0.04, y: 1.06, link: 'https://wddc-groupieml.webflow.io/psiche' }, // alto
  { text: 'SPECCHIO', angle: Math.PI * 0.04, y: 1.06, link: 'https://wddc-groupieml.webflow.io/specchio' }, // alto
];

labelsData.forEach(data => {
  const group = new THREE.Group();

  // Troika Text
  const label = new Text();
  label.text = data.text;
  label.font = "/Fonts/ClashGrotesk/ClashGrotesk-Regular.ttf";
  label.fontSize = 0.07;
  label.color = data.text === "SPECCHIO" ? 0xaaaaaa : 0xffffff;
  label.anchorX = 'center';
  label.anchorY = 'middle';
  label.outlineWidth = 0.0001; //  0.005 ≈ 1px 
  label.outlineColor = 0xffffff; // colore del bordo
  label.userData.link = data.link;
  label.sync();

  // Sfondo nero
  const bgGeo = new THREE.PlaneGeometry(0.36, 0.12);
  const bgMat = new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 1, transparent: true });
  const bg = new THREE.Mesh(bgGeo, bgMat);
  bg.position.z = -0.01;

  group.add(bg);
  group.add(label);

  // Posizione curva sul cilindro
  const angle = data.angle;
  group.userData.originalAngle = angle; // salva l'angolo originale
  group.position.x = Math.cos(angle) * labelRadius;
  group.position.z = Math.sin(angle) * labelRadius;
  group.position.y = data.y;

  group.userData.link = data.link;

  scene.add(group);
  group.visible = true; 
  navLabels.push(group);
  clickableNavs.push(group);
});

//per rendere responsive le etichette della NavBar
function updateNavLabelAngles() {
  const isMobile = window.innerWidth < 768;

  navLabels.forEach((group, index) => {
    const data = labelsData[index];
    
    // Calcolo nuovo angolo solo se la y è negativa (etichette in basso)
    let baseAngle = data.text === 'ABOUT' ? Math.PI * 0.14 : 
                    data.text === 'FLATFADE' ? -Math.PI * 0.14 :
                    data.text === 'SPECCHIO' ? Math.PI * 0.04 :
                    data.text === 'PSICHE' ?-Math.PI * 0.04: 0;

    const newAngle = isMobile && data.y < 0 ? baseAngle * 0.6 : baseAngle;

    data.angle = newAngle;
    group.userData.originalAngle = newAngle;
  });
}

//rende cliccabili le etichette della navbar
function updateNavInteractions() {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(clickableNavs, true);

  if (intersects.length > 0) {
    const hovered = intersects[0].object.parent; // Prendiamo il gruppo

    document.body.style.cursor = "pointer";

    clickableNavs.forEach(group => {
      const scaleTarget = group === hovered ? 1.1 : 1;
      group.scale.lerp(new THREE.Vector3(scaleTarget, scaleTarget, scaleTarget), 0.1);
    });

    // Click handling (solo se è stato cliccato e non solo hoverato)
    if (mouse.clicked) {
      const link = hovered.userData.link;
      if (link) {
        window.top.location.href = link;
      }
    }

  } else {
    document.body.style.cursor = "default";
    clickableNavs.forEach(group => {
      group.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
    });
  }
  mouse.clicked = false; // Reset dopo il click
}



//funzione di animazione per gestire le varie funzioni
function animate() {
  requestAnimationFrame(animate);
  //aggiorna il cursore sui modelli cliccabili
  RuotaModels();

  

  // Calcola l'angolo Y della camera (orientamento orizzontale) fa seguire i label alla camera
  const cameraQuaternion = camera.quaternion.clone();
  const euler = new THREE.Euler().setFromQuaternion(cameraQuaternion, 'YXZ');
  const cameraRotationY = euler.y;
  // Applica una rotazione inversa alle label per farle "seguire" la camera
  navLabels.forEach(group => {
    const angle = group.userData.originalAngle;
    const radius = labelRadius;
    const totalAngle = angle - cameraRotationY + Math.PI*1.5 //il meno -cameraRotationY serve per farle ruotare nell'altro senso come con gli orbit controls const totalAngle = angle - cameraRotationY + Math.PI*0.5;

    group.position.x = Math.cos(totalAngle) * radius;
    group.position.z = Math.sin(totalAngle) * radius;

    group.lookAt(0, group.position.y, 0); // Fa sì che guardino sempre il centro
  });


  
  //aggiorna le etichette della navbar in base alla dimensione dello schermo
  updateNavLabelAngles();
  //gestione hover e click sulle etichette della navbar
  updateNavInteractions();
  //gestione dell'hover e click sui modelli 3D
  updateCursorOnHover();
  updateFocusedModel(camera);
  updateHoveredScales();
  renderer.render(scene, camera);
  controls.update();
}

animate();




// Resize
window.addEventListener("resize", () => {
  updateNavLabelAngles(); //fa resize responsive delle etichette della navbar
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

