/* Portado desde portal.wopecalistenia.com (wope3/assets/arena/arena-pose.js, v4.23) el 28/11/2026. Motor propio de WOPE. */
/* WOPE Arena · contador de repeticiones con la cámara (MediaPipe Pose, gratis, corre en el navegador). */
(function () {
	'use strict';
	var VER = '0.10.21';
	var BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' + VER;
	var MODELO = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
	var cargando = null, detector = null;

	/** Carga MediaPipe solo cuando hace falta (no pesa en la página hasta el primer uso). */
	function cargar() {
		if (detector) return Promise.resolve(detector);
		if (cargando) return cargando;
		cargando = import(BASE + '/vision_bundle.mjs').then(function (mp) {
			return mp.FilesetResolver.forVisionTasks(BASE + '/wasm').then(function (fs) {
				var op = function (del) { return mp.PoseLandmarker.createFromOptions(fs, { baseOptions: { modelAssetPath: MODELO, delegate: del }, runningMode: 'VIDEO', numPoses: 1 }); };
				return op('GPU').catch(function () { return op('CPU'); });
			});
		}).then(function (d) { detector = d; return d; }).catch(function (e) { cargando = null; throw e; });
		return cargando;
	}

	/* Calibración: los números de cada ejercicio se pueden ajustar desde el escritorio de WordPress. */
	var CAL = (typeof window !== 'undefined' && window.WOPE_POSE_CAL) || {};
	function V(k, n, d) { var c = CAL[k]; return c && c[n] != null && c[n] !== '' ? +c[n] : d; }
	function ang(a, b, c) {
		var ab = Math.atan2(a.y - b.y, a.x - b.x), cb = Math.atan2(c.y - b.y, c.x - b.x);
		var g = Math.abs((ab - cb) * 180 / Math.PI); return g > 180 ? 360 - g : g;
	}
	/* Un punto "se ve" solo si el modelo está bastante seguro. Con 0,5 entraban puntos
   medio inventados y de ahí salían las cuentas fantasma. */
function vis(l, ids) { return ids.every(function (i) { return l[i] && (l[i].visibility == null || l[i].visibility > 0.62); }); }

	/* Cada ejercicio: cómo se ve "abajo/abierto" y "arriba/cerrado". Una repetición = ida y vuelta. */
	/* ---------------------------------------------------------------------------
	 * CÓMO SE CUENTA UNA REPETICIÓN (y por qué así)
	 *
	 * Cada repetición necesita DOS medidas que estén de acuerdo:
	 *
	 *  1) El RECORRIDO: cuánto se movió el cuerpo de verdad, medido contra TU propio
	 *     cuerpo (tu pierna, tu brazo, tu torso, el ancho de tus hombros). Es una
	 *     distancia entre dos puntos que la cámara ve bien, así que no se rompe
	 *     porque te pongas de frente, de lado o más lejos. Esta es la que manda:
	 *     define la profundidad de la repetición.
	 *
	 *  2) El CIERRE: cuántos grados se cerró la articulación respecto de TU postura
	 *     de reposo. No es un ángulo fijo, es un cambio: por eso funciona desde
	 *     cualquier ángulo de cámara. Antes se usaba el ángulo absoluto y eso estaba
	 *     mal: una sentadilla completa vista de frente proyecta unos 128°, no 90°,
	 *     porque la pierna se ve acortada. Con el ángulo fijo en 100° no contaba
	 *     nunca de frente, y lo que la hacía contar era el ruido del modelo.
	 *     El cierre es la segunda opinión: su trabajo es vetar lo que no es un
	 *     movimiento (un temblor, un punto mal detectado), no definir la profundidad.
	 *
	 * Las dos juntas sacan las repeticiones fantasma y hacen mucho más difícil la
	 * trampa: doblar el codo sin bajar el pecho, o estirar el cuello en vez de subir
	 * en la dominada, ya no cuentan.
	 *
	 * Tu reposo se aprende solo mientras estás quieto en la postura de descanso, y se
	 * borra si te vas de cámara.
	 * ------------------------------------------------------------------------- */

	/* Guarda una medida tuya de referencia y la sigue despacio. modo: 'suave' | 'max' | 'min'. */
	function fija(st, k, v, modo) {
		if (!st.R) st.R = {};
		var a = st.R[k];
		if (a == null || !isFinite(a)) { st.R[k] = v; return v; }
		if (modo === 'max') st.R[k] = Math.max(a, v);
		else if (modo === 'min') st.R[k] = Math.min(a, v);
		else st.R[k] = a + (v - a) * 0.2;
		return st.R[k];
	}
	function rf(st, k) { return st.R ? st.R[k] : null; }
	/* El ancla de tu postura de reposo. Baja rápido (encontró un reposo mejor) y sube
	   muy despacio (te moviste de sitio). Con un promedio normal, los primeros cuadros
	   de cada bajada se llevaban el ancla con ellos: a la tercera repetición la
	   referencia ya estaba más abajo y el recorrido medido salía corto. Pasaba de
	   verdad: en la prueba contaba 1 de 4 sentadillas profundas. */
	function ancla(st, k, v) {
		if (!st.R) st.R = {};
		var a = st.R[k];
		if (a == null || !isFinite(a)) { st.R[k] = v; return v; }
		st.R[k] = a + (v - a) * (v < a ? 0.35 : 0.02);
		return st.R[k];
	}
	function prom(a, b) { return (a + b) / 2; }

	/**
	 * El motor común de casi todos los ejercicios.
	 * pos y art tienen que CRECER durante la repetición (si una articulación se
	 * cierra, se pasa el ángulo en negativo). esc es la medida de tu cuerpo con la
	 * que se compara el recorrido.
	 */
	function ciclo(st, k, pos, esc, art, dRec, dCierre) {
		var A = fija(st, 'ang', art, 'min');
		var cierre = V(k, 'cierre', dCierre), abierto = art - A;
		if (abierto < cierre * 0.25) { ancla(st, 'pos', pos); fija(st, 'esc', esc, 'max'); }
		var P0 = rf(st, 'pos'), E = rf(st, 'esc');
		if (P0 == null || !E) return null;
		var rec = (pos - P0) / E, u = V(k, 'recorrido', dRec);
		if (rec > u && abierto > cierre) return 'b';
		if (rec < u * 0.35 && abierto < cierre * 0.35) return 'a';
		return null;
	}
	/** Lo que mide el calibrador: recorrido y cierre de esta postura contra la de reposo. */
	function medCiclo(pos, esc, art, r, posR, escR, artR) {
		var o = { recorrido: 0, cierre: 0 };
		if (r) { o.recorrido = escR ? (pos - posR) / escR : 0; o.cierre = art - artR; }
		return o;
	}

	/* ---- PERSPECTIVA OBLIGATORIA ----------------------------------------------
	 * MediaPipe no ve igual desde todos lados. De frente, una pierna o un brazo que
	 * apunta hacia la cámara se ve acortado y el ángulo que calcula no es el real
	 * (una sentadilla completa vista de frente proyecta unos 128°, no 90°); de
	 * perfil, la mitad del cuerpo queda tapada y los puntos de atrás se los inventa.
	 * Cada ejercicio tiene una perspectiva donde su movimiento se lee bien, y ahí hay
	 * que ponerse: si la cámara no está donde debe, el contador NO cuenta y te dice
	 * cómo girarte. Es mejor pedirte que te muevas medio metro que sumarte
	 * repeticiones que no hiciste.
	 *
	 * Cómo se mide el giro: MediaPipe entrega también la profundidad (z) de cada
	 * punto, en la misma escala que x. Con la línea de los hombros y la de las
	 * caderas en el plano x-z sale directamente cuántos grados estás girado: 0° de
	 * frente, 90° de perfil. Eso no depende de la complexión de cada uno, que es el
	 * problema de medir solo el ancho de hombros: alguien de espalda ancha visto en
	 * diagonal mide igual que alguien delgado visto de frente.
	 *
	 * Si el modelo no da z (algún navegador viejo), se cae al cociente ancho de
	 * hombros / largo de torso, que no distingue complexiones: ahí se usa solo como
	 * filtro grueso, con ventanas anchas, para no bloquear a nadie por su cuerpo.
	 * ------------------------------------------------------------------------- */
	function giroCuerpo(l) {
		if (!l[11] || !l[12]) return null;
		if (l[11].z != null && l[12].z != null) {
			var g = 0, n = 0, par = [[11, 12], [23, 24]];
			for (var i = 0; i < par.length; i++) {
				var a = l[par[i][0]], b = l[par[i][1]];
				if (!a || !b || a.z == null || Math.abs(a.x - b.x) + Math.abs(a.z - b.z) < 0.02) continue;
				var d = Math.abs(Math.atan2(a.z - b.z, a.x - b.x) * 180 / Math.PI);
				g += d > 90 ? 180 - d : d; n++;
			}
			if (n) return { grados: g / n };
		}
		var torso = l[23] && l[24] ? Math.hypot(prom(l[11].x, l[12].x) - prom(l[23].x, l[24].x), prom(l[11].y, l[12].y) - prom(l[23].y, l[24].y)) : 0;
		if (torso < 0.04) return null;
		return { razon: Math.hypot(l[11].x - l[12].x, l[11].y - l[12].y) / torso };
	}
	var VISTAS = {
		frente: { max: 32, razMin: 0.5, msg: 'Ponte de frente a la cámara: tienen que verse tus dos hombros' },
		diagonal: { min: 24, max: 66, razMin: 0.28, razMax: 0.82, msg: 'Gírate hasta quedar en diagonal, como a 45° de la cámara: así se ve cuánto bajas y la cámara no se confunde con las piernas' },
		lado: { min: 58, razMax: 0.36, msg: 'Ponte de perfil a la cámara, bien de lado' }
	};
	/* null si la perspectiva está bien, o el aviso de qué corregir. La ventana se
	   ensancha un poco una vez aceptada para que el aviso no parpadee. */
	function vistaMal(R, l, ok) {
		if (!R.vista) return null;
		if (typeof R.vista === 'function') return R.vista(l);
		var V2 = VISTAS[R.vista]; if (!V2) return null;
		var g = giroCuerpo(l);
		if (!g) return 'Aléjate un poco: que se vean tus hombros y tus caderas';
		if (g.grados != null) {
			var h = ok ? 7 : 0;
			if (V2.min != null && g.grados < V2.min - h) return V2.msg;
			if (V2.max != null && g.grados > V2.max + h) return V2.msg;
			return null;
		}
		var r = ok ? 0.07 : 0;
		if (V2.razMin != null && g.razon < V2.razMin - r) return V2.msg;
		if (V2.razMax != null && g.razon > V2.razMax + r) return V2.msg;
		return null;
	}
	var REGLAS = {
		/* SENTADILLA — recorrido: cuánto baja la cadera contra el largo de tu pierna.
		   Cierre: cuánto se dobló la rodilla respecto de estar de pie, con el PROMEDIO
		   de las dos piernas (antes se usaba el mínimo: una pierna mal detectada un
		   cuadro y ya contaba una repetición que nadie hizo). */
		sentadilla: { pide: [23, 24, 25, 26, 27, 28], vista: 'diagonal', libre3: true, min: 0.55, grupo: 'piernas',
		fase: function (l, st) { return hay3(l) ? cucl3(l, st, 'sentadilla', 0.28, 65, 0.14) : cucl(l, st, 'sentadilla', 0.32, 35); },
		med: function (l, s, r) { return medCucl(l, r); },
		msg: 'De cuerpo entero, de la cabeza a los pies. Te leo de frente, de lado o en diagonal (en diagonal, mejor)' },

		/* MEDIA SENTADILLA — la misma medida pidiendo la mitad de recorrido. No es una
		   sentadilla "incompleta": es el primer escalón, y para mucha gente es la
		   sentadilla correcta hasta que gane movilidad de tobillo y de cadera. */
		sentadillamedia: { pide: [23, 24, 25, 26, 27, 28], vista: 'diagonal', libre3: true, min: 0.5, grupo: 'piernas',
		fase: function (l, st) { return hay3(l) ? cucl3(l, st, 'sentadillamedia', 0.10, 25, 0.06) : cucl(l, st, 'sentadillamedia', 0.15, 14); },
		med: function (l, s, r) { return medCucl(l, r); },
		msg: 'En diagonal a la cámara (unos 45°) y de cuerpo entero: baja hasta donde te sientas firme' },

		/* SENTADILLA A UNA PIERNA (pistol) — un pie claramente despegado, y la cadera
		   baja contra la pierna que sostiene. */
		pistol: { pide: [23, 24, 25, 26, 27, 28], vista: 'diagonal', libre3: true, min: 1.0, grupo: 'piernas', fase: function (l, st) {
			if (hay3(l)) return pistol3(l, st);
			var a = unaPierna(l);
			if (a.pierna > 0.05) fija(st, 'larga', a.pierna, 'max');
			var P = rf(st, 'larga');
			if (!P) return null;
			if (a.libre.y > a.tob.y - P * V('pistol', 'pie', 0.12)) return null; // los dos pies en el suelo
			return ciclo(st, 'pistol', a.cad.y, P, -ang(a.cad, a.rod, a.tob), 0.42, 45);
		}, med: function (l, s, r) {
			var a = unaPierna(l), o = { recorrido: 0, cierre: 0, pie: 0 };
			if (r) {
				var b = unaPierna(r), P = b.pierna || 0.3;
				o.recorrido = (a.cad.y - b.cad.y) / P;
				o.cierre = ang(b.cad, b.rod, b.tob) - ang(a.cad, a.rod, a.tob);
				o.pie = Math.abs(a.libre.y - a.tob.y) / P;
			}
			return o;
		}, msg: 'De cuerpo entero, con la pierna libre adelante. Te leo de frente, de lado o en diagonal' },

		tijera: { pide: [0, 11, 12, 15, 16, 27, 28], vista: 'frente', grupo: 'cardio', fase: function (l) {
			var hombros = Math.abs(l[11].x - l[12].x) || 0.1, pies = Math.abs(l[27].x - l[28].x);
			var arriba = l[15].y < l[0].y && l[16].y < l[0].y, abajo = l[15].y > l[11].y && l[16].y > l[12].y;
			if (arriba && pies > hombros * V('tijera', 'abierto', 1.4)) return 'b';
			if (abajo && pies < hombros * V('tijera', 'cerrado', 1.15)) return 'a';
			return null;
		}, med: function (l) { var h = Math.abs(l[11].x - l[12].x) || 0.1; return { abierto: Math.abs(l[27].x - l[28].x) / h, cerrado: Math.abs(l[27].x - l[28].x) / h }; },
		msg: 'De frente a la cámara y un poco lejos: brazos y pies tienen que verse' },

		rodillas: { pide: [23, 24, 25, 26], vista: 'frente', lado: true, min: 0.3, grupo: 'core', fase: function (l, st) {
			var muslo = prom(Math.abs(l[23].y - l[25].y), Math.abs(l[24].y - l[26].y)) || 0.15;
			var izq = l[25].y < l[23].y + 0.02 && l[26].y > l[24].y + muslo * 0.4, der = l[26].y < l[24].y + 0.02 && l[25].y > l[23].y + muslo * 0.4;
			if (!izq && !der) { st.neutro = true; return null; }
			if (!st.neutro) return null; // la rodilla tiene que bajar antes de contar la otra
			if (izq && st.ult !== 'i') { st.ult = 'i'; st.neutro = false; return 'cuenta'; }
			if (der && st.ult !== 'd') { st.ult = 'd'; st.neutro = false; return 'cuenta'; }
			return null;
		}, msg: 'De frente a la cámara: que se vean tus caderas y rodillas' },

		brazos: { pide: [0, 11, 12, 15, 16], vista: 'frente', grupo: 'movilidad', fase: function (l) {
			if (l[15].y < l[0].y && l[16].y < l[0].y) return 'b';
			if (l[15].y > l[11].y && l[16].y > l[12].y) return 'a';
			return null;
		}, msg: 'De frente a la cámara: que se vean tu cara y tus brazos' },

		/* ---- ejercicios de WOPE Parque ---- */
		/* SALTO — recorrido: los dos pies se despegan del suelo que aprendió la cámara,
		   y la cadera sube con ellos. Segunda opinión: antes hubo flexión de rodilla. */
		salto: { pide: [23, 24, 25, 26, 27, 28], vista: 'frente', min: 0.5, grupo: 'cardio', fase: function (l, st) {
			var k = prom(ang(l[23], l[25], l[27]), ang(l[24], l[26], l[28]));
			var pie = Math.max(l[27].y, l[28].y), cad = prom(l[23].y, l[24].y), pierna = Math.abs(cad - pie);
			var A = fija(st, 'ang', -k, 'min');
			if (-k - A < V('salto', 'cierre', 25) * 0.25) { ancla(st, 'piso', -pie); ancla(st, 'cadera', -cad); fija(st, 'esc', pierna, 'max'); }
			if (-k - A > V('salto', 'cierre', 25)) return 'b';
			var P = rf(st, 'esc'), piso = -rf(st, 'piso'), c0 = -rf(st, 'cadera');
			if (!isFinite(piso) || !P) return null;
			var h = V('salto', 'altura', 0.1);
			if (pie < piso - P * h && cad < c0 - P * h * 0.6) return 'a';
			return null;
		}, med: function (l, s, r) {
			var k = prom(ang(l[23], l[25], l[27]), ang(l[24], l[26], l[28])), o = { cierre: 0, altura: 0 };
			if (r && r[27]) {
				var piso = Math.max(r[27].y, r[28].y), pierna = Math.abs(prom(r[23].y, r[24].y) - piso) || 0.3;
				o.altura = (piso - Math.max(l[27].y, l[28].y)) / pierna;
				o.cierre = prom(ang(r[23], r[25], r[27]), ang(r[24], r[26], r[28])) - k;
			}
			return o;
		}, msg: 'De frente a la cámara y de cuerpo entero: agáchate y salta' },

		/* ESTOCADA — recorrido: la cadera baja contra tu pierna. Cierre: la rodilla de
		   adelante. Filtro: los pies separados, si no es una sentadilla. */
		estocada: { pide: [23, 24, 25, 26, 27, 28], vista: 'diagonal', libre3: true, min: 0.8, grupo: 'piernas', fase: function (l, st) {
			if (hay3(l)) return estocada3(l, st);
			var sep = Math.abs(l[25].y - l[26].y), muslo = Math.abs(l[23].y - l[25].y) || 0.15;
			var k = Math.min(ang(l[23], l[25], l[27]), ang(l[24], l[26], l[28]));
			var cad = prom(l[23].y, l[24].y), pierna = Math.abs(prom(l[27].y, l[28].y) - cad);
			var f = ciclo(st, 'estocada', cad, pierna, -k, 0.2, 30);
			if (f === 'b' && sep < muslo * V('estocada', 'separacion', 0.35)) return null;
			return f;
		}, med: function (l, s, r) {
			var k = Math.min(ang(l[23], l[25], l[27]), ang(l[24], l[26], l[28]));
			var cad = prom(l[23].y, l[24].y), o = { recorrido: 0, cierre: 0, separacion: Math.abs(l[25].y - l[26].y) / (Math.abs(l[23].y - l[25].y) || 0.15) };
			if (r && r[23]) {
				var cadR = prom(r[23].y, r[24].y), P = Math.abs(prom(r[27].y, r[28].y) - cadR) || 0.3;
				o.recorrido = (cad - cadR) / P;
				o.cierre = Math.min(ang(r[23], r[25], r[27]), ang(r[24], r[26], r[28])) - k;
			}
			return o;
		}, msg: 'De cuerpo entero (en diagonal se lee mejor, pero también de frente o de lado): paso largo y rodilla de atrás abajo' },

		/* FLEXIÓN — recorrido: cuánto BAJA EL HOMBRO hacia el suelo, contra el largo de
		   tu brazo. Cierre: el codo. Y un filtro de forma: del hombro a la rodilla tienes
		   que estar recto, así que la cadera levantada —el truco de siempre— no cuenta.
		   Las flexiones de rodillas sí cuentan. */
		flexion: { pide: [11, 13, 15, 23, 27], vista: 'lado', lado: true, libre3: true, cuerpo3: [0, 11, 12, 15, 16, 23, 24, 27, 28], min: 0.7, grupo: 'empuje', fase: function (l, st, s) {
			if (hay3e(l)) return empuje3(l, st, 'flexion', { forma: 'horiz', min: 0, max: 35, recto: 148, rec: 0.3, cierre: 60, d2: 0.12 });
			if (!horizontal(l, s, V('flexion', 'tumbado', 35))) return null;
			if (ang(l[s.h], l[s.c2], l[s.k]) < V('flexion', 'recto', 148)) return null;
			return ciclo(st, 'flexion', -(l[s.m].y - l[s.h].y), dist(l[s.h], l[s.m]), -ang(l[s.h], l[s.c], l[s.m]), 0.3, 40);
		}, med: function (l, s, r) {
			var o = { recorrido: 0, cierre: 0, tumbado: inclinacion(l, s), recto: ang(l[s.h], l[s.c2], l[s.k]) };
			if (r && r[s.m]) {
				var brazo = dist(r[s.h], r[s.m]) || 0.25;
				o.recorrido = ((r[s.m].y - r[s.h].y) - (l[s.m].y - l[s.h].y)) / brazo;
				o.cierre = ang(r[s.h], r[s.c], r[s.m]) - ang(l[s.h], l[s.c], l[s.m]);
			}
			return o;
		}, msg: 'Teléfono en el suelo a unos 2 metros, que se vea tu cuerpo entero. De lado se lee mejor, pero también de frente o en diagonal' },

		/* FLEXIÓN EN PARED — de pie, manos en la pared. Recorrido: el hombro se acerca a
		   la mano en horizontal, contra el largo de tu brazo. Cierre: el codo. */
		flexpared: { pide: [11, 13, 15, 23, 27], vista: 'lado', lado: true, min: 0.6, grupo: 'empuje', fase: function (l, st, s) {
			if (inclinacion(l, s) < V('flexpared', 'depie', 55)) return null;
			if (l[s.m].y > l[s.c2].y) return null; // las manos arriba, en la pared
			return ciclo(st, 'flexpared', -Math.abs(l[s.m].x - l[s.h].x), dist(l[s.h], l[s.m]), -ang(l[s.h], l[s.c], l[s.m]), 0.25, 25);
		}, med: function (l, s, r) {
			var o = { recorrido: 0, cierre: 0, depie: inclinacion(l, s) };
			if (r && r[s.m]) {
				var brazo = dist(r[s.h], r[s.m]) || 0.25;
				o.recorrido = (Math.abs(r[s.m].x - r[s.h].x) - Math.abs(l[s.m].x - l[s.h].x)) / brazo;
				o.cierre = ang(r[s.h], r[s.c], r[s.m]) - ang(l[s.h], l[s.c], l[s.m]);
			}
			return o;
		}, msg: 'De perfil a la cámara, de pie frente a la pared con las manos a la altura del pecho' },

		/* FLEXIÓN EN BANCO — manos en un banco o mesa, cuerpo inclinado y recto. Como la flexión,
		   pero el cuerpo no está horizontal (entre 34° y 62° contra el piso: más inclinado que una flexión del piso, que ronda los 25°) y las manos quedan más
		   abajo que el hombro. Recorrido: cuánto baja el hombro contra el largo del brazo. Cierre: el codo. */
		flexbanco: { pide: [11, 13, 15, 23, 27], vista: 'lado', lado: true, libre3: true, cuerpo3: [0, 11, 12, 15, 16, 23, 24, 27, 28], min: 0.65, grupo: 'empuje', fase: function (l, st, s) {
			if (hay3e(l)) return empuje3(l, st, 'flexbanco', { forma: 'horiz', min: 30, max: 65, recto: 148, manosAbajo: true, rec: 0.25, cierre: 50, d2: 0.1 });
			var a = inclinacion(l, s);
			if (a < V('flexbanco', 'min', 34) || a > V('flexbanco', 'max', 62)) return null;
			if (ang(l[s.h], l[s.c2], l[s.k]) < V('flexbanco', 'recto', 148)) return null;
			if (l[s.m].y < l[s.h].y) return null; // las manos en el banco, más abajo que el hombro
			return ciclo(st, 'flexbanco', -(l[s.m].y - l[s.h].y), dist(l[s.h], l[s.m]), -ang(l[s.h], l[s.c], l[s.m]), 0.25, 40);
		}, med: function (l, s, r) {
			var a = inclinacion(l, s), o = { recorrido: 0, cierre: 0, min: a, max: a, recto: ang(l[s.h], l[s.c2], l[s.k]) };
			if (r && r[s.m]) {
				var brazo = dist(r[s.h], r[s.m]) || 0.25;
				o.recorrido = ((r[s.m].y - r[s.h].y) - (l[s.m].y - l[s.h].y)) / brazo;
				o.cierre = ang(r[s.h], r[s.c], r[s.m]) - ang(l[s.h], l[s.c], l[s.m]);
			}
			return o;
		}, msg: 'De perfil a la cámara, manos en el banco o la mesa: que se vea tu cuerpo entero' },

		/* FONDO — recorrido: el hombro baja respecto de la mano, que está quieta en la
		   barra, contra el largo de tu brazo. Cierre: el codo. */
		fondo: { pide: [11, 13, 15, 23], vista: 'lado', lado: true, libre3: true, cuerpo3: [0, 11, 12, 13, 14, 15, 16, 23, 24], min: 0.8, grupo: 'empuje', fase: function (l, st, s) {
			if (hay3e(l)) return empuje3(l, st, 'fondo', { forma: 'vert', min: 50, max: 90, manosAbajo: true, rec: 0.2, cierre: 45, d2: 0.1 });
			if (horizontal(l, s, V('fondo', 'vertical', 50)) || l[s.m].y < l[s.h].y) return null;
			return ciclo(st, 'fondo', -(l[s.m].y - l[s.h].y), dist(l[s.h], l[s.m]), -ang(l[s.h], l[s.c], l[s.m]), 0.3, 25);
		}, med: function (l, s, r) {
			var o = { recorrido: 0, cierre: 0, vertical: inclinacion(l, s) };
			if (r && r[s.m]) {
				var brazo = dist(r[s.h], r[s.m]) || 0.25;
				o.recorrido = ((r[s.m].y - r[s.h].y) - (l[s.m].y - l[s.h].y)) / brazo;
				o.cierre = ang(r[s.h], r[s.c], r[s.m]) - ang(l[s.h], l[s.c], l[s.m]);
			}
			return o;
		}, msg: 'De perfil a la cámara: que se vean tu hombro, codo y mano' },

		/* REMO / AUSTRALIANA — recorrido: cuánto se acerca el hombro a la mano (que está
		   en la barra), contra el largo de tu torso. Son dos puntos bien vistos, mucho
		   más firme que un ángulo. Cierre: el codo. */
		remo: { pide: [11, 13, 15, 23, 27], vista: 'lado', lado: true, libre3: true, cuerpo3: [11, 12, 15, 16, 23, 24, 27, 28], min: 0.8, grupo: 'traccion', fase: function (l, st, s) {
			if (hay3e(l)) return remo3(l, st);
			var a = inclinacion(l, s);
			if (a < V('remo', 'minInclin', 8) || a > V('remo', 'maxInclin', 60) || l[s.m].y > l[s.h].y + 0.02) return null;
			return ciclo(st, 'remo', -dist(l[s.h], l[s.m]), dist(l[s.h], l[s.c2]), -ang(l[s.h], l[s.c], l[s.m]), 0.33, 35);
		}, med: function (l, s, r) {
			var o = { recorrido: 0, cierre: 0, minInclin: inclinacion(l, s), maxInclin: inclinacion(l, s) };
			if (r && r[s.m]) {
				var torso = dist(r[s.h], r[s.c2]) || 0.3;
				o.recorrido = (dist(r[s.h], r[s.m]) - dist(l[s.h], l[s.m])) / torso;
				o.cierre = ang(r[s.h], r[s.c], r[s.m]) - ang(l[s.h], l[s.c], l[s.m]);
			}
			return o;
		}, msg: 'Bajo la barra, que se vea tu cuerpo entero. De lado se lee mejor, pero también en diagonal' },

		/* DOMINADA — recorrido: cuánto SUBEN LOS HOMBROS hacia las manos, contra el ancho
		   de tus hombros. Antes se miraba si el mentón pasaba las manos, y eso se hacía
		   estirando el cuello sin subir: ahora el cuello no cuenta para nada. Cierre: los
		   codos, promediados entre los dos brazos. */
		dominada: { pide: [11, 12, 13, 14, 15, 16], vistaN: 'como quieras: de frente, en diagonal o de lado', libre3: true, cuerpo3: [11, 12, 13, 14, 15, 16], min: 1.0, grupo: 'traccion',
		/* Sin puntos 3D, la perspectiva se mide con los hombros y las manos (las caderas
		   suelen quedar fuera de cuadro): de costado las dos manos se superponen. */
		vista: function (l) {
			var anc = Math.abs(l[11].x - l[12].x), manos = Math.abs(l[15].x - l[16].x);
			if (anc < 0.05) return 'Pon el teléfono justo de frente a la barra: tienen que verse tus dos hombros';
			if (manos < anc * 0.5) return 'Pon el teléfono de frente a la barra, no de costado: tienen que verse tus dos manos separadas';
			return null;
		}, fase: function (l, st) {
			if (hay3b(l)) return dominada3(l, st);
			var mano = prom(l[15].y, l[16].y);
			if (mano > l[11].y || mano > l[12].y) return null; // no está colgado
			var c = prom(ang(l[11], l[13], l[15]), ang(l[12], l[14], l[16]));
			return ciclo(st, 'dominada', mano - prom(l[11].y, l[12].y), Math.abs(l[11].x - l[12].x), -c, 0.7, 40);
		}, med: function (l, s, r) {
			var c = prom(ang(l[11], l[13], l[15]), ang(l[12], l[14], l[16])), o = { recorrido: 0, cierre: 0 };
			if (r && r[15]) {
				var anc = Math.abs(r[11].x - r[12].x) || 0.12;
				o.recorrido = ((prom(r[11].y, r[12].y) - prom(r[15].y, r[16].y)) - (prom(l[11].y, l[12].y) - prom(l[15].y, l[16].y))) / anc;
				o.cierre = prom(ang(r[11], r[13], r[15]), ang(r[12], r[14], r[16])) - c;
			}
			return o;
		}, msg: 'Apoya el teléfono donde quieras: que se vean tus dos brazos y tus manos en la barra' },

		escalador: { pide: [11, 23, 25, 27], vista: 'lado', lado: true, min: 0.3, grupo: 'cardio', fase: function (l, st) {
			var s = ladoDe(l);
			if (inclinacion(l, s) > V('escalador', 'tumbado', 40)) return null;
			var ri = ang(l[11], l[23], l[25]) < V('escalador', 'rodilla', 110), rd = ang(l[12], l[24], l[26]) < V('escalador', 'rodilla', 110);
			if (ri === rd) { st.neutro = true; return null; }
			if (!st.neutro) return null;
			if (ri && st.ult !== 'i') { st.ult = 'i'; st.neutro = false; return 'cuenta'; }
			if (rd && st.ult !== 'd') { st.ult = 'd'; st.neutro = false; return 'cuenta'; }
			return null;
		}, med: function (l) { var s = ladoDe(l); return { tumbado: inclinacion(l, s), rodilla: Math.min(ang(l[11], l[23], l[25]), ang(l[12], l[24], l[26])) }; },
		msg: 'De perfil a la cámara, en posición de plancha alta' },

		abdpie: { pide: [11, 12, 13, 14, 25, 26], vista: 'frente', min: 0.7, grupo: 'core', fase: function (l, st) {
			var esc = Math.abs(l[11].x - l[12].x) || 0.1;
			var a = dist(l[13], l[26]) < esc * 0.8, b = dist(l[14], l[25]) < esc * 0.8;
			if (dist(l[13], l[26]) > esc * 1.4 && dist(l[14], l[25]) > esc * 1.4) { st.neutro = true; return null; }
			if (!st.neutro) return null;
			if (a && st.ult !== 'a') { st.ult = 'a'; st.neutro = false; return 'cuenta'; }
			if (b && st.ult !== 'b') { st.ult = 'b'; st.neutro = false; return 'cuenta'; }
			return null;
		}, msg: 'De frente a la cámara: lleva el codo a la rodilla contraria' },

		/* ABDOMINAL CORTO — recorrido: el hombro se acerca a la rodilla, contra tu torso.
		   Cierre: cuánto se levantó el torso del suelo (aquí el ángulo ABRE al subir, así
		   que entra con el signo al revés). */
		crunch: { pide: [11, 23, 25], vista: 'lado', lado: true, min: 0.6, grupo: 'core', fase: function (l, st, s) {
			if (Math.abs(l[s.c2].y - l[s.r].y) > 0.35) return null; // no está acostado
			var t = Math.atan2(Math.abs(l[s.h].y - l[s.c2].y), Math.abs(l[s.h].x - l[s.c2].x) || 0.001) * 180 / Math.PI;
			return ciclo(st, 'crunch', -dist(l[s.h], l[s.k]), dist(l[s.h], l[s.c2]), t, 0.16, 12);
		}, med: function (l, s, r) {
			var t = function (x, y) { return Math.atan2(Math.abs(x.y - y.y), Math.abs(x.x - y.x) || 0.001) * 180 / Math.PI; };
			var o = { recorrido: 0, cierre: 0 };
			if (r && r[s.k]) {
				var torso = dist(r[s.h], r[s.c2]) || 0.3;
				o.recorrido = (dist(r[s.h], r[s.k]) - dist(l[s.h], l[s.k])) / torso;
				o.cierre = t(l[s.h], l[s.c2]) - t(r[s.h], r[s.c2]);
			}
			return o;
		}, msg: 'Acostado y de perfil a la cámara, rodillas dobladas' },

		/* ELEVACIÓN DE PIERNAS — recorrido: cuánto suben los tobillos contra el largo de
		   tu pierna. Cierre: el ángulo de la cadera. Reemplaza al abdominal corto cuando
		   ya tienes nivel: más trabajo con menos repeticiones. */
		piernas: { pide: [11, 23, 25, 27], vista: 'lado', lado: true, min: 0.9, grupo: 'core', fase: function (l, st, s) {
			if (Math.abs(l[s.h].y - l[s.c2].y) > V('piernas', 'suelo', 0.22)) return null; // tronco en el suelo
			return ciclo(st, 'piernas', -l[s.r].y, dist(l[s.c2], l[s.r]), -ang(l[s.h], l[s.c2], l[s.r]), 0.5, 35);
		}, med: function (l, s, r) {
			var o = { recorrido: 0, cierre: 0, suelo: Math.abs(l[s.h].y - l[s.c2].y) };
			if (r && r[s.r]) {
				var P = dist(r[s.c2], r[s.r]) || 0.3;
				o.recorrido = (r[s.r].y - l[s.r].y) / P;
				o.cierre = ang(r[s.h], r[s.c2], r[s.r]) - ang(l[s.h], l[s.c2], l[s.r]);
			}
			return o;
		}, msg: 'Acostado y de perfil a la cámara, piernas estiradas' },

		/* BURPEE — el cuerpo pasa de horizontal en el suelo a vertical de pie, y la cadera
		   baja de verdad y vuelve a su alto de pie. */
		burpee: { pide: [11, 23, 27], vista: 'lado', lado: true, min: 1.2, grupo: 'cardio', fase: function (l, st, s) {
			var inc = inclinacion(l, s), cad = l[s.c2].y, pierna = dist(l[s.c2], l[s.r]);
			if (inc > V('burpee', 'depie', 70)) { ancla(st, 'pos', cad); fija(st, 'esc', pierna, 'max'); }
			var A = rf(st, 'pos'), P = rf(st, 'esc');
			if (horizontal(l, s, V('burpee', 'suelo', 30)) && (A == null || !P || (cad - A) / P > V('burpee', 'recorrido', 0.35))) return 'b';
			if (inc > V('burpee', 'depie', 70) && ang(l[s.h], l[s.c2], l[s.r]) > 150) return 'a';
			return null;
		}, med: function (l, s, r) {
			var o = { suelo: inclinacion(l, s), depie: inclinacion(l, s), recorrido: 0 };
			if (r && r[s.c2]) { var P = dist(r[s.c2], r[s.r]) || 0.3; o.recorrido = (l[s.c2].y - r[s.c2].y) / P; }
			return o;
		}, msg: 'De perfil a la cámara y de cuerpo entero' },

		trote: { pide: [23, 24, 25, 26], vista: 'frente', min: 0.28, grupo: 'cardio', fase: function (l, st) {
			// una rodilla arriba, vuelta al centro, la otra arriba: así el temblor de la cámara no suma
			var muslo = prom(Math.abs(l[23].y - l[25].y), Math.abs(l[24].y - l[26].y)) || 0.15, d = l[25].y - l[26].y;
			if (Math.abs(d) < muslo * V('trote', 'centro', 0.12)) { st.neutro = true; return null; }
			if (!st.neutro) return null;
			if (d < -muslo * V('trote', 'rodilla', 0.35) && st.ult !== 'i') { st.ult = 'i'; st.neutro = false; return 'cuenta'; }
			if (d > muslo * V('trote', 'rodilla', 0.35) && st.ult !== 'd') { st.ult = 'd'; st.neutro = false; return 'cuenta'; }
			return null;
		}, med: function (l) { var muslo = prom(Math.abs(l[23].y - l[25].y), Math.abs(l[24].y - l[26].y)) || 0.15; return { centro: Math.abs(l[25].y - l[26].y) / muslo, rodilla: Math.abs(l[25].y - l[26].y) / muslo }; },
		msg: 'De frente a la cámara: que se vean tus caderas y rodillas' },

		/* BISAGRA DE CADERA — recorrido: la cadera se va hacia atrás, contra tu pierna.
		   Cierre: cuánto se inclinó el torso respecto de estar de pie (dos puntos, firme).
		   Filtro: las rodillas casi estiradas; si se doblan es una sentadilla. */
		bisagra: { pide: [11, 23, 25, 27], vista: 'lado', lado: true, min: 1.0, grupo: 'piernas', fase: function (l, st, s) {
			if (ang(l[s.c2], l[s.k], l[s.r]) < V('bisagra', 'rodillas', 130)) return null;
			var t = Math.atan2(Math.abs(l[s.h].y - l[s.c2].y), Math.abs(l[s.h].x - l[s.c2].x) || 0.001) * 180 / Math.PI;
			return ciclo(st, 'bisagra', Math.abs(l[s.c2].x - l[s.r].x), dist(l[s.c2], l[s.r]), -t, 0.1, 30);
		}, med: function (l, s, r) {
			var t = function (x, y) { return Math.atan2(Math.abs(x.y - y.y), Math.abs(x.x - y.x) || 0.001) * 180 / Math.PI; };
			var o = { recorrido: 0, cierre: 0, rodillas: ang(l[s.c2], l[s.k], l[s.r]) };
			if (r && r[s.c2]) {
				var P = dist(r[s.c2], r[s.r]) || 0.3;
				o.recorrido = (Math.abs(l[s.c2].x - l[s.r].x) - Math.abs(r[s.c2].x - r[s.r].x)) / P;
				o.cierre = t(r[s.h], r[s.c2]) - t(l[s.h], l[s.c2]);
			}
			return o;
		}, msg: 'De perfil a la cámara: cadera atrás y espalda recta' },
		/* ---- ejercicios de los niveles altos --------------------------------------
		 * Los eligió la Lista maestra UNIBARS, y solo entraron los que la cámara
		 * puede verificar sin inventar: cada uno tiene un recorrido grande e
		 * inconfundible. Un ejercicio que no se puede comprobar no se agrega. */

		/* SENTADILLA PROFUNDA (Guerrero) — la misma medida, pidiendo pasar bien de la
		   paralela. En tu lista: "por debajo del paralelo". */
		sentadillaprofunda: { pide: [23, 24, 25, 26, 27, 28], vista: 'diagonal', min: 0.6, grupo: 'piernas',
		fase: function (l, st) { return cucl(l, st, 'sentadillaprofunda', 0.45, 65); },
		med: function (l, s, r) { return medCucl(l, r); },
		msg: 'En diagonal a la cámara (unos 45°) y de cuerpo entero: baja todo lo que puedas' },

		/* SENTADILLA BÚLGARA (Guerrero) — el pie de atrás apoyado en alto. Se reconoce
		   por cuánto está elevado: poco, sobre un banco. Si está muy alto y adelante,
		   eso es una pistol, que es otro ejercicio y vale más. */
		bulgara: { pide: [23, 24, 25, 26, 27, 28], vista: 'diagonal', min: 0.9, grupo: 'piernas', fase: function (l, st) {
			var a = unaPierna(l);
			if (a.pierna > 0.05) fija(st, 'larga', a.pierna, 'max');
			var P = rf(st, 'larga'); if (!P) return null;
			var alza = (a.tob.y - a.libre.y) / P;
			if (alza < V('bulgara', 'pie', 0.1) || alza > V('bulgara', 'pieMax', 0.45)) return null;
			return ciclo(st, 'bulgara', a.cad.y, P, -ang(a.cad, a.rod, a.tob), 0.26, 40);
		}, med: function (l, s, r) {
			var a = unaPierna(l), o = { recorrido: 0, cierre: 0, pie: 0, pieMax: 0 };
			if (r) {
				var b2 = unaPierna(r), P = b2.pierna || 0.3;
				o.recorrido = (a.cad.y - b2.cad.y) / P;
				o.cierre = ang(b2.cad, b2.rod, b2.tob) - ang(a.cad, a.rod, a.tob);
				o.pie = o.pieMax = (a.tob.y - a.libre.y) / P;
			}
			return o;
		}, msg: 'En diagonal a la cámara (unos 45°), con el pie de atrás sobre un banco' },

		/* ELEVACIÓN DE PIERNAS EN BARRA (Guerrero) — colgado. Recorrido: cuánto suben
		   los pies contra el largo de tu pierna. Cierre: el ángulo de la cadera. */
		barraspiernas: { pide: [11, 13, 15, 23, 25, 27], lado: true, vista: 'lado', min: 1.0, grupo: 'core', fase: function (l, st, s) {
			if (l[s.m].y > l[s.h].y - 0.02) return null; // tiene que estar colgado
			return ciclo(st, 'barraspiernas', -l[s.r].y, dist(l[s.c2], l[s.r]), -ang(l[s.h], l[s.c2], l[s.r]), 0.55, 45);
		}, med: function (l, s, r) {
			var o = { recorrido: 0, cierre: 0 };
			if (r && r[s.r]) {
				var P = dist(r[s.c2], r[s.r]) || 0.3;
				o.recorrido = (r[s.r].y - l[s.r].y) / P;
				o.cierre = ang(r[s.h], r[s.c2], r[s.r]) - ang(l[s.h], l[s.c2], l[s.r]);
			}
			return o;
		}, msg: 'De perfil a la cámara, colgado de la barra y de cuerpo entero' },

		/* MUSCLE UP (Maestro) — el recorrido más inconfundible de todos: pasas de
		   colgado con los brazos estirados a estar ARRIBA de la barra con los brazos
		   estirados otra vez. Una dominada alta no alcanza, y eso es a propósito. */
		muscleup: { pide: [0, 11, 12, 13, 14, 15, 16], vistaN: 'de frente a la barra', min: 1.5, grupo: 'traccion',
		vista: function (l) {
			var anc = Math.abs(l[11].x - l[12].x), manos = Math.abs(l[15].x - l[16].x);
			if (anc < 0.05) return 'Pon el teléfono justo de frente a la barra: tienen que verse tus dos hombros';
			if (manos < anc * 0.5) return 'Pon el teléfono de frente a la barra, no de costado: tienen que verse tus dos manos separadas';
			return null;
		}, fase: function (l) {
			var mano = prom(l[15].y, l[16].y), hom = prom(l[11].y, l[12].y), anc = Math.abs(l[11].x - l[12].x) || 0.1;
			var c = prom(ang(l[11], l[13], l[15]), ang(l[12], l[14], l[16]));
			if (c < V('muscleup', 'brazos', 148)) return null;
			if (hom < mano - anc * V('muscleup', 'salida', 0.15)) return 'b';
			if (hom > mano + anc * V('muscleup', 'colgado', 0.8)) return 'a';
			return null;
		}, med: function (l) {
			var anc = Math.abs(l[11].x - l[12].x) || 0.1, d = (prom(l[11].y, l[12].y) - prom(l[15].y, l[16].y)) / anc;
			return { brazos: prom(ang(l[11], l[13], l[15]), ang(l[12], l[14], l[16])), salida: -d, colgado: d };
		}, msg: 'Teléfono de frente a la barra: tienen que verse tus manos, tus hombros y la salida de arriba' },

		/* LIMPIAPARABRISAS (Maestro) — colgado, con las piernas arriba, girando de un
		   lado al otro. Cuenta cada pasada completa, con vuelta al centro en el medio:
		   así un balanceo suelto no suma. */
		wipers: { pide: [11, 12, 15, 16, 23, 24, 27, 28], vistaN: 'de frente a la barra', min: 0.8, grupo: 'core',
		vista: function (l) {
			if (Math.abs(l[11].x - l[12].x) < 0.05) return 'Pon el teléfono de frente a la barra: tienen que verse tus dos hombros';
			return null;
		}, fase: function (l, st) {
			var mano = prom(l[15].y, l[16].y), hom = prom(l[11].y, l[12].y), cad = prom(l[23].y, l[24].y);
			if (mano > hom) return null;                                     // colgado
			if (prom(l[27].y, l[28].y) > cad) return null;                   // piernas arriba
			var anc = Math.abs(l[11].x - l[12].x) || 0.1;
			var d = (prom(l[27].x, l[28].x) - prom(l[23].x, l[24].x)) / anc, u = V('wipers', 'giro', 1.1);
			if (Math.abs(d) < u * 0.3) { st.neutro = true; return null; }
			if (!st.neutro) return null;
			if (d < -u && st.ult !== 'i') { st.ult = 'i'; st.neutro = false; return 'cuenta'; }
			if (d > u && st.ult !== 'd') { st.ult = 'd'; st.neutro = false; return 'cuenta'; }
			return null;
		}, med: function (l) {
			var anc = Math.abs(l[11].x - l[12].x) || 0.1;
			return { giro: Math.abs(prom(l[27].x, l[28].x) - prom(l[23].x, l[24].x)) / anc };
		}, msg: 'Teléfono de frente a la barra y de cuerpo entero: colgado, con las piernas arriba' },

		/* FLEXIÓN EN PARADA DE MANOS (Maestro) — boca abajo de verdad: manos abajo,
		   hombros encima, cadera encima de los hombros y pies arriba del todo. */
		hspu: { pide: [11, 13, 15, 23, 27], lado: true, vista: 'lado', min: 1.2, grupo: 'empuje', fase: function (l, st, s) {
			if (!(l[s.m].y > l[s.h].y && l[s.h].y > l[s.c2].y && l[s.c2].y > l[s.r].y)) return null;
			return ciclo(st, 'hspu', -(l[s.m].y - l[s.h].y), dist(l[s.h], l[s.m]), -ang(l[s.h], l[s.c], l[s.m]), 0.28, 45);
		}, med: function (l, s, r) {
			var o = { recorrido: 0, cierre: 0 };
			if (r && r[s.m]) {
				var brazo = dist(r[s.h], r[s.m]) || 0.25;
				o.recorrido = ((r[s.m].y - r[s.h].y) - (l[s.m].y - l[s.h].y)) / brazo;
				o.cierre = ang(r[s.h], r[s.c], r[s.m]) - ang(l[s.h], l[s.c], l[s.m]);
			}
			return o;
		}, msg: 'De perfil a la cámara, en pino contra la pared y de cuerpo entero' },

		/* DOMINADA A UNA MANO (Titán) — una sola mano en la barra: la otra tiene que
		   estar bien abajo. Si las dos agarran, no es a una mano y no cuenta. */
		domunamano: { pide: [0, 11, 12, 13, 14, 15, 16], vistaN: 'de frente a la barra', min: 1.6, grupo: 'traccion',
		vista: function (l) {
			if (Math.abs(l[11].x - l[12].x) < 0.05) return 'Pon el teléfono de frente a la barra: tienen que verse tus dos hombros';
			return null;
		}, fase: function (l, st) {
			var alta = l[15].y < l[16].y ? 15 : 16, baja = alta === 15 ? 16 : 15;
			var homA = alta === 15 ? 11 : 12, codoA = alta === 15 ? 13 : 14;
			var anc = Math.abs(l[11].x - l[12].x) || 0.1;
			if (l[alta].y > l[homA].y) return null;                                        // no está colgado
			if (l[baja].y < l[homA].y + anc * V('domunamano', 'libre', 0.5)) return null;   // la otra mano también agarra
			return ciclo(st, 'domunamano', l[alta].y - prom(l[11].y, l[12].y), anc, -ang(l[homA], l[codoA], l[alta]), 0.6, 40);
		}, med: function (l, s, r) {
			var alta = l[15].y < l[16].y ? 15 : 16, baja = alta === 15 ? 16 : 15;
			var homA = alta === 15 ? 11 : 12, codoA = alta === 15 ? 13 : 14, anc = Math.abs(l[11].x - l[12].x) || 0.1;
			var o = { recorrido: 0, cierre: 0, libre: (l[baja].y - l[homA].y) / anc };
			if (r && r[15]) {
				var ancR = Math.abs(r[11].x - r[12].x) || 0.1;
				o.recorrido = ((r[alta].y - prom(r[11].y, r[12].y)) - (l[alta].y - prom(l[11].y, l[12].y))) / ancR;
				o.cierre = ang(r[homA], r[codoA], r[alta]) - ang(l[homA], l[codoA], l[alta]);
			}
			return o;
		}, msg: 'Teléfono de frente a la barra: una mano en la barra y la otra abajo, a la vista' },
		/* FRONT LEVER (Maestro) — colgado, con el cuerpo horizontal y recto. */
		frontlever: { pide: [11, 13, 15, 23, 27], lado: true, hold: true, en: function (l, s) {
			if (l[s.m].y > l[s.h].y - 0.03) return false;
			var t = Math.atan2(Math.abs(l[s.h].y - l[s.r].y), Math.abs(l[s.h].x - l[s.r].x) || 0.001) * 180 / Math.PI;
			return t < V('frontlever', 'horizontal', 22) && ang(l[s.h], l[s.c2], l[s.r]) > V('frontlever', 'recto', 150);
		}, med: function (l, s) {
			return { horizontal: Math.atan2(Math.abs(l[s.h].y - l[s.r].y), Math.abs(l[s.h].x - l[s.r].x) || 0.001) * 180 / Math.PI, recto: ang(l[s.h], l[s.c2], l[s.r]) };
		}, msg: 'De perfil a la cámara, colgado de la barra y de cuerpo entero', fuera: 'Sube el cuerpo hasta quedar horizontal y recto' },

		/* BANDERA HUMANA (Titán) — las dos manos en el mismo poste vertical, una bien
		   arriba de la otra, y el cuerpo horizontal al costado. */
		bandera: { pide: [11, 12, 15, 16, 23, 24, 27, 28], hold: true, en: function (l) {
			var anc = Math.abs(l[11].x - l[12].x) || 0.1;
			if (Math.abs(l[15].y - l[16].y) < anc * V('bandera', 'manos', 0.9)) return false;
			if (Math.abs(l[15].x - l[16].x) > anc * V('bandera', 'poste', 1.2)) return false;
			var hom = prom(l[11].y, l[12].y), pie = prom(l[27].y, l[28].y), cad = prom(l[23].y, l[24].y);
			var largo = Math.abs(prom(l[11].x, l[12].x) - prom(l[27].x, l[28].x)) || 0.1;
			return Math.abs(pie - hom) < largo * V('bandera', 'horizontal', 0.35) && Math.abs(cad - hom) < largo * 0.35;
		}, med: function (l) {
			var anc = Math.abs(l[11].x - l[12].x) || 0.1, hom = prom(l[11].y, l[12].y), pie = prom(l[27].y, l[28].y);
			var largo = Math.abs(prom(l[11].x, l[12].x) - prom(l[27].x, l[28].x)) || 0.1;
			return { manos: Math.abs(l[15].y - l[16].y) / anc, poste: Math.abs(l[15].x - l[16].x) / anc, horizontal: Math.abs(pie - hom) / largo };
		}, msg: 'De frente a la cámara y de cuerpo entero, con el poste a un costado', fuera: 'Sube hasta quedar horizontal, de costado al poste' },
		parada: { pide: [0, 11, 12, 15, 16, 23, 24], hold: true, en: function (l) {
			var pies = Math.min((l[27] || l[25]).y, (l[28] || l[26]).y), cad = (l[23].y + l[24].y) / 2, hom = (l[11].y + l[12].y) / 2;
			return pies < l[0].y - 0.1 && cad < hom && l[15].y > hom && l[16].y > hom;
		}, msg: 'Que se vea todo tu cuerpo, de las manos a los pies', fuera: 'Sube: cadera sobre los hombros y pies arriba' },
		grulla: { pide: [11, 15, 23, 25, 27], lado: true, hold: true, en: function (l, s) {
			var mano = l[s.m].y, pie = l[s.r].y;
			return mano > l[s.h].y && mano > l[s.c2].y && pie < mano - 0.06 && l[s.k].y < mano && Math.abs(l[s.k].x - l[s.c].x) < 0.12;
		}, msg: 'De lado: manos en el suelo y rodillas sobre los codos', fuera: 'Apoya las rodillas en los codos y despega los pies' },
		unpie: { pide: [11, 12, 23, 24, 27, 28], hold: true, en: function (l) {
			var pierna = Math.abs(((l[23].y + l[24].y) / 2) - ((l[27].y + l[28].y) / 2)) || 0.3;
			return Math.abs(l[27].y - l[28].y) > pierna * V('unpie', 'pie', 0.18) && Math.abs(l[11].y - l[12].y) < V('unpie', 'hombros', 0.08);
		}, med: function (l) { var pierna = Math.abs(((l[23].y + l[24].y) / 2) - ((l[27].y + l[28].y) / 2)) || 0.3; return { pie: Math.abs(l[27].y - l[28].y) / pierna, hombros: Math.abs(l[11].y - l[12].y) }; }, msg: 'De frente, de cuerpo entero', fuera: 'Levanta un pie y quédate firme' },
		avion: { pide: [11, 23, 27], lado: true, hold: true, en: function (l, s) {
			var t = Math.atan2(Math.abs(l[s.h].y - l[s.c2].y), Math.abs(l[s.h].x - l[s.c2].x) || 0.001) * 180 / Math.PI, otro = s.r === 27 ? 28 : 27;
			return t < 35 && l[otro] && Math.abs(l[otro].y - l[s.c2].y) < 0.12;
		}, msg: 'De lado, de cuerpo entero', fuera: 'Torso al frente y la pierna de atrás arriba, como un avión' },
		/* posturas sostenidas (cuentan segundos) */
		/* ---- yoga y tai chi ---- */
		arbol: { pide: [11, 12, 23, 24, 25, 26, 27, 28], hold: true, en: function (l) {
			var pierna = Math.abs(((l[23].y + l[24].y) / 2) - ((l[27].y + l[28].y) / 2)) || 0.3, alta = l[27].y < l[28].y ? 27 : 28, rodOtra = alta === 27 ? 26 : 25;
			return Math.abs(l[27].y - l[28].y) > pierna * 0.3 && l[alta].y < l[rodOtra].y + 0.06 && (l[11].y + l[12].y) / 2 < (l[23].y + l[24].y) / 2 - 0.1;
		}, msg: 'De frente, de cuerpo entero', fuera: 'Apoya la planta del pie en la otra pierna y quédate firme' },
		guerrero: { pide: [11, 12, 15, 16, 23, 24, 25, 26, 27, 28], hold: true, en: function (l) {
			var sw = Math.abs(l[11].x - l[12].x) || 0.1, ki = ang(l[23], l[25], l[27]), kd = ang(l[24], l[26], l[28]);
			var piernas = Math.abs(l[27].x - l[28].x) > sw * 2.2, rodilla = (ki > 75 && ki < 140 && kd > 150) || (kd > 75 && kd < 140 && ki > 150);
			var brazos = Math.abs(l[15].x - l[16].x) > sw * 2.8 && Math.abs(l[15].y - l[11].y) < 0.12 && Math.abs(l[16].y - l[12].y) < 0.12;
			return piernas && rodilla && brazos;
		}, msg: 'De frente, con las piernas bien abiertas', fuera: 'Dobla la rodilla de adelante y estira los brazos a los costados' },
		perro: { pide: [11, 15, 23, 27], lado: true, hold: true, en: function (l, s) {
			return l[s.c2].y < l[s.h].y - 0.04 && l[s.c2].y < l[s.r].y - 0.1 && l[s.m].y > l[s.h].y;
		}, msg: 'De lado, teléfono en el suelo a 2 metros', fuera: 'Sube la cadera: el cuerpo como una V invertida' },
		cobra: { pide: [11, 15, 23, 27], lado: true, hold: true, en: function (l, s) {
			return Math.abs(l[s.r].y - l[s.c2].y) < 0.12 && l[s.h].y < l[s.c2].y - 0.08 && l[s.m].y > l[s.h].y;
		}, msg: 'De lado, acostado boca abajo', fuera: 'Piernas en el suelo y eleva el pecho con los brazos' },
		taichi: { pide: [11, 12, 15, 16, 23, 24], hold: true, en: (function () {
			var prev = null, tPrev = 0, vel = 0;
			return function (l) {
				var t = performance.now() / 1000, w = { x: (l[15].x + l[16].x) / 2, y: (l[15].y + l[16].y) / 2 }, dt = t - tPrev;
				if (prev && dt > 0 && dt < 0.5) vel = vel * 0.85 + (Math.hypot(w.x - prev.x, w.y - prev.y) / dt) * 0.15;
				prev = w; tPrev = t;
				var dePie = (l[11].y + l[12].y) / 2 < (l[23].y + l[24].y) / 2 - 0.1;
				return dePie && vel > 0.03 && vel < 0.4; // ni quieto ni rápido: lento y continuo
			};
		})(), msg: 'De frente, de cuerpo entero', fuera: 'Mueve los brazos lento y sin parar, como en el agua' },
		/* ---- posturas del Camino WOPE y los programas guiados ---- */
		sillaalta: { pide: [11, 23, 25, 27], lado: true, hold: true, en: function (l, s) {
			var k = ang(l[s.c2], l[s.k], l[s.r]);
			return k > V('sillaalta', 'min', 95) && k < V('sillaalta', 'max', 150) && inclinacion(l, s) > V('sillaalta', 'depie', 55);
		}, med: function (l, s) { var k = ang(l[s.c2], l[s.k], l[s.r]); return { min: k, max: k, depie: inclinacion(l, s) }; }, msg: 'De lado y de cuerpo entero, con la espalda en la pared', fuera: 'Baja un poco: rodillas dobladas, como sentándote en una silla alta' },
		planchabanco: { pide: [11, 15, 23, 27], lado: true, hold: true, en: function (l, s) {
			var a = inclinacion(l, s);
			return a > V('planchabanco', 'min', 10) && a < V('planchabanco', 'max', 58) && ang(l[s.h], l[s.c2], l[s.r]) > V('planchabanco', 'recto', 150) && l[s.m].y > l[s.h].y;
		}, med: function (l, s) { var a = inclinacion(l, s); return { min: a, max: a, recto: ang(l[s.h], l[s.c2], l[s.r]) }; }, msg: 'De lado y de cuerpo entero: manos en el banco o la mesa', fuera: 'Cuerpo recto de hombros a tobillos, sin hundir la cadera' },
		planchalat: { pide: [11, 12, 23, 24, 27, 28], hold: true, en: function (l) {
			var hx = (l[11].x + l[12].x) / 2, hy = (l[11].y + l[12].y) / 2, px = (l[27].x + l[28].x) / 2, py = (l[27].y + l[28].y) / 2;
			var a = Math.atan2(Math.abs(hy - py), Math.abs(hx - px) || 0.001) * 180 / Math.PI, cy = (l[23].y + l[24].y) / 2;
			var apilados = Math.abs(l[11].y - l[12].y) > Math.abs(l[11].x - l[12].x) * 0.7;
			return a < V('planchalat', 'inclinacion', 40) && apilados && cy < Math.max(hy, py) + V('planchalat', 'cadera', 0.03);
		}, med: function (l) { var hx = (l[11].x + l[12].x) / 2, hy = (l[11].y + l[12].y) / 2, px = (l[27].x + l[28].x) / 2, py = (l[27].y + l[28].y) / 2; return { inclinacion: Math.atan2(Math.abs(hy - py), Math.abs(hx - px) || 0.001) * 180 / Math.PI, cadera: Math.max(hy, py) - (l[23].y + l[24].y) / 2 }; }, msg: 'Teléfono en el suelo a 2 metros: mira hacia la cámara, de costado sobre un codo', fuera: 'Sube la cadera: una línea recta de la cabeza a los pies' },
		hollow: { pide: [11, 23, 27], lado: true, hold: true, en: function (l, s) {
			return horizontal(l, s, V('hollow', 'tumbado', 28)) && l[s.h].y < l[s.c2].y - V('hollow', 'despegue', 0.015) && l[s.r].y < l[s.c2].y - V('hollow', 'despegue', 0.015);
		}, med: function (l, s) { return { tumbado: inclinacion(l, s), despegue: Math.min(l[s.c2].y - l[s.h].y, l[s.c2].y - l[s.r].y) }; }, msg: 'Teléfono en el suelo, de lado, a 2 metros: acuéstate boca arriba', fuera: 'Despega hombros y pies del suelo: la espalda baja pegada al piso' },
		flexest: { pide: [11, 13, 15, 23, 27], lado: true, hold: true, en: function (l, s) {
			var c = ang(l[s.h], l[s.c], l[s.m]);
			return horizontal(l, s, V('flexest', 'tumbado', 28)) && c > V('flexest', 'min', 60) && c < V('flexest', 'max', 120) && ang(l[s.h], l[s.c2], l[s.r]) > 150;
		}, med: function (l, s) { var c = ang(l[s.h], l[s.c], l[s.m]); return { min: c, max: c, tumbado: inclinacion(l, s) }; }, msg: 'Pon el teléfono en el suelo, de lado, a unos 2 metros', fuera: 'Baja hasta que los codos queden a 90° y quédate ahí, cuerpo recto' },
		colgado: { pide: [0, 11, 12, 13, 14, 15, 16], hold: true, en: function (l) {
			var hombro = (l[11].y + l[12].y) / 2, ancho = Math.abs(l[11].x - l[12].x) || 0.1;
			return l[15].y < l[0].y - ancho * V('colgado', 'manos', 0.3) && l[16].y < l[0].y - ancho * V('colgado', 'manos', 0.3) && l[15].y < hombro && ang(l[11], l[13], l[15]) > V('colgado', 'brazos', 145) && ang(l[12], l[14], l[16]) > V('colgado', 'brazos', 145);
		}, med: function (l) { var ancho = Math.abs(l[11].x - l[12].x) || 0.1; return { manos: (l[0].y - Math.max(l[15].y, l[16].y)) / ancho, brazos: Math.min(ang(l[11], l[13], l[15]), ang(l[12], l[14], l[16])) }; }, msg: 'Apoya el teléfono de frente a la barra: que se vean tus manos y tu cabeza', fuera: 'Cuélgate con los brazos estirados y los pies en el aire' },
		domest: { pide: [0, 11, 12, 13, 14, 15, 16], hold: true, en: function (l) {
			var mano = (l[15].y + l[16].y) / 2;
			return mano < (l[11].y + l[12].y) / 2 && l[0].y < mano + V('domest', 'menton', 0.015) && ang(l[11], l[13], l[15]) < V('domest', 'codos', 110) && ang(l[12], l[14], l[16]) < V('domest', 'codos', 110);
		}, med: function (l) { var mano = (l[15].y + l[16].y) / 2; return { menton: mano - l[0].y, codos: Math.max(ang(l[11], l[13], l[15]), ang(l[12], l[14], l[16])) }; }, msg: 'Apoya el teléfono de frente a la barra: que se vean tus manos y tu cabeza', fuera: 'Sube hasta pasar el mentón sobre la barra y aguanta ahí' },
		sillaunpie: { pide: [11, 23, 25, 27], lado: true, hold: true, en: function (l, s) {
			var k = ang(l[s.c2], l[s.k], l[s.r]), otro = s.r === 27 ? 28 : 27, otroK = s.r === 27 ? 26 : 25;
			var arriba = l[otro] && (l[s.r].y - l[otro].y > V('sillaunpie', 'pie', 0.05) || (l[otroK] && l[24 - (s.r === 27 ? 0 : 1)] && ang(l[s.r === 27 ? 24 : 23], l[otroK], l[otro]) > 150 && l[otro].y < l[s.r].y - 0.03));
			return k > V('sillaunpie', 'min', 65) && k < V('sillaunpie', 'max', 125) && inclinacion(l, s) > V('sillaunpie', 'depie', 55) && !!arriba;
		}, med: function (l, s) { var k = ang(l[s.c2], l[s.k], l[s.r]), otro = s.r === 27 ? 28 : 27; return { min: k, max: k, depie: inclinacion(l, s), pie: l[otro] ? l[s.r].y - l[otro].y : 0 }; }, msg: 'De lado: espalda en la pared y muslos paralelos al suelo', fuera: 'Posición de silla y despega un pie del suelo' },
		/* Rutinas de seguimiento: cuenta el tiempo mientras la persona está frente a la cámara, sin mirar la postura. */
		presente: { pide: [11, 12, 23, 24], hold: true, en: function () { return true; }, msg: 'Ponte donde la cámara te vea el torso y las caderas' },
		sentado: { pide: [11, 12, 23, 24, 25, 26], hold: true, en: function (l) {
			var hy = (l[11].y + l[12].y) / 2, cy = (l[23].y + l[24].y) / 2, ky = (l[25].y + l[26].y) / 2, torso = cy - hy;
			return torso > V('sentado', 'torso', 0.08) && (ky - cy) < torso * V('sentado', 'rodillas', 0.55) && Math.abs(l[11].y - l[12].y) < 0.07;
		}, med: function (l) { var hy = (l[11].y + l[12].y) / 2, cy = (l[23].y + l[24].y) / 2, ky = (l[25].y + l[26].y) / 2, torso = cy - hy; return { torso: torso, rodillas: (ky - cy) / (torso || 0.01) }; }, msg: 'Siéntate de frente a la cámara: que se vean tus hombros, cadera y rodillas', fuera: 'Siéntate cómodo, con la espalda larga y los hombros sueltos' },
		pinza: { pide: [11, 23, 25, 27], lado: true, hold: true, en: function (l, s) {
			var t = Math.atan2(l[s.c2].y - l[s.h].y, Math.abs(l[s.h].x - l[s.c2].x) || 0.001) * 180 / Math.PI;
			return t < V('pinza', 'torso', 30) && l[s.r].y > l[s.c2].y + 0.15 && ang(l[s.c2], l[s.k], l[s.r]) > V('pinza', 'rodillas', 125);
		}, med: function (l, s) { return { torso: Math.atan2(l[s.c2].y - l[s.h].y, Math.abs(l[s.h].x - l[s.c2].x) || 0.001) * 180 / Math.PI, rodillas: ang(l[s.c2], l[s.k], l[s.r]) }; }, msg: 'De lado y de cuerpo entero, de pie', fuera: 'Inclínate hacia adelante desde la cadera y deja colgar los brazos' },
		plancha: { pide: [11, 23, 27], lado: true, hold: true, en: function (l, s) {
			return horizontal(l, s, V('plancha', 'tumbado', 22)) && ang(l[s.h], l[s.c2], l[s.r]) > V('plancha', 'recto', 150) && l[s.m].y > l[s.h].y;
		}, med: function (l, s) { return { tumbado: inclinacion(l, s), recto: ang(l[s.h], l[s.c2], l[s.r]) }; }, msg: 'Pon el teléfono en el suelo, de lado, a unos 2 metros', fuera: 'Cuerpo recto: alinea hombros, cadera y tobillos' },
		silla: { pide: [11, 23, 25, 27], lado: true, hold: true, en: function (l, s) {
			var k = ang(l[s.c2], l[s.k], l[s.r]), t = inclinacion(l, s);
			return k > V('silla', 'min', 65) && k < V('silla', 'max', 125) && t > V('silla', 'depie', 55);
		}, med: function (l, s) { var k = ang(l[s.c2], l[s.k], l[s.r]); return { min: k, max: k, depie: inclinacion(l, s) }; }, msg: 'De lado: espalda en la pared y muslos paralelos al suelo', fuera: 'Baja hasta que los muslos queden paralelos al suelo' }
	};
	/* Suaviza el temblor de los puntos entre cuadros (evita cuentas fantasma). */
	function suavizar(self, l) {
		if (!l) { self.prev = null; self.salto = 9; return l; }
		var p = self.prev, out = l;
		if (p) {
			/* Cuánto se movió el esqueleto entero de un cuadro al otro. Si pega un salto
			   grande no es que la persona se haya teletransportado: es que el modelo se
			   confundió. Esos cuadros no cuentan. */
			var d = 0, n = 0;
			[11, 12, 23, 24, 25, 26, 27, 28].forEach(function (i) {
				if (p[i] && l[i]) { d += Math.hypot(l[i].x - p[i].x, l[i].y - p[i].y); n++; }
			});
			self.salto = n ? d / n : 9;
			out = l.map(function (q, i) { var a = p[i]; return { x: a.x + (q.x - a.x) * 0.55, y: a.y + (q.y - a.y) * 0.55, z: q.z, visibility: q.visibility }; });
		} else { self.salto = 9; }
		self.prev = out; return out;
	}
	function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
	/* lado del cuerpo que mejor se ve: h hombro, c codo, m muñeca, c2 cadera, k rodilla, r tobillo */
	function ladoDe(l) {
		var vi = (l[11].visibility || 0) + (l[23].visibility || 0) + (l[27].visibility || 0), vd = (l[12].visibility || 0) + (l[24].visibility || 0) + (l[28].visibility || 0);
		return vd > vi ? { h: 12, c: 14, m: 16, c2: 24, k: 26, r: 28 } : { h: 11, c: 13, m: 15, c2: 23, k: 25, r: 27 };
	}
	/* ángulo de la línea hombro-tobillo respecto del suelo (0 = horizontal, 90 = de pie) */
	function inclinacion(l, s) { return Math.atan2(Math.abs(l[s.h].y - l[s.r].y), Math.abs(l[s.h].x - l[s.r].x) || 0.001) * 180 / Math.PI; }
	function horizontal(l, s, max) { return inclinacion(l, s) < max; }
	/* La familia de la sentadilla comparte medida: cadera contra el largo de tu pierna,
	   y el promedio de las dos rodillas como segunda opinión. */
	/* ---- 3D: SENTADILLA DESDE CUALQUIER ÁNGULO ---------------------------------
	 * MediaPipe también entrega los puntos del cuerpo en metros, en 3D (worldLandmarks).
	 * Con ellos, el ángulo de rodilla y la distancia cadera-tobillo son los mismos
	 * de frente, de lado o en diagonal: ya no hace falta ponerse justo a 45°.
	 * Para que no se pueda hacer trampa, una repetición necesita TODO esto:
	 *   - que la distancia cadera-tobillo (3D) baje lo pedido contra tu pierna;
	 *   - que se doblen LAS DOS rodillas (no vale doblar una sola);
	 *   - que la cadera también baje en la imagen (2D): inclinarse no es bajar;
	 *   - ciclo completo (de pie → abajo → de pie) y un tiempo mínimo por repetición;
	 *   - cuerpo entero a la vista, con buena confianza en cadera, rodillas y tobillos.
	 * Si el navegador no da puntos 3D, se usa la medida de siempre (en diagonal).
	 * ------------------------------------------------------------------------- */
	function d3(a, b) { return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y) + (a.z - b.z) * (a.z - b.z)); }
	function ang3(a, b, c) {
		var u = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }, v = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
		var nu = Math.sqrt(u.x * u.x + u.y * u.y + u.z * u.z), nv = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
		if (!nu || !nv) return 180;
		var c0 = (u.x * v.x + u.y * v.y + u.z * v.z) / (nu * nv);
		return Math.acos(Math.max(-1, Math.min(1, c0))) * 180 / Math.PI;
	}
	function medio3(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 }; }
	function mundo(self, w) {
		if (!w || !w[23] || !w[28]) { self.wPrev = null; return null; }
		var p = self.wPrev, out = w;
		if (p) out = w.map(function (q, i) { var a = p[i]; return { x: a.x + (q.x - a.x) * 0.5, y: a.y + (q.y - a.y) * 0.5, z: a.z + (q.z - a.z) * 0.5 }; });
		self.wPrev = out;
		return out;
	}
	function cuerpoEntero(l, ids) {
		return (ids || [0, 23, 24, 25, 26, 27, 28]).every(function (i) { return l[i] && l[i].y > -0.02 && l[i].y < 1.02 && l[i].x > -0.02 && l[i].x < 1.02; });
	}
	function cucl3(l, st, k, dRec, dCierre, d2) {
		var w = l.w;
		var kI = ang3(w[23], w[25], w[27]), kD = ang3(w[24], w[26], w[28]);
		var ka = (kI + kD) / 2;
		var dist = d3(medio3(w[23], w[24]), medio3(w[27], w[28]));
		var pierna = Math.max(d3(w[23], w[25]) + d3(w[25], w[27]), d3(w[24], w[26]) + d3(w[26], w[28]));
		/* las dos rodillas: la que menos se dobló tiene que doblarse al menos el 60% de lo pedido */
		var base = fija(st, 'k3', Math.max(kI, kD), 'max');
		/* la altura de la cadera en la imagen estando de pie (se toma siempre, no solo al bajar) */
		var cad2 = prom(l[23].y, l[24].y), leg2 = Math.abs(prom(l[27].y, l[28].y) - cad2) || 0.2;
		var top = (base - ka) < 15 ? fija(st, 'c2', cad2, 'suave') : rf(st, 'c2');
		var f = ciclo(st, k, -dist, pierna, -ka, V(k, 'recorrido3', dRec), V(k, 'cierre3', dCierre));
		if (f === 'b') {
			var minCierre = Math.min(base - kI, base - kD);
			if (minCierre < V(k, 'cierre3', dCierre) * 0.6) return null;
			/* y la cadera tiene que bajar también en la imagen */
			if (top == null || (cad2 - top) / leg2 < d2) return null;
		}
		return f;
	}
	/* ---- 3D: EMPUJE (flexión, flexión en banco, fondos) DESDE CUALQUIER ÁNGULO ----
	 * Recorrido: la distancia hombro-muñeca en 3D se acorta al bajar (contra el largo
	 * de tu brazo). Cierre: los codos, con los dos brazos (no vale doblar uno solo).
	 * Forma: el ángulo del cuerpo contra el piso y, en la flexión, el cuerpo recto de
	 * hombros a rodillas (la cadera levantada no cuenta). Y los hombros tienen que
	 * bajar también en la imagen: mover la cabeza no es bajar.
	 * ------------------------------------------------------------------------- */
	function inclin3(a, b) { var dy = Math.abs(a.y - b.y), L = d3(a, b) || 1; return Math.asin(Math.min(1, dy / L)) * 180 / Math.PI; }
	function empuje3(l, st, k, o) {
		var w = l.w;
		var H = medio3(w[11], w[12]), C = medio3(w[23], w[24]), Kn = medio3(w[25], w[26]), Tb = medio3(w[27], w[28]), M = medio3(w[15], w[16]);
		var cuerpo = o.forma === 'vert' ? inclin3(H, C) : inclin3(H, Tb);
		if (cuerpo < V(k, 'min3', o.min) || cuerpo > V(k, 'max3', o.max)) return null;
		if (o.recto && ang3(H, C, Kn) < V(k, 'recto', o.recto)) return null;
		if (o.manosAbajo && M.y < H.y) return null; // y hacia abajo: las manos más abajo que los hombros
		var eI = ang3(w[11], w[13], w[15]), eD = ang3(w[12], w[14], w[16]);
		var brazo = Math.max(d3(w[11], w[13]) + d3(w[13], w[15]), d3(w[12], w[14]) + d3(w[14], w[16]));
		var base = fija(st, 'e3', Math.max(eI, eD), 'max');
		/* los hombros en la imagen con los brazos estirados (se toma siempre, no solo al bajar) */
		var h2 = prom(l[11].y, l[12].y), b2 = fija(st, 'b2', prom(dist(l[11], l[15]), dist(l[12], l[16])) || 0.15, 'max');
		var top = (base - (eI + eD) / 2) < 15 ? fija(st, 'h2', h2, 'suave') : rf(st, 'h2');
		var f = ciclo(st, k, -d3(H, M), brazo, -(eI + eD) / 2, V(k, 'recorrido3', o.rec), V(k, 'cierre3', o.cierre));
		if (f === 'b') {
			if (Math.min(base - eI, base - eD) < V(k, 'cierre3', o.cierre) * 0.6) return null;
			if (top == null || (h2 - top) / b2 < o.d2) return null;
		}
		return f;
	}
	/* ---- 3D: ESTOCADA, PISTOL Y AUSTRALIANA DESDE CUALQUIER ÁNGULO ---------------- */
	/* referencia en la imagen tomada siempre en la postura de reposo (rodilla o codo abiertos) */
	function ref2(st, clave, v, abierto) { return abierto ? fija(st, clave, v, 'suave') : rf(st, clave); }
	function piernaLarga(w) { return Math.max(d3(w[23], w[25]) + d3(w[25], w[27]), d3(w[24], w[26]) + d3(w[26], w[28])); }
	/* Estocada: pies separados un paso largo, las DOS rodillas se doblan y la cadera baja. */
	function estocada3(l, st) {
		var w = l.w, P = piernaLarga(w), k = 'estocada';
		if (d3(w[27], w[28]) < P * V(k, 'paso3', 0.55)) return null;
		var kI = ang3(w[23], w[25], w[27]), kD = ang3(w[24], w[26], w[28]);
		var C = medio3(w[23], w[24]), suelo = Math.max(w[27].y, w[28].y);
		var base = fija(st, 'k3', Math.max(kI, kD), 'max');
		var cad2 = prom(l[23].y, l[24].y), leg2 = Math.abs(prom(l[27].y, l[28].y) - cad2) || 0.2;
		var top = ref2(st, 'c2', cad2, base - Math.min(kI, kD) < 15);
		var f = ciclo(st, k, C.y - suelo, P, -Math.min(kI, kD), V(k, 'recorrido3', 0.18), V(k, 'cierre3', 45));
		if (f === 'b') {
			if (Math.max(base - kI, base - kD) < 0 || Math.min(base - kI, base - kD) < V(k, 'atras3', 25)) return null; // la de atrás también se dobla
			if (top == null || (cad2 - top) / leg2 < 0.1) return null;
		}
		return f;
	}
	/* Pistol: un pie claramente en el aire y la cadera baja sobre la pierna que sostiene. */
	function pistol3(l, st) {
		var w = l.w, k = 'pistol', P = piernaLarga(w);
		var izq = w[27].y > w[28].y; // y hacia abajo: el tobillo más bajo es el que apoya
		var cad = izq ? w[23] : w[24], rod = izq ? w[25] : w[26], tob = izq ? w[27] : w[28], libre = izq ? w[28] : w[27];
		if (tob.y - libre.y < P * V(k, 'pie3', 0.12)) return null; // los dos pies en el suelo
		var kn = ang3(cad, rod, tob);
		var base = fija(st, 'k3', kn, 'max');
		var cad2 = izq ? l[23].y : l[24].y, leg2 = Math.abs((izq ? l[27].y : l[28].y) - cad2) || 0.2;
		var top = ref2(st, 'c2', cad2, base - kn < 15);
		var f = ciclo(st, k, -d3(cad, tob), P, -kn, V(k, 'recorrido3', 0.32), V(k, 'cierre3', 60));
		if (f === 'b' && (top == null || (cad2 - top) / leg2 < 0.15)) return null;
		return f;
	}
	/* Australiana: cuerpo inclinado y recto bajo la barra, manos más arriba que el pecho,
	   los DOS codos se doblan y el pecho se acerca a la barra. */
	function remo3(l, st) {
		var w = l.w, k = 'remo';
		var H = medio3(w[11], w[12]), C = medio3(w[23], w[24]), Kn = medio3(w[25], w[26]), Tb = medio3(w[27], w[28]), M = medio3(w[15], w[16]);
		var inc = inclin3(H, Tb);
		if (inc < V(k, 'min3', 8) || inc > V(k, 'max3', 62)) return null;
		if (M.y > H.y + 0.03) return null; // las manos tienen que estar más arriba que los hombros
		if (ang3(H, C, Kn) < V(k, 'recto', 145)) return null;
		var eI = ang3(w[11], w[13], w[15]), eD = ang3(w[12], w[14], w[16]);
		var base = fija(st, 'e3', Math.max(eI, eD), 'max');
		var d2 = prom(dist(l[11], l[15]), dist(l[12], l[16])), t2 = fija(st, 't2', prom(dist(l[11], l[23]), dist(l[12], l[24])) || 0.2, 'max');
		var top = ref2(st, 'd2', d2, base - (eI + eD) / 2 < 15);
		var f = ciclo(st, k, -d3(H, M), d3(H, C), -(eI + eD) / 2, V(k, 'recorrido3', 0.3), V(k, 'cierre3', 40));
		if (f === 'b') {
			if (Math.min(base - eI, base - eD) < V(k, 'cierre3', 40) * 0.6) return null;
			if (top == null || (top - d2) / t2 < 0.1) return null;
		}
		return f;
	}
	/* Dominada: colgado con las manos más arriba que los hombros. Recorrido: la distancia
	   hombro-muñeca en 3D se acorta (contra el largo de tu brazo), y eso no cambia por
	   estirar el cuello. Cierre: los DOS codos. Y en la imagen los hombros tienen que
	   SUBIR mientras las manos se quedan quietas en la barra: bajar las manos de pie
	   (como un jalón) no es una dominada. */
	function dominada3(l, st) {
		var w = l.w, k = 'dominada';
		var H = medio3(w[11], w[12]), M = medio3(w[15], w[16]);
		if (M.y > H.y) return null; // y hacia abajo: las manos tienen que estar arriba
		var eI = ang3(w[11], w[13], w[15]), eD = ang3(w[12], w[14], w[16]);
		var brazo = Math.max(d3(w[11], w[13]) + d3(w[13], w[15]), d3(w[12], w[14]) + d3(w[14], w[16]));
		var base = fija(st, 'e3', Math.max(eI, eD), 'max');
		var h2 = prom(l[11].y, l[12].y), m2 = prom(l[15].y, l[16].y);
		var b2 = fija(st, 'b2', prom(dist(l[11], l[15]), dist(l[12], l[16])) || 0.15, 'max');
		var abierto = base - (eI + eD) / 2 < 15;
		var top = ref2(st, 'h2', h2, abierto), mRef = ref2(st, 'm2', m2, abierto);
		var cierre = V(k, 'cierre3', 80);
		var f = ciclo(st, k, -d3(H, M), brazo, -(eI + eD) / 2, V(k, 'recorrido3', 0.45), cierre);
		if (f === 'b') {
			if (Math.min(base - eI, base - eD) < cierre * 0.6) return null;
			if (top == null || (top - h2) / b2 < V(k, 'sube2', 0.3)) return null;
			if (mRef == null || Math.abs(m2 - mRef) / b2 > V(k, 'manos2', 0.25)) return null;
		}
		return f;
	}
	function hay3b(l) { return !!(l.w && [11, 12, 13, 14, 15, 16].every(function (i) { return l.w[i]; })); }
	function hay3e(l) { return !!(l.w && [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].every(function (i) { return l.w[i]; })); }
	function hay3(l) { return !!(l.w && l.w[23] && l.w[24] && l.w[25] && l.w[26] && l.w[27] && l.w[28]); }
	function cucl(l, st, k, dRec, dCierre) {
		var ka = prom(ang(l[23], l[25], l[27]), ang(l[24], l[26], l[28]));
		var cad = prom(l[23].y, l[24].y), pierna = Math.abs(prom(l[27].y, l[28].y) - cad);
		return ciclo(st, k, cad, pierna, -ka, dRec, dCierre);
	}
	function medCucl(l, r) {
		var ka = prom(ang(l[23], l[25], l[27]), ang(l[24], l[26], l[28])), o = { recorrido: 0, cierre: 0 };
		if (r && r[23] && r[27]) {
			var cadR = prom(r[23].y, r[24].y), P = Math.abs(prom(r[27].y, r[28].y) - cadR) || 0.3;
			o.recorrido = (prom(l[23].y, l[24].y) - cadR) / P;
			o.cierre = prom(ang(r[23], r[25], r[27]), ang(r[24], r[26], r[28])) - ka;
		}
		return o;
	}
	/* Pistol: cuál pierna sostiene y cuál está libre. */
	function unaPierna(l) {
		var apoyo = l[27].y > l[28].y ? 0 : 1;
		var tob = apoyo ? l[28] : l[27], libre = apoyo ? l[27] : l[28];
		var cad = apoyo ? l[24] : l[23], rod = apoyo ? l[26] : l[25];
		return { tob: tob, libre: libre, cad: cad, rod: rod, pierna: Math.abs(tob.y - cad.y) };
	}
	var HUESOS = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]];

	/**
	 * Cuenta repeticiones. video: <video> con la cámara propia; lienzo: <canvas> encima para dibujar el esqueleto.
	 * cb(cuenta, estado, texto) — estado: 'cargando' | 'ok' | 'sin-cuerpo' | 'error'
	 */
	function Contador(video, lienzo, tipo, cb) {
		this.v = video; this.c = lienzo; this.tipo = tipo; this.cb = cb; this.n = 0; this.vivo = true; this.st = { f: 'a' };
		var self = this, R = REGLAS[tipo];
		if (!R) { cb(0, 'error', 'Este ejercicio no se cuenta con la cámara'); return; }
		cb(0, 'cargando', 'Preparando el contador…');
		cargar().then(function (d) { if (self.vivo) self.loop(d, R); }).catch(function () { cb(0, 'error', 'El contador no cargó. Que los demás confirmen.'); });
	}
	Contador.prototype.loop = function (d, R) {
		var self = this, ult = -1, sinCuerpo = 0;
		function paso() {
			if (!self.vivo) return;
			var v = self.v;
			if (v.readyState >= 2 && v.currentTime !== ult) {
				ult = v.currentTime;
				var res; try { res = d.detectForVideo(v, performance.now()); } catch (e) { res = null; }
				var l = suavizar(self, res && res.landmarks && res.landmarks[0]);
				if (l) l.w = mundo(self, res && res.worldLandmarks && res.worldLandmarks[0]);
				self.dibujar(l);
				var s = l && R.lado ? ladoDe(l) : null;
				if (self.alLm && l) self.alLm(l, s);
				var pide = s ? R.pide.map(function (i) { return { 11: s.h, 13: s.c, 15: s.m, 23: s.c2, 25: s.k, 27: s.r }[i] || i; }) : R.pide;
				var tv = v.currentTime, dtv = Math.min(0.25, Math.max(0, tv - (self.tv || tv))); self.tv = tv;
				if (l && vis(l, pide)) {
					if (sinCuerpo >= 12 && !R.vista) self.cb(self.n, 'ok', '');
					sinCuerpo = 0;
					/* Los primeros cuadros el modelo todavía se está acomodando: ahí es donde
					   salían dos o tres repeticiones sin que nadie se moviera. No se cuenta
					   hasta que el esqueleto se queda quieto unos cuadros seguidos. Una vez
					   que se asentó queda asentado: si no, moverse rápido cortaría la cuenta. */
					/* La perspectiva manda: si la cámara no está donde este ejercicio se lee
					   bien, no se cuenta nada y se le dice a la persona cómo girarse. */
					var mal = (R.libre3 && l.w) ? (cuerpoEntero(l, R.cuerpo3) ? null : 'Aléjate un poco: que se vea tu cuerpo entero') : vistaMal(R, l, self.vistaOk);
					if (mal) {
						self.vistaOk = false; self.asentado = false; self.listo = 0; self.st.R = null; self.st.f = 'a';
						if (self.aviso !== mal) { self.aviso = mal; self.cb(self.n, 'sin-cuerpo', mal); }
						self.raf = requestAnimationFrame(paso); return;
					}
					if (!self.vistaOk) { self.vistaOk = true; if (self.aviso) { self.aviso = null; self.cb(self.n, 'ok', ''); } }
					if (!self.asentado) {
						self.listo = (self.salto != null && self.salto < 0.05) ? (self.listo || 0) + 1 : 0;
						if (self.listo < 8) { self.raf = requestAnimationFrame(paso); return; }
						self.asentado = true;
					}
					if (R.hold) {
						var dentro = R.en(l, s);
						if (dentro) { self.acc = (self.acc || 0) + dtv; var nn = Math.floor(self.acc); if (nn !== self.n) { self.n = nn; self.cb(self.n, 'ok'); } if (self.st.fuera) { self.st.fuera = false; self.cb(self.n, 'ok', ''); } }
						else if (!self.st.fuera) { self.st.fuera = true; self.cb(self.n, 'fuera', R.fuera); }
					} else {
						var f = R.fase(l, self.st, s), ahora = performance.now() / 1000, okT = ahora - (self.st.t || 0) >= Math.max(R.min || 0.45, 0.4);
						if (f === 'cuenta') { if (okT) { self.st.t = ahora; self.n++; self.cb(self.n, 'ok'); } }
						else if (f === 'b' && self.st.f === 'a') self.st.f = 'b';
						else if (f === 'a' && self.st.f === 'b') { self.st.f = 'a'; if (okT) { self.st.t = ahora; self.n++; self.cb(self.n, 'ok'); } }
					}
				} else if (++sinCuerpo === 12) { self.asentado = false; self.listo = 0; self.st.R = null; self.st.f = 'a'; self.vistaOk = false; self.aviso = null; self.cb(self.n, 'sin-cuerpo', R.msg); if (R.hold) self.st.fuera = true; }
			}
			self.raf = requestAnimationFrame(paso);
		}
		self.cb(0, 'ok', '');
		paso();
	};
	Contador.prototype.dibujar = function (l) {
		var c = this.c; if (!c) return;
		var w = c.width = c.clientWidth || 320, h = c.height = c.clientHeight || 240, g = c.getContext('2d');
		g.clearRect(0, 0, w, h);
		if (!l) return;
		g.lineWidth = 4; g.lineCap = 'round'; g.strokeStyle = 'rgba(240,164,24,.9)';
		HUESOS.forEach(function (b) {
			var a = l[b[0]], z = l[b[1]]; if (!a || !z) return;
			g.beginPath(); g.moveTo((1 - a.x) * w, a.y * h); g.lineTo((1 - z.x) * w, z.y * h); g.stroke();
		});
		g.fillStyle = '#fff';
		[0, 15, 16, 25, 26, 27, 28].forEach(function (i) { var p = l[i]; if (p) { g.beginPath(); g.arc((1 - p.x) * w, p.y * h, 4, 0, 7); g.fill(); } });
	};
	Contador.prototype.parar = function () { this.vivo = false; cancelAnimationFrame(this.raf); if (this.c) this.c.getContext('2d').clearRect(0, 0, this.c.width, this.c.height); };

	/* Qué se puede calibrar: [clave, qué mide, mínimo, máximo, paso, dónde se mide].
	   Casi todos los ejercicios tienen los mismos dos números: 'recorrido' (cuánto se
	   mueve tu cuerpo, en partes de tu propia pierna/brazo/torso) y 'cierre' (cuántos
	   grados se cierra la articulación respecto de tu reposo). Lo demás son filtros de
	   forma.
	   Dónde: 'fin' el límite del final de la repetición · 'ini' el de la postura de
	   descanso · 'cerca' el otro extremo de la ventana de una postura sostenida ·
	   'max'/'min' un filtro de forma, que se deja holgado. El calibrador guiado usa
	   esto para saber de qué lado de tus dos fotos tiene que caer cada número. */
	var PAR = {
		sentadilla: [["recorrido", "Cuánto tiene que recorrer tu cuerpo", 0.1, 0.7, 0.01, "fin"], ["cierre", "Cuántos grados se cierra la articulación", 10, 80, 1, "fin"]],
		sentadillamedia: [["recorrido", "Cuánto tiene que recorrer tu cuerpo", 0.04, 0.4, 0.01, "fin"], ["cierre", "Cuántos grados se cierra la articulación", 4, 40, 1, "fin"]],
		pistol: [["recorrido", "Cuánto tiene que recorrer tu cuerpo", 0.2, 0.8, 0.01, "fin"], ["cierre", "Cuántos grados se cierra la articulación", 15, 100, 1, "fin"], ["pie", "Cuánto despegas el pie libre", 0.04, 0.4, 0.01, "min"]],
		estocada: [["recorrido", "Cuánto tiene que recorrer tu cuerpo", 0.06, 0.5, 0.01, "fin"], ["cierre", "Cuántos grados se cierra la articulación", 10, 70, 1, "fin"], ["separacion", "Separación de rodillas", 0.1, 1, 0.05, "min"]],
		flexion: [["recorrido", "Cuánto tiene que recorrer tu cuerpo", 0.08, 0.7, 0.01, "fin"], ["cierre", "Cuántos grados se cierra la articulación", 10, 100, 1, "fin"], ["tumbado", "Hasta qué inclinación cuenta como tumbado", 15, 60, 1, "max"], ["recto", "Cuerpo recto del hombro a la rodilla", 110, 180, 1, "min"]],
		flexpared: [["recorrido", "Cuánto tiene que recorrer tu cuerpo", 0.06, 0.6, 0.01, "fin"], ["cierre", "Cuántos grados se cierra la articulación", 8, 70, 1, "fin"], ["depie", "Inclinación mínima del cuerpo", 30, 90, 1, "min"]],
		flexbanco: [["recorrido", "Cuánto tiene que recorrer tu cuerpo", 0.06, 0.6, 0.01, "fin"], ["cierre", "Cuántos grados se cierra la articulación", 10, 90, 1, "fin"], ["min", "Inclinación mínima del cuerpo", 20, 50, 1, "min"], ["max", "Inclinación máxima del cuerpo", 45, 85, 1, "max"], ["recto", "Cuerpo recto (cadera)", 120, 180, 1, "min"]],
		fondo: [["recorrido", "Cuánto tiene que recorrer tu cuerpo", 0.08, 0.7, 0.01, "fin"], ["cierre", "Cuántos grados se cierra la articulación", 8, 80, 1, "fin"], ["vertical", "Inclinación mínima del cuerpo", 20, 80, 1, "min"]],
		remo: [["recorrido", "Cuánto tiene que recorrer tu cuerpo", 0.08, 0.8, 0.01, "fin"], ["cierre", "Cuántos grados se cierra la articulación", 10, 90, 1, "fin"], ["minInclin", "Inclinación mínima", 0, 40, 1, "min"], ["maxInclin", "Inclinación máxima", 30, 90, 1, "max"]],
		dominada: [["recorrido", "Cuánto tiene que recorrer tu cuerpo", 0.25, 1.6, 0.01, "fin"], ["cierre", "Cuántos grados se cierra la articulación", 12, 100, 1, "fin"]],
		crunch: [["recorrido", "Cuánto tiene que recorrer tu cuerpo", 0.04, 0.5, 0.01, "fin"], ["cierre", "Cuántos grados se cierra la articulación", 4, 45, 1, "fin"]],
		piernas: [["recorrido", "Cuánto tiene que recorrer tu cuerpo", 0.15, 1.1, 0.01, "fin"], ["cierre", "Cuántos grados se cierra la articulación", 10, 90, 1, "fin"]],
		bisagra: [["recorrido", "Cuánto tiene que recorrer tu cuerpo", 0.03, 0.4, 0.01, "fin"], ["cierre", "Cuántos grados se cierra la articulación", 10, 70, 1, "fin"], ["rodillas", "Rodillas casi estiradas", 100, 180, 1, "min"]],
		salto: [["cierre", "Cuántos grados se cierra la articulación", 8, 70, 1, "fin"], ["altura", "Altura del salto (parte de tu pierna)", 0.03, 0.4, 0.01, "fin"]],
		burpee: [["recorrido", "Cuánto tiene que recorrer tu cuerpo", 0.1, 0.8, 0.01, "fin"], ["suelo", "Inclinación máxima en el suelo", 10, 50, 1, "fin"], ["depie", "Inclinación mínima de pie", 40, 90, 1, "ini"]],
		escalador: [["rodilla", "Ángulo de cadera con la rodilla arriba", 70, 150, 1, "fin"], ["tumbado", "Inclinación máxima del cuerpo", 15, 70, 1, "max"]],
		trote: [["rodilla", "Cuánto sube la rodilla", 0.15, 0.9, 0.05, "fin"], ["centro", "Zona neutra entre rodillas", 0.03, 0.4, 0.01, "ini"]],
		tijera: [["abierto", "Separación de pies abiertos", 1.1, 2.5, 0.05, "fin"], ["cerrado", "Separación de pies cerrados", 0.5, 1.5, 0.05, "ini"]],
		plancha: [["tumbado", "Inclinación máxima", 10, 45, 1, "max"], ["recto", "Cuerpo recto (cadera)", 120, 180, 1, "min"]],
		planchabanco: [["min", "Inclinación mínima", 0, 40, 1, "cerca"], ["max", "Inclinación máxima", 30, 80, 1, "fin"], ["recto", "Cuerpo recto (cadera)", 120, 180, 1, "min"]],
		planchalat: [["cadera", "Cadera arriba", -0.1, 0.15, 0.01, "fin"], ["inclinacion", "Inclinación máxima del cuerpo", 15, 70, 1, "max"]],
		hollow: [["despegue", "Cuánto despegas hombros y pies", 0, 0.08, 0.005, "fin"], ["tumbado", "Inclinación máxima", 10, 50, 1, "max"]],
		flexest: [["min", "Ángulo de codo mínimo", 40, 100, 1, "cerca"], ["max", "Ángulo de codo máximo", 80, 150, 1, "fin"], ["tumbado", "Inclinación máxima", 10, 50, 1, "max"]],
		silla: [["min", "Ángulo de rodilla mínimo", 40, 110, 1, "cerca"], ["max", "Ángulo de rodilla máximo", 90, 160, 1, "fin"], ["depie", "Torso vertical", 30, 90, 1, "min"]],
		sillaalta: [["min", "Ángulo de rodilla mínimo", 70, 140, 1, "cerca"], ["max", "Ángulo de rodilla máximo", 110, 175, 1, "fin"], ["depie", "Torso vertical", 30, 90, 1, "min"]],
		sillaunpie: [["min", "Ángulo de rodilla mínimo", 40, 110, 1, "cerca"], ["max", "Ángulo de rodilla máximo", 90, 160, 1, "fin"], ["depie", "Torso vertical", 30, 90, 1, "min"], ["pie", "Cuánto despegas el otro pie", 0.01, 0.2, 0.01, "fin"]],
		colgado: [["manos", "Manos sobre la cabeza", 0.05, 1, 0.05, "fin"], ["brazos", "Ángulo de brazo estirado", 110, 180, 1, "min"]],
		domest: [["menton", "Cuánto pasa el mentón de las manos", -0.05, 0.1, 0.005, "fin"], ["codos", "Ángulo de codo doblado", 60, 150, 1, "max"]],
		unpie: [["pie", "Cuánto levantas el pie", 0.05, 0.6, 0.01, "fin"], ["hombros", "Hombros nivelados", 0.02, 0.2, 0.01, "max"]],
		sentado: [["rodillas", "Rodillas respecto del torso", 0.2, 1.2, 0.05, "fin"], ["torso", "Alto del torso sentado", 0.03, 0.2, 0.01, "max"]],
		pinza: [["torso", "Inclinación del torso", 10, 60, 1, "fin"], ["rodillas", "Rodillas casi estiradas", 90, 180, 1, "min"]],
		sentadillaprofunda: [["recorrido", "Cuánto tiene que recorrer tu cuerpo", 0.2, 0.9, 0.01, "fin"], ["cierre", "Cuántos grados se cierra la articulación", 20, 100, 1, "fin"]],
		bulgara: [["recorrido", "Cuánto tiene que recorrer tu cuerpo", 0.1, 0.6, 0.01, "fin"], ["cierre", "Cuántos grados se cierra la articulación", 15, 80, 1, "fin"], ["pie", "Cuánto está elevado el pie de atrás (mínimo)", 0.04, 0.3, 0.01, "min"], ["pieMax", "Cuánto está elevado el pie de atrás (máximo)", 0.2, 0.8, 0.01, "max"]],
		barraspiernas: [["recorrido", "Cuánto tienen que subir los pies", 0.2, 1.1, 0.01, "fin"], ["cierre", "Cuántos grados se cierra la cadera", 15, 90, 1, "fin"]],
		muscleup: [["salida", "Cuánto sales por encima de la barra", 0.03, 0.6, 0.01, "fin"], ["colgado", "Cuánto cuelgas por debajo de las manos", 0.3, 1.6, 0.05, "ini"], ["brazos", "Brazos estirados arriba y abajo", 110, 180, 1, "min"]],
		wipers: [["giro", "Cuánto giran las piernas a cada lado", 0.4, 2.5, 0.05, "fin"]],
		hspu: [["recorrido", "Cuánto baja el hombro hacia el suelo", 0.08, 0.7, 0.01, "fin"], ["cierre", "Cuántos grados se cierra el codo", 15, 100, 1, "fin"]],
		domunamano: [["recorrido", "Cuánto suben los hombros hacia la mano", 0.25, 1.4, 0.05, "fin"], ["cierre", "Cuántos grados se cierra el codo", 15, 90, 1, "fin"], ["libre", "Cuánto más abajo está la mano libre", 0.2, 1.4, 0.05, "min"]],
		frontlever: [["horizontal", "Inclinación máxima del cuerpo", 8, 45, 1, "max"], ["recto", "Cuerpo recto (cadera)", 110, 180, 1, "min"]],
		bandera: [["manos", "Una mano sobre la otra en el poste", 0.4, 2, 0.05, "min"], ["poste", "Las dos manos en la misma vertical", 0.3, 2.5, 0.05, "max"], ["horizontal", "Cuerpo horizontal", 0.1, 0.8, 0.05, "max"]]
	};
	var DEF = {"sentadilla": {"recorrido": 0.32, "cierre": 50}, "sentadillamedia": {"recorrido": 0.15, "cierre": 20}, "pistol": {"recorrido": 0.42, "cierre": 60, "pie": 0.12}, "estocada": {"recorrido": 0.2, "cierre": 40, "separacion": 0.35}, "flexion": {"recorrido": 0.3, "cierre": 55, "tumbado": 35, "recto": 148}, "flexpared": {"recorrido": 0.25, "cierre": 40, "depie": 55}, "flexbanco": {"recorrido": 0.25, "cierre": 40, "min": 34, "max": 62, "recto": 148}, "fondo": {"recorrido": 0.3, "cierre": 50, "vertical": 50}, "remo": {"recorrido": 0.33, "cierre": 55, "minInclin": 8, "maxInclin": 60}, "dominada": {"recorrido": 0.7, "cierre": 55}, "crunch": {"recorrido": 0.16, "cierre": 18}, "piernas": {"recorrido": 0.5, "cierre": 45}, "bisagra": {"recorrido": 0.1, "cierre": 40, "rodillas": 130}, "salto": {"cierre": 35, "altura": 0.1}, "burpee": {"recorrido": 0.35, "suelo": 30, "depie": 70}, "escalador": {"rodilla": 110, "tumbado": 40}, "trote": {"rodilla": 0.35, "centro": 0.12}, "tijera": {"abierto": 1.4, "cerrado": 1.15}, "plancha": {"tumbado": 22, "recto": 150}, "planchabanco": {"min": 10, "max": 58, "recto": 150}, "planchalat": {"inclinacion": 40, "cadera": 0.03}, "hollow": {"tumbado": 28, "despegue": 0.015}, "flexest": {"tumbado": 28, "min": 60, "max": 120}, "silla": {"min": 65, "max": 125, "depie": 55}, "sillaalta": {"min": 95, "max": 150, "depie": 55}, "sillaunpie": {"pie": 0.05, "min": 65, "max": 125, "depie": 55}, "colgado": {"manos": 0.3, "brazos": 145}, "domest": {"menton": 0.015, "codos": 110}, "unpie": {"pie": 0.18, "hombros": 0.08}, "sentado": {"torso": 0.08, "rodillas": 0.55}, "pinza": {"torso": 30, "rodillas": 125}, "sentadillaprofunda": {"recorrido": 0.45, "cierre": 65}, "bulgara": {"recorrido": 0.26, "cierre": 40, "pie": 0.1, "pieMax": 0.45}, "barraspiernas": {"recorrido": 0.55, "cierre": 45}, "muscleup": {"salida": 0.15, "colgado": 0.8, "brazos": 148}, "wipers": {"giro": 1.1}, "hspu": {"recorrido": 0.28, "cierre": 45}, "domunamano": {"recorrido": 0.6, "cierre": 40, "libre": 0.5}, "frontlever": {"horizontal": 22, "recto": 150}, "bandera": {"manos": 0.9, "poste": 1.2, "horizontal": 0.35}};
	window.ArenaPose = { cargar: cargar, Contador: Contador, par: PAR, def: DEF, calibrar: function (o) { CAL = o || {}; }, cal: function () { return CAL; },
		medir: function (t, l, ref) { var R = REGLAS[t]; if (!R || !R.med || !l) return null; try { return R.med(l, R.lado ? ladoDe(l) : null, ref); } catch (e) { return null; } }, regla: function (t) { return REGLAS[t]; }, detecta: function (t) { return !!REGLAS[t]; }, sostenido: function (t) { return !!(REGLAS[t] && REGLAS[t].hold); }, guia: function (t) { return REGLAS[t] ? REGLAS[t].msg : ''; }, grupo: function (t) { return REGLAS[t] ? (REGLAS[t].grupo || '') : ''; }, tipos: function () { return Object.keys(REGLAS); }, vistaTexto: function (t) { var R = REGLAS[t]; if (!R) return ''; if (R.vistaN) return R.vistaN;
		if (typeof R.vista === 'function') return 'de frente, mirando al teléfono'; return { frente: 'de frente a la cámara', diagonal: 'en diagonal, a unos 45° de la cámara', lado: 'de perfil a la cámara' }[R.vista] || ''; }, giro: giroCuerpo, vistaMal: function (t, l, ok) { var R = REGLAS[t]; return R ? vistaMal(R, l, ok) : null; }, vista: function (t) { var R = REGLAS[t]; return R && typeof R.vista === 'string' ? R.vista : (R && R.vista ? 'propia' : ''); }, ang: ang, ladoDe: ladoDe, inclinacion: inclinacion };
})();

