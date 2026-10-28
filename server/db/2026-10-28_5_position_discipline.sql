ALTER TABLE positions
    ADD COLUMN discipline_id varchar(26);

UPDATE positions
SET discipline_id = (
    SELECT id FROM disciplines WHERE name = 'Shooting'
);

ALTER TABLE positions
    ALTER COLUMN discipline_id SET NOT NULL,
    ADD CONSTRAINT positions_discipline_id_fkey
        FOREIGN KEY (discipline_id) REFERENCES disciplines (id) ON DELETE RESTRICT,
    ADD CONSTRAINT positions_id_discipline_key UNIQUE (id, discipline_id);

CREATE INDEX positions_discipline_id_idx
    ON positions (discipline_id);

ALTER TABLE work_profile
    ADD CONSTRAINT work_profile_position_discipline_fkey
        FOREIGN KEY (position_id, discipline_id)
        REFERENCES positions (id, discipline_id)
        ON DELETE RESTRICT;

INSERT INTO positions (id, name, discipline_id)
SELECT post_positions.id, post_positions.name, disciplines.id
FROM disciplines
CROSS JOIN (
    VALUES
        -- Editorial
        ('01M60TR7G6S29W2GHWDFN95R5K', 'Post Production Supervisor'),
        ('01M60TR7G9R8KQ1NZZCG5PT614', 'Post Producer'),
        ('01M60TR7G9M2RTWYKRQHVHMSD0', 'Post Coordinator'),
        ('01M60TR7G9X46JAM3KS414SN8G', 'Post Production Assistant'),
        ('01M60TR7G9S36TC2X6QV6SN8P1', 'Editor'),
        ('01M60TR7G9PEZD4K2T8RV74TWE', 'Additional Editor'),
        ('01M60TR7G9368N8SR8KZHM24NE', 'First Assistant Editor'),
        ('01M60TR7G989XSYCJT148XY04D', 'Second Assistant Editor'),
        ('01M60TR7G9JKZRXCZNAQ0EZYCC', 'Assistant Editor'),
        ('01M60TR7G903SRDNQ44YPAZK0T', 'VFX Editor'),
        -- Color and finishing
        ('01M60TR7G91RSBPTNH2X370DVV', 'Colorist'),
        ('01M60TR7G95EB6NV5XWNB0P46G', 'Assistant Colorist'),
        ('01M60TR7G9ZK2GMFWRFA6DZ29V', 'Online Editor'),
        ('01M60TR7G9QGA74D5F2NSDJKM0', 'Conform Editor'),
        -- Sound
        ('01M60TR7G9DKP0R3RPKSMK5BWS', 'Supervising Sound Editor'),
        ('01M60TR7G9SVYBE3703GFG2RXX', 'Sound Designer'),
        ('01M60TR7G9CP5Q2NQ0WAGC84P8', 'Dialogue Editor'),
        ('01M60TR7G969WHWK28AZB1BYZ3', 'Sound Effects Editor'),
        ('01M60TR7G9YJJ3KFXCPHJW8QZ0', 'Foley Artist'),
        ('01M60TR7GA7GJWYQH62TW96DAM', 'Foley Mixer'),
        ('01M60TR7GAE8RJFJTZJ1GQB16G', 'Re-recording Mixer'),
        ('01M60TR7GAAVWRM9FS2YKW38HZ', 'ADR Supervisor'),
        ('01M60TR7GA9TPH9F8B97TDM8SX', 'Music Editor'),
        ('01M60TR7GAQR67X6GTN744SPFH', 'Music Supervisor'),
        ('01M60TR7GABHEQ08FED686H7ZQ', 'Composer'),
        -- Visual effects
        ('01M60TR7GAZZQQY60GEKT1XF8V', 'VFX Producer'),
        ('01M60TR7GA8N5N3Z405KJ7D737', 'VFX Coordinator'),
        ('01M60TR7GAXPTNXS19V8B55PVN', 'CG Supervisor'),
        ('01M60TR7GACSS0KJPZ5TZ7VSZW', 'Compositor'),
        ('01M60TR7GA2G6Q9VPYB4226916', 'Rotoscope Artist'),
        ('01M60TR7GA8SDH4K91D5GKHH3S', 'Matchmove Artist'),
        ('01M60TR7GA5AGX2B3PSR1BD54S', 'Matte Painter'),
        -- Graphics
        ('01M60TR7GAXNV554HV09WFB7A2', 'Title Designer'),
        ('01M60TR7GAQ58F4GBHHXV6RD1G', 'Motion Graphics Designer'),
        -- Dailies
        ('01M60TR7GAHAS9YTXSEGQQRP3X', 'Dailies Operator'),
        ('01M60TR7GAG5NNG7608VC1PNS5', 'Dailies Colorist')
) AS post_positions (id, name)
WHERE disciplines.name = 'Post Production';
