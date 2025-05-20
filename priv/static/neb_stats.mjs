// build/dev/javascript/prelude.mjs
var CustomType = class {
  withFields(fields) {
    let properties = Object.keys(this).map(
      (label) => label in fields ? fields[label] : this[label]
    );
    return new this.constructor(...properties);
  }
};
var List = class {
  static fromArray(array3, tail) {
    let t = tail || new Empty();
    for (let i = array3.length - 1; i >= 0; --i) {
      t = new NonEmpty(array3[i], t);
    }
    return t;
  }
  [Symbol.iterator]() {
    return new ListIterator(this);
  }
  toArray() {
    return [...this];
  }
  // @internal
  atLeastLength(desired) {
    let current = this;
    while (desired-- > 0 && current) current = current.tail;
    return current !== void 0;
  }
  // @internal
  hasLength(desired) {
    let current = this;
    while (desired-- > 0 && current) current = current.tail;
    return desired === -1 && current instanceof Empty;
  }
  // @internal
  countLength() {
    let current = this;
    let length3 = 0;
    while (current) {
      current = current.tail;
      length3++;
    }
    return length3 - 1;
  }
};
function prepend(element3, tail) {
  return new NonEmpty(element3, tail);
}
function toList(elements, tail) {
  return List.fromArray(elements, tail);
}
var ListIterator = class {
  #current;
  constructor(current) {
    this.#current = current;
  }
  next() {
    if (this.#current instanceof Empty) {
      return { done: true };
    } else {
      let { head, tail } = this.#current;
      this.#current = tail;
      return { value: head, done: false };
    }
  }
};
var Empty = class extends List {
};
var NonEmpty = class extends List {
  constructor(head, tail) {
    super();
    this.head = head;
    this.tail = tail;
  }
};
var BitArray = class {
  /**
   * The size in bits of this bit array's data.
   *
   * @type {number}
   */
  bitSize;
  /**
   * The size in bytes of this bit array's data. If this bit array doesn't store
   * a whole number of bytes then this value is rounded up.
   *
   * @type {number}
   */
  byteSize;
  /**
   * The number of unused high bits in the first byte of this bit array's
   * buffer prior to the start of its data. The value of any unused high bits is
   * undefined.
   *
   * The bit offset will be in the range 0-7.
   *
   * @type {number}
   */
  bitOffset;
  /**
   * The raw bytes that hold this bit array's data.
   *
   * If `bitOffset` is not zero then there are unused high bits in the first
   * byte of this buffer.
   *
   * If `bitOffset + bitSize` is not a multiple of 8 then there are unused low
   * bits in the last byte of this buffer.
   *
   * @type {Uint8Array}
   */
  rawBuffer;
  /**
   * Constructs a new bit array from a `Uint8Array`, an optional size in
   * bits, and an optional bit offset.
   *
   * If no bit size is specified it is taken as `buffer.length * 8`, i.e. all
   * bytes in the buffer make up the new bit array's data.
   *
   * If no bit offset is specified it defaults to zero, i.e. there are no unused
   * high bits in the first byte of the buffer.
   *
   * @param {Uint8Array} buffer
   * @param {number} [bitSize]
   * @param {number} [bitOffset]
   */
  constructor(buffer, bitSize, bitOffset) {
    if (!(buffer instanceof Uint8Array)) {
      throw globalThis.Error(
        "BitArray can only be constructed from a Uint8Array"
      );
    }
    this.bitSize = bitSize ?? buffer.length * 8;
    this.byteSize = Math.trunc((this.bitSize + 7) / 8);
    this.bitOffset = bitOffset ?? 0;
    if (this.bitSize < 0) {
      throw globalThis.Error(`BitArray bit size is invalid: ${this.bitSize}`);
    }
    if (this.bitOffset < 0 || this.bitOffset > 7) {
      throw globalThis.Error(
        `BitArray bit offset is invalid: ${this.bitOffset}`
      );
    }
    if (buffer.length !== Math.trunc((this.bitOffset + this.bitSize + 7) / 8)) {
      throw globalThis.Error("BitArray buffer length is invalid");
    }
    this.rawBuffer = buffer;
  }
  /**
   * Returns a specific byte in this bit array. If the byte index is out of
   * range then `undefined` is returned.
   *
   * When returning the final byte of a bit array with a bit size that's not a
   * multiple of 8, the content of the unused low bits are undefined.
   *
   * @param {number} index
   * @returns {number | undefined}
   */
  byteAt(index5) {
    if (index5 < 0 || index5 >= this.byteSize) {
      return void 0;
    }
    return bitArrayByteAt(this.rawBuffer, this.bitOffset, index5);
  }
  /** @internal */
  equals(other) {
    if (this.bitSize !== other.bitSize) {
      return false;
    }
    const wholeByteCount = Math.trunc(this.bitSize / 8);
    if (this.bitOffset === 0 && other.bitOffset === 0) {
      for (let i = 0; i < wholeByteCount; i++) {
        if (this.rawBuffer[i] !== other.rawBuffer[i]) {
          return false;
        }
      }
      const trailingBitsCount = this.bitSize % 8;
      if (trailingBitsCount) {
        const unusedLowBitCount = 8 - trailingBitsCount;
        if (this.rawBuffer[wholeByteCount] >> unusedLowBitCount !== other.rawBuffer[wholeByteCount] >> unusedLowBitCount) {
          return false;
        }
      }
    } else {
      for (let i = 0; i < wholeByteCount; i++) {
        const a = bitArrayByteAt(this.rawBuffer, this.bitOffset, i);
        const b = bitArrayByteAt(other.rawBuffer, other.bitOffset, i);
        if (a !== b) {
          return false;
        }
      }
      const trailingBitsCount = this.bitSize % 8;
      if (trailingBitsCount) {
        const a = bitArrayByteAt(
          this.rawBuffer,
          this.bitOffset,
          wholeByteCount
        );
        const b = bitArrayByteAt(
          other.rawBuffer,
          other.bitOffset,
          wholeByteCount
        );
        const unusedLowBitCount = 8 - trailingBitsCount;
        if (a >> unusedLowBitCount !== b >> unusedLowBitCount) {
          return false;
        }
      }
    }
    return true;
  }
  /**
   * Returns this bit array's internal buffer.
   *
   * @deprecated Use `BitArray.byteAt()` or `BitArray.rawBuffer` instead.
   *
   * @returns {Uint8Array}
   */
  get buffer() {
    bitArrayPrintDeprecationWarning(
      "buffer",
      "Use BitArray.byteAt() or BitArray.rawBuffer instead"
    );
    if (this.bitOffset !== 0 || this.bitSize % 8 !== 0) {
      throw new globalThis.Error(
        "BitArray.buffer does not support unaligned bit arrays"
      );
    }
    return this.rawBuffer;
  }
  /**
   * Returns the length in bytes of this bit array's internal buffer.
   *
   * @deprecated Use `BitArray.bitSize` or `BitArray.byteSize` instead.
   *
   * @returns {number}
   */
  get length() {
    bitArrayPrintDeprecationWarning(
      "length",
      "Use BitArray.bitSize or BitArray.byteSize instead"
    );
    if (this.bitOffset !== 0 || this.bitSize % 8 !== 0) {
      throw new globalThis.Error(
        "BitArray.length does not support unaligned bit arrays"
      );
    }
    return this.rawBuffer.length;
  }
};
function bitArrayByteAt(buffer, bitOffset, index5) {
  if (bitOffset === 0) {
    return buffer[index5] ?? 0;
  } else {
    const a = buffer[index5] << bitOffset & 255;
    const b = buffer[index5 + 1] >> 8 - bitOffset;
    return a | b;
  }
}
var UtfCodepoint = class {
  constructor(value) {
    this.value = value;
  }
};
var isBitArrayDeprecationMessagePrinted = {};
function bitArrayPrintDeprecationWarning(name, message) {
  if (isBitArrayDeprecationMessagePrinted[name]) {
    return;
  }
  console.warn(
    `Deprecated BitArray.${name} property used in JavaScript FFI code. ${message}.`
  );
  isBitArrayDeprecationMessagePrinted[name] = true;
}
function bitArraySlice(bitArray, start4, end) {
  end ??= bitArray.bitSize;
  bitArrayValidateRange(bitArray, start4, end);
  if (start4 === end) {
    return new BitArray(new Uint8Array());
  }
  if (start4 === 0 && end === bitArray.bitSize) {
    return bitArray;
  }
  start4 += bitArray.bitOffset;
  end += bitArray.bitOffset;
  const startByteIndex = Math.trunc(start4 / 8);
  const endByteIndex = Math.trunc((end + 7) / 8);
  const byteLength = endByteIndex - startByteIndex;
  let buffer;
  if (startByteIndex === 0 && byteLength === bitArray.rawBuffer.byteLength) {
    buffer = bitArray.rawBuffer;
  } else {
    buffer = new Uint8Array(
      bitArray.rawBuffer.buffer,
      bitArray.rawBuffer.byteOffset + startByteIndex,
      byteLength
    );
  }
  return new BitArray(buffer, end - start4, start4 % 8);
}
function bitArraySliceToInt(bitArray, start4, end, isBigEndian, isSigned) {
  bitArrayValidateRange(bitArray, start4, end);
  if (start4 === end) {
    return 0;
  }
  start4 += bitArray.bitOffset;
  end += bitArray.bitOffset;
  const isStartByteAligned = start4 % 8 === 0;
  const isEndByteAligned = end % 8 === 0;
  if (isStartByteAligned && isEndByteAligned) {
    return intFromAlignedSlice(
      bitArray,
      start4 / 8,
      end / 8,
      isBigEndian,
      isSigned
    );
  }
  const size2 = end - start4;
  const startByteIndex = Math.trunc(start4 / 8);
  const endByteIndex = Math.trunc((end - 1) / 8);
  if (startByteIndex == endByteIndex) {
    const mask2 = 255 >> start4 % 8;
    const unusedLowBitCount = (8 - end % 8) % 8;
    let value = (bitArray.rawBuffer[startByteIndex] & mask2) >> unusedLowBitCount;
    if (isSigned) {
      const highBit = 2 ** (size2 - 1);
      if (value >= highBit) {
        value -= highBit * 2;
      }
    }
    return value;
  }
  if (size2 <= 53) {
    return intFromUnalignedSliceUsingNumber(
      bitArray.rawBuffer,
      start4,
      end,
      isBigEndian,
      isSigned
    );
  } else {
    return intFromUnalignedSliceUsingBigInt(
      bitArray.rawBuffer,
      start4,
      end,
      isBigEndian,
      isSigned
    );
  }
}
function toBitArray(segments) {
  if (segments.length === 0) {
    return new BitArray(new Uint8Array());
  }
  if (segments.length === 1) {
    const segment = segments[0];
    if (segment instanceof BitArray) {
      return segment;
    }
    if (segment instanceof Uint8Array) {
      return new BitArray(segment);
    }
    return new BitArray(new Uint8Array(
      /** @type {number[]} */
      segments
    ));
  }
  let bitSize = 0;
  let areAllSegmentsNumbers = true;
  for (const segment of segments) {
    if (segment instanceof BitArray) {
      bitSize += segment.bitSize;
      areAllSegmentsNumbers = false;
    } else if (segment instanceof Uint8Array) {
      bitSize += segment.byteLength * 8;
      areAllSegmentsNumbers = false;
    } else {
      bitSize += 8;
    }
  }
  if (areAllSegmentsNumbers) {
    return new BitArray(new Uint8Array(
      /** @type {number[]} */
      segments
    ));
  }
  const buffer = new Uint8Array(Math.trunc((bitSize + 7) / 8));
  let cursor = 0;
  for (let segment of segments) {
    const isCursorByteAligned = cursor % 8 === 0;
    if (segment instanceof BitArray) {
      if (isCursorByteAligned && segment.bitOffset === 0) {
        buffer.set(segment.rawBuffer, cursor / 8);
        cursor += segment.bitSize;
        const trailingBitsCount = segment.bitSize % 8;
        if (trailingBitsCount !== 0) {
          const lastByteIndex = Math.trunc(cursor / 8);
          buffer[lastByteIndex] >>= 8 - trailingBitsCount;
          buffer[lastByteIndex] <<= 8 - trailingBitsCount;
        }
      } else {
        appendUnalignedBits(
          segment.rawBuffer,
          segment.bitSize,
          segment.bitOffset
        );
      }
    } else if (segment instanceof Uint8Array) {
      if (isCursorByteAligned) {
        buffer.set(segment, cursor / 8);
        cursor += segment.byteLength * 8;
      } else {
        appendUnalignedBits(segment, segment.byteLength * 8, 0);
      }
    } else {
      if (isCursorByteAligned) {
        buffer[cursor / 8] = segment;
        cursor += 8;
      } else {
        appendUnalignedBits(new Uint8Array([segment]), 8, 0);
      }
    }
  }
  function appendUnalignedBits(unalignedBits, size2, offset) {
    if (size2 === 0) {
      return;
    }
    const byteSize = Math.trunc(size2 + 7 / 8);
    const highBitsCount = cursor % 8;
    const lowBitsCount = 8 - highBitsCount;
    let byteIndex = Math.trunc(cursor / 8);
    for (let i = 0; i < byteSize; i++) {
      let byte = bitArrayByteAt(unalignedBits, offset, i);
      if (size2 < 8) {
        byte >>= 8 - size2;
        byte <<= 8 - size2;
      }
      buffer[byteIndex] |= byte >> highBitsCount;
      let appendedBitsCount = size2 - Math.max(0, size2 - lowBitsCount);
      size2 -= appendedBitsCount;
      cursor += appendedBitsCount;
      if (size2 === 0) {
        break;
      }
      buffer[++byteIndex] = byte << lowBitsCount;
      appendedBitsCount = size2 - Math.max(0, size2 - highBitsCount);
      size2 -= appendedBitsCount;
      cursor += appendedBitsCount;
    }
  }
  return new BitArray(buffer, bitSize);
}
function intFromAlignedSlice(bitArray, start4, end, isBigEndian, isSigned) {
  const byteSize = end - start4;
  if (byteSize <= 6) {
    return intFromAlignedSliceUsingNumber(
      bitArray.rawBuffer,
      start4,
      end,
      isBigEndian,
      isSigned
    );
  } else {
    return intFromAlignedSliceUsingBigInt(
      bitArray.rawBuffer,
      start4,
      end,
      isBigEndian,
      isSigned
    );
  }
}
function intFromAlignedSliceUsingNumber(buffer, start4, end, isBigEndian, isSigned) {
  const byteSize = end - start4;
  let value = 0;
  if (isBigEndian) {
    for (let i = start4; i < end; i++) {
      value *= 256;
      value += buffer[i];
    }
  } else {
    for (let i = end - 1; i >= start4; i--) {
      value *= 256;
      value += buffer[i];
    }
  }
  if (isSigned) {
    const highBit = 2 ** (byteSize * 8 - 1);
    if (value >= highBit) {
      value -= highBit * 2;
    }
  }
  return value;
}
function intFromAlignedSliceUsingBigInt(buffer, start4, end, isBigEndian, isSigned) {
  const byteSize = end - start4;
  let value = 0n;
  if (isBigEndian) {
    for (let i = start4; i < end; i++) {
      value *= 256n;
      value += BigInt(buffer[i]);
    }
  } else {
    for (let i = end - 1; i >= start4; i--) {
      value *= 256n;
      value += BigInt(buffer[i]);
    }
  }
  if (isSigned) {
    const highBit = 1n << BigInt(byteSize * 8 - 1);
    if (value >= highBit) {
      value -= highBit * 2n;
    }
  }
  return Number(value);
}
function intFromUnalignedSliceUsingNumber(buffer, start4, end, isBigEndian, isSigned) {
  const isStartByteAligned = start4 % 8 === 0;
  let size2 = end - start4;
  let byteIndex = Math.trunc(start4 / 8);
  let value = 0;
  if (isBigEndian) {
    if (!isStartByteAligned) {
      const leadingBitsCount = 8 - start4 % 8;
      value = buffer[byteIndex++] & (1 << leadingBitsCount) - 1;
      size2 -= leadingBitsCount;
    }
    while (size2 >= 8) {
      value *= 256;
      value += buffer[byteIndex++];
      size2 -= 8;
    }
    if (size2 > 0) {
      value *= 2 ** size2;
      value += buffer[byteIndex] >> 8 - size2;
    }
  } else {
    if (isStartByteAligned) {
      let size3 = end - start4;
      let scale = 1;
      while (size3 >= 8) {
        value += buffer[byteIndex++] * scale;
        scale *= 256;
        size3 -= 8;
      }
      value += (buffer[byteIndex] >> 8 - size3) * scale;
    } else {
      const highBitsCount = start4 % 8;
      const lowBitsCount = 8 - highBitsCount;
      let size3 = end - start4;
      let scale = 1;
      while (size3 >= 8) {
        const byte = buffer[byteIndex] << highBitsCount | buffer[byteIndex + 1] >> lowBitsCount;
        value += (byte & 255) * scale;
        scale *= 256;
        size3 -= 8;
        byteIndex++;
      }
      if (size3 > 0) {
        const lowBitsUsed = size3 - Math.max(0, size3 - lowBitsCount);
        let trailingByte = (buffer[byteIndex] & (1 << lowBitsCount) - 1) >> lowBitsCount - lowBitsUsed;
        size3 -= lowBitsUsed;
        if (size3 > 0) {
          trailingByte *= 2 ** size3;
          trailingByte += buffer[byteIndex + 1] >> 8 - size3;
        }
        value += trailingByte * scale;
      }
    }
  }
  if (isSigned) {
    const highBit = 2 ** (end - start4 - 1);
    if (value >= highBit) {
      value -= highBit * 2;
    }
  }
  return value;
}
function intFromUnalignedSliceUsingBigInt(buffer, start4, end, isBigEndian, isSigned) {
  const isStartByteAligned = start4 % 8 === 0;
  let size2 = end - start4;
  let byteIndex = Math.trunc(start4 / 8);
  let value = 0n;
  if (isBigEndian) {
    if (!isStartByteAligned) {
      const leadingBitsCount = 8 - start4 % 8;
      value = BigInt(buffer[byteIndex++] & (1 << leadingBitsCount) - 1);
      size2 -= leadingBitsCount;
    }
    while (size2 >= 8) {
      value *= 256n;
      value += BigInt(buffer[byteIndex++]);
      size2 -= 8;
    }
    if (size2 > 0) {
      value <<= BigInt(size2);
      value += BigInt(buffer[byteIndex] >> 8 - size2);
    }
  } else {
    if (isStartByteAligned) {
      let size3 = end - start4;
      let shift = 0n;
      while (size3 >= 8) {
        value += BigInt(buffer[byteIndex++]) << shift;
        shift += 8n;
        size3 -= 8;
      }
      value += BigInt(buffer[byteIndex] >> 8 - size3) << shift;
    } else {
      const highBitsCount = start4 % 8;
      const lowBitsCount = 8 - highBitsCount;
      let size3 = end - start4;
      let shift = 0n;
      while (size3 >= 8) {
        const byte = buffer[byteIndex] << highBitsCount | buffer[byteIndex + 1] >> lowBitsCount;
        value += BigInt(byte & 255) << shift;
        shift += 8n;
        size3 -= 8;
        byteIndex++;
      }
      if (size3 > 0) {
        const lowBitsUsed = size3 - Math.max(0, size3 - lowBitsCount);
        let trailingByte = (buffer[byteIndex] & (1 << lowBitsCount) - 1) >> lowBitsCount - lowBitsUsed;
        size3 -= lowBitsUsed;
        if (size3 > 0) {
          trailingByte <<= size3;
          trailingByte += buffer[byteIndex + 1] >> 8 - size3;
        }
        value += BigInt(trailingByte) << shift;
      }
    }
  }
  if (isSigned) {
    const highBit = 2n ** BigInt(end - start4 - 1);
    if (value >= highBit) {
      value -= highBit * 2n;
    }
  }
  return Number(value);
}
function bitArrayValidateRange(bitArray, start4, end) {
  if (start4 < 0 || start4 > bitArray.bitSize || end < start4 || end > bitArray.bitSize) {
    const msg = `Invalid bit array slice: start = ${start4}, end = ${end}, bit size = ${bitArray.bitSize}`;
    throw new globalThis.Error(msg);
  }
}
var utf8Encoder;
function stringBits(string5) {
  utf8Encoder ??= new TextEncoder();
  return utf8Encoder.encode(string5);
}
var Result = class _Result extends CustomType {
  // @internal
  static isResult(data) {
    return data instanceof _Result;
  }
};
var Ok = class extends Result {
  constructor(value) {
    super();
    this[0] = value;
  }
  // @internal
  isOk() {
    return true;
  }
};
var Error2 = class extends Result {
  constructor(detail) {
    super();
    this[0] = detail;
  }
  // @internal
  isOk() {
    return false;
  }
};
function isEqual(x, y) {
  let values3 = [x, y];
  while (values3.length) {
    let a = values3.pop();
    let b = values3.pop();
    if (a === b) continue;
    if (!isObject(a) || !isObject(b)) return false;
    let unequal = !structurallyCompatibleObjects(a, b) || unequalDates(a, b) || unequalBuffers(a, b) || unequalArrays(a, b) || unequalMaps(a, b) || unequalSets(a, b) || unequalRegExps(a, b);
    if (unequal) return false;
    const proto = Object.getPrototypeOf(a);
    if (proto !== null && typeof proto.equals === "function") {
      try {
        if (a.equals(b)) continue;
        else return false;
      } catch {
      }
    }
    let [keys2, get2] = getters(a);
    for (let k of keys2(a)) {
      values3.push(get2(a, k), get2(b, k));
    }
  }
  return true;
}
function getters(object3) {
  if (object3 instanceof Map) {
    return [(x) => x.keys(), (x, y) => x.get(y)];
  } else {
    let extra = object3 instanceof globalThis.Error ? ["message"] : [];
    return [(x) => [...extra, ...Object.keys(x)], (x, y) => x[y]];
  }
}
function unequalDates(a, b) {
  return a instanceof Date && (a > b || a < b);
}
function unequalBuffers(a, b) {
  return !(a instanceof BitArray) && a.buffer instanceof ArrayBuffer && a.BYTES_PER_ELEMENT && !(a.byteLength === b.byteLength && a.every((n, i) => n === b[i]));
}
function unequalArrays(a, b) {
  return Array.isArray(a) && a.length !== b.length;
}
function unequalMaps(a, b) {
  return a instanceof Map && a.size !== b.size;
}
function unequalSets(a, b) {
  return a instanceof Set && (a.size != b.size || [...a].some((e) => !b.has(e)));
}
function unequalRegExps(a, b) {
  return a instanceof RegExp && (a.source !== b.source || a.flags !== b.flags);
}
function isObject(a) {
  return typeof a === "object" && a !== null;
}
function structurallyCompatibleObjects(a, b) {
  if (typeof a !== "object" && typeof b !== "object" && (!a || !b))
    return false;
  let nonstructural = [Promise, WeakSet, WeakMap, Function];
  if (nonstructural.some((c) => a instanceof c)) return false;
  return a.constructor === b.constructor;
}
function divideFloat(a, b) {
  if (b === 0) {
    return 0;
  } else {
    return a / b;
  }
}
function makeError(variant, module, line, fn, message, extra) {
  let error2 = new globalThis.Error(message);
  error2.gleam_error = variant;
  error2.module = module;
  error2.line = line;
  error2.function = fn;
  error2.fn = fn;
  for (let k in extra) error2[k] = extra[k];
  return error2;
}

// build/dev/javascript/gleam_stdlib/gleam/option.mjs
var Some = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var None = class extends CustomType {
};

// build/dev/javascript/gleam_stdlib/dict.mjs
var referenceMap = /* @__PURE__ */ new WeakMap();
var tempDataView = /* @__PURE__ */ new DataView(
  /* @__PURE__ */ new ArrayBuffer(8)
);
var referenceUID = 0;
function hashByReference(o) {
  const known = referenceMap.get(o);
  if (known !== void 0) {
    return known;
  }
  const hash = referenceUID++;
  if (referenceUID === 2147483647) {
    referenceUID = 0;
  }
  referenceMap.set(o, hash);
  return hash;
}
function hashMerge(a, b) {
  return a ^ b + 2654435769 + (a << 6) + (a >> 2) | 0;
}
function hashString(s) {
  let hash = 0;
  const len = s.length;
  for (let i = 0; i < len; i++) {
    hash = Math.imul(31, hash) + s.charCodeAt(i) | 0;
  }
  return hash;
}
function hashNumber(n) {
  tempDataView.setFloat64(0, n);
  const i = tempDataView.getInt32(0);
  const j = tempDataView.getInt32(4);
  return Math.imul(73244475, i >> 16 ^ i) ^ j;
}
function hashBigInt(n) {
  return hashString(n.toString());
}
function hashObject(o) {
  const proto = Object.getPrototypeOf(o);
  if (proto !== null && typeof proto.hashCode === "function") {
    try {
      const code = o.hashCode(o);
      if (typeof code === "number") {
        return code;
      }
    } catch {
    }
  }
  if (o instanceof Promise || o instanceof WeakSet || o instanceof WeakMap) {
    return hashByReference(o);
  }
  if (o instanceof Date) {
    return hashNumber(o.getTime());
  }
  let h = 0;
  if (o instanceof ArrayBuffer) {
    o = new Uint8Array(o);
  }
  if (Array.isArray(o) || o instanceof Uint8Array) {
    for (let i = 0; i < o.length; i++) {
      h = Math.imul(31, h) + getHash(o[i]) | 0;
    }
  } else if (o instanceof Set) {
    o.forEach((v) => {
      h = h + getHash(v) | 0;
    });
  } else if (o instanceof Map) {
    o.forEach((v, k) => {
      h = h + hashMerge(getHash(v), getHash(k)) | 0;
    });
  } else {
    const keys2 = Object.keys(o);
    for (let i = 0; i < keys2.length; i++) {
      const k = keys2[i];
      const v = o[k];
      h = h + hashMerge(getHash(v), hashString(k)) | 0;
    }
  }
  return h;
}
function getHash(u) {
  if (u === null) return 1108378658;
  if (u === void 0) return 1108378659;
  if (u === true) return 1108378657;
  if (u === false) return 1108378656;
  switch (typeof u) {
    case "number":
      return hashNumber(u);
    case "string":
      return hashString(u);
    case "bigint":
      return hashBigInt(u);
    case "object":
      return hashObject(u);
    case "symbol":
      return hashByReference(u);
    case "function":
      return hashByReference(u);
    default:
      return 0;
  }
}
var SHIFT = 5;
var BUCKET_SIZE = Math.pow(2, SHIFT);
var MASK = BUCKET_SIZE - 1;
var MAX_INDEX_NODE = BUCKET_SIZE / 2;
var MIN_ARRAY_NODE = BUCKET_SIZE / 4;
var ENTRY = 0;
var ARRAY_NODE = 1;
var INDEX_NODE = 2;
var COLLISION_NODE = 3;
var EMPTY = {
  type: INDEX_NODE,
  bitmap: 0,
  array: []
};
function mask(hash, shift) {
  return hash >>> shift & MASK;
}
function bitpos(hash, shift) {
  return 1 << mask(hash, shift);
}
function bitcount(x) {
  x -= x >> 1 & 1431655765;
  x = (x & 858993459) + (x >> 2 & 858993459);
  x = x + (x >> 4) & 252645135;
  x += x >> 8;
  x += x >> 16;
  return x & 127;
}
function index(bitmap, bit) {
  return bitcount(bitmap & bit - 1);
}
function cloneAndSet(arr, at, val) {
  const len = arr.length;
  const out = new Array(len);
  for (let i = 0; i < len; ++i) {
    out[i] = arr[i];
  }
  out[at] = val;
  return out;
}
function spliceIn(arr, at, val) {
  const len = arr.length;
  const out = new Array(len + 1);
  let i = 0;
  let g = 0;
  while (i < at) {
    out[g++] = arr[i++];
  }
  out[g++] = val;
  while (i < len) {
    out[g++] = arr[i++];
  }
  return out;
}
function spliceOut(arr, at) {
  const len = arr.length;
  const out = new Array(len - 1);
  let i = 0;
  let g = 0;
  while (i < at) {
    out[g++] = arr[i++];
  }
  ++i;
  while (i < len) {
    out[g++] = arr[i++];
  }
  return out;
}
function createNode(shift, key1, val1, key2hash, key2, val2) {
  const key1hash = getHash(key1);
  if (key1hash === key2hash) {
    return {
      type: COLLISION_NODE,
      hash: key1hash,
      array: [
        { type: ENTRY, k: key1, v: val1 },
        { type: ENTRY, k: key2, v: val2 }
      ]
    };
  }
  const addedLeaf = { val: false };
  return assoc(
    assocIndex(EMPTY, shift, key1hash, key1, val1, addedLeaf),
    shift,
    key2hash,
    key2,
    val2,
    addedLeaf
  );
}
function assoc(root3, shift, hash, key, val, addedLeaf) {
  switch (root3.type) {
    case ARRAY_NODE:
      return assocArray(root3, shift, hash, key, val, addedLeaf);
    case INDEX_NODE:
      return assocIndex(root3, shift, hash, key, val, addedLeaf);
    case COLLISION_NODE:
      return assocCollision(root3, shift, hash, key, val, addedLeaf);
  }
}
function assocArray(root3, shift, hash, key, val, addedLeaf) {
  const idx = mask(hash, shift);
  const node = root3.array[idx];
  if (node === void 0) {
    addedLeaf.val = true;
    return {
      type: ARRAY_NODE,
      size: root3.size + 1,
      array: cloneAndSet(root3.array, idx, { type: ENTRY, k: key, v: val })
    };
  }
  if (node.type === ENTRY) {
    if (isEqual(key, node.k)) {
      if (val === node.v) {
        return root3;
      }
      return {
        type: ARRAY_NODE,
        size: root3.size,
        array: cloneAndSet(root3.array, idx, {
          type: ENTRY,
          k: key,
          v: val
        })
      };
    }
    addedLeaf.val = true;
    return {
      type: ARRAY_NODE,
      size: root3.size,
      array: cloneAndSet(
        root3.array,
        idx,
        createNode(shift + SHIFT, node.k, node.v, hash, key, val)
      )
    };
  }
  const n = assoc(node, shift + SHIFT, hash, key, val, addedLeaf);
  if (n === node) {
    return root3;
  }
  return {
    type: ARRAY_NODE,
    size: root3.size,
    array: cloneAndSet(root3.array, idx, n)
  };
}
function assocIndex(root3, shift, hash, key, val, addedLeaf) {
  const bit = bitpos(hash, shift);
  const idx = index(root3.bitmap, bit);
  if ((root3.bitmap & bit) !== 0) {
    const node = root3.array[idx];
    if (node.type !== ENTRY) {
      const n = assoc(node, shift + SHIFT, hash, key, val, addedLeaf);
      if (n === node) {
        return root3;
      }
      return {
        type: INDEX_NODE,
        bitmap: root3.bitmap,
        array: cloneAndSet(root3.array, idx, n)
      };
    }
    const nodeKey = node.k;
    if (isEqual(key, nodeKey)) {
      if (val === node.v) {
        return root3;
      }
      return {
        type: INDEX_NODE,
        bitmap: root3.bitmap,
        array: cloneAndSet(root3.array, idx, {
          type: ENTRY,
          k: key,
          v: val
        })
      };
    }
    addedLeaf.val = true;
    return {
      type: INDEX_NODE,
      bitmap: root3.bitmap,
      array: cloneAndSet(
        root3.array,
        idx,
        createNode(shift + SHIFT, nodeKey, node.v, hash, key, val)
      )
    };
  } else {
    const n = root3.array.length;
    if (n >= MAX_INDEX_NODE) {
      const nodes = new Array(32);
      const jdx = mask(hash, shift);
      nodes[jdx] = assocIndex(EMPTY, shift + SHIFT, hash, key, val, addedLeaf);
      let j = 0;
      let bitmap = root3.bitmap;
      for (let i = 0; i < 32; i++) {
        if ((bitmap & 1) !== 0) {
          const node = root3.array[j++];
          nodes[i] = node;
        }
        bitmap = bitmap >>> 1;
      }
      return {
        type: ARRAY_NODE,
        size: n + 1,
        array: nodes
      };
    } else {
      const newArray = spliceIn(root3.array, idx, {
        type: ENTRY,
        k: key,
        v: val
      });
      addedLeaf.val = true;
      return {
        type: INDEX_NODE,
        bitmap: root3.bitmap | bit,
        array: newArray
      };
    }
  }
}
function assocCollision(root3, shift, hash, key, val, addedLeaf) {
  if (hash === root3.hash) {
    const idx = collisionIndexOf(root3, key);
    if (idx !== -1) {
      const entry = root3.array[idx];
      if (entry.v === val) {
        return root3;
      }
      return {
        type: COLLISION_NODE,
        hash,
        array: cloneAndSet(root3.array, idx, { type: ENTRY, k: key, v: val })
      };
    }
    const size2 = root3.array.length;
    addedLeaf.val = true;
    return {
      type: COLLISION_NODE,
      hash,
      array: cloneAndSet(root3.array, size2, { type: ENTRY, k: key, v: val })
    };
  }
  return assoc(
    {
      type: INDEX_NODE,
      bitmap: bitpos(root3.hash, shift),
      array: [root3]
    },
    shift,
    hash,
    key,
    val,
    addedLeaf
  );
}
function collisionIndexOf(root3, key) {
  const size2 = root3.array.length;
  for (let i = 0; i < size2; i++) {
    if (isEqual(key, root3.array[i].k)) {
      return i;
    }
  }
  return -1;
}
function find(root3, shift, hash, key) {
  switch (root3.type) {
    case ARRAY_NODE:
      return findArray(root3, shift, hash, key);
    case INDEX_NODE:
      return findIndex(root3, shift, hash, key);
    case COLLISION_NODE:
      return findCollision(root3, key);
  }
}
function findArray(root3, shift, hash, key) {
  const idx = mask(hash, shift);
  const node = root3.array[idx];
  if (node === void 0) {
    return void 0;
  }
  if (node.type !== ENTRY) {
    return find(node, shift + SHIFT, hash, key);
  }
  if (isEqual(key, node.k)) {
    return node;
  }
  return void 0;
}
function findIndex(root3, shift, hash, key) {
  const bit = bitpos(hash, shift);
  if ((root3.bitmap & bit) === 0) {
    return void 0;
  }
  const idx = index(root3.bitmap, bit);
  const node = root3.array[idx];
  if (node.type !== ENTRY) {
    return find(node, shift + SHIFT, hash, key);
  }
  if (isEqual(key, node.k)) {
    return node;
  }
  return void 0;
}
function findCollision(root3, key) {
  const idx = collisionIndexOf(root3, key);
  if (idx < 0) {
    return void 0;
  }
  return root3.array[idx];
}
function without(root3, shift, hash, key) {
  switch (root3.type) {
    case ARRAY_NODE:
      return withoutArray(root3, shift, hash, key);
    case INDEX_NODE:
      return withoutIndex(root3, shift, hash, key);
    case COLLISION_NODE:
      return withoutCollision(root3, key);
  }
}
function withoutArray(root3, shift, hash, key) {
  const idx = mask(hash, shift);
  const node = root3.array[idx];
  if (node === void 0) {
    return root3;
  }
  let n = void 0;
  if (node.type === ENTRY) {
    if (!isEqual(node.k, key)) {
      return root3;
    }
  } else {
    n = without(node, shift + SHIFT, hash, key);
    if (n === node) {
      return root3;
    }
  }
  if (n === void 0) {
    if (root3.size <= MIN_ARRAY_NODE) {
      const arr = root3.array;
      const out = new Array(root3.size - 1);
      let i = 0;
      let j = 0;
      let bitmap = 0;
      while (i < idx) {
        const nv = arr[i];
        if (nv !== void 0) {
          out[j] = nv;
          bitmap |= 1 << i;
          ++j;
        }
        ++i;
      }
      ++i;
      while (i < arr.length) {
        const nv = arr[i];
        if (nv !== void 0) {
          out[j] = nv;
          bitmap |= 1 << i;
          ++j;
        }
        ++i;
      }
      return {
        type: INDEX_NODE,
        bitmap,
        array: out
      };
    }
    return {
      type: ARRAY_NODE,
      size: root3.size - 1,
      array: cloneAndSet(root3.array, idx, n)
    };
  }
  return {
    type: ARRAY_NODE,
    size: root3.size,
    array: cloneAndSet(root3.array, idx, n)
  };
}
function withoutIndex(root3, shift, hash, key) {
  const bit = bitpos(hash, shift);
  if ((root3.bitmap & bit) === 0) {
    return root3;
  }
  const idx = index(root3.bitmap, bit);
  const node = root3.array[idx];
  if (node.type !== ENTRY) {
    const n = without(node, shift + SHIFT, hash, key);
    if (n === node) {
      return root3;
    }
    if (n !== void 0) {
      return {
        type: INDEX_NODE,
        bitmap: root3.bitmap,
        array: cloneAndSet(root3.array, idx, n)
      };
    }
    if (root3.bitmap === bit) {
      return void 0;
    }
    return {
      type: INDEX_NODE,
      bitmap: root3.bitmap ^ bit,
      array: spliceOut(root3.array, idx)
    };
  }
  if (isEqual(key, node.k)) {
    if (root3.bitmap === bit) {
      return void 0;
    }
    return {
      type: INDEX_NODE,
      bitmap: root3.bitmap ^ bit,
      array: spliceOut(root3.array, idx)
    };
  }
  return root3;
}
function withoutCollision(root3, key) {
  const idx = collisionIndexOf(root3, key);
  if (idx < 0) {
    return root3;
  }
  if (root3.array.length === 1) {
    return void 0;
  }
  return {
    type: COLLISION_NODE,
    hash: root3.hash,
    array: spliceOut(root3.array, idx)
  };
}
function forEach(root3, fn) {
  if (root3 === void 0) {
    return;
  }
  const items = root3.array;
  const size2 = items.length;
  for (let i = 0; i < size2; i++) {
    const item = items[i];
    if (item === void 0) {
      continue;
    }
    if (item.type === ENTRY) {
      fn(item.v, item.k);
      continue;
    }
    forEach(item, fn);
  }
}
var Dict = class _Dict {
  /**
   * @template V
   * @param {Record<string,V>} o
   * @returns {Dict<string,V>}
   */
  static fromObject(o) {
    const keys2 = Object.keys(o);
    let m = _Dict.new();
    for (let i = 0; i < keys2.length; i++) {
      const k = keys2[i];
      m = m.set(k, o[k]);
    }
    return m;
  }
  /**
   * @template K,V
   * @param {Map<K,V>} o
   * @returns {Dict<K,V>}
   */
  static fromMap(o) {
    let m = _Dict.new();
    o.forEach((v, k) => {
      m = m.set(k, v);
    });
    return m;
  }
  static new() {
    return new _Dict(void 0, 0);
  }
  /**
   * @param {undefined | Node<K,V>} root
   * @param {number} size
   */
  constructor(root3, size2) {
    this.root = root3;
    this.size = size2;
  }
  /**
   * @template NotFound
   * @param {K} key
   * @param {NotFound} notFound
   * @returns {NotFound | V}
   */
  get(key, notFound) {
    if (this.root === void 0) {
      return notFound;
    }
    const found = find(this.root, 0, getHash(key), key);
    if (found === void 0) {
      return notFound;
    }
    return found.v;
  }
  /**
   * @param {K} key
   * @param {V} val
   * @returns {Dict<K,V>}
   */
  set(key, val) {
    const addedLeaf = { val: false };
    const root3 = this.root === void 0 ? EMPTY : this.root;
    const newRoot = assoc(root3, 0, getHash(key), key, val, addedLeaf);
    if (newRoot === this.root) {
      return this;
    }
    return new _Dict(newRoot, addedLeaf.val ? this.size + 1 : this.size);
  }
  /**
   * @param {K} key
   * @returns {Dict<K,V>}
   */
  delete(key) {
    if (this.root === void 0) {
      return this;
    }
    const newRoot = without(this.root, 0, getHash(key), key);
    if (newRoot === this.root) {
      return this;
    }
    if (newRoot === void 0) {
      return _Dict.new();
    }
    return new _Dict(newRoot, this.size - 1);
  }
  /**
   * @param {K} key
   * @returns {boolean}
   */
  has(key) {
    if (this.root === void 0) {
      return false;
    }
    return find(this.root, 0, getHash(key), key) !== void 0;
  }
  /**
   * @returns {[K,V][]}
   */
  entries() {
    if (this.root === void 0) {
      return [];
    }
    const result = [];
    this.forEach((v, k) => result.push([k, v]));
    return result;
  }
  /**
   *
   * @param {(val:V,key:K)=>void} fn
   */
  forEach(fn) {
    forEach(this.root, fn);
  }
  hashCode() {
    let h = 0;
    this.forEach((v, k) => {
      h = h + hashMerge(getHash(v), getHash(k)) | 0;
    });
    return h;
  }
  /**
   * @param {unknown} o
   * @returns {boolean}
   */
  equals(o) {
    if (!(o instanceof _Dict) || this.size !== o.size) {
      return false;
    }
    try {
      this.forEach((v, k) => {
        if (!isEqual(o.get(k, !v), v)) {
          throw unequalDictSymbol;
        }
      });
      return true;
    } catch (e) {
      if (e === unequalDictSymbol) {
        return false;
      }
      throw e;
    }
  }
};
var unequalDictSymbol = /* @__PURE__ */ Symbol();

