# 🧃 Tere Sales App

Aplicación web full-stack para gestionar visitas y ventas a negocios (almacenes, minimarkets, etc.).

## Stack técnico

- **Backend**: Node.js + Express + Prisma ORM
- **Frontend**: React + Vite + TailwindCSS + React Leaflet
- **Auth**: JWT
- **DB**: PostgreSQL (Neon en producción, `backend/.env` → `DATABASE_URL`)
- **Deploy**: Vercel (`api/index.js` como función serverless + frontend estático)

---

## Inicio rápido

### 1. Requisitos previos
- Node.js >= 18
- npm >= 9

### 2. Instalación completa (primera vez)

```bash
# Instalar dependencias (raíz + frontend)
npm install
npm install --prefix frontend

# Copiar la plantilla de variables de entorno y completar DATABASE_URL
cp backend/.env.example backend/.env

# Aplicar migraciones (crea las tablas)
npm run migrate

# Crear los usuarios base
npm run seed
```

### 3. Correr en desarrollo

```bash
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

### 4. Credenciales iniciales

| Rol        | Email              | Contraseña  |
|------------|--------------------|-------------|
| Admin      | admin@allice.cl    | admin123    |
| Vendedor   | teresa@allice.cl   | tere123     |
| Producción | eduardo@allice.cl  | eduardo123  |

---

## Build de producción

```bash
# 1. Build del frontend
npm run build

# 2. Migrar base de datos en producción
npm run migrate:prod

# 3. Iniciar servidor (sirve el frontend también)
npm run start
```

El backend sirve el frontend compilado en modo producción desde `http://localhost:3001`.

---

## Mantenimiento de la base de datos

Todos estos comandos leen `DATABASE_URL` de `backend/.env`. Para apuntar a
producción, exporta la variable antes de ejecutarlos:

```bash
export DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
export DIRECT_URL="$DATABASE_URL"
```

### Reseteo de kilos y ventas

Por defecto borra **solo el movimiento** —kilos cargados, pedidos, visitas y
cierres de mes— y **conserva los contactos**: los negocios con sus teléfonos,
direcciones y persona a cargo, el historial de WhatsApp y los usuarios con sus
contraseñas actuales.

```bash
npm run reset:db                  # muestra qué borraría, NO borra
npm run reset:db -- --confirm     # kilos, pedidos, visitas y cierres a 0
```

Opciones adicionales, todas se combinan con `--confirm`:

| Opción | Efecto |
|--------|--------|
| `--conservar-visitas` | No borra el historial de visitas |
| `--borrar-contactos`  | Borra también el historial de contactos de WhatsApp |
| `--borrar-negocios`   | Borra también los negocios; se llevan por delante sus visitas, pedidos y contactos de WhatsApp (clave foránea) |
| `--incluir-usuarios`  | Borra también los usuarios y los recrea desde el seed |

Sin `--confirm` el script solo diagnostica y muestra la lista de lo que se borra
y lo que se conserva. Es **irreversible**: si hay algo que rescatar, saca
respaldo antes (en Neon: *Branches* → crear una rama desde el punto actual).

### Preparación de la base en cada deploy

`vercel-build` no llama a `prisma migrate deploy` directamente, sino a
`backend/scripts/deploy-db.js`, que hace cuatro cosas en orden:

1. **Destraba migraciones fallidas.** Si una migración queda en estado *failed*,
   Prisma aborta con `P3009` y no aplica ninguna de las siguientes, así que el
   build entero se cae. El script marca como aplicadas solo las migraciones de
   una lista blanca de idempotentes (las escritas con `IF NOT EXISTS` / `DO $$`).
   Cualquier otra migración fallida **detiene el deploy**: destrabar el init a
   ciegas escondería un problema real.
2. `prisma migrate deploy`.
3. **Red de seguridad**: reaplica la reparación de `LoteProduccion`, por si una
   migración quedó marcada como aplicada sin haber corrido de verdad.
