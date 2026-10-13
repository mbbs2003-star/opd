CREATE TABLE IF NOT EXISTS doctor_blogs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT UNSIGNED NOT NULL,
  title VARCHAR(180) NOT NULL,
  slug VARCHAR(220) NOT NULL UNIQUE,
  excerpt VARCHAR(500) NULL,
  content MEDIUMTEXT NOT NULL,
  image_path VARCHAR(255) NULL,
  youtube_video_id CHAR(11) NULL,
  status ENUM('DRAFT','PUBLISHED') NOT NULL DEFAULT 'PUBLISHED',
  published_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_doctor_blogs_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id),
  INDEX idx_doctor_blogs_public (status, published_at),
  INDEX idx_doctor_blogs_author (doctor_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
