export declare type CswRawRecord = {
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
        [key: string]: {
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
export declare type CswRawDate = {
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
export declare type CswRawTransferOption = {
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
export declare type CswRawKeyword = {
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
export declare type CswRawConstraint = {
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
export declare type CswRawGeoElement = {
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
export declare type CswRawTempElement = {
    'gmd:EX_TemporalExtent': {
        'gmd:extent': {
            'gml:TimePeriod': {
                'gml:beginPosition': string | {
                    '@_indeterminatePosition': string;
                }[];
                'gml:endPosition': string | {
                    '@_indeterminatePosition': string;
                }[];
            }[];
        }[];
    }[];
};
export declare type CswRawSpatialResolution = {
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
export declare type CswRawContact = {
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
export declare type CswSource = {
    url: string;
    limit: number;
    version: string;
    id?: number;
    type: 'get' | 'post';
    prefix: string;
    longName: string;
    note?: string;
    active: boolean;
    specialParams?: string;
    rateLimit: number | null;
};
declare type CswValue = (string | number | boolean | null)[] | null;
declare type CswSingleValue = string | number | boolean | null;
export declare type CswRecord = {
    id: CswSingleValue;
    languageCode: CswSingleValue;
    parentIdentifier: CswSingleValue;
    hierarchyLevel: CswSingleValue;
    hierarchyLevelName: CswSingleValue;
    dateStamp: CswSingleValue;
    abstract: CswSingleValue;
    resources: CswResource[];
    srid: CswValue;
    purpose: CswValue;
    title: CswSingleValue;
    edition: CswValue;
    alternateTitle: CswSingleValue;
    organisations: CswContact[];
    dates: CswDate[];
    category: CswValue;
    spatialResolution: CswValue;
    spatialType?: CswValue;
    geographicDescription: CswValue;
    temporalExtent: {
        start: CswValue;
        startUndetermined: CswValue;
        end: CswValue;
        endUndetermined: CswValue;
    };
    spatialExtent: {
        description: CswValue;
        longitude: CswValue;
        latitude: CswValue;
    };
    keywords: CswKeyword[];
    constraints: CswConstraint[];
};
export declare type CswDate = {
    date?: CswSingleValue;
    type?: CswSingleValue;
};
export declare type CswKeyword = {
    name: CswValue;
    type: CswValue;
    anchor: CswValue;
};
export declare type CswResource = {
    distributionFormat: CswValue;
    url: CswValue;
    applicationProfile: CswValue;
    name: CswValue;
    description: CswValue;
    function: CswValue;
    protocol: CswValue;
};
export declare type CswContact = {
    type: CswValue;
    name: CswValue;
    individualName: CswValue;
    position: CswValue;
    phone: CswValue;
    fax: CswValue;
    url: CswValue;
    email: CswValue;
    deliveryPoint: CswValue;
    city: CswValue;
    adminArea: CswValue;
    postcode: CswValue;
    country: CswValue;
    id?: CswValue;
};
export declare type CswConstraint = {
    type?: string;
    value?: CswValue;
};
export declare type fetchOptions = {
    method?: string;
    headers?: {
        [key: string]: string;
    };
    body?: string;
};
export {};
