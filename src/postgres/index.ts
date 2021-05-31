export const createMain = (): string => {
  return `CREATE TABLE csw_master (
    id SERIAL PRIMARY KEY,
    url TEXT,
    limit SMALLINT,
    version TEXT,
    prefix TEXT
  )`;
};

export const createInstance = (prefix: string): string => {
  let query = `CREATE TABLE ${prefix}_records (
    id TEXT UNIQUE PRIMARY KEY,
    language_code TEXT[],
    parent_identifier TEXT[],
    hierarchy_level TEXT[],
    hierarchy_level_name TEXT[],
    date_stamp DATE,
    abstract TEXT,
    srid TEXT[],
    title TEXT,
    alternate_title TEXT,
    dates TIMESTAMP[],
    category TEXT[],
    spatial_resolution TEXT[],
    spatial_type TEXT[],
    geographic_description TEXT[],
    temporal_start DATE,
    temporal_end DATE,
    temporal_start_unknown BOOLEAN,
    temporal_end_unknown BOOLEAN,
    spatial Geometry(Polygon, 4326)
  )`;

  query = `CREATE TABLE ${prefix}_dates (
    id SERIAL PRIMARY KEY,
    record_id INTEGER,
    date DATE,
    type TEXT
  )`;

  query = `CREATE TABLE ${prefix}_constraints (
    id SERIAL PRIMARY KEY,
    record_id INTEGER,
    type TEXT,
    value TEXT
  )`;

  query = `CREATE TABLE ${prefix}_ref_records_keywords (
    record_id INTEGER,
    keyword_id INTEGER
  )`;

  query = `CREATE TABLE ${prefix}_keywords (
    id SERIAL PRIMARY KEY,
    name TEXT,
    type TEXT,
    anchor TEXT
  )`;

  query = `CREATE TABLE ${prefix}_ref_records_resources (
    record_id INTEGER,
    resource_id INTEGER
  )`;

  query = `CREATE TABLE ${prefix}_resources (
    id SERIAL PRIMARY KEY,
    distribution_format TEXT,
    url TEXT,
    application_profile TEXT,
    name TEXT,
    description TEXT,
    function TEXT,
    protocol TEXT
  )`;

  query = `CREATE TABLE ${prefix}_ref_records_contacts (
    record_id INTEGER,
    contact_id INTEGER
  )`;

  query = `CREATE TABLE ${prefix}_contacts (
    id SERIAL PRIMARY KEY,
    type TEXT,
    name TEXT,
    position TEXT,
    phone TEXT,
    fax TEXT,
    url TEXT,
    email TEXT,
    delivery_point TEXT,
    city TEXT,
    admin_area TEXT,
    postcode TEXT,
    country TEXT,
    id TEXT
  )`;

  return query;
};
