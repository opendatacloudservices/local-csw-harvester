import fetch from 'node-fetch';
import * as parser from 'fast-xml-parser';
import {get} from './get';
// import {writeFileSync} from 'fs';

// TODO: Some attributes can also be arrays...

export type CswSource = {
  url: string;
  limit: number;
  version: string;
};

export type CswRecord = {
  id?: string;
  languageCode?: string;
  parentIdentifier?: string;
  hierarchyLevel?: string;
  hierarchyLevelName?: string;
  dateStamp?: string;
  abstract?: string;
  title?: string;
  alternateTitle?: string;
  srid?: string;
  resources?: CswResource[];
  organisations?: CswContact[];
};

export type CswResource = {
  distributionFormat?: string;
  url?: string;
  applicationProfile?: string;
  name?: string;
};

export type CswContact = {
  type?: string;
  name?: string;
  position?: string;
  phone?: string;
  fax?: string;
  url?: string;
  email?: string;
  deliveryPoint?: string;
  city?: string;
  adminArea?: string;
  postcode?: string;
  country?: string;
  id?: string;
};

export type CswRawRecord = {
  'gmd:fileIdentifier': {
    'gco:CharacterString': string;
  };
  'gmd:language': {
    'gmd:LanguageCode': {
      '#text': string;
    };
  };
  'gmd:parentIdentifier': {
    'gco:CharacterString': string;
  };
  'gmd:hierarchyLevel': {
    'gmd:MD_ScopeCode': {
      '#text': string;
    };
  };
  'gmd:hierarchyLevelName': {
    'gco:CharacterString': string;
  };
  'gmd:dateStamp': {
    'gco:Date': string;
  };
  'gmd:identificationInfo': {
    'gmd:MD_DataIdentification': {
      'gmd:citation': {
        'gmd:title': {
          'gco:CharacterString': string;
        };
        'gmd:alternateTitle': {
          'gco:CharacterString': string;
        };
        'gmd:date': CswRawDate | CswRawDate[];
      };
      'gmd:abstract': {
        'gco:CharacterString': string;
      };
      'gmd:pointOfContact': CswRawContact[];
    };
  };
  'gmd:distributionInfo': {
    'gmd:MD_Distribution': {
      'gmd:transferOptions': CswRawTransferOption[];
      'gmd:distributionFormat': {
        'gmd:MD_Format': {
          'gmd:name': {
            'gco:CharacterString': string;
          };
        };
      };
    };
  };
  'gmd:referenceSystemInfo': {
    'gmd:MD_ReferenceSystem': {
      'gmd:referenceSystemIdentifier': {
        'gmd:RS_Identifier': {
          'gmd:code': {
            'gmx:Anchor': {
              '#text': string;
            };
          };
        };
      };
    };
  };
};

export type CswRawDate = {
  'gmd:CI_Date': {
    'gmd:date': {
      'gco:DateTime': string;
    };
    'gmd:dateType': {
      'gmd:CI_DateTypeCode': {
        '@_codeListValue': string;
      };
    };
  };
};

export type CswRawTransferOption = {
  'gmd:MD_DigitalTransferOptions': {
    'gmd:onLine': {
      'gmd:CI_OnlineResource': {
        'gmd:linkage': {
          'gmd:URL': string;
        };
        'gmd:applicationProfile': {
          'gco:CharacterString': string;
        };
        'gmd:name': {
          'gco:CharacterString': string;
        };
      };
    };
  };
};

