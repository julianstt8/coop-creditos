/*
  01_create_database.sql
  Crea la base de datos del módulo de créditos si no existe.
  El esquema (tablas, índices, restricciones) va en 02_schema.sql.
*/
IF DB_ID(N'CoopCreditos') IS NULL
BEGIN
    CREATE DATABASE CoopCreditos COLLATE Modern_Spanish_CI_AS;
END
GO

USE CoopCreditos;
GO
