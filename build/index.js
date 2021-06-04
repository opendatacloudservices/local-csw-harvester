"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./csw/index");
const index_2 = require("./postgres/index");
const dotenv = require("dotenv");
const path = require("path");
const pg_1 = require("pg");
const node_fetch_1 = require("node-fetch");
const pm2 = require("local-pm2-config");
const uuid_1 = require("uuid");
// get environmental variables
dotenv.config({ path: path.join(__dirname, '../.env') });
const local_microservice_1 = require("local-microservice");
const local_logger_1 = require("local-logger");
// connect to postgres (via env vars params)
const client = new pg_1.Client({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: parseInt(process.env.PGPORT || '5432'),
});
// connect and reset queues
client
    .connect()
    .then(() => {
    return index_2.resetQueues(client);
})
    .catch(err => {
    local_logger_1.logError({ message: err });
});
// number of parallel processes
let processCount = 1;
pm2.apps.forEach(app => {
    if (app.name === process.env.SERVICE_NAME) {
        processCount = app.max;
    }
});
const handleInstanceError = (res, req, err) => {
    if (!res.headersSent) {
        if (err.message === 'Instance not found.') {
            res.status(404).json({ message: err.message });
        }
        else {
            res.status(500).json({ error: err.message });
        }
    }
    local_logger_1.logError({
        ...local_logger_1.localTokens(res),
        message: err,
        params: [JSON.stringify(req.params)],
    });
};
/**
 * @swagger
 *
 * components:
 *   parameters:
 *     identifier:
 *       name: identifier
 *       description: prefix (string) or ID (integer) of csw instance.
 *       in: path
 *       required: true
 *       schema:
 *         type: string
 *   responses:
 *     500:
 *       description: error
 */
/**
 * @swagger
 *
 * /master/init:
 *   get:
 *     operationId: getMasterInit
 *     description: Inititate the csw management tables
 *     produces:
 *       - application/json
 *     parameters:
 *     responses:
 *       500:
 *         $ref: '#/components/responses/500'
 *       200:
 *         description: Init completed
 */
local_microservice_1.api.get('/master/init', (req, res) => {
    index_2.initMasterTable(client)
        .then(() => {
        res.status(200).json({ message: 'Init completed' });
    })
        .catch(err => {
        res.status(500).json({ error: err.message });
        local_logger_1.logError(err);
    });
});
/**
 * @swagger
 *
 * /instance/init:
 *   get:
 *     operationId: getInstanceInit
 *     description: Initialize a new csw instance
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: url
 *         description: Url of the new instance, url needs to include everything before ?request=...
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *       - name: prefix
 *         description: Prefix for the tables
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *       - name: version
 *         description: csw version in most cases 2.0.2
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *       - name: limit
 *         description: pagination limit
 *         in: query
 *         required: true
 *         schema:
 *           type: integer
 *       - name: type
 *         description: request method: get or post
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *       - name: longName
 *         description: descriptive name
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *       - name: note
 *         description: administrative note
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *       - name: active
 *         description: instance state
 *         in: query
 *         required: true
 *         schema:
 *           type: boolean
 *       - name: specialParams
 *         description: params to be attached to the query URL
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *       - name: rateLimit
 *         description: params to be attached to the query URL
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Init completed
 *       500:
 *         $ref: '#/components/responses/500'
 */
local_microservice_1.api.get('/instance/init', (req, res) => {
    const reqParams = [
        'url',
        'limit',
        'version',
        'type',
        'prefix',
        'longName',
        'active',
    ];
    let allParams = true;
    reqParams.forEach(p => {
        if (!(p in req.query)) {
            allParams = false;
        }
    });
    if (!allParams) {
        const err = Error('Missing parameter: prefix: string, domain: string and version: number are required parameters!');
        local_logger_1.logError({
            ...local_logger_1.localTokens(res),
            err,
        });
        res.status(500).json({ error: err.message });
    }
    else {
        index_2.createInstance(client, {
            url: req.query.url === undefined ? '' : req.query.url.toString(),
            limit: req.query.limit === undefined
                ? 10
                : parseInt(req.query.limit.toString()),
            version: req.query.version === undefined
                ? '2.0.2'
                : req.query.version.toString(),
            type: req.query.type !== 'get' && req.query.type !== 'post'
                ? 'get'
                : req.query.type,
            prefix: req.query.prefix === undefined ? uuid_1.v4() : req.query.prefix.toString(),
            longName: req.query.longName === undefined ? '' : req.query.longName.toString(),
            note: req.query.note === undefined ? '' : req.query.note.toString(),
            active: req.query.active === 'true' || req.query.active === undefined
                ? true
                : false,
            specialParams: req.query.specialParams === undefined
                ? ''
                : req.query.specialParams.toString(),
            rateLimit: req.query.rateLimit === undefined
                ? null
                : parseInt(req.query.rateLimit.toString()),
        })
            .then(() => {
            res.status(200).json({ message: 'Init completed' });
        })
            .catch(err => {
            handleInstanceError(res, req, err);
        });
    }
});
/**
 * @swagger
 *
 * /instance/reset/{identifier}:
 *   get:
 *     operationId: getInstanceReset
 *     description: Reset all tables of a csw instance
 *     produces:
 *       - application/json
 *     parameters:
 *       - $ref: '#/components/parameters/identifier'
 *     responses:
 *       500:
 *         $ref: '#/components/responses/500'
 *       200:
 *         description: Reset completed
 */
