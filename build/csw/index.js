"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.packageShow = exports.packageList = void 0;
const node_fetch_1 = require("node-fetch");
const parser = require("fast-xml-parser");
const get_1 = require("./get");
const getRecordsQuery = (cswSource, start, max) => {
    return `${cswSource.url}?REQUEST=GetRecords&SERVICE=CSW&VERSION=${cswSource.version}&RESULTTYPE=results&MAXRECORDS=${max}&typeNames=csw:Record&elementSetName=full&startPosition=${start}&outputSchema=http://www.isotc211.org/2005/gmd${cswSource.specialParams && cswSource.specialParams.length > 0
        ? cswSource.specialParams
        : ''}`;
};
const getRecordsQueryXML = (cswSource, start, max) => {
    return {
        method: 'POST',
        headers: {
            'content-type': 'application/xml',
        },
        body: `<?xml version="1.0" ?>
    <csw:GetRecords
      xmlns:csw="http://www.opengis.net/cat/csw/${cswSource.version}" 		 
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
      xmlns:ows="http://www.opengis.net/ows" 
      outputFormat="application/xml"
      version="${cswSource.version}"
      service="CSW"
      resultType="results"
      maxRecords="${max}" 
      startPosition="${start}"
      outputSchema="http://www.isotc211.org/2005/gmd" 
      xsi:schemaLocation="http://www.opengis.net/cat/csw/${cswSource.version} http://schemas.opengis.net/csw/${cswSource.version}/CSW-discovery.xsd">
      <csw:Query typeNames="csw:Record">
        <csw:ElementSetName>full</csw:ElementSetName>
      </csw:Query>
    </csw:GetRecords>`,
    };
};
const timeout = 1200 * 1000; // default 300 * 1000
const packageList = (cswSource) => {
    // get number of records in service
    return node_fetch_1.default(getRecordsQuery(cswSource, 1, 1), cswSource.type === 'post'
        ? { ...getRecordsQueryXML(cswSource, 1, 1), timeout: timeout }
        : { timeout: timeout })
        .then(result => result.text())
        .then(resultText => {
        const json = parser.parse(resultText, { ignoreAttributes: false, arrayMode: true, ignoreNameSpace: true }, false);
        if ('ExceptionReport' in json) {
            throw new Error(JSON.stringify(json));
        }
        const max = json['GetRecordsResponse'][0]['SearchResults'][0]['@_numberOfRecordsMatched'];
        const calls = [];
        for (let c = 0; c < Math.ceil(max / cswSource.limit); c += 1) {
            calls.push({
                url: getRecordsQuery(cswSource, c * cswSource.limit + 1, cswSource.limit),
                options: cswSource.type === 'post'
                    ? {
                        ...getRecordsQueryXML(cswSource, c * cswSource.limit + 1, cswSource.limit),
                        timeout: timeout,
                    }
                    : { timeout: timeout },
            });
        }
        return calls;
    });
};
exports.packageList = packageList;
const packageShow = (queueItem) => {
    return node_fetch_1.default(queueItem.url, queueItem.options)
        .then(result => result.text())
        .then(resultText => parser.parse(resultText, {
        ignoreAttributes: false,
        arrayMode: true,
        ignoreNameSpace: true,
    }, false))
        .then(results => {
        if ('ExceptionReport' in results) {
            throw new Error(JSON.stringify(results));
        }
        const searchResults = results['GetRecordsResponse'][0]['SearchResults'][0]['MD_Metadata'];
        const cswRecords = [];
        for (let s = 0; s < searchResults.length; s += 1) {
            const record = searchResults[s];
            let resources = [];
            const searchResource = get_1.traverse(record, [
                'distributionInfo',
                'MD_Distribution',
                'transferOptions',
            ]);
            if (searchResource) {
                resources = searchResource
                    .filter(r => {
                    return r ? true : false;
                })
                    .map(resource => {
                    return {
                        distributionFormat: get_1.onlySimple(get_1.traverse(record, [
                            'distributionInfo',
                            'MD_Distribution',
                            'distributionFormat',
                            'MD_Format',
                            'name',
                            'CharacterString',
                        ])) ||
                            get_1.onlySimple(get_1.traverse(record, [
                                'distributionInfo',
                                'MD_Distribution',
                                'distributor',
                                'MD_Distributor',
                                'distributorFormat',
                                'MD_Format',
                                'name',
                                'CharacterString',
                            ])),
                        url: get_1.onlySimple(get_1.traverse(resource, [
                            'MD_DigitalTransferOptions',
                            'onLine',
                            'CI_OnlineResource',
                            'linkage',
                            'URL',
                        ], false)),
                        applicationProfile: get_1.onlySimple(get_1.traverse(resource, [
                            'MD_DigitalTransferOptions',
                            'onLine',
                            'CI_OnlineResource',
                            'applicationProfile',
                            'CharacterString',
                        ], false)),
                        name: get_1.onlySimple(get_1.traverse(resource, [
                            'MD_DigitalTransferOptions',
                            'onLine',
                            'CI_OnlineResource',
                            'name',
                            'CharacterString',
                        ], false)),
                        description: get_1.onlySimple(get_1.traverse(resource, [
                            'MD_DigitalTransferOptions',
                            'onLine',
                            'CI_OnlineResource',
                            'description',
                            'CharacterString',
                        ], false)),
                        function: get_1.onlySimple(get_1.traverse(resource, [
                            'MD_DigitalTransferOptions',
                            'onLine',
                            'CI_OnlineResource',
                            'function',
                            'CI_OnLineFunctionCode',
                            ['#text', '@_codeListValue'],
                        ], false)),
                        protocol: get_1.onlySimple(get_1.traverse(resource, [
                            'MD_DigitalTransferOptions',
                            'onLine',
                            'CI_OnlineResource',
                            'protocol',
                            'CharacterString',
                        ], false)),
                    };
                });
            }
            let dates = [];
            const searchDates = get_1.traverse(record, [
                'identificationInfo',
                ['MD_DataIdentification', 'SV_ServiceIdentification'],
                'citation',
                'CI_Citation',
                'date',
            ]);
            if (searchDates) {
                dates = searchDates.map(date => {
                    if (!date) {
                        return {};
                    }
                    else {
                        return {
                            date: get_1.getFirst(get_1.traverse(date, ['CI_Date', 'date', ['DateTime', 'Date']])),
                            type: get_1.getFirst(get_1.traverse(date, [
                                'CI_Date',
                                'dateType',
                                ['CI_DateTypeCode', 'CI_DateTypeCode'],
                                '@_codeListValue',
                            ])),
                        };
                    }
                });
            }
            let constraints = [];
            const searchConstraints = get_1.traverse(record, [
                'identificationInfo',
                ['MD_DataIdentification', 'SV_ServiceIdentification'],
                'resourceConstraints',
            ]);
            if (searchConstraints) {
                constraints = searchConstraints
                    .filter(c => {
                    return c ? true : false;
                })
                    .map(constraint => {
                    const returnConstraints = [];
                    const useLimitation = get_1.traverse(constraint, [
                        ['MD_LegalConstraints', 'MD_Constraints'],
                        'useLimitation',
                        'CharacterString',
                    ]);
                    const useConstraint = get_1.traverse(constraint, [
                        ['MD_LegalConstraints', 'MD_Constraints'],
                        'useConstraints',
                        'MD_RestrictionCode',
                        '@_codeListValue',
                    ]);
                    let otherConstraint = get_1.traverse(constraint, [
                        ['MD_LegalConstraints', 'MD_Constraints'],
                        'otherConstraints',
                        'gmx:Anchor',
                    ]);
                    if (!otherConstraint || otherConstraint.length === 0) {
                        otherConstraint = get_1.traverse(constraint, [
                            ['MD_LegalConstraints', 'MD_Constraints'],
                            'otherConstraints',
                            'CharacterString',
                        ]);
                    }
                    const accessConstraint = get_1.traverse(constraint, [
                        ['MD_LegalConstraints', 'MD_Constraints'],
                        'accessConstraints',
                        'gmx:MD_RestrictionCode',
                        ['#text', '@_codeListValue'],
                    ]);
                    if (useConstraint && useConstraint.length !== 0) {
                        returnConstraints.push({
                            type: 'useConstraint',
                            value: useConstraint,
                        });
                    }
                    if (useLimitation && useLimitation.length !== 0) {
                        returnConstraints.push({
                            type: 'useLimitation',
                            value: useLimitation,
                        });
                    }
                    if (otherConstraint && otherConstraint.length !== 0) {
                        returnConstraints.push({
                            type: 'otherConstraint',
                            value: otherConstraint,
                        });
                    }
                    if (accessConstraint && accessConstraint.length !== 0) {
                        returnConstraints.push({
                            type: 'accessConstraint',
                            value: accessConstraint,
                        });
                    }
                    return returnConstraints;
                })
                    .flat();
            }
            let keywords = [];
            const searchKeywords = get_1.traverse(record, [
                'identificationInfo',
                ['MD_DataIdentification', 'SV_ServiceIdentification'],
                'descriptiveKeywords',
            ]);
            if (searchKeywords) {
                keywords = searchKeywords
                    .filter(k => {
                    return k ? true : false;
                })
                    .map(keyword => {
                    return {
                        name: get_1.traverse(keyword, ['MD_Keywords', 'keyword', 'CharacterString'], false),
                        type: get_1.traverse(keyword, [
                            'MD_Keywords',
                            'type',
                            'MD_KeywordTypeCode',
                            '@_codeListValue',
                        ]),
                        anchor: get_1.traverse(keyword, ['MD_Keywords', 'keyword', 'gmx:Anchor'], false),
                    };
                });
            }
            let organisations = [];
            const searchOrganisations = get_1.traverse(record, [
                'identificationInfo',
                ['MD_DataIdentification', 'SV_ServiceIdentification'],
                'pointOfContact',
            ]);
            if (searchOrganisations) {
                organisations = searchOrganisations
                    .filter(o => {
                    return o ? true : false;
                })
                    .map(organisation => {
                    return {
                        type: get_1.traverse(organisation, [
                            'CI_ResponsibleParty',
                            'role',
                            'CI_RoleCode',
                            '@_codeListValue',
                        ]),
                        name: get_1.traverse(organisation, [
                            'CI_ResponsibleParty',
                            'organisationName',
                            'CharacterString',
                        ]),
                        individualName: get_1.traverse(organisation, [
                            'CI_ResponsibleParty',
                            'individualName',
                            'CharacterString',
                        ]),
                        position: get_1.traverse(organisation, [
                            'CI_ResponsibleParty',
                            'positionName',
                            'CharacterString',
                        ]),
                        phone: get_1.traverse(organisation, [
                            'CI_ResponsibleParty',
                            'contactInfo',
                            'CI_Contact',
                            'phone',
                            'CI_Telephone',
                            'voice',
                            'CharacterString',
                        ]),
                        fax: get_1.traverse(organisation, [
                            'CI_ResponsibleParty',
                            'contactInfo',
                            'CI_Contact',
                            'phone',
                            'CI_Telephone',
                            'facsimile',
                            'CharacterString',
                        ]),
                        url: get_1.traverse(organisation, [
                            'CI_ResponsibleParty',
                            'contactInfo',
                            'CI_Contact',
                            'onlineResource',
                            'CI_OnlineResource',
                            'linkage',
                            'URL',
                        ]),
                        email: get_1.traverse(organisation, [
                            'CI_ResponsibleParty',
                            'contactInfo',
                            'CI_Contact',
                            'address',
                            'CI_Address',
                            'electronicMailAddress',
                            'CharacterString',
                        ]),
                        deliveryPoint: get_1.traverse(organisation, [
                            'CI_ResponsibleParty',
                            'contactInfo',
                            'CI_Contact',
                            'address',
                            'CI_Address',
                            'deliveryPoint',
                            'CharacterString',
                        ]),
                        city: get_1.traverse(organisation, [
                            'CI_ResponsibleParty',
                            'contactInfo',
                            'CI_Contact',
                            'address',
                            'CI_Address',
                            'city',
                            'CharacterString',
                        ]),
                        adminArea: get_1.traverse(organisation, [
                            'CI_ResponsibleParty',
                            'contactInfo',
                            'CI_Contact',
                            'address',
                            'CI_Address',
                            'administrativeArea',
                            'CharacterString',
                        ]),
                        postcode: get_1.traverse(organisation, [
                            'CI_ResponsibleParty',
                            'contactInfo',
                            'CI_Contact',
                            'address',
                            'CI_Address',
                            'postalCode',
                            'CharacterString',
                        ]),
                        country: get_1.traverse(organisation, [
                            'CI_ResponsibleParty',
                            'contactInfo',
                            'CI_Contact',
                            'address',
                            'CI_Address',
                            'country',
                            'CharacterString',
                        ]),
                    };
                });
            }
            cswRecords.push({
                id: get_1.getFirst(get_1.onlySimple(get_1.traverse(record, ['fileIdentifier', 'CharacterString']))),
                languageCode: get_1.getFirst(get_1.onlySimple(get_1.traverse(record, [
                    'language',
                    ['#text', '@_codeListValue', 'CharacterString'],
                ]))) ||
                    get_1.getFirst(get_1.onlySimple(get_1.traverse(record, [
                        'language',
                        'LanguageCode',
                        ['#text', '@_codeListValue'],
                    ]))),
                parentIdentifier: get_1.getFirst(get_1.onlySimple(get_1.traverse(record, ['parentIdentifier', 'CharacterString']))),
                hierarchyLevel: get_1.getFirst(get_1.onlySimple(get_1.traverse(record, [
                    'hierarchyLevel',
                    'MD_ScopeCode',
                    ['#text', '@_codeListValue'],
                ]))),
                hierarchyLevelName: get_1.getFirst(get_1.onlySimple(get_1.traverse(record, ['hierarchyLevelName', 'CharacterString']))),
                dateStamp: get_1.getFirst(get_1.onlySimple(get_1.traverse(record, ['dateStamp', ['Date', 'DateTime']]))),
                edition: get_1.traverse(record, [
                    'identificationInfo',
                    ['MD_DataIdentification', 'SV_ServiceIdentification'],
                    'citation',
                    'CI_Citation',
                    'edition',
                    'CharacterString',
                ]),
                abstract: get_1.getFirst(get_1.onlySimple(get_1.traverse(record, [
                    'identificationInfo',
                    ['MD_DataIdentification', 'SV_ServiceIdentification'],
                    'abstract',
                    'CharacterString',
                ]))),
                resources,
                srid: get_1.traverse(record, [
                    'referenceSystemInfo',
                    'MD_ReferenceSystem',
                    'referenceSystemIdentifier',
                    'RS_Identifier',
                    'code',
                    ['gmx:Anchor', 'CharacterString'],
                ]),
                purpose: get_1.traverse(record, [
                    'identificationInfo',
                    ['MD_DataIdentification', 'SV_ServiceIdentification'],
                    'purpose',
                    'CharacterString',
                ]),
                title: get_1.getFirst(get_1.onlySimple(get_1.traverse(record, [
                    'identificationInfo',
                    ['MD_DataIdentification', 'SV_ServiceIdentification'],
                    'citation',
                    'CI_Citation',
                    'title',
                    'CharacterString',
                ]))),
                alternateTitle: get_1.getFirst(get_1.onlySimple(get_1.traverse(record, [
                    'identificationInfo',
                    ['MD_DataIdentification', 'SV_ServiceIdentification'],
                    'citation',
                    'CI_Citation',
                    'alternateTitle',
                    'CharacterString',
                ]))),
                organisations,
                dates,
                category: get_1.traverse(record, [
                    'identificationInfo',
                    ['MD_DataIdentification', 'SV_ServiceIdentification'],
                    'topicCategory',
                    'MD_TopicCategoryCode',
                ]),
                spatialResolution: get_1.traverse(record, [
                    'identificationInfo',
                    ['MD_DataIdentification', 'SV_ServiceIdentification'],
                    'spatialResolution',
                    'MD_Resolution',
                    'equivalentScale',
                    'MD_RepresentativeFraction',
                    'denominator',
                    'Integer',
                ]),
                geographicDescription: get_1.traverse(record, [
                    'identificationInfo',
                    ['MD_DataIdentification', 'SV_ServiceIdentification'],
                    'extent',
                    'EX_Extent',
                    'geographicElement',
                    'EX_GeographicDescription',
                    'geographicIdentifier',
                    'MD_Identifier',
                    'code',
                    'CharacterString',
                ]),
                temporalExtent: {
                    start: get_1.onlySimple(get_1.traverse(record, [
                        'identificationInfo',
                        ['MD_DataIdentification', 'SV_ServiceIdentification'],
                        'extent',
                        'EX_Extent',
                        'temporalElement',
                        'EX_TemporalExtent',
                        'extent',
                        'gml:TimePeriod',
                        'gml:beginPosition',
                    ])),
                    end: get_1.onlySimple(get_1.traverse(record, [
                        'identificationInfo',
                        ['MD_DataIdentification', 'SV_ServiceIdentification'],
                        'extent',
                        'EX_Extent',
                        'temporalElement',
                        'EX_TemporalExtent',
                        'extent',
                        'gml:TimePeriod',
                        'gml:endPosition',
                    ])),
                    startUndetermined: get_1.onlySimple(get_1.traverse(record, [
                        'identificationInfo',
                        ['MD_DataIdentification', 'SV_ServiceIdentification'],
                        'extent',
                        'EX_Extent',
                        'temporalElement',
                        'EX_TemporalExtent',
                        'extent',
                        'gml:TimePeriod',
                        'gml:beginPosition',
                        '@_indeterminatePosition',
                    ])),
                    endUndetermined: get_1.onlySimple(get_1.traverse(record, [
                        'identificationInfo',
                        ['MD_DataIdentification', 'SV_ServiceIdentification'],
                        'extent',
                        'EX_Extent',
                        'temporalElement',
                        'EX_TemporalExtent',
                        'extent',
                        'gml:TimePeriod',
                        'gml:endPosition',
                        '@_indeterminatePosition',
                    ])),
                },
                spatialExtent: {
                    description: get_1.traverse(record, [
                        'identificationInfo',
                        ['MD_DataIdentification', 'SV_ServiceIdentification'],
                        'extent',
                        'EX_Extent',
                        'description',
                        'CharacterString',
                    ]),
                    longitude: [
                        get_1.getFirst(get_1.traverse(record, [
                            'identificationInfo',
                            ['MD_DataIdentification', 'SV_ServiceIdentification'],
                            'extent',
                            'EX_Extent',
                            'geographicElement',
                            'EX_GeographicBoundingBox',
                            'westBoundLongitude',
                            'Decimal',
                        ])),
                        get_1.getFirst(get_1.traverse(record, [
                            'identificationInfo',
                            ['MD_DataIdentification', 'SV_ServiceIdentification'],
                            'extent',
                            'EX_Extent',
                            'geographicElement',
                            'EX_GeographicBoundingBox',
                            'eastBoundLongitude',
                            'Decimal',
                        ])),
                    ],
                    latitude: [
                        get_1.getFirst(get_1.traverse(record, [
                            'identificationInfo',
                            ['MD_DataIdentification', 'SV_ServiceIdentification'],
                            'extent',
                            'EX_Extent',
                            'geographicElement',
                            'EX_GeographicBoundingBox',
                            'southBoundLatitude',
                            'Decimal',
                        ])),
                        get_1.getFirst(get_1.traverse(record, [
                            'identificationInfo',
                            ['MD_DataIdentification', 'SV_ServiceIdentification'],
                            'extent',
                            'EX_Extent',
                            'geographicElement',
                            'EX_GeographicBoundingBox',
                            'northBoundLatitude',
                            'Decimal',
                        ])),
                    ],
                },
                keywords,
                constraints,
            });
        }
        return cswRecords;
    });
};
exports.packageShow = packageShow;
//# sourceMappingURL=index.js.map