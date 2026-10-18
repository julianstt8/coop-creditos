/* ============================================================================
   02_schema.sql
   Módulo de Créditos - OPA SAS (Sector Financiero Solidario)
   
   Justificación del Diseño:
   1. Llaves Primarias y Foráneas:
      - Todas las tablas usan llaves primarias subrogadas IDENTITY INT para
        máxima eficiencia en índices clustered y joins relacionales.
      - Llaves foráneas con integridad referencial estricta (ON DELETE NO ACTION)
        para preservar la inmutabilidad y trazabilidad financiera.
   2. Tipos de Datos Financieros:
      - Se utiliza DECIMAL(18,2) para montos monetarios (valorSolicitado),
        evitando errores de redondeo inherentes a float/double.
      - Se utiliza DECIMAL(5,2) para tasas de interés porcentuales.
   3. Restricciones (CHECK & UNIQUE):
      - valorSolicitado > 0, tasaInteres >= 0, numeroCuotas > 0.
      - Enumeraciones estrictas de estados, tipos de crédito y formas de pago.
      - Unicidad en numeroCredito e identificacion de asociados.
   4. Manejo de Fechas y Tiempos:
      - DATETIME2(7) con SYSUTCDATETIME() para evitar inconsistencias de zona horaria.
   5. Auditoría y Trazabilidad:
      - HistorialCredito registra cada cambio de estado de forma append-only.
      - WebhookLogs almacena el ciclo de vida de las notificaciones salientes.
   6. Borrado Lógico:
      - Se implementa isDeleted BIT en Creditos para retención documental.
   ============================================================================ */

USE OpaCreditos;
GO

-- ----------------------------------------------------------------------------
-- 1. Tabla de Asociados
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.Asociados', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Asociados (
        id INT IDENTITY(1,1) NOT NULL,
        identificacion NVARCHAR(20) NOT NULL,
        nombreCompleto NVARCHAR(150) NOT NULL,
        email NVARCHAR(100) NULL,
        telefono NVARCHAR(20) NULL,
        direccion NVARCHAR(200) NULL,
        activo BIT NOT NULL CONSTRAINT DF_Asociados_activo DEFAULT 1,
        fechaCreacion DATETIME2(7) NOT NULL CONSTRAINT DF_Asociados_fechaCreacion DEFAULT SYSUTCDATETIME(),
        fechaActualizacion DATETIME2(7) NOT NULL CONSTRAINT DF_Asociados_fechaActualizacion DEFAULT SYSUTCDATETIME(),

        CONSTRAINT PK_Asociados PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UQ_Asociados_identificacion UNIQUE (identificacion)
    );
END
GO

-- ----------------------------------------------------------------------------
-- 2. Tabla de Créditos
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.Creditos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Creditos (
        id INT IDENTITY(1,1) NOT NULL,
        numeroCredito VARCHAR(25) NOT NULL,
        idAsociado INT NOT NULL,
        identificacionAsociado NVARCHAR(20) NOT NULL,
        nombreAsociado NVARCHAR(150) NOT NULL,
        tipoCredito VARCHAR(30) NOT NULL,
        valorSolicitado DECIMAL(18,2) NOT NULL,
        tasaInteres DECIMAL(5,2) NOT NULL,
        numeroCuotas INT NOT NULL,
        formaPago VARCHAR(30) NOT NULL,
        estado VARCHAR(20) NOT NULL CONSTRAINT DF_Creditos_estado DEFAULT 'SOLICITADO',
        fechaSolicitud DATETIME2(7) NOT NULL CONSTRAINT DF_Creditos_fechaSolicitud DEFAULT SYSUTCDATETIME(),
        fechaActualizacion DATETIME2(7) NOT NULL CONSTRAINT DF_Creditos_fechaActualizacion DEFAULT SYSUTCDATETIME(),
        isDeleted BIT NOT NULL CONSTRAINT DF_Creditos_isDeleted DEFAULT 0,
        deletedAt DATETIME2(7) NULL,

        CONSTRAINT PK_Creditos PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UQ_Creditos_numeroCredito UNIQUE (numeroCredito),
        CONSTRAINT FK_Creditos_Asociados FOREIGN KEY (idAsociado)
            REFERENCES dbo.Asociados (id) ON DELETE NO ACTION,

        CONSTRAINT CK_Creditos_valorSolicitado CHECK (valorSolicitado > 0),
        CONSTRAINT CK_Creditos_tasaInteres CHECK (tasaInteres >= 0),
        CONSTRAINT CK_Creditos_numeroCuotas CHECK (numeroCuotas > 0),
        CONSTRAINT CK_Creditos_estado CHECK (
            estado IN ('SOLICITADO', 'EN_ESTUDIO', 'APROBADO', 'RECHAZADO', 'DESEMBOLSADO', 'CANCELADO')
        ),
        CONSTRAINT CK_Creditos_tipoCredito CHECK (
            tipoCredito IN ('LIBRE_INVERSION', 'VIVIENDA', 'EDUCATIVO', 'VEHICULO', 'CALAMIDAD', 'COMERCIAL')
        ),
        CONSTRAINT CK_Creditos_formaPago CHECK (
            formaPago IN ('NOMINA', 'VENTANILLA', 'DEBITO_AUTOMATICO')
        )
    );
