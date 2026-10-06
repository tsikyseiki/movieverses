CREATE TABLE public.gemini_key_usage (
  key_name text NOT NULL,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  ok_count int NOT NULL DEFAULT 0,
  quota_count int NOT NULL DEFAULT 0,
  error_count int NOT NULL DEFAULT 0,
  last_status text,
  last_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key_name, day)
);
GRANT SELECT ON public.gemini_key_usage TO authenticated;
GRANT ALL ON public.gemini_key_usage TO service_role;
ALTER TABLE public.gemini_key_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read key usage" ON public.gemini_key_usage FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_gemini_usage(_key text, _status text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.gemini_key_usage(key_name, ok_count, quota_count, error_count, last_status)
  VALUES (_key, (_status='ok')::int, (_status='quota')::int, (_status='error')::int, _status)
  ON CONFLICT (key_name, day) DO UPDATE SET
    ok_count = gemini_key_usage.ok_count + (_status='ok')::int,
    quota_count = gemini_key_usage.quota_count + (_status='quota')::int,
    error_count = gemini_key_usage.error_count + (_status='error')::int,
    last_status = _status, last_at = now();
$$;
REVOKE ALL ON FUNCTION public.log_gemini_usage(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_gemini_usage(text, text) TO service_role;