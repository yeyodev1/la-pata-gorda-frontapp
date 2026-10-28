# La Pata Gorda · App

Frontend de La Pata Gorda: **tienda en línea** para clientes y **panel** para el equipo. Vue 3 + Vite + Pinia + SCSS, servido como estáticos en Cloudflare Workers.

## Tienda (pública, sin sesión)
- `/tienda`: menú con fotos por categoría, elección de local por ciudad, retiro o domicilio, opciones por plato (base, término, extras), carrito guardado en el navegador.
- `/tienda/checkout`: datos del cliente, dirección, hora, forma de pago (tarjeta por Payphone, pago en local o efectivo al recibir).
- `/tienda/pedido/:code`: seguimiento del pedido en vivo.
- `/tienda/reservar`: reserva de mesa (mesas privadas con confirmación del local).

## Panel (con sesión)
Pantalla de pedidos de la tienda (suena al llegar uno), ventas del día, inventario y conteo, pedidos al centro de producción con sugerencia automática, plan de producción, existencias por lugar, compras, reservas, WhatsApp, reseñas, menú y recetas, insumos, proveedores, locales, equipo, configuración, bitácora, reportes y asistente.

## Correr en local
```bash
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:8400/api
npm run dev            # http://localhost:5190
```

## Desplegar en Cloudflare
```bash
npm run cf:deploy      # usa .env.production (VITE_API_URL del API en Workers)
```
