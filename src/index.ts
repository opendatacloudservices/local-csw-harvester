import {getRecords} from './csw/index';

getRecords({
  url: 'https://metaver.de/csw',
  version: '2.0.2',
  limit: 10,
});
