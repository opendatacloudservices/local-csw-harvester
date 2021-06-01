import {getRecords} from './csw/index';
import {
  resetQueues,
  initMasterTable,
  createInstance,
  getInstance,
  resetTables,
} from './postgres/index';
import * as dotenv from 'dotenv';
import * as path from 'path';
import {Client} from 'pg';
import fetch from 'node-fetch';
import * as pm2 from 'local-pm2-config';
import {v4 as uuid} from 'uuid';
import {Response, Request} from 'express';

// get environmental variables
dotenv.config({path: path.join(__dirname, '../.env')});

import {api, catchAll, simpleResponse} from 'local-microservice';

import {logError, startTransaction, localTokens, addToken} from 'local-logger';

// connect to postgres (via env vars params)
const client = new Client({
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
    return resetQueues(client);
  })
  .catch(err => {
    logError({message: err});
  });

// number of parallel processes
let processCount = 1;
pm2.apps.forEach(app => {
  if (app.name === process.env.SERVICE_NAME) {
    processCount = app.max;
  }
});

const handleInstanceError = (res: Response, req: Request, err: Error) => {
  if (!res.headersSent) {
    if (err.message === 'Instance not found.') {
      res.status(404).json({message: err.message});
    } else {
      res.status(500).json({error: err.message});
    }
  }
  logError({
    ...localTokens(res),
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
api.get('/master/init', (req, res) => {
  initMasterTable(client)
    .then(() => {
      res.status(200).json({message: 'Init completed'});
    })
    .catch(err => {
      res.status(500).json({error: err.message});
      logError(err);
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
 *     responses:
 *       200:
 *         description: Init completed
 *       500:
 *         $ref: '#/components/responses/500'
 */
api.get('/instance/init', (req, res) => {
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
    const err = Error(
      'Missing parameter: prefix: string, domain: string and version: number are required parameters!'
    );
    logError({
      ...localTokens(res),
      err,
    });
    res.status(500).json({error: err.message});
  } else {
    createInstance(client, {
      url: req.query.url === undefined ? '' : req.query.url.toString(),
      limit:
        req.query.limit === undefined
          ? 10
          : parseInt(req.query.limit.toString()),
      version:
        req.query.version === undefined
          ? '2.0.2'
          : req.query.version.toString(),
      type:
        req.query.type !== 'get' && req.query.type !== 'post'
          ? 'get'
          : req.query.type,
      prefix:
        req.query.prefix === undefined ? uuid() : req.query.prefix.toString(),
      longName:
        req.query.longName === undefined ? '' : req.query.longName.toString(),
      note: req.query.note === undefined ? '' : req.query.note.toString(),
      active:
        req.query.active === 'true' || req.query.active === undefined
          ? true
          : false,
      specialParams:
        req.query.specialParams === undefined
          ? ''
          : req.query.specialParams.toString(),
    })
      .then(() => {
        res.status(200).json({message: 'Init completed'});
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
 *     description: Reset all tables of a ckan instance
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
api.get('/instance/reset/:identifier', (req, res) => {
  getInstance(client, req.params.identifier)
    .then(ckanInstance => {
      return resetTables(client, ckanInstance.prefix);
    })
    .then(() => {
      res.status(200).json({message: 'Reset completed'});
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
 *     description: Start the processing of a ckan instance
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
api.get('/process/instance/:identifier', (req, res) => {
  getInstance(client, req.params.identifier)
    .then(ckanInstance => {
      const trans = startTransaction({
        name: 'packageList',
        ...localTokens(res),
      });
      return packageList(ckanInstance.domain, ckanInstance.version).then(
        async list => {
          // store the list in a db table for persistence across fails
          await insertQueue(client, ckanInstance.prefix, list);
          simpleResponse(200, 'Queue created', res, trans);
          // number of parallel calls per process
          let parallelCount = 3 * processCount;
          if (ckanInstance.rate_limit !== null && ckanInstance.rate_limit > 0) {
            parallelCount = ckanInstance.rate_limit;
          }
          const fetchs = [];
          for (let j = 0; j < parallelCount; j += 1) {
            fetchs.push(
              fetch(
                addToken(
                  `http://localhost:${process.env.PORT}/process/package/${req.params.identifier}`,
                  res
                )
              )
            );
          }
          await Promise.all(fetchs);
          trans(true, {message: 'Parallel package processing started'});
          return Promise.resolve();
        }
      );
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
 *     description: Start the processing of all ckan instance
 *     produces:
 *       - application/json
 *     parameters:
 *     responses:
 *       200:
 *         description: processes initiated
 *       500:
 *         $ref: '#/components/responses/500'
 */
api.get('/process/all', (req, res) => {
  allInstances(client)
    .then(instanceIds => {
      return Promise.all(
        instanceIds.map(identifier => {
          return getInstance(client, identifier).then(ckanInstance =>
            fetch(
              addToken(
                `http://localhost:${process.env.PORT}/process/instance/${ckanInstance.id}`,
                res
              )
            )
          );
        })
      );
    })
    .then(() => {
      res.status(200).json({message: 'Processing completed'});
    })
    .catch(err => {
      handleInstanceError(res, req, err);
    });
});

catchAll();
