# KiosGo!

App de pre-pedido para kioscos escolares. El alumno reserva desde el celular, pasa a retirar por el kiosco y paga allí. El administrador ve los pedidos en orden cronológico y cambia su estado.

Proyecto final de Construcción de Software (6.º año, EPET N.º 30, 2026).
Alumno: Aucan Russo. Profesor: Cristian Alarcón.

## Funcionalidades

- Registro, inicio y cierre de sesión, con sesión persistente.
- Menú de productos con imagen, precio y stock.
- Carrito con tope de stock, que se actualiza en tiempo real.
- Reserva de pedido (la validación de stock y los precios se calculan en el servidor).
- "Mis pedidos" para el alumno.
- Panel de administración: pedidos en orden cronológico y cambio de estado (recibido, en preparación, preparado, entregado, cancelado).
- ABM de productos para el administrador (alta, edición, activar o desactivar).
- Al cancelar un pedido se devuelve el stock de los productos.

El pago no se hace dentro de la app: se realiza con Mercado Pago en el kiosco, al retirar el pedido.

## Tecnologías

- React Native con Expo SDK 58 y expo-router.
- Supabase: Postgres, autenticación, RLS y funciones SQL.
- `@supabase/supabase-js` con sesión guardada en AsyncStorage.
- EAS Build para generar el APK de Android.

## Requisitos

- Node.js (versión LTS).
- Cuenta en Expo (para EAS Build) y un proyecto en Supabase.
- Para probar en el celular: la app Expo Go.

## Instalación

```bash
git clone https://github.com/Aucan-10/KiosGO-.git
cd KiosGO-
npm install --legacy-peer-deps
```

`--legacy-peer-deps` es necesario porque `react` y `react-dom` tienen versiones que npm marca como incompatibles.

## Variables de entorno

Copiá `.env.example` como `.env` en la raíz del proyecto y completá:

```
EXPO_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>
```

El archivo `.env` no se sube al repositorio. Nunca se usa la `service_role` key en la app.

## Base de datos

Los scripts SQL de configuración están en la carpeta `supabase/`. Se ejecutan en el SQL Editor de Supabase.

Tablas principales: `profiles`, `categories`, `products`, `orders` y `order_items`. Los precios se guardan al momento del pedido (`unit_price`), y el rol de cada usuario se controla desde el servidor con RLS.

Para asignar el rol de administrador a una cuenta ya registrada:

```sql
UPDATE profiles SET role = 'admin' WHERE email = '<email>';
```

## Ejecutar en desarrollo

```bash
npx expo start -c
```

Escaneá el código QR con Expo Go. La opción `-c` limpia la caché, porque las variables `EXPO_PUBLIC_*` se incorporan al compilar.

Para verificar tipos antes de cada commit:

```bash
npx tsc --noEmit
```

## Generar el APK

```bash
npx eas-cli@latest build --platform android --profile preview
```

El build se hace en la nube de Expo. Al terminar, EAS entrega el enlace para descargar el APK. Las variables de entorno para EAS se cargan con `eas env:create --environment preview`.

## Usuarios de prueba

| Rol | Email | Contraseña |
|---|---|---|
| Alumno | [email-alumno] | [consultar al alumno] |
| Administrador | [email-admin] | [consultar al alumno] |

## Estado del proyecto

Funcionalidades terminadas y probadas en Expo Go. Pendientes:

- Build del APK y prueba en Android.
- Recuperación y restablecimiento de contraseña.
- Pantalla de cuenta (ver y editar datos, cambiar contraseña).
- Tema oscuro.
- Validaciones y mensajes de error.
- Página web pública con descarga del APK.

Fuera del alcance de esta versión: eliminar cuenta, inicio de sesión con redes sociales, notificaciones push, pagos dentro de la app e inteligencia artificial.

## Licencia

Ver el archivo [LICENSE](LICENSE).
