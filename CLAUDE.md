# KiosGo! — contexto del proyecto

Proyecto final de Construcción de Software (6.º año, EPET 30). Alumno: Aucan Russo (individual).
Entrega: **20/11/2026**. Defensa y justificación: las hace el alumno.
Consigna completa: ver `README.md` cuando exista (requisitos mínimos, APK, web pública, entrega).

## Idea

App de pre-pedido para kioscos escolares: el alumno reserva desde el celular, retira en el kiosco y paga allí, fuera de la app. El admin ve los pedidos en orden cronológico y cambia su estado. Pago con Mercado Pago **fuera de alcance** (acordado).

## Stack

- Expo SDK 58 (`expo ~58.0.19`), expo-router 58, React Native 0.88.0, React 19.3.0.
- Supabase (Postgres + Auth + RLS). Backend as a service: permitido porque el proyecto es individual.
- Cliente: `@supabase/supabase-js`, sesión en AsyncStorage.
- Repo: https://github.com/Aucan-10/KiosGO- (rama de trabajo: `feature/fase1-pedidos`).

## Estructura

- `app/`: pantallas (expo-router). `_layout.tsx` con `AuthProvider` + `CartProvider` + `AuthGate`.
  - `index.tsx` menú, `cart.tsx` carrito, `orders.tsx` mis pedidos, `login.tsx`, `register.tsx`.
  - `admin/orders.tsx` pedidos (admin), `admin/products.tsx` lista de productos (admin), `admin/product.tsx` alta/edición.
- `context/AuthContext.tsx`: sesión, perfil y `isAdmin`. `context/CartContext.tsx`: carrito en memoria con tope de stock.
- `lib/supabase.ts`: cliente; lanza error si faltan las variables `EXPO_PUBLIC_*`.
- `lib/types.ts`: tipos, etiquetas de estado (`STATUS_LABELS`, `NEXT_STATUSES`), formatos.
- `eas.json`: perfil `preview` (APK interno, `environment: preview`).

Nota: AGENTS.md pide leer la documentación de Expo de la versión instalada antes de escribir código de Expo (`https://docs.expo.dev/versions/v58.0.0/`).

## Base de datos (Supabase)

Tablas: `profiles` (id = auth.users.id, `role` student|admin), `categories`, `products` (`stock >= 0`, `is_active`), `orders` (status: pending, preparing, ready, delivered, cancelled; `payment_status` sin uso por ahora), `order_items` (`unit_price` congelado al momento del pedido).

- Trigger `handle_new_user`: crea el perfil siempre con rol `student`. **El rol nunca se toma del cliente.**
- `is_admin()`: función `SECURITY DEFINER` usada en todas las políticas de admin.
- Función `place_order(p_items jsonb)`: valida stock y calcula precios en el servidor, crea el pedido y descuenta stock. La app solo manda `product_id` y `quantity`. Permiso: solo `authenticated`.
- Permisos base (`GRANT`) para `authenticated` sobre products, categories, profiles, orders y order_items. RLS filtra las filas.
- Un admin se asigna con `UPDATE profiles SET role = 'admin' WHERE email = '...'` desde el SQL Editor.
- Baja de producto = `is_active = false`. No se borran productos con pedidos (`ON DELETE RESTRICT`).

Pendiente: guardar todos los SQL de configuración en `supabase/schema.sql` para la entrega.

## Comandos

```bash
npm install --legacy-peer-deps     # ver nota de react-dom abajo
npx expo start -c                  # dev server; -c limpia caché (las variables se incrustan al compilar)
npx tsc --noEmit                   # typecheck (debe pasar antes de cada commit)
npx eas-cli@latest build --platform android --profile preview   # APK en la nube
```

Variables: `.env` en la raíz (no se commitea), copiado de `.env.example` con URL y anon key de Supabase. Nunca usar la `service_role` key. Para EAS, las mismas variables se cargan con `eas env:create --environment preview ... --visibility plaintext`.

## Estado

Hecho y probado por el alumno en Expo Go:
- Login, registro, logout y guard de rutas; sesión persistente.
- Menú con stock; carrito con tope; reserva con `place_order`.
- Mis pedidos; panel admin de pedidos con cambios de estado.
- ABM de productos (alta, edición, activar/desactivar).

Pendiente, en orden:
1. Build del APK con EAS y prueba en Android.
2. Devolver stock al cancelar un pedido (trigger en SQL).
3. Recuperar y restablecer contraseña. Configurar URLs de redirección en Supabase Auth y probar en el APK (en Expo Go el redirect cambia).
4. Pantalla de cuenta: ver y editar nombre, cambiar contraseña, cerrar sesión.
5. Tema oscuro (hoy las pantallas tienen fondos blancos fijos; `app.json` tiene `userInterfaceStyle: automatic`).
6. Validaciones y mensajes de error pulidos.
7. Web pública: página con descripción, descarga/QR del APK, instrucciones de uso y usuarios de prueba (HTML estático).
8. `README.md` con instalación, acceso, usuarios de prueba y tecnologías; y `supabase/schema.sql`.

Fuera de alcance por ahora: eliminar cuenta (CU09, requiere Edge Function), social login, notificaciones push, IA y datos biométricos (el alumno los deja para más adelante; el profesor debe estar informado).

## Problemas conocidos

- `react@19.3.0` y `react-dom@19.3.1` no son compatibles según npm: por eso se instala con `--legacy-peer-deps`. Corregir con `npx expo install react-dom react` cuando haya conexión a la API de Expo.
- `KiosGO.zip` está commiteado en `main`. Sacarlo del repo (`git rm --cached`) y agregarlo al `.gitignore`.
- La anon key de Supabase estuvo versionada en `.env` en commits anteriores. Ya no se trackea, pero quedó en el historial: conviene rotarla desde el panel de Supabase.
- Cancelar un pedido no devuelve stock (ver pendiente 2).
- Pedidos viejos con un producto desactivado muestran "Producto" porque RLS oculta los inactivos a los alumnos.
- El carrito no persiste si se cierra la app.

## Reglas de trabajo

- Commit y push solo cuando el alumno lo pida. Mensajes de commit en español, con el trailer `Co-Authored-By` y `Claude-Session` según la configuración del entorno.
- Cambios de base de datos: escribir el SQL, mostrarlo al alumno y que lo ejecute él en el SQL Editor. Luego sumarlo a `supabase/schema.sql`.
- No agregar funcionalidades fuera de la consigna sin acordarlo con el alumno; las que excedan la consigna se informan al profesor.
