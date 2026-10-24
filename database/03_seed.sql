/* ============================================================================
   03_seed.sql
   Datos iniciales y de demostración para CoopCréditos SAS (Sector Financiero Solidario)
   Permite validar inmediatamente el Dashboard, Listados y flujo de auditoría.
   ============================================================================ */

USE CoopCreditos;
GO

-- ----------------------------------------------------------------------------
-- 1. Inserción de Asociados de Demostración
-- ----------------------------------------------------------------------------
SET IDENTITY_INSERT dbo.Asociados ON;

IF NOT EXISTS (SELECT 1 FROM dbo.Asociados WHERE id = 1)
BEGIN
    INSERT INTO dbo.Asociados (id, identificacion, nombreCompleto, email, telefono, direccion, activo, fechaCreacion, fechaActualizacion)
    VALUES 
    (1, N'1001234567', N'Juan Pérez Gómez', N'juan.perez@correo.com', N'3001234567', N'Calle 45 # 12-34, Bogotá', 1, DATEADD(MONTH, -6, SYSUTCDATETIME()), SYSUTCDATETIME()),
    (2, N'1002345678', N'María Camila Restrepo', N'maria.restrepo@correo.com', N'3109876543', N'Carrera 15 # 85-20, Medellín', 1, DATEADD(MONTH, -5, SYSUTCDATETIME()), SYSUTCDATETIME()),
    (3, N'1003456789', N'Carlos Eduardo López', N'carlos.lopez@correo.com', N'3154567890', N'Avenida 6N # 23-45, Cali', 1, DATEADD(MONTH, -4, SYSUTCDATETIME()), SYSUTCDATETIME()),
    (4, N'1004567890', N'Ana Lucía Morales', N'ana.morales@correo.com', N'3182345678', N'Calle 72 # 54-10, Barranquilla', 1, DATEADD(MONTH, -3, SYSUTCDATETIME()), SYSUTCDATETIME()),
    (5, N'1005678901', N'David Fernando Rojas', N'david.rojas@correo.com', N'3207890123', N'Carrera 7 # 32-15, Bucaramanga', 1, DATEADD(MONTH, -2, SYSUTCDATETIME()), SYSUTCDATETIME());
END

SET IDENTITY_INSERT dbo.Asociados OFF;
GO

-- ----------------------------------------------------------------------------
-- 2. Inserción de Créditos en Diferentes Estados del Ciclo de Vida
-- ----------------------------------------------------------------------------
SET IDENTITY_INSERT dbo.Creditos ON;

IF NOT EXISTS (SELECT 1 FROM dbo.Creditos WHERE id = 1)
BEGIN
    INSERT INTO dbo.Creditos (
        id, numeroCredito, idAsociado, identificacionAsociado, nombreAsociado, tipoCredito,
        valorSolicitado, tasaInteres, numeroCuotas, formaPago, estado,
        fechaSolicitud, fechaActualizacion, isDeleted
    )
    VALUES
    -- 1. Solicitud nueva
    (1, 'CR-2026-000001', 1, N'1001234567', N'Juan Pérez Gómez', 'LIBRE_INVERSION', 
     15000000.00, 1.45, 36, 'NOMINA', 'SOLICITADO', 
     DATEADD(DAY, -2, SYSUTCDATETIME()), DATEADD(DAY, -2, SYSUTCDATETIME()), 0),

    -- 2. En estudio por analista de crédito
    (2, 'CR-2026-000002', 2, N'1002345678', N'María Camila Restrepo', 'EDUCATIVO', 
     8000000.00, 1.15, 24, 'VENTANILLA', 'EN_ESTUDIO', 
     DATEADD(DAY, -5, SYSUTCDATETIME()), DATEADD(DAY, -3, SYSUTCDATETIME()), 0),

    -- 3. Aprobado listo para legalización
    (3, 'CR-2026-000003', 3, N'1003456789', N'Carlos Eduardo López', 'VEHICULO', 
     45000000.00, 1.30, 60, 'DEBITO_AUTOMATICO', 'APROBADO', 
     DATEADD(DAY, -10, SYSUTCDATETIME()), DATEADD(DAY, -1, SYSUTCDATETIME()), 0),

    -- 4. Rechazado por capacidad de endeudamiento
    (4, 'CR-2026-000004', 4, N'1004567890', N'Ana Lucía Morales', 'LIBRE_INVERSION', 
     30000000.00, 1.50, 48, 'NOMINA', 'RECHAZADO', 
     DATEADD(DAY, -15, SYSUTCDATETIME()), DATEADD(DAY, -12, SYSUTCDATETIME()), 0),

    -- 5. Desembolsado con recursos girados
    (5, 'CR-2026-000005', 5, N'1005678901', N'David Fernando Rojas', 'VIVIENDA', 
     90000000.00, 0.95, 120, 'DEBITO_AUTOMATICO', 'DESEMBOLSADO', 
     DATEADD(DAY, -30, SYSUTCDATETIME()), DATEADD(DAY, -20, SYSUTCDATETIME()), 0);
END

SET IDENTITY_INSERT dbo.Creditos OFF;
GO

