-- CreateTable
CREATE TABLE "CheckRun" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "taskId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "input" JSONB,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckFinding" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "projectId" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "requirement" TEXT,
    "evidence" TEXT,
    "suggestion" TEXT,
    "sourceDocumentId" TEXT,
    "metadata" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckFinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CheckRun_projectId_idx" ON "CheckRun"("projectId");

-- CreateIndex
CREATE INDEX "CheckRun_type_idx" ON "CheckRun"("type");

-- CreateIndex
CREATE INDEX "CheckRun_taskId_idx" ON "CheckRun"("taskId");

-- CreateIndex
CREATE INDEX "CheckFinding_runId_idx" ON "CheckFinding"("runId");

-- CreateIndex
CREATE INDEX "CheckFinding_projectId_idx" ON "CheckFinding"("projectId");

-- CreateIndex
CREATE INDEX "CheckFinding_type_idx" ON "CheckFinding"("type");

-- CreateIndex
CREATE INDEX "CheckFinding_category_idx" ON "CheckFinding"("category");

-- CreateIndex
CREATE INDEX "CheckFinding_severity_idx" ON "CheckFinding"("severity");

-- AddForeignKey
ALTER TABLE "CheckRun" ADD CONSTRAINT "CheckRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckFinding" ADD CONSTRAINT "CheckFinding_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CheckRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckFinding" ADD CONSTRAINT "CheckFinding_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
