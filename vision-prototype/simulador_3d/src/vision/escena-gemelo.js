import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { aTres, aPython, anguloATres, centroDeCamara, baseDeCamara } from './coordenadas.mjs';

const COLOR_MESA = 0xebebeb;
const COLOR_BLOQUE = 0xb9a9e8;
const COLOR_FICHA = 0xfafafa;
const COLOR_CAMARA = 0x757575;
const COLOR_ELEGIDA = 0x0d99ff;
const COLOR_CONO = 0x0d99ff;
const COLOR_MANO = 0xcdb4a0;
const COLOR_CONECTOR = 0xcfcfcf;
const COLOR_TE = 0x9fb8c6;
const COLOR_PUERTO = 0x7a7a7a;
const COLOR_PUERTO_SALIDA = 0x14ae5c;
const COLOR_SOPORTE = 0xc4baaa;
const COLOR_HOJA = 0xf2f0e9;

function etiqueta(texto) {
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = 128;
  const ctx = lienzo.getContext('2d');
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#1e1e1e';
  ctx.font = 'bold 54px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto.length > 4 ? texto.slice(0, 4) : texto, 64, 68);
  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;
  return textura;
}

export function crearEscenaGemelo(contenedor, { alSeleccionar, alMover, alTocarUnion }) {
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0xf5f5f5);
  const vista = new THREE.PerspectiveCamera(45, 1, 1, 6000);
  vista.position.set(240, 330, 330);
  const render = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  render.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  contenedor.append(render.domElement);
  const orbita = new OrbitControls(vista, render.domElement);
  orbita.enableDamping = true;
  escena.add(new THREE.HemisphereLight(0xffffff, 0xcccccc, 2.2));
  const luz = new THREE.DirectionalLight(0xffffff, 1.2);
  luz.position.set(-200, 400, 260);
  escena.add(luz);

  const mesa = new THREE.Mesh(new THREE.PlaneGeometry(900, 700),
    new THREE.MeshLambertMaterial({ color: COLOR_MESA }));
  mesa.rotation.x = -Math.PI / 2;
  escena.add(mesa);

  const montaje = new THREE.Group();
  const camaras = new THREE.Group();
  escena.add(montaje, camaras);

  const puntero = new THREE.Vector2();
  const rayo = new THREE.Raycaster();
  const plano = new THREE.Plane();
  const corte = new THREE.Vector3();
  const agarre = new THREE.Vector3();
  let elegida = null, arrastrando = null, estado = null;

  function limpiar(grupo) {
    while (grupo.children.length) {
      const hijo = grupo.children.pop();
      hijo.traverse(o => { o.geometry?.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.map?.dispose(); m.dispose(); }); });
    }
  }

  function orientar(malla, marco) {
    const x = new THREE.Vector3(...aTres(marco.avance));
    const y = new THREE.Vector3(...aTres(marco.normal));
    const z = new THREE.Vector3().crossVectors(x, y);
    malla.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  }

  function barra(desde, hasta, grosor, color) {
    const a = new THREE.Vector3(...aTres(desde)), b = new THREE.Vector3(...aTres(hasta));
    const largo = a.distanceTo(b);
    const malla = new THREE.Mesh(new THREE.CylinderGeometry(grosor, grosor, Math.max(largo, 1), 12),
      new THREE.MeshLambertMaterial({ color }));
    malla.position.copy(a).add(b).multiplyScalar(.5);
    malla.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0),
      b.clone().sub(a).normalize());
    return malla;
  }

  function dibujarMontaje(geometria) {
    limpiar(montaje);
    for (const b of geometria.bloques) {
      const caja = new THREE.Mesh(new THREE.BoxGeometry(b.largo, b.alto, b.ancho),
        new THREE.MeshLambertMaterial({ color: COLOR_BLOQUE }));
      orientar(caja, b);
      const centro = new THREE.Vector3(...aTres(b.centro));
      caja.position.copy(centro).add(new THREE.Vector3(...aTres(b.normal)).multiplyScalar(b.alto / 2));
      montaje.add(caja);
    }
    for (const c of geometria.conectores || []) {
      const mitad = c.largo / 2;
      const desde = c.centro.map((v, i) => v - c.avance[i] * mitad);
      const hasta = c.centro.map((v, i) => v + c.avance[i] * mitad);
      const pieza = barra(desde, hasta, 4, COLOR_CONECTOR);
      pieza.userData.union = { tipo: 'conector', estado: c.estado, desde: c.desde, hacia: c.hacia };
      montaje.add(pieza);
    }
    for (const t of geometria.tes || []) {
      const grupo = new THREE.Group();
      grupo.add(barra(t.puertos.vastago_plano, t.puertos.vastago_esferico, 4.5, COLOR_TE));
      grupo.add(barra(t.centro, t.puertos.rama, 4.5, COLOR_TE));
      for (const [nombre, punto] of Object.entries(t.puertos)) {
        const bola = new THREE.Mesh(new THREE.SphereGeometry(nombre === 'vastago_esferico' ? 6 : 4.5, 12, 10),
          new THREE.MeshLambertMaterial({ color: nombre === 'vastago_esferico' ? COLOR_PUERTO_SALIDA : COLOR_PUERTO }));
        bola.position.set(...aTres(punto));
        grupo.add(bola);
      }
      grupo.traverse(o => { o.userData.union = { tipo: 'te', id: t.id, estado: t.estado, puertos: Object.keys(t.puertos) }; });
      montaje.add(grupo);
    }
    for (const s of geometria.soportes || []) {
      const cuna = new THREE.Mesh(new THREE.BoxGeometry(s.lado, s.alto, s.lado),
        new THREE.MeshLambertMaterial({ color: COLOR_SOPORTE }));
      const [x, y, z] = aTres(s.centro);
      cuna.position.set(x, y + s.alto / 2, z);
      montaje.add(cuna);
    }
    for (const f of geometria.fondos || []) {
      const hoja = new THREE.Mesh(new THREE.PlaneGeometry(f.ancho, f.alto),
        new THREE.MeshLambertMaterial({ color: COLOR_HOJA }));
      hoja.rotation.x = -Math.PI / 2;
      const [x, y, z] = aTres(f.centro);
      hoja.position.set(x, y + 0.4, z);
      montaje.add(hoja);
    }
    for (const f of geometria.fichas) {
      if (f.retirada) continue;
      const ficha = new THREE.Mesh(new THREE.BoxGeometry(f.lado, 2, f.lado), [
        new THREE.MeshLambertMaterial({ color: COLOR_FICHA }), new THREE.MeshLambertMaterial({ color: COLOR_FICHA }),
        new THREE.MeshLambertMaterial({ map: etiqueta(f.lexema) }), new THREE.MeshLambertMaterial({ color: COLOR_FICHA }),
        new THREE.MeshLambertMaterial({ color: COLOR_FICHA }), new THREE.MeshLambertMaterial({ color: COLOR_FICHA }),
      ]);
      orientar(ficha, f);
      ficha.position.set(...aTres(f.centro));
      ficha.userData.ficha = f.id;
      montaje.add(ficha);
    }
    for (const m of geometria.manos) {
      const bulto = new THREE.Mesh(new THREE.CylinderGeometry(m.radio, m.radio * .8, m.alto, 20),
        new THREE.MeshLambertMaterial({ color: COLOR_MANO }));
      const [x, , z] = aTres(m.centro);
      bulto.position.set(x, m.alto / 2, z);
      montaje.add(bulto);
    }
  }

  function cono(camara) {
    const distancia = 170;
    const radio = distancia * Math.tan(camara.fov * Math.PI / 360);
    const geometria = new THREE.ConeGeometry(radio, distancia, 4, 1, true);
    geometria.translate(0, -distancia / 2, 0);
    return new THREE.Mesh(geometria, new THREE.MeshBasicMaterial({
      color: COLOR_CONO, transparent: true, opacity: .14, side: THREE.DoubleSide, depthWrite: false }));
  }

  function dibujarCamaras(lista) {
    limpiar(camaras);
    for (const c of lista) {
      const grupo = new THREE.Group();
      grupo.userData.id = c.id;
      const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(34, 26, 26),
        new THREE.MeshLambertMaterial({ color: c.id === elegida ? COLOR_ELEGIDA : COLOR_CAMARA }));
      cuerpo.userData.id = c.id;
      const lente = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 16, 16),
        new THREE.MeshLambertMaterial({ color: 0x2b2b2b }));
      lente.rotation.x = Math.PI / 2;
      lente.position.z = 18;
      lente.userData.id = c.id;
      grupo.add(cuerpo, lente);
      const visual = cono(c);
      visual.userData.id = c.id;
      visual.visible = true;
      grupo.add(visual);
      const centro = centroDeCamara(c.pose ?? { rot: [[1, 0, 0], [0, -1, 0], [0, 0, -1]], tras: [0, 0, 0] });
      grupo.position.set(...(c.pose ? centro : aTres(c.centro)));
      const mira = new THREE.Vector3(...aTres(c.objetivo));
      grupo.lookAt(mira);
      visual.quaternion.copy(new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1)));
      camaras.add(grupo);
    }
  }

  function actualizar(nuevo) {
    estado = nuevo;
    if (!elegida || !nuevo.camaras.some(c => c.id === elegida)) elegida = nuevo.camaras[0]?.id ?? null;
    dibujarMontaje(nuevo.geometria);
    dibujarCamaras(nuevo.camaras);
  }

  function seleccionar(id) {
    if (!id || id === elegida) return;
    elegida = id;
    if (estado) dibujarCamaras(estado.camaras);
    alSeleccionar?.(id);
  }

  function apuntar(evento) {
    const caja = render.domElement.getBoundingClientRect();
    puntero.set(((evento.clientX - caja.left) / caja.width) * 2 - 1,
      -((evento.clientY - caja.top) / caja.height) * 2 + 1);
    rayo.setFromCamera(puntero, vista);
  }

  function objetoBajo(evento) {
    apuntar(evento);
    const tocados = rayo.intersectObjects(camaras.children, true);
    return tocados.length ? tocados[0].object.userData.id : null;
  }

  function montajeBajo(evento) {
    apuntar(evento);
    for (const golpe of rayo.intersectObjects(montaje.children, true)) {
      const datos = golpe.object.userData;
      if (datos.union) return { union: datos.union };
      if (datos.ficha) return { ficha: datos.ficha };
    }
    return null;
  }

  render.domElement.addEventListener('pointerdown', evento => {
    const id = objetoBajo(evento);
    if (!id) {
      const tocado = montajeBajo(evento);
      if (tocado) alTocarUnion?.(tocado);
      return;
    }
    seleccionar(id);
    const grupo = camaras.children.find(g => g.userData.id === id);
    plano.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), grupo.position);
    rayo.ray.intersectPlane(plano, corte);
    agarre.copy(corte).sub(grupo.position);
    arrastrando = { id, grupo };
    orbita.enabled = false;
    render.domElement.setPointerCapture(evento.pointerId);
  });

  render.domElement.addEventListener('pointermove', evento => {
    if (!arrastrando) return;
    const caja = render.domElement.getBoundingClientRect();
    puntero.set(((evento.clientX - caja.left) / caja.width) * 2 - 1,
      -((evento.clientY - caja.top) / caja.height) * 2 + 1);
    rayo.setFromCamera(puntero, vista);
    if (!rayo.ray.intersectPlane(plano, corte)) return;
    arrastrando.grupo.position.copy(corte.sub(agarre));
    const objetivo = estado?.camaras.find(c => c.id === arrastrando.id)?.objetivo ?? [0, 0, 20];
    arrastrando.grupo.lookAt(new THREE.Vector3(...aTres(objetivo)));
  });

  function soltar(evento) {
    if (!arrastrando) return;
    const { id, grupo } = arrastrando;
    arrastrando = null;
    orbita.enabled = true;
    render.domElement.releasePointerCapture?.(evento.pointerId);
    alMover?.(id, aPython([grupo.position.x, grupo.position.y, grupo.position.z]));
  }
  render.domElement.addEventListener('pointerup', soltar);
  render.domElement.addEventListener('pointercancel', soltar);

  render.setAnimationLoop(() => {
    const ancho = contenedor.clientWidth || 640;
    const alto = contenedor.clientHeight || 420;
    render.setSize(ancho, alto, false);
    vista.aspect = ancho / alto;
    vista.updateProjectionMatrix();
    orbita.update();
    render.render(escena, vista);
  });

  return {
    actualizar,
    seleccionar,
    get elegida() { return elegida; },
    encuadrar() {
      const centro = estado ? new THREE.Vector3(...aTres(estado.geometria.centro)) : new THREE.Vector3();
      orbita.target.copy(centro);
      vista.position.set(centro.x + 210, 300, centro.z + 300);
      orbita.update();
    },
    imagen() { return render.domElement.toDataURL('image/png'); },
    destruir() {
      render.setAnimationLoop(null);
      orbita.dispose();
      limpiar(montaje); limpiar(camaras);
      render.dispose();
      render.domElement.remove();
    },
  };
}