END
GO

-- ----------------------------------------------------------------------------
-- 3. Tabla de Historial de Cambios (Auditoría Financiera)
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.HistorialCredito', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.HistorialCredito (
        id INT IDENTITY(1,1) NOT NULL,
        idCredito INT NOT NULL,
        estadoAnterior VARCHAR(20) NULL,
        estadoNuevo VARCHAR(20) NOT NULL,
        usuario NVARCHAR(100) NOT NULL CONSTRAINT DF_HistorialCredito_usuario DEFAULT 'SISTEMA',
        observacion NVARCHAR(500) NULL,
        fechaCambio DATETIME2(7) NOT NULL CONSTRAINT DF_HistorialCredito_fechaCambio DEFAULT SYSUTCDATETIME(),

        CONSTRAINT PK_HistorialCredito PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_HistorialCredito_Creditos FOREIGN KEY (idCredito)
            REFERENCES dbo.Creditos (id) ON DELETE CASCADE,
        CONSTRAINT CK_HistorialCredito_estadoNuevo CHECK (
            estadoNuevo IN ('SOLICITADO', 'EN_ESTUDIO', 'APROBADO', 'RECHAZADO', 'DESEMBOLSADO', 'CANCELADO')
        )
    );
END
GO

-- ----------------------------------------------------------------------------
-- 4. Tabla de Trazabilidad de Webhooks
-- ----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.WebhookLogs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.WebhookLogs (
        id INT IDENTITY(1,1) NOT NULL,
        eventId VARCHAR(64) NOT NULL,
        idCredito INT NOT NULL,
        url NVARCHAR(500) NOT NULL,
        requestPayload NVARCHAR(MAX) NOT NULL,
        responseStatus INT NULL,
        responseBody NVARCHAR(MAX) NULL,
        exitoso BIT NOT NULL CONSTRAINT DF_WebhookLogs_exitoso DEFAULT 0,
        intentos INT NOT NULL CONSTRAINT DF_WebhookLogs_intentos DEFAULT 1,
        error NVARCHAR(MAX) NULL,
        fechaCreacion DATETIME2(7) NOT NULL CONSTRAINT DF_WebhookLogs_fechaCreacion DEFAULT SYSUTCDATETIME(),

        CONSTRAINT PK_WebhookLogs PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_WebhookLogs_Creditos FOREIGN KEY (idCredito)
            REFERENCES dbo.Creditos (id) ON DELETE CASCADE
    );
END
GO

-- ----------------------------------------------------------------------------
-- 5. Índices de Rendimiento
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Creditos_identificacionAsociado' AND object_id = OBJECT_ID('dbo.Creditos'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Creditos_identificacionAsociado
    ON dbo.Creditos (identificacionAsociado)
    INCLUDE (estado, valorSolicitado, fechaSolicitud, isDeleted);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Creditos_estado' AND object_id = OBJECT_ID('dbo.Creditos'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Creditos_estado
    ON dbo.Creditos (estado)
    INCLUDE (valorSolicitado, isDeleted);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Creditos_fechaSolicitud' AND object_id = OBJECT_ID('dbo.Creditos'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Creditos_fechaSolicitud
    ON dbo.Creditos (fechaSolicitud DESC)
    INCLUDE (numeroCredito, identificacionAsociado, estado, valorSolicitado, isDeleted);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_HistorialCredito_idCredito' AND object_id = OBJECT_ID('dbo.HistorialCredito'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_HistorialCredito_idCredito
    ON dbo.HistorialCredito (idCredito, fechaCambio ASC);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_WebhookLogs_idCredito' AND object_id = OBJECT_ID('dbo.WebhookLogs'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_WebhookLogs_idCredito
    ON dbo.WebhookLogs (idCredito, fechaCreacion DESC);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_WebhookLogs_eventId' AND object_id = OBJECT_ID('dbo.WebhookLogs'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_WebhookLogs_eventId
    ON dbo.WebhookLogs (eventId);
END
GO
