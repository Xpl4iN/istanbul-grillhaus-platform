-- ====================================================================================
-- INITIAL DATABASE SEED SCRIPT (PostgreSQL / SQLite)
-- Lädt Grundkategorien, Döner-Produkte, Modifiers und Shop-Einstellungen.
-- ====================================================================================

-- 1. SHOP EINSTELLUNGEN
INSERT INTO "ShopSettings" ("id", "is_open_right_now", "opening_hours_json") 
VALUES (1, true, '{"monday":{"open":"11:00","close":"22:00"},"tuesday":{"open":"11:00","close":"22:00"}}')
ON CONFLICT ("id") DO UPDATE SET "is_open_right_now" = EXCLUDED."is_open_right_now";

-- 2. KATEGORIEN
INSERT INTO "Category" ("id", "name", "sort_order", "is_active") VALUES 
(1, 'Wraps & Döner', 10, true),
(2, 'Getränke', 20, true),
(3, 'Beilagen', 30, true)
ON CONFLICT ("id") DO NOTHING;

-- 3. PRODUKTE
-- Hinweis: Bei echten UUIDs in PostgreSQL generieren wir hier feste IDs fürs Seeding
INSERT INTO "Product" ("id", "category_id", "name", "description", "base_price", "is_available") VALUES 
('prod-doener-01', 1, 'Döner Tasche', 'Hausgemacht. Frisch. Mit frischem Salat.', 6.50, true),
('prod-durum-01', 1, 'Dürüm Döner', 'Im gerollten Fladenbrot.', 7.50, true),
('prod-ayran-01', 2, 'Ayran', 'Kühl und erfrischend 0,2l', 2.00, true)
ON CONFLICT ("id") DO NOTHING;

-- 4. MODIFIER GROUPS (Konfigurator-Gruppen)
INSERT INTO "ModifierGroup" ("id", "product_id", "name", "is_required", "max_selections") VALUES 
('grp-fleisch-doener', 'prod-doener-01', 'Welches Fleisch?', true, 1),
('grp-extras-doener', 'prod-doener-01', 'Extras & Anpassungen', false, 5),
('grp-fleisch-durum', 'prod-durum-01', 'Welches Fleisch?', true, 1),
('grp-extras-durum', 'prod-durum-01', 'Extras & Anpassungen', false, 5)
ON CONFLICT ("id") DO NOTHING;

-- 5. MODIFIERS (Die eigentlichen Optionen)
-- Fleisch Optionen (Pflicht)
INSERT INTO "Modifier" ("id", "group_id", "name", "price_delta", "is_available") VALUES 
('mod-kalb-1', 'grp-fleisch-doener', 'Kalb', 0.00, true),
('mod-hahn-1', 'grp-fleisch-doener', 'Hähnchen', 0.00, true),
('mod-mix-1', 'grp-fleisch-doener', 'Gemischt', 0.00, true),
('mod-kalb-2', 'grp-fleisch-durum', 'Kalb', 0.00, true),
('mod-hahn-2', 'grp-fleisch-durum', 'Hähnchen', 0.00, true)
ON CONFLICT ("id") DO NOTHING;

-- Extras (Optional + Aufpreise)
INSERT INTO "Modifier" ("id", "group_id", "name", "price_delta", "is_available") VALUES 
('mod-extra-fleisch', 'grp-extras-doener', 'Extra Fleisch', 1.50, true),
('mod-kase', 'grp-extras-doener', 'Mit Schafskäse', 1.00, true),
('mod-no-zwiebel', 'grp-extras-doener', 'Ohne Zwiebeln', 0.00, true),
('mod-no-tomato', 'grp-extras-doener', 'Ohne Tomaten', 0.00, true),
('mod-scharf', 'grp-extras-doener', 'Extra Scharf (Pulver)', 0.00, true)
ON CONFLICT ("id") DO NOTHING;

-- SEEDING COMPLETE