-- Fix DKEGL authentication by creating user profile trigger and admin setup

-- First, let's create a default DKEGL organization if it doesn't exist
INSERT INTO public.dkegl_organizations (name, code, address, is_active)
SELECT 'DK Enterprises Gujarat Limited', 'DKEGL', 'Gujarat, India', true
WHERE NOT EXISTS (SELECT 1 FROM public.dkegl_organizations WHERE code = 'DKEGL');

-- Create trigger function to handle new user signups
CREATE OR REPLACE FUNCTION public.dkegl_handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_id UUID;
  user_role dkegl_user_role := 'viewer'::dkegl_user_role;
BEGIN
  -- Get the DKEGL organization ID
  SELECT id INTO org_id FROM public.dkegl_organizations WHERE code = 'DKEGL' LIMIT 1;
  
  -- Check if this is the admin email
  IF NEW.email = 'info@dkenterprises.co.in' THEN
    user_role := 'admin'::dkegl_user_role;
  END IF;

  -- Create user profile
  INSERT INTO public.dkegl_user_profiles (
    user_id,
    organization_id,
    full_name,
    email,
    is_active
  ) VALUES (
    NEW.id,
    org_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    true
  );

  -- Assign user role
  INSERT INTO public.dkegl_user_roles (
    user_id,
    organization_id,
    role
  ) VALUES (
    NEW.id,
    org_id,
    user_role
  );

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS dkegl_on_auth_user_created ON auth.users;
CREATE TRIGGER dkegl_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.dkegl_handle_new_user();

-- Now manually fix the existing admin user if they exist
DO $$
DECLARE
  admin_user_id UUID;
  org_id UUID;
BEGIN
  -- Get the DKEGL organization ID
  SELECT id INTO org_id FROM public.dkegl_organizations WHERE code = 'DKEGL' LIMIT 1;
  
  -- Find the admin user
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'info@dkenterprises.co.in'
  LIMIT 1;

  IF admin_user_id IS NOT NULL AND org_id IS NOT NULL THEN
    -- Delete existing records if any
    DELETE FROM public.dkegl_user_roles WHERE user_id = admin_user_id;
    DELETE FROM public.dkegl_user_profiles WHERE user_id = admin_user_id;
    
    -- Create user profile
    INSERT INTO public.dkegl_user_profiles (
      user_id,
      organization_id,
      full_name,
      email,
      is_active
    ) VALUES (
      admin_user_id,
      org_id,
      'DKEGL Administrator',
      'info@dkenterprises.co.in',
      true
    );

    -- Assign admin role
    INSERT INTO public.dkegl_user_roles (
      user_id,
      organization_id,
      role
    ) VALUES (
      admin_user_id,
      org_id,
      'admin'::dkegl_user_role
    );
  END IF;
END $$;