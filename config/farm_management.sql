
CREATE DATABASE IF NOT EXISTS `farm_management_system`;
USE `farm_management_system`;

CREATE TABLE IF NOT EXISTS `crop_plans` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `crop_name` varchar(100) DEFAULT NULL,
  `variety` varchar(100) DEFAULT NULL,
  `field_area` double DEFAULT NULL,
  `planting_date` date DEFAULT NULL,
  `expected_harvest_date` date DEFAULT NULL,
  `status` enum('planned','planted','growing','harvested') DEFAULT 'planned',
  `expected_yield` double NOT NULL,
  `cost` double DEFAULT '0',
  `notes` text,
  `created_by` bigint DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `crop_plans_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
);


-- Dumping structure for table farm_management_system.farm_transactions
CREATE TABLE IF NOT EXISTS `farm_transactions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `crop_activity` varchar(100) NOT NULL,
  `type` enum('Income','Expense') NOT NULL,
  `amount` double NOT NULL,
  `payment_method` enum('Cash','Mobile money','Bank') NOT NULL,
  `description` text,
  `created_by` bigint DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `farm_transactions_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
);


-- Dumping structure for table farm_management_system.harvests
CREATE TABLE IF NOT EXISTS `harvests` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `crop_plan_id` bigint DEFAULT NULL,
  `crop_name` varchar(100) DEFAULT NULL,
  `harvest_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `actual_yield` double DEFAULT NULL,
  `quality` varchar(50) DEFAULT NULL,
  `market_price` double DEFAULT NULL,
  `total_revenue` double DEFAULT NULL,
  `storage_location` varchar(255) DEFAULT NULL,
  `notes` text,
  `created_by` bigint DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `crop_plan_id` (`crop_plan_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `harvests_ibfk_1` FOREIGN KEY (`crop_plan_id`) REFERENCES `crop_plans` (`id`),
  CONSTRAINT `harvests_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
);


-- Dumping structure for table farm_management_system.inputs
CREATE TABLE IF NOT EXISTS `inputs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `input_date` date DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `amount` double DEFAULT NULL,
  `description` text,
  `created_by` bigint DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `inputs_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
);

CREATE TABLE messages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,

  user_id BIGINT NOT NULL,
  sender ENUM('user','bot') NOT NULL,
  content TEXT NOT NULL,
  type ENUM('text','info') DEFAULT 'text',

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_messages_user_id_created_at ON messages(user_id, created_at DESC);
-- or

CREATE TABLE messages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  sender ENUM('user','bot') NOT NULL,
  content TEXT NOT NULL,
  type ENUM('text','info') DEFAULT 'text',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_messages_user_id_created_at (user_id, created_at)
);
-- Dumping structure for table farm_management_system.notification_recipients
CREATE TABLE IF NOT EXISTS `notification_recipients` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `notification_id` bigint DEFAULT NULL,
  `user_id` bigint DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  `action_taken` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `notification_id` (`notification_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `notification_recipients_ibfk_1` FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notification_recipients_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



-- Dumping structure for table farm_management_system.notification_triggers
CREATE TABLE IF NOT EXISTS `notification_triggers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` varchar(50) NOT NULL COMMENT 'transaction, calendar_reminder, overdue_alert, etc.',
  `user_id` bigint NOT NULL,
  `reference_id` varchar(100) DEFAULT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `scheduled_at` datetime DEFAULT NULL,
  `status` enum('pending','sent','failed','cancelled') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notification_triggers_status` (`status`,`scheduled_at`),
  KEY `idx_notification_triggers_user` (`user_id`,`type`),
  CONSTRAINT `notification_triggers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

-- Dumping data for table farm_management_system.notification_triggers: ~0 rows (approximately)

-- Dumping structure for table farm_management_system.notifications
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text NOT NULL,
  `type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'info',
  `priority` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `category` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'general',
  `data` json DEFAULT NULL,
  `action_url` varchar(255) DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `status` enum('active','expired','cancelled') DEFAULT 'active',
  `created_by` bigint DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table farm_management_system.notifications: ~4 rows (approximately)
REPLACE INTO `notifications` (`id`, `title`, `message`, `type`, `priority`, `category`, `data`, `action_url`, `expires_at`, `status`, `created_by`, `created_at`, `updated_at`) VALUES
	(2, 'mutere ibigori', 'igihe cyo gutera cyageze', 'success', 'high', 'general', NULL, NULL, '2025-12-31 04:08:00', 'active', 1, '2025-12-30 04:08:41', '2025-12-30 04:08:41'),
	(5, 'hello', 'muraho neza ibuka gutangira gahunda yo guhinga', 'success', 'high', 'announcement', NULL, NULL, '2025-12-31 10:30:00', 'active', 1, '2025-12-30 04:37:01', '2025-12-30 04:37:01'),
	(6, 'gufata imbuto', 'kuruyu wamber tuzatanga imbuto ntuzabure cyangwa ngo ukererwe', 'info', 'medium', 'broadcast', NULL, NULL, '2026-01-05 04:38:00', 'active', 1, '2025-12-30 04:39:04', '2025-12-30 04:39:04');

-- Dumping structure for table farm_management_system.roles
CREATE TABLE IF NOT EXISTS `roles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) NOT NULL,
  `permissions` json NOT NULL,
  `user_count` int DEFAULT '0',
  `is_system` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table farm_management_system.roles: ~2 rows (approximately)
REPLACE INTO `roles` (`id`, `name`, `description`, `permissions`, `user_count`, `is_system`, `created_at`, `updated_at`) VALUES
	(1, 'farmer', 'worker', '["dashboard", "farm_harvest", "fields", "financial", "reports", "analytics", "farm-crop-planning", "calendar", "settings", "notifications"]', 0, 0, '2025-12-29 12:53:34', '2025-12-30 03:00:09'),
	(2, 'staff', 'the partnel', '["dashboard", "fields", "financial", "harvest", "crop-planning", "reports", "calendar", "users", "settings", "notifications"]', 0, 0, '2025-12-29 13:09:45', '2025-12-30 05:17:57');

-- Dumping structure for table farm_management_system.token_blacklist
CREATE TABLE IF NOT EXISTS `token_blacklist` (
  `id` int NOT NULL AUTO_INCREMENT,
  `token` text NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Dumping data for table farm_management_system.token_blacklist: ~0 rows (approximately)

-- Dumping structure for table farm_management_system.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` varchar(50) NOT NULL,
  `status` enum('active','inactive','suspended') DEFAULT 'active',
  `address_district` varchar(255) DEFAULT NULL,
  `address_sector` varchar(255) DEFAULT NULL,
  `address_cell` varchar(255) DEFAULT NULL,
  `address_village` varchar(255) DEFAULT NULL,
  `otp` varchar(10) DEFAULT NULL,
  `otp_expires` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `phone` (`phone`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


