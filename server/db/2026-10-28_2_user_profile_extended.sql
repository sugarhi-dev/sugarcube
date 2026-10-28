ALTER TABLE user_profile
    ADD COLUMN phone text;

CREATE TABLE currency (
    id varchar(26) PRIMARY KEY,
    code char(3) NOT NULL,
    name varchar(255) NOT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT currency_code_key UNIQUE (code),
    CONSTRAINT currency_name_key UNIQUE (name),
    CONSTRAINT currency_code_check CHECK (code ~ '^[A-Z]{3}$')
);

INSERT INTO currency (id, code, name)
VALUES
    ('01M60CTKE481Y3DH8AHWN65KDJ', 'USD', 'US Dollar'),
    ('01M60CTKE4PH20ME83PK6S298A', 'EUR', 'Euro'),
    ('01M60CTKE4CPKAWBJP010VQQFD', 'JPY', 'Japanese Yen'),
    ('01M60CTKE4Q98EPQJ35E5WCH75', 'GBP', 'Pound Sterling'),
    ('01M60CTKE45GJF5ZPSWGHAQCGH', 'CNY', 'Chinese Yuan');

CREATE TABLE production_cities (
    id varchar(26) PRIMARY KEY,
    name varchar(255) NOT NULL,
    country_code char(2) NOT NULL,
    latitude numeric(8, 6) NOT NULL,
    longitude numeric(9, 6) NOT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT production_cities_name_country_key UNIQUE (name, country_code),
    CONSTRAINT production_cities_country_code_check CHECK (country_code ~ '^[A-Z]{2}$'),
    CONSTRAINT production_cities_latitude_check CHECK (latitude >= -90 AND latitude <= 90),
    CONSTRAINT production_cities_longitude_check CHECK (longitude >= -180 AND longitude <= 180)
);

