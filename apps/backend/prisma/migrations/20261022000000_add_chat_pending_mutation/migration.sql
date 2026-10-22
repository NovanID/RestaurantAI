ALTER TABLE "chat_sessions"
  ADD COLUMN "pending_mutation" JSONB,
  ADD COLUMN "pending_mutation_expires_at" TIMESTAMPTZ;