// build/dev/javascript/gleam_stdlib/gleam/order.mjs
var Lt = class extends CustomType {
};
var Eq = class extends CustomType {
};
var Gt = class extends CustomType {
};

// build/dev/javascript/gleam_stdlib/gleam/float.mjs
function negate(x) {
  return -1 * x;
}
function round2(x) {
  let $ = x >= 0;
  if ($) {
    return round(x);
  } else {
    return 0 - round(negate(x));
  }
}
function to_precision(x, precision) {
  let $ = precision <= 0;
  if ($) {
    let factor = power(10, identity(-precision));
    return identity(round2(divideFloat(x, factor))) * factor;
  } else {
    let factor = power(10, identity(precision));
    return divideFloat(identity(round2(x * factor)), factor);
  }
}

// build/dev/javascript/gleam_stdlib/gleam/list.mjs
var Ascending = class extends CustomType {
};
var Descending = class extends CustomType {
};
function reverse_and_prepend(loop$prefix, loop$suffix) {
  while (true) {
    let prefix = loop$prefix;
    let suffix = loop$suffix;
    if (prefix.hasLength(0)) {
      return suffix;
    } else {
      let first$1 = prefix.head;
      let rest$1 = prefix.tail;
      loop$prefix = rest$1;
      loop$suffix = prepend(first$1, suffix);
    }
  }
}
function reverse(list4) {
  return reverse_and_prepend(list4, toList([]));
}
function map_loop(loop$list, loop$fun, loop$acc) {
  while (true) {
    let list4 = loop$list;
    let fun = loop$fun;
    let acc = loop$acc;
    if (list4.hasLength(0)) {
      return reverse(acc);
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      loop$list = rest$1;
      loop$fun = fun;
      loop$acc = prepend(fun(first$1), acc);
    }
  }
}
function map(list4, fun) {
  return map_loop(list4, fun, toList([]));
}
function append_loop(loop$first, loop$second) {
  while (true) {
    let first = loop$first;
    let second = loop$second;
    if (first.hasLength(0)) {
      return second;
    } else {
      let first$1 = first.head;
      let rest$1 = first.tail;
      loop$first = rest$1;
      loop$second = prepend(first$1, second);
    }
  }
}
function append(first, second) {
  return append_loop(reverse(first), second);
}
function fold(loop$list, loop$initial, loop$fun) {
  while (true) {
    let list4 = loop$list;
    let initial = loop$initial;
    let fun = loop$fun;
    if (list4.hasLength(0)) {
      return initial;
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      loop$list = rest$1;
      loop$initial = fun(initial, first$1);
      loop$fun = fun;
    }
  }
}
function find2(loop$list, loop$is_desired) {
  while (true) {
    let list4 = loop$list;
    let is_desired = loop$is_desired;
    if (list4.hasLength(0)) {
      return new Error2(void 0);
    } else {
      let first$1 = list4.head;
      let rest$1 = list4.tail;
      let $ = is_desired(first$1);
      if ($) {
        return new Ok(first$1);
      } else {
        loop$list = rest$1;
        loop$is_desired = is_desired;
      }
    }
  }
}
function sequences(loop$list, loop$compare, loop$growing, loop$direction, loop$prev, loop$acc) {
  while (true) {
    let list4 = loop$list;
    let compare4 = loop$compare;
    let growing = loop$growing;
    let direction = loop$direction;
    let prev = loop$prev;
    let acc = loop$acc;
    let growing$1 = prepend(prev, growing);
    if (list4.hasLength(0)) {
      if (direction instanceof Ascending) {
        return prepend(reverse(growing$1), acc);
      } else {
        return prepend(growing$1, acc);
      }
    } else {
      let new$1 = list4.head;
      let rest$1 = list4.tail;
      let $ = compare4(prev, new$1);
      if ($ instanceof Gt && direction instanceof Descending) {
        loop$list = rest$1;
        loop$compare = compare4;
        loop$growing = growing$1;
        loop$direction = direction;
        loop$prev = new$1;
        loop$acc = acc;
      } else if ($ instanceof Lt && direction instanceof Ascending) {
        loop$list = rest$1;
        loop$compare = compare4;
        loop$growing = growing$1;
        loop$direction = direction;
        loop$prev = new$1;
        loop$acc = acc;
      } else if ($ instanceof Eq && direction instanceof Ascending) {
        loop$list = rest$1;
        loop$compare = compare4;
        loop$growing = growing$1;
        loop$direction = direction;
        loop$prev = new$1;
        loop$acc = acc;
      } else if ($ instanceof Gt && direction instanceof Ascending) {
        let _block;
        if (direction instanceof Ascending) {
          _block = prepend(reverse(growing$1), acc);
        } else {
          _block = prepend(growing$1, acc);
        }
        let acc$1 = _block;
        if (rest$1.hasLength(0)) {
          return prepend(toList([new$1]), acc$1);
        } else {
          let next = rest$1.head;
          let rest$2 = rest$1.tail;
          let _block$1;
          let $1 = compare4(new$1, next);
          if ($1 instanceof Lt) {
            _block$1 = new Ascending();
          } else if ($1 instanceof Eq) {
            _block$1 = new Ascending();
          } else {
            _block$1 = new Descending();
          }
          let direction$1 = _block$1;
          loop$list = rest$2;
          loop$compare = compare4;
          loop$growing = toList([new$1]);
          loop$direction = direction$1;
          loop$prev = next;
          loop$acc = acc$1;
        }
      } else if ($ instanceof Lt && direction instanceof Descending) {
        let _block;
        if (direction instanceof Ascending) {
          _block = prepend(reverse(growing$1), acc);
        } else {
          _block = prepend(growing$1, acc);
        }
        let acc$1 = _block;
        if (rest$1.hasLength(0)) {
          return prepend(toList([new$1]), acc$1);
        } else {
          let next = rest$1.head;
          let rest$2 = rest$1.tail;
          let _block$1;
          let $1 = compare4(new$1, next);
          if ($1 instanceof Lt) {
            _block$1 = new Ascending();
          } else if ($1 instanceof Eq) {
            _block$1 = new Ascending();
          } else {
            _block$1 = new Descending();
          }
          let direction$1 = _block$1;
          loop$list = rest$2;
          loop$compare = compare4;
          loop$growing = toList([new$1]);
          loop$direction = direction$1;
          loop$prev = next;
          loop$acc = acc$1;
        }
      } else {
        let _block;
        if (direction instanceof Ascending) {
          _block = prepend(reverse(growing$1), acc);
        } else {
          _block = prepend(growing$1, acc);
        }
        let acc$1 = _block;
        if (rest$1.hasLength(0)) {
          return prepend(toList([new$1]), acc$1);
        } else {
          let next = rest$1.head;
          let rest$2 = rest$1.tail;
          let _block$1;
          let $1 = compare4(new$1, next);
          if ($1 instanceof Lt) {
            _block$1 = new Ascending();
          } else if ($1 instanceof Eq) {
            _block$1 = new Ascending();
          } else {
            _block$1 = new Descending();
          }
          let direction$1 = _block$1;
          loop$list = rest$2;
          loop$compare = compare4;
          loop$growing = toList([new$1]);
          loop$direction = direction$1;
          loop$prev = next;
          loop$acc = acc$1;
        }
      }
    }
  }
}
function merge_ascendings(loop$list1, loop$list2, loop$compare, loop$acc) {
  while (true) {
    let list1 = loop$list1;
    let list22 = loop$list2;
    let compare4 = loop$compare;
    let acc = loop$acc;
    if (list1.hasLength(0)) {
      let list4 = list22;
      return reverse_and_prepend(list4, acc);
    } else if (list22.hasLength(0)) {
      let list4 = list1;
      return reverse_and_prepend(list4, acc);
    } else {
      let first1 = list1.head;
      let rest1 = list1.tail;
      let first2 = list22.head;
      let rest2 = list22.tail;
      let $ = compare4(first1, first2);
      if ($ instanceof Lt) {
        loop$list1 = rest1;
        loop$list2 = list22;
        loop$compare = compare4;
        loop$acc = prepend(first1, acc);
      } else if ($ instanceof Gt) {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare4;
        loop$acc = prepend(first2, acc);
      } else {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare4;
        loop$acc = prepend(first2, acc);
      }
    }
  }
}
function merge_ascending_pairs(loop$sequences, loop$compare, loop$acc) {
  while (true) {
    let sequences2 = loop$sequences;
    let compare4 = loop$compare;
    let acc = loop$acc;
    if (sequences2.hasLength(0)) {
      return reverse(acc);
    } else if (sequences2.hasLength(1)) {
      let sequence = sequences2.head;
      return reverse(prepend(reverse(sequence), acc));
    } else {
      let ascending1 = sequences2.head;
      let ascending2 = sequences2.tail.head;
      let rest$1 = sequences2.tail.tail;
      let descending = merge_ascendings(
        ascending1,
        ascending2,
        compare4,
        toList([])
      );
      loop$sequences = rest$1;
      loop$compare = compare4;
      loop$acc = prepend(descending, acc);
    }
  }
}
function merge_descendings(loop$list1, loop$list2, loop$compare, loop$acc) {
  while (true) {
    let list1 = loop$list1;
    let list22 = loop$list2;
    let compare4 = loop$compare;
    let acc = loop$acc;
    if (list1.hasLength(0)) {
      let list4 = list22;
      return reverse_and_prepend(list4, acc);
    } else if (list22.hasLength(0)) {
      let list4 = list1;
      return reverse_and_prepend(list4, acc);
    } else {
      let first1 = list1.head;
      let rest1 = list1.tail;
      let first2 = list22.head;
      let rest2 = list22.tail;
      let $ = compare4(first1, first2);
      if ($ instanceof Lt) {
        loop$list1 = list1;
        loop$list2 = rest2;
        loop$compare = compare4;
        loop$acc = prepend(first2, acc);
      } else if ($ instanceof Gt) {
        loop$list1 = rest1;
        loop$list2 = list22;
        loop$compare = compare4;
        loop$acc = prepend(first1, acc);
      } else {
        loop$list1 = rest1;
        loop$list2 = list22;
        loop$compare = compare4;
        loop$acc = prepend(first1, acc);
      }
    }
  }
}
function merge_descending_pairs(loop$sequences, loop$compare, loop$acc) {
  while (true) {
    let sequences2 = loop$sequences;
    let compare4 = loop$compare;
    let acc = loop$acc;
    if (sequences2.hasLength(0)) {
      return reverse(acc);
    } else if (sequences2.hasLength(1)) {
      let sequence = sequences2.head;
      return reverse(prepend(reverse(sequence), acc));
    } else {
      let descending1 = sequences2.head;
      let descending2 = sequences2.tail.head;
      let rest$1 = sequences2.tail.tail;
      let ascending = merge_descendings(
        descending1,
        descending2,
        compare4,
        toList([])
      );
      loop$sequences = rest$1;
      loop$compare = compare4;
      loop$acc = prepend(ascending, acc);
    }
  }
}
function merge_all(loop$sequences, loop$direction, loop$compare) {
  while (true) {
    let sequences2 = loop$sequences;
    let direction = loop$direction;
    let compare4 = loop$compare;
    if (sequences2.hasLength(0)) {
      return toList([]);
    } else if (sequences2.hasLength(1) && direction instanceof Ascending) {
      let sequence = sequences2.head;
      return sequence;
    } else if (sequences2.hasLength(1) && direction instanceof Descending) {
      let sequence = sequences2.head;
      return reverse(sequence);
    } else if (direction instanceof Ascending) {
      let sequences$1 = merge_ascending_pairs(sequences2, compare4, toList([]));
      loop$sequences = sequences$1;
      loop$direction = new Descending();
      loop$compare = compare4;
    } else {
      let sequences$1 = merge_descending_pairs(sequences2, compare4, toList([]));
      loop$sequences = sequences$1;
      loop$direction = new Ascending();
      loop$compare = compare4;
    }
  }
}
function sort(list4, compare4) {
  if (list4.hasLength(0)) {
    return toList([]);
  } else if (list4.hasLength(1)) {
    let x = list4.head;
    return toList([x]);
  } else {
    let x = list4.head;
    let y = list4.tail.head;
    let rest$1 = list4.tail.tail;
    let _block;
    let $ = compare4(x, y);
    if ($ instanceof Lt) {
      _block = new Ascending();
    } else if ($ instanceof Eq) {
      _block = new Ascending();
    } else {
      _block = new Descending();
    }
    let direction = _block;
    let sequences$1 = sequences(
      rest$1,
      compare4,
      toList([x]),
      direction,
      y,
      toList([])
    );
    return merge_all(sequences$1, new Ascending(), compare4);
  }
}
function reduce(list4, fun) {
  if (list4.hasLength(0)) {
    return new Error2(void 0);
  } else {
    let first$1 = list4.head;
    let rest$1 = list4.tail;
    return new Ok(fold(rest$1, first$1, fun));
  }
}

// build/dev/javascript/gleam_stdlib/gleam/string.mjs
function is_empty(str) {
  return str === "";
}
function concat_loop(loop$strings, loop$accumulator) {
  while (true) {
    let strings = loop$strings;
    let accumulator = loop$accumulator;
    if (strings.atLeastLength(1)) {
      let string5 = strings.head;
      let strings$1 = strings.tail;
      loop$strings = strings$1;
      loop$accumulator = accumulator + string5;
    } else {
      return accumulator;
    }
  }
}
function concat2(strings) {
  return concat_loop(strings, "");
}
function do_to_utf_codepoints(string5) {
  let _pipe = string5;
  let _pipe$1 = string_to_codepoint_integer_list(_pipe);
  return map(_pipe$1, codepoint);
}
function to_utf_codepoints(string5) {
  return do_to_utf_codepoints(string5);
}
function inspect2(term) {
  let _pipe = inspect(term);
  return identity(_pipe);
}

// build/dev/javascript/gleam_stdlib/gleam/dynamic/decode.mjs
var DecodeError = class extends CustomType {
  constructor(expected, found, path) {
    super();
    this.expected = expected;
    this.found = found;
    this.path = path;
  }
};
var Decoder = class extends CustomType {
  constructor(function$) {
    super();
    this.function = function$;
  }
};
function run(data, decoder) {
  let $ = decoder.function(data);
  let maybe_invalid_data = $[0];
  let errors = $[1];
  if (errors.hasLength(0)) {
    return new Ok(maybe_invalid_data);
  } else {
    return new Error2(errors);
  }
}
function success(data) {
  return new Decoder((_) => {
    return [data, toList([])];
  });
}
function map2(decoder, transformer) {
  return new Decoder(
    (d) => {
      let $ = decoder.function(d);
      let data = $[0];
      let errors = $[1];
      return [transformer(data), errors];
    }
  );
}
function run_decoders(loop$data, loop$failure, loop$decoders) {
  while (true) {
    let data = loop$data;
    let failure2 = loop$failure;
    let decoders = loop$decoders;
    if (decoders.hasLength(0)) {
      return failure2;
    } else {
      let decoder = decoders.head;
      let decoders$1 = decoders.tail;
      let $ = decoder.function(data);
      let layer = $;
      let errors = $[1];
      if (errors.hasLength(0)) {
        return layer;
      } else {
        loop$data = data;
        loop$failure = failure2;
        loop$decoders = decoders$1;
      }
    }
  }
}
function one_of(first, alternatives) {
  return new Decoder(
    (dynamic_data) => {
      let $ = first.function(dynamic_data);
      let layer = $;
      let errors = $[1];
      if (errors.hasLength(0)) {
        return layer;
      } else {
        return run_decoders(dynamic_data, layer, alternatives);
      }
    }
  );
}
function run_dynamic_function(data, name, f) {
  let $ = f(data);
  if ($.isOk()) {
    let data$1 = $[0];
    return [data$1, toList([])];
  } else {
    let zero = $[0];
    return [
      zero,
      toList([new DecodeError(name, classify_dynamic(data), toList([]))])
    ];
  }
}
function decode_int(data) {
  return run_dynamic_function(data, "Int", int);
}
var int2 = /* @__PURE__ */ new Decoder(decode_int);
function decode_string(data) {
  return run_dynamic_function(data, "String", string);
}
var string2 = /* @__PURE__ */ new Decoder(decode_string);
function push_path(layer, path) {
  let decoder = one_of(
    string2,
    toList([
      (() => {
        let _pipe = int2;
        return map2(_pipe, to_string);
      })()
    ])
  );
  let path$1 = map(
    path,
    (key) => {
      let key$1 = identity(key);
      let $ = run(key$1, decoder);
      if ($.isOk()) {
        let key$2 = $[0];
        return key$2;
      } else {
        return "<" + classify_dynamic(key$1) + ">";
      }
    }
  );
  let errors = map(
    layer[1],
    (error2) => {
      let _record = error2;
      return new DecodeError(
        _record.expected,
        _record.found,
        append(path$1, error2.path)
      );
    }
  );
  return [layer[0], errors];
}
function index3(loop$path, loop$position, loop$inner, loop$data, loop$handle_miss) {
  while (true) {
    let path = loop$path;
    let position = loop$position;
    let inner = loop$inner;
    let data = loop$data;
    let handle_miss = loop$handle_miss;
    if (path.hasLength(0)) {
      let _pipe = inner(data);
      return push_path(_pipe, reverse(position));
    } else {
      let key = path.head;
      let path$1 = path.tail;
      let $ = index2(data, key);
      if ($.isOk() && $[0] instanceof Some) {
        let data$1 = $[0][0];
        loop$path = path$1;
        loop$position = prepend(key, position);
        loop$inner = inner;
        loop$data = data$1;
        loop$handle_miss = handle_miss;
      } else if ($.isOk() && $[0] instanceof None) {
        return handle_miss(data, prepend(key, position));
      } else {
        let kind = $[0];
        let $1 = inner(data);
        let default$ = $1[0];
        let _pipe = [
          default$,
          toList([new DecodeError(kind, classify_dynamic(data), toList([]))])
        ];
        return push_path(_pipe, reverse(position));
      }
    }
  }
}
function subfield(field_path, field_decoder, next) {
  return new Decoder(
    (data) => {
      let $ = index3(
        field_path,
        toList([]),
        field_decoder.function,
        data,
        (data2, position) => {
          let $12 = field_decoder.function(data2);
          let default$ = $12[0];
          let _pipe = [
            default$,
            toList([new DecodeError("Field", "Nothing", toList([]))])
          ];
          return push_path(_pipe, reverse(position));
        }
      );
      let out = $[0];
      let errors1 = $[1];
      let $1 = next(out).function(data);
      let out$1 = $1[0];
      let errors2 = $1[1];
      return [out$1, append(errors1, errors2)];
    }
  );
}

// build/dev/javascript/gleam_stdlib/gleam_stdlib.mjs
var Nil = void 0;
var NOT_FOUND = {};
function identity(x) {
  return x;
}
function parse_int(value) {
  if (/^[-+]?(\d+)$/.test(value)) {
    return new Ok(parseInt(value));
  } else {
    return new Error2(Nil);
  }
}
function parse_float(value) {
  if (/^[-+]?(\d+)\.(\d+)([eE][-+]?\d+)?$/.test(value)) {
    return new Ok(parseFloat(value));
  } else {
    return new Error2(Nil);
  }
}
function to_string(term) {
  return term.toString();
}
function float_to_string(float2) {
  const string5 = float2.toString().replace("+", "");
  if (string5.indexOf(".") >= 0) {
    return string5;
  } else {
    const index5 = string5.indexOf("e");
    if (index5 >= 0) {
      return string5.slice(0, index5) + ".0" + string5.slice(index5);
    } else {
      return string5 + ".0";
    }
  }
}
function lowercase(string5) {
  return string5.toLowerCase();
}
function starts_with(haystack, needle) {
  return haystack.startsWith(needle);
}
var unicode_whitespaces = [
  " ",
  // Space
  "	",
  // Horizontal tab
  "\n",
  // Line feed
  "\v",
  // Vertical tab
  "\f",
  // Form feed
  "\r",
  // Carriage return
  "\x85",
  // Next line
  "\u2028",
  // Line separator
  "\u2029"
  // Paragraph separator
].join("");
var trim_start_regex = /* @__PURE__ */ new RegExp(
  `^[${unicode_whitespaces}]*`
);
var trim_end_regex = /* @__PURE__ */ new RegExp(`[${unicode_whitespaces}]*$`);
function bit_array_from_string(string5) {
  return toBitArray([stringBits(string5)]);
}
function round(float2) {
  return Math.round(float2);
}
function power(base, exponent) {
  return Math.pow(base, exponent);
}
function codepoint(int5) {
  return new UtfCodepoint(int5);
}
function string_to_codepoint_integer_list(string5) {
  return List.fromArray(Array.from(string5).map((item) => item.codePointAt(0)));
}
function utf_codepoint_to_int(utf_codepoint) {
  return utf_codepoint.value;
}
function new_map() {
  return Dict.new();
}
function map_remove(key, map6) {
  return map6.delete(key);
}
function map_get(map6, key) {
  const value = map6.get(key, NOT_FOUND);
  if (value === NOT_FOUND) {
    return new Error2(Nil);
  }
  return new Ok(value);
}
function map_insert(key, value, map6) {
  return map6.set(key, value);
}
function classify_dynamic(data) {
  if (typeof data === "string") {
    return "String";
  } else if (typeof data === "boolean") {
    return "Bool";
  } else if (data instanceof Result) {
    return "Result";
  } else if (data instanceof List) {
    return "List";
  } else if (data instanceof BitArray) {
    return "BitArray";
  } else if (data instanceof Dict) {
    return "Dict";
  } else if (Number.isInteger(data)) {
    return "Int";
  } else if (Array.isArray(data)) {
    return `Array`;
  } else if (typeof data === "number") {
    return "Float";
  } else if (data === null) {
    return "Nil";
  } else if (data === void 0) {
    return "Nil";
  } else {
    const type = typeof data;
    return type.charAt(0).toUpperCase() + type.slice(1);
  }
}
function bitwise_and(x, y) {
  return Number(BigInt(x) & BigInt(y));
}
function bitwise_or(x, y) {
  return Number(BigInt(x) | BigInt(y));
}
function bitwise_shift_left(x, y) {
  return Number(BigInt(x) << BigInt(y));
}
function bitwise_shift_right(x, y) {
  return Number(BigInt(x) >> BigInt(y));
}
function inspect(v) {
  const t = typeof v;
  if (v === true) return "True";
  if (v === false) return "False";
  if (v === null) return "//js(null)";
  if (v === void 0) return "Nil";
  if (t === "string") return inspectString(v);
  if (t === "bigint" || Number.isInteger(v)) return v.toString();
  if (t === "number") return float_to_string(v);
  if (Array.isArray(v)) return `#(${v.map(inspect).join(", ")})`;
  if (v instanceof List) return inspectList(v);
  if (v instanceof UtfCodepoint) return inspectUtfCodepoint(v);
  if (v instanceof BitArray) return `<<${bit_array_inspect(v, "")}>>`;
  if (v instanceof CustomType) return inspectCustomType(v);
  if (v instanceof Dict) return inspectDict(v);
  if (v instanceof Set) return `//js(Set(${[...v].map(inspect).join(", ")}))`;
  if (v instanceof RegExp) return `//js(${v})`;
  if (v instanceof Date) return `//js(Date("${v.toISOString()}"))`;
  if (v instanceof Function) {
    const args = [];
    for (const i of Array(v.length).keys())
      args.push(String.fromCharCode(i + 97));
    return `//fn(${args.join(", ")}) { ... }`;
  }
  return inspectObject(v);
}
function inspectString(str) {
  let new_str = '"';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    switch (char) {
      case "\n":
        new_str += "\\n";
        break;
      case "\r":
        new_str += "\\r";
        break;
      case "	":
        new_str += "\\t";
        break;
      case "\f":
        new_str += "\\f";
        break;
      case "\\":
        new_str += "\\\\";
        break;
      case '"':
        new_str += '\\"';
        break;
      default:
        if (char < " " || char > "~" && char < "\xA0") {
          new_str += "\\u{" + char.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0") + "}";
        } else {
          new_str += char;
        }
    }
  }
  new_str += '"';
  return new_str;
}
function inspectDict(map6) {
  let body = "dict.from_list([";
  let first = true;
  map6.forEach((value, key) => {
    if (!first) body = body + ", ";
    body = body + "#(" + inspect(key) + ", " + inspect(value) + ")";
    first = false;
  });
  return body + "])";
}
function inspectObject(v) {
  const name = Object.getPrototypeOf(v)?.constructor?.name || "Object";
  const props = [];
  for (const k of Object.keys(v)) {
    props.push(`${inspect(k)}: ${inspect(v[k])}`);
  }
  const body = props.length ? " " + props.join(", ") + " " : "";
  const head = name === "Object" ? "" : name + " ";
  return `//js(${head}{${body}})`;
}
function inspectCustomType(record) {
  const props = Object.keys(record).map((label) => {
    const value = inspect(record[label]);
    return isNaN(parseInt(label)) ? `${label}: ${value}` : value;
  }).join(", ");
  return props ? `${record.constructor.name}(${props})` : record.constructor.name;
}
function inspectList(list4) {
  return `[${list4.toArray().map(inspect).join(", ")}]`;
}
function inspectUtfCodepoint(codepoint2) {
  return `//utfcodepoint(${String.fromCodePoint(codepoint2.value)})`;
}
function bit_array_inspect(bits, acc) {
  if (bits.bitSize === 0) {
    return acc;
  }
  for (let i = 0; i < bits.byteSize - 1; i++) {
    acc += bits.byteAt(i).toString();
    acc += ", ";
  }
  if (bits.byteSize * 8 === bits.bitSize) {
    acc += bits.byteAt(bits.byteSize - 1).toString();
  } else {
    const trailingBitsCount = bits.bitSize % 8;
    acc += bits.byteAt(bits.byteSize - 1) >> 8 - trailingBitsCount;
    acc += `:size(${trailingBitsCount})`;
  }
  return acc;
}
function index2(data, key) {
  if (data instanceof Dict || data instanceof WeakMap || data instanceof Map) {
    const token2 = {};
    const entry = data.get(key, token2);
    if (entry === token2) return new Ok(new None());
    return new Ok(new Some(entry));
  }
  const key_is_int = Number.isInteger(key);
  if (key_is_int && key >= 0 && key < 8 && data instanceof List) {
    let i = 0;
    for (const value of data) {
      if (i === key) return new Ok(new Some(value));
      i++;
    }
    return new Error2("Indexable");
  }
  if (key_is_int && Array.isArray(data) || data && typeof data === "object" || data && Object.getPrototypeOf(data) === Object.prototype) {
    if (key in data) return new Ok(new Some(data[key]));
    return new Ok(new None());
  }
  return new Error2(key_is_int ? "Indexable" : "Dict");
}
function int(data) {
  if (Number.isInteger(data)) return new Ok(data);
  return new Error2(0);
}
function string(data) {
  if (typeof data === "string") return new Ok(data);
  return new Error2("");
}

// build/dev/javascript/gleam_stdlib/gleam/dict.mjs
function insert(dict2, key, value) {
  return map_insert(key, value, dict2);
}
function delete$(dict2, key) {
  return map_remove(key, dict2);
}

// build/dev/javascript/gleam_javascript/gleam_javascript_ffi.mjs
var PromiseLayer = class _PromiseLayer {
  constructor(promise) {
    this.promise = promise;
  }
  static wrap(value) {
    return value instanceof Promise ? new _PromiseLayer(value) : value;
  }
  static unwrap(value) {
    return value instanceof _PromiseLayer ? value.promise : value;
  }
};
function map_promise(promise, fn) {
  return promise.then(
    (value) => PromiseLayer.wrap(fn(PromiseLayer.unwrap(value)))
  );
}

// build/dev/javascript/gleam_javascript/gleam/javascript/promise.mjs
function tap(promise, callback) {
  let _pipe = promise;
  return map_promise(
    _pipe,
    (a) => {
      callback(a);
      return a;
    }
  );
}

// build/dev/javascript/gleam_stdlib/gleam/bool.mjs
function guard(requirement, consequence, alternative) {
  if (requirement) {
    return consequence;
  } else {
    return alternative();
  }
}
function lazy_guard(requirement, consequence, alternative) {
  if (requirement) {
    return consequence();
  } else {
    return alternative();
  }
}

// build/dev/javascript/gleam_stdlib/gleam/function.mjs
function identity2(x) {
  return x;
}

// build/dev/javascript/gleam_stdlib/gleam/result.mjs
function is_ok(result) {
  if (!result.isOk()) {
    return false;
  } else {
    return true;
  }
}
function map4(result, fun) {
  if (result.isOk()) {
    let x = result[0];
    return new Ok(fun(x));
  } else {
    let e = result[0];
    return new Error2(e);
  }
}
function try$(result, fun) {
  if (result.isOk()) {
    let x = result[0];
    return fun(x);
  } else {
    let e = result[0];
    return new Error2(e);
  }
}
function then$(result, fun) {
  return try$(result, fun);
}
function unwrap(result, default$) {
  if (result.isOk()) {
    let v = result[0];
    return v;
  } else {
    return default$;
  }
}
function or(first, second) {
  if (first.isOk()) {
    return first;
  } else {
    return second;
  }
}
function replace_error(result, error2) {
  if (result.isOk()) {
    let x = result[0];
    return new Ok(x);
  } else {
    return new Error2(error2);
  }
}

// build/dev/javascript/gleam_stdlib/gleam/set.mjs
var Set2 = class extends CustomType {
  constructor(dict2) {
    super();
    this.dict = dict2;
  }
};
function new$() {
  return new Set2(new_map());
}
function contains(set, member) {
  let _pipe = set.dict;
  let _pipe$1 = map_get(_pipe, member);
  return is_ok(_pipe$1);
}
var token = void 0;
function insert2(set, member) {
  return new Set2(insert(set.dict, member, token));
}

// build/dev/javascript/lustre/lustre/internals/constants.ffi.mjs
var EMPTY_DICT = /* @__PURE__ */ Dict.new();
function empty_dict() {
  return EMPTY_DICT;
}
var EMPTY_SET = /* @__PURE__ */ new$();
function empty_set() {
  return EMPTY_SET;
}
var document2 = globalThis?.document;
var NAMESPACE_HTML = "http://www.w3.org/1999/xhtml";
var ELEMENT_NODE = 1;
var TEXT_NODE = 3;
var DOCUMENT_FRAGMENT_NODE = 11;
var SUPPORTS_MOVE_BEFORE = !!globalThis.HTMLElement?.prototype?.moveBefore;

// build/dev/javascript/lustre/lustre/internals/constants.mjs
var empty_list = /* @__PURE__ */ toList([]);
var option_none = /* @__PURE__ */ new None();

// build/dev/javascript/lustre/lustre/vdom/vattr.ffi.mjs
var GT = /* @__PURE__ */ new Gt();
var LT = /* @__PURE__ */ new Lt();
var EQ = /* @__PURE__ */ new Eq();
function compare3(a, b) {
  if (a.name === b.name) {
    return EQ;
  } else if (a.name < b.name) {
    return LT;
  } else {
    return GT;
  }
}

