/*
  Having tried a variety of solutions of deep objects paths, this was delivering
  the best results in regards to typescript compatibility. Also very code heavy :(
 */

export function get<T, P1 extends keyof NonNullable<T>>(
  obj: T,
  prop1: P1
): NonNullable<T>[P1] | undefined;

export function get<
  T,
  P1 extends keyof NonNullable<T>,
  P2 extends keyof NonNullable<NonNullable<T>[P1]>
>(
  obj: T,
  prop1: P1,
  prop2: P2
): NonNullable<NonNullable<T>[P1]>[P2] | undefined;

export function get<
  T,
  P1 extends keyof NonNullable<T>,
  P2 extends keyof NonNullable<NonNullable<T>[P1]>,
  P3 extends keyof NonNullable<NonNullable<NonNullable<T>[P1]>[P2]>
>(
  obj: T,
  prop1: P1,
  prop2: P2,
  prop3: P3
): NonNullable<NonNullable<NonNullable<T>[P1]>[P2]>[P3] | undefined;

export function get<
  T,
  P1 extends keyof NonNullable<T>,
  P2 extends keyof NonNullable<NonNullable<T>[P1]>,
  P3 extends keyof NonNullable<NonNullable<NonNullable<T>[P1]>[P2]>,
  P4 extends keyof NonNullable<
    NonNullable<NonNullable<NonNullable<T>[P1]>[P2]>[P3]
  >
>(
  obj: T,
  prop1: P1,
  prop2: P2,
  prop3: P3,
  prop4: P4
):
  | NonNullable<NonNullable<NonNullable<NonNullable<T>[P1]>[P2]>[P3]>[P4]
  | undefined;

export function get<
  T,
  P1 extends keyof NonNullable<T>,
  P2 extends keyof NonNullable<NonNullable<T>[P1]>,
  P3 extends keyof NonNullable<NonNullable<NonNullable<T>[P1]>[P2]>,
  P4 extends keyof NonNullable<
    NonNullable<NonNullable<NonNullable<T>[P1]>[P2]>[P3]
  >,
  P5 extends keyof NonNullable<
    NonNullable<NonNullable<NonNullable<NonNullable<T>[P1]>[P2]>[P3]>[P4]
  >
>(
  obj: T,
  prop1: P1,
  prop2: P2,
  prop3: P3,
  prop4: P4,
  prop5: P5
):
  | NonNullable<
      NonNullable<NonNullable<NonNullable<NonNullable<T>[P1]>[P2]>[P3]>[P4]
    >[P5]
  | undefined;

export function get<
  T,
  P1 extends keyof NonNullable<T>,
  P2 extends keyof NonNullable<NonNullable<T>[P1]>,
  P3 extends keyof NonNullable<NonNullable<NonNullable<T>[P1]>[P2]>,
  P4 extends keyof NonNullable<
    NonNullable<NonNullable<NonNullable<T>[P1]>[P2]>[P3]
  >,
  P5 extends keyof NonNullable<
    NonNullable<NonNullable<NonNullable<NonNullable<T>[P1]>[P2]>[P3]>[P4]
  >,
  P6 extends keyof NonNullable<
    NonNullable<
      NonNullable<NonNullable<NonNullable<NonNullable<T>[P1]>[P2]>[P3]>[P4]
    >[P5]
  >
>(
  obj: T,
  prop1: P1,
  prop2: P2,
  prop3: P3,
  prop4: P4,
  prop5: P5,
  prop6: P6
):
  | NonNullable<
      NonNullable<
        NonNullable<NonNullable<NonNullable<NonNullable<T>[P1]>[P2]>[P3]>[P4]
      >[P5]
    >[P6]
  | undefined;

export function get<
  T,
  P1 extends keyof NonNullable<T>,
  P2 extends keyof NonNullable<NonNullable<T>[P1]>,
  P3 extends keyof NonNullable<NonNullable<NonNullable<T>[P1]>[P2]>,
  P4 extends keyof NonNullable<
    NonNullable<NonNullable<NonNullable<T>[P1]>[P2]>[P3]
  >,
  P5 extends keyof NonNullable<
    NonNullable<NonNullable<NonNullable<NonNullable<T>[P1]>[P2]>[P3]>[P4]
  >,
  P6 extends keyof NonNullable<
    NonNullable<
      NonNullable<NonNullable<NonNullable<NonNullable<T>[P1]>[P2]>[P3]>[P4]
    >[P5]
  >,
  P7 extends keyof NonNullable<
    NonNullable<
      NonNullable<
        NonNullable<NonNullable<NonNullable<NonNullable<T>[P1]>[P2]>[P3]>[P4]
      >[P5]
    >[P6]
  >
>(
  obj: T,
  prop1: P1,
  prop2: P2,
  prop3: P3,
  prop4: P4,
  prop5: P5,
  prop6: P6,
  prop7: P7
):
  | NonNullable<
      NonNullable<
        NonNullable<
          NonNullable<NonNullable<NonNullable<NonNullable<T>[P1]>[P2]>[P3]>[P4]
        >[P5]
      >[P6]
    >[P7]
  | undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function get(obj: any, ...props: string[]): any {
  return (
    obj &&
    props.reduce(
      (result, prop) => (result === null ? undefined : result[prop]),
      obj
    )
  );
}

export const clearNulls = (
  array: (null | string | number | object)[]
): (string | number | object)[] | null => {
  if (!array) return null;
  const returnArray: (string | number | object)[] = [];
  array.forEach(el => {
    if (el !== null) {
      returnArray.push(el);
    }
  });
  return returnArray;
};

export const getFirst = (
  array: (string | number | boolean | null)[] | null
): string | number | boolean | null => {
  if (Array.isArray(array)) {
    return array[0];
  }
  return null;
};

export const onlySimple = (
  array: (string | number | boolean | object | null)[]
): (string | number | boolean | null)[] | null => {
  if (!array) return null;
  const returnArray: (string | number | boolean | null)[] = [];
  array.forEach(el => {
    if (!el) {
      returnArray.push(null);
    } else if (typeof el !== 'object') {
      returnArray.push(el);
    }
  });
  return returnArray;
};

export const traverse = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: any,
  path: (string | string[])[],
  clearNull = true
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any => {
  let tObj = obj;
  let tPath = '__notfound__';
  if (Array.isArray(path[0])) {
    for (let p = 0; p < path[0].length && tPath === '__notfound__'; p += 1) {
      if (path[0][p] in tObj) {
        tPath = path[0][p];
      }
    }
  } else {
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
      const results: any[] = [];
      tObj.forEach(sub => {
        results.push(traverse(sub, path.slice(1), clearNull));
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let returnValue: any[] | null = results.flat();
      if (clearNull) {
        returnValue = clearNulls(results.flat());
      }
      if (!returnValue || returnValue.length === 0) {
        return null;
      }
      return returnValue;
    } else if (path.length > 1) {
      return traverse(tObj, path.slice(1), clearNull);
    } else {
      if (
        Array.isArray(tObj) &&
        typeof tObj[0] === 'object' &&
        '#text' in tObj[0]
      ) {
        return tObj[0]['#text'];
      } else if (
        !Array.isArray(tObj) &&
        typeof tObj === 'object' &&
        '#text' in tObj
      ) {
        return tObj['#text'];
      }
      return tObj;
    }
  } else {
    return null;
  }
};
