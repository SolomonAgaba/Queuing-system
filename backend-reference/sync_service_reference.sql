-- ============================================================
-- REFERENCE ONLY. These are SELECT-only queries meant to run on a
-- schedule (every 5-10s) against the hospital's live database using
-- a read-only login. Nothing here writes to the hospital database.
--
-- The sync service that runs these should:
--   1. Run each SELECT below against the hospital DB (read-only).
--   2. Write the results into YOUR OWN database (see
--      own_database_schema.sql), never back into the hospital DB.
--   3. Ideally point at a reporting/read-replica of the hospital DB
--      if one exists, to avoid any load on the live transactional
--      system.
--
-- Required grants on the hospital DB: SELECT only, on:
--   Visits, LabRequests, LabRequestDetails, LabResults, LabTests,
--   DoctorVisits, Services, Rooms, Staff
-- No CREATE, INSERT, UPDATE, or ALTER rights needed anywhere.
--
-- Open items still pending confirmation from the hospital's team
-- (see README.md "Open items"):
--   - Exact ApprovedStatusID value that means "approved"
--   - Whether a requesting doctor keeps a fixed room/ServiceCode
--     for the whole day
-- ============================================================

-- STEP A: pick up any visits not seen yet
-- SELECT v.VisitNo, v.PatientNo, GETDATE() AS FirstSeenAt
-- FROM Visits v
-- WHERE v.VisitNo NOT IN (SELECT VisitNo FROM <your_own_db>.VisitQueueStatus);

-- STEP B: register newly ordered tests
SELECT lr.VisitNo, lrd.SpecimenNo, lrd.TestCode, lt.RequiresResultsApproval
FROM LabRequestDetails lrd
JOIN LabRequests lr ON lr.SpecimenNo = lrd.SpecimenNo
JOIN LabTests lt    ON lt.TestCode   = lrd.TestCode;
-- write new (SpecimenNo, TestCode) pairs into LabQueueTestTracking,
-- stamping a DummyTestNo from your own seq_DummyTestNo

-- STEP C: which ordered tests now have a (approved, if required) result
SELECT lrd.SpecimenNo, lrd.TestCode, res.RecordDateTime, res.ApprovedStatusID
FROM LabRequestDetails lrd
JOIN LabResults res ON res.SpecimenNo = lrd.SpecimenNo AND res.TestCode = lrd.TestCode;
-- mark matching LabQueueTestTracking rows APPROVED in your own DB

-- STEP D: capture the requesting doctor ONCE, at order time, so results
-- always route back to the same doctor regardless of later changes
SELECT lr.VisitNo, dv.StaffNo, s.ServicePointID
FROM LabRequests lr
JOIN DoctorVisits dv ON dv.VisitNo = lr.VisitNo AND dv.Closed = 0
JOIN Services s      ON s.ServiceCode = dv.ServiceCode;
-- store StaffNo + ServicePointID against VisitQueueStatus.VisitNo in
-- your own DB, only if not already set

-- STEP E: which rooms are active today (drives how many columns the
-- display shows — this is the "self-adjusting" room count)
-- run against YOUR OWN DB, not the hospital DB:
-- SELECT DISTINCT RequestingServicePointID
-- FROM VisitQueueStatus
-- WHERE CAST(FirstSeenAt AS DATE) = CAST(GETDATE() AS DATE)
--   AND Status IN ('TRACKING','READY','QUEUED');

-- STEP F: refresh the room name cache (occasional, e.g. once an hour)
SELECT RoomNo, RoomName FROM Rooms;
