import {Client} from 'pg';
import {CswRecord, CswSource, fetchOptions} from '../csw/types';

const master_table = 'csw_instances';

export const resetQueues = (client: Client): Promise<void> => {
  return client
    .query(`SELECT prefix FROM ${master_table}`)
    .then(result => {
      return Promise.all(
        result.rows.map(row => {
          return client.query(`UPDATE ${row.prefix}_queue SET state = 'new'`);
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
        page_limit SMALLINT,
        version TEXT,
        type TEXT,
        prefix TEXT,
        long_name TEXT,
        note TEXT,
        active BOOLEAN,
        special_params TEXT,
        rate_limit INTEGER
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
      `INSERT INTO ${master_table} (url, page_limit, version, type, prefix, long_name, note, active, special_params, rate_limit) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
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
        cswSource.rateLimit || null,
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
        spatial_description TEXT[],
        spatial Geometry(Polygon, 4326),
        state TEXT
      )`)
    )
    .then(() =>
      client.query(`CREATE TABLE ${cswSource.prefix}_queue (
        id SERIAL PRIMARY KEY,
        url TEXT,
        options TEXT,
        state TEXT
      )`)
    )
    .then(() =>
      client.query(`CREATE TABLE ${cswSource.prefix}_dates (
        id SERIAL PRIMARY KEY,
        record_id TEXT REFERENCES ${cswSource.prefix}_records(id),
        date DATE,
        type TEXT
      )`)
    )
    .then(() =>
      client.query(`CREATE TABLE ${cswSource.prefix}_constraints (
        id SERIAL PRIMARY KEY,
        record_id TEXT REFERENCES ${cswSource.prefix}_records(id),
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
        record_id TEXT REFERENCES ${cswSource.prefix}_records(id),
        keyword_id INTEGER REFERENCES ${cswSource.prefix}_keywords(id)
      )`)
    )
    .then(() =>
      client.query(`CREATE TABLE ${cswSource.prefix}_resources (
        id SERIAL PRIMARY KEY,
        record_id TEXT REFERENCES ${cswSource.prefix}_records(id),
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
        name TEXT[],
        individual_name TEXT[],
        position TEXT[],
        phone TEXT[],
        fax TEXT[],
        url TEXT[],
        email TEXT[],
        delivery_point TEXT[],
        city TEXT[],
        admin_area TEXT[],
        postcode TEXT[],
        country TEXT[]
      )`)
    )
    .then(() =>
      client.query(`CREATE TABLE ${cswSource.prefix}_ref_records_contacts (
        record_id TEXT REFERENCES ${cswSource.prefix}_records(id),
        contact_id INTEGER REFERENCES ${cswSource.prefix}_contacts(id),
        type TEXT
      )`)
    )
    .then(() => {});
};

export const getInstance = (client: Client, id: string): Promise<CswSource> => {
  return client
    .query(`SELECT * FROM ${master_table} WHERE id = $1`, [parseInt(id)])
    .then(result => {
      if (result.rows.length === 1) {
        return Promise.resolve({
          url: result.rows[0].url,
          limit: result.rows[0].page_limit,
          version: result.rows[0].version,
          id: result.rows[0].id,
          type: result.rows[0].type,
          prefix: result.rows[0].prefix,
          longName: result.rows[0].long_name,
          note: result.rows[0].note,
          active: result.rows[0].active,
          specialParams: result.rows[0].special_params,
          rateLimit: result.rows[0].rate_limit,
        });
      } else {
        return Promise.reject(Error('Instance not found.'));
      }
    });
};

export const getAllInstances = (client: Client): Promise<CswSource[]> => {
  return client
    .query(`SELECT * FROM ${master_table} WHERE active = TRUE`)
    .then(result => {
      return result.rows.map(r => {
        return {
          url: r.url,
          limit: r.page_limit,
          version: r.version,
          id: r.id,
          type: r.type,
          prefix: r.prefix,
          longName: r.long_name,
          note: r.note,
          active: r.active,
          specialParams: r.special_params,
          rateLimit: r.rate_limit,
        };
      });
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
      return client.query(`DELETE FROM ${prefix}${t}`);
    })
  ).then(() => {});
};

export const insertQueue = (
  client: Client,
  prefix: string,
  queue: {url: string; options: fetchOptions}[]
): Promise<void> => {
  return client
    .query(`DELETE FROM ${prefix}_queue`)
    .then(() =>
      client.query(
        `INSERT INTO ${prefix}_queue (url, options, state) VALUES ${queue
          .map((q, qi) => {
            return `($${2 * qi + 1},$${2 * qi + 2},'new')`;
          })
          .join(',')}`,
        queue
          .map(l => {
            return [l.url, JSON.stringify(l.options)];
          })
          .flat()
      )
    )
    .then(() => {});
};

export const nextPackage = (
  client: Client,
  cswSource: CswSource
): Promise<string | null> => {
  return client
    .query(
      `UPDATE ${cswSource.prefix}_queue
      SET state = 'downloading' 
      WHERE id = (
        SELECT id
        FROM   ${cswSource.prefix}_queue
        WHERE  state = 'new'
        LIMIT  1
      )
      RETURNING id;`
    )
    .then(result => (result.rows.length > 0 ? result.rows[0].id : null));
};

export const getQueueItem = (
  client: Client,
  prefix: string,
  id: number
): Promise<{url: string; options: fetchOptions}> => {
  return client
    .query(`SELECT url, options FROM ${prefix}_queue WHERE id = $1`, [id])
    .then(result => {
      return {
        url: result.rows[0].url,
        options: JSON.parse(result.rows[0].options),
      };
    });
};

export const removeFromQueue = (
  client: Client,
  cswSource: CswSource,
  url: string
): Promise<void> => {
  return client
    .query(`DELETE FROM ${cswSource.prefix}_queue WHERE id = $1`, [url])
    .then(() => {});
};

export const setQueueFailed = (
  client: Client,
  cswSource: CswSource,
  url: string
): Promise<void> => {
  return client
    .query(
      `UPDATE ${cswSource.prefix}_queue SET state= 'failed' WHERE id = $1`,
      [url]
    )
    .then(() => {});
};

const dateFormat = (d: string): string => {
  if (d.trim().length === 4) {
    return d.trim() + '-01-01';
  }
  return d;
};

export const processPackages = async (
  client: Client,
  cswSource: CswSource,
  cswRecords: CswRecord[]
): Promise<void> => {
  for (let i = 0; i < cswRecords.length; i += 1) {
    const r = cswRecords[i];
    // check if exists
    const existCheck = await client.query(
      `SELECT id, TO_CHAR(date_stamp, 'YYYY-MM-DD') AS date_stamp FROM ${cswSource.prefix}_records WHERE id = $1`,
      [r.id]
    );

    let exists = false;
    let ignore = false;
    if (existCheck.rowCount > 0) {
      if (
        (!r.dateStamp && !existCheck.rows[0].date_stamp) ||
        (r.dateStamp &&
          existCheck.rows[0].date_stamp === dateFormat(r.dateStamp.toString()))
      ) {
        const existDates = await client.query(
          `SELECT type, TO_CHAR(date, 'YYYY-MM-DD') AS date FROM ${cswSource.prefix}_dates WHERE record_id = $1`,
          [existCheck.rows[0].id]
        );
        if (existDates.rows.length === 0 && r.dates.length === 0) {
          console.log('SHIT');
          ignore = true;
        } else if (existDates.rows.length > 0 && r.dates.length > 0) {
          let allSame = true;
          r.dates.forEach(date => {
            let found = false;
            existDates.rows.forEach(row => {
              if (
                date.date &&
                row.date === dateFormat(date.date?.toString()) &&
                row.type === date.type
              ) {
                found = true;
              }
            });
            if (!found) {
              allSame = false;
            }
          });
          if (allSame) {
            ignore = true;
          }
        }
      }

      if (!ignore) {
        exists = true;
        // We only keep the current data representation (only colum state indicates an update)
        await client.query(
          `DELETE FROM ${cswSource.prefix}_dates WHERE record_id = $1`,
          [r.id]
        );
        await client.query(
          `DELETE FROM ${cswSource.prefix}_resources WHERE record_id = $1`,
          [r.id]
        );
        await client.query(
          `DELETE FROM ${cswSource.prefix}_constraints WHERE record_id = $1`,
          [r.id]
        );
        await client.query(
          `DELETE FROM ${cswSource.prefix}_ref_records_contacts WHERE record_id = $1`,
          [r.id]
        );
        await client.query(
          `DELETE FROM ${cswSource.prefix}_ref_records_keywords WHERE record_id = $1`,
          [r.id]
        );
        await client.query(
          `DELETE FROM ${cswSource.prefix}_records WHERE id = $1`,
          [r.id]
        );
      }
    }

    if (!ignore) {
      const values = [
        r.id,
        r.languageCode,
        r.parentIdentifier,
        r.hierarchyLevel,
        r.hierarchyLevelName,
        typeof r.dateStamp === 'object' || r.dateStamp === ''
          ? null
          : dateFormat(r.dateStamp.toString()),
        r.abstract,
        r.srid,
        r.purpose,
        r.edition,
        r.title,
        r.alternateTitle,
        r.category,
        r.spatialResolution,
        r.spatialType,
        r.geographicDescription,
        typeof r.temporalExtent?.start === 'object'
          ? null
          : dateFormat(r.temporalExtent?.start),
        typeof r.temporalExtent?.end === 'object'
          ? null
          : dateFormat(r.temporalExtent?.end),
        !r.temporalExtent?.startUndetermined ? false : true,
        !r.temporalExtent?.endUndetermined ? false : true,
        r.spatialExtent?.description,
      ];

      let hasSpatial = false;
      if (
        r.spatialExtent &&
        r.spatialExtent.longitude &&
        r.spatialExtent.longitude.length === 2 &&
        r.spatialExtent.longitude[0] !== null &&
        r.spatialExtent.longitude[0] !== '' &&
        r.spatialExtent.latitude &&
        r.spatialExtent.latitude.length === 2 &&
        r.spatialExtent.latitude[0] !== null &&
        r.spatialExtent.latitude[0] !== ''
      ) {
        hasSpatial = true;
        values.push(
          `POLYGON((${r.spatialExtent.longitude[0]} ${r.spatialExtent.latitude[0]},${r.spatialExtent.longitude[1]} ${r.spatialExtent.latitude[0]},${r.spatialExtent.longitude[1]} ${r.spatialExtent.latitude[1]},${r.spatialExtent.longitude[0]} ${r.spatialExtent.latitude[1]},${r.spatialExtent.longitude[0]} ${r.spatialExtent.latitude[0]}))`
        );
      }
      await client.query(
        `INSERT INTO ${cswSource.prefix}_records
          (
            state,
            id,
            language_code,
            parent_identifier,
            hierarchy_level,
            hierarchy_level_name,
            date_stamp,
            abstract,
            srid,
            purpose,
            edition,
            title,
            alternate_title,
            category,
            spatial_resolution,
            spatial_type,
            geographic_description,
            temporal_start,
            temporal_end,
            temporal_start_unknown,
            temporal_end_unknown,
            spatial_description
            ${hasSpatial ? ',spatial' : ''}
          )
        VALUES
          (
            ${
              exists ? "'updated'" : "'new'"
            },$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
            ${hasSpatial ? ',	ST_ForceRHR(ST_GeomFromText($22, 4326))' : ''}
          )`,
        values
      );
      if (r.dates && r.dates.length > 0) {
        await client.query(
          `INSERT INTO ${cswSource.prefix}_dates 
            (date, type, record_id)
          VALUES
            ${r.dates
              .map((_d, di) => `($${di * 3 + 1},$${di * 3 + 2},$${di * 3 + 3})`)
              .join(',')}`,
          r.dates
            .map(d => [
              !d.date || typeof d.date === 'object' || d.date === ''
                ? null
                : dateFormat(d.date.toString()),
              d.type,
              r.id,
            ])
            .flat()
        );
      }

      if (r.constraints && r.constraints.length > 0) {
        await client.query(
          `INSERT INTO ${cswSource.prefix}_constraints 
            (type, value, record_id)
          VALUES
            ${r.constraints
              .map((_c, ci) => `($${ci * 3 + 1},$${ci * 3 + 2},$${ci * 3 + 3})`)
              .join(',')}`,
          r.constraints.map(d => [d.type, d.value, r.id]).flat()
        );
      }

      if (r.resources && r.resources.length > 0) {
        for (let ri = 0; ri < r.resources.length; ri += 1) {
          if (r.resources[ri] && r.resources[ri].url) {
            await client.query(
              `INSERT INTO ${cswSource.prefix}_resources 
                (distribution_format, url, application_profile, name, description, function, protocol, record_id)
              VALUES
                ${r.resources[ri].url
                  ?.map(
                    (_u, ui) =>
                      `($${ui * 8 + 1},$${ui * 8 + 2},$${ui * 8 + 3},$${
                        ui * 8 + 4
                      },$${ui * 8 + 5},$${ui * 8 + 6},$${ui * 8 + 7},$${
                        ui * 8 + 8
                      })`
                  )
                  .join(',')}`,
              r.resources[ri].url
                ?.map((d, rii) => [
                  r.resources[ri].distributionFormat?.[0],
                  d,
                  r.resources[ri].applicationProfile?.[rii],
                  r.resources[ri].name?.[rii],
                  r.resources[ri].description?.[rii],
                  r.resources[ri].function?.[rii],
                  r.resources[ri].protocol?.[rii],
                  r.id,
                ])
                .flat()
            );
          }
        }
      }

      if (r.keywords && r.keywords.length > 0) {
        for (let ri = 0; ri < r.keywords.length; ri += 1) {
          if (r.keywords[ri] && r.keywords[ri].name) {
            const kLength = r.keywords[ri].name?.length || 0;
            for (let rii = 0; rii < kLength; rii += 1) {
              const existsCheck = await client.query(
                `SELECT id FROM ${cswSource.prefix}_keywords WHERE name = $1 AND type = $2 AND anchor = $3`,
                [
                  r.keywords[ri].name?.[rii],
                  r.keywords[ri].type?.[rii],
                  r.keywords[ri].anchor?.[rii],
                ]
              );

              if (existsCheck.rowCount > 0) {
                await client.query(
                  `INSERT INTO ${cswSource.prefix}_ref_records_keywords (record_id, keyword_id) VALUES ($1,$2)`,
                  [r.id, existsCheck.rows[0].id]
                );
              } else {
                const newKeyword = await client.query(
                  `INSERT INTO ${cswSource.prefix}_keywords 
                    (name, type, anchor)
                  VALUES
                    ($1, $2, $3)
                  RETURNING id`,
                  [
                    r.keywords[ri].name?.[rii],
                    r.keywords[ri].type?.[rii],
                    r.keywords[ri].anchor?.[rii],
                  ]
                );

                await client.query(
                  `INSERT INTO ${cswSource.prefix}_ref_records_keywords (record_id, keyword_id) VALUES ($1, $2)`,
                  [r.id, newKeyword.rows[0].id]
                );
              }
            }
          }
        }
      }

      if (r.organisations && r.organisations.length > 0) {
        for (let ri = 0; ri < r.organisations.length; ri += 1) {
          const existsCheck = await client.query(
            `SELECT id FROM ${cswSource.prefix}_contacts WHERE (name = $1 OR ($1 IS NULL AND name IS NULL)) AND (individual_name = $2 OR ($2 IS NULL AND individual_name IS NULL)) AND (position = $3 OR ($3 IS NULL AND position IS NULL)) AND (city = $4 OR city IS NULL)`,
            [
              r.organisations[ri].name,
              r.organisations[ri].individualName,
              r.organisations[ri].position,
              r.organisations[ri].city,
            ]
          );

          if (existsCheck.rowCount > 0) {
            await client.query(
              `INSERT INTO ${cswSource.prefix}_ref_records_contacts (record_id, contact_id, type) VALUES ($1, $2, $3)`,
              [r.id, existsCheck.rows[0].id, r.organisations[ri].type?.[0]]
            );
          } else {
            const newContact = await client.query(
              `INSERT INTO ${cswSource.prefix}_contacts 
                (name, individual_name, position, phone, fax, url, email, delivery_point, city, admin_area, postcode, country)
              VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              RETURNING id`,
              [
                r.organisations[ri].name,
                r.organisations[ri].individualName,
                r.organisations[ri].position,
                r.organisations[ri].phone,
                r.organisations[ri].fax,
                r.organisations[ri].url,
                r.organisations[ri].email,
                r.organisations[ri].deliveryPoint,
                r.organisations[ri].city,
                r.organisations[ri].adminArea,
                r.organisations[ri].postcode,
                r.organisations[ri].country,
              ]
            );

            await client.query(
              `INSERT INTO ${cswSource.prefix}_ref_records_contacts (record_id, contact_id, type) VALUES ($1, $2, $3)`,
              [r.id, newContact.rows[0].id, r.organisations[ri].type?.[0]]
            );
          }
        }
      }
    }
  }
  return Promise.resolve();
};

export const formatArray = (
  array: (string | number | boolean | null)[] | null
): string | null => {
  if (!array || array.length === 0) {
    return null;
  }
  return `{${array
    .map(a => `${typeof a === 'string' ? `"${a.split('"').join('"')}"` : a}`)
    .join(',')}}`;
};
