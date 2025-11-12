-- Create enum for flow status if it does not already exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FlowStatus') THEN
    CREATE TYPE "FlowStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DISABLED');
  END IF;
END$$;

-- Create new Flow tables if they do not exist
CREATE TABLE IF NOT EXISTS "Flow" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "FlowStatus" NOT NULL DEFAULT 'DRAFT',
  "manifest" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Flow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FlowNode" (
  "id" TEXT NOT NULL,
  "flowId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "position" JSONB NOT NULL,
  CONSTRAINT "FlowNode_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FlowNode_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "FlowNode_flowId_idx" ON "FlowNode"("flowId");

CREATE TABLE IF NOT EXISTS "FlowEdge" (
  "id" TEXT NOT NULL,
  "flowId" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "label" TEXT,
  CONSTRAINT "FlowEdge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FlowEdge_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "FlowEdge_flowId_idx" ON "FlowEdge"("flowId");

-- Prepare EmailTemplate for new structure
ALTER TABLE "EmailTemplate" DROP CONSTRAINT IF EXISTS "EmailTemplate_flowId_fkey";
DROP INDEX IF EXISTS "EmailTemplate_flowId_idx";

ALTER TABLE "EmailTemplate"
  ADD COLUMN IF NOT EXISTS "mjml" TEXT NOT NULL DEFAULT '<mjml><mj-body></mj-body></mjml>',
  ADD COLUMN IF NOT EXISTS "html" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "meta" JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE "EmailTemplate"
  ALTER COLUMN "mjml" DROP DEFAULT,
  ALTER COLUMN "html" DROP DEFAULT,
  ALTER COLUMN "meta" DROP DEFAULT;

ALTER TABLE "EmailTemplate"
  DROP COLUMN IF EXISTS "subject",
  DROP COLUMN IF EXISTS "manifest",
  DROP COLUMN IF EXISTS "flowId";

DROP TABLE IF EXISTS "MarketingFlow";

