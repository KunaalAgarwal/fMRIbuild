#!/usr/bin/env node
import { createRequire } from 'module'; const require = createRequire(import.meta.url);

// utils/workflow_tests/generate_workflows.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// node_modules/js-yaml/dist/js-yaml.mjs
function isNothing(subject) {
  return typeof subject === "undefined" || subject === null;
}
function isObject(subject) {
  return typeof subject === "object" && subject !== null;
}
function toArray(sequence) {
  if (Array.isArray(sequence)) return sequence;
  else if (isNothing(sequence)) return [];
  return [sequence];
}
function extend(target, source) {
  var index, length, key, sourceKeys;
  if (source) {
    sourceKeys = Object.keys(source);
    for (index = 0, length = sourceKeys.length; index < length; index += 1) {
      key = sourceKeys[index];
      target[key] = source[key];
    }
  }
  return target;
}
function repeat(string, count) {
  var result = "", cycle;
  for (cycle = 0; cycle < count; cycle += 1) {
    result += string;
  }
  return result;
}
function isNegativeZero(number) {
  return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
}
var isNothing_1 = isNothing;
var isObject_1 = isObject;
var toArray_1 = toArray;
var repeat_1 = repeat;
var isNegativeZero_1 = isNegativeZero;
var extend_1 = extend;
var common = {
  isNothing: isNothing_1,
  isObject: isObject_1,
  toArray: toArray_1,
  repeat: repeat_1,
  isNegativeZero: isNegativeZero_1,
  extend: extend_1
};
function formatError(exception2, compact) {
  var where = "", message = exception2.reason || "(unknown reason)";
  if (!exception2.mark) return message;
  if (exception2.mark.name) {
    where += 'in "' + exception2.mark.name + '" ';
  }
  where += "(" + (exception2.mark.line + 1) + ":" + (exception2.mark.column + 1) + ")";
  if (!compact && exception2.mark.snippet) {
    where += "\n\n" + exception2.mark.snippet;
  }
  return message + " " + where;
}
function YAMLException$1(reason, mark) {
  Error.call(this);
  this.name = "YAMLException";
  this.reason = reason;
  this.mark = mark;
  this.message = formatError(this, false);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = new Error().stack || "";
  }
}
YAMLException$1.prototype = Object.create(Error.prototype);
YAMLException$1.prototype.constructor = YAMLException$1;
YAMLException$1.prototype.toString = function toString(compact) {
  return this.name + ": " + formatError(this, compact);
};
var exception = YAMLException$1;
function getLine(buffer, lineStart, lineEnd, position, maxLineLength) {
  var head = "";
  var tail = "";
  var maxHalfLength = Math.floor(maxLineLength / 2) - 1;
  if (position - lineStart > maxHalfLength) {
    head = " ... ";
    lineStart = position - maxHalfLength + head.length;
  }
  if (lineEnd - position > maxHalfLength) {
    tail = " ...";
    lineEnd = position + maxHalfLength - tail.length;
  }
  return {
    str: head + buffer.slice(lineStart, lineEnd).replace(/\t/g, "\u2192") + tail,
    pos: position - lineStart + head.length
    // relative position
  };
}
function padStart(string, max) {
  return common.repeat(" ", max - string.length) + string;
}
function makeSnippet(mark, options) {
  options = Object.create(options || null);
  if (!mark.buffer) return null;
  if (!options.maxLength) options.maxLength = 79;
  if (typeof options.indent !== "number") options.indent = 1;
  if (typeof options.linesBefore !== "number") options.linesBefore = 3;
  if (typeof options.linesAfter !== "number") options.linesAfter = 2;
  var re = /\r?\n|\r|\0/g;
  var lineStarts = [0];
  var lineEnds = [];
  var match;
  var foundLineNo = -1;
  while (match = re.exec(mark.buffer)) {
    lineEnds.push(match.index);
    lineStarts.push(match.index + match[0].length);
    if (mark.position <= match.index && foundLineNo < 0) {
      foundLineNo = lineStarts.length - 2;
    }
  }
  if (foundLineNo < 0) foundLineNo = lineStarts.length - 1;
  var result = "", i, line;
  var lineNoLength = Math.min(mark.line + options.linesAfter, lineEnds.length).toString().length;
  var maxLineLength = options.maxLength - (options.indent + lineNoLength + 3);
  for (i = 1; i <= options.linesBefore; i++) {
    if (foundLineNo - i < 0) break;
    line = getLine(
      mark.buffer,
      lineStarts[foundLineNo - i],
      lineEnds[foundLineNo - i],
      mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]),
      maxLineLength
    );
    result = common.repeat(" ", options.indent) + padStart((mark.line - i + 1).toString(), lineNoLength) + " | " + line.str + "\n" + result;
  }
  line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
  result += common.repeat(" ", options.indent) + padStart((mark.line + 1).toString(), lineNoLength) + " | " + line.str + "\n";
  result += common.repeat("-", options.indent + lineNoLength + 3 + line.pos) + "^\n";
  for (i = 1; i <= options.linesAfter; i++) {
    if (foundLineNo + i >= lineEnds.length) break;
    line = getLine(
      mark.buffer,
      lineStarts[foundLineNo + i],
      lineEnds[foundLineNo + i],
      mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]),
      maxLineLength
    );
    result += common.repeat(" ", options.indent) + padStart((mark.line + i + 1).toString(), lineNoLength) + " | " + line.str + "\n";
  }
  return result.replace(/\n$/, "");
}
var snippet = makeSnippet;
var TYPE_CONSTRUCTOR_OPTIONS = [
  "kind",
  "multi",
  "resolve",
  "construct",
  "instanceOf",
  "predicate",
  "represent",
  "representName",
  "defaultStyle",
  "styleAliases"
];
var YAML_NODE_KINDS = [
  "scalar",
  "sequence",
  "mapping"
];
function compileStyleAliases(map2) {
  var result = {};
  if (map2 !== null) {
    Object.keys(map2).forEach(function(style) {
      map2[style].forEach(function(alias) {
        result[String(alias)] = style;
      });
    });
  }
  return result;
}
function Type$1(tag, options) {
  options = options || {};
  Object.keys(options).forEach(function(name) {
    if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) {
      throw new exception('Unknown option "' + name + '" is met in definition of "' + tag + '" YAML type.');
    }
  });
  this.options = options;
  this.tag = tag;
  this.kind = options["kind"] || null;
  this.resolve = options["resolve"] || function() {
    return true;
  };
  this.construct = options["construct"] || function(data) {
    return data;
  };
  this.instanceOf = options["instanceOf"] || null;
  this.predicate = options["predicate"] || null;
  this.represent = options["represent"] || null;
  this.representName = options["representName"] || null;
  this.defaultStyle = options["defaultStyle"] || null;
  this.multi = options["multi"] || false;
  this.styleAliases = compileStyleAliases(options["styleAliases"] || null);
  if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
    throw new exception('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
  }
}
var type = Type$1;
function compileList(schema2, name) {
  var result = [];
  schema2[name].forEach(function(currentType) {
    var newIndex = result.length;
    result.forEach(function(previousType, previousIndex) {
      if (previousType.tag === currentType.tag && previousType.kind === currentType.kind && previousType.multi === currentType.multi) {
        newIndex = previousIndex;
      }
    });
    result[newIndex] = currentType;
  });
  return result;
}
function compileMap() {
  var result = {
    scalar: {},
    sequence: {},
    mapping: {},
    fallback: {},
    multi: {
      scalar: [],
      sequence: [],
      mapping: [],
      fallback: []
    }
  }, index, length;
  function collectType(type2) {
    if (type2.multi) {
      result.multi[type2.kind].push(type2);
      result.multi["fallback"].push(type2);
    } else {
      result[type2.kind][type2.tag] = result["fallback"][type2.tag] = type2;
    }
  }
  for (index = 0, length = arguments.length; index < length; index += 1) {
    arguments[index].forEach(collectType);
  }
  return result;
}
function Schema$1(definition) {
  return this.extend(definition);
}
Schema$1.prototype.extend = function extend2(definition) {
  var implicit = [];
  var explicit = [];
  if (definition instanceof type) {
    explicit.push(definition);
  } else if (Array.isArray(definition)) {
    explicit = explicit.concat(definition);
  } else if (definition && (Array.isArray(definition.implicit) || Array.isArray(definition.explicit))) {
    if (definition.implicit) implicit = implicit.concat(definition.implicit);
    if (definition.explicit) explicit = explicit.concat(definition.explicit);
  } else {
    throw new exception("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");
  }
  implicit.forEach(function(type$1) {
    if (!(type$1 instanceof type)) {
      throw new exception("Specified list of YAML types (or a single Type object) contains a non-Type object.");
    }
    if (type$1.loadKind && type$1.loadKind !== "scalar") {
      throw new exception("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
    }
    if (type$1.multi) {
      throw new exception("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
    }
  });
  explicit.forEach(function(type$1) {
    if (!(type$1 instanceof type)) {
      throw new exception("Specified list of YAML types (or a single Type object) contains a non-Type object.");
    }
  });
  var result = Object.create(Schema$1.prototype);
  result.implicit = (this.implicit || []).concat(implicit);
  result.explicit = (this.explicit || []).concat(explicit);
  result.compiledImplicit = compileList(result, "implicit");
  result.compiledExplicit = compileList(result, "explicit");
  result.compiledTypeMap = compileMap(result.compiledImplicit, result.compiledExplicit);
  return result;
};
var schema = Schema$1;
var str = new type("tag:yaml.org,2002:str", {
  kind: "scalar",
  construct: function(data) {
    return data !== null ? data : "";
  }
});
var seq = new type("tag:yaml.org,2002:seq", {
  kind: "sequence",
  construct: function(data) {
    return data !== null ? data : [];
  }
});
var map = new type("tag:yaml.org,2002:map", {
  kind: "mapping",
  construct: function(data) {
    return data !== null ? data : {};
  }
});
var failsafe = new schema({
  explicit: [
    str,
    seq,
    map
  ]
});
function resolveYamlNull(data) {
  if (data === null) return true;
  var max = data.length;
  return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
}
function constructYamlNull() {
  return null;
}
function isNull(object) {
  return object === null;
}
var _null = new type("tag:yaml.org,2002:null", {
  kind: "scalar",
  resolve: resolveYamlNull,
  construct: constructYamlNull,
  predicate: isNull,
  represent: {
    canonical: function() {
      return "~";
    },
    lowercase: function() {
      return "null";
    },
    uppercase: function() {
      return "NULL";
    },
    camelcase: function() {
      return "Null";
    },
    empty: function() {
      return "";
    }
  },
  defaultStyle: "lowercase"
});
function resolveYamlBoolean(data) {
  if (data === null) return false;
  var max = data.length;
  return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
}
function constructYamlBoolean(data) {
  return data === "true" || data === "True" || data === "TRUE";
}
function isBoolean(object) {
  return Object.prototype.toString.call(object) === "[object Boolean]";
}
var bool = new type("tag:yaml.org,2002:bool", {
  kind: "scalar",
  resolve: resolveYamlBoolean,
  construct: constructYamlBoolean,
  predicate: isBoolean,
  represent: {
    lowercase: function(object) {
      return object ? "true" : "false";
    },
    uppercase: function(object) {
      return object ? "TRUE" : "FALSE";
    },
    camelcase: function(object) {
      return object ? "True" : "False";
    }
  },
  defaultStyle: "lowercase"
});
function isHexCode(c) {
  return 48 <= c && c <= 57 || 65 <= c && c <= 70 || 97 <= c && c <= 102;
}
function isOctCode(c) {
  return 48 <= c && c <= 55;
}
function isDecCode(c) {
  return 48 <= c && c <= 57;
}
function resolveYamlInteger(data) {
  if (data === null) return false;
  var max = data.length, index = 0, hasDigits = false, ch;
  if (!max) return false;
  ch = data[index];
  if (ch === "-" || ch === "+") {
    ch = data[++index];
  }
  if (ch === "0") {
    if (index + 1 === max) return true;
    ch = data[++index];
    if (ch === "b") {
      index++;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (ch !== "0" && ch !== "1") return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
    if (ch === "x") {
      index++;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (!isHexCode(data.charCodeAt(index))) return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
    if (ch === "o") {
      index++;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (!isOctCode(data.charCodeAt(index))) return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
  }
  if (ch === "_") return false;
  for (; index < max; index++) {
    ch = data[index];
    if (ch === "_") continue;
    if (!isDecCode(data.charCodeAt(index))) {
      return false;
    }
    hasDigits = true;
  }
  if (!hasDigits || ch === "_") return false;
  return true;
}
function constructYamlInteger(data) {
  var value = data, sign = 1, ch;
  if (value.indexOf("_") !== -1) {
    value = value.replace(/_/g, "");
  }
  ch = value[0];
  if (ch === "-" || ch === "+") {
    if (ch === "-") sign = -1;
    value = value.slice(1);
    ch = value[0];
  }
  if (value === "0") return 0;
  if (ch === "0") {
    if (value[1] === "b") return sign * parseInt(value.slice(2), 2);
    if (value[1] === "x") return sign * parseInt(value.slice(2), 16);
    if (value[1] === "o") return sign * parseInt(value.slice(2), 8);
  }
  return sign * parseInt(value, 10);
}
function isInteger(object) {
  return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 === 0 && !common.isNegativeZero(object));
}
var int = new type("tag:yaml.org,2002:int", {
  kind: "scalar",
  resolve: resolveYamlInteger,
  construct: constructYamlInteger,
  predicate: isInteger,
  represent: {
    binary: function(obj) {
      return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
    },
    octal: function(obj) {
      return obj >= 0 ? "0o" + obj.toString(8) : "-0o" + obj.toString(8).slice(1);
    },
    decimal: function(obj) {
      return obj.toString(10);
    },
    /* eslint-disable max-len */
    hexadecimal: function(obj) {
      return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
    }
  },
  defaultStyle: "decimal",
  styleAliases: {
    binary: [2, "bin"],
    octal: [8, "oct"],
    decimal: [10, "dec"],
    hexadecimal: [16, "hex"]
  }
});
var YAML_FLOAT_PATTERN = new RegExp(
  // 2.5e4, 2.5 and integers
  "^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"
);
function resolveYamlFloat(data) {
  if (data === null) return false;
  if (!YAML_FLOAT_PATTERN.test(data) || // Quick hack to not allow integers end with `_`
  // Probably should update regexp & check speed
  data[data.length - 1] === "_") {
    return false;
  }
  return true;
}
function constructYamlFloat(data) {
  var value, sign;
  value = data.replace(/_/g, "").toLowerCase();
  sign = value[0] === "-" ? -1 : 1;
  if ("+-".indexOf(value[0]) >= 0) {
    value = value.slice(1);
  }
  if (value === ".inf") {
    return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  } else if (value === ".nan") {
    return NaN;
  }
  return sign * parseFloat(value, 10);
}
var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
function representYamlFloat(object, style) {
  var res;
  if (isNaN(object)) {
    switch (style) {
      case "lowercase":
        return ".nan";
      case "uppercase":
        return ".NAN";
      case "camelcase":
        return ".NaN";
    }
  } else if (Number.POSITIVE_INFINITY === object) {
    switch (style) {
      case "lowercase":
        return ".inf";
      case "uppercase":
        return ".INF";
      case "camelcase":
        return ".Inf";
    }
  } else if (Number.NEGATIVE_INFINITY === object) {
    switch (style) {
      case "lowercase":
        return "-.inf";
      case "uppercase":
        return "-.INF";
      case "camelcase":
        return "-.Inf";
    }
  } else if (common.isNegativeZero(object)) {
    return "-0.0";
  }
  res = object.toString(10);
  return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
}
function isFloat(object) {
  return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || common.isNegativeZero(object));
}
var float = new type("tag:yaml.org,2002:float", {
  kind: "scalar",
  resolve: resolveYamlFloat,
  construct: constructYamlFloat,
  predicate: isFloat,
  represent: representYamlFloat,
  defaultStyle: "lowercase"
});
var json = failsafe.extend({
  implicit: [
    _null,
    bool,
    int,
    float
  ]
});
var core = json;
var YAML_DATE_REGEXP = new RegExp(
  "^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"
);
var YAML_TIMESTAMP_REGEXP = new RegExp(
  "^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$"
);
function resolveYamlTimestamp(data) {
  if (data === null) return false;
  if (YAML_DATE_REGEXP.exec(data) !== null) return true;
  if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
  return false;
}
function constructYamlTimestamp(data) {
  var match, year, month, day, hour, minute, second, fraction = 0, delta = null, tz_hour, tz_minute, date;
  match = YAML_DATE_REGEXP.exec(data);
  if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);
  if (match === null) throw new Error("Date resolve error");
  year = +match[1];
  month = +match[2] - 1;
  day = +match[3];
  if (!match[4]) {
    return new Date(Date.UTC(year, month, day));
  }
  hour = +match[4];
  minute = +match[5];
  second = +match[6];
  if (match[7]) {
    fraction = match[7].slice(0, 3);
    while (fraction.length < 3) {
      fraction += "0";
    }
    fraction = +fraction;
  }
  if (match[9]) {
    tz_hour = +match[10];
    tz_minute = +(match[11] || 0);
    delta = (tz_hour * 60 + tz_minute) * 6e4;
    if (match[9] === "-") delta = -delta;
  }
  date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
  if (delta) date.setTime(date.getTime() - delta);
  return date;
}
function representYamlTimestamp(object) {
  return object.toISOString();
}
var timestamp = new type("tag:yaml.org,2002:timestamp", {
  kind: "scalar",
  resolve: resolveYamlTimestamp,
  construct: constructYamlTimestamp,
  instanceOf: Date,
  represent: representYamlTimestamp
});
function resolveYamlMerge(data) {
  return data === "<<" || data === null;
}
var merge = new type("tag:yaml.org,2002:merge", {
  kind: "scalar",
  resolve: resolveYamlMerge
});
var BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
function resolveYamlBinary(data) {
  if (data === null) return false;
  var code, idx, bitlen = 0, max = data.length, map2 = BASE64_MAP;
  for (idx = 0; idx < max; idx++) {
    code = map2.indexOf(data.charAt(idx));
    if (code > 64) continue;
    if (code < 0) return false;
    bitlen += 6;
  }
  return bitlen % 8 === 0;
}
function constructYamlBinary(data) {
  var idx, tailbits, input = data.replace(/[\r\n=]/g, ""), max = input.length, map2 = BASE64_MAP, bits = 0, result = [];
  for (idx = 0; idx < max; idx++) {
    if (idx % 4 === 0 && idx) {
      result.push(bits >> 16 & 255);
      result.push(bits >> 8 & 255);
      result.push(bits & 255);
    }
    bits = bits << 6 | map2.indexOf(input.charAt(idx));
  }
  tailbits = max % 4 * 6;
  if (tailbits === 0) {
    result.push(bits >> 16 & 255);
    result.push(bits >> 8 & 255);
    result.push(bits & 255);
  } else if (tailbits === 18) {
    result.push(bits >> 10 & 255);
    result.push(bits >> 2 & 255);
  } else if (tailbits === 12) {
    result.push(bits >> 4 & 255);
  }
  return new Uint8Array(result);
}
function representYamlBinary(object) {
  var result = "", bits = 0, idx, tail, max = object.length, map2 = BASE64_MAP;
  for (idx = 0; idx < max; idx++) {
    if (idx % 3 === 0 && idx) {
      result += map2[bits >> 18 & 63];
      result += map2[bits >> 12 & 63];
      result += map2[bits >> 6 & 63];
      result += map2[bits & 63];
    }
    bits = (bits << 8) + object[idx];
  }
  tail = max % 3;
  if (tail === 0) {
    result += map2[bits >> 18 & 63];
    result += map2[bits >> 12 & 63];
    result += map2[bits >> 6 & 63];
    result += map2[bits & 63];
  } else if (tail === 2) {
    result += map2[bits >> 10 & 63];
    result += map2[bits >> 4 & 63];
    result += map2[bits << 2 & 63];
    result += map2[64];
  } else if (tail === 1) {
    result += map2[bits >> 2 & 63];
    result += map2[bits << 4 & 63];
    result += map2[64];
    result += map2[64];
  }
  return result;
}
function isBinary(obj) {
  return Object.prototype.toString.call(obj) === "[object Uint8Array]";
}
var binary = new type("tag:yaml.org,2002:binary", {
  kind: "scalar",
  resolve: resolveYamlBinary,
  construct: constructYamlBinary,
  predicate: isBinary,
  represent: representYamlBinary
});
var _hasOwnProperty$3 = Object.prototype.hasOwnProperty;
var _toString$2 = Object.prototype.toString;
function resolveYamlOmap(data) {
  if (data === null) return true;
  var objectKeys = [], index, length, pair, pairKey, pairHasKey, object = data;
  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    pairHasKey = false;
    if (_toString$2.call(pair) !== "[object Object]") return false;
    for (pairKey in pair) {
      if (_hasOwnProperty$3.call(pair, pairKey)) {
        if (!pairHasKey) pairHasKey = true;
        else return false;
      }
    }
    if (!pairHasKey) return false;
    if (objectKeys.indexOf(pairKey) === -1) objectKeys.push(pairKey);
    else return false;
  }
  return true;
}
function constructYamlOmap(data) {
  return data !== null ? data : [];
}
var omap = new type("tag:yaml.org,2002:omap", {
  kind: "sequence",
  resolve: resolveYamlOmap,
  construct: constructYamlOmap
});
var _toString$1 = Object.prototype.toString;
function resolveYamlPairs(data) {
  if (data === null) return true;
  var index, length, pair, keys, result, object = data;
  result = new Array(object.length);
  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    if (_toString$1.call(pair) !== "[object Object]") return false;
    keys = Object.keys(pair);
    if (keys.length !== 1) return false;
    result[index] = [keys[0], pair[keys[0]]];
  }
  return true;
}
function constructYamlPairs(data) {
  if (data === null) return [];
  var index, length, pair, keys, result, object = data;
  result = new Array(object.length);
  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    keys = Object.keys(pair);
    result[index] = [keys[0], pair[keys[0]]];
  }
  return result;
}
var pairs = new type("tag:yaml.org,2002:pairs", {
  kind: "sequence",
  resolve: resolveYamlPairs,
  construct: constructYamlPairs
});
var _hasOwnProperty$2 = Object.prototype.hasOwnProperty;
function resolveYamlSet(data) {
  if (data === null) return true;
  var key, object = data;
  for (key in object) {
    if (_hasOwnProperty$2.call(object, key)) {
      if (object[key] !== null) return false;
    }
  }
  return true;
}
function constructYamlSet(data) {
  return data !== null ? data : {};
}
var set = new type("tag:yaml.org,2002:set", {
  kind: "mapping",
  resolve: resolveYamlSet,
  construct: constructYamlSet
});
var _default = core.extend({
  implicit: [
    timestamp,
    merge
  ],
  explicit: [
    binary,
    omap,
    pairs,
    set
  ]
});
var _hasOwnProperty$1 = Object.prototype.hasOwnProperty;
var CONTEXT_FLOW_IN = 1;
var CONTEXT_FLOW_OUT = 2;
var CONTEXT_BLOCK_IN = 3;
var CONTEXT_BLOCK_OUT = 4;
var CHOMPING_CLIP = 1;
var CHOMPING_STRIP = 2;
var CHOMPING_KEEP = 3;
var PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
var PATTERN_FLOW_INDICATORS = /[,\[\]\{\}]/;
var PATTERN_TAG_HANDLE = /^(?:!|!!|![a-z\-]+!)$/i;
var PATTERN_TAG_URI = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
function _class(obj) {
  return Object.prototype.toString.call(obj);
}
function is_EOL(c) {
  return c === 10 || c === 13;
}
function is_WHITE_SPACE(c) {
  return c === 9 || c === 32;
}
function is_WS_OR_EOL(c) {
  return c === 9 || c === 32 || c === 10 || c === 13;
}
function is_FLOW_INDICATOR(c) {
  return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
}
function fromHexCode(c) {
  var lc;
  if (48 <= c && c <= 57) {
    return c - 48;
  }
  lc = c | 32;
  if (97 <= lc && lc <= 102) {
    return lc - 97 + 10;
  }
  return -1;
}
function escapedHexLen(c) {
  if (c === 120) {
    return 2;
  }
  if (c === 117) {
    return 4;
  }
  if (c === 85) {
    return 8;
  }
  return 0;
}
function fromDecimalCode(c) {
  if (48 <= c && c <= 57) {
    return c - 48;
  }
  return -1;
}
function simpleEscapeSequence(c) {
  return c === 48 ? "\0" : c === 97 ? "\x07" : c === 98 ? "\b" : c === 116 ? "	" : c === 9 ? "	" : c === 110 ? "\n" : c === 118 ? "\v" : c === 102 ? "\f" : c === 114 ? "\r" : c === 101 ? "\x1B" : c === 32 ? " " : c === 34 ? '"' : c === 47 ? "/" : c === 92 ? "\\" : c === 78 ? "\x85" : c === 95 ? "\xA0" : c === 76 ? "\u2028" : c === 80 ? "\u2029" : "";
}
function charFromCodepoint(c) {
  if (c <= 65535) {
    return String.fromCharCode(c);
  }
  return String.fromCharCode(
    (c - 65536 >> 10) + 55296,
    (c - 65536 & 1023) + 56320
  );
}
var simpleEscapeCheck = new Array(256);
var simpleEscapeMap = new Array(256);
for (i = 0; i < 256; i++) {
  simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
  simpleEscapeMap[i] = simpleEscapeSequence(i);
}
var i;
function State$1(input, options) {
  this.input = input;
  this.filename = options["filename"] || null;
  this.schema = options["schema"] || _default;
  this.onWarning = options["onWarning"] || null;
  this.legacy = options["legacy"] || false;
  this.json = options["json"] || false;
  this.listener = options["listener"] || null;
  this.implicitTypes = this.schema.compiledImplicit;
  this.typeMap = this.schema.compiledTypeMap;
  this.length = input.length;
  this.position = 0;
  this.line = 0;
  this.lineStart = 0;
  this.lineIndent = 0;
  this.firstTabInLine = -1;
  this.documents = [];
}
function generateError(state, message) {
  var mark = {
    name: state.filename,
    buffer: state.input.slice(0, -1),
    // omit trailing \0
    position: state.position,
    line: state.line,
    column: state.position - state.lineStart
  };
  mark.snippet = snippet(mark);
  return new exception(message, mark);
}
function throwError(state, message) {
  throw generateError(state, message);
}
function throwWarning(state, message) {
  if (state.onWarning) {
    state.onWarning.call(null, generateError(state, message));
  }
}
var directiveHandlers = {
  YAML: function handleYamlDirective(state, name, args) {
    var match, major, minor;
    if (state.version !== null) {
      throwError(state, "duplication of %YAML directive");
    }
    if (args.length !== 1) {
      throwError(state, "YAML directive accepts exactly one argument");
    }
    match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
    if (match === null) {
      throwError(state, "ill-formed argument of the YAML directive");
    }
    major = parseInt(match[1], 10);
    minor = parseInt(match[2], 10);
    if (major !== 1) {
      throwError(state, "unacceptable YAML version of the document");
    }
    state.version = args[0];
    state.checkLineBreaks = minor < 2;
    if (minor !== 1 && minor !== 2) {
      throwWarning(state, "unsupported YAML version of the document");
    }
  },
  TAG: function handleTagDirective(state, name, args) {
    var handle, prefix;
    if (args.length !== 2) {
      throwError(state, "TAG directive accepts exactly two arguments");
    }
    handle = args[0];
    prefix = args[1];
    if (!PATTERN_TAG_HANDLE.test(handle)) {
      throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
    }
    if (_hasOwnProperty$1.call(state.tagMap, handle)) {
      throwError(state, 'there is a previously declared suffix for "' + handle + '" tag handle');
    }
    if (!PATTERN_TAG_URI.test(prefix)) {
      throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
    }
    try {
      prefix = decodeURIComponent(prefix);
    } catch (err) {
      throwError(state, "tag prefix is malformed: " + prefix);
    }
    state.tagMap[handle] = prefix;
  }
};
function captureSegment(state, start, end, checkJson) {
  var _position, _length, _character, _result;
  if (start < end) {
    _result = state.input.slice(start, end);
    if (checkJson) {
      for (_position = 0, _length = _result.length; _position < _length; _position += 1) {
        _character = _result.charCodeAt(_position);
        if (!(_character === 9 || 32 <= _character && _character <= 1114111)) {
          throwError(state, "expected valid JSON character");
        }
      }
    } else if (PATTERN_NON_PRINTABLE.test(_result)) {
      throwError(state, "the stream contains non-printable characters");
    }
    state.result += _result;
  }
}
function mergeMappings(state, destination, source, overridableKeys) {
  var sourceKeys, key, index, quantity;
  if (!common.isObject(source)) {
    throwError(state, "cannot merge mappings; the provided source object is unacceptable");
  }
  sourceKeys = Object.keys(source);
  for (index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
    key = sourceKeys[index];
    if (!_hasOwnProperty$1.call(destination, key)) {
      destination[key] = source[key];
      overridableKeys[key] = true;
    }
  }
}
function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startLineStart, startPos) {
  var index, quantity;
  if (Array.isArray(keyNode)) {
    keyNode = Array.prototype.slice.call(keyNode);
    for (index = 0, quantity = keyNode.length; index < quantity; index += 1) {
      if (Array.isArray(keyNode[index])) {
        throwError(state, "nested arrays are not supported inside keys");
      }
      if (typeof keyNode === "object" && _class(keyNode[index]) === "[object Object]") {
        keyNode[index] = "[object Object]";
      }
    }
  }
  if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") {
    keyNode = "[object Object]";
  }
  keyNode = String(keyNode);
  if (_result === null) {
    _result = {};
  }
  if (keyTag === "tag:yaml.org,2002:merge") {
    if (Array.isArray(valueNode)) {
      for (index = 0, quantity = valueNode.length; index < quantity; index += 1) {
        mergeMappings(state, _result, valueNode[index], overridableKeys);
      }
    } else {
      mergeMappings(state, _result, valueNode, overridableKeys);
    }
  } else {
    if (!state.json && !_hasOwnProperty$1.call(overridableKeys, keyNode) && _hasOwnProperty$1.call(_result, keyNode)) {
      state.line = startLine || state.line;
      state.lineStart = startLineStart || state.lineStart;
      state.position = startPos || state.position;
      throwError(state, "duplicated mapping key");
    }
    if (keyNode === "__proto__") {
      Object.defineProperty(_result, keyNode, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: valueNode
      });
    } else {
      _result[keyNode] = valueNode;
    }
    delete overridableKeys[keyNode];
  }
  return _result;
}
function readLineBreak(state) {
  var ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 10) {
    state.position++;
  } else if (ch === 13) {
    state.position++;
    if (state.input.charCodeAt(state.position) === 10) {
      state.position++;
    }
  } else {
    throwError(state, "a line break is expected");
  }
  state.line += 1;
  state.lineStart = state.position;
  state.firstTabInLine = -1;
}
function skipSeparationSpace(state, allowComments, checkIndent) {
  var lineBreaks = 0, ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    while (is_WHITE_SPACE(ch)) {
      if (ch === 9 && state.firstTabInLine === -1) {
        state.firstTabInLine = state.position;
      }
      ch = state.input.charCodeAt(++state.position);
    }
    if (allowComments && ch === 35) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (ch !== 10 && ch !== 13 && ch !== 0);
    }
    if (is_EOL(ch)) {
      readLineBreak(state);
      ch = state.input.charCodeAt(state.position);
      lineBreaks++;
      state.lineIndent = 0;
      while (ch === 32) {
        state.lineIndent++;
        ch = state.input.charCodeAt(++state.position);
      }
    } else {
      break;
    }
  }
  if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) {
    throwWarning(state, "deficient indentation");
  }
  return lineBreaks;
}
function testDocumentSeparator(state) {
  var _position = state.position, ch;
  ch = state.input.charCodeAt(_position);
  if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
    _position += 3;
    ch = state.input.charCodeAt(_position);
    if (ch === 0 || is_WS_OR_EOL(ch)) {
      return true;
    }
  }
  return false;
}
function writeFoldedLines(state, count) {
  if (count === 1) {
    state.result += " ";
  } else if (count > 1) {
    state.result += common.repeat("\n", count - 1);
  }
}
function readPlainScalar(state, nodeIndent, withinFlowCollection) {
  var preceding, following, captureStart, captureEnd, hasPendingContent, _line, _lineStart, _lineIndent, _kind = state.kind, _result = state.result, ch;
  ch = state.input.charCodeAt(state.position);
  if (is_WS_OR_EOL(ch) || is_FLOW_INDICATOR(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) {
    return false;
  }
  if (ch === 63 || ch === 45) {
    following = state.input.charCodeAt(state.position + 1);
    if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
      return false;
    }
  }
  state.kind = "scalar";
  state.result = "";
  captureStart = captureEnd = state.position;
  hasPendingContent = false;
  while (ch !== 0) {
    if (ch === 58) {
      following = state.input.charCodeAt(state.position + 1);
      if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
        break;
      }
    } else if (ch === 35) {
      preceding = state.input.charCodeAt(state.position - 1);
      if (is_WS_OR_EOL(preceding)) {
        break;
      }
    } else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && is_FLOW_INDICATOR(ch)) {
      break;
    } else if (is_EOL(ch)) {
      _line = state.line;
      _lineStart = state.lineStart;
      _lineIndent = state.lineIndent;
      skipSeparationSpace(state, false, -1);
      if (state.lineIndent >= nodeIndent) {
        hasPendingContent = true;
        ch = state.input.charCodeAt(state.position);
        continue;
      } else {
        state.position = captureEnd;
        state.line = _line;
        state.lineStart = _lineStart;
        state.lineIndent = _lineIndent;
        break;
      }
    }
    if (hasPendingContent) {
      captureSegment(state, captureStart, captureEnd, false);
      writeFoldedLines(state, state.line - _line);
      captureStart = captureEnd = state.position;
      hasPendingContent = false;
    }
    if (!is_WHITE_SPACE(ch)) {
      captureEnd = state.position + 1;
    }
    ch = state.input.charCodeAt(++state.position);
  }
  captureSegment(state, captureStart, captureEnd, false);
  if (state.result) {
    return true;
  }
  state.kind = _kind;
  state.result = _result;
  return false;
}
function readSingleQuotedScalar(state, nodeIndent) {
  var ch, captureStart, captureEnd;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 39) {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  state.position++;
  captureStart = captureEnd = state.position;
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    if (ch === 39) {
      captureSegment(state, captureStart, state.position, true);
      ch = state.input.charCodeAt(++state.position);
      if (ch === 39) {
        captureStart = state.position;
        state.position++;
        captureEnd = state.position;
      } else {
        return true;
      }
    } else if (is_EOL(ch)) {
      captureSegment(state, captureStart, captureEnd, true);
      writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
      captureStart = captureEnd = state.position;
    } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
      throwError(state, "unexpected end of the document within a single quoted scalar");
    } else {
      state.position++;
      captureEnd = state.position;
    }
  }
  throwError(state, "unexpected end of the stream within a single quoted scalar");
}
function readDoubleQuotedScalar(state, nodeIndent) {
  var captureStart, captureEnd, hexLength, hexResult, tmp, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 34) {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  state.position++;
  captureStart = captureEnd = state.position;
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    if (ch === 34) {
      captureSegment(state, captureStart, state.position, true);
      state.position++;
      return true;
    } else if (ch === 92) {
      captureSegment(state, captureStart, state.position, true);
      ch = state.input.charCodeAt(++state.position);
      if (is_EOL(ch)) {
        skipSeparationSpace(state, false, nodeIndent);
      } else if (ch < 256 && simpleEscapeCheck[ch]) {
        state.result += simpleEscapeMap[ch];
        state.position++;
      } else if ((tmp = escapedHexLen(ch)) > 0) {
        hexLength = tmp;
        hexResult = 0;
        for (; hexLength > 0; hexLength--) {
          ch = state.input.charCodeAt(++state.position);
          if ((tmp = fromHexCode(ch)) >= 0) {
            hexResult = (hexResult << 4) + tmp;
          } else {
            throwError(state, "expected hexadecimal character");
          }
        }
        state.result += charFromCodepoint(hexResult);
        state.position++;
      } else {
        throwError(state, "unknown escape sequence");
      }
      captureStart = captureEnd = state.position;
    } else if (is_EOL(ch)) {
      captureSegment(state, captureStart, captureEnd, true);
      writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
      captureStart = captureEnd = state.position;
    } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
      throwError(state, "unexpected end of the document within a double quoted scalar");
    } else {
      state.position++;
      captureEnd = state.position;
    }
  }
  throwError(state, "unexpected end of the stream within a double quoted scalar");
}
function readFlowCollection(state, nodeIndent) {
  var readNext = true, _line, _lineStart, _pos, _tag = state.tag, _result, _anchor = state.anchor, following, terminator, isPair, isExplicitPair, isMapping, overridableKeys = /* @__PURE__ */ Object.create(null), keyNode, keyTag, valueNode, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 91) {
    terminator = 93;
    isMapping = false;
    _result = [];
  } else if (ch === 123) {
    terminator = 125;
    isMapping = true;
    _result = {};
  } else {
    return false;
  }
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(++state.position);
  while (ch !== 0) {
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if (ch === terminator) {
      state.position++;
      state.tag = _tag;
      state.anchor = _anchor;
      state.kind = isMapping ? "mapping" : "sequence";
      state.result = _result;
      return true;
    } else if (!readNext) {
      throwError(state, "missed comma between flow collection entries");
    } else if (ch === 44) {
      throwError(state, "expected the node content, but found ','");
    }
    keyTag = keyNode = valueNode = null;
    isPair = isExplicitPair = false;
    if (ch === 63) {
      following = state.input.charCodeAt(state.position + 1);
      if (is_WS_OR_EOL(following)) {
        isPair = isExplicitPair = true;
        state.position++;
        skipSeparationSpace(state, true, nodeIndent);
      }
    }
    _line = state.line;
    _lineStart = state.lineStart;
    _pos = state.position;
    composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
    keyTag = state.tag;
    keyNode = state.result;
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if ((isExplicitPair || state.line === _line) && ch === 58) {
      isPair = true;
      ch = state.input.charCodeAt(++state.position);
      skipSeparationSpace(state, true, nodeIndent);
      composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
      valueNode = state.result;
    }
    if (isMapping) {
      storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos);
    } else if (isPair) {
      _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos));
    } else {
      _result.push(keyNode);
    }
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if (ch === 44) {
      readNext = true;
      ch = state.input.charCodeAt(++state.position);
    } else {
      readNext = false;
    }
  }
  throwError(state, "unexpected end of the stream within a flow collection");
}
function readBlockScalar(state, nodeIndent) {
  var captureStart, folding, chomping = CHOMPING_CLIP, didReadContent = false, detectedIndent = false, textIndent = nodeIndent, emptyLines = 0, atMoreIndented = false, tmp, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 124) {
    folding = false;
  } else if (ch === 62) {
    folding = true;
  } else {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  while (ch !== 0) {
    ch = state.input.charCodeAt(++state.position);
    if (ch === 43 || ch === 45) {
      if (CHOMPING_CLIP === chomping) {
        chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
      } else {
        throwError(state, "repeat of a chomping mode identifier");
      }
    } else if ((tmp = fromDecimalCode(ch)) >= 0) {
      if (tmp === 0) {
        throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
      } else if (!detectedIndent) {
        textIndent = nodeIndent + tmp - 1;
        detectedIndent = true;
      } else {
        throwError(state, "repeat of an indentation width identifier");
      }
    } else {
      break;
    }
  }
  if (is_WHITE_SPACE(ch)) {
    do {
      ch = state.input.charCodeAt(++state.position);
    } while (is_WHITE_SPACE(ch));
    if (ch === 35) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (!is_EOL(ch) && ch !== 0);
    }
  }
  while (ch !== 0) {
    readLineBreak(state);
    state.lineIndent = 0;
    ch = state.input.charCodeAt(state.position);
    while ((!detectedIndent || state.lineIndent < textIndent) && ch === 32) {
      state.lineIndent++;
      ch = state.input.charCodeAt(++state.position);
    }
    if (!detectedIndent && state.lineIndent > textIndent) {
      textIndent = state.lineIndent;
    }
    if (is_EOL(ch)) {
      emptyLines++;
      continue;
    }
    if (state.lineIndent < textIndent) {
      if (chomping === CHOMPING_KEEP) {
        state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
      } else if (chomping === CHOMPING_CLIP) {
        if (didReadContent) {
          state.result += "\n";
        }
      }
      break;
    }
    if (folding) {
      if (is_WHITE_SPACE(ch)) {
        atMoreIndented = true;
        state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
      } else if (atMoreIndented) {
        atMoreIndented = false;
        state.result += common.repeat("\n", emptyLines + 1);
      } else if (emptyLines === 0) {
        if (didReadContent) {
          state.result += " ";
        }
      } else {
        state.result += common.repeat("\n", emptyLines);
      }
    } else {
      state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
    }
    didReadContent = true;
    detectedIndent = true;
    emptyLines = 0;
    captureStart = state.position;
    while (!is_EOL(ch) && ch !== 0) {
      ch = state.input.charCodeAt(++state.position);
    }
    captureSegment(state, captureStart, state.position, false);
  }
  return true;
}
function readBlockSequence(state, nodeIndent) {
  var _line, _tag = state.tag, _anchor = state.anchor, _result = [], following, detected = false, ch;
  if (state.firstTabInLine !== -1) return false;
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    if (state.firstTabInLine !== -1) {
      state.position = state.firstTabInLine;
      throwError(state, "tab characters must not be used in indentation");
    }
    if (ch !== 45) {
      break;
    }
    following = state.input.charCodeAt(state.position + 1);
    if (!is_WS_OR_EOL(following)) {
      break;
    }
    detected = true;
    state.position++;
    if (skipSeparationSpace(state, true, -1)) {
      if (state.lineIndent <= nodeIndent) {
        _result.push(null);
        ch = state.input.charCodeAt(state.position);
        continue;
      }
    }
    _line = state.line;
    composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
    _result.push(state.result);
    skipSeparationSpace(state, true, -1);
    ch = state.input.charCodeAt(state.position);
    if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
      throwError(state, "bad indentation of a sequence entry");
    } else if (state.lineIndent < nodeIndent) {
      break;
    }
  }
  if (detected) {
    state.tag = _tag;
    state.anchor = _anchor;
    state.kind = "sequence";
    state.result = _result;
    return true;
  }
  return false;
}
function readBlockMapping(state, nodeIndent, flowIndent) {
  var following, allowCompact, _line, _keyLine, _keyLineStart, _keyPos, _tag = state.tag, _anchor = state.anchor, _result = {}, overridableKeys = /* @__PURE__ */ Object.create(null), keyTag = null, keyNode = null, valueNode = null, atExplicitKey = false, detected = false, ch;
  if (state.firstTabInLine !== -1) return false;
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    if (!atExplicitKey && state.firstTabInLine !== -1) {
      state.position = state.firstTabInLine;
      throwError(state, "tab characters must not be used in indentation");
    }
    following = state.input.charCodeAt(state.position + 1);
    _line = state.line;
    if ((ch === 63 || ch === 58) && is_WS_OR_EOL(following)) {
      if (ch === 63) {
        if (atExplicitKey) {
          storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
          keyTag = keyNode = valueNode = null;
        }
        detected = true;
        atExplicitKey = true;
        allowCompact = true;
      } else if (atExplicitKey) {
        atExplicitKey = false;
        allowCompact = true;
      } else {
        throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
      }
      state.position += 1;
      ch = following;
    } else {
      _keyLine = state.line;
      _keyLineStart = state.lineStart;
      _keyPos = state.position;
      if (!composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {
        break;
      }
      if (state.line === _line) {
        ch = state.input.charCodeAt(state.position);
        while (is_WHITE_SPACE(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        if (ch === 58) {
          ch = state.input.charCodeAt(++state.position);
          if (!is_WS_OR_EOL(ch)) {
            throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
          }
          if (atExplicitKey) {
            storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
            keyTag = keyNode = valueNode = null;
          }
          detected = true;
          atExplicitKey = false;
          allowCompact = false;
          keyTag = state.tag;
          keyNode = state.result;
        } else if (detected) {
          throwError(state, "can not read an implicit mapping pair; a colon is missed");
        } else {
          state.tag = _tag;
          state.anchor = _anchor;
          return true;
        }
      } else if (detected) {
        throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
      } else {
        state.tag = _tag;
        state.anchor = _anchor;
        return true;
      }
    }
    if (state.line === _line || state.lineIndent > nodeIndent) {
      if (atExplicitKey) {
        _keyLine = state.line;
        _keyLineStart = state.lineStart;
        _keyPos = state.position;
      }
      if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
        if (atExplicitKey) {
          keyNode = state.result;
        } else {
          valueNode = state.result;
        }
      }
      if (!atExplicitKey) {
        storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _keyLine, _keyLineStart, _keyPos);
        keyTag = keyNode = valueNode = null;
      }
      skipSeparationSpace(state, true, -1);
      ch = state.input.charCodeAt(state.position);
    }
    if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
      throwError(state, "bad indentation of a mapping entry");
    } else if (state.lineIndent < nodeIndent) {
      break;
    }
  }
  if (atExplicitKey) {
    storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
  }
  if (detected) {
    state.tag = _tag;
    state.anchor = _anchor;
    state.kind = "mapping";
    state.result = _result;
  }
  return detected;
}
function readTagProperty(state) {
  var _position, isVerbatim = false, isNamed = false, tagHandle, tagName, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 33) return false;
  if (state.tag !== null) {
    throwError(state, "duplication of a tag property");
  }
  ch = state.input.charCodeAt(++state.position);
  if (ch === 60) {
    isVerbatim = true;
    ch = state.input.charCodeAt(++state.position);
  } else if (ch === 33) {
    isNamed = true;
    tagHandle = "!!";
    ch = state.input.charCodeAt(++state.position);
  } else {
    tagHandle = "!";
  }
  _position = state.position;
  if (isVerbatim) {
    do {
      ch = state.input.charCodeAt(++state.position);
    } while (ch !== 0 && ch !== 62);
    if (state.position < state.length) {
      tagName = state.input.slice(_position, state.position);
      ch = state.input.charCodeAt(++state.position);
    } else {
      throwError(state, "unexpected end of the stream within a verbatim tag");
    }
  } else {
    while (ch !== 0 && !is_WS_OR_EOL(ch)) {
      if (ch === 33) {
        if (!isNamed) {
          tagHandle = state.input.slice(_position - 1, state.position + 1);
          if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
            throwError(state, "named tag handle cannot contain such characters");
          }
          isNamed = true;
          _position = state.position + 1;
        } else {
          throwError(state, "tag suffix cannot contain exclamation marks");
        }
      }
      ch = state.input.charCodeAt(++state.position);
    }
    tagName = state.input.slice(_position, state.position);
    if (PATTERN_FLOW_INDICATORS.test(tagName)) {
      throwError(state, "tag suffix cannot contain flow indicator characters");
    }
  }
  if (tagName && !PATTERN_TAG_URI.test(tagName)) {
    throwError(state, "tag name cannot contain such characters: " + tagName);
  }
  try {
    tagName = decodeURIComponent(tagName);
  } catch (err) {
    throwError(state, "tag name is malformed: " + tagName);
  }
  if (isVerbatim) {
    state.tag = tagName;
  } else if (_hasOwnProperty$1.call(state.tagMap, tagHandle)) {
    state.tag = state.tagMap[tagHandle] + tagName;
  } else if (tagHandle === "!") {
    state.tag = "!" + tagName;
  } else if (tagHandle === "!!") {
    state.tag = "tag:yaml.org,2002:" + tagName;
  } else {
    throwError(state, 'undeclared tag handle "' + tagHandle + '"');
  }
  return true;
}
function readAnchorProperty(state) {
  var _position, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 38) return false;
  if (state.anchor !== null) {
    throwError(state, "duplication of an anchor property");
  }
  ch = state.input.charCodeAt(++state.position);
  _position = state.position;
  while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }
  if (state.position === _position) {
    throwError(state, "name of an anchor node must contain at least one character");
  }
  state.anchor = state.input.slice(_position, state.position);
  return true;
}
function readAlias(state) {
  var _position, alias, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 42) return false;
  ch = state.input.charCodeAt(++state.position);
  _position = state.position;
  while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }
  if (state.position === _position) {
    throwError(state, "name of an alias node must contain at least one character");
  }
  alias = state.input.slice(_position, state.position);
  if (!_hasOwnProperty$1.call(state.anchorMap, alias)) {
    throwError(state, 'unidentified alias "' + alias + '"');
  }
  state.result = state.anchorMap[alias];
  skipSeparationSpace(state, true, -1);
  return true;
}
function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
  var allowBlockStyles, allowBlockScalars, allowBlockCollections, indentStatus = 1, atNewLine = false, hasContent = false, typeIndex, typeQuantity, typeList, type2, flowIndent, blockIndent;
  if (state.listener !== null) {
    state.listener("open", state);
  }
  state.tag = null;
  state.anchor = null;
  state.kind = null;
  state.result = null;
  allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
  if (allowToSeek) {
    if (skipSeparationSpace(state, true, -1)) {
      atNewLine = true;
      if (state.lineIndent > parentIndent) {
        indentStatus = 1;
      } else if (state.lineIndent === parentIndent) {
        indentStatus = 0;
      } else if (state.lineIndent < parentIndent) {
        indentStatus = -1;
      }
    }
  }
  if (indentStatus === 1) {
    while (readTagProperty(state) || readAnchorProperty(state)) {
      if (skipSeparationSpace(state, true, -1)) {
        atNewLine = true;
        allowBlockCollections = allowBlockStyles;
        if (state.lineIndent > parentIndent) {
          indentStatus = 1;
        } else if (state.lineIndent === parentIndent) {
          indentStatus = 0;
        } else if (state.lineIndent < parentIndent) {
          indentStatus = -1;
        }
      } else {
        allowBlockCollections = false;
      }
    }
  }
  if (allowBlockCollections) {
    allowBlockCollections = atNewLine || allowCompact;
  }
  if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
    if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
      flowIndent = parentIndent;
    } else {
      flowIndent = parentIndent + 1;
    }
    blockIndent = state.position - state.lineStart;
    if (indentStatus === 1) {
      if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent)) {
        hasContent = true;
      } else {
        if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent)) {
          hasContent = true;
        } else if (readAlias(state)) {
          hasContent = true;
          if (state.tag !== null || state.anchor !== null) {
            throwError(state, "alias node should not have any properties");
          }
        } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
          hasContent = true;
          if (state.tag === null) {
            state.tag = "?";
          }
        }
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
      }
    } else if (indentStatus === 0) {
      hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
    }
  }
  if (state.tag === null) {
    if (state.anchor !== null) {
      state.anchorMap[state.anchor] = state.result;
    }
  } else if (state.tag === "?") {
    if (state.result !== null && state.kind !== "scalar") {
      throwError(state, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + state.kind + '"');
    }
    for (typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
      type2 = state.implicitTypes[typeIndex];
      if (type2.resolve(state.result)) {
        state.result = type2.construct(state.result);
        state.tag = type2.tag;
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
        break;
      }
    }
  } else if (state.tag !== "!") {
    if (_hasOwnProperty$1.call(state.typeMap[state.kind || "fallback"], state.tag)) {
      type2 = state.typeMap[state.kind || "fallback"][state.tag];
    } else {
      type2 = null;
      typeList = state.typeMap.multi[state.kind || "fallback"];
      for (typeIndex = 0, typeQuantity = typeList.length; typeIndex < typeQuantity; typeIndex += 1) {
        if (state.tag.slice(0, typeList[typeIndex].tag.length) === typeList[typeIndex].tag) {
          type2 = typeList[typeIndex];
          break;
        }
      }
    }
    if (!type2) {
      throwError(state, "unknown tag !<" + state.tag + ">");
    }
    if (state.result !== null && type2.kind !== state.kind) {
      throwError(state, "unacceptable node kind for !<" + state.tag + '> tag; it should be "' + type2.kind + '", not "' + state.kind + '"');
    }
    if (!type2.resolve(state.result, state.tag)) {
      throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag");
    } else {
      state.result = type2.construct(state.result, state.tag);
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = state.result;
      }
    }
  }
  if (state.listener !== null) {
    state.listener("close", state);
  }
  return state.tag !== null || state.anchor !== null || hasContent;
}
function readDocument(state) {
  var documentStart = state.position, _position, directiveName, directiveArgs, hasDirectives = false, ch;
  state.version = null;
  state.checkLineBreaks = state.legacy;
  state.tagMap = /* @__PURE__ */ Object.create(null);
  state.anchorMap = /* @__PURE__ */ Object.create(null);
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    skipSeparationSpace(state, true, -1);
    ch = state.input.charCodeAt(state.position);
    if (state.lineIndent > 0 || ch !== 37) {
      break;
    }
    hasDirectives = true;
    ch = state.input.charCodeAt(++state.position);
    _position = state.position;
    while (ch !== 0 && !is_WS_OR_EOL(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }
    directiveName = state.input.slice(_position, state.position);
    directiveArgs = [];
    if (directiveName.length < 1) {
      throwError(state, "directive name must not be less than one character in length");
    }
    while (ch !== 0) {
      while (is_WHITE_SPACE(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      if (ch === 35) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (ch !== 0 && !is_EOL(ch));
        break;
      }
      if (is_EOL(ch)) break;
      _position = state.position;
      while (ch !== 0 && !is_WS_OR_EOL(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      directiveArgs.push(state.input.slice(_position, state.position));
    }
    if (ch !== 0) readLineBreak(state);
    if (_hasOwnProperty$1.call(directiveHandlers, directiveName)) {
      directiveHandlers[directiveName](state, directiveName, directiveArgs);
    } else {
      throwWarning(state, 'unknown document directive "' + directiveName + '"');
    }
  }
  skipSeparationSpace(state, true, -1);
  if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45) {
    state.position += 3;
    skipSeparationSpace(state, true, -1);
  } else if (hasDirectives) {
    throwError(state, "directives end mark is expected");
  }
  composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
  skipSeparationSpace(state, true, -1);
  if (state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
    throwWarning(state, "non-ASCII line breaks are interpreted as content");
  }
  state.documents.push(state.result);
  if (state.position === state.lineStart && testDocumentSeparator(state)) {
    if (state.input.charCodeAt(state.position) === 46) {
      state.position += 3;
      skipSeparationSpace(state, true, -1);
    }
    return;
  }
  if (state.position < state.length - 1) {
    throwError(state, "end of the stream or a document separator is expected");
  } else {
    return;
  }
}
function loadDocuments(input, options) {
  input = String(input);
  options = options || {};
  if (input.length !== 0) {
    if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13) {
      input += "\n";
    }
    if (input.charCodeAt(0) === 65279) {
      input = input.slice(1);
    }
  }
  var state = new State$1(input, options);
  var nullpos = input.indexOf("\0");
  if (nullpos !== -1) {
    state.position = nullpos;
    throwError(state, "null byte is not allowed in input");
  }
  state.input += "\0";
  while (state.input.charCodeAt(state.position) === 32) {
    state.lineIndent += 1;
    state.position += 1;
  }
  while (state.position < state.length - 1) {
    readDocument(state);
  }
  return state.documents;
}
function loadAll$1(input, iterator, options) {
  if (iterator !== null && typeof iterator === "object" && typeof options === "undefined") {
    options = iterator;
    iterator = null;
  }
  var documents = loadDocuments(input, options);
  if (typeof iterator !== "function") {
    return documents;
  }
  for (var index = 0, length = documents.length; index < length; index += 1) {
    iterator(documents[index]);
  }
}
function load$1(input, options) {
  var documents = loadDocuments(input, options);
  if (documents.length === 0) {
    return void 0;
  } else if (documents.length === 1) {
    return documents[0];
  }
  throw new exception("expected a single document in the stream, but found more");
}
var loadAll_1 = loadAll$1;
var load_1 = load$1;
var loader = {
  loadAll: loadAll_1,
  load: load_1
};
var _toString = Object.prototype.toString;
var _hasOwnProperty = Object.prototype.hasOwnProperty;
var CHAR_BOM = 65279;
var CHAR_TAB = 9;
var CHAR_LINE_FEED = 10;
var CHAR_CARRIAGE_RETURN = 13;
var CHAR_SPACE = 32;
var CHAR_EXCLAMATION = 33;
var CHAR_DOUBLE_QUOTE = 34;
var CHAR_SHARP = 35;
var CHAR_PERCENT = 37;
var CHAR_AMPERSAND = 38;
var CHAR_SINGLE_QUOTE = 39;
var CHAR_ASTERISK = 42;
var CHAR_COMMA = 44;
var CHAR_MINUS = 45;
var CHAR_COLON = 58;
var CHAR_EQUALS = 61;
var CHAR_GREATER_THAN = 62;
var CHAR_QUESTION = 63;
var CHAR_COMMERCIAL_AT = 64;
var CHAR_LEFT_SQUARE_BRACKET = 91;
var CHAR_RIGHT_SQUARE_BRACKET = 93;
var CHAR_GRAVE_ACCENT = 96;
var CHAR_LEFT_CURLY_BRACKET = 123;
var CHAR_VERTICAL_LINE = 124;
var CHAR_RIGHT_CURLY_BRACKET = 125;
var ESCAPE_SEQUENCES = {};
ESCAPE_SEQUENCES[0] = "\\0";
ESCAPE_SEQUENCES[7] = "\\a";
ESCAPE_SEQUENCES[8] = "\\b";
ESCAPE_SEQUENCES[9] = "\\t";
ESCAPE_SEQUENCES[10] = "\\n";
ESCAPE_SEQUENCES[11] = "\\v";
ESCAPE_SEQUENCES[12] = "\\f";
ESCAPE_SEQUENCES[13] = "\\r";
ESCAPE_SEQUENCES[27] = "\\e";
ESCAPE_SEQUENCES[34] = '\\"';
ESCAPE_SEQUENCES[92] = "\\\\";
ESCAPE_SEQUENCES[133] = "\\N";
ESCAPE_SEQUENCES[160] = "\\_";
ESCAPE_SEQUENCES[8232] = "\\L";
ESCAPE_SEQUENCES[8233] = "\\P";
var DEPRECATED_BOOLEANS_SYNTAX = [
  "y",
  "Y",
  "yes",
  "Yes",
  "YES",
  "on",
  "On",
  "ON",
  "n",
  "N",
  "no",
  "No",
  "NO",
  "off",
  "Off",
  "OFF"
];
var DEPRECATED_BASE60_SYNTAX = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
function compileStyleMap(schema2, map2) {
  var result, keys, index, length, tag, style, type2;
  if (map2 === null) return {};
  result = {};
  keys = Object.keys(map2);
  for (index = 0, length = keys.length; index < length; index += 1) {
    tag = keys[index];
    style = String(map2[tag]);
    if (tag.slice(0, 2) === "!!") {
      tag = "tag:yaml.org,2002:" + tag.slice(2);
    }
    type2 = schema2.compiledTypeMap["fallback"][tag];
    if (type2 && _hasOwnProperty.call(type2.styleAliases, style)) {
      style = type2.styleAliases[style];
    }
    result[tag] = style;
  }
  return result;
}
function encodeHex(character) {
  var string, handle, length;
  string = character.toString(16).toUpperCase();
  if (character <= 255) {
    handle = "x";
    length = 2;
  } else if (character <= 65535) {
    handle = "u";
    length = 4;
  } else if (character <= 4294967295) {
    handle = "U";
    length = 8;
  } else {
    throw new exception("code point within a string may not be greater than 0xFFFFFFFF");
  }
  return "\\" + handle + common.repeat("0", length - string.length) + string;
}
var QUOTING_TYPE_SINGLE = 1;
var QUOTING_TYPE_DOUBLE = 2;
function State(options) {
  this.schema = options["schema"] || _default;
  this.indent = Math.max(1, options["indent"] || 2);
  this.noArrayIndent = options["noArrayIndent"] || false;
  this.skipInvalid = options["skipInvalid"] || false;
  this.flowLevel = common.isNothing(options["flowLevel"]) ? -1 : options["flowLevel"];
  this.styleMap = compileStyleMap(this.schema, options["styles"] || null);
  this.sortKeys = options["sortKeys"] || false;
  this.lineWidth = options["lineWidth"] || 80;
  this.noRefs = options["noRefs"] || false;
  this.noCompatMode = options["noCompatMode"] || false;
  this.condenseFlow = options["condenseFlow"] || false;
  this.quotingType = options["quotingType"] === '"' ? QUOTING_TYPE_DOUBLE : QUOTING_TYPE_SINGLE;
  this.forceQuotes = options["forceQuotes"] || false;
  this.replacer = typeof options["replacer"] === "function" ? options["replacer"] : null;
  this.implicitTypes = this.schema.compiledImplicit;
  this.explicitTypes = this.schema.compiledExplicit;
  this.tag = null;
  this.result = "";
  this.duplicates = [];
  this.usedDuplicates = null;
}
function indentString(string, spaces) {
  var ind = common.repeat(" ", spaces), position = 0, next = -1, result = "", line, length = string.length;
  while (position < length) {
    next = string.indexOf("\n", position);
    if (next === -1) {
      line = string.slice(position);
      position = length;
    } else {
      line = string.slice(position, next + 1);
      position = next + 1;
    }
    if (line.length && line !== "\n") result += ind;
    result += line;
  }
  return result;
}
function generateNextLine(state, level) {
  return "\n" + common.repeat(" ", state.indent * level);
}
function testImplicitResolving(state, str2) {
  var index, length, type2;
  for (index = 0, length = state.implicitTypes.length; index < length; index += 1) {
    type2 = state.implicitTypes[index];
    if (type2.resolve(str2)) {
      return true;
    }
  }
  return false;
}
function isWhitespace(c) {
  return c === CHAR_SPACE || c === CHAR_TAB;
}
function isPrintable(c) {
  return 32 <= c && c <= 126 || 161 <= c && c <= 55295 && c !== 8232 && c !== 8233 || 57344 <= c && c <= 65533 && c !== CHAR_BOM || 65536 <= c && c <= 1114111;
}
function isNsCharOrWhitespace(c) {
  return isPrintable(c) && c !== CHAR_BOM && c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
}
function isPlainSafe(c, prev, inblock) {
  var cIsNsCharOrWhitespace = isNsCharOrWhitespace(c);
  var cIsNsChar = cIsNsCharOrWhitespace && !isWhitespace(c);
  return (
    // ns-plain-safe
    (inblock ? (
      // c = flow-in
      cIsNsCharOrWhitespace
    ) : cIsNsCharOrWhitespace && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET) && c !== CHAR_SHARP && !(prev === CHAR_COLON && !cIsNsChar) || isNsCharOrWhitespace(prev) && !isWhitespace(prev) && c === CHAR_SHARP || prev === CHAR_COLON && cIsNsChar
  );
}
function isPlainSafeFirst(c) {
  return isPrintable(c) && c !== CHAR_BOM && !isWhitespace(c) && c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
}
function isPlainSafeLast(c) {
  return !isWhitespace(c) && c !== CHAR_COLON;
}
function codePointAt(string, pos) {
  var first = string.charCodeAt(pos), second;
  if (first >= 55296 && first <= 56319 && pos + 1 < string.length) {
    second = string.charCodeAt(pos + 1);
    if (second >= 56320 && second <= 57343) {
      return (first - 55296) * 1024 + second - 56320 + 65536;
    }
  }
  return first;
}
function needIndentIndicator(string) {
  var leadingSpaceRe = /^\n* /;
  return leadingSpaceRe.test(string);
}
var STYLE_PLAIN = 1;
var STYLE_SINGLE = 2;
var STYLE_LITERAL = 3;
var STYLE_FOLDED = 4;
var STYLE_DOUBLE = 5;
function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType, quotingType, forceQuotes, inblock) {
  var i;
  var char = 0;
  var prevChar = null;
  var hasLineBreak = false;
  var hasFoldableLine = false;
  var shouldTrackWidth = lineWidth !== -1;
  var previousLineBreak = -1;
  var plain = isPlainSafeFirst(codePointAt(string, 0)) && isPlainSafeLast(codePointAt(string, string.length - 1));
  if (singleLineOnly || forceQuotes) {
    for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
      char = codePointAt(string, i);
      if (!isPrintable(char)) {
        return STYLE_DOUBLE;
      }
      plain = plain && isPlainSafe(char, prevChar, inblock);
      prevChar = char;
    }
  } else {
    for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
      char = codePointAt(string, i);
      if (char === CHAR_LINE_FEED) {
        hasLineBreak = true;
        if (shouldTrackWidth) {
          hasFoldableLine = hasFoldableLine || // Foldable line = too long, and not more-indented.
          i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
          previousLineBreak = i;
        }
      } else if (!isPrintable(char)) {
        return STYLE_DOUBLE;
      }
      plain = plain && isPlainSafe(char, prevChar, inblock);
      prevChar = char;
    }
    hasFoldableLine = hasFoldableLine || shouldTrackWidth && (i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ");
  }
  if (!hasLineBreak && !hasFoldableLine) {
    if (plain && !forceQuotes && !testAmbiguousType(string)) {
      return STYLE_PLAIN;
    }
    return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
  }
  if (indentPerLevel > 9 && needIndentIndicator(string)) {
    return STYLE_DOUBLE;
  }
  if (!forceQuotes) {
    return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
  }
  return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
}
function writeScalar(state, string, level, iskey, inblock) {
  state.dump = function() {
    if (string.length === 0) {
      return state.quotingType === QUOTING_TYPE_DOUBLE ? '""' : "''";
    }
    if (!state.noCompatMode) {
      if (DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1 || DEPRECATED_BASE60_SYNTAX.test(string)) {
        return state.quotingType === QUOTING_TYPE_DOUBLE ? '"' + string + '"' : "'" + string + "'";
      }
    }
    var indent = state.indent * Math.max(1, level);
    var lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
    var singleLineOnly = iskey || state.flowLevel > -1 && level >= state.flowLevel;
    function testAmbiguity(string2) {
      return testImplicitResolving(state, string2);
    }
    switch (chooseScalarStyle(
      string,
      singleLineOnly,
      state.indent,
      lineWidth,
      testAmbiguity,
      state.quotingType,
      state.forceQuotes && !iskey,
      inblock
    )) {
      case STYLE_PLAIN:
        return string;
      case STYLE_SINGLE:
        return "'" + string.replace(/'/g, "''") + "'";
      case STYLE_LITERAL:
        return "|" + blockHeader(string, state.indent) + dropEndingNewline(indentString(string, indent));
      case STYLE_FOLDED:
        return ">" + blockHeader(string, state.indent) + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
      case STYLE_DOUBLE:
        return '"' + escapeString(string) + '"';
      default:
        throw new exception("impossible error: invalid scalar style");
    }
  }();
}
function blockHeader(string, indentPerLevel) {
  var indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
  var clip = string[string.length - 1] === "\n";
  var keep = clip && (string[string.length - 2] === "\n" || string === "\n");
  var chomp = keep ? "+" : clip ? "" : "-";
  return indentIndicator + chomp + "\n";
}
function dropEndingNewline(string) {
  return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
}
function foldString(string, width) {
  var lineRe = /(\n+)([^\n]*)/g;
  var result = function() {
    var nextLF = string.indexOf("\n");
    nextLF = nextLF !== -1 ? nextLF : string.length;
    lineRe.lastIndex = nextLF;
    return foldLine(string.slice(0, nextLF), width);
  }();
  var prevMoreIndented = string[0] === "\n" || string[0] === " ";
  var moreIndented;
  var match;
  while (match = lineRe.exec(string)) {
    var prefix = match[1], line = match[2];
    moreIndented = line[0] === " ";
    result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") + foldLine(line, width);
    prevMoreIndented = moreIndented;
  }
  return result;
}
function foldLine(line, width) {
  if (line === "" || line[0] === " ") return line;
  var breakRe = / [^ ]/g;
  var match;
  var start = 0, end, curr = 0, next = 0;
  var result = "";
  while (match = breakRe.exec(line)) {
    next = match.index;
    if (next - start > width) {
      end = curr > start ? curr : next;
      result += "\n" + line.slice(start, end);
      start = end + 1;
    }
    curr = next;
  }
  result += "\n";
  if (line.length - start > width && curr > start) {
    result += line.slice(start, curr) + "\n" + line.slice(curr + 1);
  } else {
    result += line.slice(start);
  }
  return result.slice(1);
}
function escapeString(string) {
  var result = "";
  var char = 0;
  var escapeSeq;
  for (var i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
    char = codePointAt(string, i);
    escapeSeq = ESCAPE_SEQUENCES[char];
    if (!escapeSeq && isPrintable(char)) {
      result += string[i];
      if (char >= 65536) result += string[i + 1];
    } else {
      result += escapeSeq || encodeHex(char);
    }
  }
  return result;
}
function writeFlowSequence(state, level, object) {
  var _result = "", _tag = state.tag, index, length, value;
  for (index = 0, length = object.length; index < length; index += 1) {
    value = object[index];
    if (state.replacer) {
      value = state.replacer.call(object, String(index), value);
    }
    if (writeNode(state, level, value, false, false) || typeof value === "undefined" && writeNode(state, level, null, false, false)) {
      if (_result !== "") _result += "," + (!state.condenseFlow ? " " : "");
      _result += state.dump;
    }
  }
  state.tag = _tag;
  state.dump = "[" + _result + "]";
}
function writeBlockSequence(state, level, object, compact) {
  var _result = "", _tag = state.tag, index, length, value;
  for (index = 0, length = object.length; index < length; index += 1) {
    value = object[index];
    if (state.replacer) {
      value = state.replacer.call(object, String(index), value);
    }
    if (writeNode(state, level + 1, value, true, true, false, true) || typeof value === "undefined" && writeNode(state, level + 1, null, true, true, false, true)) {
      if (!compact || _result !== "") {
        _result += generateNextLine(state, level);
      }
      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        _result += "-";
      } else {
        _result += "- ";
      }
      _result += state.dump;
    }
  }
  state.tag = _tag;
  state.dump = _result || "[]";
}
function writeFlowMapping(state, level, object) {
  var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, pairBuffer;
  for (index = 0, length = objectKeyList.length; index < length; index += 1) {
    pairBuffer = "";
    if (_result !== "") pairBuffer += ", ";
    if (state.condenseFlow) pairBuffer += '"';
    objectKey = objectKeyList[index];
    objectValue = object[objectKey];
    if (state.replacer) {
      objectValue = state.replacer.call(object, objectKey, objectValue);
    }
    if (!writeNode(state, level, objectKey, false, false)) {
      continue;
    }
    if (state.dump.length > 1024) pairBuffer += "? ";
    pairBuffer += state.dump + (state.condenseFlow ? '"' : "") + ":" + (state.condenseFlow ? "" : " ");
    if (!writeNode(state, level, objectValue, false, false)) {
      continue;
    }
    pairBuffer += state.dump;
    _result += pairBuffer;
  }
  state.tag = _tag;
  state.dump = "{" + _result + "}";
}
function writeBlockMapping(state, level, object, compact) {
  var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, explicitPair, pairBuffer;
  if (state.sortKeys === true) {
    objectKeyList.sort();
  } else if (typeof state.sortKeys === "function") {
    objectKeyList.sort(state.sortKeys);
  } else if (state.sortKeys) {
    throw new exception("sortKeys must be a boolean or a function");
  }
  for (index = 0, length = objectKeyList.length; index < length; index += 1) {
    pairBuffer = "";
    if (!compact || _result !== "") {
      pairBuffer += generateNextLine(state, level);
    }
    objectKey = objectKeyList[index];
    objectValue = object[objectKey];
    if (state.replacer) {
      objectValue = state.replacer.call(object, objectKey, objectValue);
    }
    if (!writeNode(state, level + 1, objectKey, true, true, true)) {
      continue;
    }
    explicitPair = state.tag !== null && state.tag !== "?" || state.dump && state.dump.length > 1024;
    if (explicitPair) {
      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        pairBuffer += "?";
      } else {
        pairBuffer += "? ";
      }
    }
    pairBuffer += state.dump;
    if (explicitPair) {
      pairBuffer += generateNextLine(state, level);
    }
    if (!writeNode(state, level + 1, objectValue, true, explicitPair)) {
      continue;
    }
    if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
      pairBuffer += ":";
    } else {
      pairBuffer += ": ";
    }
    pairBuffer += state.dump;
    _result += pairBuffer;
  }
  state.tag = _tag;
  state.dump = _result || "{}";
}
function detectType(state, object, explicit) {
  var _result, typeList, index, length, type2, style;
  typeList = explicit ? state.explicitTypes : state.implicitTypes;
  for (index = 0, length = typeList.length; index < length; index += 1) {
    type2 = typeList[index];
    if ((type2.instanceOf || type2.predicate) && (!type2.instanceOf || typeof object === "object" && object instanceof type2.instanceOf) && (!type2.predicate || type2.predicate(object))) {
      if (explicit) {
        if (type2.multi && type2.representName) {
          state.tag = type2.representName(object);
        } else {
          state.tag = type2.tag;
        }
      } else {
        state.tag = "?";
      }
      if (type2.represent) {
        style = state.styleMap[type2.tag] || type2.defaultStyle;
        if (_toString.call(type2.represent) === "[object Function]") {
          _result = type2.represent(object, style);
        } else if (_hasOwnProperty.call(type2.represent, style)) {
          _result = type2.represent[style](object, style);
        } else {
          throw new exception("!<" + type2.tag + '> tag resolver accepts not "' + style + '" style');
        }
        state.dump = _result;
      }
      return true;
    }
  }
  return false;
}
function writeNode(state, level, object, block, compact, iskey, isblockseq) {
  state.tag = null;
  state.dump = object;
  if (!detectType(state, object, false)) {
    detectType(state, object, true);
  }
  var type2 = _toString.call(state.dump);
  var inblock = block;
  var tagStr;
  if (block) {
    block = state.flowLevel < 0 || state.flowLevel > level;
  }
  var objectOrArray = type2 === "[object Object]" || type2 === "[object Array]", duplicateIndex, duplicate;
  if (objectOrArray) {
    duplicateIndex = state.duplicates.indexOf(object);
    duplicate = duplicateIndex !== -1;
  }
  if (state.tag !== null && state.tag !== "?" || duplicate || state.indent !== 2 && level > 0) {
    compact = false;
  }
  if (duplicate && state.usedDuplicates[duplicateIndex]) {
    state.dump = "*ref_" + duplicateIndex;
  } else {
    if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
      state.usedDuplicates[duplicateIndex] = true;
    }
    if (type2 === "[object Object]") {
      if (block && Object.keys(state.dump).length !== 0) {
        writeBlockMapping(state, level, state.dump, compact);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + state.dump;
        }
      } else {
        writeFlowMapping(state, level, state.dump);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + " " + state.dump;
        }
      }
    } else if (type2 === "[object Array]") {
      if (block && state.dump.length !== 0) {
        if (state.noArrayIndent && !isblockseq && level > 0) {
          writeBlockSequence(state, level - 1, state.dump, compact);
        } else {
          writeBlockSequence(state, level, state.dump, compact);
        }
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + state.dump;
        }
      } else {
        writeFlowSequence(state, level, state.dump);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + " " + state.dump;
        }
      }
    } else if (type2 === "[object String]") {
      if (state.tag !== "?") {
        writeScalar(state, state.dump, level, iskey, inblock);
      }
    } else if (type2 === "[object Undefined]") {
      return false;
    } else {
      if (state.skipInvalid) return false;
      throw new exception("unacceptable kind of an object to dump " + type2);
    }
    if (state.tag !== null && state.tag !== "?") {
      tagStr = encodeURI(
        state.tag[0] === "!" ? state.tag.slice(1) : state.tag
      ).replace(/!/g, "%21");
      if (state.tag[0] === "!") {
        tagStr = "!" + tagStr;
      } else if (tagStr.slice(0, 18) === "tag:yaml.org,2002:") {
        tagStr = "!!" + tagStr.slice(18);
      } else {
        tagStr = "!<" + tagStr + ">";
      }
      state.dump = tagStr + " " + state.dump;
    }
  }
  return true;
}
function getDuplicateReferences(object, state) {
  var objects = [], duplicatesIndexes = [], index, length;
  inspectNode(object, objects, duplicatesIndexes);
  for (index = 0, length = duplicatesIndexes.length; index < length; index += 1) {
    state.duplicates.push(objects[duplicatesIndexes[index]]);
  }
  state.usedDuplicates = new Array(length);
}
function inspectNode(object, objects, duplicatesIndexes) {
  var objectKeyList, index, length;
  if (object !== null && typeof object === "object") {
    index = objects.indexOf(object);
    if (index !== -1) {
      if (duplicatesIndexes.indexOf(index) === -1) {
        duplicatesIndexes.push(index);
      }
    } else {
      objects.push(object);
      if (Array.isArray(object)) {
        for (index = 0, length = object.length; index < length; index += 1) {
          inspectNode(object[index], objects, duplicatesIndexes);
        }
      } else {
        objectKeyList = Object.keys(object);
        for (index = 0, length = objectKeyList.length; index < length; index += 1) {
          inspectNode(object[objectKeyList[index]], objects, duplicatesIndexes);
        }
      }
    }
  }
}
function dump$1(input, options) {
  options = options || {};
  var state = new State(options);
  if (!state.noRefs) getDuplicateReferences(input, state);
  var value = input;
  if (state.replacer) {
    value = state.replacer.call({ "": value }, "", value);
  }
  if (writeNode(state, 0, value, true, true)) return state.dump + "\n";
  return "";
}
var dump_1 = dump$1;
var dumper = {
  dump: dump_1
};
function renamed(from, to) {
  return function() {
    throw new Error("Function yaml." + from + " is removed in js-yaml 4. Use yaml." + to + " instead, which is now safe by default.");
  };
}
var Type = type;
var Schema = schema;
var FAILSAFE_SCHEMA = failsafe;
var JSON_SCHEMA = json;
var CORE_SCHEMA = core;
var DEFAULT_SCHEMA = _default;
var load = loader.load;
var loadAll = loader.loadAll;
var dump = dumper.dump;
var YAMLException = exception;
var types = {
  binary,
  float,
  map,
  null: _null,
  pairs,
  set,
  timestamp,
  bool,
  int,
  merge,
  omap,
  seq,
  str
};
var safeLoad = renamed("safeLoad", "load");
var safeLoadAll = renamed("safeLoadAll", "loadAll");
var safeDump = renamed("safeDump", "dump");
var jsYaml = {
  Type,
  Schema,
  FAILSAFE_SCHEMA,
  JSON_SCHEMA,
  CORE_SCHEMA,
  DEFAULT_SCHEMA,
  load,
  loadAll,
  dump,
  YAMLException,
  types,
  safeLoad,
  safeLoadAll,
  safeDump
};
var js_yaml_default = jsYaml;

