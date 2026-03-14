# 🧃 Tere Sales App

Aplicación web full-stack para gestionar visitas y ventas a negocios (almacenes, minimarkets, etc.).

## Stack técnico

- **Backend**: Node.js + Express + Prisma ORM + SQLite
- **Frontend**: React + Vite + TailwindCSS + React Leaflet
- **Auth**: JWT
- **DB**: SQLite (archivo local `backend/dev.db`)

---

## Inicio rápido

### 1. Requisitos previos
- Node.js >= 18
- npm >= 9

### 2. Instalación completa (primera vez)

```bash
# Instalar todas las dependencias
npm run install:all

# Aplicar migraciones (crea la base de datos)
npm run migrate

# Crear usuario admin y datos de ejemplo
npm run seed
```

O en un solo comando:
```bash
npm run setup
```

### 3. Correr en desarrollo

```bash
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

### 4. Credenciales iniciales

| Rol       | Email              | Contraseña |
|-----------|--------------------|------------|
| Admin     | admin@tere.com     | admin123   |
| Vendedor  | tere@tere.com      | tere123    |

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
