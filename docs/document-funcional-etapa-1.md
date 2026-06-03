# Document funcional — Etapa 1 Mini Wikiloc

## 1. Objectiu de la pantalla

Crear una pantalla mòbil per seguir l’Etapa 1 de la Senda de Camille:

**Somport / Aysa → Refugi d’Arlet**

La pantalla ha de permetre:

- veure el mapa de l’etapa,
- veure el track GPX,
- veure la ubicació actual,
- consultar el perfil d’altitud,
- moure el dit pel perfil i veure el punt corresponent al mapa,
- funcionar sense cobertura amb mapa offline.

Aquesta pantalla serà la base per replicar després les altres 4 etapes.

---

## 2. Funcions exactes

La pantalla només ha de tenir aquestes funcions:

1. Mapa de l’etapa.
2. Mapa offline.
3. Track GPX en color taronja.
4. Zoom i moviment del mapa.
5. Ubicació actual en blau.
6. Botó per centrar el mapa en la ubicació actual.
7. Perfil d’altitud inferior.
8. Marcador sincronitzat entre perfil i mapa.
9. Dades del punt seleccionat:
   - quilòmetre,
   - altitud.

No afegir cap altra funció.

---

## 3. Layout visual

La pantalla ha de ser mobile-first.

Estructura:

1. **Header superior**
   - Color verd.
   - Botó enrere.
   - Títol: `ETAPA 1 · SOMPORT - ARLET`
   - Indicador discret d’offline.

2. **Mapa**
   - Ha d’ocupar la major part de la pantalla.
   - Ha de mostrar el track taronja.
   - Ha de mostrar inici i final.
   - Ha de mostrar la ubicació actual si està disponible.
   - Ha de tenir botó flotant per centrar ubicació.
   - Ha de permetre zoom.

3. **Panell inferior**
   - Fons blanc.
   - Cantonades superiors arrodonides.
   - Perfil d’altitud.
   - Indicadors de km i altitud.
   - Interacció tàctil.

---

## 4. Mapa

Utilitzar Leaflet.

El mapa ha de carregar tiles locals offline de l’Etapa 1.

Ruta esperada dels tiles:

```text
public/tiles/etapa-1/{z}/{x}/{y}.png
```

o:

```text
public/tiles/etapa-1/{z}/{x}/{y}.jpg
```

El mapa ha de poder:

- fer zoom,
- moure’s amb el dit,
- ajustar-se inicialment als límits del GPX,
- mostrar el track,
- mostrar ubicació actual,
- mostrar el punt seleccionat del perfil.

---

## 5. GPX

Fitxer:

```text
gpx/etapa-1-somport-arlet.gpx
```

El GPX és la font de veritat.

S’ha d’utilitzar per:

- dibuixar la ruta,
- calcular la distància acumulada,
- generar el perfil d’altitud,
- obtenir les coordenades del marcador del perfil,
- marcar inici i final.

---

## 6. Perfil d’altitud

El perfil s’ha de generar a partir del GPX.

No utilitzar l’altitud crua directament.

Cal generar punts processats amb:

- latitud,
- longitud,
- distància acumulada en km,
- altitud original,
- altitud suavitzada.

El perfil ha de ser clar, net i usable amb el dit.

---

## 7. Interacció perfil-mapa

Quan l’usuari toca o arrossega el dit pel perfil:

1. es mostra una línia vertical al perfil,
2. s’actualitza el km seleccionat,
3. s’actualitza l’altitud seleccionada,
4. es mou un marcador al mapa,
5. el marcador queda situat sobre el punt corresponent del track.

El marcador del mapa ha d’utilitzar els mateixos punts processats del perfil.

---

## 8. Ubicació actual

Utilitzar la Geolocation API.

La ubicació actual ha de mostrar-se com un punt blau.

Ha d’haver-hi un botó flotant per centrar el mapa en la ubicació actual.

Si no hi ha permisos o el GPS falla:

- no bloquejar la pantalla,
- mantenir mapa i perfil funcionant,
- mostrar un missatge discret.

---

## 9. Offline

L’Etapa 1 ha de funcionar sense cobertura.

Ha d’estar disponible offline:

- codi de la pantalla,
- GPX,
- dades processades del perfil,
- tiles locals del mapa,
- estils,
- icones necessàries.

El mode offline s’ha de provar en mode avió.

---

## 10. Estil visual

El mockup de referència és:

```text
mockup/etapa-1-mobile-mockup.png
```

Criteris visuals:

- capçalera verda,
- mapa gran,
- track taronja,
- ubicació actual en blau,
- panell inferior blanc,
- perfil taronja,
- botons flotants mínims,
- estil net, premium i pràctic.

No copiar el mockup píxel a píxel, però mantenir la mateixa intenció visual.

---

## 11. No implementar

No implementar:

- altres etapes,
- brúixola,
- alertes de desviació,
- gravació de ruta,
- estadístiques avançades,
- login,
- backend,
- notificacions,
- compartir ubicació,
- menús complexos,
- rutes alternatives.

---

## 12. Criteri d’èxit

La pantalla es considera correcta si:

1. obre bé en mòbil,
2. mostra el mapa offline,
3. mostra el track taronja,
4. permet zoom,
5. permet moure el mapa,
6. mostra inici i final,
7. mostra ubicació actual,
8. el botó de centrar ubicació funciona,
9. el perfil d’altitud es veu clar,
10. el perfil és tàctil,
11. en arrossegar el perfil es mou el marcador al mapa,
12. mostra km i altitud del punt seleccionat,
13. funciona en Android,
14. funciona en iPhone,
15. funciona en mode avió després de preparar l’offline.

---

## 13. Filosofia

Aquesta pantalla no vol ser Wikiloc complet.

Ha de ser una eina simple, fiable i útil per seguir una etapa concreta.

Regla principal:

**Mapa offline + GPX + GPS + perfil + sincronització. Res més.**