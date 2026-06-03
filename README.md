# Mini Wikiloc — Senda de Camille

## Objectiu

Crear una pantalla mòbil tipus Wikiloc simplificat per seguir una etapa de la Senda de Camille.

Aquest primer desenvolupament implementa només:

**Etapa 1 · Somport / Aysa → Arlet**

Però aquesta etapa ha d’estar completa i ben feta.

Si l’Etapa 1 funciona correctament, després es replicarà el mateix sistema a les altres 4 etapes.

---

## Funcions obligatòries de l’Etapa 1

La pantalla ha d’incloure només:

1. Mapa de l’etapa.
2. Mapa disponible offline.
3. Track GPX dibuixat sobre el mapa.
4. Zoom i desplaçament del mapa.
5. Ubicació actual de l’usuari.
6. Botó per centrar el mapa en la ubicació actual.
7. Perfil d’altitud.
8. Interacció perfil-mapa:
   - quan l’usuari arrossega el dit pel perfil,
   - es mou un marcador al punt corresponent del mapa.
9. Dades bàsiques del punt seleccionat:
   - quilòmetre,
   - altitud.

Res més.

---

## No afegir

No implementar:

- altres etapes encara,
- brúixola,
- alertes de desviació,
- gravació de ruta,
- estadístiques avançades,
- login,
- backend,
- compartir ubicació,
- notificacions,
- comunitat,
- xat,
- rutes alternatives,
- panells extra,
- menús complexos.

La regla és:

**Mapa offline + GPX + GPS + perfil + sincronització. Res més.**

---

## Fitxers de referència

### Mockup visual

```text
mockup/etapa-1-mobile-mockup.png
```

Aquest mockup és la referència visual.

No cal copiar-lo píxel a píxel, però la pantalla ha de seguir aquesta idea:

- capçalera verda
- mapa gran
- track taronja
- ubicació actual en blau
- perfil inferior blanc
- controls mínims
- estil net i premium

### GPX

```text
gpx/etapa-1-somport-arlet.gpx
```

El GPX és la font principal de la ruta.

S’ha d’utilitzar per:

- dibuixar el track,
- calcular distància acumulada,
- generar el perfil d’altitud,
- sincronitzar perfil i mapa,
- marcar inici i final.

---

## Estructura recomanada de carpetes

```text
mini-wikiloc/
│
├── README.md
│
├── mockup/
│   └── etapa-1-mobile-mockup.png
│
├── gpx/
│   └── etapa-1-somport-arlet.gpx
│
├── tiles/
│   └── etapa-1/
│       └── aquí aniran els tiles offline
│
└── docs/
    └── document-funcional-etapa-1.md
```

---

## Mapa

Utilitzar Leaflet.

El mapa ha de permetre:

- zoom,
- arrossegar el mapa,
- veure el track,
- veure la ubicació actual,
- centrar el mapa en la ubicació actual.

El track s’ha de dibuixar en color taronja i ha de ser clarament visible.

---

## Mapa offline

L’Etapa 1 ha de funcionar sense cobertura.

Per aquesta primera versió s’han d’utilitzar tiles locals només de la zona de l’Etapa 1.

Estructura recomanada:

```text
public/tiles/etapa-1/{z}/{x}/{y}.png
```

o:

```text
public/tiles/etapa-1/{z}/{x}/{y}.jpg
```

El codi ha d’estar preparat per carregar aquests tiles locals amb Leaflet.

No utilitzar el fitxer `.rmap` directament.

Si encara no hi ha tiles offline definitius, deixar igualment l’estructura preparada i documentada, però l’objectiu final d’aquesta etapa és que el mapa funcioni offline.

---

## Ubicació actual

Utilitzar la Geolocation API del navegador.

La ubicació actual s’ha de mostrar com un punt blau sobre el mapa.

Ha d’existir un botó flotant per centrar el mapa en la ubicació actual.

Si l’usuari no dona permisos o el GPS no està disponible:

- el mapa ha de continuar funcionant,
- el perfil ha de continuar funcionant,
- s’ha de mostrar un avís discret.

---

## Perfil d’altitud

El perfil s’ha de generar a partir del GPX.

No utilitzar l’altitud crua sense tractar.

Crear una versió suavitzada/resamplejada amb punts que continguin:

- latitud,
- longitud,
- distància acumulada en km,
- altitud original,
- altitud suavitzada.

El perfil ha de ser tàctil i usable en mòbil.

---

## Sincronització perfil-mapa

Quan l’usuari toca o arrossega el dit pel perfil:

- apareix una línia vertical al perfil,
- s’actualitza el km seleccionat,
- s’actualitza l’altitud seleccionada,
- es mou un marcador al mapa sobre el punt corresponent de la ruta.

El marcador del mapa ha de sortir dels mateixos punts processats del perfil per evitar desajustos.

---

## Disseny

Pantalla mobile-first.

Estructura visual:

1. Header superior verd.
2. Mapa ocupant la major part de la pantalla.
3. Botons flotants mínims.
4. Panell inferior blanc amb perfil d’altitud.
5. Informació compacta de km i altitud.

No afegir navegació inferior ni panells secundaris.

---

## Criteri d’èxit

L’Etapa 1 es considera correcta si:

1. es pot obrir en mòbil,
2. el mapa es veu correctament,
3. el mapa funciona offline,
4. el track taronja es veu clar,
5. es pot fer zoom,
6. es pot moure el mapa,
7. es veu la ubicació actual,
8. el botó de centrar ubicació funciona,
9. el perfil d’altitud és clar,
10. en arrossegar el perfil, el marcador es mou al mapa,
11. funciona en Android,
12. funciona en iPhone,
13. funciona en mode avió després d’haver preparat l’offline.

---

## Filosofia

No volem construir Wikiloc complet.

Volem construir una pantalla perfecta per seguir una etapa concreta.

Primer es fa molt bé l’Etapa 1.

Després, si funciona, es replica a les altres 4.

La regla principal és:

**Mapa offline + GPX + GPS + perfil + sincronització. Res més.**