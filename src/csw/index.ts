import fetch from 'node-fetch';
import * as parser from 'fast-xml-parser';
import {traverse, onlySimple, getFirst} from './get';
import {
  CswContact,
  CswSource,
  CswRecord,
  CswRawRecord,
  CswResource,
  CswRawTransferOption,
  CswRawContact,
  CswDate,
  CswRawDate,
  CswKeyword,
  CswConstraint,
  CswRawConstraint,
  CswRawKeyword,
  fetchOptions,
} from './types';

const getRecordsQuery = (
  cswSource: CswSource,
  start: number,
  max: number
): string => {
  return `${cswSource.url}?REQUEST=GetRecords&SERVICE=CSW&VERSION=${
    cswSource.version
  }&RESULTTYPE=results&MAXRECORDS=${max}&typeNames=csw:Record&elementSetName=full&startPosition=${start}&outputSchema=http://www.isotc211.org/2005/gmd${
    cswSource.specialParams && cswSource.specialParams.length > 0
      ? cswSource.specialParams
      : ''
  }`;
};

const getRecordsQueryXML = (
  cswSource: CswSource,
  start: number,
  max: number
): fetchOptions => {
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

export const packageList = (
  cswSource: CswSource
): Promise<{url: string; options: fetchOptions}[]> => {
  // get number of records in service
  return fetch(
    getRecordsQuery(cswSource, 1, 1),
    cswSource.type === 'post' ? getRecordsQueryXML(cswSource, 1, 1) : {}
  )
    .then(result => result.text())
    .then(resultText => {
      const json = parser.parse(
        resultText,
        {ignoreAttributes: false, arrayMode: true, ignoreNameSpace: true},
        false
      );

      if ('ExceptionReport' in json) {
        throw new Error(JSON.stringify(json));
      }

      const max =
        json['GetRecordsResponse'][0]['SearchResults'][0][
          '@_numberOfRecordsMatched'
        ];

      const calls = [];
      for (let c = 0; c < Math.ceil(max / cswSource.limit); c += 1) {
        calls.push({
          url: getRecordsQuery(
            cswSource,
            c * cswSource.limit + 1,
            cswSource.limit
          ),
          options:
            cswSource.type === 'post'
              ? getRecordsQueryXML(
                  cswSource,
                  c * cswSource.limit + 1,
                  cswSource.limit
                )
              : {},
        });
      }
      return calls;
    });
};

export const packageShow = (queueItem: {
  url: string;
  options: fetchOptions;
}): Promise<CswRecord[]> => {
  return fetch(queueItem.url, queueItem.options)
    .then(result => result.text())
    .then(resultText =>
      parser.parse(
        resultText,
        {
          ignoreAttributes: false,
          arrayMode: true,
          ignoreNameSpace: true,
        },
        false
      )
    )
    .then(results => {
      if ('ExceptionReport' in results) {
        throw new Error(JSON.stringify(results));
      }

      const searchResults: CswRawRecord[] =
        results['GetRecordsResponse'][0]['SearchResults'][0]['MD_Metadata'];

      const cswRecords = [];
      for (let s = 0; s < searchResults.length; s += 1) {
        const record = searchResults[s];

        let resources: CswResource[] = [];
        const searchResource: CswRawTransferOption[] = traverse(record, [
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
                distributionFormat:
                  onlySimple(
                    traverse(record, [
                      'distributionInfo',
                      'MD_Distribution',
                      'distributionFormat',
                      'MD_Format',
                      'name',
                      'CharacterString',
                    ])
                  ) ||
                  onlySimple(
                    traverse(record, [
                      'distributionInfo',
                      'MD_Distribution',
                      'distributor',
                      'MD_Distributor',
                      'distributorFormat',
                      'MD_Format',
                      'name',
                      'CharacterString',
                    ])
                  ),
                url: onlySimple(
                  traverse(
                    resource,
                    [
                      'MD_DigitalTransferOptions',
                      'onLine',
                      'CI_OnlineResource',
                      'linkage',
                      'URL',
                    ],
                    false
                  )
                ),
                applicationProfile: onlySimple(
                  traverse(
                    resource,
                    [
                      'MD_DigitalTransferOptions',
                      'onLine',
                      'CI_OnlineResource',
                      'applicationProfile',
                      'CharacterString',
                    ],
                    false
                  )
                ),
                name: onlySimple(
                  traverse(
                    resource,
                    [
                      'MD_DigitalTransferOptions',
                      'onLine',
                      'CI_OnlineResource',
                      'name',
                      'CharacterString',
                    ],
                    false
                  )
                ),
                description: onlySimple(
                  traverse(
                    resource,
                    [
                      'MD_DigitalTransferOptions',
                      'onLine',
                      'CI_OnlineResource',
                      'description',
                      'CharacterString',
                    ],
                    false
                  )
                ),
                function: onlySimple(
                  traverse(
                    resource,
                    [
                      'MD_DigitalTransferOptions',
                      'onLine',
                      'CI_OnlineResource',
                      'function',
                      'CI_OnLineFunctionCode',
                      ['#text', '@_codeListValue'],
                    ],
                    false
                  )
                ),
                protocol: onlySimple(
                  traverse(
                    resource,
                    [
                      'MD_DigitalTransferOptions',
                      'onLine',
                      'CI_OnlineResource',
                      'protocol',
                      'CharacterString',
                    ],
                    false
                  )
                ),
              };
            });
        }

        let dates: CswDate[] = [];
        const searchDates: CswRawDate[] = traverse(record, [
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
            } else {
              return {
                date: getFirst(
                  traverse(date, ['CI_Date', 'date', ['DateTime', 'Date']])
                ),
                type: getFirst(
                  traverse(date, [
                    'CI_Date',
                    'dateType',
                    ['CI_DateTypeCode', 'CI_DateTypeCode'],
                    '@_codeListValue',
                  ])
                ),
              };
            }
          });
        }

        let constraints: CswConstraint[] = [];
        const searchConstraints: CswRawConstraint[] = traverse(record, [
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
              const returnConstraints: CswConstraint[] = [];
              const useLimitation = traverse(constraint, [
                ['MD_LegalConstraints', 'MD_Constraints'],
                'useLimitation',
                'CharacterString',
              ]);
              const useConstraint = traverse(constraint, [
                ['MD_LegalConstraints', 'MD_Constraints'],
                'useConstraints',
                'MD_RestrictionCode',
                '@_codeListValue',
              ]);
              let otherConstraint = traverse(constraint, [
                ['MD_LegalConstraints', 'MD_Constraints'],
                'otherConstraints',
                'gmx:Anchor',
              ]);
              if (!otherConstraint || otherConstraint.length === 0) {
                otherConstraint = traverse(constraint, [
                  ['MD_LegalConstraints', 'MD_Constraints'],
                  'otherConstraints',
                  'CharacterString',
                ]);
              }
              const accessConstraint = traverse(constraint, [
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

        let keywords: CswKeyword[] = [];
        const searchKeywords: CswRawKeyword[] = traverse(record, [
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
                name: traverse(
                  keyword,
                  ['MD_Keywords', 'keyword', 'CharacterString'],
                  false
                ),
                type: traverse(keyword, [
                  'MD_Keywords',
                  'type',
                  'MD_KeywordTypeCode',
                  '@_codeListValue',
                ]),
                anchor: traverse(
                  keyword,
                  ['MD_Keywords', 'keyword', 'gmx:Anchor'],
                  false
                ),
              };
            });
        }

        let organisations: CswContact[] = [];
        const searchOrganisations: CswRawContact[] = traverse(record, [
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
                type: traverse(organisation, [
                  'CI_ResponsibleParty',
                  'role',
                  'CI_RoleCode',
                  '@_codeListValue',
                ]),
                name: traverse(organisation, [
                  'CI_ResponsibleParty',
                  'organisationName',
                  'CharacterString',
                ]),
                individualName: traverse(organisation, [
                  'CI_ResponsibleParty',
                  'individualName',
                  'CharacterString',
                ]),
                position: traverse(organisation, [
                  'CI_ResponsibleParty',
                  'positionName',
                  'CharacterString',
                ]),
                phone: traverse(organisation, [
                  'CI_ResponsibleParty',
                  'contactInfo',
                  'CI_Contact',
                  'phone',
                  'CI_Telephone',
                  'voice',
                  'CharacterString',
                ]),
                fax: traverse(organisation, [
                  'CI_ResponsibleParty',
                  'contactInfo',
                  'CI_Contact',
                  'phone',
                  'CI_Telephone',
                  'facsimile',
                  'CharacterString',
                ]),
                url: traverse(organisation, [
                  'CI_ResponsibleParty',
                  'contactInfo',
                  'CI_Contact',
                  'onlineResource',
                  'CI_OnlineResource',
                  'linkage',
                  'URL',
                ]),
                email: traverse(organisation, [
                  'CI_ResponsibleParty',
                  'contactInfo',
                  'CI_Contact',
                  'address',
                  'CI_Address',
                  'electronicMailAddress',
                  'CharacterString',
                ]),
                deliveryPoint: traverse(organisation, [
                  'CI_ResponsibleParty',
                  'contactInfo',
                  'CI_Contact',
                  'address',
                  'CI_Address',
                  'deliveryPoint',
                  'CharacterString',
                ]),
                city: traverse(organisation, [
                  'CI_ResponsibleParty',
                  'contactInfo',
                  'CI_Contact',
                  'address',
                  'CI_Address',
                  'city',
                  'CharacterString',
                ]),
                adminArea: traverse(organisation, [
                  'CI_ResponsibleParty',
                  'contactInfo',
                  'CI_Contact',
                  'address',
                  'CI_Address',
                  'administrativeArea',
                  'CharacterString',
                ]),
                postcode: traverse(organisation, [
                  'CI_ResponsibleParty',
                  'contactInfo',
                  'CI_Contact',
                  'address',
                  'CI_Address',
                  'postalCode',
                  'CharacterString',
                ]),
                country: traverse(organisation, [
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
          id: getFirst(
            onlySimple(traverse(record, ['fileIdentifier', 'CharacterString']))
          ),
          languageCode:
            getFirst(
              onlySimple(
                traverse(record, [
                  'language',
                  ['#text', '@_codeListValue', 'CharacterString'],
                ])
              )
            ) ||
            getFirst(
              onlySimple(
                traverse(record, [
                  'language',
                  'LanguageCode',
                  ['#text', '@_codeListValue'],
                ])
              )
            ),
          parentIdentifier: getFirst(
            onlySimple(
              traverse(record, ['parentIdentifier', 'CharacterString'])
            )
          ),
          hierarchyLevel: getFirst(
            onlySimple(
              traverse(record, [
                'hierarchyLevel',
                'MD_ScopeCode',
                ['#text', '@_codeListValue'],
              ])
            )
          ),
          hierarchyLevelName: getFirst(
            onlySimple(
              traverse(record, ['hierarchyLevelName', 'CharacterString'])
            )
          ),
          dateStamp: getFirst(
            onlySimple(traverse(record, ['dateStamp', ['Date', 'DateTime']]))
          ),
          edition: traverse(record, [
            'identificationInfo',
            ['MD_DataIdentification', 'SV_ServiceIdentification'],
            'citation',
            'CI_Citation',
            'edition',
            'CharacterString',
          ]),
          abstract: getFirst(
            onlySimple(
              traverse(record, [
                'identificationInfo',
                ['MD_DataIdentification', 'SV_ServiceIdentification'],
                'abstract',
                'CharacterString',
              ])
            )
          ),
          resources,
          srid: traverse(record, [
            'referenceSystemInfo',
            'MD_ReferenceSystem',
            'referenceSystemIdentifier',
            'RS_Identifier',
            'code',
            ['gmx:Anchor', 'CharacterString'],
          ]),
          purpose: traverse(record, [
            'identificationInfo',
            ['MD_DataIdentification', 'SV_ServiceIdentification'],
            'purpose',
            'CharacterString',
          ]),
          title: getFirst(
            onlySimple(
              traverse(record, [
                'identificationInfo',
                ['MD_DataIdentification', 'SV_ServiceIdentification'],
                'citation',
                'CI_Citation',
                'title',
                'CharacterString',
              ])
            )
          ),
          alternateTitle: getFirst(
            onlySimple(
              traverse(record, [
                'identificationInfo',
                ['MD_DataIdentification', 'SV_ServiceIdentification'],
                'citation',
                'CI_Citation',
                'alternateTitle',
                'CharacterString',
              ])
            )
          ),
          organisations,
          dates,
          category: traverse(record, [
            'identificationInfo',
            ['MD_DataIdentification', 'SV_ServiceIdentification'],
            'topicCategory',
            'MD_TopicCategoryCode',
          ]),
          spatialResolution: traverse(record, [
            'identificationInfo',
            ['MD_DataIdentification', 'SV_ServiceIdentification'],
            'spatialResolution',
            'MD_Resolution',
            'equivalentScale',
            'MD_RepresentativeFraction',
            'denominator',
            'Integer',
          ]),
          geographicDescription: traverse(record, [
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
            start: onlySimple(
              traverse(record, [
                'identificationInfo',
                ['MD_DataIdentification', 'SV_ServiceIdentification'],
                'extent',
                'EX_Extent',
                'temporalElement',
                'EX_TemporalExtent',
                'extent',
                'gml:TimePeriod',
                'gml:beginPosition',
              ])
            ),
            end: onlySimple(
              traverse(record, [
                'identificationInfo',
                ['MD_DataIdentification', 'SV_ServiceIdentification'],
                'extent',
                'EX_Extent',
                'temporalElement',
                'EX_TemporalExtent',
                'extent',
                'gml:TimePeriod',
                'gml:endPosition',
              ])
            ),
            startUndetermined: onlySimple(
              traverse(record, [
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
              ])
            ),
            endUndetermined: onlySimple(
              traverse(record, [
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
              ])
            ),
          },
          spatialExtent: {
            description: traverse(record, [
              'identificationInfo',
              ['MD_DataIdentification', 'SV_ServiceIdentification'],
              'extent',
              'EX_Extent',
              'description',
              'CharacterString',
            ]),
            longitude: [
              getFirst(
                traverse(record, [
                  'identificationInfo',
                  ['MD_DataIdentification', 'SV_ServiceIdentification'],
                  'extent',
                  'EX_Extent',
                  'geographicElement',
                  'EX_GeographicBoundingBox',
                  'westBoundLongitude',
                  'Decimal',
                ])
              ),
              getFirst(
                traverse(record, [
                  'identificationInfo',
                  ['MD_DataIdentification', 'SV_ServiceIdentification'],
                  'extent',
                  'EX_Extent',
                  'geographicElement',
                  'EX_GeographicBoundingBox',
                  'eastBoundLongitude',
                  'Decimal',
                ])
              ),
            ],
            latitude: [
              getFirst(
                traverse(record, [
                  'identificationInfo',
                  ['MD_DataIdentification', 'SV_ServiceIdentification'],
                  'extent',
                  'EX_Extent',
                  'geographicElement',
                  'EX_GeographicBoundingBox',
                  'southBoundLatitude',
                  'Decimal',
                ])
              ),
              getFirst(
                traverse(record, [
                  'identificationInfo',
                  ['MD_DataIdentification', 'SV_ServiceIdentification'],
                  'extent',
                  'EX_Extent',
                  'geographicElement',
                  'EX_GeographicBoundingBox',
                  'northBoundLatitude',
                  'Decimal',
                ])
              ),
            ],
          },
          keywords,
          constraints,
        });
      }

      return cswRecords;
    });
};