// build/dev/javascript/lustre/lustre/vdom/vattr.mjs
var Attribute = class extends CustomType {
  constructor(kind, name, value) {
    super();
    this.kind = kind;
    this.name = name;
    this.value = value;
  }
};
var Property = class extends CustomType {
  constructor(kind, name, value) {
    super();
    this.kind = kind;
    this.name = name;
    this.value = value;
  }
};
var Event2 = class extends CustomType {
  constructor(kind, name, handler, include, prevent_default, stop_propagation, immediate2, debounce, throttle) {
    super();
    this.kind = kind;
    this.name = name;
    this.handler = handler;
    this.include = include;
    this.prevent_default = prevent_default;
    this.stop_propagation = stop_propagation;
    this.immediate = immediate2;
    this.debounce = debounce;
    this.throttle = throttle;
  }
};
function merge(loop$attributes, loop$merged) {
  while (true) {
    let attributes = loop$attributes;
    let merged = loop$merged;
    if (attributes.hasLength(0)) {
      return merged;
    } else if (attributes.atLeastLength(1) && attributes.head instanceof Attribute && attributes.head.name === "") {
      let rest = attributes.tail;
      loop$attributes = rest;
      loop$merged = merged;
    } else if (attributes.atLeastLength(1) && attributes.head instanceof Attribute && attributes.head.name === "class" && attributes.head.value === "") {
      let rest = attributes.tail;
      loop$attributes = rest;
      loop$merged = merged;
    } else if (attributes.atLeastLength(1) && attributes.head instanceof Attribute && attributes.head.name === "style" && attributes.head.value === "") {
      let rest = attributes.tail;
      loop$attributes = rest;
      loop$merged = merged;
    } else if (attributes.atLeastLength(2) && attributes.head instanceof Attribute && attributes.head.name === "class" && attributes.tail.head instanceof Attribute && attributes.tail.head.name === "class") {
      let kind = attributes.head.kind;
      let class1 = attributes.head.value;
      let class2 = attributes.tail.head.value;
      let rest = attributes.tail.tail;
      let value = class1 + " " + class2;
      let attribute$1 = new Attribute(kind, "class", value);
      loop$attributes = prepend(attribute$1, rest);
      loop$merged = merged;
    } else if (attributes.atLeastLength(2) && attributes.head instanceof Attribute && attributes.head.name === "style" && attributes.tail.head instanceof Attribute && attributes.tail.head.name === "style") {
      let kind = attributes.head.kind;
      let style1 = attributes.head.value;
      let style2 = attributes.tail.head.value;
      let rest = attributes.tail.tail;
      let value = style1 + ";" + style2;
      let attribute$1 = new Attribute(kind, "style", value);
      loop$attributes = prepend(attribute$1, rest);
      loop$merged = merged;
    } else {
      let attribute$1 = attributes.head;
      let rest = attributes.tail;
      loop$attributes = rest;
      loop$merged = prepend(attribute$1, merged);
    }
  }
}
function prepare(attributes) {
  if (attributes.hasLength(0)) {
    return attributes;
  } else if (attributes.hasLength(1)) {
    return attributes;
  } else {
    let _pipe = attributes;
    let _pipe$1 = sort(_pipe, (a, b) => {
      return compare3(b, a);
    });
    return merge(_pipe$1, empty_list);
  }
}
var attribute_kind = 0;
function attribute(name, value) {
  return new Attribute(attribute_kind, name, value);
}
var property_kind = 1;
var event_kind = 2;
function event(name, handler, include, prevent_default, stop_propagation, immediate2, debounce, throttle) {
  return new Event2(
    event_kind,
    name,
    handler,
    include,
    prevent_default,
    stop_propagation,
    immediate2,
    debounce,
    throttle
  );
}

// build/dev/javascript/lustre/lustre/attribute.mjs
function attribute2(name, value) {
  return attribute(name, value);
}
function class$(name) {
  return attribute2("class", name);
}
function do_classes(loop$names, loop$class) {
  while (true) {
    let names = loop$names;
    let class$2 = loop$class;
    if (names.hasLength(0)) {
      return class$2;
    } else if (names.atLeastLength(1) && names.head[1]) {
      let name$1 = names.head[0];
      let rest = names.tail;
      return class$2 + name$1 + " " + do_classes(rest, class$2);
    } else {
      let rest = names.tail;
      loop$names = rest;
      loop$class = class$2;
    }
  }
}
function classes(names) {
  return class$(do_classes(names, ""));
}
function id(value) {
  return attribute2("id", value);
}
function type_(control_type) {
  return attribute2("type", control_type);
}

// build/dev/javascript/lustre/lustre/effect.mjs
var Effect = class extends CustomType {
  constructor(synchronous, before_paint2, after_paint) {
    super();
    this.synchronous = synchronous;
    this.before_paint = before_paint2;
    this.after_paint = after_paint;
  }
};
var empty = /* @__PURE__ */ new Effect(
  /* @__PURE__ */ toList([]),
  /* @__PURE__ */ toList([]),
  /* @__PURE__ */ toList([])
);
function none() {
  return empty;
}
function from(effect) {
  let task = (actions) => {
    let dispatch = actions.dispatch;
    return effect(dispatch);
  };
  let _record = empty;
  return new Effect(toList([task]), _record.before_paint, _record.after_paint);
}

// build/dev/javascript/lustre/lustre/internals/mutable_map.ffi.mjs
function empty2() {
  return null;
}
function get(map6, key) {
  const value = map6?.get(key);
  if (value != null) {
    return new Ok(value);
  } else {
    return new Error2(void 0);
  }
}
function insert3(map6, key, value) {
  map6 ??= /* @__PURE__ */ new Map();
  map6.set(key, value);
  return map6;
}
function remove(map6, key) {
  map6?.delete(key);
  return map6;
}

// build/dev/javascript/lustre/lustre/vdom/path.mjs
var Root = class extends CustomType {
};
var Key = class extends CustomType {
  constructor(key, parent) {
    super();
    this.key = key;
    this.parent = parent;
  }
};
var Index = class extends CustomType {
  constructor(index5, parent) {
    super();
    this.index = index5;
    this.parent = parent;
  }
};
function do_matches(loop$path, loop$candidates) {
  while (true) {
    let path = loop$path;
    let candidates = loop$candidates;
    if (candidates.hasLength(0)) {
      return false;
    } else {
      let candidate = candidates.head;
      let rest = candidates.tail;
      let $ = starts_with(path, candidate);
      if ($) {
        return true;
      } else {
        loop$path = path;
        loop$candidates = rest;
      }
    }
  }
}
function add2(parent, index5, key) {
  if (key === "") {
    return new Index(index5, parent);
  } else {
    return new Key(key, parent);
  }
}
var root2 = /* @__PURE__ */ new Root();
var separator_index = "\n";
var separator_key = "	";
function do_to_string(loop$path, loop$acc) {
  while (true) {
    let path = loop$path;
    let acc = loop$acc;
    if (path instanceof Root) {
      if (acc.hasLength(0)) {
        return "";
      } else {
        let segments = acc.tail;
        return concat2(segments);
      }
    } else if (path instanceof Key) {
      let key = path.key;
      let parent = path.parent;
      loop$path = parent;
      loop$acc = prepend(separator_key, prepend(key, acc));
    } else {
      let index5 = path.index;
      let parent = path.parent;
      loop$path = parent;
      loop$acc = prepend(
        separator_index,
        prepend(to_string(index5), acc)
      );
    }
  }
}
function to_string2(path) {
  return do_to_string(path, toList([]));
}
function matches(path, candidates) {
  if (candidates.hasLength(0)) {
    return false;
  } else {
    return do_matches(to_string2(path), candidates);
  }
}
var separator_event = "\f";
function event2(path, event4) {
  return do_to_string(path, toList([separator_event, event4]));
}

// build/dev/javascript/lustre/lustre/vdom/vnode.mjs
var Fragment = class extends CustomType {
  constructor(kind, key, mapper, children, keyed_children, children_count) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.children = children;
    this.keyed_children = keyed_children;
    this.children_count = children_count;
  }
};
var Element = class extends CustomType {
  constructor(kind, key, mapper, namespace, tag, attributes, children, keyed_children, self_closing, void$) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.namespace = namespace;
    this.tag = tag;
    this.attributes = attributes;
    this.children = children;
    this.keyed_children = keyed_children;
    this.self_closing = self_closing;
    this.void = void$;
  }
};
var Text = class extends CustomType {
  constructor(kind, key, mapper, content) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.content = content;
  }
};
var UnsafeInnerHtml = class extends CustomType {
  constructor(kind, key, mapper, namespace, tag, attributes, inner_html) {
    super();
    this.kind = kind;
    this.key = key;
    this.mapper = mapper;
    this.namespace = namespace;
    this.tag = tag;
    this.attributes = attributes;
    this.inner_html = inner_html;
  }
};
function is_void_element(tag, namespace) {
  if (namespace === "") {
    if (tag === "area") {
      return true;
    } else if (tag === "base") {
      return true;
    } else if (tag === "br") {
      return true;
    } else if (tag === "col") {
      return true;
    } else if (tag === "embed") {
      return true;
    } else if (tag === "hr") {
      return true;
    } else if (tag === "img") {
      return true;
    } else if (tag === "input") {
      return true;
    } else if (tag === "link") {
      return true;
    } else if (tag === "meta") {
      return true;
    } else if (tag === "param") {
      return true;
    } else if (tag === "source") {
      return true;
    } else if (tag === "track") {
      return true;
    } else if (tag === "wbr") {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
}
function advance(node) {
  if (node instanceof Fragment) {
    let children_count = node.children_count;
    return 1 + children_count;
  } else {
    return 1;
  }
}
var fragment_kind = 0;
function fragment(key, mapper, children, keyed_children, children_count) {
  return new Fragment(
    fragment_kind,
    key,
    mapper,
    children,
    keyed_children,
    children_count
  );
}
var element_kind = 1;
function element(key, mapper, namespace, tag, attributes, children, keyed_children, self_closing, void$) {
  return new Element(
    element_kind,
    key,
    mapper,
    namespace,
    tag,
    prepare(attributes),
    children,
    keyed_children,
    self_closing,
    void$ || is_void_element(tag, namespace)
  );
}
var text_kind = 2;
function text(key, mapper, content) {
  return new Text(text_kind, key, mapper, content);
}
var unsafe_inner_html_kind = 3;
function set_fragment_key(loop$key, loop$children, loop$index, loop$new_children, loop$keyed_children) {
  while (true) {
    let key = loop$key;
    let children = loop$children;
    let index5 = loop$index;
    let new_children = loop$new_children;
    let keyed_children = loop$keyed_children;
    if (children.hasLength(0)) {
      return [reverse(new_children), keyed_children];
    } else if (children.atLeastLength(1) && children.head instanceof Fragment && children.head.key === "") {
      let node = children.head;
      let children$1 = children.tail;
      let child_key = key + "::" + to_string(index5);
      let $ = set_fragment_key(
        child_key,
        node.children,
        0,
        empty_list,
        empty2()
      );
      let node_children = $[0];
      let node_keyed_children = $[1];
      let _block;
      let _record = node;
      _block = new Fragment(
        _record.kind,
        _record.key,
        _record.mapper,
        node_children,
        node_keyed_children,
        _record.children_count
      );
      let new_node = _block;
      let new_children$1 = prepend(new_node, new_children);
      let index$1 = index5 + 1;
      loop$key = key;
      loop$children = children$1;
      loop$index = index$1;
      loop$new_children = new_children$1;
      loop$keyed_children = keyed_children;
    } else if (children.atLeastLength(1) && children.head.key !== "") {
      let node = children.head;
      let children$1 = children.tail;
      let child_key = key + "::" + node.key;
      let keyed_node = to_keyed(child_key, node);
      let new_children$1 = prepend(keyed_node, new_children);
      let keyed_children$1 = insert3(
        keyed_children,
        child_key,
        keyed_node
      );
      let index$1 = index5 + 1;
      loop$key = key;
      loop$children = children$1;
      loop$index = index$1;
      loop$new_children = new_children$1;
      loop$keyed_children = keyed_children$1;
    } else {
      let node = children.head;
      let children$1 = children.tail;
      let new_children$1 = prepend(node, new_children);
      let index$1 = index5 + 1;
      loop$key = key;
      loop$children = children$1;
      loop$index = index$1;
      loop$new_children = new_children$1;
      loop$keyed_children = keyed_children;
    }
  }
}
function to_keyed(key, node) {
  if (node instanceof Element) {
    let _record = node;
    return new Element(
      _record.kind,
      key,
      _record.mapper,
      _record.namespace,
      _record.tag,
      _record.attributes,
      _record.children,
      _record.keyed_children,
      _record.self_closing,
      _record.void
    );
  } else if (node instanceof Text) {
    let _record = node;
    return new Text(_record.kind, key, _record.mapper, _record.content);
  } else if (node instanceof UnsafeInnerHtml) {
    let _record = node;
    return new UnsafeInnerHtml(
      _record.kind,
      key,
      _record.mapper,
      _record.namespace,
      _record.tag,
      _record.attributes,
      _record.inner_html
    );
  } else {
    let children = node.children;
    let $ = set_fragment_key(
      key,
      children,
      0,
      empty_list,
      empty2()
    );
    let children$1 = $[0];
    let keyed_children = $[1];
    let _record = node;
    return new Fragment(
      _record.kind,
      key,
      _record.mapper,
      children$1,
      keyed_children,
      _record.children_count
    );
  }
}

// build/dev/javascript/lustre/lustre/vdom/patch.mjs
var Patch = class extends CustomType {
  constructor(index5, removed, changes, children) {
    super();
    this.index = index5;
    this.removed = removed;
    this.changes = changes;
    this.children = children;
  }
};
var ReplaceText = class extends CustomType {
  constructor(kind, content) {
    super();
    this.kind = kind;
    this.content = content;
  }
};
var ReplaceInnerHtml = class extends CustomType {
  constructor(kind, inner_html) {
    super();
    this.kind = kind;
    this.inner_html = inner_html;
  }
};
var Update = class extends CustomType {
  constructor(kind, added, removed) {
    super();
    this.kind = kind;
    this.added = added;
    this.removed = removed;
  }
};
var Move = class extends CustomType {
  constructor(kind, key, before, count) {
    super();
    this.kind = kind;
    this.key = key;
    this.before = before;
    this.count = count;
  }
};
var RemoveKey = class extends CustomType {
  constructor(kind, key, count) {
    super();
    this.kind = kind;
    this.key = key;
    this.count = count;
  }
};
var Replace = class extends CustomType {
  constructor(kind, from2, count, with$) {
    super();
    this.kind = kind;
    this.from = from2;
    this.count = count;
    this.with = with$;
  }
};
var Insert = class extends CustomType {
  constructor(kind, children, before) {
    super();
    this.kind = kind;
    this.children = children;
    this.before = before;
  }
};
var Remove = class extends CustomType {
  constructor(kind, from2, count) {
    super();
    this.kind = kind;
    this.from = from2;
    this.count = count;
  }
};
function new$4(index5, removed, changes, children) {
  return new Patch(index5, removed, changes, children);
}
var replace_text_kind = 0;
function replace_text(content) {
  return new ReplaceText(replace_text_kind, content);
}
var replace_inner_html_kind = 1;
function replace_inner_html(inner_html) {
  return new ReplaceInnerHtml(replace_inner_html_kind, inner_html);
}
var update_kind = 2;
function update(added, removed) {
  return new Update(update_kind, added, removed);
}
var move_kind = 3;
function move(key, before, count) {
  return new Move(move_kind, key, before, count);
}
var remove_key_kind = 4;
function remove_key(key, count) {
  return new RemoveKey(remove_key_kind, key, count);
}
var replace_kind = 5;
function replace2(from2, count, with$) {
  return new Replace(replace_kind, from2, count, with$);
}
var insert_kind = 6;
function insert4(children, before) {
  return new Insert(insert_kind, children, before);
}
var remove_kind = 7;
function remove2(from2, count) {
  return new Remove(remove_kind, from2, count);
}

// build/dev/javascript/lustre/lustre/vdom/diff.mjs
var Diff = class extends CustomType {
  constructor(patch, events) {
    super();
    this.patch = patch;
    this.events = events;
  }
};
var AttributeChange = class extends CustomType {
  constructor(added, removed, events) {
    super();
    this.added = added;
    this.removed = removed;
    this.events = events;
  }
};
function is_controlled(events, namespace, tag, path) {
  if (tag === "input" && namespace === "") {
    return has_dispatched_events(events, path);
  } else if (tag === "select" && namespace === "") {
    return has_dispatched_events(events, path);
  } else if (tag === "textarea" && namespace === "") {
    return has_dispatched_events(events, path);
  } else {
    return false;
  }
}
function diff_attributes(loop$controlled, loop$path, loop$mapper, loop$events, loop$old, loop$new, loop$added, loop$removed) {
  while (true) {
    let controlled = loop$controlled;
    let path = loop$path;
    let mapper = loop$mapper;
    let events = loop$events;
    let old = loop$old;
    let new$8 = loop$new;
    let added = loop$added;
    let removed = loop$removed;
    if (old.hasLength(0) && new$8.hasLength(0)) {
      return new AttributeChange(added, removed, events);
    } else if (old.atLeastLength(1) && old.head instanceof Event2 && new$8.hasLength(0)) {
      let prev = old.head;
      let name = old.head.name;
      let old$1 = old.tail;
      let removed$1 = prepend(prev, removed);
      let events$1 = remove_event(events, path, name);
      loop$controlled = controlled;
      loop$path = path;
      loop$mapper = mapper;
      loop$events = events$1;
      loop$old = old$1;
      loop$new = new$8;
      loop$added = added;
      loop$removed = removed$1;
    } else if (old.atLeastLength(1) && new$8.hasLength(0)) {
      let prev = old.head;
      let old$1 = old.tail;
      let removed$1 = prepend(prev, removed);
      loop$controlled = controlled;
      loop$path = path;
      loop$mapper = mapper;
      loop$events = events;
      loop$old = old$1;
      loop$new = new$8;
      loop$added = added;
      loop$removed = removed$1;
    } else if (old.hasLength(0) && new$8.atLeastLength(1) && new$8.head instanceof Event2) {
      let next = new$8.head;
      let name = new$8.head.name;
      let handler = new$8.head.handler;
      let new$1 = new$8.tail;
      let added$1 = prepend(next, added);
      let events$1 = add_event(events, mapper, path, name, handler);
      loop$controlled = controlled;
      loop$path = path;
      loop$mapper = mapper;
      loop$events = events$1;
      loop$old = old;
      loop$new = new$1;
      loop$added = added$1;
      loop$removed = removed;
    } else if (old.hasLength(0) && new$8.atLeastLength(1)) {
      let next = new$8.head;
      let new$1 = new$8.tail;
      let added$1 = prepend(next, added);
      loop$controlled = controlled;
      loop$path = path;
      loop$mapper = mapper;
      loop$events = events;
      loop$old = old;
      loop$new = new$1;
      loop$added = added$1;
      loop$removed = removed;
    } else {
      let prev = old.head;
      let remaining_old = old.tail;
      let next = new$8.head;
      let remaining_new = new$8.tail;
      let $ = compare3(prev, next);
      if (prev instanceof Attribute && $ instanceof Eq && next instanceof Attribute) {
        let _block;
        let $1 = next.name;
        if ($1 === "value") {
          _block = controlled || prev.value !== next.value;
        } else if ($1 === "checked") {
          _block = controlled || prev.value !== next.value;
        } else if ($1 === "selected") {
          _block = controlled || prev.value !== next.value;
        } else {
          _block = prev.value !== next.value;
        }
        let has_changes = _block;
        let _block$1;
        if (has_changes) {
          _block$1 = prepend(next, added);
        } else {
          _block$1 = added;
        }
        let added$1 = _block$1;
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events;
        loop$old = remaining_old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed;
      } else if (prev instanceof Property && $ instanceof Eq && next instanceof Property) {
        let _block;
        let $1 = next.name;
        if ($1 === "scrollLeft") {
          _block = true;
        } else if ($1 === "scrollRight") {
          _block = true;
        } else if ($1 === "value") {
          _block = controlled || !isEqual(prev.value, next.value);
        } else if ($1 === "checked") {
          _block = controlled || !isEqual(prev.value, next.value);
        } else if ($1 === "selected") {
          _block = controlled || !isEqual(prev.value, next.value);
        } else {
          _block = !isEqual(prev.value, next.value);
        }
        let has_changes = _block;
        let _block$1;
        if (has_changes) {
          _block$1 = prepend(next, added);
        } else {
          _block$1 = added;
        }
        let added$1 = _block$1;
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events;
        loop$old = remaining_old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed;
      } else if (prev instanceof Event2 && $ instanceof Eq && next instanceof Event2) {
        let name = next.name;
        let handler = next.handler;
        let has_changes = prev.prevent_default !== next.prevent_default || prev.stop_propagation !== next.stop_propagation || prev.immediate !== next.immediate || prev.debounce !== next.debounce || prev.throttle !== next.throttle;
        let _block;
        if (has_changes) {
          _block = prepend(next, added);
        } else {
          _block = added;
        }
        let added$1 = _block;
        let events$1 = add_event(events, mapper, path, name, handler);
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events$1;
        loop$old = remaining_old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed;
      } else if (prev instanceof Event2 && $ instanceof Eq) {
        let name = prev.name;
        let added$1 = prepend(next, added);
        let removed$1 = prepend(prev, removed);
        let events$1 = remove_event(events, path, name);
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events$1;
        loop$old = remaining_old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed$1;
      } else if ($ instanceof Eq && next instanceof Event2) {
        let name = next.name;
        let handler = next.handler;
        let added$1 = prepend(next, added);
        let removed$1 = prepend(prev, removed);
        let events$1 = add_event(events, mapper, path, name, handler);
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events$1;
        loop$old = remaining_old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed$1;
      } else if ($ instanceof Eq) {
        let added$1 = prepend(next, added);
        let removed$1 = prepend(prev, removed);
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events;
        loop$old = remaining_old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed$1;
      } else if ($ instanceof Gt && next instanceof Event2) {
        let name = next.name;
        let handler = next.handler;
        let added$1 = prepend(next, added);
        let events$1 = add_event(events, mapper, path, name, handler);
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events$1;
        loop$old = old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed;
      } else if ($ instanceof Gt) {
        let added$1 = prepend(next, added);
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events;
        loop$old = old;
        loop$new = remaining_new;
        loop$added = added$1;
        loop$removed = removed;
      } else if (prev instanceof Event2 && $ instanceof Lt) {
        let name = prev.name;
        let removed$1 = prepend(prev, removed);
        let events$1 = remove_event(events, path, name);
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events$1;
        loop$old = remaining_old;
        loop$new = new$8;
        loop$added = added;
        loop$removed = removed$1;
      } else {
        let removed$1 = prepend(prev, removed);
        loop$controlled = controlled;
        loop$path = path;
        loop$mapper = mapper;
        loop$events = events;
        loop$old = remaining_old;
        loop$new = new$8;
        loop$added = added;
        loop$removed = removed$1;
      }
    }
  }
}
function do_diff(loop$old, loop$old_keyed, loop$new, loop$new_keyed, loop$moved, loop$moved_offset, loop$removed, loop$node_index, loop$patch_index, loop$path, loop$changes, loop$children, loop$mapper, loop$events) {
  while (true) {
    let old = loop$old;
    let old_keyed = loop$old_keyed;
    let new$8 = loop$new;
    let new_keyed = loop$new_keyed;
    let moved = loop$moved;
    let moved_offset = loop$moved_offset;
    let removed = loop$removed;
    let node_index = loop$node_index;
    let patch_index = loop$patch_index;
    let path = loop$path;
    let changes = loop$changes;
    let children = loop$children;
    let mapper = loop$mapper;
    let events = loop$events;
    if (old.hasLength(0) && new$8.hasLength(0)) {
      return new Diff(
        new Patch(patch_index, removed, changes, children),
        events
      );
    } else if (old.atLeastLength(1) && new$8.hasLength(0)) {
      let prev = old.head;
      let old$1 = old.tail;
      let _block;
      let $ = prev.key === "" || !contains(moved, prev.key);
      if ($) {
        _block = removed + advance(prev);
      } else {
        _block = removed;
      }
      let removed$1 = _block;
      let events$1 = remove_child(events, path, node_index, prev);
      loop$old = old$1;
      loop$old_keyed = old_keyed;
      loop$new = new$8;
      loop$new_keyed = new_keyed;
      loop$moved = moved;
      loop$moved_offset = moved_offset;
      loop$removed = removed$1;
      loop$node_index = node_index;
      loop$patch_index = patch_index;
      loop$path = path;
      loop$changes = changes;
      loop$children = children;
      loop$mapper = mapper;
      loop$events = events$1;
    } else if (old.hasLength(0) && new$8.atLeastLength(1)) {
      let events$1 = add_children(
        events,
        mapper,
        path,
        node_index,
        new$8
      );
      let insert5 = insert4(new$8, node_index - moved_offset);
      let changes$1 = prepend(insert5, changes);
      return new Diff(
        new Patch(patch_index, removed, changes$1, children),
        events$1
      );
    } else if (old.atLeastLength(1) && new$8.atLeastLength(1) && old.head.key !== new$8.head.key) {
      let prev = old.head;
      let old_remaining = old.tail;
      let next = new$8.head;
      let new_remaining = new$8.tail;
      let next_did_exist = get(old_keyed, next.key);
      let prev_does_exist = get(new_keyed, prev.key);
      let prev_has_moved = contains(moved, prev.key);
      if (prev_does_exist.isOk() && next_did_exist.isOk() && prev_has_moved) {
        loop$old = old_remaining;
        loop$old_keyed = old_keyed;
        loop$new = new$8;
        loop$new_keyed = new_keyed;
        loop$moved = moved;
        loop$moved_offset = moved_offset - advance(prev);
        loop$removed = removed;
        loop$node_index = node_index;
        loop$patch_index = patch_index;
        loop$path = path;
        loop$changes = changes;
        loop$children = children;
        loop$mapper = mapper;
        loop$events = events;
      } else if (prev_does_exist.isOk() && next_did_exist.isOk()) {
        let match = next_did_exist[0];
        let count = advance(next);
        let before = node_index - moved_offset;
        let move2 = move(next.key, before, count);
        let changes$1 = prepend(move2, changes);
        let moved$1 = insert2(moved, next.key);
        let moved_offset$1 = moved_offset + count;
        loop$old = prepend(match, old);
        loop$old_keyed = old_keyed;
        loop$new = new$8;
        loop$new_keyed = new_keyed;
        loop$moved = moved$1;
        loop$moved_offset = moved_offset$1;
        loop$removed = removed;
        loop$node_index = node_index;
        loop$patch_index = patch_index;
        loop$path = path;
        loop$changes = changes$1;
        loop$children = children;
        loop$mapper = mapper;
        loop$events = events;
      } else if (!prev_does_exist.isOk() && next_did_exist.isOk()) {
        let count = advance(prev);
        let moved_offset$1 = moved_offset - count;
        let events$1 = remove_child(events, path, node_index, prev);
        let remove3 = remove_key(prev.key, count);
        let changes$1 = prepend(remove3, changes);
        loop$old = old_remaining;
        loop$old_keyed = old_keyed;
        loop$new = new$8;
        loop$new_keyed = new_keyed;
        loop$moved = moved;
        loop$moved_offset = moved_offset$1;
        loop$removed = removed;
        loop$node_index = node_index;
        loop$patch_index = patch_index;
        loop$path = path;
        loop$changes = changes$1;
        loop$children = children;
        loop$mapper = mapper;
        loop$events = events$1;
      } else if (prev_does_exist.isOk() && !next_did_exist.isOk()) {
        let before = node_index - moved_offset;
        let count = advance(next);
        let events$1 = add_child(events, mapper, path, node_index, next);
        let insert5 = insert4(toList([next]), before);
        let changes$1 = prepend(insert5, changes);
        loop$old = old;
        loop$old_keyed = old_keyed;
        loop$new = new_remaining;
        loop$new_keyed = new_keyed;
        loop$moved = moved;
        loop$moved_offset = moved_offset + count;
        loop$removed = removed;
        loop$node_index = node_index + count;
        loop$patch_index = patch_index;
        loop$path = path;
        loop$changes = changes$1;
        loop$children = children;
        loop$mapper = mapper;
        loop$events = events$1;
      } else {
        let prev_count = advance(prev);
        let next_count = advance(next);
        let change = replace2(node_index - moved_offset, prev_count, next);
        let _block;
        let _pipe = events;
        let _pipe$1 = remove_child(_pipe, path, node_index, prev);
        _block = add_child(_pipe$1, mapper, path, node_index, next);
        let events$1 = _block;
        loop$old = old_remaining;
        loop$old_keyed = old_keyed;
        loop$new = new_remaining;
        loop$new_keyed = new_keyed;
        loop$moved = moved;
        loop$moved_offset = moved_offset - prev_count + next_count;
        loop$removed = removed;
        loop$node_index = node_index + next_count;
        loop$patch_index = patch_index;
        loop$path = path;
        loop$changes = prepend(change, changes);
        loop$children = children;
        loop$mapper = mapper;
        loop$events = events$1;
      }
    } else if (old.atLeastLength(1) && old.head instanceof Fragment && new$8.atLeastLength(1) && new$8.head instanceof Fragment) {
      let prev = old.head;
      let old$1 = old.tail;
      let next = new$8.head;
      let new$1 = new$8.tail;
      let node_index$1 = node_index + 1;
      let prev_count = prev.children_count;
      let next_count = next.children_count;
      let composed_mapper = compose_mapper(mapper, next.mapper);
      let child = do_diff(
        prev.children,
        prev.keyed_children,
        next.children,
        next.keyed_children,
        empty_set(),
        moved_offset,
        0,
        node_index$1,
        -1,
        path,
        empty_list,
        children,
        composed_mapper,
        events
      );
      let _block;
      let $ = child.patch.removed > 0;
      if ($) {
        let remove_from = node_index$1 + next_count - moved_offset;
        let patch = remove2(remove_from, child.patch.removed);
        _block = append(child.patch.changes, prepend(patch, changes));
      } else {
        _block = append(child.patch.changes, changes);
      }
      let changes$1 = _block;
      loop$old = old$1;
      loop$old_keyed = old_keyed;
      loop$new = new$1;
      loop$new_keyed = new_keyed;
      loop$moved = moved;
      loop$moved_offset = moved_offset + next_count - prev_count;
      loop$removed = removed;
      loop$node_index = node_index$1 + next_count;
      loop$patch_index = patch_index;
      loop$path = path;
      loop$changes = changes$1;
      loop$children = child.patch.children;
      loop$mapper = mapper;
      loop$events = child.events;
    } else if (old.atLeastLength(1) && old.head instanceof Element && new$8.atLeastLength(1) && new$8.head instanceof Element && (old.head.namespace === new$8.head.namespace && old.head.tag === new$8.head.tag)) {
      let prev = old.head;
      let old$1 = old.tail;
      let next = new$8.head;
      let new$1 = new$8.tail;
      let composed_mapper = compose_mapper(mapper, next.mapper);
      let child_path = add2(path, node_index, next.key);
      let controlled = is_controlled(
        events,
        next.namespace,
        next.tag,
        child_path
      );
      let $ = diff_attributes(
        controlled,
        child_path,
        composed_mapper,
        events,
        prev.attributes,
        next.attributes,
        empty_list,
        empty_list
      );
      let added_attrs = $.added;
      let removed_attrs = $.removed;
      let events$1 = $.events;
      let _block;
      if (added_attrs.hasLength(0) && removed_attrs.hasLength(0)) {
        _block = empty_list;
      } else {
        _block = toList([update(added_attrs, removed_attrs)]);
      }
      let initial_child_changes = _block;
      let child = do_diff(
        prev.children,
        prev.keyed_children,
        next.children,
        next.keyed_children,
        empty_set(),
        0,
        0,
        0,
        node_index,
        child_path,
        initial_child_changes,
        empty_list,
        composed_mapper,
        events$1
      );
      let _block$1;
      let $1 = child.patch;
      if ($1 instanceof Patch && $1.removed === 0 && $1.changes.hasLength(0) && $1.children.hasLength(0)) {
        _block$1 = children;
      } else {
        _block$1 = prepend(child.patch, children);
      }
      let children$1 = _block$1;
      loop$old = old$1;
      loop$old_keyed = old_keyed;
      loop$new = new$1;
      loop$new_keyed = new_keyed;
      loop$moved = moved;
      loop$moved_offset = moved_offset;
      loop$removed = removed;
      loop$node_index = node_index + 1;
      loop$patch_index = patch_index;
      loop$path = path;
      loop$changes = changes;
      loop$children = children$1;
      loop$mapper = mapper;
      loop$events = child.events;
    } else if (old.atLeastLength(1) && old.head instanceof Text && new$8.atLeastLength(1) && new$8.head instanceof Text && old.head.content === new$8.head.content) {
      let prev = old.head;
      let old$1 = old.tail;
      let next = new$8.head;
      let new$1 = new$8.tail;
      loop$old = old$1;
      loop$old_keyed = old_keyed;
      loop$new = new$1;
      loop$new_keyed = new_keyed;
      loop$moved = moved;
      loop$moved_offset = moved_offset;
      loop$removed = removed;
      loop$node_index = node_index + 1;
      loop$patch_index = patch_index;
      loop$path = path;
      loop$changes = changes;
      loop$children = children;
      loop$mapper = mapper;
      loop$events = events;
    } else if (old.atLeastLength(1) && old.head instanceof Text && new$8.atLeastLength(1) && new$8.head instanceof Text) {
      let old$1 = old.tail;
      let next = new$8.head;
      let new$1 = new$8.tail;
      let child = new$4(
        node_index,
        0,
        toList([replace_text(next.content)]),
        empty_list
      );
      loop$old = old$1;
      loop$old_keyed = old_keyed;
      loop$new = new$1;
      loop$new_keyed = new_keyed;
      loop$moved = moved;
      loop$moved_offset = moved_offset;
      loop$removed = removed;
      loop$node_index = node_index + 1;
      loop$patch_index = patch_index;
      loop$path = path;
      loop$changes = changes;
      loop$children = prepend(child, children);
      loop$mapper = mapper;
      loop$events = events;
    } else if (old.atLeastLength(1) && old.head instanceof UnsafeInnerHtml && new$8.atLeastLength(1) && new$8.head instanceof UnsafeInnerHtml) {
      let prev = old.head;
      let old$1 = old.tail;
      let next = new$8.head;
      let new$1 = new$8.tail;
      let composed_mapper = compose_mapper(mapper, next.mapper);
      let child_path = add2(path, node_index, next.key);
      let $ = diff_attributes(
        false,
        child_path,
        composed_mapper,
        events,
        prev.attributes,
        next.attributes,
        empty_list,
        empty_list
      );
      let added_attrs = $.added;
      let removed_attrs = $.removed;
      let events$1 = $.events;
      let _block;
      if (added_attrs.hasLength(0) && removed_attrs.hasLength(0)) {
        _block = empty_list;
      } else {
        _block = toList([update(added_attrs, removed_attrs)]);
      }
      let child_changes = _block;
      let _block$1;
      let $1 = prev.inner_html === next.inner_html;
      if ($1) {
        _block$1 = child_changes;
      } else {
        _block$1 = prepend(
          replace_inner_html(next.inner_html),
          child_changes
        );
      }
      let child_changes$1 = _block$1;
      let _block$2;
      if (child_changes$1.hasLength(0)) {
        _block$2 = children;
      } else {
        _block$2 = prepend(
          new$4(node_index, 0, child_changes$1, toList([])),
          children
        );
      }
      let children$1 = _block$2;
      loop$old = old$1;
      loop$old_keyed = old_keyed;
      loop$new = new$1;
      loop$new_keyed = new_keyed;
      loop$moved = moved;
      loop$moved_offset = moved_offset;
      loop$removed = removed;
      loop$node_index = node_index + 1;
      loop$patch_index = patch_index;
      loop$path = path;
      loop$changes = changes;
      loop$children = children$1;
      loop$mapper = mapper;
      loop$events = events$1;
    } else {
      let prev = old.head;
      let old_remaining = old.tail;
      let next = new$8.head;
      let new_remaining = new$8.tail;
      let prev_count = advance(prev);
      let next_count = advance(next);
      let change = replace2(node_index - moved_offset, prev_count, next);
      let _block;
      let _pipe = events;
      let _pipe$1 = remove_child(_pipe, path, node_index, prev);
      _block = add_child(_pipe$1, mapper, path, node_index, next);
      let events$1 = _block;
      loop$old = old_remaining;
      loop$old_keyed = old_keyed;
      loop$new = new_remaining;
      loop$new_keyed = new_keyed;
      loop$moved = moved;
      loop$moved_offset = moved_offset - prev_count + next_count;
      loop$removed = removed;
      loop$node_index = node_index + next_count;
      loop$patch_index = patch_index;
      loop$path = path;
      loop$changes = prepend(change, changes);
      loop$children = children;
      loop$mapper = mapper;
      loop$events = events$1;
    }
  }
}
function diff(events, old, new$8) {
  return do_diff(
    toList([old]),
    empty2(),
    toList([new$8]),
    empty2(),
    empty_set(),
    0,
    0,
    0,
    0,
    root2,
    empty_list,
    empty_list,
    identity2,
    tick(events)
  );
}

// build/dev/javascript/lustre/lustre/vdom/reconciler.ffi.mjs
var Reconciler = class {
  offset = 0;
  #root = null;
  #dispatch = () => {
  };
  #useServerEvents = false;
  constructor(root3, dispatch, { useServerEvents = false } = {}) {
    this.#root = root3;
    this.#dispatch = dispatch;
    this.#useServerEvents = useServerEvents;
  }
  mount(vdom) {
    appendChild(this.#root, this.#createChild(this.#root, vdom));
  }
  #stack = [];
  push(patch) {
    const offset = this.offset;
    if (offset) {
      iterate(patch.changes, (change) => {
        switch (change.kind) {
          case insert_kind:
          case move_kind:
            change.before = (change.before | 0) + offset;
            break;
          case remove_kind:
          case replace_kind:
            change.from = (change.from | 0) + offset;
            break;
        }
      });
      iterate(patch.children, (child) => {
        child.index = (child.index | 0) + offset;
      });
    }
    this.#stack.push({ node: this.#root, patch });
    this.#reconcile();
  }
  // PATCHING ------------------------------------------------------------------
  #reconcile() {
    const self = this;
    while (self.#stack.length) {
      const { node, patch } = self.#stack.pop();
      iterate(patch.changes, (change) => {
        switch (change.kind) {
          case insert_kind:
            self.#insert(node, change.children, change.before);
            break;
          case move_kind:
            self.#move(node, change.key, change.before, change.count);
            break;
          case remove_key_kind:
            self.#removeKey(node, change.key, change.count);
            break;
          case remove_kind:
            self.#remove(node, change.from, change.count);
            break;
          case replace_kind:
            self.#replace(node, change.from, change.count, change.with);
            break;
          case replace_text_kind:
            self.#replaceText(node, change.content);
            break;
          case replace_inner_html_kind:
            self.#replaceInnerHtml(node, change.inner_html);
            break;
          case update_kind:
            self.#update(node, change.added, change.removed);
            break;
        }
      });
      if (patch.removed) {
        self.#remove(
          node,
          node.childNodes.length - patch.removed,
          patch.removed
        );
      }
      let lastIndex = -1;
      let lastChild = null;
      iterate(patch.children, (child) => {
        const index5 = child.index | 0;
        const next = lastChild && lastIndex - index5 === 1 ? lastChild.previousSibling : childAt(node, index5);
        self.#stack.push({ node: next, patch: child });
        lastChild = next;
        lastIndex = index5;
      });
    }
  }
  // CHANGES -------------------------------------------------------------------
  #insert(node, children, before) {
    const fragment3 = createDocumentFragment();
    iterate(children, (child) => {
      const el = this.#createChild(node, child);
      appendChild(fragment3, el);
    });
    insertBefore(node, fragment3, childAt(node, before));
  }
  #move(node, key, before, count) {
    let el = getKeyedChild(node, key);
    const beforeEl = childAt(node, before);
    for (let i = 0; i < count && el !== null; ++i) {
      const next = el.nextSibling;
      if (SUPPORTS_MOVE_BEFORE) {
        node.moveBefore(el, beforeEl);
      } else {
        insertBefore(node, el, beforeEl);
      }
      el = next;
    }
  }
  #removeKey(node, key, count) {
    this.#removeFromChild(node, getKeyedChild(node, key), count);
  }
  #remove(node, from2, count) {
    this.#removeFromChild(node, childAt(node, from2), count);
  }
  #removeFromChild(parent, child, count) {
    while (count-- > 0 && child !== null) {
      const next = child.nextSibling;
      const key = child[meta].key;
      if (key) {
        parent[meta].keyedChildren.delete(key);
      }
      for (const [_, { timeout }] of child[meta].debouncers ?? []) {
        clearTimeout(timeout);
      }
      parent.removeChild(child);
      child = next;
    }
  }
  #replace(parent, from2, count, child) {
    this.#remove(parent, from2, count);
    const el = this.#createChild(parent, child);
    insertBefore(parent, el, childAt(parent, from2));
  }
  #replaceText(node, content) {
    node.data = content ?? "";
  }
  #replaceInnerHtml(node, inner_html) {
    node.innerHTML = inner_html ?? "";
  }
  #update(node, added, removed) {
    iterate(removed, (attribute3) => {
      const name = attribute3.name;
      if (node[meta].handlers.has(name)) {
        node.removeEventListener(name, handleEvent);
        node[meta].handlers.delete(name);
        if (node[meta].throttles.has(name)) {
          node[meta].throttles.delete(name);
        }
        if (node[meta].debouncers.has(name)) {
          clearTimeout(node[meta].debouncers.get(name).timeout);
          node[meta].debouncers.delete(name);
        }
      } else {
        node.removeAttribute(name);
        SYNCED_ATTRIBUTES[name]?.removed?.(node, name);
      }
    });
    iterate(added, (attribute3) => {
      this.#createAttribute(node, attribute3);
    });
  }
  // CONSTRUCTORS --------------------------------------------------------------
  #createChild(parent, vnode) {
    switch (vnode.kind) {
      case element_kind: {
        const node = createChildElement(parent, vnode);
        this.#createAttributes(node, vnode);
        this.#insert(node, vnode.children, 0);
        return node;
      }
      case text_kind: {
        return createChildText(parent, vnode);
      }
      case fragment_kind: {
        const node = createDocumentFragment();
        const head = createChildText(parent, vnode);
        appendChild(node, head);
        iterate(vnode.children, (child) => {
          appendChild(node, this.#createChild(parent, child));
        });
        return node;
      }
      case unsafe_inner_html_kind: {
        const node = createChildElement(parent, vnode);
        this.#createAttributes(node, vnode);
        this.#replaceInnerHtml(node, vnode.inner_html);
        return node;
      }
    }
  }
  #createAttributes(node, { attributes }) {
    iterate(attributes, (attribute3) => this.#createAttribute(node, attribute3));
  }
  #createAttribute(node, attribute3) {
    const { debouncers, handlers, throttles } = node[meta];
    const {
      kind,
      name,
      value,
      prevent_default: prevent,
      stop_propagation: stop,
      immediate: immediate2,
      include,
      debounce: debounceDelay,
      throttle: throttleDelay
    } = attribute3;
    switch (kind) {
      case attribute_kind: {
        const valueOrDefault = value ?? "";
        if (name === "virtual:defaultValue") {
          node.defaultValue = valueOrDefault;
          return;
        }
        if (valueOrDefault !== node.getAttribute(name)) {
          node.setAttribute(name, valueOrDefault);
        }
        SYNCED_ATTRIBUTES[name]?.added?.(node, value);
        break;
      }
      case property_kind:
        node[name] = value;
        break;
      case event_kind: {
        if (!handlers.has(name)) {
          node.addEventListener(name, handleEvent, {
            passive: !attribute3.prevent_default
          });
        }
        if (throttleDelay > 0) {
          const throttle = throttles.get(name) ?? {};
          throttle.delay = throttleDelay;
          throttles.set(name, throttle);
        } else {
          throttles.delete(name);
        }
        if (debounceDelay > 0) {
          const debounce = debouncers.get(name) ?? {};
          debounce.delay = debounceDelay;
          debouncers.set(name, debounce);
        } else {
          clearTimeout(debouncers.get(name)?.timeout);
          debouncers.delete(name);
        }
        handlers.set(name, (event4) => {
          if (prevent) event4.preventDefault();
          if (stop) event4.stopPropagation();
          const type = event4.type;
          let path = "";
          let pathNode = event4.currentTarget;
          while (pathNode !== this.#root) {
            const key = pathNode[meta].key;
            const parent = pathNode.parentNode;
            if (key) {
              path = `${separator_key}${key}${path}`;
            } else {
              const siblings = parent.childNodes;
              let index5 = [].indexOf.call(siblings, pathNode);
              if (parent === this.#root) {
                index5 -= this.offset;
              }
              path = `${separator_index}${index5}${path}`;
            }
            pathNode = parent;
          }
          path = path.slice(1);
          const data = this.#useServerEvents ? createServerEvent(event4, include ?? []) : event4;
          const throttle = throttles.get(type);
          if (throttle) {
            const now = Date.now();
            const last = throttle.last || 0;
            if (now > last + throttle.delay) {
              throttle.last = now;
              throttle.lastEvent = event4;
              this.#dispatch(data, path, type, immediate2);
            } else {
              event4.preventDefault();
            }
          }
          const debounce = debouncers.get(type);
          if (debounce) {
            clearTimeout(debounce.timeout);
            debounce.timeout = setTimeout(() => {
              if (event4 === throttles.get(type)?.lastEvent) return;
              this.#dispatch(data, path, type, immediate2);
            }, debounce.delay);
          } else {
            this.#dispatch(data, path, type, immediate2);
          }
        });
        break;
      }
    }
  }
};
var iterate = (list4, callback) => {
  if (Array.isArray(list4)) {
    for (let i = 0; i < list4.length; i++) {
      callback(list4[i]);
    }
  } else if (list4) {
    for (list4; list4.tail; list4 = list4.tail) {
      callback(list4.head);
    }
  }
};
var appendChild = (node, child) => node.appendChild(child);
var insertBefore = (parent, node, referenceNode) => parent.insertBefore(node, referenceNode ?? null);
var createChildElement = (parent, { key, tag, namespace }) => {
  const node = document2.createElementNS(namespace || NAMESPACE_HTML, tag);
  initialiseMetadata(parent, node, key);
  return node;
};
var createChildText = (parent, { key, content }) => {
  const node = document2.createTextNode(content ?? "");
  initialiseMetadata(parent, node, key);
  return node;
};
var createDocumentFragment = () => document2.createDocumentFragment();
var childAt = (node, at) => node.childNodes[at | 0];
var meta = Symbol("lustre");
var initialiseMetadata = (parent, node, key = "") => {
  switch (node.nodeType) {
    case ELEMENT_NODE:
    case DOCUMENT_FRAGMENT_NODE:
      node[meta] = {
        key,
        keyedChildren: /* @__PURE__ */ new Map(),
        handlers: /* @__PURE__ */ new Map(),
        throttles: /* @__PURE__ */ new Map(),
        debouncers: /* @__PURE__ */ new Map()
      };
      break;
    case TEXT_NODE:
      node[meta] = { key };
      break;
  }
  if (parent && key) {
    parent[meta].keyedChildren.set(key, new WeakRef(node));
  }
};
var getKeyedChild = (node, key) => node[meta].keyedChildren.get(key).deref();
var handleEvent = (event4) => {
  const target = event4.currentTarget;
  const handler = target[meta].handlers.get(event4.type);
  if (event4.type === "submit") {
    event4.detail ??= {};
    event4.detail.formData = [...new FormData(event4.target).entries()];
  }
  handler(event4);
};
var createServerEvent = (event4, include = []) => {
  const data = {};
  if (event4.type === "input" || event4.type === "change") {
    include.push("target.value");
  }
  if (event4.type === "submit") {
    include.push("detail.formData");
  }
  for (const property3 of include) {
    const path = property3.split(".");
    for (let i = 0, input2 = event4, output = data; i < path.length; i++) {
      if (i === path.length - 1) {
        output[path[i]] = input2[path[i]];
        break;
      }
      output = output[path[i]] ??= {};
      input2 = input2[path[i]];
    }
  }
  return data;
};
var syncedBooleanAttribute = (name) => {
  return {
    added(node) {
      node[name] = true;
    },
    removed(node) {
      node[name] = false;
    }
  };
};
var syncedAttribute = (name) => {
  return {
    added(node, value) {
      node[name] = value;
    }
  };
};
var SYNCED_ATTRIBUTES = {
  checked: syncedBooleanAttribute("checked"),
  selected: syncedBooleanAttribute("selected"),
  value: syncedAttribute("value"),
  autofocus: {
    added(node) {
      queueMicrotask(() => node.focus?.());
    }
  },
  autoplay: {
    added(node) {
      try {
        node.play?.();
      } catch (e) {
        console.error(e);
      }
    }
  }
};