// src/utils/toolAnnotations.js
var TOOL_ANNOTATIONS = {
  "bet": {
    "cwlPath": "cwl/fsl/bet.cwl",
    "bounds": {
      "frac": [
        0,
        1
      ],
      "vert_frac": [
        -1,
        1
      ]
    },
    "requires": {
      "brain_mask": "mask",
      "brain_skull": "skull",
      "brain_mesh": "mesh"
    },
    "fullName": "Brain Extraction Tool (BET)",
    "function": "Removes non-brain tissue from MRI images using a deformable surface model that iteratively fits to the brain boundary.",
    "modality": "T1-weighted structural image (3D NIfTI). Can also process 4D fMRI with -F flag.",
    "keyParameters": "-f (fractional intensity 0\u21921, default 0.5), -g (vertical gradient), -R (robust mode), -m (output binary mask)",
    "keyPoints": "Default threshold works for most T1s. Use -R for noisy/difficult data. Lower -f (~0.3) for functional images.",
    "typicalUse": "First step in structural or functional preprocessing to isolate brain tissue.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "brain_extraction": [".nii", ".nii.gz"],
      "brain_mask": [".nii", ".nii.gz"],
      "brain_skull": [".nii", ".nii.gz"],
      "brain_mesh": [".vtk"],
      "brain_registration": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/BET"
  },
  "fast": {
    "cwlPath": "cwl/fsl/fast.cwl",
    "requires": {
      "output_bias_field": "bias_field",
      "output_bias_corrected_image": "bias_corrected_image",
      "output_probability_maps": "probability_maps",
      "output_segments": "segments"
    },
    "enumHints": {
      "image_type": [
        1,
        2,
        3
      ]
    },
    "fullName": "FMRIB's Automated Segmentation Tool (FAST)",
    "function": "Segments brain images into gray matter, white matter, and CSF using a hidden Markov random field model with integrated bias field correction.",
    "modality": "Brain-extracted T1-weighted 3D NIfTI volume.",
    "keyParameters": "-n (number of tissue classes, default 3), -t (image type: 1=T1, 2=T2, 3=PD), -B (output bias field), -o (output basename)",
    "keyPoints": "Input must be brain-extracted. Outputs partial volume maps (*_pve_0/1/2) for each tissue class. Use -B to get estimated bias field.",
    "typicalUse": "Tissue probability maps for normalization, VBM studies, or masking.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz"],
      "manualseg": [".nii", ".nii.gz"],
      "initialize_priors": [".mat"]
    },
    "outputExtensions": {
      "segmented_files": [".nii.gz"],
      "output_bias_field": [".nii.gz"],
      "output_bias_corrected_image": [".nii.gz"],
      "output_probability_maps": [".nii.gz"],
      "output_segments": [".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FAST"
  },
  "fslreorient2std": {
    "cwlPath": "cwl/fsl/fslreorient2std.cwl",
    "fullName": "FSL Reorient to Standard Orientation",
    "function": "Reorients images to match standard (MNI) orientation using 90-degree rotations and flips only.",
    "modality": "3D or 4D NIfTI volume in any orientation.",
    "keyParameters": "<input> [output]",
    "keyPoints": "Only applies 90-degree rotations/flips (no interpolation). Does not register to standard space. Should be run as first step before any processing.",
    "typicalUse": "Ensuring consistent orientation before processing.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "reoriented_image": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/Orientation%20Explained"
  },
  "fslroi": {
    "cwlPath": "cwl/fsl/fslroi.cwl",
    "fullName": "FSL Region of Interest Extraction (fslroi)",
    "function": "Extracts a spatial or temporal sub-region from NIfTI images.",
    "modality": "3D or 4D NIfTI volume.",
    "keyParameters": "<input> <output> <xmin> <xsize> <ymin> <ysize> <zmin> <zsize> [<tmin> <tsize>]",
    "keyPoints": "Indices are 0-based. For temporal extraction only, use: fslroi input output tmin tsize. Useful for extracting reference volumes from 4D data.",
    "typicalUse": "Cropping images spatially or selecting specific time points from 4D data.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "roi_image": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/Fslutils"
  },
  "fslsplit": {
    "cwlPath": "cwl/fsl/fslsplit.cwl",
    "enumHints": {
      "dimension": [
        "t",
        "x",
        "y",
        "z"
      ]
    },
    "fullName": "FSL Volume Split (fslsplit)",
    "function": "Splits a 4D time series into individual 3D volumes or splits along any spatial axis.",
    "modality": "4D NIfTI time series.",
    "keyParameters": "<input> [output_basename] -t/-x/-y/-z (split direction, default -t for time)",
    "keyPoints": "Default splits along time dimension. Output files are numbered sequentially (vol0000, vol0001, ...). Useful for per-volume quality control.",
    "typicalUse": "Processing individual volumes separately, quality control inspection.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "split_files": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/Fslutils"
  },
  "fslmerge": {
    "cwlPath": "cwl/fsl/fslmerge.cwl",
    "fullName": "FSL Volume Merge (fslmerge)",
    "function": "Concatenates multiple 3D volumes into a 4D time series or merges along any spatial axis.",
    "modality": "Multiple 3D NIfTI volumes.",
    "keyParameters": "-t/-x/-y/-z/-a (merge direction), <output> <input1> <input2> ...",
    "keyPoints": "Use -t for temporal concatenation (most common). -a auto-detects axis. Input images must have matching spatial dimensions when merging in time.",
    "typicalUse": "Combining processed volumes back into 4D, concatenating runs.",
    "inputExtensions": {
      "input_files": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "merged_image": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/Fslutils"
  },
  "fslstats": {
    "cwlPath": "cwl/fsl/fslstats.cwl",
    "fullName": "FSL Image Statistics (fslstats)",
    "function": "Computes various summary statistics from image data, optionally within a mask region.",
    "modality": "3D or 4D NIfTI volume, optional mask.",
    "keyParameters": "-k (mask image), -m (mean), -s (standard deviation), -r (min max), -V (volume in voxels and mm3), -p (nth percentile)",
    "keyPoints": "Apply -k mask before other options. Use -t for per-volume stats on 4D data. Outputs to stdout for easy scripting.",
    "typicalUse": "Extracting summary statistics from ROIs or whole-brain.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz"],
      "mask": [".nii", ".nii.gz"],
      "index_mask": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "stats_output": [".txt"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/Fslutils"
  },
  "fslmeants": {
    "cwlPath": "cwl/fsl/fslmeants.cwl",
    "fullName": "FSL Mean Time Series Extraction (fslmeants)",
    "function": "Extracts the mean time series from a 4D dataset within a mask or at specified coordinates.",
    "modality": "4D fMRI NIfTI time series plus ROI mask or coordinates.",
    "keyParameters": "-i (input 4D), -o (output text file), -m (mask image), -c (x y z coordinates), --eig (output eigenvariates)",
    "keyPoints": "Outputs one value per timepoint. Use -m for mask-based extraction, -c for single-voxel. --eig outputs eigenvariate (first principal component) instead of mean.",
    "typicalUse": "ROI time series extraction for seed-based connectivity analysis.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz"],
      "mask": [".nii", ".nii.gz"],
      "label": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "timeseries": [".txt"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/Fslutils"
  },
  "cluster": {
    "cwlPath": "cwl/fsl/cluster.cwl",
    "fullName": "FSL Cluster Analysis (cluster)",
    "function": "Identifies contiguous clusters of suprathreshold voxels in statistical images and reports their properties.",
    "modality": "Statistical map (z-stat or p-value 3D NIfTI).",
    "keyParameters": "-i (input stat image), -t (z threshold), -p (p threshold), --oindex (cluster index output), --olmax (local maxima output), -c (cope image for effect sizes)",
    "keyPoints": "Reports cluster size, peak coordinates, and p-values. Use with -c to get mean COPE within clusters. GRF-based p-values require smoothness estimates.",
    "typicalUse": "Cluster-based thresholding and extracting peak coordinates from statistical maps.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz"],
      "cope": [".nii", ".nii.gz"],
      "xfm": [".mat"],
      "stdvol": [".nii", ".nii.gz"],
      "warpvol": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "cluster_table": [".txt"],
      "cluster_index": [".nii", ".nii.gz"],
      "thresholded_image": [".nii", ".nii.gz"],
      "local_maxima_txt": [".txt"],
      "local_maxima_image": [".nii", ".nii.gz"],
      "size_image": [".nii", ".nii.gz"],
      "max_image": [".nii", ".nii.gz"],
      "mean_image": [".nii", ".nii.gz"],
      "pvals_image": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/Cluster"
  },
  "mcflirt": {
    "cwlPath": "cwl/fsl/mcflirt.cwl",
    "enumHints": {
      "cost": [
        "mutualinfo",
        "corratio",
        "normcorr",
        "normmi",
        "leastsquares"
      ]
    },
    "fullName": "Motion Correction using FLIRT (MCFLIRT)",
    "function": "Intra-modal motion correction for fMRI time series using rigid-body (6-DOF) transformations optimized for fMRI data.",
    "modality": "4D fMRI NIfTI time series.",
    "keyParameters": "-refvol (reference volume index), -cost (cost function), -plots (output motion parameter plots), -mats (save transformation matrices)",
    "keyPoints": "Default reference is middle volume. Use -plots for motion parameter files (6 columns: 3 rotations + 3 translations). Motion params useful as nuisance regressors.",
    "typicalUse": "Correcting head motion in functional data; motion parameters used as nuisance regressors.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz"],
      "ref_file": [".nii", ".nii.gz"],
      "init": [".mat"]
    },
    "outputExtensions": {
      "motion_corrected": [".nii", ".nii.gz"],
      "motion_parameters": [".par"],
      "mean_image": [".nii", ".nii.gz"],
      "variance_image": [".nii", ".nii.gz"],
      "std_image": [".nii", ".nii.gz"],
      "transformation_matrices": [".mat"],
      "rms_files": [".rms"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/MCFLIRT"
  },
  "slicetimer": {
    "cwlPath": "cwl/fsl/slicetimer.cwl",
    "fullName": "FMRIB's Slice Timing Correction (SliceTimer)",
    "function": "Corrects for differences in slice acquisition times within each volume using sinc interpolation.",
    "modality": "4D fMRI NIfTI time series.",
    "keyParameters": "-r (TR in seconds), --odd (interleaved odd slices first), --down (reverse slice order), --tcustom (custom timing file)",
    "keyPoints": "Must match actual acquisition order. Important for event-related designs with short TRs. Less critical for long TRs or block designs.",
    "typicalUse": "Temporal alignment of slices acquired at different times within each TR.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz"],
      "custom_order": [".txt"],
      "custom_timings": [".txt"]
    },
    "outputExtensions": {
      "slice_time_corrected": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/SliceTimer"
  },
  "susan": {
    "cwlPath": "cwl/fsl/susan.cwl",
    "fullName": "Smallest Univalue Segment Assimilating Nucleus (SUSAN)",
    "function": "Edge-preserving noise reduction using nonlinear filtering that smooths within tissue boundaries while preserving edges.",
    "modality": "3D or 4D NIfTI volume (structural or functional).",
    "keyParameters": "<input> <brightness_threshold> <spatial_size_mm> <dimensionality> <use_median> <n_usans> [<usan1>] <output>",
    "keyPoints": "Brightness threshold typically 0.75 * median intensity. Set dimensionality to 3 for 3D volumes. Better edge preservation than Gaussian smoothing.",
    "typicalUse": "Noise reduction while preserving structural boundaries in functional or structural data.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "smoothed_image": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/SUSAN"
  },
  "flirt": {
    "cwlPath": "cwl/fsl/flirt.cwl",
    "enumHints": {
      "cost": [
        "mutualinfo",
        "corratio",
        "normcorr",
        "normmi",
        "leastsq",
        "bbr"
      ],
      "interp": [
        "trilinear",
        "nearestneighbour",
        "sinc",
        "spline"
      ]
    },
    "fullName": "FMRIB's Linear Image Registration Tool (FLIRT)",
    "function": "Linear (affine) registration between images using optimized cost functions with 6, 7, 9, or 12 degrees of freedom.",
    "modality": "Any 3D NIfTI volume pair (structural, functional, or standard template).",
    "keyParameters": "-ref (reference image), -dof (degrees of freedom: 6/7/9/12), -cost (cost function), -omat (output matrix)",
    "keyPoints": "Use 6-DOF for within-subject rigid-body, 12-DOF for cross-subject affine. Cost function matters: corratio for intra-modal, mutualinfo for inter-modal.",
    "typicalUse": "EPI-to-structural alignment, structural-to-standard registration.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz"],
      "reference": [".nii", ".nii.gz"],
      "init_matrix": [".mat"],
      "in_weight": [".nii", ".nii.gz"],
      "ref_weight": [".nii", ".nii.gz"],
      "wm_seg": [".nii", ".nii.gz"],
      "fieldmap": [".nii", ".nii.gz"],
      "fieldmapmask": [".nii", ".nii.gz"],
      "schedule": [".sch"]
    },
    "outputExtensions": {
      "registered_image": [".nii", ".nii.gz"],
      "transformation_matrix": [".mat"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FLIRT"
  },
  "applywarp": {
    "cwlPath": "cwl/fsl/applywarp.cwl",
    "enumHints": {
      "interp": [
        "nn",
        "trilinear",
        "sinc",
        "spline"
      ]
    },
    "fullName": "FSL Apply Warp Field (applywarp)",
    "function": "Applies linear and/or non-linear warp fields to transform images between coordinate spaces.",
    "modality": "3D or 4D NIfTI volume plus warp field and/or affine matrix.",
    "keyParameters": "-i (input), -r (reference), -o (output), -w (warp field), --premat (pre-warp affine), --postmat (post-warp affine), --interp (interpolation)",
    "keyPoints": "Can chain affine + nonlinear transforms in one step. Use --interp=nn for label images, --interp=spline for continuous images. Reference defines output grid.",
    "typicalUse": "Applying normalization warps to functional data or atlas labels.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz"],
      "reference": [".nii", ".nii.gz"],
      "warp": [".nii", ".nii.gz"],
      "premat": [".mat"],
      "postmat": [".mat"],
      "mask": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "warped_image": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FNIRT/UserGuide#Applying_the_warps"
  },
  "invwarp": {
    "cwlPath": "cwl/fsl/invwarp.cwl",
    "fullName": "FSL Invert Warp Field (invwarp)",
    "function": "Computes the inverse of a non-linear warp field for reverse transformations.",
    "modality": "Non-linear warp field (4D NIfTI from FNIRT --cout output).",
    "keyParameters": "-w (input warp), -o (output inverse warp), -r (reference image for output space)",
    "keyPoints": "Needed to map atlas/standard-space ROIs back to native space. Reference should be the image that was originally warped.",
    "typicalUse": "Creating inverse transformations for atlas-to-native space mapping.",
    "inputExtensions": {
      "warp": [".nii", ".nii.gz"],
      "reference": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "inverse_warp": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FNIRT/UserGuide#Inverting_warps"
  },
  "convertwarp": {
    "cwlPath": "cwl/fsl/convertwarp.cwl",
    "fullName": "FSL Convert/Combine Warps (convertwarp)",
    "function": "Combines multiple warp fields and affine matrices into a single composite warp for efficient one-step transformation.",
    "modality": "Warp fields and/or affine matrices from FLIRT/FNIRT.",
    "keyParameters": "-r (reference), -o (output), --premat (first affine), --warp1 (first warp), --midmat (middle affine), --warp2 (second warp), --postmat (final affine)",
    "keyPoints": "Applying one combined warp is faster and has less interpolation error than chaining multiple transformations. Transform order: premat > warp1 > midmat > warp2 > postmat.",
    "typicalUse": "Concatenating multiple transformations (e.g., func > struct > standard) efficiently.",
    "inputExtensions": {
      "reference": [".nii", ".nii.gz"],
      "warp1": [".nii", ".nii.gz"],
      "warp2": [".nii", ".nii.gz"],
      "premat": [".mat"],
      "midmat": [".mat"],
      "postmat": [".mat"],
      "shiftmap": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "combined_warp": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FNIRT/UserGuide#Combining_warps"
  },
  "fslmaths": {
    "cwlPath": "cwl/fsl/fslmaths.cwl",
    "fullName": "FSL Mathematical Image Operations (fslmaths)",
    "function": "Performs a wide range of voxelwise mathematical operations on NIfTI images including arithmetic, filtering, thresholding, and morphological operations.",
    "modality": "3D or 4D NIfTI volume(s).",
    "keyParameters": "-add/-sub/-mul/-div (arithmetic), -thr/-uthr (thresholding), -bin (binarize), -s (smoothing sigma mm), -bptf (bandpass temporal filter)",
    "keyPoints": "Swiss army knife of neuroimaging. Operations are applied left to right. Use -odt to control output data type. -bptf values are in volumes not seconds.",
    "typicalUse": "Mathematical operations, masking, thresholding, temporal filtering.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz"],
      "add_file": [".nii", ".nii.gz"],
      "sub_file": [".nii", ".nii.gz"],
      "mul_file": [".nii", ".nii.gz"],
      "div_file": [".nii", ".nii.gz"],
      "mas": [".nii", ".nii.gz"],
      "max_file": [".nii", ".nii.gz"],
      "min_file": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "output_image": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/Fslutils"
  },
  "fnirt": {
    "cwlPath": "cwl/fsl/fnirt.cwl",
    "fullName": "FMRIB's Non-linear Image Registration Tool (FNIRT)",
    "function": "Non-linear registration using B-spline deformations for precise anatomical alignment to a template.",
    "modality": "T1-weighted 3D NIfTI volume plus reference template. Requires initial affine from FLIRT.",
    "keyParameters": "--ref (reference), --aff (initial affine), --config (config file), --cout (coefficient output), --iout (warped output)",
    "keyPoints": "Always run FLIRT first for initial alignment. Use --config=T1_2_MNI152_2mm for standard T1-to-MNI. Computationally intensive.",
    "typicalUse": "High-accuracy normalization to MNI space for group analyses.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz"],
      "reference": [".nii", ".nii.gz"],
      "affine": [".mat"],
      "inwarp": [".nii", ".nii.gz"],
      "intin": [".nii", ".nii.gz"],
      "config": [".cnf"],
      "refmask": [".nii", ".nii.gz"],
      "inmask": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "warp_coefficients": [".nii", ".nii.gz"],
      "warped_image": [".nii", ".nii.gz"],
      "displacement_field": [".nii", ".nii.gz"],
      "jacobian_map": [".nii", ".nii.gz"],
      "intensity_modulated_ref": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FNIRT"
  },
  "fugue": {
    "cwlPath": "cwl/fsl/fugue.cwl",
    "enumHints": {
      "unwarpdir": [
        "x",
        "y",
        "z",
        "x-",
        "y-",
        "z-"
      ]
    },
    "fullName": "FMRIB's Utility for Geometrically Unwarping EPIs (FUGUE)",
    "function": "Corrects geometric distortions in EPI images caused by magnetic field inhomogeneity using acquired fieldmap data.",
    "modality": "3D/4D EPI NIfTI plus preprocessed fieldmap (in rad/s).",
    "keyParameters": "--loadfmap (fieldmap), --dwell (echo spacing in seconds), --unwarpdir (phase-encode direction: x/y/z/-x/-y/-z)",
    "keyPoints": "Requires preprocessed fieldmap (e.g., from fsl_prepare_fieldmap). Dwell time and unwarp direction must match acquisition parameters.",
    "typicalUse": "Distortion correction when fieldmap data is available.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz"],
      "phasemap": [".nii", ".nii.gz"],
      "loadfmap": [".nii", ".nii.gz"],
      "loadshift": [".nii", ".nii.gz"],
      "mask": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "unwarped_image": [".nii", ".nii.gz"],
      "warped_image": [".nii", ".nii.gz"],
      "fieldmap_output": [".nii", ".nii.gz"],
      "shiftmap_output": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FUGUE"
  },
  "topup": {
    "cwlPath": "cwl/fsl/topup.cwl",
    "fullName": "Tool for Estimating and Correcting Susceptibility-Induced Distortions (TOPUP)",
    "function": "Estimates and corrects susceptibility-induced distortions using pairs of images with reversed phase-encode directions.",
    "modality": "4D NIfTI with concatenated blip-up/blip-down b=0 images, plus acquisition parameters file.",
    "keyParameters": "--imain (concatenated images), --datain (acquisition parameters file), --config (config file), --out (output basename)",
    "keyPoints": "Requires reversed phase-encode image pair. Default config b02b0.cnf works well for most data. Outputs warp fields reusable by applytopup.",
    "typicalUse": "Distortion correction using blip-up/blip-down acquisitions for fMRI or DWI.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz"],
      "encoding_file": [".txt"],
      "config": [".cnf"]
    },
    "outputExtensions": {
      "movpar": [".txt"],
      "fieldcoef": [".nii", ".nii.gz"],
      "fieldmap": [".nii", ".nii.gz"],
      "corrected_images": [".nii", ".nii.gz"],
      "displacement_fields": [".nii", ".nii.gz"],
      "jacobian_images": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/topup"
  },
  "film_gls": {
    "cwlPath": "cwl/fsl/film_gls.cwl",
    "fullName": "FMRIB's Improved Linear Model (FILM)",
    "function": "Fits general linear model to fMRI time series with prewhitening using autocorrelation correction.",
    "modality": "4D fMRI NIfTI time series plus design matrix and contrast files.",
    "keyParameters": "--in (input 4D), --pd (design matrix), --con (contrast file), --thr (threshold), --sa (smoothed autocorrelation)",
    "keyPoints": "Core statistical engine of FEAT. Design matrix must be pre-generated (e.g., via Feat_model). When --con is provided, directly computes COPEs, VARCOPEs, T-statistics, and Z-statistics alongside parameter estimates (pe) and residuals.",
    "typicalUse": "First-level statistical analysis within FEAT or standalone.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz"],
      "design_file": [".mat"],
      "contrast_file": [".con"]
    },
    "outputExtensions": {
      "residual4d": [".nii", ".nii.gz"],
      "param_estimates": [".nii", ".nii.gz"],
      "sigmasquareds": [".nii", ".nii.gz"],
      "threshac1": [".nii", ".nii.gz"],
      "cope": [".nii", ".nii.gz"],
      "varcope": [".nii", ".nii.gz"],
      "tstat": [".nii", ".nii.gz"],
      "zstat": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FILM"
  },
  "feat": {
    "cwlPath": "cwl/fsl/feat.cwl",
    "fullName": "FMRI Expert Analysis Tool (FEAT)",
    "function": "Complete fMRI analysis pipeline combining preprocessing (motion correction, spatial smoothing, temporal filtering), first-level statistical modeling (GLM with autocorrelation correction), and higher-level group analysis.",
    "modality": "FEAT design file (.fsf) encoding all analysis parameters including input data paths, preprocessing options, design matrix, and contrasts.",
    "keyParameters": "design_file (.fsf file with all configuration), input_data (4D BOLD data referenced by the .fsf)",
    "keyPoints": "Pipeline controlled by the .fsf file. input_data must be provided separately for containerized execution (paths are rewritten at runtime). Internally runs BET, MCFLIRT, spatial smoothing, film_gls (with --con for contrast computation), registration, and optionally higher-level analysis. Outputs a .feat directory.",
    "typicalUse": "Complete first-level or higher-level fMRI analysis when all parameters are pre-configured in an FSF file.",
    "inputExtensions": {
      "design_file": [".fsf"]
    },
    "outputExtensions": {},
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FEAT"
  },
  "flameo": {
    "cwlPath": "cwl/fsl/flameo.cwl",
    "fullName": "FMRIB's Local Analysis of Mixed Effects (FLAME)",
    "function": "Group-level mixed-effects analysis accounting for both within-subject and between-subject variance using MCMC-based Bayesian estimation.",
    "modality": "4D NIfTI of stacked subject-level COPEs, VARCOPEs, plus group design matrix and contrast files.",
    "keyParameters": "--cope (cope image), --vc (varcope image), --dm (design matrix), --cs (contrast file), --runmode (fe/ols/flame1/flame12)",
    "keyPoints": "FLAME1 is recommended (good accuracy with reasonable speed). OLS is fast but ignores within-subject variance. FLAME1+2 is most accurate but slowest.",
    "typicalUse": "Second-level group analyses with proper random effects.",
    "inputExtensions": {
      "cope_file": [".nii", ".nii.gz"],
      "var_cope_file": [".nii", ".nii.gz"],
      "mask_file": [".nii", ".nii.gz"],
      "design_file": [".mat"],
      "t_con_file": [".con"],
      "cov_split_file": [".grp"],
      "f_con_file": [".fts"],
      "dof_var_cope_file": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "copes": [".nii", ".nii.gz"],
      "var_copes": [".nii", ".nii.gz"],
      "tstats": [".nii", ".nii.gz"],
      "zstats": [".nii", ".nii.gz"],
      "fstats": [".nii", ".nii.gz"],
      "zfstats": [".nii", ".nii.gz"],
      "tdof": [".nii", ".nii.gz"],
      "res4d": [".nii", ".nii.gz"],
      "weights": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FLAME"
  },
  "randomise": {
    "cwlPath": "cwl/fsl/randomise.cwl",
    "fullName": "FSL Randomise Permutation Testing",
    "function": "Non-parametric permutation testing for statistical inference with multiple correction methods including TFCE.",
    "modality": "4D NIfTI of stacked subject images plus design matrix and contrast files.",
    "keyParameters": "-i (input 4D), -o (output basename), -d (design matrix), -t (contrast file), -n (num permutations), -T (TFCE)",
    "keyPoints": "Use -T for TFCE (recommended). 5000+ permutations for publication. Computationally intensive but provides strong family-wise error control.",
    "typicalUse": "Group-level inference with family-wise error correction (VBM, TBSS, etc.).",
    "inputExtensions": {
      "input": [".nii", ".nii.gz"],
      "design_mat": [".mat"],
      "tcon": [".con"],
      "fcon": [".fts"],
      "mask": [".nii", ".nii.gz"],
      "x_block_labels": [".txt"]
    },
    "outputExtensions": {
      "t_corrp": [".nii.gz"],
      "t_p": [".nii.gz"],
      "tstat": [".nii", ".nii.gz"],
      "f_corrp": [".nii.gz"],
      "f_p": [".nii.gz"],
      "fstat": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/Randomise"
  },
  "melodic": {
    "cwlPath": "cwl/fsl/melodic.cwl",
    "enumHints": {
      "approach": [
        "defl",
        "symm",
        "tica",
        "concat"
      ]
    },
    "fullName": "Multivariate Exploratory Linear Optimized Decomposition into Independent Components (MELODIC)",
    "function": "Probabilistic ICA that decomposes fMRI data into spatially independent components representing signal and noise sources.",
    "modality": "4D fMRI NIfTI time series (single-subject or concatenated multi-subject).",
    "keyParameters": "-i (input 4D), -o (output directory), -d (dimensionality), --report (generate HTML report), --bgimage (background for report)",
    "keyPoints": "Auto-dimensionality estimation by default (Laplace approximation). Can be run single-subject or group. Components classified as signal vs. noise manually or via FIX.",
    "typicalUse": "Data exploration, artifact identification, resting-state network analysis.",
    "inputExtensions": {
      "input_files": [".nii", ".nii.gz"],
      "mask": [".nii", ".nii.gz"],
      "ICs": [".nii", ".nii.gz"],
      "mix": [".txt"],
      "t_des": [".mat"],
      "t_con": [".con"],
      "s_des": [".mat"],
      "s_con": [".con"],
      "bg_image": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "melodic_IC": [".nii", ".nii.gz"],
      "melodic_mix": [".txt"],
      "melodic_FTmix": [".txt"],
      "melodic_Tmodes": [".txt"],
      "mean": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/MELODIC"
  },
  "dual_regression": {
    "cwlPath": "cwl/fsl/dual_regression.cwl",
    "fullName": "FSL Dual Regression",
    "function": "Projects group-level ICA spatial maps back to individual subjects via spatial then temporal regression to obtain subject-specific network maps.",
    "modality": "4D fMRI NIfTI time series for each subject plus group ICA spatial maps.",
    "keyParameters": "<group_ICA_maps> <design_matrix> <design_contrasts> <num_permutations> <subject_list>",
    "keyPoints": "Two-stage regression: (1) spatial regression gives subject time courses, (2) temporal regression gives subject spatial maps. Can include randomise for group comparison.",
    "typicalUse": "Subject-level ICA-based resting-state network analysis and group comparisons.",
    "inputExtensions": {
      "group_IC_maps": [".nii", ".nii.gz"],
      "design_mat": [".mat"],
      "design_con": [".con"],
      "input_files": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "stage1_timeseries": [".txt"],
      "stage2_spatial_maps": [".nii", ".nii.gz"],
      "stage3_tstats": [".nii", ".nii.gz"],
      "stage3_corrp": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/DualRegression"
  },
  "run_first_all": {
    "cwlPath": "cwl/fsl/run_first_all.cwl",
    "enumHints": {
      "method": [
        "auto",
        "fast",
        "none"
      ]
    },
    "fullName": "FMRIB's Integrated Registration and Segmentation Tool (FIRST)",
    "function": "Automated segmentation of subcortical structures using shape and appearance models trained on manually labeled data.",
    "modality": "T1-weighted 3D NIfTI volume (does not need to be brain-extracted).",
    "keyParameters": "-i (input image), -o (output basename), -b (run BET first), -s (comma-separated structures list)",
    "keyPoints": "Models 15 subcortical structures. Outputs meshes (.vtk) and volumetric labels. Can run on selected structures only with -s flag.",
    "typicalUse": "Volumetric analysis of subcortical structures (hippocampus, amygdala, caudate, etc.).",
    "inputExtensions": {
      "input": [".nii", ".nii.gz"],
      "affine": [".mat"]
    },
    "outputExtensions": {
      "segmentation_files": [".nii.gz"],
      "vtk_meshes": [".vtk"],
      "bvars": [".bvars"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FIRST"
  },
  "sienax": {
    "cwlPath": "cwl/fsl/sienax.cwl",
    "fullName": "SIENA Cross-Sectional (SIENAX)",
    "function": "Cross-sectional brain volume estimation normalized for head size using atlas-based scaling.",
    "modality": "T1-weighted 3D NIfTI volume.",
    "keyParameters": "-o (output directory), -r (regional analysis), -BET (BET options), -S (SIENAX options)",
    "keyPoints": "Single timepoint analysis. Normalizes volumes by head size for cross-subject comparisons. Reports total brain, GM, and WM volumes.",
    "typicalUse": "Single timepoint normalized brain volume measures.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz"],
      "lesion_mask": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "report": [".sienax"],
      "brain_volume": [".nii", ".nii.gz"],
      "segmentation": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/SIENA"
  },
  "siena": {
    "cwlPath": "cwl/fsl/siena.cwl",
    "fullName": "Structural Image Evaluation using Normalisation of Atrophy (SIENA)",
    "function": "Estimates percentage brain volume change between two timepoints using edge-point displacement analysis.",
    "modality": "Two T1-weighted 3D NIfTI volumes from different timepoints.",
    "keyParameters": "-o (output directory), -BET (BET options), -2 (2-class segmentation), -S (SIENA step options)",
    "keyPoints": "Requires two scans of same subject at different timepoints. Reports percentage brain volume change (PBVC). Accurate to ~0.2% volume change.",
    "typicalUse": "Measuring brain volume change over time (e.g., atrophy in neurodegeneration).",
    "inputExtensions": {
      "input1": [".nii", ".nii.gz"],
      "input2": [".nii", ".nii.gz"],
      "ventricle_mask": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "report": [".siena"],
      "pbvc": [".sienax"],
      "edge_points": [".nii", ".nii.gz"],
      "flow_images": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/SIENA"
  },
  "fsl_anat": {
    "cwlPath": "cwl/fsl/fsl_anat.cwl",
    "fullName": "FSL Anatomical Processing Pipeline",
    "function": "Comprehensive automated pipeline for structural T1 processing including reorientation, cropping, bias correction, registration, segmentation, and subcortical segmentation.",
    "modality": "T1-weighted 3D NIfTI volume.",
    "keyParameters": "-i (input image), --noseg (skip segmentation), --nosubcortseg (skip subcortical), --nononlinreg (skip non-linear registration)",
    "keyPoints": "Runs BET, FAST, FLIRT, FNIRT, and FIRST in sequence. Creates output directory with all intermediate files. Good for standardized structural processing.",
    "typicalUse": "Full structural preprocessing from T1 image.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "t1": [".nii", ".nii.gz"],
      "t1_brain": [".nii", ".nii.gz"],
      "t1_brain_mask": [".nii", ".nii.gz"],
      "t1_biascorr": [".nii", ".nii.gz"],
      "t1_biascorr_brain": [".nii", ".nii.gz"],
      "mni_to_t1_nonlin_warp": [".nii", ".nii.gz"],
      "t1_to_mni_nonlin_warp": [".nii", ".nii.gz"],
      "segmentation": [".nii", ".nii.gz"],
      "subcortical_seg": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/fsl_anat"
  },
  "probtrackx2": {
    "cwlPath": "cwl/fsl/probtrackx2.cwl",
    "fullName": "Probabilistic Tractography with Crossing Fibres (probtrackx2)",
    "function": "Probabilistic tractography using fiber orientation distributions from bedpostx to trace white matter pathways.",
    "modality": "BEDPOSTX output directory plus seed mask (3D NIfTI).",
    "keyParameters": "-x (seed mask), -s (bedpostx merged samples), --dir (output directory), -l (loop check), --waypoints (waypoint masks), --avoid (exclusion mask)",
    "keyPoints": "Requires bedpostx output. Use --omatrix1 for seed-to-voxel connectivity, --omatrix2 for NxN connectivity. Waypoints constrain tractography to specific paths.",
    "typicalUse": "White matter connectivity analysis, tract-based statistics.",
    "inputExtensions": {
      "mask": [".nii", ".nii.gz"],
      "seed": [".nii", ".nii.gz", ".txt"],
      "waypoints": [".nii", ".nii.gz", ".txt"],
      "avoid": [".nii", ".nii.gz"],
      "stop": [".nii", ".nii.gz"],
      "target_masks": [".txt"],
      "xfm": [".mat"],
      "invxfm": [".mat"],
      "seedref": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "fdt_paths": [".nii", ".nii.gz"],
      "way_total": [".txt"],
      "matrix": [".dot"],
      "targets": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FDT/UserGuide#PROBTRACKX"
  },
  "3dSkullStrip": {
    "cwlPath": "cwl/afni/3dSkullStrip.cwl",
    "bounds": {
      "shrink_fac": [
        0,
        1
      ]
    },
    "fullName": "AFNI 3D Skull Strip",
    "function": "Removes non-brain tissue using a modified spherical surface expansion algorithm adapted from BET.",
    "modality": "T1-weighted or T2-weighted 3D NIfTI/AFNI volume.",
    "keyParameters": "-input (input dataset), -prefix (output prefix), -push_to_edge (expand mask), -orig_vol (output original volume)",
    "keyPoints": "Often more aggressive than BET. Use -push_to_edge if too much brain is removed. Works on T1 or T2 images.",
    "typicalUse": "Brain extraction for structural or functional images in AFNI pipelines.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "skull_stripped": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "mask": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dSkullStrip.html"
  },
  "3dvolreg": {
    "cwlPath": "cwl/afni/3dvolreg.cwl",
    "fullName": "AFNI 3D Volume Registration (3dvolreg)",
    "function": "Rigid-body motion correction by registering all volumes in a 4D dataset to a base volume.",
    "modality": "4D fMRI NIfTI/AFNI time series.",
    "keyParameters": "-base (reference volume index or dataset), -prefix (output), -1Dfile (motion parameters output), -maxdisp1D (max displacement output)",
    "keyPoints": "Default base is volume 0; use median volume for better results. Motion parameters output as 6 columns.",
    "typicalUse": "Motion correction for fMRI; outputs 6 motion parameters for nuisance regression.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "base_file": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "weight": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "registered": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "motion_params": [".1D"],
      "motion_1D": [".1D"],
      "transform_matrix": [".aff12.1D"],
      "max_displacement": [".1D"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dvolreg.html"
  },
  "3dTshift": {
    "cwlPath": "cwl/afni/3dTshift.cwl",
    "fullName": "AFNI 3D Temporal Shift (3dTshift)",
    "function": "Corrects for slice timing differences by shifting each voxel time series to a common temporal reference.",
    "modality": "4D fMRI NIfTI/AFNI time series.",
    "keyParameters": "-prefix (output), -tpattern (slice timing pattern: alt+z, seq+z, etc.), -tzero (align to time zero), -TR (repetition time)",
    "keyPoints": "Auto-detects slice timing from header if available. Common patterns: alt+z (interleaved ascending), seq+z (sequential ascending).",
    "typicalUse": "Aligning all slices to the same temporal reference in fMRI data.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "voxshift": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "shifted": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dTshift.html"
  },
  "3dDespike": {
    "cwlPath": "cwl/afni/3dDespike.cwl",
    "fullName": "AFNI 3D Despike (3dDespike)",
    "function": "Removes transient signal spikes from fMRI time series using an L1-norm fitting approach.",
    "modality": "4D fMRI NIfTI/AFNI time series.",
    "keyParameters": "-prefix (output), -ssave (save spike fit), -nomask (process all voxels), -NEW (updated algorithm)",
    "keyPoints": "Run early in preprocessing pipeline (before motion correction). -NEW algorithm recommended.",
    "typicalUse": "Artifact removal before other preprocessing steps.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "despiked": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "spikiness": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dDespike.html"
  },
  "3dBandpass": {
    "cwlPath": "cwl/afni/3dBandpass.cwl",
    "fullName": "AFNI 3D Bandpass Filter (3dBandpass)",
    "function": "Applies temporal bandpass filtering to fMRI time series with optional simultaneous nuisance regression.",
    "modality": "4D fMRI NIfTI/AFNI time series.",
    "keyParameters": "<fbot> <ftop> (frequency range in Hz), -prefix (output), -ort (nuisance regressors file)",
    "keyPoints": "Typical resting-state range: 0.01-0.1 Hz. Can simultaneously regress nuisance signals with -ort.",
    "typicalUse": "Resting-state frequency filtering (typically 0.01-0.1 Hz).",
    "inputExtensions": {
      "input": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "ort": [".1D", ".txt"],
      "dsort": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "mask": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "filtered": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dBandpass.html"
  },
  "3dBlurToFWHM": {
    "cwlPath": "cwl/afni/3dBlurToFWHM.cwl",
    "fullName": "AFNI 3D Adaptive Smoothing to Target FWHM",
    "function": "Adaptively smooths data to achieve a target smoothness level, accounting for existing smoothness.",
    "modality": "3D or 4D NIfTI/AFNI volume with mask.",
    "keyParameters": "-input (input dataset), -prefix (output), -FWHM (target smoothness in mm), -mask (brain mask)",
    "keyPoints": "Measures existing smoothness and adds only enough to reach target FWHM. Better than fixed-kernel smoothing.",
    "typicalUse": "Achieving consistent smoothness across subjects/studies.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "blurmaster": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "mask": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "blurred": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dBlurToFWHM.html"
  },
  "3dmerge": {
    "cwlPath": "cwl/afni/3dmerge.cwl",
    "fullName": "AFNI 3D Merge and Smooth (3dmerge)",
    "function": "Combines spatial filtering and dataset merging operations, commonly used for Gaussian smoothing.",
    "modality": "3D or 4D NIfTI/AFNI volume.",
    "keyParameters": "-1blur_fwhm (FWHM in mm), -doall (process all sub-bricks), -prefix (output)",
    "keyPoints": "Simple Gaussian smoothing with -1blur_fwhm. -doall applies to all volumes in 4D.",
    "typicalUse": "Gaussian smoothing of functional data.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "merged": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dmerge.html"
  },
  "3dAllineate": {
    "cwlPath": "cwl/afni/3dAllineate.cwl",
    "enumHints": {
      "cost": [
        "ls",
        "mi",
        "crM",
        "nmi",
        "hel",
        "lpc"
      ],
      "warp": [
        "shift_only",
        "shift_rotate",
        "shift_rotate_scale",
        "affine_general"
      ],
      "interp": [
        "NN",
        "linear",
        "cubic",
        "quintic"
      ]
    },
    "fullName": "AFNI 3D Affine Registration (3dAllineate)",
    "function": "Linear (affine) registration with multiple cost functions and optimization methods.",
    "modality": "Any 3D NIfTI/AFNI volume pair.",
    "keyParameters": "-source (moving image), -base (reference), -prefix (output), -cost (cost function: lpc, mi, nmi), -1Dmatrix_save (save transform)",
    "keyPoints": "lpc cost recommended for EPI-to-T1 alignment. nmi for intra-modal.",
    "typicalUse": "Affine alignment between modalities or to standard space.",
    "inputExtensions": {
      "source": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "base": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "oned_matrix_apply": [".1D", ".txt"],
      "oned_param_apply": [".1D", ".txt"],
      "weight": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "emask": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "source_mask": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "master": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "aligned": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "matrix": [".aff12.1D"],
      "params": [".1D"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dAllineate.html"
  },
  "3dQwarp": {
    "cwlPath": "cwl/afni/3dQwarp.cwl",
    "fullName": "AFNI 3D Nonlinear Warp (3dQwarp)",
    "function": "Non-linear registration using cubic polynomial basis functions for precise anatomical alignment.",
    "modality": "T1-weighted 3D NIfTI/AFNI volumes (source and base, both skull-stripped).",
    "keyParameters": "-source (moving), -base (reference), -prefix (output), -blur (smoothing), -minpatch (minimum patch size)",
    "keyPoints": "Both images should be skull-stripped. Use -blur 0 3 for typical T1 registration. Usually preceded by 3dAllineate.",
    "typicalUse": "High-accuracy normalization to template.",
    "inputExtensions": {
      "source": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "base": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "iniwarp": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK", ".1D", ".txt"],
      "emask": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "warped": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "warp": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "inverse_warp": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dQwarp.html"
  },
  "3dUnifize": {
    "cwlPath": "cwl/afni/3dUnifize.cwl",
    "fullName": "AFNI 3D Intensity Uniformization (3dUnifize)",
    "function": "Corrects intensity inhomogeneity (bias field) to produce uniform white matter intensity.",
    "modality": "T1-weighted or T2-weighted 3D NIfTI/AFNI volume.",
    "keyParameters": "-input (input), -prefix (output), -T2 (for T2-weighted input), -GM (also unifize gray matter)",
    "keyPoints": "Fast bias correction alternative to N4. Works well for T1 images by default. Use -T2 flag for T2-weighted images.",
    "typicalUse": "Bias correction before segmentation or registration.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "unifized": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "scale_factors": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "automask": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dUnifize.html"
  },
  "3dAutomask": {
    "cwlPath": "cwl/afni/3dAutomask.cwl",
    "bounds": {
      "clfrac": [
        0.1,
        0.9
      ]
    },
    "fullName": "AFNI 3D Automatic Mask Creation (3dAutomask)",
    "function": "Creates a brain mask automatically from EPI data by finding connected high-intensity voxels.",
    "modality": "3D or 4D EPI NIfTI/AFNI volume.",
    "keyParameters": "-prefix (output mask), -dilate (number of dilation steps), -erode (number of erosion steps), -clfrac (clip fraction)",
    "keyPoints": "Works on EPI data directly (no structural needed). Lower -clfrac includes more voxels.",
    "typicalUse": "Generating functional brain masks from EPI data.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "mask": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "masked_input": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "depth_map": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dAutomask.html"
  },
  "3dTcat": {
    "cwlPath": "cwl/afni/3dTcat.cwl",
    "fullName": "AFNI 3D Temporal Concatenate (3dTcat)",
    "function": "Concatenates datasets along the time dimension or selects specific sub-bricks from 4D data.",
    "modality": "3D or 4D NIfTI/AFNI volumes.",
    "keyParameters": "-prefix (output), <dataset>[selector] (input with optional sub-brick selector)",
    "keyPoints": "Sub-brick selectors allow flexible volume selection: [0..5] for first 6, [0..$-3] to skip last 3.",
    "typicalUse": "Combining runs, removing initial steady-state volumes.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "glueto": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "concatenated": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dTcat.html"
  },
  "@auto_tlrc": {
    "cwlPath": "cwl/afni/auto_tlrc.cwl",
    "enumHints": {
      "xform": [
        "affine_general",
        "shift_rotate_scale"
      ]
    },
    "fullName": "AFNI Automated Talairach Transformation (@auto_tlrc)",
    "function": "Automated Talairach transformation using affine registration to a template atlas.",
    "modality": "T1-weighted 3D NIfTI/AFNI volume.",
    "keyParameters": "-base (template), -input (anatomical), -no_ss (skip skull strip)",
    "keyPoints": "Legacy tool for Talairach normalization. For modern analyses, prefer @SSwarper or 3dQwarp.",
    "typicalUse": "Legacy Talairach normalization.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "base": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "init_xform": [".1D", ".txt"],
      "apar": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "tlrc_anat": ["+tlrc.HEAD", "+tlrc.BRIK", ".nii", ".nii.gz"],
      "transform": [".Xat.1D"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/@auto_tlrc.html"
  },
  "@SSwarper": {
    "cwlPath": "cwl/afni/SSwarper.cwl",
    "fullName": "AFNI Skull Strip and Nonlinear Warp (@SSwarper)",
    "function": "Combined skull stripping and non-linear warping to template in a single optimized pipeline.",
    "modality": "T1-weighted 3D NIfTI volume plus reference template.",
    "keyParameters": "-input (T1 image), -base (template), -subid (subject ID), -odir (output dir)",
    "keyPoints": "Preferred over separate skull-strip + registration. Output compatible with afni_proc.py.",
    "typicalUse": "Modern anatomical preprocessing for afni_proc.py pipelines.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "base": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "mask_ss": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "skull_stripped": [".nii", ".nii.gz"],
      "warped": ["+tlrc.HEAD", "+tlrc.BRIK", ".nii", ".nii.gz"],
      "warp": ["+tlrc.HEAD", "+tlrc.BRIK", ".nii", ".nii.gz"],
      "affine": [".aff12.1D"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/@SSwarper.html"
  },
  "align_epi_anat": {
    "cwlPath": "cwl/afni/align_epi_anat.cwl",
    "fullName": "AFNI align_epi_anat \u2014 EPI-to-Anatomy Alignment",
    "function": "Aligns EPI functional images to anatomical images with optional distortion correction using local Pearson correlation.",
    "modality": "EPI volume (3D NIfTI) plus T1-weighted anatomical.",
    "keyParameters": "-epi (EPI dataset), -anat (anatomical), -epi_base (EPI reference volume), -cost (cost function, default lpc)",
    "keyPoints": "lpc cost function designed for EPI-to-T1 alignment. Central tool in afni_proc.py.",
    "typicalUse": "Core EPI-to-structural alignment in functional preprocessing.",
    "inputExtensions": {
      "epi": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "anat": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "aligned_anat": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "aligned_epi": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "transform_matrix": [".aff12.1D"],
      "volreg_output": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/align_epi_anat.py.html"
  },
  "3dDeconvolve": {
    "cwlPath": "cwl/afni/3dDeconvolve.cwl",
    "fullName": "AFNI 3D Deconvolve (GLM Analysis)",
    "function": "Multiple linear regression analysis for fMRI with flexible hemodynamic response function models.",
    "modality": "4D fMRI NIfTI/AFNI time series plus stimulus timing files.",
    "keyParameters": "-input (4D data), -polort (polynomial detrending order), -num_stimts (number of regressors), -stim_times (timing files with HRF model), -gltsym (contrasts)",
    "keyPoints": "Supports many HRF models (GAM, BLOCK, dmBLOCK, TENT, CSPLIN). Use -x1D_stop to generate design matrix only.",
    "typicalUse": "First-level GLM analysis with flexible HRF models.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "stim_times": [".1D", ".txt"],
      "stim_file": [".1D", ".txt"],
      "ortvec": [".1D", ".txt"],
      "mask": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "censor": [".1D", ".txt"]
    },
    "outputExtensions": {
      "stats": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "design_matrix": [".1D"],
      "xmat": [".xmat.1D"],
      "fitted": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "residuals": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dDeconvolve.html"
  },
  "3dREMLfit": {
    "cwlPath": "cwl/afni/3dREMLfit.cwl",
    "fullName": "AFNI 3D REML Fit (Improved GLM)",
    "function": "GLM with ARMA(1,1) temporal autocorrelation correction using restricted maximum likelihood estimation.",
    "modality": "4D fMRI NIfTI/AFNI time series plus design matrix from 3dDeconvolve.",
    "keyParameters": "-matrix (design matrix from 3dDeconvolve -x1D), -input (4D data), -Rbuck (output stats), -Rvar (output variance)",
    "keyPoints": "More accurate statistics than 3dDeconvolve OLS. Run after 3dDeconvolve for improved inference.",
    "typicalUse": "More accurate first-level statistics than 3dDeconvolve OLS.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "matrix": [".1D", ".txt"],
      "mask": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "STATmask": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "ABfile": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "addbase": [".1D", ".txt"],
      "slibase": [".1D", ".txt"],
      "dsort": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "stats": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "betas": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK", ".nii", ".nii.gz"],
      "variance": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK", ".nii", ".nii.gz"],
      "fitted": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK", ".nii", ".nii.gz"],
      "residuals": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK", ".nii", ".nii.gz"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dREMLfit.html"
  },
  "3dttest++": {
    "cwlPath": "cwl/afni/3dttest++.cwl",
    "fullName": "AFNI 3D T-Test (3dttest++)",
    "function": "Two-sample t-test with support for covariates, paired tests, and cluster-level inference.",
    "modality": "Subject-level 3D NIfTI/AFNI volumes.",
    "keyParameters": "-setA/-setB (group datasets), -prefix (output), -covariates (covariate file), -paired (paired test), -Clustsim (cluster simulation)",
    "keyPoints": "Use -Clustsim for built-in cluster-level correction. -covariates allows continuous covariates.",
    "typicalUse": "Group comparisons with covariate control.",
    "inputExtensions": {
      "setA": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "setB": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "covariates": [".1D", ".txt"],
      "mask": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "stats": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "residuals": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK", ".nii", ".nii.gz"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dttest++.html"
  },
  "3dANOVA": {
    "cwlPath": "cwl/afni/3dANOVA.cwl",
    "fullName": "AFNI 3D One-Way ANOVA",
    "function": "Voxelwise fixed-effects one-way analysis of variance.",
    "modality": "Multiple 3D NIfTI/AFNI volumes organized by factor level.",
    "keyParameters": "-levels (number of levels), -dset (level dataset), -ftr (F-test output), -mean (level means output)",
    "keyPoints": "Fixed-effects only. For random/mixed effects, use 3dMVM or 3dLME instead.",
    "typicalUse": "Single-factor group analysis.",
    "inputExtensions": {
      "dset": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "mask": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "stats": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "f_stat": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dANOVA.html"
  },
  "3dANOVA2": {
    "cwlPath": "cwl/afni/3dANOVA2.cwl",
    "fullName": "AFNI 3D Two-Way ANOVA",
    "function": "Voxelwise fixed-effects two-way analysis of variance with main effects and interaction.",
    "modality": "Multiple 3D NIfTI/AFNI volumes organized by two factors.",
    "keyParameters": "-type (1-5, model type), -alevels/-blevels (factor levels), -dset (datasets), -fa/-fb/-fab (F-tests)",
    "keyPoints": "Type determines fixed/random effects per factor. Types 1-3 for within-subject designs.",
    "typicalUse": "Two-factor factorial designs.",
    "inputExtensions": {
      "dset": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "mask": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "stats": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dANOVA2.html"
  },
  "3dANOVA3": {
    "cwlPath": "cwl/afni/3dANOVA3.cwl",
    "fullName": "AFNI 3D Three-Way ANOVA",
    "function": "Voxelwise fixed-effects three-way analysis of variance.",
    "modality": "Multiple 3D NIfTI/AFNI volumes organized by three factors.",
    "keyParameters": "-type (1-5), -alevels/-blevels/-clevels, -dset, -fa/-fb/-fc/-fab/-fac/-fbc/-fabc (F-tests)",
    "keyPoints": "Extension of 3dANOVA2 to three factors. Consider 3dMVM for more flexible modeling.",
    "typicalUse": "Three-factor factorial designs.",
    "inputExtensions": {
      "dset": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "mask": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "stats": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dANOVA3.html"
  },
  "3dClustSim": {
    "cwlPath": "cwl/afni/3dClustSim.cwl",
    "fullName": "AFNI 3D Cluster Size Simulation (3dClustSim)",
    "function": "Simulates null distribution of cluster sizes for determining cluster-extent thresholds that control family-wise error rate.",
    "modality": "Brain mask (3D NIfTI/AFNI) plus smoothness estimates from 3dFWHMx.",
    "keyParameters": "-mask (brain mask), -acf (ACF parameters from 3dFWHMx), -athr (per-voxel alpha), -pthr (per-voxel p thresholds)",
    "keyPoints": "Use ACF-based smoothness (not FWHM) from 3dFWHMx on residuals. Updated in 2016 for non-Gaussian assumptions.",
    "typicalUse": "Determining cluster size thresholds for multiple comparison correction.",
    "inputExtensions": {
      "mask": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "inset": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "clustsim_1D": [".1D"],
      "clustsim_niml": [".niml"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dClustSim.html"
  },
  "3dFWHMx": {
    "cwlPath": "cwl/afni/3dFWHMx.cwl",
    "fullName": "AFNI 3D Smoothness Estimation (3dFWHMx)",
    "function": "Estimates spatial smoothness of data using the autocorrelation function (ACF) model.",
    "modality": "Residual 4D NIfTI/AFNI from GLM analysis plus brain mask.",
    "keyParameters": "-input (residuals), -mask (brain mask), -acf (output ACF parameters), -detrend (detrend order)",
    "keyPoints": "Run on residuals (not original data). ACF model accounts for non-Gaussian spatial structure. Output feeds into 3dClustSim.",
    "typicalUse": "Getting smoothness estimates for 3dClustSim.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "mask": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "fwhm_output": [".1D"],
      "acf_output": [".1D"],
      "detrended": ["+orig.HEAD", "+orig.BRIK", ".nii", ".nii.gz"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dFWHMx.html"
  },
  "3dMEMA": {
    "cwlPath": "cwl/afni/3dMEMA.cwl",
    "fullName": "AFNI 3D Mixed Effects Meta Analysis (3dMEMA)",
    "function": "Mixed effects meta-analysis for group studies that properly accounts for within and between-subject variance.",
    "modality": "Subject-level beta and t-statistic volumes (3D NIfTI/AFNI).",
    "keyParameters": "-set (group name and subject beta+tstat pairs), -groups (group names), -covariates (covariate file), -prefix (output)",
    "keyPoints": "Uses both beta and t-stat from each subject. Better for unequal within-subject variance. Requires R.",
    "typicalUse": "Group analysis with proper mixed effects modeling.",
    "inputExtensions": {
      "set": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "mask": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "covariates": [".1D", ".txt"]
    },
    "outputExtensions": {
      "stats": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dMEMA.html"
  },
  "3dMVM": {
    "cwlPath": "cwl/afni/3dMVM.cwl",
    "fullName": "AFNI 3D MultiVariate Modeling (3dMVM)",
    "function": "Multivariate modeling framework supporting ANOVA/ANCOVA designs with between and within-subject factors.",
    "modality": "Subject-level 3D NIfTI/AFNI volumes with data table specifying factors.",
    "keyParameters": "-dataTable (structured input table), -bsVars (between-subject variables), -wsVars (within-subject variables), -qVars (quantitative variables)",
    "keyPoints": "Most flexible group analysis tool in AFNI. Handles complex repeated measures designs. Requires R.",
    "typicalUse": "Complex repeated measures and mixed designs.",
    "inputExtensions": {
      "table": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "mask": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "stats": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dMVM.html"
  },
  "3dLME": {
    "cwlPath": "cwl/afni/3dLME.cwl",
    "fullName": "AFNI 3D Linear Mixed Effects (3dLME)",
    "function": "Linear mixed effects modeling using R lme4 package for designs with random effects.",
    "modality": "Subject-level 3D NIfTI/AFNI volumes with data table.",
    "keyParameters": "-dataTable (input table), -model (model formula), -ranEff (random effects specification), -qVars (quantitative variables)",
    "keyPoints": "Best for longitudinal data and nested designs. Uses R lme4 syntax. Handles missing data naturally.",
    "typicalUse": "Longitudinal data, nested designs with random effects.",
    "inputExtensions": {
      "table": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "mask": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "stats": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "residuals": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "random_effects": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dLME.html"
  },
  "3dLMEr": {
    "cwlPath": "cwl/afni/3dLMEr.cwl",
    "fullName": "AFNI 3D Linear Mixed Effects with R (3dLMEr)",
    "function": "Linear mixed effects with direct R formula syntax integration for flexible model specification.",
    "modality": "Subject-level 3D NIfTI/AFNI volumes with data table.",
    "keyParameters": "-dataTable (input table), -model (R lmer formula), -qVars (quantitative variables), -gltCode (contrast specification)",
    "keyPoints": "More flexible than 3dLME. Uses lmerTest for degrees of freedom. Accepts full R formula syntax.",
    "typicalUse": "Flexible mixed effects with R formula syntax.",
    "inputExtensions": {
      "table": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "mask": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "stats": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "residuals": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "random_effects": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dLMEr.html"
  },
  "3dNetCorr": {
    "cwlPath": "cwl/afni/3dNetCorr.cwl",
    "fullName": "AFNI 3D Network Correlation Matrix (3dNetCorr)",
    "function": "Computes pairwise correlation matrices between ROI time series extracted from a parcellation atlas.",
    "modality": "4D fMRI NIfTI/AFNI time series plus integer-labeled parcellation volume.",
    "keyParameters": "-inset (4D time series), -in_rois (parcellation), -prefix (output), -fish_z (Fisher z-transform), -ts_out (output time series)",
    "keyPoints": "Outputs correlation matrix as text file. Use -fish_z for Fisher z-transformed values.",
    "typicalUse": "Creating functional connectivity matrices from parcellations.",
    "inputExtensions": {
      "inset": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "in_rois": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "mask": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "weight_ts": [".1D", ".txt"],
      "weight_corr": [".1D", ".txt"]
    },
    "outputExtensions": {
      "correlation_matrix": [".netcc"],
      "time_series": [".netts"],
      "wb_corr_maps": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dNetCorr.html"
  },
  "3dTcorr1D": {
    "cwlPath": "cwl/afni/3dTcorr1D.cwl",
    "fullName": "AFNI 3D Seed-Based Correlation (3dTcorr1D)",
    "function": "Computes voxelwise correlation between a 4D dataset and one or more 1D seed time series.",
    "modality": "4D fMRI NIfTI/AFNI time series plus 1D seed time series file.",
    "keyParameters": "-prefix (output), <4D_dataset> <1D_seed_timeseries>",
    "keyPoints": "Simple seed-based correlation. Extract seed time series first (e.g., with 3dmaskave).",
    "typicalUse": "Seed-based functional connectivity analysis.",
    "inputExtensions": {
      "xset": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "y1D": [".1D", ".txt"],
      "mask": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "correlation": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dTcorr1D.html"
  },
  "3dTcorrMap": {
    "cwlPath": "cwl/afni/3dTcorrMap.cwl",
    "fullName": "AFNI 3D Whole-Brain Correlation Map (3dTcorrMap)",
    "function": "Computes various whole-brain voxelwise correlation metrics including average correlation and global connectivity.",
    "modality": "4D fMRI NIfTI/AFNI time series plus brain mask.",
    "keyParameters": "-input (4D data), -mask (brain mask), -Mean (mean correlation map), -Hist (histogram outputs)",
    "keyPoints": "Computes every-voxel-to-every-voxel correlations. Memory intensive.",
    "typicalUse": "Global connectivity metrics, whole-brain correlation exploration.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "seed": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "mask": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "ort": [".1D", ".txt"]
    },
    "outputExtensions": {
      "mean_corr": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "zmean_corr": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "corrmap": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dTcorrMap.html"
  },
  "3dRSFC": {
    "cwlPath": "cwl/afni/3dRSFC.cwl",
    "fullName": "AFNI 3D Resting State Functional Connectivity (3dRSFC)",
    "function": "Computes resting-state frequency-domain metrics including ALFF, fALFF, mALFF, and RSFA from bandpass-filtered data.",
    "modality": "4D resting-state fMRI NIfTI/AFNI time series plus brain mask.",
    "keyParameters": "<fbot> <ftop> (frequency range), -prefix (output), -input (4D data), -mask (brain mask)",
    "keyPoints": "Computes ALFF (amplitude of low-frequency fluctuations), fALFF (fractional ALFF), and RSFA.",
    "typicalUse": "Amplitude of low-frequency fluctuations analysis in resting-state fMRI.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "ort": [".1D", ".txt"],
      "dsort": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "mask": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "filtered": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "alff": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "falff": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "rsfa": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dRSFC.html"
  },
  "3dROIstats": {
    "cwlPath": "cwl/afni/3dROIstats.cwl",
    "fullName": "AFNI 3D ROI Statistics (3dROIstats)",
    "function": "Extracts statistical summary measures from data within defined ROI masks.",
    "modality": "3D or 4D NIfTI/AFNI volume plus ROI mask with integer labels.",
    "keyParameters": "-mask (ROI mask), -nzmean (mean of non-zero voxels), -nzvoxels (count non-zero voxels), -minmax (min and max)",
    "keyPoints": "Can handle multi-label ROI masks. Outputs one row per volume, one column per ROI.",
    "typicalUse": "Extracting mean values from defined regions of interest.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "mask": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "roisel": [".1D", ".txt"]
    },
    "outputExtensions": {
      "stats": [".txt"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dROIstats.html"
  },
  "3dmaskave": {
    "cwlPath": "cwl/afni/3dmaskave.cwl",
    "fullName": "AFNI 3D Mask Average (3dmaskave)",
    "function": "Extracts and outputs the average time series from voxels within a mask region.",
    "modality": "4D fMRI NIfTI/AFNI time series plus binary mask.",
    "keyParameters": "-mask (mask dataset), -quiet (output values only), -mrange (min max value range in mask)",
    "keyPoints": "Simple and fast ROI time series extraction. Output is one value per timepoint to stdout.",
    "typicalUse": "Simple ROI time series extraction for connectivity analysis.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "mask": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "average": [".1D"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dmaskave.html"
  },
  "3dUndump": {
    "cwlPath": "cwl/afni/3dUndump.cwl",
    "enumHints": {
      "datum": [
        "byte",
        "short",
        "float"
      ]
    },
    "fullName": "AFNI 3D Undump (Coordinate to Volume)",
    "function": "Creates a 3D dataset from a text file containing voxel coordinates and values.",
    "modality": "Text coordinate file plus master dataset for grid definition.",
    "keyParameters": "-prefix (output), -master (template grid), -xyz (coordinates are in mm), -srad (sphere radius in mm)",
    "keyPoints": "Use -srad to create spherical ROIs at each coordinate. Master dataset defines output grid.",
    "typicalUse": "Creating spherical ROIs from peak coordinates.",
    "inputExtensions": {
      "input": [".1D", ".txt"],
      "master": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "mask": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "ROImask": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "dataset": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dUndump.html"
  },
  "whereami": {
    "cwlPath": "cwl/afni/whereami.cwl",
    "fullName": "AFNI Atlas Location Query (whereami)",
    "function": "Reports anatomical atlas labels for given coordinates or identifies regions in multiple atlases simultaneously.",
    "modality": "MNI or Talairach coordinates, or labeled dataset.",
    "keyParameters": "-coord_file (coordinate file), -atlas (atlas name), -lpi/-rai (coordinate system)",
    "keyPoints": "Queries multiple atlases at once by default. Coordinates must match atlas space.",
    "typicalUse": "Identifying anatomical locations of activation peaks.",
    "inputExtensions": {
      "coord_file": [".1D", ".txt"],
      "dset": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "bmask": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "omask": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "output": [".txt"],
      "mask_output": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK", ".nii", ".nii.gz"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/whereami.html"
  },
  "3dresample": {
    "cwlPath": "cwl/afni/3dresample.cwl",
    "enumHints": {
      "rmode": [
        "NN",
        "Li",
        "Cu",
        "Bk"
      ]
    },
    "fullName": "AFNI 3D Resample (3dresample)",
    "function": "Resamples a dataset to match the grid of another dataset or to a specified voxel size.",
    "modality": "3D or 4D NIfTI/AFNI volume.",
    "keyParameters": "-master (template grid), -prefix (output), -dxyz (voxel size), -rmode (interpolation: NN, Li, Cu)",
    "keyPoints": "Use -rmode NN for label/mask images, Li or Cu for continuous data.",
    "typicalUse": "Matching resolution between datasets for analysis.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "master": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "resampled": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dresample.html"
  },
  "3dfractionize": {
    "cwlPath": "cwl/afni/3dfractionize.cwl",
    "fullName": "AFNI 3D Fractionize (ROI Resampling)",
    "function": "Resamples ROI/atlas datasets using fractional occupancy to maintain region representation at different resolutions.",
    "modality": "ROI/atlas volume (3D NIfTI/AFNI) plus template for target grid.",
    "keyParameters": "-template (target grid), -input (ROI dataset), -prefix (output), -clip (fraction threshold, default 0.5)",
    "keyPoints": "Better than nearest-neighbor for resampling parcellations. Preserves small ROIs better.",
    "typicalUse": "Resampling parcellations to functional resolution.",
    "inputExtensions": {
      "template": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "input": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "warp": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "fractionized": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dfractionize.html"
  },
  "3dcalc": {
    "cwlPath": "cwl/afni/3dcalc.cwl",
    "enumHints": {
      "datum": [
        "byte",
        "short",
        "float"
      ]
    },
    "fullName": "AFNI 3D Voxelwise Calculator (3dcalc)",
    "function": "Voxelwise mathematical calculator supporting extensive expression syntax for operations on one or more datasets.",
    "modality": "3D or 4D NIfTI/AFNI volume(s).",
    "keyParameters": "-a/-b/-c (input datasets), -expr (mathematical expression), -prefix (output), -datum (output data type)",
    "keyPoints": "Extremely flexible expression syntax. Supports conditionals, trigonometric, and logical operations. Up to 26 inputs (a-z).",
    "typicalUse": "Mathematical operations, masking, thresholding, combining datasets.",
    "inputExtensions": {
      "a": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "b": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "c": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "d": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "result": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dcalc.html"
  },
  "3dTstat": {
    "cwlPath": "cwl/afni/3dTstat.cwl",
    "fullName": "AFNI 3D Temporal Statistics (3dTstat)",
    "function": "Computes voxelwise temporal statistics (mean, stdev, median, etc.) across a 4D time series.",
    "modality": "4D NIfTI/AFNI time series.",
    "keyParameters": "-prefix (output), -mean/-stdev/-median/-max/-min (statistic type), -mask (optional mask)",
    "keyPoints": "Default computes mean. Can compute multiple statistics in one run.",
    "typicalUse": "Creating mean functional images, variance maps, temporal SNR.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "mask": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "stats": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dTstat.html"
  },
  "3dinfo": {
    "cwlPath": "cwl/afni/3dinfo.cwl",
    "fullName": "AFNI 3D Dataset Information (3dinfo)",
    "function": "Displays header information and metadata from AFNI/NIfTI datasets.",
    "modality": "Any NIfTI or AFNI format dataset.",
    "keyParameters": "-n4 (dimensions), -tr (TR), -orient (orientation), -prefix (prefix only), -space (coordinate space)",
    "keyPoints": "Essential for scripting and QC. Use specific flags for machine-readable output.",
    "typicalUse": "Quality control, scripting decisions based on data properties.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "info": [".txt"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dinfo.html"
  },
  "3dcopy": {
    "cwlPath": "cwl/afni/3dcopy.cwl",
    "fullName": "AFNI 3D Dataset Copy (3dcopy)",
    "function": "Copies a dataset with optional format conversion between AFNI and NIfTI formats.",
    "modality": "Any NIfTI or AFNI format dataset.",
    "keyParameters": "<input> <output> (format determined by output extension)",
    "keyPoints": "Output format determined by extension. Simple way to convert between formats.",
    "typicalUse": "Format conversion between AFNI and NIfTI, making editable copies.",
    "inputExtensions": {
      "old_dataset": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "copied": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dcopy.html"
  },
  "3dZeropad": {
    "cwlPath": "cwl/afni/3dZeropad.cwl",
    "fullName": "AFNI 3D Zero Padding (3dZeropad)",
    "function": "Adds zero-valued slices around dataset boundaries to extend the image matrix.",
    "modality": "3D or 4D NIfTI/AFNI volume.",
    "keyParameters": "-I/-S/-A/-P/-R/-L (add slices in each direction), -master (match grid of master dataset), -prefix (output)",
    "keyPoints": "Use -master to match another dataset grid. Can also crop with negative values.",
    "typicalUse": "Matching matrix sizes between datasets, preventing edge effects.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "master": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "padded": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dZeropad.html"
  },
  "3dNwarpApply": {
    "cwlPath": "cwl/afni/3dNwarpApply.cwl",
    "enumHints": {
      "interp": [
        "NN",
        "linear",
        "cubic",
        "quintic",
        "wsinc5"
      ]
    },
    "fullName": "AFNI 3D Nonlinear Warp Apply",
    "function": "Applies precomputed nonlinear warps (from 3dQwarp) to transform datasets.",
    "modality": "3D or 4D NIfTI/AFNI volume plus warp dataset.",
    "keyParameters": "-nwarp (warp dataset), -source (input), -master (reference grid), -prefix (output), -interp (interpolation method)",
    "keyPoints": "Can concatenate multiple warps in -nwarp string. Use wsinc5 interpolation for best quality.",
    "typicalUse": "Applying 3dQwarp transformations to functional or other data.",
    "inputExtensions": {
      "nwarp": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "source": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "warped": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dNwarpApply.html"
  },
  "3dNwarpCat": {
    "cwlPath": "cwl/afni/3dNwarpCat.cwl",
    "enumHints": {
      "interp": [
        "linear",
        "quintic",
        "wsinc5"
      ]
    },
    "fullName": "AFNI 3D Nonlinear Warp Concatenate",
    "function": "Concatenates multiple nonlinear warps and affine matrices into a single combined warp.",
    "modality": "Multiple warp datasets and/or affine matrix files.",
    "keyParameters": "-prefix (output), -warp1/-warp2/... (warps to concatenate), -iwarp (use inverse of a warp)",
    "keyPoints": "Reduces interpolation artifacts from multiple separate applications. Can invert individual warps in the chain.",
    "typicalUse": "Combining transformations efficiently for one-step resampling.",
    "inputExtensions": {
      "warp1": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "warp2": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "warp3": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"],
      "warp4": [".nii", ".nii.gz", "+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "outputExtensions": {
      "concatenated_warp": ["+orig.HEAD", "+orig.BRIK", "+tlrc.HEAD", "+tlrc.BRIK"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dNwarpCat.html"
  },
  "mri_convert": {
    "cwlPath": "cwl/freesurfer/mri_convert.cwl",
    "enumHints": {
      "resample_type": [
        "interpolate",
        "weighted",
        "nearest",
        "sinc",
        "cubic"
      ]
    },
    "fullName": "FreeSurfer MRI Format Conversion (mri_convert)",
    "function": "Converts between neuroimaging file formats (DICOM, NIfTI, MGH/MGZ, ANALYZE, etc.) with optional resampling and conforming.",
    "modality": "Any neuroimaging volume format.",
    "keyParameters": "--conform (resample to 256 cubed at 1mm isotropic), --out_type (output format), -vs (voxel size)",
    "keyPoints": "Use --conform to prepare T1 for FreeSurfer processing. Handles DICOM to NIfTI conversion. Can change voxel size and data type.",
    "typicalUse": "Converting DICOM to NIfTI, conforming images to FreeSurfer standards.",
    "inputExtensions": {
      "input": [".mgz", ".mgh", ".nii", ".nii.gz", ".img", ".hdr", ".mnc"],
      "reslice_like": [".mgz", ".mgh", ".nii", ".nii.gz"],
      "apply_transform": [".xfm", ".m3z", ".lta"],
      "apply_inverse_transform": [".xfm", ".m3z", ".lta"]
    },
    "outputExtensions": {
      "converted": [".mgz", ".mgh", ".nii", ".nii.gz"]
    },
    "docUrl": "https://surfer.nmr.mgh.harvard.edu/fswiki/mri_convert"
  },
  "mri_watershed": {
    "cwlPath": "cwl/freesurfer/mri_watershed.cwl",
    "fullName": "FreeSurfer MRI Watershed Skull Stripping",
    "function": "Brain extraction using a hybrid watershed/surface deformation algorithm to find the brain-skull boundary.",
    "modality": "T1-weighted 3D volume (typically MGZ format within FreeSurfer pipeline).",
    "keyParameters": "-T1 (specify T1 volume), -atlas (use atlas for initial estimate), -h (preflooding height, default 25)",
    "keyPoints": "Core component of recon-all. Adjust -h parameter if too much/too little brain removed. Usually part of autorecon1.",
    "typicalUse": "Brain extraction within recon-all pipeline.",
    "inputExtensions": {
      "input": [".mgz", ".mgh", ".nii", ".nii.gz"],
      "brain_atlas": [".mgz", ".mgh", ".nii", ".nii.gz", ".gca"]
    },
    "outputExtensions": {
      "brain": [".mgz", ".mgh", ".nii", ".nii.gz"]
    },
    "docUrl": "https://surfer.nmr.mgh.harvard.edu/fswiki/mri_watershed"
  },
  "mri_normalize": {
    "cwlPath": "cwl/freesurfer/mri_normalize.cwl",
    "fullName": "FreeSurfer MRI Intensity Normalization",
    "function": "Normalizes T1 image intensities so that white matter has a target intensity value (default 110).",
    "modality": "T1-weighted 3D volume (MGZ format, within FreeSurfer pipeline).",
    "keyParameters": "-n (number of iterations), -b (bias field smoothing sigma), -aseg (use aseg for normalization regions)",
    "keyPoints": "Part of recon-all autorecon1. Creates nu.mgz (non-uniformity corrected) and T1.mgz (intensity normalized).",
    "typicalUse": "Preparing T1 for segmentation within FreeSurfer pipeline.",
    "inputExtensions": {
      "input": [".mgz", ".mgh", ".nii", ".nii.gz"],
      "mask": [".mgz", ".mgh", ".nii", ".nii.gz"],
      "aseg": [".mgz", ".mgh", ".nii", ".nii.gz"],
      "control_points": [".dat"],
      "brain_mask": [".mgz", ".mgh", ".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "normalized": [".mgz", ".mgh", ".nii", ".nii.gz"]
    },
    "docUrl": "https://surfer.nmr.mgh.harvard.edu/fswiki/mri_normalize"
  },
  "mri_segment": {
    "cwlPath": "cwl/freesurfer/mri_segment.cwl",
    "fullName": "FreeSurfer MRI White Matter Segmentation",
    "function": "Segments white matter from normalized T1 image using intensity thresholding and morphological operations.",
    "modality": "Intensity-normalized T1 volume (T1.mgz from mri_normalize).",
    "keyParameters": "-thicken (thicken WM), -wlo/-whi (WM intensity range)",
    "keyPoints": "Part of recon-all. Outputs wm.mgz used for surface reconstruction. Quality depends on good intensity normalization.",
    "typicalUse": "White matter identification for surface reconstruction.",
    "inputExtensions": {
      "input": [".mgz", ".mgh", ".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "segmentation": [".mgz", ".mgh", ".nii", ".nii.gz"]
    },
    "docUrl": "https://surfer.nmr.mgh.harvard.edu/fswiki/mri_segment"
  },
  "mris_inflate": {
    "cwlPath": "cwl/freesurfer/mris_inflate.cwl",
    "fullName": "FreeSurfer Surface Inflation",
    "function": "Inflates folded cortical surface to a smooth shape while minimizing metric distortion for visualization.",
    "modality": "FreeSurfer surface file (e.g., lh.smoothwm).",
    "keyParameters": "-n (number of iterations), -dist (target distance)",
    "keyPoints": "Creates inflated surface for visualizing buried cortex. Part of recon-all. Metric distortion encoded in sulc file.",
    "typicalUse": "Creating inflated surfaces for visualization of cortical data.",
    "inputExtensions": {
      "input": [".white", ".pial", ".smoothwm", ".orig", ".inflated"]
    },
    "outputExtensions": {
      "inflated": [".inflated"],
      "sulc_file": [".sulc"]
    },
    "docUrl": "https://surfer.nmr.mgh.harvard.edu/fswiki/mris_inflate"
  },
  "mris_sphere": {
    "cwlPath": "cwl/freesurfer/mris_sphere.cwl",
    "fullName": "FreeSurfer Surface to Sphere Mapping",
    "function": "Maps the inflated cortical surface to a sphere for inter-subject spherical registration.",
    "modality": "FreeSurfer inflated surface file.",
    "keyParameters": "(minimal user-facing parameters; uses inflated surface)",
    "keyPoints": "Prerequisite for cortical atlas registration. Part of recon-all. Spherical mapping enables vertex-wise inter-subject comparisons.",
    "typicalUse": "Preparing cortical surface for spherical registration and atlas labeling.",
    "inputExtensions": {
      "input": [".inflated", ".white", ".pial", ".smoothwm", ".orig"],
      "in_smoothwm": [".smoothwm", ".white", ".pial", ".orig"]
    },
    "outputExtensions": {
      "sphere": [".sphere"]
    },
    "docUrl": "https://surfer.nmr.mgh.harvard.edu/fswiki/mris_sphere"
  },
  "mri_aparc2aseg": {
    "cwlPath": "cwl/freesurfer/mri_aparc2aseg.cwl",
    "fullName": "FreeSurfer Cortical Parcellation to Volume",
    "function": "Combines surface-based cortical parcellation (aparc) with volumetric subcortical segmentation (aseg) into a single volume.",
    "modality": "FreeSurfer subject directory (requires completed recon-all).",
    "keyParameters": "--s (subject), --annot (annotation name, default aparc), --o (output volume)",
    "keyPoints": "Creates aparc+aseg.mgz combining ~80 cortical and subcortical regions. Different parcellation schemes available.",
    "typicalUse": "Creating volumetric parcellation from surface labels for ROI analysis.",
    "inputExtensions": {
      "volmask": [".mgz", ".mgh", ".nii", ".nii.gz"],
      "ribbon": [".mgz", ".mgh", ".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "aparc_aseg": [".mgz", ".nii.gz"]
    },
    "docUrl": "https://surfer.nmr.mgh.harvard.edu/fswiki/mri_aparc2aseg"
  },
  "mri_annotation2label": {
    "cwlPath": "cwl/freesurfer/mri_annotation2label.cwl",
    "fullName": "FreeSurfer Annotation to Individual Labels",
    "function": "Extracts individual region labels from a surface annotation file into separate label files.",
    "modality": "FreeSurfer annotation file (e.g., lh.aparc.annot).",
    "keyParameters": "--subject (subject), --hemi (hemisphere), --annotation (annotation name), --outdir (output directory)",
    "keyPoints": "Creates one .label file per region. Label files contain vertex indices and coordinates.",
    "typicalUse": "Extracting individual ROIs from parcellation for targeted analysis.",
    "inputExtensions": {
      "ctab": [".txt", ".ctab"]
    },
    "outputExtensions": {
      "border_file": [".border"]
    },
    "docUrl": "https://surfer.nmr.mgh.harvard.edu/fswiki/mri_annotation2label"
  },
  "mris_ca_label": {
    "cwlPath": "cwl/freesurfer/mris_ca_label.cwl",
    "fullName": "FreeSurfer Cortical Atlas Labeling",
    "function": "Applies a cortical parcellation atlas to an individual subject using trained classifier on spherical surface.",
    "modality": "FreeSurfer subject directory with sphere.reg (requires completed recon-all).",
    "keyParameters": "<subject> <hemisphere> <sphere.reg> <atlas.gcs> <output_annotation>",
    "keyPoints": "Uses Gaussian classifier atlas trained on manual labels. Part of recon-all. Different atlases available.",
    "typicalUse": "Applying cortical parcellation atlas to individual subjects.",
    "inputExtensions": {
      "canonsurf": [".sphere.reg", ".sphere"],
      "classifier": [".gcs"],
      "aseg": [".mgz", ".mgh", ".nii", ".nii.gz"],
      "l": [".label"],
      "t": [".txt", ".ctab"]
    },
    "outputExtensions": {
      "annotation": [".annot"]
    },
    "docUrl": "https://surfer.nmr.mgh.harvard.edu/fswiki/mris_ca_label"
  },
  "mri_label2vol": {
    "cwlPath": "cwl/freesurfer/mri_label2vol.cwl",
    "fullName": "FreeSurfer Label to Volume Conversion",
    "function": "Converts surface-based labels to volumetric ROIs using a registration matrix.",
    "modality": "FreeSurfer label file plus template volume and registration.",
    "keyParameters": "--label (input label), --temp (template volume), --reg (registration file), --o (output volume), --proj (projection parameters)",
    "keyPoints": "Requires registration between surface and target volume space. Use --proj to control projection depth.",
    "typicalUse": "Creating volumetric ROIs from FreeSurfer surface parcellations.",
    "inputExtensions": {
      "label": [".label"],
      "annot": [".annot"],
      "seg": [".mgz", ".mgh", ".nii", ".nii.gz"],
      "temp": [".mgz", ".mgh", ".nii", ".nii.gz"],
      "reg": [".dat", ".lta"]
    },
    "outputExtensions": {
      "label_volume": [".mgz", ".mgh", ".nii", ".nii.gz"],
      "hits_volume": [".mgz", ".mgh", ".nii", ".nii.gz"]
    },
    "docUrl": "https://surfer.nmr.mgh.harvard.edu/fswiki/mri_label2vol"
  },
  "bbregister": {
    "cwlPath": "cwl/freesurfer/bbregister.cwl",
    "enumHints": {
      "contrast_type": [
        "t1",
        "t2",
        "bold",
        "dti"
      ],
      "init": [
        "coreg",
        "rr",
        "spm",
        "fsl",
        "header",
        "best"
      ],
      "dof": [
        "6",
        "9",
        "12"
      ]
    },
    "fullName": "FreeSurfer Boundary-Based Registration (bbregister)",
    "function": "High-quality registration of functional EPI images to FreeSurfer anatomy using white matter boundary contrast.",
    "modality": "3D EPI volume (mean/example func) plus FreeSurfer subject directory.",
    "keyParameters": "--s (subject), --mov (moving/source image), --reg (output registration), --init-fsl (initialization method), --bold (contrast type)",
    "keyPoints": "Superior to volume-based registration for EPI-to-T1. Requires completed recon-all. --init-fsl recommended.",
    "typicalUse": "High-quality EPI to T1 registration using cortical surfaces.",
    "inputExtensions": {
      "source_file": [".mgz", ".mgh", ".nii", ".nii.gz"],
      "init_reg": [".dat", ".lta"],
      "int": [".mgz", ".mgh", ".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "out_reg": [".dat", ".lta"],
      "out_fsl_mat": [".mat"],
      "mincost": [".mincost"]
    },
    "docUrl": "https://surfer.nmr.mgh.harvard.edu/fswiki/bbregister"
  },
  "mri_vol2surf": {
    "cwlPath": "cwl/freesurfer/mri_vol2surf.cwl",
    "enumHints": {
      "interp": [
        "nearest",
        "trilinear"
      ]
    },
    "fullName": "FreeSurfer Volume to Surface Projection",
    "function": "Projects volumetric data (fMRI, PET, etc.) onto the cortical surface using specified sampling method.",
    "modality": "3D or 4D NIfTI/MGZ volume plus FreeSurfer subject registration.",
    "keyParameters": "--mov (input volume), --reg (registration), --hemi (hemisphere), --projfrac (fraction of cortical thickness), --o (output)",
    "keyPoints": "Use --projfrac 0.5 to sample at mid-cortical depth. Can average across depths with --projfrac-avg.",
    "typicalUse": "Mapping functional or PET data to cortical surface for surface-based analysis.",
    "inputExtensions": {
      "source_file": [".mgz", ".mgh", ".nii", ".nii.gz"],
      "reg_file": [".dat", ".lta"],
      "surf_file": [".white", ".pial", ".inflated", ".smoothwm", ".orig"],
      "mask_label": [".label"]
    },
    "outputExtensions": {
      "out_file": [".mgh", ".mgz", ".nii", ".nii.gz", ".w"]
    },
    "docUrl": "https://surfer.nmr.mgh.harvard.edu/fswiki/mri_vol2surf"
  },
  "mri_surf2vol": {
    "cwlPath": "cwl/freesurfer/mri_surf2vol.cwl",
    "fullName": "FreeSurfer Surface to Volume Projection",
    "function": "Projects surface-based data back to volumetric space using registration and template volume.",
    "modality": "FreeSurfer surface overlay file plus template volume and registration.",
    "keyParameters": "--surfval (surface data), --reg (registration), --template (output grid template), --hemi (hemisphere), --o (output volume)",
    "keyPoints": "Inverse of mri_vol2surf. Template defines output grid dimensions.",
    "typicalUse": "Converting surface-based results back to volume space for reporting.",
    "inputExtensions": {
      "source_file": [".mgh", ".mgz", ".nii", ".nii.gz", ".w", ".curv", ".sulc", ".thickness", ".area"],
      "reg": [".dat", ".lta"],
      "template": [".mgz", ".mgh", ".nii", ".nii.gz"],
      "ribbon": [".mgz", ".mgh", ".nii", ".nii.gz"],
      "merge": [".mgz", ".mgh", ".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "out_file": [".mgz", ".mgh", ".nii", ".nii.gz"]
    },
    "docUrl": "https://surfer.nmr.mgh.harvard.edu/fswiki/mri_surf2vol"
  },
  "mris_preproc": {
    "cwlPath": "cwl/freesurfer/mris_preproc.cwl",
    "fullName": "FreeSurfer Surface Data Preprocessing for Group Analysis",
    "function": "Concatenates surface data across subjects onto a common template surface for group-level analysis.",
    "modality": "Per-subject surface overlays (thickness, area, etc.) from FreeSurfer processing.",
    "keyParameters": "--s (subject list), --meas (measure: thickness, area, volume), --target (target subject/template), --hemi (hemisphere), --o (output)",
    "keyPoints": "Resamples all subjects to common surface (fsaverage). Can smooth on surface with --fwhm.",
    "typicalUse": "Preparing surface data for group statistical analysis.",
    "inputExtensions": {
      "fsgd": [".fsgd"],
      "f": [".txt"],
      "mask": [".label"]
    },
    "outputExtensions": {
      "out_file": [".mgh", ".mgz", ".nii", ".nii.gz"]
    },
    "docUrl": "https://surfer.nmr.mgh.harvard.edu/fswiki/mris_preproc"
  },
  "mri_glmfit": {
    "cwlPath": "cwl/freesurfer/mri_glmfit.cwl",
    "fullName": "FreeSurfer General Linear Model (mri_glmfit)",
    "function": "Fits a general linear model on surface or volume data for group-level statistical analysis.",
    "modality": "Concatenated surface data from mris_preproc or stacked volume data.",
    "keyParameters": "--y (input data), --fsgd (FreeSurfer group descriptor), --C (contrast file), --surf (surface subject), --glmdir (output directory)",
    "keyPoints": "Uses FSGD file for design specification. Supports DODS and DOSS design types. Can run on surface or volume data.",
    "typicalUse": "Surface-based or volume-based group statistical analysis.",
    "inputExtensions": {
      "y": [".mgh", ".mgz", ".nii", ".nii.gz"],
      "fsgd": [".fsgd"],
      "design": [".mat", ".txt"],
      "C": [".mat", ".txt", ".mtx"],
      "mask": [".mgh", ".mgz", ".nii", ".nii.gz", ".label"],
      "wls": [".mgh", ".mgz", ".nii", ".nii.gz"]
    },
    "outputExtensions": {},
    "docUrl": "https://surfer.nmr.mgh.harvard.edu/fswiki/mri_glmfit"
  },
  "mris_anatomical_stats": {
    "cwlPath": "cwl/freesurfer/mris_anatomical_stats.cwl",
    "fullName": "FreeSurfer Surface Anatomical Statistics",
    "function": "Computes surface-based morphometric measures (thickness, area, volume, curvature) for each region in a parcellation.",
    "modality": "FreeSurfer subject directory with completed recon-all.",
    "keyParameters": "-a (annotation file), -f (output stats file), -b (output table format)",
    "keyPoints": "Outputs per-region cortical thickness, surface area, gray matter volume, and curvature.",
    "typicalUse": "Extracting regional cortical thickness, area, and volume measures.",
    "inputExtensions": {
      "annotation": [".annot"],
      "label": [".label"],
      "cortex": [".label"],
      "ctab": [".txt", ".ctab"]
    },
    "outputExtensions": {
      "stats_table": [".txt", ".csv", ".dat"],
      "stats": [".stats"]
    },
    "docUrl": "https://surfer.nmr.mgh.harvard.edu/fswiki/mris_anatomical_stats"
  },
  "mri_segstats": {
    "cwlPath": "cwl/freesurfer/mri_segstats.cwl",
    "fullName": "FreeSurfer Segmentation Statistics",
    "function": "Computes volume and intensity statistics for each region in a segmentation volume.",
    "modality": "Segmentation volume (e.g., aseg.mgz) plus optional intensity volume.",
    "keyParameters": "--seg (segmentation), --i (intensity volume), --ctab (color table), --sum (output summary file), --excludeid 0 (exclude background)",
    "keyPoints": "Reports volume, mean intensity, and other statistics per region. Can use any segmentation volume.",
    "typicalUse": "Extracting regional volumes and mean intensities per structure.",
    "inputExtensions": {
      "seg": [".mgz", ".mgh", ".nii", ".nii.gz"],
      "in": [".mgz", ".mgh", ".nii", ".nii.gz"],
      "ctab": [".txt", ".ctab"],
      "mask": [".mgz", ".mgh", ".nii", ".nii.gz"],
      "brainmask": [".mgz", ".mgh", ".nii", ".nii.gz"],
      "pv": [".mgz", ".mgh", ".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "summary": [".stats", ".txt", ".dat", ".csv"],
      "avgwf_file": [".txt", ".dat"],
      "avgwfvol_file": [".mgz", ".mgh", ".nii", ".nii.gz"]
    },
    "docUrl": "https://surfer.nmr.mgh.harvard.edu/fswiki/mri_segstats"
  },
  "aparcstats2table": {
    "cwlPath": "cwl/freesurfer/aparcstats2table.cwl",
    "enumHints": {
      "meas": [
        "area",
        "volume",
        "thickness",
        "thicknessstd",
        "meancurv",
        "gauscurv",
        "foldind",
        "curvind"
      ],
      "delimiter": [
        "tab",
        "comma",
        "space",
        "semicolon"
      ]
    },
    "fullName": "FreeSurfer Cortical Stats to Group Table",
    "function": "Collects cortical parcellation statistics across multiple subjects into a single table for group analysis.",
    "modality": "Multiple FreeSurfer subject directories with completed recon-all.",
    "keyParameters": "--subjects (subject list), --hemi (hemisphere), --meas (measure: thickness, area, volume), --tablefile (output table)",
    "keyPoints": "Creates one row per subject, one column per region. Output table ready for statistical software.",
    "typicalUse": "Creating group spreadsheet of cortical morphometry for statistical analysis.",
    "inputExtensions": {
      "subjectsfile": [".txt"]
    },
    "outputExtensions": {
      "table": [".txt", ".csv", ".dat"]
    },
    "docUrl": "https://surfer.nmr.mgh.harvard.edu/fswiki/aparcstats2table"
  },
  "asegstats2table": {
    "cwlPath": "cwl/freesurfer/asegstats2table.cwl",
    "enumHints": {
      "meas": [
        "volume",
        "mean"
      ],
      "delimiter": [
        "tab",
        "comma",
        "space",
        "semicolon"
      ]
    },
    "fullName": "FreeSurfer Subcortical Stats to Group Table",
    "function": "Collects subcortical segmentation statistics across multiple subjects into a single table.",
    "modality": "Multiple FreeSurfer subject directories with completed recon-all.",
    "keyParameters": "--subjects (subject list), --meas (measure: volume, mean), --tablefile (output table), --stats (stats file name)",
    "keyPoints": "Creates one row per subject with subcortical volumes. Default uses aseg.stats.",
    "typicalUse": "Group analysis of subcortical volumes.",
    "inputExtensions": {
      "subjectsfile": [".txt"],
      "segids": [".txt"]
    },
    "outputExtensions": {
      "table": [".txt", ".csv", ".dat"]
    },
    "docUrl": "https://surfer.nmr.mgh.harvard.edu/fswiki/asegstats2table"
  },
  "dmri_postreg": {
    "cwlPath": "cwl/freesurfer/dmri_postreg.cwl",
    "enumHints": {
      "interp": [
        "nearest",
        "trilin",
        "cubic"
      ]
    },
    "fullName": "FreeSurfer Diffusion Post-Registration Processing",
    "function": "Post-registration processing for diffusion MRI data as part of the TRACULA tractography pipeline.",
    "modality": "Registered diffusion MRI data within FreeSurfer/TRACULA directory structure.",
    "keyParameters": "--s (subject), --reg (registration method: bbr or manual)",
    "keyPoints": "Part of TRACULA pipeline. Handles diffusion-to-structural registration refinement. Usually called by trac-all.",
    "typicalUse": "Part of TRACULA pipeline for automated tractography.",
    "inputExtensions": {
      "input": [".mgz", ".mgh", ".nii", ".nii.gz"],
      "reg": [".dat", ".lta"],
      "xfm": [".xfm", ".lta", ".dat"],
      "ref": [".mgz", ".mgh", ".nii", ".nii.gz"],
      "mask": [".mgz", ".mgh", ".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "out_file": [".mgz", ".mgh", ".nii", ".nii.gz"]
    },
    "docUrl": "https://surfer.nmr.mgh.harvard.edu/fswiki/dmri_postreg"
  },
  "N4BiasFieldCorrection": {
    "cwlPath": "cwl/ants/N4BiasFieldCorrection.cwl",
    "fullName": "ANTs N4 Bias Field Correction",
    "function": "Advanced bias field (intensity inhomogeneity) correction using the N4 algorithm with iterative B-spline fitting.",
    "modality": "3D NIfTI volume (any MRI contrast), optional brain mask.",
    "keyParameters": "-d (dimension), -i (input), -o (output [,bias_field]), -x (mask), -s (shrink factor), -c (convergence)",
    "keyPoints": "Gold standard for bias correction. Use mask to restrict correction to brain. -s 4 speeds up computation.",
    "typicalUse": "Removing intensity inhomogeneity before segmentation or registration.",
    "inputExtensions": {
      "input_image": [".nii", ".nii.gz"],
      "mask_image": [".nii", ".nii.gz"],
      "weight_image": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "corrected_image": [".nii.gz"],
      "bias_field": [".nii.gz"]
    },
    "docUrl": "https://github.com/ANTsX/ANTs/wiki/Atropos-and-N4"
  },
  "DenoiseImage": {
    "cwlPath": "cwl/ants/DenoiseImage.cwl",
    "enumHints": {
      "noise_model": [
        "Rician",
        "Gaussian"
      ]
    },
    "fullName": "ANTs Non-Local Means Denoising",
    "function": "Reduces noise in MRI images using an adaptive non-local means algorithm that preserves structural details.",
    "modality": "3D NIfTI volume (any MRI contrast).",
    "keyParameters": "-d (dimension), -i (input), -o (output [,noise_image]), -v (verbose)",
    "keyPoints": "Preserves edges better than Gaussian smoothing. Can output estimated noise image. Apply before bias correction.",
    "typicalUse": "Noise reduction while preserving structural edges.",
    "inputExtensions": {
      "input_image": [".nii", ".nii.gz"],
      "mask_image": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "denoised_image": [".nii.gz"],
      "noise_image": [".nii.gz"]
    },
    "docUrl": "https://github.com/ANTsX/ANTs/wiki/DenoiseImage"
  },
  "ImageMath": {
    "cwlPath": "cwl/ants/ImageMath.cwl",
    "fullName": "ANTs Image Math Operations",
    "function": "Versatile tool for image arithmetic, morphological operations, distance transforms, and various measurements.",
    "modality": "3D NIfTI volume(s).",
    "keyParameters": "<dimension> <output> <operation> <input1> [input2] [parameters]",
    "keyPoints": "Operations include: m (multiply), + (add), ME/MD (erode/dilate), GetLargestComponent, FillHoles, Normalize.",
    "typicalUse": "Mathematical operations, morphological operations, connected component analysis.",
    "inputExtensions": {
      "input_image": [".nii", ".nii.gz"],
      "second_input": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "output": [".nii", ".nii.gz"]
    },
    "docUrl": "https://github.com/ANTsX/ANTs/wiki/ImageMath"
  },
  "ThresholdImage": {
    "cwlPath": "cwl/ants/ThresholdImage.cwl",
    "enumHints": {
      "threshold_mode": [
        "Otsu",
        "Kmeans"
      ]
    },
    "fullName": "ANTs Image Thresholding",
    "function": "Applies various thresholding methods to create binary masks, including Otsu and k-means adaptive thresholding.",
    "modality": "3D NIfTI volume.",
    "keyParameters": "<dimension> <input> <output> <lower> <upper> (binary) or Otsu <num_thresholds> (automatic)",
    "keyPoints": "Otsu mode automatically finds optimal threshold. Binary mode uses explicit lower/upper bounds.",
    "typicalUse": "Creating binary masks, Otsu-based adaptive thresholding.",
    "inputExtensions": {
      "input_image": [".nii", ".nii.gz"],
      "mask_image": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "thresholded": [".nii", ".nii.gz"]
    },
    "docUrl": "https://github.com/ANTsX/ANTs/wiki"
  },
  "LabelGeometryMeasures": {
    "cwlPath": "cwl/ants/LabelGeometryMeasures.cwl",
    "fullName": "ANTs Label Geometry Measures",
    "function": "Computes geometric properties (volume, centroid, bounding box, eccentricity) for each labeled region in a parcellation.",
    "modality": "3D integer-labeled NIfTI volume (parcellation/segmentation), optional intensity image.",
    "keyParameters": "<dimension> <label_image> [<intensity_image>] [<output_csv>]",
    "keyPoints": "Outputs CSV with volume, centroid, elongation, roundness per label.",
    "typicalUse": "Extracting volume, centroid, and shape measures per labeled region.",
    "inputExtensions": {
      "label_image": [".nii", ".nii.gz"],
      "intensity_image": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "csv_output": [".csv"]
    },
    "docUrl": "https://github.com/ANTsX/ANTs/wiki"
  },
  "antsJointLabelFusion.sh": {
    "cwlPath": "cwl/ants/antsJointLabelFusion.cwl",
    "fullName": "ANTs Joint Label Fusion",
    "function": "Multi-atlas segmentation that combines labels from multiple pre-labeled atlases using joint label fusion with local weighting.",
    "modality": "Target 3D NIfTI volume plus multiple atlas images with corresponding label maps.",
    "keyParameters": "-d (dimension), -t (target image), -g (atlas images), -l (atlas labels), -o (output prefix)",
    "keyPoints": "More accurate than single-atlas segmentation. Requires multiple registered atlases. Computationally intensive but highly accurate.",
    "typicalUse": "High-accuracy segmentation using multiple atlas priors.",
    "inputExtensions": {
      "target_image": [".nii", ".nii.gz"],
      "atlas_images": [".nii", ".nii.gz"],
      "atlas_labels": [".nii", ".nii.gz"],
      "mask_image": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "labeled_image": [".nii.gz"],
      "intensity_fusion": [".nii.gz"]
    },
    "docUrl": "https://github.com/ANTsX/ANTs/wiki/antsJointLabelFusion"
  },
  "antsRegistration": {
    "cwlPath": "cwl/ants/antsRegistration.cwl",
    "enumHints": {
      "interpolation": [
        "Linear",
        "NearestNeighbor",
        "BSpline",
        "Gaussian"
      ]
    },
    "fullName": "ANTs Multi-Stage Image Registration",
    "function": "State-of-the-art image registration supporting multiple stages (rigid, affine, SyN) with configurable metrics and convergence.",
    "modality": "Any 3D NIfTI volume pair (fixed and moving images).",
    "keyParameters": "-d (dimension), -f (fixed), -m (moving), -t (transform type), -c (convergence), -s (smoothing sigmas), -o (output)",
    "keyPoints": "Multi-stage approach: rigid then affine then SyN. SyN is symmetric diffeomorphic. CC metric best for intra-modal, MI for inter-modal.",
    "typicalUse": "High-quality multi-stage registration with full parameter control.",
    "inputExtensions": {
      "fixed_image": [".nii", ".nii.gz"],
      "moving_image": [".nii", ".nii.gz"],
      "initial_moving_transform": [".mat", ".h5", ".nii.gz", ".txt"]
    },
    "outputExtensions": {
      "warped_image": [".nii.gz"],
      "inverse_warped_image": [".nii.gz"],
      "forward_transforms": [".mat", ".nii.gz"],
      "inverse_transforms": [".nii.gz"]
    },
    "docUrl": "https://github.com/ANTsX/ANTs/wiki/Anatomy-of-an-antsRegistration-call"
  },
  "antsRegistrationSyN.sh": {
    "cwlPath": "cwl/ants/antsRegistrationSyN.cwl",
    "enumHints": {
      "transform_type": [
        "t",
        "r",
        "a",
        "s",
        "sr",
        "b",
        "br"
      ]
    },
    "fullName": "ANTs SyN Registration with Defaults",
    "function": "Symmetric normalization registration with sensible default parameters for common registration tasks.",
    "modality": "Any 3D NIfTI volume pair.",
    "keyParameters": "-d (dimension), -f (fixed), -m (moving), -o (output prefix), -t (transform type: s=SyN, b=BSplineSyN, a=affine only)",
    "keyPoints": "Good defaults for most use cases. Outputs forward/inverse warps and affine. Preferred over raw antsRegistration for simplicity.",
    "typicalUse": "Standard registration with good defaults for structural normalization.",
    "inputExtensions": {
      "fixed_image": [".nii", ".nii.gz"],
      "moving_image": [".nii", ".nii.gz"],
      "initial_transform": [".mat", ".h5", ".nii.gz", ".txt"]
    },
    "outputExtensions": {
      "warped_image": [".nii.gz"],
      "inverse_warped_image": [".nii.gz"],
      "affine_transform": [".mat"],
      "warp_field": [".nii.gz"],
      "inverse_warp_field": [".nii.gz"]
    },
    "docUrl": "https://github.com/ANTsX/ANTs/wiki/Anatomy-of-an-antsRegistration-call"
  },
  "antsRegistrationSyNQuick.sh": {
    "cwlPath": "cwl/ants/antsRegistrationSyNQuick.cwl",
    "enumHints": {
      "transform_type": [
        "t",
        "r",
        "a",
        "s",
        "sr",
        "b",
        "br"
      ]
    },
    "fullName": "ANTs Quick SyN Registration",
    "function": "Fast SyN registration with reduced iterations and coarser sampling for rapid approximate registration.",
    "modality": "Any 3D NIfTI volume pair.",
    "keyParameters": "-d (dimension), -f (fixed), -m (moving), -o (output prefix), -t (transform type)",
    "keyPoints": "Same interface as antsRegistrationSyN.sh but ~4x faster with slightly less accuracy.",
    "typicalUse": "Quick registration when speed is priority over maximum accuracy.",
    "inputExtensions": {
      "fixed_image": [".nii", ".nii.gz"],
      "moving_image": [".nii", ".nii.gz"],
      "initial_transform": [".mat", ".h5", ".nii.gz", ".txt"]
    },
    "outputExtensions": {
      "warped_image": [".nii.gz"],
      "inverse_warped_image": [".nii.gz"],
      "affine_transform": [".mat"],
      "warp_field": [".nii.gz"],
      "inverse_warp_field": [".nii.gz"]
    },
    "docUrl": "https://github.com/ANTsX/ANTs/wiki/Anatomy-of-an-antsRegistration-call"
  },
  "antsApplyTransforms": {
    "cwlPath": "cwl/ants/antsApplyTransforms.cwl",
    "enumHints": {
      "interpolation": [
        "Linear",
        "NearestNeighbor",
        "Gaussian",
        "BSpline",
        "GenericLabel"
      ],
      "input_image_type": [
        "0",
        "1",
        "2",
        "3"
      ]
    },
    "fullName": "ANTs Apply Transforms",
    "function": "Applies one or more precomputed transformations (affine + warp) to images, applying transforms in reverse order of specification.",
    "modality": "3D or 4D NIfTI volume plus transform files (affine .mat and/or warp .nii.gz).",
    "keyParameters": "-d (dimension), -i (input), -r (reference), -o (output), -t (transforms, applied last-to-first), -n (interpolation: Linear, NearestNeighbor, BSpline)",
    "keyPoints": "Transforms applied in REVERSE order listed. Use -n NearestNeighbor for label images. -e flag for time series.",
    "typicalUse": "Applying registration transforms to data, labels, or ROIs.",
    "inputExtensions": {
      "input_image": [".nii", ".nii.gz"],
      "reference_image": [".nii", ".nii.gz"],
      "transforms": [".mat", ".h5", ".nii.gz", ".txt"]
    },
    "outputExtensions": {
      "transformed_image": [".nii", ".nii.gz"]
    },
    "docUrl": "https://github.com/ANTsX/ANTs/wiki/Anatomy-of-an-antsRegistration-call"
  },
  "antsMotionCorr": {
    "cwlPath": "cwl/ants/antsMotionCorr.cwl",
    "fullName": "ANTs Motion Correction",
    "function": "Motion correction for time series data using ANTs registration framework with rigid or affine transformations.",
    "modality": "4D fMRI or dynamic PET NIfTI time series.",
    "keyParameters": "-d (dimension), -a (compute average), -o (output), -u (use fixed reference), -m (metric)",
    "keyPoints": "Can compute average image and motion-correct simultaneously. Uses ANTs optimization. Slower than MCFLIRT.",
    "typicalUse": "High-quality motion correction using ANTs registration framework.",
    "inputExtensions": {
      "fixed_image": [".nii", ".nii.gz"],
      "moving_image": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "corrected_image": [".nii.gz"],
      "average_image": [".nii.gz"],
      "motion_parameters": [".csv"],
      "displacement_field": [".nii.gz"]
    },
    "docUrl": "https://github.com/ANTsX/ANTs/wiki/antsMotionCorr"
  },
  "antsIntermodalityIntrasubject.sh": {
    "cwlPath": "cwl/ants/antsIntermodalityIntrasubject.cwl",
    "enumHints": {
      "transform_type": [
        "0",
        "1",
        "2",
        "3"
      ]
    },
    "fullName": "ANTs Intermodality Intrasubject Registration",
    "function": "Specialized registration between different imaging modalities within the same subject.",
    "modality": "Two different-modality volumes from the same subject (e.g., T1 + T2, or T1 + EPI).",
    "keyParameters": "-d (dimension), -i (input modality 1), -r (reference modality 2), -o (output prefix), -t (transform type)",
    "keyPoints": "Uses mutual information cost function appropriate for cross-modal registration.",
    "typicalUse": "T1-to-T2, fMRI-to-T1, or DWI-to-T1 within-subject alignment.",
    "outputExtensions": {
      "warped_image": [".nii.gz"],
      "affine_transform": [".mat"],
      "warp_field": [".nii.gz"],
      "inverse_warp_field": [".nii.gz"]
    },
    "docUrl": "https://github.com/ANTsX/ANTs/wiki/Anatomy-of-an-antsRegistration-call"
  },
  "Atropos": {
    "cwlPath": "cwl/ants/Atropos.cwl",
    "enumHints": {
      "likelihood_model": [
        "Gaussian",
        "HistogramParzenWindows",
        "ManifoldParzenWindows"
      ]
    },
    "fullName": "ANTs Atropos Tissue Segmentation",
    "function": "Probabilistic tissue segmentation using expectation-maximization algorithm with Markov random field spatial prior.",
    "modality": "Brain-extracted 3D NIfTI volume plus brain mask.",
    "keyParameters": "-d (dimension), -a (input image), -x (mask), -i (initialization: KMeans[N] or PriorProbabilityImages), -c (convergence), -o (output)",
    "keyPoints": "Initialize with KMeans[3] for basic GM/WM/CSF or use prior probability images. MRF prior improves spatial coherence.",
    "typicalUse": "GMM-based brain tissue segmentation with spatial regularization.",
    "inputExtensions": {
      "intensity_image": [".nii", ".nii.gz"],
      "mask_image": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "segmentation": [".nii", ".nii.gz"],
      "posteriors": [".nii.gz"]
    },
    "docUrl": "https://github.com/ANTsX/ANTs/wiki/Atropos-and-N4"
  },
  "antsAtroposN4.sh": {
    "cwlPath": "cwl/ants/antsAtroposN4.cwl",
    "fullName": "ANTs Combined Atropos with N4 Bias Correction",
    "function": "Iteratively combines N4 bias field correction with Atropos segmentation for improved results on biased images.",
    "modality": "Brain-extracted 3D NIfTI volume plus brain mask.",
    "keyParameters": "-d (dimension), -a (anatomical image), -x (mask), -c (number of classes), -o (output prefix), -n (number of iterations)",
    "keyPoints": "Iterative approach: N4 correction improves segmentation, which improves next N4 iteration. Superior to running separately.",
    "typicalUse": "Iterative N4 + segmentation for better results on images with bias field.",
    "inputExtensions": {
      "input_image": [".nii", ".nii.gz"],
      "mask_image": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "segmentation": [".nii.gz"],
      "posteriors": [".nii.gz"],
      "bias_corrected": [".nii.gz"]
    },
    "docUrl": "https://github.com/ANTsX/ANTs/wiki/Atropos-and-N4"
  },
  "antsBrainExtraction.sh": {
    "cwlPath": "cwl/ants/antsBrainExtraction.cwl",
    "fullName": "ANTs Template-Based Brain Extraction",
    "function": "High-quality brain extraction using registration to a brain template and tissue priors for robust skull stripping.",
    "modality": "T1-weighted 3D NIfTI volume plus brain template and brain probability mask.",
    "keyParameters": "-d (dimension, 3), -a (anatomical image), -e (brain template), -m (brain probability mask), -o (output prefix)",
    "keyPoints": "More robust than BET for difficult cases. Requires template and prior. Slower but generally more accurate.",
    "typicalUse": "High-quality skull stripping, especially for challenging datasets.",
    "inputExtensions": {
      "anatomical_image": [".nii", ".nii.gz"],
      "template": [".nii", ".nii.gz"],
      "brain_probability_mask": [".nii", ".nii.gz"],
      "registration_mask": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "brain_extracted": [".nii.gz"],
      "brain_mask": [".nii.gz"],
      "brain_n4": [".nii.gz"],
      "registration_template": [".nii.gz"]
    },
    "docUrl": "https://github.com/ANTsX/ANTs/wiki/antsBrainExtraction-and-templates"
  },
  "KellyKapowski": {
    "cwlPath": "cwl/ants/KellyKapowski.cwl",
    "fullName": "ANTs DiReCT Cortical Thickness (KellyKapowski)",
    "function": "Estimates cortical thickness using the DiReCT algorithm from segmentation data.",
    "modality": "Tissue segmentation image plus GM and WM probability maps (3D NIfTI).",
    "keyParameters": "-d (dimension), -s (segmentation image), -g (GM probability), -w (WM probability), -o (output thickness map), -c (convergence)",
    "keyPoints": "Core thickness estimation engine used by antsCorticalThickness.sh. Requires good segmentation as input.",
    "typicalUse": "Computing cortical thickness from pre-existing tissue segmentation.",
    "inputExtensions": {
      "segmentation_image": [".nii", ".nii.gz"],
      "gray_matter_prob": [".nii", ".nii.gz"],
      "white_matter_prob": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "thickness_image": [".nii", ".nii.gz"]
    },
    "docUrl": "https://github.com/ANTsX/ANTs/wiki/antsCorticalThickness-and-Templates"
  },
  "antsCorticalThickness.sh": {
    "cwlPath": "cwl/ants/antsCorticalThickness.cwl",
    "enumHints": {
      "run_stage": [
        "0",
        "1",
        "2",
        "3"
      ]
    },
    "fullName": "ANTs Cortical Thickness Pipeline",
    "function": "Complete automated pipeline for cortical thickness estimation using DiReCT, including brain extraction, segmentation, and registration.",
    "modality": "T1-weighted 3D NIfTI volume plus brain template and tissue priors.",
    "keyParameters": "-d (dimension), -a (anatomical image), -e (brain template), -m (brain probability mask), -p (tissue priors prefix), -o (output prefix)",
    "keyPoints": "Runs full pipeline: N4, brain extraction, segmentation, registration, thickness. Requires template and priors. Computationally intensive.",
    "typicalUse": "Complete DiReCT-based cortical thickness measurement pipeline.",
    "inputExtensions": {
      "anatomical_image": [".nii", ".nii.gz"],
      "template": [".nii", ".nii.gz"],
      "brain_probability_mask": [".nii", ".nii.gz"],
      "registration_mask": [".nii", ".nii.gz"],
      "extraction_registration_mask": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "brain_extraction_mask": [".nii.gz"],
      "brain_segmentation": [".nii.gz"],
      "cortical_thickness": [".nii.gz"],
      "brain_normalized": [".nii.gz"],
      "subject_to_template_warp": [".nii.gz"],
      "subject_to_template_affine": [".mat"],
      "template_to_subject_warp": [".nii.gz"],
      "template_to_subject_affine": [".mat"],
      "segmentation_posteriors": [".nii.gz"]
    },
    "docUrl": "https://github.com/ANTsX/ANTs/wiki/antsCorticalThickness-and-Templates"
  },
  "eddy": {
    "cwlPath": "cwl/fsl/eddy.cwl",
    "fullName": "FSL Eddy Current and Motion Correction (eddy)",
    "function": "Corrects eddy current-induced distortions and subject movement in diffusion MRI data using a Gaussian process model.",
    "modality": "4D diffusion-weighted NIfTI with b-values (.bval), b-vectors (.bvec), acquisition parameters, and index files.",
    "keyParameters": "--imain (input DWI), --bvals, --bvecs, --acqp (acquisition params), --index (volume indices), --topup (topup output), --out (output)",
    "keyPoints": "Should follow topup if available. Outputs rotated bvecs to account for motion. Use --repol for outlier replacement. GPU version (eddy_cuda) much faster.",
    "typicalUse": "Primary preprocessing step for diffusion MRI after topup distortion correction.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz"],
      "bvals": [".bval"],
      "bvecs": [".bvec"],
      "acqp": [".txt"],
      "index": [".txt"],
      "mask": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "corrected_image": [".nii", ".nii.gz"],
      "rotated_bvecs": [".eddy_rotated_bvecs"],
      "parameters": [".eddy_parameters"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/eddy"
  },
  "dtifit": {
    "cwlPath": "cwl/fsl/dtifit.cwl",
    "requires": {
      "tensor": "save_tensor"
    },
    "fullName": "FSL Diffusion Tensor Fitting (dtifit)",
    "function": "Fits a diffusion tensor model to each voxel of preprocessed diffusion-weighted data to generate scalar diffusion maps.",
    "modality": "4D diffusion-weighted NIfTI with b-values (.bval), b-vectors (.bvec), and brain mask.",
    "keyParameters": "-k (input DWI), -o (output basename), -m (brain mask), -r (bvecs file), -b (bvals file)",
    "keyPoints": "Outputs FA, MD, eigenvalues (L1/L2/L3), eigenvectors (V1/V2/V3), and full tensor. Assumes single-fiber per voxel (use bedpostx for crossing fibers).",
    "typicalUse": "Generating fractional anisotropy (FA) and mean diffusivity (MD) maps from DWI data.",
    "inputExtensions": {
      "data": [".nii", ".nii.gz"],
      "mask": [".nii", ".nii.gz"],
      "bvecs": [".bvec"],
      "bvals": [".bval"]
    },
    "outputExtensions": {
      "FA": [".nii", ".nii.gz"],
      "MD": [".nii", ".nii.gz"],
      "L1": [".nii", ".nii.gz"],
      "L2": [".nii", ".nii.gz"],
      "L3": [".nii", ".nii.gz"],
      "V1": [".nii", ".nii.gz"],
      "V2": [".nii", ".nii.gz"],
      "V3": [".nii", ".nii.gz"],
      "tensor": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FDT/UserGuide#DTIFIT"
  },
  "bedpostx": {
    "cwlPath": "cwl/fsl/bedpostx.cwl",
    "fullName": "Bayesian Estimation of Diffusion Parameters Obtained using Sampling Techniques (BEDPOSTX)",
    "function": "Bayesian estimation of fiber orientation distributions using MCMC sampling, supporting multiple crossing fibers per voxel.",
    "modality": "Directory containing 4D DWI (data.nii.gz), b-values (bvals), b-vectors (bvecs), and brain mask (nodif_brain_mask.nii.gz).",
    "keyParameters": "<data_directory>, -n (max fibers per voxel, default 3)",
    "keyPoints": "Very computationally intensive (hours-days). GPU version (bedpostx_gpu) strongly recommended. Required before probtrackx2. Outputs fiber orientations and uncertainty estimates.",
    "typicalUse": "Prerequisite for probabilistic tractography with probtrackx2.",
    "inputExtensions": {},
    "outputExtensions": {
      "merged_samples": [".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FDT/UserGuide#BEDPOSTX"
  },
  "tbss_1_preproc": {
    "cwlPath": "cwl/fsl/tbss_1_preproc.cwl",
    "fullName": "TBSS Step 1: Preprocessing",
    "function": "Preprocesses FA images for TBSS by slightly eroding them and zeroing end slices to remove outlier voxels.",
    "modality": "FA maps (3D NIfTI) from dtifit, placed in a common directory.",
    "keyParameters": "*.nii.gz (all FA images in current directory)",
    "keyPoints": "Run from directory containing all subjects FA images. Creates FA/ subdirectory with preprocessed images. Must be run before tbss_2_reg.",
    "typicalUse": "First step of TBSS pipeline for voxelwise diffusion analysis.",
    "inputExtensions": {
      "fa_images": [".nii", ".nii.gz"]
    },
    "outputExtensions": {},
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/TBSS/UserGuide"
  },
  "tbss_2_reg": {
    "cwlPath": "cwl/fsl/tbss_2_reg.cwl",
    "fullName": "TBSS Step 2: Registration",
    "function": "Registers all FA images to a target (best subject or standard-space template) using non-linear registration.",
    "modality": "Preprocessed FA images from tbss_1_preproc.",
    "keyParameters": "-T (use FMRIB58_FA as target), -t <target> (use specified target), -n (find best subject as target)",
    "keyPoints": "Use -T for standard target (recommended for most analyses). -n finds best representative subject but takes longer. Registration quality should be checked visually.",
    "typicalUse": "Second step of TBSS pipeline: aligning all subjects to common space.",
    "inputExtensions": {
      "target_image": [".nii", ".nii.gz"]
    },
    "outputExtensions": {},
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/TBSS/UserGuide"
  },
  "tbss_3_postreg": {
    "cwlPath": "cwl/fsl/tbss_3_postreg.cwl",
    "fullName": "TBSS Step 3: Post-Registration",
    "function": "Creates mean FA image and FA skeleton by projecting registered FA data onto a mean tract center.",
    "modality": "Registered FA images from tbss_2_reg.",
    "keyParameters": "-S (use study-specific mean FA and skeleton), -T (use FMRIB58_FA mean and skeleton)",
    "keyPoints": "Creates mean_FA, mean_FA_skeleton, and all_FA (4D). Skeleton threshold typically 0.2 FA. -S recommended for study-specific analysis.",
    "typicalUse": "Third step of TBSS: creating the white matter skeleton for analysis.",
    "inputExtensions": {},
    "outputExtensions": {
      "mean_FA": [".nii.gz"],
      "mean_FA_skeleton": [".nii.gz"],
      "all_FA": [".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/TBSS/UserGuide"
  },
  "tbss_4_prestats": {
    "cwlPath": "cwl/fsl/tbss_4_prestats.cwl",
    "fullName": "TBSS Step 4: Pre-Statistics",
    "function": "Projects all subjects FA data onto the mean FA skeleton, ready for voxelwise cross-subject statistics.",
    "modality": "Mean FA skeleton from tbss_3_postreg plus registered FA images.",
    "keyParameters": "<threshold> (FA threshold for skeleton, typically 0.2)",
    "keyPoints": "Threshold determines which voxels are included in skeleton. Creates all_FA_skeletonised (4D) ready for randomise. Can also project non-FA data (MD, etc.) using tbss_non_FA.",
    "typicalUse": "Final TBSS step before statistical analysis with randomise.",
    "inputExtensions": {},
    "outputExtensions": {
      "all_FA_skeletonised": [".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/TBSS/UserGuide"
  },
  "oxford_asl": {
    "cwlPath": "cwl/fsl/oxford_asl.cwl",
    "fullName": "Oxford ASL Processing Pipeline",
    "function": "Complete pipeline for ASL MRI quantification including motion correction, registration, calibration, and partial volume correction.",
    "modality": "4D ASL NIfTI (tag/control pairs) plus structural T1 image.",
    "keyParameters": "-i (input ASL), -o (output dir), -s (structural image), --casl/--pasl (labeling type), --iaf (input format: tc/ct/diff), --tis (inversion times)",
    "keyPoints": "Handles both pASL and CASL/pCASL. Performs kinetic modeling via BASIL internally. Use --wp for white paper quantification mode. Requires calibration image for absolute CBF.",
    "typicalUse": "Complete ASL quantification from raw data to calibrated CBF maps.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz"],
      "mask": [".nii", ".nii.gz"],
      "structural": [".nii", ".nii.gz"],
      "calib": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "perfusion": [".nii.gz"],
      "arrival": [".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/BASIL"
  },
  "basil": {
    "cwlPath": "cwl/fsl/basil.cwl",
    "fullName": "Bayesian Inference for Arterial Spin Labeling (BASIL)",
    "function": "Bayesian kinetic model inversion for ASL data using variational Bayes to estimate perfusion and arrival time.",
    "modality": "4D ASL NIfTI (differenced tag-control or raw tag/control pairs).",
    "keyParameters": "-i (input ASL), -o (output dir), --tis (inversion times), --casl/--pasl, --bolus (bolus duration), --bat (arterial transit time prior)",
    "keyPoints": "Core kinetic modeling engine used by oxford_asl. Multi-TI data enables arrival time estimation. Spatial regularization improves estimates in low-SNR regions.",
    "typicalUse": "Bayesian perfusion quantification with uncertainty estimation.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz"],
      "mask": [".nii", ".nii.gz"],
      "options_file": [".txt"],
      "pgm": [".nii", ".nii.gz"],
      "pwm": [".nii", ".nii.gz"],
      "t1im": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "perfusion": [".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/BASIL"
  },
  "asl_calib": {
    "cwlPath": "cwl/fsl/asl_calib.cwl",
    "fullName": "ASL Calibration (asl_calib)",
    "function": "Calibrates ASL perfusion data to absolute CBF units (ml/100g/min) using an M0 calibration image.",
    "modality": "Perfusion image (3D NIfTI) plus M0 calibration image and structural reference.",
    "keyParameters": "-i (perfusion image), -c (M0 calibration image), -s (structural image), --mode (voxelwise or reference region), --tr (TR of calibration)",
    "keyPoints": "Two modes: voxelwise (divides each voxel by local M0) or reference region (uses CSF M0 as reference). Reference region mode more robust to coil sensitivity variations.",
    "typicalUse": "Converting relative perfusion signals to absolute CBF values.",
    "inputExtensions": {
      "calib_image": [".nii", ".nii.gz"],
      "perfusion": [".nii", ".nii.gz"],
      "structural": [".nii", ".nii.gz"],
      "transform": [".mat"],
      "mask": [".nii", ".nii.gz"],
      "bmask": [".nii", ".nii.gz"],
      "str2std": [".mat"],
      "warp": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "calibrated_perfusion": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/BASIL"
  },
  "dwidenoise": {
    "cwlPath": "cwl/mrtrix3/dwidenoise.cwl",
    "requires": {
      "noise_map": "noise"
    },
    "fullName": "MRtrix3 DWI Denoising (MP-PCA)",
    "function": "Removes thermal noise from diffusion MRI data using Marchenko-Pastur PCA exploiting data redundancy across diffusion directions.",
    "modality": "4D diffusion-weighted NIfTI with multiple diffusion directions (minimum ~30 recommended).",
    "keyParameters": "<input> <output>, -noise (output noise map), -extent (spatial patch size, default 5,5,5), -mask (brain mask)",
    "keyPoints": "Should be run FIRST, before any other processing. Requires sufficient number of diffusion directions. Noise map useful for QC.",
    "typicalUse": "First step in DWI preprocessing to improve SNR.",
    "inputExtensions": {
      "input": [".mif", ".nii", ".nii.gz", ".mgh", ".mgz"],
      "mask": [".mif", ".nii", ".nii.gz", ".mgh", ".mgz"]
    },
    "outputExtensions": {
      "denoised": [".mif", ".nii", ".nii.gz"],
      "noise_map": [".mif", ".nii", ".nii.gz"]
    },
    "docUrl": "https://mrtrix.readthedocs.io/en/latest/reference/commands/dwidenoise.html"
  },
  "mrdegibbs": {
    "cwlPath": "cwl/mrtrix3/mrdegibbs.cwl",
    "fullName": "MRtrix3 Gibbs Ringing Removal",
    "function": "Removes Gibbs ringing artifacts (truncation artifacts) from MRI data using a local subvoxel-shift method.",
    "modality": "3D or 4D NIfTI volume (structural or diffusion).",
    "keyParameters": "<input> <output>, -axes (axes along which data was acquired, default 0,1)",
    "keyPoints": "Run after dwidenoise but before any interpolation-based processing. Only effective if data was NOT zero-filled in k-space.",
    "typicalUse": "Removing Gibbs ringing after denoising, before other preprocessing.",
    "inputExtensions": {
      "input": [".mif", ".nii", ".nii.gz", ".mgh", ".mgz"]
    },
    "outputExtensions": {
      "degibbs": [".mif", ".nii", ".nii.gz"]
    },
    "docUrl": "https://mrtrix.readthedocs.io/en/latest/reference/commands/mrdegibbs.html"
  },
  "dwi2tensor": {
    "cwlPath": "cwl/mrtrix3/dwi2tensor.cwl",
    "requires": {
      "b0_image": "b0",
      "kurtosis_tensor": "dkt"
    },
    "fullName": "MRtrix3 Diffusion Tensor Estimation",
    "function": "Estimates the diffusion tensor model at each voxel from preprocessed DWI data using weighted or ordinary least squares.",
    "modality": "4D diffusion-weighted NIfTI with gradient table (b-values and b-vectors).",
    "keyParameters": "<input> <output>, -mask (brain mask), -b0 (output mean b=0 image), -dkt (output diffusion kurtosis tensor)",
    "keyPoints": "Assumes single fiber per voxel. Gradient information must be in image header or provided via -fslgrad bvecs bvals.",
    "typicalUse": "Fitting diffusion tensor to DWI data for FA/MD map generation.",
    "inputExtensions": {
      "input": [".mif", ".nii", ".nii.gz", ".mgh", ".mgz"],
      "mask": [".mif", ".nii", ".nii.gz", ".mgh", ".mgz"]
    },
    "outputExtensions": {
      "tensor": [".mif", ".nii", ".nii.gz"],
      "b0_image": [".mif", ".nii", ".nii.gz"],
      "kurtosis_tensor": [".mif", ".nii", ".nii.gz"]
    },
    "docUrl": "https://mrtrix.readthedocs.io/en/latest/reference/commands/dwi2tensor.html"
  },
  "tensor2metric": {
    "cwlPath": "cwl/mrtrix3/tensor2metric.cwl",
    "requires": {
      "fa_map": "fa",
      "md_map": "adc",
      "ad_map": "ad",
      "rd_map": "rd"
    },
    "fullName": "MRtrix3 Tensor Metric Extraction",
    "function": "Extracts scalar metrics (FA, MD, AD, RD, eigenvalues, eigenvectors) from a fitted diffusion tensor image.",
    "modality": "Diffusion tensor image (4D NIfTI from dwi2tensor).",
    "keyParameters": "<input>, -fa (output FA map), -adc (output MD map), -ad (output AD), -rd (output RD), -vector (output eigenvectors)",
    "keyPoints": "Multiple outputs can be generated in a single run. FA range 0-1. Specify each desired output explicitly.",
    "typicalUse": "Generating FA, MD, and other scalar diffusion maps from tensor.",
    "inputExtensions": {
      "input": [".mif", ".nii", ".nii.gz", ".mgh", ".mgz"],
      "mask": [".mif", ".nii", ".nii.gz", ".mgh", ".mgz"]
    },
    "outputExtensions": {
      "fa_map": [".mif", ".nii", ".nii.gz"],
      "md_map": [".mif", ".nii", ".nii.gz"],
      "ad_map": [".mif", ".nii", ".nii.gz"],
      "rd_map": [".mif", ".nii", ".nii.gz"]
    },
    "docUrl": "https://mrtrix.readthedocs.io/en/latest/reference/commands/tensor2metric.html"
  },
  "dwi2fod": {
    "cwlPath": "cwl/mrtrix3/dwi2fod.cwl",
    "fullName": "MRtrix3 Fiber Orientation Distribution Estimation",
    "function": "Estimates fiber orientation distributions (FODs) using constrained spherical deconvolution to resolve crossing fibers.",
    "modality": "4D diffusion-weighted NIfTI with multi-shell or single-shell data, plus tissue response functions.",
    "keyParameters": "<algorithm> <input> <wm_response> <wm_fod> [<gm_response> <gm_fod>] [<csf_response> <csf_fod>], -mask (brain mask)",
    "keyPoints": "Use msmt_csd for multi-shell data (recommended), csd for single-shell. Response functions from dwi2response.",
    "typicalUse": "Estimating fiber orientations for subsequent tractography.",
    "inputExtensions": {
      "input": [".mif", ".nii", ".nii.gz", ".mgh", ".mgz"],
      "wm_response": [".txt"],
      "gm_response": [".txt"],
      "csf_response": [".txt"],
      "mask": [".mif", ".nii", ".nii.gz", ".mgh", ".mgz"]
    },
    "outputExtensions": {
      "wm_fod_image": [".mif", ".nii", ".nii.gz"],
      "gm_fod_image": [".mif", ".nii", ".nii.gz"],
      "csf_fod_image": [".mif", ".nii", ".nii.gz"]
    },
    "docUrl": "https://mrtrix.readthedocs.io/en/latest/reference/commands/dwi2fod.html"
  },
  "tckgen": {
    "cwlPath": "cwl/mrtrix3/tckgen.cwl",
    "fullName": "MRtrix3 Streamline Tractography Generation",
    "function": "Generates streamline tractograms using various algorithms (iFOD2, FACT, etc.) from FOD or tensor images.",
    "modality": "FOD image (from dwi2fod) or tensor image, plus optional seed/mask/ROI images.",
    "keyParameters": "<source> <output.tck>, -algorithm (iFOD2, FACT, etc.), -seed_image (seeding region), -select (target streamline count), -cutoff (FOD amplitude cutoff)",
    "keyPoints": "iFOD2 (default) is probabilistic and handles crossing fibers. Use -select for target count. -cutoff controls termination.",
    "typicalUse": "Generating whole-brain or ROI-seeded tractograms.",
    "inputExtensions": {
      "source": [".mif", ".nii", ".nii.gz", ".mgh", ".mgz"],
      "seed_image": [".mif", ".nii", ".nii.gz", ".mgh", ".mgz"],
      "act": [".mif", ".nii", ".nii.gz", ".mgh", ".mgz"]
    },
    "outputExtensions": {
      "tractogram": [".tck"]
    },
    "docUrl": "https://mrtrix.readthedocs.io/en/latest/reference/commands/tckgen.html"
  },
  "tcksift": {
    "cwlPath": "cwl/mrtrix3/tcksift.cwl",
    "fullName": "MRtrix3 SIFT Tractogram Filtering",
    "function": "Filters tractograms to improve biological plausibility by matching streamline density to FOD lobe integrals.",
    "modality": "Tractogram (.tck) plus FOD image used for tractography.",
    "keyParameters": "<input.tck> <output.tck>, -act (ACT image), -term_number (target streamline count)",
    "keyPoints": "Dramatically improves connectome quantification. Run after tckgen. SIFT2 (tcksift2) outputs weights instead of filtering.",
    "typicalUse": "Improving tractogram biological accuracy before connectome construction.",
    "inputExtensions": {
      "input_tracks": [".tck"],
      "fod": [".mif", ".nii", ".nii.gz", ".mgh", ".mgz"],
      "act": [".mif", ".nii", ".nii.gz", ".mgh", ".mgz"]
    },
    "outputExtensions": {
      "filtered_tractogram": [".tck"]
    },
    "docUrl": "https://mrtrix.readthedocs.io/en/latest/reference/commands/tcksift.html"
  },
  "tck2connectome": {
    "cwlPath": "cwl/mrtrix3/tck2connectome.cwl",
    "fullName": "MRtrix3 Tractogram to Connectome",
    "function": "Constructs a structural connectivity matrix by counting streamlines connecting pairs of regions from a parcellation.",
    "modality": "Tractogram (.tck) plus parcellation volume (integer-labeled 3D NIfTI).",
    "keyParameters": "<input.tck> <parcellation> <output.csv>, -assignment_radial_search (search radius), -scale_length (length scaling)",
    "keyPoints": "Output is NxN matrix. Use SIFT/SIFT2 filtered tractogram for quantitative connectomics. -symmetric recommended.",
    "typicalUse": "Building structural connectivity matrices from tractography and parcellation.",
    "inputExtensions": {
      "input_tracks": [".tck"],
      "parcellation": [".mif", ".nii", ".nii.gz", ".mgh", ".mgz"]
    },
    "outputExtensions": {
      "connectome": [".csv"]
    },
    "docUrl": "https://mrtrix.readthedocs.io/en/latest/reference/commands/tck2connectome.html"
  },
  "fmriprep": {
    "cwlPath": "cwl/fmriprep/fmriprep.cwl",
    "fullName": "fMRIPrep: Robust fMRI Preprocessing Pipeline",
    "function": "Automated, robust preprocessing pipeline for task-based and resting-state fMRI, combining tools from FSL, FreeSurfer, ANTs, and AFNI with best practices.",
    "modality": "BIDS-formatted dataset containing T1w anatomical and BOLD fMRI data (NIfTI format).",
    "keyParameters": "<bids_dir> <output_dir> participant, --participant-label (subject IDs), --output-spaces (target spaces), --fs-license-file (FreeSurfer license)",
    "keyPoints": "Requires BIDS-formatted input. Handles brain extraction, segmentation, registration, motion correction, distortion correction, and confound estimation. Generates comprehensive visual QC reports.",
    "typicalUse": "Complete standardized fMRI preprocessing from BIDS data to analysis-ready outputs.",
    "inputExtensions": {
      "fs_license_file": [".txt"]
    },
    "outputExtensions": {},
    "docUrl": "https://fmriprep.org/en/stable/"
  },
  "mriqc": {
    "cwlPath": "cwl/mriqc/mriqc.cwl",
    "fullName": "MRIQC: MRI Quality Control Pipeline",
    "function": "Automated quality control pipeline that extracts image quality metrics (IQMs) from structural and functional MRI and generates visual reports.",
    "modality": "BIDS-formatted dataset containing T1w, T2w, and/or BOLD fMRI data (NIfTI format).",
    "keyParameters": "<bids_dir> <output_dir> participant, --participant-label (subject IDs), --modalities (T1w, T2w, bold), --no-sub (skip submission to web API)",
    "keyPoints": "Requires BIDS-formatted input. Computes dozens of IQMs (SNR, CNR, EFC, FBER, motion metrics). Generates individual and group-level visual reports.",
    "typicalUse": "Automated quality assessment of MRI data before preprocessing.",
    "inputExtensions": {},
    "outputExtensions": {},
    "docUrl": "https://mriqc.readthedocs.io/en/stable/"
  },
  "mri_gtmpvc": {
    "cwlPath": "cwl/freesurfer/mri_gtmpvc.cwl",
    "fullName": "FreeSurfer Geometric Transfer Matrix Partial Volume Correction",
    "function": "Performs partial volume correction for PET data using the geometric transfer matrix method based on high-resolution anatomical segmentation.",
    "modality": "PET volume (3D NIfTI/MGZ) plus FreeSurfer segmentation (aparc+aseg).",
    "keyParameters": "--i (input PET), --seg (segmentation), --reg (registration to anatomy), --psf (point spread function FWHM in mm), --o (output directory)",
    "keyPoints": "Accounts for PET spatial resolution blurring across tissue boundaries. PSF should match scanner resolution (~4-6mm).",
    "typicalUse": "Partial volume correction of PET data using anatomical segmentation.",
    "inputExtensions": {
      "input": [".mgz", ".mgh", ".nii", ".nii.gz"],
      "seg": [".mgz", ".mgh", ".nii", ".nii.gz"],
      "reg": [".lta", ".dat"]
    },
    "outputExtensions": {
      "gtm_stats": [".dat"]
    },
    "docUrl": "https://surfer.nmr.mgh.harvard.edu/fswiki/PetSurfer"
  },
  "tbss_non_FA": {
    "cwlPath": "cwl/fsl/tbss_non_FA.cwl",
    "fullName": "TBSS Non-FA Image Projection",
    "function": "Projects non-FA diffusion images (MD, AD, RD, etc.) onto the mean FA skeleton using the same registration from the FA-based TBSS pipeline.",
    "modality": "Non-FA diffusion scalar maps (3D NIfTI) in same space as FA images used for TBSS.",
    "keyParameters": "<non_FA_image> (e.g., all_MD) - run after tbss_4_prestats with non-FA data in stats directory",
    "keyPoints": "Must run full TBSS pipeline on FA first. Non-FA images must be in same native space as original FA. Creates all_<measure>_skeletonised for use with randomise.",
    "typicalUse": "Analyzing MD, AD, RD, or other diffusion metrics on the FA-derived skeleton.",
    "inputExtensions": {},
    "outputExtensions": {
      "skeletonised_data": [".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/TBSS/UserGuide#Using_non-FA_Images_in_TBSS"
  },
  "applytopup": {
    "cwlPath": "cwl/fsl/applytopup.cwl",
    "fullName": "FSL Apply Topup Distortion Correction",
    "function": "Applies the susceptibility-induced off-resonance field estimated by topup to correct distortions in EPI images.",
    "modality": "3D or 4D EPI NIfTI plus topup output (movpar.txt and fieldcoef files).",
    "keyParameters": "--imain (input images), --topup (topup output prefix), --datain (acquisition parameters), --inindex (index into datain), --out (output), --method (jac or lsr)",
    "keyPoints": "Use after running topup. --method=jac applies Jacobian modulation (recommended for fMRI). Can apply to multiple images at once.",
    "typicalUse": "Applying distortion correction to fMRI or DWI data using pre-computed topup results.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz"],
      "topup_fieldcoef": [".nii", ".nii.gz"],
      "topup_movpar": [".txt"],
      "encoding_file": [".txt"]
    },
    "outputExtensions": {
      "corrected_images": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/topup/ApplyTopupUsersGuide"
  },
  "fsl_prepare_fieldmap": {
    "cwlPath": "cwl/fsl/fsl_prepare_fieldmap.cwl",
    "fullName": "FSL Fieldmap Preparation",
    "function": "Prepares a fieldmap for use with FUGUE by converting phase difference images to radians per second.",
    "modality": "Phase difference image and magnitude image from gradient echo fieldmap acquisition.",
    "keyParameters": "<scanner> <phase_image> <magnitude_image> <output_fieldmap> <delta_TE_ms>",
    "keyPoints": "Scanner type determines unwrapping method (SIEMENS most common). Delta TE is the echo time difference in milliseconds. Output is in rad/s for use with FUGUE.",
    "typicalUse": "Converting raw fieldmap images to FUGUE-compatible format for EPI distortion correction.",
    "inputExtensions": {
      "phase_image": [".nii", ".nii.gz"],
      "magnitude_image": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "fieldmap": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FUGUE/Guide#SIEMENS_data"
  },
  "prelude": {
    "cwlPath": "cwl/fsl/prelude.cwl",
    "fullName": "FSL Phase Region Expanding Labeller for Unwrapping Discrete Estimates (PRELUDE)",
    "function": "Performs 3D phase unwrapping on wrapped phase images using a region-growing algorithm.",
    "modality": "Wrapped phase image (3D NIfTI) plus optional magnitude image for masking.",
    "keyParameters": "-p (wrapped phase), -a (magnitude for mask), -o (output unwrapped phase), -m (brain mask), -f (apply phase filter)",
    "keyPoints": "Essential preprocessing for fieldmap-based distortion correction. Magnitude image improves unwrapping quality. Can handle phase wraps > 2pi.",
    "typicalUse": "Unwrapping phase images before fieldmap calculation for distortion correction.",
    "inputExtensions": {
      "phase": [".nii", ".nii.gz"],
      "magnitude": [".nii", ".nii.gz"],
      "complex_input": [".nii", ".nii.gz"],
      "mask": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "unwrapped_phase": [".nii", ".nii.gz"],
      "saved_mask": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/FUGUE/Guide#PRELUDE_.28phase_unwrapping.29"
  },
  "bianca": {
    "cwlPath": "cwl/fsl/bianca.cwl",
    "fullName": "Brain Intensity AbNormality Classification Algorithm (BIANCA)",
    "function": "Automated white matter hyperintensity (WMH) segmentation using supervised machine learning (k-nearest neighbor) trained on manually labeled data.",
    "modality": "T1-weighted and FLAIR images (3D NIfTI), plus training data with manual WMH masks.",
    "keyParameters": "--singlefile (input file list), --labelfeaturenum (which feature is the manual label), --brainmaskfeaturenum (brain mask feature), --querysubjectnum (subject to segment), --trainingnums (training subjects)",
    "keyPoints": "Requires training data with manual WMH labels. Uses spatial and intensity features. Performance depends on training data quality and similarity to test data.",
    "typicalUse": "Automated white matter lesion segmentation in aging, small vessel disease, or MS studies.",
    "inputExtensions": {
      "singlefile": [".txt"]
    },
    "outputExtensions": {
      "wmh_map": [".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/BIANCA"
  },
  "robustfov": {
    "cwlPath": "cwl/fsl/robustfov.cwl",
    "fullName": "FSL Robust Field of View Reduction",
    "function": "Automatically identifies and removes neck/non-brain tissue by estimating the brain center and reducing the field of view to a standard size.",
    "modality": "T1-weighted 3D NIfTI volume (full head coverage).",
    "keyParameters": "-i (input), -r (output ROI volume), -m (output transformation matrix), -b (brain size estimate in mm, default 170)",
    "keyPoints": "Useful for images with extensive neck coverage. Run before BET for more robust brain extraction. Does not resample, just crops.",
    "typicalUse": "Preprocessing step before brain extraction to remove neck and improve BET robustness.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "cropped_image": [".nii", ".nii.gz"],
      "transform_matrix": [".mat"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/fsl_anat"
  },
  "recon-all": {
    "cwlPath": "cwl/freesurfer/recon-all.cwl",
    "fullName": "FreeSurfer Complete Cortical Reconstruction Pipeline",
    "function": "Fully automated pipeline for cortical surface reconstruction and parcellation, including skull stripping, segmentation, surface tessellation, topology correction, inflation, registration, and parcellation.",
    "modality": "T1-weighted 3D NIfTI or DICOM. Optional T2w or FLAIR for pial surface refinement.",
    "keyParameters": "-s (subject ID), -i (input T1w), -T2 (T2w image for pial), -FLAIR (FLAIR for pial), -all (run full pipeline), -autorecon1/-autorecon2/-autorecon3 (run specific stages)",
    "keyPoints": "Runtime 6-24 hours per subject. Creates cortical surfaces (white, pial), parcellations (Desikan-Killiany, Destrieux), subcortical segmentation (aseg), and morphometric measures. Use -T2pial or -FLAIRpial for improved pial surface placement.",
    "typicalUse": "Complete cortical reconstruction for surface-based morphometry, parcellation-based analysis, and as prerequisite for fMRI surface analysis.",
    "inputExtensions": {
      "input_t1": [".mgz", ".mgh", ".nii", ".nii.gz"],
      "t2_image": [".mgz", ".mgh", ".nii", ".nii.gz"],
      "flair_image": [".mgz", ".mgh", ".nii", ".nii.gz"]
    },
    "outputExtensions": {},
    "docUrl": "https://surfer.nmr.mgh.harvard.edu/fswiki/recon-all"
  },
  "wb_command_cifti_create_dense_timeseries": {
    "cwlPath": "cwl/connectome_workbench/wb_command_cifti_create_dense_timeseries.cwl",
    "fullName": "Connectome Workbench CIFTI Dense Timeseries Creation",
    "function": "Creates a CIFTI dense timeseries file (.dtseries.nii) combining cortical surface data with subcortical volume data in a single grayordinates representation.",
    "modality": "Surface GIFTI files (left/right hemisphere) plus subcortical volume NIfTI, or volume-only input.",
    "keyParameters": "<cifti-out> -volume <volume> <label> -left-metric <metric> -right-metric <metric> -timestep <seconds> -timestart <seconds>",
    "keyPoints": "Core format for HCP-style analysis. Combines cortical surfaces and subcortical volumes. Standard grayordinate space is 91k (32k per hemisphere + subcortical).",
    "typicalUse": "Creating CIFTI format fMRI data for HCP-style surface-based analysis.",
    "inputExtensions": {
      "volume_data": [".nii", ".nii.gz"],
      "structure_label_volume": [".nii", ".nii.gz"],
      "left_metric": [".func.gii", ".shape.gii"],
      "roi_left": [".func.gii", ".shape.gii"],
      "right_metric": [".func.gii", ".shape.gii"],
      "roi_right": [".func.gii", ".shape.gii"],
      "cerebellum_metric": [".func.gii", ".shape.gii"]
    },
    "outputExtensions": {
      "cifti_output": [".dtseries.nii"]
    },
    "docUrl": "https://www.humanconnectome.org/software/workbench-command/-cifti-create-dense-timeseries"
  },
  "wb_command_cifti_separate": {
    "cwlPath": "cwl/connectome_workbench/wb_command_cifti_separate.cwl",
    "fullName": "Connectome Workbench CIFTI Separate",
    "function": "Extracts surface or volume components from a CIFTI file into separate GIFTI metric or NIfTI volume files.",
    "modality": "CIFTI dense file (.dscalar.nii, .dtseries.nii, etc.).",
    "keyParameters": "<cifti-in> <direction> -volume-all <volume-out> -metric <structure> <metric-out>",
    "keyPoints": "Opposite of cifti-create operations. Useful for extracting data for tools that do not support CIFTI format.",
    "typicalUse": "Extracting surface or volume data from CIFTI files for further processing.",
    "inputExtensions": {
      "cifti_in": [".dtseries.nii", ".dscalar.nii", ".dlabel.nii", ".dconn.nii"]
    },
    "outputExtensions": {
      "volume_output": [".nii", ".nii.gz"],
      "left_metric_output": [".func.gii"],
      "right_metric_output": [".func.gii"]
    },
    "docUrl": "https://www.humanconnectome.org/software/workbench-command/-cifti-separate"
  },
  "wb_command_cifti_smoothing": {
    "cwlPath": "cwl/connectome_workbench/wb_command_cifti_smoothing.cwl",
    "fullName": "Connectome Workbench CIFTI Smoothing",
    "function": "Applies geodesic Gaussian smoothing to CIFTI data on cortical surfaces and Euclidean smoothing in subcortical volumes.",
    "modality": "CIFTI dense file plus surface files for each hemisphere.",
    "keyParameters": "<cifti-in> <surface-kernel> <volume-kernel> <direction> <cifti-out> -left-surface <surface> -right-surface <surface> -fix-zeros-volume -fix-zeros-surface",
    "keyPoints": "Surface smoothing follows cortical geometry (geodesic). Typical kernel 4-6mm FWHM. -fix-zeros prevents smoothing across medial wall.",
    "typicalUse": "Spatial smoothing of fMRI data in CIFTI format for HCP-style pipelines.",
    "inputExtensions": {
      "cifti_in": [".dtseries.nii", ".dscalar.nii", ".dlabel.nii", ".dconn.nii"],
      "left_surface": [".surf.gii"],
      "right_surface": [".surf.gii"],
      "cerebellum_surface": [".surf.gii"],
      "cifti_roi": [".dscalar.nii", ".dlabel.nii", ".dtseries.nii", ".dconn.nii"]
    },
    "outputExtensions": {
      "smoothed_cifti": [".dtseries.nii", ".dscalar.nii"]
    },
    "docUrl": "https://www.humanconnectome.org/software/workbench-command/-cifti-smoothing"
  },
  "wb_command_metric_smoothing": {
    "cwlPath": "cwl/connectome_workbench/wb_command_metric_smoothing.cwl",
    "fullName": "Connectome Workbench Surface Metric Smoothing",
    "function": "Applies geodesic Gaussian smoothing to surface metric data following the cortical surface geometry.",
    "modality": "Surface GIFTI (.surf.gii) plus metric GIFTI (.func.gii or .shape.gii).",
    "keyParameters": "<surface> <metric-in> <smoothing-kernel> <metric-out> -roi <roi-metric> -fix-zeros",
    "keyPoints": "Smoothing follows cortical folding pattern rather than 3D Euclidean distance. ROI can restrict smoothing to specific regions.",
    "typicalUse": "Smoothing surface-based data (thickness, curvature, fMRI) for visualization or statistics.",
    "inputExtensions": {
      "surface": [".surf.gii"],
      "metric_in": [".func.gii", ".shape.gii"],
      "roi": [".func.gii", ".shape.gii"],
      "corrected_areas": [".func.gii", ".shape.gii"]
    },
    "outputExtensions": {
      "smoothed_metric": [".func.gii"]
    },
    "docUrl": "https://www.humanconnectome.org/software/workbench-command/-metric-smoothing"
  },
  "wb_command_surface_sphere_project_unproject": {
    "cwlPath": "cwl/connectome_workbench/wb_command_surface_sphere_project_unproject.cwl",
    "fullName": "Connectome Workbench Surface Registration Transform",
    "function": "Applies MSM or FreeSurfer spherical registration by projecting coordinates through registered sphere to target space.",
    "modality": "Surface GIFTI files (sphere-in, sphere-project-to, sphere-unproject-from).",
    "keyParameters": "<surface-in> <sphere-in> <sphere-project-to> <sphere-unproject-from> <surface-out>",
    "keyPoints": "Core operation for applying surface-based registration. Used to resample surfaces to different template spaces (fsaverage, fs_LR).",
    "typicalUse": "Applying surface registration transforms to resample data between atlas spaces.",
    "inputExtensions": {
      "sphere_in": [".surf.gii"],
      "sphere_project_to": [".surf.gii"],
      "sphere_unproject_from": [".surf.gii"]
    },
    "outputExtensions": {
      "output_sphere": [".surf.gii"]
    },
    "docUrl": "https://www.humanconnectome.org/software/workbench-command/-surface-sphere-project-unproject"
  },
  "amico_noddi": {
    "cwlPath": "cwl/amico/amico_noddi.cwl",
    "fullName": "AMICO NODDI Fitting",
    "function": "Fits the NODDI (Neurite Orientation Dispersion and Density Imaging) model to multi-shell diffusion MRI data using convex optimization for fast and robust estimation.",
    "modality": "Multi-shell diffusion MRI (4D NIfTI) with b-values and b-vectors, plus brain mask.",
    "keyParameters": 'Python: amico.core.setup(), amico.core.load_data(), amico.core.set_model("NODDI"), amico.core.fit()',
    "keyPoints": "Requires multi-shell acquisition (recommended: b=0,1000,2000 s/mm2). Outputs NDI (neurite density), ODI (orientation dispersion), and fISO (isotropic fraction). Much faster than original NODDI MATLAB toolbox.",
    "typicalUse": "Microstructural imaging for neurite density and orientation dispersion in white matter.",
    "inputExtensions": {
      "dwi": [".nii", ".nii.gz"],
      "bvals": [".bval"],
      "bvecs": [".bvec"],
      "mask": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "ndi_map": [".nii.gz"],
      "odi_map": [".nii.gz"],
      "fiso_map": [".nii.gz"]
    },
    "docUrl": "https://github.com/daducci/AMICO"
  },
  "fsl_regfilt": {
    "cwlPath": "cwl/fsl/fsl_regfilt.cwl",
    "fullName": "FSL Component Regression Filter (fsl_regfilt)",
    "function": "Removes nuisance components from 4D fMRI data by regressing out specified columns from a design or mixing matrix.",
    "modality": "4D fMRI NIfTI time series with associated ICA mixing matrix.",
    "keyParameters": "-i (input 4D), -d (design/mixing matrix), -o (output), -f (component indices to remove)",
    "keyPoints": "Typically used with MELODIC output. Removes ICA components classified as noise. Component indices are comma-separated or ranges.",
    "typicalUse": "Removing ICA-identified noise components from fMRI data, often used with FIX or manual classification.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz"],
      "design": [".txt", ".mat"]
    },
    "outputExtensions": {
      "output": [".nii", ".nii.gz"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/fsl_regfilt"
  },
  "fslchfiletype": {
    "cwlPath": "cwl/fsl/fslchfiletype.cwl",
    "fullName": "FSL Change File Type (fslchfiletype)",
    "function": "Converts neuroimaging files between NIfTI and ANALYZE file formats.",
    "modality": "Any NIfTI or ANALYZE image.",
    "keyParameters": "<filetype> (NIFTI_GZ, NIFTI, NIFTI_PAIR, ANALYZE), <input_file>, [output_file]",
    "keyPoints": "Supports NIFTI_GZ (.nii.gz), NIFTI (.nii), NIFTI_PAIR (.hdr/.img), and ANALYZE formats. Quick utility for format interoperability.",
    "typicalUse": "Converting between compressed and uncompressed NIfTI formats, or to legacy ANALYZE format.",
    "inputExtensions": {
      "input_file": [".nii", ".nii.gz", ".hdr", ".img"]
    },
    "outputExtensions": {
      "output": [".nii", ".nii.gz", ".hdr", ".img"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/Fslutils"
  },
  "fslhd": {
    "cwlPath": "cwl/fsl/fslhd.cwl",
    "fullName": "FSL Header Display (fslhd)",
    "function": "Displays NIfTI/ANALYZE image header information including dimensions, voxel sizes, data type, and orientation.",
    "modality": "Any NIfTI or ANALYZE image.",
    "keyParameters": "<input_file>, -x (XML output format)",
    "keyPoints": "Reports full header including sform/qform matrices, intent codes, and auxiliary info. XML output useful for programmatic parsing.",
    "typicalUse": "Inspecting image metadata for quality control and debugging preprocessing issues.",
    "inputExtensions": {
      "input_file": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "header_info": [".txt"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/Fslutils"
  },
  "fslinfo": {
    "cwlPath": "cwl/fsl/fslinfo.cwl",
    "fullName": "FSL Image Info (fslinfo)",
    "function": "Displays concise image dimension and voxel size information from a NIfTI header.",
    "modality": "Any NIfTI image.",
    "keyParameters": "<input_file>",
    "keyPoints": "Compact output showing data type, dimensions (dim1-dim4), voxel sizes (pixdim1-pixdim4), and time step. Simpler than fslhd.",
    "typicalUse": "Quick inspection of image dimensions and voxel sizes for pipeline verification.",
    "inputExtensions": {
      "input_file": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "info": [".txt"]
    },
    "docUrl": "https://fsl.fmrib.ox.ac.uk/fsl/fslwiki/Fslutils"
  },
  "3dDWItoDT": {
    "cwlPath": "cwl/afni/3dDWItoDT.cwl",
    "fullName": "AFNI Diffusion Tensor Fitting (3dDWItoDT)",
    "function": "Fits a diffusion tensor model to DWI data using linear or nonlinear methods, outputting tensor components, eigenvalues, and eigenvectors.",
    "modality": "4D diffusion-weighted dataset with gradient vector file.",
    "keyParameters": "-prefix (output prefix), -mask (brain mask), -eigs (output eigenvalues/eigenvectors), -nonlinear, -automask",
    "keyPoints": "Supports linear (default) and nonlinear fitting. Use -eigs for eigenvalue/eigenvector output required by 3dTrackID. Gradient file needs 3 columns per direction.",
    "typicalUse": "Computing diffusion tensor and derived scalar maps (FA, MD) from DWI data in AFNI workflows.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz", ".HEAD"],
      "gradient_file": [".1D", ".txt"]
    },
    "outputExtensions": {
      "tensor": [".HEAD", ".nii", ".nii.gz"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dDWItoDT.html"
  },
  "3dDWUncert": {
    "cwlPath": "cwl/afni/3dDWUncert.cwl",
    "fullName": "AFNI DWI Uncertainty Estimation (3dDWUncert)",
    "function": "Estimates uncertainty of diffusion tensor parameters via jackknife or bootstrap resampling of DWI data.",
    "modality": "4D diffusion-weighted dataset with gradient vector file.",
    "keyParameters": "-inset (input DWI), -prefix (output prefix), -grads (gradient file), -mask (brain mask), -iters (iterations, default 300)",
    "keyPoints": "Provides confidence intervals for FA and eigenvector directions. Output used as input for probabilistic tractography with 3dTrackID. Computationally intensive.",
    "typicalUse": "Generating uncertainty estimates for probabilistic tractography in AFNI diffusion pipelines.",
    "inputExtensions": {
      "inset": [".nii", ".nii.gz", ".HEAD"],
      "grads": [".1D", ".txt"],
      "mask": [".nii", ".nii.gz", ".HEAD"]
    },
    "outputExtensions": {
      "uncertainty": [".HEAD", ".nii", ".nii.gz"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dDWUncert.html"
  },
  "3dTrackID": {
    "cwlPath": "cwl/afni/3dTrackID.cwl",
    "fullName": "AFNI Tractography (3dTrackID)",
    "function": "Performs deterministic, mini-probabilistic, or full probabilistic white matter tractography using diffusion tensor data.",
    "modality": "DTI parameter volumes (from 3dDWItoDT with -eigs) and integer-labeled ROI mask.",
    "keyParameters": "-mode (DET/MINIP/PROB), -dti_in (DTI prefix), -netrois (ROI file), -prefix (output prefix), -mask (brain/WM mask)",
    "keyPoints": "Three tracking modes with different speed/accuracy tradeoffs. Outputs tract files, connectivity matrices, and statistics. Requires 3dDWItoDT output with -eigs flag.",
    "typicalUse": "White matter tractography and structural connectivity analysis in AFNI diffusion pipelines.",
    "inputExtensions": {
      "netrois": [".nii", ".nii.gz", ".HEAD"],
      "mask": [".nii", ".nii.gz", ".HEAD"]
    },
    "outputExtensions": {
      "tracts": [".trk", ".niml.tract"],
      "connectivity_matrix": [".grid"],
      "stats": [".stats"]
    },
    "docUrl": "https://afni.nimh.nih.gov/pub/dist/doc/program_help/3dTrackID.html"
  },
  "dcm2niix": {
    "cwlPath": "cwl/dcm2niix/dcm2niix.cwl",
    "fullName": "DICOM to NIfTI Converter (dcm2niix)",
    "function": "Converts DICOM medical images to NIfTI format with BIDS-compatible JSON sidecar files, preserving acquisition metadata.",
    "modality": "DICOM image directory from any MRI acquisition.",
    "keyParameters": "-o (output directory), -f (filename format), -z (compression: y/n/o/i), -b (BIDS sidecar: y/n/o)",
    "keyPoints": "Generates BIDS-compatible JSON sidecars. Handles multi-echo, diffusion (bval/bvec), and Philips/Siemens/GE formats. Default filename format is %f_%p_%t_%s.",
    "typicalUse": "First step in any neuroimaging pipeline: converting raw DICOM acquisitions to analysis-ready NIfTI.",
    "inputExtensions": {},
    "outputExtensions": {
      "nifti_files": [".nii", ".nii.gz"],
      "json_sidecars": [".json"],
      "bval_files": [".bval"],
      "bvec_files": [".bvec"]
    },
    "docUrl": "https://github.com/rordenlab/dcm2niix"
  },
  "ICA_AROMA": {
    "cwlPath": "cwl/ica_aroma/ICA_AROMA.cwl",
    "fullName": "ICA-based Automatic Removal of Motion Artifacts (ICA-AROMA)",
    "function": "Automatically identifies and removes motion-related ICA components from fMRI data using a classifier trained on temporal and spatial features.",
    "modality": "Preprocessed 4D fMRI NIfTI in standard (MNI) space with motion parameters.",
    "keyParameters": "-i (input 4D), -mc (motion parameters), -o (output directory), -a (affine matrix), -w (warp field), -den (denoising type)",
    "keyPoints": "Requires data in MNI space. Classifier uses four features: max RP correlation, edge fraction, HFC spatial fraction, and CSF fraction. Non-aggressive denoising recommended.",
    "typicalUse": "Removing motion artifacts from resting-state or task fMRI data after standard preprocessing.",
    "inputExtensions": {
      "input": [".nii", ".nii.gz"],
      "mc": [".txt", ".par", ".1D"],
      "affmat": [".mat"],
      "warp": [".nii", ".nii.gz"],
      "mask": [".nii", ".nii.gz"]
    },
    "outputExtensions": {
      "denoised_func": [".nii", ".nii.gz"],
      "classified_motion": [".txt"]
    },
    "docUrl": "https://github.com/maartenmennes/ICA-AROMA"
  }
};
var dummyNodes = {
  "I/O": [
    {
      "name": "Input",
      "fullName": "Workflow Input",
      "function": "Represents external input data entering the workflow",
      "typicalUse": "Connect to the first processing step to show where data comes from",
      "isDummy": true
    },
    {
      "name": "Output",
      "fullName": "Workflow Output",
      "function": "Represents the final output of the workflow",
      "typicalUse": "Connect from the last processing step to show where results go",
      "isDummy": true
    },
    {
      "name": "BIDS Input",
      "fullName": "BIDS Dataset Input",
      "function": "Loads a BIDS-formatted neuroimaging dataset and exposes selected data streams as output ports",
      "typicalUse": "Drag onto canvas, select your BIDS directory, choose subjects and modalities, then wire outputs to processing tools",
      "isDummy": true,
      "isBIDS": true
    }
  ]
};
var MODALITY_ASSIGNMENTS = {
  "Structural MRI": {
    FSL: {
      "Brain Extraction": ["bet"],
      "Tissue Segmentation": ["fast", "run_first_all"],
      "Registration": ["flirt", "fnirt"],
      "Pipelines": ["fsl_anat", "siena", "sienax"],
      "Lesion Segmentation": ["bianca"]
    },
    ANTs: {
      "Brain Extraction": ["antsBrainExtraction.sh"],
      "Segmentation": ["Atropos", "antsAtroposN4.sh"],
      "Registration": ["antsRegistration", "antsRegistrationSyN.sh", "antsRegistrationSyNQuick.sh"],
      "Cortical Thickness": ["antsCorticalThickness.sh", "KellyKapowski"]
    },
    FreeSurfer: {
      "Surface Reconstruction": ["recon-all", "mri_convert", "mri_watershed", "mri_normalize", "mri_segment", "mris_inflate", "mris_sphere"],
      "Parcellation": ["mri_aparc2aseg", "mri_annotation2label", "mris_ca_label", "mri_label2vol"],
      "Morphometry": ["mris_anatomical_stats", "mri_segstats", "aparcstats2table", "asegstats2table"]
    },
    AFNI: {
      "Brain Extraction": ["3dSkullStrip", "@SSwarper"],
      "Bias Correction": ["3dUnifize"],
      "Registration": ["3dAllineate", "3dQwarp", "@auto_tlrc"]
    },
    "Connectome Workbench": {
      "Surface Registration": ["wb_command_surface_sphere_project_unproject"]
    }
  },
  "Functional MRI": {
    FSL: {
      "Motion Correction": ["mcflirt"],
      "Slice Timing": ["slicetimer"],
      "Distortion Correction": ["fugue", "topup", "applytopup", "fsl_prepare_fieldmap", "prelude"],
      "Smoothing": ["susan"],
      "Statistical Analysis": ["film_gls", "flameo", "randomise"],
      "ICA/Denoising": ["melodic", "dual_regression", "fsl_regfilt"],
      "Pipelines": ["feat"]
    },
    AFNI: {
      "Motion Correction": ["3dvolreg"],
      "Slice Timing": ["3dTshift"],
      "Denoising": ["3dDespike", "3dBandpass"],
      "Smoothing": ["3dBlurToFWHM", "3dmerge"],
      "Masking": ["3dAutomask"],
      "Registration": ["align_epi_anat"],
      "Statistical Analysis": ["3dDeconvolve", "3dREMLfit", "3dMEMA", "3dANOVA", "3dANOVA2", "3dANOVA3", "3dttest++", "3dMVM", "3dLME", "3dLMEr"],
      "Multiple Comparisons": ["3dClustSim", "3dFWHMx"],
      "Connectivity": ["3dNetCorr", "3dTcorr1D", "3dTcorrMap", "3dRSFC"],
      "ROI Analysis": ["3dROIstats", "3dmaskave"]
    },
    FreeSurfer: {
      "Functional Analysis": ["bbregister", "mri_vol2surf", "mri_surf2vol", "mris_preproc", "mri_glmfit"]
    },
    ANTs: {
      "Motion Correction": ["antsMotionCorr"]
    },
    fMRIPrep: {
      "Pipeline": ["fmriprep"]
    },
    MRIQC: {
      "Pipeline": ["mriqc"]
    },
    "ICA-AROMA": {
      "Denoising": ["ICA_AROMA"]
    },
    "Connectome Workbench": {
      "CIFTI Operations": ["wb_command_cifti_create_dense_timeseries", "wb_command_cifti_separate"],
      "Surface Smoothing": ["wb_command_cifti_smoothing", "wb_command_metric_smoothing"]
    }
  },
  "Diffusion MRI": {
    FSL: {
      "Preprocessing": ["eddy", "topup"],
      "Tensor Fitting": ["dtifit"],
      "Tractography": ["bedpostx", "probtrackx2"],
      "TBSS": ["tbss_1_preproc", "tbss_2_reg", "tbss_3_postreg", "tbss_4_prestats", "tbss_non_FA"]
    },
    MRtrix3: {
      "Preprocessing": ["dwidenoise", "mrdegibbs"],
      "Tensor/FOD": ["dwi2tensor", "tensor2metric", "dwi2fod"],
      "Tractography": ["tckgen", "tcksift", "tck2connectome"]
    },
    FreeSurfer: {
      "Diffusion": ["dmri_postreg"]
    },
    AMICO: {
      "Microstructure Modeling": ["amico_noddi"]
    },
    AFNI: {
      "Tensor Fitting": ["3dDWItoDT"],
      "Uncertainty": ["3dDWUncert"],
      "Tractography": ["3dTrackID"]
    }
  },
  "Arterial Spin Labeling": {
    FSL: {
      "ASL Processing": ["oxford_asl", "basil", "asl_calib"]
    }
  },
  "PET": {
    FreeSurfer: {
      "PET Processing": ["mri_gtmpvc"]
    }
  },
  "Multimodal": {
    ANTs: {
      "Intermodal Registration": ["antsIntermodalityIntrasubject.sh"]
    }
  },
  "Utilities": {
    FSL: {
      "Image Math": ["fslmaths", "fslstats", "fslroi", "fslmeants"],
      "Volume Operations": ["fslsplit", "fslmerge", "fslreorient2std", "robustfov", "fslchfiletype"],
      "Warp Utilities": ["applywarp", "invwarp", "convertwarp"],
      "Clustering": ["cluster"],
      "Image Info": ["fslhd", "fslinfo"]
    },
    AFNI: {
      "Image Math": ["3dcalc", "3dTstat"],
      "Dataset Operations": ["3dinfo", "3dcopy", "3dZeropad", "3dTcat"],
      "ROI Utilities": ["3dUndump", "whereami", "3dresample", "3dfractionize"],
      "Warp Utilities": ["3dNwarpApply", "3dNwarpCat"]
    },
    ANTs: {
      "Preprocessing Utilities": ["N4BiasFieldCorrection", "DenoiseImage"],
      "Image Operations": ["ImageMath", "ThresholdImage"],
      "Label Analysis": ["LabelGeometryMeasures", "antsJointLabelFusion.sh"],
      "Transform Utilities": ["antsApplyTransforms"]
    },
    FreeSurfer: {
      "Format Conversion": ["mri_convert"]
    },
    dcm2niix: {
      "Format Conversion": ["dcm2niix"]
    }
  }
};
var annotationByName = new Map(
  Object.entries(TOOL_ANNOTATIONS).map(([name, ann]) => [name, ann])
);
for (const category of Object.values(dummyNodes)) {
  for (const tool of category) {
    annotationByName.set(tool.name, tool);
  }
}
function buildToolsByModality(assignments) {
  const result = {};
  for (const [modality, libraries] of Object.entries(assignments)) {
    result[modality] = {};
    for (const [library, categories] of Object.entries(libraries)) {
      result[modality][library] = {};
      for (const [category, toolNames] of Object.entries(categories)) {
        result[modality][library][category] = toolNames.map((name) => {
          const ann = annotationByName.get(name);
          return ann ? { name, ...ann } : null;
        }).filter(Boolean);
      }
    }
  }
  return result;
}
var toolsByModality = buildToolsByModality(MODALITY_ASSIGNMENTS);
if (typeof process === "undefined" || process.env?.NODE_ENV !== "production") {
  const modalityToolNames = /* @__PURE__ */ new Set();
  for (const libraries of Object.values(MODALITY_ASSIGNMENTS)) {
    for (const categories of Object.values(libraries)) {
      for (const toolNames of Object.values(categories)) {
        toolNames.forEach((name) => modalityToolNames.add(name));
      }
    }
  }
  for (const [name, ann] of annotationByName.entries()) {
    if (ann.isDummy) continue;
    if (!modalityToolNames.has(name)) {
      console.warn(`[toolAnnotations] Tool "${name}" has annotations but is not assigned to any modality`);
    }
  }
}

// src/utils/cwlParser.js
var resolvedCache = /* @__PURE__ */ new Map();
function getToolDefinitionSync(cwlPath) {
  return resolvedCache.get(cwlPath) || null;
}
function parseCWLDocument(doc, cwlPath) {
  const inputs = {};
  const outputs = {};
  if (doc.inputs) {
    const inputEntries = Array.isArray(doc.inputs) ? doc.inputs.map((inp) => [inp.id, inp]) : Object.entries(doc.inputs);
    for (const [name, def] of inputEntries) {
      inputs[name] = parseInput(name, def);
    }
  }
  if (doc.outputs) {
    const outputEntries = Array.isArray(doc.outputs) ? doc.outputs.map((out) => [out.id, out]) : Object.entries(doc.outputs);
    for (const [name, def] of outputEntries) {
      outputs[name] = parseOutput(name, def);
    }
  }
  const dockerImage = extractDockerImage(doc);
  return {
    inputs,
    outputs,
    dockerImage,
    baseCommand: doc.baseCommand || null
  };
}
function _injectParsedForTest(cwlPath, parsed) {
  resolvedCache.set(cwlPath, parsed);
}
function parseInput(name, def) {
  const typeInfo = normalizeType(def.type);
  const flag = extractFlag(def);
  const label = def.label || name;
  const hasDefault = def.default !== void 0;
  return {
    name,
    label,
    flag,
    hasDefault,
    defaultValue: hasDefault ? def.default : void 0,
    ...typeInfo,
    // Convenience booleans for the modal
    isScalarEditable: isScalarType(typeInfo)
  };
}
function parseOutput(name, def) {
  const typeInfo = normalizeType(def.type);
  const glob = extractGlob(def);
  const label = def.label || name;
  return {
    name,
    label,
    glob,
    ...typeInfo
  };
}
function normalizeType(cwlType) {
  const result = {
    baseType: "unknown",
    nullable: false,
    isArray: false,
    isEnum: false,
    enumSymbols: [],
    isRecord: false,
    recordVariants: [],
    arrayItemType: null
  };
  if (cwlType == null) {
    result.baseType = "Any";
    result.nullable = true;
    return result;
  }
  if (typeof cwlType === "string") {
    return parseStringType(cwlType, result);
  }
  if (Array.isArray(cwlType)) {
    return parseArrayNotation(cwlType, result);
  }
  if (typeof cwlType === "object") {
    return parseObjectType(cwlType, result);
  }
  return result;
}
function parseStringType(typeStr, result) {
  if (typeStr.endsWith("?")) {
    const inner = typeStr.slice(0, -1);
    result.nullable = true;
    if (inner.endsWith("[]")) {
      result.isArray = true;
      result.arrayItemType = inner.slice(0, -2);
      result.baseType = result.arrayItemType;
    } else {
      result.baseType = inner;
    }
    return result;
  }
  if (typeStr.endsWith("[]")) {
    result.isArray = true;
    result.arrayItemType = typeStr.slice(0, -2);
    result.baseType = result.arrayItemType;
    return result;
  }
  if (typeStr === "null") {
    result.baseType = "null";
    result.nullable = true;
    return result;
  }
  result.baseType = typeStr;
  return result;
}
function parseArrayNotation(typeArr, result) {
  const hasNull = typeArr.includes("null");
  result.nullable = hasNull;
  const nonNull = typeArr.filter((t) => t !== "null");
  if (nonNull.length === 0) {
    result.baseType = "null";
    result.nullable = true;
    return result;
  }
  const records = nonNull.filter((t) => typeof t === "object" && t !== null && t.type === "record");
  if (records.length > 0) {
    result.baseType = "record";
    result.isRecord = true;
    result.recordVariants = records;
    return result;
  }
  if (nonNull.length === 1) {
    const inner = nonNull[0];
    if (typeof inner === "string") {
      const innerResult = parseStringType(inner, result);
      innerResult.nullable = hasNull;
      return innerResult;
    }
    if (typeof inner === "object") {
      const innerResult = parseObjectType(inner, result);
      innerResult.nullable = hasNull;
      return innerResult;
    }
  }
  result.baseType = "Any";
  return result;
}
function parseObjectType(typeObj, result) {
  if (!typeObj || typeof typeObj !== "object") return result;
  if (typeObj.type === "enum") {
    result.baseType = "enum";
    result.isEnum = true;
    result.enumSymbols = typeObj.symbols || [];
    return result;
  }
  if (typeObj.type === "array") {
    result.isArray = true;
    const items = typeObj.items;
    if (typeof items === "string") {
      result.baseType = items;
      result.arrayItemType = items;
    } else {
      result.baseType = "Any";
      result.arrayItemType = "Any";
    }
    return result;
  }
  if (typeObj.type === "record") {
    result.baseType = "record";
    result.isRecord = true;
    result.recordVariants = [typeObj];
    return result;
  }
  result.baseType = "Any";
  return result;
}
function isScalarType(typeInfo) {
  if (typeInfo.isArray || typeInfo.isRecord) return false;
  const scalars = ["string", "int", "double", "float", "long", "boolean", "enum"];
  return scalars.includes(typeInfo.baseType);
}
function extractFlag(def) {
  if (!def.inputBinding) return null;
  return def.inputBinding.prefix || null;
}
function extractGlob(def) {
  if (!def.outputBinding || !def.outputBinding.glob) return [];
  const g = def.outputBinding.glob;
  return Array.isArray(g) ? g : [g];
}
function extractDockerImage(doc) {
  const stripTag = (pull) => {
    if (!pull) return null;
    const idx = pull.lastIndexOf(":");
    return idx > 0 ? pull.substring(0, idx) : pull;
  };
  const hints = doc.hints || {};
  const reqs = doc.requirements || {};
  const dockerReq = reqs.DockerRequirement || hints.DockerRequirement;
  if (dockerReq) return stripTag(dockerReq.dockerPull);
  if (Array.isArray(doc.requirements)) {
    const r = doc.requirements.find((r2) => r2.class === "DockerRequirement");
    if (r) return stripTag(r.dockerPull);
  }
  if (Array.isArray(doc.hints)) {
    const h = doc.hints.find((h2) => h2.class === "DockerRequirement");
    if (h) return stripTag(h.dockerPull);
  }
  return null;
}

// src/utils/toolRegistry.js
var mergedCache = /* @__PURE__ */ new Map();
function getToolConfigSync(toolName) {
  if (mergedCache.has(toolName)) return mergedCache.get(toolName);
  const annotation = TOOL_ANNOTATIONS[toolName];
  if (!annotation) return null;
  const cwlPath = annotation.cwlPath;
  const parsed = cwlPath ? getToolDefinitionSync(cwlPath) : null;
  const merged = parsed ? mergeToolData(toolName, parsed, annotation) : annotationOnlyFallback(toolName, annotation);
  mergedCache.set(toolName, merged);
  return merged;
}
function invalidateMergeCache() {
  mergedCache.clear();
}
function mergeToolData(toolName, parsed, annotation) {
  const requiredInputs = {};
  const optionalInputs = {};
  for (const [inputName, inputDef] of Object.entries(parsed.inputs)) {
    const acceptedExt = annotation.inputExtensions?.[inputName] || null;
    const inputBounds = annotation.bounds?.[inputName] || null;
    const enumHint = annotation.enumHints?.[inputName] || null;
    const type2 = mapBaseType(inputDef);
    const enriched = {
      type: type2,
      label: inputDef.label,
      flag: inputDef.flag || null,
      hasDefault: inputDef.hasDefault || false,
      defaultValue: inputDef.defaultValue
    };
    if (acceptedExt && acceptedExt.length > 0) enriched.acceptedExtensions = acceptedExt;
    if (inputBounds) enriched.bounds = inputBounds;
    if (inputDef.isEnum && inputDef.enumSymbols.length > 0) {
      enriched.options = inputDef.enumSymbols;
      enriched.enumSymbols = inputDef.enumSymbols;
    } else if (enumHint) {
      enriched.options = enumHint;
    }
    if (inputDef.nullable) {
      optionalInputs[inputName] = enriched;
    } else {
      requiredInputs[inputName] = enriched;
    }
  }
  const outputs = {};
  for (const [outputName, outputDef] of Object.entries(parsed.outputs)) {
    const type2 = mapOutputType(outputDef);
    outputs[outputName] = {
      type: type2,
      label: outputDef.label,
      glob: outputDef.glob
    };
    if (annotation.requires?.[outputName]) {
      outputs[outputName].requires = annotation.requires[outputName];
    }
    const outputExt = annotation.outputExtensions?.[outputName] || null;
    if (outputExt && outputExt.length > 0) {
      outputs[outputName].extensions = outputExt;
    }
  }
  return {
    id: toolName,
    cwlPath: annotation.cwlPath,
    dockerImage: parsed.dockerImage || null,
    requiredInputs,
    optionalInputs,
    outputs,
    // UI metadata
    fullName: annotation.fullName,
    function: annotation.function,
    modality: annotation.modality,
    keyParameters: annotation.keyParameters,
    keyPoints: annotation.keyPoints,
    typicalUse: annotation.typicalUse,
    docUrl: annotation.docUrl
  };
}
function annotationOnlyFallback(toolName, annotation) {
  console.warn(`[toolRegistry] CWL not loaded for "${toolName}" \u2014 using annotation-only fallback with empty inputs/outputs.`);
  return {
    id: toolName,
    cwlPath: annotation.cwlPath,
    dockerImage: null,
    requiredInputs: {},
    optionalInputs: {},
    outputs: {},
    fullName: annotation.fullName,
    function: annotation.function,
    modality: annotation.modality,
    keyParameters: annotation.keyParameters,
    keyPoints: annotation.keyPoints,
    typicalUse: annotation.typicalUse,
    docUrl: annotation.docUrl
  };
}
function mapBaseType(inputDef) {
  if (inputDef.isRecord) return "record";
  if (inputDef.isEnum) return "enum";
  if (inputDef.isArray) return `${inputDef.arrayItemType || inputDef.baseType}[]`;
  return inputDef.baseType;
}
function mapOutputType(outputDef) {
  let type2 = outputDef.baseType;
  if (outputDef.isArray) type2 = `${outputDef.arrayItemType || type2}[]`;
  if (outputDef.nullable) type2 = `${type2}?`;
  return type2;
}

// src/utils/scatterPropagation.js
function computeScatteredNodes(nodes, edges, arrayTypedInputs = /* @__PURE__ */ new Map()) {
  const targetIds = new Set(edges.map((e) => e.target));
  const sourceNodeIds = new Set(
    nodes.filter((n) => !targetIds.has(n.id)).map((n) => n.id)
  );
  const outgoing = /* @__PURE__ */ new Map();
  for (const node of nodes) outgoing.set(node.id, []);
  for (const edge of edges) outgoing.get(edge.source)?.push(edge);
  const scatteredNodeIds = /* @__PURE__ */ new Set();
  for (const node of nodes) {
    if ((node.data?.scatterInputs?.length || 0) > 0) {
      scatteredNodeIds.add(node.id);
    }
  }
  for (const node of nodes) {
    if (scatteredNodeIds.has(node.id)) continue;
    const isSource = sourceNodeIds.has(node.id);
    const hasLegacyScatter = node.data?.scatterInputs === void 0 && node.data?.scatterEnabled;
    const hasInternalScatter = node.data?.isCustomWorkflow && node.data?.internalNodes?.some((n) => n.scatterEnabled || (n.scatterInputs?.length || 0) > 0);
    if (hasLegacyScatter && isSource || hasInternalScatter) {
      scatteredNodeIds.add(node.id);
    }
  }
  const gatherNodeIds = /* @__PURE__ */ new Set();
  const targetEdgeInfo = /* @__PURE__ */ new Map();
  const queue = [...scatteredNodeIds];
  let head = 0;
  while (head < queue.length) {
    const nodeId = queue[head++];
    for (const edge of outgoing.get(nodeId) || []) {
      const targetId = edge.target;
      if (scatteredNodeIds.has(targetId)) continue;
      const mappings = edge.data?.mappings || [];
      const targetArrayInputs = arrayTypedInputs.get(targetId) || /* @__PURE__ */ new Set();
      const isGatherEdge = mappings.length > 0 && mappings.every((m) => targetArrayInputs.has(m.targetInput));
      if (!targetEdgeInfo.has(targetId)) {
        targetEdgeInfo.set(targetId, { hasGatherEdge: false, hasScatterEdge: false });
      }
      const info = targetEdgeInfo.get(targetId);
      if (isGatherEdge) {
        info.hasGatherEdge = true;
      } else {
        info.hasScatterEdge = true;
      }
    }
    for (const [targetId, info] of targetEdgeInfo) {
      if (scatteredNodeIds.has(targetId) || gatherNodeIds.has(targetId)) continue;
      if (info.hasScatterEdge) {
        scatteredNodeIds.add(targetId);
        queue.push(targetId);
        targetEdgeInfo.delete(targetId);
      }
    }
  }
  for (const [targetId, info] of targetEdgeInfo) {
    if (!scatteredNodeIds.has(targetId) && info.hasGatherEdge) {
      gatherNodeIds.add(targetId);
    }
  }
  const scatteredUpstreamInputs = /* @__PURE__ */ new Map();
  for (const edge of edges) {
    if (!scatteredNodeIds.has(edge.source)) continue;
    const mappings = edge.data?.mappings || [];
    if (mappings.length === 0) continue;
    const targetArrayInputs = arrayTypedInputs.get(edge.target) || /* @__PURE__ */ new Set();
    if (!scatteredUpstreamInputs.has(edge.target)) {
      scatteredUpstreamInputs.set(edge.target, /* @__PURE__ */ new Set());
    }
    const targetInputs = scatteredUpstreamInputs.get(edge.target);
    for (const m of mappings) {
      if (!targetArrayInputs.has(m.targetInput)) {
        targetInputs.add(m.targetInput);
      }
    }
  }
  return { scatteredNodeIds, sourceNodeIds, scatteredUpstreamInputs, gatherNodeIds };
}

// src/utils/topoSort.js
function topoSort(nodes, edges) {
  const incoming = Object.fromEntries(nodes.map((n) => [n.id, 0]));
  const outgoing = new Map(nodes.map((n) => [n.id, []]));
  for (const e of edges) {
    if (incoming[e.target] !== void 0) incoming[e.target]++;
    outgoing.get(e.source)?.push(e.target);
  }
  const queue = nodes.filter((n) => incoming[n.id] === 0).map((n) => n.id);
  const order = [];
  let head = 0;
  while (head < queue.length) {
    const id = queue[head++];
    order.push(id);
    for (const t of outgoing.get(id) || []) {
      if (--incoming[t] === 0) queue.push(t);
    }
  }
  if (order.length !== nodes.length) {
    throw new Error("Workflow graph has cycles.");
  }
  return order;
}

// src/hooks/buildWorkflow.js
function expandCustomWorkflowNodes(graph) {
  const { nodes, edges } = graph;
  const customNodes = nodes.filter((n) => n.data?.isCustomWorkflow);
  if (customNodes.length === 0) return graph;
  const customNodeIds = new Set(customNodes.map((n) => n.id));
  const expandedNodes = [];
  const expandedEdges = [];
  for (const customNode of customNodes) {
    const { internalNodes = [], internalEdges = [] } = customNode.data;
    for (const iNode of internalNodes) {
      expandedNodes.push({
        id: `${customNode.id}__${iNode.id}`,
        type: "default",
        data: {
          label: iNode.label,
          isDummy: iNode.isDummy || false,
          parameters: iNode.parameters || {},
          dockerVersion: iNode.dockerVersion || "latest",
          scatterEnabled: iNode.scatterEnabled || false,
          scatterInputs: iNode.scatterInputs,
          linkMergeOverrides: iNode.linkMergeOverrides || {},
          whenExpression: iNode.whenExpression || "",
          expressions: iNode.expressions || {}
        },
        position: iNode.position || { x: 0, y: 0 }
      });
    }
    for (const iEdge of internalEdges) {
      expandedEdges.push({
        id: `${customNode.id}__${iEdge.id}`,
        source: `${customNode.id}__${iEdge.source}`,
        target: `${customNode.id}__${iEdge.target}`,
        data: iEdge.data ? structuredClone(iEdge.data) : {}
      });
    }
  }
  const regularNodes = nodes.filter((n) => !customNodeIds.has(n.id));
  const rewrittenEdges = [];
  for (const edge of edges) {
    const srcIsCustom = customNodeIds.has(edge.source);
    const tgtIsCustom = customNodeIds.has(edge.target);
    if (!srcIsCustom && !tgtIsCustom) {
      rewrittenEdges.push(edge);
      continue;
    }
    const mappings = edge.data?.mappings || [];
    const edgeGroups = /* @__PURE__ */ new Map();
    for (const m of mappings) {
      let newSource = edge.source;
      let newSourceOutput = m.sourceOutput;
      let newTarget = edge.target;
      let newTargetInput = m.targetInput;
      if (srcIsCustom) {
        const slashIdx = m.sourceOutput.indexOf("/");
        if (slashIdx > -1) {
          const internalNodeId = m.sourceOutput.substring(0, slashIdx);
          newSourceOutput = m.sourceOutput.substring(slashIdx + 1);
          newSource = `${edge.source}__${internalNodeId}`;
        }
      }
      if (tgtIsCustom) {
        const slashIdx = m.targetInput.indexOf("/");
        if (slashIdx > -1) {
          const internalNodeId = m.targetInput.substring(0, slashIdx);
          newTargetInput = m.targetInput.substring(slashIdx + 1);
          newTarget = `${edge.target}__${internalNodeId}`;
        }
      }
      const key = `${newSource}::${newTarget}`;
      if (!edgeGroups.has(key)) {
        edgeGroups.set(key, { source: newSource, target: newTarget, mappings: [] });
      }
      edgeGroups.get(key).mappings.push({
        sourceOutput: newSourceOutput,
        targetInput: newTargetInput
      });
    }
    for (const [key, group] of edgeGroups) {
      rewrittenEdges.push({
        id: `${edge.id}__${key}`,
        source: group.source,
        target: group.target,
        data: { mappings: group.mappings }
      });
    }
  }
  return {
    nodes: [...regularNodes, ...expandedNodes],
    edges: [...rewrittenEdges, ...expandedEdges]
  };
}
function toCWLType(typeStr, makeNullable = false, enumSymbols = null) {
  if (!typeStr) return makeNullable ? ["null", "File"] : "File";
  if (typeStr === "record") return null;
  if (typeStr === "enum" && enumSymbols) {
    const enumType = { type: "enum", symbols: enumSymbols };
    return makeNullable ? ["null", enumType] : enumType;
  }
  if (typeStr.endsWith("[]")) {
    const itemType = typeStr.slice(0, -2);
    const arrayType = { type: "array", items: itemType };
    return makeNullable ? ["null", arrayType] : arrayType;
  }
  if (typeStr.endsWith("?")) {
    return ["null", typeStr.slice(0, -1)];
  }
  return makeNullable ? ["null", typeStr] : typeStr;
}
function toArrayType(typeStr) {
  const base = (typeStr || "File").replace(/\?$/, "").replace(/\[\]$/, "");
  return { type: "array", items: base };
}
function isSerializable(val) {
  if (val === null || val === void 0) return false;
  const t = typeof val;
  if (t === "string" || t === "number" || t === "boolean") return true;
  if (t === "function") return false;
  if (Array.isArray(val)) return val.every(isSerializable);
  if (t === "object") return Object.values(val).every(isSerializable);
  return false;
}
function getUserParams(nodeData) {
  const p = nodeData.parameters;
  if (p && typeof p === "object" && !Array.isArray(p)) return p;
  return null;
}
function defaultForType(type2, inputDef) {
  if (inputDef?.hasDefault) return inputDef.defaultValue;
  switch (type2) {
    case "boolean":
      return false;
    case "int":
      return inputDef?.bounds ? inputDef.bounds[0] : 0;
    case "double":
      return inputDef?.bounds ? inputDef.bounds[0] : 0;
    case "string":
      return "";
    case "enum":
      return inputDef?.enumSymbols?.[0] || null;
    default:
      return null;
  }
}
function makeWfInputName(stepId, inputName, isSingleNode) {
  return isSingleNode ? inputName : `${stepId}_${inputName}`;
}
function getEffectiveScatterInputs(ctx, nodeId, effectiveTool, incomingEdges) {
  const node = ctx.nodeMap.get(nodeId);
  const explicitScatter = node?.data?.scatterInputs;
  if (Array.isArray(explicitScatter)) {
    const allInputNames = /* @__PURE__ */ new Set([
      ...Object.keys(effectiveTool.requiredInputs || {}),
      ...Object.keys(effectiveTool.optionalInputs || {})
    ]);
    return new Set(explicitScatter.filter((name) => allInputNames.has(name)));
  }
  if (!ctx.scatteredSteps.has(nodeId)) return /* @__PURE__ */ new Set();
  const inputs = [];
  if (ctx.sourceNodeIds.has(nodeId)) {
    Object.entries(effectiveTool.requiredInputs).forEach(([inputName, inputDef]) => {
      const isWired = (ctx.wiredInputsMap.get(nodeId)?.get(inputName)?.length || 0) > 0;
      if (!isWired) inputs.push(inputName);
    });
  } else {
    const nodeArrayInputs = ctx.arrayTypedInputs?.get(nodeId) || /* @__PURE__ */ new Set();
    (incomingEdges || []).forEach((edge) => {
      if (!ctx.scatteredSteps.has(edge.source)) return;
      (edge.data?.mappings || []).forEach((m) => {
        if (!inputs.includes(m.targetInput) && !nodeArrayInputs.has(m.targetInput)) {
          inputs.push(m.targetInput);
        }
      });
    });
    ctx.bidsEdges.filter((e) => e.target === nodeId).forEach((edge) => {
      (edge.data?.mappings || []).forEach((m) => {
        if (!inputs.includes(m.targetInput) && !nodeArrayInputs.has(m.targetInput)) {
          inputs.push(m.targetInput);
        }
      });
    });
  }
  return new Set(inputs);
}
function buildStepInputBindings(ctx, step, node, effectiveTool, stepId, isSingleNode) {
  const nodeId = node.id;
  const expressions = node.data.expressions || {};
  Object.entries(effectiveTool.requiredInputs).forEach(([inputName, inputDef]) => {
    const { type: type2 } = inputDef;
    const expr = expressions[inputName];
    const wiredSources = ctx.wiredInputsMap.get(nodeId)?.get(inputName) || [];
    if (expr) {
      ctx.needsStepInputExpression = true;
      ctx.needsInlineJavascript = true;
      if (wiredSources.length === 0) {
        const wfInputName = makeWfInputName(stepId, inputName, isSingleNode);
        ctx.wf.inputs[wfInputName] = { type: toCWLType(type2, false, inputDef.enumSymbols) };
        step.in[inputName] = { source: wfInputName, valueFrom: expr };
      } else if (wiredSources.length === 1) {
        step.in[inputName] = {
          source: ctx.resolveWiredSource(wiredSources[0]),
          valueFrom: expr
        };
      } else {
        const linkMerge = node.data.linkMergeOverrides?.[inputName] || "merge_flattened";
        step.in[inputName] = {
          source: wiredSources.map((ws) => ctx.resolveWiredSource(ws)),
          linkMerge,
          valueFrom: expr
        };
        ctx.needsMultipleInputFeature = true;
      }
    } else if (wiredSources.length === 1) {
      step.in[inputName] = ctx.resolveWiredSource(wiredSources[0]);
    } else if (wiredSources.length > 1) {
      const linkMerge = node.data.linkMergeOverrides?.[inputName] || "merge_flattened";
      step.in[inputName] = {
        source: wiredSources.map((ws) => ctx.resolveWiredSource(ws)),
        linkMerge
      };
      ctx.needsMultipleInputFeature = true;
    } else {
      const wfInputName = makeWfInputName(stepId, inputName, isSingleNode);
      const effectiveScatter = ctx.effectiveScatterMap.get(nodeId) || /* @__PURE__ */ new Set();
      const inputType = effectiveScatter.has(inputName) ? toArrayType(type2) : toCWLType(type2, false, inputDef.enumSymbols) || "string";
      ctx.wf.inputs[wfInputName] = { type: inputType };
      step.in[inputName] = wfInputName;
      if (type2 !== "File" && type2 !== "Directory") {
        const params = getUserParams(node.data);
        const userValue = params?.[inputName];
        if (userValue !== void 0 && userValue !== null && userValue !== "" && isSerializable(userValue)) {
          ctx.jobDefaults[wfInputName] = userValue;
        }
      }
    }
  });
  if (!effectiveTool.optionalInputs) return;
  Object.entries(effectiveTool.optionalInputs).forEach(([inputName, inputDef]) => {
    const { type: type2 } = inputDef;
    const optExpr = expressions[inputName];
    if (optExpr) {
      ctx.needsStepInputExpression = true;
      ctx.needsInlineJavascript = true;
      const wiredSources2 = ctx.wiredInputsMap.get(nodeId)?.get(inputName) || [];
      if (wiredSources2.length === 1) {
        step.in[inputName] = {
          source: ctx.resolveWiredSource(wiredSources2[0]),
          valueFrom: optExpr
        };
      } else if (wiredSources2.length > 1) {
        const linkMerge = node.data.linkMergeOverrides?.[inputName] || "merge_flattened";
        step.in[inputName] = {
          source: wiredSources2.map((ws) => ctx.resolveWiredSource(ws)),
          linkMerge,
          valueFrom: optExpr
        };
        ctx.needsMultipleInputFeature = true;
      } else {
        const wfInputName = makeWfInputName(stepId, inputName, isSingleNode);
        const effectiveScatter = ctx.effectiveScatterMap.get(nodeId) || /* @__PURE__ */ new Set();
        const inputType = effectiveScatter.has(inputName) ? ["null", toArrayType(type2)] : toCWLType(type2, true, inputDef.enumSymbols);
        ctx.wf.inputs[wfInputName] = { type: inputType };
        step.in[inputName] = { source: wfInputName, valueFrom: optExpr };
      }
      return;
    }
    if (type2 === "record") {
      const wfInputName = makeWfInputName(stepId, inputName, isSingleNode);
      const recordEntry = { type: ["null", "Any"] };
      const params = getUserParams(node.data);
      const recordValue = params?.[inputName];
      if (recordValue !== void 0 && recordValue !== null && recordValue !== "" && isSerializable(recordValue)) {
        recordEntry.default = recordValue;
      }
      ctx.wf.inputs[wfInputName] = recordEntry;
      step.in[inputName] = wfInputName;
      return;
    }
    const wiredSources = ctx.wiredInputsMap.get(nodeId)?.get(inputName) || [];
    if (wiredSources.length === 1) {
      step.in[inputName] = ctx.resolveWiredSource(wiredSources[0]);
    } else if (wiredSources.length > 1) {
      const linkMerge = node.data.linkMergeOverrides?.[inputName] || "merge_flattened";
      step.in[inputName] = {
        source: wiredSources.map((ws) => ctx.resolveWiredSource(ws)),
        linkMerge
      };
      ctx.needsMultipleInputFeature = true;
    } else {
      const wfInputName = makeWfInputName(stepId, inputName, isSingleNode);
      const effectiveScatter = ctx.effectiveScatterMap.get(nodeId) || /* @__PURE__ */ new Set();
      const inputType = effectiveScatter.has(inputName) ? ["null", toArrayType(type2)] : toCWLType(type2, true, inputDef.enumSymbols);
      const inputEntry = { type: inputType };
      const params = getUserParams(node.data);
      const userValue = params?.[inputName];
      let value;
      if (userValue !== void 0 && userValue !== null && userValue !== "" && isSerializable(userValue)) {
        value = userValue;
      } else {
        value = defaultForType(type2, inputDef);
        if (inputDef?.hasDefault) ctx.cwlDefaultKeys.add(wfInputName);
      }
      if (value !== null && value !== void 0) {
        ctx.jobDefaults[wfInputName] = value;
      }
      ctx.wf.inputs[wfInputName] = inputEntry;
      step.in[inputName] = wfInputName;
    }
  });
}
function computeStepScatter(ctx, nodeId) {
  const scatterInputs = [...ctx.effectiveScatterMap.get(nodeId) || []];
  if (scatterInputs.length === 0) return null;
  const result = {
    scatter: scatterInputs.length === 1 ? scatterInputs[0] : scatterInputs
  };
  if (scatterInputs.length > 1) {
    result.scatterMethod = "dotproduct";
  }
  return result;
}
function declareTerminalOutputs(ctx, terminalNodes, conditionalStepIds) {
  terminalNodes.forEach((node) => {
    const tool = getToolConfigSync(node.data.label);
    const outputs = tool?.outputs || { output: { type: "File", label: "Output" } };
    const stepId = ctx.getStepId(node.id);
    const isSingleTerminal = terminalNodes.length === 1;
    const scatterConfig = computeStepScatter(ctx, node.id);
    const isScattered = scatterConfig !== null;
    Object.entries(outputs).forEach(([outputName, outputDef]) => {
      const wfOutputName = isSingleTerminal ? outputName : `${stepId}_${outputName}`;
      const outputType = isScattered ? toArrayType(outputDef.type) : toCWLType(outputDef.type);
      const outputEntry = {
        type: outputType,
        outputSource: `${stepId}/${outputName}`
      };
      if (conditionalStepIds.has(node.id)) {
        const alreadyNullable = Array.isArray(outputType) && outputType[0] === "null";
        if (!alreadyNullable) outputEntry.type = ["null", outputType];
        outputEntry.pickValue = "first_non_null";
      }
      ctx.wf.outputs[wfOutputName] = outputEntry;
    });
  });
}
function buildCWLWorkflowObject(graph) {
  graph = expandCustomWorkflowNodes(graph);
  const bidsNodes = graph.nodes.filter((n) => n.data?.isBIDS && n.data?.bidsSelections);
  const bidsNodeIds = new Set(bidsNodes.map((n) => n.id));
  const bidsEdges = graph.edges.filter((e) => bidsNodeIds.has(e.source));
  const dummyNodeIds = new Set(
    graph.nodes.filter((n) => n.data?.isDummy).map((n) => n.id)
  );
  const nodes = graph.nodes.filter((n) => !n.data?.isDummy);
  const edges = graph.edges.filter(
    (e) => !dummyNodeIds.has(e.source) && !dummyNodeIds.has(e.target)
  );
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const nodeById = (id) => nodeMap.get(id);
  const inEdgeMap = /* @__PURE__ */ new Map();
  const outEdgeMap = /* @__PURE__ */ new Map();
  for (const node of nodes) {
    inEdgeMap.set(node.id, []);
    outEdgeMap.set(node.id, []);
  }
  for (const edge of edges) {
    inEdgeMap.get(edge.target)?.push(edge);
    outEdgeMap.get(edge.source)?.push(edge);
  }
  const inEdgesOf = (id) => inEdgeMap.get(id) || [];
  const outEdgesOf = (id) => outEdgeMap.get(id) || [];
  const order = topoSort(nodes, edges);
  const toolCounts = {};
  const nodeIdToStepId = {};
  order.forEach((nodeId) => {
    const node = nodeById(nodeId);
    const tool = getToolConfigSync(node.data.label);
    const toolId = tool?.id || node.data.label.toLowerCase().replace(/[^a-z0-9]/g, "_");
    if (!(toolId in toolCounts)) {
      toolCounts[toolId] = 0;
    }
    toolCounts[toolId]++;
    nodeIdToStepId[nodeId] = { toolId, count: toolCounts[toolId] };
  });
  const getStepId = (nodeId) => {
    const { toolId, count } = nodeIdToStepId[nodeId];
    const totalCount = toolCounts[toolId];
    return totalCount > 1 ? `${toolId}_${count}` : toolId;
  };
  const resolveWiredSource = (ws) => {
    if (ws.isBIDSInput) return ws.sourceOutput;
    return `${getStepId(ws.sourceNodeId)}/${ws.sourceOutput}`;
  };
  const scatterNodes = [...nodes, ...bidsNodes];
  const scatterEdges = [...edges, ...bidsEdges];
  const arrayTypedInputs = /* @__PURE__ */ new Map();
  for (const node of nodes) {
    const tool = getToolConfigSync(node.data.label);
    if (!tool) continue;
    const arrayInputs = /* @__PURE__ */ new Set();
    const allInputs = { ...tool.requiredInputs, ...tool.optionalInputs };
    for (const [name, def] of Object.entries(allInputs)) {
      if (def.type && def.type.endsWith("[]")) {
        arrayInputs.add(name);
      }
    }
    if (arrayInputs.size > 0) arrayTypedInputs.set(node.id, arrayInputs);
  }
  const { scatteredNodeIds: scatteredSteps, sourceNodeIds } = computeScatteredNodes(scatterNodes, scatterEdges, arrayTypedInputs);
  const wf = {
    cwlVersion: "v1.2",
    class: "Workflow",
    inputs: {},
    outputs: {},
    steps: {}
  };
  const consumedBidsSelections = /* @__PURE__ */ new Set();
  for (const edge of bidsEdges) {
    if (dummyNodeIds.has(edge.target)) continue;
    for (const m of edge.data?.mappings || []) {
      consumedBidsSelections.add(m.sourceOutput);
    }
  }
  for (const selKey of consumedBidsSelections) {
    wf.inputs[selKey] = { type: { type: "array", items: "File" } };
  }
  const conditionalStepIds = /* @__PURE__ */ new Set();
  const jobDefaults = {};
  const cwlDefaultKeys = /* @__PURE__ */ new Set();
  const wiredInputsMap = /* @__PURE__ */ new Map();
  for (const edge of edges) {
    const mappings = edge.data?.mappings || [];
    for (const m of mappings) {
      if (!wiredInputsMap.has(edge.target)) wiredInputsMap.set(edge.target, /* @__PURE__ */ new Map());
      const nodeInputs = wiredInputsMap.get(edge.target);
      const sourceInfo = { sourceNodeId: edge.source, sourceOutput: m.sourceOutput };
      if (nodeInputs.has(m.targetInput)) {
        nodeInputs.get(m.targetInput).push(sourceInfo);
      } else {
        nodeInputs.set(m.targetInput, [sourceInfo]);
      }
    }
  }
  for (const edge of bidsEdges) {
    const mappings = edge.data?.mappings || [];
    for (const m of mappings) {
      if (!wiredInputsMap.has(edge.target)) wiredInputsMap.set(edge.target, /* @__PURE__ */ new Map());
      const nodeInputs = wiredInputsMap.get(edge.target);
      const sourceInfo = {
        sourceNodeId: null,
        sourceOutput: m.sourceOutput,
        // This is the BIDS selection key (workflow input name)
        isBIDSInput: true
      };
      if (nodeInputs.has(m.targetInput)) {
        nodeInputs.get(m.targetInput).push(sourceInfo);
      } else {
        nodeInputs.set(m.targetInput, [sourceInfo]);
      }
    }
  }
  const ctx = {
    wf,
    jobDefaults,
    cwlDefaultKeys,
    wiredInputsMap,
    scatteredSteps,
    sourceNodeIds,
    nodeMap,
    bidsEdges,
    resolveWiredSource,
    getStepId,
    arrayTypedInputs,
    effectiveScatterMap: /* @__PURE__ */ new Map(),
    // populated below
    needsMultipleInputFeature: false,
    needsInlineJavascript: false,
    needsStepInputExpression: false
  };
  for (const nodeId of order) {
    const node = nodeById(nodeId);
    const tool = getToolConfigSync(node.data.label);
    const effectiveTool = tool || {
      id: node.data.label.toLowerCase().replace(/[^a-z0-9]/g, "_"),
      requiredInputs: { input: { type: "File", label: "Input" } },
      optionalInputs: {},
      outputs: { output: { type: "File", label: "Output" } }
    };
    const incoming = inEdgesOf(nodeId);
    ctx.effectiveScatterMap.set(nodeId, getEffectiveScatterInputs(ctx, nodeId, effectiveTool, incoming));
  }
  order.forEach((nodeId) => {
    const node = nodeById(nodeId);
    const { label } = node.data;
    const tool = getToolConfigSync(label);
    const genericTool = {
      id: label.toLowerCase().replace(/[^a-z0-9]/g, "_"),
      cwlPath: `cwl/generic/${label.toLowerCase().replace(/[^a-z0-9]/g, "_")}.cwl`,
      requiredInputs: {
        input: { type: "File", label: "Input" }
      },
      optionalInputs: {},
      outputs: { output: { type: "File", label: "Output" } }
    };
    const effectiveTool = tool || genericTool;
    const stepId = getStepId(nodeId);
    const isSingleNode = nodes.length === 1;
    const step = {
      run: `../${effectiveTool.cwlPath}`,
      in: {},
      out: Object.keys(effectiveTool.outputs)
    };
    buildStepInputBindings(ctx, step, node, effectiveTool, stepId, isSingleNode);
    const dockerVersion = node.data.dockerVersion || "latest";
    const dockerImage = effectiveTool.dockerImage;
    if (dockerImage) {
      step.hints = {
        DockerRequirement: {
          dockerPull: `${dockerImage}:${dockerVersion}`
        }
      };
    }
    const scatterConfig = computeStepScatter(ctx, nodeId);
    const finalStep = { run: step.run };
    if (scatterConfig) {
      finalStep.scatter = scatterConfig.scatter;
      if (scatterConfig.scatterMethod) finalStep.scatterMethod = scatterConfig.scatterMethod;
    }
    finalStep.in = step.in;
    finalStep.out = step.out;
    if (step.hints) finalStep.hints = step.hints;
    if (node.data.whenExpression && node.data.whenExpression.trim()) {
      finalStep.when = node.data.whenExpression.trim();
      conditionalStepIds.add(nodeId);
      ctx.needsInlineJavascript = true;
    }
    wf.steps[stepId] = finalStep;
  });
  const requirements = {};
  if (ctx.needsInlineJavascript) requirements.InlineJavascriptRequirement = {};
  const hasAnyScatter = [...ctx.effectiveScatterMap.values()].some((s) => s.size > 0);
  if (hasAnyScatter) requirements.ScatterFeatureRequirement = {};
  if (ctx.needsMultipleInputFeature) requirements.MultipleInputFeatureRequirement = {};
  if (ctx.needsStepInputExpression) requirements.StepInputExpressionRequirement = {};
  if (Object.keys(requirements).length > 0) wf.requirements = requirements;
  const terminalNodes = nodes.filter((n) => outEdgesOf(n.id).length === 0);
  declareTerminalOutputs(ctx, terminalNodes, conditionalStepIds);
  return { wf, jobDefaults, cwlDefaultKeys };
}
function buildJobTemplate(wf, jobDefaults = {}, cwlDefaultKeys = /* @__PURE__ */ new Set()) {
  const placeholderForType = (cwlType) => {
    if (cwlType == null) return null;
    if (Array.isArray(cwlType)) {
      const nonNull = cwlType.find((t) => t !== "null");
      return nonNull ? placeholderForType(nonNull) : null;
    }
    if (typeof cwlType === "object" && cwlType.type === "array") {
      return [placeholderForType(cwlType.items)];
    }
    if (typeof cwlType === "object" && cwlType.type === "enum") {
      return cwlType.symbols?.[0] || null;
    }
    switch (cwlType) {
      case "File":
        return { class: "File", path: "a/file/path" };
      case "Directory":
        return { class: "Directory", path: "a/directory/path" };
      case "string":
        return "a_string";
      case "int":
      case "long":
        return 0;
      case "float":
      case "double":
        return 0.1;
      case "boolean":
        return false;
      default:
        return null;
    }
  };
  const template = {};
  const defaultKeys = new Set(cwlDefaultKeys);
  for (const [name, def] of Object.entries(wf.inputs)) {
    if (jobDefaults[name] !== void 0) {
      template[name] = jobDefaults[name];
    } else if (def.default !== void 0) {
      template[name] = def.default;
      defaultKeys.add(name);
    } else {
      template[name] = placeholderForType(def.type);
    }
  }
  let yaml = js_yaml_default.dump(template, { noRefs: true });
  for (const key of defaultKeys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`^(${escaped}:.*)$`, "m");
    yaml = yaml.replace(re, `$1  # tool default`);
  }
  return yaml;
}

// utils/workflow_tests/generate_workflows.mjs
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var ROOT_DIR = path.resolve(__dirname, "../..");
var PUBLIC_CWL_DIR = path.join(ROOT_DIR, "public", "cwl");
var FIXTURES_DIR = path.join(__dirname, "fixtures");
var GENERATED_DIR = path.join(__dirname, "generated");
function loadToolCWL(cwlPath) {
  const fullPath = path.join(ROOT_DIR, "public", cwlPath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`  WARN: CWL file not found: ${fullPath}`);
    return null;
  }
  const text = fs.readFileSync(fullPath, "utf8");
  const doc = js_yaml_default.load(text);
  const parsed = parseCWLDocument(doc, cwlPath);
  _injectParsedForTest(cwlPath, parsed);
  return parsed;
}
function loadToolsForFixtures(fixtures) {
  const toolLabels = /* @__PURE__ */ new Set();
  for (const fixture of fixtures) {
    for (const node of fixture.nodes) {
      toolLabels.add(node.data.label);
    }
  }
  console.log(`  Tools needed: ${[...toolLabels].join(", ")}`);
  for (const label of toolLabels) {
    const annotation = TOOL_ANNOTATIONS[label];
    if (!annotation?.cwlPath) {
      console.warn(`  WARN: No annotation/cwlPath for tool "${label}"`);
      continue;
    }
    const result = loadToolCWL(annotation.cwlPath);
    if (result) {
      console.log(`  Loaded: ${annotation.cwlPath}`);
    }
  }
  invalidateMergeCache();
}
function rewriteRunPaths(wfObj) {
  if (!wfObj.steps) return;
  for (const step of Object.values(wfObj.steps)) {
    if (step.run && typeof step.run === "string") {
      const cwlRelPath = step.run.replace(/^\.\.\//, "");
      const absPath = path.join(PUBLIC_CWL_DIR, "..", cwlRelPath).replace(/\\/g, "/");
      step.run = absPath;
    }
  }
}
async function main() {
  console.log("=== Generating CWL Workflows from Fixtures ===");
  console.log(`  Fixtures: ${FIXTURES_DIR}`);
  console.log(`  Output:   ${GENERATED_DIR}`);
  console.log("");
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  const fixtureFiles = fs.readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".json")).sort();
  if (fixtureFiles.length === 0) {
    console.error("ERROR: No fixture files found");
    process.exit(1);
  }
  const fixtures = fixtureFiles.map((f) => {
    const text = fs.readFileSync(path.join(FIXTURES_DIR, f), "utf8");
    return JSON.parse(text);
  });
  console.log(`  Found ${fixtures.length} fixtures: ${fixtureFiles.join(", ")}`);
  console.log("");
  console.log("\u2500\u2500 Loading tool CWL files \u2500\u2500");
  loadToolsForFixtures(fixtures);
  console.log("");
  let passed = 0;
  let failed = 0;
  for (const fixture of fixtures) {
    const name = fixture.name;
    console.log(`\u2500\u2500 Generating: ${name} \u2500\u2500`);
    console.log(`  Description: ${fixture.description}`);
    console.log(`  Nodes: ${fixture.nodes.length}, Edges: ${fixture.edges.length}`);
    try {
      const graph = { nodes: fixture.nodes, edges: fixture.edges };
      const { wf, jobDefaults, cwlDefaultKeys } = buildCWLWorkflowObject(graph);
      rewriteRunPaths(wf);
      const cwlYaml = "#!/usr/bin/env cwl-runner\n\n" + js_yaml_default.dump(wf, {
        noRefs: true,
        lineWidth: -1,
        quotingType: '"',
        forceQuotes: false
      });
      const cwlPath = path.join(GENERATED_DIR, `${name}.cwl`);
      fs.writeFileSync(cwlPath, cwlYaml, "utf8");
      console.log(`  Written: ${cwlPath}`);
      const jobYaml = buildJobTemplate(wf, jobDefaults, cwlDefaultKeys);
      const jobPath = path.join(GENERATED_DIR, `${name}_job.yml`);
      fs.writeFileSync(jobPath, jobYaml, "utf8");
      console.log(`  Job template: ${jobPath}`);
      const stepCount = Object.keys(wf.steps).length;
      const inputCount = Object.keys(wf.inputs).length;
      const outputCount = Object.keys(wf.outputs).length;
      console.log(`  Steps: ${stepCount}, Inputs: ${inputCount}, Outputs: ${outputCount}`);
      if (stepCount === 0) {
        console.log(`  ERROR: No steps generated`);
        failed++;
      } else {
        console.log(`  OK`);
        passed++;
      }
    } catch (err) {
      console.log(`  ERROR: ${err.message}`);
      failed++;
    }
    console.log("");
  }
  console.log(`\u2500\u2500 Generation Summary \u2500\u2500`);
  console.log(`  Generated: ${passed}, Failed: ${failed}`);
  if (failed > 0) {
    process.exit(1);
  }
}
main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
/*! Bundled license information:

js-yaml/dist/js-yaml.mjs:
  (*! js-yaml 4.1.0 https://github.com/nodeca/js-yaml @license MIT *)
*/
