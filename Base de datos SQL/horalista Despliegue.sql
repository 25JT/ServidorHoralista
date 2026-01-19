-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 26-08-2025 a las 18:28:19
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `horalista`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `agenda`
--

CREATE TABLE `agenda` (
  `id` char(36) NOT NULL,
  `id_pservicio` char(36) NOT NULL,
  `id_usuario_cliente` char(36) NOT NULL,
  `fecha` date NOT NULL,
  `hora` time NOT NULL,
  `estado` enum('pendiente','confirmada','cancelada','completada') DEFAULT 'pendiente',
  `notas` text DEFAULT NULL,
  `recordatorio_enviado` tinyint(1) DEFAULT 0,
  `recordatorio_enviado_at` timestamp NULL DEFAULT NULL,
  `confirmada_por_cliente` tinyint(1) DEFAULT 0,
  `confirmada_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `registro_envios_wpp`
--

CREATE TABLE `registro_envios_wpp` (
  `id` char(36) NOT NULL,
  `id_pservicio` char(36) NOT NULL,
  `id_usuario` char(36) NOT NULL,
  `id_socket` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pservicio`
--

CREATE TABLE `pservicio` (
  `id` char(36) NOT NULL,
  `id_usuario` char(36) NOT NULL,
  `nombre_establecimiento` varchar(255) NOT NULL,
  `telefono_establecimiento` varchar(20) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `hora_inicio` time DEFAULT NULL,
  `hora_fin` time DEFAULT NULL,
  `dias_trabajo` varchar(54) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `negocio_creado` tinyint(4) DEFAULT 0,
  `Servicio` varchar(100) DEFAULT NULL,
  `Precio` varchar(9) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `token`
--

CREATE TABLE `token` (
  `id` char(36) NOT NULL,
  `id_usuario` char(36) NOT NULL,
  `tipo` varchar(20) DEFAULT NULL CHECK (`tipo` in ('reset_pass','activate_account')),
  `usado` tinyint(1) DEFAULT 0,
  `expiracion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `token`
--



-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuario`
--

CREATE TABLE `usuario` (
  `id` char(36) NOT NULL,
  `correo` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `apellidos` varchar(100) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `rol` varchar(20) DEFAULT NULL CHECK (`rol` in ('cliente','profesional','admin')),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `email_verificado` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuario`
--


--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `agenda`
--
ALTER TABLE `agenda`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_pservicio` (`id_pservicio`),
  ADD KEY `id_usuario_cliente` (`id_usuario_cliente`);

--
-- Indices de la tabla `pservicio`
--
ALTER TABLE `pservicio`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_usuario` (`id_usuario`);

--
-- Indices de la tabla `registro_envios_wpp`
--
ALTER TABLE `registro_envios_wpp`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_pservicio` (`id_pservicio`),
  ADD KEY `id_usuario` (`id_usuario`);

--
-- Indices de la tabla `token`
--
ALTER TABLE `token`
  ADD PRIMARY KEY (`id`),
  ADD KEY `id_usuario` (`id_usuario`);

--
-- Indices de la tabla `usuario`
--
ALTER TABLE `usuario`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `correo` (`correo`);

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `agenda`
--
ALTER TABLE `agenda`
  ADD CONSTRAINT `agenda_ibfk_1` FOREIGN KEY (`id_pservicio`) REFERENCES `pservicio` (`id`),
  ADD CONSTRAINT `agenda_ibfk_2` FOREIGN KEY (`id_usuario_cliente`) REFERENCES `usuario` (`id`);

--
-- Filtros para la tabla `pservicio`
--
ALTER TABLE `pservicio`
  ADD CONSTRAINT `pservicio_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id`);

--
-- Filtros para la tabla `registro_envios_wpp`
--
ALTER TABLE `registro_envios_wpp`
  ADD CONSTRAINT `registro_envios_wpp_ibfk_1` FOREIGN KEY (`id_pservicio`) REFERENCES `pservicio` (`id`),
  ADD CONSTRAINT `registro_envios_wpp_ibfk_2` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id`);

--
-- Filtros para la tabla `token`
--
ALTER TABLE `token`
  ADD CONSTRAINT `token_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
