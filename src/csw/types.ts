/* CswRaw... > XML processed through fast-xml-parser */
/* Csw... > Models to be passed down the harvester */

export type CswRawRecord = {
  'gmd:fileIdentifier': {
    'gco:CharacterString': string;
  }[];
  'gmd:language': {
    'gmd:LanguageCode': {
      '#text': string;
    }[];
  }[];
  'gmd:parentIdentifier': {
    'gco:CharacterString': string;
  }[];
  'gmd:hierarchyLevel': {
    'gmd:MD_ScopeCode': {
      '#text': string;
    }[];
  }[];
  'gmd:hierarchyLevelName': {
    'gco:CharacterString': string;
  }[];
  'gmd:dateStamp': {
    'gco:Date': string;
  }[];
  'gmd:identificationInfo': {
    'gmd:MD_DataIdentification': {
      'gmd:citation': {
        'gmd:title': {
          'gco:CharacterString': string;
        }[];
        'gmd:alternateTitle': {
          'gco:CharacterString': string;
        }[];
        'gmd:date': CswRawDate | CswRawDate[];
      }[];
      'gmd:abstract': {
        'gco:CharacterString': string;
      }[];
      'gmd:pointOfContact': CswRawContact[];
      'gmd:descriptiveKeywords': CswRawKeyword[];
      'gmd:extent': {
        'gmd:EX_Extent': {
          'gmd:geographicElement': CswRawGeoElement[];
          'gmd:temporalElement': CswRawTempElement[];
        }[];
      }[];
      'gmd:resourceConstraints': CswRawConstraint[];
      'gmd:spatialResolution': CswRawSpatialResolution[];
      'gmd:topicCategory': {
        'gmd:MD_TopicCategoryCode': string;
      }[];
      'gmd:spatialRepresentationType': {
        'gmd:MD_SpatialRepresentationTypeCode': {
          '@_codeListValue': string;
        }[];
      }[];
    }[];
  }[];
  'gmd:distributionInfo': {
    'gmd:MD_Distribution': {
      'gmd:transferOptions': CswRawTransferOption[];
      'gmd:distributionFormat': {
        'gmd:MD_Format': {
          'gmd:name': {
            'gco:CharacterString': string;
          }[];
        }[];
      }[];
    }[];
  }[];
  'gmd:referenceSystemInfo': {
    'gmd:MD_ReferenceSystem': {
      'gmd:referenceSystemIdentifier': {
        'gmd:RS_Identifier': {
          'gmd:code': {
            'gmx:Anchor': {
              '#text': string;
            }[];
          }[];
        }[];
      }[];
    }[];
  }[];
};

export type CswRawDate = {
  'gmd:CI_Date': {
    'gmd:date': {
      'gco:DateTime': string;
    }[];
    'gmd:dateType': {
      'gmd:CI_DateTypeCode': {
        '@_codeListValue': string;
      }[];
    }[];
  }[];
};

export type CswRawTransferOption = {
  'gmd:MD_DigitalTransferOptions': {
    'gmd:onLine': {
      'gmd:CI_OnlineResource': {
        'gmd:linkage': {
          'gmd:URL': string;
        }[];
        'gmd:protocol': {
          'gco:CharacterString': string;
        }[];
        'gmd:applicationProfile': {
          'gco:CharacterString': string;
        }[];
        'gmd:name': {
          'gco:CharacterString': string;
        }[];
        'gmd:description': {
          'gco:CharacterString': string;
        }[];
        'gmd:function': {
          'gmd:CI_OnLineFunctionCode': {
            '#text': string;
          }[];
        }[];
      }[];
    }[];
  }[];
};

export type CswRawKeyword = {
  'gmd:MD_Keywords': {
    'gmd:keyword': {
      'gco:CharacterString': string;
      'gmx:Anchor': {
        '#text': string;
      }[];
    }[];
    'gmd:type': {
      'gmd:MD_KeywordTypeCode': {
        '@_codeListValue': string;
      }[];
    }[];
  }[];
};

export type CswRawConstraint = {
  'gmd:MD_LegalConstraints': {
    'gmd:useLimitation': {
      'gco:CharacterString': string;
    }[];
    'gmd:useConstraints': {
      'gmd:MD_RestrictionCode': {
        '@_codeListValue': string;
      }[];
    }[];
    'gmd:otherConstraints': {
      'gmx:Anchor': {
        '#text': string;
      }[];
    }[];
    'gmd:accessConstraints': {
      'gmd:MD_RestrictionCode': {
        '#text': string;
      }[];
    }[];
  }[];
};

