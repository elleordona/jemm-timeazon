-- Drop tables if they exist so we can re run this file
DROP TABLE IF EXISTS course;
DROP TABLE IF EXISTS teacher;
DROP TABLE IF EXISTS users;


-- SERIAL is the old Postgres shortcut for auto increment ids. GENERATED ALWAYS AS IDENTITY is the newer, more explicit version. Both work.
CREATE TABLE users (
  user_id INTEGER GENERATED ALWAYS AS IDENTITY,
  user_name VARCHAR(50) NOT NULL,
  pass_word VARCHAR(12) NOT NULL
);

INSERT INTO users (user_name, pass_word) VALUES
  ('Colin', 'Thegreat'),
  ('Adam', 'Tweedledee'),
  ('Alisha', 'Tweedledum'),
  ('Jaz', 'og'),
  ('Dash', 'Oldie');

