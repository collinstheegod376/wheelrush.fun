-- ============================================================
-- Wheel Rush — Secure Database Schema
-- ============================================================
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ⚠️  If you already have the old schema, run the migration
--     section at the bottom first.
-- ============================================================

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
  email text NOT NULL,
  username text UNIQUE,
  avatar_url text,
  balance numeric DEFAULT 0 NOT NULL,
  spins integer DEFAULT 0 NOT NULL,
  losses integer DEFAULT 0 NOT NULL,
  agreed_to_terms boolean DEFAULT FALSE NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies (SECURE)
--    Users can read ONLY their own full profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

--    Users can insert their own profile (on first sign-up fallback)
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

--    ❌ NO direct UPDATE policy for users.
--    Balance updates ONLY happen through the spin_wheel() function
--    which runs as SECURITY DEFINER (bypasses RLS).

-- 4. Trigger to auto-create profile on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, balance, spins, losses, agreed_to_terms)
  VALUES (
    new.id, 
    new.email, 
    split_part(new.email, '@', 1), -- Default username to email prefix
    0, 
    0, 
    0, 
    COALESCE((new.raw_user_meta_data->>'agreed_to_terms')::boolean, FALSE)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ============================================================
-- 5. SERVER-SIDE SPIN FUNCTION
--    All game logic runs here. The client CANNOT choose outcomes.
-- ============================================================
CREATE OR REPLACE FUNCTION public.spin_wheel()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with table owner privileges, bypasses RLS
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_balance numeric;
  v_spins integer;
  v_losses integer;

  -- Weighted outcomes: [label, value, weight]
  v_outcomes jsonb := '[
    {"label": "$10B",   "value": 10000000000,  "weight": 0.5,   "icon": "🏆"},
    {"label": "Loss",   "value": -1,           "weight": 7,     "icon": "💀"},
    {"label": "$500k",  "value": 500000,       "weight": 26,    "icon": ""},
    {"label": "$1M",    "value": 1000000,      "weight": 26,    "icon": ""},
    {"label": "$10M",   "value": 10000000,     "weight": 20,    "icon": ""},
    {"label": "$100M",  "value": 100000000,    "weight": 20.45, "icon": ""},
    {"label": "-$1B",   "value": -1000000000,  "weight": 0.05,  "icon": "📉"}
  ]';

  v_total_weight numeric := 0;
  v_random numeric;
  v_cumulative numeric := 0;
  v_selected jsonb;
  v_outcome_value numeric;
  v_outcome_index integer := 0;
  v_new_balance numeric;
  v_new_losses integer;
  v_is_loss boolean := false;
  v_item jsonb;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch current stats (lock the row to prevent race conditions)
  SELECT balance, spins, losses
  INTO v_balance, v_spins, v_losses
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Calculate total weight
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_outcomes)
  LOOP
    v_total_weight := v_total_weight + (v_item->>'weight')::numeric;
  END LOOP;

  -- Pick a random outcome using weighted probability
  v_random := random() * v_total_weight;
  v_cumulative := 0;
  v_outcome_index := 0;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_outcomes)
  LOOP
    v_cumulative := v_cumulative + (v_item->>'weight')::numeric;
    IF v_random <= v_cumulative THEN
      v_selected := v_item;
      EXIT;
    END IF;
    v_outcome_index := v_outcome_index + 1;
  END LOOP;

  -- Fallback: if somehow nothing was selected, pick the last one
  IF v_selected IS NULL THEN
    v_selected := v_outcomes->>(jsonb_array_length(v_outcomes) - 1);
    v_outcome_index := jsonb_array_length(v_outcomes) - 1;
  END IF;

  v_outcome_value := (v_selected->>'value')::numeric;

  -- Apply outcome to balance
  v_new_balance := v_balance;
  v_new_losses := v_losses;

  IF v_outcome_value = -1 THEN
    -- Special "Loss": zero out positive balance, keep debt
    IF v_new_balance > 0 THEN
      v_new_balance := 0;
    END IF;
    v_new_losses := v_new_losses + 1;
    v_is_loss := true;
  ELSIF v_outcome_value < 0 THEN
    -- Negative value (e.g. -$1B)
    v_new_balance := v_new_balance + v_outcome_value;
    v_new_losses := v_new_losses + 1;
    v_is_loss := true;
  ELSE
    -- Win
    v_new_balance := v_new_balance + v_outcome_value;
  END IF;

  -- Update the profile
  UPDATE public.profiles
  SET balance = v_new_balance,
      spins = v_spins + 1,
      losses = v_new_losses
  WHERE id = v_user_id;

  -- Return the result to the client
  RETURN jsonb_build_object(
    'outcome_index', v_outcome_index,
    'label', v_selected->>'label',
    'value', v_outcome_value,
    'icon', v_selected->>'icon',
    'is_loss', v_is_loss,
    'new_balance', v_new_balance,
    'new_spins', v_spins + 1,
    'new_losses', v_new_losses
  );
END;
$$;


-- ============================================================
-- 6. SECURE LEADERBOARD FUNCTION
--    Returns only usernames (not full emails) + balance
--    No email exposure!
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_leaderboard(row_limit integer DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'rank', row_number,
      'username', COALESCE(p.username, split_part(p.email, '@', 1)),
      'avatar_url', p.avatar_url,
      'balance', p.balance
    )
  )
  INTO v_result
  FROM (
    SELECT username, email, avatar_url, balance, ROW_NUMBER() OVER (ORDER BY balance DESC) as row_number
    FROM public.profiles
    WHERE balance >= 0
    ORDER BY balance DESC
    LIMIT row_limit
  ) p;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- 7. STORAGE SETUP
-- Note: Run these lines separately if you get permission errors.
-- These create the avatars bucket and set it to public.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK ( bucket_id = 'avatars' AND auth.uid() = (storage.foldername(name))[1]::uuid );



-- ============================================================
-- MIGRATION: If you already have the old schema, run this FIRST
-- (Drop old conflicting policies before creating new ones)
-- ============================================================
-- DROP POLICY IF EXISTS "Public profiles are viewable by everyone for leaderboard" ON public.profiles;
-- DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
-- DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
-- Then run everything above.
