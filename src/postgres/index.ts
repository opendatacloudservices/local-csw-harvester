import {Client} from 'pg';
import {CswSource} from '../csw/types';

const master_table = 'csw_instances';

export const resetQueues = (client: Client): Promise<void> => {
  return client
    .query(`SELECT name FROM ${master_table}`)
    .then(result => {
      return Promise.all(
        result.rows.map(row => {
          return client.query(`UPDATE ${row.name}_queue SET state = 'new'`);
        })
      );
    })
    .then(() => {});
};

export const initMasterTable = (client: Client): Promise<void> => {
  return client
    .query(
      `CREATE TABLE ${master_table} (
        id SERIAL PRIMARY KEY,
        url TEXT,
        limit SMALLINT,
        version TEXT,
        type TEXT,
        prefix TEXT,
        long_name TEXT,
        note TEXT,
        active BOOLEAN,
        special_params TEXT
      )`
    )
    .then(() => {});
};

export const createInstance = (
  client: Client,
  cswSource: CswSource
): Promise<void> => {
  return client
    .query(
      `INSERT INTO ${master_table} (url, limit, version, type, prefix, long_name, note, active, special_params) VALUES (?,?,?,?,?,?,?,?,?)`,
      [
        cswSource.url,
        cswSource.limit,
        cswSource.version,
        cswSource.type,
        cswSource.prefix,
        cswSource.longName,
        cswSource.note || null,
        cswSource.active,
        cswSource.specialParams || null,
      ]
    )
    .then(() =>
      client.query(`CREATE TABLE ${cswSource.prefix}_records (
        id TEXT UNIQUE PRIMARY KEY,
        language_code TEXT,
        parent_identifier TEXT,
        hierarchy_level TEXT,
        hierarchy_level_name TEXT,
        date_stamp DATE,
        abstract TEXT,
        srid TEXT[],
        purpose TEXT[],
        edition TEXT[],
        title TEXT,
        alternate_title TEXT,
        category TEXT[],
        spatial_resolution TEXT[],
        spatial_type TEXT[],
        geographic_description TEXT[],
        temporal_start DATE,
        temporal_end DATE,
        temporal_start_unknown BOOLEAN,
        temporal_end_unknown BOOLEAN,
        spatial_description TEXT[];
        spatial Geometry(Polygon, 4326)
      )`)
    )
    .then(() =>
      client.query(`CREATE TABLE ${cswSource.prefix}_queue (
        id SERIAL PRIMARY KEY,
        url TEXT,
        state TEXT
      )`)
    )
    .then(() =>
      client.query(`CREATE TABLE ${cswSource.prefix}_dates (
        id SERIAL PRIMARY KEY,
        record_id INTEGER REFERENCES ${cswSource.prefix}_records(id),
        date DATE,
        type TEXT
      )`)
    )
    .then(() =>
      client.query(`CREATE TABLE ${cswSource.prefix}_constraints (
        id SERIAL PRIMARY KEY,
        record_id INTEGER REFERENCES ${cswSource.prefix}_records(id),
        type TEXT,
        value TEXT
      )`)
    )
    .then(() =>
      client.query(`CREATE TABLE ${cswSource.prefix}_keywords (
        id SERIAL PRIMARY KEY,
        name TEXT,
        type TEXT,
        anchor TEXT
      )`)
    )
    .then(() =>
      client.query(`CREATE TABLE ${cswSource.prefix}_ref_records_keywords (
        record_id INTEGER REFERENCES ${cswSource.prefix}_records(id),
        keyword_id INTEGER REFERENCES ${cswSource.prefix}_keywords(id)
      )`)
    )
    .then(() =>
      client.query(`CREATE TABLE ${cswSource.prefix}_resources (
        id SERIAL PRIMARY KEY,
        record_id INTEGER REFERENCES ${cswSource.prefix}_records(id),
        distribution_format TEXT,
        url TEXT,
        application_profile TEXT,
        name TEXT,
        description TEXT,
        function TEXT,
        protocol TEXT
      )`)
    )
    .then(() =>
      client.query(`CREATE TABLE ${cswSource.prefix}_contacts (
        id SERIAL PRIMARY KEY,
        type TEXT,
        name TEXT,
        individual_name TEXT,
        position TEXT,
        phone TEXT,
        fax TEXT,
        url TEXT,
        email TEXT,
        delivery_point TEXT,
        city TEXT,
        admin_area TEXT,
        postcode TEXT,
        country TEXT
      )`)
    )
    .then(() =>
      client.query(`CREATE TABLE ${cswSource.prefix}_ref_records_contacts (
        record_id INTEGER REFERENCES ${cswSource.prefix}_records(id),
        contact_id INTEGER REFERENCES ${cswSource.prefix}_contacts(id)
      )`)
    )
    .then(() => {});
};

export const getInstance = (client: Client, id: string): Promise<CswSource> => {
  return client
    .query(`SELECT * FROM ${master_table} WHERE id = ?`, [parseInt(id)])
    .then(result => {
      if (result.rows.length === 1) {
        return Promise.resolve({
          url: result.rows[0].url,
          limit: result.rows[0].limit,
          version: result.rows[0].version,
          id: result.rows[0].id,
          type: result.rows[0].type,
          prefix: result.rows[0].prefix,
          longName: result.rows[0].long_name,
          note: result.rows[0].note,
          active: result.rows[0].active,
          specialParams: result.rows[0].special_params,
        });
      } else {
        return Promise.reject(Error('Instance not found.'));
      }
    });
};

export const resetTables = (client: Client, prefix: string): Promise<void> => {
  const tables = [
    '_ref_records_contacts',
    '_ref_records_keywords',
    '_dates',
    '_keywords',
    '_resources',
    '_contacts',
    '_constraints',
    '_records',
  ];
  return Promise.all(
    tables.map(t => {
      return client.query(`TRUNCATE TABLE ${prefix}${t}`);
    })
  ).then(() => {});
};