// build/dev/javascript/lustre/lustre/vdom/virtualise.ffi.mjs
var virtualise = (root3) => {
  const vdom = virtualiseNode(null, root3);
  if (vdom === null || vdom.children instanceof Empty) {
    const empty3 = emptyTextNode(root3);
    root3.appendChild(empty3);
    return none2();
  } else if (vdom.children instanceof NonEmpty && vdom.children.tail instanceof Empty) {
    return vdom.children.head;
  } else {
    const head = emptyTextNode(root3);
    root3.insertBefore(head, root3.firstChild);
    return fragment2(vdom.children);
  }
};
var emptyTextNode = (parent) => {
  const node = document2.createTextNode("");
  initialiseMetadata(parent, node);
  return node;
};
var virtualiseNode = (parent, node) => {
  switch (node.nodeType) {
    case ELEMENT_NODE: {
      const key = node.getAttribute("data-lustre-key");
      initialiseMetadata(parent, node, key);
      if (key) {
        node.removeAttribute("data-lustre-key");
      }
      const tag = node.localName;
      const namespace = node.namespaceURI;
      const isHtmlElement = !namespace || namespace === NAMESPACE_HTML;
      if (isHtmlElement && INPUT_ELEMENTS.includes(tag)) {
        virtualiseInputEvents(tag, node);
      }
      const attributes = virtualiseAttributes(node);
      const children = virtualiseChildNodes(node);
      const vnode = isHtmlElement ? element2(tag, attributes, children) : namespaced(namespace, tag, attributes, children);
      return key ? to_keyed(key, vnode) : vnode;
    }
    case TEXT_NODE:
      initialiseMetadata(parent, node);
      return text2(node.data);
    case DOCUMENT_FRAGMENT_NODE:
      initialiseMetadata(parent, node);
      return node.childNodes.length > 0 ? fragment2(virtualiseChildNodes(node)) : null;
    default:
      return null;
  }
};
var INPUT_ELEMENTS = ["input", "select", "textarea"];
var virtualiseInputEvents = (tag, node) => {
  const value = node.value;
  const checked = node.checked;
  if (tag === "input" && node.type === "checkbox" && !checked) return;
  if (tag === "input" && node.type === "radio" && !checked) return;
  if (node.type !== "checkbox" && node.type !== "radio" && !value) return;
  queueMicrotask(() => {
    node.value = value;
    node.checked = checked;
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
    if (document2.activeElement !== node) {
      node.dispatchEvent(new Event("blur", { bubbles: true }));
    }
  });
};
var virtualiseChildNodes = (node) => {
  let children = empty_list;
  let child = node.lastChild;
  while (child) {
    const vnode = virtualiseNode(node, child);
    const next = child.previousSibling;
    if (vnode) {
      children = new NonEmpty(vnode, children);
    } else {
      node.removeChild(child);
    }
    child = next;
  }
  return children;
};
var virtualiseAttributes = (node) => {
  let index5 = node.attributes.length;
  let attributes = empty_list;
  while (index5-- > 0) {
    attributes = new NonEmpty(
      virtualiseAttribute(node.attributes[index5]),
      attributes
    );
  }
  return attributes;
};
var virtualiseAttribute = (attr) => {
  const name = attr.localName;
  const value = attr.value;
  return attribute2(name, value);
};

