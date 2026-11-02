-- =============================================================
-- KiosGo! — esquema de base de datos (estado final)
-- Proyecto Supabase nuevo: ejecutar completo en el SQL Editor.
-- Equivale a los scripts aplicados durante el desarrollo.
-- Orden: tablas -> funciones -> trigger -> RLS -> permisos -> place_order.
-- =============================================================


-- -------------------------------------------------------------
-- 1. TABLAS
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10, 2) NOT NULL,
  image_url TEXT,
  stock INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT products_stock_no_negativo CHECK (stock >= 0)
);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled')),
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- -------------------------------------------------------------
-- 2. FUNCIONES
-- -------------------------------------------------------------

-- Chequeo de admin. SECURITY DEFINER evita la recursión de RLS sobre profiles.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- Crea el perfil al registrarse. El rol SIEMPRE es 'student':
-- nunca se toma de lo que manda el cliente.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'student');
  RETURN new;
END;
$$;

-- Crea un pedido de forma atómica. Valida stock y toma los precios de la base.
-- p_items: [{"product_id": "...", "quantity": 2}, ...]
CREATE OR REPLACE FUNCTION public.place_order(p_items JSONB)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_total    NUMERIC(10,2) := 0;
  v_price    NUMERIC(10,2);
  v_stock    INTEGER;
  v_qty      INTEGER;
  v_pid      UUID;
  item       JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión para hacer un pedido';
  END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'El carrito está vacío';
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_pid := (item->>'product_id')::UUID;
    v_qty := (item->>'quantity')::INTEGER;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Cantidad inválida';
    END IF;
    SELECT price, stock INTO v_price, v_stock
    FROM public.products WHERE id = v_pid AND is_active = true FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Un producto ya no está disponible';
    END IF;
    IF v_stock < v_qty THEN
      RAISE EXCEPTION 'Sin stock suficiente para uno de los productos';
    END IF;
    v_total := v_total + v_price * v_qty;
  END LOOP;

  INSERT INTO public.orders (user_id, total_amount)
  VALUES (auth.uid(), v_total)
  RETURNING id INTO v_order_id;

  FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_pid := (item->>'product_id')::UUID;
    v_qty := (item->>'quantity')::INTEGER;
    SELECT price INTO v_price FROM public.products WHERE id = v_pid;
    INSERT INTO public.order_items (order_id, product_id, quantity, unit_price)
    VALUES (v_order_id, v_pid, v_qty, v_price);
    UPDATE public.products SET stock = stock - v_qty WHERE id = v_pid;
  END LOOP;

  RETURN v_order_id;
END;
$$;

-- Devuelve el stock cuando un pedido pasa a 'cancelled' (solo en la transición, para no devolver dos veces).
CREATE OR REPLACE FUNCTION public.devolver_stock_al_cancelar()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new.status = 'cancelled' AND old.status IS DISTINCT FROM 'cancelled' THEN
    UPDATE public.products p
       SET stock = p.stock + oi.quantity
      FROM public.order_items oi
     WHERE oi.order_id = new.id
       AND oi.product_id = p.id;
  END IF;
  RETURN new;
END;
$$;


-- -------------------------------------------------------------
-- 3. TRIGGER: perfil automático al registrarse
-- -------------------------------------------------------------

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: devolver stock al cancelar un pedido
DROP TRIGGER IF EXISTS trg_devolver_stock_al_cancelar ON public.orders;
CREATE TRIGGER trg_devolver_stock_al_cancelar
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.devolver_stock_al_cancelar();


-- -------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- -------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- profiles: cada uno ve el suyo; el admin ve todos
DROP POLICY IF EXISTS "Perfiles visibles para todos" ON public.profiles;
DROP POLICY IF EXISTS "Ver el propio perfil o ser admin" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios actualizan su propio perfil" ON public.profiles;
CREATE POLICY "Ver el propio perfil o ser admin" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Usuarios actualizan su propio perfil" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- categories: todos leen; el admin gestiona
DROP POLICY IF EXISTS "Categorías visibles para todos" ON public.categories;
DROP POLICY IF EXISTS "Admins gestionan categorías" ON public.categories;
CREATE POLICY "Categorías visibles para todos" ON public.categories
  FOR SELECT USING (true);
