/* Run once from an account allowed to create databases. */
IF DB_ID(N'HemoTrackDB') IS NULL
BEGIN
    CREATE DATABASE HemoTrackDB;
END;
GO
