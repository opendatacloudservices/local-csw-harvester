"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecords = void 0;
const node_fetch_1 = require("node-fetch");
const parser = require("fast-xml-parser");
const fs_1 = require("fs");
const getRecordsQuery = (cswSource, start, max) => {
    return `${cswSource.url}?REQUEST=GetRecords&SERVICE=CSW&VERSION=${cswSource.version}&RESULTTYPE=results&MAXRECORDS=${max}&typeNames=csw:Records&elementSetName=full&startPosition=${start}`;
};
const getRecords = (cswSource) => {
    // get number of records in service
    return node_fetch_1.default(getRecordsQuery(cswSource, 1, 1))
        .then(result => result.text())
        .then(resultText => {
        const json = parser.parse(resultText, { ignoreAttributes: false }, false);
        const max = json['csw:GetRecordsResponse']['csw:SearchResults']['@_numberOfRecordsMatched'];
        const calls = [];
        for (let c = 0; c < Math.ceil(max / cswSource.limit); c += 1) {
            calls.push(node_fetch_1.default(getRecordsQuery(cswSource, c * cswSource.limit + 1, cswSource.limit))
                .then(result => result.text())
                .then(resultText => parser.parse(resultText, { ignoreAttributes: false }, false)));
        }
        return Promise.all(calls);
    })
        .then(results => {
        fs_1.writeFileSync('tmp/csw-test.json', JSON.stringify(results, null, 2), 'utf8');
        return [];
    });
};
exports.getRecords = getRecords;
//# sourceMappingURL=index.js.map