// build/dev/javascript/lustre/lustre/runtime/client/runtime.ffi.mjs
var is_browser = () => !!document2;
var is_reference_equal = (a, b) => a === b;
var Runtime = class {
  constructor(root3, [model, effects], view3, update4) {
    this.root = root3;
    this.#model = model;
    this.#view = view3;
    this.#update = update4;
    this.#reconciler = new Reconciler(this.root, (event4, path, name) => {
      const [events, msg] = handle(this.#events, path, name, event4);
      this.#events = events;
      if (msg.isOk()) {
        this.dispatch(msg[0], false);
      }
    });
    this.#vdom = virtualise(this.root);
    this.#events = new$5();
    this.#shouldFlush = true;
    this.#tick(effects);
  }
  // PUBLIC API ----------------------------------------------------------------
  root = null;
  set offset(offset) {
    this.#reconciler.offset = offset;
  }
  dispatch(msg, immediate2 = false) {
    this.#shouldFlush ||= immediate2;
    if (this.#shouldQueue) {
      this.#queue.push(msg);
    } else {
      const [model, effects] = this.#update(this.#model, msg);
      this.#model = model;
      this.#tick(effects);
    }
  }
  emit(event4, data) {
    const target = this.root.host ?? this.root;
    target.dispatchEvent(
      new CustomEvent(event4, {
        detail: data,
        bubbles: true,
        composed: true
      })
    );
  }
  // PRIVATE API ---------------------------------------------------------------
  #model;
  #view;
  #update;
  #vdom;
  #events;
  #reconciler;
  #shouldQueue = false;
  #queue = [];
  #beforePaint = empty_list;
  #afterPaint = empty_list;
  #renderTimer = null;
  #shouldFlush = false;
  #actions = {
    dispatch: (msg, immediate2) => this.dispatch(msg, immediate2),
    emit: (event4, data) => this.emit(event4, data),
    select: () => {
    },
    root: () => this.root
  };
  // A `#tick` is where we process effects and trigger any synchronous updates.
  // Once a tick has been processed a render will be scheduled if none is already.
  // p0
  #tick(effects) {
    this.#shouldQueue = true;
    while (true) {
      for (let list4 = effects.synchronous; list4.tail; list4 = list4.tail) {
        list4.head(this.#actions);
      }
      this.#beforePaint = listAppend(this.#beforePaint, effects.before_paint);
      this.#afterPaint = listAppend(this.#afterPaint, effects.after_paint);
      if (!this.#queue.length) break;
      [this.#model, effects] = this.#update(this.#model, this.#queue.shift());
    }
    this.#shouldQueue = false;
    if (this.#shouldFlush) {
      cancelAnimationFrame(this.#renderTimer);
      this.#render();
    } else if (!this.#renderTimer) {
      this.#renderTimer = requestAnimationFrame(() => {
        this.#render();
      });
    }
  }
  #render() {
    this.#shouldFlush = false;
    this.#renderTimer = null;
    const next = this.#view(this.#model);
    const { patch, events } = diff(this.#events, this.#vdom, next);
    this.#events = events;
    this.#vdom = next;
    this.#reconciler.push(patch);
    if (this.#beforePaint instanceof NonEmpty) {
      const effects = makeEffect(this.#beforePaint);
      this.#beforePaint = empty_list;
      queueMicrotask(() => {
        this.#shouldFlush = true;
        this.#tick(effects);
      });
    }
    if (this.#afterPaint instanceof NonEmpty) {
      const effects = makeEffect(this.#afterPaint);
      this.#afterPaint = empty_list;
      requestAnimationFrame(() => {
        this.#shouldFlush = true;
        this.#tick(effects);
      });
    }
  }
};
function makeEffect(synchronous) {
  return {
    synchronous,
    after_paint: empty_list,
    before_paint: empty_list
  };
}
function listAppend(a, b) {
  if (a instanceof Empty) {
    return b;
  } else if (b instanceof Empty) {
    return a;
  } else {
    return append(a, b);
  }
}

// build/dev/javascript/lustre/lustre/vdom/events.mjs
var Events = class extends CustomType {
  constructor(handlers, dispatched_paths, next_dispatched_paths) {
    super();
    this.handlers = handlers;
    this.dispatched_paths = dispatched_paths;
    this.next_dispatched_paths = next_dispatched_paths;
  }
};
function new$5() {
  return new Events(
    empty2(),
    empty_list,
    empty_list
  );
}
function tick(events) {
  return new Events(
    events.handlers,
    events.next_dispatched_paths,
    empty_list
  );
}
function do_remove_event(handlers, path, name) {
  return remove(handlers, event2(path, name));
}
function remove_event(events, path, name) {
  let handlers = do_remove_event(events.handlers, path, name);
  let _record = events;
  return new Events(
    handlers,
    _record.dispatched_paths,
    _record.next_dispatched_paths
  );
}
function remove_attributes(handlers, path, attributes) {
  return fold(
    attributes,
    handlers,
    (events, attribute3) => {
      if (attribute3 instanceof Event2) {
        let name = attribute3.name;
        return do_remove_event(events, path, name);
      } else {
        return events;
      }
    }
  );
}
function handle(events, path, name, event4) {
  let next_dispatched_paths = prepend(path, events.next_dispatched_paths);
  let _block;
  let _record = events;
  _block = new Events(
    _record.handlers,
    _record.dispatched_paths,
    next_dispatched_paths
  );
  let events$1 = _block;
  let $ = get(
    events$1.handlers,
    path + separator_event + name
  );
  if ($.isOk()) {
    let handler = $[0];
    return [events$1, run(event4, handler)];
  } else {
    return [events$1, new Error2(toList([]))];
  }
}
function has_dispatched_events(events, path) {
  return matches(path, events.dispatched_paths);
}
function do_add_event(handlers, mapper, path, name, handler) {
  return insert3(
    handlers,
    event2(path, name),
    map2(handler, identity2(mapper))
  );
}
function add_event(events, mapper, path, name, handler) {
  let handlers = do_add_event(events.handlers, mapper, path, name, handler);
  let _record = events;
  return new Events(
    handlers,
    _record.dispatched_paths,
    _record.next_dispatched_paths
  );
}
function add_attributes(handlers, mapper, path, attributes) {
  return fold(
    attributes,
    handlers,
    (events, attribute3) => {
      if (attribute3 instanceof Event2) {
        let name = attribute3.name;
        let handler = attribute3.handler;
        return do_add_event(events, mapper, path, name, handler);
      } else {
        return events;
      }
    }
  );
}
function compose_mapper(mapper, child_mapper) {
  let $ = is_reference_equal(mapper, identity2);
  let $1 = is_reference_equal(child_mapper, identity2);
  if ($1) {
    return mapper;
  } else if ($ && !$1) {
    return child_mapper;
  } else {
    return (msg) => {
      return mapper(child_mapper(msg));
    };
  }
}
function do_remove_children(loop$handlers, loop$path, loop$child_index, loop$children) {
  while (true) {
    let handlers = loop$handlers;
    let path = loop$path;
    let child_index = loop$child_index;
    let children = loop$children;
    if (children.hasLength(0)) {
      return handlers;
    } else {
      let child = children.head;
      let rest = children.tail;
      let _pipe = handlers;
      let _pipe$1 = do_remove_child(_pipe, path, child_index, child);
      loop$handlers = _pipe$1;
      loop$path = path;
      loop$child_index = child_index + advance(child);
      loop$children = rest;
    }
  }
}
function do_remove_child(handlers, parent, child_index, child) {
  if (child instanceof Element) {
    let attributes = child.attributes;
    let children = child.children;
    let path = add2(parent, child_index, child.key);
    let _pipe = handlers;
    let _pipe$1 = remove_attributes(_pipe, path, attributes);
    return do_remove_children(_pipe$1, path, 0, children);
  } else if (child instanceof Fragment) {
    let children = child.children;
    return do_remove_children(handlers, parent, child_index + 1, children);
  } else if (child instanceof UnsafeInnerHtml) {
    let attributes = child.attributes;
    let path = add2(parent, child_index, child.key);
    return remove_attributes(handlers, path, attributes);
  } else {
    return handlers;
  }
}
function remove_child(events, parent, child_index, child) {
  let handlers = do_remove_child(events.handlers, parent, child_index, child);
  let _record = events;
  return new Events(
    handlers,
    _record.dispatched_paths,
    _record.next_dispatched_paths
  );
}
function do_add_children(loop$handlers, loop$mapper, loop$path, loop$child_index, loop$children) {
  while (true) {
    let handlers = loop$handlers;
    let mapper = loop$mapper;
    let path = loop$path;
    let child_index = loop$child_index;
    let children = loop$children;
    if (children.hasLength(0)) {
      return handlers;
    } else {
      let child = children.head;
      let rest = children.tail;
      let _pipe = handlers;
      let _pipe$1 = do_add_child(_pipe, mapper, path, child_index, child);
      loop$handlers = _pipe$1;
      loop$mapper = mapper;
      loop$path = path;
      loop$child_index = child_index + advance(child);
      loop$children = rest;
    }
  }
}
function do_add_child(handlers, mapper, parent, child_index, child) {
  if (child instanceof Element) {
    let attributes = child.attributes;
    let children = child.children;
    let path = add2(parent, child_index, child.key);
    let composed_mapper = compose_mapper(mapper, child.mapper);
    let _pipe = handlers;
    let _pipe$1 = add_attributes(_pipe, composed_mapper, path, attributes);
    return do_add_children(_pipe$1, composed_mapper, path, 0, children);
  } else if (child instanceof Fragment) {
    let children = child.children;
    let composed_mapper = compose_mapper(mapper, child.mapper);
    let child_index$1 = child_index + 1;
    return do_add_children(
      handlers,
      composed_mapper,
      parent,
      child_index$1,
      children
    );
  } else if (child instanceof UnsafeInnerHtml) {
    let attributes = child.attributes;
    let path = add2(parent, child_index, child.key);
    let composed_mapper = compose_mapper(mapper, child.mapper);
    return add_attributes(handlers, composed_mapper, path, attributes);
  } else {
    return handlers;
  }
}
function add_child(events, mapper, parent, index5, child) {
  let handlers = do_add_child(events.handlers, mapper, parent, index5, child);
  let _record = events;
  return new Events(
    handlers,
    _record.dispatched_paths,
    _record.next_dispatched_paths
  );
}
function add_children(events, mapper, path, child_index, children) {
  let handlers = do_add_children(
    events.handlers,
    mapper,
    path,
    child_index,
    children
  );
  let _record = events;
  return new Events(
    handlers,
    _record.dispatched_paths,
    _record.next_dispatched_paths
  );
}

// build/dev/javascript/lustre/lustre/element.mjs
function element2(tag, attributes, children) {
  return element(
    "",
    identity2,
    "",
    tag,
    attributes,
    children,
    empty2(),
    false,
    false
  );
}
function namespaced(namespace, tag, attributes, children) {
  return element(
    "",
    identity2,
    namespace,
    tag,
    attributes,
    children,
    empty2(),
    false,
    false
  );
}
function text2(content) {
  return text("", identity2, content);
}
function none2() {
  return text("", identity2, "");
}
function count_fragment_children(loop$children, loop$count) {
  while (true) {
    let children = loop$children;
    let count = loop$count;
    if (children.hasLength(0)) {
      return count;
    } else if (children.atLeastLength(1) && children.head instanceof Fragment) {
      let children_count = children.head.children_count;
      let rest = children.tail;
      loop$children = rest;
      loop$count = count + children_count;
    } else {
      let rest = children.tail;
      loop$children = rest;
      loop$count = count + 1;
    }
  }
}
function fragment2(children) {
  return fragment(
    "",
    identity2,
    children,
    empty2(),
    count_fragment_children(children, 0)
  );
}
function map5(element3, f) {
  let mapper = identity2(compose_mapper(identity2(f), element3.mapper));
  if (element3 instanceof Fragment) {
    let children = element3.children;
    let keyed_children = element3.keyed_children;
    let _record = element3;
    return new Fragment(
      _record.kind,
      _record.key,
      mapper,
      identity2(children),
      identity2(keyed_children),
      _record.children_count
    );
  } else if (element3 instanceof Element) {
    let attributes = element3.attributes;
    let children = element3.children;
    let keyed_children = element3.keyed_children;
    let _record = element3;
    return new Element(
      _record.kind,
      _record.key,
      mapper,
      _record.namespace,
      _record.tag,
      identity2(attributes),
      identity2(children),
      identity2(keyed_children),
      _record.self_closing,
      _record.void
    );
  } else if (element3 instanceof UnsafeInnerHtml) {
    let attributes = element3.attributes;
    let _record = element3;
    return new UnsafeInnerHtml(
      _record.kind,
      _record.key,
      mapper,
      _record.namespace,
      _record.tag,
      identity2(attributes),
      _record.inner_html
    );
  } else {
    return identity2(element3);
  }
}

// build/dev/javascript/lustre/lustre/element/html.mjs
function text3(content) {
  return text2(content);
}
function div(attrs, children) {
  return element2("div", attrs, children);
}
function p(attrs, children) {
  return element2("p", attrs, children);
}
function br(attrs) {
  return element2("br", attrs, empty_list);
}
function form(attrs, children) {
  return element2("form", attrs, children);
}
function input(attrs) {
  return element2("input", attrs, empty_list);
}

// build/dev/javascript/lustre/lustre/runtime/server/runtime.mjs
var EffectDispatchedMessage = class extends CustomType {
  constructor(message) {
    super();
    this.message = message;
  }
};
var EffectEmitEvent = class extends CustomType {
  constructor(name, data) {
    super();
    this.name = name;
    this.data = data;
  }
};
var SystemRequestedShutdown = class extends CustomType {
};

// build/dev/javascript/lustre/lustre/component.mjs
var Config2 = class extends CustomType {
  constructor(open_shadow_root, adopt_styles, attributes, properties, is_form_associated, on_form_autofill, on_form_reset, on_form_restore) {
    super();
    this.open_shadow_root = open_shadow_root;
    this.adopt_styles = adopt_styles;
    this.attributes = attributes;
    this.properties = properties;
    this.is_form_associated = is_form_associated;
    this.on_form_autofill = on_form_autofill;
    this.on_form_reset = on_form_reset;
    this.on_form_restore = on_form_restore;
  }
};
function new$6(options) {
  let init3 = new Config2(
    false,
    true,
    empty_dict(),
    empty_dict(),
    false,
    option_none,
    option_none,
    option_none
  );
  return fold(
    options,
    init3,
    (config, option) => {
      return option.apply(config);
    }
  );
}

// build/dev/javascript/lustre/lustre/runtime/client/spa.ffi.mjs
var Spa = class _Spa {
  static start({ init: init3, update: update4, view: view3 }, selector, flags) {
    if (!is_browser()) return new Error2(new NotABrowser());
    const root3 = selector instanceof HTMLElement ? selector : document2.querySelector(selector);
    if (!root3) return new Error2(new ElementNotFound(selector));
    return new Ok(new _Spa(root3, init3(flags), update4, view3));
  }
  #runtime;
  constructor(root3, [init3, effects], update4, view3) {
    this.#runtime = new Runtime(root3, [init3, effects], view3, update4);
  }
  send(message) {
    switch (message.constructor) {
      case EffectDispatchedMessage: {
        this.dispatch(message.message, false);
        break;
      }
      case EffectEmitEvent: {
        this.emit(message.name, message.data);
        break;
      }
      case SystemRequestedShutdown:
        break;
    }
  }
  dispatch(msg, immediate2) {
    this.#runtime.dispatch(msg, immediate2);
  }
  emit(event4, data) {
    this.#runtime.emit(event4, data);
  }
};
var start = Spa.start;

// build/dev/javascript/lustre/lustre.mjs
var App = class extends CustomType {
  constructor(init3, update4, view3, config) {
    super();
    this.init = init3;
    this.update = update4;
    this.view = view3;
    this.config = config;
  }
};
var ElementNotFound = class extends CustomType {
  constructor(selector) {
    super();
    this.selector = selector;
  }
};
var NotABrowser = class extends CustomType {
};
function application(init3, update4, view3) {
  return new App(init3, update4, view3, new$6(empty_list));
}
function start3(app, selector, start_args) {
  return guard(
    !is_browser(),
    new Error2(new NotABrowser()),
    () => {
      return start(app, selector, start_args);
    }
  );
}

// build/dev/javascript/lustre/lustre/event.mjs
function is_immediate_event(name) {
  if (name === "input") {
    return true;
  } else if (name === "change") {
    return true;
  } else if (name === "focus") {
    return true;
  } else if (name === "focusin") {
    return true;
  } else if (name === "focusout") {
    return true;
  } else if (name === "blur") {
    return true;
  } else if (name === "select") {
    return true;
  } else {
    return false;
  }
}
function on(name, handler) {
  return event(
    name,
    handler,
    empty_list,
    false,
    false,
    is_immediate_event(name),
    0,
    0
  );
}
function on_click(msg) {
  return on("click", success(msg));
}
function on_change(msg) {
  return on(
    "change",
    subfield(
      toList(["target", "value"]),
      string2,
      (value) => {
        return success(msg(value));
      }
    )
  );
}

// build/dev/javascript/neb_stats/data/report.mjs
var AntiShipWeapon = class extends CustomType {
  constructor(name, damage_dealt) {
    super();
    this.name = name;
    this.damage_dealt = damage_dealt;
  }
};
var Ship = class extends CustomType {
  constructor(name, class$2, damage_taken, anti_ship_weapons) {
    super();
    this.name = name;
    this.class = class$2;
    this.damage_taken = damage_taken;
    this.anti_ship_weapons = anti_ship_weapons;
  }
};
var Player = class extends CustomType {
  constructor(name, ships) {
    super();
    this.name = name;
    this.ships = ships;
  }
};
var Team = class extends CustomType {
  constructor(players) {
    super();
    this.players = players;
  }
};
var Report = class extends CustomType {
  constructor(team_a, team_b) {
    super();
    this.team_a = team_a;
    this.team_b = team_b;
  }
};

// build/dev/javascript/neb_stats/pages/report.mjs
var PageState = class extends CustomType {
  constructor(report, focus_ship) {
    super();
    this.report = report;
    this.focus_ship = focus_ship;
  }
};
var FocusShip = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
function init(report) {
  return new PageState(report, new None());
}
function update2(state, msg) {
  {
    let ship = msg[0];
    let _record = state;
    return new PageState(_record.report, ship);
  }
}
function weapon_card(weapon) {
  let _block;
  let _pipe = weapon.damage_dealt;
  let _pipe$1 = to_precision(_pipe, 2);
  _block = float_to_string(_pipe$1);
  let damage_string = _block;
  return div(
    toList([class$("box")]),
    toList([
      p(toList([class$("title is-5")]), toList([text3(weapon.name)])),
      p(toList([]), toList([text3("Damage Dealt: " + damage_string)]))
    ])
  );
}
function ship_detail(ship) {
  return div(
    toList([class$("column is-three-fifths")]),
    toList([
      div(
        toList([]),
        prepend(
          p(toList([class$("title is-3")]), toList([text3(ship.name)])),
          (() => {
            let _pipe = ship.anti_ship_weapons;
            return map(_pipe, weapon_card);
          })()
        )
      )
    ])
  );
}
function total_damage_taken(ships) {
  let _pipe = ships;
  let _pipe$1 = map(_pipe, (ship) => {
    return ship.damage_taken;
  });
  let _pipe$2 = reduce(_pipe$1, (a, b) => {
    return a + b;
  });
  return unwrap(_pipe$2, 0);
}
function ship_damage_dealt(ship) {
  let _pipe = ship.anti_ship_weapons;
  let _pipe$1 = map(_pipe, (w) => {
    return w.damage_dealt;
  });
  let _pipe$2 = reduce(_pipe$1, (a, b) => {
    return a + b;
  });
  let _pipe$3 = unwrap(_pipe$2, 0);
  return to_precision(_pipe$3, 2);
}
function ship_card(ship) {
  let damage_dealt = ship_damage_dealt(ship);
  return div(
    toList([on_click(new FocusShip(new Some(ship))), class$("card")]),
    toList([
      div(
        toList([class$("card-header")]),
        toList([
          p(toList([class$("card-header-title")]), toList([text3(ship.name)]))
        ])
      ),
      div(
        toList([class$("card-content")]),
        toList([
          div(
            toList([class$("content")]),
            toList([
              text3(ship.class),
              br(toList([])),
              text3("Damage Taken: " + to_string(ship.damage_taken)),
              br(toList([])),
              text3("Antiship Damage Dealt: " + float_to_string(damage_dealt))
            ])
          )
        ])
      )
    ])
  );
}
function total_damage_dealt(ships) {
  let _pipe = ships;
  let _pipe$1 = map(_pipe, ship_damage_dealt);
  let _pipe$2 = reduce(_pipe$1, (a, b) => {
    return a + b;
  });
  let _pipe$3 = unwrap(_pipe$2, 0);
  return to_precision(_pipe$3, 2);
}
function player_box(player) {
  let total_damage = total_damage_dealt(player.ships);
  return div(
    toList([class$("box")]),
    toList([
      div(
        toList([]),
        prepend(
          p(
            toList([class$("title is-5")]),
            toList([
              text3(
                player.name + " (Dealt: " + float_to_string(total_damage) + " Taken: " + to_string(
                  total_damage_taken(player.ships)
                ) + ")"
              )
            ])
          ),
          (() => {
            let _pipe = player.ships;
            return map(_pipe, ship_card);
          })()
        )
      )
    ])
  );
}
function team_box(team, team_name) {
  return div(
    toList([class$("column is-one-fifth")]),
    toList([
      div(
        toList([]),
        prepend(
          p(toList([class$("title is-3")]), toList([text3(team_name)])),
          (() => {
            let _pipe = team.players;
            return map(_pipe, player_box);
          })()
        )
      )
    ])
  );
}
function view(state) {
  let team_a_box = team_box(state.report.team_a, "Team A");
  let team_b_box = team_box(state.report.team_b, "Team B");
  let _block;
  let $ = state.focus_ship;
  if ($ instanceof Some) {
    let ship = $[0];
    _block = ship_detail(ship);
  } else {
    _block = div(toList([class$("column is-three-fifths")]), toList([]));
  }
  let ship_box = _block;
  return div(
    toList([class$("columns")]),
    toList([ship_box, team_a_box, team_b_box])
  );
}

// build/dev/javascript/xmlm/xmlm_ffi.mjs
function int_list_to_string(int_list) {
  const array3 = new Uint8Array(int_list.toArray());
  const decoder = new TextDecoder("utf-8", { fatal: true });
  return decoder.decode(array3);
}
function bit_array_to_list(bit_array2) {
  return List.fromArray(bit_array2.buffer);
}

// build/dev/javascript/xmlm/xmlm.mjs
var UnicodeLexerEoi = class extends CustomType {
};
var UnicodeLexerMalformed = class extends CustomType {
};
var Utf8 = class extends CustomType {
};
var Utf16 = class extends CustomType {
};
var Utf16Be = class extends CustomType {
};
var Iso8859x1 = class extends CustomType {
};
var Iso8859x15 = class extends CustomType {
};
var UsAscii = class extends CustomType {
};
var Name = class extends CustomType {
  constructor(uri, local) {
    super();
    this.uri = uri;
    this.local = local;
  }
};
var Attribute2 = class extends CustomType {
  constructor(name, value) {
    super();
    this.name = name;
    this.value = value;
  }
};
var Tag = class extends CustomType {
  constructor(name, attributes) {
    super();
    this.name = name;
    this.attributes = attributes;
  }
};
var Dtd = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var ElementStart = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var ElementEnd = class extends CustomType {
};
var Data = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Position = class extends CustomType {
  constructor(line, column) {
    super();
    this.line = line;
    this.column = column;
  }
};
var ExpectedCharSeqs = class extends CustomType {
  constructor(expected, actual) {
    super();
    this.expected = expected;
    this.actual = actual;
  }
};
var ExpectedRootElement = class extends CustomType {
};
var IllegalCharRef = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var IllegalCharSeq = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var MalformedCharStream = class extends CustomType {
};
var MaxBufferSize = class extends CustomType {
};
var UnexpectedEoi = class extends CustomType {
};
var UnknownEncoding = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var UnknownEntityRef = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var UnknownNsPrefix = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var UnicodeLexerErrorEoi = class extends CustomType {
};
var UnicodeLexerErrorMalformed = class extends CustomType {
};
var InputError = class extends CustomType {
  constructor(x0, x1) {
    super();
    this[0] = x0;
    this[1] = x1;
  }
};
var LimitStartTag = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var LimitEndTag = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var LimitPi = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var LimitComment = class extends CustomType {
};
var LimitCData = class extends CustomType {
};
var LimitDtd = class extends CustomType {
};
var LimitText = class extends CustomType {
};
var LimitEoi = class extends CustomType {
};
var Input = class extends CustomType {
  constructor(encoding, strip, namespace_callback, entity_callback, uchar, stream, char, cr, line, column, limit, peek2, stripping, last_whitespace, scopes, ns, identifier, data) {
    super();
    this.encoding = encoding;
    this.strip = strip;
    this.namespace_callback = namespace_callback;
    this.entity_callback = entity_callback;
    this.uchar = uchar;
    this.stream = stream;
    this.char = char;
    this.cr = cr;
    this.line = line;
    this.column = column;
    this.limit = limit;
    this.peek = peek2;
    this.stripping = stripping;
    this.last_whitespace = last_whitespace;
    this.scopes = scopes;
    this.ns = ns;
    this.identifier = identifier;
    this.data = data;
  }
};
var LoopDoneExited = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var LoopDoneByCondition = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var Go = class extends CustomType {
};
var Stop = class extends CustomType {
};
function uchar_byte(stream) {
  if (stream.atLeastLength(1)) {
    let byte = stream.head;
    let rest = stream.tail;
    return new Ok([byte, rest]);
  } else {
    return new Error2(new UnicodeLexerEoi());
  }
}
function uchar_iso_8859_1(stream) {
  if (stream.atLeastLength(1)) {
    let byte = stream.head;
    let rest = stream.tail;
    return new Ok([byte, rest]);
  } else {
    return new Error2(new UnicodeLexerEoi());
  }
}
function uchar_iso_8859_15(stream) {
  if (stream.atLeastLength(1) && stream.head === 164) {
    let rest = stream.tail;
    return new Ok([8364, rest]);
  } else if (stream.atLeastLength(1) && stream.head === 166) {
    let rest = stream.tail;
    return new Ok([352, rest]);
  } else if (stream.atLeastLength(1) && stream.head === 168) {
    let rest = stream.tail;
    return new Ok([353, rest]);
  } else if (stream.atLeastLength(1) && stream.head === 180) {
    let rest = stream.tail;
    return new Ok([381, rest]);
  } else if (stream.atLeastLength(1) && stream.head === 184) {
    let rest = stream.tail;
    return new Ok([382, rest]);
  } else if (stream.atLeastLength(1) && stream.head === 188) {
    let rest = stream.tail;
    return new Ok([338, rest]);
  } else if (stream.atLeastLength(1) && stream.head === 189) {
    let rest = stream.tail;
    return new Ok([339, rest]);
  } else if (stream.atLeastLength(1) && stream.head === 190) {
    let rest = stream.tail;
    return new Ok([376, rest]);
  } else if (stream.atLeastLength(1)) {
    let char = stream.head;
    let rest = stream.tail;
    return new Ok([char, rest]);
  } else {
    return new Error2(new UnicodeLexerEoi());
  }
}
function most_significant_bytes_are_not_10(n) {
  return bitwise_and(n, 192) !== 128;
}
function do_uchar_utf8_len2(stream, byte0) {
  if (stream.atLeastLength(1)) {
    let byte1 = stream.head;
    let stream$1 = stream.tail;
    let $ = (() => {
      let _pipe = byte1;
      return most_significant_bytes_are_not_10(_pipe);
    })();
    if ($) {
      return new Error2(new UnicodeLexerMalformed());
    } else {
      let _block;
      let _pipe = bitwise_and(byte0, 31);
      let _pipe$1 = bitwise_shift_left(_pipe, 6);
      _block = bitwise_or(_pipe$1, bitwise_and(byte1, 63));
      let result = _block;
      return new Ok([result, stream$1]);
    }
  } else {
    return new Error2(new UnicodeLexerEoi());
  }
}
function do_uchar_utf8_len3(stream, byte0) {
  if (stream.atLeastLength(2)) {
    let byte1 = stream.head;
    let byte2 = stream.tail.head;
    let stream$1 = stream.tail.tail;
    let $ = (() => {
      let _pipe = byte2;
      return most_significant_bytes_are_not_10(_pipe);
    })();
    if ($) {
      return new Error2(new UnicodeLexerMalformed());
    } else {
      let $1 = byte0 === 224 && (byte1 < 160 || 191 < byte1);
      if ($1) {
        return new Error2(new UnicodeLexerMalformed());
      } else {
        let $2 = byte0 === 237 && (byte1 < 128 || 159 < byte1);
        if ($2) {
          return new Error2(new UnicodeLexerMalformed());
        } else {
          let $3 = (() => {
            let _pipe = byte1;
            return most_significant_bytes_are_not_10(_pipe);
          })();
          if ($3) {
            return new Error2(new UnicodeLexerMalformed());
          } else {
            let _block;
            let _pipe = byte0;
            let _pipe$1 = bitwise_and(_pipe, 15);
            _block = bitwise_shift_left(_pipe$1, 12);
            let b0 = _block;
            let _block$1;
            let _pipe$2 = byte1;
            let _pipe$3 = bitwise_and(_pipe$2, 63);
            _block$1 = bitwise_shift_left(_pipe$3, 6);
            let b1 = _block$1;
            let _block$2;
            let _pipe$4 = byte2;
            _block$2 = bitwise_and(_pipe$4, 63);
            let b2 = _block$2;
            let _block$3;
            let _pipe$5 = b0;
            let _pipe$6 = bitwise_or(_pipe$5, b1);
            _block$3 = bitwise_or(_pipe$6, b2);
            let result = _block$3;
            return new Ok([result, stream$1]);
          }
        }
      }
    }
  } else if (stream.hasLength(0)) {
    return new Error2(new UnicodeLexerEoi());
  } else {
    return new Error2(new UnicodeLexerMalformed());
  }
}
function do_uchar_utf8_len4(stream, byte0) {
  if (stream.atLeastLength(3)) {
    let byte1 = stream.head;
    let byte2 = stream.tail.head;
    let byte3 = stream.tail.tail.head;
    let stream$1 = stream.tail.tail.tail;
    let $ = most_significant_bytes_are_not_10(byte3) || most_significant_bytes_are_not_10(
      byte2
    );
    if ($) {
      return new Error2(new UnicodeLexerMalformed());
    } else {
      let $1 = byte0 === 240 && (byte1 < 144 || 191 < byte1);
      if ($1) {
        return new Error2(new UnicodeLexerMalformed());
      } else {
        let $2 = byte0 === 244 && (byte1 < 128 || 143 < byte1);
        if ($2) {
          return new Error2(new UnicodeLexerMalformed());
        } else {
          let $3 = (() => {
            let _pipe = byte1;
            return most_significant_bytes_are_not_10(_pipe);
          })();
          if ($3) {
            return new Error2(new UnicodeLexerMalformed());
          } else {
            let _block;
            let _pipe = byte0;
            let _pipe$1 = bitwise_and(_pipe, 7);
            _block = bitwise_shift_left(_pipe$1, 18);
            let b0 = _block;
            let _block$1;
            let _pipe$2 = byte1;
            let _pipe$3 = bitwise_and(_pipe$2, 63);
            _block$1 = bitwise_shift_left(_pipe$3, 12);
            let b1 = _block$1;
            let _block$2;
            let _pipe$4 = byte2;
            let _pipe$5 = bitwise_and(_pipe$4, 63);
            _block$2 = bitwise_shift_left(_pipe$5, 6);
            let b2 = _block$2;
            let _block$3;
            let _pipe$6 = byte3;
            _block$3 = bitwise_and(_pipe$6, 63);
            let b3 = _block$3;
            let _block$4;
            let _pipe$7 = b0;
            let _pipe$8 = bitwise_or(_pipe$7, b1);
            let _pipe$9 = bitwise_or(_pipe$8, b2);
            _block$4 = bitwise_or(_pipe$9, b3);
            let result = _block$4;
            return new Ok([result, stream$1]);
          }
        }
      }
    }
  } else if (stream.hasLength(0)) {
    return new Error2(new UnicodeLexerEoi());
  } else {
    return new Error2(new UnicodeLexerMalformed());
  }
}
function uchar_utf8(stream) {
  if (stream.atLeastLength(1)) {
    let byte0 = stream.head;
    let bytes = stream.tail;
    if (0 <= byte0 && byte0 <= 127) {
      let n = byte0;
      return new Ok([byte0, bytes]);
    } else if (128 <= byte0 && byte0 <= 193) {
      let n = byte0;
      return new Error2(new UnicodeLexerMalformed());
    } else if (194 <= byte0 && byte0 <= 223) {
      let n = byte0;
      return do_uchar_utf8_len2(bytes, byte0);
    } else if (224 <= byte0 && byte0 <= 239) {
      let n = byte0;
      return do_uchar_utf8_len3(bytes, byte0);
    } else if (240 <= byte0 && byte0 <= 244) {
      let n = byte0;
      return do_uchar_utf8_len4(bytes, byte0);
    } else {
      return new Error2(new UnicodeLexerMalformed());
    }
  } else {
    return new Error2(new UnicodeLexerEoi());
  }
}
function int16_be(stream) {
  if (stream.atLeastLength(2)) {
    let byte0 = stream.head;
    let byte1 = stream.tail.head;
    let stream$1 = stream.tail.tail;
    let _block;
    let _pipe = byte0;
    let _pipe$1 = bitwise_shift_left(_pipe, 8);
    _block = bitwise_or(_pipe$1, byte1);
    let char = _block;
    return new Ok([char, stream$1]);
  } else if (stream.hasLength(0)) {
    return new Error2(new UnicodeLexerEoi());
  } else {
    return new Error2(new UnicodeLexerMalformed());
  }
}
function int16_le(stream) {
  if (stream.atLeastLength(2)) {
    let byte0 = stream.head;
    let byte1 = stream.tail.head;
    let stream$1 = stream.tail.tail;
    let _block;
    let _pipe = byte1;
    let _pipe$1 = bitwise_shift_left(_pipe, 8);
    _block = bitwise_or(_pipe$1, byte0);
    let char = _block;
    return new Ok([char, stream$1]);
  } else if (stream.hasLength(0)) {
    return new Error2(new UnicodeLexerEoi());
  } else {
    return new Error2(new UnicodeLexerMalformed());
  }
}
function uchar_utf16(int16) {
  return (stream) => {
    let $ = int16(stream);
    if (!$.isOk()) {
      let e = $[0];
      return new Error2(e);
    } else {
      let char0 = $[0][0];
      let stream$1 = $[0][1];
      if (char0 < 55296 || char0 > 57343) {
        let char0$1 = char0;
        return new Ok([char0$1, stream$1]);
      } else if (char0 > 56319) {
        let char0$1 = char0;
        return new Error2(new UnicodeLexerMalformed());
      } else {
        let char0$1 = char0;
        let $1 = int16(stream$1);
        if (!$1.isOk()) {
          let e = $1[0];
          return new Error2(e);
        } else {
          let char1 = $1[0][0];
          let stream$2 = $1[0][1];
          let char = bitwise_or(
            bitwise_shift_left(bitwise_and(char0$1, 1023), 10),
            bitwise_and(char1, 1023)
          ) + 65536;
          return new Ok([char, stream$2]);
        }
      }
    }
  };
}
function uchar_ascii(stream) {
  if (stream.atLeastLength(1) && stream.head <= 127) {
    let byte = stream.head;
    let rest = stream.tail;
    return new Ok([byte, rest]);
  } else if (stream.hasLength(0)) {
    return new Error2(new UnicodeLexerEoi());
  } else {
    return new Error2(new UnicodeLexerMalformed());
  }
}
function name_to_string(name) {
  let uri = name.uri;
  let local = name.local;
  if (uri === "") {
    return inspect2(local);
  } else {
    let uri$1 = uri;
    return inspect2(uri$1 + ":" + local);
  }
}
function signal_start_stream() {
  return new Data("");
}
function position_to_string(position) {
  return "Position(line: " + to_string(position.line) + ", column: " + to_string(
    position.column
  ) + ")";
}
function internal_input_error_from_unicode_lexer_error(unicode_lexer_error) {
  if (unicode_lexer_error instanceof UnicodeLexerEoi) {
    return new UnicodeLexerErrorEoi();
  } else {
    return new UnicodeLexerErrorMalformed();
  }
}
function internal_error_message(input_error) {
  let bracket = (l, v, r) => {
    return l + v + r;
  };
  if (input_error instanceof ExpectedCharSeqs) {
    let expected = input_error.expected;
    let actual = input_error.actual;
    let expected$1 = fold(
      expected,
      "",
      (acc, v) => {
        return acc + bracket('"', v, '", ');
      }
    );
    return "expected one of these character sequence: " + expected$1 + 'found "' + actual + '"';
  } else if (input_error instanceof ExpectedRootElement) {
    return "expected root element";
  } else if (input_error instanceof IllegalCharRef) {
    let msg = input_error[0];
    return bracket("illegal character reference (#", msg, ")");
  } else if (input_error instanceof IllegalCharSeq) {
    let msg = input_error[0];
    return bracket('character sequence illegal here ("', msg, '")');
  } else if (input_error instanceof MalformedCharStream) {
    return "malformed character stream";
  } else if (input_error instanceof MaxBufferSize) {
    return "maximal buffer size exceeded";
  } else if (input_error instanceof UnexpectedEoi) {
    return "unexpected end of input";
  } else if (input_error instanceof UnknownEncoding) {
    let msg = input_error[0];
    return bracket("unknown encoding (", msg, ")");
  } else if (input_error instanceof UnknownEntityRef) {
    let msg = input_error[0];
    return bracket("unknown entity reference (", msg, ")");
  } else if (input_error instanceof UnknownNsPrefix) {
    let msg = input_error[0];
    return bracket("unknown namespace prefix (", msg, ")");
  } else if (input_error instanceof UnicodeLexerErrorEoi) {
    return "unicode lexer error eoi";
  } else if (input_error instanceof UnicodeLexerErrorMalformed) {
    return "unicode lexer error malformed";
  } else {
    let msg = input_error[0];
    return bracket("invalid argument (", msg, ")");
  }
}
function input_error_new(input2, input_error) {
  return new InputError(new Position(input2.line, input2.column), input_error);
}
function make_input_uchar(uchar_lexer) {
  return (input2) => {
    let $ = uchar_lexer(input2.stream);
    if (!$.isOk()) {
      let e = $[0];
      return new Error2(
        input_error_new(input2, internal_input_error_from_unicode_lexer_error(e))
      );
    } else {
      let uchar = $[0][0];
      let stream = $[0][1];
      let _block;
      let _record = input2;
      _block = new Input(
        _record.encoding,
        _record.strip,
        _record.namespace_callback,
        _record.entity_callback,
        _record.uchar,
        stream,
        _record.char,
        _record.cr,
        _record.line,
        _record.column,
        _record.limit,
        _record.peek,
        _record.stripping,
        _record.last_whitespace,
        _record.scopes,
        _record.ns,
        _record.identifier,
        _record.data
      );
      let input$1 = _block;
      return new Ok([uchar, input$1]);
    }
  };
}
function input_uchar_byte() {
  return make_input_uchar(uchar_byte);
}
function input_uchar_iso_8859_1() {
  return make_input_uchar(uchar_iso_8859_1);
}
function input_uchar_iso_8859_15() {
  return make_input_uchar(uchar_iso_8859_15);
}
function input_uchar_utf8() {
  return make_input_uchar(uchar_utf8);
}
function input_uchar_utf16be() {
  return make_input_uchar(uchar_utf16(int16_be));
}
function input_uchar_utf16le() {
  return make_input_uchar(uchar_utf16(int16_le));
}
function input_uchar_ascii() {
  return make_input_uchar(uchar_ascii);
}
function input_error_to_string(input_error) {
  let position = input_error[0];
  let input_error$1 = input_error[1];
  return "ERROR " + position_to_string(position) + " " + internal_error_message(
    input_error$1
  );
}
function error(input2, err) {
  return new Error2(new InputError(new Position(input2.line, input2.column), err));
}
function error_expected_seqs(input2, expected, actual) {
  return error(input2, new ExpectedCharSeqs(expected, actual));
}
function with_stripping(input2, stripping) {
  let _record = input2;
  return new Input(
    _record.encoding,
    _record.strip,
    _record.namespace_callback,
    _record.entity_callback,
    _record.uchar,
    _record.stream,
    _record.char,
    _record.cr,
    _record.line,
    _record.column,
    _record.limit,
    _record.peek,
    stripping,
    _record.last_whitespace,
    _record.scopes,
    _record.ns,
    _record.identifier,
    _record.data
  );
}
function is_in_range(uchar, low, high) {
  return low <= uchar && uchar <= high;
}
function is_whitespace(int5) {
  if (int5 === 32) {
    return true;
  } else if (int5 === 9) {
    return true;
  } else if (int5 === 13) {
    return true;
  } else if (int5 === 10) {
    return true;
  } else {
    return false;
  }
}
function is_char(uchar) {
  if (32 <= uchar && uchar <= 55295) {
    let uchar$1 = uchar;
    return true;
  } else if (uchar === 9) {
    return true;
  } else if (uchar === 10) {
    return true;
  } else if (uchar === 13) {
    return true;
  } else if (57344 <= uchar && uchar <= 65533) {
    let uchar$1 = uchar;
    return true;
  } else if (65536 <= uchar && uchar <= 1114111) {
    let uchar$1 = uchar;
    return true;
  } else {
    return false;
  }
}
function is_digit(uchar) {
  let _pipe = uchar;
  return is_in_range(_pipe, 48, 57);
}
function is_hex_digit(uchar) {
  return is_in_range(uchar, 48, 57) || is_in_range(uchar, 65, 70) || is_in_range(
    uchar,
    97,
    102
  );
}
function is_common_range(uchar) {
  return is_in_range(uchar, 192, 214) || is_in_range(
    uchar,
    216,
    246
  ) || is_in_range(uchar, 248, 767) || is_in_range(uchar, 880, 893) || is_in_range(
    uchar,
    895,
    8191
  ) || is_in_range(uchar, 8204, 8205) || is_in_range(
    uchar,
    8304,
    8591
  ) || is_in_range(uchar, 11264, 12271) || is_in_range(
    uchar,
    12289,
    55295
  ) || is_in_range(uchar, 63744, 64975) || is_in_range(
    uchar,
    65008,
    65533
  ) || is_in_range(uchar, 65536, 983039);
}
function is_name_start_char(uchar) {
  return !is_whitespace(uchar) && (is_in_range(uchar, 97, 122) || is_in_range(
    uchar,
    65,
    90
  ) || uchar === 95 || is_common_range(uchar));
}
function is_name_char(uchar) {
  return !is_whitespace(uchar) && (is_in_range(uchar, 97, 122) || is_in_range(
    uchar,
    65,
    90
  ) || is_in_range(uchar, 48, 57) || uchar === 95 || uchar === 45 || uchar === 46 || uchar === 183 || is_common_range(
    uchar
  ) || is_in_range(uchar, 768, 879) || is_in_range(uchar, 8255, 8256));
}
function expand_name(input2, name) {
  let prefix = name.uri;
  let local = name.local;
  let external_ = (prefix2) => {
    let $2 = input2.namespace_callback(prefix2);
    if ($2 instanceof None) {
      return error(input2, new UnknownNsPrefix(prefix2));
    } else {
      let uri = $2[0];
      return new Ok(uri);
    }
  };
  let $ = map_get(input2.ns, prefix);
  if ($.isOk()) {
    let uri = $[0];
    let $1 = !is_empty(uri);
    if ($1) {
      return new Ok(new Name(uri, local));
    } else {
      let $2 = is_empty(prefix);
      if ($2) {
        return new Ok(new Name("", local));
      } else {
        let $3 = external_(prefix);
        if ($3.isOk()) {
          let uri$1 = $3[0];
          return new Ok(new Name(uri$1, local));
        } else {
          let msg = $3[0];
          return new Error2(msg);
        }
      }
    }
  } else {
    let $1 = external_(prefix);
    if ($1.isOk()) {
      let uri = $1[0];
      return new Ok(new Name(uri, local));
    } else {
      let msg = $1[0];
      return new Error2(msg);
    }
  }
}
function predefined_entities() {
  let _pipe = new_map();
  let _pipe$1 = insert(_pipe, "lt", "<");
  let _pipe$2 = insert(_pipe$1, "gt", ">");
  let _pipe$3 = insert(_pipe$2, "amp", "&");
  let _pipe$4 = insert(_pipe$3, "apos", "'");
  return insert(_pipe$4, "quot", '"');
}
function buffer_new() {
  return toList([]);
}
function buffer_add_uchar(buffer, uchar) {
  let $ = uchar <= 127;
  if ($) {
    return prepend(uchar, buffer);
  } else {
    let $1 = uchar <= 2047;
    if ($1) {
      return prepend(
        bitwise_or(128, bitwise_and(uchar, 63)),
        prepend(
          bitwise_or(192, bitwise_shift_right(uchar, 6)),
          buffer
        )
      );
    } else {
      let $2 = uchar <= 65535;
      if ($2) {
        return prepend(
          bitwise_or(128, bitwise_and(uchar, 63)),
          prepend(
            bitwise_or(
              128,
              bitwise_and(bitwise_shift_right(uchar, 6), 63)
            ),
            prepend(
              bitwise_or(224, bitwise_shift_right(uchar, 12)),
              buffer
            )
          )
        );
      } else {
        return prepend(
          bitwise_or(128, bitwise_and(uchar, 63)),
          prepend(
            bitwise_or(
              128,
              bitwise_and(bitwise_shift_right(uchar, 6), 63)
            ),
            prepend(
              bitwise_or(
                128,
                bitwise_and(bitwise_shift_right(uchar, 12), 63)
              ),
              prepend(
                bitwise_or(240, bitwise_shift_right(uchar, 18)),
                buffer
              )
            )
          )
        );
      }
    }
  }
}
function add_char_to_identifier(input2, char) {
  let _record = input2;
  return new Input(
    _record.encoding,
    _record.strip,
    _record.namespace_callback,
    _record.entity_callback,
    _record.uchar,
    _record.stream,
    _record.char,
    _record.cr,
    _record.line,
    _record.column,
    _record.limit,
    _record.peek,
    _record.stripping,
    _record.last_whitespace,
    _record.scopes,
    _record.ns,
    buffer_add_uchar(input2.identifier, char),
    _record.data
  );
}
function add_char_to_data(input2, char) {
  let _record = input2;
  return new Input(
    _record.encoding,
    _record.strip,
    _record.namespace_callback,
    _record.entity_callback,
    _record.uchar,
    _record.stream,
    _record.char,
    _record.cr,
    _record.line,
    _record.column,
    _record.limit,
    _record.peek,
    _record.stripping,
    _record.last_whitespace,
    _record.scopes,
    _record.ns,
    _record.identifier,
    buffer_add_uchar(input2.data, char)
  );
}
function buffer_clear(_) {
  return toList([]);
}
function clear_identifier(input2) {
  let _record = input2;
  return new Input(
    _record.encoding,
    _record.strip,
    _record.namespace_callback,
    _record.entity_callback,
    _record.uchar,
    _record.stream,
    _record.char,
    _record.cr,
    _record.line,
    _record.column,
    _record.limit,
    _record.peek,
    _record.stripping,
    _record.last_whitespace,
    _record.scopes,
    _record.ns,
    buffer_clear(input2.identifier),
    _record.data
  );
}
function clear_data(input2) {
  let _record = input2;
  return new Input(
    _record.encoding,
    _record.strip,
    _record.namespace_callback,
    _record.entity_callback,
    _record.uchar,
    _record.stream,
    _record.char,
    _record.cr,
    _record.line,
    _record.column,
    _record.limit,
    _record.peek,
    _record.stripping,
    _record.last_whitespace,
    _record.scopes,
    _record.ns,
    _record.identifier,
    buffer_clear(input2.data)
  );
}
function buffer_to_string(buffer) {
  let _pipe = reverse(buffer);
  return int_list_to_string(_pipe);
}
function input_identifier_to_string(input2) {
  let _pipe = input2.identifier;
  return buffer_to_string(_pipe);
}
function input_data_to_string(input2) {
  let _pipe = input2.data;
  return buffer_to_string(_pipe);
}
function string_from_char(char) {
  let _pipe = buffer_new();
  let _pipe$1 = buffer_add_uchar(_pipe, char);
  return buffer_to_string(_pipe$1);
}
function error_illegal_char(input2, uchar) {
  return error(input2, new IllegalCharSeq(string_from_char(uchar)));
}
function error_expected_chars(input2, expected) {
  let expected$1 = map(expected, string_from_char);
  return error(
    input2,
    new ExpectedCharSeqs(expected$1, string_from_char(input2.char))
  );
}
var u_eoi = 9007199254740991;
var u_start_doc = 9007199254740990;
var u_end_doc = 9007199254740989;
var u_nl = 10;
var u_cr = 13;
function next_char(input2) {
  let $ = input2.char === u_eoi;
  if ($) {
    return error(input2, new UnexpectedEoi());
  } else {
    let _block;
    let $1 = input2.char === u_nl;
    if ($1) {
      let _record = input2;
      _block = new Input(
        _record.encoding,
        _record.strip,
        _record.namespace_callback,
        _record.entity_callback,
        _record.uchar,
        _record.stream,
        _record.char,
        _record.cr,
        input2.line + 1,
        1,
        _record.limit,
        _record.peek,
        _record.stripping,
        _record.last_whitespace,
        _record.scopes,
        _record.ns,
        _record.identifier,
        _record.data
      );
    } else {
      let _record = input2;
      _block = new Input(
        _record.encoding,
        _record.strip,
        _record.namespace_callback,
        _record.entity_callback,
        _record.uchar,
        _record.stream,
        _record.char,
        _record.cr,
        _record.line,
        input2.column + 1,
        _record.limit,
        _record.peek,
        _record.stripping,
        _record.last_whitespace,
        _record.scopes,
        _record.ns,
        _record.identifier,
        _record.data
      );
    }
    let input$1 = _block;
    let $2 = input$1.uchar(input$1);
    if (!$2.isOk()) {
      let e = $2[0];
      return new Error2(e);
    } else {
      let char = $2[0][0];
      let input$2 = $2[0][1];
      let _block$1;
      let _record = input$2;
      _block$1 = new Input(
        _record.encoding,
        _record.strip,
        _record.namespace_callback,
        _record.entity_callback,
        _record.uchar,
        _record.stream,
        char,
        _record.cr,
        _record.line,
        _record.column,
        _record.limit,
        _record.peek,
        _record.stripping,
        _record.last_whitespace,
        _record.scopes,
        _record.ns,
        _record.identifier,
        _record.data
      );
      let input$3 = _block$1;
      let $3 = !is_char(input$3.char);
      if ($3) {
        return error(input$3, new MalformedCharStream());
      } else {
        let _block$2;
        let $4 = input$3.cr && input$3.char === u_nl;
        if (!$4) {
          _block$2 = new Ok(input$3);
        } else {
          let $5 = input$3.uchar(input$3);
          if (!$5.isOk()) {
            let e = $5[0];
            _block$2 = new Error2(e);
          } else {
            let char$1 = $5[0][0];
            let input$42 = $5[0][1];
            _block$2 = new Ok(
              (() => {
                let _record$1 = input$42;
                return new Input(
                  _record$1.encoding,
                  _record$1.strip,
                  _record$1.namespace_callback,
                  _record$1.entity_callback,
                  _record$1.uchar,
                  _record$1.stream,
                  char$1,
                  _record$1.cr,
                  _record$1.line,
                  _record$1.column,
                  _record$1.limit,
                  _record$1.peek,
                  _record$1.stripping,
                  _record$1.last_whitespace,
                  _record$1.scopes,
                  _record$1.ns,
                  _record$1.identifier,
                  _record$1.data
                );
              })()
            );
          }
        }
        let input$4 = _block$2;
        if (!input$4.isOk()) {
          let e = input$4[0];
          return new Error2(e);
        } else {
          let input$5 = input$4[0];
          let _block$3;
          let $5 = input$5.char === u_cr;
          if ($5) {
            let _record$1 = input$5;
            _block$3 = new Input(
              _record$1.encoding,
              _record$1.strip,
              _record$1.namespace_callback,
              _record$1.entity_callback,
              _record$1.uchar,
              _record$1.stream,
              u_nl,
              true,
              _record$1.line,
              _record$1.column,
              _record$1.limit,
              _record$1.peek,
              _record$1.stripping,
              _record$1.last_whitespace,
              _record$1.scopes,
              _record$1.ns,
              _record$1.identifier,
              _record$1.data
            );
          } else {
            let _record$1 = input$5;
            _block$3 = new Input(
              _record$1.encoding,
              _record$1.strip,
              _record$1.namespace_callback,
              _record$1.entity_callback,
              _record$1.uchar,
              _record$1.stream,
              _record$1.char,
              false,
              _record$1.line,
              _record$1.column,
              _record$1.limit,
              _record$1.peek,
              _record$1.stripping,
              _record$1.last_whitespace,
              _record$1.scopes,
              _record$1.ns,
              _record$1.identifier,
              _record$1.data
            );
          }
          let input$6 = _block$3;
          return new Ok(input$6);
        }
      }
    }
  }
}
function next_char_eof(input2) {
  let $ = next_char(input2);
  if (!$.isOk() && $[0] instanceof InputError && $[0][1] instanceof UnicodeLexerErrorEoi) {
    return new Ok(
      (() => {
        let _record = input2;
        return new Input(
          _record.encoding,
          _record.strip,
          _record.namespace_callback,
          _record.entity_callback,
          _record.uchar,
          _record.stream,
          u_eoi,
          _record.cr,
          _record.line,
          _record.column,
          _record.limit,
          _record.peek,
          _record.stripping,
          _record.last_whitespace,
          _record.scopes,
          _record.ns,
          _record.identifier,
          _record.data
        );
      })()
    );
  } else if (!$.isOk()) {
    let e = $;
    return e;
  } else {
    let input$1 = $[0];
    return new Ok(input$1);
  }
}
function skip_whitespace(loop$input) {
  while (true) {
    let input2 = loop$input;
    let $ = !is_whitespace(input2.char);
    if ($) {
      return new Ok(input2);
    } else {
      let $1 = next_char(input2);
      if (!$1.isOk()) {
        let e = $1[0];
        return new Error2(e);
      } else {
        let input$1 = $1[0];
        loop$input = input$1;
      }
    }
  }
}
function skip_whitespace_eof(loop$input) {
  while (true) {
    let input2 = loop$input;
    let $ = is_whitespace(input2.char);
    if ($) {
      let $1 = next_char_eof(input2);
      if (!$1.isOk()) {
        let e = $1[0];
        return new Error2(e);
      } else {
        let input$1 = $1[0];
        loop$input = input$1;
      }
    } else {
      return new Ok(input2);
    }
  }
}
function accept(input2, char) {
  let $ = input2.char === char;
  if ($) {
    return next_char(input2);
  } else {
    return error_expected_chars(input2, toList([char]));
  }
}
function parse_ncname__loop(loop$input) {
  while (true) {
    let input2 = loop$input;
    let $ = is_name_char(input2.char);
    if (!$) {
      return new Ok(input2);
    } else {
      let input$1 = add_char_to_identifier(input2, input2.char);
      let $1 = next_char(input$1);
      if (!$1.isOk()) {
        let e = $1[0];
        return new Error2(e);
      } else {
        let input$2 = $1[0];
        loop$input = input$2;
      }
    }
  }
}
function parse_ncname(input2) {
  let input$1 = clear_identifier(input2);
  let $ = !is_name_start_char(input$1.char);
  if ($) {
    return error_illegal_char(input$1, input$1.char);
  } else {
    let input$2 = add_char_to_identifier(input$1, input$1.char);
    let $1 = next_char(input$2);
    if (!$1.isOk()) {
      let e = $1[0];
      return new Error2(e);
    } else {
      let input$3 = $1[0];
      let $2 = parse_ncname__loop(input$3);
      if (!$2.isOk()) {
        let e = $2[0];
        return new Error2(e);
      } else {
        let input$4 = $2[0];
        let name = input_identifier_to_string(input$4);
        return new Ok([name, input$4]);
      }
    }
  }
}
function eat_cdata_lbrack(input2) {
  let input$1 = add_char_to_identifier(input2, input2.char);
  return try$(
    next_char(input$1),
    (input3) => {
      let input$12 = add_char_to_identifier(input3, input3.char);
      return try$(
        next_char(input$12),
        (input4) => {
          let input$13 = add_char_to_identifier(input4, input4.char);
          return try$(
            next_char(input$13),
            (input5) => {
              let input$14 = add_char_to_identifier(input5, input5.char);
              return try$(
                next_char(input$14),
                (input6) => {
                  let input$15 = add_char_to_identifier(input6, input6.char);
                  return try$(
                    next_char(input$15),
                    (input7) => {
                      let input$16 = add_char_to_identifier(input7, input7.char);
                      return next_char(input$16);
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
}
function parse_dtd_signal__loop__loop(loop$input, loop$quot_or_apos) {
  while (true) {
    let input2 = loop$input;
    let quot_or_apos = loop$quot_or_apos;
    let $ = input2.char === quot_or_apos;
    if ($) {
      return new Ok(input2);
    } else {
      let input$1 = add_char_to_data(input2, input2.char);
      let $1 = next_char(input$1);
      if (!$1.isOk()) {
        let e = $1[0];
        return new Error2(e);
      } else {
        let input$2 = $1[0];
        loop$input = input$2;
        loop$quot_or_apos = quot_or_apos;
      }
    }
  }
}
var u_space = 32;
function add_char_to_data_strip(input2, char) {
  let $ = is_whitespace(char);
  if ($) {
    let _record = input2;
    return new Input(
      _record.encoding,
      _record.strip,
      _record.namespace_callback,
      _record.entity_callback,
      _record.uchar,
      _record.stream,
      _record.char,
      _record.cr,
      _record.line,
      _record.column,
      _record.limit,
      _record.peek,
      _record.stripping,
      true,
      _record.scopes,
      _record.ns,
      _record.identifier,
      _record.data
    );
  } else {
    let _block;
    let $1 = input2.last_whitespace;
    let $2 = input2.data;
    if ($2.hasLength(0)) {
      _block = input2;
    } else if (!$1) {
      _block = input2;
    } else {
      _block = add_char_to_data(input2, u_space);
    }
    let input$1 = _block;
    let _block$1;
    let _record = input$1;
    _block$1 = new Input(
      _record.encoding,
      _record.strip,
      _record.namespace_callback,
      _record.entity_callback,
      _record.uchar,
      _record.stream,
      _record.char,
      _record.cr,
      _record.line,
      _record.column,
      _record.limit,
      _record.peek,
      _record.stripping,
      false,
      _record.scopes,
      _record.ns,
      _record.identifier,
      _record.data
    );
    let input$2 = _block$1;
    return add_char_to_data(input$2, char);
  }
}
var u_quot = 34;
var u_sharp = 35;
var u_amp = 38;
var u_apos = 39;
var u_minus = 45;
function parse_limit__comment(input2) {
  let $ = next_char(input2);
  if (!$.isOk()) {
    let e = $[0];
    return new Error2(e);
  } else {
    let input$1 = $[0];
    let $1 = accept(input$1, u_minus);
    if (!$1.isOk()) {
      let e = $1[0];
      return new Error2(e);
    } else {
      let input$2 = $1[0];
      return new Ok([new LimitComment(), input$2]);
    }
  }
}
function skip_comment__loop(loop$input) {
  while (true) {
    let input2 = loop$input;
    let $ = input2.char !== u_minus;
    if ($) {
      let $1 = next_char(input2);
      if (!$1.isOk()) {
        let e = $1[0];
        return new Error2(e);
      } else {
        let input$1 = $1[0];
        loop$input = input$1;
      }
    } else {
      return new Ok(input2);
    }
  }
}
var u_slash = 47;
var u_colon = 58;
function parse_qname(input2) {
  let $ = parse_ncname(input2);
  if (!$.isOk()) {
    let e = $[0];
    return new Error2(e);
  } else {
    let name = $[0][0];
    let input$1 = $[0][1];
    let $1 = input$1.char !== u_colon;
    if ($1) {
      return new Ok([new Name("", name), input$1]);
    } else {
      let $2 = next_char(input$1);
      if (!$2.isOk()) {
        let e = $2[0];
        return new Error2(e);
      } else {
        let input$2 = $2[0];
        let $3 = parse_ncname(input$2);
        if (!$3.isOk()) {
          let e = $3[0];
          return new Error2(e);
        } else {
          let local_name = $3[0][0];
          let input$3 = $3[0][1];
          return new Ok([new Name(name, local_name), input$3]);
        }
      }
    }
  }
}
function parse_limit__pi(input2) {
  let $ = next_char(input2);
  if (!$.isOk()) {
    let e = $[0];
    return new Error2(e);
  } else {
    let input$1 = $[0];
    let $1 = parse_qname(input$1);
    if (!$1.isOk()) {
      let e = $1[0];
      return new Error2(e);
    } else {
      let name = $1[0][0];
      let input$2 = $1[0][1];
      return new Ok([new LimitPi(name), input$2]);
    }
  }
}
function parse_limit__end_tag(input2) {
  let $ = next_char(input2);
  if (!$.isOk()) {
    let e = $[0];
    return new Error2(e);
  } else {
    let input$1 = $[0];
    let $1 = parse_qname(input$1);
    if (!$1.isOk()) {
      let e = $1[0];
      return new Error2(e);
    } else {
      let name = $1[0][0];
      let input$2 = $1[0][1];
      let $2 = skip_whitespace(input$2);
      if (!$2.isOk()) {
        let e = $2[0];
        return new Error2(e);
      } else {
        let input$3 = $2[0];
        return new Ok([new LimitEndTag(name), input$3]);
      }
    }
  }
}
function parse_limit__start_tag(input2) {
  let $ = parse_qname(input2);
  if (!$.isOk()) {
    let e = $[0];
    return new Error2(e);
  } else {
    let name = $[0][0];
    let input$1 = $[0][1];
    return new Ok([new LimitStartTag(name), input$1]);
  }
}
var u_scolon = 59;
function parse_char_reference__loop2(loop$input, loop$c) {
  while (true) {
    let input2 = loop$input;
    let c = loop$c;
    let $ = input2.char === u_scolon;
    if ($) {
      return new Ok(new LoopDoneByCondition([c, input2]));
    } else {
      let input$1 = add_char_to_identifier(input2, input2.char);
      let $1 = !is_digit(input$1.char);
      if ($1) {
        return new Ok(new LoopDoneExited([c, input$1]));
      } else {
        let c$1 = c * 10 + (input$1.char - 48);
        let $2 = next_char(input$1);
        if (!$2.isOk()) {
          let e = $2[0];
          return new Error2(e);
        } else {
          let input$2 = $2[0];
          loop$input = input$2;
          loop$c = c$1;
        }
      }
    }
  }
}
function parse_char_reference__loop3(loop$input) {
  while (true) {
    let input2 = loop$input;
    let $ = input2.char === u_scolon;
    if ($) {
      return new Ok(input2);
    } else {
      let input$1 = add_char_to_identifier(input2, input2.char);
      let $1 = next_char(input$1);
      if (!$1.isOk()) {
        let e = $1[0];
        return new Error2(e);
      } else {
        let input$2 = $1[0];
        loop$input = input$2;
      }
    }
  }
}
function parse_entity_reference(input2, predefined_entities2) {
  let $ = parse_ncname(input2);
  if (!$.isOk()) {
    let e = $[0];
    return new Error2(e);
  } else {
    let entity = $[0][0];
    let input$1 = $[0][1];
    let $1 = accept(input$1, u_scolon);
    if (!$1.isOk()) {
      let e = $1[0];
      return new Error2(e);
    } else {
      let input$2 = $1[0];
      let $2 = map_get(predefined_entities2, entity);
      if ($2.isOk()) {
        let replacement = $2[0];
        return new Ok([replacement, input$2]);
      } else {
        let $3 = input$2.entity_callback(entity);
        if ($3 instanceof Some) {
          let replacement = $3[0];
          return new Ok([replacement, input$2]);
        } else {
          return error(input$2, new UnknownEntityRef(entity));
        }
      }
    }
  }
}
var u_lt = 60;
var u_eq = 61;
var u_gt = 62;
function skip_comment(loop$input) {
  while (true) {
    let input2 = loop$input;
    let $ = skip_comment__loop(input2);
    if (!$.isOk()) {
      let e = $[0];
      return new Error2(e);
    } else {
      let input$1 = $[0];
      let $1 = next_char(input$1);
      if (!$1.isOk()) {
        let e = $1[0];
        return new Error2(e);
      } else {
        let input$2 = $1[0];
        let $2 = input$2.char !== u_minus;
        if ($2) {
          loop$input = input$2;
        } else {
          let $3 = next_char(input$2);
          if (!$3.isOk()) {
            let e = $3[0];
            return new Error2(e);
          } else {
            let input$3 = $3[0];
            let $4 = input$3.char !== u_gt;
            if ($4) {
              return error_expected_chars(input$3, toList([u_gt]));
            } else {
              return next_char_eof(input$3);
            }
          }
        }
      }
    }
  }
}
function next_char_then_skip_comment(input2) {
  let $ = next_char(input2);
  if (!$.isOk()) {
    let e = $[0];
    return new Error2(e);
  } else {
    let input$1 = $[0];
    return skip_comment(input$1);
  }
}
var u_qmark = 63;
function skip_pi__loop(loop$input) {
  while (true) {
    let input2 = loop$input;
    let $ = input2.char !== u_qmark;
    if ($) {
      let $1 = next_char(input2);
      if ($1.isOk()) {
        let input$1 = $1[0];
        loop$input = input$1;
      } else {
        let e = $1;
        return e;
      }
    } else {
      return new Ok(input2);
    }
  }
}
function skip_pi(loop$input) {
  while (true) {
    let input2 = loop$input;
    let $ = skip_pi__loop(input2);
    if (!$.isOk()) {
      let e = $[0];
      return new Error2(e);
    } else {
      let input$1 = $[0];
      let $1 = next_char(input$1);
      if (!$1.isOk()) {
        let e = $1[0];
        return new Error2(e);
      } else {
        let input$2 = $1[0];
        let $2 = input$2.char !== u_gt;
        if ($2) {
          loop$input = input$2;
        } else {
          return next_char_eof(input$2);
        }
      }
    }
  }
}
var u_emark = 33;
function parse_dtd_signal__loop(loop$input, loop$nest) {
  while (true) {
    let input2 = loop$input;
    let nest = loop$nest;
    let $ = nest <= 0;
    if ($) {
      return new Ok(input2);
    } else {
      let $1 = input2.char === u_lt;
      if ($1) {
        let $2 = next_char(input2);
        if (!$2.isOk()) {
          let e = $2[0];
          return new Error2(e);
        } else {
          let input$1 = $2[0];
          let $3 = input$1.char !== u_emark;
          if ($3) {
            let input$2 = add_char_to_data(input$1, u_lt);
            loop$input = input$2;
            loop$nest = nest + 1;
          } else {
            let $4 = next_char(input$1);
            if (!$4.isOk()) {
              let e = $4[0];
              return new Error2(e);
            } else {
              let input$2 = $4[0];
              let $5 = input$2.char !== u_minus;
              if ($5) {
                let input$3 = add_char_to_data(input$2, u_lt);
                let input$4 = add_char_to_data(input$3, u_emark);
                loop$input = input$4;
                loop$nest = nest + 1;
              } else {
                let $6 = next_char(input$2);
                if (!$6.isOk()) {
                  let e = $6[0];
                  return new Error2(e);
                } else {
                  let input$3 = $6[0];
                  let $7 = input$3.char !== u_minus;
                  if ($7) {
                    let input$4 = add_char_to_data(input$3, u_lt);
                    let input$5 = add_char_to_data(input$4, u_emark);
                    let input$6 = add_char_to_data(input$5, u_minus);
                    loop$input = input$6;
                    loop$nest = nest + 1;
                  } else {
                    let $8 = next_char_then_skip_comment(input$3);
                    if (!$8.isOk()) {
                      let e = $8[0];
                      return new Error2(e);
                    } else {
                      let input$4 = $8[0];
                      loop$input = input$4;
                      loop$nest = nest;
                    }
                  }
                }
              }
            }
          }
        }
      } else {
        let $2 = input2.char === u_quot || input2.char === u_apos;
        if ($2) {
          let quot_or_apos = input2.char;
          let input$1 = add_char_to_data(input2, quot_or_apos);
          let $3 = next_char(input$1);
          if (!$3.isOk()) {
            let e = $3[0];
            return new Error2(e);
          } else {
            let input$2 = $3[0];
            let $4 = parse_dtd_signal__loop__loop(input$2, quot_or_apos);
            if (!$4.isOk()) {
              let e = $4[0];
              return new Error2(e);
            } else {
              let input$3 = $4[0];
              let input$4 = add_char_to_data(input$3, quot_or_apos);
              let $5 = next_char(input$4);
              if (!$5.isOk()) {
                let e = $5[0];
                return new Error2(e);
              } else {
                let input$5 = $5[0];
                loop$input = input$5;
                loop$nest = nest;
              }
            }
          }
        } else {
          let _block;
          let $3 = input2.char === u_gt;
          if ($3) {
            _block = nest - 1;
          } else {
            _block = nest;
          }
          let nest$1 = _block;
          let input$1 = add_char_to_data(input2, input2.char);
          let $4 = next_char(input$1);
          if (!$4.isOk()) {
            let e = $4[0];
            return new Error2(e);
          } else {
            let input$2 = $4[0];
            loop$input = input$2;
            loop$nest = nest$1;
          }
        }
      }
    }
  }
}
var u_rbrack = 93;
function parse_chardata__loop(loop$input, loop$add_char) {
  while (true) {
    let input2 = loop$input;
    let add_char = loop$add_char;
    let $ = input2.char === u_rbrack;
    if (!$) {
      return new Ok(input2);
    } else {
      let input$1 = add_char(input2, input2.char);
      let $1 = next_char(input$1);
      if (!$1.isOk()) {
        let e = $1[0];
        return new Error2(e);
      } else {
        let input$2 = $1[0];
        loop$input = input$2;
        loop$add_char = add_char;
      }
    }
  }
}
function parse_chardata__handle_rbrack(input2, add_char) {
  let input$1 = add_char(input2, input2.char);
  let $ = next_char(input$1);
  if (!$.isOk()) {
    let e = $[0];
    return new Error2(e);
  } else {
    let input$2 = $[0];
    let $1 = input$2.char !== u_rbrack;
    if ($1) {
      return new Ok(input$2);
    } else {
      let input$3 = add_char(input$2, input$2.char);
      let $2 = next_char(input$3);
      if (!$2.isOk()) {
        let e = $2[0];
        return new Error2(e);
      } else {
        let input$4 = $2[0];
        let $3 = parse_chardata__loop(input$4, add_char);
        if (!$3.isOk()) {
          let e = $3[0];
          return new Error2(e);
        } else {
          let input$5 = $3[0];
          let $4 = input$5.char === u_gt;
          if ($4) {
            return error(input$5, new IllegalCharSeq("]]>"));
          } else {
            return new Ok(input$5);
          }
        }
      }
    }
  }
}
function parse_cdata__loop__eat_rbrackets(loop$input, loop$add_char) {
  while (true) {
    let input2 = loop$input;
    let add_char = loop$add_char;
    let $ = input2.char !== u_rbrack;
    if ($) {
      return new Ok([input2, new Go()]);
    } else {
      let $1 = next_char(input2);
      if (!$1.isOk()) {
        let e = $1[0];
        return new Error2(e);
      } else {
        let input$1 = $1[0];
        let $2 = input$1.char === u_gt;
        if ($2) {
          let $3 = next_char(input$1);
          if (!$3.isOk()) {
            let e = $3[0];
            return new Error2(e);
          } else {
            let input$2 = $3[0];
            return new Ok([input$2, new Stop()]);
          }
        } else {
          let input$2 = add_char(input$1, u_rbrack);
          loop$input = input$2;
          loop$add_char = add_char;
        }
      }
    }
  }
}
function parse_cdata__loop(loop$input, loop$add_char, loop$stop_or_go) {
  while (true) {
    let input2 = loop$input;
    let add_char = loop$add_char;
    let stop_or_go = loop$stop_or_go;
    let $ = isEqual(stop_or_go, new Stop());
    if ($) {
      return new Ok(input2);
    } else {
      let $1 = input2.char !== u_rbrack;
      if ($1) {
        let input$1 = add_char(input2, input2.char);
        let $2 = next_char(input$1);
        if (!$2.isOk()) {
          let e = $2[0];
          return new Error2(e);
        } else {
          let input$2 = $2[0];
          loop$input = input$2;
          loop$add_char = add_char;
          loop$stop_or_go = stop_or_go;
        }
      } else {
        let $2 = next_char(input2);
        if (!$2.isOk()) {
          let e = $2[0];
          return new Error2(e);
        } else {
          let input$1 = $2[0];
          let $3 = parse_cdata__loop__eat_rbrackets(input$1, add_char);
          if (!$3.isOk()) {
            let e = $3[0];
            return new Error2(e);
          } else {
            let input$2 = $3[0][0];
            let go = $3[0][1];
            let $4 = isEqual(go, new Stop());
            if ($4) {
              return new Ok(input$2);
            } else {
              let input$3 = add_char(input$2, u_rbrack);
              loop$input = input$3;
              loop$add_char = add_char;
              loop$stop_or_go = new Go();
            }
          }
        }
      }
    }
  }
}
function parse_cdata(input2, add_char) {
  return parse_cdata__loop(input2, add_char, new Go());
}
var u_x = 120;
var u_bom = 65279;
function find_encoding(input2) {
  let reset = (input3, uchar) => {
    let _block;
    let _record = input3;
    _block = new Input(
      _record.encoding,
      _record.strip,
      _record.namespace_callback,
      _record.entity_callback,
      uchar,
      _record.stream,
      _record.char,
      _record.cr,
      _record.line,
      0,
      _record.limit,
      _record.peek,
      _record.stripping,
      _record.last_whitespace,
      _record.scopes,
      _record.ns,
      _record.identifier,
      _record.data
    );
    let input$1 = _block;
    return next_char(input$1);
  };
  let $ = input2.encoding;
  if ($ instanceof None) {
    return try$(
      next_char(input2),
      (input3) => {
        let $1 = input3.char;
        if ($1 === 254) {
          return try$(
            next_char(input3),
            (input4) => {
              return lazy_guard(
                input4.char !== 255,
                () => {
                  return error(input4, new MalformedCharStream());
                },
                () => {
                  return try$(
                    reset(input4, input_uchar_utf16be()),
                    (input5) => {
                      return new Ok([true, input5]);
                    }
                  );
                }
              );
            }
          );
        } else if ($1 === 255) {
          return try$(
            next_char(input3),
            (input4) => {
              return lazy_guard(
                input4.char !== 254,
                () => {
                  return error(input4, new MalformedCharStream());
                },
                () => {
                  return try$(
                    reset(input4, input_uchar_utf16le()),
                    (input5) => {
                      return new Ok([true, input5]);
                    }
                  );
                }
              );
            }
          );
        } else if ($1 === 239) {
          return try$(
            next_char(input3),
            (input4) => {
              return lazy_guard(
                input4.char !== 187,
                () => {
                  return error(input4, new MalformedCharStream());
                },
                () => {
                  return try$(
                    next_char(input4),
                    (input5) => {
                      return lazy_guard(
                        input5.char !== 191,
                        () => {
                          return error(input5, new MalformedCharStream());
                        },
                        () => {
                          return try$(
                            reset(input5, input_uchar_utf8()),
                            (input6) => {
                              return new Ok([true, input6]);
                            }
                          );
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        } else if ($1 === 60) {
          return new Ok(
            [
              false,
              (() => {
                let _record = input3;
                return new Input(
                  _record.encoding,
                  _record.strip,
                  _record.namespace_callback,
                  _record.entity_callback,
                  input_uchar_utf8(),
                  _record.stream,
                  _record.char,
                  _record.cr,
                  _record.line,
                  _record.column,
                  _record.limit,
                  _record.peek,
                  _record.stripping,
                  _record.last_whitespace,
                  _record.scopes,
                  _record.ns,
                  _record.identifier,
                  _record.data
                );
              })()
            ]
          );
        } else {
          return new Ok(
            [
              false,
              (() => {
                let _record = input3;
                return new Input(
                  _record.encoding,
                  _record.strip,
                  _record.namespace_callback,
                  _record.entity_callback,
                  input_uchar_utf8(),
                  _record.stream,
                  _record.char,
                  _record.cr,
                  _record.line,
                  _record.column,
                  _record.limit,
                  _record.peek,
                  _record.stripping,
                  _record.last_whitespace,
                  _record.scopes,
                  _record.ns,
                  _record.identifier,
                  _record.data
                );
              })()
            ]
          );
        }
      }
    );
  } else {
    let encoding = $[0];
    return try$(
      (() => {
        if (encoding instanceof UsAscii) {
          return reset(input2, input_uchar_ascii());
        } else if (encoding instanceof Iso8859x1) {
          return reset(input2, input_uchar_iso_8859_1());
        } else if (encoding instanceof Iso8859x15) {
          return reset(input2, input_uchar_iso_8859_15());
        } else if (encoding instanceof Utf8) {
          return try$(
            reset(input2, input_uchar_utf8()),
            (input3) => {
              return lazy_guard(
                input3.char === u_bom,
                () => {
                  let _block;
                  let _record = input3;
                  _block = new Input(
                    _record.encoding,
                    _record.strip,
                    _record.namespace_callback,
                    _record.entity_callback,
                    _record.uchar,
                    _record.stream,
                    _record.char,
                    _record.cr,
                    _record.line,
                    0,
                    _record.limit,
                    _record.peek,
                    _record.stripping,
                    _record.last_whitespace,
                    _record.scopes,
                    _record.ns,
                    _record.identifier,
                    _record.data
                  );
                  let input$1 = _block;
                  return try$(
                    next_char(input$1),
                    (input4) => {
                      return new Ok(input4);
                    }
                  );
                },
                () => {
                  return new Ok(input3);
                }
              );
            }
          );
        } else if (encoding instanceof Utf16) {
          return try$(
            next_char(input2),
            (input3) => {
              let byte0 = input3.char;
              return try$(
                next_char(input3),
                (input4) => {
                  let byte1 = input4.char;
                  if (byte0 === 254 && byte1 === 255) {
                    return reset(input4, input_uchar_utf16be());
                  } else if (byte0 === 255 && byte1 === 254) {
                    return reset(input4, input_uchar_utf16le());
                  } else {
                    return error(input4, new MalformedCharStream());
                  }
                }
              );
            }
          );
        } else if (encoding instanceof Utf16Be) {
          return try$(
            reset(input2, input_uchar_utf16be()),
            (input3) => {
              return lazy_guard(
                input3.char === u_bom,
                () => {
                  let _block;
                  let _record = input3;
                  _block = new Input(
                    _record.encoding,
                    _record.strip,
                    _record.namespace_callback,
                    _record.entity_callback,
                    _record.uchar,
                    _record.stream,
                    _record.char,
                    _record.cr,
                    _record.line,
                    0,
                    _record.limit,
                    _record.peek,
                    _record.stripping,
                    _record.last_whitespace,
                    _record.scopes,
                    _record.ns,
                    _record.identifier,
                    _record.data
                  );
                  let input$1 = _block;
                  return try$(
                    next_char(input$1),
                    (input4) => {
                      return new Ok(input4);
                    }
                  );
                },
                () => {
                  return new Ok(input3);
                }
              );
            }
          );
        } else {
          return try$(
            reset(input2, input_uchar_utf16le()),
            (input3) => {
              return lazy_guard(
                input3.char === u_bom,
                () => {
                  let _block;
                  let _record = input3;
                  _block = new Input(
                    _record.encoding,
                    _record.strip,
                    _record.namespace_callback,
                    _record.entity_callback,
                    _record.uchar,
                    _record.stream,
                    _record.char,
                    _record.cr,
                    _record.line,
                    0,
                    _record.limit,
                    _record.peek,
                    _record.stripping,
                    _record.last_whitespace,
                    _record.scopes,
                    _record.ns,
                    _record.identifier,
                    _record.data
                  );
                  let input$1 = _block;
                  return try$(
                    next_char(input$1),
                    (input4) => {
                      return new Ok(input4);
                    }
                  );
                },
                () => {
                  return new Ok(input3);
                }
              );
            }
          );
        }
      })(),
      (input3) => {
        return new Ok([true, input3]);
      }
    );
  }
}
var u_9 = 57;
var u_cap_f = 70;
function parse_char_reference__loop1(loop$input, loop$c) {
  while (true) {
    let input2 = loop$input;
    let c = loop$c;
    let $ = input2.char === u_scolon;
    if ($) {
      return new Ok(new LoopDoneByCondition([c, input2]));
    } else {
      let input$1 = add_char_to_identifier(input2, input2.char);
      let $1 = !is_hex_digit(input$1.char);
      if ($1) {
        return new Ok(new LoopDoneExited([c, input$1]));
      } else {
        let c$1 = c * 16 + (() => {
          let $22 = input$1.char <= u_9;
          if ($22) {
            return input$1.char - 48;
          } else {
            let $3 = input$1.char <= u_cap_f;
            if ($3) {
              return input$1.char - 55;
            } else {
              return input$1.char - 87;
            }
          }
        })();
        let $2 = next_char(input$1);
        if (!$2.isOk()) {
          let e = $2[0];
          return new Error2(e);
        } else {
          let input$2 = $2[0];
          loop$input = input$2;
          loop$c = c$1;
        }
      }
    }
  }
}
function parse_char_reference(input2) {
  let input$1 = clear_identifier(input2);
  let $ = next_char(input$1);
  if (!$.isOk()) {
    let e = $[0];
    return new Error2(e);
  } else {
    let input$2 = $[0];
    let $1 = input$2.char === u_scolon;
    if ($1) {
      return error(input$2, new IllegalCharRef(""));
    } else {
      let _block;
      let $2 = input$2.char === u_x;
      if (!$2) {
        _block = parse_char_reference__loop2(input$2, 0);
      } else {
        let input$3 = add_char_to_identifier(input$2, input$2.char);
        let $3 = next_char(input$3);
        if (!$3.isOk()) {
          let e = $3[0];
          _block = new Error2(e);
        } else {
          let input$4 = $3[0];
          _block = parse_char_reference__loop1(input$4, 0);
        }
      }
      let result = _block;
      if (!result.isOk()) {
        let e = result[0];
        return new Error2(e);
      } else {
        let intermediate_result = result[0];
        let _block$1;
        if (intermediate_result instanceof LoopDoneByCondition) {
          let c = intermediate_result[0][0];
          let input$3 = intermediate_result[0][1];
          _block$1 = new Ok([c, input$3]);
        } else {
          let input$3 = intermediate_result[0][1];
          let $3 = parse_char_reference__loop3(input$3);
          if (!$3.isOk()) {
            let e = $3[0];
            _block$1 = new Error2(e);
          } else {
            let input$4 = $3[0];
            _block$1 = new Ok([-1, input$4]);
          }
        }
        let tup = _block$1;
        if (!tup.isOk()) {
          let e = tup[0];
          return new Error2(e);
        } else {
          let c = tup[0][0];
          let input$3 = tup[0][1];
          let $3 = next_char(input$3);
          if (!$3.isOk()) {
            let e = $3[0];
            return new Error2(e);
          } else {
            let input$4 = $3[0];
            let $4 = is_char(c);
            if ($4) {
              let input$5 = clear_identifier(input$4);
              let input$6 = add_char_to_identifier(input$5, c);
              return new Ok([buffer_to_string(input$6.identifier), input$6]);
            } else {
              return error(
                input$4,
                new IllegalCharRef(buffer_to_string(input$4.identifier))
              );
            }
          }
        }
      }
    }
  }
}
function parse_reference(input2) {
  let $ = next_char(input2);
  if (!$.isOk()) {
    let e = $[0];
    return new Error2(e);
  } else {
    let input$1 = $[0];
    let $1 = input$1.char === u_sharp;
    if ($1) {
      return parse_char_reference(input$1);
    } else {
      return parse_entity_reference(input$1, predefined_entities());
    }
  }
}
function parse_attribute_value__loop(loop$input, loop$delim) {
  while (true) {
    let input2 = loop$input;
    let delim = loop$delim;
    let $ = input2.char;
    if ($ === delim) {
      let char = $;
      return new Ok(input2);
    } else if ($ === 60) {
      let char = $;
      return error_illegal_char(input2, u_lt);
    } else if ($ === 38) {
      let char = $;
      let $1 = parse_reference(input2);
      if (!$1.isOk()) {
        let e = $1[0];
        return new Error2(e);
      } else {
        let reference = $1[0][0];
        let input$1 = $1[0][1];
        let _block;
        let _pipe = to_utf_codepoints(reference);
        _block = fold(
          _pipe,
          input$1,
          (input3, char2) => {
            return add_char_to_data_strip(
              input3,
              utf_codepoint_to_int(char2)
            );
          }
        );
        let input$2 = _block;
        loop$input = input$2;
        loop$delim = delim;
      }
    } else {
      let input$1 = add_char_to_data_strip(input2, input2.char);
      let $1 = next_char(input$1);
      if (!$1.isOk()) {
        let e = $1[0];
        return new Error2(e);
      } else {
        let input$2 = $1[0];
        loop$input = input$2;
        loop$delim = delim;
      }
    }
  }
}
function parse_attribute_value(input2) {
  return try$(
    skip_whitespace(input2),
    (input3) => {
      return lazy_guard(
        !(input3.char === u_quot || input3.char === u_apos),
        () => {
          return error_expected_chars(input3, toList([u_quot, u_apos]));
        },
        () => {
          let delim = input3.char;
          return try$(
            next_char(input3),
            (input4) => {
              return try$(
                skip_whitespace(input4),
                (input5) => {
                  let input$1 = clear_data(input5);
                  let _block;
                  let _record = input$1;
                  _block = new Input(
                    _record.encoding,
                    _record.strip,
                    _record.namespace_callback,
                    _record.entity_callback,
                    _record.uchar,
                    _record.stream,
                    _record.char,
                    _record.cr,
                    _record.line,
                    _record.column,
                    _record.limit,
                    _record.peek,
                    _record.stripping,
                    true,
                    _record.scopes,
                    _record.ns,
                    _record.identifier,
                    _record.data
                  );
                  let input$2 = _block;
                  return try$(
                    parse_attribute_value__loop(input$2, delim),
                    (input6) => {
                      return try$(
                        next_char(input6),
                        (input7) => {
                          let data = input_data_to_string(input7);
                          return new Ok([data, input7]);
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
}
var s_cdata = "CDATA[";
function parse_limit__cdata(input2) {
  let $ = next_char(input2);
  if (!$.isOk()) {
    let e = $[0];
    return new Error2(e);
  } else {
    let input$1 = $[0];
    let input$2 = clear_identifier(input$1);
    let $1 = eat_cdata_lbrack(input$2);
    if (!$1.isOk()) {
      let e = $1[0];
      return new Error2(e);
    } else {
      let input$3 = $1[0];
      let cdata = input_identifier_to_string(input$3);
      let $2 = cdata === s_cdata;
      if ($2) {
        return new Ok([new LimitCData(), input$3]);
      } else {
        return error_expected_seqs(input$3, toList([s_cdata]), cdata);
      }
    }
  }
}
function parse_limit(input2) {
  let _block;
  let $ = input2.char === u_eoi;
  if ($) {
    _block = new Ok([new LimitEoi(), input2]);
  } else {
    let $1 = input2.char !== u_lt;
    if ($1) {
      _block = new Ok([new LimitText(), input2]);
    } else {
      let $2 = next_char(input2);
      if (!$2.isOk()) {
        let e = $2[0];
        _block = new Error2(e);
      } else {
        let input$1 = $2[0];
        let $3 = input$1.char;
        if ($3 === 63) {
          let char = $3;
          _block = parse_limit__pi(input$1);
        } else if ($3 === 47) {
          let char = $3;
          _block = parse_limit__end_tag(input$1);
        } else if ($3 === 33) {
          let char = $3;
          let $4 = next_char(input$1);
          if (!$4.isOk()) {
            let e = $4[0];
            _block = new Error2(e);
          } else {
            let input$2 = $4[0];
            let _block$1;
            let $6 = input$2.char;
            if ($6 === 45) {
              let char$1 = $6;
              _block$1 = parse_limit__comment(input$2);
            } else if ($6 === 68) {
              let char$1 = $6;
              _block$1 = new Ok([new LimitDtd(), input$2]);
            } else if ($6 === 91) {
              let char$1 = $6;
              _block$1 = parse_limit__cdata(input$2);
            } else {
              _block$1 = error(
                input$2,
                new IllegalCharSeq("<!" + string_from_char(input$2.char))
              );
            }
            let $5 = _block$1;
            _block = $5;
          }
        } else {
          _block = parse_limit__start_tag(input$1);
        }
      }
    }
  }
  let result = _block;
  if (!result.isOk()) {
    let e = result[0];
    return new Error2(e);
  } else {
    let limit = result[0][0];
    let input$1 = result[0][1];
    return new Ok(
      (() => {
        let _record = input$1;
        return new Input(
          _record.encoding,
          _record.strip,
          _record.namespace_callback,
          _record.entity_callback,
          _record.uchar,
          _record.stream,
          _record.char,
          _record.cr,
          _record.line,
          _record.column,
          limit,
          _record.peek,
          _record.stripping,
          _record.last_whitespace,
          _record.scopes,
          _record.ns,
          _record.identifier,
          _record.data
        );
      })()
    );
  }
}
function parse_element_end_signal(input2, name) {
  let $ = input2.scopes;
  if ($.atLeastLength(1)) {
    let name_ = $.head[0];
    let prefixes = $.head[1];
    let strip = $.head[2];
    let scopes = $.tail;
    let $1 = input2.char !== u_gt;
    if ($1) {
      return error_expected_chars(input2, toList([u_gt]));
    } else {
      let $2 = !isEqual(name, name_);
      if ($2) {
        return error_expected_seqs(
          input2,
          toList([name_to_string(name_)]),
          name_to_string(name)
        );
      } else {
        let _block;
        let _record = input2;
        _block = new Input(
          _record.encoding,
          _record.strip,
          _record.namespace_callback,
          _record.entity_callback,
          _record.uchar,
          _record.stream,
          _record.char,
          _record.cr,
          _record.line,
          _record.column,
          _record.limit,
          _record.peek,
          strip,
          _record.last_whitespace,
          scopes,
          fold(
            prefixes,
            input2.ns,
            (dict2, prefix) => {
              return delete$(dict2, prefix);
            }
          ),
          _record.identifier,
          _record.data
        );
        let input$1 = _block;
        let _block$1;
        if (scopes.hasLength(0)) {
          _block$1 = new Ok(
            (() => {
              let _record$1 = input$1;
              return new Input(
                _record$1.encoding,
                _record$1.strip,
                _record$1.namespace_callback,
                _record$1.entity_callback,
                _record$1.uchar,
                _record$1.stream,
                u_end_doc,
                _record$1.cr,
                _record$1.line,
                _record$1.column,
                _record$1.limit,
                _record$1.peek,
                _record$1.stripping,
                _record$1.last_whitespace,
                _record$1.scopes,
                _record$1.ns,
                _record$1.identifier,
                _record$1.data
              );
            })()
          );
        } else {
          let $3 = next_char(input$1);
          if (!$3.isOk()) {
            let e = $3[0];
            _block$1 = new Error2(e);
          } else {
            let input$22 = $3[0];
            _block$1 = parse_limit(input$22);
          }
        }
        let input$2 = _block$1;
        if (!input$2.isOk()) {
          let e = input$2[0];
          return new Error2(e);
        } else {
          let input$3 = input$2[0];
          return new Ok([new ElementEnd(), input$3]);
        }
      }
    }
  } else {
    throw makeError(
      "panic",
      "xmlm",
      2513,
      "parse_element_end_signal",
      "impossible",
      {}
    );
  }
}
function skip_pi_then_parse_limit(input2) {
  let $ = skip_pi(input2);
  if (!$.isOk()) {
    let e = $[0];
    return new Error2(e);
  } else {
    let input$1 = $[0];
    return parse_limit(input$1);
  }
}
function skip_comment_then_parse_limit(input2) {
  let $ = skip_comment(input2);
  if (!$.isOk()) {
    let e = $[0];
    return new Error2(e);
  } else {
    let input$1 = $[0];
    return parse_limit(input$1);
  }
}
function accept_then_parse_limit(input2, char) {
  let $ = accept(input2, char);
  if (!$.isOk()) {
    let e = $[0];
    return new Error2(e);
  } else {
    let input$1 = $[0];
    return parse_limit(input$1);
  }
}
function skip_whitespace_eof_then_parse_limit(input2) {
  let $ = skip_whitespace_eof(input2);
  if (!$.isOk()) {
    let e = $[0];
    return new Error2(e);
  } else {
    let input$1 = $[0];
    return parse_limit(input$1);
  }
}
var ns_xml = "http://www.w3.org/XML/1998/namespace";
var ns_xmlns = "http://www.w3.org/2000/xmlns/";
var n_xml = "xml";
function skip_misc(loop$input, loop$allow_xmlpi) {
  while (true) {
    let input2 = loop$input;
    let allow_xmlpi = loop$allow_xmlpi;
    let $ = input2.limit;
    if ($ instanceof LimitPi && $[0] instanceof Name) {
      let prefix = $[0].uri;
      let local = $[0].local;
      let $1 = is_empty(prefix) && n_xml === lowercase(local);
      if ($1) {
        if (allow_xmlpi) {
          return new Ok(input2);
        } else {
          return error(input2, new IllegalCharSeq(local));
        }
      } else {
        let $2 = skip_pi_then_parse_limit(input2);
        if (!$2.isOk()) {
          let e = $2[0];
          return new Error2(e);
        } else {
          let input$1 = $2[0];
          loop$input = input$1;
          loop$allow_xmlpi = allow_xmlpi;
        }
      }
    } else if ($ instanceof LimitComment) {
      let $1 = skip_comment_then_parse_limit(input2);
      if (!$1.isOk()) {
        let e = $1[0];
        return new Error2(e);
      } else {
        let input$1 = $1[0];
        loop$input = input$1;
        loop$allow_xmlpi = allow_xmlpi;
      }
    } else if ($ instanceof LimitText) {
      let $1 = is_whitespace(input2.char);
      if ($1) {
        let $2 = skip_whitespace_eof_then_parse_limit(input2);
        if (!$2.isOk()) {
          let e = $2[0];
          return new Error2(e);
        } else {
          let input$1 = $2[0];
          loop$input = input$1;
          loop$allow_xmlpi = allow_xmlpi;
        }
      } else {
        return new Ok(input2);
      }
    } else if ($ instanceof LimitCData) {
      return new Ok(input2);
    } else if ($ instanceof LimitDtd) {
      return new Ok(input2);
    } else if ($ instanceof LimitEndTag) {
      return new Ok(input2);
    } else if ($ instanceof LimitEoi) {
      return new Ok(input2);
    } else {
      return new Ok(input2);
    }
  }
}
function parse_dtd_signal(input2) {
  let $ = skip_misc(input2, false);
  if (!$.isOk()) {
    let e = $[0];
    return new Error2(e);
  } else {
    let input$1 = $[0];
    let $1 = !isEqual(input$1.limit, new LimitDtd());
    if ($1) {
      return new Ok([new Dtd(new None()), input$1]);
    } else {
      let input$2 = clear_data(input$1);
      let input$3 = add_char_to_data(input$2, u_lt);
      let input$4 = add_char_to_data(input$3, u_emark);
      let $2 = parse_dtd_signal__loop(input$4, 1);
      if (!$2.isOk()) {
        let e = $2[0];
        return new Error2(e);
      } else {
        let input$5 = $2[0];
        let dtd = buffer_to_string(input$5.data);
        let $3 = parse_limit(input$5);
        if (!$3.isOk()) {
          let e = $3[0];
          return new Error2(e);
        } else {
          let input$6 = $3[0];
          let $4 = skip_misc(input$6, false);
          if (!$4.isOk()) {
            let e = $4[0];
            return new Error2(e);
          } else {
            let input$7 = $4[0];
            return new Ok([new Dtd(new Some(dtd)), input$7]);
          }
        }
      }
    }
  }
}
var n_xmlns = "xmlns";
function from_bit_array(source) {
  let _block;
  let _pipe = new_map();
  let _pipe$1 = insert(_pipe, "", "");
  let _pipe$2 = insert(_pipe$1, n_xml, ns_xml);
  _block = insert(_pipe$2, n_xmlns, ns_xmlns);
  let bindings = _block;
  return new Input(
    new None(),
    false,
    (_) => {
      return new None();
    },
    (_) => {
      return new None();
    },
    input_uchar_byte(),
    bit_array_to_list(source),
    u_start_doc,
    false,
    1,
    0,
    new LimitText(),
    signal_start_stream(),
    false,
    true,
    toList([]),
    bindings,
    toList([]),
    toList([])
  );
}
function from_string(source) {
  return from_bit_array(bit_array_from_string(source));
}
function expand_attribute(input2, attribute3) {
  let $ = attribute3.name;
  let prefix = $.uri;
  let local = $.local;
  if (prefix === "") {
    let $1 = local === n_xmlns;
    if ($1) {
      return new Ok(
        [
          (() => {
            let _record = attribute3;
            return new Attribute2(new Name(ns_xmlns, n_xmlns), _record.value);
          })(),
          input2
        ]
      );
    } else {
      return new Ok([attribute3, input2]);
    }
  } else {
    let $1 = expand_name(input2, attribute3.name);
    if (!$1.isOk()) {
      let e = $1[0];
      return new Error2(e);
    } else {
      let name = $1[0];
      return new Ok(
        [
          (() => {
            let _record = attribute3;
            return new Attribute2(name, _record.value);
          })(),
          input2
        ]
      );
    }
  }
}
var n_space = "space";
var n_version = "version";
var n_encoding = "encoding";
var n_standalone = "standalone";
var v_yes = "yes";
var v_no = "no";
function maybe_update_stripping(input2, attribute_value, prefix, local) {
  let $ = prefix === n_xml && local === n_space;
  if ($) {
    if (attribute_value === "preserve") {
      let attr_val = attribute_value;
      let _record = input2;
      return new Input(
        _record.encoding,
        _record.strip,
        _record.namespace_callback,
        _record.entity_callback,
        _record.uchar,
        _record.stream,
        _record.char,
        _record.cr,
        _record.line,
        _record.column,
        _record.limit,
        _record.peek,
        false,
        _record.last_whitespace,
        _record.scopes,
        _record.ns,
        _record.identifier,
        _record.data
      );
    } else if (attribute_value === "default") {
      let attr_val = attribute_value;
      let _record = input2;
      return new Input(
        _record.encoding,
        _record.strip,
        _record.namespace_callback,
        _record.entity_callback,
        _record.uchar,
        _record.stream,
        _record.char,
        _record.cr,
        _record.line,
        _record.column,
        _record.limit,
        _record.peek,
        input2.strip,
        _record.last_whitespace,
        _record.scopes,
        _record.ns,
        _record.identifier,
        _record.data
      );
    } else {
      return input2;
    }
  } else {
    return input2;
  }
}
var v_version_1_0 = "1.0";
var v_version_1_1 = "1.1";
var v_utf_8 = "utf-8";
var v_utf_16 = "utf-16";
var v_utf_16be = "utf-16be";
var v_utf_16le = "utf-16le";
var v_iso_8859_1 = "iso-8859-1";
var v_iso_8859_15 = "iso-8859-15";
var v_us_ascii = "us-ascii";
var v_ascii = "ascii";
function parse_xml_declaration(input2, ignore_encoding, ignore_utf16) {
  let yes_no = toList([v_yes, v_no]);
  let parse_val = (input3) => {
    return try$(
      skip_whitespace(input3),
      (input4) => {
        return try$(
          accept(input4, u_eq),
          (input5) => {
            return try$(
              skip_whitespace(input5),
              (input6) => {
                return parse_attribute_value(input6);
              }
            );
          }
        );
      }
    );
  };
  let parse_val_expected = (input3, expected) => {
    return try$(
      parse_val(input3),
      (_use0) => {
        let val = _use0[0];
        let input$1 = _use0[1];
        let $2 = find2(expected, (expected2) => {
          return val === expected2;
        });
        if (!$2.isOk() && !$2[0]) {
          return error_expected_seqs(input$1, expected, val);
        } else {
          return new Ok(input$1);
        }
      }
    );
  };
  let $ = input2.limit;
  if ($ instanceof LimitPi && $[0] instanceof Name) {
    let uri = $[0].uri;
    let local = $[0].local;
    return guard(
      !(is_empty(uri) && local === n_xml),
      new Ok(input2),
      () => {
        return try$(
          skip_whitespace(input2),
          (input3) => {
            return try$(
              parse_ncname(input3),
              (_use0) => {
                let v = _use0[0];
                let input$1 = _use0[1];
                return lazy_guard(
                  v !== n_version,
                  () => {
                    return error_expected_seqs(input$1, toList([n_version]), v);
                  },
                  () => {
                    return try$(
                      parse_val_expected(
                        input$1,
                        toList([v_version_1_0, v_version_1_1])
                      ),
                      (input4) => {
                        return try$(
                          skip_whitespace(input4),
                          (input5) => {
                            return try$(
                              (() => {
                                let $1 = input5.char !== u_qmark;
                                if ($1) {
                                  return try$(
                                    parse_ncname(input5),
                                    (_use02) => {
                                      let name = _use02[0];
                                      let input$12 = _use02[1];
                                      return try$(
                                        (() => {
                                          let $2 = name === n_encoding;
                                          if ($2) {
                                            return try$(
                                              parse_val(input$12),
                                              (_use03) => {
                                                let encoding = _use03[0];
                                                let input$2 = _use03[1];
                                                let encoding$1 = lowercase(
                                                  encoding
                                                );
                                                return try$(
                                                  guard(
                                                    ignore_encoding,
                                                    new Ok(input$2),
                                                    () => {
                                                      return guard(
                                                        encoding$1 === v_utf_8,
                                                        new Ok(
                                                          (() => {
                                                            let _record = input$2;
                                                            return new Input(
                                                              _record.encoding,
                                                              _record.strip,
                                                              _record.namespace_callback,
                                                              _record.entity_callback,
                                                              input_uchar_utf8(),
                                                              _record.stream,
                                                              _record.char,
                                                              _record.cr,
                                                              _record.line,
                                                              _record.column,
                                                              _record.limit,
                                                              _record.peek,
                                                              _record.stripping,
                                                              _record.last_whitespace,
                                                              _record.scopes,
                                                              _record.ns,
                                                              _record.identifier,
                                                              _record.data
                                                            );
                                                          })()
                                                        ),
                                                        () => {
                                                          return guard(
                                                            encoding$1 === v_utf_16be,
                                                            new Ok(
                                                              (() => {
                                                                let _record = input$2;
                                                                return new Input(
                                                                  _record.encoding,
                                                                  _record.strip,
                                                                  _record.namespace_callback,
                                                                  _record.entity_callback,
                                                                  input_uchar_utf16be(),
                                                                  _record.stream,
                                                                  _record.char,
                                                                  _record.cr,
                                                                  _record.line,
                                                                  _record.column,
                                                                  _record.limit,
                                                                  _record.peek,
                                                                  _record.stripping,
                                                                  _record.last_whitespace,
                                                                  _record.scopes,
                                                                  _record.ns,
                                                                  _record.identifier,
                                                                  _record.data
                                                                );
                                                              })()
                                                            ),
                                                            () => {
                                                              return guard(
                                                                encoding$1 === v_utf_16le,
                                                                new Ok(
                                                                  (() => {
                                                                    let _record = input$2;
                                                                    return new Input(
                                                                      _record.encoding,
                                                                      _record.strip,
                                                                      _record.namespace_callback,
                                                                      _record.entity_callback,
                                                                      input_uchar_utf16le(),
                                                                      _record.stream,
                                                                      _record.char,
                                                                      _record.cr,
                                                                      _record.line,
                                                                      _record.column,
                                                                      _record.limit,
                                                                      _record.peek,
                                                                      _record.stripping,
                                                                      _record.last_whitespace,
                                                                      _record.scopes,
                                                                      _record.ns,
                                                                      _record.identifier,
                                                                      _record.data
                                                                    );
                                                                  })()
                                                                ),
                                                                () => {
                                                                  return guard(
                                                                    encoding$1 === v_iso_8859_1,
                                                                    new Ok(
                                                                      (() => {
                                                                        let _record = input$2;
                                                                        return new Input(
                                                                          _record.encoding,
                                                                          _record.strip,
                                                                          _record.namespace_callback,
                                                                          _record.entity_callback,
                                                                          input_uchar_iso_8859_1(),
                                                                          _record.stream,
                                                                          _record.char,
                                                                          _record.cr,
                                                                          _record.line,
                                                                          _record.column,
                                                                          _record.limit,
                                                                          _record.peek,
                                                                          _record.stripping,
                                                                          _record.last_whitespace,
                                                                          _record.scopes,
                                                                          _record.ns,
                                                                          _record.identifier,
                                                                          _record.data
                                                                        );
                                                                      })()
                                                                    ),
                                                                    () => {
                                                                      return guard(
                                                                        encoding$1 === v_iso_8859_15,
                                                                        new Ok(
                                                                          (() => {
                                                                            let _record = input$2;
                                                                            return new Input(
                                                                              _record.encoding,
                                                                              _record.strip,
                                                                              _record.namespace_callback,
                                                                              _record.entity_callback,
                                                                              input_uchar_iso_8859_15(),
                                                                              _record.stream,
                                                                              _record.char,
                                                                              _record.cr,
                                                                              _record.line,
                                                                              _record.column,
                                                                              _record.limit,
                                                                              _record.peek,
                                                                              _record.stripping,
                                                                              _record.last_whitespace,
                                                                              _record.scopes,
                                                                              _record.ns,
                                                                              _record.identifier,
                                                                              _record.data
                                                                            );
                                                                          })()
                                                                        ),
                                                                        () => {
                                                                          return guard(
                                                                            encoding$1 === v_us_ascii,
                                                                            new Ok(
                                                                              (() => {
                                                                                let _record = input$2;
                                                                                return new Input(
                                                                                  _record.encoding,
                                                                                  _record.strip,
                                                                                  _record.namespace_callback,
                                                                                  _record.entity_callback,
                                                                                  input_uchar_ascii(),
                                                                                  _record.stream,
                                                                                  _record.char,
                                                                                  _record.cr,
                                                                                  _record.line,
                                                                                  _record.column,
                                                                                  _record.limit,
                                                                                  _record.peek,
                                                                                  _record.stripping,
                                                                                  _record.last_whitespace,
                                                                                  _record.scopes,
                                                                                  _record.ns,
                                                                                  _record.identifier,
                                                                                  _record.data
                                                                                );
                                                                              })()
                                                                            ),
                                                                            () => {
                                                                              return guard(
                                                                                encoding$1 === v_ascii,
                                                                                new Ok(
                                                                                  (() => {
                                                                                    let _record = input$2;
                                                                                    return new Input(
                                                                                      _record.encoding,
                                                                                      _record.strip,
                                                                                      _record.namespace_callback,
                                                                                      _record.entity_callback,
                                                                                      input_uchar_ascii(),
                                                                                      _record.stream,
                                                                                      _record.char,
                                                                                      _record.cr,
                                                                                      _record.line,
                                                                                      _record.column,
                                                                                      _record.limit,
                                                                                      _record.peek,
                                                                                      _record.stripping,
                                                                                      _record.last_whitespace,
                                                                                      _record.scopes,
                                                                                      _record.ns,
                                                                                      _record.identifier,
                                                                                      _record.data
                                                                                    );
                                                                                  })()
                                                                                ),
                                                                                () => {
                                                                                  return lazy_guard(
                                                                                    encoding$1 === v_utf_16,
                                                                                    () => {
                                                                                      if (ignore_utf16) {
                                                                                        return new Ok(
                                                                                          input$2
                                                                                        );
                                                                                      } else {
                                                                                        return error(
                                                                                          input$2,
                                                                                          new MalformedCharStream()
                                                                                        );
                                                                                      }
                                                                                    },
                                                                                    () => {
                                                                                      return error(
                                                                                        input$2,
                                                                                        new UnknownEncoding(
                                                                                          encoding$1
                                                                                        )
                                                                                      );
                                                                                    }
                                                                                  );
                                                                                }
                                                                              );
                                                                            }
                                                                          );
                                                                        }
                                                                      );
                                                                    }
                                                                  );
                                                                }
                                                              );
                                                            }
                                                          );
                                                        }
                                                      );
                                                    }
                                                  ),
                                                  (input6) => {
                                                    return try$(
                                                      skip_whitespace(input6),
                                                      (input7) => {
                                                        return guard(
                                                          input7.char === u_qmark,
                                                          new Ok(input7),
                                                          () => {
                                                            return try$(
                                                              parse_ncname(
                                                                input7
                                                              ),
                                                              (_use04) => {
                                                                let name$1 = _use04[0];
                                                                let input$13 = _use04[1];
                                                                let $3 = name$1 === n_standalone;
                                                                if ($3) {
                                                                  return parse_val_expected(
                                                                    input$13,
                                                                    yes_no
                                                                  );
                                                                } else {
                                                                  return error_expected_seqs(
                                                                    input$13,
                                                                    toList([
                                                                      n_standalone,
                                                                      "?>"
                                                                    ]),
                                                                    name$1
                                                                  );
                                                                }
                                                              }
                                                            );
                                                          }
                                                        );
                                                      }
                                                    );
                                                  }
                                                );
                                              }
                                            );
                                          } else {
                                            let $3 = name === n_standalone;
                                            if ($3) {
                                              return parse_val_expected(
                                                input$12,
                                                yes_no
                                              );
                                            } else {
                                              return error_expected_seqs(
                                                input$12,
                                                toList([
                                                  n_encoding,
                                                  n_standalone,
                                                  "?>"
                                                ]),
                                                name
                                              );
                                            }
                                          }
                                        })(),
                                        (input6) => {
                                          return new Ok(input6);
                                        }
                                      );
                                    }
                                  );
                                } else {
                                  return new Ok(input5);
                                }
                              })(),
                              (input6) => {
                                return try$(
                                  skip_whitespace(input6),
                                  (input7) => {
                                    return try$(
                                      accept(input7, u_qmark),
                                      (input8) => {
                                        return try$(
                                          accept(input8, u_gt),
                                          (input9) => {
                                            return parse_limit(input9);
                                          }
                                        );
                                      }
                                    );
                                  }
                                );
                              }
                            );
                          }
                        );
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  } else {
    return new Ok(input2);
  }
}
function eoi(input2) {
  return guard(
    input2.char === u_eoi,
    new Ok([true, input2]),
    () => {
      return guard(
        input2.char !== u_start_doc,
        new Ok([false, input2]),
        () => {
          return lazy_guard(
            !isEqual(input2.peek, new ElementEnd()),
            () => {
              return try$(
                find_encoding(input2),
                (_use0) => {
                  let ignore_incoding = _use0[0];
                  let input$1 = _use0[1];
                  return try$(
                    parse_limit(input$1),
                    (input3) => {
                      return try$(
                        parse_xml_declaration(input3, ignore_incoding, false),
                        (input4) => {
                          return try$(
                            parse_dtd_signal(input4),
                            (_use02) => {
                              let signal$1 = _use02[0];
                              let input$12 = _use02[1];
                              let _block;
                              let _record = input$12;
                              _block = new Input(
                                _record.encoding,
                                _record.strip,
                                _record.namespace_callback,
                                _record.entity_callback,
                                _record.uchar,
                                _record.stream,
                                _record.char,
                                _record.cr,
                                _record.line,
                                _record.column,
                                _record.limit,
                                signal$1,
                                _record.stripping,
                                _record.last_whitespace,
                                _record.scopes,
                                _record.ns,
                                _record.identifier,
                                _record.data
                              );
                              let input$2 = _block;
                              return new Ok([false, input$2]);
                            }
                          );
                        }
                      );
                    }
                  );
                }
              );
            },
            () => {
              return try$(
                next_char_eof(input2),
                (input3) => {
                  return try$(
                    parse_limit(input3),
                    (input4) => {
                      return guard(
                        input4.char === u_eoi,
                        new Ok([true, input4]),
                        () => {
                          return try$(
                            skip_misc(input4, true),
                            (input5) => {
                              return guard(
                                input5.char === u_eoi,
                                new Ok([true, input5]),
                                () => {
                                  return try$(
                                    parse_xml_declaration(input5, false, true),
                                    (input6) => {
                                      return try$(
                                        parse_dtd_signal(input6),
                                        (_use0) => {
                                          let signal$1 = _use0[0];
                                          let input$1 = _use0[1];
                                          let _block;
                                          let _record = input$1;
                                          _block = new Input(
                                            _record.encoding,
                                            _record.strip,
                                            _record.namespace_callback,
                                            _record.entity_callback,
                                            _record.uchar,
                                            _record.stream,
                                            _record.char,
                                            _record.cr,
                                            _record.line,
                                            _record.column,
                                            _record.limit,
                                            signal$1,
                                            _record.stripping,
                                            _record.last_whitespace,
                                            _record.scopes,
                                            _record.ns,
                                            _record.identifier,
                                            _record.data
                                          );
                                          let input$2 = _block;
                                          return new Ok([false, input$2]);
                                        }
                                      );
                                    }
                                  );
                                }
                              );
                            }
                          );
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
}
function peek(input2) {
  let $ = eoi(input2);
  if (!$.isOk()) {
    let e = $[0];
    return new Error2(e);
  } else if ($.isOk() && $[0][0]) {
    let input$1 = $[0][1];
    return error(input$1, new UnexpectedEoi());
  } else {
    let input$1 = $[0][1];
    return new Ok([input$1.peek, input$1]);
  }
}
function parse_chardata__handle_reference(input2, add_char) {
  let $ = parse_reference(input2);
  if (!$.isOk()) {
    let e = $[0];
    return new Error2(e);
  } else {
    let reference = $[0][0];
    let input$1 = $[0][1];
    let _block;
    let _pipe = to_utf_codepoints(reference);
    _block = fold(
      _pipe,
      input$1,
      (input3, char) => {
        return add_char(input3, utf_codepoint_to_int(char));
      }
    );
    let input$2 = _block;
    return parse_chardata(input$2, add_char);
  }
}
function parse_chardata(input2, add_char) {
  let $ = input2.char === u_lt;
  if ($) {
    return new Ok(input2);
  } else {
    let $1 = input2.char === u_amp;
    if ($1) {
      return parse_chardata__handle_reference(input2, add_char);
    } else {
      let $2 = input2.char === u_rbrack;
      if ($2) {
        return parse_chardata__handle_rbrack(input2, add_char);
      } else {
        return parse_chardata__handle_non_rbrack(input2, add_char);
      }
    }
  }
}
function parse_chardata__handle_non_rbrack(input2, add_char) {
  let input$1 = add_char(input2, input2.char);
  let $ = next_char(input$1);
  if (!$.isOk()) {
    let e = $[0];
    return new Error2(e);
  } else {
    let input$2 = $[0];
    return parse_chardata(input$2, add_char);
  }
}
function parse_data__bufferize(loop$input, loop$add_char) {
  while (true) {
    let input2 = loop$input;
    let add_char = loop$add_char;
    let $ = input2.limit;
    if ($ instanceof LimitText) {
      let $1 = parse_chardata(input2, add_char);
      if (!$1.isOk()) {
        let e = $1[0];
        return new Error2(e);
      } else {
        let input$1 = $1[0];
        let $2 = parse_limit(input$1);
        if (!$2.isOk()) {
          let e = $2[0];
          return new Error2(e);
        } else {
          let input$2 = $2[0];
          loop$input = input$2;
          loop$add_char = add_char;
        }
      }
    } else if ($ instanceof LimitCData) {
      let $1 = parse_cdata(input2, add_char);
      if (!$1.isOk()) {
        let e = $1[0];
        return new Error2(e);
      } else {
        let input$1 = $1[0];
        let $2 = parse_limit(input$1);
        if (!$2.isOk()) {
          let e = $2[0];
          return new Error2(e);
        } else {
          let input$2 = $2[0];
          loop$input = input$2;
          loop$add_char = add_char;
        }
      }
    } else if ($ instanceof LimitStartTag) {
      return new Ok(input2);
    } else if ($ instanceof LimitEndTag) {
      return new Ok(input2);
    } else if ($ instanceof LimitPi) {
      let $1 = skip_pi(input2);
      if (!$1.isOk()) {
        let e = $1[0];
        return new Error2(e);
      } else {
        let input$1 = $1[0];
        let $2 = parse_limit(input$1);
        if (!$2.isOk()) {
          let e = $2[0];
          return new Error2(e);
        } else {
          let input$2 = $2[0];
          loop$input = input$2;
          loop$add_char = add_char;
        }
      }
    } else if ($ instanceof LimitComment) {
      let $1 = skip_comment(input2);
      if (!$1.isOk()) {
        let e = $1[0];
        return new Error2(e);
      } else {
        let input$1 = $1[0];
        let $2 = parse_limit(input$1);
        if (!$2.isOk()) {
          let e = $2[0];
          return new Error2(e);
        } else {
          let input$2 = $2[0];
          loop$input = input$2;
          loop$add_char = add_char;
        }
      }
    } else if ($ instanceof LimitDtd) {
      return error(input2, new IllegalCharSeq("<!D"));
    } else {
      return error(input2, new UnexpectedEoi());
    }
  }
}
function parse_data(input2) {
  let input$1 = clear_data(input2);
  let _block;
  let _record = input$1;
  _block = new Input(
    _record.encoding,
    _record.strip,
    _record.namespace_callback,
    _record.entity_callback,
    _record.uchar,
    _record.stream,
    _record.char,
    _record.cr,
    _record.line,
    _record.column,
    _record.limit,
    _record.peek,
    _record.stripping,
    true,
    _record.scopes,
    _record.ns,
    _record.identifier,
    _record.data
  );
  let input$2 = _block;
  let _block$1;
  let $ = input$2.stripping;
  if ($) {
    _block$1 = add_char_to_data_strip;
  } else {
    _block$1 = add_char_to_data;
  }
  let add_char = _block$1;
  let $1 = parse_data__bufferize(input$2, add_char);
  if (!$1.isOk()) {
    let e = $1[0];
    return new Error2(e);
  } else {
    let input$3 = $1[0];
    let data = buffer_to_string(input$3.data);
    return new Ok([data, input$3]);
  }
}
function parse_attributes__loop__handle_qname_and_value(input2, pre_acc, acc) {
  let $ = parse_qname(input2);
  if (!$.isOk()) {
    let e = $[0];
    return new Error2(e);
  } else {
    let name = $[0][0];
    let prefix = $[0][0].uri;
    let local = $[0][0].local;
    let input$1 = $[0][1];
    let $1 = skip_whitespace(input$1);
    if (!$1.isOk()) {
      let e = $1[0];
      return new Error2(e);
    } else {
      let input$2 = $1[0];
      let $2 = accept(input$2, u_eq);
      if (!$2.isOk()) {
        let e = $2[0];
        return new Error2(e);
      } else {
        let input$3 = $2[0];
        let $3 = parse_attribute_value(input$3);
        if (!$3.isOk()) {
          let e = $3[0];
          return new Error2(e);
        } else {
          let attribute_value = $3[0][0];
          let input$4 = $3[0][1];
          let attribute3 = new Attribute2(name, attribute_value);
          let $4 = is_empty(prefix) && local === n_xmlns;
          if ($4) {
            let ns = insert(input$4.ns, "", attribute_value);
            let _block;
            let _record = input$4;
            _block = new Input(
              _record.encoding,
              _record.strip,
              _record.namespace_callback,
              _record.entity_callback,
              _record.uchar,
              _record.stream,
              _record.char,
              _record.cr,
              _record.line,
              _record.column,
              _record.limit,
              _record.peek,
              _record.stripping,
              _record.last_whitespace,
              _record.scopes,
              ns,
              _record.identifier,
              _record.data
            );
            let input$5 = _block;
            return parse_attributes__loop(
              input$5,
              prepend("", pre_acc),
              prepend(attribute3, acc)
            );
          } else {
            let $5 = prefix === n_xmlns;
            if ($5) {
              let ns = insert(input$4.ns, local, attribute_value);
              let _block;
              let _record = input$4;
              _block = new Input(
                _record.encoding,
                _record.strip,
                _record.namespace_callback,
                _record.entity_callback,
                _record.uchar,
                _record.stream,
                _record.char,
                _record.cr,
                _record.line,
                _record.column,
                _record.limit,
                _record.peek,
                _record.stripping,
                _record.last_whitespace,
                _record.scopes,
                ns,
                _record.identifier,
                _record.data
              );
              let input$5 = _block;
              return parse_attributes__loop(
                input$5,
                prepend(local, pre_acc),
                prepend(attribute3, acc)
              );
            } else {
              let input$5 = maybe_update_stripping(
                input$4,
                attribute_value,
                prefix,
                local
              );
              return parse_attributes__loop(
                input$5,
                pre_acc,
                prepend(attribute3, acc)
              );
            }
          }
        }
      }
    }
  }
}
function parse_attributes__loop(input2, pre_acc, acc) {
  let $ = is_whitespace(input2.char);
  if (!$) {
    return new Ok([pre_acc, acc, input2]);
  } else {
    let $1 = skip_whitespace(input2);
    if (!$1.isOk()) {
      let e = $1[0];
      return new Error2(e);
    } else {
      let input$1 = $1[0];
      let $2 = input$1.char;
      if ($2 === 47 || input$1.char === 62) {
        let char = $2;
        return new Ok([pre_acc, acc, input$1]);
      } else {
        return parse_attributes__loop__handle_qname_and_value(
          input$1,
          pre_acc,
          acc
        );
      }
    }
  }
}
function parse_attributes(input2) {
  return parse_attributes__loop(input2, toList([]), toList([]));
}
function parse_element_start_signal(input2, name) {
  let strip = input2.stripping;
  let $ = parse_attributes(input2);
  if (!$.isOk()) {
    let e = $[0];
    return new Error2(e);
  } else {
    let prefixes = $[0][0];
    let attributes = $[0][1];
    let input$1 = $[0][2];
    let _block;
    let _record = input$1;
    _block = new Input(
      _record.encoding,
      _record.strip,
      _record.namespace_callback,
      _record.entity_callback,
      _record.uchar,
      _record.stream,
      _record.char,
      _record.cr,
      _record.line,
      _record.column,
      _record.limit,
      _record.peek,
      _record.stripping,
      _record.last_whitespace,
      prepend([name, prefixes, strip], input$1.scopes),
      _record.ns,
      _record.identifier,
      _record.data
    );
    let input$2 = _block;
    let attributes$1 = reverse(attributes);
    let result = fold(
      attributes$1,
      new Ok([toList([]), input$2]),
      (acc, attribute3) => {
        if (!acc.isOk()) {
          let e = acc[0];
          return new Error2(e);
        } else {
          let attributes$2 = acc[0][0];
          let input$3 = acc[0][1];
          let $1 = expand_attribute(input$3, attribute3);
          if (!$1.isOk()) {
            let e = $1[0];
            return new Error2(e);
          } else {
            let expanded_attribute = $1[0][0];
            let input$4 = $1[0][1];
            return new Ok(
              [prepend(expanded_attribute, attributes$2), input$4]
            );
          }
        }
      }
    );
    if (!result.isOk()) {
      let e = result[0];
      return new Error2(e);
    } else {
      let expanded_attributes = result[0][0];
      let input$3 = result[0][1];
      let $1 = expand_name(input$3, name);
      if (!$1.isOk()) {
        let e = $1[0];
        return new Error2(e);
      } else {
        let name$1 = $1[0];
        let signal$1 = new ElementStart(new Tag(name$1, expanded_attributes));
        return new Ok([signal$1, input$3]);
      }
    }
  }
}
function parse_signal__empty_scope(input2) {
  let $ = input2.limit;
  if ($ instanceof LimitStartTag) {
    let name = $[0];
    return parse_element_start_signal(input2, name);
  } else {
    return error(input2, new ExpectedRootElement());
  }
}
function parse_signal__find(loop$input) {
  while (true) {
    let input2 = loop$input;
    let $ = input2.limit;
    if ($ instanceof LimitStartTag) {
      let name = $[0];
      return parse_element_start_signal(input2, name);
    } else if ($ instanceof LimitEndTag) {
      let name = $[0];
      return parse_element_end_signal(input2, name);
    } else if ($ instanceof LimitText) {
      let $1 = parse_data(input2);
      if (!$1.isOk()) {
        let e = $1[0];
        return new Error2(e);
      } else {
        let data = $1[0][0];
        let input$1 = $1[0][1];
        let $2 = is_empty(data);
        if ($2) {
          loop$input = input$1;
        } else {
          return new Ok([new Data(data), input$1]);
        }
      }
    } else if ($ instanceof LimitCData) {
      let $1 = parse_data(input2);
      if (!$1.isOk()) {
        let e = $1[0];
        return new Error2(e);
      } else {
        let data = $1[0][0];
        let input$1 = $1[0][1];
        let $2 = is_empty(data);
        if ($2) {
          loop$input = input$1;
        } else {
          return new Ok([new Data(data), input$1]);
        }
      }
    } else if ($ instanceof LimitPi) {
      let $1 = skip_pi_then_parse_limit(input2);
      if (!$1.isOk()) {
        let e = $1[0];
        return new Error2(e);
      } else {
        let input$1 = $1[0];
        loop$input = input$1;
      }
    } else if ($ instanceof LimitComment) {
      let $1 = skip_comment_then_parse_limit(input2);
      if (!$1.isOk()) {
        let e = $1[0];
        return new Error2(e);
      } else {
        let input$1 = $1[0];
        loop$input = input$1;
      }
    } else if ($ instanceof LimitDtd) {
      return error(input2, new IllegalCharSeq("<!D"));
    } else {
      return error(input2, new UnexpectedEoi());
    }
  }
}
function parse_signal__non_empty_scope(input2) {
  let _block;
  let $ = input2.peek;
  if ($ instanceof ElementStart) {
    let $1 = skip_whitespace(input2);
    if (!$1.isOk()) {
      let e = $1[0];
      _block = new Error2(e);
    } else {
      let input$1 = $1[0];
      let $2 = input$1.char === u_gt;
      if ($2) {
        _block = accept_then_parse_limit(input$1, u_gt);
      } else {
        let $3 = input$1.char === u_slash;
        if ($3) {
          let _block$1;
          let $4 = input$1.scopes;
          if ($4.atLeastLength(1)) {
            let tag2 = $4.head[0];
            _block$1 = tag2;
          } else {
            throw makeError(
              "panic",
              "xmlm",
              2551,
              "parse_signal__non_empty_scope",
              "impossible",
              {}
            );
          }
          let tag = _block$1;
          let $5 = next_char(input$1);
          if (!$5.isOk()) {
            let e = $5[0];
            _block = new Error2(e);
          } else {
            let input$2 = $5[0];
            _block = new Ok(
              (() => {
                let _record = input$2;
                return new Input(
                  _record.encoding,
                  _record.strip,
                  _record.namespace_callback,
                  _record.entity_callback,
                  _record.uchar,
                  _record.stream,
                  _record.char,
                  _record.cr,
                  _record.line,
                  _record.column,
                  new LimitEndTag(tag),
                  _record.peek,
                  _record.stripping,
                  _record.last_whitespace,
                  _record.scopes,
                  _record.ns,
                  _record.identifier,
                  _record.data
                );
              })()
            );
          }
        } else {
          _block = error_expected_chars(input$1, toList([u_slash, u_gt]));
        }
      }
    }
  } else {
    _block = new Ok(input2);
  }
  let result = _block;
  if (!result.isOk()) {
    let e = result[0];
    return new Error2(e);
  } else {
    let input$1 = result[0];
    return parse_signal__find(input$1);
  }
}
function parse_signal(input2) {
  let $ = input2.scopes;
  if ($.hasLength(0)) {
    return parse_signal__empty_scope(input2);
  } else {
    return parse_signal__non_empty_scope(input2);
  }
}
function signal(input2) {
  let $ = input2.char === u_end_doc;
  if ($) {
    let _block;
    let _record = input2;
    _block = new Input(
      _record.encoding,
      _record.strip,
      _record.namespace_callback,
      _record.entity_callback,
      _record.uchar,
      _record.stream,
      u_start_doc,
      _record.cr,
      _record.line,
      _record.column,
      _record.limit,
      _record.peek,
      _record.stripping,
      _record.last_whitespace,
      _record.scopes,
      _record.ns,
      _record.identifier,
      _record.data
    );
    let input$1 = _block;
    return new Ok([input$1.peek, input$1]);
  } else {
    let $1 = peek(input2);
    if (!$1.isOk()) {
      let e = $1[0];
      return new Error2(e);
    } else {
      let signal$1 = $1[0][0];
      let input$1 = $1[0][1];
      let $2 = parse_signal(input$1);
      if (!$2.isOk()) {
        let e = $2[0];
        return new Error2(e);
      } else {
        let peeked_signal = $2[0][0];
        let input$2 = $2[0][1];
        let _block;
        let _record = input$2;
        _block = new Input(
          _record.encoding,
          _record.strip,
          _record.namespace_callback,
          _record.entity_callback,
          _record.uchar,
          _record.stream,
          _record.char,
          _record.cr,
          _record.line,
          _record.column,
          _record.limit,
          peeked_signal,
          _record.stripping,
          _record.last_whitespace,
          _record.scopes,
          _record.ns,
          _record.identifier,
          _record.data
        );
        let input$3 = _block;
        return new Ok([signal$1, input$3]);
      }
    }
  }
}

// build/dev/javascript/neb_stats/parse.mjs
var TeamA = class extends CustomType {
};
var TeamB = class extends CustomType {
};
var ParseTeamsState = class extends CustomType {
  constructor(maybe_team_a, maybe_team_b) {
    super();
    this.maybe_team_a = maybe_team_a;
    this.maybe_team_b = maybe_team_b;
  }
};
var ParseTeamState = class extends CustomType {
  constructor(which_team, players) {
    super();
    this.which_team = which_team;
    this.players = players;
  }
};
var ParsePlayerState = class extends CustomType {
  constructor(name, ships) {
    super();
    this.name = name;
    this.ships = ships;
  }
};
var ParseShipState = class extends CustomType {
  constructor(name, class$2, damage_taken, anti_ship_weapons) {
    super();
    this.name = name;
    this.class = class$2;
    this.damage_taken = damage_taken;
    this.anti_ship_weapons = anti_ship_weapons;
  }
};
var ParseAntiShipWeaponState = class extends CustomType {
  constructor(name, damage_dealt) {
    super();
    this.name = name;
    this.damage_dealt = damage_dealt;
  }
};
function parse_team_id(loop$maybe_id, loop$input) {
  while (true) {
    let maybe_id = loop$maybe_id;
    let input2 = loop$input;
    let $ = signal(input2);
    if (!$.isOk()) {
      let e = $[0];
      return new Error2(input_error_to_string(e));
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag) {
      return new Error2("unexpected nested element for team id");
    } else if ($.isOk() && $[0][0] instanceof ElementEnd) {
      let next_input = $[0][1];
      if (maybe_id instanceof Some) {
        let which_team = maybe_id[0];
        return new Ok([which_team, next_input]);
      } else {
        return new Error2("Missing team id");
      }
    } else if ($.isOk() && $[0][0] instanceof Data && $[0][0][0] === "TeamA") {
      let next_input = $[0][1];
      loop$maybe_id = new Some(new TeamA());
      loop$input = next_input;
    } else if ($.isOk() && $[0][0] instanceof Data && $[0][0][0] === "TeamB") {
      let next_input = $[0][1];
      loop$maybe_id = new Some(new TeamB());
      loop$input = next_input;
    } else if ($.isOk() && $[0][0] instanceof Data) {
      let data = $[0][0][0];
      return new Error2(
        concat2(toList(["Unexpected data at team_id: ", data]))
      );
    } else {
      let next_input = $[0][1];
      loop$maybe_id = maybe_id;
      loop$input = next_input;
    }
  }
}
function parse_string_element(loop$maybe_name, loop$input) {
  while (true) {
    let maybe_name = loop$maybe_name;
    let input2 = loop$input;
    let $ = signal(input2);
    if (!$.isOk()) {
      let e = $[0];
      return new Error2(input_error_to_string(e));
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag) {
      return new Error2("unexpected nested element for string element");
    } else if ($.isOk() && $[0][0] instanceof ElementEnd) {
      let next_input = $[0][1];
      if (maybe_name instanceof Some) {
        let name = maybe_name[0];
        return new Ok([name, next_input]);
      } else {
        return new Error2("Missing player name");
      }
    } else if ($.isOk() && $[0][0] instanceof Data) {
      let name = $[0][0][0];
      let next_input = $[0][1];
      loop$maybe_name = new Some(name);
      loop$input = next_input;
    } else {
      let next_input = $[0][1];
      loop$maybe_name = maybe_name;
      loop$input = next_input;
    }
  }
}
function skip_tag_inner(loop$input, loop$depth) {
  while (true) {
    let input2 = loop$input;
    let depth = loop$depth;
    let $ = signal(input2);
    if (!$.isOk()) {
      let e = $[0];
      return new Error2(input_error_to_string(e));
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag) {
      let tag = $[0][0][0];
      let next_input = $[0][1];
      loop$input = next_input;
      loop$depth = depth + 1;
    } else if ($.isOk() && $[0][0] instanceof ElementEnd) {
      let next_input = $[0][1];
      if (depth === 0) {
        return new Ok(next_input);
      } else {
        loop$input = next_input;
        loop$depth = depth - 1;
      }
    } else {
      let next_input = $[0][1];
      loop$input = next_input;
      loop$depth = depth;
    }
  }
}
function skip_tag(input2) {
  return skip_tag_inner(input2, 0);
}
function parse_anti_ship_weapon_inner(loop$parse_state, loop$input) {
  while (true) {
    let parse_state = loop$parse_state;
    let input2 = loop$input;
    let $ = signal(input2);
    if (!$.isOk()) {
      let e = $[0];
      return new Error2(input_error_to_string(e));
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag && $[0][0][0].name instanceof Name && $[0][0][0].name.uri === "" && $[0][0][0].name.local === "Name") {
      let next_input = $[0][1];
      return try$(
        parse_string_element(new None(), next_input),
        (_use0) => {
          let name = _use0[0];
          let next_input_2 = _use0[1];
          return parse_anti_ship_weapon_inner(
            (() => {
              let _record = parse_state;
              return new ParseAntiShipWeaponState(
                new Some(name),
                _record.damage_dealt
              );
            })(),
            next_input_2
          );
        }
      );
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag && $[0][0][0].name instanceof Name && $[0][0][0].name.uri === "" && $[0][0][0].name.local === "TotalDamageDone") {
      let next_input = $[0][1];
      return try$(
        parse_string_element(new None(), next_input),
        (_use0) => {
          let string_damage = _use0[0];
          let next_input_2 = _use0[1];
          return try$(
            replace_error(
              or(
                parse_float(string_damage),
                then$(
                  parse_int(string_damage),
                  (int_damage) => {
                    return new Ok(identity(int_damage));
                  }
                )
              ),
              "Failed to parse damage: " + string_damage
            ),
            (damage) => {
              return parse_anti_ship_weapon_inner(
                (() => {
                  let _record = parse_state;
                  return new ParseAntiShipWeaponState(
                    _record.name,
                    new Some(damage)
                  );
                })(),
                next_input_2
              );
            }
          );
        }
      );
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag) {
      let tag = $[0][0][0];
      let next_input = $[0][1];
      return try$(
        skip_tag(next_input),
        (next_input_2) => {
          return parse_anti_ship_weapon_inner(parse_state, next_input_2);
        }
      );
    } else if ($.isOk() && $[0][0] instanceof ElementEnd) {
      let next_input = $[0][1];
      if (parse_state instanceof ParseAntiShipWeaponState && parse_state.name instanceof Some && parse_state.damage_dealt instanceof Some) {
        let name = parse_state.name[0];
        let damage = parse_state.damage_dealt[0];
        return new Ok([new AntiShipWeapon(name, damage), next_input]);
      } else {
        return new Error2("Missing anti ship weapon data");
      }
    } else if ($.isOk() && $[0][0] instanceof Data) {
      let data = $[0][0][0];
      return new Error2(
        concat2(toList(["Unexpected data at anti ship weapon: ", data]))
      );
    } else {
      let next_input = $[0][1];
      loop$parse_state = parse_state;
      loop$input = next_input;
    }
  }
}
function parse_anti_ship_weapon(input2) {
  return parse_anti_ship_weapon_inner(
    new ParseAntiShipWeaponState(new None(), new None()),
    input2
  );
}
function parse_anti_ship_weapons_inner(loop$anti_ship_weapons, loop$input) {
  while (true) {
    let anti_ship_weapons = loop$anti_ship_weapons;
    let input2 = loop$input;
    let $ = signal(input2);
    if (!$.isOk()) {
      let e = $[0];
      return new Error2(input_error_to_string(e));
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag && $[0][0][0].name instanceof Name && $[0][0][0].name.uri === "" && $[0][0][0].name.local === "WeaponReport" && $[0][0][0].attributes.hasLength(1) && $[0][0][0].attributes.head instanceof Attribute2 && $[0][0][0].attributes.head.name instanceof Name && $[0][0][0].attributes.head.name.uri === "http://www.w3.org/2001/XMLSchema-instance" && $[0][0][0].attributes.head.name.local === "type" && $[0][0][0].attributes.head.value === "DiscreteWeaponReport") {
      let next_input = $[0][1];
      echo("parsing weapon report", "src/parse.gleam", 445);
      return try$(
        parse_anti_ship_weapon(next_input),
        (_use0) => {
          let weapon = _use0[0];
          let next_input_2 = _use0[1];
          return parse_anti_ship_weapons_inner(
            prepend(weapon, anti_ship_weapons),
            next_input_2
          );
        }
      );
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag) {
      let tag = $[0][0][0];
      let next_input = $[0][1];
      echo(["Skipping tag: ", tag], "src/parse.gleam", 450);
      return try$(
        skip_tag(next_input),
        (next_input_2) => {
          return parse_anti_ship_weapons_inner(anti_ship_weapons, next_input_2);
        }
      );
    } else if ($.isOk() && $[0][0] instanceof ElementEnd) {
      let next_input = $[0][1];
      return new Ok([anti_ship_weapons, next_input]);
    } else if ($.isOk() && $[0][0] instanceof Data) {
      let data = $[0][0][0];
      return new Error2(
        concat2(toList(["Unexpected data at anti ship weapons: ", data]))
      );
    } else {
      let next_input = $[0][1];
      loop$anti_ship_weapons = anti_ship_weapons;
      loop$input = next_input;
    }
  }
}
function parse_anti_ship_weapons(input2) {
  return parse_anti_ship_weapons_inner(toList([]), input2);
}
function parse_anti_ship_inner(loop$anti_ship, loop$input) {
  while (true) {
    let anti_ship = loop$anti_ship;
    let input2 = loop$input;
    let $ = signal(input2);
    if (!$.isOk()) {
      let e = $[0];
      return new Error2(input_error_to_string(e));
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag && $[0][0][0].name instanceof Name && $[0][0][0].name.uri === "" && $[0][0][0].name.local === "Weapons") {
      let next_input = $[0][1];
      echo("parsing weapons", "src/parse.gleam", 404);
      return try$(
        parse_anti_ship_weapons(next_input),
        (_use0) => {
          let weapons = _use0[0];
          let next_input_2 = _use0[1];
          return parse_anti_ship_inner(weapons, next_input_2);
        }
      );
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag) {
      let next_input = $[0][1];
      return try$(
        skip_tag(next_input),
        (next_input_2) => {
          return parse_anti_ship_inner(anti_ship, next_input_2);
        }
      );
    } else if ($.isOk() && $[0][0] instanceof ElementEnd) {
      let next_input = $[0][1];
      return new Ok([anti_ship, next_input]);
    } else if ($.isOk() && $[0][0] instanceof Data) {
      let data = $[0][0][0];
      return new Error2(
        concat2(toList(["Unexpected data at anti ship: ", data]))
      );
    } else {
      let next_input = $[0][1];
      loop$anti_ship = anti_ship;
      loop$input = next_input;
    }
  }
}
function parse_anti_ship(input2) {
  return parse_anti_ship_inner(toList([]), input2);
}
function parse_ship_inner(loop$parse_state, loop$input) {
  while (true) {
    let parse_state = loop$parse_state;
    let input2 = loop$input;
    let $ = signal(input2);
    if (!$.isOk()) {
      let e = $[0];
      return new Error2(input_error_to_string(e));
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag && $[0][0][0].name instanceof Name && $[0][0][0].name.uri === "" && $[0][0][0].name.local === "ShipName") {
      let next_input = $[0][1];
      return try$(
        parse_string_element(new None(), next_input),
        (_use0) => {
          let name = _use0[0];
          let next_input_2 = _use0[1];
          return parse_ship_inner(
            (() => {
              let _record = parse_state;
              return new ParseShipState(
                new Some(name),
                _record.class,
                _record.damage_taken,
                _record.anti_ship_weapons
              );
            })(),
            next_input_2
          );
        }
      );
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag && $[0][0][0].name instanceof Name && $[0][0][0].name.uri === "" && $[0][0][0].name.local === "HullKey") {
      let next_input = $[0][1];
      return try$(
        parse_string_element(new None(), next_input),
        (_use0) => {
          let class$2 = _use0[0];
          let next_input$1 = _use0[1];
          return parse_ship_inner(
            (() => {
              let _record = parse_state;
              return new ParseShipState(
                _record.name,
                new Some(class$2),
                _record.damage_taken,
                _record.anti_ship_weapons
              );
            })(),
            next_input$1
          );
        }
      );
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag && $[0][0][0].name instanceof Name && $[0][0][0].name.uri === "" && $[0][0][0].name.local === "AntiShip") {
      let next_input = $[0][1];
      echo("Parsing anti ship", "src/parse.gleam", 336);
      return try$(
        parse_anti_ship(next_input),
        (_use0) => {
          let weapons = _use0[0];
          let next_input$1 = _use0[1];
          return parse_ship_inner(
            (() => {
              let _record = parse_state;
              return new ParseShipState(
                _record.name,
                _record.class,
                _record.damage_taken,
                weapons
              );
            })(),
            next_input$1
          );
        }
      );
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag && $[0][0][0].name instanceof Name && $[0][0][0].name.uri === "" && $[0][0][0].name.local === "TotalDamageReceived") {
      let next_input = $[0][1];
      return try$(
        parse_string_element(new None(), next_input),
        (_use0) => {
          let string_damage = _use0[0];
          let next_input_2 = _use0[1];
          return try$(
            replace_error(
              parse_int(string_damage),
              "Failed to parse damage"
            ),
            (damage) => {
              return parse_ship_inner(
                (() => {
                  let _record = parse_state;
                  return new ParseShipState(
                    _record.name,
                    _record.class,
                    new Some(damage),
                    _record.anti_ship_weapons
                  );
                })(),
                next_input_2
              );
            }
          );
        }
      );
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag) {
      let tag = $[0][0][0];
      let next_input = $[0][1];
      return try$(
        skip_tag(next_input),
        (next_input_2) => {
          return parse_ship_inner(parse_state, next_input_2);
        }
      );
    } else if ($.isOk() && $[0][0] instanceof ElementEnd) {
      let next_input = $[0][1];
      if (parse_state instanceof ParseShipState && parse_state.name instanceof Some && parse_state.class instanceof Some && parse_state.damage_taken instanceof Some) {
        let name = parse_state.name[0];
        let class$2 = parse_state.class[0];
        let damage = parse_state.damage_taken[0];
        let anti_ship_weapons = parse_state.anti_ship_weapons;
        echo(["parsed ship: ", parse_state], "src/parse.gleam", 370);
        return new Ok(
          [new Ship(name, class$2, damage, anti_ship_weapons), next_input]
        );
      } else {
        echo(["parse state: ", parse_state], "src/parse.gleam", 382);
        return new Error2("Missing ship data");
      }
    } else if ($.isOk() && $[0][0] instanceof Data) {
      let data = $[0][0][0];
      return new Error2(
        concat2(toList(["Unexpected data at ships: ", data]))
      );
    } else {
      let next_input = $[0][1];
      loop$parse_state = parse_state;
      loop$input = next_input;
    }
  }
}
function parse_ship(input2) {
  return parse_ship_inner(
    new ParseShipState(new None(), new None(), new None(), toList([])),
    input2
  );
}
function parse_ships_inner(loop$ships, loop$input) {
  while (true) {
    let ships = loop$ships;
    let input2 = loop$input;
    let $ = signal(input2);
    if (!$.isOk()) {
      let e = $[0];
      return new Error2(input_error_to_string(e));
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag && $[0][0][0].name instanceof Name && $[0][0][0].name.uri === "" && $[0][0][0].name.local === "ShipBattleReport") {
      let next_input = $[0][1];
      return try$(
        parse_ship(next_input),
        (_use0) => {
          let ship = _use0[0];
          let next_input_2 = _use0[1];
          return parse_ships_inner(prepend(ship, ships), next_input_2);
        }
      );
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag) {
      let next_input = $[0][1];
      return try$(
        skip_tag(next_input),
        (next_input_2) => {
          return parse_ships_inner(ships, next_input_2);
        }
      );
    } else if ($.isOk() && $[0][0] instanceof ElementEnd) {
      let next_input = $[0][1];
      return new Ok([ships, next_input]);
    } else if ($.isOk() && $[0][0] instanceof Data) {
      let data = $[0][0][0];
      return new Error2(
        concat2(toList(["Unexpected data at ships: ", data]))
      );
    } else {
      let next_input = $[0][1];
      loop$ships = ships;
      loop$input = next_input;
    }
  }
}
function parse_ships(input2) {
  return parse_ships_inner(toList([]), input2);
}
function parse_player_inner(loop$parse_state, loop$input) {
  while (true) {
    let parse_state = loop$parse_state;
    let input2 = loop$input;
    let $ = signal(input2);
    if (!$.isOk()) {
      let e = $[0];
      return new Error2(input_error_to_string(e));
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag && $[0][0][0].name instanceof Name && $[0][0][0].name.uri === "" && $[0][0][0].name.local === "PlayerName") {
      let next_input = $[0][1];
      return try$(
        parse_string_element(new None(), next_input),
        (_use0) => {
          let name = _use0[0];
          let next_input_2 = _use0[1];
          return parse_player_inner(
            (() => {
              let _record = parse_state;
              return new ParsePlayerState(new Some(name), _record.ships);
            })(),
            next_input_2
          );
        }
      );
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag && $[0][0][0].name instanceof Name && $[0][0][0].name.uri === "" && $[0][0][0].name.local === "Ships") {
      let next_input = $[0][1];
      return try$(
        parse_ships(next_input),
        (_use0) => {
          let ships = _use0[0];
          let next_input_2 = _use0[1];
          return parse_player_inner(
            (() => {
              let _record = parse_state;
              return new ParsePlayerState(_record.name, ships);
            })(),
            next_input_2
          );
        }
      );
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag) {
      let tag = $[0][0][0];
      let next_input = $[0][1];
      return try$(
        skip_tag(next_input),
        (next_input_2) => {
          return parse_player_inner(parse_state, next_input_2);
        }
      );
    } else if ($.isOk() && $[0][0] instanceof ElementEnd) {
      let next_input = $[0][1];
      if (parse_state instanceof ParsePlayerState && parse_state.name instanceof Some) {
        let name = parse_state.name[0];
        let ships = parse_state.ships;
        echo(["parsed player: ", name], "src/parse.gleam", 241);
        return new Ok([new Player(name, ships), next_input]);
      } else {
        return new Error2("Missing player data");
      }
    } else if ($.isOk() && $[0][0] instanceof Data) {
      let data = $[0][0][0];
      return new Error2(
        concat2(toList(["Unexpected data at player: ", data]))
      );
    } else {
      let next_input = $[0][1];
      loop$parse_state = parse_state;
      loop$input = next_input;
    }
  }
}
function parse_player(input2) {
  return parse_player_inner(new ParsePlayerState(new None(), toList([])), input2);
}
function parse_players_inner(loop$players, loop$input) {
  while (true) {
    let players = loop$players;
    let input2 = loop$input;
    let $ = signal(input2);
    if (!$.isOk()) {
      let e = $[0];
      return new Error2(input_error_to_string(e));
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag && $[0][0][0].name instanceof Name && $[0][0][0].name.uri === "" && $[0][0][0].name.local === "AARPlayerReportOfShipBattleReportCraftBattleReport") {
      let next_input = $[0][1];
      return try$(
        parse_player(next_input),
        (_use0) => {
          let player = _use0[0];
          let next_input_2 = _use0[1];
          return parse_players_inner(prepend(player, players), next_input_2);
        }
      );
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag) {
      let next_input = $[0][1];
      return try$(
        skip_tag(next_input),
        (next_input_2) => {
          return parse_players_inner(players, next_input_2);
        }
      );
    } else if ($.isOk() && $[0][0] instanceof ElementEnd) {
      let next_input = $[0][1];
      return new Ok([players, next_input]);
    } else if ($.isOk() && $[0][0] instanceof Data) {
      let data = $[0][0][0];
      return new Error2(
        concat2(toList(["Unexpected data at team_players: ", data]))
      );
    } else {
      let next_input = $[0][1];
      loop$players = players;
      loop$input = next_input;
    }
  }
}
function parse_players(input2) {
  return parse_players_inner(toList([]), input2);
}
function parse_team_inner(loop$parse_state, loop$input) {
  while (true) {
    let parse_state = loop$parse_state;
    let input2 = loop$input;
    let $ = signal(input2);
    if (!$.isOk()) {
      let e = $[0];
      return new Error2(input_error_to_string(e));
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag && $[0][0][0].name instanceof Name && $[0][0][0].name.uri === "" && $[0][0][0].name.local === "TeamID") {
      let next_input = $[0][1];
      return try$(
        parse_team_id(new None(), next_input),
        (_use0) => {
          let team_id = _use0[0];
          let next_input_2 = _use0[1];
          return parse_team_inner(
            (() => {
              let _record = parse_state;
              return new ParseTeamState(new Some(team_id), _record.players);
            })(),
            next_input_2
          );
        }
      );
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag && $[0][0][0].name instanceof Name && $[0][0][0].name.uri === "" && $[0][0][0].name.local === "Players") {
      let next_input = $[0][1];
      return try$(
        parse_players(next_input),
        (_use0) => {
          let players = _use0[0];
          let next_input_2 = _use0[1];
          return parse_team_inner(
            (() => {
              let _record = parse_state;
              return new ParseTeamState(_record.which_team, players);
            })(),
            next_input_2
          );
        }
      );
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag) {
      let tag = $[0][0][0];
      let next_input = $[0][1];
      return try$(
        skip_tag(next_input),
        (next_input_2) => {
          return parse_team_inner(parse_state, next_input_2);
        }
      );
    } else if ($.isOk() && $[0][0] instanceof ElementEnd) {
      let next_input = $[0][1];
      if (parse_state instanceof ParseTeamState && parse_state.which_team instanceof Some) {
        let which_team = parse_state.which_team[0];
        let players = parse_state.players;
        return new Ok([which_team, new Team(players), next_input]);
      } else {
        echo(parse_state, "src/parse.gleam", 146);
        return new Error2("Missing team data");
      }
    } else if ($.isOk() && $[0][0] instanceof Data) {
      let data = $[0][0][0];
      return new Error2(
        concat2(toList(["Unexpected data at team: ", data]))
      );
    } else {
      let next_input = $[0][1];
      loop$parse_state = parse_state;
      loop$input = next_input;
    }
  }
}
function parse_team(input2) {
  return parse_team_inner(new ParseTeamState(new None(), toList([])), input2);
}
function parse_teams_inner(loop$parse_state, loop$input) {
  while (true) {
    let parse_state = loop$parse_state;
    let input2 = loop$input;
    let $ = signal(input2);
    if (!$.isOk()) {
      let e = $[0];
      return new Error2(input_error_to_string(e));
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag && $[0][0][0].name instanceof Name && $[0][0][0].name.uri === "" && $[0][0][0].name.local === "TeamReportOfShipBattleReportCraftBattleReport") {
      let next_input = $[0][1];
      echo("Parsing team report", "src/parse.gleam", 80);
      return try$(
        parse_team(next_input),
        (_use0) => {
          let which_team = _use0[0];
          let team = _use0[1];
          let next_input_2 = _use0[2];
          let _block;
          if (which_team instanceof TeamA) {
            let _record = parse_state;
            _block = new ParseTeamsState(new Some(team), _record.maybe_team_b);
          } else {
            let _record = parse_state;
            _block = new ParseTeamsState(_record.maybe_team_a, new Some(team));
          }
          let new_state = _block;
          return parse_teams_inner(new_state, next_input_2);
        }
      );
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag) {
      let next_input = $[0][1];
      return try$(
        skip_tag(next_input),
        (next_input_2) => {
          return parse_teams_inner(parse_state, next_input_2);
        }
      );
    } else if ($.isOk() && $[0][0] instanceof ElementEnd) {
      let next_input = $[0][1];
      if (parse_state instanceof ParseTeamsState && parse_state.maybe_team_a instanceof Some && parse_state.maybe_team_b instanceof Some) {
        let team_a = parse_state.maybe_team_a[0];
        let team_b = parse_state.maybe_team_b[0];
        return new Ok([team_a, team_b, next_input]);
      } else {
        echo(parse_state, "src/parse.gleam", 98);
        return new Error2("Missing teams data");
      }
    } else if ($.isOk() && $[0][0] instanceof Data) {
      let data = $[0][0][0];
      return new Error2(
        concat2(toList(["Unexpected data at teams: ", data]))
      );
    } else {
      let next_input = $[0][1];
      loop$parse_state = parse_state;
      loop$input = next_input;
    }
  }
}
function parse_teams(input2) {
  return parse_teams_inner(new ParseTeamsState(new None(), new None()), input2);
}
function parse_report_element(loop$input) {
  while (true) {
    let input2 = loop$input;
    let $ = signal(input2);
    if (!$.isOk()) {
      let e = $[0];
      return new Error2(input_error_to_string(e));
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag && $[0][0][0].name instanceof Name && $[0][0][0].name.uri === "" && $[0][0][0].name.local === "Teams") {
      let next_input = $[0][1];
      return map4(
        parse_teams(next_input),
        (_use0) => {
          let team_a = _use0[0];
          let team_b = _use0[1];
          let next_input$1 = _use0[2];
          return [new Report(team_a, team_b), next_input$1];
        }
      );
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag) {
      let tag = $[0][0][0];
      let next_input = $[0][1];
      return try$(
        skip_tag(next_input),
        (next_input_2) => {
          return parse_report_element(next_input_2);
        }
      );
    } else if ($.isOk() && $[0][0] instanceof ElementEnd) {
      return new Error2("Unexpected end of XML");
    } else if ($.isOk() && $[0][0] instanceof Data) {
      let data = $[0][0][0];
      return new Error2(
        concat2(toList(["Unexpected data at report: ", data]))
      );
    } else {
      let next_input = $[0][1];
      loop$input = next_input;
    }
  }
}
function parse_report_xml(loop$input) {
  while (true) {
    let input2 = loop$input;
    let $ = signal(input2);
    if (!$.isOk()) {
      let e = $[0];
      return new Error2(input_error_to_string(e));
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag && $[0][0][0].name instanceof Name && $[0][0][0].name.uri === "" && $[0][0][0].name.local === "FullAfterActionReport") {
      let next_input = $[0][1];
      return parse_report_element(next_input);
    } else if ($.isOk() && $[0][0] instanceof ElementStart && $[0][0][0] instanceof Tag) {
      let next_input = $[0][1];
      return try$(
        skip_tag(next_input),
        (next_input_2) => {
          return parse_report_xml(next_input_2);
        }
      );
    } else if ($.isOk() && $[0][0] instanceof ElementEnd) {
      return new Error2("Unexpected end of XML");
    } else if ($.isOk() && $[0][0] instanceof Data) {
      let data = $[0][0][0];
      return new Error2(
        concat2(toList(["Unexpected data at root: ", data]))
      );
    } else {
      let next_input = $[0][1];
      loop$input = next_input;
    }
  }
}
function parse_report(content) {
  let _pipe = content;
  let _pipe$1 = from_string(_pipe);
  let _pipe$2 = with_stripping(_pipe$1, true);
  return parse_report_xml(_pipe$2);
}
function echo(value, file, line) {
  const grey = "\x1B[90m";
  const reset_color = "\x1B[39m";
  const file_line = `${file}:${line}`;
  const string_value = echo$inspect(value);
  if (globalThis.process?.stderr?.write) {
    const string5 = `${grey}${file_line}${reset_color}
${string_value}
`;
    process.stderr.write(string5);
  } else if (globalThis.Deno) {
    const string5 = `${grey}${file_line}${reset_color}
${string_value}
`;
    globalThis.Deno.stderr.writeSync(new TextEncoder().encode(string5));
  } else {
    const string5 = `${file_line}
${string_value}`;
    globalThis.console.log(string5);
  }
  return value;
}
function echo$inspectString(str) {
  let new_str = '"';
  for (let i = 0; i < str.length; i++) {
    let char = str[i];
    if (char == "\n") new_str += "\\n";
    else if (char == "\r") new_str += "\\r";
    else if (char == "	") new_str += "\\t";
    else if (char == "\f") new_str += "\\f";
    else if (char == "\\") new_str += "\\\\";
    else if (char == '"') new_str += '\\"';
    else if (char < " " || char > "~" && char < "\xA0") {
      new_str += "\\u{" + char.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0") + "}";
    } else {
      new_str += char;
    }
  }
  new_str += '"';
  return new_str;
}
function echo$inspectDict(map6) {
  let body = "dict.from_list([";
  let first = true;
  let key_value_pairs = [];
  map6.forEach((value, key) => {
    key_value_pairs.push([key, value]);
  });
  key_value_pairs.sort();
  key_value_pairs.forEach(([key, value]) => {
    if (!first) body = body + ", ";
    body = body + "#(" + echo$inspect(key) + ", " + echo$inspect(value) + ")";
    first = false;
  });
  return body + "])";
}
function echo$inspectCustomType(record) {
  const props = globalThis.Object.keys(record).map((label) => {
    const value = echo$inspect(record[label]);
    return isNaN(parseInt(label)) ? `${label}: ${value}` : value;
  }).join(", ");
  return props ? `${record.constructor.name}(${props})` : record.constructor.name;
}
function echo$inspectObject(v) {
  const name = Object.getPrototypeOf(v)?.constructor?.name || "Object";
  const props = [];
  for (const k of Object.keys(v)) {
    props.push(`${echo$inspect(k)}: ${echo$inspect(v[k])}`);
  }
  const body = props.length ? " " + props.join(", ") + " " : "";
  const head = name === "Object" ? "" : name + " ";
  return `//js(${head}{${body}})`;
}
function echo$inspect(v) {
  const t = typeof v;
  if (v === true) return "True";
  if (v === false) return "False";
  if (v === null) return "//js(null)";
  if (v === void 0) return "Nil";
  if (t === "string") return echo$inspectString(v);
  if (t === "bigint" || t === "number") return v.toString();
  if (globalThis.Array.isArray(v))
    return `#(${v.map(echo$inspect).join(", ")})`;
  if (v instanceof List)
    return `[${v.toArray().map(echo$inspect).join(", ")}]`;
  if (v instanceof UtfCodepoint)
    return `//utfcodepoint(${String.fromCodePoint(v.value)})`;
  if (v instanceof BitArray) return echo$inspectBitArray(v);
  if (v instanceof CustomType) return echo$inspectCustomType(v);
  if (echo$isDict(v)) return echo$inspectDict(v);
  if (v instanceof Set)
    return `//js(Set(${[...v].map(echo$inspect).join(", ")}))`;
  if (v instanceof RegExp) return `//js(${v})`;
  if (v instanceof Date) return `//js(Date("${v.toISOString()}"))`;
  if (v instanceof Function) {
    const args = [];
    for (const i of Array(v.length).keys())
      args.push(String.fromCharCode(i + 97));
    return `//fn(${args.join(", ")}) { ... }`;
  }
  return echo$inspectObject(v);
}
function echo$inspectBitArray(bitArray) {
  let endOfAlignedBytes = bitArray.bitOffset + 8 * Math.trunc(bitArray.bitSize / 8);
  let alignedBytes = bitArraySlice(
    bitArray,
    bitArray.bitOffset,
    endOfAlignedBytes
  );
  let remainingUnalignedBits = bitArray.bitSize % 8;
  if (remainingUnalignedBits > 0) {
    let remainingBits = bitArraySliceToInt(
      bitArray,
      endOfAlignedBytes,
      bitArray.bitSize,
      false,
      false
    );
    let alignedBytesArray = Array.from(alignedBytes.rawBuffer);
    let suffix = `${remainingBits}:size(${remainingUnalignedBits})`;
    if (alignedBytesArray.length === 0) {
      return `<<${suffix}>>`;
    } else {
      return `<<${Array.from(alignedBytes.rawBuffer).join(", ")}, ${suffix}>>`;
    }
  } else {
    return `<<${Array.from(alignedBytes.rawBuffer).join(", ")}>>`;
  }
}
function echo$isDict(value) {
  try {
    return value instanceof Dict;
  } catch {
    return false;
  }
}

// build/dev/javascript/neb_stats/read_report_ffi.mjs
function readUploadedFile(inputId) {
  return new Promise((resolve2, reject) => {
    const input2 = document.getElementById(inputId);
    if (!input2 || !input2.files || input2.files.length === 0) {
      reject(new Error("No file selected"));
      return;
    }
    const file = input2.files[0];
    const reader = new FileReader();
    reader.onload = (event4) => resolve2(event4.target.result);
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

// build/dev/javascript/neb_stats/neb_stats.mjs
var AppState = class extends CustomType {
  constructor(report, error_message) {
    super();
    this.report = report;
    this.error_message = error_message;
  }
};
var UploadReport = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var ReportRead = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var ReportReadFailed = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
var ReportMsg = class extends CustomType {
  constructor(x0) {
    super();
    this[0] = x0;
  }
};
function init2(_) {
  return [new AppState(new None(), new None()), none()];
}
function update3(state, msg) {
  if (msg instanceof UploadReport) {
    let read_effect = from(
      (dispatch) => {
        let _pipe = readUploadedFile("report_field");
        tap(
          _pipe,
          (content) => {
            return dispatch(new ReportRead(content));
          }
        );
        return void 0;
      }
    );
    return [state, read_effect];
  } else if (msg instanceof ReportRead) {
    let content = msg[0];
    let _block;
    let $ = parse_report(content);
    if ($.isOk()) {
      let report = $[0][0];
      let _record = state;
      _block = new AppState(
        new Some(init(report)),
        _record.error_message
      );
    } else {
      let msg$1 = $[0];
      let _record = state;
      _block = new AppState(_record.report, new Some(msg$1));
    }
    let next_state = _block;
    return [next_state, none()];
  } else if (msg instanceof ReportReadFailed) {
    let error2 = msg[0];
    return [
      (() => {
        let _record = state;
        return new AppState(
          _record.report,
          new Some(concat2(toList(["Failed to read report: ", error2])))
        );
      })(),
      none()
    ];
  } else {
    let report_msg = msg[0];
    let _block;
    let $ = state.report;
    if ($ instanceof Some) {
      let report2 = $[0];
      _block = new Some(update2(report2, report_msg));
    } else {
      _block = new None();
    }
    let report = _block;
    return [
      (() => {
        let _record = state;
        return new AppState(report, _record.error_message);
      })(),
      none()
    ];
  }
}
function upload_form(error_message) {
  let _block;
  if (error_message instanceof Some) {
    let msg = error_message[0];
    _block = [true, msg];
  } else {
    _block = [false, "Upload an after action report xml"];
  }
  let $ = _block;
  let has_error = $[0];
  let help_text = $[1];
  return form(
    toList([
      class$("box"),
      on_change((var0) => {
        return new UploadReport(var0);
      })
    ]),
    toList([
      div(
        toList([class$("field")]),
        toList([
          div(
            toList([class$("control")]),
            toList([
              input(
                toList([
                  id("report_field"),
                  classes(toList([["input", true], ["is-danger", has_error]])),
                  type_("file")
                ])
              )
            ])
          ),
          p(
            toList([classes(toList([["help", true], ["is-danger", has_error]]))]),
            toList([text3(help_text)])
          )
        ])
      )
    ])
  );
}
function view2(state) {
  let $ = state.report;
  if ($ instanceof None) {
    return upload_form(state.error_message);
  } else {
    let report = $[0];
    let _pipe = view(report);
    return map5(_pipe, (var0) => {
      return new ReportMsg(var0);
    });
  }
}
function main() {
  let app = application(init2, update3, view2);
  let $ = start3(app, "#app", void 0);
  if (!$.isOk()) {
    throw makeError(
      "let_assert",
      "neb_stats",
      26,
      "main",
      "Pattern match failed, no pattern matched the value.",
      { value: $ }
    );
  }
  return void 0;
}

// build/.lustre/entry.mjs
main();
