# Sendero 3D

E-commerce de productos impresos en 3D — figuras, katanas, accesorios y objetos decorativos inspirados en anime, cine, series y videojuegos.

## Stack

- **Frontend:** Next.js + React + Tailwind CSS + Framer Motion
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **Pagos:** MercadoPago + Transferencia bancaria
- **Deploy:** Vercel

## Setup local

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## Variables de entorno

Copiar `.env.example` a `.env.local` y completar:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MERCADOPAGO_ACCESS_TOKEN=
NEXT_PUBLIC_WHATSAPP_NUMBER=
```
