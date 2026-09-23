-- ============================================================
-- Schema for the app's OWN database. Nothing here touches the
-- hospital's live database — this is a separate database you
-- fully own and control.
-- ============================================================

CREATE TABLE VisitQueueStatus (
  VisitNo                   VARCHAR(20) PRIMARY KEY,
  PatientNo                  VARCHAR(20) NOT NULL,
  FirstSeenAt                 DATETIME NOT NULL,
  TotalTestsOrdered           INT NOT NULL DEFAULT 0,
  TotalTestsCompleted         INT NOT NULL DEFAULT 0,
  Status                      VARCHAR(20) NOT NULL DEFAULT 'TRACKING',
  -- TRACKING, READY, QUEUED, CLEARED
  RequestingStaffNo           VARCHAR(20) NULL,
  RequestingServicePointID    VARCHAR(20) NULL,
  TokenNo                     VARCHAR(20) NULL,
  QueuedAt                    DATETIME NULL
);

CREATE TABLE LabQueueTestTracking (
  TrackingID         BIGINT IDENTITY PRIMARY KEY,
  VisitNo              VARCHAR(20) NOT NULL,
  SpecimenNo           VARCHAR(20) NOT NULL,
  TestCode             VARCHAR(20) NOT NULL,
  DummyTestNo          VARCHAR(20) NOT NULL,
  RequiresApproval      BIT NOT NULL,
  Status                VARCHAR(20) NOT NULL DEFAULT 'ORDERED',
  -- ORDERED, RESULTED, APPROVED
  ResultCapturedAt      DATETIME NULL,
  CreatedAt             DATETIME NOT NULL DEFAULT GETDATE(),
  CONSTRAINT UQ_SpecimenTest UNIQUE (SpecimenNo, TestCode)
);

CREATE SEQUENCE seq_DummyTestNo AS INT START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_TokenNo      AS INT START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_TokenID      AS INT START WITH 1 INCREMENT BY 1;

-- Rooms lookup, mirrored from the hospital's Rooms table via the
-- read-only sync so the display API can resolve room names without
-- querying the hospital DB on every screen refresh.
CREATE TABLE RoomsCache (
  RoomNo     VARCHAR(20) PRIMARY KEY,
  RoomName   VARCHAR(50) NOT NULL,
  UpdatedAt  DATETIME NOT NULL DEFAULT GETDATE()
);
