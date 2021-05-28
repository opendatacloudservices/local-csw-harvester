import fetch from 'node-fetch';
import * as parser from 'fast-xml-parser';
import {traverse, onlySimple} from './get';
import {writeFileSync} from 'fs';
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
} from './types';

const getRecordsQuery = (
  cswSource: CswSource,
  start: number,
  max: number
): string => {
  return `${cswSource.url}?REQUEST=GetRecords&SERVICE=CSW&VERSION=${cswSource.version}&RESULTTYPE=results&MAXRECORDS=${max}&typeNames=csw:Records&elementSetName=full&startPosition=${start}`;
};

export const getRecords = (cswSource: CswSource): Promise<CswRecord[]> => {
  // get number of records in service
  return fetch(getRecordsQuery(cswSource, 1, 1))
    .then(result => result.text())
    .then(resultText => {
      const json = parser.parse(
        resultText,
        {ignoreAttributes: false, arrayMode: true},
        false
      );

      const max =
        json['csw:GetRecordsResponse'][0]['csw:SearchResults'][0][
          '@_numberOfRecordsMatched'
        ];

      const calls = [];
      for (let c = 0; c < Math.ceil(max / cswSource.limit) && c < 1; c += 1) {
        calls.push(
          fetch(
            getRecordsQuery(cswSource, c * cswSource.limit + 1, cswSource.limit)
          )
            .then(result => result.text())
            .then(resultText =>
              parser.parse(
                resultText,
                {ignoreAttributes: false, arrayMode: true},
                false
              )
            )
        );
      }

      return Promise.all(calls);
    })
    .then(results => {
      let searchResults: CswRawRecord[] = [];
      results.forEach(r => {
        searchResults = searchResults.concat(
          r['csw:GetRecordsResponse'][0]['csw:SearchResults'][0][
            'gmd:MD_Metadata'
          ]
        );
      });

      const cswRecords = [];
      for (let s = 0; s < searchResults.length; s += 1) {
        const record = searchResults[s];

        let resources: CswResource[] = [];
        const searchResource: CswRawTransferOption[] = traverse(record, [
          'gmd:distributionInfo',
          'gmd:MD_Distribution',
          'gmd:transferOptions',
        ]);
        if (searchResource) {
          resources = searchResource.map(resource => {
            if (!resource) {
              return {};
            } else {
              return {
                distributionFormat: onlySimple(
                  traverse(record, [
                    'gmd:distributionInfo',
                    'gmd:MD_Distribution',
                    'gmd:distributionFormat',
                    'gmd:MD_Format',
                    'gmd:name',
                    'gco:CharacterString',
                  ])
                ),
                url: onlySimple(
                  traverse(resource, [
                    'gmd:MD_DigitalTransferOptions',
                    'gmd:onLine',
                    'gmd:CI_OnlineResource',
                    'gmd:linkage',
                    'gmd:URL',
                  ])
                ),
                applicationProfile: onlySimple(
                  traverse(resource, [
                    'gmd:MD_DigitalTransferOptions',
                    'gmd:onLine',
                    'gmd:CI_OnlineResource',
                    'gmd:applicationProfile',
                    'gco:CharacterString',
                  ])
                ),
                name: onlySimple(
                  traverse(resource, [
                    'gmd:MD_DigitalTransferOptions',
                    'gmd:onLine',
                    'gmd:CI_OnlineResource',
                    'gmd:name',
                    'gco:CharacterString',
                  ])
                ),
                description: onlySimple(
                  traverse(resource, [
                    'gmd:MD_DigitalTransferOptions',
                    'gmd:onLine',
                    'gmd:CI_OnlineResource',
                    'gmd:description',
                    'gco:CharacterString',
                  ])
                ),
                function: onlySimple(
                  traverse(resource, [
                    'gmd:MD_DigitalTransferOptions',
                    'gmd:onLine',
                    'gmd:CI_OnlineResource',
                    'gmd:function',
                    'gmd:CI_OnLineFunctionCode',
                    '#text',
                  ])
                ),
                protocol: onlySimple(
                  traverse(resource, [
                    'gmd:MD_DigitalTransferOptions',
                    'gmd:onLine',
                    'gmd:CI_OnlineResource',
                    'gmd:protocol',
                    'gco:CharacterString',
                  ])
                ),
              };
            }
          });
        }

        let dates: CswDate[] = [];
        const searchDates: CswRawDate[] = traverse(record, [
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
            } else {
              return {
                date: traverse(date, [
                  'gmd:CI_Date',
                  'gmd:date',
                  'gco:DateTime',
                ]).flat()[0],
                type: traverse(date, [
                  'gmd:CI_Date',
                  'gmd:dateType',
                  'gmd:CI_DateTypeCode',
                  '@_codeListValue',
                ]).flat()[0],
              };
            }
          });
        }

        let constraints: CswConstraint[] = [];
        const searchConstraints: CswRawConstraint[] = traverse(record, [
          'gmd:identificationInfo',
          'gmd:MD_DataIdentification',
          'gmd:resourceConstraints',
        ]);
        if (searchConstraints) {
          constraints = searchConstraints.map(constraint => {
            if (!constraint) {
              return {};
            } else {
              const useLimitation = traverse(constraint, [
                'gmd:MD_LegalConstraints',
                'gmd:useLimitation',
                'gco:CharacterString',
              ])[0];
              const useConstraint = traverse(constraint, [
                'gmd:MD_LegalConstraints',
                'gmd:useConstraints',
                'gmd:MD_RestrictionCode',
                '@_codeListValue',
              ])[0];
              let otherConstraint = traverse(constraint, [
                'gmd:MD_LegalConstraints',
                'gmd:otherConstraints',
                'gmx:Anchor',
                '#text',
              ])[0];
              if (!otherConstraint) {
                otherConstraint = traverse(constraint, [
                  'gmd:MD_LegalConstraints',
                  'gmd:otherConstraints',
                  'gco:CharacterString',
                ])[0];
              }
              const accessConstraint = traverse(constraint, [
                'gmd:MD_LegalConstraints',
                'gmd:accessConstraints',
                'gmx:MD_RestrictionCode',
                '#text',
              ])[0];
              let type = '';
              const value: string[] = [];
              if (useConstraint) {
                type = 'useConstraint';
                value.push(useConstraint);
              } else if (useLimitation) {
                type = 'useLimitation';
                value.push(useLimitation);
              } else if (otherConstraint) {
                type = 'otherConstraint';
                value.push(otherConstraint);
              } else if (accessConstraint) {
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

        let keywords: CswKeyword[] = [];
        const searchKeywords: CswRawKeyword[] = traverse(record, [
          'gmd:identificationInfo',
          'gmd:MD_DataIdentification',
          'gmd:descriptiveKeywords',
        ]);
        if (searchKeywords) {
          keywords = searchKeywords.map(keyword => {
            if (!keyword) {
              return {};
            } else {
              return {
                name: traverse(
                  keyword,
                  ['gmd:MD_Keywords', 'gmd:keyword', 'gco:CharacterString'],
                  false
                ).flat(),
                type: traverse(keyword, [
                  'gmd:MD_Keywords',
                  'gmd:type',
                  'gmd:MD_KeywordTypeCode',
                  '@_codeListValue',
                ]).flat(),
                anchor: traverse(
                  keyword,
                  ['gmd:MD_Keywords', 'gmd:keyword', 'gmx:Anchor', '#text'],
                  false
                ).flat(),
              };
            }
          });
        }

        let organisations: CswContact[] = [];
        const searchOrganisations: CswRawContact[] = traverse(record, [
          'gmd:identificationInfo',
          'gmd:MD_DataIdentification',
          'gmd:pointOfContact',
        ]);
        if (searchOrganisations) {
          organisations = searchOrganisations.map(organisation => {
            if (organisation) {
              return {
                type: traverse(organisation, [
                  'gmd:CI_ResponsibleParty',
                  'gmd:role',
                  'gmd:CI_RoleCode',
                  '@_codeListValue',
                ]),
                name: traverse(organisation, [
                  'gmd:CI_ResponsibleParty',
                  'gmd:organisationName',
                  'gco:CharacterString',
                ]),
                position: traverse(organisation, [
                  'gmd:CI_ResponsibleParty',
                  'gmd:positionName',
                  'gco:CharacterString',
                ]),
                phone: traverse(organisation, [
                  'gmd:CI_ResponsibleParty',
                  'gmd:contactInfo',
                  'gmd:CI_Contact',
                  'gmd:phone',
                  'gmd:CI_Telephone',
                  'gmd:voice',
                  'gco:CharacterString',
                ]),
                fax: traverse(organisation, [
                  'gmd:CI_ResponsibleParty',
                  'gmd:contactInfo',
                  'gmd:CI_Contact',
                  'gmd:phone',
                  'gmd:CI_Telephone',
                  'gmd:facsimile',
                  'gco:CharacterString',
                ]),
                url: traverse(organisation, [
                  'gmd:CI_ResponsibleParty',
                  'gmd:contactInfo',
                  'gmd:CI_Contact',
                  'gmd:onlineResource',
                  'gmd:CI_OnlineResource',
                  'gmd:linkage',
                  'gmd:URL',
                ]),
                email: traverse(organisation, [
                  'gmd:CI_ResponsibleParty',
                  'gmd:contactInfo',
                  'gmd:CI_Contact',
                  'gmd:address',
                  'gmd:CI_Address',
                  'gmd:electronicMailAddress',
                  'gco:CharacterString',
                ]),
                deliveryPoint: traverse(organisation, [
                  'gmd:CI_ResponsibleParty',
                  'gmd:contactInfo',
                  'gmd:CI_Contact',
                  'gmd:address',
                  'gmd:CI_Address',
                  'gmd:deliveryPoint',
                  'gco:CharacterString',
                ]),
                city: traverse(organisation, [
                  'gmd:CI_ResponsibleParty',
                  'gmd:contactInfo',
                  'gmd:CI_Contact',
                  'gmd:address',
                  'gmd:CI_Address',
                  'gmd:city',
                  'gco:CharacterString',
                ]),
                adminArea: traverse(organisation, [
                  'gmd:CI_ResponsibleParty',
                  'gmd:contactInfo',
                  'gmd:CI_Contact',
                  'gmd:address',
                  'gmd:CI_Address',
                  'gmd:administrativeArea',
                  'gco:CharacterString',
                ]),
                postcode: traverse(organisation, [
                  'gmd:CI_ResponsibleParty',
                  'gmd:contactInfo',
                  'gmd:CI_Contact',
                  'gmd:address',
                  'gmd:CI_Address',
                  'gmd:postalCode',
                  'gco:CharacterString',
                ]),
                country: traverse(organisation, [
                  'gmd:CI_ResponsibleParty',
                  'gmd:contactInfo',
                  'gmd:CI_Contact',
                  'gmd:address',
                  'gmd:CI_Address',
                  'gmd:country',
                  'gco:CharacterString',
                ]),
              };
            } else {
              return {};
            }
          });
        }

        cswRecords.push({
          id: traverse(record, [
            'gmd:fileIdentifier',
            'gco:CharacterString',
          ])[0],
          languageCode: traverse(record, [
            'gmd:language',
            'gmd:LanguageCode',
            '#text',
          ]),
          parentIdentifier: traverse(record, [
            'gmd:parentIdentifier',
            'gco:CharacterString',
          ]),
          hierarchyLevel: traverse(record, [
            'gmd:hierarchyLevel',
            'gmd:MD_ScopeCode',
            '#text',
          ]),
          hierarchyLevelName: traverse(record, [
            'gmd:hierarchyLevelName',
            'gco:CharacterString',
          ]),
          dateStamp: traverse(record, ['gmd:dateStamp', 'gco:Date']),
          abstract: traverse(record, [
            'gmd:identificationInfo',
            'gmd:MD_DataIdentification',
            'gmd:abstract',
            'gco:CharacterString',
          ]),
          resources,
          srid: traverse(record, [
            'gmd:referenceSystemInfo',
            'gmd:MD_ReferenceSystem',
            'gmd:referenceSystemIdentifier',
            'gmd:RS_Identifier',
            'gmd:code',
            'gmx:Anchor',
            '#text',
          ]),
          title: traverse(record, [
            'gmd:identificationInfo',
            'gmd:MD_DataIdentification',
            'gmd:citation',
            'gmd:CI_Citation',
            'gmd:title',
            'gco:CharacterString',
          ]),
          alternateTitle: traverse(record, [
            'gmd:identificationInfo',
            'gmd:MD_DataIdentification',
            'gmd:citation',
            'gmd:CI_Citation',
            'gmd:alternateTitle',
            'gco:CharacterString',
          ]),
          organisations,
          dates,
          category: traverse(record, [
            'gmd:identificationInfo',
            'gmd:MD_DataIdentification',
            'gmd:topicCategory',
            'gmd:MD_TopicCategoryCode',
          ]),
          spatialResolution: traverse(record, [
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
          geographicDescription: traverse(record, [
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
            start: onlySimple(
              traverse(record, [
                'gmd:identificationInfo',
                'gmd:MD_DataIdentification',
                'gmd:extent',
                'gmd:EX_Extent',
                'gmd:temporalElement',
                'gmd:EX_TemporalExtent',
                'gmd:extent',
                'gml:TimePeriod',
                'gml:beginPosition',
              ])
            ),
            end: onlySimple(
              traverse(record, [
                'gmd:identificationInfo',
                'gmd:MD_DataIdentification',
                'gmd:extent',
                'gmd:EX_Extent',
                'gmd:temporalElement',
                'gmd:EX_TemporalExtent',
                'gmd:extent',
                'gml:TimePeriod',
                'gml:endPosition',
              ])
            ),
            startUndetermined: onlySimple(
              traverse(record, [
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
              ])
            ),
            endUndetermined: onlySimple(
              traverse(record, [
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
              ])
            ),
          },
          spatialExtent: {
            longitude: [
              traverse(record, [
                'gmd:identificationInfo',
                'gmd:MD_DataIdentification',
                'gmd:extent',
                'gmd:EX_Extent',
                'gmd:geographicElement',
                'gmd:EX_GeographicBoundingBox',
                'gmd:westBoundLongitude',
                'gco:Decimal',
              ])[0],
              traverse(record, [
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
              traverse(record, [
                'gmd:identificationInfo',
                'gmd:MD_DataIdentification',
                'gmd:extent',
                'gmd:EX_Extent',
                'gmd:geographicElement',
                'gmd:EX_GeographicBoundingBox',
                'gmd:southBoundLatitude',
                'gco:Decimal',
              ])[0],
              traverse(record, [
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

      writeFileSync(
        './tmp/csw-output.json',
        JSON.stringify(cswRecords, null, 2),
        'utf8'
      );

      writeFileSync(
        './tmp/csw-test.json',
        JSON.stringify(searchResults, null, 2),
        'utf8'
      );

      return cswRecords;
    });
};
