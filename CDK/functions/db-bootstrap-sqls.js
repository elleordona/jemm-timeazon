// functions/db-bootstrap-sqls.js
// Aurora side: a single products table for Timeazon

// 0. Drop the products table if it exists
export const sql00_dropAllTables = `
  DROP TABLE IF EXISTS products
  CASCADE;
`;

// 1. Create products table that matches the Lambdas
export const sql01_createProductsTable = `
  CREATE TABLE IF NOT EXISTS products (
    id            INTEGER GENERATED ALWAYS AS IDENTITY,
    name          TEXT NOT NULL UNIQUE,
    description   TEXT,
    price_credit  INTEGER NOT NULL,
    image_url     TEXT,
    era           TEXT,
    PRIMARY KEY (id)
  );
`;

// 2. Seed with a few products the team suggested
export const sql02_seedProducts = `
  INSERT INTO products (name, description, price_credit, image_url, era)
  VALUES
    (
      'Sword',
      'Old sword, slightly ominous, probably seen a battle or two.',
      275,
      'atgSword.jpg',
      'past'
    ),
    (
      'Magna Carta',
      'Old book containing some very important rules about kings behaving themselves.',
      2875,
      'magnaCarta.png',
      'past'
    ),
    (
      'Temporal Stabiliser version 7.0',
      'New gadget for keeping your timeline, moods and meeting schedule under control.',
      9800,
      'temporalStabiliser.jpg',
      'future'
    )
  ON CONFLICT (name) DO NOTHING;
`;