INSERT INTO production_cities (id, name, country_code, latitude, longitude)
VALUES
    ('01M60CTKE5AF6FA1MW9304EMCA', 'Los Angeles', 'US', 34.052235, -118.243683),
    ('01M60CTKE5WWQGPK7TJA6NGWAM', 'New York', 'US', 40.712776, -74.005974),
    ('01M60CTKE5YQKSFHS6KKF713ZS', 'Atlanta', 'US', 33.748997, -84.387985),
    ('01M60CTKE5H9JBT9VXP66J6CX0', 'Chicago', 'US', 41.878113, -87.629799),
    ('01M60CTKE5PXR6W4BMBC0Q2AHP', 'New Orleans', 'US', 29.951065, -90.071533),
    ('01M60CTKE5AWK4Q4WGKS7AE6D6', 'Albuquerque', 'US', 35.084385, -106.650422),
    ('01M60CTKE532XMD6PBKEZ6G4M5', 'Austin', 'US', 30.267153, -97.743057),
    ('01M60CTKE5G500YAGNJSJ5Q46N', 'Miami', 'US', 25.761681, -80.191788),
    ('01M60CTKE5NM58ZMQJKW6W069Y', 'Vancouver', 'CA', 49.282729, -123.120738),
    ('01M60CTKE52Y8W8D4C45WCJA0J', 'Toronto', 'CA', 43.653226, -79.383184),
    ('01M60CTKE5J5N8NAGHPGE6VZZS', 'Montreal', 'CA', 45.501689, -73.567256),
    ('01M60CTKE5HK9DHFZB2V6Y8Y3N', 'London', 'GB', 51.507351, -0.127758),
    ('01M60CTKE57A0XCGGQBXXYZBNV', 'Dublin', 'IE', 53.349805, -6.260310),
    ('01M60CTKE5QZ5DKN8PSHGXB03X', 'Paris', 'FR', 48.856614, 2.352222),
    ('01M60CTKE51TAKWCVXQH1AW8DY', 'Berlin', 'DE', 52.520008, 13.404954),
    ('01M60CTKE5386P0C1WC297SWFZ', 'Prague', 'CZ', 50.075538, 14.437800),
    ('01M60CTKE5AH7DK36F41D9YVWD', 'Budapest', 'HU', 47.497913, 19.040236),
    ('01M60CTKE5RX813K709JSE9F24', 'Rome', 'IT', 41.902782, 12.496366),
    ('01M60CTKE5T1B11PTSYBHYFYW5', 'Madrid', 'ES', 40.416775, -3.703790),
    ('01M60CTKE52CRTFS1RPSW66T12', 'Barcelona', 'ES', 41.387397, 2.168568),
    ('01M60CTKE58KQJFZ99JKSWS8RY', 'Amsterdam', 'NL', 52.367573, 4.904139),
    ('01M60CTKE56BKHGM2SR1GMJ54H', 'Copenhagen', 'DK', 55.676098, 12.568337),
    ('01M60CTKE54T5383XQJZ9XBHC9', 'Stockholm', 'SE', 59.329323, 18.068581),
    ('01M60CTKE5AS11FZ4DRYT23RMX', 'Bucharest', 'RO', 44.426767, 26.102538),
    ('01M60CTKE592FAT2F7P2AS1H0E', 'Warsaw', 'PL', 52.229676, 21.012229),
    ('01M60CTKE5DRW2Z3GBXY5DG4G3', 'Mumbai', 'IN', 19.075984, 72.877656),
    ('01M60CTKE5QBRVCYTM4DEHKVCE', 'Hyderabad', 'IN', 17.385044, 78.486671),
    ('01M60CTKE6T9386Y70DXKG4K2J', 'Chennai', 'IN', 13.082680, 80.270718),
    ('01M60CTKE6BSYQWGQ19E38QAWS', 'Tokyo', 'JP', 35.676192, 139.650311),
    ('01M60CTKE6BMYT723A4NMQSNRC', 'Seoul', 'KR', 37.566535, 126.977969),
    ('01M60CTKE606FF80C8Q73TBFB1', 'Beijing', 'CN', 39.904202, 116.407394),
    ('01M60CTKE6VJBY1GAFJDB04MGM', 'Hong Kong', 'HK', 22.319304, 114.169361),
    ('01M60CTKE6B6TDJD1VX0JHNK7D', 'Singapore', 'SG', 1.352083, 103.819836),
    ('01M60CTKE6WZAJY3V0QFAZNCXG', 'Bangkok', 'TH', 13.756331, 100.501765),
    ('01M60CTKE693DAM1GMWR6RYCA5', 'Sydney', 'AU', -33.868820, 151.209296),
    ('01M60CTKE6AZZB1M1D7K9CYS9Y', 'Melbourne', 'AU', -37.813628, 144.963058),
    ('01M60CTKE6F0G0NZ4B4XG3SK5A', 'Gold Coast', 'AU', -28.016666, 153.400000),
    ('01M60CTKE6FDQSF4V8RJW7Z58Z', 'Auckland', 'NZ', -36.850883, 174.764488),
    ('01M60CTKE6BN9QAVEX1Z2ASM9H', 'Wellington', 'NZ', -41.286461, 174.776230),
    ('01M60CTKE6AHZ8XT4E490Y90FT', 'Mexico City', 'MX', 19.432608, -99.133209),
    ('01M60CTKE6T69KSE8EDA5VXRJQ', 'Buenos Aires', 'AR', -34.603684, -58.381559),
    ('01M60CTKE7599QH71FK6SVXS5H', 'São Paulo', 'BR', -23.550520, -46.633308),
    ('01M60CTKE73ARS9X1QDEY16CFN', 'Rio de Janeiro', 'BR', -22.906847, -43.172897),
    ('01M60CTKE7V407THZ1KS2ZB9GT', 'Cape Town', 'ZA', -33.924869, 18.424055),
    ('01M60CTKE7N8AN7WQK3HHE26DM', 'Johannesburg', 'ZA', -26.204103, 28.047305),
    ('01M60CTKE7GCS3MKVCJTH4SS7H', 'Lagos', 'NG', 6.524379, 3.379206),
    ('01M60CTKE7KN4R5C9QN4GGKNSH', 'Cairo', 'EG', 30.044420, 31.235712),
    ('01M60CTKE7BAGAFA9GJQ6JJV4Y', 'Ouarzazate', 'MA', 30.933544, -6.937016),
    ('01M60CTKE7DNV4ES9XNN6C8A4J', 'Dubai', 'AE', 25.204849, 55.270782),
    ('01M60CTKE7NETZ01YHP84PSEZD', 'Abu Dhabi', 'AE', 24.453884, 54.377344);

