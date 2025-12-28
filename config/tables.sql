CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL,

  email VARCHAR(150) UNIQUE NULL,
  phone VARCHAR(30) UNIQUE NULL,

  password VARCHAR(255) NOT NULL,

  role ENUM('admin', 'manager', 'client') DEFAULT 'client',
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',

  address_district VARCHAR(255),
  address_sector VARCHAR(255),
  address_cell VARCHAR(255),
  address_village VARCHAR(255),

  otp VARCHAR(10) NULL,
  otp_expires DATETIME NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL
);



CREATE TABLE roles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL,
  description VARCHAR(255) NOT NULL,
  permissions JSON NOT NULL,
  user_count INT DEFAULT 0,
  is_system BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info','warning','error','success','reminder') DEFAULT 'info',
  priority ENUM('low','medium','high','urgent') DEFAULT 'medium',
  category ENUM('system','crop','harvest','inventory','financial','delivery','general') DEFAULT 'general',
  data JSON,
  action_url VARCHAR(255),
  expires_at DATETIME,
  status ENUM('active','expired','cancelled') DEFAULT 'active',
  created_by BIGINT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE notification_recipients (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  notification_id BIGINT,
  user_id BIGINT,
  read_at DATETIME DEFAULT NULL,
  action_taken BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


CREATE TABLE crop_plans (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  crop_name VARCHAR(100),
  variety VARCHAR(100),
  field_area DOUBLE,
  planting_date DATE,
  expected_harvest_date DATE,
  status ENUM('planned','planted','growing','harvested') DEFAULT 'planned',
  expected_yield DOUBLE NOT NULL,
  cost DOUBLE DEFAULT 0,
  notes TEXT,
  created_by BIGINT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE harvests (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  crop_plan_id BIGINT,
  crop_name VARCHAR(100),
  harvest_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  actual_yield DOUBLE,
  quality VARCHAR(50),
  market_price DOUBLE,
  total_revenue DOUBLE,
  storage_location VARCHAR(255),
  notes TEXT,
  created_by BIGINT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (crop_plan_id) REFERENCES crop_plans(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE farm_transactions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  date DATE NOT NULL,
  crop_activity VARCHAR(100) NOT NULL,
  type ENUM('Income','Expense') NOT NULL,
  amount DOUBLE NOT NULL,
  payment_method ENUM('Cash','Mobile money','Bank') NOT NULL,
  description TEXT,
  created_by BIGINT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);


CREATE TABLE inputs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  input_date DATE,
  name VARCHAR(100),
  amount DOUBLE,
  description TEXT,
  created_by BIGINT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
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

CREATE TABLE token_blacklist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);