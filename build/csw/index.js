"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecords = void 0;
const node_fetch_1 = require("node-fetch");
const parser = require("fast-xml-parser");
const get_1 = require("./get");
const fs_1 = require("fs");
const getRecordsQuery = (cswSource, start, max) => {
    return `${cswSource.url}?REQUEST=GetRecords&SERVICE=CSW&VERSION=${cswSource.version}&RESULTTYPE=results&MAXRECORDS=${max}&typeNames=csw:Records&elementSetName=full&startPosition=${start}`;
};
const getRecords = (cswSource) => {
    // get number of records in service
    return node_fetch_1.default(getRecordsQuery(cswSource, 1, 1))
        .then(result => result.text())
        .then(resultText => {
        const json = parser.parse(resultText, { ignoreAttributes: false, arrayMode: true }, false);
        const max = json['csw:GetRecordsResponse'][0]['csw:SearchResults'][0]['@_numberOfRecordsMatched'];
        const calls = [];
        for (let c = 0; c < Math.ceil(max / cswSource.limit) && c < 1; c += 1) {
            calls.push(node_fetch_1.default(getRecordsQuery(cswSource, c * cswSource.limit + 1, cswSource.limit))
                .then(result => result.text())
                .then(resultText => parser.parse(resultText, { ignoreAttributes: false, arrayMode: true }, false)));
        }
        return Promise.all(calls);
    })
        .then(results => {
        let searchResults = [];
        results.forEach(r => {
            searchResults = searchResults.concat(r['csw:GetRecordsResponse'][0]['csw:SearchResults'][0]['gmd:MD_Metadata']);
        });
        const cswRecords = [];
        for (let s = 0; s < searchResults.length; s += 1) {
            const record = searchResults[s];
            let resources = [];
            const searchResource = get_1.traverse(record, [
                'gmd:distributionInfo',
                'gmd:MD_Distribution',
                'gmd:transferOptions',
            ]);
            if (searchResource) {
                resources = searchResource.map(resource => {
                    if (!resource) {
                        return {};
                    }
                    else {
                        return {
                            distributionFormat: get_1.onlySimple(get_1.traverse(record, [
                                'gmd:distributionInfo',
                                'gmd:MD_Distribution',
                                'gmd:distributionFormat',
                                'gmd:MD_Format',
                                'gmd:name',
                                'gco:CharacterString',
                            ])),
                            url: get_1.onlySimple(get_1.traverse(resource, [
                                'gmd:MD_DigitalTransferOptions',
                                'gmd:onLine',
                                'gmd:CI_OnlineResource',
                                'gmd:linkage',
                                'gmd:URL',
                            ])),
                            applicationProfile: get_1.onlySimple(get_1.traverse(resource, [
                                'gmd:MD_DigitalTransferOptions',
                                'gmd:onLine',
                                'gmd:CI_OnlineResource',
                                'gmd:applicationProfile',
                                'gco:CharacterString',
                            ])),
                            name: get_1.onlySimple(get_1.traverse(resource, [
                                'gmd:MD_DigitalTransferOptions',
                                'gmd:onLine',
                                'gmd:CI_OnlineResource',
                                'gmd:name',
                                'gco:CharacterString',
                            ])),
                            description: get_1.onlySimple(get_1.traverse(resource, [
                                'gmd:MD_DigitalTransferOptions',
                                'gmd:onLine',
                                'gmd:CI_OnlineResource',
                                'gmd:description',
                                'gco:CharacterString',
                            ])),
                            function: get_1.onlySimple(get_1.traverse(resource, [
                                'gmd:MD_DigitalTransferOptions',
                                'gmd:onLine',
                                'gmd:CI_OnlineResource',
                                'gmd:function',
                                'gmd:CI_OnLineFunctionCode',
                                '#text',
                            ])),
                            protocol: get_1.onlySimple(get_1.traverse(resource, [
                                'gmd:MD_DigitalTransferOptions',
                                'gmd:onLine',
                                'gmd:CI_OnlineResource',
                                'gmd:protocol',
                                'gco:CharacterString',
                            ])),
                        };
                    }
                });
            }
            let dates = [];
            const searchDates = get_1.traverse(record, [
                'gmd:identificationInfo',
                'gmd:MD_DataIdentification',
                'gmd:citation',
                'gmd:CI_Citation',
                'gmd:date',
            ]);
            if (searchDates) {
                dates = searchDates.map(date => {
                    if (!date) {
                        return {};
                    }
                    else {
                        return {
                            date: get_1.traverse(date, [
                                'gmd:CI_Date',
                                'gmd:date',
                                'gco:DateTime',
                            ]).flat()[0],
                            type: get_1.traverse(date, [
                                'gmd:CI_Date',
                                'gmd:dateType',
                                'gmd:CI_DateTypeCode',
                                '@_codeListValue',
                            ]).flat()[0],
                        };
                    }
                });
            }
            let constraints = [];
            const searchConstraints = get_1.traverse(record, [
                'gmd:identificationInfo',
                'gmd:MD_DataIdentification',
                'gmd:resourceConstraints',
            ]);
            if (searchConstraints) {
                constraints = searchConstraints.map(constraint => {
                    if (!constraint) {
                        return {};
                    }
                    else {
                        const useLimitation = get_1.traverse(constraint, [
                            'gmd:MD_LegalConstraints',
                            'gmd:useLimitation',
                            'gco:CharacterString',
                        ])[0];
                        const useConstraint = get_1.traverse(constraint, [
                            'gmd:MD_LegalConstraints',
                            'gmd:useConstraints',
                            'gmd:MD_RestrictionCode',
                            '@_codeListValue',
                        ])[0];
                        let otherConstraint = get_1.traverse(constraint, [
                            'gmd:MD_LegalConstraints',
                            'gmd:otherConstraints',
                            'gmx:Anchor',
                            '#text',
                        ])[0];
                        if (!otherConstraint) {
                            otherConstraint = get_1.traverse(constraint, [
                                'gmd:MD_LegalConstraints',
                                'gmd:otherConstraints',
                                'gco:CharacterString',
                            ])[0];
                        }
                        const accessConstraint = get_1.traverse(constraint, [
                            'gmd:MD_LegalConstraints',
                            'gmd:accessConstraints',
                            'gmx:MD_RestrictionCode',
                            '#text',
                        ])[0];
                        let type = '';
                        const value = [];
                        if (useConstraint) {
                            type = 'useConstraint';
                            value.push(useConstraint);
                        }
                        else if (useLimitation) {
                            type = 'useLimitation';
                            value.push(useLimitation);
                        }
                        else if (otherConstraint) {
                            type = 'otherConstraint';
                            value.push(otherConstraint);
                        }
                        else if (accessConstraint) {
                            type = 'accessConstraint';
                            value.push(accessConstraint);
                        }
                        return {
                            type,
                            value,
                        };
                    }
                });
            }
            let keywords = [];
            const searchKeywords = get_1.traverse(record, [
                'gmd:identificationInfo',
                'gmd:MD_DataIdentification',
                'gmd:descriptiveKeywords',
            ]);
            if (searchKeywords) {
                keywords = searchKeywords.map(keyword => {
                    if (!keyword) {
                        return {};
                    }
                    else {
                        return {
                            name: get_1.traverse(keyword, ['gmd:MD_Keywords', 'gmd:keyword', 'gco:CharacterString'], false).flat(),
                            type: get_1.traverse(keyword, [
                                'gmd:MD_Keywords',
                                'gmd:type',
                                'gmd:MD_KeywordTypeCode',
                                '@_codeListValue',
                            ]).flat(),
                            anchor: get_1.traverse(keyword, ['gmd:MD_Keywords', 'gmd:keyword', 'gmx:Anchor', '#text'], false).flat(),
                        };
                    }
                });
            }
            let organisations = [];
            const searchOrganisations = get_1.traverse(record, [
                'gmd:identificationInfo',
                'gmd:MD_DataIdentification',
                'gmd:pointOfContact',
            ]);
            if (searchOrganisations) {
                organisations = searchOrganisations.map(organisation => {
                    if (organisation) {
                        return {
                            type: get_1.traverse(organisation, [
                                'gmd:CI_ResponsibleParty',
                                'gmd:role',
                                'gmd:CI_RoleCode',
                                '@_codeListValue',
                            ]),
                            name: get_1.traverse(organisation, [
                                'gmd:CI_ResponsibleParty',
                                'gmd:organisationName',
                                'gco:CharacterString',
                            ]),
                            position: get_1.traverse(organisation, [
                                'gmd:CI_ResponsibleParty',
                                'gmd:positionName',
                                'gco:CharacterString',
                            ]),
                            phone: get_1.traverse(organisation, [
                                'gmd:CI_ResponsibleParty',
                                'gmd:contactInfo',
                                'gmd:CI_Contact',
                                'gmd:phone',
                                'gmd:CI_Telephone',
                                'gmd:voice',
                                'gco:CharacterString',
                            ]),
                            fax: get_1.traverse(organisation, [
                                'gmd:CI_ResponsibleParty',
                                'gmd:contactInfo',
                                'gmd:CI_Contact',
                                'gmd:phone',
                                'gmd:CI_Telephone',
                                'gmd:facsimile',
                                'gco:CharacterString',
                            ]),
                            url: get_1.traverse(organisation, [
                                'gmd:CI_ResponsibleParty',
                                'gmd:contactInfo',
                                'gmd:CI_Contact',
                                'gmd:onlineResource',
                                'gmd:CI_OnlineResource',
                                'gmd:linkage',
                                'gmd:URL',
                            ]),
                            email: get_1.traverse(organisation, [
                                'gmd:CI_ResponsibleParty',
                                'gmd:contactInfo',
                                'gmd:CI_Contact',
                                'gmd:address',
                                'gmd:CI_Address',
                                'gmd:electronicMailAddress',
                                'gco:CharacterString',
                            ]),
                            deliveryPoint: get_1.traverse(organisation, [
                                'gmd:CI_ResponsibleParty',
                                'gmd:contactInfo',
                                'gmd:CI_Contact',
                                'gmd:address',
                                'gmd:CI_Address',
                                'gmd:deliveryPoint',
                                'gco:CharacterString',
                            ]),
                            city: get_1.traverse(organisation, [
                                'gmd:CI_ResponsibleParty',
                                'gmd:contactInfo',
                                'gmd:CI_Contact',
                                'gmd:address',
                                'gmd:CI_Address',
                                'gmd:city',
                                'gco:CharacterString',
                            ]),
                            adminArea: get_1.traverse(organisation, [
                                'gmd:CI_ResponsibleParty',
                                'gmd:contactInfo',
                                'gmd:CI_Contact',
                                'gmd:address',
                                'gmd:CI_Address',
                                'gmd:administrativeArea',
                                'gco:CharacterString',
                            ]),
                            postcode: get_1.traverse(organisation, [
                                'gmd:CI_ResponsibleParty',
                                'gmd:contactInfo',
                                'gmd:CI_Contact',
                                'gmd:address',
                                'gmd:CI_Address',
                                'gmd:postalCode',
                                'gco:CharacterString',
                            ]),
                            country: get_1.traverse(organisation, [
                                'gmd:CI_ResponsibleParty',
                                'gmd:contactInfo',
                                'gmd:CI_Contact',
                                'gmd:address',
                                'gmd:CI_Address',
                                'gmd:country',
                                'gco:CharacterString',
                            ]),
                        };
                    }
                    else {
                        return {};
                    }
                });
            }
            cswRecords.push({
                id: get_1.traverse(record, [
                    'gmd:fileIdentifier',
                    'gco:CharacterString',
                ])[0],
                languageCode: get_1.traverse(record, [
                    'gmd:language',
                    'gmd:LanguageCode',
                    '#text',
                ]),
                parentIdentifier: get_1.traverse(record, [
                    'gmd:parentIdentifier',
                    'gco:CharacterString',
                ]),
                hierarchyLevel: get_1.traverse(record, [
                    'gmd:hierarchyLevel',
                    'gmd:MD_ScopeCode',
                    '#text',
                ]),
                hierarchyLevelName: get_1.traverse(record, [
                    'gmd:hierarchyLevelName',
                    'gco:CharacterString',
                ]),
                dateStamp: get_1.traverse(record, ['gmd:dateStamp', 'gco:Date']),
                abstract: get_1.traverse(record, [
                    'gmd:identificationInfo',
                    'gmd:MD_DataIdentification',
                    'gmd:abstract',
                    'gco:CharacterString',
                ]),
                resources,
                srid: get_1.traverse(record, [
                    'gmd:referenceSystemInfo',
                    'gmd:MD_ReferenceSystem',
                    'gmd:referenceSystemIdentifier',
                    'gmd:RS_Identifier',
                    'gmd:code',
                    'gmx:Anchor',
                    '#text',
                ]),
                title: get_1.traverse(record, [
                    'gmd:identificationInfo',
                    'gmd:MD_DataIdentification',
                    'gmd:citation',
                    'gmd:CI_Citation',
                    'gmd:title',
                    'gco:CharacterString',
                ]),
                alternateTitle: get_1.traverse(record, [
                    'gmd:identificationInfo',
                    'gmd:MD_DataIdentification',
                    'gmd:citation',
                    'gmd:CI_Citation',
                    'gmd:alternateTitle',
                    'gco:CharacterString',
                ]),
                organisations,
                dates,
                category: get_1.traverse(record, [
                    'gmd:identificationInfo',
                    'gmd:MD_DataIdentification',
                    'gmd:topicCategory',
                    'gmd:MD_TopicCategoryCode',
                ]),
                spatialResolution: get_1.traverse(record, [
                    'gmd:identificationInfo',
                    'gmd:MD_DataIdentification',
                    'gmd:citation',
                    'gmd:spatialResolution',
                    'gmd:MD_Resolution',
                    'gmd:equivalentScale',
                    'gmd:MD_RepresentativeFraction',
                    'gmd:denominator',
                    'gco:Integer',
                ]),
                geographicDescription: get_1.traverse(record, [
                    'gmd:identificationInfo',
                    'gmd:MD_DataIdentification',
                    'gmd:extent',
                    'gmd:EX_Extent',
                    'gmd:geographicElement',
                    'gmd:EX_GeographicDescription',
                    'gmd:geographicIdentifier',
                    'gmd:MD_Identifier',
                    'gmd:code',
                    'gco:CharacterString',
                ]),
                temporalExtent: {
                    start: get_1.onlySimple(get_1.traverse(record, [
                        'gmd:identificationInfo',
                        'gmd:MD_DataIdentification',
                        'gmd:extent',
                        'gmd:EX_Extent',
                        'gmd:temporalElement',
                        'gmd:EX_TemporalExtent',
                        'gmd:extent',
                        'gml:TimePeriod',
                        'gml:beginPosition',
                    ])),
                    end: get_1.onlySimple(get_1.traverse(record, [
                        'gmd:identificationInfo',
                        'gmd:MD_DataIdentification',
                        'gmd:extent',
                        'gmd:EX_Extent',
                        'gmd:temporalElement',
                        'gmd:EX_TemporalExtent',
                        'gmd:extent',
                        'gml:TimePeriod',
                        'gml:endPosition',
                    ])),
                    startUndetermined: get_1.onlySimple(get_1.traverse(record, [
                        'gmd:identificationInfo',
                        'gmd:MD_DataIdentification',
                        'gmd:extent',
                        'gmd:EX_Extent',
                        'gmd:temporalElement',
                        'gmd:EX_TemporalExtent',
                        'gmd:extent',
                        'gml:TimePeriod',
                        'gml:beginPosition',
                        '@_indeterminatePosition',
                    ])),
                    endUndetermined: get_1.onlySimple(get_1.traverse(record, [
                        'gmd:identificationInfo',
                        'gmd:MD_DataIdentification',
                        'gmd:extent',
                        'gmd:EX_Extent',
                        'gmd:temporalElement',
                        'gmd:EX_TemporalExtent',
                        'gmd:extent',
                        'gml:TimePeriod',
                        'gml:endPosition',
                        '@_indeterminatePosition',
                    ])),
                },
                spatialExtent: {
                    longitude: [
                        get_1.traverse(record, [
                            'gmd:identificationInfo',
                            'gmd:MD_DataIdentification',
                            'gmd:extent',
                            'gmd:EX_Extent',
                            'gmd:geographicElement',
                            'gmd:EX_GeographicBoundingBox',
                            'gmd:westBoundLongitude',
                            'gco:Decimal',
                        ])[0],
                        get_1.traverse(record, [
                            'gmd:identificationInfo',
                            'gmd:MD_DataIdentification',
                            'gmd:extent',
                            'gmd:EX_Extent',
                            'gmd:geographicElement',
                            'gmd:EX_GeographicBoundingBox',
                            'gmd:eastBoundLongitude',
                            'gco:Decimal',
                        ])[0],
                    ],
                    latitude: [
                        get_1.traverse(record, [
                            'gmd:identificationInfo',
                            'gmd:MD_DataIdentification',
                            'gmd:extent',
                            'gmd:EX_Extent',
                            'gmd:geographicElement',
                            'gmd:EX_GeographicBoundingBox',
                            'gmd:southBoundLatitude',
                            'gco:Decimal',
                        ])[0],
                        get_1.traverse(record, [
                            'gmd:identificationInfo',
                            'gmd:MD_DataIdentification',
                            'gmd:extent',
                            'gmd:EX_Extent',
                            'gmd:geographicElement',
                            'gmd:EX_GeographicBoundingBox',
                            'gmd:northBoundLatitude',
                            'gco:Decimal',
                        ])[0],
                    ],
                },
                keywords,
                constraints,
            });
        }
        fs_1.writeFileSync('./tmp/csw-output.json', JSON.stringify(cswRecords, null, 2), 'utf8');
        fs_1.writeFileSync('./tmp/csw-test.json', JSON.stringify(searchResults, null, 2), 'utf8');
        return cswRecords;
    });
};
exports.getRecords = getRecords;
//# sourceMappingURL=index.js.map