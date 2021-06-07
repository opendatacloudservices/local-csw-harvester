"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatArray = exports.processPackages = exports.setQueueFailed = exports.removeFromQueue = exports.getQueueItem = exports.nextPackage = exports.insertQueue = exports.resetTables = exports.getAllInstances = exports.getInstance = exports.createInstance = exports.initMasterTable = exports.resetQueues = void 0;
const master_table = 'csw_instances';
const resetQueues = (client) => {
    return client
        .query(`SELECT prefix FROM ${master_table}`)
        .then(result => {
        return Promise.all(result.rows.map(row => {
            return client.query(`UPDATE ${row.prefix}_queue SET state = 'new'`);
        }));
    })
        .then(() => { });
};
exports.resetQueues = resetQueues;
const initMasterTable = (client) => {
    return client
        .query(`CREATE TABLE ${master_table} (
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
      )`)
        .then(() => { });
};
exports.initMasterTable = initMasterTable;
const createInstance = (client, cswSource) => {
    return client
        .query(`INSERT INTO ${master_table} (url, page_limit, version, type, prefix, long_name, note, active, special_params, rate_limit) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
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
    ])
        .then(() => client.query(`CREATE TABLE ${cswSource.prefix}_records (
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
      )`))
        .then(() => client.query(`CREATE TABLE ${cswSource.prefix}_queue (
        id SERIAL PRIMARY KEY,
        url TEXT,
        options TEXT,
        state TEXT
      )`))
        .then(() => client.query(`CREATE TABLE ${cswSource.prefix}_dates (
        id SERIAL PRIMARY KEY,
        record_id TEXT REFERENCES ${cswSource.prefix}_records(id),
        date DATE,
        type TEXT
      )`))
        .then(() => client.query(`CREATE TABLE ${cswSource.prefix}_constraints (
        id SERIAL PRIMARY KEY,
        record_id TEXT REFERENCES ${cswSource.prefix}_records(id),
        type TEXT,
        value TEXT
      )`))
        .then(() => client.query(`CREATE TABLE ${cswSource.prefix}_keywords (
        id SERIAL PRIMARY KEY,
        name TEXT,
        type TEXT,
        anchor TEXT
      )`))
        .then(() => client.query(`CREATE TABLE ${cswSource.prefix}_ref_records_keywords (
        record_id TEXT REFERENCES ${cswSource.prefix}_records(id),
        keyword_id INTEGER REFERENCES ${cswSource.prefix}_keywords(id)
      )`))
        .then(() => client.query(`CREATE TABLE ${cswSource.prefix}_resources (
        id SERIAL PRIMARY KEY,
        record_id TEXT REFERENCES ${cswSource.prefix}_records(id),
        distribution_format TEXT,
        url TEXT,
        application_profile TEXT,
        name TEXT,
        description TEXT,
        function TEXT,
        protocol TEXT
      )`))
        .then(() => client.query(`CREATE TABLE ${cswSource.prefix}_contacts (
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
      )`))
        .then(() => client.query(`CREATE TABLE ${cswSource.prefix}_ref_records_contacts (
        record_id TEXT REFERENCES ${cswSource.prefix}_records(id),
        contact_id INTEGER REFERENCES ${cswSource.prefix}_contacts(id),
        type TEXT
      )`))
        .then(() => { });
};
exports.createInstance = createInstance;
const getInstance = (client, id) => {
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
        }
        else {
            return Promise.reject(Error('Instance not found.'));
        }
    });
};
exports.getInstance = getInstance;
const getAllInstances = (client) => {
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
exports.getAllInstances = getAllInstances;
const resetTables = (client, prefix) => {
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
    return Promise.all(tables.map(t => {
        return client.query(`DELETE FROM ${prefix}${t}`);
    })).then(() => { });
};
exports.resetTables = resetTables;
const insertQueue = (client, prefix, queue) => {
    return client
        .query(`DELETE FROM ${prefix}_queue`)
        .then(() => client.query(`INSERT INTO ${prefix}_queue (url, options, state) VALUES ${queue
        .map((q, qi) => {
        return `($${2 * qi + 1},$${2 * qi + 2},'new')`;
    })
        .join(',')}`, queue
        .map(l => {
        return [l.url, JSON.stringify(l.options)];
    })
        .flat()))
        .then(() => { });
};
exports.insertQueue = insertQueue;
const nextPackage = (client, cswSource) => {
    return client
        .query(`UPDATE ${cswSource.prefix}_queue
      SET state = 'downloading' 
      WHERE id = (
        SELECT id
        FROM   ${cswSource.prefix}_queue
        WHERE  state = 'new'
        LIMIT  1
      )
      RETURNING id;`)
        .then(result => (result.rows.length > 0 ? result.rows[0].id : null));
};
exports.nextPackage = nextPackage;
const getQueueItem = (client, prefix, id) => {
    return client
        .query(`SELECT url, options FROM ${prefix}_queue WHERE id = $1`, [id])
        .then(result => {
        return {
            url: result.rows[0].url,
            options: JSON.parse(result.rows[0].options),
        };
    });
};
exports.getQueueItem = getQueueItem;
const removeFromQueue = (client, cswSource, url) => {
    return client
        .query(`DELETE FROM ${cswSource.prefix}_queue WHERE id = $1`, [url])
        .then(() => { });
};
exports.removeFromQueue = removeFromQueue;
const setQueueFailed = (client, cswSource, url) => {
    return client
        .query(`UPDATE ${cswSource.prefix}_queue SET state= 'failed' WHERE id = $1`, [url])
        .then(() => { });
};
exports.setQueueFailed = setQueueFailed;
const dateFormat = (d) => {
    if (d.trim().length === 4) {
        return d.trim() + '-01-01';
    }
    return d;
};
const processPackages = async (client, cswSource, cswRecords) => {
    var _a, _b, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _v, _w;
    for (let i = 0; i < cswRecords.length; i += 1) {
        const r = cswRecords[i];
        // check if exists
        const existCheck = await client.query(`SELECT id, TO_CHAR(date_stamp, 'YYYY-MM-DD') AS date_stamp FROM ${cswSource.prefix}_records WHERE id = $1`, [r.id]);
        let exists = false;
        let ignore = false;
        if (existCheck.rowCount > 0) {
            if ((!r.dateStamp && !existCheck.rows[0].date_stamp) ||
                (r.dateStamp &&
                    existCheck.rows[0].date_stamp === dateFormat(r.dateStamp.toString()))) {
                const existDates = await client.query(`SELECT type, TO_CHAR(date, 'YYYY-MM-DD') AS date FROM ${cswSource.prefix}_dates WHERE record_id = $1`, [existCheck.rows[0].id]);
                if (existDates.rows.length === 0 && r.dates.length === 0) {
                    // no proper way telling if this dataset was updated
                    ignore = true;
                }
                else if (existDates.rows.length > 0 && r.dates.length > 0) {
                    let allSame = true;
                    r.dates.forEach(date => {
                        let found = false;
                        existDates.rows.forEach(row => {
                            var _a;
                            if (date.date &&
                                row.date === dateFormat((_a = date.date) === null || _a === void 0 ? void 0 : _a.toString()) &&
                                row.type === date.type) {
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
                await client.query(`DELETE FROM ${cswSource.prefix}_dates WHERE record_id = $1`, [r.id]);
                await client.query(`DELETE FROM ${cswSource.prefix}_resources WHERE record_id = $1`, [r.id]);
                await client.query(`DELETE FROM ${cswSource.prefix}_constraints WHERE record_id = $1`, [r.id]);
                await client.query(`DELETE FROM ${cswSource.prefix}_ref_records_contacts WHERE record_id = $1`, [r.id]);
                await client.query(`DELETE FROM ${cswSource.prefix}_ref_records_keywords WHERE record_id = $1`, [r.id]);
                await client.query(`DELETE FROM ${cswSource.prefix}_records WHERE id = $1`, [r.id]);
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
                typeof ((_a = r.temporalExtent) === null || _a === void 0 ? void 0 : _a.start) === 'object'
                    ? null
                    : dateFormat((_b = r.temporalExtent) === null || _b === void 0 ? void 0 : _b.start),
                typeof ((_e = r.temporalExtent) === null || _e === void 0 ? void 0 : _e.end) === 'object'
                    ? null
                    : dateFormat((_f = r.temporalExtent) === null || _f === void 0 ? void 0 : _f.end),
                !((_g = r.temporalExtent) === null || _g === void 0 ? void 0 : _g.startUndetermined) ? false : true,
                !((_h = r.temporalExtent) === null || _h === void 0 ? void 0 : _h.endUndetermined) ? false : true,
                (_j = r.spatialExtent) === null || _j === void 0 ? void 0 : _j.description,
            ];
            let hasSpatial = false;
            if (r.spatialExtent &&
                r.spatialExtent.longitude &&
                r.spatialExtent.longitude.length === 2 &&
                r.spatialExtent.longitude[0] !== null &&
                r.spatialExtent.longitude[0] !== '' &&
                r.spatialExtent.latitude &&
                r.spatialExtent.latitude.length === 2 &&
                r.spatialExtent.latitude[0] !== null &&
                r.spatialExtent.latitude[0] !== '') {
                hasSpatial = true;
                values.push(`POLYGON((${r.spatialExtent.longitude[0]} ${r.spatialExtent.latitude[0]},${r.spatialExtent.longitude[1]} ${r.spatialExtent.latitude[0]},${r.spatialExtent.longitude[1]} ${r.spatialExtent.latitude[1]},${r.spatialExtent.longitude[0]} ${r.spatialExtent.latitude[1]},${r.spatialExtent.longitude[0]} ${r.spatialExtent.latitude[0]}))`);
            }
            await client.query(`INSERT INTO ${cswSource.prefix}_records
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
            ${exists ? "'updated'" : "'new'"},$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
            ${hasSpatial ? ',	ST_ForceRHR(ST_GeomFromText($22, 4326))' : ''}
          )`, values);
            if (r.dates && r.dates.length > 0) {
                await client.query(`INSERT INTO ${cswSource.prefix}_dates 
            (date, type, record_id)
          VALUES
            ${r.dates
                    .map((_d, di) => `($${di * 3 + 1},$${di * 3 + 2},$${di * 3 + 3})`)
                    .join(',')}`, r.dates
                    .map(d => [
                    !d.date || typeof d.date === 'object' || d.date === ''
                        ? null
                        : dateFormat(d.date.toString()),
                    d.type,
                    r.id,
                ])
                    .flat());
            }
            if (r.constraints && r.constraints.length > 0) {
                await client.query(`INSERT INTO ${cswSource.prefix}_constraints 
            (type, value, record_id)
          VALUES
            ${r.constraints
                    .map((_c, ci) => `($${ci * 3 + 1},$${ci * 3 + 2},$${ci * 3 + 3})`)
                    .join(',')}`, r.constraints.map(d => [d.type, d.value, r.id]).flat());
            }
            if (r.resources && r.resources.length > 0) {
                for (let ri = 0; ri < r.resources.length; ri += 1) {
                    if (r.resources[ri] && r.resources[ri].url) {
                        await client.query(`INSERT INTO ${cswSource.prefix}_resources 
                (distribution_format, url, application_profile, name, description, function, protocol, record_id)
              VALUES
                ${(_k = r.resources[ri].url) === null || _k === void 0 ? void 0 : _k.map((_u, ui) => `($${ui * 8 + 1},$${ui * 8 + 2},$${ui * 8 + 3},$${ui * 8 + 4},$${ui * 8 + 5},$${ui * 8 + 6},$${ui * 8 + 7},$${ui * 8 + 8})`).join(',')}`, (_l = r.resources[ri].url) === null || _l === void 0 ? void 0 : _l.map((d, rii) => {
                            var _a, _b, _e, _f, _g, _h;
                            return [
                                (_a = r.resources[ri].distributionFormat) === null || _a === void 0 ? void 0 : _a[0],
                                d,
                                (_b = r.resources[ri].applicationProfile) === null || _b === void 0 ? void 0 : _b[rii],
                                (_e = r.resources[ri].name) === null || _e === void 0 ? void 0 : _e[rii],
                                (_f = r.resources[ri].description) === null || _f === void 0 ? void 0 : _f[rii],
                                (_g = r.resources[ri].function) === null || _g === void 0 ? void 0 : _g[rii],
                                (_h = r.resources[ri].protocol) === null || _h === void 0 ? void 0 : _h[rii],
                                r.id,
                            ];
                        }).flat());
                    }
                }
            }
            if (r.keywords && r.keywords.length > 0) {
                for (let ri = 0; ri < r.keywords.length; ri += 1) {
                    if (r.keywords[ri] && r.keywords[ri].name) {
                        const kLength = ((_m = r.keywords[ri].name) === null || _m === void 0 ? void 0 : _m.length) || 0;
                        for (let rii = 0; rii < kLength; rii += 1) {
                            const existsCheck = await client.query(`SELECT id FROM ${cswSource.prefix}_keywords WHERE name = $1 AND type = $2 AND anchor = $3`, [
                                (_o = r.keywords[ri].name) === null || _o === void 0 ? void 0 : _o[rii],
                                (_p = r.keywords[ri].type) === null || _p === void 0 ? void 0 : _p[rii],
                                (_q = r.keywords[ri].anchor) === null || _q === void 0 ? void 0 : _q[rii],
                            ]);
                            if (existsCheck.rowCount > 0) {
                                await client.query(`INSERT INTO ${cswSource.prefix}_ref_records_keywords (record_id, keyword_id) VALUES ($1,$2)`, [r.id, existsCheck.rows[0].id]);
                            }
                            else {
                                const newKeyword = await client.query(`INSERT INTO ${cswSource.prefix}_keywords 
                    (name, type, anchor)
                  VALUES
                    ($1, $2, $3)
                  RETURNING id`, [
                                    (_r = r.keywords[ri].name) === null || _r === void 0 ? void 0 : _r[rii],
                                    (_s = r.keywords[ri].type) === null || _s === void 0 ? void 0 : _s[rii],
                                    (_t = r.keywords[ri].anchor) === null || _t === void 0 ? void 0 : _t[rii],
                                ]);
                                await client.query(`INSERT INTO ${cswSource.prefix}_ref_records_keywords (record_id, keyword_id) VALUES ($1, $2)`, [r.id, newKeyword.rows[0].id]);
                            }
                        }
                    }
                }
            }
            if (r.organisations && r.organisations.length > 0) {
                for (let ri = 0; ri < r.organisations.length; ri += 1) {
                    const existsCheck = await client.query(`SELECT id FROM ${cswSource.prefix}_contacts WHERE (name = $1 OR ($1 IS NULL AND name IS NULL)) AND (individual_name = $2 OR ($2 IS NULL AND individual_name IS NULL)) AND (position = $3 OR ($3 IS NULL AND position IS NULL)) AND (city = $4 OR city IS NULL)`, [
                        r.organisations[ri].name,
                        r.organisations[ri].individualName,
                        r.organisations[ri].position,
                        r.organisations[ri].city,
                    ]);
                    if (existsCheck.rowCount > 0) {
                        await client.query(`INSERT INTO ${cswSource.prefix}_ref_records_contacts (record_id, contact_id, type) VALUES ($1, $2, $3)`, [r.id, existsCheck.rows[0].id, (_v = r.organisations[ri].type) === null || _v === void 0 ? void 0 : _v[0]]);
                    }
                    else {
                        const newContact = await client.query(`INSERT INTO ${cswSource.prefix}_contacts 
                (name, individual_name, position, phone, fax, url, email, delivery_point, city, admin_area, postcode, country)
              VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              RETURNING id`, [
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
                        ]);
                        await client.query(`INSERT INTO ${cswSource.prefix}_ref_records_contacts (record_id, contact_id, type) VALUES ($1, $2, $3)`, [r.id, newContact.rows[0].id, (_w = r.organisations[ri].type) === null || _w === void 0 ? void 0 : _w[0]]);
                    }
                }
            }
        }
    }
    return Promise.resolve();
};
exports.processPackages = processPackages;
const formatArray = (array) => {
    if (!array || array.length === 0) {
        return null;
    }
    return `{${array
        .map(a => `${typeof a === 'string' ? `"${a.split('"').join('"')}"` : a}`)
        .join(',')}}`;
};
exports.formatArray = formatArray;
//# sourceMappingURL=index.js.map