export type CswRawGeoElement = {
  'gmd:EX_GeographicDescription': {
    'gmd:geographicIdentifier': {
      'gmd:MD_Identifier': {
        'gmd:code': {
          'gco:CharacterString': string;
        }[];
      }[];
    }[];
  }[];
  'gmd:EX_GeographicBoundingBox': {
    'gmd:westBoundLongitude': {
      'gco:Decimal': number;
    }[];
    'gmd:eastBoundLongitude': {
      'gco:Decimal': number;
    }[];
    'gmd:southBoundLatitude': {
      'gco:Decimal': number;
    }[];
    'gmd:northBoundLatitude': {
      'gco:Decimal': number;
    }[];
  }[];
};

export type CswRawTempElement = {
  'gmd:EX_TemporalExtent': {
    'gmd:extent': {
      'gml:TimePeriod': {
        'gml:beginPosition':
          | string
          | {
              '@_indeterminatePosition': string;
            }[];
        'gml:endPosition':
          | string
          | {
              '@_indeterminatePosition': string;
            }[];
      }[];
    }[];
  }[];
};

export type CswRawSpatialResolution = {
  'gmd:MD_Resolution': {
    'gmd:equivalentScale': {
      'gmd:MD_RepresentativeFraction': {
        'gmd:denominator': {
          'gco:Integer': number;
        }[];
      }[];
    }[];
  }[];
};

export type CswRawContact = {
  'gmd:CI_ResponsibleParty': {
    '@_uuid': string;
    'gmd:organisationName': {
      'gco:CharacterString': string;
    }[];
    'gmd:positionName': {
      'gco:CharacterString': string;
    }[];
    'gmd:contactInfo': {
      'gmd:CI_Contact': {
        'gmd:phone': {
          'gmd:CI_Telephone': {
            'gmd:voice': {
              'gco:CharacterString': string;
            }[];
            'gmd:facsimile': {
              'gco:CharacterString': string;
            }[];
          }[];
        }[];
        'gmd:address': {
          'gmd:CI_Address': {
            'gmd:deliveryPoint': {
              'gco:CharacterString': string;
            }[];
            'gmd:city': {
              'gco:CharacterString': string;
            }[];
            'gmd:administrativeArea': {
              'gco:CharacterString': string;
            }[];
            'gmd:postalCode': {
              'gco:CharacterString': string;
            }[];
            'gmd:country': {
              'gco:CharacterString': string;
            }[];
            'gmd:electronicMailAddress': {
              'gco:CharacterString': string;
            }[];
          }[];
        }[];
        'gmd:onlineResource': {
          'gmd:CI_OnlineResource': {
            'gmd:linkage': {
              'gmd:URL': string;
            }[];
          }[];
        }[];
      }[];
    }[];
    'gmd:role': {
      'gmd:CI_RoleCode': {
        '@_codeListValue': string;
      }[];
    }[];
  }[];
};

export type CswSource = {
  url: string;
  limit: number;
  version: string;
};

type CswValue = (string | number | boolean | null)[] | null;

export type CswRecord = {
  id?: string;
  languageCode?: CswValue;
  parentIdentifier?: CswValue;
  hierarchyLevel?: CswValue;
  hierarchyLevelName?: CswValue;
  dateStamp?: CswValue;
  abstract?: CswValue;
  resources?: CswResource[];
  srid?: CswValue;
  title?: CswValue;
  alternateTitle?: CswValue;
  organisations?: CswContact[];
  dates?: CswDate[];
  category?: CswValue;
  spatialResolution?: CswValue;
  spatialType?: CswValue;
  geographicDescription?: CswValue;
  temporalExtent?: {
    start?: CswValue;
    startUndetermined?: CswValue;
    end?: CswValue;
    endUndetermined?: CswValue;
  };
  spatialExtent?: {
    longitude: CswValue;
    latitude: CswValue;
  };
  keywords: CswKeyword[];
};

export type CswDate = {
  date?: CswValue;
  type?: CswValue;
};

export type CswKeyword = {
  name?: CswValue;
  type?: CswValue;
  anchor?: CswValue;
};

export type CswResource = {
  distributionFormat?: CswValue;
  url?: CswValue;
  applicationProfile?: CswValue;
  name?: CswValue;
  description?: CswValue;
  function?: CswValue;
  protocol?: CswValue;
};

export type CswContact = {
  type?: CswValue;
  name?: CswValue;
  position?: CswValue;
  phone?: CswValue;
  fax?: CswValue;
  url?: CswValue;
  email?: CswValue;
  deliveryPoint?: CswValue;
  city?: CswValue;
  adminArea?: CswValue;
  postcode?: CswValue;
  country?: CswValue;
  id?: CswValue;
};

export type CswConstraint = {
  type?: string;
  value?: CswValue;
};