-- ----------------------------------------------------------------------------
-- 3. Historial de Auditoría Financiera (Trazabilidad)
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM dbo.HistorialCredito WHERE idCredito = 1)
BEGIN
    -- Historial Crédito 1: Recién solicitado
    INSERT INTO dbo.HistorialCredito (idCredito, estadoAnterior, estadoNuevo, usuario, observacion, fechaCambio)
    VALUES (1, NULL, 'SOLICITADO', N'PORTAL_ASOCIADO', N'Radicación inicial de crédito por canal web', DATEADD(DAY, -2, SYSUTCDATETIME()));

    -- Historial Crédito 2: Radicado y pasado a estudio
    INSERT INTO dbo.HistorialCredito (idCredito, estadoAnterior, estadoNuevo, usuario, observacion, fechaCambio)
    VALUES 
    (2, NULL, 'SOLICITADO', N'PORTAL_ASOCIADO', N'Radicación de crédito educativo', DATEADD(DAY, -5, SYSUTCDATETIME())),
    (2, 'SOLICITADO', 'EN_ESTUDIO', N'analista_credito@coopcreditos.com', N'Documentación completa verificada. En análisis de capacidad de pago', DATEADD(DAY, -3, SYSUTCDATETIME()));

    -- Historial Crédito 3: Radicado, pasado a estudio y aprobado
    INSERT INTO dbo.HistorialCredito (idCredito, estadoAnterior, estadoNuevo, usuario, observacion, fechaCambio)
    VALUES 
    (3, NULL, 'SOLICITADO', N'ASESOR_COMERCIAL', N'Radicación en sucursal principal', DATEADD(DAY, -10, SYSUTCDATETIME())),
    (3, 'SOLICITADO', 'EN_ESTUDIO', N'analista_credito@coopcreditos.com', N'Validación en centrales de riesgo favorable (Score 820)', DATEADD(DAY, -7, SYSUTCDATETIME())),
    (3, 'EN_ESTUDIO', 'APROBADO', N'comite_credito@coopcreditos.com', N'Aprobado en Acta de Comité #2026-42 sin codeudor requerido', DATEADD(DAY, -1, SYSUTCDATETIME()));

    -- Historial Crédito 4: Radicado, estudiado y rechazado
    INSERT INTO dbo.HistorialCredito (idCredito, estadoAnterior, estadoNuevo, usuario, observacion, fechaCambio)
    VALUES 
    (4, NULL, 'SOLICITADO', N'PORTAL_ASOCIADO', N'Solicitud libre inversión', DATEADD(DAY, -15, SYSUTCDATETIME())),
    (4, 'SOLICITADO', 'EN_ESTUDIO', N'analista_credito@coopcreditos.com', N'Revisión de desprendibles de pago', DATEADD(DAY, -14, SYSUTCDATETIME())),
    (4, 'EN_ESTUDIO', 'RECHAZADO', N'comite_credito@coopcreditos.com', N'Capacidad de endeudamiento superada (DTI > 50% según política de riesgo)', DATEADD(DAY, -12, SYSUTCDATETIME()));

    -- Historial Crédito 5: Ciclo completo hasta desembolso
    INSERT INTO dbo.HistorialCredito (idCredito, estadoAnterior, estadoNuevo, usuario, observacion, fechaCambio)
    VALUES 
    (5, NULL, 'SOLICITADO', N'PORTAL_ASOCIADO', N'Solicitud para compra de vivienda de interés social', DATEADD(DAY, -30, SYSUTCDATETIME())),
    (5, 'SOLICITADO', 'EN_ESTUDIO', N'analista_credito@coopcreditos.com', N'Estudio de títulos y avalúo comercial aprobados', DATEADD(DAY, -27, SYSUTCDATETIME())),
    (5, 'EN_ESTUDIO', 'APROBADO', N'comite_credito@coopcreditos.com', N'Aprobación con hipoteca en primer grado', DATEADD(DAY, -24, SYSUTCDATETIME())),
    (5, 'APROBADO', 'DESEMBOLSADO', N'tesoreria@coopcreditos.com', N'Transferencia electrónica ACH efectuada a cuenta del constructor', DATEADD(DAY, -20, SYSUTCDATETIME()));
END
GO

-- ----------------------------------------------------------------------------
-- 4. Registro Demo de Notificación Webhook
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM dbo.WebhookLogs WHERE idCredito = 1)
BEGIN
    INSERT INTO dbo.WebhookLogs (
        eventId, idCredito, url, requestPayload, responseStatus, responseBody, exitoso, intentos, error, fechaCreacion
    )
    VALUES (
        'evt_8f7d9c12-45e3-4b8a-9f12-000000000001',
        1,
        'https://sistema-externo.com/webhooks/creditos',
        N'{"event":"credito.creado","eventId":"evt_8f7d9c12-45e3-4b8a-9f12-000000000001","timestamp":"2026-10-16T10:00:00.000Z","data":{"id":1,"numeroCredito":"CR-2026-000001","identificacionAsociado":"1001234567","valorSolicitado":15000000.00,"estado":"SOLICITADO"}}',
        200,
        N'{"status":"received","message":"Notificación procesada exitosamente"}',
        1,
        1,
        NULL,
        DATEADD(DAY, -2, SYSUTCDATETIME())
    );
END
GO