CREATE POLICY "Admins gestionan categorías" ON public.categories
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- products: el público ve activos; el admin ve, crea, edita y elimina todo
DROP POLICY IF EXISTS "Permitir lectura de productos activos a todos" ON public.products;
DROP POLICY IF EXISTS "Cualquiera puede ver productos activos" ON public.products;
DROP POLICY IF EXISTS "Admins pueden ver todos los productos" ON public.products;
DROP POLICY IF EXISTS "Productos visibles para todos" ON public.products;
DROP POLICY IF EXISTS "Admins ven todos los productos" ON public.products;
DROP POLICY IF EXISTS "Solo admins pueden insertar productos" ON public.products;
DROP POLICY IF EXISTS "Solo admins pueden actualizar productos" ON public.products;
DROP POLICY IF EXISTS "Admins eliminan productos" ON public.products;
CREATE POLICY "Productos visibles para todos" ON public.products
  FOR SELECT USING (is_active = true);
CREATE POLICY "Admins ven todos los productos" ON public.products
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Solo admins pueden insertar productos" ON public.products
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Solo admins pueden actualizar productos" ON public.products
  FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins eliminan productos" ON public.products
  FOR DELETE USING (public.is_admin());

-- orders: el alumno ve los suyos; el admin ve y actualiza todos.
-- No hay INSERT directo: los pedidos se crean solo con place_order().
DROP POLICY IF EXISTS "Usuarios ven sus propios pedidos" ON public.orders;
DROP POLICY IF EXISTS "Admins ven todos los pedidos" ON public.orders;
DROP POLICY IF EXISTS "Usuarios pueden crear sus propios pedidos" ON public.orders;
DROP POLICY IF EXISTS "Admins actualizan pedidos" ON public.orders;
CREATE POLICY "Usuarios ven sus propios pedidos" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins ven todos los pedidos" ON public.orders
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins actualizan pedidos" ON public.orders
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- order_items: visibles según el pedido padre
DROP POLICY IF EXISTS "Usuarios ven sus propios items" ON public.order_items;
DROP POLICY IF EXISTS "Admins ven todos los items" ON public.order_items;
CREATE POLICY "Usuarios ven sus propios items" ON public.order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid())
  );
CREATE POLICY "Admins ven todos los items" ON public.order_items
  FOR SELECT USING (public.is_admin());


-- -------------------------------------------------------------
-- 5. PERMISOS BASE
-- RLS filtra las filas; estos GRANT habilitan la tabla para el rol logueado.
-- -------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT, UPDATE ON public.orders TO authenticated;
GRANT SELECT ON public.order_items TO authenticated;

-- Nadie cambia su propio rol: el usuario solo puede editar su nombre
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name) ON public.profiles TO authenticated;

-- place_order: solo usuarios logueados
REVOKE ALL ON FUNCTION public.place_order(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_order(JSONB) TO authenticated;


-- -------------------------------------------------------------
-- 6. DATOS DE PRUEBA (opcional, ejecutar una sola vez)
-- -------------------------------------------------------------

-- INSERT INTO public.products (name, description, price, image_url, stock, is_active) VALUES
-- ('Sándwich de Milanesa', 'Pan de miga, milanesa, lechuga y tomate.', 1500, 'https://img.freepik.com/foto-gratis/sandwich-carne-queso-aislado-fondo-blanco_140725-2557.jpg', 20, true),
-- ('Empanada de Carne', 'Empanada casera de carne cortada a cuchillo.', 1200, 'https://img.freepik.com/foto-gratis/empanadas-argentinas_1203-2824.jpg', 15, true),
-- ('Coca Cola 500ml', 'Bebida cola helada.', 1000, 'https://img.freepik.com/foto-gratis/botella-plastico-coca-cola_1203-3747.jpg', 30, true),
-- ('Café Expresso', 'Café de máquina, intenso.', 800, 'https://img.freepik.com/foto-gratis/taza-cafe-espresso-sobre-fondo-blanco_140725-11846.jpg', 50, true);


-- -------------------------------------------------------------
-- 7. CREAR UN ADMIN
-- Hacerlo después de registrar la cuenta desde la app.
-- -------------------------------------------------------------

-- UPDATE public.profiles SET role = 'admin' WHERE email = 'TU_MAIL_ADMIN';
