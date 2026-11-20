ALTER TABLE user_account
    ADD COLUMN production_city_id varchar(26),
    ADD CONSTRAINT user_account_production_city_id_fkey
        FOREIGN KEY (production_city_id) REFERENCES production_cities (id);
