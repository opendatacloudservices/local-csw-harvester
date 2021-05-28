"use strict";
/*
  Having tried a variety of solutions of deep objects paths, this was delivering
  the best results in regards to typescript compatibility. Also very code heavy :(
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.traverse = exports.onlySimple = exports.clearNulls = exports.get = void 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function get(obj, ...props) {
    return (obj &&
        props.reduce((result, prop) => (result === null ? undefined : result[prop]), obj));
}
exports.get = get;
const clearNulls = (array) => {
    const returnArray = [];
    array.forEach(el => {
        if (el !== null) {
            returnArray.push(el);
        }
    });
    return returnArray;
};
exports.clearNulls = clearNulls;
const onlySimple = (array) => {
    const returnArray = [];
    array.forEach(el => {
        if (typeof el !== 'object') {
            returnArray.push(el);
        }
    });
    return returnArray;
};
exports.onlySimple = onlySimple;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const traverse = (obj, path, clearNull = true) => {
    let tObj = obj;
    if (typeof tObj === 'object' && path[0] in tObj) {
        tObj = tObj[path[0]];
        if (path.length > 1 && Array.isArray(tObj)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const results = [];
            tObj.forEach(sub => {
                results.push(exports.traverse(sub, path.slice(1), clearNull));
            });
            if (clearNull) {
                return exports.clearNulls(results.flat());
            }
            return results.flat();
        }
        else if (path.length > 1) {
            return exports.traverse(tObj, path.slice(1), clearNull);
        }
        else {
            return tObj;
        }
    }
    else {
        return null;
    }
};
exports.traverse = traverse;
//# sourceMappingURL=get.js.map