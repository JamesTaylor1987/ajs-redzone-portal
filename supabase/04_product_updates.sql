-- Deactivate 4mm sensor — standardising on 8mm model (AJS-8MM-SENSOR)
UPDATE products SET active = false WHERE sku = 'AJS-4MM-SENSOR';

-- Set VF 55" display price to £1,750 (17500 pence = £175,000 pence)
-- Adjust SKU pattern as needed if your SKU differs
UPDATE products SET price_gbp_pence = 175000 WHERE sku ILIKE '%DISP%55%' OR sku ILIKE '%TV%55%' OR (category = 'visual_factory' AND sku ILIKE '%55%' AND sku NOT ILIKE '%ENC%');

-- Set VF 65" display price proportionally (update as appropriate)
-- UPDATE products SET price_gbp_pence = <price> WHERE sku ILIKE '%65%' AND category = 'visual_factory' AND sku NOT ILIKE '%ENC%';
