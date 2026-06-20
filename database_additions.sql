-- Wheel Rush - SQL Additions / Migration Patch
-- Apply this after the base schema if you want only the changes introduced later.

-- Add last_spin_at to profiles if it does not exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_spin_at timestamp with time zone;

-- Replace trigger with collision-resistant username generation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_prefix text;
  v_suffix text;
  v_username text;
BEGIN
  v_prefix := split_part(new.email, '@', 1);
  v_suffix := substring(replace(new.id::text, '-', '') from 1 for 8);
  v_username := left(v_prefix, 16) || '_' || v_suffix;

  INSERT INTO public.profiles (id, email, username, balance, spins, losses, agreed_to_terms)
  VALUES (
    new.id,
    new.email,
    v_username,
    0,
    0,
    0,
    COALESCE((new.raw_user_meta_data->>'agreed_to_terms')::boolean, FALSE)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Replace spin function with server-side cooldown, terms enforcement, and non-negative balance floor
CREATE OR REPLACE FUNCTION public.spin_wheel()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_balance numeric;
  v_spins integer;
  v_losses integer;
  v_last_spin_at timestamp with time zone;
  v_outcomes jsonb := '[
    {"label": "$10B",   "value": 10000000000,  "weight": 0.5,   "icon": "🏆"},
    {"label": "Loss",    "value": -1,          "weight": 7,     "icon": "💀"},
    {"label": "$500k",   "value": 500000,      "weight": 26,    "icon": ""},
    {"label": "$1M",     "value": 1000000,     "weight": 26,    "icon": ""},
    {"label": "$10M",    "value": 10000000,    "weight": 20,    "icon": ""},
    {"label": "$100M",   "value": 100000000,   "weight": 20.45, "icon": ""},
    {"label": "-$1B",    "value": -1000000000, "weight": 0.05,  "icon": "📉"}
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
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT balance, spins, losses, last_spin_at
  INTO v_balance, v_spins, v_losses, v_last_spin_at
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_last_spin_at IS NOT NULL AND timezone('utc'::text, now()) < v_last_spin_at + interval '1500 milliseconds' THEN
    RAISE EXCEPTION 'Spin cooldown active';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = v_user_id
      AND agreed_to_terms = TRUE
  ) THEN
    RAISE EXCEPTION 'Terms must be accepted';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_outcomes)
  LOOP
    v_total_weight := v_total_weight + (v_item->>'weight')::numeric;
  END LOOP;

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

  IF v_selected IS NULL THEN
    v_selected := v_outcomes->(jsonb_array_length(v_outcomes) - 1);
    v_outcome_index := jsonb_array_length(v_outcomes) - 1;
  END IF;

  v_outcome_value := (v_selected->>'value')::numeric;
  v_new_balance := v_balance;
  v_new_losses := v_losses;

  IF v_outcome_value = -1 THEN
    IF v_new_balance > 0 THEN
      v_new_balance := 0;
    END IF;
    v_new_losses := v_new_losses + 1;
    v_is_loss := true;
  ELSIF v_outcome_value < 0 THEN
    v_new_balance := GREATEST(v_new_balance + v_outcome_value, 0);
    v_new_losses := v_new_losses + 1;
    v_is_loss := true;
  ELSE
    v_new_balance := v_new_balance + v_outcome_value;
  END IF;

  UPDATE public.profiles
  SET balance = v_new_balance,
      spins = v_spins + 1,
      losses = v_new_losses,
      last_spin_at = timezone('utc'::text, now())
  WHERE id = v_user_id;

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

-- Replace leaderboard function with row-limit clamp
CREATE OR REPLACE FUNCTION public.get_leaderboard(row_limit integer DEFAULT 10)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_limit integer := LEAST(GREATEST(COALESCE(row_limit, 10), 1), 50);
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'rank', row_number,
      'username', COALESCE(p.username, split_part(p.email, '@', 1)),
      'avatar_url', p.avatar_url,
      'balance', p.balance
    )
  ) INTO v_result
  FROM (
    SELECT username, email, avatar_url, balance, ROW_NUMBER() OVER (ORDER BY balance DESC) as row_number
    FROM public.profiles
    WHERE balance >= 0
    ORDER BY balance DESC
    LIMIT v_limit
  ) p;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Replace profile update function with validation
CREATE OR REPLACE FUNCTION public.update_user_profile(
  new_username text DEFAULT NULL,
  new_avatar_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF new_username IS NOT NULL THEN
    IF char_length(new_username) < 3 OR char_length(new_username) > 24 THEN
      RAISE EXCEPTION 'Username must be between 3 and 24 characters';
    END IF;

    IF new_username !~ '^[A-Za-z0-9_]+$' THEN
      RAISE EXCEPTION 'Username can only contain letters, numbers, and underscores';
    END IF;
  END IF;

  UPDATE public.profiles
  SET
    username = COALESCE(new_username, username),
    avatar_url = COALESCE(new_avatar_url, avatar_url)
  WHERE id = v_user_id;
END;
$$;

-- Permissions
REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT, INSERT ON public.profiles TO authenticated;

REVOKE ALL ON FUNCTION public.spin_wheel() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_leaderboard(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_user_profile(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.spin_wheel() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_profile(text, text) TO authenticated;

