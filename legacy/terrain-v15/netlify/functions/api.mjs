/* ============================================================
 *  Quercy Propreté — serveur de l'application terrain (v3.0)
 *  Fichier assemblé automatiquement : ne pas modifier ici.
 * ============================================================ */
import { createRequire as __qpCreateRequire } from "node:module";
if (typeof globalThis.require === "undefined") globalThis.require = __qpCreateRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/bn.js/lib/bn.js
var require_bn = __commonJS({
  "node_modules/bn.js/lib/bn.js"(exports, module) {
    (function(module2, exports2) {
      "use strict";
      function assert(val, msg) {
        if (!val) throw new Error(msg || "Assertion failed");
      }
      function inherits(ctor, superCtor) {
        ctor.super_ = superCtor;
        var TempCtor = function() {
        };
        TempCtor.prototype = superCtor.prototype;
        ctor.prototype = new TempCtor();
        ctor.prototype.constructor = ctor;
      }
      function BN(number, base, endian) {
        if (BN.isBN(number)) {
          return number;
        }
        this.negative = 0;
        this.words = null;
        this.length = 0;
        this.red = null;
        if (number !== null) {
          if (base === "le" || base === "be") {
            endian = base;
            base = 10;
          }
          this._init(number || 0, base || 10, endian || "be");
        }
      }
      if (typeof module2 === "object") {
        module2.exports = BN;
      } else {
        exports2.BN = BN;
      }
      BN.BN = BN;
      BN.wordSize = 26;
      var Buffer2;
      try {
        if (typeof window !== "undefined" && typeof window.Buffer !== "undefined") {
          Buffer2 = window.Buffer;
        } else {
          Buffer2 = __require("buffer").Buffer;
        }
      } catch (e) {
      }
      BN.isBN = function isBN(num) {
        if (num instanceof BN) {
          return true;
        }
        return num !== null && typeof num === "object" && num.constructor.wordSize === BN.wordSize && Array.isArray(num.words);
      };
      BN.max = function max(left, right) {
        if (left.cmp(right) > 0) return left;
        return right;
      };
      BN.min = function min(left, right) {
        if (left.cmp(right) < 0) return left;
        return right;
      };
      BN.prototype._init = function init(number, base, endian) {
        if (typeof number === "number") {
          return this._initNumber(number, base, endian);
        }
        if (typeof number === "object") {
          return this._initArray(number, base, endian);
        }
        if (base === "hex") {
          base = 16;
        }
        assert(base === (base | 0) && base >= 2 && base <= 36);
        number = number.toString().replace(/\s+/g, "");
        var start = 0;
        if (number[0] === "-") {
          start++;
          this.negative = 1;
        }
        if (start < number.length) {
          if (base === 16) {
            this._parseHex(number, start, endian);
          } else {
            this._parseBase(number, base, start);
            if (endian === "le") {
              this._initArray(this.toArray(), base, endian);
            }
          }
        }
      };
      BN.prototype._initNumber = function _initNumber(number, base, endian) {
        if (number < 0) {
          this.negative = 1;
          number = -number;
        }
        if (number < 67108864) {
          this.words = [number & 67108863];
          this.length = 1;
        } else if (number < 4503599627370496) {
          this.words = [
            number & 67108863,
            number / 67108864 & 67108863
          ];
          this.length = 2;
        } else {
          assert(number < 9007199254740992);
          this.words = [
            number & 67108863,
            number / 67108864 & 67108863,
            1
          ];
          this.length = 3;
        }
        if (endian !== "le") return;
        this._initArray(this.toArray(), base, endian);
      };
      BN.prototype._initArray = function _initArray(number, base, endian) {
        assert(typeof number.length === "number");
        if (number.length <= 0) {
          this.words = [0];
          this.length = 1;
          return this;
        }
        this.length = Math.ceil(number.length / 3);
        this.words = new Array(this.length);
        for (var i = 0; i < this.length; i++) {
          this.words[i] = 0;
        }
        var j, w;
        var off = 0;
        if (endian === "be") {
          for (i = number.length - 1, j = 0; i >= 0; i -= 3) {
            w = number[i] | number[i - 1] << 8 | number[i - 2] << 16;
            this.words[j] |= w << off & 67108863;
            this.words[j + 1] = w >>> 26 - off & 67108863;
            off += 24;
            if (off >= 26) {
              off -= 26;
              j++;
            }
          }
        } else if (endian === "le") {
          for (i = 0, j = 0; i < number.length; i += 3) {
            w = number[i] | number[i + 1] << 8 | number[i + 2] << 16;
            this.words[j] |= w << off & 67108863;
            this.words[j + 1] = w >>> 26 - off & 67108863;
            off += 24;
            if (off >= 26) {
              off -= 26;
              j++;
            }
          }
        }
        return this.strip();
      };
      function parseHex4Bits(string, index2) {
        var c = string.charCodeAt(index2);
        if (c >= 65 && c <= 70) {
          return c - 55;
        } else if (c >= 97 && c <= 102) {
          return c - 87;
        } else {
          return c - 48 & 15;
        }
      }
      function parseHexByte(string, lowerBound, index2) {
        var r = parseHex4Bits(string, index2);
        if (index2 - 1 >= lowerBound) {
          r |= parseHex4Bits(string, index2 - 1) << 4;
        }
        return r;
      }
      BN.prototype._parseHex = function _parseHex(number, start, endian) {
        this.length = Math.ceil((number.length - start) / 6);
        this.words = new Array(this.length);
        for (var i = 0; i < this.length; i++) {
          this.words[i] = 0;
        }
        var off = 0;
        var j = 0;
        var w;
        if (endian === "be") {
          for (i = number.length - 1; i >= start; i -= 2) {
            w = parseHexByte(number, start, i) << off;
            this.words[j] |= w & 67108863;
            if (off >= 18) {
              off -= 18;
              j += 1;
              this.words[j] |= w >>> 26;
            } else {
              off += 8;
            }
          }
        } else {
          var parseLength = number.length - start;
          for (i = parseLength % 2 === 0 ? start + 1 : start; i < number.length; i += 2) {
            w = parseHexByte(number, start, i) << off;
            this.words[j] |= w & 67108863;
            if (off >= 18) {
              off -= 18;
              j += 1;
              this.words[j] |= w >>> 26;
            } else {
              off += 8;
            }
          }
        }
        this.strip();
      };
      function parseBase(str, start, end, mul) {
        var r = 0;
        var len = Math.min(str.length, end);
        for (var i = start; i < len; i++) {
          var c = str.charCodeAt(i) - 48;
          r *= mul;
          if (c >= 49) {
            r += c - 49 + 10;
          } else if (c >= 17) {
            r += c - 17 + 10;
          } else {
            r += c;
          }
        }
        return r;
      }
      BN.prototype._parseBase = function _parseBase(number, base, start) {
        this.words = [0];
        this.length = 1;
        for (var limbLen = 0, limbPow = 1; limbPow <= 67108863; limbPow *= base) {
          limbLen++;
        }
        limbLen--;
        limbPow = limbPow / base | 0;
        var total = number.length - start;
        var mod = total % limbLen;
        var end = Math.min(total, total - mod) + start;
        var word = 0;
        for (var i = start; i < end; i += limbLen) {
          word = parseBase(number, i, i + limbLen, base);
          this.imuln(limbPow);
          if (this.words[0] + word < 67108864) {
            this.words[0] += word;
          } else {
            this._iaddn(word);
          }
        }
        if (mod !== 0) {
          var pow = 1;
          word = parseBase(number, i, number.length, base);
          for (i = 0; i < mod; i++) {
            pow *= base;
          }
          this.imuln(pow);
          if (this.words[0] + word < 67108864) {
            this.words[0] += word;
          } else {
            this._iaddn(word);
          }
        }
        this.strip();
      };
      BN.prototype.copy = function copy(dest) {
        dest.words = new Array(this.length);
        for (var i = 0; i < this.length; i++) {
          dest.words[i] = this.words[i];
        }
        dest.length = this.length;
        dest.negative = this.negative;
        dest.red = this.red;
      };
      BN.prototype.clone = function clone() {
        var r = new BN(null);
        this.copy(r);
        return r;
      };
      BN.prototype._expand = function _expand(size) {
        while (this.length < size) {
          this.words[this.length++] = 0;
        }
        return this;
      };
      BN.prototype.strip = function strip() {
        while (this.length > 1 && this.words[this.length - 1] === 0) {
          this.length--;
        }
        return this._normSign();
      };
      BN.prototype._normSign = function _normSign() {
        if (this.length === 1 && this.words[0] === 0) {
          this.negative = 0;
        }
        return this;
      };
      BN.prototype.inspect = function inspect() {
        return (this.red ? "<BN-R: " : "<BN: ") + this.toString(16) + ">";
      };
      var zeros = [
        "",
        "0",
        "00",
        "000",
        "0000",
        "00000",
        "000000",
        "0000000",
        "00000000",
        "000000000",
        "0000000000",
        "00000000000",
        "000000000000",
        "0000000000000",
        "00000000000000",
        "000000000000000",
        "0000000000000000",
        "00000000000000000",
        "000000000000000000",
        "0000000000000000000",
        "00000000000000000000",
        "000000000000000000000",
        "0000000000000000000000",
        "00000000000000000000000",
        "000000000000000000000000",
        "0000000000000000000000000"
      ];
      var groupSizes = [
        0,
        0,
        25,
        16,
        12,
        11,
        10,
        9,
        8,
        8,
        7,
        7,
        7,
        7,
        6,
        6,
        6,
        6,
        6,
        6,
        6,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5,
        5
      ];
      var groupBases = [
        0,
        0,
        33554432,
        43046721,
        16777216,
        48828125,
        60466176,
        40353607,
        16777216,
        43046721,
        1e7,
        19487171,
        35831808,
        62748517,
        7529536,
        11390625,
        16777216,
        24137569,
        34012224,
        47045881,
        64e6,
        4084101,
        5153632,
        6436343,
        7962624,
        9765625,
        11881376,
        14348907,
        17210368,
        20511149,
        243e5,
        28629151,
        33554432,
        39135393,
        45435424,
        52521875,
        60466176
      ];
      BN.prototype.toString = function toString(base, padding) {
        base = base || 10;
        padding = padding | 0 || 1;
        var out;
        if (base === 16 || base === "hex") {
          out = "";
          var off = 0;
          var carry = 0;
          for (var i = 0; i < this.length; i++) {
            var w = this.words[i];
            var word = ((w << off | carry) & 16777215).toString(16);
            carry = w >>> 24 - off & 16777215;
            off += 2;
            if (off >= 26) {
              off -= 26;
              i--;
            }
            if (carry !== 0 || i !== this.length - 1) {
              out = zeros[6 - word.length] + word + out;
            } else {
              out = word + out;
            }
          }
          if (carry !== 0) {
            out = carry.toString(16) + out;
          }
          while (out.length % padding !== 0) {
            out = "0" + out;
          }
          if (this.negative !== 0) {
            out = "-" + out;
          }
          return out;
        }
        if (base === (base | 0) && base >= 2 && base <= 36) {
          var groupSize = groupSizes[base];
          var groupBase = groupBases[base];
          out = "";
          var c = this.clone();
          c.negative = 0;
          while (!c.isZero()) {
            var r = c.modn(groupBase).toString(base);
            c = c.idivn(groupBase);
            if (!c.isZero()) {
              out = zeros[groupSize - r.length] + r + out;
            } else {
              out = r + out;
            }
          }
          if (this.isZero()) {
            out = "0" + out;
          }
          while (out.length % padding !== 0) {
            out = "0" + out;
          }
          if (this.negative !== 0) {
            out = "-" + out;
          }
          return out;
        }
        assert(false, "Base should be between 2 and 36");
      };
      BN.prototype.toNumber = function toNumber() {
        var ret = this.words[0];
        if (this.length === 2) {
          ret += this.words[1] * 67108864;
        } else if (this.length === 3 && this.words[2] === 1) {
          ret += 4503599627370496 + this.words[1] * 67108864;
        } else if (this.length > 2) {
          assert(false, "Number can only safely store up to 53 bits");
        }
        return this.negative !== 0 ? -ret : ret;
      };
      BN.prototype.toJSON = function toJSON() {
        return this.toString(16);
      };
      BN.prototype.toBuffer = function toBuffer(endian, length) {
        assert(typeof Buffer2 !== "undefined");
        return this.toArrayLike(Buffer2, endian, length);
      };
      BN.prototype.toArray = function toArray(endian, length) {
        return this.toArrayLike(Array, endian, length);
      };
      BN.prototype.toArrayLike = function toArrayLike(ArrayType, endian, length) {
        var byteLength = this.byteLength();
        var reqLength = length || Math.max(1, byteLength);
        assert(byteLength <= reqLength, "byte array longer than desired length");
        assert(reqLength > 0, "Requested array length <= 0");
        this.strip();
        var littleEndian = endian === "le";
        var res = new ArrayType(reqLength);
        var b, i;
        var q = this.clone();
        if (!littleEndian) {
          for (i = 0; i < reqLength - byteLength; i++) {
            res[i] = 0;
          }
          for (i = 0; !q.isZero(); i++) {
            b = q.andln(255);
            q.iushrn(8);
            res[reqLength - i - 1] = b;
          }
        } else {
          for (i = 0; !q.isZero(); i++) {
            b = q.andln(255);
            q.iushrn(8);
            res[i] = b;
          }
          for (; i < reqLength; i++) {
            res[i] = 0;
          }
        }
        return res;
      };
      if (Math.clz32) {
        BN.prototype._countBits = function _countBits(w) {
          return 32 - Math.clz32(w);
        };
      } else {
        BN.prototype._countBits = function _countBits(w) {
          var t = w;
          var r = 0;
          if (t >= 4096) {
            r += 13;
            t >>>= 13;
          }
          if (t >= 64) {
            r += 7;
            t >>>= 7;
          }
          if (t >= 8) {
            r += 4;
            t >>>= 4;
          }
          if (t >= 2) {
            r += 2;
            t >>>= 2;
          }
          return r + t;
        };
      }
      BN.prototype._zeroBits = function _zeroBits(w) {
        if (w === 0) return 26;
        var t = w;
        var r = 0;
        if ((t & 8191) === 0) {
          r += 13;
          t >>>= 13;
        }
        if ((t & 127) === 0) {
          r += 7;
          t >>>= 7;
        }
        if ((t & 15) === 0) {
          r += 4;
          t >>>= 4;
        }
        if ((t & 3) === 0) {
          r += 2;
          t >>>= 2;
        }
        if ((t & 1) === 0) {
          r++;
        }
        return r;
      };
      BN.prototype.bitLength = function bitLength() {
        var w = this.words[this.length - 1];
        var hi = this._countBits(w);
        return (this.length - 1) * 26 + hi;
      };
      function toBitArray(num) {
        var w = new Array(num.bitLength());
        for (var bit = 0; bit < w.length; bit++) {
          var off = bit / 26 | 0;
          var wbit = bit % 26;
          w[bit] = (num.words[off] & 1 << wbit) >>> wbit;
        }
        return w;
      }
      BN.prototype.zeroBits = function zeroBits() {
        if (this.isZero()) return 0;
        var r = 0;
        for (var i = 0; i < this.length; i++) {
          var b = this._zeroBits(this.words[i]);
          r += b;
          if (b !== 26) break;
        }
        return r;
      };
      BN.prototype.byteLength = function byteLength() {
        return Math.ceil(this.bitLength() / 8);
      };
      BN.prototype.toTwos = function toTwos(width) {
        if (this.negative !== 0) {
          return this.abs().inotn(width).iaddn(1);
        }
        return this.clone();
      };
      BN.prototype.fromTwos = function fromTwos(width) {
        if (this.testn(width - 1)) {
          return this.notn(width).iaddn(1).ineg();
        }
        return this.clone();
      };
      BN.prototype.isNeg = function isNeg() {
        return this.negative !== 0;
      };
      BN.prototype.neg = function neg() {
        return this.clone().ineg();
      };
      BN.prototype.ineg = function ineg() {
        if (!this.isZero()) {
          this.negative ^= 1;
        }
        return this;
      };
      BN.prototype.iuor = function iuor(num) {
        while (this.length < num.length) {
          this.words[this.length++] = 0;
        }
        for (var i = 0; i < num.length; i++) {
          this.words[i] = this.words[i] | num.words[i];
        }
        return this.strip();
      };
      BN.prototype.ior = function ior(num) {
        assert((this.negative | num.negative) === 0);
        return this.iuor(num);
      };
      BN.prototype.or = function or(num) {
        if (this.length > num.length) return this.clone().ior(num);
        return num.clone().ior(this);
      };
      BN.prototype.uor = function uor(num) {
        if (this.length > num.length) return this.clone().iuor(num);
        return num.clone().iuor(this);
      };
      BN.prototype.iuand = function iuand(num) {
        var b;
        if (this.length > num.length) {
          b = num;
        } else {
          b = this;
        }
        for (var i = 0; i < b.length; i++) {
          this.words[i] = this.words[i] & num.words[i];
        }
        this.length = b.length;
        return this.strip();
      };
      BN.prototype.iand = function iand(num) {
        assert((this.negative | num.negative) === 0);
        return this.iuand(num);
      };
      BN.prototype.and = function and(num) {
        if (this.length > num.length) return this.clone().iand(num);
        return num.clone().iand(this);
      };
      BN.prototype.uand = function uand(num) {
        if (this.length > num.length) return this.clone().iuand(num);
        return num.clone().iuand(this);
      };
      BN.prototype.iuxor = function iuxor(num) {
        var a;
        var b;
        if (this.length > num.length) {
          a = this;
          b = num;
        } else {
          a = num;
          b = this;
        }
        for (var i = 0; i < b.length; i++) {
          this.words[i] = a.words[i] ^ b.words[i];
        }
        if (this !== a) {
          for (; i < a.length; i++) {
            this.words[i] = a.words[i];
          }
        }
        this.length = a.length;
        return this.strip();
      };
      BN.prototype.ixor = function ixor(num) {
        assert((this.negative | num.negative) === 0);
        return this.iuxor(num);
      };
      BN.prototype.xor = function xor(num) {
        if (this.length > num.length) return this.clone().ixor(num);
        return num.clone().ixor(this);
      };
      BN.prototype.uxor = function uxor(num) {
        if (this.length > num.length) return this.clone().iuxor(num);
        return num.clone().iuxor(this);
      };
      BN.prototype.inotn = function inotn(width) {
        assert(typeof width === "number" && width >= 0);
        var bytesNeeded = Math.ceil(width / 26) | 0;
        var bitsLeft = width % 26;
        this._expand(bytesNeeded);
        if (bitsLeft > 0) {
          bytesNeeded--;
        }
        for (var i = 0; i < bytesNeeded; i++) {
          this.words[i] = ~this.words[i] & 67108863;
        }
        if (bitsLeft > 0) {
          this.words[i] = ~this.words[i] & 67108863 >> 26 - bitsLeft;
          i++;
        }
        for (; i < this.length; i++) {
          this.words[i] = 0;
        }
        return this.strip();
      };
      BN.prototype.notn = function notn(width) {
        return this.clone().inotn(width);
      };
      BN.prototype.setn = function setn(bit, val) {
        assert(typeof bit === "number" && bit >= 0);
        var off = bit / 26 | 0;
        var wbit = bit % 26;
        this._expand(off + 1);
        if (val) {
          this.words[off] = this.words[off] | 1 << wbit;
        } else {
          this.words[off] = this.words[off] & ~(1 << wbit);
        }
        return this.strip();
      };
      BN.prototype.iadd = function iadd(num) {
        var r;
        if (this.negative !== 0 && num.negative === 0) {
          this.negative = 0;
          r = this.isub(num);
          this.negative ^= 1;
          return this._normSign();
        } else if (this.negative === 0 && num.negative !== 0) {
          num.negative = 0;
          r = this.isub(num);
          num.negative = 1;
          return r._normSign();
        }
        var a, b;
        if (this.length > num.length) {
          a = this;
          b = num;
        } else {
          a = num;
          b = this;
        }
        var carry = 0;
        for (var i = 0; i < b.length; i++) {
          r = (a.words[i] | 0) + (b.words[i] | 0) + carry;
          this.words[i] = r & 67108863;
          carry = r >>> 26;
        }
        for (; carry !== 0 && i < a.length; i++) {
          r = (a.words[i] | 0) + carry;
          this.words[i] = r & 67108863;
          carry = r >>> 26;
        }
        this.length = a.length;
        if (carry !== 0) {
          this.words[this.length] = carry;
          this.length++;
        } else if (a !== this) {
          for (; i < a.length; i++) {
            this.words[i] = a.words[i];
          }
        }
        return this;
      };
      BN.prototype.add = function add(num) {
        var res;
        if (num.negative !== 0 && this.negative === 0) {
          num.negative = 0;
          res = this.sub(num);
          num.negative ^= 1;
          return res;
        } else if (num.negative === 0 && this.negative !== 0) {
          this.negative = 0;
          res = num.sub(this);
          this.negative = 1;
          return res;
        }
        if (this.length > num.length) return this.clone().iadd(num);
        return num.clone().iadd(this);
      };
      BN.prototype.isub = function isub(num) {
        if (num.negative !== 0) {
          num.negative = 0;
          var r = this.iadd(num);
          num.negative = 1;
          return r._normSign();
        } else if (this.negative !== 0) {
          this.negative = 0;
          this.iadd(num);
          this.negative = 1;
          return this._normSign();
        }
        var cmp = this.cmp(num);
        if (cmp === 0) {
          this.negative = 0;
          this.length = 1;
          this.words[0] = 0;
          return this;
        }
        var a, b;
        if (cmp > 0) {
          a = this;
          b = num;
        } else {
          a = num;
          b = this;
        }
        var carry = 0;
        for (var i = 0; i < b.length; i++) {
          r = (a.words[i] | 0) - (b.words[i] | 0) + carry;
          carry = r >> 26;
          this.words[i] = r & 67108863;
        }
        for (; carry !== 0 && i < a.length; i++) {
          r = (a.words[i] | 0) + carry;
          carry = r >> 26;
          this.words[i] = r & 67108863;
        }
        if (carry === 0 && i < a.length && a !== this) {
          for (; i < a.length; i++) {
            this.words[i] = a.words[i];
          }
        }
        this.length = Math.max(this.length, i);
        if (a !== this) {
          this.negative = 1;
        }
        return this.strip();
      };
      BN.prototype.sub = function sub(num) {
        return this.clone().isub(num);
      };
      function smallMulTo(self, num, out) {
        out.negative = num.negative ^ self.negative;
        var len = self.length + num.length | 0;
        out.length = len;
        len = len - 1 | 0;
        var a = self.words[0] | 0;
        var b = num.words[0] | 0;
        var r = a * b;
        var lo = r & 67108863;
        var carry = r / 67108864 | 0;
        out.words[0] = lo;
        for (var k = 1; k < len; k++) {
          var ncarry = carry >>> 26;
          var rword = carry & 67108863;
          var maxJ = Math.min(k, num.length - 1);
          for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
            var i = k - j | 0;
            a = self.words[i] | 0;
            b = num.words[j] | 0;
            r = a * b + rword;
            ncarry += r / 67108864 | 0;
            rword = r & 67108863;
          }
          out.words[k] = rword | 0;
          carry = ncarry | 0;
        }
        if (carry !== 0) {
          out.words[k] = carry | 0;
        } else {
          out.length--;
        }
        return out.strip();
      }
      var comb10MulTo = function comb10MulTo2(self, num, out) {
        var a = self.words;
        var b = num.words;
        var o = out.words;
        var c = 0;
        var lo;
        var mid;
        var hi;
        var a0 = a[0] | 0;
        var al0 = a0 & 8191;
        var ah0 = a0 >>> 13;
        var a1 = a[1] | 0;
        var al1 = a1 & 8191;
        var ah1 = a1 >>> 13;
        var a2 = a[2] | 0;
        var al2 = a2 & 8191;
        var ah2 = a2 >>> 13;
        var a3 = a[3] | 0;
        var al3 = a3 & 8191;
        var ah3 = a3 >>> 13;
        var a4 = a[4] | 0;
        var al4 = a4 & 8191;
        var ah4 = a4 >>> 13;
        var a5 = a[5] | 0;
        var al5 = a5 & 8191;
        var ah5 = a5 >>> 13;
        var a6 = a[6] | 0;
        var al6 = a6 & 8191;
        var ah6 = a6 >>> 13;
        var a7 = a[7] | 0;
        var al7 = a7 & 8191;
        var ah7 = a7 >>> 13;
        var a8 = a[8] | 0;
        var al8 = a8 & 8191;
        var ah8 = a8 >>> 13;
        var a9 = a[9] | 0;
        var al9 = a9 & 8191;
        var ah9 = a9 >>> 13;
        var b0 = b[0] | 0;
        var bl0 = b0 & 8191;
        var bh0 = b0 >>> 13;
        var b1 = b[1] | 0;
        var bl1 = b1 & 8191;
        var bh1 = b1 >>> 13;
        var b2 = b[2] | 0;
        var bl2 = b2 & 8191;
        var bh2 = b2 >>> 13;
        var b3 = b[3] | 0;
        var bl3 = b3 & 8191;
        var bh3 = b3 >>> 13;
        var b4 = b[4] | 0;
        var bl4 = b4 & 8191;
        var bh4 = b4 >>> 13;
        var b5 = b[5] | 0;
        var bl5 = b5 & 8191;
        var bh5 = b5 >>> 13;
        var b6 = b[6] | 0;
        var bl6 = b6 & 8191;
        var bh6 = b6 >>> 13;
        var b7 = b[7] | 0;
        var bl7 = b7 & 8191;
        var bh7 = b7 >>> 13;
        var b8 = b[8] | 0;
        var bl8 = b8 & 8191;
        var bh8 = b8 >>> 13;
        var b9 = b[9] | 0;
        var bl9 = b9 & 8191;
        var bh9 = b9 >>> 13;
        out.negative = self.negative ^ num.negative;
        out.length = 19;
        lo = Math.imul(al0, bl0);
        mid = Math.imul(al0, bh0);
        mid = mid + Math.imul(ah0, bl0) | 0;
        hi = Math.imul(ah0, bh0);
        var w0 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w0 >>> 26) | 0;
        w0 &= 67108863;
        lo = Math.imul(al1, bl0);
        mid = Math.imul(al1, bh0);
        mid = mid + Math.imul(ah1, bl0) | 0;
        hi = Math.imul(ah1, bh0);
        lo = lo + Math.imul(al0, bl1) | 0;
        mid = mid + Math.imul(al0, bh1) | 0;
        mid = mid + Math.imul(ah0, bl1) | 0;
        hi = hi + Math.imul(ah0, bh1) | 0;
        var w1 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w1 >>> 26) | 0;
        w1 &= 67108863;
        lo = Math.imul(al2, bl0);
        mid = Math.imul(al2, bh0);
        mid = mid + Math.imul(ah2, bl0) | 0;
        hi = Math.imul(ah2, bh0);
        lo = lo + Math.imul(al1, bl1) | 0;
        mid = mid + Math.imul(al1, bh1) | 0;
        mid = mid + Math.imul(ah1, bl1) | 0;
        hi = hi + Math.imul(ah1, bh1) | 0;
        lo = lo + Math.imul(al0, bl2) | 0;
        mid = mid + Math.imul(al0, bh2) | 0;
        mid = mid + Math.imul(ah0, bl2) | 0;
        hi = hi + Math.imul(ah0, bh2) | 0;
        var w2 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w2 >>> 26) | 0;
        w2 &= 67108863;
        lo = Math.imul(al3, bl0);
        mid = Math.imul(al3, bh0);
        mid = mid + Math.imul(ah3, bl0) | 0;
        hi = Math.imul(ah3, bh0);
        lo = lo + Math.imul(al2, bl1) | 0;
        mid = mid + Math.imul(al2, bh1) | 0;
        mid = mid + Math.imul(ah2, bl1) | 0;
        hi = hi + Math.imul(ah2, bh1) | 0;
        lo = lo + Math.imul(al1, bl2) | 0;
        mid = mid + Math.imul(al1, bh2) | 0;
        mid = mid + Math.imul(ah1, bl2) | 0;
        hi = hi + Math.imul(ah1, bh2) | 0;
        lo = lo + Math.imul(al0, bl3) | 0;
        mid = mid + Math.imul(al0, bh3) | 0;
        mid = mid + Math.imul(ah0, bl3) | 0;
        hi = hi + Math.imul(ah0, bh3) | 0;
        var w3 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w3 >>> 26) | 0;
        w3 &= 67108863;
        lo = Math.imul(al4, bl0);
        mid = Math.imul(al4, bh0);
        mid = mid + Math.imul(ah4, bl0) | 0;
        hi = Math.imul(ah4, bh0);
        lo = lo + Math.imul(al3, bl1) | 0;
        mid = mid + Math.imul(al3, bh1) | 0;
        mid = mid + Math.imul(ah3, bl1) | 0;
        hi = hi + Math.imul(ah3, bh1) | 0;
        lo = lo + Math.imul(al2, bl2) | 0;
        mid = mid + Math.imul(al2, bh2) | 0;
        mid = mid + Math.imul(ah2, bl2) | 0;
        hi = hi + Math.imul(ah2, bh2) | 0;
        lo = lo + Math.imul(al1, bl3) | 0;
        mid = mid + Math.imul(al1, bh3) | 0;
        mid = mid + Math.imul(ah1, bl3) | 0;
        hi = hi + Math.imul(ah1, bh3) | 0;
        lo = lo + Math.imul(al0, bl4) | 0;
        mid = mid + Math.imul(al0, bh4) | 0;
        mid = mid + Math.imul(ah0, bl4) | 0;
        hi = hi + Math.imul(ah0, bh4) | 0;
        var w4 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w4 >>> 26) | 0;
        w4 &= 67108863;
        lo = Math.imul(al5, bl0);
        mid = Math.imul(al5, bh0);
        mid = mid + Math.imul(ah5, bl0) | 0;
        hi = Math.imul(ah5, bh0);
        lo = lo + Math.imul(al4, bl1) | 0;
        mid = mid + Math.imul(al4, bh1) | 0;
        mid = mid + Math.imul(ah4, bl1) | 0;
        hi = hi + Math.imul(ah4, bh1) | 0;
        lo = lo + Math.imul(al3, bl2) | 0;
        mid = mid + Math.imul(al3, bh2) | 0;
        mid = mid + Math.imul(ah3, bl2) | 0;
        hi = hi + Math.imul(ah3, bh2) | 0;
        lo = lo + Math.imul(al2, bl3) | 0;
        mid = mid + Math.imul(al2, bh3) | 0;
        mid = mid + Math.imul(ah2, bl3) | 0;
        hi = hi + Math.imul(ah2, bh3) | 0;
        lo = lo + Math.imul(al1, bl4) | 0;
        mid = mid + Math.imul(al1, bh4) | 0;
        mid = mid + Math.imul(ah1, bl4) | 0;
        hi = hi + Math.imul(ah1, bh4) | 0;
        lo = lo + Math.imul(al0, bl5) | 0;
        mid = mid + Math.imul(al0, bh5) | 0;
        mid = mid + Math.imul(ah0, bl5) | 0;
        hi = hi + Math.imul(ah0, bh5) | 0;
        var w5 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w5 >>> 26) | 0;
        w5 &= 67108863;
        lo = Math.imul(al6, bl0);
        mid = Math.imul(al6, bh0);
        mid = mid + Math.imul(ah6, bl0) | 0;
        hi = Math.imul(ah6, bh0);
        lo = lo + Math.imul(al5, bl1) | 0;
        mid = mid + Math.imul(al5, bh1) | 0;
        mid = mid + Math.imul(ah5, bl1) | 0;
        hi = hi + Math.imul(ah5, bh1) | 0;
        lo = lo + Math.imul(al4, bl2) | 0;
        mid = mid + Math.imul(al4, bh2) | 0;
        mid = mid + Math.imul(ah4, bl2) | 0;
        hi = hi + Math.imul(ah4, bh2) | 0;
        lo = lo + Math.imul(al3, bl3) | 0;
        mid = mid + Math.imul(al3, bh3) | 0;
        mid = mid + Math.imul(ah3, bl3) | 0;
        hi = hi + Math.imul(ah3, bh3) | 0;
        lo = lo + Math.imul(al2, bl4) | 0;
        mid = mid + Math.imul(al2, bh4) | 0;
        mid = mid + Math.imul(ah2, bl4) | 0;
        hi = hi + Math.imul(ah2, bh4) | 0;
        lo = lo + Math.imul(al1, bl5) | 0;
        mid = mid + Math.imul(al1, bh5) | 0;
        mid = mid + Math.imul(ah1, bl5) | 0;
        hi = hi + Math.imul(ah1, bh5) | 0;
        lo = lo + Math.imul(al0, bl6) | 0;
        mid = mid + Math.imul(al0, bh6) | 0;
        mid = mid + Math.imul(ah0, bl6) | 0;
        hi = hi + Math.imul(ah0, bh6) | 0;
        var w6 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w6 >>> 26) | 0;
        w6 &= 67108863;
        lo = Math.imul(al7, bl0);
        mid = Math.imul(al7, bh0);
        mid = mid + Math.imul(ah7, bl0) | 0;
        hi = Math.imul(ah7, bh0);
        lo = lo + Math.imul(al6, bl1) | 0;
        mid = mid + Math.imul(al6, bh1) | 0;
        mid = mid + Math.imul(ah6, bl1) | 0;
        hi = hi + Math.imul(ah6, bh1) | 0;
        lo = lo + Math.imul(al5, bl2) | 0;
        mid = mid + Math.imul(al5, bh2) | 0;
        mid = mid + Math.imul(ah5, bl2) | 0;
        hi = hi + Math.imul(ah5, bh2) | 0;
        lo = lo + Math.imul(al4, bl3) | 0;
        mid = mid + Math.imul(al4, bh3) | 0;
        mid = mid + Math.imul(ah4, bl3) | 0;
        hi = hi + Math.imul(ah4, bh3) | 0;
        lo = lo + Math.imul(al3, bl4) | 0;
        mid = mid + Math.imul(al3, bh4) | 0;
        mid = mid + Math.imul(ah3, bl4) | 0;
        hi = hi + Math.imul(ah3, bh4) | 0;
        lo = lo + Math.imul(al2, bl5) | 0;
        mid = mid + Math.imul(al2, bh5) | 0;
        mid = mid + Math.imul(ah2, bl5) | 0;
        hi = hi + Math.imul(ah2, bh5) | 0;
        lo = lo + Math.imul(al1, bl6) | 0;
        mid = mid + Math.imul(al1, bh6) | 0;
        mid = mid + Math.imul(ah1, bl6) | 0;
        hi = hi + Math.imul(ah1, bh6) | 0;
        lo = lo + Math.imul(al0, bl7) | 0;
        mid = mid + Math.imul(al0, bh7) | 0;
        mid = mid + Math.imul(ah0, bl7) | 0;
        hi = hi + Math.imul(ah0, bh7) | 0;
        var w7 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w7 >>> 26) | 0;
        w7 &= 67108863;
        lo = Math.imul(al8, bl0);
        mid = Math.imul(al8, bh0);
        mid = mid + Math.imul(ah8, bl0) | 0;
        hi = Math.imul(ah8, bh0);
        lo = lo + Math.imul(al7, bl1) | 0;
        mid = mid + Math.imul(al7, bh1) | 0;
        mid = mid + Math.imul(ah7, bl1) | 0;
        hi = hi + Math.imul(ah7, bh1) | 0;
        lo = lo + Math.imul(al6, bl2) | 0;
        mid = mid + Math.imul(al6, bh2) | 0;
        mid = mid + Math.imul(ah6, bl2) | 0;
        hi = hi + Math.imul(ah6, bh2) | 0;
        lo = lo + Math.imul(al5, bl3) | 0;
        mid = mid + Math.imul(al5, bh3) | 0;
        mid = mid + Math.imul(ah5, bl3) | 0;
        hi = hi + Math.imul(ah5, bh3) | 0;
        lo = lo + Math.imul(al4, bl4) | 0;
        mid = mid + Math.imul(al4, bh4) | 0;
        mid = mid + Math.imul(ah4, bl4) | 0;
        hi = hi + Math.imul(ah4, bh4) | 0;
        lo = lo + Math.imul(al3, bl5) | 0;
        mid = mid + Math.imul(al3, bh5) | 0;
        mid = mid + Math.imul(ah3, bl5) | 0;
        hi = hi + Math.imul(ah3, bh5) | 0;
        lo = lo + Math.imul(al2, bl6) | 0;
        mid = mid + Math.imul(al2, bh6) | 0;
        mid = mid + Math.imul(ah2, bl6) | 0;
        hi = hi + Math.imul(ah2, bh6) | 0;
        lo = lo + Math.imul(al1, bl7) | 0;
        mid = mid + Math.imul(al1, bh7) | 0;
        mid = mid + Math.imul(ah1, bl7) | 0;
        hi = hi + Math.imul(ah1, bh7) | 0;
        lo = lo + Math.imul(al0, bl8) | 0;
        mid = mid + Math.imul(al0, bh8) | 0;
        mid = mid + Math.imul(ah0, bl8) | 0;
        hi = hi + Math.imul(ah0, bh8) | 0;
        var w8 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w8 >>> 26) | 0;
        w8 &= 67108863;
        lo = Math.imul(al9, bl0);
        mid = Math.imul(al9, bh0);
        mid = mid + Math.imul(ah9, bl0) | 0;
        hi = Math.imul(ah9, bh0);
        lo = lo + Math.imul(al8, bl1) | 0;
        mid = mid + Math.imul(al8, bh1) | 0;
        mid = mid + Math.imul(ah8, bl1) | 0;
        hi = hi + Math.imul(ah8, bh1) | 0;
        lo = lo + Math.imul(al7, bl2) | 0;
        mid = mid + Math.imul(al7, bh2) | 0;
        mid = mid + Math.imul(ah7, bl2) | 0;
        hi = hi + Math.imul(ah7, bh2) | 0;
        lo = lo + Math.imul(al6, bl3) | 0;
        mid = mid + Math.imul(al6, bh3) | 0;
        mid = mid + Math.imul(ah6, bl3) | 0;
        hi = hi + Math.imul(ah6, bh3) | 0;
        lo = lo + Math.imul(al5, bl4) | 0;
        mid = mid + Math.imul(al5, bh4) | 0;
        mid = mid + Math.imul(ah5, bl4) | 0;
        hi = hi + Math.imul(ah5, bh4) | 0;
        lo = lo + Math.imul(al4, bl5) | 0;
        mid = mid + Math.imul(al4, bh5) | 0;
        mid = mid + Math.imul(ah4, bl5) | 0;
        hi = hi + Math.imul(ah4, bh5) | 0;
        lo = lo + Math.imul(al3, bl6) | 0;
        mid = mid + Math.imul(al3, bh6) | 0;
        mid = mid + Math.imul(ah3, bl6) | 0;
        hi = hi + Math.imul(ah3, bh6) | 0;
        lo = lo + Math.imul(al2, bl7) | 0;
        mid = mid + Math.imul(al2, bh7) | 0;
        mid = mid + Math.imul(ah2, bl7) | 0;
        hi = hi + Math.imul(ah2, bh7) | 0;
        lo = lo + Math.imul(al1, bl8) | 0;
        mid = mid + Math.imul(al1, bh8) | 0;
        mid = mid + Math.imul(ah1, bl8) | 0;
        hi = hi + Math.imul(ah1, bh8) | 0;
        lo = lo + Math.imul(al0, bl9) | 0;
        mid = mid + Math.imul(al0, bh9) | 0;
        mid = mid + Math.imul(ah0, bl9) | 0;
        hi = hi + Math.imul(ah0, bh9) | 0;
        var w9 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w9 >>> 26) | 0;
        w9 &= 67108863;
        lo = Math.imul(al9, bl1);
        mid = Math.imul(al9, bh1);
        mid = mid + Math.imul(ah9, bl1) | 0;
        hi = Math.imul(ah9, bh1);
        lo = lo + Math.imul(al8, bl2) | 0;
        mid = mid + Math.imul(al8, bh2) | 0;
        mid = mid + Math.imul(ah8, bl2) | 0;
        hi = hi + Math.imul(ah8, bh2) | 0;
        lo = lo + Math.imul(al7, bl3) | 0;
        mid = mid + Math.imul(al7, bh3) | 0;
        mid = mid + Math.imul(ah7, bl3) | 0;
        hi = hi + Math.imul(ah7, bh3) | 0;
        lo = lo + Math.imul(al6, bl4) | 0;
        mid = mid + Math.imul(al6, bh4) | 0;
        mid = mid + Math.imul(ah6, bl4) | 0;
        hi = hi + Math.imul(ah6, bh4) | 0;
        lo = lo + Math.imul(al5, bl5) | 0;
        mid = mid + Math.imul(al5, bh5) | 0;
        mid = mid + Math.imul(ah5, bl5) | 0;
        hi = hi + Math.imul(ah5, bh5) | 0;
        lo = lo + Math.imul(al4, bl6) | 0;
        mid = mid + Math.imul(al4, bh6) | 0;
        mid = mid + Math.imul(ah4, bl6) | 0;
        hi = hi + Math.imul(ah4, bh6) | 0;
        lo = lo + Math.imul(al3, bl7) | 0;
        mid = mid + Math.imul(al3, bh7) | 0;
        mid = mid + Math.imul(ah3, bl7) | 0;
        hi = hi + Math.imul(ah3, bh7) | 0;
        lo = lo + Math.imul(al2, bl8) | 0;
        mid = mid + Math.imul(al2, bh8) | 0;
        mid = mid + Math.imul(ah2, bl8) | 0;
        hi = hi + Math.imul(ah2, bh8) | 0;
        lo = lo + Math.imul(al1, bl9) | 0;
        mid = mid + Math.imul(al1, bh9) | 0;
        mid = mid + Math.imul(ah1, bl9) | 0;
        hi = hi + Math.imul(ah1, bh9) | 0;
        var w10 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w10 >>> 26) | 0;
        w10 &= 67108863;
        lo = Math.imul(al9, bl2);
        mid = Math.imul(al9, bh2);
        mid = mid + Math.imul(ah9, bl2) | 0;
        hi = Math.imul(ah9, bh2);
        lo = lo + Math.imul(al8, bl3) | 0;
        mid = mid + Math.imul(al8, bh3) | 0;
        mid = mid + Math.imul(ah8, bl3) | 0;
        hi = hi + Math.imul(ah8, bh3) | 0;
        lo = lo + Math.imul(al7, bl4) | 0;
        mid = mid + Math.imul(al7, bh4) | 0;
        mid = mid + Math.imul(ah7, bl4) | 0;
        hi = hi + Math.imul(ah7, bh4) | 0;
        lo = lo + Math.imul(al6, bl5) | 0;
        mid = mid + Math.imul(al6, bh5) | 0;
        mid = mid + Math.imul(ah6, bl5) | 0;
        hi = hi + Math.imul(ah6, bh5) | 0;
        lo = lo + Math.imul(al5, bl6) | 0;
        mid = mid + Math.imul(al5, bh6) | 0;
        mid = mid + Math.imul(ah5, bl6) | 0;
        hi = hi + Math.imul(ah5, bh6) | 0;
        lo = lo + Math.imul(al4, bl7) | 0;
        mid = mid + Math.imul(al4, bh7) | 0;
        mid = mid + Math.imul(ah4, bl7) | 0;
        hi = hi + Math.imul(ah4, bh7) | 0;
        lo = lo + Math.imul(al3, bl8) | 0;
        mid = mid + Math.imul(al3, bh8) | 0;
        mid = mid + Math.imul(ah3, bl8) | 0;
        hi = hi + Math.imul(ah3, bh8) | 0;
        lo = lo + Math.imul(al2, bl9) | 0;
        mid = mid + Math.imul(al2, bh9) | 0;
        mid = mid + Math.imul(ah2, bl9) | 0;
        hi = hi + Math.imul(ah2, bh9) | 0;
        var w11 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w11 >>> 26) | 0;
        w11 &= 67108863;
        lo = Math.imul(al9, bl3);
        mid = Math.imul(al9, bh3);
        mid = mid + Math.imul(ah9, bl3) | 0;
        hi = Math.imul(ah9, bh3);
        lo = lo + Math.imul(al8, bl4) | 0;
        mid = mid + Math.imul(al8, bh4) | 0;
        mid = mid + Math.imul(ah8, bl4) | 0;
        hi = hi + Math.imul(ah8, bh4) | 0;
        lo = lo + Math.imul(al7, bl5) | 0;
        mid = mid + Math.imul(al7, bh5) | 0;
        mid = mid + Math.imul(ah7, bl5) | 0;
        hi = hi + Math.imul(ah7, bh5) | 0;
        lo = lo + Math.imul(al6, bl6) | 0;
        mid = mid + Math.imul(al6, bh6) | 0;
        mid = mid + Math.imul(ah6, bl6) | 0;
        hi = hi + Math.imul(ah6, bh6) | 0;
        lo = lo + Math.imul(al5, bl7) | 0;
        mid = mid + Math.imul(al5, bh7) | 0;
        mid = mid + Math.imul(ah5, bl7) | 0;
        hi = hi + Math.imul(ah5, bh7) | 0;
        lo = lo + Math.imul(al4, bl8) | 0;
        mid = mid + Math.imul(al4, bh8) | 0;
        mid = mid + Math.imul(ah4, bl8) | 0;
        hi = hi + Math.imul(ah4, bh8) | 0;
        lo = lo + Math.imul(al3, bl9) | 0;
        mid = mid + Math.imul(al3, bh9) | 0;
        mid = mid + Math.imul(ah3, bl9) | 0;
        hi = hi + Math.imul(ah3, bh9) | 0;
        var w12 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w12 >>> 26) | 0;
        w12 &= 67108863;
        lo = Math.imul(al9, bl4);
        mid = Math.imul(al9, bh4);
        mid = mid + Math.imul(ah9, bl4) | 0;
        hi = Math.imul(ah9, bh4);
        lo = lo + Math.imul(al8, bl5) | 0;
        mid = mid + Math.imul(al8, bh5) | 0;
        mid = mid + Math.imul(ah8, bl5) | 0;
        hi = hi + Math.imul(ah8, bh5) | 0;
        lo = lo + Math.imul(al7, bl6) | 0;
        mid = mid + Math.imul(al7, bh6) | 0;
        mid = mid + Math.imul(ah7, bl6) | 0;
        hi = hi + Math.imul(ah7, bh6) | 0;
        lo = lo + Math.imul(al6, bl7) | 0;
        mid = mid + Math.imul(al6, bh7) | 0;
        mid = mid + Math.imul(ah6, bl7) | 0;
        hi = hi + Math.imul(ah6, bh7) | 0;
        lo = lo + Math.imul(al5, bl8) | 0;
        mid = mid + Math.imul(al5, bh8) | 0;
        mid = mid + Math.imul(ah5, bl8) | 0;
        hi = hi + Math.imul(ah5, bh8) | 0;
        lo = lo + Math.imul(al4, bl9) | 0;
        mid = mid + Math.imul(al4, bh9) | 0;
        mid = mid + Math.imul(ah4, bl9) | 0;
        hi = hi + Math.imul(ah4, bh9) | 0;
        var w13 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w13 >>> 26) | 0;
        w13 &= 67108863;
        lo = Math.imul(al9, bl5);
        mid = Math.imul(al9, bh5);
        mid = mid + Math.imul(ah9, bl5) | 0;
        hi = Math.imul(ah9, bh5);
        lo = lo + Math.imul(al8, bl6) | 0;
        mid = mid + Math.imul(al8, bh6) | 0;
        mid = mid + Math.imul(ah8, bl6) | 0;
        hi = hi + Math.imul(ah8, bh6) | 0;
        lo = lo + Math.imul(al7, bl7) | 0;
        mid = mid + Math.imul(al7, bh7) | 0;
        mid = mid + Math.imul(ah7, bl7) | 0;
        hi = hi + Math.imul(ah7, bh7) | 0;
        lo = lo + Math.imul(al6, bl8) | 0;
        mid = mid + Math.imul(al6, bh8) | 0;
        mid = mid + Math.imul(ah6, bl8) | 0;
        hi = hi + Math.imul(ah6, bh8) | 0;
        lo = lo + Math.imul(al5, bl9) | 0;
        mid = mid + Math.imul(al5, bh9) | 0;
        mid = mid + Math.imul(ah5, bl9) | 0;
        hi = hi + Math.imul(ah5, bh9) | 0;
        var w14 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w14 >>> 26) | 0;
        w14 &= 67108863;
        lo = Math.imul(al9, bl6);
        mid = Math.imul(al9, bh6);
        mid = mid + Math.imul(ah9, bl6) | 0;
        hi = Math.imul(ah9, bh6);
        lo = lo + Math.imul(al8, bl7) | 0;
        mid = mid + Math.imul(al8, bh7) | 0;
        mid = mid + Math.imul(ah8, bl7) | 0;
        hi = hi + Math.imul(ah8, bh7) | 0;
        lo = lo + Math.imul(al7, bl8) | 0;
        mid = mid + Math.imul(al7, bh8) | 0;
        mid = mid + Math.imul(ah7, bl8) | 0;
        hi = hi + Math.imul(ah7, bh8) | 0;
        lo = lo + Math.imul(al6, bl9) | 0;
        mid = mid + Math.imul(al6, bh9) | 0;
        mid = mid + Math.imul(ah6, bl9) | 0;
        hi = hi + Math.imul(ah6, bh9) | 0;
        var w15 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w15 >>> 26) | 0;
        w15 &= 67108863;
        lo = Math.imul(al9, bl7);
        mid = Math.imul(al9, bh7);
        mid = mid + Math.imul(ah9, bl7) | 0;
        hi = Math.imul(ah9, bh7);
        lo = lo + Math.imul(al8, bl8) | 0;
        mid = mid + Math.imul(al8, bh8) | 0;
        mid = mid + Math.imul(ah8, bl8) | 0;
        hi = hi + Math.imul(ah8, bh8) | 0;
        lo = lo + Math.imul(al7, bl9) | 0;
        mid = mid + Math.imul(al7, bh9) | 0;
        mid = mid + Math.imul(ah7, bl9) | 0;
        hi = hi + Math.imul(ah7, bh9) | 0;
        var w16 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w16 >>> 26) | 0;
        w16 &= 67108863;
        lo = Math.imul(al9, bl8);
        mid = Math.imul(al9, bh8);
        mid = mid + Math.imul(ah9, bl8) | 0;
        hi = Math.imul(ah9, bh8);
        lo = lo + Math.imul(al8, bl9) | 0;
        mid = mid + Math.imul(al8, bh9) | 0;
        mid = mid + Math.imul(ah8, bl9) | 0;
        hi = hi + Math.imul(ah8, bh9) | 0;
        var w17 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w17 >>> 26) | 0;
        w17 &= 67108863;
        lo = Math.imul(al9, bl9);
        mid = Math.imul(al9, bh9);
        mid = mid + Math.imul(ah9, bl9) | 0;
        hi = Math.imul(ah9, bh9);
        var w18 = (c + lo | 0) + ((mid & 8191) << 13) | 0;
        c = (hi + (mid >>> 13) | 0) + (w18 >>> 26) | 0;
        w18 &= 67108863;
        o[0] = w0;
        o[1] = w1;
        o[2] = w2;
        o[3] = w3;
        o[4] = w4;
        o[5] = w5;
        o[6] = w6;
        o[7] = w7;
        o[8] = w8;
        o[9] = w9;
        o[10] = w10;
        o[11] = w11;
        o[12] = w12;
        o[13] = w13;
        o[14] = w14;
        o[15] = w15;
        o[16] = w16;
        o[17] = w17;
        o[18] = w18;
        if (c !== 0) {
          o[19] = c;
          out.length++;
        }
        return out;
      };
      if (!Math.imul) {
        comb10MulTo = smallMulTo;
      }
      function bigMulTo(self, num, out) {
        out.negative = num.negative ^ self.negative;
        out.length = self.length + num.length;
        var carry = 0;
        var hncarry = 0;
        for (var k = 0; k < out.length - 1; k++) {
          var ncarry = hncarry;
          hncarry = 0;
          var rword = carry & 67108863;
          var maxJ = Math.min(k, num.length - 1);
          for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
            var i = k - j;
            var a = self.words[i] | 0;
            var b = num.words[j] | 0;
            var r = a * b;
            var lo = r & 67108863;
            ncarry = ncarry + (r / 67108864 | 0) | 0;
            lo = lo + rword | 0;
            rword = lo & 67108863;
            ncarry = ncarry + (lo >>> 26) | 0;
            hncarry += ncarry >>> 26;
            ncarry &= 67108863;
          }
          out.words[k] = rword;
          carry = ncarry;
          ncarry = hncarry;
        }
        if (carry !== 0) {
          out.words[k] = carry;
        } else {
          out.length--;
        }
        return out.strip();
      }
      function jumboMulTo(self, num, out) {
        var fftm = new FFTM();
        return fftm.mulp(self, num, out);
      }
      BN.prototype.mulTo = function mulTo(num, out) {
        var res;
        var len = this.length + num.length;
        if (this.length === 10 && num.length === 10) {
          res = comb10MulTo(this, num, out);
        } else if (len < 63) {
          res = smallMulTo(this, num, out);
        } else if (len < 1024) {
          res = bigMulTo(this, num, out);
        } else {
          res = jumboMulTo(this, num, out);
        }
        return res;
      };
      function FFTM(x, y) {
        this.x = x;
        this.y = y;
      }
      FFTM.prototype.makeRBT = function makeRBT(N) {
        var t = new Array(N);
        var l = BN.prototype._countBits(N) - 1;
        for (var i = 0; i < N; i++) {
          t[i] = this.revBin(i, l, N);
        }
        return t;
      };
      FFTM.prototype.revBin = function revBin(x, l, N) {
        if (x === 0 || x === N - 1) return x;
        var rb = 0;
        for (var i = 0; i < l; i++) {
          rb |= (x & 1) << l - i - 1;
          x >>= 1;
        }
        return rb;
      };
      FFTM.prototype.permute = function permute(rbt, rws, iws, rtws, itws, N) {
        for (var i = 0; i < N; i++) {
          rtws[i] = rws[rbt[i]];
          itws[i] = iws[rbt[i]];
        }
      };
      FFTM.prototype.transform = function transform(rws, iws, rtws, itws, N, rbt) {
        this.permute(rbt, rws, iws, rtws, itws, N);
        for (var s = 1; s < N; s <<= 1) {
          var l = s << 1;
          var rtwdf = Math.cos(2 * Math.PI / l);
          var itwdf = Math.sin(2 * Math.PI / l);
          for (var p = 0; p < N; p += l) {
            var rtwdf_ = rtwdf;
            var itwdf_ = itwdf;
            for (var j = 0; j < s; j++) {
              var re = rtws[p + j];
              var ie = itws[p + j];
              var ro = rtws[p + j + s];
              var io = itws[p + j + s];
              var rx = rtwdf_ * ro - itwdf_ * io;
              io = rtwdf_ * io + itwdf_ * ro;
              ro = rx;
              rtws[p + j] = re + ro;
              itws[p + j] = ie + io;
              rtws[p + j + s] = re - ro;
              itws[p + j + s] = ie - io;
              if (j !== l) {
                rx = rtwdf * rtwdf_ - itwdf * itwdf_;
                itwdf_ = rtwdf * itwdf_ + itwdf * rtwdf_;
                rtwdf_ = rx;
              }
            }
          }
        }
      };
      FFTM.prototype.guessLen13b = function guessLen13b(n, m) {
        var N = Math.max(m, n) | 1;
        var odd = N & 1;
        var i = 0;
        for (N = N / 2 | 0; N; N = N >>> 1) {
          i++;
        }
        return 1 << i + 1 + odd;
      };
      FFTM.prototype.conjugate = function conjugate(rws, iws, N) {
        if (N <= 1) return;
        for (var i = 0; i < N / 2; i++) {
          var t = rws[i];
          rws[i] = rws[N - i - 1];
          rws[N - i - 1] = t;
          t = iws[i];
          iws[i] = -iws[N - i - 1];
          iws[N - i - 1] = -t;
        }
      };
      FFTM.prototype.normalize13b = function normalize13b(ws, N) {
        var carry = 0;
        for (var i = 0; i < N / 2; i++) {
          var w = Math.round(ws[2 * i + 1] / N) * 8192 + Math.round(ws[2 * i] / N) + carry;
          ws[i] = w & 67108863;
          if (w < 67108864) {
            carry = 0;
          } else {
            carry = w / 67108864 | 0;
          }
        }
        return ws;
      };
      FFTM.prototype.convert13b = function convert13b(ws, len, rws, N) {
        var carry = 0;
        for (var i = 0; i < len; i++) {
          carry = carry + (ws[i] | 0);
          rws[2 * i] = carry & 8191;
          carry = carry >>> 13;
          rws[2 * i + 1] = carry & 8191;
          carry = carry >>> 13;
        }
        for (i = 2 * len; i < N; ++i) {
          rws[i] = 0;
        }
        assert(carry === 0);
        assert((carry & ~8191) === 0);
      };
      FFTM.prototype.stub = function stub(N) {
        var ph = new Array(N);
        for (var i = 0; i < N; i++) {
          ph[i] = 0;
        }
        return ph;
      };
      FFTM.prototype.mulp = function mulp(x, y, out) {
        var N = 2 * this.guessLen13b(x.length, y.length);
        var rbt = this.makeRBT(N);
        var _ = this.stub(N);
        var rws = new Array(N);
        var rwst = new Array(N);
        var iwst = new Array(N);
        var nrws = new Array(N);
        var nrwst = new Array(N);
        var niwst = new Array(N);
        var rmws = out.words;
        rmws.length = N;
        this.convert13b(x.words, x.length, rws, N);
        this.convert13b(y.words, y.length, nrws, N);
        this.transform(rws, _, rwst, iwst, N, rbt);
        this.transform(nrws, _, nrwst, niwst, N, rbt);
        for (var i = 0; i < N; i++) {
          var rx = rwst[i] * nrwst[i] - iwst[i] * niwst[i];
          iwst[i] = rwst[i] * niwst[i] + iwst[i] * nrwst[i];
          rwst[i] = rx;
        }
        this.conjugate(rwst, iwst, N);
        this.transform(rwst, iwst, rmws, _, N, rbt);
        this.conjugate(rmws, _, N);
        this.normalize13b(rmws, N);
        out.negative = x.negative ^ y.negative;
        out.length = x.length + y.length;
        return out.strip();
      };
      BN.prototype.mul = function mul(num) {
        var out = new BN(null);
        out.words = new Array(this.length + num.length);
        return this.mulTo(num, out);
      };
      BN.prototype.mulf = function mulf(num) {
        var out = new BN(null);
        out.words = new Array(this.length + num.length);
        return jumboMulTo(this, num, out);
      };
      BN.prototype.imul = function imul(num) {
        return this.clone().mulTo(num, this);
      };
      BN.prototype.imuln = function imuln(num) {
        assert(typeof num === "number");
        assert(num < 67108864);
        var carry = 0;
        for (var i = 0; i < this.length; i++) {
          var w = (this.words[i] | 0) * num;
          var lo = (w & 67108863) + (carry & 67108863);
          carry >>= 26;
          carry += w / 67108864 | 0;
          carry += lo >>> 26;
          this.words[i] = lo & 67108863;
        }
        if (carry !== 0) {
          this.words[i] = carry;
          this.length++;
        }
        if (num === 0) {
          this.length = 1;
          this._normSign();
        }
        return this;
      };
      BN.prototype.muln = function muln(num) {
        return this.clone().imuln(num);
      };
      BN.prototype.sqr = function sqr() {
        return this.mul(this);
      };
      BN.prototype.isqr = function isqr() {
        return this.imul(this.clone());
      };
      BN.prototype.pow = function pow(num) {
        var w = toBitArray(num);
        if (w.length === 0) return new BN(1);
        var res = this;
        for (var i = 0; i < w.length; i++, res = res.sqr()) {
          if (w[i] !== 0) break;
        }
        if (++i < w.length) {
          for (var q = res.sqr(); i < w.length; i++, q = q.sqr()) {
            if (w[i] === 0) continue;
            res = res.mul(q);
          }
        }
        return res;
      };
      BN.prototype.iushln = function iushln(bits) {
        assert(typeof bits === "number" && bits >= 0);
        var r = bits % 26;
        var s = (bits - r) / 26;
        var carryMask = 67108863 >>> 26 - r << 26 - r;
        var i;
        if (r !== 0) {
          var carry = 0;
          for (i = 0; i < this.length; i++) {
            var newCarry = this.words[i] & carryMask;
            var c = (this.words[i] | 0) - newCarry << r;
            this.words[i] = c | carry;
            carry = newCarry >>> 26 - r;
          }
          if (carry) {
            this.words[i] = carry;
            this.length++;
          }
        }
        if (s !== 0) {
          for (i = this.length - 1; i >= 0; i--) {
            this.words[i + s] = this.words[i];
          }
          for (i = 0; i < s; i++) {
            this.words[i] = 0;
          }
          this.length += s;
        }
        return this.strip();
      };
      BN.prototype.ishln = function ishln(bits) {
        assert(this.negative === 0);
        return this.iushln(bits);
      };
      BN.prototype.iushrn = function iushrn(bits, hint, extended) {
        assert(typeof bits === "number" && bits >= 0);
        var h;
        if (hint) {
          h = (hint - hint % 26) / 26;
        } else {
          h = 0;
        }
        var r = bits % 26;
        var s = Math.min((bits - r) / 26, this.length);
        var mask = 67108863 ^ 67108863 >>> r << r;
        var maskedWords = extended;
        h -= s;
        h = Math.max(0, h);
        if (maskedWords) {
          for (var i = 0; i < s; i++) {
            maskedWords.words[i] = this.words[i];
          }
          maskedWords.length = s;
        }
        if (s === 0) {
        } else if (this.length > s) {
          this.length -= s;
          for (i = 0; i < this.length; i++) {
            this.words[i] = this.words[i + s];
          }
        } else {
          this.words[0] = 0;
          this.length = 1;
        }
        var carry = 0;
        for (i = this.length - 1; i >= 0 && (carry !== 0 || i >= h); i--) {
          var word = this.words[i] | 0;
          this.words[i] = carry << 26 - r | word >>> r;
          carry = word & mask;
        }
        if (maskedWords && carry !== 0) {
          maskedWords.words[maskedWords.length++] = carry;
        }
        if (this.length === 0) {
          this.words[0] = 0;
          this.length = 1;
        }
        return this.strip();
      };
      BN.prototype.ishrn = function ishrn(bits, hint, extended) {
        assert(this.negative === 0);
        return this.iushrn(bits, hint, extended);
      };
      BN.prototype.shln = function shln(bits) {
        return this.clone().ishln(bits);
      };
      BN.prototype.ushln = function ushln(bits) {
        return this.clone().iushln(bits);
      };
      BN.prototype.shrn = function shrn(bits) {
        return this.clone().ishrn(bits);
      };
      BN.prototype.ushrn = function ushrn(bits) {
        return this.clone().iushrn(bits);
      };
      BN.prototype.testn = function testn(bit) {
        assert(typeof bit === "number" && bit >= 0);
        var r = bit % 26;
        var s = (bit - r) / 26;
        var q = 1 << r;
        if (this.length <= s) return false;
        var w = this.words[s];
        return !!(w & q);
      };
      BN.prototype.imaskn = function imaskn(bits) {
        assert(typeof bits === "number" && bits >= 0);
        var r = bits % 26;
        var s = (bits - r) / 26;
        assert(this.negative === 0, "imaskn works only with positive numbers");
        if (this.length <= s) {
          return this;
        }
        if (r !== 0) {
          s++;
        }
        this.length = Math.min(s, this.length);
        if (r !== 0) {
          var mask = 67108863 ^ 67108863 >>> r << r;
          this.words[this.length - 1] &= mask;
        }
        if (this.length === 0) {
          this.words[0] = 0;
          this.length = 1;
        }
        return this.strip();
      };
      BN.prototype.maskn = function maskn(bits) {
        return this.clone().imaskn(bits);
      };
      BN.prototype.iaddn = function iaddn(num) {
        assert(typeof num === "number");
        assert(num < 67108864);
        if (num < 0) return this.isubn(-num);
        if (this.negative !== 0) {
          if (this.length === 1 && (this.words[0] | 0) < num) {
            this.words[0] = num - (this.words[0] | 0);
            this.negative = 0;
            return this;
          }
          this.negative = 0;
          this.isubn(num);
          this.negative = 1;
          return this;
        }
        return this._iaddn(num);
      };
      BN.prototype._iaddn = function _iaddn(num) {
        this.words[0] += num;
        for (var i = 0; i < this.length && this.words[i] >= 67108864; i++) {
          this.words[i] -= 67108864;
          if (i === this.length - 1) {
            this.words[i + 1] = 1;
          } else {
            this.words[i + 1]++;
          }
        }
        this.length = Math.max(this.length, i + 1);
        return this;
      };
      BN.prototype.isubn = function isubn(num) {
        assert(typeof num === "number");
        assert(num < 67108864);
        if (num < 0) return this.iaddn(-num);
        if (this.negative !== 0) {
          this.negative = 0;
          this.iaddn(num);
          this.negative = 1;
          return this;
        }
        this.words[0] -= num;
        if (this.length === 1 && this.words[0] < 0) {
          this.words[0] = -this.words[0];
          this.negative = 1;
        } else {
          for (var i = 0; i < this.length && this.words[i] < 0; i++) {
            this.words[i] += 67108864;
            this.words[i + 1] -= 1;
          }
        }
        return this.strip();
      };
      BN.prototype.addn = function addn(num) {
        return this.clone().iaddn(num);
      };
      BN.prototype.subn = function subn(num) {
        return this.clone().isubn(num);
      };
      BN.prototype.iabs = function iabs() {
        this.negative = 0;
        return this;
      };
      BN.prototype.abs = function abs() {
        return this.clone().iabs();
      };
      BN.prototype._ishlnsubmul = function _ishlnsubmul(num, mul, shift) {
        var len = num.length + shift;
        var i;
        this._expand(len);
        var w;
        var carry = 0;
        for (i = 0; i < num.length; i++) {
          w = (this.words[i + shift] | 0) + carry;
          var right = (num.words[i] | 0) * mul;
          w -= right & 67108863;
          carry = (w >> 26) - (right / 67108864 | 0);
          this.words[i + shift] = w & 67108863;
        }
        for (; i < this.length - shift; i++) {
          w = (this.words[i + shift] | 0) + carry;
          carry = w >> 26;
          this.words[i + shift] = w & 67108863;
        }
        if (carry === 0) return this.strip();
        assert(carry === -1);
        carry = 0;
        for (i = 0; i < this.length; i++) {
          w = -(this.words[i] | 0) + carry;
          carry = w >> 26;
          this.words[i] = w & 67108863;
        }
        this.negative = 1;
        return this.strip();
      };
      BN.prototype._wordDiv = function _wordDiv(num, mode) {
        var shift = this.length - num.length;
        var a = this.clone();
        var b = num;
        var bhi = b.words[b.length - 1] | 0;
        var bhiBits = this._countBits(bhi);
        shift = 26 - bhiBits;
        if (shift !== 0) {
          b = b.ushln(shift);
          a.iushln(shift);
          bhi = b.words[b.length - 1] | 0;
        }
        var m = a.length - b.length;
        var q;
        if (mode !== "mod") {
          q = new BN(null);
          q.length = m + 1;
          q.words = new Array(q.length);
          for (var i = 0; i < q.length; i++) {
            q.words[i] = 0;
          }
        }
        var diff = a.clone()._ishlnsubmul(b, 1, m);
        if (diff.negative === 0) {
          a = diff;
          if (q) {
            q.words[m] = 1;
          }
        }
        for (var j = m - 1; j >= 0; j--) {
          var qj = (a.words[b.length + j] | 0) * 67108864 + (a.words[b.length + j - 1] | 0);
          qj = Math.min(qj / bhi | 0, 67108863);
          a._ishlnsubmul(b, qj, j);
          while (a.negative !== 0) {
            qj--;
            a.negative = 0;
            a._ishlnsubmul(b, 1, j);
            if (!a.isZero()) {
              a.negative ^= 1;
            }
          }
          if (q) {
            q.words[j] = qj;
          }
        }
        if (q) {
          q.strip();
        }
        a.strip();
        if (mode !== "div" && shift !== 0) {
          a.iushrn(shift);
        }
        return {
          div: q || null,
          mod: a
        };
      };
      BN.prototype.divmod = function divmod(num, mode, positive) {
        assert(!num.isZero());
        if (this.isZero()) {
          return {
            div: new BN(0),
            mod: new BN(0)
          };
        }
        var div, mod, res;
        if (this.negative !== 0 && num.negative === 0) {
          res = this.neg().divmod(num, mode);
          if (mode !== "mod") {
            div = res.div.neg();
          }
          if (mode !== "div") {
            mod = res.mod.neg();
            if (positive && mod.negative !== 0) {
              mod.iadd(num);
            }
          }
          return {
            div,
            mod
          };
        }
        if (this.negative === 0 && num.negative !== 0) {
          res = this.divmod(num.neg(), mode);
          if (mode !== "mod") {
            div = res.div.neg();
          }
          return {
            div,
            mod: res.mod
          };
        }
        if ((this.negative & num.negative) !== 0) {
          res = this.neg().divmod(num.neg(), mode);
          if (mode !== "div") {
            mod = res.mod.neg();
            if (positive && mod.negative !== 0) {
              mod.isub(num);
            }
          }
          return {
            div: res.div,
            mod
          };
        }
        if (num.length > this.length || this.cmp(num) < 0) {
          return {
            div: new BN(0),
            mod: this
          };
        }
        if (num.length === 1) {
          if (mode === "div") {
            return {
              div: this.divn(num.words[0]),
              mod: null
            };
          }
          if (mode === "mod") {
            return {
              div: null,
              mod: new BN(this.modn(num.words[0]))
            };
          }
          return {
            div: this.divn(num.words[0]),
            mod: new BN(this.modn(num.words[0]))
          };
        }
        return this._wordDiv(num, mode);
      };
      BN.prototype.div = function div(num) {
        return this.divmod(num, "div", false).div;
      };
      BN.prototype.mod = function mod(num) {
        return this.divmod(num, "mod", false).mod;
      };
      BN.prototype.umod = function umod(num) {
        return this.divmod(num, "mod", true).mod;
      };
      BN.prototype.divRound = function divRound(num) {
        var dm = this.divmod(num);
        if (dm.mod.isZero()) return dm.div;
        var mod = dm.mod.abs();
        var half = num.abs().iushrn(1);
        var r2 = num.words[0] & 1;
        var cmp = mod.cmp(half);
        if (cmp < 0 || r2 === 1 && cmp === 0) return dm.div;
        var up = new BN(1);
        up.negative = this.negative ^ num.negative;
        return dm.div.iadd(up);
      };
      BN.prototype.modn = function modn(num) {
        assert(num <= 67108863);
        var p = (1 << 26) % num;
        var acc = 0;
        for (var i = this.length - 1; i >= 0; i--) {
          acc = (p * acc + (this.words[i] | 0)) % num;
        }
        return acc;
      };
      BN.prototype.idivn = function idivn(num) {
        assert(num <= 67108863);
        var carry = 0;
        for (var i = this.length - 1; i >= 0; i--) {
          var w = (this.words[i] | 0) + carry * 67108864;
          this.words[i] = w / num | 0;
          carry = w % num;
        }
        return this.strip();
      };
      BN.prototype.divn = function divn(num) {
        return this.clone().idivn(num);
      };
      BN.prototype.egcd = function egcd(p) {
        assert(p.negative === 0);
        assert(!p.isZero());
        var x = this;
        var y = p.clone();
        if (x.negative !== 0) {
          x = x.umod(p);
        } else {
          x = x.clone();
        }
        var A = new BN(1);
        var B = new BN(0);
        var C = new BN(0);
        var D = new BN(1);
        var g = 0;
        while (x.isEven() && y.isEven()) {
          x.iushrn(1);
          y.iushrn(1);
          ++g;
        }
        var yp = y.clone();
        var xp = x.clone();
        while (!x.isZero()) {
          for (var i = 0, im = 1; (x.words[0] & im) === 0 && i < 26; ++i, im <<= 1) ;
          if (i > 0) {
            x.iushrn(i);
            while (i-- > 0) {
              if (A.isOdd() || B.isOdd()) {
                A.iadd(yp);
                B.isub(xp);
              }
              A.iushrn(1);
              B.iushrn(1);
            }
          }
          for (var j = 0, jm = 1; (y.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1) ;
          if (j > 0) {
            y.iushrn(j);
            while (j-- > 0) {
              if (C.isOdd() || D.isOdd()) {
                C.iadd(yp);
                D.isub(xp);
              }
              C.iushrn(1);
              D.iushrn(1);
            }
          }
          if (x.cmp(y) >= 0) {
            x.isub(y);
            A.isub(C);
            B.isub(D);
          } else {
            y.isub(x);
            C.isub(A);
            D.isub(B);
          }
        }
        return {
          a: C,
          b: D,
          gcd: y.iushln(g)
        };
      };
      BN.prototype._invmp = function _invmp(p) {
        assert(p.negative === 0);
        assert(!p.isZero());
        var a = this;
        var b = p.clone();
        if (a.negative !== 0) {
          a = a.umod(p);
        } else {
          a = a.clone();
        }
        var x1 = new BN(1);
        var x2 = new BN(0);
        var delta = b.clone();
        while (a.cmpn(1) > 0 && b.cmpn(1) > 0) {
          for (var i = 0, im = 1; (a.words[0] & im) === 0 && i < 26; ++i, im <<= 1) ;
          if (i > 0) {
            a.iushrn(i);
            while (i-- > 0) {
              if (x1.isOdd()) {
                x1.iadd(delta);
              }
              x1.iushrn(1);
            }
          }
          for (var j = 0, jm = 1; (b.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1) ;
          if (j > 0) {
            b.iushrn(j);
            while (j-- > 0) {
              if (x2.isOdd()) {
                x2.iadd(delta);
              }
              x2.iushrn(1);
            }
          }
          if (a.cmp(b) >= 0) {
            a.isub(b);
            x1.isub(x2);
          } else {
            b.isub(a);
            x2.isub(x1);
          }
        }
        var res;
        if (a.cmpn(1) === 0) {
          res = x1;
        } else {
          res = x2;
        }
        if (res.cmpn(0) < 0) {
          res.iadd(p);
        }
        return res;
      };
      BN.prototype.gcd = function gcd(num) {
        if (this.isZero()) return num.abs();
        if (num.isZero()) return this.abs();
        var a = this.clone();
        var b = num.clone();
        a.negative = 0;
        b.negative = 0;
        for (var shift = 0; a.isEven() && b.isEven(); shift++) {
          a.iushrn(1);
          b.iushrn(1);
        }
        do {
          while (a.isEven()) {
            a.iushrn(1);
          }
          while (b.isEven()) {
            b.iushrn(1);
          }
          var r = a.cmp(b);
          if (r < 0) {
            var t = a;
            a = b;
            b = t;
          } else if (r === 0 || b.cmpn(1) === 0) {
            break;
          }
          a.isub(b);
        } while (true);
        return b.iushln(shift);
      };
      BN.prototype.invm = function invm(num) {
        return this.egcd(num).a.umod(num);
      };
      BN.prototype.isEven = function isEven() {
        return (this.words[0] & 1) === 0;
      };
      BN.prototype.isOdd = function isOdd() {
        return (this.words[0] & 1) === 1;
      };
      BN.prototype.andln = function andln(num) {
        return this.words[0] & num;
      };
      BN.prototype.bincn = function bincn(bit) {
        assert(typeof bit === "number");
        var r = bit % 26;
        var s = (bit - r) / 26;
        var q = 1 << r;
        if (this.length <= s) {
          this._expand(s + 1);
          this.words[s] |= q;
          return this;
        }
        var carry = q;
        for (var i = s; carry !== 0 && i < this.length; i++) {
          var w = this.words[i] | 0;
          w += carry;
          carry = w >>> 26;
          w &= 67108863;
          this.words[i] = w;
        }
        if (carry !== 0) {
          this.words[i] = carry;
          this.length++;
        }
        return this;
      };
      BN.prototype.isZero = function isZero() {
        return this.length === 1 && this.words[0] === 0;
      };
      BN.prototype.cmpn = function cmpn(num) {
        var negative = num < 0;
        if (this.negative !== 0 && !negative) return -1;
        if (this.negative === 0 && negative) return 1;
        this.strip();
        var res;
        if (this.length > 1) {
          res = 1;
        } else {
          if (negative) {
            num = -num;
          }
          assert(num <= 67108863, "Number is too big");
          var w = this.words[0] | 0;
          res = w === num ? 0 : w < num ? -1 : 1;
        }
        if (this.negative !== 0) return -res | 0;
        return res;
      };
      BN.prototype.cmp = function cmp(num) {
        if (this.negative !== 0 && num.negative === 0) return -1;
        if (this.negative === 0 && num.negative !== 0) return 1;
        var res = this.ucmp(num);
        if (this.negative !== 0) return -res | 0;
        return res;
      };
      BN.prototype.ucmp = function ucmp(num) {
        if (this.length > num.length) return 1;
        if (this.length < num.length) return -1;
        var res = 0;
        for (var i = this.length - 1; i >= 0; i--) {
          var a = this.words[i] | 0;
          var b = num.words[i] | 0;
          if (a === b) continue;
          if (a < b) {
            res = -1;
          } else if (a > b) {
            res = 1;
          }
          break;
        }
        return res;
      };
      BN.prototype.gtn = function gtn(num) {
        return this.cmpn(num) === 1;
      };
      BN.prototype.gt = function gt(num) {
        return this.cmp(num) === 1;
      };
      BN.prototype.gten = function gten(num) {
        return this.cmpn(num) >= 0;
      };
      BN.prototype.gte = function gte(num) {
        return this.cmp(num) >= 0;
      };
      BN.prototype.ltn = function ltn(num) {
        return this.cmpn(num) === -1;
      };
      BN.prototype.lt = function lt(num) {
        return this.cmp(num) === -1;
      };
      BN.prototype.lten = function lten(num) {
        return this.cmpn(num) <= 0;
      };
      BN.prototype.lte = function lte(num) {
        return this.cmp(num) <= 0;
      };
      BN.prototype.eqn = function eqn(num) {
        return this.cmpn(num) === 0;
      };
      BN.prototype.eq = function eq(num) {
        return this.cmp(num) === 0;
      };
      BN.red = function red(num) {
        return new Red(num);
      };
      BN.prototype.toRed = function toRed(ctx) {
        assert(!this.red, "Already a number in reduction context");
        assert(this.negative === 0, "red works only with positives");
        return ctx.convertTo(this)._forceRed(ctx);
      };
      BN.prototype.fromRed = function fromRed() {
        assert(this.red, "fromRed works only with numbers in reduction context");
        return this.red.convertFrom(this);
      };
      BN.prototype._forceRed = function _forceRed(ctx) {
        this.red = ctx;
        return this;
      };
      BN.prototype.forceRed = function forceRed(ctx) {
        assert(!this.red, "Already a number in reduction context");
        return this._forceRed(ctx);
      };
      BN.prototype.redAdd = function redAdd(num) {
        assert(this.red, "redAdd works only with red numbers");
        return this.red.add(this, num);
      };
      BN.prototype.redIAdd = function redIAdd(num) {
        assert(this.red, "redIAdd works only with red numbers");
        return this.red.iadd(this, num);
      };
      BN.prototype.redSub = function redSub(num) {
        assert(this.red, "redSub works only with red numbers");
        return this.red.sub(this, num);
      };
      BN.prototype.redISub = function redISub(num) {
        assert(this.red, "redISub works only with red numbers");
        return this.red.isub(this, num);
      };
      BN.prototype.redShl = function redShl(num) {
        assert(this.red, "redShl works only with red numbers");
        return this.red.shl(this, num);
      };
      BN.prototype.redMul = function redMul(num) {
        assert(this.red, "redMul works only with red numbers");
        this.red._verify2(this, num);
        return this.red.mul(this, num);
      };
      BN.prototype.redIMul = function redIMul(num) {
        assert(this.red, "redMul works only with red numbers");
        this.red._verify2(this, num);
        return this.red.imul(this, num);
      };
      BN.prototype.redSqr = function redSqr() {
        assert(this.red, "redSqr works only with red numbers");
        this.red._verify1(this);
        return this.red.sqr(this);
      };
      BN.prototype.redISqr = function redISqr() {
        assert(this.red, "redISqr works only with red numbers");
        this.red._verify1(this);
        return this.red.isqr(this);
      };
      BN.prototype.redSqrt = function redSqrt() {
        assert(this.red, "redSqrt works only with red numbers");
        this.red._verify1(this);
        return this.red.sqrt(this);
      };
      BN.prototype.redInvm = function redInvm() {
        assert(this.red, "redInvm works only with red numbers");
        this.red._verify1(this);
        return this.red.invm(this);
      };
      BN.prototype.redNeg = function redNeg() {
        assert(this.red, "redNeg works only with red numbers");
        this.red._verify1(this);
        return this.red.neg(this);
      };
      BN.prototype.redPow = function redPow(num) {
        assert(this.red && !num.red, "redPow(normalNum)");
        this.red._verify1(this);
        return this.red.pow(this, num);
      };
      var primes = {
        k256: null,
        p224: null,
        p192: null,
        p25519: null
      };
      function MPrime(name, p) {
        this.name = name;
        this.p = new BN(p, 16);
        this.n = this.p.bitLength();
        this.k = new BN(1).iushln(this.n).isub(this.p);
        this.tmp = this._tmp();
      }
      MPrime.prototype._tmp = function _tmp() {
        var tmp = new BN(null);
        tmp.words = new Array(Math.ceil(this.n / 13));
        return tmp;
      };
      MPrime.prototype.ireduce = function ireduce(num) {
        var r = num;
        var rlen;
        do {
          this.split(r, this.tmp);
          r = this.imulK(r);
          r = r.iadd(this.tmp);
          rlen = r.bitLength();
        } while (rlen > this.n);
        var cmp = rlen < this.n ? -1 : r.ucmp(this.p);
        if (cmp === 0) {
          r.words[0] = 0;
          r.length = 1;
        } else if (cmp > 0) {
          r.isub(this.p);
        } else {
          if (r.strip !== void 0) {
            r.strip();
          } else {
            r._strip();
          }
        }
        return r;
      };
      MPrime.prototype.split = function split(input, out) {
        input.iushrn(this.n, 0, out);
      };
      MPrime.prototype.imulK = function imulK(num) {
        return num.imul(this.k);
      };
      function K256() {
        MPrime.call(
          this,
          "k256",
          "ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f"
        );
      }
      inherits(K256, MPrime);
      K256.prototype.split = function split(input, output) {
        var mask = 4194303;
        var outLen = Math.min(input.length, 9);
        for (var i = 0; i < outLen; i++) {
          output.words[i] = input.words[i];
        }
        output.length = outLen;
        if (input.length <= 9) {
          input.words[0] = 0;
          input.length = 1;
          return;
        }
        var prev = input.words[9];
        output.words[output.length++] = prev & mask;
        for (i = 10; i < input.length; i++) {
          var next = input.words[i] | 0;
          input.words[i - 10] = (next & mask) << 4 | prev >>> 22;
          prev = next;
        }
        prev >>>= 22;
        input.words[i - 10] = prev;
        if (prev === 0 && input.length > 10) {
          input.length -= 10;
        } else {
          input.length -= 9;
        }
      };
      K256.prototype.imulK = function imulK(num) {
        num.words[num.length] = 0;
        num.words[num.length + 1] = 0;
        num.length += 2;
        var lo = 0;
        for (var i = 0; i < num.length; i++) {
          var w = num.words[i] | 0;
          lo += w * 977;
          num.words[i] = lo & 67108863;
          lo = w * 64 + (lo / 67108864 | 0);
        }
        if (num.words[num.length - 1] === 0) {
          num.length--;
          if (num.words[num.length - 1] === 0) {
            num.length--;
          }
        }
        return num;
      };
      function P224() {
        MPrime.call(
          this,
          "p224",
          "ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001"
        );
      }
      inherits(P224, MPrime);
      function P192() {
        MPrime.call(
          this,
          "p192",
          "ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff"
        );
      }
      inherits(P192, MPrime);
      function P25519() {
        MPrime.call(
          this,
          "25519",
          "7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed"
        );
      }
      inherits(P25519, MPrime);
      P25519.prototype.imulK = function imulK(num) {
        var carry = 0;
        for (var i = 0; i < num.length; i++) {
          var hi = (num.words[i] | 0) * 19 + carry;
          var lo = hi & 67108863;
          hi >>>= 26;
          num.words[i] = lo;
          carry = hi;
        }
        if (carry !== 0) {
          num.words[num.length++] = carry;
        }
        return num;
      };
      BN._prime = function prime(name) {
        if (primes[name]) return primes[name];
        var prime2;
        if (name === "k256") {
          prime2 = new K256();
        } else if (name === "p224") {
          prime2 = new P224();
        } else if (name === "p192") {
          prime2 = new P192();
        } else if (name === "p25519") {
          prime2 = new P25519();
        } else {
          throw new Error("Unknown prime " + name);
        }
        primes[name] = prime2;
        return prime2;
      };
      function Red(m) {
        if (typeof m === "string") {
          var prime = BN._prime(m);
          this.m = prime.p;
          this.prime = prime;
        } else {
          assert(m.gtn(1), "modulus must be greater than 1");
          this.m = m;
          this.prime = null;
        }
      }
      Red.prototype._verify1 = function _verify1(a) {
        assert(a.negative === 0, "red works only with positives");
        assert(a.red, "red works only with red numbers");
      };
      Red.prototype._verify2 = function _verify2(a, b) {
        assert((a.negative | b.negative) === 0, "red works only with positives");
        assert(
          a.red && a.red === b.red,
          "red works only with red numbers"
        );
      };
      Red.prototype.imod = function imod(a) {
        if (this.prime) return this.prime.ireduce(a)._forceRed(this);
        return a.umod(this.m)._forceRed(this);
      };
      Red.prototype.neg = function neg(a) {
        if (a.isZero()) {
          return a.clone();
        }
        return this.m.sub(a)._forceRed(this);
      };
      Red.prototype.add = function add(a, b) {
        this._verify2(a, b);
        var res = a.add(b);
        if (res.cmp(this.m) >= 0) {
          res.isub(this.m);
        }
        return res._forceRed(this);
      };
      Red.prototype.iadd = function iadd(a, b) {
        this._verify2(a, b);
        var res = a.iadd(b);
        if (res.cmp(this.m) >= 0) {
          res.isub(this.m);
        }
        return res;
      };
      Red.prototype.sub = function sub(a, b) {
        this._verify2(a, b);
        var res = a.sub(b);
        if (res.cmpn(0) < 0) {
          res.iadd(this.m);
        }
        return res._forceRed(this);
      };
      Red.prototype.isub = function isub(a, b) {
        this._verify2(a, b);
        var res = a.isub(b);
        if (res.cmpn(0) < 0) {
          res.iadd(this.m);
        }
        return res;
      };
      Red.prototype.shl = function shl(a, num) {
        this._verify1(a);
        return this.imod(a.ushln(num));
      };
      Red.prototype.imul = function imul(a, b) {
        this._verify2(a, b);
        return this.imod(a.imul(b));
      };
      Red.prototype.mul = function mul(a, b) {
        this._verify2(a, b);
        return this.imod(a.mul(b));
      };
      Red.prototype.isqr = function isqr(a) {
        return this.imul(a, a.clone());
      };
      Red.prototype.sqr = function sqr(a) {
        return this.mul(a, a);
      };
      Red.prototype.sqrt = function sqrt(a) {
        if (a.isZero()) return a.clone();
        var mod3 = this.m.andln(3);
        assert(mod3 % 2 === 1);
        if (mod3 === 3) {
          var pow = this.m.add(new BN(1)).iushrn(2);
          return this.pow(a, pow);
        }
        var q = this.m.subn(1);
        var s = 0;
        while (!q.isZero() && q.andln(1) === 0) {
          s++;
          q.iushrn(1);
        }
        assert(!q.isZero());
        var one = new BN(1).toRed(this);
        var nOne = one.redNeg();
        var lpow = this.m.subn(1).iushrn(1);
        var z = this.m.bitLength();
        z = new BN(2 * z * z).toRed(this);
        while (this.pow(z, lpow).cmp(nOne) !== 0) {
          z.redIAdd(nOne);
        }
        var c = this.pow(z, q);
        var r = this.pow(a, q.addn(1).iushrn(1));
        var t = this.pow(a, q);
        var m = s;
        while (t.cmp(one) !== 0) {
          var tmp = t;
          for (var i = 0; tmp.cmp(one) !== 0; i++) {
            tmp = tmp.redSqr();
          }
          assert(i < m);
          var b = this.pow(c, new BN(1).iushln(m - i - 1));
          r = r.redMul(b);
          c = b.redSqr();
          t = t.redMul(c);
          m = i;
        }
        return r;
      };
      Red.prototype.invm = function invm(a) {
        var inv = a._invmp(this.m);
        if (inv.negative !== 0) {
          inv.negative = 0;
          return this.imod(inv).redNeg();
        } else {
          return this.imod(inv);
        }
      };
      Red.prototype.pow = function pow(a, num) {
        if (num.isZero()) return new BN(1).toRed(this);
        if (num.cmpn(1) === 0) return a.clone();
        var windowSize = 4;
        var wnd = new Array(1 << windowSize);
        wnd[0] = new BN(1).toRed(this);
        wnd[1] = a;
        for (var i = 2; i < wnd.length; i++) {
          wnd[i] = this.mul(wnd[i - 1], a);
        }
        var res = wnd[0];
        var current = 0;
        var currentLen = 0;
        var start = num.bitLength() % 26;
        if (start === 0) {
          start = 26;
        }
        for (i = num.length - 1; i >= 0; i--) {
          var word = num.words[i];
          for (var j = start - 1; j >= 0; j--) {
            var bit = word >> j & 1;
            if (res !== wnd[0]) {
              res = this.sqr(res);
            }
            if (bit === 0 && current === 0) {
              currentLen = 0;
              continue;
            }
            current <<= 1;
            current |= bit;
            currentLen++;
            if (currentLen !== windowSize && (i !== 0 || j !== 0)) continue;
            res = this.mul(res, wnd[current]);
            currentLen = 0;
            current = 0;
          }
          start = 26;
        }
        return res;
      };
      Red.prototype.convertTo = function convertTo(num) {
        var r = num.umod(this.m);
        return r === num ? r.clone() : r;
      };
      Red.prototype.convertFrom = function convertFrom(num) {
        var res = num.clone();
        res.red = null;
        return res;
      };
      BN.mont = function mont(num) {
        return new Mont(num);
      };
      function Mont(m) {
        Red.call(this, m);
        this.shift = this.m.bitLength();
        if (this.shift % 26 !== 0) {
          this.shift += 26 - this.shift % 26;
        }
        this.r = new BN(1).iushln(this.shift);
        this.r2 = this.imod(this.r.sqr());
        this.rinv = this.r._invmp(this.m);
        this.minv = this.rinv.mul(this.r).isubn(1).div(this.m);
        this.minv = this.minv.umod(this.r);
        this.minv = this.r.sub(this.minv);
      }
      inherits(Mont, Red);
      Mont.prototype.convertTo = function convertTo(num) {
        return this.imod(num.ushln(this.shift));
      };
      Mont.prototype.convertFrom = function convertFrom(num) {
        var r = this.imod(num.mul(this.rinv));
        r.red = null;
        return r;
      };
      Mont.prototype.imul = function imul(a, b) {
        if (a.isZero() || b.isZero()) {
          a.words[0] = 0;
          a.length = 1;
          return a;
        }
        var t = a.imul(b);
        var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
        var u = t.isub(c).iushrn(this.shift);
        var res = u;
        if (u.cmp(this.m) >= 0) {
          res = u.isub(this.m);
        } else if (u.cmpn(0) < 0) {
          res = u.iadd(this.m);
        }
        return res._forceRed(this);
      };
      Mont.prototype.mul = function mul(a, b) {
        if (a.isZero() || b.isZero()) return new BN(0)._forceRed(this);
        var t = a.mul(b);
        var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
        var u = t.isub(c).iushrn(this.shift);
        var res = u;
        if (u.cmp(this.m) >= 0) {
          res = u.isub(this.m);
        } else if (u.cmpn(0) < 0) {
          res = u.iadd(this.m);
        }
        return res._forceRed(this);
      };
      Mont.prototype.invm = function invm(a) {
        var res = this.imod(a._invmp(this.m).mul(this.r2));
        return res._forceRed(this);
      };
    })(typeof module === "undefined" || module, exports);
  }
});

// node_modules/inherits/inherits_browser.js
var require_inherits_browser = __commonJS({
  "node_modules/inherits/inherits_browser.js"(exports, module) {
    if (typeof Object.create === "function") {
      module.exports = function inherits(ctor, superCtor) {
        if (superCtor) {
          ctor.super_ = superCtor;
          ctor.prototype = Object.create(superCtor.prototype, {
            constructor: {
              value: ctor,
              enumerable: false,
              writable: true,
              configurable: true
            }
          });
        }
      };
    } else {
      module.exports = function inherits(ctor, superCtor) {
        if (superCtor) {
          ctor.super_ = superCtor;
          var TempCtor = function() {
          };
          TempCtor.prototype = superCtor.prototype;
          ctor.prototype = new TempCtor();
          ctor.prototype.constructor = ctor;
        }
      };
    }
  }
});

// node_modules/inherits/inherits.js
var require_inherits = __commonJS({
  "node_modules/inherits/inherits.js"(exports, module) {
    try {
      util = __require("util");
      if (typeof util.inherits !== "function") throw "";
      module.exports = util.inherits;
    } catch (e) {
      module.exports = require_inherits_browser();
    }
    var util;
  }
});

// node_modules/safer-buffer/safer.js
var require_safer = __commonJS({
  "node_modules/safer-buffer/safer.js"(exports, module) {
    "use strict";
    var buffer = __require("buffer");
    var Buffer2 = buffer.Buffer;
    var safer = {};
    var key;
    for (key in buffer) {
      if (!buffer.hasOwnProperty(key)) continue;
      if (key === "SlowBuffer" || key === "Buffer") continue;
      safer[key] = buffer[key];
    }
    var Safer = safer.Buffer = {};
    for (key in Buffer2) {
      if (!Buffer2.hasOwnProperty(key)) continue;
      if (key === "allocUnsafe" || key === "allocUnsafeSlow") continue;
      Safer[key] = Buffer2[key];
    }
    safer.Buffer.prototype = Buffer2.prototype;
    if (!Safer.from || Safer.from === Uint8Array.from) {
      Safer.from = function(value, encodingOrOffset, length) {
        if (typeof value === "number") {
          throw new TypeError('The "value" argument must not be of type number. Received type ' + typeof value);
        }
        if (value && typeof value.length === "undefined") {
          throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value);
        }
        return Buffer2(value, encodingOrOffset, length);
      };
    }
    if (!Safer.alloc) {
      Safer.alloc = function(size, fill, encoding) {
        if (typeof size !== "number") {
          throw new TypeError('The "size" argument must be of type number. Received type ' + typeof size);
        }
        if (size < 0 || size >= 2 * (1 << 30)) {
          throw new RangeError('The value "' + size + '" is invalid for option "size"');
        }
        var buf = Buffer2(size);
        if (!fill || fill.length === 0) {
          buf.fill(0);
        } else if (typeof encoding === "string") {
          buf.fill(fill, encoding);
        } else {
          buf.fill(fill);
        }
        return buf;
      };
    }
    if (!safer.kStringMaxLength) {
      try {
        safer.kStringMaxLength = process.binding("buffer").kStringMaxLength;
      } catch (e) {
      }
    }
    if (!safer.constants) {
      safer.constants = {
        MAX_LENGTH: safer.kMaxLength
      };
      if (safer.kStringMaxLength) {
        safer.constants.MAX_STRING_LENGTH = safer.kStringMaxLength;
      }
    }
    module.exports = safer;
  }
});

// node_modules/asn1.js/lib/asn1/base/reporter.js
var require_reporter = __commonJS({
  "node_modules/asn1.js/lib/asn1/base/reporter.js"(exports) {
    "use strict";
    var inherits = require_inherits();
    function Reporter(options) {
      this._reporterState = {
        obj: null,
        path: [],
        options: options || {},
        errors: []
      };
    }
    exports.Reporter = Reporter;
    Reporter.prototype.isError = function isError(obj) {
      return obj instanceof ReporterError;
    };
    Reporter.prototype.save = function save() {
      const state = this._reporterState;
      return { obj: state.obj, pathLen: state.path.length };
    };
    Reporter.prototype.restore = function restore(data) {
      const state = this._reporterState;
      state.obj = data.obj;
      state.path = state.path.slice(0, data.pathLen);
    };
    Reporter.prototype.enterKey = function enterKey(key) {
      return this._reporterState.path.push(key);
    };
    Reporter.prototype.exitKey = function exitKey(index2) {
      const state = this._reporterState;
      state.path = state.path.slice(0, index2 - 1);
    };
    Reporter.prototype.leaveKey = function leaveKey(index2, key, value) {
      const state = this._reporterState;
      this.exitKey(index2);
      if (state.obj !== null)
        state.obj[key] = value;
    };
    Reporter.prototype.path = function path() {
      return this._reporterState.path.join("/");
    };
    Reporter.prototype.enterObject = function enterObject() {
      const state = this._reporterState;
      const prev = state.obj;
      state.obj = {};
      return prev;
    };
    Reporter.prototype.leaveObject = function leaveObject(prev) {
      const state = this._reporterState;
      const now2 = state.obj;
      state.obj = prev;
      return now2;
    };
    Reporter.prototype.error = function error(msg) {
      let err;
      const state = this._reporterState;
      const inherited = msg instanceof ReporterError;
      if (inherited) {
        err = msg;
      } else {
        err = new ReporterError(state.path.map(function(elem) {
          return "[" + JSON.stringify(elem) + "]";
        }).join(""), msg.message || msg, msg.stack);
      }
      if (!state.options.partial)
        throw err;
      if (!inherited)
        state.errors.push(err);
      return err;
    };
    Reporter.prototype.wrapResult = function wrapResult(result) {
      const state = this._reporterState;
      if (!state.options.partial)
        return result;
      return {
        result: this.isError(result) ? null : result,
        errors: state.errors
      };
    };
    function ReporterError(path, msg) {
      this.path = path;
      this.rethrow(msg);
    }
    inherits(ReporterError, Error);
    ReporterError.prototype.rethrow = function rethrow(msg) {
      this.message = msg + " at: " + (this.path || "(shallow)");
      if (Error.captureStackTrace)
        Error.captureStackTrace(this, ReporterError);
      if (!this.stack) {
        try {
          throw new Error(this.message);
        } catch (e) {
          this.stack = e.stack;
        }
      }
      return this;
    };
  }
});

// node_modules/asn1.js/lib/asn1/base/buffer.js
var require_buffer = __commonJS({
  "node_modules/asn1.js/lib/asn1/base/buffer.js"(exports) {
    "use strict";
    var inherits = require_inherits();
    var Reporter = require_reporter().Reporter;
    var Buffer2 = require_safer().Buffer;
    function DecoderBuffer(base, options) {
      Reporter.call(this, options);
      if (!Buffer2.isBuffer(base)) {
        this.error("Input not Buffer");
        return;
      }
      this.base = base;
      this.offset = 0;
      this.length = base.length;
    }
    inherits(DecoderBuffer, Reporter);
    exports.DecoderBuffer = DecoderBuffer;
    DecoderBuffer.isDecoderBuffer = function isDecoderBuffer(data) {
      if (data instanceof DecoderBuffer) {
        return true;
      }
      const isCompatible = typeof data === "object" && Buffer2.isBuffer(data.base) && data.constructor.name === "DecoderBuffer" && typeof data.offset === "number" && typeof data.length === "number" && typeof data.save === "function" && typeof data.restore === "function" && typeof data.isEmpty === "function" && typeof data.readUInt8 === "function" && typeof data.skip === "function" && typeof data.raw === "function";
      return isCompatible;
    };
    DecoderBuffer.prototype.save = function save() {
      return { offset: this.offset, reporter: Reporter.prototype.save.call(this) };
    };
    DecoderBuffer.prototype.restore = function restore(save) {
      const res = new DecoderBuffer(this.base);
      res.offset = save.offset;
      res.length = this.offset;
      this.offset = save.offset;
      Reporter.prototype.restore.call(this, save.reporter);
      return res;
    };
    DecoderBuffer.prototype.isEmpty = function isEmpty() {
      return this.offset === this.length;
    };
    DecoderBuffer.prototype.readUInt8 = function readUInt8(fail) {
      if (this.offset + 1 <= this.length)
        return this.base.readUInt8(this.offset++, true);
      else
        return this.error(fail || "DecoderBuffer overrun");
    };
    DecoderBuffer.prototype.skip = function skip(bytes, fail) {
      if (!(this.offset + bytes <= this.length))
        return this.error(fail || "DecoderBuffer overrun");
      const res = new DecoderBuffer(this.base);
      res._reporterState = this._reporterState;
      res.offset = this.offset;
      res.length = this.offset + bytes;
      this.offset += bytes;
      return res;
    };
    DecoderBuffer.prototype.raw = function raw(save) {
      return this.base.slice(save ? save.offset : this.offset, this.length);
    };
    function EncoderBuffer(value, reporter) {
      if (Array.isArray(value)) {
        this.length = 0;
        this.value = value.map(function(item) {
          if (!EncoderBuffer.isEncoderBuffer(item))
            item = new EncoderBuffer(item, reporter);
          this.length += item.length;
          return item;
        }, this);
      } else if (typeof value === "number") {
        if (!(0 <= value && value <= 255))
          return reporter.error("non-byte EncoderBuffer value");
        this.value = value;
        this.length = 1;
      } else if (typeof value === "string") {
        this.value = value;
        this.length = Buffer2.byteLength(value);
      } else if (Buffer2.isBuffer(value)) {
        this.value = value;
        this.length = value.length;
      } else {
        return reporter.error("Unsupported type: " + typeof value);
      }
    }
    exports.EncoderBuffer = EncoderBuffer;
    EncoderBuffer.isEncoderBuffer = function isEncoderBuffer(data) {
      if (data instanceof EncoderBuffer) {
        return true;
      }
      const isCompatible = typeof data === "object" && data.constructor.name === "EncoderBuffer" && typeof data.length === "number" && typeof data.join === "function";
      return isCompatible;
    };
    EncoderBuffer.prototype.join = function join(out, offset) {
      if (!out)
        out = Buffer2.alloc(this.length);
      if (!offset)
        offset = 0;
      if (this.length === 0)
        return out;
      if (Array.isArray(this.value)) {
        this.value.forEach(function(item) {
          item.join(out, offset);
          offset += item.length;
        });
      } else {
        if (typeof this.value === "number")
          out[offset] = this.value;
        else if (typeof this.value === "string")
          out.write(this.value, offset);
        else if (Buffer2.isBuffer(this.value))
          this.value.copy(out, offset);
        offset += this.length;
      }
      return out;
    };
  }
});

// node_modules/minimalistic-assert/index.js
var require_minimalistic_assert = __commonJS({
  "node_modules/minimalistic-assert/index.js"(exports, module) {
    module.exports = assert;
    function assert(val, msg) {
      if (!val)
        throw new Error(msg || "Assertion failed");
    }
    assert.equal = function assertEqual(l, r, msg) {
      if (l != r)
        throw new Error(msg || "Assertion failed: " + l + " != " + r);
    };
  }
});

// node_modules/asn1.js/lib/asn1/base/node.js
var require_node = __commonJS({
  "node_modules/asn1.js/lib/asn1/base/node.js"(exports, module) {
    "use strict";
    var Reporter = require_reporter().Reporter;
    var EncoderBuffer = require_buffer().EncoderBuffer;
    var DecoderBuffer = require_buffer().DecoderBuffer;
    var assert = require_minimalistic_assert();
    var tags = [
      "seq",
      "seqof",
      "set",
      "setof",
      "objid",
      "bool",
      "gentime",
      "utctime",
      "null_",
      "enum",
      "int",
      "objDesc",
      "bitstr",
      "bmpstr",
      "charstr",
      "genstr",
      "graphstr",
      "ia5str",
      "iso646str",
      "numstr",
      "octstr",
      "printstr",
      "t61str",
      "unistr",
      "utf8str",
      "videostr"
    ];
    var methods = [
      "key",
      "obj",
      "use",
      "optional",
      "explicit",
      "implicit",
      "def",
      "choice",
      "any",
      "contains"
    ].concat(tags);
    var overrided = [
      "_peekTag",
      "_decodeTag",
      "_use",
      "_decodeStr",
      "_decodeObjid",
      "_decodeTime",
      "_decodeNull",
      "_decodeInt",
      "_decodeBool",
      "_decodeList",
      "_encodeComposite",
      "_encodeStr",
      "_encodeObjid",
      "_encodeTime",
      "_encodeNull",
      "_encodeInt",
      "_encodeBool"
    ];
    function Node(enc, parent, name) {
      const state = {};
      this._baseState = state;
      state.name = name;
      state.enc = enc;
      state.parent = parent || null;
      state.children = null;
      state.tag = null;
      state.args = null;
      state.reverseArgs = null;
      state.choice = null;
      state.optional = false;
      state.any = false;
      state.obj = false;
      state.use = null;
      state.useDecoder = null;
      state.key = null;
      state["default"] = null;
      state.explicit = null;
      state.implicit = null;
      state.contains = null;
      if (!state.parent) {
        state.children = [];
        this._wrap();
      }
    }
    module.exports = Node;
    var stateProps = [
      "enc",
      "parent",
      "children",
      "tag",
      "args",
      "reverseArgs",
      "choice",
      "optional",
      "any",
      "obj",
      "use",
      "alteredUse",
      "key",
      "default",
      "explicit",
      "implicit",
      "contains"
    ];
    Node.prototype.clone = function clone() {
      const state = this._baseState;
      const cstate = {};
      stateProps.forEach(function(prop) {
        cstate[prop] = state[prop];
      });
      const res = new this.constructor(cstate.parent);
      res._baseState = cstate;
      return res;
    };
    Node.prototype._wrap = function wrap() {
      const state = this._baseState;
      methods.forEach(function(method) {
        this[method] = function _wrappedMethod() {
          const clone = new this.constructor(this);
          state.children.push(clone);
          return clone[method].apply(clone, arguments);
        };
      }, this);
    };
    Node.prototype._init = function init(body) {
      const state = this._baseState;
      assert(state.parent === null);
      body.call(this);
      state.children = state.children.filter(function(child) {
        return child._baseState.parent === this;
      }, this);
      assert.equal(state.children.length, 1, "Root node can have only one child");
    };
    Node.prototype._useArgs = function useArgs(args) {
      const state = this._baseState;
      const children = args.filter(function(arg) {
        return arg instanceof this.constructor;
      }, this);
      args = args.filter(function(arg) {
        return !(arg instanceof this.constructor);
      }, this);
      if (children.length !== 0) {
        assert(state.children === null);
        state.children = children;
        children.forEach(function(child) {
          child._baseState.parent = this;
        }, this);
      }
      if (args.length !== 0) {
        assert(state.args === null);
        state.args = args;
        state.reverseArgs = args.map(function(arg) {
          if (typeof arg !== "object" || arg.constructor !== Object)
            return arg;
          const res = {};
          Object.keys(arg).forEach(function(key) {
            if (key == (key | 0))
              key |= 0;
            const value = arg[key];
            res[value] = key;
          });
          return res;
        });
      }
    };
    overrided.forEach(function(method) {
      Node.prototype[method] = function _overrided() {
        const state = this._baseState;
        throw new Error(method + " not implemented for encoding: " + state.enc);
      };
    });
    tags.forEach(function(tag) {
      Node.prototype[tag] = function _tagMethod() {
        const state = this._baseState;
        const args = Array.prototype.slice.call(arguments);
        assert(state.tag === null);
        state.tag = tag;
        this._useArgs(args);
        return this;
      };
    });
    Node.prototype.use = function use(item) {
      assert(item);
      const state = this._baseState;
      assert(state.use === null);
      state.use = item;
      return this;
    };
    Node.prototype.optional = function optional() {
      const state = this._baseState;
      state.optional = true;
      return this;
    };
    Node.prototype.def = function def(val) {
      const state = this._baseState;
      assert(state["default"] === null);
      state["default"] = val;
      state.optional = true;
      return this;
    };
    Node.prototype.explicit = function explicit(num) {
      const state = this._baseState;
      assert(state.explicit === null && state.implicit === null);
      state.explicit = num;
      return this;
    };
    Node.prototype.implicit = function implicit(num) {
      const state = this._baseState;
      assert(state.explicit === null && state.implicit === null);
      state.implicit = num;
      return this;
    };
    Node.prototype.obj = function obj() {
      const state = this._baseState;
      const args = Array.prototype.slice.call(arguments);
      state.obj = true;
      if (args.length !== 0)
        this._useArgs(args);
      return this;
    };
    Node.prototype.key = function key(newKey) {
      const state = this._baseState;
      assert(state.key === null);
      state.key = newKey;
      return this;
    };
    Node.prototype.any = function any() {
      const state = this._baseState;
      state.any = true;
      return this;
    };
    Node.prototype.choice = function choice(obj) {
      const state = this._baseState;
      assert(state.choice === null);
      state.choice = obj;
      this._useArgs(Object.keys(obj).map(function(key) {
        return obj[key];
      }));
      return this;
    };
    Node.prototype.contains = function contains(item) {
      const state = this._baseState;
      assert(state.use === null);
      state.contains = item;
      return this;
    };
    Node.prototype._decode = function decode(input, options) {
      const state = this._baseState;
      if (state.parent === null)
        return input.wrapResult(state.children[0]._decode(input, options));
      let result = state["default"];
      let present = true;
      let prevKey = null;
      if (state.key !== null)
        prevKey = input.enterKey(state.key);
      if (state.optional) {
        let tag = null;
        if (state.explicit !== null)
          tag = state.explicit;
        else if (state.implicit !== null)
          tag = state.implicit;
        else if (state.tag !== null)
          tag = state.tag;
        if (tag === null && !state.any) {
          const save = input.save();
          try {
            if (state.choice === null)
              this._decodeGeneric(state.tag, input, options);
            else
              this._decodeChoice(input, options);
            present = true;
          } catch (e) {
            present = false;
          }
          input.restore(save);
        } else {
          present = this._peekTag(input, tag, state.any);
          if (input.isError(present))
            return present;
        }
      }
      let prevObj;
      if (state.obj && present)
        prevObj = input.enterObject();
      if (present) {
        if (state.explicit !== null) {
          const explicit = this._decodeTag(input, state.explicit);
          if (input.isError(explicit))
            return explicit;
          input = explicit;
        }
        const start = input.offset;
        if (state.use === null && state.choice === null) {
          let save;
          if (state.any)
            save = input.save();
          const body = this._decodeTag(
            input,
            state.implicit !== null ? state.implicit : state.tag,
            state.any
          );
          if (input.isError(body))
            return body;
          if (state.any)
            result = input.raw(save);
          else
            input = body;
        }
        if (options && options.track && state.tag !== null)
          options.track(input.path(), start, input.length, "tagged");
        if (options && options.track && state.tag !== null)
          options.track(input.path(), input.offset, input.length, "content");
        if (state.any) {
        } else if (state.choice === null) {
          result = this._decodeGeneric(state.tag, input, options);
        } else {
          result = this._decodeChoice(input, options);
        }
        if (input.isError(result))
          return result;
        if (!state.any && state.choice === null && state.children !== null) {
          state.children.forEach(function decodeChildren(child) {
            child._decode(input, options);
          });
        }
        if (state.contains && (state.tag === "octstr" || state.tag === "bitstr")) {
          const data = new DecoderBuffer(result);
          result = this._getUse(state.contains, input._reporterState.obj)._decode(data, options);
        }
      }
      if (state.obj && present)
        result = input.leaveObject(prevObj);
      if (state.key !== null && (result !== null || present === true))
        input.leaveKey(prevKey, state.key, result);
      else if (prevKey !== null)
        input.exitKey(prevKey);
      return result;
    };
    Node.prototype._decodeGeneric = function decodeGeneric(tag, input, options) {
      const state = this._baseState;
      if (tag === "seq" || tag === "set")
        return null;
      if (tag === "seqof" || tag === "setof")
        return this._decodeList(input, tag, state.args[0], options);
      else if (/str$/.test(tag))
        return this._decodeStr(input, tag, options);
      else if (tag === "objid" && state.args)
        return this._decodeObjid(input, state.args[0], state.args[1], options);
      else if (tag === "objid")
        return this._decodeObjid(input, null, null, options);
      else if (tag === "gentime" || tag === "utctime")
        return this._decodeTime(input, tag, options);
      else if (tag === "null_")
        return this._decodeNull(input, options);
      else if (tag === "bool")
        return this._decodeBool(input, options);
      else if (tag === "objDesc")
        return this._decodeStr(input, tag, options);
      else if (tag === "int" || tag === "enum")
        return this._decodeInt(input, state.args && state.args[0], options);
      if (state.use !== null) {
        return this._getUse(state.use, input._reporterState.obj)._decode(input, options);
      } else {
        return input.error("unknown tag: " + tag);
      }
    };
    Node.prototype._getUse = function _getUse(entity, obj) {
      const state = this._baseState;
      state.useDecoder = this._use(entity, obj);
      assert(state.useDecoder._baseState.parent === null);
      state.useDecoder = state.useDecoder._baseState.children[0];
      if (state.implicit !== state.useDecoder._baseState.implicit) {
        state.useDecoder = state.useDecoder.clone();
        state.useDecoder._baseState.implicit = state.implicit;
      }
      return state.useDecoder;
    };
    Node.prototype._decodeChoice = function decodeChoice(input, options) {
      const state = this._baseState;
      let result = null;
      let match = false;
      Object.keys(state.choice).some(function(key) {
        const save = input.save();
        const node = state.choice[key];
        try {
          const value = node._decode(input, options);
          if (input.isError(value))
            return false;
          result = { type: key, value };
          match = true;
        } catch (e) {
          input.restore(save);
          return false;
        }
        return true;
      }, this);
      if (!match)
        return input.error("Choice not matched");
      return result;
    };
    Node.prototype._createEncoderBuffer = function createEncoderBuffer(data) {
      return new EncoderBuffer(data, this.reporter);
    };
    Node.prototype._encode = function encode(data, reporter, parent) {
      const state = this._baseState;
      if (state["default"] !== null && state["default"] === data)
        return;
      const result = this._encodeValue(data, reporter, parent);
      if (result === void 0)
        return;
      if (this._skipDefault(result, reporter, parent))
        return;
      return result;
    };
    Node.prototype._encodeValue = function encode(data, reporter, parent) {
      const state = this._baseState;
      if (state.parent === null)
        return state.children[0]._encode(data, reporter || new Reporter());
      let result = null;
      this.reporter = reporter;
      if (state.optional && data === void 0) {
        if (state["default"] !== null)
          data = state["default"];
        else
          return;
      }
      let content = null;
      let primitive = false;
      if (state.any) {
        result = this._createEncoderBuffer(data);
      } else if (state.choice) {
        result = this._encodeChoice(data, reporter);
      } else if (state.contains) {
        content = this._getUse(state.contains, parent)._encode(data, reporter);
        primitive = true;
      } else if (state.children) {
        content = state.children.map(function(child) {
          if (child._baseState.tag === "null_")
            return child._encode(null, reporter, data);
          if (child._baseState.key === null)
            return reporter.error("Child should have a key");
          const prevKey = reporter.enterKey(child._baseState.key);
          if (typeof data !== "object")
            return reporter.error("Child expected, but input is not object");
          const res = child._encode(data[child._baseState.key], reporter, data);
          reporter.leaveKey(prevKey);
          return res;
        }, this).filter(function(child) {
          return child;
        });
        content = this._createEncoderBuffer(content);
      } else {
        if (state.tag === "seqof" || state.tag === "setof") {
          if (!(state.args && state.args.length === 1))
            return reporter.error("Too many args for : " + state.tag);
          if (!Array.isArray(data))
            return reporter.error("seqof/setof, but data is not Array");
          const child = this.clone();
          child._baseState.implicit = null;
          content = this._createEncoderBuffer(data.map(function(item) {
            const state2 = this._baseState;
            return this._getUse(state2.args[0], data)._encode(item, reporter);
          }, child));
        } else if (state.use !== null) {
          result = this._getUse(state.use, parent)._encode(data, reporter);
        } else {
          content = this._encodePrimitive(state.tag, data);
          primitive = true;
        }
      }
      if (!state.any && state.choice === null) {
        const tag = state.implicit !== null ? state.implicit : state.tag;
        const cls = state.implicit === null ? "universal" : "context";
        if (tag === null) {
          if (state.use === null)
            reporter.error("Tag could be omitted only for .use()");
        } else {
          if (state.use === null)
            result = this._encodeComposite(tag, primitive, cls, content);
        }
      }
      if (state.explicit !== null)
        result = this._encodeComposite(state.explicit, false, "context", result);
      return result;
    };
    Node.prototype._encodeChoice = function encodeChoice(data, reporter) {
      const state = this._baseState;
      const node = state.choice[data.type];
      if (!node) {
        assert(
          false,
          data.type + " not found in " + JSON.stringify(Object.keys(state.choice))
        );
      }
      return node._encode(data.value, reporter);
    };
    Node.prototype._encodePrimitive = function encodePrimitive(tag, data) {
      const state = this._baseState;
      if (/str$/.test(tag))
        return this._encodeStr(data, tag);
      else if (tag === "objid" && state.args)
        return this._encodeObjid(data, state.reverseArgs[0], state.args[1]);
      else if (tag === "objid")
        return this._encodeObjid(data, null, null);
      else if (tag === "gentime" || tag === "utctime")
        return this._encodeTime(data, tag);
      else if (tag === "null_")
        return this._encodeNull();
      else if (tag === "int" || tag === "enum")
        return this._encodeInt(data, state.args && state.reverseArgs[0]);
      else if (tag === "bool")
        return this._encodeBool(data);
      else if (tag === "objDesc")
        return this._encodeStr(data, tag);
      else
        throw new Error("Unsupported tag: " + tag);
    };
    Node.prototype._isNumstr = function isNumstr(str) {
      return /^[0-9 ]*$/.test(str);
    };
    Node.prototype._isPrintstr = function isPrintstr(str) {
      return /^[A-Za-z0-9 '()+,-./:=?]*$/.test(str);
    };
  }
});

// node_modules/asn1.js/lib/asn1/constants/der.js
var require_der = __commonJS({
  "node_modules/asn1.js/lib/asn1/constants/der.js"(exports) {
    "use strict";
    function reverse(map) {
      const res = {};
      Object.keys(map).forEach(function(key) {
        if ((key | 0) == key)
          key = key | 0;
        const value = map[key];
        res[value] = key;
      });
      return res;
    }
    exports.tagClass = {
      0: "universal",
      1: "application",
      2: "context",
      3: "private"
    };
    exports.tagClassByName = reverse(exports.tagClass);
    exports.tag = {
      0: "end",
      1: "bool",
      2: "int",
      3: "bitstr",
      4: "octstr",
      5: "null_",
      6: "objid",
      7: "objDesc",
      8: "external",
      9: "real",
      10: "enum",
      11: "embed",
      12: "utf8str",
      13: "relativeOid",
      16: "seq",
      17: "set",
      18: "numstr",
      19: "printstr",
      20: "t61str",
      21: "videostr",
      22: "ia5str",
      23: "utctime",
      24: "gentime",
      25: "graphstr",
      26: "iso646str",
      27: "genstr",
      28: "unistr",
      29: "charstr",
      30: "bmpstr"
    };
    exports.tagByName = reverse(exports.tag);
  }
});

// node_modules/asn1.js/lib/asn1/encoders/der.js
var require_der2 = __commonJS({
  "node_modules/asn1.js/lib/asn1/encoders/der.js"(exports, module) {
    "use strict";
    var inherits = require_inherits();
    var Buffer2 = require_safer().Buffer;
    var Node = require_node();
    var der = require_der();
    function DEREncoder(entity) {
      this.enc = "der";
      this.name = entity.name;
      this.entity = entity;
      this.tree = new DERNode();
      this.tree._init(entity.body);
    }
    module.exports = DEREncoder;
    DEREncoder.prototype.encode = function encode(data, reporter) {
      return this.tree._encode(data, reporter).join();
    };
    function DERNode(parent) {
      Node.call(this, "der", parent);
    }
    inherits(DERNode, Node);
    DERNode.prototype._encodeComposite = function encodeComposite(tag, primitive, cls, content) {
      const encodedTag = encodeTag(tag, primitive, cls, this.reporter);
      if (content.length < 128) {
        const header2 = Buffer2.alloc(2);
        header2[0] = encodedTag;
        header2[1] = content.length;
        return this._createEncoderBuffer([header2, content]);
      }
      let lenOctets = 1;
      for (let i = content.length; i >= 256; i >>= 8)
        lenOctets++;
      const header = Buffer2.alloc(1 + 1 + lenOctets);
      header[0] = encodedTag;
      header[1] = 128 | lenOctets;
      for (let i = 1 + lenOctets, j = content.length; j > 0; i--, j >>= 8)
        header[i] = j & 255;
      return this._createEncoderBuffer([header, content]);
    };
    DERNode.prototype._encodeStr = function encodeStr(str, tag) {
      if (tag === "bitstr") {
        return this._createEncoderBuffer([str.unused | 0, str.data]);
      } else if (tag === "bmpstr") {
        const buf = Buffer2.alloc(str.length * 2);
        for (let i = 0; i < str.length; i++) {
          buf.writeUInt16BE(str.charCodeAt(i), i * 2);
        }
        return this._createEncoderBuffer(buf);
      } else if (tag === "numstr") {
        if (!this._isNumstr(str)) {
          return this.reporter.error("Encoding of string type: numstr supports only digits and space");
        }
        return this._createEncoderBuffer(str);
      } else if (tag === "printstr") {
        if (!this._isPrintstr(str)) {
          return this.reporter.error("Encoding of string type: printstr supports only latin upper and lower case letters, digits, space, apostrophe, left and rigth parenthesis, plus sign, comma, hyphen, dot, slash, colon, equal sign, question mark");
        }
        return this._createEncoderBuffer(str);
      } else if (/str$/.test(tag)) {
        return this._createEncoderBuffer(str);
      } else if (tag === "objDesc") {
        return this._createEncoderBuffer(str);
      } else {
        return this.reporter.error("Encoding of string type: " + tag + " unsupported");
      }
    };
    DERNode.prototype._encodeObjid = function encodeObjid(id, values, relative) {
      if (typeof id === "string") {
        if (!values)
          return this.reporter.error("string objid given, but no values map found");
        if (!values.hasOwnProperty(id))
          return this.reporter.error("objid not found in values map");
        id = values[id].split(/[\s.]+/g);
        for (let i = 0; i < id.length; i++)
          id[i] |= 0;
      } else if (Array.isArray(id)) {
        id = id.slice();
        for (let i = 0; i < id.length; i++)
          id[i] |= 0;
      }
      if (!Array.isArray(id)) {
        return this.reporter.error("objid() should be either array or string, got: " + JSON.stringify(id));
      }
      if (!relative) {
        if (id[1] >= 40)
          return this.reporter.error("Second objid identifier OOB");
        id.splice(0, 2, id[0] * 40 + id[1]);
      }
      let size = 0;
      for (let i = 0; i < id.length; i++) {
        let ident = id[i];
        for (size++; ident >= 128; ident >>= 7)
          size++;
      }
      const objid = Buffer2.alloc(size);
      let offset = objid.length - 1;
      for (let i = id.length - 1; i >= 0; i--) {
        let ident = id[i];
        objid[offset--] = ident & 127;
        while ((ident >>= 7) > 0)
          objid[offset--] = 128 | ident & 127;
      }
      return this._createEncoderBuffer(objid);
    };
    function two(num) {
      if (num < 10)
        return "0" + num;
      else
        return num;
    }
    DERNode.prototype._encodeTime = function encodeTime(time, tag) {
      let str;
      const date = new Date(time);
      if (tag === "gentime") {
        str = [
          two(date.getUTCFullYear()),
          two(date.getUTCMonth() + 1),
          two(date.getUTCDate()),
          two(date.getUTCHours()),
          two(date.getUTCMinutes()),
          two(date.getUTCSeconds()),
          "Z"
        ].join("");
      } else if (tag === "utctime") {
        str = [
          two(date.getUTCFullYear() % 100),
          two(date.getUTCMonth() + 1),
          two(date.getUTCDate()),
          two(date.getUTCHours()),
          two(date.getUTCMinutes()),
          two(date.getUTCSeconds()),
          "Z"
        ].join("");
      } else {
        this.reporter.error("Encoding " + tag + " time is not supported yet");
      }
      return this._encodeStr(str, "octstr");
    };
    DERNode.prototype._encodeNull = function encodeNull() {
      return this._createEncoderBuffer("");
    };
    DERNode.prototype._encodeInt = function encodeInt(num, values) {
      if (typeof num === "string") {
        if (!values)
          return this.reporter.error("String int or enum given, but no values map");
        if (!values.hasOwnProperty(num)) {
          return this.reporter.error("Values map doesn't contain: " + JSON.stringify(num));
        }
        num = values[num];
      }
      if (typeof num !== "number" && !Buffer2.isBuffer(num)) {
        const numArray = num.toArray();
        if (!num.sign && numArray[0] & 128) {
          numArray.unshift(0);
        }
        num = Buffer2.from(numArray);
      }
      if (Buffer2.isBuffer(num)) {
        let size2 = num.length;
        if (num.length === 0)
          size2++;
        const out2 = Buffer2.alloc(size2);
        num.copy(out2);
        if (num.length === 0)
          out2[0] = 0;
        return this._createEncoderBuffer(out2);
      }
      if (num < 128)
        return this._createEncoderBuffer(num);
      if (num < 256)
        return this._createEncoderBuffer([0, num]);
      let size = 1;
      for (let i = num; i >= 256; i >>= 8)
        size++;
      const out = new Array(size);
      for (let i = out.length - 1; i >= 0; i--) {
        out[i] = num & 255;
        num >>= 8;
      }
      if (out[0] & 128) {
        out.unshift(0);
      }
      return this._createEncoderBuffer(Buffer2.from(out));
    };
    DERNode.prototype._encodeBool = function encodeBool(value) {
      return this._createEncoderBuffer(value ? 255 : 0);
    };
    DERNode.prototype._use = function use(entity, obj) {
      if (typeof entity === "function")
        entity = entity(obj);
      return entity._getEncoder("der").tree;
    };
    DERNode.prototype._skipDefault = function skipDefault(dataBuffer, reporter, parent) {
      const state = this._baseState;
      let i;
      if (state["default"] === null)
        return false;
      const data = dataBuffer.join();
      if (state.defaultBuffer === void 0)
        state.defaultBuffer = this._encodeValue(state["default"], reporter, parent).join();
      if (data.length !== state.defaultBuffer.length)
        return false;
      for (i = 0; i < data.length; i++)
        if (data[i] !== state.defaultBuffer[i])
          return false;
      return true;
    };
    function encodeTag(tag, primitive, cls, reporter) {
      let res;
      if (tag === "seqof")
        tag = "seq";
      else if (tag === "setof")
        tag = "set";
      if (der.tagByName.hasOwnProperty(tag))
        res = der.tagByName[tag];
      else if (typeof tag === "number" && (tag | 0) === tag)
        res = tag;
      else
        return reporter.error("Unknown tag: " + tag);
      if (res >= 31)
        return reporter.error("Multi-octet tag encoding unsupported");
      if (!primitive)
        res |= 32;
      res |= der.tagClassByName[cls || "universal"] << 6;
      return res;
    }
  }
});

// node_modules/asn1.js/lib/asn1/encoders/pem.js
var require_pem = __commonJS({
  "node_modules/asn1.js/lib/asn1/encoders/pem.js"(exports, module) {
    "use strict";
    var inherits = require_inherits();
    var DEREncoder = require_der2();
    function PEMEncoder(entity) {
      DEREncoder.call(this, entity);
      this.enc = "pem";
    }
    inherits(PEMEncoder, DEREncoder);
    module.exports = PEMEncoder;
    PEMEncoder.prototype.encode = function encode(data, options) {
      const buf = DEREncoder.prototype.encode.call(this, data);
      const p = buf.toString("base64");
      const out = ["-----BEGIN " + options.label + "-----"];
      for (let i = 0; i < p.length; i += 64)
        out.push(p.slice(i, i + 64));
      out.push("-----END " + options.label + "-----");
      return out.join("\n");
    };
  }
});

// node_modules/asn1.js/lib/asn1/encoders/index.js
var require_encoders = __commonJS({
  "node_modules/asn1.js/lib/asn1/encoders/index.js"(exports) {
    "use strict";
    var encoders = exports;
    encoders.der = require_der2();
    encoders.pem = require_pem();
  }
});

// node_modules/asn1.js/lib/asn1/decoders/der.js
var require_der3 = __commonJS({
  "node_modules/asn1.js/lib/asn1/decoders/der.js"(exports, module) {
    "use strict";
    var inherits = require_inherits();
    var bignum = require_bn();
    var DecoderBuffer = require_buffer().DecoderBuffer;
    var Node = require_node();
    var der = require_der();
    function DERDecoder(entity) {
      this.enc = "der";
      this.name = entity.name;
      this.entity = entity;
      this.tree = new DERNode();
      this.tree._init(entity.body);
    }
    module.exports = DERDecoder;
    DERDecoder.prototype.decode = function decode(data, options) {
      if (!DecoderBuffer.isDecoderBuffer(data)) {
        data = new DecoderBuffer(data, options);
      }
      return this.tree._decode(data, options);
    };
    function DERNode(parent) {
      Node.call(this, "der", parent);
    }
    inherits(DERNode, Node);
    DERNode.prototype._peekTag = function peekTag(buffer, tag, any) {
      if (buffer.isEmpty())
        return false;
      const state = buffer.save();
      const decodedTag = derDecodeTag(buffer, 'Failed to peek tag: "' + tag + '"');
      if (buffer.isError(decodedTag))
        return decodedTag;
      buffer.restore(state);
      return decodedTag.tag === tag || decodedTag.tagStr === tag || decodedTag.tagStr + "of" === tag || any;
    };
    DERNode.prototype._decodeTag = function decodeTag(buffer, tag, any) {
      const decodedTag = derDecodeTag(
        buffer,
        'Failed to decode tag of "' + tag + '"'
      );
      if (buffer.isError(decodedTag))
        return decodedTag;
      let len = derDecodeLen(
        buffer,
        decodedTag.primitive,
        'Failed to get length of "' + tag + '"'
      );
      if (buffer.isError(len))
        return len;
      if (!any && decodedTag.tag !== tag && decodedTag.tagStr !== tag && decodedTag.tagStr + "of" !== tag) {
        return buffer.error('Failed to match tag: "' + tag + '"');
      }
      if (decodedTag.primitive || len !== null)
        return buffer.skip(len, 'Failed to match body of: "' + tag + '"');
      const state = buffer.save();
      const res = this._skipUntilEnd(
        buffer,
        'Failed to skip indefinite length body: "' + this.tag + '"'
      );
      if (buffer.isError(res))
        return res;
      len = buffer.offset - state.offset;
      buffer.restore(state);
      return buffer.skip(len, 'Failed to match body of: "' + tag + '"');
    };
    DERNode.prototype._skipUntilEnd = function skipUntilEnd(buffer, fail) {
      for (; ; ) {
        const tag = derDecodeTag(buffer, fail);
        if (buffer.isError(tag))
          return tag;
        const len = derDecodeLen(buffer, tag.primitive, fail);
        if (buffer.isError(len))
          return len;
        let res;
        if (tag.primitive || len !== null)
          res = buffer.skip(len);
        else
          res = this._skipUntilEnd(buffer, fail);
        if (buffer.isError(res))
          return res;
        if (tag.tagStr === "end")
          break;
      }
    };
    DERNode.prototype._decodeList = function decodeList(buffer, tag, decoder, options) {
      const result = [];
      while (!buffer.isEmpty()) {
        const possibleEnd = this._peekTag(buffer, "end");
        if (buffer.isError(possibleEnd))
          return possibleEnd;
        const res = decoder.decode(buffer, "der", options);
        if (buffer.isError(res) && possibleEnd)
          break;
        result.push(res);
      }
      return result;
    };
    DERNode.prototype._decodeStr = function decodeStr(buffer, tag) {
      if (tag === "bitstr") {
        const unused = buffer.readUInt8();
        if (buffer.isError(unused))
          return unused;
        return { unused, data: buffer.raw() };
      } else if (tag === "bmpstr") {
        const raw = buffer.raw();
        if (raw.length % 2 === 1)
          return buffer.error("Decoding of string type: bmpstr length mismatch");
        let str = "";
        for (let i = 0; i < raw.length / 2; i++) {
          str += String.fromCharCode(raw.readUInt16BE(i * 2));
        }
        return str;
      } else if (tag === "numstr") {
        const numstr = buffer.raw().toString("ascii");
        if (!this._isNumstr(numstr)) {
          return buffer.error("Decoding of string type: numstr unsupported characters");
        }
        return numstr;
      } else if (tag === "octstr") {
        return buffer.raw();
      } else if (tag === "objDesc") {
        return buffer.raw();
      } else if (tag === "printstr") {
        const printstr = buffer.raw().toString("ascii");
        if (!this._isPrintstr(printstr)) {
          return buffer.error("Decoding of string type: printstr unsupported characters");
        }
        return printstr;
      } else if (/str$/.test(tag)) {
        return buffer.raw().toString();
      } else {
        return buffer.error("Decoding of string type: " + tag + " unsupported");
      }
    };
    DERNode.prototype._decodeObjid = function decodeObjid(buffer, values, relative) {
      let result;
      const identifiers = [];
      let ident = 0;
      let subident = 0;
      while (!buffer.isEmpty()) {
        subident = buffer.readUInt8();
        ident <<= 7;
        ident |= subident & 127;
        if ((subident & 128) === 0) {
          identifiers.push(ident);
          ident = 0;
        }
      }
      if (subident & 128)
        identifiers.push(ident);
      const first = identifiers[0] / 40 | 0;
      const second = identifiers[0] % 40;
      if (relative)
        result = identifiers;
      else
        result = [first, second].concat(identifiers.slice(1));
      if (values) {
        let tmp = values[result.join(" ")];
        if (tmp === void 0)
          tmp = values[result.join(".")];
        if (tmp !== void 0)
          result = tmp;
      }
      return result;
    };
    DERNode.prototype._decodeTime = function decodeTime(buffer, tag) {
      const str = buffer.raw().toString();
      let year;
      let mon;
      let day;
      let hour;
      let min;
      let sec;
      if (tag === "gentime") {
        year = str.slice(0, 4) | 0;
        mon = str.slice(4, 6) | 0;
        day = str.slice(6, 8) | 0;
        hour = str.slice(8, 10) | 0;
        min = str.slice(10, 12) | 0;
        sec = str.slice(12, 14) | 0;
      } else if (tag === "utctime") {
        year = str.slice(0, 2) | 0;
        mon = str.slice(2, 4) | 0;
        day = str.slice(4, 6) | 0;
        hour = str.slice(6, 8) | 0;
        min = str.slice(8, 10) | 0;
        sec = str.slice(10, 12) | 0;
        if (year < 70)
          year = 2e3 + year;
        else
          year = 1900 + year;
      } else {
        return buffer.error("Decoding " + tag + " time is not supported yet");
      }
      return Date.UTC(year, mon - 1, day, hour, min, sec, 0);
    };
    DERNode.prototype._decodeNull = function decodeNull() {
      return null;
    };
    DERNode.prototype._decodeBool = function decodeBool(buffer) {
      const res = buffer.readUInt8();
      if (buffer.isError(res))
        return res;
      else
        return res !== 0;
    };
    DERNode.prototype._decodeInt = function decodeInt(buffer, values) {
      const raw = buffer.raw();
      let res = new bignum(raw);
      if (values)
        res = values[res.toString(10)] || res;
      return res;
    };
    DERNode.prototype._use = function use(entity, obj) {
      if (typeof entity === "function")
        entity = entity(obj);
      return entity._getDecoder("der").tree;
    };
    function derDecodeTag(buf, fail) {
      let tag = buf.readUInt8(fail);
      if (buf.isError(tag))
        return tag;
      const cls = der.tagClass[tag >> 6];
      const primitive = (tag & 32) === 0;
      if ((tag & 31) === 31) {
        let oct = tag;
        tag = 0;
        while ((oct & 128) === 128) {
          oct = buf.readUInt8(fail);
          if (buf.isError(oct))
            return oct;
          tag <<= 7;
          tag |= oct & 127;
        }
      } else {
        tag &= 31;
      }
      const tagStr = der.tag[tag];
      return {
        cls,
        primitive,
        tag,
        tagStr
      };
    }
    function derDecodeLen(buf, primitive, fail) {
      let len = buf.readUInt8(fail);
      if (buf.isError(len))
        return len;
      if (!primitive && len === 128)
        return null;
      if ((len & 128) === 0) {
        return len;
      }
      const num = len & 127;
      if (num > 4)
        return buf.error("length octect is too long");
      len = 0;
      for (let i = 0; i < num; i++) {
        len <<= 8;
        const j = buf.readUInt8(fail);
        if (buf.isError(j))
          return j;
        len |= j;
      }
      return len;
    }
  }
});

// node_modules/asn1.js/lib/asn1/decoders/pem.js
var require_pem2 = __commonJS({
  "node_modules/asn1.js/lib/asn1/decoders/pem.js"(exports, module) {
    "use strict";
    var inherits = require_inherits();
    var Buffer2 = require_safer().Buffer;
    var DERDecoder = require_der3();
    function PEMDecoder(entity) {
      DERDecoder.call(this, entity);
      this.enc = "pem";
    }
    inherits(PEMDecoder, DERDecoder);
    module.exports = PEMDecoder;
    PEMDecoder.prototype.decode = function decode(data, options) {
      const lines = data.toString().split(/[\r\n]+/g);
      const label = options.label.toUpperCase();
      const re = /^-----(BEGIN|END) ([^-]+)-----$/;
      let start = -1;
      let end = -1;
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(re);
        if (match === null)
          continue;
        if (match[2] !== label)
          continue;
        if (start === -1) {
          if (match[1] !== "BEGIN")
            break;
          start = i;
        } else {
          if (match[1] !== "END")
            break;
          end = i;
          break;
        }
      }
      if (start === -1 || end === -1)
        throw new Error("PEM section not found for: " + label);
      const base64 = lines.slice(start + 1, end).join("");
      base64.replace(/[^a-z0-9+/=]+/gi, "");
      const input = Buffer2.from(base64, "base64");
      return DERDecoder.prototype.decode.call(this, input, options);
    };
  }
});

// node_modules/asn1.js/lib/asn1/decoders/index.js
var require_decoders = __commonJS({
  "node_modules/asn1.js/lib/asn1/decoders/index.js"(exports) {
    "use strict";
    var decoders = exports;
    decoders.der = require_der3();
    decoders.pem = require_pem2();
  }
});

// node_modules/asn1.js/lib/asn1/api.js
var require_api = __commonJS({
  "node_modules/asn1.js/lib/asn1/api.js"(exports) {
    "use strict";
    var encoders = require_encoders();
    var decoders = require_decoders();
    var inherits = require_inherits();
    var api = exports;
    api.define = function define(name, body) {
      return new Entity(name, body);
    };
    function Entity(name, body) {
      this.name = name;
      this.body = body;
      this.decoders = {};
      this.encoders = {};
    }
    Entity.prototype._createNamed = function createNamed(Base) {
      const name = this.name;
      function Generated(entity) {
        this._initNamed(entity, name);
      }
      inherits(Generated, Base);
      Generated.prototype._initNamed = function _initNamed(entity, name2) {
        Base.call(this, entity, name2);
      };
      return new Generated(this);
    };
    Entity.prototype._getDecoder = function _getDecoder(enc) {
      enc = enc || "der";
      if (!this.decoders.hasOwnProperty(enc))
        this.decoders[enc] = this._createNamed(decoders[enc]);
      return this.decoders[enc];
    };
    Entity.prototype.decode = function decode(data, enc, options) {
      return this._getDecoder(enc).decode(data, options);
    };
    Entity.prototype._getEncoder = function _getEncoder(enc) {
      enc = enc || "der";
      if (!this.encoders.hasOwnProperty(enc))
        this.encoders[enc] = this._createNamed(encoders[enc]);
      return this.encoders[enc];
    };
    Entity.prototype.encode = function encode(data, enc, reporter) {
      return this._getEncoder(enc).encode(data, reporter);
    };
  }
});

// node_modules/asn1.js/lib/asn1/base/index.js
var require_base = __commonJS({
  "node_modules/asn1.js/lib/asn1/base/index.js"(exports) {
    "use strict";
    var base = exports;
    base.Reporter = require_reporter().Reporter;
    base.DecoderBuffer = require_buffer().DecoderBuffer;
    base.EncoderBuffer = require_buffer().EncoderBuffer;
    base.Node = require_node();
  }
});

// node_modules/asn1.js/lib/asn1/constants/index.js
var require_constants = __commonJS({
  "node_modules/asn1.js/lib/asn1/constants/index.js"(exports) {
    "use strict";
    var constants = exports;
    constants._reverse = function reverse(map) {
      const res = {};
      Object.keys(map).forEach(function(key) {
        if ((key | 0) == key)
          key = key | 0;
        const value = map[key];
        res[value] = key;
      });
      return res;
    };
    constants.der = require_der();
  }
});

// node_modules/asn1.js/lib/asn1.js
var require_asn1 = __commonJS({
  "node_modules/asn1.js/lib/asn1.js"(exports) {
    "use strict";
    var asn1 = exports;
    asn1.bignum = require_bn();
    asn1.define = require_api().define;
    asn1.base = require_base();
    asn1.constants = require_constants();
    asn1.decoders = require_decoders();
    asn1.encoders = require_encoders();
  }
});

// node_modules/safe-buffer/index.js
var require_safe_buffer = __commonJS({
  "node_modules/safe-buffer/index.js"(exports, module) {
    var buffer = __require("buffer");
    var Buffer2 = buffer.Buffer;
    function copyProps(src, dst) {
      for (var key in src) {
        dst[key] = src[key];
      }
    }
    if (Buffer2.from && Buffer2.alloc && Buffer2.allocUnsafe && Buffer2.allocUnsafeSlow) {
      module.exports = buffer;
    } else {
      copyProps(buffer, exports);
      exports.Buffer = SafeBuffer;
    }
    function SafeBuffer(arg, encodingOrOffset, length) {
      return Buffer2(arg, encodingOrOffset, length);
    }
    SafeBuffer.prototype = Object.create(Buffer2.prototype);
    copyProps(Buffer2, SafeBuffer);
    SafeBuffer.from = function(arg, encodingOrOffset, length) {
      if (typeof arg === "number") {
        throw new TypeError("Argument must not be a number");
      }
      return Buffer2(arg, encodingOrOffset, length);
    };
    SafeBuffer.alloc = function(size, fill, encoding) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      var buf = Buffer2(size);
      if (fill !== void 0) {
        if (typeof encoding === "string") {
          buf.fill(fill, encoding);
        } else {
          buf.fill(fill);
        }
      } else {
        buf.fill(0);
      }
      return buf;
    };
    SafeBuffer.allocUnsafe = function(size) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      return Buffer2(size);
    };
    SafeBuffer.allocUnsafeSlow = function(size) {
      if (typeof size !== "number") {
        throw new TypeError("Argument must be a number");
      }
      return buffer.SlowBuffer(size);
    };
  }
});

// node_modules/jws/lib/data-stream.js
var require_data_stream = __commonJS({
  "node_modules/jws/lib/data-stream.js"(exports, module) {
    var Buffer2 = require_safe_buffer().Buffer;
    var Stream = __require("stream");
    var util = __require("util");
    function DataStream(data) {
      this.buffer = null;
      this.writable = true;
      this.readable = true;
      if (!data) {
        this.buffer = Buffer2.alloc(0);
        return this;
      }
      if (typeof data.pipe === "function") {
        this.buffer = Buffer2.alloc(0);
        data.pipe(this);
        return this;
      }
      if (data.length || typeof data === "object") {
        this.buffer = data;
        this.writable = false;
        process.nextTick(function() {
          this.emit("end", data);
          this.readable = false;
          this.emit("close");
        }.bind(this));
        return this;
      }
      throw new TypeError("Unexpected data type (" + typeof data + ")");
    }
    util.inherits(DataStream, Stream);
    DataStream.prototype.write = function write(data) {
      this.buffer = Buffer2.concat([this.buffer, Buffer2.from(data)]);
      this.emit("data", data);
    };
    DataStream.prototype.end = function end(data) {
      if (data)
        this.write(data);
      this.emit("end", data);
      this.emit("close");
      this.writable = false;
      this.readable = false;
    };
    module.exports = DataStream;
  }
});

// node_modules/ecdsa-sig-formatter/src/param-bytes-for-alg.js
var require_param_bytes_for_alg = __commonJS({
  "node_modules/ecdsa-sig-formatter/src/param-bytes-for-alg.js"(exports, module) {
    "use strict";
    function getParamSize(keySize) {
      var result = (keySize / 8 | 0) + (keySize % 8 === 0 ? 0 : 1);
      return result;
    }
    var paramBytesForAlg = {
      ES256: getParamSize(256),
      ES384: getParamSize(384),
      ES512: getParamSize(521)
    };
    function getParamBytesForAlg(alg) {
      var paramBytes = paramBytesForAlg[alg];
      if (paramBytes) {
        return paramBytes;
      }
      throw new Error('Unknown algorithm "' + alg + '"');
    }
    module.exports = getParamBytesForAlg;
  }
});

// node_modules/ecdsa-sig-formatter/src/ecdsa-sig-formatter.js
var require_ecdsa_sig_formatter = __commonJS({
  "node_modules/ecdsa-sig-formatter/src/ecdsa-sig-formatter.js"(exports, module) {
    "use strict";
    var Buffer2 = require_safe_buffer().Buffer;
    var getParamBytesForAlg = require_param_bytes_for_alg();
    var MAX_OCTET = 128;
    var CLASS_UNIVERSAL = 0;
    var PRIMITIVE_BIT = 32;
    var TAG_SEQ = 16;
    var TAG_INT = 2;
    var ENCODED_TAG_SEQ = TAG_SEQ | PRIMITIVE_BIT | CLASS_UNIVERSAL << 6;
    var ENCODED_TAG_INT = TAG_INT | CLASS_UNIVERSAL << 6;
    function base64Url(base64) {
      return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    }
    function signatureAsBuffer(signature) {
      if (Buffer2.isBuffer(signature)) {
        return signature;
      } else if ("string" === typeof signature) {
        return Buffer2.from(signature, "base64");
      }
      throw new TypeError("ECDSA signature must be a Base64 string or a Buffer");
    }
    function derToJose(signature, alg) {
      signature = signatureAsBuffer(signature);
      var paramBytes = getParamBytesForAlg(alg);
      var maxEncodedParamLength = paramBytes + 1;
      var inputLength = signature.length;
      var offset = 0;
      if (signature[offset++] !== ENCODED_TAG_SEQ) {
        throw new Error('Could not find expected "seq"');
      }
      var seqLength = signature[offset++];
      if (seqLength === (MAX_OCTET | 1)) {
        seqLength = signature[offset++];
      }
      if (inputLength - offset < seqLength) {
        throw new Error('"seq" specified length of "' + seqLength + '", only "' + (inputLength - offset) + '" remaining');
      }
      if (signature[offset++] !== ENCODED_TAG_INT) {
        throw new Error('Could not find expected "int" for "r"');
      }
      var rLength = signature[offset++];
      if (inputLength - offset - 2 < rLength) {
        throw new Error('"r" specified length of "' + rLength + '", only "' + (inputLength - offset - 2) + '" available');
      }
      if (maxEncodedParamLength < rLength) {
        throw new Error('"r" specified length of "' + rLength + '", max of "' + maxEncodedParamLength + '" is acceptable');
      }
      var rOffset = offset;
      offset += rLength;
      if (signature[offset++] !== ENCODED_TAG_INT) {
        throw new Error('Could not find expected "int" for "s"');
      }
      var sLength = signature[offset++];
      if (inputLength - offset !== sLength) {
        throw new Error('"s" specified length of "' + sLength + '", expected "' + (inputLength - offset) + '"');
      }
      if (maxEncodedParamLength < sLength) {
        throw new Error('"s" specified length of "' + sLength + '", max of "' + maxEncodedParamLength + '" is acceptable');
      }
      var sOffset = offset;
      offset += sLength;
      if (offset !== inputLength) {
        throw new Error('Expected to consume entire buffer, but "' + (inputLength - offset) + '" bytes remain');
      }
      var rPadding = paramBytes - rLength, sPadding = paramBytes - sLength;
      var dst = Buffer2.allocUnsafe(rPadding + rLength + sPadding + sLength);
      for (offset = 0; offset < rPadding; ++offset) {
        dst[offset] = 0;
      }
      signature.copy(dst, offset, rOffset + Math.max(-rPadding, 0), rOffset + rLength);
      offset = paramBytes;
      for (var o = offset; offset < o + sPadding; ++offset) {
        dst[offset] = 0;
      }
      signature.copy(dst, offset, sOffset + Math.max(-sPadding, 0), sOffset + sLength);
      dst = dst.toString("base64");
      dst = base64Url(dst);
      return dst;
    }
    function countPadding(buf, start, stop) {
      var padding = 0;
      while (start + padding < stop && buf[start + padding] === 0) {
        ++padding;
      }
      var needsSign = buf[start + padding] >= MAX_OCTET;
      if (needsSign) {
        --padding;
      }
      return padding;
    }
    function joseToDer(signature, alg) {
      signature = signatureAsBuffer(signature);
      var paramBytes = getParamBytesForAlg(alg);
      var signatureBytes = signature.length;
      if (signatureBytes !== paramBytes * 2) {
        throw new TypeError('"' + alg + '" signatures must be "' + paramBytes * 2 + '" bytes, saw "' + signatureBytes + '"');
      }
      var rPadding = countPadding(signature, 0, paramBytes);
      var sPadding = countPadding(signature, paramBytes, signature.length);
      var rLength = paramBytes - rPadding;
      var sLength = paramBytes - sPadding;
      var rsBytes = 1 + 1 + rLength + 1 + 1 + sLength;
      var shortLength = rsBytes < MAX_OCTET;
      var dst = Buffer2.allocUnsafe((shortLength ? 2 : 3) + rsBytes);
      var offset = 0;
      dst[offset++] = ENCODED_TAG_SEQ;
      if (shortLength) {
        dst[offset++] = rsBytes;
      } else {
        dst[offset++] = MAX_OCTET | 1;
        dst[offset++] = rsBytes & 255;
      }
      dst[offset++] = ENCODED_TAG_INT;
      dst[offset++] = rLength;
      if (rPadding < 0) {
        dst[offset++] = 0;
        offset += signature.copy(dst, offset, 0, paramBytes);
      } else {
        offset += signature.copy(dst, offset, rPadding, paramBytes);
      }
      dst[offset++] = ENCODED_TAG_INT;
      dst[offset++] = sLength;
      if (sPadding < 0) {
        dst[offset++] = 0;
        signature.copy(dst, offset, paramBytes);
      } else {
        signature.copy(dst, offset, paramBytes + sPadding);
      }
      return dst;
    }
    module.exports = {
      derToJose,
      joseToDer
    };
  }
});

// node_modules/buffer-equal-constant-time/index.js
var require_buffer_equal_constant_time = __commonJS({
  "node_modules/buffer-equal-constant-time/index.js"(exports, module) {
    "use strict";
    var Buffer2 = __require("buffer").Buffer;
    var SlowBuffer = __require("buffer").SlowBuffer;
    module.exports = bufferEq;
    function bufferEq(a, b) {
      if (!Buffer2.isBuffer(a) || !Buffer2.isBuffer(b)) {
        return false;
      }
      if (a.length !== b.length) {
        return false;
      }
      var c = 0;
      for (var i = 0; i < a.length; i++) {
        c |= a[i] ^ b[i];
      }
      return c === 0;
    }
    bufferEq.install = function() {
      Buffer2.prototype.equal = SlowBuffer.prototype.equal = function equal(that) {
        return bufferEq(this, that);
      };
    };
    var origBufEqual = Buffer2.prototype.equal;
    var origSlowBufEqual = SlowBuffer.prototype.equal;
    bufferEq.restore = function() {
      Buffer2.prototype.equal = origBufEqual;
      SlowBuffer.prototype.equal = origSlowBufEqual;
    };
  }
});

// node_modules/jwa/index.js
var require_jwa = __commonJS({
  "node_modules/jwa/index.js"(exports, module) {
    var Buffer2 = require_safe_buffer().Buffer;
    var crypto = __require("crypto");
    var formatEcdsa = require_ecdsa_sig_formatter();
    var util = __require("util");
    var MSG_INVALID_ALGORITHM = '"%s" is not a valid algorithm.\n  Supported algorithms are:\n  "HS256", "HS384", "HS512", "RS256", "RS384", "RS512", "PS256", "PS384", "PS512", "ES256", "ES384", "ES512" and "none".';
    var MSG_INVALID_SECRET = "secret must be a string or buffer";
    var MSG_INVALID_VERIFIER_KEY = "key must be a string or a buffer";
    var MSG_INVALID_SIGNER_KEY = "key must be a string, a buffer or an object";
    var supportsKeyObjects = typeof crypto.createPublicKey === "function";
    if (supportsKeyObjects) {
      MSG_INVALID_VERIFIER_KEY += " or a KeyObject";
      MSG_INVALID_SECRET += "or a KeyObject";
    }
    function checkIsPublicKey(key) {
      if (Buffer2.isBuffer(key)) {
        return;
      }
      if (typeof key === "string") {
        return;
      }
      if (!supportsKeyObjects) {
        throw typeError(MSG_INVALID_VERIFIER_KEY);
      }
      if (typeof key !== "object") {
        throw typeError(MSG_INVALID_VERIFIER_KEY);
      }
      if (typeof key.type !== "string") {
        throw typeError(MSG_INVALID_VERIFIER_KEY);
      }
      if (typeof key.asymmetricKeyType !== "string") {
        throw typeError(MSG_INVALID_VERIFIER_KEY);
      }
      if (typeof key.export !== "function") {
        throw typeError(MSG_INVALID_VERIFIER_KEY);
      }
    }
    function checkIsPrivateKey(key) {
      if (Buffer2.isBuffer(key)) {
        return;
      }
      if (typeof key === "string") {
        return;
      }
      if (typeof key === "object") {
        return;
      }
      throw typeError(MSG_INVALID_SIGNER_KEY);
    }
    function checkIsSecretKey(key) {
      if (Buffer2.isBuffer(key)) {
        return;
      }
      if (typeof key === "string") {
        return key;
      }
      if (!supportsKeyObjects) {
        throw typeError(MSG_INVALID_SECRET);
      }
      if (typeof key !== "object") {
        throw typeError(MSG_INVALID_SECRET);
      }
      if (key.type !== "secret") {
        throw typeError(MSG_INVALID_SECRET);
      }
      if (typeof key.export !== "function") {
        throw typeError(MSG_INVALID_SECRET);
      }
    }
    function fromBase64(base64) {
      return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    }
    function toBase64(base64url) {
      base64url = base64url.toString();
      var padding = 4 - base64url.length % 4;
      if (padding !== 4) {
        for (var i = 0; i < padding; ++i) {
          base64url += "=";
        }
      }
      return base64url.replace(/\-/g, "+").replace(/_/g, "/");
    }
    function typeError(template) {
      var args = [].slice.call(arguments, 1);
      var errMsg = util.format.bind(util, template).apply(null, args);
      return new TypeError(errMsg);
    }
    function bufferOrString(obj) {
      return Buffer2.isBuffer(obj) || typeof obj === "string";
    }
    function normalizeInput(thing) {
      if (!bufferOrString(thing))
        thing = JSON.stringify(thing);
      return thing;
    }
    function createHmacSigner(bits) {
      return function sign(thing, secret2) {
        checkIsSecretKey(secret2);
        thing = normalizeInput(thing);
        var hmac = crypto.createHmac("sha" + bits, secret2);
        var sig = (hmac.update(thing), hmac.digest("base64"));
        return fromBase64(sig);
      };
    }
    var bufferEqual;
    var timingSafeEqual2 = "timingSafeEqual" in crypto ? function timingSafeEqual3(a, b) {
      if (a.byteLength !== b.byteLength) {
        return false;
      }
      return crypto.timingSafeEqual(a, b);
    } : function timingSafeEqual3(a, b) {
      if (!bufferEqual) {
        bufferEqual = require_buffer_equal_constant_time();
      }
      return bufferEqual(a, b);
    };
    function createHmacVerifier(bits) {
      return function verify(thing, signature, secret2) {
        var computedSig = createHmacSigner(bits)(thing, secret2);
        return timingSafeEqual2(Buffer2.from(signature), Buffer2.from(computedSig));
      };
    }
    function createKeySigner(bits) {
      return function sign(thing, privateKey) {
        checkIsPrivateKey(privateKey);
        thing = normalizeInput(thing);
        var signer = crypto.createSign("RSA-SHA" + bits);
        var sig = (signer.update(thing), signer.sign(privateKey, "base64"));
        return fromBase64(sig);
      };
    }
    function createKeyVerifier(bits) {
      return function verify(thing, signature, publicKey) {
        checkIsPublicKey(publicKey);
        thing = normalizeInput(thing);
        signature = toBase64(signature);
        var verifier = crypto.createVerify("RSA-SHA" + bits);
        verifier.update(thing);
        return verifier.verify(publicKey, signature, "base64");
      };
    }
    function createPSSKeySigner(bits) {
      return function sign(thing, privateKey) {
        checkIsPrivateKey(privateKey);
        thing = normalizeInput(thing);
        var signer = crypto.createSign("RSA-SHA" + bits);
        var sig = (signer.update(thing), signer.sign({
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
          saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
        }, "base64"));
        return fromBase64(sig);
      };
    }
    function createPSSKeyVerifier(bits) {
      return function verify(thing, signature, publicKey) {
        checkIsPublicKey(publicKey);
        thing = normalizeInput(thing);
        signature = toBase64(signature);
        var verifier = crypto.createVerify("RSA-SHA" + bits);
        verifier.update(thing);
        return verifier.verify({
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
          saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
        }, signature, "base64");
      };
    }
    function createECDSASigner(bits) {
      var inner = createKeySigner(bits);
      return function sign() {
        var signature = inner.apply(null, arguments);
        signature = formatEcdsa.derToJose(signature, "ES" + bits);
        return signature;
      };
    }
    function createECDSAVerifer(bits) {
      var inner = createKeyVerifier(bits);
      return function verify(thing, signature, publicKey) {
        signature = formatEcdsa.joseToDer(signature, "ES" + bits).toString("base64");
        var result = inner(thing, signature, publicKey);
        return result;
      };
    }
    function createNoneSigner() {
      return function sign() {
        return "";
      };
    }
    function createNoneVerifier() {
      return function verify(thing, signature) {
        return signature === "";
      };
    }
    module.exports = function jwa(algorithm) {
      var signerFactories = {
        hs: createHmacSigner,
        rs: createKeySigner,
        ps: createPSSKeySigner,
        es: createECDSASigner,
        none: createNoneSigner
      };
      var verifierFactories = {
        hs: createHmacVerifier,
        rs: createKeyVerifier,
        ps: createPSSKeyVerifier,
        es: createECDSAVerifer,
        none: createNoneVerifier
      };
      var match = algorithm.match(/^(RS|PS|ES|HS)(256|384|512)$|^(none)$/);
      if (!match)
        throw typeError(MSG_INVALID_ALGORITHM, algorithm);
      var algo = (match[1] || match[3]).toLowerCase();
      var bits = match[2];
      return {
        sign: signerFactories[algo](bits),
        verify: verifierFactories[algo](bits)
      };
    };
  }
});

// node_modules/jws/lib/tostring.js
var require_tostring = __commonJS({
  "node_modules/jws/lib/tostring.js"(exports, module) {
    var Buffer2 = __require("buffer").Buffer;
    module.exports = function toString(obj) {
      if (typeof obj === "string")
        return obj;
      if (typeof obj === "number" || Buffer2.isBuffer(obj))
        return obj.toString();
      return JSON.stringify(obj);
    };
  }
});

// node_modules/jws/lib/sign-stream.js
var require_sign_stream = __commonJS({
  "node_modules/jws/lib/sign-stream.js"(exports, module) {
    var Buffer2 = require_safe_buffer().Buffer;
    var DataStream = require_data_stream();
    var jwa = require_jwa();
    var Stream = __require("stream");
    var toString = require_tostring();
    var util = __require("util");
    function base64url(string, encoding) {
      return Buffer2.from(string, encoding).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    }
    function jwsSecuredInput(header, payload, encoding) {
      encoding = encoding || "utf8";
      var encodedHeader = base64url(toString(header), "binary");
      var encodedPayload = base64url(toString(payload), encoding);
      return util.format("%s.%s", encodedHeader, encodedPayload);
    }
    function jwsSign(opts) {
      var header = opts.header;
      var payload = opts.payload;
      var secretOrKey = opts.secret || opts.privateKey;
      var encoding = opts.encoding;
      var algo = jwa(header.alg);
      var securedInput = jwsSecuredInput(header, payload, encoding);
      var signature = algo.sign(securedInput, secretOrKey);
      return util.format("%s.%s", securedInput, signature);
    }
    function SignStream(opts) {
      var secret2 = opts.secret;
      secret2 = secret2 == null ? opts.privateKey : secret2;
      secret2 = secret2 == null ? opts.key : secret2;
      if (/^hs/i.test(opts.header.alg) === true && secret2 == null) {
        throw new TypeError("secret must be a string or buffer or a KeyObject");
      }
      var secretStream = new DataStream(secret2);
      this.readable = true;
      this.header = opts.header;
      this.encoding = opts.encoding;
      this.secret = this.privateKey = this.key = secretStream;
      this.payload = new DataStream(opts.payload);
      this.secret.once("close", function() {
        if (!this.payload.writable && this.readable)
          this.sign();
      }.bind(this));
      this.payload.once("close", function() {
        if (!this.secret.writable && this.readable)
          this.sign();
      }.bind(this));
    }
    util.inherits(SignStream, Stream);
    SignStream.prototype.sign = function sign() {
      try {
        var signature = jwsSign({
          header: this.header,
          payload: this.payload.buffer,
          secret: this.secret.buffer,
          encoding: this.encoding
        });
        this.emit("done", signature);
        this.emit("data", signature);
        this.emit("end");
        this.readable = false;
        return signature;
      } catch (e) {
        this.readable = false;
        this.emit("error", e);
        this.emit("close");
      }
    };
    SignStream.sign = jwsSign;
    module.exports = SignStream;
  }
});

// node_modules/jws/lib/verify-stream.js
var require_verify_stream = __commonJS({
  "node_modules/jws/lib/verify-stream.js"(exports, module) {
    var Buffer2 = require_safe_buffer().Buffer;
    var DataStream = require_data_stream();
    var jwa = require_jwa();
    var Stream = __require("stream");
    var toString = require_tostring();
    var util = __require("util");
    var JWS_REGEX = /^[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$/;
    function isObject(thing) {
      return Object.prototype.toString.call(thing) === "[object Object]";
    }
    function safeJsonParse(thing) {
      if (isObject(thing))
        return thing;
      try {
        return JSON.parse(thing);
      } catch (e) {
        return void 0;
      }
    }
    function headerFromJWS(jwsSig) {
      var encodedHeader = jwsSig.split(".", 1)[0];
      return safeJsonParse(Buffer2.from(encodedHeader, "base64").toString("binary"));
    }
    function securedInputFromJWS(jwsSig) {
      return jwsSig.split(".", 2).join(".");
    }
    function signatureFromJWS(jwsSig) {
      return jwsSig.split(".")[2];
    }
    function payloadFromJWS(jwsSig, encoding) {
      encoding = encoding || "utf8";
      var payload = jwsSig.split(".")[1];
      return Buffer2.from(payload, "base64").toString(encoding);
    }
    function isValidJws(string) {
      return JWS_REGEX.test(string) && !!headerFromJWS(string);
    }
    function jwsVerify(jwsSig, algorithm, secretOrKey) {
      if (!algorithm) {
        var err = new Error("Missing algorithm parameter for jws.verify");
        err.code = "MISSING_ALGORITHM";
        throw err;
      }
      jwsSig = toString(jwsSig);
      var signature = signatureFromJWS(jwsSig);
      var securedInput = securedInputFromJWS(jwsSig);
      var algo = jwa(algorithm);
      return algo.verify(securedInput, signature, secretOrKey);
    }
    function jwsDecode(jwsSig, opts) {
      opts = opts || {};
      jwsSig = toString(jwsSig);
      if (!isValidJws(jwsSig))
        return null;
      var header = headerFromJWS(jwsSig);
      if (!header)
        return null;
      var payload = payloadFromJWS(jwsSig);
      if (header.typ === "JWT" || opts.json)
        payload = JSON.parse(payload, opts.encoding);
      return {
        header,
        payload,
        signature: signatureFromJWS(jwsSig)
      };
    }
    function VerifyStream(opts) {
      opts = opts || {};
      var secretOrKey = opts.secret;
      secretOrKey = secretOrKey == null ? opts.publicKey : secretOrKey;
      secretOrKey = secretOrKey == null ? opts.key : secretOrKey;
      if (/^hs/i.test(opts.algorithm) === true && secretOrKey == null) {
        throw new TypeError("secret must be a string or buffer or a KeyObject");
      }
      var secretStream = new DataStream(secretOrKey);
      this.readable = true;
      this.algorithm = opts.algorithm;
      this.encoding = opts.encoding;
      this.secret = this.publicKey = this.key = secretStream;
      this.signature = new DataStream(opts.signature);
      this.secret.once("close", function() {
        if (!this.signature.writable && this.readable)
          this.verify();
      }.bind(this));
      this.signature.once("close", function() {
        if (!this.secret.writable && this.readable)
          this.verify();
      }.bind(this));
    }
    util.inherits(VerifyStream, Stream);
    VerifyStream.prototype.verify = function verify() {
      try {
        var valid = jwsVerify(this.signature.buffer, this.algorithm, this.key.buffer);
        var obj = jwsDecode(this.signature.buffer, this.encoding);
        this.emit("done", valid, obj);
        this.emit("data", valid);
        this.emit("end");
        this.readable = false;
        return valid;
      } catch (e) {
        this.readable = false;
        this.emit("error", e);
        this.emit("close");
      }
    };
    VerifyStream.decode = jwsDecode;
    VerifyStream.isValid = isValidJws;
    VerifyStream.verify = jwsVerify;
    module.exports = VerifyStream;
  }
});

// node_modules/jws/index.js
var require_jws = __commonJS({
  "node_modules/jws/index.js"(exports) {
    var SignStream = require_sign_stream();
    var VerifyStream = require_verify_stream();
    var ALGORITHMS = [
      "HS256",
      "HS384",
      "HS512",
      "RS256",
      "RS384",
      "RS512",
      "PS256",
      "PS384",
      "PS512",
      "ES256",
      "ES384",
      "ES512"
    ];
    exports.ALGORITHMS = ALGORITHMS;
    exports.sign = SignStream.sign;
    exports.verify = VerifyStream.verify;
    exports.decode = VerifyStream.decode;
    exports.isValid = VerifyStream.isValid;
    exports.createSign = function createSign(opts) {
      return new SignStream(opts);
    };
    exports.createVerify = function createVerify(opts) {
      return new VerifyStream(opts);
    };
  }
});

// node_modules/web-push/src/web-push-constants.js
var require_web_push_constants = __commonJS({
  "node_modules/web-push/src/web-push-constants.js"(exports, module) {
    "use strict";
    var WebPushConstants = {};
    WebPushConstants.supportedContentEncodings = {
      AES_GCM: "aesgcm",
      AES_128_GCM: "aes128gcm"
    };
    WebPushConstants.supportedUrgency = {
      VERY_LOW: "very-low",
      LOW: "low",
      NORMAL: "normal",
      HIGH: "high"
    };
    module.exports = WebPushConstants;
  }
});

// node_modules/web-push/src/urlsafe-base64-helper.js
var require_urlsafe_base64_helper = __commonJS({
  "node_modules/web-push/src/urlsafe-base64-helper.js"(exports, module) {
    "use strict";
    function validate(base64) {
      return /^[A-Za-z0-9\-_]+$/.test(base64);
    }
    module.exports = {
      validate
    };
  }
});

// node_modules/web-push/src/vapid-helper.js
var require_vapid_helper = __commonJS({
  "node_modules/web-push/src/vapid-helper.js"(exports, module) {
    "use strict";
    var crypto = __require("crypto");
    var asn1 = require_asn1();
    var jws = require_jws();
    var { URL: URL2 } = __require("url");
    var WebPushConstants = require_web_push_constants();
    var urlBase64Helper = require_urlsafe_base64_helper();
    var DEFAULT_EXPIRATION_SECONDS = 12 * 60 * 60;
    var MAX_EXPIRATION_SECONDS = 24 * 60 * 60;
    var ECPrivateKeyASN = asn1.define("ECPrivateKey", function() {
      this.seq().obj(
        this.key("version").int(),
        this.key("privateKey").octstr(),
        this.key("parameters").explicit(0).objid().optional(),
        this.key("publicKey").explicit(1).bitstr().optional()
      );
    });
    function toPEM(key) {
      return ECPrivateKeyASN.encode({
        version: 1,
        privateKey: key,
        parameters: [1, 2, 840, 10045, 3, 1, 7]
        // prime256v1
      }, "pem", {
        label: "EC PRIVATE KEY"
      });
    }
    function generateVAPIDKeys() {
      const curve = crypto.createECDH("prime256v1");
      curve.generateKeys();
      let publicKeyBuffer = curve.getPublicKey();
      let privateKeyBuffer = curve.getPrivateKey();
      if (privateKeyBuffer.length < 32) {
        const padding = Buffer.alloc(32 - privateKeyBuffer.length);
        padding.fill(0);
        privateKeyBuffer = Buffer.concat([padding, privateKeyBuffer]);
      }
      if (publicKeyBuffer.length < 65) {
        const padding = Buffer.alloc(65 - publicKeyBuffer.length);
        padding.fill(0);
        publicKeyBuffer = Buffer.concat([padding, publicKeyBuffer]);
      }
      return {
        publicKey: publicKeyBuffer.toString("base64url"),
        privateKey: privateKeyBuffer.toString("base64url")
      };
    }
    function validateSubject(subject) {
      if (!subject) {
        throw new Error("No subject set in vapidDetails.subject.");
      }
      if (typeof subject !== "string" || subject.length === 0) {
        throw new Error("The subject value must be a string containing an https: URL or mailto: address. " + subject);
      }
      let subjectParseResult = null;
      try {
        subjectParseResult = new URL2(subject);
      } catch (err) {
        throw new Error("Vapid subject is not a valid URL. " + subject);
      }
      if (!["https:", "mailto:"].includes(subjectParseResult.protocol)) {
        throw new Error("Vapid subject is not an https: or mailto: URL. " + subject);
      }
      if (subjectParseResult.hostname === "localhost") {
        console.warn("Vapid subject points to a localhost web URI, which is unsupported by Apple's push notification server and will result in a BadJwtToken error when sending notifications.");
      }
    }
    function validatePublicKey(publicKey) {
      if (!publicKey) {
        throw new Error("No key set vapidDetails.publicKey");
      }
      if (typeof publicKey !== "string") {
        throw new Error("Vapid public key is must be a URL safe Base 64 encoded string.");
      }
      if (!urlBase64Helper.validate(publicKey)) {
        throw new Error('Vapid public key must be a URL safe Base 64 (without "=")');
      }
      publicKey = Buffer.from(publicKey, "base64url");
      if (publicKey.length !== 65) {
        throw new Error("Vapid public key should be 65 bytes long when decoded.");
      }
    }
    function validatePrivateKey(privateKey) {
      if (!privateKey) {
        throw new Error("No key set in vapidDetails.privateKey");
      }
      if (typeof privateKey !== "string") {
        throw new Error("Vapid private key must be a URL safe Base 64 encoded string.");
      }
      if (!urlBase64Helper.validate(privateKey)) {
        throw new Error('Vapid private key must be a URL safe Base 64 (without "=")');
      }
      privateKey = Buffer.from(privateKey, "base64url");
      if (privateKey.length !== 32) {
        throw new Error("Vapid private key should be 32 bytes long when decoded.");
      }
    }
    function getFutureExpirationTimestamp(numSeconds) {
      const futureExp = /* @__PURE__ */ new Date();
      futureExp.setSeconds(futureExp.getSeconds() + numSeconds);
      return Math.floor(futureExp.getTime() / 1e3);
    }
    function validateExpiration(expiration) {
      if (!Number.isInteger(expiration)) {
        throw new Error("`expiration` value must be a number");
      }
      if (expiration < 0) {
        throw new Error("`expiration` must be a positive integer");
      }
      const maxExpirationTimestamp = getFutureExpirationTimestamp(MAX_EXPIRATION_SECONDS);
      if (expiration >= maxExpirationTimestamp) {
        throw new Error("`expiration` value is greater than maximum of 24 hours");
      }
    }
    function getVapidHeaders(audience, subject, publicKey, privateKey, contentEncoding, expiration) {
      if (!audience) {
        throw new Error("No audience could be generated for VAPID.");
      }
      if (typeof audience !== "string" || audience.length === 0) {
        throw new Error("The audience value must be a string containing the origin of a push service. " + audience);
      }
      try {
        new URL2(audience);
      } catch (err) {
        throw new Error("VAPID audience is not a url. " + audience);
      }
      validateSubject(subject);
      validatePublicKey(publicKey);
      validatePrivateKey(privateKey);
      privateKey = Buffer.from(privateKey, "base64url");
      if (expiration) {
        validateExpiration(expiration);
      } else {
        expiration = getFutureExpirationTimestamp(DEFAULT_EXPIRATION_SECONDS);
      }
      const header = {
        typ: "JWT",
        alg: "ES256"
      };
      const jwtPayload = {
        aud: audience,
        exp: expiration,
        sub: subject
      };
      const jwt = jws.sign({
        header,
        payload: jwtPayload,
        privateKey: toPEM(privateKey)
      });
      if (contentEncoding === WebPushConstants.supportedContentEncodings.AES_128_GCM) {
        return {
          Authorization: "vapid t=" + jwt + ", k=" + publicKey
        };
      }
      if (contentEncoding === WebPushConstants.supportedContentEncodings.AES_GCM) {
        return {
          Authorization: "WebPush " + jwt,
          "Crypto-Key": "p256ecdsa=" + publicKey
        };
      }
      throw new Error("Unsupported encoding type specified.");
    }
    module.exports = {
      generateVAPIDKeys,
      getFutureExpirationTimestamp,
      getVapidHeaders,
      validateSubject,
      validatePublicKey,
      validatePrivateKey,
      validateExpiration
    };
  }
});

// node_modules/http_ece/ece.js
var require_ece = __commonJS({
  "node_modules/http_ece/ece.js"(exports, module) {
    "use strict";
    var crypto = __require("crypto");
    var AES_GCM = "aes-128-gcm";
    var PAD_SIZE = { "aes128gcm": 1, "aesgcm": 2 };
    var TAG_LENGTH = 16;
    var KEY_LENGTH = 16;
    var NONCE_LENGTH = 12;
    var SHA_256_LENGTH = 32;
    var MODE_ENCRYPT = "encrypt";
    var MODE_DECRYPT = "decrypt";
    var keylog;
    if (process.env.ECE_KEYLOG === "1") {
      keylog = function(m, k) {
        console.warn(m + " [" + k.length + "]: " + k.toString("base64url"));
        return k;
      };
    } else {
      keylog = function(m, k) {
        return k;
      };
    }
    function decode(b) {
      if (typeof b === "string") {
        return Buffer.from(b, "base64url");
      }
      return b;
    }
    function HMAC_hash(key, input) {
      var hmac = crypto.createHmac("sha256", key);
      hmac.update(input);
      return hmac.digest();
    }
    function HKDF_extract(salt, ikm) {
      keylog("salt", salt);
      keylog("ikm", ikm);
      return keylog("extract", HMAC_hash(salt, ikm));
    }
    function HKDF_expand(prk, info2, l) {
      keylog("prk", prk);
      keylog("info", info2);
      var output = Buffer.alloc(0);
      var T = Buffer.alloc(0);
      info2 = Buffer.from(info2, "ascii");
      var counter = 0;
      var cbuf = Buffer.alloc(1);
      while (output.length < l) {
        cbuf.writeUIntBE(++counter, 0, 1);
        T = HMAC_hash(prk, Buffer.concat([T, info2, cbuf]));
        output = Buffer.concat([output, T]);
      }
      return keylog("expand", output.slice(0, l));
    }
    function HKDF(salt, ikm, info2, len) {
      return HKDF_expand(HKDF_extract(salt, ikm), info2, len);
    }
    function info(base, context) {
      var result = Buffer.concat([
        Buffer.from("Content-Encoding: " + base + "\0", "ascii"),
        context
      ]);
      keylog("info " + base, result);
      return result;
    }
    function lengthPrefix(buffer) {
      var b = Buffer.concat([Buffer.alloc(2), buffer]);
      b.writeUIntBE(buffer.length, 0, 2);
      return b;
    }
    function extractDH(header, mode) {
      var key = header.privateKey;
      var senderPubKey, receiverPubKey;
      if (mode === MODE_ENCRYPT) {
        senderPubKey = key.getPublicKey();
        receiverPubKey = header.dh;
      } else if (mode === MODE_DECRYPT) {
        senderPubKey = header.dh;
        receiverPubKey = key.getPublicKey();
      } else {
        throw new Error("Unknown mode only " + MODE_ENCRYPT + " and " + MODE_DECRYPT + " supported");
      }
      return {
        secret: key.computeSecret(header.dh),
        context: Buffer.concat([
          Buffer.from(header.keylabel, "ascii"),
          Buffer.from([0]),
          lengthPrefix(receiverPubKey),
          // user agent
          lengthPrefix(senderPubKey)
          // application server
        ])
      };
    }
    function extractSecretAndContext(header, mode) {
      var result = { secret: null, context: Buffer.alloc(0) };
      if (header.key) {
        result.secret = header.key;
        if (result.secret.length !== KEY_LENGTH) {
          throw new Error("An explicit key must be " + KEY_LENGTH + " bytes");
        }
      } else if (header.dh) {
        result = extractDH(header, mode);
      } else if (typeof header.keyid !== void 0) {
        result.secret = header.keymap[header.keyid];
      }
      if (!result.secret) {
        throw new Error("Unable to determine key");
      }
      keylog("secret", result.secret);
      keylog("context", result.context);
      if (header.authSecret) {
        result.secret = HKDF(
          header.authSecret,
          result.secret,
          info("auth", Buffer.alloc(0)),
          SHA_256_LENGTH
        );
        keylog("authsecret", result.secret);
      }
      return result;
    }
    function webpushSecret(header, mode) {
      if (!header.authSecret) {
        throw new Error("No authentication secret for webpush");
      }
      keylog("authsecret", header.authSecret);
      var remotePubKey, senderPubKey, receiverPubKey;
      if (mode === MODE_ENCRYPT) {
        senderPubKey = header.privateKey.getPublicKey();
        remotePubKey = receiverPubKey = header.dh;
      } else if (mode === MODE_DECRYPT) {
        remotePubKey = senderPubKey = header.keyid;
        receiverPubKey = header.privateKey.getPublicKey();
      } else {
        throw new Error("Unknown mode only " + MODE_ENCRYPT + " and " + MODE_DECRYPT + " supported");
      }
      keylog("remote pubkey", remotePubKey);
      keylog("sender pubkey", senderPubKey);
      keylog("receiver pubkey", receiverPubKey);
      return keylog(
        "secret dh",
        HKDF(
          header.authSecret,
          header.privateKey.computeSecret(remotePubKey),
          Buffer.concat([
            Buffer.from("WebPush: info\0"),
            receiverPubKey,
            senderPubKey
          ]),
          SHA_256_LENGTH
        )
      );
    }
    function extractSecret(header, mode, keyLookupCallback) {
      if (keyLookupCallback) {
        if (!isFunction(keyLookupCallback)) {
          throw new Error("Callback is not a function");
        }
      }
      if (header.key) {
        if (header.key.length !== KEY_LENGTH) {
          throw new Error("An explicit key must be " + KEY_LENGTH + " bytes");
        }
        return keylog("secret key", header.key);
      }
      if (!header.privateKey) {
        if (!keyLookupCallback) {
          var key = header.keymap && header.keymap[header.keyid];
        } else {
          var key = keyLookupCallback(header.keyid);
        }
        if (!key) {
          throw new Error('No saved key (keyid: "' + header.keyid + '")');
        }
        return key;
      }
      return webpushSecret(header, mode);
    }
    function deriveKeyAndNonce(header, mode, lookupKeyCallback) {
      if (!header.salt) {
        throw new Error("must include a salt parameter for " + header.version);
      }
      var keyInfo;
      var nonceInfo;
      var secret2;
      if (header.version === "aesgcm") {
        var s = extractSecretAndContext(header, mode, lookupKeyCallback);
        keyInfo = info("aesgcm", s.context);
        nonceInfo = info("nonce", s.context);
        secret2 = s.secret;
      } else if (header.version === "aes128gcm") {
        keyInfo = Buffer.from("Content-Encoding: aes128gcm\0");
        nonceInfo = Buffer.from("Content-Encoding: nonce\0");
        secret2 = extractSecret(header, mode, lookupKeyCallback);
      } else {
        throw new Error("Unable to set context for mode " + header.version);
      }
      var prk = HKDF_extract(header.salt, secret2);
      var result = {
        key: HKDF_expand(prk, keyInfo, KEY_LENGTH),
        nonce: HKDF_expand(prk, nonceInfo, NONCE_LENGTH)
      };
      keylog("key", result.key);
      keylog("nonce base", result.nonce);
      return result;
    }
    function parseParams(params) {
      var header = {};
      header.version = params.version || "aes128gcm";
      header.rs = parseInt(params.rs, 10);
      if (isNaN(header.rs)) {
        header.rs = 4096;
      }
      var overhead = PAD_SIZE[header.version];
      if (header.version === "aes128gcm") {
        overhead += TAG_LENGTH;
      }
      if (header.rs <= overhead) {
        throw new Error("The rs parameter has to be greater than " + overhead);
      }
      if (params.salt) {
        header.salt = decode(params.salt);
        if (header.salt.length !== KEY_LENGTH) {
          throw new Error("The salt parameter must be " + KEY_LENGTH + " bytes");
        }
      }
      header.keyid = params.keyid;
      if (params.key) {
        header.key = decode(params.key);
      } else {
        header.privateKey = params.privateKey;
        if (!header.privateKey) {
          header.keymap = params.keymap;
        }
        if (header.version !== "aes128gcm") {
          header.keylabel = params.keylabel || "P-256";
        }
        if (params.dh) {
          header.dh = decode(params.dh);
        }
      }
      if (params.authSecret) {
        header.authSecret = decode(params.authSecret);
      }
      return header;
    }
    function generateNonce(base, counter) {
      var nonce = Buffer.from(base);
      var m = nonce.readUIntBE(nonce.length - 6, 6);
      var x = ((m ^ counter) & 16777215) + ((m / 16777216 ^ counter / 16777216) & 16777215) * 16777216;
      nonce.writeUIntBE(x, nonce.length - 6, 6);
      keylog("nonce" + counter, nonce);
      return nonce;
    }
    function readHeader(buffer, header) {
      var idsz = buffer.readUIntBE(20, 1);
      header.salt = buffer.slice(0, KEY_LENGTH);
      header.rs = buffer.readUIntBE(KEY_LENGTH, 4);
      header.keyid = buffer.slice(21, 21 + idsz);
      return 21 + idsz;
    }
    function unpadLegacy(data, version) {
      var padSize = PAD_SIZE[version];
      var pad = data.readUIntBE(0, padSize);
      if (pad + padSize > data.length) {
        throw new Error("padding exceeds block size");
      }
      keylog("padding", data.slice(0, padSize + pad));
      var padCheck = Buffer.alloc(pad);
      padCheck.fill(0);
      if (padCheck.compare(data.slice(padSize, padSize + pad)) !== 0) {
        throw new Error("invalid padding");
      }
      return data.slice(padSize + pad);
    }
    function unpad(data, last) {
      var i = data.length - 1;
      while (i >= 0) {
        if (data[i]) {
          if (last) {
            if (data[i] !== 2) {
              throw new Error("last record needs to start padding with a 2");
            }
          } else {
            if (data[i] !== 1) {
              throw new Error("last record needs to start padding with a 2");
            }
          }
          return data.slice(0, i);
        }
        --i;
      }
      throw new Error("all zero plaintext");
    }
    function decryptRecord(key, counter, buffer, header, last) {
      keylog("decrypt", buffer);
      var nonce = generateNonce(key.nonce, counter);
      var gcm = crypto.createDecipheriv(AES_GCM, key.key, nonce);
      gcm.setAuthTag(buffer.slice(buffer.length - TAG_LENGTH));
      var data = gcm.update(buffer.slice(0, buffer.length - TAG_LENGTH));
      data = Buffer.concat([data, gcm.final()]);
      keylog("decrypted", data);
      if (header.version !== "aes128gcm") {
        return unpadLegacy(data, header.version);
      }
      return unpad(data, last);
    }
    function decrypt(buffer, params, keyLookupCallback) {
      var header = parseParams(params);
      if (header.version === "aes128gcm") {
        var headerLength = readHeader(buffer, header);
        buffer = buffer.slice(headerLength);
      }
      var key = deriveKeyAndNonce(header, MODE_DECRYPT, keyLookupCallback);
      var start = 0;
      var result = Buffer.alloc(0);
      var chunkSize = header.rs;
      if (header.version !== "aes128gcm") {
        chunkSize += TAG_LENGTH;
      }
      for (var i = 0; start < buffer.length; ++i) {
        var end = start + chunkSize;
        if (header.version !== "aes128gcm" && end === buffer.length) {
          throw new Error("Truncated payload");
        }
        end = Math.min(end, buffer.length);
        if (end - start <= TAG_LENGTH) {
          throw new Error("Invalid block: too small at " + i);
        }
        var block = decryptRecord(
          key,
          i,
          buffer.slice(start, end),
          header,
          end >= buffer.length
        );
        result = Buffer.concat([result, block]);
        start = end;
      }
      return result;
    }
    function encryptRecord(key, counter, buffer, pad, header, last) {
      keylog("encrypt", buffer);
      pad = pad || 0;
      var nonce = generateNonce(key.nonce, counter);
      var gcm = crypto.createCipheriv(AES_GCM, key.key, nonce);
      var ciphertext = [];
      var padSize = PAD_SIZE[header.version];
      var padding = Buffer.alloc(pad + padSize);
      padding.fill(0);
      if (header.version !== "aes128gcm") {
        padding.writeUIntBE(pad, 0, padSize);
        keylog("padding", padding);
        ciphertext.push(gcm.update(padding));
        ciphertext.push(gcm.update(buffer));
        if (!last && padding.length + buffer.length < header.rs) {
          throw new Error("Unable to pad to record size");
        }
      } else {
        ciphertext.push(gcm.update(buffer));
        padding.writeUIntBE(last ? 2 : 1, 0, 1);
        keylog("padding", padding);
        ciphertext.push(gcm.update(padding));
      }
      gcm.final();
      var tag = gcm.getAuthTag();
      if (tag.length !== TAG_LENGTH) {
        throw new Error("invalid tag generated");
      }
      ciphertext.push(tag);
      return keylog("encrypted", Buffer.concat(ciphertext));
    }
    function writeHeader(header) {
      var ints = Buffer.alloc(5);
      var keyid = Buffer.from(header.keyid || []);
      if (keyid.length > 255) {
        throw new Error("keyid is too large");
      }
      ints.writeUIntBE(header.rs, 0, 4);
      ints.writeUIntBE(keyid.length, 4, 1);
      return Buffer.concat([header.salt, ints, keyid]);
    }
    function encrypt(buffer, params, keyLookupCallback) {
      if (!Buffer.isBuffer(buffer)) {
        throw new Error("buffer argument must be a Buffer");
      }
      var header = parseParams(params);
      if (!header.salt) {
        header.salt = crypto.randomBytes(KEY_LENGTH);
      }
      var result;
      if (header.version === "aes128gcm") {
        if (header.privateKey && !header.keyid) {
          header.keyid = header.privateKey.getPublicKey();
        }
        result = writeHeader(header);
      } else {
        result = Buffer.alloc(0);
      }
      var key = deriveKeyAndNonce(header, MODE_ENCRYPT, keyLookupCallback);
      var start = 0;
      var padSize = PAD_SIZE[header.version];
      var overhead = padSize;
      if (header.version === "aes128gcm") {
        overhead += TAG_LENGTH;
      }
      var pad = isNaN(parseInt(params.pad, 10)) ? 0 : parseInt(params.pad, 10);
      var counter = 0;
      var last = false;
      while (!last) {
        var recordPad = Math.min(header.rs - overhead - 1, pad);
        if (header.version !== "aes128gcm") {
          recordPad = Math.min((1 << padSize * 8) - 1, recordPad);
        }
        if (pad > 0 && recordPad === 0) {
          ++recordPad;
        }
        pad -= recordPad;
        var end = start + header.rs - overhead - recordPad;
        if (header.version !== "aes128gcm") {
          last = end > buffer.length;
        } else {
          last = end >= buffer.length;
        }
        last = last && pad <= 0;
        var block = encryptRecord(
          key,
          counter,
          buffer.slice(start, end),
          recordPad,
          header,
          last
        );
        result = Buffer.concat([result, block]);
        start = end;
        ++counter;
      }
      return result;
    }
    function isFunction(object) {
      return typeof object === "function";
    }
    module.exports = {
      decrypt,
      encrypt
    };
  }
});

// node_modules/web-push/src/encryption-helper.js
var require_encryption_helper = __commonJS({
  "node_modules/web-push/src/encryption-helper.js"(exports, module) {
    "use strict";
    var crypto = __require("crypto");
    var ece = require_ece();
    var encrypt = function(userPublicKey, userAuth, payload, contentEncoding) {
      if (!userPublicKey) {
        throw new Error("No user public key provided for encryption.");
      }
      if (typeof userPublicKey !== "string") {
        throw new Error("The subscription p256dh value must be a string.");
      }
      if (Buffer.from(userPublicKey, "base64url").length !== 65) {
        throw new Error("The subscription p256dh value should be 65 bytes long.");
      }
      if (!userAuth) {
        throw new Error("No user auth provided for encryption.");
      }
      if (typeof userAuth !== "string") {
        throw new Error("The subscription auth key must be a string.");
      }
      if (Buffer.from(userAuth, "base64url").length < 16) {
        throw new Error("The subscription auth key should be at least 16 bytes long");
      }
      if (typeof payload !== "string" && !Buffer.isBuffer(payload)) {
        throw new Error("Payload must be either a string or a Node Buffer.");
      }
      if (typeof payload === "string" || payload instanceof String) {
        payload = Buffer.from(payload);
      }
      const localCurve = crypto.createECDH("prime256v1");
      const localPublicKey = localCurve.generateKeys();
      const salt = crypto.randomBytes(16).toString("base64url");
      const cipherText = ece.encrypt(payload, {
        version: contentEncoding,
        dh: userPublicKey,
        privateKey: localCurve,
        salt,
        authSecret: userAuth
      });
      return {
        localPublicKey,
        salt,
        cipherText
      };
    };
    module.exports = {
      encrypt
    };
  }
});

// node_modules/web-push/src/web-push-error.js
var require_web_push_error = __commonJS({
  "node_modules/web-push/src/web-push-error.js"(exports, module) {
    "use strict";
    function WebPushError(message, statusCode, headers, body, endpoint) {
      Error.captureStackTrace(this, this.constructor);
      this.name = this.constructor.name;
      this.message = message;
      this.statusCode = statusCode;
      this.headers = headers;
      this.body = body;
      this.endpoint = endpoint;
    }
    __require("util").inherits(WebPushError, Error);
    module.exports = WebPushError;
  }
});

// node_modules/ms/index.js
var require_ms = __commonJS({
  "node_modules/ms/index.js"(exports, module) {
    var s = 1e3;
    var m = s * 60;
    var h = m * 60;
    var d = h * 24;
    var w = d * 7;
    var y = d * 365.25;
    module.exports = function(val, options) {
      options = options || {};
      var type = typeof val;
      if (type === "string" && val.length > 0) {
        return parse(val);
      } else if (type === "number" && isFinite(val)) {
        return options.long ? fmtLong(val) : fmtShort(val);
      }
      throw new Error(
        "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
      );
    };
    function parse(str) {
      str = String(str);
      if (str.length > 100) {
        return;
      }
      var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        str
      );
      if (!match) {
        return;
      }
      var n = parseFloat(match[1]);
      var type = (match[2] || "ms").toLowerCase();
      switch (type) {
        case "years":
        case "year":
        case "yrs":
        case "yr":
        case "y":
          return n * y;
        case "weeks":
        case "week":
        case "w":
          return n * w;
        case "days":
        case "day":
        case "d":
          return n * d;
        case "hours":
        case "hour":
        case "hrs":
        case "hr":
        case "h":
          return n * h;
        case "minutes":
        case "minute":
        case "mins":
        case "min":
        case "m":
          return n * m;
        case "seconds":
        case "second":
        case "secs":
        case "sec":
        case "s":
          return n * s;
        case "milliseconds":
        case "millisecond":
        case "msecs":
        case "msec":
        case "ms":
          return n;
        default:
          return void 0;
      }
    }
    function fmtShort(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return Math.round(ms / d) + "d";
      }
      if (msAbs >= h) {
        return Math.round(ms / h) + "h";
      }
      if (msAbs >= m) {
        return Math.round(ms / m) + "m";
      }
      if (msAbs >= s) {
        return Math.round(ms / s) + "s";
      }
      return ms + "ms";
    }
    function fmtLong(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return plural(ms, msAbs, d, "day");
      }
      if (msAbs >= h) {
        return plural(ms, msAbs, h, "hour");
      }
      if (msAbs >= m) {
        return plural(ms, msAbs, m, "minute");
      }
      if (msAbs >= s) {
        return plural(ms, msAbs, s, "second");
      }
      return ms + " ms";
    }
    function plural(ms, msAbs, n, name) {
      var isPlural = msAbs >= n * 1.5;
      return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
    }
  }
});

// node_modules/debug/src/common.js
var require_common = __commonJS({
  "node_modules/debug/src/common.js"(exports, module) {
    function setup(env) {
      createDebug.debug = createDebug;
      createDebug.default = createDebug;
      createDebug.coerce = coerce;
      createDebug.disable = disable;
      createDebug.enable = enable;
      createDebug.enabled = enabled;
      createDebug.humanize = require_ms();
      createDebug.destroy = destroy;
      Object.keys(env).forEach((key) => {
        createDebug[key] = env[key];
      });
      createDebug.names = [];
      createDebug.skips = [];
      createDebug.formatters = {};
      function selectColor(namespace) {
        let hash = 0;
        for (let i = 0; i < namespace.length; i++) {
          hash = (hash << 5) - hash + namespace.charCodeAt(i);
          hash |= 0;
        }
        return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
      }
      createDebug.selectColor = selectColor;
      function createDebug(namespace) {
        let prevTime;
        let enableOverride = null;
        let namespacesCache;
        let enabledCache;
        function debug(...args) {
          if (!debug.enabled) {
            return;
          }
          const self = debug;
          const curr = Number(/* @__PURE__ */ new Date());
          const ms = curr - (prevTime || curr);
          self.diff = ms;
          self.prev = prevTime;
          self.curr = curr;
          prevTime = curr;
          args[0] = createDebug.coerce(args[0]);
          if (typeof args[0] !== "string") {
            args.unshift("%O");
          }
          let index2 = 0;
          args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
            if (match === "%%") {
              return "%";
            }
            index2++;
            const formatter = createDebug.formatters[format];
            if (typeof formatter === "function") {
              const val = args[index2];
              match = formatter.call(self, val);
              args.splice(index2, 1);
              index2--;
            }
            return match;
          });
          createDebug.formatArgs.call(self, args);
          const logFn = self.log || createDebug.log;
          logFn.apply(self, args);
        }
        debug.namespace = namespace;
        debug.useColors = createDebug.useColors();
        debug.color = createDebug.selectColor(namespace);
        debug.extend = extend;
        debug.destroy = createDebug.destroy;
        Object.defineProperty(debug, "enabled", {
          enumerable: true,
          configurable: false,
          get: () => {
            if (enableOverride !== null) {
              return enableOverride;
            }
            if (namespacesCache !== createDebug.namespaces) {
              namespacesCache = createDebug.namespaces;
              enabledCache = createDebug.enabled(namespace);
            }
            return enabledCache;
          },
          set: (v) => {
            enableOverride = v;
          }
        });
        if (typeof createDebug.init === "function") {
          createDebug.init(debug);
        }
        return debug;
      }
      function extend(namespace, delimiter) {
        const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
        newDebug.log = this.log;
        return newDebug;
      }
      function enable(namespaces) {
        createDebug.save(namespaces);
        createDebug.namespaces = namespaces;
        createDebug.names = [];
        createDebug.skips = [];
        const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
        for (const ns of split) {
          if (ns[0] === "-") {
            createDebug.skips.push(ns.slice(1));
          } else {
            createDebug.names.push(ns);
          }
        }
      }
      function matchesTemplate(search, template) {
        let searchIndex = 0;
        let templateIndex = 0;
        let starIndex = -1;
        let matchIndex = 0;
        while (searchIndex < search.length) {
          if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
            if (template[templateIndex] === "*") {
              starIndex = templateIndex;
              matchIndex = searchIndex;
              templateIndex++;
            } else {
              searchIndex++;
              templateIndex++;
            }
          } else if (starIndex !== -1) {
            templateIndex = starIndex + 1;
            matchIndex++;
            searchIndex = matchIndex;
          } else {
            return false;
          }
        }
        while (templateIndex < template.length && template[templateIndex] === "*") {
          templateIndex++;
        }
        return templateIndex === template.length;
      }
      function disable() {
        const namespaces = [
          ...createDebug.names,
          ...createDebug.skips.map((namespace) => "-" + namespace)
        ].join(",");
        createDebug.enable("");
        return namespaces;
      }
      function enabled(name) {
        for (const skip of createDebug.skips) {
          if (matchesTemplate(name, skip)) {
            return false;
          }
        }
        for (const ns of createDebug.names) {
          if (matchesTemplate(name, ns)) {
            return true;
          }
        }
        return false;
      }
      function coerce(val) {
        if (val instanceof Error) {
          return val.stack || val.message;
        }
        return val;
      }
      function destroy() {
        console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
      }
      createDebug.enable(createDebug.load());
      return createDebug;
    }
    module.exports = setup;
  }
});

// node_modules/debug/src/browser.js
var require_browser = __commonJS({
  "node_modules/debug/src/browser.js"(exports, module) {
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.storage = localstorage();
    exports.destroy = /* @__PURE__ */ (() => {
      let warned = false;
      return () => {
        if (!warned) {
          warned = true;
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
      };
    })();
    exports.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function useColors() {
      if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
        return true;
      }
      if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false;
      }
      let m;
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function formatArgs(args) {
      args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
      if (!this.useColors) {
        return;
      }
      const c = "color: " + this.color;
      args.splice(1, 0, c, "color: inherit");
      let index2 = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index2++;
        if (match === "%c") {
          lastC = index2;
        }
      });
      args.splice(lastC, 0, c);
    }
    exports.log = console.debug || console.log || (() => {
    });
    function save(namespaces) {
      try {
        if (namespaces) {
          exports.storage.setItem("debug", namespaces);
        } else {
          exports.storage.removeItem("debug");
        }
      } catch (error) {
      }
    }
    function load() {
      let r;
      try {
        r = exports.storage.getItem("debug") || exports.storage.getItem("DEBUG");
      } catch (error) {
      }
      if (!r && typeof process !== "undefined" && "env" in process) {
        r = process.env.DEBUG;
      }
      return r;
    }
    function localstorage() {
      try {
        return localStorage;
      } catch (error) {
      }
    }
    module.exports = require_common()(exports);
    var { formatters } = module.exports;
    formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (error) {
        return "[UnexpectedJSONParseError]: " + error.message;
      }
    };
  }
});

// node_modules/debug/src/node.js
var require_node2 = __commonJS({
  "node_modules/debug/src/node.js"(exports, module) {
    var tty = __require("tty");
    var util = __require("util");
    exports.init = init;
    exports.log = log;
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.destroy = util.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    );
    exports.colors = [6, 2, 3, 4, 5, 1];
    try {
      const supportsColor = __require("supports-color");
      if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
        exports.colors = [
          20,
          21,
          26,
          27,
          32,
          33,
          38,
          39,
          40,
          41,
          42,
          43,
          44,
          45,
          56,
          57,
          62,
          63,
          68,
          69,
          74,
          75,
          76,
          77,
          78,
          79,
          80,
          81,
          92,
          93,
          98,
          99,
          112,
          113,
          128,
          129,
          134,
          135,
          148,
          149,
          160,
          161,
          162,
          163,
          164,
          165,
          166,
          167,
          168,
          169,
          170,
          171,
          172,
          173,
          178,
          179,
          184,
          185,
          196,
          197,
          198,
          199,
          200,
          201,
          202,
          203,
          204,
          205,
          206,
          207,
          208,
          209,
          214,
          215,
          220,
          221
        ];
      }
    } catch (error) {
    }
    exports.inspectOpts = Object.keys(process.env).filter((key) => {
      return /^debug_/i.test(key);
    }).reduce((obj, key) => {
      const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
        return k.toUpperCase();
      });
      let val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) {
        val = true;
      } else if (/^(no|off|false|disabled)$/i.test(val)) {
        val = false;
      } else if (val === "null") {
        val = null;
      } else {
        val = Number(val);
      }
      obj[prop] = val;
      return obj;
    }, {});
    function useColors() {
      return "colors" in exports.inspectOpts ? Boolean(exports.inspectOpts.colors) : tty.isatty(process.stderr.fd);
    }
    function formatArgs(args) {
      const { namespace: name, useColors: useColors2 } = this;
      if (useColors2) {
        const c = this.color;
        const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
        const prefix = `  ${colorCode};1m${name} \x1B[0m`;
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push(colorCode + "m+" + module.exports.humanize(this.diff) + "\x1B[0m");
      } else {
        args[0] = getDate() + name + " " + args[0];
      }
    }
    function getDate() {
      if (exports.inspectOpts.hideDate) {
        return "";
      }
      return (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function log(...args) {
      return process.stderr.write(util.formatWithOptions(exports.inspectOpts, ...args) + "\n");
    }
    function save(namespaces) {
      if (namespaces) {
        process.env.DEBUG = namespaces;
      } else {
        delete process.env.DEBUG;
      }
    }
    function load() {
      return process.env.DEBUG;
    }
    function init(debug) {
      debug.inspectOpts = {};
      const keys = Object.keys(exports.inspectOpts);
      for (let i = 0; i < keys.length; i++) {
        debug.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
      }
    }
    module.exports = require_common()(exports);
    var { formatters } = module.exports;
    formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
    };
    formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts);
    };
  }
});

// node_modules/debug/src/index.js
var require_src = __commonJS({
  "node_modules/debug/src/index.js"(exports, module) {
    if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
      module.exports = require_browser();
    } else {
      module.exports = require_node2();
    }
  }
});

// node_modules/agent-base/dist/helpers.js
var require_helpers = __commonJS({
  "node_modules/agent-base/dist/helpers.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports && exports.__importStar || function(mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.req = exports.json = exports.toBuffer = void 0;
    var http = __importStar(__require("http"));
    var https = __importStar(__require("https"));
    async function toBuffer(stream) {
      let length = 0;
      const chunks = [];
      for await (const chunk of stream) {
        length += chunk.length;
        chunks.push(chunk);
      }
      return Buffer.concat(chunks, length);
    }
    exports.toBuffer = toBuffer;
    async function json2(stream) {
      const buf = await toBuffer(stream);
      const str = buf.toString("utf8");
      try {
        return JSON.parse(str);
      } catch (_err) {
        const err = _err;
        err.message += ` (input: ${str})`;
        throw err;
      }
    }
    exports.json = json2;
    function req(url, opts = {}) {
      const href = typeof url === "string" ? url : url.href;
      const req2 = (href.startsWith("https:") ? https : http).request(url, opts);
      const promise = new Promise((resolve, reject) => {
        req2.once("response", resolve).once("error", reject).end();
      });
      req2.then = promise.then.bind(promise);
      return req2;
    }
    exports.req = req;
  }
});

// node_modules/agent-base/dist/index.js
var require_dist = __commonJS({
  "node_modules/agent-base/dist/index.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports && exports.__importStar || function(mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Agent = void 0;
    var net = __importStar(__require("net"));
    var http = __importStar(__require("http"));
    var https_1 = __require("https");
    __exportStar(require_helpers(), exports);
    var INTERNAL = /* @__PURE__ */ Symbol("AgentBaseInternalState");
    var Agent = class extends http.Agent {
      constructor(opts) {
        super(opts);
        this[INTERNAL] = {};
      }
      /**
       * Determine whether this is an `http` or `https` request.
       */
      isSecureEndpoint(options) {
        if (options) {
          if (typeof options.secureEndpoint === "boolean") {
            return options.secureEndpoint;
          }
          if (typeof options.protocol === "string") {
            return options.protocol === "https:";
          }
        }
        const { stack } = new Error();
        if (typeof stack !== "string")
          return false;
        return stack.split("\n").some((l) => l.indexOf("(https.js:") !== -1 || l.indexOf("node:https:") !== -1);
      }
      // In order to support async signatures in `connect()` and Node's native
      // connection pooling in `http.Agent`, the array of sockets for each origin
      // has to be updated synchronously. This is so the length of the array is
      // accurate when `addRequest()` is next called. We achieve this by creating a
      // fake socket and adding it to `sockets[origin]` and incrementing
      // `totalSocketCount`.
      incrementSockets(name) {
        if (this.maxSockets === Infinity && this.maxTotalSockets === Infinity) {
          return null;
        }
        if (!this.sockets[name]) {
          this.sockets[name] = [];
        }
        const fakeSocket = new net.Socket({ writable: false });
        this.sockets[name].push(fakeSocket);
        this.totalSocketCount++;
        return fakeSocket;
      }
      decrementSockets(name, socket) {
        if (!this.sockets[name] || socket === null) {
          return;
        }
        const sockets = this.sockets[name];
        const index2 = sockets.indexOf(socket);
        if (index2 !== -1) {
          sockets.splice(index2, 1);
          this.totalSocketCount--;
          if (sockets.length === 0) {
            delete this.sockets[name];
          }
        }
      }
      // In order to properly update the socket pool, we need to call `getName()` on
      // the core `https.Agent` if it is a secureEndpoint.
      getName(options) {
        const secureEndpoint = this.isSecureEndpoint(options);
        if (secureEndpoint) {
          return https_1.Agent.prototype.getName.call(this, options);
        }
        return super.getName(options);
      }
      createSocket(req, options, cb) {
        const connectOpts = {
          ...options,
          secureEndpoint: this.isSecureEndpoint(options)
        };
        const name = this.getName(connectOpts);
        const fakeSocket = this.incrementSockets(name);
        Promise.resolve().then(() => this.connect(req, connectOpts)).then((socket) => {
          this.decrementSockets(name, fakeSocket);
          if (socket instanceof http.Agent) {
            try {
              return socket.addRequest(req, connectOpts);
            } catch (err) {
              return cb(err);
            }
          }
          this[INTERNAL].currentSocket = socket;
          super.createSocket(req, options, cb);
        }, (err) => {
          this.decrementSockets(name, fakeSocket);
          cb(err);
        });
      }
      createConnection() {
        const socket = this[INTERNAL].currentSocket;
        this[INTERNAL].currentSocket = void 0;
        if (!socket) {
          throw new Error("No socket was returned in the `connect()` function");
        }
        return socket;
      }
      get defaultPort() {
        return this[INTERNAL].defaultPort ?? (this.protocol === "https:" ? 443 : 80);
      }
      set defaultPort(v) {
        if (this[INTERNAL]) {
          this[INTERNAL].defaultPort = v;
        }
      }
      get protocol() {
        return this[INTERNAL].protocol ?? (this.isSecureEndpoint() ? "https:" : "http:");
      }
      set protocol(v) {
        if (this[INTERNAL]) {
          this[INTERNAL].protocol = v;
        }
      }
    };
    exports.Agent = Agent;
  }
});

// node_modules/https-proxy-agent/dist/parse-proxy-response.js
var require_parse_proxy_response = __commonJS({
  "node_modules/https-proxy-agent/dist/parse-proxy-response.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.parseProxyResponse = void 0;
    var debug_1 = __importDefault(require_src());
    var debug = (0, debug_1.default)("https-proxy-agent:parse-proxy-response");
    function parseProxyResponse(socket) {
      return new Promise((resolve, reject) => {
        let buffersLength = 0;
        const buffers = [];
        function read() {
          const b = socket.read();
          if (b)
            ondata(b);
          else
            socket.once("readable", read);
        }
        function cleanup() {
          socket.removeListener("end", onend);
          socket.removeListener("error", onerror);
          socket.removeListener("readable", read);
        }
        function onend() {
          cleanup();
          debug("onend");
          reject(new Error("Proxy connection ended before receiving CONNECT response"));
        }
        function onerror(err) {
          cleanup();
          debug("onerror %o", err);
          reject(err);
        }
        function ondata(b) {
          buffers.push(b);
          buffersLength += b.length;
          const buffered = Buffer.concat(buffers, buffersLength);
          const endOfHeaders = buffered.indexOf("\r\n\r\n");
          if (endOfHeaders === -1) {
            debug("have not received end of HTTP headers yet...");
            read();
            return;
          }
          const headerParts = buffered.slice(0, endOfHeaders).toString("ascii").split("\r\n");
          const firstLine = headerParts.shift();
          if (!firstLine) {
            socket.destroy();
            return reject(new Error("No header received from proxy CONNECT response"));
          }
          const firstLineParts = firstLine.split(" ");
          const statusCode = +firstLineParts[1];
          const statusText = firstLineParts.slice(2).join(" ");
          const headers = {};
          for (const header of headerParts) {
            if (!header)
              continue;
            const firstColon = header.indexOf(":");
            if (firstColon === -1) {
              socket.destroy();
              return reject(new Error(`Invalid header from proxy CONNECT response: "${header}"`));
            }
            const key = header.slice(0, firstColon).toLowerCase();
            const value = header.slice(firstColon + 1).trimStart();
            const current = headers[key];
            if (typeof current === "string") {
              headers[key] = [current, value];
            } else if (Array.isArray(current)) {
              current.push(value);
            } else {
              headers[key] = value;
            }
          }
          debug("got proxy server response: %o %o", firstLine, headers);
          cleanup();
          resolve({
            connect: {
              statusCode,
              statusText,
              headers
            },
            buffered
          });
        }
        socket.on("error", onerror);
        socket.on("end", onend);
        read();
      });
    }
    exports.parseProxyResponse = parseProxyResponse;
  }
});

// node_modules/https-proxy-agent/dist/index.js
var require_dist2 = __commonJS({
  "node_modules/https-proxy-agent/dist/index.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports && exports.__importStar || function(mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.HttpsProxyAgent = void 0;
    var net = __importStar(__require("net"));
    var tls = __importStar(__require("tls"));
    var assert_1 = __importDefault(__require("assert"));
    var debug_1 = __importDefault(require_src());
    var agent_base_1 = require_dist();
    var url_1 = __require("url");
    var parse_proxy_response_1 = require_parse_proxy_response();
    var debug = (0, debug_1.default)("https-proxy-agent");
    var setServernameFromNonIpHost = (options) => {
      if (options.servername === void 0 && options.host && !net.isIP(options.host)) {
        return {
          ...options,
          servername: options.host
        };
      }
      return options;
    };
    var HttpsProxyAgent = class extends agent_base_1.Agent {
      constructor(proxy, opts) {
        super(opts);
        this.options = { path: void 0 };
        this.proxy = typeof proxy === "string" ? new url_1.URL(proxy) : proxy;
        this.proxyHeaders = opts?.headers ?? {};
        debug("Creating new HttpsProxyAgent instance: %o", this.proxy.href);
        const host = (this.proxy.hostname || this.proxy.host).replace(/^\[|\]$/g, "");
        const port = this.proxy.port ? parseInt(this.proxy.port, 10) : this.proxy.protocol === "https:" ? 443 : 80;
        this.connectOpts = {
          // Attempt to negotiate http/1.1 for proxy servers that support http/2
          ALPNProtocols: ["http/1.1"],
          ...opts ? omit(opts, "headers") : null,
          host,
          port
        };
      }
      /**
       * Called when the node-core HTTP client library is creating a
       * new HTTP request.
       */
      async connect(req, opts) {
        const { proxy } = this;
        if (!opts.host) {
          throw new TypeError('No "host" provided');
        }
        let socket;
        if (proxy.protocol === "https:") {
          debug("Creating `tls.Socket`: %o", this.connectOpts);
          socket = tls.connect(setServernameFromNonIpHost(this.connectOpts));
        } else {
          debug("Creating `net.Socket`: %o", this.connectOpts);
          socket = net.connect(this.connectOpts);
        }
        const headers = typeof this.proxyHeaders === "function" ? this.proxyHeaders() : { ...this.proxyHeaders };
        const host = net.isIPv6(opts.host) ? `[${opts.host}]` : opts.host;
        let payload = `CONNECT ${host}:${opts.port} HTTP/1.1\r
`;
        if (proxy.username || proxy.password) {
          const auth = `${decodeURIComponent(proxy.username)}:${decodeURIComponent(proxy.password)}`;
          headers["Proxy-Authorization"] = `Basic ${Buffer.from(auth).toString("base64")}`;
        }
        headers.Host = `${host}:${opts.port}`;
        if (!headers["Proxy-Connection"]) {
          headers["Proxy-Connection"] = this.keepAlive ? "Keep-Alive" : "close";
        }
        for (const name of Object.keys(headers)) {
          payload += `${name}: ${headers[name]}\r
`;
        }
        const proxyResponsePromise = (0, parse_proxy_response_1.parseProxyResponse)(socket);
        socket.write(`${payload}\r
`);
        const { connect, buffered } = await proxyResponsePromise;
        req.emit("proxyConnect", connect);
        this.emit("proxyConnect", connect, req);
        if (connect.statusCode === 200) {
          req.once("socket", resume);
          if (opts.secureEndpoint) {
            debug("Upgrading socket connection to TLS");
            return tls.connect({
              ...omit(setServernameFromNonIpHost(opts), "host", "path", "port"),
              socket
            });
          }
          return socket;
        }
        socket.destroy();
        const fakeSocket = new net.Socket({ writable: false });
        fakeSocket.readable = true;
        req.once("socket", (s) => {
          debug("Replaying proxy buffer for failed request");
          (0, assert_1.default)(s.listenerCount("data") > 0);
          s.push(buffered);
          s.push(null);
        });
        return fakeSocket;
      }
    };
    HttpsProxyAgent.protocols = ["http", "https"];
    exports.HttpsProxyAgent = HttpsProxyAgent;
    function resume(socket) {
      socket.resume();
    }
    function omit(obj, ...keys) {
      const ret = {};
      let key;
      for (key in obj) {
        if (!keys.includes(key)) {
          ret[key] = obj[key];
        }
      }
      return ret;
    }
  }
});

// node_modules/web-push/src/web-push-lib.js
var require_web_push_lib = __commonJS({
  "node_modules/web-push/src/web-push-lib.js"(exports, module) {
    "use strict";
    var url = __require("url");
    var https = __require("https");
    var WebPushError = require_web_push_error();
    var vapidHelper = require_vapid_helper();
    var encryptionHelper = require_encryption_helper();
    var webPushConstants = require_web_push_constants();
    var urlBase64Helper = require_urlsafe_base64_helper();
    var DEFAULT_TTL = 2419200;
    var gcmAPIKey = "";
    var vapidDetails;
    function WebPushLib() {
    }
    WebPushLib.prototype.setGCMAPIKey = function(apiKey) {
      if (apiKey === null) {
        gcmAPIKey = null;
        return;
      }
      if (typeof apiKey === "undefined" || typeof apiKey !== "string" || apiKey.length === 0) {
        throw new Error("The GCM API Key should be a non-empty string or null.");
      }
      gcmAPIKey = apiKey;
    };
    WebPushLib.prototype.setVapidDetails = function(subject, publicKey, privateKey) {
      if (arguments.length === 1 && arguments[0] === null) {
        vapidDetails = null;
        return;
      }
      vapidHelper.validateSubject(subject);
      vapidHelper.validatePublicKey(publicKey);
      vapidHelper.validatePrivateKey(privateKey);
      vapidDetails = {
        subject,
        publicKey,
        privateKey
      };
    };
    WebPushLib.prototype.generateRequestDetails = function(subscription, payload, options) {
      if (!subscription || !subscription.endpoint) {
        throw new Error("You must pass in a subscription with at least an endpoint.");
      }
      if (typeof subscription.endpoint !== "string" || subscription.endpoint.length === 0) {
        throw new Error("The subscription endpoint must be a string with a valid URL.");
      }
      if (payload) {
        if (typeof subscription !== "object" || !subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
          throw new Error("To send a message with a payload, the subscription must have 'auth' and 'p256dh' keys.");
        }
      }
      let currentGCMAPIKey = gcmAPIKey;
      let currentVapidDetails = vapidDetails;
      let timeToLive = DEFAULT_TTL;
      let extraHeaders = {};
      let contentEncoding = webPushConstants.supportedContentEncodings.AES_128_GCM;
      let urgency = webPushConstants.supportedUrgency.NORMAL;
      let topic;
      let proxy;
      let agent;
      let timeout;
      if (options) {
        const validOptionKeys = [
          "headers",
          "gcmAPIKey",
          "vapidDetails",
          "TTL",
          "contentEncoding",
          "urgency",
          "topic",
          "proxy",
          "agent",
          "timeout"
        ];
        const optionKeys = Object.keys(options);
        for (let i = 0; i < optionKeys.length; i += 1) {
          const optionKey = optionKeys[i];
          if (!validOptionKeys.includes(optionKey)) {
            throw new Error("'" + optionKey + "' is an invalid option. The valid options are ['" + validOptionKeys.join("', '") + "'].");
          }
        }
        if (options.headers) {
          extraHeaders = options.headers;
          let duplicates = Object.keys(extraHeaders).filter(function(header) {
            return typeof options[header] !== "undefined";
          });
          if (duplicates.length > 0) {
            throw new Error("Duplicated headers defined [" + duplicates.join(",") + "]. Please either define the header in thetop level options OR in the 'headers' key.");
          }
        }
        if (options.gcmAPIKey) {
          currentGCMAPIKey = options.gcmAPIKey;
        }
        if (options.vapidDetails !== void 0) {
          currentVapidDetails = options.vapidDetails;
        }
        if (options.TTL !== void 0) {
          timeToLive = Number(options.TTL);
          if (timeToLive < 0) {
            throw new Error("TTL should be a number and should be at least 0");
          }
        }
        if (options.contentEncoding) {
          if (options.contentEncoding === webPushConstants.supportedContentEncodings.AES_128_GCM || options.contentEncoding === webPushConstants.supportedContentEncodings.AES_GCM) {
            contentEncoding = options.contentEncoding;
          } else {
            throw new Error("Unsupported content encoding specified.");
          }
        }
        if (options.urgency) {
          if (options.urgency === webPushConstants.supportedUrgency.VERY_LOW || options.urgency === webPushConstants.supportedUrgency.LOW || options.urgency === webPushConstants.supportedUrgency.NORMAL || options.urgency === webPushConstants.supportedUrgency.HIGH) {
            urgency = options.urgency;
          } else {
            throw new Error("Unsupported urgency specified.");
          }
        }
        if (options.topic) {
          if (!urlBase64Helper.validate(options.topic)) {
            throw new Error("Unsupported characters set use the URL or filename-safe Base64 characters set");
          }
          if (options.topic.length > 32) {
            throw new Error("use maximum of 32 characters from the URL or filename-safe Base64 characters set");
          }
          topic = options.topic;
        }
        if (options.proxy) {
          if (typeof options.proxy === "string" || typeof options.proxy.host === "string") {
            proxy = options.proxy;
          } else {
            console.warn("Attempt to use proxy option, but invalid type it should be a string or proxy options object.");
          }
        }
        if (options.agent) {
          if (options.agent instanceof https.Agent) {
            if (proxy) {
              console.warn("Agent option will be ignored because proxy option is defined.");
            }
            agent = options.agent;
          } else {
            console.warn("Wrong type for the agent option, it should be an instance of https.Agent.");
          }
        }
        if (typeof options.timeout === "number") {
          timeout = options.timeout;
        }
      }
      if (typeof timeToLive === "undefined") {
        timeToLive = DEFAULT_TTL;
      }
      const requestDetails = {
        method: "POST",
        headers: {
          TTL: timeToLive
        }
      };
      Object.keys(extraHeaders).forEach(function(header) {
        requestDetails.headers[header] = extraHeaders[header];
      });
      let requestPayload = null;
      if (payload) {
        const encrypted = encryptionHelper.encrypt(subscription.keys.p256dh, subscription.keys.auth, payload, contentEncoding);
        requestDetails.headers["Content-Length"] = encrypted.cipherText.length;
        requestDetails.headers["Content-Type"] = "application/octet-stream";
        if (contentEncoding === webPushConstants.supportedContentEncodings.AES_128_GCM) {
          requestDetails.headers["Content-Encoding"] = webPushConstants.supportedContentEncodings.AES_128_GCM;
        } else if (contentEncoding === webPushConstants.supportedContentEncodings.AES_GCM) {
          requestDetails.headers["Content-Encoding"] = webPushConstants.supportedContentEncodings.AES_GCM;
          requestDetails.headers.Encryption = "salt=" + encrypted.salt;
          requestDetails.headers["Crypto-Key"] = "dh=" + encrypted.localPublicKey.toString("base64url");
        }
        requestPayload = encrypted.cipherText;
      } else {
        requestDetails.headers["Content-Length"] = 0;
      }
      const isGCM = subscription.endpoint.startsWith("https://android.googleapis.com/gcm/send");
      const isFCM = subscription.endpoint.startsWith("https://fcm.googleapis.com/fcm/send");
      if (isGCM) {
        if (!currentGCMAPIKey) {
          console.warn("Attempt to send push notification to GCM endpoint, but no GCM key is defined. Please use setGCMApiKey() or add 'gcmAPIKey' as an option.");
        } else {
          requestDetails.headers.Authorization = "key=" + currentGCMAPIKey;
        }
      } else if (currentVapidDetails) {
        const parsedUrl = url.parse(subscription.endpoint);
        const audience = parsedUrl.protocol + "//" + parsedUrl.host;
        const vapidHeaders = vapidHelper.getVapidHeaders(
          audience,
          currentVapidDetails.subject,
          currentVapidDetails.publicKey,
          currentVapidDetails.privateKey,
          contentEncoding
        );
        requestDetails.headers.Authorization = vapidHeaders.Authorization;
        if (contentEncoding === webPushConstants.supportedContentEncodings.AES_GCM) {
          if (requestDetails.headers["Crypto-Key"]) {
            requestDetails.headers["Crypto-Key"] += ";" + vapidHeaders["Crypto-Key"];
          } else {
            requestDetails.headers["Crypto-Key"] = vapidHeaders["Crypto-Key"];
          }
        }
      } else if (isFCM && currentGCMAPIKey) {
        requestDetails.headers.Authorization = "key=" + currentGCMAPIKey;
      }
      requestDetails.headers.Urgency = urgency;
      if (topic) {
        requestDetails.headers.Topic = topic;
      }
      requestDetails.body = requestPayload;
      requestDetails.endpoint = subscription.endpoint;
      if (proxy) {
        requestDetails.proxy = proxy;
      }
      if (agent) {
        requestDetails.agent = agent;
      }
      if (timeout) {
        requestDetails.timeout = timeout;
      }
      return requestDetails;
    };
    WebPushLib.prototype.sendNotification = function(subscription, payload, options) {
      let requestDetails;
      try {
        requestDetails = this.generateRequestDetails(subscription, payload, options);
      } catch (err) {
        return Promise.reject(err);
      }
      return new Promise(function(resolve, reject) {
        const httpsOptions = {};
        const urlParts = url.parse(requestDetails.endpoint);
        httpsOptions.hostname = urlParts.hostname;
        httpsOptions.port = urlParts.port;
        httpsOptions.path = urlParts.path;
        httpsOptions.headers = requestDetails.headers;
        httpsOptions.method = requestDetails.method;
        if (requestDetails.timeout) {
          httpsOptions.timeout = requestDetails.timeout;
        }
        if (requestDetails.agent) {
          httpsOptions.agent = requestDetails.agent;
        }
        if (requestDetails.proxy) {
          const { HttpsProxyAgent } = require_dist2();
          httpsOptions.agent = new HttpsProxyAgent(requestDetails.proxy);
        }
        const pushRequest = https.request(httpsOptions, function(pushResponse) {
          let responseText = "";
          pushResponse.on("data", function(chunk) {
            responseText += chunk;
          });
          pushResponse.on("end", function() {
            if (pushResponse.statusCode < 200 || pushResponse.statusCode > 299) {
              reject(new WebPushError(
                "Received unexpected response code",
                pushResponse.statusCode,
                pushResponse.headers,
                responseText,
                requestDetails.endpoint
              ));
            } else {
              resolve({
                statusCode: pushResponse.statusCode,
                body: responseText,
                headers: pushResponse.headers
              });
            }
          });
        });
        if (requestDetails.timeout) {
          pushRequest.on("timeout", function() {
            pushRequest.destroy(new Error("Socket timeout"));
          });
        }
        pushRequest.on("error", function(e) {
          reject(e);
        });
        if (requestDetails.body) {
          pushRequest.write(requestDetails.body);
        }
        pushRequest.end();
      });
    };
    module.exports = WebPushLib;
  }
});

// node_modules/web-push/src/index.js
var require_src2 = __commonJS({
  "node_modules/web-push/src/index.js"(exports, module) {
    "use strict";
    var vapidHelper = require_vapid_helper();
    var encryptionHelper = require_encryption_helper();
    var WebPushLib = require_web_push_lib();
    var WebPushError = require_web_push_error();
    var WebPushConstants = require_web_push_constants();
    var webPush = new WebPushLib();
    module.exports = {
      WebPushError,
      supportedContentEncodings: WebPushConstants.supportedContentEncodings,
      encrypt: encryptionHelper.encrypt,
      getVapidHeaders: vapidHelper.getVapidHeaders,
      generateVAPIDKeys: vapidHelper.generateVAPIDKeys,
      setGCMAPIKey: webPush.setGCMAPIKey,
      setVapidDetails: webPush.setVapidDetails,
      generateRequestDetails: webPush.generateRequestDetails,
      sendNotification: webPush.sendNotification.bind(webPush)
    };
  }
});

// node_modules/@netlify/runtime-utils/dist/main.js
var getString = (input) => typeof input === "string" ? input : JSON.stringify(input);
var base64Decode = globalThis.Buffer ? (input) => Buffer.from(input, "base64").toString() : (input) => atob(input);
var base64Encode = globalThis.Buffer ? (input) => Buffer.from(getString(input)).toString("base64") : (input) => btoa(getString(input));
var getEnvironment = () => {
  const { Deno, Netlify, process: process2 } = globalThis;
  return Netlify?.env ?? Deno?.env ?? {
    delete: (key) => delete process2?.env[key],
    get: (key) => process2?.env[key],
    has: (key) => Boolean(process2?.env[key]),
    set: (key, value) => {
      if (process2?.env) {
        process2.env[key] = value;
      }
    },
    toObject: () => process2?.env ?? {}
  };
};

// node_modules/@netlify/otel/dist/main.js
var GET_TRACER = "__netlify__getTracer";
var getTracer = (name, version) => {
  return globalThis[GET_TRACER]?.(name, version);
};
function withActiveSpan(tracer, name, optionsOrFn, contextOrFn, fn) {
  const func = typeof contextOrFn === "function" ? contextOrFn : typeof optionsOrFn === "function" ? optionsOrFn : fn;
  if (!func) {
    throw new Error("function to execute with active span is missing");
  }
  if (!tracer) {
    return func();
  }
  return tracer.withActiveSpan(name, optionsOrFn, contextOrFn, func);
}

// node_modules/@netlify/blobs/dist/chunk-FWVYH726.js
var getEnvironmentContext = () => {
  const context = globalThis.netlifyBlobsContext || getEnvironment().get("NETLIFY_BLOBS_CONTEXT");
  if (typeof context !== "string" || !context) {
    return {};
  }
  const data = base64Decode(context);
  try {
    return JSON.parse(data);
  } catch {
  }
  return {};
};
var MissingBlobsEnvironmentError = class extends Error {
  constructor(requiredProperties) {
    super(
      `The environment has not been configured to use Netlify Blobs. To use it manually, supply the following properties when creating a store: ${requiredProperties.join(
        ", "
      )}`
    );
    this.name = "MissingBlobsEnvironmentError";
  }
};
var BASE64_PREFIX = "b64;";
var METADATA_HEADER_INTERNAL = "x-amz-meta-user";
var METADATA_HEADER_EXTERNAL = "netlify-blobs-metadata";
var METADATA_MAX_SIZE = 2 * 1024;
var encodeMetadata = (metadata) => {
  if (!metadata) {
    return null;
  }
  const encodedObject = base64Encode(JSON.stringify(metadata));
  const payload = `b64;${encodedObject}`;
  if (METADATA_HEADER_EXTERNAL.length + payload.length > METADATA_MAX_SIZE) {
    throw new Error("Metadata object exceeds the maximum size");
  }
  return payload;
};
var decodeMetadata = (header) => {
  if (!header?.startsWith(BASE64_PREFIX)) {
    return {};
  }
  const encodedData = header.slice(BASE64_PREFIX.length);
  const decodedData = base64Decode(encodedData);
  const metadata = JSON.parse(decodedData);
  return metadata;
};
var getMetadataFromResponse = (response) => {
  if (!response.headers) {
    return {};
  }
  const value = response.headers.get(METADATA_HEADER_EXTERNAL) || response.headers.get(METADATA_HEADER_INTERNAL);
  try {
    return decodeMetadata(value);
  } catch {
    throw new Error(
      "An internal error occurred while trying to retrieve the metadata for an entry. Please try updating to the latest version of the Netlify Blobs client."
    );
  }
};
var NF_ERROR = "x-nf-error";
var NF_REQUEST_ID = "x-nf-request-id";
var DEPLOY_STORE_PREFIX = "deploy:";
var SITE_STORE_PREFIX = "site:";
var isDeniedWrite = (res, { method, storeName }) => (res.status === 401 || res.status === 403) && (method === "put" || method === "delete") && storeName !== void 0 && !storeName.startsWith(DEPLOY_STORE_PREFIX);
var blobsErrorMessage = (res, context) => {
  let details = res.headers.get(NF_ERROR) || `${res.status} status code`;
  if (res.headers.has(NF_REQUEST_ID)) {
    details += `, ID: ${res.headers.get(NF_REQUEST_ID)}`;
  }
  if (isDeniedWrite(res, context)) {
    const storeName = context.storeName?.startsWith(SITE_STORE_PREFIX) ? context.storeName.slice(SITE_STORE_PREFIX.length) : context.storeName;
    return `Netlify Blobs could not write to store '${storeName}' (${details}). Builds and build plugins can only write to deploy-specific stores: use 'getDeployStore' instead of 'getStore', or pass a 'token' with write access to the store. If this code is not running in a build, check that the token and site ID are valid. See https://docs.netlify.com/build/data-and-storage/netlify-blobs/#deploy-specific-stores`;
  }
  return `Netlify Blobs has generated an internal error (${details})`;
};
var BlobsInternalError = class extends Error {
  constructor(res, context = {}) {
    super(blobsErrorMessage(res, context));
    this.name = "BlobsInternalError";
  }
};
var collectIterator = async (iterator) => {
  const result = [];
  for await (const item of iterator) {
    result.push(item);
  }
  return result;
};
function withSpan(span, name, fn) {
  if (span) return fn(span);
  return withActiveSpan(getTracer(), name, (span2) => {
    return fn(span2);
  });
}
var BlobsConsistencyError = class extends Error {
  constructor() {
    super(
      `Netlify Blobs has failed to perform a read using strong consistency because the environment has not been configured with a 'uncachedEdgeURL' property`
    );
    this.name = "BlobsConsistencyError";
  }
};
var regions = {
  "us-east-1": true,
  "us-east-2": true,
  "eu-central-1": true,
  "ap-southeast-1": true,
  "ap-southeast-2": true
};
var isValidRegion = (input) => Object.keys(regions).includes(input);
var InvalidBlobsRegionError = class extends Error {
  constructor(region) {
    super(
      `${region} is not a supported Netlify Blobs region. Supported values are: ${Object.keys(regions).join(", ")}.`
    );
    this.name = "InvalidBlobsRegionError";
  }
};
var DEFAULT_RETRY_DELAY = getEnvironment().get("NODE_ENV") === "test" ? 1 : 5e3;
var MIN_RETRY_DELAY = 1e3;
var MAX_RETRY = 5;
var RATE_LIMIT_HEADER = "X-RateLimit-Reset";
var fetchAndRetry = async (fetch2, url, options, attemptsLeft = MAX_RETRY) => {
  try {
    const res = await fetch2(url, options);
    if (attemptsLeft > 0 && (res.status === 429 || res.status >= 500)) {
      const delay = getDelay(res.headers.get(RATE_LIMIT_HEADER));
      await sleep(delay);
      return fetchAndRetry(fetch2, url, options, attemptsLeft - 1);
    }
    return res;
  } catch (error) {
    if (attemptsLeft === 0) {
      throw error;
    }
    const delay = getDelay();
    await sleep(delay);
    return fetchAndRetry(fetch2, url, options, attemptsLeft - 1);
  }
};
var getDelay = (rateLimitReset) => {
  if (!rateLimitReset) {
    return DEFAULT_RETRY_DELAY;
  }
  return Math.max(Number(rateLimitReset) * 1e3 - Date.now(), MIN_RETRY_DELAY);
};
var sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});
var SIGNED_URL_ACCEPT_HEADER = "application/json;type=signed-url";
var Client = class {
  constructor({ apiURL, consistency, edgeURL, fetch: fetch2, region, siteID, token, uncachedEdgeURL }) {
    this.apiURL = apiURL;
    this.consistency = consistency ?? "eventual";
    this.edgeURL = edgeURL;
    this.fetch = fetch2 ?? globalThis.fetch;
    this.region = region;
    this.siteID = siteID;
    this.token = token;
    this.uncachedEdgeURL = uncachedEdgeURL;
    if (!this.fetch) {
      throw new Error(
        "Netlify Blobs could not find a `fetch` client in the global scope. You can either update your runtime to a version that includes `fetch` (like Node.js 18.0.0 or above), or you can supply your own implementation using the `fetch` property."
      );
    }
  }
  async getFinalRequest({
    consistency: opConsistency,
    key,
    metadata,
    method,
    parameters = {},
    storeName
  }) {
    const encodedMetadata = encodeMetadata(metadata);
    const consistency = opConsistency ?? this.consistency;
    let urlPath = `/${this.siteID}`;
    if (storeName) {
      urlPath += `/${storeName}`;
    }
    if (key) {
      urlPath += `/${key}`;
    }
    if (this.edgeURL) {
      if (consistency === "strong" && !this.uncachedEdgeURL) {
        throw new BlobsConsistencyError();
      }
      const headers = {
        authorization: `Bearer ${this.token}`
      };
      if (encodedMetadata) {
        headers[METADATA_HEADER_INTERNAL] = encodedMetadata;
      }
      if (this.region) {
        urlPath = `/region:${this.region}${urlPath}`;
      }
      const url2 = new URL(urlPath, consistency === "strong" ? this.uncachedEdgeURL : this.edgeURL);
      for (const key2 in parameters) {
        url2.searchParams.set(key2, parameters[key2]);
      }
      return {
        headers,
        url: url2.toString()
      };
    }
    const apiHeaders = { authorization: `Bearer ${this.token}` };
    const url = new URL(`/api/v1/blobs${urlPath}`, this.apiURL ?? "https://api.netlify.com");
    for (const key2 in parameters) {
      url.searchParams.set(key2, parameters[key2]);
    }
    if (this.region) {
      url.searchParams.set("region", this.region);
    }
    if (storeName === void 0 || key === void 0) {
      return {
        headers: apiHeaders,
        url: url.toString()
      };
    }
    if (encodedMetadata) {
      apiHeaders[METADATA_HEADER_EXTERNAL] = encodedMetadata;
    }
    if (method === "head" || method === "delete") {
      return {
        headers: apiHeaders,
        url: url.toString()
      };
    }
    const res = await this.fetch(url.toString(), {
      headers: { ...apiHeaders, accept: SIGNED_URL_ACCEPT_HEADER },
      method
    });
    if (res.status !== 200) {
      throw new BlobsInternalError(res, { method, storeName });
    }
    const { url: signedURL } = await res.json();
    const userHeaders = encodedMetadata ? { [METADATA_HEADER_INTERNAL]: encodedMetadata } : void 0;
    return {
      headers: userHeaders,
      url: signedURL
    };
  }
  async makeRequest({
    body,
    conditions = {},
    consistency,
    headers: extraHeaders,
    key,
    metadata,
    method,
    parameters,
    storeName
  }) {
    const { headers: baseHeaders = {}, url } = await this.getFinalRequest({
      consistency,
      key,
      metadata,
      method,
      parameters,
      storeName
    });
    const headers = {
      ...baseHeaders,
      ...extraHeaders
    };
    if (method === "put") {
      headers["cache-control"] = "max-age=0, stale-while-revalidate=60";
    }
    if ("onlyIfMatch" in conditions && conditions.onlyIfMatch) {
      headers["if-match"] = conditions.onlyIfMatch;
    } else if ("onlyIfNew" in conditions && conditions.onlyIfNew) {
      headers["if-none-match"] = "*";
    }
    const options = {
      body,
      headers,
      method
    };
    if (body instanceof ReadableStream) {
      options.duplex = "half";
    }
    return fetchAndRetry(this.fetch, url, options);
  }
};
var getClientOptions = (options, contextOverride) => {
  const context = contextOverride ?? getEnvironmentContext();
  const siteID = context.siteID ?? options.siteID;
  const token = context.token ?? options.token;
  if (!siteID || !token) {
    throw new MissingBlobsEnvironmentError(["siteID", "token"]);
  }
  if (options.region !== void 0 && !isValidRegion(options.region)) {
    throw new InvalidBlobsRegionError(options.region);
  }
  const clientOptions = {
    apiURL: context.apiURL ?? options.apiURL,
    consistency: options.consistency,
    edgeURL: context.edgeURL ?? options.edgeURL,
    fetch: options.fetch,
    region: options.region,
    siteID,
    token,
    uncachedEdgeURL: context.uncachedEdgeURL ?? options.uncachedEdgeURL
  };
  return clientOptions;
};

// node_modules/@netlify/blobs/dist/main.js
var LEGACY_STORE_INTERNAL_PREFIX = "netlify-internal/legacy-namespace/";
var STATUS_OK = 200;
var STATUS_PRE_CONDITION_FAILED = 412;
var Store = class _Store {
  constructor(options) {
    this.client = options.client;
    if ("deployID" in options) {
      _Store.validateDeployID(options.deployID);
      let name = DEPLOY_STORE_PREFIX + options.deployID;
      if (options.name) {
        name += `:${options.name}`;
      }
      this.name = name;
    } else if (options.name.startsWith(LEGACY_STORE_INTERNAL_PREFIX)) {
      const storeName = options.name.slice(LEGACY_STORE_INTERNAL_PREFIX.length);
      _Store.validateStoreName(storeName);
      this.name = storeName;
    } else {
      _Store.validateStoreName(options.name);
      this.name = SITE_STORE_PREFIX + options.name;
    }
  }
  async delete(key) {
    const res = await this.client.makeRequest({ key, method: "delete", storeName: this.name });
    if (![200, 204, 404].includes(res.status)) {
      throw new BlobsInternalError(res, { method: "delete", storeName: this.name });
    }
  }
  async deleteAll() {
    let totalDeletedBlobs = 0;
    let hasMore = true;
    while (hasMore) {
      const res = await this.client.makeRequest({ method: "delete", storeName: this.name });
      if (res.status !== 200) {
        throw new BlobsInternalError(res, { method: "delete", storeName: this.name });
      }
      const data = await res.json();
      if (typeof data.blobs_deleted !== "number") {
        throw new BlobsInternalError(res);
      }
      totalDeletedBlobs += data.blobs_deleted;
      hasMore = typeof data.has_more === "boolean" && data.has_more;
    }
    return {
      deletedBlobs: totalDeletedBlobs
    };
  }
  async get(key, options) {
    return withSpan(options?.span, "blobs.get", async (span) => {
      const { consistency, type } = options ?? {};
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.type": type,
        "blobs.method": "GET",
        "blobs.consistency": consistency
      });
      const res = await this.client.makeRequest({
        consistency,
        key,
        method: "get",
        storeName: this.name
      });
      span?.setAttributes({
        "blobs.response.body.size": res.headers.get("content-length") ?? void 0,
        "blobs.response.status": res.status
      });
      if (res.status === 404) {
        return null;
      }
      if (res.status !== 200) {
        throw new BlobsInternalError(res);
      }
      if (type === void 0 || type === "text") {
        return res.text();
      }
      if (type === "arrayBuffer") {
        return res.arrayBuffer();
      }
      if (type === "blob") {
        return res.blob();
      }
      if (type === "json") {
        return res.json();
      }
      if (type === "stream") {
        return res.body;
      }
      throw new BlobsInternalError(res);
    });
  }
  async getMetadata(key, options = {}) {
    return withSpan(options?.span, "blobs.getMetadata", async (span) => {
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.method": "HEAD",
        "blobs.consistency": options.consistency
      });
      const res = await this.client.makeRequest({
        consistency: options.consistency,
        key,
        method: "head",
        storeName: this.name
      });
      span?.setAttributes({
        "blobs.response.status": res.status
      });
      if (res.status === 404) {
        return null;
      }
      if (res.status !== 200 && res.status !== 304) {
        throw new BlobsInternalError(res);
      }
      const etag = res?.headers.get("etag") ?? void 0;
      const metadata = getMetadataFromResponse(res);
      const result = {
        etag,
        metadata
      };
      return result;
    });
  }
  async getWithMetadata(key, options) {
    return withSpan(options?.span, "blobs.getWithMetadata", async (span) => {
      const { consistency, etag: requestETag, type } = options ?? {};
      const headers = requestETag ? { "if-none-match": requestETag } : void 0;
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.method": "GET",
        "blobs.consistency": options?.consistency,
        "blobs.type": type,
        "blobs.request.etag": requestETag
      });
      const res = await this.client.makeRequest({
        consistency,
        headers,
        key,
        method: "get",
        storeName: this.name
      });
      const responseETag = res?.headers.get("etag") ?? void 0;
      span?.setAttributes({
        "blobs.response.body.size": res.headers.get("content-length") ?? void 0,
        "blobs.response.etag": responseETag,
        "blobs.response.status": res.status
      });
      if (res.status === 404) {
        return null;
      }
      if (res.status !== 200 && res.status !== 304) {
        throw new BlobsInternalError(res);
      }
      const metadata = getMetadataFromResponse(res);
      const result = {
        etag: responseETag,
        metadata
      };
      if (res.status === 304 && requestETag) {
        return { data: null, ...result };
      }
      if (type === void 0 || type === "text") {
        return { data: await res.text(), ...result };
      }
      if (type === "arrayBuffer") {
        return { data: await res.arrayBuffer(), ...result };
      }
      if (type === "blob") {
        return { data: await res.blob(), ...result };
      }
      if (type === "json") {
        return { data: await res.json(), ...result };
      }
      if (type === "stream") {
        return { data: res.body, ...result };
      }
      throw new Error(`Invalid 'type' property: ${type}. Expected: arrayBuffer, blob, json, stream, or text.`);
    });
  }
  list(options = {}) {
    return withSpan(options.span, "blobs.list", (span) => {
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.method": "GET",
        "blobs.list.paginate": options.paginate ?? false
      });
      const iterator = this.getListIterator(options);
      if (options.paginate) {
        return iterator;
      }
      return collectIterator(iterator).then(
        (items) => items.reduce(
          (acc, item) => ({
            blobs: [...acc.blobs, ...item.blobs],
            directories: [...acc.directories, ...item.directories]
          }),
          { blobs: [], directories: [] }
        )
      );
    });
  }
  async set(key, data, options = {}) {
    return withSpan(options.span, "blobs.set", async (span) => {
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.method": "PUT",
        "blobs.data.size": typeof data == "string" ? data.length : data instanceof Blob ? data.size : data.byteLength,
        "blobs.data.type": typeof data == "string" ? "string" : data instanceof Blob ? "blob" : "arrayBuffer",
        "blobs.atomic": Boolean(options.onlyIfMatch ?? options.onlyIfNew)
      });
      _Store.validateKey(key);
      const conditions = _Store.getConditions(options);
      const res = await this.client.makeRequest({
        conditions,
        body: data,
        key,
        metadata: options.metadata,
        method: "put",
        storeName: this.name
      });
      const etag = res.headers.get("etag") ?? "";
      span?.setAttributes({
        "blobs.response.etag": etag,
        "blobs.response.status": res.status
      });
      if (conditions) {
        return res.status === STATUS_PRE_CONDITION_FAILED ? { modified: false } : { etag, modified: true };
      }
      if (res.status === STATUS_OK) {
        return {
          etag,
          modified: true
        };
      }
      throw new BlobsInternalError(res, { method: "put", storeName: this.name });
    });
  }
  async setJSON(key, data, options = {}) {
    return withSpan(options.span, "blobs.setJSON", async (span) => {
      span?.setAttributes({
        "blobs.store": this.name,
        "blobs.key": key,
        "blobs.method": "PUT",
        "blobs.data.type": "json",
        "blobs.atomic": Boolean(options.onlyIfMatch ?? options.onlyIfNew)
      });
      _Store.validateKey(key);
      const conditions = _Store.getConditions(options);
      const payload = JSON.stringify(data);
      const headers = {
        "content-type": "application/json"
      };
      const res = await this.client.makeRequest({
        conditions,
        body: payload,
        headers,
        key,
        metadata: options.metadata,
        method: "put",
        storeName: this.name
      });
      const etag = res.headers.get("etag") ?? "";
      span?.setAttributes({
        "blobs.response.etag": etag,
        "blobs.response.status": res.status
      });
      if (conditions) {
        return res.status === STATUS_PRE_CONDITION_FAILED ? { modified: false } : { etag, modified: true };
      }
      if (res.status === STATUS_OK) {
        return {
          etag,
          modified: true
        };
      }
      throw new BlobsInternalError(res, { method: "put", storeName: this.name });
    });
  }
  static formatListResultBlob(result) {
    if (!result.key) {
      return null;
    }
    return {
      etag: result.etag,
      key: result.key
    };
  }
  static getConditions(options) {
    if ("onlyIfMatch" in options && "onlyIfNew" in options) {
      throw new Error(
        `The 'onlyIfMatch' and 'onlyIfNew' options are mutually exclusive. Using 'onlyIfMatch' will make the write succeed only if there is an entry for the key with the given content, while 'onlyIfNew' will make the write succeed only if there is no entry for the key.`
      );
    }
    if ("onlyIfMatch" in options && options.onlyIfMatch) {
      if (typeof options.onlyIfMatch !== "string") {
        throw new Error(`The 'onlyIfMatch' property expects a string representing an ETag.`);
      }
      return {
        onlyIfMatch: options.onlyIfMatch
      };
    }
    if ("onlyIfNew" in options && options.onlyIfNew) {
      if (typeof options.onlyIfNew !== "boolean") {
        throw new Error(
          `The 'onlyIfNew' property expects a boolean indicating whether the write should fail if an entry for the key already exists.`
        );
      }
      return {
        onlyIfNew: true
      };
    }
  }
  static validateKey(key) {
    if (key === "") {
      throw new Error("Blob key must not be empty.");
    }
    if (key.startsWith("/") || key.startsWith("%2F")) {
      throw new Error("Blob key must not start with forward slash (/).");
    }
    if (new TextEncoder().encode(key).length > 600) {
      throw new Error(
        "Blob key must be a sequence of Unicode characters whose UTF-8 encoding is at most 600 bytes long."
      );
    }
  }
  static validateDeployID(deployID) {
    if (!/^\w{1,24}$/.test(deployID)) {
      throw new Error(`'${deployID}' is not a valid Netlify deploy ID.`);
    }
  }
  static validateStoreName(name) {
    if (name.includes("/") || name.includes("%2F")) {
      throw new Error("Store name must not contain forward slashes (/).");
    }
    if (new TextEncoder().encode(name).length > 64) {
      throw new Error(
        "Store name must be a sequence of Unicode characters whose UTF-8 encoding is at most 64 bytes long."
      );
    }
  }
  getListIterator(options) {
    const { client, name: storeName } = this;
    const parameters = {};
    if (options?.prefix) {
      parameters.prefix = options.prefix;
    }
    if (options?.directories) {
      parameters.directories = "true";
    }
    return {
      [Symbol.asyncIterator]() {
        let currentCursor = null;
        let done = false;
        return {
          async next() {
            return withSpan(options?.span, "blobs.list.next", async (span) => {
              span?.setAttributes({
                "blobs.store": storeName,
                "blobs.method": "GET",
                "blobs.list.paginate": options?.paginate ?? false,
                "blobs.list.done": done,
                "blobs.list.cursor": currentCursor ?? void 0
              });
              if (done) {
                return { done: true, value: void 0 };
              }
              const nextParameters = { ...parameters };
              if (currentCursor !== null) {
                nextParameters.cursor = currentCursor;
              }
              const res = await client.makeRequest({
                method: "get",
                parameters: nextParameters,
                storeName
              });
              span?.setAttributes({
                "blobs.response.status": res.status
              });
              let blobs = [];
              let directories = [];
              if (![200, 204, 404].includes(res.status)) {
                throw new BlobsInternalError(res);
              }
              if (res.status === 404) {
                done = true;
              } else {
                const page = await res.json();
                if (page.next_cursor) {
                  currentCursor = page.next_cursor;
                } else {
                  done = true;
                }
                blobs = (page.blobs ?? []).map(_Store.formatListResultBlob).filter(Boolean);
                directories = page.directories ?? [];
              }
              return {
                done: false,
                value: {
                  blobs,
                  directories
                }
              };
            });
          }
        };
      }
    };
  }
};
var getStore = (input, options) => {
  if (typeof input === "string") {
    const contextOverride = options?.siteID && options?.token ? { siteID: options?.siteID, token: options?.token } : void 0;
    const clientOptions = getClientOptions(options ?? {}, contextOverride);
    const client = new Client(clientOptions);
    return new Store({ client, name: input });
  }
  if (typeof input?.name === "string") {
    const { name } = input;
    const contextOverride = input?.siteID && input?.token ? { siteID: input?.siteID, token: input?.token } : void 0;
    const clientOptions = getClientOptions(input, contextOverride);
    if (!name) {
      throw new MissingBlobsEnvironmentError(["name"]);
    }
    const client = new Client(clientOptions);
    return new Store({ client, name });
  }
  if (typeof input?.deployID === "string") {
    const clientOptions = getClientOptions(input);
    const { deployID } = input;
    if (!deployID) {
      throw new MissingBlobsEnvironmentError(["deployID"]);
    }
    const client = new Client(clientOptions);
    return new Store({ client, deployID });
  }
  throw new Error(
    "The `getStore` method requires the name of the store as a string or as the `name` property of an options object"
  );
};

// netlify/functions/api.mjs
var import_web_push = __toESM(require_src2(), 1);
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from "node:crypto";
var JOUR = 864e5;
var SESSION_MS = 30 * JOUR;
var FORT = true;
var app = () => getStore(FORT ? { name: "quercy-app", consistency: "strong" } : "quercy-app");
function faibleSiBesoin(e) {
  if (FORT && /strong consistency|uncachedEdgeURL/i.test(String(e && e.message))) {
    FORT = false;
    console.warn("Netlify Blobs : lecture forte indisponible, lecture normale utilis\xE9e.");
    return true;
  }
  return false;
}
var phStore = () => getStore("quercy-photos");
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
  });
}
var erreur = (msg, status = 400) => json({ erreur: msg }, status);
var now = () => Date.now();
var uid = () => randomBytes(9).toString("base64url");
var txt = (v, max) => String(v ?? "").slice(0, max).trim();
var FR_DATE = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" });
var jourISO = (d) => FR_DATE.format(new Date(d));
function hachePin(pin, sel) {
  return scryptSync(String(pin), sel, 32).toString("hex");
}
function pinValide(pin, agent) {
  if (!agent || !agent.sel || !agent.hash) return false;
  const a = Buffer.from(hachePin(pin, agent.sel), "hex");
  const b = Buffer.from(agent.hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
var SECRET = "";
async function secret() {
  if (SECRET) return SECRET;
  let v;
  try {
    v = await app().get("secret", { type: "text" });
  } catch (e) {
    if (!faibleSiBesoin(e)) throw e;
    v = await app().get("secret", { type: "text" });
  }
  if (!v) {
    const neuf = randomBytes(48).toString("base64url");
    await app().set("secret", neuf);
    v = await app().get("secret", { type: "text" }) || neuf;
  }
  SECRET = v;
  return SECRET;
}
async function relireSecret() {
  const v = await app().get("secret", { type: "text" });
  if (v && v !== SECRET) {
    SECRET = v;
    return true;
  }
  return false;
}
function signe(charge) {
  const corps = Buffer.from(JSON.stringify(charge)).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(corps).digest("base64url");
  return corps + "." + sig;
}
function verifie(jeton) {
  if (!jeton || jeton.indexOf(".") < 0) return null;
  const [corps, sig] = jeton.split(".");
  const attendu = createHmac("sha256", SECRET).update(corps).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(attendu);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const c = JSON.parse(Buffer.from(corps, "base64url").toString());
    if (!c.exp || c.exp < now()) return null;
    return c;
  } catch {
    return null;
  }
}
function cookieDe(req, nom) {
  const brut = req.headers.get("cookie") || "";
  for (const part of brut.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === nom) return decodeURIComponent(v.join("="));
  }
  return null;
}
var poseCookie = (j) => `qp=${encodeURIComponent(j)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${Math.floor(SESSION_MS / 1e3)}`;
var videCookie = () => `qp=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
async function lire(cle, defaut) {
  const v = await app().get(cle, { type: "json" });
  return v === null || v === void 0 ? defaut : v;
}
var ecrire = (cle, valeur) => app().setJSON(cle, valeur);
async function agents() {
  return lire("agents", null);
}
async function modifier(cle, defaut, transforme, essais = 12) {
  for (let k = 0; k < essais; k++) {
    let valeur = defaut, etag = null, existe = false;
    try {
      const lu = await app().getWithMetadata(cle, { type: "json" });
      if (lu && lu.data !== null && lu.data !== void 0) {
        valeur = lu.data;
        etag = lu.etag || null;
        existe = true;
      }
    } catch {
      valeur = await lire(cle, defaut);
      existe = true;
    }
    const suivant = await transforme(valeur);
    if (suivant === void 0) return valeur;
    try {
      const opt = etag ? { onlyIfMatch: etag } : existe ? null : { onlyIfNew: true };
      const res = opt ? await app().setJSON(cle, suivant, opt) : await app().setJSON(cle, suivant);
      if (!res || res.modified !== false) return suivant;
    } catch {
      await ecrire(cle, suivant);
      return suivant;
    }
    await new Promise((s2) => setTimeout(s2, 40 + k * 60 + Math.random() * 120));
  }
  const e2 = new Error("Enregistrement occup\xE9, r\xE9essayez dans un instant.");
  e2.conflit = true;
  throw e2;
}
async function session(req) {
  const jeton = cookieDe(req, "qp");
  let c = verifie(jeton);
  if (!c && jeton && await relireSecret()) c = verifie(jeton);
  if (!c) return null;
  const liste = await agents() || [];
  const a = liste.find((x) => x.id === c.id && x.actif);
  return a ? { id: a.id, nom: a.nom, code: a.code, role: a.role, couleur: a.couleur, photo: !!a.photo } : null;
}
var CONFIG_DEFAUT = {
  nom: "Quercy Propret\xE9",
  adresse: "",
  cp: "46000",
  ville: "Cahors",
  tel: "",
  email: "contact@quercy-proprete.fr",
  siret: "",
  iban: "",
  bic: "",
  tvaIntra: "",
  sap: "",
  sapDate: "",
  avisGoogle: "",
  taux: 28,
  tva: 20,
  mentions: "",
  alertes: { retard: true, veille: true, matin: true, factures: true }
};
var CONDITIONS_DEFAUT = "Paiement par virement \xE0 30 jours. Pas d'escompte pour paiement anticip\xE9.";
async function entrepriseConf() {
  const c = { ...CONFIG_DEFAUT, ...await lire("config", {}) };
  c.alertes = { ...CONFIG_DEFAUT.alertes, ...c.alertes || {} };
  if (c.conditions === void 0) {
    if (/paiement|règlement|reglement|devis/i.test(c.mentions || "")) {
      c.conditions = c.mentions;
      c.mentions = "";
    } else c.conditions = CONDITIONS_DEFAUT;
  }
  return c;
}
var MODELES = {
  "Logement meubl\xE9": [
    { n: "Chambres", items: [
      { l: "Lits refaits, linge propre et sans plis", crit: false },
      { l: "Poussi\xE8res, surfaces et poign\xE9es", crit: false },
      { l: "Sols aspir\xE9s puis lav\xE9s", crit: false }
    ] },
    { n: "Salle de bain", items: [
      { l: "Cuvette, robinetterie et joints d\xE9sinfect\xE9s", crit: true },
      { l: "Douche d\xE9tartr\xE9e, paroi sans traces", crit: false },
      { l: "Miroir et surfaces", crit: false },
      { l: "Consommables r\xE9approvisionn\xE9s", crit: false }
    ] },
    { n: "Cuisine", items: [
      { l: "Plan de travail et \xE9vier d\xE9sinfect\xE9s", crit: true },
      { l: "Four, r\xE9frig\xE9rateur, micro-ondes", crit: false },
      { l: "Vaisselle rang\xE9e, lave-vaisselle vid\xE9", crit: false }
    ] },
    { n: "S\xE9jour", items: [
      { l: "Sols aspir\xE9s puis lav\xE9s, plinthes comprises", crit: false },
      { l: "Vitres int\xE9rieures et miroirs", crit: false }
    ] },
    { n: "Sortie", items: [
      { l: "Poubelles vid\xE9es, sacs remplac\xE9s, local propre", crit: true },
      { l: "A\xE9ration, contr\xF4le des odeurs", crit: false },
      { l: "Cl\xE9s replac\xE9es en bo\xEEte, code brouill\xE9", crit: true }
    ] }
  ],
  "Bureaux et locaux": [
    { n: "Postes de travail", items: [
      { l: "Bureaux, \xE9crans et t\xE9l\xE9phones d\xE9poussi\xE9r\xE9s", crit: false },
      { l: "Corbeilles vid\xE9es, sacs remplac\xE9s", crit: false },
      { l: "Sols aspir\xE9s", crit: false }
    ] },
    { n: "Sanitaires", items: [
      { l: "Cuvettes et urinoirs d\xE9sinfect\xE9s", crit: true },
      { l: "Lavabos, robinetterie et miroirs", crit: false },
      { l: "Savon, papier et essuie-mains r\xE9approvisionn\xE9s", crit: true },
      { l: "Sols lav\xE9s et d\xE9sinfect\xE9s", crit: false }
    ] },
    { n: "Espace d\xE9tente", items: [
      { l: "Plan de travail et \xE9vier", crit: false },
      { l: "Micro-ondes et r\xE9frig\xE9rateur", crit: false },
      { l: "Machine \xE0 caf\xE9 d\xE9tartr\xE9e et vid\xE9e", crit: false }
    ] },
    { n: "Circulations", items: [
      { l: "Hall, couloirs et escaliers", crit: false },
      { l: "Portes vitr\xE9es et traces de mains", crit: false },
      { l: "Interrupteurs et points de contact d\xE9sinfect\xE9s", crit: true }
    ] },
    { n: "Fermeture", items: [
      { l: "D\xE9chets \xE9vacu\xE9s au local", crit: false },
      { l: "Lumi\xE8res \xE9teintes, locaux ferm\xE9s", crit: true },
      { l: "Alarme r\xE9enclench\xE9e", crit: true }
    ] }
  ],
  "Remise en \xE9tat": [
    { n: "Cuisine", items: [
      { l: "D\xE9graissage complet des meubles hauts et bas", crit: true },
      { l: "Hotte, filtres et four d\xE9cap\xE9s", crit: true },
      { l: "Placards vid\xE9s, nettoy\xE9s int\xE9rieur et ext\xE9rieur", crit: false },
      { l: "Carrelage mural et joints", crit: false }
    ] },
    { n: "Sanitaires", items: [
      { l: "D\xE9tartrage complet, robinetterie et joints", crit: true },
      { l: "Traitement des moisissures", crit: false },
      { l: "\xC9vacuations d\xE9gag\xE9es", crit: false }
    ] },
    { n: "Sols et murs", items: [
      { l: "Sols d\xE9cap\xE9s puis prot\xE9g\xE9s", crit: false },
      { l: "Plinthes, portes et chambranles", crit: false },
      { l: "Traces sur les murs trait\xE9es", crit: false }
    ] },
    { n: "Menuiseries", items: [
      { l: "Vitrages int\xE9rieurs et ext\xE9rieurs accessibles", crit: false },
      { l: "Rails, joints et volets", crit: false }
    ] },
    { n: "Finitions", items: [
      { l: "Interrupteurs, prises et radiateurs", crit: false },
      { l: "Encombrants \xE9vacu\xE9s", crit: true },
      { l: "Contr\xF4le final pi\xE8ce par pi\xE8ce", crit: true }
    ] }
  ],
  "Parties communes": [
    { n: "Hall et entr\xE9e", items: [
      { l: "Sol lav\xE9, paillasson nettoy\xE9", crit: false },
      { l: "Bo\xEEtes aux lettres et interphone d\xE9poussi\xE9r\xE9s", crit: false },
      { l: "Portes vitr\xE9es sans traces", crit: false }
    ] },
    { n: "Escaliers et paliers", items: [
      { l: "Marches et contremarches", crit: false },
      { l: "Rampes d\xE9sinfect\xE9es", crit: true },
      { l: "Paliers et portes pali\xE8res", crit: false }
    ] },
    { n: "Local poubelles", items: [
      { l: "Containers sortis et rentr\xE9s", crit: true },
      { l: "Sol lav\xE9 et d\xE9sinfect\xE9", crit: true },
      { l: "Local d\xE9sodoris\xE9", crit: false }
    ] },
    { n: "Abords", items: [
      { l: "Entr\xE9e ext\xE9rieure balay\xE9e", crit: false },
      { l: "Local v\xE9los et parking", crit: false }
    ] },
    { n: "Contr\xF4les", items: [
      { l: "Ampoules grill\xE9es signal\xE9es", crit: false },
      { l: "D\xE9gradations relev\xE9es et photographi\xE9es", crit: false }
    ] }
  ]
};
var CONSOMMABLES = [
  { l: "Sacs poubelle 30 L", u: "unit\xE9" },
  { l: "Sacs poubelle 100 L", u: "unit\xE9" },
  { l: "Papier toilette", u: "rouleau" },
  { l: "Essuie-tout", u: "rouleau" },
  { l: "Savon mains", u: "flacon" },
  { l: "Gel douche", u: "flacon" },
  { l: "Produit sol d\xE9sinfectant", u: "dose" },
  { l: "D\xE9graissant cuisine", u: "dose" }
];
var PRESTATIONS = [
  "Changement de locataires",
  "M\xE9nage r\xE9current",
  "Entretien de bureaux",
  "Parties communes",
  "Remise en \xE9tat",
  "Nettoyage de vitres",
  "Fin de chantier",
  "\xC9tat des lieux"
];
var COULEURS = ["#009C84", "#B07B2A", "#3C6E9F", "#8A5B9E", "#B8553C", "#4C8C4A"];
function neufPieces(modele) {
  const src = MODELES[modele] || MODELES["Logement meubl\xE9"];
  return src.map((p) => ({ n: p.n, items: p.items.map((i) => ({ l: i.l, crit: i.crit, ok: false, nc: "", ts: 0 })) }));
}
var cleCh = (id) => "ch/" + id;
async function chantier(id) {
  return lire(cleCh(id), null);
}
async function majChantier(ch) {
  ch.maj = now();
  await ecrire(cleCh(ch.id), ch);
  return ch;
}
var cleMois = (m) => "idx/" + m;
async function moisConnus() {
  return lire("idx-mois", []);
}
async function noterMois(m) {
  const l = await moisConnus();
  if (l.includes(m)) return;
  await modifier("idx-mois", [], (v) => v.includes(m) ? void 0 : v.concat([m]).sort());
}
var migre = false;
async function migrerIndex() {
  if (migre) return;
  migre = true;
  const ancien = await lire("index", null);
  if (!Array.isArray(ancien) || !ancien.length) return;
  const parMois = {};
  for (const l of ancien) (parMois[String(l.date).slice(0, 7)] ||= []).push(l);
  for (const m of Object.keys(parMois)) {
    await modifier(cleMois(m), [], (v) => {
      const vus = new Set(v.map((x) => x.id));
      return v.concat(parMois[m].filter((x) => !vus.has(x.id)));
    });
    await noterMois(m);
  }
  await app().delete("index").catch(() => {
  });
}
async function indexMois(m) {
  return lire(cleMois(m), []);
}
async function index(depuis, jusqu) {
  const mois = (await moisConnus()).filter((m) => (!depuis || m >= depuis) && (!jusqu || m <= jusqu));
  const out = [];
  for (const m of mois) out.push(...await indexMois(m));
  return out.sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure));
}
function ligneIndex(ch) {
  return {
    id: ch.id,
    date: ch.date,
    heure: ch.heure,
    client: ch.client,
    ville: ch.ville,
    adresse: ch.adresse || "",
    cp: ch.cp || "",
    prestation: ch.prestation,
    modele: ch.modele,
    agentId: ch.agentId,
    devise: ch.devise,
    taux: ch.taux || 0,
    exemple: !!ch.exemple,
    demo: !!ch.demo,
    arrivee: ch.arrivee || null,
    reel: ch.cloture ? ch.cloture.duree / 36e5 : null,
    note: ch.avis && ch.avis.note ? ch.avis.note : null,
    statut: ch.annule ? "annule" : ch.cloture ? "cloture" : ch.depart ? "a-cloturer" : ch.arrivee ? "en-cours" : "prevu"
  };
}
async function majIndex(ch, supprimer, ancienneDate) {
  const m = String(ch.date || ancienneDate || "").slice(0, 7);
  const ancien = ancienneDate ? String(ancienneDate).slice(0, 7) : null;
  if (ancien && ancien !== m) {
    await modifier(cleMois(ancien), [], (v) => v.filter((x) => x.id !== ch.id));
  }
  if (supprimer) {
    const cible = m || ancien;
    if (cible) await modifier(cleMois(cible), [], (v) => v.filter((x) => x.id !== ch.id));
    return;
  }
  const ligne = ligneIndex(ch);
  await modifier(cleMois(m), [], (v) => {
    const l = v.filter((x) => x.id !== ch.id);
    l.push(ligne);
    l.sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure));
    return l;
  });
  await noterMois(m);
}
async function majAtomique(id, muter) {
  let refus = null, ch = null;
  await modifier(cleCh(id), null, (v) => {
    refus = null;
    if (!v) {
      refus = { erreur: "Chantier introuvable.", code: 404 };
      return void 0;
    }
    const r2 = muter(v);
    if (r2 && r2.erreur) {
      refus = r2;
      return void 0;
    }
    v.maj = now();
    ch = v;
    return v;
  });
  return { ch, refus };
}
var refuser = (r2) => erreur(r2.erreur, r2.code || 409);
function journalise(ch, action, detail, par) {
  ch.journal = ch.journal || [];
  ch.journal.push({ ts: now(), a: action, d: detail || "", par: par || "" });
  if (ch.journal.length > 200) ch.journal = ch.journal.slice(-200);
}
function nouveauChantier(c) {
  const modele = MODELES[c.modele] ? c.modele : "Logement meubl\xE9";
  return {
    id: uid(),
    ref: "CHT-046-" + String(Math.floor(Math.random() * 9e3 + 1e3)),
    client: txt(c.client, 120),
    contact: txt(c.contact, 80),
    tel: txt(c.tel, 25),
    email: txt(c.email, 120),
    adresse: txt(c.adresse, 160),
    cp: txt(c.cp, 8),
    ville: txt(c.ville, 60),
    siren: txt(c.siren, 20).replace(/[^\d ]/g, ""),
    prestation: txt(c.prestation, 120) || "Intervention",
    modele,
    surface: Number(c.surface) || 0,
    date: /^\d{4}-\d{2}-\d{2}$/.test(c.date) ? c.date : jourISO(now()),
    heure: /^\d{2}:\d{2}$/.test(c.heure) ? c.heure : "09:00",
    devise: Math.max(0.25, Number(c.devise) || 2),
    taux: Number(c.taux) || 0,
    agentId: txt(c.agentId, 40),
    consignes: txt(c.consignes, 600),
    pieces: neufPieces(modele),
    cons: CONSOMMABLES.map((x) => ({ ...x, q: 0 })),
    obs: "",
    signature: null,
    signataire: "",
    photos: [],
    journal: [],
    arrivee: null,
    depart: null,
    cloture: null,
    cree: now()
  };
}
var echap = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
async function envoiBon(ch, cfg) {
  const cle = process.env.BREVO_API_KEY;
  if (!cle || !ch.email) return { envoye: false, raison: cle ? "pas d'adresse client" : "envoi non configur\xE9" };
  const duree = ((ch.cloture.duree || 0) / 36e5).toFixed(2).replace(".", ",");
  const reserves = (ch.pieces || []).flatMap((p) => p.items.filter((i) => !i.ok).map((i) => `${p.n} \u2014 ${i.l}${i.nc ? " : " + i.nc : ""}`));
  const html = `<div style="font-family:system-ui,sans-serif;color:#10221f;max-width:560px">
      <h2 style="font-weight:600">Intervention termin\xE9e \u2014 ${echap(ch.client)}</h2>
      <p>Bonjour,</p>
      <p>L'intervention du ${new Date(ch.cloture.ts).toLocaleDateString("fr-FR")} est termin\xE9e.</p>
      <p><strong>Bon n\xB0 ${echap(ch.cloture.bon)}</strong><br>
      Dur\xE9e : ${duree} h \xB7 Points valid\xE9s : ${ch.cloture.ok}/${ch.cloture.tot}</p>
      ${ch.obs ? `<p><strong>Observations</strong><br>${echap(ch.obs).replace(/\n/g, "<br>")}</p>` : ""}
      ${reserves.length ? `<p><strong>R\xE9serves</strong><br>${reserves.map(echap).join("<br>")}</p>` : "<p>Aucune r\xE9serve.</p>"}
      <p style="color:#4b605c;font-size:13px;margin-top:24px">${echap(cfg.nom)}${cfg.tel ? " \xB7 " + echap(cfg.tel) : ""}</p>
    </div>`;
  try {
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": cle, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: process.env.MAIL_FROM || cfg.email || "contact@quercy-proprete.fr", name: process.env.MAIL_FROM_NOM || cfg.nom },
        to: [{ email: ch.email }],
        subject: `Bon d'intervention ${ch.cloture.bon} \u2014 ${ch.client}`,
        htmlContent: html
      })
    });
    return { envoye: r.ok, raison: r.ok ? "" : "refus du service d'envoi (" + r.status + ")" };
  } catch {
    return { envoye: false, raison: "service d'envoi injoignable" };
  }
}
var ORIGINES = ["https://quercy-proprete.fr", "https://www.quercy-proprete.fr"];
function cors(req) {
  const o = req.headers.get("origin") || "";
  const ok = ORIGINES.includes(o) || /^https:\/\/[a-z0-9-]+\.netlify\.app$/.test(o);
  return ok ? {
    "access-control-allow-origin": o,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "vary": "origin"
  } : {};
}
function champ(c, ...noms) {
  for (const n of noms) if (c[n] !== void 0 && String(c[n]).trim()) return String(c[n]);
  return "";
}
async function mailPatron(d, cfg) {
  const cle = process.env.BREVO_API_KEY;
  const dest = process.env.MAIL_PATRON || cfg.email;
  if (!cle || !dest) return;
  const html = `<div style="font-family:system-ui,sans-serif;color:#10221f">
    <h2 style="font-weight:600">Nouvelle demande de devis</h2>
    <p><strong>${echap(d.prenom)} ${echap(d.nom)}</strong><br>${echap(d.tel)} \xB7 ${echap(d.email)}</p>
    <p><strong>${echap(d.prestation)}</strong></p><p>${echap(d.message).replace(/\n/g, "<br>")}</p>
    <p style="color:#4b605c;font-size:13px">Ouvrez l'application, onglet Demandes, pour la planifier.</p></div>`;
  try {
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": cle, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: process.env.MAIL_FROM || cfg.email, name: process.env.MAIL_FROM_NOM || cfg.nom },
        to: [{ email: dest }],
        subject: "Nouvelle demande de devis \u2014 " + (d.prenom + " " + d.nom).trim(),
        htmlContent: html
      })
    });
  } catch {
  }
}
var VAPID = null;
async function clesPush() {
  if (VAPID) return VAPID;
  let v = await lire("vapid", null);
  if (!v || !v.publicKey) {
    const neuf = import_web_push.default.generateVAPIDKeys();
    await modifier("vapid", null, (x) => x && x.publicKey ? void 0 : neuf);
    v = await lire("vapid", neuf);
  }
  VAPID = v;
  return v;
}
async function envoiPush(cibles, titre, corpsTxt, donnees) {
  const v = await clesPush();
  const cfg = await entrepriseConf();
  import_web_push.default.setVapidDetails("mailto:" + (cfg.email || "contact@exemple.fr"), v.publicKey, v.privateKey);
  const abos = await lire("push", []);
  const vise = abos.filter((a) => !cibles || cibles.includes(a.agentId));
  if (!vise.length) return 0;
  const charge = JSON.stringify({ titre, corps: corpsTxt, ...donnees || {} });
  const morts = [];
  let envoyes = 0;
  await Promise.all(vise.map(async (a) => {
    try {
      await import_web_push.default.sendNotification(a.abo, charge);
      envoyes++;
    } catch (e) {
      if (e && (e.statusCode === 404 || e.statusCode === 410)) morts.push(a.pt);
    }
  }));
  if (morts.length) await modifier("push", [], (l) => l.filter((x) => !morts.includes(x.pt)));
  return envoyes;
}
var FR_HEURE = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
function minutesParis(t) {
  const [h, m] = FR_HEURE.format(new Date(t)).split(":").map(Number);
  return h % 24 * 60 + m;
}
var enMinutes = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || "");
  return m ? +m[1] * 60 + +m[2] : null;
};
function dureeTxt(h) {
  const m = Math.round(Math.abs(h || 0) * 60), hh = Math.floor(m / 60), mm = m % 60;
  return hh ? hh + " h" + (mm ? " " + String(mm).padStart(2, "0") : "") : mm + " min";
}
var eurosTxt = (n) => (Math.round((n || 0) * 100) / 100).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " \u20AC";
var dateCourte = (iso) => {
  const [a, m, j] = String(iso).split("-");
  return j + "/" + m + "/" + a;
};
var pluriel = (n, mot) => n + " " + mot + (n > 1 ? "s" : "");
async function tacheAlertes() {
  const t = now();
  const cfg = await entrepriseConf();
  const al = cfg.alertes || {};
  const equipe = (await agents() || []).filter((a) => a.actif);
  const patrons = equipe.filter((a) => a.role === "patron").map((a) => a.id);
  if (!patrons.length) return { envoyees: 0 };
  const nomDe = (id) => (equipe.find((a) => a.id === id) || {}).nom || "";
  const auj = jourISO(t), mn = minutesParis(t), demain = jourISO(t + JOUR);
  const vrai = (c) => !c.exemple && !c.demo && c.statut !== "annule";
  const idxAuj = (await indexMois(auj.slice(0, 7))).filter((c) => c.date === auj && vrai(c));
  const cand = [];
  if (al.retard !== false) {
    for (const c of idxAuj) {
      const h = enMinutes(c.heure);
      if (h !== null && c.statut === "prevu" && mn >= h + 15 && mn <= h + 180) {
        const ag = nomDe(c.agentId);
        cand.push({
          cle: "retard:" + c.id,
          cibles: patrons,
          titre: "Retard \xB7 " + c.client,
          corps: "Pr\xE9vu \xE0 " + c.heure + (ag ? " avec " + ag : "") + " : l'arriv\xE9e n'est pas encore point\xE9e.",
          onglet: "tournee"
        });
        if (c.agentId && !patrons.includes(c.agentId))
          cand.push({
            cle: "retard-agent:" + c.id,
            cibles: [c.agentId],
            titre: "Arriv\xE9e non point\xE9e",
            corps: c.client + " \xE9tait pr\xE9vu \xE0 " + c.heure + ". Pensez \xE0 pointer en arrivant.",
            onglet: "tournee"
          });
      }
      if (c.statut === "en-cours" && c.arrivee) {
        const d = (t - c.arrivee) / 36e5, prevu = c.devise || 2;
        if (d > Math.max(prevu + 1.5, prevu * 1.8) && d < 14)
          cand.push({
            cle: "depart:" + c.id,
            cibles: [c.agentId].concat(patrons).filter((x, i, l) => x && l.indexOf(x) === i),
            titre: "D\xE9part non point\xE9 ?",
            corps: c.client + " : sur place depuis " + dureeTxt(d) + " pour " + dureeTxt(prevu) + " pr\xE9vues.",
            onglet: "tournee"
          });
      }
    }
  }
  if (al.veille !== false && mn >= 18 * 60 && mn < 21 * 60) {
    const l2 = (await indexMois(demain.slice(0, 7))).filter((c) => c.date === demain && c.statut === "prevu" && vrai(c) && c.agentId);
    const par = {};
    for (const c of l2) (par[c.agentId] ||= []).push(c);
    for (const [aid, l] of Object.entries(par)) {
      l.sort((a2, b2) => (a2.heure || "").localeCompare(b2.heure || ""));
      const h = l.reduce((s2, c) => s2 + (c.devise || 0), 0);
      cand.push({
        cle: "veille:" + aid + ":" + demain,
        cibles: [aid],
        titre: "Demain : " + pluriel(l.length, "intervention"),
        corps: "Premi\xE8re \xE0 " + l[0].heure + " chez " + l[0].client + (l[0].ville ? ", " + l[0].ville : "") + " \xB7 " + dureeTxt(h) + " au total.",
        onglet: "tournee"
      });
    }
  }
  let factures = null;
  const facturesRetard = async () => {
    factures = factures || await lire("factures", []);
    return factures.filter((f) => f.type === "facture" && f.statut === "a-payer" && f.echeance < auj && !f.demo);
  };
  if (al.matin !== false && mn >= 7 * 60 && mn < 10 * 60) {
    const n2 = idxAuj.length, nAg = new Set(idxAuj.map((c) => c.agentId).filter(Boolean)).size;
    const dem = (await lire("demandes", [])).filter((d) => d.statut === "nouvelle" || d.statut === "vue").length;
    const fr = (await facturesRetard()).length;
    if (n2 || dem || fr)
      cand.push({
        cle: "matin:" + auj,
        cibles: patrons,
        titre: "Aujourd'hui : " + (n2 ? pluriel(n2, "intervention") : "aucune intervention"),
        corps: [
          nAg ? pluriel(nAg, "agent") + " sur le terrain" : "",
          dem ? pluriel(dem, "demande") + " \xE0 traiter" : "",
          fr ? pluriel(fr, "facture") + " en retard" : ""
        ].filter(Boolean).join(" \xB7 ") || "Bonne journ\xE9e.",
        onglet: "tournee"
      });
  }
  if (al.factures !== false && mn >= 9 * 60 && mn < 19 * 60) {
    for (const f of await facturesRetard())
      cand.push({
        cle: "facture:" + f.id,
        cibles: patrons,
        groupe: "factures",
        f,
        titre: "Facture en retard \xB7 " + f.client,
        corps: f.numero + " \xB7 " + eurosTxt(f.ttc) + ", \xE9chue le " + dateCourte(f.echeance) + ".",
        onglet: "factures"
      });
  }
  if (!cand.length) return { envoyees: 0 };
  let neufs = [];
  await modifier("alertes-envoyees", {}, (v) => {
    const garde = {};
    for (const k of Object.keys(v)) if (t - v[k] < 40 * JOUR) garde[k] = v[k];
    neufs = cand.filter((c) => !garde[c.cle]);
    if (!neufs.length && Object.keys(garde).length === Object.keys(v).length) return void 0;
    for (const c of neufs) garde[c.cle] = t;
    return garde;
  });
  const groupe = neufs.filter((c) => c.groupe === "factures");
  const seuls = neufs.filter((c) => c.groupe !== "factures");
  if (groupe.length > 1) seuls.push({
    cibles: patrons,
    onglet: "factures",
    titre: pluriel(groupe.length, "facture") + " en retard",
    corps: eurosTxt(groupe.reduce((s2, c) => s2 + c.f.ttc, 0)) + " \xE0 relancer : " + groupe.map((c) => c.f.client).slice(0, 3).join(", ") + (groupe.length > 3 ? "\u2026" : "") + "."
  });
  else seuls.push(...groupe);
  let n = 0;
  for (const c of seuls) n += await envoiPush(c.cibles, c.titre, c.corps, { onglet: c.onglet, tag: c.cle || c.onglet }).catch(() => 0);
  return { envoyees: n, alertes: seuls.length };
}
async function tachePlanifiee() {
  await ecrire("alertes-verif", now());
  return tacheAlertes();
}
async function alertesSiBesoin() {
  let go = false;
  await modifier("alertes-verif", 0, (v) => {
    if (now() - (Number(v) || 0) < 9 * 6e4) {
      go = false;
      return void 0;
    }
    go = true;
    return now();
  });
  if (go) await tacheAlertes().catch((e) => console.error("alertes:", e && e.stack ? e.stack : e));
}
async function tropDEssais(cles) {
  const t = await lire("essais", {});
  return cles.some((k) => t[k] && now() - t[k].t < 9e5 && t[k].n >= 8);
}
async function noteEchec(cles) {
  await modifier("essais", {}, (v) => {
    const out = {};
    for (const k of Object.keys(v)) if (now() - v[k].t < 9e5) out[k] = v[k];
    for (const k of cles) out[k] = { n: (out[k] && out[k].n || 0) + 1, t: now() };
    return out;
  });
}
async function oublieEchecs(cles) {
  await modifier("essais", {}, (v) => {
    let bouge = false;
    const out = { ...v };
    for (const k of cles) if (out[k]) {
      delete out[k];
      bouge = true;
    }
    return bouge ? out : void 0;
  });
}
async function tropDeDemandesBlob(ip) {
  let trop = false;
  await modifier("envois", {}, (v) => {
    const out = {};
    for (const k of Object.keys(v)) {
      const l2 = v[k].filter((x) => now() - x < 6e5);
      if (l2.length) out[k] = l2;
    }
    const l = out[ip] || [];
    l.push(now());
    out[ip] = l;
    trop = l.length > 5;
    return out;
  });
  return trop;
}
var SIG_DEMO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAABuCAAAAAC48XF6AAAEEklEQVR42u2cW5LrIAxE2Yb2v1DmJ1WZJEjqlsHGSfNz61awEcd6Y0/rGvBoQiBYgiVYgiVYgiUEgiVYgiVYgiVYQiBYgiVYgiVYgiUEgiVYgiVYgiVYQiBYgnUXWGb772W5jA2VY39a62VssBy70zpBxobLsTmt3WDZzK0tYXU9LLPptObvaxNYDylmChPdq7aGneEqUFj//l0Lq7jIJrCeIkwTJthXcceuo5hKrzFKMIvWebDm6lrDFatEazjdN5mqMTkxKL4ZvUxjWPHPfTjdpsN6XMPB4tdpnCcmtzKe7sOq5igOrPBmhXUao1i0IZ4EywqwbDosx2Ua6UpQIv8SOsoLviQ3hqGfDssJxvAafoQaI/FcT+JpnovgsEoq3EjFomhFESpQ2swr+8r+Gbqn2nvj8+wZsGILz7wyAcu52SJYvQ5r/GjdPSClQkD//UILYFnoHd3dLYfVneQj2nTmlf0APQLn66JvOZfCstzWnD2nsIyHFTrHwDrXw+rzYA3t2qnHAj21VOl4zbKDsIbPz3VMDtLUri2/vf9YyDyy0YoF12/D53cEVqypr+gCPbUIVrizVrNChNcIltvwQWrQRFXROZG921xY9jYQKx4/yrD5g6ZhUGLirwQsOxNW0Esf6JC3T6S5chCWxT4OcccsLBuP5PJhpRuHPyz3NK/R4EIoxBUAlu82XtJKQ4Km70ngqGSppgaFzFuykCceJVhJTWVZuyUsPeL6JtiVu3W36sOzu3mwBnv2j1U+uXj7z2k7ribqloE5O3MeQ8FyatOkFZDn3kDZMdZJGFZ3D4qZkz4eFuGOLbaOpH/1ZmwDPYs8BdqEjUz6CKysNLXUP8OtrWHgxRrQlkQmKNUlYUWHcED96Vw9gpW2GCqw8D4y0suGYBHWbUnGwsHKcrmnHXYSVj8FVhY2sozFda7hAZCFDrsb5mzD4xy8xQzDsrTflExwc6KesiJaIo/fiI7TMljwsQ94huboB1yne7+VWk55jw6FBdVQSRjGzyAR4UtvROBHRgwsC98ICa0/+B1WD6gT29lhfSEs9L9Zil+ypfMGfIA4F1ZyILc1rcmwkL4Pe9S7x9v1oBQgLPylNvZcfI8vETApKFhQ4+cWn2PURqMqQ8jGfxNWLzZ+vpVVBVauONa/khUBa8WXFl8P63dZMbBWfB32C7C6YKU57Y+zClo0XbBgWMfq8/0G+O7PRFg3DIUWjbWwOtLAPCjSCZCK8tF/XsUOiHYlpHzWAljFp7ccWmUtdn6bjYiafxGkqudoqxD1xdSm8wdu05YjmkxttWlH92u8ZOeErLMhIWEMhrVNoL8wH2kVwldCu0+5cyG1+9WGV1C7bSH940OwBEuwBEuwBEtDsARLsARLsARLQ7CI8Qd4p+Obb13WxgAAAABJRU5ErkJggg==";
async function poserExemples(par) {
  const dejaLa = await lire("config", {});
  const propose = {
    nom: "Quercy Propret\xE9",
    adresse: "12 avenue Jean Jaur\xE8s",
    cp: "46000",
    ville: "Cahors",
    tel: "05 65 00 00 00",
    email: "contact@quercy-proprete.fr",
    taux: 28,
    tva: 20,
    mentions: "Paiement \xE0 r\xE9ception de facture. Intervention sur devis accept\xE9."
  };
  const fusion = { ...propose };
  for (const k of Object.keys(dejaLa)) if (dejaLa[k] !== "" && dejaLa[k] !== null && dejaLa[k] !== void 0) fusion[k] = dejaLa[k];
  await ecrire("config", fusion);
  const liste = await agents() || [];
  const exemples = [
    { nom: "Sandrine", code: "sandrine", pin: "245780", tel: "06 12 00 00 01" },
    { nom: "Karim", code: "karim", pin: "319642", tel: "06 12 00 00 02" },
    { nom: "L\xE9a", code: "lea", pin: "670183", tel: "06 12 00 00 03" }
  ];
  exemples.forEach((e, i) => {
    if (liste.some((a) => a.code === e.code)) return;
    const sel = randomBytes(16).toString("hex");
    liste.push({
      id: uid(),
      nom: e.nom,
      code: e.code,
      role: "agent",
      tel: e.tel,
      couleur: COULEURS[(i + 1) % COULEURS.length],
      sel,
      hash: hachePin(e.pin, sel),
      actif: true,
      photo: false,
      cree: now(),
      exemple: true
    });
  });
  await ecrire("agents", liste);
  const parCode = (c) => (liste.find((a) => a.code === c) || {}).id || "";
  const j = (n) => jourISO(now() + n * JOUR);
  const modeles = [
    {
      client: "G\xEEte du Causse",
      contact: "Mme Vidal",
      tel: "06 12 34 56 78",
      email: "",
      adresse: "Lieu-dit Les Vignes",
      cp: "46090",
      ville: "Esp\xE8re",
      surface: 92,
      prestation: "Changement de locataires",
      modele: "Logement meubl\xE9",
      devise: 3,
      taux: 30,
      consignes: "Bo\xEEte \xE0 cl\xE9s \xE0 gauche du portail, code 4821. Draps dans le placard du couloir.",
      agent: "sandrine",
      date: j(0),
      heure: "10:00"
    },
    {
      client: "Cabinet Lafon",
      contact: "M. Lafon",
      tel: "05 65 11 22 33",
      email: "",
      adresse: "12 boulevard Gambetta",
      cp: "46000",
      ville: "Cahors",
      surface: 140,
      prestation: "Entretien de bureaux",
      modele: "Bureaux et locaux",
      devise: 2,
      taux: 28,
      consignes: "Passage apr\xE8s 18 h. Code alarme communiqu\xE9 par le g\xE9rant.",
      agent: "karim",
      date: j(0),
      heure: "18:30"
    },
    {
      client: "R\xE9sidence Les Terrasses",
      contact: "Syndic Quercy Immo",
      tel: "",
      email: "",
      adresse: "8 avenue Charles de Freycinet",
      cp: "46000",
      ville: "Cahors",
      surface: 0,
      prestation: "Parties communes",
      modele: "Parties communes",
      devise: 2,
      taux: 26,
      consignes: "Hall, trois cages d'escalier et local poubelles.",
      agent: "lea",
      date: j(0),
      heure: "14:30"
    },
    {
      client: "Mme Durand",
      contact: "",
      tel: "06 98 76 54 32",
      email: "",
      adresse: "4 rue du Ch\xE2teau du Roi",
      cp: "46000",
      ville: "Cahors",
      surface: 68,
      prestation: "M\xE9nage r\xE9current",
      modele: "Logement meubl\xE9",
      devise: 1.5,
      taux: 28,
      consignes: "Chat \xE0 ne pas laisser sortir.",
      agent: "sandrine",
      date: j(1),
      heure: "09:00"
    },
    {
      client: "Studio Valentr\xE9",
      contact: "M. Pons",
      tel: "06 44 55 66 77",
      email: "",
      adresse: "3 quai de Regourd",
      cp: "46000",
      ville: "Cahors",
      surface: 34,
      prestation: "Changement de locataires",
      modele: "Logement meubl\xE9",
      devise: 1.5,
      taux: 30,
      consignes: "Arriv\xE9e des voyageurs \xE0 16 h.",
      agent: "lea",
      date: j(1),
      heure: "11:00"
    },
    {
      client: "Villa des Pechs",
      contact: "Mme Rouquette",
      tel: "",
      email: "",
      adresse: "Route de Pradines",
      cp: "46090",
      ville: "Pradines",
      surface: 180,
      prestation: "Remise en \xE9tat",
      modele: "Remise en \xE9tat",
      devise: 6,
      taux: 32,
      consignes: "Fin de bail, \xE9tat des lieux le lendemain.",
      agent: "karim",
      date: j(2),
      heure: "08:30"
    }
  ];
  let ajoutes = 0;
  for (const m of modeles) {
    const ch = nouveauChantier({ ...m, agentId: parCode(m.agent) });
    ch.exemple = true;
    journalise(ch, "Chantier cr\xE9\xE9", "jeu d'exemple", par);
    await majChantier(ch);
    await majIndex(ch);
    ajoutes++;
  }
  const veille = nouveauChantier({
    client: "Maison du Barry",
    contact: "M. Delpech",
    tel: "06 21 43 65 87",
    email: "",
    adresse: "17 rue du Barry",
    cp: "46090",
    ville: "Mercu\xE8s",
    surface: 110,
    prestation: "Changement de locataires",
    modele: "Logement meubl\xE9",
    devise: 3,
    taux: 30,
    agentId: parCode("sandrine"),
    date: j(-1),
    heure: "09:30"
  });
  veille.exemple = true;
  const base = (/* @__PURE__ */ new Date(j(-1) + "T09:34:00")).getTime();
  veille.arrivee = base;
  veille.depart = base + 2 * 36e5 + 47 * 6e4;
  veille.pieces.forEach((p) => p.items.forEach((i) => {
    i.ok = true;
    i.ts = base + 36e5;
  }));
  const vitres = veille.pieces.find((p) => p.n === "S\xE9jour").items[1];
  vitres.ok = false;
  vitres.nc = "Vitres ext\xE9rieures inaccessibles, \xE9chafaudage du voisin. \xC0 reprendre au prochain passage.";
  veille.cons[0].q = 3;
  veille.cons[2].q = 4;
  veille.cons[4].q = 1;
  veille.obs = "Logement pr\xEAt pour l'arriv\xE9e de 16 h. Ampoule du couloir \xE0 remplacer, signal\xE9e au propri\xE9taire.";
  veille.signature = SIG_DEMO;
  veille.signatureTs = veille.depart;
  veille.signataire = "M. Delpech";
  journalise(veille, "Arriv\xE9e sur site", "", "Sandrine");
  journalise(veille, "R\xE9serve", "S\xE9jour \u2014 Vitres int\xE9rieures et miroirs", "Sandrine");
  journalise(veille, "D\xE9part du site", "", "Sandrine");
  journalise(veille, "Signature du client", "M. Delpech", "Sandrine");
  const annee = jourISO(now()).slice(0, 4);
  let compteur = 0;
  await modifier("compteur-" + annee, 0, (v) => {
    compteur = (Number(v) || 0) + 1;
    return compteur;
  });
  const items = veille.pieces.flatMap((p) => p.items);
  veille.cloture = {
    ts: veille.depart + 12e4,
    duree: veille.depart - veille.arrivee,
    ok: items.filter((i) => i.ok).length,
    tot: items.length,
    res: items.filter((i) => !i.ok).length,
    bon: "BI-" + annee + "-" + String(compteur).padStart(4, "0"),
    par: "Sandrine",
    mail: { envoye: false, raison: "envoi non configur\xE9" }
  };
  journalise(veille, "Intervention cl\xF4tur\xE9e", veille.cloture.bon, "Sandrine");
  await majChantier(veille);
  await majIndex(veille);
  ajoutes++;
  return { agents: exemples.length, chantiers: ajoutes };
}
async function effacerExemples() {
  const idx = await index();
  let n = 0;
  for (const l of idx.slice()) {
    const ch = await chantier(l.id);
    if (ch && ch.exemple) {
      for (const p of ch.photos || []) await phStore().delete(ch.id + "/" + p.id).catch(() => {
      });
      await app().delete(cleCh(ch.id)).catch(() => {
      });
      await majIndex({ id: ch.id, date: ch.date }, true);
      n++;
    }
  }
  const liste = await agents() || [];
  const restants = liste.filter((a) => !a.exemple);
  if (restants.length) await ecrire("agents", restants);
  return { chantiers: n };
}
var api_default = async (req) => {
  await secret();
  await migrerIndex().catch(() => {
  });
  const url = new URL(req.url);
  const route = url.pathname.replace(/^.*\/api\//, "").replace(/^\/+|\/+$/g, "");
  let corps = {};
  if (req.method === "POST") {
    const brut = await req.text().catch(() => "");
    try {
      corps = JSON.parse(brut || "{}");
    } catch {
      corps = Object.fromEntries(new URLSearchParams(brut));
    }
  }
  const moi = await session(req);
  const exige = (role) => {
    if (!moi) return erreur("Connexion requise.", 401);
    if (role === "patron" && moi.role !== "patron") return erreur("R\xE9serv\xE9 au responsable.", 403);
    return null;
  };
  try {
    if (route === "ping") return json({ ok: true, serveur: "en ligne", heure: (/* @__PURE__ */ new Date()).toISOString() });
    if (route === "demande" && req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
    if (route === "demande" && req.method === "POST") {
      const h = cors(req);
      if (champ(corps, "_honey", "site_web")) return json({ ok: true }, 200, h);
      const ip = req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "?";
      if (await tropDeDemandesBlob(ip)) return json({ erreur: "Trop de demandes, r\xE9essayez plus tard." }, 429, h);
      const d = {
        id: uid(),
        recu: now(),
        statut: "nouvelle",
        source: txt(champ(corps, "source"), 40) || "site",
        prenom: txt(champ(corps, "prenom", "fname", "Pr\xE9nom", "Prenom"), 60),
        nom: txt(champ(corps, "nom", "lname", "Nom"), 60),
        email: txt(champ(corps, "email", "Email", "mail"), 120),
        tel: txt(champ(corps, "tel", "phone", "telephone", "T\xE9l\xE9phone", "Telephone"), 25),
        prestation: txt(champ(corps, "prestation", "service", "Prestation", "Type de prestation"), 80),
        message: txt(champ(corps, "message", "besoin", "Message", "Votre besoin"), 2e3),
        adresse: txt(champ(corps, "adresse"), 160),
        ville: txt(champ(corps, "ville"), 60)
      };
      if (!d.nom && !d.prenom && !d.tel && !d.email) return json({ erreur: "Demande vide." }, 400, h);
      await modifier("demandes", [], (v) => [d].concat(v).slice(0, 2e3));
      await mailPatron(d, await entrepriseConf());
      const patrons = (await agents() || []).filter((a) => a.role === "patron" && a.actif).map((a) => a.id);
      await envoiPush(
        patrons,
        "Nouvelle demande de devis",
        ((d.prenom + " " + d.nom).trim() || "Sans nom") + (d.prestation ? " \u2014 " + d.prestation : ""),
        { onglet: "demandes" }
      ).catch(() => {
      });
      return json({ ok: true }, 200, h);
    }
    if (route === "etat") {
      const liste = await agents();
      let nouvelles = 0;
      if (moi && moi.role === "patron")
        nouvelles = (await lire("demandes", [])).filter((d) => d.statut === "nouvelle").length;
      if (moi) await alertesSiBesoin().catch(() => {
      });
      return json({
        moi,
        installation: !liste || !liste.length,
        nouvelles,
        version: 3,
        modeles: Object.keys(MODELES),
        prestations: PRESTATIONS,
        entreprise: moi ? await entrepriseConf() : null,
        agents: moi ? (liste || []).filter((a) => a.actif).map(({ id, nom, couleur, photo, role }) => ({ id, nom, couleur, photo: !!photo, role })) : []
      });
    }
    if (route === "installation" && req.method === "POST") {
      const liste = await agents();
      if (liste && liste.length) return erreur("L'application est d\xE9j\xE0 install\xE9e.", 409);
      const pin = String(corps.pin || "");
      if (!/^\d{6}$/.test(pin)) return erreur("Le code doit comporter exactement 6 chiffres.", 400);
      const sel = randomBytes(16).toString("hex");
      const patron = {
        id: uid(),
        nom: txt(corps.nom, 60) || "Responsable",
        code: "patron",
        role: "patron",
        couleur: COULEURS[0],
        tel: "",
        sel,
        hash: hachePin(pin, sel),
        actif: true,
        photo: false,
        cree: now()
      };
      await ecrire("agents", [patron]);
      return json(
        { moi: { id: patron.id, nom: patron.nom, code: "patron", role: "patron", couleur: patron.couleur } },
        200,
        { "set-cookie": poseCookie(signe({ id: patron.id, exp: now() + SESSION_MS })) }
      );
    }
    if (route === "connexion" && req.method === "POST") {
      const ip = req.headers.get("x-nf-client-connection-ip") || "?";
      const code = txt(corps.code, 40).toLowerCase();
      const cles = ["ip:" + ip, "compte:" + code];
      if (await tropDEssais(cles)) return erreur("Trop d'essais. R\xE9essayez dans un quart d'heure.", 429);
      const liste = await agents() || [];
      const a = liste.find((x) => x.code === code && x.actif);
      if (!a || !pinValide(String(corps.pin || ""), a)) {
        await noteEchec(cles);
        await new Promise((r2) => setTimeout(r2, 400));
        return erreur("Identifiant ou code incorrect.", 401);
      }
      await oublieEchecs(cles);
      return json(
        { moi: { id: a.id, nom: a.nom, code: a.code, role: a.role, couleur: a.couleur, photo: !!a.photo } },
        200,
        { "set-cookie": poseCookie(signe({ id: a.id, exp: now() + SESSION_MS })) }
      );
    }
    if (route === "deconnexion") return json({ ok: true }, 200, { "set-cookie": videCookie() });
    if (route === "tournee") {
      const r = exige();
      if (r) return r;
      const d = url.searchParams.get("d") || jourISO(now());
      const idx = await indexMois(String(d).slice(0, 7));
      const liste = idx.filter((c) => c.date === d && c.statut !== "annule" && (moi.role === "patron" || c.agentId === moi.id));
      await Promise.all(liste.filter((c) => c.adresse === void 0).map(async (c) => {
        const ch = await chantier(c.id);
        if (ch) {
          c.adresse = ch.adresse || "";
          c.cp = ch.cp || "";
          c.arrivee = ch.arrivee || null;
        }
      }));
      const heures = liste.reduce((s, c) => s + (c.devise || 0), 0);
      return json({ date: d, chantiers: liste, heures, serveur: now() });
    }
    if (route === "chantier") {
      const r = exige();
      if (r) return r;
      const ch = await chantier(url.searchParams.get("id"));
      if (!ch) return erreur("Chantier introuvable.", 404);
      if (moi.role !== "patron" && ch.agentId !== moi.id) return erreur("Ce chantier n'est pas le v\xF4tre.", 403);
      return json({ chantier: ch });
    }
    if (route === "pointage" && req.method === "POST") {
      const r = exige();
      if (r) return r;
      const serveur = now();
      const { ch, refus } = await majAtomique(corps.id, (ch2) => {
        if (moi.role !== "patron" && ch2.agentId !== moi.id) return { erreur: "Ce chantier n'est pas le v\xF4tre.", code: 403 };
        if (ch2.cloture) return { erreur: "Chantier d\xE9j\xE0 cl\xF4tur\xE9." };
        const declare = Number(corps.declareA) || 0;
        const plancher = Math.max(serveur - 12 * 36e5, ch2.arrivee ? ch2.arrivee + 1e3 : 0);
        const valide = declare > 0 && declare <= serveur + 6e4 && declare >= plancher;
        const horsLigne = valide && Math.abs(serveur - declare) > 12e4;
        const heure = horsLigne ? declare : serveur;
        const suffixe = horsLigne ? "heure d\xE9clar\xE9e hors r\xE9seau, re\xE7ue \xE0 " + new Date(serveur).toLocaleTimeString("fr-FR") : "";
        if (corps.type === "arrivee") {
          if (ch2.arrivee) return { erreur: "Arriv\xE9e d\xE9j\xE0 point\xE9e." };
          ch2.arrivee = heure;
          ch2.arriveeServeur = serveur;
          ch2.arriveeDifferee = horsLigne;
          journalise(ch2, "Arriv\xE9e sur site", suffixe, moi.nom);
        } else if (corps.type === "depart") {
          if (!ch2.arrivee) return { erreur: "Pointez d'abord l'arriv\xE9e." };
          if (ch2.depart) return { erreur: "D\xE9part d\xE9j\xE0 point\xE9." };
          ch2.depart = heure;
          ch2.departServeur = serveur;
          ch2.departDiffere = horsLigne;
          journalise(ch2, "D\xE9part du site", suffixe, moi.nom);
        } else if (corps.type === "correction") {
          if (!ch2.arrivee) return { erreur: "Correction impossible." };
          const v = Number(corps.valeur);
          if (!v || v <= ch2.arrivee || v > ch2.arrivee + 24 * 36e5) return { erreur: "Heure de d\xE9part invalide.", code: 400 };
          ch2.depart = v;
          ch2.corrige = true;
          ch2.departServeur = serveur;
          journalise(ch2, "Pointage corrig\xE9", "d\xE9part fix\xE9 \xE0 " + new Date(v).toLocaleTimeString("fr-FR"), moi.nom);
        } else return { erreur: "Type de pointage inconnu.", code: 400 };
      });
      if (refus) return refuser(refus);
      await majIndex(ch);
      return json({ chantier: ch });
    }
    if (route === "releve" && req.method === "POST") {
      const r = exige();
      if (r) return r;
      const { ch, refus } = await majAtomique(corps.id, (ch3) => {
        if (moi.role !== "patron" && ch3.agentId !== moi.id) return { erreur: "Ce chantier n'est pas le v\xF4tre.", code: 403 };
        if (ch3.cloture) return { erreur: "Chantier cl\xF4tur\xE9, plus modifiable." };
        const ch2 = ch3;
        if (Array.isArray(corps.pieces)) {
          ch2.pieces.forEach((p, pi) => {
            const src = corps.pieces[pi];
            if (!src || !Array.isArray(src.items)) return;
            p.items.forEach((it, ii) => {
              const s = src.items[ii];
              if (!s) return;
              if (typeof s.ok === "boolean" && s.ok !== it.ok) {
                it.ok = s.ok;
                it.ts = now();
                journalise(ch2, s.ok ? "Point valid\xE9" : "Point d\xE9coch\xE9", p.n + " \u2014 " + it.l, moi.nom);
              }
              if (typeof s.nc === "string" && s.nc !== it.nc) {
                it.nc = s.nc.slice(0, 600);
                if (it.nc.trim()) journalise(ch2, "R\xE9serve", p.n + " \u2014 " + it.l, moi.nom);
              }
            });
          });
        }
        if (Array.isArray(corps.cons)) ch2.cons.forEach((c, i) => {
          const q = Number(corps.cons[i]);
          if (q >= 0) c.q = Math.min(99, Math.round(q));
        });
        if (typeof corps.obs === "string") ch2.obs = corps.obs.slice(0, 3e3);
        if (typeof corps.signataire === "string") ch2.signataire = txt(corps.signataire, 120);
      });
      if (refus) return refuser(refus);
      return json({ ok: true, maj: ch.maj });
    }
    if (route === "signature" && req.method === "POST") {
      const r = exige();
      if (r) return r;
      const d = String(corps.data || "");
      if (corps.data !== null && (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(d) || d.length > 4e5))
        return erreur("Signature invalide.", 400);
      const { ch, refus } = await majAtomique(corps.id, (ch2) => {
        if (moi.role !== "patron" && ch2.agentId !== moi.id) return { erreur: "Ce chantier n'est pas le v\xF4tre.", code: 403 };
        if (ch2.cloture) return { erreur: "Chantier cl\xF4tur\xE9." };
        if (corps.data === null) {
          ch2.signature = null;
          ch2.signatureTs = 0;
          journalise(ch2, "Signature effac\xE9e", "", moi.nom);
        } else {
          ch2.signature = d;
          ch2.signatureTs = now();
          if (typeof corps.nom === "string") ch2.signataire = txt(corps.nom, 120);
          journalise(ch2, "Signature du client", ch2.signataire || "", moi.nom);
        }
      });
      if (refus) return refuser(refus);
      return json({ ok: true, signatureTs: ch.signatureTs || null });
    }
    if (route === "photo" && req.method === "POST") {
      const r = exige();
      if (r) return r;
      const d = String(corps.data || "");
      if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(d) || d.length > 6e5) return erreur("Photo invalide ou trop lourde.", 400);
      const avant = await chantier(corps.id);
      if (!avant) return erreur("Chantier introuvable.", 404);
      if (moi.role !== "patron" && avant.agentId !== moi.id) return erreur("Ce chantier n'est pas le v\xF4tre.", 403);
      const pid = corps.pid && /^[\w-]{4,40}$/.test(corps.pid) ? corps.pid : uid();
      if ((avant.photos || []).some((p) => p.id === pid)) return json({ ok: true, id: pid });
      await phStore().set(corps.id + "/" + pid, d.slice("data:image/jpeg;base64,".length));
      const { refus } = await majAtomique(corps.id, (ch2) => {
        if (ch2.cloture) return { erreur: "Chantier cl\xF4tur\xE9." };
        ch2.photos = ch2.photos || [];
        if (ch2.photos.length >= 30) return { erreur: "30 photos maximum par chantier." };
        if (ch2.photos.some((p) => p.id === pid)) return;
        ch2.photos.push({ id: pid, piece: txt(corps.piece, 60), slot: corps.slot === "apres" ? "apres" : "avant", ts: now() });
        journalise(ch2, "Photo ajout\xE9e", corps.piece + " \xB7 " + (corps.slot === "apres" ? "apr\xE8s" : "avant"), moi.nom);
      });
      if (refus) {
        await phStore().delete(corps.id + "/" + pid).catch(() => {
        });
        return refuser(refus);
      }
      return json({ ok: true, id: pid });
    }
    if (route === "photo-suppr" && req.method === "POST") {
      const r = exige();
      if (r) return r;
      const { refus } = await majAtomique(corps.id, (ch2) => {
        if (ch2.cloture) return { erreur: "Suppression impossible." };
        if (moi.role !== "patron" && ch2.agentId !== moi.id) return { erreur: "Ce chantier n'est pas le v\xF4tre.", code: 403 };
        ch2.photos = (ch2.photos || []).filter((p) => p.id !== corps.pid);
        journalise(ch2, "Photo supprim\xE9e", "", moi.nom);
      });
      if (refus) return refuser(refus);
      await phStore().delete(corps.id + "/" + txt(corps.pid, 40)).catch(() => {
      });
      return json({ ok: true });
    }
    if (route === "photo-fichier") {
      const r = exige();
      if (r) return r;
      const cid = txt(url.searchParams.get("c"), 40);
      if (moi.role !== "patron") {
        const ch = await chantier(cid);
        if (!ch || ch.agentId !== moi.id) return erreur("Ce chantier n'est pas le v\xF4tre.", 403);
      }
      const b64 = await phStore().get(cid + "/" + txt(url.searchParams.get("p"), 40), { type: "text" });
      if (!b64) return erreur("Photo introuvable.", 404);
      return new Response(
        Buffer.from(b64, "base64"),
        { headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=86400" } }
      );
    }
    if (route === "agent-photo" && req.method === "POST") {
      const r = exige();
      if (r) return r;
      const cible = txt(corps.id, 40) || moi.id;
      if (cible !== moi.id && moi.role !== "patron") return erreur("R\xE9serv\xE9 au responsable.", 403);
      const liste = await agents() || [];
      const a = liste.find((x) => x.id === cible);
      if (!a) return erreur("Agent introuvable.", 404);
      if (corps.data === null) {
        await phStore().delete("agents/" + cible).catch(() => {
        });
        a.photo = false;
      } else {
        const d = String(corps.data || "");
        if (!d.startsWith("data:image/jpeg;base64,") || d.length > 3e5) return erreur("Photo invalide ou trop lourde.", 400);
        await phStore().set("agents/" + cible, d.slice("data:image/jpeg;base64,".length));
        a.photo = true;
      }
      await modifier("agents", [], (v) => {
        const x = v.find((y) => y.id === cible);
        if (x) x.photo = a.photo;
        return v;
      });
      return json({ ok: true, photo: a.photo });
    }
    if (route === "agent-photo") {
      const r = exige();
      if (r) return r;
      const b64 = await phStore().get("agents/" + url.searchParams.get("id"), { type: "text" });
      if (!b64) return erreur("Pas de photo.", 404);
      return new Response(
        Buffer.from(b64, "base64"),
        { headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=3600" } }
      );
    }
    if (route === "cloture" && req.method === "POST") {
      const r = exige();
      if (r) return r;
      const av = await chantier(corps.id);
      if (!av) return erreur("Chantier introuvable.", 404);
      if (moi.role !== "patron" && av.agentId !== moi.id) return erreur("Ce chantier n'est pas le v\xF4tre.", 403);
      if (av.cloture) return erreur("D\xE9j\xE0 cl\xF4tur\xE9.", 409);
      if (!av.depart) return erreur("Pointez le d\xE9part avant de cl\xF4turer.", 409);
      if (!av.signature || !String(av.signataire || "").trim()) return erreur("Signature et nom du client requis.", 409);
      const bloquants0 = av.pieces.flatMap((p) => p.items).filter((i) => i.crit && !i.ok && !String(i.nc || "").trim());
      if (bloquants0.length) return erreur(bloquants0.length + " point(s) critique(s) sans motif.", 409);
      const annee = jourISO(now()).slice(0, 4);
      let compteur = 0;
      await modifier("compteur-" + annee, 0, (v) => {
        compteur = (Number(v) || 0) + 1;
        return compteur;
      });
      const numero = "BI-" + annee + "-" + String(compteur).padStart(4, "0");
      const { ch, refus } = await majAtomique(corps.id, (ch2) => {
        if (ch2.cloture) return { erreur: "D\xE9j\xE0 cl\xF4tur\xE9." };
        if (!ch2.depart) return { erreur: "Pointez le d\xE9part avant de cl\xF4turer." };
        if (!ch2.signature || !String(ch2.signataire || "").trim()) return { erreur: "Signature et nom du client requis." };
        const items = ch2.pieces.flatMap((p) => p.items);
        const bloquants = items.filter((i) => i.crit && !i.ok && !String(i.nc || "").trim());
        if (bloquants.length) return { erreur: bloquants.length + " point(s) critique(s) sans motif." };
        ch2.cloture = {
          ts: now(),
          duree: ch2.depart - ch2.arrivee,
          ok: items.filter((i) => i.ok).length,
          tot: items.length,
          res: items.filter((i) => !i.ok).length,
          bon: numero,
          par: moi.nom
        };
        journalise(ch2, "Intervention cl\xF4tur\xE9e", numero, moi.nom);
      });
      if (refus) return refuser(refus);
      const envoi = await envoiBon(ch, await entrepriseConf());
      await majAtomique(corps.id, (ch2) => {
        if (ch2.cloture) ch2.cloture.mail = envoi;
      });
      ch.cloture.mail = envoi;
      await majIndex(ch);
      return json({ chantier: ch, mail: envoi });
    }
    if (route === "agents") {
      const r = exige("patron");
      if (r) return r;
      const liste = await agents() || [];
      return json({ agents: liste.map(({ id, nom, code, role, actif, couleur, tel, photo, exemple }) => ({ id, nom, code, role, actif, couleur, tel, photo: !!photo, exemple: !!exemple })) });
    }
    if (route === "agent" && req.method === "POST") {
      const r = exige("patron");
      if (r) return r;
      const liste = await agents() || [];
      if (corps.supprimer) {
        if (corps.supprimer === moi.id) return erreur("Vous ne pouvez pas d\xE9sactiver votre propre compte.", 400);
        await modifier("agents", [], (v) => {
          const a = v.find((x) => x.id === corps.supprimer);
          if (a) a.actif = false;
          return v;
        });
        let repris = 0;
        if (txt(corps.remplacant, 40)) {
          const auj = jourISO(now());
          for (const l of await index(auj.slice(0, 7))) {
            if (l.agentId !== corps.supprimer || l.date < auj || l.statut === "cloture") continue;
            const ch = await chantier(l.id);
            if (!ch) continue;
            ch.agentId = txt(corps.remplacant, 40);
            journalise(ch, "Chantier r\xE9attribu\xE9", "d\xE9sactivation d'un agent", moi.nom);
            await majChantier(ch);
            await majIndex(ch);
            repris++;
          }
        }
        return json({ ok: true, repris });
      }
      const code = txt(corps.code, 24).toLowerCase();
      const pin = String(corps.pin || "");
      if (!/^[a-z0-9._-]{3,24}$/.test(code)) return erreur("Identifiant : 3 \xE0 24 caract\xE8res, lettres et chiffres.", 400);
      if (!/^\d{6}$/.test(pin)) return erreur("Le code doit comporter 6 chiffres.", 400);
      const sel = randomBytes(16).toString("hex");
      let idFinal = "";
      await modifier("agents", [], (v) => {
        const e2 = v.find((x) => x.code === code);
        if (e2) {
          e2.sel = sel;
          e2.hash = hachePin(pin, sel);
          e2.actif = true;
          if (corps.nom) e2.nom = txt(corps.nom, 60);
          if (corps.tel !== void 0) e2.tel = txt(corps.tel, 25);
          if (corps.couleur) e2.couleur = txt(corps.couleur, 9);
          idFinal = e2.id;
        } else {
          const neuf = {
            id: uid(),
            nom: txt(corps.nom, 60) || code,
            code,
            role: corps.role === "patron" ? "patron" : "agent",
            tel: txt(corps.tel, 25),
            couleur: txt(corps.couleur, 9) || COULEURS[v.length % COULEURS.length],
            sel,
            hash: hachePin(pin, sel),
            actif: true,
            photo: false,
            cree: now()
          };
          idFinal = neuf.id;
          v.push(neuf);
        }
        return v;
      });
      return json({ ok: true, id: idFinal });
    }
    if (route === "entreprise" && req.method === "POST") {
      const r = exige("patron");
      if (r) return r;
      const c = await entrepriseConf();
      ["nom", "adresse", "cp", "ville", "tel", "email", "siret", "iban", "bic", "tvaIntra", "sap", "sapDate", "mentions", "conditions"].forEach((k) => {
        if (corps[k] !== void 0) c[k] = txt(corps[k], k === "mentions" || k === "conditions" ? 600 : 160);
      });
      if (corps.avisGoogle !== void 0) {
        const u = txt(corps.avisGoogle, 400);
        c.avisGoogle = /^https:\/\/[^\s"'<>]+$/.test(u) ? u : "";
      }
      if (corps.alertes && typeof corps.alertes === "object") {
        for (const k of Object.keys(CONFIG_DEFAUT.alertes)) if (typeof corps.alertes[k] === "boolean") c.alertes[k] = corps.alertes[k];
      }
      if (corps.taux !== void 0) c.taux = Math.max(0, Number(corps.taux) || 0);
      if (corps.tva !== void 0) c.tva = [0, 5.5, 10, 20].includes(Number(corps.tva)) ? Number(corps.tva) : c.tva;
      await ecrire("config", c);
      return json({ entreprise: c });
    }
    if (route === "chantier-nouveau" && req.method === "POST") {
      const r = exige("patron");
      if (r) return r;
      if (!txt(corps.client, 120)) return erreur("Le nom du client est obligatoire.", 400);
      const rec = ["aucune", "hebdo", "quinzaine", "mensuel"].includes(corps.recurrence) ? corps.recurrence : "aucune";
      const occ = rec === "aucune" ? 1 : Math.max(1, Math.min(26, parseInt(corps.occurrences, 10) || 4));
      const serie = occ > 1 ? uid() : null;
      let date = /^\d{4}-\d{2}-\d{2}$/.test(corps.date) ? corps.date : jourISO(now());
      const depart0 = date;
      let reprises = [];
      if (corps.reprendre !== false) {
        const nomClient = txt(corps.client, 120).trim().toLowerCase();
        const passes = (await index()).filter((c) => c.statut === "cloture" && (c.client || "").trim().toLowerCase() === nomClient);
        const dernier = passes[passes.length - 1];
        if (dernier) {
          const ancien = await chantier(dernier.id);
          if (ancien) reprises = (ancien.pieces || []).flatMap((p) => p.items.filter((i) => !i.ok && String(i.nc || "").trim()).map((i) => ({ piece: p.n, point: i.l, motif: i.nc, date: ancien.date })));
        }
      }
      const crees = [];
      for (let k = 0; k < occ; k++) {
        const ch = nouveauChantier({ ...corps, date });
        if (serie) {
          ch.serieId = serie;
          ch.recurrence = rec;
        }
        if (k === 0 && reprises.length) ch.reprises = reprises.slice(0, 12);
        journalise(ch, "Chantier cr\xE9\xE9", occ > 1 ? "s\xE9rie de " + occ : "", moi.nom);
        await majChantier(ch);
        await majIndex(ch);
        crees.push(ch.id);
        const d = /* @__PURE__ */ new Date(date + "T12:00:00");
        if (rec === "hebdo") d.setDate(d.getDate() + 7);
        else if (rec === "quinzaine") d.setDate(d.getDate() + 14);
        else if (rec === "mensuel") {
          const jourAncre = Number(depart0.slice(8, 10));
          const cible = new Date(d.getFullYear(), d.getMonth() + 1, 1, 12, 0, 0);
          const dansLeMois = new Date(cible.getFullYear(), cible.getMonth() + 1, 0).getDate();
          cible.setDate(Math.min(jourAncre, dansLeMois));
          d.setTime(cible.getTime());
        }
        date = jourISO(d);
      }
      const agentCible = txt(corps.agentId, 40);
      if (agentCible && agentCible !== moi.id)
        await envoiPush(
          [agentCible],
          occ > 1 ? occ + " interventions planifi\xE9es" : "Nouvelle intervention",
          txt(corps.client, 120) + " \xB7 " + depart0,
          { onglet: "tournee" }
        ).catch(() => {
        });
      return json({ ok: true, crees: crees.length, id: crees[0], reprises: reprises.length });
    }
    if (route === "chantier-modif" && req.method === "POST") {
      const r = exige("patron");
      if (r) return r;
      const ch = await chantier(corps.id);
      if (!ch) return erreur("Chantier introuvable.", 404);
      if (ch.cloture) return erreur("Chantier cl\xF4tur\xE9, plus modifiable.", 409);
      if (ch.arrivee && (corps.date || corps.heure || corps.agentId)) {
        delete corps.date;
        delete corps.heure;
        delete corps.agentId;
      }
      const ancienneDate = ch.date, ancienAgent = ch.agentId;
      ["client", "contact", "tel", "email", "adresse", "cp", "ville", "prestation", "consignes", "siren"].forEach((k) => {
        if (corps[k] !== void 0) ch[k] = txt(corps[k], k === "consignes" ? 600 : 160);
      });
      if (/^\d{4}-\d{2}-\d{2}$/.test(corps.date)) ch.date = corps.date;
      if (/^\d{2}:\d{2}$/.test(corps.heure)) ch.heure = corps.heure;
      if (corps.devise !== void 0) ch.devise = Math.max(0.25, Number(corps.devise) || ch.devise);
      if (corps.surface !== void 0) ch.surface = Number(corps.surface) || 0;
      if (corps.taux !== void 0) ch.taux = Number(corps.taux) || 0;
      if (corps.agentId !== void 0) ch.agentId = txt(corps.agentId, 40);
      if (corps.modele && MODELES[corps.modele] && corps.modele !== ch.modele && !ch.arrivee) {
        ch.modele = corps.modele;
        ch.pieces = neufPieces(corps.modele);
        journalise(ch, "Mod\xE8le de contr\xF4le chang\xE9", corps.modele, moi.nom);
      }
      journalise(ch, "Chantier modifi\xE9", "", moi.nom);
      await majChantier(ch);
      await majIndex(ch, false, ancienneDate);
      if (ch.agentId && ch.agentId !== ancienAgent && ch.agentId !== moi.id)
        await envoiPush(
          [ch.agentId],
          "Intervention qui vous est confi\xE9e",
          ch.client + " \xB7 " + ch.date + " \xE0 " + ch.heure,
          { onglet: "tournee" }
        ).catch(() => {
        });
      return json({ chantier: ch });
    }
    if (route === "chantier-suppr" && req.method === "POST") {
      const r = exige("patron");
      if (r) return r;
      const ch = await chantier(corps.id);
      if (!ch) return erreur("Chantier introuvable.", 404);
      for (const p of ch.photos || []) await phStore().delete(ch.id + "/" + p.id).catch(() => {
      });
      await app().delete(cleCh(ch.id)).catch(() => {
      });
      await majIndex({ id: ch.id, date: ch.date }, true);
      return json({ ok: true });
    }
    if (route === "historique") {
      const r = exige("patron");
      if (r) return r;
      const mois = (await moisConnus()).slice(-6);
      const idx = await index(mois[0] || void 0);
      return json({ chantiers: idx.reverse().slice(0, 200) });
    }
    if (route === "demandes") {
      const r = exige("patron");
      if (r) return r;
      return json({ demandes: await lire("demandes", []) });
    }
    if (route === "demande-maj" && req.method === "POST") {
      const r = exige("patron");
      if (r) return r;
      let d = null;
      await modifier("demandes", [], (v) => {
        const x = v.find((y) => y.id === corps.id);
        if (!x) return void 0;
        if (["nouvelle", "vue", "planifiee", "sans-suite"].includes(corps.statut)) x.statut = corps.statut;
        if (corps.chantierId) x.chantierId = txt(corps.chantierId, 40);
        x.maj = now();
        x.par = moi.nom;
        d = x;
        return v;
      });
      if (!d) return erreur("Demande introuvable.", 404);
      return json({ demande: d });
    }
    if (route === "demande-test" && req.method === "POST") {
      const r = exige("patron");
      if (r) return r;
      const liste = await lire("demandes", []);
      const exemples0 = [
        {
          prenom: "Claire",
          nom: "Bessi\xE8res",
          tel: "06 11 22 33 44",
          email: "claire.b@exemple.fr",
          ville: "Cahors",
          prestation: "M\xE9nage Airbnb",
          message: "Bonjour, j'ai un T2 de 45 m\xB2 \xE0 Cahors en location courte dur\xE9e. Il me faudrait un m\xE9nage entre chaque locataire, environ 6 fois par mois."
        },
        {
          prenom: "Thomas",
          nom: "Lacombe",
          tel: "05 65 22 33 44",
          email: "t.lacombe@exemple.fr",
          ville: "Pradines",
          prestation: "Nettoyage de bureaux",
          message: "Cabinet comptable de 120 m\xB2 \xE0 Pradines, 2 passages par semaine en fin de journ\xE9e. Pouvez-vous me faire un devis ?"
        },
        {
          prenom: "Martine",
          nom: "Cazals",
          tel: "06 55 44 33 22",
          email: "",
          ville: "Mercu\xE8s",
          prestation: "Remise en \xE9tat / Fin de bail",
          message: "Fin de bail d'une maison de 95 m\xB2 \xE0 Mercu\xE8s, \xE9tat des lieux le 3 octobre."
        },
        {
          prenom: "Syndic",
          nom: "Quercy Immo",
          tel: "05 65 35 12 90",
          email: "gestion@exemple.fr",
          ville: "Cahors",
          prestation: "Parties communes",
          message: "Copropri\xE9t\xE9 de 18 lots avenue Anatole de Monzie : hall, deux cages d'escalier, local poubelles. Passage hebdomadaire souhait\xE9, devis pour l'ann\xE9e."
        },
        {
          prenom: "\xC9lodie",
          nom: "Vaysse",
          tel: "06 78 90 12 34",
          email: "elodie.vaysse@exemple.fr",
          ville: "Luzech",
          prestation: "M\xE9nage r\xE9current",
          message: "Maison de 110 m\xB2 \xE0 Luzech, 3 heures tous les quinze jours, le vendredi de pr\xE9f\xE9rence. Je suis \xE9ligible au cr\xE9dit d'imp\xF4t, est-ce que vous le proposez ?"
        },
        {
          prenom: "Mairie",
          nom: "de Pradines",
          tel: "05 65 53 24 10",
          email: "services@exemple.fr",
          ville: "Pradines",
          prestation: "Nettoyage de locaux",
          message: "Consultation pour l'entretien de la salle des f\xEAtes et des vestiaires du stade. Merci de nous adresser une proposition avant le 15."
        },
        {
          prenom: "Julien",
          nom: "Delsol",
          tel: "06 22 44 66 88",
          email: "j.delsol@exemple.fr",
          ville: "Esp\xE8re",
          prestation: "Nettoyage de vitres",
          message: "V\xE9randa et grandes baies vitr\xE9es d'une maison \xE0 Esp\xE8re, deux fois par an. Acc\xE8s de plain-pied."
        },
        {
          prenom: "Sophie",
          nom: "Maury",
          tel: "",
          email: "sophie.maury@exemple.fr",
          ville: "Saint-Cirq-Lapopie",
          prestation: "M\xE9nage Airbnb",
          message: "G\xEEte de 4 chambres \xE0 Saint-Cirq-Lapopie, m\xE9nage le samedi entre deux locations, draps fournis. Saison de mars \xE0 octobre."
        }
      ];
      const e = exemples0[Math.floor(Math.random() * exemples0.length)];
      const d = { id: uid(), recu: now(), statut: "nouvelle", source: "essai", adresse: "", ville: "", ...e };
      await modifier("demandes", [], (v) => [d].concat(v).slice(0, 2e3));
      return json({ demande: d });
    }
    if (route === "calendrier") {
      const r = exige();
      if (r) return r;
      const m = /^\d{4}-\d{2}$/.test(url.searchParams.get("m") || "") ? url.searchParams.get("m") : jourISO(now()).slice(0, 7);
      const jours = {};
      for (const c of await indexMois(m)) {
        if (c.statut === "annule") continue;
        if (moi.role !== "patron" && c.agentId !== moi.id) continue;
        const j = jours[c.date] || (jours[c.date] = { n: 0, faits: 0 });
        j.n++;
        if (c.statut === "cloture") j.faits++;
      }
      return json({ mois: m, jours });
    }
    if (route === "historique-agent") {
      const r = exige();
      if (r) return r;
      const cible = moi.role === "patron" ? url.searchParams.get("id") || moi.id : moi.id;
      const liste = (await index()).filter((c) => c.agentId === cible && c.statut !== "annule").sort((a2, b) => (b.date + b.heure).localeCompare(a2.date + a2.heure)).slice(0, 200);
      const a = (await agents() || []).find((x) => x.id === cible);
      return json({
        agent: a ? { id: a.id, nom: a.nom, couleur: a.couleur, photo: !!a.photo, tel: a.tel || "" } : null,
        chantiers: liste,
        reelles: liste.filter((c) => c.statut === "cloture").reduce((s2, c) => s2 + (c.reel || 0), 0),
        prevues: liste.filter((c) => c.statut === "cloture").reduce((s2, c) => s2 + (c.devise || 0), 0)
      });
    }
    if (route === "activite") {
      const r = exige("patron");
      if (r) return r;
      const mois = /^\d{4}-\d{2}$/.test(url.searchParams.get("m") || "") ? url.searchParams.get("m") : jourISO(now()).slice(0, 7);
      const cfg = await entrepriseConf();
      const idx = (await indexMois(mois)).filter((c) => c.statut !== "annule");
      const liste = await agents() || [];
      const parAgent = {};
      let prevues = 0, reelles = 0, clotures = 0, ca = 0, prevuesClot = 0;
      for (const c of idx) {
        prevues += c.devise || 0;
        const a = parAgent[c.agentId] || (parAgent[c.agentId] = { prevues: 0, reelles: 0, n: 0, clotures: 0, prevuesClot: 0 });
        a.n++;
        a.prevues += c.devise || 0;
        if (c.statut === "cloture") {
          clotures++;
          reelles += c.reel || 0;
          prevuesClot += c.devise || 0;
          ca += (c.reel || 0) * (c.taux || cfg.taux || 0);
          a.clotures++;
          a.reelles += c.reel || 0;
          a.prevuesClot += c.devise || 0;
        }
      }
      const vus = new Set(idx.map((c) => c.agentId));
      return json({
        mois,
        total: idx.length,
        clotures,
        prevues,
        reelles,
        prevuesClot,
        ca,
        taux: cfg.taux,
        agents: liste.filter((a) => a.actif || vus.has(a.id)).map((a) => ({
          id: a.id,
          nom: a.nom,
          couleur: a.couleur,
          photo: !!a.photo,
          actif: a.actif !== false,
          ...parAgent[a.id] || { prevues: 0, reelles: 0, n: 0, clotures: 0, prevuesClot: 0 }
        }))
      });
    }
    if (route === "push-cle") {
      const r = exige();
      if (r) return r;
      const v = await clesPush();
      return json({ cle: v.publicKey });
    }
    if (route === "push-abo" && req.method === "POST") {
      const r = exige();
      if (r) return r;
      const abo = corps.abo;
      if (corps.retirer) {
        await modifier("push", [], (l) => l.filter((x) => x.pt !== txt(corps.pt, 400)));
        return json({ ok: true });
      }
      if (!abo || !abo.endpoint || !abo.keys) return erreur("Abonnement invalide.", 400);
      const pt = String(abo.endpoint).slice(0, 400);
      await modifier("push", [], (l) => {
        const autres = l.filter((x) => x.pt !== pt);
        autres.push({ pt, agentId: moi.id, abo, cree: now() });
        return autres.slice(-200);
      });
      return json({ ok: true });
    }
    if (route === "push-essai" && req.method === "POST") {
      const r = exige();
      if (r) return r;
      const n = await envoiPush([moi.id], "Quercy Propret\xE9", "Les notifications fonctionnent.", { onglet: "tournee" });
      return json({ ok: true, envoyes: n });
    }
    if (route === "chantier-annule" && req.method === "POST") {
      const r = exige("patron");
      if (r) return r;
      const ch = await chantier(corps.id);
      if (!ch) return erreur("Chantier introuvable.", 404);
      if (ch.cloture) return erreur("Chantier cl\xF4tur\xE9 : il ne peut plus \xEAtre annul\xE9.", 409);
      ch.annule = corps.annule === false ? false : { ts: now(), par: moi.nom, motif: txt(corps.motif, 200) };
      journalise(ch, ch.annule ? "Chantier annul\xE9" : "Annulation lev\xE9e", ch.annule ? ch.annule.motif : "", moi.nom);
      await majChantier(ch);
      await majIndex(ch);
      return json({ chantier: ch });
    }
    if (route === "absence" && req.method === "POST") {
      const r = exige("patron");
      if (r) return r;
      const de = txt(corps.de, 40), vers = txt(corps.vers, 40);
      const du = /^\d{4}-\d{2}-\d{2}$/.test(corps.du) ? corps.du : jourISO(now());
      const au = /^\d{4}-\d{2}-\d{2}$/.test(corps.au) ? corps.au : du;
      if (!de || !vers || de === vers) return erreur("Indiquez l'agent absent et son rempla\xE7ant.", 400);
      const liste = await agents() || [];
      if (!liste.find((a) => a.id === vers && a.actif)) return erreur("Rempla\xE7ant introuvable.", 404);
      const lignes = (await index(du.slice(0, 7), au.slice(0, 7))).filter((c) => c.agentId === de && c.date >= du && c.date <= au && c.statut !== "cloture" && c.statut !== "annule");
      const touches = [];
      for (const l of lignes) {
        const ch = await chantier(l.id);
        if (!ch) continue;
        ch.agentId = vers;
        journalise(ch, "Chantier r\xE9attribu\xE9", "absence du " + du + " au " + au, moi.nom);
        await majChantier(ch);
        await majIndex(ch);
        touches.push(ch.client + " \xB7 " + ch.date);
      }
      await modifier("absences", [], (v) => v.concat([{ id: uid(), de, vers, du, au, n: touches.length, ts: now(), par: moi.nom }]).slice(-200));
      if (touches.length) await envoiPush(
        [vers],
        "Chantiers r\xE9attribu\xE9s",
        touches.length + " intervention(s) vous ont \xE9t\xE9 confi\xE9es.",
        { onglet: "tournee" }
      ).catch(() => {
      });
      return json({ ok: true, repris: touches.length, chantiers: touches });
    }
    if (route === "absences") {
      const r = exige("patron");
      if (r) return r;
      return json({ absences: (await lire("absences", [])).slice(-50).reverse() });
    }
    if (route === "qr-creer" && req.method === "POST") {
      const r = exige("patron");
      if (r) return r;
      const client = txt(corps.client, 120);
      if (!client) return erreur("Client obligatoire.", 400);
      let jeton = "";
      await modifier("qr", {}, (v) => {
        const vu = Object.keys(v).find((k) => v[k].client.toLowerCase() === client.toLowerCase());
        if (vu) {
          jeton = vu;
          return void 0;
        }
        jeton = uid() + uid();
        v[jeton] = { client, cree: now(), par: moi.nom };
        return v;
      });
      return json({ jeton, client });
    }
    if (route === "pointage-qr" && req.method === "POST") {
      const r = exige();
      if (r) return r;
      const table = await lire("qr", {});
      const e2 = table[txt(corps.jeton, 80)];
      if (!e2) return erreur("Ce QR n'est pas reconnu.", 404);
      const auj = jourISO(now());
      const lignes = (await indexMois(auj.slice(0, 7))).filter((c) => c.date === auj && (c.client || "").trim().toLowerCase() === e2.client.trim().toLowerCase() && c.statut !== "annule" && (moi.role === "patron" || c.agentId === moi.id));
      if (!lignes.length) return erreur("Aucune intervention pr\xE9vue aujourd'hui chez " + e2.client + ".", 404);
      const ch = await chantier(lignes[0].id);
      if (!ch) return erreur("Chantier introuvable.", 404);
      if (ch.cloture) return json({ chantier: ch, message: "Intervention d\xE9j\xE0 cl\xF4tur\xE9e." });
      const t = now();
      let message = "";
      if (!ch.arrivee) {
        ch.arrivee = t;
        ch.arriveeServeur = t;
        journalise(ch, "Arriv\xE9e sur site", "QR sur place", moi.nom);
        message = "Arriv\xE9e point\xE9e \xE0 " + new Date(t).toLocaleTimeString("fr-FR").slice(0, 5) + ".";
      } else if (!ch.depart) {
        ch.depart = t;
        ch.departServeur = t;
        journalise(ch, "D\xE9part du site", "QR sur place", moi.nom);
        message = "D\xE9part point\xE9. Dur\xE9e : " + ((t - ch.arrivee) / 36e5).toFixed(2).replace(".", ",") + " h.";
      } else return json({ chantier: ch, message: "Arriv\xE9e et d\xE9part d\xE9j\xE0 point\xE9s." });
      await majChantier(ch);
      await majIndex(ch);
      return json({ chantier: ch, message });
    }
    if (route === "clients") {
      const r = exige("patron");
      if (r) return r;
      const cfg = await entrepriseConf();
      const par = {};
      for (const c of await index()) {
        if (c.statut === "annule") continue;
        const k = (c.client || "").trim().toLowerCase();
        if (!k) continue;
        const e = par[k] || (par[k] = { nom: c.client, ville: c.ville || "", n: 0, heures: 0, ca: 0, dernier: "", prochain: "", id: c.id });
        e.n++;
        if (c.statut === "cloture") {
          e.heures += c.reel || 0;
          e.ca += (c.reel || 0) * (c.taux || cfg.taux || 0);
        }
        const auj = jourISO(now());
        if (c.date <= auj && c.date > (e.dernier || "")) {
          e.dernier = c.date;
          e.id = c.id;
        }
        if (c.date > auj && (!e.prochain || c.date < e.prochain)) e.prochain = c.date;
      }
      const liste = Object.values(par).sort((a, b) => (b.dernier || "").localeCompare(a.dernier || ""));
      return json({ clients: liste });
    }
    if (route === "client") {
      const r = exige("patron");
      if (r) return r;
      const nom = txt(url.searchParams.get("nom"), 120).toLowerCase();
      const lignes = (await index()).filter((c) => (c.client || "").trim().toLowerCase() === nom);
      let fiche = null;
      if (lignes.length) {
        const dernier = lignes[lignes.length - 1];
        const ch = await chantier(dernier.id);
        if (ch) fiche = {
          client: ch.client,
          contact: ch.contact,
          tel: ch.tel,
          email: ch.email,
          adresse: ch.adresse,
          cp: ch.cp,
          ville: ch.ville,
          prestation: ch.prestation,
          modele: ch.modele,
          devise: ch.devise,
          taux: ch.taux,
          consignes: ch.consignes,
          surface: ch.surface,
          siren: ch.siren || ""
        };
      }
      return json({ fiche, chantiers: lignes.slice().reverse() });
    }
    if (route === "attestation") {
      const r = exige("patron");
      if (r) return r;
      const annee = /^\d{4}$/.test(url.searchParams.get("a") || "") ? url.searchParams.get("a") : jourISO(now()).slice(0, 4);
      const nom = txt(url.searchParams.get("nom"), 120).toLowerCase();
      const cfg = await entrepriseConf();
      const equipe = await agents() || [];
      const qui = (id) => {
        const a = equipe.find((x) => x.id === id);
        return a ? { intervenant: a.nom, code: a.code } : { intervenant: "", code: "" };
      };
      const memeClient = (x) => (x || "").trim().toLowerCase() === nom;
      const lignes = (await index(annee + "-01", annee + "-12")).filter((c) => c.statut === "cloture" && memeClient(c.client));
      const parId = Object.fromEntries(lignes.map((l) => [l.id, l]));
      const toutes = (await lire("factures", [])).filter((f) => f.type === "facture" && memeClient(f.client));
      const payees = toutes.filter((f) => f.statut === "payee" && String(f.payeeLe || f.date).slice(0, 4) === annee);
      const tauxTTC = 1 + (Number(cfg.tva) || 0) / 100;
      let detail = [], estime = false;
      if (payees.length) {
        for (const f of payees) {
          const lies = [];
          for (const id of f.chantiers || []) {
            let l = parId[id];
            if (!l) {
              const ch = await chantier(id);
              if (ch && ch.cloture) l = ligneIndex(ch);
            }
            if (l) lies.push(l);
          }
          if (!lies.length) {
            const h = (f.lignes || []).filter((x) => x.unite === "h").reduce((s2, x) => s2 + x.quantite, 0);
            detail.push({ date: f.date, prestation: ((f.lignes || [])[0] || {}).libelle || "Prestation", heures: h, montant: f.ttc, intervenant: "", code: "", facture: f.numero });
            continue;
          }
          const poids = lies.map((l) => (l.reel || 0) * (l.taux || cfg.taux || 0));
          const somme = poids.reduce((a2, b2) => a2 + b2, 0);
          lies.forEach((l, i) => detail.push({
            date: l.date,
            prestation: l.prestation,
            heures: l.reel || 0,
            montant: somme ? f.ttc * poids[i] / somme : f.ttc / lies.length,
            ...qui(l.agentId),
            facture: f.numero
          }));
        }
      } else if (!toutes.length) {
        estime = true;
        detail = lignes.map((c) => ({
          date: c.date,
          prestation: c.prestation,
          heures: c.reel || 0,
          montant: (c.reel || 0) * (c.taux || cfg.taux || 0) * tauxTTC,
          ...qui(c.agentId)
        }));
      }
      detail.sort((a2, b2) => a2.date.localeCompare(b2.date));
      const heures = detail.reduce((s2, x) => s2 + (x.heures || 0), 0);
      const total = detail.reduce((s2, x) => s2 + (x.montant || 0), 0);
      let fiche = {};
      const dern = lignes[lignes.length - 1] || null;
      if (dern) {
        const ch = await chantier(dern.id);
        if (ch) fiche = { contact: ch.contact, adresse: ch.adresse, cp: ch.cp, ville: ch.ville };
      }
      if (!fiche.adresse && payees[0]) fiche = { contact: payees[0].contact, adresse: payees[0].adresse, cp: payees[0].cp, ville: payees[0].ville };
      return json({
        annee,
        client: dern ? dern.client : (payees[0] || {}).client || "",
        ...fiche,
        heures,
        total,
        detail,
        estime,
        enAttente: toutes.filter((f) => f.statut === "a-payer").length,
        entreprise: cfg
      });
    }
    if (route === "factures") {
      const r = exige("patron");
      if (r) return r;
      return json({ factures: await lire("factures", []) });
    }
    if (route === "facture-nouvelle" && req.method === "POST") {
      const r = exige("patron");
      if (r) return r;
      const cfg = await entrepriseConf();
      const type = corps.type === "devis" ? "devis" : "facture";
      const client = txt(corps.client, 120);
      if (!client) return erreur("Client obligatoire.", 400);
      const lignes = (Array.isArray(corps.lignes) ? corps.lignes : []).map((l) => ({
        libelle: txt(l.libelle, 160),
        quantite: Math.max(0, Number(l.quantite) || 0),
        unite: txt(l.unite, 16) || "h",
        prix: Math.max(0, Number(l.prix) || 0)
      })).filter((l) => l.libelle && l.quantite > 0);
      if (!lignes.length) return erreur("Au moins une ligne est n\xE9cessaire.", 400);
      const ht = lignes.reduce((s2, l) => s2 + l.quantite * l.prix, 0);
      const tva = Number(corps.tva !== void 0 ? corps.tva : cfg.tva) || 0;
      const annee = jourISO(now()).slice(0, 4);
      const prefixe = type === "devis" ? "DV-" : "FA-";
      let numero = "";
      await modifier("compteur-" + type + "-" + annee, 0, (v) => {
        const n = (Number(v) || 0) + 1;
        numero = prefixe + annee + "-" + String(n).padStart(4, "0");
        return n;
      });
      const doc = {
        id: uid(),
        type,
        numero,
        date: jourISO(now()),
        echeance: /^\d{4}-\d{2}-\d{2}$/.test(corps.echeance) ? corps.echeance : jourISO(now() + 30 * JOUR),
        client,
        contact: txt(corps.contact, 80),
        email: txt(corps.email, 120),
        adresse: txt(corps.adresse, 160),
        cp: txt(corps.cp, 8),
        ville: txt(corps.ville, 60),
        siren: txt(corps.siren, 20).replace(/[^\d ]/g, ""),
        categorie: "Prestation de services",
        lignes,
        ht,
        tva,
        ttc: ht * (1 + tva / 100),
        statut: type === "devis" ? "envoye" : "a-payer",
        chantiers: Array.isArray(corps.chantiers) ? corps.chantiers.map((x) => txt(x, 40)).slice(0, 60) : [],
        note: txt(corps.note, 400),
        cree: now(),
        par: moi.nom
      };
      const lus = [];
      for (const cid of doc.chantiers) {
        const ch = await chantier(cid);
        if (ch) lus.push(ch);
      }
      const dates = lus.map((ch) => ch.date).sort();
      if (dates.length) doc.periode = { du: dates[0], au: dates[dates.length - 1] };
      if (!doc.siren) doc.siren = (lus.find((ch) => ch.siren) || {}).siren || "";
      await modifier("factures", [], (v) => [doc].concat(v).slice(0, 2e3));
      for (const ch of lus) {
        await majAtomique(ch.id, (ch2) => {
          ch2.facture = { numero: doc.numero, id: doc.id, ts: now() };
        });
      }
      return json({ facture: doc });
    }
    if (route === "facture-maj" && req.method === "POST") {
      const r = exige("patron");
      if (r) return r;
      let doc = null;
      await modifier("factures", [], (v) => {
        const x = v.find((y) => y.id === corps.id);
        if (!x) return void 0;
        if (["a-payer", "payee", "envoye", "accepte", "refuse", "annule"].includes(corps.statut)) x.statut = corps.statut;
        if (corps.statut === "payee") x.payeeLe = jourISO(now());
        x.maj = now();
        doc = x;
        return v;
      });
      if (!doc) return erreur("Document introuvable.", 404);
      return json({ facture: doc });
    }
    if (route === "a-facturer") {
      const r = exige("patron");
      if (r) return r;
      const cfg = await entrepriseConf();
      const mois = /^\d{4}-\d{2}$/.test(url.searchParams.get("m") || "") ? url.searchParams.get("m") : jourISO(now()).slice(0, 7);
      const lignes = (await indexMois(mois)).filter((c) => c.statut === "cloture");
      const out = [];
      for (const l of lignes) {
        const ch = await chantier(l.id);
        if (!ch || ch.facture) continue;
        out.push({
          id: ch.id,
          date: ch.date,
          client: ch.client,
          prestation: ch.prestation,
          heures: (ch.cloture.duree || 0) / 36e5,
          taux: ch.taux || cfg.taux || 0,
          email: ch.email,
          adresse: ch.adresse,
          cp: ch.cp,
          ville: ch.ville,
          contact: ch.contact,
          siren: ch.siren || ""
        });
      }
      return json({ mois, chantiers: out });
    }
    if (route === "pilotage") {
      const r = exige("patron");
      if (r) return r;
      const cfg = await entrepriseConf();
      const t = now(), auj = jourISO(t), moisAuj = auj.slice(0, 7);
      const mois6 = [];
      const d0 = /* @__PURE__ */ new Date(auj + "T12:00:00Z");
      for (let k = 5; k >= 0; k--) mois6.push(new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() - k, 1, 12)).toISOString().slice(0, 7));
      const pos = Object.fromEntries(mois6.map((m, i) => [m, i]));
      const serie = mois6.map((m) => ({ mois: m, ca: 0, heures: 0, n: 0, encaisse: 0, prevues: 0 }));
      const lignes = await index(mois6[0], moisAuj);
      const factures = await lire("factures", []);
      const facturees = new Set(factures.flatMap((f) => f.chantiers || []));
      let aFacturer = 0, montantAFacturer = 0;
      const aCloturer = [], nonFaits = [];
      const mn = minutesParis(t);
      const jourJ = { total: 0, surSite: 0, aVenir: 0, termines: 0, retard: 0, agents: 0 };
      const agentsJ = /* @__PURE__ */ new Set();
      for (const c of lignes) {
        if (c.statut === "annule") continue;
        const i = pos[c.date.slice(0, 7)];
        const valeur = (c.reel || 0) * (c.taux || cfg.taux || 0);
        if (c.statut === "cloture") {
          if (i !== void 0) {
            serie[i].ca += valeur;
            serie[i].heures += c.reel || 0;
            serie[i].n++;
            serie[i].prevues += c.devise || 0;
          }
          if (!facturees.has(c.id) && !c.exemple) {
            aFacturer++;
            montantAFacturer += valeur;
          }
        }
        if (c.statut === "a-cloturer" || c.statut === "en-cours" && c.date < auj) aCloturer.push({ id: c.id, client: c.client, date: c.date });
        if (c.statut === "prevu" && c.date < auj && c.date >= jourISO(t - 30 * JOUR) && !c.exemple) nonFaits.push({ id: c.id, client: c.client, date: c.date });
        if (c.date === auj) {
          jourJ.total++;
          if (c.agentId) agentsJ.add(c.agentId);
          if (c.statut === "en-cours") jourJ.surSite++;
          else if (c.statut === "cloture" || c.statut === "a-cloturer") jourJ.termines++;
          else {
            const h = enMinutes(c.heure);
            if (h !== null && mn >= h + 15) jourJ.retard++;
            else jourJ.aVenir++;
          }
        }
      }
      jourJ.agents = agentsJ.size;
      for (const f of factures) {
        if (f.type !== "facture" || f.statut !== "payee") continue;
        const i = pos[String(f.payeeLe || f.date).slice(0, 7)];
        if (i !== void 0) serie[i].encaisse += f.ttc || 0;
      }
      const aPayer = factures.filter((f) => f.type === "facture" && f.statut === "a-payer");
      const enRetard = aPayer.filter((f) => f.echeance < auj);
      const demandes = (await lire("demandes", [])).filter((d) => d.statut === "nouvelle" || d.statut === "vue");
      const avis = await lire("avis", []);
      const moy = (l) => l.length ? l.reduce((s2, x) => s2 + x.note, 0) / l.length : null;
      const avisMois = avis.filter((x) => jourISO(x.ts).slice(0, 7) === moisAuj);
      return json({
        auj,
        jour: jourJ,
        serie,
        aFacturer: { n: aFacturer, montant: montantAFacturer },
        aCloturer: aCloturer.slice(-20),
        nonFaits: nonFaits.slice(-20),
        impayes: { n: aPayer.length, montant: aPayer.reduce((s2, f) => s2 + (f.ttc || 0), 0) },
        retard: { n: enRetard.length, montant: enRetard.reduce((s2, f) => s2 + (f.ttc || 0), 0) },
        demandes: { n: demandes.length, plusAncienne: demandes.reduce((m2, d) => Math.min(m2, d.recu || t), t) },
        avis: { n: avis.length, moyenne: moy(avis), nMois: avisMois.length, moyenneMois: moy(avisMois), derniers: avis.slice(0, 5) }
      });
    }
    if (route === "recherche") {
      const r = exige("patron");
      if (r) return r;
      const accents = new RegExp("[" + String.fromCharCode(768) + "-" + String.fromCharCode(879) + "]", "g");
      const norm = (x) => String(x || "").toLowerCase().normalize("NFD").replace(accents, "");
      const q = norm(txt(url.searchParams.get("q"), 60)).trim();
      if (q.length < 2) return json({ q, resultats: [] });
      const mots = q.split(/\s+/).filter(Boolean);
      const trouve = (...champs) => {
        const t = norm(champs.join(" "));
        return mots.every((m) => t.includes(m));
      };
      const out = [];
      const mois = (await moisConnus()).slice(-12);
      const lignes = mois.length ? (await index(mois[0])).filter((c) => c.statut !== "annule") : [];
      const clients = {};
      for (const c of lignes) {
        if (!trouve(c.client, c.ville)) continue;
        const k = norm(c.client).trim();
        const e2 = clients[k] || (clients[k] = { type: "client", titre: c.client, ville: c.ville || "", n: 0 });
        e2.n++;
      }
      for (const c of Object.values(clients).slice(0, 6))
        out.push({ type: "client", titre: c.titre, sous: pluriel(c.n, "intervention") + (c.ville ? " \xB7 " + c.ville : "") });
      const liste = await agents() || [];
      for (const a of liste.filter((x) => x.actif && trouve(x.nom, x.code)).slice(0, 4))
        out.push({ type: "agent", id: a.id, titre: a.nom, sous: a.role === "patron" ? "Responsable" : "Agent \xB7 " + a.code });
      for (const f of (await lire("factures", [])).filter((f2) => trouve(f2.numero, f2.client)).slice(0, 8))
        out.push({
          type: "facture",
          id: f.id,
          titre: f.numero + " \xB7 " + f.client,
          sous: eurosTxt(f.ttc) + " \xB7 " + ({ "a-payer": "\xE0 payer", payee: "pay\xE9e", envoye: "envoy\xE9", accepte: "accept\xE9", refuse: "refus\xE9", annule: "annul\xE9" }[f.statut] || f.statut)
        });
      for (const d of (await lire("demandes", [])).filter((d2) => trouve(d2.prenom, d2.nom, d2.email, d2.tel, d2.ville, d2.prestation)).slice(0, 6))
        out.push({
          type: "demande",
          id: d.id,
          titre: ((d.prenom || "") + " " + (d.nom || "")).trim() || "Sans nom",
          sous: (d.prestation || "Demande de devis") + " \xB7 re\xE7ue le " + dateCourte(jourISO(d.recu))
        });
      const chs = lignes.filter((c) => trouve(c.client, c.ville, c.prestation, c.adresse)).slice(-8).reverse();
      for (const c of chs) out.push({ type: "chantier", id: c.id, titre: c.client, sous: dateCourte(c.date) + " \xB7 " + (c.heure || "") + " \xB7 " + (c.prestation || ""), statut: c.statut });
      return json({ q, resultats: out.slice(0, 40) });
    }
    if (route === "alertes-verifier" && req.method === "POST") {
      const r = exige("patron");
      if (r) return r;
      await ecrire("alertes-verif", now());
      return json({ ok: true, ...await tacheAlertes() });
    }
    if (route === "avis-lien" && req.method === "POST") {
      const r = exige();
      if (r) return r;
      const ch = await chantier(corps.id);
      if (!ch) return erreur("Chantier introuvable.", 404);
      if (moi.role !== "patron" && ch.agentId !== moi.id) return erreur("Ce chantier n'est pas le v\xF4tre.", 403);
      if (!ch.cloture) return erreur("Cl\xF4turez d'abord l'intervention.", 409);
      let jeton = ch.avis && ch.avis.jeton;
      if (!jeton) {
        jeton = uid() + uid();
        await modifier("avis-jetons", {}, (v) => {
          v[jeton] = { id: ch.id, cree: now() };
          return v;
        });
        await majAtomique(ch.id, (ch2) => {
          if (ch2.avis && ch2.avis.jeton) {
            jeton = ch2.avis.jeton;
            return;
          }
          ch2.avis = { ...ch2.avis || {}, jeton };
        });
      }
      if (corps.envoi) await majAtomique(ch.id, (ch2) => {
        ch2.avis = { ...ch2.avis || {}, demande: now() };
        journalise(ch2, "Avis demand\xE9 au client", "", moi.nom);
      });
      return json({ jeton });
    }
    if (route === "avis-info") {
      const table = await lire("avis-jetons", {});
      const e2 = table[txt(url.searchParams.get("j"), 60)];
      if (!e2) return erreur("Ce lien d'avis n'est pas reconnu.", 404);
      const ch = await chantier(e2.id);
      if (!ch) return erreur("Intervention introuvable.", 404);
      const cfg = await entrepriseConf();
      const ag = (await agents() || []).find((a) => a.id === ch.agentId);
      return json({
        entreprise: cfg.nom,
        ville: cfg.ville,
        tel: cfg.tel,
        client: ch.client,
        date: ch.date,
        prestation: ch.prestation,
        agent: ag ? ag.nom : "",
        note: ch.avis && ch.avis.note || null,
        commentaire: ch.avis && ch.avis.commentaire || "",
        google: cfg.avisGoogle || "",
        expire: now() - e2.cree > 60 * JOUR
      });
    }
    if (route === "avis" && req.method === "POST") {
      const ip = req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "?";
      if (await tropDeDemandesBlob("avis:" + ip)) return erreur("Trop d'envois, r\xE9essayez plus tard.", 429);
      const table = await lire("avis-jetons", {});
      const e2 = table[txt(corps.j, 60)];
      if (!e2) return erreur("Ce lien d'avis n'est pas reconnu.", 404);
      if (now() - e2.cree > 60 * JOUR) return erreur("Ce lien a expir\xE9.", 410);
      const note = Math.round(Number(corps.note));
      if (!(note >= 1 && note <= 5)) return erreur("Choisissez une note de 1 \xE0 5 \xE9toiles.", 400);
      const commentaire = txt(corps.commentaire, 600);
      const { ch, refus } = await majAtomique(e2.id, (ch2) => {
        const deja = ch2.avis && ch2.avis.note;
        ch2.avis = { ...ch2.avis || {}, note, commentaire, ts: now() };
        journalise(ch2, deja ? "Avis du client modifi\xE9" : "Avis du client", note + " / 5", "client");
      });
      if (refus) return refuser(refus);
      await majIndex(ch);
      await modifier("avis", [], (v) => {
        const l = v.filter((x) => x.id !== ch.id);
        l.unshift({ id: ch.id, client: ch.client, agentId: ch.agentId, date: ch.date, note, commentaire, ts: now(), demo: !!ch.demo });
        return l.slice(0, 1e3);
      });
      const cfg = await entrepriseConf();
      const equipe = await agents() || [];
      const patrons = equipe.filter((a) => a.role === "patron" && a.actif).map((a) => a.id);
      const etoiles = "\u2605".repeat(note) + "\u2606".repeat(5 - note);
      await envoiPush(patrons, etoiles + " \xB7 " + ch.client, commentaire || "Nouvel avis client.", { onglet: "equipe" }).catch(() => {
      });
      if (note >= 4 && ch.agentId && !patrons.includes(ch.agentId))
        await envoiPush([ch.agentId], "Bravo \xB7 " + etoiles, ch.client + (commentaire ? " : \xAB " + commentaire.slice(0, 120) + " \xBB" : " a appr\xE9ci\xE9 votre travail."), { onglet: "tournee" }).catch(() => {
        });
      return json({ ok: true, google: note >= 4 ? cfg.avisGoogle || "" : "" });
    }
    if (route === "export") {
      const r = exige("patron");
      if (r) return r;
      const idx = await index();
      const chantiers = [];
      for (const l of idx) {
        const ch = await chantier(l.id);
        if (ch) {
          const c2 = { ...ch };
          delete c2.signature;
          chantiers.push(c2);
        }
      }
      const liste = (await agents() || []).map(({ sel, hash, ...a }) => a);
      return json({
        genere: (/* @__PURE__ */ new Date()).toISOString(),
        version: 3,
        entreprise: await entrepriseConf(),
        agents: liste,
        chantiers,
        demandes: await lire("demandes", []),
        factures: await lire("factures", []),
        absences: await lire("absences", []),
        avis: await lire("avis", [])
      }, 200, { "content-disposition": 'attachment; filename="sauvegarde-quercy.json"' });
    }
    if (route === "demo" && req.method === "POST") {
      const r = exige("patron");
      if (r) return r;
      const liste = await agents() || [];
      const agent = liste.find((x) => x.actif && x.role !== "patron") || liste.find((x) => x.actif) || { id: moi.id, nom: moi.nom };
      const auj = jourISO(now());
      const dem = {
        id: uid(),
        recu: now() - 3 * 36e5,
        statut: "nouvelle",
        source: "site",
        prenom: "Sophie",
        nom: "Lasserre",
        email: "boulangerie.lasserre@exemple.fr",
        tel: "05 65 22 18 40",
        prestation: "Nettoyage de locaux",
        adresse: "14 rue des Artisans",
        ville: "Cahors",
        message: "Boulangerie de 85 m\xB2 \xE0 Cahors : laboratoire, boutique et sanitaires. Passage tous les lundis avant 7 h, d\xE9graissage complet du labo une fois par mois. Pouvez-vous chiffrer ?"
      };
      const dem2 = {
        id: uid(),
        recu: now() - 12 * 6e4,
        statut: "nouvelle",
        source: "site",
        prenom: "H\xF4tel",
        nom: "Le Terminus",
        email: "reception@exemple.fr",
        tel: "05 65 53 32 00",
        prestation: "M\xE9nage r\xE9current",
        adresse: "5 avenue Charles de Freycinet",
        ville: "Cahors",
        message: "Douze chambres et les parties communes, six jours sur sept, entre 9 h et 13 h. Nous cherchons un prestataire \xE0 l'ann\xE9e."
      };
      await modifier("demandes", [], (v) => [dem, dem2].concat(v).slice(0, 2e3));
      const ch = nouveauChantier({
        client: "Boulangerie Lasserre",
        contact: "Mme Sophie Lasserre",
        tel: "05 65 22 18 40",
        email: "boulangerie.lasserre@exemple.fr",
        adresse: "14 rue des Artisans",
        cp: "46000",
        ville: "Cahors",
        prestation: "Nettoyage de locaux",
        modele: "Bureaux et locaux",
        surface: 85,
        devise: 2.5,
        taux: 30,
        agentId: agent.id,
        date: auj,
        heure: "06:00",
        consignes: "Entr\xE9e par la cour, code portail 1974. Ne pas utiliser de produit parfum\xE9 dans le laboratoire."
      });
      ch.demo = true;
      const base = (/* @__PURE__ */ new Date(auj + "T06:02:00")).getTime();
      ch.arrivee = base;
      ch.arriveeServeur = base;
      ch.depart = base + 2 * 36e5 + 41 * 6e4;
      ch.departServeur = ch.depart;
      ch.pieces.forEach((p) => p.items.forEach((i) => {
        i.ok = true;
        i.ts = base + 18e5;
      }));
      const sanit = ch.pieces.find((p) => p.n === "Sanitaires");
      if (sanit && sanit.items[3]) {
        sanit.items[3].ok = false;
        sanit.items[3].nc = "Siphon du lavabo bouch\xE9, produit inefficace. Plombier \xE0 pr\xE9voir, signal\xE9 \xE0 Mme Lasserre.";
      }
      ch.cons[2].q = 6;
      ch.cons[4].q = 2;
      ch.cons[6].q = 3;
      ch.obs = "Laboratoire d\xE9graiss\xE9 au complet, plan de travail et p\xE9trin d\xE9sinfect\xE9s. Sol de la boutique relav\xE9 apr\xE8s la livraison de farine. Prochain passage lundi, m\xEAme horaire.";
      ch.signature = SIG_DEMO;
      ch.signatureTs = ch.depart + 6e4;
      ch.signataire = "S. Lasserre";
      ch.siren = "123 456 789";
      journalise(ch, "Arriv\xE9e sur site", "", agent.nom);
      journalise(ch, "R\xE9serve", "Sanitaires \u2014 Sols lav\xE9s et d\xE9sinfect\xE9s", agent.nom);
      journalise(ch, "D\xE9part du site", "", agent.nom);
      journalise(ch, "Signature du client", "S. Lasserre", agent.nom);
      const annee = auj.slice(0, 4);
      let cpt = 0;
      await modifier("compteur-" + annee, 0, (v) => {
        cpt = (Number(v) || 0) + 1;
        return cpt;
      });
      const items = ch.pieces.flatMap((p) => p.items);
      ch.cloture = {
        ts: ch.depart + 12e4,
        duree: ch.depart - ch.arrivee,
        ok: items.filter((i) => i.ok).length,
        tot: items.length,
        res: items.filter((i) => !i.ok).length,
        bon: "BI-" + annee + "-" + String(cpt).padStart(4, "0"),
        par: agent.nom,
        mail: { envoye: false, raison: "d\xE9monstration" }
      };
      journalise(ch, "Intervention cl\xF4tur\xE9e", ch.cloture.bon, agent.nom);
      const jetonAvis = uid() + uid();
      const commentaireAvis = "Laboratoire impeccable et tr\xE8s bon contact avec " + agent.nom + ". Merci pour le signalement du siphon.";
      ch.avis = { jeton: jetonAvis, demande: ch.cloture.ts + 6e4, note: 5, commentaire: commentaireAvis, ts: ch.cloture.ts + 40 * 6e4 };
      journalise(ch, "Avis du client", "5 / 5", "client");
      await majChantier(ch);
      await majIndex(ch);
      await modifier("avis-jetons", {}, (v) => {
        v[jetonAvis] = { id: ch.id, cree: now(), demo: true };
        return v;
      });
      await modifier("avis", [], (v) => [{
        id: ch.id,
        client: ch.client,
        agentId: ch.agentId,
        date: ch.date,
        note: 5,
        commentaire: commentaireAvis,
        ts: ch.avis.ts,
        demo: true
      }].concat(v.filter((x) => x.id !== ch.id)).slice(0, 1e3));
      await modifier("demandes", [], (v) => {
        const x = v.find((y) => y.id === dem.id);
        if (x) {
          x.statut = "planifiee";
          x.chantierId = ch.id;
          x.maj = now();
          x.par = moi.nom;
        }
        return v;
      });
      const cfg = await entrepriseConf();
      const heures = Math.round(ch.cloture.duree / 36e5 * 100) / 100;
      let num = "";
      await modifier("compteur-facture-" + annee, 0, (v) => {
        const nn = (Number(v) || 0) + 1;
        num = "FA-" + annee + "-" + String(nn).padStart(4, "0");
        return nn;
      });
      const ht = heures * (ch.taux || cfg.taux || 0);
      const fac = {
        id: uid(),
        type: "facture",
        numero: num,
        date: auj,
        echeance: jourISO(now() + 30 * JOUR),
        client: ch.client,
        contact: ch.contact,
        email: ch.email,
        adresse: ch.adresse,
        cp: ch.cp,
        ville: ch.ville,
        lignes: [{ libelle: "Nettoyage de locaux \u2014 " + auj.slice(8) + "/" + auj.slice(5, 7), quantite: heures, unite: "h", prix: ch.taux || cfg.taux || 0 }],
        ht,
        tva: cfg.tva || 0,
        ttc: ht * (1 + (cfg.tva || 0) / 100),
        statut: "a-payer",
        siren: ch.siren,
        categorie: "Prestation de services",
        periode: { du: auj, au: auj },
        chantiers: [ch.id],
        cree: now(),
        par: moi.nom,
        demo: true
      };
      await modifier("factures", [], (v) => [fac].concat(v).slice(0, 2e3));
      ch.facture = { numero: num, id: fac.id, ts: now() };
      await majChantier(ch);
      const envoyes = await envoiPush(
        [moi.id],
        "D\xE9monstration \u2014 nouvelle demande de devis",
        "Sophie Lasserre \xB7 Nettoyage de locaux \xE0 Cahors",
        { onglet: "demandes" }
      ).catch(() => 0);
      return json({
        ok: true,
        demandeId: dem.id,
        demandeNouvelle: dem2.id,
        chantierId: ch.id,
        factureId: fac.id,
        bon: ch.cloture.bon,
        facture: num,
        agent: agent.nom,
        notifs: envoyes
      });
    }
    if (route === "demo-effacer" && req.method === "POST") {
      const r = exige("patron");
      if (r) return r;
      let n2 = 0;
      for (const l of await index()) {
        const ch = await chantier(l.id);
        if (ch && ch.demo) {
          await app().delete(cleCh(ch.id)).catch(() => {
          });
          await majIndex({ id: ch.id, date: ch.date }, true);
          n2++;
        }
      }
      await modifier("demandes", [], (v) => v.filter((x) => x.nom !== "Lasserre" && x.nom !== "Le Terminus"));
      await modifier("factures", [], (v) => v.filter((x) => !x.demo));
      await modifier("avis", [], (v) => v.some((x) => x.demo) ? v.filter((x) => !x.demo) : void 0);
      return json({ ok: true, chantiers: n2 });
    }
    if (route === "exemples" && req.method === "POST") {
      const r = exige("patron");
      if (r) return r;
      if (corps.effacer) return json({ ok: true, ...await effacerExemples() });
      return json({ ok: true, ...await poserExemples(moi.nom) });
    }
    return erreur("Route inconnue.", 404);
  } catch (e) {
    if (e && e.conflit) return json({ erreur: e.message }, 503);
    console.error("api:", route, e && e.stack ? e.stack : e);
    return json({ erreur: "Le serveur a rencontr\xE9 une erreur. R\xE9essayez dans un instant." }, 500);
  }
};
export const config = { path: "/api/*" };
export default api_default;
/*! Bundled license information:

safe-buffer/index.js:
  (*! safe-buffer. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> *)
*/
