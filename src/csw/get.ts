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
): (string | number | object)[] => {
  const returnArray: (string | number | object)[] = [];
  array.forEach(el => {
    if (el !== null) {
      returnArray.push(el);
    }
  });
  return returnArray;
};

export const onlySimple = (
  array: (string | number | boolean | object | null)[]
): (string | number | boolean | null)[] => {
  const returnArray: (string | number | boolean | null)[] = [];
  array.forEach(el => {
    if (typeof el !== 'object') {
      returnArray.push(el);
    }
  });
  return returnArray;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const traverse = (obj: any, path: string[], clearNull = true): any => {
  let tObj = obj;
  if (typeof tObj === 'object' && path[0] in tObj) {
    tObj = tObj[path[0]];
    if (path.length > 1 && Array.isArray(tObj)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: any[] = [];
      tObj.forEach(sub => {
        results.push(traverse(sub, path.slice(1), clearNull));
      });
      if (clearNull) {
        return clearNulls(results.flat());
      }
      return results.flat();
    } else if (path.length > 1) {
      return traverse(tObj, path.slice(1), clearNull);
    } else {
      return tObj;
    }
  } else {
    return null;
  }
};