export type CswRawContact = {
  'gmd:CI_ResponsibleParty': {
    '@_uuid': string;
    'gmd:organisationName': {
      'gco:CharacterString': string;
    };
    'gmd:positionName': {
      'gco:CharacterString': string;
    };
    'gmd:contactInfo': {
      'gmd:CI_Contact': {
        'gmd:phone': {
          'gmd:CI_Telephone': {
            'gmd:voice': {
              'gco:CharacterString': string;
            };
            'gmd:facsimile': {
              'gco:CharacterString': string;
            };
          };
        };
        'gmd:address': {
          'gmd:CI_Address': {
            'gmd:deliveryPoint': {
              'gco:CharacterString': string;
            };
            'gmd:city': {
              'gco:CharacterString': string;
            };
            'gmd:administrativeArea': {
              'gco:CharacterString': string;
            };
            'gmd:postalCode': {
              'gco:CharacterString': string;
            };
            'gmd:country': {
              'gco:CharacterString': string;
            };
            'gmd:electronicMailAddress': {
              'gco:CharacterString': string;
            };
          };
        };
        'gmd:onlineResource': {
          'gmd:CI_OnlineResource': {
            'gmd:linkage': {
              'gmd:URL': string;
            };
          };
        };
      };
    };
    'gmd:role': {
      'gmd:CI_RoleCode': {
        '@_codeListValue': string;
      };
    };
  };
};

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
      const json = parser.parse(resultText, {ignoreAttributes: false}, false);

      const max =
        json['csw:GetRecordsResponse']['csw:SearchResults'][
          '@_numberOfRecordsMatched'
        ];

      const calls = [];
      for (let c = 0; c < Math.ceil(max / cswSource.limit); c += 1) {
        calls.push(
          fetch(
            getRecordsQuery(cswSource, c * cswSource.limit + 1, cswSource.limit)
          )
            .then(result => result.text())
            .then(resultText =>
              parser.parse(resultText, {ignoreAttributes: false}, false)
            )
        );
      }

      return Promise.all(calls);
    })
    .then(results => {
      let searchResults: CswRawRecord[] = [];
      results.forEach(r => {
        searchResults = searchResults.concat(
          r['csw:GetRecordsResponse']['csw:SearchResults']['gmd:MD_Metadata']
        );
      });

      const cswRecords = [];
      for (let s = 0; s < searchResults.length; s += 1) {
        const record = searchResults[s];

        let resources: CswResource[] = [];
        const searchResource = get(
          record,
          'gmd:distributionInfo',
          'gmd:MD_Distribution',
          'gmd:transferOptions'
        );
        if (searchResource) {
          resources = searchResource.map(resource => {
            return {
              distributionFormat: get(
                record,
                'gmd:distributionInfo',
                'gmd:MD_Distribution',
                'gmd:distributionFormat',
                'gmd:MD_Format',
                'gmd:name',
                'gco:CharacterString'
              ),
              url: get(
                resource,
                'gmd:MD_DigitalTransferOptions',
                'gmd:onLine',
                'gmd:CI_OnlineResource',
                'gmd:linkage',
                'gmd:URL'
              ),
              applicationProfile: get(
                resource,
                'gmd:MD_DigitalTransferOptions',
                'gmd:onLine',
                'gmd:CI_OnlineResource',
                'gmd:applicationProfile',
                'gco:CharacterString'
              ),
              name: get(
                resource,
                'gmd:MD_DigitalTransferOptions',
                'gmd:onLine',
                'gmd:CI_OnlineResource',
                'gmd:name',
                'gco:CharacterString'
              ),
            };
          });
        }

        let organisations: CswContact[] = [];
        const searchOrganisations = get(
          record,
          'gmd:identificationInfo',
          'gmd:MD_DataIdentification',
          'gmd:pointOfContact'
        );
        if (searchOrganisations) {
          organisations = searchOrganisations.map(organisation => {
            return {
              type: get(
                organisation,
                'gmd:CI_ResponsibleParty',
                'gmd:role',
                'gmd:CI_RoleCode',
                '@_codeListValue'
              ),
              name: get(
                organisation,
                'gmd:CI_ResponsibleParty',
                'gmd:organisationName',
                'gco:CharacterString'
              ),
              position: get(
                organisation,
                'gmd:CI_ResponsibleParty',
                'gmd:positionName',
                'gco:CharacterString'
              ),
              phone: get(
                organisation,
                'gmd:CI_ResponsibleParty',
                'gmd:contactInfo',
                'gmd:CI_Contact',
                'gmd:phone',
                'gmd:CI_Telephone',
                'gmd:voice',
                'gco:CharacterString'
              ),
              fax: get(
                organisation,
                'gmd:CI_ResponsibleParty',
                'gmd:contactInfo',
                'gmd:CI_Contact',
                'gmd:phone',
                'gmd:CI_Telephone',
                'gmd:facsimile',
                'gco:CharacterString'
              ),
              url: get(
                organisation,
                'gmd:CI_ResponsibleParty',
                'gmd:contactInfo',
                'gmd:CI_Contact',
                'gmd:onlineResource',
                'gmd:CI_OnlineResource',
                'gmd:linkage',
                'gmd:URL'
              ),
              email: get(
                organisation,
                'gmd:CI_ResponsibleParty',
                'gmd:contactInfo',
                'gmd:CI_Contact',
                'gmd:address',
                'gmd:CI_Address',
                'gmd:electronicMailAddress',
                'gco:CharacterString'
              ),
              deliveryPoint: get(
                organisation,
                'gmd:CI_ResponsibleParty',
                'gmd:contactInfo',
                'gmd:CI_Contact',
                'gmd:address',
                'gmd:CI_Address',
                'gmd:deliveryPoint',
                'gco:CharacterString'
              ),
              city: get(
                organisation,
                'gmd:CI_ResponsibleParty',
                'gmd:contactInfo',
                'gmd:CI_Contact',
                'gmd:address',
                'gmd:CI_Address',
                'gmd:city',
                'gco:CharacterString'
              ),
              adminArea: get(
                organisation,
                'gmd:CI_ResponsibleParty',
                'gmd:contactInfo',
                'gmd:CI_Contact',
                'gmd:address',
                'gmd:CI_Address',
                'gmd:administrativeArea',
                'gco:CharacterString'
              ),
              postcode: get(
                organisation,
                'gmd:CI_ResponsibleParty',
                'gmd:contactInfo',
                'gmd:CI_Contact',
                'gmd:address',
                'gmd:CI_Address',
                'gmd:postalCode',
                'gco:CharacterString'
              ),
              country: get(
                organisation,
                'gmd:CI_ResponsibleParty',
                'gmd:contactInfo',
                'gmd:CI_Contact',
                'gmd:address',
                'gmd:CI_Address',
                'gmd:country',
                'gco:CharacterString'
              ),
            };
          });
        }

        cswRecords.push({
          id: get(record, 'gmd:fileIdentifier', 'gco:CharacterString'),
          languageCode: get(
            record,
            'gmd:language',
            'gmd:LanguageCode',
            '#text'
          ),
          parentIdentifier: get(
            record,
            'gmd:parentIdentifier',
            'gco:CharacterString'
          ),
          hierarchyLevel: get(
            record,
            'gmd:hierarchyLevel',
            'gmd:MD_ScopeCode',
            '#text'
          ),
          hierarchyLevelName: get(
            record,
            'gmd:hierarchyLevelName',
            'gco:CharacterString'
          ),
          dateStamp: get(record, 'gmd:dateStamp', 'gco:Date'),
          abstract: get(
            record,
            'gmd:identificationInfo',
            'gmd:MD_DataIdentification',
            'gmd:abstract',
            'gco:CharacterString'
          ),
          resources,
          srid: get(
            record,
            'gmd:referenceSystemInfo',
            'gmd:MD_ReferenceSystem',
            'gmd:referenceSystemIdentifier',
            'gmd:RS_Identifier',
            'gmd:code',
            'gmx:Anchor',
            '#text'
          ),
          title: get(
            record,
            'gmd:identificationInfo',
            'gmd:MD_DataIdentification',
            'gmd:citation',
            'gmd:title',
            'gco:CharacterString'
          ),
          alternateTitle: get(
            record,
            'gmd:identificationInfo',
            'gmd:MD_DataIdentification',
            'gmd:citation',
            'gmd:alternateTitle',
            'gco:CharacterString'
          ),
          organisations,
        });
      }

      return cswRecords;
    });
};
