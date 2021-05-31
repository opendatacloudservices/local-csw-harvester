"use strict";
/*
  Having tried a variety of solutions of deep objects paths, this was delivering
  the best results in regards to typescript compatibility. Also very code heavy :(
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.traverse = exports.onlySimple = exports.getFirst = exports.clearNulls = exports.get = void 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function get(obj, ...props) {
    return (obj &&
        props.reduce((result, prop) => (result === null ? undefined : result[prop]), obj));
}
exports.get = get;
const clearNulls = (array) => {
    if (!array)
        return null;
    const returnArray = [];
    array.forEach(el => {
        if (el !== null) {
            returnArray.push(el);
        }
    });
    return returnArray;
};
exports.clearNulls = clearNulls;
const getFirst = (array) => {
    if (Array.isArray(array)) {
        return array[0];
    }
    return null;
};
exports.getFirst = getFirst;
const onlySimple = (array) => {
    if (!array)
        return null;
    const returnArray = [];
    array.forEach(el => {
        if (!el) {
            returnArray.push(null);
        }
        else if (typeof el !== 'object') {
            returnArray.push(el);
        }
    });
    return returnArray;
};
exports.onlySimple = onlySimple;
const traverse = (
// eslint-disable-next-line @typescript-eslint/no-explicit-any
obj, path, clearNull = true
// eslint-disable-next-line @typescript-eslint/no-explicit-any
) => {
    let tObj = obj;
    let tPath = '__notfound__';
    if (Array.isArray(path[0])) {
        for (let p = 0; p < path[0].length && tPath === '__notfound__'; p += 1) {
            if (path[0][p] in tObj) {
                tPath = path[0][p];
            }
        }
    }
    else {
        tPath = path[0];
    }
    // if using namespaces, check for non-namespace version
    if (typeof tObj === 'object' && !(tPath in tObj) && tPath.indexOf(':') > -1) {
        const noPrefix = tPath.split(':')[1];
        if (noPrefix in tObj) {
            tPath = noPrefix;
        }
    }
    if (typeof tObj === 'object' && tPath in tObj) {
        tObj = tObj[tPath];
        if (path.length > 1 && Array.isArray(tObj)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const results = [];
            tObj.forEach(sub => {
                results.push(exports.traverse(sub, path.slice(1), clearNull));
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let returnValue = results.flat();
            if (clearNull) {
                returnValue = exports.clearNulls(results.flat());
            }
            if (!returnValue || returnValue.length === 0) {
                return null;
            }
            return returnValue;
        }
        else if (path.length > 1) {
            return exports.traverse(tObj, path.slice(1), clearNull);
        }
        else {
            if (Array.isArray(tObj) &&
                typeof tObj[0] === 'object' &&
                '#text' in tObj[0]) {
                return tObj[0]['#text'];
            }
            else if (!Array.isArray(tObj) &&
                typeof tObj === 'object' &&
                '#text' in tObj) {
                return tObj['#text'];
            }
            return tObj;
        }
    }
    else {
        return null;
    }
};
exports.traverse = traverse;
//# sourceMappingURL=get.js.map