CREATE TABLE user_locale (
    id varchar(26) PRIMARY KEY,
    user_profile_id varchar(26) NOT NULL,
    production_city_id varchar(26) NOT NULL,
    home_city boolean NOT NULL DEFAULT false,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_locale_user_city_key UNIQUE (user_profile_id, production_city_id),
    CONSTRAINT user_locale_user_profile_id_fkey
        FOREIGN KEY (user_profile_id) REFERENCES user_profile (id) ON DELETE RESTRICT,
    CONSTRAINT user_locale_production_city_id_fkey
        FOREIGN KEY (production_city_id) REFERENCES production_cities (id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX user_locale_home_city_key
    ON user_locale (user_profile_id)
    WHERE home_city;

CREATE INDEX user_locale_production_city_id_idx
    ON user_locale (production_city_id);

CREATE TABLE disciplines (
    id varchar(26) PRIMARY KEY,
    name varchar(255) NOT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT disciplines_name_key UNIQUE (name)
);

INSERT INTO disciplines (id, name)
VALUES
    ('01M60CTKE77RM4W4MGKQT09GHJ', 'Shooting'),
    ('01M60CTKE7ZPY7X8RBWZERGVZT', 'Post Production');

CREATE TABLE positions (
    id varchar(26) PRIMARY KEY,
    name varchar(255) NOT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positions_name_key UNIQUE (name)
);

INSERT INTO positions (id, name)
VALUES
    -- Directing
    ('01M60CTKE7M8G2V0GWXS8DMRJN', 'Director'),
    ('01M60CTKE8QP1NKFVQC3WWBKWS', 'First Assistant Director'),
    ('01M60CTKE8SAK3M89K3M8A53FW', 'Second Assistant Director'),
    ('01M60CTKE8W46VJG5HY1P0R4CE', 'Second Second Assistant Director'),
    ('01M60CTKE8M5CQHA4VVRWXVJN6', 'Additional Assistant Director'),
    ('01M60CTKE88E3848HQ0WB1SCE6', 'Script Supervisor'),
    ('01M60CTKE84JFFYAY62W1KMD6P', 'Director''s Assistant'),
    ('01M60CTKE7DNHCK3Q7HGRBFFZS', 'Set Production Assistant'),
    -- Locationsx`z
    ('01M60CTKE8CA0FHJR5XNWWTD1T', 'Location Manager'),
    ('01M60CTKE83M5GMSN9HQXPZ22E', 'Assistant Location Manager'),
    ('01M60CTKE8A5BJVFC4NP2R0QA4', 'Location Assistantz'),
    -- Camera
    ('01M60CTKE8SMJY0DW9TCHXJTYF', 'Director of Photography'),
    ('01M60CTKE8S2FXS071FJ8R04ZX', 'Camera Operator'),
    ('01M60CTKE825V63AMW2EMQ8YHT', 'First Assistant Camera'),
    ('01M60CTKE8VED28BS4X5S4165A', 'Second Assistant Camera'),
    ('01M60CTKE8YE8BGW5NFBCDFASX', 'Digital Imaging Technician'),
    ('01M60CTKE8YHPWWHFG1PNYB12D', 'Data Wrangler'),
    ('01M60CTKE8VQGDSK20MN78GQGQ', 'Steadicam Operator'),
    ('01M60CTKE8EM7KGYQNT7H21HWW', 'Drone Operator'),
    ('01M60CTKE8X18AF11QPPXMTYCB', 'Still Photographer'),
    ('01M60CTKE85E1EM2H56847EJDN', 'Video Assist Operator'),
    ('01M60CTKE8H97ERXNGS05QRCZ0', 'Behind the Scenes Videographer'),
    -- Electric
    ('01M60CTKE8CQTGAVCR92HWC4HG', 'Gaffer'),
    ('01M60CTKE8CVZ8DD2M2ZDG3TFM', 'Best Boy Electric'),
    ('01M60CTKE80AMPQEPAAXA49EGE', 'Lighting Technician'),
    -- Grip
    ('01M60CTKE8E09RMKGBKMGJ3B6V', 'Key Grip'),
    ('01M60CTKE8X1YS0WQ6475XG20Q', 'Best Boy Grip'),
    ('01M60CTKE88A6KMSAFYM1T712T', 'Grip'),
    ('01M60CTKE8SCFPWC6YSF9PTVB1', 'Dolly Grip'),
    ('01M60CTKE848M60K25JM28ZD84', 'Crane Operator'),
    -- Sound
    ('01M60CTKE8Z5Z3MMD5RQ09G4EE', 'Production Sound Mixer'),
    ('01M60CTKE8G557YKVGVJTDYWVZ', 'Boom Operator'),
    ('01M60CTKE9VQEQ6CZH9XXR43JX', 'Sound Utility'),
    -- On-set art
    ('01M60CTKE92FVEY5FBEA31XTJ3', 'Property Master'),
    ('01M60CTKE929296MEC5CXZZM5F', 'Assistant Property Master'),
    ('01M60CTKE97F3R7N7XY9EB0SAP', 'Set Dresser'),
    ('01M60CTKE9HGN3AV0PS5KTSKY6', 'Standby Carpenter'),
    ('01M60CTKEAFDXFGJCF2N6CD4Y3', 'Standby Painter'),
    ('01M60CTKEAF917B8TMVH4Z65KT', 'Greensperson'),
    -- Costume, hair, and makeup
    ('01M60CTKEAC0Q8T1B6M6YXWRNW', 'Costume Supervisor'),
    ('01M60CTKEAJX9R980F427ZFJDD', 'Key Costumer'),
    ('01M60CTKEAY2MVTEMEDPAAPGYN', 'Set Costumer'),
    ('01M60CTKEASHGX15F0N52RBAA8', 'Makeup Department Head'),
    ('01M60CTKEA7K6PGDD07CNFC5C8', 'Key Makeup Artist'),
    ('01M60CTKEA8T0JW3ZCMDRX4CCF', 'Makeup Artist'),
    ('01M60CTKEAC3Y482D3W7TYZ7KQ', 'Special Effects Makeup Artist'),
    ('01M60CTKEA03F69A7PZ9EWJWYK', 'Hair and Makeup Designer'),
    ('01M60CTKEAGEHF55YTH1H5WCCD', 'Hair Department Head'),
    ('01M60CTKEAPEDEVPQ92BHXJJW5', 'Key Hair Stylist'),
    ('01M60CTKEAWSJRF4F8S669MQRG', 'Hair Stylist'),
    -- Stunts, special effects, and on-set visual effects
    ('01M60CTKEAW7CEKYSTZS0VYZCW', 'Stunt Coordinator'),
    ('01M60CTKEAYASQW1HVW5087QAZ', 'Assistant Stunt Coordinator'),
    ('01M60CTKEA7DXG0P6XSRP8FQWC', 'Stunt Performer'),
    ('01M60CTKEA8PTEHT6VQD9E1Z0K', 'Stunt Rigger'),
    ('01M60CTKEADRWBH6TE3S3CQ69D', 'Fight Choreographer'),
    ('01M60CTKEADHVDTV6T9DAZQD3W', 'Special Effects Supervisor'),
    ('01M60CTKEA0PK6CMFGJW6SRWYZ', 'Special Effects Coordinator'),
    ('01M60CTKEAS6A9Q269DHNMYB3W', 'Special Effects Technician'),
    ('01M60CTKEARKA9XSYXVYFG82QP', 'Pyrotechnician'),
    ('01M60CTKEAVSPNXR8ZZ09Q8CRQ', 'Armorer'),
    ('01M60CTKEB0HYBAAXFC4EJRDP6', 'VFX Supervisor'),
    -- On-set support
    ('01M60CTKEBZ51FQ3AQSHEGNH1A', 'Craft Service'),
    ('01M60CTKEBS78NFXVE6GGJ7W3X', 'Set Medic'),
    ('01M60CTKEB4DV3R5F3ZQ0ZRNSM', 'Picture Car Coordinator'),
    ('01M60CTKEBB6X9FWBC82E3MEJ0', 'Animal Wrangler'),
    ('01M60CTKEB87W8CD1SSAFFDPDK', 'Choreographer'),
    ('01M60CTKEB6NZS90592J05283Q', 'Dialect Coach'),
    ('01M60CTKEB9EP7TCNWTTHB3KXH', 'Intimacy Coordinator'),
    ('01M60CTKECCXCG2P3WXPVPTJX8', 'Studio Teacher'),
    ('01M60CTKECFCB2D99M35GZMDGP', 'Safety Coordinator'),
    ('01M60CTKECAYQRADCCZB1AP3X9', 'Marine Coordinator');

CREATE TABLE user_work_profile (
    id varchar(26) PRIMARY KEY,
    user_profile_id varchar(26) NOT NULL,
    day_rate numeric(12, 2),
    currency_id varchar(26),
    union_status varchar(16) NOT NULL,
    flat_fee boolean NOT NULL DEFAULT false,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_work_profile_user_profile_id_key UNIQUE (user_profile_id),
    CONSTRAINT user_work_profile_user_profile_id_fkey
        FOREIGN KEY (user_profile_id) REFERENCES user_profile (id) ON DELETE RESTRICT,
    CONSTRAINT user_work_profile_currency_id_fkey
        FOREIGN KEY (currency_id) REFERENCES currency (id) ON DELETE RESTRICT,
    CONSTRAINT user_work_profile_union_status_check CHECK (
        union_status IN ('union', 'non_union', 'either')
    ),
    CONSTRAINT user_work_profile_day_rate_check CHECK (
        day_rate IS NULL OR day_rate >= 0
    ),
    CONSTRAINT user_work_profile_rate_currency_check CHECK (
        (day_rate IS NULL AND currency_id IS NULL)
        OR (day_rate IS NOT NULL AND currency_id IS NOT NULL)
    )
);

CREATE INDEX user_work_profile_currency_id_idx
    ON user_work_profile (currency_id);

