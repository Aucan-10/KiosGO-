-- =============================================================
-- KiosGo! — migración: foto de perfil, curso y modo oscuro (perfil)
-- Ejecutar UNA SOLA VEZ en un proyecto Supabase que ya existe.
-- (En un proyecto nuevo alcanza con schema.sql, que ya incluye esto.)
-- =============================================================

-- 1. Columnas nuevas en profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS curso TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_path TEXT;

-- 2. Permisos: el alumno puede editar nombre, curso y foto (nunca el rol)
GRANT UPDATE (full_name, curso, avatar_path) ON public.profiles TO authenticated;

-- 3. Bucket privado para las fotos
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatares', 'avatares', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Políticas: cada uno en su carpeta; el admin puede ver todas
DROP POLICY IF EXISTS "Ver fotos de perfil propias o ser admin" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios suben su propia foto" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios actualizan su propia foto" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios eliminan su propia foto" ON storage.objects;

CREATE POLICY "Ver fotos de perfil propias o ser admin" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avatares'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );
CREATE POLICY "Usuarios suben su propia foto" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatares' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Usuarios actualizan su propia foto" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatares' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Usuarios eliminan su propia foto" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatares' AND (storage.foldername(name))[1] = auth.uid()::text
  );