/* WOPE Arena · contador con los sensores del teléfono (acelerómetro). Gratis, sin cámara: el teléfono en la mano. */
(function () {
	'use strict';
	var hay = typeof window.DeviceMotionEvent !== 'undefined';
	/* Reglas por ejercicio sobre la aceleración vertical (m/s², hacia arriba +).
	 * baja/sube: umbrales; min: segundos mínimos entre repeticiones. */
	var REGLAS = {
		sentadilla: { u: 1.1, min: 0.9, tipo: 'ciclo' },
		brazos: { u: 1.4, min: 0.6, tipo: 'ciclo' },
		tijera: { u: 5, min: 0.5, tipo: 'pico' },
		rodillas: { u: 2.2, min: 0.22, tipo: 'pico' },
		burpees: { u: 9, min: 1.6, tipo: 'pico' },
		pasos: { u: 1.5, min: 0.28, tipo: 'pico' },
		saltos: { u: 6, min: 0.55, tipo: 'pico' }
	};
	/** Pide permiso (iPhone lo exige y solo desde un toque). */
	function permiso() {
		if (!hay) return Promise.reject(new Error('sin sensores'));
		if (typeof DeviceMotionEvent.requestPermission === 'function') return DeviceMotionEvent.requestPermission().then(function (r) { if (r !== 'granted') throw new Error('denegado'); });
		return Promise.resolve();
	}
	function Contador(tipo, cb) {
		var R = REGLAS[tipo], self = this; this.n = 0; this.vivo = true; this.cb = cb;
		if (!R) { cb(0, 'error', 'Este ejercicio no se cuenta con el teléfono'); return; }
		var g = null, f = 0, fase = 0, ult = 0, sinMov = 0, lleg = false;
		this.h = function (e) {
			if (!self.vivo) return;
			var ag = e.accelerationIncludingGravity; if (!ag || ag.x == null) return;
			lleg = true;
			// gravedad estimada (filtro lento) → dirección "arriba"
			if (!g) g = { x: ag.x, y: ag.y, z: ag.z };
			g.x += (ag.x - g.x) * 0.025; g.y += (ag.y - g.y) * 0.025; g.z += (ag.z - g.z) * 0.025;
			var gl = Math.hypot(g.x, g.y, g.z) || 9.8;
			var lx = ag.x - g.x, ly = ag.y - g.y, lz = ag.z - g.z;
			var v = (lx * g.x + ly * g.y + lz * g.z) / gl; // aceleración vertical sin gravedad
			f += (v - f) * 0.35; // suavizado
			var t = performance.now() / 1000;
			if (self.onNivel) self.onNivel(f);
			if (Math.abs(f) < 0.3) sinMov++; else sinMov = 0;
			if (R.tipo === 'pico') {
				// cada impulso hacia arriba fuerte = 1 repetición
				if (fase === 0 && f > R.u && t - ult > R.min) { fase = 1; ult = t; self.n++; cb(self.n, 'ok'); }
				else if (fase === 1 && f < R.u * 0.4) fase = 0;
			} else {
				// sentadilla: baja (−) → frena y sube (+) → frena arriba (−) = 1 repetición
				if (fase === 0 && f < -R.u) fase = 1;
				else if (fase === 1 && f > R.u) fase = 2;
				else if (fase === 2 && f < -R.u * 0.6 && t - ult > R.min) { fase = 0; ult = t; self.n++; cb(self.n, 'ok'); }
				else if (fase === 2 && f < -R.u * 0.6) fase = 1;
			}
		};
		cb(0, 'cargando', 'Activando los sensores…');
		var arrancar = function (negado) {
			window.addEventListener('devicemotion', self.h);
			cb(0, 'ok', '');
			// Si en 2,5 s no llega ningún dato, el teléfono no los entrega (o se negó el permiso).
			setTimeout(function () { if (self.vivo && !lleg) { self.parar(); cb(self.n, 'error', negado ? 'No se dio permiso para usar los sensores.' : 'Este teléfono no entrega los sensores al navegador.'); } }, 2500);
		};
		permiso().then(function () { arrancar(false); }).catch(function () { arrancar(true); });
	}
	Contador.prototype.parar = function () { this.vivo = false; window.removeEventListener('devicemotion', this.h); };
	window.ArenaSensor = { hay: hay && ('ontouchstart' in window || navigator.maxTouchPoints > 0), Contador: Contador, cuenta: function (t) { return !!REGLAS[t]; } };
})();