4. Seed de usuarios base.

Es idempotente: en una base sana no cambia nada.

### Reparar el esquema a mano

Si al registrar una carga a congeladora aparece *"La base de datos tiene el
esquema desactualizado"* y no quieres esperar a un deploy:

```bash
npm run repair:schema -- --dry-run   # solo diagnostica
npm run repair:schema                # normaliza LoteProduccion y prueba un INSERT
```

### Cambiar la contraseña del admin

```bash
node backend/scripts/reset-admin.js <nueva_contraseña>
```

## Estructura del proyecto

```
tere-sales/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    ← Modelos de base de datos
│   │   └── seed.js          ← Datos iniciales
│   ├── src/
│   │   ├── controllers/     ← Lógica de negocio
│   │   ├── middleware/      ← Autenticación JWT
│   │   ├── routes/          ← Endpoints API
│   │   └── index.js         ← Punto de entrada Express
│   ├── .env                 ← Variables de entorno
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/             ← Cliente HTTP (Axios)
│   │   ├── components/      ← Componentes reutilizables
│   │   ├── context/         ← Auth context
│   │   ├── pages/           ← Pantallas de la app
│   │   └── App.jsx
│   ├── index.html
│   └── package.json
└── package.json             ← Scripts raíz
```

---

## API Endpoints

### Auth
| Método | Ruta            | Descripción         |
|--------|-----------------|---------------------|
| POST   | /api/auth/login | Login (devuelve JWT)|
| GET    | /api/auth/me    | Usuario actual      |

### Negocios
| Método | Ruta                       | Descripción               |
|--------|----------------------------|---------------------------|
| GET    | /api/businesses            | Listar (con ?q=busqueda)  |
| GET    | /api/businesses/upcoming   | Próximas visitas          |
| GET    | /api/businesses/:id        | Detalle con historial     |
| POST   | /api/businesses            | Crear                     |
| PUT    | /api/businesses/:id        | Editar                    |
| DELETE | /api/businesses/:id        | Eliminar                  |

### Visitas
| Método | Ruta                                | Descripción     |
|--------|-------------------------------------|-----------------|
| GET    | /api/businesses/:id/visits          | Historial       |
| POST   | /api/businesses/:id/visits          | Registrar       |

### Pedidos
| Método | Ruta                                | Descripción     |
|--------|-------------------------------------|-----------------|
| GET    | /api/businesses/:id/orders          | Por negocio     |
| GET    | /api/orders                         | Todos           |
| POST   | /api/businesses/:id/orders          | Crear           |
| PUT    | /api/orders/:id                     | Actualizar      |

### Reportes
| Método | Ruta                           | Descripción            |
|--------|--------------------------------|------------------------|
| GET    | /api/reports/summary?period=   | Semana/mes             |
| GET    | /api/reports/compare           | Comparar rangos        |

---

## Variables de entorno (backend/.env)

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="tu-clave-secreta-muy-larga"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=development
```

---

## Docker (opcional)

```dockerfile
# Dockerfile simplificado
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm run install:all
RUN npm run migrate:prod
RUN npm run build
EXPOSE 3001
CMD ["npm", "run", "start"]
```

---

## Pantallas de la app

| Pantalla     | Ruta           | Descripción                              |
|--------------|----------------|------------------------------------------|
| Login        | /login         | Autenticación mobile-first               |
| Negocios     | /              | Lista con búsqueda y estadísticas rápidas|
| Nuevo negocio| /businesses/new| Formulario con GPS                       |
| Detalle      | /businesses/:id| Visitas, pedidos, WhatsApp, Maps         |
| Mapa         | /map           | Leaflet + OpenStreetMap con marcadores   |
| Próximas     | /upcoming      | Negocios a visitar en próximos X días    |
| Reportes     | /reports       | Resumen semanal/mensual + comparación    |
| Pedidos      | /orders        | Lista global con filtros y estados       |
