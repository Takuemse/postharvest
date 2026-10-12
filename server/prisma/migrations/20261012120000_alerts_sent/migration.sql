-- CreateTable
CREATE TABLE "alerts_sent" (
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_sent_pkey" PRIMARY KEY ("key")
);

-- No policies: only the server (which bypasses RLS) may touch this table.
ALTER TABLE "alerts_sent" ENABLE ROW LEVEL SECURITY;