local_microservice_1.api.get('/instance/reset/:identifier', (req, res) => {
    index_2.getInstance(client, req.params.identifier)
        .then(ckanInstance => {
        return index_2.resetTables(client, ckanInstance.prefix);
    })
        .then(() => {
        res.status(200).json({ message: 'Reset completed' });
    })
        .catch(err => {
        handleInstanceError(res, req, err);
    });
});
/**
 * @swagger
 *
 * /process/package/{identifier}/{id}:
 *   get:
 *     operationId: getProcessPackage
 *     description: Start the processing of a csw instance's queue
 *     produces:
 *       - application/json
 *     parameters:
 *       - $ref: '#/components/parameters/identifier'
 *       - name: id
 *         description: id of csw package for url request
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: process completed
 *       500:
 *         $ref: '#/components/responses/500'
 */
local_microservice_1.api.get('/process/package/:identifier', (req, res) => {
    const trans = local_logger_1.startTransaction({
        name: 'packageShow',
        ...local_logger_1.localTokens(res),
    });
    index_2.getInstance(client, req.params.identifier)
        .then(cswInstance => {
        return index_2.nextPackage(client, cswInstance).then(id => {
            if (id) {
                res.status(200).json({ message: 'Initiated package processing' });
                return index_2.getQueueItem(client, cswInstance.prefix, parseInt(id))
                    .then(queueItem => index_1.packageShow(queueItem))
                    .then(cswRecords => {
                    trans(true, { message: 'packageShow complete' });
                    return index_2.processPackages(client, cswInstance, cswRecords);
                })
                    .then(async () => {
                    await index_2.removeFromQueue(client, cswInstance, id);
                    trans(true, {
                        message: 'processPackages complete',
                    });
                    // kick off next download
                    node_fetch_1.default(local_logger_1.addToken(`http://localhost:${process.env.PORT}/process/package/${req.params.identifier}`, res));
                })
                    .catch(err => {
                    console.log(err);
                    trans(false, { message: err });
                    index_2.setQueueFailed(client, cswInstance, id);
                    // kick off next download
                    node_fetch_1.default(local_logger_1.addToken(`http://localhost:${process.env.PORT}/process/package/${req.params.identifier}`, res));
                });
            }
            else {
                trans(true, { message: 'nothing to process' });
                res.status(200).json({ message: 'Nothing to process' });
                return Promise.resolve();
            }
        });
    })
        .catch(err => {
        handleInstanceError(res, req, err);
    });
});
/**
 * @swagger
 *
 * /process/instance/{identifier}:
 *   get:
 *     operationId: getProcessInstance
 *     description: Start the processing of a csw instance
 *     produces:
 *       - application/json
 *     parameters:
 *       - $ref: '#/components/parameters/identifier'
 *     responses:
 *       200:
 *         description: process completed
 *       500:
 *         $ref: '#/components/responses/500'
 */
local_microservice_1.api.get('/process/instance/:identifier', (req, res) => {
    index_2.getInstance(client, req.params.identifier)
        .then(cswInstance => {
        const trans = local_logger_1.startTransaction({
            name: 'packageList',
            ...local_logger_1.localTokens(res),
        });
        return index_1.packageList(cswInstance).then(async (list) => {
            // store the list in a db table for persistence across fails
            await index_2.insertQueue(client, cswInstance.prefix, list);
            local_microservice_1.simpleResponse(200, 'Queue created', res, trans);
            // number of parallel calls per process
            let parallelCount = 3 * processCount;
            if (cswInstance.rateLimit !== null && cswInstance.rateLimit > 0) {
                parallelCount = cswInstance.rateLimit;
            }
            const fetchs = [];
            for (let j = 0; j < parallelCount; j += 1) {
                fetchs.push(node_fetch_1.default(local_logger_1.addToken(`http://localhost:${process.env.PORT}/process/package/${req.params.identifier}`, res)));
            }
            await Promise.all(fetchs);
            trans(true, { message: 'Parallel package processing started' });
            return Promise.resolve();
        });
    })
        .catch(err => {
        handleInstanceError(res, req, err);
    });
});
/**
 * @swagger
 *
 * /process/all:
 *   get:
 *     operationId: getProcessAll
 *     description: Start the processing of all csw instances
 *     produces:
 *       - application/json
 *     parameters:
 *     responses:
 *       200:
 *         description: processes initiated
 *       500:
 *         $ref: '#/components/responses/500'
 */
local_microservice_1.api.get('/process/all', (req, res) => {
    index_2.getAllInstances(client)
        .then(instances => {
        return Promise.all(instances.map(instance => {
            return node_fetch_1.default(local_logger_1.addToken(`http://localhost:${process.env.PORT}/process/instance/${instance.id}`, res));
        }));
    })
        .then(() => {
        res.status(200).json({ message: 'Processing completed' });
    })
        .catch(err => {
        handleInstanceError(res, req, err);
    });
});
local_microservice_1.catchAll();
//# sourceMappingURL=index.js.map