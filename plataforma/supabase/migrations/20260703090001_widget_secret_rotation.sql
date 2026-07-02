-- Bloco 6.3 — Rotação da chave/segredo do widget com convivência (antiga + nova).
-- Ao rotacionar, o segredo atual (cifrado) é copiado para key_secret_prev_hash e um
-- novo é gerado em key_secret_hash. O bloco 7 (verificação HMAC) aceita ambos durante
-- a janela de convivência (até secret_rotated_at + prazo), depois o antigo é descartado.

alter table public.systems
  add column if not exists key_secret_prev_hash text,
  add column if not exists secret_rotated_at timestamptz;
