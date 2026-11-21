-- =============================================================
-- Barrier Builders — FULL INSTALL (schema + seed data)
-- Import this file in phpMyAdmin. It DROPS and recreates all
-- bfs_* tables, then loads products, content, settings and the
-- two admin accounts. Safe to re-run (full rebuild).
-- =============================================================

CREATE DATABASE IF NOT EXISTS barrierco_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE barrierco_db;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `bfs_settings`;
CREATE TABLE IF NOT EXISTS bfs_settings (
  k   VARCHAR(64)  NOT NULL PRIMARY KEY,
  v   MEDIUMTEXT   NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `bfs_meta`;
CREATE TABLE IF NOT EXISTS bfs_meta (
  k   VARCHAR(64)  NOT NULL PRIMARY KEY,
  v   VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `bfs_products`;
CREATE TABLE IF NOT EXISTS bfs_products (
  id               VARCHAR(64)  NOT NULL PRIMARY KEY,
  sort_order       INT          NOT NULL DEFAULT 0,
  slug             VARCHAR(190) NOT NULL DEFAULT '',
  name             VARCHAR(190) NOT NULL DEFAULT '',
  category         VARCHAR(120) NOT NULL DEFAULT '',
  unit             VARCHAR(40)  NOT NULL DEFAULT '',
  featured         TINYINT(1)   NOT NULL DEFAULT 0,
  price_per_m      DECIMAL(14,2) NOT NULL DEFAULT 0,
  stock            DECIMAL(14,2) NOT NULL DEFAULT 0,
  stock_unit       VARCHAR(40)  NOT NULL DEFAULT '',
  image            VARCHAR(255) NOT NULL DEFAULT '',
  data             MEDIUMTEXT   NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `bfs_promotions`;
CREATE TABLE IF NOT EXISTS bfs_promotions (
  id          VARCHAR(64)  NOT NULL PRIMARY KEY,
  sort_order  INT          NOT NULL DEFAULT 0,
  title       VARCHAR(190) NOT NULL DEFAULT '',
  active      TINYINT(1)   NOT NULL DEFAULT 1,
  tag         VARCHAR(80)  NOT NULL DEFAULT '',
  starts      VARCHAR(40)  NULL,
  ends        VARCHAR(40)  NULL,
  data        MEDIUMTEXT   NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `bfs_gallery`;
CREATE TABLE IF NOT EXISTS bfs_gallery (
  id          VARCHAR(64)  NOT NULL PRIMARY KEY,
  sort_order  INT          NOT NULL DEFAULT 0,
  title       VARCHAR(190) NOT NULL DEFAULT '',
  type        VARCHAR(80)  NOT NULL DEFAULT '',
  location    VARCHAR(120) NOT NULL DEFAULT '',
  image       VARCHAR(255) NOT NULL DEFAULT '',
  year        INT          NULL,
  data        MEDIUMTEXT   NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `bfs_quotes`;
CREATE TABLE IF NOT EXISTS bfs_quotes (
  id           VARCHAR(64)  NOT NULL PRIMARY KEY,
  sort_order   INT          NOT NULL DEFAULT 0,
  ref          VARCHAR(60)  NOT NULL DEFAULT '',
  created_at   VARCHAR(40)  NULL,
  status       VARCHAR(40)  NOT NULL DEFAULT 'sent',
  source       VARCHAR(40)  NOT NULL DEFAULT '',
  invoice_ref  VARCHAR(60)  NULL,
  subtotal     DECIMAL(14,2) NOT NULL DEFAULT 0,
  vat          DECIMAL(14,2) NOT NULL DEFAULT 0,
  total        DECIMAL(14,2) NOT NULL DEFAULT 0,
  data         MEDIUMTEXT   NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `bfs_invoices`;
CREATE TABLE IF NOT EXISTS bfs_invoices (
  id          VARCHAR(64)  NOT NULL PRIMARY KEY,
  sort_order  INT          NOT NULL DEFAULT 0,
  ref         VARCHAR(60)  NOT NULL DEFAULT '',
  quote_ref   VARCHAR(60)  NULL,
  quote_id    VARCHAR(64)  NULL,
  lead_id     VARCHAR(64)  NULL,
  created_at  VARCHAR(40)  NULL,
  due_at      VARCHAR(40)  NULL,
  status      VARCHAR(40)  NOT NULL DEFAULT 'unpaid',
  subtotal    DECIMAL(14,2) NOT NULL DEFAULT 0,
  vat         DECIMAL(14,2) NOT NULL DEFAULT 0,
  total       DECIMAL(14,2) NOT NULL DEFAULT 0,
  paid        DECIMAL(14,2) NOT NULL DEFAULT 0,
  tracking    VARCHAR(60)  NULL,
  data        MEDIUMTEXT   NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `bfs_orders`;
CREATE TABLE IF NOT EXISTS bfs_orders (
  id           VARCHAR(64)  NOT NULL PRIMARY KEY,
  sort_order   INT          NOT NULL DEFAULT 0,
  tracking     VARCHAR(60)  NOT NULL DEFAULT '',
  invoice_ref  VARCHAR(60)  NULL,
  quote_ref    VARCHAR(60)  NULL,
  created_at   VARCHAR(40)  NULL,
  status       VARCHAR(40)  NOT NULL DEFAULT 'pending',
  data         MEDIUMTEXT   NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `bfs_contacts`;
CREATE TABLE IF NOT EXISTS bfs_contacts (
  id          VARCHAR(64)  NOT NULL PRIMARY KEY,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  VARCHAR(40)  NULL,
  name        VARCHAR(190) NOT NULL DEFAULT '',
  contact     VARCHAR(190) NOT NULL DEFAULT '',
  data        MEDIUMTEXT   NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `bfs_leads`;
CREATE TABLE IF NOT EXISTS bfs_leads (
  id          VARCHAR(64)  NOT NULL PRIMARY KEY,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  VARCHAR(40)  NULL,
  status      VARCHAR(40)  NOT NULL DEFAULT 'new',
  type        VARCHAR(40)  NOT NULL DEFAULT '',
  name        VARCHAR(190) NOT NULL DEFAULT '',
  email       VARCHAR(190) NOT NULL DEFAULT '',
  contact     VARCHAR(190) NOT NULL DEFAULT '',
  title       VARCHAR(190) NOT NULL DEFAULT '',
  estimate    DECIMAL(14,2) NULL,
  data        MEDIUMTEXT   NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `bfs_clients`;
CREATE TABLE IF NOT EXISTS bfs_clients (
  id          VARCHAR(64)  NOT NULL PRIMARY KEY,
  sort_order  INT          NOT NULL DEFAULT 0,
  name        VARCHAR(190) NOT NULL DEFAULT '',
  email       VARCHAR(190) NOT NULL DEFAULT '',
  phone       VARCHAR(60)  NOT NULL DEFAULT '',
  active      TINYINT(1)   NOT NULL DEFAULT 1,
  pass_hash   VARCHAR(255) NULL,
  created_at  VARCHAR(40)  NULL,
  data        MEDIUMTEXT   NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `bfs_roles`;
CREATE TABLE IF NOT EXISTS bfs_roles (
  id          VARCHAR(64)  NOT NULL PRIMARY KEY,
  sort_order  INT          NOT NULL DEFAULT 0,
  name        VARCHAR(120) NOT NULL DEFAULT '',
  permissions MEDIUMTEXT   NULL,
  data        MEDIUMTEXT   NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `bfs_admins`;
CREATE TABLE IF NOT EXISTS bfs_admins (
  id          VARCHAR(64)  NOT NULL PRIMARY KEY,
  sort_order  INT          NOT NULL DEFAULT 0,
  username    VARCHAR(120) NOT NULL DEFAULT '',
  name        VARCHAR(120) NOT NULL DEFAULT '',
  email       VARCHAR(190) NOT NULL DEFAULT '',
  password    VARCHAR(255) NULL,
  pass_hash   VARCHAR(255) NULL,
  active      TINYINT(1)   NOT NULL DEFAULT 1,
  protected   TINYINT(1)   NOT NULL DEFAULT 0,
  role_id     VARCHAR(64)  NULL,
  created_at  VARCHAR(40)  NULL,
  data        MEDIUMTEXT   NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `bfs_content`;
CREATE TABLE IF NOT EXISTS bfs_content (
  section     VARCHAR(80)  NOT NULL PRIMARY KEY,
  sort_order  INT          NOT NULL DEFAULT 0,
  data        MEDIUMTEXT   NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `bfs_analytics_pages`;
CREATE TABLE IF NOT EXISTS bfs_analytics_pages (
  page   VARCHAR(120) NOT NULL PRIMARY KEY,
  views  INT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `bfs_analytics_daily`;
CREATE TABLE IF NOT EXISTS bfs_analytics_daily (
  day       VARCHAR(10) NOT NULL PRIMARY KEY,
  views     INT UNSIGNED NOT NULL DEFAULT 0,
  quotes    INT UNSIGNED NOT NULL DEFAULT 0,
  invoices  INT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `bfs_analytics_events`;
CREATE TABLE IF NOT EXISTS bfs_analytics_events (
  id    INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kind  VARCHAR(40) NOT NULL DEFAULT '',
  at    VARCHAR(40) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `bfs_sync_log`;
CREATE TABLE IF NOT EXISTS bfs_sync_log (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  action     VARCHAR(20)  NOT NULL,
  bytes      INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- products (12)
INSERT INTO `bfs_products` (`id`,`sort_order`,`slug`,`name`,`category`,`unit`,`featured`,`price_per_m`,`stock`,`stock_unit`,`image`,`data`) VALUES ('p1',0,'diamond-mesh','Diamond Mesh','Residential','roll','1','12','420','rolls','assets/img/diamond-mesh.jpg','{"id":"p1","slug":"diamond-mesh","name":"Diamond Mesh","category":"Residential","unit":"roll","short":"Versatile hot-dip galvanized chain-link for homes, schools and commercial plots.","description":"Our most requested fence. Woven diamond mesh in 2.0-4.0 mm gauges, apertures 50 / 63 / 75 mm, heights from 0.9 m to 2.4 m. Hot-dip galvanized for 15+ years of corrosion resistance in Zimbabwean conditions.","specs":{"gauge":"2.0-4.0 mm","aperture":"50 / 63 / 75 mm","heights":"0.9-2.4 m","coating":"Hot-dip galvanized, min 80 um"},"pricePerM":12,"rollPrice":120,"rollMetres":30,"postPrice":8,"topWirePerM":0.8,"gatePrice":180,"installPerM":3.5,"concretePerPost":4,"stock":420,"stockUnit":"rolls","featured":true,"image":"assets/img/diamond-mesh.jpg","keywords":["diamond","chain","residential","home","house","plot","school","boundary"]}');
INSERT INTO `bfs_products` (`id`,`sort_order`,`slug`,`name`,`category`,`unit`,`featured`,`price_per_m`,`stock`,`stock_unit`,`image`,`data`) VALUES ('p2',1,'game-fence','Game Fence','Agricultural','roll','1','18','86','rolls','assets/img/game-fence-v2.jpg','{"id":"p2","slug":"game-fence","name":"Game Fence","category":"Agricultural","unit":"roll","short":"Heavy-duty knotted fence for wildlife ranches, conservancies and large farms.","description":"Knotted high-tensile game fence designed to contain large wildlife including kudu, eland and buffalo. Heights 1.2–2.4 m. Built for Matabeleland and Mashonaland ranch conditions.","specs":{"gauge":"2.0–3.15 mm","joint":"Knotted, impact-resistant","heights":"1.2–2.4 m","coating":"Hot-dip galvanized"},"pricePerM":18,"rollPrice":280,"rollMetres":50,"postPrice":12,"topWirePerM":1.1,"gatePrice":220,"installPerM":4,"concretePerPost":5,"stock":86,"stockUnit":"rolls","featured":true,"image":"assets/img/game-fence-v2.jpg","keywords":["game","wildlife","farm","hectare","ranch","livestock","conservancy"]}');
INSERT INTO `bfs_products` (`id`,`sort_order`,`slug`,`name`,`category`,`unit`,`featured`,`price_per_m`,`stock`,`stock_unit`,`image`,`data`) VALUES ('p3',2,'barbed-wire','Barbed Wire','Security','roll','1','1.9','610','rolls','assets/img/barbed-wire.jpg','{"id":"p3","slug":"barbed-wire","name":"Barbed Wire","category":"Security","unit":"roll","short":"High-tensile 2.5 mm barbed wire for farm boundaries and perimeter topping.","description":"12.5 gauge galvanized barbed wire, barb spacing 75–100 mm, 100 m and 200 m rolls. Used as a standalone farm fence or as a top strand on diamond mesh.","specs":{"gauge":"2.5 mm (12.5g)","barb":"75–100 mm","rolls":"100 m / 200 m","coating":"Hot-dip galvanized"},"pricePerM":1.9,"rollPrice":45,"rollMetres":100,"postPrice":8,"topWirePerM":0.6,"gatePrice":160,"installPerM":2.5,"concretePerPost":4,"stock":610,"stockUnit":"rolls","featured":true,"image":"assets/img/barbed-wire.jpg","keywords":["barbed","perimeter","farm","budget","top wire"]}');
INSERT INTO `bfs_products` (`id`,`sort_order`,`slug`,`name`,`category`,`unit`,`featured`,`price_per_m`,`stock`,`stock_unit`,`image`,`data`) VALUES ('p4',3,'razor-wire','Razor Wire','Security','coil','1','6.5','140','coils','assets/img/razor-wire.jpg','{"id":"p4","slug":"razor-wire","name":"Razor Wire","category":"Security","unit":"coil","short":"Concertina BTO-22 razor coils for high-risk commercial and institutional sites.","description":"Maximum-security concertina razor wire in 450, 600 and 900 mm coil diameters. Hot-dip galvanized BTO-22 blades for prisons, mines, warehouses and wall-top upgrades.","specs":{"blade":"BTO-22","coils":"450 / 600 / 900 mm","coating":"Hot-dip galvanized steel"},"pricePerM":6.5,"rollPrice":95,"rollMetres":50,"postPrice":14,"topWirePerM":1.4,"gatePrice":260,"installPerM":4.5,"concretePerPost":5,"stock":140,"stockUnit":"coils","featured":true,"image":"assets/img/razor-wire.jpg","keywords":["razor","security","prison","commercial","industrial","warehouse","high"]}');
INSERT INTO `bfs_products` (`id`,`sort_order`,`slug`,`name`,`category`,`unit`,`featured`,`price_per_m`,`stock`,`stock_unit`,`image`,`data`) VALUES ('p5',4,'clear-view','Clear View Fence','Security','panel','1','38','74','panels','assets/img/clear-view.jpg','{"id":"p5","slug":"clear-view","name":"Clear View Fence","category":"Security","unit":"panel","short":"Anti-climb welded mesh with unobstructed visibility for estates, schools and embassies.","description":"4.0 mm welded mesh, 76.2 × 12.7 mm aperture, anti-climb and anti-cut. Optional spike-top. Powder-coated forest green or galvanized finish.","specs":{"wire":"4.0 mm","aperture":"76.2 × 12.7 mm","features":"Anti-climb, anti-cut, spike-top option"},"pricePerM":38,"rollPrice":190,"rollMetres":3,"postPrice":22,"topWirePerM":1.6,"gatePrice":420,"installPerM":8,"concretePerPost":8,"stock":74,"stockUnit":"panels","featured":true,"image":"assets/img/clear-view.jpg","keywords":["clear","view","embassy","school","estate","anti-climb"]}');
INSERT INTO `bfs_products` (`id`,`sort_order`,`slug`,`name`,`category`,`unit`,`featured`,`price_per_m`,`stock`,`stock_unit`,`image`,`data`) VALUES ('p6',5,'palisade','Palisade Fencing','Security','m','1','55','210','metres','assets/img/palisade.jpg','{"id":"p6","slug":"palisade","name":"Palisade Fencing","category":"Security","unit":"m","short":"Steel palisade pales for industrial yards, schools and high-security compounds.","description":"Locally fabricated W-section or D-section pales, powder-coated dark green or galvanized. A strong visual and physical deterrent.","specs":{"pale":"W or D section","heights":"1.8–2.4 m","finish":"Galvanized / powder coat green"},"pricePerM":55,"rollPrice":55,"rollMetres":1,"postPrice":28,"topWirePerM":0,"gatePrice":480,"installPerM":12,"concretePerPost":10,"stock":210,"stockUnit":"metres","featured":true,"image":"assets/img/palisade.jpg","keywords":["palisade","industrial","school","compound","steel"]}');
INSERT INTO `bfs_products` (`id`,`sort_order`,`slug`,`name`,`category`,`unit`,`featured`,`price_per_m`,`stock`,`stock_unit`,`image`,`data`) VALUES ('p7',6,'welded-mesh','Welded Mesh','Industrial','panel','0','14','188','panels','assets/img/welded-mesh.jpg','{"id":"p7","slug":"welded-mesh","name":"Welded Mesh","category":"Industrial","unit":"panel","short":"Rigid welded panels for enclosures, reinforcement and industrial fencing.","description":"Square and rectangular welded mesh in multiple gauges. Used for cages, machine guards, slab reinforcement and light security fencing.","specs":{"aperture":"50 × 50 mm and custom","gauge":"2.5–4.0 mm"},"pricePerM":14,"rollPrice":70,"rollMetres":6,"postPrice":10,"topWirePerM":0.7,"gatePrice":200,"installPerM":3.2,"concretePerPost":4,"stock":188,"stockUnit":"panels","featured":false,"image":"assets/img/welded-mesh.jpg","keywords":["welded","panel","industrial","cage"]}');
INSERT INTO `bfs_products` (`id`,`sort_order`,`slug`,`name`,`category`,`unit`,`featured`,`price_per_m`,`stock`,`stock_unit`,`image`,`data`) VALUES ('p8',7,'chicken-mesh','Chicken Mesh','Agricultural','roll','0','4.2','260','rolls','assets/img/chicken-mesh.jpg','{"id":"p8","slug":"chicken-mesh","name":"Chicken Mesh","category":"Agricultural","unit":"roll","short":"Lightweight hexagonal netting for poultry runs, gardens and small animals.","description":"0.7–1.0 mm hex netting, 25 mm and 50 mm apertures, heights 0.6–1.8 m. Galvanized against rust in the rainy season.","specs":{"gauge":"0.7–1.0 mm","aperture":"25 / 50 mm","heights":"0.6–1.8 m"},"pricePerM":4.2,"rollPrice":32,"rollMetres":30,"postPrice":6,"topWirePerM":0.5,"gatePrice":140,"installPerM":2,"concretePerPost":3,"stock":260,"stockUnit":"rolls","featured":false,"image":"assets/img/chicken-mesh.jpg","keywords":["chicken","poultry","birds","coop","garden","pet"]}');
INSERT INTO `bfs_products` (`id`,`sort_order`,`slug`,`name`,`category`,`unit`,`featured`,`price_per_m`,`stock`,`stock_unit`,`image`,`data`) VALUES ('p9',8,'field-fence','Field Fence','Agricultural','roll','0','8.5','95','rolls','assets/img/field-fence.jpg','{"id":"p9","slug":"field-fence","name":"Field Fence","category":"Agricultural","unit":"roll","short":"Woven field fence for cattle, goats and crop protection on rural properties.","description":"Graduated mesh field fence that keeps livestock in and predators out. Ideal for mixed farming operations.","specs":{"type":"Hinged joint / woven","heights":"1.0–1.5 m","rolls":"50 m"},"pricePerM":8.5,"rollPrice":180,"rollMetres":50,"postPrice":10,"topWirePerM":0.9,"gatePrice":200,"installPerM":3,"concretePerPost":4,"stock":95,"stockUnit":"rolls","featured":false,"image":"assets/img/field-fence.jpg","keywords":["field","cattle","goats","crop","rural","livestock"]}');
INSERT INTO `bfs_products` (`id`,`sort_order`,`slug`,`name`,`category`,`unit`,`featured`,`price_per_m`,`stock`,`stock_unit`,`image`,`data`) VALUES ('p10',9,'electric-fence','Electric Fence','Security','kit','0','9.5','54','kits','assets/img/electric-fence.jpg','{"id":"p10","slug":"electric-fence","name":"Electric Fence","category":"Security","unit":"kit","short":"Wall-top or full-height electric fence systems with energizer and siren.","description":"High-voltage pulsed deterrent for residential and commercial walls. Kits include energizer, insulators, HT wire and battery backup options.","specs":{"type":"Wall-top or full height","kit":"Energizer, HT wire, insulators"},"pricePerM":9.5,"rollPrice":95,"rollMetres":20,"postPrice":0,"topWirePerM":0,"gatePrice":0,"installPerM":7,"concretePerPost":0,"stock":54,"stockUnit":"kits","featured":false,"image":"assets/img/electric-fence.jpg","keywords":["electric","energizer","wall top","alarm"]}');
INSERT INTO `bfs_products` (`id`,`sort_order`,`slug`,`name`,`category`,`unit`,`featured`,`price_per_m`,`stock`,`stock_unit`,`image`,`data`) VALUES ('p11',10,'gates','Gates','Access','set','0','180','22','sets','assets/img/gate.jpg','{"id":"p11","slug":"gates","name":"Gates","category":"Access","unit":"set","short":"Custom sliding, swing and pedestrian gates fabricated to opening width.","description":"Hot-dip galvanized steel gates: sliding, double-leaf and pedestrian. Mesh, palisade or clear-view infill. Automation on request.","specs":{"types":"Sliding / swing / pedestrian","finish":"Galvanized or powder coat"},"pricePerM":180,"rollPrice":180,"rollMetres":1,"postPrice":0,"topWirePerM":0,"gatePrice":180,"installPerM":40,"concretePerPost":0,"stock":22,"stockUnit":"sets","featured":false,"image":"assets/img/gate.jpg","keywords":["gate","entrance","access","sliding"]}');
INSERT INTO `bfs_products` (`id`,`sort_order`,`slug`,`name`,`category`,`unit`,`featured`,`price_per_m`,`stock`,`stock_unit`,`image`,`data`) VALUES ('p12',11,'posts','Fence Posts & Standards','Accessories','pc','0','8','980','pcs','assets/img/posts.jpg','{"id":"p12","slug":"posts","name":"Fence Posts & Standards","category":"Accessories","unit":"pc","short":"Galvanized line posts, corner posts, Y-posts and straining assemblies.","description":"Round tube, Y-post and corner assemblies from 1.2 m to 2.4 m. Sold with stay wires and fittings.","specs":{"heights":"1.2–2.4 m","types":"Line, corner, Y-post"},"pricePerM":8,"rollPrice":8,"rollMetres":1,"postPrice":8,"topWirePerM":0,"gatePrice":0,"installPerM":0,"concretePerPost":4,"stock":980,"stockUnit":"pcs","featured":false,"image":"assets/img/posts.jpg","keywords":["post","standard","y-post","corner"]}');

-- gallery (6)
INSERT INTO `bfs_gallery` (`id`,`sort_order`,`title`,`type`,`location`,`image`,`year`,`data`) VALUES ('g1',0,'Residential diamond mesh — Borrowdale','Home / Residential','Harare','assets/img/gallery-residential.jpg','2026','{"id":"g1","title":"Residential diamond mesh — Borrowdale","location":"Harare","type":"Home / Residential","image":"assets/img/gallery-residential.jpg","year":2026,"areaType":"Home / Residential","fenceType":"Diamond Mesh","cost":4850,"justification":"A 1.8 m diamond mesh perimeter was specified for clear visibility, quick installation and low maintenance on a suburban plot.","materials":"2.0 mm galvanised diamond mesh, 50x50 mm aperture, concrete posts, concrete post bases, one 4 m sliding gate, binding wire and fittings."}');
INSERT INTO `bfs_gallery` (`id`,`sort_order`,`title`,`type`,`location`,`image`,`year`,`data`) VALUES ('g2',1,'Game fence — Matabeleland conservancy','Farm / Ranch','Matabeleland South','assets/img/gallery-game-v2.jpg','2025','{"id":"g2","title":"Game fence — Matabeleland conservancy","location":"Matabeleland South","type":"Farm / Ranch","image":"assets/img/gallery-game-v2.jpg","year":2025,"areaType":"Farm / Ranch","fenceType":"Game Fence","cost":62400,"justification":"Knotted high-tensile game fence at 2.1 m to contain elephant, buffalo and antelope across mixed terrain; electrified top strand added on river boundaries.","materials":"2.0 mm game fence, 2.4 m treated posts at 3 m spacing, Y-standards, barbed top wire, energizer kit on two boundary sections, concrete for corner assemblies."}');
INSERT INTO `bfs_gallery` (`id`,`sort_order`,`title`,`type`,`location`,`image`,`year`,`data`) VALUES ('g3',2,'School palisade — sports field','School','Harare','assets/img/gallery-school.jpg','2026','{"id":"g3","title":"School palisade — sports field","location":"Harare","type":"School","image":"assets/img/gallery-school.jpg","year":2026,"areaType":"School","fenceType":"Palisade","cost":18700,"justification":"2.1 m palisade chosen for maximum anti-climb security around the school fields while keeping sightlines open for supervision.","materials":"Palisade pales on steel posts, concrete footings, three access gates (one pedestrian, two vehicle), razor strip option quoted separately."}');
INSERT INTO `bfs_gallery` (`id`,`sort_order`,`title`,`type`,`location`,`image`,`year`,`data`) VALUES ('g4',3,'Clear view estate perimeter','Home / Residential','Mount Pleasant','assets/img/clear-view.jpg','2026','{"id":"g4","title":"Clear view estate perimeter","location":"Mount Pleasant","type":"Home / Residential","image":"assets/img/clear-view.jpg","year":2026,"areaType":"Home / Residential","fenceType":"Clear View Fence","cost":31200,"justification":"Clear view mesh at 1.8 m gives the estate an open, premium boundary that deters climbing without blocking views.","materials":"Clear view welded panels, powder-coated posts, automated sliding gate supplied by client, concrete bases and full installation."}');
INSERT INTO `bfs_gallery` (`id`,`sort_order`,`title`,`type`,`location`,`image`,`year`,`data`) VALUES ('g5',4,'Farm boundary — Mashonaland East','Farm / Ranch','Marondera','assets/img/field-fence.jpg','2025','{"id":"g5","title":"Farm boundary — Mashonaland East","location":"Marondera","type":"Farm / Ranch","image":"assets/img/field-fence.jpg","year":2025,"areaType":"Farm / Ranch","fenceType":"Field Fence","cost":45800,"justification":"Field fence for cattle and goats on a mixed crop/livestock holding — economical coverage with accessible gates for farm machinery.","materials":"Field fence rolls, Y-standards and wooden posts, four vehicle gates, strand wire and fittings; installation by Barrier Builders crew."}');
INSERT INTO `bfs_gallery` (`id`,`sort_order`,`title`,`type`,`location`,`image`,`year`,`data`) VALUES ('g6',5,'Sliding gate — Highlands','Shop / Business','Harare','assets/img/gate.jpg','2026','{"id":"g6","title":"Sliding gate — Highlands","location":"Harare","type":"Shop / Business","image":"assets/img/gate.jpg","year":2026,"areaType":"Shop / Business","fenceType":"Gates","cost":2400,"justification":"A standalone 4 m sliding gate upgrade for an existing business yard — heavy-duty rail and mesh infill matched to the existing fence line.","materials":"4 m mesh-panel sliding gate, galvanised rail, guide posts, concrete gate stops and installation."}');

-- admins (2)
INSERT INTO `bfs_admins` (`id`,`sort_order`,`username`,`name`,`email`,`password`,`active`,`protected`,`created_at`,`pass_hash`,`role_id`,`data`) VALUES ('ad-1',0,'munyah','Munyah Griezmann','munyamuzvidziwa19@gmail.com',NULL,'1','1','2026-11-06T00:00:00.000Z','$2y$10$N6mDSv6luC2a38.1HaYPJOPCzsDiNzU7WH9fh4SgMqf5hylg3V.0.','role-admin','{"id":"ad-1","username":"munyah","name":"Munyah Griezmann","email":"munyamuzvidziwa19@gmail.com","active":true,"protected":true,"createdAt":"2026-11-06T00:00:00.000Z"}');
INSERT INTO `bfs_admins` (`id`,`sort_order`,`username`,`name`,`email`,`password`,`active`,`protected`,`created_at`,`pass_hash`,`role_id`,`data`) VALUES ('ad-2',1,'manager','Site Manager','manager@barrierfencing.co.zw',NULL,'1','0','2026-11-21T00:00:00.000Z','$2y$10$LS1fbdkkx8HEyi3Hx23p0echev9RNDLvhQKgHGfJZ6iwJXVkLM.9u','role-admin','{"id":"ad-2","username":"manager","name":"Site Manager","email":"manager@barrierfencing.co.zw","active":true,"createdAt":"2026-11-21T00:00:00.000Z"}');

-- settings
INSERT INTO bfs_settings (k, v) VALUES ('company', '"Barrier Builders"');
INSERT INTO bfs_settings (k, v) VALUES ('tagline', '"The fence that holds."');
INSERT INTO bfs_settings (k, v) VALUES ('domain', '"barrierfencing.co.zw"');
INSERT INTO bfs_settings (k, v) VALUES ('email', '"info@barrierfencing.co.zw"');
INSERT INTO bfs_settings (k, v) VALUES ('salesEmail', '"sales@barrierfencing.co.zw"');
INSERT INTO bfs_settings (k, v) VALUES ('phone', '"+263 77 132 0612"');
INSERT INTO bfs_settings (k, v) VALUES ('whatsapp', '"263771320612"');
INSERT INTO bfs_settings (k, v) VALUES ('address', '"Along High Glen Road, Between Service Station and Roundabout."');
INSERT INTO bfs_settings (k, v) VALUES ('hours', '""');
INSERT INTO bfs_settings (k, v) VALUES ('vatRate', '0');
INSERT INTO bfs_settings (k, v) VALUES ('currency', '"USD"');
INSERT INTO bfs_settings (k, v) VALUES ('quoteValidityDays', '14');
INSERT INTO bfs_settings (k, v) VALUES ('adminUser', '"munyah"');
INSERT INTO bfs_settings (k, v) VALUES ('vatNumber', '"VAT 10001234"');
INSERT INTO bfs_settings (k, v) VALUES ('bank', '""');
INSERT INTO bfs_settings (k, v) VALUES ('adminPass', '"griezmann17"');
INSERT INTO bfs_settings (k, v) VALUES ('phone2', '"+263 71 675 5380"');

-- content
INSERT INTO bfs_content (section, sort_order, data) VALUES ('branding', 0, '{"logo":"assets/logo.png","favicon":"assets/favicon.png","footerTagline":"Supply and installation of galvanized fencing across all 10 provinces of Zimbabwe. Materials, labour, and nationwide delivery."}');
INSERT INTO bfs_content (section, sort_order, data) VALUES ('seo', 1, '{"title":"Barrier Builders | Fencing Supply & Installation — Zimbabwe","description":"Barrier Builders supplies and installs diamond mesh, game fence, clear view, palisade, razor wire and gates across Zimbabwe. Instant quotes, AI estimator, nationwide delivery."}');
INSERT INTO bfs_content (section, sort_order, data) VALUES ('hero', 2, '{"image":"assets/img/hero-farm.jpg","title":"Strong. Secure. <em>Built to Last.</em>","subtitle":"We design and install high-quality diamond mesh fencing, razor wire, gates and farm fencing across Harare and Zimbabwe. Get a bill of quantities in seconds, then convert it to an invoice with one click.","ctaPrimaryLabel":"Instant quote calculator","ctaPrimaryHref":"calculator","ctaSecondaryLabel":"Try the AI estimator","ctaSecondaryHref":"estimator"}');
INSERT INTO bfs_content (section, sort_order, data) VALUES ('trustTabs', 3, '[{"title":"Nationwide Delivery","subtitle":"Across Zimbabwe","href":"about"},{"title":"Quality Assured","subtitle":"SABS Compliant","href":"about"},{"title":"Expert Support","subtitle":"Quote to Installation","href":"contact"},{"title":"Fast Quotations","subtitle":"Results in Seconds","href":"calculator"}]');
INSERT INTO bfs_content (section, sort_order, data) VALUES ('features', 4, '[{"num":"01","title":"Hot-dip galvanized stock","body":"Wire and posts with zinc coating built for rainy-season rust. Heights and gauges held in the Harare yard."},{"num":"02","title":"Quote → invoice in one click","body":"Every estimate becomes a numbered quotation. Admin converts it to a VAT invoice and a trackable order instantly."},{"num":"03","title":"Supply and install","body":"Materials only, or a full crew. Diaspora clients can pay remotely and receive WhatsApp progress photos."}]');
INSERT INTO bfs_content (section, sort_order, data) VALUES ('stats', 5, '[{"num":"15+","label":"Years on the tools"},{"num":"1,200+","label":"Fences completed"},{"num":"10","label":"Provinces covered"},{"num":"USD","label":"Transparent pricing"}]');
INSERT INTO bfs_content (section, sort_order, data) VALUES ('quoteBand', 6, '{"title":"Get a fencing quote <em>in seconds.</em>","body":"Enter perimeter, height and fence type. The calculator builds a full bill of quantities with posts, wire, gates and labour — then saves a numbered quotation.","ctaLabel":"Start calculator","ctaHref":"calculator","hint":"Or describe the job in plain English on the AI Estimator."}');
INSERT INTO bfs_content (section, sort_order, data) VALUES ('about', 7, '{"heroImage":"assets/img/hero-farm.jpg","heroTitle":"Fencing done right, first time.","heroSub":"Barrier Fencing is a trusted fencing company in Harare, Zimbabwe — diamond mesh, razor wire, barbed wire, gates and farm fencing for homes, businesses, schools and farms.","kicker":"Who we are","title":"Strong fences. Neat finish. On-time delivery.","body":"Barrier Fencing is a trusted fencing company based in Harare, Zimbabwe. We specialize in diamond mesh, razor wire, barbed wire, gates and farm fencing for homes, businesses, schools and farms across all ten provinces. From boundary walls to game ranches, every project gets the same treatment: quality materials, clean workmanship and a fair price. Our promise is simple — strong fences, neat finish, on-time delivery.","bullets":["Diamond mesh, game fence, clear view, palisade, razor wire and barbed wire — all in stock at our Harare yard","Custom gates and post assemblies fabricated to opening width","Instant online quotes, then a tracked order from delivery to installation","Diaspora orders with remote payment and WhatsApp progress photos"],"image":"assets/img/gallery-school.jpg","stats":[{"num":"Harare","label":"Yard & office"},{"num":"10","label":"Provinces"},{"num":"12","label":"Product lines"},{"num":"14d","label":"Quote validity"}]}');
INSERT INTO bfs_content (section, sort_order, data) VALUES ('contact', 8, '{"heroImage":"assets/img/hero-farm.jpg","heroTitle":"Talk to the yard.","heroSub":"Call, WhatsApp or send a message — we reply during yard hours.","mapNote":"Visit us at the Harare yard, or request a site survey."}');
INSERT INTO bfs_content (section, sort_order, data) VALUES ('footer', 9, '{"brandText":"Your trusted partner for secure fencing in Zimbabwe — diamond mesh, razor wire, gates and farm fencing, supplied and installed nationwide."}');
INSERT INTO bfs_content (section, sort_order, data) VALUES ('rules', 10, '{"quote":"Quotations are valid for 14 days from the date of issue. Prices are in USD and include materials; installation and transport are quoted separately unless stated. A 50% deposit secures materials, balance due on completion or before dispatch for supply-only orders.","invoice":"Payment is due within 14 days of invoice date unless otherwise agreed. A 15% VAT is applied to all taxable supplies. Late payments may attract interest at 5% per month. Goods remain the property of Barrier Builders until paid in full."}');
INSERT INTO bfs_content (section, sort_order, data) VALUES ('posters', 11, '[{"id":"po1","image":"assets/img/hero-farm.jpg","title":"Farm season special","body":"Bulk diamond mesh and game fence pricing for the planting season.","ctaLabel":"Get a quote","ctaHref":"calculator","active":true,"position":"home"}]');

-- roles
INSERT INTO bfs_roles (id, sort_order, name, permissions, data) VALUES ('role-admin', 0, 'Administrator', '["*"]', '{"builtin":true}');

-- meta
INSERT INTO bfs_meta (k, v) VALUES ('updatedAt', '1795276405');
