-- Manual migration script to add created_by_instructor_id column
-- Run this in MySQL if automatic migration doesn't work

USE training_portal;

-- Add the column
ALTER TABLE student_group 
ADD COLUMN created_by_instructor_id INT NULL;

-- Add foreign key constraint
ALTER TABLE student_group 
ADD CONSTRAINT fk_created_by_instructor 
FOREIGN KEY (created_by_instructor_id) REFERENCES instructor(id) 
ON DELETE SET NULL;

